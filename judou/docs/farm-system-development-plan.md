# 豆田系統開發計劃

> 版本：2025-01-XX  
> 狀態：Planning  
> 主題：種豆南山下，悠然見成長

## 概述

豆田系統是句豆應用的核心玩法擴展，以陶淵明《歸園田居》「種豆南山下」為主題，將古文學習與田園建設有機結合。用戶通過練習獲得句豆（種子），種植後收穫田豆，加工成豆製品售賣獲得金錢，用於建設農莊。

## 核心設計理念

### 循環機制
```
練習 → 獲得句豆（種子）
    ↓
種植句豆到豆田（消耗句豆）
    ↓
收穫田豆（收穫物，不能作為種子）
    ↓
加工成豆製品（需要解鎖成就）
    ↓
售賣豆製品獲得金錢（效率提升）
    ↓
用金錢建設農莊（擴展豆田、建設房間、種植植物、開挖池塘）
    ↓
更多豆田 = 需要更多句豆種植 = 必須繼續練習
    ↓
為了獲得更多句豆（種子）→ 繼續練習
```

### 設計原則
1. **簡化優先**：不需要額外的理解度系統，直接使用現有的句豆機制
2. **自然促進學習**：整個循環自然促進學習，不需要在每個環節強制加入學習條件
3. **成就驅動**：豆製品作為成就系統，解鎖後可以更高效地轉化豆子為錢
4. **文化內涵**：與《歸園田居》主題深度結合，增加文化價值
5. **持續消耗**：確保句豆持續消耗，避免用戶累積大量句豆後不再練習

---

## 一、數據模型設計

### 1.1 豆田系統表

```sql
-- 用戶豆田表（支持地圖位置）
CREATE TABLE user_farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plot_number INTEGER NOT NULL, -- 田地編號（1, 2, 3...）
  x INTEGER NOT NULL, -- X 座標（地圖位置）
  y INTEGER NOT NULL, -- Y 座標（地圖位置）
  width INTEGER NOT NULL DEFAULT 120, -- 寬度
  height INTEGER NOT NULL DEFAULT 80, -- 高度
  planted_beans INTEGER NOT NULL DEFAULT 0, -- 種植的句豆數量
  planted_at TIMESTAMP WITH TIME ZONE, -- 種植時間
  harvest_at TIMESTAMP WITH TIME ZONE, -- 收穫時間
  status TEXT NOT NULL CHECK (status IN ('idle', 'planting', 'ready')), -- 狀態：空閒/種植中/可收穫
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plot_number),
  UNIQUE(user_id, x, y)
);

-- 索引
CREATE INDEX idx_user_farms_user_id ON user_farms(user_id);
CREATE INDEX idx_user_farms_status ON user_farms(status, harvest_at);
CREATE INDEX idx_user_farms_position ON user_farms(user_id, x, y);
```

### 1.2 成就系統表

```sql
-- 用戶成就表
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN ('豆漿', '豆干', '豆花', '腐竹', '豆豉', '醬油')),
  progress INTEGER NOT NULL DEFAULT 0, -- 當前進度
  target INTEGER NOT NULL, -- 目標值
  unlocked_at TIMESTAMP WITH TIME ZONE, -- 解鎖時間（null 表示未解鎖）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

-- 索引
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, unlocked_at);
```

### 1.3 庫存系統表

```sql
-- 用戶庫存表
CREATE TABLE user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('田豆', '豆漿', '豆干', '豆花', '腐竹', '豆豉', '醬油')),
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_type)
);

-- 索引
CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
```

### 1.4 建設系統表

```sql
-- 用戶建設表（支持位置和旋轉）
CREATE TABLE user_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL CHECK (building_type IN (
    '園田居', '書房', '茶室', '詩社', 
    '桃樹', '李樹', '榆樹', '柳樹', '菊花', '竹子', '梅花',
    '小池塘', '大池塘', '小徑', '籬笆'
  )),
  x INTEGER NOT NULL, -- X 座標（地圖位置）
  y INTEGER NOT NULL, -- Y 座標（地圖位置）
  rotation INTEGER DEFAULT 0, -- 旋轉角度（0, 90, 180, 270）
  built_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, building_type, x, y)
);

-- 索引
CREATE INDEX idx_user_buildings_user_id ON user_buildings(user_id);
CREATE INDEX idx_user_buildings_position ON user_buildings(user_id, x, y);

-- 荒草區域表（可開荒的區域）
CREATE TABLE wild_grass_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  x INTEGER NOT NULL, -- X 座標
  y INTEGER NOT NULL, -- Y 座標
  width INTEGER NOT NULL DEFAULT 120, -- 寬度
  height INTEGER NOT NULL DEFAULT 80, -- 高度
  cleared_at TIMESTAMP WITH TIME ZONE, -- 開荒時間（null 表示未開荒）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, x, y)
);

-- 索引
CREATE INDEX idx_wild_grass_user_id ON wild_grass_areas(user_id);
CREATE INDEX idx_wild_grass_cleared ON wild_grass_areas(user_id, cleared_at);
```

### 1.5 用戶資料擴展

```sql
-- 擴展 profiles 表，添加農莊金錢字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS farm_coins INTEGER NOT NULL DEFAULT 0;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_profiles_farm_coins ON profiles(farm_coins);
```

### 1.6 RLS 策略

```sql
-- 啟用 RLS
ALTER TABLE user_farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_buildings ENABLE ROW LEVEL SECURITY;

-- user_farms 策略
CREATE POLICY "Users can view own farms"
  ON user_farms FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own farms"
  ON user_farms FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- user_achievements 策略
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own achievements"
  ON user_achievements FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- user_inventory 策略
CREATE POLICY "Users can view own inventory"
  ON user_inventory FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own inventory"
  ON user_inventory FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- user_buildings 策略
CREATE POLICY "Users can view own buildings"
  ON user_buildings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own buildings"
  ON user_buildings FOR ALL
  TO authenticated
  USING (user_id = auth.uid());
```

---

## 二、成就系統設計

### 2.1 成就定義

| 成就類型 | 解鎖條件 | 加工比例 | 售價 | 效率提升 |
|---------|---------|---------|------|---------|
| 豆漿 | 完成 10 篇不同文章的練習 | 10 田豆 = 1 豆漿 | 200 錢 | 20 倍 |
| 豆干 | 累積 20 次全對 | 15 田豆 = 1 豆干 | 300 錢 | 20 倍 |
| 豆花 | 完成 15 篇閱讀 | 20 田豆 = 1 豆花 | 500 錢 | 25 倍 |
| 腐竹 | 連續 14 天練習 | 25 田豆 = 1 腐竹 | 750 錢 | 30 倍 |
| 豆豉 | 累積 100 次練習 | 30 田豆 = 1 豆豉 | 1200 錢 | 40 倍 |
| 醬油 | 完成 20 場對戰 | 40 田豆 = 1 醬油 | 2000 錢 | 50 倍 |

### 2.2 成就進度追蹤

