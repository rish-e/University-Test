import React from 'react';
import { UserProfile } from '../types';

interface WelcomeSectionProps {
  user: UserProfile;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({ user }) => {
  return (
    <section className="flex flex-col md:flex-row gap-4 mb-8">
      {/* Greeting Card */}
      <div className="flex-1 bg-card-bg dark:bg-card-bg-dark p-6 rounded-xl shadow-sm border border-text-main/5 dark:border-white/5">
        <p className="text-text-muted font-medium">Welcome back,</p>
        <h2 className="text-3xl font-bold mb-2 text-text-main dark:text-white">{user.name}</h2>
        <div className="flex items-center gap-2 mt-4">
          <span className="px-3 py-1 bg-primary/10 text-primary-dark text-xs font-bold rounded-full">
            Candidate ID: {user.id}
          </span>
          <span className="px-3 py-1 bg-primary text-black text-xs font-bold rounded-full">
            {user.term}
          </span>
        </div>
      </div>

      {/* Progress Card */}
      <div className="w-full md:w-80 bg-accent-light dark:bg-accent-dark p-6 rounded-xl flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <p className="text-text-main dark:text-[#a0c5ac] text-sm font-medium">Total Completion</p>
          <p className="text-text-main dark:text-white text-3xl font-bold leading-tight">
            {user.totalCompletion}%
          </p>
          <p className="text-primary-dark dark:text-primary text-sm font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span> 
            +{user.dailyProgress}% today
          </p>
        </div>
        
        {/* Circular Progress Indicator */}
        <div 
          className="relative size-20 circular-progress rounded-full flex items-center justify-center"
          style={{ '--progress': `${user.totalCompletion}%` } as React.CSSProperties}
        >
          <span className="text-xs font-bold text-text-main dark:text-white">
            {user.totalCompletion}%
          </span>
        </div>
      </div>
    </section>
  );
};