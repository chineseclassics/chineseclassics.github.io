# 本地对战模式重构计划

## 📋 项目概述

将本地多人轮流模式从"设置"中分离出来，独立为"本地对战"模式，与"远程对战"、"单人模式"形成三大游戏模式架构，并为未来扩展多种玩法预留空间。

---

## 🎯 当前重构目标

### 界面布局调整

#### 1. 按钮重新布局
- 在与"设置"按钮同一行，添加"远程对战"和"本地对战"两个按钮
- "远程对战"按钮从原来的右下角位置移到这一行
- "本地对战"是新增按钮，放在这一行

```
布局示意：
┌─────────────────────────────────────────┐
│  标题区域                                │
├─────────────────────────────────────────┤
│  游戏区域                                │
│                                         │
├─────────────────────────────────────────┤
│  [本地对战] [远程对战] [设置]            │
└─────────────────────────────────────────┘
```

### 远程对战按钮
- ✅ 功能保持不变
- ✅ 点击后弹出的模态窗口和之前一样

### 本地对战按钮（新功能）

点击后弹出**本地对战设置模态窗口**，包含：

**可设置参数**（从"设置"中分离出来）：
- 选手数量
- 选手名称
- 题目数
- 速度模式（勾选框）
- 比赛诗词库选择（下拉菜单）

**窗口底部按钮**：
- "取消"按钮
- "开始对战"按钮

**行为变化**：
- ✅ 点击"开始对战"直接开始本地轮流对战
- ❌ 取消之前的"对战即将开始"赛前信息总结窗口

### 设置按钮（简化后）

**保留的功能**：
- 诗词库管理：导入和导出
- 诗词库选择：仅影响单人模式
- 全局参数（影响所有模式）：
  - 时间限制
  - 待选字数量

**移除的内容**：
- 选手数量、选手名称、题目数、速度模式等本地对战相关设置

### 模式隔离原则

三种模式的诗词库选择完全独立：
- **单人模式**：使用"设置"中选择的诗词库
- **本地对战**：使用"本地对战"窗口中选择的诗词库
- **远程对战**：使用"远程对战"窗口中选择的诗词库

但**时间限制**和**待选字数量**是全局参数，影响所有模式。

---

## 💡 UI/UX 优化建议

### 1. 按钮视觉设计

#### 建议图标
- 本地对战：👥 或 🎮（表示同台竞技）
- 远程对战：🌐 或 ⚔️（表示远程联机）
- 设置：⚙️

#### 视觉区分
- **对战类按钮**：醒目的主色调（如蓝色、绿色）
- **设置按钮**：中性色调（如灰色）

### 2. 模态窗口一致性
- 三个模态窗口（远程对战、本地对战、设置）使用统一的设计风格
- 表单元素的布局和间距保持一致
- 按钮位置统一（如都采用"取消在左，确认在右"）

### 3. 用户友好提示
- 本地对战设置中，添加每个参数的简短说明或提示文本
- 诗词库选择时，显示当前选中的库的题目数量
- 参数范围提示（如"选手数量：2-8人"）

### 4. 交互优化
- **过渡动画**：模态窗口打开/关闭添加平滑动画
- **键盘支持**：ESC关闭模态窗口，Enter确认
- **移动端适配**：确保模态窗口在手机上也好用
- **帮助提示**：每个模式添加"?"帮助按钮，解释玩法规则

---

## 🏗️ 代码架构设计

### 1. 模式与配置管理

```javascript
// 游戏模式定义
const GameModes = {
    SINGLE: {
        id: 'single',
        name: '单人模式',
        icon: '🎯',
        description: '独自挑战，提升诗词水平',
        gameTypes: [], // 预留未来玩法
        config: {
            poemSet: 'default',
            // 单人模式特有配置
        }
    },
    LOCAL_BATTLE: {
        id: 'local_battle',
        name: '本地对战',
        icon: '👥',
        description: '同台竞技，一较高下',
        gameTypes: [], // 预留：如"轮流模式"、"抢答模式"、"团队对战"等
        config: {
            playerCount: 2,
            playerNames: [],
            questionCount: 10,
            speedMode: false,
            poemSet: 'default',
            // 本地对战特有配置
        }
    },
    REMOTE_BATTLE: {
        id: 'remote_battle',
        name: '远程对战',
        icon: '🌐',
        description: '远程联机，实时对决',
        gameTypes: [], // 预留：如"限时积分"、"淘汰赛"、"段位赛"等
        config: {
            poemSet: 'default',
            roomCode: '',
            // 远程对战特有配置
        }
    }
};

// 全局配置（影响所有模式）
const GlobalConfig = {
    timeLimit: 30,        // 答题时间限制（秒）
    optionsCount: 6       // 待选字数量
};
```

