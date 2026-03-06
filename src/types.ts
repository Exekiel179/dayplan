export interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
}

export type TaskTimeline = 'temporary' | 'long_term';
export type LongTermCadence = 'daily' | 'weekly' | 'interval';

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
  deadline_at?: number | null;
  use_countdown_urgency?: boolean;
  long_term_cadence?: LongTermCadence;
  long_term_interval_days?: number;
  last_completed_at?: number | null;
  next_due_at?: number | null;
  archived_at?: number | null;
  completion_count?: number;
  ability_gains?: Record<string, number>;
  ai_plan?: string;
  steps: TaskStep[];
  created_at: number;
}

export interface UserTaskData {
  tasks: Task[];
  ability_dimensions: string[];
}
