# 3D 诗词魔方游戏设计文档

## 📋 项目概述

### 游戏名称
**诗境魔方** / Poetry Cube 3D

### 核心理念
将传统诗词学习与 3D 魔方互动结合，通过旋转魔方寻找汉字、拼接诗句的方式，让学生在趣味中学习古诗词。

### 目标用户
- 小学生（6-12岁）
- 中学生（诗词爱好者）
- 家长/教师（可自定义诗词库）

---

## 🎮 核心玩法设计

### 游戏流程

#### 1. 游戏准备
- 选择诗词库（唐诗/宋词/小学生诗词等）
- 系统随机抽取一首诗的一句
- 将诗句的汉字随机分布在魔方的6个面（54个小方块）
- 添加干扰字符（其他诗词的字）填充剩余格子

#### 2. 游戏进行
- **观察魔方**：
  - 🖱️ 鼠标拖拽：整体旋转魔方（观察不同角度）
  - 👆 点击面/层：该层旋转90度
  
- **寻找汉字**：
  - 在6个面上寻找诗句需要的汉字
  - 提示系统显示诗名、作者和字数
  
- **拼接诗句**：
  - 找到正确的字后，**直接点击该汉字**
  - 汉字自动飞入答题区
  - 按正确顺序点击，拼出完整诗句

#### 3. 完成判定
- ✅ **拼对**：
  - 魔方展开变形成卷轴
  - 显示完整诗词及注释
  - 生成精美诗词卡片
  - 播放完成音效
  
- ❌ **拼错**：
  - 字飞回原位
  - 轻微抖动提示
  - 可继续尝试

---

## 🎯 简化难度设计

### 零魔方基础友好设计

#### 操作简化
1. **不需要魔方技巧**：
   - 转动只是为了"观察不同面的字"
   - 不需要按照魔方规则还原
   
2. **点击选字机制**：
   - 找到目标字后，直接点击即可
   - 不需要精确转动到特定位置
   
3. **智能辅助系统**：
   - 🔍 提示下一个字在哪个面（可开关）
   - 🎯 自动旋转到目标字所在面
   - 📍 每个面用颜色区分，方便记忆

#### 难度分级（通过诗句长度）
- 🟢 **入门**：3-5字诗句（如"白毛浮绿水"）
- 🟡 **进阶**：7字诗句（如"白日依山尽"）
- 🔴 **挑战**：完整诗词（四句组合）

---

## 💾 数据库设计

### 数据结构（参考 shicizuju.html）

```javascript
{
  line: "床前明月光",        // 诗句（必填）
  author: "李白",            // 作者（必填）
  poem: "静夜思",            // 诗名（必填）
  tags: ["唐诗", "五言绝句"] // 标签数组（用于分类）
}
```

### Excel 导入导出

#### Excel 格式

| line（诗句） | author（作者） | poem（诗名） | tags（标签） |
|-------------|--------------|-------------|------------|
| 床前明月光 | 李白 | 静夜思 | 唐诗；五言绝句 |
| 春眠不觉晓 | 孟浩然 | 春晓 | 唐诗；五言绝句 |
| 白日依山尽 | 王之涣 | 登鹳雀楼 | 唐诗；五言绝句 |

#### 导入规则
- **标签分隔符**：支持中文分号「；」、中文逗号「，」、英文分号「;」等
- **多列标签**：支持 tag1、tag2、tag3... 或 标签1、标签2...
- **覆盖模式**：导入的 Excel 会完全替换当前用户诗词库
- **去重逻辑**：根据 `author|poem|line` 组合判断是否为同一首诗

#### 导出功能
- 导出所有诗词（内置 + 用户导入）
- 文件名：`poetry-cube-export.xlsx`
- 自动合并去重

### 数据管理

#### LocalStorage 存储

```javascript
// 存储键名
const STORAGE_KEYS = {
  userLibrary: 'cube3d_user_library',    // 用户导入的诗词
  gameProgress: 'cube3d_game_progress',  // 游戏进度
  settings: 'cube3d_settings',           // 游戏设置
  achievements: 'cube3d_achievements'    // 成就数据
};

// 用户诗词库结构
{
  poems: [
    { line: "...", author: "...", poem: "...", tags: [...] }
  ]
}

// 游戏进度结构
{
  playedPoems: ["床前明月光", "春眠不觉晓", ...],  // 已玩过的诗句
  collectedCards: [...],                           // 已收集的卡片
  totalTime: 3600,                                 // 总游戏时长（秒）
  totalCompleted: 50                               // 总完成诗句数
}
```

#### 诗词获取逻辑

