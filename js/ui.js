// ui.js — 通用工具：TTS、Toast、DOM helper、日期

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') Object.assign(node.style, v);
    else if (k === 'on') for (const [evt, fn] of Object.entries(v)) node.addEventListener(evt, fn);
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

let toastTimer = null;
export function toast(msg, ms = 1800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}

export function todayStr() { return new Date().toISOString().slice(0, 10); }
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// TTS：浏览器 Web Speech API
let _zhVoice = null, _enVoice = null;

function allVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices() || [];
}

// 按语种选最合适的语音：中文用中文语音、英文用英文语音。
// 关键修复：之前全局只锁一个中文语音，导致英文句子被中文语音读成“字母拼读”，即用户说的“读的方法不对”。
function pickVoice(lang) {
  const voices = allVoices();
  if (!voices.length) return null;
  const isEn = lang && /^en/i.test(lang);
  if (isEn) {
    if (_enVoice) return _enVoice;
    const ev = voices.find(v => /^en[-_]?US/i.test(v.lang))
            || voices.find(v => /^en/i.test(v.lang))
            || voices.find(v => /English/i.test(v.name));
    _enVoice = ev || null;
    return _enVoice || pickVoice('zh-CN'); // 实在没英文语音时退回中文（兜底）
  }
  if (_zhVoice) return _zhVoice;
  const prefs = [
    /Tingting/i,             // macOS / iOS 中文普通话女声（通常最自然）
    /Sin-?ji/i,              // macOS 粤语女声
    /Mei-?Jia/i,             // macOS 台湾女声
    /Microsoft\s*Xiaoxiao/i, // Win 中文女声（神经风，较柔和）
    /Microsoft\s*Yaoyao/i,   // Win 中文女声
    /.*zh-?CN.*/i,
    /.*zh.*/i,
  ];
  for (const p of prefs) {
    const v = voices.find(v => p.test(v.name) || p.test(v.lang));
    if (v) { _zhVoice = v; return v; }
  }
  _zhVoice = voices.find(v => /zh/i.test(v.lang)) || voices[0] || null;
  return _zhVoice;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // 语音列表异步加载，加载完成清空缓存重新选
  window.speechSynthesis.onvoiceschanged = () => { _zhVoice = null; _enVoice = null; };
}

export function speak(text, { lang = 'zh-CN', rate = 0.9, pitch = 1.0 } = {}) {
  if (!('speechSynthesis' in window)) { toast('当前浏览器不支持语音播报'); return; }
  try { window.speechSynthesis.cancel(); } catch {}
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = pitch;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

export function stopSpeak() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// 多段文本按顺序连读：英文段用英文语音、中文段用中文语音，段间短暂停顿，更连贯不卡顿
export function speakParagraph(parts, { rate = 0.9, pitch = 1.0, pause = 320 } = {}) {
  if (!('speechSynthesis' in window)) { toast('当前浏览器不支持语音播报'); return; }
  try { window.speechSynthesis.cancel(); } catch {}
  let i = 0;
  const next = () => {
    if (i >= parts.length) return;
    const p = parts[i++];
    const u = new SpeechSynthesisUtterance(p.text);
    u.lang = p.lang || 'zh-CN';
    u.rate = p.rate || rate;
    u.pitch = p.pitch || pitch;
    const v = pickVoice(u.lang);
    if (v) u.voice = v;
    u.onend = () => setTimeout(next, pause);
    window.speechSynthesis.speak(u);
  };
  next();
}

// 拼音朗读：用“汉字/词”发准音节音。
// 说明：Web Speech 会把拼音罗马字（bà/ba）当成英文字母“拼读”，听起来方法不对；
// 直接读汉字（爸）发音即正确音节，所以这里只读汉字与词，拼音作为视觉辅助显示在卡片上。
export function pinyinSpeak(group) {
  const parts = [];
  for (const c of group.chars) parts.push({ text: c.char, lang: 'zh-CN' });
  if (group.word) parts.push({ text: group.word, lang: 'zh-CN' });
  if (!parts.length) return;
  speakParagraph(parts, { pause: 380 });
}

// 获取本周第几天（周一=1）
export function weekdayCN(date = new Date()) {
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  return '周' + names[date.getDay()];
}

export function prettyJSON(o) { return JSON.stringify(o, null, 2); }