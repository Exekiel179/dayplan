import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import express from 'express';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TECHNICAL_RSS_SEEDS } from './technical-rss-seeds.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

const dataDir = path.resolve(__dirname, '.data');
const legacyTasksFile = path.join(dataDir, 'tasks.json');
const authUsersFile = path.join(dataDir, 'auth-users.json');
const distDir = path.resolve(__dirname, 'dist');
// [EXTERNAL] Local TrendRadar project: platform config and optional local snapshot fallback.
const TRENDRADAR_ROOT = process.env.TRENDRADAR_ROOT || '';
// [EXTERNAL] Local ai-daily-digest project: curated technical RSS seed list.
const AI_DAILY_DIGEST_ROOT = process.env.AI_DAILY_DIGEST_ROOT || '';
const NEWSNOW_API_BASE = (process.env.NEWSNOW_API_BASE || 'https://newsnow.busiyi.world/api/s').replace(/\/$/, '');

const AI_MODEL = process.env.AI_MODEL || process.env.VITE_AI_MODEL || 'gemini-3.1-pro-preview';
const AI_API_BASE = (process.env.AI_BASE_URL || process.env.VITE_AI_BASE_URL || 'https://api.aipaibox.com').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || process.env.VITE_AI_API_KEY || '';
const AI_API_STYLE = (process.env.AI_API_STYLE || process.env.VITE_AI_API_STYLE || 'auto').trim().toLowerCase();
const AUTH_ALLOW_REGISTRATION = (process.env.AUTH_ALLOW_REGISTRATION || 'true').toLowerCase() !== 'false';
const SEED_USERS = parseSeedUsersFromEnv();
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24);
const ADMIN_USERS = parseAdminUsersFromEnv(SEED_USERS);
const sessions = new Map();
const TRENDRADAR_LIVE_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': 'https://newsnow.busiyi.world/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
};
const RSS_FETCH_HEADERS = {
  'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
};

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

function buildExternalRootCandidates(rawRoot, projectName) {
  const candidates = [];
  const pushCandidate = (value) => {
    if (!value || typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (path.isAbsolute(trimmed)) {
      candidates.push(path.normalize(trimmed));
      return;
    }
    candidates.push(path.resolve(process.cwd(), trimmed));
    candidates.push(path.resolve(__dirname, trimmed));
  };

  pushCandidate(rawRoot);
  candidates.push(path.resolve(__dirname, '..', projectName));
  candidates.push(path.resolve(process.cwd(), '..', projectName));
  candidates.push(path.resolve(process.cwd(), projectName));

  return Array.from(new Set(candidates));
}

function resolveExternalRoot(rawRoot, projectName, requiredSegments = []) {
  const candidates = buildExternalRootCandidates(rawRoot, projectName);
  for (const candidate of candidates) {
    const requiredPath = requiredSegments.length > 0 ? path.join(candidate, ...requiredSegments) : candidate;
    if (fs.existsSync(requiredPath)) {
      return candidate;
    }
  }
  return '';
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

function buildDayPlanPrompt({ input, energy, existingTasks }) {
  const existingSummary = Array.isArray(existingTasks) && existingTasks.length > 0
    ? existingTasks
        .slice(0, 8)
        .map((task, index) => `${index + 1}. ${task.title || '未命名任务'}｜${task.estimated_minutes || 60} 分钟｜${task.status || 'pending'}`)
        .join('\n')
    : '当前还没有已有任务。';
  return `请把下面这段自然语言整理成今天的执行计划。
用户输入：
${input}

当前精力：${Number.isFinite(Number(energy)) ? Number(energy) : 60}

现有任务参考：
${existingSummary}

请优先让计划简单、可执行、不过载。`;
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
    const trendRadarRoot = resolveExternalRoot(TRENDRADAR_ROOT, 'TrendRadar', ['config', 'config.yaml']);
    if (!trendRadarRoot) {
      return DEFAULT_TRENDRADAR_PLATFORMS;
    }
    const configPath = path.join(trendRadarRoot, 'config', 'config.yaml');
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

function parseDayPlanPayload(raw) {
  const jsonText = extractJsonText(raw);
  const parsed = JSON.parse(jsonText);
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    core_focus: typeof parsed.core_focus === 'string' ? parsed.core_focus.trim() : '',
    schedule_markdown: typeof parsed.schedule_markdown === 'string' ? parsed.schedule_markdown.trim() : '',
    tasks: Array.isArray(parsed.tasks)
      ? parsed.tasks
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            title: typeof item.title === 'string' ? item.title.trim() : '',
            description: typeof item.description === 'string' ? item.description.trim() : '',
            estimated_minutes: Math.max(10, Math.min(180, Number(item.estimated_minutes) || 30)),
            energy_delta: Math.max(-2, Math.min(2, Math.round(Number(item.energy_delta) || 0))),
            stress_score: Math.max(1, Math.min(5, Math.round(Number(item.stress_score) || 3))),
            cognitive_load: item.cognitive_load === 'high' ? 'high' : 'low',
            collaboration_level: item.collaboration_level === 'high' ? 'high' : 'low',
            category_key: ['research', 'development', 'learning'].includes(item.category_key) ? item.category_key : 'misc',
            timeline: item.timeline === 'long_term' ? 'long_term' : 'temporary',
          }))
          .filter((item) => item.title)
      : [],
  };
}

