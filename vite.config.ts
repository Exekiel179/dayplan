import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const dataDir = path.resolve(__dirname, '.data');
const legacyTasksFile = path.join(dataDir, 'tasks.json');
const legacyTasksBackupFile = path.join(dataDir, 'tasks.legacy.backup.json');
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
  allowRegistration: boolean;
  sessionTtlMs: number;
};

type PlanTask = {
  title: string;
  description: string;
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
};

const sessions = new Map<string, SessionRecord>();

function sendJson(res: Res, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
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

function getUserTasksFile(username: string) {
  const safeUser = encodeURIComponent(normalizeUsername(username));
  return path.join(dataDir, 'users', safeUser, 'tasks.json');
}

function hasRecordEntries(value: unknown) {
  return Boolean(value && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0);
}

function createDefaultWellbeing() {
  return {
    daily_checkins: {},
    daily_rest_sessions: {},
    daily_behavior_events: {},
    daily_chat_messages: {},
  };
}

function normalizeAbilityModule(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return {
      active_module_id: 'special:mokugyo',
      special_totals: {},
      tracked_ms_baseline: 0,
      updated_at: Date.now(),
    };
  }

  const source = payload as Record<string, unknown>;
  return {
    active_module_id: typeof source.active_module_id === 'string' && source.active_module_id.trim()
      ? source.active_module_id.trim()
      : 'special:mokugyo',
    special_totals: source.special_totals && typeof source.special_totals === 'object'
      ? Object.fromEntries(
          Object.entries(source.special_totals)
            .filter(([key, value]) => typeof key === 'string' && Number.isFinite(Number(value)))
            .map(([key, value]) => [key, Math.max(0, Number(value))])
        )
      : {},
    tracked_ms_baseline: Number.isFinite(Number(source.tracked_ms_baseline))
      ? Math.max(0, Number(source.tracked_ms_baseline))
      : 0,
    updated_at: Number.isFinite(Number(source.updated_at)) ? Number(source.updated_at) : Date.now(),
  };
}

function normalizeRecoveredEnergy(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function normalizeBehaviorDurationMinutes(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 60;
  return Math.max(10, Math.min(12 * 60, Math.round(numeric)));
}

function normalizeBurnRateMultiplier(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(0.55, Math.min(1.2, Number(numeric.toFixed(2))));
}

function normalizeWellbeingChatMessage(value: unknown) {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  if (raw.role !== 'user' && raw.role !== 'assistant') {
    return null;
  }

  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) return null;

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : crypto.randomUUID(),
    role: raw.role,
    text,
    created_at: Number.isFinite(Number(raw.created_at)) ? Number(raw.created_at) : Date.now(),
    behavior_event_id: typeof raw.behavior_event_id === 'string' && raw.behavior_event_id.trim()
      ? raw.behavior_event_id
      : null,
  };
}

function normalizeExternalBehaviorEvent(value: unknown) {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';
  const type = typeof raw.type === 'string' && raw.type.trim() ? raw.type.trim() : 'custom';
  const startedAt = Number(raw.started_at);

  if (!label || !message || !Number.isFinite(startedAt)) {
    return null;
  }

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : crypto.randomUUID(),
    type,
    label,
    message,
    instant_energy: Math.max(-10, Math.min(20, Math.round(Number(raw.instant_energy) || 0))),
    energy_boost_per_hour: Math.max(-10, Math.min(12, Number(raw.energy_boost_per_hour) || 0)),
    burn_rate_multiplier: normalizeBurnRateMultiplier(raw.burn_rate_multiplier),
    duration_minutes: normalizeBehaviorDurationMinutes(raw.duration_minutes),
    started_at: startedAt,
    updated_at: Number.isFinite(Number(raw.updated_at)) ? Number(raw.updated_at) : startedAt,
  };
}

