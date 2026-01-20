import React from 'react';
import { AssessmentModule, ModuleStatus } from '../types';

interface ModuleCardProps {
  module: AssessmentModule;
  onOpenModule: (moduleId: string) => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ module, onOpenModule }) => {
  const isLocked = module.status === ModuleStatus.Locked;
  const isCompleted = module.status === ModuleStatus.Completed;
  const isActive = module.status === ModuleStatus.Active;

  // Dynamic Styles based on status
  const containerClasses = isLocked 
    ? "bg-[#f0f2f0] dark:bg-text-main/40 border-dashed border-text-main/20 dark:border-white/10 opacity-100 select-none cursor-not-allowed" 
    : isCompleted 
      ? "bg-card-bg dark:bg-card-bg-dark opacity-90"
      : "bg-card-bg dark:bg-card-bg-dark hover:shadow-md";

  const iconContainerClasses = isLocked
    ? "bg-gray-200 dark:bg-gray-800"
    : isCompleted
      ? "bg-accent-light dark:bg-[#253d2c]"
      : "bg-primary/10";
  
  const iconColorClasses = isLocked
    ? "text-gray-400"
    : isCompleted
      ? "text-primary-dark"
      : "text-primary-dark dark:text-primary";

  return (
    <div className={`group p-6 rounded-xl shadow-sm border border-text-main/5 dark:border-white/5 flex flex-col transition-all duration-300 ${containerClasses}`}>
      
      <div className="flex flex-col md:flex-row md:items-start gap-6 relative">
        {isLocked && (
          <div className="absolute top-0 right-0 bg-white/50 dark:bg-black/20 p-1 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-lg text-gray-400">lock</span>
          </div>
        )}

        {/* Icon */}
        <div className={`size-16 shrink-0 rounded-xl flex items-center justify-center mt-1 ${iconContainerClasses}`}>
          <span className={`material-symbols-outlined text-3xl ${iconColorClasses}`}>
            {module.icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className={`text-lg font-bold ${isLocked ? 'text-gray-400' : 'text-text-main dark:text-white'}`}>
              {module.title}
            </h4>
            {isActive && !isCompleted && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary-dark dark:text-primary text-[10px] font-bold rounded uppercase">
                Active
              </span>
            )}
            {isCompleted && (
              <span className="material-symbols-outlined text-primary-dark text-lg">check_circle</span>
            )}
          </div>
          
          <p className={`text-sm mb-4 ${isLocked ? 'text-gray-400' : 'text-text-muted'}`}>
            {module.description}
          </p>

          {/* Topics Tags - Always show on card for quick context */}
          {!isLocked && module.topics && module.topics.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
              {module.topics.map((topic, idx) => (
                <span 
                  key={idx} 
                  className="text-xs font-bold text-text-muted dark:text-text-muted/80"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Progress Bar (Overall Module) */}
          <div className={`w-full h-2 rounded-full overflow-hidden mb-2 ${isLocked ? 'bg-gray-200 dark:bg-gray-800' : 'bg-[#f0f2f0] dark:bg-[#253d2c]'}`}>
            {!isLocked && (
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-primary' : 'bg-primary'}`} 
                style={{ width: `${module.progress}%` }}
              ></div>
            )}
          </div>

          {/* Footer Meta */}
          <div className="flex justify-between items-center">
            <span className={`text-xs ${isLocked ? 'text-gray-400 font-medium' : isCompleted ? 'text-primary-dark font-bold' : 'text-text-muted'}`}>
               {isLocked ? "Locked" : isCompleted ? "Completed" : module.progress > 0 ? `${module.progress}% Complete` : "Not Started"}
            </span>
            {!isLocked && (
              <span className="text-xs font-bold text-text-main dark:text-white">
                {module.completedTasks}/{module.totalTasks} Tasks
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Action Button - Prominent Start Button */}
      {!isLocked && (
        <div className="mt-6">
          <button 
            onClick={() => onOpenModule(module.id)}
            className={`w-full py-3 px-6 rounded-xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 ${
              isCompleted 
                ? 'bg-transparent border-2 border-primary/20 text-text-muted hover:text-text-main hover:border-primary/40' 
                : 'bg-primary hover:bg-[#00d64b] text-black shadow-lg shadow-primary/20'
            }`}
          >
            {isCompleted ? 'Review Module' : 'Start'}
            <span className="material-symbols-outlined text-sm">
              {isCompleted ? 'visibility' : 'rocket_launch'}
            </span>
          </button>
        </div>
      )}
      
      {isLocked && (
        <div className="mt-6">
           <button className="w-full py-3 px-6 rounded-xl font-bold bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed" disabled>
             Locked
           </button>
        </div>
      )}
    </div>
  );
};