export interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
}

export type TaskTimeline = 'temporary' | 'long_term';
export type LongTermCadence = 'daily' | 'weekly' | 'interval';
export type TaskCognitiveLoad = 'low' | 'high';
export type TaskCollaborationLevel = 'low' | 'high';

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
  stress_score?: number;
  energy_delta?: number;
  cognitive_load?: TaskCognitiveLoad;
  collaboration_level?: TaskCollaborationLevel;
  tracking_started_at?: number | null;
  tracking_accumulated_ms?: number;
  ai_plan?: string;
  steps: TaskStep[];
  created_at: number;
}

export interface DailyEnergyCheckin {
  initial_energy: number;
  updated_at: number;
}

export interface DailyRestSession {
  is_resting: boolean;
  started_at: number | null;
  recovered_energy: number;
  updated_at: number;
}

export interface WellbeingSettings {
  daily_checkins: Record<string, DailyEnergyCheckin>;
  daily_rest_sessions: Record<string, DailyRestSession>;
}

export interface UserTaskData {
  tasks: Task[];
  ability_dimensions: string[];
  wellbeing: WellbeingSettings;
}
