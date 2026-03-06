import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  X,
  CheckCircle2,
  Circle,
  GripVertical,
  Sparkles,
  ChevronRight,
  ListTodo,
  LayoutGrid,
  Trash2,
  Save,
  Loader2,
  MousePointer2,
  Info,
  LogOut,
  Clock3,
  Link2
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LongTermCadence, Task, TaskStep, TaskTimeline, UserTaskData } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AUTH_TOKEN_KEY = 'dayplan_auth_token';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toSafeTimestamp(value: unknown): number | null {
  const ts = Number(value);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return ts;
}

function normalizeLongTermCadence(value: unknown): LongTermCadence {
  if (value === 'weekly' || value === 'interval') return value;
  return 'daily';
}

function normalizeAbilityGains(value: unknown) {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, amount]) => {
    const name = key.trim();
    if (!name) return acc;
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) return acc;
    acc[name] = Math.floor(numeric);
    return acc;
  }, {});
}

function normalizeTask(rawTask: Task): Task {
  const partial = rawTask as Partial<Task>;
  const dependencyIds = Array.isArray(partial.dependency_ids)
    ? partial.dependency_ids.filter((id): id is string => typeof id === 'string')
    : [];

  const timeline = partial.timeline === 'long_term' ? 'long_term' : 'temporary';
  const estimatedMinutes = Number(partial.estimated_minutes ?? 60);
  const actualMinutes = Number(partial.actual_minutes ?? 0);
  const stepList = Array.isArray(partial.steps)
    ? partial.steps.map((step, idx) => {
        const rawStep = step as Partial<TaskStep>;
        return {
          id: typeof rawStep?.id === 'string' && rawStep.id.trim() ? rawStep.id : `step-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          text: typeof rawStep?.text === 'string' ? rawStep.text : '',
          completed: Boolean(rawStep?.completed),
        };
      })
    : [];
  const status = partial.status === 'completed' ? 'completed' : 'pending';
  const completionCountRaw = Number(partial.completion_count ?? (status === 'completed' ? 1 : 0));
  const completionCount = Number.isFinite(completionCountRaw) ? Math.max(0, Math.floor(completionCountRaw)) : 0;
  const longTermInterval = Number(partial.long_term_interval_days ?? 3);
  const normalizedLongTermInterval = Number.isFinite(longTermInterval) ? clamp(Math.round(longTermInterval), 2, 365) : 3;

  return {
    ...(partial as Task),
    id: typeof partial.id === 'string' ? partial.id : Math.random().toString(36).slice(2, 11),
    title: typeof partial.title === 'string' ? partial.title : '',
    description: typeof partial.description === 'string' ? partial.description : '',
    x: Number.isFinite(Number(partial.x)) ? clamp(Number(partial.x), 0, 100) : 50,
    y: Number.isFinite(Number(partial.y)) ? clamp(Number(partial.y), 0, 100) : 50,
    status,
    timeline,
    dependency_ids: dependencyIds,
    estimated_minutes: Number.isFinite(estimatedMinutes) ? Math.max(0, estimatedMinutes) : 60,
    actual_minutes: Number.isFinite(actualMinutes) ? Math.max(0, actualMinutes) : 0,
    deadline_at: toSafeTimestamp(partial.deadline_at),
    use_countdown_urgency: Boolean(partial.use_countdown_urgency),
    long_term_cadence: normalizeLongTermCadence(partial.long_term_cadence),
    long_term_interval_days: normalizedLongTermInterval,
    last_completed_at: toSafeTimestamp(partial.last_completed_at),
    next_due_at: toSafeTimestamp(partial.next_due_at),
    archived_at: toSafeTimestamp(partial.archived_at),
    completion_count: completionCount,
    ability_gains: normalizeAbilityGains(partial.ability_gains),
    ai_plan: typeof partial.ai_plan === 'string' ? partial.ai_plan : '',
    steps: stepList,
    created_at: Number.isFinite(Number(partial.created_at)) ? Number(partial.created_at) : Date.now(),
  };
}

function collectAbilityDimensions(tasks: Task[]) {
  const result = new Set<string>();
  tasks.forEach((task) => {
    Object.keys(task.ability_gains || {}).forEach((name) => {
      if (name.trim()) result.add(name.trim());
    });
  });
  return [...result];
}

function normalizeTaskPayload(payload: unknown): UserTaskData {
  if (Array.isArray(payload)) {
    const tasks = payload.map((task) => normalizeTask(task as Task));
    return {
      tasks,
      ability_dimensions: collectAbilityDimensions(tasks),
    };
  }
  if (payload && typeof payload === 'object') {
    const raw = payload as Partial<UserTaskData>;
    const tasks = Array.isArray(raw.tasks)
      ? raw.tasks.map((task) => normalizeTask(task as Task))
      : [];
    const baseDimensions = Array.isArray(raw.ability_dimensions)
      ? raw.ability_dimensions
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim())
        .filter(Boolean)
      : [];
    const merged = new Set([...baseDimensions, ...collectAbilityDimensions(tasks)]);
    return {
      tasks,
      ability_dimensions: [...merged],
    };
  }
  return { tasks: [], ability_dimensions: [] };
}

function formatDateTime(ts?: number | null) {
  if (!ts) return '未设置';
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function toDateTimeLocalValue(ts?: number | null) {
  if (!ts) return '';
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function parseDateTimeLocalValue(value: string) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return null;
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function getCountdownText(deadlineAt: number, now: number) {
  const diffMs = deadlineAt - now;
  const absMs = Math.abs(diffMs);
  const totalHours = Math.floor(absMs / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const prefix = diffMs >= 0 ? '剩余' : '超时';
  if (days > 0) return `${prefix} ${days}天${String(hours).padStart(2, '0')}小时`;
  return `${prefix} ${String(hours).padStart(2, '0')}小时`;
}

function getLongTermCycleMs(task: Task) {
  if (task.long_term_cadence === 'weekly') return 7 * 24 * 3600000;
  if (task.long_term_cadence === 'interval') {
    const days = clamp(Math.round(task.long_term_interval_days || 3), 2, 365);
    return days * 24 * 3600000;
  }
  return 24 * 3600000;
}

function getTaskRenderY(task: Task, now: number) {
  if (task.timeline !== 'temporary' || !task.use_countdown_urgency || !task.deadline_at) return task.y;
  const remaining = task.deadline_at - now;
  if (remaining <= 0) return 2;
  const maxWindowMs = 72 * 3600000;
  const urgencyRatio = 1 - Math.min(1, remaining / maxWindowMs);
  const minY = 4;
  return clamp(task.y - (task.y - minY) * urgencyRatio, minY, 100);
}

function isLongTermDue(task: Task, now: number) {
  if (task.timeline !== 'long_term') return true;
  if (!task.next_due_at) return true;
  return task.next_due_at <= now;
}

function getTimelineAccent(timeline: TaskTimeline) {
  return timeline === 'long_term'
    ? {
        badge: 'text-cyan-200 bg-cyan-500/20 border-cyan-400/40',
        ring: 'border-cyan-300/60',
      }
    : {
        badge: 'text-amber-200 bg-amber-500/20 border-amber-400/40',
        ring: 'border-amber-300/60',
      };
}

function getDimensionColor(task: Task) {
  const importance = task.x;
  const urgency = 100 - task.y;
  const intensity = Math.max(0, Math.min(1, (importance + urgency) / 200));
  const lightness = 68 - intensity * 20;

  if (importance >= 60 && urgency >= 60) return `hsl(350 86% ${lightness}%)`;
  if (importance >= 60 && urgency < 60) return `hsl(155 72% ${lightness}%)`;
  if (importance < 60 && urgency >= 60) return `hsl(38 90% ${lightness}%)`;
  return `hsl(200 85% ${lightness}%)`;
}

function withAuthHeaders(token: string, headers: Record<string, string> = {}) {
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

async function requestAIPlan(task: Task, token: string) {
  const response = await fetch('/api/ai/plan', {
    method: 'POST',
    headers: withAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      title: task.title,
      description: task.description || '',
    })
  });

  const payload = await response.json().catch(() => ({} as { error?: string; plan?: string; steps?: string[] }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(payload?.error || `AI 请求失败 (${response.status})`);
  }

  const steps = Array.isArray(payload?.steps)
    ? payload.steps.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];

  return {
    plan: typeof payload?.plan === 'string' ? payload.plan : '',
    steps,
  };
}

async function loadTasksFromApi(token: string) {
  const response = await fetch('/api/tasks', {
    cache: 'no-store',
    headers: withAuthHeaders(token),
  });
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(`load tasks failed: ${response.status}`);
  }
  const data = await response.json();
  return normalizeTaskPayload(data);
}

async function persistTasksToApi(payload: UserTaskData, token: string) {
  const response = await fetch('/api/tasks', {
    method: 'PUT',
    headers: withAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(`persist tasks failed: ${response.status}`);
  }
}

async function loginByPassword(username: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json().catch(() => ({} as { error?: string; token?: string; username?: string }));
  if (!response.ok) {
    throw new Error(payload?.error || '登录失败');
  }
  if (!payload?.token) {
    throw new Error('登录失败：未返回 token');
  }
  return {
    token: payload.token,
    username: payload.username || username,
  };
}

async function registerByPassword(username: string, password: string) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json().catch(() => ({} as { error?: string; token?: string; username?: string }));
  if (!response.ok) {
    throw new Error(payload?.error || '注册失败');
  }
  if (!payload?.token) {
    throw new Error('注册失败：未返回 token');
  }
  return {
    token: payload.token,
    username: payload.username || username,
  };
}

async function validateSession(token: string) {
  const response = await fetch('/api/auth/session', {
    headers: withAuthHeaders(token),
  });
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(`session check failed: ${response.status}`);
  }
  const payload = await response.json().catch(() => ({} as { username?: string }));
  return {
    username: payload?.username || '',
  };
}

export default function App() {
  const [authToken, setAuthToken] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) || '' : ''));
  const [authUser, setAuthUser] = useState('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [abilityDimensions, setAbilityDimensions] = useState<string[]>([]);
  const [newAbilityDimension, setNewAbilityDimension] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [isSideNavOpen, setIsSideNavOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  const [sideNavWidth, setSideNavWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  const [aiError, setAiError] = useState('');
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());

  const quadrantRef = useRef<HTMLDivElement>(null);
  const hasHydratedRef = useRef(false);

  const clearAuth = () => {
    setAuthToken('');
    setAuthUser('');
    setTasks([]);
    setAbilityDimensions([]);
    setSelectedTask(null);
    setIsLoadingTasks(false);
    setStorageError('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  };

  const activeTasks = tasks.filter((task) => task.status === 'pending');
  const archivedTasks = tasks.filter((task) => task.status === 'completed');
  const longTermTasks = activeTasks.filter((task) => task.timeline === 'long_term');
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const isDependencySatisfied = (dependencyTask?: Task) => {
    if (!dependencyTask) return false;
    if (dependencyTask.status === 'completed') return true;
    return dependencyTask.timeline === 'long_term' && Boolean(dependencyTask.last_completed_at);
  };

  const isTaskReady = (task: Task) =>
    task.dependency_ids.length === 0
    || task.dependency_ids.every((id) => isDependencySatisfied(taskById.get(id)));

  const sortedTasks = [...activeTasks].sort((a, b) => {
    const impA = a.x;
    const impB = b.x;
    if (impB !== impA) return impB - impA;

    const urgA = 100 - getTaskRenderY(a, nowTs);
    const urgB = 100 - getTaskRenderY(b, nowTs);
    return (impB * urgB) - (impA * urgA);
  });

  const executableTasks = activeTasks.filter((task) => isTaskReady(task) && isLongTermDue(task, nowTs));
  const blockedTasks = activeTasks.filter((task) => !isTaskReady(task) || !isLongTermDue(task, nowTs));

  const totalEstimatedMinutes = activeTasks.reduce((sum, task) => sum + task.estimated_minutes, 0);
  const totalActualMinutes = activeTasks.reduce((sum, task) => sum + task.actual_minutes, 0);

  const abilityScores = abilityDimensions.reduce<Record<string, number>>((acc, dim) => {
    acc[dim] = 0;
    return acc;
  }, {});
  tasks.forEach((task) => {
    const gains = task.ability_gains || {};
    const completionTimes = Math.max(0, task.completion_count || 0);
    Object.entries(gains).forEach(([dim, gain]) => {
      if (!(dim in abilityScores)) {
        abilityScores[dim] = 0;
      }
      abilityScores[dim] += completionTimes * Math.max(0, Math.floor(gain));
    });
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Track mouse for placement mode
  useEffect(() => {
    if (!isPlacementMode) {
      setMousePos(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!quadrantRef.current) return;
      const rect = quadrantRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPlacementMode]);

  // Drag to resize sidebar
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(Math.max(e.clientX, 240), 600);
      setSideNavWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Validate auth session
  useEffect(() => {
    let canceled = false;

    if (!authToken) {
      setIsAuthChecking(false);
      return;
    }

    setIsAuthChecking(true);
    validateSession(authToken)
      .then((session) => {
        if (canceled) return;
        setAuthUser(session.username);
      })
      .catch((e) => {
        if (canceled) return;
        console.error("Session validation failed", e);
        clearAuth();
      })
      .finally(() => {
        if (canceled) return;
        setIsAuthChecking(false);
      });

    return () => {
      canceled = true;
    };
  }, [authToken]);

  // Load tasks from disk-backed API
  useEffect(() => {
    let canceled = false;
    if (isAuthChecking || !authToken) {
      setIsLoadingTasks(false);
      return;
    }

    setIsLoadingTasks(true);
    loadTasksFromApi(authToken)
      .then((loadedData) => {
        if (canceled) return;
        setTasks(loadedData.tasks);
        setAbilityDimensions(loadedData.ability_dimensions);
        setStorageError('');
      })
      .catch((e) => {
        if (canceled) return;
        console.error("Failed to load tasks", e);
        if (e instanceof Error && e.message === 'UNAUTHORIZED') {
          clearAuth();
          setLoginError('登录已过期，请重新登录。');
          return;
        }
        setStorageError('任务加载失败，暂时显示为空。');
      })
      .finally(() => {
        if (canceled) return;
        setIsLoadingTasks(false);
      });

    return () => {
      canceled = true;
    };
  }, [authToken, isAuthChecking]);

  // Persist tasks with debounce (avoid writing on every drag frame)
  useEffect(() => {
    if (!authToken) return;
    if (isLoadingTasks) return;
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      persistTasksToApi({
        tasks,
        ability_dimensions: abilityDimensions,
      }, authToken)
        .then(() => setStorageError(''))
        .catch((e) => {
          console.error("Failed to persist tasks", e);
          if (e instanceof Error && e.message === 'UNAUTHORIZED') {
            clearAuth();
            setLoginError('登录已过期，请重新登录。');
            return;
          }
          setStorageError('任务保存失败，请稍后重试。');
        });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [tasks, abilityDimensions, isLoadingTasks, authToken]);

  const handleAddTask = () => {
    setIsPlacementMode(true);
  };

  const handleQuadrantClick = (e: React.MouseEvent) => {
    if (!isPlacementMode || !quadrantRef.current) return;

    const rect = quadrantRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      description: '',
      x,
      y,
      status: 'pending',
      timeline: 'temporary',
      dependency_ids: [],
      estimated_minutes: 60,
      actual_minutes: 0,
      deadline_at: null,
      use_countdown_urgency: false,
      long_term_cadence: 'daily',
      long_term_interval_days: 3,
      last_completed_at: null,
      next_due_at: null,
      archived_at: null,
      completion_count: 0,
      ability_gains: {},
      steps: [],
      created_at: Date.now()
    };

    setSelectedTask(newTask);
    setIsPlacementMode(false);
  };

  const saveTask = (task: Task) => {
    const normalizedTask = normalizeTask(task);
    const cleanedDependencyIds = normalizedTask.dependency_ids
      .filter((id) => id !== normalizedTask.id)
      .filter((id, index, arr) => arr.indexOf(id) === index);
    const shouldArchive = normalizedTask.timeline === 'temporary' && normalizedTask.status === 'completed';
    const finalTask = {
      ...normalizedTask,
      dependency_ids: cleanedDependencyIds,
      status: normalizedTask.timeline === 'long_term' ? 'pending' : normalizedTask.status,
      next_due_at: normalizedTask.timeline === 'long_term'
        ? (normalizedTask.next_due_at || Date.now())
        : null,
      archived_at: shouldArchive ? (normalizedTask.archived_at || Date.now()) : null,
      completion_count: Math.max(0, normalizedTask.completion_count || 0),
    };
    setTasks(prev => {
      const exists = prev.find(t => t.id === finalTask.id);
      if (exists) {
        return prev.map(t => t.id === finalTask.id ? finalTask : t);
      }
      return [...prev, finalTask];
    });
  };

  const deleteTask = (id: string, options: { allowLongTerm?: boolean } = {}) => {
    setTasks((prev) => {
      const target = prev.find((task) => task.id === id);
      if (!target) return prev;
      if (target.timeline === 'long_term' && !options.allowLongTerm) {
        return prev;
      }
      return prev
        .filter((task) => task.id !== id)
        .map((task) => ({
          ...task,
          dependency_ids: task.dependency_ids.filter((depId) => depId !== id),
        }));
    });
    setSelectedTask((prev) => (prev?.id === id ? null : prev));
  };

  const restoreArchivedTask = (id: string) => {
    setTasks((prev) => prev.map((task) => {
      if (task.id !== id) return task;
      return {
        ...task,
        status: 'pending',
        archived_at: null,
      };
    }));
  };

  const addAbilityDimension = () => {
    const name = newAbilityDimension.trim();
    if (!name) return;
    if (abilityDimensions.includes(name)) {
      setNewAbilityDimension('');
      return;
    }
    setAbilityDimensions((prev) => [...prev, name]);
    setNewAbilityDimension('');
  };

  const removeAbilityDimension = (name: string) => {
    setAbilityDimensions((prev) => prev.filter((item) => item !== name));
    setTasks((prev) => prev.map((task) => {
      const nextGains = { ...(task.ability_gains || {}) };
      delete nextGains[name];
      return { ...task, ability_gains: nextGains };
    }));
    setSelectedTask((prev) => {
      if (!prev) return prev;
      const nextGains = { ...(prev.ability_gains || {}) };
      delete nextGains[name];
      return { ...prev, ability_gains: nextGains };
    });
  };

  const updateSelectedTaskAbilityGain = (dimension: string, value: number) => {
    if (!selectedTask) return;
    const sanitizedValue = Math.max(0, Math.floor(value || 0));
    const nextGains = { ...(selectedTask.ability_gains || {}) };
    if (sanitizedValue <= 0) {
      delete nextGains[dimension];
    } else {
      nextGains[dimension] = sanitizedValue;
    }
    setSelectedTask({ ...selectedTask, ability_gains: nextGains });
  };

  const moveSelectedStep = (fromIdx: number, toIdx: number) => {
    if (!selectedTask) return;
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    if (fromIdx >= selectedTask.steps.length || toIdx >= selectedTask.steps.length) return;
    const reordered = [...selectedTask.steps];
    const [moving] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moving);
    setSelectedTask({
      ...selectedTask,
      steps: reordered,
    });
  };

  const completeTask = (task: Task) => {
    const now = Date.now();
    setTasks((prev) => prev.map((item) => {
      if (item.id !== task.id) return item;
      const mergedTask = normalizeTask({ ...item, ...task });

      if (mergedTask.timeline === 'long_term') {
        const nextDueAt = now + getLongTermCycleMs(mergedTask);
        return {
          ...mergedTask,
          status: 'pending',
          archived_at: null,
          completion_count: (mergedTask.completion_count || 0) + 1,
          last_completed_at: now,
          next_due_at: nextDueAt,
          steps: mergedTask.steps.map((step) => ({ ...step, completed: false })),
        };
      }
      return {
        ...mergedTask,
        status: 'completed',
        archived_at: now,
        last_completed_at: now,
        completion_count: Math.max(1, (mergedTask.completion_count || 0) + 1),
      };
    }));
    setSelectedTask(null);
  };

  const generateAIPlan = async (task: Task) => {
    if (!task.title) return;
    setAiError('');
    setIsGeneratingPlan(true);
    try {
      const result = await requestAIPlan(task, authToken);
      const stepList = result.steps.length > 0 ? result.steps : ['拆解目标范围', '准备关键资源', '执行核心任务', '复盘并优化'];
      const newSteps: TaskStep[] = stepList.map((s: string) => ({
        id: Math.random().toString(36).substr(2, 9),
        text: s,
        completed: false
      }));

      const updatedTask = {
        ...task,
        ai_plan: result.plan || '### 执行建议\n请按以下步骤推进，并在每个步骤完成后更新进度。',
        steps: newSteps
      };

      setSelectedTask(updatedTask);
      saveTask(updatedTask);
    } catch (err) {
      console.error("AI generation failed", err);
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        clearAuth();
        setLoginError('登录已过期，请重新登录。');
        return;
      }
      setAiError(err instanceof Error ? err.message : 'AI 生成失败，请稍后重试。');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const updateTaskPosition = (id: string, x: number, y: number) => {
    setTasks(prev => prev.map((task) => {
      if (task.id !== id) return task;
      return {
        ...task,
        x,
        y,
      };
    }));
  };

  const toggleDependency = (task: Task, dependencyId: string) => {
    const exists = task.dependency_ids.includes(dependencyId);
    const dependencyIds = exists
      ? task.dependency_ids.filter((id) => id !== dependencyId)
      : [...task.dependency_ids, dependencyId];
    setSelectedTask({
      ...task,
      dependency_ids: dependencyIds,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('请输入账号和密码');
      return;
    }
    if (authMode === 'register' && loginPassword !== registerConfirmPassword) {
      setLoginError('两次输入的密码不一致');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');
    try {
      const result = authMode === 'register'
        ? await registerByPassword(loginUsername.trim(), loginPassword)
        : await loginByPassword(loginUsername.trim(), loginPassword);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_TOKEN_KEY, result.token);
      }
      setAuthToken(result.token);
      setAuthUser(result.username);
      setLoginPassword('');
      setRegisterConfirmPassword('');
      setAuthMode('login');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const selectedTaskReady = selectedTask ? isTaskReady(selectedTask) : false;
  const selectedTaskIsPersisted = selectedTask ? tasks.some((task) => task.id === selectedTask.id) : false;

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-slate-100 flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-300">正在验证登录状态...</div>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-slate-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-slate-600/70 bg-slate-900 px-6 py-7 shadow-2xl"
        >
          <h1 className="text-xl font-bold text-white">{authMode === 'register' ? '注册账号' : '账号登录'}</h1>
          <p className="mt-2 text-xs text-slate-400">
            {authMode === 'register' ? '注册成功后将自动登录。' : '登录后可访问任务矩阵。'}
          </p>
          <div className="mt-6 space-y-3">
            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="用户名"
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="密码"
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            {authMode === 'register' && (
              <input
                type="password"
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                placeholder="确认密码"
                className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
            )}
          </div>
          {loginError && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200">
              {loginError}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-5 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingIn ? (authMode === 'register' ? '注册中...' : '登录中...') : (authMode === 'register' ? '注册并登录' : '登录')}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
              setLoginError('');
              setLoginPassword('');
              setRegisterConfirmPassword('');
            }}
            className="mt-3 w-full text-xs font-semibold text-slate-400 transition-colors hover:text-slate-200"
          >
            {authMode === 'register' ? '已有账号，去登录' : '没有账号？注册一个'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen flex flex-col overflow-hidden bg-[#0b1220] text-slate-100 font-sans selection:bg-teal-500/30">

      {/* Header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.08] glass-panel px-4 sm:px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-300/20 bg-slate-900 px-3 py-2 shadow-[0_10px_30px_rgba(2,6,23,0.45)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
            <LayoutGrid className="text-white w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="leading-none">
            <h1 className="text-lg font-bold tracking-tight text-cyan-100 sm:text-xl">
              Task Axis Planner
            </h1>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/80">Importance x Urgency</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden text-xs font-semibold text-slate-300 sm:block">用户：{authUser || loginUsername}</span>
          <button
            onClick={clearAuth}
            className="rounded-xl border border-white/15 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            title="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsTaskListOpen(true)}
            className="relative rounded-xl p-2.5 transition-all hover:bg-white/5 active:scale-95 group border border-transparent hover:border-white/10"
          >
            <ListTodo className="h-5 w-5 text-slate-300 group-hover:text-teal-400 transition-colors" />
            {(activeTasks.length + archivedTasks.length) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(20,184,166,0.5)]">
                {activeTasks.length + archivedTasks.length}
              </span>
            )}
          </button>
          <button
            onClick={handleAddTask}
            disabled={isPlacementMode}
            className={cn(
              "group relative overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:flex sm:items-center sm:gap-2 sm:px-5",
              isPlacementMode
                ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                : "bg-white/10 text-white hover:bg-white/20 active:scale-95 border border-white/10"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <Plus className="h-4 w-4 hidden sm:block transition-transform group-hover:rotate-90" />
            <span>新建任务</span>
          </button>
        </div>
      </header>

      {(isLoadingTasks || storageError) && (
        <div className={cn(
          "z-20 px-4 py-2 text-xs font-semibold sm:px-6",
          storageError ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
        )}>
          {storageError || '正在加载任务...'}
        </div>
      )}

      <div className="z-10 grid grid-cols-2 gap-2 border-b border-white/[0.08] bg-slate-900 px-4 py-2 text-xs sm:grid-cols-5 sm:px-6">
        <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-cyan-100">
          可执行任务: <span className="font-bold">{executableTasks.length}</span>
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-amber-100">
          阻塞任务: <span className="font-bold">{blockedTasks.length}</span>
        </div>
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-emerald-100">
          预估用时: <span className="font-bold">{totalEstimatedMinutes}m</span>
        </div>
        <div className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-violet-100">
          实际用时: <span className="font-bold">{totalActualMinutes}m</span>
        </div>
        <div className="rounded-lg border border-slate-300/30 bg-slate-500/10 px-3 py-2 text-slate-100">
          已归档: <span className="font-bold">{archivedTasks.length}</span>
        </div>
      </div>

      <main className="relative flex flex-1 overflow-hidden">
        {/* Left Collapsible Sidebar */}
        <motion.div
          animate={{ width: isSideNavOpen ? sideNavWidth : 0 }}
          className="absolute inset-y-0 left-0 z-10 flex flex-col border-r border-white/[0.05] glass-panel lg:relative shrink-0 overflow-hidden"
        >
          {/* Resize Handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-teal-500/20 transition-colors z-20 group",
              isResizing ? "bg-teal-500/40" : ""
            )}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="p-6 border-b border-white/[0.05] flex items-center justify-between shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ListTodo className="w-4 h-4 opacity-70" />
              任务目录
            </h2>
            <button
              onClick={() => setIsSideNavOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">执行列表</h3>
                <span className="text-[10px] font-semibold text-cyan-200">{executableTasks.length}</span>
              </div>
              {executableTasks.length === 0 ? (
                <p className="text-[11px] text-cyan-100/70">暂无可执行任务（等待前置任务完成）。</p>
              ) : (
                <div className="space-y-1.5">
                  {executableTasks.slice(0, 5).map((task) => (
                    <button
                      key={`ready-${task.id}`}
                      onClick={() => setSelectedTask(task)}
                      className="w-full rounded-lg border border-cyan-300/20 bg-slate-900/50 px-2 py-1.5 text-left text-[11px] font-semibold text-cyan-50 transition-colors hover:bg-slate-800/80"
                    >
                      {task.title || '未命名任务'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {sortedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                <ListTodo className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-xs font-medium uppercase tracking-widest">暂无进行中的任务</p>
              </div>
            ) : (
              sortedTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden",
                    selectedTask?.id === task.id
                      ? "bg-teal-500/10 border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                      : "bg-white/[0.02] border-white/[0.05] hover:border-white/20 hover:bg-white/[0.05]"
                  )}
                >
                  {/* Subtle hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative flex items-start justify-between gap-3">
                    <h3 className={cn(
                      "font-semibold text-sm leading-snug line-clamp-2 transition-colors",
                      selectedTask?.id === task.id ? "text-teal-50" : "text-slate-200 group-hover:text-white"
                    )}>
                      {task.title || '未命名任务'}
                    </h3>
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-[0_0_10px_currentColor]"
                      style={{ color: getDimensionColor(task), backgroundColor: getDimensionColor(task) }}
                    />
                  </div>
                  <div className="relative mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_currentColor]",
                            selectedTask?.id === task.id ? "bg-teal-400 text-teal-400" : "bg-slate-400 text-slate-400"
                          )}
                          style={{ width: `${task.steps.length > 0 ? (task.steps.filter(s => s.completed).length / task.steps.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {task.steps.filter(s => s.completed).length}/{task.steps.length}
                      </span>
                    </div>
                    <span className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      getTimelineAccent(task.timeline).badge
                    )}>
                      {task.timeline === 'long_term' ? '长期' : '临时'}
                    </span>
                  </div>
                  <div className="relative mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>预估 {task.estimated_minutes}m / 实际 {task.actual_minutes}m</span>
                    {task.dependency_ids.length > 0 && <span>依赖 {task.dependency_ids.length}</span>}
                  </div>
                  {task.timeline === 'temporary' && task.deadline_at && (
                    <div className={cn(
                      "relative mt-2 rounded-lg border px-2 py-1 text-[10px] font-semibold",
                      task.deadline_at <= nowTs
                        ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                        : "border-amber-400/35 bg-amber-500/20 text-amber-100"
                    )}>
                      <Clock3 className="mr-1 inline h-3 w-3" />
                      {getCountdownText(task.deadline_at, nowTs)}
                    </div>
                  )}
                  {task.timeline === 'long_term' && task.next_due_at && (
                    <div className={cn(
                      "relative mt-2 rounded-lg border px-2 py-1 text-[10px] font-semibold",
                      task.next_due_at <= nowTs
                        ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-100"
                        : "border-slate-400/40 bg-slate-500/20 text-slate-100"
                    )}>
                      {task.next_due_at <= nowTs ? '当前周期可执行' : `下次周期：${formatDateTime(task.next_due_at)}`}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Sidebar Toggle Button (when closed) */}
        {!isSideNavOpen && (
          <button
            onClick={() => setIsSideNavOpen(true)}
            className="absolute left-4 top-4 z-20 rounded-xl border border-white/10 glass-panel p-2 shadow-2xl transition-all hover:bg-white/10 group"
          >
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white" />
          </button>
        )}

        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Placement Mode Banner */}
          <AnimatePresence>
            {isPlacementMode && (
              <motion.div
                initial={{ y: -50, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0, scale: 0.9 }}
                className="absolute left-1/2 top-4 z-30 flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-2xl bg-teal-900/65 px-4 py-3 text-teal-100 border border-teal-400/40 shadow-[0_0_30px_rgba(20,184,166,0.2)] sm:px-6"
              >
                <MousePointer2 className="h-5 w-5 animate-bounce shrink-0 text-teal-300" />
                <span className="text-sm font-semibold sm:text-base">请在坐标区点击一个位置来放置任务</span>
                <button
                  onClick={() => setIsPlacementMode(false)}
                  className="ml-auto rounded-full p-1.5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Axis Stage */}
          <div
            ref={quadrantRef}
            onClick={handleQuadrantClick}
            className={cn(
              "flex-1 relative quadrant-grid transition-all duration-500",
              isPlacementMode ? "cursor-crosshair bg-teal-50/30 ring-4 ring-inset ring-teal-500/20" : "cursor-default"
            )}
          >
            <div className="pointer-events-none absolute inset-0 z-[2]">
              <div className="absolute left-1/2 top-0 h-full w-px bg-cyan-200/35" />
              <div className="absolute left-0 top-1/2 h-px w-full bg-cyan-200/35" />
              <span className="absolute left-2 top-2 rounded-md border border-cyan-400/30 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-cyan-100">紧急度: 高</span>
              <span className="absolute left-2 bottom-12 rounded-md border border-cyan-400/30 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-cyan-100">紧急度: 低</span>
              <span className="absolute left-12 bottom-2 rounded-md border border-cyan-400/30 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-cyan-100">重要性: 低</span>
              <span className="absolute right-2 bottom-2 rounded-md border border-cyan-400/30 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-cyan-100">重要性: 高</span>
            </div>
            <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="dependency-arrow-blocked" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
                </marker>
                <marker id="dependency-arrow-ready" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L8,4 L0,8 z" fill="#22c55e" />
                </marker>
              </defs>
              {activeTasks.flatMap((task) =>
                task.dependency_ids.map((dependencyId) => {
                  const fromTask = taskById.get(dependencyId);
                  if (!fromTask) return null;
                  if (fromTask.status === 'completed') return null;
                  const edgeReady = isDependencySatisfied(fromTask);
                  return (
                    <line
                      key={`${dependencyId}-${task.id}`}
                      x1={fromTask.x}
                      y1={getTaskRenderY(fromTask, nowTs)}
                      x2={task.x}
                      y2={getTaskRenderY(task, nowTs)}
                      stroke={edgeReady ? '#22c55e' : '#94a3b8'}
                      strokeOpacity={edgeReady ? 0.8 : 0.55}
                      strokeWidth={0.35}
                      markerEnd={edgeReady ? 'url(#dependency-arrow-ready)' : 'url(#dependency-arrow-blocked)'}
                    />
                  );
                })
              )}
            </svg>

            {/* Ghost Point */}
            {isPlacementMode && mousePos && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                style={{ left: `${mousePos.x}%`, top: `${mousePos.y}%` }}
              >
                <div className="w-8 h-8 rounded-2xl border-2 border-dashed border-teal-400 bg-teal-50/50 flex items-center justify-center animate-pulse">
                  <Plus className="w-4 h-4 text-teal-400" />
                </div>
              </div>
            )}

            {activeTasks.map(task => (
              <TaskPoint
                key={task.id}
                task={task}
                nowTs={nowTs}
                onOpen={() => setSelectedTask(task)}
                onMove={updateTaskPosition}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Task List Sidebar */}
      <AnimatePresence>
        {isTaskListOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTaskListOpen(false)}
              className="fixed inset-0 bg-slate-950/65 z-30"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed bottom-0 right-0 top-0 z-40 flex w-full flex-col bg-slate-900 shadow-2xl border-l border-white/10 sm:w-[400px]"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h2 className="text-xl font-bold text-white">任务清单</h2>
                  <p className="text-xs text-slate-400 mt-1">进行中 {activeTasks.length} / 归档 {archivedTasks.length}</p>
                </div>
                <button
                  onClick={() => setIsTaskListOpen(false)}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="rounded-2xl border border-violet-300/20 bg-violet-500/10 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-100">能力维度</h3>
                  <div className="mt-3 space-y-2">
                    {abilityDimensions.length === 0 ? (
                      <p className="text-xs text-violet-100/70">还没有能力维度，先创建一个。</p>
                    ) : (
                      abilityDimensions.map((dimension) => (
                        <div key={dimension} className="flex items-center justify-between rounded-lg border border-violet-300/20 bg-slate-950/60 px-2 py-1.5">
                          <div>
                            <p className="text-xs font-semibold text-violet-100">{dimension}</p>
                            <p className="text-[10px] text-violet-100/70">当前能力值 {abilityScores[dimension] || 0}</p>
                          </div>
                          <button
                            onClick={() => removeAbilityDimension(dimension)}
                            className="rounded-lg p-1 text-violet-100/70 transition-colors hover:bg-violet-500/20 hover:text-white"
                            title="删除维度"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newAbilityDimension}
                      onChange={(e) => setNewAbilityDimension(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addAbilityDimension();
                        }
                      }}
                      placeholder="新增能力维度"
                      className="flex-1 rounded-lg border border-violet-300/25 bg-slate-950/70 px-2 py-1.5 text-xs text-violet-50 placeholder:text-violet-100/40"
                    />
                    <button
                      onClick={addAbilityDimension}
                      className="rounded-lg border border-violet-300/30 bg-violet-500/20 px-2.5 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/30"
                    >
                      添加
                    </button>
                  </div>
                </div>

                {activeTasks.length === 0 && archivedTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                    <div className="w-16 h-16 bg-white/[0.03] rounded-3xl flex items-center justify-center mb-6 ring-1 ring-white/5 shadow-inner">
                      <ListTodo className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="font-semibold text-sm">暂无任务</p>
                    <p className="text-xs mt-2 opacity-60">点击“新建任务”开始规划</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">进行中任务</h3>
                      {activeTasks.length === 0 ? (
                        <p className="text-xs text-slate-400">暂无进行中任务。</p>
                      ) : (
                        [...activeTasks].sort((a, b) => b.created_at - a.created_at).map(task => (
                          <div
                            key={task.id}
                            onClick={() => {
                              setSelectedTask(task);
                              setIsTaskListOpen(false);
                            }}
                            className="p-5 border border-white/10 rounded-2xl hover:border-teal-500/50 hover:bg-teal-500/5 hover:shadow-[0_0_20px_rgba(20,184,166,0.1)] transition-all cursor-pointer group bg-white/[0.02]"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">{task.title || '未命名任务'}</h3>
                              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 group-hover:text-teal-400 transition-all shrink-0" />
                            </div>
                            <div className="mt-5 flex items-center gap-4">
                              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                                  style={{ width: `${task.steps.length > 0 ? (task.steps.filter(s => s.completed).length / task.steps.length) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/[0.05] px-2 py-0.5 rounded-md">
                                {task.steps.filter(s => s.completed).length}/{task.steps.length}
                              </span>
                            </div>
                            {task.timeline === 'temporary' && task.deadline_at && (
                              <p className={cn(
                                "mt-3 rounded-lg border px-2 py-1 text-[10px] font-bold",
                                task.deadline_at <= nowTs
                                  ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                                  : "border-amber-400/35 bg-amber-500/20 text-amber-100"
                              )}>
                                <Clock3 className="mr-1 inline h-3 w-3" />
                                {getCountdownText(task.deadline_at, nowTs)}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">长期任务管理（唯一删除入口）</h3>
                      {longTermTasks.length === 0 ? (
                        <p className="text-xs text-slate-400">暂无长期任务。</p>
                      ) : (
                        longTermTasks.map((task) => (
                          <div key={`long-${task.id}`} className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-cyan-50">{task.title || '未命名任务'}</p>
                              <button
                                onClick={() => deleteTask(task.id, { allowLongTerm: true })}
                                className="rounded-lg p-1 text-cyan-100/70 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
                                title="删除长期任务"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="mt-1 text-[10px] text-cyan-100/70">上次完成：{formatDateTime(task.last_completed_at)}</p>
                            <p className="text-[10px] text-cyan-100/70">下次周期：{formatDateTime(task.next_due_at)}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">已归档任务</h3>
                      {archivedTasks.length === 0 ? (
                        <p className="text-xs text-slate-400">暂无已归档任务。</p>
                      ) : (
                        [...archivedTasks].sort((a, b) => (b.archived_at || 0) - (a.archived_at || 0)).map((task) => (
                          <div key={`archive-${task.id}`} className="rounded-xl border border-slate-300/20 bg-slate-800/60 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-100">{task.title || '未命名任务'}</p>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => restoreArchivedTask(task.id)}
                                  className="rounded-lg border border-slate-300/25 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-slate-700"
                                >
                                  恢复
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id, { allowLongTerm: true })}
                                  className="rounded-lg p-1 text-slate-200/70 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
                                  title="永久删除"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-300">归档时间：{formatDateTime(task.archived_at)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-slate-950/75"
            />
            <motion.div
              layoutId={selectedTask.id}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] glass-modal sm:rounded-[2.5rem]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/[0.05] bg-white/[0.02] p-5 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg shadow-teal-500/20 ring-1 ring-white/20 sm:h-12 sm:w-12">
                    <ListTodo className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white sm:text-xl">任务详情</h2>
                    <p className="text-xs text-teal-400 font-bold uppercase tracking-widest mt-1">Task Intelligence</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="rounded-2xl p-2 transition-colors hover:bg-white/10 text-slate-400 hover:text-white sm:p-3"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 space-y-8 overflow-y-auto p-5 sm:space-y-10 sm:p-10 custom-scrollbar">
                {/* Title & Description */}
                <div className="space-y-6">
                  <input
                    type="text"
                    placeholder="给任务起个名字..."
                    className="w-full text-3xl font-bold border-none bg-transparent focus:ring-0 p-0 placeholder:text-slate-600 text-white"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                  />
                  <div className="flex items-start gap-4 text-slate-400 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                    <Info className="w-5 h-5 shrink-0 mt-0.5 text-slate-500" />
                    <textarea
                      placeholder="添加一些详细描述，AI 会根据这些信息为你规划..."
                      className="w-full min-h-[100px] border-none bg-transparent focus:ring-0 p-0 text-slate-300 resize-none placeholder:text-slate-600 text-base leading-relaxed"
                      value={selectedTask.description}
                      onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Task Meta Section */}
                <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelectedTask({
                        ...selectedTask,
                        timeline: 'temporary',
                        next_due_at: null,
                      })}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        selectedTask.timeline === 'temporary'
                          ? "border-amber-300/60 bg-amber-500/20 text-amber-100"
                          : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      临时任务
                    </button>
                    <button
                      onClick={() => setSelectedTask({
                        ...selectedTask,
                        timeline: 'long_term',
                        status: 'pending',
                        archived_at: null,
                        long_term_cadence: selectedTask.long_term_cadence || 'daily',
                        long_term_interval_days: selectedTask.long_term_interval_days || 3,
                        next_due_at: selectedTask.next_due_at || Date.now(),
                      })}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        selectedTask.timeline === 'long_term'
                          ? "border-cyan-300/60 bg-cyan-500/20 text-cyan-100"
                          : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      长期任务
                    </button>
                    {!selectedTaskReady && (
                      <span className="rounded-md border border-amber-400/35 bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-200">
                        当前被前置任务阻塞
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                      预计用时（分钟）
                      <input
                        type="number"
                        min={0}
                        value={selectedTask.estimated_minutes}
                        onChange={(e) => setSelectedTask({ ...selectedTask, estimated_minutes: Math.max(0, Number(e.target.value) || 0) })}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white"
                      />
                    </label>
                    <label className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                      实际用时（分钟）
                      <input
                        type="number"
                        min={0}
                        value={selectedTask.actual_minutes}
                        onChange={(e) => setSelectedTask({ ...selectedTask, actual_minutes: Math.max(0, Number(e.target.value) || 0) })}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white"
                      />
                    </label>
                  </div>

                  {selectedTask.timeline === 'long_term' && (
                    <div className="space-y-3 rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">长期任务周期</h4>
                      <div className="flex flex-wrap gap-2">
                        {(['daily', 'weekly', 'interval'] as LongTermCadence[]).map((cadence) => (
                          <button
                            key={cadence}
                            onClick={() => setSelectedTask({
                              ...selectedTask,
                              long_term_cadence: cadence,
                              long_term_interval_days: selectedTask.long_term_interval_days || 3,
                            })}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                              selectedTask.long_term_cadence === cadence
                                ? "border-cyan-300/60 bg-cyan-500/25 text-cyan-50"
                                : "border-cyan-300/25 bg-slate-950/60 text-cyan-100/80 hover:bg-slate-900"
                            )}
                          >
                            {cadence === 'daily' ? '每日' : cadence === 'weekly' ? '每周' : '每几天'}
                          </button>
                        ))}
                      </div>
                      {selectedTask.long_term_cadence === 'interval' && (
                        <label className="block text-xs text-cyan-100/90">
                          间隔天数
                          <input
                            type="number"
                            min={2}
                            max={365}
                            value={selectedTask.long_term_interval_days || 3}
                            onChange={(e) => setSelectedTask({
                              ...selectedTask,
                              long_term_interval_days: clamp(Number(e.target.value) || 3, 2, 365),
                            })}
                            className="mt-2 w-full rounded-lg border border-cyan-300/30 bg-slate-950/70 px-2 py-1.5 text-sm text-white"
                          />
                        </label>
                      )}
                      <div className="rounded-lg border border-cyan-300/20 bg-slate-950/60 px-2 py-2 text-[11px] text-cyan-50">
                        <p>上次完成：{formatDateTime(selectedTask.last_completed_at)}</p>
                        <p className="mt-1">
                          下次周期：{formatDateTime(selectedTask.next_due_at)}
                          {!isLongTermDue(selectedTask, nowTs) && <span className="ml-2 text-cyan-200/80">尚未到期</span>}
                        </p>
                        <p className="mt-1 text-cyan-100/80">完成按钮只会完成本次并自动进入下一周期，不会删除任务。</p>
                      </div>
                    </div>
                  )}

                  {selectedTask.timeline === 'temporary' && (
                    <div className="space-y-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100">截止时间与倒计时</h4>
                      <label className="block text-xs text-amber-100/90">
                        截止时间（精确到小时）
                        <input
                          type="datetime-local"
                          step={3600}
                          value={toDateTimeLocalValue(selectedTask.deadline_at)}
                          onChange={(e) => {
                            const parsed = parseDateTimeLocalValue(e.target.value);
                            setSelectedTask({ ...selectedTask, deadline_at: parsed });
                          }}
                          className="mt-2 w-full rounded-lg border border-amber-300/30 bg-slate-950/70 px-2 py-1.5 text-sm text-white"
                        />
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-slate-950/60 px-2 py-2 text-xs text-amber-100/90">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedTask.use_countdown_urgency)}
                          onChange={(e) => setSelectedTask({ ...selectedTask, use_countdown_urgency: e.target.checked })}
                        />
                        使用倒计时作为紧急指标（自动向上浮动）
                      </label>
                      {selectedTask.deadline_at && (
                        <div className={cn(
                          "rounded-lg border px-3 py-2 text-sm font-bold",
                          selectedTask.deadline_at <= nowTs
                            ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                            : "border-amber-400/40 bg-amber-500/25 text-amber-50"
                        )}>
                          <Clock3 className="mr-1 inline h-4 w-4" />
                          {getCountdownText(selectedTask.deadline_at, nowTs)}（截止：{formatDateTime(selectedTask.deadline_at)}）
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-violet-100">能力提升加分</h4>
                    {abilityDimensions.length === 0 ? (
                      <p className="text-xs text-violet-100/75">请先在任务清单侧栏创建能力维度。</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {abilityDimensions.map((dimension) => (
                          <label key={dimension} className="rounded-lg border border-violet-300/30 bg-slate-950/65 p-2 text-xs text-violet-50">
                            {dimension}
                            <input
                              type="number"
                              min={0}
                              value={selectedTask.ability_gains?.[dimension] || 0}
                              onChange={(e) => updateSelectedTaskAbilityGain(dimension, Number(e.target.value) || 0)}
                              className="mt-1 w-full rounded border border-violet-300/25 bg-slate-900 px-2 py-1 text-sm text-white"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-violet-100/75">能力值初始为 0。任务完成一次，就按该值增加一次。</p>
                  </div>

                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      <Link2 className="h-3.5 w-3.5 text-cyan-300" />
                      前置依赖（连线关系）
                    </h4>
                    <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                      {tasks.filter((task) => task.id !== selectedTask.id).length === 0 ? (
                        <p className="text-xs text-slate-500">暂无可关联任务。</p>
                      ) : (
                        tasks
                          .filter((task) => task.id !== selectedTask.id)
                          .map((task) => (
                            <label
                              key={`dep-${task.id}`}
                              className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-300"
                            >
                              <span className="truncate pr-2">{task.title || '未命名任务'}</span>
                              <input
                                type="checkbox"
                                checked={selectedTask.dependency_ids.includes(task.id)}
                                onChange={() => toggleDependency(selectedTask, task.id)}
                              />
                            </label>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Plan Section */}
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-400" />
                      AI 规划建议
                    </h3>
                    {!selectedTask.ai_plan && (
                      <button
                        onClick={() => generateAIPlan(selectedTask)}
                        disabled={isGeneratingPlan || !selectedTask.title}
                        className="group relative overflow-hidden rounded-xl bg-white/[0.05] border border-white/10 px-4 py-2 text-xs font-bold text-teal-300 transition-all hover:bg-white/10 hover:border-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        生成智能计划
                      </button>
                    )}
                  </div>
                  {aiError && (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-200">
                      {aiError}
                    </div>
                  )}

                  {selectedTask.ai_plan ? (
                    <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/[0.05] prose prose-invert prose-sm max-w-none shadow-inner prose-headings:text-slate-200 prose-p:text-slate-300 prose-a:text-teal-400 prose-strong:text-white">
                      <Markdown>{selectedTask.ai_plan}</Markdown>
                      <button
                        onClick={() => generateAIPlan(selectedTask)}
                        className="mt-6 text-[10px] font-bold text-slate-500 hover:text-teal-400 uppercase tracking-widest flex items-center gap-2 transition-colors bg-white/5 px-3 py-1.5 rounded-lg"
                      >
                        <Sparkles className="w-3 h-3" /> 重新生成建议
                      </button>
                    </div>
                  ) : (
                    <div
                      className="relative overflow-hidden border border-white/[0.05] bg-white/[0.02] rounded-[2rem] p-12 text-center group hover:border-teal-500/30 transition-all cursor-pointer"
                      onClick={() => generateAIPlan(selectedTask)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 via-teal-500/0 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-16 h-16 bg-white/[0.03] ring-1 ring-white/10 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500">
                        <Sparkles className="w-8 h-8 text-slate-500 group-hover:text-teal-400 transition-colors" />
                      </div>
                      <p className="text-sm font-semibold text-slate-400 group-hover:text-teal-100 transition-colors">点击“生成计划”获取 AI 的专业建议</p>
                    </div>
                  )}
                </div>

                {/* Steps Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">执行步骤</h3>
                  <div className="space-y-3">
                    {selectedTask.steps.map((step, idx) => (
                      <motion.div
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        key={step.id}
                        draggable
                        onDragStart={(event) => {
                          const e = event as unknown as React.DragEvent<HTMLDivElement>;
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedStepId(step.id);
                        }}
                        onDragEnd={() => setDraggedStepId(null)}
                        onDragOver={(event) => {
                          const e = event as unknown as React.DragEvent<HTMLDivElement>;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(event) => {
                          const e = event as unknown as React.DragEvent<HTMLDivElement>;
                          e.preventDefault();
                          if (!draggedStepId) return;
                          const fromIdx = selectedTask.steps.findIndex((item) => item.id === draggedStepId);
                          moveSelectedStep(fromIdx, idx);
                          setDraggedStepId(null);
                        }}
                        className={cn(
                          "flex items-center gap-4 group bg-white/[0.02] border p-3 rounded-2xl hover:bg-white/[0.05] transition-all",
                          draggedStepId === step.id ? "border-teal-400/70 bg-teal-500/10" : "border-white/[0.05] hover:border-white/10"
                        )}
                      >
                        <span className="cursor-grab text-slate-500 hover:text-slate-300" title="拖拽排序">
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <button
                          onClick={() => {
                            const newSteps = [...selectedTask.steps];
                            newSteps[idx].completed = !newSteps[idx].completed;
                            setSelectedTask({ ...selectedTask, steps: newSteps });
                          }}
                          className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0",
                            step.completed
                              ? "bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)] ring-1 ring-teal-300/50"
                              : "bg-white/5 border border-white/20 text-transparent hover:border-teal-400"
                          )}
                        >
                          {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <input
                          type="text"
                          value={step.text}
                          onChange={(e) => {
                            const newSteps = [...selectedTask.steps];
                            newSteps[idx].text = e.target.value;
                            setSelectedTask({ ...selectedTask, steps: newSteps });
                          }}
                          className={cn(
                            "flex-1 border-none bg-transparent focus:ring-0 p-0 text-sm font-medium transition-all",
                            step.completed ? "text-slate-500 line-through" : "text-slate-200"
                          )}
                        />
                        <button
                          onClick={() => {
                            const newSteps = selectedTask.steps.filter((_, i) => i !== idx);
                            setSelectedTask({ ...selectedTask, steps: newSteps });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                    <button
                      onClick={() => {
                        const newStep: TaskStep = {
                          id: Math.random().toString(36).substr(2, 9),
                          text: '',
                          completed: false
                        };
                        setSelectedTask({ ...selectedTask, steps: [...selectedTask.steps, newStep] });
                      }}
                      className="w-full py-3 border border-dashed border-white/20 bg-white/[0.02] rounded-2xl text-sm text-slate-400 font-semibold flex items-center justify-center gap-2 hover:border-teal-500/50 hover:text-teal-300 hover:bg-teal-500/5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      添加新步骤
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col gap-3 border-t border-white/[0.05] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <button
                  onClick={() => deleteTask(selectedTask.id)}
                  disabled={selectedTask.timeline === 'long_term' && selectedTaskIsPersisted}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all sm:justify-start",
                    selectedTask.timeline === 'long_term' && selectedTaskIsPersisted
                      ? "text-slate-500 cursor-not-allowed bg-white/5"
                      : "text-rose-400 hover:bg-rose-500/10"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  {!selectedTaskIsPersisted
                    ? '取消创建'
                    : selectedTask.timeline === 'long_term'
                      ? '长期任务请到任务清单删除'
                      : '删除任务'}
                </button>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <button
                    onClick={() => {
                      saveTask(selectedTask);
                      setSelectedTask(null);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-white/10"
                  >
                    <Save className="w-4 h-4" />
                    {selectedTaskIsPersisted ? '保存更改' : '确认创建'}
                  </button>
                  {selectedTaskIsPersisted && selectedTask.status === 'pending' && (
                    <button
                      onClick={() => completeTask(selectedTask)}
                      disabled={!selectedTaskReady || (selectedTask.timeline === 'long_term' && !isLongTermDue(selectedTask, nowTs))}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all",
                        selectedTaskReady && (selectedTask.timeline !== 'long_term' || isLongTermDue(selectedTask, nowTs))
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 shadow-[0_0_20px_rgba(20,184,166,0.3)] ring-1 ring-teal-400/50 hover:scale-[1.02] active:scale-95"
                          : "bg-slate-700/70 text-slate-300 cursor-not-allowed"
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {selectedTask.timeline === 'long_term' ? '完成本次周期' : '标记完成并归档'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskPoint({
  task,
  nowTs,
  onOpen,
  onMove
}: {
  task: Task,
  nowTs: number,
  onOpen: () => void,
  onMove: (id: string, x: number, y: number) => void
}) {
  const [isDragging, setIsDragging] = useState(false);
  const pointRef = useRef<HTMLDivElement>(null);
  const timelineAccent = getTimelineAccent(task.timeline);
  const nodeColor = getDimensionColor(task);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = pointRef.current?.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      onMove(task.id, x, y);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, task.id, onMove]);

  const progress = task.steps.length > 0
    ? (task.steps.filter(s => s.completed).length / task.steps.length) * 100
    : 0;
  const renderY = getTaskRenderY(task, nowTs);
  const urgency = Math.round(100 - renderY);
  const importance = Math.round(task.x);

  return (
    <motion.div
      ref={pointRef}
      layoutId={task.id}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, left: `${task.x}%`, top: `${renderY}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
    >
      <div
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className={cn(
          "relative group cursor-grab active:cursor-grabbing p-4",
          isDragging && "scale-110 z-50"
        )}
      >
        {/* Progress Ring / Circle Backdrop */}
        <div
          className={cn(
            "w-8 h-8 rounded-2xl flex items-center justify-center overflow-hidden relative transition-all duration-300 bg-slate-900/90 border shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]",
            timelineAccent.ring
          )}
        >
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-700"
            style={{
              height: `${progress}%`,
              background: `linear-gradient(to top, ${nodeColor}70, ${nodeColor}25)`,
            }}
          />
          {/* Core dot */}
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all duration-500 shadow-[0_0_10px_currentColor]",
              progress === 100 && "scale-125"
            )}
            style={{ color: nodeColor, backgroundColor: nodeColor }}
          />
          <div
            className={cn(
              "absolute h-2.5 w-2.5 rounded-full transition-all duration-500 shadow-[0_0_12px_currentColor]",
              progress === 100 ? "scale-125" : "group-hover:scale-110"
            )}
            style={{ color: nodeColor, backgroundColor: nodeColor }}
          />
        </div>

        {/* Always-visible label */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap pointer-events-none">
          <div className="rounded-xl border border-white/10 bg-slate-900/95 px-2 py-1 shadow-xl">
            <div className="flex items-center gap-1.5">
              <span className="max-w-[140px] truncate text-[11px] font-semibold text-white">{task.title || '未命名'}</span>
              <span className={cn("rounded border px-1 py-0 text-[9px] font-bold", timelineAccent.badge)}>
                {task.timeline === 'long_term' ? '长' : '临'}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[9px] text-slate-300">
              <span>重:{importance}</span>
              <span>急:{urgency}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            {task.timeline === 'temporary' && task.deadline_at && (
              <div className={cn(
                "mt-1 rounded border px-1 py-0.5 text-[9px] font-bold",
                task.deadline_at <= nowTs
                  ? "border-rose-400/60 bg-rose-500/30 text-rose-100"
                  : "border-amber-400/60 bg-amber-500/30 text-amber-100"
              )}>
                {getCountdownText(task.deadline_at, nowTs)}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
