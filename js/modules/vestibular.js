// modules/vestibular.js — 前庭组织运动
import { el, toast } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const seed = state.seeds.exercises;
  const u = state.user;
  const today = new Date().toISOString().slice(0, 10);

  if (!u.vestibular.byDate) u.vestibular.byDate = {};
  if (!u.vestibular.byDate[today]) u.vestibular.byDate[today] = [];
  const todayDone = new Set(u.vestibular.byDate[today]);

  const root = el('div');

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, seed.title),
    el('div', { class: 'muted' }, seed.subtitle),
    el('div', { class: 'row', style: { marginTop: '4px' } },
      el('span', { class: 'tag pink' }, `${todayDone.size}/${seed.totalTarget} 跳已完成`),
    ),
  ));

  const list = el('div', { class: 'card' });
  list.appendChild(el('h3', {}, '🤸 动作清单'));
  seed.items.forEach(item => {
    const done = todayDone.has(item.id);
    const card = el('div', { style: { background: done ? '#d1fae5' : '#f8fafc', padding: '10px', borderRadius: '12px', marginBottom: '8px', border: '1px solid ' + (done ? '#a7f3d0' : '#e5e7eb') } },
      el('div', { class: 'row between' },
        el('div', { style: { fontWeight: 700 } }, item.name),
        el('span', { class: 'tag' }, `⏱ ${item.duration}`),
      ),
      el('div', { class: 'muted', style: { fontSize: '12px', margin: '6px 0' } }, item.tip),
      el('div', { class: 'row', style: { gap: '6px' } },
        el('button', { class: 'btn ' + (done ? 'success' : 'outline') + ' small', on: { click: () => toggle(item.id) } }, done ? '✓ 已完成' : '标记完成'),
        el('button', { class: 'btn ghost small', on: { click: () => startTimer(item) } }, '⏱ 计时'),
      ),
    );
    list.appendChild(card);
  });

  root.appendChild(list);

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📅 全部打卡'),
    el('div', { class: 'muted' },
      Object.entries(u.vestibular.byDate).slice(-7).map(([d, ids]) => `${d}: ${ids.length}/${seed.totalTarget}`).join(' · ') || '还没有记录'
    ),
  ));

  root.appendChild(checkinBar(u, state));

  async function toggle(itemId) {
    const set = new Set(u.vestibular.byDate[today] || []);
    if (set.has(itemId)) set.delete(itemId); else set.add(itemId);
    const byDate = { ...u.vestibular.byDate, [today]: Array.from(set) };
    try {
      const next = await patchState('vestibular', { byDate });
      state.user = next;
      toast(set.has(itemId) ? '已完成 ✓' : '已取消');
      document.querySelector('[data-route="vestibular"]')?.click();
    } catch (e) { toast('保存失败：' + e.message); }
  }

  function startTimer(item) {
    let sec = parseInt(item.duration) * 60 || 60;
    toast(`⏱ ${item.name} ${sec} 秒开始`);
    const id = setInterval(() => {
      sec--;
      if (sec <= 0) {
        clearInterval(id);
        toast(`🎉 ${item.name} 完成！`);
        if (!todayDone.has(item.id)) toggle(item.id);
      }
    }, 1000);
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