import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { VideoItem, VideoSourceId } from './types';
import {
  searchUnifiedVideos,
  SOURCES,
  CHANNELS,
} from './services/videoApi';
import { VideoCard } from './components/VideoCard';
import { Header } from './components/Header';
import { SourceManagerModal } from './components/SourceManagerModal';
import { PlayCustomUrlModal } from './components/PlayCustomUrlModal';
import { OpenverseAuthModal } from './components/OpenverseAuthModal';
import {
  Film,
  Sparkles,
  AlertTriangle,
  Layers,
  Shuffle,
  Grid,
  ListTree,
  Music,
  Box,
  Database,
  Globe,
  Tv,
  Radio,
  Satellite,
  Activity,
  Loader2,
  ShieldCheck,
  Link as LinkIcon,
  CheckCircle2,
  Key,
  LayoutGrid,
  Clock,
  Flame,
} from 'lucide-react';

const VideoPlayer = lazy(() => import('./components/VideoPlayer').then((m) => ({ default: m.VideoPlayer })));
const LiveTvRadioDrawer = lazy(() => import('./components/LiveTvRadioDrawer').then((m) => ({ default: m.LiveTvRadioDrawer })));
const SystemStatsModal = lazy(() => import('./components/SystemStatsModal').then((m) => ({ default: m.SystemStatsModal })));
const MultiViewStudio = lazy(() => import('./components/MultiViewStudio').then((m) => ({ default: m.MultiViewStudio })));

const DEFAULT_SOURCES: VideoSourceId[] = [
  'youtube',
  'pexels',
  'dailymotion',
  'openmovie',
  'coverr',
  'peertube',
  'featurefilms',
  'archivewatch',
  'scifihorror',
  'silentfilms',
  'classiccartoons',
  'animation',
  'tedtalks',
  'mitocw',
  'nasa',
  'nasasvs',
  'naturevids',
  'loc',
  'sportsarchive',
  'livetv',
  'radio',
  'itunes',
  'audius',
  'somafm',
  'freemusic',
  'tvnews',
  'computerchronicles',
  'prelinger',
  'wikimedia',
  'harvardfilm',
  'publicfilm',
  'retrogaming',
  'soundfx',
  'smithsonian',
];

function parseItemTimestamp(publishedAt?: string): number {
  if (!publishedAt || typeof publishedAt !== 'string') return 0;
  const str = publishedAt.trim().toLowerCase();
  if (!str || str === 'recent') return Date.now(); // default to present if flagged recent

  const parsedDirect = Date.parse(str);
  if (!isNaN(parsedDirect) && parsedDirect > 0) {
    return parsedDirect;
  }

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

  const yearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return new Date(year, 0, 1).getTime();
  }

  return 0;
}

