import { AssessmentModule, ModuleStatus, UserProfile } from './types';

export const USER_PROFILE: UserProfile = {
  name: "Alex Smith",
  id: "#29482",
  term: "Fall 2024",
  avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZwNRzasI7rQ9T0nx91EQGGq-4CXN6ROS7aF6QvjmPxitxuckr94wxld9BuoNxW6BWIqjN9FDLTuyHAHEO9SRT8aJ70qsUVoL9iGVfv706G6msuiIHilUcceciphqN8_IyKqYfI5y_-0EuV6kyYyu4qIdlKK24hfXY9Ji5ANCX01I0XJOyi4RCvCkKNKxRfEaoZT-rR43GtzSh37lHG-_CxnaTR4CLPV_25jHfzg2YOGeHqtTpTReY_sDLFyZbg7UqalNQZDkdGO0",
  totalCompletion: 0,
  dailyProgress: 0,
  metrics: {
    cognitive: 0,
    technical: 0,
    behavioral: 0,
    communication: 0,
    leadership: 0
  }
};

export const MODULES: AssessmentModule[] = [
  {
    id: '1',
    title: 'Cognitive & Quantitative',
    narrativeTitle: 'The Idea Lab',
    narrativeDesc: 'Every great venture starts with sharp thinking. Prove you can crunch numbers, spot patterns, and dismantle weak arguments under pressure.',
    description: 'Numerical data interpretation, logical patterns, and abstract spatial reasoning.',
    icon: 'lightbulb',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 4,
    completedTasks: 0,
    topics: ['Data Dash', 'Pattern Lock', 'Spatial Rotation', 'Debate Arena'],
    sections: [
      {
        id: 'c1',
        title: 'Data Dash',
        description: 'Interpret live business dashboards and calculate answers under time pressure',
        duration: '20 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 'c2',
        title: 'Pattern Lock',
        description: 'Complete visual shape sequences of increasing complexity',
        duration: '15 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 'c3',
        title: 'Spatial Rotation',
        description: 'Match rotated geometric shapes as fast as possible',
        duration: '10 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 'c4',
        title: 'Debate Arena',
        description: 'Find and classify logical flaws in business arguments',
        duration: '12 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '2',
    title: 'Gamified Behavioral Assessment',
    narrativeTitle: 'The Arena',
    narrativeDesc: 'Every founder faces chaos. Navigate supply chain disasters, build under pressure, manage risk, and choose your innovation path.',
    description: 'Interactive challenges measuring strategy, resilience, and problem-solving speed.',
    icon: 'shield',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 4,
    completedTasks: 0,
    topics: ['Supply Chain', 'Precision Tower', 'Balloon Risk', 'Innovation Path'],
    sections: [
      {
        id: 'g1',
        title: 'Supply Chain Crisis',
        description: 'Navigate resource allocation in a live supply chain simulation',
        duration: '15 min',
        isCompleted: false,
        type: 'simulation'
      },
      {
        id: 'g2',
        title: 'Precision Tower',
        description: 'Build the tallest tower with timing and accuracy',
        duration: '10 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 'g3',
        title: 'Risk & Reward',
        description: 'Inflate, bank, or bust — test your risk tolerance',
        duration: '20 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 'g4',
        title: 'Innovation Path',
        description: 'Chart your startup journey through 5 critical decisions',
        duration: '15 min',
        isCompleted: false,
        type: 'simulation'
      }
    ]
  },
  {
    id: '3',
    title: 'Technical Business Skills',
    narrativeTitle: 'The Workshop',
    narrativeDesc: 'Time to build the product. Show you can model finances, query data, and crunch the numbers that keep a startup alive.',
    description: 'Hands-on assessment of Excel, SQL, and business calculations.',
    icon: 'build',
    status: ModuleStatus.NotStarted,
    progress: 0,
    totalTasks: 3,
    completedTasks: 0,
    topics: ['Spreadsheet Rescue', 'Query Quest', 'Startup Simulator'],
    sections: [
      {
        id: 't1',
        title: 'Spreadsheet Rescue',
        description: 'Fix broken formulas and build pivot tables in a live spreadsheet',
        duration: '25 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 't2',
        title: 'Query Quest',
        description: 'Write SQL queries to match expected data outputs',
        duration: '20 min',
        isCompleted: false,
        type: 'game'
      },
      {
        id: 't3',
        title: 'Startup Simulator',
        description: 'Calculate ROI, breakeven, and runway from live financial data',
        duration: '15 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '4',
    title: 'English Language Proficiency',
    narrativeTitle: 'The Pitch Deck',
    narrativeDesc: 'Communicate your vision. Analyze competitors, write the investor memo, and deliver the pitch that closes the deal.',
    description: 'Comprehensive evaluation of reading, listening, speaking, and writing skills.',
    icon: 'campaign',
    status: ModuleStatus.NotStarted,
    progress: 0,
    totalTasks: 4,
    completedTasks: 0,
    topics: ['Case Command', 'Listening', 'Speaking', 'Writing'],
    sections: [
      {
        id: 'e1',
        title: 'Case Command',
        description: 'Read client briefs and make strategic decisions with branching consequences',
        duration: '20 min',
        isCompleted: false,
        type: 'game'
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
    narrativeTitle: 'The Boardroom',
    narrativeDesc: 'Face the board. Your communication, emotional intelligence, and composure under pressure will be analyzed by AI.',
    description: 'AI-driven analysis of communication tone, EQ, and stress response.',
    icon: 'meeting_room',
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
