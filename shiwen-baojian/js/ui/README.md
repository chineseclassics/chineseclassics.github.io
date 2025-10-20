# UI 通用組件

此文件夾包含整個應用的通用 UI 組件，可被教師端和學生端共同使用。

## 📦 組件列表

### Toast 通知系統（`toast.js`）

優雅的消息提示組件，支持成功、錯誤、警告、信息四種類型。

**使用方式**：
```javascript
import toast from '../ui/toast.js';

toast.success('操作成功！');
toast.error('操作失敗：' + error.message);
toast.warning('請注意...');
toast.info('提示信息');
```

**特點**：
- 單例模式（全局唯一實例）
- 自動消失（可配置時間）
- 流暢的滑入/滑出動畫
- 支持 HTML 內容
- 響應式設計

### Dialog 對話框系統（`dialog.js`）

統一的確認、提示對話框組件。

**使用方式**：
```javascript
import dialog from '../ui/dialog.js';

// 刪除確認
dialog.confirmDelete({
  message: '確定要刪除嗎？<br><br>此操作無法撤銷。',
  onConfirm: async () => {
    // 執行刪除
  }
});

// 警告確認
dialog.confirmWarning({
  title: '確認操作',
  message: '確定要執行此操作嗎？',
  confirmText: '確認',
  onConfirm: () => {
    // 執行操作
  }
});

// 通用確認
dialog.confirm({
  title: '確認',
  message: '確定嗎？',
  type: 'danger',  // danger, warning, info
  confirmText: '確認',
  cancelText: '取消',
  onConfirm: () => {},
  onCancel: () => {}
});
```

**特點**：
- 單例模式
- 垂直居中顯示
- 漸變頭部（紅/橙/藍）
- 支持 HTML 內容
- ESC 鍵關閉
- 點擊遮罩關閉
- 流暢的彈入/淡出動畫

## 🎨 設計原則

1. **統一性**：所有對話框和提示使用相同的視覺風格
2. **易用性**：簡潔的 API，3 行代碼完成複雜交互
3. **可維護性**：修改一處，全局生效
4. **響應式**：移動端和桌面端都有良好體驗

## 📁 文件結構

```
js/
├── ui/                    # 通用 UI 組件
│   ├── README.md          # 本文件
│   ├── toast.js           # Toast 通知系統
│   └── dialog.js          # Dialog 對話框系統
├── teacher/               # 教師端組件
├── student/               # 學生端組件
└── ...
```

---

**維護者**：時文寶鑑開發團隊  
**創建時間**：2025-10-20

