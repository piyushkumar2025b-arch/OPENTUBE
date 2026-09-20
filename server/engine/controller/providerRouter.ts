/**
 * Provider Relevance Router
 * Intelligently routes queries to optimal providers based on query intent and provider capabilities.
 * Filters out unconfigured, circuit-broken, rate-exhausted, or quota-exhausted providers before enqueueing.
 * Groups selected providers into latency tiers (FAST, MEDIUM, SLOW) for progressive scheduling.
 */

import { ProviderAdapter } from '../../providers/types';
import { providerRegistry } from '../../providers/registry';
import { getCircuitBreaker } from './circuitBreaker';
import { getRateLimiter } from './rateLimiter';

export interface RoutedProviders {
  fast: ProviderAdapter[];
  medium: ProviderAdapter[];
  slow: ProviderAdapter[];
  allSelected: ProviderAdapter[];
}

// Intent Regex Classifications
const EDUCATION_TECH_REGEX = /\b(machine learning|lecture|tutorial|course|cs|python|coding|programming|algorithm|ai|deep learning|data science|math|physics|ted|talk|conference|tech|guide)\b/i;
const SPACE_REGEX = /\b(space|nasa|mars|rover|moon|apollo|orbit|hubble|webb|galaxy|planet|iss|astronomy|telescope|nebula|rocket|launch|cosmos)\b/i;
const STOCK_REGEX = /\b(stock|footage|b-roll|b roll|4k footage|hd clip|free video|sunset video|nature background|timelapse|aerial|drone|cinematic stock|clip)\b/i;
const RADIO_AUDIO_REGEX = /\b(radio|fm|am|lofi|lo-fi|station|broadcast|tunein|stream|jazz radio|chillhop|bbc|npr|talk radio|podcast|audio|sound effect|sfx|cc audio)\b/i;
const LIVE_TV_REGEX = /\b(tv|news|live|euronews|bloomberg|france 24|dw|al jazeera|sky news|stream tv|channel|broadcast|bulletin)\b/i;
const HISTORICAL_REGEX = /\b(vintage|archive|documentary|silent film|classic movie|history|historical|1920s|1930s|1940s|1950s|public domain film|noir|retrospective|ancient)\b/i;
const NATURE_SCIENCE_REGEX = /\b(wildlife|animal|biology|ocean|forest|planet earth|ecology|science|experiment|discovery)\b/i;

