// modules/dashboard.js
import { el } from '../ui.js';

export async function render({ state, refreshUser }) {
  const u = state.user || {};
  const pinyin = u.pinyin || {};
  const checkin = u.checkin || {};
  const ball = u.ball || {};
  const today = new Date().toISOString().slice(0, 10);
  const root = el('div');

  // 欢迎卡片
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, `👋 ${u.user?.name || 'mimi'}，今天又是新的成长日`),
    el('div', { class: 'muted' }, `今天是 ${today}，让我们一起加油！`),
  ));

  // 今日概览
  const pinyinDone = (pinyin.readGroups || []).length;
  const pinyinTodayDone = pinyin.lastDate === today;
  const checkinDone = checkin.lastDate === today;

  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '📊 今日概览'),
    el('div', { class: 'grid-2' },
      statBlock('✅ 今日打卡', checkinDone ? '已完成' : '未打卡'),
      statBlock('拼 拼音卡', `${pinyinDone}/16${pinyinTodayDone ? '（今日）' : ''}`),
      statBlock('🏀 拍球', `${ball.today || 0}/${ball.goal || 100}`),
      statBlock('🔥 连续打卡', `${checkin.streak || 0} 天`),
    ),
  ));

  // 快速入口
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '🚀 快速进入'),
    el('div', { class: 'row wrap' },
      quick('拼', '拼音训练', 'pinyin'),
      quick('🧩', '儿童数独', 'sudoku'),
      quick('🎯', '专注力', 'focus'),
      quick('📖', 'RAZ 跟读', 'raz'),
      quick('🏀', '拍球', 'ball'),
      quick('🤸', '前庭运动', 'vestibular'),
    ),
  ));

  // 最近一次数据更新
  root.appendChild(el('div', { class: 'card' },
    el('h3', {}, '☁️ 数据'),
    el('div', { class: 'muted' },
      checkin.lastDate ? `上次打卡：${checkin.lastDate}（连续 ${checkin.streak || 0} 天）` : '还没有打卡记录，今天来一次吧！'
    ),
    el('div', { class: 'row', style: { marginTop: '8px' } },
      el('span', { class: 'tag green' }, `${(checkin.totalDays || 0)} 次累计打卡`),
    ),
  ));

  return root;
}

function statBlock(label, val) {
  return el('div', { style: { background: '#f8fafc', padding: '10px', borderRadius: '10px' } },
    el('div', { class: 'muted', style: { fontSize: '11px' } }, label),
    el('div', { style: { fontWeight: 700, fontSize: '18px', color: 'var(--accent)', marginTop: '4px' } }, val),
  );
}

function quick(emoji, label, route) {
  const n = el('button', {
    class: 'btn outline',
    style: { padding: '8px 12px', fontSize: '12px' },
    on: { click: () => document.querySelector(`[data-route="${route}"]`)?.click() },
  });
  n.append(el('span', { style: { marginRight: '4px' } }, emoji), label);
  return n;
}