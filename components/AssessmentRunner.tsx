import React, { useState } from 'react';
import { ModuleSection, GameResult, AssessmentProgress } from '../types';
import { TransitionScreen } from './assessment/shared/TransitionScreen';

import { MemoryTiles } from './assessment/games/MemoryTiles';
import { BalloonPump } from './assessment/games/BalloonPump';
import { ColorSwitch } from './assessment/games/ColorSwitch';
import { PatternMachine } from './assessment/games/PatternMachine';
import { TrustExchange } from './assessment/games/TrustExchange';

interface AssessmentRunnerProps {
  section: ModuleSection;
  onComplete: (result: { score: number; type: string; data?: any }) => void;
  onExit: (progress?: any) => void;
}

const GAME_COMPONENTS: Record<string, React.FC<any>> = {
  'memory-tiles': MemoryTiles,
  'balloon-pump': BalloonPump,
  'color-switch': ColorSwitch,
  'pattern-machine': PatternMachine,
  'trust-exchange': TrustExchange,
};

export const AssessmentRunner: React.FC<AssessmentRunnerProps> = ({ section, onComplete, onExit }) => {
  const [showTransition, setShowTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{ score: number; xp: number } | null>(null);

  const handleGameComplete = (result: GameResult) => {
    const xpEarned = Math.round(50 + result.score * 0.5);
    setTransitionData({ score: result.score, xp: xpEarned });
    setShowTransition(true);
    onComplete({ score: result.score, type: result.type, data: result.data });
  };

  const handleGameExit = (progressState?: AssessmentProgress) => { onExit(progressState); };
  const handleXPGain = () => {};

  if (showTransition && transitionData) {
    return (
      <TransitionScreen
        score={transitionData.score}
        xpEarned={transitionData.xp}
        sectionTitle={section.title}
        onContinue={() => setShowTransition(false)}
      />
    );
  }

  const GameComponent = GAME_COMPONENTS[section.id];
  const content = GameComponent ? (
    <GameComponent section={section} onComplete={handleGameComplete} onExit={handleGameExit} onXPGain={handleXPGain} />
  ) : (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-text-muted mb-4">Unknown game: {section.id}</p>
        <button onClick={() => onExit()} className="px-6 py-3 bg-primary text-black font-bold rounded-xl">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-background-light dark:bg-background-dark overflow-y-auto">
      {content}
    </div>
  );
};
