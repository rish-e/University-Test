import React, { useEffect, useState } from 'react';

interface TransitionScreenProps {
  score: number;
  xpEarned: number;
  sectionTitle: string;
  onContinue: () => void;
}

export const TransitionScreen: React.FC<TransitionScreenProps> = ({ score, xpEarned, sectionTitle, onContinue }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (score >= 70) setShowConfetti(true);
    // Animate score counting up
    let current = 0;
    const step = Math.max(1, Math.floor(score / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= score) { setAnimatedScore(score); clearInterval(interval); }
      else setAnimatedScore(current);
    }, 30);
    return () => clearInterval(interval);
  }, [score]);

  const getStars = () => {
    if (score >= 90) return 3;
    if (score >= 70) return 2;
    if (score >= 40) return 1;
    return 0;
  };
  const stars = getStars();

  return (
    <div className="fixed inset-0 z-[250] bg-background-light dark:bg-background-dark flex items-center justify-center animate-[fadeIn_0.3s_ease-out]">
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-3 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#13ec5b', '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7'][i % 5],
                animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="text-center max-w-sm mx-auto p-8">
        {/* Stars */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map(n => (
            <span
              key={n}
              className={`text-4xl transition-all duration-500 ${
                n <= stars
                  ? 'text-yellow-400 scale-110'
                  : 'text-gray-300 dark:text-gray-600 scale-90'
              }`}
              style={{ transitionDelay: `${n * 200}ms` }}
            >
              ★
            </span>
          ))}
        </div>

        <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">
          {score >= 90 ? 'Excellent!' : score >= 70 ? 'Great Job!' : score >= 40 ? 'Good Effort!' : 'Keep Going!'}
        </h2>
        <p className="text-text-muted mb-8">{sectionTitle} Complete</p>

        {/* Score Ring */}
        <div className="relative size-32 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-gray-700" />
            <circle
              cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"
              className="text-primary"
              strokeDasharray={`${animatedScore * 2.64} 264`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-black text-text-main dark:text-white">{animatedScore}</span>
          </div>
        </div>

        {/* XP Earned */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-8">
          <span className="material-symbols-outlined text-primary text-sm">bolt</span>
          <span className="font-black text-primary-dark dark:text-primary">+{xpEarned} XP</span>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          Continue
        </button>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
