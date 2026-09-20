import { MediaItem } from '../../types/media';
import { validateMediaItem } from '../../engine/validator';

export function mapYouTubeSearchItem(rawItem: any): MediaItem | null {
  const videoId = rawItem?.id?.videoId || rawItem?.id;
  if (!videoId || typeof videoId !== 'string') return null;

  const snippet = rawItem?.snippet || {};
  const thumbnails = snippet.thumbnails || {};
  const bestThumb = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;

  return validateMediaItem(
    {
      id: videoId,
      provider: 'youtube',
      title: snippet.title || 'YouTube Video',
      description: snippet.description || '',
      mediaType: 'video',
      thumbnailUrl: bestThumb,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      playbackUrl: null, // YouTube does not provide raw video files; embed is used
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      publishedAt: snippet.publishedAt,
      channel: snippet.channelTitle,
      creator: snippet.channelTitle,
      license: {
        name: 'Standard YouTube License / Creative Commons',
        url: 'https://www.youtube.com/t/terms',
      },
      metadata: {
        channelId: snippet.channelId,
        liveBroadcastContent: snippet.liveBroadcastContent,
      },
    },
    'youtube'
  );
}

// Parses ISO 8601 duration (e.g. PT4M13S) to seconds
export function parseIsoDuration(durationStr?: string): number | undefined {
  if (!durationStr || typeof durationStr !== 'string') return undefined;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}
