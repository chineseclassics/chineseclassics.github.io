(function(){
  var SUPABASE_URL = window.SUPABASE_URL || 'https://onregacmigwiyomhmjyt.supabase.co';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ucmVnYWNtaWd3aXlvbWhtanl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzIzMDcsImV4cCI6MjA3NDU0ODMwN30.VxLyR3SMlnVYubFLdQNJqYMyJnT5foo7wUkVEmi4QcY';

  var sb = null;
  var currentUser = null;
  var onChangeCb = function(){};

  function ensureClient() {
    if (!window.supabase) {
      console.warn('[app-auth] supabase UMD 未載入');
      return null;
    }
    if (!sb) {
      try {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            flowType: 'pkce'
          }
        });
      } catch (e) {
        console.error('[app-auth] 建立 client 失敗', e);
        return null;
      }
    }
    return sb;
  }

  async function exchangeIfReturned() {
    try {
      var url = new URL(window.location.href);
      var code = url.searchParams.get('code');
      var error = url.searchParams.get('error');
      if (error) {
        console.warn('[app-auth] OAuth error:', error, url.searchParams.get('error_description')||'');
        return false;
      }
      if (!code) return false;
      var client = ensureClient();
      if (!client) return false;
      await client.auth.exchangeCodeForSession({ code: code });
      try {
        ['code','state','provider','scope','authuser','prompt'].forEach(function(k){ url.searchParams.delete(k); });
        window.history.replaceState({}, document.title, url.toString());
      } catch(_) {}
      return true;
    } catch(e) {
      console.warn('[app-auth] exchange 失敗', e && e.message || e);
      return false;
    }
  }

  async function refresh() {
    var client = ensureClient();
    if (!client) { onChangeCb(null); return null; }
    try {
      var data = (await client.auth.getUser()).data;
      currentUser = (data && data.user) ? data.user : null;
    } catch (_) { currentUser = null; }
    try { onChangeCb(currentUser); } catch(_) {}
    return currentUser;
  }

  function bindAuthChange() {
    var client = ensureClient();
    if (!client) return;
    client.auth.onAuthStateChange(function(){ refresh(); });
    // 跨分頁/窗口同步
    try {
      window.addEventListener('storage', function(ev){
        // supabase v2 token key 形如 sb-<ref>-auth-token
        if (!ev.key) return;
        if (ev.key.indexOf('sb-') === 0 || ev.key === 'supabase.auth.token') {
          refresh();
        }
      }, { passive: true });
    } catch(_) {}
  }

  async function initAuth(opts) {
    opts = opts || {};
    onChangeCb = typeof opts.onChange === 'function' ? opts.onChange : function(){};
    ensureClient();
    bindAuthChange();
    await exchangeIfReturned();
    return refresh();
  }

  async function loginGoogle(options) {
    options = options || {};
    var client = ensureClient();
    if (!client) throw new Error('Supabase 尚未就緒');
    var redirectTo = options.redirectTo || window.location.href;
    var res = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        skipBrowserRedirect: true,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
    if (res && res.error) throw res.error;
    if (res && res.data && res.data.url) {
      var target = (options.ux === 'top') ? '_top' : '_blank';
      try { window.open(res.data.url, target); }
      catch(_) { window.location.assign(res.data.url); }
    }
    return res;
  }

  async function logout() {
    var client = ensureClient();
    if (!client) throw new Error('登出模組尚未就緒');
    await client.auth.signOut({ scope: 'local' });
    return refresh();
  }

  window.appAuth = {
    initAuth: initAuth,
    loginGoogle: loginGoogle,
    logout: logout,
    getUser: async function(){ var c = ensureClient(); return c ? (await c.auth.getUser()).data.user : null; },
    getClient: function(){ return ensureClient(); }
  };
})();


