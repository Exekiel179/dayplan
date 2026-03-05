import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const dataDir = path.resolve(__dirname, '.data');
const legacyTasksFile = path.join(dataDir, 'tasks.json');

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
  users: Array<{
    username: string;
    password: string;
  }>;
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

const sessions = new Map<string, SessionRecord>();

function sendJson(res: Res, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function getUserTasksFile(username: string) {
  const safeUser = encodeURIComponent(username.trim().toLowerCase());
  return path.join(dataDir, 'users', safeUser, 'tasks.json');
}

async function readTasks(username: string) {
  const tasksFile = getUserTasksFile(username);
  try {
    const text = await fs.promises.readFile(tasksFile, 'utf-8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      try {
        const text = await fs.promises.readFile(legacyTasksFile, 'utf-8');
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
      } catch (legacyError: unknown) {
        if ((legacyError as NodeJS.ErrnoException).code === 'ENOENT') {
          return [];
        }
        throw legacyError;
      }
    }
    throw error;
  }
}

async function writeTasks(username: string, tasks: unknown[]) {
  const tasksFile = getUserTasksFile(username);
  await fs.promises.mkdir(path.dirname(tasksFile), { recursive: true });
  await fs.promises.writeFile(tasksFile, JSON.stringify(tasks, null, 2), 'utf-8');
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

async function requestAiPlan(task: PlanTask, aiConfig: AiConfig) {
  if (!aiConfig.apiKey) {
    throw new Error('服务器未配置 AI_API_KEY');
  }
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

function createApiMiddleware(aiConfig: AiConfig, authConfig: AuthConfig) {
  return (req: Req, res: Res, next: () => void) => {
    if (req.url?.startsWith('/api/auth/login')) {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      readJsonBody(req)
        .then((payload) => {
          const body = (payload || {}) as { username?: string; password?: string };
          const username = typeof body.username === 'string' ? body.username.trim() : '';
          const password = typeof body.password === 'string' ? body.password : '';
          if (!username || !password) {
            sendJson(res, 400, { error: '请输入账号和密码' });
            return;
          }
          const matchedUser = authConfig.users.find((u) => u.username === username && u.password === password);
          if (!matchedUser) {
            sendJson(res, 401, { error: '账号或密码错误' });
            return;
          }

          const token = createSessionToken(username, authConfig);
          sendJson(res, 200, {
            token,
            username,
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
        readTasks(session.username)
          .then((tasks) => sendJson(res, 200, tasks))
          .catch((error) => sendJson(res, 500, { error: `read failed: ${(error as Error).message}` }));
        return;
      }

      if (req.method === 'PUT') {
        readJsonBody(req)
          .then(async (payload) => {
            if (!Array.isArray(payload)) {
              sendJson(res, 400, { error: 'payload must be an array' });
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
  const authUsers = (() => {
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
        // fall back to single user env below
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
    users: authUsers,
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
