import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

// --- Types ---

interface RoundRecord {
  round: number;
  sent: number;
  received: number;       // amount tripled (partner gets)
  returned: number;        // what partner sent back
  playerEarnings: number;
  partnerEarnings: number;
}

type GamePhase = 'intro' | 'sending' | 'waiting' | 'reveal' | 'summary' | 'complete';

// --- Constants ---

const TOTAL_ROUNDS = 10;
const STARTING_AMOUNT = 10;
const MULTIPLIER = 3;

// --- AI Partner Logic ---

function computePartnerReturn(
  sentThisRound: number,
  roundNum: number,
  history: RoundRecord[],
): number {
  const tripled = sentThisRound * MULTIPLIER;
  if (tripled === 0) return 0;

  // Compute player's average sending
  const pastSends = history.map(r => r.sent);
  const avgSend = pastSends.length > 0 ? pastSends.reduce((a, b) => a + b, 0) / pastSends.length : 5;

  let returnRate: number;

  if (roundNum <= 3) {
    // Rounds 1-3: return ~40% (fair but not generous)
    returnRate = 0.35 + Math.random() * 0.10;
  } else if (roundNum <= 6) {
    // Rounds 4-6: reward trust, punish distrust
    if (avgSend > 5) {
      returnRate = 0.45 + Math.random() * 0.10; // ~50%
    } else if (avgSend < 3) {
      returnRate = 0.20 + Math.random() * 0.10; // ~25%
    } else {
      returnRate = 0.35 + Math.random() * 0.10; // ~40%
    }
  } else if (roundNum <= 8) {
    // Rounds 7-8: generous regardless
    returnRate = 0.55 + Math.random() * 0.10; // ~60%
  } else {
    // Rounds 9-10: mirror player's generosity
    const playerGenerosity = avgSend / STARTING_AMOUNT;
    returnRate = Math.max(0.15, Math.min(0.70, playerGenerosity * 0.65 + Math.random() * 0.10));
  }

  const returned = Math.round(tripled * returnRate);
  return Math.min(tripled, Math.max(0, returned));
}

// --- Coin Animation Component ---

function CoinFlow({ direction, count, active }: { direction: 'send' | 'receive'; count: number; active: boolean }) {
  if (!active || count === 0) return null;
  const coins = Math.min(8, Math.max(1, Math.round(count / 2)));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: coins }).map((_, i) => {
        const delay = i * 0.08;
        const yOff = (Math.random() - 0.5) * 30;
        return (
          <div
            key={i}
            className="absolute top-1/2 size-5 rounded-full"
            style={{
              left: direction === 'send' ? '25%' : '75%',
              backgroundColor: '#fbbf24',
              boxShadow: '0 0 6px #f59e0b, inset 0 -2px 2px rgba(0,0,0,0.15)',
              animation: `${direction === 'send' ? 'coinFlySend' : 'coinFlyReceive'} 0.7s ease-out ${delay}s forwards`,
              transform: `translateY(${yOff}px)`,
              opacity: 0,
            }}
          >
            <span className="text-[8px] font-black text-yellow-800 flex items-center justify-center h-full">$</span>
          </div>
        );
      })}
    </div>
  );
}

// --- Multiply burst ---

function MultiplyBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 animate-[burstIn_0.5s_ease-out_forwards]">
      <span className="text-3xl font-black text-yellow-500 drop-shadow-lg">x3</span>
    </div>
  );
}

// --- Main Component ---

