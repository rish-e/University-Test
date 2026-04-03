import React, { useState, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';

// --- Phase Data ---
interface Phase {
  title: string;
  context: string;
  choices: [
    { text: string; type: 'safe'; marketResponse: string; marketShareDelta: number; reputationDelta: number },
    { text: string; type: 'risky'; marketResponse: string; marketShareDelta: number; reputationDelta: number }
  ];
}

const PHASES: Phase[] = [
  {
    title: 'Phase 1: Concept Launch',
    context: 'You are launching a fintech app. Which MVP approach do you take?',
    choices: [
      {
        text: 'Safe: Copy existing successful features (Low Risk).',
        type: 'safe',
        marketResponse: 'Markets react: Steady approach builds trust.',
        marketShareDelta: 2,
        reputationDelta: 5,
      },
      {
        text: 'Disruptive: No fees, AI-driven, unproven model (High Risk).',
        type: 'risky',
        marketResponse: 'Markets react: Bold move draws attention!',
        marketShareDelta: 5,
        reputationDelta: -5,
      },
    ],
  },
  {
    title: 'Phase 2: Growth Strategy',
    context: 'User growth is flat. What\'s the pivot?',
    choices: [
      {
        text: 'Partnership: Bundle with a traditional bank.',
        type: 'safe',
        marketResponse: 'Markets react: Reliable partnerships reassure investors.',
        marketShareDelta: 3,
        reputationDelta: 10,
      },
      {
        text: 'Viral: Gamify savings with crypto rewards.',
        type: 'risky',
        marketResponse: 'Markets react: Crypto angle divides opinion but drives signups!',
        marketShareDelta: 8,
        reputationDelta: -10,
      },
    ],
  },
  {
    title: 'Phase 3: Crisis Management',
    context: 'A competitor just raised $50M. How do you respond?',
    choices: [
      {
        text: 'Focus: Niche down to a specific user segment.',
        type: 'safe',
        marketResponse: 'Markets react: Smart positioning, defensible moat.',
        marketShareDelta: 1,
        reputationDelta: 8,
      },
      {
        text: 'Expand: Launch in 3 new countries immediately.',
        type: 'risky',
        marketResponse: 'Markets react: Aggressive expansion — high burn rate worries some.',
        marketShareDelta: 10,
        reputationDelta: -15,
      },
    ],
  },
  {
    title: 'Phase 4: Product Market Fit',
    context: 'Early traction data is in. Your product has passionate users but a small market. What\'s next?',
    choices: [
      {
        text: 'Listen to user feedback and iterate on current product.',
        type: 'safe',
        marketResponse: 'Markets react: User-centric development praised by analysts.',
        marketShareDelta: 2,
        reputationDelta: 12,
      },
      {
        text: 'Pivot completely to a different, larger market.',
        type: 'risky',
        marketResponse: 'Markets react: Radical pivot — early adopters divided, VCs intrigued!',
        marketShareDelta: 12,
        reputationDelta: -8,
      },
    ],
  },
  {
    title: 'Phase 5: Exit Strategy',
    context: 'You\'ve reached a crossroads. The company is sustainable but not explosive. What\'s your endgame?',
    choices: [
      {
        text: 'Steady profitable growth — build a lasting business.',
        type: 'safe',
        marketResponse: 'Markets react: Sustainable growth model earns long-term investor confidence.',
        marketShareDelta: 3,
        reputationDelta: 15,
      },
      {
        text: 'Aggressive fundraising for 10x moonshot.',
        type: 'risky',
        marketResponse: 'Markets react: All-in bet — the press calls it "visionary or reckless."',
        marketShareDelta: 15,
        reputationDelta: -12,
      },
    ],
  },
];

// Archetype mapping
const ARCHETYPES = [
  { min: 0, max: 0, name: 'Conservative Operator', desc: 'You prioritize stability and proven methods.', color: '#3b82f6' },
  { min: 1, max: 1, name: 'Cautious Builder', desc: 'You take calculated steps with minimal risk.', color: '#22c55e' },
  { min: 2, max: 2, name: 'Balanced Strategist', desc: 'You blend innovation with pragmatism.', color: '#eab308' },
  { min: 3, max: 3, name: 'Bold Innovator', desc: 'You lean into risk when opportunity calls.', color: '#f97316' },
  { min: 4, max: 5, name: 'Radical Disruptor', desc: 'You bet big on transformation every time.', color: '#ef4444' },
];

type GamePhase = 'intro' | 'playing' | 'response' | 'complete';

interface ChoiceRecord {
  phase: number;
  type: 'safe' | 'risky';
  marketResponse: string;
}

export const InnovationPath: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [step, setStep] = useState(0);
  const [riskyCount, setRiskyCount] = useState(0);
  const [marketShare, setMarketShare] = useState(5);
  const [reputation, setReputation] = useState(50);
  const [choices, setChoices] = useState<ChoiceRecord[]>([]);
  const [lastResponse, setLastResponse] = useState('');
  const startTimeRef = useRef(Date.now());

  const handleStart = () => {
    setPhase('playing');
    setStep(0);
    setRiskyCount(0);
    setMarketShare(5);
    setReputation(50);
    setChoices([]);
    startTimeRef.current = Date.now();
  };

  const handleChoice = (choiceIdx: 0 | 1) => {
    const currentPhase = PHASES[step];
    const choice = currentPhase.choices[choiceIdx];

    const newRiskyCount = riskyCount + (choice.type === 'risky' ? 1 : 0);
    setRiskyCount(newRiskyCount);
    setMarketShare(ms => Math.max(0, Math.min(100, ms + choice.marketShareDelta)));
    setReputation(r => Math.max(0, Math.min(100, r + choice.reputationDelta)));
    setChoices(prev => [...prev, { phase: step, type: choice.type, marketResponse: choice.marketResponse }]);
    setLastResponse(choice.marketResponse);

    onXPGain(15, `${currentPhase.title} decision`);

    // Show market response
    setPhase('response');
  };

  const handleContinue = () => {
    if (step < PHASES.length - 1) {
      setStep(s => s + 1);
      setPhase('playing');
    } else {
      setPhase('complete');
    }
  };

  const getArchetype = () => {
    return ARCHETYPES.find(a => riskyCount >= a.min && riskyCount <= a.max) || ARCHETYPES[2];
  };

  const handleFinish = () => {
    const archetype = getArchetype();
    // Normalize: balanced = highest, extremes slightly lower
    const innovationScore = Math.min(100, Math.max(0, reputation));
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      score: innovationScore,
      rawScore: riskyCount,
      timeSpent,
      metrics: {
        riskyChoices: riskyCount,
        safeChoices: PHASES.length - riskyCount,
        marketShare,
        reputation,
      },
      type: 'simulation',
      data: {
        archetype: archetype.name,
        choices,
        marketShare,
        reputation,
      },
    };
    onComplete(result);
  };

  const handleGameExit = () => {
    const progress: AssessmentProgress = {
      step,
      correctCount: riskyCount,
      textInput: '',
      gameScore: reputation,
      simState: { riskyCount, marketShare, reputation, innovationScore: riskyCount },
    };
    onExit(progress);
  };

  // --- Branching Path Visualization ---
  const renderBranchingPath = () => (
    <div className="flex flex-col items-center gap-0 mb-6">
      {PHASES.map((p, i) => {
        const choice = choices[i];
        const isCurrent = i === step;
        const isFuture = i > step;

        return (
          <React.Fragment key={i}>
            {/* Connecting line from above */}
            {i > 0 && (
              <div className={`w-0.5 h-4 ${isFuture ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary'}`} />
            )}

            {/* Node */}
            <div className="flex items-center gap-3 relative">
              {/* Left branch label (safe) */}
              <div className={`w-20 text-right text-[10px] font-bold uppercase tracking-wider ${
                choice?.type === 'safe' ? 'text-blue-500' : 'text-transparent'
              }`}>
                {choice?.type === 'safe' ? 'Safe' : '.'}
              </div>

              {/* Center node */}
              <div
                className={`size-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  isFuture
                    ? 'bg-gray-100 dark:bg-gray-800 text-text-muted border border-gray-200 dark:border-gray-700'
                    : isCurrent
                    ? 'bg-primary text-black border-2 border-primary shadow-lg shadow-primary/30 scale-110'
                    : choice?.type === 'risky'
                    ? 'bg-orange-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {i + 1}
              </div>

              {/* Right branch label (risky) */}
              <div className={`w-20 text-left text-[10px] font-bold uppercase tracking-wider ${
                choice?.type === 'risky' ? 'text-orange-500' : 'text-transparent'
              }`}>
                {choice?.type === 'risky' ? 'Risky' : '.'}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  // --- Secondary Metrics ---
  const renderMetrics = () => (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="bg-card-bg dark:bg-card-bg-dark p-3 rounded-xl border border-text-main/5 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold">Market Share</p>
            <p className="text-xl font-black text-text-main dark:text-white">{marketShare}%</p>
          </div>
          <span className="material-symbols-outlined text-2xl text-blue-500">trending_up</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${marketShare}%` }} />
        </div>
      </div>
      <div className="bg-card-bg dark:bg-card-bg-dark p-3 rounded-xl border border-text-main/5 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold">Brand Reputation</p>
            <p className="text-xl font-black text-text-main dark:text-white">{reputation}</p>
          </div>
          <span className="material-symbols-outlined text-2xl text-purple-500">star</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-purple-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${reputation}%` }} />
        </div>
      </div>
    </div>
  );

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Innovation Path"
        description="Navigate 5 phases of a startup journey. Each decision shapes your innovation profile and market position."
        icon="rocket_launch"
        duration="5 phases"
        rules={[
          'Each phase presents a safe and a risky choice.',
          'Your choices affect Market Share and Brand Reputation.',
          'See how the market reacts to each decision.',
          'Your final profile reveals your innovation mindset archetype.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- MARKET RESPONSE ---
  if (phase === 'response') {
    const lastChoice = choices[choices.length - 1];
    const isRisky = lastChoice?.type === 'risky';
    return (
      <div className="max-w-2xl mx-auto mt-8 animate-[fadeIn_0.3s_ease-out]">
        {renderMetrics()}
        {renderBranchingPath()}

        <div className={`p-8 rounded-3xl shadow-xl border text-center ${
          isRisky
            ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20'
            : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
        }`}>
          <span className={`material-symbols-outlined text-5xl mb-4 ${isRisky ? 'text-orange-500' : 'text-blue-500'}`}>
            {isRisky ? 'trending_up' : 'verified'}
          </span>
          <h3 className="text-xl font-black text-text-main dark:text-white mb-2">Market Response</h3>
          <p className={`text-lg font-bold ${isRisky ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'} animate-[slide-in_0.5s_ease-out]`}>
            {lastResponse}
          </p>

          <button
            onClick={handleContinue}
            className="mt-8 px-8 py-3 bg-primary text-black font-black rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all"
          >
            {step < PHASES.length - 1 ? 'Next Phase' : 'View Results'}
          </button>
        </div>

        <style>{`
          @keyframes slide-in {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const archetype = getArchetype();
    const innovationScore = Math.min(100, Math.max(0, reputation));

    return (
      <div className="max-w-lg mx-auto mt-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: archetype.color + '20', border: `3px solid ${archetype.color}` }}>
            <span className="material-symbols-outlined text-5xl" style={{ color: archetype.color }}>psychology</span>
          </div>

          <h2 className="text-3xl font-black text-text-main dark:text-white mb-1">Your Profile</h2>
          <p className="text-2xl font-black mb-2" style={{ color: archetype.color }}>{archetype.name}</p>
          <p className="text-text-muted mb-8">{archetype.desc}</p>

          {/* Spectrum bar */}
          <div className="mb-8">
            <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase mb-1">
              <span>Conservative</span>
              <span>Radical</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
              <div className="h-full rounded-full" style={{
                width: `${(riskyCount / PHASES.length) * 100}%`,
                background: `linear-gradient(to right, #3b82f6, #eab308, #ef4444)`,
              }} />
              {/* Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 size-5 rounded-full bg-white border-2 shadow-md"
                style={{
                  left: `${(riskyCount / PHASES.length) * 100}%`,
                  borderColor: archetype.color,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
            <p className="text-xs text-text-muted mt-1">{riskyCount} risky / {PHASES.length - riskyCount} safe choices</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Market Share</p>
              <p className="text-3xl font-black text-blue-500">{marketShare}%</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Reputation</p>
              <p className="text-3xl font-black text-purple-500">{reputation}</p>
            </div>
          </div>

          {/* Path recap */}
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-8 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Your Journey</p>
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1.5 border-b border-black/5 dark:border-white/5 last:border-0">
                <span className={`size-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${c.type === 'risky' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                  {i + 1}
                </span>
                <span className="text-text-main dark:text-white font-bold">{PHASES[i].title.split(': ')[1]}</span>
                <span className={`ml-auto text-[10px] font-bold uppercase ${c.type === 'risky' ? 'text-orange-500' : 'text-blue-500'}`}>
                  {c.type}
                </span>
              </div>
            ))}
          </div>

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

  // --- PLAYING ---
  const currentPhase = PHASES[step];

  return (
    <div className="max-w-2xl mx-auto mt-6 animate-[fadeIn_0.2s_ease-out]">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button onClick={handleGameExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <ProgressTrack current={step} total={PHASES.length} />
      </div>

      {/* Secondary metrics */}
      {renderMetrics()}

      {/* Branching path */}
      {renderBranchingPath()}

      {/* Phase Card */}
      <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 bg-primary/10 text-primary-dark dark:text-primary text-[10px] font-bold rounded uppercase tracking-wider">
            Phase {step + 1} of {PHASES.length}
          </span>
        </div>
        <h2 className="text-2xl font-black text-text-main dark:text-white mb-3">{currentPhase.title}</h2>
        <p className="text-lg text-text-muted mb-8 leading-relaxed">{currentPhase.context}</p>

        <div className="grid grid-cols-1 gap-3">
          {currentPhase.choices.map((choice, idx) => {
            const isRisky = choice.type === 'risky';
            return (
              <button
                key={idx}
                onClick={() => handleChoice(idx as 0 | 1)}
                className={`text-left p-5 rounded-xl border transition-all group ${
                  isRisky
                    ? 'bg-orange-50/50 dark:bg-orange-500/5 border-orange-200/50 dark:border-orange-500/10 hover:border-orange-400 dark:hover:border-orange-500/40'
                    : 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200/50 dark:border-blue-500/10 hover:border-blue-400 dark:hover:border-blue-500/40'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isRisky ? 'text-orange-500' : 'text-blue-500'}`}>
                      {isRisky ? 'High Risk' : 'Low Risk'}
                    </span>
                    <p className="font-bold text-text-main dark:text-white mt-1 group-hover:text-primary-dark dark:group-hover:text-primary transition-colors">
                      {choice.text}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:translate-x-1 transition-transform">
                    arrow_forward_ios
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
