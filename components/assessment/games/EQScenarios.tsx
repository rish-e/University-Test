import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'scenario' | 'impact' | 'profile';

type DimensionKey = 'empathy' | 'selfRegulation' | 'ethical' | 'leadership' | 'adaptability';

interface DimensionImpact {
  empathy?: number;
  selfRegulation?: number;
  ethical?: number;
  leadership?: number;
  adaptability?: number;
}

interface Choice {
  label: string;
  text: string;
  impact: DimensionImpact;
}

interface Scenario {
  title: string;
  icon: string;
  context: string;
  choices: Choice[];
}

// ─── Dimension Metadata ──────────────────────────────────────────────────────

const DIMENSIONS: { key: DimensionKey; label: string; color: string; colorDark: string }[] = [
  { key: 'empathy', label: 'Empathy', color: '#ec4899', colorDark: '#f472b6' },
  { key: 'selfRegulation', label: 'Self-Regulation', color: '#3b82f6', colorDark: '#60a5fa' },
  { key: 'ethical', label: 'Ethical Judgment', color: '#22c55e', colorDark: '#4ade80' },
  { key: 'leadership', label: 'Leadership', color: '#f97316', colorDark: '#fb923c' },
  { key: 'adaptability', label: 'Adaptability', color: '#a855f7', colorDark: '#c084fc' },
];

