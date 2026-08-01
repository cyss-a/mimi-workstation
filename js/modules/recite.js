// modules/recite.js — 朗诵比赛
import { el, speak, toast, formatDate } from '../ui.js';
import { patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const seed = state.seeds.poems;
  const u = state.user;
  const root = el('div');

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, seed.title),
    el('div', { class: 'muted' }, '可输入文本、保存、朗读'),
  ));

  // 输入区
  const titleInput = el('input', { class: 'input', placeholder: '输入朗诵文本（本段）' });
  const textArea = el('textarea', { class: 'input', placeholder: '在这里输入你想朗诵的文本…', style: { minHeight: '120px' } });
  // 默认示例
  textArea.value = '我就说用点劲，心在身体最里面，我把五颜六色的童年，放进我的电脑里。';

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '🎤 录入朗读文本'),
    titleInput,
    el('div', { style: { height: '8px' } }),
    textArea,
    el('div', { class: 'row wrap', style: { marginTop: '10px', gap: '6px' } },
      el('button', { class: 'btn success', on: { click: () => speak(textArea.value || '请先输入文本') } }, '🔊 朗读本文'),
      el('button', { class: 'btn primary', on: { click: () => save() } }, '💾 保存文本'),
      el('button', { class: 'btn outline', on: { click: () => { textArea.value = ''; titleInput.value = ''; } } }, '🧹 清空'),
    ),
  ));

  // 已有文本
  const listCard = el('div', { class: 'card' });
  listCard.appendChild(el('h3', {}, `📚 已保存文本 (${(u.recite.savedTexts || []).length})`));
  if (!(u.recite.savedTexts || []).length) {
    listCard.appendChild(el('div', { class: 'empty' }, '还没有保存的文本～'));
  }
  (u.recite.savedTexts || []).forEach(item => {
    listCard.appendChild(el('div', { style: { background: '#f8fafc', padding: '10px', borderRadius: '10px', marginBottom: '8px' } },
      el('div', { class: 'row between' },
        el('div', {},
          el('div', { style: { fontWeight: 700 } }, item.title || '（无标题）'),
          el('div', { class: 'muted', style: { fontSize: '11px' } }, item.createdAt),
        ),
        el('button', { class: 'btn danger small', on: { click: () => del(item.id) } }, '🗑 删除'),
      ),
      el('div', { style: { margin: '6px 0', color: 'var(--text)' } }, item.text),
      el('button', { class: 'btn outline small', on: { click: () => speak(item.text) } }, '🔊 朗读'),
    ));
  });
  root.appendChild(listCard);

  // 示例
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📖 经典示例'),
    el('div', { class: 'grid-auto' },
      ...seed.examples.map(ex =>
        el('button', { class: 'btn outline', style: { padding: '10px', textAlign: 'left' }, on: { click: () => { titleInput.value = ex.title; textArea.value = ex.text; } } },
          el('div', { style: { fontWeight: 700 } }, ex.title),
          el('div', { class: 'muted', style: { fontSize: '11px' } }, ex.text.slice(0, 24) + '…'),
        ),
      ),
    ),
  ));

  root.appendChild(checkinBar(u, state));

  async function save() {
    const title = titleInput.value.trim() || ('朗诵 ' + new Date().toLocaleString('zh-CN'));
    const text = textArea.value.trim();
    if (!text) { toast('请先输入文本'); return; }
    const item = { id: 'r' + Date.now(), title, text, createdAt: new Date().toISOString() };
    const next = await patchState('recite', { savedTexts: [item, ...(u.recite.savedTexts || [])] });
    state.user = next;
    toast('已保存');
    document.querySelector('[data-route="recite"]')?.click();
  }
  async function del(id) {
    if (!confirm('确定删除此条文本？')) return;
    const next = await patchState('recite', { savedTexts: (u.recite.savedTexts || []).filter(x => x.id !== id) });
    state.user = next;
    document.querySelector('[data-route="recite"]')?.click();
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