import React, { useState, useRef, useEffect } from 'react';
import { ModuleSection, GameResult, AssessmentProgress } from '../types';
import { AssessmentShell } from './assessment/AssessmentShell';
import { TransitionScreen } from './assessment/shared/TransitionScreen';

// Game Components
import { DataDash } from './assessment/games/DataDash';
import { PatternLock } from './assessment/games/PatternLock';
import { SpatialRotation } from './assessment/games/SpatialRotation';
import { DebateArena } from './assessment/games/DebateArena';
import { SupplyChain } from './assessment/games/SupplyChain';
import { PrecisionTower } from './assessment/games/PrecisionTower';
import { BalloonRisk } from './assessment/games/BalloonRisk';
import { InnovationPath } from './assessment/games/InnovationPath';
import { SpreadsheetRescue } from './assessment/games/SpreadsheetRescue';
import { QueryQuest } from './assessment/games/QueryQuest';
import { StartupSimulator } from './assessment/games/StartupSimulator';
import { CaseCommand } from './assessment/games/CaseCommand';
import { WritingAssessment } from './assessment/games/WritingAssessment';
import { VideoAssessment } from './assessment/games/VideoAssessment';

interface AssessmentRunnerProps {
  section: ModuleSection;
  onComplete: (result: { score: number; type: string; data?: any }) => void;
  onExit: (progress?: any) => void;
  onXPGain?: (amount: number, source: string) => void;
}

// Map section IDs to game components
const GAME_COMPONENTS: Record<string, React.FC<any>> = {
  'c1': DataDash,
  'c2': PatternLock,
  'c3': SpatialRotation,
  'c4': DebateArena,
  'g1': SupplyChain,
  'g2': PrecisionTower,
  'g3': BalloonRisk,
  'g4': InnovationPath,
  't1': SpreadsheetRescue,
  't2': QueryQuest,
  't3': StartupSimulator,
  'e1': CaseCommand,
};

export const AssessmentRunner: React.FC<AssessmentRunnerProps> = ({
  section, onComplete, onExit, onXPGain
}) => {
  const [showTransition, setShowTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{ score: number; xp: number } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1);
  const [progress, setProgress] = useState(0);
  const [xpToasts, setXpToasts] = useState<{ id: string; amount: number; source?: string }[]>([]);
  const startTimeRef = useRef(Date.now());

  const handleGameComplete = (result: GameResult) => {
    const xpEarned = Math.round(50 + result.score * 0.5); // base 50 + up to 50 for score
    setTransitionData({ score: result.score, xp: xpEarned });
    setShowTransition(true);

    // Forward to parent
    onComplete({
      score: result.score,
      type: result.type,
      data: result.data,
    });
  };

  const handleGameExit = (progressState?: AssessmentProgress) => {
    onExit(progressState);
  };

  const handleXPGain = (amount: number, source: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setXpToasts(prev => [...prev, { id, amount, source }]);
    onXPGain?.(amount, source);
  };

  const handleDismissToast = (id: string) => {
    setXpToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleTimeUp = () => {
    // Auto-submit with current score
    handleGameComplete({
      score,
      rawScore: score,
      timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
      metrics: {},
      type: section.type,
    });
  };

  const handleTransitionContinue = () => {
    setShowTransition(false);
  };

  // Show transition screen after completion
  if (showTransition && transitionData) {
    return (
      <TransitionScreen
        score={transitionData.score}
        xpEarned={transitionData.xp}
        sectionTitle={section.title}
        onContinue={handleTransitionContinue}
      />
    );
  }

  // Route to the correct game component
  const GameComponent = GAME_COMPONENTS[section.id];

  if (GameComponent) {
    return (
      <GameComponent
        section={section}
        onComplete={handleGameComplete}
        onExit={handleGameExit}
        onXPGain={handleXPGain}
      />
    );
  }

  // Fallback for writing and video assessments
  if (section.type === 'writing') {
    return (
      <WritingAssessment
        section={section}
        onComplete={handleGameComplete}
        onExit={handleGameExit}
        onXPGain={handleXPGain}
      />
    );
  }

  if (section.type === 'video') {
    return (
      <VideoAssessment
        section={section}
        onComplete={handleGameComplete}
        onExit={handleGameExit}
        onXPGain={handleXPGain}
      />
    );
  }

  // Ultimate fallback
  return (
    <div className="fixed inset-0 z-[200] bg-background-light dark:bg-background-dark flex items-center justify-center">
      <div className="text-center">
        <p className="text-text-muted mb-4">Unknown assessment type for section: {section.id}</p>
        <button onClick={() => onExit()} className="px-6 py-3 bg-primary text-black font-bold rounded-xl">
          Go Back
        </button>
      </div>
    </div>
  );
};
