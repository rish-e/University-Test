import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameComponentProps, GameResult } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';
import { argumentRounds, FLAW_LABELS, type FlawType, type ArgumentRound } from '../../../data/c4-arguments';

type Phase = 'intro' | 'clause-select' | 'flaw-classify' | 'explanation' | 'complete';

const POINTS_PER_CORRECT_CLAUSE = 50;
const POINTS_PER_CORRECT_FLAW = 50;
const TOTAL_ROUNDS = argumentRounds.length;
const MAX_POSSIBLE = TOTAL_ROUNDS * (POINTS_PER_CORRECT_CLAUSE + POINTS_PER_CORRECT_FLAW);

const FLAW_TYPE_OPTIONS: FlawType[] = [
  'correlation_causation',
  'ad_hominem',
  'straw_man',
  'false_dilemma',
  'circular_reasoning',
  'appeal_to_fear',
];

const ALL_FLAW_OPTIONS: FlawType[] = [
  'correlation_causation',
  'ad_hominem',
  'straw_man',
  'false_dilemma',
  'circular_reasoning',
  'appeal_to_fear',
  'appeal_to_authority',
  'hasty_generalization',
];

function getFlawOptions(round: ArgumentRound): FlawType[] {
  const correct = round.flawType;
  if (FLAW_TYPE_OPTIONS.includes(correct)) {
    return FLAW_TYPE_OPTIONS;
  }
  // Swap out one non-correct option for the correct one
  const options = [...FLAW_TYPE_OPTIONS];
  const replaceIndex = options.findIndex((f) => f !== correct);
  if (replaceIndex !== -1) {
    options[replaceIndex] = correct;
  }
  return options;
}

