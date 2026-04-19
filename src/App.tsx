import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  X,
  Brain,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  Coins,
  GripVertical,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  SunMedium,
  MoonStar,
  ListTodo,
  LayoutGrid,
  Trash2,
  Save,
  Loader2,
  MousePointer2,
  Info,
  LogOut,
  Settings2,
  Clock3,
  Link2,
  Gauge,
  BatteryMedium,
  Coffee,
  TrendingUp,
  RefreshCw,
  CalendarDays,
  Play,
  Pause,
  Activity,
  MessageSquare,
  Send,
  Globe,
  Bell,
  BellRing,
  Rss,
  BookOpen,
  Tag,
  FileText,
  Briefcase,
  Star,
  Eye,
  EyeOff,
  Edit3,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  ExternalLink,
  Disc3,
  Waves,
  Stars,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import TasksHomeView from './components/TasksHomeView';
import PointerParticles from './PointerParticles';
import {
  AdminPasswordResetResult,
  AuthResult,
  SessionValidationResult,
  AbilityModuleSettings,
  AIDayPlanWorkspace,
  AIDayTaskDraft,
  DailyEnergyCheckin,
  DailyRestSession,
  DailyStateReport,
  ExternalBehaviorEvent,
  FocusReminderSettings,
  LongTermCadence,
  NewsPreferences,
  Task,
  TaskCollaborationLevel,
  TaskCategoryKey,
  TaskCognitiveLoad,
  TaskExecutionMode,
  TaskStep,
  TaskTimeline,
  UserTaskData,
  WellbeingChatMessage,
  WellbeingSettings,
  RSSFeed,
  NewsItem,
  IdeaNote,
  SavedLink,
} from './types';

type AppTheme = 'night' | 'day' | 'stardew' | 'starlit';
type TaskSizeBucket = 'big' | 'medium' | 'small';
type Live2dActionId =
  | 'heart'
  | 'star'
  | 'blush'
  | 'cry'
  | 'angry'
  | 'money'
  | 'pet'
  | 'gesture'
  | 'greet'
  | 'listen'
  | 'think'
  | 'phone'
  | 'idle';
type CalendarSubscriptionInfo = {
  token: string;
  url: string;
  appleUrl: string;
};

const THEME_OPTIONS: { id: AppTheme; label: string; shortLabel: string }[] = [
  { id: 'night', label: '夜间霓光', shortLabel: '夜' },
  { id: 'day', label: '白昼专注', shortLabel: '昼' },
  { id: 'stardew', label: '星露谷', shortLabel: '谷' },
  { id: 'starlit', label: '静谧星空', shortLabel: '星' },
];

const LIVE2D_APPLE_FOX_MODEL_PATH = encodeURI('/live2d/苹果小狐狸/苹果小狐狸.model3.json');
const LIVE2D_MODEL_SCALE = 0.95;
const LIVE2D_MODEL_WIDTH = 311;
const LIVE2D_MODEL_HEIGHT = 311;
const LIVE2D_MODEL_POSITION = { x: -8, y: 10 };
const LIVE2D_WIDGET_OFFSET_RIGHT = 12;
const LIVE2D_WIDGET_OFFSET_BOTTOM = 12;
const LIVE2D_BOOT_DELAY_MS = 1200;
const GLOBAL_CLOCK_INTERVAL_MS = 30000;

type Live2dActionConfig = {
  expressionId?: Live2dActionId;
  expressionIndex?: number;
  useTapMotion?: boolean;
  widgetKeyframes?: Keyframe[];
  widgetDurationMs?: number;
  widgetEasing?: string;
};

const createLive2dTransform = (x = 0, y = 0, rotate = 0, scale = 1) =>
  `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`;

const LIVE2D_TAP_MOTION_GROUP = 'Tap';
const LIVE2D_TAP_MOTION_INDEX = 0;
const LIVE2D_FORCE_MOTION_PRIORITY = 3;
const LIVE2D_AUTOPLAY_ACTIONS: Live2dActionId[] = [
  'heart',
  'star',
  'blush',
  'money',
  'pet',
  'gesture',
  'greet',
  'listen',
  'think',
  'phone',
];

const LIVE2D_ACTION_CONFIGS: Record<Live2dActionId, Live2dActionConfig> = {
  heart: {
    expressionId: 'heart',
    expressionIndex: 0,
    useTapMotion: true,
    widgetDurationMs: 820,
    widgetEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(0, -10, -1.5, 1.02), offset: 0.42 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  star: {
    expressionId: 'star',
    expressionIndex: 1,
    useTapMotion: true,
    widgetDurationMs: 880,
    widgetEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(4, -12, 2, 1.03), offset: 0.35 },
      { transform: createLive2dTransform(-3, -6, -1, 1.015), offset: 0.68 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  blush: {
    expressionId: 'blush',
    expressionIndex: 2,
    widgetDurationMs: 760,
    widgetEasing: 'ease-out',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(-7, -4, -3, 0.995), offset: 0.5 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  cry: {
    expressionId: 'cry',
    expressionIndex: 3,
    widgetDurationMs: 920,
    widgetEasing: 'ease-in-out',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(0, 8, 0, 0.992), offset: 0.45 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  angry: {
    expressionId: 'angry',
    expressionIndex: 4,
    useTapMotion: true,
    widgetDurationMs: 680,
    widgetEasing: 'ease-out',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(8, -3, 2.5, 1.015), offset: 0.22 },
      { transform: createLive2dTransform(-6, -1, -2, 1.01), offset: 0.52 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  money: {
    expressionId: 'money',
    expressionIndex: 5,
    useTapMotion: true,
    widgetDurationMs: 780,
    widgetEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(0, -14, 0, 1.025), offset: 0.4 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  pet: {
    expressionId: 'pet',
    expressionIndex: 6,
    widgetDurationMs: 860,
    widgetEasing: 'ease-out',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(-3, -5, -1.5, 1.01), offset: 0.36 },
      { transform: createLive2dTransform(2, -2, 1, 1.005), offset: 0.68 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  gesture: {
    expressionId: 'gesture',
    expressionIndex: 7,
    useTapMotion: true,
    widgetDurationMs: 860,
    widgetEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(10, -6, 2, 1.02), offset: 0.34 },
      { transform: createLive2dTransform(-8, -2, -2, 1.01), offset: 0.64 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  greet: {
    expressionId: 'greet',
    useTapMotion: true,
    widgetDurationMs: 900,
    widgetEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(12, -10, 4, 1.02), offset: 0.3 },
      { transform: createLive2dTransform(-6, -3, -2, 1.01), offset: 0.62 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  listen: {
    expressionId: 'listen',
    widgetDurationMs: 840,
    widgetEasing: 'ease-out',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(-14, -2, -4, 1.01), offset: 0.46 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  think: {
    expressionId: 'think',
    widgetDurationMs: 980,
    widgetEasing: 'ease-in-out',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(-8, -4, -5, 1.005), offset: 0.34 },
      { transform: createLive2dTransform(-4, -8, -8, 1.01), offset: 0.66 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  phone: {
    expressionId: 'phone',
    useTapMotion: true,
    widgetDurationMs: 920,
    widgetEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(8, -8, 3, 1.015), offset: 0.36 },
      { transform: createLive2dTransform(2, -2, 1, 1.005), offset: 0.72 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
  idle: {
    widgetDurationMs: 640,
    widgetEasing: 'ease-out',
    widgetKeyframes: [
      { transform: createLive2dTransform(0, 0, 0, 1) },
      { transform: createLive2dTransform(0, -2, 0, 1.002), offset: 0.5 },
      { transform: createLive2dTransform(0, 0, 0, 1) },
    ],
  },
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Live2dController = {
  destroy: () => void;
  onModelLoaded: (callback: (model?: unknown) => void) => void;
  onModelError: (callback: () => void) => void;
};

const AUTH_TOKEN_KEY = 'dayplan_auth_token';
const THEME_STORAGE_KEY = 'dayplan_theme';
const AMBIENT_AUDIO_STORAGE_KEY = 'dayplan_ambient_audio';
const PRIMARY_TASK_STORAGE_KEY = 'dayplan_primary_task_id';
const DEFAULT_INITIAL_ENERGY = 72;
const REST_RECOVERY_PER_HOUR = 6;
const MOTIVATION_SETTLE_INTERVAL_MS = 5000;
const FOCUS_WIP_LIMIT = 2;
const DEFAULT_FOCUS_REMINDER_INTERVAL = 35;
const AI_FOCUS_CHECKIN_INTERVAL_MS = 60 * 60 * 1000;
const DAILY_MIX_LIMITS: Record<TaskSizeBucket, number> = {
  big: 1,
  medium: 3,
  small: 5,
};
const ENERGY_DELTA_OPTIONS = [
  { value: -2, label: '很耗能' },
  { value: -1, label: '偏耗能' },
  { value: 0, label: '中性' },
  { value: 1, label: '有成就感' },
  { value: 2, label: '恢复状态' },
] as const;
const COGNITIVE_LOAD_OPTIONS: { value: TaskCognitiveLoad; label: string }[] = [
  { value: 'low', label: '认知负荷低' },
  { value: 'high', label: '认知负荷高' },
];
const COLLABORATION_LEVEL_OPTIONS: { value: TaskCollaborationLevel; label: string }[] = [
  { value: 'low', label: '协作程度低' },
  { value: 'high', label: '协作程度高' },
];
const TASK_CATEGORY_OPTIONS: { value: TaskCategoryKey; label: string; shortLabel: string }[] = [
  { value: 'research', label: '科研', shortLabel: '研' },
  { value: 'development', label: '开发', shortLabel: '开' },
  { value: 'learning', label: '学习', shortLabel: '学' },
  { value: 'misc', label: '杂项', shortLabel: '杂' },
];

type AmbientPresetId = 'white_noise' | 'brown_noise' | 'post_rock' | 'gaming_music';

type AmbientPreset = {
  id: AmbientPresetId;
  label: string;
  blurb: string;
  accent: string;
  qqUrl: string;
  appleUrl: string;
};

type AmbientController = {
  stop: () => void;
  setVolume: (value: number) => void;
};

type DisconnectableAudioNode = {
  stop?: () => void;
  disconnect: () => void;
};

const AMBIENT_PRESETS: AmbientPreset[] = [
  {
    id: 'white_noise',
    label: '白噪音',
    blurb: '重新生成的柔和宽频底噪，少一点刺耳高频。',
    accent: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
    qqUrl: 'https://y.qq.com/n/ryqq/search?w=%E7%99%BD%E5%99%AA%E9%9F%B3%20%E6%AD%8C%E5%8D%95',
    appleUrl: 'https://music.apple.com/us/search?term=white%20noise%20playlist',
  },
  {
    id: 'brown_noise',
    label: '褐噪音',
    blurb: '更厚更沉，适合压低刺耳高频。',
    accent: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    qqUrl: 'https://y.qq.com/n/ryqq/search?w=%E8%A4%90%E5%99%AA%E9%9F%B3%20%E6%AD%8C%E5%8D%95',
    appleUrl: 'https://music.apple.com/us/search?term=brown%20noise%20playlist',
  },
  {
    id: 'post_rock',
    label: '后摇',
    blurb: '缓慢推进的长音垫和空间感，适合深度工作。',
    accent: 'border-violet-400/30 bg-violet-500/10 text-violet-100',
    qqUrl: 'https://y.qq.com/n/ryqq/search?w=%E5%90%8E%E6%91%87%20%E6%AD%8C%E5%8D%95',
    appleUrl: 'https://music.apple.com/us/search?term=post-rock%20playlist',
  },
  {
    id: 'gaming_music',
    label: '游戏音乐',
    blurb: '偏游戏感的推进节奏和合成器线条，适合提神和推进。',
    accent: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    qqUrl: 'https://y.qq.com/n/ryqq/search?w=%E6%B8%B8%E6%88%8F%E9%9F%B3%E4%B9%90%20%E6%AD%8C%E5%8D%95',
    appleUrl: 'https://music.apple.com/us/search?term=video%20game%20music%20playlist',
  },
];

function midiToFrequency(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function clampAudioVolume(value: number, max: number, multiplier: number) {
  return Math.max(0, Math.min(max, value * multiplier));
}

function stopAndDisconnectNodes(nodes: DisconnectableAudioNode[]) {
  nodes.forEach((node) => {
    if (typeof node.stop === 'function') {
      try {
        node.stop();
      } catch {
        // Ignore oscillators already stopped by scheduling.
      }
    }
    node.disconnect();
  });
}

function queueChordProgression(
  progression: number[][],
  activeTimeouts: number[],
  playChord: (notes: number[]) => void
) {
  progression.forEach((notes, index) => {
    activeTimeouts.push(window.setTimeout(() => playChord(notes), index * 3200));
  });
}

function getAudioContextCtor() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    || null;
}

function isAmbientPresetId(value: string): value is AmbientPresetId {
  return AMBIENT_PRESETS.some((preset) => preset.id === value);
}

function createNoiseController(context: AudioContext, mode: 'white' | 'brown'): AmbientController {
  const output = context.createGain();
  output.gain.value = mode === 'white' ? 0.18 : 0.2;
  output.connect(context.destination);

  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = mode === 'white' ? 120 : 38;
  highpass.Q.value = 0.7;

  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = mode === 'white' ? 4200 : 780;
  lowpass.Q.value = 0.8;

  const tone = context.createBiquadFilter();
  tone.type = mode === 'white' ? 'peaking' : 'lowshelf';
  tone.frequency.value = mode === 'white' ? 1400 : 160;
  tone.Q.value = 0.9;
  tone.gain.value = mode === 'white' ? -4 : 3;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -30;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.02;
  compressor.release.value = 0.28;

  const modGain = context.createGain();
  modGain.gain.value = mode === 'white' ? 0.025 : 0.018;

  const modOsc = context.createOscillator();
  modOsc.type = 'sine';
  modOsc.frequency.value = mode === 'white' ? 0.11 : 0.07;
  modOsc.connect(modGain);
  modGain.connect(output.gain);

  highpass.connect(lowpass);
  lowpass.connect(tone);
  tone.connect(compressor);
  compressor.connect(output);

  const frameCount = context.sampleRate * 5;
  const buffer = context.createBuffer(2, frameCount, context.sampleRate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    if (mode === 'white') {
      let smooth = 0;
      for (let index = 0; index < frameCount; index += 1) {
        const white = Math.random() * 2 - 1;
        smooth = smooth * 0.86 + white * 0.14;
        data[index] = (white * 0.45 + smooth * 0.55) * 0.42;
      }
    } else {
      let brown = 0;
      let smooth = 0;
      for (let index = 0; index < frameCount; index += 1) {
        const white = Math.random() * 2 - 1;
        brown = (brown + white * 0.018) / 1.015;
        smooth = smooth * 0.92 + brown * 0.08;
        data[index] = smooth * 3.4;
      }
    }
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(highpass);
  source.start();
  modOsc.start();

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      source.stop();
      modOsc.stop();
      source.disconnect();
      modOsc.disconnect();
      modGain.disconnect();
      highpass.disconnect();
      lowpass.disconnect();
      tone.disconnect();
      compressor.disconnect();
      output.disconnect();
    },
    setVolume(value: number) {
      output.gain.cancelScheduledValues(context.currentTime);
      output.gain.setTargetAtTime(clampAudioVolume(value, 0.7, 0.34), context.currentTime, 0.08);
    },
  };
}

function createPostRockController(context: AudioContext): AmbientController {
  const output = context.createGain();
  output.gain.value = 0.18;
  output.connect(context.destination);

  const progression = [
    [45, 52, 57, 61],
    [40, 47, 52, 56],
    [43, 50, 55, 59],
    [47, 54, 59, 62],
  ];
  const activeTimeouts: number[] = [];
  const activeNodes: DisconnectableAudioNode[] = [];

  const playChord = (notes: number[]) => {
    notes.forEach((note, noteIndex) => {
      const oscillator = context.createOscillator();
      oscillator.type = noteIndex % 2 === 0 ? 'triangle' : 'sine';
      oscillator.frequency.value = midiToFrequency(note);
      oscillator.detune.value = noteIndex * 4 - 6;

      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 980 - noteIndex * 90;

      const gain = context.createGain();
      const now = context.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.055 - noteIndex * 0.008, now + 1.2);
      gain.gain.linearRampToValueAtTime(0.0001, now + 4.8);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      oscillator.start(now);
      oscillator.stop(now + 5.1);
      oscillator.onended = () => {
        oscillator.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      activeNodes.push(oscillator, filter, gain);
    });
  };

  queueChordProgression(progression, activeTimeouts, playChord);

  const intervalId = window.setInterval(() => {
    queueChordProgression(progression, activeTimeouts, playChord);
  }, progression.length * 3200);

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(intervalId);
      activeTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      stopAndDisconnectNodes(activeNodes);
      output.disconnect();
    },
    setVolume(value: number) {
      output.gain.cancelScheduledValues(context.currentTime);
      output.gain.setTargetAtTime(clampAudioVolume(value, 0.8, 0.28), context.currentTime, 0.12);
    },
  };
}

function createGamingMusicController(context: AudioContext): AmbientController {
  const output = context.createGain();
  output.gain.value = 0.16;
  output.connect(context.destination);

  const pulsePattern = [64, 67, 71, 72, 71, 67, 64, 62];
  const bassPattern = [40, 45, 43, 47];
  let pulseStep = 0;
  let bassStep = 0;

  const activeNodes: DisconnectableAudioNode[] = [];

  const playLead = () => {
    const oscillator = context.createOscillator();
    oscillator.type = pulseStep % 2 === 0 ? 'triangle' : 'sawtooth';
    oscillator.frequency.value = midiToFrequency(pulsePattern[pulseStep % pulsePattern.length]);

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.9;

    const gain = context.createGain();
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    oscillator.start(now);
    oscillator.stop(now + 0.36);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    activeNodes.push(oscillator, filter, gain);
    pulseStep += 1;
  };

  const playBass = () => {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = midiToFrequency(bassPattern[bassStep % bassPattern.length]);

    const gain = context.createGain();
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.085, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(now);
    oscillator.stop(now + 1.0);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    activeNodes.push(oscillator, gain);
    bassStep += 1;
  };

  playLead();
  playBass();
  const leadInterval = window.setInterval(playLead, 360);
  const bassInterval = window.setInterval(playBass, 1440);

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(leadInterval);
      window.clearInterval(bassInterval);
      stopAndDisconnectNodes(activeNodes);
      output.disconnect();
    },
    setVolume(value: number) {
      output.gain.cancelScheduledValues(context.currentTime);
      output.gain.setTargetAtTime(clampAudioVolume(value, 0.8, 0.24), context.currentTime, 0.08);
    },
  };
}

function createAmbientController(context: AudioContext, presetId: AmbientPresetId) {
  switch (presetId) {
    case 'white_noise':
      return createNoiseController(context, 'white');
    case 'brown_noise':
      return createNoiseController(context, 'brown');
    case 'post_rock':
      return createPostRockController(context);
    case 'gaming_music':
      return createGamingMusicController(context);
    default:
      return createGamingMusicController(context);
  }
}

function BackgroundAudioDock({ embedded = false }: { embedded?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<AmbientPresetId>('white_noise');
  const [volume, setVolume] = useState(0.48);
  const [audioError, setAudioError] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const controllerRef = useRef<AmbientController | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(AMBIENT_AUDIO_STORAGE_KEY);
    if (!saved) return;
    try {
      const payload = JSON.parse(saved);
      if (typeof payload?.volume === 'number') {
        setVolume(Math.max(0, Math.min(1, payload.volume)));
      }
      if (typeof payload?.selectedPreset === 'string' && isAmbientPresetId(payload.selectedPreset)) {
        setSelectedPreset(payload.selectedPreset);
      }
    } catch {
      // Ignore malformed local preferences.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AMBIENT_AUDIO_STORAGE_KEY, JSON.stringify({ selectedPreset, volume }));
  }, [selectedPreset, volume]);

  useEffect(() => {
    controllerRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => () => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  const currentPreset = AMBIENT_PRESETS.find((preset) => preset.id === selectedPreset) || AMBIENT_PRESETS[0];

  function stopPlayback(): void {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setIsPlaying(false);
  }

  async function startPlayback(presetId: AmbientPresetId): Promise<void> {
    try {
      setAudioError('');
      const AudioContextCtor = getAudioContextCtor();
      if (!AudioContextCtor) {
        throw new Error('当前浏览器不支持 Web Audio。');
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      controllerRef.current?.stop();
      controllerRef.current = createAmbientController(audioContextRef.current, presetId);
      controllerRef.current.setVolume(volume);
      setSelectedPreset(presetId);
      setIsPlaying(true);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : '背景音乐启动失败');
      setIsPlaying(false);
    }
  }

  async function togglePlayback(): Promise<void> {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    await startPlayback(selectedPreset);
  }

  async function handlePresetClick(presetId: AmbientPresetId): Promise<void> {
    setSelectedPreset(presetId);
    if (isPlaying) {
      await startPlayback(presetId);
    }
  }

  const panelContent = (
    <>
      <div className={cn(!embedded && "border-b border-white/8", "px-4 py-4")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="ambient-dock-kicker">Ambient Deck</p>
            <h3 className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">背景音乐</h3>
            <p className="mt-1 text-[11px] leading-5 text-[color:var(--text-secondary)]">白噪音和褐噪音是本地生成，其他预设是轻量氛围合成。</p>
          </div>
          <button
            type="button"
            onClick={togglePlayback}
            data-playing={isPlaying ? 'true' : 'false'}
            className="ambient-dock-toggle flex h-10 w-10 items-center justify-center rounded-2xl border transition-all"
            title={isPlaying ? '暂停播放' : '开始播放'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                {AMBIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetClick(preset.id)}
                    data-active={selectedPreset === preset.id ? 'true' : 'false'}
                    className={cn("ambient-dock-option rounded-2xl border px-3 py-3 text-left transition-all", selectedPreset === preset.id && preset.accent)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{preset.label}</span>
                      {selectedPreset === preset.id && (
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]">当前</span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-[color:var(--text-secondary)]">{preset.blurb}</p>
                  </button>
                ))}
              </div>

              <div className="ambient-dock-card rounded-2xl border px-3 py-3">
                <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[color:var(--text-secondary)]">
                  <span>音量</span>
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {volume <= 0.001 ? <VolumeX className="h-4 w-4 text-[color:var(--text-muted)]" /> : <Volume2 className="h-4 w-4 text-[color:var(--text-secondary)]" />}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                    className="ambient-dock-slider h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                  />
                </div>
              </div>

              <div className="ambient-dock-card rounded-2xl border px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[color:var(--text-strong)]">外部歌单跳转</p>
                    <p className="mt-1 text-[11px] leading-5 text-[color:var(--text-secondary)]">为了保持链接稳定，这里使用主题直达搜索页，点开就能切到 QQ 音乐或 Apple Music 对应歌单。</p>
                  </div>
                  <div className="ambient-dock-badge rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                    {currentPreset.label}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(currentPreset.qqUrl, '_blank', 'noopener,noreferrer')}
                    className="ambient-dock-link ambient-dock-link-primary flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all"
                  >
                    <span className="inline-flex items-center gap-2">
                      QQ 音乐
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(currentPreset.appleUrl, '_blank', 'noopener,noreferrer')}
                    className="ambient-dock-link flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all"
                  >
                    <span className="inline-flex items-center gap-2">
                      Apple Music
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>
              </div>

              {audioError && (
                <div className="ambient-dock-error rounded-2xl border px-3 py-2 text-[11px] leading-5">
                  {audioError}
                </div>
              )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="ambient-dock-panel ambient-dock-panel-embedded overflow-hidden rounded-[1.6rem] border backdrop-blur-xl">{panelContent}</div>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        data-playing={isPlaying ? 'true' : 'false'}
        className="ambient-dock-trigger group relative rounded-2xl border px-3 py-2 transition-all"
        title="背景音乐"
      >
        <div className="flex items-center gap-2">
          <Disc3 className={cn("h-4 w-4 transition-transform", isPlaying && "animate-spin")} />
          <span className="hidden text-xs font-semibold sm:inline">{isPlaying ? currentPreset.label : '背景音乐'}</span>
          {isPlaying ? <Volume2 className="h-3.5 w-3.5" /> : <Waves className="h-3.5 w-3.5" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="ambient-dock-panel absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[22rem] max-w-[min(22rem,92vw)] overflow-hidden rounded-[1.6rem] border backdrop-blur-xl"
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EMPTY_DIMENSION_GUIDE = [
  {
    title: '任务压力量表',
    value: '默认 3/5',
    description: '决定任务会给今天带来多少心理负荷，越高越容易把压力值推上去。',
  },
  {
    title: '完成后精力影响',
    value: '默认 中性',
    description: '任务完成后会回一点状态，还是会把你彻底榨干，会直接影响今日精力估算。',
  },
  {
    title: '认知负荷',
    value: '默认 认知低',
    description: '高认知任务会被优先安排进精力更充足的时段，避免在低状态硬啃。',
  },
  {
    title: '协作化程度',
    value: '默认 协作低',
    description: '高协作任务会被系统集中进沟通窗口，减少来回切换和消息打断。',
  },
] as const;
type AbilityModuleOption = {
  id: string;
  label: string;
  description: string;
  unit: string;
  kind: 'ability' | 'special';
  gainPerHour?: number;
};
type ExternalBehaviorPreset = {
  id: string;
  label: string;
  aliases: string[];
  instantEnergy: number;
  energyBoostPerHour: number;
  burnRateMultiplier: number;
  durationMinutes: number;
  reply: string;
};
type AIRssScoutSuggestion = {
  id: string;
  name: string;
  url: string;
  category: string;
  keywords: string[];
  reason: string;
};
type AIWorldNewsInsight = {
  summary: string;
  worth_reading: Array<{
    id: string;
    reason: string;
  }>;
  skip_summary: string;
  ideas: string[];
  next_actions: string[];
};
type AIFocusCheckin = {
  summary: string;
  suggested_action: 'continue' | 'rest' | 'pause';
  reason: string;
  reply_prompt: string;
  created_at: number;
  paused_task_ids: string[];
  primary_task_id: string | null;
  status: 'pending' | 'resolved';
  resolved_action?: 'continue' | 'rest' | 'pause';
};
type TaskLineRow = {
  id: string;
  mode: TaskExecutionMode;
  tasks: Task[];
};
type ElevatorDisplayGroup = {
  key: string;
  parallel: boolean;
  tasks: Task[];
};
type TrendradarSnapshotItem = {
  platform_id: string;
  platform_name: string;
  title: string;
  rank: number;
  url: string;
  mobile_url: string;
  timestamp: string;
};
type TechnicalRssPreset = {
  id: string;
  name: string;
  url: string;
  homepage: string;
  category: string;
  keywords: string[];
  reason: string;
};
type RssSyncPreviewItem = {
  title: string;
  url: string;
  summary: string;
  published_at: string;
  source_title: string;
  tags: string[];
};

const SPECIAL_ABILITY_MODULES: AbilityModuleOption[] = [
  {
    id: 'special:mokugyo',
    label: '木鱼',
    description: '任务计时中自动敲木鱼，持续累计功德点。',
    unit: '功德点',
    kind: 'special',
    gainPerHour: 108,
  },
  {
    id: 'special:caishen',
    label: '财神爷',
    description: '任务计时中自动积累财富值，把专注时间转成可见收益。',
    unit: '财富',
    kind: 'special',
    gainPerHour: 188,
  },
  {
    id: 'special:token',
    label: 'Token',
    description: '任务推进时持续累积 token，给任务线一个更明确的即时反馈。',
    unit: 'TK',
    kind: 'special',
    gainPerHour: 96,
  },
];
const DEFAULT_ABILITY_GAIN_PER_HOUR = 36;
const BEHAVIOR_CHAT_PLACEHOLDER = '说说你的想法';
const MAX_DAILY_CHAT_MESSAGES = 24;
const RSS_SCOUT_COST = 88;
const EXTERNAL_BEHAVIOR_PRESETS: ExternalBehaviorPreset[] = [
  {
    id: 'tea',
    label: '喝茶',
    aliases: ['喝茶', '喝了茶', '奶茶', '红茶', '绿茶', '乌龙茶', '泡茶'],
    instantEnergy: 4,
    energyBoostPerHour: 3.2,
    burnRateMultiplier: 0.82,
    durationMinutes: 100,
    reply: '已记录喝茶。接下来一段时间会缓慢回精，同时把任务耗能压低一点。',
  },
  {
    id: 'coffee',
    label: '喝咖啡',
    aliases: ['喝咖啡', '咖啡', '美式', '拿铁', '浓缩'],
    instantEnergy: 5,
    energyBoostPerHour: 3.8,
    burnRateMultiplier: 0.86,
    durationMinutes: 90,
    reply: '已记录咖啡补给。会先抬高一点精力，并在短时间内降低耗能斜率。',
  },
  {
    id: 'water',
    label: '补水',
    aliases: ['喝水', '补水', '接水', '水喝够了'],
    instantEnergy: 2,
    energyBoostPerHour: 1.8,
    burnRateMultiplier: 0.94,
    durationMinutes: 45,
    reply: '已记录补水。效果比较温和，但能帮你把状态拉稳一点。',
  },
  {
    id: 'walk',
    label: '散步',
    aliases: ['散步', '走路', '出去走了', '出去转了', '溜达'],
    instantEnergy: 6,
    energyBoostPerHour: 4.2,
    burnRateMultiplier: 0.84,
    durationMinutes: 80,
    reply: '已记录散步。这个恢复更明显，接下来更适合收拾一个关键任务。',
  },
  {
    id: 'meal',
    label: '吃饭',
    aliases: ['吃饭', '刚吃完', '午饭', '晚饭', '早餐'],
    instantEnergy: 4,
    energyBoostPerHour: 2.5,
    burnRateMultiplier: 0.88,
    durationMinutes: 75,
    reply: '已记录进食恢复。短时间内会补一点精力，也能减轻连续工作的透支感。',
  },
  {
    id: 'nap',
    label: '午睡',
    aliases: ['午睡', '眯了一会', '睡了会', '小睡', '补觉'],
    instantEnergy: 9,
    energyBoostPerHour: 5.4,
    burnRateMultiplier: 0.72,
    durationMinutes: 150,
    reply: '已记录午睡恢复。精力会明显回升，接下来进入高价值任务更划算。',
  },
];
const BEHAVIOR_PRESET_TO_LIVE2D_ACTION: Record<string, Live2dActionId> = {
  tea: 'star',
  coffee: 'heart',
  water: 'pet',
  walk: 'gesture',
  meal: 'blush',
  nap: 'star',
};

function createDefaultAbilityModuleSettings(): AbilityModuleSettings {
  return {
    active_module_id: 'special:mokugyo',
    special_totals: {},
    tracked_ms_baseline: 0,
    updated_at: Date.now(),
  };
}

function createDefaultNewsPreferences(): NewsPreferences {
  return {
    ignored_terms: [],
    updated_at: Date.now(),
  };
}

function createDefaultAIDayPlanWorkspace(): AIDayPlanWorkspace {
  return {
    input: '',
    summary: '',
    core_focus: '',
    schedule_markdown: '',
    tasks: [],
    updated_at: 0,
  };
}

function createDefaultFocusReminderSettings(): FocusReminderSettings {
  return {
    enabled: false,
    desktop_notifications: false,
    interval_minutes: DEFAULT_FOCUS_REMINDER_INTERVAL,
    last_notified_at: null,
  };
}

function createDefaultDailyStateReport(updatedAt = Date.now()): DailyStateReport {
  return {
    self_rating: 3,
    sleep_hours: 7,
    updated_at: updatedAt,
  };
}

function createDefaultWellbeingSettings(): WellbeingSettings {
  return {
    daily_checkins: {},
    daily_rest_sessions: {},
    daily_state_reports: {},
    daily_behavior_events: {},
    daily_chat_messages: {},
  };
}

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createTaskStep(text = ''): TaskStep {
  return {
    id: createLocalId('step'),
    text,
    completed: false,
  };
}

function createDraftTask(x: number, y: number): Task {
  const now = Date.now();
  return {
    id: createLocalId('task'),
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
    stress_score: 3,
    energy_delta: 0,
    cognitive_load: 'low',
    collaboration_level: 'low',
    execution_mode: 'serial',
    category_key: 'misc',
    line_order: now,
    tracking_started_at: null,
    tracking_accumulated_ms: 0,
    steps: [],
    created_at: now,
  };
}

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

function normalizeStressScore(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 3;
  return clamp(Math.round(numeric), 1, 5);
}

function normalizeEnergyDelta(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return clamp(Math.round(numeric), -2, 2);
}

function normalizeCognitiveLoad(value: unknown): TaskCognitiveLoad {
  return value === 'high' ? 'high' : 'low';
}

function normalizeCollaborationLevel(value: unknown): TaskCollaborationLevel {
  return value === 'high' ? 'high' : 'low';
}

function normalizeExecutionMode(value: unknown): TaskExecutionMode {
  return value === 'parallel' ? 'parallel' : 'serial';
}

function normalizeTaskCategory(value: unknown): TaskCategoryKey {
  if (value === 'research' || value === 'development' || value === 'learning') return value;
  return 'misc';
}

function normalizeTrackingAccumulatedMs(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function normalizeAbilityModule(value: unknown): AbilityModuleSettings {
  if (!value || typeof value !== 'object') return createDefaultAbilityModuleSettings();
  const raw = value as Partial<AbilityModuleSettings>;
  const specialTotals = raw.special_totals && typeof raw.special_totals === 'object'
    ? Object.entries(raw.special_totals as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, amount]) => {
      const numeric = Number(amount);
      if (!key.trim() || !Number.isFinite(numeric) || numeric < 0) return acc;
      acc[key] = numeric;
      return acc;
    }, {})
    : {};

  return {
    active_module_id: typeof raw.active_module_id === 'string' && raw.active_module_id.trim()
      ? raw.active_module_id.trim()
      : 'special:mokugyo',
    special_totals: specialTotals,
    tracked_ms_baseline: normalizeTrackingAccumulatedMs(raw.tracked_ms_baseline),
    updated_at: Number.isFinite(Number(raw.updated_at)) ? Number(raw.updated_at) : Date.now(),
  };
}

function buildAbilityModuleId(dimension: string) {
  return `ability:${dimension}`;
}

function getAbilityDimensionFromModuleId(moduleId: string) {
  return moduleId.startsWith('ability:') ? moduleId.slice('ability:'.length) : '';
}

function getSpecialAbilityModule(moduleId: string) {
  return SPECIAL_ABILITY_MODULES.find((module) => module.id === moduleId) || null;
}

function buildAbilityModuleOptions(abilityDimensions: string[]): AbilityModuleOption[] {
  return [
    ...abilityDimensions.map((dimension) => ({
      id: buildAbilityModuleId(dimension),
      label: dimension,
      description: '任务计时时会持续推动这个能力维度上涨，适合把专注时间沉淀成明确成长。',
      unit: 'OA',
      kind: 'ability' as const,
      gainPerHour: DEFAULT_ABILITY_GAIN_PER_HOUR,
    })),
    ...SPECIAL_ABILITY_MODULES,
  ];
}

function getMotivationMode(moduleId: string) {
  if (moduleId === 'special:caishen') return 'special:caishen';
  if (moduleId === 'special:mokugyo') return 'special:mokugyo';
  if (moduleId === 'special:token') return 'special:token';
  return 'ability';
}

function formatMetricValue(value: number) {
  if (!Number.isFinite(value)) return '0';
  const absolute = Math.abs(value);
  if (absolute > 0 && absolute < 1) {
    return value.toFixed(2);
  }
  if (absolute < 10 && Math.abs(value - Math.round(value)) >= 0.01) {
    return value.toFixed(1);
  }
  if (Math.abs(value - Math.round(value)) < 0.01) {
    return Math.round(value).toLocaleString('zh-CN');
  }
  return value.toFixed(1);
}

function normalizeRecoveredEnergy(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return clamp(numeric, 0, 100);
}

function normalizeNewsPreferences(value: unknown): NewsPreferences {
  if (!value || typeof value !== 'object') {
    return createDefaultNewsPreferences();
  }
  const raw = value as Partial<NewsPreferences>;
  const ignoredTerms = Array.isArray(raw.ignored_terms)
    ? raw.ignored_terms
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 200)
    : [];
  return {
    ignored_terms: Array.from(new Set(ignoredTerms)),
    updated_at: Number.isFinite(Number(raw.updated_at)) ? Number(raw.updated_at) : Date.now(),
  };
}

function normalizeSavedLinks(value: unknown): SavedLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Partial<SavedLink>;
      const title = typeof raw.title === 'string' ? raw.title.trim() : '';
      const url = typeof raw.url === 'string' ? raw.url.trim() : '';
      if (!url) return null;
      return {
        id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `link-${Date.now()}-${index}`,
        title: title || url,
        url,
        pinned: Boolean(raw.pinned),
        created_at: Number.isFinite(Number(raw.created_at)) ? Number(raw.created_at) : Date.now(),
      } satisfies SavedLink;
    })
    .filter((item): item is SavedLink => Boolean(item))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at - a.created_at)
    .slice(0, 120);
}

function normalizeSelfRating(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 3;
  return clamp(Math.round(numeric), 1, 5);
}

function normalizeSleepHours(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 7;
  return clamp(Number(numeric.toFixed(1)), 0, 12);
}

function normalizeBehaviorDurationMinutes(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 60;
  return clamp(Math.round(numeric), 10, 12 * 60);
}

function normalizeBurnRateMultiplier(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return clamp(Number(numeric.toFixed(2)), 0.55, 1.2);
}

function normalizeWellbeingChatMessage(value: unknown): WellbeingChatMessage | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<WellbeingChatMessage>;
  if (raw.role !== 'user' && raw.role !== 'assistant') return null;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) return null;
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : createLocalId('chat'),
    role: raw.role,
    text,
    created_at: Number.isFinite(Number(raw.created_at)) ? Number(raw.created_at) : Date.now(),
    behavior_event_id: typeof raw.behavior_event_id === 'string' && raw.behavior_event_id.trim()
      ? raw.behavior_event_id
      : null,
  };
}

function normalizeExternalBehaviorEvent(value: unknown): ExternalBehaviorEvent | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ExternalBehaviorEvent>;
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';
  const type = typeof raw.type === 'string' && raw.type.trim() ? raw.type.trim() : 'custom';
  const startedAt = Number(raw.started_at);
  if (!label || !message || !Number.isFinite(startedAt)) return null;
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : createLocalId('behavior'),
    type,
    label,
    message,
    instant_energy: clamp(Math.round(Number(raw.instant_energy) || 0), -10, 20),
    energy_boost_per_hour: clamp(Number(raw.energy_boost_per_hour) || 0, -10, 12),
    burn_rate_multiplier: normalizeBurnRateMultiplier(raw.burn_rate_multiplier),
    duration_minutes: normalizeBehaviorDurationMinutes(raw.duration_minutes),
    started_at: startedAt,
    updated_at: Number.isFinite(Number(raw.updated_at)) ? Number(raw.updated_at) : startedAt,
  };
}

function normalizeWellbeing(value: unknown): WellbeingSettings {
  if (!value || typeof value !== 'object') {
    return createDefaultWellbeingSettings();
  }

  const raw = value as Partial<WellbeingSettings>;
  const dailyCheckins = raw.daily_checkins && typeof raw.daily_checkins === 'object'
    ? Object.entries(raw.daily_checkins).reduce<Record<string, DailyEnergyCheckin>>((acc, [dayKey, checkin]) => {
      if (!checkin || typeof checkin !== 'object') return acc;
      const partial = checkin as Partial<DailyEnergyCheckin>;
      const initialEnergy = Number(partial.initial_energy);
      if (!Number.isFinite(initialEnergy)) return acc;
      acc[dayKey] = {
        initial_energy: clamp(Math.round(initialEnergy), 0, 100),
        updated_at: Number.isFinite(Number(partial.updated_at)) ? Number(partial.updated_at) : Date.now(),
      };
      return acc;
    }, {})
    : {};
  const dailyRestSessions = raw.daily_rest_sessions && typeof raw.daily_rest_sessions === 'object'
    ? Object.entries(raw.daily_rest_sessions).reduce<Record<string, DailyRestSession>>((acc, [dayKey, session]) => {
      if (!session || typeof session !== 'object') return acc;
      const partial = session as Partial<DailyRestSession>;
      acc[dayKey] = {
        is_resting: Boolean(partial.is_resting),
        started_at: Number.isFinite(Number(partial.started_at)) ? Number(partial.started_at) : null,
        recovered_energy: normalizeRecoveredEnergy(partial.recovered_energy),
        updated_at: Number.isFinite(Number(partial.updated_at)) ? Number(partial.updated_at) : Date.now(),
      };
      return acc;
    }, {})
    : {};
  const dailyStateReports = raw.daily_state_reports && typeof raw.daily_state_reports === 'object'
    ? Object.entries(raw.daily_state_reports).reduce<Record<string, DailyStateReport>>((acc, [dayKey, report]) => {
      if (!report || typeof report !== 'object') return acc;
      const partial = report as Partial<DailyStateReport>;
      acc[dayKey] = {
        self_rating: normalizeSelfRating(partial.self_rating),
        sleep_hours: normalizeSleepHours(partial.sleep_hours),
        updated_at: Number.isFinite(Number(partial.updated_at)) ? Number(partial.updated_at) : Date.now(),
      };
      return acc;
    }, {})
    : {};
  const dailyBehaviorEvents = raw.daily_behavior_events && typeof raw.daily_behavior_events === 'object'
    ? Object.entries(raw.daily_behavior_events).reduce<Record<string, ExternalBehaviorEvent[]>>((acc, [dayKey, events]) => {
      if (!Array.isArray(events)) return acc;
      const normalized = events
        .map((event) => normalizeExternalBehaviorEvent(event))
        .filter((event): event is ExternalBehaviorEvent => Boolean(event));
      if (normalized.length > 0) {
        acc[dayKey] = normalized;
      }
      return acc;
    }, {})
    : {};
  const dailyChatMessages = raw.daily_chat_messages && typeof raw.daily_chat_messages === 'object'
    ? Object.entries(raw.daily_chat_messages).reduce<Record<string, WellbeingChatMessage[]>>((acc, [dayKey, messages]) => {
      if (!Array.isArray(messages)) return acc;
      const normalized = messages
        .map((message) => normalizeWellbeingChatMessage(message))
        .filter((message): message is WellbeingChatMessage => Boolean(message))
        .slice(-MAX_DAILY_CHAT_MESSAGES);
      if (normalized.length > 0) {
        acc[dayKey] = normalized;
      }
      return acc;
    }, {})
    : {};

  return {
    daily_checkins: dailyCheckins,
    daily_rest_sessions: dailyRestSessions,
    daily_state_reports: dailyStateReports,
    daily_behavior_events: dailyBehaviorEvents,
    daily_chat_messages: dailyChatMessages,
  };
}

function normalizeAIDayTaskDraft(value: unknown): AIDayTaskDraft | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<AIDayTaskDraft>;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return null;
  return {
    title,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    estimated_minutes: clamp(Math.round(Number(raw.estimated_minutes) || 30), 10, 180),
    energy_delta: clamp(Math.round(Number(raw.energy_delta) || 0), -2, 2),
    stress_score: clamp(Math.round(Number(raw.stress_score) || 3), 1, 5),
    cognitive_load: raw.cognitive_load === 'high' ? 'high' : 'low',
    collaboration_level: raw.collaboration_level === 'high' ? 'high' : 'low',
    category_key: normalizeTaskCategory(raw.category_key),
    timeline: raw.timeline === 'long_term' ? 'long_term' : 'temporary',
  };
}

function normalizeAIDayPlanWorkspace(value: unknown): AIDayPlanWorkspace {
  if (!value || typeof value !== 'object') {
    return createDefaultAIDayPlanWorkspace();
  }
  const raw = value as Partial<AIDayPlanWorkspace>;
  return {
    input: typeof raw.input === 'string' ? raw.input : '',
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    core_focus: typeof raw.core_focus === 'string' ? raw.core_focus : '',
    schedule_markdown: typeof raw.schedule_markdown === 'string' ? raw.schedule_markdown : '',
    tasks: Array.isArray(raw.tasks)
      ? raw.tasks.map((task) => normalizeAIDayTaskDraft(task)).filter((task): task is AIDayTaskDraft => Boolean(task))
      : [],
    updated_at: Number.isFinite(Number(raw.updated_at)) ? Number(raw.updated_at) : 0,
  };
}

function normalizeFocusReminderSettings(value: unknown): FocusReminderSettings {
  if (!value || typeof value !== 'object') {
    return createDefaultFocusReminderSettings();
  }
  const raw = value as Partial<FocusReminderSettings>;
  return {
    enabled: Boolean(raw.enabled),
    desktop_notifications: Boolean(raw.desktop_notifications),
    interval_minutes: clamp(Math.round(Number(raw.interval_minutes) || DEFAULT_FOCUS_REMINDER_INTERVAL), 10, 180),
    last_notified_at: toSafeTimestamp(raw.last_notified_at),
  };
}

function getDayKey(ts: number) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBehaviorEventEndsAt(event: ExternalBehaviorEvent) {
  return event.started_at + normalizeBehaviorDurationMinutes(event.duration_minutes) * 60000;
}

function isBehaviorEventActive(event: ExternalBehaviorEvent, now: number) {
  return getBehaviorEventEndsAt(event) > now;
}

function getBehaviorElapsedHours(event: ExternalBehaviorEvent, now: number) {
  const elapsedMs = Math.min(Math.max(0, now - event.started_at), Math.max(0, getBehaviorEventEndsAt(event) - event.started_at));
  return elapsedMs / 3600000;
}

function getBehaviorRecoveredEnergy(event: ExternalBehaviorEvent, now: number) {
  return clamp(
    event.instant_energy + getBehaviorElapsedHours(event, now) * event.energy_boost_per_hour,
    -20,
    30
  );
}

function getBehaviorBurnRateModifier(events: ExternalBehaviorEvent[], now: number) {
  if (events.length === 0) return 1;
  return clamp(
    Number(events.reduce((product, event) => {
      if (!isBehaviorEventActive(event, now)) return product;
      return product * normalizeBurnRateMultiplier(event.burn_rate_multiplier);
    }, 1).toFixed(2)),
    0.55,
    1.15
  );
}

function parseBehaviorMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return null;
  const preset = EXTERNAL_BEHAVIOR_PRESETS.find((item) => item.aliases.some((alias) => normalized.includes(alias)));
  if (!preset) return null;
  return preset;
}

function extractDurationOverrideMinutes(message: string, fallback: number) {
  const normalized = message.toLowerCase();
  const minuteMatch = normalized.match(/(\d+)\s*分(?:钟)?/);
  if (minuteMatch) {
    return normalizeBehaviorDurationMinutes(Number(minuteMatch[1]));
  }
  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:小?时|h)\b/);
  if (hourMatch) {
    return normalizeBehaviorDurationMinutes(Number(hourMatch[1]) * 60);
  }
  if (normalized.includes('半小时')) {
    return 30;
  }
  return fallback;
}

