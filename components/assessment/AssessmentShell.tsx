import React, { useState } from 'react';
import { ModuleSection } from '../../types';
import { GameTimer } from './shared/GameTimer';
import { ScoreDisplay } from './shared/ScoreDisplay';
import { StreakIndicator } from './shared/StreakIndicator';
import { XPToast } from './shared/XPToast';

interface AssessmentShellProps {
  section: ModuleSection;
  score: number;
  streak?: number;
  streakMultiplier?: number;
  children: React.ReactNode;
  onExit: () => void;
  onTimeUp: () => void;
  progress?: number; // 0-100
  xpToasts?: { id: string; amount: number; source?: string }[];
  onDismissToast?: (id: string) => void;
}

export const AssessmentShell: React.FC<AssessmentShellProps> = ({
  section, score, streak = 0, streakMultiplier = 1,
  children, onExit, onTimeUp, progress = 0,
  xpToasts = [], onDismissToast
}) => {
  const parseDuration = (duration?: string) => {
    if (!duration) return 600;
    const match = duration.match(/(\d+)/);
    return match ? parseInt(match[0]) * 60 : 600;
  };

  const [showTimeUp, setShowTimeUp] = useState(false);

  const handleExpire = () => {
    setShowTimeUp(true);
    setTimeout(() => onTimeUp(), 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background-light dark:bg-background-dark flex flex-col animate-[fadeIn_0.2s_ease-out]">
      {/* Top Bar */}
      <div className="h-16 border-b border-text-main/5 dark:border-white/5 flex items-center justify-between px-4 sm:px-6 bg-card-bg dark:bg-card-bg-dark shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h3 className="font-bold text-text-main dark:text-white text-sm sm:text-base">{section.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <StreakIndicator streak={streak} multiplier={streakMultiplier} className="hidden sm:flex" />
          <ScoreDisplay score={score} streakMultiplier={streakMultiplier} />
          <div className="text-right">
            <span className="block text-[10px] text-text-muted uppercase tracking-wider">Time</span>
            <GameTimer
              totalSeconds={parseDuration(section.duration)}
              startTime={section.startTime}
              onExpire={handleExpire}
            />
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="h-1 bg-gray-200 dark:bg-gray-800 w-full shrink-0">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Mobile streak indicator */}
      {streak >= 2 && (
        <div className="sm:hidden flex justify-center py-1 bg-card-bg dark:bg-card-bg-dark border-b border-text-main/5 dark:border-white/5">
          <StreakIndicator streak={streak} multiplier={streakMultiplier} />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        {/* XP Toasts */}
        {xpToasts.map(toast => (
          <XPToast
            key={toast.id}
            amount={toast.amount}
            source={toast.source}
            onDone={() => onDismissToast?.(toast.id)}
          />
        ))}

        {/* Time's Up Overlay */}
        {showTimeUp && (
          <div className="absolute inset-0 bg-background-light/90 dark:bg-background-dark/90 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-6xl text-text-muted mb-4">timer_off</span>
            <h2 className="text-2xl font-bold text-text-main dark:text-white mb-2">Time's Up!</h2>
            <p className="text-text-muted mb-4">Your answers are being submitted...</p>
            <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