需要在以下場景更新成就進度：
- **練習完成**：更新「豆漿」「豆豉」進度
- **全對記錄**：更新「豆干」進度
- **閱讀完成**：更新「豆花」進度
- **連續天數**：更新「腐竹」進度
- **對戰完成**：更新「醬油」進度

### 2.3 成就解鎖邏輯

```typescript
// 檢查並更新成就進度
async function updateAchievementProgress(
  userId: string,
  achievementType: string,
  increment: number = 1
): Promise<{ unlocked: boolean; progress: number }> {
  // 1. 獲取或創建成就記錄
  // 2. 更新進度
  // 3. 檢查是否達到目標
  // 4. 如果達到目標，解鎖成就
  // 5. 返回解鎖狀態和當前進度
}
```

---

## 三、種植系統設計

### 3.1 種植機制

- **種子來源**：練習獲得的句豆（`profiles.total_beans`）
- **種植成本**：消耗句豆（1 句豆 = 種植 1 顆）
- **收穫時間**：固定 24 小時
- **收穫數量**：1 句豆 → 3-5 田豆（隨機）
- **收穫物**：田豆（不能作為種子，只能用於加工或直接售賣）

**關鍵設計**：確保句豆持續消耗
- 每塊田地都需要句豆種植
- 擴展更多田地 = 需要更多句豆
- 用戶無法「存豆不種」，因為空閒田地會提醒用戶種植
- 收穫的田豆不能種植，必須通過練習獲得新的句豆

### 3.2 種植流程

```typescript
// 種植豆子
async function plantBeans(
  userId: string,
  plotNumber: number,
  beanCount: number
): Promise<boolean> {
  // 1. 檢查用戶是否有足夠的句豆
  // 2. 檢查田地是否可用（status = 'idle'）
  // 3. 扣除句豆（從 profiles.total_beans）
  // 4. 創建種植記錄（status = 'planting'）
  // 5. 設置收穫時間（planted_at + 24 小時）
  // 6. 返回成功/失敗
}
```

### 3.3 收穫流程

```typescript
// 收穫豆子
async function harvestBeans(
  userId: string,
  plotNumber: number
): Promise<{ harvested: number }> {
  // 1. 檢查田地是否可收穫（status = 'ready'）
  // 2. 計算收穫數量（planted_beans × 3-5，隨機）
  // 3. 添加到庫存（user_inventory，item_type = '田豆'）
  // 4. 重置田地狀態（status = 'idle'）
  // 5. 返回收穫數量
}
```

---

## 四、加工系統設計

### 4.1 加工機制

- **加工條件**：必須解鎖對應的成就
- **加工比例**：根據成就類型不同（見成就系統設計）
- **加工時間**：即時完成
- **加工結果**：獲得對應的豆製品

### 4.2 加工流程

```typescript
// 加工豆製品
async function processBeans(
  userId: string,
  achievementType: string,
  beanCount: number
): Promise<{ processed: number; productCount: number }> {
  // 1. 檢查成就是否解鎖
  // 2. 檢查庫存是否有足夠的田豆
  // 3. 計算加工比例（根據成就類型）
  // 4. 扣除田豆，添加豆製品到庫存
  // 5. 返回加工結果
}
```

### 4.3 加工比例配置

```typescript
const PROCESSING_RATIOS = {
  '豆漿': { input: 10, output: 1, price: 200 },
  '豆干': { input: 15, output: 1, price: 300 },
  '豆花': { input: 20, output: 1, price: 500 },
  '腐竹': { input: 25, output: 1, price: 750 },
  '豆豉': { input: 30, output: 1, price: 1200 },
  '醬油': { input: 40, output: 1, price: 2000 },
} as const;
```

---

## 五、售賣系統設計

### 5.1 售賣機制

- **直接售賣**：1 田豆 = 1 錢（基礎轉化）
- **加工售賣**：根據豆製品類型，效率提升 20-50 倍
- **售賣即時**：售賣後立即獲得金錢

### 5.2 售賣流程

```typescript
// 售賣物品
async function sellItems(
  userId: string,
  itemType: string,
  quantity: number
): Promise<{ coinsEarned: number }> {
  // 1. 檢查庫存是否有足夠的物品
  // 2. 計算售價（根據物品類型）
  // 3. 扣除庫存，添加金錢到 profiles.farm_coins
  // 4. 返回獲得的金錢
}
```

### 5.3 售價配置

```typescript
const SELLING_PRICES = {
  '田豆': 1,
  '豆漿': 200,
  '豆干': 300,
  '豆花': 500,
  '腐竹': 750,
  '豆豉': 1200,
  '醬油': 2000,
} as const;
```

---

## 六、建設系統設計

### 6.1 建設項目

#### 6.1.1 豆田擴展（開荒系統）

| 類型 | 名稱 | 成本 | 功能 |
|------|------|------|------|
| 開荒 | 開荒南野際 | 第 1 塊：100 錢<br>第 2 塊：200 錢<br>第 3 塊：300 錢<br>... | 將荒草區域開荒成新豆田 |

**開荒機制**：
- 點擊荒草區域 → 顯示開荒界面
- 確認開荒 → 消耗金錢 → 荒草區域變成新豆田
- 新豆田可以立即種植

#### 6.1.2 房屋建設

| 類型 | 名稱 | 成本 | 功能 | 詩句來源 |
|------|------|------|------|---------|
| 主屋 | 園田居 | 500 錢 | 農莊主屋，標誌性建築 | 「園田居」 |
| 房間 | 書房 | 200 錢 | 增加收穫數量 +10% | 「時還讀我書」 |
| 房間 | 茶室 | 300 錢 | 減少種植時間 -10% | 「有茶共品之」 |
| 房間 | 詩社 | 500 錢 | 增加加工效率 +10% | 「過門更相呼」 |

**房屋特性**：
- 可以旋轉（4 個方向）
- 可以移動位置
- 佔用一定空間（需要預留位置）

#### 6.1.3 植物裝飾

| 類型 | 名稱 | 成本 | 功能 | 詩句來源 |
|------|------|------|------|---------|
| 桃樹 | 桃李羅堂前 | 150 錢 | 裝飾，每週收穫「桃花」 | 「桃李羅堂前」 |
| 李樹 | 桃李羅堂前 | 150 錢 | 裝飾，每週收穫「李子」 | 「桃李羅堂前」 |
| 榆樹 | 榆柳蔭後簷 | 200 錢 | 裝飾，減少種植時間 5% | 「榆柳蔭後簷」 |
| 柳樹 | 榆柳蔭後簷 | 200 錢 | 裝飾，減少種植時間 5% | 「榆柳蔭後簷」 |
| 菊花 | 採菊東籬下 | 100 錢 | 裝飾，可採集「菊花」 | 「採菊東籬下」 |
| 竹子 | - | 150 錢 | 裝飾 | - |
| 梅花 | - | 200 錢 | 裝飾 | - |

**植物特性**：
- 根據季節有不同的視覺效果
- 某些植物有功能性（如減少種植時間）
- 可以收穫物品（如桃花、李子、菊花）

#### 6.1.4 裝飾項目

