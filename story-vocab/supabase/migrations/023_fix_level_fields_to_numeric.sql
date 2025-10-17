-- 修复 game_session_summary 表中的 level 字段类型
-- 从 integer 改为 numeric(2,1) 以支持小数（如 L2.3）

-- 修改 estimated_level_before 字段
ALTER TABLE game_session_summary 
  ALTER COLUMN estimated_level_before TYPE NUMERIC(2,1);

-- 修改 estimated_level_after 字段
ALTER TABLE game_session_summary 
  ALTER COLUMN estimated_level_after TYPE NUMERIC(2,1);

-- 添加注释
COMMENT ON COLUMN game_session_summary.estimated_level_before IS '游戏前估计水平（L1.0-L5.0）';
COMMENT ON COLUMN game_session_summary.estimated_level_after IS '游戏后估计水平（L1.0-L5.0）';

