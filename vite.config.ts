import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const dataDir = path.resolve(__dirname, '.data');
const legacyTasksFile = path.join(dataDir, 'tasks.json');
const authUsersFile = path.join(dataDir, 'auth-users.json');

type Req = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  on: (event: string, cb: (chunk?: Buffer) => void) => void;
};

type Res = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

type AiConfig = {
  apiKey: string;
  apiBase: string;
  model: string;
};

type AuthConfig = {
  seedUsers: Array<{
    username: string;
    password: string;
  }>;
  adminUsers: Set<string>;
  allowRegistration: boolean;
  sessionTtlMs: number;
};

type PlanTask = {
  title: string;
  description: string;
};

type DayPlanRequest = {
  input?: string;
  energy?: number;
  existingTasks?: Array<{
    title?: string;
    estimated_minutes?: number;
    status?: string;
  }>;
};

type FocusCheckinRequest = {
  primaryTask?: {
    title?: string;
    next_action?: string;
    cognitive_load?: string;
    collaboration_level?: string;
    execution_mode?: string;
    current_session_minutes?: number;
  } | null;
  runningTasks?: Array<{
    title?: string;
    execution_mode?: string;
    current_session_minutes?: number;
  }>;
  energyScore?: number;
  pressureScore?: number;
  sleepHours?: number;
  selfRating?: number;
};

type SessionRecord = {
  username: string;
  expiresAt: number;
};

type RegisteredUser = {
  username: string;
  username_normalized: string;
  salt: string;
  password_hash: string;
  created_at: number;
  updated_at?: number;
  password_reset_at?: number;
  auth_source?: string;
};

const sessions = new Map<string, SessionRecord>();

function sendJson(res: Res, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function sendText(res: Res, statusCode: number, body: string, contentType = 'text/plain; charset=utf-8') {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  res.end(body);
}

function getHeader(req: Req, name: string) {
  const target = name.toLowerCase();
  const matched = Object.entries(req.headers || {}).find(([key]) => key.toLowerCase() === target)?.[1];
  return Array.isArray(matched) ? matched[0] : matched;
}

function getRequestUrl(req: Req) {
  return new URL(req.url || '/', 'http://localhost');
}

function getRequestPath(req: Req) {
  return getRequestUrl(req).pathname;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function isValidUsername(username: string) {
  return /^[a-zA-Z0-9._-]{3,32}$/.test(username);
}

function isValidPassword(password: string) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.createHash('sha256').update(`${salt}:${password}`, 'utf-8').digest('hex');
  return { salt, passwordHash };
}

function parseAdminUsers(raw: string | undefined, seedUsers: Array<{ username: string }>) {
  if (raw) {
    const users = raw
      .split(',')
      .map((item) => normalizeUsername(item))
      .filter(Boolean);
    if (users.length > 0) {
      return new Set(users);
    }
  }

  if (seedUsers.length > 0) {
    return new Set([normalizeUsername(seedUsers[0].username)]);
  }

  return new Set(['admin']);
}

function isAdminUsername(username: string, authConfig: AuthConfig) {
  return authConfig.adminUsers.has(normalizeUsername(username));
}

function getUserTasksFile(username: string) {
  const safeUser = encodeURIComponent(normalizeUsername(username));
  return path.join(dataDir, 'users', safeUser, 'tasks.json');
}

function createDefaultTaskPayload(tasks: unknown[] = []) {
  return {
    tasks,
    ability_dimensions: [],
    wellbeing: { daily_checkins: {}, daily_rest_sessions: {}, daily_state_reports: {} },
    ability_module: { active_module_id: 'special:mokugyo', special_totals: {}, tracked_ms_baseline: 0, updated_at: Date.now() },
    ai_day_plan: {
      input: '',
      summary: '',
      core_focus: '',
      schedule_markdown: '',
      tasks: [],
      updated_at: 0,
    },
    focus_reminders: {
      enabled: false,
      desktop_notifications: false,
      interval_minutes: 35,
      last_notified_at: null,
    },
    calendar_subscription_token: '',
    rss_feeds: [],
    news_items: [],
    idea_notes: [],
    news_preferences: { ignored_terms: [], updated_at: Date.now() },
    saved_links: [],
  };
}

function normalizeTaskPayloadForDev(parsed: unknown) {
  if (Array.isArray(parsed)) {
    return createDefaultTaskPayload(parsed);
  }

  if (!parsed || typeof parsed !== 'object') {
    return createDefaultTaskPayload();
  }

  const raw = parsed as Record<string, unknown>;
  const defaults = createDefaultTaskPayload();
  return {
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    ability_dimensions: Array.isArray(raw.ability_dimensions) ? raw.ability_dimensions : [],
    wellbeing: raw.wellbeing && typeof raw.wellbeing === 'object' ? raw.wellbeing : defaults.wellbeing,
    ability_module: raw.ability_module && typeof raw.ability_module === 'object' ? raw.ability_module : defaults.ability_module,
    ai_day_plan: raw.ai_day_plan && typeof raw.ai_day_plan === 'object' ? raw.ai_day_plan : defaults.ai_day_plan,
    focus_reminders: raw.focus_reminders && typeof raw.focus_reminders === 'object' ? raw.focus_reminders : defaults.focus_reminders,
    calendar_subscription_token: typeof raw.calendar_subscription_token === 'string' ? raw.calendar_subscription_token : '',
    rss_feeds: Array.isArray(raw.rss_feeds) ? raw.rss_feeds : [],
    news_items: Array.isArray(raw.news_items) ? raw.news_items : [],
    idea_notes: Array.isArray(raw.idea_notes) ? raw.idea_notes : [],
    news_preferences: raw.news_preferences && typeof raw.news_preferences === 'object' ? raw.news_preferences : defaults.news_preferences,
    saved_links: Array.isArray(raw.saved_links) ? raw.saved_links : [],
  };
}

async function readTasks(username: string) {
  const tasksFile = getUserTasksFile(username);
  try {
    const text = await fs.promises.readFile(tasksFile, 'utf-8');
    const parsed = JSON.parse(text);
    return normalizeTaskPayloadForDev(parsed);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      try {
        const text = await fs.promises.readFile(legacyTasksFile, 'utf-8');
        const parsed = JSON.parse(text);
        const tasks = Array.isArray(parsed) ? parsed : [];
        return createDefaultTaskPayload(tasks);
      } catch (legacyError: unknown) {
        if ((legacyError as NodeJS.ErrnoException).code === 'ENOENT') {
          return createDefaultTaskPayload();
        }
        throw legacyError;
      }
    }
    throw error;
  }
}

