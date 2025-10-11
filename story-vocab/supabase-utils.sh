#!/bin/bash

# Supabase CLI 實用工具腳本
# 使用方法: ./supabase-utils.sh [command]

set -e

PROJECT_DIR="/Users/ylzhang/Documents/GitHub/chineseclassics.github.io"
cd "$PROJECT_DIR"

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印帶顏色的標題
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# 打印成功消息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 打印警告消息
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 打印錯誤消息
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 顯示幫助信息
show_help() {
    cat << EOF
Supabase CLI 實用工具腳本

使用方法:
    ./supabase-utils.sh [command]

可用命令:

  數據庫查詢:
    tables          查看所有表格及統計信息
    indexes         查看索引使用情況
    stats           查看數據庫整體統計
    slow            查看最慢的查詢
    long            查看長時間運行的查詢
    bloat           查看表膨脹情況
    locks           查看鎖定情況
    blocking        查看阻塞查詢
    
  數據庫管理:
    pull            從遠程拉取架構到本地
    push            推送本地遷移到遠程
    diff            比較本地和遠程差異
    migration       創建新的遷移文件
    
  Edge Functions:
    functions       列出所有 Edge Functions
    deploy-vocab    部署 vocab-recommender 函數
    deploy-agent    部署 story-agent 函數
    deploy-all      部署所有 Edge Functions
    logs-vocab      查看 vocab-recommender 日誌
    logs-agent      查看 story-agent 日誌
    
  項目管理:
    status          查看項目狀態
    projects        列出所有項目
    
  實用工具:
    health          運行完整的健康檢查
    report          生成性能報告
    schema          查看表結構（需要 Docker）
    help            顯示此幫助信息

示例:
    ./supabase-utils.sh tables
    ./supabase-utils.sh health
    ./supabase-utils.sh deploy-vocab

EOF
}

# 查看所有表格
cmd_tables() {
    print_header "數據庫表格統計"
    supabase inspect db table-stats --linked
    print_success "表格統計查詢完成"
}

# 查看索引使用情況
cmd_indexes() {
    print_header "索引使用情況"
    supabase inspect db index-stats --linked
    print_success "索引統計查詢完成"
    
    echo ""
    print_warning "注意: Unused = true 的索引可以考慮刪除以節省空間"
}

# 查看數據庫整體統計
cmd_stats() {
    print_header "數據庫整體統計"
    supabase inspect db db-stats --linked
    print_success "數據庫統計查詢完成"
}

# 查看最慢的查詢
cmd_slow() {
    print_header "最慢的查詢（按執行時間排序）"
    supabase inspect db outliers --linked
    print_success "慢查詢分析完成"
}

# 查看長時間運行的查詢
cmd_long() {
    print_header "長時間運行的查詢（>5分鐘）"
    supabase inspect db long-running-queries --linked
    print_success "長查詢檢查完成"
}

# 查看表膨脹情況
cmd_bloat() {
    print_header "表膨脹情況（死元組檢查）"
    supabase inspect db bloat --linked
    print_success "表膨脹檢查完成"
    
    echo ""
    print_warning "如果某些表膨脹嚴重，考慮運行 VACUUM 操作"
}

# 查看鎖定情況
cmd_locks() {
    print_header "當前鎖定情況"
    supabase inspect db locks --linked
    print_success "鎖定檢查完成"
}

# 查看阻塞查詢
cmd_blocking() {
    print_header "阻塞查詢分析"
    supabase inspect db blocking --linked
    print_success "阻塞查詢檢查完成"
}

# 從遠程拉取架構
cmd_pull() {
    print_header "從遠程拉取數據庫架構"
    print_warning "這將創建新的遷移文件..."
    supabase db pull --linked
    print_success "架構拉取完成"
}

# 推送遷移到遠程
cmd_push() {
    print_header "推送遷移到遠程數據庫"
    print_warning "這將修改遠程數據庫！"
    read -p "確認要推送嗎？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase db push --linked
        print_success "遷移推送完成"
    else
        print_error "操作已取消"
    fi
}

# 比較本地和遠程差異
cmd_diff() {
    print_header "比較本地和遠程架構差異"
    supabase db diff --linked
    print_success "差異比較完成"
}

# 創建新的遷移文件
cmd_migration() {
    print_header "創建新的遷移文件"
    read -p "請輸入遷移文件名稱: " migration_name
    if [ -z "$migration_name" ]; then
        print_error "遷移名稱不能為空"
        exit 1
    fi
    supabase migration new "$migration_name"
    print_success "遷移文件已創建"
}

# 列出所有 Edge Functions
cmd_functions() {
    print_header "Edge Functions 列表"
    supabase functions list --project-ref bjykaipbeokbbykvseyr
    print_success "函數列表獲取完成"
}

# 部署 vocab-recommender
cmd_deploy_vocab() {
    print_header "部署 vocab-recommender 函數"
    supabase functions deploy vocab-recommender --project-ref bjykaipbeokbbykvseyr
    print_success "vocab-recommender 部署完成"
}

# 部署 story-agent
cmd_deploy_agent() {
    print_header "部署 story-agent 函數"
    supabase functions deploy story-agent --project-ref bjykaipbeokbbykvseyr
    print_success "story-agent 部署完成"
}

