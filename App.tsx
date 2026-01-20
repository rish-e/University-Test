import React, { useState } from 'react';
import { Header } from './components/Header';
import { WelcomeSection } from './components/WelcomeSection';
import { ModuleCard } from './components/ModuleCard';
import { ModuleDetailModal } from './components/ModuleDetailModal';
import { AssessmentRunner } from './components/AssessmentRunner';
import { Footer } from './components/Footer';
import { DeadlinesSection } from './components/DeadlinesSection';
import { ProfileSection } from './components/ProfileSection';
import { MODULES, USER_PROFILE } from './constants';
import { AssessmentModule, ModuleStatus, ModuleSection } from './types';

const App: React.FC = () => {
  const [modules, setModules] = useState<AssessmentModule[]>(MODULES);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'modules' | 'deadlines' | 'profile'>('modules');
  
  // New state to track if a specific test is currently running
  const [activeAssessment, setActiveAssessment] = useState<{moduleId: string, section: ModuleSection} | null>(null);

  // Calculate dynamic user profile based on current modules state
  const totalTasks = modules.reduce((acc, mod) => acc + mod.totalTasks, 0);
  const completedTasks = modules.reduce((acc, mod) => acc + mod.completedTasks, 0);
  const totalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const dynamicUserProfile = {
    ...USER_PROFILE,
    totalCompletion: totalProgress,
    // Update daily progress to reflect current session progress (simplified logic)
    dailyProgress: totalProgress 
  };

  const handleOpenModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
  };

  const handleCloseModule = () => {
    setSelectedModuleId(null);
  };

  const handleStartSection = (moduleId: string, section: ModuleSection) => {
    // Instead of completing immediately, we launch the runner
    setActiveAssessment({ moduleId, section });
    // Note: We keep selectedModuleId active so when we finish, we go back to the modal
  };

  const handleAssessmentComplete = () => {
    if (!activeAssessment) return;

    const { moduleId, section } = activeAssessment;

    // Update the completion state
    setModules(currentModules => 
      currentModules.map(module => {
        if (module.id !== moduleId || !module.sections) return module;

        const updatedSections = module.sections.map(s => 
          s.id === section.id ? { ...s, isCompleted: true } : s
        );

        const completedCount = updatedSections.filter(s => s.isCompleted).length;
        const totalCount = updatedSections.length;
        const newProgress = Math.round((completedCount / totalCount) * 100);

        return {
          ...module,
          sections: updatedSections,
          completedTasks: completedCount,
          progress: newProgress,
          status: newProgress === 100 ? ModuleStatus.Completed : ModuleStatus.Active
        };
      })
    );

    // Close the runner, return to modal
    setActiveAssessment(null);
  };

  const handleAssessmentExit = () => {
    // Just close the runner without saving
    setActiveAssessment(null);
  };

  const activeModule = modules.find(m => m.id === selectedModuleId) || null;

  return (
    <div className="min-h-screen">
      <Header 
        user={dynamicUserProfile} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      
      <main className="max-w-5xl mx-auto p-4 pb-24">
        {/* Render content based on active tab */}
        {activeTab === 'modules' && (
          <>
            <WelcomeSection user={dynamicUserProfile} />
            
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-main dark:text-white">Assessment Pillars</h3>
              <span className="text-sm text-text-muted">{modules.length} Modules Total</span>
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-1 gap-4">
              {modules.map((module) => (
                <ModuleCard 
                  key={module.id} 
                  module={module} 
                  onOpenModule={handleOpenModule}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === 'deadlines' && (
          <DeadlinesSection />
        )}

        {activeTab === 'profile' && (
          <ProfileSection user={dynamicUserProfile} />
        )}

        <Footer />
      </main>

      {/* The Dashboard Modal */}
      <ModuleDetailModal 
        module={activeModule} 
        isOpen={!!activeModule && !activeAssessment} 
        onClose={handleCloseModule}
        onStartSection={handleStartSection}
      />

      {/* The Actual Test Runner */}
      {activeAssessment && (
        <AssessmentRunner 
          section={activeAssessment.section}
          onComplete={handleAssessmentComplete}
          onExit={handleAssessmentExit}
        />
      )}
    </div>
  );
};

export default App;