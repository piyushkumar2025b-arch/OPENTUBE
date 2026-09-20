export type MediaType = 'video' | 'audio' | 'movie' | 'tv';

export interface MediaLicense {
  name?: string;
  url?: string;
  commercialUse?: boolean;
  attributionRequired?: boolean;
}

export interface MediaItem {
  id: string;
  provider: string;
  providerId?: string;
  providerHost?: string;
  title: string;
  description?: string;
  mediaType: MediaType;
  thumbnailUrl?: string;
  sourceUrl: string;
  playbackUrl?: string | null;
  embedUrl?: string | null;
  playerType?: 'video' | 'audio' | 'embed' | 'hls' | 'asset3d';
  duration?: number;
  publishedAt?: string;
  creator?: string;
  channel?: string;
  license?: MediaLicense;
  metadata: Record<string, unknown>;
}

export type CanonicalVideo = MediaItem;

export type ProviderStatusCode = 'ok' | 'unconfigured' | 'rate_limited' | 'error' | 'timeout';

export interface ProviderStatusInfo {
  status: ProviderStatusCode;
  message?: string;
  count: number;
  latencyMs?: number;
}

export interface ProviderSearchOptions {
  query: string;
  page?: number;
  limit?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ProviderSearchResult {
  items: MediaItem[];
  total?: number;
  nextPage?: number | string | null;
  status: ProviderStatusCode;
  error?: string;
}

export interface UnifiedSearchResponse {
  query: string;
  total: number;
  page: number;
  limit: number;
  results: MediaItem[];
  providers: Record<string, ProviderStatusInfo>;
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  errors: Array<{ provider: string; error: string }>;
  meta?: {
    partial: boolean;
    providersQueried: number;
    providersSucceeded: number;
    providersFailed: number;
    durationMs: number;
  };
  timing?: {
    providers: number;
    total: number;
  };
}

export interface CachedResponse<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}
