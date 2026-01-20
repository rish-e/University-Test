import React from 'react';

export const DeadlinesSection: React.FC = () => {
  const deadlines = [
    { module: 'Cognitive & Quantitative', date: 'Oct 15, 2024', time: '11:59 PM', status: 'urgent' },
    { module: 'Gamified Behavioral Assessment', date: 'Oct 20, 2024', time: '11:59 PM', status: 'upcoming' },
    { module: 'Technical Business Skills', date: 'Oct 25, 2024', time: '11:59 PM', status: 'upcoming' },
    { module: 'English Language Proficiency', date: 'Oct 30, 2024', time: '11:59 PM', status: 'upcoming' },
  ];

  return (
    <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
      <h2 className="text-xl font-bold text-text-main dark:text-white mb-2">Upcoming Deadlines</h2>
      <div className="space-y-3">
        {deadlines.map((item, idx) => (
          <div key={idx} className="bg-card-bg dark:bg-card-bg-dark p-5 rounded-xl shadow-sm border border-text-main/5 dark:border-white/5 flex items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-bold text-text-main dark:text-white text-sm mb-1">{item.module}</h4>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span>{item.date}</span>
                <span className="mx-1">•</span>
                <span>{item.time}</span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              item.status === 'urgent' 
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-primary/10 text-primary-dark dark:text-primary'
            }`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 flex gap-3 mt-6">
        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
        <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
          <strong>Note:</strong> All deadlines are in your local timezone. Late submissions may affect your overall candidacy score.
        </p>
      </div>
    </div>
  );
};