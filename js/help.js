// help.js — 每个功能旁的小问号说明圈
// 用 data 路由做 key，返回一个小问号气泡，点开显示该功能怎么用。

const HELP = {
  pinyin: '看图识字：每张卡片有配图、声调、汉字。点卡片就能听发音，再点一下就标记学过。今天 9 张每天自动换，点过会变绿。也可以「测一测」考考自己。',
  sudoku: '把数字填进格子，让每行每列都不重复就赢。已选「开始」就停不下来？点错格子可清空。完成挑战记一笔。',
  focus: '舒尔特方格：按 1→25 顺序依次点数字，错点会闪红。点「开始本组」计时，中途可「暂停/继续」，完成一组可「换一组」继续。',
  raz: '先听英文和中文，再跟着大声读。读完给自己打分：高质量 / 一般 / 再来一次。句子每天自动换新，不重样。',
  ball: '今天拍够目标个数就打卡。点一下记一次，累了就休息，慢慢来。',
  vestibular: '跟着倒计时做动作，比如转圈、单脚站。点开始，圆环走完自动记一次，随时可取消。',
  science: '每天自动换一条新知识，点 🔊 听讲解，⭐ 收藏喜欢的。下面的知识库可以随便翻看。',
  recite: '在框里写要朗诵的话，点 🔊 听示范，💾 保存。也可以直接点经典示例填空。',
  checkin: '每天来点一下，连续打卡天数会累加，养成好习惯。',
  todo: '把要做的事写下来，做完打勾。可以设提醒时间。',
  reading: '选一本绘本，点 🔊 听故事，陪孩子一起读。读完记一笔。',
};

export function helpBubble(route) {
  const text = HELP[route];
  if (!text) return document.createDocumentFragment();
  const wrap = document.createElement('span');
  wrap.className = 'help-q';
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('tabindex', '0');
  wrap.setAttribute('aria-label', '怎么用');
  wrap.textContent = '?';

  const pop = document.createElement('span');
  pop.className = 'help-pop';
  pop.textContent = text;
  wrap.appendChild(pop);

  const toggle = (e) => { e.stopPropagation(); pop.classList.toggle('show'); };
  wrap.addEventListener('click', toggle);
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
  });
  // 点击页面其它地方时关闭
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) pop.classList.remove('show');
  });

  return wrap;
}
