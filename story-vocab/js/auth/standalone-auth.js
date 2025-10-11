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
    
    // 檢查現有 session
    const { data: { session }, error } = await this.supabase.auth.getSession();
    
    if (error) {
      console.error('❌ 獲取 session 失敗:', error);
      return null;
    }
    
    if (session) {
      console.log('✅ 發現已有 session');
      await this.syncUserToDatabase(session.user);
      return this.currentUser;
    }
    
    console.log('ℹ️ 用戶未登入');
    return null;
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
    
    const redirectTo = window.location.origin + window.location.pathname;
    
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        scopes: 'openid profile email',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    
    if (error) {
      console.error('❌ Google 登入失敗:', error);
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
    console.log('🚪 登出（獨立模式）...');
    
    await this.supabase.auth.signOut();
    this.currentUser = null;
    
    // 清除 localStorage
    localStorage.removeItem('user_display_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_avatar_url');
    localStorage.removeItem('user_type');
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
      const providerId = isAnonymous ? authUser.id : (authUser.user_metadata?.sub || authUser.id);
      
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

