/**
 * Canonical PeerTube Resource Identity Utilities
 * Guarantees consistent ID encoding and decoding across:
 * - Search results
 * - Item details
 * - Playback resolution
 * - Bookmark/Recents storage
 * - Client navigation
 */

export function parsePeerTubeId(id: string): { host: string; uuid: string } {
  let clean = (id || '').trim();

  // Handle direct HTTP/HTTPS URLs
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const url = new URL(clean);
      const host = url.hostname;
      const parts = url.pathname.split('/').filter(Boolean);
      const uuid = parts[parts.length - 1] || clean;
      return { host, uuid };
    } catch {
      // proceed to prefix parsing
    }
  }

  clean = clean.replace(/^peertube:/, '').replace(/^pt-/, '');
  let host = 'peertube.tv';
  let uuid = clean;

  if (clean.includes(':')) {
    const colonIdx = clean.indexOf(':');
    host = clean.slice(0, colonIdx).replace(/^https?:\/\//, '').replace(/\/$/, '');
    uuid = clean.slice(colonIdx + 1);
  }

  return { host, uuid };
}

export function formatPeerTubeId(host: string, uuid: string): string {
  const cleanHost = (host || 'peertube.tv').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `pt-${cleanHost}:${uuid}`;
}
