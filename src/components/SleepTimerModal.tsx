import React, { useState } from 'react';
import { Timer, Moon, Check, X, BellOff } from 'lucide-react';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRemainingSeconds: number | null;
  onSetTimer: (minutes: number | null) => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  activeRemainingSeconds,
  onSetTimer,
}) => {
  const [customMinutes, setCustomMinutes] = useState('45');

  if (!isOpen) return null;

  const presets = [15, 30, 45, 60, 90];

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Sleep Timer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator */}
        {activeRemainingSeconds !== null && activeRemainingSeconds > 0 ? (
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-400 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Timer Active
                </span>
                <span className="text-xs font-mono text-indigo-300">
                  Stops in {formatTimeRemaining(activeRemainingSeconds)}
                </span>
              </div>
            </div>
            <button
              onClick={() => onSetTimer(null)}
              className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-bold border border-red-500/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-xs text-neutral-400">
            Automatically pauses playback and puts the player to sleep after your chosen duration.
          </p>
        )}

        {/* Preset Options */}
        <div className="grid grid-cols-3 gap-2">
          {presets.map((min) => (
            <button
              key={min}
              onClick={() => {
                onSetTimer(min);
                onClose();
              }}
              className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-xs font-bold text-neutral-200 hover:text-white transition-colors"
            >
              {min} mins
            </button>
          ))}
          <button
            onClick={() => {
              onSetTimer(null);
              onClose();
            }}
            className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-red-950/40 border border-neutral-800 hover:border-red-800/50 text-xs font-bold text-red-400 transition-colors"
          >
            Turn Off
          </button>
        </div>

        {/* Custom duration */}
        <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="300"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="w-20 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white text-center font-mono focus:outline-none focus:border-indigo-500"
          />
          <span className="text-xs text-neutral-400">minutes</span>
          <button
            onClick={() => {
              const val = parseInt(customMinutes, 10);
              if (!isNaN(val) && val > 0) {
                onSetTimer(val);
                onClose();
              }
            }}
            className="ml-auto px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
          >
            Set Timer
          </button>
        </div>
      </div>
    </div>
  );
};
