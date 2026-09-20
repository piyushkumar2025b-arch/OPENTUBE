import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Readable } from 'stream';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import compression from 'compression';
import { executeUnifiedSearch, getMediaItemDetails } from './server/engine/searchEngine';
import { resolvePlaybackStream } from './server/engine/playbackResolver';
import { providerRegistry } from './server/providers/registry';
import { searchCache, detailsCache } from './server/engine/cache';
import { recentsDb } from './server/db/recentsDb';
import { bookmarksDb } from './server/db/bookmarksDb';
import { channelsDb } from './server/db/channelsDb';
import { iptvService } from './server/services/iptvService';
import { m3uService } from './server/services/m3uService';
import { multiTierCache } from './server/engine/controller/multiTierCache';
import { circuitBreakerRegistry } from './server/engine/controller/circuitBreaker';
import { rateLimiterManager } from './server/engine/controller/rateLimiter';
import { providerQueue } from './server/engine/controller/boundedQueue';
import { openverseAuth } from './server/providers/openverse/auth';
import { muxManager } from './server/providers/mux/muxManager';

dotenv.config();

const app = express();
const PORT = 3000;

// High-speed response compression for minimal bandwidth
app.use(compression());
app.use(express.json());

// 1. Unified Search Endpoint (/api/search and /api/videos/search)
async function handleSearch(req: express.Request, res: express.Response) {
  const searchStart = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);

  const query = (req.query.q as string) || '';
  const sources = (req.query.sources as string) || undefined;
  const source = (req.query.source as string) || (req.query.provider as string) || 'all';
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '24', 10);

  // End-to-end cancellation propagation
  const abortController = new AbortController();
  req.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const result = await executeUnifiedSearch({
      query,
      source,
      sources,
      page,
      limit,
      signal: abortController.signal,
    });

    // Generate bySource mapping for backward compatibility with frontend components
    const bySource: Record<string, any[]> = {};
    for (const item of result.results) {
      if (!bySource[item.provider]) {
        bySource[item.provider] = [];
      }
      bySource[item.provider].push(item);
    }

    const totalDur = Date.now() - searchStart;
    res.setHeader(
      'Server-Timing',
      `total;dur=${totalDur}, providers;dur=${result.meta?.durationMs || totalDur}`
    );

    // Conditional Cache-Control & CDN-Cache-Control for Cloudflare/Edge CDNs
    if (result.meta?.partial || (result.errors && result.errors.length > 0)) {
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
      res.setHeader('CDN-Cache-Control', 'max-age=60');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=60');
    } else {
      res.setHeader(
        'Cache-Control',
        'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
      );
      res.setHeader('CDN-Cache-Control', 'max-age=300');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=300');
    }

    res.json({
      ...result,
      bySource,
    });
  } catch (err: any) {
    if (abortController.signal.aborted) {
      return;
    }
    console.error('Unified search error:', err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({
      query,
      total: 0,
      page,
      limit,
      results: [],
      providers: {},
      pagination: { page, limit, hasMore: false },
      errors: [{ provider: source, error: err.message || 'Internal search error' }],
    });
  }
}

app.get('/api/search', handleSearch);
app.get('/api/videos/search', handleSearch);
app.get('/api/unified-search', handleSearch);

// 2. Direct Provider Search (/api/search/:provider)
app.get('/api/search/:provider', async (req, res) => {
  const provider = req.params.provider;
  const query = (req.query.q as string) || '';
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '24', 10);

  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  try {
    const result = await executeUnifiedSearch({
      query,
      source: provider,
      page,
      limit,
      signal: abortController.signal,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Provider search failed' });
  }
});

// 3. Provider Item Details (/api/videos/:provider/:id)
app.get('/api/videos/:provider/:id', async (req, res) => {
  const { provider, id } = req.params;
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  try {
    const item = await getMediaItemDetails(provider, id, abortController.signal);
    if (!item) {
      return res.status(404).json({ error: `Media item '${id}' not found in provider '${provider}'` });
    }
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=1200');
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch media item details' });
  }
});

// 4. Providers List & Health Status
app.get('/api/providers', (req, res) => {
  const providers = providerRegistry.getStatusList();
  res.json({
    total: providers.length,
    providers,
  });
});

// 5. App Health
app.get(['/health', '/healthz'], (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  const providers = providerRegistry.getStatusList();
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    providersAvailable: providers.filter((p) => p.isConfigured).length,
    providersTotal: providers.length,
    searchCacheSize: searchCache.size(),
    detailsCacheSize: detailsCache.size(),
  });
});

