import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

type GamePhase = 'intro' | 'playing' | 'complete';

// --- Button colors ---
const BUTTON_COLORS: Record<string, { bg: string; glow: string; label: string; letter: string }> = {
  R: { bg: '#ef4444', glow: '#ef444480', label: 'Red', letter: 'R' },
  G: { bg: '#22c55e', glow: '#22c55e80', label: 'Green', letter: 'G' },
  B: { bg: '#3b82f6', glow: '#3b82f680', label: 'Blue', letter: 'B' },
  Y: { bg: '#eab308', glow: '#eab30880', label: 'Yellow', letter: 'Y' },
  P: { bg: '#a855f7', glow: '#a855f780', label: 'Purple', letter: 'P' },
};

// --- Level definitions ---
interface LevelDef {
  id: number;
  title: string;
  buttons: string[];
  description: string;
  hint: string;
  targetOutput: string;
  timeLimit: number;
  checkSequence: (seq: string[]) => { correct: boolean; feedback: string };
  getOutputForPress: (seq: string[], pressedBtn: string) => string;
}

const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: 'Alphabetical Lock',
    buttons: ['R', 'G', 'B'],
    description: 'Press the buttons in the right order to power up the machine.',
    hint: 'Think about the names of the colors...',
    targetOutput: 'Sequence of 3',
    timeLimit: 90,
    checkSequence: (seq) => {
      const target = ['B', 'G', 'R']; // alphabetical: Blue, Green, Red
      if (seq.length !== 3) return { correct: false, feedback: 'Need exactly 3 presses.' };
      const match = seq.every((s, i) => s === target[i]);
      if (match) return { correct: true, feedback: 'CORRECT! Alphabetical order of color names.' };
      const positions = seq.map((s, i) => s === target[i] ? '\u2713' : '\u2717');
      return { correct: false, feedback: positions.join(' ') };
    },
    getOutputForPress: (seq, btn) => {
      const target = ['B', 'G', 'R'];
      const idx = seq.length;
      if (idx < target.length && btn === target[idx]) return '\u2713 Correct position';
      return '\u2717 Wrong position';
    },
  },
  {
    id: 2,
    title: 'Dependency Chain',
    buttons: ['R', 'G', 'B', 'Y'],
    description: 'Some buttons only work after others. Find the dependencies.',
    hint: 'Try pressing each button alone first...',
    targetOutput: 'Power level 100%',
    timeLimit: 90,
    checkSequence: (seq) => {
      // Rule: B only works after R. Y only works after G. Valid: R, G, B, Y (or R, G, Y, B etc.)
      // Need all 4 pressed, with R before B and G before Y
      if (seq.length !== 4) return { correct: false, feedback: 'Need exactly 4 presses.' };
      const unique = new Set(seq);
      if (unique.size !== 4) return { correct: false, feedback: 'Each button should be pressed once.' };
      const rIdx = seq.indexOf('R'), bIdx = seq.indexOf('B');
      const gIdx = seq.indexOf('G'), yIdx = seq.indexOf('Y');
      if (rIdx < bIdx && gIdx < yIdx) {
        return { correct: true, feedback: 'CORRECT! R unlocks B, G unlocks Y.' };
      }
      let fb = 'Power: ';
      fb += rIdx < bIdx ? 'R\u2192B \u2713 ' : 'R\u2192B \u2717 ';
      fb += gIdx < yIdx ? 'G\u2192Y \u2713' : 'G\u2192Y \u2717';
      return { correct: false, feedback: fb };
    },
    getOutputForPress: (seq, btn) => {
      const rPressed = seq.includes('R');
      const gPressed = seq.includes('G');
      if (btn === 'B' && !rPressed) return 'Power: 0% \u2014 B is locked';
      if (btn === 'Y' && !gPressed) return 'Power: 0% \u2014 Y is locked';
      const power = (seq.length + 1) * 25;
      return `Power: ${Math.min(100, power)}%`;
    },
  },
  {
    id: 3,
    title: 'Sum Target',
    buttons: ['R', 'G', 'B', 'Y'],
    description: 'Each button has a hidden value. Hit the target sum!',
    hint: 'Values: R=1, G=2, B=3, Y=4. Target displayed above.',
    targetOutput: 'Target: 7',
    timeLimit: 90,
    checkSequence: (seq) => {
      const vals: Record<string, number> = { R: 1, G: 2, B: 3, Y: 4 };
      const sum = seq.reduce((a, b) => a + (vals[b] || 0), 0);
      if (sum === 7) return { correct: true, feedback: `CORRECT! Sum = 7.` };
      return { correct: false, feedback: `Current sum: ${sum}. Target: 7.` };
    },
    getOutputForPress: (seq, btn) => {
      const vals: Record<string, number> = { R: 1, G: 2, B: 3, Y: 4 };
      const sum = seq.reduce((a, b) => a + (vals[b] || 0), 0) + (vals[btn] || 0);
      return `Sum: ${sum} / Target: 7`;
    },
  },
  {
    id: 4,
    title: 'Echo Pattern',
    buttons: ['R', 'G', 'B', 'Y', 'P'],
    description: 'Every 3rd press must echo the 1st. Find the repeating pattern.',
    hint: 'Pattern: A, B, A, C, A, ...',
    targetOutput: 'Valid 6-press pattern',
    timeLimit: 90,
    checkSequence: (seq) => {
      if (seq.length < 6) return { correct: false, feedback: `Need at least 6 presses (you have ${seq.length}).` };
      const first = seq[0];
      // Positions 0, 2, 4 must all be the same (every 3rd from start including start)
      const echoValid = seq[0] === first && seq[2] === first && seq[4] === first;
      // Positions 1, 3, 5 must be different from each other (variety)
      const fillers = [seq[1], seq[3], seq[5]];
      const fillersUnique = new Set(fillers).size === fillers.length;
      if (echoValid && fillersUnique) {
        return { correct: true, feedback: 'CORRECT! Echo pattern with unique fillers.' };
      }
      if (!echoValid) return { correct: false, feedback: 'Pattern broken \u2014 positions 1, 3, 5 must match.' };
      return { correct: false, feedback: 'Filler positions (2, 4, 6) must all be different.' };
    },
    getOutputForPress: (seq, btn) => {
      const newSeq = [...seq, btn];
      const pos = newSeq.length;
      const first = newSeq[0];
      // Check if odd positions (1,3,5) match first
      if (pos >= 2) {
        const echoPositions = [0, 2, 4].filter(i => i < pos);
        const echoOk = echoPositions.every(i => newSeq[i] === first);
        return echoOk ? `Pattern valid (${pos}/6)` : `Pattern BROKEN at position ${pos}`;
      }
      return `Pattern building... (${pos}/6)`;
    },
  },
  {
    id: 5,
    title: 'Master Circuit',
    buttons: ['R', 'G', 'B', 'Y', 'P'],
    description: 'Combined challenge: hit the target sum AND respect the order.',
    hint: 'Sum must equal 10. R before B, G before Y. P goes last.',
    targetOutput: 'Sum=10, order valid',
    timeLimit: 90,
    checkSequence: (seq) => {
      const vals: Record<string, number> = { R: 1, G: 2, B: 3, Y: 4, P: 5 };
      const sum = seq.reduce((a, b) => a + (vals[b] || 0), 0);
      const sumOk = sum === 10;
      const rIdx = seq.indexOf('R'), bIdx = seq.indexOf('B');
      const gIdx = seq.indexOf('G'), yIdx = seq.indexOf('Y');
      const pIdx = seq.indexOf('P');
      const orderOk = (rIdx === -1 || bIdx === -1 || rIdx < bIdx) &&
                       (gIdx === -1 || yIdx === -1 || gIdx < yIdx) &&
                       (pIdx === -1 || pIdx === seq.length - 1);
      if (sumOk && orderOk) return { correct: true, feedback: 'MASTER CIRCUIT COMPLETE!' };
      let fb = '';
      fb += sumOk ? 'Sum: \u2713 ' : `Sum: ${sum}/10 \u2717 `;
      fb += orderOk ? 'Order: \u2713' : 'Order: \u2717';
      return { correct: false, feedback: fb };
    },
    getOutputForPress: (seq, btn) => {
      const vals: Record<string, number> = { R: 1, G: 2, B: 3, Y: 4, P: 5 };
      const newSeq = [...seq, btn];
      const sum = newSeq.reduce((a, b) => a + (vals[b] || 0), 0);
      return `Sum: ${sum}/10 | Presses: ${newSeq.length}`;
    },
  },
];

