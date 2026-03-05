import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const dataDir = path.resolve(__dirname, '.data');
const tasksFile = path.join(dataDir, 'tasks.json');

function sendJson(res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string) => void }, statusCode: number, payload: unknown) {
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
  await fs.promises.mkdir(dataDir, {recursive: true});
  await fs.promises.writeFile(tasksFile, JSON.stringify(tasks, null, 2), 'utf-8');
}

function createTasksApiMiddleware() {
  return (req: { method?: string; url?: string; on: (event: string, cb: (chunk?: Buffer) => void) => void }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string) => void }, next: () => void) => {
    if (!req.url?.startsWith('/api/tasks')) {
      next();
      return;
    }

    if (req.method === 'GET') {
      readTasks()
        .then((tasks) => sendJson(res, 200, tasks))
        .catch((error) => sendJson(res, 500, {error: `read failed: ${(error as Error).message}`}));
      return;
    }

    if (req.method === 'PUT') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk?: Buffer) => {
        if (chunk) chunks.push(chunk);
      });
      req.on('end', async () => {
        try {
          const payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf-8')) : [];
          if (!Array.isArray(payload)) {
            sendJson(res, 400, {error: 'payload must be an array'});
            return;
          }
          await writeTasks(payload);
          sendJson(res, 200, {ok: true});
        } catch (error) {
          sendJson(res, 500, {error: `write failed: ${(error as Error).message}`});
        }
      });
      return;
    }

    sendJson(res, 405, {error: 'method not allowed'});
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'tasks-api',
        configureServer(server) {
          server.middlewares.use(createTasksApiMiddleware());
        },
        configurePreviewServer(server) {
          server.middlewares.use(createTasksApiMiddleware());
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
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
