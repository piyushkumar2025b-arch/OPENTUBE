/**
 * Radio Browser Real API Provider Adapter
 * Queries the community-driven Radio Browser database containing 40,000+ live stations worldwide.
 * Delivers direct live streaming URLs (MP3/AAC), station logos, genre tags, and bitrate.
 */

import { ProviderAdapter } from '../types';
import {
  MediaItem,
  ProviderSearchOptions,
  ProviderSearchResult,
} from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class RadioProvider implements ProviderAdapter {
  readonly id = 'radio';
  readonly name = 'Live Radio Stations';
  readonly description = 'Worldwide live radio stations directory powered by Radio Browser (40,000+ stations)';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 800;

  isConfigured(): boolean {
    return true;
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = (options.query || '').trim();
    const limit = options.limit || 20;
    const timeoutMs = options.timeoutMs || 2000;

    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      // 1. Query Radio Browser Public API
      const searchParam = query ? `name=${encodeURIComponent(query)}` : 'order=votes&reverse=true';
      const apiUrl = `https://de1.api.radio-browser.info/json/stations/search?${searchParam}&limit=${limit}&hidebroken=true`;

      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'OpenTube/2.0 (RealOpenMediaPlatform)',
        },
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const validStations = data.filter((s: any) => Boolean(s.stationuuid && (s.url_resolved || s.url)));
          const items: MediaItem[] = validStations.map((station: any) => {
            const logo =
              (typeof station.favicon === 'string' && station.favicon.startsWith('http') && station.favicon) || undefined;

            return {
              id: `rb-${station.stationuuid}`,
              provider: 'radio',
              title: `${station.name || 'Live Radio'} [RADIO]`,
              description: `${station.tags || 'Live Broadcast'} • ${station.country || 'Global'} • ${station.codec || 'MP3'} ${station.bitrate || 128}kbps`,
              mediaType: 'audio',
              thumbnailUrl: logo,
              sourceUrl: station.homepage || station.url_resolved || station.url,
              playbackUrl: station.url_resolved || station.url,
              embedUrl: null,
              duration: 0, // Live stream
              creator: station.country || 'Global Radio',
              channel: station.tags ? station.tags.split(',')[0] : 'Music',
              license: {
                name: 'Radio Browser Public Audio Stream',
                url: 'https://www.radio-browser.info/',
                commercialUse: false,
                attributionRequired: false,
              },
              metadata: {
                isLive: true,
                bitrate: station.bitrate,
                codec: station.codec,
                country: station.country,
                tags: station.tags,
                streamType: 'audio_stream',
              },
            };
          });

          return {
            items,
            total: items.length,
            status: 'ok',
          };
        }
        return { items: [], total: 0, status: 'ok' };
      }

      return {
        items: [],
        total: 0,
        status: 'error',
        error: `Radio Browser returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        items: [],
        total: 0,
        status: err.name === 'AbortError' ? 'timeout' : 'error',
        error: err.message || 'Radio Browser network request failed',
      };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanUuid = id.replace(/^rb-/, '');
    try {
      const res = await fetch(`https://de1.api.radio-browser.info/json/stations/byuuid/${encodeURIComponent(cleanUuid)}`, {
        headers: { 'User-Agent': 'OpenTube/2.0' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const station = data[0];
          return {
            id: `rb-${station.stationuuid}`,
            provider: 'radio',
            title: `${station.name || 'Live Radio'} [RADIO]`,
            description: `${station.tags || 'Live Broadcast'} • ${station.country || 'Global'}`,
            mediaType: 'audio',
            thumbnailUrl: station.favicon?.startsWith('http') ? station.favicon : undefined,
            sourceUrl: station.homepage || station.url_resolved || station.url,
            playbackUrl: station.url_resolved || station.url,
            embedUrl: null,
            duration: 0,
            channel: station.tags ? station.tags.split(',')[0] : 'Music',
            creator: station.country,
            metadata: { isLive: true, bitrate: station.bitrate, codec: station.codec },
          };
        }
      }
    } catch {
      // Ignored
    }
    return null;
  }
}

export const radioProvider = new RadioProvider();
