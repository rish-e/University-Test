import React, { useState, useEffect, useRef } from 'react';
import { ModuleSection } from '../types';

interface AssessmentRunnerProps {
  section: ModuleSection;
  onComplete: () => void;
  onExit: () => void;
}

// --- MOCK CONTENT DATA ---
const QUIZ_DATA = [
  {
    question: "If Company A's revenue grew by 20% from $1M to $1.2M, what is the projected revenue for next year at the same growth rate?",
    options: ["$1.3M", "$1.4M", "$1.44M", "$1.5M"],
    correct: 2
  },
  {
    question: "Which of the following is NOT a primary key constraint in SQL?",
    options: ["Unique", "Not Null", "Duplicate Allowed", "Indexed"],
    correct: 2
  },
  {
    question: "In the sequence 2, 6, 12, 20, 30, ... what comes next?",
    options: ["40", "42", "44", "38"],
    correct: 1
  }
];

export const AssessmentRunner: React.FC<AssessmentRunnerProps> = ({ section, onComplete, onExit }) => {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  
  // Parse duration logic
  const parseDuration = (duration?: string) => {
    if (!duration) return 600; // Default 10 mins
    const match = duration.match(/(\d+)/);
    return match ? parseInt(match[0]) * 60 : 600;
  };

  // Global Timer State
  const [globalTimeLeft, setGlobalTimeLeft] = useState(() => parseDuration(section.duration));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quiz State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  // Writing State
  const [textInput, setTextInput] = useState('');
  
  // Game/Sim State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [gameScore, setGameScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);

  // Video State
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFinish = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // Simulate processing
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  // Global Timer Effect
  useEffect(() => {
    if (globalTimeLeft <= 0) return;

    const timerId = setInterval(() => {
      setGlobalTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleFinish(); // Auto-submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- LOGIC PER TYPE ---

  // Timer for Game (Mini-game specific)
  useEffect(() => {
    let interval: number;
    if (gameState === 'playing' && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('finished');
      // We don't finish the whole section here, just the mini-game
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  const renderQuiz = () => {
    const currentQ = QUIZ_DATA[step % QUIZ_DATA.length];
    
    const handleNext = () => {
      if (step < 4) { // Simulate 5 questions
        setStep(s => s + 1);
        setProgress((step + 1) * 20);
        setSelectedOption(null);
      } else {
        handleFinish();
      }
    };

    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
          <span className="text-xs font-bold text-primary-dark dark:text-primary uppercase tracking-wider mb-2 block">Question {step + 1} of 5</span>
          <h2 className="text-xl font-bold text-text-main dark:text-white mb-6 leading-relaxed">
            {currentQ.question}
          </h2>
          
          <div className="space-y-3 mb-8">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedOption(idx)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedOption === idx 
                    ? 'border-primary bg-primary/10 text-text-main dark:text-white font-bold' 
                    : 'border-transparent bg-background-light dark:bg-white/5 text-text-muted hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
             <button
              onClick={handleNext}
              disabled={selectedOption === null || isSubmitting}
              className="px-8 py-3 bg-primary text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00d64b] transition-colors"
             >
               {step === 4 ? (isSubmitting ? 'Submitting...' : 'Finish Quiz') : 'Next Question'}
             </button>
          </div>
        </div>
      </div>
    );
  };

  const renderWriting = () => {
    return (
      <div className="max-w-3xl mx-auto mt-8 h-full flex flex-col">
        <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-text-main dark:text-white mb-2">Essay Response</h2>
          <p className="text-text-muted mb-6">Please explain your motivation for applying to this program. Focus on your long-term career goals. (Min 100 words)</p>
          
          <textarea
            value={textInput}
            onChange={(e) => {
                setTextInput(e.target.value);
                setProgress(Math.min(100, (e.target.value.length / 200) * 100));
            }}
            placeholder="Start typing your response here..."
            className="flex-1 w-full p-4 rounded-xl bg-background-light dark:bg-white/5 border-2 border-transparent focus:border-primary/50 outline-none text-text-main dark:text-white resize-none"
          />
          
          <div className="flex justify-between items-center mt-6">
            <span className="text-sm text-text-muted font-mono">{textInput.split(/\s+/).filter(w => w.length > 0).length} words</span>
            <button
              onClick={handleFinish}
              disabled={textInput.length < 50 || isSubmitting} // Low limit for demo
              className="px-8 py-3 bg-primary text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Essay'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGame = () => {
    const handleGameClick = () => {
        if (gameState !== 'playing') return;
        setGameScore(s => s + 10);
        // visual feedback could go here
    };

    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        {gameState === 'idle' ? (
           <div className="bg-card-bg dark:bg-card-bg-dark p-12 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
             <span className="material-symbols-outlined text-6xl text-primary mb-4">sports_esports</span>
             <h2 className="text-2xl font-bold text-text-main dark:text-white mb-2">Speed Challenge</h2>
             <p className="text-text-muted mb-8">Click the button as many times as you can in 30 seconds!</p>
             <button 
                onClick={() => { setGameState('playing'); setTimeLeft(30); }}
                className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform"
             >
                Start Game
             </button>
           </div>
        ) : gameState === 'playing' ? (
            <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
                <div className="flex justify-between mb-8 text-xl font-bold font-mono">
                    <span className="text-text-main dark:text-white">Score: {gameScore}</span>
                    <span className={`${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-primary-dark dark:text-primary'}`}>{timeLeft}s</span>
                </div>
                
                <div className="h-64 flex items-center justify-center">
                    <button 
                        onClick={handleGameClick}
                        className="size-32 rounded-full bg-primary hover:bg-white hover:border-4 hover:border-primary transition-all active:scale-90 shadow-[0_0_30px_rgba(19,236,91,0.4)] flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-4xl text-black">touch_app</span>
                    </button>
                </div>
                <p className="mt-4 text-text-muted text-sm">Tap rapidly!</p>
            </div>
        ) : (
            <div className="bg-card-bg dark:bg-card-bg-dark p-12 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
                <h2 className="text-3xl font-bold text-text-main dark:text-white mb-4">Time's Up!</h2>
                <p className="text-xl text-primary-dark dark:text-primary font-bold mb-8">Final Score: {gameScore}</p>
                <button 
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-primary text-black font-bold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Complete Module'}
                </button>
            </div>
        )}
      </div>
    );
  };

  const renderVideo = () => {
    useEffect(() => {
        if(isRecording && videoRef.current) {
            // Mock stream setup
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => {
                    if (videoRef.current) videoRef.current.srcObject = stream;
                })
                .catch(err => console.error("Camera access denied", err));
        }
        return () => {
            // cleanup tracks
             const stream = videoRef.current?.srcObject as MediaStream;
             stream?.getTracks().forEach(track => track.stop());
        }
    }, [isRecording]);

    return (
        <div className="max-w-3xl mx-auto mt-8">
             <div className="bg-card-bg dark:bg-card-bg-dark p-6 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
                <h2 className="text-xl font-bold text-text-main dark:text-white mb-4">Video Response</h2>
                <p className="text-text-muted mb-6">Describe a time you faced a significant challenge and how you overcame it.</p>
                
                <div className="aspect-video bg-black rounded-xl overflow-hidden relative mb-6">
                    {isRecording ? (
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/10 dark:bg-white/5">
                            <span className="material-symbols-outlined text-6xl text-text-muted/20">videocam_off</span>
                        </div>
                    )}
                    
                    {/* Recording Indicator */}
                    {isRecording && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm animate-pulse">
                            <div className="size-2 rounded-full bg-white"></div>
                            REC 00:{Math.floor(Math.random() * 50).toString().padStart(2, '0')}
                        </div>
                    )}
                </div>

                <div className="flex justify-center gap-4">
                    {!isRecording ? (
                        <button 
                            onClick={() => setIsRecording(true)}
                            className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                        >
                            <span className="material-symbols-outlined">fiber_manual_record</span>
                            Start Recording
                        </button>
                    ) : (
                         <button 
                            onClick={() => { setIsRecording(false); handleFinish(); }}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-8 py-3 bg-white text-red-500 font-bold rounded-xl border-2 border-red-100 hover:bg-red-50 transition-colors"
                        >
                            <span className="material-symbols-outlined">stop_circle</span>
                            {isSubmitting ? 'Submitting...' : 'Stop & Submit'}
                        </button>
                    )}
                </div>
             </div>
        </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    <div className="fixed inset-0 z-[200] bg-background-light dark:bg-background-dark flex flex-col animate-[fadeIn_0.2s_ease-out]">
      
      {/* Top Bar */}
      <div className="h-16 border-b border-text-main/5 dark:border-white/5 flex items-center justify-between px-6 bg-card-bg dark:bg-card-bg-dark">
        <div className="flex items-center gap-4">
            <button onClick={onExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
                <h3 className="font-bold text-text-main dark:text-white">{section.title}</h3>
                <span className="text-xs text-text-muted uppercase">{section.type} Assessment</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
                <span className="block text-xs text-text-muted">Time Remaining</span>
                <span className={`font-mono font-bold ${globalTimeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-text-main dark:text-white'}`}>
                    {formatTime(globalTimeLeft)}
                </span>
            </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="h-1 bg-gray-200 dark:bg-gray-800 w-full">
         <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 relative">
         {/* Overlay for time up */}
         {globalTimeLeft === 0 && (
             <div className="absolute inset-0 bg-background-light/90 dark:bg-background-dark/90 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
                 <span className="material-symbols-outlined text-6xl text-text-muted mb-4">timer_off</span>
                 <h2 className="text-2xl font-bold text-text-main dark:text-white mb-2">Time's Up!</h2>
                 <p className="text-text-muted mb-4">Your answers are being submitted...</p>
                 <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
         )}
         
         {section.type === 'quiz' && renderQuiz()}
         {section.type === 'writing' && renderWriting()}
         {section.type === 'game' && renderGame()}
         {section.type === 'simulation' && renderGame()} 
         {section.type === 'video' && renderVideo()}
      </div>
    </div>
  );
};