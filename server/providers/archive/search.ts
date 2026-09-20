import { ProviderAdapter } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { mapArchiveDoc } from './mapper';
import { fetchArchivePlayableUrl } from './metadata';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

export class ArchiveProvider implements ProviderAdapter {
  readonly id = 'archive';
  readonly name = 'Internet Archive';
  readonly description = 'Millions of free historical movies, public-domain cinema, newsreels, and archival media';
  readonly requiresApiKey = false;
  readonly latencyClass = 'medium' as const;
  readonly defaultBudgetMs = 1200;

  isConfigured(): boolean {
    return true; // Public open access, no key required
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const query = options.query.trim();
    if (!query) {
      return { items: [], status: 'ok', total: 0 };
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 12, 30);
    const timeoutMs = options.timeoutMs || 2500;

    // Search specifically in video/movie collections
    const cleanQuery = query.replace(/[^\w\s-]/g, ' ').trim();
    const advancedQuery = cleanQuery
      ? `${cleanQuery} AND mediatype:movies`
      : 'mediatype:movies';

    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(advancedQuery)}&fl[]=identifier,title,description,year,creator,licenseurl,mediatype,downloads&rows=${limit}&page=${page}&output=json`;

    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OpenTube/1.0 (https://github.com/opentube)' },
        signal,
      });

      if (!res.ok) {
        return {
          items: [],
          status: 'error',
          error: `Internet Archive returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const docs: any[] = data.response?.docs || [];
      const total = data.response?.numFound || docs.length;

      // Map docs with real embedUrls and metadata
      const items: MediaItem[] = [];
      for (const doc of docs) {
        const item = mapArchiveDoc(doc);
        if (item) items.push(item);
      }

      return {
        items,
        total,
        nextPage: page * limit < total ? page + 1 : null,
        status: 'ok',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { items: [], status: 'timeout', error: 'Internet Archive request timed out' };
      }
      return { items: [], status: 'error', error: err.message || 'Internet Archive search failed' };
    } finally {
      cleanup();
    }
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^archive:/, '');
    const directPlayback = await fetchArchivePlayableUrl(cleanId);

    const metaUrl = `https://archive.org/metadata/${encodeURIComponent(cleanId)}`;
    try {
      const res = await fetch(metaUrl, {
        headers: { 'User-Agent': 'OpenTube/1.0' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data.metadata || {};
      return mapArchiveDoc(
        {
          identifier: cleanId,
          title: meta.title,
          description: meta.description,
          year: meta.year || meta.date,
          creator: meta.creator,
          licenseurl: meta.licenseurl,
          mediatype: meta.mediatype,
        },
        directPlayback
      );
    } catch {
      return null;
    }
  }
}