export const DebateArena: React.FC<GameComponentProps> = ({
  section,
  onComplete,
  onExit,
  onXPGain,
}) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [clauseCorrectCount, setClauseCorrectCount] = useState(0);
  const [flawCorrectCount, setFlawCorrectCount] = useState(0);

  // Phase 1 state
  const [selectedClause, setSelectedClause] = useState<number | null>(null);
  const [clauseCorrect, setClauseCorrect] = useState<boolean | null>(null);
  const [shakeClause, setShakeClause] = useState<number | null>(null);

  // Phase 2 state
  const [selectedFlaw, setSelectedFlaw] = useState<FlawType | null>(null);
  const [flawCorrect, setFlawCorrect] = useState<boolean | null>(null);

  // Explanation fade-in
  const [showExplanation, setShowExplanation] = useState(false);

  const startTimeRef = useRef(Date.now());
  const roundStartRef = useRef(Date.now());

  const currentRound = argumentRounds[roundIndex];
  const flawOptions = currentRound ? getFlawOptions(currentRound) : [];

  const handleStart = useCallback(() => {
    startTimeRef.current = Date.now();
    roundStartRef.current = Date.now();
    setPhase('clause-select');
  }, []);

  const handleClauseClick = useCallback(
    (index: number) => {
      if (selectedClause !== null) return;
      setSelectedClause(index);

      const isCorrect = index === currentRound.flawClauseIndex;
      setClauseCorrect(isCorrect);

      if (isCorrect) {
        const newScore = score + POINTS_PER_CORRECT_CLAUSE;
        setScore(newScore);
        setClauseCorrectCount((c) => c + 1);
        onXPGain(15, 'Correct clause identified');
      } else {
        setShakeClause(index);
        setTimeout(() => setShakeClause(null), 500);
      }

      // Move to phase 2 after a brief pause
      setTimeout(() => {
        setPhase('flaw-classify');
      }, 800);
    },
    [selectedClause, currentRound, score, onXPGain]
  );

  const handleFlawSelect = useCallback(
    (flaw: FlawType) => {
      if (selectedFlaw !== null) return;
      setSelectedFlaw(flaw);

      const isCorrect = flaw === currentRound.flawType;
      setFlawCorrect(isCorrect);

      if (isCorrect) {
        const newScore = score + POINTS_PER_CORRECT_FLAW;
        setScore(newScore);
        setFlawCorrectCount((c) => c + 1);
        onXPGain(15, 'Correct flaw classification');
      }

      // Show explanation
      setTimeout(() => {
        setPhase('explanation');
        setTimeout(() => setShowExplanation(true), 100);
      }, 600);
    },
    [selectedFlaw, currentRound, score, onXPGain]
  );

  const handleNext = useCallback(() => {
    const nextRound = roundIndex + 1;

    if (nextRound >= TOTAL_ROUNDS) {
      setPhase('complete');
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      // Use the latest score values by computing from counts
      const finalClauseCorrect = clauseCorrectCount + (clauseCorrect ? 0 : 0);
      const finalFlawCorrect = flawCorrectCount + (flawCorrect ? 0 : 0);
      // score state already has the latest value
      const finalScore = score + (clauseCorrect && selectedClause === currentRound.flawClauseIndex && phase === 'explanation' ? 0 : 0);

      const result: GameResult = {
        score: Math.round((score / MAX_POSSIBLE) * 100),
        rawScore: score,
        timeSpent,
        type: 'debate_arena',
        metrics: {
          clauseAccuracy: clauseCorrectCount / TOTAL_ROUNDS,
          flawAccuracy: flawCorrectCount / TOTAL_ROUNDS,
          totalRounds: TOTAL_ROUNDS,
          pointsEarned: score,
          maxPoints: MAX_POSSIBLE,
        },
      };
      onComplete(result);
      return;
    }

    // Reset for next round
    setRoundIndex(nextRound);
    setSelectedClause(null);
    setClauseCorrect(null);
    setShakeClause(null);
    setSelectedFlaw(null);
    setFlawCorrect(null);
    setShowExplanation(false);
    setPhase('clause-select');
    roundStartRef.current = Date.now();
  }, [
    roundIndex,
    score,
    clauseCorrectCount,
    flawCorrectCount,
    clauseCorrect,
    flawCorrect,
    selectedClause,
    currentRound,
    phase,
    onComplete,
  ]);

  const handleExit = useCallback(() => {
    onExit({
      step: roundIndex,
      correctCount: clauseCorrectCount + flawCorrectCount,
      textInput: '',
      gameScore: score,
      simState: null,
      xpEarned: score,
    });
  }, [roundIndex, clauseCorrectCount, flawCorrectCount, score, onExit]);

  // Intro screen
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Debate Arena"
        description="Judge arguments like a pro. Find the logical flaw, then classify it."
        icon="gavel"
        duration="5-8 min"
        rules={[
          'Read each argument carefully -- it contains a logical flaw',
          'Click the clause (sentence) that contains the flaw',
          'Then classify the type of flaw from the options provided',
          'Earn up to 100 points per round (50 for finding + 50 for classifying)',
        ]}
        onStart={handleStart}
      />
    );
  }

  // Completion screen
  if (phase === 'complete') {
    const normalizedScore = Math.round((score / MAX_POSSIBLE) * 100);
    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">emoji_events</span>
          </div>
          <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">
            Debate Complete
          </h2>
          <p className="text-4xl font-black text-primary mb-2">{normalizedScore}</p>
          <p className="text-sm text-text-muted mb-6">out of 100</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-2xl font-black text-text-main dark:text-white">
                {clauseCorrectCount}/{TOTAL_ROUNDS}
              </p>
              <p className="text-xs text-text-muted">Flaws Found</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-2xl font-black text-text-main dark:text-white">
                {flawCorrectCount}/{TOTAL_ROUNDS}
              </p>
              <p className="text-xs text-text-muted">Correct Classifications</p>
            </div>
          </div>

          <p className="text-sm text-text-muted">
            Total points: {score} / {MAX_POSSIBLE}
          </p>
        </div>
      </div>
    );
  }

  // Game play screens
  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <ProgressTrack current={roundIndex} total={TOTAL_ROUNDS} />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
            <span className="material-symbols-outlined text-sm text-primary">star</span>
            <span className="text-sm font-bold text-primary tabular-nums">{score}</span>
          </div>
          <button
            onClick={handleExit}
            className="text-text-muted hover:text-text-main dark:hover:text-white transition-colors"
            aria-label="Exit game"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
            phase === 'clause-select'
              ? 'bg-blue-500/10 text-blue-500'
              : 'bg-primary/10 text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {phase === 'clause-select' ? 'search' : phase === 'flaw-classify' ? 'category' : 'lightbulb'}
          </span>
          {phase === 'clause-select'
            ? 'Phase 1: Find the Flaw'
            : phase === 'flaw-classify'
            ? 'Phase 2: Classify the Flaw'
            : 'Explanation'}
        </div>
      </div>

      {/* Speech card */}
      <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-6 mb-6">
        {/* Context */}
        <div className="flex items-start gap-3 mb-4">
          <span className="material-symbols-outlined text-2xl text-text-muted mt-0.5 shrink-0">
            format_quote
          </span>
          <p className="text-sm text-text-muted italic">{currentRound.context}</p>
        </div>

        {/* Clauses */}
        <div className="space-y-1 pl-9">
          {currentRound.clauses.map((clause, i) => {
            let clauseStyles = 'cursor-pointer hover:bg-blue-500/10 dark:hover:bg-blue-500/15';
            let isInteractive = phase === 'clause-select' && selectedClause === null;

            // After selection
            if (selectedClause !== null) {
              isInteractive = false;
              clauseStyles = '';

              if (i === currentRound.flawClauseIndex) {
                // Always show correct clause in green after selection
                clauseStyles = 'bg-green-500/15 text-green-700 dark:text-green-400 ring-1 ring-green-500/30';
              } else if (i === selectedClause && !clauseCorrect) {
                // Wrong selection shakes and shows red
                clauseStyles = `bg-red-500/15 text-red-700 dark:text-red-400 ring-1 ring-red-500/30 ${
                  shakeClause === i ? 'animate-[shake_0.5s_ease-in-out]' : ''
                }`;
              } else {
                clauseStyles = 'opacity-50';
              }
            }

            return (
              <span
                key={i}
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                onClick={isInteractive ? () => handleClauseClick(i) : undefined}
                onKeyDown={
                  isInteractive
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleClauseClick(i);
                        }
                      }
                    : undefined
                }
                className={`inline text-base leading-relaxed rounded-md px-1.5 py-0.5 transition-all duration-200 ${clauseStyles} ${
                  isInteractive ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {clause}{' '}
              </span>
            );
          })}
        </div>
      </div>

      {/* Phase 2: Flaw classification */}
      {(phase === 'flaw-classify' || phase === 'explanation') && (
        <div className="animate-[fadeIn_0.3s_ease-out] mb-6">
          <p className="text-sm font-bold text-text-muted mb-3 uppercase tracking-wider">
            What type of logical flaw is this?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {flawOptions.map((flaw) => {
              let btnStyles =
                'bg-card-bg dark:bg-card-bg-dark border border-text-main/10 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5';
              let isClickable = phase === 'flaw-classify' && selectedFlaw === null;

              if (selectedFlaw !== null) {
                isClickable = false;
                if (flaw === currentRound.flawType) {
                  btnStyles =
                    'bg-green-500/15 border border-green-500/40 text-green-700 dark:text-green-400';
                } else if (flaw === selectedFlaw && !flawCorrect) {
                  btnStyles =
                    'bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-400';
                } else {
                  btnStyles =
                    'bg-card-bg dark:bg-card-bg-dark border border-text-main/5 dark:border-white/5 opacity-40';
                }
              }

              return (
                <button
                  key={flaw}
                  onClick={isClickable ? () => handleFlawSelect(flaw) : undefined}
                  disabled={!isClickable}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${btnStyles} ${
                    isClickable ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default'
                  }`}
                >
                  {FLAW_LABELS[flaw]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Explanation */}
      {phase === 'explanation' && (
        <div
          className={`transition-opacity duration-500 ${
            showExplanation ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-500 mt-0.5 shrink-0">
                lightbulb
              </span>
              <div>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {FLAW_LABELS[currentRound.flawType]}
                </p>
                <p className="text-sm text-text-main dark:text-gray-300 leading-relaxed">
                  {currentRound.explanation}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-text-muted">
              Round score:{' '}
              <span className="font-bold text-text-main dark:text-white">
                {(clauseCorrect ? POINTS_PER_CORRECT_CLAUSE : 0) +
                  (flawCorrect ? POINTS_PER_CORRECT_FLAW : 0)}
              </span>
              /100
            </div>
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all shadow-md shadow-primary/20"
            >
              {roundIndex < TOTAL_ROUNDS - 1 ? 'Next Argument' : 'See Results'}
            </button>
          </div>
        </div>
      )}

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DebateArena;
