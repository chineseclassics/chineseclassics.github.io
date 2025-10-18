/**
 * 時文寶鑑 - 會話管理模組
 * 
 * 功能：
 * - 管理用戶會話狀態
 * - 處理會話持久化
 * - 提供會話信息查詢接口
 */

/**
 * 會話管理器類
 */
export class SessionManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentSession = null;
        this.currentUser = null;
        this.userRole = null;
        this.listeners = new Set();
    }
    
    /**
     * 初始化會話
     */
    async initialize() {
        console.log('🔐 初始化會話管理器...');
        
        try {
            // 獲取當前會話
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ 獲取會話失敗:', error);
                return null;
            }
            
            if (session) {
                this.currentSession = session;
                this.currentUser = session.user;
                this.userRole = this._detectUserRole(session.user);
                
                console.log('✅ 會話已恢復');
                console.log('👤 用戶:', this.currentUser.email || '匿名');
                console.log('🎭 角色:', this.userRole);
                
                this._notifyListeners({
                    type: 'session_restored',
                    session,
                    user: this.currentUser,
                    role: this.userRole
                });
                
                return session;
            }
            
            console.log('ℹ️ 無現有會話');
            return null;
            
        } catch (error) {
            console.error('❌ 初始化會話失敗:', error);
            return null;
        }
    }
    
    /**
     * 設置會話（登錄後調用）
     */
    setSession(session, user) {
        this.currentSession = session;
        this.currentUser = user;
        this.userRole = this._detectUserRole(user);
        
        console.log('✅ 會話已設置');
        console.log('👤 用戶:', this.currentUser.email || '匿名');
        console.log('🎭 角色:', this.userRole);
        
        this._notifyListeners({
            type: 'session_created',
            session,
            user,
            role: this.userRole
        });
    }
    
    /**
     * 清除會話（登出後調用）
     */
    clearSession() {
        const previousRole = this.userRole;
        
        this.currentSession = null;
        this.currentUser = null;
        this.userRole = null;
        
        console.log('✅ 會話已清除');
        
        this._notifyListeners({
            type: 'session_cleared',
            previousRole
        });
    }
    
    /**
     * 獲取當前用戶
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * 獲取用戶角色
     */
    getUserRole() {
        return this.userRole;
    }
    
    /**
     * 檢查是否已認證
     */
    isAuthenticated() {
        return this.currentSession !== null && this.currentUser !== null;
    }
    
    /**
     * 檢查是否為老師
     */
    isTeacher() {
        return this.userRole === 'teacher';
    }
    
    /**
     * 檢查是否為學生
     */
    isStudent() {
        return this.userRole === 'student';
    }
    
    /**
     * 檢查是否為匿名用戶
     */
    isAnonymous() {
        return this.userRole === 'anonymous';
    }
    
    /**
     * 獲取用戶信息
     */
    getUserInfo() {
        if (!this.currentUser) {
            return null;
        }
        
        return {
            id: this.currentUser.id,
            email: this.currentUser.email,
            fullName: this.currentUser.user_metadata?.full_name || null,
            avatarUrl: this.currentUser.user_metadata?.avatar_url || null,
            role: this.userRole,
            isAnonymous: this.currentUser.is_anonymous || false,
            createdAt: this.currentUser.created_at,
            lastSignIn: this.currentUser.last_sign_in_at
        };
    }
    
    /**
     * 刷新會話（延長會話有效期）
     */
    async refreshSession() {
        try {
            const { data, error } = await this.supabase.auth.refreshSession();
            
            if (error) {
                console.error('❌ 刷新會話失敗:', error);
                return false;
            }
            
            if (data.session) {
                this.currentSession = data.session;
                this.currentUser = data.session.user;
                
                console.log('✅ 會話已刷新');
                
                this._notifyListeners({
                    type: 'session_refreshed',
                    session: data.session,
                    user: this.currentUser
                });
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ 刷新會話異常:', error);
            return false;
        }
    }
    
    /**
     * 添加會話變化監聽器
     */
    addListener(callback) {
        this.listeners.add(callback);
        
        // 返回取消訂閱函數
        return () => {
            this.listeners.delete(callback);
        };
    }
    
    /**
     * 移除監聽器
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    /**
     * 檢測用戶角色（私有方法）
     */
    _detectUserRole(user) {
        // 匿名用戶
        if (user.is_anonymous) {
            return 'anonymous';
        }
        
        const email = user.email;
        
        // 根據郵箱格式識別
        if (/@isf\.edu\.hk$/.test(email)) {
            return 'teacher';
        } else if (/@student\.isf\.edu\.hk$/.test(email)) {
            return 'student';
        }
        
        // 默認為學生
        return 'student';
    }
    
    /**
     * 通知所有監聽器（私有方法）
     */
    _notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('❌ 監聽器執行失敗:', error);
            }
        });
    }
}

/**
 * 創建會話管理器實例
 */
export function createSessionManager(supabaseClient) {
    return new SessionManager(supabaseClient);
}

