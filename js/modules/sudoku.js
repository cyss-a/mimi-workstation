// modules/sudoku.js — 4x4 数独
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
  let puzzle = null;       // {solution, givens: [[n|null]*4], current: [[n|null]*4]}
  let startTime = 0;
  let selected = null;     // [r, c]
  let finished = false;

  function generatePuzzle(lvl) {
    // 生成一个合法 4x4 数独（Latin square 变体），挖洞得到题目
    const sol = latinSquare4();
    // 随机挖洞，保留 lvl.givens 个格子
    const positions = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) positions.push([r, c]);
    positions.sort(() => Math.random() - 0.5);
    const holes = 16 - lvl.givens;
    const cur = sol.map(row => [...row]);
    for (let i = 0; i < holes; i++) {
      const [r, c] = positions[i];
      cur[r][c] = null;
    }
    return { solution: sol, givens: cur, current: cur.map(r => [...r]) };
  }

  function latinSquare4() {
    // 一个 4x4 的拉丁方（满足每行/每列 1-4 各一次，对角线分块也满足）
    const base = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]];
    return base;
  }

  function startNew() {
    puzzle = generatePuzzle(level);
    startTime = Date.now();
    selected = null;
    finished = false;
    draw();
  }

  function check() {
    let ok = true;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (puzzle.current[r][c] !== puzzle.solution[r][c]) { ok = false; break; }
    }
    return ok;
  }

  function isComplete() {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (puzzle.current[r][c] == null) return false;
    return true;
  }

  const gridCard = el('div', { class: 'card' });
  const grid = el('div', { class: 'sudoku-grid' });
  const keypadCard = el('div', { class: 'card' });
  const keypad = el('div', { class: 'sudoku-keypad' });
  const status = el('div', { class: 'muted', style: { marginBottom: '8px' } });

  function draw() {
    clear(grid); clear(keypad);
    if (!puzzle) return;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
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
      for (let n = 1; n <= 4; n++) {
        const k = el('div', { class: 'sudoku-key' }, String(n));
        k.addEventListener('click', () => {
          const [r, c] = selected;
          puzzle.current[r][c] = n;
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
    status.textContent = finished ? '🎉 已完成！再来一局？' : `选择空格，再点数字键填入（${level.label}）`;
  }

  root.appendChild(gridCard);
  gridCard.appendChild(el('div', { class: 'row between' },
    el('div', {}, el('h3', {}, '📐 数独格'), status),
    el('button', { class: 'btn outline small', on: { click: startNew } }, '🔄 重新开始'),
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