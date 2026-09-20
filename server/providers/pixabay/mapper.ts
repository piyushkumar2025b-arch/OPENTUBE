import { MediaItem } from '../../types/media';
import { validateMediaItem } from '../../engine/validator';

export function mapPixabayHit(hit: any): MediaItem | null {
  if (!hit || !hit.id) return null;

  const id = String(hit.id);
  const videos = hit.videos || {};
  const bestVideo = videos.medium || videos.large || videos.small || videos.tiny;
  const playbackUrl = bestVideo?.url || null;

  const thumbUrl = hit.picture_id
    ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`
    : undefined;

  const tags = typeof hit.tags === 'string' ? hit.tags.split(',').map((t: string) => t.trim()) : [];
  const primaryTag = tags[0] || 'Nature';
  const title = `${primaryTag.charAt(0).toUpperCase() + primaryTag.slice(1)} Footage (${tags.slice(1, 3).join(', ') || 'Stock'})`;

  return validateMediaItem(
    {
      id,
      provider: 'pixabay',
      title,
      description: `Free stock video by ${hit.user || 'Pixabay contributor'}. Tags: ${hit.tags || 'stock'}.`,
      mediaType: 'video',
      thumbnailUrl: thumbUrl,
      sourceUrl: hit.pageURL || `https://pixabay.com/videos/id-${id}/`,
      playbackUrl,
      embedUrl: null,
      duration: hit.duration || undefined,
      creator: hit.user || 'Pixabay Contributor',
      channel: 'Pixabay Video',
      license: {
        name: 'Pixabay Content License (Free for commercial use, no attribution required)',
        url: 'https://pixabay.com/service/license-summary/',
        commercialUse: true,
        attributionRequired: false,
      },
      metadata: {
        views: hit.views,
        downloads: hit.downloads,
        likes: hit.likes,
        tags,
      },
    },
    'pixabay'
  );
}