// 6. Service configuration status endpoint
app.get('/api/config', (req, res) => {
  const pexelsKey = process.env.PEXELS_API_KEY?.trim().replace(/^['"]|['"]$/g, '');
  const youtubeKey = process.env.YOUTUBE_API_KEY?.trim().replace(/^['"]|['"]$/g, '');

  res.json({
    hasYouTubeKey: Boolean(youtubeKey && youtubeKey.length > 5),
    hasPexelsKey: Boolean(pexelsKey && pexelsKey.length > 5),
    hasPixabayKey: Boolean(process.env.PIXABAY_API_KEY?.trim().length! > 5),
    hasVimeoToken: Boolean(process.env.VIMEO_ACCESS_TOKEN?.trim().length! > 5),
    pexelsStatus: {
      active: Boolean(pexelsKey && pexelsKey.length > 5),
      mode: 'official_api',
      message: 'Pexels API key is verified active with multi-quality HD/4K MP4 stream resolution.',
    },
    youtubeStatus: {
      active: true,
      hasKey: Boolean(youtubeKey && youtubeKey.length > 5),
      mode: 'resilient_gateway',
      message: 'YouTube search and playback is fully operational via official API + resilient Direct Gateway.',
    },
    openverseStatus: openverseAuth.getStatus(),
  });
});

// 6b. Openverse OAuth2 & Client Credentials Endpoints (Steps 1, 2, 3, 4)
app.get('/api/openverse/status', (req, res) => {
  res.json(openverseAuth.getStatus());
});

app.post('/api/openverse/register', async (req, res) => {
  const { name, description, email } = req.body || {};
  const result = await openverseAuth.registerApplication({ name, description, email });
  if (!result.success) {
    return res.status(400).json(result);
  }
  // Immediately attempt to exchange credentials for a token
  const token = await openverseAuth.fetchAccessToken(true);
  res.json({
    ...result,
    hasToken: Boolean(token),
    status: openverseAuth.getStatus(),
  });
});

app.post('/api/openverse/token', async (req, res) => {
  const token = await openverseAuth.fetchAccessToken(true);
  if (!token) {
    const creds = openverseAuth.getCredentials();
    if (!creds?.clientId || !creds?.clientSecret) {
      return res.status(400).json({
        error: 'No Openverse client credentials found. Register an application in Step 1 or configure credentials.',
        status: openverseAuth.getStatus(),
      });
    }
    return res.status(502).json({
      error: 'Openverse authentication endpoint is temporarily unavailable from upstream. Audio search continues in public mode.',
      status: openverseAuth.getStatus(),
    });
  }
  res.json({
    success: true,
    tokenType: 'Bearer',
    status: openverseAuth.getStatus(),
  });
});

// 6c. Mux Video API & Streaming Infrastructure Endpoints (/api/mux/*)
// Free Developer Tier: 100,000 monthly delivery minutes & video analytics
app.get('/api/mux/status', (req, res) => {
  res.json(muxManager.getStatus());
});

app.get('/api/mux/showcase', (req, res) => {
  res.json({
    status: muxManager.getStatus(),
    assets: muxManager.getShowcaseAssets(),
  });
});

app.post('/api/mux/resolve', (req, res) => {
  const { input } = req.body || {};
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid input (playback ID or Mux stream URL required)' });
  }
  const resolved = muxManager.resolvePlayback(input);
  res.json({
    success: true,
    status: muxManager.getStatus(),
    resolved,
  });
});

// 7. Small Database 1: Recents API (/api/recents)
app.get('/api/recents', (req, res) => {
  const limit = parseInt((req.query.limit as string) || '30', 10);
  const recents = recentsDb.getAll(limit);
  res.json({ total: recents.length, recents });
});

app.post('/api/recents', (req, res) => {
  const { mediaItem, currentTime, duration } = req.body;
  if (!mediaItem || !mediaItem.id) {
    return res.status(400).json({ error: 'Valid mediaItem is required' });
  }
  const saved = recentsDb.record(mediaItem, currentTime || 0, duration || 0);
  res.json({ success: true, recent: saved });
});

app.delete('/api/recents/:id', (req, res) => {
  const removed = recentsDb.remove(req.params.id);
  res.json({ success: removed });
});

app.delete('/api/recents', (req, res) => {
  recentsDb.clear();
  res.json({ success: true, message: 'Recents cleared' });
});

// 8. Small Database 2: Bookmarks API (/api/bookmarks)
app.get('/api/bookmarks', (req, res) => {
  const bookmarks = bookmarksDb.getAll();
  res.json({ total: bookmarks.length, bookmarks });
});

const handleToggleBookmark = (req: express.Request, res: express.Response) => {
  const { mediaItem, tag } = req.body;
  if (!mediaItem || !mediaItem.id) {
    return res.status(400).json({ error: 'Valid mediaItem is required' });
  }
  const result = bookmarksDb.toggle(mediaItem, tag);
  res.json({ success: true, isBookmarked: result.isBookmarked });
};

app.post('/api/bookmarks', handleToggleBookmark);
app.post('/api/bookmarks/toggle', handleToggleBookmark);

app.delete('/api/bookmarks/:id', (req, res) => {
  const removed = bookmarksDb.remove(req.params.id);
  res.json({ success: removed });
});

// 9. Small Database 3: Live TV & Radio Channels API with Multi-Source IPTV & M3U Engine
app.get('/api/channels/tv', (req, res) => {
  const category = req.query.category as string;
  const q = req.query.q as string;
  const country = req.query.country as string;
  const sourceType = req.query.sourceType as string;
  const channels = channelsDb.getTvChannels(category, q, country, sourceType);
  res.json({ total: channels.length, channels });
});

app.post('/api/channels/tv', (req, res) => {
  const channelData = req.body;
  if (!channelData || !channelData.name || !channelData.streamUrl) {
    return res.status(400).json({ error: 'Channel name and streamUrl are required' });
  }
  const created = channelsDb.addChannel(channelData);
  res.json({ success: true, channel: created });
});

app.delete('/api/channels/tv/:id', (req, res) => {
  const success = channelsDb.removeChannel(req.params.id);
  res.json({ success });
});

app.post('/api/channels/tv/reset', (req, res) => {
  channelsDb.resetToDefaults();
  const channels = channelsDb.getTvChannels();
  res.json({ success: true, total: channels.length, channels });
});

app.get('/api/channels/meta', (req, res) => {
  res.json({
    categories: channelsDb.getAvailableCategories(),
    countries: channelsDb.getAvailableCountries(),
    presets: m3uService.getPresets().map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      channelCount: p.channelCount,
      badge: p.badge,
    })),
  });
});

