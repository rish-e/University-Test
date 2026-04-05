import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------
type Phase = 'intro' | 'watching' | 'pause' | 'recall' | 'feedback' | 'complete';

interface RoundConfig {
  gridSize: number;
  seqLength: number;
  showTime: number; // seconds the full sequence is shown (used for per-tile timing)
}

interface RoundRecord {
  round: number;
  correct: boolean;
  clickOrder: number[];         // indices player clicked
  correctOrder: number[];       // correct sequence
  clickTimesMs: number[];       // time between consecutive clicks
  totalTimeMs: number;          // total recall time
  errPosition: number | null;   // index in sequence where first error happened
}

const TOTAL_ROUNDS = 15;
const TILE_SHOW_MS = 300;   // per-tile highlight during watch
const PAUSE_MS = 500;

const ROUND_CONFIGS: RoundConfig[] = [
  // Rounds 1-3
  { gridSize: 3, seqLength: 3, showTime: 3 },
  { gridSize: 3, seqLength: 3, showTime: 3 },
  { gridSize: 3, seqLength: 3, showTime: 3 },
  // Rounds 4-6
  { gridSize: 4, seqLength: 4, showTime: 2.5 },
  { gridSize: 4, seqLength: 4, showTime: 2.5 },
  { gridSize: 4, seqLength: 4, showTime: 2.5 },
  // Rounds 7-9
  { gridSize: 4, seqLength: 5, showTime: 2 },
  { gridSize: 4, seqLength: 5, showTime: 2 },
  { gridSize: 4, seqLength: 5, showTime: 2 },
  // Rounds 10-12
  { gridSize: 5, seqLength: 6, showTime: 1.5 },
  { gridSize: 5, seqLength: 6, showTime: 1.5 },
  { gridSize: 5, seqLength: 6, showTime: 1.5 },
  // Rounds 13-15
  { gridSize: 5, seqLength: 7, showTime: 1 },
  { gridSize: 5, seqLength: 7, showTime: 1 },
  { gridSize: 5, seqLength: 7, showTime: 1 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick `count` unique random indices from [0, max) */
function pickUnique(max: number, count: number): number[] {
  const indices: number[] = [];
  const pool = Array.from({ length: max }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < count; i++) indices.push(pool[i]);
  return indices;
}

/** Detect encoding strategy (spatial clustering vs systematic L-to-R) */
function computeEncodingStrategy(
  clickOrder: number[],
  gridSize: number,
): number {
  if (clickOrder.length < 2) return 50;
  let leftToRight = 0;
  let spatial = 0;
  for (let i = 1; i < clickOrder.length; i++) {
    const prev = clickOrder[i - 1];
    const curr = clickOrder[i];
    // left-to-right: column of curr >= column of prev
    const prevCol = prev % gridSize;
    const currCol = curr % gridSize;
    if (currCol >= prevCol) leftToRight++;
    // spatial clustering: manhattan distance <= 2
    const prevRow = Math.floor(prev / gridSize);
    const currRow = Math.floor(curr / gridSize);
    const dist = Math.abs(currRow - prevRow) + Math.abs(currCol - prevCol);
    if (dist <= 2) spatial++;
  }
  const n = clickOrder.length - 1;
  // Higher value = more systematic (left-to-right), lower = more spatial clustering
  return Math.round(((leftToRight / n) * 0.5 + (1 - spatial / n) * 0.5) * 100);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const MemoryTiles: React.FC<GameComponentProps> = ({
  section,
  onComplete,
  onExit,
  onXPGain,
}) => {
  // Game state
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);        // current tile being shown
  const [playerClicks, setPlayerClicks] = useState<number[]>([]);
  const [correctTiles, setCorrectTiles] = useState<Set<number>>(new Set());
  const [wrongTile, setWrongTile] = useState<number | null>(null);
  const [showCorrectBriefly, setShowCorrectBriefly] = useState(false);
  const [records, setRecords] = useState<RoundRecord[]>([]);

  // Timing refs
  const gameStartRef = useRef(0);
  const recallStartRef = useRef(0);
  const lastClickRef = useRef(0);
  const clickTimesRef = useRef<number[]>([]);
  const animTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const config = ROUND_CONFIGS[round] ?? ROUND_CONFIGS[TOTAL_ROUNDS - 1];

  // ------- Cleanup timeouts on unmount -------
  useEffect(() => {
    return () => {
      animTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // ------- Start game -------
  const handleStart = useCallback(() => {
    gameStartRef.current = Date.now();
    setPhase('watching');
    startRound(0);
  }, []);

  // ------- Start a round -------
  const startRound = useCallback((roundIdx: number) => {
    // clear old timeouts
    animTimeoutsRef.current.forEach(clearTimeout);
    animTimeoutsRef.current = [];

    const cfg = ROUND_CONFIGS[roundIdx];
    const totalTiles = cfg.gridSize * cfg.gridSize;
    const seq = pickUnique(totalTiles, cfg.seqLength);

    setSequence(seq);
    setPlayerClicks([]);
    setCorrectTiles(new Set());
    setWrongTile(null);
    setShowCorrectBriefly(false);
    setHighlightIdx(-1);
    clickTimesRef.current = [];

    // Animate: show each tile one-by-one
    setPhase('watching');
    seq.forEach((tileIdx, i) => {
      const showTimeout = setTimeout(() => {
        setHighlightIdx(tileIdx);
      }, i * TILE_SHOW_MS);
      animTimeoutsRef.current.push(showTimeout);

      // Turn off highlight between tiles
      if (i < seq.length - 1) {
        const offTimeout = setTimeout(() => {
          setHighlightIdx(-1);
        }, i * TILE_SHOW_MS + TILE_SHOW_MS - 50);
        animTimeoutsRef.current.push(offTimeout);
      }
    });

    // After last tile shown, pause then recall
    const totalAnimMs = seq.length * TILE_SHOW_MS;
    const pauseTimeout = setTimeout(() => {
      setHighlightIdx(-1);
      setPhase('pause');
    }, totalAnimMs);
    animTimeoutsRef.current.push(pauseTimeout);

    const recallTimeout = setTimeout(() => {
      setPhase('recall');
      recallStartRef.current = Date.now();
      lastClickRef.current = Date.now();
    }, totalAnimMs + PAUSE_MS);
    animTimeoutsRef.current.push(recallTimeout);
  }, []);

  // ------- Handle tile click during recall -------
  const handleTileClick = useCallback((tileIdx: number) => {
    if (phase !== 'recall') return;
    // Ignore already-correct tiles
    if (correctTiles.has(tileIdx)) return;

    const clickPos = playerClicks.length;
    const now = Date.now();
    const timeSinceLast = now - lastClickRef.current;
    lastClickRef.current = now;
    clickTimesRef.current.push(timeSinceLast);

    const expectedTile = sequence[clickPos];
    const newClicks = [...playerClicks, tileIdx];
    setPlayerClicks(newClicks);

    if (tileIdx === expectedTile) {
      // Correct
      const newCorrect = new Set(correctTiles);
      newCorrect.add(tileIdx);
      setCorrectTiles(newCorrect);

      // XP for each correct tile
      onXPGain(5, 'correct tile');

      // Check if sequence complete
      if (newClicks.length === sequence.length) {
        // Round success
        setScore(prev => prev + 1);
        onXPGain(15, 'perfect round');

        const totalTimeMs = now - recallStartRef.current;
        const record: RoundRecord = {
          round,
          correct: true,
          clickOrder: newClicks,
          correctOrder: sequence,
          clickTimesMs: [...clickTimesRef.current],
          totalTimeMs,
          errPosition: null,
        };
        setRecords(prev => [...prev, record]);

        // Brief celebration then advance
        setPhase('feedback');
        const advanceTimeout = setTimeout(() => {
          if (round + 1 >= TOTAL_ROUNDS) {
            setPhase('complete');
          } else {
            const nextRound = round + 1;
            setRound(nextRound);
            startRound(nextRound);
          }
        }, 900);
        animTimeoutsRef.current.push(advanceTimeout);
      }
    } else {
      // Wrong
      setWrongTile(tileIdx);

      const totalTimeMs = now - recallStartRef.current;
      const record: RoundRecord = {
        round,
        correct: false,
        clickOrder: newClicks,
        correctOrder: sequence,
        clickTimesMs: [...clickTimesRef.current],
        totalTimeMs,
        errPosition: clickPos,
      };
      setRecords(prev => [...prev, record]);

      // Show correct sequence briefly, then advance
      setPhase('feedback');
      const showCorrectTimeout = setTimeout(() => {
        setWrongTile(null);
        setShowCorrectBriefly(true);
      }, 600);
      animTimeoutsRef.current.push(showCorrectTimeout);

      const advanceTimeout = setTimeout(() => {
        if (round + 1 >= TOTAL_ROUNDS) {
          setPhase('complete');
        } else {
          const nextRound = round + 1;
          setRound(nextRound);
          startRound(nextRound);
        }
      }, 2000);
      animTimeoutsRef.current.push(advanceTimeout);
    }
  }, [phase, playerClicks, sequence, correctTiles, round, onXPGain, startRound]);

  // ------- Compute final metrics & complete -------
  useEffect(() => {
    if (phase !== 'complete') return;

    const timeSpent = Math.round((Date.now() - gameStartRef.current) / 1000);
    const correctRounds = records.filter(r => r.correct).length;
    const normalizedScore = Math.round((correctRounds / TOTAL_ROUNDS) * 100);

    // Working memory capacity: max sequence length correctly recalled
    let maxSeqCorrect = 0;
    records.forEach(r => {
      if (r.correct) {
        const cfg = ROUND_CONFIGS[r.round];
        if (cfg.seqLength > maxSeqCorrect) maxSeqCorrect = cfg.seqLength;
      }
    });
    const workingMemoryCapacity = Math.round((maxSeqCorrect / 7) * 100);

    // Visual-spatial accuracy: % of rounds with perfect recall
    const visualSpatialAccuracy = Math.round((correctRounds / TOTAL_ROUNDS) * 100);

    // Encoding strategy: average across rounds
    const strategyScores = records.map(r =>
      computeEncodingStrategy(r.clickOrder, ROUND_CONFIGS[r.round].gridSize)
    );
    const encodingStrategy = strategyScores.length > 0
      ? Math.round(strategyScores.reduce((a, b) => a + b, 0) / strategyScores.length)
      : 50;

    // Response speed: avg time between clicks (lower = faster = higher score)
    const allClickTimes = records.flatMap(r => r.clickTimesMs);
    const avgClickTime = allClickTimes.length > 0
      ? allClickTimes.reduce((a, b) => a + b, 0) / allClickTimes.length
      : 1000;
    // Map: 200ms -> 100, 2000ms -> 0
    const responseSpeed = Math.max(0, Math.min(100, Math.round(100 - ((avgClickTime - 200) / 1800) * 100)));

    // Stress resilience: accuracy at high difficulty vs low difficulty
    const lowDiffRounds = records.filter(r => r.round < 6);
    const highDiffRounds = records.filter(r => r.round >= 9);
    const lowAcc = lowDiffRounds.length > 0
      ? lowDiffRounds.filter(r => r.correct).length / lowDiffRounds.length
      : 0;
    const highAcc = highDiffRounds.length > 0
      ? highDiffRounds.filter(r => r.correct).length / highDiffRounds.length
      : 0;
    // If high acc is close to low acc, resilience is high
    const stressResilience = lowAcc > 0
      ? Math.round(Math.min(100, (highAcc / lowAcc) * 100))
      : Math.round(highAcc * 100);

    // Consistency: inverse of variance in total recall time
    const roundTimes = records.map(r => r.totalTimeMs);
    const meanTime = roundTimes.length > 0
      ? roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length
      : 0;
    const variance = roundTimes.length > 1
      ? roundTimes.reduce((sum, t) => sum + Math.pow(t - meanTime, 2), 0) / roundTimes.length
      : 0;
    const stdDev = Math.sqrt(variance);
    // Map: 0 stdDev -> 100, 2000+ -> 0
    const consistency = Math.max(0, Math.min(100, Math.round(100 - (stdDev / 2000) * 100)));

    const result: GameResult = {
      score: Math.min(100, normalizedScore),
      rawScore: correctRounds,
      timeSpent,
      type: 'memory_tiles',
      metrics: {
        workingMemoryCapacity,
        visualSpatialAccuracy,
        encodingStrategy,
        responseSpeed,
        stressResilience,
        consistency,
      },
      data: { records },
    };
    onComplete(result);
  }, [phase, records, onComplete]);

  // ------- Exit handler -------
  const handleExit = useCallback(() => {
    const progress: AssessmentProgress = {
      step: round,
      correctCount: records.filter(r => r.correct).length,
      textInput: '',
      gameScore: score,
      simState: null,
    };
    onExit(progress);
  }, [round, records, score, onExit]);

  // ===================================================================
  // RENDER
  // ===================================================================

  // --- Intro ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Memory Tiles"
        description="Watch the tiles light up, then tap them back in the same order. How long a sequence can you remember?"
        icon="grid_view"
        duration="~5 min"
        rules={[
          'Tiles will light up one by one in a sequence.',
          'After a short pause, tap the tiles in the SAME order.',
          'Sequences get longer and grids get bigger each round.',
          'A correct sequence advances you. A wrong tap shows the answer.',
          '15 rounds total. Stay focused!'
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- Complete ---
  if (phase === 'complete') {
    const correctRounds = records.filter(r => r.correct).length;
    const pct = Math.round((correctRounds / TOTAL_ROUNDS) * 100);
    let maxSeq = 0;
    records.forEach(r => {
      if (r.correct) {
        const cfg = ROUND_CONFIGS[r.round];
        if (cfg.seqLength > maxSeq) maxSeq = cfg.seqLength;
      }
    });

    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary">emoji_events</span>
          </div>
          <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">Challenge Complete!</h2>
          <p className="text-text-muted mb-6">Memory Tiles finished</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs font-bold text-text-muted uppercase">Score</p>
              <p className="text-3xl font-black text-primary">{pct}%</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs font-bold text-text-muted uppercase">Correct</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{correctRounds}/{TOTAL_ROUNDS}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs font-bold text-text-muted uppercase">Max Seq</p>
              <p className="text-3xl font-black text-orange-500">{maxSeq}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Grid rendering (watching / pause / recall / feedback) ---
  const totalTiles = config.gridSize * config.gridSize;
  const isRecall = phase === 'recall';
  const isWatching = phase === 'watching';
  const isFeedback = phase === 'feedback';
  const isPause = phase === 'pause';

  // Determine tile size based on grid
  const tileSize = config.gridSize <= 3 ? 'w-20 h-20' : config.gridSize <= 4 ? 'w-16 h-16' : 'w-14 h-14';

  // Sequence position indicator
  const nextClickPos = playerClicks.length;

  return (
    <div className="max-w-2xl mx-auto mt-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i < round
                  ? 'bg-primary w-2'
                  : i === round
                  ? 'bg-primary w-4 animate-pulse'
                  : 'bg-gray-200 dark:bg-gray-700 w-2'
              }`}
            />
          ))}
          <span className="ml-2 text-xs font-bold text-text-muted tabular-nums">
            {round + 1}/{TOTAL_ROUNDS}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-primary/10 rounded-full">
            <span className="text-sm font-black text-primary">{score} correct</span>
          </div>
        </div>
      </div>

      {/* Phase label */}
      <div className="text-center mb-4">
        {isWatching && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-black animate-pulse">
            <span className="material-symbols-outlined text-base">visibility</span>
            Watch the sequence
          </div>
        )}
        {isPause && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-text-muted rounded-full text-sm font-bold">
            <span className="material-symbols-outlined text-base">hourglass_empty</span>
            Get ready...
          </div>
        )}
        {isRecall && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-black">
            <span className="material-symbols-outlined text-base">touch_app</span>
            Tap tile {nextClickPos + 1} of {sequence.length}
          </div>
        )}
        {isFeedback && wrongTile === null && !showCorrectBriefly && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-black">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Perfect!
          </div>
        )}
        {isFeedback && (wrongTile !== null || showCorrectBriefly) && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-black">
            <span className="material-symbols-outlined text-base">close</span>
            {showCorrectBriefly ? 'Here was the correct order' : 'Wrong tile!'}
          </div>
        )}
      </div>

      {/* Sequence length indicator */}
      <div className="flex justify-center gap-1.5 mb-4">
        {Array.from({ length: sequence.length }).map((_, i) => {
          let dotClass = 'w-3 h-3 rounded-full transition-all duration-200 ';
          if (i < playerClicks.length) {
            // Already clicked
            const wasCorrect = playerClicks[i] === sequence[i];
            dotClass += wasCorrect
              ? 'bg-green-400 scale-110'
              : 'bg-red-400 scale-110';
          } else if (i === playerClicks.length && isRecall) {
            dotClass += 'bg-blue-400 animate-pulse scale-125';
          } else {
            dotClass += 'bg-gray-300 dark:bg-gray-600';
          }
          return <div key={i} className={dotClass} />;
        })}
      </div>

      {/* Grid */}
      <div className="bg-card-bg dark:bg-card-bg-dark rounded-3xl p-6 sm:p-8 border border-text-main/5 dark:border-white/5">
        <div
          className="grid gap-3 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${config.gridSize}, 1fr)`,
            maxWidth: config.gridSize <= 3 ? 280 : config.gridSize <= 4 ? 320 : 380,
          }}
        >
          {Array.from({ length: totalTiles }).map((_, idx) => {
            // Determine tile state
            const isHighlighted = highlightIdx === idx;
            const isInSequence = sequence.includes(idx);
            const isCorrectClick = correctTiles.has(idx);
            const isWrong = wrongTile === idx;
            const seqPos = showCorrectBriefly && isInSequence ? sequence.indexOf(idx) : -1;

            let tileClass = `${tileSize} rounded-xl transition-all duration-200 relative flex items-center justify-center `;
            let extraStyle: React.CSSProperties = {};

            if (isHighlighted && isWatching) {
              // Watch phase: highlighted tile
              tileClass += 'bg-emerald-400 shadow-lg shadow-emerald-400/40 scale-110 border-2 border-emerald-300';
            } else if (isCorrectClick) {
              // Player got this one right
              tileClass += 'bg-green-400/80 border-2 border-green-300 shadow-md shadow-green-400/30 scale-105';
            } else if (isWrong) {
              // Player got this wrong
              tileClass += 'bg-red-400/80 border-2 border-red-300 shadow-md shadow-red-400/30 animate-[tileShake_0.4s_ease-in-out]';
            } else if (showCorrectBriefly && isInSequence) {
              // Showing correct sequence after error
              tileClass += 'bg-emerald-400/60 border-2 border-emerald-300/60 shadow-md shadow-emerald-400/20';
            } else if (isRecall) {
              // Recall: clickable tile
              tileClass += 'bg-gray-200 dark:bg-gray-700 border-2 border-transparent hover:border-blue-400/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer active:scale-95';
            } else {
              // Default / pause
              tileClass += 'bg-gray-200 dark:bg-gray-700 border-2 border-transparent';
            }

            return (
              <button
                key={`${round}-${idx}`}
                className={tileClass}
                style={extraStyle}
                disabled={!isRecall}
                onClick={() => handleTileClick(idx)}
              >
                {/* Show sequence number during correct-briefly phase */}
                {seqPos >= 0 && (
                  <span className="text-white font-black text-sm drop-shadow">
                    {seqPos + 1}
                  </span>
                )}
                {/* Show order number for correct clicks */}
                {isCorrectClick && (
                  <span className="text-white font-black text-sm drop-shadow">
                    {sequence.indexOf(idx) + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exit */}
      <button
        onClick={handleExit}
        className="mt-4 text-xs text-text-muted hover:text-text-main dark:hover:text-white transition-colors"
      >
        Save &amp; Exit
      </button>

      {/* Animations */}
      <style>{`
        @keyframes tileShake {
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

export default MemoryTiles;
