// =====================================
// 太虛幻境應用切換器組件
// 可在每個應用頁面中引入，提供統一的導航
// =====================================

(function() {
    'use strict';
    
    // 境地配置
    const realms = [
        {
            id: 'hanmo',
            name: '翰墨齋',
            subtitle: '現代中文體驗',
            icon: '📝',
            accentColor: 'border-l-blue-500',
            titleColor: 'text-blue-600 dark:text-blue-400'
        },
        {
            id: 'qiangu',
            name: '千古堂',
            subtitle: '古代經典體驗',
            icon: '🏛️',
            accentColor: 'border-l-amber-500',
            titleColor: 'text-amber-700 dark:text-amber-400'
        },
        {
            id: 'jinxiu',
            name: '錦繡坊',
            subtitle: '中華文化體驗',
            icon: '🎨',
            accentColor: 'border-l-rose-500',
            titleColor: 'text-rose-700 dark:text-rose-400'
        },
        {
            id: 'yunwai',
            name: '雲外樓',
            subtitle: '實驗與跨界體驗',
            icon: '☁️',
            accentColor: 'border-l-cyan-500',
            titleColor: 'text-cyan-700 dark:text-cyan-400'
        }
    ];

    // 应用数据
    const apps = [
        // 翰墨齋 - 現代中文體驗
        {
            id: 'diandianmobao',
            category: 'hanmo',
            name: '漢字樹：漢字學習',
            icon: 'fas fa-paint-brush',
            gradient: 'from-red-500 to-orange-500',
            url: '/diandianmobao.html',
            description: '通過筆順練習、記憶挑戰和部首組字等多元化遊戲，系統性學習漢字書寫與結構'
        },
        {
            id: 'cilong',
            category: 'hanmo',
            name: '貪吃龍',
            icon: '🐉',
            gradient: 'from-lime-400 to-green-500',
            url: '/cilong.html',
            description: '在經典的貪吃蛇玩法中，操控呆萌龍寶收集漢字，組成詞語，挑戰你的詞彙量和反應速度。'
        },
        {
            id: 'story-vocab',
            category: 'hanmo',
            name: '故事詞彙接龍',
            icon: 'fas fa-book-reader',
            gradient: 'from-purple-500 to-pink-400',
            url: '/story-vocab/index.html',
            description: '與AI共創精彩故事，輕鬆積累詞彙！選擇詞語造句，AI接力續寫，在互動故事中學習繁體中文詞彙，適合2-6年級學生',
            isNew: true
        },
        {
            id: 'leiyu',
            category: 'hanmo',
            name: '《雷雨》閃電',
            icon: 'fas fa-cloud-rain',
            gradient: 'from-blue-500 to-cyan-500',
            url: '/leiyushandian.html',
            description: '扮演曹禺《雷雨》中的經典角色躲避命運閃電，在街機遊戲中體驗家庭悲劇的文學深度'
        },
        
        // 千古堂 - 古代經典體驗
        {
            id: 'wanwuxiaoyao',
            category: 'qiangu',
            name: '萬物逍遙',
            icon: 'fas fa-leaf',
            gradient: 'from-amber-400 to-yellow-300',
            url: '/wanwuxiaoyao.html',
            description: '深度體驗莊子哲學的物化之道，從莊周夢蝶到渾沌復生，在七個哲學章節中領悟逍遙境界',
            isFeatured: true
        },
        {
            id: 'changganxinglv',
            category: 'qiangu',
            name: '長干行旅',
            icon: 'fas fa-ship',
            gradient: 'from-indigo-500 to-violet-500',
            url: '/changganxinglv.html',
            description: '體驗李白《長干行》中商人與少婦的愛情故事，在角色扮演中感受古典詩歌的浪漫與深情'
        },
        {
            id: 'shiguangpintu',
            category: 'qiangu',
            name: '《長干行》時光拼圖',
            icon: 'fas fa-hourglass-half',
            gradient: 'from-gray-600 to-gray-800',
            url: '/changganxingshiguang.html',
            description: '拖動李白《長干行》的詩句卡片，按時間順序重新排列，體驗詩中女子從童年到成年的情感時光'
        },
        {
            id: 'changhenge',
            category: 'qiangu',
            name: '《長恨歌》記憶卡牌',
            icon: 'fas fa-memory',
            gradient: 'from-yellow-500 to-amber-500',
            url: '/changhengejiyi.html',
            description: '翻開卡牌配對白居易《長恨歌》的詩句與釋義，在記憶遊戲中探索唐明皇與楊貴妃的愛情悲歌'
        },
        {
            id: 'nanfengtianci',
            category: 'qiangu',
            name: '南風填詞',
            icon: 'fas fa-pencil-alt',
            gradient: 'from-teal-500 to-green-400',
            url: '/nanfengtianci.html',
            description: '體驗古典填詞藝術，在平仄韻律中創作屬於你的詞章，還有背誦挑戰等你來闖關'
        },
        {
            id: 'nanfengzuoshi',
            category: 'qiangu',
            name: '南風作詩',
            icon: 'fas fa-feather-alt',
            gradient: 'from-indigo-400 to-blue-500',
            url: '/nanfengzuoshi.html',
            description: '基於欽定詞譜的古典填詞工具，用傳統格律創作你的詞章，還能生成精美的古風壁紙'
        },
        {
            id: 'shicizuju',
            category: 'qiangu',
            name: '詩詞組句遊戲',
            icon: 'fas fa-puzzle-piece',
            gradient: 'from-green-500 to-emerald-500',
            url: '/shicizuju.html'
        },
        {
            id: 'yimoji',
            category: 'qiangu',
            name: '意moji：詩詞意象配對',
            icon: 'fas fa-icons',
            gradient: 'from-violet-500 to-purple-400',
            url: '/yimoji.html',
            description: '尋找三個與詩詞意象最相關的emoji進行配對'
        },
        {
            id: 'cikeyishou',
            category: 'qiangu',
            name: '刺客之道 1.0',
            icon: 'fas fa-user-ninja',
            gradient: 'from-pink-400 to-rose-300',
            url: '/cikezhidao.html',
            description: '扮演《史記·刺客列傳》中的五位古代刺客，在生死抉擇中體驗千秋義勇與歷史風雲'
        },
        {
            id: 'yuexiaduzuo',
            category: 'qiangu',
            name: '月下獨酌',
            icon: 'fas fa-moon',
            gradient: 'from-slate-600 to-indigo-400',
            url: '/yuexiaduzhuo.html',
            description: '加入「月下雅集」群聊，與李白、杜甫、嫦娥等古代詩人在微信群中暢談詩酒風流'
        },
        {
            id: 'honglourenwu',
            category: 'qiangu',
            name: '《紅樓夢》人物圖譜',
            icon: 'fa-solid fa-sitemap',
            gradient: 'from-purple-500 to-pink-500',
            url: '/honglourenwu.html',
            description: '基於 d3.js 的《紅樓夢》人物關係互動圖，幫助學生快速理解四大家族與主要角色關係。'
        },
        {
            id: 'shuyuanclassicchat',
            category: 'qiangu',
            name: '太虛幻聊',
            icon: 'fas fa-comments',
            gradient: 'from-emerald-600 to-teal-500',
            url: '/shuyuan-classic-chat.html',
            description: '與經典人物的奇妙對話！與詩人們吟詩作對，和史家探討古今，與哲人思辨人生，還能和神話人物暢聊奇事。在微信風格的聊天界面中，親近中華經典，激發學習興趣'
        },

        // 錦繡坊 - 中華文化體驗
        {
            id: 'mishijiangchun',
            category: 'jinxiu',
            name: '迷失江南春',
            icon: 'fas fa-tree',
            gradient: 'from-emerald-500 to-lime-400',
            url: '/mishijiangnanchun.html',
            description: '穿越蘇杭文化之旅，與古代人物對話收集線索，找出隱藏在不同場景中的時空迷失者'
        },
        {
            id: 'jiangluohua',
            category: 'jinxiu',
            name: '江南落花',
            icon: 'fas fa-spa',
            gradient: 'from-pink-400 to-rose-300',
            url: '/jiangnanluohua.html',
            description: '駕駛小船躲避紛飛花朵，收集特殊道具並挑戰知識問答，在街機遊戲中探索江南文化之美'
        },
        {
            id: 'yinzhangsheji',
            category: 'jinxiu',
            name: '印章設計',
            icon: 'fas fa-stamp',
            gradient: 'from-red-600 to-rose-500',
            url: '/sealdesgin.html',
            description: '專業的中式印章設計工具，支援陰刻陽刻、多種古典字體選擇，可自由調整文字位置大小，並提供繪圖功能個性化創作'
        },

        // 雲外樓 - 實驗與跨界體驗
        {
            id: 'shenmisuzihe',
            category: 'yunwai',
            name: '神秘數字盒',
            icon: 'fas fa-box-open',
            gradient: 'from-yellow-400 to-orange-400',
            url: '/caishuzi.html',
            description: '從 1 到 100 的神秘盒子猜數字，依提示與範圍指示推理，累積分數並解鎖徽章'
        },
        {
            id: 'shuangshe',
            category: 'yunwai',
            name: '雙蛇大戰',
            icon: '🐍',
            gradient: 'from-emerald-600 to-teal-500',
            url: '/2snakes.html',
            description: '史上最刺激的雙人蛇類對戰遊戲！兩條蛇在同一戰場展開生死較量，使用特殊道具和策略技巧擊敗對手，支援WASD+方向鍵雙人即時對戰'
        },
        {
            id: 'wanwuxiaoyaoenglish',
            category: 'yunwai',
            name: 'All Things Wander Free',
            icon: 'fas fa-globe',
            gradient: 'from-blue-400 to-indigo-300',
            url: '/wanwuxiaoyaoenglish.html',
            description: 'English version of the Zhuangzi philosophy experience - explore the transformation of things from Zhuang Zhou\'s butterfly dream to the rebirth of chaos in seven philosophical chapters'
        }
    ];
    
    // 檢測是否是移動設備
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // 創建樣式
    function createSwitcherStyles() {
        return `
            <style id="taixu-switcher-styles">
                /* 悬浮logo样式 */
                #taixuFloatingLogo {
                    position: fixed !important;
                    right: 16px !important;
                    top: 50% !important;
                    margin-top: -24px !important;
                    z-index: 999999;
                    transition: all 0.3s ease;
                    pointer-events: auto;
                    cursor: pointer;
                    user-select: none;
                }
                
                #taixuFloatingLogo > div {
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    transition: all 0.3s ease;
                    opacity: 0.6;
                    transform: scale(0.9);
                    transform-origin: center;
                }
                
                #taixuFloatingLogo:hover > div {
                    opacity: 1;
                    transform: scale(1);
                }
                
                #taixuFloatingLogo:active > div {
                    transform: scale(0.95);
                }
                
                /* 移动端优化 */
                @media (max-width: 768px) {
                    #taixuFloatingLogo > div {
                        padding: 6px !important;
                    }
                    
                    #taixuFloatingLogo img {
                        width: 24px !important;
                        height: 24px !important;
                    }
                    
                    #taixuFloatingLogo:hover > div {
                        opacity: 0.6;
                        transform: scale(0.9);
                    }
                }
                
                @media (max-width: 480px) {
                    #taixuFloatingLogo {
                        right: 8px !important;
                        top: 50% !important;
                        margin-top: -20px !important;
                    }
                    
                    #taixuFloatingLogo > div {
                        padding: 4px !important;
                    }
                    
                    #taixuFloatingLogo img {
                        width: 20px !important;
                        height: 20px !important;
                    }
                }
                
                /* 应用切换器模态框 */
                #taixuAppSwitcherModal {
                    position: fixed;
                    inset: 0;
                    z-index: 999998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    padding-top: 64px;
                    padding-bottom: 64px;
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.3s ease-out;
                }
                
                #taixuAppSwitcherModal.taixu-switcher-show {
                    opacity: 1;
                    pointer-events: auto;
                }
                
                #taixuAppSwitcherModal > .taixu-backdrop {
                    position: absolute;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    transition: opacity 0.3s;
                }
                
                #taixuSwitcherContainer {
                    position: relative;
                    background: white;
                    border-radius: 16px;
                    max-width: 1280px;
                    width: 100%;
                    max-height: 100%;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    transform: scale(0.95);
                    transition: all 0.3s ease-out;
                    display: flex;
                    flex-direction: column;
                }
                
                #taixuAppSwitcherModal.taixu-switcher-show #taixuSwitcherContainer {
                    transform: scale(1);
                }
                
                /* 暗黑模式 */
                @media (prefers-color-scheme: dark) {
                    #taixuSwitcherContainer {
                        background: #1f2937;
                    }
                }
                
                /* 滚动区域 */
                .taixu-switcher-content {
                    max-height: calc(85vh - 140px);
                    overflow-y: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                
                .taixu-switcher-content::-webkit-scrollbar {
                    display: none;
                }
                
                /* 移动端优化 */
                @media (max-width: 768px) {
                    #taixuAppSwitcherModal {
                        padding: 8px !important;
                        padding-top: 8px !important;
                        padding-bottom: 8px !important;
                    }
                    
                    #taixuSwitcherContainer {
                        max-height: calc(100vh - 16px) !important;
                        max-height: calc(100dvh - 16px) !important;
                    }
                }
                
                /* 应用图标样式 */
                .taixu-switcher-app-icon {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    position: relative;
                }
                
                .taixu-switcher-app-icon:hover {
                    transform: translateY(-2px) scale(1.05);
                }
                
                .taixu-switcher-app-icon:active {
                    transform: translateY(0) scale(0.98);
                }
                
                .taixu-switcher-app-icon .icon-container {
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .taixu-switcher-app-icon:hover .icon-container {
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }
                
                .taixu-switcher-app-icon .icon-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                    transition: left 0.5s ease;
                }
                
                .taixu-switcher-app-icon:hover .icon-container::before {
                    left: 100%;
                }
                
                /* 应用名称样式 */
                .taixu-switcher-app-name {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: 1.2;
                    height: 2.4em;
                    font-size: 11px;
                    font-weight: 500;
                    color: #374151;
                    transition: color 0.2s ease;
                }
                
                @media (prefers-color-scheme: dark) {
                    .taixu-switcher-app-name {
                        color: #d1d5db;
                    }
                }
                
                .taixu-switcher-app-icon:hover .taixu-switcher-app-name {
                    color: #5D5CDE;
                }
                
                @media (prefers-color-scheme: dark) {
                    .taixu-switcher-app-icon:hover .taixu-switcher-app-name {
                        color: #818cf8;
                    }
                }
            </style>
        `;
    }
    
    // 創建浮動 Logo HTML
    function createFloatingLogoHTML() {
        return `
            <div id="taixuFloatingLogo" 
                 tabindex="0" 
                 role="button" 
                 aria-label="打開應用切換器">
                <div style="background: rgba(0, 0, 0, 0.2); backdrop-filter: blur(8px); border-radius: 9999px; padding: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.3);">
                    <img src="/images/cclogo.png" 
                         alt="書院中文經典" 
                         style="height: 32px; width: 32px; object-fit: contain; cursor: pointer;">
                </div>
            </div>
        `;
    }
    
    // 創建切換器模態框 HTML
    function createSwitcherModalHTML() {
        return `
            <div id="taixuAppSwitcherModal">
                <div class="taixu-backdrop"></div>
                <div id="taixuSwitcherContainer">
                    <!-- 关闭按钮 -->
                    <button id="taixuCloseSwitcherBtn" 
                            style="position: absolute; top: 12px; right: 12px; z-index: 10; width: 32px; height: 32px; border-radius: 9999px; background: rgba(0, 0, 0, 0.3); color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(4px);">
                        <i class="fas fa-times" style="font-size: 14px;"></i>
                    </button>
                    
                    <!-- 标题区域 -->
                    <div style="padding: 16px 20px 12px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                            <!-- 返回主页按钮 -->
                            <button onclick="window.location.href='/index.html'" 
                                    style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #f3f4f6; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151; transition: all 0.2s;">
                                <i class="fas fa-home" style="font-size: 16px;"></i>
                                <span>返回主頁</span>
                            </button>
                            
                            <!-- 中间标题 -->
                            <div style="display: flex; align-items: center; gap: 10px; flex: 1; justify-content: center;">
                                <img src="/images/cclogo.png" 
                                     alt="書院中文經典" 
                                     style="height: 32px; width: 32px; object-fit: contain;">
                                <h2 style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 0;">太虛幻境：書院中文經典數字體驗學習</h2>
                            </div>
                            
                            <!-- 右侧占位 -->
                            <div style="width: 96px;"></div>
                        </div>
                    </div>
                    
                    <!-- 应用网格区域 -->
                    <div style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;">
                        <div id="taixuSwitcherAppGrid" 
                             style="padding: 12px 12px 24px; display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px;">
                            <!-- 应用图标将通过 JavaScript 动态生成 -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 渲染切换器应用图标
    function renderSwitcherAppIcon(app) {
        const isFaIcon = typeof app.icon === 'string' && (app.icon.startsWith('fas ') || app.icon.includes('fa-'));
        const iconHtml = isFaIcon
            ? `<i class="${app.icon}" style="color: white; font-size: 14px;"></i>`
            : `<span style="font-size: 14px; color: white;">${app.icon}</span>`;

        return `
            <div class="taixu-switcher-app-icon" 
                 data-app-id="${app.id}" 
                 onclick="window.taixuNavigateToApp('${app.id}')"
                 style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 100%; height: 100%; min-height: 0;">
                <div class="icon-container" 
                     style="background: linear-gradient(to bottom right, var(--tw-gradient-stops)); --tw-gradient-from: ${app.gradient.split(' ')[0].replace('from-', '')}; --tw-gradient-to: ${app.gradient.split(' ')[2].replace('to-', '')}; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); border-radius: 6px; padding: 6px; width: 40px; height: 40px; min-width: 40px; min-height: 40px; max-width: 40px; max-height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); margin-bottom: 4px;">
                    ${iconHtml}
                </div>
                <p class="taixu-switcher-app-name" 
                   style="text-align: center; font-size: 9px; line-height: 1.2; width: 100%; padding: 0 2px; flex-shrink: 0;">${app.name}</p>
            </div>
        `;
    }
    
    // 渲染应用网格
    function renderAppGrid() {
        const grid = document.getElementById('taixuSwitcherAppGrid');
        if (!grid) return;
        
        grid.innerHTML = apps.map(app => renderSwitcherAppIcon(app)).join('');
    }
    
    // 显示切换器
    function showAppSwitcher() {
        const modal = document.getElementById('taixuAppSwitcherModal');
        if (!modal) return;
        
        modal.classList.add('taixu-switcher-show');
        
        requestAnimationFrame(() => {
            document.body.style.overflow = 'hidden';
            if (isMobile()) {
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
            }
        });
    }
    
    // 隐藏切换器
    function hideAppSwitcher() {
        const modal = document.getElementById('taixuAppSwitcherModal');
        if (!modal) return;
        
        modal.classList.remove('taixu-switcher-show');
        
        requestAnimationFrame(() => {
            document.body.style.overflow = '';
            if (isMobile()) {
                document.body.style.position = '';
                document.body.style.width = '';
            }
        });
    }
    
    // 导航到应用
    function navigateToApp(appId) {
        const app = apps.find(a => a.id === appId);
        if (!app) return;
        
        // 直接跳转（不再区分 openInNewTab，因为已经不在 iframe 中）
        window.location.href = app.url;
    }
    
    // 绑定事件
    function bindEvents() {
        // 浮动 Logo 点击
        const logo = document.getElementById('taixuFloatingLogo');
        if (logo) {
            logo.onclick = showAppSwitcher;
            logo.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showAppSwitcher();
                }
            });
        }
        
        // 关闭按钮
        const closeBtn = document.getElementById('taixuCloseSwitcherBtn');
        if (closeBtn) {
            closeBtn.onclick = hideAppSwitcher;
        }
        
        // 点击背景关闭
        const modal = document.getElementById('taixuAppSwitcherModal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal || e.target.classList.contains('taixu-backdrop')) {
                    hideAppSwitcher();
                }
            };
        }
        
        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('taixuAppSwitcherModal');
                if (modal && modal.classList.contains('taixu-switcher-show')) {
                    hideAppSwitcher();
                }
            }
        });
    }
    
    // 初始化切换器
    function initAppSwitcher() {
        // 插入样式
        if (!document.getElementById('taixu-switcher-styles')) {
            document.head.insertAdjacentHTML('beforeend', createSwitcherStyles());
        }
        
        // 插入浮动 Logo
        if (!document.getElementById('taixuFloatingLogo')) {
            document.body.insertAdjacentHTML('beforeend', createFloatingLogoHTML());
        }
        
        // 插入切换器模态框
        if (!document.getElementById('taixuAppSwitcherModal')) {
            document.body.insertAdjacentHTML('beforeend', createSwitcherModalHTML());
        }
        
        // 绑定事件
        bindEvents();
        
        // 渲染应用网格
        renderAppGrid();
        
        console.log('✅ 太虛幻境應用切換器已初始化');
    }
    
    // 导出全局函数
    window.initAppSwitcher = initAppSwitcher;
    window.showFloatingAppSwitcher = showAppSwitcher;
    window.taixuNavigateToApp = navigateToApp;
    
    // 如果页面已加载完成，自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAppSwitcher);
    } else {
        // 延迟一点，确保页面其他资源已加载
        setTimeout(initAppSwitcher, 100);
    }
})();

