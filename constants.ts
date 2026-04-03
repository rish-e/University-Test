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
    title: 'Quantitative Reasoning',
    narrativeTitle: 'The Idea Lab',
    narrativeDesc: 'Interpret live business dashboards, crunch numbers, and prove your quantitative firepower under time pressure.',
    description: 'Data interpretation, percentage calculations, ROI, breakeven, and market analysis.',
    icon: 'lightbulb',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Data Analysis', 'Business Math', 'Charts'],
    sections: [
      {
        id: 'quantitative',
        title: 'Data Dash',
        description: 'Interpret live business dashboards and calculate answers under time pressure',
        duration: '20 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '2',
    title: 'Behavioral Assessment',
    narrativeTitle: 'The Arena',
    narrativeDesc: 'Navigate supply chain disasters, manage risk, and chart your innovation path. Every decision shapes your leadership profile.',
    description: 'Decision-making, risk tolerance, resilience, and strategic innovation.',
    icon: 'shield',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Strategy', 'Risk', 'Innovation'],
    sections: [
      {
        id: 'behavioral',
        title: 'Startup Survival',
        description: 'Navigate crises, manage risk, and chart your startup through 3 phases',
        duration: '25 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '3',
    title: 'Technical Skills',
    narrativeTitle: 'The Workshop',
    narrativeDesc: 'Fix broken spreadsheets and write database queries. Show you can build the tools that keep a startup alive.',
    description: 'Hands-on Excel formulas, SQL queries, and technical problem-solving.',
    icon: 'build',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Excel', 'SQL', 'Tools'],
    sections: [
      {
        id: 'technical',
        title: 'Tech Challenge',
        description: 'Fix spreadsheet formulas and write SQL queries in a live environment',
        duration: '25 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '4',
    title: 'Communication',
    narrativeTitle: 'The Pitch Deck',
    narrativeDesc: 'Read client briefs, make strategic decisions, and prove you can communicate under pressure. Every choice has consequences.',
    description: 'Reading comprehension, strategic decisions, and business communication.',
    icon: 'campaign',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Cases', 'Decisions', 'Strategy'],
    sections: [
      {
        id: 'communication',
        title: 'Case Command',
        description: 'Read client briefs and make strategic decisions with branching consequences',
        duration: '20 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '5',
    title: 'Behavioral Intelligence',
    narrativeTitle: 'The Boardroom',
    narrativeDesc: 'Face ethical dilemmas, navigate workplace conflicts, and demonstrate emotional intelligence through high-stakes scenarios.',
    description: 'Emotional intelligence, ethical reasoning, and leadership under pressure.',
    icon: 'meeting_room',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['EQ', 'Ethics', 'Leadership'],
    sections: [
      {
        id: 'eq-scenarios',
        title: 'EQ Scenarios',
        description: 'Navigate ethical dilemmas and workplace conflicts through interactive scenarios',
        duration: '20 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  }
];
