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
export function speak(text, { lang = 'zh-CN', rate = 0.9 } = {}) {
  if (!('speechSynthesis' in window)) { toast('当前浏览器不支持语音播报'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

export function stopSpeak() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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