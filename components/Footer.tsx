import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 text-center pb-8">
      <p className="text-text-muted text-sm">
        Need help with the assessment?{' '}
        <a className="text-primary-dark dark:text-primary underline font-medium hover:opacity-80 transition-opacity" href="#">
          Contact Support
        </a>
      </p>
      <div className="mt-4 flex justify-center gap-6">
        <span className="text-[10px] text-text-muted/50 uppercase tracking-tighter cursor-pointer hover:text-text-muted">
          Privacy Policy
        </span>
        <span className="text-[10px] text-text-muted/50 uppercase tracking-tighter cursor-pointer hover:text-text-muted">
          Terms of Service
        </span>
      </div>
    </footer>
  );
};