| 類型 | 名稱 | 成本 | 功能 |
|------|------|------|------|
| 池塘 | 小池塘 | 400 錢 | 裝飾，增加農莊美感 |
| 池塘 | 大池塘 | 800 錢 | 裝飾，增加農莊美感 |
| 小徑 | 道狹草木長 | 100 錢 | 裝飾，連接不同區域 | 「道狹草木長」 |
| 籬笆 | 採菊東籬下 | 150 錢 | 裝飾，劃分區域 | 「採菊東籬下」 |

### 6.2 建設流程

#### 6.2.1 開荒流程

```typescript
// 開荒荒草區域
async function clearWildGrass(
  userId: string,
  areaId: string
): Promise<boolean> {
  // 1. 檢查開荒成本
  // 2. 檢查用戶是否有足夠的金錢
  // 3. 檢查區域是否可開荒
  // 4. 扣除金錢，創建新豆田
  // 5. 更新地圖數據
  // 6. 返回成功/失敗
}
```

#### 6.2.2 建設項目流程

```typescript
// 建設項目（支持位置和旋轉）
async function buildItem(
  userId: string,
  buildingType: string,
  x: number,
  y: number,
  rotation?: number
): Promise<boolean> {
  // 1. 檢查建設成本
  // 2. 檢查用戶是否有足夠的金錢
  // 3. 檢查位置是否可用（不與其他項目重疊）
  // 4. 扣除金錢，創建建設記錄（包含位置和旋轉）
  // 5. 如果是有功能的建設，更新相關配置
  // 6. 更新地圖數據
  // 7. 返回成功/失敗
}

// 移動建設項目
async function moveBuilding(
  userId: string,
  buildingId: string,
  newX: number,
  newY: number
): Promise<boolean> {
  // 1. 檢查新位置是否可用
  // 2. 更新建設記錄的位置
  // 3. 更新地圖數據
  // 4. 返回成功/失敗
}

// 移除建設項目
async function removeBuilding(
  userId: string,
  buildingId: string
): Promise<boolean> {
  // 1. 檢查是否可以移除（某些項目可能不可移除）
  // 2. 刪除建設記錄
  // 3. 更新地圖數據
  // 4. 返回成功/失敗
}
```

### 6.3 建設效果

- **擴展豆田**：增加可種植的田地數量
- **書房**：收穫時，田豆數量 +10%
- **茶室**：種植時間減少 10%（24 小時 → 21.6 小時）
- **詩社**：加工時，所需田豆數量減少 10%

---

## 七、視覺化設計

### 7.1 成就系統視覺化

**成就頁面組件**：
- 成就列表（網格佈局）
- 成就卡片：
  - 豆製品圖標（emoji 或自定義圖標）
  - 成就名稱（如「豆漿大師」）
  - 解鎖條件描述
  - 進度條（未解鎖時顯示）
  - 解鎖狀態標記（已解鎖/未解鎖）
  - 效率提升說明

**成就卡片狀態**：
- **未解鎖**：灰色背景，顯示進度條（如「7/10」）
- **已解鎖**：彩色背景，顯示「已解鎖」標記，顯示效率提升說明

### 7.2 豆田頁面視覺化（「動物森友會」風格）

**核心設計理念**：
- **可拖動的地圖視圖**：類似地圖系統，可以拖動和縮放查看整個農莊
- **2D 田園風格**：有山有水，南山在背景，山下是豆田
- **高度自定義**：用戶可以自由規劃佈局，創造不同的組合效果
- **社交訪問**：可以訪問其他用戶的農莊，欣賞不同的設計

**視覺層級設計**：

1. **背景層**（最遠）：
   - 南山（「種豆南山下」）
   - 天空（根據時間/季節變化）
   - 雲朵（動態效果）

2. **中景層**：
   - 豆田區域（可種植的田地）
   - 荒草區域（可開荒的區域）
   - 池塘（建設項目）

3. **前景層**（最近）：
   - 建設項目（房屋、植物）
   - 互動元素（按鈕、提示）

**地圖系統設計**：

- **拖動功能**：可以拖動查看整個農莊
- **縮放功能**：可以縮放查看細節或全貌
- **網格系統**：隱藏網格，幫助對齊物品
- **視圖範圍**：初始視圖顯示核心區域，可以拖動查看邊緣

**豆田區域設計**：

- **已開荒的豆田**：顯示為整齊的田地，可以種植
- **未開荒的荒草**：顯示為雜草區域，需要「開荒南野際」解鎖
- **開荒機制**：點擊荒草區域 → 消耗金錢 → 開荒成新豆田
- **豆田狀態**：
  - 空閒：顯示為空田地
  - 種植中：顯示豆苗生長動畫
  - 可收穫：顯示成熟的豆子，有收穫提示

**建設系統設計**：

- **建設項目類型**：
  - 房屋：園田居（主屋）、書房、茶室、詩社
  - 植物：桃樹、李樹、榆樹、柳樹、菊花、竹子、梅花
  - 裝飾：池塘、小徑、籬笆

- **放置機制**：
  - 點擊建設按鈕 → 進入「建設模式」
  - 選擇建設項目 → 在地圖上點擊位置放置
  - 可以旋轉（某些項目）
  - 可以移動（已建設的項目）
  - 可以移除（已建設的項目）

- **佈局規劃**：
  - 用戶可以自由規劃佈局
  - 不同組合產生不同的視覺效果
  - 鼓勵創造性和個性化

**視覺元素設計**：

- **南山**：背景中的山脈，使用漸變和陰影營造深度
- **豆田**：整齊的田地，使用網格佈局
- **荒草**：未開荒區域，使用雜草圖案
- **房屋**：簡約的 2D 風格，符合田園主題
- **植物**：根據季節有不同的視覺效果

**互動設計**：

- **點擊豆田**：顯示種植/收穫界面
- **點擊荒草**：顯示開荒界面
- **點擊建設項目**：顯示建設詳情/移動/移除選項
- **拖動地圖**：可以查看整個農莊
- **縮放**：可以查看細節或全貌

### 7.3 加工頁面視覺化

**加工頁面組件**：
- 已解鎖的豆製品列表
- 加工界面：
  - 選擇豆製品類型
  - 輸入加工數量
  - 顯示轉化結果（輸入/輸出/效率提升）
  - 確認按鈕

### 7.4 售賣頁面視覺化

**售賣頁面組件**：
- 庫存列表（顯示所有物品和數量）
- 售賣界面：
  - 選擇物品類型
  - 輸入售賣數量
  - 顯示售價和總金額
  - 確認按鈕

### 7.5 建設頁面視覺化

**建設頁面組件**：
- 農莊視圖（2D 或 3D 視圖，顯示已建設的項目）
- 建設列表：
  - 建設項目卡片
  - 建設名稱和描述
  - 建設成本
  - 建設功能說明
  - 建設按鈕

**農莊視圖**：
- 初始：1 塊小豆田（「種豆南山下」）
- 擴展後：多塊豆田（「草盛豆苗稀」）
- 建設後：房間、植物、池塘（「帶月荷鋤歸」）

---

## 八、視覺實現技術棧

### 8.1 技術選型決策

**選擇：SVG + CSS + Vue 3 內建動畫**

