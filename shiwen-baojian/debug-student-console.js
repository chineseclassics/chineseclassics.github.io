// 學生端診斷腳本
// 請在學生端（3023022 登入後）的瀏覽器 Console 中執行

async function debugStudentView() {
  console.log('🔍 開始診斷學生端問題...');
  
  // 1. 檢查當前登入用戶
  const { data: { user } } = await AppState.supabase.auth.getUser();
  console.log('👤 當前用戶:', {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name
  });
  
  // 2. 檢查用戶記錄
  const { data: userRecord, error: userError } = await AppState.supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  console.log('📝 用戶記錄:', userRecord);
  if (userError) {
    console.error('❌ 獲取用戶記錄失敗:', userError);
  }
  
  // 3. 檢查班級成員關係
  const { data: classMemberships, error: memberError } = await AppState.supabase
    .from('class_members')
    .select(`
      id,
      class_id,
      added_at,
      class:classes(
        id,
        class_name,
        teacher_id,
        is_active
      )
    `)
    .eq('student_id', user.id);
  
  console.log('🏫 班級成員關係:');
  console.log('加入的班級數:', classMemberships?.length || 0);
  if (classMemberships && classMemberships.length > 0) {
    console.table(classMemberships.map(m => ({
      class_name: m.class?.class_name || 'NULL',
      is_active: m.class?.is_active,
      added_at: m.added_at
    })));
  } else {
    console.log('❌ 未加入任何班級！');
  }
  
  if (memberError) {
    console.error('❌ 獲取班級成員關係失敗:', memberError);
  }
  
  // 4. 檢查待激活記錄
  const { data: pendingRecords } = await AppState.supabase
    .from('pending_students')
    .select('*')
    .eq('email', user.email);
  
  console.log('⏳ 待激活記錄:');
  if (pendingRecords && pendingRecords.length > 0) {
    console.warn('⚠️ 還有待激活記錄（應該已被激活）:', pendingRecords);
  } else {
    console.log('✅ 無待激活記錄（正常）');
  }
  
  // 5. 檢查任務列表
  if (classMemberships && classMemberships.length > 0) {
    const classIds = classMemberships.map(m => m.class_id);
    
    const { data: assignments, error: assignError } = await AppState.supabase
      .from('assignments')
      .select('*')
      .in('class_id', classIds);
    
    console.log('📋 任務列表:');
    console.log('任務總數:', assignments?.length || 0);
    if (assignments && assignments.length > 0) {
      console.table(assignments.map(a => ({
        title: a.title,
        status: a.status,
        due_date: a.due_date
      })));
    } else {
      console.log('❌ 無任務（老師可能還沒發佈）');
    }
    
    if (assignError) {
      console.error('❌ 獲取任務列表失敗:', assignError);
    }
  }
  
  return {
    user: userRecord,
    classes: classMemberships,
    pending: pendingRecords
  };
}

// 執行診斷
const result = await debugStudentView();

