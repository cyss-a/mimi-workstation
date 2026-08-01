// daily.js — 基于日期的确定性种子
// 目标：每天自动换一批内容，且同一天内顺序固定；近期不重复（直到整轮循环完）。

// 固定锚点（2026-01-01 UTC），用于把任意日期换算成「第几天」
const EPOCH = Date.UTC(2026, 0, 1);

// 返回从锚点起算的「天数序号」（同一天返回同一个数）
export function dayNumber(date = new Date()) {
  const t = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((t - EPOCH) / 86400000);
}

// 确定性伪随机（mulberry32）：相同种子 → 相同序列
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 按日期洗牌：每天一种固定顺序，但相邻天不一样
export function shuffleByDay(arr, date = new Date()) {
  const rng = mulberry32(dayNumber(date) + 1);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 取「今天」的前 count 条（每天换一批，直到整轮洗牌循环完都不重复）
export function pickDaily(arr, count, date = new Date()) {
  const n = Math.max(0, Math.min(count, arr.length));
  return shuffleByDay(arr, date).slice(0, n);
}

// 今天的起始下标（用于轮播起始点）
export function dailyIndex(arrLen, date = new Date()) {
  if (arrLen <= 0) return 0;
  return ((dayNumber(date) % arrLen) + arrLen) % arrLen;
}
