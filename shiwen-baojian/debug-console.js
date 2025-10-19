// 請在瀏覽器 Console 中複製粘貼執行這段代碼
// 確保頁面已完全加載（看到老師儀表板後再執行）

// 直接查詢數據庫，看看 class_members 表的完整數據
async function debugStudentList() {
  console.log('🔍 開始診斷學生列表問題...');
  
  // 獲取 Supabase 客戶端
  const supabase = window.AppState?.supabase || window.supabase;
  if (!supabase) {
    console.error('❌ 找不到 Supabase 客戶端！請確保頁面已完全加載');
    return;
  }
  
  // 1. 查詢所有 class_members（包括關聯的 users 數據）
  const { data: classMembers, error: membersError } = await supabase
    .from('class_members')
    .select(`
      id,
      class_id,
      student_id,
      added_at,
      student:users!student_id(
        id,
        email,
        display_name,
        status,
        last_login_at
      )
    `)
    .order('added_at', { ascending: false });
  
  if (membersError) {
    console.error('❌ 查詢失敗:', membersError);
    return;
  }
  
  console.log('📊 數據庫查詢結果:');
  console.log('總數:', classMembers.length);
  console.table(classMembers.map(m => ({
    email: m.student?.email || 'NULL',
    name: m.student?.display_name || 'NULL',
    status: m.student?.status || 'NULL',
    last_login: m.student?.last_login_at || 'NULL',
    added_at: m.added_at
  })));
  
  // 2. 檢查哪些學生的 student 為 null
  const nullStudents = classMembers.filter(m => m.student === null);
  if (nullStudents.length > 0) {
    console.warn('⚠️ 發現 student 為 null 的記錄:', nullStudents.length);
    console.log('這些記錄會被前端過濾掉！');
    console.table(nullStudents.map(m => ({
      id: m.id,
      student_id: m.student_id,
      added_at: m.added_at
    })));
  }
  
  // 3. 檢查活躍學生
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeStudents = classMembers.filter(m => 
    m.student && 
    m.student.last_login_at && 
    new Date(m.student.last_login_at) >= sevenDaysAgo
  );
  
  console.log('📈 活躍學生分析:');
  console.log('活躍學生數（最近7天登入）:', activeStudents.length);
  if (activeStudents.length > 0) {
    console.table(activeStudents.map(m => ({
      email: m.student.email,
      name: m.student.display_name,
      last_login: m.student.last_login_at
    })));
  }
  
  // 4. 特別檢查 3023022
  const target = classMembers.find(m => m.student?.email === '3023022@student.isf.edu.hk');
  console.log('🎯 特別檢查 3023022:');
  if (target) {
    console.log('✅ 找到該學生:', target);
    console.log('student 對象:', target.student);
  } else {
    console.log('❌ 未找到該學生');
  }
  
  return classMembers;
}

// 執行診斷
const result = await debugStudentList();

