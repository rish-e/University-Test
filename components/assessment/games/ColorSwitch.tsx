import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

// --- Types ---

type RuleType = 'color' | 'shape';
type ShapeKind = 'circle' | 'square' | 'triangle';
type ColorKind = 'red' | 'blue';
type Side = 'left' | 'right';
type Phase = 1 | 2 | 3;

interface StimulusItem {
  shape: ShapeKind;
  color: ColorKind;
  id: number;
}

interface TrialRecord {
  item: StimulusItem;
  rule: RuleType;
  phase: Phase;
  correctSide: Side | 'skip';
  chosenSide: Side | 'skip' | 'timeout';
  correct: boolean;
  responseTime: number;
  wasSwitchTrial: boolean;         // first trial after a rule change
  trialsSinceSwitch: number;       // items since last rule switch
  perseverativeError: boolean;     // chose based on old rule
}

// --- Constants ---

const TOTAL_DURATION = 90;
const PHASE_DURATION = 30;
const SHAPES: ShapeKind[] = ['circle', 'square', 'triangle'];
const COLORS: ColorKind[] = ['red', 'blue'];

// --- Helpers ---

function randomItem(): StimulusItem {
  return {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    id: Date.now() + Math.random(),
  };
}

function getCorrectSide(item: StimulusItem, rule: RuleType): Side | 'skip' {
  if (rule === 'color') {
    return item.color === 'red' ? 'left' : 'right';
  }
  // shape rule
  if (item.shape === 'triangle') return 'skip';
  return item.shape === 'circle' ? 'left' : 'right';
}

function wouldOldRuleGive(item: StimulusItem, currentRule: RuleType): Side | 'skip' {
  const oldRule: RuleType = currentRule === 'color' ? 'shape' : 'color';
  return getCorrectSide(item, oldRule);
}

function getIntervalForPhase(phase: Phase, elapsed: number): number {
  if (phase === 1) {
    if (elapsed < 10) return 1500;
    if (elapsed < 20) return 1200;
    return 1000;
  }
  if (phase === 2) return 1400;
  return 1200;
}

// --- SVG shape renderers ---

