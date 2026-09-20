import { VideoItem, VideoSourceId, UnifiedSearchResponse, ServerApiConfig } from '../types';

export const SOURCES: { id: VideoSourceId; name: string; description: string; badge: string }[] = [
  {
    id: 'all',
    name: 'All Providers',
    description: 'Unified multi-provider search across Apple Music Videos, Audius, SomaFM, Dailymotion, Open Cinema, YouTube, Pexels, Live TV, Radio, PeerTube, Archive Watch, NASA, Wikimedia, Openverse & Pixabay',
    badge: 'Unified Multi-Provider',
  },
  {
    id: 'dailymotion',
    name: 'Dailymotion',
    description: 'Global video sharing platform with free public API search and responsive zero-cookie embeds',
    badge: 'Free Open REST API',
  },
  {
    id: 'openmovie',
    name: 'Open Cinema Vault',
    description: 'Iconic Creative Commons 4K cinematic films & open animation masterpieces (Blender Foundation)',
    badge: 'Direct 4K Streams',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Global video streaming search via YouTube Data API v3 with resilient gateway fallback',
    badge: 'YouTube API',
  },
  {
    id: 'pexels',
    name: 'Pexels Video',
    description: 'Royalty-free high quality HD and 4K stock video clips for creators',
    badge: 'Pexels',
  },
  {
    id: 'livetv',
    name: 'Live TV Channels',
    description: 'Free-to-air international live television streams (NASA TV, France 24, DW News, Bloomberg, Euronews, Sky News, Red Bull TV)',
    badge: 'Live HLS Broadcast',
  },
  {
    id: 'radio',
    name: 'Live Radio Stations',
    description: 'Worldwide live radio streams powered by Radio Browser (40,000+ stations: Lo-Fi, BBC, Jazz, Classical, Ambient)',
    badge: 'Live Audio Stream',
  },
  {
    id: 'peertube',
    name: 'PeerTube Network',
    description: 'Decentralized open video federation via Sepia Search with direct streaming and zero ads',
    badge: 'PeerTube CC',
  },
  {
    id: 'archive',
    name: 'Internet Archive',
    description: 'Millions of public domain motion pictures, newsreels, restored cinema and documentaries',
    badge: 'Archive.org',
  },
  {
    id: 'nasa',
    name: 'NASA Video Library',
    description: 'Official NASA imagery, planetary missions, Apollo moon footage & deep space research',
    badge: 'NASA Official',
  },
  {
    id: 'wikimedia',
    name: 'Wikimedia Commons',
    description: 'Educational, scientific, and cultural open media videos licensed under Creative Commons',
    badge: 'Wikimedia',
  },
  {
    id: 'openverse',
    name: 'Openverse CC',
    description: 'Massive open library of Creative Commons audio & media curated by the WordPress Foundation',
    badge: 'Openverse',
  },
  {
    id: 'pixabay',
    name: 'Pixabay Video',
    description: 'Community-contributed royalty-free stock footage and creative clips',
    badge: 'Pixabay',
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    description: 'High-definition creative cinema and filmmaker showcase via Vimeo API',
    badge: 'Vimeo API',
  },
  {
    id: 'itunes',
    name: 'Apple Music Videos',
    description: 'Official HD music videos, artist releases, and video podcasts with direct streaming playback',
    badge: 'Apple Free API',
  },
  {
    id: 'audius',
    name: 'Audius Music',
    description: 'Decentralized open streaming catalog with 1M+ independent artist tracks, EDM, Lo-Fi & hip-hop',
    badge: 'Audius Open API',
  },
  {
    id: 'somafm',
    name: 'SomaFM Radio',
    description: 'Iconic commercial-free listener-supported radio channels (Groove Salad, Drone Zone, Secret Agent, DEF CON)',
    badge: 'SomaFM Live Stream',
  },
  {
    id: 'archivewatch',
    name: 'Archive Watch',
    description: 'Indexes 30,000+ public-domain & free-to-share classic feature films, horror, noir & restored cinema',
    badge: '30,000+ Movies',
  },
  {
    id: 'featurefilms',
    name: 'Classic Feature Films',
    description: '25,000+ restored full-length movies (Charlie Chaplin, Buster Keaton, Alfred Hitchcock, Noir & Westerns)',
    badge: 'Public Domain Movies',
  },
  {
    id: 'classiccartoons',
    name: 'Classic Cartoons Vault',
    description: 'Golden-era vintage animation (Fleischer Studios, Betty Boop, Popeye, Superman 1940s, Felix the Cat)',
    badge: 'Classic Animation',
  },
  {
    id: 'tvnews',
    name: 'Global TV News Archive',
    description: '2M+ broadcast television clips, network investigations, and world news journalism archives',
    badge: 'TV News Archive',
  },
  {
    id: 'computerchronicles',
    name: 'Computer Chronicles',
    description: 'Historic computing TV episodes (1983–2002) showcasing early Apple, Silicon Graphics, Amiga & Internet',
    badge: 'Computing History',
  },
  {
    id: 'tedtalks',
    name: 'TED & Open Culture',
    description: 'Inspirational TED Talks, technology lectures, science documentaries, and design ideas under Creative Commons',
    badge: 'TED Talks CC',
  },
  {
    id: 'otradio',
    name: 'Old Time Radio (OTR)',
    description: 'Golden Age vintage radio dramas (1930s-1950s: Sherlock Holmes, The Shadow, War of the Worlds, Dimension X)',
    badge: 'OTR Radio Drama',
  },
  {
    id: 'prelinger',
    name: 'Prelinger Archives',
    description: 'Over 60,000 ephemeral historic films: mid-century Americana, atomic age educational reels, vintage automotive design & retro industry',
    badge: 'Prelinger Vintage',
  },
  {
    id: 'freemusic',
    name: 'Free Music Archive',
    description: 'Royalty-free Creative Commons soundtracks, cinematic scores by Kevin MacLeod, ambient soundscapes & independent artists',
    badge: 'FMA Open Audio',
  },
  {
    id: 'coverr',
    name: 'Coverr Free Stock Video',
    description: 'Royalty-free cinematic 4K & HD stock video clips for creators, aerial drone shots, backgrounds, nature & urban loops',
    badge: '4K Stock Video',
  },
  {
    id: 'scifihorror',
    name: 'Sci-Fi & Horror Vault',
    description: 'Legendary sci-fi, cult horror, monster cinema, and vintage alien epics (Night of the Living Dead, Plan 9, House on Haunted Hill)',
    badge: 'Cult Sci-Fi / Horror',
  },
  {
    id: 'silentfilms',
    name: 'Silent Film Masters',
    description: 'Historic early cinema milestones & silent comedy masterpieces (Charlie Chaplin, Buster Keaton, Georges Méliès, Metropolis, Nosferatu)',
    badge: 'Silent Era Masters',
  },
  {
    id: 'mitocw',
    name: 'MIT OpenCourseWare',
    description: 'World-class MIT university video lectures: Computer Science, Deep Learning, Linear Algebra, Physics, Algorithms & Engineering',
    badge: 'MIT STEM Lectures',
  },
  {
    id: 'animation',
    name: 'Golden Age Animation Vault',
    description: 'Historic vintage cartoons and hand-drawn animation milestones (Fleischer Studios, Popeye, Betty Boop, Superman 1941, Felix the Cat)',
    badge: 'Classic Animation',
  },
  {
    id: 'sportsarchive',
    name: 'Classic Sports & Olympics Vault',
    description: 'Legendary sporting milestones: Golden-age championship boxing (Muhammad Ali, Joe Louis, Frazier), historic Olympics & classic football',
    badge: 'Sports Heritage',
  },
  {
    id: 'naturevids',
    name: 'Wildlife & Nature Vault',
    description: 'Expeditions into the wild: National parks, marine biology, coral reefs, African wildlife safaris, arctic glaciers, and botanical time-lapses',
    badge: 'Wildlife & Nature',
  },
  {
    id: 'loc',
    name: 'Library of Congress',
    description: 'National Audiovisual Conservation Center: earliest motion pictures, newsreels & historic cinema',
    badge: 'LOC Archives',
  },
  {
    id: 'dvids',
    name: 'DVIDS Archive',
    description: 'Defense Visual Information Distribution Service — public domain U.S. government & aerospace video archive',
    badge: 'U.S. Gov Media',
  },
  {
    id: 'nasasvs',
    name: 'NASA SVS',
    description: 'NASA Scientific Visualization Studio — supercomputer climate models, astrophysics & space science',
    badge: 'NASA Science',
  },
  {
    id: 'harvardfilm',
    name: 'Harvard & Academic Film Archive',
    description: 'Harvard Film Archive & University historical motion picture study collections, film preservation prints & cinematic history',
    badge: 'Harvard & Academic',
  },
  {
    id: 'publicfilm',
    name: 'Classic Cinema & Public Movies',
    description: 'Historic feature-length cinema, dramatic epics, mystery films, Westerns and vintage studio motion pictures in public domain',
    badge: 'Classic Feature Films',
  },
  {
    id: 'retrogaming',
    name: 'Classic Gaming & Longplays',
    description: 'Video game heritage, arcade playthroughs, speedruns, developer postmortems, demo scene, and console retrospectives',
    badge: 'Retro Gaming Vault',
  },
  {
    id: 'soundfx',
    name: 'BBC & Open Sound Effects',
    description: 'High-fidelity audio sound effects, Foley recordings, ambient soundscapes, field recordings and sound design for video creators',
    badge: 'BBC & Foley SFX',
  },
  {
    id: 'smithsonian',
    name: 'Smithsonian Science & Natural History',
    description: 'Smithsonian Institution national research archives: air & space milestones, paleoanthropology, astrophysics, zoology & biodiversity',
    badge: 'Smithsonian Open Access',
  },
  {
    id: 'europeana',
    name: 'Europeana Heritage',
    description: 'Europe digital cultural heritage platform preserving early European cinematheques and archives',
    badge: 'EU Heritage',
  },
  {
    id: 'freetouse',
    name: 'Free To Use API',
    description: 'Royalty-free music, soundtracks, and background audio stems for video creators & filmmakers',
    badge: 'Music & Audio',
  },
  {
    id: 'everyfilm',
    name: 'every.film',
    description: 'Open film & television metadata API with community synopses, cast details, ratings & stream links',
    badge: 'Film Metadata',
  },
  {
    id: 'polyhaven',
    name: 'Poly Haven API',
    description: 'Free public API for 100% CC0 3D models, photorealistic HDRIs, and PBR textures for visual artists',
    badge: 'CC0 Visual Assets',
  },
  {
    id: 'laionbvd',
    name: 'LAION-BVD',
    description: 'Large open video dataset for research containing video URLs, temporal annotations & vision embeddings',
    badge: 'AI Research Dataset',
  },
];

