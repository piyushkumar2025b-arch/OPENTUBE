import { executeUnifiedSearch, getMediaItemDetails } from './engine/searchEngine';
import { providerRegistry } from './providers/registry';
import { MediaItem, UnifiedSearchResponse } from './types/media';

// Backwards-compatible delegation for any legacy imports
export async function executeUnifiedVideoSearch(
  query: string = 'trending',
  source: string = 'all'
): Promise<any> {
  const result = await executeUnifiedSearch({
    query,
    source,
    limit: 24,
  });

  // Group by provider for frontend compatibility
  const bySource: Record<string, any[]> = {};
  for (const item of result.results) {
    if (!bySource[item.provider]) {
      bySource[item.provider] = [];
    }
    bySource[item.provider].push(item);
  }

  return {
    query: result.query,
    total: result.total,
    results: result.results,
    bySource,
    providers: result.providers,
    pagination: result.pagination,
    errors: result.errors,
  };
}

export { executeUnifiedSearch, getMediaItemDetails, providerRegistry };
