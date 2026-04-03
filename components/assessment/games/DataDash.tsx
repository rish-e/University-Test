import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { dataDashScenarios, DataDashScenario } from '../../../data/c1-scenarios';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { StreakIndicator } from '../shared/StreakIndicator';
import { XPToast } from '../shared/XPToast';

const TOTAL_ROUNDS = 15;
const SPEED_THRESHOLD = 15; // seconds
const SPEED_XP = 10;
const CORRECT_XP = 20;
const STREAK_MULTIPLIER_STEP = 0.25; // each streak adds 0.25x

// --- Visual sub-components ---

function BarChart({ data }: { data: DataDashScenario['data'] }) {
  const maxVal = Math.max(...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-muted w-32 text-right truncate">
            {item.label}
          </span>
          <div className="flex-1 bg-gray-100 dark:bg-white/5 rounded-full h-8 overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3"
              style={{
                width: `${(item.value / maxVal) * 100}%`,
                backgroundColor: item.color || '#3B82F6',
                minWidth: '2rem',
              }}
            >
              <span className="text-xs font-black text-white drop-shadow-sm">
                {item.value.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ data, title }: { data: DataDashScenario['data']; title: string }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-text-main/10 dark:border-white/10">
          <th className="text-left py-2 px-3 text-text-muted font-bold text-xs uppercase tracking-wider">
            Item
          </th>
          <th className="text-right py-2 px-3 text-text-muted font-bold text-xs uppercase tracking-wider">
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, i) => (
          <tr
            key={i}
            className="border-b border-text-main/5 dark:border-white/5 hover:bg-primary/5 transition-colors"
          >
            <td className="py-2.5 px-3 text-text-main dark:text-white font-medium">
              {item.label}
            </td>
            <td className="py-2.5 px-3 text-right text-text-main dark:text-white font-black tabular-nums">
              {item.value.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function KPICards({ data }: { data: DataDashScenario['data'] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {data.map((item, i) => (
        <div
          key={i}
          className="bg-background-light dark:bg-white/5 rounded-2xl p-4 text-center border border-text-main/5 dark:border-white/5"
        >
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
            {item.label}
          </p>
          <p className="text-2xl font-black text-text-main dark:text-white tabular-nums">
            {item.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function VisualDisplay({ scenario }: { scenario: DataDashScenario }) {
  switch (scenario.visual) {
    case 'bar_chart':
      return <BarChart data={scenario.data} />;
    case 'table':
      return <DataTable data={scenario.data} title={scenario.title} />;
    case 'kpi_card':
      return <KPICards data={scenario.data} />;
  }
}

// --- Main component ---

export const DataDash: React.FC<GameComponentProps> = ({
  section,
  onComplete,
  onExit,
  onXPGain,
}) => {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [xpToasts, setXpToasts] = useState<{ id: number; amount: number; source: string }[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const toastCounter = useRef(0);

  const scenario = dataDashScenarios[round];
  const streakMultiplier = 1 + streak * STREAK_MULTIPLIER_STEP;

  // Focus input when round changes
  useEffect(() => {
    if (started && !isFinished && inputRef.current) {
      inputRef.current.focus();
    }
  }, [round, started, isFinished]);

  // Set round start time
  useEffect(() => {
    if (started && !isFinished) {
      setRoundStartTime(Date.now());
    }
  }, [round, started, isFinished]);

  const addToast = useCallback((amount: number, source: string) => {
    const id = ++toastCounter.current;
    setXpToasts((prev) => [...prev, { id, amount, source }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setXpToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleStart = () => {
    setStarted(true);
    setGameStartTime(Date.now());
    setRoundStartTime(Date.now());
  };

  const checkAnswer = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) return;

    const correct = scenario.correctAnswer;
    const tol = scenario.tolerance;
    const isCorrect =
      tol === 0
        ? Math.abs(parsed - correct) < 0.001
        : Math.abs(parsed - correct) / Math.abs(correct || 1) <= tol;

    const timeTaken = (Date.now() - roundStartTime) / 1000;
    const isFast = timeTaken <= SPEED_THRESHOLD;

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setCorrectCount((c) => c + 1);

      // XP
      let roundXP = CORRECT_XP;
      addToast(CORRECT_XP, 'correct');
      onXPGain(CORRECT_XP, 'correct');

      if (isFast) {
        roundXP += SPEED_XP;
        setTimeout(() => {
          addToast(SPEED_XP, 'speed');
          onXPGain(SPEED_XP, 'speed');
        }, 300);
      }

      if (newStreak >= 3) {
        const streakXP = Math.floor(5 * streakMultiplier);
        setTimeout(() => {
          addToast(streakXP, 'streak');
          onXPGain(streakXP, 'streak');
        }, 600);
        roundXP += streakXP;
      }

      setTotalXP((x) => x + roundXP);
      setScore((s) => s + roundXP);
      setFeedback('correct');
    } else {
      setStreak(0);
      setFeedback('incorrect');
    }

    // Advance after delay
    setTimeout(() => {
      setFeedback(null);
      setInput('');
      if (round + 1 >= TOTAL_ROUNDS) {
        setIsFinished(true);
      } else {
        setRound((r) => r + 1);
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  // Complete the game
  useEffect(() => {
    if (!isFinished) return;
    const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);
    const baseScore = (correctCount / TOTAL_ROUNDS) * 100;
    const avgTimePerRound = timeSpent / TOTAL_ROUNDS;
    const speedBonus = avgTimePerRound < SPEED_THRESHOLD ? (1 - avgTimePerRound / SPEED_THRESHOLD) * 20 : 0;
    const finalScore = Math.min(100, Math.round(baseScore + speedBonus));

    const result: GameResult = {
      score: finalScore,
      rawScore: correctCount,
      timeSpent,
      type: 'data_dash',
      metrics: {
        correct: correctCount,
        total: TOTAL_ROUNDS,
        bestStreak,
        avgTimePerRound: Math.round(avgTimePerRound * 10) / 10,
        totalXP,
      },
    };
    onComplete(result);
  }, [isFinished]);

  // --- Intro screen ---
  if (!started) {
    return (
      <GameIntro
        title="DataDash"
        description="Read the business dashboard and type the correct numeric answer. Speed and accuracy both matter."
        icon="query_stats"
        duration="~8 min"
        rules={[
          'You will see 15 data visualizations with a question each.',
          'Type your numeric answer and press Enter or click Submit.',
          'Answers within 2% tolerance (or exact for integers) are accepted.',
          'Answer within 15 seconds for a speed bonus.',
          'Build a streak of consecutive correct answers for bonus XP.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- Finished screen ---
  if (isFinished) {
    const baseScore = (correctCount / TOTAL_ROUNDS) * 100;
    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary">emoji_events</span>
          </div>
          <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">Challenge Complete!</h2>
          <p className="text-text-muted mb-6">DataDash finished</p>
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
              <p className="text-3xl font-black text-primary">{Math.round(baseScore)}%</p>
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
  const borderClass =
    feedback === 'correct'
      ? 'border-green-400 shadow-green-400/20 shadow-lg'
      : feedback === 'incorrect'
      ? 'border-red-400 shadow-red-400/20 shadow-lg animate-[shake_0.4s_ease-in-out]'
      : 'border-text-main/5 dark:border-white/5';

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
          <ScoreDisplay score={score} label="XP" />
        </div>
      </div>

      {/* Card */}
      <div
        className={`bg-card-bg dark:bg-card-bg-dark rounded-3xl p-6 sm:p-8 border-2 transition-all duration-300 ${borderClass}`}
      >
        {/* Title */}
        <div className="flex items-center gap-2 mb-5">
          <span className="material-symbols-outlined text-primary text-xl">
            {scenario.visual === 'bar_chart'
              ? 'bar_chart'
              : scenario.visual === 'table'
              ? 'table_chart'
              : 'monitoring'}
          </span>
          <h3 className="text-lg font-black text-text-main dark:text-white">{scenario.title}</h3>
        </div>

        {/* Visual */}
        <div className="mb-6">
          <VisualDisplay scenario={scenario} />
        </div>

        {/* Question */}
        <p className="text-sm font-medium text-text-main dark:text-white mb-4 leading-relaxed">
          {scenario.question}
        </p>

        {/* Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={feedback !== null}
              placeholder="Type your answer..."
              className="w-full px-4 py-3 rounded-xl bg-background-light dark:bg-white/5 border border-text-main/10 dark:border-white/10 text-text-main dark:text-white font-bold text-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted/50 tabular-nums disabled:opacity-50"
            />
            {scenario.unit && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">
                {scenario.unit}
              </span>
            )}
          </div>
          <button
            onClick={checkAnswer}
            disabled={feedback !== null || !input.trim()}
            className="px-6 py-3 bg-primary text-black font-black rounded-xl hover:bg-[#00d64b] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Submit
          </button>
        </div>

        {/* Feedback row */}
        {feedback && (
          <div
            className={`mt-4 text-center text-sm font-black ${
              feedback === 'correct' ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {feedback === 'correct'
              ? 'Correct!'
              : `Incorrect — the answer was ${scenario.correctAnswer}${scenario.unit ? ' ' + scenario.unit : ''}`}
          </div>
        )}
      </div>

      {/* Exit button */}
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

      {/* Shake animation */}
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

export default DataDash;
