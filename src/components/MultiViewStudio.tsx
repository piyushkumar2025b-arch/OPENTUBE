import React, { useState, useEffect, useRef } from 'react';
import { VideoItem } from '../types';
import {
  LayoutGrid,
  Columns2,
  Volume2,
  VolumeX,
  Maximize2,
  X,
  Tv,
  Radio,
  Search,
  Check,
  RefreshCw,
  Sparkles,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';
import Hls from 'hls.js';

interface MultiViewTileProps {
  index: number;
  item: VideoItem | null;
  isActiveAudio: boolean;
  onSelectAudio: () => void;
  onRemove: () => void;
  onExpandToMain: (item: VideoItem) => void;
  onChangeStream: () => void;
}

const MultiViewTile: React.FC<MultiViewTileProps> = ({
  index,
  item,
  isActiveAudio,
  onSelectAudio,
  onRemove,
  onExpandToMain,
  onChangeStream,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const streamSrc = item?.playbackUrl || item?.videoUrl || '';
  const isHls = streamSrc.includes('.m3u8') || item?.playerType === 'hls';
  const isEmbed =
    item?.playerType === 'embed' ||
    Boolean(item?.embedUrl && (!item.playbackUrl || item.playbackUrl.includes('/embed/')));

  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!item || !videoRef.current || isEmbed || !streamSrc) return;

    setHasError(false);
    setIsBuffering(true);

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(streamSrc);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          videoRef.current?.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setIsBuffering(false);
            setHasError(true);
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamSrc;
        videoRef.current.play().catch(() => {});
        setIsBuffering(false);
      }
    } else {
      videoRef.current.src = streamSrc;
      videoRef.current.play().catch(() => {});
      setIsBuffering(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [item?.id, streamSrc, isHls, isEmbed]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isActiveAudio;
    }
  }, [isActiveAudio]);

  if (!item) {
    return (
      <div
        onClick={onChangeStream}
        className="relative aspect-video rounded-xl bg-neutral-900/80 border-2 border-dashed border-neutral-800 hover:border-red-500/60 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
      >
        <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-red-600/20 text-neutral-400 group-hover:text-red-400 flex items-center justify-center mb-3 transition-colors">
          <Tv className="w-6 h-6" />
        </div>
        <span className="text-sm font-semibold text-neutral-300 group-hover:text-white mb-1">
          Screen #{index + 1} Empty
        </span>
        <span className="text-xs text-neutral-500 group-hover:text-neutral-400">
          Click to load a live channel or video
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-video rounded-xl overflow-hidden bg-black border transition-all group ${
        isActiveAudio
          ? 'border-red-500 shadow-lg shadow-red-950/40 ring-2 ring-red-500/20'
          : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* Top Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 py-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-xs transition-opacity duration-200">
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <span className="px-1.5 py-0.5 rounded bg-red-600/80 text-white font-mono text-[10px] font-bold">
            #{index + 1}
          </span>
          <span className="font-semibold text-white truncate drop-shadow text-xs">
            {item.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Audio Focus Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectAudio();
            }}
            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
              isActiveAudio
                ? 'bg-red-600 text-white shadow'
                : 'bg-black/60 text-neutral-300 hover:text-white hover:bg-black/80'
            }`}
            title={isActiveAudio ? 'Active Sound Channel' : 'Click to hear this channel'}
          >
            {isActiveAudio ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">LIVE AUDIO</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Listen</span>
              </>
            )}
          </button>

          {/* Expand to Main */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpandToMain(item);
            }}
            className="p-1 rounded bg-black/60 hover:bg-black/80 text-neutral-300 hover:text-white transition-colors"
            title="Expand to Primary Player"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Change Stream */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeStream();
            }}
            className="p-1 rounded bg-black/60 hover:bg-black/80 text-neutral-300 hover:text-white transition-colors"
            title="Switch Channel"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Remove Tile */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded bg-black/60 hover:bg-red-900/60 text-neutral-400 hover:text-red-300 transition-colors"
            title="Clear Screen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Media Video or Embed */}
      {isEmbed ? (
        <iframe
          src={item.embedUrl || item.videoUrl}
          title={item.title}
          className="w-full h-full border-0 pointer-events-auto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
          autoPlay
          muted={!isActiveAudio}
          onClick={onSelectAudio}
          onError={() => setHasError(true)}
        />
      )}

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-700 text-xs text-neutral-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
            <span>Connecting Stream...</span>
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-4 text-center z-10">
          <Tv className="w-8 h-8 text-neutral-600 mb-2" />
          <span className="text-xs font-semibold text-neutral-300 mb-1">Stream Signal Offline</span>
          <button
            onClick={onChangeStream}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-medium"
          >
            Choose Alternative
          </button>
        </div>
      )}

      {/* Active Audio Waveform Badge at bottom */}
      {isActiveAudio && (
        <div className="absolute bottom-2 left-2 z-20 px-2 py-1 rounded-md bg-black/80 backdrop-blur border border-red-500/40 flex items-center gap-1.5 text-[10px] text-red-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>AUDIO FOCUSED</span>
        </div>
      )}
    </div>
  );
};

interface MultiViewStudioProps {
  isOpen: boolean;
  onClose: () => void;
  availableVideos: VideoItem[];
  onPlayInMain: (item: VideoItem) => void;
}

export const MultiViewStudio: React.FC<MultiViewStudioProps> = ({
  isOpen,
  onClose,
  availableVideos,
  onPlayInMain,
}) => {
  const [layoutMode, setLayoutMode] = useState<'dual' | 'quad'>('quad');
  const [activeAudioIndex, setActiveAudioIndex] = useState<number>(0);
  const [slots, setSlots] = useState<(VideoItem | null)[]>([null, null, null, null]);
  const [pickingSlotIndex, setPickingSlotIndex] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Prepopulate default high-quality live channels on first open
  useEffect(() => {
    if (availableVideos.length > 0 && slots.every((s) => s === null)) {
      setSlots([
        availableVideos[0] || null,
        availableVideos[1] || null,
        availableVideos[2] || null,
        availableVideos[3] || null,
      ]);
    }
  }, [availableVideos]);

  if (!isOpen) return null;

  const activeSlotCount = layoutMode === 'dual' ? 2 : 4;
  const currentSlots = slots.slice(0, activeSlotCount);

  const handleSelectSlotItem = (slotIdx: number, item: VideoItem) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[slotIdx] = item;
      return copy;
    });
    setPickingSlotIndex(null);
  };

  const handleRemoveSlot = (slotIdx: number) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[slotIdx] = null;
      return copy;
    });
  };

  const filteredVideos = availableVideos.filter(
    (v) =>
      v.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      v.channel.toLowerCase().includes(searchFilter.toLowerCase()) ||
      v.source.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Studio Header Bar */}
      <div className="px-5 py-3.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tight">
                Multi-View Broadcast Studio
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                QUAD CONCURRENT
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Watch multiple streams simultaneously with synchronized multi-tile playback & zero-latency audio switching
            </p>
          </div>
        </div>

        {/* Layout Mode Toggles & Close */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setLayoutMode('dual')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                layoutMode === 'dual'
                  ? 'bg-neutral-800 text-white font-bold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Dual-Screen</span>
            </button>
            <button
              onClick={() => setLayoutMode('quad')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                layoutMode === 'quad'
                  ? 'bg-neutral-800 text-white font-bold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Quad-View (4x)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
            title="Exit Multi-View Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Studio Viewport Grid */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col justify-center">
        <div
          className={`w-full max-w-7xl mx-auto grid gap-4 transition-all ${
            layoutMode === 'dual'
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {currentSlots.map((item, idx) => (
            <MultiViewTile
              key={idx}
              index={idx}
              item={item}
              isActiveAudio={activeAudioIndex === idx}
              onSelectAudio={() => setActiveAudioIndex(idx)}
              onRemove={() => handleRemoveSlot(idx)}
              onExpandToMain={(target) => {
                onPlayInMain(target);
                onClose();
              }}
              onChangeStream={() => setPickingSlotIndex(idx)}
            />
          ))}
        </div>
      </div>

      {/* Stream Selector Drawer (When user clicks to choose a stream for a tile) */}
      {pickingSlotIndex !== null && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-white text-base">
                  Assign Stream to Screen #{pickingSlotIndex + 1}
                </h3>
              </div>
              <button
                onClick={() => setPickingSlotIndex(null)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search live channels, title, or tags..."
                className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredVideos.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  No matching media items found.
                </div>
              ) : (
                filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => handleSelectSlotItem(pickingSlotIndex, video)}
                    className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-700 cursor-pointer flex items-center gap-3 transition-colors group"
                  >
                    <div className="w-20 aspect-video rounded-lg overflow-hidden bg-neutral-800 shrink-0 relative">
                      <img
                        src={video.thumbnailUrl || video.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-neutral-200 group-hover:text-white truncate">
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {video.channel} • {video.source}
                      </p>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      Load
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