function getTaskProgress(task: Task) {
  if (task.steps.length === 0) return task.status === 'completed' ? 1 : 0;
  return task.steps.filter((step) => step.completed).length / task.steps.length;
}

function getTrackedMs(task: Task, now: number) {
  const accumulated = normalizeTrackingAccumulatedMs(task.tracking_accumulated_ms);
  if (!task.tracking_started_at) return accumulated;
  return accumulated + Math.max(0, now - task.tracking_started_at);
}

function getDisplayedActualMinutes(task: Task, now: number) {
  return Math.max(0, task.actual_minutes) + Math.floor(getTrackedMs(task, now) / 60000);
}

function formatDurationFromMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function useLiveClock(intervalMs: number, enabled = true) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs]);

  return now;
}

function formatTaskRuntimeText(task: Task, now: number, mode: 'card' | 'line' | 'button' | 'plain') {
  if (mode === 'button') {
    return task.tracking_started_at ? formatDurationFromMs(getTrackedMs(task, now)) : '开始';
  }

  if (task.tracking_started_at) {
    const prefix = mode === 'line' ? '计时 ' : mode === 'plain' ? '' : '计时中 ';
    return `${prefix}${formatDurationFromMs(getTrackedMs(task, now))}`;
  }

  const actual = `${getDisplayedActualMinutes(task, now)}m`;
  if (mode === 'plain') return actual;
  return `实际 ${actual}`;
}

const TaskRuntimeLabel = React.memo(function TaskRuntimeLabel({
  task,
  mode,
  className,
}: {
  task: Task;
  mode: 'card' | 'line' | 'button' | 'plain';
  className?: string;
}) {
  const now = useLiveClock(task.tracking_started_at ? 1000 : 60000, true);
  return <span className={className}>{formatTaskRuntimeText(task, now, mode)}</span>;
});

const TaskRuntimeBreakdown = React.memo(function TaskRuntimeBreakdown({
  task,
  className,
}: {
  task: Task;
  className?: string;
}) {
  const now = useLiveClock(task.tracking_started_at ? 1000 : 60000, true);
  return (
    <p className={className}>
      已累计 {formatDurationFromMs(getTrackedMs(task, now))}，折算实际用时 {getDisplayedActualMinutes(task, now)} 分钟。
    </p>
  );
});

const TaskActualMinutesLabel = React.memo(function TaskActualMinutesLabel({
  task,
  className,
}: {
  task: Task;
  className?: string;
}) {
  const now = useLiveClock(60000, true);
  return <span className={className}>实际 {getDisplayedActualMinutes(task, now)}m</span>;
});

function getTaskEnergyBurnRate(task: Task, burnRateModifier = 1, concurrentTasksCount = 1) {
  let burn = 5 + (task.stress_score || 3) * 2;
  if (task.cognitive_load === 'high') burn += 6;
  if (task.collaboration_level === 'high') burn -= 1.5;
  if (task.use_countdown_urgency && task.deadline_at) burn += 2;

  const coordinationPenalty = task.execution_mode === 'parallel'
    ? (task.collaboration_level === 'high' ? 0.14 : 0.38)
    : 0.8;
  const multitaskingPenalty = 1 + Math.max(0, concurrentTasksCount - 1) * coordinationPenalty;

  return Number((Math.max(2.4, burn) * burnRateModifier * multitaskingPenalty).toFixed(1));
}

function getTaskLiveEnergyBurn(task: Task, now: number, burnRateModifier = 1, concurrentTasksCount = 1) {
  if (!task.tracking_started_at) return 0;
  const elapsedHours = Math.max(0, now - task.tracking_started_at) / 3600000;
  return getTaskEnergyBurnRate(task, burnRateModifier, concurrentTasksCount) * elapsedHours;
}

function getLiveRestRecovery(session: DailyRestSession | undefined, now: number) {
  if (!session?.is_resting || !session.started_at) return 0;
  const elapsedHours = Math.max(0, now - session.started_at) / 3600000;
  return elapsedHours * REST_RECOVERY_PER_HOUR;
}

function stopTrackingTaskState(task: Task, now: number, liveBurnDeduction: number): Task {
  if (!task.tracking_started_at) return task;
  return {
    ...task,
    tracking_accumulated_ms: getTrackedMs(task, now),
    tracking_started_at: null,
    // Deduct the energy that was burned during this specific session permanently. 
    // Since energy_delta is added to the score, we subtract the burn.
    energy_delta: (task.energy_delta || 0) - liveBurnDeduction,
  };
}

function getPressureTone(score: number) {
  if (score >= 80) return { label: '过载', card: 'border-rose-400/30 bg-rose-500/12 text-rose-100', bar: 'from-rose-500 to-pink-300' };
  if (score >= 60) return { label: '偏高', card: 'border-stone-300/25 bg-stone-500/12 text-stone-100', bar: 'from-stone-300 to-zinc-100' };
  if (score >= 35) return { label: '平稳', card: 'border-slate-300/25 bg-slate-500/12 text-slate-100', bar: 'from-slate-300 to-blue-100' };
  return { label: '轻松', card: 'border-indigo-300/20 bg-indigo-500/10 text-indigo-100', bar: 'from-indigo-300 to-slate-100' };
}

function getEnergyTone(score: number) {
  if (score <= 30) return { label: '偏低', card: 'border-rose-400/30 bg-rose-500/12 text-rose-100', bar: 'from-rose-500 to-pink-300' };
  if (score <= 55) return { label: '一般', card: 'border-stone-300/25 bg-stone-500/12 text-stone-100', bar: 'from-stone-300 to-zinc-100' };
  if (score <= 75) return { label: '稳定', card: 'border-slate-300/25 bg-slate-500/12 text-slate-100', bar: 'from-slate-300 to-blue-100' };
  return { label: '充足', card: 'border-indigo-300/20 bg-indigo-500/10 text-indigo-100', bar: 'from-indigo-300 to-slate-100' };
}

function getBatteryVisual(score: number) {
  if (score <= 32) {
    return {
      level: '偏低',
      fill: '22%',
      shellClass: 'battery-meter-low',
      cells: 1,
    } as const;
  }
  if (score <= 68) {
    return {
      level: '一般',
      fill: '58%',
      shellClass: 'battery-meter-mid',
      cells: 2,
    } as const;
  }
  return {
    level: '充足',
    fill: '92%',
    shellClass: 'battery-meter-high',
    cells: 3,
  } as const;
}

function getEnergyDeltaLabel(value: number) {
  return ENERGY_DELTA_OPTIONS.find((option) => option.value === value)?.label || '中性';
}

function getCognitiveLoadLabel(value: TaskCognitiveLoad) {
  return value === 'high' ? '认知高' : '认知低';
}

function getCollaborationLevelLabel(value: TaskCollaborationLevel) {
  return value === 'high' ? '协作高' : '协作低';
}

function getExecutionModeLabel(value: TaskExecutionMode) {
  return value === 'parallel' ? '并行' : '串行';
}

function getTaskCategoryLabel(value: TaskCategoryKey) {
  return TASK_CATEGORY_OPTIONS.find((option) => option.value === value)?.label || '杂项';
}

function getTaskUrgencyScore(task: Task, now: number) {
  if (task.timeline !== 'temporary' || !task.deadline_at) return Math.round(100 - task.y);
  if (task.deadline_at <= now) return 100;
  const remainingHours = (task.deadline_at - now) / 3600000;
  if (remainingHours <= 6) return 92;
  if (remainingHours <= 12) return 82;
  if (remainingHours <= 24) return 72;
  return Math.round(100 - task.y);
}

function scoreTaskForMoment(task: Task, energyScore: number, pressureScore: number, now: number) {
  let score = task.x * 0.7 + getTaskUrgencyScore(task, now) * 0.55;

  if (energyScore <= 40) {
    score += task.cognitive_load === 'low' ? 18 : -16;
    score += task.collaboration_level === 'low' ? 8 : -4;
  } else if (energyScore >= 70) {
    score += task.cognitive_load === 'high' ? 14 : 4;
    score += task.collaboration_level === 'high' ? 6 : 2;
  } else {
    score += task.cognitive_load === 'low' ? 6 : 10;
  }

  if (pressureScore >= 70) {
    score += (task.stress_score || 3) <= 3 ? 10 : -8;
  } else {
    score += (task.stress_score || 3) >= 4 ? 4 : 0;
  }

  if (task.timeline === 'temporary' && task.deadline_at && task.deadline_at <= now) {
    score += 18;
  }

  if (task.tracking_started_at) {
    score += 14;
  }

  return score;
}

function buildRecommendationReason(task: Task, energyScore: number, now: number) {
  const reasons: string[] = [];
  if (task.tracking_started_at) {
    reasons.push('你已经在做这项任务，继续推进最能减少切换损耗');
  }
  if (energyScore <= 40 && task.cognitive_load === 'low') {
    reasons.push('当前精力下更容易启动');
  }
  if (energyScore >= 70 && task.cognitive_load === 'high') {
    reasons.push('适合在高状态时集中攻坚');
  }
  if (task.collaboration_level === 'high') {
    reasons.push(task.execution_mode === 'parallel' ? '这项更像等待 AI 或对话回合，可并行挂着推进' : '需要沟通对齐，最好主动推进');
  }
  if (task.timeline === 'temporary' && task.deadline_at) {
    if (task.deadline_at <= now) {
      reasons.push('已经超时，应尽快处理');
    } else if ((task.deadline_at - now) <= 12 * 3600000) {
      reasons.push('截止时间临近');
    }
  }
  if (reasons.length === 0) {
    reasons.push(task.x >= 60 ? '重要性较高，值得优先推进' : '启动成本低，适合尽快完成');
  }
  return reasons[0];
}

function buildBundleSuggestions(tasks: Task[], energyScore: number) {
  const bundles: { title: string; description: string }[] = [];
  const lowLoadBatch = tasks.filter((task) => task.cognitive_load === 'low' && task.collaboration_level === 'low').slice(0, 3);
  if (lowLoadBatch.length >= 2) {
    bundles.push({
      title: '轻量任务可连续清空',
      description: `${lowLoadBatch.map((task) => task.title || '未命名任务').join('、')} 适合放进同一个 30 到 45 分钟清理时段，减少切换成本。`,
    });
  }

  const collaborationBatch = tasks.filter((task) => task.collaboration_level === 'high').slice(0, 3);
  if (collaborationBatch.length >= 2) {
    bundles.push({
      title: '协作任务可集中沟通',
      description: `${collaborationBatch.map((task) => task.title || '未命名任务').join('、')} 适合放在同一段消息回复、同步会或确认窗口中处理。`,
    });
  }

  const deepWorkBatch = tasks.filter((task) => task.cognitive_load === 'high' && task.collaboration_level === 'low').slice(0, 2);
  if (deepWorkBatch.length >= 2 && energyScore >= 55) {
    bundles.push({
      title: '深度任务适合同一专注块',
      description: `${deepWorkBatch.map((task) => task.title || '未命名任务').join('、')} 适合串成一个 60 到 90 分钟深度工作块，中途不要穿插协作型事务。`,
    });
  }

  if (bundles.length === 0) {
    bundles.push({
      title: '暂不建议打包',
      description: '当前任务类型比较分散，建议按优先级逐个推进，避免把高认知和高协作任务混在一起。',
    });
  }

  return bundles.slice(0, 3);
}

function buildWellbeingSuggestions({
  pressureScore,
  energyScore,
  totalTasks,
  completedToday,
  dropCandidates,
  runningTasks,
  isResting,
}: {
  pressureScore: number;
  energyScore: number;
  totalTasks: number;
  completedToday: number;
  dropCandidates: Task[];
  runningTasks: Task[];
  isResting: boolean;
}) {
  const suggestions: string[] = [];

  if (isResting) {
    suggestions.push('你正在休息中，先不要重新开新任务，让精力再回一点再继续。');
  }

  if (pressureScore >= 80) {
    suggestions.push('压力已经接近过载，今天只保留 1 到 2 个最高价值任务，其余延后。');
  } else if (pressureScore >= 60) {
    suggestions.push('任务负荷偏高，建议把重任务拆成 25 到 40 分钟短冲刺。');
  } else if (totalTasks === 0) {
    suggestions.push('今天待办较轻，可以安排一次复盘或推进长期任务。');
  } else {
    suggestions.push('当前节奏可控，优先推进最重要且最靠近截止时间的任务。');
  }

  if (energyScore <= 30) {
    suggestions.push('精力偏低，先休息、补水或短暂散步，再决定是否继续处理任务。');
  } else if (energyScore <= 55) {
    suggestions.push('精力一般，优先处理低阻力任务，避免临时开启新坑。');
  } else {
    suggestions.push('精力尚可，可以先完成一项高价值任务，拉高今天的掌控感。');
  }

  if (completedToday >= 3) {
    suggestions.push('今天已经完成了多项任务，建议预留一个缓冲时段，避免后半段透支。');
  }

  if (runningTasks.length > 1) {
    suggestions.push(`你同时在做 ${runningTasks.length} 项任务，若感觉切换频繁，先收束到 ${runningTasks[0].title || '最关键任务'}。`);
  }

  if (dropCandidates.length > 0) {
    suggestions.push(`可考虑延后：${dropCandidates.map((task) => task.title || '未命名任务').join('、')}。`);
  }

  return suggestions.slice(0, 4);
}

function getTaskNextActionText(task: Task) {
  const nextStep = task.steps.find((step) => !step.completed && step.text.trim());
  if (nextStep) return nextStep.text.trim();
  if (task.description.trim()) return task.description.trim();
  return task.timeline === 'long_term'
    ? '补一个下周期能直接开始的动作。'
    : '补一个今天能直接开始的动作。';
}

function getTaskSizeBucket(task: Task): TaskSizeBucket {
  const estimatedMinutes = Math.max(0, task.estimated_minutes || 0);
  const stressScore = task.stress_score || 3;

  if (
    estimatedMinutes >= 90
    || (estimatedMinutes >= 60 && task.cognitive_load === 'high')
    || stressScore >= 5
  ) {
    return 'big';
  }

  if (
    estimatedMinutes >= 35
    || task.cognitive_load === 'high'
    || task.collaboration_level === 'high'
    || stressScore >= 4
  ) {
    return 'medium';
  }

  return 'small';
}

function buildDailyTaskMix(tasks: Task[]) {
  const result: Record<TaskSizeBucket, Task[]> & { overflow: Task[] } = {
    big: [],
    medium: [],
    small: [],
    overflow: [],
  };

  tasks.forEach((task) => {
    const bucket = getTaskSizeBucket(task);
    if (result[bucket].length < DAILY_MIX_LIMITS[bucket]) {
      result[bucket].push(task);
    } else {
      result.overflow.push(task);
    }
  });

  if (result.big.length === 0 && result.medium.length > 0) {
    const promoted = result.medium.shift();
    if (promoted) result.big.push(promoted);
  }

  return result;
}

function sortTasksForLine(tasks: Task[], energyScore: number, pressureScore: number, now: number) {
  return [...tasks].sort((a, b) => {
    const orderDelta = (a.line_order || a.created_at) - (b.line_order || b.created_at);
    if (Math.abs(orderDelta) > 0.001) return orderDelta;
    return scoreTaskForMoment(b, energyScore, pressureScore, now) - scoreTaskForMoment(a, energyScore, pressureScore, now);
  });
}

function buildTaskLineRows(tasks: Task[]) {
  const rows: TaskLineRow[] = [];
  let parallelBuffer: Task[] = [];

  const flushParallelBuffer = () => {
    if (parallelBuffer.length === 0) return;
    rows.push({
      id: `parallel-${parallelBuffer.map((task) => task.id).join('-')}`,
      mode: 'parallel',
      tasks: parallelBuffer,
    });
    parallelBuffer = [];
  };

  tasks.forEach((task) => {
    if ((task.execution_mode || 'serial') === 'parallel') {
      parallelBuffer.push(task);
      if (parallelBuffer.length === 3) flushParallelBuffer();
      return;
    }

    flushParallelBuffer();
    rows.push({
      id: `serial-${task.id}`,
      mode: 'serial',
      tasks: [task],
    });
  });

  flushParallelBuffer();
  return rows;
}

function buildElevatorDisplayGroups(tasks: Task[], parallelRowIdByTaskId: Map<string, string>) {
  const groups: ElevatorDisplayGroup[] = [];

  tasks.forEach((task) => {
    const parallelRowId = parallelRowIdByTaskId.get(task.id);
    const previousGroup = groups[groups.length - 1];

    if (
      parallelRowId &&
      previousGroup &&
      previousGroup.parallel &&
      previousGroup.key === parallelRowId
    ) {
      previousGroup.tasks.push(task);
      return;
    }

    groups.push({
      key: parallelRowId || `single-${task.id}`,
      parallel: Boolean(parallelRowId),
      tasks: [task],
    });
  });

  return groups;
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
    stress_score: normalizeStressScore(partial.stress_score),
    energy_delta: normalizeEnergyDelta(partial.energy_delta),
    cognitive_load: normalizeCognitiveLoad(partial.cognitive_load),
    collaboration_level: normalizeCollaborationLevel(partial.collaboration_level),
    execution_mode: normalizeExecutionMode(partial.execution_mode),
    category_key: normalizeTaskCategory(partial.category_key),
    line_order: Number.isFinite(Number(partial.line_order)) ? Number(partial.line_order) : Number(partial.created_at) || Date.now(),
    tracking_started_at: toSafeTimestamp(partial.tracking_started_at),
    tracking_accumulated_ms: normalizeTrackingAccumulatedMs(partial.tracking_accumulated_ms),
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
      wellbeing: createDefaultWellbeingSettings(),
      ability_module: createDefaultAbilityModuleSettings(),
      ai_day_plan: createDefaultAIDayPlanWorkspace(),
      focus_reminders: createDefaultFocusReminderSettings(),
      calendar_subscription_token: '',
      rss_feeds: [],
      news_items: [],
      idea_notes: [],
      news_preferences: createDefaultNewsPreferences(),
      saved_links: [],
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
      wellbeing: normalizeWellbeing(raw.wellbeing),
      ability_module: normalizeAbilityModule(raw.ability_module),
      ai_day_plan: normalizeAIDayPlanWorkspace(raw.ai_day_plan),
      focus_reminders: normalizeFocusReminderSettings(raw.focus_reminders),
      calendar_subscription_token: typeof raw.calendar_subscription_token === 'string' ? raw.calendar_subscription_token : '',
      rss_feeds: Array.isArray(raw.rss_feeds) ? raw.rss_feeds : [],
      news_items: Array.isArray(raw.news_items) ? raw.news_items : [],
      idea_notes: Array.isArray(raw.idea_notes) ? raw.idea_notes : [],
      news_preferences: normalizeNewsPreferences(raw.news_preferences),
      saved_links: normalizeSavedLinks(raw.saved_links),
    };
  }
  return {
    tasks: [],
    ability_dimensions: [],
    wellbeing: createDefaultWellbeingSettings(),
    ability_module: createDefaultAbilityModuleSettings(),
    ai_day_plan: createDefaultAIDayPlanWorkspace(),
    focus_reminders: createDefaultFocusReminderSettings(),
    calendar_subscription_token: '',
    rss_feeds: [],
    news_items: [],
    idea_notes: [],
    news_preferences: createDefaultNewsPreferences(),
    saved_links: [],
  };
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
      badge: 'text-teal-200 bg-teal-500/20 border-teal-400/40',
      ring: 'border-teal-300/60',
    }
    : {
      badge: 'text-amber-200 bg-amber-500/20 border-amber-400/40',
      ring: 'border-amber-300/60',
    };
}

type TaskQuadrantZone = 'quick' | 'focus' | 'release' | 'build';

const TASK_QUADRANT_ZONE_META: Record<TaskQuadrantZone, {
  badge: string;
  label: string;
  hint: string;
  tint: string;
  strong: string;
}> = {
  quick: {
    badge: '快清',
    label: '快清区',
    hint: '紧急但不重要',
    tint: 'rgba(224, 166, 81, 0.24)',
    strong: '#de9c3d',
  },
  focus: {
    badge: '主战',
    label: '主战区',
    hint: '重要且紧急',
    tint: 'rgba(224, 96, 122, 0.24)',
    strong: '#e35d77',
  },
  release: {
    badge: '回收',
    label: '回收区',
    hint: '不急也不重要',
    tint: 'rgba(133, 147, 171, 0.2)',
    strong: '#91a1b8',
  },
  build: {
    badge: '积累',
    label: '积累区',
    hint: '重要但不紧急',
    tint: 'rgba(95, 170, 125, 0.22)',
    strong: '#4fa876',
  },
};

function getTaskQuadrantZone(task: Task, now: number): TaskQuadrantZone {
  const renderY = getTaskRenderY(task, now);
  const isImportant = task.x >= 50;
  const isUrgent = renderY < 50;

  if (isImportant && isUrgent) return 'focus';
  if (isImportant) return 'build';
  if (isUrgent) return 'quick';
  return 'release';
}

type EnergyMapLane = 'deep' | 'hybrid' | 'light';

function getTaskEnergyLane(task: Task): EnergyMapLane {
  if (task.collaboration_level === 'high' || task.execution_mode === 'parallel') return 'hybrid';
  if (task.cognitive_load === 'high' || (task.stress_score || 3) >= 4) return 'deep';
  return 'light';
}

type EnergyElevatorLevel = 'sprint' | 'steady' | 'easy';

