import React, { useState, useEffect } from 'react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose }) => {
  const [reminders, setReminders] = useState<string[]>(['09:00', '14:30']);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const addReminder = () => {
    if (reminders.length < 5) {
      setReminders([...reminders, '12:00']);
    }
  };

  const removeReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const updateReminder = (index: number, value: string) => {
    const newReminders = [...reminders];
    newReminders[index] = value;
    setReminders(newReminders);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-card-bg dark:bg-card-bg-dark rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-[fadeIn_0.2s_ease-out]">
        
        {/* Header Area */}
        <div className="bg-gradient-to-br from-primary/20 to-transparent p-6 text-center border-b border-text-main/5 dark:border-white/5">
           <div className="inline-flex p-3 rounded-full bg-primary/20 mb-3 text-primary-dark dark:text-primary shadow-inner">
             <span className="material-symbols-outlined text-4xl">alarm</span>
           </div>
           
           {/* Live Clock */}
           <div className="font-mono text-4xl font-bold text-text-main dark:text-white mb-1 tracking-wider tabular-nums">
             {currentTime.toLocaleTimeString([], { hour12: false })}
           </div>
           <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Current Time</p>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-main dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-dark">notifications_active</span>
              Study Reminders
            </h3>
            <span className={`text-xs px-2 py-1 rounded-md font-bold ${reminders.length >= 5 ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary-dark'}`}>
              {reminders.length}/5
            </span>
          </div>

          <div className="space-y-3 mb-6 max-h-[240px] overflow-y-auto pr-1">
            {reminders.map((time, index) => (
              <div key={index} className="flex items-center gap-2 group animate-[slideIn_0.2s_ease-out]">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-text-muted text-lg">edit_calendar</span>
                    </div>
                    <input 
                      type="time" 
                      value={time}
                      onChange={(e) => updateReminder(index, e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 rounded-xl border-none bg-background-light dark:bg-background-dark text-text-main dark:text-white font-bold focus:ring-2 focus:ring-primary/50 transition-shadow"
                    />
                </div>
                <button 
                  onClick={() => removeReminder(index)}
                  className="size-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                  aria-label="Remove reminder"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            ))}
             {reminders.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-text-main/10 rounded-xl">
                    <p className="text-text-muted text-sm">No reminders set</p>
                </div>
            )}
          </div>

          {reminders.length < 5 && (
            <button 
              onClick={addReminder}
              className="w-full py-3 mb-6 border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-primary-dark dark:text-primary rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
            >
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_alarm</span>
              Add Reminder Time
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onClose}
              className="py-3 px-4 rounded-xl font-bold text-text-muted hover:bg-background-light dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={onClose}
              className="py-3 px-4 bg-primary hover:bg-[#00d64b] text-black rounded-xl font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95"
            >
              Save All
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};