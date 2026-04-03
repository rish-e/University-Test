import React, { useEffect, useState } from 'react';
import { PlayerLevel } from '../../types';

interface LevelUpOverlayProps {
  player: PlayerLevel;
  onDismiss: () => void;
}

export const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({ player, onDismiss }) => {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    setTimeout(() => setPhase('show'), 100);
  }, []);

  const handleContinue = () => {
    setPhase('exit');
    setTimeout(onDismiss, 300);
  };

  return (
    <div className={`fixed inset-0 z-[300] flex items-center justify-center p-4 transition-all duration-300 ${
      phase === 'exit' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
    }`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Glow effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="size-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className={`relative text-center max-w-sm transition-all duration-500 ${
        phase === 'enter' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {/* Level badge */}
        <div className="relative size-28 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-[#078829] rounded-3xl rotate-12 opacity-30 animate-pulse" />
          <div className="relative size-28 bg-gradient-to-br from-primary to-[#078829] rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30">
            <span className="text-white font-black text-4xl">{player.level}</span>
          </div>
        </div>

        <p className="text-primary font-bold text-sm uppercase tracking-widest mb-2 animate-pulse">
          Level Up!
        </p>
        <h2 className="text-3xl font-black text-white mb-3">
          {player.title}
        </h2>
        <p className="text-gray-400 mb-8">
          {player.level === 2 && "The team is starting to notice your analytical skills."}
          {player.level === 3 && "Your reputation precedes you. Senior leadership is watching."}
          {player.level === 4 && "You've earned a seat at the strategy table."}
          {player.level === 5 && "The boardroom doors are open. You run the show now."}
        </p>

        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-primary text-black font-black rounded-2xl hover:bg-[#00d64b] active:scale-95 transition-all shadow-lg shadow-primary/30"
        >
          Continue
        </button>
      </div>

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute size-1.5 rounded-full bg-primary"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `particleFloat ${2 + Math.random() * 3}s ease-in-out ${Math.random()}s infinite`,
              opacity: 0.3 + Math.random() * 0.5,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.5); }
        }
      `}</style>
    </div>
  );
};
