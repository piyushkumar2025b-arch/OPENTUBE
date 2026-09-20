import React, { useState, useEffect } from 'react';
import { History, Play, Trash2, X, Clock, CheckCircle } from 'lucide-react';
import { RecentItem, VideoItem } from '../types';
import { fetchRecents, deleteRecent, clearAllRecents, formatDuration } from '../services/videoApi';

interface RecentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayMedia: (item: VideoItem) => void;
}

export const RecentsDrawer: React.FC<RecentsDrawerProps> = ({ isOpen, onClose, onPlayMedia }) => {
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRecents();
      setRecents(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteRecent(id);
    setRecents((prev) => prev.filter((r) => r.id !== id));
  };

  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const handleClearAll = async () => {
    await clearAllRecents();
    setRecents([]);
    setConfirmClear(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600/20 text-red-400 rounded-xl border border-red-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Watch History & Recents</h2>
              <p className="text-xs text-neutral-400">
                Persistent local database • {recents.length} tracked session{recents.length !== 1 ? 's' : ''}
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

        {/* Clear All Toolbar */}
        {recents.length > 0 && (
          <div className="px-4 py-2.5 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">
              Playback positions are auto-saved
            </span>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-400">Are you sure?</span>
                <button
                  onClick={handleClearAll}
                  className="text-xs px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded font-medium"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="text-xs px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500 text-xs flex items-center justify-center gap-2">
              <History className="w-4 h-4 animate-spin" />
              <span>Loading recent sessions...</span>
            </div>
          ) : recents.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-2">
              <History className="w-10 h-10 text-neutral-600 mb-1" />
              <p className="text-sm font-semibold text-neutral-300">No recent playback yet</p>
              <p className="text-xs text-neutral-500 max-w-xs">
                As you stream Live TV, radio, or open cinema videos, your playback progress will be saved here automatically.
              </p>
            </div>
          ) : (
            recents.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onPlayMedia(item.mediaItem);
                  onClose();
                }}
                className="group p-3 rounded-xl bg-neutral-950/60 hover:bg-neutral-800/60 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-all flex flex-col gap-2"
              >
                <div className="flex gap-3 items-center">
                  <div className="relative w-20 aspect-video rounded-lg bg-neutral-900 overflow-hidden shrink-0">
                    <img
                      src={item.mediaItem.thumbnail}
                      alt={item.mediaItem.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white fill-current" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{item.mediaItem.title}</h4>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {item.mediaItem.channel} • {item.mediaItem.sourceName || item.mediaItem.source}
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400 font-mono">
                      {item.completed ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Finished
                        </span>
                      ) : (
                        <span>
                          Resume at {formatDuration(item.currentTime)} / {formatDuration(item.duration)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition-colors"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                {item.duration > 0 && (
                  <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full"
                      style={{ width: `${Math.min(100, item.progressPercent || 0)}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
