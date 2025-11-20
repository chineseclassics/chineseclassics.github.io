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
            icon: '',
            accentColor: 'border-l-blue-500',
            titleColor: 'text-blue-600 dark:text-blue-400'
        },
        {
            id: 'qiangu',
            name: '千古堂',
            subtitle: '古代經典體驗',
            icon: '',
            accentColor: 'border-l-amber-500',
            titleColor: 'text-amber-700 dark:text-amber-400'
        },
        {
            id: 'jinxiu',
            name: '錦繡坊',
            subtitle: '中華文化體驗',
            icon: '',
            accentColor: 'border-l-rose-500',
            titleColor: 'text-rose-700 dark:text-rose-400'
        },
        {
            id: 'yunwai',
            name: '雲外樓',
            subtitle: '實驗與跨界體驗',
            icon: '',
            accentColor: 'border-l-cyan-500',
            titleColor: 'text-cyan-700 dark:text-cyan-400'
        }
    ];

    // 应用数据
    const apps = [
        // 翰墨齋 - 現代中文體驗
        {
            id: 'hanzishu',
            category: 'hanmo',
            name: '漢字樹：漢字學習',
            icon: 'fas fa-paint-brush',
            gradient: 'from-red-500 to-orange-500',
            url: '/hanzishu/',
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
            id: 'pinyinpaopao',
            category: 'hanmo',
            name: '拼音泡泡樂',
            icon: 'fas fa-headphones',
            gradient: 'from-pink-400 to-purple-500',
            url: '/pinyinpaopao.html',
            description: '跟著語音提示點擊飄浮的拼音泡泡！支援聲母、韻母和混合模式，在彩虹泡泡中輕鬆學習漢語拼音'
        },
        {
            id: 'story-vocab',
            category: 'hanmo',
            name: '詞遊記',
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
        {
            id: 'shiwen-baojian',
            category: 'hanmo',
            name: '時文寶鑑',
            icon: 'fas fa-pen-fancy',
            gradient: 'from-indigo-500 to-blue-600',
            url: '/shiwen-baojian/index.html',
            description: 'AI 論文寫作指導系統，提供段落級即時反饋，幫助學生掌握學術論文格式與寫作技巧',
            isNew: true
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
            id: 'kongshan',
            category: 'qiangu',
            name: '空山',
            icon: 'fas fa-mountain-sun',
            gradient: 'from-emerald-600 to-green-400',
            url: '/kongshan/index.html',
            description: '以聲音與色彩編織詩歌意境，錄音混音、自訂背景共創聲色兼備的古典體驗',
            isNew: true
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
            id: 'yinniang',
            category: 'qiangu',
            name: '聶隱娘傳奇',
            icon: 'fas fa-feather',
            iconImage: '/assets/images/optimized/icon-yinniang.svg',
            gradient: 'from-rose-500 to-amber-400',
            url: '/yinniang/index.html',
            description: '以思想內閣與八德一智雙系統體驗聶隱娘的一生，在互動式故事中做出品格抉擇並累積文言詞彙',
            isNew: true
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
            id: 'honglou-jiumeng',
            category: 'qiangu',
            name: '紅樓舊夢',
            icon: 'fas fa-fan',
            gradient: 'from-rose-400 to-purple-500',
            url: '/honglou-jiumeng/index.html',
            description: '化身神瑛侍者，在節氣輪迴中收集絳珠、重建大觀園，喚醒花魂與鳥靈完成還淚之旅。',
            isNew: true
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
            id: 'pacman-earth',
            category: 'yunwai',
            name: '地球吃豆人 3D',
            icon: 'fas fa-globe-asia',
            gradient: 'from-blue-500 to-green-400',
            url: '/pacman-earth/index.html',
            description: '在3D地球表面暢玩的吃豆人遊戲！控制角色環繞地球移動，收集豆子並躲避障礙，體驗全新的球面操作樂趣',
            isNew: true
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
        },
        {
            id: 'yijingzhanbu',
            category: 'yunwai',
            name: '易卜',
            icon: 'fas fa-yin-yang',
            gradient: 'from-amber-500 to-orange-500',
            url: '/yijingzhanbu.html',
            description: '空空道人的卜卦攤，通過三枚硬幣擲卦，體驗易經占卜的智慧，獲得AI解讀的卦象指引'
        },
    ];
    
    let desiredFloatingVisibility = typeof window.__taixuDesiredVisibility === 'boolean'
        ? window.__taixuDesiredVisibility
        : true;
    
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
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.3s ease, opacity 0.3s ease;
                    transform-origin: center;
                }
                
                #taixuFloatingLogo img {
                    display: block;
                    transition: transform 0.3s ease, opacity 0.3s ease;
                }
                
                #taixuFloatingLogo:hover img {
                    transform: scale(1.08);
                }
                
                #taixuFloatingLogo:active img {
                    transform: scale(0.95);
                }
                
                /* 移动端优化 */
                @media (max-width: 768px) {
                    #taixuFloatingLogo img {
                        width: 24px !important;
                        height: 24px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    #taixuFloatingLogo {
                        right: 8px !important;
                        top: 50% !important;
                        margin-top: -20px !important;
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
                    border-radius: 20px;
                    max-width: 900px;
                    width: 100%;
                    max-height: 85vh;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    transform: scale(0.95);
                    transition: all 0.3s ease-out;
                    display: flex;
                    flex-direction: column;
                }
                
                #taixuAppSwitcherModal.taixu-switcher-show #taixuSwitcherContainer {
                    transform: scale(1);
                }
                
                /* 返回按钮悬停效果 */
                #taixuSwitcherContainer button[onclick*="index.html"]:hover {
                    background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
                }
                
                #taixuSwitcherContainer button[onclick*="index.html"]:active {
                    transform: translateY(0);
                }
                
                /* 关闭按钮悬停效果 */
                #taixuCloseSwitcherBtn:hover {
                    background: linear-gradient(135deg, rgba(118, 75, 162, 1) 0%, rgba(102, 126, 234, 1) 100%);
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                
                #taixuCloseSwitcherBtn:active {
                    transform: scale(0.95);
                }
                
                /* 暗黑模式 */
                @media (prefers-color-scheme: dark) {
                    #taixuSwitcherContainer {
                        background: #1f2937;
                    }
                    
                    #taixuSwitcherContainer > div:first-of-type {
                        border-bottom-color: #374151;
                    }
                    
                    #taixuSwitcherContainer h2 {
                        background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
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
                        padding: 4px !important;
                    }
                    
                    #taixuSwitcherContainer {
                        max-height: calc(100vh - 8px) !important;
                        max-height: calc(100dvh - 8px) !important;
                        border-radius: 12px;
                    }
                    
                    /* 移动端标题区域更紧凑 */
                    #taixuSwitcherContainer > div:first-of-type {
                        padding: 8px 10px !important;
                    }
                    
                    /* 移动端返回按钮紧凑化 */
                    #taixuSwitcherContainer button[onclick*="index.html"] {
                        padding: 6px 10px !important;
                        font-size: 13px !important;
                        gap: 4px !important;
                    }
                    
                    #taixuSwitcherContainer button[onclick*="index.html"] i {
                        font-size: 13px !important;
                    }
                    
                    #taixuSwitcherContainer button[onclick*="index.html"] span {
                        display: none; /* 移动端隐藏"返回主頁"文字 */
                    }
                    
                    /* 移动端标题文字缩小 */
                    #taixuSwitcherContainer h2 {
                        font-size: 16px !important;
                        letter-spacing: 1px !important;
                    }
                    
                    /* 移动端 logo 缩小 */
                    #taixuSwitcherContainer img[alt="太虛幻境"] {
                        height: 24px !important;
                        width: 24px !important;
                    }
                    
                    /* 移动端关闭按钮调整 */
                    #taixuCloseSwitcherBtn {
                        width: 28px !important;
                        height: 28px !important;
                        top: 6px !important;
                        right: 6px !important;
                    }
                    
                    /* 移动端应用网格紧凑化 */
                    #taixuSwitcherAppGrid {
                        padding: 8px !important;
                        gap: 6px !important;
                        grid-template-columns: repeat(4, 1fr) !important;
                    }
                    
                    /* 移动端应用图标优化 */
                    .taixu-switcher-app-icon {
                        padding: 6px 2px !important;
                    }
                    
                    .taixu-switcher-app-icon .icon-container {
                        width: 42px !important;
                        height: 42px !important;
                        min-width: 42px !important;
                        min-height: 42px !important;
                        max-width: 42px !important;
                        max-height: 42px !important;
                        padding: 8px !important;
                        margin-bottom: 4px !important;
                    }
                    
                    .taixu-switcher-app-icon i,
                    .taixu-switcher-app-icon > div > span {
                        font-size: 16px !important;
                    }
                    
                    .taixu-switcher-app-name {
                        font-size: 9px !important;
                        line-height: 1.2 !important;
                    }
                }
                
                /* 应用图标样式 */
                .taixu-switcher-app-icon {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    position: relative;
                }
                
                .taixu-switcher-app-icon:hover {
                    transform: translateY(-3px);
                    background: rgba(102, 126, 234, 0.05);
                }
                
                .taixu-switcher-app-icon:active {
                    transform: translateY(0);
                }
                
                @media (prefers-color-scheme: dark) {
                    .taixu-switcher-app-icon:hover {
                        background: rgba(102, 126, 234, 0.15);
                    }
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
                <div>
                    <img src="/assets/images/optimized/cclogo-64.png" 
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
                            style="position: absolute; top: 10px; right: 10px; z-index: 10; width: 36px; height: 36px; border-radius: 9999px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%); color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(8px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                        <i class="fas fa-times" style="font-size: 16px;"></i>
                    </button>
                    
                    <!-- 标题区域 -->
                    <div style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                            <!-- 返回主页按钮 -->
                            <button onclick="window.location.href='/index.html'" 
                                    style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 10px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: white; transition: all 0.2s; box-shadow: 0 2px 8px rgba(240, 147, 251, 0.3);">
                                <i class="fas fa-home" style="font-size: 14px;"></i>
                                <span>返回主頁</span>
                            </button>
                            
                            <!-- 中间标题 -->
                            <div style="display: flex; align-items: center; gap: 10px; flex: 1; justify-content: center;">
                                <img src="/assets/images/optimized/cclogo-64.png" 
                                     alt="太虛幻境" 
                                     style="height: 28px; width: 28px; object-fit: contain;">
                                <h2 style="font-size: 20px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; letter-spacing: 2px;">太虛幻境</h2>
                            </div>
                            
                            <!-- 右侧占位 -->
                            <div style="width: 90px;"></div>
                        </div>
                    </div>
                    
                    <!-- 应用网格区域 -->
                    <div style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0;">
                        <div id="taixuSwitcherAppGrid" 
                             style="padding: 16px; display: grid; grid-template-columns: repeat(8, 1fr); gap: 12px;">
                            <!-- 应用图标将通过 JavaScript 动态生成 -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Tailwind 颜色映射表
    const tailwindColors = {
        'red-500': '#ef4444',
        'red-600': '#dc2626',
        'orange-500': '#f97316',
        'orange-400': '#fb923c',
        'yellow-300': '#fde047',
        'yellow-400': '#facc15',
        'yellow-500': '#eab308',
        'lime-400': '#a3e635',
        'green-400': '#4ade80',
        'green-500': '#22c55e',
        'emerald-500': '#10b981',
        'emerald-600': '#059669',
        'teal-500': '#14b8a6',
        'cyan-500': '#06b6d4',
        'blue-400': '#60a5fa',
        'blue-500': '#3b82f6',
        'indigo-300': '#a5b4fc',
        'indigo-400': '#818cf8',
        'indigo-500': '#6366f1',
        'violet-500': '#8b5cf6',
        'purple-400': '#c084fc',
        'purple-500': '#a855f7',
        'pink-400': '#f472b6',
        'pink-500': '#ec4899',
        'rose-300': '#fda4af',
        'rose-500': '#f43f5e',
        'amber-400': '#fbbf24',
        'amber-500': '#f59e0b',
        'amber-700': '#b45309',
        'slate-600': '#475569',
        'gray-600': '#4b5563',
        'gray-800': '#1f2937'
    };
    
    // 将 Tailwind gradient 类转换为 CSS gradient
    function convertGradient(gradientClass) {
        // 如果没有 gradient，返回默认值
        if (!gradientClass || typeof gradientClass !== 'string') {
            return 'linear-gradient(to bottom right, #667eea, #764ba2)';
        }
        
        // 解析 "from-red-500 to-orange-500" 格式
        const parts = gradientClass.split(' ').filter(p => p); // 过滤空字符串
        let fromColor = '#667eea'; // 默认颜色
        let toColor = '#764ba2';
        
        parts.forEach(part => {
            if (part && part.startsWith('from-')) {
                const colorKey = part.replace('from-', '');
                fromColor = tailwindColors[colorKey] || fromColor;
            } else if (part && part.startsWith('to-')) {
                const colorKey = part.replace('to-', '');
                toColor = tailwindColors[colorKey] || toColor;
            }
        });
        
        return `linear-gradient(to bottom right, ${fromColor}, ${toColor})`;
    }
    
    // 渲染切换器应用图标
    function renderSwitcherAppIcon(app) {
        // 安全检查
        if (!app || !app.id || !app.name) {
            console.warn('⚠️ 無效的應用數據:', app);
            return '';
        }
        
        // 檢查圖標是否存在且有效
        if (!app.icon || app.icon.trim() === '') {
            console.warn(`⚠️ 應用 ${app.name} (${app.id}) 缺少圖標`);
        }
        
        const isFaIcon = typeof app.icon === 'string' && (app.icon.startsWith('fas ') || app.icon.startsWith('fa-') || app.icon.includes('fa-'));
        let iconHtml = '';
        if (app.iconImage) {
            iconHtml = `<img src="${app.iconImage}" alt="${app.name} 圖標" style="width: 26px; height: 26px; object-fit: contain;" loading="lazy" decoding="async">`;
        } else if (isFaIcon) {
            iconHtml = `<i class="${app.icon}" style="color: white; font-size: 20px;"></i>`;
        } else if (app.icon && app.icon.trim() !== '') {
            iconHtml = `<span style="font-size: 20px; color: white;">${app.icon}</span>`;
        } else {
            iconHtml = '<span style="font-size: 20px; color: white;">📱</span>'; // 默認圖標
        }
        
        const gradientStyle = convertGradient(app.gradient);

        return `
            <div class="taixu-switcher-app-icon" 
                 data-app-id="${app.id}" 
                 onclick="window.taixuNavigateToApp('${app.id}')"
                 style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 100%; min-height: 0; padding: 8px 4px; border-radius: 12px; transition: all 0.2s;">
                <div class="icon-container" 
                     style="background: ${gradientStyle}; border-radius: 10px; padding: 10px; width: 52px; height: 52px; min-width: 52px; min-height: 52px; max-width: 52px; max-height: 52px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); margin-bottom: 6px;">
                    ${iconHtml}
                </div>
                <p class="taixu-switcher-app-name" 
                   style="text-align: center; font-size: 11px; line-height: 1.3; width: 100%; padding: 0 4px; flex-shrink: 0; font-weight: 500;">${app.name}</p>
            </div>
        `;
    }
    
    // 渲染应用网格
    function renderAppGrid() {
        const grid = document.getElementById('taixuSwitcherAppGrid');
        if (!grid) {
            console.warn('❌ 找不到应用网格容器 #taixuSwitcherAppGrid');
            return;
        }
        
        // 检查并记录缺少 gradient 的应用
        apps.forEach((app, index) => {
            if (!app.gradient) {
                console.warn(`⚠️ 應用 ${app.name} (${app.id}) 缺少 gradient 属性`);
            }
        });
        
        const html = apps.map(app => renderSwitcherAppIcon(app)).join('');
        grid.innerHTML = html;
        console.log(`✅ 已渲染 ${apps.length} 个应用图标`);
    }
    
    // 显示切换器
    function showAppSwitcher() {
        const modal = document.getElementById('taixuAppSwitcherModal');
        if (!modal) {
            console.warn('❌ 找不到切換器模態框');
            return;
        }
        
        // 确保应用网格已渲染
        const grid = document.getElementById('taixuSwitcherAppGrid');
        if (grid && (!grid.innerHTML || grid.innerHTML.trim() === '<!-- 应用图标将通过 JavaScript 动态生成 -->')) {
            console.log('🔄 應用網格為空，重新渲染...');
            renderAppGrid();
        }
        
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
    
    function applyFloatingLogoVisibility() {
        const logo = document.getElementById('taixuFloatingLogo');
        if (!logo) {
            return;
        }

        if (desiredFloatingVisibility) {
            logo.style.removeProperty('display');
        } else {
            hideAppSwitcher();
            logo.style.display = 'none';
        }
    }

    function setFloatingLogoVisibility(visible) {
        desiredFloatingVisibility = !!visible;
        window.__taixuDesiredVisibility = desiredFloatingVisibility;
        applyFloatingLogoVisibility();
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
    
    // 檢查並加載 Font Awesome
    function ensureFontAwesome() {
        // 檢查是否已經加載 Font Awesome
        const hasFontAwesome = document.querySelector('link[href*="font-awesome"]') ||
                               document.querySelector('link[href*="fontawesome"]') ||
                               (window.FontAwesome && window.FontAwesome.config);
        
        if (!hasFontAwesome) {
            console.log('📦 Font Awesome 未檢測到，正在自動加載...');
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            link.id = 'taixu-fontawesome';
            document.head.appendChild(link);
            console.log('✅ Font Awesome 已加載');
            // 等待 Font Awesome 加載完成後再繼續
            return new Promise((resolve) => {
                link.onload = () => {
                    console.log('✅ Font Awesome 加載完成');
                    resolve();
                };
                link.onerror = () => {
                    console.warn('⚠️ Font Awesome 加載失敗，圖標可能無法顯示');
                    resolve(); // 即使失敗也繼續，避免阻塞
                };
                // 設置超時，避免無限等待
                setTimeout(resolve, 2000);
            });
        }
        return Promise.resolve();
    }
    
    // 初始化切换器
    function initAppSwitcher() {
        console.log('🔄 開始初始化太虛幻境應用切換器...');
        
        // 確保 Font Awesome 已加載
        ensureFontAwesome().then(() => {
            // 插入样式
            if (!document.getElementById('taixu-switcher-styles')) {
                document.head.insertAdjacentHTML('beforeend', createSwitcherStyles());
                console.log('✅ 樣式已插入');
            }
            
            // 插入浮动 Logo
            if (!document.getElementById('taixuFloatingLogo')) {
                document.body.insertAdjacentHTML('beforeend', createFloatingLogoHTML());
                console.log('✅ 浮動 Logo 已插入');
            }
            
            // 插入切换器模态框
            if (!document.getElementById('taixuAppSwitcherModal')) {
                document.body.insertAdjacentHTML('beforeend', createSwitcherModalHTML());
                console.log('✅ 切換器模態框已插入');
            }
            
            // 使用 requestAnimationFrame 确保 DOM 已渲染
            requestAnimationFrame(() => {
                // 绑定事件
                bindEvents();
                
                // 渲染应用网格
                renderAppGrid();
                
                console.log('✅ 太虛幻境應用切換器初始化完成');
                applyFloatingLogoVisibility();
            });
        });
    }
    
    // 导出全局函数
    window.initAppSwitcher = initAppSwitcher;
    window.showFloatingAppSwitcher = showAppSwitcher;
    window.taixuNavigateToApp = navigateToApp;
    window.setAppSwitcherVisibility = setFloatingLogoVisibility;
    
    // 如果页面已加载完成，自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAppSwitcher);
    } else {
        // 延迟一点，确保页面其他资源已加载
        setTimeout(initAppSwitcher, 100);
    }
})();

