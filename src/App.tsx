import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  X,
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronRight,
  ListTodo,
  LayoutGrid,
  Trash2,
  Save,
  Loader2,
  MousePointer2,
  Info
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Task, TaskStep } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'gemini-3.1-pro-preview';
const AI_API_BASE = (import.meta.env.VITE_AI_BASE_URL || 'https://api.aipaibox.com').replace(/\/$/, '');
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY;

const SYSTEM_PROMPT = `你是一位高执行力任务规划助手。请严格返回 JSON，不要有任何额外文字。
返回结构:
{
  "plan": "Markdown 形式的执行建议",
  "steps": ["步骤1", "步骤2"]
}
要求:
1. steps 至少 4 条。
2. 每条步骤要具体、可执行。
3. plan 使用中文并包含小标题。`;

function buildPrompt(task: Task) {
  return `帮我为这个任务制定一个详细执行计划。
任务名称：${task.title}
任务描述：${task.description || '无'}
请按要求返回。`;
}

function parsePlanPayload(raw: string) {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch?.[0] || trimmed;
  const result = JSON.parse(jsonText);
  return {
    plan: typeof result.plan === 'string' ? result.plan : '',
    steps: Array.isArray(result.steps) ? result.steps.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0) : []
  };
}

async function requestPlanByChatCompletions(task: Task) {
  const response = await fetch(`${AI_API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(task) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`chat completions failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('chat completions returned empty content');
  }
  return parsePlanPayload(content);
}

async function requestPlanByGemini(task: Task) {
  const response = await fetch(`${AI_API_BASE}/v1beta/models/${AI_MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
      'x-goog-api-key': AI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildPrompt(task)}` }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`generateContent failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('\n');
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('generateContent returned empty content');
  }
  return parsePlanPayload(content);
}

async function requestAIPlan(task: Task) {
  if (!AI_API_KEY) {
    throw new Error('Missing VITE_AI_API_KEY');
  }
  try {
    return await requestPlanByChatCompletions(task);
  } catch {
    return requestPlanByGemini(task);
  }
}

async function loadTasksFromApi() {
  const response = await fetch('/api/tasks', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`load tasks failed: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? (data as Task[]) : [];
}