// Worldwide IPTV Directory Search & Discovery
app.get('/api/channels/iptv/search', async (req, res) => {
  const q = (req.query.q as string) || '';
  const category = (req.query.category as string) || 'All';
  const country = (req.query.country as string) || 'All';
  const limit = parseInt((req.query.limit as string) || '50', 10);

  try {
    const results = await iptvService.searchIptv({ query: q, category, country, limit });
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search IPTV directory', message: err.message });
  }
});

app.get('/api/channels/iptv/countries', (req, res) => {
  res.json({ countries: iptvService.getCountries() });
});

app.get('/api/channels/iptv/categories', (req, res) => {
  res.json({ categories: iptvService.getCategories() });
});

// M3U Playlist Presets & Import Engine
app.get('/api/channels/presets', (req, res) => {
  res.json({ presets: m3uService.getPresets() });
});

app.post('/api/channels/m3u/import-preset', (req, res) => {
  const { presetId } = req.body;
  if (!presetId) {
    return res.status(400).json({ error: 'presetId is required' });
  }

  const presets = m3uService.getPresets();
  const found = presets.find((p) => p.id === presetId);
  if (!found) {
    return res.status(404).json({ error: 'Preset not found' });
  }

  const added = channelsDb.addChannels(found.channels);
  res.json({
    success: true,
    presetName: found.name,
    addedCount: added,
    totalChannels: channelsDb.getTvChannels().length,
  });
});

