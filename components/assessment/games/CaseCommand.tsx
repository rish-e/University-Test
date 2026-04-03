import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameComponentProps } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';
import { caseBriefs, type CaseOption } from '../../../data/e1-cases';

type GamePhase = 'intro' | 'reading' | 'deciding' | 'case-result' | 'complete';

const READING_SECONDS = 60;
const TOTAL_CASES = caseBriefs.length;
const REFERENCE_PENALTY_SECONDS = 5;

// Dimension metadata for display
const DIMENSION_META: {
  key: 'analytical' | 'decisiveness' | 'empathy' | 'vision';
  label: string;
  lowLabel: string;
  highLabel: string;
  color: string;
  icon: string;
}[] = [
  { key: 'analytical', label: 'Analytical Depth', lowLabel: 'Intuitive', highLabel: 'Data-Driven', color: 'violet', icon: 'analytics' },
  { key: 'decisiveness', label: 'Decisiveness', lowLabel: 'Deliberate', highLabel: 'Swift', color: 'amber', icon: 'bolt' },
  { key: 'empathy', label: 'Stakeholder Empathy', lowLabel: 'Task-Focused', highLabel: 'People-First', color: 'rose', icon: 'favorite' },
  { key: 'vision', label: 'Strategic Vision', lowLabel: 'Operational', highLabel: 'Visionary', color: 'sky', icon: 'visibility' },
];

const DIMENSION_COLORS: Record<string, { bg: string; text: string; bar: string; bgLight: string }> = {
  violet: { bg: 'bg-violet-500', text: 'text-violet-500', bar: 'bg-violet-500', bgLight: 'bg-violet-500/10' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-500', bar: 'bg-amber-500', bgLight: 'bg-amber-500/10' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-500', bar: 'bg-rose-500', bgLight: 'bg-rose-500/10' },
  sky: { bg: 'bg-sky-500', text: 'text-sky-500', bar: 'bg-sky-500', bgLight: 'bg-sky-500/10' },
};

interface DimensionScores {
  analytical: number;
  decisiveness: number;
  empathy: number;
  vision: number;
}

interface CaseResultData {
  clientName: string;
  industry: string;
  satisfaction: number;
  impact: number;
  dimensionDeltas: DimensionScores;
}

