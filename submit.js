// 把答题卡提交到 Supabase。
// 没配置 config.js 时，这个按钮根本不会出现，不影响原有「复制」流程。
(function () {
  var cfg = window.SB || {};
  var out = document.getElementById('out');
  if (!out) return;

  var configured = cfg.url && cfg.anonKey &&
                   cfg.url.indexOf('xxxxxxxx') === -1 &&
                   cfg.anonKey !== 'FILL_ME_IN';
  if (!configured) return;

  var endpoint = '';
  var payload = '';

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

  function headers(withAuth) {
    var h = {
      'apikey': cfg.anonKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    if (withAuth) h['Authorization'] = 'Bearer ' + cfg.anonKey;
    return h;
  }

  // 通道 A：fetch（标准做法）
  function viaFetch(h) {
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    return fetch(endpoint, {
      method: 'POST',
      headers: h,
      body: payload,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      return r.text().then(function (t) {
        return { status: r.status, text: t, via: 'fetch' };
      });
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }

  // 通道 B：XMLHttpRequest。有的国产浏览器（小米/华为/夸克等）
  // 会拦 fetch 却放过 XHR，所以 A 失败就换 B 再试一次。
  function viaXHR(h) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('POST', endpoint, true);
      x.timeout = 7000;
      for (var k in h) {
        if (Object.prototype.hasOwnProperty.call(h, k)) x.setRequestHeader(k, h[k]);
      }
      x.onload = function () {
        resolve({ status: x.status, text: x.responseText || '', via: 'xhr' });
      };
      x.onerror = function () { reject(new Error('XHR 网络错误')); };
      x.ontimeout = function () {
        var e = new Error('XHR 超时');
        e.name = 'AbortError';
        reject(e);
      };
      x.send(payload);
    });
  }

  function request(withAuth) {
    var h = headers(withAuth);
    return viaFetch(h).catch(function () { return viaXHR(h); });
  }

  function attempt(withAuth) {
    return request(withAuth).then(function (r) {
      if ((r.status === 401 || r.status === 403) && withAuth) return request(false);
      return r;
    });
  }

  // 网络层失败（不是服务器回错误码，是根本没连上）自动重试。
  // 微信/小米这类内置浏览器第一跳常被自己的代理吞掉，隔一秒再来往往就通了。
  var TOTAL = 3;
  function attemptWithRetry(n) {
    return attempt(true).catch(function (e) {
      if (n <= 1) throw e;
      say('没连上，正在重试（' + (TOTAL - n + 2) + '/' + TOTAL + '）…', false);
      return new Promise(function (r) {
        setTimeout(r, 1500);
      }).then(function () { return attemptWithRetry(n - 1); });
    });
  }

  function inWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent);
  }

  function submit() {
    var body = buildText();
    if (!body || body.length < 5) {
      say('先答题，或者先点「生成答题卡」。', false);
      return;
    }
    btn.disabled = true;
    btn.textContent = '提交中…';

    endpoint = cfg.url.replace(/\/$/, '') + '/rest/v1/answers';
    payload = JSON.stringify({
      card: document.title,
      week: cfg.week || '',
      body: body,
      ua: navigator.userAgent.slice(0, 200)
    });

    attemptWithRetry(TOTAL).then(function (r) {
      if (r.status === 201 || r.status === 204) {
        localStorage.setItem('sb_last_' + document.title, new Date().toISOString());
        // 标记这张卡"已答"，首页和底部导航会显示 ✓
        var f = location.pathname.split('/').pop();
        if (f) localStorage.setItem('done_' + f, new Date().toISOString());
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
      var why = (e && e.name === 'AbortError')
        ? '试了 3 次都超时'
        : '试了 3 次都连不上（' + ((e && e.message) || e) + '）';
      var fix = inWeChat()
        ? '点右上角「···」→「在浏览器打开」，那个浏览器通道更稳。'
        : '答案先点「复制」存一份，等网络好了再点「再次提交」，草稿不会丢。';
      say(why + '。' + fix, false);
      btn.textContent = '再次提交';
      btn.disabled = false;
    });
  }

  var btn = document.createElement('button');
  btn.textContent = '提交到云端';
  btn.className = 'cloud';
  btn.addEventListener('click', submit);

  var row = document.querySelector('.btn-row');
  if (row) row.appendChild(btn);
  else out.parentNode.insertBefore(btn, out);
})();
