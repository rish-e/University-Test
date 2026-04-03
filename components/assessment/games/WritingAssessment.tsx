import React, { useState, useEffect } from 'react';
import { GameComponentProps } from '../../../types';
import { AssessmentShell } from '../AssessmentShell';

const WRITING_CONFIGS: Record<string, { title: string; desc: string; hasAudio: boolean; placeholder: string }> = {
  'e2': {
    title: "Audio Summary",
    desc: "Listen to the 2-minute business market update below. Summarize the key risks and opportunities mentioned.",
    hasAudio: true,
    placeholder: "Summarize the key points here..."
  },
  'e4': {
    title: '"Why Tetr?" Essay',
    desc: "In 200 words, explain why Tetr College of Business is the right fit for your entrepreneurial journey. Highlight specific aspects of the curriculum.",
    hasAudio: false,
    placeholder: "Start your essay here..."
  },
};

export const WritingAssessment: React.FC<GameComponentProps> = ({ section, onComplete, onExit }) => {
  const [textInput, setTextInput] = useState(section.progressState?.textInput || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = WRITING_CONFIGS[section.id] || {
    title: "Essay Response",
    desc: "Please explain your motivation for applying to this program.",
    hasAudio: false,
    placeholder: "Start typing your response here..."
  };

  const wordCount = textInput.split(/\s+/).filter(w => w.length > 0).length;
  const progress = Math.min(100, (textInput.length / 200) * 100);

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onComplete({
      score: 0, // AI will score this
      rawScore: 0,
      timeSpent: section.startTime ? Math.floor((Date.now() - section.startTime) / 1000) : 0,
      metrics: { wordCount },
      type: 'writing',
      data: textInput,
    });
  };

  const handleExit = () => {
    onExit({
      step: 0,
      correctCount: 0,
      textInput,
      gameScore: 0,
      simState: {},
    });
  };

  return (
    <AssessmentShell
      section={section}
      score={wordCount}
      onExit={handleExit}
      onTimeUp={handleSubmit}
      progress={progress}
    >
      <div className="max-w-3xl mx-auto mt-8 h-full flex flex-col">
        <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-text-main dark:text-white mb-2">{config.title}</h2>
          <p className="text-text-muted mb-6">{config.desc}</p>

          {config.hasAudio && (
            <div className="bg-background-light dark:bg-white/5 p-4 rounded-xl mb-6 flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-12 rounded-full bg-primary text-black flex items-center justify-center hover:bg-[#00d64b] transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-2xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
              </button>
              <div className="flex-1">
                <div className="text-xs font-bold text-text-main dark:text-white mb-1">Market Update Q3.mp3</div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full bg-primary transition-all duration-[120s] ${isPlaying ? 'w-full' : 'w-0'}`} />
                </div>
              </div>
              <span className="text-xs font-mono text-text-muted">02:00</span>
            </div>
          )}

          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={config.placeholder}
            className="flex-1 w-full p-4 rounded-xl bg-background-light dark:bg-white/5 border-2 border-transparent focus:border-primary/50 outline-none text-text-main dark:text-white resize-none min-h-[200px]"
          />
          <div className="flex justify-between items-center mt-6">
            <span className="text-sm text-text-muted font-mono">{wordCount} words</span>
            <button
              onClick={handleSubmit}
              disabled={textInput.length < 50 || isSubmitting}
              className="px-8 py-3 bg-primary text-black font-bold rounded-xl disabled:opacity-50 hover:bg-[#00d64b] transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Response'}
            </button>
          </div>
        </div>
      </div>
    </AssessmentShell>
  );
};
