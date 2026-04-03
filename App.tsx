import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { WelcomeSection } from './components/WelcomeSection';
import { WorldMap } from './components/meta/WorldMap';
import { LevelUpOverlay } from './components/meta/LevelUpOverlay';
import { AssessmentRunner } from './components/AssessmentRunner';
import { Footer } from './components/Footer';
import { DeadlinesSection } from './components/DeadlinesSection';
import { ProfileSection } from './components/ProfileSection';
import { BottomNav } from './components/BottomNav';
import { MODULES, USER_PROFILE } from './constants';
import { AssessmentModule, ModuleStatus, ModuleSection, MetaProgress } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import {
  createInitialProgress,
  completeSection as gamCompleteSection,
  saveProgress,
  loadProgress,
  getStarRating,
} from './gamification/engine';

const App: React.FC = () => {
  const [modules, setModules] = useState<AssessmentModule[]>(MODULES);
  const [userProfile, setUserProfile] = useState(USER_PROFILE);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'modules' | 'deadlines' | 'profile'>('modules');

  // Assessment runner state — now each module has exactly 1 section
  const [activeAssessment, setActiveAssessment] = useState<{ moduleId: string; section: ModuleSection } | null>(null);

  // Meta-game state
  const [metaProgress, setMetaProgress] = useState<MetaProgress>(() => loadProgress() || createInitialProgress());
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [prevLevel, setPrevLevel] = useState(metaProgress.player.level);

  // Persist meta progress
  useEffect(() => {
    saveProgress(metaProgress);
  }, [metaProgress]);

  // Check for level up
  useEffect(() => {
    if (metaProgress.player.level > prevLevel) {
      setShowLevelUp(true);
      setPrevLevel(metaProgress.player.level);
    }
  }, [metaProgress.player.level]);

  // Calculate dynamic user profile
  const totalTasks = modules.reduce((acc, mod) => acc + mod.totalTasks, 0);
  const completedTasks = modules.reduce((acc, mod) => acc + mod.completedTasks, 0);
  const totalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const dynamicUserProfile = {
    ...userProfile,
    totalCompletion: totalProgress,
    dailyProgress: totalProgress,
  };

  // Click a module → go straight into its single game
  const handleSelectModule = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module || !module.sections || module.sections.length === 0) return;
    if (module.status === ModuleStatus.Locked) return;

    const section = module.sections[0]; // Each module has exactly 1 section
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

    setActiveAssessment({
      moduleId,
      section: { ...section, startTime: effectiveStartTime }
    });
  };

  const handleAssessmentComplete = async (result: { score: number; type: string; data?: any }) => {
    if (!activeAssessment) return;

    const { moduleId, section } = activeAssessment;
    let finalScore = result.score;
    let analysis = "Completed successfully.";

    // AI Analysis for writing tasks (kept for future use)
    if (result.type === 'writing' && result.data && typeof result.data === 'string') {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const resp = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze this short essay/response for a business school application.
                     Task ID: ${section.id}.
                     Response: "${result.data}"
                     Provide a score (0-100) based on clarity, structure, persuasion, and relevance to the prompt.
                     Provide a 1-sentence behavioral insight about the candidate's traits.`,
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
        finalScore = 80;
        analysis = "Analysis unavailable.";
      }
    }

    // Update gamification state
    const { state: newMeta } = gamCompleteSection(metaProgress, section.id, finalScore);
    setMetaProgress(newMeta);

    // Update Modules State
    const updatedModules = modules.map(module => {
      if (module.id !== moduleId || !module.sections) return module;

      const updatedSections = module.sections.map(s =>
        s.id === section.id ? { ...s, isCompleted: true, score: finalScore, analysis, userResponse: result.data } : s
      );

      const completedCount = updatedSections.filter(s => s.isCompleted).length;
      const totalCount = updatedSections.length;
      const newProgress = Math.round((completedCount / totalCount) * 100);

      return {
        ...module,
        sections: updatedSections,
        completedTasks: completedCount,
        progress: newProgress,
        status: newProgress === 100 ? ModuleStatus.Completed : ModuleStatus.Active,
        starRating: getStarRating(finalScore),
        xpEarned: (module.xpEarned || 0) + Math.round(50 + finalScore * 0.5),
      };
    });

    setModules(updatedModules);

    // Update User Profile Metrics
    const metricMap: Record<string, keyof typeof userProfile.metrics> = {
      '1': 'cognitive',
      '2': 'behavioral',
      '3': 'technical',
      '4': 'communication',
      '5': 'leadership',
    };

    const updatedMetrics = { ...userProfile.metrics };
    updatedModules.forEach(mod => {
      const metric = metricMap[mod.id];
      if (!metric || !mod.sections) return;
      const completedSections = mod.sections.filter(s => s.isCompleted && s.score !== undefined);
      if (completedSections.length > 0) {
        updatedMetrics[metric] = Math.round(
          completedSections.reduce((sum, s) => sum + s.score!, 0) / completedSections.length
        );
      }
    });

    setUserProfile(prev => ({ ...prev, metrics: updatedMetrics }));
    setActiveAssessment(null);
  };

  const handleAssessmentExit = (progressToSave?: any) => {
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

  return (
    <div className="min-h-screen">
      <Header
        user={dynamicUserProfile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        player={metaProgress.player}
      />

      <main className="max-w-5xl mx-auto p-4 pb-24">
        {activeTab === 'modules' && (
          <>
            <WelcomeSection user={dynamicUserProfile} player={metaProgress.player} />
            <WorldMap modules={modules} onSelectModule={handleSelectModule} />
          </>
        )}

        {activeTab === 'deadlines' && <DeadlinesSection />}
        {activeTab === 'profile' && <ProfileSection user={dynamicUserProfile} modules={modules} />}

        <Footer />
      </main>

      {/* Assessment Runner — direct game launch */}
      {activeAssessment && (
        <AssessmentRunner
          section={activeAssessment.section}
          onComplete={handleAssessmentComplete}
          onExit={handleAssessmentExit}
        />
      )}

      {/* Level Up Overlay */}
      {showLevelUp && (
        <LevelUpOverlay
          player={metaProgress.player}
          onDismiss={() => setShowLevelUp(false)}
        />
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
