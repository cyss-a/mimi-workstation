// modules/science.js — 科普专区
import { el, speak, toast } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const seed = state.seeds.science;
  const u = state.user;
  const root = el('div');

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, seed.title),
    el('div', { class: 'muted' }, seed.subtitle),
  ));

  // 决定今天该显示哪一条
  const today = new Date().toISOString().slice(0, 10);
  let idx = u.science.lastIndex ?? ((u.science.viewed?.length || 0) % seed.items.length);

  const card = el('div', { class: 'card', style: { background: 'linear-gradient(135deg, #fdf2f8, #ede9fe)' } });
  const item = seed.items[idx];

  const head = el('div', { class: 'row between' });
  head.appendChild(el('div', {}, el('h3', {}, item.title), el('div', { class: 'muted' }, `${idx + 1} / ${seed.items.length}`)));
  head.appendChild(el('button', { class: 'btn outline small', on: { click: next } }, '🔄 换一个'));
  card.appendChild(head);
  card.appendChild(el('div', { style: { fontSize: '15px', lineHeight: 1.6, margin: '10px 0' } }, item.text));
  card.appendChild(el('div', { class: 'row wrap', style: { gap: '6px' } },
    el('button', { class: 'btn primary small', on: { click: () => speak(item.text) } }, '🔊 语音讲解'),
    el('button', { class: 'btn outline small', on: { click: () => toast('已收藏到「已浏览」') } }, '⭐ 收藏'),
    el('button', { class: 'btn success small', on: { click: () => document.querySelector('[data-route="checkin"]')?.click() } }, '🌟 打卡'),
  ));

  root.appendChild(card);

  // 已浏览
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📚 已浏览'),
    el('div', { class: 'muted' }, (u.science.viewed || []).length + ' / ' + seed.items.length + ' 条'),
    el('div', { style: { marginTop: '8px' } },
      ...seed.items.map((it, i) => {
        const seen = (u.science.viewed || []).includes(i);
        return el('div', { class: 'tag ' + (seen ? 'green' : ''), style: { marginRight: '4px', marginBottom: '4px', cursor: 'pointer' },
          on: { click: () => { idx = i; update(); } } }, it.title);
      }),
    ),
  ));

  root.appendChild(checkinBar(u, state));

  function update() {
    const next = seed.items[idx];
    card.querySelector('h3').textContent = next.title;
    card.querySelectorAll('.muted')[0].textContent = `${idx + 1} / ${seed.items.length}`;
    card.querySelector('div[style*="font-size:15px"]').textContent = next.text;
    const viewed = new Set(u.science.viewed || []);
    viewed.add(idx);
    patchState('science', { lastIndex: idx, viewed: [...viewed] }).then(() => { state.user = { ...u, science: { lastIndex: idx, viewed: [...viewed] } }; });
  }

  function next() {
    idx = (idx + 1) % seed.items.length;
    update();
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