**理由**：
1. **與現有技術棧一致**：句豆項目已大量使用 CSS 動畫和 SVG
2. **符合設計需求**：2D 農莊視圖，簡約田園風格
3. **開發效率高**：學習成本低，與 Vue 3 集成簡單
4. **性能優良**：輕量級，響應式友好
5. **維護成本低**：調試方便，符合「vibe coding」風格

**不選擇 Three.js 的原因**：
- 過度工程化（需求是 2D，不需要 3D）
- 與現有設計不匹配（2D 簡約風格 vs 3D 場景）
- 性能開銷大（文件大小 ~500KB）
- 維護成本高（需要額外學習）

### 8.2 推薦的 Vue 組件和庫

#### 8.2.1 Vue 3 內建組件（必備）

**`<Transition>` 和 `<TransitionGroup>`**
- **用途**：列表動畫、狀態切換動畫
- **適用場景**：
  - 田地卡片出現/消失動畫
  - 成就解鎖動畫
  - 收穫動畫
  - 建設項目出現動畫

**使用示例**：
```vue
<template>
  <!-- 田地列表動畫 -->
  <TransitionGroup name="plot" tag="div" class="farm-plots">
    <FarmPlotCard 
      v-for="plot in plots" 
      :key="plot.id"
      :plot="plot"
    />
  </TransitionGroup>
</template>

<style>
.plot-enter-active,
.plot-leave-active {
  transition: all 0.3s ease;
}

.plot-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.plot-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
```

#### 8.2.2 VueUse（強烈推薦）

**為什麼適合**：
- 輕量級工具庫，Composition API 友好
- 提供大量實用的 composables
- 與 Vue 3 完美集成

**推薦的 composables**：
```typescript
import { 
  useInterval,      // 倒計時（種植進度）
  useNow,           // 當前時間（時間系統）
  useLocalStorage,  // 本地存儲（用戶偏好）
  useMouse,         // 鼠標位置（互動效果）
  useElementSize,   // 元素尺寸（響應式）
  useTransition,    // 數值過渡（進度條動畫）
  useSpring,        // 彈簧動畫（收穫動畫）
} from '@vueuse/core'
```

**安裝**：
```bash
npm install @vueuse/core
```

**使用示例**：
```vue
<script setup>
import { useInterval, useNow, useTransition } from '@vueuse/core'

// 種植倒計時
const { pause, resume } = useInterval(1000, { 
  immediate: false 
})

// 當前時間（用於時間系統）
const now = useNow()

// 進度條動畫
const progress = useTransition(0, {
  duration: 1000,
  transition: [0.34, 1.56, 0.64, 1] // 彈性緩動
})
</script>
```

#### 8.2.3 圖標庫（已有）

**推薦使用 `lucide-vue-next`**：
- 項目已安裝
- 圖標豐富，風格一致
- 與 Vue 3 完美集成

**其他可選圖標庫**（項目已安裝）：
- `@heroicons/vue`
- `@tabler/icons-vue`

#### 8.2.4 動畫增強庫（可選）

**GSAP**（複雜動畫時使用）：
- **適用場景**：複雜序列動畫、時間軸控制
- **安裝**：`npm install gsap`
- **使用示例**：
```vue
<script setup>
import { gsap } from 'gsap'

// 種植動畫序列
function animatePlanting() {
  gsap.timeline()
    .to('.bean-seed', { scale: 0, duration: 0.3 })
    .to('.bean-sprout', { 
      scaleY: 1, 
      duration: 1,
      ease: 'back.out(1.7)'
    })
}
</script>
```

**注意**：GSAP 是可選的，大多數動畫可以用 CSS 實現。

### 8.3 具體實現方案

#### 8.3.1 豆田地圖系統（可拖動地圖視圖）

**核心功能**：
- 可拖動的地圖視圖（pan）
- 可縮放（zoom）
- 網格系統（對齊物品）
- 多層級渲染（背景、中景、前景）

**技術實現**：

```vue
<template>
  <div class="farm-map-container" ref="mapContainer">
    <!-- 地圖視圖（可拖動、可縮放） -->
    <div 
      class="farm-map-viewport"
      :style="viewportStyle"
      @mousedown="startDrag"
      @mousemove="onDrag"
      @mouseup="endDrag"
      @wheel="onWheel"
    >
      <!-- SVG 地圖 -->
      <svg 
        class="farm-map"
        :viewBox="viewBox"
        :style="mapStyle"
      >
        <!-- 背景層：南山、天空 -->
        <g class="background-layer">
          <!-- 南山 -->
          <path 
            d="M0,400 Q200,300 400,350 T800,400 L800,600 L0,600 Z" 
            class="mountain"
          />
          <!-- 天空漸變 -->
          <defs>
            <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" :style="`stop-color:${skyColorTop}`" />
              <stop offset="100%" :style="`stop-color:${skyColorBottom}`" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#skyGradient)" />
        </g>
        
        <!-- 中景層：豆田、荒草、池塘 -->
        <g class="middle-layer">
          <!-- 已開荒的豆田 -->
          <g class="farm-plots">
            <FarmPlot
              v-for="plot in farmPlots"
              :key="plot.id"
              :plot="plot"
              :x="plot.x"
              :y="plot.y"
              @click="onPlotClick(plot)"
            />
          </g>
          
          <!-- 未開荒的荒草區域 -->
          <g class="wild-grass-areas">
            <WildGrassArea
              v-for="area in wildGrassAreas"
              :key="area.id"
              :area="area"
              :x="area.x"
              :y="area.y"
              @click="onWildGrassClick(area)"
            />
          </g>
          
          <!-- 池塘等建設項目 -->
          <g class="water-features">
            <WaterFeature
              v-for="feature in waterFeatures"
              :key="feature.id"
              :feature="feature"
              :x="feature.x"
              :y="feature.y"
            />
          </g>
        </g>
        
        <!-- 前景層：房屋、植物 -->
        <g class="foreground-layer">
          <Building
            v-for="building in buildings"
            :key="building.id"
            :building="building"
            :x="building.x"
            :y="building.y"
            :rotation="building.rotation"
            @click="onBuildingClick(building)"
          />
          
          <Plant
            v-for="plant in plants"
            :key="plant.id"
            :plant="plant"
            :x="plant.x"
            :y="plant.y"
            @click="onPlantClick(plant)"
          />
        </g>
        
        <!-- 網格（可選，建設模式時顯示） -->
        <g v-if="isBuildMode" class="grid-overlay">
          <GridPattern :cellSize="gridSize" />
        </g>
      </svg>
    </div>
    
    <!-- 控制面板 -->
    <div class="farm-controls">
      <button @click="resetView">重置視圖</button>
      <button @click="toggleGrid">切換網格</button>
      <button @click="toggleBuildMode">建設模式</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMouse, useElementSize } from '@vueuse/core'

// 地圖狀態
const mapContainer = ref<HTMLElement>()
const { width, height } = useElementSize(mapContainer)

// 視圖狀態
const panX = ref(0)
const panY = ref(0)
const zoom = ref(1)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 計算視圖
const viewBox = computed(() => {
  const baseWidth = 2000
  const baseHeight = 1500
  return `${-panX.value} ${-panY.value} ${baseWidth / zoom.value} ${baseHeight / zoom.value}`
})

const viewportStyle = computed(() => ({
  transform: `scale(${zoom.value})`,
  transformOrigin: '0 0'
}))

// 拖動功能
function startDrag(e: MouseEvent) {
  if (e.button !== 0) return // 只處理左鍵
  isDragging.value = true
  dragStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value }
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  panX.value = e.clientX - dragStart.value.x
  panY.value = e.clientY - dragStart.value.y
}

function endDrag() {
  isDragging.value = false
}

// 縮放功能
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoom.value = Math.max(0.5, Math.min(2, zoom.value * delta))
}

// 重置視圖
function resetView() {
  panX.value = 0
  panY.value = 0
  zoom.value = 1
}
</script>

<style>
.farm-map-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  cursor: grab;
}

.farm-map-container:active {
  cursor: grabbing;
}

.farm-map-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.farm-map {
  width: 100%;
  height: 100%;
}

/* 圖層樣式 */
.background-layer {
  opacity: 0.9;
}

.middle-layer {
  opacity: 1;
}

.foreground-layer {
  opacity: 1;
  pointer-events: auto;
}

/* 南山樣式 */
.mountain {
  fill: linear-gradient(to bottom, #6b8e6b, #4a6b4a);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}
</style>
```

