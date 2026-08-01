// modules/raz.js — RAZ 句子跟读
import { el, speak, toast } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const seed = state.seeds.raz;
  const u = state.user;
  const root = el('div');

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, seed.title),
    el('div', { class: 'row', style: { gap: '6px' } },
      el('span', { class: 'tag' }, `Level ${seed.level}`),
      el('span', { class: 'tag green' }, `${seed.sentences.length} 句`),
    ),
  ));

  // 自评档位
  const grades = [
    { id: 'great', label: '高质量', color: 'success' },
    { id: 'good', label: '一般', color: 'warn' },
    { id: 'again', label: '再来一次', color: 'danger' },
  ];

  const list = el('div', { class: 'card' });
  list.appendChild(el('h3', {}, '🗣 跟读句子'));
  seed.sentences.forEach(s => {
    const rated = u.raz.ratings?.[s.id];
    const card = el('div', { style: { background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '8px' } },
      el('div', { style: { fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' } }, s.en),
      el('div', { class: 'muted', style: { marginBottom: '8px' } }, s.zh),
      el('div', { class: 'row wrap', style: { gap: '6px' } },
        el('button', { class: 'btn primary small', on: { click: () => speak(s.en, { lang: 'en-US', rate: 0.7 }) } }, '🔊 发音'),
        el('button', { class: 'btn outline small', on: { click: () => speak(s.zh, { lang: 'zh-CN', rate: 0.85 }) } }, '🀄 中文'),
        ...grades.map(g => {
          const active = rated === g.id;
          const b = el('button', { class: 'btn small ' + (active ? g.color : 'outline') }, g.label);
          b.addEventListener('click', async () => {
            try {
              const next = await patchState('raz', { ratings: { ...(u.raz.ratings || {}), [s.id]: g.id } });
              state.user = next;
              toast(g.label + (g.id === 'great' ? ' ⭐' : ''));
              document.querySelector('[data-route="raz"]')?.click();
            } catch (e) { toast('保存失败：' + e.message); }
          });
          return b;
        }),
      ),
    );
    list.appendChild(card);
  });

  root.appendChild(list);

  // 全自动朗读：连读所有未评或低分的句子
  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'row between' },
      el('h3', {}, '🎙 整组跟读'),
      el('button', { class: 'btn primary small', on: { click: () => speakAll(seed) } }, '▶ 连读全部'),
    ),
    el('div', { class: 'muted' }, '点击后依次朗读英文→中文，方便跟读训练。'),
  ));

  root.appendChild(checkinBar(u, state));

  return root;
}

function speakAll(seed) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  let i = 0;
  const next = () => {
    if (i >= seed.sentences.length) return;
    const s = seed.sentences[i++];
    const u = new SpeechSynthesisUtterance(s.en);
    u.lang = 'en-US'; u.rate = 0.7;
    u.onend = () => {
      const u2 = new SpeechSynthesisUtterance(s.zh);
      u2.lang = 'zh-CN'; u2.rate = 0.9;
      u2.onend = () => setTimeout(next, 400);
      window.speechSynthesis.speak(u2);
    };
    window.speechSynthesis.speak(u);
  };
  next();
  toast('开始连读…');
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