export const TrustExchange: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('intro');
  const [round, setRound] = useState(1);
  const [sendAmount, setSendAmount] = useState(5);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [partnerTotal, setPartnerTotal] = useState(0);

  // Current round state
  const [currentSent, setCurrentSent] = useState(0);
  const [currentReturned, setCurrentReturned] = useState(0);
  const [showMultiply, setShowMultiply] = useState(false);
  const [showSendCoins, setShowSendCoins] = useState(false);
  const [showReceiveCoins, setShowReceiveCoins] = useState(false);

  const startTimeRef = useRef(0);
  const sliderRef = useRef<HTMLInputElement>(null);

  // --- Start ---
  const handleStart = () => {
    setGamePhase('sending');
    startTimeRef.current = Date.now();
  };

  // --- Send ---
  const handleSend = useCallback(() => {
    const sent = sendAmount;
    setCurrentSent(sent);
    setGamePhase('waiting');
    setShowSendCoins(true);

    // Show coin animation flowing to partner
    setTimeout(() => {
      setShowSendCoins(false);
      setShowMultiply(true);
    }, 700);

    // Show x3 multiply
    setTimeout(() => {
      setShowMultiply(false);
    }, 1300);

    // AI "deciding" pause, then reveal
    const waitTime = 1500 + Math.random() * 1000;
    setTimeout(() => {
      const returned = computePartnerReturn(sent, round, history);
      setCurrentReturned(returned);
      setShowReceiveCoins(true);
      setGamePhase('reveal');

      setTimeout(() => {
        setShowReceiveCoins(false);
      }, 700);

      // XP for participating
      onXPGain(5, 'Exchange completed');
      if (sent >= 7) onXPGain(3, 'High trust');
    }, waitTime);
  }, [sendAmount, round, history, onXPGain]);

  // --- Continue to next round ---
  const handleContinue = useCallback(() => {
    const sent = currentSent;
    const tripled = sent * MULTIPLIER;
    const returned = currentReturned;
    const pEarnings = (STARTING_AMOUNT - sent) + returned;
    const aEarnings = tripled - returned;

    const record: RoundRecord = {
      round,
      sent,
      received: tripled,
      returned,
      playerEarnings: pEarnings,
      partnerEarnings: aEarnings,
    };

    const newHistory = [...history, record];
    setHistory(newHistory);
    setPlayerTotal(t => t + pEarnings);
    setPartnerTotal(t => t + aEarnings);

    if (round >= TOTAL_ROUNDS) {
      setGamePhase('complete');
    } else {
      setRound(r => r + 1);
      setSendAmount(5);
      setCurrentSent(0);
      setCurrentReturned(0);
      setGamePhase('sending');
    }
  }, [currentSent, currentReturned, round, history]);

  // --- Compute final metrics and complete ---
  useEffect(() => {
    if (gamePhase !== 'complete') return;

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const allRecords = history;

    // If no records yet (edge case), wait for next render with complete history
    if (allRecords.length < TOTAL_ROUNDS) return;

    // Trust Level: avg % of $10 sent
    const avgSendPct = allRecords.reduce((a, r) => a + r.sent, 0) / (allRecords.length * STARTING_AMOUNT);
    const trustLevel = Math.round(avgSendPct * 100);

    // Reciprocity: correlation between partner's return rate and next round's sending
    let reciprocity = 50;
    if (allRecords.length >= 3) {
      let increases = 0;
      let decreases = 0;
      for (let i = 1; i < allRecords.length; i++) {
        const prevReturnRate = allRecords[i - 1].sent > 0
          ? allRecords[i - 1].returned / (allRecords[i - 1].sent * MULTIPLIER)
          : 0;
        const sendDiff = allRecords[i].sent - allRecords[i - 1].sent;

        if (prevReturnRate > 0.45 && sendDiff > 0) increases++;
        else if (prevReturnRate < 0.35 && sendDiff < 0) increases++;
        else if (sendDiff !== 0) decreases++;
      }
      const total = increases + decreases;
      reciprocity = total > 0 ? Math.round((increases / total) * 100) : 50;
    }

    // Fairness Sensitivity: reduced sending after low returns
    let fairnessSensitivity = 50;
    {
      let fairReactions = 0;
      let unfairRounds = 0;
      for (let i = 1; i < allRecords.length; i++) {
        const prevReturnRate = allRecords[i - 1].sent > 0
          ? allRecords[i - 1].returned / (allRecords[i - 1].sent * MULTIPLIER)
          : 0.5;
        if (prevReturnRate < 0.33) {
          unfairRounds++;
          if (allRecords[i].sent < allRecords[i - 1].sent) fairReactions++;
        }
      }
      fairnessSensitivity = unfairRounds > 0 ? Math.round((fairReactions / unfairRounds) * 100) : 50;
    }

    // Generosity: sent more than strategically optimal ($5 is break-even)
    const avgSent = allRecords.reduce((a, r) => a + r.sent, 0) / allRecords.length;
    const generosity = Math.round(Math.min(100, Math.max(0, (avgSent - 3) / 7 * 100)));

    // Risk in Trust: willingness to send >$7
    const highTrustRounds = allRecords.filter(r => r.sent >= 7).length;
    const riskInTrust = Math.round((highTrustRounds / allRecords.length) * 100);

    // Adaptability: variance in sending (low variance = fixed strategy = low adaptability)
    const sends = allRecords.map(r => r.sent);
    const sendMean = sends.reduce((a, b) => a + b, 0) / sends.length;
    const sendVariance = sends.reduce((a, s) => a + Math.pow(s - sendMean, 2), 0) / sends.length;
    const adaptability = Math.round(Math.min(100, Math.max(0, sendVariance * 8)));

    // Cooperative Orientation: joint earnings vs selfish play
    const jointEarnings = allRecords.reduce((a, r) => a + r.playerEarnings + r.partnerEarnings, 0);
    const maxJoint = TOTAL_ROUNDS * (STARTING_AMOUNT + STARTING_AMOUNT * MULTIPLIER); // if always send all and return all
    // Selfish would be sending 0 every round = $10 * 10 = $100
    const selfishBaseline = TOTAL_ROUNDS * STARTING_AMOUNT;
    const cooperativeOrientation = Math.round(
      Math.min(100, Math.max(0, ((jointEarnings - selfishBaseline) / (maxJoint * 0.5 - selfishBaseline)) * 100))
    );

    // Score: total player earnings normalized
    // Max possible: if send $10, partner returns 70% of $30 = $21 per round = $210 total
    // Realistic max: ~$15 per round = $150
    const totalPlayerEarnings = allRecords.reduce((a, r) => a + r.playerEarnings, 0);
    const normalizedScore = Math.round(Math.min(100, (totalPlayerEarnings / 150) * 100));

    const result: GameResult = {
      score: normalizedScore,
      rawScore: totalPlayerEarnings,
      timeSpent,
      type: 'trust_exchange',
      metrics: {
        trustLevel,
        reciprocity,
        fairnessSensitivity,
        generosity,
        riskInTrust,
        adaptability,
        cooperativeOrientation,
      },
      data: {
        rounds: allRecords,
        totalPlayerEarnings,
        totalPartnerEarnings: allRecords.reduce((a, r) => a + r.partnerEarnings, 0),
        jointEarnings,
      },
    };
    onComplete(result);
  }, [gamePhase, history, onComplete]);

  // --- Exit ---
  const handleGameExit = () => {
    const progress: AssessmentProgress = {
      step: round,
      correctCount: history.length,
      textInput: '',
      gameScore: playerTotal,
      simState: null,
    };
    onExit(progress);
  };

  // --- Intro ---
  if (gamePhase === 'intro') {
    return (
      <GameIntro
        title="TrustExchange"
        description="You and an AI partner exchange money across 10 rounds. Build trust, earn rewards. What you send is tripled for your partner — will they return the favor?"
        icon="handshake"
        duration="~5 min"
        rules={[
          'Each round you start with $10. Choose how much to send your partner.',
          'Whatever you send gets TRIPLED for them.',
          'Your partner then decides how much to send back.',
          'Your profit = kept amount + what they return.',
          'Play 10 rounds. Maximize your total earnings!',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- Complete ---
  if (gamePhase === 'complete') {
    const totalPlayerEarnings = history.reduce((a, r) => a + r.playerEarnings, 0);
    const totalPartnerEarnings = history.reduce((a, r) => a + r.partnerEarnings, 0);
    const avgSent = history.length > 0 ? Math.round(history.reduce((a, r) => a + r.sent, 0) / history.length * 10) / 10 : 0;

    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">handshake</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">Exchange Complete!</h2>
          <p className="text-text-muted mb-8">10 rounds of trust played</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Your Total</p>
              <p className="text-3xl font-black text-green-500">${totalPlayerEarnings}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Partner Total</p>
              <p className="text-3xl font-black text-blue-500">${totalPartnerEarnings}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Avg Sent</p>
              <p className="text-3xl font-black text-primary">${avgSent}</p>
            </div>
          </div>

          {/* Round history mini chart */}
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Round History</p>
            <div className="flex items-end justify-center gap-1.5 h-20">
              {history.map((r, i) => {
                const sentH = (r.sent / STARTING_AMOUNT) * 100;
                const retH = r.sent > 0 ? (r.returned / (r.sent * MULTIPLIER)) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                    <div className="w-full flex flex-col items-center gap-px">
                      <div
                        className="w-3 bg-green-400 rounded-t-sm transition-all"
                        style={{ height: `${sentH * 0.6}px` }}
                        title={`Sent $${r.sent}`}
                      />
                      <div
                        className="w-3 bg-blue-400 rounded-b-sm transition-all"
                        style={{ height: `${retH * 0.6}px` }}
                        title={`Returned $${r.returned}`}
                      />
                    </div>
                    <span className="text-[8px] text-text-muted">{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-green-400" /> Sent</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-blue-400" /> Return %</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Playing ---
  const lastRound = history.length > 0 ? history[history.length - 1] : null;
  const tripled = currentSent * MULTIPLIER;

  return (
    <div className="max-w-2xl mx-auto mt-4 relative select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGameExit}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-sm font-black text-text-main dark:text-white">Round {round} of {TOTAL_ROUNDS}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-xs text-text-muted">Your Total</span>
            <p className="text-lg font-black text-green-500">${playerTotal}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-text-muted">Partner</span>
            <p className="text-lg font-black text-blue-500">${partnerTotal}</p>
          </div>
        </div>
      </div>

      {/* Round progress */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              i < round - 1 ? 'bg-primary' : i === round - 1 ? 'bg-primary/50 animate-pulse' : 'bg-background-light dark:bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Main exchange area */}
      <div className="bg-card-bg dark:bg-card-bg-dark rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 overflow-hidden relative">
        {/* Split: You vs Partner */}
        <div className="grid grid-cols-2 relative" style={{ minHeight: 260 }}>
          {/* Your side */}
          <div className="p-6 flex flex-col items-center justify-center border-r border-text-main/5 dark:border-white/5">
            <div className="size-14 rounded-full bg-green-500/15 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-3xl text-green-500">person</span>
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-text-muted mb-1">YOU</p>
            <div className="flex items-center gap-1 mb-3">
              <span className="text-3xl font-black text-text-main dark:text-white">
                ${gamePhase === 'sending' ? STARTING_AMOUNT : (STARTING_AMOUNT - currentSent)}
              </span>
            </div>

            {gamePhase === 'reveal' && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <p className="text-xs text-text-muted">Received back</p>
                <p className="text-2xl font-black text-green-500">+${currentReturned}</p>
                <p className="text-xs text-text-muted mt-1">Round profit</p>
                <p className="text-lg font-bold text-text-main dark:text-white">
                  ${(STARTING_AMOUNT - currentSent) + currentReturned}
                </p>
              </div>
            )}
          </div>

          {/* Partner side */}
          <div className="p-6 flex flex-col items-center justify-center">
            <div className="size-14 rounded-full bg-blue-500/15 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-3xl text-blue-500">smart_toy</span>
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-text-muted mb-1">PARTNER</p>

            {gamePhase === 'sending' && (
              <p className="text-sm text-text-muted italic">Waiting...</p>
            )}

            {gamePhase === 'waiting' && (
              <div className="flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
                <p className="text-xs text-text-muted mb-1">Received</p>
                <p className="text-3xl font-black text-blue-500">${tripled}</p>
                <div className="flex items-center gap-1 mt-2">
                  <div className="size-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="size-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="size-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-xs text-text-muted mt-1">deciding...</p>
              </div>
            )}

            {gamePhase === 'reveal' && (
              <div className="flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
                <p className="text-xs text-text-muted">Received ${tripled}</p>
                <p className="text-xs text-text-muted mt-1">Sent back</p>
                <p className="text-2xl font-black text-blue-500">${currentReturned}</p>
                <p className="text-xs text-text-muted mt-1">Kept</p>
                <p className="text-lg font-bold text-text-main dark:text-white">${tripled - currentReturned}</p>
              </div>
            )}
          </div>

          {/* Center money flow visualization */}
          <CoinFlow direction="send" count={currentSent} active={showSendCoins} />
          <CoinFlow direction="receive" count={currentReturned} active={showReceiveCoins} />
          <MultiplyBurst active={showMultiply} />

          {/* Center divider */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-text-main/5 dark:bg-white/5" />
        </div>

        {/* Action area */}
        <div className="border-t border-text-main/5 dark:border-white/5 p-6">
          {gamePhase === 'sending' && (
            <div className="animate-[fadeIn_0.2s_ease-out]">
              {/* Slider */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-text-muted">Send to partner</span>
                  <span className="text-2xl font-black text-primary">${sendAmount}</span>
                </div>
                <input
                  ref={sliderRef}
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={sendAmount}
                  onChange={(e) => setSendAmount(Number(e.target.value))}
                  className="w-full h-2 bg-background-light dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                  style={{
                    background: `linear-gradient(to right, #00c841 0%, #00c841 ${sendAmount * 10}%, #e5e7eb ${sendAmount * 10}%, #e5e7eb 100%)`,
                  }}
                />
                <div className="flex justify-between text-[10px] text-text-muted font-bold mt-1">
                  <span>$0</span>
                  <span>$10</span>
                </div>
              </div>

              {/* Info */}
              <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 mb-4 text-center">
                <p className="text-xs text-text-muted">
                  You keep <span className="font-black text-text-main dark:text-white">${STARTING_AMOUNT - sendAmount}</span>
                  {' '}  |  Partner receives <span className="font-black text-blue-500">${sendAmount * MULTIPLIER}</span>
                  {sendAmount > 0 && <span className="text-[10px]"> (x{MULTIPLIER})</span>}
                </p>
              </div>

              <button
                onClick={handleSend}
                className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                Send ${sendAmount}
              </button>
            </div>
          )}

          {gamePhase === 'waiting' && (
            <div className="text-center py-4 animate-[fadeIn_0.2s_ease-out]">
              <p className="text-sm text-text-muted font-bold">
                You sent <span className="text-primary font-black">${currentSent}</span> (tripled to <span className="text-blue-500 font-black">${tripled}</span>)
              </p>
              <p className="text-xs text-text-muted mt-1">Partner is deciding how much to return...</p>
            </div>
          )}

          {gamePhase === 'reveal' && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-4 text-center">
                <p className="text-sm text-text-muted">
                  Partner returned <span className="font-black text-blue-500">${currentReturned}</span> of ${tripled}
                  {tripled > 0 && (
                    <span className="text-xs ml-1">({Math.round((currentReturned / tripled) * 100)}%)</span>
                  )}
                </p>
                <p className="text-lg font-black text-text-main dark:text-white mt-1">
                  Your round earnings: ${(STARTING_AMOUNT - currentSent) + currentReturned}
                </p>
              </div>
              <button
                onClick={handleContinue}
                className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                {round >= TOTAL_ROUNDS ? 'See Results' : `Next Round (${round + 1}/${TOTAL_ROUNDS})`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History strip */}
      {history.length > 0 && (
        <div className="mt-4 bg-card-bg dark:bg-card-bg-dark rounded-2xl border border-text-main/5 dark:border-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Exchange History</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {history.map((r, i) => {
              const returnPct = r.sent > 0 ? Math.round((r.returned / (r.sent * MULTIPLIER)) * 100) : 0;
              const isProfit = r.playerEarnings > STARTING_AMOUNT;
              return (
                <div
                  key={i}
                  className="flex-shrink-0 bg-background-light dark:bg-white/5 rounded-xl p-2.5 min-w-[70px] text-center"
                >
                  <p className="text-[9px] text-text-muted font-bold">R{r.round}</p>
                  <p className="text-xs font-black text-text-main dark:text-white">-${r.sent}</p>
                  <p className={`text-xs font-black ${isProfit ? 'text-green-500' : 'text-red-400'}`}>
                    +${r.returned}
                  </p>
                  <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all"
                      style={{ width: `${returnPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes coinFlySend {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(calc(50vw - 120px)); }
        }
        @keyframes coinFlyReceive {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(calc(-50vw + 120px)); }
        }
        @keyframes burstIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          40% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.8); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #00c841;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 200, 65, 0.3);
          border: 3px solid white;
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #00c841;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 200, 65, 0.3);
          border: 3px solid white;
        }
      `}</style>
    </div>
  );
};

export default TrustExchange;
