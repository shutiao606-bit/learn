// 上一张 / 下一张 导航 + 首页「已答」角标
// 以后加新卡片，只要往 CARDS 里加一行，所有页面自动生效。
(function () {
  var CARDS = [
    { f: 'w1a.html', n: '⓪', t: '开课：这一周怎么学' },
    { f: 'w1.html',  n: '①', t: '路径与目录' },
    { f: 'w1b.html', n: '②', t: '一条命令怎么跑' },
    { f: 'w1c.html', n: '③', t: '进程是什么' },
    { f: 'w1d.html', n: '④', t: 'Windows vs Linux 路径' },
    { f: 'w1e.html', n: '⑤', t: '电脑实操' },
    { f: 'w1z.html', n: '⑥', t: '复盘与测验' }
  ];

  function here() {
    var f = location.pathname.split('/').pop();
    return f || 'index.html';
  }

  function isDone(f) {
    try { return !!localStorage.getItem('done_' + f); } catch (e) { return false; }
  }

  var cur = here();

  // 首页：给答过的卡片加角标
  if (cur === 'index.html') {
    // 进度环
    var card = document.getElementById('progress');
    if (card) {
      var done = 0;
      for (var j = 0; j < CARDS.length; j++) {
        if (isDone(CARDS[j].f)) done++;
      }
      var C = 113.1; // 2πr，r = 18
      var wrap = document.createElement('div');
      wrap.className = 'ring-wrap';
      wrap.innerHTML =
        '<svg class="ring" viewBox="0 0 44 44">' +
        '<circle class="ring-bg" cx="22" cy="22" r="18"></circle>' +
        '<circle class="ring-fg" cx="22" cy="22" r="18" ' +
        'stroke-dasharray="' + C + '" ' +
        'stroke-dashoffset="' + (C * (1 - done / CARDS.length)) + '"></circle>' +
        '</svg>' +
        '<span class="ring-num">' + done + '/' + CARDS.length + '</span>';
      card.insertBefore(wrap, card.firstChild);
    }

    var links = document.querySelectorAll('a.nav-card');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (href && isDone(href)) {
        var s = document.createElement('span');
        s.className = 'done-badge';
        s.textContent = '✓ 已答';
        links[i].appendChild(s);
      }
    }
    return;
  }

  // 卡片页：底部插入上一张 / 下一张
  var idx = -1;
  for (var k = 0; k < CARDS.length; k++) {
    if (CARDS[k].f === cur) { idx = k; break; }
  }
  if (idx < 0) return;

  var prev = CARDS[idx - 1];
  var next = CARDS[idx + 1];

  var nav = document.createElement('nav');
  nav.className = 'pager';

  if (prev) {
    var a = document.createElement('a');
    a.className = 'prev';
    a.href = prev.f;
    a.innerHTML = '← ' + prev.n + '<span>' + prev.t + '</span>';
    nav.appendChild(a);
  }
  var b = document.createElement('a');
  b.className = 'next';
  if (next) {
    b.href = next.f;
    b.innerHTML = next.n + ' →<span>' + next.t + '</span>';
  } else {
    b.href = 'index.html';
    b.innerHTML = '回主页 →<span>这一周读完了</span>';
  }
  nav.appendChild(b);

  var foot = document.querySelector('.foot');
  if (foot) foot.parentNode.insertBefore(nav, foot);
  else document.body.appendChild(nav);

  // 顶部阅读进度条：只在支持 scroll-driven animation 的浏览器出现
  try {
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')) {
      var bar = document.createElement('div');
      bar.className = 'rbar';
      document.body.appendChild(bar);
    }
  } catch (e) { /* 老浏览器忽略 */ }
})();
