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
   * 排序規則：
   * 1. 有聲色意境的詩句，按最新聲色意境的創建時間降序排列
   * 2. 沒有聲色意境的詩句，隨機排序（每次刷新順序不同）
   */
  async loadPoems() {
    try {
      if (!this.supabase) {
        console.error('❌ Supabase 未配置，無法加載詩歌數據');
        // 不返回模擬數據，返回空數組，讓前端顯示適當的錯誤提示
        return [];
      }
      
      console.log('從 Supabase 加載詩歌...');
      
      // 並行查詢：同時獲取所有詩句和所有已審核通過的聲色意境
      const [poemsResult, atmospheresResult] = await Promise.all([
        this.supabase.from('poems').select('*'),
        this.supabase
          .from('poem_atmospheres')
          .select('poem_id, created_at')
          .eq('status', 'approved')
      ]);
      
      // 處理詩句查詢結果
      if (poemsResult.error) {
        console.error('Supabase 查詢錯誤:', poemsResult.error);
        throw poemsResult.error;
      }
      
      const allPoems = poemsResult.data || [];
      if (allPoems.length === 0) {
        console.error('❌ 數據庫中沒有詩歌數據');
        // 不返回模擬數據，返回空數組，讓前端顯示適當的錯誤提示
        return [];
      }
      
      // 處理聲色意境查詢結果（即使失敗也不影響，只是沒有排序）
      const atmospheres = atmospheresResult.data || [];
      
      // 計算每個詩句的最新聲色意境時間
      const poemLatestAtmosphere = new Map();
      atmospheres.forEach(atm => {
        const poemId = atm.poem_id;
        const createdAt = new Date(atm.created_at).getTime();
        const existing = poemLatestAtmosphere.get(poemId);
        if (!existing || createdAt > existing) {
          poemLatestAtmosphere.set(poemId, createdAt);
        }
      });
      
      // 分組：有聲色意境的 vs 沒有聲色意境的
      const poemsWithAtmosphere = [];
      const poemsWithoutAtmosphere = [];
      
      allPoems.forEach(poem => {
        const latestAtmosphereTime = poemLatestAtmosphere.get(poem.id);
        if (latestAtmosphereTime) {
          poemsWithAtmosphere.push({
            ...poem,
            latest_atmosphere_time: latestAtmosphereTime
          });
        } else {
          poemsWithoutAtmosphere.push(poem);
        }
      });
      
      // 有聲色意境的詩句，按最新聲色意境時間降序排序
      poemsWithAtmosphere.sort((a, b) => 
        b.latest_atmosphere_time - a.latest_atmosphere_time
      );
      
      // 沒有聲色意境的詩句，隨機排序
      const shuffledWithoutAtmosphere = this.shuffleArray(poemsWithoutAtmosphere);
      
      // 合併：有聲色意境的在前，沒有聲色意境的在後
      // 為有聲色意境的詩句添加標記
      const sortedPoems = [
        ...poemsWithAtmosphere.map(({ latest_atmosphere_time, ...poem }) => ({
          ...poem,
          hasAtmosphere: true
        })),
        ...shuffledWithoutAtmosphere.map(poem => ({
          ...poem,
          hasAtmosphere: false
        }))
      ];
      
      console.log('詩句排序完成:', {
        有聲色意境: poemsWithAtmosphere.length,
        無聲色意境: poemsWithoutAtmosphere.length
      });
      
      this.poems = sortedPoems;
      return sortedPoems;
    } catch (error) {
      console.error('❌ 加載詩歌列表失敗:', error);
      // 不返回模擬數據，返回空數組，讓前端顯示適當的錯誤提示
      // 這樣可以避免用戶看到開發時期的測試數據
      return [];
    }
  }
  
  /**
   * 隨機打亂數組順序（Fisher-Yates 洗牌算法）
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  /**
   * 根據 ID 加載詩歌
   */
  async loadPoemById(poemId) {
    try {
      if (!this.supabase) {
        console.error('❌ Supabase 未配置，無法加載詩歌數據');
        return null;
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
   * 注意：模擬數據應與實際數據格式一致（單句形式）
   */
  getMockPoems() {
    return [
      {
        id: 'mock-1',
        title: '靜夜思',
        author: '李白',
        dynasty: '唐',
        content: '床前明月光\n疑是地上霜'
      },
      {
        id: 'mock-2',
        title: '春曉',
        author: '孟浩然',
        dynasty: '唐',
        content: '春眠不覺曉\n處處聞啼鳥'
      }
    ];
  }
  
  getMockPoemById(id) {
    const poems = this.getMockPoems();
    return poems.find(p => p.id === id) || poems[0];
  }
}