### 2. 玩法扩展架构（重要）

```javascript
/**
 * 玩法注册系统
 * 用于管理每个模式下的不同玩法
 */
class GameTypeRegistry {
    constructor() {
        this.gameTypes = new Map();
    }
    
    /**
     * 注册新玩法
     * @param {string} modeId - 所属模式ID (single/local_battle/remote_battle)
     * @param {Object} gameType - 玩法配置对象
     */
    register(modeId, gameType) {
        if (!this.gameTypes.has(modeId)) {
            this.gameTypes.set(modeId, []);
        }
        
        const gameTypeConfig = {
            id: gameType.id,
            name: gameType.name,
            description: gameType.description,
            icon: gameType.icon,
            rules: gameType.rules,
            config: gameType.config || {},
            startGame: gameType.startGame  // 游戏启动函数
        };
        
        this.gameTypes.get(modeId).push(gameTypeConfig);
    }
    
    /**
     * 获取某模式下的所有玩法
     * @param {string} modeId - 模式ID
     * @returns {Array} 玩法列表
     */
    getGameTypes(modeId) {
        return this.gameTypes.get(modeId) || [];
    }
    
    /**
     * 获取特定玩法配置
     * @param {string} modeId - 模式ID
     * @param {string} gameTypeId - 玩法ID
     * @returns {Object} 玩法配置
     */
    getGameType(modeId, gameTypeId) {
        const types = this.getGameTypes(modeId);
        return types.find(t => t.id === gameTypeId);
    }
}

// 全局实例
const gameTypeRegistry = new GameTypeRegistry();
```

### 3. 未来玩法示例

#### 本地对战玩法
```javascript
const localGameTypes = [
    {
        id: 'turn_based',
        name: '轮流答题',
        description: '玩家依次答题，答对得分',
        icon: '🔄',
        rules: [
            '玩家按顺序轮流答题',
            '答对得1分，答错不扣分',
            '所有题目答完后统计总分'
        ],
        config: {
            questionCount: 10,
            timePerQuestion: 30
        },
        startGame: (config) => {
            // 启动轮流答题模式
        }
    },
    {
        id: 'rush_answer',
        name: '抢答模式',
        description: '先抢先答，快速反应',
        icon: '⚡',
        rules: [
            '题目出现后，最快按下按钮的玩家获得答题权',
            '答对得分，答错对手获得答题机会',
            '先达到目标分数者获胜'
        ],
        config: {
            targetScore: 10,
            penaltyTime: 3  // 抢答错误惩罚时间
        },
        startGame: (config) => {
            // 启动抢答模式
        }
    },
    {
        id: 'team_battle',
        name: '团队对战',
        description: '分组竞赛，团队协作',
        icon: '👥',
        rules: [
            '玩家分为两组',
            '组内轮流答题',
            '团队总分高者获胜'
        ],
        config: {
            teamCount: 2,
            questionCount: 20
        },
        startGame: (config) => {
            // 启动团队对战
        }
    }
];

// 注册本地对战玩法
localGameTypes.forEach(gameType => {
    gameTypeRegistry.register('local_battle', gameType);
});
```

#### 远程对战玩法
```javascript
const remoteGameTypes = [
    {
        id: 'timed_score',
        name: '限时积分赛',
        description: '限时内尽可能多得分',
        icon: '⏱️',
        rules: [
            '所有玩家同时开始',
            '在规定时间内答题',
            '答对得分，积分最高者获胜'
        ],
        config: {
            duration: 300  // 5分钟
        }
    },
    {
        id: 'elimination',
        name: '淘汰赛',
        description: '错误即淘汰，坚持到最后',
        icon: '🏆',
        rules: [
            '所有玩家同时答题',
            '答错立即淘汰',
            '最后剩下的玩家获胜'
        ],
        config: {
            lives: 3  // 每人3条命
        }
    },
    {
        id: 'ranked_match',
        name: '段位赛',
        description: '段位匹配，竞技排名',
        icon: '🎖️',
        rules: [
            '根据段位匹配对手',
            '胜利提升段位分',
            '失败扣除段位分'
        ],
        config: {
            questionCount: 10
        }
    }
];

// 注册远程对战玩法
remoteGameTypes.forEach(gameType => {
    gameTypeRegistry.register('remote_battle', gameType);
});
```