export const CATEGORIES = [
  'Trending',
  'Movies & Cinema',
  'Sci-Fi & Cult Horror',
  'Classic Animation',
  'Silent Film Masters',
  'Stock Footage & Drone',
  'Wildlife & Nature',
  'MIT STEM Lectures',
  'TED Talks',
  'Space & NASA',
  'Smithsonian Science',
  'Harvard Film Archive',
  'Classic Gaming & Longplays',
  'Sound Effects & Foley',
  'Sports & Olympics',
  'Live TV',
  'Live Radio',
  'Audio & Music',
  'Library of Congress',
];

export const CHANNELS = [
  {
    id: 'ch-unified',
    name: 'Universal Feed',
    tag: 'Trending',
    source: 'all' as VideoSourceId,
    description: 'Combined multi-source search across Live TV, Radio, PeerTube, Archive & Open Media',
  },
  {
    id: 'ch-satellitetv',
    name: '📡 Real Satellite TV',
    tag: 'Satellite TV',
    source: 'livetv' as VideoSourceId,
    description: 'Direct 24/7 feeds from DD National HD, Aaj Tak HD, DD News, ABC News, TRT World, 9X Jalwa & Colors',
  },
  {
    id: 'ch-retrogaming',
    name: '🕹️ Classic Gaming Vault',
    tag: 'Classic Gaming & Longplays',
    source: 'retrogaming' as VideoSourceId,
    description: 'Video game heritage, arcade playthroughs, speedruns, developer postmortems & console retrospectives',
  },
  {
    id: 'ch-smithsonian',
    name: '🏛️ Smithsonian Science',
    tag: 'Smithsonian Science',
    source: 'smithsonian' as VideoSourceId,
    description: 'Smithsonian Institution national research archives: air & space milestones, paleoanthropology, astrophysics & zoology',
  },
  {
    id: 'ch-harvardfilm',
    name: '🎓 Harvard Film Vault',
    tag: 'Harvard Film Archive',
    source: 'harvardfilm' as VideoSourceId,
    description: 'Harvard Film Archive historical motion picture study collections, film preservation prints & cinematic history',
  },
  {
    id: 'ch-soundfx',
    name: '🔊 BBC & Foley Sound FX',
    tag: 'Sound Effects & Foley',
    source: 'soundfx' as VideoSourceId,
    description: 'High-fidelity audio sound effects, Foley recordings, ambient soundscapes & field recordings',
  },
  {
    id: 'ch-publicfilm',
    name: '🎬 Classic Feature Cinema',
    tag: 'Movies & Cinema',
    source: 'publicfilm' as VideoSourceId,
    description: 'Historic feature-length cinema, dramatic epics, mystery films, Westerns and vintage studio motion pictures in public domain',
  },
  {
    id: 'ch-kidscartoons',
    name: 'Motu Patlu & Kids TV',
    tag: 'Motu Patlu',
    source: 'all' as VideoSourceId,
    description: 'Motu Patlu 24/7 TV, Doraemon, Shinchan, Cartoon Network, Disney & classic animation',
  },
  {
    id: 'ch-livetv',
    name: 'Global Live TV Broadcasts',
    tag: 'Live TV',
    source: 'livetv' as VideoSourceId,
    description: 'NASA TV, France 24, Bloomberg, DW News, Euronews, Sky News, Red Bull TV live streams',
  },
  {
    id: 'ch-radio',
    name: 'World Live Radio',
    tag: 'Live Radio',
    source: 'radio' as VideoSourceId,
    description: '40,000+ live radio broadcasts: Lo-Fi, BBC World, Jazz24, Classical, SomaFM & ambient grooves',
  },
  {
    id: 'ch-peertube',
    name: 'PeerTube Open Network',
    tag: 'Decentralized Video',
    source: 'peertube' as VideoSourceId,
    description: 'Decentralized community-hosted videos from federated open-source creators via Sepia Search',
  },
  {
    id: 'ch-archivewatch',
    name: 'Archive Watch Movies',
    tag: 'Movies & Cinema',
    source: 'archivewatch' as VideoSourceId,
    description: '30,000+ public-domain feature films: Night of the Living Dead, Charade, The General & Metropolis',
  },
  {
    id: 'ch-coverr',
    name: 'Coverr Free Stock',
    tag: 'Stock Footage',
    source: 'coverr' as VideoSourceId,
    description: 'Free stock video API: 1080p drone coastal cinematography, mountain vistas & urban time-lapses',
  },
  {
    id: 'ch-nasasvs',
    name: 'NASA SVS Science',
    tag: 'Space & Science',
    source: 'nasasvs' as VideoSourceId,
    description: 'Goddard Scientific Visualization Studio: supercomputer simulations of black holes & planetary data',
  },
  {
    id: 'ch-freetouse',
    name: 'Free To Use Audio',
    tag: 'Audio & Music',
    source: 'freetouse' as VideoSourceId,
    description: 'Royalty-free music and background audio tracks for content creators and filmmakers',
  },
  {
    id: 'ch-loc',
    name: 'LOC Historic Cinema',
    tag: 'Historical Archive',
    source: 'loc' as VideoSourceId,
    description: 'Library of Congress: earliest 1894 motion pictures, Wright Brothers first flight & San Francisco 1906',
  },
  {
    id: 'ch-polyhaven',
    name: 'Poly Haven 3D Assets',
    tag: '3D & Visual Assets',
    source: 'polyhaven' as VideoSourceId,
    description: 'Free CC0 3D models, photorealistic HDRIs, and materials from the Poly Haven public API',
  },
  {
    id: 'ch-tedtalks',
    name: 'TED & Open Culture',
    tag: 'TED Talks',
    source: 'tedtalks' as VideoSourceId,
    description: 'Ideas worth spreading: inspiring science, technology, architecture & cultural presentations',
  },
  {
    id: 'ch-otradio',
    name: 'Old Time Radio Theater',
    tag: 'Radio Drama',
    source: 'otradio' as VideoSourceId,
    description: 'Golden Age radio dramas from the 1930s-1950s: The Shadow, Sherlock Holmes, Suspense & Dimension X',
  },
  {
    id: 'ch-prelinger',
    name: 'Prelinger Retro Vault',
    tag: 'Americana Archive',
    source: 'prelinger' as VideoSourceId,
    description: '60,000+ ephemeral historic films: mid-century Americana, drive-in reels, retro cars & industrial reels',
  },
  {
    id: 'ch-freemusic',
    name: 'FMA Open Music',
    tag: 'Creative Commons Music',
    source: 'freemusic' as VideoSourceId,
    description: 'Royalty-free soundtracks, Kevin MacLeod cinematic scores, ambient and lo-fi audio tracks',
  },
  {
    id: 'ch-laionbvd',
    name: 'LAION-BVD Research',
    tag: 'AI Research',
    source: 'laionbvd' as VideoSourceId,
    description: 'Open video dataset for research with temporal action segments, resolution metrics & vision embeddings',
  },
];

