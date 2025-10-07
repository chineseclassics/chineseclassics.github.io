/**
 * 会话管理模块
 * 管理与 Supabase 的会话交互
 */

import { createStorySession as supabaseCreateSession } from '../supabase-client.js';

/**
 * 创建游戏会话
 * @param {string} userId - 用户 ID
 * @param {Object} config - 会话配置
 * @returns {Promise<Object>} 会话对象
 */
export async function createSession(userId, config) {
    try {
        const session = await supabaseCreateSession(userId, config);
        return session;
    } catch (error) {
        console.error('创建会话失败:', error);
        throw error;
    }
}

