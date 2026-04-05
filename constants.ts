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
    title: 'Working Memory',
    narrativeTitle: 'Memory Tiles',
    narrativeDesc: 'A grid of tiles lights up in a pattern. Memorize it and recreate it from memory. The patterns get harder each round.',
    description: 'Visual-spatial memory, pattern encoding, and recall under pressure.',
    icon: 'grid_view',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Memory', 'Patterns', 'Focus'],
    sections: [
      {
        id: 'memory-tiles',
        title: 'Memory Tiles',
        description: 'Watch the pattern, then recreate it from memory',
        duration: '5 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '2',
    title: 'Risk Assessment',
    narrativeTitle: 'Balloon Pump',
    narrativeDesc: 'Pump a balloon to earn money. The more you pump, the more you earn — but push too far and it pops. Bank your earnings before it bursts.',
    description: 'Risk tolerance, impulse control, and learning from patterns.',
    icon: 'bubble_chart',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Risk', 'Decision', 'Control'],
    sections: [
      {
        id: 'balloon-pump',
        title: 'Balloon Pump',
        description: 'Pump to earn, bank before it pops',
        duration: '5 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '3',
    title: 'Cognitive Flexibility',
    narrativeTitle: 'Color Switch',
    narrativeDesc: 'Sort shapes by one rule — then the rules change mid-round. Adapt quickly or fall behind. Speed and accuracy both count.',
    description: 'Task switching, impulse control, processing speed, and adaptability.',
    icon: 'swap_horiz',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Speed', 'Flexibility', 'Focus'],
    sections: [
      {
        id: 'color-switch',
        title: 'Color Switch',
        description: 'Sort shapes fast — but the rules keep changing',
        duration: '5 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  },
  {
    id: '4',
    title: 'Analytical Reasoning',
    narrativeTitle: 'Pattern Machine',
    narrativeDesc: 'A machine with hidden rules. Press buttons, observe outputs, and figure out how it works. Each level adds complexity.',
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
    narrativeTitle: 'Trust Exchange',
    narrativeDesc: 'You and a partner take turns sharing money. Send more and it multiplies — but will they share back? Your choices reveal how you build trust.',
    description: 'Trust, fairness, cooperation, reciprocity, and social decision-making.',
    icon: 'handshake',
    status: ModuleStatus.Active,
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    topics: ['Trust', 'Fairness', 'Strategy'],
    sections: [
      {
        id: 'trust-exchange',
        title: 'Trust Exchange',
        description: 'Share money with a partner — will they share back?',
        duration: '5 min',
        isCompleted: false,
        type: 'game'
      }
    ]
  }
];
