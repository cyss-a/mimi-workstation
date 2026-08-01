// modules/science.js — 科普专区（自动轮播 + 知识库）
import { el, speak, toast } from '../ui.js';
import { patchState } from '../api.js';
import { dailyIndex } from '../daily.js';

const AUTO_SECONDS = 12; // 默认自动切换间隔

export async function render({ state, refreshUser }) {
  const seed = state.seeds.science;
  const u = state.user;
  const autoSeconds = seed.autoSeconds || AUTO_SECONDS;
  const items = seed.items || [];
  const root = el('div');

  // 决定今天该从哪一条开始（按日期种子，保证每天不同且不重复）
  const today = new Date().toISOString().slice(0, 10);
  let idx = dailyIndex(items.length);
  if (idx >= items.length) idx = 0;

  root.appendChild(el('div', { class: 'card maco-lav' },
    el('h3', {}, '📚 ' + seed.title),
    el('div', { class: 'muted' }, seed.subtitle),
  ));

  // 大卡片：保存对标题/正文节点的引用，避免脆弱的 DOM 选择器
  const titleNode = el('h3', {}, '');
  const counterNode = el('div', { class: 'muted' }, '');
  const emojiNode = el('div', { style: { fontSize: '40px', textAlign: 'center', margin: '4px 0' } }, '');
  const textNode = el('div', { style: { fontSize: '15px', lineHeight: 1.7, margin: '10px 0', color: 'var(--text)' } }, '');
  const catNode = el('span', { class: 'tag pink' }, '');

  const progressBar = el('div', { class: 'sci-progress-bar' });
  const progressWrap = el('div', { class: 'sci-progress' }, progressBar);

  const card = el('div', { class: 'card maco-pink' },
    el('div', { class: 'row between' },
      el('div', {}, titleNode, counterNode),
      el('button', { class: 'btn outline small', on: { click: () => { next(); toast('换一条看看 ✨'); } } }, '🔄 换一个'),
    ),
    emojiNode,
    el('div', { class: 'row', style: { gap: '6px', marginBottom: '2px' } }, catNode),
    textNode,
    el('div', { class: 'row wrap', style: { gap: '6px', marginTop: '4px' } },
      el('button', { class: 'btn primary small', on: { click: () => currentItem() && speak(currentItem().text) } }, '🔊 语音讲解'),
      el('button', { class: 'btn outline small', on: { click: () => { markViewed(); toast('⭐ 已收藏到「已浏览」'); } } }, '⭐ 收藏'),
      el('button', { class: 'btn success small', on: { click: () => document.querySelector('[data-route="checkin"]')?.click() } }, '🌟 打卡'),
    ),
    progressWrap,
  );
  root.appendChild(card);

  // 已浏览
  const viewedCount = el('div', { class: 'muted' }, '');
  const dotWrap = el('div', { style: { marginTop: '8px' } });
  function renderDots() {
    viewedCount.textContent = (u.science.viewed || []).length + ' / ' + items.length + ' 条';
    dotWrap.innerHTML = '';
    items.forEach((it, i) => {
      const seen = (u.science.viewed || []).includes(i);
      dotWrap.appendChild(el('span', {
        class: 'tag ' + (seen ? 'green' : ''),
        style: { marginRight: '4px', marginBottom: '4px', cursor: 'pointer' },
        on: { click: () => { idx = i; show(); markViewed(); } },
      }, (it.emoji || '📌') + ' ' + it.title));
    });
  }
  root.appendChild(el('div', { class: 'card maco-mint' },
    el('h3', {}, '📖 知识库'),
    viewedCount,
    dotWrap,
  ));

  root.appendChild(checkinBar(u, state));

  // ---------- 自动轮播 ----------
  let sec = autoSeconds;
  let timerId = null;
  function startAuto() {
    sec = autoSeconds;
    updateProgress();
    clearInterval(timerId);
    timerId = setInterval(() => {
      // 离开页面后停止，避免后台空转
      if (!card.isConnected) { clearInterval(timerId); return; }
      sec -= 1;
      updateProgress();
      if (sec <= 0) next();
    }, 1000);
  }
  function updateProgress() {
    const pct = Math.max(0, Math.min(100, (sec / autoSeconds) * 100));
    progressBar.style.width = pct + '%';
  }
  function stopAuto() { clearInterval(timerId); }

  function currentItem() { return items[idx]; }

  function show() {
    const it = currentItem();
    titleNode.textContent = it.title;
    counterNode.textContent = `${idx + 1} / ${items.length}`;
    emojiNode.textContent = it.emoji || '📌';
    catNode.textContent = '🏷 ' + (it.category || '知识');
    textNode.textContent = it.text;
    // 重新计时
    sec = autoSeconds;
    updateProgress();
  }

  async function markViewed() {
    const viewed = new Set(u.science.viewed || []);
    viewed.add(idx);
    try {
      const next = await patchState('science', { lastIndex: idx, viewed: [...viewed] });
      state.user = next;
      renderDots();
    } catch (e) { toast('保存失败：' + e.message); }
  }

  function next() {
    idx = (idx + 1) % items.length;
    show();
    markViewed();
    // 重置进度条
    sec = autoSeconds;
    updateProgress();
  }

  // 初始化
  show();
  renderDots();
  startAuto();

  // 离开本页（被其他模块替换）时清理定时器
  const observer = new MutationObserver(() => {
    if (!card.isConnected) { stopAuto(); observer.disconnect(); }
  });
  observer.observe(document.getElementById('view'), { childList: true });

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
