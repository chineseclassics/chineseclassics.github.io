/**
 * 格式管理器
 * 
 * 功能：
 * - 查看所有格式（系統 + 自定義）
 * - 搜索和篩選
 * - 查看詳情
 * - 編輯格式
 * - 刪除格式
 * - 複製格式說明
 * 
 * @created 2025-10-19
 * @related teacher-custom-format-ai (階段 2)
 */

// ============================================================
// 全局狀態
// ============================================================

let allFormats = [];
let filteredFormats = [];
let currentFormatToDelete = null;
let currentDetailFormat = null;

// Supabase 配置
const SUPABASE_URL = 'https://fjvgfhdqrezutrmbidds.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmdmaGRxcmV6dXRybWJpZGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDE3ODIsImV4cCI6MjA3NjM3Nzc4Mn0.eVX46FM_UfLBk9vJiCfA_zC9PIMTJxmG8QNZQWdG8T8';

// ============================================================
// 初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loadFormats();
});

/**
 * 加載所有格式
 */
async function loadFormats() {
    try {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('formatsList').innerHTML = '';
        document.getElementById('emptyState').classList.add('hidden');

        // 從 Supabase 加載格式
        if (!window.supabaseClient) {
            throw new Error('Supabase 客戶端未初始化');
        }
        
        const { data: formats, error } = await window.supabaseClient
            .from('format_specifications')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // 處理數據：添加 type 字段
        allFormats = formats.map(f => ({
            ...f,
            type: f.is_system ? 'system' : 'custom'
        }));
        
        // 如果沒有格式，添加示例系統格式
        if (allFormats.length === 0) {
            allFormats = getMockFormats();
        }
        
        filteredFormats = [...allFormats];
        sortFormats();
        renderFormats();
        
        document.getElementById('loadingState').classList.add('hidden');
        
        console.log('[FormatManager] 格式已加載:', allFormats.length);
    } catch (error) {
        console.error('[FormatManager] 加載格式失敗:', error);
        document.getElementById('loadingState').classList.add('hidden');
        
        // 降級為示例數據
        allFormats = getMockFormats();
        filteredFormats = [...allFormats];
        renderFormats();
        document.getElementById('loadingState').classList.add('hidden');
    }
}

/**
 * 獲取示例格式數據
 */
function getMockFormats() {
    return [
        {
            id: 'system-honglou',
            name: '紅樓夢論文格式',
            description: '適用於紅樓夢文學分析的標準論文格式',
            type: 'system',
            essay_type: 'literary_analysis',
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
            created_by: null,
            is_system: true,
            spec_json: {
                metadata: {
                    name: '紅樓夢論文格式',
                    essay_type: 'literary_analysis',
                    structure_type: '完整論文'
                },
                constraints: {
                    total_word_count: { min: 1500, max: 2500 }
                },
                structure: {
                    required_sections: [
                        { id: 'intro', name: '引言', order: 1 },
                        { id: 'body', name: '正文', order: 2 },
                        { id: 'conclusion', name: '結論', order: 3 }
                    ]
                },
                analysis_dimensions: [
                    {
                        id: 'depth',
                        name: '分析深度',
                        weight: 1.0,
                        checks: ['是否引用原文？', '是否深入分析？']
                    }
                ]
            }
        },
        {
            id: 'custom-chunjiang',
            name: '春江花月夜結構分析',
            description: '片段分析，無需完整論文結構',
            type: 'custom',
            essay_type: 'fragment_analysis',
            created_at: '2025-10-19',
            updated_at: '2025-10-19',
            created_by: 'user-123',
            is_system: false,
            spec_json: {
                metadata: {
                    name: '春江花月夜結構分析',
                    essay_type: 'fragment_analysis',
                    structure_type: '片段分析'
                },
                constraints: {
                    total_word_count: { min: 400, max: 600 },
                    required_paragraphs: 2
                },
                structure: {
                    required_sections: [
                        { id: 'section_1', name: '第 1 段', order: 1 },
                        { id: 'section_2', name: '第 2 段', order: 2 }
                    ]
                },
                analysis_dimensions: [
                    {
                        id: 'structure',
                        name: '結構分析充分性',
                        weight: 1.0,
                        checks: ['是否引用原文？', '是否分析結構方面？']
                    }
                ]
            }
        }
    ];
}

// ============================================================
// 搜索和篩選
// ============================================================

/**
 * 篩選格式
 */
