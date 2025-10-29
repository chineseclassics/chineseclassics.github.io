-- 簡化 essays.status 為 ['writing','graded'] 並回填舊資料

begin;

-- 1) 刪除舊的狀態檢查約束（名稱可能不同，保留常見名稱）
alter table public.essays drop constraint if exists essays_status_check;

-- 2) 回填舊值到 writing
update public.essays set status = 'writing' where status in ('draft','submitted') or status is null;

-- 3) 設定預設值與新的檢查約束
alter table public.essays alter column status set default 'writing';
alter table public.essays add constraint essays_status_check check (status in ('writing','graded'));

commit;


