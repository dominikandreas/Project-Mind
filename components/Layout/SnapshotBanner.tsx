
import React from 'react';

interface SnapshotBannerProps {
  currentIndex: number;
  totalSteps: number;
  hasPrevSnapshot: boolean;
  hasNextSnapshot: boolean;
  onPrevSnapshot: () => void;
  onNextSnapshot: () => void;
  onRevert: () => void;
  onExit: () => void;
}

export const SnapshotBanner: React.FC<SnapshotBannerProps> = ({
  currentIndex,
  totalSteps,
  hasPrevSnapshot,
  hasNextSnapshot,
  onPrevSnapshot,
  onNextSnapshot,
  onRevert,
  onExit,
}) => {
  return (
    <div className="bg-indigo-600 text-white px-6 py-2 flex items-center justify-between text-xs shadow-md z-30 transition-all">
      <div className="flex items-center gap-3">
        <svg className="w-4 h-4 animate-pulse shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <span className="font-bold block">Viewing Historical Snapshot</span>
          <span className="opacity-70 text-[10px]">
            Turn {currentIndex + 1} of {totalSteps}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-indigo-700/50 rounded-lg p-0.5 border border-indigo-500/50">
          <button
            onClick={onPrevSnapshot}
            disabled={!hasPrevSnapshot}
            className="p-1.5 hover:bg-indigo-600 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Snapshot"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-px h-3 bg-indigo-500/50 mx-1"></div>
          <button
            onClick={onNextSnapshot}
            disabled={!hasNextSnapshot}
            className="p-1.5 hover:bg-indigo-600 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Snapshot (or Latest)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="w-px h-4 bg-indigo-500/50 mx-1"></div>

        <button
          onClick={onRevert}
          className="bg-white/10 hover:bg-red-500/80 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-2 border border-white/10 hover:border-red-400"
          title="Revert current state to this snapshot (Truncates future chat)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Restore this State
        </button>

        <button
          onClick={onExit}
          className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-2 border border-white/10"
        >
          Exit View
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
