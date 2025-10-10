// =====================================================
// 词表选择器组件
// 用于游戏开始时选择词表模式和层级
// =====================================================

import { getSupabase } from '../supabase-client.js'
import { gameState } from '../core/game-state.js'
import { showToast } from '../utils/toast.js'

const supabase = getSupabase()

/**
 * 词表选择器类
 */
export class WordlistSelector {
  constructor() {
    this.selectedMode = 'ai'  // 'ai' | 'wordlist'
    this.selectedWordlist = null
    this.selectedLevel2Tag = null
    this.selectedLevel3Tag = null
    this.availableWordlists = []
    this.currentWordlistTags = []
  }

  /**
   * 初始化：加载用户偏好和可用词表
   */
  async initialize(userId) {
    try {
      // 1. 加载用户偏好设置
      const { data: preferences } = await supabase
        .from('user_wordlist_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (preferences) {
        this.selectedMode = preferences.default_mode
        this.selectedWordlist = preferences.default_wordlist_id
        this.selectedLevel2Tag = preferences.default_level_2_tag
        this.selectedLevel3Tag = preferences.default_level_3_tag
      }

      // 2. 加载可用词表（系统词表 + 用户自己的词表 + 公开词表）
      const { data: wordlists } = await supabase
        .from('wordlists')
        .select('*')
        .or(`type.eq.system,owner_id.eq.${userId},is_public.eq.true`)
        .order('type', { ascending: false })  // system优先
        .order('name')

      this.availableWordlists = wordlists || []

      console.log(`✅ 加载了 ${this.availableWordlists.length} 个可用词表`)

      return true
    } catch (error) {
      console.error('初始化失败:', error)
      return false
    }
  }

  /**
   * 渲染词表选择器UI
   */
  render(containerId) {
    const container = document.getElementById(containerId)
    if (!container) {
      console.error('容器不存在:', containerId)
      return
    }

    container.innerHTML = `
      <div class="wordlist-selector">
        <!-- 模式选择 -->
        <div class="mode-selector">
          <h3 style="margin-bottom: 15px; color: #333;">📚 选择词表模式</h3>
          
          <div class="mode-options">
            <label class="mode-option ${this.selectedMode === 'ai' ? 'active' : ''}">
              <input type="radio" name="mode" value="ai" 
                     ${this.selectedMode === 'ai' ? 'checked' : ''}
                     onchange="wordlistSelector.setMode('ai')">
              <div class="mode-content">
                <div class="mode-icon">🤖</div>
                <div class="mode-title">AI智能推荐</div>
                <div class="mode-desc">不限词表，AI根据您的水平智能推荐</div>
              </div>
            </label>
            
            <label class="mode-option ${this.selectedMode === 'wordlist' ? 'active' : ''}">
              <input type="radio" name="mode" value="wordlist"
                     ${this.selectedMode === 'wordlist' ? 'checked' : ''}
                     onchange="wordlistSelector.setMode('wordlist')">
              <div class="mode-content">
                <div class="mode-icon">📖</div>
                <div class="mode-title">指定词表</div>
                <div class="mode-desc">从特定词表学习（HSK、教材等）</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 词表选择（仅当选择"指定词表"时显示） -->
        <div id="wordlist-options" style="display: ${this.selectedMode === 'wordlist' ? 'block' : 'none'};">
          ${this.renderWordlistOptions()}
        </div>

        <!-- 保存为默认 -->
        <div style="margin-top: 20px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="save-as-default" style="width: auto;">
            <span style="font-size: 14px; color: #666;">
              保存为默认设置（下次自动选中）
            </span>
          </label>
        </div>
      </div>
    `

    this.attachStyles()
  }

  /**
   * 渲染词表选项
   */
  renderWordlistOptions() {
    if (this.availableWordlists.length === 0) {
      return `
        <div style="padding: 30px; text-align: center; color: #999;">
          <p style="font-size: 18px; margin-bottom: 10px;">📭 暂无可用词表</p>
          <p style="font-size: 14px;">
            请联系管理员导入系统词表，或
            <a href="admin/upload-custom-wordlist.html" style="color: #667eea;">
              上传您自己的词表
            </a>
          </p>
        </div>
      `
    }

    return `
      <div style="margin-top: 20px;">
        <h4 style="margin-bottom: 12px; color: #333;">选择词表</h4>
        <select id="wordlist-select" class="form-select" onchange="wordlistSelector.onWordlistChange(this.value)">
          <option value="">-- 请选择 --</option>
          ${this.availableWordlists.map(wl => `
            <option value="${wl.id}" ${this.selectedWordlist === wl.id ? 'selected' : ''}>
              ${wl.type === 'system' ? '📚' : '✏️'} ${wl.name} (${wl.total_words || 0}词)
            </option>
          `).join('')}
        </select>
      </div>

      <!-- 层级选择器（动态加载） -->
      <div id="hierarchy-selectors"></div>
    `
  }

  /**
   * 设置模式
   */
  setMode(mode) {
    this.selectedMode = mode
    const optionsDiv = document.getElementById('wordlist-options')
    if (optionsDiv) {
      optionsDiv.style.display = mode === 'wordlist' ? 'block' : 'none'
    }

    // 更新UI
    document.querySelectorAll('.mode-option').forEach(opt => {
      opt.classList.remove('active')
    })
    event.target.closest('.mode-option').classList.add('active')
  }

