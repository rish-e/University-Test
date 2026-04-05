import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

type Phase = 'intro' | 'playing' | 'roundNews' | 'roundTrade' | 'roundResult' | 'complete';

interface Asset {
  name: string;
  ticker: string;
  color: string;
  priceHistory: number[];
  volatility: number;
}

interface Holdings {
  [ticker: string]: number; // shares held
}

interface TradeAction {
  round: number;
  ticker: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  timestamp: number;
}

interface RoundRecord {
  round: number;
  portfolioValue: number;
  cashRemaining: number;
  allocations: Record<string, number>; // % of portfolio per asset
  decisionTimeMs: number;
  newsHeadline: string;
  tradesExecuted: TradeAction[];
  heldThrough: boolean; // pressed Hold instead of trading
}

const NEWS_EVENTS: { headline: string; effects: Record<string, number> }[] = [
  { headline: 'Tech sector sees record growth amid AI boom', effects: { TECH: 0.12, GREEN: 0.02, BOND: 0.01 } },
  { headline: 'Central bank raises interest rates unexpectedly', effects: { TECH: -0.08, GREEN: -0.03, BOND: -0.03 } },
  { headline: 'Government doubles green energy subsidies', effects: { TECH: -0.02, GREEN: 0.15, BOND: 0.01 } },
  { headline: 'Market crash fears grow as inflation spikes', effects: { TECH: -0.10, GREEN: -0.07, BOND: -0.05 } },
  { headline: 'TechCorp announces breakthrough AI product', effects: { TECH: 0.20, GREEN: 0.03, BOND: -0.01 } },
  { headline: 'Recession warnings issued by top economists', effects: { TECH: -0.12, GREEN: -0.04, BOND: 0.05 } },
  { headline: 'Global carbon tax approved by 40 nations', effects: { TECH: -0.05, GREEN: 0.10, BOND: 0.02 } },
  { headline: 'Bull market rally begins as confidence surges', effects: { TECH: 0.15, GREEN: 0.10, BOND: 0.05 } },
];

