import React, { useState, useEffect, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';

// --- Scenario Data ---
const SCENARIOS = [
  {
    title: 'Q1: Supplier Crisis',
    context: 'Your main raw material supplier has declared force majeure due to a hurricane. Production will halt in 2 days. What is your immediate action?',
    affectedNode: 0, // Supplier
    ticker: 'BREAKING: Hurricane disrupts major shipping lanes — commodity prices surge 40% overnight.',
    choices: [
      { text: 'Pay 3x premium for air-freight from a backup supplier.', effect: { capital: -3000, satisfaction: 10 } },
      { text: 'Pause production and wait for the supplier to recover.', effect: { capital: 0, satisfaction: -20 } },
      { text: 'Switch to lower quality local materials immediately.', effect: { capital: -500, satisfaction: -10 } },
    ],
  },
  {
    title: 'Q2: Demand Surge',
    context: 'A viral TikTok trend has spiked demand for your product by 200%. Your warehouse is empty.',
    affectedNode: 2, // Warehouse
    ticker: 'TRENDING: Product goes viral — analysts predict 3-month sustained demand spike.',
    choices: [
      { text: 'Run factory at double overtime (High Cost).', effect: { capital: -2000, satisfaction: 25 } },
      { text: 'Outsource to a 3rd party manufacturer (Quality Risk).', effect: { capital: -1000, satisfaction: 5 } },
      { text: 'Increase prices to dampen demand.', effect: { capital: 1000, satisfaction: -15 } },
    ],
  },
  {
    title: 'Q3: Sustainability Pivot',
    context: 'Investors are demanding a green supply chain audit. It will cost significantly but improve brand image.',
    affectedNode: 1, // Factory
    ticker: 'ESG REPORT: Companies with green supply chains see 25% higher investor confidence.',
    choices: [
      { text: 'Fully commit to the audit and upgrades.', effect: { capital: -4000, satisfaction: 30 } },
      { text: 'Greenwash: Do a marketing campaign only.', effect: { capital: -500, satisfaction: -5 } },
      { text: 'Ignore: Focus on core profitability.', effect: { capital: 0, satisfaction: 0 } },
    ],
  },
  {
    title: 'Q4: Logistics Tech Upgrade',
    context: 'A new AI routing system promises 30% cost savings but requires $3k upfront and 2-week implementation.',
    affectedNode: 3, // Customer (delivery)
    ticker: 'TECH: AI logistics platforms report average 28% cost reduction for early adopters.',
    choices: [
      { text: 'Full implementation now.', effect: { capital: -3000, satisfaction: 20 } },
      { text: 'Pilot in one region first.', effect: { capital: -1000, satisfaction: 5 } },
      { text: 'Wait and see competitor results.', effect: { capital: 0, satisfaction: -10 } },
    ],
  },
];

const SUPPLY_CHAIN_NODES = ['Supplier', 'Factory', 'Warehouse', 'Customer'];
const NODE_ICONS = ['inventory_2', 'precision_manufacturing', 'warehouse', 'person'];

type GamePhase = 'intro' | 'playing' | 'complete';

export const SupplyChain: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [step, setStep] = useState(0);
  const [capital, setCapital] = useState(5000);
  const [satisfaction, setSatisfaction] = useState(50);
  const [prevCapital, setPrevCapital] = useState(5000);
  const [prevSatisfaction, setPrevSatisfaction] = useState(50);
  const [choiceHistory, setChoiceHistory] = useState<string[]>([]);
  const [showEffect, setShowEffect] = useState<{ capital: number; satisfaction: number } | null>(null);
  const startTimeRef = useRef(Date.now());
  const [tickerOffset, setTickerOffset] = useState(0);

  // Ticker scroll animation
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      setTickerOffset(prev => prev - 1);
    }, 30);
    return () => clearInterval(id);
  }, [phase, step]);

  // Reset ticker on step change
  useEffect(() => {
    setTickerOffset(0);
  }, [step]);

  const handleStart = () => {
    setPhase('playing');
    startTimeRef.current = Date.now();
  };

  const handleChoice = (choiceIdx: number) => {
    const scenario = SCENARIOS[step];
    const effect = scenario.choices[choiceIdx].effect;

    setPrevCapital(capital);
    setPrevSatisfaction(satisfaction);
    setShowEffect(effect);

    const newCapital = capital + effect.capital;
    const newSatisfaction = Math.min(100, Math.max(0, satisfaction + effect.satisfaction));

    setCapital(newCapital);
    setSatisfaction(newSatisfaction);
    setChoiceHistory(prev => [...prev, scenario.choices[choiceIdx].text]);

    if (effect.satisfaction > 0) {
      onXPGain(Math.abs(effect.satisfaction), `${scenario.title} decision`);
    }

    // Move to next after brief animation
    setTimeout(() => {
      setShowEffect(null);
      if (step < SCENARIOS.length - 1) {
        setStep(s => s + 1);
      } else {
        setPhase('complete');
      }
    }, 800);
  };

  const handleFinish = () => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      score: satisfaction,
      rawScore: satisfaction,
      timeSpent,
      metrics: {
        finalCapital: capital,
        finalSatisfaction: satisfaction,
        scenariosCompleted: SCENARIOS.length,
      },
      type: 'simulation',
      data: { capital, satisfaction, choiceHistory },
    };
    onComplete(result);
  };

  const handleGameExit = () => {
    const progress: AssessmentProgress = {
      step,
      correctCount: 0,
      textInput: '',
      gameScore: satisfaction,
      simState: { capital, satisfaction },
    };
    onExit(progress);
  };

  // --- Supply Chain Diagram ---
  const renderSupplyChainDiagram = (affectedNode: number) => (
    <div className="flex items-center justify-center gap-0 mb-6 overflow-hidden">
      {SUPPLY_CHAIN_NODES.map((node, i) => (
        <React.Fragment key={node}>
          <div className={`flex flex-col items-center transition-all duration-500 ${i === affectedNode ? 'scale-110' : ''}`}>
            <div
              className={`size-14 sm:size-16 rounded-2xl flex items-center justify-center transition-all duration-500
                ${i === affectedNode
                  ? 'bg-primary/20 border-2 border-primary shadow-lg shadow-primary/20'
                  : 'bg-background-light dark:bg-white/5 border border-text-main/10 dark:border-white/10'
                }
              `}
              style={i === affectedNode ? { animation: 'pulse-glow 1.5s ease-in-out infinite' } : {}}
            >
              <span className={`material-symbols-outlined text-2xl ${i === affectedNode ? 'text-primary' : 'text-text-muted'}`}>
                {NODE_ICONS[i]}
              </span>
            </div>
            <span className={`text-[10px] mt-1.5 font-bold uppercase tracking-wider ${i === affectedNode ? 'text-primary' : 'text-text-muted'}`}>
              {node}
            </span>
          </div>
          {i < SUPPLY_CHAIN_NODES.length - 1 && (
            <div className="flex-1 max-w-12 h-0.5 mx-1 relative">
              <div className={`h-full rounded-full transition-colors duration-500 ${
                i === affectedNode || i + 1 === affectedNode
                  ? 'bg-primary'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`} />
              {(i === affectedNode || i + 1 === affectedNode) && (
                <div className="absolute top-1/2 -translate-y-1/2 size-2 rounded-full bg-primary animate-[slide-dot_1s_ease-in-out_infinite]" />
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // --- Meter Bar ---
  const renderMeter = (label: string, value: number, prevValue: number, icon: string, color: string, prefix: string = '') => (
    <div className="bg-card-bg dark:bg-card-bg-dark p-4 rounded-xl border border-text-main/5 dark:border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-text-muted uppercase font-bold">{label}</p>
          <p className="text-2xl font-black text-text-main dark:text-white">
            {prefix}{value}{label === 'Satisfaction' ? '%' : ''}
          </p>
        </div>
        <span className={`material-symbols-outlined text-3xl ${color}`}>{icon}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            label === 'Satisfaction' ? 'bg-blue-500' : 'bg-green-500'
          }`}
          style={{ width: `${label === 'Satisfaction' ? value : Math.min(100, (value / 10000) * 100)}%` }}
        />
      </div>
      {showEffect && (
        <div className={`text-xs font-bold mt-1 animate-[fadeIn_0.3s_ease-out] ${
          (label === 'Capital' ? showEffect.capital : showEffect.satisfaction) >= 0 ? 'text-green-500' : 'text-red-500'
        }`}>
          {(label === 'Capital' ? showEffect.capital : showEffect.satisfaction) >= 0 ? '+' : ''}
          {label === 'Capital' ? `$${showEffect.capital}` : `${showEffect.satisfaction}%`}
        </div>
      )}
    </div>
  );

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Supply Chain Challenge"
        description="Navigate a series of supply chain crises. Your decisions affect capital and customer satisfaction."
        icon="local_shipping"
        duration={`${SCENARIOS.length} scenarios`}
        rules={[
          'You manage a supply chain with $5,000 capital and 50% satisfaction.',
          'Each scenario presents a crisis — choose wisely.',
          'Watch the supply chain diagram to see which node is affected.',
          'Your final satisfaction score determines your result.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">flag</span>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">Simulation Complete</h2>
          <p className="text-text-muted mb-8">Your supply chain management results</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Final Capital</p>
              <p className="text-3xl font-black text-text-main dark:text-white">${capital}</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase font-bold">Satisfaction</p>
              <p className="text-3xl font-black text-primary">{satisfaction}%</p>
            </div>
          </div>

          {/* Choice recap */}
          <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-8 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Decision History</p>
            {choiceHistory.map((choice, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-text-main dark:text-white mb-2">
                <span className="text-primary font-bold shrink-0">Q{i + 1}.</span>
                <span className="text-text-muted">{choice}</span>
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
  const scenario = SCENARIOS[step];

  return (
    <div className="max-w-3xl mx-auto mt-6 animate-[fadeIn_0.2s_ease-out]">
      {/* Market News Ticker */}
      <div className="bg-gray-900 text-yellow-400 rounded-xl overflow-hidden mb-4 relative h-8 flex items-center">
        <span className="absolute left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10 uppercase tracking-wider">
          Live
        </span>
        <div className="ml-16 whitespace-nowrap text-sm font-mono overflow-hidden">
          <span style={{ transform: `translateX(${tickerOffset}px)`, display: 'inline-block', transition: 'none' }}>
            {scenario.ticker} &nbsp;&nbsp;&nbsp; {scenario.ticker}
          </span>
        </div>
      </div>

      {/* Supply Chain Diagram */}
      {renderSupplyChainDiagram(scenario.affectedNode)}

      {/* Dashboard Meters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {renderMeter('Capital', capital, prevCapital, 'attach_money', 'text-green-500', '$')}
        {renderMeter('Satisfaction', satisfaction, prevSatisfaction, 'thumb_up', 'text-blue-500')}
      </div>

      {/* Scenario Card */}
      <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex items-center gap-3 mb-4">
          <ProgressTrack current={step} total={SCENARIOS.length} />
        </div>

        <h2 className="text-2xl font-black text-text-main dark:text-white mb-3">{scenario.title}</h2>
        <p className="text-lg text-text-muted mb-8 leading-relaxed">{scenario.context}</p>

        <div className="grid grid-cols-1 gap-3">
          {scenario.choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => handleChoice(idx)}
              disabled={showEffect !== null}
              className="text-left p-5 rounded-xl bg-background-light dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 border border-transparent hover:border-primary/30 transition-all group disabled:opacity-60 disabled:pointer-events-none"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-text-main dark:text-white group-hover:text-primary-dark dark:group-hover:text-primary transition-colors">
                  {choice.text}
                </span>
                <span className="material-symbols-outlined text-gray-300 group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 230, 64, 0.2); }
          50% { box-shadow: 0 0 20px 4px rgba(0, 230, 64, 0.3); }
        }
        @keyframes slide-dot {
          0% { left: 0; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};