  /**
   * 词表选择变化
   */
  async onWordlistChange(wordlistId) {
    if (!wordlistId) {
      this.selectedWordlist = null
      this.currentWordlistTags = []
      document.getElementById('hierarchy-selectors').innerHTML = ''
      return
    }

    this.selectedWordlist = wordlistId

    // 获取词表信息
    const wordlist = this.availableWordlists.find(w => w.id === wordlistId)
    if (!wordlist) return

    // 获取该词表的标签
    const { data: tags } = await supabase
      .from('wordlist_tags')
      .select('*')
      .eq('wordlist_id', wordlistId)
      .order('tag_level')
      .order('sort_order')

    this.currentWordlistTags = tags || []

    // 渲染层级选择器
    this.renderHierarchySelectors(wordlist)
  }

  /**
   * 渲染层级选择器
   */
  renderHierarchySelectors(wordlist) {
    const container = document.getElementById('hierarchy-selectors')
    if (!container) return

    const config = wordlist.hierarchy_config || {}
    const level2Tags = this.currentWordlistTags.filter(t => t.tag_level === 2)
    const level3Tags = this.currentWordlistTags.filter(t => t.tag_level === 3)

    let html = ''

    // 第二层级选择器
    if (config.level_2_label && level2Tags.length > 0) {
      html += `
        <div style="margin-top: 20px;">
          <h4 style="margin-bottom: 12px; color: #333;">${config.level_2_label}</h4>
          <select id="level-2-select" class="form-select" onchange="wordlistSelector.onLevel2Change(this.value)">
            <option value="">-- 全部${config.level_2_label} --</option>
            ${level2Tags.map(tag => `
              <option value="${tag.tag_code}" ${this.selectedLevel2Tag === tag.tag_code ? 'selected' : ''}>
                ${tag.tag_display_name}
              </option>
            `).join('')}
          </select>
        </div>
      `
    }

    // 第三层级选择器
    if (config.level_3_label && level3Tags.length > 0) {
      html += `
        <div style="margin-top: 20px;">
          <h4 style="margin-bottom: 12px; color: #333;">${config.level_3_label}</h4>
          <select id="level-3-select" class="form-select" onchange="wordlistSelector.onLevel3Change(this.value)">
            <option value="">-- 全部${config.level_3_label} --</option>
            ${level3Tags.map(tag => `
              <option value="${tag.tag_code}" ${this.selectedLevel3Tag === tag.tag_code ? 'selected' : ''}>
                ${tag.tag_display_name}
              </option>
            `).join('')}
          </select>
        </div>
      `
    }

    container.innerHTML = html
  }

  /**
   * 层级选择变化
   */
  onLevel2Change(value) {
    this.selectedLevel2Tag = value || null
  }

  onLevel3Change(value) {
    this.selectedLevel3Tag = value || null
  }

  /**
   * 获取当前选择
   */
  getSelection() {
    return {
      mode: this.selectedMode,
      wordlistId: this.selectedWordlist,
      level2Tag: this.selectedLevel2Tag,
      level3Tag: this.selectedLevel3Tag
    }
  }

  /**
   * 保存为默认设置
   */
  async saveAsDefault(userId) {
    const saveAsDefault = document.getElementById('save-as-default')?.checked
    if (!saveAsDefault) return

    try {
      const { error } = await supabase
        .from('user_wordlist_preferences')
        .upsert({
          user_id: userId,
          default_mode: this.selectedMode,
          default_wordlist_id: this.selectedWordlist,
          default_level_2_tag: this.selectedLevel2Tag,
          default_level_3_tag: this.selectedLevel3Tag,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      showToast('✅ 已保存为默认设置', 'success')
      console.log('✅ 用户偏好已保存')
    } catch (error) {
      console.error('保存偏好失败:', error)
    }
  }

  /**
   * 附加样式
   */
  attachStyles() {
    if (document.getElementById('wordlist-selector-styles')) return

    const style = document.createElement('style')
    style.id = 'wordlist-selector-styles'
    style.textContent = `
      .wordlist-selector {
        padding: 20px;
        background: #f8f9fa;
        border-radius: 12px;
      }

      .mode-selector {
        margin-bottom: 25px;
      }

      .mode-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 15px;
      }

      .mode-option {
        display: block;
        cursor: pointer;
      }

      .mode-option input[type="radio"] {
        display: none;
      }

      .mode-content {
        padding: 20px;
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        text-align: center;
        transition: all 0.3s;
      }

      .mode-option:hover .mode-content {
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }

      .mode-option.active .mode-content {
        border-color: #667eea;
        background: #f0f2ff;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }

      .mode-icon {
        font-size: 36px;
        margin-bottom: 10px;
      }

      .mode-title {
        font-size: 18px;
        font-weight: bold;
        color: #333;
        margin-bottom: 8px;
      }

      .mode-desc {
        font-size: 13px;
        color: #666;
        line-height: 1.5;
      }

      .form-select {
        width: 100%;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        background: white;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .form-select:focus {
        outline: none;
        border-color: #667eea;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * 验证选择
   */
  validate() {
    if (this.selectedMode === 'wordlist') {
      if (!this.selectedWordlist) {
        showToast('请选择一个词表', 'warning')
        return false
      }
    }
    return true
  }
}

// 创建全局实例
export const wordlistSelector = new WordlistSelector()

// 暴露到window（方便HTML中的onclick调用）
window.wordlistSelector = wordlistSelector

