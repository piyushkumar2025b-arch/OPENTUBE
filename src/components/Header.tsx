import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Search,
  X,
  RefreshCw,
  Tv,
  Activity,
  ShieldCheck,
  Link as LinkIcon,
  LayoutGrid,
  MoreVertical,
} from 'lucide-react';
import { VideoSourceId } from '../types';
import { CATEGORIES } from '../services/videoApi';

interface HeaderProps {
  currentSource: VideoSourceId;
  onSelectSource: (source: VideoSourceId) => void;
  selectedSources: VideoSourceId[];
  onOpenSourceManager: () => void;
  currentCategory: string;
  onSelectCategory: (cat: string) => void;
  onSelectChannel?: (channel: any) => void;
  onSearch: (query: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  totalVideos: number;
  onOpenLiveDrawer?: () => void;
  onOpenCustomUrlModal?: () => void;
  onOpenStats?: () => void;
  onOpenMultiView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedSources,
  onOpenSourceManager,
  currentCategory,
  onSelectCategory,
  onSearch,
  isLoading,
  onRefresh,
  onOpenLiveDrawer,
  onOpenCustomUrlModal,
  onOpenStats,
  onOpenMultiView,
}) => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [showToolsMenu, setShowToolsMenu] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    if (showToolsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolsMenu]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleClear = () => {
    setSearchInput('');
    onSelectCategory('Trending');
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col gap-2.5">
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <div
            id="brand-logo"
            onClick={() => {
              setSearchInput('');
              onSelectCategory('Trending');
            }}
            className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
            title="OpenTube Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md group-hover:bg-red-500 transition-colors">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-0.5" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-white hidden xs:inline">
              Open<span className="text-red-500">Tube</span>
            </span>
          </div>

          {/* Minimal Centered Search Bar */}
          <form onSubmit={handleSubmit} className="flex-1 max-w-xl mx-1 sm:mx-4">
            <div className="relative flex items-center">
              <input
                id="search-videos-input"
                type="text"
                placeholder="Search videos, music, live TV..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-20 py-2 bg-neutral-900/90 text-neutral-100 placeholder-neutral-500 text-xs sm:text-sm rounded-full border border-neutral-700/80 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 sm:left-3.5 pointer-events-none" />

              {searchInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-16 p-1 hover:text-white text-neutral-400 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                id="execute-search-btn"
                type="submit"
                disabled={!searchInput.trim() || isLoading}
                className="absolute right-1 px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white rounded-full text-xs font-semibold transition-all flex items-center gap-1 shadow"
              >
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Live TV Pill */}
            {onOpenLiveDrawer && (
              <button
                id="open-live-tv-radio-btn"
                onClick={onOpenLiveDrawer}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 rounded-full flex items-center gap-1.5 transition-colors"
                title="Live TV & Radio Broadcasts"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="hidden sm:inline">Live TV</span>
                <Tv className="w-3.5 h-3.5 sm:hidden" />
              </button>
            )}

            {/* Play URL Button */}
            {onOpenCustomUrlModal && (
              <button
                id="open-custom-url-btn"
                onClick={onOpenCustomUrlModal}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-full flex items-center gap-1.5 transition-colors"
                title="Play any direct video URL"
              >
                <LinkIcon className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden md:inline">Play URL</span>
              </button>
            )}

            {/* Tools & More Options Menu Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                id="open-tools-menu-btn"
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                className="p-1.5 sm:p-2 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-full transition-colors"
                title="More Studio Tools"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showToolsMenu && (
                <div
                  id="tools-dropdown-menu"
                  className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-50 text-xs flex flex-col backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {onOpenMultiView && (
                    <button
                      id="menu-multiview-btn"
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenMultiView();
                      }}
                      className="px-3.5 py-2 hover:bg-neutral-800 text-neutral-200 hover:text-white flex items-center gap-2.5 text-left transition-colors"
                    >
                      <LayoutGrid className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="font-semibold">Multi-View Studio</div>
                        <div className="text-[10px] text-neutral-400">Quad-screen live monitoring</div>
                      </div>
                    </button>
                  )}

                  <button
                    id="menu-sources-btn"
                    onClick={() => {
                      setShowToolsMenu(false);
                      onOpenSourceManager();
                    }}
                    className="px-3.5 py-2 hover:bg-neutral-800 text-neutral-200 hover:text-white flex items-center gap-2.5 text-left transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Sources & Quota</div>
                      <div className="text-[10px] text-neutral-400">
                        {selectedSources.length} provider(s) active
                      </div>
                    </div>
                  </button>

                  {onOpenStats && (
                    <button
                      id="menu-stats-btn"
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenStats();
                      }}
                      className="px-3.5 py-2 hover:bg-neutral-800 text-neutral-200 hover:text-white flex items-center gap-2.5 text-left transition-colors"
                    >
                      <Activity className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="font-semibold">Latency & Health</div>
                        <div className="text-[10px] text-neutral-400">Cache hit rates & stream pings</div>
                      </div>
                    </button>
                  )}

                  <div className="h-px bg-neutral-800 my-1" />

                  <button
                    id="menu-refresh-btn"
                    onClick={() => {
                      setShowToolsMenu(false);
                      onRefresh();
                    }}
                    className="px-3.5 py-2 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center gap-2.5 text-left transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-500' : 'text-neutral-400'}`} />
                    <span>Refresh Feed</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Minimal Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar py-0.5">
          {CATEGORIES.map((cat) => {
            const isSelected = currentCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                id={`category-filter-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => {
                  setSearchInput('');
                  onSelectCategory(cat);
                }}
                className={`px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-neutral-100 text-neutral-950 font-bold shadow-sm'
                    : 'bg-neutral-900/90 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
