import { MediaItem } from '../../types/media';
import { validateMediaItem, sanitizeText } from '../../engine/validator';

export function mapOpenverseAudio(item: any): MediaItem | null {
  if (!item || !item.id) return null;

  const id = String(item.id);
  const title = sanitizeText(item.title) || 'Creative Commons Audio';
  const audioUrl = item.url;
  if (!audioUrl || !audioUrl.startsWith('http')) return null;

  const sourceUrl = item.foreign_landing_url || `https://openverse.org/audio/${id}`;
  const durationSec = item.duration ? Math.round(item.duration / 1000) : undefined;

  const licenseName = item.license ? `CC ${item.license.toUpperCase()} ${item.license_version || ''}`.trim() : 'Creative Commons';

  return validateMediaItem(
    {
      id,
      provider: 'openverse',
      title,
      description: `Creative Commons indexed recording by ${item.creator || 'Openverse contributor'}. Provider: ${item.provider || 'openverse'}.`,
      mediaType: 'audio',
      thumbnailUrl: item.thumbnail || undefined,
      sourceUrl,
      playbackUrl: audioUrl, // Direct, genuine playable audio file
      embedUrl: null,
      duration: durationSec,
      creator: sanitizeText(item.creator) || 'Creative Commons Artist',
      channel: `Openverse (${item.provider || 'CC'})`,
      license: {
        name: licenseName,
        url: item.license_url || 'https://creativecommons.org/',
        commercialUse: !item.license?.toLowerCase().includes('nc'),
        attributionRequired: item.license?.toLowerCase().includes('by'),
      },
      metadata: {
        openverseId: id,
        filetype: item.filetype,
        genres: item.genres || [],
        originalProvider: item.provider,
      },
    },
    'openverse'
  );
}