export function normalizeMediaItem(item: any): VideoItem {
  const licenseStr =
    typeof item.license === 'object' && item.license !== null
      ? item.license.name || 'Open License'
      : typeof item.license === 'string' && item.license.trim()
      ? item.license
      : 'Open License';

  let rawPlayback = item.playbackUrl;
  if (rawPlayback && typeof rawPlayback === 'string' && !rawPlayback.startsWith('http://') && !rawPlayback.startsWith('https://') && !rawPlayback.startsWith('/')) {
    rawPlayback = 'https://' + rawPlayback;
  }

  let rawEmbed = item.embedUrl;
  if (rawEmbed && typeof rawEmbed === 'string' && !rawEmbed.startsWith('http://') && !rawEmbed.startsWith('https://') && !rawEmbed.startsWith('/')) {
    rawEmbed = 'https://' + rawEmbed;
  }

  // If playbackUrl points to an HTML embed, move it to embedUrl
  if (rawPlayback && typeof rawPlayback === 'string' && (rawPlayback.includes('/embed/') || rawPlayback.includes('/videos/embed/'))) {
    if (!rawEmbed) {
      rawEmbed = rawPlayback;
    }
    rawPlayback = null;
  }

  const isHls =
    (typeof rawPlayback === 'string' && rawPlayback.includes('.m3u8')) ||
    item.provider === 'livetv' ||
    item.metadata?.streamType === 'hls';
  const isAudio =
    item.mediaType === 'audio' ||
    item.provider === 'radio' ||
    item.metadata?.streamType === 'audio_stream';

  const isEmbedPlayer =
    !isHls &&
    !isAudio &&
    Boolean(
      item.playerType === 'embed' ||
      (rawEmbed && !rawPlayback) ||
      (rawPlayback && (rawPlayback.includes('/embed/') || rawPlayback.includes('/videos/embed/'))) ||
      (!rawPlayback && rawEmbed) ||
      ((item.provider === 'peertube' || item.source === 'peertube') && !rawPlayback && rawEmbed)
    );

  const playerType =
    item.playerType ||
    (isHls
      ? 'hls'
      : isAudio
      ? 'audio'
      : isEmbedPlayer
      ? 'embed'
      : 'html5');

  const videoUrl = rawPlayback || rawEmbed || item.videoUrl || '';

  const fallbackThumb =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="%23171717"><rect width="640" height="360" fill="%23171717"/><circle cx="320" cy="180" r="40" fill="%23262626"/><polygon points="312,165 335,180 312,195" fill="%23737373"/></svg>';
  let thumb =
    (typeof item.thumbnailUrl === 'string' && item.thumbnailUrl.trim()) ||
    (typeof item.thumbnail === 'string' && item.thumbnail.trim()) ||
    fallbackThumb;
  if (thumb && !thumb.startsWith('http://') && !thumb.startsWith('https://') && !thumb.startsWith('/') && !thumb.startsWith('data:')) {
    thumb = 'https://' + thumb;
  }

  return {
    ...item,
    id: item.id,
    source: item.provider || item.source || 'all',
    sourceName: item.provider ? item.provider.toUpperCase() : item.sourceName || 'Open Media',
    sourceLabel: item.provider ? item.provider.toUpperCase() : item.sourceLabel || 'Open Media',
    title: item.title || 'Untitled Media',
    description: item.description || '',
    thumbnail: thumb,
    thumbnailUrl: thumb,
    videoUrl,
    audioUrl: isAudio ? rawPlayback || item.audioUrl : undefined,
    playbackUrl: rawPlayback || undefined,
    embedUrl: rawEmbed || undefined,
    channel: item.creator || item.channel || item.author || 'Open Creator',
    author: item.creator || item.channel || item.author || 'Open Creator',
    publishedAt: item.publishedAt || item.date || 'Recent',
    date: item.publishedAt || item.date || 'Recent',
    duration: typeof item.duration === 'number' ? item.duration : 0,
    license: licenseStr,
    licenseData: typeof item.license === 'object' ? item.license : undefined,
    category: item.category || (item.mediaType ? item.mediaType.toUpperCase() : 'Open Media'),
    playerType,
    isLive: Boolean(item.metadata?.isLive || isHls || (isAudio && item.duration === 0)),
    streamType: isHls ? 'hls' : isAudio ? 'audio_stream' : undefined,
    bitrate: item.metadata?.bitrate,
    codec: item.metadata?.codec,
  };
}

