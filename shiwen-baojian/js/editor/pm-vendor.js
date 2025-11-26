/**
 * ProseMirror 單一入口，統一版本管理
 * 
 * 修復說明（2025-11-26）：
 * 1. 使用 esm.sh 的 pin 功能（v135）確保 CDN 版本一致性
 * 2. 導出完整的 exports 避免間接依賴缺失問題（如 NodeSelection）
 * 3. 移除 ?deps= 參數，改用獨立的版本鎖定，避免跨模組依賴問題
 * 
 * 問題根因：
 * - esm.sh 的 ?deps= 參數會動態重寫模組內部導入
 * - 不同地區/時間的 CDN 節點可能緩存不同版本的重寫結果
 * - 導致 NodeSelection 等導出在某些用戶端缺失
 */

// prosemirror-state：導出所有常用類型
export { 
  EditorState, 
  Plugin, 
  PluginKey,
  NodeSelection,
  TextSelection,
  AllSelection,
  Selection,
  SelectionRange,
  Transaction
} from 'https://esm.sh/v135/prosemirror-state@1.4.3';

// prosemirror-view：導出視圖相關
export { 
  EditorView, 
  Decoration, 
  DecorationSet 
} from 'https://esm.sh/v135/prosemirror-view@1.33.8';

// prosemirror-model：導出模型相關
export { 
  Schema, 
  DOMParser as PMDOMParser,
  DOMSerializer,
  Node as PMNode,
  Mark,
  Fragment,
  Slice
} from 'https://esm.sh/v135/prosemirror-model@1.22.3';

// prosemirror-keymap
export { keymap } from 'https://esm.sh/v135/prosemirror-keymap@1.2.2';

// prosemirror-commands
export { 
  baseKeymap, 
  toggleMark,
  selectAll,
  deleteSelection
} from 'https://esm.sh/v135/prosemirror-commands@1.5.2';

// prosemirror-history
export { 
  history,
  undo,
  redo
} from 'https://esm.sh/v135/prosemirror-history@1.4.1';


