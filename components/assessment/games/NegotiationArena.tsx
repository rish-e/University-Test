import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

type GamePhase = 'intro' | 'choosing' | 'reveal' | 'complete';

const TOTAL_ROUNDS = 12;
const CHOOSE_TIME = 15;

// Payoff matrix: [playerChoice][aiChoice] => [playerEarning, aiEarning]
const PAYOFFS: Record<string, Record<string, [number, number]>> = {
  HIGH: { HIGH: [8, 8], LOW: [3, 10] },
  LOW:  { HIGH: [10, 3], LOW: [5, 5] },
};

type Choice = 'HIGH' | 'LOW';

interface RoundRecord {
  round: number;
  playerChoice: Choice;
  aiChoice: Choice;
  playerEarning: number;
  aiEarning: number;
}

// ============================================
// AI Strategy Engine
// ============================================
function getAIChoice(
  roundNum: number,
  history: RoundRecord[],
): Choice {
  if (history.length === 0) return 'HIGH'; // First round: cooperate

  const lastMove = history[history.length - 1].playerChoice;
  const last3 = history.slice(-3);
  const cooperateCount3 = last3.filter(r => r.playerChoice === 'HIGH').length;
  const totalCoopRate = history.filter(r => r.playerChoice === 'HIGH').length / history.length;

  // Rounds 1-3: Tit-for-Tat
  if (roundNum <= 3) {
    return lastMove;
  }

  // Rounds 4-6: Stricter — cooperate only if 2 of last 3 were cooperative
  if (roundNum <= 6) {
    return cooperateCount3 >= 2 ? 'HIGH' : 'LOW';
  }

  // Rounds 7-9: Exploit always-cooperators
  if (roundNum <= 9) {
    if (totalCoopRate > 0.85) return 'LOW'; // exploit
    return cooperateCount3 >= 2 ? 'HIGH' : 'LOW';
  }

  // Rounds 10-12: Based on overall cooperation rate
  if (totalCoopRate >= 0.6) return 'HIGH';
  if (totalCoopRate <= 0.3) return 'LOW';
  // Middle ground: match their last move
  return lastMove;
}

// AI mood based on recent outcomes
function getAIMood(history: RoundRecord[]): { emoji: string; label: string; color: string } {
  if (history.length === 0) return { emoji: '\ud83d\ude10', label: 'Neutral', color: '#9ca3af' };
  const last3 = history.slice(-3);
  const aiAvg = last3.reduce((s, r) => s + r.aiEarning, 0) / last3.length;
  const playerCooped = last3.filter(r => r.playerChoice === 'HIGH').length;

  if (aiAvg >= 8) return { emoji: '\ud83d\ude0f', label: 'Smug', color: '#eab308' };
  if (playerCooped >= 2 && aiAvg >= 6) return { emoji: '\ud83d\ude04', label: 'Happy', color: '#22c55e' };
  if (aiAvg <= 4) return { emoji: '\ud83d\ude20', label: 'Frustrated', color: '#ef4444' };
  if (playerCooped === 0) return { emoji: '\ud83d\ude24', label: 'Stern', color: '#f97316' };
  return { emoji: '\ud83e\udd14', label: 'Calculating', color: '#3b82f6' };
}

