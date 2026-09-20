import React, { useState } from 'react';
import { X, Play, Link, Sparkles, Check, AlertCircle, Radio, Tv, Film } from 'lucide-react';
import { VideoItem } from '../types';
import { parseAnyVideoUrl } from '../utils/urlParser';

interface PlayCustomUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayVideo: (video: VideoItem) => void;
}

const SAMPLE_STREAMS = [
  {
    name: 'Big Buck Bunny (4K MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'MP4 Video',
  },
  {
    name: 'Sintel Open Film (1080p MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    type: 'MP4 Video',
  },
  {
    name: 'NASA TV Official (Live HLS .m3u8)',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    type: 'Live HLS',
  },
  {
    name: 'Blender Tears of Steel (VFX Sci-Fi)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    type: 'MP4 Video',
  },
  {
    name: 'Lo-Fi Chill Hop (Live Radio Stream)',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    type: 'Audio Stream',
  },
];

export const PlayCustomUrlModal: React.FC<PlayCustomUrlModalProps> = ({
  isOpen,
  onClose,
  onPlayVideo,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [titleInput, setTitleInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePlay = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError('Please paste or enter a valid video, stream, or audio URL.');
      return;
    }

    try {
      const parsed = parseAnyVideoUrl(trimmed, titleInput.trim());
      if (!parsed) {
        setError('Unable to parse the provided video URL.');
        return;
      }
      onPlayVideo(parsed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to load video stream.');
    }
  };

  const handleSelectSample = (sampleUrl: string, sampleName: string) => {
    setUrlInput(sampleUrl);
    setTitleInput(sampleName);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="play-custom-url-modal"
        className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center">
              <Link className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Play Any Video URL</h2>
              <p className="text-xs text-neutral-400">
                Direct MP4, WebM, HLS (.m3u8), YouTube, Dailymotion, Vimeo, or Audio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handlePlay} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Stream / Video URL <span className="text-red-500">*</span>
            </label>
            <input
              id="custom-stream-url-input"
              type="text"
              placeholder="e.g. https://example.com/video.mp4 or .m3u8 or YouTube / Dailymotion link"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (error) setError(null);
              }}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Custom Title <span className="text-neutral-500 font-normal">(optional)</span>
            </label>
            <input
              id="custom-stream-title-input"
              type="text"
              placeholder="e.g. My Favorite Documentary"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-600/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-play-custom-btn"
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-red-900/30 transition-all hover:scale-[1.02]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load & Play Video</span>
            </button>
          </div>
        </form>

        {/* Quick Sample Presets */}
        <div className="border-t border-neutral-800 pt-3">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
            Quick Test Streams (100% Free & Working)
          </span>
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
            {SAMPLE_STREAMS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample.url, sample.name)}
                className="w-full text-left px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 text-xs flex items-center justify-between group transition-colors"
              >
                <span className="text-neutral-300 group-hover:text-white truncate font-medium">
                  {sample.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 shrink-0 font-mono">
                  {sample.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
