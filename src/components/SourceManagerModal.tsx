import React, { useState } from 'react';
import { X, ShieldCheck, CheckSquare, Square, RefreshCw, Zap, Film, Tv, Radio, Layers, Check, Key } from 'lucide-react';
import { VideoSourceId } from '../types';
import { SOURCES } from '../services/videoApi';
import { OpenverseAuthModal } from './OpenverseAuthModal';

interface SourceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSources: VideoSourceId[];
  onUpdateSelectedSources: (sources: VideoSourceId[]) => void;
}

export const SourceManagerModal: React.FC<SourceManagerModalProps> = ({
  isOpen,
  onClose,
  selectedSources,
  onUpdateSelectedSources,
}) => {
  const [isOpenverseAuthOpen, setIsOpenverseAuthOpen] = useState(false);

  if (!isOpen) return null;

  // Available selectable sources (excluding 'all' and 'custom')
  const availableSources = SOURCES.filter((s) => s.id !== 'all');

  const toggleSource = (id: VideoSourceId) => {
    if (selectedSources.includes(id)) {
      // Don't allow deselecting the very last source
      if (selectedSources.length <= 1) return;
      onUpdateSelectedSources(selectedSources.filter((s) => s !== id));
    } else {
      onUpdateSelectedSources([...selectedSources, id]);
    }
  };

  const selectAll = () => {
    onUpdateSelectedSources(availableSources.map((s) => s.id));
  };

  const selectFreeOnly = () => {
    // Sources that require no third-party keys or work completely open
    const freeOnly: VideoSourceId[] = [
      'dailymotion',
      'itunes',
      'audius',
      'somafm',
      'archivewatch',
      'featurefilms',
      'classiccartoons',
      'scifihorror',
      'silentfilms',
      'mitocw',
      'animation',
      'sportsarchive',
      'naturevids',
      'loc',
      'dvids',
      'nasasvs',
      'harvardfilm',
      'publicfilm',
      'retrogaming',
      'soundfx',
      'smithsonian',
      'tvnews',
      'computerchronicles',
      'openmovie',
      'coverr',
      'youtube',
      'pexels',
      'livetv',
      'radio',
      'peertube',
      'archive',
      'nasa',
      'wikimedia',
      'openverse',
      'tedtalks',
      'otradio',
      'prelinger',
      'freemusic',
    ];
    onUpdateSelectedSources(freeOnly);
  };

  const selectCoreOnly = () => {
    // Fast video-centric providers
    const coreOnly: VideoSourceId[] = ['youtube', 'pexels', 'dailymotion', 'openmovie', 'coverr', 'publicfilm', 'retrogaming'];
    onUpdateSelectedSources(coreOnly);
  };

  const selectCinemaOnly = () => {
    const cinema: VideoSourceId[] = [
      'featurefilms',
      'publicfilm',
      'harvardfilm',
      'archivewatch',
      'scifihorror',
      'silentfilms',
      'openmovie',
      'animation',
      'classiccartoons',
    ];
    onUpdateSelectedSources(cinema);
  };

  const selectEduDocOnly = () => {
    const eduDoc: VideoSourceId[] = [
      'mitocw',
      'tedtalks',
      'smithsonian',
      'harvardfilm',
      'nasa',
      'nasasvs',
      'naturevids',
      'loc',
      'tvnews',
      'computerchronicles',
      'prelinger',
      'wikimedia',
      'dvids',
      'sportsarchive',
    ];
    onUpdateSelectedSources(eduDoc);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="source-manager-modal"
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Active Search Sources & Quota Guard</h2>
              <p className="text-xs text-neutral-400">
                Choose exactly which APIs to query. Unselected providers are never called.
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

        {/* Quota Shield Notice Banner */}
        <div className="p-3 bg-emerald-950/40 border border-emerald-600/30 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>{selectedSources.length}</strong> of {availableSources.length} sources enabled.{' '}
              {availableSources.length - selectedSources.length > 0 && (
                <span className="text-emerald-200">
                  Remaining {availableSources.length - selectedSources.length} providers are skipped to prevent wasting API calls.
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-400 font-semibold mr-1">Quick Select:</span>
          <button
            onClick={selectCoreOnly}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium border border-neutral-700 transition-colors"
          >
            Video Core
          </button>
          <button
            onClick={selectCinemaOnly}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded-lg text-xs font-medium border border-neutral-700 transition-colors"
          >
            Movies & Cinema ({'7'})
          </button>
          <button
            onClick={selectEduDocOnly}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-sky-300 rounded-lg text-xs font-medium border border-neutral-700 transition-colors"
          >
            Documentary & STEM ({'12'})
          </button>
          <button
            onClick={selectFreeOnly}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-emerald-300 rounded-lg text-xs font-medium border border-neutral-700 transition-colors"
          >
            All Free Open ({'29'})
          </button>
          <button
            onClick={selectAll}
            className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-xs font-medium border border-red-500/30 transition-colors"
          >
            Select All ({availableSources.length})
          </button>
        </div>

        {/* Source Checkboxes Grid */}
        <div className="overflow-y-auto pr-1 flex flex-col gap-2 max-h-[48vh] scrollbar-thin">
          {availableSources.map((source) => {
            const isChecked = selectedSources.includes(source.id);
            return (
              <div
                key={source.id}
                onClick={() => toggleSource(source.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isChecked
                    ? 'bg-neutral-800/90 border-red-500/60 shadow-sm'
                    : 'bg-neutral-950/60 border-neutral-800 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={isChecked ? `Deselect ${source.name}` : `Select ${source.name}`}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-red-600 text-white' : 'border border-neutral-600 bg-neutral-900'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{source.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono">
                        {source.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                      {source.description}
                    </p>
                    {source.id === 'openverse' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpenverseAuthOpen(true);
                        }}
                        className="mt-1.5 self-start px-2 py-1 rounded-md bg-pink-950/60 hover:bg-pink-900 text-pink-300 border border-pink-700/50 text-[10px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Key className="w-3 h-3 text-pink-400" />
                        <span>API Credentials & Bearer Token (Steps 1-4)</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      isChecked
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {isChecked ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
          <span className="text-xs text-neutral-400">
            {selectedSources.length} sources will be queried on next search
          </span>
          <button
            id="apply-sources-btn"
            onClick={onClose}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-red-900/30 transition-all hover:scale-[1.02]"
          >
            <Check className="w-4 h-4" />
            <span>Apply Selected Sources</span>
          </button>
        </div>
      </div>

      {/* Nested Openverse Credentials & Token Wizard */}
      <OpenverseAuthModal
        isOpen={isOpenverseAuthOpen}
        onClose={() => setIsOpenverseAuthOpen(false)}
      />
    </div>
  );
};
