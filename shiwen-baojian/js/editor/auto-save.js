/**
 * 時文寶鑑 - 自動保存模組
 * 
 * 功能：
 * - 自動保存論文內容到數據庫
 * - 防抖延遲（3秒）
 * - 離線緩存支持
 * - 保存狀態指示
 * - 版本快照管理
 */

/**
 * 保存狀態
 */
export const SaveStatus = {
    IDLE: 'idle',           // 空閒
    PENDING: 'pending',     // 待保存
    SAVING: 'saving',       // 保存中
    SAVED: 'saved',         // 已保存
    ERROR: 'error',         // 保存失敗
    OFFLINE: 'offline'      // 離線模式
};

/**
 * 自動保存管理器類
 */
export class AutoSaveManager {
    constructor(supabaseClient, essayId, options = {}) {
        this.supabase = supabaseClient;
        this.essayId = essayId;
        
        this.options = {
            delay: options.delay || 3000,          // 防抖延遲（3秒）
            enableOffline: options.enableOffline !== false,  // 離線緩存
            onStatusChange: options.onStatusChange || null,
            onSaveSuccess: options.onSaveSuccess || null,
            onSaveError: options.onSaveError || null
        };
        
        this.status = SaveStatus.IDLE;
        this.saveTimer = null;
        this.pendingData = null;
        this.lastSaveTime = null;
        this.isOnline = navigator.onLine;
        
        // 離線緩存鍵
        this.cacheKey = `shiwen_baojian_essay_${essayId}`;
        
        this._initialize();
    }
    
    /**
     * 初始化
     */
    _initialize() {
        console.log('💾 初始化自動保存管理器...');
        console.log(`  論文 ID: ${this.essayId}`);
        console.log(`  延遲: ${this.options.delay}ms`);
        console.log(`  離線支持: ${this.options.enableOffline}`);
        
        // 監聽網絡狀態
        window.addEventListener('online', () => this._handleOnline());
        window.addEventListener('offline', () => this._handleOffline());
        
        // 嘗試恢復離線數據
        if (this.options.enableOffline) {
            this._restoreOfflineData();
        }
        
        console.log('✅ 自動保存管理器初始化完成');
    }
    
    /**
     * 請求保存（防抖）
     */
    requestSave(data) {
        // 清除現有計時器
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        
        // 保存待保存數據
        this.pendingData = data;
        
        // 更新狀態
        this._setStatus(SaveStatus.PENDING);
        
        // 設置新的計時器
        this.saveTimer = setTimeout(() => {
            this._performSave();
        }, this.options.delay);
    }
    
    /**
     * 立即保存
     */
    async saveNow(data = null) {
        // 清除計時器
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        
        // 使用提供的數據或待保存數據
        const saveData = data || this.pendingData;
        
        if (!saveData) {
            console.warn('⚠️ 無待保存數據');
            return { success: false, error: '無數據' };
        }
        
        this.pendingData = saveData;
        return await this._performSave();
    }
    