```javascript
// 统一获取所有诗词
function getAllPoems() {
  const builtinPoems = BUILTIN_POEMS.map(p => ({ 
    ...p, 
    tags: p.tags || ['内置诗词库'] 
  }));
  const userPoems = loadUserLibrary().poems || [];
  return [...builtinPoems, ...userPoems];
}

// 根据标签筛选
function getPoemsByTag(tag) {
  return getAllPoems().filter(p => 
    p.tags && p.tags.includes(tag)
  );
}

// 智能选择下一首（避免重复）
function selectNextPoem(tag) {
  const pool = getPoemsByTag(tag);
  const progress = loadGameProgress();
  
  // 优先选择未玩过的
  let unplayed = pool.filter(p => 
    !progress.playedPoems.includes(p.line)
  );
  
  // 如果都玩过了，重置进度
  if (unplayed.length === 0) {
    progress.playedPoems = [];
    saveGameProgress(progress);
    unplayed = pool;
  }
  
  return unplayed[Math.floor(Math.random() * unplayed.length)];
}
```

### 内置诗词库示例

```javascript
const BUILTIN_POEMS = [
  // 唐诗 - 李白
  { line: "床前明月光", author: "李白", poem: "静夜思", tags: ["唐诗", "五言绝句", "李白"] },
  { line: "疑是地上霜", author: "李白", poem: "静夜思", tags: ["唐诗", "五言绝句", "李白"] },
  { line: "举头望明月", author: "李白", poem: "静夜思", tags: ["唐诗", "五言绝句", "李白"] },
  { line: "低头思故乡", author: "李白", poem: "静夜思", tags: ["唐诗", "五言绝句", "李白"] },
  
  // 唐诗 - 王之涣
  { line: "白日依山尽", author: "王之涣", poem: "登鹳雀楼", tags: ["唐诗", "五言绝句", "王之涣"] },
  { line: "黄河入海流", author: "王之涣", poem: "登鹳雀楼", tags: ["唐诗", "五言绝句", "王之涣"] },
  { line: "欲窮千里目", author: "王之涣", poem: "登鹳雀楼", tags: ["唐诗", "五言绝句", "王之涣"] },
  { line: "更上一層樓", author: "王之涣", poem: "登鹳雀楼", tags: ["唐诗", "五言绝句", "王之涣"] },
  
  // 小学生诗词
  { line: "春眠不觉晓", author: "孟浩然", poem: "春晓", tags: ["唐诗", "小学生诗词"] },
  { line: "处处闻啼鸟", author: "孟浩然", poem: "春晓", tags: ["唐诗", "小学生诗词"] },
  { line: "夜来风雨声", author: "孟浩然", poem: "春晓", tags: ["唐诗", "小学生诗词"] },
  { line: "花落知多少", author: "孟浩然", poem: "春晓", tags: ["唐诗", "小学生诗词"] }
  
  // ... 更多诗词
];
```

---

## ✨ 第一阶段功能实现

### 1. 魔方皮肤系统 🎨

#### 主题配置

```javascript
const CUBE_THEMES = {
  '唐诗': {
    // 视觉
    texturePath: '/images/textures/paper-texture.jpg',     // 宣纸纹理
    primaryColor: '#F5E6D3',                                // 暖黄色
    accentColor: '#8B4513',                                 // 深棕色
    fontFamily: 'KaiTi, 楷体',                              // 楷体字
    
    // 粒子效果
    particleType: 'ink',                                    // 墨滴
    particleColor: '#000000',
    particleCount: 30,
    
    // 背景环境
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    scene3D: '/models/changan-city.glb',                    // 长安城3D模型
    ambientSound: '/audio/guqin.mp3'                        // 古琴背景音
  },
  
  '宋词': {
    texturePath: '/images/textures/silk-texture.jpg',      // 丝绸纹理
    primaryColor: '#E8F4F8',                                // 青绿色
    accentColor: '#2C5F2D',                                 // 墨绿色
    fontFamily: 'STSong, 宋体',
    
    particleType: 'petal',                                  // 花瓣
    particleColor: '#FFB6C1',
    particleCount: 50,
    
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    scene3D: '/models/jiangnan-garden.glb',                 // 江南园林
    ambientSound: '/audio/guzheng.mp3'                      // 古筝
  },
  
  '小学生诗词': {
    texturePath: null,                                      // 纯色无纹理
    primaryColor: '#FFE5E5',                                // 粉色
    accentColor: '#FF69B4',                                 // 亮粉色
    fontFamily: 'Comic Sans MS, 幼圆',
    
    particleType: 'star',                                   // 星星
    particleColor: '#FFD700',
    particleCount: 40,
    
    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    scene3D: '/models/fantasy-forest.glb',                  // 童话森林
    ambientSound: '/audio/children-music.mp3'
  },
  
  '默认': {
    texturePath: null,
    primaryColor: '#FFFFFF',
    accentColor: '#333333',
    fontFamily: 'sans-serif',
    particleType: 'none',
    background: '#f0f0f0'
  }
};
```

#### 实现逻辑

