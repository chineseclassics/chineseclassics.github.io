/**
 * 年級管理工具模塊
 * 處理年級自動升級、年級配置等功能
 */

import { getSupabase } from '../supabase-client.js';
import { showToast } from './toast.js';

/**
 * 年級到難度的映射配置（L1-L5 體系）
 * 對應 5 個年級階段
 */
export const GRADE_TO_DIFFICULTY = {
  // 低年級（L1）
  1: { center: 1.0, range: [1, 2], minLevel: 1.0, maxLevel: 1.5 },
  2: { center: 1.2, range: [1, 2], minLevel: 1.0, maxLevel: 2.0 },
  3: { center: 1.5, range: [1, 2], minLevel: 1.0, maxLevel: 2.0 },
  
  // 中年級（L2）
  4: { center: 2.0, range: [1, 3], minLevel: 1.5, maxLevel: 2.5 },
  5: { center: 2.3, range: [2, 3], minLevel: 2.0, maxLevel: 3.0 },
  6: { center: 2.5, range: [2, 3], minLevel: 2.0, maxLevel: 3.0 },
  
  // 初中（L3）
  7: { center: 3.0, range: [2, 4], minLevel: 2.5, maxLevel: 3.5 },
  8: { center: 3.3, range: [3, 4], minLevel: 3.0, maxLevel: 4.0 },
  9: { center: 3.5, range: [3, 4], minLevel: 3.0, maxLevel: 4.0 },
  
  // 高中（L4）
  10: { center: 4.0, range: [3, 5], minLevel: 3.5, maxLevel: 4.5 },
  11: { center: 4.3, range: [4, 5], minLevel: 4.0, maxLevel: 5.0 },
  12: { center: 4.5, range: [4, 5], minLevel: 4.0, maxLevel: 5.0 },
  
  // 大學及以上（L5）
  13: { center: 5.0, range: [4, 5], minLevel: 4.5, maxLevel: 5.0 }
};

/**
 * 年級階段劃分（用於 AI 風格和主題）
 */
export const GRADE_STAGES = {
  'elementary_lower': { name: '低年級', grades: [1, 2, 3], ageRange: '6-8歲' },
  'elementary_upper': { name: '中年級', grades: [4, 5, 6], ageRange: '9-11歲' },
  'middle_school': { name: '初中', grades: [7, 8, 9], ageRange: '12-14歲' },
  'high_school': { name: '高中', grades: [10, 11, 12], ageRange: '15-17歲' },
  'adult': { name: '成人', grades: [13], ageRange: '18歲+' }
};

/**
 * 年級選項列表（用於 UI）
 */
export const GRADE_OPTIONS = [
  { value: 1, label: '1年級', ageLabel: '約6歲' },
  { value: 2, label: '2年級', ageLabel: '約7歲' },
  { value: 3, label: '3年級', ageLabel: '約8歲' },
  { value: 4, label: '4年級', ageLabel: '約9歲' },
  { value: 5, label: '5年級', ageLabel: '約10歲' },
  { value: 6, label: '6年級', ageLabel: '約11歲' },
  { value: 7, label: '7年級', ageLabel: '約12歲' },
  { value: 8, label: '8年級', ageLabel: '約13歲' },
  { value: 9, label: '9年級', ageLabel: '約14歲' },
  { value: 10, label: '10年級', ageLabel: '約15歲' },
  { value: 11, label: '11年級', ageLabel: '約16歲' },
  { value: 12, label: '12年級', ageLabel: '約17歲' },
  { value: 13, label: '12年級以上', ageLabel: '成人' }
];

/**
 * 獲取年級對應的階段
 * @param {number} grade - 年級（1-13）
 * @returns {string} - 階段標識
 */
export function getGradeStage(grade) {
  for (const [stageId, stageInfo] of Object.entries(GRADE_STAGES)) {
    if (stageInfo.grades.includes(grade)) {
      return stageId;
    }
  }
  return 'elementary_upper'; // 默認中年級
}

/**
 * 獲取年級對應的難度配置
 * @param {number} grade - 年級（1-13）
 * @returns {Object} - 難度配置 { center, range, minLevel, maxLevel }
 */
export function getGradeDifficulty(grade) {
  return GRADE_TO_DIFFICULTY[grade] || GRADE_TO_DIFFICULTY[6]; // 默認6年級
}

/**
 * 獲取年級顯示名稱
 * @param {number} grade - 年級（1-13）
 * @returns {string} - 顯示名稱（如 "8年級"）
 */
export function getGradeLabel(grade) {
  const option = GRADE_OPTIONS.find(opt => opt.value === grade);
  return option ? option.label : `${grade}年級`;
}

/**
 * 獲取年級對應年齡
 * @param {number} grade - 年級（1-13）
 * @returns {string} - 年齡標籤（如 "約13歲"）
 */
export function getGradeAgeLabel(grade) {
  const option = GRADE_OPTIONS.find(opt => opt.value === grade);
  return option ? option.ageLabel : '';
}

/**
 * 檢查是否應該升級年級（前端邏輯）
 * @param {Date|string} gradeSetAt - 年級設定時間
 * @param {number} currentGrade - 當前年級
 * @returns {boolean} - 是否應該升級
 */