    /**
     * 執行保存
     */
    async _performSave() {
        if (!this.pendingData) {
            return { success: false, error: '無數據' };
        }
        
        // 更新狀態
        this._setStatus(SaveStatus.SAVING);
        
        try {
            // 檢查網絡狀態
            if (!this.isOnline) {
                console.log('📡 離線模式，保存到本地緩存');
                this._saveToCache(this.pendingData);
                this._setStatus(SaveStatus.OFFLINE);
                return { success: true, offline: true };
            }
            
            // 保存到數據庫
            const result = await this._saveToDatabase(this.pendingData);
            
            if (result.success) {
                this.lastSaveTime = new Date();
                this._setStatus(SaveStatus.SAVED);
                
                // 清除離線緩存
                if (this.options.enableOffline) {
                    this._clearCache();
                }
                
                // 調用成功回調
                if (this.options.onSaveSuccess) {
                    this.options.onSaveSuccess(result);
                }
                
                // 2秒後恢復為空閒狀態
                setTimeout(() => {
                    if (this.status === SaveStatus.SAVED) {
                        this._setStatus(SaveStatus.IDLE);
                    }
                }, 2000);
                
                return result;
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ 保存失敗:', error);
            
            // 保存到離線緩存
            if (this.options.enableOffline) {
                this._saveToCache(this.pendingData);
            }
            
            this._setStatus(SaveStatus.ERROR);
            
            // 調用錯誤回調
            if (this.options.onSaveError) {
                this.options.onSaveError(error);
            }
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 保存到數據庫
     */
    async _saveToDatabase(data) {
        console.log('💾 保存到數據庫...');
        
        try {
            // 準備數據
            const essayData = {
                id: this.essayId,
                structure: data.structure,
                updated_at: new Date().toISOString()
            };
            
            // Upsert 論文
            const { data: essayResult, error: essayError } = await this.supabase
                .from('essays')
                .upsert(essayData)
                .select()
                .single();
            
            if (essayError) {
                throw essayError;
            }
            
            // 保存段落（批量）
            const paragraphs = this._extractParagraphs(data.structure);
            
            if (paragraphs.length > 0) {
                const { error: paragraphsError } = await this.supabase
                    .from('paragraphs')
                    .upsert(paragraphs);
                
                if (paragraphsError) {
                    throw paragraphsError;
                }
            }
            
            console.log('✅ 保存成功');
            
            return {
                success: true,
                essay: essayResult,
                savedAt: new Date()
            };
            
        } catch (error) {
            console.error('❌ 數據庫保存失敗:', error);
            throw error;
        }
    }
    
    /**
     * 提取段落數據
     */
    _extractParagraphs(structure) {
        const paragraphs = [];
        
        // 引言
        if (structure.introduction) {
            paragraphs.push({
                id: structure.introduction.id,
                essay_id: this.essayId,
                type: 'introduction',
                content: structure.introduction.content,
                order: 0,
                parent_id: null,
                updated_at: new Date().toISOString()
            });
        }
        
        // 分論點
        structure.arguments.forEach((arg, argIndex) => {
            arg.paragraphs.forEach((para, paraIndex) => {
                paragraphs.push({
                    id: para.id,
                    essay_id: this.essayId,
                    type: 'argument_body',
                    content: para.content,
                    order: paraIndex,
                    parent_id: arg.id,
                    argument_title: arg.title,
                    argument_order: argIndex,
                    updated_at: new Date().toISOString()
                });
            });
        });
        
        // 結論
        if (structure.conclusion) {
            paragraphs.push({
                id: structure.conclusion.id,
                essay_id: this.essayId,
                type: 'conclusion',
                content: structure.conclusion.content,
                order: 0,
                parent_id: null,
                updated_at: new Date().toISOString()
            });
        }
        
        return paragraphs;
    }
    
    /**
     * 保存到本地緩存
     */
    _saveToCache(data) {
        if (!this.options.enableOffline) {
            return;
        }
        
        try {
            const cacheData = {
                data,
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
            console.log('💾 已保存到本地緩存');
            
        } catch (error) {
            console.error('❌ 本地緩存保存失敗:', error);
        }
    }
    
    /**
     * 從本地緩存恢復
     */
    _restoreOfflineData() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            
            if (cached) {
                const cacheData = JSON.parse(cached);
                console.log('📥 發現本地緩存數據:', cacheData.savedAt);
                
                return cacheData.data;
            }
            
        } catch (error) {
            console.error('❌ 恢復本地緩存失敗:', error);
        }
        
        return null;
    }
    
    /**
     * 清除本地緩存
     */
    _clearCache() {
        try {
            localStorage.removeItem(this.cacheKey);
            console.log('🗑️ 已清除本地緩存');
        } catch (error) {
            console.error('❌ 清除緩存失敗:', error);
        }
    }
    
    /**
     * 創建版本快照
     */
    async createSnapshot(data, reason = 'manual') {
        console.log('📸 創建版本快照...');
        
        try {
            const snapshot = {
                essay_id: this.essayId,
                structure: data.structure,
                reason,
                created_at: new Date().toISOString()
            };
            
            const { data: result, error } = await this.supabase
                .from('essay_versions')
                .insert(snapshot)
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            console.log('✅ 快照創建成功:', result.id);
            
            return { success: true, snapshot: result };
            
        } catch (error) {
            console.error('❌ 快照創建失敗:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 處理上線事件
     */
    _handleOnline() {
        console.log('📡 網絡已連接');
        this.isOnline = true;
        
        // 嘗試同步離線數據
        if (this.options.enableOffline) {
            this._syncOfflineData();
        }
    }
    
    /**
     * 處理離線事件
     */
    _handleOffline() {
        console.log('📡 網絡已斷開');
        this.isOnline = false;
        this._setStatus(SaveStatus.OFFLINE);
    }
    
    /**
     * 同步離線數據
     */
    async _syncOfflineData() {
        const cached = this._restoreOfflineData();
        
        if (cached) {
            console.log('🔄 同步離線數據...');
            
            const result = await this.saveNow(cached);
            
            if (result.success) {
                console.log('✅ 離線數據同步成功');
            } else {
                console.error('❌ 離線數據同步失敗');
            }
        }
    }
    
    /**
     * 設置狀態
     */
    _setStatus(status) {
        if (this.status !== status) {
            this.status = status;
            
            console.log('💾 保存狀態:', status);
            
            if (this.options.onStatusChange) {
                this.options.onStatusChange(status);
            }
        }
    }
    
    /**
     * 獲取當前狀態
     */
    getStatus() {
        return this.status;
    }
    
    /**
     * 獲取最後保存時間
     */
    getLastSaveTime() {
        return this.lastSaveTime;
    }
    
    /**
     * 是否有未保存的更改
     */
    hasUnsavedChanges() {
        return this.status === SaveStatus.PENDING || this.status === SaveStatus.ERROR;
    }
    
    /**
     * 銷毀
     */
    destroy() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        
        window.removeEventListener('online', this._handleOnline);
        window.removeEventListener('offline', this._handleOffline);
    }
}

/**
 * 創建自動保存管理器實例
 */
export function createAutoSaveManager(supabaseClient, essayId, options = {}) {
    return new AutoSaveManager(supabaseClient, essayId, options);
}

