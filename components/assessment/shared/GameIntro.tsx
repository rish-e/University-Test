import React from 'react';

interface GameIntroProps {
  title: string;
  description: string;
  icon: string;
  duration: string;
  rules: string[];
  onStart: () => void;
}

export const GameIntro: React.FC<GameIntroProps> = ({ title, description, icon, duration, rules, onStart }) => {
  return (
    <div className="max-w-lg mx-auto mt-12 animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center">
        <div className="size-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary">{icon}</span>
        </div>

        <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">{title}</h2>
        <p className="text-text-muted mb-6">{description}</p>

        <div className="bg-background-light dark:bg-white/5 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">How to play</p>
          <ul className="space-y-2">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-main dark:text-white">
                <span className="text-primary font-bold">{i + 1}.</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-text-muted mb-6">
          <span className="material-symbols-outlined text-base">timer</span>
          <span>{duration}</span>
        </div>

        <button
          onClick={onStart}
          className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          Start Challenge
        </button>
      </div>
    </div>
  );
};
