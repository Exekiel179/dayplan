import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

const dataDir = path.resolve(__dirname, '.data');
const legacyTasksFile = path.join(dataDir, 'tasks.json');
const authUsersFile = path.join(dataDir, 'auth-users.json');
const distDir = path.resolve(__dirname, 'dist');

const AI_MODEL = process.env.AI_MODEL || process.env.VITE_AI_MODEL || 'gemini-3.1-pro-preview';
const AI_API_BASE = (process.env.AI_BASE_URL || process.env.VITE_AI_BASE_URL || 'https://api.aipaibox.com').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || process.env.VITE_AI_API_KEY || '';
const AUTH_ALLOW_REGISTRATION = (process.env.AUTH_ALLOW_REGISTRATION || 'true').toLowerCase() !== 'false';
const SEED_USERS = parseSeedUsersFromEnv();
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24);
const sessions = new Map();

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

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9._-]{3,32}$/.test(username);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto
    .createHash('sha256')
    .update(`${salt}:${password}`, 'utf-8')
    .digest('hex');
  return { salt, passwordHash };
}

function parseSeedUsersFromEnv() {
  const raw = process.env.AUTH_USERS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const users = parsed
          .filter((u) => u && typeof u.username === 'string' && typeof u.password === 'string')
          .map((u) => ({ username: u.username.trim(), password: u.password }))
          .filter((u) => u.username.length > 0 && u.password.length > 0);
        if (users.length > 0) {
          return users;
        }
      }
    } catch {
      console.warn('Invalid AUTH_USERS JSON; fallback to AUTH_USERNAME/AUTH_PASSWORD');
    }
  }

  const fallbackUsername = process.env.AUTH_USERNAME || 'admin';
  const fallbackPassword = process.env.AUTH_PASSWORD || 'admin123456';
  return [{ username: fallbackUsername, password: fallbackPassword }];
}