async function writeTasks(username: string, data: unknown) {
  const tasksFile = getUserTasksFile(username);
  await fs.promises.mkdir(path.dirname(tasksFile), { recursive: true });
  await fs.promises.writeFile(tasksFile, JSON.stringify(data, null, 2), 'utf-8');
}

async function readRegisteredUsers() {
  try {
    const text = await fs.promises.readFile(authUsersFile, 'utf-8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as RegisteredUser[]) : [];
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeRegisteredUsers(users: RegisteredUser[]) {
  await fs.promises.mkdir(dataDir, { recursive: true });
  await fs.promises.writeFile(authUsersFile, JSON.stringify(users, null, 2), 'utf-8');
}

async function readJsonBody(req: Req) {
  return await new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk?: Buffer) => {
      if (chunk) chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = chunks.length ? Buffer.concat(chunks).toString('utf-8') : '';
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', (error?: Buffer) => reject(error));
  });
}

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
const FOCUS_CHECKIN_SYSTEM_PROMPT = `你是一位每小时做一次工作校准的执行教练。请严格返回 JSON，不要有任何额外文字。
返回结构:
{
  "summary": "一句话提醒",
  "suggested_action": "continue 或 rest 或 pause",
  "reason": "为什么这样建议",
  "reply_prompt": "要求用户做出继续/休息/暂停的选择"
}
要求:
1. 优先帮助用户减少疲劳和切换成本。
2. 如果已经连续高压推进、精力偏低或并行过多，可以明确建议休息。
3. 如果当前节奏稳定，也可以建议继续，但理由要具体。
4. reply_prompt 要简短直接，明确要求用户回应。
5. 所有输出使用中文。`;
const DAY_PLAN_SYSTEM_PROMPT = `你是一位擅长把自然语言整理成当日行动安排的执行教练。请严格返回 JSON，不要有任何额外文字。
返回结构:
{
  "summary": "一句中文总结今天的安排策略",
  "core_focus": "今天最核心的一件事",
  "schedule_markdown": "Markdown 形式的今日安排",
  "tasks": [
    {
      "title": "任务名称",
      "description": "任务说明",
      "estimated_minutes": 45,
      "energy_delta": -1,
      "stress_score": 3,
      "cognitive_load": "low 或 high",
      "collaboration_level": "low 或 high",
      "category_key": "research 或 development 或 learning 或 misc",
      "timeline": "temporary 或 long_term"
    }
  ]
}
要求:
1. tasks 返回 3 到 7 条，按执行顺序排列。
2. core_focus 必须明确，只能有一件主线工作。
3. estimated_minutes 为 10 到 180 的整数。
4. energy_delta 只能是 -2 到 2 的整数。
5. stress_score 只能是 1 到 5 的整数。
6. schedule_markdown 使用中文，包含“主线”“顺手做”“低能时做”三个小标题。
7. 如果用户提到会议、出门、回复消息、健身、休息，也要纳入当天安排。`;
const BEHAVIOR_CHAT_SYSTEM_PROMPT = `你是任务管理页面里的 AI 小猫助手，负责把用户的自然语言状态转成温柔、简洁、可执行的中文回复。请严格返回 JSON，不要有任何额外文字。
返回结构:
{
  "reply": "给用户的一段中文回复",
  "suggested_motion": "heart 或 star 或 blush 或 cry 或 angry 或 money 或 pet 或 gesture 或 greet 或 listen 或 think 或 phone 或 idle"
}
要求:
1. reply 最多 3 句，优先给出当下最值得做的下一步。
2. 如果输入里有恢复行为（如喝茶、散步、午睡），要自然吸收 localInsight。
3. 如果用户明显疲惫或分心，优先帮助他降负荷。
4. 如果当前有主任务，建议尽量落到主任务或正在计时的任务上。
5. 所有输出使用中文。`;

function buildPrompt(task: PlanTask) {
  return `帮我为这个任务制定一个详细执行计划。
任务名称：${task.title}
任务描述：${task.description || '无'}
请按要求返回。`;
}

function buildDayPlanPrompt({ input, energy, existingTasks }: DayPlanRequest) {
  const existingSummary = Array.isArray(existingTasks) && existingTasks.length > 0
    ? existingTasks
        .slice(0, 8)
        .map((task, index) => `${index + 1}. ${task.title || '未命名任务'}｜${task.estimated_minutes || 60} 分钟｜${task.status || 'pending'}`)
        .join('\n')
    : '当前还没有已有任务。';
  return `请把下面这段自然语言整理成今天的执行计划。
用户输入：
${input || ''}

当前精力：${Number.isFinite(Number(energy)) ? Number(energy) : 60}

现有任务参考：
${existingSummary}

请优先让计划简单、可执行、不过载。`;
}

function buildFocusCheckinPrompt({ primaryTask, runningTasks, energyScore, pressureScore, sleepHours, selfRating }: FocusCheckinRequest) {
  const primarySummary = primaryTask
    ? [
        `主任务：${primaryTask.title || '未命名任务'}`,
        `下一步：${primaryTask.next_action || '未提供'}`,
        `认知负荷：${primaryTask.cognitive_load || 'low'}`,
        `协作强度：${primaryTask.collaboration_level || 'low'}`,
        `执行方式：${primaryTask.execution_mode || 'serial'}`,
        `本轮已连续计时：${primaryTask.current_session_minutes || 0} 分钟`,
      ].join('\n')
    : '当前没有明确主任务。';
  const runningSummary = Array.isArray(runningTasks) && runningTasks.length > 0
    ? runningTasks
        .slice(0, 4)
        .map((task, index) => `${index + 1}. ${task.title || '未命名任务'}｜${task.execution_mode || 'serial'}｜${task.current_session_minutes || 0} 分钟`)
        .join('\n')
    : '当前没有正在计时的任务。';
  return `请对这位用户做一次整点工作校准，帮助他判断是继续、休息还是暂停。

主任务信息：
${primarySummary}

当前正在计时的任务：
${runningSummary}

当前状态：
- 精力：${Number.isFinite(Number(energyScore)) ? Number(energyScore) : 60}
- 压力：${Number.isFinite(Number(pressureScore)) ? Number(pressureScore) : 50}
- 睡眠：${Number.isFinite(Number(sleepHours)) ? Number(sleepHours) : 7} 小时
- 自评：${Number.isFinite(Number(selfRating)) ? Number(selfRating) : 3}/5

请给出一句提醒、一条明确建议、简短原因，并要求用户回复。`;
}

function buildBehaviorChatPrompt(payload: {
  message?: string;
  localInsight?: string;
  energyScore?: number;
  pressureScore?: number;
  primaryTask?: {
    title?: string;
    next_action?: string;
    current_session_minutes?: number;
  } | null;
  runningTasks?: Array<{ title?: string; execution_mode?: string; current_session_minutes?: number }>;
  recentMessages?: Array<{ role?: string; text?: string }>;
}) {
  const primaryTask = payload.primaryTask;
  const runningTasks = Array.isArray(payload.runningTasks) ? payload.runningTasks : [];
  const recentMessages = Array.isArray(payload.recentMessages) ? payload.recentMessages : [];
  return `请回复这位用户的最新一条消息，并兼顾精力管理与任务推进。

用户最新输入：
${payload.message || ''}

本地规则给出的参考：
${payload.localInsight || '无'}

当前状态：
- 精力：${Number.isFinite(Number(payload.energyScore)) ? Number(payload.energyScore) : 60}
- 压力：${Number.isFinite(Number(payload.pressureScore)) ? Number(payload.pressureScore) : 50}

主任务：
${primaryTask ? `${primaryTask.title || '未命名任务'}｜${primaryTask.next_action || '未提供下一步'}｜${primaryTask.current_session_minutes || 0} 分钟` : '当前没有明确主任务。'}

正在计时：
${runningTasks.length > 0 ? runningTasks.slice(0, 3).map((task, index) => `${index + 1}. ${task.title || '未命名任务'}｜${task.execution_mode || 'serial'}｜${task.current_session_minutes || 0} 分钟`).join('\n') : '当前没有正在计时的任务。'}

最近对话：
${recentMessages.length > 0 ? recentMessages.slice(-8).map((item) => `${item.role === 'assistant' ? '助手' : '用户'}：${item.text || ''}`).join('\n') : '这是今天的第一轮对话。'}`;
}

function extractJsonText(raw: string) {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] || trimmed;
}

