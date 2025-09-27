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
  if (!sb) return;

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
    console.log('[cc-auth] 渲染登入狀態欄...');
    var el = document.getElementById('cc-auth-bar');
    if (!el) {
      console.log('[cc-auth] 創建新的登入狀態欄元素');
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
      
      // 確保 body 存在
      if (document.body) {
        document.body.appendChild(el);
        console.log('[cc-auth] 登入狀態欄已添加到 body');
      } else {
        console.error('[cc-auth] document.body 不存在，無法添加登入狀態欄');
        return;
      }
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
        var redirectTo = location.href.trim(); // 移除可能的空格
        try {
          var res = await sb.auth.signInWithOAuth({
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
          alert(String(e && e.message || e));
        }
      };

      el.appendChild(label);
      el.appendChild(btnGoogle);
    }
  }

  async function refreshAuth() {
    console.log('[cc-auth] 刷新登入狀態...');
    try {
      var data = (await sb.auth.getUser()).data;
      authState.user = (data && data.user) ? data.user : null;
      console.log('[cc-auth] 用戶狀態:', authState.user ? '已登入' : '未登入');
    } catch (e) {
      console.error('[cc-auth] 獲取用戶狀態失敗:', e);
      authState.user = null;
    }
    renderAuthBar();
  }

  // 初始與狀態變更監聽
  function initAuth() {
    console.log('[cc-auth] 初始化登入狀態欄...');
    refreshAuth();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    // 延遲執行以確保 DOM 完全準備好
    setTimeout(initAuth, 100);
  }
  sb.auth.onAuthStateChange(function () { refreshAuth(); });

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


