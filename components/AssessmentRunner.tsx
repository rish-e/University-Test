import React, { useState, useRef } from 'react';
import { ModuleSection, GameResult, AssessmentProgress } from '../types';
import { TransitionScreen } from './assessment/shared/TransitionScreen';

// Game Components — one per section
import { DataDash } from './assessment/games/DataDash';
import { BehavioralGame } from './assessment/games/BehavioralGame';
import { TechnicalGame } from './assessment/games/TechnicalGame';
import { CaseCommand } from './assessment/games/CaseCommand';
import { EQScenarios } from './assessment/games/EQScenarios';

interface AssessmentRunnerProps {
  section: ModuleSection;
  onComplete: (result: { score: number; type: string; data?: any }) => void;
  onExit: (progress?: any) => void;
}

// Map section IDs to game components
const GAME_COMPONENTS: Record<string, React.FC<any>> = {
  'quantitative': DataDash,
  'behavioral': BehavioralGame,
  'technical': TechnicalGame,
  'communication': CaseCommand,
  'eq-scenarios': EQScenarios,
};

export const AssessmentRunner: React.FC<AssessmentRunnerProps> = ({
  section, onComplete, onExit
}) => {
  const [showTransition, setShowTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{ score: number; xp: number } | null>(null);
  const startTimeRef = useRef(Date.now());

  const handleGameComplete = (result: GameResult) => {
    const xpEarned = Math.round(50 + result.score * 0.5);
    setTransitionData({ score: result.score, xp: xpEarned });
    setShowTransition(true);

    onComplete({
      score: result.score,
      type: result.type,
      data: result.data,
    });
  };

  const handleGameExit = (progressState?: AssessmentProgress) => {
    onExit(progressState);
  };

  const handleXPGain = (_amount: number, _source: string) => {
    // XP tracking handled by gamification engine on completion
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

  const content = GameComponent ? (
    <GameComponent
      section={section}
      onComplete={handleGameComplete}
      onExit={handleGameExit}
      onXPGain={handleXPGain}
    />
  ) : (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-text-muted mb-4">Unknown game: {section.id}</p>
        <button onClick={() => onExit()} className="px-6 py-3 bg-primary text-black font-bold rounded-xl">
          Go Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-background-light dark:bg-background-dark overflow-y-auto">
      {content}
    </div>
  );
};
