(function () {
  // ---------- Supabase 初始化 ----------
  var SUPABASE_URL = window.SUPABASE_URL || 'https://onregacmigwiyomhmjyt.supabase.co';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ucmVnYWNtaWd3aXlvbWhtanl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzIzMDcsImV4cCI6MjA3NDU0ODMwN30.VxLyR3SMlnVYubFLdQNJqYMyJnT5foo7wUkVEmi4QcY';

  function ensureSupabaseClient() {
    if (!window.supabase) {
      console.warn('[cc-auth] Supabase UMD 尚未載入。請確認在本檔前已引入 supabase.js');
      return null;
    }
    if (!window.sb) {
      try {
        window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            redirectTo: 'https://chineseclassics.github.io'
          }
        });
      } catch (e) {
        console.error('[cc-auth] 建立 Supabase Client 失敗：', e);
        return null;
      }
    }
    return window.sb;
  }

  var sb = ensureSupabaseClient();
  // 不再在此直接返回；若當前尚未就緒，後續會採用延遲重試機制確保最終初始化成功

  // ---------- DOM：頂部登入狀態列（全站共用） ----------
  var authState = { user: null };

  function styleButton(btn) {
    btn.style.padding = '6px 10px';
    btn.style.borderRadius = '10px';
    btn.style.border = '1px solid rgba(0,0,0,0.08)';
    btn.style.background = 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
    btn.style.color = '#fff';
    btn.style.fontSize = '12px';
    btn.style.cursor = 'pointer';
  }

  function styleGhostButton(btn) {
    btn.style.padding = '6px 10px';
    btn.style.borderRadius = '10px';
    btn.style.border = '1px solid rgba(0,0,0,0.08)';
    btn.style.background = 'rgba(255,255,255,0.9)';
    btn.style.color = '#0f172a';
    btn.style.fontSize = '12px';
    btn.style.cursor = 'pointer';
  }

  function renderAuthBar() {
    var el = document.getElementById('cc-auth-bar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cc-auth-bar';
      el.style.position = 'fixed';
      el.style.top = '8px';
      el.style.right = '8px';
      el.style.zIndex = '9999';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.gap = '8px';
      el.style.padding = '6px 8px';
      el.style.borderRadius = '12px';
      el.style.border = '1px solid rgba(0,0,0,0.08)';
      el.style.background = 'rgba(255,255,255,0.75)';
      el.style.backdropFilter = 'blur(10px)';
      el.style.webkitBackdropFilter = 'blur(10px)';
      document.body.appendChild(el);
    }
    el.innerHTML = '';

    var label = document.createElement('span');
    label.style.fontSize = '12px';
    label.style.color = '#0f172a';

    if (authState.user) {
      var name = authState.user.user_metadata && authState.user.user_metadata.name;
      var email = authState.user.email;
      label.textContent = name || email || '已登入';

      var btnOut = document.createElement('button');
      btnOut.textContent = '登出';
      styleGhostButton(btnOut);
      btnOut.onclick = async function () {
        try { await sb.auth.signOut(); } catch(e) { console.error(e); }
      };

      el.appendChild(label);
      el.appendChild(btnOut);
    } else {
      label.textContent = '未登入';
      var btnGoogle = document.createElement('button');
      btnGoogle.textContent = '用 Google 登入';
      styleButton(btnGoogle);
      btnGoogle.onclick = async function () {
        var redirectTo = location.href.trim();
        // 確保客戶端存在；若尚未載入，嘗試即時建立
        var client = ensureSupabaseClient();
        if (!client) {
          alert('登入元件尚未載入，請稍候或重新整理頁面');
          return;
        }
        try {
          var res = await client.auth.signInWithOAuth({
            provider: 'google',
            options: { 
              redirectTo: redirectTo,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent'
              }
            }
          });
          if (res && res.error) alert(res.error.message);
        } catch (e) {
          alert(String((e && e.message) || e));
        }
      };

      el.appendChild(label);
      el.appendChild(btnGoogle);
    }
  }

  async function refreshAuth() {
    try {
      // sb 可能尚未就緒，需容錯
      if (sb && sb.auth) {
        var data = (await sb.auth.getUser()).data;
        authState.user = (data && data.user) ? data.user : null;
      } else {
        authState.user = null;
      }
    } catch (e) {
      authState.user = null;
    }
    renderAuthBar();
  }

  // 綁定 onAuthStateChange（若尚未就緒則等到就緒後再綁定）
  function bindAuthStateListenerWhenReady() {
    if (sb && sb.auth) {
      sb.auth.onAuthStateChange(function () { refreshAuth(); });
      return true;
    }
    return false;
  }

  // 延遲重試：等待 Supabase UMD 載入並成功建立 client
  (function setupDeferredInit() {
    // 嘗試立即綁定（若此時已就緒）
    bindAuthStateListenerWhenReady();

    var retryCount = 0;
    var maxRetries = 40; // 最多重試約 20 秒（500ms * 40）
    var timer = setInterval(function () {
      // 若全域 client 尚未建立，嘗試建立
      if (!window.sb) {
        // 若 UMD 尚未載入，ensureSupabaseClient 會無動作並返回 null
        var maybe = ensureSupabaseClient();
        if (maybe) {
          sb = maybe; // 更新閉包內的 sb 引用
        }
      } else if (!sb) {
        sb = window.sb;
      }

      // 一旦可用，執行初始刷新並綁定狀態監聽
      if (sb && sb.auth) {
        clearInterval(timer);
        refreshAuth();
        bindAuthStateListenerWhenReady();
        return;
      }

      retryCount++;
      if (retryCount >= maxRetries) {
        clearInterval(timer);
        // 即便最終仍不可用，也先渲染未登入狀態列，避免頁面上完全沒有登入入口
        renderAuthBar();
      }
    }, 500);
  })();

  // 初始刷新（與 DOMContentLoaded 兼容）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAuth);
  } else {
    refreshAuth();
  }

  // 導出全域 API，提供給各遊戲頁使用
  window.ccAuth = window.ccAuth || {
    getClient: function () { return sb; },
    getUser: async function () { return (await sb.auth.getUser()).data.user || null; },
    loginGoogle: async function () {
      var redirectTo = location.href;
      return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo } });
    },
    signOut: function () { return sb.auth.signOut(); }
  };
})();


