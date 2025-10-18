/**
 * 時文寶鑑 - Google OAuth 認證模組
 * 
 * 功能：
 * - 處理 Google OAuth 登錄流程
 * - 管理 OAuth 回調
 * - 處理認證錯誤
 */

import { SUPABASE_CONFIG } from '../config/supabase-config.js';

/**
 * Google OAuth 配置
 */
const GOOGLE_AUTH_CONFIG = {
    redirectTo: window.location.origin + '/shiwen-baojian/index.html',
    scopes: 'email profile',
    queryParams: {
        access_type: 'offline',
        prompt: 'consent'
    }
};

/**
 * 發起 Google 登錄
 */
export async function signInWithGoogle(supabaseClient) {
    console.log('🔐 開始 Google OAuth 登錄流程...');
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: GOOGLE_AUTH_CONFIG.redirectTo,
                queryParams: GOOGLE_AUTH_CONFIG.queryParams
            }
        });
        
        if (error) {
            console.error('❌ Google OAuth 失敗:', error);
            throw new Error(`Google 登錄失敗: ${error.message}`);
        }
        
        console.log('✅ 正在重定向到 Google...');
        
        // OAuth 流程會自動重定向，無需返回值
        return { success: true };
        
    } catch (error) {
        console.error('❌ Google 登錄異常:', error);
        throw error;
    }
}

/**
 * 處理 OAuth 回調
 * 
 * 當用戶從 Google 返回時，URL 中會包含認證信息
 * Supabase SDK 會自動處理，但我們需要檢測並確認
 */
export async function handleOAuthCallback(supabaseClient) {
    console.log('🔍 檢查 OAuth 回調...');
    
    try {
        // 檢查 URL 中是否有認證參數
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hasAuthParams = hashParams.has('access_token') || hashParams.has('error');
        
        if (!hasAuthParams) {
            console.log('ℹ️ 無 OAuth 回調參數');
            return { isCallback: false };
        }
        
        console.log('✅ 檢測到 OAuth 回調');
        
        // 檢查是否有錯誤
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        
        if (error) {
            console.error('❌ OAuth 回調錯誤:', error, errorDescription);
            
            // 清理 URL
            cleanUrl();
            
            return {
                isCallback: true,
                success: false,
                error: error,
                errorDescription: errorDescription
            };
        }
        
        // 獲取會話（Supabase SDK 已自動處理令牌）
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
            console.error('❌ 獲取會話失敗:', sessionError);
            cleanUrl();
            
            return {
                isCallback: true,
                success: false,
                error: sessionError.message
            };
        }
        
        if (!session) {
            console.error('❌ OAuth 回調後無會話');
            cleanUrl();
            
            return {
                isCallback: true,
                success: false,
                error: '登錄失敗，請重試'
            };
        }
        
        console.log('✅ Google 登錄成功');
        console.log('👤 用戶:', session.user.email);
        
        // 清理 URL
        cleanUrl();
        
        return {
            isCallback: true,
            success: true,
            session: session,
            user: session.user
        };
        
    } catch (error) {
        console.error('❌ 處理 OAuth 回調異常:', error);
        cleanUrl();
        
        return {
            isCallback: true,
            success: false,
            error: error.message
        };
    }
}

/**
 * 清理 URL 中的認證參數
 */
function cleanUrl() {
    // 使用 replaceState 清理 URL，不會觸發頁面刷新
    if (window.location.hash) {
        window.history.replaceState(
            null,
            document.title,
            window.location.pathname + window.location.search
        );
    }
}

/**
 * 匿名登錄
 */
export async function signInAnonymously(supabaseClient) {
    console.log('🎭 開始匿名登錄...');
    
    try {
        const { data, error } = await supabaseClient.auth.signInAnonymously();
        
        if (error) {
            console.error('❌ 匿名登錄失敗:', error);
            throw new Error(`匿名登錄失敗: ${error.message}`);
        }
        
        console.log('✅ 匿名登錄成功');
        console.log('👤 用戶 ID:', data.user.id);
        
        return {
            success: true,
            session: data.session,
            user: data.user
        };
        
    } catch (error) {
        console.error('❌ 匿名登錄異常:', error);
        throw error;
    }
}

/**
 * 登出
 */
export async function signOut(supabaseClient) {
    console.log('👋 開始登出...');
    
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('❌ 登出失敗:', error);
            throw new Error(`登出失敗: ${error.message}`);
        }
        
        console.log('✅ 登出成功');
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ 登出異常:', error);
        throw error;
    }
}

