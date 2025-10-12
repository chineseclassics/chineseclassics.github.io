-- 查看用戶分佈情況
SELECT 
  user_type,
  email IS NOT NULL as has_email,
  COUNT(*) as count
FROM users
GROUP BY user_type, email IS NOT NULL
ORDER BY user_type, has_email;

-- 查看舊匿名用戶（沒有綁定身份的）
SELECT 
  u.id,
  u.display_name,
  u.email,
  u.user_type,
  u.created_at,
  ui.provider
FROM users u
LEFT JOIN user_identities ui ON u.id = ui.user_id
WHERE u.email IS NULL
ORDER BY u.created_at DESC
LIMIT 10;