function normalizeWellbeing(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return createDefaultWellbeing();
  }

  const raw = payload as Record<string, any>;
  const dailyCheckins = raw.daily_checkins && typeof raw.daily_checkins === 'object'
    ? Object.fromEntries(
        Object.entries(raw.daily_checkins)
          .filter(([key, value]) =>
            typeof key === 'string'
            && value
            && typeof value === 'object'
            && Number.isFinite(Number((value as Record<string, unknown>).initial_energy))
          )
          .map(([key, value]) => [
            key,
            {
              initial_energy: Math.max(0, Math.min(100, Math.round(Number((value as Record<string, unknown>).initial_energy)))),
              updated_at: Number.isFinite(Number((value as Record<string, unknown>).updated_at))
                ? Number((value as Record<string, unknown>).updated_at)
                : Date.now(),
            },
          ])
      )
    : {};

  const dailyRestSessions = raw.daily_rest_sessions && typeof raw.daily_rest_sessions === 'object'
    ? Object.fromEntries(
        Object.entries(raw.daily_rest_sessions)
          .filter(([key, value]) => typeof key === 'string' && value && typeof value === 'object')
          .map(([key, value]) => [
            key,
            {
              is_resting: Boolean((value as Record<string, unknown>).is_resting),
              started_at: Number.isFinite(Number((value as Record<string, unknown>).started_at))
                ? Number((value as Record<string, unknown>).started_at)
                : null,
              recovered_energy: normalizeRecoveredEnergy((value as Record<string, unknown>).recovered_energy),
              updated_at: Number.isFinite(Number((value as Record<string, unknown>).updated_at))
                ? Number((value as Record<string, unknown>).updated_at)
                : Date.now(),
            },
          ])
      )
    : {};

  const dailyBehaviorEvents = raw.daily_behavior_events && typeof raw.daily_behavior_events === 'object'
    ? Object.entries(raw.daily_behavior_events).reduce<Record<string, ReturnType<typeof normalizeExternalBehaviorEvent>[]>>((acc, [dayKey, events]) => {
        if (!Array.isArray(events)) return acc;
        const normalized = events
          .map((event) => normalizeExternalBehaviorEvent(event))
          .filter((event): event is NonNullable<ReturnType<typeof normalizeExternalBehaviorEvent>> => Boolean(event));

        if (normalized.length > 0) {
          acc[dayKey] = normalized;
        }

        return acc;
      }, {})
    : {};

  const dailyChatMessages = raw.daily_chat_messages && typeof raw.daily_chat_messages === 'object'
    ? Object.entries(raw.daily_chat_messages).reduce<Record<string, ReturnType<typeof normalizeWellbeingChatMessage>[]>>((acc, [dayKey, messages]) => {
        if (!Array.isArray(messages)) return acc;
        const normalized = messages
          .map((message) => normalizeWellbeingChatMessage(message))
          .filter((message): message is NonNullable<ReturnType<typeof normalizeWellbeingChatMessage>> => Boolean(message))
          .slice(-24);

        if (normalized.length > 0) {
          acc[dayKey] = normalized;
        }

        return acc;
      }, {})
    : {};

  return {
    daily_checkins: dailyCheckins,
    daily_rest_sessions: dailyRestSessions,
    daily_behavior_events: dailyBehaviorEvents,
    daily_chat_messages: dailyChatMessages,
  };
}

function normalizeTaskPayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return {
      tasks: payload,
      ability_dimensions: [],
      wellbeing: createDefaultWellbeing(),
      ability_module: normalizeAbilityModule(null),
    };
  }

  if (payload && typeof payload === 'object') {
    const source = payload as Record<string, any>;
    return {
      tasks: Array.isArray(source.tasks) ? source.tasks : [],
      ability_dimensions: Array.isArray(source.ability_dimensions)
        ? source.ability_dimensions
          .filter((item: unknown): item is string => typeof item === 'string')
          .map((item: string) => item.trim())
          .filter(Boolean)
        : [],
      wellbeing: normalizeWellbeing(source.wellbeing),
      ability_module: normalizeAbilityModule(source.ability_module),
    };
  }

  return {
    tasks: [],
    ability_dimensions: [],
    wellbeing: createDefaultWellbeing(),
    ability_module: normalizeAbilityModule(null),
  };
}

function isSeedUsername(username: string, authConfig: AuthConfig) {
  const normalized = normalizeUsername(username);
  return authConfig.seedUsers.some((user) => normalizeUsername(user.username) === normalized);
}

