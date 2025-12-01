# Drawing System - Change Deltas

## ADDED Requirements

### Requirement: Canvas 繪圖基礎
系統 SHALL 提供 Canvas 繪圖功能。

#### Scenario: Canvas 初始化
- 系統創建 Canvas 元素
- Canvas 尺寸適配容器（響應式）
- Canvas 背景為白色
- Canvas 支持高 DPI 顯示（retina）

#### Scenario: 鼠標繪畫
- 用戶按下鼠標（mousedown），開始繪畫
- 用戶移動鼠標（mousemove），繪製線條
- 用戶釋放鼠標（mouseup），結束繪畫
- 繪畫線條平滑（使用 lineTo 連接點）

#### Scenario: 觸摸繪畫
- 用戶觸摸屏幕（touchstart），開始繪畫
- 用戶移動手指（touchmove），繪製線條
- 用戶抬起手指（touchend），結束繪畫
- 支持多點觸摸（僅使用第一個觸點）

### Requirement: 畫筆工具
系統 SHALL 提供畫筆工具。

#### Scenario: 畫筆顏色選擇
- 系統提供顏色選擇器
- 用戶可以選擇多種顏色（至少 8 種基本顏色）
- 當前選中顏色高亮顯示
- 顏色選擇器低調設計（不搶奪畫作焦點）

#### Scenario: 畫筆粗細調整
- 系統提供粗細調整滑塊
- 粗細範圍：1-20 像素
- 當前粗細值顯示
- 粗細調整即時生效

#### Scenario: 畫筆繪製
- 畫筆使用選中顏色和粗細
- 線條端點為圓形（lineCap: 'round'）
- 線條連接為圓角（lineJoin: 'round'）
- 繪製流暢，無明顯延遲

### Requirement: 橡皮擦工具
系統 SHALL 提供橡皮擦工具。

#### Scenario: 橡皮擦切換
- 用戶點擊「橡皮擦」按鈕，切換到橡皮擦模式
- 橡皮擦模式下，繪畫變為擦除
- 用戶再次點擊，切換回畫筆模式

#### Scenario: 橡皮擦功能
- 橡皮擦使用當前畫筆粗細
- 擦除區域變為背景色（白色）
- 擦除操作流暢，無明顯延遲

### Requirement: 清空畫布
系統 SHALL 提供清空畫布功能。

#### Scenario: 清空畫布
- 用戶點擊「清空」按鈕
- 系統彈出確認對話框（防止誤操作）
- 用戶確認後，清空整個畫布
- 清空後，畫布恢復為白色背景

### Requirement: 繪畫數據序列化
系統 SHALL 序列化繪畫數據以便傳輸和保存。

#### Scenario: 繪畫數據結構
- 每個筆觸包含：起點坐標、終點坐標、顏色、粗細、工具類型
- 數據格式：JSON 對象數組
- 數據壓縮：只保存必要的點（起點、終點、關鍵轉折點）

#### Scenario: 繪畫數據序列化
- 繪畫時，實時序列化筆觸數據
- 序列化後的數據可以 JSON.stringify
- 數據大小盡量小（優化傳輸）

#### Scenario: 繪畫數據反序列化
- 接收其他玩家的繪畫數據
- 反序列化 JSON 數據
- 重繪畫作（按順序繪製所有筆觸）

### Requirement: 繪畫實時同步
系統 SHALL 實時同步繪畫數據到所有玩家。

#### Scenario: 繪畫數據發送
- 畫家繪畫時，系統序列化筆觸數據
- 系統使用 Supabase Realtime broadcast 發送數據
- 系統節流處理（每 50ms 發送一次，減少傳輸量）
- 數據發送到房間 Channel

#### Scenario: 繪畫數據接收
- 其他玩家訂閱房間 Channel 的 broadcast 消息
- 收到繪畫數據後，立即反序列化
- 在本地 Canvas 上重繪畫作
- 重繪流暢，無明顯延遲

#### Scenario: 繪畫同步優化
- 使用節流減少發送頻率
- 批量處理多個筆觸
- 數據壓縮（只發送增量）
- 錯誤處理（網絡失敗時重試）

### Requirement: 繪畫工具欄 UI
系統 SHALL 提供繪畫工具欄界面。

#### Scenario: 工具欄布局
- 工具欄位於畫布上方或側邊（不遮擋畫作）
- 工具欄包含：顏色選擇、粗細調整、橡皮擦、清空
- 工具欄極簡設計（細線條圖標，低調配色）

#### Scenario: 工具欄交互
- 工具切換即時生效
- 當前選中工具高亮顯示
- 工具按鈕有輕微的懸停效果（優雅動畫）

