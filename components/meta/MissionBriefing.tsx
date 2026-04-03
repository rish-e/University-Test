import React, { useState } from 'react';
import { AssessmentModule, ModuleSection } from '../../types';

interface MissionBriefingProps {
  module: AssessmentModule;
  onStartSection: (moduleId: string, section: ModuleSection) => void;
  onClose: () => void;
}

const MODULE_THEMES: Record<string, { icon: string; gradient: string; accentBg: string }> = {
  '1': { icon: 'lightbulb', gradient: 'from-blue-500 to-cyan-400', accentBg: 'bg-blue-50 dark:bg-blue-900/20' },
  '2': { icon: 'shield', gradient: 'from-red-500 to-orange-400', accentBg: 'bg-red-50 dark:bg-red-900/20' },
  '3': { icon: 'build', gradient: 'from-yellow-500 to-amber-400', accentBg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  '4': { icon: 'campaign', gradient: 'from-purple-500 to-violet-400', accentBg: 'bg-purple-50 dark:bg-purple-900/20' },
  '5': { icon: 'meeting_room', gradient: 'from-green-500 to-emerald-400', accentBg: 'bg-green-50 dark:bg-green-900/20' },
};

export const MissionBriefing: React.FC<MissionBriefingProps> = ({ module, onStartSection, onClose }) => {
  const theme = MODULE_THEMES[module.id] || MODULE_THEMES['1'];

  // Find the next incomplete section
  const nextSection = module.sections?.find(s => !s.isCompleted);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card-bg dark:bg-card-bg-dark rounded-3xl shadow-2xl animate-[fadeIn_0.2s_ease-out]">
        {/* Header */}
        <div className={`relative p-6 sm:p-8 bg-gradient-to-br ${theme.gradient} rounded-t-3xl`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-white">close</span>
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">{theme.icon}</span>
            </div>
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Department {module.id}</p>
              <h2 className="text-2xl font-black text-white">{module.narrativeTitle || module.title}</h2>
            </div>
          </div>

          <p className="text-white/80 text-sm leading-relaxed">
            {module.narrativeDesc || module.description}
          </p>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${module.progress}%` }} />
            </div>
            <span className="text-white font-bold text-sm">{module.progress}%</span>
          </div>
        </div>

        {/* Challenges List */}
        <div className="p-6 sm:p-8">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">
            Challenges ({module.completedTasks}/{module.totalTasks} Complete)
          </h3>

          <div className="space-y-3">
            {module.sections?.map((section, idx) => {
              const isCompleted = section.isCompleted;
              const isNext = section.id === nextSection?.id;
              const hasStarted = !!section.startTime && !isCompleted;

              return (
                <div
                  key={section.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    isCompleted
                      ? 'border-primary/20 bg-primary/5'
                      : isNext
                      ? 'border-primary bg-card-bg dark:bg-card-bg-dark shadow-md'
                      : 'border-transparent bg-background-light dark:bg-white/5'
                  }`}
                >
                  {/* Step number / check */}
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-primary text-black'
                      : isNext
                      ? `bg-gradient-to-br ${theme.gradient} text-white`
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-lg">check</span>
                    ) : (
                      <span className="font-bold text-sm">{idx + 1}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm ${isCompleted ? 'text-text-muted line-through' : 'text-text-main dark:text-white'}`}>
                      {section.title}
                    </h4>
                    <p className="text-xs text-text-muted line-clamp-1">{section.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {section.duration && (
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">timer</span>
                          {section.duration}
                        </span>
                      )}
                      {isCompleted && section.score !== undefined && (
                        <span className="text-[10px] font-bold text-primary-dark dark:text-primary">
                          Score: {section.score}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="text-xs font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-lg">Done</span>
                    ) : isNext || hasStarted ? (
                      <button
                        onClick={() => onStartSection(module.id, section)}
                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-all active:scale-95 ${
                          hasStarted
                            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                            : 'bg-primary text-black hover:bg-[#00d64b]'
                        }`}
                      >
                        {hasStarted ? 'Resume' : 'Start'}
                      </button>
                    ) : (
                      <span className="text-xs text-text-muted">Upcoming</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