```javascript
// 应用主题
function applyTheme(tagName) {
  const theme = CUBE_THEMES[tagName] || CUBE_THEMES['默认'];
  
  // 1. 更新魔方材质
  cubeMaterial.map = new THREE.TextureLoader().load(theme.texturePath);
  cubeMaterial.color.set(theme.primaryColor);
  
  // 2. 更新字体
  document.querySelectorAll('.cube-text').forEach(el => {
    el.style.fontFamily = theme.fontFamily;
    el.style.color = theme.accentColor;
  });
  
  // 3. 更新粒子系统
  particleSystem.type = theme.particleType;
  particleSystem.color = theme.particleColor;
  particleSystem.count = theme.particleCount;
  
  // 4. 更新背景
  document.body.style.background = theme.background;
  
  // 5. 加载3D场景（可选）
  if (theme.scene3D) {
    load3DScene(theme.scene3D);
  }
  
  // 6. 播放背景音乐
  if (theme.ambientSound) {
    playAmbientSound(theme.ambientSound);
  }
}

// 主题切换动画
function switchThemeWithAnimation(newTag) {
  // 淡出当前主题
  gsap.to(cubeGroup, { opacity: 0, duration: 0.5, onComplete: () => {
    // 应用新主题
    applyTheme(newTag);
    // 淡入新主题
    gsap.to(cubeGroup, { opacity: 1, duration: 0.5 });
  }});
}
```

---

### 2. 诗词卡片收集系统 🎴

#### 卡片数据结构

```javascript
{
  id: 'card_001',                          // 卡片唯一ID
  poem: {
    line: "床前明月光",
    author: "李白",
    poem: "静夜思",
    tags: ["唐诗", "五言绝句"]
  },
  gameData: {
    completedAt: 1633024800000,            // 完成时间戳
    timeSpent: 45,                          // 用时（秒）
    mistakes: 0,                            // 错误次数
    stars: 3,                               // 星级（根据用时和错误）
    cubeSnapshot: 'data:image/png;base64...' // 魔方完成时的截图
  },
  unlocked: true                            // 是否已解锁
}
```

#### 卡片生成

```javascript
// 完成诗句后生成卡片
function generatePoemCard(poem, gameData) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 800;
  canvas.height = 1200;
  
  // 1. 绘制背景（根据主题）
  const theme = getCurrentTheme();
  const gradient = ctx.createLinearGradient(0, 0, 800, 1200);
  gradient.addColorStop(0, theme.primaryColor);
  gradient.addColorStop(1, theme.accentColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 1200);
  
  // 2. 绘制边框装饰
  drawCardBorder(ctx, theme);
  
  // 3. 绘制诗句（正面）
  ctx.font = `bold 72px ${theme.fontFamily}`;
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.fillText(poem.line, 400, 400);
  
  // 4. 绘制作者和诗名
  ctx.font = `36px ${theme.fontFamily}`;
  ctx.fillText(`${poem.author} · ${poem.poem}`, 400, 500);
  
  // 5. 绘制魔方缩略图
  const img = new Image();
  img.src = gameData.cubeSnapshot;
  ctx.drawImage(img, 200, 600, 400, 400);
  
  // 6. 绘制游戏数据
  ctx.font = '24px sans-serif';
  ctx.fillText(`用时: ${gameData.timeSpent}秒`, 400, 1050);
  
  // 7. 绘制星级
  drawStars(ctx, gameData.stars, 400, 1100);
  
  return canvas.toDataURL('image/png');
}

// 卡片边框装饰
function drawCardBorder(ctx, theme) {
  // 中国风边框图案
  const borderImage = new Image();
  borderImage.src = '/images/borders/chinese-border.png';
  ctx.drawImage(borderImage, 0, 0, 800, 1200);
  
  // 可选：印章图案
  const seal = new Image();
  seal.src = '/images/seals/poetry-seal.png';
  ctx.drawImage(seal, 650, 50, 100, 100);
}
```

#### 卡片收集界面

```html
<!-- 卡片图鉴界面 -->
<div id="cardCollection" class="collection-modal">
  <div class="collection-header">
    <h2>📚 诗词图鉴</h2>
    <p>已收集: <span id="collectedCount">0</span> / <span id="totalCount">0</span></p>
  </div>
  
  <div class="collection-filters">
    <select id="filterByTag">
      <option value="all">全部标签</option>
      <!-- 动态生成 -->
    </select>
    <select id="filterByAuthor">
      <option value="all">全部作者</option>
      <!-- 动态生成 -->
    </select>
  </div>
  
  <div class="collection-grid">
    <!-- 卡片网格，未解锁的显示问号 -->
  </div>
  
  <div class="collection-actions">
    <button id="exportAllCards">📥 导出所有卡片（PDF）</button>
    <button id="shareCard">📤 分享卡片</button>
  </div>
</div>
```

#### 卡片导出 PDF

