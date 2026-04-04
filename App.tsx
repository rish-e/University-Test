import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { WelcomeSection } from './components/WelcomeSection';
import { WorldMap } from './components/meta/WorldMap';
import { LevelUpOverlay } from './components/meta/LevelUpOverlay';
import { AssessmentRunner } from './components/AssessmentRunner';
import { StudentGate } from './components/StudentGate';
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
import {
  registerStudent,
  createTestSession,
  getExistingSession,
  submitSectionResult,
  updateSessionStatus,
} from './lib/supabase';

// Section ID to result type mapping
const SOFT_SKILL_SECTIONS = new Set(['behavioral', 'communication', 'eq-scenarios']);

const App: React.FC = () => {
  // Auth / student state
  const [isRegistered, setIsRegistered] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [candidateId, setCandidateId] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    const savedStudentId = localStorage.getItem('tetr-student-id');
    const savedSessionId = localStorage.getItem('tetr-session-id');
    const savedName = localStorage.getItem('tetr-student-name');
    const savedCandidateId = localStorage.getItem('tetr-candidate-id');

    if (savedStudentId && savedSessionId && savedName) {
      setStudentId(savedStudentId);
      setSessionId(savedSessionId);
      setStudentName(savedName);
      setCandidateId(savedCandidateId || '');
      setIsRegistered(true);
    }
  }, []);

  const handleRegister = async (fullName: string, email: string) => {
    setGateLoading(true);
    setGateError(null);

    try {
      const { student, isReturning } = await registerStudent(fullName, email);

      let session;
      if (isReturning) {
        // Check for existing in-progress session
        session = await getExistingSession(student.id);
        if (!session) {
          session = await createTestSession(student.id);
        }
      } else {
        session = await createTestSession(student.id);
      }

      // Save to localStorage for persistence
      localStorage.setItem('tetr-student-id', student.id);
      localStorage.setItem('tetr-session-id', session.id);
      localStorage.setItem('tetr-student-name', fullName);
      localStorage.setItem('tetr-candidate-id', student.candidate_id || '');

      setStudentId(student.id);
      setSessionId(session.id);
      setStudentName(fullName);
      setCandidateId(student.candidate_id || '');
      setIsRegistered(true);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setGateError(err.message || 'Registration failed. Please try again.');
    } finally {
      setGateLoading(false);
    }
  };

  // Module state
  const [modules, setModules] = useState<AssessmentModule[]>(MODULES);
  const [activeTab, setActiveTab] = useState<'modules' | 'deadlines' | 'profile'>('modules');
  const [activeAssessment, setActiveAssessment] = useState<{ moduleId: string; section: ModuleSection } | null>(null);

  // Meta-game state
  const [metaProgress, setMetaProgress] = useState<MetaProgress>(() => loadProgress() || createInitialProgress());
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [prevLevel, setPrevLevel] = useState(metaProgress.player.level);

  useEffect(() => { saveProgress(metaProgress); }, [metaProgress]);
  useEffect(() => {
    if (metaProgress.player.level > prevLevel) {
      setShowLevelUp(true);
      setPrevLevel(metaProgress.player.level);
    }
  }, [metaProgress.player.level]);

  const totalTasks = modules.reduce((acc, mod) => acc + mod.totalTasks, 0);
  const completedTasks = modules.reduce((acc, mod) => acc + mod.completedTasks, 0);
  const totalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const dynamicUserProfile = {
    ...USER_PROFILE,
    name: studentName || USER_PROFILE.name,
    id: candidateId || USER_PROFILE.id,
    totalCompletion: totalProgress,
    dailyProgress: totalProgress,
  };

  const handleSelectModule = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module || !module.sections || module.sections.length === 0) return;
    if (module.status === ModuleStatus.Locked) return;

    const section = module.sections[0];
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

    setActiveAssessment({ moduleId, section: { ...section, startTime: effectiveStartTime } });
  };

  const handleAssessmentComplete = async (result: { score: number; type: string; data?: any }) => {
    if (!activeAssessment) return;

    const { moduleId, section } = activeAssessment;
    let finalScore = result.score;
    let analysis = "Completed successfully.";

    // AI Analysis for writing tasks
    if (result.type === 'writing' && result.data && typeof result.data === 'string') {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const resp = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze this short essay/response for a business school application.
                     Task ID: ${section.id}.
                     Response: "${result.data}"
                     Provide a score (0-100) based on clarity, structure, persuasion, and relevance.
                     Provide a 1-sentence behavioral insight about the candidate's traits.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: { score: { type: Type.INTEGER }, insight: { type: Type.STRING } }
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

    // Submit to Supabase
    if (sessionId) {
      const isSoftSkill = SOFT_SKILL_SECTIONS.has(section.id);
      try {
        await submitSectionResult({
          sessionId,
          sectionId: section.id,
          sectionTitle: section.title,
          score: finalScore,
          timeSpent: section.startTime ? Math.floor((Date.now() - section.startTime) / 1000) : 0,
          resultType: isSoftSkill ? 'soft_skill' : 'hard_skill',
          rawScore: result.data?.rawScore,
          profile: isSoftSkill ? (result.data?.profile || result.data?.finalScores) : undefined,
          metrics: result.data?.metrics || {},
          rawData: result.data,
        });
      } catch (err) {
        console.error('Failed to submit result to Supabase:', err);
      }
    }

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

    // Update metrics
    const metricMap: Record<string, keyof typeof USER_PROFILE.metrics> = {
      '1': 'cognitive', '2': 'behavioral', '3': 'technical', '4': 'communication', '5': 'leadership',
    };
    const updatedMetrics = { ...dynamicUserProfile.metrics };
    updatedModules.forEach(mod => {
      const metric = metricMap[mod.id];
      if (!metric || !mod.sections) return;
      const completed = mod.sections.filter(s => s.isCompleted && s.score !== undefined);
      if (completed.length > 0) {
        updatedMetrics[metric] = Math.round(completed.reduce((sum, s) => sum + s.score!, 0) / completed.length);
      }
    });

    // Check if all 5 are done → update session
    const allDone = updatedModules.every(m => m.completedTasks >= m.totalTasks);
    if (allDone && sessionId) {
      try {
        await updateSessionStatus(sessionId, 'completed', newMeta.player.totalXP, newMeta.player.level, newMeta.player.title);
      } catch (err) {
        console.error('Failed to update session status:', err);
      }
    }

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
              s.id === activeAssessment.section.id ? { ...s, progressState: progressToSave } : s
            )
          };
        })
      );
    }
    setActiveAssessment(null);
  };

  // Show registration gate if not registered
  if (!isRegistered) {
    return <StudentGate onRegister={handleRegister} isLoading={gateLoading} error={gateError} />;
  }

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

      {activeAssessment && (
        <AssessmentRunner
          section={activeAssessment.section}
          onComplete={handleAssessmentComplete}
          onExit={handleAssessmentExit}
        />
      )}

      {showLevelUp && (
        <LevelUpOverlay player={metaProgress.player} onDismiss={() => setShowLevelUp(false)} />
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