# 部署所有函數
cmd_deploy_all() {
    print_header "部署所有 Edge Functions"
    
    echo "部署 vocab-recommender..."
    supabase functions deploy vocab-recommender --project-ref bjykaipbeokbbykvseyr
    print_success "vocab-recommender 部署完成"
    
    echo ""
    echo "部署 vocab-difficulty-evaluator..."
    supabase functions deploy vocab-difficulty-evaluator --project-ref bjykaipbeokbbykvseyr
    print_success "vocab-difficulty-evaluator 部署完成"
    
    echo ""
    echo "部署 story-agent..."
    supabase functions deploy story-agent --project-ref bjykaipbeokbbykvseyr
    print_success "story-agent 部署完成"
    
    echo ""
    print_success "所有函數部署完成！"
}

# 查看 vocab-recommender 日誌
cmd_logs_vocab() {
    print_header "vocab-recommender 函數日誌"
    supabase functions logs vocab-recommender --project-ref bjykaipbeokbbykvseyr
}

# 查看 story-agent 日誌
cmd_logs_agent() {
    print_header "story-agent 函數日誌"
    supabase functions logs story-agent --project-ref bjykaipbeokbbykvseyr
}

# 查看項目狀態
cmd_status() {
    print_header "Supabase 項目狀態"
    supabase status || print_warning "需要 Docker 運行才能查看本地狀態"
}

# 列出所有項目
cmd_projects() {
    print_header "Supabase 項目列表"
    supabase projects list
    print_success "項目列表獲取完成"
}

# 運行完整的健康檢查
cmd_health() {
    print_header "數據庫健康檢查"
    
    echo "1️⃣ 檢查表統計..."
    supabase inspect db table-stats --linked
    
    echo ""
    echo "2️⃣ 檢查索引效率..."
    supabase inspect db index-stats --linked | grep "true" && \
        print_warning "發現未使用的索引，可以考慮刪除" || \
        print_success "所有索引都在使用中"
    
    echo ""
    echo "3️⃣ 檢查數據庫統計..."
    supabase inspect db db-stats --linked
    
    echo ""
    echo "4️⃣ 檢查慢查詢..."
    supabase inspect db outliers --linked | head -10
    
    echo ""
    echo "5️⃣ 檢查表膨脹..."
    supabase inspect db bloat --linked
    
    echo ""
    print_success "健康檢查完成！"
}

# 生成性能報告
cmd_report() {
    print_header "生成性能報告"
    
    REPORT_DIR="./supabase-reports"
    mkdir -p "$REPORT_DIR"
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    REPORT_FILE="$REPORT_DIR/report_$TIMESTAMP.txt"
    
    {
        echo "Supabase 性能報告"
        echo "生成時間: $(date)"
        echo "項目: story-vocab"
        echo ""
        echo "=== 表統計 ==="
        supabase inspect db table-stats --linked
        echo ""
        echo "=== 索引統計 ==="
        supabase inspect db index-stats --linked
        echo ""
        echo "=== 數據庫統計 ==="
        supabase inspect db db-stats --linked
        echo ""
        echo "=== 慢查詢 ==="
        supabase inspect db outliers --linked
        echo ""
        echo "=== 表膨脹 ==="
        supabase inspect db bloat --linked
    } > "$REPORT_FILE"
    
    print_success "報告已生成: $REPORT_FILE"
}

# 查看表結構
cmd_schema() {
    print_header "導出表結構"
    print_warning "此命令需要 Docker 運行"
    
    read -p "請輸入表名（留空則導出所有表）: " table_name
    
    SCHEMA_FILE="./schema_$(date +%Y%m%d_%H%M%S).sql"
    
    if [ -z "$table_name" ]; then
        supabase db dump --linked -f "$SCHEMA_FILE"
    else
        supabase db dump --linked -f "$SCHEMA_FILE"
        grep -A 30 "CREATE TABLE.*$table_name" "$SCHEMA_FILE" || \
            print_error "未找到表 $table_name"
    fi
    
    print_success "架構已導出到: $SCHEMA_FILE"
}

# 主函數
main() {
    case "${1:-help}" in
        tables)         cmd_tables ;;
        indexes)        cmd_indexes ;;
        stats)          cmd_stats ;;
        slow)           cmd_slow ;;
        long)           cmd_long ;;
        bloat)          cmd_bloat ;;
        locks)          cmd_locks ;;
        blocking)       cmd_blocking ;;
        pull)           cmd_pull ;;
        push)           cmd_push ;;
        diff)           cmd_diff ;;
        migration)      cmd_migration ;;
        functions)      cmd_functions ;;
        deploy-vocab)   cmd_deploy_vocab ;;
        deploy-agent)   cmd_deploy_agent ;;
        deploy-all)     cmd_deploy_all ;;
        logs-vocab)     cmd_logs_vocab ;;
        logs-agent)     cmd_logs_agent ;;
        status)         cmd_status ;;
        projects)       cmd_projects ;;
        health)         cmd_health ;;
        report)         cmd_report ;;
        schema)         cmd_schema ;;
        help|--help|-h) show_help ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 執行主函數
main "$@"

