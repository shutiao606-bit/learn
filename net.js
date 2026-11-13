// ============================================================
// 网络层：所有要发到云端的东西都从这里走。
// 三件事：
//   ① 双通道：fetch 被拦就换 XHR（微信/小米/华为/夸克常见）
//   ② 自动重试：连不上隔 1.5 秒再来，最多 3 次
//   ③ 本地队列：发不出去先存本机，下次一打开页面自动补发
// 只要 ③ 在，答案就不会丢——这是底线。
// ============================================================
(function () {
  var cfg = window.SB || {};
  var OUTBOX = 'sb_outbox_v1';
  var T_FETCH = 8000;
  var T_XHR = 7000;

  function configured() {
    return !!(cfg.url && cfg.anonKey &&
              cfg.anonKey !== 'FILL_ME_IN' &&
              String(cfg.url).indexOf('xxxxxxxx') === -1);
  }

  function url() {
    return String(cfg.url || '').replace(/\/$/, '') + '/rest/v1/answers';
  }

  function root() {
    return String(cfg.url || '').replace(/\/$/, '') + '/rest/v1/';
  }

  // 预热：页面一打开就先朝服务器打个招呼，把 DNS 和 TLS 握手提前做好。
  // 微信内置的 XWeb 内核首次连接经常超时（"刚开始几次连不上"），
  // 等用户写完答案再点提交时，连接已经是热的了。
  var warmed = false;
  function warm() {
    if (warmed || !configured()) return;
    warmed = true;
    try {
      fetch(root(), { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
        .catch(function () {});
    } catch (e) {
      try {
        var x = new XMLHttpRequest();
        x.open('HEAD', root(), true);
        x.send(null);
      } catch (e2) {}
    }
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

  // ---------- 通道 A：fetch ----------
  function viaFetch(u, opt, tFetch) {
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, tFetch || T_FETCH) : null;
    var o = {
      method: opt.method || 'POST',
      headers: opt.headers,
      body: opt.body,
      mode: opt.mode || 'cors',
      credentials: 'omit',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined
    };
    if (o.body === undefined) delete o.body;
    return fetch(u, o).then(function (r) {
      if (timer) clearTimeout(timer);
      return r.text().then(function (t) {
        return { status: r.status, text: t, via: 'fetch' };
      });
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }

  // ---------- 通道 B：XMLHttpRequest ----------
  function viaXHR(u, opt, tXhr) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(opt.method || 'POST', u, true);
      x.timeout = tXhr || T_XHR;
      var h = opt.headers || {};
      for (var k in h) {
        if (Object.prototype.hasOwnProperty.call(h, k)) {
          try { x.setRequestHeader(k, h[k]); } catch (e) {}
        }
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
      x.send(opt.body === undefined ? null : opt.body);
    });
  }

  // 一次请求：A 不行换 B；401/403 说明鉴权头有问题，去掉再试
  function once(opt, t1, t2) {
    var u = opt.url || url();
    function go(withAuth, triedNoAuth) {
      var hs = Object.assign({}, opt.headers || {}, headers(withAuth));
      var o = { method: opt.method, body: opt.body, mode: opt.mode, headers: hs };
      var req = viaFetch(u, o, t1).catch(function () {
        return viaXHR(u, o, t2);
      });
      return req.then(function (r) {
        if (!triedNoAuth && withAuth && (r.status === 401 || r.status === 403)) {
          return go(false, true);
        }
        return r;
      });
    }
    return go(true, false);
  }

  // 一次请求 + 自动重试（只在"根本没连上"时重试，服务器回错误码不重试）
  // 间隔逐渐拉长：0.8s → 1.5s → 2.5s → 4s，给冷启动的握手留时间
  var GAP = [800, 1500, 2500, 4000, 6000];
  function send(opt, tries, onRetry) {
    var n = tries || 3;
    function go(left) {
      return once(opt).catch(function (e) {
        if (left <= 1) throw e;
        if (onRetry) onRetry(n - left + 2, n);
        var wait = GAP[Math.min(n - left, GAP.length - 1)] || 1500;
        warm();
        return new Promise(function (r) { setTimeout(r, wait); })
          .then(function () { return go(left - 1); });
      });
    }
    return go(n);
  }

  // ---------- 本地队列 ----------
  function readBox() {
    try {
      var a = JSON.parse(localStorage.getItem(OUTBOX) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function writeBox(a) {
    try { localStorage.setItem(OUTBOX, JSON.stringify(a)); } catch (e) {}
  }

  function push(payload, file) {
    var item = {
      id: 'o' + Date.now() + Math.random().toString(36).slice(2, 6),
      t: new Date().toISOString(),
      file: file || '',
      payload: payload
    };
    var a = readBox();
    a.push(item);
    // 最多留 30 条，防止把存储写爆
    if (a.length > 30) a = a.slice(a.length - 30);
    writeBox(a);
    return item.id;
  }

  function remove(id) {
    writeBox(readBox().filter(function (x) { return x.id !== id; }));
  }

  function count() { return readBox().length; }

  function markDone(file) {
    if (!file) return;
    try { localStorage.setItem('done_' + file, new Date().toISOString()); } catch (e) {}
  }

  // 把队列里所有条目发出去；发成功一条删一条
  function flush(silent) {
    if (!configured()) return Promise.resolve(0);
    var list = readBox();
    if (!list.length) return Promise.resolve(0);
    var sent = 0;
    var i = 0;
    function next() {
      if (i >= list.length) return Promise.resolve(sent);
      var item = list[i++];
      return send({
        body: JSON.stringify(item.payload)
      }, 1).then(function (r) {
        if (r.status === 201 || r.status === 204) {
          remove(item.id);
          sent++;
          markDone(item.file);
        }
        return next();
      }, function () {
        // 还是连不上，整队保留，下次再说
        return Promise.resolve(sent);
      });
    }
    return next();
  }

  window.Net = {
    configured: configured,
    url: url,
    warm: warm,
    send: send,
    outbox: { push: push, remove: remove, count: count, flush: flush, read: readBox },
    inWeChat: function () { return /MicroMessenger/i.test(navigator.userAgent); }
  };

  // 页面一载入就预热连接
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', warm);
  } else {
    warm();
  }
})();
