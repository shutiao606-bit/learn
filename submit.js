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

  var legend = null;  // 一次性提示区

  function say(text, ok) {
    var msg = document.getElementById('msg') || legend;
    if (msg) {
      msg.textContent = text;
      msg.style.color = ok ? '#2f9e44' : '#c92a2a';
    }
  }

  function buildText() {
    if (out.value.trim()) return out.value.trim();
    if (typeof gen === 'function') {
      gen();
      return (out.value || '').trim();
    }
    return '';
  }

  function submit() {
    var body = buildText();
    if (!body || body.length < 5) {
      say('先答题，或者先点「生成答题卡」。', false);
      return;
    }
    btn.disabled = true;
    btn.textContent = '提交中…';

    var endpoint = cfg.url.replace(/\/$/, '') + '/rest/v1/answers';
    var payload = JSON.stringify({
      card: document.title,
      week: cfg.week || '',
      body: body,
      ua: navigator.userAgent.slice(0, 200)
    });

    // 20 秒没回音就当作网络不通，免得按钮一直卡在"提交中…"
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    function done() { if (timer) clearTimeout(timer); }

    // 先同时带 apikey + Authorization；新版 sb_publishable_ 钥匙如果被拒，
    // 自动退回只带 apikey 再试一次。
    function post(withAuth) {
      var h = {
        'apikey': cfg.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      };
      if (withAuth) h['Authorization'] = 'Bearer ' + cfg.anonKey;
      return fetch(endpoint, {
        method: 'POST',
        headers: h,
        body: payload,
        signal: ctrl ? ctrl.signal : undefined
      });
    }

    post(true).then(function (r) {
      if (r.status === 401 || r.status === 403) return post(false);
      return r;
    }).then(function (r) {
      done();
      if (r.status === 201 || r.status === 204) {
        localStorage.setItem('sb_last_' + document.title, new Date().toISOString());
        say('已提交到云端。下次开对话我直接读，不用再贴。', true);
        btn.textContent = '已提交 ✓';
        setTimeout(function () {
          btn.textContent = '提交到云端';
          btn.disabled = false;
        }, 4000);
      } else {
        return r.text().then(function (t) {
          say('服务器拒绝了（HTTP ' + r.status + '）：' + t.slice(0, 120), false);
          btn.textContent = '再次提交';
          btn.disabled = false;
        });
      }
    }).catch(function (e) {
      done();
      var why = (e && e.name === 'AbortError')
        ? '等了 20 秒没回音，这台设备连不上 supabase.co'
        : '连不上 supabase.co（' + ((e && e.message) || e) + '）';
      say(why + '。答案先点「复制」存一份，换网络后再提交。', false);
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