#### 单人模式玩法
```javascript
const singleGameTypes = [
    {
        id: 'practice',
        name: '练习模式',
        description: '自由练习，不计时不计分',
        icon: '📝',
        rules: [
            '随机出题，无时间限制',
            '可查看答案解析',
            '适合学习新诗词'
        ],
        config: {
            showHints: true
        }
    },
    {
        id: 'challenge',
        name: '挑战模式',
        description: '连续答题，挑战极限',
        icon: '🎯',
        rules: [
            '连续答题，直到答错',
            '答对连击增加分数倍率',
            '挑战个人最高纪录'
        ],
        config: {
            comboBonus: true
        }
    },
    {
        id: 'daily_quest',
        name: '每日任务',
        description: '完成每日目标，获得奖励',
        icon: '📅',
        rules: [
            '每日更新任务目标',
            '完成任务获得成就',
            '连续完成获得额外奖励'
        ],
        config: {
            dailyTarget: 20
        }
    }
];

// 注册单人模式玩法
singleGameTypes.forEach(gameType => {
    gameTypeRegistry.register('single', gameType);
});
```

### 4. 配置管理器

```javascript
/**
 * 配置管理器
 * 负责配置的加载、保存和验证
 */
class ConfigManager {
    constructor() {
        this.storageKeys = {
            GLOBAL_CONFIG: 'shicizuju_global_config',
            SINGLE_CONFIG: 'shicizuju_single_config',
            LOCAL_BATTLE_CONFIG: 'shicizuju_local_config',
            REMOTE_BATTLE_CONFIG: 'shicizuju_remote_config',
            CUSTOM_POEM_SETS: 'shicizuju_custom_poem_sets'
        };
    }
    
    /**
     * 加载全局配置
     */
    loadGlobalConfig() {
        const saved = localStorage.getItem(this.storageKeys.GLOBAL_CONFIG);
        return saved ? JSON.parse(saved) : {
            timeLimit: 30,
            optionsCount: 6
        };
    }
    
    /**
     * 保存全局配置
     */
    saveGlobalConfig(config) {
        localStorage.setItem(
            this.storageKeys.GLOBAL_CONFIG,
            JSON.stringify(config)
        );
    }
    
    /**
     * 加载模式配置
     */
    loadModeConfig(modeId) {
        const key = this.storageKeys[`${modeId.toUpperCase()}_CONFIG`];
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : this.getDefaultConfig(modeId);
    }
    
    /**
     * 保存模式配置
     */
    saveModeConfig(modeId, config) {
        const key = this.storageKeys[`${modeId.toUpperCase()}_CONFIG`];
        localStorage.setItem(key, JSON.stringify(config));
    }
    
    /**
     * 获取默认配置
     */
    getDefaultConfig(modeId) {
        const defaults = {
            single: {
                poemSet: 'default',
                currentGameType: 'practice'
            },
            local_battle: {
                playerCount: 2,
                playerNames: ['选手1', '选手2'],
                questionCount: 10,
                speedMode: false,
                poemSet: 'default',
                currentGameType: 'turn_based'
            },
            remote_battle: {
                poemSet: 'default',
                currentGameType: 'timed_score'
            }
        };
        return defaults[modeId] || {};
    }
    
    /**
     * 验证配置
     */
    validateConfig(modeId, config) {
        const validators = {
            local_battle: (cfg) => {
                if (cfg.playerCount < 2 || cfg.playerCount > 8) {
                    return { valid: false, error: '选手数量必须在2-8之间' };
                }
                if (cfg.playerNames.length !== cfg.playerCount) {
                    return { valid: false, error: '选手名称数量不匹配' };
                }
                if (new Set(cfg.playerNames).size !== cfg.playerNames.length) {
                    return { valid: false, error: '选手名称不能重复' };
                }
                if (cfg.playerNames.some(name => !name.trim())) {
                    return { valid: false, error: '选手名称不能为空' };
                }
                if (cfg.questionCount < 5) {
                    return { valid: false, error: '题目数至少为5' };
                }
                return { valid: true };
            }
        };
        
        const validator = validators[modeId];
        return validator ? validator(config) : { valid: true };
    }
}

// 全局实例
const configManager = new ConfigManager();
```

### 5. UI管理器

```javascript
/**
 * UI管理器基类
 */
class UIManager {
    constructor(modalId) {
        this.modalId = modalId;
        this.modal = null;
    }
    
    /**
     * 显示模态窗口
     */
    show() {
        this.modal = document.getElementById(this.modalId);
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.onShow();
        }
    }
    
    /**
     * 隐藏模态窗口
     */
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.onHide();
        }
    }
    
    /**
     * 显示回调（子类重写）
     */
    onShow() {}
    
    /**
     * 隐藏回调（子类重写）
     */
    onHide() {}
}

/**
 * 本地对战UI管理器
 */
class LocalBattleUI extends UIManager {
    constructor() {
        super('localBattleModal');
        this.config = configManager.loadModeConfig('local_battle');
    }
    
    onShow() {
        this.loadConfig();
        this.renderGameTypes();
    }
    
    /**
     * 加载配置到表单
     */
    loadConfig() {
        document.getElementById('playerCount').value = this.config.playerCount;
        document.getElementById('questionCount').value = this.config.questionCount;
        document.getElementById('speedMode').checked = this.config.speedMode;
        this.updatePlayerNames();
        this.loadPoemSets();
    }
    
    /**
     * 更新选手名称输入框
     */
    updatePlayerNames() {
        const container = document.getElementById('playerNamesContainer');
        container.innerHTML = '';
        
        for (let i = 0; i < this.config.playerCount; i++) {
            const name = this.config.playerNames[i] || `选手${i + 1}`;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = name;
            input.placeholder = `选手${i + 1}`;
            input.className = 'player-name-input';
            container.appendChild(input);
        }
    }
    
    /**
     * 渲染玩法选择
     */
    renderGameTypes() {
        const gameTypes = gameTypeRegistry.getGameTypes('local_battle');
        const select = document.getElementById('gameTypeSelect');
        
        select.innerHTML = gameTypes.map(gt => 
            `<option value="${gt.id}" ${gt.id === this.config.currentGameType ? 'selected' : ''}>
                ${gt.icon} ${gt.name}
            </option>`
        ).join('');
        
        // 显示当前玩法说明
        this.updateGameTypeDescription();
    }
    
    /**
     * 更新玩法说明
     */
    updateGameTypeDescription() {
        const select = document.getElementById('gameTypeSelect');
        const gameType = gameTypeRegistry.getGameType('local_battle', select.value);
        
        if (gameType) {
            const desc = document.getElementById('gameTypeDescription');
            desc.innerHTML = `
                <p>${gameType.description}</p>
                <ul>
                    ${gameType.rules.map(rule => `<li>${rule}</li>`).join('')}
                </ul>
            `;
        }
    }
    
    /**
     * 加载诗词库列表
     */
    loadPoemSets() {
        // 实现诗词库加载逻辑
    }
    
    /**
     * 开始对战
     */
    startBattle() {
        // 收集配置
        const config = this.collectConfig();
        
        // 验证配置
        const validation = configManager.validateConfig('local_battle', config);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }
        
        // 保存配置
        configManager.saveModeConfig('local_battle', config);
        
        // 获取当前玩法
        const gameType = gameTypeRegistry.getGameType('local_battle', config.currentGameType);
        
        // 启动游戏
        if (gameType && gameType.startGame) {
            this.hide();
            gameType.startGame(config);
        }
    }
    
    /**
     * 收集配置
     */
    collectConfig() {
        const playerNames = Array.from(
            document.querySelectorAll('.player-name-input')
        ).map(input => input.value.trim());
        
        return {
            playerCount: parseInt(document.getElementById('playerCount').value),
            playerNames: playerNames,
            questionCount: parseInt(document.getElementById('questionCount').value),
            speedMode: document.getElementById('speedMode').checked,
            poemSet: document.getElementById('poemSetSelect').value,
            currentGameType: document.getElementById('gameTypeSelect').value
        };
    }
}
```

---

## 📐 本地对战模态窗口设计

