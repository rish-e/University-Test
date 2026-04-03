import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

// ============================================================================
// TYPES
// ============================================================================

type MasterPhase = 'intro' | 'phase1' | 'phase1-results' | 'phase2' | 'phase2-results' | 'phase3' | 'phase3-response' | 'phase3-results' | 'final';

interface DimensionDeltas {
  riskTolerance: number;
  strategicThinking: number;
  peopleFocus: number;
  timeHorizon: number;
}

interface SupplyChoice {
  text: string;
  effect: { capital: number; satisfaction: number };
  dimensions: DimensionDeltas;
}

interface SupplyScenario {
  title: string;
  context: string;
  affectedNode: number;
  ticker: string;
  choices: SupplyChoice[];
}

interface InnovationDecision {
  title: string;
  context: string;
  choices: [
    { text: string; type: 'safe'; marketResponse: string; shareDelta: number; repDelta: number },
    { text: string; type: 'risky'; marketResponse: string; shareDelta: number; repDelta: number },
  ];
}

interface BalloonRound {
  round: number;
  banked: number;
  popped: boolean;
  pumps: number;
}

interface InnovationChoice {
  step: number;
  type: 'safe' | 'risky';
}

// ============================================================================
// DATA
// ============================================================================

const SUPPLY_SCENARIOS: SupplyScenario[] = [
  {
    title: 'Supplier Crisis',
    context: 'A Category 5 hurricane has halted your primary supplier. Production stops in 48 hours.',
    affectedNode: 0,
    ticker: 'BREAKING: Hurricane disrupts major shipping lanes -- commodity prices surge 40%',
    choices: [
      {
        text: 'Air-freight from backup supplier',
        effect: { capital: -3000, satisfaction: 10 },
        dimensions: { riskTolerance: 10, strategicThinking: 5, peopleFocus: -5, timeHorizon: -10 },
      },
      {
        text: 'Pause production and wait',
        effect: { capital: 0, satisfaction: -20 },
        dimensions: { riskTolerance: -15, strategicThinking: -5, peopleFocus: 10, timeHorizon: 5 },
      },
      {
        text: 'Switch to local materials',
        effect: { capital: -500, satisfaction: -10 },
        dimensions: { riskTolerance: 5, strategicThinking: 10, peopleFocus: 5, timeHorizon: -5 },
      },
    ],
  },
  {
    title: 'Demand Surge',
    context: 'A viral TikTok trend spikes demand by 200%. Your warehouse is nearly empty.',
    affectedNode: 2,
    ticker: 'TRENDING: Product goes viral -- analysts predict 3-month sustained demand spike',
    choices: [
      {
        text: 'Run factory at double overtime',
        effect: { capital: -2000, satisfaction: 25 },
        dimensions: { riskTolerance: 10, strategicThinking: -5, peopleFocus: -10, timeHorizon: -5 },
      },
      {
        text: 'Outsource to 3rd party manufacturer',
        effect: { capital: -1000, satisfaction: 5 },
        dimensions: { riskTolerance: 5, strategicThinking: 10, peopleFocus: 5, timeHorizon: 10 },
      },
      {
        text: 'Raise prices to dampen demand',
        effect: { capital: 1000, satisfaction: -15 },
        dimensions: { riskTolerance: -5, strategicThinking: 8, peopleFocus: -12, timeHorizon: 8 },
      },
    ],
  },
  {
    title: 'Sustainability Pivot',
    context: 'Investors demand a green supply chain audit. Costly, but could boost brand image significantly.',
    affectedNode: 1,
    ticker: 'ESG REPORT: Companies with green supply chains see 25% higher investor confidence',
    choices: [
      {
        text: 'Fully commit to audit & upgrades',
        effect: { capital: -4000, satisfaction: 30 },
        dimensions: { riskTolerance: 5, strategicThinking: 10, peopleFocus: 12, timeHorizon: 10 },
      },
      {
        text: 'Greenwash marketing campaign',
        effect: { capital: -500, satisfaction: -5 },
        dimensions: { riskTolerance: 8, strategicThinking: -8, peopleFocus: -10, timeHorizon: -8 },
      },
      {
        text: 'Ignore and focus on profitability',
        effect: { capital: 0, satisfaction: 0 },
        dimensions: { riskTolerance: -5, strategicThinking: -5, peopleFocus: -8, timeHorizon: -5 },
      },
    ],
  },
  {
    title: 'Tech Upgrade',
    context: 'An AI routing system promises 30% logistics savings but requires $3K upfront and 2-week integration.',
    affectedNode: 3,
    ticker: 'TECH: AI logistics platforms report average 28% cost reduction for early adopters',
    choices: [
      {
        text: 'Full implementation now',
        effect: { capital: -3000, satisfaction: 20 },
        dimensions: { riskTolerance: 12, strategicThinking: 10, peopleFocus: -5, timeHorizon: 12 },
      },
      {
        text: 'Pilot in one region first',
        effect: { capital: -1000, satisfaction: 5 },
        dimensions: { riskTolerance: -5, strategicThinking: 8, peopleFocus: 5, timeHorizon: 5 },
      },
      {
        text: 'Wait and see competitor results',
        effect: { capital: 0, satisfaction: -10 },
        dimensions: { riskTolerance: -10, strategicThinking: -8, peopleFocus: 8, timeHorizon: -8 },
      },
    ],
  },
];

const SUPPLY_NODES = ['Supplier', 'Factory', 'Warehouse', 'Customer'];
const NODE_ICONS = ['inventory_2', 'precision_manufacturing', 'warehouse', 'person'];

const INNOVATION_DECISIONS: InnovationDecision[] = [
  {
    title: 'Concept Launch',
    context: 'You\'re launching a fintech app. Which MVP approach do you take?',
    choices: [
      { text: 'Copy proven successful features (Low Risk)', type: 'safe', marketResponse: 'Steady approach builds initial trust with investors.', shareDelta: 3, repDelta: 5 },
      { text: 'AI-driven, no-fees model (High Risk)', type: 'risky', marketResponse: 'Bold move draws media attention and early adopters!', shareDelta: 8, repDelta: -3 },
    ],
  },
  {
    title: 'Growth Strategy',
    context: 'User growth is stalling. You need a pivot to regain momentum.',
    choices: [
      { text: 'Partnership with a traditional bank', type: 'safe', marketResponse: 'Reliable partnership reassures cautious investors.', shareDelta: 4, repDelta: 10 },
      { text: 'Gamified crypto rewards system', type: 'risky', marketResponse: 'Crypto angle divides opinion but drives viral signups!', shareDelta: 12, repDelta: -8 },
    ],
  },
  {
    title: 'Crisis Management',
    context: 'A competitor just raised $50M. How do you respond?',
    choices: [
      { text: 'Niche down to a specific segment', type: 'safe', marketResponse: 'Smart positioning builds a defensible moat.', shareDelta: 3, repDelta: 15 },
      { text: 'Expand into 3 new countries', type: 'risky', marketResponse: 'Aggressive expansion -- high burn rate worries some.', shareDelta: 15, repDelta: -10 },
    ],
  },
  {
    title: 'Product Market Fit',
    context: 'You have passionate users but a small market. What\'s next?',
    choices: [
      { text: 'Iterate on user feedback', type: 'safe', marketResponse: 'User-centric development praised by analysts.', shareDelta: 5, repDelta: 12 },
      { text: 'Pivot completely to larger market', type: 'risky', marketResponse: 'Radical pivot -- early adopters divided, VCs intrigued!', shareDelta: 7, repDelta: -5 },
    ],
  },
  {
    title: 'Exit Strategy',
    context: 'The company is sustainable but not explosive. What\'s your endgame?',
    choices: [
      { text: 'Steady profitable growth', type: 'safe', marketResponse: 'Sustainable model earns long-term investor confidence.', shareDelta: 4, repDelta: 10 },
      { text: 'Aggressive fundraising for 10x moonshot', type: 'risky', marketResponse: 'All-in bet -- press calls it "visionary or reckless."', shareDelta: 12, repDelta: -7 },
    ],
  },
];

