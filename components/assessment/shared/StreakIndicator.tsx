import React from 'react';

interface StreakIndicatorProps {
  streak: number;
  multiplier: number;
  className?: string;
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streak, multiplier, className = '' }) => {
  if (streak < 2) return null;

  const isOnFire = streak >= 5;
  const isUnstoppable = streak >= 8;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full font-black text-sm transition-all ${
        isUnstoppable
          ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse shadow-lg shadow-orange-500/30'
          : isOnFire
          ? 'bg-gradient-to-r from-orange-400 to-yellow-400 text-white animate-bounce'
          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
      }`}>
        <span className="text-base">{isUnstoppable ? '🔥' : isOnFire ? '🔥' : '⚡'}</span>
        <span>{streak}</span>
        {multiplier > 1 && (
          <span className="text-xs opacity-80">{multiplier}x</span>
        )}
      </div>
      {isUnstoppable && (
        <span className="text-xs font-black text-red-500 uppercase tracking-wider animate-pulse">
          UNSTOPPABLE
        </span>
      )}
      {isOnFire && !isUnstoppable && (
        <span className="text-xs font-black text-orange-500 uppercase tracking-wider">
          ON FIRE
        </span>
      )}
    </div>
  );
};