function parsePlanPayload(raw: string) {
  const jsonText = extractJsonText(raw);
  const parsed = JSON.parse(jsonText);
  return {
    plan: typeof parsed.plan === 'string' ? parsed.plan : '',
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
      : []
  };
}

function parseDayPlanPayload(raw: string) {
  const jsonText = extractJsonText(raw);
  const parsed = JSON.parse(jsonText);
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    core_focus: typeof parsed.core_focus === 'string' ? parsed.core_focus.trim() : '',
    schedule_markdown: typeof parsed.schedule_markdown === 'string' ? parsed.schedule_markdown.trim() : '',
    tasks: Array.isArray(parsed.tasks)
      ? parsed.tasks
          .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item) => ({
            title: typeof item.title === 'string' ? item.title.trim() : '',
            description: typeof item.description === 'string' ? item.description.trim() : '',
            estimated_minutes: Math.max(10, Math.min(180, Number(item.estimated_minutes) || 30)),
            energy_delta: Math.max(-2, Math.min(2, Math.round(Number(item.energy_delta) || 0))),
            stress_score: Math.max(1, Math.min(5, Math.round(Number(item.stress_score) || 3))),
            cognitive_load: item.cognitive_load === 'high' ? 'high' : 'low',
            collaboration_level: item.collaboration_level === 'high' ? 'high' : 'low',
            category_key: ['research', 'development', 'learning'].includes(String(item.category_key)) ? item.category_key : 'misc',
            timeline: item.timeline === 'long_term' ? 'long_term' : 'temporary',
          }))
          .filter((item) => item.title)
      : [],
  };
}

function parseFocusCheckinPayload(raw: string) {
  const jsonText = extractJsonText(raw);
  const parsed = JSON.parse(jsonText);
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    suggested_action: parsed.suggested_action === 'rest'
      ? 'rest'
      : parsed.suggested_action === 'pause'
        ? 'pause'
        : 'continue',
    reason: typeof parsed.reason === 'string' ? parsed.reason.trim() : '',
    reply_prompt: typeof parsed.reply_prompt === 'string' ? parsed.reply_prompt.trim() : '',
  };
}

