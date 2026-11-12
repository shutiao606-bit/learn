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

    fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/answers', {
      method: 'POST',
      headers: {
        'apikey': cfg.anonKey,
        'Authorization': 'Bearer ' + cfg.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        card: document.title,
        week: cfg.week || '',
        body: body,
        ua: navigator.userAgent.slice(0, 200)
      })
    }).then(function (r) {
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
          say('提交失败（' + r.status + '）：' + t.slice(0, 120), false);
          btn.textContent = '提交到云端';
          btn.disabled = false;
        });
      }
    }).catch(function (e) {
      say('网络不通：' + e.message, false);
      btn.textContent = '提交到云端';
      btn.disabled = false;
    });
  }

  var btn = document.createElement('button');
  btn.textContent = '提交到云端';
  btn.style.background = '#2f9e44';
  btn.addEventListener('click', submit);

  var row = document.querySelector('.btn-row');
  if (row) row.appendChild(btn);
  else out.parentNode.insertBefore(btn, out);
})();
