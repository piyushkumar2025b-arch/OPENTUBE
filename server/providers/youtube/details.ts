import { MediaItem } from '../../types/media';
import { validateMediaItem } from '../../engine/validator';
import { parseIsoDuration } from './mapper';

export async function fetchYouTubeDetails(videoId: string, apiKey: string, timeoutMs = 6000): Promise<MediaItem | null> {
  const cleanId = videoId.replace(/^youtube:/, '');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(cleanId)}&key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    const snippet = item.snippet || {};
    const contentDetails = item.contentDetails || {};
    const thumbnails = snippet.thumbnails || {};
    const bestThumb = thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url;

    const isCreativeCommons = snippet.license === 'creativeCommon';

    return validateMediaItem(
      {
        id: cleanId,
        provider: 'youtube',
        title: snippet.title || 'YouTube Video',
        description: snippet.description || '',
        mediaType: 'video',
        thumbnailUrl: bestThumb,
        sourceUrl: `https://www.youtube.com/watch?v=${cleanId}`,
        playbackUrl: null,
        embedUrl: `https://www.youtube.com/embed/${cleanId}`,
        duration: parseIsoDuration(contentDetails.duration),
        publishedAt: snippet.publishedAt,
        channel: snippet.channelTitle,
        creator: snippet.channelTitle,
        license: {
          name: isCreativeCommons ? 'Creative Commons Attribution license (reuse allowed)' : 'Standard YouTube License',
          url: isCreativeCommons ? 'https://support.google.com/youtube/answer/2797468' : 'https://www.youtube.com/t/terms',
          commercialUse: isCreativeCommons,
          attributionRequired: isCreativeCommons,
        },
        metadata: {
          tags: snippet.tags || [],
          categoryId: snippet.categoryId,
          definition: contentDetails.definition,
          licensedContent: contentDetails.licensedContent,
        },
      },
      'youtube'
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