const ARCHETYPES = [
  { min: 0, max: 0, name: 'Conservative Operator', desc: 'You prioritize stability and proven methods above all.', color: '#3b82f6', icon: 'shield' },
  { min: 1, max: 1, name: 'Cautious Builder', desc: 'You take calculated steps with minimal exposure to risk.', color: '#22c55e', icon: 'architecture' },
  { min: 2, max: 2, name: 'Balanced Strategist', desc: 'You blend innovation with pragmatism skillfully.', color: '#eab308', icon: 'balance' },
  { min: 3, max: 3, name: 'Bold Innovator', desc: 'You lean into risk when opportunity calls.', color: '#f97316', icon: 'bolt' },
  { min: 4, max: 5, name: 'Radical Disruptor', desc: 'You bet big on transformation every single time.', color: '#ef4444', icon: 'rocket_launch' },
];

// Dimension display config
const DIMENSION_CONFIG = [
  { key: 'riskTolerance' as const, label: 'Risk Tolerance', lowLabel: 'Cautious', highLabel: 'Aggressive', color: '#f97316', icon: 'explore' },
  { key: 'strategicThinking' as const, label: 'Strategic Thinking', lowLabel: 'Reactive', highLabel: 'Proactive', color: '#8b5cf6', icon: 'psychology' },
  { key: 'peopleFocus' as const, label: 'People vs Profit', lowLabel: 'People-first', highLabel: 'Profit-first', color: '#ec4899', icon: 'groups' },
  { key: 'timeHorizon' as const, label: 'Time Horizon', lowLabel: 'Short-term', highLabel: 'Long-term', color: '#06b6d4', icon: 'schedule' },
];

// ============================================================================
// INLINE KEYFRAME STYLES
// ============================================================================

