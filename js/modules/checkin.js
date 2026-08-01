// modules/checkin.js — 每日打卡中心
import { el, toast, formatDate } from '../ui.js';
import { action, patchState } from '../api.js';

export async function render({ state, refreshUser }) {
  const u = state.user;
  const root = el('div');
  const today = new Date().toISOString().slice(0, 10);
  const done = u.checkin.lastDate === today;

  const big = el('button', {
    class: 'btn ' + (done ? 'success' : 'primary'),
    style: { width: '100%', padding: '20px', fontSize: '20px', borderRadius: '20px' },
    on: { click: toggle },
  }, done ? '✓ 今日已完成打卡' : '🌟 今日打卡');

  root.appendChild(el('div', { class: 'card', style: { textAlign: 'center' } },
    big,
    el('div', { style: { fontSize: '48px', fontWeight: 800, color: 'var(--primary)', margin: '16px 0' } }, `${u.checkin.streak} 天`),
    el('div', { class: 'muted' }, '连续打卡 · 累计 ' + (u.checkin.totalDays || 0) + ' 天'),
  ));

  // 最近 30 天热力
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📅 最近 30 天'),
    el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: '4px' } },
      ...buildHeatmap(u.checkin.history || []),
    ),
  ));

  // 打卡项详情
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📊 今日各项'),
    el('div', { class: 'muted' },
      `拼音卡：${(u.pinyin.readGroups || []).length}/16 · `,
      `数独：${u.sudoku.completed || 0} 次 · `,
      `专注力：${u.focus.bestSeconds || '—'} 秒 · `,
      `拍球：${u.ball.today || 0} 个 · `,
      `前庭：${(u.vestibular.byDate?.[today] || []).length}/8 项`,
    ),
  ));

  async function toggle() {
    try {
      const next = await action('checkin', 'toggle');
      state.user = next;
      toast(done ? '已取消今日打卡' : '打卡成功 ✨');
      document.querySelector('[data-route="checkin"]')?.click();
    } catch (e) { toast('打卡失败：' + e.message); }
  }

  return root;
}

function buildHeatmap(history) {
  const set = new Set(history);
  const days = 30;
  const today = new Date();
  const arr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    const on = set.has(ds);
    arr.push(el('div', {
      title: ds + (on ? ' · 已打卡' : ''),
      style: {
        aspectRatio: '1', borderRadius: '4px',
        background: on ? 'var(--primary)' : '#f3f4f6',
        cursor: 'pointer',
      },
    }));
  }
  return arr;
}