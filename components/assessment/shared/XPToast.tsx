import React, { useEffect, useState } from 'react';

interface XPToastProps {
  amount: number;
  source?: string;
  onDone: () => void;
}

export const XPToast: React.FC<XPToastProps> = ({ amount, source, onDone }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { setVisible(false); onDone(); }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const isBonus = source === 'speed' || source === 'streak';

  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-50 animate-[xpFloat_1.2s_ease-out_forwards]">
      <div className={`px-3 py-1 rounded-full font-black text-sm whitespace-nowrap ${
        isBonus
          ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
          : 'bg-primary/20 text-primary-dark dark:text-primary'
      }`}>
        +{amount} XP {source && <span className="text-xs font-bold opacity-70 uppercase">{source}</span>}
      </div>
      <style>{`
        @keyframes xpFloat {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -60px) scale(0.8); }
        }
      `}</style>
    </div>
  );
};
