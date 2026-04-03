export enum ModuleStatus {
  Active = 'active',
  Completed = 'completed',
  NotStarted = 'not-started',
  Locked = 'locked'
}

export type AssessmentType = 'game' | 'writing' | 'video' | 'simulation';

export interface AssessmentProgress {
  step: number;
  correctCount: number;
  textInput: string;
  gameScore: number;
  simState: any;
  userAnswers?: Record<number, number>;
  streakBest?: number;
  xpEarned?: number;
}

export interface ModuleSection {
  id: string;
  title: string;
  description: string;
  duration?: string;
  isCompleted: boolean;
  type: AssessmentType;
  startTime?: number;
  score?: number; // 0-100
  analysis?: string; // AI Insight
  userResponse?: any;
  progressState?: AssessmentProgress;
}

export interface AssessmentModule {
  id: string;
  title: string;
  description: string;
  narrativeTitle: string; // e.g. "The Idea Lab"
  narrativeDesc: string;  // narrative briefing text
  icon: string;
  status: ModuleStatus;
  progress: number; // 0 to 100
  totalTasks: number;
  completedTasks: number;
  topics: string[];
  sections?: ModuleSection[];
  xpEarned?: number;
  starRating?: number; // 0-3
}

export interface UserProfile {
  name: string;
  id: string;
  term: string;
  avatarUrl: string;
  totalCompletion: number;
  dailyProgress: number;
  metrics: {
    cognitive: number;
    technical: number;
    behavioral: number;
    communication: number;
    leadership: number;
  };
}

// --- GAME RESULT ---
export interface GameResult {
  score: number;        // 0-100 normalized
  rawScore: number;     // game-specific raw value
  timeSpent: number;    // seconds
  metrics: Record<string, number>;
  type: string;
  data?: any;
}

// --- XP & LEVELING ---
export interface PlayerLevel {
  level: number;
  title: string;
  currentXP: number;
  xpForNextLevel: number;
  totalXP: number;
}

export interface XPEvent {
  id: string;
  amount: number;
  source: string;
  timestamp: number;
  sectionId: string;
}

// --- STREAKS ---
export interface StreakState {
  current: number;
  best: number;
  multiplier: number;
  isOnFire: boolean;
}

// --- META PROGRESS ---
export interface MetaProgress {
  player: PlayerLevel;
  xpHistory: XPEvent[];
  streak: StreakState;
  completedGames: string[];
  notifications: GameNotification[];
}

export interface GameNotification {
  id: string;
  type: 'xp_gain' | 'level_up' | 'streak' | 'complete' | 'speed_bonus';
  message: string;
  amount?: number;
  timestamp: number;
}

// --- GAME COMPONENT PROPS (shared interface for all games) ---
export interface GameComponentProps {
  section: ModuleSection;
  onComplete: (result: GameResult) => void;
  onExit: (progress?: AssessmentProgress) => void;
  onXPGain: (amount: number, source: string) => void;
}