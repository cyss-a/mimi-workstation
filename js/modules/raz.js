// modules/raz.js — RAZ 句子跟读
import { el, speak, speakParagraph, toast } from '../ui.js';
import { patchState } from '../api.js';
import { pickDaily } from '../daily.js';

export async function render({ state, refreshUser }) {
  const seed = state.seeds.raz;
  const u = state.user;
  const root = el('div');
  let mode = 'today'; // 'today' | 'all'

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
  const statsLine = el('div', { class: 'muted', style: { marginBottom: '8px' } });

  function makeCard(s) {
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
    return card;
  }

  function rebuild() {
    list.innerHTML = '';
    list.appendChild(el('h3', {}, '🗣 跟读句子'));
    list.appendChild(statsLine);
    const sentences = mode === 'today' ? pickDaily(seed.sentences, 8) : seed.sentences;
    sentences.forEach(s => list.appendChild(makeCard(s)));
    statsLine.textContent = mode === 'today'
      ? `今日 8 句（每天不同）· 共 ${seed.sentences.length} 句`
      : `全部 ${seed.sentences.length} 句`;
    modeBtn.textContent = mode === 'today' ? '📋 浏览全部' : '📅 每日跟读';
  }

  const modeBtn = el('button', { class: 'btn outline small' }, '📋 浏览全部');
  modeBtn.addEventListener('click', () => {
    mode = mode === 'today' ? 'all' : 'today';
    rebuild();
  });

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'row between' },
      el('div', {}, el('h3', {}, '🗣 跟读句子')),
      modeBtn,
    ),
  ));
  root.appendChild(list);

  // 全自动朗读：连读当前列表的句子
  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'row between' },
      el('h3', {}, '🎙 整组跟读'),
      el('button', { class: 'btn primary small', on: { click: () => speakAll(mode === 'today' ? pickDaily(seed.sentences, 8) : seed.sentences) } }, '▶ 连读全部'),
    ),
    el('div', { class: 'muted' }, '点击后依次朗读英文→中文，方便跟读训练。'),
  ));

  root.appendChild(checkinBar(u, state));

  rebuild();
  return root;
}

function speakAll(sentences) {
  if (!('speechSynthesis' in window)) return;
  const parts = [];
  for (const s of sentences) {
    parts.push({ text: s.en, lang: 'en-US', rate: 0.8 });
    parts.push({ text: s.zh, lang: 'zh-CN', rate: 0.9 });
  }
  speakParagraph(parts, { pause: 300 });
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
