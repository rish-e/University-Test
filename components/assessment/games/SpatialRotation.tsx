import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';

// --- SVG Shape Definitions ---
// Each shape is an SVG path string defining a geometric figure
const SHAPES = [
  // 0: L-shape
  { path: 'M 0 0 L 40 0 L 40 20 L 20 20 L 20 60 L 0 60 Z', name: 'L-shape', complexity: 1 },
  // 1: T-shape
  { path: 'M 0 0 L 60 0 L 60 20 L 40 20 L 40 60 L 20 60 L 20 20 L 0 20 Z', name: 'T-shape', complexity: 1 },
  // 2: Z-shape (step)
  { path: 'M 0 0 L 40 0 L 40 20 L 60 20 L 60 40 L 20 40 L 20 20 L 0 20 Z', name: 'Z-shape', complexity: 1 },
  // 3: Arrow
  { path: 'M 20 0 L 40 0 L 40 30 L 60 30 L 30 60 L 0 30 L 20 30 Z', name: 'Arrow', complexity: 2 },
  // 4: Plus sign
  { path: 'M 20 0 L 40 0 L 40 20 L 60 20 L 60 40 L 40 40 L 40 60 L 20 60 L 20 40 L 0 40 L 0 20 L 20 20 Z', name: 'Plus', complexity: 2 },
  // 5: Pentagon-like
  { path: 'M 30 0 L 60 20 L 50 55 L 10 55 L 0 20 Z', name: 'Pentagon', complexity: 2 },
  // 6: Irregular hexagon
  { path: 'M 15 0 L 45 0 L 60 25 L 45 50 L 15 50 L 0 25 Z', name: 'Hexagon', complexity: 3 },
  // 7: F-shape
  { path: 'M 0 0 L 50 0 L 50 15 L 15 15 L 15 25 L 40 25 L 40 40 L 15 40 L 15 60 L 0 60 Z', name: 'F-shape', complexity: 3 },
  // 8: Hook shape
  { path: 'M 0 0 L 20 0 L 20 35 L 40 35 L 40 0 L 60 0 L 60 55 L 0 55 L 0 35 L 0 35 Z', name: 'Hook', complexity: 3 },
  // 9: Asymmetric polygon
  { path: 'M 10 0 L 50 0 L 60 30 L 40 60 L 0 45 Z', name: 'Kite', complexity: 3 },
];

// Rotation angles available: 90, 180, 270 for easy; add 45, 135, 225, 315 for hard
const EASY_ROTATIONS = [90, 180, 270];
const HARD_ROTATIONS = [45, 90, 135, 180, 225, 270, 315];

interface RoundData {
  shapeIndex: number;
  correctRotation: number;
  options: number[]; // 4 rotation angles, one is correct
  isMirrored: boolean;
}

function generateRound(difficulty: number): RoundData {
  // Higher difficulty = more complex shapes + more rotation options
  const availableShapes = SHAPES.filter(s => s.complexity <= Math.min(3, Math.ceil(difficulty / 3)));
  const shapeIndex = SHAPES.indexOf(availableShapes[Math.floor(Math.random() * availableShapes.length)]);

  const rotations = difficulty >= 5 ? HARD_ROTATIONS : EASY_ROTATIONS;
  const correctRotation = rotations[Math.floor(Math.random() * rotations.length)];

  // Generate 3 wrong rotations
  const wrongRotations: number[] = [];
  const allAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const available = allAngles.filter(a => a !== correctRotation && a !== 0);
  while (wrongRotations.length < 3 && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    wrongRotations.push(available.splice(idx, 1)[0]);
  }

  // Shuffle options
  const options = [correctRotation, ...wrongRotations];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    shapeIndex,
    correctRotation,
    options,
    isMirrored: difficulty >= 7 && Math.random() > 0.6,
  };
}

type GamePhase = 'intro' | 'playing' | 'complete';

