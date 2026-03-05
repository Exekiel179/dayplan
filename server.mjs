import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

const dataDir = path.resolve(__dirname, '.data');
const tasksFile = path.join(dataDir, 'tasks.json');
const distDir = path.resolve(__dirname, 'dist');

const AI_MODEL = process.env.AI_MODEL || process.env.VITE_AI_MODEL || 'gemini-3.1-pro-preview';
const AI_API_BASE = (process.env.AI_BASE_URL || process.env.VITE_AI_BASE_URL || 'https://api.aipaibox.com').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || process.env.VITE_AI_API_KEY || '';

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

async function readTasks() {
  try {
    const text = await fs.promises.readFile(tasksFile, 'utf-8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeTasks(tasks) {
  await fs.promises.mkdir(dataDir, { recursive: true });
  await fs.promises.writeFile(tasksFile, JSON.stringify(tasks, null, 2), 'utf-8');
}

app.use(express.json({ limit: '1mb' }));

app.get('/api/tasks', async (_req, res) => {
  try {
    const tasks = await readTasks();
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ error: `read failed: ${error.message}` });
  }
});

app.put('/api/tasks', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: 'payload must be an array' });
      return;
    }
    await writeTasks(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: `write failed: ${error.message}` });
  }
});

app.post('/api/ai/plan', async (req, res) => {
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
