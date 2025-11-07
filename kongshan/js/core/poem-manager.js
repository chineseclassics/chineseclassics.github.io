// =====================================================
// 詩歌管理模塊
// =====================================================

/**
 * 詩歌管理器
 * 負責詩歌數據的加載和管理
 */
export class PoemManager {
  constructor(supabase) {
    this.supabase = supabase;
    this.poems = [];
    this.currentPoem = null;
  }
  
  /**
   * 加載所有詩歌列表
   */
  async loadPoems() {
    try {
      if (!this.supabase) {
        console.warn('Supabase 未配置，使用模擬數據');
        return this.getMockPoems();
      }
      
      console.log('從 Supabase 加載詩歌...');
      const { data, error } = await this.supabase
        .from('poems')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase 查詢錯誤:', error);
        throw error;
      }
      
      console.log('從 Supabase 加載到的數據:', data);
      this.poems = data || [];
      
      if (this.poems.length === 0) {
        console.warn('數據庫中沒有詩歌，使用模擬數據');
        return this.getMockPoems();
      }
      
      return this.poems;
    } catch (error) {
      console.error('加載詩歌列表失敗:', error);
      console.log('使用模擬數據作為降級方案');
      return this.getMockPoems();
    }
  }
  
  /**
   * 根據 ID 加載詩歌
   */
  async loadPoemById(poemId) {
    try {
      if (!this.supabase) {
        return this.getMockPoemById(poemId);
      }
      
      const { data, error } = await this.supabase
        .from('poems')
        .select('*')
        .eq('id', poemId)
        .single();
      
      if (error) throw error;
      
      this.currentPoem = data;
      return data;
    } catch (error) {
      console.error('加載詩歌失敗:', error);
      return null;
    }
  }
  
  /**
   * 獲取當前詩歌
   */
  getCurrentPoem() {
    return this.currentPoem;
  }
  
  /**
   * 模擬數據（用於開發和測試）
   */
  getMockPoems() {
    return [
      {
        id: 'mock-1',
        title: '靜夜思',
        author: '李白',
        dynasty: '唐',
        content: '床前明月光，\n疑是地上霜。\n舉頭望明月，\n低頭思故鄉。'
      },
      {
        id: 'mock-2',
        title: '春曉',
        author: '孟浩然',
        dynasty: '唐',
        content: '春眠不覺曉，\n處處聞啼鳥。\n夜來風雨聲，\n花落知多少。'
      }
    ];
  }
  
  getMockPoemById(id) {
    const poems = this.getMockPoems();
    return poems.find(p => p.id === id) || poems[0];
  }
}