function ShapeSVG({ shape, color, size = 80 }: { shape: ShapeKind; color: ColorKind; size?: number }) {
  const fill = color === 'red' ? '#ef4444' : '#3b82f6';
  const cx = size / 2;
  const cy = size / 2;

  if (shape === 'circle') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={size * 0.4} fill={fill} />
        <circle cx={cx - size * 0.12} cy={cy - size * 0.12} r={size * 0.08} fill="white" opacity="0.25" />
      </svg>
    );
  }
  if (shape === 'square') {
    const s = size * 0.7;
    const rx = size * 0.06;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={rx} fill={fill} />
        <rect x={cx - s / 2 + 6} y={cy - s / 2 + 6} width={s * 0.25} height={s * 0.35} rx={3} fill="white" opacity="0.15" />
      </svg>
    );
  }
  // triangle
  const h = size * 0.42;
  const pts = `${cx},${cy - h} ${cx + h * 0.95},${cy + h * 0.65} ${cx - h * 0.95},${cy + h * 0.65}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={pts} fill={fill} />
    </svg>
  );
}

// --- Main Component ---

export const ColorSwitch: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Time
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Current stimulus
  const [currentItem, setCurrentItem] = useState<StimulusItem | null>(null);
  const [currentRule, setCurrentRule] = useState<RuleType>('color');
  const [phase, setPhase] = useState<Phase>(1);
  const [itemIndex, setItemIndex] = useState(0);
  const [ruleJustSwitched, setRuleJustSwitched] = useState(false);

  // Phase 3 alternation
  const phase3CountRef = useRef(0);
  const phase3RuleRef = useRef<RuleType>('color');

  // Feedback
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'skip-correct' | 'timeout' | null>(null);
  const [flyDirection, setFlyDirection] = useState<Side | null>(null);

  // Stats
  const [score, setScore] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [streak, setStreak] = useState(0);

  // Tracking
  const trialsRef = useRef<TrialRecord[]>([]);
  const itemAppearedRef = useRef(0);
  const awaitingResponseRef = useRef(false);
  const trialsSinceSwitchRef = useRef(0);
  const previousRuleRef = useRef<RuleType>('color');

  // Item spawn interval
  const spawnTimerRef = useRef<number | null>(null);

  const phaseRef = useRef<Phase>(1);
  const elapsedRef = useRef(0);
  const gameOverRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  // --- Spawn next item ---
  const spawnItem = useCallback(() => {
    if (gameOverRef.current) return;
    const item = randomItem();
    setCurrentItem(item);
    setFeedback(null);
    setFlyDirection(null);
    itemAppearedRef.current = Date.now();
    awaitingResponseRef.current = true;
    setItemIndex(i => i + 1);
    setTotalItems(t => t + 1);
    trialsSinceSwitchRef.current += 1;
  }, []);

  // --- Determine phase & rule from elapsed time ---
  useEffect(() => {
    if (!started || gameOver) return;

    let newPhase: Phase;
    if (elapsed < PHASE_DURATION) newPhase = 1;
    else if (elapsed < PHASE_DURATION * 2) newPhase = 2;
    else newPhase = 3;

    if (newPhase !== phase) {
      setPhase(newPhase);
      setRuleJustSwitched(true);
      trialsSinceSwitchRef.current = 0;
      setTimeout(() => setRuleJustSwitched(false), 1200);

      if (newPhase === 2) {
        previousRuleRef.current = 'color';
        setCurrentRule('shape');
      } else if (newPhase === 3) {
        phase3CountRef.current = 0;
        phase3RuleRef.current = 'color';
        previousRuleRef.current = 'shape';
        setCurrentRule('color');
      }
    }
  }, [elapsed, started, gameOver, phase]);

  // Phase 3: alternate rule every 5 items
  useEffect(() => {
    if (phase !== 3 || !started || gameOver) return;
    phase3CountRef.current += 1;
    if (phase3CountRef.current > 5) {
      phase3CountRef.current = 1;
      const newRule: RuleType = phase3RuleRef.current === 'color' ? 'shape' : 'color';
      previousRuleRef.current = phase3RuleRef.current;
      phase3RuleRef.current = newRule;
      setCurrentRule(newRule);
      setRuleJustSwitched(true);
      trialsSinceSwitchRef.current = 0;
      setTimeout(() => setRuleJustSwitched(false), 1200);
    }
  }, [itemIndex, phase, started, gameOver]);

  // --- Timer ---
  useEffect(() => {
    if (!started || gameOver) return;
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const e = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(e);
      if (e >= TOTAL_DURATION) {
        setGameOver(true);
      }
    }, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, gameOver]);

  // --- Item spawning loop ---
  useEffect(() => {
    if (!started || gameOver) return;
    // Spawn first item immediately
    spawnItem();

    const scheduleNext = () => {
      const interval = getIntervalForPhase(phaseRef.current, elapsedRef.current);
      spawnTimerRef.current = window.setTimeout(() => {
        if (gameOverRef.current) return;
        // If player didn't respond to previous, record timeout
        if (awaitingResponseRef.current && currentItem) {
          recordTrial('timeout');
        }
        spawnItem();
        scheduleNext();
      }, interval);
    };
    scheduleNext();

    return () => { if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, gameOver]);

  // --- Record a trial ---
  const recordTrial = useCallback((chosenSide: Side | 'skip' | 'timeout') => {
    if (!currentItem) return;
    const rt = Date.now() - itemAppearedRef.current;
    const correctSide = getCorrectSide(currentItem, currentRule);
    const correct = chosenSide === correctSide;

    // Is this a perseverative error? Player chose based on old rule
    let perseverativeError = false;
    if (!correct && chosenSide !== 'timeout' && chosenSide !== 'skip') {
      const oldRuleAnswer = wouldOldRuleGive(currentItem, currentRule);
      if (chosenSide === oldRuleAnswer) perseverativeError = true;
    }

    const trial: TrialRecord = {
      item: currentItem,
      rule: currentRule,
      phase,
      correctSide,
      chosenSide,
      correct,
      responseTime: rt,
      wasSwitchTrial: trialsSinceSwitchRef.current <= 1,
      trialsSinceSwitch: trialsSinceSwitchRef.current,
      perseverativeError,
    };
    trialsRef.current.push(trial);
    awaitingResponseRef.current = false;
  }, [currentItem, currentRule, phase]);

  // --- Handle player input ---
  const handleChoice = useCallback((side: Side) => {
    if (!awaitingResponseRef.current || !currentItem || gameOver) return;

    const correctSide = getCorrectSide(currentItem, currentRule);

    if (correctSide === 'skip') {
      // Should NOT have tapped - this is wrong
      recordTrial(side);
      setFeedback('wrong');
      setFlyDirection(side);
      setStreak(0);
      return;
    }

    recordTrial(side);

    if (side === correctSide) {
      setFeedback('correct');
      setFlyDirection(side);
      setScore(s => s + 1);
      setStreak(s => s + 1);
      onXPGain(3, 'Correct sort');
    } else {
      setFeedback('wrong');
      setFlyDirection(side);
      setStreak(0);
    }
  }, [currentItem, currentRule, gameOver, recordTrial, onXPGain]);

  // Handle skip (space bar for triangles in shape rule)
  const handleSkip = useCallback(() => {
    if (!awaitingResponseRef.current || !currentItem || gameOver) return;

    const correctSide = getCorrectSide(currentItem, currentRule);

    recordTrial('skip');

    if (correctSide === 'skip') {
      setFeedback('skip-correct');
      setScore(s => s + 1);
      setStreak(s => s + 1);
      onXPGain(3, 'Correct skip');
    } else {
      setFeedback('wrong');
      setStreak(0);
    }
  }, [currentItem, currentRule, gameOver, recordTrial, onXPGain]);

  // --- Keyboard controls ---
  useEffect(() => {
    if (!started || gameOver) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleChoice('left');
      else if (e.key === 'ArrowRight') handleChoice('right');
      else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, gameOver, handleChoice, handleSkip]);

  // --- Compute metrics & finish ---
  useEffect(() => {
    if (!gameOver || !started) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);

    const trials = trialsRef.current;
    if (trials.length === 0) {
      onComplete({ score: 0, rawScore: 0, timeSpent: TOTAL_DURATION, metrics: {}, type: 'color_switch' });
      return;
    }

    const totalCorrect = trials.filter(t => t.correct).length;
    const totalTrials = trials.length;
    const scoreNorm = Math.round((totalCorrect / totalTrials) * 100);

    // Processing Speed (inverted avg RT, clamped to 0-100)
    const avgRT = trials.reduce((a, t) => a + t.responseTime, 0) / totalTrials;
    const processingSpeed = Math.round(Math.max(0, Math.min(100, 100 - (avgRT - 300) / 17)));

    // Cognitive Flexibility: accuracy on switch trials vs non-switch
    const switchTrials = trials.filter(t => t.wasSwitchTrial);
    const nonSwitchTrials = trials.filter(t => !t.wasSwitchTrial);
    const switchAcc = switchTrials.length > 0 ? switchTrials.filter(t => t.correct).length / switchTrials.length : 1;
    const nonSwitchAcc = nonSwitchTrials.length > 0 ? nonSwitchTrials.filter(t => t.correct).length / nonSwitchTrials.length : 1;
    const accDrop = nonSwitchAcc - switchAcc; // lower drop = higher flexibility
    const cognitiveFlexibility = Math.round(Math.max(0, Math.min(100, 100 - accDrop * 200)));

    // Impulse Control: % of errors that are perseverative
    const errors = trials.filter(t => !t.correct && t.chosenSide !== 'timeout');
    const perseverativeErrors = errors.filter(t => t.perseverativeError).length;
    const impulseControl = errors.length > 0
      ? Math.round(Math.max(0, Math.min(100, 100 - (perseverativeErrors / errors.length) * 100)))
      : 100;

    // Sustained Attention: consistency across 3 thirds of trials
    const third = Math.floor(totalTrials / 3);
    const thirds = [
      trials.slice(0, third),
      trials.slice(third, third * 2),
      trials.slice(third * 2),
    ];
    const thirdAccs = thirds.map(t => t.length > 0 ? t.filter(x => x.correct).length / t.length : 0);
    const accVariance = thirdAccs.reduce((s, a) => s + Math.pow(a - (thirdAccs.reduce((x, y) => x + y, 0) / 3), 2), 0) / 3;
    const sustainedAttention = Math.round(Math.max(0, Math.min(100, 100 - accVariance * 400)));

    // Adaptation Speed: avg trials until accuracy recovers after switch
    let recoveryTrials: number[] = [];
    let lastSwitchIdx = -1;
    for (let i = 0; i < trials.length; i++) {
      if (trials[i].wasSwitchTrial) {
        lastSwitchIdx = i;
      } else if (lastSwitchIdx >= 0 && trials[i].correct) {
        recoveryTrials.push(i - lastSwitchIdx);
        lastSwitchIdx = -1;
      }
    }
    const avgRecovery = recoveryTrials.length > 0
      ? recoveryTrials.reduce((a, b) => a + b, 0) / recoveryTrials.length
      : 5;
    const adaptationSpeed = Math.round(Math.max(0, Math.min(100, 100 - (avgRecovery - 1) * 20)));

    // Accuracy Under Pressure: Phase 3 acc vs Phase 1 acc
    const p1 = trials.filter(t => t.phase === 1);
    const p3 = trials.filter(t => t.phase === 3);
    const p1Acc = p1.length > 0 ? p1.filter(t => t.correct).length / p1.length : 0;
    const p3Acc = p3.length > 0 ? p3.filter(t => t.correct).length / p3.length : 0;
    const pressureDrop = p1Acc - p3Acc;
    const accuracyUnderPressure = Math.round(Math.max(0, Math.min(100, 100 - pressureDrop * 150)));

    const result: GameResult = {
      score: Math.min(100, scoreNorm),
      rawScore: totalCorrect,
      timeSpent: TOTAL_DURATION,
      type: 'color_switch',
      metrics: {
        processingSpeed,
        cognitiveFlexibility,
        impulseControl,
        sustainedAttention,
        adaptationSpeed,
        accuracyUnderPressure,
      },
      data: {
        totalTrials,
        totalCorrect,
        avgResponseTime: Math.round(avgRT),
        perseverativeErrors,
        phaseAccuracies: { p1: Math.round(p1Acc * 100), p2: Math.round((trials.filter(t => t.phase === 2).filter(t => t.correct).length / Math.max(1, trials.filter(t => t.phase === 2).length)) * 100), p3: Math.round(p3Acc * 100) },
      },
    };
    onComplete(result);
  }, [gameOver, started, onComplete]);

  // --- Start ---
  const handleStart = () => {
    setStarted(true);
  };

  // --- Intro ---
  if (!started) {
    return (
      <GameIntro
        title="ColorSwitch"
        description="Shapes appear one at a time. Sort them left or right based on the current rule. The rule changes without warning — stay sharp!"
        icon="palette"
        duration="90 seconds"
        rules={[
          'Sort shapes LEFT or RIGHT based on the active rule shown at top.',
          'Phase 1: Sort by COLOR (Red = Left, Blue = Right).',
          'Phase 2: Sort by SHAPE (Circle = Left, Square = Right, Triangle = Skip).',
          'Phase 3: Rule alternates every 5 items. Watch the indicator!',
          'Use arrow keys or tap the left/right side of the screen.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- Game Over screen ---
  if (gameOver) {
    const trials = trialsRef.current;
    const totalCorrect = trials.filter(t => t.correct).length;
    const pct = trials.length > 0 ? Math.round((totalCorrect / trials.length) * 100) : 0;
    const avgRT = trials.length > 0 ? Math.round(trials.reduce((a, t) => a + t.responseTime, 0) / trials.length) : 0;

    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">neurology</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">Challenge Complete!</h2>
          <p className="text-text-muted mb-8">ColorSwitch finished</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Accuracy</p>
              <p className="text-3xl font-black text-primary">{pct}%</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Items</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{trials.length}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Avg Speed</p>
              <p className="text-3xl font-black text-blue-500">{avgRT}ms</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Playing ---
  const timeLeft = Math.max(0, TOTAL_DURATION - elapsed);
  const phaseLabel = phase === 1 ? 'SORT BY COLOR' : phase === 2 ? 'SORT BY SHAPE' : (currentRule === 'color' ? 'SORT BY COLOR' : 'SORT BY SHAPE');
  const phaseBorderStyle = phase === 3
    ? (currentRule === 'color'
        ? 'border-2 border-red-400/50 bg-gradient-to-r from-red-500/10 to-blue-500/10'
        : 'border-2 border-purple-400/50 bg-gradient-to-r from-purple-500/10 to-indigo-500/10')
    : '';

  const isSkipItem = currentItem && currentRule === 'shape' && currentItem.shape === 'triangle';

  return (
    <div className="max-w-2xl mx-auto mt-4 relative select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onExit({
              step: itemIndex,
              correctCount: score,
              textInput: '',
              gameScore: score,
              simState: null,
            })}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-muted uppercase">Phase {phase}/3</span>
            {streak >= 3 && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 text-xs font-black rounded-full animate-pulse">
                {streak} streak
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-xs text-text-muted">Score</span>
            <p className="text-xl font-black text-primary">{score}</p>
          </div>
          <div className={`font-mono font-bold text-xl ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-text-main dark:text-white'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Rule banner */}
      <div
        className={`relative mb-4 py-3 px-6 rounded-2xl text-center font-black text-lg transition-all duration-300 ${phaseBorderStyle} ${
          ruleJustSwitched ? 'animate-[rulePulse_0.6s_ease-out]' : ''
        } ${
          currentRule === 'color'
            ? 'bg-gradient-to-r from-red-500/15 to-blue-500/15 text-text-main dark:text-white'
            : 'bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-text-main dark:text-white'
        }`}
      >
        <span className="tracking-wider">{phaseLabel}</span>
        {phase === 3 && (
          <span className="ml-3 text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 dark:bg-white/10">MIXED</span>
        )}

        {/* Rule hints */}
        <div className="flex items-center justify-center gap-4 mt-1 text-xs text-text-muted font-bold">
          {currentRule === 'color' ? (
            <>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded-full bg-red-500" /> = LEFT
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded-full bg-blue-500" /> = RIGHT
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="#8b5cf6" /></svg> = LEFT
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1.5" fill="#8b5cf6" /></svg> = RIGHT
              </span>
              <span className="flex items-center gap-1 opacity-60">
                <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,11 1,11" fill="#8b5cf6" /></svg> = SKIP
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main game area - tap zones */}
      <div className="relative bg-card-bg dark:bg-card-bg-dark rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 overflow-hidden" style={{ minHeight: 320 }}>
        {/* Left tap zone */}
        <button
          onClick={() => handleChoice('left')}
          className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors focus:outline-none active:bg-black/[0.05] dark:active:bg-white/[0.05]"
          aria-label="Sort left"
        />

        {/* Right tap zone */}
        <button
          onClick={() => handleChoice('right')}
          className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors focus:outline-none active:bg-black/[0.05] dark:active:bg-white/[0.05]"
          aria-label="Sort right"
        />

        {/* Left bin */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-0 flex flex-col items-center gap-1 opacity-30">
          <span className="material-symbols-outlined text-4xl text-text-main dark:text-white">arrow_back</span>
          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">LEFT</span>
        </div>

        {/* Right bin */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-0 flex flex-col items-center gap-1 opacity-30">
          <span className="material-symbols-outlined text-4xl text-text-main dark:text-white">arrow_forward</span>
          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">RIGHT</span>
        </div>

        {/* Center stimulus */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          {currentItem && (
            <div
              key={currentItem.id}
              className={`transition-all duration-300 ${
                feedback === 'correct' || feedback === 'skip-correct'
                  ? flyDirection === 'left'
                    ? 'animate-[flyLeft_0.3s_ease-in_forwards]'
                    : feedback === 'skip-correct'
                      ? 'animate-[fadeOutUp_0.3s_ease-out_forwards]'
                      : 'animate-[flyRight_0.3s_ease-in_forwards]'
                  : feedback === 'wrong'
                    ? 'animate-[shakeWrong_0.4s_ease-in-out]'
                    : feedback === 'timeout'
                      ? 'animate-[fadeOutDown_0.3s_ease-out_forwards]'
                      : 'animate-[popIn_0.15s_ease-out]'
              }`}
            >
              <ShapeSVG shape={currentItem.shape} color={currentItem.color} size={100} />
            </div>
          )}
        </div>

        {/* Feedback overlays */}
        {feedback === 'correct' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none animate-[fadeOutFast_0.5s_ease-out_forwards]">
            <div className="size-24 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-green-500">check</span>
            </div>
          </div>
        )}
        {feedback === 'skip-correct' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none animate-[fadeOutFast_0.5s_ease-out_forwards]">
            <div className="size-24 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-green-500">skip_next</span>
            </div>
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none animate-[fadeOutFast_0.5s_ease-out_forwards]">
            <div className="size-24 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-red-500">close</span>
            </div>
          </div>
        )}

        {/* Skip button (visible in shape rule) */}
        {(currentRule === 'shape' || (phase === 3 && currentRule === 'shape')) && (
          <button
            onClick={handleSkip}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-xl font-black text-sm hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-all active:scale-95"
          >
            SKIP (Space)
          </button>
        )}

        {/* Divider line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-text-main/5 dark:bg-white/5 z-0" />
      </div>

      {/* Controls hint */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-background-light dark:bg-white/10 rounded font-mono text-[10px]">&#8592;</kbd> Left
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-background-light dark:bg-white/10 rounded font-mono text-[10px]">&#8594;</kbd> Right
        </span>
        {(currentRule === 'shape') && (
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-0.5 bg-background-light dark:bg-white/10 rounded font-mono text-[10px]">Space</kbd> Skip
          </span>
        )}
      </div>

      {/* Phase progress bar */}
      <div className="mt-3 h-1.5 bg-background-light dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${(elapsed / TOTAL_DURATION) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-text-muted font-bold uppercase">
        <span>Phase 1</span>
        <span>Phase 2</span>
        <span>Phase 3</span>
      </div>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes flyLeft {
          0% { transform: translateX(0) scale(1); opacity: 1; }
          100% { transform: translateX(-200px) scale(0.6); opacity: 0; }
        }
        @keyframes flyRight {
          0% { transform: translateX(0) scale(1); opacity: 1; }
          100% { transform: translateX(200px) scale(0.6); opacity: 0; }
        }
        @keyframes fadeOutUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(0.7); opacity: 0; }
        }
        @keyframes fadeOutDown {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(40px); opacity: 0; }
        }
        @keyframes shakeWrong {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-10px); }
          30% { transform: translateX(10px); }
          45% { transform: translateX(-8px); }
          60% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
        @keyframes fadeOutFast {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes rulePulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb, 0, 200, 65), 0.4); }
          50% { transform: scale(1.03); box-shadow: 0 0 20px 8px rgba(var(--color-primary-rgb, 0, 200, 65), 0.15); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb, 0, 200, 65), 0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ColorSwitch;