```
┌─────────────────────────────────────────┐
│   👥 本地对战设置                        │
├─────────────────────────────────────────┤
│                                         │
│ 玩法模式                                │
│ ┌─────────────────────────────────────┐ │
│ │ 🔄 轮流答题                    ▼    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 📝 玩法说明                             │
│ ┌─────────────────────────────────────┐ │
│ │ 玩家依次答题，答对得分               │ │
│ │ • 玩家按顺序轮流答题                 │ │
│ │ • 答对得1分，答错不扣分              │ │
│ │ • 所有题目答完后统计总分             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 选手设置                                │
│ ┌──────────┐                           │
│ │ 选手数量  │ [2  ▼] (2-8人)           │
│ └──────────┘                           │
│                                         │
│ 选手名称                                │
│ ┌─────────────────────────────────────┐ │
│ │ 选手1: [____________________]        │ │
│ │ 选手2: [____________________]        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 比赛设置                                │
│ ┌──────────┐                           │
│ │ 题目数    │ [10 ▼] (至少5题)         │
│ └──────────┘                           │
│ ┌──────────┐                           │
│ │ 诗词库    │ [唐诗三百首 ▼] (120题)   │
│ └──────────┘                           │
│                                         │
│ ☐ 速度模式 (答对立即进入下一题)         │
│                                         │
├─────────────────────────────────────────┤
│                    [取消]  [开始对战]    │
└─────────────────────────────────────────┘
```

---

## 📂 localStorage 数据结构

```javascript
// shicizuju_global_config
{
    timeLimit: 30,          // 答题时间限制（秒）
    optionsCount: 6         // 待选字数量
}

// shicizuju_single_config
{
    poemSet: 'default',          // 诗词库
    currentGameType: 'practice'  // 当前玩法
}

// shicizuju_local_config
{
    playerCount: 2,                      // 选手数量
    playerNames: ['张三', '李四'],        // 选手名称
    questionCount: 10,                   // 题目数
    speedMode: false,                    // 速度模式
    poemSet: 'tangshi300',               // 诗词库
    currentGameType: 'turn_based'        // 当前玩法
}

// shicizuju_remote_config
{
    poemSet: 'default',              // 诗词库
    currentGameType: 'timed_score',  // 当前玩法
    lastRoomCode: 'ABC123'           // 上次房间代码（可选）
}

// shicizuju_custom_poem_sets
[
    {
        id: 'custom_1',
        name: '我的诗词集',
        poems: [...],
        createdAt: '2025-09-30T10:00:00Z'
    }
]
```

---

## 🚀 实施步骤

### 阶段一：基础重构（当前任务）

#### 步骤1：UI调整
- [ ] 移动"远程对战"按钮到顶部按钮行
- [ ] 添加"本地对战"按钮
- [ ] 调整按钮样式和图标

#### 步骤2：创建本地对战模态窗口
- [ ] 设计模态窗口HTML结构
- [ ] 添加CSS样式
- [ ] 实现表单元素
  - [ ] 选手数量选择
  - [ ] 动态选手名称输入
  - [ ] 题目数选择
  - [ ] 速度模式勾选框
  - [ ] 诗词库下拉菜单

#### 步骤3：分离配置逻辑
- [ ] 从"设置"中移除本地对战相关设置
- [ ] 实现三种模式的配置隔离
- [ ] 更新localStorage存储结构

#### 步骤4：实现本地对战启动
- [ ] 配置收集和验证
- [ ] 直接启动对战（跳过预览窗口）
- [ ] 状态初始化

#### 步骤5：测试和调试
- [ ] 测试三种模式的独立性
- [ ] 测试配置保存和加载
- [ ] 测试参数验证
- [ ] 移动端兼容性测试

### 阶段二：架构优化

#### 步骤1：实现模式管理器
- [ ] 创建 `GameModes` 配置对象
- [ ] 创建 `ConfigManager` 类
- [ ] 重构现有代码使用新架构

#### 步骤2：实现玩法注册系统
- [ ] 创建 `GameTypeRegistry` 类
- [ ] 设计玩法配置接口
- [ ] 实现玩法注册和查询

#### 步骤3：UI管理器重构
- [ ] 创建 `UIManager` 基类
- [ ] 实现 `LocalBattleUI` 类
- [ ] 实现 `RemoteBattleUI` 类
- [ ] 实现 `SettingsUI` 类

