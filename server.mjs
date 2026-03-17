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
// [EXTERNAL] Local TrendRadar project: platform config and optional local snapshot fallback.
const TRENDRADAR_ROOT = process.env.TRENDRADAR_ROOT || path.resolve(__dirname, '..', 'TrendRadar');
// [EXTERNAL] Local ai-daily-digest project: curated technical RSS seed list.
const AI_DAILY_DIGEST_ROOT = process.env.AI_DAILY_DIGEST_ROOT || path.resolve(__dirname, '..', 'ai-daily-digest');
const NEWSNOW_API_BASE = (process.env.NEWSNOW_API_BASE || 'https://newsnow.busiyi.world/api/s').replace(/\/$/, '');

const AI_MODEL = process.env.AI_MODEL || process.env.VITE_AI_MODEL || 'gemini-3.1-pro-preview';
const AI_API_BASE = (process.env.AI_BASE_URL || process.env.VITE_AI_BASE_URL || 'https://api.aipaibox.com').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || process.env.VITE_AI_API_KEY || '';
const AUTH_ALLOW_REGISTRATION = (process.env.AUTH_ALLOW_REGISTRATION || 'true').toLowerCase() !== 'false';
const SEED_USERS = parseSeedUsersFromEnv();
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24);
const ADMIN_USERS = parseAdminUsersFromEnv(SEED_USERS);
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
const RSS_SCOUT_SYSTEM_PROMPT = `你是一位资深 RSS 订阅策展助手。请严格返回 JSON，不要有任何额外文字。
返回结构:
{
  "summary": "一句中文总结",
  "feeds": [
    {
      "name": "订阅源名称",
      "url": "https://example.com/feed.xml",
      "category": "分类名称",
      "keywords": ["关键词1", "关键词2"],
      "reason": "推荐理由"
    }
  ]
}
要求:
1. feeds 返回 3 到 6 条，不确定时宁可少返回。
2. 只返回公开可访问、尽量像 RSS/Atom 的直接订阅链接，避免网站首页。
3. 优先选择长期稳定、更新频率合理、信息质量高的源。
4. 如果 URL 把握不足，就不要编造。
5. summary 和 reason 使用中文。`;
const DEFAULT_TRENDRADAR_PLATFORMS = [
  { id: 'toutiao', name: '今日头条' },
  { id: 'baidu', name: '百度热搜' },
  { id: 'wallstreetcn-hot', name: '华尔街见闻' },
  { id: 'thepaper', name: '澎湃新闻' },
  { id: 'bilibili-hot-search', name: 'bilibili 热搜' },
  { id: 'cls-hot', name: '财联社热门' },
  { id: 'ifeng', name: '凤凰网' },
  { id: 'tieba', name: '贴吧' },
  { id: 'weibo', name: '微博' },
  { id: 'douyin', name: '抖音' },
  { id: 'zhihu', name: '知乎' },
];

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

function parseAdminUsersFromEnv(seedUsers) {
  const raw = process.env.AUTH_ADMIN_USERS;
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

function isAdminUsername(username) {
  return ADMIN_USERS.has(normalizeUsername(username));
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

async function resetPasswordByAdmin(targetUsername, newPassword) {
  const normalized = normalizeUsername(targetUsername);
  if (!normalized) {
    throw new Error('USER_NOT_FOUND');
  }
  if (!isValidPassword(newPassword)) {
    throw new Error('INVALID_PASSWORD');
  }

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
    return users[existingIndex].username;
  }

  const seedUser = SEED_USERS.find((user) => normalizeUsername(user.username) === normalized);
  if (!seedUser) {
    throw new Error('USER_NOT_FOUND');
  }

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
  return seedUser.username;
}

function buildPrompt(task) {
  return `帮我为这个任务制定一个详细执行计划。
任务名称：${task.title}
任务描述：${task.description || '无'}
请按要求返回。`;
}

function parseQuotedOrBareValue(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text;
}

async function loadTrendRadarPlatforms() {
  try {
    const configPath = path.join(TRENDRADAR_ROOT, 'config', 'config.yaml');
    const text = await fs.promises.readFile(configPath, 'utf-8');
    const lines = text.split(/\r?\n/);
    const platforms = [];
    let inPlatforms = false;
    let current = null;

    for (const line of lines) {
      if (!inPlatforms) {
        if (/^platforms:\s*$/.test(line)) {
          inPlatforms = true;
        }
        continue;
      }

      if (line.trim() && !/^\s/.test(line)) break;
      const idMatch = line.match(/^\s*-\s+id:\s*(.+)\s*$/);
      if (idMatch) {
        if (current?.id) {
          platforms.push({
            id: current.id,
            name: current.name || current.id,
          });
        }
        current = { id: parseQuotedOrBareValue(idMatch[1]), name: '' };
        continue;
      }

      const nameMatch = line.match(/^\s+name:\s*(.+)\s*$/);
      if (nameMatch && current) {
        current.name = parseQuotedOrBareValue(nameMatch[1]);
      }
    }

    if (current?.id) {
      platforms.push({
        id: current.id,
        name: current.name || current.id,
      });
    }

    return platforms.length > 0 ? platforms : DEFAULT_TRENDRADAR_PLATFORMS;
  } catch {
    return DEFAULT_TRENDRADAR_PLATFORMS;
  }
}

function filterTrendRadarPlatforms(allPlatforms, rawIds) {
  if (!rawIds) return allPlatforms;
  const requested = String(rawIds)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (requested.length === 0) return allPlatforms;
  return allPlatforms.filter((platform) => requested.includes(platform.id));
}

function buildRssScoutPrompt({ topic, guidance }) {
  return `请为这个主题挑选一组高质量 RSS/Atom 订阅源。
主题：${topic}
提示方向：${guidance || '无额外方向，优先信息质量、稳定更新、适合长期订阅。'}
请按要求返回。`;
}

function extractJsonText(raw) {
  const trimmed = String(raw || '').trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] || trimmed;
}

