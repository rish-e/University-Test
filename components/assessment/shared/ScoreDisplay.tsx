import React, { useState, useEffect } from 'react';

interface ScoreDisplayProps {
  score: number;
  label?: string;
  streakMultiplier?: number;
  className?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, label = 'Score', streakMultiplier, className = '' }) => {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (displayed === score) return;
    const step = score > displayed ? 1 : -1;
    const interval = setInterval(() => {
      setDisplayed(prev => {
        const next = prev + step;
        if ((step > 0 && next >= score) || (step < 0 && next <= score)) {
          clearInterval(interval);
          return score;
        }
        return next;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [score]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs uppercase tracking-wider text-text-muted font-bold">{label}</span>
      <span className="text-xl font-black text-text-main dark:text-white tabular-nums">{displayed}</span>
      {streakMultiplier && streakMultiplier > 1 && (
        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-black rounded-full animate-bounce">
          {streakMultiplier}x
        </span>
      )}
    </div>
  );
};
