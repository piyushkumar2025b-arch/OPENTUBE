import { ProviderAdapter } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { mapNasaItem } from './mapper';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

async function resolveNasaStream(collectionUrl?: string, timeoutMs = 3000): Promise<string | null> {
  if (!collectionUrl) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(collectionUrl, {
      headers: { 'User-Agent': 'OpenTube/1.0' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const files: string[] = await res.json();
    if (!Array.isArray(files)) return null;

    // Pick medium or orig mp4
    const mediumMp4 = files.find((f) => f.includes('~medium.mp4') || f.includes('~large.mp4'));
    const anyMp4 = files.find((f) => f.endsWith('.mp4'));
    const chosen = mediumMp4 || anyMp4;

    if (chosen) {
      // Ensure https protocol
      return chosen.replace(/^http:/, 'https:');
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class NasaProvider implements ProviderAdapter {
  readonly id = 'nasa';
  readonly name = 'NASA Video Library';
  readonly description = 'Official space mission footage, planetary exploration, astronaut recordings & Hubble/James Webb visualizations';
  readonly requiresApiKey = false;
  readonly latencyClass = 'slow' as const;
  readonly defaultBudgetMs = 1800;

  isConfigured(): boolean {
    return true; // 100% open public access, no key required
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = options.query.trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 12, 25);
    const timeoutMs = options.timeoutMs || 2500;
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=video&page=${page}`;

    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OpenTube/1.0' },
        signal,
      });

      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `NASA API returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const rawItems: any[] = data.collection?.items || [];
      const sliced = rawItems.slice(0, limit);

      // Fast instant stream resolution via CloudFront pattern without multi-roundtrip network blocking
      const items: MediaItem[] = [];
      for (const item of sliced) {
        const dataObj = item?.data?.[0];
        const nasaId = dataObj?.nasa_id;
        let streamUrl: string | null = null;

        if (nasaId) {
          const links: any[] = item.links || [];
          const previewLink = links.find((l) => l.rel === 'preview' || l.render === 'image');
          if (previewLink?.href) {
            streamUrl = previewLink.href.replace(/~(large|orig|thumb|small)\.jpg$/i, '~medium.mp4');
          } else {
            streamUrl = `https://images-assets.nasa.gov/video/${nasaId}/${nasaId}~medium.mp4`;
          }
          if (streamUrl) {
            streamUrl = encodeURI(streamUrl.replace(/^http:\/\//, 'https://'));
          }
        }

        const mapped = mapNasaItem(item, streamUrl);
        if (mapped) items.push(mapped);
      }

      const totalHits = data.collection?.metadata?.total_hits || items.length;

      return {
        items,
        total: totalHits,
        nextPage: page * limit < totalHits ? page + 1 : null,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'NASA API request timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'NASA search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const nasaId = id.replace(/^nasa:/, '');
    const searchUrl = `https://images-api.nasa.gov/search?nasa_id=${encodeURIComponent(nasaId)}`;

    try {
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'OpenTube/1.0' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const rawItem = data.collection?.items?.[0];
      if (!rawItem) return null;

      const directStream = await resolveNasaStream(rawItem.href, 4000);
      return mapNasaItem(rawItem, directStream);
    } catch {
      return null;
    }
  }
}