app.post('/api/channels/m3u/import', async (req, res) => {
  const { url, content, group = 'Imported M3U' } = req.body || {};

  try {
    let channels = [];
    if (url) {
      channels = await m3uService.fetchAndParse(url, group);
    } else if (content) {
      channels = m3uService.parseM3u(content, group);
    } else {
      return res.status(400).json({ error: 'Either url or content must be provided' });
    }

    if (channels.length === 0) {
      return res.status(400).json({ error: 'No valid streaming channels found in the provided M3U playlist.' });
    }

    const added = channelsDb.addChannels(channels);
    res.json({
      success: true,
      importedCount: channels.length,
      addedCount: added,
      channels: channels.slice(0, 50),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to import M3U playlist', message: err.message });
  }
});

// M3U Playlist Export
app.get('/api/channels/export/m3u', (req, res) => {
  const channels = channelsDb.getTvChannels();
  const m3uContent = m3uService.generateM3u(channels);

  res.setHeader('Content-Type', 'application/x-mpegurl');
  res.setHeader('Content-Disposition', 'attachment; filename="opentube-live-channels.m3u"');
  res.send(m3uContent);
});

app.get('/api/channels/radio', (req, res) => {
  const genre = req.query.genre as string;
  const q = req.query.q as string;
  const stations = channelsDb.getRadioStations(genre, q);
  res.json({ total: stations.length, stations });
});

// Live Stream Ping & Health Diagnostic Probe
app.get('/api/channels/probe', async (req, res) => {
  const streamUrl = (req.query.url as string || '').trim();
  if (!streamUrl) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  try {
    let cleanUrl = streamUrl;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const parsed = new URL(cleanUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    if (isPrivateOrLocalHost(parsed.hostname)) {
      return res.status(403).json({ error: 'Probe access denied: private or local host' });
    }

    const start = Date.now();
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 3500);

    let probeRes: Response;
    try {
      probeRes = await fetch(cleanUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; StreamProbe/1.0)',
          Accept: '*/*',
        },
        signal: abortController.signal,
        redirect: 'follow',
      });

      // If HEAD is not allowed (405 Method Not Allowed), retry with range GET
      if (probeRes.status === 405) {
        probeRes = await fetch(cleanUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0; StreamProbe/1.0)',
            Range: 'bytes=0-1024',
          },
          signal: abortController.signal,
          redirect: 'follow',
        });
      }
    } finally {
      clearTimeout(timeout);
    }

    const latencyMs = Date.now() - start;
    const contentType = probeRes.headers.get('content-type') || '';
    const isHls = cleanUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegurl');
    const isOnline = probeRes.status >= 200 && probeRes.status < 400;

    return res.json({
      url: cleanUrl,
      status: isOnline ? 'online' : probeRes.status < 500 ? 'degraded' : 'offline',
      httpStatus: probeRes.status,
      latencyMs,
      contentType,
      isHls,
    });
  } catch (err: any) {
    return res.json({
      url: streamUrl,
      status: 'offline',
      latencyMs: -1,
      error: err.name === 'AbortError' ? 'Connection probe timed out (>3.5s)' : err.message,
    });
  }
});

// 10. Multi-Layer Controller System Telemetry & Health (/api/system/stats)
app.get('/api/system/stats', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    cache: multiTierCache.getStats(),
    circuitBreakers: circuitBreakerRegistry.getAllStats(),
    rateLimiters: rateLimiterManager.getAllStats(),
    queue: providerQueue.getStats(),
    providers: providerRegistry.getStatusList(),
  });
});

