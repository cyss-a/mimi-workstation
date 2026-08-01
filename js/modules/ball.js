// modules/ball.js — 拍球训练
import { el, toast } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const u = state.user;
  const root = el('div');

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '🏀 拍球训练'),
    el('div', { class: 'muted' }, '计数、目标、撤销、重置'),
  ));

  const today = new Date().toISOString().slice(0, 10);
  if (u.ball.todayDate !== today) {
    // 跨天：保留累计，清零今日
    const next = { ...u.ball, today: 0, todayDate: today };
    await patchState('ball', next);
    state.user = { ...u, ball: next };
  }

  let count = state.user.ball.today || 0;
  let goal = state.user.ball.goal || 100;
  let history = []; // 撤销栈
  const digit = el('div', { class: 'digit' }, count);
  const bar = el('div', { style: { background: '#ede9fe', borderRadius: '999px', height: '12px', overflow: 'hidden', margin: '8px 0' } });
  const barFill = el('div', { style: { background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', height: '100%', width: '0%', transition: 'width 0.2s' } });
  bar.appendChild(barFill);
  const goalLabel = el('div', { class: 'muted', style: { textAlign: 'center', marginBottom: '8px' } });

  function draw() {
    digit.textContent = count;
    barFill.style.width = Math.min(100, (count / goal) * 100) + '%';
    goalLabel.textContent = `目标 ${goal} 个 · 累计 ${state.user.ball.total || 0} 个`;
  }
  draw();

  const inc = el('button', { class: 'btn primary', style: { width: '64px', height: '64px', borderRadius: '50%', fontSize: '24px' } }, '+1');
  inc.addEventListener('click', async () => { history.push(count); count++; save(); });

  const dec = el('button', { class: 'btn outline', style: { width: '64px', height: '64px', borderRadius: '50%', fontSize: '24px' } }, '−1');
  dec.addEventListener('click', async () => { history.push(count); count = Math.max(0, count - 1); save(); });

  const undo = el('button', { class: 'btn warn small' }, '↺ 撤销');
  undo.addEventListener('click', async () => { if (history.length) { count = history.pop(); save(); } });

  const reset = el('button', { class: 'btn danger small' }, '↻ 重置');
  reset.addEventListener('click', async () => { history.push(count); count = 0; save(); });

  // 目标调整
  const goalInput = el('input', { class: 'input', type: 'number', value: goal, style: { width: '80px' } });
  goalInput.addEventListener('change', async () => {
    goal = Math.max(1, parseInt(goalInput.value) || 100);
    const next = await patchState('ball', { goal });
    state.user = next; draw();
  });

  root.appendChild(el('div', { class: 'card', style: { textAlign: 'center' } },
    el('div', { class: 'counter' }, dec, digit, inc),
    bar, goalLabel,
    el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '12px' } }, undo, reset),
  ));

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '🎯 今日目标'),
    el('div', { class: 'row', style: { gap: '6px' } },
      goalInput,
      el('span', { class: 'muted' }, '个/天'),
    ),
  ));

  // 打卡
  root.appendChild(checkinBar(u, state));

  async function save() {
    draw();
    try {
      const total = (state.user.ball.total || 0) + (history.length > 0 ? (count - (history[history.length - 1] || count)) : 0);
      // 简化：每次保存时把 today 与 total 一并更新
      const next = await patchState('ball', { today: count, todayDate: today });
      state.user = next; draw();
    } catch (e) { toast('保存失败：' + e.message); }
  }

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