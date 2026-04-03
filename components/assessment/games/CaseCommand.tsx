import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameComponentProps, GameResult } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';
import { caseBriefs, type CaseBrief, type CaseDecision, type CaseOption } from '../../../data/e1-cases';

type GamePhase = 'intro' | 'reading' | 'deciding' | 'case-result' | 'complete';

const READING_SECONDS = 60;
const TOTAL_CASES = caseBriefs.length;
const REFERENCE_PENALTY_SECONDS = 5;

// Max possible: each case has 3 decisions, each optimal is +30 satisfaction + +30 impact = +60 per decision
// 3 decisions * 3 cases = 9 decisions total
// But actual values vary, so we normalize based on optimal path
function computeOptimalTotal(): { satisfaction: number; impact: number } {
  let sat = 0;
  let imp = 0;
  for (const brief of caseBriefs) {
    for (const dec of brief.decisions) {
      const optimal = dec.options.find((o) => o.isOptimal);
      if (optimal) {
        sat += optimal.satisfaction;
        imp += optimal.impact;
      }
    }
  }
  return { satisfaction: sat, impact: imp };
}

const OPTIMAL_TOTALS = computeOptimalTotal();
const MAX_RAW = OPTIMAL_TOTALS.satisfaction + OPTIMAL_TOTALS.impact;

