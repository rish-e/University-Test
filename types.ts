export enum ModuleStatus {
  Active = 'active',
  Completed = 'completed',
  NotStarted = 'not-started',
  Locked = 'locked'
}

export type AssessmentType = 'quiz' | 'game' | 'writing' | 'video' | 'simulation';

export interface ModuleSection {
  id: string;
  title: string;
  description: string;
  duration?: string;
  isCompleted: boolean;
  type: AssessmentType; // Added type definition
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
}