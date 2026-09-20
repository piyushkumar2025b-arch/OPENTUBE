import { MediaItem } from '../../types/media';
import { validateMediaItem } from '../../engine/validator';

export function mapVimeoVideo(v: any): MediaItem | null {
  if (!v || !v.uri) return null;

  const idMatch = v.uri.match(/\/videos\/(\d+)/);
  const id = idMatch ? idMatch[1] : String(v.uri).replace('/videos/', '');
  if (!id) return null;

  const pictures = v.pictures?.sizes || [];
  const bestPic = pictures[pictures.length - 1]?.link || pictures[0]?.link;

  const user = v.user || {};

  return validateMediaItem(
    {
      id,
      provider: 'vimeo',
      title: v.name || 'Vimeo Video',
      description: v.description || '',
      mediaType: 'video',
      thumbnailUrl: bestPic,
      sourceUrl: v.link || `https://vimeo.com/${id}`,
      playbackUrl: null, // Vimeo API restricts raw MP4 without Pro/Owner rights; embedUrl is used
      embedUrl: v.player_embed_url || `https://player.vimeo.com/video/${id}`,
      duration: v.duration || undefined,
      publishedAt: v.created_time || v.release_time,
      creator: user.name || 'Vimeo Creator',
      channel: 'Vimeo',
      license: {
        name: v.license || 'Vimeo Terms of Service',
        url: 'https://vimeo.com/terms',
      },
      metadata: {
        uri: v.uri,
        userUrl: user.link,
      },
    },
    'vimeo'
  );
}