async function readRegisteredUsers() {
  try {
    const text = await fs.promises.readFile(authUsersFile, 'utf-8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeRegisteredUsers(users) {
  await fs.promises.mkdir(dataDir, { recursive: true });
  await fs.promises.writeFile(authUsersFile, JSON.stringify(users, null, 2), 'utf-8');
}

async function findUserForLogin(username, password) {
  const normalized = normalizeUsername(username);
  const registeredUsers = await readRegisteredUsers();
  const registeredUser = registeredUsers.find((u) => u.username_normalized === normalized);
  if (registeredUser) {
    const { passwordHash } = hashPassword(password, registeredUser.salt);
    if (passwordHash === registeredUser.password_hash) {
      return {
        username: registeredUser.username,
        source: 'registered',
      };
    }
    return null;
  }

  const seedUser = SEED_USERS.find((u) => normalizeUsername(u.username) === normalized);
  if (seedUser && seedUser.password === password) {
    return {
      username: seedUser.username,
      source: 'seed',
    };
  }

  return null;
}

async function registerUser(username, password) {
  if (!AUTH_ALLOW_REGISTRATION) {
    throw new Error('REGISTRATION_DISABLED');
  }

  const normalized = normalizeUsername(username);
  if (!isValidUsername(username)) {
    throw new Error('INVALID_USERNAME');
  }
  if (!isValidPassword(password)) {
    throw new Error('INVALID_PASSWORD');
  }

  const seedExists = SEED_USERS.some((u) => normalizeUsername(u.username) === normalized);
  if (seedExists) {
    throw new Error('USER_EXISTS');
  }

  const users = await readRegisteredUsers();
  const exists = users.some((u) => u.username_normalized === normalized);
  if (exists) {
    throw new Error('USER_EXISTS');
  }

  const { salt, passwordHash } = hashPassword(password);
  const newUser = {
    username: username.trim(),
    username_normalized: normalized,
    salt,
    password_hash: passwordHash,
    created_at: Date.now(),
  };
  users.push(newUser);
  await writeRegisteredUsers(users);
  return newUser.username;
}

function buildPrompt(task) {
  return `帮我为这个任务制定一个详细执行计划。
任务名称：${task.title}
任务描述：${task.description || '无'}
请按要求返回。`;
}

function parsePlanPayload(raw) {
  const trimmed = String(raw || '').trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch?.[0] || trimmed;
  const parsed = JSON.parse(jsonText);
  return {
    plan: typeof parsed.plan === 'string' ? parsed.plan : '',
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.filter((s) => typeof s === 'string' && s.trim().length > 0)
      : [],
  };
}

async function requestPlanByChatCompletions(task) {
  const response = await fetch(`${AI_API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(task) },
      ],
    }),
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

async function requestPlanByGemini(task) {
  const response = await fetch(`${AI_API_BASE}/v1beta/models/${AI_MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
      'x-goog-api-key': AI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildPrompt(task)}` }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`generateContent failed: ${response.status}`);
  }
  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('\n');
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('generateContent returned empty content');
  }
  return parsePlanPayload(content);
}

async function requestAIPlan(task) {
  if (!AI_API_KEY) {
    throw new Error('服务器未配置 AI_API_KEY');
  }
  try {
    return await requestPlanByChatCompletions(task);
  } catch {
    return requestPlanByGemini(task);
  }
}

function getUserTasksFile(username) {
  const safeUser = encodeURIComponent(normalizeUsername(username));
  return path.join(dataDir, 'users', safeUser, 'tasks.json');
}

function normalizeAbilityModule(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      active_module_id: 'special:mokugyo',
      special_totals: {},
      tracked_ms_baseline: 0,
      updated_at: Date.now(),
    };
  }

  return {
    active_module_id: typeof payload.active_module_id === 'string' && payload.active_module_id.trim()
      ? payload.active_module_id.trim()
      : 'special:mokugyo',
    special_totals: payload.special_totals && typeof payload.special_totals === 'object'
      ? Object.fromEntries(
          Object.entries(payload.special_totals)
            .filter(([key, value]) => typeof key === 'string' && Number.isFinite(Number(value)))
            .map(([key, value]) => [key, Math.max(0, Number(value))])
        )
      : {},
    tracked_ms_baseline: Number.isFinite(Number(payload.tracked_ms_baseline))
      ? Math.max(0, Number(payload.tracked_ms_baseline))
      : 0,
    updated_at: Number.isFinite(Number(payload.updated_at)) ? Number(payload.updated_at) : Date.now(),
  };
}

function normalizeTaskPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      tasks: payload,
      ability_dimensions: [],
      wellbeing: {
        daily_checkins: {},
        daily_rest_sessions: {},
      },
      ability_module: normalizeAbilityModule(null),
    };
  }
  if (payload && typeof payload === 'object') {
    return {
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
      ability_dimensions: Array.isArray(payload.ability_dimensions)
        ? payload.ability_dimensions
          .filter((item) => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
        : [],
      wellbeing: payload.wellbeing && typeof payload.wellbeing === 'object' && payload.wellbeing.daily_checkins && typeof payload.wellbeing.daily_checkins === 'object'
        ? {
            daily_checkins: Object.fromEntries(
              Object.entries(payload.wellbeing.daily_checkins)
                .filter(([key, value]) =>
                  typeof key === 'string'
                  && value
                  && typeof value === 'object'
                  && Number.isFinite(Number(value.initial_energy))
                )
                .map(([key, value]) => [
                  key,
                  {
                    initial_energy: Math.max(0, Math.min(100, Math.round(Number(value.initial_energy)))),
                    updated_at: Number.isFinite(Number(value.updated_at)) ? Number(value.updated_at) : Date.now(),
                  },
                ])
            ),
            daily_rest_sessions: payload.wellbeing.daily_rest_sessions && typeof payload.wellbeing.daily_rest_sessions === 'object'
              ? Object.fromEntries(
                  Object.entries(payload.wellbeing.daily_rest_sessions)
                    .filter(([key, value]) =>
                      typeof key === 'string'
                      && value
                      && typeof value === 'object'
                    )
                    .map(([key, value]) => [
                      key,
                      {
                        is_resting: Boolean(value.is_resting),
                        started_at: Number.isFinite(Number(value.started_at)) ? Number(value.started_at) : null,
                        recovered_energy: Number.isFinite(Number(value.recovered_energy))
                          ? Math.max(0, Math.min(100, Number(value.recovered_energy)))
                          : 0,
                        updated_at: Number.isFinite(Number(value.updated_at)) ? Number(value.updated_at) : Date.now(),
                      },
                    ])
                )
              : {},
          }
        : {
            daily_checkins: {},
            daily_rest_sessions: {},
          },
      ability_module: normalizeAbilityModule(payload.ability_module),
    };
  }
  return {
    tasks: [],
    ability_dimensions: [],
    wellbeing: {
      daily_checkins: {},
      daily_rest_sessions: {},
    },
    ability_module: normalizeAbilityModule(null),
  };
}

async function readTasks(username) {
  const userTasksFile = getUserTasksFile(username);
  try {
    const text = await fs.promises.readFile(userTasksFile, 'utf-8');
    const parsed = JSON.parse(text);
    return normalizeTaskPayload(parsed);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      try {
        const text = await fs.promises.readFile(legacyTasksFile, 'utf-8');
        const parsed = JSON.parse(text);
        return normalizeTaskPayload(parsed);
      } catch (legacyError) {
        if (legacyError && legacyError.code === 'ENOENT') {
          return normalizeTaskPayload([]);
        }
        throw legacyError;
      }
    }
    throw error;
  }
}

async function writeTasks(username, payload) {
  const userTasksFile = getUserTasksFile(username);
  await fs.promises.mkdir(path.dirname(userTasksFile), { recursive: true });
  await fs.promises.writeFile(userTasksFile, JSON.stringify(normalizeTaskPayload(payload), null, 2), 'utf-8');
}

function createSessionToken(username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function parseBearerToken(authorizationHeader) {
  if (!authorizationHeader) return '';
  const [scheme, token] = authorizationHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return '';
  return token.trim();
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function requireAuth(req, res, next) {
  const token = parseBearerToken(req.headers.authorization);
  const session = getSession(token);
  if (!session) {
    res.status(401).json({ error: '未登录或会话已过期' });
    return;
  }
  req.authUser = session.username;
  next();
}

app.use(express.json({ limit: '1mb' }));

app.post('/api/auth/register', async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  try {
    const registeredUsername = await registerUser(username, password);
    const token = createSessionToken(registeredUsername);
    res.status(201).json({
      token,
      username: registeredUsername,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '注册失败';
    if (message === 'REGISTRATION_DISABLED') {
      res.status(403).json({ error: '当前环境不允许注册' });
      return;
    }
    if (message === 'INVALID_USERNAME') {
      res.status(400).json({ error: '用户名需为 3-32 位，仅支持字母、数字、._-' });
      return;
    }
    if (message === 'INVALID_PASSWORD') {
      res.status(400).json({ error: '密码长度需在 8-128 位' });
      return;
    }
    if (message === 'USER_EXISTS') {
      res.status(409).json({ error: '用户名已存在' });
      return;
    }
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || !password) {
    res.status(400).json({ error: '请输入账号和密码' });
    return;
  }

  const matchedUser = await findUserForLogin(username, password);
  if (!matchedUser) {
    res.status(401).json({ error: '账号或密码错误' });
    return;
  }

  const token = createSessionToken(matchedUser.username);
  res.status(200).json({
    token,
    username: matchedUser.username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
});

app.get('/api/auth/session', requireAuth, (req, res) => {
  res.status(200).json({
    ok: true,
    username: req.authUser,
  });
});

app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const tasks = await readTasks(req.authUser);
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ error: `read failed: ${error.message}` });
  }
});

app.put('/api/tasks', requireAuth, async (req, res) => {
  try {
    if (!Array.isArray(req.body) && !(req.body && typeof req.body === 'object')) {
      res.status(400).json({ error: 'payload must be an array or object' });
      return;
    }
    await writeTasks(req.authUser, req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: `write failed: ${error.message}` });
  }
});

app.post('/api/ai/plan', requireAuth, async (req, res) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description : '';
    if (!title) {
      res.status(400).json({ error: '任务名称不能为空' });
      return;
    }

    const result = await requestAIPlan({ title, description });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 生成失败';
    const status = message.includes('AI_API_KEY') ? 503 : 502;
    res.status(status).json({ error: message });
  }
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`dayplan server running at http://0.0.0.0:${port}`);
});
