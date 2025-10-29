-- 新增 assignments 寫作模式欄位（論文/創作）與可選布局配置
-- 在 Supabase Dashboard 的 SQL Editor 執行

begin;

-- 1) 新增 writing_mode（預設 essay-structured；限定枚舉）
alter table public.assignments
add column if not exists writing_mode text
  constraint assignments_writing_mode_check
  check (writing_mode in ('essay-structured','creative'))
  default 'essay-structured' not null;

-- 2) 新增 editor_layout_json（可選，用於字數目標、章節模板等）
alter table public.assignments
add column if not exists editor_layout_json jsonb;

-- 3) 回填既有資料（若為 null 則設為 essay-structured）
update public.assignments
set writing_mode = 'essay-structured'
where writing_mode is null;

commit;


