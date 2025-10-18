/**
 * 時文寶鑑 - 前端路由管理
 * 
 * 功能：
 * - 基於 Hash 的前端路由
 * - 頁面導航管理
 * - 路由守衛（權限控制）
 */

/**
 * 路由定義
 */
const ROUTES = {
    // 公開路由
    '/': { screen: 'login', requireAuth: false },
    '/login': { screen: 'login', requireAuth: false },
    
    // 老師路由
    '/teacher': { screen: 'teacher-dashboard', requireAuth: true, role: 'teacher' },
    '/teacher/classes': { screen: 'teacher-classes', requireAuth: true, role: 'teacher' },
    '/teacher/assignments': { screen: 'teacher-assignments', requireAuth: true, role: 'teacher' },
    '/teacher/grading': { screen: 'teacher-grading', requireAuth: true, role: 'teacher' },
    
    // 學生路由
    '/student': { screen: 'student-dashboard', requireAuth: true, role: 'student' },
    '/student/assignments': { screen: 'student-assignments', requireAuth: true, role: 'student' },
    '/student/essay/:id': { screen: 'student-essay-editor', requireAuth: true, role: 'student' },
    '/student/grades': { screen: 'student-grades', requireAuth: true, role: 'student' }
};

/**
 * 路由器類
 */
export class Router {
    constructor() {
        this.currentRoute = null;
        this.currentParams = {};
        this.listeners = new Set();
        this.isAuthenticated = false;
        this.userRole = null;
        
        // 綁定 hashchange 事件
        window.addEventListener('hashchange', () => this._handleHashChange());
        
        // 綁定 popstate 事件（處理瀏覽器後退/前進）
        window.addEventListener('popstate', () => this._handleHashChange());
    }
    
    /**
     * 初始化路由器
     */
    initialize(isAuth, role) {
        console.log('🔀 初始化路由器...');
        console.log('  認證狀態:', isAuth);
        console.log('  用戶角色:', role);
        
        this.isAuthenticated = isAuth;
        this.userRole = role;
        
        // 處理當前路由
        this._handleHashChange();
    }
    
    /**
     * 更新認證狀態
     */
    updateAuthState(isAuth, role) {
        this.isAuthenticated = isAuth;
        this.userRole = role;
        
        console.log('🔀 更新認證狀態');
        console.log('  認證狀態:', isAuth);
        console.log('  用戶角色:', role);
        
        // 重新評估當前路由
        this._handleHashChange();
    }
    
    /**
     * 導航到指定路由
     */
    navigate(path, params = {}) {
        console.log('🔀 導航到:', path);
        
        // 構建完整路徑（包含參數）
        let fullPath = path;
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            fullPath += '?' + queryString;
        }
        
        // 更新 hash
        window.location.hash = fullPath;
    }
    
    /**
     * 替換當前路由（不產生歷史記錄）
     */
    replace(path, params = {}) {
        console.log('🔀 替換路由:', path);
        
        let fullPath = path;
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            fullPath += '?' + queryString;
        }
        
        window.history.replaceState(null, '', '#' + fullPath);
        this._handleHashChange();
    }
    
    /**
     * 返回上一頁
     */
    back() {
        window.history.back();
    }
    
    /**
     * 獲取當前路由
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    /**
     * 獲取路由參數
     */
    getParams() {
        return this.currentParams;
    }
    
    /**
     * 添加路由變化監聽器
     */
    addListener(callback) {
        this.listeners.add(callback);
        
        return () => {
            this.listeners.delete(callback);
        };
    }
    
    /**
     * 處理 hash 變化
     */
    _handleHashChange() {
        // 獲取當前 hash（移除 # 號）
        const hash = window.location.hash.slice(1) || '/';
        
        // 解析路徑和查詢參數
        const [path, queryString] = hash.split('?');
        const params = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
        
        console.log('🔀 路由變化:', path);
        
        // 匹配路由
        const route = this._matchRoute(path);
        
        if (!route) {
            console.warn('⚠️ 路由未找到:', path);
            this._handleNotFound();
            return;
        }
        
        // 檢查認證要求
        if (route.requireAuth && !this.isAuthenticated) {
            console.log('🔒 需要認證，重定向到登錄');
            this.replace('/login');
            return;
        }
        
        // 檢查角色權限
        if (route.role && route.role !== this.userRole) {
            console.log('🚫 角色權限不足');
            this._handleUnauthorized();
            return;
        }
        
        // 更新當前路由
        this.currentRoute = route;
        this.currentParams = { ...params, ...route.params };
        
        // 通知監聽器
        this._notifyListeners({
            route,
            path,
            params: this.currentParams
        });
    }
    
    /**
     * 匹配路由
     */
    _matchRoute(path) {
        // 精確匹配
        if (ROUTES[path]) {
            return { ...ROUTES[path], params: {} };
        }
        
        // 參數匹配（如 /student/essay/:id）
        for (const [pattern, config] of Object.entries(ROUTES)) {
            const regex = this._pathToRegex(pattern);
            const match = path.match(regex);
            
            if (match) {
                const params = this._extractParams(pattern, match);
                return { ...config, params };
            }
        }
        
        return null;
    }
    
    /**
     * 將路徑模式轉換為正則表達式
     */
    _pathToRegex(pattern) {
        const regexPattern = pattern
            .replace(/\//g, '\\/')
            .replace(/:(\w+)/g, '([^\\/]+)');
        
        return new RegExp(`^${regexPattern}$`);
    }
    
    /**
     * 提取路徑參數
     */
    _extractParams(pattern, match) {
        const paramNames = (pattern.match(/:(\w+)/g) || []).map(p => p.slice(1));
        const params = {};
        
        paramNames.forEach((name, index) => {
            params[name] = match[index + 1];
        });
        
        return params;
    }
    
    /**
     * 處理 404
     */
    _handleNotFound() {
        console.log('❌ 404 - 頁面不存在');
        
        // 根據認證狀態重定向
        if (this.isAuthenticated) {
            if (this.userRole === 'teacher') {
                this.replace('/teacher');
            } else {
                this.replace('/student');
            }
        } else {
            this.replace('/login');
        }
    }
    
    /**
     * 處理權限不足
     */
    _handleUnauthorized() {
        console.log('🚫 403 - 權限不足');
        
        // 重定向到對應角色的首頁
        if (this.userRole === 'teacher') {
            this.replace('/teacher');
        } else if (this.userRole === 'student') {
            this.replace('/student');
        } else {
            this.replace('/login');
        }
    }
    
    /**
     * 通知所有監聽器
     */
    _notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('❌ 路由監聽器執行失敗:', error);
            }
        });
    }
}

/**
 * 創建路由器實例
 */
export function createRouter() {
    return new Router();
}

/**
 * 導出路由定義（供其他模組使用）
 */
export { ROUTES };

