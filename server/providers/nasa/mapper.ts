import { MediaItem } from '../../types/media';
import { validateMediaItem, sanitizeText } from '../../engine/validator';

export function mapNasaItem(item: any, directPlaybackUrl?: string | null): MediaItem | null {
  const data = item?.data?.[0];
  if (!data || !data.nasa_id) return null;

  const nasaId = data.nasa_id;
  const links: any[] = item.links || [];
  const previewLink = links.find((l) => l.rel === 'preview' || l.render === 'image');
  const thumbUrl = previewLink?.href || undefined;

  const sourceUrl = `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`;

  // If a verified playback URL was resolved, use it; otherwise null (never fabricate!)
  const playbackUrl = directPlaybackUrl || null;

  return validateMediaItem(
    {
      id: nasaId,
      provider: 'nasa',
      title: sanitizeText(data.title) || 'NASA Mission Footage',
      description: sanitizeText(data.description) || 'NASA public domain space exploration and astrophysics video.',
      mediaType: 'video',
      thumbnailUrl: thumbUrl,
      sourceUrl,
      playbackUrl,
      embedUrl: null,
      publishedAt: data.date_created,
      creator: data.secondary_creator || 'NASA',
      channel: 'NASA Images & Video Library',
      license: {
        name: 'Public Domain (NASA / U.S. Government Work)',
        url: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        commercialUse: true,
        attributionRequired: false,
      },
      metadata: {
        nasaId,
        keywords: data.keywords || [],
        center: data.center,
        collectionHref: item.href,
      },
    },
    'nasa'
  );
}
