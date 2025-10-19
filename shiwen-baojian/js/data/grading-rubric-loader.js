/**
 * 評分標準加載器
 * 
 * 功能：
 * - 從 JSON 文件加載系統內置評分標準
 * - 提供評分標準的查詢和訪問接口
 * - 支持緩存以提高性能
 * 
 * @module GradingRubricLoader
 * @created 2025-10-19
 * @related teacher-custom-format-ai (階段 1)
 */

class GradingRubricLoader {
    constructor() {
        // 評分標準緩存
        this.rubrics = new Map();
        
        // 系統內置評分標準路徑
        this.systemRubrics = {
            'ib-myp-chinese-literature': '/shiwen-baojian/assets/data/grading-rubrics/ib-myp-chinese-literature.json'
        };
        
        // 加載狀態
        this.loadingPromises = new Map();
    }

    /**
     * 加載系統內置評分標準
     * @param {string} rubricId - 評分標準 ID（如 'ib-myp-chinese-literature'）
     * @returns {Promise<Object>} 評分標準對象
     */
    async loadSystemRubric(rubricId) {
        // 檢查緩存
        if (this.rubrics.has(rubricId)) {
            return this.rubrics.get(rubricId);
        }

        // 檢查是否已在加載中（避免重複請求）
        if (this.loadingPromises.has(rubricId)) {
            return this.loadingPromises.get(rubricId);
        }

        // 檢查 ID 是否有效
        if (!this.systemRubrics[rubricId]) {
            throw new Error(`未知的評分標準 ID: ${rubricId}`);
        }

        // 創建加載 Promise
        const loadingPromise = this._fetchRubric(rubricId);
        this.loadingPromises.set(rubricId, loadingPromise);

        try {
            const rubric = await loadingPromise;
            this.rubrics.set(rubricId, rubric);
            return rubric;
        } finally {
            this.loadingPromises.delete(rubricId);
        }
    }

    /**
     * 從文件系統獲取評分標準
     * @private
     */
    async _fetchRubric(rubricId) {
        const path = this.systemRubrics[rubricId];
        
        try {
            const response = await fetch(path);
            
            if (!response.ok) {
                throw new Error(`加載評分標準失敗: HTTP ${response.status}`);
            }

            const rubric = await response.json();
            
            // 驗證評分標準結構
            this._validateRubric(rubric);
            
            return rubric;
        } catch (error) {
            console.error(`[GradingRubricLoader] 加載評分標準 ${rubricId} 失敗:`, error);
            throw error;
        }
    }

    /**
     * 驗證評分標準結構
     * @private
     */
    _validateRubric(rubric) {
        if (!rubric.id) {
            throw new Error('評分標準缺少 id 字段');
        }

        if (!rubric.name) {
            throw new Error('評分標準缺少 name 字段');
        }

        if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
            throw new Error('評分標準缺少有效的 criteria 數組');
        }

        // 驗證每個標準
        rubric.criteria.forEach((criterion, index) => {
            if (!criterion.code) {
                throw new Error(`標準 ${index} 缺少 code 字段`);
            }
            if (!criterion.name) {
                throw new Error(`標準 ${index} 缺少 name 字段`);
            }
            if (!criterion.max_score) {
                throw new Error(`標準 ${index} 缺少 max_score 字段`);
            }
            if (!Array.isArray(criterion.descriptors)) {
                throw new Error(`標準 ${index} 缺少 descriptors 數組`);
            }
        });
    }

    /**
     * 獲取所有系統內置評分標準列表
     * @returns {Array<Object>} 評分標準列表 [{id, name, description}]
     */
    async listSystemRubrics() {
        const rubricList = [];

        for (const rubricId of Object.keys(this.systemRubrics)) {
            try {
                const rubric = await this.loadSystemRubric(rubricId);
                rubricList.push({
                    id: rubric.id,
                    name: rubric.name,
                    description: rubric.description || '',
                    type: rubric.type
                });
            } catch (error) {
                console.error(`[GradingRubricLoader] 無法加載評分標準 ${rubricId}:`, error);
            }
        }

        return rubricList;
    }

    /**
     * 根據標準代碼獲取描述符
     * @param {string} rubricId - 評分標準 ID
     * @param {string} criterionCode - 標準代碼（如 'A', 'B', 'C', 'D'）
     * @param {number} score - 分數（0-8）
     * @returns {Promise<string>} 對應的描述符文本
     */
    async getDescriptorForScore(rubricId, criterionCode, score) {
        const rubric = await this.loadSystemRubric(rubricId);
        
        const criterion = rubric.criteria.find(c => c.code === criterionCode);
        if (!criterion) {
            throw new Error(`未找到標準代碼: ${criterionCode}`);
        }

        // 找到匹配分數範圍的描述符
        for (const descriptor of criterion.descriptors) {
            if (this._isScoreInRange(score, descriptor.score_range)) {
                return descriptor.description;
            }
        }

        throw new Error(`未找到分數 ${score} 對應的描述符`);
    }

    /**
     * 檢查分數是否在範圍內
     * @private
     */
    _isScoreInRange(score, range) {
        if (range === '0') {
            return score === 0;
        }

        // 處理範圍格式 "1-2", "3-4" 等
        const match = range.match(/^(\d+)-(\d+)$/);
        if (match) {
            const min = parseInt(match[1]);
            const max = parseInt(match[2]);
            return score >= min && score <= max;
        }

        return false;
    }

    /**
     * 格式化評分標準為人類可讀文本
     * @param {string} rubricId - 評分標準 ID
     * @returns {Promise<string>} 格式化的文本
     */
    async formatRubricAsText(rubricId) {
        const rubric = await this.loadSystemRubric(rubricId);
        
        let text = `# ${rubric.name}\n\n`;
        
        if (rubric.description) {
            text += `${rubric.description}\n\n`;
        }

        rubric.criteria.forEach(criterion => {
            text += `## 標準 ${criterion.code}: ${criterion.name}\n`;
            text += `最高分數：${criterion.max_score}\n\n`;
            
            if (criterion.objectives && criterion.objectives.length > 0) {
                text += `**課程目標**：\n`;
                criterion.objectives.forEach(obj => {
                    text += `- ${obj}\n`;
                });
                text += '\n';
            }

            text += `**評分描述符**：\n\n`;
            criterion.descriptors.forEach(desc => {
                text += `**${desc.score_range} 分**：${desc.description}\n\n`;
            });
        });

        text += `\n總分：${rubric.total_max_score || '（各標準分數之和）'}\n`;

        return text;
    }

    /**
     * 清除緩存
     */
    clearCache() {
        this.rubrics.clear();
        this.loadingPromises.clear();
    }
}

// 創建全局單例
const gradingRubricLoader = new GradingRubricLoader();

// 導出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GradingRubricLoader, gradingRubricLoader };
}