#### 8.3.2 農莊視圖（舊版，保留作為參考）

```vue
<template>
  <div class="farm-view">
    <!-- SVG 背景 -->
    <svg class="farm-background" :class="seasonClass" viewBox="0 0 800 600">
      <!-- 南山背景 -->
      <path d="M0,400 Q200,300 400,350 T800,400 L800,600 L0,600 Z" 
            class="mountain" />
      
      <!-- 田地網格 -->
      <g class="farm-plots">
        <rect v-for="plot in plots" 
              :key="plot.id"
              :x="plot.x" 
              :y="plot.y"
              width="120" 
              height="80"
              class="farm-plot"
              :class="plot.status" />
      </g>
      
      <!-- 建設項目（使用 TransitionGroup） -->
      <TransitionGroup name="building">
        <g v-for="building in buildings" :key="building.id" class="building">
          <!-- 建設項目 SVG -->
        </g>
      </TransitionGroup>
    </svg>
  </div>
</template>

<script setup>
import { useNow } from '@vueuse/core'
import { computed } from 'vue'

const now = useNow()
const seasonClass = computed(() => {
  // 根據時間計算季節
  return getSeason(now.value)
})
</script>

<style>
/* 季節背景色 */
.farm-background {
  transition: background 1s ease;
}

.farm-background.spring {
  background: linear-gradient(to bottom, #e8f5e9, #c8e6c9);
}

.farm-background.summer {
  background: linear-gradient(to bottom, #fff9c4, #f1f8e9);
}

.farm-background.autumn {
  background: linear-gradient(to bottom, #ffe0b2, #ffccbc);
}

.farm-background.winter {
  background: linear-gradient(to bottom, #e3f2fd, #bbdefb);
}
</style>
```

#### 8.3.2 田地卡片組件

```vue
<template>
  <Transition name="plot">
    <div class="farm-plot-card edamame-glass">
      <!-- SVG 圖標 -->
      <svg class="plot-icon" viewBox="0 0 100 100">
        <circle v-if="plot.status === 'planting'" 
                class="bean-sprout" />
        <rect v-if="plot.status === 'ready'" 
              class="harvest-ready" />
      </svg>
      
      <!-- 進度條（使用 useTransition） -->
      <ProgressBar :value="animatedProgress" />
      
      <!-- 倒計時（使用 useInterval） -->
      <Countdown :target="plot.harvestAt" />
    </div>
  </Transition>
</template>

<script setup>
import { useTransition, useInterval } from '@vueuse/core'
import { computed } from 'vue'

const props = defineProps<{
  plot: FarmPlot
}>()

// 進度條動畫
const animatedProgress = useTransition(
  computed(() => props.plot.progress),
  {
    duration: 500,
    transition: [0.34, 1.56, 0.64, 1]
  }
)
</script>

<style>
/* 豆苗生長動畫（參考現有的 sproutGrow） */
@keyframes beanGrow {
  0% {
    transform: translateY(100%) scaleY(0);
    opacity: 0;
  }
  50% {
    transform: translateY(50%) scaleY(0.5);
    opacity: 0.7;
  }
  100% {
    transform: translateY(0) scaleY(1);
    opacity: 1;
  }
}

.bean-sprout {
  animation: beanGrow 1s ease-out;
}
</style>
```

#### 8.3.3 成就卡片組件

```vue
<template>
  <Transition name="achievement">
    <div class="achievement-card" :class="{ unlocked: isUnlocked }">
      <!-- 使用 lucide-vue-next 圖標 -->
      <Icon :name="iconName" />
      
      <!-- 進度條（使用 useTransition 動畫） -->
      <ProgressBar 
        :value="animatedProgress" 
        v-if="!isUnlocked"
      />
    </div>
  </Transition>
</template>

<script setup>
import { useTransition } from '@vueuse/core'
import { Icon } from 'lucide-vue-next'

const props = defineProps<{
  achievement: Achievement
}>()

const animatedProgress = useTransition(
  computed(() => props.achievement.progress),
  {
    duration: 500
  }
)
</script>
```

#### 8.3.4 響應式佈局（CSS Grid）

```vue
<template>
  <div class="farm-grid">
    <FarmPlotCard v-for="plot in plots" :key="plot.id" />
  </div>
</template>

<style>
.farm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

/* 響應式調整 */
@media (max-width: 768px) {
  .farm-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
```

### 8.4 依賴項配置

**package.json 更新**：
```json
{
  "dependencies": {
    "@vueuse/core": "^10.0.0",  // 工具庫（必備）
    "lucide-vue-next": "^0.555.0",  // 圖標（已有）
    "gsap": "^3.12.0"  // 複雜動畫（可選）
  }
}
```

### 8.5 技術棧總結

**核心技術**：
```
SVG（結構）
  +
CSS 動畫（視覺效果）
  +
Vue 3 內建 Transition（動畫組件）
  +
VueUse（工具庫）
  +
lucide-vue-next（圖標）
```

**優勢**：
- ✅ 與現有代碼風格一致
- ✅ 開發效率高
- ✅ 性能優良
- ✅ 易於維護
- ✅ 符合「vibe coding」風格

---

## 九、開發里程碑

### Phase 1: 數據模型與後端邏輯（2 週）

**目標**：完成數據庫設計和後端邏輯

**任務**：
- [ ] 創建數據庫遷移文件（user_farms, user_achievements, user_inventory, user_buildings）
- [ ] 實現 RLS 策略
- [ ] 實現種植邏輯（plantBeans）
- [ ] 實現收穫邏輯（harvestBeans）
- [ ] 實現成就進度追蹤邏輯（updateAchievementProgress）
- [ ] 實現加工邏輯（processBeans）
- [ ] 實現售賣邏輯（sellItems）
- [ ] 實現建設邏輯（buildItem）

