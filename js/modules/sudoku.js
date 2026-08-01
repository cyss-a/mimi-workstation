// modules/sudoku.js — 4x4 / 8x8 数独
import { el, toast, formatDate } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const seed = state.seeds.sudoku;
  const u = state.user;
  const root = el('div');

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, seed.title),
    el('div', { class: 'muted' }, seed.subtitle),
  ));

  let level = seed.levels[0];
  let puzzle = null;
  let startTime = 0;
  let selected = null;
  let finished = false;

  // 拉丁方（4x4 / 8x8）
  function latinSquare(n) {
    const base = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r + c) % n + 1));
    // 洗牌一下行与列，避免每次都相同
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    shuffle(base); // 行洗后仍是拉丁方
    return base;
  }

  function generatePuzzle(lvl) {
    const n = lvl.size;
    const sol = latinSquare(n);
    const positions = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) positions.push([r, c]);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const holes = n * n - lvl.givens;
    const cur = sol.map(row => [...row]);
    for (let i = 0; i < holes; i++) {
      const [r, c] = positions[i];
      cur[r][c] = null;
    }
    return { solution: sol, givens: cur.map(r => [...r]), current: cur.map(r => [...r]) };
  }

  function startNew() {
    puzzle = generatePuzzle(level);
    startTime = Date.now();
    selected = null;
    finished = false;
    draw();
  }

  function check() {
    const n = level.size;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (puzzle.current[r][c] !== puzzle.solution[r][c]) return false;
    }
    return true;
  }

  function isComplete() {
    const n = level.size;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (puzzle.current[r][c] == null) return false;
    return true;
  }

  const gridCard = el('div', { class: 'card' });
  const grid = el('div', { class: 'sudoku-grid', style: { gridTemplateColumns: `repeat(${level.size}, 1fr)` } });
  const keypadCard = el('div', { class: 'card' });
  const keypad = el('div', { class: 'sudoku-keypad', style: { gridTemplateColumns: `repeat(${level.size + 1}, 1fr)` } });
  const status = el('div', { class: 'muted', style: { marginBottom: '6px', fontSize: '12px' } });

  function draw() {
    clear(grid); clear(keypad);
    if (!puzzle) return;
    const n = level.size;
    grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    keypad.style.gridTemplateColumns = `repeat(${n + 1}, 1fr)`;
    grid.dataset.size = n;
    keypad.dataset.size = n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const v = puzzle.current[r][c];
      const isGiven = puzzle.givens[r][c] != null;
      const isSel = selected && selected[0] === r && selected[1] === c;
      const cell = el('div', {
        class: 'sudoku-cell' + (isGiven ? ' given' : '') + (isSel ? ' sel' : ''),
      }, v == null ? '' : v);
      if (!isGiven && !finished) {
        cell.addEventListener('click', () => { selected = [r, c]; draw(); });
      }
      grid.appendChild(cell);
    }
    if (selected && !puzzle.givens[selected[0]][selected[1]]) {
      for (let n2 = 1; n2 <= n; n2++) {
        const k = el('div', { class: 'sudoku-key' }, String(n2));
        k.addEventListener('click', () => {
          const [r, c] = selected;
          puzzle.current[r][c] = n2;
          if (isComplete()) {
            if (check()) {
              finished = true;
              const sec = Math.round((Date.now() - startTime) / 1000);
              const best = Math.min(u.sudoku.bestSeconds || 9999, sec);
              patchState('sudoku', { completed: (u.sudoku.completed || 0) + 1, bestSeconds: best, history: [...((u.sudoku.history||[]).slice(-49)), { date: new Date().toISOString(), seconds: sec, level: level.id }] }).then(() => { refreshUser(); toast(`🎉 完成！用时 ${sec} 秒`); });
              draw();
            } else { toast('还有格子不对哦'); }
          }
          draw();
        });
        keypad.appendChild(k);
      }
      const clr = el('div', { class: 'sudoku-key' }, '✕');
      clr.addEventListener('click', () => { puzzle.current[selected[0]][selected[1]] = null; draw(); });
      keypad.appendChild(clr);
    }
    status.textContent = finished ? '🎉 已完成！再来一局？' : `选空格 → 点数字键（${level.label}）`;
  }

  root.appendChild(gridCard);
  gridCard.appendChild(el('div', { class: 'row between' },
    el('div', {}, el('h3', {}, '📐 数独格'), status),
    el('button', { class: 'btn outline small', on: { click: startNew } }, '🔄 重来'),
  ));
  gridCard.appendChild(grid);

  root.appendChild(keypadCard);
  keypadCard.appendChild(el('h3', {}, '🎹 数字键'));
  keypadCard.appendChild(keypad);

  // 关卡 + 统计
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '🎯 选择关卡'),
    el('div', { class: 'row wrap' },
      ...seed.levels.map(lv => {
        const b = el('button', { class: 'btn ' + (lv.id === level.id ? 'primary' : 'outline') + ' small' }, lv.label);
        b.addEventListener('click', () => { level = lv; startNew(); });
        return b;
      }),
    ),
    el('div', { class: 'muted', style: { marginTop: '8px' } },
      `已完成 ${u.sudoku.completed || 0} 次 · 最佳 ${u.sudoku.bestSeconds || '—'} 秒`,
    ),
    el('div', { style: { marginTop: '8px' } },
      ...(((u.sudoku.history || []).slice(-5)).map(h =>
        el('div', { class: 'tag green', style: { marginRight: '4px' } }, `${formatDate(h.date)} ${h.seconds}秒`),
      )),
    ),
  ));

  // 打卡按钮
  root.appendChild(checkinBar(u, state));

  startNew();
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
