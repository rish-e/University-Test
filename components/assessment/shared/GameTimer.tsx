import React, { useState, useEffect } from 'react';

interface GameTimerProps {
  totalSeconds: number;
  startTime?: number;
  onExpire: () => void;
  className?: string;
}

export const GameTimer: React.FC<GameTimerProps> = ({ totalSeconds, startTime, onExpire, className = '' }) => {
  const getRemaining = () => {
    if (!startTime) return totalSeconds;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  };

  const [timeLeft, setTimeLeft] = useState(getRemaining);

  useEffect(() => {
    if (timeLeft <= 0) { onExpire(); return; }
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(id); onExpire(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const isUrgent = timeLeft < 60;
  const isCritical = timeLeft < 15;

  return (
    <div className={`font-mono font-bold text-lg ${isCritical ? 'text-red-500 animate-pulse scale-110' : isUrgent ? 'text-orange-500 animate-pulse' : 'text-text-main dark:text-white'} transition-all ${className}`}>
      {formatted}
    </div>
  );
};