export function selectProviders(
  query: string,
  source?: string,
  mediaType?: 'video' | 'audio' | 'all'
): RoutedProviders {
  const normQuery = (query || '').trim().toLowerCase();
  const allProviders = providerRegistry.getAll();

  // 1. Explicit single source override (e.g. source='youtube', source='peertube')
  if (source && source !== 'all') {
    const single = providerRegistry.get(source.toLowerCase());
    if (single && isProviderEligible(single)) {
      return categorize([single]);
    }
    return { fast: [], medium: [], slow: [], allSelected: [] };
  }

  // Filter only eligible providers (configured, not quota exhausted, healthy/degraded circuit, rate budget available)
  const eligible = allProviders.filter(isProviderEligible);
  const eligibleMap = new Map(eligible.map((p) => [p.id, p]));

  // Helper to pick providers in specific order
  const pick = (ids: string[]): ProviderAdapter[] => {
    return ids.map((id) => eligibleMap.get(id)).filter(Boolean) as ProviderAdapter[];
  };

  // 2. Specialized Intent Routing

  // A. Educational / Lecture / Tech Intent (e.g. "machine learning lecture")
  // Target: YouTube, Vimeo, Internet Archive, PeerTube, MIT OCW, Computer Chronicles, TedTalks, Harvard Film, Smithsonian
  if (EDUCATION_TECH_REGEX.test(normQuery)) {
    const selected = pick(['youtube', 'mitocw', 'tedtalks', 'computerchronicles', 'harvardfilm', 'smithsonian', 'vimeo', 'archive', 'peertube', 'wikimedia', 'loc', 'dvids']);
    if (selected.length > 0) return categorize(selected);
  }

  // B. Space Intent (e.g. "mars rover")
  // Target: YouTube, NASA, NASA SVS, Internet Archive, Wikimedia, Smithsonian
  if (SPACE_REGEX.test(normQuery)) {
    const selected = pick(['youtube', 'nasa', 'nasasvs', 'smithsonian', 'archive', 'wikimedia', 'peertube', 'dvids']);
    if (selected.length > 0) return categorize(selected);
  }

  // C. Stock Footage Intent (e.g. "stock sunset video")
  // Target: Pexels, Pixabay, Coverr, YouTube, Vimeo
  if (STOCK_REGEX.test(normQuery)) {
    const selected = pick(['pexels', 'pixabay', 'coverr', 'youtube', 'vimeo', 'peertube', 'openmovie']);
    if (selected.length > 0) return categorize(selected);
  }

  // D. Historical / Documentary Intent
  // Target: Internet Archive, Prelinger, ArchiveWatch, Public Film, Feature Films, Silent Films, SciFi Horror, Harvard Film, LOC, Wikimedia, PeerTube, YouTube
  if (HISTORICAL_REGEX.test(normQuery)) {
    const selected = pick(['archive', 'publicfilm', 'prelinger', 'archivewatch', 'harvardfilm', 'featurefilms', 'silentfilms', 'scifihorror', 'smithsonian', 'loc', 'tvnews', 'wikimedia', 'peertube', 'youtube', 'vimeo']);
    if (selected.length > 0) return categorize(selected);
  }

  // E. Radio & Audio Intent
  // Target: Radio, SomaFM, SoundFX, Audius, iTunes, FreeMusic, OTRadio, Openverse, PeerTube
  if (RADIO_AUDIO_REGEX.test(normQuery) || mediaType === 'audio') {
    const selected = pick(['radio', 'somafm', 'soundfx', 'audius', 'itunes', 'freemusic', 'otradio', 'openverse', 'peertube', 'youtube']);
    if (selected.length > 0) return categorize(selected);
  }

  // F. Live TV & News Intent
  // Target: Live TV, TV News Archive, PeerTube, YouTube
  if (LIVE_TV_REGEX.test(normQuery)) {
    const selected = pick(['livetv', 'tvnews', 'peertube', 'youtube']);
    if (selected.length > 0) return categorize(selected);
  }

  // G. Nature & Wildlife
  if (NATURE_SCIENCE_REGEX.test(normQuery)) {
    const selected = pick(['naturevids', 'youtube', 'vimeo', 'pexels', 'pixabay', 'archive', 'nasasvs', 'peertube', 'coverr']);
    if (selected.length > 0) return categorize(selected);
  }

  // 3. General Multi-Provider Search
  // Wave order: Fast high-capacity providers first, followed by rich archival, stock, open cinema, education, and audio libraries
  const generalOrder = [
    'youtube',
    'dailymotion',
    'openmovie',
    'publicfilm',
    'peertube',
    'vimeo',
    'itunes',
    'archivewatch',
    'coverr',
    'tedtalks',
    'retrogaming',
    'smithsonian',
    'harvardfilm',
    'soundfx',
    'pexels',
    'pixabay',
    'archive',
    'featurefilms',
    'naturevids',
    'mitocw',
    'classiccartoons',
    'scifihorror',
    'silentfilms',
    'prelinger',
    'computerchronicles',
    'wikimedia',
    'nasa',
    'nasasvs',
    'tvnews',
    'audius',
    'somafm',
    'radio',
    'freemusic',
    'openverse',
    'livetv',
    'loc',
    'dvids',
    'otradio',
    'sportsarchive',
    'animation',
  ];
  const generalSelected = pick(generalOrder);
  return categorize(generalSelected.length > 0 ? generalSelected : eligible);
}

/**
 * Checks if provider is eligible to receive queries:
 * - Must be configured (has required keys/tokens)
 * - Must NOT be quota exhausted or disabled (Requirement 25)
 * - Circuit breaker must be closed or half-open
 * - Rate limiter must have token capacity
 */
function isProviderEligible(provider: ProviderAdapter): boolean {
  // A. Configuration check
  if (!provider.isConfigured()) {
    return false;
  }

  // B. Health / Quota status check
  const status = provider.getStatus?.();
  if (status === 'unconfigured' || status === 'quota_exhausted' || status === 'disabled') {
    return false;
  }

  // C. Circuit breaker check
  const cb = getCircuitBreaker(provider.id);
  if (!cb.isAllowed()) {
    return false;
  }

  // D. Rate limiter check (verify capacity without consuming yet)
  const limiter = getRateLimiter(provider.id);
  if (!limiter.canConsume(1)) {
    return false;
  }

  return true;
}

/**
 * Categorize into latency waves:
 * Wave 1: Fast providers (YouTube, PeerTube, LiveTV)
 * Wave 2: Medium providers (Vimeo, Archive, Pexels, Pixabay, Wikimedia, Radio)
 * Wave 3: Slow providers (NASA, Openverse)
 */
function categorize(providers: ProviderAdapter[]): RoutedProviders {
  const fast: ProviderAdapter[] = [];
  const medium: ProviderAdapter[] = [];
  const slow: ProviderAdapter[] = [];

  for (const p of providers) {
    const latencyClass =
      p.latencyClass ||
      (p.id === 'youtube' || p.id === 'peertube' || p.id === 'livetv'
        ? 'fast'
        : p.id === 'nasa' || p.id === 'openverse'
        ? 'slow'
        : 'medium');

    if (latencyClass === 'fast') {
      fast.push(p);
    } else if (latencyClass === 'slow') {
      slow.push(p);
    } else {
      medium.push(p);
    }
  }

  const allSelected = [...fast, ...medium, ...slow];
  return { fast, medium, slow, allSelected };
}