const KEYFRAME_STYLES = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 8px rgba(0, 200, 80, 0.3); } 50% { box-shadow: 0 0 24px rgba(0, 200, 80, 0.7); } }
@keyframes nodePulse { 0%, 100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.12); filter: brightness(1.3); } }
@keyframes meterFill { from { width: 0; } }
@keyframes popBurst { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.8); opacity: 0.5; } 100% { transform: scale(0); opacity: 0; } }
@keyframes balloonWobble { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes fragmentFly { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.3) translate(var(--fx), var(--fy)); } }
@keyframes tickerScroll { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
@keyframes resultCardIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
@keyframes pathDraw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
@keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes headlineSlide { from { opacity: 0; transform: translateY(-20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes progressPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
@keyframes spectrumPulse { 0%, 100% { box-shadow: 0 0 0 rgba(255,255,255,0); } 50% { box-shadow: 0 0 12px rgba(255,255,255,0.3); } }
`;

// ============================================================================
// HELPER: Generate personality summary from dimensions
// ============================================================================

function generateSummary(dims: { riskTolerance: number; strategicThinking: number; peopleFocus: number; timeHorizon: number }): string {
  const parts: string[] = [];

  // Risk
  if (dims.riskTolerance >= 65) parts.push('embraces bold risks');
  else if (dims.riskTolerance >= 40) parts.push('takes calculated risks');
  else parts.push('favors caution and stability');

  // Strategic
  if (dims.strategicThinking >= 65) parts.push('thinks proactively about the future');
  else if (dims.strategicThinking >= 40) parts.push('balances reaction with planning');
  else parts.push('responds decisively to present challenges');

  // People/Profit
  if (dims.peopleFocus <= 35) parts.push('puts people and relationships first');
  else if (dims.peopleFocus <= 60) parts.push('balances people needs with business goals');
  else parts.push('drives hard toward profitability');

  // Time Horizon
  if (dims.timeHorizon >= 65) parts.push('with a long-term vision');
  else if (dims.timeHorizon >= 40) parts.push('with a balanced time perspective');
  else parts.push('with a focus on immediate results');

  return `You're a leader who ${parts[0]}, ${parts[1]}, and ${parts[2]} ${parts[3]}.`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BehavioralGame: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  // --- Master State ---
  const [masterPhase, setMasterPhase] = useState<MasterPhase>('intro');
  const startTimeRef = useRef<number>(Date.now());
  const overallTimerRef = useRef<number | null>(null);
  const [overallTime, setOverallTime] = useState(0);

  // --- Behavioral Dimensions (all start at 50) ---
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [strategicThinking, setStrategicThinking] = useState(50);
  const [peopleFocus, setPeopleFocus] = useState(50);
  const [timeHorizon, setTimeHorizon] = useState(50);

  // Snapshot after phase 1 for showing shifts
  const [p1StartDims] = useState({ riskTolerance: 50, strategicThinking: 50, peopleFocus: 50, timeHorizon: 50 });

  // --- Phase 1: Supply Chain ---
  const [p1Step, setP1Step] = useState(0);
  const [capital, setCapital] = useState(5000);
  const [satisfaction, setSatisfaction] = useState(50);
  const [p1ShowEffect, setP1ShowEffect] = useState<{ capital: number; satisfaction: number } | null>(null);
  const [p1ChoiceHistory, setP1ChoiceHistory] = useState<number[]>([]);
  const [tickerOffset, setTickerOffset] = useState(0);

  // --- Phase 2: Balloon ---
  const [balloonTimeLeft, setBalloonTimeLeft] = useState(60);
  const [totalBanked, setTotalBanked] = useState(0);
  const [roundPot, setRoundPot] = useState(0);
  const [balloonSize, setBalloonSize] = useState(10);
  const [pumps, setPumps] = useState(0);
  const [popped, setPopped] = useState(false);
  const [balloonRound, setBalloonRound] = useState(1);
  const [balloonHistory, setBalloonHistory] = useState<BalloonRound[]>([]);
  const [closeCall, setCloseCall] = useState(false);
  const balloonTimerRef = useRef<number | null>(null);

  // --- Phase 3: Innovation ---
  const [p3Step, setP3Step] = useState(0);
  const [riskyCount, setRiskyCount] = useState(0);
  const [marketShare, setMarketShare] = useState(5);
  const [reputation, setReputation] = useState(50);
  const [p3Choices, setP3Choices] = useState<InnovationChoice[]>([]);
  const [lastMarketResponse, setLastMarketResponse] = useState('');

  // Overall timer
  useEffect(() => {
    if (masterPhase === 'intro' || masterPhase === 'final') return;
    overallTimerRef.current = window.setInterval(() => {
      setOverallTime(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => { if (overallTimerRef.current) clearInterval(overallTimerRef.current); };
  }, [masterPhase]);

  // Ticker animation for Phase 1
  useEffect(() => {
    if (masterPhase !== 'phase1') return;
    const id = setInterval(() => setTickerOffset(prev => prev - 1), 30);
    return () => clearInterval(id);
  }, [masterPhase, p1Step]);

  useEffect(() => { setTickerOffset(0); }, [p1Step]);

  // Balloon timer for Phase 2
  useEffect(() => {
    if (masterPhase !== 'phase2') return;
    balloonTimerRef.current = window.setInterval(() => {
      setBalloonTimeLeft(prev => {
        if (prev <= 1) {
          setMasterPhase('phase2-results');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (balloonTimerRef.current) clearInterval(balloonTimerRef.current); };
  }, [masterPhase]);

  // Auto-bank remaining pot when Phase 2 ends
  useEffect(() => {
    if (masterPhase === 'phase2-results' && roundPot > 0) {
      setTotalBanked(b => b + roundPot);
      setBalloonHistory(h => [...h, { round: balloonRound, banked: roundPot, popped: false, pumps }]);
      setRoundPot(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterPhase]);

  // --- Format helpers ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // --- Dimension update helper ---
  const applyDimensions = (deltas: DimensionDeltas) => {
    setRiskTolerance(prev => clamp(prev + deltas.riskTolerance, 0, 100));
    setStrategicThinking(prev => clamp(prev + deltas.strategicThinking, 0, 100));
    setPeopleFocus(prev => clamp(prev + deltas.peopleFocus, 0, 100));
    setTimeHorizon(prev => clamp(prev + deltas.timeHorizon, 0, 100));
  };

  // --- Phase label ---
  const getPhaseLabel = () => {
    if (masterPhase === 'phase1' || masterPhase === 'phase1-results') return 'Supply Chain';
    if (masterPhase === 'phase2' || masterPhase === 'phase2-results') return 'Risk & Reward';
    return 'Innovation Path';
  };

  const getPhaseNumber = () => {
    if (masterPhase === 'phase1' || masterPhase === 'phase1-results') return 1;
    if (masterPhase === 'phase2' || masterPhase === 'phase2-results') return 2;
    return 3;
  };

  // --- Handlers ---
  const handleStart = () => {
    startTimeRef.current = Date.now();
    setMasterPhase('phase1');
  };

  const handleExit = () => {
    const progress: AssessmentProgress = {
      step: getPhaseNumber(),
      correctCount: p1ChoiceHistory.length + p3Choices.length,
      textInput: '',
      gameScore: 0,
      simState: { masterPhase, capital, satisfaction, totalBanked, marketShare, reputation, riskTolerance, strategicThinking, peopleFocus, timeHorizon },
      xpEarned: 0,
    };
    onExit(progress);
  };

  // Phase 1 handlers
  const handleP1Choice = (choiceIdx: number) => {
    const scenario = SUPPLY_SCENARIOS[p1Step];
    const choice = scenario.choices[choiceIdx];

    setP1ShowEffect(choice.effect);
    setCapital(prev => prev + choice.effect.capital);
    setSatisfaction(prev => clamp(prev + choice.effect.satisfaction, 0, 100));
    setP1ChoiceHistory(prev => [...prev, choiceIdx]);
    applyDimensions(choice.dimensions);
    onXPGain(20, `Supply Chain: ${scenario.title}`);

    setTimeout(() => {
      setP1ShowEffect(null);
      if (p1Step < SUPPLY_SCENARIOS.length - 1) {
        setP1Step(s => s + 1);
      } else {
        setMasterPhase('phase1-results');
      }
    }, 1200);
  };

  // Phase 2 handlers
  const getBalloonRisk = useCallback(() => {
    const base = 0.05;
    const sizeBonus = balloonSize > 20 ? (balloonSize - 20) * 0.02 : 0;
    return Math.min(0.95, base + sizeBonus);
  }, [balloonSize]);

  const getBalloonColor = useCallback(() => {
    const risk = getBalloonRisk();
    if (risk < 0.15) return { fill: '#22c55e', stroke: '#16a34a', label: 'LOW' };
    if (risk < 0.30) return { fill: '#eab308', stroke: '#ca8a04', label: 'MED' };
    if (risk < 0.50) return { fill: '#f97316', stroke: '#ea580c', label: 'HIGH' };
    return { fill: '#ef4444', stroke: '#dc2626', label: 'MAX' };
  }, [getBalloonRisk]);

  const handlePump = () => {
    if (popped || masterPhase !== 'phase2') return;
    const risk = getBalloonRisk();

    if (Math.random() < risk) {
      setPopped(true);
      setBalloonHistory(h => [...h, { round: balloonRound, banked: 0, popped: true, pumps: pumps + 1 }]);
      setTimeout(() => {
        setPopped(false);
        setBalloonSize(10);
        setRoundPot(0);
        setPumps(0);
        setBalloonRound(r => r + 1);
      }, 1200);
    } else {
      setBalloonSize(s => s + 5);
      setRoundPot(p => p + 10);
      setPumps(p => p + 1);
      if (risk > 0.30) {
        setCloseCall(true);
        setTimeout(() => setCloseCall(false), 800);
      }
      onXPGain(2, 'Brave pump');
    }
  };

  const handleBank = () => {
    if (popped || roundPot === 0 || masterPhase !== 'phase2') return;
    setTotalBanked(b => b + roundPot);
    setBalloonHistory(h => [...h, { round: balloonRound, banked: roundPot, popped: false, pumps }]);
    onXPGain(Math.round(roundPot / 5), 'Smart bank');
    setBalloonSize(10);
    setRoundPot(0);
    setPumps(0);
    setBalloonRound(r => r + 1);
  };

  // Compute balloon behavioral adjustments
  const computeBalloonDimensions = useCallback(() => {
    const completedRounds = balloonHistory;
    if (completedRounds.length === 0) return { riskDelta: 0, description: 'No rounds completed', pattern: 'neutral' };

    const totalPumps = completedRounds.reduce((sum, r) => sum + r.pumps, 0);
    const avgPumps = totalPumps / completedRounds.length;
    const earlyBanks = completedRounds.filter(r => !r.popped && r.pumps < 3).length;
    const aggressivePushes = completedRounds.filter(r => r.pumps > 5).length;
    const popCount = completedRounds.filter(r => r.popped).length;

    let riskDelta = 0;
    let description = '';
    let pattern = 'balanced';

    // Average pump count adjustment
    if (avgPumps < 3) {
      riskDelta -= 15;
      pattern = 'cautious';
      description = `You banked early ${earlyBanks} time${earlyBanks !== 1 ? 's' : ''} -- cautious, safety-first approach.`;
    } else if (avgPumps > 5) {
      riskDelta += 15;
      pattern = 'aggressive';
      description = `You pushed past the danger zone ${aggressivePushes} time${aggressivePushes !== 1 ? 's' : ''} -- aggressive risk-taker.`;
    } else {
      description = `Avg ${avgPumps.toFixed(1)} pumps per round -- balanced risk management.`;
    }

    // Popping adjustment
    if (popCount >= 3) {
      riskDelta += 10;
      description += ` Popped ${popCount} times -- you push limits.`;
    } else if (popCount === 0 && completedRounds.length >= 3) {
      riskDelta -= 5;
      description += ' Never popped -- disciplined restraint.';
    } else if (popCount > 0) {
      description += ` Popped ${popCount} time${popCount !== 1 ? 's' : ''}.`;
    }

    return { riskDelta, description, pattern, earlyBanks, aggressivePushes, popCount, avgPumps };
  }, [balloonHistory]);

  // Phase 3 handlers
  const handleP3Choice = (choiceIdx: 0 | 1) => {
    const decision = INNOVATION_DECISIONS[p3Step];
    const choice = decision.choices[choiceIdx];

    setRiskyCount(prev => prev + (choice.type === 'risky' ? 1 : 0));
    setMarketShare(ms => clamp(ms + choice.shareDelta, 0, 100));
    setReputation(r => clamp(r + choice.repDelta, 0, 100));
    setP3Choices(prev => [...prev, { step: p3Step, type: choice.type }]);
    setLastMarketResponse(choice.marketResponse);

    // Apply dimension impacts for Phase 3
    if (choice.type === 'risky') {
      applyDimensions({ riskTolerance: 5, strategicThinking: 8, peopleFocus: 0, timeHorizon: 5 });
    } else {
      applyDimensions({ riskTolerance: -5, strategicThinking: -3, peopleFocus: 5, timeHorizon: -5 });
    }

    onXPGain(15, `Innovation: ${decision.title}`);
    setMasterPhase('phase3-response');
  };

  const handleP3Continue = () => {
    if (p3Step < INNOVATION_DECISIONS.length - 1) {
      setP3Step(s => s + 1);
      setMasterPhase('phase3');
    } else {
      setMasterPhase('phase3-results');
    }
  };

  // Final
  const getArchetype = () => {
    return ARCHETYPES.find(a => riskyCount >= a.min && riskyCount <= a.max) || ARCHETYPES[2];
  };

  const handleFinalComplete = () => {
    const archetype = getArchetype();
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      score: Math.round((riskTolerance + strategicThinking + (100 - peopleFocus) + timeHorizon) / 4),
      rawScore: 0,
      timeSpent,
      type: 'game',
      metrics: { riskTolerance, strategicThinking, peopleFocus, timeHorizon },
      data: {
        profile: { riskTolerance, strategicThinking, peopleFocus, timeHorizon },
        archetype: archetype.name,
        phase1Choices: p1ChoiceHistory,
        balloonHistory,
        phase3Choices: p3Choices,
      },
    };
    onComplete(result);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderHUD = () => {
    const phaseNum = getPhaseNumber();
    const phaseLabel = getPhaseLabel();

    return (
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={handleExit}
          className="flex items-center gap-1 px-3 py-2 text-sm text-text-muted hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Exit
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Phase {phaseNum}/3</span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="size-2.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: n < phaseNum ? '#00c850' : n === phaseNum ? '#00c850' : 'rgba(128,128,128,0.3)',
                  boxShadow: n === phaseNum ? '0 0 8px rgba(0,200,80,0.5)' : 'none',
                }}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-text-main dark:text-white">{phaseLabel}</span>
        </div>

        <div className="font-mono text-sm font-bold text-text-muted">
          {formatTime(overallTime)}
        </div>
      </div>
    );
  };

  // Meter bar component (for engagement meters: capital, satisfaction, etc.)
  const MeterBar = ({ label, value, max, color, icon, suffix, delta }: {
    label: string; value: number; max: number; color: string; icon: string; suffix?: string; delta?: number | null;
  }) => {
    const pct = clamp((value / max) * 100, 0, 100);
    return (
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm" style={{ color }}>{icon}</span>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-black text-text-main dark:text-white">{suffix === '$' ? `$${value.toLocaleString()}` : `${value}%`}</span>
            {delta != null && delta !== 0 && (
              <span
                className="text-xs font-bold"
                style={{
                  color: delta > 0 ? '#22c55e' : '#ef4444',
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                {delta > 0 ? '+' : ''}{suffix === '$' ? `$${delta.toLocaleString()}` : delta}
              </span>
            )}
          </div>
        </div>
        <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}40`,
            }}
          />
        </div>
      </div>
    );
  };

  // Spectrum bar component for behavioral dimensions
  const SpectrumBar = ({ dimKey, value, animate = false }: {
    dimKey: typeof DIMENSION_CONFIG[number]['key']; value: number; animate?: boolean;
  }) => {
    const config = DIMENSION_CONFIG.find(d => d.key === dimKey)!;
    return (
      <div className="mb-3" style={animate ? { animation: 'fadeIn 0.4s ease-out' } : undefined}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm" style={{ color: config.color }}>{config.icon}</span>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{config.label}</span>
          </div>
          <span className="text-xs font-black text-text-main dark:text-white tabular-nums">{value}</span>
        </div>
        <div className="relative">
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden relative">
            {/* Center marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30 dark:bg-white/20 z-10" />
            {/* Fill bar */}
            <div
              className="absolute top-0 h-full rounded-full transition-all duration-700 ease-out"
              style={{
                left: value >= 50 ? '50%' : `${value}%`,
                width: value >= 50 ? `${value - 50}%` : `${50 - value}%`,
                backgroundColor: config.color,
                boxShadow: `0 0 8px ${config.color}50`,
              }}
            />
            {/* Indicator dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full border-2 border-white shadow-md transition-all duration-700 ease-out z-20"
              style={{
                left: `calc(${value}% - 7px)`,
                backgroundColor: config.color,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-text-muted">{config.lowLabel}</span>
            <span className="text-[10px] text-text-muted">{config.highLabel}</span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // --- INTRO ---
  if (masterPhase === 'intro') {
    return (
      <>
        <style>{KEYFRAME_STYLES}</style>
        <GameIntro
          title="Startup Survival"
          description="Navigate supply chain crises, manage risk under pressure, and chart your startup's innovation path. There are no right or wrong answers -- every choice builds your unique behavioral profile."
          icon="rocket_launch"
          duration="~25 min"
          rules={[
            'Phase 1: Make 4 supply chain decisions that reveal your leadership style',
            'Phase 2: A 60-second risk/reward balloon game -- how far will you push?',
            'Phase 3: 5 strategic startup decisions that shape your innovation profile',
            'Your choices build a 4-dimension behavioral profile -- no scores, just you',
          ]}
          onStart={handleStart}
        />
      </>
    );
  }

  // --- PHASE 1: SUPPLY CHAIN ---
  if (masterPhase === 'phase1') {
    const scenario = SUPPLY_SCENARIOS[p1Step];

    return (
      <>
        <style>{KEYFRAME_STYLES}</style>
        <div className="max-w-3xl mx-auto mt-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {renderHUD()}

          {/* News Ticker */}
          <div className="bg-gray-900 text-white px-4 py-2 rounded-xl mb-4 overflow-hidden relative">
            <div className="flex items-center gap-2">
              <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shrink-0">LIVE</span>
              <div className="overflow-hidden flex-1">
                <div
                  className="whitespace-nowrap text-sm font-medium text-gray-300"
                  style={{ transform: `translateX(${tickerOffset}px)` }}
                >
                  {scenario.ticker}
                </div>
              </div>
            </div>
          </div>

          {/* Supply Chain Diagram */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl border border-text-main/5 dark:border-white/5 p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              {SUPPLY_NODES.map((node, i) => (
                <React.Fragment key={node}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="size-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                      style={{
                        backgroundColor: i === scenario.affectedNode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 200, 80, 0.1)',
                        border: `2px solid ${i === scenario.affectedNode ? '#ef4444' : 'rgba(0, 200, 80, 0.3)'}`,
                        animation: i === scenario.affectedNode ? 'nodePulse 1.5s ease-in-out infinite' : 'none',
                        boxShadow: i === scenario.affectedNode ? '0 0 16px rgba(239, 68, 68, 0.4)' : 'none',
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ color: i === scenario.affectedNode ? '#ef4444' : '#00c850' }}
                      >
                        {NODE_ICONS[i]}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{node}</span>
                  </div>
                  {i < SUPPLY_NODES.length - 1 && (
                    <div className="flex-1 mx-2 flex items-center">
                      <div
                        className="h-0.5 w-full rounded-full"
                        style={{
                          backgroundColor: (i === scenario.affectedNode || i + 1 === scenario.affectedNode) ? '#ef4444' : 'rgba(0, 200, 80, 0.4)',
                        }}
                      />
                      <span
                        className="material-symbols-outlined text-base -ml-1"
                        style={{
                          color: (i === scenario.affectedNode || i + 1 === scenario.affectedNode) ? '#ef4444' : 'rgba(0, 200, 80, 0.4)',
                        }}
                      >
                        chevron_right
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Engagement Meters */}
          <div className="flex gap-4 mb-4">
            <MeterBar
              label="Capital"
              value={capital}
              max={10000}
              color="#3b82f6"
              icon="account_balance"
              suffix="$"
              delta={p1ShowEffect?.capital ?? null}
            />
            <MeterBar
              label="Satisfaction"
              value={satisfaction}
              max={100}
              color="#22c55e"
              icon="sentiment_satisfied"
              delta={p1ShowEffect?.satisfaction ?? null}
            />
          </div>

          {/* Scenario Card */}
          <div
            className="bg-card-bg dark:bg-card-bg-dark rounded-2xl border border-text-main/5 dark:border-white/5 p-6"
            style={{ animation: 'slideLeft 0.4s ease-out' }}
            key={`p1-scenario-${p1Step}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Scenario {p1Step + 1}/4</span>
            </div>
            <h3 className="text-xl font-black text-text-main dark:text-white mb-2">{scenario.title}</h3>
            <p className="text-sm text-text-muted mb-5">{scenario.context}</p>

            <div className="space-y-3">
              {scenario.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleP1Choice(i)}
                  disabled={p1ShowEffect !== null}
                  className="w-full text-left p-4 rounded-xl border border-text-main/10 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-black text-primary group-hover:bg-primary/20 transition-colors">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text-main dark:text-white">{choice.text}</p>
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-xs" style={{ color: choice.effect.capital >= 0 ? '#22c55e' : '#ef4444' }}>
                          {choice.effect.capital >= 0 ? '+' : ''}${choice.effect.capital.toLocaleString()}
                        </span>
                        <span className="text-xs" style={{ color: choice.effect.satisfaction >= 0 ? '#22c55e' : '#ef4444' }}>
                          {choice.effect.satisfaction >= 0 ? '+' : ''}{choice.effect.satisfaction}% sat
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {SUPPLY_SCENARIOS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === p1Step ? '24px' : '8px',
                  backgroundColor: i < p1Step ? '#00c850' : i === p1Step ? '#00c850' : 'rgba(128,128,128,0.3)',
                }}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  // --- PHASE 1 RESULTS ---
  if (masterPhase === 'phase1-results') {
    return (
      <>
        <style>{KEYFRAME_STYLES}</style>
        <div className="max-w-lg mx-auto mt-12" style={{ animation: 'resultCardIn 0.5s ease-out' }}>
          {renderHUD()}
          <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
            <div className="text-center mb-6">
              <div className="size-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-blue-500">local_shipping</span>
              </div>
              <h2 className="text-2xl font-black text-text-main dark:text-white mb-1">Phase 1 Complete</h2>
              <p className="text-sm text-text-muted mb-2">Your decisions reveal these behavioral shifts</p>
            </div>

            {/* Engagement stats (small, secondary) */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Final Capital</p>
                <p className="text-lg font-black" style={{ color: capital >= 0 ? '#22c55e' : '#ef4444' }}>
                  ${capital.toLocaleString()}
                </p>
              </div>
              <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Satisfaction</p>
                <p className="text-lg font-black text-primary">{satisfaction}%</p>
              </div>
            </div>

            {/* Dimension Spectrum Bars */}
            <div className="bg-background-light dark:bg-white/5 rounded-2xl p-5 mb-6">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Behavioral Profile Shifts</p>
              {DIMENSION_CONFIG.map((dim, i) => (
                <div key={dim.key} style={{ animation: `fadeIn 0.4s ease-out ${i * 0.1}s both` }}>
                  <SpectrumBar
                    dimKey={dim.key}
                    value={
                      dim.key === 'riskTolerance' ? riskTolerance :
                      dim.key === 'strategicThinking' ? strategicThinking :
                      dim.key === 'peopleFocus' ? peopleFocus :
                      timeHorizon
                    }
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setBalloonTimeLeft(60);
                setMasterPhase('phase2');
              }}
              className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              Continue to Phase 2
            </button>
          </div>
        </div>
      </>
    );
  }

  // --- PHASE 2: BALLOON RISK ---
  if (masterPhase === 'phase2') {
    const risk = getBalloonRisk();
    const riskPct = Math.round(risk * 100);
    const color = getBalloonColor();
    const bWidth = Math.min(180, 60 + balloonSize * 1.5);
    const bHeight = Math.min(240, 80 + balloonSize * 2.2);
    const wobble = Math.min(6, (balloonSize - 10) * 0.12);

    return (
      <>
        <style>{KEYFRAME_STYLES}</style>
        <div className="max-w-3xl mx-auto mt-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {renderHUD()}

          {/* Balloon HUD */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <span className="text-xs text-text-muted">Total Banked</span>
              <p className="text-2xl font-black text-text-main dark:text-white">${totalBanked}</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-text-muted">Round {balloonRound}</span>
              <p className="text-lg font-bold text-primary">${roundPot} pot</p>
            </div>
            <div
              className="font-mono font-bold text-xl"
              style={{ color: balloonTimeLeft < 15 ? '#ef4444' : undefined, animation: balloonTimeLeft < 15 ? 'progressPulse 0.5s ease-in-out infinite' : 'none' }}
            >
              0:{balloonTimeLeft.toString().padStart(2, '0')}
            </div>
          </div>

          <div className="flex gap-4">
            {/* Main Balloon Area */}
            <div className="flex-1 bg-card-bg dark:bg-card-bg-dark rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 overflow-hidden">
              <div className="h-72 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Close call */}
                {closeCall && (
                  <div
                    className="absolute top-4 left-1/2 z-20 px-4 py-1 bg-orange-500 text-white font-black text-sm rounded-full"
                    style={{ transform: 'translateX(-50%)', animation: 'fadeUp 0.8s ease-out forwards' }}
                  >
                    Close call!
                  </div>
                )}

                {popped ? (
                  <div className="flex flex-col items-center" style={{ animation: 'popBurst 0.5s ease-out' }}>
                    {Array.from({ length: 8 }).map((_, i) => {
                      const angle = i * 45;
                      const dist = 30 + Math.random() * 40;
                      const fx = Math.cos((angle * Math.PI) / 180) * dist;
                      const fy = Math.sin((angle * Math.PI) / 180) * dist;
                      return (
                        <div
                          key={i}
                          className="absolute size-3 rounded-full"
                          style={{
                            backgroundColor: color.fill,
                            '--fx': `${fx}px`,
                            '--fy': `${fy}px`,
                            animation: `fragmentFly 0.8s ease-out ${i * 0.03}s forwards`,
                          } as React.CSSProperties}
                        />
                      );
                    })}
                    <span className="text-red-500 font-black text-3xl" style={{ animation: 'fadeIn 0.3s ease-out' }}>POPPED!</span>
                    <span className="text-red-400 text-sm mt-1">-${roundPot > 0 ? roundPot : 'pot lost'}</span>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center"
                    style={{ animation: wobble > 0 ? `balloonWobble ${Math.max(0.3, 1 - wobble * 0.08)}s ease-in-out infinite` : 'none' }}
                  >
                    <svg width={bWidth} height={bHeight + 40} viewBox={`0 0 ${bWidth} ${bHeight + 40}`}>
                      <defs>
                        <radialGradient id="balloonGrad" cx="35%" cy="30%">
                          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                          <stop offset="100%" stopColor={color.fill} stopOpacity="1" />
                        </radialGradient>
                      </defs>
                      {/* Balloon body (teardrop) */}
                      <ellipse
                        cx={bWidth / 2}
                        cy={bHeight * 0.45}
                        rx={bWidth * 0.42}
                        ry={bHeight * 0.45}
                        fill="url(#balloonGrad)"
                        stroke={color.stroke}
                        strokeWidth="2"
                      />
                      {/* Knot */}
                      <polygon
                        points={`${bWidth / 2 - 6},${bHeight * 0.88} ${bWidth / 2 + 6},${bHeight * 0.88} ${bWidth / 2},${bHeight * 0.94}`}
                        fill={color.stroke}
                      />
                      {/* String */}
                      <path
                        d={`M ${bWidth / 2} ${bHeight * 0.94} Q ${bWidth / 2 - 8} ${bHeight + 15} ${bWidth / 2 + 4} ${bHeight + 35}`}
                        stroke={color.stroke}
                        strokeWidth="1.5"
                        fill="none"
                        strokeDasharray="4 2"
                      />
                      {/* Shine highlight */}
                      <ellipse
                        cx={bWidth * 0.38}
                        cy={bHeight * 0.3}
                        rx={bWidth * 0.08}
                        ry={bHeight * 0.1}
                        fill="white"
                        opacity="0.3"
                        transform={`rotate(-20 ${bWidth * 0.38} ${bHeight * 0.3})`}
                      />
                    </svg>
                    {/* Pot display inside balloon area */}
                    <div className="absolute text-center" style={{ top: `calc(50% - ${bHeight * 0.15}px)` }}>
                      <p className="text-2xl font-black text-white drop-shadow-lg">${roundPot}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 p-4">
                <button
                  onClick={handlePump}
                  disabled={popped}
                  className="flex-1 py-3.5 bg-orange-500 text-white font-black text-base rounded-xl hover:bg-orange-600 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">air</span>
                  PUMP (+$10)
                </button>
                <button
                  onClick={handleBank}
                  disabled={popped || roundPot === 0}
                  className="flex-1 py-3.5 bg-primary text-black font-black text-base rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">savings</span>
                  BANK (${roundPot})
                </button>
              </div>
            </div>

            {/* Side Panel */}
            <div className="w-48 space-y-3">
              {/* Risk Thermometer */}
              <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl border border-text-main/5 dark:border-white/5 p-4">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Pop Risk</p>
                <div className="relative h-36 w-6 mx-auto bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full rounded-full transition-all duration-300"
                    style={{
                      height: `${riskPct}%`,
                      backgroundColor: color.fill,
                      boxShadow: `0 0 8px ${color.fill}60`,
                    }}
                  />
                </div>
                <p className="text-center mt-2 text-sm font-black" style={{ color: color.fill }}>{riskPct}%</p>
                <p className="text-center text-[10px] font-bold text-text-muted">{color.label}</p>
              </div>

              {/* Bank History */}
              <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl border border-text-main/5 dark:border-white/5 p-4">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">History</p>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {balloonHistory.length === 0 && (
                    <p className="text-xs text-text-muted italic">No rounds yet</p>
                  )}
                  {balloonHistory.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1 border-b border-black/5 dark:border-white/5 last:border-0"
                    >
                      <span className="font-bold text-text-muted">R{h.round}</span>
                      <span className={h.popped ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>
                        {h.popped ? 'POP' : `$${h.banked}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- PHASE 2 RESULTS ---
  if (masterPhase === 'phase2-results') {
    const balloonData = computeBalloonDimensions();
    const poppedCount = balloonHistory.filter(h => h.popped).length;
    const bankedCount = balloonHistory.filter(h => !h.popped).length;

    // Apply balloon risk tolerance adjustment once when entering this phase
    // (We use a ref trick: check if we already applied it)
    const riskAfterBalloon = clamp(riskTolerance + balloonData.riskDelta, 0, 100);

    const patternIcon = balloonData.pattern === 'cautious' ? 'shield' : balloonData.pattern === 'aggressive' ? 'local_fire_department' : 'balance';
    const patternColor = balloonData.pattern === 'cautious' ? '#3b82f6' : balloonData.pattern === 'aggressive' ? '#ef4444' : '#eab308';
    const patternLabel = balloonData.pattern === 'cautious' ? 'Cautious Player' : balloonData.pattern === 'aggressive' ? 'Aggressive Risk-Taker' : 'Balanced Strategist';

    return (
      <>
        <style>{KEYFRAME_STYLES}</style>
        <div className="max-w-lg mx-auto mt-12" style={{ animation: 'resultCardIn 0.5s ease-out' }}>
          {renderHUD()}
          <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
            <div className="text-center mb-5">
              <div className="size-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${patternColor}15` }}>
                <span className="material-symbols-outlined text-4xl" style={{ color: patternColor }}>{patternIcon}</span>
              </div>
              <h2 className="text-2xl font-black text-text-main dark:text-white mb-1">Your Risk Pattern</h2>
              <div
                className="inline-block px-4 py-1.5 rounded-full text-sm font-black mt-1"
                style={{ backgroundColor: `${patternColor}15`, color: patternColor }}
              >
                {patternLabel}
              </div>
            </div>

            {/* Pattern description */}
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-5 text-center">
              <p className="text-sm text-text-main dark:text-white">{balloonData.description}</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Rounds</p>
                <p className="text-xl font-black text-text-main dark:text-white">{balloonHistory.length}</p>
              </div>
              <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Banked</p>
                <p className="text-xl font-black text-green-500">{bankedCount}</p>
              </div>
              <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Popped</p>
                <p className="text-xl font-black text-red-500">{poppedCount}</p>
              </div>
            </div>

            {/* Risk Tolerance shift */}
            <div className="bg-background-light dark:bg-white/5 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Risk Tolerance Impact</span>
                <span className="text-xs font-black" style={{ color: balloonData.riskDelta > 0 ? '#f97316' : balloonData.riskDelta < 0 ? '#3b82f6' : '#888' }}>
                  {balloonData.riskDelta > 0 ? '+' : ''}{balloonData.riskDelta}
                </span>
              </div>
              <SpectrumBar dimKey="riskTolerance" value={riskAfterBalloon} />
            </div>

            <button
              onClick={() => {
                // Apply the balloon dimension shift
                setRiskTolerance(riskAfterBalloon);
                setMasterPhase('phase3');
              }}
              className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              Continue to Phase 3
            </button>
          </div>
        </div>
      </>
    );
  }

  // --- PHASE 3: INNOVATION PATH ---
  if (masterPhase === 'phase3') {
    const decision = INNOVATION_DECISIONS[p3Step];

    return (
      <>
        <style>{KEYFRAME_STYLES}</style>
        <div className="max-w-3xl mx-auto mt-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {renderHUD()}

          {/* Branching Path Visual */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl border border-text-main/5 dark:border-white/5 p-4 mb-4">
            <div className="flex items-center justify-center gap-1">
              {INNOVATION_DECISIONS.map((_, i) => {
                const choice = p3Choices[i];
                const isCurrent = i === p3Step;
                const isPast = i < p3Step;
                let bg = 'rgba(128,128,128,0.2)';
                let borderColor = 'transparent';
                if (isPast && choice) {
                  bg = choice.type === 'safe' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)';
                  borderColor = choice.type === 'safe' ? '#3b82f6' : '#f97316';
                }
                if (isCurrent) {
                  bg = 'rgba(0, 200, 80, 0.1)';
                  borderColor = '#00c850';
                }

                return (
                  <React.Fragment key={i}>
                    <div
                      className="size-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300"
                      style={{
                        backgroundColor: bg,
                        border: `2px solid ${borderColor}`,
                        color: isPast && choice ? (choice.type === 'safe' ? '#3b82f6' : '#f97316') : isCurrent ? '#00c850' : 'rgba(128,128,128,0.5)',
                        boxShadow: isCurrent ? '0 0 12px rgba(0, 200, 80, 0.3)' : 'none',
                      }}
                    >
                      {isPast && choice ? (choice.type === 'safe' ? 'S' : 'R') : i + 1}
                    </div>
                    {i < INNOVATION_DECISIONS.length - 1 && (
                      <div
                        className="w-8 h-0.5 rounded-full"
                        style={{
                          backgroundColor: isPast ? (choice?.type === 'safe' ? '#3b82f6' : '#f97316') : 'rgba(128,128,128,0.2)',
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-text-muted">Safe</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-orange-500" />
                <span className="text-[10px] text-text-muted">Risky</span>
              </div>
            </div>
          </div>

          {/* Engagement Meters (kept for engagement) */}
          <div className="flex gap-4 mb-4">
            <MeterBar
              label="Market Share"
              value={marketShare}
              max={100}
              color="#8b5cf6"
              icon="trending_up"
            />
            <MeterBar
              label="Brand Reputation"
              value={reputation}
              max={100}
              color="#f59e0b"
              icon="star"
            />
          </div>

          {/* Decision Card */}
          <div
            className="bg-card-bg dark:bg-card-bg-dark rounded-2xl border border-text-main/5 dark:border-white/5 p-6"
            style={{ animation: 'slideLeft 0.4s ease-out' }}
            key={`p3-decision-${p3Step}`}
          >
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Decision {p3Step + 1}/5</span>
            <h3 className="text-xl font-black text-text-main dark:text-white mt-1 mb-2">{decision.title}</h3>
            <p className="text-sm text-text-muted mb-5">{decision.context}</p>

            <div className="grid grid-cols-2 gap-3">
              {decision.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleP3Choice(i as 0 | 1)}
                  className="text-left p-4 rounded-xl border-2 transition-all duration-200 active:scale-[0.97] group"
                  style={{
                    borderColor: choice.type === 'safe' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(249, 115, 22, 0.3)',
                    backgroundColor: choice.type === 'safe' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(249, 115, 22, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = choice.type === 'safe' ? '#3b82f6' : '#f97316';
                    (e.currentTarget as HTMLElement).style.backgroundColor = choice.type === 'safe' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = choice.type === 'safe' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(249, 115, 22, 0.3)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = choice.type === 'safe' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(249, 115, 22, 0.05)';
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="material-symbols-outlined text-lg"
                      style={{ color: choice.type === 'safe' ? '#3b82f6' : '#f97316' }}
                    >
                      {choice.type === 'safe' ? 'shield' : 'bolt'}
                    </span>
                    <span
                      className="text-[10px] font-black uppercase tracking-wider"
                      style={{ color: choice.type === 'safe' ? '#3b82f6' : '#f97316' }}
                    >
                      {choice.type === 'safe' ? 'SAFE PATH' : 'RISKY PATH'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text-main dark:text-white">{choice.text}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- PHASE 3: MARKET RESPONSE ---
  if (masterPhase === 'phase3-response') {
    return (
      <>
        <style>{KEYFRAME_STYLES}</style>
        <div className="max-w-3xl mx-auto mt-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {renderHUD()}

          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center max-w-md" style={{ animation: 'headlineSlide 0.5s ease-out' }}>
              <span className="material-symbols-outlined text-6xl text-primary mb-4 block">newspaper</span>
              <h2 className="text-2xl font-black text-text-main dark:text-white mb-3">Market Response</h2>
              <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl border border-text-main/5 dark:border-white/5 p-6 mb-6">
                <p className="text-lg font-semibold text-text-main dark:text-white italic">"{lastMarketResponse}"</p>
              </div>

              {/* Updated Meters */}
              <div className="flex gap-4 mb-6">
                <MeterBar
                  label="Market Share"
                  value={marketShare}
                  max={100}
                  color="#8b5cf6"
                  icon="trending_up"
                />
                <MeterBar
                  label="Brand Reputation"
                  value={reputation}
                  max={100}
                  color="#f59e0b"
                  icon="star"
                />
              </div>

              <button
                onClick={handleP3Continue}
                className="px-8 py-3 bg-primary text-black font-black text-base rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                {p3Step < INNOVATION_DECISIONS.length - 1 ? 'Next Decision' : 'View Results'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- PHASE 3 RESULTS ---
  if (masterPhase === 'phase3-results') {
    const archetype = getArchetype();

    return (
      <>
        <style>{KEYFRAME_STYLES}</style>
        <div className="max-w-lg mx-auto mt-12" style={{ animation: 'resultCardIn 0.5s ease-out' }}>
          {renderHUD()}
          <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
            <div className="text-center mb-5">
              <div
                className="size-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${archetype.color}15` }}
              >
                <span className="material-symbols-outlined text-4xl" style={{ color: archetype.color }}>{archetype.icon}</span>
              </div>
              <h2 className="text-2xl font-black text-text-main dark:text-white mb-1">Phase 3 Complete</h2>
              <p className="text-sm text-text-muted mb-3">Innovation Path Results</p>

              <div
                className="inline-block px-4 py-2 rounded-full text-sm font-black mb-2"
                style={{ backgroundColor: `${archetype.color}15`, color: archetype.color }}
              >
                {archetype.name}
              </div>
              <p className="text-sm text-text-muted mb-4">{archetype.desc}</p>
            </div>

            {/* Choice trail */}
            <div className="flex justify-center gap-2 mb-5">
              {p3Choices.map((c, i) => (
                <div
                  key={i}
                  className="size-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ backgroundColor: c.type === 'safe' ? '#3b82f6' : '#f97316' }}
                >
                  {c.type === 'safe' ? 'S' : 'R'}
                </div>
              ))}
            </div>

            {/* Updated dimensions */}
            <div className="bg-background-light dark:bg-white/5 rounded-2xl p-5 mb-6">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Updated Profile</p>
              {DIMENSION_CONFIG.map((dim, i) => (
                <div key={dim.key} style={{ animation: `fadeIn 0.4s ease-out ${i * 0.1}s both` }}>
                  <SpectrumBar
                    dimKey={dim.key}
                    value={
                      dim.key === 'riskTolerance' ? riskTolerance :
                      dim.key === 'strategicThinking' ? strategicThinking :
                      dim.key === 'peopleFocus' ? peopleFocus :
                      timeHorizon
                    }
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setMasterPhase('final')}
              className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              View Behavioral Profile
            </button>
          </div>
        </div>
      </>
    );
  }

  // --- FINAL SUMMARY: BEHAVIORAL PROFILE CARD ---
  if (masterPhase === 'final') {
    const archetype = getArchetype();
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const dims = { riskTolerance, strategicThinking, peopleFocus, timeHorizon };
    const summary = generateSummary(dims);

    return (
      <>
        <style>{KEYFRAME_STYLES}</style>
        <div className="max-w-lg mx-auto mt-8" style={{ animation: 'resultCardIn 0.6s ease-out' }}>
          <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="size-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}>
                <span className="material-symbols-outlined text-5xl text-primary">psychology</span>
              </div>
              <h2 className="text-3xl font-black text-text-main dark:text-white mb-1">Behavioral Profile</h2>
              <p className="text-sm text-text-muted">Your unique leadership fingerprint</p>
            </div>

            {/* 4 Dimension Spectrum Bars */}
            <div className="bg-background-light dark:bg-white/5 rounded-2xl p-5 mb-5">
              {DIMENSION_CONFIG.map((dim, i) => (
                <div key={dim.key} style={{ animation: `fadeIn 0.5s ease-out ${i * 0.15}s both` }}>
                  <SpectrumBar
                    dimKey={dim.key}
                    value={
                      dim.key === 'riskTolerance' ? riskTolerance :
                      dim.key === 'strategicThinking' ? strategicThinking :
                      dim.key === 'peopleFocus' ? peopleFocus :
                      timeHorizon
                    }
                  />
                </div>
              ))}
            </div>

            {/* Archetype Badge */}
            <div className="bg-background-light dark:bg-white/5 rounded-2xl p-4 mb-5 text-center">
              <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">Innovation Archetype</p>
              <div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black"
                style={{ backgroundColor: `${archetype.color}15`, color: archetype.color }}
              >
                <span className="material-symbols-outlined text-lg">{archetype.icon}</span>
                {archetype.name}
              </div>
            </div>

            {/* Personality Summary */}
            <div className="bg-background-light dark:bg-white/5 rounded-2xl p-5 mb-5 text-center">
              <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">Leadership Summary</p>
              <p className="text-base font-semibold text-text-main dark:text-white leading-relaxed" style={{ animation: 'fadeIn 0.6s ease-out 0.3s both' }}>
                {summary}
              </p>
            </div>

            {/* Time */}
            <div className="flex items-center justify-center gap-2 text-sm text-text-muted mb-6">
              <span className="material-symbols-outlined text-base">timer</span>
              <span>Completed in {formatTime(timeSpent)}</span>
            </div>

            <button
              onClick={handleFinalComplete}
              className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              View Profile
            </button>
          </div>
        </div>
      </>
    );
  }

  // Fallback (should never reach)
  return null;
};