export const CaseCommand: React.FC<GameComponentProps> = ({
  section,
  onComplete,
  onExit,
  onXPGain,
}) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [caseIndex, setCaseIndex] = useState(0);
  const [decisionIndex, setDecisionIndex] = useState(0);

  // Scores
  const [totalSatisfaction, setTotalSatisfaction] = useState(0);
  const [totalImpact, setTotalImpact] = useState(0);
  const [caseSatisfaction, setCaseSatisfaction] = useState(0);
  const [caseImpact, setCaseImpact] = useState(0);

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
    // Auto-hide after 8 seconds
    setTimeout(() => setShowBriefPeek(false), 8000);
  }, []);

  const handleOptionSelect = useCallback(
    (optIndex: number) => {
      if (selectedOption !== null) return;

      const option = currentDecision.options[optIndex];
      setSelectedOption(optIndex);

      // Update scores
      const newCaseSat = caseSatisfaction + option.satisfaction;
      const newCaseImp = caseImpact + option.impact;
      setCaseSatisfaction(newCaseSat);
      setCaseImpact(newCaseImp);

      // Trigger meter animations
      setAnimateSat(true);
      setAnimateImp(true);
      setTimeout(() => {
        setAnimateSat(false);
        setAnimateImp(false);
      }, 600);

      if (option.isOptimal) {
        onXPGain(20, 'Optimal decision');
      } else if (option.satisfaction >= 0 && option.impact >= 0) {
        onXPGain(8, 'Reasonable decision');
      }

      setChoiceHistory((prev) => [...prev, optIndex]);
      setShowDecisionResult(true);
    },
    [selectedOption, currentDecision, caseSatisfaction, caseImpact, onXPGain]
  );

  const handleNextDecision = useCallback(() => {
    const nextDec = decisionIndex + 1;

    if (nextDec >= currentCase.decisions.length) {
      // Case complete
      const newTotalSat = totalSatisfaction + caseSatisfaction;
      const newTotalImp = totalImpact + caseImpact;
      setTotalSatisfaction(newTotalSat);
      setTotalImpact(newTotalImp);
      setPhase('case-result');
      return;
    }

    setDecisionIndex(nextDec);
    setSelectedOption(null);
    setShowDecisionResult(false);
  }, [decisionIndex, currentCase, totalSatisfaction, totalImpact, caseSatisfaction, caseImpact]);

  const handleNextCase = useCallback(() => {
    const nextCase = caseIndex + 1;

    if (nextCase >= TOTAL_CASES) {
      // All cases done
      setPhase('complete');
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      const finalSat = totalSatisfaction;
      const finalImp = totalImpact;
      const rawScore = finalSat + finalImp;
      const normalized = Math.max(0, Math.min(100, Math.round((rawScore / MAX_RAW) * 100)));

      const result: GameResult = {
        score: normalized,
        rawScore,
        timeSpent,
        type: 'case_command',
        metrics: {
          totalSatisfaction: finalSat,
          totalImpact: finalImp,
          casesCompleted: TOTAL_CASES,
          referencePenalty,
          maxPossible: MAX_RAW,
        },
      };
      onComplete(result);
      return;
    }

    setCaseIndex(nextCase);
    setDecisionIndex(0);
    setCaseSatisfaction(0);
    setCaseImpact(0);
    setSelectedOption(null);
    setShowDecisionResult(false);
    setChoiceHistory([]);
    setBriefFaded(false);
    setShowBriefPeek(false);
    setReadingTimeLeft(READING_SECONDS);
    setPhase('reading');
  }, [caseIndex, totalSatisfaction, totalImpact, referencePenalty, onComplete]);

  const handleExit = useCallback(() => {
    onExit({
      step: caseIndex,
      correctCount: 0,
      textInput: '',
      gameScore: totalSatisfaction + totalImpact,
      simState: { caseIndex, decisionIndex, choiceHistory },
      xpEarned: totalSatisfaction + totalImpact,
    });
  }, [caseIndex, decisionIndex, choiceHistory, totalSatisfaction, totalImpact, onExit]);

  // -- Meter helpers --
  // Satisfaction and impact can range from negative to positive.
  // We show them as bars from center (0) outward.
  const SAT_MAX = OPTIMAL_TOTALS.satisfaction;
  const IMP_MAX = OPTIMAL_TOTALS.impact;

  function meterPercent(value: number, max: number): number {
    return Math.max(0, Math.min(100, ((value + max) / (2 * max)) * 100));
  }

  // Intro
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Case Command"
        description="Read client briefs, then make strategic decisions that affect satisfaction and impact."
        icon="business_center"
        duration="8-12 min"
        rules={[
          'Read the client brief carefully during the 60-second reading period',
          'After reading, make 3 sequential strategic decisions per case',
          'Each decision affects Client Satisfaction and Strategic Impact meters',
          'You can peek at the brief again, but it costs 5 seconds off your time',
        ]}
        onStart={handleStart}
      />
    );
  }

  // Completion
  if (phase === 'complete') {
    const rawScore = totalSatisfaction + totalImpact;
    const normalized = Math.max(0, Math.min(100, Math.round((rawScore / MAX_RAW) * 100)));
    return (
      <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
          <div className="size-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">emoji_events</span>
          </div>
          <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">
            All Cases Complete
          </h2>
          <p className="text-4xl font-black text-primary mb-2">{normalized}</p>
          <p className="text-sm text-text-muted mb-6">out of 100</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-2xl font-black text-blue-500">{totalSatisfaction}</p>
              <p className="text-xs text-text-muted">Client Satisfaction</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <p className="text-2xl font-black text-green-500">{totalImpact}</p>
              <p className="text-xs text-text-muted">Strategic Impact</p>
            </div>
          </div>

          {referencePenalty > 0 && (
            <p className="text-xs text-text-muted">
              Reference penalty: -{referencePenalty}s across all cases
            </p>
          )}
        </div>
      </div>
    );
  }

  // Reading + Deciding + Case Result
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
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-8 text-center">
            <div className="size-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">
                assignment_turned_in
              </span>
            </div>
            <h3 className="text-lg font-black text-text-main dark:text-white mb-1">
              Case Complete: {currentCase.clientName}
            </h3>
            <p className="text-sm text-text-muted mb-6">{currentCase.industry}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-2xl font-black text-blue-500">
                  {caseSatisfaction > 0 ? '+' : ''}
                  {caseSatisfaction}
                </p>
                <p className="text-xs text-text-muted">Client Satisfaction</p>
              </div>
              <div className="bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-2xl font-black text-green-500">
                  {caseImpact > 0 ? '+' : ''}
                  {caseImpact}
                </p>
                <p className="text-xs text-text-muted">Strategic Impact</p>
              </div>
            </div>

            <button
              onClick={handleNextCase}
              className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all shadow-md shadow-primary/20"
            >
              {caseIndex < TOTAL_CASES - 1 ? 'Next Case' : 'See Final Results'}
            </button>
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
              {/* Meters */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                      Client Satisfaction
                    </span>
                    <span className="text-xs font-bold text-blue-500 tabular-nums">
                      {caseSatisfaction > 0 ? '+' : ''}
                      {caseSatisfaction}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-blue-500 rounded-full transition-all duration-500 ${
                        animateSat ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${meterPercent(caseSatisfaction, SAT_MAX)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-green-500 uppercase tracking-wider">
                      Strategic Impact
                    </span>
                    <span className="text-xs font-bold text-green-500 tabular-nums">
                      {caseImpact > 0 ? '+' : ''}
                      {caseImpact}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-green-500 rounded-full transition-all duration-500 ${
                        animateImp ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${meterPercent(caseImpact, IMP_MAX)}%` }}
                    />
                  </div>
                </div>
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
                    let optStyles =
                      'bg-background-light dark:bg-white/5 border border-text-main/10 dark:border-white/10 hover:border-primary/40 hover:bg-primary/5 cursor-pointer';
                    let isClickable = selectedOption === null;

                    if (selectedOption !== null) {
                      isClickable = false;
                      if (i === selectedOption) {
                        if (opt.isOptimal) {
                          optStyles =
                            'bg-green-500/10 border border-green-500/30 ring-1 ring-green-500/20';
                        } else if (opt.satisfaction >= 0 && opt.impact >= 0) {
                          optStyles =
                            'bg-amber-500/10 border border-amber-500/30 ring-1 ring-amber-500/20';
                        } else {
                          optStyles =
                            'bg-red-500/10 border border-red-500/30 ring-1 ring-red-500/20';
                        }
                      } else {
                        optStyles =
                          'bg-background-light dark:bg-white/5 border border-text-main/5 dark:border-white/5 opacity-40';
                      }
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
                        {selectedOption === i && (
                          <div className="flex items-center gap-4 mt-3 ml-9 animate-[fadeIn_0.3s_ease-out]">
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
                            {opt.isOptimal && (
                              <span className="text-xs font-bold text-primary flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                Optimal
                              </span>
                            )}
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
