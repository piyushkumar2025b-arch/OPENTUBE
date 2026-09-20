import React, { useState } from 'react';
import { Camera, Download, Copy, Check, X, Sparkles } from 'lucide-react';

export interface SnapshotData {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
  title: string;
}

interface SnapshotModalProps {
  snapshot: SnapshotData | null;
  onClose: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ snapshot, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!snapshot) return null;

  const handleCopy = async () => {
    try {
      const response = await fetch(snapshot.dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback to text data URL copy if clipboard image item is blocked
      navigator.clipboard.writeText(snapshot.dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = snapshot.dataUrl;
    const cleanTitle = (snapshot.title || 'video_frame')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 30);
    a.download = `opentube_${cleanTitle}_${Math.round(snapshot.timestamp)}s.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-white text-sm sm:text-base">
              High-Precision Frame Snapshot
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono text-xs border border-neutral-700">
              {snapshot.width} × {snapshot.height}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snapshot Preview */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-neutral-800 flex items-center justify-center">
          <img
            src={snapshot.dataUrl}
            alt="Captured frame"
            className="w-full h-full object-contain"
          />
          <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 backdrop-blur text-[11px] font-mono text-neutral-200">
            {Math.floor(snapshot.timestamp / 60)}:
            {String(Math.floor(snapshot.timestamp % 60)).padStart(2, '0')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="text-xs text-neutral-400 truncate">
            {snapshot.title}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Frame!' : 'Copy to Clipboard'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-950/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
