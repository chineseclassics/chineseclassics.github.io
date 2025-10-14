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
      // 【新策略】快速判斷 session 類型（通過 localStorage）
      const sessionType = this.detectSessionType();
      console.log('🔍 檢測到 session 類型:', sessionType);
      
      if (sessionType === 'google') {
        // 只對 Google session 嘗試恢復（短超時）
        console.log('🔐 嘗試恢復 Google 用戶...');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getUser 超時')), 3000)
        );
        
        try {
          const { data: { user }, error } = await Promise.race([
            this.supabase.auth.getUser(),
            timeoutPromise
          ]);
          
          if (error) {
            console.warn('⚠️ Google session 驗證失敗:', error.message);
            await this.clearCorruptedSession();
            return null;
          }
          
          if (user) {
            console.log('✅ Google 用戶恢復成功');
            await this.syncUserToDatabase(user);
            return this.currentUser;
          }
        } catch (err) {
          console.warn('⚠️ Google session 已過期或超時，清除:', err.message);
          await this.clearCorruptedSession();
          return null;
        }
      } else if (sessionType === 'none') {
        // 沒有 session，直接返回
        console.log('ℹ️ 用戶未登入');
        return null;
      } else if (sessionType === 'corrupted') {
        // 損壞的 session（理論上已在 supabase-client.js 預清理層處理）
        // 這裡作為雙重保險再次清理
        console.log('⚠️ 檢測到損壞的 session，清理中...');
        await this.clearCorruptedSession();
        return null;
      }
      
      console.log('ℹ️ 用戶未登入');
      return null;
      
    } catch (error) {
      console.error('❌ 初始化認證系統時發生錯誤:', error);
      // 任何未預期的錯誤，清理並返回
      await this.clearCorruptedSession();
      return null;
    }
  }
  
  /**
   * 快速檢測 session 類型（通過 localStorage）
   * 借鑒詩詞組句的成功經驗
   * @returns {string} 'google' | 'anonymous' | 'corrupted' | 'none'
   */
  detectSessionType() {
    try {
      const keys = Object.keys(localStorage);
      
      for (const key of keys) {
        // 檢查所有可能的 Supabase auth token keys
        if (key.includes('supabase.auth.token') || 
            (key.includes('sb-') && key.includes('auth-token'))) {
          try {
            const data = localStorage.getItem(key);
            if (!data) continue;
            
            // 嘗試解析（如果失敗說明損壞）
            const parsed = JSON.parse(data);
            
            // 檢查 provider
            if (parsed.provider === 'google') {
              return 'google';
            } else if (parsed.provider === 'anonymous' || !parsed.provider) {
              // 匿名或未知 provider
              return 'corrupted';
            } else {
              return 'corrupted';
            }
          } catch (e) {
            // JSON 解析失敗 = 損壞
            return 'corrupted';
          }
        }
      }
      
      return 'none';
    } catch (error) {
      console.error('❌ 檢測 session 類型時發生錯誤:', error);
      return 'none';
    }
  }
  
  /**
   * 清理損壞的 session 數據
   * 只在遇到超時或錯誤時調用
   * 借鑒詩詞組句的成功經驗：不調用 signOut，直接清理
   */
  async clearCorruptedSession() {
    try {
      console.log('🧹 清理本地認證數據...');
      
      let cleanedCount = 0;
      
      // 清理 localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });
      
      // 清理 sessionStorage（如果有的話）
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
          cleanedCount++;
        }
      });
      
      console.log(`✅ 已清理 ${cleanedCount} 個存儲項目`);
      
      // 【關鍵】不調用 signOut（避免再次卡住）
      // 直接清理 localStorage 就足夠了
      
      // 【關鍵】等待客戶端重置（借鑒詩詞組句的經驗）
      console.log('⏳ 等待客戶端狀態重置...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ 清理完成');
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
    
    // 🔧 構建正確的重定向 URL
    // 確保即使在 iframe 中也能正確重定向
    let redirectTo = window.location.origin + window.location.pathname;
    
    // 如果 pathname 是 /story-vocab/index.html，規範化為 /story-vocab/
    if (redirectTo.endsWith('/index.html')) {
      redirectTo = redirectTo.replace('/index.html', '/');
    }
    // 確保以斜杠結尾
    if (!redirectTo.endsWith('/')) {
      redirectTo += '/';
    }
    
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
    
    // 清除內存中的用戶數據
    this.currentUser = null;
    
    // 清除本地存儲的用戶數據
    localStorage.removeItem('user_display_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_avatar_url');
    localStorage.removeItem('user_type');
    
    // 清除 Supabase session 數據
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // 嘗試調用 Supabase 登出（短超時，失敗不影響）
    try {
      const signOutPromise = this.supabase.auth.signOut({ scope: 'local' });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('登出超時')), 2000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
      // 忽略錯誤，localStorage 已經清理完畢
      console.warn('⚠️ 登出 API 調用失敗（已忽略）:', error.message);
    }
    
    // 等待客戶端狀態重置
    await new Promise(resolve => setTimeout(resolve, 50));
    
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

