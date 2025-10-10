-- 检查新表是否创建
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('wordlists', 'wordlist_tags', 'vocabulary_wordlist_mapping', 'user_wordlist_preferences')
ORDER BY table_name;
