export type VideoSourceId =
  | 'all'
  | 'custom'
  | 'dailymotion'
  | 'openmovie'
  | 'mux'
  | 'youtube'
  | 'pexels'
  | 'livetv'
  | 'radio'
  | 'peertube'
  | 'archive'
  | 'nasa'
  | 'wikimedia'
  | 'openverse'
  | 'pixabay'
  | 'vimeo'
  | 'itunes'
  | 'audius'
  | 'somafm'
  | 'archivewatch'
  | 'featurefilms'
  | 'classiccartoons'
  | 'tvnews'
  | 'computerchronicles'
  | 'tedtalks'
  | 'otradio'
  | 'prelinger'
  | 'freemusic'
  | 'coverr'
  | 'scifihorror'
  | 'silentfilms'
  | 'mitocw'
  | 'animation'
  | 'sportsarchive'
  | 'naturevids'
  | 'loc'
  | 'dvids'
  | 'nasasvs'
  | 'harvardfilm'
  | 'publicfilm'
  | 'retrogaming'
  | 'soundfx'
  | 'smithsonian'
  | 'europeana'
  | 'freetouse'
  | 'everyfilm'
  | 'polyhaven'
  | 'laionbvd';

export type PlayerType = 'html5' | 'audio' | 'asset3d' | 'metadata' | 'embed' | 'hls';

export interface MediaLicense {
  name?: string;
  url?: string;
  commercialUse?: boolean;
  attributionRequired?: boolean;
}

export interface VideoItem {
  id: string;
  source: VideoSourceId | string;
  sourceLabel?: string;
  sourceName?: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnailUrl?: string; // alias
  videoUrl: string;
  playbackUrl?: string;
  audioUrl?: string;
  embedUrl?: string;
  channel: string;
  author?: string; // alias
  publishedAt: string;
  date?: string; // alias
  duration: number; // in seconds (0 for live or unknown)
  license: string | MediaLicense;
  licenseData?: MediaLicense;
  category?: string;
  playerType: PlayerType;
  mimeType?: string;
  width?: number;
  height?: number;
  isLive?: boolean;
  streamType?: 'hls' | 'audio_stream' | 'mp4' | 'embed';
  bitrate?: number;
  codec?: string;
  metadata?: Record<string, any>;
  // Specific metadata fields for specialized new discovery sources
  director?: string; // Archive Watch / every.film
  cast?: string[]; // every.film / Archive Watch
  rating?: string; // every.film / Archive Watch
  genre?: string; // every.film
  polyCount?: number; // Poly Haven
  assetType?: '3d_model' | 'hdri' | 'texture'; // Poly Haven
  datasetAnnotations?: {
    clipId?: string;
    resolution?: string;
    fps?: number;
    embeddingModel?: string;
    captionConfidence?: number;
  }; // LAION-BVD
  audioGenre?: string; // Free To Use API / Openverse
  bpm?: number; // Free To Use API
  downloadUrl?: string;
}

export interface RecentItem {
  id: string;
  mediaItem: VideoItem;
  currentTime: number;
  duration: number;
  progressPercent: number;
  lastPlayedAt: string;
  completed: boolean;
}

export interface BookmarkItem {
  id: string;
  mediaItem: VideoItem;
  savedAt: string;
  tag?: string;
}

export interface ChannelMirror {
  name: string;
  url: string;
  playerType?: 'hls' | 'embed';
  quality?: string;
}

export interface LiveTvChannel {
  id: string;
  name: string;
  category: 'Satellite TV' | 'News' | 'Kids & Animation' | 'Science & Space' | 'Culture & Documentary' | 'Sports' | 'Finance' | 'Earth & Webcams' | 'Music & Lofi' | 'Free Movies' | 'Wildlife & Documentary' | string;
  country: string;
  language: string;
  logo: string;
  streamUrl: string;
  embedUrl?: string;
  playerType?: 'hls' | 'embed';
  description: string;
  quality: string;
  isLive: boolean;
  badge?: string;
  sourceType?: 'satellite' | 'fast_tv' | 'webcam' | 'youtube_live' | 'iptv' | 'custom' | 'm3u';
  mirrors?: ChannelMirror[];
  isCustom?: boolean;
}

export interface M3uPreset {
  id: string;
  name: string;
  description: string;
  channelCount: number;
  badge: string;
  icon?: string;
  channels?: LiveTvChannel[];
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  country: string;
  language: string;
  logo: string;
  streamUrl: string;
  bitrate: number;
  codec: string;
  homepage?: string;
  votes?: number;
}

export interface SystemStats {
  timestamp: string;
  cache: {
    l1Size: number;
    l2Size: number;
    l1Hits: number;
    l2Hits: number;
    misses: number;
    writes: number;
    revalidations: number;
    hitRatePercent: number;
  };
  circuitBreakers: Record<
    string,
    {
      name: string;
      state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
      failureCount: number;
      successCount: number;
      totalCalls: number;
      totalTripped: number;
    }
  >;
  rateLimiters: Record<
    string,
    {
      availableTokens: number;
      capacity: number;
      refillRate: number;
      totalRequested: number;
      totalThrottled: number;
      throttledPercentage: number;
    }
  >;
  providers: Array<{
    id: string;
    name: string;
    description: string;
    requiresApiKey: boolean;
    isConfigured: boolean;
  }>;
}

export interface VideoChannel {
  id: string;
  name: string;
  description: string;
  source: VideoSourceId;
  tag: string;
  iconName?: string;
}

export type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export interface ServerApiConfig {
  hasYouTubeKey?: boolean;
  hasPexelsKey?: boolean;
  hasPixabayKey?: boolean;
  hasVimeoToken?: boolean;
  hasOpenverseKey?: boolean;
  hasEuropeanaKey?: boolean;
  hasDvidsKey?: boolean;
  pexelsStatus?: {
    active: boolean;
    mode: string;
    message: string;
  };
  youtubeStatus?: {
    active: boolean;
    hasKey: boolean;
    mode: string;
    message: string;
  };
}

export interface UnifiedSearchResponse {
  query: string;
  total: number;
  results: VideoItem[];
  bySource: Record<string, VideoItem[]>;
  apiConfig?: ServerApiConfig;
}

export interface CdnStatus {
  status: string;
  timestamp: string;
  edgeCdn: {
    isBehindCdn: boolean;
    isBehindCloudflare: boolean;
    edgeRay: string | null;
    country: string | null;
    clientIp: string | null;
    cdnLoop: string | null;
  };
  optimizations: {
    lazyLoading: { status: string; description: string };
    facadePreviews: { status: string; description: string };
    lightweightPlayer: { status: string; description: string };
    adaptiveBitrate: { status: string; description: string };
    freeCdnRouting: { status: string; description: string };
  };
  cloudflareGuide: {
    title: string;
    steps: string[];
  };
}

