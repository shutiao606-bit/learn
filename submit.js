// 把答题卡提交到云端。
// 真正的网络逻辑在 net.js 里；这里只管按钮、提示、和"发不出去怎么办"。
(function () {
  var cfg = window.SB || {};
  var Net = window.Net;
  var out = document.getElementById('out');
  if (!out || !Net) return;
  if (!Net.configured()) return;

  var cardFile = location.pathname.split('/').pop() || '';

  function say(text, ok) {
    var msg = document.getElementById('msg');
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = ok ? '#2f9e44' : '#c92a2a';
  }

  function buildText() {
    if (out.value.trim()) return out.value.trim();
    if (typeof gen === 'function') {
      gen();
      return (out.value || '').trim();
    }
    return '';
  }

  // 微信里连不上时，给一个能真的解决问题的出口：把页面地址复制出来
  function weChatPanel() {
    var old = document.getElementById('wx-panel');
    if (old) return;
    var box = document.createElement('div');
    box.id = 'wx-panel';
    box.className = 'wx-panel';
    box.innerHTML =
      '<strong>微信里发不出去，两个办法：</strong>' +
      '<p>① 点右上角「···」→「在浏览器打开」，在那边点「再次提交」</p>' +
      '<p>② 或者点下面的按钮复制本页链接，粘到浏览器里</p>' +
      '<button type="button" class="copy-link">复制本页链接</button>' +
      '<p class="hint">你的答案已经存在这台手机里了，下次打开会自动补发，不会丢。</p>';

    box.querySelector('.copy-link').addEventListener('click', function () {
      var link = location.href;
      var b = this;
      function done(okText) {
        b.textContent = okText;
        setTimeout(function () { b.textContent = '复制本页链接'; }, 2500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () {
          done('已复制 ✓');
        }, function () { done('复制失败，长按地址栏'); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = link;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done('已复制 ✓'); }
        catch (e) { done('复制失败，长按地址栏'); }
        document.body.removeChild(ta);
      }
    });

    var anchor = document.querySelector('.btn-row') || out;
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
  }

  function submit() {
    var body = buildText();
    if (!body || body.length < 5) {
      say('先答题，或者先点「生成答题卡」。', false);
      return;
    }

    var payload = {
      card: document.title,
      week: cfg.week || '',
      body: body,
      ua: navigator.userAgent.slice(0, 200)
    };

    // 先落盘，再发送。顺序不能反：这样哪怕马上没网，答案也已经在本机了。
    var boxId = Net.outbox.push(payload, cardFile);

    btn.disabled = true;
    btn.textContent = '提交中…';

    Net.send({ body: JSON.stringify(payload) }, 3, function (i, n) {
      say('没连上，正在重试（' + i + '/' + n + '）…', false);
    }).then(function (r) {
      if (r.status === 201 || r.status === 204) {
        Net.outbox.remove(boxId);
        try { localStorage.setItem('sb_last_' + document.title, new Date().toISOString()); } catch (e) {}
        if (cardFile) {
          try { localStorage.setItem('done_' + cardFile, new Date().toISOString()); } catch (e) {}
        }
        say('已提交到云端（' + r.via + '）。下次开对话我直接读。', true);
        btn.textContent = '已提交 ✓';
        setTimeout(function () {
          btn.textContent = '提交到云端';
          btn.disabled = false;
        }, 4000);
      } else {
        say('服务器拒绝了（HTTP ' + r.status + '）：' + r.text.slice(0, 120), false);
        btn.textContent = '再次提交';
        btn.disabled = false;
      }
    }).catch(function (e) {
      var why = (e && e.name === 'AbortError') ? '试了 3 次都超时' : '试了 3 次都连不上';
      say(why + '，但答案已经存在本机（草稿队列）。', false);
      btn.textContent = '再次提交';
      btn.disabled = false;
      if (Net.inWeChat()) weChatPanel();
    });
  }

  var btn = document.createElement('button');
  btn.textContent = '提交到云端';
  btn.className = 'cloud';
  btn.addEventListener('click', submit);

  var row = document.querySelector('.btn-row');
  if (row) row.appendChild(btn);
  else out.parentNode.insertBefore(btn, out);

  // 打开页面时，把上次没发出去的补上
  if (Net.outbox.count() > 0) {
    Net.outbox.flush().then(function (n) {
      if (n > 0) say('上次没发出去的 ' + n + ' 条，刚刚已经补发成功了。', true);
    });
  }
})();
