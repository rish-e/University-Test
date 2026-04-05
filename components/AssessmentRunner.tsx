import React, { useState, useRef } from 'react';
import { ModuleSection, GameResult, AssessmentProgress } from '../types';
import { TransitionScreen } from './assessment/shared/TransitionScreen';

// Game Components
import { SpaceDefender } from './assessment/games/SpaceDefender';
import { MarketTrader } from './assessment/games/MarketTrader';
import { StartupLaunch } from './assessment/games/StartupLaunch';
import { PatternMachine } from './assessment/games/PatternMachine';
import { NegotiationArena } from './assessment/games/NegotiationArena';

interface AssessmentRunnerProps {
  section: ModuleSection;
  onComplete: (result: { score: number; type: string; data?: any }) => void;
  onExit: (progress?: any) => void;
}

const GAME_COMPONENTS: Record<string, React.FC<any>> = {
  'space-defender': SpaceDefender,
  'market-trader': MarketTrader,
  'startup-launch': StartupLaunch,
  'pattern-machine': PatternMachine,
  'negotiation-arena': NegotiationArena,
};

export const AssessmentRunner: React.FC<AssessmentRunnerProps> = ({
  section, onComplete, onExit
}) => {
  const [showTransition, setShowTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{ score: number; xp: number } | null>(null);

  const handleGameComplete = (result: GameResult) => {
    const xpEarned = Math.round(50 + result.score * 0.5);
    setTransitionData({ score: result.score, xp: xpEarned });
    setShowTransition(true);
    onComplete({ score: result.score, type: result.type, data: result.data });
  };

  const handleGameExit = (progressState?: AssessmentProgress) => {
    onExit(progressState);
  };

  const handleXPGain = (_amount: number, _source: string) => {};

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
