import React, { useState, useEffect } from 'react';
import { Bookmark, Play, Trash2, X, Tag } from 'lucide-react';
import { BookmarkItem, VideoItem } from '../types';
import { fetchBookmarks, toggleBookmark } from '../services/videoApi';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayMedia: (item: VideoItem) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  onPlayMedia,
}) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBookmarks();
      setBookmarks(data);
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

  const handleRemove = async (item: BookmarkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleBookmark(item.mediaItem);
    setBookmarks((prev) => prev.filter((b) => b.id !== item.id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Saved Library & Bookmarks</h2>
              <p className="text-xs text-neutral-400">
                Persistent database • {bookmarks.length} saved item{bookmarks.length !== 1 ? 's' : ''}
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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500 text-xs flex items-center justify-center gap-2">
              <Bookmark className="w-4 h-4 animate-pulse" />
              <span>Loading saved items...</span>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-2">
              <Bookmark className="w-10 h-10 text-neutral-600 mb-1" />
              <p className="text-sm font-semibold text-neutral-300">No bookmarks saved yet</p>
              <p className="text-xs text-neutral-500 max-w-xs">
                Click the bookmark icon in the video player or cards to save media items to your private database.
              </p>
            </div>
          ) : (
            bookmarks.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onPlayMedia(item.mediaItem);
                  onClose();
                }}
                className="group p-3 rounded-xl bg-neutral-950/60 hover:bg-neutral-800/60 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-all flex items-center gap-3"
              >
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

                  <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      {item.tag || 'Saved'}
                    </span>
                    <span className="text-neutral-500">
                      {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleRemove(item, e)}
                  className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition-colors"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
