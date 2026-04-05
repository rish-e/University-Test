import { AssessmentModule, ModuleStatus, UserProfile } from './types';

export const USER_PROFILE: UserProfile = {
  name: "Candidate",
  id: "#00000",
  term: "Fall 2026",
  avatarUrl: "",
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
    title: 'Cognitive Assessment',
    narrativeTitle: 'Space Defender',
    narrativeDesc: 'Fly your ship through an asteroid field while fighting off alien threats. Your reflexes, multitasking, and decision-making under pressure reveal your cognitive baseline.',
    description: 'Processing speed, multitasking, risk management, and crisis decision-making.',
    icon: 'rocket_launch',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Reflexes', 'Multitasking', 'Risk'],
    sections: [
      {
        id: 'space-defender',
        title: 'Space Defender',
        description: 'Dodge asteroids, shoot aliens, manage resources — all at once',
        duration: '5 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '2',
    title: 'Financial Reasoning',
    narrativeTitle: 'Market Trader',
    narrativeDesc: 'Trade assets in a live simulated market. React to breaking news, spot patterns in price movements, and manage your portfolio under time pressure.',
    description: 'Numerical intuition, risk tolerance, pattern recognition, and decision speed.',
    icon: 'trending_up',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Trading', 'Risk', 'Numbers'],
    sections: [
      {
        id: 'market-trader',
        title: 'Market Trader',
        description: 'Buy and sell assets, react to market news, grow your portfolio',
        duration: '8 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '3',
    title: 'Strategic Thinking',
    narrativeTitle: 'Startup Launch',
    narrativeDesc: 'You have $10,000 and 10 weeks to grow a startup. Allocate budget, pick channels, react to competitors, and pivot when the market shifts.',
    description: 'Resource allocation, adaptability, strategic reasoning, and competitive awareness.',
    icon: 'storefront',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Strategy', 'Budget', 'Growth'],
    sections: [
      {
        id: 'startup-launch',
        title: 'Startup Launch',
        description: 'Allocate budget, pick marketing channels, outgrow your competitors',
        duration: '8 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '4',
    title: 'Analytical Reasoning',
    narrativeTitle: 'Pattern Machine',
    narrativeDesc: 'A machine with hidden rules. Press buttons, observe outputs, and figure out how it works. Each level adds complexity. Think like a scientist.',
    description: 'Scientific thinking, hypothesis testing, logical deduction, and learning agility.',
    icon: 'extension',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Logic', 'Discovery', 'Analysis'],
    sections: [
      {
        id: 'pattern-machine',
        title: 'Pattern Machine',
        description: 'Discover hidden rules by experimenting with a mysterious machine',
        duration: '6 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '5',
    title: 'Social Strategy',
    narrativeTitle: 'Negotiation Arena',
    narrativeDesc: 'Face off against an AI opponent in a 12-round pricing battle. Cooperate for mutual gain or undercut for short-term profit. Your strategy reveals how you work with others.',
    description: 'Cooperation, trust, strategic consistency, and competitive instincts.',
    icon: 'handshake',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Negotiation', 'Trust', 'Strategy'],
    sections: [
      {
        id: 'negotiation-arena',
        title: 'Negotiation Arena',
        description: 'Set prices against an AI opponent — cooperate or compete',
        duration: '6 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  }
];