### 阶段三：扩展玩法（未来）

#### 本地对战新玩法
- [ ] 抢答模式
  - [ ] 按钮抢答机制
  - [ ] 答题权判定
  - [ ] 惩罚时间处理
- [ ] 团队对战
  - [ ] 分组逻辑
  - [ ] 团队积分统计
  - [ ] 团队排名

#### 远程对战新玩法
- [ ] 淘汰赛
  - [ ] 生命值系统
  - [ ] 实时淘汰通知
  - [ ] 最后胜者判定
- [ ] 段位赛
  - [ ] 段位系统
  - [ ] 匹配算法
  - [ ] 段位分计算

#### 单人模式新玩法
- [ ] 挑战模式
  - [ ] 连击系统
  - [ ] 分数倍率
  - [ ] 个人记录
- [ ] 每日任务
  - [ ] 任务生成
  - [ ] 进度追踪
  - [ ] 奖励系统

---

## 📋 参数验证规则

### 本地对战参数验证

```javascript
const validationRules = {
    playerCount: {
        min: 2,
        max: 8,
        message: '选手数量必须在2-8之间'
    },
    playerNames: {
        notEmpty: true,
        unique: true,
        message: {
            empty: '选手名称不能为空',
            duplicate: '选手名称不能重复'
        }
    },
    questionCount: {
        min: 5,
        max: 100,
        message: '题目数必须在5-100之间'
    },
    poemSet: {
        required: true,
        message: '请选择诗词库'
    }
};
```

### 全局参数验证

```javascript
const globalValidationRules = {
    timeLimit: {
        min: 10,
        max: 300,
        message: '时间限制必须在10-300秒之间'
    },
    optionsCount: {
        min: 4,
        max: 12,
        message: '待选字数量必须在4-12之间'
    }
};
```

---

## 🎨 样式规范

### 按钮样式

```css
/* 对战类按钮 */
.battle-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.battle-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 设置按钮 */
.settings-button {
    background: #6c757d;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
}
```

### 模态窗口样式

```css
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

---

## 📱 移动端适配

### 响应式断点

```css
/* 手机 */
@media (max-width: 576px) {
    .modal-content {
        width: 95%;
        padding: 16px;
    }
    
    .battle-button {
        width: 100%;
        margin-bottom: 8px;
    }
}

/* 平板 */
@media (min-width: 577px) and (max-width: 768px) {
    .modal-content {
        width: 80%;
    }
}

/* 桌面 */
@media (min-width: 769px) {
    .modal-content {
        width: 500px;
    }
}
```

---

## ⚠️ 注意事项

### 模式隔离原则
- ✅ 三种模式的配置必须完全独立
- ✅ 切换模式时必须清理前一模式的状态
- ✅ 全局配置变更需通知所有模式
- ❌ 避免模式间的配置互相影响

### 数据持久化
- ✅ 所有用户配置必须保存到 localStorage
- ✅ 首次加载时提供合理的默认值
- ✅ 配置变更立即保存
- ❌ 避免频繁的 localStorage 写入

### 用户体验
- ✅ 提供清晰的参数说明和范围提示
- ✅ 验证失败时给出明确的错误信息
- ✅ 保留用户上次的设置
- ✅ 支持键盘操作（ESC、Enter）
- ❌ 避免模态窗口嵌套过深

### 代码质量
- ✅ 遵循单一职责原则
- ✅ 使用类和模块化组织代码
- ✅ 添加详细的注释和文档
- ✅ 为关键功能编写测试
- ❌ 避免硬编码配置值

---

## 🔮 未来展望

### 短期目标（1-3个月）
1. 完成基础重构
2. 实现架构优化
3. 添加1-2个新玩法

### 中期目标（3-6个月）
1. 完善所有三种模式的多种玩法
2. 添加成就系统
3. 实现数据统计和分析

### 长期目标（6-12个月）
1. AI对手系统
2. 社交功能（好友、排行榜）
3. 自定义诗词库分享平台
4. 移动应用开发

---

## 📞 问题反馈

如果在实施过程中遇到问题或有新的想法，请记录在此文档中。

### 待解决问题
- [ ] (暂无)

### 改进建议
- [ ] (暂无)

---

**文档版本**: 1.0  
**创建日期**: 2025-09-30  
**最后更新**: 2025-09-30  
**维护者**: ylzhang
