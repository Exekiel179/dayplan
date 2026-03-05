export interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  x: number; // 0 to 100
  y: number; // 0 to 100
  status: 'pending' | 'completed';
  ai_plan?: string;
  steps: TaskStep[];
  created_at: number;
}