// --- Tracking types ---
interface PressEvent {
  button: string;
  timestamp: number;
}

interface AttemptRecord {
  level: number;
  sequence: string[];
  success: boolean;
  timestamps: number[];
}

// ============================================
// PatternMachine Component
// ============================================
export const PatternMachine: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [levelIndex, setLevelIndex] = useState(0);
  const [currentSequence, setCurrentSequence] = useState<string[]>([]);
  const [pressTimestamps, setPressTimestamps] = useState<number[]>([]);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [timeLeft, setTimeLeft] = useState(90);
  const [energy, setEnergy] = useState(0);
  const [feedback, setFeedback] = useState('Press buttons to discover the rule...');
  const [feedbackType, setFeedbackType] = useState<'info' | 'success' | 'error'>('info');
  const [outputHistory, setOutputHistory] = useState<{ seq: string[]; output: string }[]>([]);
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);
  const [levelComplete, setLevelComplete] = useState(false);
  const [levelsCompleted, setLevelsCompleted] = useState(0);
  const [showLevelTransition, setShowLevelTransition] = useState(false);
  const [machineGlow, setMachineGlow] = useState(0);

  // Tracking
  const allAttempts = useRef<AttemptRecord[]>([]);
  const allPresses = useRef<PressEvent[]>([]);
  const startTimeRef = useRef(0);
  const levelStartTimes = useRef<number[]>([]);
  const levelSolveTimes = useRef<number[]>([]);
  const pressesPerLevel = useRef<number[]>([]);
  const currentLevelPresses = useRef(0);

  const timerRef = useRef<number | null>(null);

  const level = LEVELS[levelIndex];

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || levelComplete) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up for this level — count as failed attempt
          setAttemptsLeft(a => {
            if (a <= 1) {
              // No more attempts, move to next level or end
              handleLevelFail();
              return 3;
            }
            setFeedback('Time\'s up! Try again.');
            setFeedbackType('error');
            return a - 1;
          });
          setCurrentSequence([]);
          setPressTimestamps([]);
          return level.timeLimit;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, levelIndex, levelComplete]);

  const handleStart = () => {
    setPhase('playing');
    startTimeRef.current = Date.now();
    levelStartTimes.current = [Date.now()];
  };

  const handleButtonPress = useCallback((btn: string) => {
    if (levelComplete) return;
    const now = Date.now();
    setPressedBtn(btn);
    setTimeout(() => setPressedBtn(null), 200);

    const newSeq = [...currentSequence, btn];
    setCurrentSequence(newSeq);
    setPressTimestamps(prev => [...prev, now]);

    allPresses.current.push({ button: btn, timestamp: now });
    currentLevelPresses.current++;

    // Get output for this press
    const output = level.getOutputForPress(currentSequence, btn);
    setFeedback(output);
    setFeedbackType('info');
    setOutputHistory(prev => {
      const next = [...prev, { seq: [...newSeq], output }];
      return next.slice(-10);
    });

    // Update energy based on sequence progress
    const energyGain = Math.min(100, (newSeq.length / Math.max(3, level.buttons.length)) * 60);
    setEnergy(energyGain);

    onXPGain(1, 'Button press');
  }, [currentSequence, level, levelComplete, onXPGain]);

  const handleSubmit = useCallback(() => {
    if (currentSequence.length === 0) {
      setFeedback('Press some buttons first!');
      setFeedbackType('error');
      return;
    }

    const result = level.checkSequence(currentSequence);

    allAttempts.current.push({
      level: levelIndex + 1,
      sequence: [...currentSequence],
      success: result.correct,
      timestamps: [...pressTimestamps],
    });

    if (result.correct) {
      setFeedback(result.feedback);
      setFeedbackType('success');
      setEnergy(100);
      setLevelComplete(true);
      setMachineGlow(prev => prev + 20);

      const solveTime = Date.now() - (levelStartTimes.current[levelIndex] || Date.now());
      levelSolveTimes.current.push(solveTime);
      pressesPerLevel.current.push(currentLevelPresses.current);

      const newCompleted = levelsCompleted + 1;
      setLevelsCompleted(newCompleted);
      onXPGain(20, `Level ${levelIndex + 1} solved`);

      // Transition to next level after delay
      setTimeout(() => {
        if (levelIndex < LEVELS.length - 1) {
          setShowLevelTransition(true);
          setTimeout(() => {
            setLevelIndex(prev => prev + 1);
            setCurrentSequence([]);
            setPressTimestamps([]);
            setAttemptsLeft(3);
            setTimeLeft(LEVELS[levelIndex + 1].timeLimit);
            setEnergy(0);
            setLevelComplete(false);
            setOutputHistory([]);
            setShowLevelTransition(false);
            setFeedback('Press buttons to discover the rule...');
            setFeedbackType('info');
            currentLevelPresses.current = 0;
            levelStartTimes.current.push(Date.now());
          }, 1500);
        } else {
          setPhase('complete');
        }
      }, 1200);
    } else {
      setFeedback(result.feedback);
      setFeedbackType('error');
      setAttemptsLeft(prev => {
        if (prev <= 1) {
          handleLevelFail();
          return 3;
        }
        return prev - 1;
      });
      setCurrentSequence([]);
      setPressTimestamps([]);
      setEnergy(0);
    }
  }, [currentSequence, pressTimestamps, level, levelIndex, levelsCompleted, onXPGain]);

  const handleLevelFail = useCallback(() => {
    pressesPerLevel.current.push(currentLevelPresses.current);
    levelSolveTimes.current.push(-1); // failed

    if (levelIndex < LEVELS.length - 1) {
      setShowLevelTransition(true);
      setTimeout(() => {
        setLevelIndex(prev => prev + 1);
        setCurrentSequence([]);
        setPressTimestamps([]);
        setAttemptsLeft(3);
        setTimeLeft(LEVELS[levelIndex + 1]?.timeLimit ?? 90);
        setEnergy(0);
        setLevelComplete(false);
        setOutputHistory([]);
        setShowLevelTransition(false);
        setFeedback('Press buttons to discover the rule...');
        setFeedbackType('info');
        currentLevelPresses.current = 0;
        levelStartTimes.current.push(Date.now());
      }, 1500);
    } else {
      setPhase('complete');
    }
  }, [levelIndex]);

  const handleClearSequence = () => {
    setCurrentSequence([]);
    setPressTimestamps([]);
    setEnergy(0);
    setFeedback('Sequence cleared. Try again...');
    setFeedbackType('info');
  };

  // --- Behavioral metrics calculation ---
  const computeMetrics = useCallback(() => {
    const attempts = allAttempts.current;
    const presses = allPresses.current;

    // Scientific Thinking: changing only one variable at a time between attempts on same level
    let singleVarChanges = 0;
    let totalComparisons = 0;
    for (let lvl = 1; lvl <= 5; lvl++) {
      const lvlAttempts = attempts.filter(a => a.level === lvl);
      for (let i = 1; i < lvlAttempts.length; i++) {
        totalComparisons++;
        const prev = lvlAttempts[i - 1].sequence;
        const curr = lvlAttempts[i].sequence;
        if (prev.length === curr.length) {
          const diffs = prev.reduce((count, btn, idx) => count + (btn !== curr[idx] ? 1 : 0), 0);
          if (diffs === 1) singleVarChanges++;
        }
      }
    }
    const scientificThinking = totalComparisons > 0 ? Math.round((singleVarChanges / totalComparisons) * 100) : 50;

    // Hypothesis Testing: tried variations of working sequences
    let variationCount = 0;
    let afterSuccessAttempts = 0;
    for (let lvl = 1; lvl <= 5; lvl++) {
      const lvlAttempts = attempts.filter(a => a.level === lvl);
      for (let i = 1; i < lvlAttempts.length; i++) {
        if (lvlAttempts[i - 1].success || lvlAttempts[i - 1].sequence.length > 0) {
          afterSuccessAttempts++;
          const prev = lvlAttempts[i - 1].sequence;
          const curr = lvlAttempts[i].sequence;
          if (JSON.stringify(prev) !== JSON.stringify(curr)) variationCount++;
        }
      }
    }
    const hypothesisTesting = afterSuccessAttempts > 0 ? Math.round((variationCount / afterSuccessAttempts) * 100) : 50;

    // Learning Agility: solved later levels faster than earlier ones
    const solveTimes = levelSolveTimes.current.filter(t => t > 0);
    let agility = 50;
    if (solveTimes.length >= 2) {
      const firstHalf = solveTimes.slice(0, Math.ceil(solveTimes.length / 2));
      const secondHalf = solveTimes.slice(Math.ceil(solveTimes.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (avgFirst > 0) {
        const improvement = (avgFirst - avgSecond) / avgFirst;
        agility = Math.round(Math.min(100, Math.max(0, 50 + improvement * 100)));
      }
    }

    // Persistence: kept trying after failed attempts
    const failedThenRetried = attempts.filter((a, i) =>
      !a.success && i < attempts.length - 1 && attempts[i + 1].level === a.level
    ).length;
    const failedAttempts = attempts.filter(a => !a.success).length;
    const persistence = failedAttempts > 0 ? Math.round((failedThenRetried / failedAttempts) * 100) : 70;

    // Pattern Recognition: levels completed correctly
    const patternRecognition = Math.round((levelsCompleted / LEVELS.length) * 100);

    // Efficiency: fewer button presses to find solution
    const pressesArr = pressesPerLevel.current;
    const avgPresses = pressesArr.length > 0 ? pressesArr.reduce((a, b) => a + b, 0) / pressesArr.length : 20;
    const efficiency = Math.round(Math.min(100, Math.max(0, 100 - (avgPresses - 3) * 5)));

    // Systematic timing: regular intervals between presses = more systematic
    let timingRegularity = 50;
    if (presses.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < presses.length; i++) {
        intervals.push(presses[i].timestamp - presses[i - 1].timestamp);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const cv = avgInterval > 0 ? stdDev / avgInterval : 1;
      timingRegularity = Math.round(Math.min(100, Math.max(0, 100 - cv * 100)));
    }

    return {
      scientificThinking: Math.min(100, Math.round((scientificThinking + timingRegularity) / 2)),
      hypothesisTesting: Math.min(100, hypothesisTesting),
      learningAgility: Math.min(100, agility),
      persistence: Math.min(100, persistence),
      patternRecognition: Math.min(100, patternRecognition),
      efficiency: Math.min(100, efficiency),
    };
  }, [levelsCompleted]);

  const handleFinish = () => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const score = levelsCompleted * 20;
    const metrics = computeMetrics();
    const result: GameResult = {
      score,
      rawScore: levelsCompleted,
      timeSpent,
      metrics,
      type: 'game',
      data: {
        profile: metrics,
        levelsCompleted,
        attempts: allAttempts.current.length,
        totalPresses: allPresses.current.length,
      },
    };
    onComplete(result);
  };

  const handleGameExit = () => {
    const progress: AssessmentProgress = {
      step: levelIndex,
      correctCount: levelsCompleted,
      textInput: '',
      gameScore: levelsCompleted * 20,
      simState: null,
    };
    onExit(progress);
  };

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Pattern Machine"
        description="A mysterious machine with colored buttons. Each level has a hidden rule. Experiment, observe, and crack the code to power it up."
        icon="precision_manufacturing"
        duration="~8 minutes"
        rules={[
          'Press buttons and observe the machine\'s output.',
          'Each level has a secret rule governing the correct sequence.',
          'Submit your solution when you think you\'ve found the pattern.',
          'You get 3 attempts per level. Use them wisely!',
          'Complete all 5 levels to master the machine.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const finalScore = levelsCompleted * 20;
    const metrics = computeMetrics();

    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #a855f7)' }}>
            <span className="material-symbols-outlined text-5xl text-white">bolt</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">Machine Powered!</h2>
          <p className="text-text-muted mb-8">You completed {levelsCompleted} of {LEVELS.length} levels</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Score</p>
              <p className="text-3xl font-black text-primary">{finalScore}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Levels</p>
              <p className="text-3xl font-black text-blue-500">{levelsCompleted}/5</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Attempts</p>
              <p className="text-3xl font-black text-purple-500">{allAttempts.current.length}</p>
            </div>
          </div>

          {/* Power bar visualization */}
          <div className="mb-8">
            <div className="flex gap-1 justify-center">
              {LEVELS.map((_, i) => (
                <div
                  key={i}
                  className="h-3 flex-1 rounded-full transition-all duration-500"
                  style={{
                    background: i < levelsCompleted
                      ? 'linear-gradient(90deg, #3b82f6, #a855f7)'
                      : 'rgba(128,128,128,0.2)',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">Machine power: {levelsCompleted * 20}%</p>
          </div>

          <button
            onClick={handleFinish}
            className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // --- LEVEL TRANSITION ---
  if (showLevelTransition) {
    return (
      <div className="max-w-lg mx-auto mt-24 animate-[fadeIn_0.2s_ease-out] text-center">
        <div className="size-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-4xl text-blue-400">arrow_forward</span>
        </div>
        <h3 className="text-2xl font-black text-text-main dark:text-white mb-2">Level {levelIndex + 2}</h3>
        <p className="text-text-muted">{LEVELS[levelIndex + 1]?.title ?? 'Final'}</p>
      </div>
    );
  }

  // --- PLAYING ---
  const attemptDots = Array.from({ length: 3 }, (_, i) => i < attemptsLeft);

  return (
    <div className="max-w-4xl mx-auto mt-4 animate-[fadeIn_0.2s_ease-out]">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <button onClick={handleGameExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="text-xs text-text-muted">Level {level.id} of 5</span>
            <p className="text-lg font-black text-text-main dark:text-white">{level.title}</p>
          </div>
        </div>

        {/* Attempts */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted mr-1">Attempts:</span>
          {attemptDots.map((active, i) => (
            <div
              key={i}
              className={`size-3 rounded-full transition-all ${active ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
            />
          ))}
        </div>

        {/* Timer */}
        <div className={`font-mono font-bold text-xl ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-text-main dark:text-white'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main Machine Panel */}
        <div className="flex-1 rounded-3xl overflow-hidden shadow-xl border border-text-main/5 dark:border-white/5" style={{ background: 'linear-gradient(180deg, #1a1a2e, #16213e)' }}>
          {/* Output Display */}
          <div className="mx-6 mt-6 rounded-xl p-4 border border-green-500/20" style={{ background: '#0a0f0a' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-green-500/60 font-bold">Output Terminal</span>
            </div>
            <p
              className={`font-mono text-sm transition-all ${
                feedbackType === 'success' ? 'text-green-400' :
                feedbackType === 'error' ? 'text-red-400' :
                'text-green-300'
              }`}
              style={{ textShadow: feedbackType === 'success' ? '0 0 10px #22c55e' : 'none' }}
            >
              &gt; {feedback}
            </p>
          </div>

          {/* Description */}
          <p className="text-center text-gray-400 text-sm mt-4 px-6">{level.description}</p>

          {/* Machine Buttons */}
          <div className="flex items-center justify-center gap-4 py-8 px-6">
            {level.buttons.map(btn => {
              const color = BUTTON_COLORS[btn];
              const isPressed = pressedBtn === btn;
              return (
                <button
                  key={btn}
                  onClick={() => handleButtonPress(btn)}
                  disabled={levelComplete}
                  className="relative group transition-all duration-150 active:scale-90 disabled:opacity-40"
                  style={{ filter: isPressed ? `drop-shadow(0 0 20px ${color.glow})` : 'none' }}
                >
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    {/* Outer ring */}
                    <circle cx="36" cy="36" r="34" fill="none" stroke={color.bg} strokeWidth="2" opacity="0.3" />
                    {/* Button body */}
                    <circle
                      cx="36" cy="36" r="28"
                      fill={color.bg}
                      className="transition-all duration-150"
                      style={{
                        filter: isPressed ? 'brightness(1.3)' : 'brightness(1)',
                        transform: isPressed ? 'scale(0.92)' : 'scale(1)',
                        transformOrigin: 'center',
                      }}
                    />
                    {/* Highlight */}
                    <ellipse cx="30" cy="28" rx="10" ry="8" fill="white" opacity="0.2" />
                    {/* Label */}
                    <text x="36" y="40" textAnchor="middle" fill="white" fontWeight="bold" fontSize="16" style={{ pointerEvents: 'none' }}>
                      {color.letter}
                    </text>
                  </svg>
                  {/* Glow pulse on press */}
                  {isPressed && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: color.glow, opacity: 0.3 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Current Sequence Display */}
          <div className="mx-6 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Current Sequence</span>
              <button
                onClick={handleClearSequence}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2 min-h-[40px] flex-wrap">
              {currentSequence.length === 0 ? (
                <span className="text-gray-600 text-sm italic">No presses yet...</span>
              ) : (
                currentSequence.map((btn, i) => (
                  <div
                    key={i}
                    className="size-8 rounded-lg flex items-center justify-center text-white text-sm font-bold animate-[fadeIn_0.15s_ease-out]"
                    style={{ background: BUTTON_COLORS[btn]?.bg ?? '#666' }}
                  >
                    {BUTTON_COLORS[btn]?.letter ?? btn}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Energy Bar */}
          <div className="mx-6 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Energy</span>
              <span className="text-xs text-gray-400 font-mono">{Math.round(energy)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${energy}%`,
                  background: energy >= 80 ? 'linear-gradient(90deg, #22c55e, #a855f7)' :
                             energy >= 40 ? 'linear-gradient(90deg, #3b82f6, #22c55e)' :
                             '#3b82f6',
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="px-6 pb-6">
            <button
              onClick={handleSubmit}
              disabled={currentSequence.length === 0 || levelComplete}
              className="w-full py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
              style={{
                background: energy >= 80 ? 'linear-gradient(90deg, #22c55e, #a855f7)' : '#3b82f6',
                color: 'white',
                boxShadow: energy >= 80 ? '0 0 20px rgba(34,197,94,0.3)' : 'none',
              }}
            >
              Submit Solution
            </button>
          </div>
        </div>

        {/* Right sidebar — History */}
        <div className="w-56 flex flex-col gap-4 shrink-0">
          {/* Level Progress */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3 text-center">Machine Power</p>
            <div className="flex gap-1 mb-2">
              {LEVELS.map((_, i) => (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: i < levelsCompleted ? 'linear-gradient(90deg, #3b82f6, #a855f7)' :
                               i === levelIndex ? '#3b82f680' : 'rgba(128,128,128,0.2)',
                  }}
                />
              ))}
            </div>
            <p className="text-center text-xs text-text-muted">{levelsCompleted * 20}% powered</p>
          </div>

          {/* Output History */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-4 flex-1 max-h-[420px] overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Press History</p>
            {outputHistory.length === 0 && (
              <p className="text-xs text-text-muted italic">No presses yet</p>
            )}
            {outputHistory.map((entry, i) => (
              <div key={i} className="mb-3 pb-2 border-b border-black/5 dark:border-white/5 last:border-0">
                <div className="flex gap-1 mb-1 flex-wrap">
                  {entry.seq.map((btn, j) => (
                    <div
                      key={j}
                      className="size-5 rounded text-[10px] font-bold flex items-center justify-center text-white"
                      style={{ background: BUTTON_COLORS[btn]?.bg ?? '#666' }}
                    >
                      {btn}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-text-muted font-mono">{entry.output}</p>
              </div>
            ))}
          </div>

          {/* Hint */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Hint</p>
            <p className="text-xs text-text-muted italic">{level.hint}</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