function parseBehaviorChatPayload(raw: string) {
  const jsonText = extractJsonText(raw);
  const parsed = JSON.parse(jsonText);
  const motion = typeof parsed.suggested_motion === 'string' ? parsed.suggested_motion.trim() : '';
  const allowedMotions = new Set(['heart', 'star', 'blush', 'cry', 'angry', 'money', 'pet', 'gesture', 'greet', 'listen', 'think', 'phone', 'idle']);
  return {
    reply: typeof parsed.reply === 'string' ? parsed.reply.trim() : '',
    suggested_motion: allowedMotions.has(motion)
      ? motion
      : 'idle',
  };
}

async function requestPlanByChatCompletions(task: PlanTask, aiConfig: AiConfig) {
  const response = await fetch(`${aiConfig.apiBase}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: aiConfig.model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(task) }
      ]
    })
  });

  if (!response.ok) throw new Error(`chat completions failed: ${response.status}`);

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('chat completions returned empty content');
  return parsePlanPayload(content);
}

async function requestPlanByGemini(task: PlanTask, aiConfig: AiConfig) {
  const response = await fetch(`${aiConfig.apiBase}/v1beta/models/${aiConfig.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'x-goog-api-key': aiConfig.apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildPrompt(task)}` }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) throw new Error(`generateContent failed: ${response.status}`);

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('\n');
  if (typeof content !== 'string' || !content.trim()) throw new Error('generateContent returned empty content');
  return parsePlanPayload(content);
}

async function requestAiPlan(task: PlanTask, aiConfig: AiConfig) {
  if (!aiConfig.apiKey) throw new Error('服务器未配置 AI_API_KEY');
  try {
    return await requestPlanByChatCompletions(task, aiConfig);
  } catch {
    return requestPlanByGemini(task, aiConfig);
  }
}

async function requestDayPlanByChatCompletions(payload: DayPlanRequest, aiConfig: AiConfig) {
  const response = await fetch(`${aiConfig.apiBase}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: aiConfig.model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: DAY_PLAN_SYSTEM_PROMPT },
        { role: 'user', content: buildDayPlanPrompt(payload) }
      ]
    })
  });

  if (!response.ok) throw new Error(`chat completions failed: ${response.status}`);

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('chat completions returned empty content');
  return parseDayPlanPayload(content);
}

async function requestDayPlanByGemini(payload: DayPlanRequest, aiConfig: AiConfig) {
  const response = await fetch(`${aiConfig.apiBase}/v1beta/models/${aiConfig.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'x-goog-api-key': aiConfig.apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${DAY_PLAN_SYSTEM_PROMPT}\n\n${buildDayPlanPrompt(payload)}` }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) throw new Error(`generateContent failed: ${response.status}`);

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('\n');
  if (typeof content !== 'string' || !content.trim()) throw new Error('generateContent returned empty content');
  return parseDayPlanPayload(content);
}

async function requestAiDayPlan(payload: DayPlanRequest, aiConfig: AiConfig) {
  if (!aiConfig.apiKey) throw new Error('服务器未配置 AI_API_KEY');
  try {
    return await requestDayPlanByChatCompletions(payload, aiConfig);
  } catch {
    return requestDayPlanByGemini(payload, aiConfig);
  }
}

async function requestFocusCheckinByChatCompletions(payload: FocusCheckinRequest, aiConfig: AiConfig) {
  const response = await fetch(`${aiConfig.apiBase}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: aiConfig.model,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: FOCUS_CHECKIN_SYSTEM_PROMPT },
        { role: 'user', content: buildFocusCheckinPrompt(payload) }
      ]
    })
  });

  if (!response.ok) throw new Error(`chat completions failed: ${response.status}`);

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('chat completions returned empty content');
  return parseFocusCheckinPayload(content);
}

async function requestFocusCheckinByGemini(payload: FocusCheckinRequest, aiConfig: AiConfig) {
  const response = await fetch(`${aiConfig.apiBase}/v1beta/models/${aiConfig.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'x-goog-api-key': aiConfig.apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${FOCUS_CHECKIN_SYSTEM_PROMPT}\n\n${buildFocusCheckinPrompt(payload)}` }] }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) throw new Error(`generateContent failed: ${response.status}`);

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('\n');
  if (typeof content !== 'string' || !content.trim()) throw new Error('generateContent returned empty content');
  return parseFocusCheckinPayload(content);
}

async function requestAiFocusCheckin(payload: FocusCheckinRequest, aiConfig: AiConfig) {
  if (!aiConfig.apiKey) throw new Error('服务器未配置 AI_API_KEY');
  try {
    return await requestFocusCheckinByChatCompletions(payload, aiConfig);
  } catch {
    return requestFocusCheckinByGemini(payload, aiConfig);
  }
}

async function requestBehaviorChatByChatCompletions(payload: unknown, aiConfig: AiConfig) {
  const response = await fetch(`${aiConfig.apiBase}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: aiConfig.model,
      temperature: 0.45,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: BEHAVIOR_CHAT_SYSTEM_PROMPT },
        { role: 'user', content: buildBehaviorChatPrompt((payload || {}) as Parameters<typeof buildBehaviorChatPrompt>[0]) }
      ]
    })
  });

  if (!response.ok) throw new Error(`chat completions failed: ${response.status}`);

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('chat completions returned empty content');
  return parseBehaviorChatPayload(content);
}

