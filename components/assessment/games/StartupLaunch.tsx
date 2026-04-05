import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

type Phase = 'intro' | 'event' | 'allocate' | 'results' | 'complete' | 'gameover';

interface ChannelConfig {
  name: string;
  key: string;
  icon: string;
  color: string;
  maxBudget: number;
  description: string;
}

interface Competitor {
  name: string;
  color: string;
  users: number[];
  strategy: 'aggressive' | 'balanced';
}

interface WeekRecord {
  week: number;
  allocations: Record<string, number>;
  usersGained: number;
  revenueEarned: number;
  cashRemaining: number;
  totalUsers: number;
  eventName: string;
  eventEffect: string;
  competitorUsers: number[];
  decisionTimeMs: number;
  allocationChanged: boolean; // vs. same as last week
}

const CHANNELS: ChannelConfig[] = [
  { name: 'Social Media Ads', key: 'social', icon: 'campaign', color: '#6366f1', maxBudget: 3000, description: 'High reach, variable conversion' },
  { name: 'Influencer Deals', key: 'influencer', icon: 'person_play', color: '#ec4899', maxBudget: 2000, description: 'Expensive, high impact bursts' },
  { name: 'SEO & Content', key: 'seo', icon: 'article', color: '#22c55e', maxBudget: 1000, description: 'Slow start, compounds over time' },
  { name: 'Referral Program', key: 'referral', icon: 'group_add', color: '#f59e0b', maxBudget: 1500, description: 'Grows with your user base' },
];