```javascript
// 使用 jsPDF 导出卡片为 PDF
async function exportCardsToPDF(cards) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  let pageCount = 0;
  
  for (let i = 0; i < cards.length; i++) {
    if (i > 0) pdf.addPage();
    
    // 添加卡片图片
    const cardImage = cards[i].imageData;
    pdf.addImage(cardImage, 'PNG', 10, 10, 190, 277);
    
    pageCount++;
  }
  
  pdf.save('诗词图鉴.pdf');
  showNotification(`已导出 ${pageCount} 张卡片`);
}
```

#### 分享功能

```javascript
// 生成分享图片
async function shareCard(card) {
  // 1. 生成带二维码的分享图
  const shareCanvas = document.createElement('canvas');
  const ctx = shareCanvas.getContext('2d');
  shareCanvas.width = 1080;
  shareCanvas.height = 1920;
  
  // 2. 绘制卡片
  const cardImg = new Image();
  cardImg.src = card.imageData;
  ctx.drawImage(cardImg, 140, 200, 800, 1200);
  
  // 3. 添加分享文案
  ctx.font = 'bold 48px KaiTi';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.fillText('我在诗境魔方学会了这首诗！', 540, 100);
  
  // 4. 添加二维码（游戏链接）
  const qrCode = await generateQRCode(window.location.href);
  ctx.drawImage(qrCode, 440, 1500, 200, 200);
  
  // 5. 添加提示文字
  ctx.font = '24px sans-serif';
  ctx.fillText('扫码一起来玩吧！', 540, 1750);
  
  // 6. 下载或分享
  const shareImage = shareCanvas.toDataURL('image/png');
  downloadImage(shareImage, `诗境魔方_${card.poem.poem}.png`);
}
```

---

### 3. 音效系统 🎵

#### 音效资源配置

```javascript
const SOUND_EFFECTS = {
  // 界面音效
  ui: {
    click: '/audio/ui/click.mp3',              // 普通点击
    hover: '/audio/ui/hover.mp3',              // 鼠标悬停
    open: '/audio/ui/open.mp3',                // 打开面板
    close: '/audio/ui/close.mp3'               // 关闭面板
  },
  
  // 游戏音效
  game: {
    cubeRotate: '/audio/game/bamboo-flip.mp3', // 魔方转动（竹简翻动声）
    charClick: '/audio/game/brush-tap.mp3',    // 点击汉字（毛笔落纸）
    charCorrect: '/audio/game/guzheng-note.mp3', // 选对一个字（古筝拨弦）
    poemComplete: '/audio/game/chime.mp3',     // 完成诗句（编钟）
    mistake: '/audio/game/gentle-ding.mp3',    // 选错（温柔提示音）
    combo: '/audio/game/fire-whoosh.mp3'       // 连胜特效
  },
  
  // 背景音乐（根据主题）
  ambient: {
    '唐诗': '/audio/ambient/guqin-flowing-water.mp3',  // 古琴《流水》
    '宋词': '/audio/ambient/guzheng-fisherman.mp3',    // 古筝《渔舟唱晚》
    '小学生诗词': '/audio/ambient/bamboo-flute.mp3',  // 竹笛轻快
    'default': null
  }
};
```

#### 音效管理器

```javascript
class SoundManager {
  constructor() {
    this.context = null;
    this.sounds = new Map();
    this.isMuted = false;
    this.volume = 1.0;
    this.init();
  }
  
  init() {
    // 创建 Web Audio Context
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    
    // 预加载所有音效
    this.preloadSounds();
  }
  
  async preloadSounds() {
    const allSounds = [
      ...Object.values(SOUND_EFFECTS.ui),
      ...Object.values(SOUND_EFFECTS.game)
    ];
    
    for (const url of allSounds) {
      if (url) {
        const buffer = await this.loadSound(url);
        this.sounds.set(url, buffer);
      }
    }
  }
  
  async loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.context.decodeAudioData(arrayBuffer);
  }
  
  play(soundKey, options = {}) {
    if (this.isMuted) return;
    
    const soundPath = this.getSoundPath(soundKey);
    if (!soundPath) return;
    
    const buffer = this.sounds.get(soundPath);
    if (!buffer) return;
    
    const source = this.context.createBufferSource();
    const gainNode = this.context.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    // 设置音量
    gainNode.gain.value = (options.volume || 1.0) * this.volume;
    
    // 播放
    source.start(0);
  }
  
  getSoundPath(key) {
    // 从嵌套的 SOUND_EFFECTS 中查找路径
    for (const category of Object.values(SOUND_EFFECTS)) {
      if (category[key]) return category[key];
    }
    return null;
  }
  
  // 播放音乐序列（用于正确答案）
  playMelody() {
    const notes = [
      { freq: 523.25, delay: 0 },    // C5 (do)
      { freq: 587.33, delay: 150 },  // D5 (re)
      { freq: 659.25, delay: 300 },  // E5 (mi)
      { freq: 783.99, delay: 450 }   // G5 (sol)
    ];
    
    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.freq, 0.2);
      }, note.delay);
    });
  }
  
  playTone(frequency, duration) {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3 * this.volume, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.context.currentTime + duration
    );
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + duration);
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAllAmbient();
    }
  }
  
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
  }
  
  // 背景音乐管理
  currentAmbient = null;
  
  playAmbient(tag) {
    this.stopAllAmbient();
    
    const soundPath = SOUND_EFFECTS.ambient[tag];
    if (!soundPath) return;
    
    this.currentAmbient = new Audio(soundPath);
    this.currentAmbient.loop = true;
    this.currentAmbient.volume = 0.3 * this.volume;
    this.currentAmbient.play();
  }
  
  stopAllAmbient() {
    if (this.currentAmbient) {
      this.currentAmbient.pause();
      this.currentAmbient = null;
    }
  }
}

// 全局实例
const soundManager = new SoundManager();
```

