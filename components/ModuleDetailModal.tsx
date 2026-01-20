import React, { useEffect } from 'react';
import { AssessmentModule, ModuleSection } from '../types';

interface ModuleDetailModalProps {
  module: AssessmentModule | null;
  isOpen: boolean;
  onClose: () => void;
  onStartSection: (moduleId: string, section: ModuleSection) => void;
}

export const ModuleDetailModal: React.FC<ModuleDetailModalProps> = ({ module, isOpen, onClose, onStartSection }) => {
  
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    
    // Cleanup function to ensure scroll is restored if component unmounts
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  if (!isOpen || !module) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-text-main/5 dark:border-white/5 bg-background-light/50 dark:bg-white/5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary-dark dark:text-primary">
              <span className="material-symbols-outlined text-2xl">{module.icon}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-main dark:text-white">{module.title}</h3>
              <p className="text-sm text-text-muted">{module.completedTasks}/{module.totalTasks} Tasks Completed</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="size-8 rounded-full bg-transparent hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-text-muted"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-text-muted mb-6">{module.description}</p>
          
          {module.sections ? (
             <div className="space-y-3">
              {module.sections.map((section) => (
                <div 
                  key={section.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${section.isCompleted ? 'bg-accent-light/30 dark:bg-accent-dark/20 border-transparent' : 'bg-white dark:bg-white/5 border-text-main/5 dark:border-white/5 hover:border-primary/30'}`}
                >
                  <div className="flex items-start gap-4 mb-3 sm:mb-0">
                    <div className={`mt-1 size-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${section.isCompleted ? 'bg-primary text-black' : 'bg-background-light dark:bg-white/10 text-text-muted'}`}>
                      {section.isCompleted ? (
                        <span className="material-symbols-outlined text-sm">check</span>
                      ) : (
                        <span className="text-xs font-bold">{section.id.replace(/[a-z]/g,'')}</span>
                      )}
                    </div>
                    <div>
                      <h5 className={`font-bold ${section.isCompleted ? 'text-text-main dark:text-white line-through opacity-70' : 'text-text-main dark:text-white'}`}>
                        {section.title}
                      </h5>
                      <p className="text-xs text-text-muted mt-1">{section.description}</p>
                      {section.duration && !section.isCompleted && (
                        <div className="flex items-center gap-1 mt-2">
                          <span className="material-symbols-outlined text-[10px] text-text-muted">timer</span>
                          <span className="text-[10px] text-text-muted uppercase tracking-wider">{section.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Section Action */}
                  <div className="flex items-center self-end sm:self-center">
                    {!section.isCompleted ? (
                       <button 
                        onClick={() => onStartSection(module.id, section)}
                        className="px-6 py-2 bg-primary hover:bg-[#00d64b] text-black rounded-lg text-sm font-bold transition-transform active:scale-95 shadow-sm hover:shadow-md shadow-primary/20"
                       >
                         Start
                       </button>
                    ) : (
                      <span className="px-4 py-2 text-xs font-bold text-primary-dark dark:text-primary bg-primary/10 rounded-lg">Completed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
               <span className="material-symbols-outlined text-4xl text-text-muted/30 mb-2">construction</span>
               <p className="text-text-muted">No detailed sections available for this module yet.</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-text-main/5 dark:border-white/5 bg-background-light/30 dark:bg-white/5 flex justify-end">
           <button 
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-bold text-text-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              Close
            </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};