interface MarketEvent {
  title: string;
  description: string;
  effect: (state: { users: number; revenue: number; multipliers: Record<string, number> }) => { userDelta: number; revenueDelta: number; multipliers: Record<string, number> };
  icon: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

const MARKET_EVENTS: MarketEvent[] = [
  {
    title: 'Smooth Launch Week',
    description: 'Your app goes live! Early adopters are checking it out.',
    effect: (s) => ({ userDelta: 50, revenueDelta: 0, multipliers: { ...s.multipliers } }),
    icon: 'rocket_launch',
    sentiment: 'positive',
  },
  {
    title: 'Competitor Flash Sale',
    description: 'FoodRush launches 50% off delivery -- your users drop 10%.',
    effect: (s) => ({ userDelta: -Math.round(s.users * 0.1), revenueDelta: -Math.round(s.revenue * 0.1), multipliers: { ...s.multipliers } }),
    icon: 'local_offer',
    sentiment: 'negative',
  },
  {
    title: 'Food Blogger Feature',
    description: 'A popular food blogger mentions your app organically!',
    effect: (s) => ({ userDelta: 200, revenueDelta: 50, multipliers: { ...s.multipliers } }),
    icon: 'restaurant',
    sentiment: 'positive',
  },
  {
    title: 'Server Outage',
    description: '2-hour downtime. Users are frustrated and some leave.',
    effect: (s) => ({ userDelta: -Math.round(s.users * 0.08), revenueDelta: -80, multipliers: { ...s.multipliers } }),
    icon: 'cloud_off',
    sentiment: 'negative',
  },
  {
    title: 'Holiday Season',
    description: 'Everyone is ordering in! All marketing channels are 2x effective this week.',
    effect: (s) => ({ userDelta: 100, revenueDelta: 200, multipliers: { social: 2, influencer: 2, seo: 2, referral: 2 } }),
    icon: 'celebration',
    sentiment: 'positive',
  },
  {
    title: 'App Store Feature',
    description: 'Apple features your app in "New & Notable" -- massive download spike!',
    effect: (s) => ({ userDelta: 500, revenueDelta: 150, multipliers: { ...s.multipliers } }),
    icon: 'star',
    sentiment: 'positive',
  },
  {
    title: 'New Competitor Enters',
    description: 'QuickBite launches with VC backing. Competition intensifies.',
    effect: (s) => ({ userDelta: -Math.round(s.users * 0.05), revenueDelta: -50, multipliers: { ...s.multipliers } }),
    icon: 'warning',
    sentiment: 'negative',
  },
  {
    title: 'Viral TikTok Moment',
    description: 'A delivery driver\'s video goes viral featuring your app!',
    effect: (s) => ({ userDelta: 350, revenueDelta: 100, multipliers: { social: 1.5, influencer: 1, seo: 1, referral: 1.5 } }),
    icon: 'trending_up',
    sentiment: 'positive',
  },
  {
    title: 'Regulation Change',
    description: 'New food safety regulations increase costs but build trust.',
    effect: (s) => ({ userDelta: 30, revenueDelta: -100, multipliers: { ...s.multipliers } }),
    icon: 'gavel',
    sentiment: 'neutral',
  },
  {
    title: 'End of Year Push',
    description: 'Everyone is setting New Year resolutions to eat better. Big opportunity!',
    effect: (s) => ({ userDelta: 200, revenueDelta: 300, multipliers: { social: 1.3, influencer: 1.5, seo: 1.2, referral: 1.3 } }),
    icon: 'auto_awesome',
    sentiment: 'positive',
  },
];

const STARTING_CASH = 10000;
const TOTAL_WEEKS = 10;
const WEEKLY_REVENUE_PER_USER = 0.15;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const StartupLaunch: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [week, setWeek] = useState(0);
  const [cash, setCash] = useState(STARTING_CASH);
  const [users, setUsers] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [userHistory, setUserHistory] = useState<number[]>([0]);
  const [allocations, setAllocations] = useState<Record<string, number>>({ social: 0, influencer: 0, seo: 0, referral: 0 });
  const [weekRecords, setWeekRecords] = useState<WeekRecord[]>([]);
  const [seoCompound, setSeoCompound] = useState(1); // SEO multiplier grows each week invested
  const [currentMultipliers, setCurrentMultipliers] = useState<Record<string, number>>({ social: 1, influencer: 1, seo: 1, referral: 1 });
  const [competitors] = useState<Competitor[]>([
    { name: 'FoodRush', color: '#ef4444', users: [100], strategy: 'aggressive' },
    { name: 'QuickBite', color: '#8b5cf6', users: [60], strategy: 'balanced' },
  ]);
  const [weekResults, setWeekResults] = useState<{ usersGained: number; revenueEarned: number; eventEffect: string } | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);

  const startTimeRef = useRef(Date.now());
  const weekStartRef = useRef(Date.now());

  const totalAllocated = (Object.values(allocations) as number[]).reduce((s: number, v: number) => s + v, 0);
  const weeklyBudget = Math.min(cash, 5000); // Max spend per week capped at 5k or remaining cash

  const handleStart = useCallback(() => {
    setPhase('event');
    setWeek(1);
    startTimeRef.current = Date.now();
    weekStartRef.current = Date.now();
  }, []);

  const handleEventAck = useCallback(() => {
    setPhase('allocate');
    weekStartRef.current = Date.now();
  }, []);

  // Compute users gained from allocations
  const simulateWeek = useCallback(() => {
    const currentWeek = week;
    const event = MARKET_EVENTS[currentWeek - 1];
    const decisionTime = Date.now() - weekStartRef.current;
    const prevAllocations = weekRecords.length > 0 ? weekRecords[weekRecords.length - 1].allocations : null;

    // Apply event effects
    const eventResult = event.effect({ users, revenue, multipliers: currentMultipliers });
    const mults = eventResult.multipliers;
    setCurrentMultipliers(mults);

    let usersGained = eventResult.userDelta;
    let weekRevenue = eventResult.revenueDelta;

    // Social Media: 1 user per $3 spent, * multiplier, +-30% randomness
    const socialUsers = allocations.social > 0 ? Math.round((allocations.social / 3) * mults.social * (0.7 + Math.random() * 0.6)) : 0;
    usersGained += socialUsers;

    // Influencer: big burst, unpredictable (0.5x to 2x of $5/user)
    const influencerUsers = allocations.influencer > 0 ? Math.round((allocations.influencer / 5) * mults.influencer * (0.5 + Math.random() * 1.5)) : 0;
    usersGained += influencerUsers;

    // SEO: compounds over time
    const newSeoCompound = allocations.seo > 0 ? seoCompound + 0.3 : seoCompound;
    setSeoCompound(newSeoCompound);
    const seoUsers = allocations.seo > 0 ? Math.round((allocations.seo / 10) * newSeoCompound * mults.seo) : 0;
    usersGained += seoUsers;

    // Referral: proportional to existing user base
    const referralUsers = allocations.referral > 0 && users > 0
      ? Math.round((allocations.referral / 8) * (users / 200) * mults.referral * (0.8 + Math.random() * 0.4))
      : 0;
    usersGained += referralUsers;

    // Revenue from users
    const totalUsersAfter = Math.max(0, users + usersGained);
    weekRevenue += Math.round(totalUsersAfter * WEEKLY_REVENUE_PER_USER);

    // Update cash
    const spent = totalAllocated;
    const newCash = cash - spent + weekRevenue;

    // Update competitor growth
    const updatedCompetitors = competitors.map(c => {
      const lastUsers = c.users[c.users.length - 1];
      let growth: number;
      if (c.strategy === 'aggressive') {
        growth = Math.round(lastUsers * (0.15 + Math.random() * 0.15) + 50 + Math.random() * 100);
      } else {
        growth = Math.round(lastUsers * (0.08 + Math.random() * 0.10) + 30 + Math.random() * 60);
      }
      return { ...c, users: [...c.users, lastUsers + growth] };
    });

    // Determine allocation changed
    const allocationChanged = prevAllocations
      ? Object.keys(allocations).some(k => Math.abs(allocations[k] - (prevAllocations[k] || 0)) > 50)
      : true;

    const record: WeekRecord = {
      week: currentWeek,
      allocations: { ...allocations },
      usersGained,
      revenueEarned: weekRevenue,
      cashRemaining: newCash,
      totalUsers: totalUsersAfter,
      eventName: event.title,
      eventEffect: event.description,
      competitorUsers: updatedCompetitors.map(c => c.users[c.users.length - 1]),
      decisionTimeMs: decisionTime,
      allocationChanged,
    };

    // Commit state
    setUsers(totalUsersAfter);
    setRevenue(weekRevenue);
    setCash(newCash);
    setUserHistory(prev => [...prev, totalUsersAfter]);
    setWeekRecords(prev => [...prev, record]);
    setTotalSpent(prev => prev + spent);
    setWeekResults({ usersGained, revenueEarned: weekRevenue, eventEffect: `+${socialUsers} social, +${influencerUsers} influencer, +${seoUsers} SEO, +${referralUsers} referral` });

    // Update competitor state
    for (let i = 0; i < competitors.length; i++) {
      competitors[i].users = updatedCompetitors[i].users;
    }

    if (spent > 0) onXPGain(3, 'Budget deployed');
    if (usersGained > 100) onXPGain(5, 'Growth surge');

    // Check game over
    if (newCash <= 0 && currentWeek < TOTAL_WEEKS) {
      setPhase('gameover');
      return;
    }

    setPhase('results');
  }, [week, allocations, users, revenue, cash, seoCompound, currentMultipliers, totalAllocated, competitors, weekRecords, onXPGain]);

  const advanceToNextWeek = useCallback(() => {
    if (week >= TOTAL_WEEKS) {
      setPhase('complete');
    } else {
      setWeek(w => w + 1);
      setPhase('event');
      setAllocations({ social: 0, influencer: 0, seo: 0, referral: 0 });
      setWeekResults(null);
      weekStartRef.current = Date.now();
    }
  }, [week]);

  // --- Behavioral metrics ---
  const computeMetrics = useCallback(() => {
    const records = weekRecords;
    if (records.length === 0) return { strategicThinking: 50, adaptability: 50, resourceEfficiency: 50, competitiveAwareness: 50, riskTaking: 50, longTermVsShortTerm: 50 };

    // Strategic thinking: invested in SEO early (before week 4)
    const earlySeoBudget = records.filter(r => r.week <= 4).reduce((s, r) => s + (r.allocations.seo || 0), 0);
    const earlyTotalBudget = records.filter(r => r.week <= 4).reduce((s, r) => s + (Object.values(r.allocations) as number[]).reduce((a: number, b: number) => a + b, 0), 0);
    const strategicThinking = earlyTotalBudget > 0 ? clamp(Math.round((earlySeoBudget / earlyTotalBudget) * 200), 0, 100) : 30;

    // Adaptability: changed strategy after market events
    const changedCount = records.filter(r => r.allocationChanged).length;
    const adaptability = clamp(Math.round((changedCount / records.length) * 120), 0, 100);

    // Resource efficiency: users gained per $ spent
    const totalUsersGained = records.reduce((s, r) => s + Math.max(0, r.usersGained), 0);
    const totalMoneySpent = records.reduce((s, r) => s + (Object.values(r.allocations) as number[]).reduce((a: number, b: number) => a + b, 0), 0);
    const efficiency = totalMoneySpent > 0 ? totalUsersGained / totalMoneySpent * 10 : 0;
    const resourceEfficiency = clamp(Math.round(efficiency * 15), 0, 100);

    // Competitive awareness: allocation shifts correlated with competitor growth
    let compShifts = 0;
    for (let i = 1; i < records.length; i++) {
      const prevComp = records[i - 1].competitorUsers;
      const currComp = records[i].competitorUsers;
      const compGrew = currComp.some((c, j) => c > prevComp[j] * 1.15);
      if (compGrew && records[i].allocationChanged) compShifts++;
    }
    const competitiveAwareness = clamp(Math.round((compShifts / Math.max(1, records.length - 1)) * 150), 0, 100);

    // Risk taking: big bets on single channels vs. diversified
    const maxAllocRatios = records.map(r => {
      const total = (Object.values(r.allocations) as number[]).reduce((a: number, b: number) => a + b, 0);
      if (total === 0) return 0;
      return Math.max(...(Object.values(r.allocations) as number[])) / total;
    });
    const avgMaxRatio = maxAllocRatios.reduce((s, v) => s + v, 0) / maxAllocRatios.length;
    const riskTaking = clamp(Math.round(avgMaxRatio * 100), 0, 100);

    // Long-term vs. short-term: SEO + referral vs. social + influencer
    const longTermSpend = records.reduce((s, r) => s + (r.allocations.seo || 0) + (r.allocations.referral || 0), 0);
    const shortTermSpend = records.reduce((s, r) => s + (r.allocations.social || 0) + (r.allocations.influencer || 0), 0);
    const totalChannelSpend = longTermSpend + shortTermSpend;
    const longTermVsShortTerm = totalChannelSpend > 0 ? clamp(Math.round((longTermSpend / totalChannelSpend) * 100), 0, 100) : 50;

    return { strategicThinking, adaptability, resourceEfficiency, competitiveAwareness, riskTaking, longTermVsShortTerm };
  }, [weekRecords]);

  const handleFinish = useCallback(() => {
    const metrics = computeMetrics();
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    // Score: user count relative to competitors
    const finalUsers = users;
    const compUsers = competitors.map(c => c.users[c.users.length - 1]);
    const maxComp = Math.max(...compUsers);
    let score: number;
    if (finalUsers >= maxComp * 1.2) score = clamp(Math.round(90 + (finalUsers - maxComp) / maxComp * 20), 90, 100);
    else if (finalUsers >= maxComp) score = clamp(Math.round(80 + (finalUsers / maxComp) * 10), 80, 95);
    else if (finalUsers >= Math.min(...compUsers)) score = clamp(Math.round(50 + (finalUsers / maxComp) * 30), 50, 80);
    else score = clamp(Math.round((finalUsers / maxComp) * 50), 0, 50);

    const result: GameResult = {
      score,
      rawScore: finalUsers,
      timeSpent,
      metrics,
      type: 'game',
      data: {
        profile: metrics,
        weekRecords,
        finalUsers,
        finalCash: cash,
        totalSpent,
        competitorFinalUsers: compUsers,
      },
    };
    onComplete(result);
  }, [computeMetrics, users, competitors, cash, weekRecords, totalSpent, onComplete]);

  const handleGameExit = useCallback(() => {
    const progress: AssessmentProgress = {
      step: week,
      correctCount: 0,
      textInput: '',
      gameScore: users,
      simState: { week, cash, users },
    };
    onExit(progress);
  }, [week, cash, users, onExit]);

  // SVG Area Chart
  const renderGrowthChart = () => {
    const width = 560;
    const height = 180;
    const pad = { top: 15, right: 20, bottom: 25, left: 45 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    const allData = [userHistory, ...competitors.map(c => c.users)];
    const maxVal = Math.max(10, ...allData.flat()) * 1.15;
    const maxLen = Math.max(...allData.map(d => d.length));

    const x = (i: number) => pad.left + (i / Math.max(1, maxLen - 1)) * chartW;
    const y = (v: number) => pad.top + chartH - (v / maxVal) * chartH;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '200px' }}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const yPos = pad.top + chartH * (1 - pct);
          const val = Math.round(maxVal * pct);
          return (
            <g key={pct}>
              <line x1={pad.left} y1={yPos} x2={width - pad.right} y2={yPos} stroke="currentColor" strokeOpacity={0.06} strokeDasharray="3 3" />
              <text x={pad.left - 6} y={yPos + 4} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity={0.35}>{val}</text>
            </g>
          );
        })}

        {/* X labels */}
        {Array.from({ length: maxLen }, (_, i) => (
          <text key={i} x={x(i)} y={height - 4} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity={0.35}>W{i}</text>
        ))}

        {/* Player area fill */}
        {userHistory.length > 1 && (
          <>
            <defs>
              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e85a" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00e85a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <polygon
              points={`${x(0)},${y(0)} ${userHistory.map((v, i) => `${x(i)},${y(v)}`).join(' ')} ${x(userHistory.length - 1)},${y(0)}`}
              fill="url(#userGrad)"
            />
            <polyline
              points={userHistory.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke="#00e85a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={x(userHistory.length - 1)} cy={y(userHistory[userHistory.length - 1])} r="4" fill="#00e85a" stroke="white" strokeWidth="2">
              <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* Competitor lines */}
        {competitors.map(comp => (
          comp.users.length > 1 && (
            <g key={comp.name}>
              <polyline
                points={comp.users.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                fill="none"
                stroke={comp.color}
                strokeWidth="1.5"
                strokeDasharray="5 3"
                strokeLinecap="round"
              />
              <text
                x={x(comp.users.length - 1) + 6}
                y={y(comp.users[comp.users.length - 1]) + 3}
                fontSize="9"
                fontWeight="bold"
                fill={comp.color}
              >
                {comp.name}
              </text>
            </g>
          )
        ))}

        {/* You label */}
        {userHistory.length > 1 && (
          <text x={x(userHistory.length - 1) + 6} y={y(userHistory[userHistory.length - 1]) + 3} fontSize="9" fontWeight="bold" fill="#00e85a">You</text>
        )}
      </svg>
    );
  };

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Startup Launch"
        description="Launch your food delivery app and outgrow the competition across 10 weeks. Allocate your budget wisely!"
        icon="rocket_launch"
        duration="~5 minutes (10 rounds)"
        rules={[
          'You start with $10,000 to grow a food delivery startup.',
          'Each week, allocate budget across 4 marketing channels.',
          'Market events happen -- adapt your strategy!',
          'SEO compounds over time; referrals grow with your users.',
          'Two AI competitors are also growing. Beat them both!',
          'If you run out of cash, game over.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- GAME OVER ---
  if (phase === 'gameover') {
    return (
      <div className="max-w-lg mx-auto mt-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-3xl shadow-xl border border-red-500/20 text-center">
          <div className="size-20 mx-auto mb-5 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-red-500">account_balance</span>
          </div>
          <h2 className="text-3xl font-black text-red-500 mb-2">Out of Cash!</h2>
          <p className="text-text-muted mb-4">Your startup ran out of funding in week {week}.</p>
          <p className="text-sm text-text-muted mb-6">You had {users.toLocaleString()} users. Not bad, but you burned through your budget too fast.</p>
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-6">
            {renderGrowthChart()}
          </div>
          <button onClick={handleFinish} className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            See Results
          </button>
        </div>
      </div>
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const compUsers = competitors.map(c => c.users[c.users.length - 1]);
    const beatBoth = users > Math.max(...compUsers);
    const beatOne = users > Math.min(...compUsers);

    return (
      <div className="max-w-lg mx-auto mt-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">{beatBoth ? 'emoji_events' : 'insights'}</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-1">{beatBoth ? 'Market Leader!' : beatOne ? 'Strong Contender' : 'Keep Growing'}</h2>
          <p className="text-text-muted mb-6">10 weeks of growth complete</p>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Users</p>
              <p className="text-2xl font-black text-primary">{users.toLocaleString()}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Cash Left</p>
              <p className={`text-2xl font-black ${cash >= 0 ? 'text-green-500' : 'text-red-500'}`}>${Math.round(cash).toLocaleString()}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Spent</p>
              <p className="text-2xl font-black text-indigo-500">${totalSpent.toLocaleString()}</p>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Final Standings</p>
            {[{ name: 'Your App', users, color: '#00e85a' }, ...competitors.map(c => ({ name: c.name, users: c.users[c.users.length - 1], color: c.color }))].sort((a, b) => b.users - a.users).map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-3 py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                <span className={`text-lg font-black ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : 'text-amber-700'}`}>#{i + 1}</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className={`font-bold flex-1 text-left ${entry.name === 'Your App' ? 'text-primary' : 'text-text-main dark:text-white'}`}>{entry.name}</span>
                <span className="font-black text-text-main dark:text-white">{entry.users.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Growth chart */}
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">User Growth</p>
            {renderGrowthChart()}
          </div>

          <button onClick={handleFinish} className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            Finish Module
          </button>
        </div>
      </div>
    );
  }

  // --- PLAYING STATES ---
  const currentEvent = MARKET_EVENTS[week - 1];

  return (
    <div className="max-w-3xl mx-auto mt-4 animate-[fadeIn_0.2s_ease-out]">
      {/* HUD */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <button onClick={handleGameExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <span className="text-xs text-text-muted">Cash</span>
            <p className={`text-lg font-black ${cash < 1000 ? 'text-red-500' : 'text-text-main dark:text-white'}`}>${Math.round(cash).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-xs text-text-muted">Users</span>
            <p className="text-lg font-black text-primary">{users.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-text-muted">Revenue/wk</span>
            <p className="text-lg font-black text-green-500">${Math.round(users * WEEKLY_REVENUE_PER_USER)}</p>
          </div>
          <div className="text-center px-3 py-1 bg-primary/10 rounded-lg">
            <span className="text-lg font-black text-primary">Week {week}/{TOTAL_WEEKS}</span>
          </div>
        </div>
      </div>

      {/* Growth Chart + Competitors */}
      <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl p-4 shadow-lg border border-text-main/5 dark:border-white/5 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-text-main dark:text-white">User Growth</h3>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-xs font-bold text-primary">You: {users.toLocaleString()}</span>
            </div>
            {competitors.map(c => (
              <div key={c.name} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-xs font-bold" style={{ color: c.color }}>{c.name}: {c.users[c.users.length - 1].toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        {renderGrowthChart()}
      </div>

      {/* Market Event */}
      {phase === 'event' && currentEvent && (
        <div className={`rounded-xl p-4 mb-3 flex items-start gap-3 animate-[slideUp_0.3s_ease-out] ${
          currentEvent.sentiment === 'positive' ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20' :
          currentEvent.sentiment === 'negative' ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20' :
          'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20'
        }`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 mt-0.5 ${
            currentEvent.sentiment === 'positive' ? 'text-green-600 dark:text-green-400' :
            currentEvent.sentiment === 'negative' ? 'text-red-600 dark:text-red-400' :
            'text-amber-600 dark:text-amber-400'
          }`}>{currentEvent.icon}</span>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{
              color: currentEvent.sentiment === 'positive' ? '#16a34a' : currentEvent.sentiment === 'negative' ? '#dc2626' : '#d97706'
            }}>Market Event -- Week {week}</p>
            <h4 className="font-black text-text-main dark:text-white mb-1">{currentEvent.title}</h4>
            <p className="text-sm text-text-muted">{currentEvent.description}</p>
          </div>
          <button onClick={handleEventAck} className="shrink-0 px-4 py-2 bg-primary text-black text-sm font-bold rounded-lg hover:bg-[#00d64b] active:scale-95 transition-all">
            Plan Budget
          </button>
        </div>
      )}

      {/* Allocation Panel */}
      {phase === 'allocate' && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between px-1 mb-1">
            <p className="text-sm font-bold text-text-main dark:text-white">Allocate Budget</p>
            <p className={`text-sm font-bold ${totalAllocated > weeklyBudget ? 'text-red-500' : 'text-text-muted'}`}>
              ${totalAllocated.toLocaleString()} / ${weeklyBudget.toLocaleString()} weekly limit
            </p>
          </div>

          {/* Budget bar */}
          <div className="h-3 bg-background-light dark:bg-white/5 rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-300 flex">
              {CHANNELS.map(ch => {
                const pct = weeklyBudget > 0 ? (allocations[ch.key] / weeklyBudget) * 100 : 0;
                return pct > 0 ? (
                  <div key={ch.key} className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: ch.color }} />
                ) : null;
              })}
            </div>
          </div>

          {CHANNELS.map(channel => (
            <div key={channel.key} className="bg-card-bg dark:bg-card-bg-dark rounded-xl p-4 shadow border border-text-main/5 dark:border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg" style={{ color: channel.color }}>{channel.icon}</span>
                  <div>
                    <h4 className="font-bold text-text-main dark:text-white text-sm">{channel.name}</h4>
                    <p className="text-xs text-text-muted">{channel.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-text-main dark:text-white" style={{ color: allocations[channel.key] > 0 ? channel.color : undefined }}>
                    ${allocations[channel.key].toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">max ${channel.maxBudget.toLocaleString()}</p>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={channel.maxBudget}
                step={50}
                value={allocations[channel.key]}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const otherSpend = (Object.entries(allocations) as [string, number][]).filter(([k]) => k !== channel.key).reduce((s: number, [, v]) => s + v, 0);
                  const maxAllowed = Math.min(channel.maxBudget, weeklyBudget - otherSpend);
                  setAllocations(prev => ({ ...prev, [channel.key]: Math.min(val, maxAllowed) }));
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: channel.color }}
              />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>$0</span>
                <span>${channel.maxBudget.toLocaleString()}</span>
              </div>
            </div>
          ))}

          <button
            onClick={simulateWeek}
            className="w-full py-3.5 bg-primary text-black font-black text-base rounded-xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 mt-2"
          >
            Launch Week {week}
          </button>
        </div>
      )}

      {/* Week Results */}
      {phase === 'results' && weekResults && (
        <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl p-5 shadow-lg border border-text-main/5 dark:border-white/5 animate-[slideUp_0.3s_ease-out] mb-3">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Week {week} Results</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-text-muted">Users Gained</p>
              <p className={`text-2xl font-black ${weekResults.usersGained >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {weekResults.usersGained >= 0 ? '+' : ''}{weekResults.usersGained}
              </p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-text-muted">Revenue</p>
              <p className={`text-2xl font-black ${weekResults.revenueEarned >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${weekResults.revenueEarned}
              </p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-text-muted">Total Users</p>
              <p className="text-2xl font-black text-primary">{users.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-text-muted mb-4">{weekResults.eventEffect}</p>

          {/* Competitor status */}
          <div className="flex gap-3 mb-4">
            {competitors.map(c => (
              <div key={c.name} className="flex-1 bg-background-light dark:bg-white/5 rounded-lg p-2 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: c.color }}>{c.name}</p>
                  <p className="text-sm font-black text-text-main dark:text-white">{c.users[c.users.length - 1].toLocaleString()} users</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={advanceToNextWeek}
            className="w-full py-3 bg-primary text-black font-black text-base rounded-xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            {week >= TOTAL_WEEKS ? 'See Final Results' : `Continue to Week ${week + 1}`}
          </button>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
