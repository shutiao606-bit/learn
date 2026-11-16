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

  // ---- 离线缓存（PWA）：只在 https/localhost 下注册 ----
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  } catch (e) { /* 忽略 */ }

  // ---- 本机待发队列：能联网就悄悄补发，首页显示还剩几条 ----
  function pendingNode() {
    if (cur !== 'index.html' && cur !== '') return null;
    var card = document.getElementById('progress');
    if (!card) return null;
    var p = document.getElementById('pending');
    if (!p) {
      p = document.createElement('p');
      p.id = 'pending';
      p.className = 'hint';
      card.appendChild(p);
    }
    return p;
  }

  function showPending() {
    var n = (window.Net && Net.outbox) ? Net.outbox.count() : 0;
    if (!n) return;
    var p = pendingNode();
    if (p) p.textContent = '还有 ' + n + ' 条答案存在本机、没发出去。联网后打开任意一页会自动补发。';
  }

  if (window.Net && Net.configured && Net.configured() && Net.outbox.count() > 0) {
    Net.outbox.flush().then(function (n) {
      if (n > 0) {
        var p = pendingNode();
        if (p) p.textContent = '刚刚补发了 ' + n + ' 条之前没发出去的答案。';
        setTimeout(showPending, 5000);
      }
    });
  }
  showPending();

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

// ============================================================
// 悬浮球：随时记点子 / 提问
// 批改提醒：打开页面时拉一次未读批改，有就提示
// ============================================================
(function () {
  var Net = window.Net;

  // ---------- 悬浮球 ----------
  function buildFab() {
    if (document.getElementById('fab')) return;
    var fab = document.createElement('button');
    fab.id = 'fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', '随手记');
    fab.textContent = '+';
    document.body.appendChild(fab);

    var sheet = document.createElement('div');
    sheet.id = 'fab-sheet';
    sheet.className = 'fab-sheet';
    sheet.innerHTML =
      '<div class="fab-head"><strong>随手记</strong><span id="fab-close">关闭</span></div>' +
      '<div class="fab-tabs">' +
        '<button type="button" class="fab-tab on" data-k="💡点子">点子</button>' +
        '<button type="button" class="fab-tab" data-k="❓提问">疑问</button>' +
      '</div>' +
      '<textarea id="fab-text" placeholder="一句话就行，别组织语言"></textarea>' +
      '<div class="btn-row">' +
        '<button type="button" id="fab-send">发出去</button>' +
        '<button type="button" class="secondary" id="fab-keep">先存着</button>' +
      '</div>' +
      '<p class="hint" id="fab-msg"></p>';
    document.body.appendChild(sheet);

    var kind = '💡点子';
    var ta = sheet.querySelector('#fab-text');

    try {
      ta.value = localStorage.getItem('fab_draft') || '';
    } catch (e) {}
    ta.addEventListener('input', function () {
      try { localStorage.setItem('fab_draft', ta.value); } catch (e) {}
    });

    Array.prototype.forEach.call(sheet.querySelectorAll('.fab-tab'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(sheet.querySelectorAll('.fab-tab'), function (x) {
          x.classList.remove('on');
        });
        b.classList.add('on');
        kind = b.getAttribute('data-k');
      });
    });

    function msg(t, ok) {
      var m = sheet.querySelector('#fab-msg');
      m.textContent = t;
      m.style.color = ok ? '#2f9e44' : '#c92a2a';
    }

    function send() {
      var text = (ta.value || '').trim();
      if (text.length < 2) { msg('写两个字再发。', false); return; }
      if (!Net || !Net.configured()) { msg('云端还没配置，先存着。', false); return; }

      var payload = {
        card: kind,
        week: (window.SB && window.SB.week) || '',
        body: text,
        ua: navigator.userAgent.slice(0, 200)
      };
      var id = Net.outbox.push(payload, '');
      msg('发送中…', true);
      Net.send({ body: JSON.stringify(payload) }, 3).then(function (r) {
        if (Net.isOk(r.status)) {
          Net.outbox.remove(id);
          ta.value = '';
          try { localStorage.removeItem('fab_draft'); } catch (e) {}
          msg('已记下 ✓', true);
          setTimeout(close, 900);
        } else {
          msg('服务器回了 ' + r.status + '，已存本机', false);
        }
      }).catch(function () {
        msg('没连上，已存本机，下次自动补发', false);
      });
    }

    function open() { sheet.classList.add('on'); }
    function close() { sheet.classList.remove('on'); }

    fab.addEventListener('click', open);
    sheet.querySelector('#fab-close').addEventListener('click', close);
    sheet.querySelector('#fab-send').addEventListener('click', send);
    sheet.querySelector('#fab-keep').addEventListener('click', function () {
      try { localStorage.setItem('fab_draft', ta.value); } catch (e) {}
      msg('已存在本机，下次打开还在', true);
    });
  }

  // ---------- 批改提醒 ----------
  function buildNotice(rows) {
    if (document.getElementById('notice')) return;
    var bar = document.createElement('div');
    bar.id = 'notice';
    bar.className = 'notice';
    bar.innerHTML =
      '<span class="notice-txt">有 <strong>' + rows.length + '</strong> 条批改还没看</span>' +
      '<button type="button" id="notice-open">看看</button>' +
      '<button type="button" id="notice-x" aria-label="关掉">×</button>';

    var sheet = document.createElement('div');
    sheet.className = 'fab-sheet notice-sheet';
    sheet.id = 'notice-sheet';
    var html = '<div class="fab-head"><strong>批改结果</strong><span id="notice-close">关闭</span></div>';
    rows.forEach(function (r) {
      var cls = r.verdict === 'ok' ? 'ok' : (r.verdict === 'fix' ? 'fix' : 'wait');
      var tag = r.verdict === 'ok' ? '说对了' : (r.verdict === 'fix' ? '要改' : '待批');
      html += '<div class="fb ' + cls + '">' +
              '<p class="fb-head"><span class="fb-tag">' + tag + '</span>' +
              (r.card ? '<span class="hint">' + String(r.card).slice(0, 40) + '</span>' : '') + '</p>' +
              '<p class="fb-note"></p></div>';
    });
    sheet.innerHTML = html;
    // 内容用 textContent 填，避免后端文本被当成 HTML
    var notes = sheet.querySelectorAll('.fb-note');
    rows.forEach(function (r, i) {
      if (notes[i]) notes[i].textContent = r.note || '';
    });
    document.body.appendChild(sheet);

    bar.querySelector('#notice-open').addEventListener('click', function () {
      sheet.classList.add('on');
      Net.markSeen(rows.map(function (r) { return r.id; }));
    });
    bar.querySelector('#notice-x').addEventListener('click', function () {
      bar.remove();
      Net.markSeen(rows.map(function (r) { return r.id; }));
    });
    sheet.querySelector('#notice-close').addEventListener('click', function () {
      sheet.classList.remove('on');
    });

    document.body.insertBefore(bar, document.body.firstChild);
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildFab();
    if (!Net || !Net.configured()) return;
    Net.poll().then(function (rows) {
      if (rows && rows.length) buildNotice(rows.slice(0, 20));
    }).catch(function () {});
  });
})();
