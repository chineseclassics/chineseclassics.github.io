console.log('[診斷] cc-auth.js：腳本開始執行。版本 v=20250927_2');
(function () {
  console.log('[診斷] cc-auth.js：IIFE 立即執行函數已進入。');
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
    console.log('[診斷] cc-auth.js：renderAuthBar() 函數被呼叫。');
    var el = document.getElementById('cc-auth-bar');
    if (!el) {
      console.log('[診斷] cc-auth.js：#cc-auth-bar 不存在，正在創建...');
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
      console.log('[診斷] cc-auth.js：#cc-auth-bar 已創建並附加到 body。', el);
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
      console.log('[診斷] cc-auth.js：refreshAuth() 函數被呼叫。');
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
    // 核心邏輯：確保在 DOM 完全就緒後才執行，避免被頁面腳本覆蓋
    function runAuthSetup() {
        console.log('[診斷] cc-auth.js：DOM 已就緒 (DOMContentLoaded)，開始執行 Auth 設定。');
        // 嘗試立即綁定（若此時已就緒）
        bindAuthStateListenerWhenReady();

        console.log('[診斷] cc-auth.js：啟動延遲重試機制來初始化 Supabase Client。');
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
            console.log('[診斷] cc-auth.js：Supabase Client 已就緒，執行 refreshAuth()。');
            refreshAuth();
            bindAuthStateListenerWhenReady();
            return;
        }

        retryCount++;
        if (retryCount >= maxRetries) {
            clearInterval(timer);
            console.warn('[診斷] cc-auth.js：重試超時，Supabase Client 仍未就緒。將渲染一個基本的未登入狀態欄。');
            // 即便最終仍不可用，也先渲染未登入狀態列，避免頁面上完全沒有登入入口
            renderAuthBar();
        }
        }, 500);
    }
    
    // 等待 DOMContentLoaded 事件，確保 document.body 可用
    if (document.readyState === 'loading') {
        // 改為監聽 window.onload，確保所有資源（包括頁面自己的腳本）都已載入完成
        window.addEventListener('load', runAuthSetup);
    } else {
        // 如果腳本被延遲加載，此時 DOM 可能已經就緒
        runAuthSetup();
    }
  })();

  // 初始刷新（與 DOMContentLoaded 兼容） - 此部分邏輯已移至 runAuthSetup 中
  /*
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAuth);
  } else {
    refreshAuth();
  }
  */

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
    signOut: function () { return sb.auth.signOut(); }
  };
})();


