import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';
import { financialScenarios, FinancialScenario } from '../../../data/t3-financials';

type Phase = 'intro' | 'playing' | 'complete';

interface RoundState {
  answered: boolean;
  correct: boolean;
  pointsEarned: number;
  timeSpent: number;
  userAnswer: number | null;
}

export const StartupSimulator: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [roundStates, setRoundStates] = useState<RoundState[]>(
    financialScenarios.map(() => ({ answered: false, correct: false, pointsEarned: 0, timeSpent: 0, userAnswer: null }))
  );
  const [roundStartTime, setRoundStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [startTime] = useState(Date.now());
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcNewInput, setCalcNewInput] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenario = financialScenarios[currentIndex];
  const maxPoints = financialScenarios.reduce((sum, s) => sum + s.points, 0);
  const totalEarned = roundStates.reduce((sum, s) => sum + s.pointsEarned, 0);

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || showResult !== null) return;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - roundStartTime) / 1000));
    }, 200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, roundStartTime, showResult]);

  const getTimerColor = () => {
    if (elapsed >= 60) return 'text-red-500';
    if (elapsed >= 30) return 'text-amber-500';
    return 'text-text-main dark:text-white';
  };

  const getSpeedMultiplier = () => {
    if (elapsed < 30) return 1.5;
    if (elapsed < 60) return 1.0;
    return 0.75;
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = useCallback(() => {
    setPhase('playing');
    setRoundStartTime(Date.now());
  }, []);

  const handleSubmit = useCallback(() => {
    const numAnswer = parseFloat(answer);
    if (isNaN(numAnswer)) return;

    const isCorrect = Math.abs(numAnswer - scenario.correctAnswer) <= scenario.tolerance;
    const multiplier = getSpeedMultiplier();
    const points = isCorrect ? Math.round(scenario.points * multiplier) : 0;

    setRoundStates((prev) => {
      const updated = [...prev];
      updated[currentIndex] = {
        answered: true,
        correct: isCorrect,
        pointsEarned: points,
        timeSpent: elapsed,
        userAnswer: numAnswer,
      };
      return updated;
    });

    if (isCorrect) {
      onXPGain(points, `startup-sim-${scenario.id}`);
    }

    setShowResult(isCorrect ? 'correct' : 'wrong');

    setTimeout(() => {
      advance();
    }, 2000);
  }, [answer, scenario, currentIndex, elapsed]);

  const advance = useCallback(() => {
    if (currentIndex < financialScenarios.length - 1) {
      setCurrentIndex((i) => i + 1);
      setAnswer('');
      setShowResult(null);
      setElapsed(0);
      setRoundStartTime(Date.now());
    } else {
      setPhase('complete');
    }
  }, [currentIndex]);

  const finishGame = useCallback(() => {
    const finalPoints = roundStates.reduce((s, r) => s + r.pointsEarned, 0);
    const result: GameResult = {
      score: Math.round((finalPoints / maxPoints) * 100),
      rawScore: finalPoints,
      timeSpent: Math.round((Date.now() - startTime) / 1000),
      metrics: {
        totalRounds: financialScenarios.length,
        correct: roundStates.filter((r) => r.correct).length,
        avgTimePerRound: Math.round(roundStates.reduce((s, r) => s + r.timeSpent, 0) / financialScenarios.length),
        speedBonuses: roundStates.filter((r) => r.timeSpent < 30 && r.correct).length,
      },
      type: 'startup-simulator',
    };
    onComplete(result);
  }, [roundStates, maxPoints, startTime, onComplete]);

  useEffect(() => {
    if (phase === 'complete') {
      finishGame();
    }
  }, [phase, finishGame]);

  const handleExit = useCallback(() => {
    const progress: AssessmentProgress = {
      step: currentIndex,
      correctCount: roundStates.filter((r) => r.correct).length,
      textInput: '',
      gameScore: totalEarned,
      simState: null,
      xpEarned: totalEarned,
    };
    onExit(progress);
  }, [currentIndex, roundStates, totalEarned, onExit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // --- Calculator ---
  const calcInput = (digit: string) => {
    if (calcNewInput) {
      setCalcDisplay(digit);
      setCalcNewInput(false);
    } else {
      setCalcDisplay((d) => (d === '0' ? digit : d + digit));
    }
  };

  const calcDecimal = () => {
    if (calcNewInput) {
      setCalcDisplay('0.');
      setCalcNewInput(false);
    } else if (!calcDisplay.includes('.')) {
      setCalcDisplay((d) => d + '.');
    }
  };

  const calcOperator = (op: string) => {
    const current = parseFloat(calcDisplay);
    if (calcPrev !== null && calcOp && !calcNewInput) {
      const result = calcEvaluate(calcPrev, current, calcOp);
      setCalcDisplay(String(result));
      setCalcPrev(result);
    } else {
      setCalcPrev(current);
    }
    setCalcOp(op);
    setCalcNewInput(true);
  };

  const calcEvaluate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const calcEquals = () => {
    if (calcPrev === null || calcOp === null) return;
    const current = parseFloat(calcDisplay);
    const result = calcEvaluate(calcPrev, current, calcOp);
    setCalcDisplay(String(Math.round(result * 100) / 100));
    setCalcPrev(null);
    setCalcOp(null);
    setCalcNewInput(true);
  };

  const calcClear = () => {
    setCalcDisplay('0');
    setCalcPrev(null);
    setCalcOp(null);
    setCalcNewInput(true);
  };

  const calcUseValue = () => {
    setAnswer(calcDisplay);
  };

  // --- Document renderers ---
  const renderPnL = (data: Record<string, number | string>) => {
    const entries = Object.entries(data);
    const revenue = typeof data['Revenue'] === 'number' ? data['Revenue'] : 0;
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-emerald-700 text-white px-4 py-2 text-sm font-bold">Profit & Loss Statement</div>
        <table className="w-full text-sm">
          <tbody>
            {entries.map(([key, val], i) => {
              const isRevenue = key === 'Revenue';
              const isTotal = key.includes('Net') || key.includes('Total');
              return (
                <tr key={key} className={`border-b border-gray-100 dark:border-gray-800 ${isTotal ? 'font-bold bg-gray-50 dark:bg-gray-800' : ''}`}>
                  <td className={`px-4 py-2 ${isRevenue ? 'font-bold' : ''} ${!isRevenue && !isTotal ? 'pl-8' : ''}`}>
                    {key}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {typeof val === 'number' ? `$${val.toLocaleString()}` : val}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTermSheet = (data: Record<string, number | string>) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden">
      <div className="bg-gray-800 dark:bg-gray-950 text-white px-4 py-3 text-center">
        <p className="text-xs uppercase tracking-widest text-gray-400">Confidential</p>
        <p className="text-sm font-bold mt-0.5">Term Sheet</p>
      </div>
      <div className="p-4 space-y-3">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-sm text-text-muted">{key}</span>
            <span className="text-sm font-bold font-mono text-text-main dark:text-white">
              {typeof val === 'number' ? (val >= 10000 ? `$${val.toLocaleString()}` : `$${val}`) : val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPricing = (data: Record<string, number | string>) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-2 text-sm font-bold flex items-center gap-1.5">
        <span className="material-symbols-outlined text-base">sell</span>
        Pricing Model
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="bg-white dark:bg-gray-900 p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{key}</p>
            <p className="text-sm font-bold font-mono text-text-main dark:text-white">
              {typeof val === 'number' ? (val >= 100 ? `$${val.toLocaleString()}` : `$${val}`) : val}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMetrics = (data: Record<string, number | string>) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-purple-200 dark:border-purple-800 overflow-hidden">
      <div className="bg-purple-600 text-white px-4 py-2 text-sm font-bold flex items-center gap-1.5">
        <span className="material-symbols-outlined text-base">analytics</span>
        Key Metrics
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{key}</p>
            <p className="text-lg font-black font-mono text-text-main dark:text-white">
              {typeof val === 'number' ? (val >= 1000 ? `$${val.toLocaleString()}` : val) : val}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDocument = (sc: FinancialScenario) => {
    switch (sc.documentType) {
      case 'pnl': return renderPnL(sc.data);
      case 'term_sheet': return renderTermSheet(sc.data);
      case 'pricing': return renderPricing(sc.data);
      case 'metrics': return renderMetrics(sc.data);
    }
  };

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Startup Simulator"
        description="Crunch the numbers on real startup financial scenarios. Calculate margins, runway, ROI, and more under time pressure."
        icon="rocket_launch"
        duration={section.duration || '20 min'}
        rules={[
          '10 rounds of financial calculations with realistic data.',
          'Each round shows a financial document with a question.',
          'Speed matters! Under 30s = 1.5x points, under 60s = 1.0x, over 60s = 0.75x.',
          'Use the built-in calculator for complex math.',
          'Wrong answers earn 0 points. No retries per round.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const correct = roundStates.filter((r) => r.correct).length;
    return (
      <div className="max-w-lg mx-auto mt-16 text-center animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
          <div className="size-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">trending_up</span>
          </div>
          <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">Simulation Complete!</h2>
          <p className="text-text-muted mb-6">
            You nailed {correct} of {financialScenarios.length} scenarios.
          </p>
          <div className="text-4xl font-black text-primary mb-2">{totalEarned} pts</div>
          <p className="text-sm text-text-muted mb-4">out of {maxPoints} possible (with speed bonuses up to {Math.round(maxPoints * 1.5)})</p>
          <div className="flex justify-center gap-6 mb-8 text-sm">
            <div>
              <span className="text-text-muted">Speed bonuses:</span>
              <span className="font-bold text-primary ml-1">{roundStates.filter((r) => r.timeSpent < 30 && r.correct).length}</span>
            </div>
            <div>
              <span className="text-text-muted">Avg time:</span>
              <span className="font-bold text-text-main dark:text-white ml-1">
                {Math.round(roundStates.reduce((s, r) => s + r.timeSpent, 0) / financialScenarios.length)}s
              </span>
            </div>
          </div>
          <button onClick={finishGame} className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all">
            Continue
          </button>
        </div>
      </div>
    );
  }

  // --- PLAYING ---
  const speedMult = getSpeedMultiplier();
  const calcButtons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+',
  ];

  return (
    <div className="max-w-5xl mx-auto animate-[fadeIn_0.2s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <ProgressTrack current={currentIndex} total={financialScenarios.length} />
        <div className="flex items-center gap-4">
          {/* Speed multiplier badge */}
          <div className={`text-xs font-bold px-2 py-1 rounded-full ${
            speedMult === 1.5 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
            speedMult === 1.0 ? 'bg-gray-100 dark:bg-gray-800 text-text-muted' :
            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {speedMult}x
          </div>
          {/* Timer */}
          <div className={`font-mono font-bold text-lg tabular-nums ${getTimerColor()}`}>
            {formatTime(elapsed)}
          </div>
          <span className="text-sm font-bold text-text-muted tabular-nums">{totalEarned} pts</span>
          <button onClick={handleExit} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Document + Question (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title & Context */}
          <div>
            <h3 className="text-lg font-black text-text-main dark:text-white">{scenario.title}</h3>
            <p className="text-sm text-text-muted mt-1">{scenario.context}</p>
          </div>

          {/* Financial Document */}
          {renderDocument(scenario)}

          {/* Question */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-sm font-bold text-text-main dark:text-white mb-3">{scenario.question}</p>

            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  step="any"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={showResult !== null}
                  placeholder="Your answer..."
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-lg font-mono text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50 pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
                  {scenario.unit}
                </span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!answer.trim() || showResult !== null}
                className="px-6 py-3 bg-primary text-black font-bold text-sm rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm whitespace-nowrap"
              >
                Submit
              </button>
            </div>

            {/* Result feedback */}
            {showResult === 'correct' && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl text-sm animate-[fadeIn_0.2s_ease-out] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500">check_circle</span>
                  <span className="font-bold text-green-700 dark:text-green-300">Correct!</span>
                </div>
                <span className="font-bold text-green-700 dark:text-green-300">
                  +{roundStates[currentIndex].pointsEarned} pts
                  {speedMult === 1.5 && ' (speed bonus!)'}
                </span>
              </div>
            )}

            {showResult === 'wrong' && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl text-sm animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-red-500">cancel</span>
                  <span className="font-bold text-red-700 dark:text-red-300">Incorrect</span>
                </div>
                <p className="text-red-600 dark:text-red-400 text-xs">
                  The correct answer was <span className="font-bold font-mono">{scenario.correctAnswer}{scenario.unit === '%' ? '%' : ` ${scenario.unit}`}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Calculator (1 col) */}
        <div className="space-y-4">
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Calculator</p>

            {/* Display */}
            <div className="bg-gray-900 dark:bg-gray-950 rounded-lg px-3 py-3 mb-3">
              <div className="text-right text-xs text-gray-500 h-4 font-mono">
                {calcPrev !== null ? `${calcPrev} ${calcOp}` : ''}
              </div>
              <div className="text-right text-xl font-mono font-bold text-white truncate">
                {calcDisplay}
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {/* Clear button full width */}
              <button
                onClick={calcClear}
                className="col-span-2 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold text-sm rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 active:scale-[0.95] transition-all"
              >
                C
              </button>
              <button
                onClick={calcUseValue}
                className="col-span-2 py-2.5 bg-primary/20 text-primary font-bold text-sm rounded-lg hover:bg-primary/30 active:scale-[0.95] transition-all text-xs"
              >
                Use Value
              </button>
              {calcButtons.map((btn) => {
                const isOp = ['+', '-', '*', '/'].includes(btn);
                const isEquals = btn === '=';
                return (
                  <button
                    key={btn}
                    onClick={() => {
                      if (isEquals) calcEquals();
                      else if (isOp) calcOperator(btn);
                      else if (btn === '.') calcDecimal();
                      else calcInput(btn);
                    }}
                    className={`py-2.5 font-bold text-sm rounded-lg active:scale-[0.95] transition-all ${
                      isEquals
                        ? 'bg-primary text-black hover:bg-[#00d64b]'
                        : isOp
                        ? 'bg-gray-200 dark:bg-gray-700 text-text-main dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                        : 'bg-white dark:bg-gray-800 text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {btn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speed info */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Speed Bonus</p>
            <div className="space-y-1.5 text-xs">
              <div className={`flex justify-between ${elapsed < 30 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-text-muted'}`}>
                <span>&lt; 30 seconds</span>
                <span>1.5x points</span>
              </div>
              <div className={`flex justify-between ${elapsed >= 30 && elapsed < 60 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-text-muted'}`}>
                <span>30 - 60 seconds</span>
                <span>1.0x points</span>
              </div>
              <div className={`flex justify-between ${elapsed >= 60 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-text-muted'}`}>
                <span>&gt; 60 seconds</span>
                <span>0.75x points</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
