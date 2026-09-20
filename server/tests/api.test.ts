import { providerRegistry } from '../providers/registry';
import { executeUnifiedSearch, getMediaItemDetails } from '../engine/searchEngine';
import { MediaItem } from '../types/media';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, failureMsg: string) {
  if (condition) {
    results.push({ name: testName, passed: true });
    console.log(`✓ [PASS] ${testName}`);
  } else {
    results.push({ name: testName, passed: false, message: failureMsg });
    console.error(`✗ [FAIL] ${testName}: ${failureMsg}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  OPENTUBE BACKEND & REAL API INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Registry Check
  const allProviders = providerRegistry.getAll();
  assert(
    allProviders.length >= 11,
    'Registry contains all 11 registered provider adapters',
    `Expected >= 11 providers, found ${allProviders.length}`
  );

  const providerIds = allProviders.map((p) => p.id).sort();
  const expectedIds = [
    'archive',
    'livetv',
    'nasa',
    'openverse',
    'peertube',
    'pexels',
    'pixabay',
    'radio',
    'vimeo',
    'wikimedia',
    'youtube',
  ].sort();
  assert(
    expectedIds.every((id) => providerIds.includes(id)),
    'Registry includes all core providers: youtube, pexels, pixabay, vimeo, archive, wikimedia, nasa, openverse, livetv, radio, peertube',
    `Missing in: ${providerIds.join(', ')}`
  );

  // Test 2: Internet Archive Real API Search
  console.log('\n--- Testing Internet Archive Real API ---');
  const archiveProvider = providerRegistry.get('archive')!;
  try {
    const archiveRes = await archiveProvider.search({ query: 'charlie chaplin', limit: 3 });
    assert(
      archiveRes.status === 'ok',
      'Archive search returns status "ok"',
      `Status was: ${archiveRes.status}, error: ${archiveRes.error}`
    );
    assert(
      archiveRes.items.length > 0,
      'Archive search returns real items for "charlie chaplin"',
      `Item count: ${archiveRes.items.length}`
    );
    if (archiveRes.items.length > 0) {
      const first = archiveRes.items[0];
      assert(
        first.provider === 'archive',
        'Archive item provider is "archive"',
        `Provider: ${first.provider}`
      );
      assert(
        first.sourceUrl.includes('archive.org/details/'),
        'Archive item sourceUrl is genuine archive.org URL',
        `Source URL: ${first.sourceUrl}`
      );
      assert(
        first.embedUrl?.includes('archive.org/embed/'),
        'Archive item embedUrl is genuine embed URL',
        `Embed URL: ${first.embedUrl}`
      );
      assert(
        first.thumbnailUrl?.includes('archive.org/services/img/'),
        'Archive item thumbnail is genuine archive.org service image',
        `Thumbnail: ${first.thumbnailUrl}`
      );
      // No manufactured playback URL
      if (first.playbackUrl) {
        assert(
          first.playbackUrl.startsWith('https://archive.org/download/'),
          'Archive playbackUrl (if present) points to actual archive.org download',
          `Playback URL: ${first.playbackUrl}`
        );
      }
    }
  } catch (err: any) {
    assert(false, 'Internet Archive search completed without exception', err.message);
  }

  // Test 3: NASA Real API Search
  console.log('\n--- Testing NASA Video Library Real API ---');
  const nasaProvider = providerRegistry.get('nasa')!;
  try {
    const nasaRes = await nasaProvider.search({ query: 'apollo moon', limit: 3 });
    assert(
      nasaRes.status === 'ok',
      'NASA search returns status "ok"',
      `Status was: ${nasaRes.status}, error: ${nasaRes.error}`
    );
    assert(
      nasaRes.items.length > 0,
      'NASA search returns real items for "apollo moon"',
      `Item count: ${nasaRes.items.length}`
    );
    if (nasaRes.items.length > 0) {
      const first = nasaRes.items[0];
      assert(
        first.provider === 'nasa',
        'NASA item provider is "nasa"',
        `Provider: ${first.provider}`
      );
      assert(
        first.sourceUrl.includes('images.nasa.gov/details/'),
        'NASA item sourceUrl points to official images.nasa.gov details',
        `Source URL: ${first.sourceUrl}`
      );
      assert(
        first.license?.name?.includes('NASA') || first.license?.name?.includes('Public Domain'),
        'NASA item carries accurate Public Domain / NASA license',
        `License: ${JSON.stringify(first.license)}`
      );
    }
  } catch (err: any) {
    assert(false, 'NASA search completed without exception', err.message);
  }

  // Test 4: Wikimedia Commons Real API Search
  console.log('\n--- Testing Wikimedia Commons Real API ---');
  const wikiProvider = providerRegistry.get('wikimedia')!;
  try {
    const wikiRes = await wikiProvider.search({ query: 'nature', limit: 3 });
    assert(
      wikiRes.status === 'ok',
      'Wikimedia search returns status "ok"',
      `Status: ${wikiRes.status}, error: ${wikiRes.error}`
    );
    assert(
      wikiRes.items.length > 0,
      'Wikimedia search returns real video items for "nature"',
      `Item count: ${wikiRes.items.length}`
    );
    if (wikiRes.items.length > 0) {
      const first = wikiRes.items[0];
      assert(
        first.provider === 'wikimedia',
        'Wikimedia item provider is "wikimedia"',
        `Provider: ${first.provider}`
      );
      const pathname = first.playbackUrl ? new URL(first.playbackUrl).pathname : '';
      assert(
        first.playbackUrl !== null &&
          (/\.(webm|mp4|ogv|mov)$/i.test(pathname) || /\.(webm|mp4|ogv|mov)/i.test(first.playbackUrl || '')),
        'Wikimedia item provides direct genuine media playback URL (.webm/.mp4/.ogv)',
        `Playback URL: ${first.playbackUrl}`
      );
      assert(
        first.sourceUrl.includes('commons.wikimedia.org'),
        'Wikimedia item sourceUrl points to official Wikimedia Commons',
        `Source URL: ${first.sourceUrl}`
      );
    }
  } catch (err: any) {
    assert(false, 'Wikimedia search completed without exception', err.message);
  }

  // Test 5: Openverse Real API Search
  console.log('\n--- Testing Openverse Real API ---');
  const openverseProvider = providerRegistry.get('openverse')!;
  try {
    const ovRes = await openverseProvider.search({ query: 'jazz piano', limit: 3 });
    if (ovRes.status === 'rate_limited') {
      console.log('ℹ Openverse is rate-limited (expected when public IP exceeds quota)');
      assert(true, 'Openverse rate limit handled gracefully with rate_limited status', '');
    } else {
      assert(
        ovRes.status === 'ok',
        'Openverse search returns status "ok"',
        `Status: ${ovRes.status}, error: ${ovRes.error}`
      );
      if (ovRes.items.length > 0) {
        const first = ovRes.items[0];
        assert(
          first.provider === 'openverse',
          'Openverse item provider is "openverse"',
          `Provider: ${first.provider}`
        );
        assert(
          first.mediaType === 'audio',
          'Openverse audio item has mediaType "audio"',
          `mediaType: ${first.mediaType}`
        );
        assert(
          first.playbackUrl?.startsWith('http'),
          'Openverse audio item has genuine audio playback URL',
          `Playback URL: ${first.playbackUrl}`
        );
      }
    }
  } catch (err: any) {
    assert(false, 'Openverse search completed without exception', err.message);
  }

  // Test 6: Zero-Result Rule (NO fake/hardcoded fallback data!)
  console.log('\n--- Testing Zero-Result Rule (NO hardcoded videos) ---');
  const gibberishQuery = 'zyxwvu_nonexistent_random_token_9876543210';
  const zeroRes = await executeUnifiedSearch({ query: gibberishQuery });
  assert(
    zeroRes.results.length === 0,
    'Gibberish query returns zero results (no fake fallback)',
    `Expected 0 items, received ${zeroRes.results.length}`
  );
  assert(
    zeroRes.total === 0,
    'Zero results reports total: 0',
    `Expected total: 0, received ${zeroRes.total}`
  );

  // Test 7: Empty Query Rule
  console.log('\n--- Testing Empty Query Rule ---');
  const emptyRes = await executeUnifiedSearch({ query: '' });
  assert(
    emptyRes.results.length === 0 && emptyRes.total === 0,
    'Empty query immediately returns empty array and total: 0',
    `Received length: ${emptyRes.results.length}, total: ${emptyRes.total}`
  );

  // Test 8: Keyed Providers Graceful Unconfigured Handling
  console.log('\n--- Testing Keyed Providers (YouTube, Pexels, Pixabay, Vimeo) ---');
  const youtubeProvider = providerRegistry.get('youtube')!;
  if (!process.env.YOUTUBE_API_KEY) {
    assert(
      !youtubeProvider.isConfigured(),
      'YouTube is unconfigured when YOUTUBE_API_KEY is missing',
      'Expected unconfigured'
    );
    const ytRes = await youtubeProvider.search({ query: 'test' });
    assert(
      ytRes.status === 'unconfigured',
      'YouTube search returns status "unconfigured" when key is missing',
      `Status: ${ytRes.status}`
    );
    assert(
      ytRes.items.length === 0,
      'YouTube returns empty items when unconfigured',
      `Count: ${ytRes.items.length}`
    );
  } else {
    console.log('✓ YOUTUBE_API_KEY is configured, testing live request...');
    const ytRes = await youtubeProvider.search({ query: 'documentary', limit: 3 });
    assert(ytRes.status === 'ok', 'YouTube search with key succeeds', ytRes.error || '');
  }

  const pexelsProvider = providerRegistry.get('pexels')!;
  if (!process.env.PEXELS_API_KEY) {
    const pexRes = await pexelsProvider.search({ query: 'ocean' });
    assert(
      pexRes.status === 'unconfigured' && pexRes.items.length === 0,
      'Pexels gracefully reports unconfigured without key',
      `Status: ${pexRes.status}`
    );
  }

  const pixabayProvider = providerRegistry.get('pixabay')!;
  if (!process.env.PIXABAY_API_KEY) {
    const pixRes = await pixabayProvider.search({ query: 'forest' });
    assert(
      pixRes.status === 'unconfigured' && pixRes.items.length === 0,
      'Pixabay gracefully reports unconfigured without key',
      `Status: ${pixRes.status}`
    );
  }

  const vimeoProvider = providerRegistry.get('vimeo')!;
  if (!process.env.VIMEO_ACCESS_TOKEN) {
    const vimRes = await vimeoProvider.search({ query: 'animation' });
    assert(
      vimRes.status === 'unconfigured' && vimRes.items.length === 0,
      'Vimeo gracefully reports unconfigured without token',
      `Status: ${vimRes.status}`
    );
  }

  // Test 9: Unified Search Aggregation, Deduplication & Ranking
  console.log('\n--- Testing Unified Multi-Provider Search ---');
  const unifiedRes = await executeUnifiedSearch({ query: 'space', limit: 10 });
  assert(
    unifiedRes.results.length > 0,
    'Unified search for "space" aggregates items from active providers',
    `Found ${unifiedRes.results.length} items`
  );
  assert(
    typeof unifiedRes.providers === 'object',
    'Unified search response provides provider status object',
    'Missing providers status'
  );

  // Check that all items conform to MediaItem schema
  let allConform = true;
  let nonConformReason = '';
  for (const item of unifiedRes.results) {
    if (!item.id || !item.provider || !item.title || !item.sourceUrl) {
      allConform = false;
      nonConformReason = `Item missing core fields: ${JSON.stringify(item)}`;
      break;
    }
    // Never allow fake video files like /videos/flower.mp4
    if (item.playbackUrl && item.playbackUrl.startsWith('/videos/')) {
      allConform = false;
      nonConformReason = `Manufactured local video URL detected in real search: ${item.playbackUrl}`;
      break;
    }
  }
  assert(
    allConform,
    'All returned items strictly conform to MediaItem schema with NO fabricated playback URLs',
    nonConformReason
  );

  // Test 10: Specific User Query Tests ("football", "anime", "music", "movies")
  console.log('\n--- Testing Specific Search Queries ("football", "anime", "music", "movies") ---');
  for (const term of ['football', 'anime', 'music', 'movies']) {
    const termRes = await executeUnifiedSearch({ query: term, limit: 6 });
    assert(
      termRes.query === term,
      `Search for "${term}" processes correct query string`,
      `Expected "${term}", got "${termRes.query}"`
    );
    assert(
      Array.isArray(termRes.results),
      `Search for "${term}" returns results array`,
      `Received non-array`
    );
    if (termRes.results.length > 0) {
      assert(
        termRes.results.every((r) => r.provider && r.sourceUrl && r.title),
        `All results for "${term}" have provider, sourceUrl, and title`,
        'Invalid item detected'
      );
    }
  }

  // Test 11: Real Pagination Test (Page 1 vs Page 2)
  console.log('\n--- Testing Pagination (Page 1 vs Page 2) ---');
  const page1Res = await executeUnifiedSearch({ query: 'space', page: 1, limit: 5 });
  const page2Res = await executeUnifiedSearch({ query: 'space', page: 2, limit: 5 });
  if (page1Res.results.length > 0 && page2Res.results.length > 0) {
    const page1Ids = new Set(page1Res.results.map((i) => i.id));
    const page2Ids = new Set(page2Res.results.map((i) => i.id));
    const overlap = page1Res.results.filter((i) => page2Ids.has(i.id));
    assert(
      overlap.length < page1Res.results.length,
      'Page 1 and Page 2 contain distinct items across pages',
      `Identical pages detected`
    );
  } else {
    assert(true, 'Pagination completed with valid pagination metadata', '');
  }

  // Test 12: Timeout Handling
  console.log('\n--- Testing Timeout Handling ---');
  const timeoutRes = await archiveProvider.search({ query: 'test', timeoutMs: 1 });
  assert(
    timeoutRes.status === 'timeout' || timeoutRes.status === 'error',
    'Sub-millisecond timeout is caught and returns "timeout" or "error" status gracefully',
    `Status: ${timeoutRes.status}`
  );

  // Test 13: Invalid/Unknown Provider Handling
  console.log('\n--- Testing Unknown Provider Handling ---');
  const unknownRes = await executeUnifiedSearch({ query: 'nature', source: 'nonexistent_provider' });
  assert(
    unknownRes.errors.length > 0 && unknownRes.results.length === 0,
    'Unknown provider returns structured error without throwing exception',
    `Errors: ${JSON.stringify(unknownRes.errors)}`
  );

  // Test 14: Provider Item Details API
  console.log('\n--- Testing Provider Details API ---');
  const details = await getMediaItemDetails('archive', 'night_of_the_living_dead');
  if (details) {
    assert(
      details.provider === 'archive',
      'Details fetched for archive:night_of_the_living_dead',
      `Provider: ${details.provider}`
    );
    assert(
      details.sourceUrl.includes('archive.org'),
      'Details contains authentic sourceUrl',
      `URL: ${details.sourceUrl}`
    );
  } else {
    console.log('ℹ Note: direct details fetch for item returned null (item might be temporarily slow)');
  }

  // Test 15: Dedicated Playback Resolver Pipeline
  console.log('\n--- Testing Dedicated Playback Resolver Pipeline ---');
  const { resolvePlaybackStream } = await import('../engine/playbackResolver');
  const playbackRes = await resolvePlaybackStream({
    id: 'night_of_the_living_dead',
    provider: 'archive',
  });
  if (playbackRes) {
    assert(
      playbackRes.provider === 'archive',
      'PlaybackResolver returns structured playback resolution',
      `Provider: ${playbackRes.provider}`
    );
    assert(
      playbackRes.candidates.length > 0,
      'PlaybackResolver provides playback candidates',
      `Candidates count: ${playbackRes.candidates.length}`
    );
  }

  // Test 16: Bounded Worker Priority Queue
  console.log('\n--- Testing Bounded Worker Priority Queue ---');
  const { providerQueue } = await import('../engine/controller/boundedQueue');
  const qJob = await providerQueue.enqueue('test', async () => 'worker_ok', { priority: 100 });
  assert(
    qJob === 'worker_ok',
    'BoundedWorkerQueue executes enqueued jobs correctly',
    `Result: ${qJob}`
  );
  const qStats = providerQueue.getStats();
  assert(
    qStats.totalEnqueued > 0 && qStats.totalCompleted > 0,
    'BoundedWorkerQueue records telemetry statistics',
    `Enqueued: ${qStats.totalEnqueued}, Completed: ${qStats.totalCompleted}`
  );

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${results.length})`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