// Bounded LRU client cache with Stale-While-Revalidate
interface ClientCacheEntry {
  data: UnifiedSearchResponse;
  timestamp: number;
}
const CLIENT_CACHE_MAX_ENTRIES = 75;
const CLIENT_FRESH_TTL_MS = 60 * 1000; // 60s fresh
const CLIENT_STALE_TTL_MS = 300 * 1000; // 5 min stale grace
const clientSearchCache = new Map<string, ClientCacheEntry>();
const inFlightClientSearches = new Map<string, Promise<UnifiedSearchResponse>>();

function buildCanonicalCacheKey(query: string, source: string, page = 1, limit = 24, mediaType = 'all'): string {
  const normQ = query.trim().toLowerCase().replace(/\s+/g, ' ') || 'trending';
  return `${source.toLowerCase()}:${normQ}:${page}:${limit}:${mediaType}`;
}

function setClientCache(key: string, data: UnifiedSearchResponse) {
  // Enforce LRU eviction
  if (clientSearchCache.size >= CLIENT_CACHE_MAX_ENTRIES) {
    const oldestKey = clientSearchCache.keys().next().value;
    if (oldestKey) clientSearchCache.delete(oldestKey);
  }
  clientSearchCache.set(key, { data, timestamp: Date.now() });
}

