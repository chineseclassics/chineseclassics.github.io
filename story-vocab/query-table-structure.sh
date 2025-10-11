#!/bin/bash

# 查詢 Supabase 表結構的工具
# 使用方法: ./query-table-structure.sh [table_name]

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 如果沒有提供表名，列出所有表
if [ -z "$1" ]; then
    print_header "可用的數據庫表格"
    echo "請使用以下命令查詢特定表的結構："
    echo ""
    echo "  ./query-table-structure.sh vocabulary"
    echo "  ./query-table-structure.sh users"
    echo "  ./query-table-structure.sh story_sessions"
    echo ""
    
    print_warning "提示: 您也可以直接查看遷移文件來了解表結構："
    echo ""
    echo "  cat supabase/migrations/001_initial_schema.sql"
    echo "  cat supabase/migrations/006_ai_vocab_system.sql"
    echo ""
    exit 0
fi

TABLE_NAME=$1

print_header "查詢表 '$TABLE_NAME' 的結構"

echo "方法 1: 從遷移文件中查找"
echo "================================"

if grep -r "CREATE TABLE.*$TABLE_NAME" supabase/migrations/*.sql 2>/dev/null; then
    echo ""
    print_success "在遷移文件中找到了表定義"
    echo ""
    echo "完整的表定義:"
    echo "----------"
    grep -A 50 "CREATE TABLE.*$TABLE_NAME" supabase/migrations/*.sql | head -60
else
    print_warning "在遷移文件中未找到表 '$TABLE_NAME'"
fi

echo ""
echo ""
echo "方法 2: 從遷移文件中查找索引"
echo "================================"

if grep -r "CREATE.*INDEX.*$TABLE_NAME" supabase/migrations/*.sql 2>/dev/null; then
    echo ""
    print_success "找到了相關索引"
else
    print_warning "未找到相關索引"
fi

echo ""
echo ""
echo "方法 3: 從遷移文件中查找策略 (RLS)"
echo "================================"

if grep -r "CREATE POLICY.*$TABLE_NAME" supabase/migrations/*.sql 2>/dev/null; then
    echo ""
    print_success "找到了 RLS 策略"
else
    print_warning "未找到 RLS 策略"
fi

echo ""
echo ""
print_header "表 '$TABLE_NAME' 在哪些遷移文件中被提及"

grep -l "$TABLE_NAME" supabase/migrations/*.sql 2>/dev/null || \
    print_warning "未在任何遷移文件中找到引用"

echo ""
print_success "查詢完成！"

echo ""
echo "💡 提示:"
echo "  - 查看完整的遷移文件: cat supabase/migrations/001_initial_schema.sql"
echo "  - 查看表統計信息: ./supabase-utils.sh tables"
echo "  - 查看索引信息: ./supabase-utils.sh indexes"

