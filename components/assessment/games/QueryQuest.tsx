import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';
import { queryChallenges, QueryChallenge } from '../../../data/t2-queries';

type Phase = 'intro' | 'playing' | 'complete';

interface ChallengeState {
  solved: boolean;
  attempts: number;
  pointsEarned: number;
  hintUsed: boolean;
}

export const QueryQuest: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sql, setSql] = useState('');
  const [challengeStates, setChallengeStates] = useState<ChallengeState[]>(
    queryChallenges.map(() => ({ solved: false, attempts: 0, pointsEarned: 0, hintUsed: false }))
  );
  const [queryStatus, setQueryStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [showExpected, setShowExpected] = useState(true);
  const [startTime] = useState(Date.now());
  const [errorMessage, setErrorMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const challenge = queryChallenges[currentIndex];
  const maxPoints = queryChallenges.reduce((sum, c) => sum + c.points, 0);
  const totalEarned = challengeStates.reduce((sum, s) => sum + s.pointsEarned, 0);

  const handleStart = useCallback(() => {
    setPhase('playing');
  }, []);

  const validateQuery = useCallback((query: string, ch: QueryChallenge): { valid: boolean; error: string } => {
    const trimmed = query.trim().replace(/;$/, '').trim();
    const upper = trimmed.toUpperCase();

    // Check required tokens
    const missingTokens = ch.requiredTokens.filter((token) => !upper.includes(token.toUpperCase()));
    if (missingTokens.length > 0) {
      return { valid: false, error: `Missing required SQL keywords: ${missingTokens.join(', ')}` };
    }

    // Check against accepted patterns
    const matchesPattern = ch.acceptedPatterns.some((patternStr) => {
      try {
        const regex = new RegExp(patternStr, 'i');
        return regex.test(trimmed);
      } catch {
        return false;
      }
    });

    if (!matchesPattern) {
      return { valid: false, error: 'Query structure does not match the expected pattern. Check your syntax and column names.' };
    }

    return { valid: true, error: '' };
  }, []);

  const handleRunQuery = useCallback(() => {
    if (!sql.trim()) return;

    const result = validateQuery(sql, challenge);

    const hintPenalty = challengeStates[currentIndex].hintUsed ? Math.floor(challenge.points * 0.3) : 0;
    const earnedPoints = result.valid ? challenge.points - hintPenalty : 0;

    setChallengeStates((prev) => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        attempts: updated[currentIndex].attempts + 1,
        solved: result.valid,
        pointsEarned: result.valid ? earnedPoints : 0,
      };
      return updated;
    });

    if (result.valid) {
      setQueryStatus('correct');
      setErrorMessage('');
      onXPGain(earnedPoints, `query-${challenge.id}`);
      setTimeout(() => advance(), 1800);
    } else {
      setQueryStatus('wrong');
      setErrorMessage(result.error);
      setTimeout(() => setQueryStatus('idle'), 800);
    }
  }, [sql, challenge, currentIndex, challengeStates]);

  const advance = useCallback(() => {
    if (currentIndex < queryChallenges.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSql('');
      setQueryStatus('idle');
      setShowHint(false);
      setErrorMessage('');
    } else {
      setPhase('complete');
    }
  }, [currentIndex]);

  const handleUseHint = useCallback(() => {
    setChallengeStates((prev) => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], hintUsed: true };
      return updated;
    });
    setShowHint(true);
  }, [currentIndex]);

  const finishGame = useCallback(() => {
    const finalPoints = challengeStates.reduce((s, c) => s + c.pointsEarned, 0);
    const result: GameResult = {
      score: Math.round((finalPoints / maxPoints) * 100),
      rawScore: finalPoints,
      timeSpent: Math.round((Date.now() - startTime) / 1000),
      metrics: {
        totalChallenges: queryChallenges.length,
        solved: challengeStates.filter((c) => c.solved).length,
        totalAttempts: challengeStates.reduce((s, c) => s + c.attempts, 0),
        hintsUsed: challengeStates.filter((c) => c.hintUsed).length,
      },
      type: 'query-quest',
    };
    onComplete(result);
  }, [challengeStates, maxPoints, startTime, onComplete]);

  useEffect(() => {
    if (phase === 'complete') {
      finishGame();
    }
  }, [phase, finishGame]);

  const handleExit = useCallback(() => {
    const progress: AssessmentProgress = {
      step: currentIndex,
      correctCount: challengeStates.filter((c) => c.solved).length,
      textInput: sql,
      gameScore: totalEarned,
      simState: null,
      xpEarned: totalEarned,
    };
    onExit(progress);
  }, [currentIndex, challengeStates, sql, totalEarned, onExit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRunQuery();
    }
    // Tab inserts spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      setSql(sql.substring(0, start) + '  ' + sql.substring(end));
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="QueryQuest"
        description="Write SQL queries against visual database schemas. Progress from basic SELECTs to JOINs and aggregations."
        icon="database"
        duration={section.duration || '15 min'}
        rules={[
          'Each challenge shows a database schema and expected output.',
          'Write a SQL query that produces the expected result.',
          'Press Cmd/Ctrl + Enter or click "Run Query" to submit.',
          'Hints are available but reduce your points by 30%.',
          'Queries are validated for structure and required keywords.',
        ]}
        onStart={handleStart}
      />
    );
  }

  // --- COMPLETE ---
  if (phase === 'complete') {
    const solved = challengeStates.filter((c) => c.solved).length;
    return (
      <div className="max-w-lg mx-auto mt-16 text-center animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
          <div className="size-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">terminal</span>
          </div>
          <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">Quest Complete!</h2>
          <p className="text-text-muted mb-6">
            You solved {solved} of {queryChallenges.length} queries.
          </p>
          <div className="text-4xl font-black text-primary mb-2">{totalEarned} pts</div>
          <p className="text-sm text-text-muted mb-8">out of {maxPoints} possible</p>
          <button onClick={finishGame} className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all">
            Continue
          </button>
        </div>
      </div>
    );
  }

  // --- PLAYING ---
  const expectedCols = challenge.expectedOutput.length > 0 ? Object.keys(challenge.expectedOutput[0]) : [];

  return (
    <div className="max-w-6xl mx-auto animate-[fadeIn_0.2s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <ProgressTrack current={currentIndex} total={queryChallenges.length} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-text-muted tabular-nums">{totalEarned} pts</span>
          <button onClick={handleExit} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      {/* Challenge title */}
      <div className="mb-4">
        <h3 className="text-lg font-black text-text-main dark:text-white">{challenge.title}</h3>
        <p className="text-sm text-text-muted mt-1">{challenge.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Schema + Sample Data */}
        <div className="space-y-4">
          {/* Schema Diagram */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Schema</p>
            <div className="flex flex-wrap gap-3 relative">
              {challenge.tables.map((table) => (
                <div key={table.name} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm min-w-[180px]">
                  <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-t-lg text-sm font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">table_rows</span>
                    {table.name}
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {table.columns.map((col) => (
                      <div key={col.name} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          {col.isPK && (
                            <span className="material-symbols-outlined text-amber-500 text-xs" title="Primary Key">key</span>
                          )}
                          {col.isFK && (
                            <span className="material-symbols-outlined text-blue-500 text-xs" title={`FK → ${col.isFK}`}>link</span>
                          )}
                          <span className={`font-mono ${col.isPK ? 'font-bold text-text-main dark:text-white' : 'text-text-main dark:text-gray-300'}`}>
                            {col.name}
                          </span>
                        </div>
                        <span className="text-text-muted font-mono text-[10px]">{col.type}</span>
                      </div>
                    ))}
                  </div>
                  {/* FK line indicator */}
                  {table.columns.some((c) => c.isFK) && (
                    <div className="px-3 py-1 text-[10px] text-blue-500 dark:text-blue-400 border-t border-gray-100 dark:border-gray-800">
                      {table.columns.filter((c) => c.isFK).map((c) => (
                        <span key={c.name}>{c.name} &rarr; {c.isFK}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sample Data */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Sample Data</p>
            {Object.entries(challenge.sampleData).map(([tableName, rows]) => {
              const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
              return (
                <div key={tableName} className="mb-3 last:mb-0">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 font-mono">{tableName}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          {cols.map((col) => (
                            <th key={col} className="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold text-left text-text-main dark:text-gray-300">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, ri) => (
                          <tr key={ri}>
                            {cols.map((col) => (
                              <td key={col} className="px-2 py-1 border border-gray-200 dark:border-gray-700 font-mono text-text-main dark:text-gray-300">
                                {String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expected Output */}
          {showExpected && (
            <div className="bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Expected Output</p>
                <button onClick={() => setShowExpected(false)} className="text-xs text-text-muted hover:text-text-main transition-colors">Hide</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {expectedCols.map((col) => (
                        <th key={col} className="px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 font-mono font-bold text-left text-green-800 dark:text-green-300">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {challenge.expectedOutput.map((row, ri) => (
                      <tr key={ri}>
                        {expectedCols.map((col) => (
                          <td key={col} className="px-2 py-1 border border-green-200 dark:border-green-800 font-mono text-text-main dark:text-gray-300">
                            {String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: SQL Editor */}
        <div className="space-y-4">
          <div className={`rounded-xl overflow-hidden border-2 transition-colors ${
            queryStatus === 'correct' ? 'border-green-500' :
            queryStatus === 'wrong' ? 'border-red-500' :
            'border-gray-300 dark:border-gray-600'
          }`}>
            {/* Editor header */}
            <div className="bg-gray-800 dark:bg-gray-950 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500" />
                  <div className="size-3 rounded-full bg-yellow-500" />
                  <div className="size-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-400 ml-2 font-mono">query.sql</span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">Cmd/Ctrl + Enter to run</span>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SELECT ..."
              rows={10}
              spellCheck={false}
              className="w-full bg-gray-900 dark:bg-gray-950 text-green-400 font-mono text-sm p-4 resize-none outline-none placeholder:text-gray-600 leading-relaxed"
            />
          </div>

          {/* Run button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunQuery}
              disabled={!sql.trim()}
              className="flex-1 py-3 bg-primary text-black font-bold text-sm rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">play_arrow</span>
              Run Query
            </button>
            <button
              onClick={handleUseHint}
              disabled={challengeStates[currentIndex].hintUsed}
              className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold text-sm rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/50 active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">lightbulb</span>
              Hint {challengeStates[currentIndex].hintUsed ? '' : '(-30%)'}
            </button>
          </div>

          {/* Error message */}
          {errorMessage && queryStatus !== 'correct' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl text-sm text-red-700 dark:text-red-300 animate-[fadeIn_0.2s_ease-out]">
              <span className="material-symbols-outlined text-base mr-1 align-middle">error</span>
              {errorMessage}
            </div>
          )}

          {/* Success message */}
          {queryStatus === 'correct' && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl text-center animate-[fadeIn_0.2s_ease-out]">
              <span className="material-symbols-outlined text-4xl text-green-500 mb-1">check_circle</span>
              <p className="text-sm font-bold text-green-700 dark:text-green-300">Query Correct!</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                +{challengeStates[currentIndex].pointsEarned} points
                {challengeStates[currentIndex].hintUsed && ' (hint penalty applied)'}
              </p>
            </div>
          )}

          {/* Hint */}
          {showHint && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-sm text-amber-800 dark:text-amber-200 animate-[fadeIn_0.2s_ease-out]">
              <span className="material-symbols-outlined text-base mr-1 align-middle">tips_and_updates</span>
              {challenge.hint}
            </div>
          )}

          {!showExpected && (
            <button onClick={() => setShowExpected(true)} className="text-xs text-text-muted hover:text-primary transition-colors">
              Show Expected Output
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
