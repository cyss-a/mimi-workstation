// modules/pinyin.js — 拼音训练纸
import { el, speak, pinyinSpeak, toast } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const seed = state.seeds.pinyin;
  const u = state.user;
  const readSet = new Set(u.pinyin.readGroups || []);
  const root = el('div');

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, seed.title),
    el('div', { class: 'muted' }, seed.subtitle),
  ));

  // 顶部统计 + 模式选择
  const today = new Date().toISOString().slice(0, 10);
  const todayMark = u.pinyin.lastDate === today;
  let mode = 'today'; // 'today' | 'all'

  const grid = el('div', { class: 'pinyin-grid' });
  function rebuild() {
    clear(grid);
    const list = mode === 'today' ? seed.groups.slice(0, 9) : seed.groups;
    list.forEach(g => {
      const card = el('div', { class: 'pinyin-card' + (readSet.has(g.id) ? ' read' : '') },
        el('div', { class: 'tone' }, g.pinyin),
        el('div', { class: 'row', style: { justifyContent: 'center', gap: '6px', marginTop: '2px' } },
          ...g.chars.map(c => el('span', { class: 'ch' }, c.char)),
        ),
        el('div', { class: 'py' }, g.word),
        el('div', { class: 'muted', style: { fontSize: '10px', marginTop: '2px' } }, '🔊 点击发音'),
      );
      card.addEventListener('click', async () => {
        try {
          await patchState('pinyin', {});
          const next = await (await import('../api.js')).action('pinyin', 'mark-read', { groupId: g.id });
          state.user = next;
          const ns = new Set(next.pinyin.readGroups);
          card.classList.toggle('read', ns.has(g.id));
          pinyinSpeak(g);
          updateStats();
        } catch (e) { toast('保存失败：' + e.message); }
      });
      grid.appendChild(card);
    });
  }

  const statsLine = el('div', { class: 'muted', style: { marginBottom: '8px' } });
  function updateStats() {
    statsLine.textContent = `已拼读 ${readSet.size}/${seed.totalGroups}${todayMark ? ' · 今日已练习' : ''}`;
    modeBtn.dataset.tip = mode === 'today' ? '今日 9 张 · 点击切换浏览全部' : '全部 16 张 · 点击切换今日';
  }

  const modeBtn = el('button', { class: 'btn outline small' }, mode === 'today' ? '📅 每日练习' : '📋 浏览全部');
  modeBtn.addEventListener('click', () => {
    mode = mode === 'today' ? 'all' : 'today';
    modeBtn.textContent = mode === 'today' ? '📅 每日练习' : '📋 浏览全部';
    rebuild();
  });

  const allBtn = el('button', { class: 'btn outline small' }, '🎯 测拼音题');
  allBtn.addEventListener('click', () => runQuiz(seed, u, state));

  root.appendChild(el('div', { class: 'card' },
    el('div', { class: 'row between' },
      statsLine,
      el('div', { class: 'row' }, modeBtn, allBtn),
    ),
    grid,
  ));

  // 打卡
  root.appendChild(checkinBar(u, state));

  rebuild();
  updateStats();
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
      setTimeout(() => document.querySelector('[data-route="dashboard"]')?.click(), 600);
    } catch (e) { toast('打卡失败：' + e.message); }
  });
  return el('div', { class: 'card' },
    el('div', { class: 'row between' },
      el('div', {},
        el('h3', {}, '🌟 每日打卡'),
        el('div', { class: 'muted' }, `连续 ${u.checkin.streak} 天 · 累计 ${u.checkin.totalDays} 天`),
      ),
      btn,
    ),
  );
}

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

// 测一测：随机 5 个组，用户从 4 个字中选正确的 2 个字
async function runQuiz(seed, u, state) {
  const groups = [...seed.groups].sort(() => Math.random() - 0.5).slice(0, 5);
  let i = 0, score = 0;
  const show = (idx) => {
    if (idx >= groups.length) {
      document.getElementById('view').innerHTML = '';
      const card = el('div', { class: 'card' },
        el('h3', {}, '🎉 测试结束'),
        el('div', { style: { fontSize: '36px', fontWeight: 800, color: 'var(--primary)', textAlign: 'center', margin: '20px 0' } }, `${score} / ${groups.length}`),
        el('div', { class: 'row', style: { justifyContent: 'center' } },
          el('button', { class: 'btn primary', on: { click: () => document.querySelector('[data-route="pinyin"]')?.click() } }, '返回拼音训练'),
        ),
      );
      document.getElementById('view').appendChild(card);
      return;
    }
    const g = groups[idx];
    const rightChars = g.chars.map(c => c.char);
    const distractors = seed.groups.flatMap(gg => gg.chars.map(c => c.char)).filter(c => !rightChars.includes(c));
    const picks = [...rightChars, ...distractors.sort(() => Math.random() - 0.5).slice(0, 6 - rightChars.length)]
      .sort(() => Math.random() - 0.5);
    const picked = new Set();
    const grid = el('div', { class: 'grid-3' });
    const refresh = () => {
      clear(grid);
      picks.forEach(c => {
        const b = el('button', { class: 'btn outline', style: { padding: '14px', fontSize: '20px', fontWeight: 700 } }, c);
        if (picked.has(c)) b.classList.remove('outline'), b.style.background = 'var(--accent)', b.style.color = '#fff';
        b.addEventListener('click', () => {
          if (picked.has(c)) picked.delete(c); else picked.add(c);
          refresh();
        });
        grid.appendChild(b);
      });
    };
    refresh();
    const view = document.getElementById('view');
    view.innerHTML = '';
    view.appendChild(el('div', {},
      el('div', { class: 'card' },
        el('div', { class: 'muted' }, `第 ${idx + 1} / ${groups.length} 题`),
        el('h3', {}, `请选出「${g.pinyin}」对应的字`),
        el('div', { class: 'row between' },
          el('span', { class: 'tag pink' }, g.word),
          el('button', { class: 'btn ghost small', on: { click: () => speak(g.pinyin, { lang: 'zh-CN', rate: 0.7 }) } }, '🔊 再听一次'),
        ),
      ),
      el('div', { class: 'card' }, grid),
      el('div', { class: 'card', style: { textAlign: 'center' } },
        el('button', { class: 'btn primary', on: { click: () => {
          const ok = [...picked].sort().join(',') === rightChars.sort().join(',');
          if (ok) { score++; toast('答对了！'); } else { toast('再想想～正确是：' + rightChars.join('、')); }
          setTimeout(() => show(idx + 1), 600);
        } } }, '提交'),
      ),
    ));
  };
  show(0);
}