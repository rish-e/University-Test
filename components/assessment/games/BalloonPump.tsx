import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------
type Phase = 'intro' | 'playing' | 'popping' | 'banking' | 'complete';

type BalloonColor = 'blue' | 'orange' | 'pink';

interface BalloonConfig {
  color: BalloonColor;
  minPop: number;
  maxPop: number;
  fillPrimary: string;
  fillDark: string;
  stroke: string;
  gradientLight: string;
}

interface BalloonRecord {
  index: number;
  color: BalloonColor;
  pumps: number;
  banked: boolean;             // true = banked, false = popped
  earnings: number;            // 0 if popped
  popThreshold: number;        // hidden
  pumpTimesMs: number[];       // time between each pump
  bankDecisionMs: number;      // time from last pump to bank (0 if popped)
}

const TOTAL_BALLOONS = 20;
const GAME_TIME = 90;
const PUMP_VALUE = 0.50;

const BALLOON_CONFIGS: Record<BalloonColor, BalloonConfig> = {
  blue: {
    color: 'blue',
    minPop: 8,
    maxPop: 32,
    fillPrimary: '#3b82f6',
    fillDark: '#1d4ed8',
    stroke: '#2563eb',
    gradientLight: '#93c5fd',
  },
  orange: {
    color: 'orange',
    minPop: 4,
    maxPop: 16,
    fillPrimary: '#f97316',
    fillDark: '#c2410c',
    stroke: '#ea580c',
    gradientLight: '#fdba74',
  },
  pink: {
    color: 'pink',
    minPop: 16,
    maxPop: 64,
    fillPrimary: '#ec4899',
    fillDark: '#be185d',
    stroke: '#db2777',
    gradientLight: '#f9a8d4',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePopThreshold(config: BalloonConfig): number {
  return Math.floor(Math.random() * (config.maxPop - config.minPop + 1)) + config.minPop;
}

// Particle for pop animation
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

function createPopParticles(color: string): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5;
    const speed = 3 + Math.random() * 5;
    particles.push({
      id: i,
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 4 + Math.random() * 6,
      color,
      life: 1,
    });
  }
  return particles;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const BalloonPump: React.FC<GameComponentProps> = ({
  section,
  onComplete,
  onExit,
  onXPGain,
}) => {
  // Game state
  const [phase, setPhase] = useState<Phase>('intro');
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [balloonIdx, setBalloonIdx] = useState(0);
  const [pumps, setPumps] = useState(0);
  const [currentPot, setCurrentPot] = useState(0);
  const [totalBanked, setTotalBanked] = useState(0);
  const [popThreshold, setPopThreshold] = useState(0);
  const [balloonColor, setBalloonColor] = useState<BalloonColor>('blue');
  const [records, setRecords] = useState<BalloonRecord[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showBankAnim, setShowBankAnim] = useState(false);
  const [bankAmount, setBankAmount] = useState(0);

  // Refs
  const gameStartRef = useRef(0);
  const lastPumpRef = useRef(0);
  const pumpTimesRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const colorSeqRef = useRef<BalloonColor[]>([]);
  const popThresholdsRef = useRef<number[]>([]);

  // ------- Initialize balloon sequence -------
  useEffect(() => {
    // Generate color sequence and pop thresholds once
    const colors: BalloonColor[] = [];
    const pool: BalloonColor[] = [];
    for (let i = 0; i < 7; i++) pool.push('blue');
    for (let i = 0; i < 7; i++) pool.push('orange');
    for (let i = 0; i < 6; i++) pool.push('pink');
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    colorSeqRef.current = pool;
    popThresholdsRef.current = pool.map(c => generatePopThreshold(BALLOON_CONFIGS[c]));
  }, []);

  // ------- Start game -------
  const handleStart = useCallback(() => {
    gameStartRef.current = Date.now();
    lastPumpRef.current = Date.now();
    pumpTimesRef.current = [];

    const firstColor = colorSeqRef.current[0] ?? 'blue';
    const firstThreshold = popThresholdsRef.current[0] ?? 20;

    setBalloonColor(firstColor);
    setPopThreshold(firstThreshold);
    setBalloonIdx(0);
    setPumps(0);
    setCurrentPot(0);
    setTotalBanked(0);
    setRecords([]);
    setTimeLeft(GAME_TIME);
    setPhase('playing');
  }, []);

  // ------- Timer -------
  useEffect(() => {
    if (phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPhase('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // ------- Setup next balloon -------
  const setupNextBalloon = useCallback((nextIdx: number) => {
    if (nextIdx >= TOTAL_BALLOONS) {
      setPhase('complete');
      return;
    }

    const nextColor = colorSeqRef.current[nextIdx] ?? 'blue';
    const nextThreshold = popThresholdsRef.current[nextIdx] ?? 20;

    setBalloonIdx(nextIdx);
    setBalloonColor(nextColor);
    setPopThreshold(nextThreshold);
    setPumps(0);
    setCurrentPot(0);
    pumpTimesRef.current = [];
    lastPumpRef.current = Date.now();
    setPhase('playing');
  }, []);

  // ------- Pump handler -------
  const handlePump = useCallback(() => {
    if (phase !== 'playing') return;

    const now = Date.now();
    const timeSinceLast = now - lastPumpRef.current;
    lastPumpRef.current = now;
    pumpTimesRef.current.push(timeSinceLast);

    const newPumps = pumps + 1;
    const newPot = currentPot + PUMP_VALUE;
    setPumps(newPumps);
    setCurrentPot(newPot);

    // Check pop
    if (newPumps >= popThreshold) {
      // POP!
      const config = BALLOON_CONFIGS[balloonColor];
      setParticles(createPopParticles(config.fillPrimary));
      setPhase('popping');

      const record: BalloonRecord = {
        index: balloonIdx,
        color: balloonColor,
        pumps: newPumps,
        banked: false,
        earnings: 0,
        popThreshold,
        pumpTimesMs: [...pumpTimesRef.current],
        bankDecisionMs: 0,
      };
      setRecords(prev => [...prev, record]);

      // Animate then next balloon
      setTimeout(() => {
        setParticles([]);
        setupNextBalloon(balloonIdx + 1);
      }, 1500);
    } else {
      onXPGain(1, 'pump');
    }
  }, [phase, pumps, currentPot, popThreshold, balloonColor, balloonIdx, setupNextBalloon, onXPGain]);

  // ------- Bank handler -------
  const handleBank = useCallback(() => {
    if (phase !== 'playing' || currentPot === 0) return;

    const now = Date.now();
    const bankDecision = now - lastPumpRef.current;

    setBankAmount(currentPot);
    setShowBankAnim(true);
    setTotalBanked(prev => prev + currentPot);
    setPhase('banking');

    const xp = Math.max(5, Math.round(currentPot * 2));
    onXPGain(xp, 'banked');

    const record: BalloonRecord = {
      index: balloonIdx,
      color: balloonColor,
      pumps,
      banked: true,
      earnings: currentPot,
      popThreshold,
      pumpTimesMs: [...pumpTimesRef.current],
      bankDecisionMs: bankDecision,
    };
    setRecords(prev => [...prev, record]);

    setTimeout(() => {
      setShowBankAnim(false);
      setupNextBalloon(balloonIdx + 1);
    }, 800);
  }, [phase, currentPot, pumps, balloonColor, balloonIdx, popThreshold, setupNextBalloon, onXPGain]);

  // ------- Compute final metrics & complete -------
  useEffect(() => {
    if (phase !== 'complete') return;

    const timeSpent = Math.round((Date.now() - gameStartRef.current) / 1000);

    // Total banked including what may not have been state-updated
    const finalBanked = records.reduce((sum, r) => sum + r.earnings, 0);

    // Theoretical optimal: bank at threshold-1 for each balloon
    const theoreticalMax = popThresholdsRef.current
      .slice(0, records.length > 0 ? records.length : TOTAL_BALLOONS)
      .reduce((sum, threshold) => sum + (threshold - 1) * PUMP_VALUE, 0);

    const normalizedScore = theoreticalMax > 0
      ? Math.min(100, Math.round((finalBanked / theoreticalMax) * 100))
      : 0;

    // --- METRICS ---

    // Risk tolerance: avg pumps before banking (higher = more risk)
    const bankedRecords = records.filter(r => r.banked);
    const allPumps = records.map(r => r.pumps);
    const avgPumps = allPumps.length > 0
      ? allPumps.reduce((a, b) => a + b, 0) / allPumps.length
      : 0;
    // Map: typical range 2-40 pumps -> 0-100
    const riskTolerance = Math.min(100, Math.round((avgPumps / 30) * 100));

    // Impulse control: inverse of pump speed (fast pumping = low control)
    const allPumpTimes = records.flatMap(r => r.pumpTimesMs.slice(1)); // skip first (balloon start)
    const avgPumpTime = allPumpTimes.length > 0
      ? allPumpTimes.reduce((a, b) => a + b, 0) / allPumpTimes.length
      : 1000;
    // Map: 100ms -> 0 (impulsive), 2000ms -> 100 (controlled)
    const impulseControl = Math.max(0, Math.min(100, Math.round(((avgPumpTime - 100) / 1900) * 100)));

    // Pattern learning: adapted behavior to different colored balloons
    // Compare avg pumps per color — if orange < blue < pink, they learned
    const pumpsByColor: Record<BalloonColor, number[]> = { blue: [], orange: [], pink: [] };
    records.forEach(r => pumpsByColor[r.color].push(r.pumps));
    const avgByColor: Record<BalloonColor, number> = {
      blue: pumpsByColor.blue.length > 0
        ? pumpsByColor.blue.reduce((a, b) => a + b, 0) / pumpsByColor.blue.length : 0,
      orange: pumpsByColor.orange.length > 0
        ? pumpsByColor.orange.reduce((a, b) => a + b, 0) / pumpsByColor.orange.length : 0,
      pink: pumpsByColor.pink.length > 0
        ? pumpsByColor.pink.reduce((a, b) => a + b, 0) / pumpsByColor.pink.length : 0,
    };
    // Ideal: orange < blue < pink
    let patternLearning = 50; // baseline
    if (avgByColor.orange > 0 && avgByColor.blue > 0 && avgByColor.pink > 0) {
      let pts = 0;
      if (avgByColor.orange < avgByColor.blue) pts += 30;
      if (avgByColor.blue < avgByColor.pink) pts += 30;
      if (avgByColor.orange < avgByColor.pink) pts += 20;
      // Did they learn over time? Compare first half vs second half of each color
      const halvesScore = (['blue', 'orange', 'pink'] as BalloonColor[]).reduce((score, color) => {
        const arr = pumpsByColor[color];
        if (arr.length < 2) return score;
        const mid = Math.floor(arr.length / 2);
        const firstHalf = arr.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
        const secondHalf = arr.slice(mid).reduce((a, b) => a + b, 0) / (arr.length - mid);
        // For orange: second half should have fewer pumps (learned it's dangerous)
        if (color === 'orange' && secondHalf < firstHalf) return score + 7;
        // For pink: second half should have more pumps (learned it's safe)
        if (color === 'pink' && secondHalf > firstHalf) return score + 7;
        return score;
      }, 0);
      patternLearning = Math.min(100, pts + halvesScore);
    }

    // Loss recovery: pumping behavior after a pop (more cautious = higher)
    let lossRecovery = 50;
    const popIndices = records.reduce<number[]>((acc, r, i) => {
      if (!r.banked) acc.push(i);
      return acc;
    }, []);
    if (popIndices.length > 0) {
      let cautiousAfterPop = 0;
      let totalComparisons = 0;
      popIndices.forEach(popIdx => {
        if (popIdx + 1 < records.length) {
          const afterPop = records[popIdx + 1];
          const popped = records[popIdx];
          if (afterPop.pumps < popped.pumps) cautiousAfterPop++;
          totalComparisons++;
        }
      });
      if (totalComparisons > 0) {
        lossRecovery = Math.round((cautiousAfterPop / totalComparisons) * 100);
      }
    }

    // Decision consistency: variance in banking thresholds (low variance = consistent)
    const bankPumps = bankedRecords.map(r => r.pumps);
    let decisionConsistency = 50;
    if (bankPumps.length > 1) {
      const mean = bankPumps.reduce((a, b) => a + b, 0) / bankPumps.length;
      const variance = bankPumps.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / bankPumps.length;
      const stdDev = Math.sqrt(variance);
      // Map: 0 stdDev -> 100, 10+ -> 0
      decisionConsistency = Math.max(0, Math.min(100, Math.round(100 - (stdDev / 10) * 100)));
    }

    // Earnings efficiency
    const earningsEfficiency = theoreticalMax > 0
      ? Math.min(100, Math.round((finalBanked / theoreticalMax) * 100))
      : 0;

    const result: GameResult = {
      score: normalizedScore,
      rawScore: Math.round(finalBanked * 100) / 100,
      timeSpent,
      type: 'balloon_pump',
      metrics: {
        riskTolerance,
        impulseControl,
        patternLearning,
        lossRecovery,
        decisionConsistency,
        earningsEfficiency,
      },
      data: { records, totalBanked: finalBanked },
    };
    onComplete(result);
  }, [phase, records, onComplete]);

  // ------- Exit handler -------
  const handleExit = useCallback(() => {
    const progress: AssessmentProgress = {
      step: balloonIdx,
      correctCount: records.filter(r => r.banked).length,
      textInput: '',
      gameScore: Math.round(totalBanked * 100) / 100,
      simState: null,
    };
    onExit(progress);
  }, [balloonIdx, records, totalBanked, onExit]);

  // ===================================================================
  // RENDER
  // ===================================================================

  // --- Intro ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Balloon Pump"
        description="Inflate balloons to earn money, but bank before they pop! Different colored balloons have different risk levels."
        icon="experiment"
        duration="~90 sec"
        rules={[
          'Each pump adds $0.50 to your temporary pot.',
          'Bank to keep the money and start a new balloon.',
          'If the balloon pops, you lose that pot!',
          'Different colors have different pop thresholds.',
          '20 balloons, 90 seconds. Maximize your earnings!'
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- Complete ---
  if (phase === 'complete') {
    const finalBanked = records.reduce((sum, r) => sum + r.earnings, 0);
    const poppedCount = records.filter(r => !r.banked).length;
    const bankedCount = records.filter(r => r.banked).length;

    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">savings</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">Game Over!</h2>
          <p className="text-text-muted mb-8">Here's how you did</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Earned</p>
              <p className="text-3xl font-black text-primary">${finalBanked.toFixed(2)}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Banked</p>
              <p className="text-3xl font-black text-green-500">{bankedCount}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Popped</p>
              <p className="text-3xl font-black text-red-500">{poppedCount}</p>
            </div>
          </div>

          {/* History strip */}
          <div className="flex justify-center gap-1.5 flex-wrap mb-8">
            {records.map((r, i) => {
              const config = BALLOON_CONFIGS[r.color];
              const sizeScale = r.banked ? Math.min(2, 0.6 + r.pumps * 0.08) : 1;
              return (
                <div
                  key={i}
                  className={`rounded-full transition-all ${r.banked ? 'ring-2 ring-green-400' : 'ring-2 ring-red-400 opacity-50'}`}
                  style={{
                    width: 16 * sizeScale,
                    height: 16 * sizeScale,
                    backgroundColor: config.fillPrimary,
                  }}
                  title={`#${i + 1} ${r.color}: ${r.banked ? `$${r.earnings.toFixed(2)}` : 'popped'}`}
                />
              );
            })}
          </div>

          <button
            onClick={() => {
              const finalBanked2 = records.reduce((sum, r) => sum + r.earnings, 0);
              const theoreticalMax = popThresholdsRef.current
                .slice(0, records.length)
                .reduce((sum, threshold) => sum + (threshold - 1) * PUMP_VALUE, 0);
              const score = theoreticalMax > 0
                ? Math.min(100, Math.round((finalBanked2 / theoreticalMax) * 100))
                : 0;
              const timeSpent = Math.round((Date.now() - gameStartRef.current) / 1000);
              onComplete({
                score,
                rawScore: Math.round(finalBanked2 * 100) / 100,
                timeSpent,
                type: 'balloon_pump',
                metrics: {},
                data: { records },
              });
            }}
            className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            Finish
          </button>
        </div>
      </div>
    );
  }

  // --- Playing / Popping / Banking ---
  const config = BALLOON_CONFIGS[balloonColor];
  const isPopping = phase === 'popping';
  const isBanking = phase === 'banking';

  // Balloon dimensions grow with pumps
  const maxPumpsForSize = config.maxPop;
  const growthFraction = Math.min(1, pumps / maxPumpsForSize);
  const balloonW = 100 + growthFraction * 100;
  const balloonH = 130 + growthFraction * 120;
  const wobbleIntensity = Math.min(6, growthFraction * 8);

  // Color darkens as balloon grows
  const opacity = 1 - growthFraction * 0.3;

  return (
    <div className="max-w-3xl mx-auto mt-4 animate-[fadeIn_0.2s_ease-out] relative">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          <button onClick={handleExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="text-xs text-text-muted">Total Banked</span>
            <p className="text-2xl font-black text-green-500">${totalBanked.toFixed(2)}</p>
          </div>
        </div>

        <div className="text-center">
          <span className="text-xs text-text-muted">Balloon</span>
          <p className="text-lg font-bold text-text-main dark:text-white">{balloonIdx + 1}/{TOTAL_BALLOONS}</p>
        </div>

        <div className={`font-mono font-bold text-xl tabular-nums ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-text-main dark:text-white'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Main area */}
      <div className="bg-card-bg dark:bg-card-bg-dark rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 overflow-hidden">
        {/* Current pot */}
        <div className="text-center pt-4">
          <span className="text-xs text-text-muted uppercase font-bold">Current Pot</span>
          <p className="text-3xl font-black" style={{ color: config.fillPrimary }}>
            ${currentPot.toFixed(2)}
          </p>
        </div>

        {/* Balloon area */}
        <div className="h-72 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Bank animation */}
          {showBankAnim && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 animate-[bankFloat_0.8s_ease-out_forwards]">
              <div className="px-4 py-2 bg-green-500 text-white font-black text-lg rounded-full shadow-lg">
                +${bankAmount.toFixed(2)}
              </div>
            </div>
          )}

          {isPopping ? (
            /* Pop animation */
            <div className="relative flex items-center justify-center">
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="absolute rounded-full"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    animation: `particleFly 0.8s ease-out forwards`,
                    animationDelay: `${p.id * 20}ms`,
                    ['--px' as string]: `${p.vx * 25}px`,
                    ['--py' as string]: `${p.vy * 25}px`,
                  }}
                />
              ))}
              <div className="text-red-500 font-black text-3xl animate-[popBounce_0.5s_ease-out]">
                POP!
              </div>
              <div className="absolute top-16 text-text-muted font-bold text-sm animate-[fadeIn_0.3s_ease-out]">
                Lost ${currentPot.toFixed(2)}
              </div>
            </div>
          ) : (
            /* Balloon SVG */
            <div
              className="flex flex-col items-center transition-all duration-200"
              style={{
                animation: wobbleIntensity > 0.5
                  ? `balloonWobble ${Math.max(0.3, 1.2 - wobbleIntensity * 0.1)}s ease-in-out infinite`
                  : 'none',
              }}
            >
              <svg
                width={balloonW}
                height={balloonH + 40}
                viewBox="0 0 100 140"
                className="transition-all duration-200 drop-shadow-lg"
                style={{ filter: `drop-shadow(0 4px 20px ${config.fillPrimary}40)` }}
              >
                <defs>
                  <radialGradient id={`grad-${balloonColor}`} cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                    <stop offset="60%" stopColor={config.gradientLight} stopOpacity={opacity * 0.6} />
                    <stop offset="100%" stopColor={config.fillPrimary} stopOpacity={opacity} />
                  </radialGradient>
                </defs>
                {/* Balloon body */}
                <path
                  d="M 50 8 C 18 8, 3 34, 3 56 C 3 82, 24 102, 50 107 C 76 102, 97 82, 97 56 C 97 34, 82 8, 50 8 Z"
                  fill={`url(#grad-${balloonColor})`}
                  stroke={config.stroke}
                  strokeWidth="1.2"
                />
                {/* Shine highlight */}
                <ellipse cx="33" cy="32" rx="14" ry="18" fill="white" opacity="0.18" />
                {/* Small secondary shine */}
                <ellipse cx="65" cy="26" rx="5" ry="7" fill="white" opacity="0.1" />
                {/* Knot */}
                <polygon points="46,107 50,114 54,107" fill={config.fillDark} />
                {/* String */}
                <path
                  d="M 50 114 Q 47 122, 53 128 Q 47 134, 50 140"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                {/* Pumps count */}
                <text x="50" y="62" textAnchor="middle" fill="white" fontWeight="bold" fontSize="14" opacity="0.9">
                  {pumps}
                </text>
                <text x="50" y="74" textAnchor="middle" fill="white" fontSize="9" opacity="0.6">
                  pumps
                </text>
              </svg>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 px-6 pb-6">
          <button
            onClick={handlePump}
            disabled={isPopping || isBanking}
            className="flex-1 max-w-52 py-5 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex flex-col items-center gap-1 border-2 border-transparent hover:border-white/10"
            style={{
              backgroundColor: `${config.fillPrimary}20`,
              color: config.fillPrimary,
            }}
          >
            <span className="material-symbols-outlined text-3xl">air</span>
            <span>PUMP +$0.50</span>
          </button>
          <button
            onClick={handleBank}
            disabled={isPopping || isBanking || currentPot === 0}
            className="flex-1 max-w-52 py-5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex flex-col items-center gap-1 hover:bg-green-200 dark:hover:bg-green-500/30 border-2 border-transparent hover:border-green-400/30"
          >
            <span className="material-symbols-outlined text-3xl">savings</span>
            <span>BANK ${currentPot.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* History strip */}
      <div className="mt-4 bg-card-bg dark:bg-card-bg-dark rounded-2xl p-4 border border-text-main/5 dark:border-white/5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">History</p>
        {records.length === 0 ? (
          <p className="text-xs text-text-muted italic">Start pumping!</p>
        ) : (
          <div className="flex gap-2 flex-wrap items-center">
            {records.map((r, i) => {
              const cfg = BALLOON_CONFIGS[r.color];
              const sizeScale = r.banked ? Math.min(2, 0.7 + r.pumps * 0.06) : 0.8;
              return (
                <div key={i} className="relative group">
                  <div
                    className={`rounded-full transition-all cursor-default ${r.banked ? 'ring-2 ring-green-400/60' : 'ring-2 ring-red-400/60'}`}
                    style={{
                      width: 20 * sizeScale,
                      height: 20 * sizeScale,
                      backgroundColor: r.banked ? cfg.fillPrimary : `${cfg.fillPrimary}60`,
                    }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                    <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap font-bold">
                      #{i + 1} {r.color}: {r.banked ? `$${r.earnings.toFixed(2)}` : 'popped'} ({r.pumps}p)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes balloonWobble {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(${wobbleIntensity * 0.6}deg) translateY(-2px); }
          75% { transform: rotate(-${wobbleIntensity * 0.6}deg) translateY(2px); }
        }
        @keyframes bankFloat {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -60px) scale(0.7); }
        }
        @keyframes popBounce {
          0% { transform: scale(2); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes particleFly {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0.2); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BalloonPump;
