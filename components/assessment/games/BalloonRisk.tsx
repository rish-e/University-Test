import React, { useState, useEffect, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

type GamePhase = 'intro' | 'playing' | 'complete';

interface RoundResult {
  round: number;
  banked: number;
  popped: boolean;
  pumps: number;
}

export const BalloonRisk: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [timeLeft, setTimeLeft] = useState(90);
  const [totalBanked, setTotalBanked] = useState(0);
  const [roundPot, setRoundPot] = useState(0);
  const [balloonSize, setBalloonSize] = useState(10);
  const [pumps, setPumps] = useState(0);
  const [popped, setPopped] = useState(false);
  const [roundNum, setRoundNum] = useState(1);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [closeCall, setCloseCall] = useState(false);
  const [wobbleIntensity, setWobbleIntensity] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleStart = () => {
    setPhase('playing');
    setTimeLeft(90);
    setTotalBanked(0);
    setRoundPot(0);
    setBalloonSize(10);
    setPumps(0);
    setPopped(false);
    setRoundNum(1);
    setHistory([]);
    startTimeRef.current = Date.now();
  };

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-bank remaining pot before ending
          if (roundPot > 0) {
            setTotalBanked(b => b + roundPot);
            setHistory(h => [...h, { round: roundNum, banked: roundPot, popped: false, pumps }]);
          }
          setPhase('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Calculate risk
  const getRiskPercent = () => {
    const base = 0.05;
    const sizeBonus = balloonSize > 20 ? (balloonSize - 20) * 0.02 : 0;
    return Math.min(0.95, base + sizeBonus);
  };

  const riskPercent = getRiskPercent();
  const riskDisplay = Math.round(riskPercent * 100);

  // Color based on risk
  const getBalloonColor = () => {
    if (riskPercent < 0.15) return { fill: '#22c55e', stroke: '#16a34a' }; // green
    if (riskPercent < 0.30) return { fill: '#eab308', stroke: '#ca8a04' }; // yellow
    if (riskPercent < 0.50) return { fill: '#f97316', stroke: '#ea580c' }; // orange
    return { fill: '#ef4444', stroke: '#dc2626' }; // red
  };

  const balloonColor = getBalloonColor();

  // Wobble increases with size
  useEffect(() => {
    setWobbleIntensity(Math.min(8, (balloonSize - 10) * 0.15));
  }, [balloonSize]);

  const handleInflate = () => {
    if (popped || phase !== 'playing') return;

    if (Math.random() < riskPercent) {
      // POPPED
      setPopped(true);
      setHistory(h => [...h, { round: roundNum, banked: 0, popped: true, pumps: pumps + 1 }]);
      setTimeout(() => {
        setPopped(false);
        setBalloonSize(10);
        setRoundPot(0);
        setPumps(0);
        setRoundNum(r => r + 1);
      }, 1200);
    } else {
      setBalloonSize(s => s + 5);
      setRoundPot(p => p + 10);
      setPumps(p => p + 1);

      // Close call warning
      if (riskPercent > 0.30) {
        setCloseCall(true);
        setTimeout(() => setCloseCall(false), 1000);
      }

      onXPGain(2, 'Brave pump');
    }
  };

  const handleBank = () => {
    if (popped || roundPot === 0 || phase !== 'playing') return;

    setTotalBanked(b => b + roundPot);
    setHistory(h => [...h, { round: roundNum, banked: roundPot, popped: false, pumps }]);
    onXPGain(Math.round(roundPot / 5), 'Smart bank');

    setBalloonSize(10);
    setRoundPot(0);
    setPumps(0);
    setRoundNum(r => r + 1);
  };

  const handleFinish = () => {
    const finalScore = Math.min(100, Math.round(totalBanked / 2));
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const poppedCount = history.filter(h => h.popped).length;
    const result: GameResult = {
      score: finalScore,
      rawScore: totalBanked,
      timeSpent,
      metrics: {
        totalBanked,
        rounds: history.length,
        popped: poppedCount,
        avgPumps: history.length > 0 ? Math.round(history.reduce((a, b) => a + b.pumps, 0) / history.length) : 0,
        riskTolerance: poppedCount > 0 ? Math.round((poppedCount / history.length) * 100) : 0,
      },
      type: 'game',
      data: { history, totalBanked },
    };
    onComplete(result);
  };

  const handleGameExit = () => {
    const progress: AssessmentProgress = {
      step: roundNum,
      correctCount: history.filter(h => !h.popped).length,
      textInput: '',
      gameScore: totalBanked,
      simState: null,
    };
    onExit(progress);
  };

  // SVG balloon dimensions
  const balloonWidth = Math.min(180, 60 + balloonSize * 1.5);
  const balloonHeight = Math.min(220, 80 + balloonSize * 2);

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Balloon Risk"
        description="Inflate the balloon to earn points. Bank your earnings before it pops! How much risk can you handle?"
        icon="explore"
        duration="90 seconds"
        rules={[
          'Each pump adds $10 to the pot but increases pop risk.',
          'Bank to save your pot and start a new balloon.',
          'If the balloon pops, you lose the current pot!',
          'Risk increases the bigger the balloon gets.',
          'Total banked / 2 = your final score (max 100).',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const finalScore = Math.min(100, Math.round(totalBanked / 2));
    const poppedCount = history.filter(h => h.popped).length;
    const bankedCount = history.filter(h => !h.popped).length;

    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">savings</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">Game Over!</h2>
          <p className="text-text-muted mb-8">Your risk profile results</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Score</p>
              <p className="text-3xl font-black text-primary">{finalScore}</p>
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

          {/* History */}
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-8 text-left max-h-40 overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Round History</p>
            {history.map((h, i) => (
              <div key={i} className={`flex items-center justify-between text-sm py-1 border-b border-black/5 dark:border-white/5 last:border-0 ${h.popped ? 'text-red-500' : 'text-text-main dark:text-white'}`}>
                <span className="font-bold">Round {h.round}</span>
                <span>{h.popped ? 'POPPED!' : `$${h.banked} banked`}</span>
              </div>
            ))}
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
  return (
    <div className="max-w-3xl mx-auto mt-6 animate-[fadeIn_0.2s_ease-out]">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          <button onClick={handleGameExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="text-xs text-text-muted">Total Banked</span>
            <p className="text-2xl font-black text-text-main dark:text-white">${totalBanked}</p>
          </div>
        </div>

        <div className="text-center">
          <span className="text-xs text-text-muted">Round {roundNum}</span>
          <p className="text-lg font-bold text-primary">${roundPot} pot</p>
        </div>

        <div className={`font-mono font-bold text-xl ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-text-main dark:text-white'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main Balloon Area */}
        <div className="flex-1 bg-card-bg dark:bg-card-bg-dark rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 overflow-hidden">
          {/* Balloon display */}
          <div className="h-72 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Close call flash */}
            {closeCall && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1 bg-orange-500 text-white font-black text-sm rounded-full animate-[float-up_1s_ease-out_forwards]">
                Close call!
              </div>
            )}

            {popped ? (
              <div className="flex flex-col items-center animate-[pop-burst_0.5s_ease-out]">
                {/* Burst fragments */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute size-3 rounded-full"
                    style={{
                      backgroundColor: balloonColor.fill,
                      animation: `fragment-fly_0.8s ease-out forwards`,
                      animationDelay: `${i * 0.03}s`,
                      transform: `rotate(${i * 45}deg) translateY(-${30 + Math.random() * 40}px)`,
                    }}
                  />
                ))}
                <span className="text-red-500 font-black text-3xl animate-bounce">POPPED!</span>
              </div>
            ) : (
              <div
                className="flex flex-col items-center"
                style={{
                  animation: wobbleIntensity > 0 ? `balloon-wobble ${Math.max(0.3, 1 - wobbleIntensity * 0.05)}s ease-in-out infinite` : 'none',
                }}
              >
                {/* SVG Balloon */}
                <svg
                  width={balloonWidth}
                  height={balloonHeight + 40}
                  viewBox="0 0 100 140"
                  className="transition-all duration-300"
                >
                  {/* Balloon body - inverted teardrop */}
                  <defs>
                    <radialGradient id="balloonGrad" cx="40%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                      <stop offset="100%" stopColor={balloonColor.fill} stopOpacity="1" />
                    </radialGradient>
                  </defs>
                  {/* Main balloon shape */}
                  <path
                    d="M 50 10 C 20 10, 5 35, 5 55 C 5 80, 25 100, 50 105 C 75 100, 95 80, 95 55 C 95 35, 80 10, 50 10 Z"
                    fill="url(#balloonGrad)"
                    stroke={balloonColor.stroke}
                    strokeWidth="1.5"
                  />
                  {/* Highlight */}
                  <ellipse cx="35" cy="35" rx="12" ry="16" fill="white" opacity="0.15" />
                  {/* Knot */}
                  <polygon points="46,105 50,112 54,105" fill={balloonColor.stroke} />
                  {/* String */}
                  <path
                    d="M 50 112 Q 48 120, 52 128 Q 48 132, 50 140"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  {/* Value text */}
                  <text x="50" y="60" textAnchor="middle" fill="white" fontWeight="bold" fontSize="16">
                    ${roundPot}
                  </text>
                </svg>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 p-6 pt-2">
            <button
              onClick={handleInflate}
              disabled={popped}
              className="flex-1 max-w-40 py-4 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-xl font-black hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex flex-col items-center gap-1"
            >
              <span className="material-symbols-outlined text-2xl">air</span>
              <span>PUMP</span>
            </button>
            <button
              onClick={handleBank}
              disabled={popped || roundPot === 0}
              className="flex-1 max-w-40 py-4 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-xl font-black hover:bg-green-200 dark:hover:bg-green-500/30 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex flex-col items-center gap-1"
            >
              <span className="material-symbols-outlined text-2xl">savings</span>
              <span>BANK</span>
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-48 flex flex-col gap-4 shrink-0">
          {/* Risk Thermometer */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-4 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3 text-center">Risk Level</p>
            <div className="flex items-end justify-center gap-2 h-36">
              <div className="w-8 h-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex flex-col-reverse relative">
                <div
                  className="w-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    height: `${riskDisplay}%`,
                    background: `linear-gradient(to top, ${balloonColor.fill}, ${riskPercent > 0.5 ? '#ef4444' : balloonColor.fill})`,
                  }}
                />
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: balloonColor.fill }}>{riskDisplay}%</p>
                <p className="text-[10px] text-text-muted">pop chance</p>
              </div>
            </div>
          </div>

          {/* Bank History */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-4 max-h-48 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">History</p>
            {history.length === 0 && (
              <p className="text-xs text-text-muted italic">No rounds yet</p>
            )}
            {history.map((h, i) => (
              <div
                key={i}
                className={`text-xs py-1 border-b border-black/5 dark:border-white/5 last:border-0 font-bold ${
                  h.popped ? 'text-red-500' : 'text-green-600 dark:text-green-400'
                }`}
              >
                R{h.round}: {h.popped ? 'POPPED!' : `$${h.banked}`}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes balloon-wobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(${wobbleIntensity * 0.5}deg); }
          75% { transform: rotate(-${wobbleIntensity * 0.5}deg); }
        }
        @keyframes float-up {
          0% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -30px); }
        }
        @keyframes pop-burst {
          0% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.5); opacity: 0.5; }
        }
        @keyframes fragment-fly {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx, 20px), var(--ty, -40px)) scale(0.2); }
        }
      `}</style>
    </div>
  );
};