function parsePlanPayload(raw) {
  const jsonText = extractJsonText(raw);
  const parsed = JSON.parse(jsonText);
  return {
    plan: typeof parsed.plan === 'string' ? parsed.plan : '',
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.filter((s) => typeof s === 'string' && s.trim().length > 0)
      : [],
  };
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseRssScoutPayload(raw) {
  const jsonText = extractJsonText(raw);
  const parsed = JSON.parse(jsonText);
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    feeds: Array.isArray(parsed.feeds)
      ? parsed.feeds
          .filter((feed) => feed && typeof feed === 'object')
          .map((feed) => ({
            name: typeof feed.name === 'string' ? feed.name.trim() : '',
            url: typeof feed.url === 'string' ? feed.url.trim() : '',
            category: typeof feed.category === 'string' ? feed.category.trim() : 'AI 推荐',
            keywords: Array.isArray(feed.keywords)
              ? feed.keywords
                  .filter((item) => typeof item === 'string' && item.trim().length > 0)
                  .map((item) => item.trim())
                  .slice(0, 6)
              : [],
            reason: typeof feed.reason === 'string' ? feed.reason.trim() : '',
          }))
          .filter((feed) => feed.name && feed.url && isValidHttpUrl(feed.url))
          .slice(0, 6)
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
      rss_feeds: [],
      news_items: [],
      idea_notes: [],
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
      rss_feeds: Array.isArray(payload.rss_feeds) ? payload.rss_feeds : [],
      news_items: Array.isArray(payload.news_items) ? payload.news_items : [],
      idea_notes: Array.isArray(payload.idea_notes) ? payload.idea_notes : [],
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
    rss_feeds: [],
    news_items: [],
    idea_notes: [],
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

function revokeSessionsForUsername(username, exceptToken = '') {
  const normalized = normalizeUsername(username);
  for (const [token, session] of sessions.entries()) {
    if (token === exceptToken) continue;
    if (normalizeUsername(session.username) === normalized) {
      sessions.delete(token);
    }
  }
}

async function requestRssScoutByChatCompletions(params) {
  const response = await fetch(`${AI_API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: RSS_SCOUT_SYSTEM_PROMPT },
        { role: 'user', content: buildRssScoutPrompt(params) },
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
  return parseRssScoutPayload(content);
}

async function requestRssScoutByGemini(params) {
  const response = await fetch(`${AI_API_BASE}/v1beta/models/${AI_MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
      'x-goog-api-key': AI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${RSS_SCOUT_SYSTEM_PROMPT}\n\n${buildRssScoutPrompt(params)}` }] }],
      generationConfig: {
        temperature: 0.25,
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
  return parseRssScoutPayload(content);
}

async function requestAIRssScout(params) {
  if (!AI_API_KEY) {
    throw new Error('服务器未配置 AI_API_KEY');
  }
  try {
    return await requestRssScoutByChatCompletions(params);
  } catch {
    return requestRssScoutByGemini(params);
  }
}

async function fetchTrendRadarLiveSnapshot({ limit = 60, platforms: rawPlatforms = '' } = {}) {
  const allPlatforms = await loadTrendRadarPlatforms();
  const targetPlatforms = filterTrendRadarPlatforms(allPlatforms, rawPlatforms);
  if (targetPlatforms.length === 0) {
    throw new Error('没有可用的 TrendRadar 平台配置');
  }

  const settled = await Promise.allSettled(targetPlatforms.map(async (platform) => {
    const response = await fetch(`${NEWSNOW_API_BASE}?id=${encodeURIComponent(platform.id)}&latest`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'dayplan-trendradar-bridge/1.0',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.items)) {
      throw new Error('响应缺少 items');
    }

    return {
      platform,
      status: typeof payload.status === 'string' ? payload.status : 'unknown',
      items: payload.items,
    };
  }));

  const fetchTime = new Date().toISOString();
  const items = [];
  const failedPlatforms = [];

  settled.forEach((result, index) => {
    const platform = targetPlatforms[index];
    if (result.status !== 'fulfilled') {
      failedPlatforms.push(platform.id);
      return;
    }

    result.value.items.forEach((item, itemIndex) => {
      const title = typeof item?.title === 'string' ? item.title.trim() : '';
      if (!title) return;

      items.push({
        platform_id: platform.id,
        platform_name: platform.name,
        title,
        rank: itemIndex + 1,
        url: typeof item?.url === 'string' ? item.url : '',
        mobile_url: typeof item?.mobileUrl === 'string' ? item.mobileUrl : '',
        timestamp: fetchTime,
      });
    });
  });

  items.sort((a, b) => a.rank - b.rank || a.platform_name.localeCompare(b.platform_name, 'zh-CN'));

  return {
    source: 'trendradar-live',
    fetched_at: fetchTime,
    platforms: targetPlatforms,
    failed_platforms: failedPlatforms,
    total: items.length,
    items: items.slice(0, Math.max(1, Number(limit) || 60)),
  };
}

function parseTrendRadarTxtSection(line) {
  const rankMatch = String(line || '').trim().match(/^(\d+)\.\s+(.*)$/);
  const rank = rankMatch ? Number(rankMatch[1]) : 0;
  let titlePart = rankMatch ? rankMatch[2].trim() : String(line || '').trim();

  let mobileUrl = '';
  const mobileMatch = titlePart.match(/\s+\[MOBILE:([^\]]+)\]\s*$/);
  if (mobileMatch) {
    mobileUrl = mobileMatch[1];
    titlePart = titlePart.slice(0, mobileMatch.index).trim();
  }

  let url = '';
  const urlMatch = titlePart.match(/\s+\[URL:([^\]]+)\]\s*$/);
  if (urlMatch) {
    url = urlMatch[1];
    titlePart = titlePart.slice(0, urlMatch.index).trim();
  }

  return {
    rank,
    title: titlePart,
    url,
    mobile_url: mobileUrl,
  };
}

async function fetchTrendRadarLocalSnapshot({ limit = 60, platforms: rawPlatforms = '' } = {}) {
  const outputRoot = path.join(TRENDRADAR_ROOT, 'output');
  const allPlatforms = await loadTrendRadarPlatforms();
  const targetPlatforms = filterTrendRadarPlatforms(allPlatforms, rawPlatforms);
  const allowedIds = new Set(targetPlatforms.map((platform) => platform.id));

  const dateDirs = (await fs.promises.readdir(outputRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a, 'zh-CN'));

  let latestTxtPath = '';
  let dateLabel = '';
  for (const dateDir of dateDirs) {
    const txtDir = path.join(outputRoot, dateDir, 'txt');
    try {
      const txtFiles = (await fs.promises.readdir(txtDir, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith('.txt'))
        .map((entry) => entry.name)
        .sort((a, b) => b.localeCompare(a, 'zh-CN'));
      if (txtFiles.length === 0) continue;
      latestTxtPath = path.join(txtDir, txtFiles[0]);
      dateLabel = dateDir;
      break;
    } catch {
      continue;
    }
  }

  if (!latestTxtPath) {
    throw new Error('TrendRadar 本地 output 中没有可用快照');
  }

  const fileText = await fs.promises.readFile(latestTxtPath, 'utf-8');
  const timeLabel = path.basename(latestTxtPath, '.txt').replace('时', ':').replace('分', '');
  const sections = fileText.split(/\r?\n\r?\n+/);
  const items = [];

  for (const section of sections) {
    if (!section.trim() || section.includes('==== 以下ID请求失败 ====')) continue;
    const lines = section.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) continue;

    const [platformIdRaw, platformNameRaw] = lines[0].split(' | ');
    const platformId = (platformIdRaw || '').trim();
    const platformName = (platformNameRaw || platformIdRaw || '').trim();
    if (!platformId || (allowedIds.size > 0 && !allowedIds.has(platformId))) continue;

    lines.slice(1).forEach((line) => {
      const parsed = parseTrendRadarTxtSection(line);
      if (!parsed.title) return;
      items.push({
        platform_id: platformId,
        platform_name: platformName || platformId,
        title: parsed.title,
        rank: parsed.rank || 0,
        url: parsed.url,
        mobile_url: parsed.mobile_url,
        timestamp: `${dateLabel} ${timeLabel}`,
      });
    });
  }

  items.sort((a, b) => a.rank - b.rank || a.platform_name.localeCompare(b.platform_name, 'zh-CN'));
  return {
    source: 'trendradar-local',
    fetched_at: `${dateLabel} ${timeLabel}`,
    platforms: targetPlatforms,
    failed_platforms: [],
    total: items.length,
    items: items.slice(0, Math.max(1, Number(limit) || 60)),
  };
}

async function getTrendRadarSnapshot(options = {}) {
  try {
    return await fetchTrendRadarLiveSnapshot(options);
  } catch (liveError) {
    const fallback = await fetchTrendRadarLocalSnapshot(options);
    return {
      ...fallback,
      fallback_reason: liveError instanceof Error ? liveError.message : 'live fetch failed',
    };
  }
}

async function loadTechnicalRssPresets(limit = 90) {
  const digestPath = path.join(AI_DAILY_DIGEST_ROOT, 'scripts', 'digest.ts');
  const source = await fs.promises.readFile(digestPath, 'utf-8');
  const feeds = Array.from(source.matchAll(/\{\s*name:\s*"([^"]+)"\s*,\s*xmlUrl:\s*"([^"]+)"\s*,\s*htmlUrl:\s*"([^"]+)"/g))
    .map((match, index) => ({
      id: `digest-seed-${index + 1}`,
      name: match[1].trim(),
      url: match[2].trim(),
      homepage: match[3].trim(),
      category: '技术博客',
      keywords: ['技术', '博客', 'AI Daily Digest'],
      reason: '来自 ai-daily-digest 的高质量技术 RSS 种子库。',
    }))
    .filter((feed) => feed.name && feed.url)
    .slice(0, Math.max(1, Number(limit) || 90));

  return {
    source: 'ai-daily-digest',
    total: feeds.length,
    feeds,
  };
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
  req.authToken = token;
  req.authIsAdmin = isAdminUsername(session.username);
  next();
}

function requireAdmin(req, res, next) {
  if (!req.authIsAdmin) {
    res.status(403).json({ error: '仅管理员可执行此操作' });
    return;
  }
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
      isAdmin: isAdminUsername(registeredUsername),
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
    isAdmin: isAdminUsername(matchedUser.username),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
});

app.get('/api/auth/session', requireAuth, (req, res) => {
  res.status(200).json({
    ok: true,
    username: req.authUser,
    isAdmin: req.authIsAdmin,
  });
});

app.post('/api/admin/reset-password', requireAuth, requireAdmin, async (req, res) => {
  const targetUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!targetUsername || !newPassword) {
    res.status(400).json({ error: '请输入目标账号和新密码' });
    return;
  }

  try {
    const updatedUsername = await resetPasswordByAdmin(targetUsername, newPassword);
    const keepToken = normalizeUsername(updatedUsername) === normalizeUsername(req.authUser)
      ? req.authToken
      : '';
    revokeSessionsForUsername(updatedUsername, keepToken);
    res.status(200).json({
      ok: true,
      username: updatedUsername,
      message: `账号 ${updatedUsername} 的密码已重置`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '重置失败';
    if (message === 'INVALID_PASSWORD') {
      res.status(400).json({ error: '密码长度需在 8-128 位' });
      return;
    }
    if (message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: '目标账号不存在' });
      return;
    }
    res.status(500).json({ error: '重置失败，请稍后重试' });
  }
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

app.post('/api/ai/rss-scout', requireAuth, async (req, res) => {
  try {
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    const guidance = typeof req.body?.guidance === 'string' ? req.body.guidance.trim() : '';
    if (!topic) {
      res.status(400).json({ error: '主题不能为空' });
      return;
    }

    const result = await requestAIRssScout({ topic, guidance });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 生成失败';
    const status = message.includes('AI_API_KEY') ? 503 : 502;
    res.status(status).json({ error: message });
  }
});

app.get('/api/world-news/trendradar/latest', requireAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 60));
    const platforms = typeof req.query.platforms === 'string' ? req.query.platforms : '';
    const result = await getTrendRadarSnapshot({ limit, platforms });
    res.status(200).json(result);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'TrendRadar 数据获取失败',
    });
  }
});

app.get('/api/rss/presets/technical', requireAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 90));
    const result = await loadTechnicalRssPresets(limit);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : '技术 RSS 种子读取失败',
    });
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