// ============================================
// NegotiationArena Component
// ============================================
export const NegotiationArena: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [roundNum, setRoundNum] = useState(1);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [aiTotal, setAiTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CHOOSE_TIME);
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [aiChoice, setAiChoice] = useState<Choice | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [earningAnim, setEarningAnim] = useState<{ player: number; ai: number } | null>(null);
  const [hoverChoice, setHoverChoice] = useState<Choice | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  // Tracking refs
  const choiceTimestamps = useRef<number[]>([]);
  const roundStartTime = useRef(0);

  const handleStart = () => {
    setPhase('choosing');
    startTimeRef.current = Date.now();
    roundStartTime.current = Date.now();
    setTimeLeft(CHOOSE_TIME);
  };

  // Timer for choosing phase
  useEffect(() => {
    if (phase !== 'choosing') return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-choose HIGH if time runs out (cooperative default)
          handlePlayerChoice('HIGH');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, roundNum]);

  const handlePlayerChoice = useCallback((choice: Choice) => {
    if (phase !== 'choosing' || playerChoice !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const now = Date.now();
    choiceTimestamps.current.push(now - roundStartTime.current);

    setPlayerChoice(choice);
    const ai = getAIChoice(roundNum, history);
    setAiChoice(ai);

    // Start reveal animation
    setPhase('reveal');
    setTimeout(() => setCardFlipped(true), 400);

    // Calculate earnings after card flip
    setTimeout(() => {
      const [pEarn, aEarn] = PAYOFFS[choice][ai];
      setEarningAnim({ player: pEarn, ai: aEarn });
      setShowResult(true);

      setPlayerTotal(prev => prev + pEarn);
      setAiTotal(prev => prev + aEarn);

      const record: RoundRecord = {
        round: roundNum,
        playerChoice: choice,
        aiChoice: ai,
        playerEarning: pEarn,
        aiEarning: aEarn,
      };
      setHistory(prev => [...prev, record]);

      if (choice === 'HIGH' && ai === 'HIGH') {
        onXPGain(8, 'Mutual cooperation');
      } else if (choice === 'LOW' && ai === 'HIGH') {
        onXPGain(5, 'Strategic advantage');
      } else {
        onXPGain(3, 'Round complete');
      }
    }, 1200);
  }, [phase, playerChoice, roundNum, history, onXPGain]);

  const handleNextRound = useCallback(() => {
    if (roundNum >= TOTAL_ROUNDS) {
      setPhase('complete');
      return;
    }
    setRoundNum(prev => prev + 1);
    setPlayerChoice(null);
    setAiChoice(null);
    setShowResult(false);
    setCardFlipped(false);
    setEarningAnim(null);
    setTimeLeft(CHOOSE_TIME);
    setPhase('choosing');
    roundStartTime.current = Date.now();
  }, [roundNum]);

  // --- Behavioral metrics ---
  const computeMetrics = useCallback(() => {
    const h = history;
    if (h.length === 0) {
      return {
        cooperationRate: 50,
        trustLevel: 50,
        retaliationSpeed: 50,
        forgiveness: 50,
        strategicConsistency: 50,
        competitiveInstinct: 50,
        negotiationStyle: 'Unpredictable',
      };
    }

    // Cooperation rate
    const coopCount = h.filter(r => r.playerChoice === 'HIGH').length;
    const cooperationRate = Math.round((coopCount / h.length) * 100);

    // Trust level: cooperated after AI cooperated
    let trustOps = 0;
    let trustHits = 0;
    for (let i = 1; i < h.length; i++) {
      if (h[i - 1].aiChoice === 'HIGH') {
        trustOps++;
        if (h[i].playerChoice === 'HIGH') trustHits++;
      }
    }
    const trustLevel = trustOps > 0 ? Math.round((trustHits / trustOps) * 100) : 50;

    // Retaliation speed: how quickly they punish AI defection
    let retaliations = 0;
    let defectionOps = 0;
    for (let i = 1; i < h.length; i++) {
      if (h[i - 1].aiChoice === 'LOW') {
        defectionOps++;
        if (h[i].playerChoice === 'LOW') retaliations++;
      }
    }
    const retaliationSpeed = defectionOps > 0 ? Math.round((retaliations / defectionOps) * 100) : 0;

    // Forgiveness: returned to cooperation after AI defected
    let forgivenessOps = 0;
    let forgivenessHits = 0;
    for (let i = 2; i < h.length; i++) {
      if (h[i - 1].aiChoice === 'LOW' && h[i - 1].playerChoice === 'LOW') {
        // Player retaliated — did they then forgive?
        forgivenessOps++;
        if (h[i].playerChoice === 'HIGH') forgivenessHits++;
      }
    }
    const forgiveness = forgivenessOps > 0 ? Math.round((forgivenessHits / forgivenessOps) * 100) : 50;

    // Strategic consistency: how much they stick to a pattern
    let switches = 0;
    for (let i = 1; i < h.length; i++) {
      if (h[i].playerChoice !== h[i - 1].playerChoice) switches++;
    }
    const switchRate = h.length > 1 ? switches / (h.length - 1) : 0;
    const strategicConsistency = Math.round((1 - switchRate) * 100);

    // Competitive instinct: chose LOW when winning
    let compOps = 0;
    let compHits = 0;
    let runningPlayer = 0;
    let runningAI = 0;
    for (const r of h) {
      if (runningPlayer > runningAI) {
        compOps++;
        if (r.playerChoice === 'LOW') compHits++;
      }
      runningPlayer += r.playerEarning;
      runningAI += r.aiEarning;
    }
    const competitiveInstinct = compOps > 0 ? Math.round((compHits / compOps) * 100) : 50;

    // Negotiation style classification
    let negotiationStyle = 'Unpredictable';
    // Mirror check for Tit-for-Tat
    let mirrorCount = 0;
    for (let i = 1; i < h.length; i++) {
      if (h[i].playerChoice === h[i - 1].aiChoice) mirrorCount++;
    }
    const mirrorRate = h.length > 1 ? mirrorCount / (h.length - 1) : 0;

    if (cooperationRate >= 80) {
      // Check if pushover (cooperated even after being exploited)
      let exploitedAndStayed = 0;
      let exploited = 0;
      for (let i = 1; i < h.length; i++) {
        if (h[i - 1].playerChoice === 'HIGH' && h[i - 1].aiChoice === 'LOW') {
          exploited++;
          if (h[i].playerChoice === 'HIGH') exploitedAndStayed++;
        }
      }
      if (exploited > 0 && exploitedAndStayed / exploited > 0.7) {
        negotiationStyle = 'Pushover';
      } else {
        negotiationStyle = 'Cooperator';
      }
    } else if (cooperationRate <= 20) {
      negotiationStyle = 'Competitor';
    } else if (mirrorRate >= 0.65) {
      negotiationStyle = 'Tit-for-Tat Strategist';
    } else if (strategicConsistency < 30) {
      negotiationStyle = 'Unpredictable';
    }

    return {
      cooperationRate,
      trustLevel,
      retaliationSpeed,
      forgiveness,
      strategicConsistency,
      competitiveInstinct,
      negotiationStyle,
    };
  }, [history]);

  const handleFinish = () => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const maxPossible = TOTAL_ROUNDS * 10; // max $10 per round
    const score = Math.round((playerTotal / maxPossible) * 100);
    const metrics = computeMetrics();

    const result: GameResult = {
      score: Math.min(100, score),
      rawScore: playerTotal,
      timeSpent,
      metrics: {
        cooperationRate: metrics.cooperationRate,
        trustLevel: metrics.trustLevel,
        retaliationSpeed: metrics.retaliationSpeed,
        forgiveness: metrics.forgiveness,
        strategicConsistency: metrics.strategicConsistency,
        competitiveInstinct: metrics.competitiveInstinct,
      },
      type: 'game',
      data: {
        profile: metrics,
        playerTotal,
        aiTotal,
        history,
        negotiationStyle: metrics.negotiationStyle,
      },
    };
    onComplete(result);
  };

  const handleGameExit = () => {
    const progress: AssessmentProgress = {
      step: roundNum,
      correctCount: history.filter(r => r.playerEarning >= 8).length,
      textInput: '',
      gameScore: playerTotal,
      simState: null,
    };
    onExit(progress);
  };

  const aiMood = getAIMood(history);

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Negotiation Arena"
        description="You and an AI rival both sell the same product. Each round, set your price strategy. Will you cooperate for steady gains or compete for dominance?"
        icon="handshake"
        duration="~5 minutes (12 rounds)"
        rules={[
          'Each round, choose HIGH ($10) or LOW ($6) price.',
          'If both choose HIGH, you each earn $8 (cooperation).',
          'If you go LOW while they go HIGH, you earn $10 (advantage).',
          'If both go LOW, you each earn only $5 (price war).',
          'Maximize your total earnings across 12 rounds.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const metrics = computeMetrics();
    const playerWon = playerTotal > aiTotal;
    const tied = playerTotal === aiTotal;

    // Style descriptions
    const styleDescriptions: Record<string, string> = {
      'Cooperator': 'You build trust and seek mutual benefit. You believe the best outcomes come from working together.',
      'Competitor': 'You play to win. You\'re not afraid to take an aggressive stance to maximize your advantage.',
      'Tit-for-Tat Strategist': 'You believe in fairness and reciprocity. You cooperate with cooperators and punish defectors.',
      'Unpredictable': 'Your moves are hard to read. You keep opponents guessing, which can be a strategic advantage.',
      'Pushover': 'You prioritize harmony over personal gain. You cooperate even when it costs you.',
    };

    return (
      <div className="max-w-xl mx-auto mt-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: playerWon ? 'linear-gradient(135deg, #22c55e, #3b82f6)' : tied ? 'linear-gradient(135deg, #eab308, #f97316)' : 'linear-gradient(135deg, #ef4444, #f97316)' }}>
            <span className="material-symbols-outlined text-5xl text-white">{playerWon ? 'emoji_events' : tied ? 'balance' : 'trending_down'}</span>
          </div>

          <h2 className="text-3xl font-black text-text-main dark:text-white mb-1">
            {playerWon ? 'Victory!' : tied ? 'Draw!' : 'Defeated'}
          </h2>
          <p className="text-text-muted mb-6">12 rounds of strategic pricing</p>

          {/* Earnings Comparison */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 rounded-xl p-5" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold mb-1">You</p>
              <p className="text-4xl font-black text-green-600 dark:text-green-400">${playerTotal}</p>
            </div>
            <div className="flex items-center text-text-muted font-bold">vs</div>
            <div className="flex-1 rounded-xl p-5" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs text-red-600 dark:text-red-400 uppercase font-bold mb-1">AI</p>
              <p className="text-4xl font-black text-red-600 dark:text-red-400">${aiTotal}</p>
            </div>
          </div>

          {/* Round Timeline */}
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Round-by-round</p>
            <div className="flex items-center justify-center gap-1">
              {history.map((r, i) => (
                <div key={i} className="flex flex-col items-center gap-1" title={`R${r.round}: You ${r.playerChoice}, AI ${r.aiChoice}`}>
                  <div
                    className="size-5 rounded-full transition-all"
                    style={{
                      background: r.playerChoice === 'HIGH' ? '#22c55e' : '#ef4444',
                      boxShadow: r.playerChoice === r.aiChoice ? 'none' : `0 0 4px ${r.playerChoice === 'HIGH' ? '#22c55e' : '#ef4444'}`,
                    }}
                  />
                  <div
                    className="size-5 rounded-full"
                    style={{ background: r.aiChoice === 'HIGH' ? '#22c55e' : '#ef4444' }}
                  />
                  <span className="text-[8px] text-text-muted">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-text-muted">
                <div className="size-2 rounded-full bg-green-500" /> HIGH
              </div>
              <div className="flex items-center gap-1 text-[10px] text-text-muted">
                <div className="size-2 rounded-full bg-red-500" /> LOW
              </div>
            </div>
          </div>

          {/* Negotiation Style */}
          <div className="rounded-xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(168,85,247,0.1))', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p className="text-xs text-blue-500 uppercase font-bold mb-2">Your Negotiation Style</p>
            <p className="text-2xl font-black text-text-main dark:text-white mb-2">{metrics.negotiationStyle}</p>
            <p className="text-sm text-text-muted">{styleDescriptions[metrics.negotiationStyle] || 'A unique approach to competition.'}</p>
          </div>

          <p className="text-xs text-text-muted mb-6 italic">Your approach reveals how you navigate competition and cooperation.</p>

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

  // --- CHOOSING / REVEAL ---
  const isRevealing = phase === 'reveal';
  const lastRound = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className="max-w-4xl mx-auto mt-4 animate-[fadeIn_0.2s_ease-out]">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <button onClick={handleGameExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="text-xs text-text-muted">Round</span>
            <p className="text-2xl font-black text-text-main dark:text-white">{roundNum}<span className="text-sm text-text-muted font-normal">/{TOTAL_ROUNDS}</span></p>
          </div>
        </div>

        {/* Earnings */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-[10px] text-green-600 dark:text-green-400 uppercase font-bold">You</span>
            <p className="text-xl font-black text-green-600 dark:text-green-400">${playerTotal}</p>
          </div>
          <div className="text-text-muted text-sm font-bold">vs</div>
          <div className="text-center">
            <span className="text-[10px] text-red-600 dark:text-red-400 uppercase font-bold">AI</span>
            <p className="text-xl font-black text-red-600 dark:text-red-400">${aiTotal}</p>
          </div>
        </div>

        {/* Timer */}
        {phase === 'choosing' && (
          <div className={`font-mono font-bold text-xl ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-text-main dark:text-white'}`}>
            0:{timeLeft.toString().padStart(2, '0')}
          </div>
        )}
        {phase === 'reveal' && (
          <div className="text-text-muted text-sm font-bold">Revealing...</div>
        )}
      </div>

      <div className="flex gap-4">
        {/* Main Arena */}
        <div className="flex-1 bg-card-bg dark:bg-card-bg-dark rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 overflow-hidden">
          {/* Payoff Matrix (always visible) */}
          <div className="mx-6 mt-6 rounded-xl p-3 bg-background-light dark:bg-white/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 text-center">Payoff Matrix</p>
            <div className="grid grid-cols-3 gap-0 text-center text-xs">
              <div />
              <div className="font-bold text-red-500 pb-1">AI: HIGH</div>
              <div className="font-bold text-red-500 pb-1">AI: LOW</div>

              <div className="font-bold text-green-600 dark:text-green-400 pr-2 text-right">You: HIGH</div>
              <div className={`py-1 rounded-l-lg ${hoverChoice === 'HIGH' ? 'bg-green-500/10' : ''}`}>
                <span className="text-green-600 dark:text-green-400 font-bold">$8</span> / <span className="text-red-500 font-bold">$8</span>
              </div>
              <div className={`py-1 rounded-r-lg ${hoverChoice === 'HIGH' ? 'bg-green-500/10' : ''}`}>
                <span className="text-green-600 dark:text-green-400 font-bold">$3</span> / <span className="text-red-500 font-bold">$10</span>
              </div>

              <div className="font-bold text-green-600 dark:text-green-400 pr-2 text-right">You: LOW</div>
              <div className={`py-1 rounded-l-lg ${hoverChoice === 'LOW' ? 'bg-red-500/10' : ''}`}>
                <span className="text-green-600 dark:text-green-400 font-bold">$10</span> / <span className="text-red-500 font-bold">$3</span>
              </div>
              <div className={`py-1 rounded-r-lg ${hoverChoice === 'LOW' ? 'bg-red-500/10' : ''}`}>
                <span className="text-green-600 dark:text-green-400 font-bold">$5</span> / <span className="text-red-500 font-bold">$5</span>
              </div>
            </div>
          </div>

          {/* Choice Area */}
          <div className="px-6 py-8">
            {/* Split screen cards */}
            <div className="flex items-center justify-center gap-8">
              {/* Player Card */}
              <div className="flex-1 max-w-[200px]">
                <p className="text-center text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-3">Your Choice</p>
                <div
                  className="h-28 rounded-2xl flex items-center justify-center transition-all duration-500"
                  style={{
                    background: playerChoice
                      ? playerChoice === 'HIGH'
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                    border: playerChoice ? 'none' : '2px dashed rgba(34,197,94,0.3)',
                    boxShadow: playerChoice ? `0 8px 30px ${playerChoice === 'HIGH' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` : 'none',
                  }}
                >
                  {playerChoice ? (
                    <div className="text-center animate-[fadeIn_0.3s_ease-out]">
                      <p className="text-white font-black text-xl">{playerChoice === 'HIGH' ? '$10' : '$6'}</p>
                      <p className="text-white/70 text-xs font-bold">{playerChoice} PRICE</p>
                    </div>
                  ) : (
                    <p className="text-green-600/40 dark:text-green-400/40 text-sm font-bold">Waiting...</p>
                  )}
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center gap-2">
                <div className="size-12 rounded-full bg-background-light dark:bg-white/5 flex items-center justify-center">
                  <span className="text-text-muted font-black text-lg">VS</span>
                </div>
              </div>

              {/* AI Card */}
              <div className="flex-1 max-w-[200px]">
                <p className="text-center text-xs font-bold text-red-500 uppercase mb-3">AI Choice</p>
                <div
                  className={`h-28 rounded-2xl flex items-center justify-center transition-all duration-500 ${cardFlipped ? '' : ''}`}
                  style={{
                    background: cardFlipped && aiChoice
                      ? aiChoice === 'HIGH'
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                    border: cardFlipped ? 'none' : '2px dashed rgba(239,68,68,0.3)',
                    boxShadow: cardFlipped && aiChoice ? `0 8px 30px ${aiChoice === 'HIGH' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` : 'none',
                    transform: !cardFlipped && isRevealing ? 'rotateY(90deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.4s ease-in-out, background 0.3s, box-shadow 0.3s',
                  }}
                >
                  {cardFlipped && aiChoice ? (
                    <div className="text-center animate-[fadeIn_0.3s_ease-out]">
                      <p className="text-white font-black text-xl">{aiChoice === 'HIGH' ? '$10' : '$6'}</p>
                      <p className="text-white/70 text-xs font-bold">{aiChoice} PRICE</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-4xl mb-1">{isRevealing ? '\ud83c\udfb4' : '\u2753'}</p>
                      <p className="text-red-500/40 text-xs font-bold">{isRevealing ? 'Flipping...' : 'Hidden'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Earning result */}
            {showResult && earningAnim && (
              <div className="mt-6 text-center animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-green-600 dark:text-green-400">
                    <span className="text-sm font-bold">You earned</span>
                    <p className="text-3xl font-black">${earningAnim.player}</p>
                  </div>
                  <div className="w-px h-12 bg-text-main/10 dark:bg-white/10" />
                  <div className="text-red-500">
                    <span className="text-sm font-bold">AI earned</span>
                    <p className="text-3xl font-black">${earningAnim.ai}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-6">
            {phase === 'choosing' && playerChoice === null ? (
              <div className="flex gap-4">
                <button
                  onClick={() => handlePlayerChoice('HIGH')}
                  onMouseEnter={() => setHoverChoice('HIGH')}
                  onMouseLeave={() => setHoverChoice(null)}
                  className="flex-1 py-5 rounded-2xl font-black text-lg transition-all active:scale-[0.97] hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: 'white',
                    boxShadow: hoverChoice === 'HIGH' ? '0 8px 30px rgba(34,197,94,0.4)' : '0 4px 12px rgba(34,197,94,0.2)',
                  }}
                >
                  <span className="block text-2xl mb-1">$10</span>
                  <span className="text-sm opacity-80">HIGH PRICE</span>
                </button>
                <button
                  onClick={() => handlePlayerChoice('LOW')}
                  onMouseEnter={() => setHoverChoice('LOW')}
                  onMouseLeave={() => setHoverChoice(null)}
                  className="flex-1 py-5 rounded-2xl font-black text-lg transition-all active:scale-[0.97] hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    boxShadow: hoverChoice === 'LOW' ? '0 8px 30px rgba(239,68,68,0.4)' : '0 4px 12px rgba(239,68,68,0.2)',
                  }}
                >
                  <span className="block text-2xl mb-1">$6</span>
                  <span className="text-sm opacity-80">LOW PRICE</span>
                </button>
              </div>
            ) : showResult ? (
              <button
                onClick={handleNextRound}
                className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                {roundNum >= TOTAL_ROUNDS ? 'See Results' : `Next Round (${roundNum + 1}/${TOTAL_ROUNDS})`}
              </button>
            ) : (
              <div className="text-center text-text-muted py-4">
                <span className="material-symbols-outlined animate-spin text-2xl">hourglass_top</span>
                <p className="text-sm mt-1">Revealing choices...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-52 flex flex-col gap-4 shrink-0">
          {/* AI Personality */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">AI Opponent</p>
            <div className="text-5xl mb-1">{aiMood.emoji}</div>
            <p className="text-sm font-bold" style={{ color: aiMood.color }}>{aiMood.label}</p>
          </div>

          {/* Round History */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-4 flex-1 max-h-[360px] overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">History</p>
            {history.length === 0 && (
              <p className="text-xs text-text-muted italic">No rounds yet</p>
            )}
            {history.map((r, i) => (
              <div key={i} className="mb-2 pb-2 border-b border-black/5 dark:border-white/5 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-text-muted font-bold">R{r.round}</span>
                  <span className="text-[10px] text-text-muted">
                    +${r.playerEarning}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: r.playerChoice === 'HIGH' ? '#22c55e' : '#ef4444' }}
                  >
                    {r.playerChoice}
                  </div>
                  <span className="text-[9px] text-text-muted">vs</span>
                  <div
                    className="flex-1 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: r.aiChoice === 'HIGH' ? '#22c55e' : '#ef4444' }}
                  >
                    {r.aiChoice}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Progress</p>
            <div className="flex gap-[3px]">
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
                const r = history[i];
                let bg = 'rgba(128,128,128,0.2)';
                if (r) {
                  if (r.playerChoice === 'HIGH' && r.aiChoice === 'HIGH') bg = '#22c55e'; // mutual coop
                  else if (r.playerChoice === 'LOW' && r.aiChoice === 'HIGH') bg = '#eab308'; // took advantage
                  else if (r.playerChoice === 'HIGH' && r.aiChoice === 'LOW') bg = '#f97316'; // got exploited
                  else bg = '#ef4444'; // mutual defect
                }
                return (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-full transition-all"
                    style={{ background: bg }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-text-muted">1</span>
              <span className="text-[9px] text-text-muted">{TOTAL_ROUNDS}</span>
            </div>
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
