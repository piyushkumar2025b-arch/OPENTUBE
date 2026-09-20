/**
 * Dedicated Server-Side Playback Resolver Pipeline
 * Separates playback resolution completely from search.
 * Resolves streams, evaluates candidates, handles HLS, direct MP4, and embed fallbacks,
 * and ensures the client receives a single authoritative playback decision.
 */

import { providerRegistry } from '../providers/registry';
import { PlaybackCandidate, PlaybackResolution } from '../providers/types';
import { multiTierCache } from './controller/multiTierCache';
import { getMediaItemDetails } from './searchEngine';
import { parsePeerTubeId } from '../providers/peertube/identity';

export interface ResolveOptions {
  id: string;
  provider: string;
  host?: string;
  userPreferredFormat?: 'direct' | 'hls' | 'embed';
}

export async function resolvePlaybackStream(options: ResolveOptions): Promise<PlaybackResolution | null> {
  const { id, provider, host, userPreferredFormat } = options;
  if (!id || !provider) return null;

  const cacheKey = `playback:${provider}:${id}:${host || 'none'}`;
  const cached = multiTierCache.get<PlaybackResolution>(cacheKey);
  if (cached.data) {
    return cached.data;
  }

  const adapter = providerRegistry.get(provider.toLowerCase());
  const cleanId = id.replace(new RegExp(`^(${provider}:|pt-|rb-|yt-|vm-|ia-)`), '');

  // 1. If adapter has dedicated resolvePlayback method, execute it
  if (adapter && adapter.resolvePlayback) {
    try {
      const resolution = await adapter.resolvePlayback(id, { host, cleanId });
      if (resolution) {
        multiTierCache.set(cacheKey, resolution, 120, 300);
        return resolution;
      }
    } catch {
      // Continue to pipeline
    }
  }

  // 2. PeerTube-specific remote instance resolution using canonical identity
  if (provider === 'peertube') {
    const { host: parsedHost, uuid: cleanUuid } = parsePeerTubeId(id);
    const effectiveHost = host ? host.replace(/^https?:\/\//, '') : parsedHost;
    const targetHost = `https://${effectiveHost}`;

    if (effectiveHost) {
      try {
        const instRes = await fetch(`${targetHost}/api/v1/videos/${encodeURIComponent(cleanUuid)}`, {
          headers: { 'User-Agent': 'OpenTube/2.0' },
          signal: AbortSignal.timeout(3500),
        });

        if (instRes.ok) {
          const fullData = await instRes.json();
          const files = Array.isArray(fullData.files) ? fullData.files : [];
          const playlists = Array.isArray(fullData.streamingPlaylists) ? fullData.streamingPlaylists : [];

          const candidates: PlaybackCandidate[] = [];

          // Add HLS streaming playlists
          for (const pl of playlists) {
            if (pl.playlistUrl) {
              const url = pl.playlistUrl.startsWith('http') ? pl.playlistUrl : `${targetHost}${pl.playlistUrl}`;
              candidates.push({
                kind: 'hls',
                url,
                mimeType: 'application/x-mpegURL',
              });
            }
          }

          // Add direct files sorted by resolution
          const sortedFiles = [...files].sort((a: any, b: any) => (b.resolution?.id || 0) - (a.resolution?.id || 0));
          for (const f of sortedFiles) {
            const fileUrl = f.fileUrl || f.fileDownloadUrl;
            if (fileUrl) {
              const url = fileUrl.startsWith('http') ? fileUrl : `${targetHost}${fileUrl}`;
              candidates.push({
                kind: 'direct',
                url,
                mimeType: 'video/mp4',
                quality: f.resolution?.label || `${f.height || ''}p`,
                width: f.width,
                height: f.height,
                bitrate: f.fps,
              });
            }
          }

          // Add embed URL
          const embedUrl = `${targetHost}/videos/embed/${fullData.shortUUID || fullData.uuid || cleanUuid}`;
          candidates.push({
            kind: 'embed',
            url: embedUrl,
          });

          // Select best candidate based on user preference or ABR streaming priority
          let selectedIdx = 0;
          if (userPreferredFormat === 'embed') {
            selectedIdx = candidates.findIndex((c) => c.kind === 'embed');
          } else if (userPreferredFormat === 'direct') {
            selectedIdx = candidates.findIndex((c) => c.kind === 'direct');
          } else {
            // Adaptive Bitrate Streaming (ABR): Prioritize HLS (.m3u8) first for instant startup and adaptive quality
            selectedIdx = candidates.findIndex((c) => c.kind === 'hls');
            if (selectedIdx === -1) {
              selectedIdx = candidates.findIndex((c) => c.kind === 'direct');
            }
          }
          if (selectedIdx === -1) selectedIdx = 0;

          // Prefer HLS candidate for playbackUrl to enable Adaptive Bitrate Streaming
          const bestStreamCand = candidates.find((c) => c.kind === 'hls') || candidates.find((c) => c.kind === 'direct');

          const resolution: PlaybackResolution = {
            id,
            provider: 'peertube',
            candidates,
            selectedCandidateIndex: selectedIdx,
            hasDirectStream: Boolean(bestStreamCand),
            playbackUrl: bestStreamCand?.url || null,
            embedUrl,
            sourceUrl: `${targetHost}/videos/watch/${fullData.uuid || cleanUuid}`,
          };

          // Cache playback resolution with conservative 120s fresh / 300s stale TTL
          multiTierCache.set(cacheKey, resolution, 120, 300);
          return resolution;
        }
      } catch {
        // Fall through to details
      }
    }
  }

  // 3. Fallback to getMediaItemDetails
  const details = await getMediaItemDetails(provider, cleanId);
  if (details) {
    const candidates: PlaybackCandidate[] = [];

    if (details.playbackUrl) {
      const isHls = details.playbackUrl.includes('.m3u8') || details.metadata?.streamType === 'hls';
      candidates.push({
        kind: isHls ? 'hls' : 'direct',
        url: details.playbackUrl,
        mimeType: isHls ? 'application/x-mpegURL' : details.mediaType === 'audio' ? 'audio/mpeg' : 'video/mp4',
      });
    }

    if (details.embedUrl) {
      candidates.push({
        kind: 'embed',
        url: details.embedUrl,
      });
    }

    if (candidates.length > 0) {
      const resolution: PlaybackResolution = {
        id,
        provider,
        candidates,
        selectedCandidateIndex: 0,
        hasDirectStream: Boolean(details.playbackUrl),
        playbackUrl: details.playbackUrl || null,
        embedUrl: details.embedUrl || null,
        sourceUrl: details.sourceUrl,
      };

      multiTierCache.set(cacheKey, resolution, 120, 300);
      return resolution;
    }
  }

  return null;
}
