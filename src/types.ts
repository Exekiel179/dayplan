export interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
}

export type TaskTimeline = 'temporary' | 'long_term';

export interface Task {
  id: string;
  title: string;
  description: string;
  x: number; // 0 to 100
  y: number; // 0 to 100
  status: 'pending' | 'completed';
  timeline: TaskTimeline;
  dependency_ids: string[];
  estimated_minutes: number;
  actual_minutes: number;
  ai_plan?: string;
  steps: TaskStep[];
  created_at: number;
}
