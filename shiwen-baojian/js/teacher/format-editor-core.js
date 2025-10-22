/**
 * FormatEditorCore - 写作要求编辑器核心逻辑（纯工具类）
 * 
 * 设计理念：
 * - 所有方法都是静态方法（static）
 * - 不持有状态，完全无副作用
 * - 可被模板库页面和任务创建页面复用
 * - 需要 supabase 的方法通过参数传入
 * 
 * @created 2025-10-20
 * @related teacher-custom-format-ai 阶段 3.4
 */

class FormatEditorCore {
  
  // ============================================================
  // Quill 编辑器初始化
  // ============================================================
  
  /**
   * 初始化 Quill 编辑器（纯文本模式）
   * @param {string} containerSelector - 容器选择器（如 '#editor'）
   * @param {Object} options - 配置选项
   * @returns {Quill} Quill 实例
   */
  static initQuill(containerSelector, options = {}) {
    const defaultOptions = {
      theme: 'snow',
      modules: {
        toolbar: false  // 纯文本编辑，无工具栏
      },
      placeholder: options.placeholder || '請輸入寫作指引...\n\n例如：\n論文總字數 1500-2000 字\n必須 3 個分論點\n詳細分析紅樓夢中林黛玉和薛寶釵的外貌描寫',
    };
    
    const quillOptions = { ...defaultOptions, ...options };
    
    try {
      const quill = new Quill(containerSelector, quillOptions);
      console.log('[FormatEditorCore] Quill 编辑器初始化成功:', containerSelector);
      return quill;
    } catch (error) {
      console.error('[FormatEditorCore] Quill 初始化失败:', error);
      throw new Error('编辑器初始化失败：' + error.message);
    }
  }
  
  // ============================================================
  // 系统格式加载
  // ============================================================
  
  /**
   * 加载系统格式详情
   * @param {string} formatId - 格式 ID
   * @param {Object} supabase - Supabase 客户端
   * @returns {Promise<Object>} { spec_json, human_input }
   */
  static async loadSystemFormat(formatId, supabase) {
    try {
      const { data, error } = await supabase
        .from('format_specifications')
        .select('id, name, description, spec_json, human_input, is_system, is_template')
        .eq('id', formatId)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('格式不存在');
      
      console.log('[FormatEditorCore] 格式加載成功:', formatId, '名稱:', data.name, 'is_system:', data.is_system);
      return data;
    } catch (error) {
      console.error('[FormatEditorCore] 加载系统格式失败:', error);
      throw new Error('加载系统格式失败：' + error.message);
    }
  }
  
  // ============================================================
  // JSON ↔ 人类可读转换
  // ============================================================
  
