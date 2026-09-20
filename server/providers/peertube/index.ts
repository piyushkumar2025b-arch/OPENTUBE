/**
 * PeerTube Sepia Search Real API Provider Adapter
 * Queries the decentralized PeerTube video federation via Sepia Search.
 * Delivers real public video streams, direct MP4/HLS streams, and channel details with zero ads.
 */

import { ProviderAdapter } from '../types';
import {
  MediaItem,
  ProviderSearchOptions,
  ProviderSearchResult,
} from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';
import { formatPeerTubeId, parsePeerTubeId } from './identity';

export class PeerTubeProvider implements ProviderAdapter {
  readonly id = 'peertube';
  readonly name = 'PeerTube Open Video';
  readonly description = 'Decentralized open video federation via Sepia Search (direct streaming, no tracking)';
  readonly requiresApiKey = false;
  readonly latencyClass = 'medium' as const;
  readonly defaultBudgetMs = 1200;

  isConfigured(): boolean {
    return true;
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = (options.query || '').trim();
    const limit = Math.min(options.limit || 20, 30);

    if (!query) {
      return { items: [], total: 0, status: 'ok' };
    }

    const { signal, cleanup } = createCombinedSignal(options.timeoutMs || 2500, options.signal);

    try {
      const apiUrl = `https://sepiasearch.org/api/v1/search/videos?search=${encodeURIComponent(query)}&count=${limit}&sort=-match`;

      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'OpenTube/2.0 (FederatedMediaSearch)',
        },
        signal,
      });

      if (!res.ok) {
        return {
          items: [],
          total: 0,
          status: 'error',
          error: `Sepia Search returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const rawData = Array.isArray(data.data) ? data.data : [];

      const items: MediaItem[] = rawData.map((v: any) => {
        const rawHost = (v.channel?.host || v.account?.host || 'peertube.tv').replace(/^https?:\/\//, '');
        const host = `https://${rawHost}`;

        const thumb = v.thumbnailUrl || v.previewUrl || (v.thumbnailPath ? `${host}${v.thumbnailPath}` : null);
        const finalThumb = thumb ? (thumb.startsWith('http') ? thumb : `${host}${thumb.startsWith('/') ? '' : '/'}${thumb}`) : undefined;

        // Ensure embedUrl is always a complete, valid https URL
        let embedUrl: string | null = null;
        if (v.embedUrl && typeof v.embedUrl === 'string') {
          embedUrl = v.embedUrl.startsWith('http') ? v.embedUrl : `https://${v.embedUrl}`;
        } else if (v.embedPath) {
          embedUrl = v.embedPath.startsWith('http') ? v.embedPath : `${host}${v.embedPath.startsWith('/') ? '' : '/'}${v.embedPath}`;
        } else if (v.shortUUID || v.uuid) {
          embedUrl = `${host}/videos/embed/${v.shortUUID || v.uuid}`;
        }

        // Check for direct video streams (files or streamingPlaylists)
        let playbackUrl: string | null = null;
        if (Array.isArray(v.files) && v.files.length > 0) {
          const sortedFiles = [...v.files].sort((a: any, b: any) => (b.resolution?.id || 0) - (a.resolution?.id || 0));
          const directFile = sortedFiles[0].fileUrl || sortedFiles[0].fileDownloadUrl;
          if (directFile) {
            playbackUrl = directFile.startsWith('http') ? directFile : `https://${directFile}`;
          }
        } else if (Array.isArray(v.streamingPlaylists) && v.streamingPlaylists.length > 0) {
          const playlist = v.streamingPlaylists[0].playlistUrl;
          if (playlist) {
            playbackUrl = playlist.startsWith('http') ? playlist : `https://${playlist}`;
          }
        }

        const sourceUrl = v.url || `${host}/videos/watch/${v.uuid || v.id}`;
        const canonicalId = formatPeerTubeId(rawHost, v.uuid || v.id || v.shortUUID);

        return {
          id: canonicalId,
          provider: 'peertube',
          title: v.name || 'PeerTube Video',
          description: (v.description || '').slice(0, 300),
          mediaType: 'video',
          thumbnailUrl: finalThumb,
          sourceUrl,
          playbackUrl,
          embedUrl,
          duration: typeof v.duration === 'number' ? v.duration : 0,
          publishedAt: v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : undefined,
          channel: v.channel?.displayName || v.channel?.name || 'PeerTube Channel',
          creator: v.account?.displayName || v.account?.name || 'Creator',
          license: {
            name: v.licence?.label || 'PeerTube CC / Open License',
            url: 'https://joinpeertube.org/',
            commercialUse: true,
            attributionRequired: true,
          },
          metadata: {
            views: v.views,
            likes: v.likes,
            category: v.category?.label || 'General',
            host: rawHost,
            uuid: v.uuid,
            shortUUID: v.shortUUID,
          },
        };
      });

      return {
        items,
        total: data.total || items.length,
        status: 'ok',
      };
    } catch (err: any) {
      return {
        items: [],
        total: 0,
        status: err.name === 'AbortError' ? 'timeout' : 'error',
        error: err.message || 'PeerTube search request failed',
      };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const { host: rawHost, uuid: videoUuid } = parsePeerTubeId(id);
    const host = `https://${rawHost}`;

    // Direct instance resolution first (fastest)
    try {
      const instRes = await fetch(`${host}/api/v1/videos/${videoUuid}`, {
        headers: { 'User-Agent': 'OpenTube/2.0' },
        signal: AbortSignal.timeout(2000),
      });

      if (instRes.ok) {
        const v = await instRes.json();
        const thumb = v.thumbnailUrl || v.previewUrl || (v.thumbnailPath ? `${host}${v.thumbnailPath}` : null);
        const finalThumb = thumb ? (thumb.startsWith('http') ? thumb : `${host}${thumb.startsWith('/') ? '' : '/'}${thumb}`) : undefined;

        let embedUrl = `${host}/videos/embed/${v.shortUUID || v.uuid || videoUuid}`;
        let directStreamUrl: string | null = null;

        if (Array.isArray(v.files) && v.files.length > 0) {
          const sorted = [...v.files].sort((a: any, b: any) => (b.resolution?.id || 0) - (a.resolution?.id || 0));
          directStreamUrl = sorted[0].fileUrl || sorted[0].fileDownloadUrl || null;
        } else if (Array.isArray(v.streamingPlaylists) && v.streamingPlaylists.length > 0) {
          directStreamUrl = v.streamingPlaylists[0].playlistUrl || null;
        }

        return {
          id: `pt-${rawHost}:${v.uuid || videoUuid}`,
          provider: 'peertube',
          title: v.name || 'PeerTube Video',
          description: v.description || '',
          mediaType: 'video',
          thumbnailUrl: finalThumb,
          sourceUrl: v.url || `${host}/videos/watch/${v.uuid || videoUuid}`,
          playbackUrl: directStreamUrl,
          embedUrl,
          duration: typeof v.duration === 'number' ? v.duration : 0,
          publishedAt: v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : undefined,
          channel: v.channel?.displayName || v.channel?.name || 'PeerTube Channel',
          creator: v.account?.displayName || v.account?.name || 'Creator',
          license: {
            name: v.licence?.label || 'PeerTube CC / Open License',
            url: 'https://joinpeertube.org/',
            commercialUse: true,
            attributionRequired: true,
          },
          metadata: {
            views: v.views,
            likes: v.likes,
            category: v.category?.label || 'General',
            host: rawHost,
            uuid: v.uuid || videoUuid,
          },
        };
      }
    } catch {
      // Direct fetch failed, fallback to Sepia Search
    }

    try {
      const res = await fetch(`https://sepiasearch.org/api/v1/search/videos?search=${encodeURIComponent(videoUuid)}&count=1`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const v = data.data[0];
          const hostPart = (v.channel?.host || v.account?.host || 'peertube.tv').replace(/^https?:\/\//, '');
          const instHost = `https://${hostPart}`;

          let embedUrl = v.embedUrl || (v.embedPath ? (v.embedPath.startsWith('http') ? v.embedPath : `${instHost}${v.embedPath.startsWith('/') ? '' : '/'}${v.embedPath}`) : `${instHost}/videos/embed/${v.shortUUID || v.uuid}`);
          if (!embedUrl.startsWith('http')) embedUrl = `https://${embedUrl}`;

          const thumb = v.thumbnailUrl || v.previewUrl;
          const finalThumb = thumb ? (thumb.startsWith('http') ? thumb : `${instHost}${thumb.startsWith('/') ? '' : '/'}${thumb}`) : undefined;

          return {
            id: `pt-${hostPart}:${v.uuid || v.id || videoUuid}`,
            provider: 'peertube',
            title: v.name || 'PeerTube Video',
            description: v.description || '',
            mediaType: 'video',
            thumbnailUrl: finalThumb,
            sourceUrl: v.url || `${instHost}/videos/watch/${v.uuid || v.id}`,
            playbackUrl: null,
            embedUrl,
            duration: typeof v.duration === 'number' ? v.duration : 0,
            publishedAt: v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : undefined,
            channel: v.channel?.displayName || 'PeerTube Channel',
            creator: v.account?.displayName || 'Creator',
            license: {
              name: v.licence?.label || 'Creative Commons',
              url: 'https://joinpeertube.org/',
            },
            metadata: {
              views: v.views,
              host: hostPart,
              uuid: v.uuid,
            },
          };
        }
      }
    } catch {
      // Ignored
    }
    return null;
  }
}

export const peerTubeProvider = new PeerTubeProvider();
