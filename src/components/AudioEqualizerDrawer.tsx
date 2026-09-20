import React from 'react';
import { Sliders, Moon, Volume2, Sparkles, X, RotateCcw } from 'lucide-react';

export interface EqualizerSettings {
  enabled: boolean;
  preset: string;
  bass: number; // dB (-12 to +12)
  mid: number;  // dB (-12 to +12)
  treble: number; // dB (-12 to +12)
  nightMode: boolean;
  gainMultiplier: number; // 1.0 to 2.0
}

export const DEFAULT_EQ_SETTINGS: EqualizerSettings = {
  enabled: false,
  preset: 'flat',
  bass: 0,
  mid: 0,
  treble: 0,
  nightMode: false,
  gainMultiplier: 1.0,
};

interface AudioEqualizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EqualizerSettings;
  onUpdateSettings: (newSettings: EqualizerSettings) => void;
}

export const AudioEqualizerDrawer: React.FC<AudioEqualizerDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handlePresetSelect = (presetKey: string) => {
    switch (presetKey) {
      case 'bass':
        onUpdateSettings({
          ...settings,
          enabled: true,
          preset: 'bass',
          bass: 8,
          mid: 1,
          treble: -1,
          nightMode: false,
        });
        break;
      case 'vocal':
        onUpdateSettings({
          ...settings,
          enabled: true,
          preset: 'vocal',
          bass: -3,
          mid: 6,
          treble: 3,
          nightMode: false,
        });
        break;
      case 'night':
        onUpdateSettings({
          ...settings,
          enabled: true,
          preset: 'night',
          bass: -2,
          mid: 4,
          treble: -2,
          nightMode: true,
        });
        break;
      case 'tube':
        onUpdateSettings({
          ...settings,
          enabled: true,
          preset: 'tube',
          bass: 5,
          mid: 2,
          treble: -4,
          nightMode: false,
        });
        break;
      case 'treble':
        onUpdateSettings({
          ...settings,
          enabled: true,
          preset: 'treble',
          bass: -1,
          mid: 2,
          treble: 7,
          nightMode: false,
        });
        break;
      case 'flat':
      default:
        onUpdateSettings({
          ...settings,
          preset: 'flat',
          bass: 0,
          mid: 0,
          treble: 0,
          nightMode: false,
        });
        break;
    }
  };

  const handleReset = () => {
    onUpdateSettings(DEFAULT_EQ_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">
              Web Audio Studio Equalizer
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Reset to Flat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master Equalizer Switch */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                settings.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
              }`}
            />
            <div>
              <span className="text-xs font-bold text-white block">
                Master EQ Processing
              </span>
              <span className="text-[11px] text-neutral-400">
                Real-time Web Audio API Biquad Filters
              </span>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ ...settings, enabled: !settings.enabled })}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              settings.enabled
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {settings.enabled ? 'ACTIVE' : 'BYPASS'}
          </button>
        </div>

        {/* Presets Grid */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Sound Profile Presets
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'flat', label: 'Flat' },
              { id: 'bass', label: 'Bass Boost' },
              { id: 'vocal', label: 'Vocal Enhance' },
              { id: 'night', label: 'Night Mode' },
              { id: 'tube', label: 'Warm Tube' },
              { id: 'treble', label: 'Treble Air' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p.id)}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  settings.preset === p.id && settings.enabled
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency Sliders */}
        <div className="space-y-3.5 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
          {/* Bass */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-neutral-300">Bass (100 Hz)</span>
              <span className="font-mono text-emerald-400">
                {settings.bass > 0 ? `+${settings.bass}` : settings.bass} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={settings.bass}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  enabled: true,
                  preset: 'custom',
                  bass: parseInt(e.target.value, 10),
                })
              }
              className="w-full h-1.5 bg-neutral-800 accent-emerald-500 rounded-lg cursor-pointer"
            />
          </div>

          {/* Mids */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-neutral-300">Mids / Vocals (1 kHz)</span>
              <span className="font-mono text-emerald-400">
                {settings.mid > 0 ? `+${settings.mid}` : settings.mid} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={settings.mid}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  enabled: true,
                  preset: 'custom',
                  mid: parseInt(e.target.value, 10),
                })
              }
              className="w-full h-1.5 bg-neutral-800 accent-emerald-500 rounded-lg cursor-pointer"
            />
          </div>

          {/* Treble */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-neutral-300">Treble / Crisp (6 kHz)</span>
              <span className="font-mono text-emerald-400">
                {settings.treble > 0 ? `+${settings.treble}` : settings.treble} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={settings.treble}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  enabled: true,
                  preset: 'custom',
                  treble: parseInt(e.target.value, 10),
                })
              }
              className="w-full h-1.5 bg-neutral-800 accent-emerald-500 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Night Mode & Compressor Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="text-xs font-bold text-white block">
                Night Mode Compression
              </span>
              <span className="text-[10px] text-neutral-400">
                Tames loud explosions while boosting dialogue
              </span>
            </div>
          </div>
          <button
            onClick={() =>
              onUpdateSettings({
                ...settings,
                enabled: true,
                nightMode: !settings.nightMode,
              })
            }
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              settings.nightMode
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            {settings.nightMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};