async function readLegacyTaskPayload() {
  try {
    const text = await fs.promises.readFile(legacyTasksFile, 'utf-8');
    return normalizeTaskPayload(JSON.parse(text));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function mergeLegacyTaskPayload(currentPayload: ReturnType<typeof normalizeTaskPayload>, legacyPayload: ReturnType<typeof normalizeTaskPayload>) {
  return {
    tasks: legacyPayload.tasks,
    ability_dimensions: [...new Set([
      ...legacyPayload.ability_dimensions,
      ...currentPayload.ability_dimensions,
    ])],
    wellbeing: {
      daily_checkins: {
        ...legacyPayload.wellbeing.daily_checkins,
        ...currentPayload.wellbeing.daily_checkins,
      },
      daily_rest_sessions: {
        ...legacyPayload.wellbeing.daily_rest_sessions,
        ...currentPayload.wellbeing.daily_rest_sessions,
      },
    },
    ability_module: hasRecordEntries(currentPayload.ability_module.special_totals)
      || currentPayload.ability_module.tracked_ms_baseline > 0
      || currentPayload.ability_module.active_module_id !== 'special:mokugyo'
      ? currentPayload.ability_module
      : legacyPayload.ability_module,
  };
}

async function archiveLegacyTasksFile() {
  try {
    await fs.promises.access(legacyTasksFile);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  try {
    await fs.promises.access(legacyTasksBackupFile);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    await fs.promises.copyFile(legacyTasksFile, legacyTasksBackupFile);
  }

  await fs.promises.unlink(legacyTasksFile).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  });
}

async function writeTasks(username: string, payload: unknown) {
  const tasksFile = getUserTasksFile(username);
  await fs.promises.mkdir(path.dirname(tasksFile), { recursive: true });
  await fs.promises.writeFile(tasksFile, JSON.stringify(normalizeTaskPayload(payload), null, 2), 'utf-8');
}

async function maybeAdoptLegacyTasks(
  username: string,
  currentPayload: ReturnType<typeof normalizeTaskPayload>,
  authConfig: AuthConfig
) {
  if (!isSeedUsername(username, authConfig) || currentPayload.tasks.length > 0) {
    return currentPayload;
  }

  const legacyPayload = await readLegacyTaskPayload();
  if (!legacyPayload || legacyPayload.tasks.length === 0) {
    return currentPayload;
  }

  const migratedPayload = mergeLegacyTaskPayload(currentPayload, legacyPayload);
  await writeTasks(username, migratedPayload);
  await archiveLegacyTasksFile();
  return migratedPayload;
}

async function readTasks(username: string, authConfig: AuthConfig) {
  const tasksFile = getUserTasksFile(username);
  let currentPayload = normalizeTaskPayload([]);

  try {
    const text = await fs.promises.readFile(tasksFile, 'utf-8');
    currentPayload = normalizeTaskPayload(JSON.parse(text));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return maybeAdoptLegacyTasks(username, currentPayload, authConfig);
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

function buildPrompt(task: PlanTask) {
  return `帮我为这个任务制定一个详细执行计划。
任务名称：${task.title}
任务描述：${task.description || '无'}
请按要求返回。`;
}

function parsePlanPayload(raw: string) {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch?.[0] || trimmed;
  const parsed = JSON.parse(jsonText);
  return {
    plan: typeof parsed.plan === 'string' ? parsed.plan : '',
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
      : []
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

function requireAuth(req: Req, res: Res) {
  const rawHeader = req.headers?.authorization;
  const authHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const token = parseBearerToken(authHeader);
  const session = getSession(token);
  if (!session) {
    sendJson(res, 401, { error: '未登录或会话已过期' });
    return null;
  }
  return session;
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

function createApiMiddleware(aiConfig: AiConfig, authConfig: AuthConfig) {
  return (req: Req, res: Res, next: () => void) => {
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
      const session = requireAuth(req, res);
      if (!session) return;
      sendJson(res, 200, {
        ok: true,
        username: session.username,
      });
      return;
    }

    if (req.url?.startsWith('/api/tasks')) {
      const session = requireAuth(req, res);
      if (!session) return;

      if (req.method === 'GET') {
        readTasks(session.username, authConfig)
          .then((tasks) => sendJson(res, 200, tasks))
          .catch((error) => sendJson(res, 500, { error: `read failed: ${(error as Error).message}` }));
        return;
      }

      if (req.method === 'PUT') {
        readJsonBody(req)
          .then(async (payload) => {
            if (!Array.isArray(payload) && !(payload && typeof payload === 'object')) {
              sendJson(res, 400, { error: 'payload must be an array or object' });
              return;
            }
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
      const session = requireAuth(req, res);
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
