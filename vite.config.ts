import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const dataDir = path.resolve(__dirname, '.data');
const tasksFile = path.join(dataDir, 'tasks.json');

type Req = {
  method?: string;
  url?: string;
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

type PlanTask = {
  title: string;
  description: string;
};

function sendJson(res: Res, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readTasks() {
  try {
    const text = await fs.promises.readFile(tasksFile, 'utf-8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeTasks(tasks: unknown[]) {
  await fs.promises.mkdir(dataDir, { recursive: true });
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

function createApiMiddleware(aiConfig: AiConfig) {
  return (req: Req, res: Res, next: () => void) => {
    if (req.url?.startsWith('/api/tasks')) {
      if (req.method === 'GET') {
        readTasks()
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
            await writeTasks(payload);
            sendJson(res, 200, { ok: true });
          })
          .catch((error) => sendJson(res, 500, { error: `write failed: ${(error as Error).message}` }));
        return;
      }

      sendJson(res, 405, { error: 'method not allowed' });
      return;
    }

    if (req.url?.startsWith('/api/ai/plan')) {
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
  const aiConfig: AiConfig = {
    apiKey: env.AI_API_KEY || env.VITE_AI_API_KEY || process.env.AI_API_KEY || '',
    apiBase: (env.AI_BASE_URL || env.VITE_AI_BASE_URL || process.env.AI_BASE_URL || 'https://api.aipaibox.com').replace(/\/$/, ''),
    model: env.AI_MODEL || env.VITE_AI_MODEL || process.env.AI_MODEL || 'gemini-3.1-pro-preview',
  };

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-api',
        configureServer(server) {
          server.middlewares.use(createApiMiddleware(aiConfig));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createApiMiddleware(aiConfig));
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
