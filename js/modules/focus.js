// modules/focus.js — 舒尔特方格 5x5
import { el, toast, formatDate } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const seed = state.seeds.focus;
  const u = state.user;
  const root = el('div');
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, seed.title),
    el('div', { class: 'muted' }, seed.subtitle),
  ));

  let grid = [];
  let expected = 1;
  let wrongCell = null;
  let timer = null;
  let elapsed = 0;
  let running = false;
  let done = false;

  const statsLine = el('div', { class: 'muted' });
  const gridNode = el('div', { class: 'schulte' });

  function newGrid() {
    const arr = Array.from({ length: seed.gridSize * seed.gridSize }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    grid = [];
    for (let r = 0; r < seed.gridSize; r++) {
      const row = [];
      for (let c = 0; c < seed.gridSize; c++) row.push(arr[r * seed.gridSize + c]);
      grid.push(row);
    }
    expected = 1; wrongCell = null; elapsed = 0; running = false; done = false;
    stopTimer(); draw(); status('点「开始本组」');
  }

  function start() {
    running = true;
    if (timer) clearInterval(timer);
    timer = setInterval(() => { elapsed++; draw(); }, 1000);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function status(msg) { statsLine.textContent = msg; }

  function draw() {
    clear(gridNode);
    grid.forEach((row, r) => row.forEach((v, c) => {
      const cls = ['schulte-cell'];
      if (v < expected) cls.push('done');
      if (wrongCell && wrongCell[0] === r && wrongCell[1] === c) cls.push('wrong');
      const cell = el('div', { class: cls.join(' ') }, v);
      cell.addEventListener('click', () => tap(r, c));
      gridNode.appendChild(cell);
    }));
    statsLine.textContent = `第 ${Math.min(expected, seed.gridSize * seed.gridSize)} / ${seed.gridSize * seed.gridSize} 个 · ${elapsed.toFixed(1)}s · 已完成 ${done ? 1 : 0}/${seed.rounds}`;
  }

  function tap(r, c) {
    if (done || !running) { toast('请先点「开始本组」'); return; }
    const v = grid[r][c];
    if (v === expected) {
      expected++;
      wrongCell = null;
      if (expected > seed.gridSize * seed.gridSize) {
        done = true; running = false; stopTimer();
        const sec = elapsed;
        const best = Math.min(u.focus.bestSeconds || 9999, sec);
        patchState('focus', { bestSeconds: best, history: [...((u.focus.history || []).slice(-49)), { date: new Date().toISOString(), seconds: sec }] }).then(() => { refreshUser(); toast(`🎉 完成！用时 ${sec} 秒`); });
      }
    } else {
      wrongCell = [r, c];
      setTimeout(() => { wrongCell = null; draw(); }, 350);
    }
    draw();
  }

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'row between' },
      statsLine,
      el('button', { class: 'btn primary small', on: { click: () => running ? toast('本组进行中…') : start() } }, '▶ 开始本组'),
    ),
    gridNode,
  ));

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'row between' },
      el('div', {},
        el('h3', {}, '📈 历史记录'),
        el('div', { class: 'muted' }, `最佳 ${u.focus.bestSeconds || '—'} 秒`),
      ),
      el('button', { class: 'btn outline small', on: { click: newGrid } }, '🔄 换一组'),
    ),
    el('div', { style: { marginTop: '8px' } },
      ...(((u.focus.history || []).slice(-8)).map(h =>
        el('div', { class: 'tag green', style: { marginRight: '4px' } }, `${formatDate(h.date)} ${h.seconds}秒`),
      )),
    ),
  ));

  root.appendChild(checkinBar(u, state));

  newGrid();
  return root;
}

function checkinBar(u, state) {
  const today = new Date().toISOString().slice(0, 10);
  const done = u.checkin.lastDate === today;
  const btn = el('button', { class: 'btn ' + (done ? 'success' : 'primary') }, done ? '✓ 今日已打卡' : '🌟 今日打卡');
  btn.addEventListener('click', async () => {
    try {
      const next = await (await import('../api.js')).action('checkin', 'toggle');
      state.user = next;
      toast(done ? '已取消今日打卡' : '打卡成功 ✨');
    } catch (e) { toast('打卡失败：' + e.message); }
  });
  return el('div', { class: 'card' },
    el('div', { class: 'row between' },
      el('div', {},
        el('h3', {}, '🌟 每日打卡'),
        el('div', { class: 'muted' }, `连续 ${u.checkin.streak} 天`),
      ),
      btn,
    ),
  );
}

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }