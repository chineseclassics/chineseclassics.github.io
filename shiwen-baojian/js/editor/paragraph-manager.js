/**
 * 時文寶鑑 - 段落管理模組
 * 
 * 功能：
 * - 管理論文的分層段落結構
 * - 引言 → 分論點（可包含多個段落）→ 結論
 * - 段落的增刪改查
 * - 段落順序調整
 */

import { createEditor } from './rich-text-editor.js';

/**
 * 段落類型
 */
export const ParagraphType = {
    INTRODUCTION: 'introduction',      // 引言
    ARGUMENT_TITLE: 'argument_title',  // 分論點標題
    ARGUMENT_BODY: 'argument_body',    // 分論點段落
    CONCLUSION: 'conclusion'           // 結論
};

/**
 * 段落類
 */
class Paragraph {
    constructor(type, options = {}) {
        this.id = options.id || this._generateId();
        this.type = type;
        this.parentId = options.parentId || null;  // 分論點 ID（用於 argument_body）
        this.order = options.order || 0;
        this.content = options.content || { ops: [] };  // Quill Delta
        this.createdAt = options.createdAt || new Date().toISOString();
        this.updatedAt = options.updatedAt || new Date().toISOString();
        
        // 編輯器實例（運行時創建）
        this.editor = null;
    }
    
