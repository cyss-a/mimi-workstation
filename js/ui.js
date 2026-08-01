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
let _voice = null;
function pickBestVoice() {
  if (_voice) return _voice;
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  // 优先找中文女声（macOS iOS / Chrome / Windows 都有差异，按名称匹配）
  const prefs = [
    /Tingting/i,           // macOS 中文普通话女声
    /Sin-?ji/i,            // macOS 粤语女声
    /Mei-?Jia/i,           // macOS 台湾女声
    /Microsoft\s*Xiaoxiao/i, // Win 中文女声
    /Microsoft\s*Yaoyao/i,   // Win 中文女声
    /Female.*zh/i,
    /.*zh-?CN.*Female.*/i,
    /.*zh-?CN.*/i,
    /.*zh.*/i,
  ];
  for (const p of prefs) {
    const v = voices.find(v => p.test(v.name) || p.test(v.lang));
    if (v) { _voice = v; return v; }
  }
  _voice = voices[0] || null;
  return _voice;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { _voice = null; pickBestVoice(); };
  setTimeout(pickBestVoice, 0);
}

export function speak(text, { lang = 'zh-CN', rate = 0.85, pitch = 1.05 } = {}) {
  if (!('speechSynthesis' in window)) { toast('当前浏览器不支持语音播报'); return; }
  try { window.speechSynthesis.cancel(); } catch {}
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = pitch;
  const v = pickBestVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

export function stopSpeak() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// 把多段文本串成一句更连贯的语音
export function speakParagraph(parts, { lang = 'zh-CN', rate = 0.85, pitch = 1.05, pause = 250 } = {}) {
  if (!('speechSynthesis' in window)) { toast('当前浏览器不支持语音播报'); return; }
  try { window.speechSynthesis.cancel(); } catch {}
  const v = pickBestVoice();
  let i = 0;
  const next = () => {
    if (i >= parts.length) return;
    const p = parts[i++];
    const u = new SpeechSynthesisUtterance(p.text);
    u.lang = p.lang || lang;
    u.rate = p.rate || rate;
    u.pitch = p.pitch || pitch;
    if (v) u.voice = v;
    u.onend = () => setTimeout(next, pause);
    window.speechSynthesis.speak(u);
  };
  next();
}

// 拼音/音节字母读法（用 chars 数组拼一个友好朗读串）
export function pinyinSpeak(group) {
  const parts = [];
  parts.push(group.pinyin.split(/\s*\/\s*/).join('，'));
  for (const c of group.chars) parts.push(c.char);
  speak(parts.join('。'));
}

// 获取本周第几天（周一=1）
export function weekdayCN(date = new Date()) {
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  return '周' + names[date.getDay()];
}

export function prettyJSON(o) { return JSON.stringify(o, null, 2); }