  /**
   * 将格式 JSON 转换为人类可读文本
   * @param {Object} formatJSON - 格式 JSON 对象
   * @returns {string} 人类可读文本
   */
  /**
   * 🚨 階段 3.5.2.5：完善 JSON 轉人類可讀格式
   * 將格式 JSON 轉換為易讀的自然語言文本
   */
  static formatJSONToHumanReadable(formatJSON) {
    if (!formatJSON) return '';
    
    let text = '';
    
    // 任務類型
    if (formatJSON.metadata && formatJSON.metadata.structure_type) {
      text += `【任務類型】\n${formatJSON.metadata.structure_type}\n\n`;
    }
    
    // 字數要求
    if (formatJSON.constraints && formatJSON.constraints.total_word_count) {
      const wc = formatJSON.constraints.total_word_count;
      if (wc.min && wc.max) {
        text += `【字數要求】\n• 總字數：${wc.min}-${wc.max} 字\n\n`;
      } else if (wc.min) {
        text += `【字數要求】\n• 總字數：至少 ${wc.min} 字\n\n`;
      } else if (wc.max) {
        text += `【字數要求】\n• 總字數：最多 ${wc.max} 字\n\n`;
      }
    }
    
    // 段落結構
    if (formatJSON.structure && formatJSON.structure.required_sections) {
      text += `【段落結構】\n`;
      formatJSON.structure.required_sections.forEach(section => {
        const desc = section.description || section.content_requirements || '';
        text += `• ${section.name}${desc ? '：' + desc : ''}\n`;
        if (section.word_count) {
          const wc = section.word_count;
          if (wc.min && wc.max) {
            text += `  字數：${wc.min}-${wc.max} 字\n`;
          }
        }
      });
      text += '\n';
    }
    
    // 內容要求
    if (formatJSON.content_requirements && formatJSON.content_requirements.length > 0) {
      text += `【內容要求】\n`;
      formatJSON.content_requirements.forEach(req => {
        if (req.literary_work) {
          text += `• 作品：${req.literary_work}\n`;
        }
        if (req.theme) {
          text += `• 主題：${req.theme}\n`;
        }
        if (req.specific_criteria && Array.isArray(req.specific_criteria)) {
          text += `• 要求：${req.specific_criteria.join('、')}\n`;
        } else if (req.description || req.requirement) {
          text += `• ${req.description || req.requirement}\n`;
        }
      });
      text += '\n';
    }
    
    // 檢查維度
    if (formatJSON.analysis_dimensions && formatJSON.analysis_dimensions.length > 0) {
      text += `【檢查維度】\n`;
      formatJSON.analysis_dimensions.forEach(dim => {
        text += `${dim.name}：\n`;
        if (dim.checks && Array.isArray(dim.checks)) {
          dim.checks.forEach(check => {
            text += `  - ${check}\n`;
          });
        }
        text += '\n';
      });
    }
    
    // 如果沒有任何內容，返回基本信息
    if (!text) {
      if (formatJSON.metadata) {
        text = `【格式名稱】\n${formatJSON.metadata.name || '未命名'}\n\n`;
        if (formatJSON.metadata.description) {
          text += `【描述】\n${formatJSON.metadata.description}\n`;
        }
      } else {
        text = '（格式內容為空）';
      }
    }
    
    return text.trim();
  }
  
  // ============================================================
  // AI 优化（两阶段流程）
  // ============================================================
  
