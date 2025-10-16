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
      // 簡單嘗試獲取當前用戶
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        console.log('ℹ️ 用戶未登入:', error.message);
        return null;
      }
      
      if (user) {
        console.log('✅ 用戶已登入:', user.email || user.id);
        await this.syncUserToDatabase(user);
        return this.currentUser;
      }
      
      console.log('ℹ️ 用戶未登入');
      return null;
      
    } catch (error) {
      console.error('❌ 初始化認證系統時發生錯誤:', error);
      return null;
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
      // 🔧 優化：使用 SessionManager 檢查現有 session
      const sessionManager = (await import('../core/session-manager.js')).default;
      const session = await sessionManager.getSession();
      
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
    
    // 清除 session 緩存
    const sessionManager = (await import('../core/session-manager.js')).default;
    sessionManager.clear();
    
    // 調用 Supabase 登出
    await this.supabase.auth.signOut();
    
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
          // 🔧 優化：使用 SessionManager 獲取 provider token
          const sessionManager = (await import('../core/session-manager.js')).default;
          const googleToken = await sessionManager.getProviderToken();
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
      
      // 🎓 檢查並自動升級年級
      await this.checkGradeUpgrade();
      
      // 保存到 localStorage（快速顯示）
      localStorage.setItem('user_display_name', this.currentUser.display_name);
      if (this.currentUser.email) {
        localStorage.setItem('user_email', this.currentUser.email);
      }
      if (this.currentUser.avatar_url) {
        localStorage.setItem('user_avatar_url', this.currentUser.avatar_url);
      }
      localStorage.setItem('user_type', this.currentUser.user_type);
      if (this.currentUser.grade) {
        localStorage.setItem('user_grade', this.currentUser.grade);
      }
      
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
      
      let userToEnrich = existingUser;
      if (Object.keys(updates).length > 0) {
        const { data: updated } = await this.supabase
          .from('users')
          .update(updates)
          .eq('id', existingUser.id)
          .select()
          .single();
        userToEnrich = updated || existingUser;
      }
      
      // 🚀 加載完整的用戶資料
      const enrichedUser = await this.loadUserCompleteProfile(userToEnrich);
      return {
        ...enrichedUser,
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
    
    // 🚀 加載完整的用戶資料（一次性加載，全程緩存）
    const enrichedUser = await this.loadUserCompleteProfile(user);
    
    return {
      ...enrichedUser,
      run_mode: 'standalone'
    };
  }
  
  /**
   * 加載用戶的完整檔案資料（登入時一次性加載）
   * @param {Object} user - 基本用戶對象
   * @returns {Promise<Object>} - 包含完整信息的用戶對象
   */
  async loadUserCompleteProfile(user) {
    try {
      console.log('📊 加載用戶完整檔案...');
      
      // 1. 加載用戶檔案（校準信息）
      let { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('📋 用戶檔案:', profile ? '已找到' : '未找到（新用戶）');
      
      // 🆕 如果是新用戶（沒有 profile），根據年級創建
      if (!profile && user.grade) {
        console.log('🆕 新用戶，根據年級創建檔案...');
        const { getDifficultyByGrade } = await import('../config/difficulty-levels.js');
        const initialLevel = getDifficultyByGrade(user.grade);
        
        const { data: newProfile, error: createError } = await this.supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            baseline_level: initialLevel,
            current_level: initialLevel,
            calibrated: true,  // ✅ 不再需要校準！
            confidence: 'medium',  // 🆕 初始信心度
            total_games: 0,
            total_rounds: 0
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ 創建用戶檔案失敗:', createError);
        } else {
          profile = newProfile;
          console.log(`✅ 新用戶檔案已創建：年級 ${user.grade} → L${initialLevel}`);
        }
      }
      
      // 2. 加載詞表偏好
      const { data: prefs } = await this.supabase
        .from('user_wordlist_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('📋 詞表偏好:', prefs ? `${prefs.default_mode} 模式` : 'AI 模式（默認）');
      
      // 3. 如果有詞表偏好且選擇了特定詞表，加載詞表信息
      let wordlistInfo = null;
      if (prefs && prefs.default_wordlist_id && prefs.default_mode === 'wordlist') {
        const { data: wordlist } = await this.supabase
          .from('wordlists')
          .select('*')
          .eq('id', prefs.default_wordlist_id)
          .maybeSingle();
        
        if (wordlist) {
          // 加載詞表標籤
          const { data: tags } = await this.supabase
            .from('wordlist_tags')
            .select('*')
            .eq('wordlist_id', wordlist.id)
            .order('tag_level')
            .order('sort_order');
          
          wordlistInfo = {
            id: wordlist.id,
            name: wordlist.name,
            tags: tags || []
          };
          
          console.log('📚 詞表信息已加載:', wordlist.name);
        }
      }
      
      // 4. 組合完整的用戶對象
      return {
        ...user,
        // 用戶檔案信息
        calibrated: profile?.calibrated || false,
        baseline_level: profile?.baseline_level || null,
        current_level: profile?.current_level || 2.0,
        total_games: profile?.total_games || 0,
        // 詞表偏好
        wordlist_preference: {
          default_mode: prefs?.default_mode || 'ai',
          default_wordlist_id: prefs?.default_wordlist_id || null,
          default_level_2_tag: prefs?.default_level_2_tag || null,
          default_level_3_tag: prefs?.default_level_3_tag || null,
          wordlist_info: wordlistInfo
        }
      };
      
    } catch (error) {
      console.error('⚠️ 加載用戶完整檔案失敗（使用默認值）:', error);
      // 降級：返回帶默認值的用戶對象
      return {
        ...user,
        calibrated: false,
        baseline_level: null,
        current_level: 2.0,
        total_games: 0,
        wordlist_preference: {
          default_mode: 'ai',
          default_wordlist_id: null,
          default_level_2_tag: null,
          default_level_3_tag: null,
          wordlist_info: null
        }
      };
    }
  }
  
  /**
   * 檢查並自動升級年級
   * 在用戶登入時調用
   */
  async checkGradeUpgrade() {
    try {
      if (!this.currentUser || !this.currentUser.id) {
        return;
      }
      
      // 動態導入年級管理工具（避免循環依賴）
      const { checkAndUpgradeGrade, showGradeUpgradeNotification } = await import('../utils/grade-manager.js');
      
      const result = await checkAndUpgradeGrade(this.currentUser);
      
      if (result.upgraded) {
        // 更新內存中的用戶對象
        this.currentUser.grade = result.newGrade;
        
        // 顯示升級通知
        showGradeUpgradeNotification(result.oldGrade, result.newGrade);
        
        console.log(`✅ 年級自動升級成功: ${result.oldGrade} → ${result.newGrade}`);
      }
      
    } catch (error) {
      console.error('❌ 檢查年級升級失敗:', error);
      // 不影響登入流程，繼續
    }
  }
}

export default StandaloneAuth;

