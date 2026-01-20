import React from 'react';

interface BottomNavProps {
  activeTab: 'modules' | 'deadlines' | 'profile';
  onTabChange: (tab: 'modules' | 'deadlines' | 'profile') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  
  const getButtonClass = (tab: string) => {
    const isActive = activeTab === tab;
    return `relative flex flex-col items-center justify-center gap-1 transition-all duration-200 rounded-2xl border-2 px-6 py-2 ${
      isActive 
        ? 'bg-[#eaf5ff] dark:bg-white/10 border-black dark:border-white text-primary-dark dark:text-primary shadow-sm' 
        : 'border-transparent text-text-muted hover:text-text-main dark:hover:text-white'
    }`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-text-main/5 dark:border-white/5 md:hidden px-4 pb-4 pt-3 flex justify-around items-center h-[90px]">
      <button 
        onClick={() => onTabChange('modules')}
        className={getButtonClass('modules')}
      >
        <span className={`material-symbols-outlined text-2xl ${activeTab === 'modules' ? 'fill-current' : ''}`}>dashboard</span>
        <span className="text-xs font-bold tracking-wide">Modules</span>
      </button>
      
      <button 
        onClick={() => onTabChange('deadlines')}
        className={getButtonClass('deadlines')}
      >
        <span className={`material-symbols-outlined text-2xl ${activeTab === 'deadlines' ? 'fill-current' : ''}`}>schedule</span>
        <span className="text-xs font-bold tracking-wide">Deadlines</span>
      </button>
      
      <button 
        onClick={() => onTabChange('profile')}
        className={getButtonClass('profile')}
      >
        <span className={`material-symbols-outlined text-2xl ${activeTab === 'profile' ? 'fill-current' : ''}`}>person</span>
        <span className="text-xs font-bold tracking-wide">Profile</span>
      </button>
    </div>
  );
};