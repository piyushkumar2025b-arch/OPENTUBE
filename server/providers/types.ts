import { MediaItem, ProviderSearchOptions, ProviderSearchResult } from '../types/media';

export interface PlaybackCandidate {
  kind: 'direct' | 'hls' | 'embed';
  url: string;
  mimeType?: string;
  quality?: string;
  width?: number;
  height?: number;
  bitrate?: number;
}

export interface PlaybackResolution {
  id: string;
  provider: string;
  candidates: PlaybackCandidate[];
  selectedCandidateIndex: number;
  hasDirectStream: boolean;
  playbackUrl?: string | null;
  embedUrl?: string | null;
  sourceUrl?: string;
}

export interface ProviderCapabilities {
  search: boolean;
  metadata: boolean;
  directPlayback: boolean;
  hls: boolean;
  embed: boolean;
}

export type ProviderHealthStatus =
  | 'configured'
  | 'unconfigured'
  | 'healthy'
  | 'degraded'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'disabled';

export interface ProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiresApiKey: boolean;
  readonly capabilities?: Partial<ProviderCapabilities>;
  readonly latencyClass?: 'fast' | 'medium' | 'slow';
  readonly defaultBudgetMs?: number;
  isConfigured(): boolean;
  getStatus?(): ProviderHealthStatus;
  search(options: ProviderSearchOptions): Promise<ProviderSearchResult>;
  getDetails?(id: string): Promise<MediaItem | null>;
  getVideo?(providerId: string): Promise<MediaItem | null>;
  resolvePlayback?(id: string, options?: Record<string, any>): Promise<PlaybackResolution | null>;
}

/**
 * Standard Common Video Provider Contract (Requirement 19)
 */
export interface VideoProvider extends ProviderAdapter {
  id: string;
  capabilities: ProviderCapabilities;
  search(params: ProviderSearchOptions): Promise<ProviderSearchResult>;
  getVideo(providerId: string): Promise<MediaItem | null>;
  resolvePlayback?(providerId: string): Promise<PlaybackResolution | null>;
}
