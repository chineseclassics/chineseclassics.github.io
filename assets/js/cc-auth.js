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
        var defaultRedirectTo = (function(){
          try { return window.location.origin + window.location.pathname; }
          catch(_) { return 'https://chineseclassics.github.io/shicizuju.html'; }
        })();
        window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            redirectTo: defaultRedirectTo,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
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
    var mount = document.getElementById('authMount');
    var usingInlineMount = false;
    var el = document.getElementById('cc-auth-bar');
    if (mount) {
      usingInlineMount = true;
      if (!el) {
        el = document.createElement('div');
        el.id = 'cc-auth-bar';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '8px';
      }
      mount.innerHTML = '';
      mount.appendChild(el);
      mount.classList.remove('hidden');
    }
    if (!usingInlineMount) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'cc-auth-bar';
        el.style.position = 'fixed';
        el.style.top = '8px';
        el.style.right = '8px';
        el.style.zIndex = '2147483647';
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
    }
    el.innerHTML = '';

    var label = document.createElement('span');
    label.style.fontSize = '12px';
    label.style.color = '#0f172a';

    if (authState.user) {
      var name = authState.user.user_metadata && authState.user.user_metadata.name;
      var email = authState.user.email;
      var avatar = (authState.user.user_metadata && (authState.user.user_metadata.avatar_url || authState.user.user_metadata.picture)) || '';
      label.textContent = name || email || '已登入';

      if (avatar) {
        var img = document.createElement('img');
        img.src = avatar;
        img.alt = 'avatar';
        img.style.width = '20px';
        img.style.height = '20px';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.style.border = '1px solid rgba(0,0,0,0.08)';
      }

      var btnOut = document.createElement('button');
      btnOut.textContent = '登出';
      styleGhostButton(btnOut);
      btnOut.onclick = async function () {
        try {
          btnOut.disabled = true;
          var client = ensureSupabaseClient() || sb;
          if (!client || !client.auth) {
            btnOut.disabled = false;
            alert('登出模組尚未就緒，請稍候或刷新頁面');
            return;
          }
          await client.auth.signOut({ scope: 'local' });
          await refreshAuth();
          // 若仍殘留登入狀態，保險起見強制刷新
          if (authState.user) {
            setTimeout(function(){ try { location.reload(); } catch(_){} }, 100);
          }
        } catch(e) {
          console.error(e);
          alert(String((e && e.message) || e));
        } finally {
          btnOut.disabled = false;
        }
      };

      if (avatar) el.appendChild(img);
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
              skipBrowserRedirect: true, // 取得 URL 後自行以頂層視窗跳轉，避免在 iframe 內載入
              queryParams: {
                access_type: 'offline',
                prompt: 'consent'
              }
            }
          });
          if (res && res.error) {
            alert(res.error.message);
            return;
          }
          if (res && res.data && res.data.url) {
            try {
              // 優先以頂層視窗跳轉，避開 iframe 限制
              if (window.top && window.top !== window) {
                window.top.location.assign(res.data.url);
              } else {
                window.location.assign(res.data.url);
              }
            } catch (_) {
              // 某些環境下改用 _top 目標
              window.open(res.data.url, '_top');
            }
          }
        } catch (e) {
          alert(String((e && e.message) || e));
        }
      };

      el.appendChild(label);
      el.appendChild(btnGoogle);
    }
  }

  // 解析回跳並交換 Session
  async function handleOauthRedirectIfNeeded() {
    try {
      var url = new URL(window.location.href);
      var code = url.searchParams.get('code');
      var error = url.searchParams.get('error');
      var errorDescription = url.searchParams.get('error_description');
      if (error) {
        // 保留渲染未登入，但提示錯誤
        console.warn('[cc-auth] OAuth error:', error, errorDescription || '');
        return false;
      }
      if (!code) return false;
      if (!sb || !sb.auth) return false;
      // 與 Supabase 交換並建立本地 session
      await sb.auth.exchangeCodeForSession({ code: code });
      // 清理 URL 上的 code/state 參數
      try {
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('provider');
        url.searchParams.delete('scope');
        url.searchParams.delete('authuser');
        url.searchParams.delete('prompt');
        window.history.replaceState({}, document.title, url.toString());
      } catch (_) {}
      return true;
    } catch (e) {
      console.warn('[cc-auth] exchangeCodeForSession 失敗：', e && e.message || e);
      return false;
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
      sb.auth.onAuthStateChange(function (_event, session) {
        // 在嵌入/跨域情況下，確保本地持久化 session
        try {
          if (session && session.access_token) {
            // 觸發一次刷新，更新狀態列
            refreshAuth();
          } else {
            refreshAuth();
          }
        } catch (_) { refreshAuth(); }
      });
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
        // 若為 OAuth 回跳，先交換 Session 再刷新
        handleOauthRedirectIfNeeded().then(function(){
          refreshAuth();
        });
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
    document.addEventListener('DOMContentLoaded', function(){
      // 嘗試處理可能已存在的回跳參數
      handleOauthRedirectIfNeeded().finally(refreshAuth);
    });
  } else {
    handleOauthRedirectIfNeeded().finally(refreshAuth);
  }

  // 導出全域 API，提供給各遊戲頁使用
  window.ccAuth = window.ccAuth || {
    getClient: function () { return sb; },
    getUser: async function () { return (await sb.auth.getUser()).data.user || null; },
    loginGoogle: async function () {
      var redirectTo = location.href;
      var client = ensureSupabaseClient();
      if (!client) throw new Error('Supabase 尚未就緒');
      var res = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      if (res && res.error) throw res.error;
      if (res && res.data && res.data.url) {
        try {
          if (window.top && window.top !== window) {
            window.top.location.assign(res.data.url);
          } else {
            window.location.assign(res.data.url);
          }
        } catch (_) {
          window.open(res.data.url, '_top');
        }
      }
      return res;
    },
    signOut: async function () {
      var client = ensureSupabaseClient() || sb;
      if (!client || !client.auth) throw new Error('登出模組尚未就緒');
      var res = await client.auth.signOut({ scope: 'local' });
      try { await refreshAuth(); } catch(_) {}
      return res;
    }
  };
})();


