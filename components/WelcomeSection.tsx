import React from 'react';
import { UserProfile, PlayerLevel } from '../types';

interface WelcomeSectionProps {
  user: UserProfile;
  player?: PlayerLevel;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({ user, player }) => {
  const progressPct = player && player.xpForNextLevel > 0
    ? Math.min(100, (player.currentXP / player.xpForNextLevel) * 100)
    : 0;

  return (
    <section className="flex flex-col md:flex-row gap-4 mb-8">
      {/* Greeting Card */}
      <div className="flex-1 bg-card-bg dark:bg-card-bg-dark p-6 rounded-xl shadow-sm border border-text-main/5 dark:border-white/5">
        <p className="text-text-muted font-medium">Welcome back,</p>
        <h2 className="text-3xl font-bold mb-2 text-text-main dark:text-white">{user.name}</h2>
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {player && (
            <span className="px-3 py-1 bg-gradient-to-r from-primary/20 to-[#078829]/20 text-primary-dark dark:text-primary text-xs font-black rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">bolt</span>
              Lv.{player.level} {player.title}
            </span>
          )}
          <span className="px-3 py-1 bg-primary/10 text-primary-dark text-xs font-bold rounded-full">
            {user.id}
          </span>
          <span className="px-3 py-1 bg-primary text-black text-xs font-bold rounded-full">
            {user.term}
          </span>
        </div>
      </div>

      {/* Progress Card */}
      <div className="w-full md:w-80 bg-accent-light dark:bg-accent-dark p-6 rounded-xl flex items-center justify-between gap-4">
        <div className="flex flex-col">
          {player ? (
            <>
              <p className="text-text-main dark:text-[#a0c5ac] text-sm font-medium">Total XP</p>
              <p className="text-text-main dark:text-white text-3xl font-bold leading-tight">
                {player.totalXP}
              </p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                  <span>Level {player.level}</span>
                  <span>Level {player.level + 1}</span>
                </div>
                <div className="w-32 h-2 bg-white/30 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-text-main dark:text-[#a0c5ac] text-sm font-medium">Total Completion</p>
              <p className="text-text-main dark:text-white text-3xl font-bold leading-tight">
                {user.totalCompletion}%
              </p>
              <p className="text-primary-dark dark:text-primary text-sm font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                +{user.dailyProgress}% today
              </p>
            </>
          )}
        </div>

        {/* Circular Progress Indicator */}
        <div className="relative size-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/20" />
            <circle
              cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"
              className="text-primary"
              strokeDasharray={`${user.totalCompletion * 2.64} 264`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-text-main dark:text-white">{user.totalCompletion}%</span>
          </div>
        </div>
      </div>
    </section>
  );
};