function refreshOnce(
  key: string,
  fetcher: () => Promise<UnifiedSearchResponse>
): Promise<UnifiedSearchResponse> {
  const existing = inFlightClientSearches.get(key);
  if (existing) return existing;
  const promise = fetcher().finally(() => {
    inFlightClientSearches.delete(key);
  });
  inFlightClientSearches.set(key, promise);
  return promise;
}

/**
 * Unified Video Search Engine (calls backend /api/videos/search)
 * Featuring 0ms local LRU cache hit, Stale-While-Revalidate, and In-Flight Request Deduplication
 */
export async function searchUnifiedVideos(
  query: string = 'trending',
  source: VideoSourceId = 'all',
  signal?: AbortSignal,
  sources?: string[]
): Promise<UnifiedSearchResponse> {
  const normalizedQuery = query.trim() || 'trending';
  const sourcesKey = sources && sources.length > 0 ? sources.slice().sort().join(',') : '';
  const cacheKey = buildCanonicalCacheKey(`${normalizedQuery}:${sourcesKey}`, source);
  const now = Date.now();

  const cached = clientSearchCache.get(cacheKey);
  if (cached) {
    // Re-promote to end of Map for LRU
    clientSearchCache.delete(cacheKey);
    clientSearchCache.set(cacheKey, cached);

    const age = now - cached.timestamp;
    if (age < CLIENT_FRESH_TTL_MS) {
      // 0ms instant cache hit
      return cached.data;
    }
    if (age < CLIENT_STALE_TTL_MS) {
      // Return stale immediately and revalidate in background using a separate non-aborted controller
      refreshOnce(cacheKey, () => {
        const bgCtrl = new AbortController();
        const timeout = setTimeout(() => bgCtrl.abort(), 6000);
        return executeNetworkSearch(normalizedQuery, source, cacheKey, bgCtrl.signal, sources)
          .finally(() => clearTimeout(timeout));
      }).catch(() => {});
      return cached.data;
    }
  }

  // Single-flight in-flight deduplication
  return refreshOnce(cacheKey, () => executeNetworkSearch(normalizedQuery, source, cacheKey, signal, sources));
}

