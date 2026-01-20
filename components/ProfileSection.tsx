import React, { useState } from 'react';
import { UserProfile } from '../types';

interface ProfileSectionProps {
  user: UserProfile;
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

              {/* Distribution Graph (Simulated) */}
              <div className="mb-8">
                  <h4 className="text-sm font-bold text-text-main dark:text-white mb-4">Performance Distribution</h4>
                  <div className="relative h-32 w-full flex items-end justify-center gap-1">
                      {/* Generating bars for a bell curve-ish look */}
                      {Array.from({ length: 40 }).map((_, i) => {
                          // varied heights for bell curve
                          const center = 20;
                          const dist = Math.abs(center - i);
                          let height = Math.max(10, 100 - (dist * dist * 0.8));
                          // Random noise
                          height += Math.random() * 20;
                          
                          const isUser = i === 35; // User is on the far right (top performer)
                          
                          return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                  {isUser && (
                                     <div className="absolute -top-8 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-2 py-1 rounded mb-1 whitespace-nowrap z-10 shadow-lg animate-bounce">
                                         You
                                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black dark:border-t-white"></div>
                                     </div>
                                  )}
                                  <div 
                                    style={{ height: `${height}%` }} 
                                    className={`w-full rounded-t-sm transition-all ${isUser ? 'bg-[#13ec5b]' : 'bg-gray-200 dark:bg-white/10 group-hover:bg-gray-300 dark:group-hover:bg-white/20'}`}
                                  ></div>
                              </div>
                          )
                      })}
                  </div>
                  <div className="flex justify-between text-xs text-text-muted mt-2 font-bold px-2">
                      <span>Low Performers</span>
                      <span>Average</span>
                      <span>Top Talent</span>
                  </div>
              </div>

              {/* Category Breakdown Table */}
              <div>
                  <h4 className="text-sm font-bold text-text-main dark:text-white mb-4">Category Breakdown vs. Average</h4>
                  <div className="space-y-3">
                      {[
                          { label: 'Cognitive Capacity', user: 96, avg: 72 },
                          { label: 'Technical Skills', user: 85, avg: 64 },
                          { label: 'Communication', user: 94, avg: 68 },
                          { label: 'Behavioral Traits', user: 78, avg: 75 },
                      ].map((cat, i) => (
                          <div key={i} className="flex items-center gap-4">
                              <span className="w-32 text-xs font-bold text-text-muted">{cat.label}</span>
                              <div className="flex-1 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden relative">
                                  {/* Average Marker */}
                                  <div className="absolute top-0 bottom-0 w-1 bg-gray-400 z-10" style={{ left: `${cat.avg}%` }} title={`Avg: ${cat.avg}%`}></div>
                                  {/* User Bar */}
                                  <div className="h-full bg-[#13ec5b] rounded-full" style={{ width: `${cat.user}%` }}></div>
                              </div>
                              <span className="w-12 text-right text-xs font-bold text-text-main dark:text-white">+{cat.user - cat.avg}%</span>
                          </div>
                      ))}
                  </div>
                  <div className="flex justify-center gap-6 mt-6 text-[10px] font-bold text-text-muted">
                      <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#13ec5b]"></div> Your Score</div>
                      <div className="flex items-center gap-2"><div className="w-1 h-3 bg-gray-400"></div> Cohort Average</div>
                  </div>
              </div>
          </div>
       </div>
    </div>
  )
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [showComparative, setShowComparative] = useState(false);

  // Hardcoded data to match the visual reference for the "Analyst View"
  const analystData = {
    name: "Alex Rivera",
    id: "#88291",
    avatar: user.avatarUrl,
    compositeScore: 88,
    radarData: [92, 85, 78, 82, 94] // COG, TECH, BEH, LEAD, COM
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
                   <span className="text-5xl font-bold text-text-main dark:text-white tracking-tighter">{analystData.compositeScore}</span>
                   <span className="text-xl text-gray-300 font-medium">/100</span>
                </div>
             </div>
             <div className="bg-[#e7f3eb] text-[#078829] px-3 py-2 rounded-lg text-xs font-bold flex flex-col items-center leading-tight">
                <div className="flex items-center gap-1">
                   <span className="material-symbols-outlined text-sm">trending_up</span>
                   <span>+12%</span>
                </div>
                <span className="text-[9px] opacity-70">Above average</span>
             </div>
          </div>

          {/* Radar Chart Implementation */}
          <div className="flex justify-center my-2">
              <RadarChart data={analystData.radarData} />
          </div>

          <div className="flex justify-between px-2 text-center">
             {['COG', 'TECH', 'BEH', 'LEAD', 'COM'].map((label, i) => (
                <div key={label} className="flex flex-col items-center">
                   <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</span>
                   <span className="text-sm font-bold text-text-main dark:text-white">{analystData.radarData[i]}</span>
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
             <span className="bg-[#e7f3eb] text-[#078829] px-3 py-1 rounded text-[10px] font-bold">Percentile: 95th</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="bg-[#f8f9fa] dark:bg-white/5 p-4 rounded-xl border border-gray-50 dark:border-white/5">
                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Logical Reasoning</span>
                <div className="text-3xl font-bold text-text-main dark:text-white">96<span className="text-lg text-gray-300 font-medium">%</span></div>
             </div>
             <div className="bg-[#f8f9fa] dark:bg-white/5 p-4 rounded-xl border border-gray-50 dark:border-white/5">
                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Quantitative</span>
                <div className="text-3xl font-bold text-text-main dark:text-white">88<span className="text-lg text-gray-300 font-medium">%</span></div>
             </div>
          </div>
          
          <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4 mt-2">
             Excels in pattern recognition and high-speed data interpretation. Strong mathematical foundation noted.
          </p>
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
             <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-3 py-1 rounded text-[10px] font-bold">Score: 85/100</span>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2">
                <span>Skill Asset</span>
                <span className="mr-8">Expertise</span>
                <span>Stability</span>
             </div>
             
             <div className="flex items-center justify-between p-3 bg-[#fafafa] dark:bg-white/5 rounded-lg border border-gray-50 dark:border-white/5">
                <span className="font-bold text-sm text-text-main dark:text-white">Data Structures</span>
                <span className="px-2 py-0.5 bg-[#e7f3eb] text-[#078829] text-[10px] font-bold rounded">Advanced</span>
                <span className="material-symbols-outlined text-[#13ec5b] text-lg">arrow_forward</span>
             </div>

             <div className="flex items-center justify-between p-3 bg-white dark:bg-transparent rounded-lg border border-transparent dark:border-white/5">
                <span className="font-bold text-sm text-text-main dark:text-white">System Design</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">Mid-Level</span>
                <span className="material-symbols-outlined text-[#13ec5b] text-lg">trending_up</span>
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
                    { label: 'Adaptability', left: 'Rigid', right: 'Flexible', val: 85, color: 'bg-blue-500' },
                    { label: 'Risk Appetite', left: 'Cautious', right: 'Risk Taker', val: 65, color: 'bg-purple-500' },
                    { label: 'Collaboration', left: 'Individual', right: 'Team First', val: 92, color: 'bg-[#13ec5b]' },
                    { label: 'Resilience', left: 'Sensitive', right: 'Anti-fragile', val: 78, color: 'bg-orange-400' }
                ].map((trait) => (
                    <div key={trait.label}>
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-text-main dark:text-white">{trait.label}</span>
                            <span className="text-xs font-bold text-text-muted">{trait.val}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                             <div className={`h-full rounded-full ${trait.color}`} style={{ width: `${trait.val}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-gray-400 uppercase font-bold tracking-wider">
                            <span>{trait.left}</span>
                            <span>{trait.right}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                <strong>Insight:</strong> Alex shows exceptional adaptability in dynamic scenarios, often pivoting strategies quickly when initial plans fail (observed in Module 2: Supply Chain Sim).
            </div>
        </div>

        {/* Detailed Proficiency */}
        <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5">
             <div className="flex items-center gap-3 mb-6">
                <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <span className="material-symbols-outlined text-lg">school</span>
                </div>
                <h3 className="font-bold text-text-main dark:text-white">Academic Proficiency</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { subject: 'Statistics', level: 'Advanced', score: 'A+' },
                    { subject: 'Business Writing', level: 'Intermediate', score: 'B+' },
                    { subject: 'Calculus', level: 'Advanced', score: 'A' },
                    { subject: 'Ethics', level: 'Proficient', score: 'A-' }
                ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 dark:border-white/5">
                        <span className="text-sm font-bold text-text-main dark:text-white">{item.subject}</span>
                        <div className="text-right">
                             <div className="text-xs text-text-muted font-medium">{item.level}</div>
                             <div className="text-sm font-bold text-text-main dark:text-white">{item.score}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderAIInsights = () => (
    <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
        {/* Engagement Card (Existing but refined) */}
         <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-6">
               <div className="size-8 rounded-full bg-[#e7f3eb] flex items-center justify-center text-[#13ec5b]">
                  <span className="material-symbols-outlined text-lg">videocam</span>
               </div>
               <h3 className="font-bold text-text-main dark:text-white">Video Behavioral Analysis</h3>
            </div>

            <div className="relative rounded-xl overflow-hidden mb-6 group cursor-pointer shadow-md">
               <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Candidate Video" className="w-full h-48 object-cover filter brightness-90" />
               <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1.5 animate-pulse shadow-sm">
                  <span className="size-1.5 bg-white rounded-full"></span>
                  ANALYZING
               </div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform backdrop-blur-sm">
                     <span className="material-symbols-outlined text-primary-dark text-3xl ml-1">play_arrow</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-gray-100 dark:border-white/5 pb-6 mb-4 text-center">
               <div className="border-r border-gray-100 dark:border-white/5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Confidence</span>
                  <span className="text-xl font-bold text-[#078829]">94%</span>
               </div>
               <div className="border-r border-gray-100 dark:border-white/5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Clarity</span>
                  <span className="text-xl font-bold text-text-main dark:text-white">High</span>
               </div>
               <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Sentiment</span>
                  <span className="text-xl font-bold text-[#078829]">Pos</span>
               </div>
            </div>

            {/* Micro-expression timeline */}
            <div className="mb-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Micro-expression Timeline</span>
                <div className="h-8 flex rounded-md overflow-hidden w-full opacity-80">
                    <div className="w-[30%] bg-green-400" title="Confident"></div>
                    <div className="w-[10%] bg-yellow-400" title="Thinking"></div>
                    <div className="w-[40%] bg-green-500" title="Enthusiastic"></div>
                    <div className="w-[20%] bg-blue-400" title="Calm"></div>
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                    <span>0:00</span>
                    <span>1:30</span>
                </div>
            </div>
         </div>

         {/* Written Content Analysis */}
         <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5">
             <div className="flex items-center gap-3 mb-4">
                <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <span className="material-symbols-outlined text-lg">edit_note</span>
                </div>
                <h3 className="font-bold text-text-main dark:text-white">Written Response AI Audit</h3>
            </div>
            
            <div className="p-4 bg-[#fffcf5] dark:bg-white/5 border border-orange-100 dark:border-white/5 rounded-lg mb-4 font-serif text-sm leading-relaxed italic text-gray-600 dark:text-gray-300">
                "...<span className="bg-green-100 text-green-800 px-1 rounded font-bold" title="Positive Leadership Indicator">spearheaded</span> the initiative to reduce waste by 40%. This <span className="bg-blue-100 text-blue-800 px-1 rounded font-bold" title="Strategic Thinking">strategic pivot</span> allowed us to..."
            </div>

            <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded text-[10px] font-bold uppercase text-gray-500">Vocabulary: Top 10%</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded text-[10px] font-bold uppercase text-gray-500">Structure: Logical</span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-[10px] font-bold uppercase text-green-700 dark:text-green-400">Plagiarism: 0% Detected</span>
            </div>
         </div>
    </div>
  );

  const renderHistory = () => (
      <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5 animate-[fadeIn_0.2s_ease-out]">
          <h3 className="font-bold text-text-main dark:text-white mb-6">Assessment Timeline</h3>
          <div className="relative border-l-2 border-gray-100 dark:border-white/10 ml-3 space-y-8">
              {[
                  { title: 'Video Interview Submitted', time: 'Oct 24, 14:30', status: 'completed' },
                  { title: 'English Proficiency Test', time: 'Oct 23, 09:15', status: 'completed' },
                  { title: 'Cognitive Assessment', time: 'Oct 20, 16:45', status: 'completed' },
                  { title: 'Application Created', time: 'Oct 15, 10:00', status: 'completed' }
              ].map((event, i) => (
                  <div key={i} className="relative pl-8">
                      <div className="absolute -left-[9px] top-1 size-4 rounded-full bg-white dark:bg-card-bg-dark border-2 border-[#13ec5b]"></div>
                      <h4 className="font-bold text-sm text-text-main dark:text-white">{event.title}</h4>
                      <p className="text-xs text-text-muted">{event.time}</p>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-40 animate-[fadeIn_0.2s_ease-out]">
      {/* Header Bar */}
      <div className="flex items-center justify-between py-2 mb-6">
        <div className="flex items-center gap-2 text-text-main dark:text-white font-bold text-lg">
           <span className="material-symbols-outlined cursor-pointer text-gray-400">arrow_back_ios_new</span>
           Candidate Analyst View
        </div>
        <button className="flex items-center gap-2 bg-[#13ec5b] hover:bg-[#078829] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-colors">
           <span className="material-symbols-outlined text-lg">download</span>
           Export Report
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-card-bg-dark rounded-xl p-6 shadow-sm border border-black/5 mb-6 relative">
         <div className="flex flex-row gap-6 items-center">
            {/* Avatar with Badge */}
            <div className="relative shrink-0">
               <div className="size-20 rounded-full bg-cover bg-center border-4 border-white shadow-lg" style={{ backgroundImage: `url("https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80")` }}></div>
               <div className="absolute -bottom-1 -right-1 bg-[#13ec5b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm">
                 98%
               </div>
            </div>
            
            <div className="flex-1">
               <h2 className="text-2xl font-bold text-text-main dark:text-white leading-tight">{analystData.name}</h2>
               <p className="text-xs text-text-muted font-bold mb-0 uppercase tracking-wide">ID: {analystData.id}</p>
            </div>
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
                className="shrink-0 mb-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
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

      {/* Bottom Action Bar */}
      <div className="fixed bottom-[90px] md:bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-background-dark/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 flex gap-4 z-40 max-w-5xl mx-auto rounded-t-2xl">
         <button className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors">
            Reject
         </button>
         <button className="flex-1 py-3 bg-[#13ec5b] hover:bg-[#00d64b] text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-colors">
            Approve Candidate
         </button>
      </div>
    </div>
  );
};