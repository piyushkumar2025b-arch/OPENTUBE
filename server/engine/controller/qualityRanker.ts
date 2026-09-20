/**
 * Multi-Signal Quality Ranker and Deduplicator
 * Algorithms:
 *  - Jaccard Token Overlap Similarity (Word level N-grams)
 *  - Levenshtein Distance on Normalized Strings
 *  - Playback Quality Scoring (Direct HLS/MP4 > High Bitrate Embed > Audio Stem)
 *  - Provider Diversity Interleaving
 */

import { MediaItem } from '../../types/media';

/**
 * Parses publishedAt date strings or relative strings into an estimated Unix timestamp (ms).
 * Handles ISO strings ("2024-03-12T..."), relative texts ("2 days ago", "3 months ago", "1 year ago"),
 * and year strings ("2023").
 */
export function parsePublishedTimestamp(publishedAt?: string): number | null {
  if (!publishedAt || typeof publishedAt !== 'string') return null;
  const str = publishedAt.trim().toLowerCase();
  if (!str) return null;

  // 1. Direct standard Date parsing (e.g. ISO 8601, RFC2822)
  const parsedDirect = Date.parse(str);
  if (!isNaN(parsedDirect) && parsedDirect > 0) {
    return parsedDirect;
  }

  // 2. Relative time parsing (e.g. "3 hours ago", "2 days ago", "1 month ago", "4 years ago")
  const relativeMatch = str.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (relativeMatch) {
    const val = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const now = Date.now();
    const multipliers: Record<string, number> = {
      second: 1000,
      minute: 60 * 1000,
      hour: 3600 * 1000,
      day: 86400 * 1000,
      week: 7 * 86400 * 1000,
      month: 30 * 86400 * 1000,
      year: 365 * 86400 * 1000,
    };
    const mult = multipliers[unit] || (86400 * 1000);
    return Math.max(0, now - val * mult);
  }

  // 3. Year-only strings e.g. "2024", "1999"
  const yearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return new Date(year, 0, 1).getTime();
  }

  return null;
}

/**
 * Computes a recency score bonus/penalty based on published timestamp:
 * - Fresh (<= 30 days): +35 points
 * - Recent (<= 90 days): +25 points
 * - Within 1 year: +15 points
 * - 1 to 2 years: +5 points
 * - 2 to 5 years: -5 points
 * - 5 to 10 years: -15 points
 * - Over 10 years old: -25 points
 */
export function calculateRecencyScore(publishedAt?: string): number {
  const ts = parsePublishedTimestamp(publishedAt);
  if (!ts) return 0; // Neutral if unknown

  const now = Date.now();
  const ageMs = now - ts;
  if (ageMs < 0) return 35; // Future / just published

  const ONE_DAY = 86400 * 1000;
  const daysOld = ageMs / ONE_DAY;

  if (daysOld <= 30) return 35;       // Last 30 days
  if (daysOld <= 90) return 25;       // Last 3 months
  if (daysOld <= 365) return 15;      // Last 1 year
  if (daysOld <= 730) return 5;       // 1 - 2 years
  if (daysOld <= 1825) return -5;     // 2 - 5 years
  if (daysOld <= 3650) return -15;    // 5 - 10 years
  return -25;                         // Over 10 years old (vintage/old archive)
}

function normalizeTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTokens(str: string): Set<string> {
  const tokens = normalizeTitle(str)
    .split(' ')
    .filter((t) => t.length > 2);
  return new Set(tokens);
}

/**
 * Computes Jaccard Similarity between two sets of tokens.
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes Levenshtein Distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }

  return matrix[bn][an];
}

/**
 * Detects whether itemB is a near-duplicate of itemA
 */
function isDuplicate(itemA: MediaItem, itemB: MediaItem): boolean {
  if (itemA.id === itemB.id && itemA.provider === itemB.provider) return true;

  const normA = normalizeTitle(itemA.title);
  const normB = normalizeTitle(itemB.title);

  // Exact normalized match
  if (normA.length > 5 && normA === normB) return true;

  // Jaccard token overlap
  const tokensA = getTokens(itemA.title);
  const tokensB = getTokens(itemB.title);
  const jaccard = jaccardSimilarity(tokensA, tokensB);

  if (jaccard >= 0.82) return true;

  // For shorter titles, test Levenshtein similarity ratio
  if (normA.length > 10 && normB.length > 10) {
    const maxLen = Math.max(normA.length, normB.length);
    const dist = levenshteinDistance(normA, normB);
    const similarity = 1 - dist / maxLen;
    if (similarity > 0.88) return true;
  }

  return false;
}

/**
 * Calculates a multi-factor score for an item
 */
function calculateQualityScore(item: MediaItem, query: string): number {
  let score = 50;

  // 1. Playback capability signal
  if (item.playbackUrl) {
    const pUrl = item.playbackUrl.toLowerCase();
    if (pUrl.includes('.m3u8')) score += 35; // HLS live stream
    else if (pUrl.includes('.mp4') || pUrl.includes('~medium.mp4')) score += 35; // Direct fast MP4 video file
    else if (pUrl.includes('.webm') && (pUrl.includes('480p') || pUrl.includes('360p'))) score += 30; // Lightweight transcode WebM
    else if (pUrl.endsWith('.ogv') || pUrl.includes('.ogv')) score -= 25; // OGV has poor browser support, deprioritize
    else score += 15;
  } else if (item.embedUrl) {
    score += 25; // Interactive responsive embed player
  }

  // 2. Thumbnail presence
  if (item.thumbnailUrl && item.thumbnailUrl.startsWith('http')) {
    score += 10;
  }

  // 3. Query relevance & Exact/Strict Matching
  const cleanQuery = query.trim().toLowerCase();
  const titleLower = (item.title || '').toLowerCase();
  const descLower = (item.description || '').toLowerCase();

  const queryTokens = getTokens(cleanQuery);
  const titleTokens = getTokens(item.title);
  const descTokens = getTokens(item.description || '');

  if (cleanQuery && cleanQuery !== 'trending') {
    // Exact full query match inside title gets huge priority
    if (titleLower.includes(cleanQuery)) {
      score += 70;
      if (titleLower.startsWith(cleanQuery)) {
        score += 20; // Leading exact match
      }
    } else if (descLower.includes(cleanQuery)) {
      score += 25;
    }

    // Token coverage scoring
    let titleMatches = 0;
    let descMatches = 0;
    for (const token of queryTokens) {
      if (titleTokens.has(token)) {
        titleMatches++;
      } else if (titleLower.includes(token)) {
        titleMatches += 0.8;
      } else if (descTokens.has(token)) {
        descMatches += 0.4;
      }
    }

    if (queryTokens.size > 0) {
      const matchRatio = titleMatches / queryTokens.size;
      // High token coverage boost
      score += Math.min(60, matchRatio * 60);

      // Full token match bonus
      if (titleMatches >= queryTokens.size) {
        score += 30;
      } else if (matchRatio < 0.2 && !titleLower.includes(cleanQuery)) {
        // Significant penalty for irrelevant/off-topic items when a specific search was queried
        score -= 25;
      }
    }
  }

  // 4. Metadata richness
  if (item.duration && item.duration > 0) score += 5;
  if (item.creator || item.channel) score += 5;
  if (item.license?.commercialUse) score += 5;

  // 5. Recency / Freshness factor
  // Boosts recent videos (published within last days/months/year) and deprioritizes stale/decade-old media
  const recencyBoost = calculateRecencyScore(item.publishedAt);
  score += recencyBoost;

  return score;
}

/**
 * Deduplicates, scores, and interleaves items for provider diversity.
 * Optimized for O(N) performance using canonical ID and exact normalized title hashes first,
 * avoiding expensive O(N^2) Levenshtein calculations on search hot paths.
 */