#### 音效触发时机

```javascript
// 示例：游戏中的音效触发

// 1. 魔方转动
cube.addEventListener('rotate', () => {
  soundManager.play('cubeRotate');
});

// 2. 点击汉字
charButton.addEventListener('click', () => {
  soundManager.play('charClick');
});

// 3. 选对一个字
function onCharCorrect(charIndex) {
  // 渐进式音高
  const baseFreq = 523.25; // C5
  const scale = [1, 9/8, 5/4, 4/3, 3/2]; // 五声音阶
  soundManager.playTone(baseFreq * scale[charIndex % 5], 0.15);
}

// 4. 完成诗句
function onPoemComplete() {
  soundManager.play('poemComplete');
  soundManager.playMelody(); // 播放旋律
}

// 5. 选错
function onMistake() {
  soundManager.play('mistake');
}
```

---

## 🎨 UI/UX 设计

### 主界面布局

```
┌─────────────────────────────────────────┐
│  🏮 诗境魔方                    🔊 ⚙️   │  <- 顶部栏
├─────────────────────────────────────────┤
│                                         │
│         [3D 魔方显示区域]                │
│                                         │
│         诗名：《静夜思》                  │
│         作者：李白                       │
│         字数：5字                        │
│                                         │
├─────────────────────────────────────────┤
│  答题区: [床] [前] [明] [ ] [ ]         │  <- 拼音区
├─────────────────────────────────────────┤
│  提示: □ 高亮下一个字  □ 自动旋转        │
├─────────────────────────────────────────┤
│  [清空] [提交答案] [跳过]                │
├─────────────────────────────────────────┤
│  已完成: 15/100  ⭐⭐⭐                  │  <- 进度条
└─────────────────────────────────────────┘
```

### 设置面板

```html
<div id="settingsPanel" class="modal">
  <h3>⚙️ 游戏设置</h3>
  
  <!-- 诗词库选择 -->
  <div class="setting-item">
    <label>📚 诗词库</label>
    <select id="poemLibrarySelect">
      <option value="all">全部诗词</option>
      <!-- 动态生成标签选项 -->
    </select>
  </div>
  
  <!-- 辅助功能 -->
  <div class="setting-item">
    <label>💡 智能提示</label>
    <select id="hintLevel">
      <option value="none">无提示（⭐⭐⭐）</option>
      <option value="highlight">高亮提示（⭐⭐）</option>
      <option value="auto">自动旋转（⭐）</option>
      <option value="show">显示诗句（无星）</option>
    </select>
  </div>
  
  <!-- 音效设置 -->
  <div class="setting-item">
    <label>🔊 音效音量</label>
    <input type="range" id="volumeSlider" min="0" max="100" value="70">
  </div>
  
  <div class="setting-item">
    <label>🎵 背景音乐</label>
    <input type="checkbox" id="ambientToggle" checked>
  </div>
  
  <!-- 数据管理 -->
  <div class="setting-item">
    <h4>📊 数据管理</h4>
    <button id="exportExcel">📥 导出诗词库（Excel）</button>
    <button id="importExcel">📤 导入诗词库（Excel）</button>
    <input type="file" id="excelFile" accept=".xlsx,.xls" hidden>
    <button id="downloadTemplate">📄 下载模板</button>
  </div>
  
  <!-- 进度统计 -->
  <div class="setting-item">
    <h4>📈 游戏统计</h4>
    <p>总完成数: <span id="totalCompleted">0</span></p>
    <p>总用时: <span id="totalTime">0</span> 分钟</p>
    <p>收集卡片: <span id="cardCount">0</span></p>
    <button id="resetProgress">🔄 重置进度</button>
  </div>
</div>
```

### 完成动画流程

