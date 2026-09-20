import React, { useState, useEffect } from 'react';
import {
  Tv,
  Radio,
  Search,
  Play,
  Globe,
  Wifi,
  X,
  Volume2,
  Satellite,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Check,
  Film,
  Trophy,
  Compass,
  Music,
  Flame,
  Layers,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { LiveTvChannel, RadioStation, VideoItem, M3uPreset } from '../types';
import {
  fetchTvChannels,
  fetchRadioStations,
  normalizeMediaItem,
  searchIptvDirectory,
  fetchM3uPresets,
  importM3uPreset,
  importM3uPlaylist,
  addCustomChannel,
  deleteChannel,
  resetChannelsToDefault,
  EXPORT_M3U_URL,
  probeStreamHealth,
  StreamProbeResult,
} from '../services/videoApi';

interface LiveTvRadioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayMedia: (item: VideoItem) => void;
  activeMediaId?: string;
}

type DrawerTab = 'tv' | 'iptv' | 'presets' | 'import' | 'radio';

export const LiveTvRadioDrawer: React.FC<LiveTvRadioDrawerProps> = ({
  isOpen,
  onClose,
  onPlayMedia,
  activeMediaId,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('tv');
  const [tvChannels, setTvChannels] = useState<LiveTvChannel[]>([]);
  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // IPTV Directory Search state
  const [iptvResults, setIptvResults] = useState<LiveTvChannel[]>([]);
  const [iptvTotal, setIptvTotal] = useState<number>(0);
  const [isIptvLoading, setIsIptvLoading] = useState<boolean>(false);
  const [iptvSearchQuery, setIptvSearchQuery] = useState<string>('');
  const [iptvCategory, setIptvCategory] = useState<string>('All');
  const [iptvCountry, setIptvCountry] = useState<string>('All');

  // M3U Presets state
  const [presets, setPresets] = useState<M3uPreset[]>([]);
  const [importingPresetId, setImportingPresetId] = useState<string | null>(null);

  // Custom Stream & M3U Import Form state
  const [customName, setCustomName] = useState('');
  const [customStreamUrl, setCustomStreamUrl] = useState('');
  const [customCategory, setCustomCategory] = useState('General TV');
  const [customCountry, setCustomCountry] = useState('International');
  const [customBadge, setCustomBadge] = useState('CUSTOM STREAM');
  const [m3uUrlInput, setM3uUrlInput] = useState('');
  const [m3uRawContent, setM3uRawContent] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Live Stream Latency & Health Probe State
  const [probeResults, setProbeResults] = useState<Record<string, StreamProbeResult>>({});
  const [probingChannelId, setProbingChannelId] = useState<string | null>(null);

  const handleProbeChannel = async (channelId: string, streamUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProbingChannelId(channelId);
    try {
      const res = await probeStreamHealth(streamUrl);
      setProbeResults((prev) => ({ ...prev, [channelId]: res }));
    } finally {
      setProbingChannelId(null);
    }
  };

  // Load Main Channel List
  const loadTvChannels = () => {
    setIsLoading(true);
    fetchTvChannels(
      selectedCategory === 'All' ? undefined : selectedCategory,
      searchQuery,
      selectedCountry === 'All' ? undefined : selectedCountry,
      selectedSourceType === 'All' ? undefined : selectedSourceType
    )
      .then((data) => setTvChannels(data))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'tv') {
      loadTvChannels();
    } else if (activeTab === 'radio') {
      setIsLoading(true);
      fetchRadioStations(selectedGenre === 'All' ? undefined : selectedGenre, searchQuery)
        .then((data) => setRadioStations(data))
        .finally(() => setIsLoading(false));
    } else if (activeTab === 'presets') {
      setIsLoading(true);
      fetchM3uPresets()
        .then((data) => setPresets(data))
        .finally(() => setIsLoading(false));
    } else if (activeTab === 'iptv') {
      handleSearchIptv();
    }
  }, [isOpen, activeTab, selectedCategory, selectedCountry, selectedSourceType, selectedGenre, searchQuery]);

  // Worldwide IPTV search trigger
  const handleSearchIptv = () => {
    setIsIptvLoading(true);
    searchIptvDirectory(iptvSearchQuery, iptvCategory === 'All' ? undefined : iptvCategory, iptvCountry === 'All' ? undefined : iptvCountry, 40)
      .then((res) => {
        setIptvResults(res.channels);
        setIptvTotal(res.total);
      })
      .finally(() => setIsIptvLoading(false));
  };

  if (!isOpen) return null;

  const handlePlayTv = (channel: LiveTvChannel) => {
    const isEmbed = channel.playerType === 'embed' || (!channel.streamUrl?.includes('.m3u8') && Boolean(channel.embedUrl || channel.streamUrl?.includes('embed')));
    const finalPlayback = isEmbed ? null : channel.streamUrl;
    const finalEmbed = isEmbed ? (channel.embedUrl || channel.streamUrl) : (channel.embedUrl || null);

    const media: VideoItem = normalizeMediaItem({
      id: channel.id,
      title: `${channel.name} [LIVE TV]`,
      description: channel.description,
      playbackUrl: finalPlayback,
      videoUrl: isEmbed ? (finalEmbed || channel.streamUrl) : (finalPlayback || channel.streamUrl),
      embedUrl: finalEmbed,
      thumbnailUrl: channel.logo,
      provider: 'livetv',
      source: 'livetv',
      channel: `${channel.country} • ${channel.language}`,
      duration: 0,
      playerType: isEmbed ? 'embed' : 'hls',
      metadata: {
        streamType: isEmbed ? 'embed' : 'hls',
        isLive: true,
        quality: channel.quality,
        badge: channel.badge || 'LIVE 2026',
        sourceType: channel.sourceType,
      },
    });
    onPlayMedia(media);
  };

  const handlePlayRadio = (station: RadioStation) => {
    const media: VideoItem = normalizeMediaItem({
      id: station.id,
      title: `${station.name} (Live Radio)`,
      description: `Live streaming radio station from ${station.country} playing ${station.genre}.`,
      playbackUrl: station.streamUrl,
      videoUrl: station.streamUrl,
      audioUrl: station.streamUrl,
      thumbnailUrl: station.logo,
      provider: 'radio',
      source: 'radio',
      channel: `${station.genre} • ${station.country}`,
      duration: 0,
      playerType: 'audio',
      metadata: {
        streamType: 'audio_stream',
        isLive: true,
        bitrate: station.bitrate,
        codec: station.codec,
      },
    });
    onPlayMedia(media);
  };

  const handleAddChannelFromIptv = async (channel: LiveTvChannel) => {
    const res = await addCustomChannel(channel);
    if (res.success) {
      setStatusMessage({ type: 'success', text: `Added "${channel.name}" to your Live Channels lineup!` });
      setTimeout(() => setStatusMessage(null), 3500);
      loadTvChannels();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to add channel' });
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleImportPreset = async (presetId: string) => {
    setImportingPresetId(presetId);
    const res = await importM3uPreset(presetId);
    setImportingPresetId(null);
    if (res.success) {
      setStatusMessage({ type: 'success', text: `Loaded preset "${res.presetName}" (+${res.addedCount} channels)!` });
      setTimeout(() => setStatusMessage(null), 4000);
      loadTvChannels();
      setActiveTab('tv');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to import preset' });
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleCreateCustomChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customStreamUrl.trim()) return;

    setIsSubmittingCustom(true);
    const res = await addCustomChannel({
      name: customName.trim(),
      streamUrl: customStreamUrl.trim(),
      category: customCategory,
      country: customCountry,
      badge: customBadge,
      quality: '1080p HD',
      logo: '/covers/abc-news.svg',
      description: `Custom live stream: ${customName.trim()}`,
      playerType: customStreamUrl.includes('embed') || customStreamUrl.includes('youtube') ? 'embed' : 'hls',
    });
    setIsSubmittingCustom(false);

    if (res.success) {
      setCustomName('');
      setCustomStreamUrl('');
      setStatusMessage({ type: 'success', text: `Successfully added "${customName}" to your channels!` });
      setTimeout(() => setStatusMessage(null), 3500);
      loadTvChannels();
      setActiveTab('tv');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to add custom channel' });
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleImportM3u = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!m3uUrlInput.trim() && !m3uRawContent.trim()) return;

    setIsSubmittingCustom(true);
    const res = await importM3uPlaylist({
      url: m3uUrlInput.trim() || undefined,
      content: m3uRawContent.trim() || undefined,
    });
    setIsSubmittingCustom(false);

    if (res.success) {
      setM3uUrlInput('');
      setM3uRawContent('');
      setStatusMessage({ type: 'success', text: `Imported ${res.importedCount} streams from M3U playlist!` });
      setTimeout(() => setStatusMessage(null), 4000);
      loadTvChannels();
      setActiveTab('tv');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to import playlist' });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDeleteChannel = async (channelId: string, name: string) => {
    if (!confirm(`Remove "${name}" from your channels?`)) return;
    const ok = await deleteChannel(channelId);
    if (ok) {
      setStatusMessage({ type: 'success', text: `Removed "${name}"` });
      setTimeout(() => setStatusMessage(null), 3000);
      loadTvChannels();
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset channel lineup to default verified 2026 feeds?')) return;
    const channels = await resetChannelsToDefault();
    setTvChannels(channels);
    setStatusMessage({ type: 'success', text: `Reset complete. ${channels.length} channels restored.` });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const TV_CATEGORIES = [
    'All',
    'Satellite TV',
    'Sports',
    'Free Movies',
    'Kids & Animation',
    'News',
    'Science & Space',
    'Wildlife & Documentary',
    'Earth & Webcams',
    'Music & Lofi',
    'Finance',
  ];

  const TV_COUNTRIES = [
    'All',
    'United States',
    'India',
    'United Kingdom',
    'Japan',
    'Australia',
    'Germany',
    'France',
    'Canada',
    'Italy',
    'International',
  ];

  const SOURCE_TYPES = [
    { id: 'All', label: 'All Sources' },
    { id: 'satellite', label: '📡 Satellite' },
    { id: 'fast_tv', label: '⚡ FAST TV' },
    { id: 'webcam', label: '🎥 Webcams' },
    { id: 'youtube_live', label: '🔴 24/7 Live' },
    { id: 'iptv', label: '🌐 IPTV' },
  ];

  const RADIO_GENRES = ['All', 'Lo-Fi / Chill', 'News & Talk', 'Jazz', 'Classical', 'Ambient', 'Indie Rock'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-3xl bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 text-red-400 rounded-xl border border-red-500/30">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Universal Live Broadcast Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/30 text-red-300 border border-red-500/40 animate-pulse">
                  2026 REAL-TIME
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Multi-Source Satellite, FAST TV, Open IPTV Directory & M3U Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`px-4 py-2.5 text-xs flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800/80'
                : 'bg-red-950/80 text-red-200 border-red-800/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Multi-Tab Switcher */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/80 p-1.5 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveTab('tv');
              setSearchQuery('');
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'tv'
                ? 'bg-red-600 text-white shadow'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>My Channels ({tvChannels.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('iptv');
              setSearchQuery('');
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'iptv'
                ? 'bg-red-600 text-white shadow'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Worldwide IPTV Index</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('presets');
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'presets'
                ? 'bg-red-600 text-white shadow'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Curated Presets</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('import');
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'import'
                ? 'bg-red-600 text-white shadow'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add / M3U</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('radio');
              setSearchQuery('');
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'radio'
                ? 'bg-red-600 text-white shadow'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>World Radio</span>
          </button>
        </div>

        {/* TAB 1: MY LIVE CHANNELS */}
        {activeTab === 'tv' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Filter Bar */}
            <div className="p-3.5 border-b border-neutral-800 flex flex-col gap-2.5 bg-neutral-950/40">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search channel by name, country, genre (e.g. Racing, Action, NASA, Anime, BBC)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-neutral-950 text-neutral-100 placeholder-neutral-500 text-xs rounded-lg border border-neutral-700 focus:border-red-500 focus:outline-none"
                  />
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                </div>

                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="px-2.5 py-2 bg-neutral-950 text-neutral-200 border border-neutral-700 rounded-lg text-xs focus:outline-none focus:border-red-500"
                >
                  {TV_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? '🌍 All Countries' : c}
                    </option>
                  ))}
                </select>

                <a
                  href={EXPORT_M3U_URL}
                  download="opentube-channels.m3u"
                  title="Export channels as .m3u playlist"
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs border border-neutral-700 flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">M3U</span>
                </a>

                <button
                  onClick={handleResetDefaults}
                  title="Reset to 2026 verified default channels"
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs border border-neutral-700 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Source Type & Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {SOURCE_TYPES.map((src) => (
                  <button
                    key={src.id}
                    onClick={() => setSelectedSourceType(src.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                      selectedSourceType === src.id
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60'
                        : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/40'
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
                <span className="text-neutral-700 mx-1">|</span>
                {TV_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-red-600/20 text-red-300 border border-red-500/50'
                        : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {isLoading ? (
                <div className="flex items-center justify-center h-48 text-neutral-500 text-xs gap-2">
                  <Wifi className="w-5 h-5 animate-pulse text-red-500" />
                  <span>Connecting to broadcast streams...</span>
                </div>
              ) : tvChannels.length === 0 ? (
                <div className="p-12 text-center text-neutral-400 text-xs flex flex-col items-center gap-3">
                  <Tv className="w-8 h-8 text-neutral-600" />
                  <p>No channels match your current filters.</p>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedCountry('All');
                      setSelectedSourceType('All');
                      setSearchQuery('');
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                tvChannels.map((channel) => {
                  const isActive = activeMediaId === channel.id;
                  return (
                    <div
                      key={channel.id}
                      onClick={() => handlePlayTv(channel)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isActive
                          ? 'bg-red-600/15 border-red-500/60 shadow-md'
                          : 'bg-neutral-950/60 hover:bg-neutral-800/50 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 h-11 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 relative flex items-center justify-center shadow-inner">
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate">{channel.name}</h4>
                            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0">
                              <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                              LIVE
                            </span>
                            {channel.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-neutral-700 bg-neutral-800 text-neutral-300 shrink-0">
                                {channel.badge}
                              </span>
                            )}
                            {channel.isCustom && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-900/40 text-purple-300 border border-purple-700/50 shrink-0">
                                USER CHANNEL
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">{channel.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500">
                            <span className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-300 font-mono">
                              {channel.quality}
                            </span>
                            <span>•</span>
                            <span>{channel.country}</span>
                            <span>•</span>
                            <span>{channel.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Stream Latency & Health Probe */}
                        {probingChannelId === channel.id ? (
                          <div className="px-2 py-1 bg-neutral-800 rounded-md flex items-center gap-1.5 text-[10px] text-neutral-300">
                            <Activity className="w-3 h-3 text-amber-400 animate-spin" />
                            <span>Probing...</span>
                          </div>
                        ) : probeResults[channel.id] ? (
                          <div
                            onClick={(e) => handleProbeChannel(channel.id, channel.streamUrl, e)}
                            title={`Status: ${probeResults[channel.id].status.toUpperCase()} (${probeResults[channel.id].statusCode || 'n/a'}) - Click to re-probe`}
                            className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all border ${
                              probeResults[channel.id].status === 'online'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                                : probeResults[channel.id].status === 'degraded'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                                : 'bg-rose-950/60 text-rose-300 border-rose-700/50'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                probeResults[channel.id].status === 'online'
                                  ? 'bg-emerald-400 animate-pulse'
                                  : probeResults[channel.id].status === 'degraded'
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                            />
                            <span>
                              {probeResults[channel.id].status === 'online'
                                ? `${probeResults[channel.id].latencyMs}ms`
                                : probeResults[channel.id].status === 'degraded'
                                ? 'Degraded'
                                : 'Offline'}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleProbeChannel(channel.id, channel.streamUrl, e)}
                            title="Probe Stream Health & Latency"
                            className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 rounded-lg transition-colors text-[10px] flex items-center gap-1"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[10px]">Ping</span>
                          </button>
                        )}

                        {channel.isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChannel(channel.id, channel.name);
                            }}
                            title="Remove channel"
                            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          className={`p-2.5 rounded-full shrink-0 transition-transform ${
                            isActive
                              ? 'bg-red-600 text-white shadow-lg scale-105'
                              : 'bg-neutral-800 hover:bg-red-600 text-neutral-200 hover:text-white'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: WORLDWIDE IPTV INDEX */}
        {activeTab === 'iptv' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-3.5 border-b border-neutral-800 flex flex-col gap-2.5 bg-neutral-950/40">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search 17,000+ open global channels (e.g. Eurosport, Cinema, Cartoon, Discovery, CNN)..."
                    value={iptvSearchQuery}
                    onChange={(e) => setIptvSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchIptv()}
                    className="w-full pl-9 pr-4 py-2 bg-neutral-950 text-neutral-100 placeholder-neutral-500 text-xs rounded-lg border border-neutral-700 focus:border-red-500 focus:outline-none"
                  />
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                </div>

                <select
                  value={iptvCountry}
                  onChange={(e) => setIptvCountry(e.target.value)}
                  className="px-2.5 py-2 bg-neutral-950 text-neutral-200 border border-neutral-700 rounded-lg text-xs focus:outline-none focus:border-red-500"
                >
                  {TV_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? '🌍 All Countries' : c}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleSearchIptv}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
              </div>

              {/* Category selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {['All', 'Sports', 'News', 'Free Movies', 'Kids & Animation', 'Wildlife & Documentary', 'Earth & Webcams', 'Music & Lofi'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setIptvCategory(cat);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                      iptvCategory === cat
                        ? 'bg-red-600/20 text-red-300 border border-red-500/50'
                        : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* IPTV Results */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {isIptvLoading ? (
                <div className="flex items-center justify-center h-48 text-neutral-500 text-xs gap-2">
                  <Wifi className="w-5 h-5 animate-pulse text-red-500" />
                  <span>Scanning open global IPTV network...</span>
                </div>
              ) : iptvResults.length === 0 ? (
                <div className="p-12 text-center text-neutral-400 text-xs">
                  No streams found. Try searching for "News", "Sports", or "Music".
                </div>
              ) : (
                iptvResults.map((channel) => (
                  <div
                    key={channel.id}
                    className="p-3 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/40 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        <Globe className="w-6 h-6 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{channel.name}</h4>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {channel.country}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">{channel.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500">
                          <span className="text-emerald-400 font-mono">● Active Feed</span>
                          <span>•</span>
                          <span>{channel.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAddChannelFromIptv(channel)}
                        className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-neutral-700"
                        title="Add to My Channels"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                      <button
                        onClick={() => handlePlayTv(channel)}
                        className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                        title="Play Now"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CURATED PLAYLIST PRESETS */}
        {activeTab === 'presets' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 text-xs text-neutral-300">
              <p className="font-semibold text-white mb-1">1-Click Curated Channel Bundles</p>
              <p className="text-neutral-400">
                Instantly load verified, high-speed broadcast channels for any genre with one click.
              </p>
            </div>

            {presets.map((p) => {
              const isImporting = importingPresetId === p.id;
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 hover:border-neutral-700 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{p.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-300 border border-red-500/40">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{p.description}</p>
                    <div className="mt-2 text-[11px] text-neutral-500">
                      <span>Contains {p.channelCount} verified channels</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleImportPreset(p.id)}
                    disabled={isImporting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {isImporting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{isImporting ? 'Loading...' : 'Load Bundle'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: ADD CUSTOM STREAM & M3U IMPORT */}
        {activeTab === 'import' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            {/* Section A: Add Single Custom Stream */}
            <form onSubmit={handleCreateCustomChannel} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-white">Add Custom Live Stream</h3>
              </div>
              <p className="text-xs text-neutral-400">
                Add any direct HLS stream (.m3u8), YouTube Live, or Dailymotion broadcast.
              </p>

              <div className="flex flex-col gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Channel Name (e.g. My Favorite News HD)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                  className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                />

                <input
                  type="url"
                  placeholder="Stream URL (https://.../playlist.m3u8 or https://www.youtube.com/embed/...)"
                  value={customStreamUrl}
                  onChange={(e) => setCustomStreamUrl(e.target.value)}
                  required
                  className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    {TV_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Country (e.g. United States, France)"
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value)}
                    className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingCustom}
                className="mt-2 py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Channel</span>
              </button>
            </form>

            {/* Section B: Import M3U Playlist */}
            <form onSubmit={handleImportM3u} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-white">Import M3U / M3U8 Playlist</h3>
              </div>
              <p className="text-xs text-neutral-400">
                Paste an online M3U playlist URL or paste raw #EXTM3U content directly.
              </p>

              <div className="flex flex-col gap-2 mt-1">
                <input
                  type="url"
                  placeholder="M3U URL (https://example.com/playlist.m3u)"
                  value={m3uUrlInput}
                  onChange={(e) => setM3uUrlInput(e.target.value)}
                  className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />

                <div className="text-center text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  — or paste raw M3U text —
                </div>

                <textarea
                  rows={4}
                  placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-name=&quot;Channel 1&quot;,Channel 1&#10;https://stream.url/live.m3u8"
                  value={m3uRawContent}
                  onChange={(e) => setM3uRawContent(e.target.value)}
                  className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingCustom || (!m3uUrlInput.trim() && !m3uRawContent.trim())}
                className="mt-2 py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Parse & Import Playlist</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: WORLD RADIO */}
        {activeTab === 'radio' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-3.5 border-b border-neutral-800 flex flex-col gap-2.5 bg-neutral-950/40">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search 40,000+ radio stations (Lo-Fi, BBC, Jazz, Classical, SomaFM...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-neutral-950 text-neutral-100 placeholder-neutral-500 text-xs rounded-lg border border-neutral-700 focus:border-red-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {RADIO_GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                      selectedGenre === genre
                        ? 'bg-red-600/20 text-red-300 border border-red-500/50'
                        : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {isLoading ? (
                <div className="flex items-center justify-center h-48 text-neutral-500 text-xs gap-2">
                  <Wifi className="w-5 h-5 animate-pulse text-red-500" />
                  <span>Tuning in radio frequencies...</span>
                </div>
              ) : radioStations.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  No radio stations found matching your criteria.
                </div>
              ) : (
                radioStations.map((station) => {
                  const isActive = activeMediaId === station.id;
                  return (
                    <div
                      key={station.id}
                      onClick={() => handlePlayRadio(station)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isActive
                          ? 'bg-red-600/15 border-red-500/60 shadow-md'
                          : 'bg-neutral-950/60 hover:bg-neutral-800/50 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={station.logo}
                            alt={station.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white truncate">{station.name}</h4>
                            <span className="px-1.5 py-0.5 rounded bg-teal-600 text-white text-[9px] font-black uppercase tracking-wider">
                              RADIO
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">
                            {station.genre} • {station.country}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 font-mono">
                            <span className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-300">
                              {station.bitrate} kbps {station.codec}
                            </span>
                            {station.votes && station.votes > 0 && (
                              <span>★ {station.votes.toLocaleString()} votes</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        className={`p-2.5 rounded-full shrink-0 transition-transform ${
                          isActive
                            ? 'bg-red-600 text-white shadow-lg scale-105'
                            : 'bg-neutral-800 hover:bg-red-600 text-neutral-200 hover:text-white'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
