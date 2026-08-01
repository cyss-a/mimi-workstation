// api.js — 数据层抽象
// 支持两种后端：
//   1) supabase：复用既有 Supabase 项目（前端仅持公开 publishable key），跨设备同步、零配置 ★默认★
//   2) local：浏览器 localStorage（兜底，断网/云端异常时自动使用）
// 前端不感知差异，统一方法签名。云端路径失败都会静默回退到 localStorage，保证可用。

const CONFIG_KEY = 'mimi-workstation-config';
const LS_STATE_KEY = 'mimi-workstation-state-v1';

// 复用既有 Supabase 项目（与 workstation 同一套凭据，前端用公开的 publishable key）
const SUPABASE = {
  url: 'https://oadpbarstkwvlwtckcnf.supabase.co',
  key: 'sb_publishable_PWNP-WITtEgfHHxh3_MbPg_s10k8QQK',
  table: 'app_data',
  owner: 'mimi-workstation-v1', // 与本工程其它数据行的 owner_hash 区分开
};

// 默认后端：Supabase（零配置，开箱即用、跨设备同步）
function defaultMode() { return 'supabase'; }

const DEFAULT_CONFIG = {
  mode: defaultMode(),
  apiBase: '/api',
  supabase: SUPABASE,
};

function loadConfig() {
  try {
    const s = localStorage.getItem(CONFIG_KEY);
    if (s) return { ...DEFAULT_CONFIG, ...JSON.parse(s) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}
function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// base64 编解码（兼容中文）
function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64decode(str) { return decodeURIComponent(escape(atob(str.replace(/\n/g, '')))); }

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

// =============== localStorage 后端（兜底） ===============
function lsReadFull() {
  try { const s = localStorage.getItem(LS_STATE_KEY); if (s) return JSON.parse(s); } catch {}
  return null;
}
function lsWriteFull(state) {
  try { localStorage.setItem(LS_STATE_KEY, JSON.stringify(state)); }
  catch (e) { console.error('[lsWriteFull] 写入本地存储失败：', e); throw e; }
}
async function lsGetState() { return lsReadFull() || await getDefaultState(); }
async function lsSaveState(state) { lsWriteFull(state); return state; }
async function lsPatchState(module, partial) {
  const full = lsReadFull() || await getDefaultState();
  full[module] = { ...(full[module] || {}), ...partial };
  lsWriteFull(full);
  return full;
}
async function lsAction(module, action, body = {}) {
  const full = lsReadFull() || await getDefaultState();
  applyAction(full, module, action, body);
  lsWriteFull(full);
  return full;
}

// =============== Supabase 后端（默认） ===============
async function sbGet() {
  const r = await fetch(`${SUPABASE.url}/rest/v1/${SUPABASE.table}?owner_hash=eq.${encodeURIComponent(SUPABASE.owner)}&select=payload,updated_at`, {
    headers: { apikey: SUPABASE.key, Authorization: `Bearer ${SUPABASE.key}` },
  });
  if (!r.ok) throw new Error('supabase get ' + r.status);
  const arr = await r.json();
  if (!arr.length) return null;
  return JSON.parse(b64decode(arr[0].payload));
}
async function sbUpsert(state) {
  const payload = b64encode(JSON.stringify(state));
  const r = await fetch(`${SUPABASE.url}/rest/v1/${SUPABASE.table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE.key,
      Authorization: `Bearer ${SUPABASE.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([{ owner_hash: SUPABASE.owner, payload }]),
  });
  if (!r.ok) throw new Error('supabase upsert ' + r.status);
  return state;
}
async function sbReadFull() { return (await sbGet()) || await getDefaultState(); }
// 写入时先读最新再合并，避免用本地默认值覆盖云端已有数据
async function sbPatchState(module, partial) {
  const full = await sbReadFull();
  full[module] = { ...(full[module] || {}), ...partial };
  await sbUpsert(full);
  return full;
}
async function sbAction(module, action, body = {}) {
  const full = await sbReadFull();
  applyAction(full, module, action, body);
  await sbUpsert(full);
  return full;
}

// 通用 checkin / pinyin 动作逻辑（各后端共用）
function applyAction(full, module, action, body) {
  const today = new Date().toISOString().slice(0, 10);
  if (module === 'checkin' && action === 'toggle') {
    const c = full.checkin || (full.checkin = {});
    c.history = c.history || [];
    if (c.lastDate === today) {
      c.lastDate = null;
      c.streak = Math.max(0, (c.streak || 0) - 1);
      c.totalDays = Math.max(0, (c.totalDays || 0) - 1);
      c.history = c.history.filter(d => d !== today);
    } else {
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      c.streak = (c.lastDate === yest) ? (c.streak || 0) + 1 : 1;
      c.totalDays = (c.totalDays || 0) + 1;
      c.lastDate = today;
      c.history = [...new Set([...c.history, today])];
    }
    // 限长保护：打卡历史最多保留最近 500 天，避免无限增长
    if (c.history.length > 500) c.history = c.history.slice(-500);
  } else if (module === 'pinyin' && action === 'mark-read') {
    const { groupId } = body || {};
    if (!groupId) throw new Error('missing groupId');
    const p = full.pinyin || (full.pinyin = {});
    const set = new Set(p.readGroups || []);
    if (set.has(groupId)) set.delete(groupId); else set.add(groupId);
    p.readGroups = Array.from(set);
    p.lastDate = today;
  } else {
    throw new Error(`unknown action: ${module}/${action}`);
  }
  return full;
}

// =============== 对外统一 API ===============
let cfg = loadConfig();

export function getConfig() { return cfg; }
export function updateConfig(patch) {
  cfg = { ...cfg, ...patch };
  saveConfig(cfg);
  return cfg;
}
export function getMode() { return cfg.mode; }
export function isCloudConfigured() {
  return cfg.mode === 'supabase';
}
export function getCloudBadge() {
  if (cfg.mode === 'supabase') return '☁️ Supabase · 已同步';
  return '💾 本地模式';
}

export async function getSeed(module) { return fetchSeed(module); }
export async function getSeedAll() { return fetchSeedAll(); }
export async function getDefaultState() { return fetchSeed('default-state'); }

// 读取：优先云端，失败回退本地
export async function getState() {
  if (cfg.mode === 'supabase') {
    try { const s = await sbGet(); if (s) return s; }
    catch (e) { console.warn('[getState] Supabase 读取失败，回退本地：', e); }
  }
  return lsGetState() || await getDefaultState();
}
export async function saveState(state) {
  if (cfg.mode === 'supabase') {
    try { return await sbUpsert(state); } catch (e) { console.warn('[saveState] Supabase 失败，回退本地：', e); }
  }
  return lsSaveState(state);
}
export async function patchState(module, partial) {
  if (cfg.mode === 'supabase') {
    try { return await sbPatchState(module, partial); }
    catch (e) { console.warn('[patchState] Supabase 失败，回退本地：', e); }
  }
  return lsPatchState(module, partial);
}
export async function action(module, action, body) {
  if (cfg.mode === 'supabase') {
    try { return await sbAction(module, action, body); }
    catch (e) { console.warn('[action] Supabase 失败，回退本地：', e); }
  }
  return lsAction(module, action, body);
}

// 导出 / 导入：返回或写入整份 state（无需任何账号）
export async function getFullState() {
  if (cfg.mode === 'supabase') {
    try { const s = await sbGet(); if (s) return s; } catch (e) { console.warn('[getFullState] Supabase 失败，回退本地：', e); }
  }
  return lsReadFull() || await getDefaultState();
}
export async function setFullState(state) {
  if (cfg.mode === 'supabase') {
    try { return await sbUpsert(state); } catch (e) { console.warn('[setFullState] Supabase 失败，回退本地：', e); }
  }
  lsWriteFull(state);
  return state;
}
