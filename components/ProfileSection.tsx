import React, { useState } from 'react';
import { UserProfile, AssessmentModule } from '../types';

interface ProfileSectionProps {
  user: UserProfile;
  modules: AssessmentModule[];
}

// Simple SVG Radar Chart Component
const RadarChart = ({ data }: { data: number[] }) => {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const angleSlice = (Math.PI * 2) / 5;
  
  // Helper to get coordinates
  const getCoords = (value: number, index: number) => {
     const angle = index * angleSlice - Math.PI / 2; // Start from top
     const r = (value / 100) * radius;
     return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
     };
  };

  const points = data.map((val, i) => getCoords(val, i)).map(p => `${p.x},${p.y}`).join(' ');
  const bgPoints = [100, 100, 100, 100, 100].map((val, i) => getCoords(val, i)).map(p => `${p.x},${p.y}`).join(' ');
  const innerPoints = [50, 50, 50, 50, 50].map((val, i) => getCoords(val, i)).map(p => `${p.x},${p.y}`).join(' ');

  return (
     <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Pentagon (Outer) */}
        <polygon points={bgPoints} fill="none" stroke="#e5e7eb" strokeWidth="1" />
        {/* Background Pentagon (Inner) */}
        <polygon points={innerPoints} fill="none" stroke="#e5e7eb" strokeWidth="1" />
        
        {/* Axis Lines */}
        {[0, 1, 2, 3, 4].map(i => {
            const p = getCoords(100, i);
            return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" />;
        })}

        {/* Data Polygon */}
        <polygon points={points} fill="rgba(19, 236, 91, 0.1)" stroke="#13ec5b" strokeWidth="2" strokeLinejoin="round" />
        
        {/* Dots */}
        {data.map((val, i) => {
            const p = getCoords(val, i);
            return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#13ec5b" stroke="white" strokeWidth="1" />;
        })}
     </svg>
  );
};

