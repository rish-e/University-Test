import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';
import { spreadsheetChallenges, SpreadsheetChallenge } from '../../../data/t1-spreadsheets';

type Phase = 'intro' | 'playing' | 'complete';

interface ChallengeState {
  solved: boolean;
  attempts: number;
  pointsEarned: number;
}

export const SpreadsheetRescue: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [challengeStates, setChallengeStates] = useState<ChallengeState[]>(
    spreadsheetChallenges.map(() => ({ solved: false, attempts: 0, pointsEarned: 0 }))
  );
  const [cellStatus, setCellStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [startTime] = useState(Date.now());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state for PivotTable challenge
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [droppedItems, setDroppedItems] = useState<Record<string, string[]>>({});

  const challenge = spreadsheetChallenges[currentIndex];
  const maxPoints = spreadsheetChallenges.reduce((sum, c) => sum + c.points, 0);
  const totalEarned = challengeStates.reduce((sum, s) => sum + s.pointsEarned, 0);

  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();

  const handleStart = useCallback(() => {
    setPhase('playing');
  }, []);

  const handleSubmit = useCallback(() => {
    if (challenge.isDragDrop) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    const isCorrect = challenge.acceptedAnswers.some(
      (ans) => normalize(ans) === normalize(trimmed)
    );

    setChallengeStates((prev) => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        attempts: updated[currentIndex].attempts + 1,
        solved: isCorrect,
        pointsEarned: isCorrect ? challenge.points : 0,
      };
      return updated;
    });

    if (isCorrect) {
      setCellStatus('correct');
      onXPGain(challenge.points, `spreadsheet-${challenge.id}`);
      setTimeout(() => {
        advance();
      }, 1200);
    } else {
      setCellStatus('wrong');
      setTimeout(() => setCellStatus('idle'), 600);
    }
  }, [input, challenge, currentIndex]);

  const handleDragDropSubmit = useCallback(() => {
    if (!challenge.dropZones) return;
    const allCorrect = challenge.dropZones.every((zone) => {
      const items = droppedItems[zone.label] || [];
      return (
        items.length === zone.acceptedItems.length &&
        zone.acceptedItems.every((ai) => items.includes(ai))
      );
    });

    setChallengeStates((prev) => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        attempts: updated[currentIndex].attempts + 1,
        solved: allCorrect,
        pointsEarned: allCorrect ? challenge.points : 0,
      };
      return updated;
    });

    if (allCorrect) {
      setCellStatus('correct');
      onXPGain(challenge.points, `spreadsheet-pivot-${challenge.id}`);
      setTimeout(() => advance(), 1200);
    } else {
      setCellStatus('wrong');
      setTimeout(() => setCellStatus('idle'), 600);
    }
  }, [challenge, currentIndex, droppedItems]);

  const advance = useCallback(() => {
    if (currentIndex < spreadsheetChallenges.length - 1) {
      setCurrentIndex((i) => i + 1);
      setInput('');
      setCellStatus('idle');
      setShowHint(false);
      setSelectedCell(null);
      setDroppedItems({});
    } else {
      setPhase('complete');
    }
  }, [currentIndex]);

  const finishGame = useCallback(() => {
    const finalPoints = challengeStates.reduce((s, c) => s + c.pointsEarned, 0);
    const result: GameResult = {
      score: Math.round((finalPoints / maxPoints) * 100),
      rawScore: finalPoints,
      timeSpent: Math.round((Date.now() - startTime) / 1000),
      metrics: {
        totalChallenges: spreadsheetChallenges.length,
        solved: challengeStates.filter((c) => c.solved).length,
        totalAttempts: challengeStates.reduce((s, c) => s + c.attempts, 0),
      },
      type: 'spreadsheet-rescue',
    };
    onComplete(result);
  }, [challengeStates, maxPoints, startTime, onComplete]);

  useEffect(() => {
    if (phase === 'complete') {
      finishGame();
    }
  }, [phase, finishGame]);

  const handleCellClick = (row: number, col: number, cell: SpreadsheetChallenge['grid'][0][0]) => {
    if (cell.isEditable) {
      setSelectedCell({ row, col });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (challenge.isDragDrop) {
        handleDragDropSubmit();
      } else {
        handleSubmit();
      }
    }
  };

  const handleDragStart = (item: string) => {
    setDraggedItem(item);
  };

  const handleDrop = (zoneName: string) => {
    if (!draggedItem) return;
    setDroppedItems((prev) => {
      const updated = { ...prev };
      // Remove from all zones first
      for (const key of Object.keys(updated)) {
        updated[key] = updated[key].filter((i) => i !== draggedItem);
      }
      updated[zoneName] = [...(updated[zoneName] || []), draggedItem];
      return updated;
    });
    setDraggedItem(null);
  };

  const handleRemoveFromZone = (zoneName: string, item: string) => {
    setDroppedItems((prev) => ({
      ...prev,
      [zoneName]: (prev[zoneName] || []).filter((i) => i !== item),
    }));
  };

  const handleExit = useCallback(() => {
    const progress: AssessmentProgress = {
      step: currentIndex,
      correctCount: challengeStates.filter((c) => c.solved).length,
      textInput: '',
      gameScore: totalEarned,
      simState: null,
      xpEarned: totalEarned,
    };
    onExit(progress);
  }, [currentIndex, challengeStates, totalEarned, onExit]);

  // --- INTRO ---
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Spreadsheet Rescue"
        description="Fix broken formulas in a simulated spreadsheet. Test your Excel knowledge across VLOOKUP, SUMIF, IF, absolute references, and more."
        icon="table_chart"
        duration={section.duration || '15 min'}
        rules={[
          'Each challenge shows a spreadsheet with a broken cell highlighted in red.',
          'Click the broken cell and type the correct formula or value.',
          'Answers are case-insensitive. Multiple valid formats accepted.',
          'One challenge uses drag-and-drop for PivotTable layout.',
          'Hints are available but use them wisely!',
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
            <span className="material-symbols-outlined text-5xl text-primary">check_circle</span>
          </div>
          <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">Challenge Complete!</h2>
          <p className="text-text-muted mb-6">
            You fixed {solved} of {spreadsheetChallenges.length} spreadsheets.
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
  const cellRef = `${String.fromCharCode(64 + challenge.targetCell.col)}${challenge.targetCell.row}`;
  const usedDragItems = Object.values(droppedItems).flat();
  const availableDragItems = (challenge.dragItems || []).filter((i) => !usedDragItems.includes(i));

  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.2s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <ProgressTrack current={currentIndex} total={spreadsheetChallenges.length} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-text-muted tabular-nums">{totalEarned} pts</span>
          <button onClick={handleExit} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      {/* Challenge title and description */}
      <div className="mb-4">
        <h3 className="text-lg font-black text-text-main dark:text-white">{challenge.title}</h3>
        <p className="text-sm text-text-muted mt-1">{challenge.description}</p>
      </div>

      {/* Formula bar */}
      {!challenge.isDragDrop && (
        <div className="flex items-center gap-2 mb-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2">
          <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {selectedCell ? cellRef : '--'}
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-xs font-mono italic text-gray-500 dark:text-gray-400 mr-1">fx</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Click the highlighted cell and type a formula..."
            className="flex-1 bg-transparent text-sm font-mono text-text-main dark:text-white outline-none placeholder:text-gray-400"
          />
        </div>
      )}

      {/* Spreadsheet grid */}
      <div className="overflow-x-auto border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
        <table className="w-full border-collapse">
          <tbody>
            {challenge.grid.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const isTarget = ri === challenge.targetCell.row && ci === challenge.targetCell.col;
                  const isSelected = selectedCell?.row === ri && selectedCell?.col === ci;
                  const isSolved = challengeStates[currentIndex].solved;

                  let cellClasses = 'px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 transition-all duration-200';

                  if (ri === 0 && cell.isHeader) {
                    // Column header row
                    cellClasses += ' bg-[#217346] text-white font-bold text-center text-xs';
                  } else if (ci === 0 && cell.isHeader) {
                    // Row number column
                    cellClasses += ' bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-xs text-center w-10';
                  } else if (cell.highlight && !isSolved) {
                    cellClasses += ' bg-red-50 dark:bg-red-900/20 cursor-pointer';
                    if (cellStatus === 'correct' && isTarget) {
                      cellClasses = cellClasses.replace('bg-red-50 dark:bg-red-900/20', 'bg-green-50 dark:bg-green-900/30');
                    }
                    if (cellStatus === 'wrong' && isTarget) {
                      cellClasses += ' animate-[shake_0.3s_ease-in-out]';
                    }
                    if (isSelected) {
                      cellClasses += ' ring-2 ring-primary';
                    }
                  } else if (cell.highlight && isSolved) {
                    cellClasses += ' bg-green-50 dark:bg-green-900/30';
                  } else {
                    cellClasses += ' bg-white dark:bg-gray-900';
                  }

                  const displayValue = (() => {
                    if (isTarget && isSolved) {
                      return input || cell.value;
                    }
                    if (isTarget && cell.highlight && !isSolved) {
                      return cell.value;
                    }
                    return cell.value;
                  })();

                  return (
                    <td
                      key={ci}
                      className={cellClasses}
                      onClick={() => handleCellClick(ri, ci, cell)}
                    >
                      {isTarget && cell.highlight && !isSolved ? (
                        <div className="flex items-center gap-1">
                          <span className={`font-mono ${cell.value.includes('ERROR') || cell.value === '?' ? 'text-red-500 font-bold' : ''}`}>
                            {isSelected ? (
                              <span className="text-primary font-mono">{input || '|'}</span>
                            ) : (
                              <>
                                {cell.value}
                                {!isSelected && (
                                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-1 animate-pulse" />
                                )}
                              </>
                            )}
                          </span>
                        </div>
                      ) : isTarget && isSolved ? (
                        <span className="text-green-600 dark:text-green-400 font-bold font-mono flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">check</span>
                          {displayValue}
                        </span>
                      ) : (
                        <span className="font-mono">{displayValue}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drag-and-drop PivotTable builder */}
      {challenge.isDragDrop && challenge.dropZones && (
        <div className="mt-6 bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-5">
          <h4 className="text-sm font-bold text-text-main dark:text-white mb-4">PivotTable Field List</h4>

          {/* Available fields */}
          <div className="mb-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Available Fields</p>
            <div className="flex gap-2 flex-wrap min-h-[40px]">
              {availableDragItems.map((item) => (
                <div
                  key={item}
                  draggable
                  onDragStart={() => handleDragStart(item)}
                  className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-lg cursor-grab active:cursor-grabbing border border-blue-200 dark:border-blue-700 hover:shadow-md transition-shadow"
                >
                  {item}
                </div>
              ))}
              {availableDragItems.length === 0 && (
                <span className="text-xs text-text-muted italic">All fields assigned</span>
              )}
            </div>
          </div>

          {/* Drop zones */}
          <div className="grid grid-cols-2 gap-4">
            {challenge.dropZones.map((zone) => (
              <div
                key={zone.label}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(zone.label)}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 min-h-[80px] transition-colors hover:border-primary/50"
              >
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">{zone.label}</p>
                <div className="flex flex-wrap gap-2">
                  {(droppedItems[zone.label] || []).map((item) => (
                    <div
                      key={item}
                      className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg flex items-center gap-1.5"
                    >
                      {item}
                      <button
                        onClick={() => handleRemoveFromZone(zone.label, item)}
                        className="text-primary/60 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setShowHint((h) => !h)}
          className="text-sm text-text-muted hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">lightbulb</span>
          {showHint ? 'Hide Hint' : 'Show Hint'}
        </button>

        <button
          onClick={challenge.isDragDrop ? handleDragDropSubmit : handleSubmit}
          disabled={challenge.isDragDrop ? Object.values(droppedItems).flat().length === 0 : !input.trim()}
          className="px-6 py-2.5 bg-primary text-black font-bold text-sm rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm"
        >
          Submit Answer
        </button>
      </div>

      {/* Hint */}
      {showHint && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-sm text-amber-800 dark:text-amber-200 animate-[fadeIn_0.2s_ease-out]">
          <span className="material-symbols-outlined text-base mr-1 align-middle">tips_and_updates</span>
          {challenge.hint}
        </div>
      )}

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};
