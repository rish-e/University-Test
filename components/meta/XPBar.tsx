import React from 'react';
import { PlayerLevel } from '../../types';

interface XPBarProps {
  player: PlayerLevel;
  compact?: boolean;
}

export const XPBar: React.FC<XPBarProps> = ({ player, compact = false }) => {
  const progressPct = player.xpForNextLevel > 0
    ? Math.min(100, (player.currentXP / player.xpForNextLevel) * 100)
    : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-[#078829] flex items-center justify-center">
          <span className="text-white font-black text-xs">{player.level}</span>
        </div>
        <div className="hidden sm:block">
          <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-[#078829] flex items-center justify-center shadow-lg shadow-primary/20">
        <span className="text-white font-black text-sm">{player.level}</span>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-text-main dark:text-white">{player.title}</span>
          <span className="text-[10px] text-text-muted tabular-nums">{player.totalXP} XP</span>
        </div>
        <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-[#00d64b] rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
