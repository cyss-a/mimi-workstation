// animals.js — 卡通小动物头像（侧栏图标）
// 每个路由对应一只小动物，纯 SVG、无外部资源，适配马卡龙配色。

const svg = (inner) => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

const eyes = (y = 25) => `
  <circle cx="18" cy="${y}" r="3.4" fill="#3a2e3f"/>
  <circle cx="30" cy="${y}" r="3.4" fill="#3a2e3f"/>
  <circle cx="17" cy="${y - 1}" r="1" fill="#fff" opacity="0.75"/>
  <circle cx="29" cy="${y - 1}" r="1" fill="#fff" opacity="0.75"/>`;
const cheeks = (y = 30) => `
  <circle cx="14" cy="${y}" r="2.4" fill="#fb7185" opacity="0.45"/>
  <circle cx="34" cy="${y}" r="2.4" fill="#fb7185" opacity="0.45"/>`;
const smile = (y = 32) => `<path d="M21 ${y} q3 3 6 0" stroke="#3a2e3f" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
const noseDot = (y = 29) => `<circle cx="24" cy="${y}" r="1.7" fill="#3a2e3f"/>`;

const ANIMALS = {
  // 首页：小猫
  home: svg(`
    <path d="M11 17 L16 6 L22 18 Z" fill="#f9a8d4"/>
    <path d="M37 17 L32 6 L26 18 Z" fill="#f9a8d4"/>
    <circle cx="24" cy="26" r="15" fill="#fbcfe8"/>
    ${eyes()} ${cheeks()}
    <path d="M24 30 l-2 2 h4 z" fill="#db2777"/>
    ${smile(32)}`),
  // 拼音：熊猫
  panda: svg(`
    <circle cx="14" cy="13" r="6" fill="#1f2937"/>
    <circle cx="34" cy="13" r="6" fill="#1f2937"/>
    <circle cx="24" cy="26" r="15" fill="#ffffff" stroke="#e5e7eb"/>
    <ellipse cx="18" cy="25" rx="4.6" ry="5.6" fill="#1f2937"/>
    <ellipse cx="30" cy="25" rx="4.6" ry="5.6" fill="#1f2937"/>
    <circle cx="18" cy="25" r="1.8" fill="#fff"/>
    <circle cx="30" cy="25" r="1.8" fill="#fff"/>
    <ellipse cx="24" cy="31" rx="3" ry="2.2" fill="#1f2937"/>
    ${cheeks(31)}`),
  // 数独：狐狸
  fox: svg(`
    <path d="M10 18 L15 6 L21 18 Z" fill="#fb923c"/>
    <path d="M38 18 L33 6 L27 18 Z" fill="#fb923c"/>
    <circle cx="24" cy="25" r="15" fill="#fed7aa"/>
    <ellipse cx="24" cy="31" rx="7" ry="5" fill="#fff"/>
    <circle cx="19" cy="23" r="2.6" fill="#3a2e3f"/>
    <circle cx="29" cy="23" r="2.6" fill="#3a2e3f"/>
    <path d="M24 28 l-2 2 h4 z" fill="#3a2e3f"/>`),
  // 专注：猫头鹰
  owl: svg(`
    <path d="M14 12 L17 4 L20 13 Z" fill="#a5b4fc"/>
    <path d="M34 12 L31 4 L28 13 Z" fill="#a5b4fc"/>
    <circle cx="24" cy="26" r="15" fill="#c7d2fe"/>
    <circle cx="18" cy="25" r="5" fill="#fff"/>
    <circle cx="30" cy="25" r="5" fill="#fff"/>
    <circle cx="18" cy="25" r="2.4" fill="#3a2e3f"/>
    <circle cx="30" cy="25" r="2.4" fill="#3a2e3f"/>
    <path d="M24 27 l-2.5 4 h5 z" fill="#fb923c"/>
    ${cheeks(31)}`),
  // 句子跟读：兔子
  rabbit: svg(`
    <ellipse cx="18" cy="9" rx="4" ry="9" fill="#f9a8d4"/>
    <ellipse cx="30" cy="9" rx="4" ry="9" fill="#f9a8d4"/>
    <ellipse cx="18" cy="10" rx="2" ry="6" fill="#fbcfe8"/>
    <ellipse cx="30" cy="10" rx="2" ry="6" fill="#fbcfe8"/>
    <circle cx="24" cy="27" r="14" fill="#fbcfe8"/>
    ${eyes(26)} ${cheeks(31)}
    <path d="M24 30 l-1.6 1.6 h3.2 z" fill="#db2777"/>
    ${smile(32)}`),
  // 拍球：猴子
  monkey: svg(`
    <circle cx="10" cy="22" r="6" fill="#d9a066"/>
    <circle cx="38" cy="22" r="6" fill="#d9a066"/>
    <circle cx="24" cy="25" r="15" fill="#e7b98a"/>
    <ellipse cx="24" cy="30" rx="7" ry="6" fill="#fde68a"/>
    <circle cx="18" cy="24" r="2.6" fill="#3a2e3f"/>
    <circle cx="30" cy="24" r="2.6" fill="#3a2e3f"/>
    <ellipse cx="24" cy="30" rx="2.4" ry="1.8" fill="#3a2e3f"/>
    <path d="M24 31 q-3 3 -6 1 M24 31 q3 3 6 1" stroke="#3a2e3f" stroke-width="1.2" fill="none" stroke-linecap="round"/>`),
  // 前庭运动：青蛙
  frog: svg(`
    <circle cx="17" cy="14" r="6" fill="#86efac"/>
    <circle cx="31" cy="14" r="6" fill="#86efac"/>
    <circle cx="17" cy="14" r="3" fill="#fff"/>
    <circle cx="31" cy="14" r="3" fill="#fff"/>
    <circle cx="17" cy="14" r="1.6" fill="#3a2e3f"/>
    <circle cx="31" cy="14" r="1.6" fill="#3a2e3f"/>
    <circle cx="24" cy="27" r="15" fill="#bbf7d0"/>
    <path d="M16 30 q8 6 16 0" stroke="#3a2e3f" stroke-width="1.6" fill="none" stroke-linecap="round"/>`),
  // 科普：小熊
  bear: svg(`
    <circle cx="13" cy="13" r="6" fill="#fcd34d"/>
    <circle cx="35" cy="13" r="6" fill="#fcd34d"/>
    <circle cx="24" cy="26" r="15" fill="#fde68a"/>
    <ellipse cx="24" cy="30" rx="5" ry="4" fill="#fbbf24"/>
    <circle cx="19" cy="24" r="2.6" fill="#3a2e3f"/>
    <circle cx="29" cy="24" r="2.6" fill="#3a2e3f"/>
    ${noseDot(29)}`),
  // 朗诵：小鸡
  chick: svg(`
    <path d="M24 6 l-3 5 h6 z" fill="#fbbf24"/>
    <circle cx="24" cy="27" r="15" fill="#fef08a"/>
    <circle cx="19" cy="25" r="2.8" fill="#3a2e3f"/>
    <circle cx="29" cy="25" r="2.8" fill="#3a2e3f"/>
    <path d="M24 29 l-2.5 3 h5 z" fill="#fb923c"/>
    ${cheeks(31)}`),
  // 打卡：小狗
  dog: svg(`
    <ellipse cx="11" cy="26" rx="5" ry="9" fill="#93c5fd"/>
    <ellipse cx="37" cy="26" rx="5" ry="9" fill="#93c5fd"/>
    <circle cx="24" cy="25" r="15" fill="#bfdbfe"/>
    <ellipse cx="24" cy="30" rx="6" ry="5" fill="#eff6ff"/>
    <circle cx="19" cy="24" r="2.6" fill="#3a2e3f"/>
    <circle cx="29" cy="24" r="2.6" fill="#3a2e3f"/>
    <ellipse cx="24" cy="29" rx="2.2" ry="1.6" fill="#3a2e3f"/>
    <path d="M24 30 q-3 3 -6 1 M24 30 q3 3 6 1" stroke="#3a2e3f" stroke-width="1.2" fill="none" stroke-linecap="round"/>`),
  // 待办：小鼠
  mouse: svg(`
    <circle cx="13" cy="14" r="6" fill="#d8b4fe"/>
    <circle cx="35" cy="14" r="6" fill="#d8b4fe"/>
    <circle cx="13" cy="14" r="3" fill="#e9d5ff"/>
    <circle cx="35" cy="14" r="3" fill="#e9d5ff"/>
    <circle cx="24" cy="26" r="14" fill="#e9d5ff"/>
    <circle cx="19" cy="24" r="2.6" fill="#3a2e3f"/>
    <circle cx="29" cy="24" r="2.6" fill="#3a2e3f"/>
    ${noseDot(28)} ${cheeks(31)}`),
  // 阅读：大象
  elephant: svg(`
    <path d="M8 22 q-6 2 -4 14 q8 2 12 -6 z" fill="#818cf8"/>
    <path d="M40 22 q6 2 4 14 q-8 2 -12 -6 z" fill="#818cf8"/>
    <circle cx="24" cy="25" r="15" fill="#a5b4fc"/>
    <circle cx="19" cy="23" r="2.8" fill="#3a2e3f"/>
    <circle cx="29" cy="23" r="2.8" fill="#3a2e3f"/>
    <path d="M24 29 q-2 8 -4 12 q-3 -1 -2 -4 q1 -5 3 -9 z" fill="#a5b4fc"/>
    ${noseDot(29)}`),
};

// 把侧栏每个 data-animal 的图标替换为小动物 SVG
export function mountSidebarAnimals() {
  document.querySelectorAll('.emoji[data-animal]').forEach((span) => {
    const key = span.dataset.animal;
    if (ANIMALS[key]) span.innerHTML = ANIMALS[key];
  });
}