async function executeNetworkSearch(
  normalizedQuery: string,
  source: VideoSourceId,
  cacheKey: string,
  signal?: AbortSignal,
  sources?: string[]
): Promise<UnifiedSearchResponse> {
  const params = new URLSearchParams();
  params.set('q', normalizedQuery);
  params.set('source', source);
  params.set('limit', '48');
  if (sources && sources.length > 0) {
    params.set('sources', sources.join(','));
  }
  const url = `/api/videos/search?${params.toString()}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Unified search failed with status ${res.status}`);
  }

  const data: UnifiedSearchResponse = await res.json();

  // Normalize aliases for frontend compatibility
  const normalizedResults = (data.results || []).map(normalizeMediaItem);

  const normalizedBySource: Record<string, VideoItem[]> = {};
  for (const [srcKey, items] of Object.entries(data.bySource || {})) {
    normalizedBySource[srcKey] = items.map(normalizeMediaItem);
  }

  const finalResponse: UnifiedSearchResponse = {
    query: data.query,
    total: normalizedResults.length,
    results: normalizedResults,
    bySource: normalizedBySource,
    apiConfig: data.apiConfig || {
      hasOpenverseKey: false,
      hasEuropeanaKey: false,
      hasDvidsKey: false,
    },
  };

  setClientCache(cacheKey, finalResponse);
  return finalResponse;
}

