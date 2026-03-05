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
  
  const quadrantRef = useRef<HTMLDivElement>(null);

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

  // Load tasks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quadrant_tasks');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved tasks", e);
      }
    }
  }, []);

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem('quadrant_tasks', JSON.stringify(tasks));
  }, [tasks]);

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
    <div className="relative isolate min-h-screen flex flex-col overflow-hidden bg-[#f4f8f8] text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 -top-28 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.24),transparent_68%)]" />
        <div className="absolute bottom-0 right-0 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.17),transparent_70%)]" />
      </div>
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/70 bg-white/75 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 shadow-lg shadow-teal-200">
            <LayoutGrid className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-none sm:text-lg">Quadrant Master</h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Eisenhower Matrix</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsTaskListOpen(true)}
            className="relative rounded-xl p-2.5 transition-all hover:bg-slate-100 group"
          >
            <ListTodo className="h-5 w-5 text-slate-600 group-hover:text-teal-600" />
            {tasks.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-teal-500 text-[10px] font-bold text-white">
                {tasks.length}
              </span>
            )}
          </button>
          <button 
            onClick={handleAddTask}
            disabled={isPlacementMode}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-bold shadow-sm transition-all sm:flex sm:items-center sm:gap-2 sm:px-5 sm:py-2.5",
              isPlacementMode 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                : "bg-teal-600 text-white shadow-teal-100 hover:bg-teal-700"
            )}
          >
            <Plus className="h-5 w-5 hidden sm:block" />
            <span>新建任务</span>
          </button>
        </div>
      </header>

      <main className="relative flex flex-1 overflow-hidden">
        {/* Left Collapsible Sidebar */}
        <motion.div 
          animate={{ width: isSideNavOpen ? sideNavWidth : 0 }}
          className="absolute inset-y-0 left-0 z-10 flex flex-col border-r border-white/80 bg-white/70 backdrop-blur-sm lg:relative shrink-0 overflow-hidden"
        >
          {/* Resize Handle */}
          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-teal-500/30 transition-colors z-20",
              isResizing ? "bg-teal-500/50" : ""
            )}
          />

          <div className="p-6 border-b flex items-center justify-between shrink-0">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">任务目录</h2>
            <button 
              onClick={() => setIsSideNavOpen(false)}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sortedTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-300">
                <p className="text-xs font-bold uppercase tracking-widest">暂无任务</p>
              </div>
            ) : (
              sortedTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer group",
                    selectedTask?.id === task.id 
                      ? "bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-200" 
                      : "bg-white border-slate-100 hover:border-teal-300 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm line-clamp-2">{task.title || '未命名任务'}</h3>
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0 mt-1.5",
                      task.x > 50 ? (100 - task.y > 50 ? "bg-red-400" : "bg-amber-400") : (100 - task.y > 50 ? "bg-blue-400" : "bg-slate-300")
                    )} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "h-1 w-12 rounded-full overflow-hidden",
                        selectedTask?.id === task.id ? "bg-white/20" : "bg-slate-100"
                      )}>
                        <div 
                          className={cn("h-full transition-all duration-500", selectedTask?.id === task.id ? "bg-white" : "bg-teal-500")}
                          style={{ width: `${task.steps.length > 0 ? (task.steps.filter(s => s.completed).length / task.steps.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className={cn("text-[9px] font-black", selectedTask?.id === task.id ? "text-white/60" : "text-slate-400")}>
                        {task.steps.filter(s => s.completed).length}/{task.steps.length}
                      </span>
                    </div>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", selectedTask?.id === task.id ? "text-white/40" : "text-slate-300")}>
                      Imp: {Math.round(task.x)}
                    </span>
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
            className="absolute left-4 top-4 z-20 rounded-xl border border-slate-100 bg-white p-2 shadow-lg transition-all hover:bg-slate-50"
          >
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        )}

        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Placement Mode Banner */}
        <AnimatePresence>
          {isPlacementMode && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute left-1/2 top-4 z-30 flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 items-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-white shadow-xl sm:gap-3 sm:px-6"
            >
              <MousePointer2 className="h-5 w-5 animate-bounce shrink-0" />
              <span className="text-sm font-bold sm:text-base">请在象限中点击一个位置来放置任务</span>
              <button 
                onClick={() => setIsPlacementMode(false)}
                className="ml-auto rounded-full p-1 hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quadrant Labels */}
        <div className="pointer-events-none absolute inset-0 hidden grid-cols-2 grid-rows-2 md:grid">
          {/* Q2: Top Left */}
          <div className="border-r border-b border-slate-100 flex items-start justify-start p-8">
            <span className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Q2: 紧急但不重要</span>
          </div>
          {/* Q1: Top Right */}
          <div className="border-b border-slate-100 flex items-start justify-end p-8 text-right">
            <span className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Q1: 重要且紧急</span>
          </div>
          {/* Q3: Bottom Left */}
          <div className="border-r border-slate-100 flex items-end justify-start p-8">
            <span className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Q3: 不重要不紧急</span>
          </div>
          {/* Q4: Bottom Right */}
          <div className="flex items-end justify-end p-8 text-right">
            <span className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Q4: 重要但不紧急</span>
          </div>
        </div>

        {/* Axis Labels */}
        <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-4 lg:flex">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 [writing-mode:vertical-lr]">重要性 (Importance)</div>
          <div className="h-24 w-px bg-slate-100" />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-6 hidden -translate-x-1/2 items-center gap-4 lg:flex">
          <div className="w-24 h-px bg-slate-100" />
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">紧急程度 (Urgency)</div>
        </div>

        {/* The Quadrant Stage */}
        <div 
          ref={quadrantRef}
          onClick={handleQuadrantClick}
          className={cn(
            "flex-1 relative quadrant-grid transition-all duration-500",
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
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed bottom-0 right-0 top-0 z-40 flex w-full flex-col bg-white shadow-2xl sm:w-96"
            >
              <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-bold">任务清单</h2>
                  <p className="text-xs text-slate-400 mt-1">共 {tasks.length} 个进行中的任务</p>
                </div>
                <button onClick={() => setIsTaskListOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-20 text-slate-300">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ListTodo className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="font-medium">暂无进行中的任务</p>
                    <p className="text-xs mt-1">点击“新建任务”开始规划</p>
                  </div>
                ) : (
                  [...tasks].sort((a, b) => b.created_at - a.created_at).map(task => (
                    <div 
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task);
                        setIsTaskListOpen(false);
                      }}
                      className="p-5 border border-slate-100 rounded-2xl hover:border-teal-500 hover:shadow-xl hover:shadow-teal-500/5 transition-all cursor-pointer group bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-bold text-slate-800 group-hover:text-teal-600 transition-colors line-clamp-2">{task.title || '未命名任务'}</h3>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 group-hover:text-teal-500 transition-all shrink-0" />
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-teal-500 transition-all duration-500" 
                            style={{ width: `${task.steps.length > 0 ? (task.steps.filter(s => s.completed).length / task.steps.length) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
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
              className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl sm:rounded-[2.5rem]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b bg-slate-50/70 p-5 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200 sm:h-12 sm:w-12">
                    <ListTodo className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">任务详情</h2>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Task Intelligence</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTask(null)} 
                  className="rounded-2xl p-2 transition-colors hover:bg-slate-200 sm:p-3"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 space-y-8 overflow-y-auto p-5 sm:space-y-10 sm:p-10">
                {/* Title & Description */}
                <div className="space-y-6">
                  <input 
                    type="text"
                    placeholder="给任务起个名字..."
                    className="w-full text-3xl font-black border-none focus:ring-0 p-0 placeholder:text-slate-200 text-slate-900"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                  />
                  <div className="flex items-start gap-3 text-slate-400">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <textarea 
                      placeholder="添加一些详细描述，AI 会根据这些信息为你规划..."
                      className="w-full min-h-[100px] border-none focus:ring-0 p-0 text-slate-600 resize-none placeholder:text-slate-200 text-lg leading-relaxed"
                      value={selectedTask.description}
                      onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* AI Plan Section */}
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      AI 规划建议
                    </h3>
                    {!selectedTask.ai_plan && (
                      <button 
                        onClick={() => generateAIPlan(selectedTask)}
                        disabled={isGeneratingPlan || !selectedTask.title}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-2 disabled:opacity-30 bg-teal-50 px-4 py-2 rounded-xl transition-all"
                      >
                        {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        生成智能计划
                      </button>
                    )}
                  </div>
                  {!AI_API_KEY && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                      未检测到 `VITE_AI_API_KEY`，请先在 `.env.local` 配置后再生成 AI 计划。
                    </div>
                  )}
                  {aiError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                      {aiError}
                    </div>
                  )}
                  
                  {selectedTask.ai_plan ? (
                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 prose prose-slate prose-sm max-w-none shadow-inner">
                      <Markdown>{selectedTask.ai_plan}</Markdown>
                      <button 
                        onClick={() => generateAIPlan(selectedTask)}
                        className="mt-6 text-[10px] font-bold text-slate-400 hover:text-teal-600 uppercase tracking-widest flex items-center gap-2 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" /> 重新生成建议
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-100 rounded-[2rem] p-12 text-center group hover:border-teal-200 transition-all cursor-pointer" onClick={() => generateAIPlan(selectedTask)}>
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-8 h-8 text-slate-200 group-hover:text-amber-400 transition-colors" />
                      </div>
                      <p className="text-sm font-bold text-slate-300 group-hover:text-slate-400 transition-colors">点击“生成计划”获取 AI 的专业建议</p>
                    </div>
                  )}
                </div>

                {/* Steps Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">执行步骤</h3>
                  <div className="space-y-3">
                    {selectedTask.steps.map((step, idx) => (
                      <motion.div 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        key={step.id} 
                        className="flex items-center gap-4 group bg-white p-2 rounded-2xl hover:bg-slate-50/50 transition-all"
                      >
                        <button 
                          onClick={() => {
                            const newSteps = [...selectedTask.steps];
                            newSteps[idx].completed = !newSteps[idx].completed;
                            setSelectedTask({ ...selectedTask, steps: newSteps });
                          }}
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm",
                            step.completed ? "bg-emerald-500 text-white" : "bg-white border-2 border-slate-100 text-transparent hover:border-teal-400"
                          )}
                        >
                          {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
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
                            "flex-1 border-none focus:ring-0 p-0 text-base font-medium transition-all bg-transparent",
                            step.completed ? "text-slate-300 line-through" : "text-slate-700"
                          )}
                        />
                        <button 
                          onClick={() => {
                            const newSteps = selectedTask.steps.filter((_, i) => i !== idx);
                            setSelectedTask({ ...selectedTask, steps: newSteps });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-200 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
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
                      className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl text-sm text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-teal-200 hover:text-teal-500 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      添加新步骤
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col gap-3 border-t bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <button 
                  onClick={() => deleteTask(selectedTask.id)}
                  className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold text-red-500 transition-all hover:bg-red-50 hover:text-red-600 sm:justify-start sm:px-6"
                >
                  <Trash2 className="w-5 h-5" />
                  {tasks.some(t => t.id === selectedTask.id) ? '放弃任务' : '取消创建'}
                </button>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                  <button 
                    onClick={() => {
                      saveTask(selectedTask);
                      setSelectedTask(null);
                    }}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-black text-slate-700 shadow-sm transition-all hover:border-slate-300 sm:px-8"
                  >
                    <Save className="w-5 h-5" />
                    {tasks.some(t => t.id === selectedTask.id) ? '保存更改' : '确认创建'}
                  </button>
                  {tasks.some(t => t.id === selectedTask.id) && (
                    <button 
                      onClick={() => completeTask(selectedTask)}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-8 py-3.5 font-black text-white shadow-xl shadow-teal-200 transition-all hover:bg-teal-700 sm:px-10"
                    >
                      <CheckCircle2 className="w-5 h-5" />
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
          isDragging && "scale-125"
        )}
      >
        {/* Progress Ring / Circle */}
        <div className="w-8 h-8 bg-white rounded-2xl shadow-xl border-2 border-teal-500 flex items-center justify-center overflow-hidden relative group-hover:ring-4 ring-teal-500/10 transition-all">
          <div 
            className="absolute bottom-0 left-0 right-0 bg-teal-500/10 transition-all duration-700"
            style={{ height: `${progress}%` }}
          />
          <div className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-500",
            progress === 100 ? "bg-emerald-500 scale-125" : "bg-teal-600"
          )} />
        </div>

        {/* Floating Label */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 whitespace-nowrap pointer-events-none">
          <motion.div 
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl border border-slate-100 flex items-center gap-2"
          >
            <span className="text-[11px] font-black text-slate-800 tracking-tight">{task.title || '未命名'}</span>
            {progress > 0 && (
              <span className="text-[9px] font-black text-teal-500 bg-teal-50 px-1.5 py-0.5 rounded-md">
                {Math.round(progress)}%
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

