// api.js — 数据层抽象
// 支持两种后端：
//   1) local: fetch 到本地 Node 服务（dev）
//   2) github: 直接调用 GitHub Contents API（prod，全在 GitHub 云端）
// 前端不感知差异，统一方法签名。

const CONFIG_KEY = 'mimi-workstation-config';

// 部署到 GitHub Pages (github.io) 时默认走 GitHub 云端；本地开发默认走本地后端
function defaultMode() {
  try { return location.hostname.endsWith('github.io') ? 'github' : 'local'; }
  catch { return 'local'; }
}

const DEFAULT_CONFIG = {
  mode: defaultMode(),     // 'local' | 'github'
  apiBase: '/api',         // 本地后端基址
  github: {
    token: '',
    owner: 'cyss-a',
    repo: 'mimi-workstation-data',
    branch: 'main',
    path: 'state.json',
  },
};

function loadConfig() {
  try {
    const s = localStorage.getItem(CONFIG_KEY);
    if (s) return { ...DEFAULT_CONFIG, ...JSON.parse(s), github: { ...DEFAULT_CONFIG.github, ...(JSON.parse(s).github || {}) } };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// 工具：base64 编解码（兼容中文）
function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64decode(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
}

// 缓存
const seedCache = {};

async function fetchSeed(module) {
  if (seedCache[module]) return seedCache[module];
  const r = await fetch(`./data/${module}.json`);
  if (!r.ok) throw new Error(`seed ${module} fetch failed: ${r.status}`);
  const data = await r.json();
  seedCache[module] = data;
  return data;
}

async function fetchSeedAll() {
  const modules = ['pinyin', 'sudoku', 'focus', 'raz', 'exercises', 'science', 'poems'];
  const entries = await Promise.all(modules.map(async m => [m, await fetchSeed(m)]));
  return Object.fromEntries(entries);
}

// =============== local 后端 ===============
async function localGetState() {
  const r = await fetch(`${cfg.apiBase}/state`);
  if (!r.ok) throw new Error('local get state failed');
  return r.json();
}
async function localPutState(state) {
  const r = await fetch(`${cfg.apiBase}/state`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state),
  });
  if (!r.ok) throw new Error('local put state failed');
  return (await r.json()).state;
}
async function localPatchState(module, partial) {
  const r = await fetch(`${cfg.apiBase}/state/${module}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(partial),
  });
  if (!r.ok) throw new Error('local patch state failed');
  return (await r.json()).state;
}
async function localAction(module, action, body = {}) {
  const r = await fetch(`${cfg.apiBase}/state/${module}/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('local action failed');
  return (await r.json()).state;
}

// =============== GitHub 后端 ===============
function ghHeaders() {
  return {
    'Authorization': `Bearer ${cfg.github.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}
function ghUrl() {
  const { owner, repo, branch, path } = cfg.github;
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
}

async function ghGetFile() {
  const r = await fetch(ghUrl(), { headers: ghHeaders() });
  if (r.status === 404) {
    // 文件不存在 → 用 default-state 初始化
    const def = await fetchSeed('default');
    return { content: def, sha: null };
  }
  if (!r.ok) throw new Error(`github get failed: ${r.status} ${r.statusText}`);
  const j = await r.json();
  return { content: JSON.parse(b64decode(j.content)), sha: j.sha };
}

async function ghPutFile(content, sha, msg = 'mimi-workstation: update state') {
  const body = { message: msg, content: b64encode(JSON.stringify(content, null, 2)), branch: cfg.github.branch };
  if (sha) body.sha = sha;
  const r = await fetch(ghUrl(), { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`github put failed: ${r.status} ${t}`);
  }
  const j = await r.json();
  return { content: JSON.parse(b64decode(j.content)), sha: j.content.sha };
}

// GitHub 没有 PATCH / action 端点，我们用 GET + 本地合并 + PUT
async function ghPatchState(module, partial) {
  const { content, sha } = await ghGetFile();
  if (!(module in content)) throw new Error(`unknown module: ${module}`);
  content[module] = { ...content[module], ...partial };
  const next = await ghPutFile(content, sha, `mimi-workstation: patch ${module}`);
  return next.content;
}
async function ghAction(module, action, body = {}) {
  const { content, sha } = await ghGetFile();
  if (!(module in content)) throw new Error(`unknown module: ${module}`);
  const today = new Date().toISOString().slice(0, 10);
  if (module === 'checkin' && action === 'toggle') {
    const c = content.checkin;
    if (c.lastDate === today) {
      c.lastDate = null;
      c.streak = Math.max(0, c.streak - 1);
      c.totalDays = Math.max(0, c.totalDays - 1);
      c.history = c.history.filter(d => d !== today);
    } else {
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      c.streak = (c.lastDate === yest) ? c.streak + 1 : 1;
      c.totalDays += 1;
      c.lastDate = today;
      c.history = [...new Set([...c.history, today])];
    }
  } else if (module === 'pinyin' && action === 'mark-read') {
    const { groupId } = body || {};
    if (!groupId) throw new Error('missing groupId');
    const set = new Set(content.pinyin.readGroups);
    if (set.has(groupId)) set.delete(groupId); else set.add(groupId);
    content.pinyin.readGroups = Array.from(set);
    content.pinyin.lastDate = today;
  } else {
    throw new Error(`unknown action: ${module}/${action}`);
  }
  const next = await ghPutFile(content, sha, `mimi-workstation: action ${module}/${action}`);
  return next.content;
}

// =============== 对外统一 API ===============
let cfg = loadConfig();

export function getConfig() { return cfg; }
export function updateConfig(patch) {
  cfg = { ...cfg, ...patch, github: { ...cfg.github, ...(patch.github || {}) } };
  saveConfig(cfg);
  return cfg;
}
export function getMode() { return cfg.mode; }
export function getCloudBadge() {
  if (cfg.mode === 'github') {
    const { owner, repo } = cfg.github;
    return owner && repo ? `☁️ GitHub · ${owner}/${repo}` : '☁️ GitHub · 未配置';
  }
  return '💾 本地模式';
}

export async function getSeed(module) { return fetchSeed(module); }
export async function getSeedAll() { return fetchSeedAll(); }
export async function getDefaultState() { return fetchSeed('default'); }

export async function getState() {
  if (cfg.mode === 'github') {
    if (!cfg.github.token) throw new Error('NO_GITHUB_TOKEN');
    const { content } = await ghGetFile();
    return content;
  }
  return localGetState();
}
export async function saveState(state) {
  if (cfg.mode === 'github') {
    const { sha } = await ghGetFile();
    const r = await ghPutFile(state, sha);
    return r.content;
  }
  return localPutState(state);
}
export async function patchState(module, partial) {
  if (cfg.mode === 'github') return ghPatchState(module, partial);
  return localPatchState(module, partial);
}
export async function action(module, action, body) {
  if (cfg.mode === 'github') return ghAction(module, action, body);
  return localAction(module, action, body);
}