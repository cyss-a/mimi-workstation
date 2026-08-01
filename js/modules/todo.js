// modules/todo.js — 待办清单
import { el, toast, formatDate } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const u = state.user;
  const root = el('div');

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📝 待办清单'),
    el('div', { class: 'muted' }, '今日 + 近期事项'),
  ));

  const input = el('input', { class: 'input', placeholder: '比如：今天要读 RAZ 三遍' });
  const addBtn = el('button', { class: 'btn primary' }, '＋ 添加');
  addBtn.addEventListener('click', () => add(input.value));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(input.value); });

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'row' },
      el('div', { style: { flex: 1 } }, input),
      addBtn,
    ),
  ));

  // 列表
  const listCard = el('div', { class: 'card' });
  const items = (u.todo.items || []).slice().reverse();
  if (!items.length) {
    listCard.appendChild(el('div', { class: 'empty' }, '空空的，先加一条试试吧～'));
  }
  items.forEach(item => {
    const row = el('div', { class: 'list-item' + (item.done ? ' done' : '') },
      el('input', { type: 'checkbox', checked: item.done, on: { change: () => toggle(item.id) } }),
      el('div', { style: { flex: 1 } },
        el('div', { class: 'text' }, item.text),
        el('div', { class: 'muted', style: { fontSize: '11px' } }, item.createdAt),
      ),
      el('button', { class: 'btn danger small', on: { click: () => del(item.id) } }, '删除'),
    );
    listCard.appendChild(row);
  });

  root.appendChild(listCard);

  // 已完成折叠
  const doneCount = items.filter(x => x.done).length;
  const total = items.length;
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📊 进度'),
    el('div', { class: 'muted' }, `已完成 ${doneCount} / ${total}`),
  ));

  root.appendChild(checkinBar(u, state));

  async function add(text) {
    const t = (text || '').trim();
    if (!t) { toast('请输入内容'); return; }
    const item = { id: 't' + Date.now(), text: t, done: false, createdAt: new Date().toISOString() };
    const next = await patchState('todo', { items: [...(u.todo.items || []), item] });
    state.user = next;
    input.value = '';
    document.querySelector('[data-route="todo"]')?.click();
  }
  async function toggle(id) {
    const list = (u.todo.items || []).map(x => x.id === id ? { ...x, done: !x.done } : x);
    const next = await patchState('todo', { items: list });
    state.user = next;
    document.querySelector('[data-route="todo"]')?.click();
  }
  async function del(id) {
    const list = (u.todo.items || []).filter(x => x.id !== id);
    const next = await patchState('todo', { items: list });
    state.user = next;
    document.querySelector('[data-route="todo"]')?.click();
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