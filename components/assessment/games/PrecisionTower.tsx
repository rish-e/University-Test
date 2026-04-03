import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

type GamePhase = 'intro' | 'playing' | 'complete';

interface TowerBlock {
  id: number;
  accuracy: number;
  offset: number; // -50 to +50 from center
}

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
}

export const PrecisionTower: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [blocks, setBlocks] = useState<TowerBlock[]>([]);
  const [oscillatorPos, setOscillatorPos] = useState(50);
  const [oscillatorDir, setOscillatorDir] = useState(1);
  const [oscillatorSpeed, setOscillatorSpeed] = useState(1);
  const [lastPlacement, setLastPlacement] = useState<'perfect' | 'good' | 'miss' | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [crumbling, setCrumbling] = useState(false);
  const [ghostPos, setGhostPos] = useState(50);
  const requestRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const blockIdRef = useRef(0);
  const particleIdRef = useRef(0);

  const handleStart = () => {
    setPhase('playing');
    setScore(0);
    setTimeLeft(30);
    setBlocks([]);
    setOscillatorPos(50);
    setOscillatorDir(1);
    setOscillatorSpeed(1);
    startTimeRef.current = Date.now();
  };

  // Oscillator animation
  const animateOscillator = useCallback(() => {
    setOscillatorPos(prev => {
      let next = prev + (oscillatorSpeed * oscillatorDir * 1.5);
      if (next >= 100) {
        setOscillatorDir(-1);
        next = 100;
      } else if (next <= 0) {
        setOscillatorDir(1);
        next = 0;
      }
      setGhostPos(next);
      return next;
    });
    requestRef.current = requestAnimationFrame(animateOscillator);
  }, [oscillatorSpeed, oscillatorDir]);

  useEffect(() => {
    if (phase === 'playing') {
      requestRef.current = requestAnimationFrame(animateOscillator);
      return () => {
        if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      };
    }
  }, [phase, animateOscillator]);

  // Game timer
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

  // Spawn particles for successful placement
  const spawnParticles = (x: number) => {
    const newParticles: Particle[] = [];
    const colors = ['#00e640', '#00d64b', '#fbbf24', '#60a5fa', '#f472b6'];
    for (let i = 0; i < 7; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: x,
        y: 0,
        dx: (Math.random() - 0.5) * 8,
        dy: -(Math.random() * 4 + 2),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  };

  const handleTowerClick = () => {
    if (phase !== 'playing' || crumbling) return;

    const centerDist = Math.abs(oscillatorPos - 50);
    const accuracy = Math.max(0, 100 - (centerDist * 2));
    const offset = oscillatorPos - 50;

    if (accuracy > 20) {
      const id = blockIdRef.current++;
      const newBlock: TowerBlock = { id, accuracy, offset: offset * 0.4 };
      setBlocks(prev => [...prev, newBlock]);

      const points = Math.round(accuracy);
      setScore(s => s + points);
      onXPGain(points, accuracy > 95 ? 'Perfect placement!' : 'Block placed');

      // Increase speed
      setOscillatorSpeed(s => Math.min(5, s + 0.15));

      if (accuracy > 95) {
        setLastPlacement('perfect');
        spawnParticles(50 + offset * 0.4);
      } else {
        setLastPlacement('good');
      }
    } else {
      // Miss - crumble
      setLastPlacement('miss');
      setCrumbling(true);
      setTimeout(() => {
        setBlocks(prev => prev.slice(0, Math.max(0, prev.length - 2)));
        setCrumbling(false);
      }, 500);
    }

    setTimeout(() => setLastPlacement(null), 800);
  };

  const handleFinish = () => {
    const normalized = Math.min(100, score * 2);
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      score: normalized,
      rawScore: score,
      timeSpent,
      metrics: {
        blocksPlaced: blocks.length,
        maxHeight: blocks.length,
        avgAccuracy: blocks.length > 0 ? Math.round(blocks.reduce((a, b) => a + b.accuracy, 0) / blocks.length) : 0,
      },
      type: 'game',
    };
    onComplete(result);
  };

  const handleGameExit = () => {
    const progress: AssessmentProgress = {
      step: blocks.length,
      correctCount: blocks.length,
      textInput: '',
      gameScore: score,
      simState: null,
    };
    onExit(progress);
  };

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Precision Tower"
        description="Time your taps to stack blocks perfectly. Build the tallest tower before time runs out!"
        icon="foundation"
        duration="30 seconds"
        rules={[
          'Watch the oscillating bar move across the track.',
          'Tap when the bar is in the green center zone to place a block.',
          'The closer to center, the more points you earn.',
          'Speed increases as you stack more blocks.',
          'Missing the zone causes blocks to crumble!',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const normalized = Math.min(100, score * 2);
    const avgAcc = blocks.length > 0 ? Math.round(blocks.reduce((a, b) => a + b.accuracy, 0) / blocks.length) : 0;
    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">domain</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">Tower Built!</h2>
          <p className="text-text-muted mb-8">Your construction results</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Score</p>
              <p className="text-3xl font-black text-primary">{normalized}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Height</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{blocks.length}m</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Avg Acc</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{avgAcc}%</p>
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
  const speedPercent = Math.round((oscillatorSpeed / 5) * 100);

  return (
    <div className="max-w-2xl mx-auto mt-6 animate-[fadeIn_0.2s_ease-out]">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          <button onClick={handleGameExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="text-2xl font-black text-text-main dark:text-white">{score}</span>
            <span className="text-xs text-text-muted ml-1">pts</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="material-symbols-outlined text-sm">speed</span>
          {speedPercent}%
        </div>

        <div className={`font-mono font-bold text-xl ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-text-main dark:text-white'}`}>
          {timeLeft}s
        </div>
      </div>

      {/* Game Area with 3D perspective */}
      <div
        className="bg-card-bg dark:bg-card-bg-dark rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 overflow-hidden"
        style={{ perspective: '800px' }}
      >
        {/* Oscillator Track */}
        <div className="p-6 pb-0">
          <div className="relative w-full h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
            {/* Green zone */}
            <div className="absolute left-1/2 -translate-x-1/2 w-[20%] h-full bg-green-500/20 border-l-2 border-r-2 border-green-500/30" />
            {/* Center marker */}
            <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-green-500/50" />
            {/* Moving bar */}
            <div
              className="absolute top-0 bottom-0 w-[4%] rounded-full bg-text-main dark:bg-white shadow-lg"
              style={{ left: `${Math.max(0, Math.min(96, oscillatorPos))}%`, transition: 'none' }}
            />
          </div>
          <div className="text-center text-sm font-bold text-text-muted mb-4">
            Height: {blocks.length}m
          </div>
        </div>

        {/* Tower Container */}
        <div
          className="h-80 flex flex-col justify-end items-center relative overflow-hidden px-6 pb-6"
          style={{ transform: 'rotateX(5deg)', transformOrigin: 'bottom center' }}
        >
          {/* Placement feedback */}
          {lastPlacement === 'perfect' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-lg font-black text-green-500 animate-[float-up_0.8s_ease-out_forwards]">
              Perfect!
            </div>
          )}
          {lastPlacement === 'miss' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-lg font-black text-red-500 animate-[float-up_0.8s_ease-out_forwards]">
              Miss!
            </div>
          )}

          {/* Particles */}
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute z-30 size-2 rounded-full animate-[particle-burst_0.8s_ease-out_forwards]"
              style={{
                backgroundColor: p.color,
                left: `calc(50% + ${p.dx * 15}px)`,
                bottom: `${20 + blocks.length * 24}px`,
                '--dx': `${p.dx * 30}px`,
                '--dy': `${p.dy * 20}px`,
              } as React.CSSProperties}
            />
          ))}

          {/* Ghost outline preview */}
          <div className="absolute z-10 w-full flex justify-center" style={{ bottom: `${20 + blocks.length * 24}px` }}>
            <div
              className="w-24 h-6 border-2 border-dashed border-primary/30 rounded-sm"
              style={{ transform: `translateX(${(ghostPos - 50) * 0.4}px)`, transition: 'none' }}
            />
          </div>

          {/* Tower blocks */}
          <div className="flex flex-col-reverse items-center gap-0 w-full relative z-10">
            {blocks.map((block, i) => {
              const isTopBlock = i === blocks.length - 1;
              const isCrumbleTarget = crumbling && i >= blocks.length - 2;
              const hue = Math.min(120, block.accuracy * 1.2); // green for accurate, yellow for less
              const gradientStart = `hsl(${hue}, 80%, 55%)`;
              const gradientEnd = `hsl(${hue}, 80%, 45%)`;

              return (
                <div
                  key={block.id}
                  className={`w-24 h-6 rounded-sm shadow-md transition-all duration-200 ${
                    isCrumbleTarget ? 'animate-[crumble_0.5s_ease-in_forwards]' : ''
                  } ${isTopBlock && !crumbling ? 'animate-[block-place_0.15s_ease-out]' : ''}`}
                  style={{
                    background: `linear-gradient(180deg, ${gradientStart}, ${gradientEnd})`,
                    transform: `translateX(${block.offset}px)`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                />
              );
            })}
            {/* Base platform */}
            <div className="w-36 h-3 bg-gray-400 dark:bg-gray-600 rounded-full shadow-inner" />
          </div>
        </div>
      </div>

      {/* Tap Button */}
      <div className="flex justify-center mt-6">
        <button
          onMouseDown={handleTowerClick}
          onTouchStart={(e) => { e.preventDefault(); handleTowerClick(); }}
          className="size-28 rounded-full bg-primary hover:scale-105 active:scale-90 shadow-xl flex items-center justify-center border-4 border-white dark:border-gray-800 transition-transform"
          style={{ boxShadow: '0 8px 30px rgba(0, 230, 64, 0.3)' }}
        >
          <span className="material-symbols-outlined text-5xl text-black">touch_app</span>
        </button>
      </div>

      <style>{`
        @keyframes float-up {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -30px) scale(1.3); }
        }
        @keyframes crumble {
          0% { opacity: 1; transform: translateX(var(--tx, 0)) scale(1); }
          50% { opacity: 0.5; transform: translateX(var(--tx, 0)) scale(0.8) rotate(5deg); }
          100% { opacity: 0; transform: translateX(var(--tx, 0)) translateY(40px) scale(0.3) rotate(15deg); }
        }
        @keyframes block-place {
          0% { opacity: 0; transform: translateX(var(--tx, 0)) translateY(-10px) scale(1.1); }
          100% { opacity: 1; transform: translateX(var(--tx, 0)) translateY(0) scale(1); }
        }
        @keyframes particle-burst {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--dx, 20px), var(--dy, -30px)) scale(0.3); }
        }
      `}</style>
    </div>
  );
};