async function requestBehaviorChatByGemini(payload: unknown, aiConfig: AiConfig) {
  const response = await fetch(`${aiConfig.apiBase}/v1beta/models/${aiConfig.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'x-goog-api-key': aiConfig.apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${BEHAVIOR_CHAT_SYSTEM_PROMPT}\n\n${buildBehaviorChatPrompt((payload || {}) as Parameters<typeof buildBehaviorChatPrompt>[0])}` }] }],
      generationConfig: {
        temperature: 0.45,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) throw new Error(`generateContent failed: ${response.status}`);

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('\n');
  if (typeof content !== 'string' || !content.trim()) throw new Error('generateContent returned empty content');
  return parseBehaviorChatPayload(content);
}

async function requestAiBehaviorChat(payload: unknown, aiConfig: AiConfig) {
  if (!aiConfig.apiKey) throw new Error('服务器未配置 AI_API_KEY');
  try {
    return await requestBehaviorChatByChatCompletions(payload, aiConfig);
  } catch {
    return requestBehaviorChatByGemini(payload, aiConfig);
  }
}

function createCalendarSubscriptionToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function ensureCalendarSubscription(username: string) {
  const payload = await readTasks(username);
  if (payload.calendar_subscription_token) return payload;
  const nextPayload = {
    ...payload,
    calendar_subscription_token: createCalendarSubscriptionToken(),
  };
  await writeTasks(username, nextPayload);
  return nextPayload;
}