function shouldUseOpenAICompat() {
  if (AI_API_STYLE === 'openai') return true;
  if (AI_API_STYLE === 'gemini') return false;
  return !/googleapis\.com|generativelanguage|\/v1beta\/models/i.test(AI_API_BASE);
}

async function parseErrorResponse(response) {
  const fallback = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`.trim();
  try {
    const text = (await response.text()).trim();
    if (!text) return fallback;
    try {
      const parsed = JSON.parse(text);
      const message = parsed?.error?.message || parsed?.error || parsed?.message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    } catch {
      // Ignore JSON parse failure and return raw text below.
    }
    return text;
  } catch {
    return fallback;
  }
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

function normalizeXmlText(value) {
  return String(value || '')
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractXmlBlocks(xml, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  return Array.from(xml.matchAll(pattern)).map((match) => match[1]);
}

function extractFirstTagText(xml, tagNames) {
  for (const tagName of tagNames) {
    const pattern = new RegExp(`<${escapeRegex(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegex(tagName)}>`, 'i');
    const match = xml.match(pattern);
    if (!match?.[1]) continue;
    const text = normalizeXmlText(match[1]);
    if (text) return text;
  }
  return '';
}

function extractFirstTagHref(xml, tagNames) {
  for (const tagName of tagNames) {
    const hrefPattern = new RegExp(`<${escapeRegex(tagName)}\\b[^>]*href=["']([^"']+)["'][^>]*\\/?>`, 'i');
    const hrefMatch = xml.match(hrefPattern);
    if (hrefMatch?.[1]) return hrefMatch[1].trim();

    const textPattern = new RegExp(`<${escapeRegex(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegex(tagName)}>`, 'i');
    const textMatch = xml.match(textPattern);
    const text = textMatch?.[1] ? normalizeXmlText(textMatch[1]) : '';
    if (text) return text;
  }
  return '';
}

function extractFeedTitle(xml, fallback = '') {
  const channelMatch = xml.match(/<channel\b[\s\S]*?<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (channelMatch?.[1]) {
    const title = normalizeXmlText(channelMatch[1]);
    if (title) return title;
  }

  const feedMatch = xml.match(/<feed\b[\s\S]*?<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (feedMatch?.[1]) {
    const title = normalizeXmlText(feedMatch[1]);
    if (title) return title;
  }

  return fallback;
}

function toIsoDate(value) {
  const timestamp = Date.parse(String(value || '').trim());
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toISOString();
}

function dedupeFeedItems(items, limit) {
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const key = `${item.url || ''}::${item.title || ''}`.toLowerCase();
    if (!item.title || !item.url || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

function parseFeedItems(xml, limit = 8) {
  const rssItems = extractXmlBlocks(xml, 'item').map((block) => ({
    title: extractFirstTagText(block, ['title']),
    url: extractFirstTagText(block, ['link', 'guid']),
    summary: extractFirstTagText(block, ['description', 'content:encoded', 'content', 'summary']),
    published_at: toIsoDate(extractFirstTagText(block, ['pubDate', 'dc:date', 'published', 'updated'])),
    source_title: extractFirstTagText(block, ['source']),
    tags: extractXmlBlocks(block, 'category').map((tag) => normalizeXmlText(tag)).filter(Boolean).slice(0, 6),
  }));
  if (rssItems.length > 0) {
    return dedupeFeedItems(rssItems, limit);
  }

  const atomItems = extractXmlBlocks(xml, 'entry').map((block) => ({
    title: extractFirstTagText(block, ['title']),
    url: extractFirstTagHref(block, ['link']) || extractFirstTagText(block, ['id']),
    summary: extractFirstTagText(block, ['summary', 'content']),
    published_at: toIsoDate(extractFirstTagText(block, ['updated', 'published'])),
    source_title: extractFirstTagText(block, ['source', 'author', 'name']),
    tags: extractXmlBlocks(block, 'category')
      .map((tag) => {
        const termMatch = tag.match(/\bterm=["']([^"']+)["']/i);
        if (termMatch?.[1]) return normalizeXmlText(termMatch[1]);
        return normalizeXmlText(tag);
      })
      .filter(Boolean)
      .slice(0, 6),
  }));
  return dedupeFeedItems(atomItems, limit);
}

function isPrivateIpv4(ip) {
  return /^10\./.test(ip)
    || /^127\./.test(ip)
    || /^169\.254\./.test(ip)
    || /^192\.168\./.test(ip)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function isPrivateIpv6(ip) {
  const normalized = ip.toLowerCase();
  return normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:');
}

function isPrivateIpAddress(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return false;
}

async function assertSafeFeedUrl(feedUrl) {
  const parsed = new URL(feedUrl);
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '0.0.0.0') {
    throw new Error('订阅地址不允许指向本地或内网');
  }

  if (isPrivateIpAddress(hostname)) {
    throw new Error('订阅地址不允许指向本地或内网');
  }

  try {
    const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
    if (resolved.some((entry) => isPrivateIpAddress(entry.address))) {
      throw new Error('订阅地址不允许指向本地或内网');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('本地或内网')) {
      throw error;
    }
  }
}

async function syncRssFeedPreview({ name, url, limit = 8 }) {
  if (!isValidHttpUrl(url)) {
    throw new Error('请输入有效的 RSS / Atom 地址');
  }

  await assertSafeFeedUrl(url);
  const response = await fetch(url, {
    headers: RSS_FETCH_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(`订阅源请求失败 (${response.status})`);
  }

  const xml = await response.text();
  if (!xml.trim()) {
    throw new Error('订阅源返回为空');
  }

  const items = parseFeedItems(xml, Math.max(1, Math.min(20, Number(limit) || 8)));
  if (items.length === 0) {
    throw new Error('没有解析到可用的订阅内容');
  }

  const feedTitle = extractFeedTitle(xml, name || 'RSS Feed');
  return {
    fetched_at: new Date().toISOString(),
    feed_title: feedTitle,
    items,
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
    const details = await parseErrorResponse(response);
    throw new Error(`chat completions failed: ${response.status}${details ? ` ${details}` : ''}`);
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
    const details = await parseErrorResponse(response);
    throw new Error(`generateContent failed: ${response.status}${details ? ` ${details}` : ''}`);
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
  if (shouldUseOpenAICompat()) {
    return requestPlanByChatCompletions(task);
  }
  return requestPlanByGemini(task);
}

async function requestDayPlanByChatCompletions(payload) {
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
        { role: 'system', content: DAY_PLAN_SYSTEM_PROMPT },
        { role: 'user', content: buildDayPlanPrompt(payload) },
      ],
    }),
  });
  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new Error(`chat completions failed: ${response.status}${details ? ` ${details}` : ''}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('chat completions returned empty content');
  }
  return parseDayPlanPayload(content);
}

async function requestDayPlanByGemini(payload) {
  const response = await fetch(`${AI_API_BASE}/v1beta/models/${AI_MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
      'x-goog-api-key': AI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${DAY_PLAN_SYSTEM_PROMPT}\n\n${buildDayPlanPrompt(payload)}` }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new Error(`generateContent failed: ${response.status}${details ? ` ${details}` : ''}`);
  }
  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n');
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('generateContent returned empty content');
  }
  return parseDayPlanPayload(content);
}

