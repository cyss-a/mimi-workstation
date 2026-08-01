// app.js — 入口、路由、设置
import * as api from './api.js';
import { getCloudBadge, getMode } from './api.js';
import { el, clear, toast } from './ui.js';
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
  state.user = await api.getState();
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
  const view = document.getElementById('view');
  clear(view);
  view.appendChild(el('div', { class: 'placeholder' }, '加载中…'));
  const mod = ROUTES[route] || Dashboard;
  try {
    const content = await mod.render({ state, refreshUser });
    clear(view);
    if (content) view.appendChild(content);
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
  const ghCfg = document.getElementById('githubCfg');
  const hint = document.getElementById('modeHint');
  const segBtns = modal.querySelectorAll('.seg button');

  function open() {
    const cfg = api.getConfig();
    document.getElementById('ghToken').value = cfg.github.token || '';
    document.getElementById('ghOwner').value = cfg.github.owner || '';
    document.getElementById('ghRepo').value = cfg.github.repo || '';
    document.getElementById('ghBranch').value = cfg.github.branch || 'main';
    document.getElementById('ghPath').value = cfg.github.path || 'state.json';
    segBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === cfg.mode));
    ghCfg.classList.toggle('hidden', cfg.mode !== 'github');
    hint.textContent = cfg.mode === 'github'
      ? 'GitHub 模式：所有数据存到你的 GitHub 仓库，跨设备即时同步。'
      : '本地模式：所有数据存本机后端服务（dev），切换到 GitHub 可实现联网同步。';
    modal.classList.remove('hidden');
  }
  function close() { modal.classList.add('hidden'); }

  btn.addEventListener('click', open);
  cancel.addEventListener('click', close);
  segBtns.forEach(b => b.addEventListener('click', () => {
    segBtns.forEach(x => x.classList.toggle('active', x === b));
    ghCfg.classList.toggle('hidden', b.dataset.mode !== 'github');
    hint.textContent = b.dataset.mode === 'github'
      ? 'GitHub 模式：所有数据存到你的 GitHub 仓库，跨设备即时同步。'
      : '本地模式：所有数据存本机后端服务（dev）。';
  }));
  save.addEventListener('click', async () => {
    const mode = [...segBtns].find(b => b.classList.contains('active')).dataset.mode;
    api.updateConfig({
      mode,
      github: {
        token: document.getElementById('ghToken').value.trim(),
        owner: document.getElementById('ghOwner').value.trim(),
        repo: document.getElementById('ghRepo').value.trim(),
        branch: document.getElementById('ghBranch').value.trim() || 'main',
        path: document.getElementById('ghPath').value.trim() || 'state.json',
      },
    });
    close();
    toast('设置已保存，正在重新加载数据…');
    try { await loadAll(); render(state.current); toast('已联网更新'); }
    catch (e) { toast('加载失败：' + (e.message || e)); }
  });

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
  try { await loadAll(); }
  catch (e) {
    toast('初始化失败：' + (e.message || e));
    console.error(e);
    return;
  }
  render('dashboard');
})();