import { MediaItem } from '../../types/media';
import { validateMediaItem } from '../../engine/validator';
import {
  YouTubeSearchResultItem,
  YouTubeVideoItem,
  YouTubeThumbnails,
} from './youtubeTypes';

/**
 * Parses ISO 8601 duration string (e.g. PT4M13S, PT1H23M45S, PT30S) to duration in seconds
 */
export function parseIsoDuration(durationStr?: string): number | undefined {
  if (!durationStr || typeof durationStr !== 'string') return undefined;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Extracts the highest resolution available thumbnail URL
 */
export function getBestThumbnailUrl(thumbnails?: YouTubeThumbnails, videoId?: string): string {
  if (thumbnails) {
    if (thumbnails.maxres?.url) return thumbnails.maxres.url;
    if (thumbnails.standard?.url) return thumbnails.standard.url;
    if (thumbnails.high?.url) return thumbnails.high.url;
    if (thumbnails.medium?.url) return thumbnails.medium.url;
    if (thumbnails.default?.url) return thumbnails.default.url;
  }
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="%23171717"><rect width="640" height="360" fill="%23171717"/><circle cx="320" cy="180" r="40" fill="%23262626"/><polygon points="312,165 335,180 312,195" fill="%23737373"/></svg>';
}

/**
 * Maps a YouTube search item combined with optional batched video details into canonical MediaItem
 */
export function mapYouTubeItem(
  searchItem: YouTubeSearchResultItem,
  detailItem?: YouTubeVideoItem
): MediaItem | null {
  const videoId = searchItem.id?.videoId || (searchItem.id as any);
  if (!videoId || typeof videoId !== 'string') return null;

  const snippet = detailItem?.snippet || searchItem.snippet || ({} as any);
  const contentDetails = detailItem?.contentDetails;
  const statistics = detailItem?.statistics;
  const status = detailItem?.status;

  const thumbnailUrl = getBestThumbnailUrl(snippet.thumbnails, videoId);
  const durationSeconds = contentDetails ? parseIsoDuration(contentDetails.duration) : undefined;
  const isCreativeCommons = status?.license === 'creativeCommon';

  const viewCount = statistics?.viewCount ? parseInt(statistics.viewCount, 10) : undefined;

  const item: MediaItem = {
    id: videoId,
    provider: 'youtube',
    providerId: videoId,
    title: snippet.title || 'YouTube Video',
    description: snippet.description || '',
    mediaType: 'video',
    thumbnailUrl,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    playbackUrl: null, // YouTube uses iframe embed, not direct mp4
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
    duration: durationSeconds,
    publishedAt: snippet.publishedAt,
    channel: snippet.channelTitle,
    creator: snippet.channelTitle,
    license: {
      name: isCreativeCommons
        ? 'Creative Commons Attribution license (reuse allowed)'
        : 'Standard YouTube License',
      url: isCreativeCommons
        ? 'https://support.google.com/youtube/answer/2797468'
        : 'https://www.youtube.com/t/terms',
      commercialUse: isCreativeCommons,
      attributionRequired: isCreativeCommons,
    },
    metadata: {
      channelId: snippet.channelId,
      liveBroadcastContent: snippet.liveBroadcastContent,
      tags: snippet.tags || [],
      categoryId: snippet.categoryId,
      definition: contentDetails?.definition || 'hd',
      viewCount,
      embeddable: status?.embeddable !== false,
    },
  };

  return validateMediaItem(item, 'youtube');
}

/**
 * Maps standalone video item (from videos.list details endpoint)
 */
export function mapYouTubeVideoDetail(videoItem: YouTubeVideoItem): MediaItem | null {
  const videoId = videoItem.id;
  if (!videoId || typeof videoId !== 'string') return null;

  const snippet = videoItem.snippet || ({} as any);
  const contentDetails = videoItem.contentDetails;
  const statistics = videoItem.statistics;
  const status = videoItem.status;

  const thumbnailUrl = getBestThumbnailUrl(snippet.thumbnails, videoId);
  const durationSeconds = contentDetails ? parseIsoDuration(contentDetails.duration) : undefined;
  const isCreativeCommons = status?.license === 'creativeCommon';
  const viewCount = statistics?.viewCount ? parseInt(statistics.viewCount, 10) : undefined;

  const item: MediaItem = {
    id: videoId,
    provider: 'youtube',
    providerId: videoId,
    title: snippet.title || 'YouTube Video',
    description: snippet.description || '',
    mediaType: 'video',
    thumbnailUrl,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    playbackUrl: null,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
    duration: durationSeconds,
    publishedAt: snippet.publishedAt,
    channel: snippet.channelTitle,
    creator: snippet.channelTitle,
    license: {
      name: isCreativeCommons
        ? 'Creative Commons Attribution license (reuse allowed)'
        : 'Standard YouTube License',
      url: isCreativeCommons
        ? 'https://support.google.com/youtube/answer/2797468'
        : 'https://www.youtube.com/t/terms',
      commercialUse: isCreativeCommons,
      attributionRequired: isCreativeCommons,
    },
    metadata: {
      channelId: snippet.channelId,
      tags: snippet.tags || [],
      categoryId: snippet.categoryId,
      definition: contentDetails?.definition || 'hd',
      viewCount,
      embeddable: status?.embeddable !== false,
    },
  };

  return validateMediaItem(item, 'youtube');
}
