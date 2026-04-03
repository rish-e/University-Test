import React, { useState } from 'react';
import { UserProfile, PlayerLevel } from '../types';
import { ReminderModal } from './ReminderModal';
import { XPBar } from './meta/XPBar';

interface HeaderProps {
  user: UserProfile;
  activeTab: 'modules' | 'deadlines' | 'profile';
  onTabChange: (tab: 'modules' | 'deadlines' | 'profile') => void;
  player?: PlayerLevel;
}

export const Header: React.FC<HeaderProps> = ({ user, activeTab, onTabChange, player }) => {
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTabSelect = (tab: 'modules' | 'deadlines' | 'profile') => {
    onTabChange(tab);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-text-main/5 dark:border-white/5">
        <div className="flex items-center justify-between p-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleTabSelect('modules')}>
            <div className="bg-primary/20 p-2 rounded-lg">
              <span className="material-symbols-outlined text-primary-dark text-2xl">school</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-text-main dark:text-white">Tetr College of Business</h1>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Tetr Trial</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* XP Bar */}
            {player && <XPBar player={player} compact />}

            <button
              onClick={() => setIsReminderOpen(true)}
              className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary-dark hover:bg-primary/20 transition-colors relative"
              aria-label="Set reminders"
            >
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-white dark:border-background-dark animate-pulse"></span>
            </button>

            {/* User Dropdown Menu */}
            <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-text-muted"
                  aria-label="Open menu"
                >
                    <span className="material-symbols-outlined text-2xl">menu</span>
                </button>

                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-card-bg-dark rounded-xl shadow-xl border border-text-main/5 dark:border-white/5 overflow-hidden z-20 animate-[fadeIn_0.1s_ease-out]">
                      <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                        <p className="font-bold text-text-main dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-text-muted font-mono">{user.id}</p>
                        {player && (
                          <div className="mt-2">
                            <XPBar player={player} />
                          </div>
                        )}
                      </div>
                      <div className="p-2 space-y-1">
                        <button
                            onClick={() => handleTabSelect('modules')}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-colors ${
                              activeTab === 'modules'
                                ? 'bg-[#eaf5ff] dark:bg-white/10 text-primary-dark dark:text-primary'
                                : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <span className={`material-symbols-outlined ${activeTab === 'modules' ? 'fill-current' : ''}`}>dashboard</span>
                            Mission Control
                        </button>
                        <button
                            onClick={() => handleTabSelect('deadlines')}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-colors ${
                              activeTab === 'deadlines'
                                ? 'bg-[#eaf5ff] dark:bg-white/10 text-primary-dark dark:text-primary'
                                : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <span className={`material-symbols-outlined ${activeTab === 'deadlines' ? 'fill-current' : ''}`}>schedule</span>
                            Deadlines
                        </button>
                        <button
                            onClick={() => handleTabSelect('profile')}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-colors ${
                              activeTab === 'profile'
                                ? 'bg-[#eaf5ff] dark:bg-white/10 text-primary-dark dark:text-primary'
                                : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <span className={`material-symbols-outlined ${activeTab === 'profile' ? 'fill-current' : ''}`}>person</span>
                            Profile
                        </button>
                      </div>
                      <div className="p-2 border-t border-gray-100 dark:border-white/5">
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                            <span className="material-symbols-outlined">logout</span>
                            Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>
        </div>
      </nav>
      <ReminderModal isOpen={isReminderOpen} onClose={() => setIsReminderOpen(false)} />
    </>
  );
};