**交付物**：
- 數據庫遷移文件
- Pinia Store（farmStore.ts）
- 類型定義（farm.ts）

### Phase 2: 成就系統（1 週）

**目標**：完成成就系統的前端實現

**任務**：
- [ ] 創建成就頁面組件（AchievementPage.vue）
- [ ] 創建成就卡片組件（AchievementCard.vue）
- [ ] 實現成就進度追蹤（在練習/閱讀/對戰完成時更新）
- [ ] 實現成就解鎖動畫
- [ ] 添加成就系統到路由

**交付物**：
- AchievementPage.vue
- AchievementCard.vue
- 成就進度追蹤邏輯

### Phase 3: 種植與收穫系統（1 週）

**目標**：完成種植和收穫的前端實現

**任務**：
- [ ] 創建豆田頁面組件（FarmPage.vue）
- [ ] 創建田地卡片組件（FarmPlotCard.vue）
- [ ] 實現種植界面（選擇田地、輸入數量、確認種植）
- [ ] 實現收穫界面（顯示可收穫的田地、確認收穫）
- [ ] 實現種植動畫（豆苗生長）
- [ ] 實現倒計時顯示（種植進度）
- [ ] 添加豆田系統到路由

**交付物**：
- FarmPage.vue
- FarmPlotCard.vue
- 種植/收穫邏輯

### Phase 6: 加工與售賣系統（1 週）

**目標**：完成加工和售賣的前端實現

**任務**：
- [ ] 創建加工頁面組件（ProcessingPage.vue）
- [ ] 創建售賣頁面組件（SellingPage.vue）
- [ ] 實現加工界面（選擇類型、輸入數量、顯示結果）
- [ ] 實現售賣界面（選擇物品、輸入數量、顯示價格）
- [ ] 實現庫存顯示（顯示所有物品和數量）
- [ ] 添加加工/售賣系統到路由

**交付物**：
- ProcessingPage.vue
- SellingPage.vue
- 加工/售賣邏輯


### Phase 7: 社交訪問功能（1 週）

**目標**：完成訪問其他用戶農莊的功能

**任務**：
- [ ] 創建訪問模式組件（VisitMode.vue）
- [ ] 實現訪問界面（輸入用戶 ID 或從班級列表選擇）
- [ ] 實現只讀模式（訪問時不能修改，只能查看）
- [ ] 實現農莊信息顯示（顯示農莊名稱、建設統計）
- [ ] 實現返回功能（返回自己的農莊）
- [ ] 添加訪問功能到路由

**交付物**：
- VisitMode.vue
- 訪問邏輯
- 只讀模式邏輯

### Phase 8: 整合與優化（1 週）

**目標**：整合所有功能，優化用戶體驗

**任務**：
- [ ] 整合成就系統到練習/閱讀/對戰流程
- [ ] 添加豆田入口到側邊欄
- [ ] 實現通知系統（成就解鎖、收穫提醒、開荒完成）
- [ ] 優化地圖拖動和縮放性能
- [ ] 優化動畫和過渡效果
- [ ] 實現季節/時間視覺效果
- [ ] 添加幫助文檔
- [ ] 測試所有功能
- [ ] 修復 bug 和優化性能

**交付物**：
- 完整整合的豆田系統
- 用戶文檔
- 測試報告

**總開發時間**：約 10 週（Phase 1-8）

---

## 十、技術實現細節

### 9.1 Pinia Store 設計

```typescript
// stores/farmStore.ts
export const useFarmStore = defineStore('farm', () => {
  // State
  const farms = ref<UserFarm[]>([])
  const achievements = ref<UserAchievement[]>([])
  const inventory = ref<UserInventory[]>([])
  const buildings = ref<UserBuilding[]>([])
  const farmCoins = ref(0)
  
  // Actions
  async function fetchFarms() { ... }
  async function plantBeans(plotNumber: number, beanCount: number) { ... }
  async function harvestBeans(plotNumber: number) { ... }
  async function fetchAchievements() { ... }
  async function updateAchievementProgress(type: string, increment: number) { ... }
  async function processBeans(achievementType: string, beanCount: number) { ... }
  async function sellItems(itemType: string, quantity: number) { ... }
  async function buildItem(buildingType: string, level?: number) { ... }
  
  return {
    farms,
    achievements,
    inventory,
    buildings,
    farmCoins,
    fetchFarms,
    plantBeans,
    harvestBeans,
    fetchAchievements,
    updateAchievementProgress,
    processBeans,
    sellItems,
    buildItem,
  }
})
```

### 9.2 類型定義

```typescript
// types/farm.ts
export interface UserFarm {
  id: string
  user_id: string
  plot_number: number
  planted_beans: number
  planted_at: string | null
  harvest_at: string | null
  status: 'idle' | 'planting' | 'ready'
  created_at: string
  updated_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_type: '豆漿' | '豆干' | '豆花' | '腐竹' | '豆豉' | '醬油'
  progress: number
  target: number
  unlocked_at: string | null
  created_at: string
  updated_at: string
}

export interface UserInventory {
  id: string
  user_id: string
  item_type: '田豆' | '豆漿' | '豆干' | '豆花' | '腐竹' | '豆豉' | '醬油'
  quantity: number
  updated_at: string
}

export interface UserBuilding {
  id: string
  user_id: string
  building_type: string
  level: number
  built_at: string
}
```

### 9.3 成就進度追蹤整合點

需要在以下位置添加成就進度追蹤：

1. **練習完成**（PracticePage.vue）：
   ```typescript
   // 在 submitResult 中
   await farmStore.updateAchievementProgress('豆漿', 1) // 如果完成新文章
   await farmStore.updateAchievementProgress('豆豉', 1) // 累積練習次數
   ```

2. **全對記錄**（PracticePage.vue）：
   ```typescript
   // 在 submitResult 中，如果全對
   if (isComplete) {
     await farmStore.updateAchievementProgress('豆干', 1)
   }
   ```

3. **閱讀完成**（ReadingPage.vue）：
   ```typescript
   // 在閱讀完成時
   await farmStore.updateAchievementProgress('豆花', 1)
   ```

4. **連續天數**（userStatsStore.ts）：
   ```typescript
   // 在 updateStreakDays 中
   if (streakDays >= 14) {
     await farmStore.updateAchievementProgress('腐竹', 1)
   }
   ```

5. **對戰完成**（GameResult.vue）：
   ```typescript
   // 在對戰結束時
   await farmStore.updateAchievementProgress('醬油', 1)
   ```

---

## 十一、UI/UX 設計規範

### 10.1 設計主題

- **主題**：陶淵明《歸園田居》「種豆南山下」
- **風格**：田園風格，符合詩意
- **配色**：沿用現有的 Edamame 設計系統（綠色系、黃色系）

### 10.2 組件設計

- **成就卡片**：玻璃質感卡片，符合現有設計語言
- **田地卡片**：田園風格，顯示種植狀態
- **農莊視圖**：2D 視圖，簡約風格
- **動畫**：流暢的過渡動畫，符合現有動畫風格

