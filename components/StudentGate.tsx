import React, { useState } from 'react';

interface StudentGateProps {
  onRegister: (fullName: string, email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const StudentGate: React.FC<StudentGateProps> = ({ onRegister, isLoading, error }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim() && email.trim()) {
      onRegister(fullName.trim(), email.trim());
    }
  };

  const isValid = fullName.trim().length >= 2 && email.includes('@') && email.includes('.');

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-primary/20 p-3 rounded-xl">
              <span className="material-symbols-outlined text-primary-dark text-3xl">school</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-text-main dark:text-white">Tetr College of Business</h1>
          <p className="text-text-muted text-sm mt-1">Admissions Trial</p>
        </div>

        {/* Form */}
        <div className="bg-card-bg dark:bg-card-bg-dark rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 p-8">
          <h2 className="text-lg font-bold text-text-main dark:text-white mb-1">Welcome, Candidate</h2>
          <p className="text-sm text-text-muted mb-6">Enter your details to begin the assessment.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Smith"
                className="w-full px-4 py-3 rounded-xl bg-background-light dark:bg-white/5 border-2 border-transparent focus:border-primary/50 outline-none text-text-main dark:text-white placeholder-text-muted/50 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@email.com"
                className="w-full px-4 py-3 rounded-xl bg-background-light dark:bg-white/5 border-2 border-transparent focus:border-primary/50 outline-none text-text-main dark:text-white placeholder-text-muted/50 transition-colors"
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="w-full py-4 bg-primary text-black font-black text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Setting up...
                </span>
              ) : (
                'Begin Assessment'
              )}
            </button>
          </form>

          <p className="text-[10px] text-text-muted text-center mt-4">
            By continuing, you agree to Tetr's assessment terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};
