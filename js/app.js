// app.js — 入口、路由、设置
import * as api from './api.js';
import { getCloudBadge, getMode } from './api.js';
import { el, clear, toast } from './ui.js';
import { dateLabel } from './lunar.js';
import { mountSidebarAnimals } from './animals.js';
import { helpBubble } from './help.js';
import * as Dashboard from './modules/dashboard.js';
import * as Pinyin from './modules/pinyin.js';
import * as Sudoku from './modules/sudoku.js';
import * as Focus from './modules/focus.js';
import * as Raz from './modules/raz.js';
import * as Ball from './modules/ball.js';
import * as Vestibular from './modules/vestibular.js';
import * as Science from './modules/science.js';
import * as Recite from './modules/recite.js';
import * as Checkin from './modules/checkin.js';
import * as Todo from './modules/todo.js';
import * as Reading from './modules/reading.js';

const ROUTES = {
  dashboard: Dashboard,
  pinyin: Pinyin,
  sudoku: Sudoku,
  focus: Focus,
  raz: Raz,
  ball: Ball,
  vestibular: Vestibular,
  science: Science,
  recite: Recite,
  checkin: Checkin,
  todo: Todo,
  reading: Reading,
};

const state = {
  seeds: {},
  user: null,
  current: 'dashboard',
};

async function loadAll() {
  state.seeds = await api.getSeedAll();
  try {
    state.user = await api.getState();
  } catch (e) {
    // 云端读取失败：回退到本地默认数据，保证页面可用
    console.warn('[loadAll] getState 失败，回退默认数据：', e);
    try { state.user = await api.getDefaultState(); }
    catch (e2) { console.error('[loadAll] 默认数据也加载失败：', e2); state.user = {}; }
    updateCloudBadge();
    toast('⚠️ 云端读取失败，已显示本地默认数据。请到设置检查 Token / 仓库权限。');
    return;
  }
  updateCloudBadge();
}

function updateCloudBadge() {
  const n = document.getElementById('cloudState');
  if (n) n.textContent = getCloudBadge();
}

async function refreshUser() {
  state.user = await api.getState();
}

function highlightNav(route) {
  document.querySelectorAll('.nav-list li').forEach(li => {
    li.classList.toggle('active', li.dataset.route === route);
  });
}

async function render(route) {
  state.current = route;
  highlightNav(route);
  if (!state.user) { renderOnboarding(); return; } // 数据安全网：绝不让空 user 进入模块渲染
  const view = document.getElementById('view');
  clear(view);
  view.appendChild(el('div', { class: 'placeholder' }, '加载中…'));
  const mod = ROUTES[route] || Dashboard;
  try {
    const content = await mod.render({ state, refreshUser });
    clear(view);
    if (content) view.appendChild(content);
    // 功能说明小问号圈（首页除外）：挂在模块首个标题旁
    if (route !== 'dashboard') {
      const h = view.querySelector('h3');
      if (h) h.appendChild(helpBubble(route));
    }
  } catch (e) {
    clear(view);
    view.appendChild(el('div', { class: 'card' },
      el('h3', {}, '⚠️ 加载失败'),
      el('div', { class: 'muted' }, e.message || String(e)),
      el('div', { class: 'row', style: { marginTop: '8px' } },
        el('button', { class: 'btn outline small', on: { click: () => render(route) } }, '重试'),
      ),
    ));
    console.error(e);
  }
}

function setupNav() {
  document.querySelectorAll('.nav-list li').forEach(li => {
    li.addEventListener('click', () => render(li.dataset.route));
  });
}

function setupSettings() {
  const modal = document.getElementById('settingsModal');
  const btn = document.getElementById('settingsBtn');
  const cancel = document.getElementById('settingsCancel');
  const save = document.getElementById('settingsSave');
  const hint = document.getElementById('modeHint');
  const segBtns = modal.querySelectorAll('.seg button');

  function open() {
    const cfg = api.getConfig();
    segBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === cfg.mode));
    hint.textContent = cfg.mode === 'supabase'
      ? 'Supabase 模式：开箱即用、无需任何账号配置，数据自动同步到云端，手机/电脑随时续上。'
      : '本地模式：数据存在本机浏览器（localStorage），开箱即用、无需任何配置，刷新不丢。';
    modal.classList.remove('hidden');
  }
  function close() { modal.classList.add('hidden'); }

  btn.addEventListener('click', open);
  cancel.addEventListener('click', close);
  segBtns.forEach(b => b.addEventListener('click', () => {
    segBtns.forEach(x => x.classList.toggle('active', x === b));
    hint.textContent = b.dataset.mode === 'supabase'
      ? 'Supabase 模式：开箱即用、无需任何账号配置，数据自动同步到云端，手机/电脑随时续上。'
      : '本地模式：数据存在本机浏览器（localStorage），开箱即用、无需任何配置，刷新不丢。';
  }));
  save.addEventListener('click', async () => {
    const mode = [...segBtns].find(b => b.classList.contains('active')).dataset.mode;
    api.updateConfig({ mode });
    close();
    toast('设置已保存，正在重新加载数据…');
    try {
      await loadAll();
      render(state.current);
      toast('已更新');
    } catch (e) {
      toast('加载失败：' + (e.message || e));
      return; // 加载失败时不渲染，避免空数据崩溃
    }
  });

  // 数据备份（无需账号）：导出 / 导入 文件
  const modalCard = modal.querySelector('.modal-card');
  const fileInput = el('input', { type: 'file', accept: 'application/json', style: { display: 'none' }, on: { change: importData } });
  const backupBlock = el('div', { class: 'settings-block' },
    el('label', {}, '📦 数据备份（无需账号）'),
    el('div', { class: 'row' },
      el('button', { class: 'btn outline small', on: { click: exportData } }, '📤 导出文件'),
      el('button', { class: 'btn outline small', on: { click: () => fileInput.click() } }, '📥 导入恢复'),
    ),
    el('p', { class: 'hint' }, '数据默认存在本机浏览器。点「导出」下载备份；换设备或清缓存后点「导入」选回文件即可恢复，全程不用注册任何账号。'),
  );
  modalCard.insertBefore(backupBlock, modalCard.querySelector('.modal-actions'));
  modalCard.appendChild(fileInput);

  async function exportData() {
    try {
      const s = await api.getFullState();
      const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'mimi-workstation-backup.json';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast('已导出备份文件 ✅');
    } catch (e) { toast('导出失败：' + (e.message || e)); }
  }
  async function importData(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      await api.setFullState(obj);
      toast('导入成功，正在刷新…');
      await loadAll();
      render(state.current);
    } catch (err) { toast('导入失败：' + (err.message || err)); }
    e.target.value = '';
  }

  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

function setupSidebar() {
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

(async function main() {
  setupNav();
  setupSettings();
  setupSidebar();
  mountSidebarAnimals();
  try { await loadAll(); }
  catch (e) {
    toast('初始化失败：' + (e.message || e));
    console.error(e);
    return;
  }
  const topDate = document.getElementById('topDate');
  if (topDate) topDate.textContent = dateLabel();
  render('dashboard');
})();

function renderOnboarding() {
  const view = document.getElementById('view');
  clear(view);
  view.appendChild(el('div', { class: 'card' },
    el('h3', {}, '👋 欢迎使用 小朋友 的成长日志'),
    el('div', { class: 'muted' }, '数据已默认自动保存到云端（Supabase），开箱即用、无需任何配置。也可以到设置里切换为「本地」模式。'),
    el('button', { class: 'btn primary', on: { click: () => document.getElementById('settingsBtn').click() } }, '⚙ 查看设置'),
  ));
}