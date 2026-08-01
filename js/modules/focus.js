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
  let paused = false;
  let done = false;

  const statsLine = el('div', { class: 'muted' });
  const gridNode = el('div', { class: 'schulte' });
  const actionBtn = el('button', { class: 'btn primary small' }, '▶ 开始本组');

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
    expected = 1; wrongCell = null; elapsed = 0; running = false; paused = false; done = false;
    stopTimer(); draw(); setActionLabel('idle');
  }

  function start() {
    if (done) return;
    paused = false;
    running = true;
    if (timer) clearInterval(timer);
    timer = setInterval(() => { elapsed++; draw(); }, 1000);
    setActionLabel('running');
  }
  function pause() {
    if (done || !running) return;
    paused = true;
    running = false;
    stopTimer();
    setActionLabel('paused');
    draw();
  }
  function resume() {
    if (paused) start();
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function setActionLabel(state) {
    if (state === 'running') actionBtn.textContent = '⏸ 暂停';
    else if (state === 'paused') actionBtn.textContent = '▶ 继续';
    else actionBtn.textContent = '▶ 开始本组';
  }

  actionBtn.addEventListener('click', () => {
    if (done) { newGrid(); return; }
    if (!running && !paused) start();
    else if (running) pause();
    else if (paused) resume();
  });

  function draw() {
    clear(gridNode);
    grid.forEach((row, r) => row.forEach((v, c) => {
      const cls = ['schulte-cell'];
      if (v < expected) cls.push('done');
      if (wrongCell && wrongCell[0] === r && wrongCell[1] === c) cls.push('wrong');
      if (paused) cls.push('paused');
      const cell = el('div', { class: cls.join(' ') }, v);
      cell.addEventListener('click', () => tap(r, c));
      gridNode.appendChild(cell);
    }));
    const tip = done ? '已完成' : (paused ? '已暂停' : (running ? '进行中' : '待开始'));
    statsLine.textContent = `第 ${Math.min(expected, seed.gridSize * seed.gridSize)} / ${seed.gridSize * seed.gridSize} 个 · ${elapsed.toFixed(1)}s · 已完成 ${u.focus.completed || 0}/${seed.rounds}（${tip}）`;
  }

  function tap(r, c) {
    if (done) return;
    if (!running) { toast(paused ? '已暂停，点「继续」' : '请先点「开始本组」'); return; }
    const v = grid[r][c];
    if (v === expected) {
      expected++;
      wrongCell = null;
      if (expected > seed.gridSize * seed.gridSize) {
        done = true; running = false; paused = false; stopTimer();
        const sec = elapsed;
        const best = Math.min(u.focus.bestSeconds || 9999, sec);
        const completed = (u.focus.completed || 0) + 1;
        patchState('focus', { bestSeconds: best, completed, history: [...((u.focus.history || []).slice(-49)), { date: new Date().toISOString(), seconds: sec }] }).then(() => { refreshUser(); toast(`🎉 完成！用时 ${sec} 秒`); });
        setActionLabel('idle');
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
      actionBtn,
    ),
    gridNode,
    el('div', { class: 'muted', style: { fontSize: '11px', marginTop: '6px' } }, '玩法：按 1→25 顺序依次点数字，点错会闪红提示。完成一组可点「换一组」继续。'),
  ));

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'row between' },
      el('div', {},
        el('h3', {}, '📈 历史记录'),
        el('div', { class: 'muted' }, `最佳 ${u.focus.bestSeconds || '—'} 秒 · 累计 ${u.focus.completed || 0} 次`),
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