export function rankAndDeduplicate(items: MediaItem[], query = ''): MediaItem[] {
  if (!items || items.length === 0) return [];

  // Step 1: O(1) Primary Deduplication by provider + providerId
  const idMap = new Map<string, MediaItem>();
  for (const item of items) {
    const pId = item.providerId || item.id;
    const canonicalKey = `${item.provider}:${pId}`;
    const existing = idMap.get(canonicalKey);
    if (!existing) {
      idMap.set(canonicalKey, item);
    } else if (!existing.playbackUrl && item.playbackUrl) {
      // Favor item with direct playback URL
      idMap.set(canonicalKey, item);
    }
  }

  // Step 2: Secondary Deduplication by Canonical Source URL
  const urlMap = new Map<string, MediaItem>();
  for (const item of idMap.values()) {
    const rawUrl = item.sourceUrl?.toLowerCase().replace(/\/$/, '') || '';
    if (rawUrl) {
      const existing = urlMap.get(rawUrl);
      if (!existing) {
        urlMap.set(rawUrl, item);
      } else if (!existing.playbackUrl && item.playbackUrl) {
        urlMap.set(rawUrl, item);
      }
    } else {
      urlMap.set(`${item.provider}:${item.id}`, item);
    }
  }

  // Step 3: Exact Normalized Title Deduplication
  const titleMap = new Map<string, MediaItem>();
  for (const item of urlMap.values()) {
    const norm = normalizeTitle(item.title);
    if (norm.length > 6) {
      const existing = titleMap.get(norm);
      if (!existing) {
        titleMap.set(norm, item);
      } else if (!existing.playbackUrl && item.playbackUrl) {
        titleMap.set(norm, item);
      }
    } else {
      // Very short titles are indexed uniquely by ID
      titleMap.set(`${item.id}:${item.title}`, item);
    }
  }

  // Step 3: Fast Jaccard Token deduplication on candidate pool (only if small, <= 50)
  const candidates = Array.from(titleMap.values());
  const uniqueItems: MediaItem[] = [];

  if (candidates.length <= 50) {
    for (const item of candidates) {
      let dup = false;
      const tokens = getTokens(item.title);
      for (const kept of uniqueItems) {
        const keptTokens = getTokens(kept.title);
        const jaccard = jaccardSimilarity(tokens, keptTokens);
        if (jaccard >= 0.85) {
          dup = true;
          if (!kept.playbackUrl && item.playbackUrl) {
            const idx = uniqueItems.indexOf(kept);
            uniqueItems[idx] = item;
          }
          break;
        }
      }
      if (!dup) {
        uniqueItems.push(item);
      }
    }
  } else {
    // For large result lists, fast hash deduplication is already applied
    uniqueItems.push(...candidates);
  }

  // Score step
  const scored = uniqueItems.map((item) => ({
    item,
    score: calculateQualityScore(item, query),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // If query is specific and we have high-relevance matches (score >= 110), keep top exact matches
  // strictly ordered by score to satisfy user demand for "most relevant only or exact"
  const cleanQ = query.trim().toLowerCase();
  const isSpecificQuery = cleanQ && cleanQ !== 'trending';
  const topTierThreshold = 110;

  if (isSpecificQuery) {
    const highRelevanceItems: MediaItem[] = [];
    const regularEntries: typeof scored = [];

    for (const entry of scored) {
      if (entry.score >= topTierThreshold) {
        highRelevanceItems.push(entry.item);
      } else {
        regularEntries.push(entry);
      }
    }

    // Interleave remaining items for diversity
    const providerQueues = new Map<string, typeof regularEntries>();
    for (const entry of regularEntries) {
      const p = entry.item.provider;
      if (!providerQueues.has(p)) providerQueues.set(p, []);
      providerQueues.get(p)!.push(entry);
    }

    const regularInterleaved: MediaItem[] = [];
    let remaining = regularEntries.length;

    while (remaining > 0) {
      let progressed = false;
      const sortedProviders = Array.from(providerQueues.entries())
        .filter(([_, queue]) => queue.length > 0)
        .sort((a, b) => (b[1][0]?.score || 0) - (a[1][0]?.score || 0));

      for (const [_, queue] of sortedProviders) {
        if (queue.length > 0) {
          const take = Math.min(2, queue.length);
          for (let i = 0; i < take; i++) {
            regularInterleaved.push(queue.shift()!.item);
            remaining--;
            progressed = true;
          }
        }
      }
      if (!progressed) break;
    }

    return [...highRelevanceItems, ...regularInterleaved];
  }

  // Provider diversity interleaving for general/trending exploration:
  const providerQueues = new Map<string, typeof scored>();
  for (const entry of scored) {
    const p = entry.item.provider;
    if (!providerQueues.has(p)) providerQueues.set(p, []);
    providerQueues.get(p)!.push(entry);
  }

  const interleaved: MediaItem[] = [];
  let remaining = scored.length;

  while (remaining > 0) {
    let progressed = false;
    // Sort providers by the score of their next available item so the freshest/highest-quality items lead
    const sortedProviders = Array.from(providerQueues.entries())
      .filter(([_, queue]) => queue.length > 0)
      .sort((a, b) => (b[1][0]?.score || 0) - (a[1][0]?.score || 0));

    for (const [provider, queue] of sortedProviders) {
      if (queue.length > 0) {
        // Take up to 2 items per round from each provider
        const take = Math.min(2, queue.length);
        for (let i = 0; i < take; i++) {
          interleaved.push(queue.shift()!.item);
          remaining--;
          progressed = true;
        }
      }
    }
    if (!progressed) break;
  }

  return interleaved;
}
