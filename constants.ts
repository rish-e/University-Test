import { AssessmentModule, ModuleStatus, UserProfile } from './types';

export const USER_PROFILE: UserProfile = {
  name: "Alex Smith",
  id: "#29482",
  term: "Fall 2024",
  avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZwNRzasI7rQ9T0nx91EQGGq-4CXN6ROS7aF6QvjmPxitxuckr94wxld9BuoNxW6BWIqjN9FDLTuyHAHEO9SRT8aJ70qsUVoL9iGVfv706G6msuiIHilUcceciphqN8_IyKqYfI5y_-0EuV6kyYyu4qIdlKK24hfXY9Ji5ANCX01I0XJOyi4RCvCkKNKxRfEaoZT-rR43GtzSh37lHG-_CxnaTR4CLPV_25jHfzg2YOGeHqtTpTReY_sDLFyZbg7UqalNQZDkdGO0",
  totalCompletion: 0,
  dailyProgress: 0
};

export const MODULES: AssessmentModule[] = [
  {
    id: '1',
    title: 'Cognitive & Quantitative',
    description: 'Numerical data interpretation, logical patterns, and abstract spatial reasoning.',
    icon: 'psychology',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 4,
    completedTasks: 0,
    topics: ['Numerical', 'Logical', 'Abstract', 'Critical'],
    sections: [
      {
        id: 'c1',
        title: 'Numerical Reasoning',
        description: '15 data interpretation questions (charts, % change, break-even)',
        duration: '20 min',
        isCompleted: false,
        type: 'quiz'
      },
      {
        id: 'c2',
        title: 'Logical Reasoning',
        description: '12 pattern/sequence puzzles and series completion',
        duration: '15 min',
        isCompleted: false,
        type: 'quiz'
      },
      {
        id: 'c3',
        title: 'Abstract Thinking',
        description: '10 spatial rotation & shape matching games',
        duration: '10 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 'c4',
        title: 'Critical Reasoning',
        description: '8 argument analysis and flaw identification scenarios',
        duration: '12 min',
        isCompleted: false,
        type: 'quiz'
      }
    ]
  },
  {
    id: '2',
    title: 'Gamified Behavioral Assessment',
    description: 'Interactive challenges measuring strategy, resilience, and problem-solving speed.',
    icon: 'sports_esports',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 4,
    completedTasks: 0,
    topics: ['Strategy', 'Resilience', 'Problem Solving', 'Innovation'],
    sections: [
      {
        id: 'g1',
        title: 'Planning & Strategy',
        description: 'Resource allocation game (supply chain sim)',
        duration: '15 min',
        isCompleted: false,
        type: 'simulation'
      },
      {
        id: 'g2',
        title: 'Problem-solving Speed',
        description: 'Tower-building puzzle (time + accuracy)',
        duration: '10 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 'g3',
        title: 'Risk Tolerance & Grit',
        description: 'Failure-restart challenge (10 attempts)',
        duration: '20 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 'g4',
        title: 'Innovation Mindset',
        description: 'Open-ended path selection game',
        duration: '15 min',
        isCompleted: false,
        type: 'simulation'
      }
    ]
  },
  {
    id: '3',
    title: 'Technical Business Skills',
    description: 'Practical assessment of core tools (Excel, SQL) and business calculations.',
    icon: 'query_stats',
    status: ModuleStatus.NotStarted,
    progress: 0,
    totalTasks: 3,
    completedTasks: 0,
    topics: ['Excel Proficiency', 'SQL Basics', 'Business Math'],
    sections: [
      {
        id: 't1',
        title: 'Excel Proficiency',
        description: '8 tasks (pivot, VLOOKUP, conditional formatting)',
        duration: '25 min',
        isCompleted: false,
        type: 'quiz'
      },
      {
        id: 't2',
        title: 'SQL Basics',
        description: '5 queries (JOINs, GROUP BY, subqueries)',
        duration: '20 min',
        isCompleted: false,
        type: 'quiz'
      },
      {
        id: 't3',
        title: 'Business Math',
        description: '10 calculations (ROI, NPV, breakeven)',
        duration: '15 min',
        isCompleted: false,
        type: 'quiz'
      }
    ]
  },
  {
    id: '4',
    title: 'English Language Proficiency',
    description: 'Comprehensive evaluation of reading, listening, speaking, and writing skills.',
    icon: 'translate',
    status: ModuleStatus.NotStarted,
    progress: 0,
    totalTasks: 4,
    completedTasks: 0,
    topics: ['Reading', 'Listening', 'Speaking', 'Writing'],
    sections: [
      {
        id: 'e1',
        title: 'Reading Comprehension',
        description: '3 business case summaries (400 words)',
        duration: '20 min',
        isCompleted: false,
        type: 'quiz'
      },
      {
        id: 'e2',
        title: 'Listening & Pronunciation',
        description: '2min business podcast → summary',
        duration: '10 min',
        isCompleted: false,
        type: 'writing'
      },
      {
        id: 'e3',
        title: 'Speaking Fluency',
        description: '3 video responses (2min each)',
        duration: '15 min',
        isCompleted: false,
        type: 'video'
      },
      {
        id: 'e4',
        title: 'Writing Structure',
        description: '200-word "Why Tetr?" essay',
        duration: '25 min',
        isCompleted: false,
        type: 'writing'
      }
    ]
  },
  {
    id: '5',
    title: 'Video Behavioral Analysis',
    description: 'AI-driven analysis of communication tone, EQ, and stress response.',
    icon: 'videocam',
    status: ModuleStatus.Locked,
    progress: 0,
    totalTasks: 3,
    completedTasks: 0,
    topics: ['Communication', 'EQ', 'Confidence'],
    sections: [
      {
        id: 'v1',
        title: 'Communication Effectiveness',
        description: 'Video Q&A analysis (tone, clarity)',
        duration: '10 min',
        isCompleted: false,
        type: 'video'
      },
      {
        id: 'v2',
        title: 'Emotional Intelligence',
        description: '5 moral dilemma responses',
        duration: '15 min',
        isCompleted: false,
        type: 'video'
      },
      {
        id: 'v3',
        title: 'Confidence & Calmness',
        description: 'Stress question analysis (filler words, pauses)',
        duration: '10 min',
        isCompleted: false,
        type: 'video'
      }
    ]
  }
];