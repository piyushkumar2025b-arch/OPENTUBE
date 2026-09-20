import { MediaItem } from '../../types/media';
import { validateMediaItem } from '../../engine/validator';

export function mapArchiveDoc(doc: any, playbackFileUrl?: string | null): MediaItem | null {
  const ident = doc?.identifier;
  if (!ident || typeof ident !== 'string') return null;

  const title = doc.title || ident.replace(/[-_]/g, ' ');
  const thumbUrl = `https://archive.org/services/img/${encodeURIComponent(ident)}`;
  const embedUrl = `https://archive.org/embed/${encodeURIComponent(ident)}`;
  const sourceUrl = `https://archive.org/details/${encodeURIComponent(ident)}`;

  return validateMediaItem(
    {
      id: ident,
      provider: 'archive',
      title,
      description: doc.description || `Public domain and community media preserved in the Internet Archive (${ident}).`,
      mediaType: 'movie',
      thumbnailUrl: thumbUrl,
      sourceUrl,
      playbackUrl: playbackFileUrl || null,
      embedUrl,
      publishedAt: doc.year ? String(doc.year) : undefined,
      creator: doc.creator || 'Internet Archive Contributor',
      channel: 'Internet Archive',
      license: {
        name: doc.licenseurl ? 'Creative Commons / Public Domain' : 'Internet Archive Free Public Access',
        url: doc.licenseurl || 'https://archive.org/about/terms.php',
        commercialUse: Boolean(doc.licenseurl?.includes('publicdomain') || doc.licenseurl?.includes('cc0')),
      },
      metadata: {
        identifier: ident,
        downloads: doc.downloads,
        mediatype: doc.mediatype,
      },
    },
    'archive'
  );
}