function filterFormats() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    
    filteredFormats = allFormats.filter(format => {
        // 類型篩選
        if (typeFilter !== 'all' && format.type !== typeFilter) {
            return false;
        }
        
        // 搜索篩選
        if (searchText) {
            const nameMatch = format.name.toLowerCase().includes(searchText);
            const descMatch = format.description && format.description.toLowerCase().includes(searchText);
            return nameMatch || descMatch;
        }
        
        return true;
    });
    
    sortFormats();
    renderFormats();
}

/**
 * 排序格式
 */
function sortFormats() {
    const sortBy = document.getElementById('sortBy').value;
    
    filteredFormats.sort((a, b) => {
        switch (sortBy) {
            case 'created_desc':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'created_asc':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'name_asc':
                return a.name.localeCompare(b.name, 'zh-Hant');
            case 'name_desc':
                return b.name.localeCompare(a.name, 'zh-Hant');
            default:
                return 0;
        }
    });
    
    renderFormats();
}

// ============================================================
// 渲染
// ============================================================

/**
 * 渲染格式列表
 */
function renderFormats() {
    const container = document.getElementById('formatsList');
    const emptyState = document.getElementById('emptyState');
    
    if (filteredFormats.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    container.innerHTML = filteredFormats.map(format => createFormatCard(format)).join('');
}

/**
 * 創建格式卡片 HTML
 */
function createFormatCard(format) {
    const isSystem = format.type === 'system';
    const icon = isSystem ? '📖' : '📝';
    const typeLabel = isSystem ? '系統內置' : '自定義';
    const typeBadgeColor = isSystem ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
    
    // 提取格式信息
    const wordCount = format.spec_json?.constraints?.total_word_count;
    const wordCountText = wordCount 
        ? `${wordCount.min || '不限'}-${wordCount.max || '不限'} 字`
        : '不限';
    
    const paragraphCount = format.spec_json?.constraints?.required_paragraphs || '不限';
    
    return `
        <div class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div class="p-6">
                <!-- 頂部：圖標和類型標籤 -->
                <div class="flex justify-between items-start mb-4">
                    <div class="text-4xl">${icon}</div>
                    <span class="px-2 py-1 text-xs font-medium ${typeBadgeColor} rounded">
                        ${typeLabel}
                    </span>
                </div>
                
                <!-- 標題和描述 -->
                <h3 class="text-lg font-semibold text-gray-900 mb-2">${format.name}</h3>
                <p class="text-sm text-gray-600 mb-4 line-clamp-2">
                    ${format.description || '無描述'}
                </p>
                
                <!-- 格式信息 -->
                <div class="space-y-1 mb-4">
                    <div class="flex items-center text-sm text-gray-700">
                        <span class="w-20">字數：</span>
                        <span class="font-medium">${wordCountText}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-700">
                        <span class="w-20">段落：</span>
                        <span class="font-medium">${paragraphCount} 段</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <span class="w-20">創建：</span>
                        <span>${formatDate(format.created_at)}</span>
                    </div>
                </div>
                
                <!-- 操作按鈕 -->
                <div class="flex gap-2">
                    <button 
                        onclick="viewFormatDetail('${format.id}')"
                        class="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                    >
                        👁️ 查看
                    </button>
                    ${!isSystem ? `
                        <button 
                            onclick="editFormat('${format.id}')"
                            class="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
                        >
                            ✏️ 編輯
                        </button>
                        <button 
                            onclick="deleteFormat('${format.id}')"
                            class="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                        >
                            🗑️
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// 操作功能
// ============================================================

/**
 * 查看格式詳情
 */
function viewFormatDetail(formatId) {
    const format = allFormats.find(f => f.id === formatId);
    if (!format) return;
    
    currentDetailFormat = format;
    
    // 轉換為人類可讀格式
    const readable = formatJSONToHumanReadable(format.spec_json);
    
    // 更新模態框
    document.getElementById('detailTitle').textContent = format.name;
    document.getElementById('detailContent').innerHTML = `
        <div class="space-y-4">
            <div>
                <h4 class="font-semibold text-gray-700 mb-2">📋 基本信息</h4>
                <div class="bg-gray-50 p-4 rounded">
                    <p><strong>類型：</strong>${format.type === 'system' ? '系統內置' : '自定義'}</p>
                    <p><strong>描述：</strong>${format.description || '無'}</p>
                    <p><strong>創建時間：</strong>${formatDate(format.created_at)}</p>
                    ${format.updated_at !== format.created_at ? `<p><strong>更新時間：</strong>${formatDate(format.updated_at)}</p>` : ''}
                </div>
            </div>
            
            <div>
                <h4 class="font-semibold text-gray-700 mb-2">📝 格式要求</h4>
                <div class="bg-gray-50 p-4 rounded whitespace-pre-wrap font-mono text-sm">
${readable}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('detailModal').classList.remove('hidden');
}

/**
 * 關閉詳情模態框
 */
function closeDetailModal() {
    document.getElementById('detailModal').classList.add('hidden');
    currentDetailFormat = null;
}

/**
 * 複製格式詳情
 */
function copyFormatDetail() {
    if (!currentDetailFormat) return;
    
    const readable = formatJSONToHumanReadable(currentDetailFormat.spec_json);
    
    navigator.clipboard.writeText(readable).then(() => {
        alert('✅ 格式說明已複製到剪貼板！');
    }).catch(err => {
        console.error('[FormatManager] 複製失敗:', err);
        alert('❌ 複製失敗：' + err.message);
    });
}

/**
 * 編輯格式
 */
function editFormat(formatId) {
    console.log('[FormatManager] 編輯格式:', formatId);
    window.location.href = `format-editor.html?edit=${formatId}`;
}

/**
 * 刪除格式
 */
function deleteFormat(formatId) {
    const format = allFormats.find(f => f.id === formatId);
    if (!format) return;
    
    currentFormatToDelete = formatId;
    document.getElementById('deleteMessage').textContent = 
        `確定要刪除「${format.name}」嗎？此操作無法撤銷。`;
    document.getElementById('deleteDialog').classList.remove('hidden');
}

/**
 * 關閉刪除對話框
 */
function closeDeleteDialog() {
    document.getElementById('deleteDialog').classList.add('hidden');
    currentFormatToDelete = null;
}

/**
 * 確認刪除
 */
async function confirmDelete() {
    if (!currentFormatToDelete) return;
    
    try {
        // 從 Supabase 刪除
        if (!window.supabaseClient) {
            throw new Error('Supabase 客戶端未初始化');
        }
        
        const { error } = await window.supabaseClient
            .from('format_specifications')
            .delete()
            .eq('id', currentFormatToDelete);
        
        if (error) throw error;
        
        console.log('[FormatManager] 格式已刪除:', currentFormatToDelete);
        
        // 從列表中移除
        allFormats = allFormats.filter(f => f.id !== currentFormatToDelete);
        
        closeDeleteDialog();
        filterFormats();
        
        alert('✅ 格式已刪除');
    } catch (error) {
        console.error('[FormatManager] 刪除失敗:', error);
        alert('❌ 刪除失敗：' + error.message);
    }
}

// ============================================================
// 輔助函數
// ============================================================

/**
 * 格式化日期
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * 格式 JSON 轉人類可讀文本
 */
function formatJSONToHumanReadable(formatJSON) {
    let text = '';
    
    if (formatJSON.metadata?.structure_type) {
        text += `【任務類型】\n${formatJSON.metadata.structure_type}\n\n`;
    }
    
    if (formatJSON.constraints?.total_word_count) {
        const wc = formatJSON.constraints.total_word_count;
        if (wc.min && wc.max) {
            text += `【字數要求】\n• 總字數：${wc.min}-${wc.max} 字\n\n`;
        }
    }
    
    if (formatJSON.structure?.required_sections) {
        text += `【段落結構】\n`;
        formatJSON.structure.required_sections.forEach(section => {
            text += `• ${section.name}${section.description ? '：' + section.description : ''}\n`;
        });
        text += '\n';
    }
    
    if (formatJSON.content_requirements?.length > 0) {
        text += `【內容要求】\n`;
        formatJSON.content_requirements.forEach(req => {
            if (req.literary_work) text += `• 作品：${req.literary_work}\n`;
            if (req.theme) text += `• 主題：${req.theme}\n`;
            if (req.specific_criteria) {
                text += `• 要求：${req.specific_criteria.join('、')}\n`;
            }
        });
        text += '\n';
    }
    
    if (formatJSON.analysis_dimensions?.length > 0) {
        text += `【檢查維度】\n`;
        formatJSON.analysis_dimensions.forEach(dim => {
            text += `${dim.name}：\n`;
            dim.checks.forEach(check => {
                text += `- ${check}\n`;
            });
            text += '\n';
        });
    }
    
    return text.trim();
}

