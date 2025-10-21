/**
 * AI 评分建议请求模块
 * 
 * 功能：调用 grading-agent Edge Function 获取 AI 评分建议
 */

/**
 * 请求 AI 评分建议
 * @param {string} essayId - 论文 ID
 * @param {Object} gradingRubricJson - 评分标准 JSON
 * @param {Object} supabaseClient - Supabase 客户端
 * @returns {Object} AI 评分结果
 */
export async function requestAIGradingSuggestion(essayId, gradingRubricJson, supabaseClient) {
  try {
    console.log('📊 请求 AI 评分建议...');
    console.log('论文 ID:', essayId);
    console.log('评分标准:', gradingRubricJson);

    // 获取 Edge Function URL
    const supabaseUrl = supabaseClient.supabaseUrl;
    const functionUrl = `${supabaseUrl}/functions/v1/grading-agent`;

    // 获取认证 token
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      throw new Error('未登录');
    }

    // 调用 Edge Function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        essay_id: essayId,
        grading_rubric_json: gradingRubricJson
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI 评分失败');
    }

    const result = await response.json();
    console.log('✅ AI 评分建议获取成功:', result);

    return result;
  } catch (error) {
    console.error('❌ 请求 AI 评分失败:', error);
    throw error;
  }
}

/**
 * 加载已保存的 AI 评分建议（如果存在）
 * @param {string} essayId - 论文 ID
 * @param {Object} supabaseClient - Supabase 客户端
 * @returns {Object|null} 已保存的 AI 评分建议
 */
export async function loadSavedAISuggestion(essayId, supabaseClient) {
  try {
    const { data, error } = await supabaseClient
      .from('ai_grading_suggestions')
      .select('*')
      .eq('essay_id', essayId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    // 转换数据库结构为前端期望的格式
    // 数据库: criterion_a_score, criterion_b_score, etc. + reasoning
    // 前端期望: criteria_scores = { "A": { "score": 6, "reason": "..." }, ... }
    const criteriaScores = {};
    
    if (data.criterion_a_score !== null) {
      criteriaScores.A = {
        score: data.criterion_a_score,
        reason: data.reasoning?.A || ''
      };
    }
    if (data.criterion_b_score !== null) {
      criteriaScores.B = {
        score: data.criterion_b_score,
        reason: data.reasoning?.B || ''
      };
    }
    if (data.criterion_c_score !== null) {
      criteriaScores.C = {
        score: data.criterion_c_score,
        reason: data.reasoning?.C || ''
      };
    }
    if (data.criterion_d_score !== null) {
      criteriaScores.D = {
        score: data.criterion_d_score,
        reason: data.reasoning?.D || ''
      };
    }

    return {
      ...data,
      criteria_scores: criteriaScores
    };
  } catch (error) {
    console.error('加载 AI 评分建议失败:', error);
    return null;
  }
}

