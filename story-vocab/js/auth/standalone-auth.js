// =====================================================
// 獨立運行模式認證
// 使用詞遊記自己的 Supabase project
// 支持 Google OAuth 和匿名登入
// =====================================================

import { AuthService } from './auth-service.js';
import { getSupabase } from '../supabase-client.js';

export class StandaloneAuth extends AuthService {
  constructor() {
    super();
    this.supabase = null;
    this.currentUser = null;
  }
  
  async initialize() {
    console.log('🔐 初始化獨立認證系統...');
    
    this.supabase = getSupabase();
    
    try {
      // 檢查現有 session（帶超時保護，防止卡住）
      const sessionPromise = this.supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getSession 超時')), 10000) // 放寬到 10 秒
      );
      
      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);
      
      if (error) {
        console.error('❌ 獲取 session 失敗:', error);
        await this.clearCorruptedSession();
        return null;
      }
      
      if (session) {
        console.log('✅ 發現已有 session');
        await this.syncUserToDatabase(session.user);
        return this.currentUser;
      }
      
      console.log('ℹ️ 用戶未登入');
      return null;
      
    } catch (error) {
      console.error('❌ 初始化認證系統時發生錯誤:', error);
      // 超時或其他錯誤，清理可能損壞的數據
      await this.clearCorruptedSession();
      return null;
    }
  }
  
  /**
   * 清理損壞的 session 數據
   * 只在遇到超時或錯誤時調用
   */
  async clearCorruptedSession() {
    try {
      console.log('🧹 清理本地認證數據...');
      
      // 清理 Supabase 相關的存儲項目
      const supabasePrefixes = ['sb-', 'supabase', 'auth'];
      let cleanedCount = 0;
      
      // 清理 localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && supabasePrefixes.some(prefix => key.toLowerCase().includes(prefix))) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
      
      // 清理 sessionStorage
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && supabasePrefixes.some(prefix => key.toLowerCase().includes(prefix))) {
          sessionStorage.removeItem(key);
          cleanedCount++;
        }
      }
      
      console.log(`✅ 已清理 ${cleanedCount} 個存儲項目`);
      
      // 嘗試通知 Supabase 客戶端（帶超時保護）
      try {
        const signOutPromise = this.supabase.auth.signOut();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('signOut 超時')), 3000)
        );
        await Promise.race([signOutPromise, timeoutPromise]);
      } catch (signOutError) {
        // 忽略 signOut 錯誤，因為可能 session 已經損壞
      }
      
      console.log('💡 請刷新頁面後重試登入');
    } catch (error) {
      console.error('❌ 清理 session 時發生錯誤:', error);
    }
  }
  
  async getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    const { data: { user }, error } = await this.supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    await this.syncUserToDatabase(user);
    return this.currentUser;
  }
  
  async loginWithGoogle() {
    console.log('🔐 使用 Google 登入（獨立模式）...');
    
    // 🎯 檢測是否在 iframe 中
    const isInIframe = window.self !== window.top;
    
    if (isInIframe) {
      console.warn('⚠️ 檢測到在 iframe 中，使用彈出窗口進行 OAuth');
      
      // 構建登入 URL（添加標識，告訴新窗口這是從 iframe 彈出的）
      const loginUrl = `${window.location.origin}${window.location.pathname}?autoLogin=google&popup=true`;
      
      // 🔑 關鍵：必須在同步代碼中立即打開彈窗
      // 計算居中位置
      const width = 550;
      const height = 650;
      const left = Math.round((screen.width - width) / 2);
      const top = Math.round((screen.height - height) / 2);
      
      // 打開彈出窗口（小窗口，不是全屏標籤頁）
      // 注意：Safari 可能會忽略尺寸參數
      const features = [
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
        'location=no',      // 不顯示地址欄
        'toolbar=no',       // 不顯示工具欄
        'menubar=no',       // 不顯示菜單欄
        'status=no',        // 不顯示狀態欄
        'scrollbars=yes',   // 允許滾動
        'resizable=yes'     // 允許調整大小
      ].join(',');
      
      const popup = window.open(
        loginUrl,
        'GoogleLogin',  // 窗口名稱
        features
      );
      
      // 檢測彈窗是否被阻止
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.error('❌ 彈出窗口被瀏覽器阻止');
        return { 
          error: new Error('彈出窗口被阻止'),
          popupBlocked: true,
          loginUrl: loginUrl
        };
      }
      
      console.log('✅ 彈出窗口已打開，等待用戶完成登入...');
      
      // 監控彈窗關閉（表示登入完成或取消）
      return new Promise((resolve) => {
        const checkPopupClosed = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(checkPopupClosed);
              console.log('🔔 彈出窗口已關閉，檢查登入狀態...');
              
              // 彈窗關閉後，檢查是否登入成功
              // 返回特殊標識，讓調用方知道需要檢查登入狀態
              resolve({ 
                popupClosed: true,
                needsCheck: true
              });
            }
          } catch (e) {
            // 跨域限制，無法檢測，繼續監控
          }
        }, 500);
        
        // 30秒超時
        setTimeout(() => {
          clearInterval(checkPopupClosed);
          if (!popup.closed) {
            console.warn('⏰ 登入超時（30秒）');
          }
        }, 30000);
      });
    }
    
    // 🔧 構建正確的重定向 URL
    let redirectTo = window.location.origin + window.location.pathname;
    
    // 如果 pathname 是 /story-vocab/index.html，規範化為 /story-vocab/
    if (redirectTo.endsWith('/index.html')) {
      redirectTo = redirectTo.replace('/index.html', '/');
    }
    // 確保以斜杠結尾
    if (!redirectTo.endsWith('/')) {
      redirectTo += '/';
    }
    
    // 移除 autoLogin 參數（如果有）
    redirectTo = redirectTo.split('?')[0];
    
    console.log('🔗 重定向 URL:', redirectTo);
    
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        scopes: 'openid profile email',
        queryParams: {
          access_type: 'offline',
          // 移除 prompt: 'consent'，讓 Google 自動決定
          // 如果用戶已登入 Google，會直接靜默授權
          // 如果需要選擇賬號，會顯示賬號選擇器
        }
      }
    });
    
    if (error) {
      console.error('❌ Google 登入失敗:', error);
      console.error('   請檢查 Supabase Dashboard 的 Site URL 配置');
      console.error('   應該設置為: https://chineseclassics.github.io/story-vocab/');
      return { error };
    }
    
    // OAuth 會跳轉，不會執行到這裡
    return {};
  }
  
  async loginAnonymously() {
    console.log('👤 匿名登入（訪客試用）...');
    
    try {
      // ✅ 先檢查是否已有匿名 session
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (session && session.user) {
        console.log('🔍 檢查現有 session...');
        
        // 查找對應的用戶記錄
        const { data: existingUser } = await this.supabase
          .from('user_identities')
          .select('*, users(*)')
          .eq('provider', 'anonymous')
          .eq('provider_id', session.user.id)
          .maybeSingle();
        
        if (existingUser && existingUser.users && existingUser.users.user_type === 'anonymous') {
          console.log('✅ 複用現有匿名 session:', existingUser.users.display_name);
          this.currentUser = {
            ...existingUser.users,
            run_mode: 'standalone'
          };
          return this.currentUser;
        }
      }
      
      // 沒有現有 session，創建新的匿名用戶
      console.log('🆕 創建新的匿名 session...');
      const { data, error } = await this.supabase.auth.signInAnonymously();
      
      if (error) throw error;
      
      console.log('✅ 匿名 session 創建成功');
      
      // 創建匿名用戶記錄
      await this.createAnonymousUser(data.user);
      
      return this.currentUser;
    } catch (error) {
      console.error('❌ 匿名登入失敗:', error);
      throw error;
    }
  }
  
  async logout() {
    console.log('🚪 登出...');
    
    try {
      // 調用 Supabase 登出（帶超時保護，防止卡住）
      const signOutPromise = this.supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('登出超時')), 5000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
      console.warn('⚠️ 登出時發生錯誤（已忽略）:', error.message);
    }
    
    // 清除內存中的用戶數據
    this.currentUser = null;
    
    // 清除本地存儲的用戶數據
    localStorage.removeItem('user_display_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_avatar_url');
    localStorage.removeItem('user_type');
    
    console.log('✅ 已登出');
  }
  
  onAuthStateChange(callback) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 認證狀態變化:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await this.syncUserToDatabase(session.user);
        callback(event, this.currentUser);
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        callback(event, null);
      }
    });
  }
  
  getRunMode() {
    return 'standalone';
  }
  
  // =====================================================
  // 內部方法
  // =====================================================
  
  /**
   * 同步用戶到 users 表（通用邏輯）
   * 支持 Google 和匿名兩種方式
   */
  async syncUserToDatabase(authUser) {
    try {
      // 判斷用戶類型
      const isAnonymous = authUser.is_anonymous || false;
      const provider = isAnonymous ? 'anonymous' : 'google';
      // 統一使用 authUser.id（即 auth.uid()）作為 provider_id
      // 這樣與 RLS 策略中的 auth.uid() 保持一致
      const providerId = authUser.id;
      
      // 提取用戶信息
      const email = authUser.email || null;
      const displayName = isAnonymous 
        ? `訪客${Math.floor(Math.random() * 10000)}`
        : (authUser.user_metadata?.name || authUser.email?.split('@')[0] || '用戶');
      // 優先從多來源提取頭像 URL（不同提供商字段命名不同）
      let avatarUrl =
        authUser.user_metadata?.picture ||
        authUser.user_metadata?.avatar_url ||
        (Array.isArray(authUser.identities) && authUser.identities[0]?.identity_data?.picture) ||
        (Array.isArray(authUser.identities) && authUser.identities[0]?.identity_data?.avatar_url) ||
        null;

      // 如為 Google 且仍無頭像，嘗試使用 provider token 從 Google UserInfo 補齊
      if (!isAnonymous && !avatarUrl) {
        try {
          const { data: { session } } = await this.supabase.auth.getSession();
          const googleToken = session?.provider_token;
          if (googleToken) {
            const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${googleToken}` }
            });
            if (resp.ok) {
              const info = await resp.json();
              if (info?.picture) {
                avatarUrl = info.picture;
              }
            }
          }
        } catch (e) {
          console.warn('無法從 Google UserInfo 取得頭像:', e);
        }
      }
      
      // 使用通用的查找/創建邏輯
      this.currentUser = await this.findOrCreateUser({
        provider: provider,
        providerId: providerId,
        email: email,
        displayName: displayName,
        avatarUrl: avatarUrl,
        isAnonymous: isAnonymous
      });
      
      console.log(`✅ 用戶同步成功:`, this.currentUser.display_name);
      
      // 保存到 localStorage（快速顯示）
      localStorage.setItem('user_display_name', this.currentUser.display_name);
      if (this.currentUser.email) {
        localStorage.setItem('user_email', this.currentUser.email);
      }
      if (this.currentUser.avatar_url) {
        localStorage.setItem('user_avatar_url', this.currentUser.avatar_url);
      }
      localStorage.setItem('user_type', this.currentUser.user_type);
      
    } catch (error) {
      console.error('❌ 同步用戶失敗:', error);
      throw error;
    }
  }
  
  /**
   * 創建匿名用戶
   */
  async createAnonymousUser(authUser) {
    const providerId = authUser.id;
    
    this.currentUser = await this.findOrCreateUser({
      provider: 'anonymous',
      providerId: providerId,
      email: null,
      displayName: `訪客${Math.floor(Math.random() * 10000)}`,
      avatarUrl: null,
      isAnonymous: true
    });
    
    console.log('✅ 匿名用戶創建成功:', this.currentUser.display_name);
  }
  
  /**
   * 通用的用戶查找/創建邏輯
   * @param {Object} authInfo - 認證信息
   * @returns {Promise<User>}
   */
  async findOrCreateUser(authInfo) {
    const { provider, providerId, email, displayName, avatarUrl, isAnonymous } = authInfo;
    
    // 策略 1：用 provider + providerId 查找身份
    const { data: identityData, error: identityError } = await this.supabase
      .from('user_identities')
      .select('*, users(*)')
      .eq('provider', provider)
      .eq('provider_id', providerId)
      .maybeSingle();
    
    if (identityData && identityData.users) {
      // 找到了已綁定的用戶
      console.log('✅ 找到已存在的用戶（通過身份）');
      const existingUser = identityData.users;
      const updates = { last_login_at: new Date().toISOString() };
      if (!existingUser.avatar_url && avatarUrl) {
        updates.avatar_url = avatarUrl;
      }
      if (!existingUser.display_name && displayName) {
        updates.display_name = displayName;
      }
      if (Object.keys(updates).length > 0) {
        const { data: updated } = await this.supabase
          .from('users')
          .update(updates)
          .eq('id', existingUser.id)
          .select()
          .single();
        return {
          ...(updated || existingUser),
          run_mode: 'standalone'
        };
      }
      return {
        ...existingUser,
        run_mode: 'standalone'
      };
    }
    
    // 策略 2：如果有 email，用 email 查找用戶（跨模式的關鍵）
    let user = null;
    if (email) {
      const { data: userData } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (userData) {
        console.log('✅ 找到已存在的用戶（通過 email）');
        // 如有頭像但資料庫為空，補寫頭像與顯示名稱
        if ((!userData.avatar_url && avatarUrl) || (!userData.display_name && displayName)) {
          const { data: patched } = await this.supabase
            .from('users')
            .update({
              avatar_url: userData.avatar_url || avatarUrl || null,
              display_name: userData.display_name || displayName,
              last_login_at: new Date().toISOString()
            })
            .eq('id', userData.id)
            .select()
            .single();
          user = patched || userData;
        } else {
          user = userData;
        }
      }
    }
    
    // 策略 3：創建新用戶
    if (!user) {
      console.log('📝 創建新用戶...');
      
      const { data: newUser, error: createError } = await this.supabase
        .from('users')
        .insert({
          email: email,
          display_name: displayName,
          avatar_url: avatarUrl,
          user_type: isAnonymous ? 'anonymous' : 'registered',
          last_login_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ 創建用戶失敗:', createError);
        throw createError;
      }
      
      user = newUser;
      console.log('✅ 新用戶創建成功:', user.id);
    } else {
      // 更新最後登入時間
      await this.supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);
    }
    
    // 綁定身份（如果還沒綁定）
    const { error: bindError } = await this.supabase
      .from('user_identities')
      .upsert({
        user_id: user.id,
        provider: provider,
        provider_id: providerId,
        provider_data: email ? { email, displayName, avatarUrl } : null,
        is_primary: true,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'provider,provider_id'
      });
    
    if (bindError) {
      console.error('⚠️ 綁定身份失敗（可能已存在）:', bindError);
      // 不拋出錯誤，因為用戶已創建成功
    } else {
      console.log('✅ 身份綁定成功');
    }
    
    return {
      ...user,
      run_mode: 'standalone'
    };
  }
}

export default StandaloneAuth;