### 10.3 響應式設計

- 支持桌面和移動端
- 豆田網格自適應（桌面：3 列，移動：2 列）
- 成就列表自適應（桌面：3 列，移動：2 列）

---

## 十二、測試計劃

### 11.1 單元測試

- [ ] 種植邏輯測試
- [ ] 收穫邏輯測試
- [ ] 成就進度追蹤測試
- [ ] 加工邏輯測試
- [ ] 售賣邏輯測試
- [ ] 建設邏輯測試

### 11.2 集成測試

- [ ] 完整循環測試（練習 → 種植 → 收穫 → 加工 → 售賣 → 建設）
- [ ] 成就解鎖流程測試
- [ ] 多田地管理測試
- [ ] 庫存管理測試

### 11.3 用戶測試

- [ ] 新用戶引導測試
- [ ] 成就系統易用性測試
- [ ] 建設系統易用性測試
- [ ] 性能測試（大量數據）

---

## 十三、用戶留存與活躍度設計

### 12.1 登入頻率設計

**每日必須登入的機制**：
1. **收穫提醒**：種植 24 小時後可收穫，提醒用戶登入
2. **理荒穢任務**：每 3 天出現野草，需要登入清理
3. **採菊任務**：每天可採集 1 次，鼓勵登入
4. **讀書任務**：每天可完成 1 次，鼓勵登入
5. **每日登入獎勵**：登入獲得 5 句豆，鼓勵登入
6. **連續天數成就**：需要每天登入保持連續

**每週必須登入的機制**：
1. **桑麻田收穫**：每週額外收穫，需要登入
2. **桃李收穫**：每週收穫桃花、李子，需要登入

### 12.2 使用句豆（練習）頻率設計

**確保句豆持續消耗**：
1. **種植消耗**：每塊田地都需要句豆種植
2. **擴展需求**：更多田地 = 需要更多句豆
3. **收穫限制**：田豆不能種植，必須通過練習獲得新句豆
4. **空閒提醒**：空閒田地會提醒用戶種植，需要句豆

**避免用戶「存豆不練」的問題**：
- ✅ 田豆不能作為種子，必須練習獲得句豆
- ✅ 更多田地需要更多句豆，形成持續需求
- ✅ 空閒田地會提醒用戶種植，需要消耗句豆
- ✅ 建設更多田地後，句豆需求增加，必須持續練習

### 12.3 循環設計驗證

**完整循環**：
```
1. 用戶練習 → 獲得 50 句豆
2. 種植到 2 塊田地 → 消耗 20 句豆（剩餘 30 句豆）
3. 24 小時後收穫 → 獲得 60-100 田豆
4. 加工售賣 → 獲得 600-1000 錢
5. 建設第 3 塊田地 → 消耗 300 錢
6. 現在有 3 塊田地 → 需要 30 句豆種植
7. 但只剩 30 句豆 → 種植後沒有剩餘
8. 為了繼續種植 → 必須繼續練習獲得句豆
```

**關鍵點**：
- ✅ 句豆持續消耗，不會累積過多
- ✅ 擴展田地增加句豆需求
- ✅ 必須持續練習才能維持種植循環

---

## 十四、風險與緩解措施

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 成就進度追蹤複雜 | 可能遺漏更新點 | 建立統一的成就更新機制，在關鍵節點統一調用 |
| 種植時間計算 | 時區問題 | 使用 UTC 時間，前端轉換為本地時間 |
| 庫存同步 | 並發問題 | 使用數據庫事務，確保數據一致性 |
| 建設效果計算 | 性能問題 | 緩存建設效果，只在建設時重新計算 |
| 成就解鎖通知 | 用戶可能錯過 | 實現通知系統，在成就解鎖時顯示提示 |
| **用戶存豆不練** | **違背學習目標** | **確保句豆持續消耗，擴展田地增加需求，田豆不能種植** |
| **用戶不登入** | **活躍度下降** | **收穫提醒、每日任務、連續天數成就** |

---

## 十五、基於陶淵明《歸園田居》的深度優化

### 13.1 時間系統（「晨興理荒穢，帶月荷鋤歸」）

**設計理念**：陶淵明強調「晨興」和「帶月」，體現了躬耕的勤勞和時間的節奏。

**具體設計**：
- **晨興時段**（6:00-10:00）：種植效率 +20%，收穫數量 +10%
- **日間時段**（10:00-18:00）：正常效率
- **帶月時段**（18:00-22:00）：收穫效率 +20%，加工效率 +10%
- **夜間時段**（22:00-6:00）：正常效率，但可以「讀書」（見下文）

**視覺表現**：
- 農莊視圖根據時間切換背景（晨光、日間、夕陽、月夜）
- 種植/收穫動畫根據時段有不同的視覺效果

### 13.2 自然元素建設（「榆柳蔭後簷，桃李羅堂前」）

**設計理念**：陶淵明詩中充滿自然元素，這些應該成為農莊的重要組成部分。

**新增建設項目**：

| 建設類型 | 詩句來源 | 成本 | 功能 | 描述 |
|---------|---------|------|------|------|
| 南山 | 「種豆南山下」 | 500 錢 | 背景裝飾 | 農莊背景，增加詩意 |
| 東籬 | 「採菊東籬下」 | 300 錢 | 採菊功能 | 可以採集「菊花」物品 |
| 桑麻田 | 「桑麻日已長」 | 400 錢 | 額外收穫 | 每週額外收穫 50 田豆 |
| 雞舍 | 「雞鳴桑樹顛」 | 200 錢 | 晨興加成 | 晨興時段效率 +10% |
| 犬舍 | 「狗吠深巷中」 | 200 錢 | 防護功能 | 減少「野草」影響（見下文） |
| 榆柳 | 「榆柳蔭後簷」 | 250 錢 | 遮蔭功能 | 減少種植時間 5% |
| 桃李 | 「桃李羅堂前」 | 300 錢 | 裝飾+收穫 | 每週收穫「桃花」「李子」各 10 個 |

### 13.3 日常任務系統（「既耕亦已種，時還讀我書」）

**設計理念**：陶淵明的生活不僅是種田，還有讀書、採菊等日常活動。

**日常任務類型**：

1. **理荒穢**（「晨興理荒穢」）
   - 任務：清理田地中的「野草」
   - 獎勵：收穫數量 +20%，獲得「理荒穢」成就進度
   - 頻率：每塊田地每 3 天出現一次野草

2. **採菊**（「採菊東籬下」）
   - 任務：在東籬採集菊花
   - 獎勵：獲得「菊花」物品，可用於特殊加工
   - 頻率：每天可採集 1 次

3. **讀書**（「時還讀我書」）
   - 任務：完成 1 篇閱讀
   - 獎勵：獲得「讀書心得」，可用於提升加工效率
   - 頻率：每天可完成 1 次

4. **荷鋤歸**（「帶月荷鋤歸」）
   - 任務：在帶月時段完成收穫
   - 獎勵：收穫數量 +30%，獲得「荷鋤歸」成就進度
   - 頻率：每天帶月時段可完成 1 次