// Modal for Comparative Report
const ComparativeModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
       <div className="relative w-full max-w-2xl bg-white dark:bg-card-bg-dark rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out] flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-background-light/50 dark:bg-white/5">
              <div>
                  <h3 className="text-xl font-bold text-text-main dark:text-white">Cohort Comparative Report</h3>
                  <p className="text-xs text-text-muted">Based on N=14,203 Global Test Takers</p>
              </div>
              <button onClick={onClose} className="size-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-text-muted">close</span>
              </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Percentile Highlight */}
              <div className="bg-gradient-to-r from-[#13ec5b]/10 to-blue-500/10 p-6 rounded-xl border border-[#13ec5b]/20 mb-8 flex items-center justify-between">
                  <div>
                      <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Global Percentile</p>
                      <h2 className="text-4xl font-bold text-text-main dark:text-white">Top 2%</h2>
                      <p className="text-sm text-text-muted mt-1">Scored higher than 98% of applicants</p>
                  </div>
                  <div className="size-16 rounded-full bg-white dark:bg-white/5 flex items-center justify-center border-4 border-[#13ec5b] shadow-lg">
                      <span className="text-xl font-bold text-[#13ec5b]">98th</span>
                  </div>
              </div>
              {/* ... (Rest of comparative report can be static for now or derived if needed) */}
              <p className="text-sm text-text-muted">Detailed comparative data populates after 50% cohort completion.</p>
          </div>
       </div>
    </div>
  )
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ user, modules }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [showComparative, setShowComparative] = useState(false);

  // Derive Data from User Metrics
  const metrics = user.metrics;
  const radarData = [
    metrics.cognitive,
    metrics.technical,
    metrics.behavioral,
    metrics.leadership,
    metrics.communication
  ];
  const compositeScore = Math.round(radarData.reduce((a, b) => a + b, 0) / 5);

  // Get specific insights/scores from modules for detail views
  // Helper to find score/analysis by section ID
  const findSectionData = (sectionId: string) => {
    for (const mod of modules) {
        if (!mod.sections) continue;
        const section = mod.sections.find(s => s.id === sectionId);
        if (section) return { score: section.score || 0, analysis: section.analysis };
    }
    return { score: 0, analysis: null };
  };

  // --- RENDER FUNCTIONS FOR TABS ---

  const renderOverview = () => (
    <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
       {/* Comparative Composite Card */}
       <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5 relative overflow-hidden">
          <div className="flex justify-between items-start">
             <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Comparative Composite</h3>
                <div className="flex items-baseline gap-1">
                   <span className="text-5xl font-bold text-text-main dark:text-white tracking-tighter">{compositeScore}</span>
                   <span className="text-xl text-gray-300 font-medium">/100</span>
                </div>
             </div>
             {compositeScore > 0 && (
                <div className="bg-[#e7f3eb] text-[#078829] px-3 py-2 rounded-lg text-xs font-bold flex flex-col items-center leading-tight">
                    <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>Live</span>
                    </div>
                </div>
             )}
          </div>

          {/* Radar Chart Implementation */}
          <div className="flex justify-center my-2">
              <RadarChart data={radarData} />
          </div>

          <div className="flex justify-between px-2 text-center">
             {['COG', 'TECH', 'BEH', 'LEAD', 'COM'].map((label, i) => (
                <div key={label} className="flex flex-col items-center">
                   <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</span>
                   <span className="text-sm font-bold text-text-main dark:text-white">{radarData[i]}</span>
                </div>
             ))}
          </div>
       </div>

       <h3 className="text-xs font-bold text-text-main dark:text-white uppercase tracking-widest mt-8 mb-4 pl-1">Performance Pillars</h3>

       {/* Cognitive Capacity */}
       <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5">
          <div className="flex justify-between items-start mb-6">
             <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-[#e7f3eb] flex items-center justify-center text-[#13ec5b]">
                   <span className="material-symbols-outlined text-lg">psychology</span>
                </div>
                <h3 className="font-bold text-text-main dark:text-white">Cognitive Capacity</h3>
             </div>
             <span className="bg-[#e7f3eb] text-[#078829] px-3 py-1 rounded text-[10px] font-bold">Avg: {metrics.cognitive}%</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="bg-[#f8f9fa] dark:bg-white/5 p-4 rounded-xl border border-gray-50 dark:border-white/5">
                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Numerical Reasoning</span>
                <div className="text-3xl font-bold text-text-main dark:text-white">{findSectionData('c1').score}<span className="text-lg text-gray-300 font-medium">%</span></div>
             </div>
             <div className="bg-[#f8f9fa] dark:bg-white/5 p-4 rounded-xl border border-gray-50 dark:border-white/5">
                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Logical Reasoning</span>
                <div className="text-3xl font-bold text-text-main dark:text-white">{findSectionData('c2').score}<span className="text-lg text-gray-300 font-medium">%</span></div>
             </div>
          </div>
       </div>

       {/* Technical Domain */}
       <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5">
          <div className="flex justify-between items-start mb-6">
             <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-[#e7f3eb] flex items-center justify-center text-[#13ec5b]">
                   <span className="material-symbols-outlined text-lg">code</span>
                </div>
                <h3 className="font-bold text-text-main dark:text-white">Technical Domain</h3>
             </div>
             <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-3 py-1 rounded text-[10px] font-bold">Avg: {metrics.technical}%</span>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2">
                <span>Skill Asset</span>
                <span className="mr-8">Score</span>
             </div>
             
             <div className="flex items-center justify-between p-3 bg-[#fafafa] dark:bg-white/5 rounded-lg border border-gray-50 dark:border-white/5">
                <span className="font-bold text-sm text-text-main dark:text-white">Excel Proficiency</span>
                <span className="px-2 py-0.5 bg-[#e7f3eb] text-[#078829] text-[10px] font-bold rounded">{findSectionData('t1').score}%</span>
             </div>

             <div className="flex items-center justify-between p-3 bg-white dark:bg-transparent rounded-lg border border-transparent dark:border-white/5">
                <span className="font-bold text-sm text-text-main dark:text-white">Business Math</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">{findSectionData('t3').score}%</span>
             </div>
          </div>
       </div>
    </div>
  );

  const renderSkillsBreakdown = () => (
    <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
        {/* Behavioral DNA */}
        <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-6">
                <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined text-lg">fingerprint</span>
                </div>
                <h3 className="font-bold text-text-main dark:text-white">Behavioral DNA Profile</h3>
            </div>
            
            <div className="space-y-6">
                {[
                    { label: 'Risk Tolerance', val: findSectionData('g3').score, color: 'bg-purple-500' },
                    { label: 'Strategy', val: findSectionData('g1').score, color: 'bg-[#13ec5b]' },
                    { label: 'Problem Solving', val: findSectionData('g2').score, color: 'bg-orange-400' }
                ].map((trait) => (
                    <div key={trait.label}>
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-text-main dark:text-white">{trait.label}</span>
                            <span className="text-xs font-bold text-text-muted">{trait.val}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                             <div className={`h-full rounded-full ${trait.color}`} style={{ width: `${trait.val}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderAIInsights = () => {
    const writtenEssay = findSectionData('e4');
    
    return (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
            {/* Written Content Analysis */}
            <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                    </div>
                    <h3 className="font-bold text-text-main dark:text-white">Written Response AI Audit</h3>
                </div>
                
                {writtenEssay.score > 0 ? (
                    <>
                        <div className="p-4 bg-[#fffcf5] dark:bg-white/5 border border-orange-100 dark:border-white/5 rounded-lg mb-4 font-serif text-sm leading-relaxed italic text-gray-600 dark:text-gray-300">
                            {writtenEssay.analysis}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-[10px] font-bold uppercase text-green-700 dark:text-green-400">Score: {writtenEssay.score}/100</span>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-text-muted">No writing assessment completed yet.</p>
                )}
            </div>
        </div>
    );
  };

  const renderHistory = () => (
      <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5 animate-[fadeIn_0.2s_ease-out]">
          <h3 className="font-bold text-text-main dark:text-white mb-6">Assessment Timeline</h3>
          <p className="text-sm text-text-muted">Completed modules will appear here in chronological order.</p>
      </div>
  );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-8 animate-[fadeIn_0.2s_ease-out]">
      {/* Profile Header */}
      <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5 mb-6 relative mt-4">
         <div className="flex justify-between items-start">
             <div className="flex flex-row gap-6 items-center">
                {/* Avatar with Badge */}
                <div className="relative shrink-0">
                   <div className="size-20 rounded-full bg-cover bg-center border-4 border-white shadow-lg" style={{ backgroundImage: `url("${user.avatarUrl}")` }}></div>
                </div>
                
                <div className="flex-1">
                   <h2 className="text-2xl font-bold text-text-main dark:text-white leading-tight">{user.name}</h2>
                   <p className="text-xs text-text-muted font-bold mb-0 uppercase tracking-wide">ID: {user.id}</p>
                </div>
             </div>
             
             {/* Export Report Button - Moved to Top Right */}
            <button className="flex items-center gap-2 bg-[#13ec5b] hover:bg-[#078829] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-colors">
               <span className="material-symbols-outlined text-lg">download</span>
               Export Report
            </button>
         </div>

         {/* Tabs and Comparative Button Container */}
         <div className="flex flex-col md:flex-row md:items-end justify-between mt-8 border-b border-gray-100 dark:border-white/5 gap-4 md:gap-0">
             <div className="flex gap-8 overflow-x-auto no-scrollbar flex-1">
                {['Overview', 'Skills Breakdown', 'AI Insights', 'History'].map(tab => (
                   <button 
                     key={tab}
                     onClick={() => setActiveTab(tab)}
                     className={`pb-3 text-sm font-bold transition-colors relative whitespace-nowrap ${
                       activeTab === tab 
                       ? 'text-[#078829] dark:text-[#13ec5b]' 
                       : 'text-gray-400 hover:text-gray-600'
                     }`}
                   >
                     {tab}
                     {activeTab === tab && (
                       <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#13ec5b] rounded-t-full"></div>
                     )}
                   </button>
                ))}
             </div>
             
             {/* The highlighted section button */}
             <button 
                onClick={() => setShowComparative(true)}
                className="shrink-0 mb-2 px-4 py-2 border-2 border-[#13ec5b] text-[#078829] dark:text-[#13ec5b] rounded-lg text-xs font-bold flex items-center gap-2 transition-all hover:bg-[#13ec5b]/10"
             >
                 <span className="material-symbols-outlined text-sm">equalizer</span>
                 View Comparative Report
             </button>
         </div>
      </div>

      {/* Dynamic Content based on Active Tab */}
      <div className="mt-2">
         {activeTab === 'Overview' && renderOverview()}
         {activeTab === 'Skills Breakdown' && renderSkillsBreakdown()}
         {activeTab === 'AI Insights' && renderAIInsights()}
         {activeTab === 'History' && renderHistory()}
      </div>

      {/* Comparative Modal */}
      {showComparative && <ComparativeModal onClose={() => setShowComparative(false)} />}
    </div>
  );
};