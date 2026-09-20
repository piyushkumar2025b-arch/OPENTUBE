import { MediaItem } from '../types/media';

export function deduplicateAndRank(items: MediaItem[], query?: string): MediaItem[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const deduplicated: MediaItem[] = [];

  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    if (item.sourceUrl && seenUrls.has(item.sourceUrl)) continue;

    seenIds.add(item.id);
    if (item.sourceUrl) seenUrls.add(item.sourceUrl);
    deduplicated.push(item);
  }

  if (!query) return deduplicated;

  const normalizedQuery = query.toLowerCase().trim();
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

  // Score relevance: title match > description match, prioritize items with playable or embed media
  return deduplicated.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    const titleA = a.title.toLowerCase();
    const titleB = b.title.toLowerCase();

    if (titleA === normalizedQuery) scoreA += 50;
    if (titleB === normalizedQuery) scoreB += 50;

    for (const term of queryTerms) {
      if (titleA.includes(term)) scoreA += 15;
      if (titleB.includes(term)) scoreB += 15;
      if (a.description?.toLowerCase().includes(term)) scoreA += 5;
      if (b.description?.toLowerCase().includes(term)) scoreB += 5;
    }

    // Playable items get a slight boost over metadata-only
    if (a.playbackUrl) scoreA += 10;
    else if (a.embedUrl) scoreA += 5;

    if (b.playbackUrl) scoreB += 10;
    else if (b.embedUrl) scoreB += 5;

    return scoreB - scoreA;
  });
}