export function shouldUpgradeGrade(gradeSetAt, currentGrade) {
  // 如果已經是最高年級，不再升級
  if (currentGrade >= 13) {
    return false;
  }
  
  if (!gradeSetAt) {
    return false;
  }
  
  const setDate = new Date(gradeSetAt);
  const currentDate = new Date();
  
  const setYear = setDate.getFullYear();
  const setMonth = setDate.getMonth(); // 0-11
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11
  
  let yearsPassed = currentYear - setYear;
  
  // 9月為學年分界點（月份0-11，9月是第8個月索引）
  if (currentMonth >= 8 && setMonth < 8) {
    // 當前已過9月，設定時未過9月 → 已跨越學年
    // yearsPassed 保持不變
  } else if (currentMonth < 8 && setMonth >= 8) {
    // 當前未過9月，設定時已過9月 → 還在同一學年
    yearsPassed--;
  }
  
  return yearsPassed > 0;
}

/**
 * 計算當前應該的年級
 * @param {Date|string} gradeSetAt - 年級設定時間
 * @param {number} initialGrade - 初始年級
 * @returns {number} - 計算出的當前年級
 */
export function calculateCurrentGrade(gradeSetAt, initialGrade) {
  if (!gradeSetAt || !initialGrade) {
    return initialGrade || 6;
  }
  
  const setDate = new Date(gradeSetAt);
  const currentDate = new Date();
  
  const setYear = setDate.getFullYear();
  const setMonth = setDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  let yearsPassed = currentYear - setYear;
  
  // 9月為學年分界點
  if (currentMonth >= 8 && setMonth < 8) {
    // 已跨越學年
  } else if (currentMonth < 8 && setMonth >= 8) {
    // 還在同一學年
    yearsPassed--;
  }
  
  const calculatedGrade = initialGrade + yearsPassed;
  
  // 限制在 1-13 範圍內
  return Math.max(1, Math.min(13, calculatedGrade));
}

/**
 * 檢查並自動升級用戶年級
 * @param {Object} user - 用戶對象（包含 id, grade, grade_set_at）
 * @returns {Promise<Object>} - { upgraded: boolean, newGrade: number, oldGrade: number }
 */
export async function checkAndUpgradeGrade(user) {
  try {
    if (!user || !user.id) {
      console.warn('⚠️ 無效的用戶對象');
      return { upgraded: false, newGrade: user?.grade || 6, oldGrade: user?.grade || 6 };
    }
    
    const currentGrade = user.grade || 6;
    const gradeSetAt = user.grade_set_at;
    
    // 檢查是否應該升級
    if (!shouldUpgradeGrade(gradeSetAt, currentGrade)) {
      console.log('✅ 年級無需升級');
      return { upgraded: false, newGrade: currentGrade, oldGrade: currentGrade };
    }
    
    // 計算新年級
    const newGrade = calculateCurrentGrade(gradeSetAt, currentGrade);
    
    if (newGrade === currentGrade) {
      console.log('✅ 年級已是最新');
      return { upgraded: false, newGrade: currentGrade, oldGrade: currentGrade };
    }
    
    // 更新數據庫
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .update({
        grade: newGrade,
        grade_set_at: new Date().toISOString(),
        grade_auto_upgraded: true
      })
      .eq('id', user.id);
    
    if (error) {
      console.error('❌ 升級年級失敗:', error);
      return { upgraded: false, newGrade: currentGrade, oldGrade: currentGrade };
    }
    
    console.log(`✅ 年級自動升級：${currentGrade} → ${newGrade}`);
    
    return {
      upgraded: true,
      newGrade: newGrade,
      oldGrade: currentGrade
    };
    
  } catch (error) {
    console.error('❌ 檢查年級升級失敗:', error);
    return { upgraded: false, newGrade: user?.grade || 6, oldGrade: user?.grade || 6 };
  }
}

/**
 * 更新用戶年級
 * @param {string} userId - 用戶 ID
 * @param {number} newGrade - 新年級（1-13）
 * @returns {Promise<boolean>} - 是否成功
 */
export async function updateUserGrade(userId, newGrade) {
  try {
    console.log('🔍 [updateUserGrade] 開始執行，參數:', { userId, newGrade });
    
    if (!userId || !newGrade) {
      console.error('❌ 缺少必要參數');
      return false;
    }
    
    if (newGrade < 1 || newGrade > 13) {
      console.error('❌ 年級範圍錯誤:', newGrade);
      return false;
    }
    
    console.log('🔍 [updateUserGrade] 準備更新數據庫...');
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .update({
        grade: newGrade,
        grade_set_at: new Date().toISOString(),
        grade_auto_upgraded: false // 手動設定，重置自動升級標記
      })
      .eq('id', userId);
    
    console.log('🔍 [updateUserGrade] 數據庫響應:', { error });
    
    if (error) {
      console.error('❌ 更新年級失敗:', error);
      return false;
    }
    
    console.log(`✅ 年級更新成功: ${newGrade}`);
    return true;
    
  } catch (error) {
    console.error('❌ 更新年級異常:', error);
    console.error('   錯誤詳情:', error.message);
    console.error('   錯誤堆棧:', error.stack);
    return false;
  }
}

/**
 * 獲取年級配置（從數據庫）
 * @param {number} grade - 年級
 * @returns {Promise<Object|null>} - 年級配置對象
 */
export async function getGradeConfig(grade) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('grade_configs')
      .select('*')
      .eq('grade', grade)
      .single();
    
    if (error) {
      console.error('❌ 獲取年級配置失敗:', error);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ 獲取年級配置異常:', error);
    return null;
  }
}

/**
 * 顯示年級升級通知
 * @param {number} oldGrade - 舊年級
 * @param {number} newGrade - 新年級
 */
export function showGradeUpgradeNotification(oldGrade, newGrade) {
  const message = `🎉 恭喜升級到 ${getGradeLabel(newGrade)}！`;
  showToast(message, 'success', 3000);
}

