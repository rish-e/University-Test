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
import { GoogleGenAI, Type } from "@google/genai";

const App: React.FC = () => {
  const [modules, setModules] = useState<AssessmentModule[]>(MODULES);
  const [userProfile, setUserProfile] = useState(USER_PROFILE);
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
    ...userProfile,
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
    // If the section doesn't have a start time, set it now
    const now = Date.now();
    let effectiveStartTime = section.startTime;

    if (!effectiveStartTime) {
      effectiveStartTime = now;
      setModules(currentModules => 
        currentModules.map(m => {
          if (m.id !== moduleId || !m.sections) return m;
          return {
            ...m,
            sections: m.sections.map(s => 
              s.id === section.id ? { ...s, startTime: effectiveStartTime } : s
            )
          };
        })
      );
    }

    // Launch the runner with the startTime included
    // Note: section here comes from the state, so it includes progressState if previously saved
    setActiveAssessment({ 
      moduleId, 
      section: { ...section, startTime: effectiveStartTime } 
    });
  };

  const handleAssessmentComplete = async (result: { score: number, type: string, data?: any }) => {
    if (!activeAssessment) return;

    const { moduleId, section } = activeAssessment;
    let finalScore = result.score;
    let analysis = "Completed successfully.";

    // Logic for AI Analysis on Writing Tasks
    if (result.type === 'writing' && result.data && typeof result.data === 'string') {
        try {
           const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
           const resp = await ai.models.generateContent({
               model: 'gemini-3-flash-preview',
               contents: `Analyze this short essay/response for a business school application. 
                          Task ID: ${section.id}.
                          Response: "${result.data}"
                          Provide a score (0-100) based on clarity, structure, persuasion, and relevance to the prompt.
                          Provide a 1-sentence behavioral insight about the candidate's traits (e.g. strategic thinking, resilience).`,
               config: {
                   responseMimeType: 'application/json',
                   responseSchema: {
                       type: Type.OBJECT,
                       properties: {
                           score: { type: Type.INTEGER },
                           insight: { type: Type.STRING }
                       }
                   }
               }
           });
           const json = JSON.parse(resp.text || "{}");
           finalScore = json.score || 75;
           analysis = json.insight || "Good effort showing potential.";
        } catch (e) {
           console.error("AI Analysis failed", e);
           finalScore = 80; // Fallback
           analysis = "Analysis unavailable.";
        }
    } else if (result.type === 'video') {
       // Mock video analysis since we don't have real video processing
       finalScore = Math.floor(Math.random() * (95 - 75) + 75);
       analysis = "Candidate shows strong non-verbal communication and confidence.";
    }

    // Update Modules State
    const updatedModules = modules.map(module => {
        if (module.id !== moduleId || !module.sections) return module;

        const updatedSections = module.sections.map(s => 
          s.id === section.id ? { ...s, isCompleted: true, score: finalScore, analysis: analysis, userResponse: result.data } : s
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
    });

    setModules(updatedModules);

    // Update User Profile Metrics based on completed sections
    // Mapping: 1->Cognitive, 2->Behavioral, 3->Technical, 4->Communication/Leadership
    // We recalculate averages based on ALL completed sections across modules
    
    let cogSum = 0, cogCount = 0;
    let behSum = 0, behCount = 0;
    let techSum = 0, techCount = 0;
    let commSum = 0, commCount = 0;
    
    updatedModules.forEach(mod => {
       if(!mod.sections) return;
       mod.sections.forEach(sect => {
          if (sect.isCompleted && sect.score !== undefined) {
             if (mod.id === '1') { cogSum += sect.score; cogCount++; }
             if (mod.id === '2') { behSum += sect.score; behCount++; }
             if (mod.id === '3') { techSum += sect.score; techCount++; }
             if (mod.id === '4' || mod.id === '5') { commSum += sect.score; commCount++; }
          }
       });
    });

    setUserProfile(prev => ({
        ...prev,
        metrics: {
            cognitive: cogCount > 0 ? Math.round(cogSum / cogCount) : 0,
            technical: techCount > 0 ? Math.round(techSum / techCount) : 0,
            behavioral: behCount > 0 ? Math.round(behSum / behCount) : 0,
            communication: commCount > 0 ? Math.round(commSum / commCount) : 0,
            leadership: commCount > 0 ? Math.round((commSum / commCount) * 0.9) : 0 // heuristic
        }
    }));

    // Close the runner, return to modal
    setActiveAssessment(null);
  };

  const handleAssessmentExit = (progressToSave?: any) => {
    // If progressToSave is provided, update the module section with this progress
    if (activeAssessment && progressToSave) {
        setModules(currentModules => 
          currentModules.map(m => {
            if (m.id !== activeAssessment.moduleId || !m.sections) return m;
            return {
              ...m,
              sections: m.sections.map(s => 
                s.id === activeAssessment.section.id 
                  ? { ...s, progressState: progressToSave } 
                  : s
              )
            };
          })
        );
    }
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
          <ProfileSection user={dynamicUserProfile} modules={modules} />
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