// ─── 10 Scenarios ────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    title: 'The Leaked Email',
    icon: 'mail_lock',
    context:
      'You accidentally discover a leaked email showing your manager plans to take credit for your team\'s project at the upcoming board presentation. The team has worked 12-hour days for three months. The presentation is tomorrow.',
    choices: [
      { label: 'A', text: 'Confront your manager privately and directly', impact: { leadership: 15, selfRegulation: 10, ethical: 5 } },
      { label: 'B', text: 'Forward the email to the whole team', impact: { ethical: 5, selfRegulation: -10, empathy: -5 } },
      { label: 'C', text: 'Discuss with a trusted colleague first', impact: { empathy: 10, adaptability: 10 } },
      { label: 'D', text: 'Let it go — pick your battles', impact: { selfRegulation: 15, leadership: -5 } },
    ],
  },
  {
    title: 'The Failing Teammate',
    icon: 'group_off',
    context:
      'A team member is consistently underperforming, causing the team to miss deadlines. Other members are frustrated and openly want them removed. You know this person recently went through a difficult personal situation but hasn\'t shared details with the team.',
    choices: [
      { label: 'A', text: 'Have a 1-on-1 to understand their challenges', impact: { empathy: 15, leadership: 10 } },
      { label: 'B', text: 'Redistribute their work quietly', impact: { adaptability: 10, ethical: -5 } },
      { label: 'C', text: 'Escalate to management immediately', impact: { ethical: 5, empathy: -10 } },
      { label: 'D', text: 'Set a clear improvement plan with a deadline', impact: { leadership: 10, selfRegulation: 10, ethical: 5 } },
    ],
  },
  {
    title: 'The Ethical Client',
    icon: 'contract_edit',
    context:
      'Your biggest client — responsible for 40% of revenue — asks you to slightly misrepresent data in a quarterly report. They say "everyone does it" and that refusing might cost you the account. Your team\'s bonuses depend on retaining this client.',
    choices: [
      { label: 'A', text: 'Refuse outright and explain the risks', impact: { ethical: 20, selfRegulation: 10, adaptability: -5 } },
      { label: 'B', text: 'Suggest alternative framing that\'s technically truthful', impact: { adaptability: 10, ethical: 5 } },
      { label: 'C', text: 'Do what they ask — you can\'t lose the client', impact: { ethical: -15, adaptability: 5 } },
      { label: 'D', text: 'Escalate to your supervisor for guidance', impact: { selfRegulation: 10, leadership: 5 } },
    ],
  },
  {
    title: 'The Public Failure',
    icon: 'podium',
    context:
      'You\'re presenting to 50 investors at a high-profile demo day. Mid-presentation, your demo crashes completely — the screen goes black. The room falls silent. All eyes are on you. Your co-founder is watching from the back row.',
    choices: [
      { label: 'A', text: 'Crack a joke, pivot to Q&A, show composure', impact: { selfRegulation: 20, adaptability: 10, leadership: 5 } },
      { label: 'B', text: 'Apologize profusely and offer to reschedule', impact: { leadership: -5, empathy: 5, selfRegulation: 5 } },
      { label: 'C', text: 'Blame the tech team for the failure', impact: { selfRegulation: -15, empathy: -10, ethical: -5 } },
      { label: 'D', text: 'Push through by explaining the concept without the demo', impact: { adaptability: 10, leadership: 10 } },
    ],
  },
  {
    title: 'The Cultural Clash',
    icon: 'diversity_3',
    context:
      'A new international team member\'s work style — including different meeting norms, communication patterns, and feedback approaches — clashes with the team\'s existing culture. Tension is rising, and two team members have complained to you privately.',
    choices: [
      { label: 'A', text: 'Organize a team workshop on cultural differences', impact: { empathy: 15, leadership: 10, adaptability: 5 } },
      { label: 'B', text: 'Ask the new member to adapt to the team\'s existing norms', impact: { empathy: -10, selfRegulation: 5 } },
      { label: 'C', text: 'Mediate a private conversation between the parties', impact: { empathy: 10, leadership: 10 } },
      { label: 'D', text: 'Restructure teams to separate the conflicting styles', impact: { adaptability: 10, empathy: -5 } },
    ],
  },
  {
    title: 'The Whistleblower Dilemma',
    icon: 'campaign',
    context:
      'You discover your company is dumping chemical waste illegally into a local river. You have clear evidence. Reporting it will almost certainly cost you your job and may trigger a lawsuit. Your family depends on your income. The company employs 200 people in a small town.',
    choices: [
      { label: 'A', text: 'Report it anonymously to regulators', impact: { ethical: 20, selfRegulation: 10 } },
      { label: 'B', text: 'Raise it internally through proper channels first', impact: { ethical: 15, leadership: 10, selfRegulation: 5 } },
      { label: 'C', text: 'Document everything and consult a lawyer', impact: { ethical: 10, selfRegulation: 10, adaptability: 5 } },
      { label: 'D', text: 'Mind your own business — it\'s not your department', impact: { ethical: -20, selfRegulation: 5 } },
    ],
  },
  {
    title: 'The Negotiation',
    icon: 'handshake',
    context:
      'A critical vendor quotes double the fair market price for components your company needs urgently. Your product launch is in two weeks. There are alternatives, but switching vendors would delay the launch by a month. Competitors are closing in.',
    choices: [
      { label: 'A', text: 'Walk away and find alternatives — never overpay', impact: { selfRegulation: 10, adaptability: 10, empathy: -5 } },
      { label: 'B', text: 'Negotiate firmly but fairly, finding middle ground', impact: { leadership: 15, empathy: 10, selfRegulation: 5 } },
      { label: 'C', text: 'Pay the price — time is more valuable than money', impact: { adaptability: 10, selfRegulation: -5 } },
      { label: 'D', text: 'Leverage your relationship to guilt them into a discount', impact: { ethical: -10, empathy: -5, adaptability: 5 } },
    ],
  },
  {
    title: 'The Burnout Signal',
    icon: 'local_fire_department',
    context:
      'Your star performer — the person who consistently delivers 150% — has started missing meetings, producing lower quality work, and seems withdrawn. Other team members are picking up the slack and growing resentful. You suspect burnout but they haven\'t said anything.',
    choices: [
      { label: 'A', text: 'Have a caring private check-in about their wellbeing', impact: { empathy: 20, leadership: 10 } },
      { label: 'B', text: 'Reduce their workload without telling them', impact: { leadership: -5, empathy: 10, adaptability: 5 } },
      { label: 'C', text: 'Send them a formal performance warning', impact: { empathy: -15, selfRegulation: 5 } },
      { label: 'D', text: 'Suggest they take PTO and reassign tasks temporarily', impact: { empathy: 10, leadership: 10, adaptability: 5 } },
    ],
  },
  {
    title: 'The Competitor Poach',
    icon: 'currency_exchange',
    context:
      'A top competitor offers you double your salary to join them. You currently lead a critical project mid-launch that your team has poured months into. Your departure would significantly set the project back. The offer has a 48-hour deadline.',
    choices: [
      { label: 'A', text: 'Accept — business is business', impact: { adaptability: 10, ethical: -15, leadership: -10 } },
      { label: 'B', text: 'Decline out of loyalty, say nothing', impact: { ethical: 15, selfRegulation: 10, adaptability: -5 } },
      { label: 'C', text: 'Use the offer to negotiate better terms at current company', impact: { adaptability: 15, leadership: 5, ethical: -5 } },
      { label: 'D', text: 'Decline, but be transparent with your company about the offer', impact: { ethical: 10, leadership: 10, selfRegulation: 10 } },
    ],
  },
  {
    title: 'The Final Call',
    icon: 'rocket_launch',
    context:
      'You must choose between launching a product that\'s 80% ready — customers are demanding it and early adopters are getting impatient — or delaying for perfection while competitors close in fast. Your engineering team is split. The board wants revenue.',
    choices: [
      { label: 'A', text: 'Launch with an honest "beta" label and iterate', impact: { adaptability: 15, leadership: 10, ethical: 5 } },
      { label: 'B', text: 'Delay and risk losing market share', impact: { ethical: 10, selfRegulation: 5, adaptability: -10 } },
      { label: 'C', text: 'Launch fully but quietly patch issues after', impact: { ethical: -5, adaptability: 10 } },
      { label: 'D', text: 'Let the team vote — share the decision', impact: { leadership: 10, empathy: 10, selfRegulation: 5 } },
    ],
  },
];

