/**
 * 時文寶鑑 - 角色檢測模組
 * 
 * 功能：
 * - 根據用戶郵箱自動識別角色
 * - 提供角色驗證接口
 * - 管理角色權限邏輯
 */

import { AUTH_CONFIG } from '../config/supabase-config.js';

/**
 * 用戶角色枚舉
 */
export const UserRole = {
    TEACHER: 'teacher',
    STUDENT: 'student',
    ANONYMOUS: 'anonymous'
};

/**
 * 角色權限定義
 */
const ROLE_PERMISSIONS = {
    [UserRole.TEACHER]: [
        'create_class',
        'manage_students',
        'create_assignment',
        'grade_essay',
        'view_analytics',
        'manage_rubric'
    ],
    [UserRole.STUDENT]: [
        'view_assignments',
        'write_essay',
        'request_feedback',
        'submit_essay',
        'view_grades'
    ],
    [UserRole.ANONYMOUS]: [
        'view_assignments',
        'write_essay',
        'request_feedback'
    ]
};

/**
 * 檢測用戶角色
 * 
 * @param {Object} user - Supabase 用戶對象
 * @returns {string} - 用戶角色 ('teacher' | 'student' | 'anonymous')
 */
export function detectUserRole(user) {
    if (!user) {
        return null;
    }
    
    // 檢查是否為匿名用戶
    if (user.is_anonymous) {
        console.log('🎭 檢測到匿名用戶');
        return UserRole.ANONYMOUS;
    }
    
    // 檢查郵箱格式
    const email = user.email;
    
    if (!email) {
        console.warn('⚠️ 用戶無郵箱，默認為學生角色');
        return UserRole.STUDENT;
    }
    
    // ISF 老師郵箱：*@isf.edu.hk
    if (AUTH_CONFIG.teacherEmailPattern.test(email)) {
        console.log('👨‍🏫 檢測到老師賬號:', email);
        return UserRole.TEACHER;
    }
    
    // ISF 學生郵箱：*@student.isf.edu.hk
    if (AUTH_CONFIG.studentEmailPattern.test(email)) {
        console.log('👨‍🎓 檢測到學生賬號:', email);
        return UserRole.STUDENT;
    }
    
    // 其他郵箱默認為學生
    console.log('ℹ️ 非 ISF 郵箱，默認為學生角色:', email);
    return UserRole.STUDENT;
}

/**
 * 驗證用戶是否為老師
 */
export function isTeacher(user) {
    return detectUserRole(user) === UserRole.TEACHER;
}

/**
 * 驗證用戶是否為學生
 */
export function isStudent(user) {
    return detectUserRole(user) === UserRole.STUDENT;
}

/**
 * 驗證用戶是否為匿名用戶
 */
export function isAnonymous(user) {
    return detectUserRole(user) === UserRole.ANONYMOUS;
}

/**
 * 檢查用戶是否有特定權限
 * 
 * @param {string} role - 用戶角色
 * @param {string} permission - 權限名稱
 * @returns {boolean} - 是否有權限
 */
export function hasPermission(role, permission) {
    const permissions = ROLE_PERMISSIONS[role];
    
    if (!permissions) {
        console.warn('⚠️ 無效的角色:', role);
        return false;
    }
    
    return permissions.includes(permission);
}

/**
 * 獲取角色的所有權限
 * 
 * @param {string} role - 用戶角色
 * @returns {Array<string>} - 權限列表
 */
export function getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
}

/**
 * 獲取角色的顯示名稱
 * 
 * @param {string} role - 用戶角色
 * @returns {string} - 顯示名稱
 */
export function getRoleDisplayName(role) {
    const displayNames = {
        [UserRole.TEACHER]: '老師',
        [UserRole.STUDENT]: '學生',
        [UserRole.ANONYMOUS]: '匿名測試'
    };
    
    return displayNames[role] || '未知';
}

/**
 * 獲取角色圖標
 * 
 * @param {string} role - 用戶角色
 * @returns {string} - Font Awesome 圖標類名
 */
export function getRoleIcon(role) {
    const icons = {
        [UserRole.TEACHER]: 'fas fa-chalkboard-teacher',
        [UserRole.STUDENT]: 'fas fa-user-graduate',
        [UserRole.ANONYMOUS]: 'fas fa-user-secret'
    };
    
    return icons[role] || 'fas fa-user';
}

/**
 * 獲取角色顏色
 * 
 * @param {string} role - 用戶角色
 * @returns {string} - Tailwind 顏色類名
 */
export function getRoleColor(role) {
    const colors = {
        [UserRole.TEACHER]: 'blue',
        [UserRole.STUDENT]: 'green',
        [UserRole.ANONYMOUS]: 'gray'
    };
    
    return colors[role] || 'gray';
}

/**
 * 驗證角色切換是否允許
 * 
 * @param {string} fromRole - 當前角色
 * @param {string} toRole - 目標角色
 * @returns {boolean} - 是否允許切換
 */
export function canSwitchRole(fromRole, toRole) {
    // 匿名用戶不允許切換到其他角色
    if (fromRole === UserRole.ANONYMOUS) {
        return false;
    }
    
    // 老師和學生之間不允許直接切換（需要重新登錄）
    if (fromRole === UserRole.TEACHER && toRole === UserRole.STUDENT) {
        return false;
    }
    
    if (fromRole === UserRole.STUDENT && toRole === UserRole.TEACHER) {
        return false;
    }
    
    return true;
}