async function requestAIDayPlan(payload) {
  if (!AI_API_KEY) {
    throw new Error('服务器未配置 AI_API_KEY');
  }
  if (shouldUseOpenAICompat()) {
    return requestDayPlanByChatCompletions(payload);
  }
  return requestDayPlanByGemini(payload);
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
        daily_state_reports: {},
      },
      ability_module: normalizeAbilityModule(null),
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
            daily_state_reports: payload.wellbeing.daily_state_reports && typeof payload.wellbeing.daily_state_reports === 'object'
              ? Object.fromEntries(
                  Object.entries(payload.wellbeing.daily_state_reports)
                    .filter(([key, value]) =>
                      typeof key === 'string'
                      && value
                      && typeof value === 'object'
                    )
                    .map(([key, value]) => [
                      key,
                      {
                        self_rating: Number.isFinite(Number(value.self_rating))
                          ? Math.max(1, Math.min(5, Math.round(Number(value.self_rating))))
                          : 3,
                        sleep_hours: Number.isFinite(Number(value.sleep_hours))
                          ? Math.max(0, Math.min(12, Number(Number(value.sleep_hours).toFixed(1))))
                          : 7,
                        updated_at: Number.isFinite(Number(value.updated_at)) ? Number(value.updated_at) : Date.now(),
                      },
                    ])
                )
              : {},
          }
        : {
            daily_checkins: {},
            daily_rest_sessions: {},
            daily_state_reports: {},
          },
      ability_module: normalizeAbilityModule(payload.ability_module),
      ai_day_plan: payload.ai_day_plan && typeof payload.ai_day_plan === 'object'
        ? {
            input: typeof payload.ai_day_plan.input === 'string' ? payload.ai_day_plan.input : '',
            summary: typeof payload.ai_day_plan.summary === 'string' ? payload.ai_day_plan.summary : '',
            core_focus: typeof payload.ai_day_plan.core_focus === 'string' ? payload.ai_day_plan.core_focus : '',
            schedule_markdown: typeof payload.ai_day_plan.schedule_markdown === 'string' ? payload.ai_day_plan.schedule_markdown : '',
            tasks: Array.isArray(payload.ai_day_plan.tasks) ? payload.ai_day_plan.tasks : [],
            updated_at: Number.isFinite(Number(payload.ai_day_plan.updated_at)) ? Number(payload.ai_day_plan.updated_at) : 0,
          }
        : {
            input: '',
            summary: '',
            core_focus: '',
            schedule_markdown: '',
            tasks: [],
            updated_at: 0,
          },
      focus_reminders: payload.focus_reminders && typeof payload.focus_reminders === 'object'
        ? {
            enabled: Boolean(payload.focus_reminders.enabled),
            desktop_notifications: Boolean(payload.focus_reminders.desktop_notifications),
            interval_minutes: Number.isFinite(Number(payload.focus_reminders.interval_minutes))
              ? Math.max(10, Math.min(180, Math.round(Number(payload.focus_reminders.interval_minutes))))
              : 35,
            last_notified_at: Number.isFinite(Number(payload.focus_reminders.last_notified_at))
              ? Number(payload.focus_reminders.last_notified_at)
              : null,
          }
        : {
            enabled: false,
            desktop_notifications: false,
            interval_minutes: 35,
            last_notified_at: null,
          },
      calendar_subscription_token: typeof payload.calendar_subscription_token === 'string'
        ? payload.calendar_subscription_token
        : '',
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
        daily_state_reports: {},
      },
    ability_module: normalizeAbilityModule(null),
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

function createCalendarSubscriptionToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function ensureCalendarSubscription(username) {
  const payload = await readTasks(username);
  if (payload.calendar_subscription_token) {
    return payload;
  }
  const nextPayload = {
    ...payload,
    calendar_subscription_token: createCalendarSubscriptionToken(),
  };
  await writeTasks(username, nextPayload);
  return nextPayload;
}

function buildAbsoluteBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto']
    ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
    : req.protocol;
  const host = req.headers['x-forwarded-host']
    ? String(req.headers['x-forwarded-host']).split(',')[0].trim()
    : req.get('host');
  return `${proto}://${host}`;
}

function buildCalendarSubscriptionUrls(req, token) {
  const baseUrl = buildAbsoluteBaseUrl(req);
  const url = `${baseUrl}/api/calendar/focus.ics?token=${encodeURIComponent(token)}`;
  return {
    token,
    url,
    apple_url: url.replace(/^https?:\/\//i, 'webcal://'),
  };
}

async function findUserByCalendarSubscriptionToken(token) {
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
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
  return null;
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsUtcDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function roundToNextHalfHourDate(baseTs) {
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

function buildCalendarPlanItems(payload) {
  if (payload.ai_day_plan && Array.isArray(payload.ai_day_plan.tasks) && payload.ai_day_plan.tasks.length > 0) {
    return payload.ai_day_plan.tasks.slice(0, 8).map((task) => ({
      uid: `ai-${task.title}`,
      title: task.title || '未命名任务',
      description: task.description || payload.ai_day_plan.summary || payload.ai_day_plan.core_focus || 'Planday AI 日计划',
      minutes: Math.max(10, Math.min(180, Number(task.estimated_minutes) || 30)),
    }));
  }

  return (Array.isArray(payload.tasks) ? payload.tasks : [])
    .filter((task) => task && task.status === 'pending')
    .sort((a, b) => Number(b.x || 0) - Number(a.x || 0))
    .slice(0, 8)
    .map((task) => ({
      uid: `task-${task.id}`,
      title: task.title || '未命名任务',
      description: task.description || 'Planday 当前待办',
      minutes: Math.max(10, Math.min(180, Number(task.estimated_minutes) || 30)),
    }));
}

function buildCalendarIcsFromPayload(payload, username) {
  const dtStamp = formatIcsUtcDate(new Date());
  let cursor = roundToNextHalfHourDate(Date.now());
  const items = buildCalendarPlanItems(payload);
  const coreFocus = payload.ai_day_plan?.core_focus || items[0]?.title || '今日主线';

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
    const details = await parseErrorResponse(response);
    throw new Error(`chat completions failed: ${response.status}${details ? ` ${details}` : ''}`);
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
    const details = await parseErrorResponse(response);
    throw new Error(`generateContent failed: ${response.status}${details ? ` ${details}` : ''}`);
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
  if (shouldUseOpenAICompat()) {
    return requestRssScoutByChatCompletions(params);
  }
  return requestRssScoutByGemini(params);
}

async function fetchTrendRadarLiveSnapshot({ limit = 60, platforms: rawPlatforms = '' } = {}) {
  const allPlatforms = await loadTrendRadarPlatforms();
  const targetPlatforms = filterTrendRadarPlatforms(allPlatforms, rawPlatforms);
  if (targetPlatforms.length === 0) {
    throw new Error('没有可用的 TrendRadar 平台配置');
  }

  const settled = await Promise.allSettled(targetPlatforms.map(async (platform) => {
    const response = await fetch(`${NEWSNOW_API_BASE}?id=${encodeURIComponent(platform.id)}&latest`, {
      headers: TRENDRADAR_LIVE_HEADERS,
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
  if (items.length === 0) {
    throw new Error('TrendRadar 实时热榜为空');
  }

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
  const trendRadarRoot = resolveExternalRoot(TRENDRADAR_ROOT, 'TrendRadar', ['output']);
  if (!trendRadarRoot) {
    throw new Error('未找到可用的 TrendRadar 项目目录');
  }
  const outputRoot = path.join(trendRadarRoot, 'output');
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
    try {
      const fallback = await fetchTrendRadarLocalSnapshot(options);
      return {
        ...fallback,
        fallback_reason: liveError instanceof Error ? liveError.message : 'live fetch failed',
      };
    } catch (localError) {
      const liveMessage = liveError instanceof Error ? liveError.message : 'live fetch failed';
      const localMessage = localError instanceof Error ? localError.message : 'local fallback unavailable';
      throw new Error(`TrendRadar 实时热榜获取失败：${liveMessage}；本地快照不可用：${localMessage}`);
    }
  }
}

async function loadTechnicalRssPresets(limit = 90) {
  const bundledFeeds = TECHNICAL_RSS_SEEDS.map((feed, index) => ({
    id: `bundled-tech-seed-${index + 1}`,
    name: feed.name.trim(),
    url: feed.url.trim(),
    homepage: feed.homepage.trim(),
    category: '技术博客',
    keywords: ['技术', '博客', '内置种子库'],
    reason: '项目内置的高质量技术 RSS 种子库，可直接用于服务器部署。',
  }));

  const aiDailyDigestRoot = resolveExternalRoot(AI_DAILY_DIGEST_ROOT, 'ai-daily-digest', ['scripts', 'digest.ts']);
  if (!aiDailyDigestRoot) {
    return {
      source: 'bundled-technical-seeds',
      total: bundledFeeds.length,
      feeds: bundledFeeds.slice(0, Math.max(1, Number(limit) || 90)),
    };
  }

  const digestPath = path.join(aiDailyDigestRoot, 'scripts', 'digest.ts');
  const source = await fs.promises.readFile(digestPath, 'utf-8');
  const externalFeeds = Array.from(source.matchAll(/\{\s*name:\s*"([^"]+)"\s*,\s*xmlUrl:\s*"([^"]+)"\s*,\s*htmlUrl:\s*"([^"]+)"/g))
    .map((match, index) => ({
      id: `digest-seed-${index + 1}`,
      name: match[1].trim(),
      url: match[2].trim(),
      homepage: match[3].trim(),
      category: '技术博客',
      keywords: ['技术', '博客', 'AI Daily Digest'],
      reason: '来自 ai-daily-digest 的高质量技术 RSS 种子库。',
    }))
    .filter((feed) => feed.name && feed.url);

  const dedupedFeeds = [];
  const seenUrls = new Set();
  for (const feed of [...externalFeeds, ...bundledFeeds]) {
    const key = feed.url.toLowerCase();
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    dedupedFeeds.push(feed);
  }

  return {
    source: 'bundled-technical-seeds+ai-daily-digest',
    total: dedupedFeeds.length,
    feeds: dedupedFeeds.slice(0, Math.max(1, Number(limit) || 90)),
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

app.post('/api/ai/day-plan', requireAuth, async (req, res) => {
  try {
    const input = typeof req.body?.input === 'string' ? req.body.input.trim() : '';
    const energy = Number(req.body?.energy);
    const existingTasks = Array.isArray(req.body?.existingTasks) ? req.body.existingTasks : [];
    if (!input) {
      res.status(400).json({ error: '自然语言输入不能为空' });
      return;
    }

    const result = await requestAIDayPlan({
      input,
      energy: Number.isFinite(energy) ? energy : 60,
      existingTasks,
    });
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

app.get('/api/calendar/subscription-token', requireAuth, async (req, res) => {
  try {
    const payload = await ensureCalendarSubscription(req.authUser);
    res.status(200).json(buildCalendarSubscriptionUrls(req, payload.calendar_subscription_token));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '订阅链接获取失败' });
  }
});

app.post('/api/calendar/subscription-token/reset', requireAuth, async (req, res) => {
  try {
    const payload = await readTasks(req.authUser);
    const nextPayload = {
      ...payload,
      calendar_subscription_token: createCalendarSubscriptionToken(),
    };
    await writeTasks(req.authUser, nextPayload);
    res.status(200).json(buildCalendarSubscriptionUrls(req, nextPayload.calendar_subscription_token));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '订阅链接重置失败' });
  }
});

app.get('/api/calendar/focus.ics', async (req, res) => {
  try {
    const token = typeof req.query?.token === 'string' ? req.query.token.trim() : '';
    if (!token) {
      res.status(400).type('text/plain').send('missing token');
      return;
    }
    const matched = await findUserByCalendarSubscriptionToken(token);
    if (!matched) {
      res.status(404).type('text/plain').send('calendar subscription not found');
      return;
    }

    const ics = buildCalendarIcsFromPayload(matched.payload, matched.username);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="planday-focus.ics"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(ics);
  } catch (error) {
    res.status(500).type('text/plain').send(error instanceof Error ? error.message : 'calendar feed failed');
  }
});

app.post('/api/world-news/rss/sync', requireAuth, async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const limit = Math.max(1, Math.min(20, Number(req.body?.limit) || 8));
    if (!name || !url) {
      res.status(400).json({ error: '订阅源名称和 URL 不能为空' });
      return;
    }

    const result = await syncRssFeedPreview({ name, url, limit });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'RSS 同步失败';
    const status = message.includes('内网') || message.includes('有效')
      ? 400
      : message.includes('请求失败')
        ? 502
        : 500;
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
