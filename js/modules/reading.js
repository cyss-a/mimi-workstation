// modules/reading.js — 亲子阅读记录
import { el, toast, formatDate } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const u = state.user;
  const root = el('div');

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📚 亲子阅读'),
    el('div', { class: 'muted' }, '记录每天和孩子一起读的书'),
  ));

  const book = el('input', { class: 'input', placeholder: '书名（如《猜猜我有多爱你》）' });
  const note = el('textarea', { class: 'input', placeholder: '今天读了哪里 / 感想…', style: { minHeight: '80px' } });
  const add = el('button', { class: 'btn primary' }, '＋ 记录');
  add.addEventListener('click', async () => {
    const b = book.value.trim(); const n = note.value.trim();
    if (!b) { toast('请输入书名'); return; }
    const item = { id: 'r' + Date.now(), book: b, note: n, date: new Date().toISOString() };
    const next = await patchState('reading', { logs: [item, ...(u.reading.logs || [])] });
    state.user = next; book.value = ''; note.value = '';
    toast('已记录');
    document.querySelector('[data-route="reading"]')?.click();
  });

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '✍️ 新建阅读记录'),
    book, el('div', { style: { height: '8px' } }), note,
    el('div', { style: { marginTop: '10px' } }, add),
  ));

  // 列表
  const list = el('div', { class: 'card' });
  list.appendChild(el('h3', {}, `📖 阅读记录 (${(u.reading.logs || []).length})`));
  if (!(u.reading.logs || []).length) list.appendChild(el('div', { class: 'empty' }, '还没有记录～'));
  (u.reading.logs || []).forEach(item => {
    list.appendChild(el('div', { style: { background: '#f8fafc', padding: '10px', borderRadius: '10px', marginBottom: '8px' } },
      el('div', { class: 'row between' },
        el('div', { style: { fontWeight: 700 } }, '📕 ' + item.book),
        el('button', { class: 'btn danger small', on: { click: () => del(item.id) } }, '🗑'),
      ),
      el('div', { class: 'muted', style: { fontSize: '11px' } }, item.date),
      item.note ? el('div', { style: { marginTop: '4px' } }, item.note) : null,
    ));
  });
  root.appendChild(list);

  // 统计
  const allBooks = [...new Set((u.reading.logs || []).map(l => l.book))];
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📊 累计'),
    el('div', { class: 'muted' }, `共记录 ${u.reading.logs?.length || 0} 次，阅读 ${allBooks.length} 本不同的书`),
  ));

  root.appendChild(checkinBar(u, state));

  async function del(id) {
    const list = (u.reading.logs || []).filter(x => x.id !== id);
    const next = await patchState('reading', { logs: list });
    state.user = next;
    document.querySelector('[data-route="reading"]')?.click();
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