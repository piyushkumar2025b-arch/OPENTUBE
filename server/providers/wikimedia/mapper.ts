import { MediaItem } from '../../types/media';
import { validateMediaItem, sanitizeText } from '../../engine/validator';

export function mapWikimediaPage(page: any): MediaItem | null {
  if (!page || !page.pageid) return null;

  const pageId = String(page.pageid);
  const imageInfo = page.imageinfo?.[0] || {};
  const extMeta = imageInfo.extmetadata || {};

  const directUrl = imageInfo.url;
  if (!directUrl || !directUrl.startsWith('http')) return null;

  // Derive readable title
  const rawTitle = page.title || '';
  const cleanTitle = rawTitle.replace(/^File:/i, '').replace(/\.(webm|ogv|mp4|mov)$/i, '').replace(/_/g, ' ');

  const description = sanitizeText(extMeta.ImageDescription?.value) || `Wikimedia Commons video: ${cleanTitle}`;
  const artist = sanitizeText(extMeta.Artist?.value) || 'Wikimedia Contributor';
  const licenseName = extMeta.LicenseShortName?.value || 'Creative Commons';
  const licenseUrl = extMeta.LicenseUrl?.value || 'https://creativecommons.org/licenses/';

  const sourceUrl = imageInfo.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(rawTitle)}`;
  const embedUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(rawTitle.replace(/^File:/i, 'File:'))}`;

  // Prefer web-optimized 480p VP9 transcode (which is 10-100x smaller) over raw multi-gigabyte or unplayable .ogv files
  let playbackUrl = directUrl;
  const baseDirect = directUrl.split('?')[0];
  const lastSlash = baseDirect.lastIndexOf('/');
  if (lastSlash > 0 && baseDirect.includes('/wikipedia/commons/')) {
    const fileName = baseDirect.substring(lastSlash + 1);
    if (fileName.endsWith('.ogv') || fileName.endsWith('.webm')) {
      playbackUrl = `${baseDirect.replace('/wikipedia/commons/', '/wikipedia/commons/transcoded/')}/${fileName}.480p.vp9.webm`;
    }
  }

  return validateMediaItem(
    {
      id: pageId,
      provider: 'wikimedia',
      title: cleanTitle || 'Wikimedia Video',
      description,
      mediaType: 'video',
      thumbnailUrl: imageInfo.thumburl || directUrl,
      sourceUrl,
      playbackUrl,
      embedUrl,
      creator: artist,
      channel: 'Wikimedia Commons',
      license: {
        name: licenseName,
        url: licenseUrl,
        commercialUse: !licenseName.toLowerCase().includes('nc'),
        attributionRequired: licenseName.toLowerCase().includes('by'),
      },
      metadata: {
        pageId,
        mime: imageInfo.mime,
        width: imageInfo.width,
        height: imageInfo.height,
        size: imageInfo.size,
      },
    },
    'wikimedia'
  );
}
