(function () {
  var SUPABASE_URL = window.SUPABASE_URL || 'https://onregacmigwiyomhmjyt.supabase.co';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ucmVnYWNtaWd3aXlvbWhtanl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzIzMDcsImV4cCI6MjA3NDU0ODMwN30.VxLyR3SMlnVYubFLdQNJqYMyJnT5foo7wUkVEmi4QcY';

  var client = null;
  var currentUser = null;
  var authBarEl = null;
  var redirectHandled = false;

  function ensureClient() {
    if (client) return client;
    if (window.sb && window.sb.auth) {
      client = window.sb;
      return client;
    }
    if (!window.supabase) {
      console.warn('[cc-auth] Supabase UMD 尚未載入');
      return null;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        redirectTo: window.CC_AUTH_REDIRECT || 'https://chineseclassics.github.io',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    });
    window.sb = client;
    return client;
  }

  function whenDomReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function bodyHidesAuthBar() {
    var body = document.body;
    if (!body) return false;
    if (body.dataset && body.dataset.ccAuthBar === 'hidden') return true;
    if (body.classList && body.classList.contains('cc-auth-hide-bar')) return true;
    return false;
  }

  function ensureAuthBarElement() {
    if (bodyHidesAuthBar()) {
      if (authBarEl && authBarEl.parentNode) {
        authBarEl.parentNode.removeChild(authBarEl);
      }
      authBarEl = null;
      return null;
    }

    if (!authBarEl) {
      authBarEl = document.getElementById('cc-auth-bar');
      if (!authBarEl) {
        authBarEl = document.createElement('div');
        authBarEl.id = 'cc-auth-bar';
        authBarEl.style.position = 'fixed';
        authBarEl.style.top = '8px';
        authBarEl.style.right = '8px';
        authBarEl.style.zIndex = '2147483647';
        authBarEl.style.display = 'flex';
        authBarEl.style.alignItems = 'center';
        authBarEl.style.gap = '8px';
        authBarEl.style.padding = '6px 8px';
        authBarEl.style.borderRadius = '12px';
        authBarEl.style.border = '1px solid rgba(0,0,0,0.08)';
        authBarEl.style.background = 'rgba(255,255,255,0.75)';
        authBarEl.style.backdropFilter = 'blur(10px)';
        authBarEl.style.webkitBackdropFilter = 'blur(10px)';
        whenDomReady(function () {
          document.body.appendChild(authBarEl);
        });
      }
    }
    return authBarEl;
  }

  function clearChildren(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function getDisplayName(user) {
    if (!user) return '';
    var meta = user.user_metadata || {};
    return meta.full_name || meta.name || user.email || '已登入';
  }

  function getAvatarUrl(user) {
    if (!user || !user.user_metadata) return '';
    return user.user_metadata.avatar_url || user.user_metadata.picture || '';
  }

  function createButton(text, primary) {
    var btn = document.createElement('button');
    btn.textContent = text;
    btn.style.padding = '6px 10px';
    btn.style.borderRadius = '10px';
    btn.style.fontSize = '12px';
    btn.style.cursor = 'pointer';
    btn.style.border = '1px solid rgba(0,0,0,0.08)';
    if (primary) {
      btn.style.background = 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
      btn.style.color = '#fff';
    } else {
      btn.style.background = 'rgba(255,255,255,0.9)';
      btn.style.color = '#0f172a';
    }
    return btn;
  }

  function renderAuthBar() {
    whenDomReady(function () {
      var bar = ensureAuthBarElement();
      if (!bar) return;
      clearChildren(bar);

      var label = document.createElement('span');
      label.style.fontSize = '12px';
      label.style.color = '#0f172a';

      if (currentUser) {
        var avatarUrl = getAvatarUrl(currentUser);
        if (avatarUrl) {
          var img = document.createElement('img');
          img.src = avatarUrl;
          img.alt = 'avatar';
          img.style.width = '20px';
          img.style.height = '20px';
          img.style.borderRadius = '50%';
          img.style.objectFit = 'cover';
          img.style.border = '1px solid rgba(0,0,0,0.08)';
          bar.appendChild(img);
        }

        label.textContent = getDisplayName(currentUser);
        bar.appendChild(label);

        var logoutBtn = createButton('登出', false);
        logoutBtn.addEventListener('click', function () {
          logoutBtn.disabled = true;
          signOut().catch(function (err) {
            console.error('[cc-auth] signOut', err);
            alert((err && err.message) || err || '登出失敗');
          }).finally(function () {
            logoutBtn.disabled = false;
          });
        });
        bar.appendChild(logoutBtn);
      } else {
        label.textContent = '未登入';
        bar.appendChild(label);

        var loginBtn = createButton('用 Google 登入', true);
        loginBtn.addEventListener('click', function () {
          loginBtn.disabled = true;
          loginWithGoogle(window.location.href).catch(function (err) {
            console.error('[cc-auth] login', err);
            alert((err && err.message) || err || '登入失敗');
            loginBtn.disabled = false;
          });
        });
        bar.appendChild(loginBtn);
      }
    });
  }

  function navigateTo(url) {
    try {
      if (window.top && window.top !== window) {
        window.top.location.assign(url);
      } else {
        window.location.assign(url);
      }
    } catch (_) {
      window.open(url, '_top');
    }
  }

  async function loginWithGoogle(redirectUrl) {
    var client = ensureClient();
    if (!client) throw new Error('Supabase 尚未載入');
    var res = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
        }
      }
    });
    if (res && res.error) throw res.error;
    if (res && res.data && res.data.url) {
      navigateTo(res.data.url);
    }
    return res;
  }

  async function signOut() {
    var client = ensureClient();
    if (!client) throw new Error('Supabase 尚未載入');
    await client.auth.signOut();
    await fetchUser();
  }

  async function fetchUser() {
    var client = ensureClient();
    if (!client || !client.auth) {
      currentUser = null;
      renderAuthBar();
      return null;
    }
    try {
      var data = (await client.auth.getUser()).data;
      currentUser = data && data.user ? data.user : null;
    } catch (err) {
      currentUser = null;
    }
    renderAuthBar();
    return currentUser;
  }

  function setUserFromSession(session) {
    currentUser = session && session.user ? session.user : null;
    renderAuthBar();
  }

  function cleanRedirectParams(url) {
    ['code', 'state', 'error', 'error_description', 'provider', 'scope', 'authuser', 'prompt'].forEach(function (key) {
      url.searchParams.delete(key);
    });
    try {
      window.history.replaceState({}, document.title, url.toString());
    } catch (_) {
      // ignore
    }
  }

  async function handleOauthRedirect() {
    if (redirectHandled) return false;
    var client = ensureClient();
    if (!client) return false;
    var url;
    try {
      url = new URL(window.location.href);
    } catch (_) {
      return false;
    }

    var error = url.searchParams.get('error');
    if (error) {
      redirectHandled = true;
      cleanRedirectParams(url);
      console.warn('[cc-auth] OAuth error:', error, url.searchParams.get('error_description') || '');
      return false;
    }

    var code = url.searchParams.get('code');
    if (!code) return false;

    try {
      await client.auth.exchangeCodeForSession({ code: code });
    } catch (err) {
      console.warn('[cc-auth] exchangeCodeForSession 失敗:', err);
    }

    redirectHandled = true;
    cleanRedirectParams(url);
    return true;
  }

  function init() {
    whenDomReady(async function () {
      var client = ensureClient();
      await handleOauthRedirect();
      await fetchUser();
      if (client && client.auth) {
        client.auth.onAuthStateChange(function (_event, session) {
          setUserFromSession(session);
        });
      }
    });
  }

  window.ccAuth = window.ccAuth || {
    getClient: function () {
      return ensureClient();
    },
    getUser: async function () {
      if (currentUser) return currentUser;
      return await fetchUser();
    },
    loginGoogle: loginWithGoogle,
    signOut: signOut,
    refresh: fetchUser
  };

  init();
})();