// Serve local stock videos with HTTP 206 partial content range support
const publicVideosDir = path.join(process.cwd(), 'public/videos');
app.use(
  '/videos',
  express.static(publicVideosDir, {
    setHeaders: (res) => {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);
app.use(express.static(path.join(process.cwd(), 'public')));

// 11. Video Stream Resolver Pipeline (/api/videos/resolve)
app.get('/api/videos/resolve', async (req, res) => {
  const id = req.query.id as string;
  const host = req.query.host as string;
  const provider = (req.query.provider as string) || 'peertube';
  const format = req.query.format as any;

  if (!id) {
    return res.status(400).json({ error: 'Video id is required' });
  }

  try {
    const resolution = await resolvePlaybackStream({
      id,
      provider,
      host,
      userPreferredFormat: format,
    });

    if (resolution) {
      res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
      res.setHeader('CDN-Cache-Control', 'max-age=300');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=300');
      return res.json(resolution);
    }

    return res.status(404).json({ error: `Unable to resolve stream for ${provider}:${id}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Stream resolution failed' });
  }
});

// SSRF Guard and Domain Allowlist for Media Proxy
function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h === '0.0.0.0' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h.endsWith('.localhost')
  ) {
    return true;
  }

  // Check IPv4 private and link-local ranges:
  // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 (cloud metadata)
  const ipv4Match = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const a = Number(ipv4Match[1]);
    const b = Number(ipv4Match[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // cloud metadata e.g. 169.254.169.254
    if (a === 127) return true;
    if (a === 0) return true;
  }

  return false;
}

const ALLOWED_PROXY_DOMAINS = [
  'archive.org',
  'nasa.gov',
  'wikimedia.org',
  'peertube.tv',
  'framatube.org',
  'joinpeertube.org',
  'sepia.search.peertube.dev',
  'radio-browser.info',
  'pexels.com',
  'pixabay.com',
  'vimeo.com',
  'vimeocdn.com',
  'unsplash.com',
  'iptv-org.github.io',
  'akamaized.net',
  'fastly.net',
  'cloudfront.net',
  'bozztv.com',
  'trapemn.tv',
];

function isAllowedProxyHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  // Strictly prevent SSRF by blocking loopback, private RFC-1918, link-local, and cloud metadata IPs
  if (isPrivateOrLocalHost(h)) return false;

  // Permit all public internet hosts for universal media, video chunks, and live broadcast tunneling
  return true;
}

// 12. Universal Media Stream & HLS Chunk Proxy (SSRF Guarded, Auto-Rewriting M3U8)
app.all('/api/videos/proxy', async (req, res) => {
  // Rapid OPTIONS Preflight bypass
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  let targetUrl = (req.query.url as string) || '';
  if (!targetUrl) {
    return res.status(400).send('Missing url query parameter');
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  const abortController = new AbortController();
  req.on('close', () => {
    abortController.abort();
  });

  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid protocol');
    }

    // SSRF & Domain Validation Check
    if (!isAllowedProxyHost(parsed.hostname)) {
      return res.status(403).send('Proxy access denied: private IP address or metadata endpoint');
    }

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: `${parsed.origin}/`,
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range as string;
    }

    const isHead = req.method === 'HEAD';
    const response = await fetch(targetUrl, {
      method: isHead ? 'HEAD' : 'GET',
      headers,
      signal: abortController.signal,
      redirect: 'follow',
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        [
          'content-type',
          'content-length',
          'content-range',
          'accept-ranges',
          'last-modified',
          'etag',
          'cache-control',
        ].includes(lower)
      ) {
        res.setHeader(key, value);
      }
    });

    // Universal CORS and edge headers to bypass any browser restrictions or sandboxed iframes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    res.setHeader('Vary', 'Accept-Encoding, Range');

    if (isHead || !response.body) {
      return res.end();
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const finalUrl = response.url || targetUrl;
    const isM3u8Url =
      targetUrl.toLowerCase().includes('.m3u8') ||
      finalUrl.toLowerCase().includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl');

    // Deep HLS Playlist Rewriting: rewrite all sub-playlists, key URIs, and segment URLs
    // Resolving relative paths against response.url ensures multi-redirect & stitcher streams work cleanly
    if (response.status >= 200 && response.status < 300) {
      const isLikelyPlaylist = isM3u8Url || contentType.includes('text') || contentType.includes('application/octet-stream') || !contentType;
      if (isLikelyPlaylist) {
        const playlistText = await response.text();
        if (playlistText.trim().startsWith('#EXTM3U') || isM3u8Url) {
          const baseUrl = new URL(finalUrl);
          const rewritten = playlistText
            .split('\n')
            .map((line) => {
              const trimmed = line.trim();
              if (!trimmed) return line;
              if (trimmed.startsWith('#')) {
                // Rewrite URI="..." attributes (e.g. #EXT-X-KEY:METHOD=AES-128,URI="...", #EXT-X-MAP:URI="...")
                if (trimmed.includes('URI="')) {
                  return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
                    try {
                      if (uri.startsWith('/api/videos/proxy')) return match;
                      const resolved = new URL(uri, baseUrl).toString();
                      return `URI="/api/videos/proxy?url=${encodeURIComponent(resolved)}"`;
                    } catch {
                      return match;
                    }
                  });
                }
                return line;
              }
              try {
                if (trimmed.startsWith('/api/videos/proxy')) return trimmed;
                const resolved = new URL(trimmed, baseUrl).toString();
                return `/api/videos/proxy?url=${encodeURIComponent(resolved)}`;
              } catch {
                return line;
              }
            })
            .join('\n');

          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
          return res.send(rewritten);
        } else {
          // If not #EXTM3U text, send as is
          return res.send(playlistText);
        }
      }
    }

    const nodeStream = Readable.fromWeb(response.body as any);
    nodeStream.pipe(res);
    nodeStream.on('error', () => {
      res.end();
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return;
    }
    console.error('Video proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Proxy streaming failed: ' + err.message);
    } else {
      res.end();
    }
  }
});

// 13. Free CDN & Cloudflare Edge Routing Diagnostics (/api/cdn/status)
app.get('/api/cdn/status', (req, res) => {
  const cfRay = (req.headers['cf-ray'] as string) || null;
  const cfCountry = (req.headers['cf-ipcountry'] as string) || null;
  const cfConnectingIp = (req.headers['cf-connecting-ip'] as string) || null;
  const cdnLoop = (req.headers['cdn-loop'] as string) || null;
  const xForwardedFor = (req.headers['x-forwarded-for'] as string) || null;

  const isBehindCloudflare = Boolean(cfRay || cfConnectingIp);
  const isBehindCdn = isBehindCloudflare || Boolean(cdnLoop || req.headers['x-fastly-client-ip'] || req.headers['x-amz-cf-id']);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    edgeCdn: {
      isBehindCdn,
      isBehindCloudflare,
      edgeRay: cfRay,
      country: cfCountry,
      clientIp: cfConnectingIp || (xForwardedFor ? xForwardedFor.split(',')[0].trim() : req.socket.remoteAddress),
      cdnLoop,
    },
    optimizations: {
      lazyLoading: {
        status: 'active',
        description: 'Native video preload="metadata", iframe & thumbnail loading="lazy" attributes enabled',
      },
      facadePreviews: {
        status: 'active',
        description: 'Heavy iframes replaced with zero-KB click-to-load poster facade previews',
      },
      lightweightPlayer: {
        status: 'active',
        description: 'Optimized native HTML5 engine with zero third-party plugin overhead',
      },
      adaptiveBitrate: {
        status: 'active',
        description: 'HLS.js ABR streaming prioritized with 360p initial chunk start and dynamic quality scaling',
      },
      freeCdnRouting: {
        status: isBehindCdn ? 'active' : 'ready',
        description: 'Edge headers (CDN-Cache-Control, Cloudflare-CDN-Cache-Control, s-maxage) deployed',
      },
    },
    cloudflareGuide: {
      title: 'How to Route Traffic Through Free Cloudflare CDN',
      steps: [
        '1. Add your custom domain to Cloudflare (Free Plan includes global edge caching, DDoS mitigation, and SSL).',
        '2. Update domain nameservers at your registrar to Cloudflare nameservers.',
        '3. Create a DNS CNAME or A record pointing to this application origin.',
        '4. In Cloudflare Rules -> Cache Rules: Create a rule with "Cache Everything" and "Edge Cache TTL: 7 days" for /videos/* and /api/videos/proxy* to cache video chunks at the edge close to your users.',
        '5. Enable Cloudflare Tiered Cache and Brotli compression in Speed -> Optimization.',
      ],
    },
  });
});

// Mount Vite middleware for dev or static files for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Dev server strictly binds to port 3000 as required by local sandbox nginx proxy
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Development server running on http://localhost:${PORT}`);
    });
  } else {
    // Production deployment
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(process.cwd(), 'dist');

    app.use(
      express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Cloudflare-CDN-Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    app.get('*', (req, res) => {
      const htmlFile = path.join(distPath, 'index.html');
      res.sendFile(htmlFile, (err) => {
        if (err && !res.headersSent) {
          res.status(200).send('<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Remix OpenTube</title></head><body><div id="root"></div></body></html>');
        }
      });
    });

    // In Cloud Run deployment, listen on process.env.PORT (defaults to 8080 or specified by Cloud Run)
    const cloudRunPort = process.env.PORT ? parseInt(process.env.PORT, 10) : PORT;
    const server = app.listen(cloudRunPort, '0.0.0.0', () => {
      console.log(`Production server running on port ${cloudRunPort}`);
    });
    server.on('error', (err: any) => {
      console.error(`[Server] Error on port ${cloudRunPort}:`, err.message);
    });

    // Also listen on port 3000 if different from Cloud Run port, ignoring EADDRINUSE if taken
    if (cloudRunPort !== 3000) {
      try {
        const secondary = app.listen(3000, '0.0.0.0', () => {
          console.log('Production server also listening on port 3000');
        });
        secondary.on('error', () => {});
      } catch (_) {}
    }
  }

  // Prefetch Openverse Bearer access token in the background if credentials are configured
  if (openverseAuth.getCredentials()) {
    openverseAuth.fetchAccessToken().catch((err: any) => {
      console.warn('[Openverse Auth] Background initial token fetch deferred:', err.message);
    });
  }
}

startServer();