function getEnergyElevatorLevel(task: Task): EnergyElevatorLevel {
  if (task.cognitive_load === 'high' || (task.stress_score || 3) >= 4) return 'sprint';
  if (task.collaboration_level === 'high' || task.execution_mode === 'parallel') return 'steady';
  return 'easy';
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

function buildStableHash(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function normalizeFeedUrl(url: string) {
  return url.trim().toLowerCase();
}

function buildWorldNewsFingerprint(title: string, url: string, sourceKey: string) {
  return buildStableHash(`${sourceKey}::${title.trim().toLowerCase()}::${url.trim().toLowerCase()}`);
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

async function requestAIDayPlan(
  payload: {
    input: string;
    energy: number;
    existingTasks: Array<Pick<Task, 'title' | 'estimated_minutes' | 'status'>>;
  },
  token: string
) {
  const response = await fetch('/api/ai/day-plan', {
    method: 'POST',
    headers: withAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const rawPayload = await response.json().catch(() => ({} as { error?: string } & Partial<AIDayPlanWorkspace>));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(rawPayload?.error || `AI 请求失败 (${response.status})`);
  }

  return normalizeAIDayPlanWorkspace(rawPayload);
}

async function fetchCalendarSubscription(token: string) {
  const response = await fetch('/api/calendar/subscription-token', {
    cache: 'no-store',
    headers: withAuthHeaders(token),
  });
  const payload = await response.json().catch(() => ({} as { error?: string; token?: string; url?: string; apple_url?: string }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(payload?.error || `订阅链接获取失败 (${response.status})`);
  }
  return {
    token: typeof payload.token === 'string' ? payload.token : '',
    url: typeof payload.url === 'string' ? payload.url : '',
    appleUrl: typeof payload.apple_url === 'string' ? payload.apple_url : '',
  } satisfies CalendarSubscriptionInfo;
}

async function resetCalendarSubscription(token: string) {
  const response = await fetch('/api/calendar/subscription-token/reset', {
    method: 'POST',
    headers: withAuthHeaders(token),
  });
  const payload = await response.json().catch(() => ({} as { error?: string; token?: string; url?: string; apple_url?: string }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(payload?.error || `订阅链接重置失败 (${response.status})`);
  }
  return {
    token: typeof payload.token === 'string' ? payload.token : '',
    url: typeof payload.url === 'string' ? payload.url : '',
    appleUrl: typeof payload.apple_url === 'string' ? payload.apple_url : '',
  } satisfies CalendarSubscriptionInfo;
}

async function requestAIRssScout(
  payload: { topic: string; guidance: string },
  token: string
) {
  const response = await fetch('/api/ai/rss-scout', {
    method: 'POST',
    headers: withAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const rawPayload = await response.json().catch(() => ({} as {
    error?: string;
    summary?: string;
    feeds?: Array<Record<string, unknown>>;
  }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(rawPayload?.error || `AI 请求失败 (${response.status})`);
  }

  const createdAt = Date.now();
  const feeds = Array.isArray(rawPayload?.feeds)
    ? rawPayload.feeds
      .map((feed, index) => {
        if (!feed || typeof feed !== 'object') return null;
        const name = typeof feed.name === 'string' ? feed.name.trim() : '';
        const url = typeof feed.url === 'string' ? feed.url.trim() : '';
        if (!name || !url) return null;
        return {
          id: `rss-scout-${createdAt}-${index}`,
          name,
          url,
          category: typeof feed.category === 'string' && feed.category.trim()
            ? feed.category.trim()
            : 'AI 推荐',
          keywords: Array.isArray(feed.keywords)
            ? feed.keywords
              .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
              .map((item) => item.trim())
              .slice(0, 6)
            : [],
          reason: typeof feed.reason === 'string' ? feed.reason.trim() : '',
        } satisfies AIRssScoutSuggestion;
      })
      .filter((feed): feed is AIRssScoutSuggestion => Boolean(feed))
    : [];

  return {
    summary: typeof rawPayload?.summary === 'string' ? rawPayload.summary.trim() : '',
    feeds,
  };
}

async function requestAIWorldNewsInsight(
  payload: {
    focus: string;
    tasks: Array<Pick<Task, 'title' | 'status' | 'category_key'>>;
    focusCandidates: NewsItem[];
    otherCandidates: NewsItem[];
  },
  token: string
) {
  const response = await fetch('/api/ai/world-news-insight', {
    method: 'POST',
    headers: withAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const rawPayload = await response.json().catch(() => ({} as {
    error?: string;
    summary?: string;
    worth_reading?: Array<Record<string, unknown>>;
    skip_summary?: string;
    ideas?: string[];
    next_actions?: string[];
  }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(rawPayload?.error || `AI 请求失败 (${response.status})`);
  }

  return {
    summary: typeof rawPayload?.summary === 'string' ? rawPayload.summary.trim() : '',
    worth_reading: Array.isArray(rawPayload?.worth_reading)
      ? rawPayload.worth_reading
          .map((item) => ({
            id: typeof item?.id === 'string' ? item.id.trim() : '',
            reason: typeof item?.reason === 'string' ? item.reason.trim() : '',
          }))
          .filter((item) => item.id)
          .slice(0, 3)
      : [],
    skip_summary: typeof rawPayload?.skip_summary === 'string' ? rawPayload.skip_summary.trim() : '',
    ideas: Array.isArray(rawPayload?.ideas)
      ? rawPayload.ideas.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 4)
      : [],
    next_actions: Array.isArray(rawPayload?.next_actions)
      ? rawPayload.next_actions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 4)
      : [],
  } satisfies AIWorldNewsInsight;
}

async function requestAIFocusCheckin(
  payload: {
    primaryTask: {
      id: string;
      title: string;
      next_action: string;
      cognitive_load: TaskCognitiveLoad;
      collaboration_level: TaskCollaborationLevel;
      execution_mode: TaskExecutionMode;
      current_session_minutes: number;
    } | null;
    runningTasks: Array<{
      id: string;
      title: string;
      execution_mode: TaskExecutionMode;
      current_session_minutes: number;
    }>;
    energyScore: number;
    pressureScore: number;
    sleepHours: number;
    selfRating: number;
  },
  token: string
) {
  const response = await fetch('/api/ai/focus-checkin', {
    method: 'POST',
    headers: withAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const rawPayload = await response.json().catch(() => ({} as {
    error?: string;
    summary?: string;
    suggested_action?: string;
    reason?: string;
    reply_prompt?: string;
  }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(rawPayload?.error || `AI 请求失败 (${response.status})`);
  }

  return {
    summary: typeof rawPayload?.summary === 'string' ? rawPayload.summary.trim() : '',
    suggested_action: rawPayload?.suggested_action === 'rest'
      ? 'rest'
      : rawPayload?.suggested_action === 'pause'
        ? 'pause'
        : 'continue',
    reason: typeof rawPayload?.reason === 'string' ? rawPayload.reason.trim() : '',
    reply_prompt: typeof rawPayload?.reply_prompt === 'string' ? rawPayload.reply_prompt.trim() : '',
  } as const;
}

async function requestTrendradarLatestNews(token: string, limit = 60) {
  const response = await fetch(`/api/world-news/trendradar/latest?limit=${encodeURIComponent(String(limit))}`, {
    cache: 'no-store',
    headers: withAuthHeaders(token),
  });

  const payload = await response.json().catch(() => ({} as {
    error?: string;
    source?: string;
    fetched_at?: string;
    fallback_reason?: string;
    items?: TrendradarSnapshotItem[];
  }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(payload?.error || `TrendRadar 请求失败 (${response.status})`);
  }

  const items = Array.isArray(payload?.items)
    ? payload.items.filter((item): item is TrendradarSnapshotItem => Boolean(item && typeof item.title === 'string' && typeof item.platform_id === 'string'))
    : [];

  return {
    source: typeof payload?.source === 'string' ? payload.source : 'trendradar-live',
    fetched_at: typeof payload?.fetched_at === 'string' ? payload.fetched_at : '',
    fallback_reason: typeof payload?.fallback_reason === 'string' ? payload.fallback_reason : '',
    items,
  };
}

async function requestAIBehaviorChat(
  payload: {
    message: string;
    localInsight: string;
    energyScore: number;
    pressureScore: number;
    primaryTask: {
      title: string;
      next_action: string;
      cognitive_load: TaskCognitiveLoad;
      collaboration_level: TaskCollaborationLevel;
      execution_mode: TaskExecutionMode;
      current_session_minutes: number;
    } | null;
    runningTasks: Array<{
      title: string;
      execution_mode: TaskExecutionMode;
      current_session_minutes: number;
    }>;
    recentMessages: Array<Pick<WellbeingChatMessage, 'role' | 'text'>>;
    behaviorEvent: {
      type: string;
      label: string;
      instant_energy: number;
      duration_minutes: number;
      burn_rate_multiplier: number;
    } | null;
  },
  token: string
) {
  const response = await fetch('/api/ai/behavior-chat', {
    method: 'POST',
    headers: withAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'BEHAVIOR_CHAT_FAILED');
  }

  const parsed = await response.json();
  const suggestedMotion = typeof parsed?.suggested_motion === 'string'
    ? parsed.suggested_motion.trim()
    : '';

  return {
    reply: typeof parsed?.reply === 'string' ? parsed.reply.trim() : '',
    suggested_motion: (
      ['heart', 'star', 'blush', 'cry', 'angry', 'money', 'pet', 'gesture', 'greet', 'listen', 'think', 'phone', 'idle']
        .includes(suggestedMotion)
      ? suggestedMotion
      : 'idle') as Live2dActionId,
  };
}

async function requestTechnicalRssPresets(token: string, limit = 90) {
  const response = await fetch(`/api/rss/presets/technical?limit=${encodeURIComponent(String(limit))}`, {
    cache: 'no-store',
    headers: withAuthHeaders(token),
  });

  const payload = await response.json().catch(() => ({} as {
    error?: string;
    feeds?: TechnicalRssPreset[];
  }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(payload?.error || `技术种子读取失败 (${response.status})`);
  }

  return Array.isArray(payload?.feeds)
    ? payload.feeds.filter((feed): feed is TechnicalRssPreset => Boolean(feed && typeof feed.name === 'string' && typeof feed.url === 'string'))
    : [];
}

async function requestRssFeedSync(
  payload: { name: string; url: string; category?: string; keywords?: string[]; limit?: number },
  token: string
) {
  const response = await fetch('/api/world-news/rss/sync', {
    method: 'POST',
    headers: withAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const rawPayload = await response.json().catch(() => ({} as {
    error?: string;
    fetched_at?: string;
    feed_title?: string;
    items?: RssSyncPreviewItem[];
  }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(rawPayload?.error || `RSS 同步失败 (${response.status})`);
  }

  return {
    fetched_at: typeof rawPayload?.fetched_at === 'string' ? rawPayload.fetched_at : '',
    feed_title: typeof rawPayload?.feed_title === 'string' ? rawPayload.feed_title : payload.name,
    items: Array.isArray(rawPayload?.items)
      ? rawPayload.items.filter((item): item is RssSyncPreviewItem => Boolean(item && typeof item.title === 'string' && typeof item.url === 'string'))
      : [],
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

function formatCompactDateTime(value?: number | string | null) {
  if (!value) return '未同步';
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '未同步';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizePreviewText(text: string, maxLength = 140) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function collectNewsPreferenceTerms(news: NewsItem) {
  const titleKeywords = extractMeaningfulKeywords(news.title).slice(0, 6);
  const tagKeywords = news.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 6);
  return Array.from(new Set([...tagKeywords, ...titleKeywords])).slice(0, 10);
}

function matchesIgnoredNews(news: NewsItem, ignoredTerms: string[]) {
  if (ignoredTerms.length === 0) return false;
  const haystack = `${news.title} ${news.content} ${news.url} ${news.tags.join(' ')}`.toLowerCase();
  return ignoredTerms.some((term) => term && haystack.includes(term));
}

function normalizeWebUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function extractMeaningfulKeywords(text: string) {
  return Array.from(
    new Set(
      String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2)
    )
  );
}

function scoreNewsRelevance(news: NewsItem, focusText: string, tasks: Task[]) {
  const focusKeywords = extractMeaningfulKeywords(focusText);
  const taskKeywords = tasks.flatMap((task) => extractMeaningfulKeywords(`${task.title} ${task.description}`)).slice(0, 80);
  const allKeywords = new Set([...focusKeywords, ...taskKeywords]);
  const haystack = `${news.title} ${news.content} ${news.tags.join(' ')}`.toLowerCase();

  let score = 0;
  allKeywords.forEach((keyword) => {
    if (haystack.includes(keyword)) score += focusKeywords.includes(keyword) ? 3 : 1;
  });
  if (news.is_important) score += 2;
  if (!news.is_read) score += 1;
  return score;
}

function explainNewsRelevance(score: number, focusText: string) {
  if (score >= 6) return `这条消息和当前主线“${focusText}”相关，值得现在判断要不要转成动作。`;
  if (score >= 3) return '这条消息可能会影响后续安排，但不一定需要现在打断手头工作。';
  return '这条消息和今天主线关系较弱，先收起来就好。';
}

function escapeIcsText(value: string) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}`;
}

function roundToNextHalfHour(baseTs: number) {
  const date = new Date(baseTs);
  const minutes = date.getMinutes();
  const rounded = minutes <= 30 ? 30 : 60;
  date.setMinutes(rounded, 0, 0);
  if (rounded === 60) {
    date.setHours(date.getHours() + 1, 0, 0, 0);
  }
  return date;
}

function buildDayPlanCalendarIcs(coreFocusTitle: string, items: Array<{ title: string; description: string; minutes: number }>) {
  const dtStamp = formatIcsDate(new Date());
  let cursor = roundToNextHalfHour(Date.now());
  const events = items.map((item, index) => {
    const start = new Date(cursor);
    const end = new Date(start.getTime() + Math.max(10, item.minutes) * 60000);
    cursor = end;
    return [
      'BEGIN:VEVENT',
      `UID:planday-${Date.now()}-${index}@local`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(item.title)}`,
      `DESCRIPTION:${escapeIcsText(item.description || `今日主线：${coreFocusTitle}`)}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planday//Daily Focus//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadIcsFile(filename: string, content: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

async function loginByPassword(username: string, password: string): Promise<AuthResult> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json().catch(() => ({} as { error?: string; token?: string; username?: string; isAdmin?: boolean }));
  if (!response.ok) {
    throw new Error(payload?.error || '登录失败');
  }
  if (!payload?.token) {
    throw new Error('登录失败：未返回 token');
  }
  return {
    token: payload.token,
    username: payload.username || username,
    isAdmin: Boolean(payload.isAdmin),
  };
}

async function registerByPassword(username: string, password: string): Promise<AuthResult> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json().catch(() => ({} as { error?: string; token?: string; username?: string; isAdmin?: boolean }));
  if (!response.ok) {
    throw new Error(payload?.error || '注册失败');
  }
  if (!payload?.token) {
    throw new Error('注册失败：未返回 token');
  }
  return {
    token: payload.token,
    username: payload.username || username,
    isAdmin: Boolean(payload.isAdmin),
  };
}

async function validateSession(token: string): Promise<SessionValidationResult> {
  const response = await fetch('/api/auth/session', {
    headers: withAuthHeaders(token),
  });
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!response.ok) {
    throw new Error(`session check failed: ${response.status}`);
  }
  const payload = await response.json().catch(() => ({} as { username?: string; isAdmin?: boolean }));
  return {
    username: payload?.username || '',
    isAdmin: Boolean(payload?.isAdmin),
  };
}

async function resetPasswordByAdmin(username: string, newPassword: string, token: string): Promise<AdminPasswordResetResult> {
  const response = await fetch('/api/admin/reset-password', {
    method: 'POST',
    headers: withAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, newPassword }),
  });

  const payload = await response.json().catch(() => ({} as { error?: string; username?: string; message?: string; ok?: boolean }));
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (response.status === 403) {
    throw new Error(payload?.error || '仅管理员可执行此操作');
  }
  if (!response.ok) {
    throw new Error(payload?.error || `密码重置失败 (${response.status})`);
  }

  return {
    ok: Boolean(payload.ok),
    username: payload.username || username,
    message: payload.message || `账号 ${username} 的密码已重置`,
  };
}

function generateSuggestedPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(14);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    bytes.fill(0).forEach((_value, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

function AdminResetView({
  authToken,
  currentUser,
  onUnauthorized,
}: {
  authToken: string;
  currentUser: string;
  onUnauthorized: () => void;
}) {
  const [targetUsername, setTargetUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fillSuggestedPassword = () => {
    const generated = generateSuggestedPassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    setError('');
    setSuccessMessage('已生成一组可直接使用的新密码。');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!targetUsername.trim()) {
      setError('请输入要重置的目标账号');
      return;
    }
    if (!newPassword) {
      setError('请输入新密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await resetPasswordByAdmin(targetUsername.trim(), newPassword, authToken);
      setSuccessMessage(result.message);
      setTargetUsername('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : '密码重置失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
        <section className="admin-console-shell overflow-hidden rounded-[2rem] border border-amber-400/20 bg-[linear-gradient(135deg,rgba(120,53,15,0.18),rgba(15,23,42,0.92)_55%,rgba(120,113,108,0.22))] shadow-[0_24px_80px_rgba(15,23,42,0.42)]">
          <div className="border-b border-white/10 px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="admin-console-kicker text-[11px] font-bold uppercase tracking-[0.28em] text-amber-200/70">Admin Console</p>
                <h2 className="admin-console-title mt-2 text-2xl font-bold tracking-tight text-amber-50 sm:text-3xl">管理员密码重置入口</h2>
                <p className="admin-console-copy mt-3 max-w-xl text-sm leading-6 text-amber-100/80">
                  这里不展示旧密码。管理员只需输入目标账号和新密码，系统会直接覆盖原登录口令。
                </p>
              </div>
              <div className="admin-console-badge rounded-3xl border border-amber-300/20 bg-amber-50/10 px-4 py-3 text-right backdrop-blur-sm">
                <p className="admin-console-kicker text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200/70">当前管理员</p>
                <p className="admin-console-title mt-2 flex items-center justify-end gap-2 text-sm font-semibold text-amber-50">
                  <Star className="admin-console-icon h-4 w-4 text-amber-300" />
                  {currentUser}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5 sm:px-7 sm:py-7">
            <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
              <label className="grid gap-2">
                <span className="admin-console-label text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/70">目标账号</span>
                <div className="admin-console-field rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                  <input
                    value={targetUsername}
                    onChange={(event) => setTargetUsername(event.target.value)}
                    placeholder="例如：admin / alice / demo_1204"
                    className="w-full bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </label>
              <div className="admin-console-card rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-4">
                <p className="admin-console-kicker text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">重置规则</p>
                <div className="admin-console-card-copy mt-3 grid gap-2 text-sm text-slate-200/85">
                  <p>密码长度必须在 8 到 128 位之间。</p>
                  <p>注册账号会直接更新哈希密码。</p>
                  <p>预置账号会写入本地覆盖密码，修改后立即生效。</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="admin-console-label text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/70">新密码</span>
                <div className="admin-console-field rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="输入新的登录密码"
                    className="w-full bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </label>
              <label className="grid gap-2">
                <span className="admin-console-label text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/70">确认新密码</span>
                <div className="admin-console-field rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="再次输入新密码"
                    className="w-full bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </label>
            </div>

            {(error || successMessage) && (
              <div className={cn(
                "admin-console-feedback rounded-2xl border px-4 py-3 text-sm font-semibold",
                error
                  ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
                  : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
              )}>
                {error || successMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "admin-console-primary-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all",
                  isSubmitting
                    ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
                    : "border border-amber-300/30 bg-amber-500/15 text-amber-50 hover:bg-amber-500/20"
                )}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                执行密码重置
              </button>
              <button
                type="button"
                onClick={fillSuggestedPassword}
                className="admin-console-secondary-button inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
              >
                <Edit3 className="h-4 w-4" />
                生成随机密码
              </button>
            </div>
          </form>
        </section>

        <aside className="grid gap-4 content-start">
          <div className="admin-console-card rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="admin-console-kicker text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">操作边界</p>
            <div className="admin-console-card-copy mt-4 grid gap-3 text-sm leading-6 text-slate-200/85">
              <p>这里只处理账号密码，不碰用户任务数据。</p>
              <p>如果重置的是当前登录账号，当前会话会保留，新的密码在下次登录时生效。</p>
              <p>如果重置的是其他账号，对方旧会话会被踢下线，需要用新密码重新登录。</p>
            </div>
          </div>
          <div className="admin-console-card admin-console-card-accent rounded-[1.75rem] border border-teal-400/20 bg-teal-500/10 p-5">
            <p className="admin-console-kicker text-[11px] font-bold uppercase tracking-[0.22em] text-teal-100/75">建议流程</p>
            <div className="admin-console-card-copy mt-4 grid gap-3 text-sm leading-6 text-teal-50/90">
              <p>先确认目标用户名完全正确，再执行重置。</p>
              <p>如需临时密码，可先点“生成随机密码”，再发给对应用户。</p>
              <p>账号不存在时，系统会直接返回错误，不会新建陌生账号。</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function WorldNewsView({
  rssFeeds,
  setRssFeeds,
  newsItems,
  setNewsItems,
  newsPreferences,
  setNewsPreferences,
  savedLinks,
  setSavedLinks,
  abilityModule,
  spendSpecialReward,
  authToken,
  onUnauthorized,
  ideaNotes,
  setIdeaNotes,
  tasks,
  setTasks,
  coreFocusTitle,
}: {
  rssFeeds: RSSFeed[];
  setRssFeeds: React.Dispatch<React.SetStateAction<RSSFeed[]>>;
  newsItems: NewsItem[];
  setNewsItems: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  newsPreferences: NewsPreferences;
  setNewsPreferences: React.Dispatch<React.SetStateAction<NewsPreferences>>;
  savedLinks: SavedLink[];
  setSavedLinks: React.Dispatch<React.SetStateAction<SavedLink[]>>;
  abilityModule: AbilityModuleSettings;
  spendSpecialReward: (moduleId: string, amount: number) => boolean;
  authToken: string;
  onUnauthorized: () => void;
  ideaNotes: IdeaNote[];
  setIdeaNotes: React.Dispatch<React.SetStateAction<IdeaNote[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  coreFocusTitle: string;
}) {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedNote, setSelectedNote] = useState<IdeaNote | null>(null);
  const [detailMode, setDetailMode] = useState<'news' | 'note' | null>(null);
  const [mainView, setMainView] = useState<'news' | 'notes'>('news');
  const [noteFilter, setNoteFilter] = useState<'all' | IdeaNote['note_type']>('all');
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('');
  const [newSavedLinkTitle, setNewSavedLinkTitle] = useState('');
  const [newSavedLinkUrl, setNewSavedLinkUrl] = useState('');
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isSyncingAllFeeds, setIsSyncingAllFeeds] = useState(false);
  const [syncingFeedIds, setSyncingFeedIds] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['默认']));
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<'idea' | 'resume_tracking' | 'general'>('general');
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [newNoteTagInput, setNewNoteTagInput] = useState('');
  const [resumeCompany, setResumeCompany] = useState('');
  const [resumePosition, setResumePosition] = useState('');
  const [resumeStatus, setResumeStatus] = useState<'pending' | 'interview' | 'rejected' | 'accepted'>('pending');
  const [resumeAppliedDate, setResumeAppliedDate] = useState('');
  const [resumeDeadline, setResumeDeadline] = useState('');
  const [rssScoutTopic, setRssScoutTopic] = useState('');
  const [rssScoutGuidance, setRssScoutGuidance] = useState('');
  const [rssScoutPayWith, setRssScoutPayWith] = useState<string>(SPECIAL_ABILITY_MODULES[0]?.id || 'special:mokugyo');
  const [rssScoutSummary, setRssScoutSummary] = useState('');
  const [rssScoutResults, setRssScoutResults] = useState<AIRssScoutSuggestion[]>([]);
  const [rssScoutError, setRssScoutError] = useState('');
  const [isRssScouting, setIsRssScouting] = useState(false);
  const [newsInsight, setNewsInsight] = useState<AIWorldNewsInsight | null>(null);
  const [newsInsightError, setNewsInsightError] = useState('');
  const [isGeneratingNewsInsight, setIsGeneratingNewsInsight] = useState(false);
  const [isImportingTechPresets, setIsImportingTechPresets] = useState(false);
  const [techPresetMessage, setTechPresetMessage] = useState('');
  const [rssActivityMessage, setRssActivityMessage] = useState('');
  const [workspaceMessage, setWorkspaceMessage] = useState('');

  const noteTypeOptions = [
    { type: 'all', label: '全部', icon: BookOpen },
    { type: 'idea', label: '想法', icon: Sparkles },
    { type: 'resume_tracking', label: '简历', icon: Briefcase },
    { type: 'general', label: '通用', icon: FileText },
  ] as const;

  const categories = Array.from(new Set(rssFeeds.map((item) => item.category || '默认'))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const enabledFeeds = rssFeeds.filter((feed) => feed.enabled);
  const visibleNewsItems = newsItems.filter((item) => !matchesIgnoredNews(item, newsPreferences.ignored_terms));
  const unreadCount = visibleNewsItems.filter((item) => !item.is_read).length;
  const importantCount = visibleNewsItems.filter((item) => item.is_important).length;
  const filteredNotes = [...ideaNotes]
    .filter((note) => noteFilter === 'all' ? true : note.note_type === noteFilter)
    .sort((a, b) => b.updated_at - a.updated_at);
  const sortedNews = [...visibleNewsItems].sort((a, b) => b.published_at - a.published_at);
  const triagedNews = sortedNews
    .map((news) => {
      const relevanceScore = scoreNewsRelevance(news, coreFocusTitle, tasks);
      const bucket = relevanceScore >= 6 ? 'focus' : relevanceScore >= 3 ? 'later' : 'ignore';
      return {
        news,
        relevanceScore,
        bucket,
        reason: explainNewsRelevance(relevanceScore, coreFocusTitle),
      };
    });
  const focusNews = triagedNews.filter((item) => item.bucket === 'focus');
  const laterNews = triagedNews.filter((item) => item.bucket === 'later');
  const ignoreNews = triagedNews.filter((item) => item.bucket === 'ignore');
  const aiWorthReading = (newsInsight?.worth_reading || [])
    .map((item) => {
      const matched = [...laterNews, ...ignoreNews, ...focusNews].find((entry) => entry.news.id === item.id);
      if (!matched) return null;
      return {
        news: matched.news,
        reason: item.reason || matched.reason,
      };
    })
    .filter((item): item is { news: NewsItem; reason: string } => Boolean(item));
  const detailVisible = Boolean(detailMode === 'news' ? selectedNews : detailMode === 'note' ? selectedNote : null);

  const closeDetail = () => {
    setDetailMode(null);
    setSelectedNews(null);
    setSelectedNote(null);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && detailVisible) {
        closeDetail();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [detailVisible]);

  useEffect(() => {
    if (detailVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [detailVisible]);

  useEffect(() => {
    setNewsInsight(null);
    setNewsInsightError('');
  }, [coreFocusTitle, newsItems.length]);

  const openNewsDetail = (news: NewsItem) => {
    const nextNews = news.is_read ? newsItems : newsItems.map((item) => item.id === news.id ? { ...item, is_read: true } : item);
    if (!news.is_read) {
      setNewsItems(nextNews);
    }
    setSelectedNote(null);
    setSelectedNews(nextNews.find((item) => item.id === news.id) || { ...news, is_read: true });
    setDetailMode('news');
  };

  const openNoteDetail = (note: IdeaNote) => {
    setSelectedNews(null);
    setSelectedNote(note);
    setDetailMode('note');
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const addRssFeed = () => {
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;
    const newFeed: RSSFeed = {
      id: `feed-${Date.now()}`,
      name: newFeedName.trim(),
      url: newFeedUrl.trim(),
      category: newFeedCategory.trim() || '默认',
      keywords: [],
      enabled: true,
      created_at: Date.now(),
    };
    setRssFeeds((prev) => [newFeed, ...prev]);
    setExpandedCategories((prev) => new Set(prev).add(newFeed.category));
    setNewFeedName('');
    setNewFeedUrl('');
    setNewFeedCategory('');
    setIsAddingFeed(false);
    setRssActivityMessage(`已添加订阅源：${newFeed.name}`);
  };

  const toggleFeed = (feedId: string) => {
    setRssFeeds((prev) => prev.map((feed) => feed.id === feedId ? { ...feed, enabled: !feed.enabled } : feed));
  };

  const deleteFeed = (feedId: string) => {
    const target = rssFeeds.find((feed) => feed.id === feedId);
    setRssFeeds((prev) => prev.filter((feed) => feed.id !== feedId));
    setRssActivityMessage(target ? `已删除订阅源：${target.name}` : '已删除订阅源。');
  };

  const toggleNewsImportant = (newsId: string) => {
    setNewsItems((prev) => prev.map((item) => item.id === newsId ? { ...item, is_important: !item.is_important } : item));
    setSelectedNews((prev) => prev?.id === newsId ? { ...prev, is_important: !prev.is_important } : prev);
  };

  const toggleNewsRead = (newsId: string) => {
    setNewsItems((prev) => prev.map((item) => item.id === newsId ? { ...item, is_read: !item.is_read } : item));
    setSelectedNews((prev) => prev?.id === newsId ? { ...prev, is_read: !prev.is_read } : prev);
  };

  const markNewsNotInterested = (news: NewsItem) => {
    const ignoredTerms = collectNewsPreferenceTerms(news);
    setNewsPreferences((prev) => ({
      ignored_terms: Array.from(new Set([...prev.ignored_terms, ...ignoredTerms])).slice(0, 200),
      updated_at: Date.now(),
    }));
    setNewsItems((prev) => prev.filter((item) => item.id !== news.id));
    setIdeaNotes((prev) => prev.map((note) => ({
      ...note,
      related_news_ids: note.related_news_ids.filter((id) => id !== news.id),
    })));
    if (selectedNews?.id === news.id) closeDetail();
    setWorkspaceMessage(`已忽略“${news.title}”的相关主题。`);
  };

  const deleteNewsItem = (newsId: string) => {
    setNewsItems((prev) => prev.filter((item) => item.id !== newsId));
    setIdeaNotes((prev) => prev.map((note) => ({ ...note, related_news_ids: note.related_news_ids.filter((id) => id !== newsId) })));
    if (selectedNews?.id === newsId) closeDetail();
    setWorkspaceMessage('已删除新闻。');
  };

  const deleteNote = (noteId: string) => {
    const target = ideaNotes.find((note) => note.id === noteId);
    setIdeaNotes((prev) => prev.filter((note) => note.id !== noteId));
    setNewsItems((prev) => prev.map((item) => item.note_ids.includes(noteId) ? { ...item, note_ids: item.note_ids.filter((id) => id !== noteId) } : item));
    if (selectedNote?.id === noteId) closeDetail();
    setWorkspaceMessage(target ? `已删除笔记：${target.title}` : '已删除笔记。');
  };

  const clearAllNews = () => {
    if (newsItems.length === 0) return;
    setNewsItems([]);
    setIdeaNotes((prev) => prev.map((note) => note.related_news_ids.length > 0 ? { ...note, related_news_ids: [] } : note));
    closeDetail();
    setWorkspaceMessage('新闻列表已清空。');
  };

  const addSavedLink = () => {
    const normalizedUrl = normalizeWebUrl(newSavedLinkUrl);
    if (!normalizedUrl) return;
    const title = newSavedLinkTitle.trim() || normalizedUrl;
    const nextLink: SavedLink = {
      id: `saved-link-${Date.now()}`,
      title,
      url: normalizedUrl,
      pinned: savedLinks.length === 0,
      created_at: Date.now(),
    };
    setSavedLinks((prev) => [nextLink, ...prev].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at - a.created_at));
    setNewSavedLinkTitle('');
    setNewSavedLinkUrl('');
    setWorkspaceMessage(`已收藏：${title}`);
  };

  const toggleSavedLinkPin = (linkId: string) => {
    setSavedLinks((prev) => prev
      .map((item) => item.id === linkId ? { ...item, pinned: !item.pinned } : item)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at - a.created_at));
  };

  const deleteSavedLink = (linkId: string) => {
    setSavedLinks((prev) => prev.filter((item) => item.id !== linkId));
  };

  const importFeeds = (feedsToImport: Array<{ name: string; url: string; category?: string; keywords?: string[] }>) => {
    const existingUrls = new Set(rssFeeds.map((item) => normalizeFeedUrl(item.url)));
    const createdAt = Date.now();
    const nextCategories = new Set<string>();
    const additions: RSSFeed[] = [];
    feedsToImport.forEach((feed, index) => {
      const normalizedUrl = normalizeFeedUrl(feed.url);
      if (!normalizedUrl || existingUrls.has(normalizedUrl)) return;
      existingUrls.add(normalizedUrl);
      const category = feed.category?.trim() || '默认';
      nextCategories.add(category);
      additions.push({
        id: `feed-${createdAt}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        name: feed.name.trim(),
        url: feed.url.trim(),
        category,
        keywords: (feed.keywords || []).filter((keyword) => keyword.trim().length > 0),
        enabled: true,
        created_at: createdAt,
      });
    });
    if (additions.length > 0) {
      setRssFeeds((prev) => [...additions, ...prev]);
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        nextCategories.forEach((category) => next.add(category));
        return next;
      });
    }
    return additions.length;
  };

  const addSuggestedFeed = (feed: AIRssScoutSuggestion) => {
    const addedCount = importFeeds([feed]);
    if (addedCount > 0) setRssActivityMessage(`已采纳订阅源：${feed.name}`);
  };

  const runWorldNewsInsight = async () => {
    const focusCandidates = focusNews.slice(0, 4).map((item) => item.news);
    const otherCandidates = [...laterNews, ...ignoreNews].slice(0, 10).map((item) => item.news);
    if (focusCandidates.length === 0 && otherCandidates.length === 0) return;

    setIsGeneratingNewsInsight(true);
    setNewsInsightError('');
    try {
      const result = await requestAIWorldNewsInsight({
        focus: coreFocusTitle,
        tasks: tasks.slice(0, 8).map((task) => ({
          title: task.title,
          status: task.status,
          category_key: task.category_key,
        })),
        focusCandidates,
        otherCandidates,
      }, authToken);
      setNewsInsight(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }
      setNewsInsightError(error instanceof Error ? error.message : 'AI 总结失败');
    } finally {
      setIsGeneratingNewsInsight(false);
    }
  };

  const importTechnicalPresets = async (limit: number) => {
    setIsImportingTechPresets(true);
    setTechPresetMessage('');
    try {
      const presets = await requestTechnicalRssPresets(authToken, limit);
      const addedCount = importFeeds(presets);
      setTechPresetMessage(addedCount > 0 ? `已导入 ${addedCount} 个技术 RSS 种子。` : '这些技术 RSS 已经都在当前订阅列表里了。');
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }
      setTechPresetMessage(err instanceof Error ? err.message : '技术 RSS 导入失败。');
    } finally {
      setIsImportingTechPresets(false);
    }
  };

  const runRssScout = async () => {
    const topic = rssScoutTopic.trim();
    const guidance = rssScoutGuidance.trim();
    if (!topic) {
      setRssScoutError('先输入要找的主题。');
      return;
    }
    const paymentModule = SPECIAL_ABILITY_MODULES.find((item) => item.id === rssScoutPayWith) || SPECIAL_ABILITY_MODULES[0];
    if (!paymentModule) {
      setRssScoutError('当前没有可用的激励方式。');
      return;
    }
    const balance = Number(abilityModule.special_totals[paymentModule.id] || 0);
    if (balance < RSS_SCOUT_COST) {
      setRssScoutError(`${paymentModule.label}余额不足，至少需要 ${RSS_SCOUT_COST} ${paymentModule.unit}。`);
      return;
    }
    setIsRssScouting(true);
    setRssScoutError('');
    setRssScoutSummary('');
    setRssScoutResults([]);
    try {
      const result = await requestAIRssScout({ topic, guidance }, authToken);
      const charged = spendSpecialReward(paymentModule.id, RSS_SCOUT_COST);
      if (!charged) {
        setRssScoutError('激励余额刚发生变化，请重试。');
        return;
      }
      setRssScoutSummary(result.summary || `已按“${topic}”筛出 ${result.feeds.length} 个 RSS 候选。`);
      setRssScoutResults(result.feeds);
      if (result.feeds.length === 0) {
        setRssScoutError('这次没有筛到足够可靠的订阅源，换一个方向词再试。');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }
      setRssScoutError(err instanceof Error ? err.message : 'AI 找订阅源失败，请稍后重试。');
    } finally {
      setIsRssScouting(false);
    }
  };

  const applyIncomingNews = (incomingItems: NewsItem[], replacedSourceKeys: Set<string>) => {
    const relatedNewsIds = new Set(ideaNotes.flatMap((note) => note.related_news_ids));
    let nextNewsItems: NewsItem[] = [];
    setNewsItems((prev) => {
      const currentItemsByFingerprint = new Map(prev.map((item) => {
        const sourceKey = item.feed_id || item.tags[0] || 'world';
        return [buildWorldNewsFingerprint(item.title, item.url, sourceKey), item] as const;
      }));
      const normalizedIncoming = incomingItems.map((item, index) => {
        const sourceKey = item.feed_id || item.tags[0] || 'world';
        const fingerprint = buildWorldNewsFingerprint(item.title, item.url, sourceKey);
        const existing = currentItemsByFingerprint.get(fingerprint);
        const fallbackTs = Date.now() - index * 1000;
        return {
          ...item,
          id: existing?.id || item.id || `news-${sourceKey}-${fingerprint}`,
          is_important: existing?.is_important || item.is_important,
          is_read: existing?.is_read || item.is_read,
          note_ids: existing?.note_ids || item.note_ids || [],
          published_at: item.published_at || existing?.published_at || fallbackTs,
          created_at: existing?.created_at || item.created_at || fallbackTs,
        };
      }).filter((item) => !matchesIgnoredNews(item, newsPreferences.ignored_terms));
      const nextFingerprints = new Set(normalizedIncoming.map((item) => {
        const sourceKey = item.feed_id || item.tags[0] || 'world';
        return buildWorldNewsFingerprint(item.title, item.url, sourceKey);
      }));
      const preservedItems = prev.filter((item) => {
        const sourceKey = item.feed_id || item.tags[0] || 'world';
        if (!replacedSourceKeys.has(sourceKey)) return true;
        const fingerprint = buildWorldNewsFingerprint(item.title, item.url, sourceKey);
        if (nextFingerprints.has(fingerprint)) return false;
        return item.is_important || relatedNewsIds.has(item.id);
      });
      nextNewsItems = [...normalizedIncoming, ...preservedItems].sort((a, b) => b.published_at - a.published_at);
      return nextNewsItems;
    });
    setSelectedNews((prev) => prev ? nextNewsItems.find((item) => item.id === prev.id) || null : null);
    return nextNewsItems;
  };

  const syncSingleFeed = async (feed: RSSFeed, silent = false) => {
    setSyncingFeedIds((prev) => prev.includes(feed.id) ? prev : [...prev, feed.id]);
    try {
      const result = await requestRssFeedSync({
        name: feed.name,
        url: feed.url,
        category: feed.category,
        keywords: feed.keywords,
        limit: 8,
      }, authToken);
      const sourceKey = `rss:${feed.id}`;
      const createdAt = Date.now();
      const incomingItems: NewsItem[] = result.items.map((item, index) => {
        const publishedAt = Date.parse(item.published_at);
        return {
          id: `news-${sourceKey}-${index}`,
          feed_id: sourceKey,
          title: item.title,
          content: summarizePreviewText(item.summary || item.source_title || item.title, 180),
          url: item.url,
          published_at: Number.isNaN(publishedAt) ? createdAt - index * 1000 : publishedAt,
          is_important: false,
          is_read: false,
          tags: Array.from(new Set(['RSS', feed.category, feed.name, ...feed.keywords.slice(0, 2)].filter(Boolean))),
          note_ids: [],
          created_at: createdAt - index * 1000,
        };
      });
      applyIncomingNews(incomingItems, new Set([sourceKey]));
      setRssFeeds((prev) => prev.map((item) => item.id === feed.id ? { ...item, last_fetched_at: Date.now() } : item));
      if (!silent) setRssActivityMessage(`已从 ${result.feed_title || feed.name} 同步 ${incomingItems.length} 条内容。`);
      return incomingItems.length;
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        onUnauthorized();
        return 0;
      }
      if (!silent) setRssActivityMessage(error instanceof Error ? error.message : 'RSS 同步失败。');
      throw error;
    } finally {
      setSyncingFeedIds((prev) => prev.filter((id) => id !== feed.id));
    }
  };

  const syncEnabledFeeds = async () => {
    if (enabledFeeds.length === 0) {
      setRssActivityMessage('先启用至少一个订阅源。');
      return;
    }
    setIsSyncingAllFeeds(true);
    setRssActivityMessage('');
    let successCount = 0;
    let syncedItems = 0;
    const failedFeeds: string[] = [];
    for (const feed of enabledFeeds) {
      try {
        syncedItems += await syncSingleFeed(feed, true);
        successCount += 1;
      } catch {
        failedFeeds.push(feed.name);
      }
    }
    setIsSyncingAllFeeds(false);
    setRssActivityMessage(failedFeeds.length === 0 ? `已同步 ${successCount} 个订阅源，共导入 ${syncedItems} 条新闻。` : `已同步 ${successCount} 个订阅源，共导入 ${syncedItems} 条新闻；失败：${failedFeeds.join('、')}`);
  };

  const createNoteFromNews = (news: NewsItem) => {
    const timestamp = Date.now();
    const newNote: IdeaNote = {
      id: `note-${timestamp}`,
      title: news.title,
      content: `# ${news.title}\n\n${news.content}\n\n${news.url ? `[原文链接](${news.url})` : ''}`.trim(),
      tags: news.tags,
      related_news_ids: [news.id],
      note_type: 'general',
      created_at: timestamp,
      updated_at: timestamp,
    };
    setIdeaNotes((prev) => [newNote, ...prev]);
    setNewsItems((prev) => prev.map((item) => item.id === news.id ? { ...item, note_ids: Array.from(new Set([...item.note_ids, newNote.id])) } : item));
    setMainView('notes');
    setNoteFilter('all');
    setSelectedNews(null);
    setSelectedNote(newNote);
    setDetailMode('note');
    setWorkspaceMessage('已从新闻生成笔记。');
  };

  const createTaskFromNews = (news: NewsItem) => {
    const timestamp = Date.now();
    const relevanceScore = scoreNewsRelevance(news, coreFocusTitle, tasks);
    const newTask = normalizeTask({
      id: `task-news-${timestamp}`,
      title: news.title,
      description: `${news.content}${news.url ? `\n\n来源：${news.url}` : ''}`,
      x: relevanceScore >= 6 ? 74 : 56,
      y: relevanceScore >= 6 ? 24 : 46,
      status: 'pending',
      timeline: 'temporary',
      dependency_ids: [],
      estimated_minutes: relevanceScore >= 6 ? 45 : 25,
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
      stress_score: relevanceScore >= 6 ? 4 : 2,
      energy_delta: -1,
      cognitive_load: relevanceScore >= 6 ? 'high' : 'low',
      collaboration_level: 'low',
      tracking_started_at: null,
      tracking_accumulated_ms: 0,
      ai_plan: '',
      steps: [],
      created_at: timestamp,
    } satisfies Partial<Task>);
    setTasks((prev) => [newTask, ...prev]);
    setWorkspaceMessage(`已把消息转成任务：${newTask.title}`);
  };

  const resetNoteComposer = () => {
    setIsCreatingNote(false);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteTags([]);
    setNewNoteTagInput('');
    setResumeCompany('');
    setResumePosition('');
    setResumeStatus('pending');
    setResumeAppliedDate('');
    setResumeDeadline('');
  };

  const createNewNote = () => {
    if (!newNoteTitle.trim()) return;
    const timestamp = Date.now();
    const newNote: IdeaNote = {
      id: `note-${timestamp}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      tags: newNoteTags,
      related_news_ids: [],
      note_type: newNoteType,
      created_at: timestamp,
      updated_at: timestamp,
    };
    if (newNoteType === 'resume_tracking') {
      newNote.metadata = {
        company: resumeCompany.trim(),
        position: resumePosition.trim(),
        status: resumeStatus,
        applied_at: resumeAppliedDate ? new Date(resumeAppliedDate).getTime() : timestamp,
        deadline: resumeDeadline ? new Date(resumeDeadline).getTime() : undefined,
      };
    }
    setIdeaNotes((prev) => [newNote, ...prev]);
    setNoteFilter(newNote.note_type);
    setSelectedNote(newNote);
    setSelectedNews(null);
    setDetailMode('note');
    resetNoteComposer();
    setWorkspaceMessage('笔记已保存。');
  };

  const addNoteTag = () => {
    const nextTag = newNoteTagInput.trim();
    if (!nextTag || newNoteTags.includes(nextTag)) return;
    setNewNoteTags((prev) => [...prev, nextTag]);
    setNewNoteTagInput('');
  };

  const removeNoteTag = (tag: string) => {
    setNewNoteTags((prev) => prev.filter((item) => item !== tag));
  };

  const convertNoteToTask = (note: IdeaNote) => {
    const lines = note.content.split('\n').filter((line) => line.trim());
    const description = lines.slice(0, 3).join('\n');
    let deadline: number | null = null;
    const dateMatch = note.content.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2})/);
    if (dateMatch) {
      const parsed = new Date(dateMatch[0]);
      if (!Number.isNaN(parsed.getTime())) deadline = parsed.getTime();
    }
    const timestamp = Date.now();
    const newTask: Task = {
      id: `task-${timestamp}`,
      title: note.title,
      description,
      x: 50,
      y: deadline ? 70 : 30,
      status: 'pending',
      timeline: deadline ? 'temporary' : 'long_term',
      dependency_ids: [],
      estimated_minutes: 60,
      actual_minutes: 0,
      deadline_at: deadline,
      steps: [],
      created_at: timestamp,
    };
    if (note.note_type === 'resume_tracking' && note.metadata) {
      newTask.title = `${note.metadata.company} - ${note.metadata.position}`;
      newTask.description = `公司：${note.metadata.company}\n职位：${note.metadata.position}\n状态：${note.metadata.status || 'pending'}`;
      if (note.metadata.deadline) {
        newTask.deadline_at = note.metadata.deadline;
        newTask.y = 80;
      }
    }
    setTasks((prev) => [...prev, newTask]);
    const updatedNote = { ...note, related_task_id: newTask.id, updated_at: Date.now() };
    setIdeaNotes((prev) => prev.map((item) => item.id === note.id ? updatedNote : item));
    setSelectedNote(updatedNote);
    setDetailMode('note');
    setWorkspaceMessage(`已创建任务：${newTask.title}`);
  };

  const fetchTrendradarNews = async () => {
    setIsLoadingNews(true);
    setWorkspaceMessage('');
    try {
      const result = await requestTrendradarLatestNews(authToken, 60);
      const createdAt = Date.now();
      const incomingItems: NewsItem[] = result.items.map((item, index) => {
        const sourceKey = `trendradar:${item.platform_id}`;
        const freshnessTag = result.source === 'trendradar-local' ? '本地快照' : '实时热点';
        const url = item.mobile_url || item.url || '';
        return {
          id: `news-${sourceKey}-${index}`,
          feed_id: sourceKey,
          title: item.title,
          content: `${item.platform_name} 热榜第 ${item.rank} 位 · ${item.timestamp}`,
          url,
          published_at: createdAt - index * 1000,
          is_important: false,
          is_read: false,
          tags: Array.from(new Set([item.platform_name, 'TrendRadar', freshnessTag])),
          note_ids: [],
          created_at: createdAt - index * 1000,
        };
      });
      const sourceKeys = new Set(incomingItems.map((item) => item.feed_id || 'world'));
      applyIncomingNews(incomingItems, sourceKeys);
      setWorkspaceMessage(result.source === 'trendradar-local' ? `已同步 ${incomingItems.length} 条 TrendRadar 热榜，本次使用本地快照回退。` : `已同步 ${incomingItems.length} 条 TrendRadar 实时热榜。`);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }
      setWorkspaceMessage(error instanceof Error ? error.message : 'TrendRadar 获取失败');
    } finally {
      setIsLoadingNews(false);
    }
  };

  return (
    <div className="world-news-shell flex h-full min-h-0 flex-1 overflow-hidden">
      <div className="grid h-full w-full min-h-0 gap-4 p-4 xl:grid-cols-[19rem_minmax(0,1fr)] xl:p-5">
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="world-news-panel min-h-0 overflow-hidden rounded-[2rem]"
        >
          <div className="world-news-scroll h-full overflow-y-auto px-4 py-4">
            <div className="grid gap-4">
              <div className="border-b border-white/8 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="world-news-kicker">订阅控制台</p>
                    <h2 className="mt-1 text-lg font-semibold text-[color:var(--text-strong)]">RSS 订阅源</h2>
                    <p className="mt-1 text-[11px] text-[color:var(--text-secondary)]">手动同步、导入种子、按需展开详情。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingFeed((prev) => !prev)}
                    className="world-news-icon-button"
                    title="添加订阅源"
                  >
                    {isAddingFeed ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="world-news-pill">{rssFeeds.length} 个源</span>
                  <span className="world-news-pill">{enabledFeeds.length} 个启用中</span>
                  <span className="world-news-pill">{newsItems.length} 条消息</span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isAddingFeed && (
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="world-news-section"
                  >
                    <div className="grid gap-3">
                      <input type="text" placeholder="订阅源名称" value={newFeedName} onChange={(event) => setNewFeedName(event.target.value)} className="world-news-input" />
                      <input type="text" placeholder="RSS / Atom URL" value={newFeedUrl} onChange={(event) => setNewFeedUrl(event.target.value)} className="world-news-input" />
                      <input type="text" placeholder="分类（可选）" value={newFeedCategory} onChange={(event) => setNewFeedCategory(event.target.value)} className="world-news-input" />
                      <div className="flex gap-2">
                        <button type="button" onClick={addRssFeed} className="world-news-button world-news-button-accent flex-1">保存订阅源</button>
                        <button type="button" onClick={() => setIsAddingFeed(false)} className="world-news-button flex-1">取消</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="world-news-section">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="world-news-kicker">手动同步</p>
                    <h3 className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">消息详情默认关闭</h3>
                    <p className="mt-1 text-[11px] leading-5 text-[color:var(--text-secondary)]">按需拉 RSS 或 TrendRadar，详情只在点击时从右侧抽出。</p>
                  </div>
                  <RefreshCw className="mt-1 h-4 w-4 text-[color:var(--accent)]" />
                </div>
                <div className="mt-3 grid gap-2">
                  <button type="button" onClick={syncEnabledFeeds} disabled={isSyncingAllFeeds || enabledFeeds.length === 0} className="world-news-button world-news-button-accent justify-center">
                    {isSyncingAllFeeds ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    同步已启用 RSS
                  </button>
                  <button type="button" onClick={fetchTrendradarNews} disabled={isLoadingNews} className="world-news-button justify-center">
                    {isLoadingNews ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    同步 TrendRadar
                  </button>
                </div>
                {rssActivityMessage && <div className="world-news-inline-message mt-3">{rssActivityMessage}</div>}
              </div>

              <div className="world-news-section">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="world-news-kicker">网页收藏夹</p>
                    <h3 className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">置顶你反复会开的链接</h3>
                  </div>
                  <span className="world-news-pill">{savedLinks.length} 条</span>
                </div>
                <div className="mt-3 grid gap-2">
                  <input type="text" value={newSavedLinkTitle} onChange={(event) => setNewSavedLinkTitle(event.target.value)} placeholder="标题（可选）" className="world-news-input" />
                  <div className="flex gap-2">
                    <input type="text" value={newSavedLinkUrl} onChange={(event) => setNewSavedLinkUrl(event.target.value)} placeholder="网页链接" className="world-news-input flex-1" />
                    <button type="button" onClick={addSavedLink} className="world-news-button world-news-button-accent">收藏</button>
                  </div>
                </div>
                <div className="world-news-scroll mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {savedLinks.length === 0 ? (
                    <div className="world-news-subcard text-[11px] leading-5 text-[color:var(--text-secondary)]">把常看的网页放在这里，后面就不用再翻标签页了。</div>
                  ) : savedLinks.map((link) => (
                    <div key={link.id} className="world-news-feed-row items-center gap-2">
                      <a href={link.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[color:var(--text-strong)]">{link.title}</p>
                        <p className="truncate text-[11px] text-[color:var(--text-secondary)]">{link.url}</p>
                      </a>
                      <button type="button" onClick={() => toggleSavedLinkPin(link.id)} className="world-news-icon-button" title={link.pinned ? '取消置顶' : '置顶'}>
                        <Star className={cn('h-4 w-4', link.pinned && 'fill-current')} />
                      </button>
                      <button type="button" onClick={() => deleteSavedLink(link.id)} className="world-news-icon-button" title="删除收藏">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {newsPreferences.ignored_terms.length > 0 && (
                <div className="world-news-section">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="world-news-kicker">忽略偏好</p>
                      <h3 className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">这些主题以后不再优先推</h3>
                    </div>
                    <span className="world-news-pill">{newsPreferences.ignored_terms.length}</span>
                  </div>
                  <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                    {newsPreferences.ignored_terms.slice(0, 24).map((term) => (
                      <span key={`ignored-${term}`} className="world-news-chip">{term}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="world-news-section">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="world-news-kicker">AI 订阅侦察</p>
                    <h3 className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">按主题找 RSS</h3>
                  </div>
                  <span className="world-news-pill">{RSS_SCOUT_COST} 点 / 次</span>
                </div>
                <div className="mt-3 grid gap-3">
                  <input type="text" value={rssScoutTopic} onChange={(event) => setRssScoutTopic(event.target.value)} placeholder="主题，例如：独立游戏 / AI 安全 / 开发博客" className="world-news-input" />
                  <textarea value={rssScoutGuidance} onChange={(event) => setRssScoutGuidance(event.target.value)} rows={3} placeholder="提示方向，例如：优先中文、长期更新、少营销号" className="world-news-input min-h-24 resize-none" />
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIAL_ABILITY_MODULES.map((module) => {
                      const balance = Number((abilityModule.special_totals[module.id] || 0).toFixed(1));
                      const active = rssScoutPayWith === module.id;
                      return (
                        <button key={module.id} type="button" onClick={() => setRssScoutPayWith(module.id)} data-active={active ? 'true' : 'false'} className="world-news-choice">
                          <span className="text-xs font-semibold">{module.label}</span>
                          <span className="text-[10px] text-[color:var(--text-secondary)]">{balance} {module.unit}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={runRssScout} disabled={isRssScouting || !rssScoutTopic.trim()} className="world-news-button world-news-button-accent justify-center">
                    {isRssScouting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    调用 AI 侦察
                  </button>
                  {rssScoutError && <div className="world-news-inline-message world-news-inline-message-warn">{rssScoutError}</div>}
                  {(rssScoutSummary || rssScoutResults.length > 0) && (
                    <div className="grid gap-2">
                      {rssScoutSummary && <p className="text-[11px] leading-5 text-[color:var(--text-secondary)]">{rssScoutSummary}</p>}
                      {rssScoutResults.map((feed) => {
                        const exists = rssFeeds.some((item) => normalizeFeedUrl(item.url) === normalizeFeedUrl(feed.url));
                        return (
                          <div key={feed.id} className="world-news-subcard">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-[color:var(--text-strong)]">{feed.name}</span>
                                  <span className="world-news-pill">{feed.category}</span>
                                </div>
                                <a href={feed.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] text-[color:var(--accent)]">
                                  <Link2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{feed.url}</span>
                                </a>
                                {feed.reason && <p className="mt-2 text-[11px] leading-5 text-[color:var(--text-secondary)]">{feed.reason}</p>}
                              </div>
                              <button type="button" disabled={exists} onClick={() => addSuggestedFeed(feed)} className="world-news-button shrink-0">
                                {exists ? '已添加' : '采纳'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="world-news-section">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="world-news-kicker">技术种子库</p>
                    <h3 className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">项目内置可直接导入</h3>
                  </div>
                  <Rss className="mt-1 h-4 w-4 text-[color:var(--accent)]" />
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => importTechnicalPresets(20)} disabled={isImportingTechPresets} className="world-news-button flex-1">
                    {isImportingTechPresets ? '导入中...' : '导入前 20 个'}
                  </button>
                  <button type="button" onClick={() => importTechnicalPresets(90)} disabled={isImportingTechPresets} className="world-news-button world-news-button-accent flex-1">
                    {isImportingTechPresets ? '导入中...' : '导入全部'}
                  </button>
                </div>
                {techPresetMessage && <div className="world-news-inline-message mt-3">{techPresetMessage}</div>}
              </div>

              <div>
                <p className="world-news-kicker">源列表</p>
                {categories.length === 0 ? (
                  <div className="world-news-empty mt-3">
                    <Rss className="h-8 w-8 text-[color:var(--text-muted)]" />
                    <p className="mt-3 text-sm font-semibold text-[color:var(--text-strong)]">还没有订阅源</p>
                    <p className="mt-1 text-[11px] text-[color:var(--text-secondary)]">先添加一个 RSS，再手动同步进消息列表。</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {categories.map((category) => (
                      <div key={category} className="world-news-category">
                        <button type="button" onClick={() => toggleCategory(category)} className="world-news-category-toggle">
                          <span className="flex items-center gap-2"><span className="world-news-category-dot" />{category}</span>
                          <ChevronDown className={cn('h-4 w-4 transition-transform', expandedCategories.has(category) && 'rotate-180')} />
                        </button>
                        <AnimatePresence initial={false}>
                          {expandedCategories.has(category) && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="mt-2 space-y-2">
                              {rssFeeds.filter((feed) => feed.category === category).map((feed) => {
                                const syncing = syncingFeedIds.includes(feed.id);
                                return (
                                  <div key={feed.id} className="world-news-feed-row">
                                    <label className="flex min-w-0 flex-1 items-start gap-3">
                                      <input type="checkbox" checked={feed.enabled} onChange={() => toggleFeed(feed.id)} className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent" />
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-[color:var(--text-strong)]">{feed.name}</span>
                                        <span className="mt-1 block truncate text-[11px] text-[color:var(--text-secondary)]">{formatCompactDateTime(feed.last_fetched_at)}</span>
                                      </span>
                                    </label>
                                    <div className="flex shrink-0 gap-1">
                                      <button type="button" onClick={() => syncSingleFeed(feed)} disabled={syncing} className="world-news-icon-button" title="同步订阅源">
                                        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                      </button>
                                      <button type="button" onClick={() => deleteFeed(feed.id)} className="world-news-icon-button" title="删除订阅源">
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/8 pt-4">
                <p className="world-news-kicker">笔记筛选</p>
                <div className="mt-3 grid gap-2">
                  {noteTypeOptions.map((option) => {
                    const Icon = option.icon;
                    const count = option.type === 'all' ? ideaNotes.length : ideaNotes.filter((note) => note.note_type === option.type).length;
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => {
                          setNoteFilter(option.type as 'all' | IdeaNote['note_type']);
                          setMainView('notes');
                          closeDetail();
                        }}
                        data-active={noteFilter === option.type ? 'true' : 'false'}
                        className="world-news-filter-row"
                      >
                        <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{option.label}</span>
                        <span>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.06, ease: 'easeOut' }}
          className="world-news-panel relative min-h-0 overflow-hidden rounded-[2rem]"
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-white/8 px-4 py-4 lg:px-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="world-news-kicker">世界消息工作台</p>
                    <h2 className="mt-1 text-xl font-semibold text-[color:var(--text-strong)]">{mainView === 'news' ? '消息流' : '笔记流'}</h2>
                    <p className="mt-1 text-[11px] text-[color:var(--text-secondary)]">列表固定在当前视口内滚动，详情按需抽出，不再常驻占位。</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { closeDetail(); setMainView('news'); }} data-active={mainView === 'news' ? 'true' : 'false'} className="world-news-tab">
                      <Globe className="h-4 w-4" />
                      新闻 {newsItems.length}
                    </button>
                    <button type="button" onClick={() => { closeDetail(); setMainView('notes'); }} data-active={mainView === 'notes' ? 'true' : 'false'} className="world-news-tab">
                      <FileText className="h-4 w-4" />
                      笔记 {ideaNotes.length}
                    </button>
                    {mainView === 'news' ? (
                      <>
                        <button type="button" onClick={fetchTrendradarNews} disabled={isLoadingNews} className="world-news-button">
                          {isLoadingNews ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                          TrendRadar
                        </button>
                        <button type="button" onClick={clearAllNews} disabled={newsItems.length === 0} className="world-news-button world-news-button-danger">
                          <Trash2 className="h-4 w-4" />
                          清空新闻
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setIsCreatingNote((prev) => !prev)} className="world-news-button world-news-button-accent">
                        <Plus className="h-4 w-4" />
                        {isCreatingNote ? '收起编辑器' : '新建笔记'}
                      </button>
                    )}
                    {detailVisible && (
                      <button type="button" onClick={closeDetail} className="world-news-button">
                        <EyeOff className="h-4 w-4" />
                        关闭详情
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="world-news-pill">{enabledFeeds.length} 个订阅源启用中</span>
                  <span className="world-news-pill">{unreadCount} 条未读</span>
                  <span className="world-news-pill">{importantCount} 条重点</span>
                  {mainView === 'notes' && <span className="world-news-pill">{filteredNotes.length} 条已显示</span>}
                </div>

                {mainView === 'news' && (
                  <div className="grid gap-3 xl:grid-cols-3">
                    <div className="rounded-[1.25rem] border border-rose-300/20 bg-rose-500/10 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-100/75">和主线相关</p>
                      <p className="mt-2 text-lg font-semibold text-white">{focusNews.length} 条</p>
                      <p className="mt-2 text-[11px] leading-5 text-rose-100/80 text-safe-wrap">优先处理和“{coreFocusTitle}”相关的消息。</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-slate-300/20 bg-slate-500/10 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100">晚点再看</p>
                      <p className="mt-2 text-lg font-semibold text-white">{laterNews.length} 条</p>
                      <p className="mt-2 text-[12px] leading-6 text-slate-100">可能相关，但不值得现在打断主线。</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-zinc-300/20 bg-zinc-500/10 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-100">可忽略</p>
                      <p className="mt-2 text-lg font-semibold text-white">{ignoreNews.length} 条</p>
                      <p className="mt-2 text-[12px] leading-6 text-zinc-100">先不让这些信息抢走注意力。</p>
                    </div>
                  </div>
                )}

                {workspaceMessage && <div className="world-news-inline-message">{workspaceMessage}</div>}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-4 lg:px-5">
              <div className="h-full">
                {mainView === 'news' ? (
                  sortedNews.length === 0 ? (
                    <div className="world-news-empty h-full">
                      <Globe className="h-10 w-10 text-[color:var(--text-muted)]" />
                      <p className="mt-3 text-base font-semibold text-[color:var(--text-strong)]">消息列表还是空的</p>
                      <p className="mt-2 max-w-md text-center text-[11px] leading-5 text-[color:var(--text-secondary)]">你可以同步 TrendRadar，也可以同步左侧 RSS 订阅源。详情页不会常驻，点卡片时才会从右侧抽出。</p>
                    </div>
                  ) : (
                    <div className="world-news-scroll h-full overflow-y-auto pr-1">
                      <div className="mb-4 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="world-news-kicker">AI 洞察</p>
                            <h3 className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">从未优先项里捞重点，顺手压缩噪音</h3>
                            <p className="mt-2 text-[11px] leading-5 text-[color:var(--text-secondary)]">
                              {newsInsight?.summary || (focusNews.length === 0
                                ? '当前“值得看”为空，主要因为现在还是本地规则先做匹配。这里可以再让 AI 从剩余消息里捞一遍。'
                                : '本地规则已经先分过层，AI 会继续对没排到前面的消息做归纳和提炼。')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={runWorldNewsInsight}
                            disabled={isGeneratingNewsInsight || (focusNews.length === 0 && laterNews.length === 0 && ignoreNews.length === 0)}
                            className="world-news-button world-news-button-accent shrink-0"
                          >
                            {isGeneratingNewsInsight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            {newsInsight ? '重新生成洞察' : 'AI 总结未优先项'}
                          </button>
                        </div>
                        {newsInsightError && <div className="world-news-inline-message world-news-inline-message-warn mt-3">{newsInsightError}</div>}
                        {(aiWorthReading.length > 0 || newsInsight?.skip_summary || (newsInsight?.ideas?.length || 0) > 0 || (newsInsight?.next_actions?.length || 0) > 0) && (
                          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                            <div className="grid gap-3">
                              <div className="world-news-subcard">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">AI 认为值得看</p>
                                <div className="mt-3 grid gap-2">
                                  {aiWorthReading.length === 0 ? (
                                    <p className="text-[11px] leading-5 text-[color:var(--text-secondary)]">这一轮没有从未优先项里捞出必须马上读的内容。</p>
                                  ) : aiWorthReading.map(({ news, reason }) => (
                                    <button
                                      key={`ai-worth-${news.id}`}
                                      type="button"
                                      onClick={() => openNewsDetail(news)}
                                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition-colors hover:bg-white/[0.08]"
                                    >
                                      <p className="text-sm font-semibold text-[color:var(--text-strong)] line-clamp-2">{news.title}</p>
                                      <p className="mt-1 text-[11px] leading-5 text-[color:var(--text-secondary)] line-clamp-3">{reason}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {newsInsight?.skip_summary && (
                                <div className="world-news-subcard">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">先不看的原因</p>
                                  <p className="mt-3 text-[12px] leading-6 text-[color:var(--text-secondary)] text-safe-wrap">{newsInsight.skip_summary}</p>
                                </div>
                              )}
                            </div>
                            <div className="grid gap-3">
                              {(newsInsight?.ideas?.length || 0) > 0 && (
                                <div className="world-news-subcard">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">AI 的想法</p>
                                  <div className="mt-3 grid gap-2">
                                    {newsInsight?.ideas.map((idea, index) => (
                                      <div key={`insight-idea-${index}`} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[12px] leading-6 text-[color:var(--text-secondary)] text-safe-wrap">
                                        {idea}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(newsInsight?.next_actions?.length || 0) > 0 && (
                                <div className="world-news-subcard">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">下一步</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {newsInsight?.next_actions.map((action, index) => (
                                      <span key={`insight-action-${index}`} className="world-news-pill text-safe-wrap">
                                        {action}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="world-news-news-summary mb-4 grid gap-3 lg:grid-cols-3">
                        {[
                          { title: '当前值得看', items: focusNews, tone: 'border-rose-300/20 bg-rose-500/10 text-rose-100' },
                          { title: '稍后处理', items: laterNews, tone: 'border-slate-300/20 bg-slate-500/10 text-slate-100' },
                          { title: '先忽略', items: ignoreNews, tone: 'border-zinc-300/20 bg-zinc-500/10 text-zinc-100' },
                        ].map((section) => (
                          <div key={section.title} className={cn("rounded-[1.2rem] border p-4", section.tone)}>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em]">{section.title}</p>
                            <div className="mt-3 grid gap-2">
                              {section.items.length === 0 ? (
                                <p className="text-[11px] leading-5 opacity-80">
                                  {section.title === '当前值得看'
                                    ? '本地规则暂时没有命中，可以用上面的 AI 洞察再捞一轮。'
                                    : '当前没有这一类消息。'}
                                </p>
                              ) : section.items.slice(0, 2).map(({ news, reason }) => (
                                <button
                                  key={`triage-${section.title}-${news.id}`}
                                  type="button"
                                  onClick={() => openNewsDetail(news)}
                                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition-colors hover:bg-white/[0.08]"
                                >
                                  <p className="text-sm font-semibold text-white line-clamp-2">{news.title}</p>
                                  <p className="mt-1 text-[11px] leading-5 text-current/75 line-clamp-2">{reason}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="world-news-news-list grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                        {triagedNews.map(({ news, reason, bucket }) => (
                          <motion.article
                            key={news.id}
                            layout
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            data-active={detailMode === 'news' && selectedNews?.id === news.id ? 'true' : 'false'}
                            data-muted={news.is_read ? 'true' : 'false'}
                            className="world-news-card group cursor-pointer"
                            onClick={() => openNewsDetail(news)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap gap-2">
                                  <span className="world-news-pill">{formatCompactDateTime(news.published_at)}</span>
                                  <span className="world-news-pill">{bucket === 'focus' ? '和主线相关' : bucket === 'later' ? '晚点再看' : '先忽略'}</span>
                                  {news.is_important && <span className="world-news-pill">重点</span>}
                                  {news.note_ids.length > 0 && <span className="world-news-pill">{news.note_ids.length} 条关联笔记</span>}
                                </div>
                                <h3 className="mt-3 text-sm font-semibold leading-6 text-[color:var(--text-strong)] line-clamp-2">{news.title}</h3>
                                <p className="mt-2 text-[12px] leading-6 text-[color:var(--text-secondary)] line-clamp-3">{news.content}</p>
                                <p className="mt-2 text-[11px] leading-5 text-[color:var(--text-secondary)] line-clamp-2">{reason}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {news.tags.slice(0, 4).map((tag) => (
                                    <span key={`${news.id}-${tag}`} className="world-news-chip">{tag}</span>
                                  ))}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={(event) => { event.stopPropagation(); createTaskFromNews(news); }} className="world-news-button world-news-button-accent">
                                  <ListTodo className="h-4 w-4" />
                                  转任务
                                </button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); createNoteFromNews(news); }} className="world-news-button">
                                  <Edit3 className="h-4 w-4" />
                                  转笔记
                                </button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); markNewsNotInterested(news); }} className="world-news-button">
                                  <EyeOff className="h-4 w-4" />
                                  不感兴趣
                                </button>
                              </div>
                              </div>
                              <div className="flex shrink-0 flex-col gap-2 opacity-85 transition-opacity group-hover:opacity-100">
                                <button type="button" onClick={(event) => { event.stopPropagation(); toggleNewsImportant(news.id); }} className="world-news-icon-button" title="标记重点">
                                  <Star className={cn('h-4 w-4', news.is_important && 'fill-current')} />
                                </button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); toggleNewsRead(news.id); }} className="world-news-icon-button" title="切换已读">
                                  {news.is_read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); deleteNewsItem(news.id); }} className="world-news-icon-button" title="删除新闻">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </motion.article>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="world-news-scroll h-full overflow-y-auto pr-1">
                    <AnimatePresence initial={false}>
                      {isCreatingNote && (
                        <motion.div
                          initial={{ opacity: 0, y: -12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          className="world-news-section mb-4"
                        >
                          <div className="grid gap-3">
                            <div className="grid gap-2 sm:grid-cols-3">
                              {noteTypeOptions.filter((option) => option.type !== 'all').map((option) => (
                                <button
                                  key={option.type}
                                  type="button"
                                  data-active={newNoteType === option.type ? 'true' : 'false'}
                                  onClick={() => setNewNoteType(option.type as IdeaNote['note_type'])}
                                  className="world-news-choice justify-center"
                                >
                                  <span className="text-xs font-semibold">{option.label}</span>
                                </button>
                              ))}
                            </div>
                            <input type="text" placeholder="笔记标题" value={newNoteTitle} onChange={(event) => setNewNoteTitle(event.target.value)} className="world-news-input" />
                            {newNoteType === 'resume_tracking' && (
                              <div className="grid gap-3 md:grid-cols-2">
                                <input type="text" value={resumeCompany} onChange={(event) => setResumeCompany(event.target.value)} placeholder="公司名称" className="world-news-input" />
                                <input type="text" value={resumePosition} onChange={(event) => setResumePosition(event.target.value)} placeholder="职位名称" className="world-news-input" />
                                <select value={resumeStatus} onChange={(event) => setResumeStatus(event.target.value as 'pending' | 'interview' | 'rejected' | 'accepted')} className="world-news-input">
                                  <option value="pending">待定</option>
                                  <option value="interview">面试中</option>
                                  <option value="rejected">已拒绝</option>
                                  <option value="accepted">已通过</option>
                                </select>
                                <input type="date" value={resumeAppliedDate} onChange={(event) => setResumeAppliedDate(event.target.value)} className="world-news-input" />
                                <input type="date" value={resumeDeadline} onChange={(event) => setResumeDeadline(event.target.value)} className="world-news-input md:col-span-2" />
                              </div>
                            )}
                            <textarea rows={7} placeholder="记录你的想法、摘要或下一步。" value={newNoteContent} onChange={(event) => setNewNoteContent(event.target.value)} className="world-news-input min-h-40 resize-y" />
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="text"
                                placeholder="输入标签后回车"
                                value={newNoteTagInput}
                                onChange={(event) => setNewNoteTagInput(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    addNoteTag();
                                  }
                                }}
                                className="world-news-input flex-1"
                              />
                              <button type="button" onClick={addNoteTag} className="world-news-button">添加标签</button>
                            </div>
                            {newNoteTags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {newNoteTags.map((tag) => (
                                  <button key={tag} type="button" onClick={() => removeNoteTag(tag)} className="world-news-chip">
                                    {tag} <X className="h-3 w-3" />
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={createNewNote} className="world-news-button world-news-button-accent"><Save className="h-4 w-4" />保存笔记</button>
                              <button type="button" onClick={resetNoteComposer} className="world-news-button"><X className="h-4 w-4" />取消</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {filteredNotes.length === 0 ? (
                      <div className="world-news-empty min-h-[22rem]">
                        <FileText className="h-10 w-10 text-[color:var(--text-muted)]" />
                        <p className="mt-3 text-base font-semibold text-[color:var(--text-strong)]">这个筛选下还没有笔记</p>
                        <p className="mt-2 max-w-md text-center text-[11px] leading-5 text-[color:var(--text-secondary)]">你可以手动新建，也可以从新闻详情里一键转成笔记。</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {filteredNotes.map((note) => (
                          <motion.article
                            key={note.id}
                            layout
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            data-active={detailMode === 'note' && selectedNote?.id === note.id ? 'true' : 'false'}
                            className="world-news-card group cursor-pointer"
                            onClick={() => openNoteDetail(note)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap gap-2">
                                  <span className="world-news-pill">{formatCompactDateTime(note.updated_at)}</span>
                                  <span className="world-news-pill">{note.note_type === 'idea' ? '想法' : note.note_type === 'resume_tracking' ? '简历' : '通用'}</span>
                                  {note.related_task_id && <span className="world-news-pill">已转任务</span>}
                                </div>
                                <h3 className="mt-3 text-sm font-semibold leading-6 text-[color:var(--text-strong)] line-clamp-2">{note.title}</h3>
                                <p className="mt-2 text-[12px] leading-6 text-[color:var(--text-secondary)] line-clamp-3">{note.content.replace(/[#*_`>\\[\\]\\(\\)]/g, ' ')}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {note.tags.slice(0, 4).map((tag) => (
                                    <span key={`${note.id}-${tag}`} className="world-news-chip">{tag}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col gap-2 opacity-85 transition-opacity group-hover:opacity-100">
                                <button type="button" onClick={(event) => { event.stopPropagation(); deleteNote(note.id); }} className="world-news-icon-button" title="删除笔记">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </motion.article>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <AnimatePresence>
              {detailVisible && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="world-news-modal-backdrop fixed inset-0 z-40 flex items-center justify-center p-4"
                    onClick={closeDetail}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: 20 }}
                      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                      className="world-news-modal-panel w-full max-w-3xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                    {detailMode === 'news' && selectedNews ? (
                      <>
                        <div className="border-b border-white/8 px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="world-news-kicker">消息详情</p>
                              <h3 className="mt-1 text-lg font-semibold leading-7 text-[color:var(--text-strong)]">{selectedNews.title}</h3>
                            </div>
                            <button type="button" onClick={closeDetail} className="world-news-icon-button"><X className="h-4 w-4" /></button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="world-news-pill">{formatCompactDateTime(selectedNews.published_at)}</span>
                            {selectedNews.tags.map((tag) => <span key={`${selectedNews.id}-${tag}`} className="world-news-chip">{tag}</span>)}
                          </div>
                        </div>
                        <div className="world-news-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4">
                          <div className="world-news-detail-copy"><p>{selectedNews.content}</p></div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedNews.url && <a href={selectedNews.url} target="_blank" rel="noopener noreferrer" className="world-news-button"><ExternalLink className="h-4 w-4" />查看原文</a>}
                            <button type="button" onClick={() => createTaskFromNews(selectedNews)} className="world-news-button world-news-button-accent"><ListTodo className="h-4 w-4" />转成任务</button>
                            <button type="button" onClick={() => createNoteFromNews(selectedNews)} className="world-news-button world-news-button-accent"><Edit3 className="h-4 w-4" />转成笔记</button>
                            <button type="button" onClick={() => deleteNewsItem(selectedNews.id)} className="world-news-button world-news-button-danger"><Trash2 className="h-4 w-4" />删除新闻</button>
                          </div>
                        </div>
                      </>
                    ) : detailMode === 'note' && selectedNote ? (
                      <>
                        <div className="border-b border-white/8 px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="world-news-kicker">笔记详情</p>
                              <h3 className="mt-1 text-lg font-semibold leading-7 text-[color:var(--text-strong)]">{selectedNote.title}</h3>
                            </div>
                            <button type="button" onClick={closeDetail} className="world-news-icon-button"><X className="h-4 w-4" /></button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="world-news-pill">{selectedNote.note_type === 'idea' ? '想法' : selectedNote.note_type === 'resume_tracking' ? '简历跟踪' : '通用'}</span>
                            <span className="world-news-pill">{formatCompactDateTime(selectedNote.updated_at)}</span>
                            {selectedNote.tags.map((tag) => <span key={`${selectedNote.id}-${tag}`} className="world-news-chip">{tag}</span>)}
                          </div>
                        </div>
                        <div className="world-news-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4">
                          {selectedNote.note_type === 'resume_tracking' && selectedNote.metadata && (
                            <div className="world-news-section mb-4">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div><p className="world-news-kicker">公司</p><p className="mt-1 text-sm text-[color:var(--text-strong)]">{selectedNote.metadata.company || '-'}</p></div>
                                <div><p className="world-news-kicker">职位</p><p className="mt-1 text-sm text-[color:var(--text-strong)]">{selectedNote.metadata.position || '-'}</p></div>
                                <div><p className="world-news-kicker">状态</p><p className="mt-1 text-sm text-[color:var(--text-strong)]">{selectedNote.metadata.status || 'pending'}</p></div>
                                <div><p className="world-news-kicker">投递时间</p><p className="mt-1 text-sm text-[color:var(--text-strong)]">{formatCompactDateTime(selectedNote.metadata.applied_at)}</p></div>
                              </div>
                            </div>
                          )}
                          <div className="world-news-markdown rounded-[1.5rem] border border-white/8 px-4 py-4"><Markdown>{selectedNote.content}</Markdown></div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedNote.related_task_id ? (
                              <span className="world-news-pill flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />已关联任务</span>
                            ) : (
                              <button type="button" onClick={() => convertNoteToTask(selectedNote)} className="world-news-button world-news-button-accent"><ListTodo className="h-4 w-4" />转为任务</button>
                            )}
                            <button type="button" onClick={() => deleteNote(selectedNote.id)} className="world-news-button world-news-button-danger"><Trash2 className="h-4 w-4" />删除笔记</button>
                          </div>
                        </div>
                      </>
                    ) : null}
                    </motion.div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

export default function App() {
  const [authToken, setAuthToken] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) || '' : ''));
  const [authUser, setAuthUser] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginError, setLoginError] = useState('');
  const [isBehaviorChatOpen, setIsBehaviorChatOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window === 'undefined') return 'night';
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.some((option) => option.id === savedTheme) ? savedTheme as AppTheme : 'night';
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [abilityDimensions, setAbilityDimensions] = useState<string[]>([]);
  const [wellbeing, setWellbeing] = useState<WellbeingSettings>(createDefaultWellbeingSettings());
  const [abilityModule, setAbilityModule] = useState<AbilityModuleSettings>(createDefaultAbilityModuleSettings());
  const [aiDayPlan, setAiDayPlan] = useState<AIDayPlanWorkspace>(createDefaultAIDayPlanWorkspace());
  const [homeSurface, setHomeSurface] = useState<'status' | 'line' | 'map'>('line');
  const motivationPanelEnabled = false;
  const [primaryTaskId, setPrimaryTaskId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(PRIMARY_TASK_STORAGE_KEY) || '';
  });
  const [focusReminderSettings, setFocusReminderSettings] = useState<FocusReminderSettings>(createDefaultFocusReminderSettings());
  const [rssFeeds, setRssFeeds] = useState<RSSFeed[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [ideaNotes, setIdeaNotes] = useState<IdeaNote[]>([]);
  const [newsPreferences, setNewsPreferences] = useState<NewsPreferences>(createDefaultNewsPreferences());
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [currentView, setCurrentView] = useState<'tasks' | 'world_news' | 'admin'>('tasks');
  const [newAbilityDimension, setNewAbilityDimension] = useState('');
  const [behaviorChatInput, setBehaviorChatInput] = useState('');
  const [behaviorChatError, setBehaviorChatError] = useState('');
  const [isBehaviorChatSending, setIsBehaviorChatSending] = useState(false);
  const [behaviorNudge, setBehaviorNudge] = useState('');
  const [live2dUiAnchor, setLive2dUiAnchor] = useState({ right: 20, top: 120, height: LIVE2D_MODEL_HEIGHT });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingDayPlan, setIsGeneratingDayPlan] = useState(false);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [isTopBoardCollapsed, setIsTopBoardCollapsed] = useState(true);
  const [isMotivationPanelOpen, setIsMotivationPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDesignPanelOpen, setIsDesignPanelOpen] = useState(false);
  const [shouldBootLive2d, setShouldBootLive2d] = useState(false);
  const [isLive2dReady, setIsLive2dReady] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  const [aiError, setAiError] = useState('');
  const [dayPlanError, setDayPlanError] = useState('');
  const [calendarSubscription, setCalendarSubscription] = useState<CalendarSubscriptionInfo | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [draggedLineTaskId, setDraggedLineTaskId] = useState<string | null>(null);
  const live2dControllerRef = useRef<Live2dController | null>(null);
  const live2dModelRef = useRef<{
    expression?: (id?: number | string) => Promise<boolean>;
    motion?: (group: string, index?: number, priority?: number) => Promise<boolean>;
    internalModel?: {
      motionManager?: {
        startMotion?: (group: string, index: number, priority?: number) => Promise<boolean> | boolean;
        expressionManager?: {
          setExpression?: (id: number | string) => Promise<boolean> | boolean;
          resetExpression?: () => void;
        };
      };
    };
  } | null>(null);
  const behaviorChatViewportRef = useRef<HTMLDivElement | null>(null);
  const [dragOverLineTaskId, setDragOverLineTaskId] = useState<string | null>(null);
  const [dragOverLineZone, setDragOverLineZone] = useState<'before' | 'after' | 'overlap' | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [focusCheckin, setFocusCheckin] = useState<AIFocusCheckin | null>(null);
  const [isGeneratingFocusCheckin, setIsGeneratingFocusCheckin] = useState(false);
  const [focusCheckinError, setFocusCheckinError] = useState('');
  const [lastFocusCheckinAt, setLastFocusCheckinAt] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  );

  const quadrantRef = useRef<HTMLDivElement>(null);
  const hasHydratedRef = useRef(false);
  const topBoardDragStateRef = useRef<{ startY: number; collapsed: boolean } | null>(null);
  const behaviorNudgeTimeoutRef = useRef<number | null>(null);
  const live2dWidgetAnimationRef = useRef<Animation | null>(null);

  const syncLive2dUiAnchor = (element?: HTMLElement | null) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const container = element || (document.querySelector('.live2d-wrapper') as HTMLElement | null);
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setLive2dUiAnchor({
      right: Math.max(12, window.innerWidth - rect.right),
      top: Math.max(16, rect.top),
      height: rect.height,
    });
  };

  const showBehaviorNudge = (text: string, durationMs = 3600) => {
    if (typeof window === 'undefined') {
      setBehaviorNudge(text);
      return;
    }
    if (behaviorNudgeTimeoutRef.current) {
      window.clearTimeout(behaviorNudgeTimeoutRef.current);
      behaviorNudgeTimeoutRef.current = null;
    }
    setBehaviorNudge(text);
    behaviorNudgeTimeoutRef.current = window.setTimeout(() => {
      setBehaviorNudge('');
      behaviorNudgeTimeoutRef.current = null;
    }, durationMs);
  };

  const playLive2dAction = async (actionId: Live2dActionId, nudgeText?: string) => {
    const model = live2dModelRef.current;
    const actionConfig = LIVE2D_ACTION_CONFIGS[actionId];
    const live2dContainer =
      typeof document !== 'undefined'
        ? (document.querySelector('.live2d-wrapper') as HTMLElement | null)
        : null;

    live2dWidgetAnimationRef.current?.cancel();
    if (live2dContainer && actionConfig?.widgetKeyframes?.length) {
      live2dWidgetAnimationRef.current = live2dContainer.animate(actionConfig.widgetKeyframes, {
        duration: actionConfig.widgetDurationMs ?? 820,
        easing: actionConfig.widgetEasing ?? 'ease-out',
        fill: 'none',
      });
    }

    if (!model) {
      if (nudgeText) {
        showBehaviorNudge(nudgeText);
      }
      return {
        modelReady: false,
        motionTriggered: false,
        expressionTriggered: false,
      };
    }

    let motionTriggered = false;
    let expressionTriggered = false;

    try {
      if (actionConfig?.useTapMotion) {
        motionTriggered = Boolean(
          await model.motion?.(
            LIVE2D_TAP_MOTION_GROUP,
            LIVE2D_TAP_MOTION_INDEX,
            LIVE2D_FORCE_MOTION_PRIORITY
          )
        );
        if (!motionTriggered) {
          motionTriggered = Boolean(
            await model.internalModel?.motionManager?.startMotion?.(
              LIVE2D_TAP_MOTION_GROUP,
              LIVE2D_TAP_MOTION_INDEX,
              LIVE2D_FORCE_MOTION_PRIORITY
            )
          );
        }
        await new Promise((resolve) => window.setTimeout(resolve, 40));
      }
    } catch (error) {
      console.debug('Live2D motion trigger skipped', error);
    }

    try {
      if (actionId === 'idle' || !actionConfig?.expressionId) {
        model.internalModel?.motionManager?.expressionManager?.resetExpression?.();
        expressionTriggered = true;
      } else if (typeof model.expression === 'function') {
        expressionTriggered = Boolean(await model.expression(actionConfig.expressionId));
        if (!expressionTriggered && typeof actionConfig.expressionIndex === 'number') {
          expressionTriggered = Boolean(await model.expression(actionConfig.expressionIndex));
        }
      } else {
        expressionTriggered = Boolean(
          await model.internalModel?.motionManager?.expressionManager?.setExpression?.(actionConfig.expressionId)
        );
        if (!expressionTriggered && typeof actionConfig.expressionIndex === 'number') {
          expressionTriggered = Boolean(
            await model.internalModel?.motionManager?.expressionManager?.setExpression?.(actionConfig.expressionIndex)
          );
        }
      }
    } catch (error) {
      console.debug('Live2D expression trigger skipped', error);
    }

    if (nudgeText) {
      showBehaviorNudge(nudgeText);
    }

    return {
      modelReady: true,
      motionTriggered,
      expressionTriggered,
    };
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (homeSurface === 'status') {
      setHomeSurface('line');
    }
  }, [homeSurface]);

  useEffect(() => {
    if (typeof window === 'undefined' || !authToken) return;
    const timer = window.setTimeout(() => {
      setShouldBootLive2d(true);
    }, LIVE2D_BOOT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [authToken]);

  useEffect(() => {
    if (authToken && isBehaviorChatOpen) {
      setShouldBootLive2d(true);
    }
  }, [authToken, isBehaviorChatOpen]);

  useEffect(() => {
    if (!authToken || !shouldBootLive2d || !isLive2dReady || currentView !== 'tasks') return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let timer: number | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      const delayMs = 45000 + Math.floor(Math.random() * 35000);
      timer = window.setTimeout(async () => {
        if (cancelled || isBehaviorChatOpen) {
          scheduleNext();
          return;
        }
        const nextAction =
          LIVE2D_AUTOPLAY_ACTIONS[Math.floor(Math.random() * LIVE2D_AUTOPLAY_ACTIONS.length)] || 'pet';
        await playLive2dAction(nextAction);
        scheduleNext();
      }, delayMs);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [authToken, shouldBootLive2d, isLive2dReady, currentView, isBehaviorChatOpen]);

  useEffect(() => {
    if (!authToken || !shouldBootLive2d) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let disposed = false;
    let bindTimer: number | null = null;
    let pointerStart: { x: number; y: number } | null = null;
    let pointerMoved = false;

    setIsLive2dReady(false);
    live2dControllerRef.current?.destroy();
    document.querySelectorAll('.live2d-wrapper, .live2d-toggle').forEach((node) => node.remove());

    const bindWidgetClick = () => {
      const container = document.querySelector('.live2d-wrapper') as HTMLElement | null;
      if (!container) return false;

      container.style.cursor = 'grab';
      container.style.width = `${LIVE2D_MODEL_WIDTH}px`;
      container.style.height = `${LIVE2D_MODEL_HEIGHT}px`;
      container.style.left = 'auto';
      container.style.right = `${LIVE2D_WIDGET_OFFSET_RIGHT}px`;
      container.style.bottom = `${LIVE2D_WIDGET_OFFSET_BOTTOM}px`;
      container.style.transformOrigin = 'right bottom';
      container.style.transform = 'none';
      syncLive2dUiAnchor(container);
      if (container.dataset.codexBound !== 'true') {
        container.dataset.codexBound = 'true';
        container.addEventListener('pointerdown', (event) => {
          pointerStart = { x: event.clientX, y: event.clientY };
          pointerMoved = false;
        });
        container.addEventListener('pointermove', (event) => {
          if (!pointerStart) return;
          if (Math.abs(event.clientX - pointerStart.x) > 8 || Math.abs(event.clientY - pointerStart.y) > 8) {
            pointerMoved = true;
          }
          syncLive2dUiAnchor(container);
        });
        container.addEventListener('pointerup', () => {
          if (!disposed && !pointerMoved) {
            setIsBehaviorChatOpen((prev) => !prev);
          }
          syncLive2dUiAnchor(container);
          pointerStart = null;
          pointerMoved = false;
        });
        container.addEventListener('pointercancel', () => {
          syncLive2dUiAnchor(container);
          pointerStart = null;
          pointerMoved = false;
        });
      }

      const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas) {
        canvas.style.cursor = 'grab';
        canvas.style.width = `${LIVE2D_MODEL_WIDTH}px`;
        canvas.style.height = `${LIVE2D_MODEL_HEIGHT}px`;
      }

      setIsLive2dReady(true);
      return true;
    };

    const bootLive2d = async () => {
      try {
        const { DLive2dOptions, DModel, DTips, wlLive2d } = await import('wl-live2d');
        if (disposed) return;

        const controller = wlLive2d(new DLive2dOptions({
          sayHello: false,
          transitionTime: 320,
          selector: 'body',
          fixed: true,
          dockedRight: true,
          plugins: [],
          drag: true,
          homePath: '/',
          hitFrame: false,
          menus: [],
          models: [
            new DModel({
              path: LIVE2D_APPLE_FOX_MODEL_PATH,
              volume: 0.5,
              scale: LIVE2D_MODEL_SCALE,
              rotate: 0,
              backgroundColor: 'transparent',
              width: LIVE2D_MODEL_WIDTH,
              height: LIVE2D_MODEL_HEIGHT,
              motionPreload: null,
              position: LIVE2D_MODEL_POSITION,
            }),
          ],
          tips: new DTips({
            minWidth: 180,
            minHeight: 72,
            offsetX: 0,
            offsetY: 0,
            drag: false,
            message: [],
            duration: 2200,
            interval: 600000,
            talk: false,
            talkInterval: 600000,
            talkApis: [],
            motionMessage: false,
          }),
        })) as Live2dController;

        if (disposed) {
          controller.destroy();
          return;
        }

        live2dControllerRef.current = controller;
        controller.onModelLoaded((model) => {
          if (!disposed) {
            live2dModelRef.current = (model as typeof live2dModelRef.current) || null;
            bindWidgetClick();
            void playLive2dAction('pet');
          }
        });
        controller.onModelError(() => {
          if (!disposed) {
            live2dModelRef.current = null;
            setIsLive2dReady(false);
          }
        });

        if (!bindWidgetClick()) {
          bindTimer = window.setInterval(() => {
            if (bindWidgetClick() && bindTimer) {
              window.clearInterval(bindTimer);
              bindTimer = null;
            }
          }, 600);
        }
      } catch (error) {
        if (!disposed) {
          console.error('Live2D lazy boot failed', error);
          setIsLive2dReady(false);
        }
      }
    };

    void bootLive2d();

    const handleResize = () => syncLive2dUiAnchor();
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      if (bindTimer) window.clearInterval(bindTimer);
      window.removeEventListener('resize', handleResize);
      live2dWidgetAnimationRef.current?.cancel();
      live2dWidgetAnimationRef.current = null;
      live2dControllerRef.current?.destroy();
      live2dControllerRef.current = null;
      live2dModelRef.current = null;
    };
  }, [authToken, shouldBootLive2d]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    setNotificationPermission(window.Notification.permission);
  }, []);

  const clearAuth = () => {
    setAuthToken('');
    setAuthUser('');
    setIsAdmin(false);
    setCurrentView('tasks');
    setTasks([]);
    setAbilityDimensions([]);
    setWellbeing(createDefaultWellbeingSettings());
    setAbilityModule(createDefaultAbilityModuleSettings());
    setAiDayPlan(createDefaultAIDayPlanWorkspace());
    setFocusReminderSettings(createDefaultFocusReminderSettings());
    setRssFeeds([]);
    setNewsItems([]);
    setIdeaNotes([]);
    setNewsPreferences(createDefaultNewsPreferences());
    setSavedLinks([]);
    setSelectedTask(null);
    setIsLoadingTasks(false);
    setStorageError('');
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    setCalendarSubscription(null);
  };

  const activeTasks = tasks.filter((task) => task.status === 'pending');
  const archivedTasks = tasks.filter((task) => task.status === 'completed');
  const longTermTasks = activeTasks.filter((task) => task.timeline === 'long_term');
  const runningTasks = activeTasks.filter((task) => Boolean(task.tracking_started_at));
  const totalTrackedMsAllTasks = tasks.reduce((sum, task) => sum + getTrackedMs(task, nowTs), 0);
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
  const totalActualMinutes = activeTasks.reduce((sum, task) => sum + getDisplayedActualMinutes(task, nowTs), 0);
  const todayKey = getDayKey(nowTs);
  const todayBehaviorEvents = wellbeing.daily_behavior_events[todayKey] ?? [];
  const todayChatMessages = wellbeing.daily_chat_messages[todayKey] ?? [];
  const activeBehaviorEvents = todayBehaviorEvents.filter((event) => isBehaviorEventActive(event, nowTs));
  const latestAssistantChat = [...todayChatMessages].reverse().find((message) => message.role === 'assistant') || null;
  const dueTodayTasks = activeTasks.filter((task) => task.timeline === 'temporary' || isLongTermDue(task, nowTs));
  const dueTodayEstimatedMinutes = dueTodayTasks.reduce((sum, task) => sum + task.estimated_minutes, 0);
  const overdueTodayTasks = dueTodayTasks.filter((task) => task.timeline === 'temporary' && Boolean(task.deadline_at) && (task.deadline_at || 0) <= nowTs);
  const nearDeadlineTasks = dueTodayTasks.filter((task) => {
    if (task.timeline !== 'temporary' || !task.deadline_at || task.deadline_at <= nowTs) return false;
    return (task.deadline_at - nowTs) <= 12 * 3600000;
  });
  const averageStressScore = dueTodayTasks.length > 0
    ? dueTodayTasks.reduce((sum, task) => sum + (task.stress_score || 3), 0) / dueTodayTasks.length
    : 0;
  const pressureScore = clamp(
    Math.round(
      Math.min(28, dueTodayTasks.length * 5)
      + Math.min(24, dueTodayEstimatedMinutes / 20)
      + Math.min(20, averageStressScore * 4)
      + Math.min(20, overdueTodayTasks.length * 12 + nearDeadlineTasks.length * 5)
      + Math.min(12, blockedTasks.length * 4)
    ),
    0,
    100
  );
  const todayInitialEnergy = wellbeing.daily_checkins[todayKey]?.initial_energy ?? DEFAULT_INITIAL_ENERGY;
  const todayRestSession = wellbeing.daily_rest_sessions[todayKey] ?? {
    is_resting: false,
    started_at: null,
    recovered_energy: 0,
    updated_at: nowTs,
  };
  const todayStateReport = wellbeing.daily_state_reports[todayKey] ?? createDefaultDailyStateReport(nowTs);
  const completedTodayTasks = tasks.filter((task) => task.last_completed_at && getDayKey(task.last_completed_at) === todayKey);
  const completionBoost = completedTodayTasks.length * 6;
  const energyDeltaBoost = completedTodayTasks.reduce((sum, task) => sum + (task.energy_delta || 0) * 8, 0);
  const progressBoost = dueTodayTasks.length > 0
    ? Math.round((dueTodayTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / dueTodayTasks.length) * 10)
    : 0;
  const behaviorRecovery = activeBehaviorEvents.reduce((sum, event) => sum + getBehaviorRecoveredEnergy(event, nowTs), 0);
  const behaviorBurnRateModifier = getBehaviorBurnRateModifier(activeBehaviorEvents, nowTs);
  const liveEnergyBurn = runningTasks.reduce((sum, task) => sum + getTaskLiveEnergyBurn(task, nowTs, behaviorBurnRateModifier, runningTasks.length), 0);
  const liveEnergyBurnRate = runningTasks.reduce((sum, task) => sum + getTaskEnergyBurnRate(task, behaviorBurnRateModifier, runningTasks.length), 0);
  const liveRestRecovery = getLiveRestRecovery(todayRestSession, nowTs);
  const totalRestRecovery = normalizeRecoveredEnergy(todayRestSession.recovered_energy) + liveRestRecovery;
  const energyScore = clamp(
    Math.round(todayInitialEnergy - pressureScore * 0.45 + completionBoost + energyDeltaBoost + progressBoost - liveEnergyBurn + totalRestRecovery + behaviorRecovery),
    0,
    100
  );
  const pressureTone = getPressureTone(pressureScore);
  const energyTone = getEnergyTone(energyScore);
  const dropCandidates = dueTodayTasks
    .filter((task) => task.x < 45 && (task.stress_score || 3) >= 4)
    .sort((a, b) => (b.stress_score || 3) - (a.stress_score || 3))
    .slice(0, 2);
  const recommendedNowTasks = [...executableTasks]
    .sort((a, b) => scoreTaskForMoment(b, energyScore, pressureScore, nowTs) - scoreTaskForMoment(a, energyScore, pressureScore, nowTs))
    .slice(0, 3);
  const bundleSuggestions = buildBundleSuggestions(
    [...executableTasks].sort((a, b) => scoreTaskForMoment(b, energyScore, pressureScore, nowTs) - scoreTaskForMoment(a, energyScore, pressureScore, nowTs)),
    energyScore
  );

  useEffect(() => {
    const viewport = behaviorChatViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: todayChatMessages.length > 1 ? 'smooth' : 'auto',
    });
  }, [todayChatMessages.length, isBehaviorChatSending]);
  const wellbeingSuggestions = buildWellbeingSuggestions({
    pressureScore,
    energyScore,
    totalTasks: dueTodayTasks.length,
    completedToday: completedTodayTasks.length,
    dropCandidates,
    runningTasks,
    isResting: todayRestSession.is_resting,
  });
  const latestActiveBehavior = activeBehaviorEvents[activeBehaviorEvents.length - 1];
  const latestBehaviorMessage = latestActiveBehavior
    ? `${latestActiveBehavior.label}生效中，当前耗能系数 ${(behaviorBurnRateModifier * 100).toFixed(0)}%。`
    : '你好呀';

  const baseAbilityScores = abilityDimensions.reduce<Record<string, number>>((acc, dim) => {
    acc[dim] = 0;
    return acc;
  }, {});
  tasks.forEach((task) => {
    const gains = task.ability_gains || {};
    const completionTimes = Math.max(0, task.completion_count || 0);
    Object.entries(gains).forEach(([dim, gain]) => {
      if (!(dim in baseAbilityScores)) {
        baseAbilityScores[dim] = 0;
      }
      baseAbilityScores[dim] += completionTimes * Math.max(0, Math.floor(gain));
    });
  });
  const abilityScores = Object.fromEntries(
    Object.entries(baseAbilityScores).map(([dim, value]) => [
      dim,
      value + (abilityModule.special_totals[buildAbilityModuleId(dim)] || 0),
    ])
  );
  const abilityModuleOptions = buildAbilityModuleOptions(abilityDimensions);
  const abilityDimensionModules = abilityModuleOptions.filter((module) => module.kind === 'ability');
  const activeAbilityModule = abilityModuleOptions.find((module) => module.id === abilityModule.active_module_id) || abilityModuleOptions[0] || SPECIAL_ABILITY_MODULES[0];
  const activeAbilityDimension = getAbilityDimensionFromModuleId(activeAbilityModule?.id || '');
  const activeMotivationMode = getMotivationMode(activeAbilityModule?.id || '');
  const activeSpecialAbilityModule = getSpecialAbilityModule(activeAbilityModule?.id || '');
  const activeModuleGainPerHour = activeAbilityModule?.gainPerHour || 0;
  const activeModuleStoredScore = abilityModule.special_totals[activeAbilityModule?.id || ''] || 0;
  const activeModuleLiveGain = Math.max(0, totalTrackedMsAllTasks - abilityModule.tracked_ms_baseline) / 3600000 * activeModuleGainPerHour;
  const activeAbilityModuleScore = activeSpecialAbilityModule
    ? activeModuleStoredScore + activeModuleLiveGain
    : (abilityScores[activeAbilityDimension] || 0) + activeModuleLiveGain;
  const liveAbilityScores = { ...abilityScores };
  if (!activeSpecialAbilityModule && activeAbilityDimension) {
    liveAbilityScores[activeAbilityDimension] = (liveAbilityScores[activeAbilityDimension] || 0) + activeModuleLiveGain;
  }
  const abilityTotalScore = Object.values(liveAbilityScores).reduce((sum, value) => sum + value, 0);
  const abilityHighlights = Object.entries(liveAbilityScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const statusSummary = pressureScore >= 70
    ? (energyScore >= 60 ? '高压高能，适合短冲刺推进' : '高压低能，优先降载和缓冲')
    : (energyScore >= 60 ? '状态良好，可以先吃掉高价值任务' : '低压低能，适合整理和恢复');
  const stateSignalSummary = `外部行为 ${activeBehaviorEvents.length} 项`;
  const getAbilityModuleDisplayValue = (moduleId: string) => {
    const module = abilityModuleOptions.find((item) => item.id === moduleId);
    const baseValue = abilityModule.special_totals[moduleId] || 0;
    const liveGain = moduleId === activeAbilityModule?.id
      ? Math.max(0, totalTrackedMsAllTasks - abilityModule.tracked_ms_baseline) / 3600000 * (module?.gainPerHour || 0)
      : 0;
    const specialModule = getSpecialAbilityModule(moduleId);
    if (specialModule) {
      return baseValue + liveGain;
    }
    return (abilityScores[getAbilityDimensionFromModuleId(moduleId)] || 0) + liveGain;
  };
  const motivationModeOptions = [
    { id: 'ability', label: '能力成长', disabled: abilityDimensionModules.length === 0 },
    { id: 'special:mokugyo', label: '木鱼激励', disabled: false },
    { id: 'special:caishen', label: '财神激励', disabled: false },
    { id: 'special:token', label: 'Token 激励', disabled: false },
  ] as const;
  const runningTaskIds = new Set(runningTasks.map((task) => task.id));
  const rankedReadyTasks = [...executableTasks].sort(
    (a, b) => scoreTaskForMoment(b, energyScore, pressureScore, nowTs) - scoreTaskForMoment(a, energyScore, pressureScore, nowTs)
  );
  const dailyMix = buildDailyTaskMix(rankedReadyTasks.filter((task) => !runningTaskIds.has(task.id)));
  const dailyMixTasks = [...dailyMix.big, ...dailyMix.medium, ...dailyMix.small];
  const dailyMixTaskIds = new Set(dailyMixTasks.map((task) => task.id));
  const lowEnergyStandby = rankedReadyTasks
    .filter((task) => !runningTaskIds.has(task.id) && !dailyMixTaskIds.has(task.id) && task.cognitive_load === 'low' && task.collaboration_level === 'low')
    .slice(0, 4);
  const lowEnergyTaskIds = new Set(lowEnergyStandby.map((task) => task.id));
  const blockedQueue = blockedTasks
    .filter((task) => !runningTaskIds.has(task.id) && !dailyMixTaskIds.has(task.id) && !lowEnergyTaskIds.has(task.id))
    .sort((a, b) => getTaskUrgencyScore(b, nowTs) - getTaskUrgencyScore(a, nowTs))
    .slice(0, 4);
  const blockedTaskIds = new Set(blockedQueue.map((task) => task.id));
  const laterReadyQueue = rankedReadyTasks
    .filter((task) => !runningTaskIds.has(task.id) && !dailyMixTaskIds.has(task.id) && !lowEnergyTaskIds.has(task.id) && !blockedTaskIds.has(task.id))
    .slice(0, 4);
  const focusDeck = [...runningTasks]
    .sort((a, b) => (b.tracking_started_at || 0) - (a.tracking_started_at || 0))
    .slice(0, FOCUS_WIP_LIMIT);
  if (focusDeck.length < FOCUS_WIP_LIMIT) {
    rankedReadyTasks
      .filter((task) => !focusDeck.some((item) => item.id === task.id))
      .slice(0, FOCUS_WIP_LIMIT - focusDeck.length)
      .forEach((task) => focusDeck.push(task));
  }
  const recommendedPrimaryTask = focusDeck[0] || rankedReadyTasks[0] || lowEnergyStandby[0] || blockedQueue[0] || null;
  const currentPrimaryTask = tasks.find((task) => task.id === primaryTaskId && !task.archived_at && task.status !== 'completed') || recommendedPrimaryTask;
  const allLineTasks = sortTasksForLine(activeTasks, energyScore, pressureScore, nowTs);
  const allLineRows = buildTaskLineRows(allLineTasks);
  const currentPrimaryRow = currentPrimaryTask
    ? allLineRows.find((row) => row.tasks.some((task) => task.id === currentPrimaryTask.id)) || null
    : null;
  const currentPrimaryTasks = currentPrimaryRow?.tasks?.length
    ? currentPrimaryRow.tasks
    : (currentPrimaryTask ? [currentPrimaryTask] : []);
  const currentPrimaryIsParallel = Boolean(currentPrimaryRow?.mode === 'parallel' && currentPrimaryTasks.length > 1);
  const focusHeadline = runningTasks.length > 0
    ? '先把已经开始的任务收束到 1 到 2 项'
    : energyScore >= 65
      ? '当前适合先吃掉一个高价值任务'
      : '现在先从低阻力任务起手，把节奏带起来';
  const currentCoreFocusTitle = aiDayPlan.core_focus || currentPrimaryTask?.title || '先确定今天最重要的一件事';
  const currentCoreFocusDetail = currentPrimaryTask
    ? getTaskNextActionText(currentPrimaryTask)
    : (aiDayPlan.summary || focusHeadline);
  const focusFillCount = Math.max(0, FOCUS_WIP_LIMIT - runningTasks.length);
  const simpleHomeTasks: Task[] = [];
  [
    ...currentPrimaryTasks,
    ...focusDeck,
    ...dailyMixTasks,
    ...lowEnergyStandby,
  ].forEach((task) => {
    if (!simpleHomeTasks.some((item) => item.id === task.id) && simpleHomeTasks.length < 5) {
      simpleHomeTasks.push(task);
    }
  });
  const homeLineTasks = sortTasksForLine(simpleHomeTasks, energyScore, pressureScore, nowTs);
  const serialLineTasks = homeLineTasks.filter((task) => task.execution_mode !== 'parallel');
  const parallelLineTasks = homeLineTasks.filter((task) => task.execution_mode === 'parallel');
  const homeLineRows = buildTaskLineRows(homeLineTasks);
  const parallelRowIdByTaskId = new Map<string, string>();
  homeLineRows.forEach((row) => {
    if (row.mode !== 'parallel') return;
    row.tasks.forEach((task) => parallelRowIdByTaskId.set(task.id, row.id));
  });
  const energyMapTasks = [...homeLineTasks]
    .sort((a, b) => (a.line_order || a.created_at) - (b.line_order || b.created_at))
    .slice(0, 15);
  const energyElevatorOrder: EnergyElevatorLevel[] = ['sprint', 'steady', 'easy'];
  const energyElevatorMeta: Record<EnergyElevatorLevel, { label: string; hint: string }> = {
    easy: { label: '轻推层', hint: '低负荷，随时能做' },
    steady: { label: '巡航层', hint: '协作/等待时推进' },
    sprint: { label: '冲刺层', hint: '高认知，留给状态最好的时候' },
  };
  const energyElevatorGroups = energyElevatorOrder.map((level) => ({
    level,
    ...energyElevatorMeta[level],
    tasks: energyMapTasks.filter((task) => getEnergyElevatorLevel(task) === level),
    displayGroups: buildElevatorDisplayGroups(
      energyMapTasks.filter((task) => getEnergyElevatorLevel(task) === level),
      parallelRowIdByTaskId
    ),
  }));
  const primaryRunningTask = runningTasks.find((task) => task.id === currentPrimaryTask?.id) || runningTasks[0] || null;
  const primaryTrackedMinutes = primaryRunningTask?.tracking_started_at
    ? Math.floor((nowTs - primaryRunningTask.tracking_started_at) / 60000)
    : 0;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = currentCoreFocusTitle
      ? `当前主线：${currentCoreFocusTitle} · Planday`
      : 'Planday';
  }, [currentCoreFocusTitle]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!primaryTaskId) {
      window.localStorage.removeItem(PRIMARY_TASK_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(PRIMARY_TASK_STORAGE_KEY, primaryTaskId);
  }, [primaryTaskId]);

  useEffect(() => {
    if (!primaryTaskId) return;
    if (tasks.some((task) => task.id === primaryTaskId && !task.archived_at && task.status !== 'completed')) return;
    setPrimaryTaskId('');
  }, [primaryTaskId, tasks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!focusReminderSettings.enabled || !focusReminderSettings.desktop_notifications) return;
    if (!currentCoreFocusTitle || notificationPermission !== 'granted') return;

    const intervalMs = Math.max(10, focusReminderSettings.interval_minutes) * 60 * 1000;
    const tick = () => {
      const last = focusReminderSettings.last_notified_at || 0;
      if (Date.now() - last < intervalMs) return;
      const body = currentCoreFocusDetail || '回到当前这件最重要的工作。';
      const shown = showFocusNotification(currentCoreFocusTitle, body);
      if (!shown) return;
      setFocusReminderSettings((prev) => ({
        ...prev,
        last_notified_at: Date.now(),
      }));
    };

    const timer = window.setInterval(tick, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [
    currentCoreFocusDetail,
    currentCoreFocusTitle,
    focusReminderSettings.desktop_notifications,
    focusReminderSettings.enabled,
    focusReminderSettings.interval_minutes,
    focusReminderSettings.last_notified_at,
    notificationPermission,
  ]);
  const energyWindows = [
    {
      label: '现在',
      detail: energyScore >= 70
        ? '高能窗口，优先重任务或深度推进。'
        : energyScore <= 40
          ? '低能窗口，优先低认知和低协作。'
          : '稳定窗口，适合把今天的主任务往前推。',
    },
    {
      label: '下一轮',
      detail: pressureScore >= 70
        ? '给自己留 10 到 15 分钟缓冲，避免被截止时间拖着跑。'
        : '处理一轮中等体量的推进项，把积压感压下去。',
    },
    {
      label: '收尾',
      detail: completedTodayTasks.length >= 3
        ? '今天进度已起量，收尾时更适合复盘和整理。'
        : '晚上只收尾，不再打开新的高耗脑任务。',
    },
  ];

  const getTaskBlockingLabel = (task: Task) => {
    if (!isTaskReady(task)) {
      const waitingTitles = task.dependency_ids
        .map((id) => taskById.get(id)?.title || '未命名任务')
        .slice(0, 2);
      return `等待前置：${waitingTitles.join('、') || `${task.dependency_ids.length} 项依赖`}`;
    }

    if (task.timeline === 'long_term' && task.next_due_at && task.next_due_at > nowTs) {
      return `下个周期：${formatDateTime(task.next_due_at)}`;
    }

    if (task.timeline === 'temporary' && task.deadline_at) {
      return `截止：${formatDateTime(task.deadline_at)}`;
    }

    return '还没排进今天的承诺池。';
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, GLOBAL_CLOCK_INTERVAL_MS);
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
        setIsAdmin(session.isAdmin);
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

  useEffect(() => {
    let canceled = false;
    if (isAuthChecking || !authToken) return;
    fetchCalendarSubscription(authToken)
      .then((info) => {
        if (canceled) return;
        setCalendarSubscription(info);
      })
      .catch((e) => {
        if (canceled) return;
        if (e instanceof Error && e.message === 'UNAUTHORIZED') {
          clearAuth();
          setLoginError('登录已过期，请重新登录。');
        }
      });
    return () => {
      canceled = true;
    };
  }, [authToken, isAuthChecking]);

  useEffect(() => {
    if (!isAdmin && currentView === 'admin') {
      setCurrentView('tasks');
    }
  }, [currentView, isAdmin]);

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
        setWellbeing(loadedData.wellbeing);
        setAbilityModule(loadedData.ability_module);
        setAiDayPlan(loadedData.ai_day_plan || createDefaultAIDayPlanWorkspace());
        setFocusReminderSettings(loadedData.focus_reminders || createDefaultFocusReminderSettings());
        setRssFeeds(loadedData.rss_feeds || []);
        setNewsItems(loadedData.news_items || []);
        setIdeaNotes(loadedData.idea_notes || []);
        setNewsPreferences(loadedData.news_preferences || createDefaultNewsPreferences());
        setSavedLinks(loadedData.saved_links || []);
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
        wellbeing,
        ability_module: abilityModule,
        ai_day_plan: aiDayPlan,
        focus_reminders: focusReminderSettings,
        rss_feeds: rssFeeds,
        news_items: newsItems,
        idea_notes: ideaNotes,
        news_preferences: newsPreferences,
        saved_links: savedLinks,
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
  }, [tasks, abilityDimensions, wellbeing, abilityModule, aiDayPlan, focusReminderSettings, rssFeeds, newsItems, ideaNotes, newsPreferences, savedLinks, isLoadingTasks, authToken]);

  useEffect(() => {
    if (abilityModule.tracked_ms_baseline <= totalTrackedMsAllTasks) return;
    setAbilityModule((prev) => ({
      ...prev,
      tracked_ms_baseline: totalTrackedMsAllTasks,
      updated_at: Date.now(),
    }));
  }, [abilityModule.tracked_ms_baseline, totalTrackedMsAllTasks]);

  useEffect(() => {
    const fallbackModuleId = abilityModuleOptions[0]?.id || 'special:mokugyo';
    if (abilityModuleOptions.some((module) => module.id === abilityModule.active_module_id)) return;
    setAbilityModule((prev) => ({
      ...prev,
      active_module_id: fallbackModuleId,
      tracked_ms_baseline: totalTrackedMsAllTasks,
      updated_at: Date.now(),
    }));
  }, [abilityModule.active_module_id, abilityModuleOptions, totalTrackedMsAllTasks]);

  useEffect(() => {
    if (runningTasks.length === 0) return;
    if (totalTrackedMsAllTasks <= abilityModule.tracked_ms_baseline) return;
    if ((nowTs - abilityModule.updated_at) < MOTIVATION_SETTLE_INTERVAL_MS) return;
    settleAbilityModuleProgress(undefined, nowTs);
  }, [
    abilityDimensions,
    abilityModule.tracked_ms_baseline,
    abilityModule.updated_at,
    nowTs,
    runningTasks.length,
    tasks,
    totalTrackedMsAllTasks,
  ]);

  const handleAddTask = () => {
    setHomeSurface('map');
    setIsPlacementMode(true);
  };

  const handleQuadrantClick = (e: React.MouseEvent) => {
    if (!isPlacementMode || !quadrantRef.current) return;

    const rect = quadrantRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newTask = createDraftTask(x, y);

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

  const spendSpecialReward = (moduleId: string, amount: number) => {
    const chargeAmount = Math.max(0, Number(amount) || 0);
    if (!chargeAmount) return true;

    const settledAt = Date.now();
    const trackedMsAtMoment = tasks.reduce((sum, task) => sum + getTrackedMs(task, settledAt), 0);
    const nextTotals = { ...(abilityModule.special_totals || {}) };
    const activeModuleOption = buildAbilityModuleOptions(abilityDimensions).find((module) => module.id === abilityModule.active_module_id);
    const delta = Math.max(0, trackedMsAtMoment - abilityModule.tracked_ms_baseline) / 3600000 * (activeModuleOption?.gainPerHour || 0);

    if (delta > 0 && activeModuleOption) {
      nextTotals[activeModuleOption.id] = Number(((nextTotals[activeModuleOption.id] || 0) + delta).toFixed(2));
    }

    const currentBalance = Number(nextTotals[moduleId] || 0);
    if (currentBalance + 1e-6 < chargeAmount) return false;

    nextTotals[moduleId] = Number(Math.max(0, currentBalance - chargeAmount).toFixed(2));
    setAbilityModule({
      active_module_id: abilityModule.active_module_id,
      special_totals: nextTotals,
      tracked_ms_baseline: trackedMsAtMoment,
      updated_at: settledAt,
    });
    return true;
  };

  const settleAbilityModuleProgress = (nextModuleId?: string, settledAt = Date.now()) => {
    const trackedMsAtMoment = tasks.reduce((sum, task) => sum + getTrackedMs(task, settledAt), 0);
    setAbilityModule((prev) => {
      const nextTotals = { ...(prev.special_totals || {}) };
      const activeModuleOption = buildAbilityModuleOptions(abilityDimensions).find((module) => module.id === prev.active_module_id);
      const delta = Math.max(0, trackedMsAtMoment - prev.tracked_ms_baseline) / 3600000 * (activeModuleOption?.gainPerHour || 0);
      if (delta > 0 && activeModuleOption) {
        nextTotals[activeModuleOption.id] = Number(((nextTotals[activeModuleOption.id] || 0) + delta).toFixed(2));
      }
      const resolvedModuleId = nextModuleId ?? prev.active_module_id;
      if (
        delta <= 0
        && resolvedModuleId === prev.active_module_id
        && trackedMsAtMoment === prev.tracked_ms_baseline
      ) {
        return prev;
      }

      return {
        active_module_id: resolvedModuleId,
        special_totals: nextTotals,
        tracked_ms_baseline: trackedMsAtMoment,
        updated_at: settledAt,
      };
    });
  };

  const switchAbilityModule = (moduleId: string) => {
    if (moduleId === abilityModule.active_module_id) return;
    settleAbilityModuleProgress(moduleId);
  };

  const switchMotivationMode = (modeId: 'ability' | 'special:mokugyo' | 'special:caishen' | 'special:token') => {
    if (modeId === 'ability') {
      if (abilityDimensionModules.length === 0) return;
      const nextAbilityModuleId = activeMotivationMode === 'ability'
        ? activeAbilityModule.id
        : abilityDimensionModules[0].id;
      switchAbilityModule(nextAbilityModuleId);
      return;
    }
    switchAbilityModule(modeId);
  };

  const toggleTaskTracking = (task: Task) => {
    const now = Date.now();
    settleAbilityModuleProgress(undefined, now);

    setTasks((prev) => {
      const runningCount = prev.filter(t => t.tracking_started_at).length;
      const nextTasks = prev.map((t) => {
        if (t.id !== task.id) return t;
        if (t.tracking_started_at) {
          // Task was running, so calculate its final burn for this session and permanently deduct.
          const currentBurnRateModifier = getBehaviorBurnRateModifier(
            wellbeing.daily_behavior_events[getDayKey(now)] || [],
            now
          );
          const liveBurnSession = getTaskLiveEnergyBurn(t, now, currentBurnRateModifier, runningCount);
          return stopTrackingTaskState(t, now, liveBurnSession);
        }
        return {
          ...t,
          tracking_started_at: now,
          tracking_accumulated_ms: normalizeTrackingAccumulatedMs(t.tracking_accumulated_ms),
        };
      });
      setSelectedTask((prevSelected) => (prevSelected?.id === task.id
        ? nextTasks.find(t => t.id === task.id) || prevSelected
        : prevSelected));
      return nextTasks;
    });
  };

  const pauseTasksForCheckin = (taskIds: string[], pausedAt = Date.now()) => {
    if (taskIds.length === 0) return;
    settleAbilityModuleProgress(undefined, pausedAt);
    const targetIds = new Set(taskIds);

    setTasks((prev) => {
      const runningCount = prev.filter((task) => task.tracking_started_at).length;
      const nextTasks = prev.map((task) => {
        if (!task.tracking_started_at || !targetIds.has(task.id)) return task;
        const currentBurnRateModifier = getBehaviorBurnRateModifier(
          wellbeing.daily_behavior_events[getDayKey(pausedAt)] || [],
          pausedAt
        );
        const liveBurnSession = getTaskLiveEnergyBurn(task, pausedAt, currentBurnRateModifier, Math.max(1, runningCount));
        return stopTrackingTaskState(task, pausedAt, liveBurnSession);
      });
      setSelectedTask((prevSelected) => (
        prevSelected && targetIds.has(prevSelected.id)
          ? nextTasks.find((task) => task.id === prevSelected.id) || prevSelected
          : prevSelected
      ));
      return nextTasks;
    });
  };

  const resumeTasksAfterCheckin = (taskIds: string[], resumedAt = Date.now()) => {
    if (taskIds.length === 0) return;
    const targetIds = new Set(taskIds);
    setTasks((prev) => {
      const nextTasks = prev.map((task) => {
        if (!targetIds.has(task.id) || task.tracking_started_at) return task;
        if (!isTaskReady(task) || !isLongTermDue(task, resumedAt)) return task;
        return {
          ...task,
          tracking_started_at: resumedAt,
          tracking_accumulated_ms: normalizeTrackingAccumulatedMs(task.tracking_accumulated_ms),
        };
      });
      setSelectedTask((prevSelected) => (
        prevSelected && targetIds.has(prevSelected.id)
          ? nextTasks.find((task) => task.id === prevSelected.id) || prevSelected
          : prevSelected
      ));
      return nextTasks;
    });
  };

  const toggleRestMode = () => {
    const now = Date.now();
    settleAbilityModuleProgress(undefined, now);

    setTasks((prev) => {
      const runningCount = prev.filter(t => t.tracking_started_at).length;
      return prev.map((t) => {
        if (!t.tracking_started_at) return t;
        const currentBurnRateModifier = getBehaviorBurnRateModifier(
          wellbeing.daily_behavior_events[getDayKey(now)] || [],
          now
        );
        const liveBurnSession = getTaskLiveEnergyBurn(t, now, currentBurnRateModifier, runningCount);
        return stopTrackingTaskState(t, now, liveBurnSession);
      });
    });

    setSelectedTask((prevSelected) => {
      if (!prevSelected || !prevSelected.tracking_started_at) return prevSelected;
      const currentBurnRateModifier = getBehaviorBurnRateModifier(
        wellbeing.daily_behavior_events[getDayKey(now)] || [],
        now
      );
      // Estimate 1 for running count if we are just mutating the selected state blindly,
      // or just assume 0 deduction since the master setTasks will update it properly anyway 
      // if it's the same reference. Let's just deduct 0 to satisfy the type.
      return stopTrackingTaskState(prevSelected, now, 0);
    });
    setWellbeing((prev) => {
      const currentSession = prev.daily_rest_sessions[todayKey];
      const liveRecovery = getLiveRestRecovery(currentSession, now);
      const recoveredEnergy = clamp(
        Math.round(normalizeRecoveredEnergy(currentSession?.recovered_energy) + liveRecovery),
        0,
        100
      );
      const nextSession: DailyRestSession = currentSession?.is_resting
        ? {
          is_resting: false,
          started_at: null,
          recovered_energy: recoveredEnergy,
          updated_at: now,
        }
        : {
          is_resting: true,
          started_at: now,
          recovered_energy: recoveredEnergy,
          updated_at: now,
        };

      return {
        ...prev,
        daily_rest_sessions: {
          ...prev.daily_rest_sessions,
          [todayKey]: nextSession,
        },
      };
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

  const updateTodayInitialEnergy = (value: number) => {
    const nextValue = clamp(Math.round(value), 0, 100);
    setWellbeing((prev) => ({
      ...prev,
      daily_checkins: {
        ...prev.daily_checkins,
        [todayKey]: {
          initial_energy: nextValue,
          updated_at: Date.now(),
        },
      },
    }));
  };

  const updateTodaySleepHours = (value: number) => {
    const nextValue = normalizeSleepHours(value);
    setWellbeing((prev) => ({
      ...prev,
      daily_state_reports: {
        ...prev.daily_state_reports,
        [todayKey]: {
          ...(prev.daily_state_reports[todayKey] || createDefaultDailyStateReport()),
          sleep_hours: nextValue,
          updated_at: Date.now(),
        },
      },
    }));
  };

  const updateTodaySelfRating = (value: number) => {
    const nextValue = normalizeSelfRating(value);
    setWellbeing((prev) => ({
      ...prev,
      daily_state_reports: {
        ...prev.daily_state_reports,
        [todayKey]: {
          ...(prev.daily_state_reports[todayKey] || createDefaultDailyStateReport()),
          self_rating: nextValue,
          updated_at: Date.now(),
        },
      },
    }));
  };

  const reorderTaskIds = (taskIds: string[]) => {
    const orderedIds = taskIds.filter(Boolean);
    setTasks((prev) => {
      const rankMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
      return prev.map((task) => (
        rankMap.has(task.id)
          ? { ...task, line_order: rankMap.get(task.id) }
          : task
      ));
    });
  };

  const reorderTaskAroundTarget = (taskId: string, targetTaskId: string | null, taskIds: string[]) => {
    const orderedIds = taskIds.filter(Boolean).filter((id) => id !== taskId);
    const insertIndex = targetTaskId ? orderedIds.indexOf(targetTaskId) : orderedIds.length;
    const nextIds = [...orderedIds];
    nextIds.splice(insertIndex >= 0 ? insertIndex : nextIds.length, 0, taskId);
    reorderTaskIds(nextIds);
  };

  const moveTaskInLine = (taskId: string, direction: -1 | 1, taskIds: string[]) => {
    const orderedIds = taskIds.filter(Boolean);
    const currentIndex = orderedIds.indexOf(taskId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedIds.length) return;
    const nextIds = [...orderedIds];
    [nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];
    reorderTaskIds(nextIds);
  };

  const moveTaskToLine = (
    taskId: string,
    targetTaskId: string | null,
    taskIds: string[],
    targetMode: TaskExecutionMode
  ) => {
    const orderedIds = taskIds.filter(Boolean).filter((id) => id !== taskId);
    const insertIndex = targetTaskId ? orderedIds.indexOf(targetTaskId) : orderedIds.length;
    const nextIds = [...orderedIds];
    nextIds.splice(insertIndex >= 0 ? insertIndex : nextIds.length, 0, taskId);

    setTasks((prev) => {
      const rankMap = new Map(nextIds.map((id, index) => [id, index + 1]));
      return prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            execution_mode: targetMode,
            line_order: rankMap.get(taskId) || task.line_order,
          };
        }

        if (rankMap.has(task.id)) {
          return {
            ...task,
            line_order: rankMap.get(task.id),
          };
        }

        return task;
      });
    });

    setSelectedTask((prev) => (
      prev?.id === taskId
        ? {
            ...prev,
            execution_mode: targetMode,
            line_order: nextIds.indexOf(taskId) + 1,
          }
        : prev
    ));
  };

  const moveTaskAdjacent = (
    taskId: string,
    targetTaskId: string,
    taskIds: string[],
    targetMode: TaskExecutionMode,
    placement: 'before' | 'after'
  ) => {
    const orderedIds = taskIds.filter(Boolean).filter((id) => id !== taskId);
    const targetIndex = orderedIds.indexOf(targetTaskId);
    const nextIds = [...orderedIds];
    nextIds.splice(targetIndex >= 0 ? targetIndex + (placement === 'after' ? 1 : 0) : nextIds.length, 0, taskId);

    setTasks((prev) => {
      const rankMap = new Map(nextIds.map((id, index) => [id, index + 1]));
      return prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            execution_mode: targetMode,
            line_order: rankMap.get(taskId) || task.line_order,
          };
        }

        if (rankMap.has(task.id)) {
          return {
            ...task,
            line_order: rankMap.get(task.id),
          };
        }

        return task;
      });
    });

    setSelectedTask((prev) => (
      prev?.id === taskId
        ? {
            ...prev,
            execution_mode: targetMode,
            line_order: nextIds.indexOf(taskId) + 1,
          }
        : prev
    ));
  };

  const applyElevatorLevelToTask = (task: Task, targetLevel: EnergyElevatorLevel) => {
    if (targetLevel === 'sprint') {
      return {
        ...task,
        cognitive_load: 'high' as TaskCognitiveLoad,
        stress_score: Math.max(4, task.stress_score || 3),
      };
    }

    if (targetLevel === 'steady') {
      return {
        ...task,
        cognitive_load: 'low' as TaskCognitiveLoad,
        collaboration_level: 'high' as TaskCollaborationLevel,
        stress_score: Math.min(3, task.stress_score || 3),
      };
    }

    return {
      ...task,
      cognitive_load: 'low' as TaskCognitiveLoad,
      collaboration_level: 'low' as TaskCollaborationLevel,
      execution_mode: 'serial' as TaskExecutionMode,
      stress_score: Math.min(3, task.stress_score || 3),
    };
  };

  const moveTaskToElevatorLevel = (
    taskId: string,
    targetLevel: EnergyElevatorLevel,
    targetTaskId: string | null,
    taskIds: string[]
  ) => {
    const orderedIds = taskIds.filter(Boolean).filter((id) => id !== taskId);
    const insertIndex = targetTaskId ? orderedIds.indexOf(targetTaskId) : orderedIds.length;
    const nextIds = [...orderedIds];
    nextIds.splice(insertIndex >= 0 ? insertIndex + 1 : nextIds.length, 0, taskId);

    setTasks((prev) => {
      const rankMap = new Map(nextIds.map((id, index) => [id, index + 1]));
      return prev.map((task) => {
        if (task.id === taskId) {
          const elevated = applyElevatorLevelToTask(task, targetLevel);
          return {
            ...elevated,
            line_order: rankMap.get(taskId) || task.line_order,
          };
        }

        if (rankMap.has(task.id)) {
          return {
            ...task,
            line_order: rankMap.get(task.id),
          };
        }

        return task;
      });
    });

    setSelectedTask((prev) => (
      prev?.id === taskId
        ? {
            ...applyElevatorLevelToTask(prev, targetLevel),
            line_order: nextIds.indexOf(taskId) + 1,
          }
        : prev
    ));
  };

  const toggleTaskExecutionMode = (task: Task) => {
    const nextMode: TaskExecutionMode = task.execution_mode === 'parallel' ? 'serial' : 'parallel';
    setTasks((prev) => prev.map((item) => (
      item.id === task.id
        ? { ...item, execution_mode: nextMode }
        : item
    )));
    setSelectedTask((prev) => (prev?.id === task.id ? { ...prev, execution_mode: nextMode } : prev));
  };

  const setTaskExecutionMode = (taskIds: string[], mode: TaskExecutionMode) => {
    const idSet = new Set(taskIds.filter(Boolean));
    if (idSet.size === 0) return;
    setTasks((prev) => prev.map((item) => (
      idSet.has(item.id)
        ? { ...item, execution_mode: mode }
        : item
    )));
    setSelectedTask((prev) => (
      prev && idSet.has(prev.id)
        ? { ...prev, execution_mode: mode }
        : prev
    ));
  };

  const startTaskDrag = (event: React.DragEvent<HTMLElement>, taskId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
    setDraggedLineTaskId(taskId);
    setDragOverLineTaskId(taskId);
  };

  const endTaskDrag = () => {
    setDraggedLineTaskId(null);
    setDragOverLineTaskId(null);
    setDragOverLineZone(null);
  };

  const mergeTaskIntoParallel = (taskId: string, targetTaskId: string, taskIds: string[]) => {
    const orderedIds = taskIds.filter(Boolean).filter((id) => id !== taskId);
    const targetIndex = orderedIds.indexOf(targetTaskId);
    const nextIds = [...orderedIds];
    nextIds.splice(targetIndex >= 0 ? targetIndex + 1 : nextIds.length, 0, taskId);

    const targetRow = buildTaskLineRows(
      tasks
        .filter((task) => nextIds.includes(task.id))
        .sort((a, b) => nextIds.indexOf(a.id) - nextIds.indexOf(b.id))
    ).find((row) => row.tasks.some((task) => task.id === targetTaskId));
    const idsToParallelize = new Set([taskId, targetTaskId, ...(targetRow?.mode === 'parallel' ? targetRow.tasks.map((task) => task.id) : [])]);

    setTasks((prev) => {
      const rankMap = new Map(nextIds.map((id, index) => [id, index + 1]));
      return prev.map((task) => {
        if (!rankMap.has(task.id) && !idsToParallelize.has(task.id)) return task;
        return {
          ...task,
          line_order: rankMap.get(task.id) || task.line_order,
          execution_mode: idsToParallelize.has(task.id) ? 'parallel' : task.execution_mode,
        };
      });
    });

    setSelectedTask((prev) => (
      prev && idsToParallelize.has(prev.id)
        ? { ...prev, execution_mode: 'parallel', line_order: nextIds.indexOf(prev.id) + 1 || prev.line_order }
        : prev
    ));
  };

  const handleTaskLineDrop = (
    event: React.DragEvent<HTMLDivElement>,
    task: Task,
    taskIds: string[],
    laneMode: TaskExecutionMode
  ) => {
    event.preventDefault();
    const droppedTaskId = draggedLineTaskId || event.dataTransfer.getData('text/plain');
    if (!droppedTaskId || droppedTaskId === task.id) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;

    if (ratio > 0.34 && ratio < 0.66) {
      mergeTaskIntoParallel(droppedTaskId, task.id, taskIds);
    } else {
      moveTaskAdjacent(droppedTaskId, task.id, taskIds, laneMode, ratio <= 0.34 ? 'before' : 'after');
    }

    endTaskDrag();
  };

  const submitBehaviorChat = async (rawInput?: string) => {
    const text = (rawInput ?? behaviorChatInput).trim();
    if (!text || isBehaviorChatSending) return;

    const now = Date.now();
    const userMessage: WellbeingChatMessage = {
      id: createLocalId('chat'),
      role: 'user',
      text,
      created_at: now,
      behavior_event_id: null,
    };
    const preset = parseBehaviorMessage(text);
    const durationMinutes = preset ? extractDurationOverrideMinutes(text, preset.durationMinutes) : 0;
    const behaviorEvent = preset
      ? {
        id: createLocalId('behavior'),
        type: preset.id,
        label: preset.label,
        message: text,
        instant_energy: preset.instantEnergy,
        energy_boost_per_hour: preset.energyBoostPerHour,
        burn_rate_multiplier: preset.burnRateMultiplier,
        duration_minutes: durationMinutes,
        started_at: now,
        updated_at: now,
      } satisfies ExternalBehaviorEvent
      : null;
    const targetTask = recommendedNowTasks[0]?.title || '';
    const fallbackAssistantText = behaviorEvent
      ? `${preset.reply} 预计持续 ${durationMinutes} 分钟，当前额外恢复约 +${behaviorEvent.instant_energy}，耗能压到 ${Math.round(behaviorEvent.burn_rate_multiplier * 100)}%。${targetTask ? ` 现在适合先推进「${targetTask}」。` : ''}`
      : `${targetTask ? `我在呢，先把「${targetTask}」往前推一点点。` : '你好呀，我在这儿。'} 说说你的想法。`;
    const recentMessages = [...todayChatMessages.slice(-7), userMessage].map((message) => ({
      role: message.role,
      text: message.text,
    }));

    setBehaviorChatInput('');
    setBehaviorChatError('');
    setIsBehaviorChatSending(true);

    setWellbeing((prev) => {
      const nextChatMessages = [...(prev.daily_chat_messages[todayKey] ?? []), userMessage].slice(-MAX_DAILY_CHAT_MESSAGES);
      const nextBehaviorEvents = behaviorEvent
        ? [...(prev.daily_behavior_events[todayKey] ?? []), behaviorEvent].slice(-18)
        : (prev.daily_behavior_events[todayKey] ?? []);

      return {
        ...prev,
        daily_chat_messages: {
          ...prev.daily_chat_messages,
          [todayKey]: nextChatMessages,
        },
        daily_behavior_events: {
          ...prev.daily_behavior_events,
          [todayKey]: nextBehaviorEvents,
        },
      };
    });

    let assistantText = fallbackAssistantText;
    let suggestedMotion: Live2dActionId = behaviorEvent
      ? (BEHAVIOR_PRESET_TO_LIVE2D_ACTION[behaviorEvent.type] || 'idle')
      : 'pet';

    try {
      if (authToken) {
        const result = await requestAIBehaviorChat({
          message: text,
          localInsight: fallbackAssistantText,
          energyScore,
          pressureScore,
          primaryTask: currentPrimaryTask
            ? {
                title: currentPrimaryTask.title,
                next_action: getTaskNextActionText(currentPrimaryTask),
                cognitive_load: currentPrimaryTask.cognitive_load || 'low',
                collaboration_level: currentPrimaryTask.collaboration_level || 'low',
                execution_mode: currentPrimaryTask.execution_mode || 'serial',
                current_session_minutes: currentPrimaryTask.tracking_started_at
                  ? Math.floor((Date.now() - currentPrimaryTask.tracking_started_at) / 60000)
                  : 0,
              }
            : null,
          runningTasks: runningTasks.slice(0, 3).map((task) => ({
            title: task.title,
            execution_mode: task.execution_mode || 'serial',
            current_session_minutes: task.tracking_started_at
              ? Math.floor((Date.now() - task.tracking_started_at) / 60000)
              : 0,
          })),
          recentMessages,
          behaviorEvent: behaviorEvent
            ? {
                type: behaviorEvent.type,
                label: behaviorEvent.label,
                instant_energy: behaviorEvent.instant_energy,
                duration_minutes: behaviorEvent.duration_minutes,
                burn_rate_multiplier: behaviorEvent.burn_rate_multiplier,
              }
            : null,
        }, authToken);

          if (result.reply) {
            assistantText = result.reply;
          }
          suggestedMotion = result.suggested_motion || suggestedMotion;
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        clearAuth();
        setLoginError('登录已过期，请重新登录。');
        return;
      }
      console.error('Behavior chat AI failed, using local fallback.', error);
      setBehaviorChatError('AI 暂时没接上，先用了本地回复。');
    } finally {
      setIsBehaviorChatSending(false);
    }

    const assistantMessage: WellbeingChatMessage = {
      id: createLocalId('chat'),
      role: 'assistant',
      text: assistantText,
      created_at: Date.now(),
      behavior_event_id: behaviorEvent?.id || null,
    };

    setWellbeing((prev) => {
      const nextChatMessages = [...(prev.daily_chat_messages[todayKey] ?? []), assistantMessage].slice(-MAX_DAILY_CHAT_MESSAGES);
      return {
        ...prev,
        daily_chat_messages: {
          ...prev.daily_chat_messages,
          [todayKey]: nextChatMessages,
        },
      };
    });
    const previewNudge = assistantText.length > 28 ? `${assistantText.slice(0, 28)}...` : assistantText;
    void playLive2dAction(suggestedMotion, previewNudge);
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
    settleAbilityModuleProgress(undefined, now);
    setTasks((prev) => {
      const runningCount = prev.filter(t => t.tracking_started_at).length;
      return prev.map((t) => {
        if (t.id !== task.id) return t;

        let targetTask = t;
        if (targetTask.tracking_started_at) {
          const currentBurnRateModifier = getBehaviorBurnRateModifier(
            wellbeing.daily_behavior_events[getDayKey(now)] || [],
            now
          );
          const liveBurnSession = getTaskLiveEnergyBurn(targetTask, now, currentBurnRateModifier, runningCount);
          targetTask = stopTrackingTaskState(targetTask, now, liveBurnSession);
        }

        const isLongTerm = targetTask.timeline === 'long_term';
        const finalStatus = isLongTerm ? 'pending' : 'completed';
        const newCompletionCount = (targetTask.completion_count || 0) + 1;

        if (isLongTerm) {
          return {
            ...targetTask,
            status: finalStatus,
            archived_at: null,
            last_completed_at: now,
            next_due_at: now + getLongTermCycleMs(targetTask),
            completion_count: newCompletionCount,
            steps: targetTask.steps.map((step) => ({ ...step, completed: false })),
          };
        }

        return {
          ...targetTask,
          status: finalStatus,
          archived_at: now,
          last_completed_at: now,
          completion_count: newCompletionCount,
        };
      });
    });
    setSelectedTask(null);
  };

  const generateAIPlan = async (task: Task) => {
    if (!task.title) return;
    setAiError('');
    setIsGeneratingPlan(true);
    try {
      const result = await requestAIPlan(task, authToken);
      const stepList = result.steps.length > 0 ? result.steps : ['拆解目标范围', '准备关键资源', '执行核心任务', '复盘并优化'];
      const newSteps: TaskStep[] = stepList.map((stepText: string) => createTaskStep(stepText));

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

  const requestDesktopNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return 'unsupported' as const;
    }
    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  };

  const showFocusNotification = (title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (window.Notification.permission !== 'granted') return false;
    const notification = new window.Notification(`当前核心工作：${title}`, {
      body,
      tag: 'planday-core-focus',
      requireInteraction: true,
    });
    notification.onclick = () => {
      notification.close();
      window.focus();
      if (typeof document !== 'undefined') {
        document.title = `当前主线：${title} · Planday`;
      }
    };
    return true;
  };

  const requestHourlyFocusCheckin = async () => {
    if (!authToken || runningTasks.length === 0 || isGeneratingFocusCheckin) return;
    const pausedTaskIds = runningTasks.map((task) => task.id);
    const primaryTask = primaryRunningTask || currentPrimaryTask || runningTasks[0] || null;
    setIsGeneratingFocusCheckin(true);
    setFocusCheckinError('');
    try {
      const result = await requestAIFocusCheckin({
        primaryTask: primaryTask ? {
          id: primaryTask.id,
          title: primaryTask.title,
          next_action: getTaskNextActionText(primaryTask),
          cognitive_load: primaryTask.cognitive_load || 'low',
          collaboration_level: primaryTask.collaboration_level || 'low',
          execution_mode: primaryTask.execution_mode || 'serial',
          current_session_minutes: primaryTask.tracking_started_at ? Math.floor((Date.now() - primaryTask.tracking_started_at) / 60000) : 0,
        } : null,
        runningTasks: runningTasks.map((task) => ({
          id: task.id,
          title: task.title,
          execution_mode: task.execution_mode || 'serial',
          current_session_minutes: task.tracking_started_at ? Math.floor((Date.now() - task.tracking_started_at) / 60000) : 0,
        })),
        energyScore: energyScore,
        pressureScore: pressureScore,
        sleepHours: todayStateReport.sleep_hours,
        selfRating: todayStateReport.self_rating,
      }, authToken);
      pauseTasksForCheckin(pausedTaskIds, Date.now());
      setFocusCheckin({
        ...result,
        created_at: Date.now(),
        paused_task_ids: pausedTaskIds,
        primary_task_id: primaryTask?.id || null,
        status: 'pending',
      });
      if (notificationPermission === 'granted' && currentCoreFocusTitle) {
        showFocusNotification(currentCoreFocusTitle, result.summary || result.reply_prompt || '请回应一次当前节奏建议。');
      }
    } catch (error) {
      console.error('AI focus check-in failed', error);
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        clearAuth();
        setLoginError('登录已过期，请重新登录。');
        return;
      }
      setFocusCheckinError(error instanceof Error ? error.message : 'AI 校准失败');
    } finally {
      setIsGeneratingFocusCheckin(false);
    }
  };

  const respondToFocusCheckin = (action: 'continue' | 'rest' | 'pause') => {
    const current = focusCheckin;
    if (!current) return;
    const now = Date.now();
    setFocusCheckin({
      ...current,
      status: 'resolved',
      resolved_action: action,
    });
    setLastFocusCheckinAt(now);
    setFocusCheckinError('');

    if (action === 'continue') {
      resumeTasksAfterCheckin(current.paused_task_ids, now);
      return;
    }

    if (action === 'rest' && !todayRestSession.is_resting) {
      toggleRestMode();
    }
  };

  useEffect(() => {
    if (!authToken) return;
    if (runningTasks.length === 0) return;
    if (focusCheckin?.status === 'pending') return;
    if (isGeneratingFocusCheckin) return;
    if (primaryTrackedMinutes < 60) return;
    if (lastFocusCheckinAt && (nowTs - lastFocusCheckinAt) < AI_FOCUS_CHECKIN_INTERVAL_MS) return;
    requestHourlyFocusCheckin();
  }, [
    authToken,
    focusCheckin?.status,
    isGeneratingFocusCheckin,
    lastFocusCheckinAt,
    nowTs,
    primaryTrackedMinutes,
    runningTasks.length,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (behaviorNudgeTimeoutRef.current) {
      window.clearTimeout(behaviorNudgeTimeoutRef.current);
      behaviorNudgeTimeoutRef.current = null;
    }

    if (isBehaviorChatOpen || currentView !== 'tasks') {
      setBehaviorNudge('');
      return undefined;
    }

    const pool = [
      currentPrimaryTask ? `加油，先把「${currentPrimaryTask.title}」往前推一点点。` : '加油呀，今天也在慢慢变好。',
      '别急，我陪你把主线稳住。',
      '已经做得不错了，继续一点点就好。',
      '状态变了就告诉我，我会陪你一起调。',
    ].filter((item): item is string => Boolean(item && item.trim()));

    if (pool.length === 0) return undefined;

    const showDelay = 22000 + Math.round(Math.random() * 18000);
    behaviorNudgeTimeoutRef.current = window.setTimeout(() => {
      const nextText = pool[Math.floor(Math.random() * pool.length)];
      setBehaviorNudge(nextText);
      behaviorNudgeTimeoutRef.current = window.setTimeout(() => {
        setBehaviorNudge('');
        behaviorNudgeTimeoutRef.current = null;
      }, 6500);
    }, showDelay);

    return () => {
      if (behaviorNudgeTimeoutRef.current) {
        window.clearTimeout(behaviorNudgeTimeoutRef.current);
        behaviorNudgeTimeoutRef.current = null;
      }
    };
  }, [
    currentView,
    currentPrimaryTask?.id,
    currentPrimaryTask?.title,
    focusCheckin?.reply_prompt,
    focusCheckin?.summary,
    isBehaviorChatOpen,
    latestAssistantChat?.text,
  ]);

  const generateAIDayPlan = async () => {
    const input = aiDayPlan.input.trim();
    if (!input) {
      setDayPlanError('先用自然语言描述一下今天想做什么、有哪些约束。');
      return;
    }
    setDayPlanError('');
    setIsGeneratingDayPlan(true);
    try {
      const result = await requestAIDayPlan({
        input,
        energy: energyScore,
        existingTasks: activeTasks.slice(0, 10).map((task) => ({
          title: task.title,
          estimated_minutes: task.estimated_minutes,
          status: task.status,
        })),
      }, authToken);
      setAiDayPlan({
        ...result,
        input,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.error('AI day planning failed', err);
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        clearAuth();
        setLoginError('登录已过期，请重新登录。');
        return;
      }
      setDayPlanError(err instanceof Error ? err.message : 'AI 生成今日安排失败，请稍后重试。');
    } finally {
      setIsGeneratingDayPlan(false);
    }
  };

  const applyAIDayPlanToTasks = () => {
    if (aiDayPlan.tasks.length === 0) {
      setDayPlanError('先生成一版今日安排，再一键写入任务。');
      return;
    }
    const now = Date.now();
    const createdTasks = aiDayPlan.tasks.map((draft, index) => {
      const baseX = draft.cognitive_load === 'high' ? 72 : 58;
      const urgencyOffset = draft.timeline === 'temporary' ? draft.stress_score * 11 : 18;
      const y = clamp(96 - urgencyOffset - index * 7, 8, 92);
      return normalizeTask({
        id: createLocalId('ai-task'),
        title: draft.title,
        description: draft.description,
        x: clamp(baseX + (draft.collaboration_level === 'high' ? 10 : 0), 10, 95),
        y,
        status: 'pending',
        timeline: draft.timeline,
        dependency_ids: [],
        estimated_minutes: draft.estimated_minutes,
        actual_minutes: 0,
        deadline_at: null,
        use_countdown_urgency: false,
        long_term_cadence: 'daily',
        long_term_interval_days: 3,
        last_completed_at: null,
        next_due_at: draft.timeline === 'long_term' ? now : null,
        archived_at: null,
        completion_count: 0,
        ability_gains: {},
        stress_score: draft.stress_score,
        energy_delta: draft.energy_delta,
        cognitive_load: draft.cognitive_load,
        collaboration_level: draft.collaboration_level,
        execution_mode: draft.collaboration_level === 'high' ? 'parallel' : 'serial',
        category_key: draft.category_key,
        line_order: now + index,
        tracking_started_at: null,
        tracking_accumulated_ms: 0,
        ai_plan: '',
        steps: [],
        created_at: now + index,
      } satisfies Partial<Task>);
    });
    setTasks((prev) => [...createdTasks, ...prev]);
    if (createdTasks[0]) {
      setSelectedTask(createdTasks[0]);
    }
  };

  const exportCurrentPlanToCalendar = () => {
    const exportItems = (aiDayPlan.tasks.length > 0
      ? aiDayPlan.tasks.map((task) => ({
          title: task.title,
          description: task.description || aiDayPlan.summary || currentCoreFocusDetail,
          minutes: task.estimated_minutes,
        }))
      : simpleHomeTasks.slice(0, 5).map((task) => ({
          title: task.title || '未命名任务',
          description: getTaskNextActionText(task),
          minutes: task.estimated_minutes || 30,
        })))
      .slice(0, 8);

    if (exportItems.length === 0) {
      setDayPlanError('先生成今日安排，或者至少保留几项待办，再导出到日历。');
      return;
    }

    const ics = buildDayPlanCalendarIcs(currentCoreFocusTitle, exportItems);
    downloadIcsFile(`planday-${todayKey}.ics`, ics);
  };

  const copyCalendarSubscriptionUrl = async () => {
    if (!calendarSubscription?.url) {
      setDayPlanError('订阅链接还没准备好，稍等片刻再试。');
      return;
    }
    try {
      await navigator.clipboard.writeText(calendarSubscription.url);
      setDayPlanError('已复制订阅链接，可以粘贴到 Google Calendar。');
    } catch {
      setDayPlanError('复制失败，请手动复制下方链接。');
    }
  };

  const handleResetCalendarSubscription = async () => {
    try {
      const next = await resetCalendarSubscription(authToken);
      setCalendarSubscription(next);
      setDayPlanError('订阅链接已重置，旧链接将失效。');
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        clearAuth();
        setLoginError('登录已过期，请重新登录。');
        return;
      }
      setDayPlanError(err instanceof Error ? err.message : '订阅链接重置失败。');
    }
  };

  const testDesktopNotification = async () => {
    if (notificationPermission !== 'granted') {
      const permission = await requestDesktopNotificationPermission();
      if (permission !== 'granted') {
        setDayPlanError('浏览器还没有允许通知，先在浏览器权限里打开通知。');
        return;
      }
    }
    const shown = showFocusNotification(
      currentCoreFocusTitle,
      currentCoreFocusDetail || '这是测试弹窗，点击后会尝试把窗口拉回前台。'
    );
    if (!shown) {
      setDayPlanError('当前环境不支持桌面弹窗。');
      return;
    }
    setFocusReminderSettings((prev) => ({
      ...prev,
      desktop_notifications: true,
      last_notified_at: Date.now(),
    }));
    setDayPlanError('测试弹窗已发送。');
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
      setIsAdmin(result.isAdmin);
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

  const renderThemeIcon = (themeId: AppTheme) => {
    if (themeId === 'night') return <MoonStar className="h-4 w-4" />;
    if (themeId === 'day') return <SunMedium className="h-4 w-4" />;
    if (themeId === 'stardew') return <Sparkles className="h-4 w-4" />;
    return <Stars className="h-4 w-4" />;
  };

  const renderThemeSwitcher = (mode: 'compact' | 'full' = 'compact') => (
    <div className={cn("theme-switcher", mode === 'compact' && "theme-switcher-compact")}>
      {THEME_OPTIONS.map((option) => (
        <button
          key={`theme-${option.id}`}
          type="button"
          title={option.label}
          onClick={() => setTheme(option.id)}
          data-active={theme === option.id ? 'true' : 'false'}
          className="theme-segment inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors"
        >
          {renderThemeIcon(option.id)}
          <span>{mode === 'full' ? option.label : option.shortLabel}</span>
        </button>
      ))}
    </div>
  );

  const renderSharedEnergyBar = (contextKey: string) => {
    const normalizedValue = clamp(Math.round(todayInitialEnergy), 0, 100);
    const levelClass = normalizedValue <= 30 ? 'energy-battery-low' : normalizedValue <= 65 ? 'energy-battery-mid' : 'energy-battery-high';

    return (
      <div className={cn("energy-battery-shell", levelClass)}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="energy-battery-kicker">Energy</p>
            <h3 className="energy-battery-title">精力</h3>
          </div>
          <div className="energy-battery-value">
            <strong>{normalizedValue}</strong>
            <span>{getBatteryVisual(normalizedValue).level}</span>
          </div>
        </div>
        <div className="energy-battery-frame">
          <div className="energy-battery-head" />
          <div className="energy-battery-track">
            <div className="energy-battery-fill" style={{ width: `${normalizedValue}%` }} />
            {[20, 40, 60, 80].map((mark) => (
              <span key={`${contextKey}-energy-mark-${mark}`} className="energy-battery-divider" style={{ left: `${mark}%` }} />
            ))}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={todayInitialEnergy}
          onChange={(e) => updateTodayInitialEnergy(Number(e.target.value))}
          className="energy-battery-range"
          aria-label="调整精力"
        />
      </div>
    );
  };

  const renderInlineEnergyBar = (contextKey: string) => {
    const normalizedValue = clamp(Math.round(todayInitialEnergy), 0, 100);
    const levelClass = normalizedValue <= 30 ? 'energy-battery-low' : normalizedValue <= 65 ? 'energy-battery-mid' : 'energy-battery-high';

    return (
      <div className={cn("energy-inline-shell", levelClass)}>
        <span className="energy-inline-value">{normalizedValue}</span>
        <div className="energy-inline-frame">
          <div className="energy-battery-head energy-inline-head" />
          <div className="energy-battery-track energy-inline-track">
            <div className="energy-battery-fill energy-inline-fill" style={{ width: `${normalizedValue}%` }} />
            {[20, 40, 60, 80].map((mark) => (
              <span key={`${contextKey}-inline-energy-mark-${mark}`} className="energy-battery-divider energy-inline-divider" style={{ left: `${mark}%` }} />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={todayInitialEnergy}
            onChange={(e) => updateTodayInitialEnergy(Number(e.target.value))}
            className="energy-inline-range"
            aria-label="调整精力"
          />
        </div>
      </div>
    );
  };

  const renderTaskCard = (
    task: Task,
    {
      laneLabel: _laneLabel,
      note,
      tone = 'today',
    }: {
      laneLabel?: string;
      note?: string;
      tone?: 'focus' | 'today' | 'standby' | 'blocked';
    } = {}
  ) => {
    const ready = isTaskReady(task) && isLongTermDue(task, nowTs);
    const timelineAccent = getTimelineAccent(task.timeline);
    const nodeColor = getDimensionColor(task);
    const progress = Math.round(getTaskProgress(task) * 100);
    const firstLine = note || (ready ? buildRecommendationReason(task, energyScore, nowTs) : getTaskBlockingLabel(task));
    const toneClasses = {
      focus: 'border-indigo-300/35 bg-indigo-500/[0.08] shadow-[0_18px_44px_rgba(99,102,241,0.12)]',
      today: 'border-sky-200/40 bg-sky-500/[0.06]',
      standby: 'border-slate-200/80 bg-slate-500/[0.04]',
      blocked: 'border-amber-400/22 bg-amber-500/[0.09]',
    } as const;

    return (
      <article
        key={task.id}
        className={cn(
          "rounded-[1.1rem] border px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25",
          toneClasses[tone],
          task.tracking_started_at && "ring-1 ring-cyan-400/30"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setSelectedTask(task)}
              className="mt-1 text-left text-[1rem] font-semibold leading-6 text-white transition-colors hover:text-indigo-200 text-safe-wrap"
            >
              {task.title || '未命名任务'}
            </button>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300 text-safe-wrap">{getTaskNextActionText(task)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-200">
            估 {task.estimated_minutes}m
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-200">
            {getCognitiveLoadLabel(task.cognitive_load || 'low')}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-200">
            {getCollaborationLevelLabel(task.collaboration_level || 'low')}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-200">
            {getTaskCategoryLabel(task.category_key || 'misc')}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-200">
            {getEnergyDeltaLabel(task.energy_delta || 0)}
          </span>
          <span className={cn("rounded-full border px-2 py-1", timelineAccent.badge)}>
            {task.timeline === 'long_term' ? '长期' : '临时'}
          </span>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-400 text-safe-wrap">{firstLine}</p>

        {(task.timeline === 'temporary' && task.deadline_at) || (task.timeline === 'long_term' && task.next_due_at) ? (
          <div
            className={cn(
              "mt-3 rounded-2xl border px-3 py-2 text-[11px] font-semibold",
              task.timeline === 'temporary'
                ? (task.deadline_at || 0) <= nowTs
                  ? 'border-indigo-300/40 bg-indigo-500/18 text-indigo-100'
                  : 'border-amber-400/35 bg-amber-500/18 text-amber-100'
                : isLongTermDue(task, nowTs)
                  ? 'border-indigo-400/35 bg-indigo-500/18 text-indigo-100'
                  : 'border-slate-400/35 bg-slate-500/18 text-slate-100'
            )}
          >
            {task.timeline === 'temporary'
              ? `${getCountdownText(task.deadline_at || nowTs, nowTs)} · 截止 ${formatDateTime(task.deadline_at)}`
              : (task.next_due_at && isLongTermDue(task, nowTs))
                ? '当前周期可执行'
                : `下个周期 ${formatDateTime(task.next_due_at)}`}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${nodeColor}, color-mix(in srgb, ${nodeColor} 72%, white))`,
              }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {task.steps.length > 0 ? `${task.steps.filter((step) => step.completed).length}/${task.steps.length}` : '待拆解'}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <TaskRuntimeLabel task={task} mode="card" className="text-[11px] text-slate-400" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTask(task)}
              className="rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/8 hover:text-white"
            >
              查看
            </button>
            <button
              type="button"
              onClick={() => toggleTaskTracking(task)}
              disabled={!ready}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                ready
                  ? task.tracking_started_at
                    ? "border-indigo-300/35 bg-indigo-500/18 text-indigo-100 hover:bg-indigo-500/25"
                    : "border-indigo-300/30 bg-indigo-500/16 text-indigo-100 hover:bg-indigo-500/25"
                  : "cursor-not-allowed border-white/8 bg-white/[0.04] text-slate-500"
              )}
            >
              {task.tracking_started_at ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {task.tracking_started_at ? '暂停' : '开始'}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderTaskLine = (
    task: Task,
    {
      emphasis = 'default',
      laneMode = 'serial',
      taskIds = [],
      rowTaskCount = 1,
    }: {
      emphasis?: 'default' | 'standby';
      laneMode?: TaskExecutionMode;
      taskIds?: string[];
      rowTaskCount?: number;
    } = {}
  ) => {
    const ready = isTaskReady(task) && isLongTermDue(task, nowTs);
    const compactParallel = laneMode === 'parallel';
    const tripleParallel = compactParallel && rowTaskCount >= 3;
    const dualParallel = compactParallel && rowTaskCount === 2;
    const toneClasses = emphasis === 'standby'
      ? 'border-stone-300/20 bg-stone-500/[0.06]'
      : 'border-white/10 bg-white/[0.03]';
    const isDragged = draggedLineTaskId === task.id;
    const isDragTarget = dragOverLineTaskId === task.id && draggedLineTaskId !== task.id;
    const dragZone = isDragTarget ? dragOverLineZone : null;
    const nextActionText = getTaskNextActionText(task);
    return (
      <div
        key={`line-${task.id}`}
        draggable
        onClick={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('button, a, input, textarea, select, label')) return;
          setSelectedTask(task);
        }}
        onDragStart={(event) => startTaskDrag(event, task.id)}
        onDragEnd={endTaskDrag}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
          const zone: 'before' | 'after' | 'overlap' = ratio <= 0.34 ? 'before' : ratio >= 0.66 ? 'after' : 'overlap';
          if (dragOverLineTaskId !== task.id) setDragOverLineTaskId(task.id);
          if (dragOverLineZone !== zone) setDragOverLineZone(zone);
        }}
        onDragLeave={() => {
          if (dragOverLineTaskId === task.id) {
            setDragOverLineTaskId(null);
            setDragOverLineZone(null);
          }
        }}
        onDrop={(event) => handleTaskLineDrop(event, task, taskIds, laneMode)}
        className={cn(
          "task-line-shell cursor-pointer rounded-[1rem] border px-3 py-3 transition-colors hover:border-white/20",
          toneClasses,
          emphasis === 'standby' && "task-line-shell-standby",
          isDragged && "task-line-shell-dragging",
          isDragTarget && "task-line-shell-drop",
          dragZone === 'before' && "task-line-shell-drop-before",
          dragZone === 'after' && "task-line-shell-drop-after",
          dragZone === 'overlap' && "task-line-shell-drop-overlap",
          compactParallel ? "flex h-full min-h-[176px] flex-col" : "flex items-center gap-3"
        )}
      >
        {dragZone && (
          <div className="task-line-drop-hint">
            {dragZone === 'before' ? '识别：上方' : dragZone === 'after' ? '识别：下方' : '识别：重叠并行'}
          </div>
        )}
        {compactParallel ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <div className="task-line-drag-handle shrink-0 pt-0.5 text-slate-500">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
                  style={{ color: getDimensionColor(task), backgroundColor: getDimensionColor(task) }}
                />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(task)}
                  className={cn(
                      "text-left font-semibold leading-5 text-white transition-colors hover:text-indigo-200 break-words text-safe-wrap",
                      tripleParallel ? "line-clamp-2 text-[13px]" : "line-clamp-2 text-sm"
                    )}
                  >
                    {task.title || '未命名任务'}
                  </button>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                    {getTaskCategoryLabel(task.category_key || 'misc')}
                  </p>
                </div>
              </div>
              <span className={cn(
                "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold",
                ready
                  ? "border-emerald-300/25 bg-emerald-500/12 text-emerald-100"
                  : "border-white/10 bg-white/[0.04] text-slate-300"
              )}>
                <TaskRuntimeLabel task={task} mode="line" />
              </span>
            </div>

            <div className="mt-3 min-h-[3.25rem]">
              <p className={cn(
                "break-words text-safe-wrap text-slate-300",
                tripleParallel ? "line-clamp-2 text-[11px] leading-5" : "line-clamp-3 text-[12px] leading-5"
              )}>
                {nextActionText}
              </p>
            </div>

            <div className={cn(
              "mt-3 grid gap-2",
              dualParallel ? "grid-cols-2" : tripleParallel ? "grid-cols-1" : "grid-cols-3"
            )}>
              <div className="task-metric-chip rounded-xl px-2.5 py-2">
                <div className="task-metric-chip-label text-[10px]">预计</div>
                <div className="task-metric-chip-value mt-1 text-[11px] font-semibold">{task.estimated_minutes}m</div>
              </div>
              <div className="task-metric-chip rounded-xl px-2.5 py-2">
                <div className="task-metric-chip-label text-[10px]">负荷</div>
                <div className="task-metric-chip-value mt-1 text-[11px] font-semibold">{getCognitiveLoadLabel(task.cognitive_load || 'low')}</div>
              </div>
              {!dualParallel && !tripleParallel && (
                <div className="task-metric-chip rounded-xl px-2.5 py-2">
                  <div className="task-metric-chip-label text-[10px]">协作</div>
                  <div className="task-metric-chip-value mt-1 text-[11px] font-semibold">{getCollaborationLevelLabel(task.collaboration_level || 'low')}</div>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedTask(task)}
                className="flex-1 rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/8 hover:text-white"
              >
                查看
              </button>
              <button
                type="button"
                onClick={() => toggleTaskTracking(task)}
                disabled={!ready}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  ready
                    ? task.tracking_started_at
                      ? "border-indigo-300/35 bg-indigo-500/18 text-indigo-100 hover:bg-indigo-500/25"
                      : "border-indigo-300/30 bg-indigo-500/16 text-indigo-100 hover:bg-indigo-500/25"
                    : "cursor-not-allowed border-white/8 bg-white/[0.04] text-slate-500"
                )}
              >
                {task.tracking_started_at ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {task.tracking_started_at ? '暂停' : '开始'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="task-line-drag-handle shrink-0 text-slate-500">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="task-line-dot-wrap shrink-0">
              <div
                className="h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]"
                style={{ color: getDimensionColor(task), backgroundColor: getDimensionColor(task) }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  className="line-clamp-2 text-left text-sm font-semibold leading-5 text-white transition-colors hover:text-indigo-200 text-safe-wrap"
                >
                  {task.title || '未命名任务'}
                </button>
              </div>
              <p className="mt-1 line-clamp-1 text-[11px] leading-5 text-slate-400 text-safe-wrap">
                {nextActionText}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                <span>{task.estimated_minutes}m</span>
                <span>{getTaskCategoryLabel(task.category_key || 'misc')}</span>
                <span>{getTaskEnergyBurnRate(task, behaviorBurnRateModifier, Math.max(1, runningTasks.length || 1)).toFixed(1)}/h</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleTaskTracking(task)}
                disabled={!ready}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                  ready
                    ? task.tracking_started_at
                      ? "border-indigo-300/35 bg-indigo-500/18 text-indigo-100 hover:bg-indigo-500/25"
                      : "border-indigo-300/30 bg-indigo-500/16 text-indigo-100 hover:bg-indigo-500/25"
                    : "cursor-not-allowed border-white/8 bg-white/[0.04] text-slate-500"
                )}
              >
                {task.tracking_started_at ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <TaskRuntimeLabel task={task} mode="button" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderDependencyLines = () => (
    activeTasks.flatMap((task) =>
      task.dependency_ids.map((dependencyId) => {
        const fromTask = taskById.get(dependencyId);
        if (!fromTask || fromTask.status === 'completed') return null;
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
    )
  );

  const renderTaskPoint = (task: Task) => (
    <TaskPoint
      key={task.id}
      task={task}
      nowTs={nowTs}
      onOpen={() => setSelectedTask(task)}
      onMove={updateTaskPosition}
    />
  );

  const renderMotivationScene = () => {
    if (activeMotivationMode === 'special:mokugyo') {
      return (
        <div className="motivation-stage motivation-stage-mokugyo">
          <div className="motivation-glow motivation-glow-mokugyo" />
          <div className="mokugyo-scene">
            <div className="mokugyo-aura" />
            <div className="mokugyo-shell">
              <div className="mokugyo-shell-core" />
            </div>
            <div className="mokugyo-base" />
            <div className="mokugyo-mallet">
              <div className="mokugyo-mallet-stick" />
              <div className="mokugyo-mallet-head" />
            </div>
            <span className="mokugyo-pulse mokugyo-pulse-1" />
            <span className="mokugyo-pulse mokugyo-pulse-2" />
            <span className="mokugyo-pulse mokugyo-pulse-3" />
          </div>
        </div>
      );
    }

    if (activeMotivationMode === 'special:caishen') {
      return (
        <div className="motivation-stage motivation-stage-caishen">
          <div className="motivation-glow motivation-glow-caishen" />
          <div className="caishen-scene">
            <div className="caishen-avatar">
              <div className="caishen-halo" />
              <div className="caishen-head">
                <CircleDollarSign className="h-8 w-8" />
              </div>
              <div className="caishen-body" />
            </div>
            <div className="coin-burst coin-burst-1"><Coins className="h-4 w-4" /></div>
            <div className="coin-burst coin-burst-2"><Coins className="h-5 w-5" /></div>
            <div className="coin-burst coin-burst-3"><Coins className="h-4 w-4" /></div>
            <div className="coin-burst coin-burst-4"><Coins className="h-5 w-5" /></div>
          </div>
        </div>
      );
    }

    if (activeMotivationMode === 'special:token') {
      return (
        <div className="motivation-stage motivation-stage-token">
          <div className="motivation-glow motivation-glow-token" />
          <div className="token-scene">
            <div className="token-orbit token-orbit-1">TK</div>
            <div className="token-orbit token-orbit-2">TK</div>
            <div className="token-orbit token-orbit-3">TK</div>
            <div className="token-core">
              <Coins className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-sm font-semibold text-amber-50">Token 累积</div>
            <div className="text-[11px] text-amber-100/75">每次推进都能看到更直接的增长</div>
          </div>
        </div>
      );
    }

    return (
      <div className="motivation-stage motivation-stage-ability">
        <div className="motivation-glow motivation-glow-ability" />
        <div className="brain-scene">
          <div className="brain-core">
            <Brain className="h-10 w-10" />
          </div>
          <span className="brain-up brain-up-1" />
          <span className="brain-up brain-up-2" />
          <span className="brain-up brain-up-3" />
          <span className="brain-up brain-up-4" />
        </div>
        <div className="mt-3 text-center">
          <div className="text-sm font-semibold text-violet-50">{activeAbilityDimension || '能力成长'}</div>
          <div className="text-[11px] text-violet-100/75">大脑持续抬升，能力值稳步累积</div>
        </div>
      </div>
    );
  };

  if (isAuthChecking) {
    return (
      <div className="app-shell min-h-screen text-slate-100 flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-300">正在验证登录状态...</div>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div className="app-shell relative min-h-screen text-slate-100 flex items-center justify-center p-4">
        <div className="absolute right-4 top-4">
          {renderThemeSwitcher('full')}
        </div>
        <form
          onSubmit={handleLogin}
          className="auth-card w-full max-w-sm rounded-[1.75rem] px-6 py-7 shadow-2xl"
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
            className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="app-shell relative isolate min-h-screen w-screen flex flex-col text-slate-100 font-sans selection:bg-rose-500/30">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.08] glass-panel px-3 py-3 sm:px-4 lg:px-5">
        <div className="mx-auto w-full max-w-[1360px] overflow-x-auto">
          <div className="flex min-w-max items-center gap-2.5">
            <div className="brand-shell brand-shell-planner planner-mark-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
              <div className="planner-mark" aria-label="Task Axis Planner">
                <span className="planner-mark-axis planner-mark-axis-x" />
                <span className="planner-mark-axis planner-mark-axis-y" />
                <span className="planner-mark-node planner-mark-node-a" />
                <span className="planner-mark-node planner-mark-node-b" />
                <span className="planner-mark-node planner-mark-node-c" />
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
              <button
                onClick={() => setCurrentView('tasks')}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all",
                  currentView === 'tasks'
                    ? "border-[color:var(--brand-border)] bg-[color:var(--theme-chip-bg)] text-[color:var(--text-strong)] shadow-[0_10px_24px_rgba(2,8,18,0.08)]"
                    : "border-transparent bg-transparent text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-strong)]"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>任务</span>
              </button>
              <button
                onClick={() => setCurrentView('world_news')}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all",
                  currentView === 'world_news'
                    ? "border-[color:var(--brand-border)] bg-[color:var(--theme-chip-bg)] text-[color:var(--text-strong)] shadow-[0_10px_24px_rgba(2,8,18,0.08)]"
                    : "border-transparent bg-transparent text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-strong)]"
                )}
              >
                <Globe className="h-4 w-4" />
                <span>世界消息</span>
              </button>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                title={authUser || loginUsername || undefined}
                onClick={() => {
                  if (isAdmin) setCurrentView('admin');
                }}
                className={cn(
                  "identity-chip",
                  isAdmin && "identity-chip-clickable",
                  currentView === 'admin' && "identity-chip-active"
                )}
              >
                <span className={cn("identity-chip-badge", isAdmin ? "identity-chip-badge-admin" : "identity-chip-badge-member")}>
                  {isAdmin ? <Briefcase className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3 fill-current" />}
                </span>
                <span className="min-w-0">
                  <span className="identity-chip-label">身份</span>
                  <span className="identity-chip-value">{isAdmin ? '管理员' : '成员'}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={cn(
                  "identity-chip identity-chip-clickable",
                  isSettingsOpen && "identity-chip-active"
                )}
                title="打开设置"
              >
                <span className="identity-chip-badge identity-chip-badge-member">
                  <Settings2 className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="identity-chip-label">设置</span>
                  <span className="identity-chip-value">同步与主题</span>
                </span>
              </button>
              <button
                onClick={() => setIsTaskListOpen(true)}
                className="relative rounded-xl border border-white/10 bg-white/[0.03] p-2.5 transition-all hover:bg-white/[0.08] active:scale-95"
                title="打开任务清单"
              >
                <ListTodo className="h-5 w-5 text-slate-300" />
                {(activeTasks.length + archivedTasks.length) > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(244,114,182,0.35)]">
                    {activeTasks.length + archivedTasks.length}
                  </span>
                )}
              </button>
              <button
                onClick={clearAuth}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                title="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {currentView !== 'admin' && (isLoadingTasks || storageError) && (
        <div className={cn(
          "z-20 px-4 py-2 text-xs font-semibold sm:px-6",
          storageError ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
        )}>
          {storageError || '正在加载任务...'}
        </div>
      )}

      {currentView === 'tasks' ? (
        <>
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.section
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-4 mt-4 sm:mx-6"
              >
                <div className="settings-panel rounded-[1.7rem] border border-white/10 p-5 sm:p-6">
                  <div className="settings-panel-grid">
                    <section className="settings-card">
                      <p className="settings-card-kicker">主题</p>
                      <h3 className="settings-card-title">预设主题</h3>
                      <div className="mt-4">
                        {renderThemeSwitcher('full')}
                      </div>
                    </section>

                    <section className="settings-card">
                      <p className="settings-card-kicker">日历同步</p>
                      <h3 className="settings-card-title">把今天的安排推到外部日历</h3>
                      <div className="mt-4 grid gap-3">
                        <button
                          type="button"
                          onClick={exportCurrentPlanToCalendar}
                          className="settings-action-button"
                        >
                          <CalendarDays className="h-4 w-4" />
                          导出 ICS
                        </button>
                        <button
                          type="button"
                          onClick={copyCalendarSubscriptionUrl}
                          className="settings-action-button"
                        >
                          <Link2 className="h-4 w-4" />
                          复制订阅链接
                        </button>
                        <button
                          type="button"
                          onClick={handleResetCalendarSubscription}
                          className="settings-action-button"
                        >
                          <RefreshCw className="h-4 w-4" />
                          重置订阅链接
                        </button>
                      </div>
                      <div className="settings-subcard mt-4">
                        <div className="settings-subtitle">订阅地址</div>
                        <div className="mt-2 break-all text-[11px] leading-5 text-slate-300">{calendarSubscription?.url || '正在生成订阅地址...'}</div>
                      </div>
                    </section>

                    <section className="settings-card">
                      <p className="settings-card-kicker">桌面弹窗</p>
                      <h3 className="settings-card-title">和当前主线保持同步</h3>
                      <button
                        type="button"
                        onClick={testDesktopNotification}
                        className="settings-action-button mt-4"
                      >
                        <BellRing className="h-4 w-4" />
                        测试弹窗
                      </button>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[30, 60, 90].map((minutes) => (
                          <button
                            key={`settings-interval-${minutes}`}
                            type="button"
                            onClick={() => setFocusReminderSettings((prev) => ({
                              ...prev,
                              enabled: true,
                              desktop_notifications: true,
                              interval_minutes: minutes,
                            }))}
                            className={cn(
                              "settings-choice",
                              focusReminderSettings.interval_minutes === minutes && focusReminderSettings.enabled && "settings-choice-active"
                            )}
                          >
                            每 {minutes} 分钟
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="settings-card settings-card-wide">
                      <BackgroundAudioDock embedded />
                    </section>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

      <div className="hidden">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsTopBoardCollapsed((prev) => !prev)}
          onMouseDown={(event) => {
            topBoardDragStateRef.current = {
              startY: event.clientY,
              collapsed: isTopBoardCollapsed,
            };
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsTopBoardCollapsed((prev) => !prev);
            }
          }}
          className="mx-4 mt-3 flex cursor-row-resize items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.05] sm:mx-6"
        >
          <span className="h-1.5 w-14 rounded-full bg-white/15" />
          <span>{isTopBoardCollapsed ? '向下拉出状态板' : '向上折叠状态板'}</span>
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isTopBoardCollapsed ? "rotate-90" : "-rotate-90")} />
        </div>

        <AnimatePresence initial={false} mode="wait">
          {isTopBoardCollapsed ? (
            <motion.div
              key="top-board-collapsed"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 pb-3 pt-2 sm:px-6"
            >
              <div className="top-status-strip">
                <div className="top-status-item top-status-item-date">
                  <span className="top-status-label">今天</span>
                  <strong className="top-status-value">{todayKey}</strong>
                </div>
                <div className="top-status-item top-status-item-start">
                  <span className="top-status-label">起始精力</span>
                  <strong className="top-status-value">{todayInitialEnergy}</strong>
                </div>
                <div className="top-status-item top-status-item-pressure">
                  <span className="top-status-label">{pressureTone.label}</span>
                  <strong className="top-status-value">{pressureScore}</strong>
                </div>
                <div className="top-status-item top-status-item-energy">
                  <span className="top-status-label">{energyTone.label}</span>
                  <strong className="top-status-value">{energyScore}</strong>
                </div>
                <div className="top-status-item top-status-item-date">
                  <span className="top-status-label">睡眠</span>
                  <strong className="top-status-value">{todayStateReport.sleep_hours}h</strong>
                </div>
                <div className="top-status-item top-status-item-module">
                  <span className="top-status-label">自评</span>
                  <strong className="top-status-value">{todayStateReport.self_rating}/5</strong>
                </div>
                <div className="top-status-item top-status-item-module">
                  <span className="top-status-label">{activeAbilityModule?.label || '木鱼'}</span>
                  <strong className="top-status-value">
                    {formatMetricValue(activeAbilityModuleScore)}
                    <span className="top-status-unit">{activeAbilityModule?.unit || 'OA'}</span>
                  </strong>
                </div>
                <div className="top-status-item top-status-item-timer">
                  <span className="top-status-label">当前状态</span>
                  <strong className="top-status-value top-status-value-compact">
                    {todayRestSession.is_resting ? '休息模式中' : `${runningTasks.length} 个任务计时中`}
                  </strong>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.section
              key="top-board-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "grid gap-2.5 overflow-hidden px-4 py-3 xl:items-stretch sm:px-6",
                isSuggestionOpen
                  ? "xl:grid-cols-[minmax(0,1.74fr)_minmax(300px,0.9fr)]"
                  : "xl:grid-cols-[minmax(0,1fr)_84px]"
              )}
            >
              <div className="grid gap-3 content-start">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{'\u4eca\u591c\u72b6\u6001\u603b\u89c8'}</p>
                      <h3 className="mt-1 text-lg font-bold text-white">{'\u7cbe\u529b\u3001\u538b\u529b\u4e0e\u6fc0\u52b1\u6a21\u5757'}</h3>
                      <p className="mt-1 text-[11px] text-slate-400">{'\u4fdd\u6301\u53d1\u5e03\u7248\u7684\u9605\u8bfb\u987a\u5e8f\uff0c\u53ea\u628a\u6fc0\u52b1\u673a\u5236\u548c\u771f\u5b9e\u7d2f\u8ba1\u63a5\u8fdb\u6765\u3002'}</p>
                    </div>
                    <span className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                      {todayKey}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1.18fr_0.92fr]">
                    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{'\u8d77\u59cb\u7cbe\u529b\u4e0e\u6fc0\u52b1\u6a21\u5757'}</p>
                          <h4 className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                            <BatteryMedium className="h-4 w-4 text-emerald-300" />
                            {'\u5148\u6821\u51c6\u72b6\u6001\uff0c\u518d\u770b\u5f53\u524d\u6fc0\u52b1\u79ef\u7d2f'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-lg font-bold text-emerald-100">
                            {todayInitialEnergy}
                          </span>
                          <span className="rounded-xl border border-violet-300/30 bg-violet-500/10 px-3 py-1 text-lg font-bold text-violet-100">
                            {formatMetricValue(activeAbilityModuleScore)} {activeAbilityModule?.unit || 'OA'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={todayInitialEnergy}
                        onChange={(e) => updateTodayInitialEnergy(Number(e.target.value))}
                        className="mt-4 w-full accent-emerald-400"
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{'\u4f4e\u7535\u91cf'}</span>
                        <span>{todayKey}</span>
                        <span>{'\u9ad8\u72b6\u6001'}</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-3 text-[11px] text-slate-300">
                          睡眠报告（小时）
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={0.5}
                            value={todayStateReport.sleep_hours}
                            onChange={(e) => updateTodaySleepHours(Number(e.target.value))}
                            className="mt-2 w-full accent-emerald-300"
                          />
                          <span className="mt-2 block text-slate-400">{todayStateReport.sleep_hours} 小时</span>
                        </label>
                        <div className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-3 text-[11px] text-slate-300">
                          自我评测
                          <div className="mt-2 grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={`state-${score}`}
                                type="button"
                                onClick={() => updateTodaySelfRating(score)}
                                className={cn(
                                  "rounded-lg border px-0 py-2 text-[11px] font-bold transition-colors",
                                  todayStateReport.self_rating === score
                                    ? "border-emerald-300/60 bg-emerald-500/25 text-white"
                                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                                )}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                          <span className="mt-2 block text-slate-400">1 表示发虚，5 表示清醒能扛。</span>
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-500/10 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{'\u6fc0\u52b1\u6a21\u5757'}</p>
                            <h5 className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                              <Sparkles className="h-4 w-4 text-violet-200" />
                              {activeAbilityModule?.label || '\u6728\u9c7c'}
                            </h5>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsMotivationPanelOpen(true)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-violet-300/30 bg-violet-500/15 px-2.5 py-1.5 text-[10px] font-bold text-violet-100 transition-colors hover:bg-violet-500/25"
                          >
                            <ChevronRight className="h-3 w-3" />
                            {'\u8bbe\u7f6e'}
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)] lg:items-center">
                          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35">
                            {renderMotivationScene()}
                          </div>
                          <div className="grid gap-2">
                            <p className="text-[11px] leading-5 text-violet-100/80">
                              {activeAbilityModule?.description || '\u4efb\u52a1\u8ba1\u65f6\u65f6\u4f1a\u628a\u4e13\u6ce8\u65f6\u95f4\u8f6c\u6210\u5f53\u524d\u6fc0\u52b1\u6a21\u5757\u7684\u5b9e\u9645\u589e\u957f\u3002'}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div className="rounded-xl border border-violet-300/20 bg-slate-950/60 px-3 py-2">
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-100/70">{'\u5f53\u524d\u6a21\u5757'}</div>
                                <div className="mt-1 text-sm font-bold text-white">{activeAbilityModule?.label || '\u6728\u9c7c'}</div>
                              </div>
                              <div className="rounded-xl border border-violet-300/20 bg-slate-950/60 px-3 py-2">
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-100/70">{'\u5b9e\u65f6\u589e\u957f'}</div>
                                <div className="mt-1 text-sm font-bold text-white">+{formatMetricValue(activeModuleLiveGain)}</div>
                              </div>
                              <div className="rounded-xl border border-violet-300/20 bg-slate-950/60 px-3 py-2">
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-100/70">{'\u7d2f\u8ba1\u503c'}</div>
                                <div className="mt-1 text-sm font-bold text-white">{formatMetricValue(activeAbilityModuleScore)}</div>
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-[11px] leading-5 text-violet-100/80">
                              {activeAbilityModule?.gainPerHour || DEFAULT_ABILITY_GAIN_PER_HOUR}{'\u002f\u5c0f\u65f6\uff0c\u5f53\u524d\u6a21\u5f0f\u4e3a'}
                              {activeMotivationMode === 'ability' ? ` ${'\u80fd\u529b\u79ef\u7d2f'} · ${activeAbilityDimension || '\u80fd\u529b'}` : ` ${activeAbilityModule?.label || '\u6728\u9c7c'}`}
                              {'\u3002'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className={cn("rounded-2xl border p-4", pressureTone.card)}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-current/70">{'\u538b\u529b\u503c'}</p>
                            <h4 className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                              <Gauge className="h-4 w-4" />
                              {pressureTone.label}
                            </h4>
                          </div>
                          <span className="text-2xl font-black text-white">{pressureScore}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r", pressureTone.bar)}
                            style={{ width: `${pressureScore}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-current/80">
                          {'\u5f85\u5904\u7406'} {dueTodayTasks.length} {'\u9879\uff0c\u9884\u8ba1'} {dueTodayEstimatedMinutes} {'\u5206\u949f\uff0c\u5df2\u8d85\u65f6'} {overdueTodayTasks.length} {'\u9879\u3002'}
                        </p>
                      </div>

                      <div className={cn("rounded-2xl border p-4", energyTone.card)}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-current/70">{'\u5f53\u524d\u7cbe\u529b'}</p>
                            <h4 className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                              <TrendingUp className="h-4 w-4" />
                              {energyTone.label}
                            </h4>
                          </div>
                          <span className="text-2xl font-black text-white">{energyScore}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r", energyTone.bar)}
                            style={{ width: `${energyScore}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-current/80">
                          {statusSummary}{' · '}{stateSignalSummary}{'\u3002\u5df2\u5b8c\u6210'} {completedTodayTasks.length} {'\u9879\uff0c\u6062\u590d'} {(totalRestRecovery + behaviorRecovery).toFixed(1)} {'\uff0c\u5f53\u524d\u901f\u7387'} {liveEnergyBurnRate.toFixed(0)}{'\u002f\u5c0f\u65f6\u3002'}
                        </p>
                        <p className="behavior-message-inline mt-1 text-[11px] text-current/75">{latestBehaviorMessage}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="text-[11px] text-current/80">
                            {todayRestSession.is_resting ? '\u4f11\u606f\u4e2d\uff0c\u7cbe\u529b\u6b63\u5728\u7f13\u6162\u6062\u590d\u3002' : '\u9700\u8981\u7f13\u51b2\u65f6\uff0c\u53ef\u4ee5\u5f00\u4f11\u606f\u6a21\u5f0f\u56de\u4e00\u70b9\u7cbe\u529b\u3002'}
                          </div>
                          <button
                            type="button"
                            onClick={toggleRestMode}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-colors",
                              todayRestSession.is_resting
                                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                                : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                            )}
                          >
                            <Coffee className="h-3.5 w-3.5" />
                            {todayRestSession.is_resting ? '\u7ed3\u675f\u4f11\u606f' : '\u5f00\u59cb\u4f11\u606f'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">执行中</p>
                      <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-white">
                        <Activity className="h-4 w-4 text-cyan-300" />
                        当前计时与执行列表
                      </h3>
                    </div>
                    <span className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-100">
                      {todayRestSession.is_resting ? '\u4f11\u606f\u4e2d' : `${runningTasks.length} \u6b63\u5728\u505a`}
                    </span>
                  </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-[0.88fr_1.12fr] xl:items-stretch">
                      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-3 flex min-h-0 flex-col">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">{'\u5f53\u524d\u8ba1\u65f6'}</h4>
                          <span className="text-[10px] font-semibold text-cyan-200">{runningTasks.length}</span>
                        </div>
                        {runningTasks.length === 0 ? (
                          <p className="text-[11px] text-cyan-100/70">{'\u8fd8\u6ca1\u6709\u6807\u8bb0\u201c\u73b0\u5728\u6b63\u5728\u505a\u201d\u7684\u4efb\u52a1\u3002'}</p>
                        ) : (
                          <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1 max-h-[22rem]">
                            {runningTasks.map((task) => (
                              <div key={`running-top-${task.id}`} className="rounded-xl border border-cyan-300/20 bg-slate-900/55 px-2.5 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTask(task)}
                                    className="truncate text-left text-[11px] font-semibold text-cyan-50"
                                  >
                                    {task.title || '\u672a\u547d\u540d\u4efb\u52a1'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleTaskTracking(task)}
                                    className="rounded-lg border border-cyan-300/25 bg-cyan-500/15 p-1 text-cyan-100 transition-colors hover:bg-cyan-500/25"
                                    title={"\u6682\u505c\u8ba1\u65f6"}
                                  >
                                    <Pause className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-[10px] text-cyan-100/80">
                                  <TaskRuntimeLabel task={task} mode="plain" />
                                  <span>{'\u8017\u80fd'} {getTaskLiveEnergyBurn(task, nowTs, behaviorBurnRateModifier).toFixed(1)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-teal-400/25 bg-teal-500/10 p-3 flex min-h-0 flex-col">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-100">{'\u6267\u884c\u5217\u8868'}</h4>
                          <span className="text-[10px] font-semibold text-teal-200">{executableTasks.length}</span>
                        </div>
                        {executableTasks.length === 0 ? (
                          <p className="text-[11px] text-teal-100/70">{'\u6682\u65e0\u53ef\u6267\u884c\u4efb\u52a1\uff08\u7b49\u5f85\u524d\u7f6e\u4efb\u52a1\u5b8c\u6210\uff09\u3002'}</p>
                        ) : (
                          <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1 max-h-[22rem]">
                            {executableTasks.map((task) => (
                              <div key={`ready-top-${task.id}`} className="rounded-xl border border-teal-300/20 bg-slate-900/50 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTask(task)}
                                    className="truncate text-left text-[11px] font-semibold text-teal-50"
                                  >
                                    {task.title || '\u672a\u547d\u540d\u4efb\u52a1'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleTaskTracking(task)}
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-colors",
                                      task.tracking_started_at
                                        ? 'border-cyan-300/40 bg-cyan-500/20 text-cyan-100'
                                        : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                                    )}
                                  >
                                    {task.tracking_started_at ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                    {task.tracking_started_at ? '\u6682\u505c' : '\u5f00\u59cb'}
                                  </button>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-300">
                                  <span>{'\u9884\u4f30'} {task.estimated_minutes}m</span>
                                  <TaskActualMinutesLabel task={task} />
                                  <span>{getCognitiveLoadLabel(task.cognitive_load || 'low')}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                </div>

              </div>

              <div className={cn("self-stretch rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 transition-all duration-300 flex min-h-0 flex-col", !isSuggestionOpen && "suggestion-rail px-2 py-4")}>
                <div className="flex items-center justify-between gap-3">
                  <div className={cn(!isSuggestionOpen && "xl:hidden")}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">建议窗口</p>
                    <h3 className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                      <Coffee className="h-4 w-4 text-amber-300" />
                      今日节奏建议
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSuggestionOpen((prev) => !prev)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-slate-900",
                      !isSuggestionOpen && "xl:h-full xl:w-full xl:flex-col xl:justify-center xl:px-2 xl:py-4"
                    )}
                  >
                    <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isSuggestionOpen && "rotate-90")} />
                    <span className={cn(!isSuggestionOpen && "suggestion-rail-label")}>
                      {isSuggestionOpen ? '收起' : '建议'}
                    </span>
                  </button>
                </div>

                {isSuggestionOpen ? (
                  <>
                    <div className="mt-2.5 flex min-h-0 flex-col gap-2.5 xl:flex-1 overflow-y-auto custom-scrollbar pr-1">
                      <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-100/70">外部行为状态</p>
                            <p className="behavior-message-inline mt-1 text-[11px] leading-5 text-amber-50/85">{latestBehaviorMessage}</p>
                          </div>
                          <span className="rounded-lg border border-amber-300/25 bg-slate-950/50 px-2 py-1 text-[10px] font-bold text-amber-100">
                            +{behaviorRecovery.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {activeBehaviorEvents.length === 0 ? (
                            <span className="rounded-full border border-white/10 bg-slate-950/55 px-2 py-1 text-[10px] text-slate-300">
                              暂无生效中的行为
                            </span>
                          ) : (
                            activeBehaviorEvents.map((event) => (
                              <span
                                key={event.id}
                                className="rounded-full border border-amber-300/25 bg-slate-950/55 px-2 py-1 text-[10px] font-semibold text-amber-50"
                              >
                                {event.label} · 还剩 {Math.max(1, Math.ceil((getBehaviorEventEndsAt(event) - nowTs) / 60000))} 分钟
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">节奏提醒</p>
                        <div className="mt-2 space-y-1.5">
                          {wellbeingSuggestions.map((suggestion, index) => (
                            <div
                              key={`${todayKey}-${index}`}
                              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] leading-5 text-slate-200"
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">当下建议先做</p>
                        <div className="mt-2 space-y-1.5">
                          {recommendedNowTasks.length === 0 ? (
                            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-400">
                              当前没有可执行任务，先解除阻塞项或安排休息。
                            </div>
                          ) : (
                            recommendedNowTasks.map((task, index) => (
                              <button
                                key={`recommend-${task.id}`}
                                onClick={() => setSelectedTask(task)}
                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-left transition-colors hover:bg-slate-900"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold text-white">{index + 1}. {task.title || '未命名任务'}</span>
                                  <span className="rounded-md border border-teal-400/25 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-bold text-teal-100">
                                    {(task.stress_score || 3)}/5
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                                  <span className="rounded-md border border-sky-400/25 bg-sky-500/10 px-1.5 py-0.5 text-sky-100">
                                    {getCognitiveLoadLabel(task.cognitive_load || 'low')}
                                  </span>
                                  <span className="rounded-md border border-violet-400/25 bg-violet-500/10 px-1.5 py-0.5 text-violet-100">
                                    {getCollaborationLevelLabel(task.collaboration_level || 'low')}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] leading-5 text-slate-300 line-clamp-2">
                                  {buildRecommendationReason(task, energyScore, nowTs)}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">可一起处理的任务</p>
                        <div className="mt-2 space-y-1.5">
                          {bundleSuggestions.length === 0 ? (
                            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-400">
                              当前没有明显适合打包处理的任务，先完成一个主任务更稳。
                            </div>
                          ) : (
                            bundleSuggestions.map((bundle, index) => (
                              <div
                                key={`bundle-${index}`}
                                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5"
                              >
                                <div className="text-[11px] font-semibold text-white">{bundle.title}</div>
                                <p className="mt-0.5 text-[11px] leading-5 text-slate-300 line-clamp-2">{bundle.description}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </>
                ) : null}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {todayRestSession.is_resting && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-2xl border border-emerald-400/35 bg-slate-950/92 px-4 py-3 shadow-2xl"
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">休息模式</div>
              <div className="mt-1 text-sm font-semibold text-white">正在恢复精力，可随时退出</div>
            </div>
            <button
              type="button"
              onClick={toggleRestMode}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-[11px] font-bold text-emerald-100 transition-colors hover:bg-emerald-500/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              退出休息
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDesignPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDesignPanelOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/60"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/10 glass-modal p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">设计</p>
                  <h3 className="mt-1 text-lg font-bold text-white">AI 任务设计</h3>
                  <p className="mt-1 text-[11px] text-slate-400">用一句话整理今天的任务安排，再写回任务线。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDesignPanelOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-100/75">任务规划</p>
                      <h4 className="mt-2 text-base font-semibold text-white text-safe-wrap">{aiDayPlan.core_focus || currentCoreFocusTitle || '先给今天一句任务说明'}</h4>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-200">
                      {aiDayPlan.tasks.length > 0 ? `${aiDayPlan.tasks.length} 项草案` : `${simpleHomeTasks.length} 项待办`}
                    </span>
                  </div>
                  <textarea
                    value={aiDayPlan.input}
                    onChange={(e) => setAiDayPlan((prev) => ({ ...prev, input: e.target.value }))}
                    placeholder="直接写：今天要做什么、什么时候开会、精力大概怎样。"
                    className="mt-4 min-h-[180px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-rose-300/35"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={generateAIDayPlan}
                      disabled={isGeneratingDayPlan}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/14 px-4 py-2.5 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/22 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGeneratingDayPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {isGeneratingDayPlan ? '整理中' : '生成安排'}
                    </button>
                    <button
                      type="button"
                      onClick={applyAIDayPlanToTasks}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.08]"
                    >
                      <Save className="h-4 w-4" />
                      写入任务
                    </button>
                  </div>
                  {dayPlanError && (
                    <div className="mt-3 rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      {dayPlanError}
                    </div>
                  )}
                </div>

                {aiDayPlan.summary && (
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm leading-6 text-slate-300 text-safe-wrap">{aiDayPlan.summary}</p>
                    {(aiDayPlan.tasks.length > 0 || simpleHomeTasks.length > 0) && (
                      <div className="mt-4 grid gap-2">
                        {(aiDayPlan.tasks.length > 0
                          ? aiDayPlan.tasks.slice(0, 4).map((task, index) => ({
                              key: `draft-${index}`,
                              title: task.title,
                              detail: task.description || `${task.estimated_minutes} 分钟`,
                            }))
                          : simpleHomeTasks.slice(0, 4).map((task) => ({
                              key: task.id,
                              title: task.title || '未命名任务',
                              detail: getTaskNextActionText(task),
                            }))
                        ).map((item, index) => (
                          <div key={item.key} className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">#{index + 1}</div>
                            <div className="mt-1 text-sm font-semibold text-white text-safe-wrap">{item.title}</div>
                            <div className="mt-1 text-[11px] leading-5 text-slate-300 text-safe-wrap">{item.detail}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
        {motivationPanelEnabled && isMotivationPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMotivationPanelOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/60"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/10 glass-modal p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">二级窗口</p>
                  <h3 className="mt-1 text-lg font-bold text-white">激励机制设置</h3>
                  <p className="mt-1 text-[11px] text-slate-400">主状态板已精简，详细切换和能力明细放在这里。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMotivationPanelOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">激励模式</p>
                      <p className="mt-1 text-[11px] text-slate-400">只会激活一个模式。</p>
                    </div>
                    <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                      当前 {activeMotivationMode === 'ability' ? (activeAbilityDimension || '能力成长') : (activeAbilityModule?.label || '木鱼')}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {motivationModeOptions.map((mode) => (
                      <button
                        key={`mode-panel-${mode.id}`}
                        type="button"
                        onClick={() => switchMotivationMode(mode.id)}
                        disabled={mode.disabled}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition-all",
                          mode.disabled
                            ? "cursor-not-allowed border-white/10 bg-white/[0.02] text-slate-500"
                            : "cursor-pointer",
                          activeMotivationMode === mode.id
                            ? "border-teal-400/40 bg-teal-500/12 shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                        )}
                      >
                        <div className="text-sm font-semibold text-white">{mode.label}</div>
                        <p className="mt-2 text-[11px] leading-5 text-slate-300">
                          {mode.id === 'ability'
                            ? '大脑上扬动画，对应你正在关注的能力维度。'
                            : mode.id === 'special:mokugyo'
                              ? '敲木鱼动作会随计时持续触发。'
                              : '财神爷会持续冒出金币。'}
                        </p>
                      </button>
                    ))}
                  </div>

                  {activeMotivationMode === 'ability' && (
                    <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-500/10 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-100">能力维度</p>
                          <p className="mt-1 text-[11px] text-violet-100/75">能力模式下再选择一个具体维度。</p>
                        </div>
                        <span className="rounded-lg border border-violet-300/30 bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-100">
                          {activeAbilityDimension || '未设置'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {abilityDimensionModules.length === 0 ? (
                          <div className="text-[11px] text-violet-100/75">还没有能力维度，先在任务清单里新增一个。</div>
                        ) : (
                          abilityDimensionModules.map((module) => (
                            <button
                              key={`ability-dimension-${module.id}`}
                              type="button"
                              onClick={() => switchAbilityModule(module.id)}
                              className={cn(
                                "cursor-pointer rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                                module.id === activeAbilityModule?.id
                                  ? "border-violet-300/60 bg-violet-500/30 text-white"
                                  : "border-violet-300/20 bg-slate-950/60 text-violet-100/80 hover:bg-slate-900"
                              )}
                            >
                              {module.label} · {formatMetricValue(getAbilityModuleDisplayValue(module.id))} {module.unit}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-violet-300/20 bg-violet-500/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">当前展示说明</p>
                        <p className="mt-1 text-[11px] text-slate-400">主状态板始终只出现当前机制。</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[11px] leading-5 text-slate-300">
                      {activeMotivationMode === 'ability'
                        ? '当前只显示大脑上升动画。木鱼和财神爷不会同时展示。'
                        : activeMotivationMode === 'special:mokugyo'
                          ? '当前只显示木鱼敲击动画。能力和财神爷动画已隐藏。'
                          : '当前只显示财神爷掉金币动画。能力和木鱼动画已隐藏。'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-violet-300/20 bg-violet-500/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">能力排名</p>
                        <h4 className="mt-1 text-sm font-semibold text-white">当前累计能力</h4>
                      </div>
                      <span className="rounded-xl border border-violet-300/30 bg-violet-500/10 px-3 py-1 text-base font-bold text-violet-100">
                        OA {abilityTotalScore}
                      </span>
                    </div>
                    {abilityHighlights.length === 0 ? (
                      <p className="mt-3 text-[11px] text-violet-100/75">还没有能力维度，去任务清单里加一个后这里会自动汇总。</p>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {abilityHighlights.map(([name, value]) => (
                          <div key={`ability-top-${name}`} className="rounded-xl border border-violet-300/25 bg-slate-950/60 px-3 py-2">
                            <div className="text-[11px] font-semibold text-violet-50">{name}</div>
                            <div className="mt-1 text-lg font-bold text-white">{value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="relative flex flex-1 overflow-hidden">
        <div className="custom-scrollbar flex-1 overflow-y-auto px-3 pb-4 sm:px-4 lg:px-5 sm:pb-6">
          <div className="mx-auto grid max-w-[1360px] gap-5 pt-4">
            <div className="grid gap-5">
          <AnimatePresence>
            {isPlacementMode && (
              <motion.div
                initial={{ y: -32, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -32, opacity: 0, scale: 0.96 }}
                className="placement-banner sticky top-4 z-30 flex items-center gap-3 rounded-2xl border border-teal-400/35 bg-teal-900/78 px-4 py-3 text-teal-100 shadow-[0_18px_40px_rgba(7,24,31,0.28)] sm:px-5"
              >
                <MousePointer2 className="placement-banner-icon h-5 w-5 animate-bounce shrink-0 text-teal-300" />
                <span className="text-sm font-semibold sm:text-base">请在下方四象限地图点击一个位置来放置任务</span>
                <button
                  type="button"
                  onClick={() => setIsPlacementMode(false)}
                  className="ml-auto rounded-full p-1.5 transition-colors hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

              <section className="hidden" />

              <TasksHomeView
                homeSurface={homeSurface === 'map' ? 'map' : 'line'}
                setHomeSurface={setHomeSurface}
                renderInlineEnergyBar={renderInlineEnergyBar}
                currentPrimaryTask={currentPrimaryTask}
                currentPrimaryTasks={currentPrimaryTasks}
                currentPrimaryIsParallel={currentPrimaryIsParallel}
                setIsTaskListOpen={setIsTaskListOpen}
                setIsDesignPanelOpen={setIsDesignPanelOpen}
                handleAddTask={handleAddTask}
                draggedLineTaskId={draggedLineTaskId}
                setPrimaryTaskId={setPrimaryTaskId}
                clearTaskDragState={endTaskDrag}
                renderTaskCard={renderTaskCard}
                requestHourlyFocusCheckin={requestHourlyFocusCheckin}
                isGeneratingFocusCheckin={isGeneratingFocusCheckin}
                runningTasks={runningTasks}
                focusCheckin={focusCheckin}
                focusCheckinError={focusCheckinError}
                respondToFocusCheckin={respondToFocusCheckin}
                homeLineTasks={homeLineTasks}
                homeLineRows={homeLineRows}
                moveTaskToLine={moveTaskToLine}
                renderTaskLine={renderTaskLine}
                setDragOverLineTaskId={setDragOverLineTaskId}
                setDragOverLineZone={setDragOverLineZone}
                energyMapTasks={energyMapTasks}
                energyElevatorGroups={energyElevatorGroups}
                dragOverLineTaskId={dragOverLineTaskId}
                moveTaskToElevatorLevel={moveTaskToElevatorLevel}
                endTaskDrag={endTaskDrag}
                startTaskDrag={startTaskDrag}
                setSelectedTask={setSelectedTask}
                quadrantRef={quadrantRef}
                handleQuadrantClick={handleQuadrantClick}
                isPlacementMode={isPlacementMode}
                mousePos={mousePos}
                renderDependencyLines={renderDependencyLines}
                renderTaskPoint={renderTaskPoint}
                activeTasks={activeTasks}
                archivedTasks={archivedTasks}
              />

              <section className="hidden">
                <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.94),rgba(8,19,31,0.86))] p-5 shadow-[0_20px_52px_rgba(2,8,18,0.28)]">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200/75">聚焦卡组</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">同时只盯 1 到 2 项</h3>
                    </div>
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-500/12 px-3 py-1 text-[11px] font-semibold text-cyan-100">
                      正在做 {runningTasks.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {focusDeck.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm leading-6 text-slate-400">
                        还没有进入聚焦卡组的任务。先从今日承诺池里挑一个开始计时。
                      </div>
                    ) : (
                      focusDeck.map((task, index) =>
                        renderTaskCard(task, {
                          laneLabel: task.tracking_started_at ? '正在做' : index === 0 ? '下一位' : '候补位',
                          note: task.tracking_started_at
                            ? '先让它跑完一个完整段落，再决定是否暂停。'
                            : index === 0
                              ? '下一次切换时优先接这个，不再额外开新坑。'
                              : '只有当前面任务收束后再把它推上来。',
                          tone: 'focus',
                        })
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,19,29,0.94),rgba(8,16,24,0.9))] p-5 shadow-[0_20px_52px_rgba(2,8,18,0.26)]">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200/75">低能备选</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">精力掉下去时也能推进</h3>
                    </div>
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                      备用 {lowEnergyStandby.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {lowEnergyStandby.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm leading-6 text-slate-400">
                        当前没有低认知、低协作的任务。可以补两三个 10 到 20 分钟的小动作备用。
                      </div>
                    ) : (
                      lowEnergyStandby.map((task) =>
                        renderTaskCard(task, {
                          laneLabel: '低能也能推',
                          note: '脑子发钝时先清这个，维持推进感，不要硬顶重活。',
                          tone: 'standby',
                        })
                      )
                    )}
                  </div>
                </div>
              </section>

              <section className="hidden">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200/75">今日承诺池</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">按 1-3-5 收敛，代办一眼可读</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      1 个重任务，3 个中任务，5 个轻任务。超出的先留在稍后处理区，不再全塞进今天。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className="rounded-full border border-rose-300/25 bg-rose-500/12 px-3 py-1 text-rose-100">
                      重任务 {dailyMix.big.length}/1
                    </span>
                    <span className="rounded-full border border-amber-300/25 bg-amber-500/12 px-3 py-1 text-amber-100">
                      中任务 {dailyMix.medium.length}/3
                    </span>
                    <span className="rounded-full border border-sky-300/25 bg-sky-500/12 px-3 py-1 text-sky-100">
                      轻任务 {dailyMix.small.length}/5
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">
                      溢出 {dailyMix.overflow.length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  <div className="grid gap-3 rounded-[1.35rem] border border-rose-300/18 bg-rose-500/[0.07] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-100/80">1 个重任务</p>
                        <h4 className="mt-1 text-sm font-semibold text-white">只留一个真正要啃的</h4>
                      </div>
                      <span className="text-[11px] font-semibold text-rose-100">{dailyMix.big.length}/1</span>
                    </div>
                    {dailyMix.big.length === 0 ? (
                      <div className="rounded-[1.05rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-slate-400">
                        还没选出今天最重要的一件事。把一个高价值任务拖进来。
                      </div>
                    ) : (
                      dailyMix.big.map((task) =>
                        renderTaskCard(task, {
                          laneLabel: '重任务',
                          tone: 'today',
                        })
                      )
                    )}
                  </div>

                  <div className="grid gap-3 rounded-[1.35rem] border border-amber-300/18 bg-amber-500/[0.07] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/80">3 个中任务</p>
                        <h4 className="mt-1 text-sm font-semibold text-white">推进主线，但别挤满</h4>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-100">{dailyMix.medium.length}/3</span>
                    </div>
                    {dailyMix.medium.length === 0 ? (
                      <div className="rounded-[1.05rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-slate-400">
                        这里留给能推动进度但不需要满血状态的任务。
                      </div>
                    ) : (
                      dailyMix.medium.map((task) =>
                        renderTaskCard(task, {
                          laneLabel: '中任务',
                          tone: 'today',
                        })
                      )
                    )}
                  </div>

                  <div className="grid gap-3 rounded-[1.35rem] border border-sky-300/18 bg-sky-500/[0.07] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-100/80">5 个轻任务</p>
                        <h4 className="mt-1 text-sm font-semibold text-white">填缝用的小动作</h4>
                      </div>
                      <span className="text-[11px] font-semibold text-sky-100">{dailyMix.small.length}/5</span>
                    </div>
                    {dailyMix.small.length === 0 ? (
                      <div className="rounded-[1.05rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-slate-400">
                        可以补几个 10 到 20 分钟的轻任务，专门拿来切换节奏。
                      </div>
                    ) : (
                      dailyMix.small.map((task) =>
                        renderTaskCard(task, {
                          laneLabel: '轻任务',
                          tone: 'today',
                        })
                      )
                    )}
                  </div>
                </div>
              </section>

              <section className="hidden">
                <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,28,0.94),rgba(7,14,23,0.9))] p-5 shadow-[0_18px_44px_rgba(2,8,18,0.26)]">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">稍后处理</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">能做，但今天先不承诺</h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-200">
                      稍后 {laterReadyQueue.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {laterReadyQueue.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm leading-6 text-slate-400">
                        没有额外的可执行任务，今天的承诺池已经比较干净。
                      </div>
                    ) : (
                      laterReadyQueue.map((task) =>
                        renderTaskCard(task, {
                          laneLabel: '稍后再做',
                          note: '它并不紧急，先别把今天的盘子撑大。',
                          tone: 'today',
                        })
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,10,0.94),rgba(17,13,8,0.9))] p-5 shadow-[0_18px_44px_rgba(2,8,18,0.26)]">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100/75">阻塞队列</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">先看卡住点，不在脑子里挂着</h3>
                    </div>
                    <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-100">
                      阻塞 {blockedQueue.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {blockedQueue.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm leading-6 text-slate-400">
                        当前没有明显阻塞项，执行面已经比较顺畅。
                      </div>
                    ) : (
                      blockedQueue.map((task) =>
                        renderTaskCard(task, {
                          laneLabel: '阻塞中',
                          note: getTaskBlockingLabel(task),
                          tone: 'blocked',
                        })
                      )
                    )}
                  </div>
                </div>
              </section>

            </div>

            <aside className="hidden">
              <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,16,28,0.95),rgba(8,19,31,0.9))] p-5 shadow-[0_24px_54px_rgba(2,8,18,0.32)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">精力驾驶舱</p>
                <h3 className="mt-1 text-lg font-semibold text-white">先看状态，再决定下一步怎么推进</h3>

                <div className={cn("mt-4 rounded-[1.25rem] border px-4 py-4", energyTone.card)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-current/70">当前精力</p>
                      <h4 className="mt-1 text-base font-semibold text-white">{energyTone.label}</h4>
                    </div>
                    <span className="text-2xl font-black text-white">{energyScore}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25">
                    <div className={cn("h-full rounded-full bg-gradient-to-r", energyTone.bar)} style={{ width: `${energyScore}%` }} />
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-current/80">
                    已完成 {completedTodayTasks.length} 项，累计恢复 {(totalRestRecovery + behaviorRecovery).toFixed(1)}，当前速率 {liveEnergyBurnRate.toFixed(0)}/小时。
                  </p>
                </div>

                <div className={cn("mt-3 rounded-[1.25rem] border px-4 py-4", pressureTone.card)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-current/70">时间压力</p>
                      <h4 className="mt-1 text-base font-semibold text-white">{pressureTone.label}</h4>
                    </div>
                    <span className="text-2xl font-black text-white">{pressureScore}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25">
                    <div className={cn("h-full rounded-full bg-gradient-to-r", pressureTone.bar)} style={{ width: `${pressureScore}%` }} />
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-current/80">
                    待处理 {dueTodayTasks.length} 项，预计 {dueTodayEstimatedMinutes} 分钟，已超时 {overdueTodayTasks.length} 项。
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {wellbeingSuggestions.slice(0, 4).map((suggestion, index) => (
                    <div
                      key={`wellbeing-side-${todayKey}-${index}`}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-slate-200"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </section>

              {motivationPanelEnabled && (
              <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,17,27,0.95),rgba(8,16,24,0.88))] p-5 shadow-[0_22px_52px_rgba(2,8,18,0.28)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-200/75">推进感</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{activeAbilityModule?.label || '专注反馈'}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMotivationPanelOpen(true)}
                    className="inline-flex items-center gap-1 rounded-xl border border-violet-300/25 bg-violet-500/12 px-3 py-1.5 text-[11px] font-semibold text-violet-100 transition-colors hover:bg-violet-500/20"
                  >
                    设置
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-4 overflow-hidden rounded-[1.3rem] border border-white/10 bg-slate-950/35">
                  {renderMotivationScene()}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">任务总量</div>
                    <div className="mt-1 text-sm font-semibold text-white">{activeTasks.length} 项待办</div>
                    <p className="mt-1 text-[11px] text-slate-400">估时 {totalEstimatedMinutes} 分钟，实际 {totalActualMinutes} 分钟。</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">今日结构</div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      承诺 {dailyMixTaskIds.size} / 低能 {lowEnergyTaskIds.size}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">剩下的任务全部退到稍后或阻塞区，不再挤进眼前。</p>
                  </div>
                </div>
              </section>
              )}
            </aside>
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
                            <p className="text-[10px] text-violet-100/70">当前能力值 {formatMetricValue(liveAbilityScores[dimension] || 0)}</p>
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
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20 gap-6">
                    <div className="w-16 h-16 bg-white/[0.03] rounded-3xl flex items-center justify-center ring-1 ring-white/5 shadow-inner">
                      <ListTodo className="w-8 h-8 opacity-40" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-semibold text-sm">暂无任务</p>
                      <p className="text-xs opacity-60">当前没有任务记录，从第一个任务开始吧。</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTaskListOpen(false);
                        handleAddTask();
                      }}
                      className="rounded-xl border border-violet-300/30 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/30 transition-colors"
                    >
                      立刻新建任务
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-teal-100">进行中任务</h3>
                      {activeTasks.length === 0 ? (
                        <p className="text-xs text-slate-400">暂无进行中任务。</p>
                      ) : (
                        [...activeTasks].sort((a, b) => b.created_at - a.created_at).map(task => (
                          <div
                            key={task.id}
                            className="w-full p-5 border border-white/10 rounded-2xl text-left hover:border-teal-500/50 hover:bg-teal-500/5 hover:shadow-[0_0_20px_rgba(20,184,166,0.1)] transition-all group bg-white/[0.02]"
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedTask(task);
                                setIsTaskListOpen(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedTask(task);
                                  setIsTaskListOpen(false);
                                }
                              }}
                              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-xl"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">{task.title || '未命名任务'}</h3>
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 group-hover:text-teal-400 transition-all shrink-0" />
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                              <TaskActualMinutesLabel
                                task={task}
                                className="rounded-md border border-cyan-400/25 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-100"
                              />
                              {task.tracking_started_at && (
                                <TaskRuntimeLabel
                                  task={task}
                                  mode="card"
                                  className="rounded-md border border-cyan-400/25 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-100"
                                />
                              )}
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
                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() => toggleTaskTracking(task)}
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                                  task.tracking_started_at
                                    ? "border-cyan-300/40 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30"
                                    : "border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
                                )}
                              >
                                {task.tracking_started_at ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                {task.tracking_started_at ? '暂停计时' : '标记正在做'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-teal-100">长期任务管理（唯一删除入口）</h3>
                      {longTermTasks.length === 0 ? (
                        <p className="text-xs text-slate-400">暂无长期任务。</p>
                      ) : (
                        longTermTasks.map((task) => (
                          <div key={`long-${task.id}`} className="rounded-xl border border-teal-300/20 bg-teal-500/10 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-teal-50">{task.title || '未命名任务'}</p>
                              <button
                                onClick={() => deleteTask(task.id, { allowLongTerm: true })}
                                className="rounded-lg p-1 text-teal-100/70 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
                                title="删除长期任务"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="mt-1 text-[10px] text-teal-100/70">上次完成：{formatDateTime(task.last_completed_at)}</p>
                            <p className="text-[10px] text-teal-100/70">下次周期：{formatDateTime(task.next_due_at)}</p>
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
                    className="w-full rounded-md border-none bg-transparent p-0 text-3xl font-bold text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                  />
                  <div className="flex items-start gap-4 text-slate-400 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                    <Info className="w-5 h-5 shrink-0 mt-0.5 text-slate-500" />
                    <textarea
                      placeholder="添加一些详细描述，AI 会根据这些信息为你规划..."
                      className="w-full min-h-[100px] rounded-md border-none bg-transparent p-0 text-base leading-relaxed text-slate-300 placeholder:text-slate-600 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
                          ? "border-teal-300/60 bg-teal-500/20 text-teal-100"
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

                  <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">正在做 / 计时</h4>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {selectedTask.tracking_started_at ? '计时进行中' : '当前未计时'}
                        </p>
                        <TaskRuntimeBreakdown
                          task={selectedTask}
                          className="mt-1 text-[11px] leading-5 text-cyan-100/80"
                        />
                        <p className="mt-1 text-[11px] leading-5 text-cyan-100/80">
                          当前实时精力消耗速率 {getTaskEnergyBurnRate(selectedTask, behaviorBurnRateModifier)}/小时。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleTaskTracking(selectedTask)}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
                          selectedTask.tracking_started_at
                            ? "border border-cyan-300/40 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30"
                            : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                        )}
                      >
                        {selectedTask.tracking_started_at ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {selectedTask.tracking_started_at ? '暂停计时' : '开始计时'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-rose-100">任务压力量表</h4>
                      <div className="mt-3 grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={`stress-${score}`}
                            type="button"
                            onClick={() => setSelectedTask({ ...selectedTask, stress_score: score })}
                            className={cn(
                              "rounded-xl border px-2 py-2 text-xs font-bold transition-all",
                              (selectedTask.stress_score || 3) === score
                                ? "border-rose-300/60 bg-rose-500/30 text-white"
                                : "border-rose-200/20 bg-slate-950/60 text-rose-100/70 hover:bg-slate-900"
                            )}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-rose-100/80">
                        1 表示轻松，5 表示高压。系统会把它纳入今日压力值计算。
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">完成后精力影响</h4>
                      <div className="mt-3 grid grid-cols-5 gap-2">
                        {ENERGY_DELTA_OPTIONS.map((option) => (
                          <button
                            key={`energy-${option.value}`}
                            type="button"
                            onClick={() => setSelectedTask({ ...selectedTask, energy_delta: option.value })}
                            className={cn(
                              "rounded-xl border px-2 py-2 text-[11px] font-bold transition-all",
                              (selectedTask.energy_delta || 0) === option.value
                                ? "border-emerald-300/60 bg-emerald-500/30 text-white"
                                : "border-emerald-200/20 bg-slate-950/60 text-emerald-100/75 hover:bg-slate-900"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-emerald-100/80">
                        当前设置：{getEnergyDeltaLabel(selectedTask.energy_delta || 0)}。完成任务后会参与今日精力估算。
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-sky-300/20 bg-sky-500/10 p-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-sky-100">认知负荷</h4>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {COGNITIVE_LOAD_OPTIONS.map((option) => (
                          <button
                            key={`cognitive-${option.value}`}
                            type="button"
                            onClick={() => setSelectedTask({ ...selectedTask, cognitive_load: option.value })}
                            className={cn(
                              "rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                              (selectedTask.cognitive_load || 'low') === option.value
                                ? "border-sky-300/60 bg-sky-500/30 text-white"
                                : "border-sky-200/20 bg-slate-950/60 text-sky-100/75 hover:bg-slate-900"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-sky-100/80">
                        高认知任务更适合在精力充足时进入深度工作块。
                      </p>
                    </div>

                    <div className="rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-violet-100">协作化程度</h4>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {COLLABORATION_LEVEL_OPTIONS.map((option) => (
                          <button
                            key={`collaboration-${option.value}`}
                            type="button"
                            onClick={() => setSelectedTask({ ...selectedTask, collaboration_level: option.value })}
                            className={cn(
                              "rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                              (selectedTask.collaboration_level || 'low') === option.value
                                ? "border-violet-300/60 bg-violet-500/30 text-white"
                                : "border-violet-200/20 bg-slate-950/60 text-violet-100/75 hover:bg-slate-900"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-violet-100/80">
                        高协作任务会被建议集中到同一段沟通时间里处理。
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-200">执行方式</h4>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(['serial', 'parallel'] as TaskExecutionMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTaskExecutionMode([selectedTask.id], mode)}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                            (selectedTask.execution_mode || 'serial') === mode
                              ? "border-white/50 bg-white/18 text-white"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                          )}
                        >
                          {mode === 'serial' ? '串行推进' : '并行挂起'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      串行表示这件事会独占注意力；并行更适合等待 AI、回复或外部反馈时穿插推进。
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-200">任务类别</h4>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {TASK_CATEGORY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedTask({ ...selectedTask, category_key: option.value })}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                            (selectedTask.category_key || 'misc') === option.value
                              ? "border-white/50 bg-white/18 text-white"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      用类别把任务分回你的真实工作结构：科研、开发、学习、杂项。
                    </p>
                  </div>

                  {selectedTask.timeline === 'long_term' && (
                    <div className="space-y-3 rounded-xl border border-teal-300/20 bg-teal-500/10 p-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">长期任务周期</h4>
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
                                ? "border-teal-300/60 bg-teal-500/25 text-teal-50"
                                : "border-teal-300/25 bg-slate-950/60 text-teal-100/80 hover:bg-slate-900"
                            )}
                          >
                            {cadence === 'daily' ? '每日' : cadence === 'weekly' ? '每周' : '每几天'}
                          </button>
                        ))}
                      </div>
                      {selectedTask.long_term_cadence === 'interval' && (
                        <label className="block text-xs text-teal-100/90">
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
                            className="mt-2 w-full rounded-lg border border-teal-300/30 bg-slate-950/70 px-2 py-1.5 text-sm text-white"
                          />
                        </label>
                      )}
                      <div className="rounded-lg border border-teal-300/20 bg-slate-950/60 px-2 py-2 text-[11px] text-teal-50">
                        <p>上次完成：{formatDateTime(selectedTask.last_completed_at)}</p>
                        <p className="mt-1">
                          下次周期：{formatDateTime(selectedTask.next_due_at)}
                          {!isLongTermDue(selectedTask, nowTs) && <span className="ml-2 text-teal-200/80">尚未到期</span>}
                        </p>
                        <p className="mt-1 text-teal-100/80">完成按钮只会完成本次并自动进入下一周期，不会删除任务。</p>
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
                      <Link2 className="h-3.5 w-3.5 text-teal-300" />
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
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-300" />
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
                    <button
                      type="button"
                      className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-12 text-center transition-all hover:border-teal-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      onClick={() => generateAIPlan(selectedTask)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 via-teal-500/0 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-16 h-16 bg-white/[0.03] ring-1 ring-white/10 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500">
                        <Sparkles className="w-8 h-8 text-slate-500 group-hover:text-teal-400 transition-colors" />
                      </div>
                      <p className="text-sm font-semibold text-slate-400 group-hover:text-teal-100 transition-colors">点击“生成计划”获取 AI 的专业建议</p>
                    </button>
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
                            "flex-1 rounded-md border-none bg-transparent p-0 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
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
                        const newStep = createTaskStep();
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

      <PointerParticles />

      <div className="pointer-events-none fixed z-[96] flex flex-col items-end gap-2.5">
        <AnimatePresence>
          {isBehaviorChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10, originX: 1, originY: 1 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{
                position: 'fixed',
                right: `${Math.max(16, live2dUiAnchor.right + (isLive2dReady ? Math.round(live2dUiAnchor.height * 0.72) : 0))}px`,
                top: `${Math.max(16, live2dUiAnchor.top - 536)}px`,
                zIndex: 96,
              }}
              className="behavior-chat-shell pointer-events-auto flex h-[33rem] w-[21rem] min-w-0 flex-col p-3 cursor-auto"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <MessageSquare className="h-4 w-4 text-cyan-300" />
                    聊聊现在
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBehaviorChatOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {EXTERNAL_BEHAVIOR_PRESETS.slice(0, 4).map((preset) => (
                  <button
                    key={`quick-behavior-${preset.id}`}
                    type="button"
                    onClick={() => submitBehaviorChat(`我${preset.label}了`)}
                    disabled={isBehaviorChatSending}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-slate-100 transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="behavior-dialog-panel mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55">
                <div ref={behaviorChatViewportRef} className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-3 py-3">
                  {todayChatMessages.length === 0 ? (
                    <div className="behavior-chat-empty rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-[13px] leading-6 text-slate-200">
                      你好呀
                    </div>
                  ) : (
                    todayChatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn("behavior-message-row flex", message.role === 'user' ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            "behavior-message-bubble max-w-[92%] rounded-2xl px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.16)]",
                            message.role === 'user' ? 'behavior-message-user' : 'behavior-message-assistant'
                          )}
                        >
                          <div className="behavior-message-role">
                            {message.role === 'user' ? '你' : '助手'}
                          </div>
                          <div className="behavior-message-text whitespace-pre-wrap break-words">{message.text}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {isBehaviorChatSending && (
                    <div className="behavior-message-row flex justify-start">
                      <div className="behavior-message-bubble behavior-message-assistant max-w-[92%] rounded-2xl px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
                        <div className="behavior-message-role">助手</div>
                        <div className="inline-flex items-center gap-2 text-[13px] text-cyan-100/90">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          正在想
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/8 px-3 py-3">
                  {behaviorChatError ? (
                    <div className="mb-2 rounded-xl border border-amber-300/20 bg-amber-400/[0.08] px-3 py-2 text-[12px] text-amber-100">
                      {behaviorChatError}
                    </div>
                  ) : null}
                  <div className="behavior-dialog-input flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <input
                      type="text"
                      value={behaviorChatInput}
                      onChange={(e) => setBehaviorChatInput(e.target.value)}
                      disabled={isBehaviorChatSending}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void submitBehaviorChat();
                        }
                      }}
                      placeholder={BEHAVIOR_CHAT_PLACEHOLDER}
                      className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      disabled={isBehaviorChatSending}
                      onClick={() => {
                        void submitBehaviorChat();
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-500/16 text-cyan-100 transition-colors hover:bg-cyan-500/24 disabled:cursor-not-allowed disabled:opacity-55"
                      aria-label="发送行为记录"
                    >
                      {isBehaviorChatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isBehaviorChatOpen && behaviorNudge && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              onClick={() => setIsBehaviorChatOpen(true)}
              style={{
                position: 'fixed',
                right: `${Math.max(16, live2dUiAnchor.right + (isLive2dReady ? Math.round(live2dUiAnchor.height * 0.34) : 0))}px`,
                top: `${Math.max(16, live2dUiAnchor.top - 92)}px`,
                zIndex: 96,
              }}
              className="behavior-nudge pointer-events-auto self-end text-left"
            >
              <span className="behavior-nudge-text">{behaviorNudge}</span>
            </motion.button>
          )}
        </AnimatePresence>

        {!isLive2dReady && (
          <button
            onClick={() => setIsBehaviorChatOpen((prev) => !prev)}
            className="behavior-chat-trigger pointer-events-auto self-end"
            title="打开聊天"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        )}
      </div>
        </>
      ) : currentView === 'world_news' ? (
        <WorldNewsView
          rssFeeds={rssFeeds}
          setRssFeeds={setRssFeeds}
          newsItems={newsItems}
          setNewsItems={setNewsItems}
          newsPreferences={newsPreferences}
          setNewsPreferences={setNewsPreferences}
          savedLinks={savedLinks}
          setSavedLinks={setSavedLinks}
          abilityModule={abilityModule}
          spendSpecialReward={spendSpecialReward}
          authToken={authToken}
          onUnauthorized={() => {
            clearAuth();
            setLoginError('登录已过期，请重新登录。');
          }}
          ideaNotes={ideaNotes}
          setIdeaNotes={setIdeaNotes}
          tasks={tasks}
          setTasks={setTasks}
          coreFocusTitle={currentCoreFocusTitle}
        />
      ) : (
        <AdminResetView
          authToken={authToken}
          currentUser={authUser || loginUsername}
          onUnauthorized={() => {
            clearAuth();
            setLoginError('登录已过期，请重新登录。');
          }}
        />
      )}
    </div >
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
  const quadrantZone = getTaskQuadrantZone(task, nowTs);
  const quadrantMeta = TASK_QUADRANT_ZONE_META[quadrantZone];
  const urgency = Math.round(100 - renderY);
  const importance = Math.round(task.x);
  const isBottomHalf = renderY >= 58;
  const isLeftEdge = task.x <= 18;
  const isRightEdge = task.x >= 82;
  const labelPositionClass = isBottomHalf
    ? (isLeftEdge
      ? "bottom-full left-0 mb-2"
      : isRightEdge
        ? "bottom-full right-0 mb-2"
        : "bottom-full left-1/2 -translate-x-1/2 mb-2")
    : (isLeftEdge
      ? "top-full left-0 mt-2"
      : isRightEdge
        ? "top-full right-0 mt-2"
        : "top-full left-1/2 -translate-x-1/2 mt-2");

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
          if (!isDragging) {
            onOpen();
          }
        }}
        className={cn(
          "relative group cursor-grab active:cursor-grabbing p-4",
          isDragging && "scale-110 z-50"
        )}
      >
        {/* Progress Ring / Circle Backdrop */}
        <div
          className={cn(
            "task-point-shell task-point-shell-simple w-11 h-11 rounded-full overflow-hidden relative transition-all duration-300 border",
            timelineAccent.ring
          )}
          data-zone={quadrantZone}
          style={{
            ['--task-point-zone' as string]: quadrantMeta.tint,
            ['--task-point-zone-strong' as string]: quadrantMeta.strong,
            ['--task-point-progress' as string]: `${Math.max(8, progress)}%`,
            ['--task-point-node' as string]: nodeColor,
          } as React.CSSProperties}
        >
          <div className="task-point-progress-donut" />
          <div className="task-point-inner">
            <div className="task-point-core-dot" style={{ backgroundColor: nodeColor }} />
          </div>
          <div className="task-point-glow" />
        </div>

        {/* Always-visible label */}
        <div className={cn("absolute pointer-events-none", labelPositionClass)}>
          <div
            className="task-point-label rounded-[1rem] border px-2.5 py-2 shadow-xl"
            data-zone={quadrantZone}
            style={{
              ['--task-point-zone' as string]: quadrantMeta.tint,
              ['--task-point-zone-strong' as string]: quadrantMeta.strong,
            } as React.CSSProperties}
          >
            <div className="flex items-start gap-2">
              <span className="task-point-dot mt-1 shrink-0" style={{ backgroundColor: nodeColor }} />
              <span className="task-point-title line-clamp-2 text-[11px] font-semibold leading-4">{task.title || '未命名'}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              <span className="task-point-zone-badge">{quadrantMeta.badge}</span>
              <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold", timelineAccent.badge)}>
                {task.timeline === 'long_term' ? '长' : '临'}
              </span>
              <span className="task-point-mini-score">{importance}/{urgency}</span>
            </div>
            {task.timeline === 'temporary' && task.deadline_at && (
              <div className={cn(
                "mt-1.5 rounded border px-1.5 py-0.5 text-[9px] font-bold",
                task.deadline_at <= nowTs
                  ? "border-[#FFBABA]/80 bg-[#FFBABA]/35 text-[#355244]"
                  : "border-[#F7C5A8]/80 bg-[#F7C5A8]/30 text-[#355244]"
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



