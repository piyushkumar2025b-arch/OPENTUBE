import React, { useRef, useState, useEffect, useCallback } from 'react';
import type Hls from 'hls.js';
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Gauge,
  AlertCircle,
  Repeat,
  SkipForward,
  Share2,
  Download,
  Check,
  Tv,
  ExternalLink,
  Film,
  Music,
  Box,
  Database,
  Layers,
  Sparkles,
  Info,
  Clock,
  Star,
  Users,
  Zap,
  Sliders,
  Shield,
  Wifi,
  Radio as RadioIcon,
  Camera,
  Moon,
  Scissors,
  SlidersHorizontal,
  Bookmark,
} from 'lucide-react';
import { VideoItem, PlaybackSpeed } from '../types';
import { formatDuration } from '../services/videoApi';
import { SnapshotModal, SnapshotData } from './SnapshotModal';
import { AudioEqualizerDrawer, EqualizerSettings, DEFAULT_EQ_SETTINGS } from './AudioEqualizerDrawer';
import { SleepTimerModal } from './SleepTimerModal';

interface VideoPlayerProps {
  video: VideoItem;
  onVideoEnd?: () => void;
  autoplayNext?: boolean;
  onToggleAutoplayNext?: () => void;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  onVideoEnd,
  autoplayNext = true,
  onToggleAutoplayNext,
  isTheaterMode = false,
  onToggleTheaterMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playbackActivated, setPlaybackActivated] = useState<boolean>(false);
  const [isResolvingPlayback, setIsResolvingPlayback] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(video.duration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [isHovering, setIsHovering] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'info' | 'technical'>('info');
  const [activeSrc, setActiveSrc] = useState<string>(video.videoUrl);
  const [triedProxy, setTriedProxy] = useState<boolean>(false);
  const [isUsingEmbedFallback, setIsUsingEmbedFallback] = useState<boolean>(false);

  // 5 Load-Handling Optimizations State
  const [hasActivatedEmbed, setHasActivatedEmbed] = useState<boolean>(false);
  const [useFacadeMode, setUseFacadeMode] = useState<boolean>(true);
  const [isDataSaverPreload, setIsDataSaverPreload] = useState<boolean>(false);
  const [playerEngineMode, setPlayerEngineMode] = useState<'custom' | 'native'>('custom');
  const [abrLevels, setAbrLevels] = useState<Array<{ index: number; label: string; height: number; bitrate: number }>>([]);
  const [selectedAbrIndex, setSelectedAbrIndex] = useState<number>(-1);
  const [activeAbrQuality, setActiveAbrQuality] = useState<string>('Auto (ABR)');
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

  // Studio Equalizer & Audio Enhancer State
  const [eqSettings, setEqSettings] = useState<EqualizerSettings>(DEFAULT_EQ_SETTINGS);
  const [isEqOpen, setIsEqOpen] = useState<boolean>(false);

  // Frame Capture Snapshot State
  const [capturedSnapshot, setCapturedSnapshot] = useState<SnapshotData | null>(null);

  // Sleep Timer State
  const [isSleepModalOpen, setIsSleepModalOpen] = useState<boolean>(false);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState<number | null>(null);

  // A-B Looper State
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isAbLoopActive, setIsAbLoopActive] = useState<boolean>(false);

  // Web Audio Context & Node Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // HLS stream management for Live TV & Federated PeerTube (Adaptive Bitrate Streaming)
  const isHlsStream =
    video.playerType !== 'embed' &&
    !video.embedUrl?.includes('/embed/') &&
    !activeSrc?.includes('/embed/') &&
    (Boolean(activeSrc && activeSrc.includes('.m3u8')) ||
      video.playerType === 'hls' ||
      (video.source === 'livetv' && Boolean(activeSrc && !activeSrc.includes('/embed/'))));

  // Dynamic Hls.js loader & session management
  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!playbackActivated) return;

    let isSubscribed = true;

    if (isHlsStream && videoRef.current && activeSrc) {
      import('hls.js')
        .then(({ default: HlsClass }) => {
          if (!isSubscribed || !videoRef.current) return;

          if (HlsClass.isSupported()) {
            const hls = new HlsClass({
              enableWorker: true,
              lowLatencyMode: true,
              capLevelToPlayerSize: true,
              startLevel: -1,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              maxBufferSize: 30 * 1024 * 1024,
              abrEwmaDefaultEstimate: 500000,
            });
            hlsRef.current = hls;
            hls.loadSource(activeSrc);
            hls.attachMedia(videoRef.current);

            hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
              if (!isSubscribed) return;
              setHasError(false);
              setIsBuffering(false);
              videoRef.current?.play().catch(() => {});
              setIsPlaying(true);
              if (hls.levels && hls.levels.length > 0) {
                const lvls = hls.levels.map((lvl, idx) => ({
                  index: idx,
                  height: lvl.height,
                  width: lvl.width,
                  bitrate: lvl.bitrate,
                  label: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`,
                }));
                setAbrLevels(lvls);
              }
            });

            hls.on(HlsClass.Events.LEVEL_SWITCHED, (_event, data) => {
              const currentLvl = hls.levels[data.level];
              if (currentLvl) {
                const res = currentLvl.height ? `${currentLvl.height}p` : `${Math.round(currentLvl.bitrate / 1000)}k`;
                setActiveAbrQuality(hls.autoLevelEnabled ? `Auto (${res})` : res);
              }
            });

            hls.on(HlsClass.Events.ERROR, (_event, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case HlsClass.ErrorTypes.NETWORK_ERROR:
                    console.warn('HLS Network error: checking if proxy relay can rescue stream...');
                    if (!activeSrc.startsWith('/api/videos/proxy') && activeSrc.startsWith('http')) {
                      hls.destroy();
                      setTriedProxy(true);
                      setActiveSrc(`/api/videos/proxy?url=${encodeURIComponent(activeSrc)}`);
                    } else if (video.embedUrl && !isUsingEmbedFallback) {
                      console.log('Proxy/HLS failed; auto-switching to live embed stream fallback...');
                      hls.destroy();
                      setIsUsingEmbedFallback(true);
                      setHasError(false);
                      setIsBuffering(false);
                    } else {
                      hls.destroy();
                      handleVideoError();
                    }
                    break;
                  case HlsClass.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                  default:
                    hls.destroy();
                    handleVideoError();
                    break;
                }
              }
            });
          } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = activeSrc;
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        })
        .catch((err) => {
          console.warn('Hls dynamic import error:', err);
        });
    }

    return () => {
      isSubscribed = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeSrc, isHlsStream, playbackActivated]);

  // Reset state when video changes
  useEffect(() => {
    const isLive = video.source === 'livetv' || (video.metadata as any)?.isLive;
    setPlaybackActivated(Boolean(isLive));
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(video.duration || 0);
    setHasError(false);
    setIsBuffering(false);

    // Auto-proxy external HLS / Live TV streams to eliminate CORS, mixed-content, and CDN hotlink blocks
    const rawSrc = video.playbackUrl || video.videoUrl || '';
    let initialSrc = rawSrc;
    if (
      initialSrc &&
      initialSrc.startsWith('http') &&
      !initialSrc.startsWith('/api/videos/proxy') &&
      (initialSrc.includes('.m3u8') || video.playerType === 'hls' || video.source === 'livetv')
    ) {
      initialSrc = `/api/videos/proxy?url=${encodeURIComponent(initialSrc)}`;
    }

    setActiveSrc(initialSrc);
    setTriedProxy(Boolean(initialSrc.startsWith('/api/videos/proxy')));
    setIsUsingEmbedFallback(false);
    setHasActivatedEmbed(Boolean(isLive));
    setSelectedAbrIndex(-1);
    setActiveAbrQuality('Auto (ABR)');
    setAbrLevels([]);
    setShowQualityMenu(false);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = playbackSpeed;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [video.id, video.videoUrl, video.duration, playbackSpeed]);

  // Explicit user-driven playback activation & on-demand stream resolution
  const activatePlayback = useCallback(async () => {
    setPlaybackActivated(true);
    setHasActivatedEmbed(true);

    const provider = (video as any).provider || video.source;
    if (!video.playbackUrl && !activeSrc && video.playerType !== 'audio' && video.playerType !== 'asset3d') {
      setIsResolvingPlayback(true);
      try {
        const host = (video as any).metadata?.host;
        const res = await fetch(
          `/api/videos/resolve?id=${encodeURIComponent(video.id)}&provider=${encodeURIComponent(provider)}&host=${encodeURIComponent(host || '')}`
        );
        if (res.ok) {
          const resolved = await res.json();
          if (resolved?.playbackUrl) {
            setActiveSrc(resolved.playbackUrl);
          } else if (resolved?.embedUrl) {
            setIsUsingEmbedFallback(true);
          }
        }
      } catch (err) {
        console.warn('Playback resolution failed:', err);
      } finally {
        setIsResolvingPlayback(false);
      }
    }

    if (videoRef.current && !isHlsStream) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [video, activeSrc, isHlsStream]);

  const handleVideoError = () => {
    // 1. If remote stream failed and haven't tried proxy yet, try the backend CORS streaming proxy
    let cleanSrc = activeSrc;
    if (cleanSrc && !cleanSrc.startsWith('http://') && !cleanSrc.startsWith('https://') && !cleanSrc.startsWith('/')) {
      cleanSrc = `https://${cleanSrc}`;
    }
    if (!triedProxy && cleanSrc && (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) && !cleanSrc.startsWith('/api/videos/proxy')) {
      console.log('Attempting proxy stream fallback for:', cleanSrc);
      setTriedProxy(true);
      setActiveSrc(`/api/videos/proxy?url=${encodeURIComponent(cleanSrc)}`);
      setHasError(false);
      return;
    }

    // 2. If video has an embedUrl or can be played in iframe embed, seamlessly switch to embed mode!
    const potentialEmbed = video.embedUrl || (activeSrc && (activeSrc.includes('/embed/') || activeSrc.includes('/videos/embed/')) ? activeSrc : null);
    if (potentialEmbed && !isUsingEmbedFallback) {
      console.log('Direct video file failed; seamlessly falling back to embed player...');
      setIsUsingEmbedFallback(true);
      setHasError(false);
      setIsBuffering(false);
      return;
    }

    // 3. Final fallback to embed if available
    if (video.embedUrl && !isUsingEmbedFallback) {
      setIsUsingEmbedFallback(true);
      setHasError(false);
      setIsBuffering(false);
      return;
    }

    setHasError(true);
    setIsBuffering(false);
  };

  const isProxied = Boolean(activeSrc && activeSrc.startsWith('/api/videos/proxy'));

  const toggleProxyTunnel = () => {
    if (isProxied) {
      const original = video.playbackUrl || video.videoUrl;
      setActiveSrc(original);
      setTriedProxy(false);
    } else {
      let clean = activeSrc || video.playbackUrl || video.videoUrl;
      if (clean && !clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
        clean = `https://${clean}`;
      }
      if (clean) {
        setTriedProxy(true);
        setActiveSrc(`/api/videos/proxy?url=${encodeURIComponent(clean)}`);
        setHasError(false);
      }
    }
  };

  const openInCleanTab = () => {
    const rawTarget = video.embedUrl || video.sourceUrl || video.videoUrl || activeSrc;
    if (!rawTarget) return;
    const target = rawTarget.startsWith('http') ? rawTarget : `https://${rawTarget}`;
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const togglePlay = () => {
    if (video.playerType === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setHasError(true));
      }
      setIsPlaying(!isPlaying);
      return;
    }

    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          setHasError(true);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (video.playerType === 'audio' && audioRef.current) {
      audioRef.current.currentTime = targetTime;
    } else if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const skipTime = (delta: number) => {
    const media = video.playerType === 'audio' ? audioRef.current : videoRef.current;
    if (!media) return;
    const newTime = Math.max(0, Math.min(media.currentTime + delta, duration || 99999));
    media.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) videoRef.current.volume = newVolume;
    if (audioRef.current) audioRef.current.volume = newVolume;
  };

  const toggleMute = () => {
    const media = video.playerType === 'audio' ? audioRef.current : videoRef.current;
    if (!media) return;
    if (isMuted) {
      media.volume = volume > 0 ? volume : 0.5;
      setIsMuted(false);
    } else {
      media.volume = 0;
      setIsMuted(true);
    }
  };

  const setSpeed = (speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.warn('Fullscreen error:', err));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.warn('Exit fullscreen error:', err));
    }
  }, []);

  const toggleLoop = () => {
    const nextState = !isLooping;
    setIsLooping(nextState);
    if (videoRef.current) videoRef.current.loop = nextState;
    if (audioRef.current) audioRef.current.loop = nextState;
  };

  // Web Audio Studio Initializer
  const initWebAudio = useCallback(() => {
    const el = videoRef.current || audioRef.current;
    if (!el || sourceNodeRef.current) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const src = ctx.createMediaElementSource(el);
      sourceNodeRef.current = src;

      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 100;
      bass.gain.value = eqSettings.enabled ? eqSettings.bass : 0;
      bassFilterRef.current = bass;

      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;
      mid.gain.value = eqSettings.enabled ? eqSettings.mid : 0;
      midFilterRef.current = mid;

      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 6000;
      treble.gain.value = eqSettings.enabled ? eqSettings.treble : 0;
      trebleFilterRef.current = treble;

      const comp = ctx.createDynamicsCompressor();
      compressorRef.current = comp;

      src.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(comp);
      comp.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio initialization note (element connected or CORS restriction):', e);
    }
  }, [eqSettings]);

  // Synchronize Web Audio filter gains with state
  useEffect(() => {
    if (eqSettings.enabled) {
      initWebAudio();
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    }
    if (bassFilterRef.current) {
      bassFilterRef.current.gain.value = eqSettings.enabled ? eqSettings.bass : 0;
    }
    if (midFilterRef.current) {
      midFilterRef.current.gain.value = eqSettings.enabled ? eqSettings.mid : 0;
    }
    if (trebleFilterRef.current) {
      trebleFilterRef.current.gain.value = eqSettings.enabled ? eqSettings.treble : 0;
    }
  }, [eqSettings, initWebAudio]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepRemainingSeconds === null) return;
    if (sleepRemainingSeconds <= 0) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      setSleepRemainingSeconds(null);
      return;
    }
    const interval = setInterval(() => {
      setSleepRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepRemainingSeconds]);

  // High-Precision Frame Capture Snapshot
  const handleCaptureSnapshot = () => {
    const vid = videoRef.current;
    if (!vid) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth || 1280;
      canvas.height = vid.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedSnapshot({
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        timestamp: currentTime,
        title: video.title,
      });
    } catch (err) {
      console.warn('Direct frame capture note (remote cross-origin restriction):', err);
      // Fallback: open clean tab where full screenshot can be made without sandbox
      alert('Frame snapshot from this remote stream is protected by CORS cross-origin headers. You can click "Open in Unrestricted Tab" to capture high-res stills.');
    }
  };

  // A-B Looper Handlers
  const handleSetLoopA = () => {
    setLoopA(currentTime);
    if (loopB !== null && currentTime >= loopB) {
      setLoopB(null);
      setIsAbLoopActive(false);
    }
  };

  const handleSetLoopB = () => {
    if (loopA === null || currentTime <= loopA) {
      setLoopA(0);
      setLoopB(currentTime);
    } else {
      setLoopB(currentTime);
    }
    setIsAbLoopActive(true);
  };

  const handleClearAbLoop = () => {
    setLoopA(null);
    setLoopB(null);
    setIsAbLoopActive(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (autoplayNext && onVideoEnd) {
      onVideoEnd();
    }
  };

  const handleMouseMove = () => {
    setIsHovering(true);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (isPlaying) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovering(false);
        setShowSpeedMenu(false);
      }, 2500);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        toggleLoop();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipTime(10);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, toggleFullscreen]);

  // Source badges
  const getSourceBadge = () => {
    switch (video.source) {
      case 'livetv':
        return { label: 'Live TV', sub: 'Broadcast Stream', bg: 'bg-rose-600/20 text-rose-300 border-rose-500/40' };
      case 'radio':
        return { label: 'Live Radio', sub: 'Radio Browser', bg: 'bg-violet-600/20 text-violet-300 border-violet-500/40' };
      case 'peertube':
        return { label: 'PeerTube', sub: 'Federated Video', bg: 'bg-orange-600/20 text-orange-300 border-orange-500/40' };
      case 'youtube':
        return { label: 'YouTube', sub: 'Streaming API', bg: 'bg-red-600/20 text-red-300 border-red-500/40' };
      case 'archive':
      case 'archivewatch':
        return { label: 'Internet Archive', sub: 'Digital Library', bg: 'bg-amber-600/20 text-amber-300 border-amber-500/40' };
      case 'featurefilms':
        return { label: 'Classic Feature Film', sub: 'Public Domain Cinema', bg: 'bg-amber-600/20 text-amber-300 border-amber-500/40' };
      case 'classiccartoons':
        return { label: 'Classic Cartoons', sub: 'Golden-Age Animation', bg: 'bg-orange-600/20 text-orange-300 border-orange-500/40' };
      case 'tvnews':
        return { label: 'TV News Archive', sub: 'Broadcast Journalism', bg: 'bg-red-600/20 text-red-300 border-red-500/40' };
      case 'computerchronicles':
        return { label: 'Computer Chronicles', sub: 'Tech History Vault', bg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40' };
      case 'nasa':
      case 'nasasvs':
        return { label: 'NASA Video', sub: 'Space Exploration', bg: 'bg-blue-600/20 text-blue-300 border-blue-500/40' };
      case 'wikimedia':
        return { label: 'Wikimedia Commons', sub: 'Open Media', bg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40' };
      case 'openverse':
        return { label: 'Openverse', sub: 'CC Index', bg: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40' };
      case 'pexels':
        return { label: 'Pexels Video', sub: 'Stock Library', bg: 'bg-teal-600/20 text-teal-300 border-teal-500/40' };
      case 'pixabay':
        return { label: 'Pixabay Video', sub: 'Stock Media', bg: 'bg-green-600/20 text-green-300 border-green-500/40' };
      case 'vimeo':
        return { label: 'Vimeo', sub: 'HD Video', bg: 'bg-sky-600/20 text-sky-300 border-sky-500/40' };
      case 'coverr':
        return { label: 'Coverr Video', sub: 'Stock API', bg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40' };
      case 'loc':
        return { label: 'Library of Congress', sub: 'National Archive', bg: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40' };
      case 'dvids':
        return { label: 'DVIDS Hub', sub: 'U.S. Defense Media', bg: 'bg-slate-600/20 text-slate-300 border-slate-500/40' };
      case 'europeana':
        return { label: 'Europeana', sub: 'EU Heritage', bg: 'bg-purple-600/20 text-purple-300 border-purple-500/40' };
      case 'dailymotion':
        return { label: 'Dailymotion', sub: 'Global Platform', bg: 'bg-blue-600/20 text-blue-300 border-blue-500/40' };
      case 'itunes':
        return { label: 'Apple Music Video', sub: 'Apple HD Preview', bg: 'bg-pink-600/20 text-pink-300 border-pink-500/40' };
      case 'audius':
        return { label: 'Audius Music', sub: 'Decentralized Audio', bg: 'bg-purple-600/20 text-purple-300 border-purple-500/40' };
      case 'somafm':
        return { label: 'SomaFM Radio', sub: 'Live Broadcast', bg: 'bg-amber-600/20 text-amber-300 border-amber-500/40' };
      case 'openmovie':
        return { label: 'Open Cinema', sub: 'Creative Commons 4K', bg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40' };
      case 'freetouse':
        return { label: 'Free To Use API', sub: 'Royalty-Free Audio', bg: 'bg-teal-600/20 text-teal-300 border-teal-500/40' };
      case 'everyfilm':
        return { label: 'every.film', sub: 'Open Film DB', bg: 'bg-rose-600/20 text-rose-300 border-rose-500/40' };
      case 'polyhaven':
        return { label: 'Poly Haven API', sub: 'CC0 3D Models', bg: 'bg-orange-600/20 text-orange-300 border-orange-500/40' };
      case 'tedtalks':
        return { label: 'TED Talks CC', sub: 'Inspiring Ideas', bg: 'bg-red-600/20 text-red-300 border-red-500/40' };
      case 'otradio':
        return { label: 'Old Time Radio', sub: 'Radio Drama', bg: 'bg-amber-600/20 text-amber-300 border-amber-500/40' };
      case 'prelinger':
        return { label: 'Prelinger Vault', sub: 'Historic Americana', bg: 'bg-orange-600/20 text-orange-300 border-orange-500/40' };
      case 'freemusic':
        return { label: 'Free Music Archive', sub: 'Royalty-Free Audio', bg: 'bg-purple-600/20 text-purple-300 border-purple-500/40' };
      case 'laionbvd':
        return { label: 'LAION-BVD', sub: 'AI Video Dataset', bg: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40' };
      default:
        return { label: video.sourceLabel || video.sourceName || 'Open Media', sub: 'Normalized', bg: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
    }
  };

  const badge = getSourceBadge();
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getCleanEmbedUrl = (url?: string | null, forceAutoplay: boolean = false) => {
    if (!url) return '';
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
      clean = `https://${clean}`;
    }
    // Auto-enable autoplay in embed where supported or when user activated facade
    if ((forceAutoplay || clean.includes('tilvids.com') || clean.includes('peertube') || clean.includes('/videos/embed/')) && !clean.includes('autoplay=')) {
      clean += (clean.includes('?') ? '&' : '?') + 'autoplay=1&muted=0';
    }
    return clean;
  };

  const isEmbedPlayer =
    isUsingEmbedFallback ||
    video.playerType === 'embed' ||
    Boolean(video.embedUrl && (!video.playbackUrl || !activeSrc || activeSrc.includes('/embed/'))) ||
    Boolean(
      activeSrc &&
        (activeSrc.includes('/videos/embed/') ||
          activeSrc.includes('youtube.com/embed') ||
          activeSrc.includes('player.vimeo.com') ||
          activeSrc.includes('geo.dailymotion.com') ||
          activeSrc.includes('dailymotion.com/embed') ||
          activeSrc.includes('archive.org/embed'))
    );

  return (
    <div
      className={`w-full bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 transition-all ${
        isTheaterMode ? 'max-w-none' : ''
      }`}
    >
      {/* Media Screen Container */}
      <div
        id="video-player-container"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setIsHovering(false)}
        className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden select-none group"
      >
        {/* Audio Player Mode (Free To Use API / Openverse Sound) */}
        {video.playerType === 'audio' ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-neutral-900 via-neutral-950 to-teal-950/40">
            <audio
              ref={audioRef}
              src={
                (typeof video.audioUrl === 'string' && video.audioUrl.trim()) ||
                (typeof video.videoUrl === 'string' && video.videoUrl.trim()) ||
                undefined
              }
              onTimeUpdate={() => {
                if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (audioRef.current) setDuration(audioRef.current.duration || video.duration);
              }}
              onEnded={handleEnded}
              onPlaying={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Vinyl / Waveform visual */}
            <div className="relative mb-6">
              <div
                className={`w-32 h-32 sm:w-44 sm:h-44 rounded-full border-4 border-teal-500/30 shadow-2xl flex items-center justify-center bg-neutral-900 transition-transform duration-1000 ${
                  isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-teal-400/40 bg-teal-950 flex items-center justify-center">
                  <Music className="w-8 h-8 text-teal-400" />
                </div>
              </div>
              <span className="absolute -top-2 -right-2 px-2.5 py-1 bg-teal-500 text-neutral-950 font-black text-xs rounded-full shadow-lg">
                AUDIO
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-neutral-100 text-center max-w-xl mb-1">
              {video.title}
            </h3>
            <p className="text-sm text-teal-400/90 font-medium mb-3">
              {video.channel} • {video.audioGenre || (video.source === 'radio' ? 'Live Radio Stream' : 'Royalty-Free Soundtrack')}
              {video.bpm ? ` • ${video.bpm} BPM` : ''}
              {video.bitrate ? ` • ${video.bitrate} kbps` : ''}
            </p>

            {/* Audio waveform equalizer bars */}
            <div className="flex items-center justify-center gap-1 my-3 h-8">
              {[40, 75, 100, 60, 85, 45, 95, 70, 50, 80, 65, 90].map((h, idx) => (
                <span
                  key={idx}
                  className={`w-1 bg-teal-400 rounded-full transition-all duration-300 ${
                    isPlaying ? 'animate-pulse' : 'h-2 opacity-40'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(8, (h * ((idx % 3) + 1)) % 32)}px` : '6px',
                    animationDelay: `${idx * 80}ms`,
                  }}
                />
              ))}
            </div>

            {/* Audio center playback button */}
            <button
              id="audio-play-center-btn"
              onClick={togglePlay}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-full font-semibold flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{isPlaying ? 'Pause Track' : 'Play Track'}</span>
            </button>
          </div>
        ) : video.playerType === 'asset3d' ? (
          /* 3D Asset Turntable Mode (Poly Haven) */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-neutral-900 to-neutral-950">
            <img
              src={
                (typeof video.thumbnailUrl === 'string' && video.thumbnailUrl.trim()) ||
                (typeof video.thumbnail === 'string' && video.thumbnail.trim()) ||
                'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=640&auto=format&fit=crop&q=80'
              }
              alt={video.title}
              className="max-h-[70%] object-contain drop-shadow-2xl rounded-lg"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-3 py-1 bg-orange-600/30 border border-orange-500/50 text-orange-300 font-semibold text-xs rounded-lg flex items-center gap-1.5">
                <Box className="w-4 h-4" />
                <span>CC0 3D Model</span>
              </span>
              {video.polyCount && (
                <span className="px-3 py-1 bg-neutral-800/80 border border-neutral-700 text-neutral-200 text-xs rounded-lg">
                  {video.polyCount.toLocaleString()} Polygons
                </span>
              )}
            </div>
            <div className="absolute bottom-4 flex items-center gap-3">
              {video.downloadUrl && (
                <a
                  href={video.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CC0 Asset Bundle</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        ) : !playbackActivated ? (
          /* Technique 2: "Facade" Click-to-Load Preview (Zero player overhead until user intent) */
          <div
            id="video-facade-preview"
            onClick={activatePlayback}
            className="relative w-full h-full bg-neutral-950 flex items-center justify-center cursor-pointer group select-none overflow-hidden"
            title="Click to load video player"
          >
            <img
              src={
                (typeof video.thumbnailUrl === 'string' && video.thumbnailUrl.trim()) ||
                (typeof video.thumbnail === 'string' && video.thumbnail.trim()) ||
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="%23171717"><rect width="640" height="360" fill="%23171717"/><circle cx="320" cy="180" r="40" fill="%23262626"/><polygon points="312,165 335,180 312,195" fill="%23737373"/></svg>'
              }
              alt={video.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none" />

            {/* Pulsing High-Visibility Play Button */}
            <div className="relative z-10 flex flex-col items-center gap-3.5">
              <div className="relative">
                <div className="absolute -inset-2.5 rounded-full bg-red-600/30 blur-md group-hover:bg-red-600/60 animate-pulse" />
                <button
                  id="facade-play-btn"
                  aria-label="Click to load video player"
                  disabled={isResolvingPlayback}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl transition-all transform group-hover:scale-110 disabled:opacity-70"
                >
                  {isResolvingPlayback ? (
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                  )}
                </button>
              </div>

              <div className="flex flex-col items-center text-center px-4">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/40 flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Click to load player</span>
                </span>
                <span className="text-xs text-neutral-300 mt-1.5 drop-shadow font-medium">
                  {isResolvingPlayback ? 'Connecting to source stream...' : `Click anywhere to load live player`}
                </span>
              </div>
            </div>

            {/* Top & Bottom Badges on Facade */}
            <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
              <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-md ${badge.bg}`}>
                {badge.label}
              </span>
              <span className="px-2 py-0.5 bg-black/60 text-neutral-300 text-xs rounded border border-neutral-700 font-mono">
                ⚡ Facade Preview
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none text-xs text-neutral-300 drop-shadow">
              <span className="truncate max-w-[75%] font-semibold">{video.title}</span>
              {video.duration > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-black/80 font-mono text-[11px] border border-neutral-800">
                  {formatDuration(video.duration)}
                </span>
              )}
            </div>
          </div>
        ) : isEmbedPlayer ? (
          /* Responsive Iframe for Embed Providers with Native Lazy Loading */
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <iframe
              id="embed-player-iframe"
              src={getCleanEmbedUrl(video.embedUrl || activeSrc, true)}
              title={video.title}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          /* Standard Full-Feature Optimized HTML5 Video Player */
          <>
            <video
              id="main-screen-video"
              ref={videoRef}
              src={isHlsStream ? undefined : (typeof activeSrc === 'string' && activeSrc.trim()) || undefined}
              poster={
                (typeof video.thumbnailUrl === 'string' && video.thumbnailUrl.trim()) ||
                (typeof video.thumbnail === 'string' && video.thumbnail.trim()) ||
                undefined
              }
              preload={isDataSaverPreload ? 'none' : 'metadata'}
              playsInline
              controls={playerEngineMode === 'native'}
              className="w-full h-full object-contain cursor-pointer"
              onClick={playerEngineMode === 'native' ? undefined : togglePlay}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  const curr = videoRef.current.currentTime;
                  setCurrentTime(curr);
                  if (isAbLoopActive && loopA !== null && loopB !== null && curr >= loopB) {
                    videoRef.current.currentTime = loopA;
                  }
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration || video.duration);
              }}
              onEnded={handleEnded}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsBuffering(false);
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onError={handleVideoError}
            />

            {/* Resilient Error Overlay */}
            {hasError && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-20">
                <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
                <h3 className="text-lg font-bold text-neutral-100 mb-1">Playback Recovery & Bypass</h3>
                <p className="text-sm text-neutral-400 max-w-md mb-4">
                  Stream connection was blocked or interrupted by the remote host. You can tunnel via the server proxy relay, switch to embedded player, or launch in an unrestricted tab.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    id="player-force-proxy-btn"
                    onClick={toggleProxyTunnel}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg"
                  >
                    <RadioIcon className="w-3.5 h-3.5" />
                    <span>{isProxied ? 'Disable Proxy Relay' : 'Tunnel via Server Proxy'}</span>
                  </button>

                  {(video.embedUrl || (activeSrc && activeSrc.includes('/embed/'))) && (
                    <button
                      id="player-switch-embed-btn"
                      onClick={() => {
                        setIsUsingEmbedFallback(true);
                        setHasError(false);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Switch to Embedded Player</span>
                    </button>
                  )}

                  <button
                    id="player-open-tab-btn"
                    onClick={openInCleanTab}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Unrestricted Tab</span>
                  </button>

                  <a
                    href={video.sourceUrl || (video.videoUrl?.startsWith('http') ? video.videoUrl : `https://${video.videoUrl}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border border-neutral-700"
                  >
                    <span>Provider Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {onVideoEnd && (
                    <button
                      onClick={onVideoEnd}
                      className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Next Video
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Center Play Button Overlay (when custom controls active) */}
            {playerEngineMode === 'custom' && !isPlaying && !hasError && (
              <button
                id="player-center-play-btn"
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 bg-black/60 hover:bg-red-600/90 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all transform hover:scale-110 shadow-2xl z-10"
                aria-label="Play video"
              >
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
              </button>
            )}

            {/* Top Bar on Hover (when custom controls active) */}
            {playerEngineMode === 'custom' && (
              <div
                className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-10 pointer-events-none ${
                  isHovering || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0'
                }`}
              >
                <div className="flex items-center gap-2 max-w-[75%]">
                  <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-md ${badge.bg}`}>
                    {badge.label}
                  </span>
                  {video.isLive && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      LIVE
                    </span>
                  )}
                  <span className="text-sm font-semibold text-neutral-200 truncate drop-shadow-md">
                    {video.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 text-neutral-300 hover:text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-sm transition-colors"
                    title="Share link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Controls Bar (Custom skin) */}
            {playerEngineMode === 'custom' && (
              <div
                className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-2 transition-opacity duration-300 z-10 ${
                  isHovering || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Progress Slider */}
                <div className="relative group/progress flex items-center">
                  <input
                    id="video-progress-scrubber"
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 group-hover/progress:h-2.5 bg-neutral-700/60 accent-red-600 rounded-lg appearance-none cursor-pointer transition-all"
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between text-neutral-200 text-sm">
                  {/* Left group */}
                  <div className="flex items-center gap-2 sm:gap-4">
                    <button
                      id="play-pause-btn"
                      onClick={togglePlay}
                      className="p-1.5 hover:text-white transition-colors"
                      title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    <button
                      onClick={() => skipTime(-10)}
                      className="p-1.5 hover:text-white transition-colors"
                      title="Rewind 10s (Left Arrow)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => skipTime(10)}
                      className="p-1.5 hover:text-white transition-colors"
                      title="Forward 10s (Right Arrow)"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-1.5 group/vol">
                      <button
                        id="volume-mute-btn"
                        onClick={toggleMute}
                        className="p-1.5 hover:text-white transition-colors"
                        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input
                        id="video-volume-slider"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-14 sm:w-20 h-1 bg-neutral-600 accent-neutral-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Time Counter */}
                    <div className="text-xs font-mono text-neutral-300 ml-1">
                      <span>{formatDuration(currentTime)}</span>
                      <span className="mx-1 text-neutral-500">/</span>
                      <span>{formatDuration(duration)}</span>
                    </div>
                  </div>

                  {/* Right group */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Loop Toggle */}
                    <button
                      onClick={toggleLoop}
                      className={`p-1.5 rounded transition-colors ${
                        isLooping ? 'text-red-500' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                      title={isLooping ? 'Looping enabled (L)' : 'Loop disabled (L)'}
                    >
                      <Repeat className="w-4 h-4" />
                    </button>

                    {/* Speed Selector */}
                    <div className="relative">
                      <button
                        id="speed-menu-btn"
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="px-2 py-1 bg-neutral-800/80 hover:bg-neutral-700/80 rounded text-xs font-mono flex items-center gap-1 transition-colors"
                      >
                        <Gauge className="w-3.5 h-3.5" />
                        <span>{playbackSpeed}x</span>
                      </button>

                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-1 flex flex-col gap-0.5 z-30 min-w-[70px]">
                          {SPEED_OPTIONS.map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setSpeed(speed)}
                              className={`px-2 py-1 text-left text-xs font-mono rounded hover:bg-neutral-800 ${
                                playbackSpeed === speed ? 'text-red-400 font-bold bg-neutral-800/50' : 'text-neutral-300'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Adaptive Bitrate Streaming (ABR) Selector */}
                    {(isHlsStream || abrLevels.length > 0) && (
                      <div className="relative">
                        <button
                          id="abr-quality-menu-btn"
                          onClick={() => setShowQualityMenu(!showQualityMenu)}
                          className="px-2 py-1 bg-neutral-800/80 hover:bg-neutral-700/80 rounded text-xs font-mono flex items-center gap-1 transition-colors text-emerald-300 border border-emerald-500/30"
                          title="Adaptive Bitrate Streaming Quality (HLS ABR)"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{activeAbrQuality}</span>
                        </button>

                        {showQualityMenu && (
                          <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-1 flex flex-col gap-0.5 z-30 min-w-[120px]">
                            <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 border-b border-neutral-800 uppercase tracking-wider flex items-center justify-between">
                              <span>ABR Quality</span>
                              <span className="text-emerald-400 font-mono text-[9px]">HLS ABR</span>
                            </div>
                            <button
                              onClick={() => {
                                if (hlsRef.current) {
                                  hlsRef.current.currentLevel = -1;
                                  setActiveAbrQuality('Auto (ABR)');
                                }
                                setSelectedAbrIndex(-1);
                                setShowQualityMenu(false);
                              }}
                              className={`px-2 py-1 text-left text-xs font-mono rounded hover:bg-neutral-800 flex items-center justify-between ${
                                selectedAbrIndex === -1 ? 'text-emerald-400 font-bold bg-neutral-800/60' : 'text-neutral-300'
                              }`}
                            >
                              <span>Auto (ABR)</span>
                              {selectedAbrIndex === -1 && <Check className="w-3 h-3" />}
                            </button>
                            {abrLevels.map((lvl) => (
                              <button
                                key={lvl.index}
                                onClick={() => {
                                  if (hlsRef.current) {
                                    hlsRef.current.currentLevel = lvl.index;
                                    setActiveAbrQuality(lvl.label);
                                  }
                                  setSelectedAbrIndex(lvl.index);
                                  setShowQualityMenu(false);
                                }}
                                className={`px-2 py-1 text-left text-xs font-mono rounded hover:bg-neutral-800 flex items-center justify-between ${
                                  selectedAbrIndex === lvl.index ? 'text-emerald-400 font-bold bg-neutral-800/60' : 'text-neutral-300'
                                }`}
                              >
                                <span>{lvl.label}</span>
                                {selectedAbrIndex === lvl.index && <Check className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* A-B Seamless Looper */}
                    <div className="flex items-center bg-neutral-800/80 rounded p-0.5 text-xs font-mono">
                      {loopA === null ? (
                        <button
                          onClick={handleSetLoopA}
                          className="px-1.5 py-0.5 text-[11px] text-neutral-300 hover:text-white transition-colors"
                          title="Set Loop Point A (Start)"
                        >
                          [A
                        </button>
                      ) : loopB === null ? (
                        <button
                          onClick={handleSetLoopB}
                          className="px-1.5 py-0.5 text-[11px] text-amber-400 font-bold hover:text-white transition-colors animate-pulse"
                          title="Set Loop Point B (End)"
                        >
                          B]
                        </button>
                      ) : (
                        <button
                          onClick={handleClearAbLoop}
                          className="px-1.5 py-0.5 text-[11px] text-red-400 font-bold hover:text-red-300 transition-colors flex items-center gap-0.5"
                          title="Clear A-B Loop Repeat"
                        >
                          <span>A⇄B</span>
                          <span className="text-[9px] text-neutral-400">✕</span>
                        </button>
                      )}
                    </div>

                    {/* Frame Snapshot Capture */}
                    <button
                      onClick={handleCaptureSnapshot}
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                      title="Capture High-Res Frame Snapshot"
                    >
                      <Camera className="w-4 h-4" />
                    </button>

                    {/* Web Audio Equalizer & Enhancer */}
                    <button
                      onClick={() => setIsEqOpen(true)}
                      className={`p-1.5 transition-colors relative ${
                        eqSettings.enabled
                          ? 'text-emerald-400'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                      title="Studio Audio Equalizer Rack"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      {eqSettings.enabled && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>

                    {/* Sleep Timer */}
                    <button
                      onClick={() => setIsSleepModalOpen(true)}
                      className={`p-1.5 transition-colors relative ${
                        sleepRemainingSeconds !== null
                          ? 'text-indigo-400'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                      title="Sleep Timer"
                    >
                      <Moon className="w-4 h-4" />
                      {sleepRemainingSeconds !== null && (
                        <span className="absolute -top-1 -right-1 px-1 rounded-full bg-indigo-600 text-[9px] font-mono text-white font-bold">
                          {Math.ceil(sleepRemainingSeconds / 60)}m
                        </span>
                      )}
                    </button>

                    {/* Theater Mode */}
                    {onToggleTheaterMode && (
                      <button
                        onClick={onToggleTheaterMode}
                        className={`p-1.5 transition-colors hidden sm:block ${
                          isTheaterMode ? 'text-red-400' : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                        title={isTheaterMode ? 'Standard View' : 'Theater Mode'}
                      >
                        <Tv className="w-4 h-4" />
                      </button>
                    )}

                    {/* Fullscreen */}
                    <button
                      id="fullscreen-toggle-btn"
                      onClick={toggleFullscreen}
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                      title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                    >
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Video Details & Specialized Metadata Bar */}
      <div className="p-4 sm:p-5 bg-neutral-900/95 border-t border-neutral-800 flex flex-col gap-4">
        {/* Source Specialized Banner */}
        {video.source === 'archivewatch' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Archive Watch Feature Film:</strong> 30,000+ public-domain films & classic cinema restored for open streaming.
              </span>
            </div>
            {video.director && (
              <span className="font-semibold text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded">
                Director: {video.director}
              </span>
            )}
          </div>
        )}

        {video.source === 'nasasvs' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs text-blue-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>NASA Goddard SVS:</strong> Supercomputer simulation & astrophysics planetary data visualization.
              </span>
            </div>
            <span className="text-blue-300 font-mono">NASA Science Mission Directorate</span>
          </div>
        )}

        {video.source === 'laionbvd' && video.datasetAnnotations && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-cyan-950/40 border border-cyan-800/50 rounded-xl text-xs text-cyan-200">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>LAION-BVD Open Research Video:</strong> Clip {video.datasetAnnotations.clipId} • {video.datasetAnnotations.resolution} @ {video.datasetAnnotations.fps} FPS
              </span>
            </div>
            <span className="text-cyan-300 font-mono">Model: {video.datasetAnnotations.embeddingModel}</span>
          </div>
        )}

        {/* Title, Channel and Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 border text-[11px] font-semibold rounded-md ${badge.bg}`}>
                {badge.label}
              </span>
              <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-[11px] font-medium rounded-md border border-neutral-700">
                {video.category || 'Open Media'}
              </span>
              {video.publishedAt && (
                <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {video.publishedAt}
                </span>
              )}
              {video.rating && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-[11px] font-semibold rounded-md border border-yellow-500/40 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {video.rating}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-tight leading-snug">
              {video.title}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 font-medium">
              Source: <span className="text-neutral-200 font-semibold">{video.channel}</span> • License:{' '}
              <span className="text-emerald-400">
                {typeof video.license === 'object' && video.license !== null
                  ? (video.license as any).name || 'Open License'
                  : String(video.license || 'Open License')}
              </span>
            </p>
          </div>

          {/* Action Buttons & Optimization Toggles */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {/* Direct Proxy Tunnel Relay Toggle */}
            <button
              id="toggle-proxy-tunnel-btn"
              onClick={toggleProxyTunnel}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                isProxied
                  ? 'bg-red-950/60 text-red-300 border-red-500/60 shadow-md'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
              }`}
              title="Force stream tunneling through the server proxy relay with CORS bypass and HLS segment rewriting"
            >
              <RadioIcon className={`w-3 h-3 ${isProxied ? 'text-red-400 animate-pulse' : 'text-neutral-400'}`} />
              <span>Relay: {isProxied ? 'TUNNELED (CORS Bypass)' : 'Direct Feed'}</span>
            </button>

            {/* Launch in Unrestricted Tab */}
            <button
              id="open-clean-tab-btn"
              onClick={openInCleanTab}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium border border-neutral-800 flex items-center gap-1.5 transition-colors"
              title="Launch this video/stream directly in a clean browser tab to bypass iframe security boundaries"
            >
              <ExternalLink className="w-3 h-3 text-emerald-400" />
              <span>Open in Tab</span>
            </button>

            {/* Facade Mode Toggle */}
            {isEmbedPlayer && (
              <button
                id="toggle-facade-mode-btn"
                onClick={() => setUseFacadeMode(!useFacadeMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  useFacadeMode
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
                title="Toggle Click-to-Load Facade for heavy iframes"
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Facade: {useFacadeMode ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* Native HTML5 vs Custom Skin Toggle */}
            {!isEmbedPlayer && video.playerType !== 'audio' && video.playerType !== 'asset3d' && (
              <button
                id="toggle-player-engine-btn"
                onClick={() => setPlayerEngineMode(playerEngineMode === 'custom' ? 'native' : 'custom')}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium border border-neutral-800 flex items-center gap-1.5 transition-colors"
                title="Switch between Custom Sleek Skin and Ultra-Light Minimal Native Player"
              >
                <Shield className="w-3 h-3 text-blue-400" />
                <span>{playerEngineMode === 'custom' ? 'HTML5 Custom' : 'Native Minimal'}</span>
              </button>
            )}

            {/* Data Saver / Preload None Toggle */}
            {!isEmbedPlayer && (
              <button
                id="toggle-data-saver-btn"
                onClick={() => setIsDataSaverPreload(!isDataSaverPreload)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  isDataSaverPreload
                    ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
                title="Toggle Data Saver (preload='none' vs preload='metadata')"
              >
                <Wifi className="w-3 h-3 text-amber-400" />
                <span>Preload: {isDataSaverPreload ? 'none (Data Saver)' : 'metadata'}</span>
              </button>
            )}

            {onToggleAutoplayNext && (
              <button
                id="toggle-autoplay-next-btn"
                onClick={onToggleAutoplayNext}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  autoplayNext
                    ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
                title="Automatically advance to the next item"
              >
                <div className={`w-2 h-2 rounded-full ${autoplayNext ? 'bg-red-500' : 'bg-neutral-600'}`} />
                <span>Autoplay Next</span>
              </button>
            )}

            {video.videoUrl && (
              <a
                href={video.videoUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Media Source</span>
              </a>
            )}

            {onVideoEnd && (
              <button
                onClick={onVideoEnd}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Next Item</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cast & Crew if available (Archive Watch & every.film) */}
        {video.cast && video.cast.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-neutral-800/60">
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-neutral-500" />
              Cast:
            </span>
            {video.cast.map((actor) => (
              <span
                key={actor}
                className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-xs rounded-md border border-neutral-700/80"
              >
                {actor}
              </span>
            ))}
          </div>
        )}

        {/* Tab Navigation: Description vs Load Handling & Technical Stream Specs */}
        <div className="flex items-center gap-2 border-t border-neutral-800/60 pt-3">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Synopsis & Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'technical'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>⚡ Load Handling & Technical Stream Specs</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' ? (
          <div className="text-sm text-neutral-300 leading-relaxed">
            <p>{video.description}</p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-3.5 text-xs">
            <div className="font-bold text-neutral-200 flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>5 Load-Handling Architecture Pillars Active</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                OPTIMIZED FOR SCALE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400 text-[11px] font-sans font-semibold">1. Lazy Loading</span>
                <span className="text-emerald-400 text-[11px]">
                  preload="{isDataSaverPreload ? 'none' : 'metadata'}" • loading="lazy"
                </span>
                <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
                  Browser downloads only video metadata instead of the full stream file on page load.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400 text-[11px] font-sans font-semibold">2. Facade Previews</span>
                <span className="text-emerald-400 text-[11px]">
                  {useFacadeMode ? 'Active (Saved ~1.8 MB JS)' : 'Direct Autoload'}
                </span>
                <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
                  Standard iframes deferred until user clicks Play, eliminating blocking third-party scripts.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400 text-[11px] font-sans font-semibold">3. Lightweight Player</span>
                <span className="text-emerald-400 text-[11px]">
                  {playerEngineMode === 'custom' ? 'Native HTML5 + Custom Skin' : 'Pure Browser C++ Native'}
                </span>
                <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
                  Zero bulky third-party player plugins, ensuring fast DOM render & low memory usage.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400 text-[11px] font-sans font-semibold">4. Adaptive Bitrate (ABR)</span>
                <span className="text-emerald-400 text-[11px]">
                  {isHlsStream ? `HLS.js ABR: ${activeAbrQuality}` : 'Direct HTTP Range Stream'}
                </span>
                <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
                  Tiny 2-10s chunks delivered at 360p first for instant startup, scaling up dynamically.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400 text-[11px] font-sans font-semibold">5. Free CDN Routing</span>
                <span className="text-emerald-400 text-[11px]">
                  Edge Cache-Control • 7-Day TTL
                </span>
                <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
                  CDN-Cache-Control & Cloudflare-CDN-Cache-Control headers route chunks to edge POPs.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400 text-[11px] font-sans font-semibold">Stream URI</span>
                <span className="text-neutral-300 text-[10px] truncate">
                  {activeSrc || video.videoUrl || 'Embed URL'}
                </span>
                <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
                  Provider: {video.source} • Format: {isHlsStream ? 'HLS / m3u8' : isEmbedPlayer ? 'Embed' : 'MP4'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frame Snapshot Modal */}
      <SnapshotModal
        snapshot={capturedSnapshot}
        onClose={() => setCapturedSnapshot(null)}
      />

      {/* Web Audio Equalizer Drawer */}
      <AudioEqualizerDrawer
        isOpen={isEqOpen}
        onClose={() => setIsEqOpen(false)}
        settings={eqSettings}
        onUpdateSettings={setEqSettings}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
        activeRemainingSeconds={sleepRemainingSeconds}
        onSetTimer={(mins) => setSleepRemainingSeconds(mins ? mins * 60 : null)}
      />
    </div>
  );
};