function clampDimension(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function applyDimensionImpacts(
  current: DimensionScores,
  option: CaseOption
): DimensionScores {
  return {
    analytical: clampDimension(current.analytical + (option.dimensions.analytical ?? 0)),
    decisiveness: clampDimension(current.decisiveness + (option.dimensions.decisiveness ?? 0)),
    empathy: clampDimension(current.empathy + (option.dimensions.empathy ?? 0)),
    vision: clampDimension(current.vision + (option.dimensions.vision ?? 0)),
  };
}

function getDimensionDeltas(option: CaseOption): DimensionScores {
  return {
    analytical: option.dimensions.analytical ?? 0,
    decisiveness: option.dimensions.decisiveness ?? 0,
    empathy: option.dimensions.empathy ?? 0,
    vision: option.dimensions.vision ?? 0,
  };
}

function generateProfileSummary(dims: DimensionScores): string {
  const traits: string[] = [];

  // Decisiveness
  if (dims.decisiveness >= 65) traits.push('decisive');
  else if (dims.decisiveness <= 35) traits.push('deliberate');

  // Empathy
  if (dims.empathy >= 65) traits.push('people-first');
  else if (dims.empathy <= 35) traits.push('task-focused');

  // Analytical
  if (dims.analytical >= 65) traits.push('data-driven');
  else if (dims.analytical <= 35) traits.push('intuition-led');

  // Vision
  if (dims.vision >= 65) traits.push('visionary');
  else if (dims.vision <= 35) traits.push('operationally grounded');

  if (traits.length === 0) {
    return 'You demonstrate a balanced communication style, adapting fluidly across analytical, decisional, empathetic, and strategic dimensions.';
  }

  const traitStr = traits.length === 1
    ? traits[0]
    : traits.slice(0, -1).join(', ') + ' and ' + traits[traits.length - 1];

  return `You're a ${traitStr} communicator who brings a distinctive perspective to strategic challenges.`;
}

// Spectrum bar component
function SpectrumBar({
  value,
  lowLabel,
  highLabel,
  color,
  compact = false,
}: {
  value: number;
  lowLabel: string;
  highLabel: string;
  color: string;
  compact?: boolean;
}) {
  const colors = DIMENSION_COLORS[color];
  return (
    <div>
      <div className={`h-${compact ? '2' : '3'} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative`}>
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500 z-10" />
        {/* Value indicator */}
        <div
          className={`absolute top-0 bottom-0 w-2.5 ${compact ? 'w-2' : 'w-2.5'} rounded-full ${colors.bar} z-20 transition-all duration-700 ease-out shadow-sm`}
          style={{ left: `calc(${value}% - ${compact ? 4 : 5}px)` }}
        />
        {/* Fill from center to value */}
        {value > 50 ? (
          <div
            className={`absolute top-0 bottom-0 left-1/2 ${colors.bar} opacity-25 rounded-r-full transition-all duration-700`}
            style={{ width: `${value - 50}%` }}
          />
        ) : value < 50 ? (
          <div
            className={`absolute top-0 bottom-0 ${colors.bar} opacity-25 rounded-l-full transition-all duration-700`}
            style={{ left: `${value}%`, width: `${50 - value}%` }}
          />
        ) : null}
      </div>
      <div className="flex justify-between mt-1">
        <span className={`text-[10px] ${value < 40 ? colors.text + ' font-bold' : 'text-text-muted'}`}>
          {lowLabel}
        </span>
        <span className={`text-[10px] ${value > 60 ? colors.text + ' font-bold' : 'text-text-muted'}`}>
          {highLabel}
        </span>
      </div>
    </div>
  );
}

export const CaseCommand: React.FC<GameComponentProps> = ({
  section,
  onComplete,
  onExit,
  onXPGain,
}) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [caseIndex, setCaseIndex] = useState(0);
  const [decisionIndex, setDecisionIndex] = useState(0);

  // Satisfaction / impact (kept for visual engagement)
  const [totalSatisfaction, setTotalSatisfaction] = useState(0);
  const [totalImpact, setTotalImpact] = useState(0);
  const [caseSatisfaction, setCaseSatisfaction] = useState(0);
  const [caseImpact, setCaseImpact] = useState(0);

  // Communication profile dimensions (all start at 50)
  const [dimensions, setDimensions] = useState<DimensionScores>({
    analytical: 50,
    decisiveness: 50,
    empathy: 50,
    vision: 50,
  });

  // Per-case dimension deltas (accumulated within a case)
  const [caseDimensionDeltas, setCaseDimensionDeltas] = useState<DimensionScores>({
    analytical: 0,
    decisiveness: 0,
    empathy: 0,
    vision: 0,
  });

  // Case results history
  const [caseResults, setCaseResults] = useState<CaseResultData[]>([]);

  // Reading timer
  const [readingTimeLeft, setReadingTimeLeft] = useState(READING_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reference brief peek
  const [showBriefPeek, setShowBriefPeek] = useState(false);
  const [referencePenalty, setReferencePenalty] = useState(0);

  // Decision state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showDecisionResult, setShowDecisionResult] = useState(false);
  const [choiceHistory, setChoiceHistory] = useState<number[]>([]);

  // Meter animations
  const [animateSat, setAnimateSat] = useState(false);
  const [animateImp, setAnimateImp] = useState(false);

  // Brief fade
  const [briefFaded, setBriefFaded] = useState(false);

  const startTimeRef = useRef(Date.now());

  const currentCase = caseBriefs[caseIndex];
  const currentDecision = currentCase?.decisions[decisionIndex];

  // Reading timer countdown
  useEffect(() => {
    if (phase !== 'reading') return;

    timerRef.current = setInterval(() => {
      setReadingTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setBriefFaded(true);
          setPhase('deciding');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleStart = useCallback(() => {
    startTimeRef.current = Date.now();
    setPhase('reading');
    setReadingTimeLeft(READING_SECONDS);
  }, []);

  const handleReference = useCallback(() => {
    setShowBriefPeek(true);
    setReferencePenalty((p) => p + REFERENCE_PENALTY_SECONDS);
    setTimeout(() => setShowBriefPeek(false), 8000);
  }, []);

  const handleOptionSelect = useCallback(
    (optIndex: number) => {
      if (selectedOption !== null) return;

      const option = currentDecision.options[optIndex];
      setSelectedOption(optIndex);

      // Update satisfaction/impact
      const newCaseSat = caseSatisfaction + option.satisfaction;
      const newCaseImp = caseImpact + option.impact;
      setCaseSatisfaction(newCaseSat);
      setCaseImpact(newCaseImp);

      // Update dimensions
      const newDimensions = applyDimensionImpacts(dimensions, option);
      setDimensions(newDimensions);

      // Accumulate per-case deltas
      const deltas = getDimensionDeltas(option);
      setCaseDimensionDeltas((prev) => ({
        analytical: prev.analytical + deltas.analytical,
        decisiveness: prev.decisiveness + deltas.decisiveness,
        empathy: prev.empathy + deltas.empathy,
        vision: prev.vision + deltas.vision,
      }));

      // Trigger meter animations
      setAnimateSat(true);
      setAnimateImp(true);
      setTimeout(() => {
        setAnimateSat(false);
        setAnimateImp(false);
      }, 600);

      // XP for engagement (no right/wrong)
      onXPGain(10, 'Strategic decision');

      setChoiceHistory((prev) => [...prev, optIndex]);
      setShowDecisionResult(true);
    },
    [selectedOption, currentDecision, caseSatisfaction, caseImpact, dimensions, onXPGain]
  );

  const handleNextDecision = useCallback(() => {
    const nextDec = decisionIndex + 1;

    if (nextDec >= currentCase.decisions.length) {
      // Case complete
      const newTotalSat = totalSatisfaction + caseSatisfaction;
      const newTotalImp = totalImpact + caseImpact;
      setTotalSatisfaction(newTotalSat);
      setTotalImpact(newTotalImp);

      setCaseResults((prev) => [
        ...prev,
        {
          clientName: currentCase.clientName,
          industry: currentCase.industry,
          satisfaction: caseSatisfaction,
          impact: caseImpact,
          dimensionDeltas: { ...caseDimensionDeltas },
        },
      ]);

      setPhase('case-result');
      return;
    }

    setDecisionIndex(nextDec);
    setSelectedOption(null);
    setShowDecisionResult(false);
  }, [decisionIndex, currentCase, totalSatisfaction, totalImpact, caseSatisfaction, caseImpact, caseDimensionDeltas]);

  const handleNextCase = useCallback(() => {
    const nextCase = caseIndex + 1;

    if (nextCase >= TOTAL_CASES) {
      setPhase('complete');
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      const finalSat = totalSatisfaction;
      const finalImp = totalImpact;

      onComplete({
        score: Math.round((dimensions.analytical + dimensions.decisiveness + dimensions.empathy + dimensions.vision) / 4),
        rawScore: finalSat + finalImp,
        timeSpent,
        type: 'case_command',
        metrics: {
          analytical: dimensions.analytical,
          decisiveness: dimensions.decisiveness,
          empathy: dimensions.empathy,
          vision: dimensions.vision,
          totalSatisfaction: finalSat,
          totalImpact: finalImp,
        },
        data: {
          profile: { ...dimensions },
          caseResults: [...caseResults, {
            clientName: currentCase.clientName,
            industry: currentCase.industry,
            satisfaction: caseSatisfaction,
            impact: caseImpact,
            dimensionDeltas: { ...caseDimensionDeltas },
          }],
        },
      });
      return;
    }

    setCaseIndex(nextCase);
    setDecisionIndex(0);
    setCaseSatisfaction(0);
    setCaseImpact(0);
    setCaseDimensionDeltas({ analytical: 0, decisiveness: 0, empathy: 0, vision: 0 });
    setSelectedOption(null);
    setShowDecisionResult(false);
    setChoiceHistory([]);
    setBriefFaded(false);
    setShowBriefPeek(false);
    setReadingTimeLeft(READING_SECONDS);
    setPhase('reading');
  }, [caseIndex, totalSatisfaction, totalImpact, dimensions, caseResults, currentCase, caseSatisfaction, caseImpact, caseDimensionDeltas, onComplete]);

  const handleExit = useCallback(() => {
    onExit({
      step: caseIndex,
      correctCount: 0,
      textInput: '',
      gameScore: totalSatisfaction + totalImpact,
      simState: { caseIndex, decisionIndex, choiceHistory, dimensions },
      xpEarned: totalSatisfaction + totalImpact,
    });
  }, [caseIndex, decisionIndex, choiceHistory, totalSatisfaction, totalImpact, dimensions, onExit]);

  // Meter helpers for satisfaction/impact (visual engagement)
  function meterPercent(value: number, range: number): number {
    return Math.max(0, Math.min(100, ((value + range) / (2 * range)) * 100));
  }

  const SAT_RANGE = 90;
  const IMP_RANGE = 90;

  // -- INTRO --
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Case Command"
        description="Read client briefs, then make strategic decisions that reveal your communication style across four dimensions."
        icon="business_center"
        duration="8-12 min"
        rules={[
          'Read the client brief carefully during the 60-second reading period',
          'After reading, make 3 sequential strategic decisions per case',
          'Each decision shapes your communication profile across 4 dimensions',
          'There are no right or wrong answers -- every choice reveals your style',
        ]}
        onStart={handleStart}
      />
    );
  }

  // -- COMPLETION / PROFILE CARD --
  if (phase === 'complete') {
    const profileSummary = generateProfileSummary(dimensions);

    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="size-20 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-primary">person_search</span>
            </div>
            <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">
              Your Communication Profile
            </h2>
            <p className="text-sm text-text-muted leading-relaxed max-w-sm mx-auto">
              {profileSummary}
            </p>
          </div>

          {/* 4 Spectrum Bars */}
          <div className="space-y-5 mb-8">
            {DIMENSION_META.map((dim) => {
              const value = dimensions[dim.key];
              const colors = DIMENSION_COLORS[dim.color];
              return (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-sm ${colors.text}`}>{dim.icon}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                        {dim.label}
                      </span>
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${colors.text}`}>{value}</span>
                  </div>
                  <SpectrumBar
                    value={value}
                    lowLabel={dim.lowLabel}
                    highLabel={dim.highLabel}
                    color={dim.color}
                  />
                </div>
              );
            })}
          </div>

          {/* Secondary: satisfaction/impact totals */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-blue-500">{totalSatisfaction}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Client Satisfaction</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-green-500">{totalImpact}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Strategic Impact</p>
            </div>
          </div>

          {referencePenalty > 0 && (
            <p className="text-xs text-text-muted text-center mb-6">
              Reference penalty: -{referencePenalty}s across all cases
            </p>
          )}

          {/* View Profile / Done button */}
          <div className="text-center">
            <button
              onClick={() => {
                const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
                onComplete({
                  score: Math.round((dimensions.analytical + dimensions.decisiveness + dimensions.empathy + dimensions.vision) / 4),
                  rawScore: totalSatisfaction + totalImpact,
                  timeSpent,
                  type: 'case_command',
                  metrics: {
                    analytical: dimensions.analytical,
                    decisiveness: dimensions.decisiveness,
                    empathy: dimensions.empathy,
                    vision: dimensions.vision,
                    totalSatisfaction,
                    totalImpact,
                  },
                  data: {
                    profile: { ...dimensions },
                    caseResults,
                  },
                });
              }}
              className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all shadow-md shadow-primary/20"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- READING + DECIDING + CASE RESULT --
  return (
    <div className="max-w-3xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <ProgressTrack current={caseIndex} total={TOTAL_CASES} />
        <div className="flex items-center gap-3">
          {phase === 'reading' && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-sm text-amber-500">timer</span>
              <span className="text-sm font-bold text-amber-500 tabular-nums">
                {readingTimeLeft}s
              </span>
            </div>
          )}
          <button
            onClick={handleExit}
            className="text-text-muted hover:text-text-main dark:hover:text-white transition-colors"
            aria-label="Exit game"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      {/* Case Result Screen */}
      {phase === 'case-result' && (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-8">
            <div className="text-center mb-6">
              <div className="size-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-primary">
                  assignment_turned_in
                </span>
              </div>
              <h3 className="text-lg font-black text-text-main dark:text-white mb-1">
                Case Complete: {currentCase.clientName}
              </h3>
              <p className="text-sm text-text-muted">{currentCase.industry}</p>
            </div>

            {/* Satisfaction / Impact */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-blue-500">
                  {caseSatisfaction > 0 ? '+' : ''}{caseSatisfaction}
                </p>
                <p className="text-xs text-text-muted">Client Satisfaction</p>
              </div>
              <div className="bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-green-500">
                  {caseImpact > 0 ? '+' : ''}{caseImpact}
                </p>
                <p className="text-xs text-text-muted">Strategic Impact</p>
              </div>
            </div>

            {/* Dimension shifts for this case */}
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                Profile Shifts This Case
              </p>
              <div className="space-y-3">
                {DIMENSION_META.map((dim) => {
                  const delta = caseDimensionDeltas[dim.key];
                  const value = dimensions[dim.key];
                  const colors = DIMENSION_COLORS[dim.color];
                  return (
                    <div key={dim.key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`material-symbols-outlined text-xs ${colors.text}`}>{dim.icon}</span>
                          <span className={`text-[11px] font-bold ${colors.text}`}>{dim.label}</span>
                        </div>
                        <span className={`text-[11px] font-bold tabular-nums ${delta > 0 ? colors.text : delta < 0 ? colors.text : 'text-text-muted'}`}>
                          {delta > 0 ? '+' : ''}{delta !== 0 ? delta : '--'}
                        </span>
                      </div>
                      <SpectrumBar
                        value={value}
                        lowLabel={dim.lowLabel}
                        highLabel={dim.highLabel}
                        color={dim.color}
                        compact
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleNextCase}
                className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all shadow-md shadow-primary/20"
              >
                {caseIndex < TOTAL_CASES - 1 ? 'Next Case' : 'See Your Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brief Document */}
      {(phase === 'reading' || phase === 'deciding') && (
        <>
          {/* Reading overlay */}
          {phase === 'reading' && (
            <div className="mb-4 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-amber-500">menu_book</span>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Read the brief carefully -- decisions will appear when the timer ends
              </span>
            </div>
          )}

          {/* Brief document */}
          <div
            className={`bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 overflow-hidden transition-opacity duration-500 ${
              briefFaded && !showBriefPeek ? 'opacity-40' : 'opacity-100'
            } ${showBriefPeek ? 'ring-2 ring-primary/40' : ''}`}
          >
            {/* Document header */}
            <div className="bg-background-light dark:bg-white/5 px-6 py-4 border-b border-text-main/5 dark:border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Client Brief
                </span>
                <span className="text-xs text-text-muted">|</span>
                <span className="text-xs font-medium text-primary">
                  {currentCase.industry}
                </span>
              </div>
              <h2
                className="text-lg font-black text-text-main dark:text-white"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {currentCase.briefTitle}
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                Prepared for: {currentCase.clientName}
              </p>
            </div>

            {/* Brief sections */}
            <div className="px-6 py-5 space-y-5 max-h-[420px] overflow-y-auto">
              {currentCase.briefSections.map((sec, i) => (
                <div key={i}>
                  <h3 className="text-sm font-black uppercase tracking-wider text-text-main dark:text-white mb-2">
                    {sec.heading}
                  </h3>
                  <p
                    className="text-sm text-text-main/80 dark:text-gray-300 leading-relaxed"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {sec.content}
                  </p>
                  {sec.highlight && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full">
                      <span className="material-symbols-outlined text-xs text-primary">
                        trending_up
                      </span>
                      <span className="text-xs font-bold text-primary">{sec.highlight}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Decision area */}
          {phase === 'deciding' && currentDecision && (
            <div className="mt-6 animate-[fadeIn_0.3s_ease-out]">
              {/* Satisfaction / Impact meters */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                      Client Satisfaction
                    </span>
                    <span className="text-xs font-bold text-blue-500 tabular-nums">
                      {caseSatisfaction > 0 ? '+' : ''}{caseSatisfaction}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-blue-500 rounded-full transition-all duration-500 ${
                        animateSat ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${meterPercent(caseSatisfaction, SAT_RANGE)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-green-500 uppercase tracking-wider">
                      Strategic Impact
                    </span>
                    <span className="text-xs font-bold text-green-500 tabular-nums">
                      {caseImpact > 0 ? '+' : ''}{caseImpact}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-green-500 rounded-full transition-all duration-500 ${
                        animateImp ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${meterPercent(caseImpact, IMP_RANGE)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Dimension mini-indicators */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {DIMENSION_META.map((dim) => {
                  const value = dimensions[dim.key];
                  const colors = DIMENSION_COLORS[dim.color];
                  return (
                    <div key={dim.key} className={`${colors.bgLight} rounded-lg px-2 py-1.5 text-center`}>
                      <span className={`material-symbols-outlined text-xs ${colors.text}`}>{dim.icon}</span>
                      <p className={`text-xs font-bold tabular-nums ${colors.text}`}>{value}</p>
                      <p className="text-[9px] text-text-muted truncate">{dim.label.split(' ')[0]}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reference button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleReference}
                  disabled={showBriefPeek}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    showBriefPeek
                      ? 'bg-gray-200 dark:bg-gray-700 text-text-muted cursor-not-allowed'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  Peek at Brief (-5s)
                </button>
              </div>

              {/* Decision card */}
              <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Decision {decisionIndex + 1} of {currentCase.decisions.length}
                  </span>
                </div>
                <h3 className="text-base font-black text-text-main dark:text-white mb-2">
                  {currentDecision.question}
                </h3>
                <p className="text-sm text-text-muted mb-5">{currentDecision.context}</p>

                {/* Options */}
                <div className="space-y-3">
                  {currentDecision.options.map((opt, i) => {
                    const isSelected = selectedOption === i;
                    const hasSelected = selectedOption !== null;
                    const isClickable = !hasSelected;

                    let optStyles: string;
                    if (hasSelected) {
                      if (isSelected) {
                        optStyles =
                          'bg-primary/10 border border-primary/30 ring-1 ring-primary/20';
                      } else {
                        optStyles =
                          'bg-background-light dark:bg-white/5 border border-text-main/5 dark:border-white/5 opacity-40';
                      }
                    } else {
                      optStyles =
                        'bg-background-light dark:bg-white/5 border border-text-main/10 dark:border-white/10 hover:border-primary/40 hover:bg-primary/5 cursor-pointer';
                    }

                    return (
                      <button
                        key={i}
                        onClick={isClickable ? () => handleOptionSelect(i) : undefined}
                        disabled={!isClickable}
                        className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 ${optStyles} ${
                          isClickable ? 'active:scale-[0.99]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 size-6 rounded-full bg-text-main/10 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-text-main dark:text-white mt-0.5">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <p className="text-sm text-text-main dark:text-gray-200 leading-relaxed">
                            {opt.text}
                          </p>
                        </div>
                        {/* Show impact after selection */}
                        {isSelected && (
                          <div className="mt-3 ml-9 animate-[fadeIn_0.3s_ease-out]">
                            <div className="flex items-center gap-4 mb-2">
                              <span
                                className={`text-xs font-bold ${
                                  opt.satisfaction >= 0 ? 'text-blue-500' : 'text-red-500'
                                }`}
                              >
                                Satisfaction: {opt.satisfaction > 0 ? '+' : ''}
                                {opt.satisfaction}
                              </span>
                              <span
                                className={`text-xs font-bold ${
                                  opt.impact >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}
                              >
                                Impact: {opt.impact > 0 ? '+' : ''}
                                {opt.impact}
                              </span>
                            </div>
                            {/* Dimension impacts */}
                            <div className="flex flex-wrap gap-2">
                              {DIMENSION_META.map((dim) => {
                                const delta = opt.dimensions[dim.key];
                                if (!delta) return null;
                                const colors = DIMENSION_COLORS[dim.color];
                                return (
                                  <span
                                    key={dim.key}
                                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${colors.text} ${colors.bgLight} px-2 py-0.5 rounded-full`}
                                  >
                                    <span className="material-symbols-outlined text-[11px]">{dim.icon}</span>
                                    {delta > 0 ? '+' : ''}{delta}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Next button */}
                {showDecisionResult && (
                  <div className="flex justify-end mt-5 animate-[fadeIn_0.3s_ease-out]">
                    <button
                      onClick={handleNextDecision}
                      className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all shadow-md shadow-primary/20"
                    >
                      {decisionIndex < currentCase.decisions.length - 1
                        ? 'Next Decision'
                        : 'Complete Case'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CaseCommand;