// Database 1: Recents API
export async function fetchRecents(): Promise<any[]> {
  try {
    const res = await fetch('/api/recents');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.recents || []).map((r: any) => ({
      ...r,
      mediaItem: normalizeMediaItem(r.mediaItem),
    }));
  } catch {
    return [];
  }
}

export async function saveRecentPlayback(
  mediaItem: VideoItem,
  currentTime: number,
  duration: number
): Promise<void> {
  try {
    await fetch('/api/recents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaItem, currentTime, duration }),
    });
  } catch {
    // Fail-safe
  }
}

export async function deleteRecent(id: string): Promise<void> {
  try {
    await fetch(`/api/recents/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    // Fail-safe
  }
}

export async function clearAllRecents(): Promise<void> {
  try {
    await fetch('/api/recents', { method: 'DELETE' });
  } catch {
    // Fail-safe
  }
}

// Database 2: Bookmarks API
export async function fetchBookmarks(): Promise<any[]> {
  try {
    const res = await fetch('/api/bookmarks');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.bookmarks || []).map((b: any) => ({
      ...b,
      mediaItem: normalizeMediaItem(b.mediaItem),
    }));
  } catch {
    return [];
  }
}

export async function toggleBookmark(
  mediaItem: VideoItem,
  tag?: string
): Promise<{ isBookmarked: boolean }> {
  try {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaItem, tag }),
    });
    if (!res.ok) return { isBookmarked: false };
    return await res.json();
  } catch {
    return { isBookmarked: false };
  }
}

// Database 3: Live TV & Radio Channels API with Multi-Source IPTV & M3U Engine
export async function fetchTvChannels(
  category?: string,
  query?: string,
  country?: string,
  sourceType?: string
): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (query) params.append('q', query);
    if (country) params.append('country', country);
    if (sourceType) params.append('sourceType', sourceType);
    const res = await fetch(`/api/channels/tv?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.channels || [];
  } catch {
    return [];
  }
}

export async function addCustomChannel(channel: any): Promise<{ success: boolean; channel?: any; error?: string }> {
  try {
    const res = await fetch('/api/channels/tv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channel),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteChannel(channelId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/channels/tv/${encodeURIComponent(channelId)}`, { method: 'DELETE' });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export async function resetChannelsToDefault(): Promise<any[]> {
  try {
    const res = await fetch('/api/channels/tv/reset', { method: 'POST' });
    const data = await res.json();
    return data.channels || [];
  } catch {
    return [];
  }
}

export async function fetchChannelsMeta(): Promise<{ categories: string[]; countries: string[]; presets: any[] }> {
  try {
    const res = await fetch('/api/channels/meta');
    if (!res.ok) return { categories: [], countries: [], presets: [] };
    return await res.json();
  } catch {
    return { categories: [], countries: [], presets: [] };
  }
}

export async function searchIptvDirectory(
  query?: string,
  category?: string,
  country?: string,
  limit?: number
): Promise<{ channels: any[]; total: number; source: string }> {
  try {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category) params.append('category', category);
    if (country) params.append('country', country);
    if (limit) params.append('limit', limit.toString());
    const res = await fetch(`/api/channels/iptv/search?${params.toString()}`);
    if (!res.ok) return { channels: [], total: 0, source: 'offline' };
    return await res.json();
  } catch {
    return { channels: [], total: 0, source: 'error' };
  }
}

export async function fetchM3uPresets(): Promise<any[]> {
  try {
    const res = await fetch('/api/channels/presets');
    if (!res.ok) return [];
    const data = await res.json();
    return data.presets || [];
  } catch {
    return [];
  }
}

export async function importM3uPreset(presetId: string): Promise<{ success: boolean; addedCount: number; presetName?: string; error?: string }> {
  try {
    const res = await fetch('/api/channels/m3u/import-preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, addedCount: 0, error: err.message };
  }
}

export async function importM3uPlaylist(options: {
  url?: string;
  content?: string;
  group?: string;
}): Promise<{ success: boolean; importedCount: number; addedCount: number; error?: string }> {
  try {
    const res = await fetch('/api/channels/m3u/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, importedCount: 0, addedCount: 0, error: err.message };
  }
}

export const EXPORT_M3U_URL = '/api/channels/export/m3u';

export async function fetchRadioStations(genre?: string, query?: string): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (genre) params.append('genre', genre);
    if (query) params.append('q', query);
    const res = await fetch(`/api/channels/radio?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.stations || [];
  } catch {
    return [];
  }
}

// Controller System Stats
export async function fetchSystemStats(): Promise<any | null> {
  try {
    const res = await fetch('/api/system/stats');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// CDN & Edge Routing Status
export async function fetchCdnStatus(): Promise<any | null> {
  try {
    const res = await fetch('/api/cdn/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function formatDuration(seconds: number | string): string {
  if (typeof seconds === 'string') {
    const parsed = parseFloat(seconds);
    if (isNaN(parsed) || parsed <= 0) return '0:00';
    seconds = parsed;
  }
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';

  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export interface StreamProbeResult {
  url: string;
  status: 'online' | 'degraded' | 'offline';
  httpStatus?: number;
  latencyMs?: number;
  contentType?: string;
  isHls?: boolean;
  error?: string;
}

export async function probeStreamHealth(streamUrl: string): Promise<StreamProbeResult> {
  try {
    const res = await fetch(`/api/channels/probe?url=${encodeURIComponent(streamUrl)}`);
    if (!res.ok) {
      return {
        url: streamUrl,
        status: 'offline',
        httpStatus: res.status,
        error: `Server probe responded with HTTP ${res.status}`,
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      url: streamUrl,
      status: 'offline',
      error: err.message || 'Stream probe network failure',
    };
  }
}