export const SpatialRotation: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [round, setRound] = useState<RoundData | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const spawnRound = useCallback(() => {
    setRound(generateRound(difficulty));
    setFeedback(null);
    setSelectedOption(null);
  }, [difficulty]);

  // Start game
  const handleStart = () => {
    setPhase('playing');
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(60);
    setTotalAttempts(0);
    setCorrectCount(0);
    setDifficulty(1);
    startTimeRef.current = Date.now();
    spawnRound();
  };

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPhase('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Spawn new round when difficulty changes during play
  useEffect(() => {
    if (phase === 'playing' && !round) spawnRound();
  }, [phase, round, spawnRound]);

  const handleOptionClick = (optionRotation: number, idx: number) => {
    if (feedback !== null || phase !== 'playing') return;
    setSelectedOption(idx);
    setTotalAttempts(a => a + 1);

    if (round && optionRotation === round.correctRotation) {
      // Correct
      const newCombo = combo + 1;
      const points = 10 + (newCombo >= 3 ? 5 : 0); // bonus for streak
      setScore(s => s + points);
      setCombo(newCombo);
      setBestCombo(b => Math.max(b, newCombo));
      setCorrectCount(c => c + 1);
      setFeedback('correct');
      onXPGain(points, 'Correct rotation');

      // Increase difficulty every 3 correct
      if ((correctCount + 1) % 3 === 0) {
        setDifficulty(d => Math.min(10, d + 1));
      }
    } else {
      // Wrong
      setCombo(0);
      setFeedback('wrong');
    }

    // Move to next after brief pause
    setTimeout(() => {
      setRound(null);
      spawnRound();
    }, 600);
  };

  const handleFinish = () => {
    const normalized = Math.min(100, Math.round((score / 100) * 100));
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      score: normalized,
      rawScore: score,
      timeSpent,
      metrics: {
        correct: correctCount,
        total: totalAttempts,
        accuracy: totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0,
        bestCombo,
        difficulty,
      },
      type: 'game',
    };
    onComplete(result);
  };

  const handleGameExit = () => {
    const progress: AssessmentProgress = {
      step: totalAttempts,
      correctCount,
      textInput: '',
      gameScore: score,
      simState: null,
      streakBest: bestCombo,
    };
    onExit(progress);
  };

  // --- SVG Shape Renderer ---
  const renderShape = (shapeIndex: number, rotation: number, mirrored: boolean, size: number = 80) => {
    const shape = SHAPES[shapeIndex];
    return (
      <svg width={size} height={size} viewBox="-5 -5 70 70" className="transition-transform duration-200">
        <g
          transform={`translate(30, 30) rotate(${rotation}) ${mirrored ? 'scale(-1,1)' : ''} translate(-30, -30)`}
        >
          <path
            d={shape.path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      </svg>
    );
  };

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Spatial Rotation"
        description="Identify the correct rotation of a shape. Test your abstract thinking and spatial reasoning."
        icon="3d_rotation"
        duration="60 seconds"
        rules={[
          'A reference shape is shown on the left.',
          'Pick the correctly rotated version from 4 candidates on the right.',
          'Difficulty increases as you answer correctly.',
          'Combo streaks earn bonus points!',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const normalized = Math.min(100, Math.round((score / 100) * 100));
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">emoji_events</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">Time's Up!</h2>
          <p className="text-text-muted mb-8">Here's how you performed</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Score</p>
              <p className="text-3xl font-black text-primary">{normalized}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Accuracy</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{accuracy}%</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Correct</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{correctCount}/{totalAttempts}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Best Combo</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{bestCombo}x</p>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            Finish Module
          </button>
        </div>
      </div>
    );
  }

  // --- PLAYING ---
  if (!round) return null;

  const shape = SHAPES[round.shapeIndex];

  return (
    <div className="max-w-2xl mx-auto mt-8 animate-[fadeIn_0.2s_ease-out]">
      {/* HUD */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-4">
          <button onClick={handleGameExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="text-2xl font-black text-text-main dark:text-white">{score}</span>
            <span className="text-xs text-text-muted ml-1">pts</span>
          </div>
        </div>

        {/* Combo indicator */}
        {combo >= 2 && (
          <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full text-sm font-bold animate-[bounceIn_0.3s_ease-out]">
            <span className="material-symbols-outlined text-base">local_fire_department</span>
            {combo}x Combo
          </div>
        )}

        <div className={`font-mono font-bold text-xl ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-text-main dark:text-white'}`}>
          {timeLeft}s
        </div>
      </div>

      {/* Game Area */}
      <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 text-center">
          Level {difficulty} — {shape.name}
        </div>

        <div className="flex items-center justify-center gap-8 mb-8">
          {/* Reference shape */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Reference</span>
            <div className="size-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center text-text-main dark:text-white bg-background-light dark:bg-white/5">
              {renderShape(round.shapeIndex, 0, false, 90)}
            </div>
          </div>

          <span className="material-symbols-outlined text-3xl text-gray-300 dark:text-gray-600">arrow_forward</span>

          {/* Candidates */}
          <div className="grid grid-cols-2 gap-3">
            {round.options.map((rotation, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectAnswer = rotation === round.correctRotation;
              let borderClass = 'border-transparent hover:border-primary/40';
              if (feedback && isSelected) {
                borderClass = isCorrectAnswer ? 'border-green-500 bg-green-50 dark:bg-green-500/10' : 'border-red-500 bg-red-50 dark:bg-red-500/10';
              } else if (feedback && isCorrectAnswer) {
                borderClass = 'border-green-500/50';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(rotation, idx)}
                  disabled={feedback !== null}
                  className={`size-24 border-2 rounded-xl flex items-center justify-center transition-all duration-200 text-text-main dark:text-white
                    ${borderClass}
                    ${feedback === null ? 'bg-background-light dark:bg-white/5 hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'}
                  `}
                >
                  {renderShape(round.shapeIndex, rotation, round.isMirrored && idx === 0, 70)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback text */}
        <div className="h-8 flex items-center justify-center">
          {feedback === 'correct' && (
            <span className="text-green-500 font-bold animate-[fadeIn_0.2s_ease-out] flex items-center gap-1">
              <span className="material-symbols-outlined">check_circle</span>
              Correct! {combo >= 3 ? `(${combo}x combo bonus!)` : ''}
            </span>
          )}
          {feedback === 'wrong' && (
            <span className="text-red-500 font-bold animate-[fadeIn_0.2s_ease-out] flex items-center gap-1">
              <span className="material-symbols-outlined">cancel</span>
              Wrong — combo reset
            </span>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="mt-4 flex justify-center">
        <ProgressTrack current={correctCount} total={Math.max(correctCount + 1, 10)} />
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