const INITIAL_PRICES: Record<string, number> = { TECH: 150, GREEN: 80, BOND: 100 };
const STARTING_CASH = 10000;
const TOTAL_ROUNDS = 8;
const ROUND_TIME = 30;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const MarketTrader: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [cash, setCash] = useState(STARTING_CASH);
  const [holdings, setHoldings] = useState<Holdings>({ TECH: 0, GREEN: 0, BOND: 0 });
  const [assets, setAssets] = useState<Asset[]>([
    { name: 'TechCorp', ticker: 'TECH', color: '#6366f1', priceHistory: [INITIAL_PRICES.TECH], volatility: 0.15 },
    { name: 'GreenEnergy', ticker: 'GREEN', color: '#22c55e', priceHistory: [INITIAL_PRICES.GREEN], volatility: 0.08 },
    { name: 'SafeBonds', ticker: 'BOND', color: '#f59e0b', priceHistory: [INITIAL_PRICES.BOND], volatility: 0.02 },
  ]);
  const [pendingTrades, setPendingTrades] = useState<{ ticker: string; type: 'buy' | 'sell'; shares: number }[]>([]);
  const [tradeAmounts, setTradeAmounts] = useState<Record<string, number>>({ TECH: 0, GREEN: 0, BOND: 0 });
  const [roundTimer, setRoundTimer] = useState(ROUND_TIME);
  const [roundRecords, setRoundRecords] = useState<RoundRecord[]>([]);
  const [allTrades, setAllTrades] = useState<TradeAction[]>([]);
  const [newsAnim, setNewsAnim] = useState(false);
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down' | null>>({ TECH: null, GREEN: null, BOND: null });
  const [showConfirm, setShowConfirm] = useState(false);

  const startTimeRef = useRef(Date.now());
  const roundStartRef = useRef(Date.now());
  const timerRef = useRef<number | null>(null);

  // Current prices helper
  const getPrice = useCallback((ticker: string) => {
    const asset = assets.find(a => a.ticker === ticker);
    return asset ? asset.priceHistory[asset.priceHistory.length - 1] : 0;
  }, [assets]);

  // Portfolio value
  const portfolioValue = useCallback(() => {
    let val = cash;
    for (const a of assets) {
      val += holdings[a.ticker] * a.priceHistory[a.priceHistory.length - 1];
    }
    return val;
  }, [cash, holdings, assets]);

  // Round timer
  useEffect(() => {
    if (phase !== 'roundTrade') return;
    setRoundTimer(ROUND_TIME);
    timerRef.current = window.setInterval(() => {
      setRoundTimer(prev => {
        if (prev <= 1) {
          // auto confirm with whatever trades are pending
          handleConfirmTrades(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, round]);

  const handleStart = useCallback(() => {
    setPhase('roundNews');
    setRound(1);
    startTimeRef.current = Date.now();
    roundStartRef.current = Date.now();
    setNewsAnim(true);
    setTimeout(() => setNewsAnim(false), 600);
  }, []);

  const handleNewsRead = useCallback(() => {
    setPhase('roundTrade');
    roundStartRef.current = Date.now();
    setTradeAmounts({ TECH: 0, GREEN: 0, BOND: 0 });
    setPendingTrades([]);
    setShowConfirm(false);
  }, []);

  // Add a trade to pending list
  const addTrade = useCallback((ticker: string, type: 'buy' | 'sell', shares: number) => {
    if (shares <= 0) return;
    setPendingTrades(prev => {
      const filtered = prev.filter(t => !(t.ticker === ticker && t.type === type));
      return [...filtered, { ticker, type, shares }];
    });
  }, []);

  // Execute trades and advance round
  const handleConfirmTrades = useCallback((timedOut: boolean = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const decisionTime = Date.now() - roundStartRef.current;
    const currentRound = round;
    const newsEvent = NEWS_EVENTS[currentRound - 1];
    const executedTrades: TradeAction[] = [];
    let newCash = cash;
    const newHoldings = { ...holdings };

    // Execute pending trades
    for (const trade of pendingTrades) {
      const price = getPrice(trade.ticker);
      if (trade.type === 'buy') {
        const cost = trade.shares * price;
        if (cost <= newCash) {
          newCash -= cost;
          newHoldings[trade.ticker] += trade.shares;
          executedTrades.push({ round: currentRound, ticker: trade.ticker, type: 'buy', shares: trade.shares, price, timestamp: Date.now() });
        }
      } else {
        const sellShares = Math.min(trade.shares, newHoldings[trade.ticker]);
        if (sellShares > 0) {
          newCash += sellShares * price;
          newHoldings[trade.ticker] -= sellShares;
          executedTrades.push({ round: currentRound, ticker: trade.ticker, type: 'sell', shares: sellShares, price, timestamp: Date.now() });
        }
      }
    }

    setCash(newCash);
    setHoldings(newHoldings);
    setAllTrades(prev => [...prev, ...executedTrades]);

    if (executedTrades.length > 0) {
      onXPGain(5, 'Trades executed');
    }

    // Record round
    const totalVal = newCash + assets.reduce((s, a) => s + newHoldings[a.ticker] * a.priceHistory[a.priceHistory.length - 1], 0);
    const allocs: Record<string, number> = {};
    for (const a of assets) {
      allocs[a.ticker] = totalVal > 0 ? (newHoldings[a.ticker] * a.priceHistory[a.priceHistory.length - 1]) / totalVal * 100 : 0;
    }

    setRoundRecords(prev => [...prev, {
      round: currentRound,
      portfolioValue: totalVal,
      cashRemaining: newCash,
      allocations: allocs,
      decisionTimeMs: decisionTime,
      newsHeadline: newsEvent.headline,
      tradesExecuted: executedTrades,
      heldThrough: executedTrades.length === 0,
    }]);

    // Apply price changes from news + randomness
    const updatedAssets = assets.map(a => {
      const newsEffect = newsEvent.effects[a.ticker] || 0;
      const randomNoise = (Math.random() - 0.5) * a.volatility * 0.5;
      const change = 1 + newsEffect + randomNoise;
      const lastPrice = a.priceHistory[a.priceHistory.length - 1];
      const newPrice = Math.max(5, parseFloat((lastPrice * change).toFixed(2)));
      return { ...a, priceHistory: [...a.priceHistory, newPrice] };
    });

    // Flash price indicators
    const flashes: Record<string, 'up' | 'down' | null> = {};
    for (const a of updatedAssets) {
      const prev = a.priceHistory[a.priceHistory.length - 2];
      const curr = a.priceHistory[a.priceHistory.length - 1];
      flashes[a.ticker] = curr > prev ? 'up' : curr < prev ? 'down' : null;
    }
    setPriceFlash(flashes);
    setAssets(updatedAssets);

    setPhase('roundResult');
    setTimeout(() => {
      setPriceFlash({ TECH: null, GREEN: null, BOND: null });
      if (currentRound >= TOTAL_ROUNDS) {
        setPhase('complete');
      } else {
        setRound(currentRound + 1);
        setPhase('roundNews');
        roundStartRef.current = Date.now();
        setNewsAnim(true);
        setTimeout(() => setNewsAnim(false), 600);
      }
    }, 1800);
  }, [round, cash, holdings, pendingTrades, assets, getPrice, onXPGain]);

  const handleHold = useCallback(() => {
    setPendingTrades([]);
    handleConfirmTrades(false);
  }, [handleConfirmTrades]);

  // --- Compute behavioral metrics ---
  const computeMetrics = useCallback(() => {
    const records = roundRecords;
    if (records.length === 0) return { riskTolerance: 50, numericalIntuition: 50, decisionSpeed: 50, patternRecognition: 50, lossAversion: 50, diversification: 50 };

    // Risk tolerance: avg % in TECH (most volatile)
    const avgTechAlloc = records.reduce((s, r) => s + (r.allocations.TECH || 0), 0) / records.length;
    const riskTolerance = clamp(Math.round(avgTechAlloc * 1.5), 0, 100);

    // Numerical intuition: did trades align with news sentiment?
    let alignedCount = 0;
    for (const rec of records) {
      const event = NEWS_EVENTS[rec.round - 1];
      for (const t of rec.tradesExecuted) {
        const effect = event.effects[t.ticker] || 0;
        if ((t.type === 'buy' && effect > 0) || (t.type === 'sell' && effect < 0)) alignedCount++;
      }
    }
    const totalTradeCount = records.reduce((s, r) => s + r.tradesExecuted.length, 0);
    const numericalIntuition = totalTradeCount > 0 ? clamp(Math.round((alignedCount / totalTradeCount) * 100), 0, 100) : 50;

    // Decision speed: avg time per round (30s max, faster = higher)
    const avgDecisionMs = records.reduce((s, r) => s + r.decisionTimeMs, 0) / records.length;
    const decisionSpeed = clamp(Math.round((1 - avgDecisionMs / 30000) * 100), 0, 100);

    // Pattern recognition: bought before rises, sold before drops
    let correctPredictions = 0;
    let totalPredictions = 0;
    for (let i = 0; i < records.length - 1; i++) {
      for (const t of records[i].tradesExecuted) {
        const currentAsset = assets.find(a => a.ticker === t.ticker);
        if (!currentAsset || currentAsset.priceHistory.length < i + 3) continue;
        const nextPrice = currentAsset.priceHistory[i + 2];
        const curPrice = currentAsset.priceHistory[i + 1];
        totalPredictions++;
        if ((t.type === 'buy' && nextPrice > curPrice) || (t.type === 'sell' && nextPrice < curPrice)) {
          correctPredictions++;
        }
      }
    }
    const patternRecognition = totalPredictions > 0 ? clamp(Math.round((correctPredictions / totalPredictions) * 100), 0, 100) : 50;

    // Loss aversion: held losing positions vs cut early
    let heldLosers = 0;
    let cutLosers = 0;
    for (const rec of records) {
      for (const t of rec.tradesExecuted) {
        if (t.type === 'sell') {
          // Check if selling at a loss
          const buyTrades = allTrades.filter(tr => tr.ticker === t.ticker && tr.type === 'buy' && tr.round < rec.round);
          const avgBuyPrice = buyTrades.length > 0 ? buyTrades.reduce((s, b) => s + b.price, 0) / buyTrades.length : t.price;
          if (t.price < avgBuyPrice) cutLosers++;
        }
      }
      // Held through bad news
      const event = NEWS_EVENTS[rec.round - 1];
      for (const ticker of ['TECH', 'GREEN', 'BOND'] as const) {
        if (holdings[ticker] > 0 && (event.effects[ticker] || 0) < -0.05 && rec.heldThrough) {
          heldLosers++;
        }
      }
    }
    const lossAversion = clamp(Math.round(heldLosers > 0 ? ((heldLosers / (heldLosers + cutLosers + 1)) * 100) : 30), 0, 100);

    // Diversification: how spread out across assets
    const lastRecord = records[records.length - 1];
    const allocs: number[] = lastRecord ? Object.values(lastRecord.allocations) as number[] : [33, 33, 33];
    const cashPct = lastRecord ? (lastRecord.cashRemaining / lastRecord.portfolioValue) * 100 : 100;
    const maxAlloc = Math.max(...allocs, cashPct);
    const diversification = clamp(Math.round((1 - maxAlloc / 100) * 130), 0, 100);

    return { riskTolerance, numericalIntuition, decisionSpeed, patternRecognition, lossAversion, diversification };
  }, [roundRecords, assets, allTrades, holdings]);

  const handleFinish = useCallback(() => {
    const metrics = computeMetrics();
    const finalVal = portfolioValue();
    const gainPct = ((finalVal - STARTING_CASH) / STARTING_CASH) * 100;
    const score = clamp(Math.round(50 + gainPct), 0, 100);
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    const result: GameResult = {
      score,
      rawScore: Math.round(finalVal),
      timeSpent,
      metrics,
      type: 'game',
      data: {
        profile: metrics,
        roundRecords,
        finalPortfolio: finalVal,
        trades: allTrades,
      },
    };
    onComplete(result);
  }, [computeMetrics, portfolioValue, roundRecords, allTrades, onComplete]);

  const handleGameExit = useCallback(() => {
    const progress: AssessmentProgress = {
      step: round,
      correctCount: 0,
      textInput: '',
      gameScore: Math.round(portfolioValue()),
      simState: { round, cash, holdings },
    };
    onExit(progress);
  }, [round, cash, holdings, portfolioValue, onExit]);

  // Max shares player can buy with available cash
  const maxBuyable = useCallback((ticker: string) => {
    const price = getPrice(ticker);
    return price > 0 ? Math.floor(cash / price) : 0;
  }, [cash, getPrice]);

  // SVG Chart rendering
  const renderChart = () => {
    const width = 560;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Get all prices for scale
    const allPrices = assets.flatMap(a => a.priceHistory);
    const minP = Math.max(0, Math.min(...allPrices) * 0.9);
    const maxP = Math.max(...allPrices) * 1.1;

    const maxPoints = Math.max(...assets.map(a => a.priceHistory.length));
    const xScale = (i: number) => padding.left + (i / Math.max(1, maxPoints - 1)) * chartW;
    const yScale = (p: number) => padding.top + chartH - ((p - minP) / (maxP - minP)) * chartH;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '220px' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padding.top + chartH * (1 - pct);
          const val = minP + (maxP - minP) * pct;
          return (
            <g key={pct}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="4 4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity={0.4}>${Math.round(val)}</text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {Array.from({ length: maxPoints }, (_, i) => (
          <text key={i} x={xScale(i)} y={height - 5} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity={0.4}>W{i + 1}</text>
        ))}

        {/* Price lines */}
        {assets.map(asset => {
          if (asset.priceHistory.length < 2) return null;
          const points = asset.priceHistory.map((p, i) => `${xScale(i)},${yScale(p)}`).join(' ');
          const lastIdx = asset.priceHistory.length - 1;
          return (
            <g key={asset.ticker}>
              {/* Gradient area */}
              <defs>
                <linearGradient id={`grad-${asset.ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={asset.color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={asset.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <polygon
                points={`${xScale(0)},${yScale(minP)} ${points} ${xScale(lastIdx)},${yScale(minP)}`}
                fill={`url(#grad-${asset.ticker})`}
              />
              <polyline
                points={points}
                fill="none"
                stroke={asset.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dot on latest point */}
              <circle
                cx={xScale(lastIdx)}
                cy={yScale(asset.priceHistory[lastIdx])}
                r="4"
                fill={asset.color}
                stroke="white"
                strokeWidth="2"
              >
                <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
              </circle>
              {/* Label */}
              <text
                x={xScale(lastIdx) + 8}
                y={yScale(asset.priceHistory[lastIdx]) + 4}
                fontSize="10"
                fontWeight="bold"
                fill={asset.color}
              >
                {asset.ticker}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Market Trader"
        description="Navigate the stock market through 8 volatile weeks. Read the news, make trades, and grow your portfolio!"
        icon="trending_up"
        duration="~5 minutes (30s per round)"
        rules={[
          'You start with $10,000 cash to invest across 3 assets.',
          'Each round, a news headline hints at price movements.',
          'Buy, sell, or hold -- you have 30 seconds to decide.',
          'TechCorp is volatile, GreenEnergy is moderate, SafeBonds is stable.',
          'After 8 weeks, your portfolio value determines your score.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const finalVal = portfolioValue();
    const gainPct = ((finalVal - STARTING_CASH) / STARTING_CASH) * 100;
    const finalScore = clamp(Math.round(50 + gainPct), 0, 100);
    const totalTrades = allTrades.length;
    const bestRound = roundRecords.reduce((best, r) => r.portfolioValue > best.portfolioValue ? r : best, roundRecords[0]);

    return (
      <div className="max-w-lg mx-auto mt-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">monitoring</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-1">Market Closed</h2>
          <p className="text-text-muted mb-6">8 weeks of trading complete</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Portfolio</p>
              <p className="text-2xl font-black text-primary">${Math.round(finalVal).toLocaleString()}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Return</p>
              <p className={`text-2xl font-black ${gainPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>{gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Trades</p>
              <p className="text-2xl font-black text-indigo-500">{totalTrades}</p>
            </div>
          </div>

          {/* Mini chart in results */}
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Portfolio Performance</p>
            {renderChart()}
          </div>

          {/* Round history */}
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-6 text-left max-h-36 overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Weekly Summary</p>
            {roundRecords.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-black/5 dark:border-white/5 last:border-0">
                <span className="font-bold text-text-main dark:text-white">Week {r.round}</span>
                <span className="text-xs text-text-muted truncate max-w-[180px] mx-2">{r.newsHeadline}</span>
                <span className={`font-bold ${r.portfolioValue >= STARTING_CASH ? 'text-green-500' : 'text-red-500'}`}>${Math.round(r.portfolioValue).toLocaleString()}</span>
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

  // --- PLAYING STATES ---
  const currentNews = NEWS_EVENTS[round - 1];
  const totalVal = portfolioValue();
  const gainPct = ((totalVal - STARTING_CASH) / STARTING_CASH) * 100;

  return (
    <div className="max-w-3xl mx-auto mt-4 animate-[fadeIn_0.2s_ease-out]">
      {/* HUD Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <button onClick={handleGameExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <span className="text-xs text-text-muted">Portfolio</span>
            <p className={`text-lg font-black ${gainPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>${Math.round(totalVal).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-xs text-text-muted">Cash</span>
            <p className="text-lg font-black text-text-main dark:text-white">${Math.round(cash).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-text-muted">Week</span>
            <p className="text-lg font-black text-primary">{round}/{TOTAL_ROUNDS}</p>
          </div>
          {phase === 'roundTrade' && (
            <div className={`text-center px-3 py-1 rounded-lg ${roundTimer <= 10 ? 'bg-red-500/10' : 'bg-primary/10'}`}>
              <span className={`text-lg font-black font-mono ${roundTimer <= 10 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>{roundTimer}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl p-4 shadow-lg border border-text-main/5 dark:border-white/5 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-text-main dark:text-white">Market Prices</h3>
          <div className="flex gap-3">
            {assets.map(a => (
              <div key={a.ticker} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-xs font-bold" style={{ color: a.color }}>{a.ticker}</span>
                <span className={`text-xs font-bold transition-all duration-300 ${
                  priceFlash[a.ticker] === 'up' ? 'text-green-500' :
                  priceFlash[a.ticker] === 'down' ? 'text-red-500' :
                  'text-text-muted'
                }`}>
                  ${a.priceHistory[a.priceHistory.length - 1].toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
        {renderChart()}
      </div>

      {/* News Ticker */}
      {(phase === 'roundNews' || phase === 'roundTrade') && currentNews && (
        <div className={`bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 mb-3 flex items-center gap-3 overflow-hidden ${newsAnim ? 'animate-[slideIn_0.4s_ease-out]' : ''}`}
          style={{ ['--tw-animate-slide' as string]: 'translateX(-20px)' }}
        >
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl shrink-0">breaking_news</span>
          <div className="overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Breaking News -- Week {round}</p>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100 whitespace-nowrap" style={{ animation: 'marquee 12s linear infinite' }}>{currentNews.headline}</p>
          </div>
          {phase === 'roundNews' && (
            <button
              onClick={handleNewsRead}
              className="shrink-0 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 active:scale-95 transition-all"
            >
              Trade
            </button>
          )}
        </div>
      )}

      {/* Trading Panel */}
      {phase === 'roundTrade' && (
        <div className="space-y-2 mb-3">
          {assets.map(asset => {
            const price = asset.priceHistory[asset.priceHistory.length - 1];
            const held = holdings[asset.ticker];
            const maxBuy = maxBuyable(asset.ticker);
            const tradeAmt = tradeAmounts[asset.ticker];

            return (
              <div key={asset.ticker} className="bg-card-bg dark:bg-card-bg-dark rounded-xl p-4 shadow border border-text-main/5 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-8 rounded-full" style={{ backgroundColor: asset.color }} />
                    <div>
                      <h4 className="font-black text-text-main dark:text-white text-sm">{asset.name}</h4>
                      <p className="text-xs text-text-muted">{asset.ticker} -- ${price.toFixed(2)}/share</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Holdings</p>
                    <p className="font-bold text-text-main dark:text-white">{held} shares <span className="text-xs text-text-muted">(${(held * price).toFixed(0)})</span></p>
                  </div>
                </div>

                {/* Slider */}
                <div className="mb-2">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(maxBuy, held)}
                    value={Math.abs(tradeAmt)}
                    onChange={(e) => setTradeAmounts(prev => ({ ...prev, [asset.ticker]: parseInt(e.target.value) * (tradeAmt < 0 ? -1 : 1) }))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: asset.color }}
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-1">
                    <span>0 shares</span>
                    <span className="font-bold">{Math.abs(tradeAmt)} shares = ${(Math.abs(tradeAmt) * price).toFixed(0)}</span>
                    <span>{Math.max(maxBuy, held)} shares</span>
                  </div>
                </div>

                {/* Buy / Sell buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setTradeAmounts(prev => ({ ...prev, [asset.ticker]: Math.abs(prev[asset.ticker]) || 1 })); addTrade(asset.ticker, 'buy', Math.abs(tradeAmt) || 1); }}
                    disabled={maxBuy === 0}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                      tradeAmt > 0
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    Buy {tradeAmt > 0 ? `(${tradeAmt})` : ''}
                  </button>
                  <button
                    onClick={() => { setTradeAmounts(prev => ({ ...prev, [asset.ticker]: -(Math.abs(prev[asset.ticker]) || 1) })); addTrade(asset.ticker, 'sell', Math.abs(tradeAmt) || held); }}
                    disabled={held === 0}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                      tradeAmt < 0
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    Sell {tradeAmt < 0 ? `(${Math.abs(tradeAmt)})` : ''}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Confirm / Hold */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => handleConfirmTrades(false)}
              disabled={pendingTrades.length === 0}
              className="flex-1 py-3.5 bg-primary text-black font-black text-base rounded-xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Confirm Trades ({pendingTrades.length})
            </button>
            <button
              onClick={handleHold}
              className="px-6 py-3.5 bg-text-main/5 dark:bg-white/5 text-text-main dark:text-white font-bold text-base rounded-xl hover:bg-text-main/10 dark:hover:bg-white/10 active:scale-[0.98] transition-all"
            >
              Hold
            </button>
          </div>
        </div>
      )}

      {/* Round Result Overlay */}
      {phase === 'roundResult' && (
        <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl p-6 shadow-lg border border-text-main/5 dark:border-white/5 text-center animate-[fadeIn_0.3s_ease-out]">
          <p className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2">Week {round} Results</p>
          <div className="flex items-center justify-center gap-6 mb-3">
            {assets.map(asset => {
              const prev = asset.priceHistory.length >= 2 ? asset.priceHistory[asset.priceHistory.length - 2] : asset.priceHistory[0];
              const curr = asset.priceHistory[asset.priceHistory.length - 1];
              const change = ((curr - prev) / prev) * 100;
              return (
                <div key={asset.ticker} className="text-center">
                  <p className="text-xs font-bold" style={{ color: asset.color }}>{asset.ticker}</p>
                  <p className={`text-lg font-black ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-text-muted">Prices updating...</p>
        </div>
      )}

      {/* CSS for marquee animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