export default function App() {
  const [currentSource, setCurrentSource] = useState<VideoSourceId>('all');
  const [currentCategory, setCurrentCategory] = useState<string>('Trending');
  const [activeQuery, setActiveQuery] = useState<string>('Trending');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [bySource, setBySource] = useState<Record<string, VideoItem[]>>({});
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [autoplayNext, setAutoplayNext] = useState<boolean>(true);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<'grid' | 'grouped'>('grid');
  const [sortBy, setSortBy] = useState<'latest' | 'top' | 'exact'>('exact');

  // Active Source Selection: User can search across all 30+ available video & media sources
  const [selectedSources, setSelectedSources] = useState<VideoSourceId[]>(() => {
    try {
      const saved = localStorage.getItem('opentube_selected_sources');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) return parsed;
      }
    } catch {}
    return DEFAULT_SOURCES;
  });

  // Modals & Drawers
  const [isLiveDrawerOpen, setIsLiveDrawerOpen] = useState<boolean>(false);
  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState<boolean>(false);
  const [isOpenverseAuthOpen, setIsOpenverseAuthOpen] = useState<boolean>(false);
  const [isCustomUrlModalOpen, setIsCustomUrlModalOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isMultiViewOpen, setIsMultiViewOpen] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const searchGenerationRef = useRef<number>(0);

  // Load videos strictly from selected sources
  const loadVideos = useCallback(
    async (source: VideoSourceId, query: string, targetSources?: VideoSourceId[]) => {
      const currentGen = ++searchGenerationRef.current;

      // Abort previous in-flight search
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setFetchError(null);
      try {
        const sourcesToQuery = source === 'all' ? (targetSources || selectedSources) : [source];
        const response = await searchUnifiedVideos(query, source, controller.signal, sourcesToQuery);
        if (currentGen !== searchGenerationRef.current) return;

        setVideos(response.results);
        setBySource(response.bySource);

        // Keep active video playing uninterrupted
        setActiveVideo((prev) => prev);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (currentGen !== searchGenerationRef.current) return;
        console.error('Failed to load videos from unified search:', err);
        setFetchError('Error connecting to video search proxy. Please retry or adjust search.');
      } finally {
        if (currentGen === searchGenerationRef.current && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [selectedSources]
  );

  // Initial load on mount ONLY
  useEffect(() => {
    loadVideos(currentSource, activeQuery, selectedSources);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected sources and re-run search with those sources
  const handleUpdateSelectedSources = (newSources: VideoSourceId[]) => {
    setSelectedSources(newSources);
    try {
      localStorage.setItem('opentube_selected_sources', JSON.stringify(newSources));
    } catch {}
    loadVideos(currentSource, activeQuery, newSources);
  };

  // Handle source switch
  const handleSelectSource = (source: VideoSourceId) => {
    setCurrentSource(source);
    loadVideos(source, activeQuery, selectedSources);
  };

  // Handle category filter
  const handleSelectCategory = (cat: string) => {
    setCurrentCategory(cat);
    setActiveQuery(cat);
    loadVideos(currentSource, cat, selectedSources);
  };

  // Handle channel click
  const handleSelectChannel = (channel: (typeof CHANNELS)[0]) => {
    setCurrentSource(channel.source);
    setCurrentCategory(channel.name);
    setActiveQuery(channel.tag);
    loadVideos(channel.source, channel.tag, selectedSources);
  };

  // Explicit search triggered ONLY when the user clicks Search or presses Enter
  // NEVER on intermediate keystrokes!
  const handleSearch = (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setCurrentCategory(trimmed);
    setActiveQuery(trimmed);
    loadVideos(currentSource, trimmed, selectedSources);
  };

  // Handle video card click
  const handleSelectVideo = (video: VideoItem) => {
    setActiveVideo(video);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Play next video in queue (for autoplay next or next button)
  const handlePlayNext = () => {
    if (!videos || videos.length === 0) return;
    const currentIndex = videos.findIndex((v) => v.id === activeVideo?.id);
    const nextIndex = (currentIndex + 1) % videos.length;
    setActiveVideo(videos[nextIndex]);
  };

  // Play random video (Surprise Me / Shuffle)
  const handlePlayRandom = () => {
    if (!videos || videos.length === 0) return;
    const randomIndex = Math.floor(Math.random() * videos.length);
    setActiveVideo(videos[randomIndex]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Play item selected from live drawer or custom URL modal
  const handlePlayDirectVideo = (item: VideoItem) => {
    setActiveVideo(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Active sources for quick display chips
  const activeSourcesObjects = SOURCES.filter((s) => selectedSources.includes(s.id));

  // Sort videos by Exact Match, Recency (latest first), or Multi-Signal Top Quality
  const sortedVideos = useMemo(() => {
    if (sortBy === 'top') return videos;

    if (sortBy === 'latest') {
      return [...videos].sort((a, b) => {
        const tsA = parseItemTimestamp(a.publishedAt);
        const tsB = parseItemTimestamp(b.publishedAt);
        return tsB - tsA;
      });
    }

    // sortBy === 'exact': prioritize videos that exactly or strongly contain the searched query in the title
    const qLower = activeQuery.trim().toLowerCase();
    if (!qLower || qLower === 'trending') {
      return videos;
    }

    const qTokens = qLower.split(/\s+/).filter((t) => t.length > 2);

    const getRelevanceScore = (v: VideoItem) => {
      const titleLower = (v.title || '').toLowerCase();
      let s = 0;
      if (titleLower.includes(qLower)) s += 100;
      if (titleLower.startsWith(qLower)) s += 50;
      for (const t of qTokens) {
        if (titleLower.includes(t)) s += 20;
      }
      // Combine with recency boost for equally relevant titles
      const ts = parseItemTimestamp(v.publishedAt);
      if (ts > 0) {
        const daysOld = (Date.now() - ts) / (86400 * 1000);
        if (daysOld <= 365) s += 10;
      }
      return s;
    };

    return [...videos].sort((a, b) => getRelevanceScore(b) - getRelevanceScore(a));
  }, [videos, sortBy, activeQuery]);

  // Sort grouped videos by source if needed
  const sortedBySource = useMemo(() => {
    if (sortBy === 'top') return bySource;
    const sorted: Record<string, VideoItem[]> = {};

    const qLower = activeQuery.trim().toLowerCase();
    const qTokens = qLower.split(/\s+/).filter((t) => t.length > 2);

    const getRelevanceScore = (v: VideoItem) => {
      const titleLower = (v.title || '').toLowerCase();
      let s = 0;
      if (titleLower.includes(qLower)) s += 100;
      if (titleLower.startsWith(qLower)) s += 50;
      for (const t of qTokens) {
        if (titleLower.includes(t)) s += 20;
      }
      return s;
    };

    for (const [key, items] of Object.entries(bySource)) {
      if (Array.isArray(items)) {
        if (sortBy === 'latest') {
          sorted[key] = [...items].sort((a: VideoItem, b: VideoItem) => {
            const tsA = parseItemTimestamp(a.publishedAt);
            const tsB = parseItemTimestamp(b.publishedAt);
            return tsB - tsA;
          });
        } else {
          // exact match
          sorted[key] = [...items].sort((a: VideoItem, b: VideoItem) => getRelevanceScore(b) - getRelevanceScore(a));
        }
      }
    }
    return sorted;
  }, [bySource, sortBy, activeQuery]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Header with Search (Click-to-Search) & Sources Quota Guard */}
      <Header
        currentSource={currentSource}
        onSelectSource={handleSelectSource}
        selectedSources={selectedSources}
        onOpenSourceManager={() => setIsSourceManagerOpen(true)}
        currentCategory={currentCategory}
        onSelectCategory={handleSelectCategory}
        onSelectChannel={handleSelectChannel}
        onSearch={handleSearch}
        isLoading={isLoading}
        onRefresh={() => loadVideos(currentSource, activeQuery, selectedSources)}
        totalVideos={videos.length}
        onOpenLiveDrawer={() => setIsLiveDrawerOpen(true)}
        onOpenCustomUrlModal={() => setIsCustomUrlModalOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenMultiView={() => setIsMultiViewOpen(true)}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 transition-all ${
          isTheaterMode ? 'max-w-[95vw]' : 'max-w-7xl'
        }`}
      >
        {/* Active In-Screen Video Player */}
        <section id="active-video-section" aria-label="Active video player">
          {activeVideo ? (
            <Suspense fallback={<div className="w-full aspect-video bg-neutral-900 animate-pulse rounded-2xl border border-neutral-800" />}>
              <VideoPlayer
                video={activeVideo}
                onVideoEnd={handlePlayNext}
                autoplayNext={autoplayNext}
                onToggleAutoplayNext={() => setAutoplayNext(!autoplayNext)}
                isTheaterMode={isTheaterMode}
                onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
              />
            </Suspense>
          ) : (
            /* Minimal Welcome Banner */
            <div className="w-full py-4 sm:py-5 px-4 sm:px-6 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-sm">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Free & Open Video Streaming</span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Search across public domain archives, 24/7 Live TV, music, and CC-licensed video.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="welcome-shuffle-btn"
                  onClick={handlePlayRandom}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-full transition-colors border border-neutral-700/80 flex items-center gap-1.5"
                  title="Play random stream"
                >
                  <Shuffle className="w-3.5 h-3.5 text-red-400" />
                  <span>Surprise Me</span>
                </button>
                <button
                  id="welcome-satellite-tv-btn"
                  onClick={() => setIsLiveDrawerOpen(true)}
                  className="px-3 py-1.5 bg-red-600/15 hover:bg-red-600/25 text-red-300 text-xs font-semibold rounded-full transition-colors border border-red-500/30 flex items-center gap-1.5"
                  title="Watch Live TV Channels"
                >
                  <Tv className="w-3.5 h-3.5 text-red-400" />
                  <span>Live TV</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Video Catalog Section */}
        <section id="video-catalog-section" className="flex flex-col gap-4">
          {/* Minimal Controls Bar */}
          <div className="flex items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <Film className="w-4 h-4 text-red-500" />
              <h2 className="text-base font-semibold text-neutral-100 tracking-tight">
                {activeQuery ? activeQuery : 'Trending'}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                {videos.length} items
              </span>
              {isLoading && videos.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-amber-400 ml-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Updating...</span>
                </span>
              )}
            </div>

            {/* Sort & View Mode Switcher */}
            <div className="flex items-center gap-2">
              {/* Sort Order Selector */}
              <div className="flex items-center bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg text-xs">
                <button
                  id="sort-exact-btn"
                  onClick={() => setSortBy('exact')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                    sortBy === 'exact'
                      ? 'bg-red-600 text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Rank exact and most relevant keyword matches first"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Exact Match</span>
                </button>
                <button
                  id="sort-latest-btn"
                  onClick={() => setSortBy('latest')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                    sortBy === 'latest'
                      ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Show newest releases and recently published first"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Latest First</span>
                </button>
                <button
                  id="sort-top-btn"
                  onClick={() => setSortBy('top')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                    sortBy === 'top'
                      ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Rank by overall multi-source match score"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Top Match</span>
                </button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg text-xs">
                <button
                  id="view-grid-btn"
                  onClick={() => setDisplayMode('grid')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                    displayMode === 'grid'
                      ? 'bg-neutral-800 text-white font-medium shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Unified Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  id="view-grouped-btn"
                  onClick={() => setDisplayMode('grouped')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                    displayMode === 'grouped'
                      ? 'bg-neutral-800 text-white font-medium shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Group by Source Provider"
                >
                  <ListTree className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">By Source</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading && videos.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-900/60 rounded-xl overflow-hidden border border-neutral-800/80 animate-pulse flex flex-col"
                >
                  <div className="aspect-video bg-neutral-800/60" />
                  <div className="p-3.5 flex flex-col gap-2">
                    <div className="h-4 bg-neutral-800/80 rounded w-3/4" />
                    <div className="h-3 bg-neutral-800/40 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {fetchError && (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-3 text-red-200 text-xs">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">{fetchError}</span>
              </div>
              <button
                onClick={() => loadVideos(currentSource, activeQuery, selectedSources)}
                className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && videos.length === 0 && !fetchError && (
            <div className="py-16 text-center flex flex-col items-center gap-3 bg-neutral-900/30 rounded-2xl border border-neutral-800/60 p-6">
              <Film className="w-12 h-12 text-neutral-600" />
              <h3 className="text-base font-bold text-neutral-300">No media streams found</h3>
              <p className="text-xs text-neutral-500 max-w-md">
                No results found for &ldquo;{activeQuery}&rdquo; in the {selectedSources.length} active source(s). Click &ldquo;Configure Sources&rdquo; to enable more providers, or try another search.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setIsSourceManagerOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Configure Active Sources</span>
                </button>
                <button
                  onClick={() => setIsCustomUrlModalOpen(true)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition-colors border border-neutral-700 flex items-center gap-1.5"
                >
                  <LinkIcon className="w-4 h-4 text-red-400" />
                  <span>Play Custom URL</span>
                </button>
              </div>
            </div>
          )}

          {/* Results: Unified Grid View */}
          {displayMode === 'grid' && sortedVideos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {sortedVideos.map((item) => (
                <VideoCard
                  key={item.id}
                  video={item}
                  onSelect={() => handleSelectVideo(item)}
                  onClick={() => handleSelectVideo(item)}
                  isActive={activeVideo?.id === item.id}
                />
              ))}
            </div>
          )}

          {/* Results: Grouped by Provider View */}
          {displayMode === 'grouped' && sortedVideos.length > 0 && (
            <div className="flex flex-col gap-8">
              {Object.keys(sortedBySource).map((sourceKey) => {
                const sourceVideos = sortedBySource[sourceKey];
                if (!sourceVideos || sourceVideos.length === 0) return null;
                const sourceDef = SOURCES.find((s) => s.id === sourceKey);
                const title = sourceDef ? sourceDef.name : sourceKey.toUpperCase();
                const badge = sourceDef ? sourceDef.badge : 'API Provider';

                return (
                  <div key={sourceKey} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <h3 className="text-sm font-bold text-neutral-200">{title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                          {badge}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-500 font-mono">
                        {sourceVideos.length} streams
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sourceVideos.map((item) => (
                        <VideoCard
                          key={item.id}
                          video={item}
                          onSelect={() => handleSelectVideo(item)}
                          onClick={() => handleSelectVideo(item)}
                          isActive={activeVideo?.id === item.id}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 mt-12 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span className="font-bold text-neutral-200">OpenTube</span>
            <span>—</span>
            <span>
              Configurable Open Media Player & Universal Streaming Engine. Supports YouTube, Pexels, Dailymotion, Open Cinema, Live TV, Radio, and custom URLs.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-neutral-400 font-mono">
            <span className="bg-neutral-900 px-2 py-1 rounded border border-neutral-800">Space: Play/Pause</span>
            <span className="bg-neutral-900 px-2 py-1 rounded border border-neutral-800">F: Fullscreen</span>
            <span className="bg-neutral-900 px-2 py-1 rounded border border-neutral-800">M: Mute</span>
            <span className="bg-neutral-900 px-2 py-1 rounded border border-neutral-800">← / →: ±10s</span>
          </div>
        </div>
      </footer>

      {/* Source Manager & Quota Guard Modal */}
      <SourceManagerModal
        isOpen={isSourceManagerOpen}
        onClose={() => setIsSourceManagerOpen(false)}
        selectedSources={selectedSources}
        onUpdateSelectedSources={handleUpdateSelectedSources}
      />

      {/* Openverse OAuth2 & Client Credentials Modal */}
      <OpenverseAuthModal
        isOpen={isOpenverseAuthOpen}
        onClose={() => setIsOpenverseAuthOpen(false)}
      />

      {/* Play Any Custom Video URL Modal */}
      <PlayCustomUrlModal
        isOpen={isCustomUrlModalOpen}
        onClose={() => setIsCustomUrlModalOpen(false)}
        onPlayVideo={handlePlayDirectVideo}
      />

      {/* Live TV & Radio Broadcast Directory Drawer (Lazy) */}
      <Suspense fallback={null}>
        {isLiveDrawerOpen && (
          <LiveTvRadioDrawer
            isOpen={isLiveDrawerOpen}
            onClose={() => setIsLiveDrawerOpen(false)}
            onPlayMedia={handlePlayDirectVideo}
            activeMediaId={activeVideo?.id}
          />
        )}

        {/* System Controller Telemetry Modal (Lazy) */}
        {isStatsOpen && (
          <SystemStatsModal
            isOpen={isStatsOpen}
            onClose={() => setIsStatsOpen(false)}
          />
        )}

        {/* Quad Concurrent Multi-View Studio (Lazy) */}
        {isMultiViewOpen && (
          <MultiViewStudio
            isOpen={isMultiViewOpen}
            onClose={() => setIsMultiViewOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
