import React, { useState, useEffect, useRef } from 'react';
import { ModuleSection } from '../types';

interface AssessmentRunnerProps {
  section: ModuleSection;
  onComplete: (result: { score: number, type: string, data?: any }) => void;
  onExit: (progress?: any) => void;
}

// --- DATASETS MATCHING CONSTANTS.TS PROMISES ---

const QUESTIONS_DB: Record<string, { question: string; options: string[]; correct: number }[]> = {
  // C1: Numerical Reasoning (15 questions)
  'c1': [
    { question: "Q1 Revenue was $500k. If Q2 saw a 20% increase, what is Q2 Revenue?", options: ["$550k", "$600k", "$620k", "$580k"], correct: 1 },
    { question: "Fixed Costs: $5,000. Variable Cost per Unit: $10. Selling Price: $20. Break-even units?", options: ["250", "400", "500", "1000"], correct: 2 },
    { question: "A stock drops from $50 to $40. What is the percentage decrease?", options: ["10%", "20%", "25%", "15%"], correct: 1 },
    { question: "Company A has 200 employees. 40% are in Sales. How many are NOT in Sales?", options: ["80", "100", "120", "140"], correct: 2 },
    { question: "Investment: $100,000. Net Return: $120,000. What is the ROI?", options: ["120%", "20%", "15%", "10%"], correct: 1 },
    { question: "If the exchange rate is 1 USD = 0.85 EUR, how many Euros is 200 USD?", options: ["160 EUR", "170 EUR", "180 EUR", "150 EUR"], correct: 1 },
    { question: "Sales Mix: Product A (30%), Product B (70%). Total Sales $1M. What is Sales for B?", options: ["$300k", "$700k", "$600k", "$400k"], correct: 1 },
    { question: "A project costs $50k and generates $10k/year. Payback period?", options: ["4 years", "5 years", "6 years", "2 years"], correct: 1 },
    { question: "Total Market: 50M units. Company Sales: 5M units. Market Share?", options: ["5%", "10%", "15%", "20%"], correct: 1 },
    { question: "Price $100. Discount 20%. Tax 10% on discounted price. Final Price?", options: ["$88", "$90", "$80", "$85"], correct: 0 },
    { question: "Q1: 100 units. Q2: 150 units. Q3: 120 units. Average units per quarter?", options: ["120", "123.3", "125", "115"], correct: 1 },
    { question: "Gross Profit $200k. Revenue $500k. Gross Margin %?", options: ["20%", "50%", "30%", "40%"], correct: 3 },
    { question: "Expenses Ratio 2:3 (Marketing:Ops). Total Expenses $100k. Marketing spend?", options: ["$20k", "$30k", "$40k", "$60k"], correct: 2 },
    { question: "Year 1: $10M. Year 2: $15M. Year-over-Year Growth?", options: ["25%", "33%", "50%", "66%"], correct: 2 },
    { question: "Operating Income $50k. Tax Rate 20%. Net Income?", options: ["$45k", "$35k", "$40k", "$30k"], correct: 2 }
  ],
  // C2: Logical Reasoning (12 questions)
  'c2': [
    { question: "Sequence: 2, 4, 8, 16, ...", options: ["24", "32", "30", "28"], correct: 1 },
    { question: "Pattern: Circle, Square, Triangle, Circle, Square, ...", options: ["Circle", "Triangle", "Square", "Hexagon"], correct: 1 },
    { question: "100, 95, 85, 70, ... (What comes next?)", options: ["55", "60", "50", "45"], correct: 2 },
    { question: "If A=1, B=2, C=3, what is E?", options: ["4", "5", "6", "7"], correct: 1 },
    { question: "Find the odd one out: Apple, Banana, Carrot, Date", options: ["Apple", "Banana", "Carrot", "Date"], correct: 2 },
    { question: "Visual Analogy: Up is to Down as Left is to ...", options: ["Right", "Center", "Back", "Front"], correct: 0 },
    { question: "Series: 1, 1, 2, 3, 5, 8, ...", options: ["11", "12", "13", "14"], correct: 2 },
    { question: "If all Bloops are Bleeps, and some Bleeps are Blops, are all Bloops Blops?", options: ["Yes", "No", "Cannot be determined", "Only on Tuesdays"], correct: 2 },
    { question: "Matrix: Row 1 (2,4), Row 2 (3,9), Row 3 (4, ?)", options: ["12", "16", "20", "8"], correct: 1 },
    { question: "Which number replaces the question mark? 5, 10, 20, 40, ?", options: ["60", "80", "100", "50"], correct: 1 },
    { question: "In a code, CAT is 3120. What is DOG?", options: ["4157", "4158", "4159", "4057"], correct: 0 },
    { question: "Statement: 'No one is absent'. Conclusion: 'Everyone is present'.", options: ["True", "False", "Unrelated", "Likely"], correct: 0 }
  ],
  // C4: Critical Reasoning (8 questions)
  'c4': [
    { question: "Premise: All tech startups are risky. Conclusion: Company X is a tech startup, so it is risky.", options: ["Valid", "Invalid", "Weak", "Irrelevant"], correct: 0 },
    { question: "Argument: 'Sales are down because it's raining.' What is the flaw?", options: ["Correlation vs Causation", "Ad Hominem", "Circular Reasoning", "Slippery Slope"], correct: 0 },
    { question: "Which statement weakens: 'Electric cars reduce pollution'?", options: ["Battery production is toxic", "Gas cars are fast", "Electricity is cheap", "Cars are expensive"], correct: 0 },
    { question: "Identify the Assumption: 'He is wearing a suit, so he must be a lawyer.'", options: ["Lawyers wear suits", "Suits are cheap", "He likes suits", "He is in court"], correct: 0 },
    { question: "Inference: 'Only managers have keys. John has a key.'", options: ["John is a manager", "John is a janitor", "John stole the key", "Keys are common"], correct: 0 },
    { question: "Paradox: 'Prices rose, but demand increased.' Explain.", options: ["Product became a status symbol", "People have less money", "Supply increased", "Quality dropped"], correct: 0 },
    { question: "Strengthen: 'Coffee improves focus.'", options: ["Study showing caffeine boosts attention", "Tea is tasty", "Water is healthy", "Focus is important"], correct: 0 },
    { question: "Method of reasoning: 'If we don't act now, we lose money. We must act.'", options: ["Appeal to fear", "Analogy", "Statistical evidence", "Expert opinion"], correct: 0 }
  ],
  // T1: Excel Proficiency (8 questions)
  't1': [
    { question: "Which function searches for a value in the first column of a table array and returns a value in the same row from another column?", options: ["=SEARCH()", "=VLOOKUP()", "=INDEX()", "=FIND()"], correct: 1 },
    { question: "In the reference '$A$1', what does the dollar sign indicate?", options: ["Currency format", "Absolute reference", "Variable reference", "Error"], correct: 1 },
    { question: "Which tool is best for summarizing, analyzing, exploring, and presenting summary data?", options: ["Data Validation", "Goal Seek", "PivotTable", "Filter"], correct: 2 },
    { question: "Which function adds all the numbers in a range of cells, based on a single criterion?", options: ["=SUM()", "=COUNTIF()", "=SUMIF()", "=AVERAGEIF()"], correct: 2 },
    { question: "How do you automatically highlight all cells with a value greater than 100?", options: ["Data Validation", "Conditional Formatting", "Sort & Filter", "Cell Styles"], correct: 1 },
    { question: "Which symbol is used to concatenate (join) text strings?", options: ["&", "+", "#", "%"], correct: 0 },
    { question: "To remove duplicate rows from a dataset, which tab do you go to?", options: ["Home", "Insert", "Data", "View"], correct: 2 },
    { question: "What does the function =IF(A1>10, 'Yes', 'No') return if A1 is 5?", options: ["Yes", "No", "Error", "5"], correct: 1 }
  ],
  // T2: SQL Basics (5 questions)
  't2': [
    { question: "Which statement is used to extract data from a database?", options: ["GET", "OPEN", "SELECT", "EXTRACT"], correct: 2 },
    { question: "Which SQL clause is used to filter records?", options: ["WHERE", "FILTER", "HAVING", "GROUP BY"], correct: 0 },
    { question: "Which JOIN returns records that have matching values in both tables?", options: ["LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "INNER JOIN"], correct: 3 },
    { question: "Which statement groups rows that have the same values into summary rows?", options: ["ORDER BY", "GROUP BY", "ARRANGE BY", "SORT BY"], correct: 1 },
    { question: "How do you select all columns from a table named 'Customers'?", options: ["SELECT all FROM Customers", "SELECT * FROM Customers", "SELECT Customers", "SELECT [all] FROM Customers"], correct: 1 }
  ],
  // T3: Business Math (10 questions)
  't3': [
    { question: "Cost: $100. Sale Price: $150. What is the ROI?", options: ["33%", "50%", "150%", "25%"], correct: 1 },
    { question: "Fixed Costs: $10,000. Contribution Margin per unit: $50. Breakeven point?", options: ["500 units", "100 units", "200 units", "1000 units"], correct: 2 },
    { question: "What does NPV stand for?", options: ["Net Profit Value", "Net Present Value", "New Project Valuation", "Net Price Variable"], correct: 1 },
    { question: "Revenue: $1M. COGS: $600k. Gross Margin %?", options: ["60%", "30%", "40%", "20%"], correct: 2 },
    { question: "Concept used to determine the value of money over time?", options: ["TVM (Time Value of Money)", "ROI", "EBITDA", "SWOT"], correct: 0 },
    { question: "Invested $1000 at 10% simple interest for 2 years. Total interest?", options: ["$100", "$200", "$121", "$210"], correct: 1 },
    { question: "Product price $200. 25% discount. New price?", options: ["$150", "$175", "$125", "$160"], correct: 0 },
    { question: "What is the formula for Profit Margin?", options: ["(Revenue - Cost) / Revenue", "(Revenue - Cost) / Cost", "Revenue / Cost", "Cost / Revenue"], correct: 0 },
    { question: "A monthly burn rate of $50k with $1M in bank. Runway?", options: ["10 months", "15 months", "20 months", "25 months"], correct: 2 },
    { question: "If CAGR is 10% and starting value is $100, approximate value after 2 years?", options: ["$110", "$120", "$121", "$130"], correct: 2 }
  ],
  // E1: Reading Comprehension (3 Case Summaries)
  'e1': [
    { question: "Case Study A: TechGiant's Q3 report shows a 15% user drop despite new features. Analysts blame privacy concerns. What is the immediate priority?", options: ["Launch a new feature", "Revise Privacy Policy & Communication", "Increase Ad Spend", "Cut Prices"], correct: 1 },
    { question: "Case Study B: A logistics firm faces rising fuel costs (up 30%). Competitors are switching to EVs. What is the best long-term move?", options: ["Surcharge customers", "Wait for fuel prices to drop", "Invest in EV fleet transition", "Reduce delivery speed"], correct: 2 },
    { question: "Case Study C: Startup 'FreshFood' has high customer acquisition costs ($50) but low lifetime value ($40). What must they fix first?", options: ["Increase Marketing", "Improve Retention / LTV", "Hire more staff", "Expand to new cities"], correct: 1 }
  ],
  // Fallbacks
  'default': [
    { question: "Sample Question 1", options: ["A", "B", "C", "D"], correct: 0 },
    { question: "Sample Question 2", options: ["A", "B", "C", "D"], correct: 0 }
  ]
};

// --- SIMULATION DATA ---
const SIMULATION_SCENARIOS: Record<string, { title: string, context: string, choices: { text: string, effect: any }[] }[]> = {
  // G1: Planning & Strategy (Supply Chain)
  'g1': [
    { 
      title: "Q1: Supplier Crisis", 
      context: "Your main raw material supplier has declared force majeure due to a hurricane. Production will halt in 2 days. What is your immediate action?", 
      choices: [
        { text: "Pay 3x premium for air-freight from a backup supplier.", effect: { capital: -3000, satisfaction: 10 } },
        { text: "Pause production and wait for the supplier to recover.", effect: { capital: 0, satisfaction: -20 } },
        { text: "Switch to lower quality local materials immediately.", effect: { capital: -500, satisfaction: -10 } }
      ]
    },
    { 
      title: "Q2: Demand Surge", 
      context: "A viral TikTok trend has spiked demand for your product by 200%. Your warehouse is empty.", 
      choices: [
        { text: "Run factory at double overtime (High Cost).", effect: { capital: -2000, satisfaction: 25 } },
        { text: "Outsource to a 3rd party manufacturer (Quality Risk).", effect: { capital: -1000, satisfaction: 5 } },
        { text: "Increase prices to dampen demand.", effect: { capital: 1000, satisfaction: -15 } }
      ]
    },
    { 
      title: "Q3: Sustainability Pivot", 
      context: "Investors are demanding a green supply chain audit. It will cost significantly but improve brand image.", 
      choices: [
        { text: "Fully commit to the audit and upgrades.", effect: { capital: -4000, satisfaction: 30 } },
        { text: "Greenwash: Do a marketing campaign only.", effect: { capital: -500, satisfaction: -5 } },
        { text: "Ignore: Focus on core profitability.", effect: { capital: 0, satisfaction: 0 } }
      ]
    }
  ],
  // G4: Innovation Mindset (Path Selection)
  'g4': [
    { 
      title: "Phase 1: Concept Launch", 
      context: "You are launching a fintech app. Which MVP approach do you take?", 
      choices: [
        { text: "Safe: Copy existing successful features (Low Risk).", effect: { type: 'safe' } },
        { text: "Disruptive: No fees, AI-driven, unproven model (High Risk).", effect: { type: 'risky' } }
      ]
    },
    { 
      title: "Phase 2: Growth Strategy", 
      context: "User growth is flat. What's the pivot?", 
      choices: [
        { text: "Partnership: Bundle with a traditional bank.", effect: { type: 'safe' } },
        { text: "Viral: Gamify savings with crypto rewards.", effect: { type: 'risky' } }
      ]
    },
    { 
      title: "Phase 3: Crisis Management", 
      context: "A competitor just raised $50M. How do you respond?", 
      choices: [
        { text: "Focus: Niche down to a specific user segment.", effect: { type: 'safe' } },
        { text: "Expand: Launch in 3 new countries immediately.", effect: { type: 'risky' } }
      ]
    }
  ]
};

export const AssessmentRunner: React.FC<AssessmentRunnerProps> = ({ section, onComplete, onExit }) => {
  const savedState = section.progressState;

  // Initialize from saved state or default
  const [step, setStep] = useState(savedState?.step || 0);
  const [correctCount, setCorrectCount] = useState(savedState?.correctCount || 0); // Kept for types but less used in quizzes now
  const [textInput, setTextInput] = useState(savedState?.textInput || '');
  const [gameScore, setGameScore] = useState(savedState?.gameScore || 0);
  const [simState, setSimState] = useState(savedState?.simState || { capital: 5000, satisfaction: 50, innovationScore: 0 });
  
  // New: User answers map to track selections across navigation
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>(savedState?.userAnswers || {});

  // Initialize progress based on restored state
  const [progress, setProgress] = useState(() => {
     if (!savedState) return 0;
     if (section.type === 'quiz') {
         const qLen = (QUESTIONS_DB[section.id] || QUESTIONS_DB['default']).length;
         return Math.round(((savedState.step) / qLen) * 100);
     }
     if (section.type === 'writing') return Math.min(100, (savedState.textInput.length / 200) * 100);
     if (section.type === 'simulation') {
         const sLen = (SIMULATION_SCENARIOS[section.id] || []).length;
         return Math.round(((savedState.step) / sLen) * 100);
     }
     return 0;
  });

  const parseDuration = (duration?: string) => {
    if (!duration) return 600;
    const match = duration.match(/(\d+)/);
    return match ? parseInt(match[0]) * 60 : 600;
  };

  const getInitialTime = () => {
    const totalSeconds = parseDuration(section.duration);
    if (!section.startTime) return totalSeconds;
    
    // Calculate how much time has passed since start
    const elapsedSeconds = Math.floor((Date.now() - section.startTime) / 1000);
    return Math.max(0, totalSeconds - elapsedSeconds);
  };

  // Initialize with the calculated remaining time
  const [globalTimeLeft, setGlobalTimeLeft] = useState(getInitialTime);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -- GAME SPECIFIC STATES --
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [timeLeft, setTimeLeft] = useState(30); 
  
  // C3: Abstract
  const [currentShape, setCurrentShape] = useState(0);

  // G2: Tower (Oscillator)
  const [towerHeight, setTowerHeight] = useState(0);
  const [oscillatorPos, setOscillatorPos] = useState(50); // 0 to 100
  const [oscillatorDir, setOscillatorDir] = useState(1); // 1 or -1
  const [oscillatorSpeed, setOscillatorSpeed] = useState(1);
  const requestRef = useRef<number | null>(null);

  // G3: Risk (Balloon)
  const [balloonSize, setBalloonSize] = useState(10);
  const [roundPot, setRoundPot] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [popped, setPopped] = useState(false);

  // E2: Listening
  const [isPlaying, setIsPlaying] = useState(false);

  // Video State
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Exit handler to save progress
  const handleExit = () => {
    onExit({
        step,
        correctCount,
        textInput,
        gameScore,
        simState,
        userAnswers
    });
  };

  // GATHER RESULTS AND COMPLETE
  const handleFinish = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // Prepare result object
    let result: { score: number, type: string, data?: any } = { score: 0, type: section.type };

    if (section.type === 'quiz') {
      const questions = QUESTIONS_DB[section.id] || QUESTIONS_DB['default'];
      // Calculate score based on full answer map
      let finalCorrect = 0;
      questions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correct) finalCorrect++;
      });
      const score = Math.round((finalCorrect / questions.length) * 100);
      result = { score, type: 'quiz' };

    } else if (section.type === 'game') {
      // Normalize game scores to 0-100 roughly
      let score = 0;
      if (section.id === 'g3') score = Math.min(100, Math.round(gameScore / 2)); // Risk
      else if (section.id === 'g2') score = Math.min(100, gameScore * 2); // Tower
      else if (section.id === 'c3') score = Math.min(100, gameScore / 2); // Abstract
      else score = Math.min(100, gameScore);
      result = { score, type: 'game' };

    } else if (section.type === 'writing') {
      result = { score: 0, type: 'writing', data: textInput }; // Score calculated by AI

    } else if (section.type === 'simulation') {
      // Use satisfaction as score for now
      result = { score: simState.satisfaction, type: 'simulation', data: simState };

    } else if (section.type === 'video') {
      result = { score: 0, type: 'video', data: "Video Recorded" }; // Score calculated by AI
    }

    setTimeout(() => {
      onComplete(result);
    }, 1500);
  };

  // ... (Effects for Timer/Animation remain same)

    // Check on mount if time is already expired
  useEffect(() => {
    if (getInitialTime() <= 0) {
        handleFinish();
    }
  }, []);

  // Global Timer
  useEffect(() => {
    if (globalTimeLeft <= 0) return;
    const timerId = setInterval(() => {
      setGlobalTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- GAME LOOP FOR G2 (TOWER) ---
  const animateOscillator = () => {
    if (gameState !== 'playing') return;
    setOscillatorPos(prev => {
      let next = prev + (oscillatorSpeed * oscillatorDir);
      if (next >= 100 || next <= 0) {
        setOscillatorDir(d => d * -1);
        next = Math.max(0, Math.min(100, next));
      }
      return next;
    });
    requestRef.current = requestAnimationFrame(animateOscillator);
  };

  useEffect(() => {
    if (section.id === 'g2' && gameState === 'playing') {
      requestRef.current = requestAnimationFrame(animateOscillator);
      return () => {
          if (requestRef.current !== null) {
            cancelAnimationFrame(requestRef.current);
          }
      };
    }
  }, [gameState, oscillatorDir, oscillatorSpeed, section.id]);

  // --- SHARED GAME TIMER ---
  useEffect(() => {
    let interval: number;
    if (gameState === 'playing' && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('finished');
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);


  // --- RENDERERS ---

  const renderQuiz = () => {
    const questions = QUESTIONS_DB[section.id] || QUESTIONS_DB['default'];
    const currentQ = questions[step % questions.length];
    
    // Use userAnswers map to check if current question has a selection
    const currentSelectedOption = userAnswers[step] !== undefined ? userAnswers[step] : null;

    const handleOptionSelect = (idx: number) => {
        // Persist selection to state map
        setUserAnswers(prev => ({ ...prev, [step]: idx }));
    };

    const handleNext = () => {
      if (step < questions.length - 1) { 
        setStep(s => s + 1);
        // Progress tracks max step reached relative to total
        setProgress(Math.round(((step + 2) / questions.length) * 100));
      } else {
        setProgress(100);
        handleFinish();
      }
    };

    const handlePrevious = () => {
      if (step > 0) {
        setStep(s => s - 1);
        // Adjust progress visualization backwards
        setProgress(Math.round(((step) / questions.length) * 100));
      }
    };

    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
          <div className="flex justify-between items-center mb-4">
             <span className="text-xs font-bold text-primary-dark dark:text-primary uppercase tracking-wider block">Question {step + 1} of {questions.length}</span>
             <span className="text-xs text-text-muted font-mono">{Math.round(progress)}% Complete</span>
          </div>
          <h2 className="text-xl font-bold text-text-main dark:text-white mb-6 leading-relaxed">
            {currentQ.question}
          </h2>
          <div className="space-y-3 mb-8">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  currentSelectedOption === idx 
                    ? 'border-primary bg-primary/10 text-text-main dark:text-white font-bold' 
                    : 'border-transparent bg-background-light dark:bg-white/5 text-text-muted hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center">
             <button
                onClick={handlePrevious}
                disabled={step === 0 || isSubmitting}
                className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                    step === 0 
                    ? 'opacity-0 pointer-events-none' 
                    : 'bg-gray-100 dark:bg-white/5 text-text-muted hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
             >
                Previous
             </button>

             <button
              onClick={handleNext}
              disabled={currentSelectedOption === null || isSubmitting}
              className="px-8 py-3 bg-primary text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00d64b] transition-colors"
             >
               {step === questions.length - 1 ? (isSubmitting ? 'Submitting...' : 'Finish Quiz') : 'Next Question'}
             </button>
          </div>
        </div>
      </div>
    );
  };

  const renderWriting = () => {
    // Dynamic config based on section ID
    const getConfig = () => {
      if (section.id === 'e2') return {
        title: "Audio Summary",
        desc: "Listen to the 2-minute business market update below. Summarize the key risks and opportunities mentioned.",
        hasAudio: true,
        placeholder: "Summarize the key points here..."
      };
      if (section.id === 'e4') return {
        title: '"Why Tetr?" Essay',
        desc: "In 200 words, explain why Tetr College of Business is the right fit for your entrepreneurial journey. Highlight specific aspects of the curriculum.",
        hasAudio: false,
        placeholder: "Start your essay here..."
      };
      return {
        title: "Essay Response",
        desc: "Please explain your motivation for applying to this program. Focus on your long-term career goals.",
        hasAudio: false,
        placeholder: "Start typing your response here..."
      };
    };

    const config = getConfig();

    return (
      <div className="max-w-3xl mx-auto mt-8 h-full flex flex-col">
        <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-text-main dark:text-white mb-2">{config.title}</h2>
          <p className="text-text-muted mb-6">{config.desc}</p>
          
          {config.hasAudio && (
            <div className="bg-background-light dark:bg-white/5 p-4 rounded-xl mb-6 flex items-center gap-4">
               <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-12 rounded-full bg-primary text-black flex items-center justify-center hover:bg-[#00d64b] transition-colors"
               >
                 <span className="material-symbols-outlined text-2xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
               </button>
               <div className="flex-1">
                  <div className="text-xs font-bold text-text-main dark:text-white mb-1">Market Update Q3.mp3</div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                     <div className={`h-full bg-primary ${isPlaying ? 'animate-[width_2s_linear_infinite]' : 'w-0'}`} style={{ width: isPlaying ? '100%' : '0%' }}></div>
                  </div>
               </div>
               <span className="text-xs font-mono text-text-muted">02:00</span>
            </div>
          )}

          <textarea
            value={textInput}
            onChange={(e) => {
                setTextInput(e.target.value);
                setProgress(Math.min(100, (e.target.value.length / 200) * 100));
            }}
            placeholder={config.placeholder}
            className="flex-1 w-full p-4 rounded-xl bg-background-light dark:bg-white/5 border-2 border-transparent focus:border-primary/50 outline-none text-text-main dark:text-white resize-none"
          />
          <div className="flex justify-between items-center mt-6">
            <span className="text-sm text-text-muted font-mono">{textInput.split(/\s+/).filter(w => w.length > 0).length} words</span>
            <button
              onClick={handleFinish}
              disabled={textInput.length < 50 || isSubmitting}
              className="px-8 py-3 bg-primary text-black font-bold rounded-xl disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Response'}
            </button>
          </div>
        </div>
        <style>{`
          @keyframes width { 0% { width: 0%; } 100% { width: 100%; } }
        `}</style>
      </div>
    );
  };

  const renderGame = () => {
    // Determine Game Type
    const isAbstract = section.id === 'c3';
    const isTower = section.id === 'g2';
    const isRisk = section.id === 'g3';

    // Config per game
    const gameDuration = isAbstract ? 60 : isRisk ? 90 : 30;

    const handleStart = () => {
        setGameState('playing');
        setTimeLeft(gameDuration);
        setGameScore(0);
        setAttempts(0);
    };

    // -- ABSTRACT LOGIC --
    const handleAbstractClick = () => {
        setGameScore(s => s + 10);
        setCurrentShape(s => (s + 1) % 4);
    };

    // -- TOWER LOGIC --
    const handleTowerClick = () => {
        const centerDist = Math.abs(oscillatorPos - 50);
        const accuracy = Math.max(0, 100 - (centerDist * 2)); // 100 if perfect, 0 if far
        
        if (accuracy > 20) {
            setTowerHeight(h => h + 1);
            setGameScore(s => s + Math.round(accuracy));
            setOscillatorSpeed(s => Math.min(s + 0.2, 5)); // Gets faster
        } else {
            // Missed, tower falls a bit
            setTowerHeight(h => Math.max(0, h - 2));
        }
    };

    // -- RISK LOGIC --
    const handleInflate = () => {
        if (popped) return;
        // 10% chance to pop + 2% per size unit over 20
        const riskFactor = 0.05 + (balloonSize > 20 ? (balloonSize - 20) * 0.02 : 0);
        if (Math.random() < riskFactor) {
            setPopped(true);
            setRoundPot(0);
            setTimeout(() => {
                setPopped(false);
                setBalloonSize(10);
                setAttempts(a => a + 1);
                // Check if max attempts reached? For now just time based.
            }, 1000);
        } else {
            setBalloonSize(s => s + 5);
            setRoundPot(p => p + 10);
        }
    };
    const handleBank = () => {
        setGameScore(s => s + roundPot);
        setRoundPot(0);
        setBalloonSize(10);
        setAttempts(a => a + 1);
    };

    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        {gameState === 'idle' ? (
           <div className="bg-card-bg dark:bg-card-bg-dark p-12 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
             <span className="material-symbols-outlined text-6xl text-primary mb-4">
                {isAbstract ? '3d_rotation' : isTower ? 'foundation' : 'explore'}
             </span>
             <h2 className="text-2xl font-bold text-text-main dark:text-white mb-2">
                {isAbstract ? 'Spatial Rotation Task' : isTower ? 'Precision Tower' : 'Risk & Reward'}
             </h2>
             <p className="text-text-muted mb-8">
                {isAbstract && 'Identify the matching rotated shape as quickly as possible.'}
                {isTower && 'Tap when the bar is in the green zone to build your tower higher.'}
                {isRisk && 'Inflate the balloon to earn points. Bank before it pops!'}
             </p>
             <button 
                onClick={handleStart}
                className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform"
             >
                Start Game ({gameDuration}s)
             </button>
           </div>
        ) : gameState === 'playing' ? (
            <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
                <div className="flex justify-between mb-8 text-xl font-bold font-mono">
                    <span className="text-text-main dark:text-white">Score: {gameScore}</span>
                    <span className={`${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-primary-dark dark:text-primary'}`}>{timeLeft}s</span>
                </div>
                
                {/* --- GAME VISUALS --- */}
                <div className="h-72 flex flex-col items-center justify-center relative overflow-hidden bg-background-light dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 mb-6">
                    
                    {isAbstract && (
                        <div className="flex flex-col gap-6 items-center">
                            <div className="flex gap-4 items-center">
                                <div className="size-20 border-2 border-dashed border-gray-400 flex items-center justify-center">
                                    <span className={`material-symbols-outlined text-4xl transition-transform duration-300 ${currentShape === 0 ? 'rotate-0' : currentShape === 1 ? 'rotate-90' : 'rotate-180'}`}>category</span>
                                </div>
                                <span className="material-symbols-outlined text-gray-400">arrow_forward</span>
                                <div className="size-20 border-2 border-primary flex items-center justify-center bg-primary/10">
                                    <span className="material-symbols-outlined text-4xl animate-pulse">category</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handleAbstractClick} className="px-6 py-2 bg-red-100 text-red-600 rounded-lg font-bold">No</button>
                                <button onClick={handleAbstractClick} className="px-6 py-2 bg-[#e7f3eb] text-[#078829] rounded-lg font-bold">Yes</button>
                            </div>
                        </div>
                    )}

                    {isTower && (
                        <div className="w-full h-full flex flex-col justify-end items-center relative">
                            {/* Moving Bar */}
                            <div className="absolute top-4 w-[80%] h-4 bg-gray-200 rounded-full overflow-hidden">
                                <div className="absolute left-1/2 -translate-x-1/2 w-[20%] h-full bg-[#13ec5b]/50"></div>
                                <div 
                                    className="absolute top-0 bottom-0 w-[5%] bg-black dark:bg-white transition-none"
                                    style={{ left: `${oscillatorPos}%` }}
                                ></div>
                            </div>
                            <div className="text-sm font-bold absolute top-10 text-text-muted">Height: {towerHeight}m</div>
                            
                            {/* Tower Visual */}
                            <div className="flex flex-col-reverse items-center gap-1 w-full pb-4 max-h-[200px] overflow-hidden">
                                {Array.from({ length: towerHeight }).map((_, i) => (
                                    <div key={i} className="w-20 h-6 bg-primary border-b border-black/10 rounded-sm shadow-sm animate-[fadeIn_0.1s_ease-out]"></div>
                                ))}
                                <div className="w-32 h-2 bg-gray-400 rounded-full"></div>
                            </div>
                        </div>
                    )}

                    {isRisk && (
                         <div className="flex flex-col items-center justify-center w-full h-full">
                            <div className="mb-4 text-sm font-bold text-text-muted">Pot: {roundPot} pts</div>
                            <div 
                                className={`rounded-full transition-all duration-300 flex items-center justify-center shadow-xl ${popped ? 'bg-red-500 scale-110 opacity-50' : 'bg-gradient-to-tr from-purple-500 to-pink-500'}`}
                                style={{ 
                                    width: popped ? '100px' : `${Math.min(200, 50 + balloonSize)}px`, 
                                    height: popped ? '100px' : `${Math.min(200, 50 + balloonSize)}px` 
                                }}
                            >
                                {popped ? (
                                    <span className="material-symbols-outlined text-white text-4xl">close</span>
                                ) : (
                                    <span className="text-white font-bold text-xl">{balloonSize}</span>
                                )}
                            </div>
                            {popped && <p className="text-red-500 font-bold mt-2 animate-bounce">POPPED!</p>}
                         </div>
                    )}

                </div>

                {/* --- CONTROLS --- */}
                <div className="flex justify-center gap-4">
                    {isTower && (
                        <button 
                            onMouseDown={handleTowerClick}
                            className="size-24 rounded-full bg-primary hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center border-4 border-white dark:border-gray-800"
                        >
                            <span className="material-symbols-outlined text-4xl">touch_app</span>
                        </button>
                    )}
                    {isRisk && !popped && (
                        <>
                            <button onClick={handleInflate} className="px-6 py-4 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 flex flex-col items-center leading-none gap-1">
                                <span className="material-symbols-outlined">air</span>
                                PUMP
                            </button>
                            <button onClick={handleBank} className="px-6 py-4 bg-[#e7f3eb] text-[#078829] rounded-xl font-bold hover:bg-[#d0e6d8] flex flex-col items-center leading-none gap-1">
                                <span className="material-symbols-outlined">savings</span>
                                BANK
                            </button>
                        </>
                    )}
                </div>
            </div>
        ) : (
            <div className="bg-card-bg dark:bg-card-bg-dark p-12 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
                <h2 className="text-3xl font-bold text-text-main dark:text-white mb-4">Complete!</h2>
                <p className="text-xl text-primary-dark dark:text-primary font-bold mb-8">Final Score: {gameScore}</p>
                <button 
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-primary text-black font-bold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Results...' : 'Finish Module'}
                </button>
            </div>
        )}
      </div>
    );
  };

  const renderSimulation = () => {
    // ... (Simulation render logic uses handleFinish from above)
    const scenarios = SIMULATION_SCENARIOS[section.id] || [];
    const currentScenario = scenarios[step];
    
    // Check if simulation is done
    if (!currentScenario) {
        if (progress < 100) setProgress(100);
        return (
            <div className="max-w-2xl mx-auto mt-12 text-center bg-card-bg dark:bg-card-bg-dark p-12 rounded-2xl shadow-lg">
                <span className="material-symbols-outlined text-6xl text-primary mb-4">flag</span>
                <h2 className="text-2xl font-bold text-text-main dark:text-white mb-4">Simulation Complete</h2>
                <div className="flex justify-center gap-8 mb-8 text-left">
                     {section.id === 'g1' && (
                        <>
                            <div>
                                <p className="text-xs text-text-muted uppercase">Final Capital</p>
                                <p className="text-xl font-bold text-text-main dark:text-white">${simState.capital}</p>
                            </div>
                            <div>
                                <p className="text-xs text-text-muted uppercase">Satisfaction</p>
                                <p className="text-xl font-bold text-text-main dark:text-white">{simState.satisfaction}%</p>
                            </div>
                        </>
                     )}
                     {section.id === 'g4' && (
                        <div>
                             <p className="text-xs text-text-muted uppercase">Strategy Profile</p>
                             <p className="text-xl font-bold text-text-main dark:text-white">{simState.innovationScore > 1 ? 'Disruptor' : 'Traditionalist'}</p>
                        </div>
                     )}
                </div>
                <button 
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-primary text-black font-bold rounded-xl"
                >
                  {isSubmitting ? 'Submitting...' : 'View Results'}
                </button>
            </div>
        );
    }

    const handleChoice = (effect: any) => {
        // Apply effects
        setSimState(prev => ({
            capital: prev.capital + (effect.capital || 0),
            satisfaction: Math.min(100, Math.max(0, prev.satisfaction + (effect.satisfaction || 0))),
            innovationScore: prev.innovationScore + (effect.type === 'risky' ? 1 : 0)
        }));
        
        // Move to next
        setStep(s => s + 1);
        setProgress(Math.round(((step + 1) / scenarios.length) * 100));
    };

    return (
        <div className="max-w-3xl mx-auto mt-8">
            {/* --- DASHBOARD --- */}
            {section.id === 'g1' && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-card-bg dark:bg-card-bg-dark p-4 rounded-xl border border-text-main/5 dark:border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-text-muted uppercase font-bold">Capital</p>
                            <p className="text-2xl font-bold text-text-main dark:text-white">${simState.capital}</p>
                        </div>
                        <span className="material-symbols-outlined text-green-500 text-3xl">attach_money</span>
                    </div>
                    <div className="bg-card-bg dark:bg-card-bg-dark p-4 rounded-xl border border-text-main/5 dark:border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-text-muted uppercase font-bold">Satisfaction</p>
                            <p className="text-2xl font-bold text-text-main dark:text-white">{simState.satisfaction}%</p>
                        </div>
                        <span className="material-symbols-outlined text-blue-500 text-3xl">thumb_up</span>
                    </div>
                </div>
            )}

            <div className="bg-card-bg dark:bg-card-bg-dark p-8 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-primary/10 text-primary-dark dark:text-primary text-[10px] font-bold rounded uppercase tracking-wider">
                        Scenario {step + 1}/{scenarios.length}
                    </span>
                </div>
                <h2 className="text-2xl font-bold text-text-main dark:text-white mb-4">{currentScenario.title}</h2>
                <p className="text-lg text-text-muted mb-8 leading-relaxed">
                    {currentScenario.context}
                </p>

                <div className="grid grid-cols-1 gap-3">
                    {currentScenario.choices.map((choice, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleChoice(choice.effect)}
                            className="text-left p-5 rounded-xl bg-background-light dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 border border-transparent hover:border-primary/30 transition-all group"
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-text-main dark:text-white group-hover:text-primary-dark dark:group-hover:text-primary transition-colors">
                                    {choice.text}
                                </span>
                                <span className="material-symbols-outlined text-gray-300 group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderVideo = () => {
      // ... (Video render logic uses handleFinish from above)
    // Dynamic Prompt
    const getPrompt = () => {
        switch(section.id) {
            case 'e3': return "Topic 1 of 3: Discuss the importance of cross-cultural communication in modern business. (Speak for 1-2 minutes)";
            case 'v1': return "Communication Check: Introduce yourself and what drives you in 60 seconds.";
            case 'v2': return "Scenario: You discover a colleague is inflating sales figures. How do you handle it?";
            case 'v3': return "Stress Response: Describe a time you failed publicly. What did you learn?";
            default: return "Describe a time you faced a significant challenge and how you overcame it.";
        }
    };

    useEffect(() => {
        if(isRecording && videoRef.current) {
            // Mock stream setup
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => {
                    if (videoRef.current) videoRef.current.srcObject = stream;
                })
                .catch(err => console.error("Camera access denied", err));
        }
        return () => {
             const stream = videoRef.current?.srcObject as MediaStream;
             stream?.getTracks().forEach(track => track.stop());
        }
    }, [isRecording]);

    return (
        <div className="max-w-3xl mx-auto mt-8">
             <div className="bg-card-bg dark:bg-card-bg-dark p-6 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
                <h2 className="text-xl font-bold text-text-main dark:text-white mb-4">Video Response</h2>
                <p className="text-text-muted mb-6">{getPrompt()}</p>
                
                <div className="aspect-video bg-black rounded-xl overflow-hidden relative mb-6">
                    {isRecording ? (
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/10 dark:bg-white/5">
                            <span className="material-symbols-outlined text-6xl text-text-muted/20">videocam_off</span>
                        </div>
                    )}
                    {isRecording && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm animate-pulse">
                            <div className="size-2 rounded-full bg-white"></div>
                            REC 00:{Math.floor(Math.random() * 50).toString().padStart(2, '0')}
                        </div>
                    )}
                </div>
                <div className="flex justify-center gap-4">
                    {!isRecording ? (
                        <button 
                            onClick={() => setIsRecording(true)}
                            className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                        >
                            <span className="material-symbols-outlined">fiber_manual_record</span>
                            Start Recording
                        </button>
                    ) : (
                         <button 
                            onClick={() => { setIsRecording(false); handleFinish(); }}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-8 py-3 bg-white text-red-500 font-bold rounded-xl border-2 border-red-100 hover:bg-red-50 transition-colors"
                        >
                            <span className="material-symbols-outlined">stop_circle</span>
                            {isSubmitting ? 'Submitting...' : 'Stop & Submit'}
                        </button>
                    )}
                </div>
             </div>
        </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    <div className="fixed inset-0 z-[200] bg-background-light dark:bg-background-dark flex flex-col animate-[fadeIn_0.2s_ease-out]">
      
      {/* Top Bar */}
      <div className="h-16 border-b border-text-main/5 dark:border-white/5 flex items-center justify-between px-6 bg-card-bg dark:bg-card-bg-dark">
        <div className="flex items-center gap-4">
            <button onClick={handleExit} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
                <h3 className="font-bold text-text-main dark:text-white">{section.title}</h3>
                <span className="text-xs text-text-muted uppercase">{section.type} Assessment</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
                <span className="block text-xs text-text-muted">Time Remaining</span>
                <span className={`font-mono font-bold ${globalTimeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-text-main dark:text-white'}`}>
                    {formatTime(globalTimeLeft)}
                </span>
            </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="h-1 bg-gray-200 dark:bg-gray-800 w-full">
         <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 relative">
         {/* Overlay for time up */}
         {globalTimeLeft === 0 && (
             <div className="absolute inset-0 bg-background-light/90 dark:bg-background-dark/90 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
                 <span className="material-symbols-outlined text-6xl text-text-muted mb-4">timer_off</span>
                 <h2 className="text-2xl font-bold text-text-main dark:text-white mb-2">Time's Up!</h2>
                 <p className="text-text-muted mb-4">Your answers are being submitted...</p>
                 <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
         )}
         
         {section.type === 'quiz' && renderQuiz()}
         {section.type === 'writing' && renderWriting()}
         {section.type === 'game' && renderGame()}
         {section.type === 'simulation' && renderSimulation()} 
         {section.type === 'video' && renderVideo()}
      </div>
    </div>
  );
};