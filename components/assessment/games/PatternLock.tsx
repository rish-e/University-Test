import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameComponentProps, GameResult } from '../../../types';
import { patternRounds, PatternElement, PatternRound, ShapeType } from '../../../data/c2-patterns';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { StreakIndicator } from '../shared/StreakIndicator';
import { XPToast } from '../shared/XPToast';

const TOTAL_ROUNDS = 12;
const POINTS_FIRST = 100;
const POINTS_SECOND = 50;
const XP_FIRST = 25;
const XP_SECOND = 10;
const MAX_ATTEMPTS = 3;

// --- SVG shape renderer ---

function renderShape(
  shape: ShapeType,
  color: string,
  size: number,
  rotation: number,
  dim = 50,
): React.ReactElement {
  const s = dim * size;
  const cx = dim / 2;
  const cy = dim / 2;

  const inner = (() => {
    switch (shape) {
      case 'circle':
        return <circle cx={cx} cy={cy} r={s * 0.38} fill={color} />;
      case 'square':
        return (
          <rect
            x={cx - s * 0.34}
            y={cy - s * 0.34}
            width={s * 0.68}
            height={s * 0.68}
            rx={s * 0.06}
            fill={color}
          />
        );
      case 'triangle': {
        const h = s * 0.38;
        const pts = `${cx},${cy - h} ${cx + h * 0.87},${cy + h * 0.5} ${cx - h * 0.87},${cy + h * 0.5}`;
        return <polygon points={pts} fill={color} />;
      }
      case 'diamond': {
        const d = s * 0.38;
        const pts = `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`;
        return <polygon points={pts} fill={color} />;
      }
      case 'hexagon': {
        const r = s * 0.36;
        const pts = Array.from({ length: 6 }, (_, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={pts} fill={color} />;
      }
      case 'star': {
        const outer = s * 0.38;
        const innerR = outer * 0.4;
        const pts = Array.from({ length: 10 }, (_, i) => {
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          const rad = i % 2 === 0 ? outer : innerR;
          return `${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={pts} fill={color} />;
      }
    }
  })();

  return (
    <svg
      width={dim}
      height={dim}
      viewBox={`0 0 ${dim} ${dim}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {inner}
    </svg>
  );
}

// --- Shape card ---

interface ShapeCardProps {
  key?: React.Key;
  element: PatternElement;
  dim?: number;
  onClick?: () => void;
  state?: 'default' | 'selected' | 'correct' | 'wrong' | 'disabled';
  className?: string;
}

function ShapeCard({ element, dim = 50, onClick, state = 'default', className = '' }: ShapeCardProps) {
  const border =
    state === 'correct'
      ? 'border-green-400 bg-green-400/10 shadow-green-400/20 shadow-lg scale-105'
      : state === 'wrong'
      ? 'border-red-400 bg-red-400/10 shadow-red-400/20 shadow-lg animate-[shake_0.4s_ease-in-out]'
      : state === 'selected'
      ? 'border-primary bg-primary/10'
      : state === 'disabled'
      ? 'border-gray-300 dark:border-gray-700 opacity-30 pointer-events-none'
      : 'border-text-main/10 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5';

  return (
    <button
      onClick={onClick}
      disabled={state === 'disabled' || state === 'correct'}
      className={`flex items-center justify-center rounded-2xl border-2 p-3 transition-all duration-200 cursor-pointer active:scale-95 ${border} ${className}`}
    >
      {renderShape(element.shape, element.color, element.size, element.rotation, dim)}
    </button>
  );
}

// --- Empty slot ---

function EmptySlot({ dim = 50 }: { dim?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 p-3 bg-primary/5"
      style={{ width: dim + 24, height: dim + 24 }}
    >
      <span className="text-primary/40 text-2xl font-black">?</span>
    </div>
  );
}

// --- Filled slot (answer placed) ---

function FilledSlot({ element, state, dim = 50 }: { element: PatternElement; state: 'correct' | 'wrong'; dim?: number }) {
  const border = state === 'correct'
    ? 'border-green-400 bg-green-400/10'
    : 'border-red-400 bg-red-400/10 animate-[shake_0.4s_ease-in-out]';
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border-2 p-3 transition-all ${border}`}
      style={{ width: dim + 24, height: dim + 24 }}
    >
      {renderShape(element.shape, element.color, element.size, element.rotation, dim)}
    </div>
  );
}

// --- Main component ---

export const PatternLock: React.FC<GameComponentProps> = ({
  section,
  onComplete,
  onExit,
  onXPGain,
}) => {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0); // attempts this round
  const [disabledIndices, setDisabledIndices] = useState<Set<number>>(new Set());
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<'correct' | 'wrong' | null>(null);
  const [selectedElement, setSelectedElement] = useState<PatternElement | null>(null);
  const [xpToasts, setXpToasts] = useState<{ id: number; amount: number; source: string }[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [candidates, setCandidates] = useState<PatternElement[]>([]);

  const toastCounter = useRef(0);

  const currentRound: PatternRound | undefined = patternRounds[round];
  const streakMultiplier = 1 + streak * 0.25;

  // Shuffle candidates on round change
  useEffect(() => {
    if (!currentRound) return;
    const all = [currentRound.answer, ...currentRound.distractors];
    // Fisher-Yates shuffle
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCandidates(shuffled);
    setAttempts(0);
    setDisabledIndices(new Set());
    setSelectedIdx(null);
    setSelectedElement(null);
    setFeedbackState(null);
  }, [round, started]);

  const addToast = useCallback((amount: number, source: string) => {
    const id = ++toastCounter.current;
    setXpToasts((prev) => [...prev, { id, amount, source }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setXpToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const isMatch = (a: PatternElement, b: PatternElement) =>
    a.shape === b.shape &&
    a.color === b.color &&
    a.rotation === b.rotation &&
    Math.abs(a.size - b.size) < 0.01;

  const handleSelect = (idx: number) => {
    if (feedbackState || disabledIndices.has(idx)) return;

    const picked = candidates[idx];
    setSelectedIdx(idx);
    setSelectedElement(picked);
    const correct = isMatch(picked, currentRound.answer);
    const attemptNum = attempts + 1;
    setAttempts(attemptNum);

    if (correct) {
      setFeedbackState('correct');
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setCorrectCount((c) => c + 1);

      const pts = attemptNum === 1 ? POINTS_FIRST : attemptNum === 2 ? POINTS_SECOND : 0;
      const xp = attemptNum === 1 ? XP_FIRST : attemptNum === 2 ? XP_SECOND : 0;
      setScore((s) => s + pts);

      if (xp > 0) {
        addToast(xp, attemptNum === 1 ? 'perfect' : 'correct');
        onXPGain(xp, attemptNum === 1 ? 'perfect' : 'correct');
        setTotalXP((x) => x + xp);
      }

      if (newStreak >= 3 && attemptNum === 1) {
        const streakXP = Math.floor(5 * streakMultiplier);
        setTimeout(() => {
          addToast(streakXP, 'streak');
          onXPGain(streakXP, 'streak');
        }, 400);
        setTotalXP((x) => x + streakXP);
      }

      // Advance
      setTimeout(() => {
        if (round + 1 >= TOTAL_ROUNDS) {
          setIsFinished(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 1200);
    } else {
      setFeedbackState('wrong');
      setStreak(0);
      setDisabledIndices((prev) => new Set([...prev, idx]));

      // If max attempts used, move on
      if (attemptNum >= MAX_ATTEMPTS) {
        setTimeout(() => {
          if (round + 1 >= TOTAL_ROUNDS) {
            setIsFinished(true);
          } else {
            setRound((r) => r + 1);
          }
        }, 1200);
      } else {
        setTimeout(() => {
          setFeedbackState(null);
          setSelectedIdx(null);
          setSelectedElement(null);
        }, 800);
      }
    }
  };

  // Complete
  useEffect(() => {
    if (!isFinished) return;
    const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);
    const maxScore = TOTAL_ROUNDS * POINTS_FIRST;
    const normalized = Math.round((score / maxScore) * 100);

    const result: GameResult = {
      score: Math.min(100, normalized),
      rawScore: score,
      timeSpent,
      type: 'pattern_lock',
      metrics: {
        correct: correctCount,
        total: TOTAL_ROUNDS,
        bestStreak,
        totalXP,
      },
    };
    onComplete(result);
  }, [isFinished]);

  const handleStart = () => {
    setStarted(true);
    setGameStartTime(Date.now());
  };

  // --- Intro ---
  if (!started) {
    return (
      <GameIntro
        title="PatternLock"
        description="Spot the pattern and pick the missing shape. Difficulty increases each round."
        icon="pattern"
        duration="~6 min"
        rules={[
          'A sequence of shapes is shown with the last one missing.',
          'Pick the correct shape from 6 candidates below.',
          'First attempt correct = full points. Second = half. Third = zero.',
          'Wrong picks are grayed out. Max 3 attempts per round.',
          'Patterns get harder: shape, then color, rotation, and size.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- Finished ---
  if (isFinished) {
    const maxScore = TOTAL_ROUNDS * POINTS_FIRST;
    const pct = Math.round((score / maxScore) * 100);
    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary">emoji_events</span>
          </div>
          <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">Challenge Complete!</h2>
          <p className="text-text-muted mb-6">PatternLock finished</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs font-bold text-text-muted uppercase">Correct</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{correctCount}/{TOTAL_ROUNDS}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs font-bold text-text-muted uppercase">Best Streak</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{bestStreak}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs font-bold text-text-muted uppercase">Score</p>
              <p className="text-3xl font-black text-primary">{pct}%</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs font-bold text-text-muted uppercase">XP Earned</p>
              <p className="text-3xl font-black text-orange-500">{totalXP}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Game round ---
  if (!currentRound) return null;

  const sequence = currentRound.sequence;
  const difficultyLabels = ['', 'Shape Only', 'Shape + Color', 'Shape + Color + Rotation', 'Full Pattern'];

  return (
    <div className="max-w-2xl mx-auto mt-4 relative">
      {/* XP Toasts */}
      {xpToasts.map((t) => (
        <XPToast key={t.id} amount={t.amount} source={t.source} onDone={() => removeToast(t.id)} />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <ProgressTrack current={round} total={TOTAL_ROUNDS} />
        <div className="flex items-center gap-4">
          <StreakIndicator streak={streak} multiplier={streakMultiplier} />
          <ScoreDisplay score={score} label="Score" />
        </div>
      </div>

      {/* Difficulty badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
          Difficulty {currentRound.difficulty}
        </span>
        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-black rounded-full">
          {difficultyLabels[currentRound.difficulty]}
        </span>
        {attempts > 0 && attempts < MAX_ATTEMPTS && feedbackState !== 'correct' && (
          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-500 text-xs font-black rounded-full">
            Attempt {attempts}/{MAX_ATTEMPTS}
          </span>
        )}
      </div>

      {/* Sequence row */}
      <div className="bg-card-bg dark:bg-card-bg-dark rounded-3xl p-6 sm:p-8 border border-text-main/5 dark:border-white/5 mb-4">
        <p className="text-sm font-bold text-text-muted mb-4 text-center">
          What comes next in the sequence?
        </p>
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {sequence.map((el, i) => (
            <div
              key={i}
              className="bg-background-light dark:bg-white/5 rounded-2xl border border-text-main/5 dark:border-white/5 p-3 transition-all"
            >
              {renderShape(el.shape, el.color, el.size, el.rotation, 50)}
            </div>
          ))}

          {/* Empty or filled answer slot */}
          {feedbackState && selectedElement ? (
            <FilledSlot element={selectedElement} state={feedbackState} dim={50} />
          ) : (
            <EmptySlot dim={50} />
          )}
        </div>
      </div>

      {/* Candidates grid */}
      <div className="bg-card-bg dark:bg-card-bg-dark rounded-3xl p-6 border border-text-main/5 dark:border-white/5">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 text-center">
          Choose the missing piece
        </p>
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {candidates.map((el, i) => {
            let state: ShapeCardProps['state'] = 'default';
            if (disabledIndices.has(i)) state = 'disabled';
            if (selectedIdx === i && feedbackState === 'correct') state = 'correct';
            if (selectedIdx === i && feedbackState === 'wrong') state = 'wrong';
            return (
              <ShapeCard
                key={`${round}-${i}`}
                element={el}
                dim={44}
                state={state}
                onClick={() => handleSelect(i)}
                className="bg-background-light dark:bg-white/5"
              />
            );
          })}
        </div>
      </div>

      {/* Exit */}
      <button
        onClick={() =>
          onExit({
            step: round,
            correctCount,
            textInput: '',
            gameScore: score,
            simState: null,
            streakBest: bestStreak,
            xpEarned: totalXP,
          })
        }
        className="mt-4 text-xs text-text-muted hover:text-text-main dark:hover:text-white transition-colors"
      >
        Save &amp; Exit
      </button>

      {/* Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PatternLock;
