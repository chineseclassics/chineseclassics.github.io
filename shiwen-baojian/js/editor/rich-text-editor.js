/**
 * 時文寶鑑 - 富文本編輯器模組
 * 
 * 功能：
 * - 基於 Quill.js 的富文本編輯器封裝
 * - 自定義工具欄配置
 * - 內容變化監聽
 * - 字數統計
 */

/**
 * Quill 工具欄配置
 */
const TOOLBAR_CONFIG = {
    full: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['blockquote'],
        ['clean']
    ],
    simple: [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['clean']
    ],
    minimal: [
        ['bold', 'italic'],
        ['clean']
    ]
};

/**
 * 富文本編輯器類
 */
export class RichTextEditor {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container)
            : container;
            
        if (!this.container) {
            throw new Error('編輯器容器不存在');
        }
        
        this.options = {
            placeholder: '開始寫作...',
            theme: 'snow',
            toolbar: options.toolbarType || 'full',
            readOnly: options.readOnly || false,
            onChange: options.onChange || null,
            onFocus: options.onFocus || null,
            onBlur: options.onBlur || null
        };
        
        this.quill = null;
        this.listeners = new Set();
        
        this._initialize();
    }
    
    /**
     * 初始化編輯器
     */
    _initialize() {
        // 🔧 修復：檢查容器中是否已有 Quill 實例
        const existingQuill = this.container.querySelector('.ql-container');
        if (existingQuill) {
            console.warn('⚠️ 檢測到容器中已有 Quill 實例，先清理');
            this.container.innerHTML = '';
        }
        
        // 清空容器內容，避免重複渲染
        this.container.innerHTML = '';
        
        // 配置 Quill
        const config = {
            theme: this.options.theme,
            placeholder: this.options.placeholder,
            readOnly: this.options.readOnly,
            modules: {
                toolbar: TOOLBAR_CONFIG[this.options.toolbar] || TOOLBAR_CONFIG.full
            }
        };
        
        // 創建 Quill 實例
        this.quill = new Quill(this.container, config);
        
        // 綁定事件
        this._bindEvents();
        
        console.log('✅ 富文本編輯器初始化完成');
    }
    
    /**
     * 綁定事件
     */
    _bindEvents() {
        // 內容變化
        this.quill.on('text-change', (delta, oldDelta, source) => {
            if (this.options.onChange) {
                this.options.onChange({
                    delta,
                    oldDelta,
                    source,
                    html: this.getHTML(),
                    text: this.getText(),
                    wordCount: this.getWordCount()
                });
            }
            
            this._notifyListeners({
                type: 'change',
                delta,
                source,
                content: this.getContent()
            });
        });
        
        // 獲得焦點
        this.quill.on('selection-change', (range, oldRange, source) => {
            if (range && !oldRange) {
                // 獲得焦點
                if (this.options.onFocus) {
                    this.options.onFocus({ range, source });
                }
                
                this._notifyListeners({
                    type: 'focus',
                    range,
                    source
                });
            } else if (!range && oldRange) {
                // 失去焦點
                if (this.options.onBlur) {
                    this.options.onBlur({ oldRange, source });
                }
                
                this._notifyListeners({
                    type: 'blur',
                    oldRange,
                    source
                });
            }
        });
    }
    
    /**
     * 獲取內容（Delta 格式）
     */
    getContent() {
        return this.quill.getContents();
    }
    
    /**
     * 設置內容（Delta 格式）
     */
    setContent(delta) {
        this.quill.setContents(delta);
    }
    
    /**
     * 獲取 HTML
     */
    getHTML() {
        return this.quill.root.innerHTML;
    }
    
    /**
     * 設置 HTML
     */
    setHTML(html) {
        this.quill.root.innerHTML = html;
    }
    
    /**
     * 獲取純文本
     */
    getText() {
        return this.quill.getText();
    }
    
    /**
     * 設置純文本
     */
    setText(text) {
        this.quill.setText(text);
    }
    
    /**
     * 獲取字數（只統計中文字符，不含標點）
     * v2.0 - 2025-10-19: 優化為只統計純中文字符
     */
    getWordCount() {
        const text = this.getText().trim();
        
        // 只統計中文字符（常用漢字範圍）
        // 使用更精確的範圍，排除所有標點符號
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        
        // 統計英文單詞
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        
        // 統計標點符號（中文和英文）
        const punctuation = (text.match(/[，。！？；：、""''（）,.!?;:()\[\]]/g) || []).length;
        
        return {
            total: chineseChars,  // 只返回中文字符數，不含標點和英文
            chinese: chineseChars,
            english: englishWords,
            punctuation: punctuation
        };
    }
    
    /**
     * 獲取句子列表（用於 AI 反饋）
     */
    getSentences() {
        const text = this.getText().trim();
        
        // 按句號、問號、驚嘆號分割
        const sentences = text.split(/[。！？]/).filter(s => s.trim());
        
        return sentences.map((sentence, index) => ({
            index: index + 1,
            text: sentence.trim()
        }));
    }
    
    /**
     * 清空內容
     */
    clear() {
        this.quill.setText('');
    }
    
    /**
     * 是否為空
     */
    isEmpty() {
        return this.getText().trim().length === 0;
    }
    
    /**
     * 設置只讀狀態
     */
    setReadOnly(readOnly) {
        this.quill.enable(!readOnly);
        this.options.readOnly = readOnly;
    }
    
    /**
     * 是否只讀
     */
    isReadOnly() {
        return this.options.readOnly;
    }
    
    /**
     * 獲取焦點
     */
    focus() {
        this.quill.focus();
    }
    
    /**
     * 失去焦點
     */
    blur() {
        this.quill.blur();
    }
    
    /**
     * 插入文本（在光標位置）
     */
    insertText(text) {
        const range = this.quill.getSelection();
        const index = range ? range.index : this.quill.getLength();
        
        this.quill.insertText(index, text);
    }
    
    /**
     * 格式化選中文本
     */
    format(name, value) {
        this.quill.format(name, value);
    }
    
    /**
     * 撤銷
     */
    undo() {
        this.quill.history.undo();
    }
    
    /**
     * 重做
     */
    redo() {
        this.quill.history.redo();
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
     * 移除監聽器
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    /**
     * 通知所有監聽器
     */
    _notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('❌ 編輯器監聽器執行失敗:', error);
            }
        });
    }
    
    /**
     * 銷毀編輯器
     */
    destroy() {
        if (this.quill) {
            this.quill = null;
        }
        this.listeners.clear();
    }
}

/**
 * 創建編輯器實例
 */
export function createEditor(container, options = {}) {
    return new RichTextEditor(container, options);
}

