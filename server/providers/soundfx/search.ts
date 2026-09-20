import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { createCombinedSignal } from '../../engine/controller/signalUtils';

function cleanDescription(desc: any): string {
  if (typeof desc === 'string') return desc.replace(/<[^>]+>/g, '').trim();
  if (Array.isArray(desc)) return desc.map((d: any) => String(d).replace(/<[^>]+>/g, '')).join(' ').trim();
  return '';
}

export class SoundEffectsProvider implements ProviderAdapter {
  readonly id = 'soundfx';
  readonly name = 'BBC & Open Sound Effects';
  readonly description = 'High-fidelity audio sound effects, Foley recordings, ambient soundscapes, field recordings and sound design for video creators';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 1500;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: true,
    hls: false,
    embed: true,
  };

  isConfigured(): boolean {
    return true;
  }

  getStatus(): 'healthy' {
    return 'healthy';
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const rawQuery = (options.query || '').trim();
    if (!rawQuery) return { items: [], status: 'ok', total: 0 };

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(options.limit || 20, 1), 50);
    const timeoutMs = options.timeoutMs || 2500;
    const { signal, cleanup } = createCombinedSignal(timeoutMs, options.signal);

    try {
      const cleanTokens = rawQuery.replace(/[:"()]/g, ' ').split(/\s+/).filter(Boolean);
      const queryFilter = cleanTokens.length > 0 ? `(${cleanTokens.join(' AND ')})` : '*:*';
      const solrQuery = `collection:(sound_effects OR bbc_sound_effects OR audio_foley OR field_recordings) AND mediatype:(audio) AND ${queryFilter}`;

      const params = new URLSearchParams({
        q: solrQuery,
        fl: 'identifier,title,creator,description,downloads,year,runtime',
        rows: String(limit),
        page: String(page),
        output: 'json',
      });

      const res = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpenTube/2.0)' },
        signal,
      });

      if (!res.ok) {
        return { items: [], status: 'error', error: `Archive returned HTTP ${res.status}` };
      }

      const data = await res.json();
      const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
      const total = Number(data.response?.numFound) || docs.length;

      const items: MediaItem[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const title = doc.title || id;
        const year = doc.year ? ` (${doc.year})` : '';
        const descClean = cleanDescription(doc.description);

        return {
          id: `soundfx:${id}`,
          provider: 'soundfx',
          title: `[SFX] ${title}`,
          description: descClean ? descClean.slice(0, 260) : `High-fidelity audio sound effect and Foley sound recording${year}.`,
          mediaType: 'audio' as const,
          sourceUrl: `https://archive.org/details/${id}`,
          thumbnailUrl: `https://archive.org/services/img/${id}`,
          playbackUrl: `https://archive.org/download/${id}/${id}.mp3`,
          embedUrl: `https://archive.org/embed/${id}`,
          channel: doc.creator || 'Sound Effects Library',
          publishedAt: doc.year ? `${doc.year}-01-01` : new Date().toISOString(),
          playerType: 'audio',
          license: { name: 'Creative Commons / Educational Audio', commercialUse: true, attributionRequired: true },
          metadata: {
            downloads: Number(doc.downloads) || 0,
            tags: ['Sound FX', 'Foley', 'Audio', 'Sound Design', 'Field Recording'],
          },
        };
      });

      return { items, status: 'ok', total, nextPage: page * limit < total ? page + 1 : null };
    } catch (err: any) {
      return { items: [], status: err.name === 'AbortError' ? 'timeout' : 'error', error: err.message };
    } finally {
      cleanup();
    }
  }

  async getVideo(id: string): Promise<MediaItem | null> {
    const rawId = id.startsWith('soundfx:') ? id.replace('soundfx:', '') : id;
    return {
      id: `soundfx:${rawId}`,
      provider: 'soundfx',
      title: rawId,
      description: 'Audio sound effect recording.',
      mediaType: 'audio',
      sourceUrl: `https://archive.org/details/${rawId}`,
      thumbnailUrl: `https://archive.org/services/img/${rawId}`,
      playbackUrl: `https://archive.org/download/${rawId}/${rawId}.mp3`,
      embedUrl: `https://archive.org/embed/${rawId}`,
      channel: 'Sound Effects Vault',
      playerType: 'audio',
      metadata: {},
    };
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const rawId = id.startsWith('soundfx:') ? id.replace('soundfx:', '') : id;
    const directUrl = `https://archive.org/download/${rawId}/${rawId}.mp3`;
    return {
      id,
      provider: 'soundfx',
      candidates: [{ kind: 'direct', url: directUrl, mimeType: 'audio/mpeg' }],
      selectedCandidateIndex: 0,
      hasDirectStream: true,
      playbackUrl: directUrl,
      embedUrl: `https://archive.org/embed/${rawId}`,
      sourceUrl: `https://archive.org/details/${rawId}`,
    };
  }
}