const TOTAL_SCENARIOS = SCENARIOS.length;

// ─── Personality Summaries ───────────────────────────────────────────────────

function getPersonalitySummary(scores: Record<DimensionKey, number>): string {
  const sorted = DIMENSIONS.map(d => ({ key: d.key, label: d.label, score: scores[d.key] }))
    .sort((a, b) => b.score - a.score);

  const top1 = sorted[0];
  const top2 = sorted[1];
  const low = sorted[sorted.length - 1];

  const profiles: Record<string, string> = {
    empathy: 'people-first leader who builds trust through genuine understanding',
    selfRegulation: 'composed decision-maker who thrives under pressure',
    ethical: 'principled professional who prioritizes integrity over convenience',
    leadership: 'natural leader who steps up when it matters most',
    adaptability: 'agile thinker who turns uncertainty into opportunity',
  };

  const growthAreas: Record<string, string> = {
    empathy: 'Investing more time in understanding others\' perspectives could strengthen your collaborative impact.',
    selfRegulation: 'Practicing pause-before-response in high-stakes moments could elevate your composure.',
    ethical: 'Grounding decisions more firmly in ethical principles could build deeper long-term trust.',
    leadership: 'Taking initiative in ambiguous situations could unlock your leadership potential.',
    adaptability: 'Embracing uncertainty and exploring alternative approaches could make you more versatile.',
  };

  return `You exhibit the profile of a ${profiles[top1.key]}, with strong ${top2.label.toLowerCase()} as a complementary strength. ${growthAreas[low.key]}`;
}

// ─── Radar Chart (SVG Pentagon) ──────────────────────────────────────────────

