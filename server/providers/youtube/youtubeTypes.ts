export interface YouTubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface YouTubeThumbnails {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

export interface YouTubeSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  tags?: string[];
  categoryId?: string;
  liveBroadcastContent?: 'none' | 'upcoming' | 'live';
  defaultLanguage?: string;
  localized?: {
    title: string;
    description: string;
  };
  defaultAudioLanguage?: string;
}

export interface YouTubeContentDetails {
  duration: string; // ISO 8601 (e.g. PT4M13S)
  dimension: string;
  definition: 'hd' | 'sd';
  caption?: string;
  licensedContent?: boolean;
  contentRating?: Record<string, any>;
  projection?: string;
}

export interface YouTubeStatistics {
  viewCount?: string;
  likeCount?: string;
  favoriteCount?: string;
  commentCount?: string;
}

export interface YouTubeStatus {
  uploadStatus?: string;
  privacyStatus?: string;
  license?: 'youtube' | 'creativeCommon';
  embeddable?: boolean;
  publicStatsViewable?: boolean;
}

export interface YouTubeSearchResultItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: YouTubeSnippet;
}

export interface YouTubeSearchListResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeSearchResultItem[];
}

export interface YouTubeVideoItem {
  kind: string;
  etag: string;
  id: string;
  snippet?: YouTubeSnippet;
  contentDetails?: YouTubeContentDetails;
  statistics?: YouTubeStatistics;
  status?: YouTubeStatus;
}

export interface YouTubeVideoListResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeVideoItem[];
}

export interface YouTubeQuotaTracker {
  totalRequests: number;
  estimatedUnitsUsed: number;
  isQuotaExhausted: boolean;
  quotaExhaustedAt?: number;
  cooldownUntil?: number;
  consecutiveErrors: number;
  lastError?: string;
}
