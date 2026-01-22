export enum ModuleStatus {
  Active = 'active',
  Completed = 'completed',
  NotStarted = 'not-started',
  Locked = 'locked'
}

export type AssessmentType = 'quiz' | 'game' | 'writing' | 'video' | 'simulation';

export interface AssessmentProgress {
  step: number;
  correctCount: number;
  textInput: string;
  gameScore: number;
  simState: any;
  userAnswers?: Record<number, number>;
}

export interface ModuleSection {
  id: string;
  title: string;
  description: string;
  duration?: string;
  isCompleted: boolean;
  type: AssessmentType;
  startTime?: number; // Timestamp when the section was started
  score?: number; // 0-100
  analysis?: string; // AI Insight
  userResponse?: any; // Text or choices
  progressState?: AssessmentProgress;
}

export interface AssessmentModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: ModuleStatus;
  progress: number; // 0 to 100
  totalTasks: number;
  completedTasks: number;
  topics: string[];
  sections?: ModuleSection[];
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