  /**
   * 使用 AI 优化格式（两阶段流程）
   * @param {string} text - 用户输入文本
   * @param {string} mode - 模式：'custom' 或 'incremental'
   * @param {string|null} baseFormatId - 基础格式 ID（增量模式需要）
   * @param {Object} supabase - Supabase 客户端
   * @returns {Promise<Object>} { human_readable, format_json }
   */
  static async optimizeWithAI(text, mode, baseFormatId, supabase) {
    if (!text || !text.trim()) {
      throw new Error('请输入写作要求');
    }
    
    try {
      // 获取认证 token
      const authToken = await this._getAuthToken(supabase);
      const SUPABASE_URL = supabase.supabaseUrl;
      
      // 阶段 1：生成人类可读版本
      console.log('[FormatEditorCore] 调用 AI 优化 - 阶段 1：生成人类可读版本');
      const stage1Response = await fetch(`${SUPABASE_URL}/functions/v1/format-spec-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          stage: 'generate_readable',
          mode: mode === 'custom' ? 'custom' : 'incremental',
          teacher_input: text.trim(),
          base_template_id: baseFormatId
        })
      });
      
      const stage1Result = await stage1Response.json();
      
      if (!stage1Result.success) {
        throw new Error(stage1Result.error || 'AI 优化失败');
      }
      
      const humanReadable = stage1Result.human_readable;
      console.log('[FormatEditorCore] 阶段 1 完成，耗时:', stage1Result.duration_ms, 'ms');
      
      // 阶段 2：转换为 JSON
      console.log('[FormatEditorCore] 阶段 2：转换为 JSON');
      const stage2Response = await fetch(`${SUPABASE_URL}/functions/v1/format-spec-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          stage: 'convert_to_json',
          human_readable: humanReadable
        })
      });
      
      const stage2Result = await stage2Response.json();
      
      if (!stage2Result.success) {
        throw new Error(stage2Result.error || 'JSON 转换失败');
      }
      
      console.log('[FormatEditorCore] 阶段 2 完成，耗时:', stage2Result.parse_duration_ms, 'ms');
      console.log('[FormatEditorCore] AI 优化全流程完成');
      
      return {
        human_readable: humanReadable,
        format_json: stage2Result.format_json
      };
    } catch (error) {
      console.error('[FormatEditorCore] AI 优化失败:', error);
      throw new Error('AI 优化失败：' + error.message);
    }
  }
  
  // ============================================================
  // 格式保存
  // ============================================================
  
  /**
   * 保存格式到数据库
   * @param {Object} formatData - 格式数据
   * @param {Object} supabase - Supabase 客户端
   * @returns {Promise<Object>} 保存的格式对象（含 id）
   */
  static async saveFormat(formatData, supabase) {
    try {
      // 检查认证状态
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('请先登录才能保存格式');
      }
      
      // 验证必需字段
      if (!formatData.name || !formatData.name.trim()) {
        throw new Error('格式名称不能为空');
      }
      
      if (!formatData.spec_json) {
        throw new Error('格式 JSON 不能为空');
      }
      
      // 验证 parent_spec_id 是否为有效 UUID
      let parentSpecId = null;
      if (formatData.parent_spec_id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(formatData.parent_spec_id)) {
          parentSpecId = formatData.parent_spec_id;
        } else {
          console.warn('[FormatEditorCore] parent_spec_id 不是有效的 UUID，设为 NULL');
        }
      }
      
      // 更新 metadata 中的名称
      const specJson = { ...formatData.spec_json };
      if (specJson.metadata) {
        specJson.metadata.name = formatData.name;
      }
      
      // 构建保存数据
      const saveData = {
        name: formatData.name.trim(),
        description: formatData.description?.trim() || '',
        essay_type: specJson.metadata?.essay_type || 'custom',
        spec_json: specJson,
        human_input: formatData.human_input?.trim() || '',
        is_template: formatData.is_template || false,  // 是否为通用模板
        parent_spec_id: parentSpecId,
        is_system: false,
        is_public: false
      };
      
      // 🚨 修復：判斷是創建還是更新（檢查 ID 是否為真實 UUID）
      let result;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidId = formatData.id && uuidRegex.test(formatData.id);
      
      if (isValidId) {
        // 更新现有格式（只有當 ID 是真實 UUID 時）
        console.log('[FormatEditorCore] 更新現有格式:', formatData.id);
        
        const { data, error } = await supabase
          .from('format_specifications')
          .update(saveData)
          .eq('id', formatData.id)
          .select()
          .single();
        
        if (error) {
          console.error('[FormatEditorCore] 更新失敗，錯誤詳情:', error);
          throw error;
        }
        
        if (!data) {
          throw new Error('更新失敗：找不到對應的格式記錄');
        }
        
        result = data;
        console.log('[FormatEditorCore] 格式已更新:', result.id);
      } else {
        // 创建新格式
        if (formatData.id) {
          console.warn('[FormatEditorCore] ID 格式無效，將創建新格式而非更新:', formatData.id);
        }
        
        saveData.created_by = session.user.id;
        
        const { data, error } = await supabase
          .from('format_specifications')
          .insert(saveData)
          .select()
          .single();
        
        if (error) {
          console.error('[FormatEditorCore] 創建失敗，錯誤詳情:', error);
          throw error;
        }
        
        result = data;
        console.log('[FormatEditorCore] 格式已创建:', result.id);
      }
      
      return result;
    } catch (error) {
      console.error('[FormatEditorCore] 保存格式失败:', error);
      throw new Error('保存格式失败：' + error.message);
    }
  }
  
  // ============================================================
  // 草稿自动保存（localStorage）
  // ============================================================
  
  /**
   * 🚨 優化：設置智能草稿自動保存
   * @param {Quill} quill - Quill 实例
   * @param {string} draftKey - localStorage key（区分不同场景）
   * @param {Function} shouldSaveCondition - 可選的條件函數，返回 true 時才保存草稿
   * @returns {Function} 清理函数（取消监听）
   */
  static setupDraftAutoSave(quill, draftKey, shouldSaveCondition = null) {
    if (!quill) {
      throw new Error('Quill 实例不能为空');
    }
    
    // 🚨 階段 3.5.4.2：草稿保存處理函數（帶時間戳）
    const saveDraft = () => {
      // 🚨 優化：檢查條件函數
      if (shouldSaveCondition && !shouldSaveCondition()) {
        console.log('[FormatEditorCore] 跳過草稿保存（條件不滿足）:', draftKey);
        return;
      }
      
      const text = quill.getText().trim();
      if (text) {
        const draftData = {
          content: text,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        console.log('[FormatEditorCore] 草稿已自动保存:', draftKey);
      }
    };
    
    // 监听内容变化（防抖 1 秒）
    let saveTimeout;
    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveDraft, 1000);
    };
    
    quill.on('text-change', debouncedSave);
    
    console.log('[FormatEditorCore] 草稿自动保存已启用:', draftKey, shouldSaveCondition ? '（帶條件檢查）' : '');
    
    // 返回清理函数
    return () => {
      quill.off('text-change', debouncedSave);
      clearTimeout(saveTimeout);
      console.log('[FormatEditorCore] 草稿自动保存已停用:', draftKey);
    };
  }
  
  /**
   * 🚨 階段 3.5.4.2：加載草稿（支持過期管理）
   * @param {string} draftKey - localStorage key
   * @returns {string|null} 草稿文本或 null
   */
  static loadDraft(draftKey) {
    const draftStr = localStorage.getItem(draftKey);
    if (!draftStr) return null;
    
    try {
      // 嘗試解析 JSON 格式（新格式帶時間戳）
      const draftData = JSON.parse(draftStr);
      
      // 檢查過期（24小時）
      if (draftData.timestamp) {
        const draftTime = new Date(draftData.timestamp);
        const now = new Date();
        const hoursDiff = (now - draftTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          console.log('[FormatEditorCore] 草稿已過期（超過24小時），自動清除');
          this.clearDraft(draftKey);
          return null;
        }
        
        console.log('[FormatEditorCore] 草稿已加載:', draftKey, `(${Math.floor(hoursDiff)}小時前)`);
        return draftData.content;
      }
      
      // 如果沒有時間戳但有 content，也返回
      return draftData.content || draftData;
    } catch (e) {
      // 如果不是 JSON，視為舊格式（純文本）
      console.log('[FormatEditorCore] 草稿已加載（舊格式）:', draftKey);
      return draftStr;
    }
  }
  
  /**
   * 清除草稿
   * @param {string} draftKey - localStorage key
   */
  static clearDraft(draftKey) {
    localStorage.removeItem(draftKey);
    console.log('[FormatEditorCore] 草稿已清除:', draftKey);
  }
  
  /**
   * 询问用户是否恢复草稿
   * @param {string} draftKey - localStorage key
   * @param {Quill} quill - Quill 实例
   * @returns {boolean} 是否恢复了草稿
   */
  static askRestoreDraft(draftKey, quill) {
    const draft = this.loadDraft(draftKey);
    if (draft && quill) {
      const shouldRestore = confirm('檢測到未保存的草稿，是否恢復？\n\n' + 
                                     draft.substring(0, 100) + 
                                     (draft.length > 100 ? '...' : ''));
      if (shouldRestore) {
        quill.setText(draft);
        console.log('[FormatEditorCore] 草稿已恢复');
        return true;
      } else {
        this.clearDraft(draftKey);
        console.log('[FormatEditorCore] 用户拒绝恢复草稿');
        return false;
      }
    }
    return false;
  }
  
  // ============================================================
  // 辅助方法
  // ============================================================
  
  /**
   * 获取认证 token（内部方法）
   * @param {Object} supabase - Supabase 客户端
   * @returns {Promise<string>} Auth token
   * @private
   */
  static async _getAuthToken(supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || supabase.supabaseKey;
    } catch (error) {
      console.warn('[FormatEditorCore] 获取 token 失败，使用 anon key');
      return supabase.supabaseKey;
    }
  }
}

// 导出为 ES 模块
export default FormatEditorCore;