    _generateId() {
        return 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 更新內容
     */
    updateContent(content) {
        this.content = content;
        this.updatedAt = new Date().toISOString();
    }
    
    /**
     * 獲取純文本
     */
    getText() {
        if (this.editor) {
            return this.editor.getText();
        }
        return '';
    }
    
    /**
     * 是否為空
     */
    isEmpty() {
        if (this.editor) {
            return this.editor.isEmpty();
        }
        return true;
    }
    
    /**
     * 序列化為 JSON
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            parentId: this.parentId,
            order: this.order,
            content: this.content,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

/**
 * 分論點類
 */
class Argument {
    constructor(options = {}) {
        this.id = options.id || this._generateId();
        this.title = options.title || '';
        this.order = options.order || 0;
        this.paragraphs = [];  // 段落列表
        this.createdAt = options.createdAt || new Date().toISOString();
        this.updatedAt = options.updatedAt || new Date().toISOString();
    }
    
    _generateId() {
        return 'arg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 添加段落
     */
    addParagraph(paragraph) {
        paragraph.parentId = this.id;
        paragraph.order = this.paragraphs.length;
        this.paragraphs.push(paragraph);
        this.updatedAt = new Date().toISOString();
        
        return paragraph;
    }
    
    /**
     * 移除段落
     */
    removeParagraph(paragraphId) {
        const index = this.paragraphs.findIndex(p => p.id === paragraphId);
        if (index !== -1) {
            this.paragraphs.splice(index, 1);
            this._reorderParagraphs();
            this.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }
    
    /**
     * 獲取段落
     */
    getParagraph(paragraphId) {
        return this.paragraphs.find(p => p.id === paragraphId);
    }
    
    /**
     * 重新排序段落
     */
    _reorderParagraphs() {
        this.paragraphs.forEach((p, index) => {
            p.order = index;
        });
    }
    
    /**
     * 序列化為 JSON
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            order: this.order,
            paragraphs: this.paragraphs.map(p => p.toJSON()),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

/**
 * 段落管理器類
 */
export class ParagraphManager {
    constructor(essayId) {
        this.essayId = essayId;
        
        // 論文結構
        this.introduction = null;   // 引言段落
        this.arguments = [];         // 分論點列表
        this.conclusion = null;      // 結論段落
        
        this.listeners = new Set();
        
        this._initialize();
    }
    
    /**
     * 初始化
     */
    _initialize() {
        console.log('📝 初始化段落管理器...');
        
        // 創建默認結構
        this.introduction = new Paragraph(ParagraphType.INTRODUCTION);
        this.conclusion = new Paragraph(ParagraphType.CONCLUSION);
        
        // 創建第一個分論點
        this.addArgument();
        
        console.log('✅ 段落管理器初始化完成');
    }
    
    /**
     * 添加分論點
     */
    addArgument(options = {}) {
        const argument = new Argument({
            ...options,
            order: this.arguments.length
        });
        
        // 添加第一個段落
        argument.addParagraph(new Paragraph(ParagraphType.ARGUMENT_BODY, {
            parentId: argument.id
        }));
        
        this.arguments.push(argument);
        
        this._notifyListeners({
            type: 'argument_added',
            argument
        });
        
        return argument;
    }
    
    /**
     * 移除分論點
     */
    removeArgument(argumentId) {
        const index = this.arguments.findIndex(a => a.id === argumentId);
        
        if (index !== -1) {
            const removed = this.arguments.splice(index, 1)[0];
            this._reorderArguments();
            
            this._notifyListeners({
                type: 'argument_removed',
                argument: removed
            });
            
            return true;
        }
        
        return false;
    }
    
    /**
     * 獲取分論點
     */
    getArgument(argumentId) {
        return this.arguments.find(a => a.id === argumentId);
    }
    
    /**
     * 添加段落到分論點
     */
    addParagraphToArgument(argumentId) {
        const argument = this.getArgument(argumentId);
        
        if (!argument) {
            console.error('❌ 分論點不存在:', argumentId);
            return null;
        }
        
        const paragraph = new Paragraph(ParagraphType.ARGUMENT_BODY, {
            parentId: argumentId
        });
        
        argument.addParagraph(paragraph);
        
        this._notifyListeners({
            type: 'paragraph_added',
            argument,
            paragraph
        });
        
        return paragraph;
    }
    
    /**
     * 移除段落
     */
    removeParagraph(argumentId, paragraphId) {
        const argument = this.getArgument(argumentId);
        
        if (!argument) {
            return false;
        }
        
        const success = argument.removeParagraph(paragraphId);
        
        if (success) {
            this._notifyListeners({
                type: 'paragraph_removed',
                argumentId,
                paragraphId
            });
        }
        
        return success;
    }
    
    /**
     * 獲取段落
     */
    getParagraph(paragraphId) {
        // 檢查引言
        if (this.introduction && this.introduction.id === paragraphId) {
            return this.introduction;
        }
        
        // 檢查結論
        if (this.conclusion && this.conclusion.id === paragraphId) {
            return this.conclusion;
        }
        
        // 檢查分論點中的段落
        for (const argument of this.arguments) {
            const paragraph = argument.getParagraph(paragraphId);
            if (paragraph) {
                return paragraph;
            }
        }
        
        return null;
    }
    
    /**
     * 重新排序分論點
     */
    _reorderArguments() {
        this.arguments.forEach((arg, index) => {
            arg.order = index;
        });
    }
    
    /**
     * 獲取完整結構
     */
    getStructure() {
        return {
            introduction: this.introduction ? this.introduction.toJSON() : null,
            arguments: this.arguments.map(a => a.toJSON()),
            conclusion: this.conclusion ? this.conclusion.toJSON() : null
        };
    }
    
    /**
     * 加載結構（從數據庫）
     */
    loadStructure(data) {
        console.log('📥 加載論文結構...');
        
        // 加載引言
        if (data.introduction) {
            this.introduction = new Paragraph(ParagraphType.INTRODUCTION, data.introduction);
        }
        
        // 加載分論點
        this.arguments = (data.arguments || []).map(argData => {
            const argument = new Argument(argData);
            argument.paragraphs = (argData.paragraphs || []).map(pData => 
                new Paragraph(ParagraphType.ARGUMENT_BODY, pData)
            );
            return argument;
        });
        
        // 加載結論
        if (data.conclusion) {
            this.conclusion = new Paragraph(ParagraphType.CONCLUSION, data.conclusion);
        }
        
        console.log('✅ 論文結構加載完成');
        console.log(`  引言: ${this.introduction ? '✓' : '✗'}`);
        console.log(`  分論點: ${this.arguments.length} 個`);
        console.log(`  結論: ${this.conclusion ? '✓' : '✗'}`);
        
        this._notifyListeners({
            type: 'structure_loaded',
            structure: this.getStructure()
        });
    }
    
    /**
     * 獲取總字數
     */
    getTotalWordCount() {
        let total = 0;
        
        // 引言
        if (this.introduction && this.introduction.editor) {
            total += this.introduction.editor.getWordCount().total;
        }
        
        // 分論點
        this.arguments.forEach(arg => {
            arg.paragraphs.forEach(p => {
                if (p.editor) {
                    total += p.editor.getWordCount().total;
                }
            });
        });
        
        // 結論
        if (this.conclusion && this.conclusion.editor) {
            total += this.conclusion.editor.getWordCount().total;
        }
        
        return total;
    }
    
    /**
     * 添加監聽器
     */
    addListener(callback) {
        this.listeners.add(callback);
        
        return () => {
            this.listeners.delete(callback);
        };
    }
    
    /**
     * 通知監聽器
     */
    _notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('❌ 段落管理監聽器執行失敗:', error);
            }
        });
    }
}

/**
 * 創建段落管理器實例
 */
export function createParagraphManager(essayId) {
    return new ParagraphManager(essayId);
}

/**
 * 導出段落和分論點類（供外部使用）
 */
export { Paragraph, Argument };

