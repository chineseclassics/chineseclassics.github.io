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
            // GitHub Pages 兼容性設置
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
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
        var redirectTo = location.href;
        try {
          console.log('[cc-auth] 開始 Google OAuth 登入流程...');
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
          console.log('[cc-auth] OAuth 響應：', res);
          if (res && res.error) {
            console.error('[cc-auth] OAuth 錯誤：', res.error);
            alert('登入失敗：' + res.error.message);
          }
        } catch (e) {
          console.error('[cc-auth] 登入異常：', e);
          alert('登入過程中發生錯誤：' + String(e && e.message || e));
        }
      };

      el.appendChild(label);
      el.appendChild(btnGoogle);
    }
  }

  async function refreshAuth() {
    try {
      console.log('[cc-auth] 檢查認證狀態...');
      var data = (await sb.auth.getUser()).data;
      authState.user = (data && data.user) ? data.user : null;
      console.log('[cc-auth] 當前用戶：', authState.user ? authState.user.email : '未登入');
    } catch (e) {
      console.error('[cc-auth] 認證檢查失敗：', e);
      authState.user = null;
    }
    renderAuthBar();
  }

  // GitHub Pages 兼容性檢查
  function checkGitHubPagesCompatibility() {
    if (location.hostname === 'chineseclassics.github.io') {
      console.log('[cc-auth] 檢測到 GitHub Pages 環境，啟用兼容性模式');
      
      // 檢查必要的API是否可用
      if (typeof window.supabase === 'undefined') {
        console.error('[cc-auth] Supabase 未正確載入，請檢查網路連接');
        return false;
      }
      
      // 檢查HTTPS
      if (location.protocol !== 'https:') {
        console.warn('[cc-auth] 非HTTPS環境可能影響OAuth功能');
      }
      
      return true;
    }
    return true;
  }

  // 初始與狀態變更監聽
  function initializeAuth() {
    if (!checkGitHubPagesCompatibility()) {
      console.error('[cc-auth] 環境檢查失敗，認證功能可能無法正常工作');
      return;
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', refreshAuth);
    } else {
      refreshAuth();
    }
    sb.auth.onAuthStateChange(function () { refreshAuth(); });
  }
  
  // 延遲初始化以確保所有資源載入完成
  setTimeout(initializeAuth, 100);

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