```javascript
async function playCompleteAnimation() {
  // 1. 魔方发光
  await animateCubeGlow();
  
  // 2. 魔方展开成卷轴
  await animateCubeToScroll();
  
  // 3. 显示完整诗词
  await showFullPoem();
  
  // 4. 粒子特效（根据主题）
  await playParticleEffect();
  
  // 5. 生成卡片
  const card = await generatePoemCard(currentPoem, gameData);
  
  // 6. 显示卡片获得动画
  await showCardAcquired(card);
  
  // 7. 进入下一题或结束
  showNextRoundButton();
}

// 魔方展开成卷轴动画
async function animateCubeToScroll() {
  return new Promise(resolve => {
    // 使用 GSAP 动画库
    gsap.timeline()
      .to(cubeGroup.rotation, {
        y: Math.PI * 2,
        duration: 1,
        ease: 'power2.inOut'
      })
      .to(cubeGroup.scale, {
        x: 2,
        y: 0.1,
        z: 2,
        duration: 0.8,
        ease: 'back.out(1.7)'
      })
      .to(scrollElement, {
        opacity: 1,
        scaleY: 1,
        duration: 0.5,
        onComplete: resolve
      });
  });
}
```

---

## 🔧 技术实现

### 技术栈

#### 核心库
- **Three.js** (r150+): 3D 渲染引擎
- **GSAP** (3.12+): 动画库
- **XLSX.js** (0.18+): Excel 导入导出
- **jsPDF** (2.5+): PDF 生成
- **QRCode.js**: 二维码生成

#### 可选库
- **Cannon.js**: 物理引擎（如需魔方掉落效果）
- **Howler.js**: 音频管理（替代方案）

### 文件结构

```
cube3d-poetry/
├── index.html                 # 主页面
├── css/
│   ├── main.css              # 主样式
│   ├── modal.css             # 弹窗样式
│   └── cards.css             # 卡片样式
├── js/
│   ├── main.js               # 入口文件
│   ├── cube3d.js             # 3D魔方逻辑
│   ├── game.js               # 游戏逻辑
│   ├── database.js           # 数据库管理
│   ├── theme.js              # 主题系统
│   ├── card.js               # 卡片系统
│   ├── sound.js              # 音效系统
│   └── utils.js              # 工具函数
├── assets/
│   ├── audio/
│   │   ├── ui/              # UI音效
│   │   ├── game/            # 游戏音效
│   │   └── ambient/         # 背景音乐
│   ├── images/
│   │   ├── textures/        # 魔方纹理
│   │   ├── borders/         # 卡片边框
│   │   └── backgrounds/     # 背景图
│   └── fonts/
│       └── chinese/         # 中文字体
└── data/
    ├── builtin-poems.json   # 内置诗词
    └── template.xlsx        # Excel模板
```

### Three.js 魔方实现

#### 基础结构

```javascript
// 初始化 Three.js 场景
class Cube3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.offsetWidth / container.offsetHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    
    this.cubeGroup = new THREE.Group();
    this.pieces = []; // 27个小方块
    
    this.init();
  }
  
  init() {
    // 设置渲染器
    this.renderer.setSize(
      this.container.offsetWidth, 
      this.container.offsetHeight
    );
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    // 设置相机
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);
    
    // 创建魔方
    this.createCube();
    
    // 添加控制器
    this.setupControls();
    
    // 开始渲染循环
    this.animate();
  }
  
  createCube() {
    const size = 0.9; // 每个小方块大小
    const gap = 0.05; // 方块间隙
    
    // 创建 3x3x3 = 27 个小方块
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const geometry = new THREE.BoxGeometry(size, size, size);
          const materials = this.createCubeMaterials();
          const piece = new THREE.Mesh(geometry, materials);
          
          piece.position.set(
            x * (size + gap),
            y * (size + gap),
            z * (size + gap)
          );
          
          piece.userData = { x, y, z };
          this.pieces.push(piece);
          this.cubeGroup.add(piece);
        }
      }
    }
    
    this.scene.add(this.cubeGroup);
  }
  
  createCubeMaterials() {
    // 6个面的材质（可以显示文字）
    const materials = [];
    const colors = [
      0xFF6B6B, // 右 - 红
      0x4ECDC4, // 左 - 青
      0xFFE66D, // 上 - 黄
      0xF0F0F0, // 下 - 白
      0x95E1D3, // 前 - 绿
      0xF38181  // 后 - 粉
    ];
    
    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      // 背景色
      ctx.fillStyle = '#' + colors[i].toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, 256, 256);
      
      // 边框
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 256, 256);
      
      const texture = new THREE.CanvasTexture(canvas);
      materials.push(new THREE.MeshPhongMaterial({ map: texture }));
    }
    
    return materials;
  }
  
  // 在面上绘制文字
  drawTextOnFace(pieceIndex, faceIndex, text, theme) {
    const piece = this.pieces[pieceIndex];
    const material = piece.material[faceIndex];
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // 背景（应用主题）
    ctx.fillStyle = theme.primaryColor;
    ctx.fillRect(0, 0, 256, 256);
    
    // 文字
    ctx.font = `bold 120px ${theme.fontFamily}`;
    ctx.fillStyle = theme.accentColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 128);
    
    // 更新纹理
    material.map = new THREE.CanvasTexture(canvas);
    material.needsUpdate = true;
  }
  
  setupControls() {
    const controls = new THREE.OrbitControls(
      this.camera, 
      this.renderer.domElement
    );
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.minDistance = 3;
    controls.maxDistance = 10;
  }
  
  // 旋转某一层
  rotateLayer(axis, layer, direction) {
    const pieces = this.getPiecesInLayer(axis, layer);
    const angle = direction * Math.PI / 2;
    
    // 创建动画
    gsap.to(pieces.map(p => p.rotation), {
      [axis]: `+=${angle}`,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => {
        // 更新位置数据
        this.updatePiecePositions(pieces, axis);
      }
    });
  }
  
  getPiecesInLayer(axis, layer) {
    return this.pieces.filter(piece => {
      return piece.userData[axis] === layer;
    });
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}
```

