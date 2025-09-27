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

      // 添加到 body 並確保不會被移除
      document.body.appendChild(el);
      console.log('[cc-auth] 登入狀態欄已建立並添加至 DOM:', el);

      // 添加 MutationObserver 監測是否被移除
      if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
              const wasRemoved = Array.from(mutation.removedNodes).some(node =>
                node.id === 'cc-auth-bar'
              );
              if (wasRemoved) {
                console.warn('[cc-auth] 登入狀態欄被移除！重新建立...');
                setTimeout(() => renderAuthBar(), 100);
              }
            }
          });
        });
        observer.observe(document.body, { childList: true });
      }
    } else {
      console.log('[cc-auth] 找到現有的登入狀態欄:', el);
    }

    el.innerHTML = '';

    var label = document.createElement('span');
    label.style.fontSize = '12px';
    label.style.color = '#0f172a';

    if (authState.user) {
      // 清空現有內容
      el.innerHTML = '';

      var name = authState.user.user_metadata && authState.user.user_metadata.name;
      var email = authState.user.email;
      var avatar = authState.user.user_metadata && authState.user.user_metadata.avatar_url;

      // 建立用戶頭像
      if (avatar) {
        var avatarImg = document.createElement('img');
        avatarImg.src = avatar;
        avatarImg.alt = '用戶頭像';
        avatarImg.style.width = '24px';
        avatarImg.style.height = '24px';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.marginRight = '6px';
        avatarImg.style.verticalAlign = 'middle';
        el.appendChild(avatarImg);
      }

      // 更新標籤內容
      label.textContent = name || email || '已登入';
      label.style.marginRight = '8px';

      var btnOut = document.createElement('button');
      btnOut.textContent = '登出';
      styleGhostButton(btnOut);
      btnOut.onclick = async function () {
        try {
          console.log('[cc-auth] 執行登出...');
          await sb.auth.signOut();
          console.log('[cc-auth] 登出成功');
        } catch(e) {
          console.error('[cc-auth] 登出失敗:', e);
        }
      };

      el.appendChild(label);
      el.appendChild(btnOut);

      console.log('[cc-auth] 顯示已登入狀態:', { name, email, avatar: !!avatar });
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

  async function refreshAuth() {
    try {
      // sb 可能尚未就緒，需容錯
      if (sb && sb.auth) {
        var data = (await sb.auth.getUser()).data;
        authState.user = (data && data.user) ? data.user : null;
        console.log('[cc-auth] refreshAuth - 用戶狀態:', authState.user ? '已登入' : '未登入');
      } else {
        authState.user = null;
        console.log('[cc-auth] refreshAuth - Supabase 客戶端未就緒');
      }
    } catch (e) {
      console.error('[cc-auth] refreshAuth 失敗:', e);
      authState.user = null;
    }
    renderAuthBar();
  }

  // 綁定 onAuthStateChange（若尚未就緒則等到就緒後再綁定）
  function bindAuthStateListenerWhenReady() {
    if (sb && sb.auth) {
      sb.auth.onAuthStateChange(function (event, session) {
        console.log('[cc-auth] Auth state changed:', event, session ? '有 session' : '無 session');
        refreshAuth();
      });
      return true;
    }
    return false;
  }

  // 處理URL中的登入信息（當從OAuth重新導向回來時）
  function handleAuthCallback() {
    const hash = window.location.hash;
    const search = window.location.search;

    if ((hash && hash.includes('access_token')) || (search && search.includes('access_token'))) {
      console.log('[cc-auth] 檢測到登入回調，嘗試刷新狀態...');
      setTimeout(() => refreshAuth(), 100);
    }
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
        handleAuthCallback(); // 檢查URL中的登入信息
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
    document.addEventListener('DOMContentLoaded', function() {
      handleAuthCallback(); // 檢查URL中的登入信息
      refreshAuth();
    });
  } else {
    handleAuthCallback(); // 檢查URL中的登入信息
    refreshAuth();
  }

  // 導出全域 API，提供給各遊戲頁使用
  window.ccAuth = window.ccAuth || {
    getClient: function () { return sb; },
    getUser: async function () { return (await sb.auth.getUser()).data.user || null; },
    _renderAuthBar: renderAuthBar, // 暴露手動渲染函數供調試用
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
    signOut: function () { return sb.auth.signOut(); }
  };
})();