function buildAbsoluteBaseUrl(req: Req) {
  const proto = getHeader(req, 'x-forwarded-proto')?.split(',')[0].trim() || 'http';
  const host = getHeader(req, 'x-forwarded-host')?.split(',')[0].trim() || getHeader(req, 'host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function buildCalendarSubscriptionUrls(req: Req, token: string) {
  const url = `${buildAbsoluteBaseUrl(req)}/api/calendar/focus.ics?token=${encodeURIComponent(token)}`;
  return {
    token,
    url,
    apple_url: url.replace(/^https?:\/\//i, 'webcal://'),
  };
}

async function findUserByCalendarSubscriptionToken(token: string) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return null;

  const usersRoot = path.join(dataDir, 'users');
  try {
    const dirs = await fs.promises.readdir(usersRoot, { withFileTypes: true });
    for (const entry of dirs) {
      if (!entry.isDirectory()) continue;
      const username = decodeURIComponent(entry.name);
      const payload = await readTasks(username);
      if (payload.calendar_subscription_token === normalizedToken) {
        return { username, payload };
      }
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  return null;
}

function escapeIcsText(value: unknown) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsUtcDate(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function roundToNextHalfHourDate(baseTs: number) {
  const date = new Date(baseTs);
  const minutes = date.getMinutes();
  if (minutes === 0 || minutes === 30) {
    date.setSeconds(0, 0);
    return date;
  }
  if (minutes < 30) {
    date.setMinutes(30, 0, 0);
    return date;
  }
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

function buildCalendarPlanItems(payload: { ai_day_plan?: unknown; tasks?: unknown[] }) {
  const aiDayPlan = payload.ai_day_plan && typeof payload.ai_day_plan === 'object'
    ? payload.ai_day_plan as { tasks?: unknown[]; summary?: string; core_focus?: string }
    : {};
  if (Array.isArray(aiDayPlan.tasks) && aiDayPlan.tasks.length > 0) {
    return aiDayPlan.tasks.slice(0, 8).map((item) => {
      const task = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        uid: `ai-${task.title || ''}`,
        title: typeof task.title === 'string' && task.title.trim() ? task.title : '未命名任务',
        description: typeof task.description === 'string' && task.description.trim()
          ? task.description
          : aiDayPlan.summary || aiDayPlan.core_focus || 'Planday AI 日计划',
        minutes: Math.max(10, Math.min(180, Number(task.estimated_minutes) || 30)),
      };
    });
  }

  return (Array.isArray(payload.tasks) ? payload.tasks : [])
    .filter((item) => item && typeof item === 'object' && (item as Record<string, unknown>).status === 'pending')
    .sort((a, b) => Number((b as Record<string, unknown>).x || 0) - Number((a as Record<string, unknown>).x || 0))
    .slice(0, 8)
    .map((item) => {
      const task = item as Record<string, unknown>;
      return {
        uid: `task-${task.id || ''}`,
        title: typeof task.title === 'string' && task.title.trim() ? task.title : '未命名任务',
        description: typeof task.description === 'string' && task.description.trim() ? task.description : 'Planday 当前待办',
        minutes: Math.max(10, Math.min(180, Number(task.estimated_minutes) || 30)),
      };
    });
}

function buildCalendarIcsFromPayload(payload: { ai_day_plan?: unknown; tasks?: unknown[] }, username: string) {
  const dtStamp = formatIcsUtcDate(new Date());
  let cursor = roundToNextHalfHourDate(Date.now());
  const items = buildCalendarPlanItems(payload);
  const aiDayPlan = payload.ai_day_plan && typeof payload.ai_day_plan === 'object'
    ? payload.ai_day_plan as { core_focus?: string }
    : {};
  const coreFocus = aiDayPlan.core_focus || items[0]?.title || '今日主线';

  const events = items.map((item, index) => {
    const start = new Date(cursor);
    const end = new Date(start.getTime() + item.minutes * 60000);
    cursor = end;
    return [
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(`${username}-${item.uid}-${index}@planday`)}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${formatIcsUtcDate(start)}`,
      `DTEND:${formatIcsUtcDate(end)}`,
      `SUMMARY:${escapeIcsText(item.title)}`,
      `DESCRIPTION:${escapeIcsText(`${item.description}\n\n当前主线：${coreFocus}`)}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planday//Focus Calendar//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Planday Focus',
    'X-WR-CALDESC:今日主线与任务时间块',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function createSessionToken(username: string, authConfig: AuthConfig) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    username,
    expiresAt: Date.now() + authConfig.sessionTtlMs,
  });
  return token;
}

function parseBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) return '';
  const [scheme, token] = authorizationHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return '';
  return token.trim();
}

function getSession(token: string) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function revokeSessionsForUsername(username: string, exceptToken = '') {
  const normalized = normalizeUsername(username);
  for (const [token, session] of sessions.entries()) {
    if (token === exceptToken) continue;
    if (normalizeUsername(session.username) === normalized) {
      sessions.delete(token);
    }
  }
}

function requireAuth(req: Req, res: Res, authConfig: AuthConfig) {
  const rawHeader = req.headers?.authorization;
  const authHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const token = parseBearerToken(authHeader);
  const session = getSession(token);
  if (!session) {
    sendJson(res, 401, { error: '未登录或会话已过期' });
    return null;
  }
  return {
    ...session,
    token,
    isAdmin: isAdminUsername(session.username, authConfig),
  };
}

async function findUserForLogin(username: string, password: string, authConfig: AuthConfig) {
  const normalized = normalizeUsername(username);
  const registeredUsers = await readRegisteredUsers();
  const registeredUser = registeredUsers.find((u) => u.username_normalized === normalized);
  if (registeredUser) {
    const { passwordHash } = hashPassword(password, registeredUser.salt);
    if (passwordHash === registeredUser.password_hash) {
      return { username: registeredUser.username };
    }
    return null;
  }

  const seedUser = authConfig.seedUsers.find((u) => normalizeUsername(u.username) === normalized);
  if (seedUser && seedUser.password === password) {
    return { username: seedUser.username };
  }
  return null;
}

async function registerUser(username: string, password: string, authConfig: AuthConfig) {
  if (!authConfig.allowRegistration) throw new Error('REGISTRATION_DISABLED');
  if (!isValidUsername(username)) throw new Error('INVALID_USERNAME');
  if (!isValidPassword(password)) throw new Error('INVALID_PASSWORD');

  const normalized = normalizeUsername(username);
  const seedExists = authConfig.seedUsers.some((u) => normalizeUsername(u.username) === normalized);
  if (seedExists) throw new Error('USER_EXISTS');

  const users = await readRegisteredUsers();
  if (users.some((u) => u.username_normalized === normalized)) throw new Error('USER_EXISTS');

  const { salt, passwordHash } = hashPassword(password);
  const newUser: RegisteredUser = {
    username: username.trim(),
    username_normalized: normalized,
    salt,
    password_hash: passwordHash,
    created_at: Date.now(),
  };
  users.push(newUser);
  await writeRegisteredUsers(users);
  return { username: newUser.username };
}

async function resetPasswordByAdmin(targetUsername: string, newPassword: string, authConfig: AuthConfig) {
  const normalized = normalizeUsername(targetUsername);
  if (!normalized) throw new Error('USER_NOT_FOUND');
  if (!isValidPassword(newPassword)) throw new Error('INVALID_PASSWORD');

  const users = await readRegisteredUsers();
  const existingIndex = users.findIndex((user) => user.username_normalized === normalized);
  const now = Date.now();
  const { salt, passwordHash } = hashPassword(newPassword);

  if (existingIndex >= 0) {
    const existingUser = users[existingIndex];
    users[existingIndex] = {
      ...existingUser,
      salt,
      password_hash: passwordHash,
      updated_at: now,
      password_reset_at: now,
    };
    await writeRegisteredUsers(users);
    return { username: users[existingIndex].username };
  }

  const seedUser = authConfig.seedUsers.find((user) => normalizeUsername(user.username) === normalized);
  if (!seedUser) throw new Error('USER_NOT_FOUND');

  users.push({
    username: seedUser.username,
    username_normalized: normalized,
    salt,
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
    password_reset_at: now,
    auth_source: 'seed_override',
  });
  await writeRegisteredUsers(users);
  return { username: seedUser.username };
}

function createApiMiddleware(aiConfig: AiConfig, authConfig: AuthConfig) {
  return (req: Req, res: Res, next: () => void) => {
    const requestPath = getRequestPath(req);

    if (requestPath === '/api/calendar/focus.ics') {
      if (req.method !== 'GET') {
        sendText(res, 405, 'method not allowed');
        return;
      }

      const token = getRequestUrl(req).searchParams.get('token')?.trim() || '';
      if (!token) {
        sendText(res, 400, 'missing token');
        return;
      }

      findUserByCalendarSubscriptionToken(token)
        .then((matched) => {
          if (!matched) {
            sendText(res, 404, 'calendar subscription not found');
            return;
          }
          const ics = buildCalendarIcsFromPayload(matched.payload, matched.username);
          res.setHeader('Content-Disposition', 'inline; filename="planday-focus.ics"');
          res.setHeader('Cache-Control', 'no-store');
          sendText(res, 200, ics, 'text/calendar; charset=utf-8');
        })
        .catch((error) => sendText(res, 500, error instanceof Error ? error.message : 'calendar feed failed'));
      return;
    }

    if (req.url?.startsWith('/api/auth/register')) {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      readJsonBody(req)
        .then(async (payload) => {
          const body = (payload || {}) as { username?: string; password?: string };
          const username = typeof body.username === 'string' ? body.username.trim() : '';
          const password = typeof body.password === 'string' ? body.password : '';
          try {
            const result = await registerUser(username, password, authConfig);
            const token = createSessionToken(result.username, authConfig);
            sendJson(res, 201, {
              token,
              username: result.username,
              isAdmin: isAdminUsername(result.username, authConfig),
              expiresAt: Date.now() + authConfig.sessionTtlMs,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : '注册失败';
            if (message === 'REGISTRATION_DISABLED') {
              sendJson(res, 403, { error: '当前环境不允许注册' });
              return;
            }
            if (message === 'INVALID_USERNAME') {
              sendJson(res, 400, { error: '用户名需为 3-32 位，仅支持字母、数字、._-' });
              return;
            }
            if (message === 'INVALID_PASSWORD') {
              sendJson(res, 400, { error: '密码长度需在 8-128 位' });
              return;
            }
            if (message === 'USER_EXISTS') {
              sendJson(res, 409, { error: '用户名已存在' });
              return;
            }
            sendJson(res, 500, { error: '注册失败，请稍后重试' });
          }
        })
        .catch((error) => sendJson(res, 500, { error: `register failed: ${(error as Error).message}` }));
      return;
    }

    if (req.url?.startsWith('/api/auth/login')) {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      readJsonBody(req)
        .then(async (payload) => {
          const body = (payload || {}) as { username?: string; password?: string };
          const username = typeof body.username === 'string' ? body.username.trim() : '';
          const password = typeof body.password === 'string' ? body.password : '';
          if (!username || !password) {
            sendJson(res, 400, { error: '请输入账号和密码' });
            return;
          }

          const matchedUser = await findUserForLogin(username, password, authConfig);
          if (!matchedUser) {
            sendJson(res, 401, { error: '账号或密码错误' });
            return;
          }

          const token = createSessionToken(matchedUser.username, authConfig);
          sendJson(res, 200, {
            token,
            username: matchedUser.username,
            isAdmin: isAdminUsername(matchedUser.username, authConfig),
            expiresAt: Date.now() + authConfig.sessionTtlMs,
          });
        })
        .catch((error) => sendJson(res, 500, { error: `login failed: ${(error as Error).message}` }));
      return;
    }

    if (req.url?.startsWith('/api/auth/session')) {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }
      const session = requireAuth(req, res, authConfig);
      if (!session) return;
      sendJson(res, 200, {
        ok: true,
        username: session.username,
        isAdmin: session.isAdmin,
      });
      return;
    }

    if (req.url?.startsWith('/api/admin/reset-password')) {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      const session = requireAuth(req, res, authConfig);
      if (!session) return;
      if (!session.isAdmin) {
        sendJson(res, 403, { error: '仅管理员可执行此操作' });
        return;
      }

      readJsonBody(req)
        .then(async (payload) => {
          const body = (payload || {}) as { username?: string; newPassword?: string };
          const username = typeof body.username === 'string' ? body.username.trim() : '';
          const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
          if (!username || !newPassword) {
            sendJson(res, 400, { error: '请输入目标账号和新密码' });
            return;
          }

          const result = await resetPasswordByAdmin(username, newPassword, authConfig);
          const keepToken = normalizeUsername(result.username) === normalizeUsername(session.username)
            ? session.token
            : '';
          revokeSessionsForUsername(result.username, keepToken);
          sendJson(res, 200, {
            ok: true,
            username: result.username,
            message: `账号 ${result.username} 的密码已重置`,
          });
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : '重置失败';
          if (message === 'INVALID_PASSWORD') {
            sendJson(res, 400, { error: '密码长度需在 8-128 位' });
            return;
          }
          if (message === 'USER_NOT_FOUND') {
            sendJson(res, 404, { error: '目标账号不存在' });
            return;
          }
          sendJson(res, 500, { error: '重置失败，请稍后重试' });
        });
      return;
    }

    if (req.url?.startsWith('/api/tasks')) {
      const session = requireAuth(req, res, authConfig);
      if (!session) return;

      if (req.method === 'GET') {
        readTasks(session.username)
          .then((tasks) => sendJson(res, 200, tasks))
          .catch((error) => sendJson(res, 500, { error: `read failed: ${(error as Error).message}` }));
        return;
      }

      if (req.method === 'PUT') {
        readJsonBody(req)
          .then(async (payload) => {
            await writeTasks(session.username, payload);
            sendJson(res, 200, { ok: true });
          })
          .catch((error) => sendJson(res, 500, { error: `write failed: ${(error as Error).message}` }));
        return;
      }

      sendJson(res, 405, { error: 'method not allowed' });
      return;
    }

    if (req.url?.startsWith('/api/ai/plan')) {
      const session = requireAuth(req, res, authConfig);
      if (!session) return;

      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      readJsonBody(req)
        .then(async (payload) => {
          const body = (payload || {}) as { title?: string; description?: string };
          const title = typeof body.title === 'string' ? body.title.trim() : '';
          const description = typeof body.description === 'string' ? body.description : '';
          if (!title) {
            sendJson(res, 400, { error: '任务名称不能为空' });
            return;
          }
          const result = await requestAiPlan({ title, description }, aiConfig);
          sendJson(res, 200, result);
        })
        .catch((error) => {
          const message = (error as Error).message || 'AI 生成失败';
          const status = message.includes('AI_API_KEY') ? 503 : 502;
          sendJson(res, status, { error: message });
        });
      return;
    }

    if (requestPath === '/api/ai/day-plan') {
      const session = requireAuth(req, res, authConfig);
      if (!session) return;

      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      readJsonBody(req)
        .then(async (payload) => {
          const body = (payload || {}) as DayPlanRequest;
          const input = typeof body.input === 'string' ? body.input.trim() : '';
          const energy = Number(body.energy);
          const existingTasks = Array.isArray(body.existingTasks) ? body.existingTasks : [];
          if (!input) {
            sendJson(res, 400, { error: '自然语言输入不能为空' });
            return;
          }

          const result = await requestAiDayPlan({
            input,
            energy: Number.isFinite(energy) ? energy : 60,
            existingTasks,
          }, aiConfig);
          sendJson(res, 200, result);
        })
        .catch((error) => {
          const message = (error as Error).message || 'AI 生成失败';
          const status = message.includes('AI_API_KEY') ? 503 : 502;
          sendJson(res, status, { error: message });
        });
      return;
    }

    if (requestPath === '/api/ai/focus-checkin') {
      const session = requireAuth(req, res, authConfig);
      if (!session) return;

      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      readJsonBody(req)
        .then(async (payload) => {
          const body = (payload || {}) as FocusCheckinRequest;
          const primaryTask = body.primaryTask && typeof body.primaryTask === 'object' ? body.primaryTask : null;
          const runningTasks = Array.isArray(body.runningTasks) ? body.runningTasks : [];
          const energyScore = Number(body.energyScore);
          const pressureScore = Number(body.pressureScore);
          const sleepHours = Number(body.sleepHours);
          const selfRating = Number(body.selfRating);
          if (!primaryTask && runningTasks.length === 0) {
            sendJson(res, 400, { error: '没有可校准的执行任务' });
            return;
          }

          const result = await requestAiFocusCheckin({
            primaryTask,
            runningTasks,
            energyScore: Number.isFinite(energyScore) ? energyScore : 60,
            pressureScore: Number.isFinite(pressureScore) ? pressureScore : 50,
            sleepHours: Number.isFinite(sleepHours) ? sleepHours : 7,
            selfRating: Number.isFinite(selfRating) ? selfRating : 3,
          }, aiConfig);
          sendJson(res, 200, result);
        })
        .catch((error) => {
          const message = (error as Error).message || 'AI 生成失败';
          const status = message.includes('AI_API_KEY') ? 503 : 502;
          sendJson(res, status, { error: message });
        });
      return;
    }

    if (req.url?.startsWith('/api/ai/behavior-chat')) {
      const session = requireAuth(req, res, authConfig);
      if (!session) return;

      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      readJsonBody(req)
        .then(async (payload) => {
          const body = (payload || {}) as { message?: string };
          const message = typeof body.message === 'string' ? body.message.trim() : '';
          if (!message) {
            sendJson(res, 400, { error: '消息不能为空' });
            return;
          }
          const result = await requestAiBehaviorChat(payload, aiConfig);
          sendJson(res, 200, result);
        })
        .catch((error) => {
          const message = (error as Error).message || 'AI 对话失败';
          const status = message.includes('AI_API_KEY') ? 503 : 502;
          sendJson(res, status, { error: message });
        });
      return;
    }

    if (requestPath === '/api/calendar/subscription-token/reset') {
      const session = requireAuth(req, res, authConfig);
      if (!session) return;

      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      readTasks(session.username)
        .then(async (payload) => {
          const nextPayload = {
            ...payload,
            calendar_subscription_token: createCalendarSubscriptionToken(),
          };
          await writeTasks(session.username, nextPayload);
          sendJson(res, 200, buildCalendarSubscriptionUrls(req, nextPayload.calendar_subscription_token));
        })
        .catch((error) => sendJson(res, 500, { error: error instanceof Error ? error.message : '订阅链接重置失败' }));
      return;
    }

    if (requestPath === '/api/calendar/subscription-token') {
      const session = requireAuth(req, res, authConfig);
      if (!session) return;

      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      ensureCalendarSubscription(session.username)
        .then((payload) => sendJson(res, 200, buildCalendarSubscriptionUrls(req, payload.calendar_subscription_token)))
        .catch((error) => sendJson(res, 500, { error: error instanceof Error ? error.message : '订阅链接获取失败' }));
      return;
    }

    next();
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const seedUsers = (() => {
    if (env.AUTH_USERS) {
      try {
        const parsed = JSON.parse(env.AUTH_USERS);
        if (Array.isArray(parsed)) {
          const users = parsed
            .filter((u) => u && typeof u.username === 'string' && typeof u.password === 'string')
            .map((u) => ({ username: u.username.trim(), password: u.password }))
            .filter((u) => u.username.length > 0 && u.password.length > 0);
          if (users.length > 0) return users;
        }
      } catch {
        // ignore and fallback
      }
    }
    return [{
      username: env.AUTH_USERNAME || process.env.AUTH_USERNAME || 'admin',
      password: env.AUTH_PASSWORD || process.env.AUTH_PASSWORD || 'admin123456',
    }];
  })();

  const aiConfig: AiConfig = {
    apiKey: env.AI_API_KEY || env.VITE_AI_API_KEY || process.env.AI_API_KEY || '',
    apiBase: (env.AI_BASE_URL || env.VITE_AI_BASE_URL || process.env.AI_BASE_URL || 'https://api.aipaibox.com').replace(/\/$/, ''),
    model: env.AI_MODEL || env.VITE_AI_MODEL || process.env.AI_MODEL || 'gemini-3.1-pro-preview',
  };
  const authConfig: AuthConfig = {
    seedUsers,
    adminUsers: parseAdminUsers(env.AUTH_ADMIN_USERS || process.env.AUTH_ADMIN_USERS, seedUsers),
    allowRegistration: (env.AUTH_ALLOW_REGISTRATION || process.env.AUTH_ALLOW_REGISTRATION || 'true').toLowerCase() !== 'false',
    sessionTtlMs: Number(env.SESSION_TTL_MS || process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24),
  };

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-api',
        configureServer(server) {
          server.middlewares.use(createApiMiddleware(aiConfig, authConfig));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createApiMiddleware(aiConfig, authConfig));
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify-file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