### 13.4 社交元素（「過門更相呼，有茶共品之」）

**設計理念**：陶淵明雖然隱居，但仍有鄰里交往，這可以與班級系統結合。用「茶」替代「酒」，更適合中學生。

**社交功能**：

1. **過門相呼**
   - 功能：訪問同班級同學的農莊
   - 互動：可以「借閱」同學的豆田（需要學習互動）
   - 獎勵：被訪問的同學獲得「鄰里友好」成就進度

2. **有茶共品**
   - 功能：使用「茶」物品邀請同學到農莊
   - 互動：共同完成「詩茶會」任務（一起完成閱讀或練習）
   - 獎勵：雙方獲得「詩茶會」成就進度，獲得額外句豆

3. **鄰里互助**
   - 功能：幫助同學「理荒穢」
   - 互動：完成同學農莊的清理任務
   - 獎勵：雙方獲得「鄰里互助」成就進度

### 13.5 詩茶元素（「既耕亦已種，時還讀我書」）

**設計理念**：詩和茶是田園生活的重要組成部分，用「茶」替代「酒」，更適合中學生，同時保持文化內涵。

**特殊物品系統**：

1. **茶**
   - 獲得方式：完成「有茶共品」任務，或加工特殊豆製品（如「菊花茶」）
   - 用途：邀請同學到農莊，舉辦「詩茶會」
   - 效果：使用後，下次練習獲得句豆 +50%

2. **詩集**
   - 獲得方式：完成「讀書」任務累積
   - 用途：提升加工效率，或解鎖特殊成就
   - 效果：使用後，下次加工效率 +30%

3. **菊花**
   - 獲得方式：在東籬採集
   - 用途：加工成「菊花茶」，售價 500 錢
   - 效果：使用後，下次收穫數量 +20%，或可用於「有茶共品」社交功能

### 13.6 季節系統（「孟夏草木長，繞屋樹扶疏」）

**設計理念**：陶淵明詩中體現了對季節變化的敏感，這應該影響農莊。

**季節效果**：

- **孟夏**（5-6 月）：草木長，收穫數量 +20%
- **秋收**（9-10 月）：收穫季節，收穫數量 +30%
- **冬藏**（11-1 月）：種植時間 +20%，但收穫數量 +10%
- **春耕**（2-4 月）：種植效率 +20%，收穫數量正常

**視覺表現**：
- 農莊視圖根據季節切換（春綠、夏茂、秋黃、冬雪）
- 植物根據季節有不同的視覺效果

### 13.7 野草系統（「草盛豆苗稀」）

**設計理念**：陶淵明詩中提到「草盛豆苗稀」，體現了躬耕的艱辛。

**野草機制**：
- 每塊田地每 3 天會出現「野草」
- 野草會減少收穫數量（-20%）
- 需要「理荒穢」任務清理
- 建設「犬舍」可以減少野草出現頻率（-50%）

### 13.8 詩句成就系統

**設計理念**：將《歸園田居》的詩句作為特殊成就，增加文化內涵。

**詩句成就**：

| 成就名稱 | 詩句來源 | 解鎖條件 | 獎勵 |
|---------|---------|---------|------|
| 種豆南山下 | 「種豆南山下」 | 完成首次種植 | 解鎖「南山」建設 |
| 晨興理荒穢 | 「晨興理荒穢」 | 完成 10 次理荒穢任務 | 晨興時段效率 +10% |
| 帶月荷鋤歸 | 「帶月荷鋤歸」 | 完成 20 次帶月收穫 | 帶月時段效率 +10% |
| 採菊東籬下 | 「採菊東籬下」 | 完成 30 次採菊任務 | 解鎖「東籬」建設 |
| 悠然見南山 | 「悠然見南山」 | 建設「南山」和「東籬」 | 獲得「悠然」稱號 |
| 榆柳蔭後簷 | 「榆柳蔭後簷」 | 建設「榆柳」 | 減少種植時間 5% |
| 桃李羅堂前 | 「桃李羅堂前」 | 建設「桃李」 | 每週額外收穫 |
| 過門更相呼 | 「過門更相呼」 | 訪問 10 位同學的農莊 | 獲得「鄰里友好」稱號 |
| 有茶共品之 | 「過門更相呼，有茶共品之」 | 完成 5 次詩茶會 | 獲得「詩茶」稱號 |
| 時還讀我書 | 「時還讀我書」 | 完成 50 次讀書任務 | 獲得「讀書人」稱號 |

### 13.9 農莊命名系統

**設計理念**：讓用戶可以為自己的農莊命名，體現個性化。

**命名規則**：
- 可以從《歸園田居》詩句中選擇（如「南山農莊」「東籬小院」）
- 也可以自定義名稱
- 名稱會顯示在農莊視圖和社交功能中

### 13.10 視覺與音效優化

**視覺優化**：
- **背景動態**：根據時間和季節動態變化
- **天氣效果**：偶爾出現「夕露沾我衣」的露水效果
- **動物動畫**：雞鳴、狗吠的動畫效果
- **植物生長**：榆柳、桃李的生長動畫

**音效優化**：
- **晨興**：雞鳴聲
- **帶月**：蟲鳴聲
- **理荒穢**：鋤地聲
- **採菊**：採摘聲
- **讀書**：翻書聲

---

## 十六、後續優化方向

### 14.1 功能擴展

- **社交功能**：參觀同學的農莊（已整合到 13.4）
- **偷豆功能**：可以「借閱」同學的豆田（需要學習互動）
- **季節系統**：根據季節變化，收穫數量不同（已整合到 13.6）
- **任務系統**：每日/每週任務，獲得額外獎勵（已整合到 13.3）

### 14.2 視覺優化

- **3D 農莊視圖**：升級為 3D 視圖
- **動畫優化**：更豐富的種植和收穫動畫（已整合到 13.10）
- **主題切換**：根據季節切換農莊主題（已整合到 13.6）

### 14.3 性能優化

- **數據緩存**：緩存成就和庫存數據
- **懶加載**：農莊視圖懶加載
- **批量操作**：支持批量種植和收穫

---

## 十七、參考資料

- 陶淵明《歸園田居》詩句
- 現有 Edamame 設計系統
- 現有成就系統設計（如有）
- 現有遊戲化系統設計（如有）

---

## 附錄：豆製品說明

### 豆製品文化內涵

| 豆製品 | 文化內涵 | 詩句聯想 |
|--------|---------|---------|
| 豆漿 | 流暢、滋養 | 「晨興理荒穢，帶月荷鋤歸」 |
| 豆干 | 堅實、耐嚼 | 「種豆南山下，草盛豆苗稀」 |
| 豆花 | 柔軟、細膩 | 「採菊東籬下，悠然見南山」 |
| 腐竹 | 長條、延伸 | 「道狹草木長，夕露沾我衣」 |
| 豆豉 | 發酵、深度 | 「此中有真意，欲辨已忘言」 |
| 醬油 | 調味、提升 | 「衣沾不足惜，但使願無違」 |

---

**文檔維護者**：句豆開發團隊  
**最後更新**：2025-01-XX

