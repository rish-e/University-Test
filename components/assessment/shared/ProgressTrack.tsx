import React from 'react';

interface ProgressTrackProps {
  current: number;
  total: number;
  className?: string;
}

export const ProgressTrack: React.FC<ProgressTrackProps> = ({ current, total, className = '' }) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < current
              ? 'bg-primary w-2'
              : i === current
              ? 'bg-primary w-4 animate-pulse'
              : 'bg-gray-200 dark:bg-gray-700 w-2'
          }`}
        />
      ))}
      <span className="ml-2 text-xs font-bold text-text-muted tabular-nums">
        {current + 1}/{total}
      </span>
    </div>
  );
};
