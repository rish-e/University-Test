import React from 'react';
import { AssessmentModule, ModuleStatus } from '../../types';

interface WorldMapProps {
  modules: AssessmentModule[];
  onSelectModule: (moduleId: string) => void;
}

const MODULE_THEMES: Record<string, { icon: string; color: string; gradient: string }> = {
  '1': { icon: 'lightbulb', color: '#3B82F6', gradient: 'from-blue-500 to-cyan-400' },
  '2': { icon: 'shield', color: '#EF4444', gradient: 'from-red-500 to-orange-400' },
  '3': { icon: 'build', color: '#F59E0B', gradient: 'from-yellow-500 to-amber-400' },
  '4': { icon: 'campaign', color: '#8B5CF6', gradient: 'from-purple-500 to-violet-400' },
  '5': { icon: 'meeting_room', color: '#13ec5b', gradient: 'from-green-500 to-emerald-400' },
};

export const WorldMap: React.FC<WorldMapProps> = ({ modules, onSelectModule }) => {
  return (
    <div className="mb-8">
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black text-text-main dark:text-white">Your Challenges</h3>
          <p className="text-sm text-text-muted">Select a challenge to begin</p>
        </div>
        <span className="text-sm text-text-muted">{modules.filter(m => m.status === ModuleStatus.Completed).length}/{modules.length} Complete</span>
      </div>

      {/* Connecting Path Line */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        <div className="grid grid-cols-1 gap-4">
          {modules.map((module, idx) => {
            const theme = MODULE_THEMES[module.id] || MODULE_THEMES['1'];
            const isLocked = module.status === ModuleStatus.Locked;
            const isCompleted = module.status === ModuleStatus.Completed;
            const isActive = module.status === ModuleStatus.Active || module.status === ModuleStatus.NotStarted;

            return (
              <button
                key={module.id}
                onClick={() => !isLocked && onSelectModule(module.id)}
                disabled={isLocked}
                className={`relative flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl border-2 transition-all text-left group ${
                  isLocked
                    ? 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-60 cursor-not-allowed'
                    : isCompleted
                    ? 'border-primary/30 bg-primary/5 dark:bg-primary/5'
                    : 'border-transparent bg-card-bg dark:bg-card-bg-dark hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]'
                }`}
              >
                {/* Node icon */}
                <div className={`relative shrink-0 size-14 sm:size-16 rounded-2xl flex items-center justify-center ${
                  isLocked
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : isCompleted
                    ? `bg-gradient-to-br ${theme.gradient} shadow-lg`
                    : `bg-gradient-to-br ${theme.gradient} shadow-lg group-hover:scale-105 transition-transform`
                }`}>
                  <span className={`material-symbols-outlined text-3xl ${isLocked ? 'text-gray-400' : 'text-white'}`}>
                    {isLocked ? 'lock' : theme.icon}
                  </span>
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 size-6 bg-primary rounded-full flex items-center justify-center shadow">
                      <span className="material-symbols-outlined text-black text-sm">check</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isLocked ? 'text-gray-400' : 'text-text-muted'}`}>
                      Challenge {idx + 1}
                    </span>
                    {isActive && module.progress > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                        IN PROGRESS
                      </span>
                    )}
                  </div>
                  <h4 className={`font-bold text-base sm:text-lg mb-0.5 ${isLocked ? 'text-gray-400' : 'text-text-main dark:text-white'}`}>
                    {module.narrativeTitle || module.title}
                  </h4>
                  <p className={`text-sm line-clamp-1 ${isLocked ? 'text-gray-400' : 'text-text-muted'}`}>
                    {module.narrativeDesc || module.description}
                  </p>

                  {/* Progress bar */}
                  {!isLocked && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-text-muted tabular-nums">
                        {module.completedTasks}/{module.totalTasks}
                      </span>
                    </div>
                  )}

                  {/* XP + Stars */}
                  {module.xpEarned && module.xpEarned > 0 && (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs font-bold text-primary-dark dark:text-primary">
                        {module.xpEarned} XP
                      </span>
                      {module.starRating !== undefined && module.starRating > 0 && (
                        <span className="text-xs text-yellow-500">
                          {'★'.repeat(module.starRating)}{'☆'.repeat(3 - module.starRating)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                {!isLocked && (
                  <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0">
                    arrow_forward_ios
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
