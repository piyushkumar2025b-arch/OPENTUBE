import { MediaItem } from '../types/media';

export function sanitizeText(text?: any): string {
  if (text === null || text === undefined) return '';
  if (Array.isArray(text)) {
    return text.map((t) => sanitizeText(t)).filter(Boolean).join(' ');
  }
  const str = typeof text === 'string' ? text : String(text);
  return str
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function isValidHttpUrl(str?: string | null): boolean {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateMediaItem(item: Partial<MediaItem>, providerId: string): MediaItem | null {
  if (!item.id || typeof item.id !== 'string') return null;
  if (!item.title || typeof item.title !== 'string') return null;
  let sourceUrl = item.sourceUrl;
  if (sourceUrl && !sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
    sourceUrl = `https://${sourceUrl}`;
  }
  if (!sourceUrl || !isValidHttpUrl(sourceUrl)) return null;

  const title = sanitizeText(item.title);
  if (!title) return null;

  const description = sanitizeText(item.description);

  // Validate playbackUrl - must be a valid http(s) URL or local path
  let playbackUrl: string | null = null;
  if (item.playbackUrl) {
    let cleanPlayback = item.playbackUrl;
    if (!cleanPlayback.startsWith('http://') && !cleanPlayback.startsWith('https://') && !cleanPlayback.startsWith('/')) {
      cleanPlayback = `https://${cleanPlayback}`;
    }
    if (isValidHttpUrl(cleanPlayback) || cleanPlayback.startsWith('/videos/')) {
      playbackUrl = cleanPlayback;
    }
  }

  // Validate embedUrl - must be a valid http(s) URL
  let embedUrl: string | null = null;
  if (item.embedUrl) {
    let cleanEmbed = item.embedUrl;
    if (!cleanEmbed.startsWith('http://') && !cleanEmbed.startsWith('https://')) {
      cleanEmbed = `https://${cleanEmbed}`;
    }
    if (isValidHttpUrl(cleanEmbed)) {
      embedUrl = cleanEmbed;
    }
  }

  // Validate thumbnailUrl
  let thumbnailUrl: string | undefined = undefined;
  if (item.thumbnailUrl) {
    let cleanThumb = item.thumbnailUrl;
    if (!cleanThumb.startsWith('http://') && !cleanThumb.startsWith('https://') && !cleanThumb.startsWith('/')) {
      cleanThumb = `https://${cleanThumb}`;
    }
    if (isValidHttpUrl(cleanThumb) || cleanThumb.startsWith('/')) {
      thumbnailUrl = cleanThumb;
    }
  }

  const rawProviderId = item.providerId || item.id.replace(new RegExp(`^${providerId}:`), '');
  const providerHost =
    item.providerHost || (item.metadata?.providerHost as string | undefined) || undefined;

  return {
    id: item.id.startsWith(`${providerId}:`) ? item.id : `${providerId}:${item.id}`,
    provider: providerId,
    providerId: rawProviderId,
    providerHost,
    title,
    description: description || undefined,
    mediaType: item.mediaType || 'video',
    thumbnailUrl,
    sourceUrl: item.sourceUrl,
    playbackUrl,
    embedUrl,
    duration: typeof item.duration === 'number' && item.duration > 0 ? Math.round(item.duration) : undefined,
    publishedAt: item.publishedAt || undefined,
    creator: sanitizeText(item.creator) || undefined,
    channel: sanitizeText(item.channel) || undefined,
    license: item.license || undefined,
    metadata: item.metadata || {},
  };
}