#### 文字分配逻辑

```javascript
// 将诗句和干扰字分配到魔方
function assignCharactersToCube(poem, cube, theme) {
  const poemChars = poem.line.split('');
  const distractorChars = generateDistractors(poemChars, 54 - poemChars.length);
  const allChars = [...poemChars, ...distractorChars];
  
  // 打乱
  shuffleArray(allChars);
  
  // 分配到魔方的可见面
  let charIndex = 0;
  cube.pieces.forEach((piece, pieceIndex) => {
    // 只在外表面显示文字
    const visibleFaces = getVisibleFaces(piece.userData);
    
    visibleFaces.forEach(faceIndex => {
      if (charIndex < allChars.length) {
        cube.drawTextOnFace(
          pieceIndex, 
          faceIndex, 
          allChars[charIndex],
          theme
        );
        
        // 记录字符位置
        piece.userData[`face${faceIndex}`] = {
          char: allChars[charIndex],
          isCorrect: poemChars.includes(allChars[charIndex])
        };
        
        charIndex++;
      }
    });
  });
}

// 判断哪些面是可见的
function getVisibleFaces(position) {
  const { x, y, z } = position;
  const faces = [];
  
  if (x === 1) faces.push(0);  // 右
  if (x === -1) faces.push(1); // 左
  if (y === 1) faces.push(2);  // 上
  if (y === -1) faces.push(3); // 下
  if (z === 1) faces.push(4);  // 前
  if (z === -1) faces.push(5); // 后
  
  return faces;
}

// 生成干扰字
function generateDistractors(poemChars, count) {
  const allPoems = getAllPoems();
  const allChars = allPoems
    .map(p => p.line.split(''))
    .flat()
    .filter(c => !poemChars.includes(c));
  
  const unique = [...new Set(allChars)];
  shuffleArray(unique);
  
  return unique.slice(0, count);
}
```

---

## 📱 响应式设计

### 移动端适配

```css
/* 移动端魔方尺寸调整 */
@media (max-width: 768px) {
  #cube-container {
    width: 100%;
    height: 50vh;
  }
  
  .answer-area {
    font-size: 1.5rem;
  }
  
  .cube-text {
    font-size: 2rem;
  }
  
  /* 触摸手势优化 */
  .cube-piece {
    touch-action: none;
  }
}

/* 平板横屏 */
@media (min-width: 768px) and (max-width: 1024px) {
  #cube-container {
    width: 60%;
    height: 60vh;
  }
}

/* 桌面端 */
@media (min-width: 1024px) {
  #cube-container {
    width: 600px;
    height: 600px;
  }
}
```

### 触摸手势支持

```javascript
// 移动端手势控制
class TouchControls {
  constructor(cube) {
    this.cube = cube;
    this.touchStart = { x: 0, y: 0 };
    this.setupTouchEvents();
  }
  
  setupTouchEvents() {
    const canvas = this.cube.renderer.domElement;
    
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    });
    
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - this.touchStart.x;
        const deltaY = e.touches[0].clientY - this.touchStart.y;
        
        // 旋转魔方
        this.cube.cubeGroup.rotation.y += deltaX * 0.01;
        this.cube.cubeGroup.rotation.x += deltaY * 0.01;
        
        this.touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    });
    
    // 双指缩放
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        
        // 调整相机距离
        this.cube.camera.position.z = 5 + (1000 - distance) / 100;
      }
    });
  }
}
```

---

## 🚀 开发路线图

### Phase 1: 核心功能（第1-2周）
- [ ] Three.js 3D魔方基础渲染
- [ ] 魔方旋转控制（鼠标/触摸）
- [ ] 点击选字机制
- [ ] 诗句验证逻辑
- [ ] 基础UI界面

### Phase 2: 数据系统（第3周）
- [ ] 数据库设计（localStorage）
- [ ] Excel 导入导出
- [ ] 诗词库管理界面
- [ ] 进度追踪系统

### Phase 3: 第一阶段功能（第4-5周）
- [ ] 魔方皮肤系统
- [ ] 诗词卡片收集
- [ ] 音效系统
- [ ] 完成动画

