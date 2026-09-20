import React from 'react';
import { Play, CheckCircle2, Globe, Film, Music, Box, Sparkles, Database, Clock } from 'lucide-react';
import { VideoItem } from '../types';
import { formatDuration } from '../services/videoApi';

function formatPublishedDate(rawDate?: string): string | null {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const str = rawDate.trim();
  if (!str || str.toLowerCase() === 'recent') return null;

  // Already relative e.g. "3 days ago", "2 years ago"
  if (/ago/i.test(str)) {
    return str;
  }

  // Check if year only e.g. "2024", "1998"
  if (/^\d{4}$/.test(str)) {
    return str;
  }

  // Parse ISO date
  const parsed = Date.parse(str);
  if (!isNaN(parsed) && parsed > 0) {
    const diffMs = Date.now() - parsed;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Just now';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}mo ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years}y ago`;
  }

  return str;
}

interface VideoCardProps {
  video: VideoItem;
  isActive: boolean;
  onSelect?: (video: VideoItem) => void;
  onClick?: (video: VideoItem) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, isActive, onSelect, onClick }) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(video);
    } else if (onClick) {
      onClick(video);
    }
  };

  const getSourceBadge = () => {
    switch (video.source) {
      case 'youtube':
        return { label: 'YouTube', bg: 'bg-red-600 text-white font-black' };
      case 'archive':
      case 'archivewatch':
        return { label: 'Internet Archive', bg: 'bg-amber-600 text-neutral-950 font-black' };
      case 'nasa':
      case 'nasasvs':
        return { label: 'NASA Video', bg: 'bg-blue-600 text-white font-black' };
      case 'wikimedia':
        return { label: 'Wikimedia', bg: 'bg-emerald-600 text-white font-bold' };
      case 'openverse':
        return { label: 'Openverse', bg: 'bg-yellow-500 text-neutral-950 font-black' };
      case 'pexels':
        return { label: 'Pexels Video', bg: 'bg-teal-600 text-white font-bold' };
      case 'pixabay':
        return { label: 'Pixabay Video', bg: 'bg-green-600 text-white font-bold' };
      case 'vimeo':
        return { label: 'Vimeo', bg: 'bg-sky-600 text-white font-bold' };
      case 'itunes':
        return { label: 'Apple Music Video', bg: 'bg-pink-600 text-white font-bold' };
      case 'audius':
        return { label: 'Audius Music', bg: 'bg-purple-600 text-white font-bold' };
      case 'somafm':
        return { label: 'SomaFM Radio', bg: 'bg-amber-500 text-neutral-950 font-black' };
      case 'featurefilms':
        return { label: 'Classic Feature Film', bg: 'bg-amber-600 text-white font-bold' };
      case 'classiccartoons':
        return { label: 'Classic Cartoons', bg: 'bg-orange-500 text-white font-bold' };
      case 'tvnews':
        return { label: 'TV News Archive', bg: 'bg-red-600 text-white font-bold' };
      case 'computerchronicles':
        return { label: 'Computer Chronicles', bg: 'bg-emerald-600 text-white font-bold' };
      case 'coverr':
        return { label: 'Coverr Stock', bg: 'bg-emerald-600 text-white font-bold' };
      case 'loc':
        return { label: 'Library of Congress', bg: 'bg-indigo-600 text-white font-bold' };
      case 'dvids':
        return { label: 'DVIDS', bg: 'bg-slate-700 text-slate-100 font-bold' };
      case 'europeana':
        return { label: 'Europeana', bg: 'bg-purple-600 text-white font-bold' };
      case 'freetouse':
        return { label: 'Free To Use Audio', bg: 'bg-teal-600 text-white font-bold' };
      case 'everyfilm':
        return { label: 'every.film', bg: 'bg-rose-600 text-white font-bold' };
      case 'polyhaven':
        return { label: 'Poly Haven 3D', bg: 'bg-orange-600 text-white font-bold' };
      case 'laionbvd':
        return { label: 'LAION-BVD', bg: 'bg-cyan-500 text-neutral-950 font-black' };
      case 'livetv':
        return { label: 'LIVE TV', bg: 'bg-red-600 text-white font-black' };
      default:
        return { label: video.sourceLabel || video.sourceName || 'Open Media', bg: 'bg-neutral-800 text-neutral-200' };
    }
  };

  const badge = getSourceBadge();
  const licenseName =
    typeof video.license === 'object' && video.license !== null
      ? (video.license as any).name || 'Open License'
      : String(video.license || 'Open License');

  const fallbackThumb =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="%23171717"><rect width="640" height="360" fill="%23171717"/><circle cx="320" cy="180" r="40" fill="%23262626"/><polygon points="312,165 335,180 312,195" fill="%23737373"/></svg>';
  const imageSrc =
    (typeof video.thumbnailUrl === 'string' && video.thumbnailUrl.trim()) ||
    (typeof video.thumbnail === 'string' && video.thumbnail.trim()) ||
    fallbackThumb;

  return (
    <div
      id={`video-card-${video.id}`}
      onClick={handleClick}
      className={`group cursor-pointer rounded-xl overflow-hidden flex flex-col bg-neutral-900 border transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${
        isActive
          ? 'border-red-600 ring-2 ring-red-600/40 shadow-red-950/30'
          : 'border-neutral-800/80 hover:border-neutral-700'
      }`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full bg-neutral-950 overflow-hidden">
        <img
          src={imageSrc}
          alt={video.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackThumb;
          }}
        />

        {/* Source Provider Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-0.5 text-[10px] rounded shadow-md uppercase tracking-wider flex items-center gap-1 ${badge.bg}`}>
            {video.source === 'archivewatch' && <Film className="w-3 h-3" />}
            {video.source === 'freetouse' && <Music className="w-3 h-3" />}
            {video.source === 'polyhaven' && <Box className="w-3 h-3" />}
            {video.source === 'nasasvs' && <Sparkles className="w-3 h-3" />}
            {video.source === 'laionbvd' && <Database className="w-3 h-3" />}
            {badge.label}
          </span>
        </div>

        {/* Duration badge or Media Type badge */}
        {video.source === 'livetv' || video.metadata?.isLive ? (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded shadow-md flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
            <span>LIVE 2026</span>
          </div>
        ) : video.playerType === 'audio' ? (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-teal-600 text-white text-[10px] font-bold rounded shadow flex items-center gap-1">
            <Music className="w-2.5 h-2.5" />
            {video.duration > 0 ? formatDuration(video.duration) : 'AUDIO'}
          </div>
        ) : video.playerType === 'asset3d' ? (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-orange-600 text-white text-[10px] font-bold rounded shadow flex items-center gap-1">
            <Box className="w-2.5 h-2.5" />
            {video.polyCount ? `${video.polyCount.toLocaleString()} polys` : 'CC0 3D'}
          </div>
        ) : video.duration > 0 ? (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/85 text-white text-[11px] font-mono font-medium rounded shadow">
            {formatDuration(video.duration)}
          </div>
        ) : null}

        {/* Active Now Playing overlay or Hover Play Icon */}
        {isActive ? (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded flex items-center gap-1 shadow-md uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Card Content: Title & Details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <h3
            className={`font-semibold text-sm line-clamp-2 leading-snug group-hover:text-red-400 transition-colors ${
              isActive ? 'text-red-400' : 'text-neutral-100'
            }`}
            title={video.title}
          >
            {video.title}
          </h3>
          <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
            {video.channel || video.author || video.sourceName || 'Open Creator'}
          </p>
        </div>

        <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="truncate max-w-[120px] flex items-center gap-1">
            <Globe className="w-3 h-3 text-neutral-400 shrink-0" />
            <span className="truncate">{licenseName}</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {formatPublishedDate(video.publishedAt) && (
              <span className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                <Clock className="w-2.5 h-2.5 text-neutral-500" />
                {formatPublishedDate(video.publishedAt)}
              </span>
            )}
            <span className="text-neutral-400 font-medium px-1.5 py-0.5 bg-neutral-800/80 rounded">
              {video.category || 'Open Media'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