async function persistTasksToApi(tasks: Task[]) {
  const response = await fetch('/api/tasks', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tasks),
  });
  if (!response.ok) {
    throw new Error(`persist tasks failed: ${response.status}`);
  }
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
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

  const quadrantRef = useRef<HTMLDivElement>(null);
  const hasHydratedRef = useRef(false);

  // Sorting logic for tasks in the sidebar
  // Importance = x, Urgency = 100 - y
  const sortedTasks = [...tasks].sort((a, b) => {
    const impA = a.x;
    const impB = b.x;
    if (impB !== impA) return impB - impA;

    const urgA = 100 - a.y;
    const urgB = 100 - b.y;
    return (impB * urgB) - (impA * urgA);
  });

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

  // Load tasks from disk-backed API
  useEffect(() => {
    let canceled = false;
    setIsLoadingTasks(true);
    loadTasksFromApi()
      .then((loadedTasks) => {
        if (canceled) return;
        setTasks(loadedTasks);
        setStorageError('');
      })
      .catch((e) => {
        if (canceled) return;
        console.error("Failed to load tasks", e);
        setStorageError('任务加载失败，暂时显示为空。');
      })
      .finally(() => {
        if (canceled) return;
        setIsLoadingTasks(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  // Persist tasks with debounce (avoid writing on every drag frame)
  useEffect(() => {
    if (isLoadingTasks) return;
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      persistTasksToApi(tasks)
        .then(() => setStorageError(''))
        .catch((e) => {
          console.error("Failed to persist tasks", e);
          setStorageError('任务保存失败，请稍后重试。');
        });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [tasks, isLoadingTasks]);

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
      steps: [],
      created_at: Date.now()
    };

    setSelectedTask(newTask);
    setIsPlacementMode(false);
  };

  const saveTask = (task: Task) => {
    setTasks(prev => {
      const exists = prev.find(t => t.id === task.id);
      if (exists) {
        return prev.map(t => t.id === task.id ? task : t);
      }
      return [...prev, task];
    });
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTask(null);
  };

  const completeTask = (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setSelectedTask(null);
  };

  const generateAIPlan = async (task: Task) => {
    if (!task.title) return;
    setAiError('');
    setIsGeneratingPlan(true);
    try {
      const result = await requestAIPlan(task);
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
      setAiError('AI 生成失败，请检查接口地址、模型名或 API Key 后重试。');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const updateTaskPosition = (id: string, x: number, y: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
  };

  return (
    <div className="relative isolate min-h-screen flex flex-col overflow-hidden bg-[linear-gradient(135deg,#0b1f3a_0%,#10344f_45%,#135e69_100%)] text-slate-100 font-sans selection:bg-teal-500/30">
      {/* Dynamic Ambient Background Elements */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.25, 0.18] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.24),transparent_72%)] blur-[84px]"
        />
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute right-0 bottom-0 h-[820px] w-[820px] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.2),transparent_74%)] blur-[108px]"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(224,242,254,0.1)_0%,rgba(8,47,73,0.3)_56%,rgba(2,6,23,0.75)_100%)] opacity-85" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] glass-panel px-4 sm:px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-2 shadow-[0_10px_30px_rgba(8,47,73,0.28)] backdrop-blur-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 shadow-lg shadow-cyan-500/20 ring-1 ring-white/25">
            <LayoutGrid className="text-white w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="leading-none">
            <h1 className="text-lg font-bold tracking-tight text-glow sm:text-xl bg-gradient-to-r from-cyan-100 via-white to-teal-100 bg-clip-text text-transparent">
              Quadrant Master
            </h1>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/80">Eisenhower Matrix</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsTaskListOpen(true)}
            className="relative rounded-xl p-2.5 transition-all hover:bg-white/5 active:scale-95 group border border-transparent hover:border-white/10"
          >
            <ListTodo className="h-5 w-5 text-slate-300 group-hover:text-teal-400 transition-colors" />
            {tasks.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(20,184,166,0.5)]">
                {tasks.length}
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
                    "p-4 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden backdrop-blur-md",
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
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentColor]",
                      task.x > 50 ? (100 - task.y > 50 ? "bg-rose-400 text-rose-400" : "bg-amber-400 text-amber-400") : (100 - task.y > 50 ? "bg-sky-400 text-sky-400" : "bg-slate-400 text-slate-400")
                    )} />
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
                  </div>
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
                className="absolute left-1/2 top-4 z-30 flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-2xl bg-teal-500/20 px-4 py-3 text-teal-100 backdrop-blur-xl border border-teal-500/30 shadow-[0_0_30px_rgba(20,184,166,0.2)] sm:px-6"
              >
                <MousePointer2 className="h-5 w-5 animate-bounce shrink-0 text-teal-300" />
                <span className="text-sm font-semibold sm:text-base">请在象限中点击一个位置来放置任务</span>
                <button
                  onClick={() => setIsPlacementMode(false)}
                  className="ml-auto rounded-full p-1.5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quadrant Labels */}
          <div className="pointer-events-none absolute inset-0 hidden grid-cols-2 grid-rows-2 md:grid">
            {/* Q2: Top Left */}
            <div className="border-r border-b border-white/[0.08] flex items-start justify-start p-8">
              <span className="text-xs font-bold text-sky-100 uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-sky-400/20 border border-sky-200/30 shadow-[0_8px_20px_rgba(56,189,248,0.2)]">Q2 紧急 & 不重要</span>
            </div>
            {/* Q1: Top Right */}
            <div className="border-b border-white/[0.08] flex items-start justify-end p-8 text-right">
              <span className="text-xs font-bold text-rose-100 uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-rose-400/20 border border-rose-200/30 shadow-[0_8px_20px_rgba(251,113,133,0.18)]">Q1 重要 & 紧急</span>
            </div>
            {/* Q3: Bottom Left */}
            <div className="border-r border-white/[0.08] flex items-end justify-start p-8">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-slate-400/20 border border-slate-200/25 shadow-[0_8px_20px_rgba(148,163,184,0.18)]">Q3 不重要 & 不紧急</span>
            </div>
            {/* Q4: Bottom Right */}
            <div className="flex items-end justify-end p-8 text-right">
              <span className="text-xs font-bold text-emerald-100 uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-emerald-400/20 border border-emerald-200/30 shadow-[0_8px_20px_rgba(52,211,153,0.2)]">Q4 重要 & 不紧急</span>
            </div>
          </div>

          {/* Axis Labels */}
          <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-4 lg:flex opacity-50">
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-100/85 [writing-mode:vertical-lr]">重要性 (Importance)</div>
            <div className="h-24 w-px bg-gradient-to-b from-transparent via-cyan-200/80 to-transparent" />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-6 hidden -translate-x-1/2 items-center gap-4 lg:flex opacity-50">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-100/85">紧急程度 (Urgency)</div>
          </div>

          {/* The Quadrant Stage */}
          <div
            ref={quadrantRef}
            onClick={handleQuadrantClick}
            className={cn(
              "flex-1 relative quadrant-grid transition-all duration-500 bg-[radial-gradient(circle_at_12%_12%,rgba(125,211,252,0.16),transparent_44%),radial-gradient(circle_at_88%_88%,rgba(45,212,191,0.14),transparent_42%)]",
              isPlacementMode ? "cursor-crosshair bg-teal-50/30 ring-4 ring-inset ring-teal-500/20" : "cursor-default"
            )}
          >
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

            {tasks.map(task => (
              <TaskPoint
                key={task.id}
                task={task}
                onSelect={() => setSelectedTask(task)}
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
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-30"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed bottom-0 right-0 top-0 z-40 flex w-full flex-col bg-[linear-gradient(180deg,rgba(8,47,73,0.92),rgba(15,23,42,0.9))] backdrop-blur-3xl shadow-2xl border-l border-white/10 sm:w-[400px]"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h2 className="text-xl font-bold text-white">任务清单</h2>
                  <p className="text-xs text-slate-400 mt-1">共 {tasks.length} 个进行中的任务</p>
                </div>
                <button
                  onClick={() => setIsTaskListOpen(false)}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                    <div className="w-16 h-16 bg-white/[0.03] rounded-3xl flex items-center justify-center mb-6 ring-1 ring-white/5 shadow-inner">
                      <ListTodo className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="font-semibold text-sm">暂无进行中的任务</p>
                    <p className="text-xs mt-2 opacity-60">点击“新建任务”开始规划</p>
                  </div>
                ) : (
                  [...tasks].sort((a, b) => b.created_at - a.created_at).map(task => (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task);
                        setIsTaskListOpen(false);
                      }}
                      className="p-5 border border-white/10 rounded-2xl hover:border-teal-500/50 hover:bg-teal-500/5 hover:shadow-[0_0_20px_rgba(20,184,166,0.1)] transition-all cursor-pointer group bg-white/[0.02] backdrop-blur-md"
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
                    </div>
                  ))
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
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
                  {!AI_API_KEY && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-200 flex items-center gap-3">
                      <Info className="w-4 h-4 text-amber-400 shrink-0" />
                      未检测到 `VITE_AI_API_KEY`，请先在 `.env.local` 配置后再生成 AI 计划。
                    </div>
                  )}
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
                        className="flex items-center gap-4 group bg-white/[0.02] border border-white/[0.05] p-3 rounded-2xl hover:bg-white/[0.05] hover:border-white/10 transition-all"
                      >
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
                  className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-rose-400 transition-all hover:bg-rose-500/10 sm:justify-start"
                >
                  <Trash2 className="w-4 h-4" />
                  {tasks.some(t => t.id === selectedTask.id) ? '放弃任务' : '取消创建'}
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
                    {tasks.some(t => t.id === selectedTask.id) ? '保存更改' : '确认创建'}
                  </button>
                  {tasks.some(t => t.id === selectedTask.id) && (
                    <button
                      onClick={() => completeTask(selectedTask)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] ring-1 ring-teal-400/50 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      完成并移除
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

function TaskPoint({ task, onSelect, onMove }: { task: Task, onSelect: () => void, onMove: (id: string, x: number, y: number) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const pointRef = useRef<HTMLDivElement>(null);

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

  return (
    <motion.div
      ref={pointRef}
      layoutId={task.id}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, left: `${task.x}%`, top: `${task.y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
    >
      <div
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={cn(
          "relative group cursor-grab active:cursor-grabbing p-4",
          isDragging && "scale-110 z-50"
        )}
      >
        {/* Progress Ring / Circle Backdrop */}
        <div className="w-8 h-8 rounded-2xl flex items-center justify-center overflow-hidden relative transition-all duration-300 backdrop-blur-md bg-white/[0.05] border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] group-hover:border-teal-400/50">
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-teal-500/40 to-teal-500/10 transition-all duration-700"
            style={{ height: `${progress}%` }}
          />
          {/* Core dot glow */}
          <div className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-[0_0_10px_currentColor]",
            progress === 100 ? "bg-emerald-400 text-emerald-400 scale-125 shadow-[0_0_20px_currentColor]" : "bg-teal-300 text-teal-300 group-hover:scale-110"
          )} />
        </div>

        {/* Floating Tooltip Label */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <motion.div
            initial={{ y: 5 }}
            animate={{ y: 0 }}
            className="glass-panel px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/[0.05] shadow-2xl"
          >
            <span className="text-[11px] font-semibold text-white tracking-tight">{task.title || '未命名'}</span>
            {progress > 0 && (
              <span className="text-[9px] font-bold text-teal-300 bg-teal-500/20 px-1.5 py-0.5 rounded-md border border-teal-500/30">
                {Math.round(progress)}%
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