### Phase 4: 优化与测试（第6周）
- [ ] 性能优化（减少重绘）
- [ ] 移动端适配测试
- [ ] 音效资源优化
- [ ] 用户体验改进

### Phase 5: 扩展功能（后续）
- [ ] 成就系统
- [ ] 连胜系统
- [ ] 多人模式
- [ ] 季节活动

---

## 📚 参考资源

### Three.js 学习
- [Three.js 官方文档](https://threejs.org/docs/)
- [Three.js 示例](https://threejs.org/examples/)
- [魔方案例](https://github.com/pengfeiw/rubik-cube)

### 诗词资源
- 参考 `shicizuju.html` 的内置诗词库
- [全唐诗数据库](https://github.com/chinese-poetry/chinese-poetry)
- [诗词名句API](https://www.jinrishici.com/)

### 设计灵感
- 中国风配色：宣纸色 #F5E6D3、墨色 #2C2C2C
- 字体：楷体、宋体、仿宋
- 装饰元素：印章、水墨、云纹

---

## 🎯 核心代码片段

### 游戏主循环

```javascript
class PoetryGame {
  constructor() {
    this.cube = new Cube3D(document.getElementById('cube-container'));
    this.database = new PoemDatabase();
    this.soundManager = new SoundManager();
    this.currentPoem = null;
    this.selectedChars = [];
    this.gameState = 'idle'; // idle, playing, completed
  }
  
  async startGame(tag) {
    // 1. 选择诗句
    this.currentPoem = this.database.selectNextPoem(tag);
    if (!this.currentPoem) {
      alert('该诗词库暂无诗句');
      return;
    }
    
    // 2. 应用主题
    const theme = applyTheme(tag);
    
    // 3. 分配字符到魔方
    assignCharactersToCube(this.currentPoem, this.cube, theme);
    
    // 4. 显示提示
    this.showHint();
    
    // 5. 开始计时
    this.startTime = Date.now();
    this.gameState = 'playing';
    
    // 6. 播放背景音乐
    this.soundManager.playAmbient(tag);
  }
  
  onCharClick(char, position) {
    if (this.gameState !== 'playing') return;
    
    // 播放点击音效
    this.soundManager.play('charClick');
    
    // 添加到已选字符
    this.selectedChars.push(char);
    
    // 更新答题区
    this.updateAnswerArea();
    
    // 检查是否完成
    if (this.selectedChars.length === this.currentPoem.line.length) {
      this.checkAnswer();
    }
  }
  
  checkAnswer() {
    const answer = this.selectedChars.join('');
    const correct = answer === this.currentPoem.line;
    
    if (correct) {
      this.onCorrect();
    } else {
      this.onWrong();
    }
  }
  
  async onCorrect() {
    this.gameState = 'completed';
    
    // 播放正确音效
    this.soundManager.play('poemComplete');
    this.soundManager.playMelody();
    
    // 计算用时
    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
    
    // 保存进度
    this.database.markPoemCompleted(this.currentPoem, timeSpent);
    
    // 生成卡片
    const card = await generatePoemCard(this.currentPoem, {
      completedAt: Date.now(),
      timeSpent,
      mistakes: this.mistakes,
      stars: this.calculateStars(timeSpent, this.mistakes)
    });
    
    // 播放完成动画
    await playCompleteAnimation();
    
    // 显示卡片
    showCardAcquired(card);
    
    // 显示下一题按钮
    this.showNextButton();
  }
  
  onWrong() {
    // 播放错误音效
    this.soundManager.play('mistake');
    
    // 清空选择
    this.selectedChars = [];
    this.updateAnswerArea();
    
    // 错误计数
    this.mistakes = (this.mistakes || 0) + 1;
  }
  
  calculateStars(timeSpent, mistakes) {
    if (mistakes === 0 && timeSpent < 30) return 3;
    if (mistakes <= 2 && timeSpent < 60) return 2;
    return 1;
  }
}
```

---

## 📝 备注

### 开发优先级
1. ✅ 先实现核心玩法（魔方+选字+验证）
2. ✅ 再完善数据管理（导入导出）
3. ✅ 最后添加视觉/音效增强

### 性能优化建议
- 使用 `requestAnimationFrame` 控制渲染
- 减少 DOM 操作，使用虚拟滚动
- 音效预加载，避免卡顿
- 纹理使用合适分辨率（512x512足够）

### 浏览器兼容性
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+
- 移动端：iOS 14+, Android 8+

---

## 🔗 相关文件

- Excel 导入导出参考：`shicizuju.html` (1607-1663行)
- 数据结构参考：`shicizuju.html` (1565-1596行)
- 音效系统参考：`shicizuju.html` (1667-1800行)

---

**文档版本**: v1.0  
**最后更新**: 2025-10-01  
**作者**: 南风教育科技