function RadarChart({ scores }: { scores: Record<DimensionKey, number> }) {
  const cx = 150;
  const cy = 150;
  const maxR = 110;
  const levels = 4;

  // Pentagon vertices (top-centered, clockwise)
  const angleOffset = -Math.PI / 2;
  const getPoint = (index: number, radius: number): [number, number] => {
    const angle = angleOffset + (2 * Math.PI * index) / 5;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  // Grid rings
  const gridRings = Array.from({ length: levels }, (_, i) => {
    const r = (maxR / levels) * (i + 1);
    const points = Array.from({ length: 5 }, (__, j) => getPoint(j, r));
    return points.map(p => p.join(',')).join(' ');
  });

  // Data polygon
  const dataPoints = DIMENSIONS.map((dim, i) => {
    const val = Math.max(0, Math.min(100, scores[dim.key]));
    const r = (val / 100) * maxR;
    return getPoint(i, r);
  });
  const dataPolygon = dataPoints.map(p => p.join(',')).join(' ');

  // Axis lines
  const axes = DIMENSIONS.map((_, i) => getPoint(i, maxR));

  // Label positions (pushed outward)
  const labelPoints = DIMENSIONS.map((dim, i) => {
    const [lx, ly] = getPoint(i, maxR + 28);
    return { ...dim, x: lx, y: ly, score: scores[dim.key] };
  });

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[280px] mx-auto">
      {/* Grid */}
      {gridRings.map((ring, i) => (
        <polygon
          key={i}
          points={ring}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="0.8"
        />
      ))}

      {/* Axes */}
      {axes.map(([ax, ay], i) => (
        <line
          key={i}
          x1={cx} y1={cy} x2={ax} y2={ay}
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="0.8"
        />
      ))}

      {/* Data fill */}
      <polygon
        points={dataPolygon}
        fill="url(#radarGradient)"
        stroke="#00e85a"
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Gradient */}
      <defs>
        <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00e85a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Data points */}
      {dataPoints.map(([px, py], i) => (
        <circle
          key={i}
          cx={px} cy={py} r="4.5"
          fill={DIMENSIONS[i].color}
          stroke="white"
          strokeWidth="2"
        />
      ))}

      {/* Labels */}
      {labelPoints.map((lp) => (
        <text
          key={lp.key}
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[9px] font-bold fill-current text-gray-500 dark:text-gray-400"
        >
          {lp.label}
        </text>
      ))}
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const EQScenarios: React.FC<GameComponentProps> = ({
  section,
  onComplete,
  onExit,
  onXPGain,
}) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<DimensionKey, number>>({
    empathy: 50,
    selfRegulation: 50,
    ethical: 50,
    leadership: 50,
    adaptability: 50,
  });
  const [choiceHistory, setChoiceHistory] = useState<number[]>([]);
  const [impactDeltas, setImpactDeltas] = useState<DimensionImpact>({});

  const startTimeRef = useRef(Date.now());
  const autoAdvanceRef = useRef<number | null>(null);
  const scenarioIndexRef = useRef(scenarioIndex);
  scenarioIndexRef.current = scenarioIndex;

  const currentScenario = SCENARIOS[scenarioIndex];

  // Cleanup auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  const handleStart = useCallback(() => {
    startTimeRef.current = Date.now();
    setPhase('scenario');
  }, []);

  const clampScore = (val: number) => Math.max(0, Math.min(100, val));

  const advanceToNext = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }

    const nextIndex = scenarioIndexRef.current + 1;
    if (nextIndex >= TOTAL_SCENARIOS) {
      setPhase('profile');
      return;
    }

    setScenarioIndex(nextIndex);
    setSelectedChoice(null);
    setImpactDeltas({});
    setPhase('scenario');
  }, []);

  const handleChoiceSelect = useCallback((choiceIndex: number) => {
    if (selectedChoice !== null) return;

    const scenario = SCENARIOS[scenarioIndexRef.current];
    const choice = scenario.choices[choiceIndex];
    setSelectedChoice(choiceIndex);
    setChoiceHistory(prev => [...prev, choiceIndex]);
    setImpactDeltas(choice.impact);

    // Apply score changes
    setScores(prev => {
      const next = { ...prev };
      for (const [key, delta] of Object.entries(choice.impact)) {
        const dimKey = key as DimensionKey;
        next[dimKey] = clampScore(prev[dimKey] + (delta as number));
      }
      return next;
    });

    // XP for completing a scenario
    onXPGain(10, `Scenario ${scenarioIndexRef.current + 1} completed`);

    // Transition to impact display
    setPhase('impact');

    // Auto-advance after 3 seconds
    autoAdvanceRef.current = window.setTimeout(() => {
      advanceToNext();
    }, 3000);
  }, [selectedChoice, onXPGain, advanceToNext]);

  const handleViewResults = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const overallScore = Math.round(
      DIMENSIONS.reduce((sum, d) => sum + scores[d.key], 0) / DIMENSIONS.length
    );

    const result: GameResult = {
      score: overallScore,
      rawScore: DIMENSIONS.reduce((sum, d) => sum + scores[d.key], 0),
      timeSpent,
      type: 'eq_scenarios',
      metrics: {
        empathy: scores.empathy,
        selfRegulation: scores.selfRegulation,
        ethical: scores.ethical,
        leadership: scores.leadership,
        adaptability: scores.adaptability,
        overallEQ: overallScore,
      },
      data: {
        choiceHistory,
        finalScores: scores,
      },
    };
    onComplete(result);
  }, [scores, choiceHistory, onComplete]);

  const handleExit = useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    const progress: AssessmentProgress = {
      step: scenarioIndex,
      correctCount: choiceHistory.length,
      textInput: '',
      gameScore: Math.round(DIMENSIONS.reduce((sum, d) => sum + scores[d.key], 0) / DIMENSIONS.length),
      simState: { scores, choiceHistory },
      xpEarned: choiceHistory.length * 10,
    };
    onExit(progress);
  }, [scenarioIndex, choiceHistory, scores, onExit]);

  // ─── Intro ───────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <GameIntro
        title="EQ Scenarios"
        description="Face 10 high-stakes workplace scenarios. Your choices reveal your emotional intelligence, ethical compass, and leadership style."
        icon="psychology"
        duration="~20 min"
        rules={[
          "You'll face 10 realistic business scenarios",
          "Each scenario has 4 responses \u2014 none is obviously 'right'",
          'Your choices affect 5 EQ dimensions: Empathy, Self-Regulation, Ethics, Leadership, Adaptability',
          'A radar chart builds your unique behavioral profile',
        ]}
        onStart={handleStart}
      />
    );
  }

  // ─── Profile (Final Screen) ──────────────────────────────────────────────

  if (phase === 'profile') {
    const overallScore = Math.round(
      DIMENSIONS.reduce((sum, d) => sum + scores[d.key], 0) / DIMENSIONS.length
    );
    const sorted = DIMENSIONS.map(d => ({ ...d, score: scores[d.key] })).sort((a, b) => b.score - a.score);
    const strengths = sorted.slice(0, 2);
    const growthArea = sorted[sorted.length - 1];

    return (
      <div className="max-w-lg mx-auto mt-8 animate-[fadeIn_0.5s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="size-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-primary">psychology</span>
            </div>
            <h2 className="text-2xl font-black text-text-main dark:text-white mb-1">Your EQ Profile</h2>
            <p className="text-text-muted text-sm">Behavioral Intelligence Assessment</p>
          </div>

          {/* Overall Score */}
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-5xl font-black text-primary">{overallScore}</span>
              <span className="text-lg text-text-muted font-bold">/100</span>
            </div>
            <p className="text-xs text-text-muted uppercase font-bold tracking-wider mt-1">Overall EQ Score</p>
          </div>

          {/* Radar Chart */}
          <div className="mb-6">
            <RadarChart scores={scores} />
          </div>

          {/* Dimension Bars */}
          <div className="space-y-3 mb-6">
            {DIMENSIONS.map(dim => (
              <div key={dim.key} className="flex items-center gap-3">
                <span className="text-xs font-bold w-28 text-right text-text-muted truncate">{dim.label}</span>
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${scores[dim.key]}%`,
                      backgroundColor: dim.color,
                    }}
                  />
                </div>
                <span className="text-sm font-black w-8 tabular-nums" style={{ color: dim.color }}>
                  {scores[dim.key]}
                </span>
              </div>
            ))}
          </div>

          {/* Strengths & Growth */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">
                Top Strengths
              </p>
              {strengths.map(s => (
                <div key={s.key} className="flex items-center gap-2 mb-1.5 last:mb-0">
                  <div className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-bold text-text-main dark:text-white">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                Growth Area
              </p>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full" style={{ backgroundColor: growthArea.color }} />
                <span className="text-sm font-bold text-text-main dark:text-white">{growthArea.label}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">{growthArea.score}/100</p>
            </div>
          </div>

          {/* Personality Summary */}
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-lg mt-0.5 shrink-0">auto_awesome</span>
              <p className="text-sm text-text-main dark:text-gray-300 leading-relaxed">
                {getPersonalitySummary(scores)}
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleViewResults}
            className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // ─── Gameplay (scenario + impact) ────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 mt-4">
      {/* Top HUD */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={handleExit}
          className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted"
          aria-label="Exit game"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-text-muted">Scenario</span>
          <ProgressTrack current={scenarioIndex} total={TOTAL_SCENARIOS} />
        </div>

        <div className="size-8" /> {/* Spacer for alignment */}
      </div>

      {/* EQ Dimension Meters */}
      <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
        {DIMENSIONS.map(dim => (
          <div
            key={dim.key}
            className="flex items-center gap-1.5 bg-card-bg dark:bg-card-bg-dark border border-text-main/5 dark:border-white/5 rounded-full px-2.5 py-1.5 shadow-sm"
          >
            <span className="text-[10px] font-bold text-text-muted truncate max-w-[52px]">{dim.label.split('-')[0]}</span>
            <div className="w-12 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${scores[dim.key]}%`,
                  backgroundColor: dim.color,
                }}
              />
            </div>
            <span className="text-[10px] font-black tabular-nums w-5" style={{ color: dim.color }}>
              {scores[dim.key]}
            </span>
          </div>
        ))}
      </div>

      {/* Scenario Card */}
      <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 overflow-hidden animate-[fadeIn_0.3s_ease-out]">
        {/* Scene Header */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/15 dark:to-primary/10 px-6 py-4 flex items-center gap-3 border-b border-text-main/5 dark:border-white/5">
          <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl text-primary">{currentScenario.icon}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-wider">Scenario {scenarioIndex + 1}</p>
            <h3 className="text-lg font-black text-text-main dark:text-white">{currentScenario.title}</h3>
          </div>
        </div>

        {/* Context */}
        <div className="px-6 py-5">
          <p className="text-sm text-text-main dark:text-gray-300 leading-relaxed">
            {currentScenario.context}
          </p>
        </div>

        {/* Choices or Impact */}
        <div className="px-6 pb-6">
          {phase === 'scenario' && (
            <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">What do you do?</p>
              {currentScenario.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleChoiceSelect(i)}
                  className="w-full text-left p-4 rounded-xl border border-text-main/10 dark:border-white/10 bg-background-light/50 dark:bg-white/[0.03] hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200 active:scale-[0.99] group"
                >
                  <div className="flex items-start gap-3">
                    <span className="size-7 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0 transition-colors">
                      {choice.label}
                    </span>
                    <span className="text-sm font-semibold text-text-main dark:text-white leading-relaxed">
                      {choice.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {phase === 'impact' && selectedChoice !== null && (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              {/* Selected choice recap */}
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
                <span className="size-6 rounded-md bg-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
                  {currentScenario.choices[selectedChoice].label}
                </span>
                <span className="text-sm font-semibold text-text-main dark:text-white">
                  {currentScenario.choices[selectedChoice].text}
                </span>
              </div>

              {/* Impact display */}
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Impact on your profile</p>
              <div className="space-y-2.5 mb-5">
                {DIMENSIONS.map(dim => {
                  const delta = impactDeltas[dim.key] ?? 0;
                  if (delta === 0) return null;
                  const isPositive = delta > 0;
                  return (
                    <div key={dim.key} className="flex items-center gap-3 animate-[slideIn_0.4s_ease-out]">
                      <span className="text-xs font-bold w-28 text-right text-text-muted">{dim.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base" style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
                          {isPositive ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                        <span className={`text-sm font-black ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{delta}
                        </span>
                        <div className="w-16 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${scores[dim.key]}%`,
                              backgroundColor: dim.color,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold tabular-nums" style={{ color: dim.color }}>{scores[dim.key]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Skip / auto-advance hint */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse mr-1.5 align-middle" />
                  Auto-advancing...
                </p>
                <button
                  onClick={advanceToNext}
                  className="px-5 py-2.5 bg-primary text-black font-bold text-sm rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all shadow-md shadow-primary/20"
                >
                  {scenarioIndex < TOTAL_SCENARIOS - 1 ? 'Next Scenario' : 'See Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default EQScenarios;
