export interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
}

export type TaskTimeline = 'temporary' | 'long_term';
export type LongTermCadence = 'daily' | 'weekly' | 'interval';
export type TaskCognitiveLoad = 'low' | 'high';
export type TaskCollaborationLevel = 'low' | 'high';
export type TaskExecutionMode = 'serial' | 'parallel';
export type TaskCategoryKey = 'research' | 'development' | 'learning' | 'misc';
export type TaskEffortScore = 1 | 2 | 3 | 4 | 5;

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
  effort_score?: TaskEffortScore;
  cognitive_load?: TaskCognitiveLoad;
  collaboration_level?: TaskCollaborationLevel;
  execution_mode?: TaskExecutionMode;
  category_key?: TaskCategoryKey;
  line_order?: number;
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

export interface DailyStateReport {
  self_rating: number;
  sleep_hours: number;
  updated_at: number;
}

export interface ExternalBehaviorEvent {
  id: string;
  type: string;
  label: string;
  message: string;
  instant_energy: number;
  energy_boost_per_hour: number;
  burn_rate_multiplier: number;
  duration_minutes: number;
  started_at: number;
  updated_at: number;
}

export interface WellbeingChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  created_at: number;
  behavior_event_id?: string | null;
}

export interface WellbeingSettings {
  daily_checkins: Record<string, DailyEnergyCheckin>;
  daily_rest_sessions: Record<string, DailyRestSession>;
  daily_state_reports: Record<string, DailyStateReport>;
  daily_behavior_events: Record<string, ExternalBehaviorEvent[]>;
  daily_chat_messages: Record<string, WellbeingChatMessage[]>;
}

export interface AbilityModuleSettings {
  active_module_id: string;
  special_totals: Record<string, number>;
  tracked_ms_baseline: number;
  updated_at: number;
}

export interface AIDayTaskDraft {
  title: string;
  description: string;
  estimated_minutes: number;
  energy_delta: number;
  stress_score: number;
  effort_score?: TaskEffortScore;
  cognitive_load: TaskCognitiveLoad;
  collaboration_level: TaskCollaborationLevel;
  category_key: TaskCategoryKey;
  timeline: TaskTimeline;
}

export interface AIDayPlanWorkspace {
  input: string;
  summary: string;
  core_focus: string;
  schedule_markdown: string;
  tasks: AIDayTaskDraft[];
  updated_at: number;
}

export interface FocusReminderSettings {
  enabled: boolean;
  desktop_notifications: boolean;
  interval_minutes: number;
  last_notified_at: number | null;
}

export interface UserTaskData {
  tasks: Task[];
  ability_dimensions: string[];
  wellbeing: WellbeingSettings;
  ability_module: AbilityModuleSettings;
  ai_day_plan?: AIDayPlanWorkspace;
  focus_reminders?: FocusReminderSettings;
  calendar_subscription_token?: string;
}

export interface AuthResult {
  token: string;
  username: string;
  isAdmin: boolean;
}

export interface SessionValidationResult {
  username: string;
  isAdmin: boolean;
}

export interface AdminPasswordResetResult {
  ok: boolean;
  username: string;
  message: string;
}
