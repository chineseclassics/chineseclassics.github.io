-- 允許同房間的參與者更新 game_teams（避免僅限房主導致 total_score 不更新）
-- 保留原有 host 更新政策，新增參與者可更新政策

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_teams'
      and policyname = 'game_teams_update_participant'
  ) then
    create policy game_teams_update_participant
    on public.game_teams
    for update
    to authenticated
    using (
      exists (
        select 1 from public.game_participants gp
        where gp.room_id = game_teams.room_id
          and gp.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.game_participants gp
        where gp.room_id = game_teams.room_id
          and gp.user_id = auth.uid()
      )
    );
  end if;
end$$;
