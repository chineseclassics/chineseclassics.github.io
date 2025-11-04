// 《紅樓夢》論文選題思維導圖 - 主應用邏輯

class MindMapApp {
    constructor() {
        this.currentMode = 'correct'; // 'correct' 或 'wrong'
        this.container = document.getElementById('mindmapContainer');
        this.stepModal = document.getElementById('stepModal');
        this.modalBody = document.getElementById('modalBody');
        
        // 正確流程數據
        this.correctSteps = [
            {
                id: 1,
                title: '整體閱讀 + 興趣',
                description: '根據整體閱讀和個人興趣，確定一個具象的關鍵詞',
                detail: {
                    title: '第一步：從整體閱讀到關鍵詞',
                    content: [
                        {
                            type: 'section',
                            title: '核心概念',
                            text: '關鍵詞要具象、可操作，能直接指向原文中的具體證據。不要選擇過於抽象的理念（如「主題」「人物形象」），而要選擇可以在文本中直接找到的具體元素（如「數字」「顏色詞」「稱呼語」）。'
                        },
                        {
                            type: 'example',
                            title: '好的關鍵詞範例',
                            content: [
                                '✅ 「數字」：可以在原文中直接找到「十二」「二十四」「三百六十五」等具體數字',
                                '✅ 「顏色詞」：可以找到「紅」「綠」「白」等具體顏色描寫',
                                '✅ 「稱呼語」：可以找到不同人物對同一人的不同稱呼方式'
                            ]
                        },
                        {
                            type: 'warning',
                            title: '需要避免的關鍵詞',
                            content: [
                                '❌ 「主題」：太抽象，無法直接找到 primary source',
                                '❌ 「人物形象」：太寬泛',
                                '❌ 「藝術手法」：太籠統'
                            ]
                        }
                    ]
                },
                position: { x: 50, y: 8 }
            },
            {
                id: 2,
                title: '尋找 Primary Sources',
                description: '根據關鍵詞回到原文，收集可摘錄的原文證據',
                detail: {
                    title: '第二步：回到原文尋找證據',
                    content: [
                        {
                            type: 'section',
                            title: '什麼是 Primary Source？',
                            text: 'Primary source 必須是可摘錄的原文證據，不是抽象概念。要能直接引用、標註具體位置（回目、章節）。'
                        },
                        {
                            type: 'section',
                            title: '收集標準',
                            text: '找到原文中所有與關鍵詞相關的具體證據。可以是對話、描寫、結構性安排等。建議收集 15-30 處相關證據，確保有足夠的文本支撐。'
                        },
                        {
                            type: 'example',
                            title: '示例：尋找「數字」相關的 Primary Sources',
                            content: [
                                '第一回：甄士隱夢中見「一僧一道」，賈雨村看到「十二釵」',
                                '第五回：太虛幻境「十二金釵」正冊、副冊、又副冊',
                                '第三十九回：劉姥姥說「這園子裡頭，就是這一年裡頭，也該有三百六十五個窟窿」',
                                '...（繼續尋找更多）'
                            ]
                        }
                    ]
                },
                position: { x: 50, y: 22 }
            },
            {
                id: 3,
                title: '細讀沉思 + 初步歸類',
                description: '細讀這些 primary sources，大致歸類為 2-4 類（通常是 3 類）',
                detail: {
                    title: '第三步：細讀與歸類',
                    content: [
                        {
                            type: 'section',
                            title: '歸類的性質',
                            text: '這個分類不一定按 primary source 本身的「客觀性質」（如「數字 12」「數字 24」「數字 365」），而是根據你的細讀思考，將這些 primary sources 大致歸為幾類。這個分類代表了你的思考雛形，會形成論文的分論點。'
                        },
                        {
                            type: 'section',
                            title: '框架的使用',
                            text: '可以使用常見的小說要素（人物、情節、主題），但必須用你的獨特思考去補充、優化，使其脫離「一般框架」的感覺。例如，不是簡單地分「人物」「情節」「主題」，而是在這些框架下注入你從文本中發現的具體特點。'
                        },
                        {
                            type: 'framework',
                            title: '框架優化對比',
                            bad: {
                                title: '❌ 一般框架（套用現成分類）',
                                content: '人物、情節、主題'
                            },
                            good: {
                                title: '✅ 優化後的框架（注入文本獨特性）',
                                content: '人物稱呼語的層次變化（發現：同一個人，不同人稱呼不同）\n數字與命運的隱喻關聯（發現：十二金釵的「十二」與其他「十二」形成對應）'
                            }
                        },
                        {
                            type: 'example',
                            title: '示例：數字的分類',
                            content: [
                                '分類一：結構性數字（十二金釵、十二回等，與小說結構相關）',
                                '分類二：時間性數字（三百六十五、二十四節氣等，與時間概念相關）',
                                '分類三：象徵性數字（一僧一道、三生石等，與宗教哲學相關）'
                            ]
                        }
                    ]
                },
                position: { x: 50, y: 38 }
            },
            {
                id: 4,
                title: '完善研究論題',
                description: '根據 primary sources 和初步分論點，回過頭完善研究論題（形成探究問題）',
                detail: {
                    title: '第四步：從證據到問題',
                    content: [
                        {
                            type: 'section',
                            title: '回溯式完善',
                            text: '不是一開始就確定論題，而是基於已收集的資料和初步思考來完善。論題應該是探究問題性質的，例如「紅樓夢中數字的 XXX」。'
                        },
                        {
                            type: 'section',
                            title: '探究問題的特點',
                            text: '好的研究論題應該是一個可以探究的問題，而不是一個已經確定的結論。例如「紅樓夢中數字如何暗示人物命運？」而不是「紅樓夢中數字暗示人物命運」。'
                        },
                        {
                            type: 'example',
                            title: '示例：完善論題',
                            content: [
                                '從模糊的關鍵詞「數字」',
                                '到收集的 primary sources 和初步分類',
                                '完善為探究問題：「紅樓夢中數字的結構性安排如何暗示人物命運？」'
                            ]
                        }
                    ]
                },
                position: { x: 50, y: 54 }
            },
            {
                id: 5,
                title: '精煉分論點',
                description: '根據完善的探究問題，回過頭精煉分論點',
                detail: {
                    title: '第五步：迭代精煉',
                    content: [
                        {
                            type: 'section',
                            title: '迭代完善的機制',
                            text: '形成探究問題後，回過頭來精煉分論點。這是一個循環過程：問題 ↔ 證據 ↔ 分論點。可以不斷調整，甚至回到前面的步驟補充 primary sources 或重新歸類。'
                        },
                        {
                            type: 'section',
                            title: '最終結構',
                            text: '最終形成：研究主題（探究問題）+ 分論點（通常 3 個）+ 支持分論點的 primary sources。所有觀點都來自原文細讀，而不是先入為主的理念。'
                        },
                        {
                            type: 'example',
                            title: '示例：最終論文結構',
                            content: [
                                '研究主題：紅樓夢中數字的結構性安排如何暗示人物命運？',
                                '分論點一：結構性數字（十二金釵）與小說的整體架構',
                                '分論點二：時間性數字（三百六十五）與人物的時間感知',
                                '分論點三：象徵性數字（一僧一道）與命運的哲學隱喻',
                                '每個分論點都有相應的 primary sources 支撐'
                            ]
                        }
                    ]
                },
                position: { x: 50, y: 72 }
            }
        ];

        // 錯誤流程數據（理念先行）
        this.wrongSteps = [
            {
                id: 1,
                title: '先確定研究論題',
                description: '在沒有充分閱讀文本的情況下，先確定一個抽象的研究論題',
                detail: {
                    title: '錯誤第一步：理念先行',
                    content: [
                        {
                            type: 'section',
                            title: '問題所在',
                            text: '直接從抽象理念出發，如「紅樓夢中的階級批判」。這個論題不是從文本細讀中發現的，而是從預設的理論框架中套用的。'
                        },
                        {
                            type: 'warning',
                            title: '容易導致的問題',
                            content: [
                                '❌ 先有觀點，再找證據（容易選擇性摘錄）',
                                '❌ 忽略與觀點矛盾的證據',
                                '❌ 強行用文本證明先入為主的觀點',
                                '❌ 缺乏來自文本的獨特性'
                            ]
                        }
                    ]
                },
                position: { x: 50, y: 12 }
            },
            {
                id: 2,
                title: '根據論題形成分論點',
                description: '用現成的邏輯框架（如階級、對立等）形成分論點',
                detail: {
                    title: '錯誤第二步：套用現成框架',
                    content: [
                        {
                            type: 'section',
                            title: '問題所在',
                            text: '直接套用常見的理論框架，如「上層壓迫」「下層反抗」「階級對立」。這些分論點不是從文本中發現的，而是從理論中推導的。'
                        },
                        {
                            type: 'warning',
                            title: '問題',
                            content: [
                                '❌ 分論點缺乏文本支撐',
                                '❌ 只是重複語言和思維定式中的邏輯框架',
                                '❌ 沒有觀點，只是在套用框架'
                            ]
                        }
                    ]
                },
                position: { x: 50, y: 38 }
            },
            {
                id: 3,
                title: '去找 Primary Sources',
                description: '帶著既定觀點去找證據，容易選擇性摘錄',
                detail: {
                    title: '錯誤第三步：選擇性找證據',
                    content: [
                        {
                            type: 'section',
                            title: '問題所在',
                            text: '因為已經有了先入為主的觀點，在尋找證據時容易只找支持觀點的證據，忽略反對的證據，甚至扭曲解釋原文。'
                        },
                        {
                            type: 'warning',
                            title: '具體表現',
                            content: [
                                '❌ 只摘錄支持觀點的段落',
                                '❌ 忽略與觀點矛盾的證據',
                                '❌ 斷章取義，強行解釋',
                                '❌ 缺乏對文本的全面理解'
                            ]
                        }
                    ]
                },
                position: { x: 50, y: 65 }
            }
        ];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // 模式切換按鈕
        document.getElementById('btnCorrect').addEventListener('click', () => {
            this.switchMode('correct');
        });
        document.getElementById('btnWrong').addEventListener('click', () => {
            this.switchMode('wrong');
        });

        // 模態框關閉
        this.stepModal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });
        this.stepModal.querySelector('.modal-overlay').addEventListener('click', () => {
            this.closeModal();
        });

        // ESC 鍵關閉
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.stepModal.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // 更新按鈕狀態
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`btn${mode === 'correct' ? 'Correct' : 'Wrong'}`).classList.add('active');
        
        this.render();
    }

    render() {
        const steps = this.currentMode === 'correct' ? this.correctSteps : this.wrongSteps;
        const modeClass = this.currentMode;
        
        // 清空容器
        this.container.innerHTML = '';
        
        // 創建 SVG 容器用於連接線
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'absolute inset-0 w-full h-full');
        svg.style.pointerEvents = 'none';
        this.container.appendChild(svg);
        
        // 計算容器尺寸（使用實際容器尺寸或視窗尺寸）
        const containerRect = this.container.getBoundingClientRect();
        const containerWidth = containerRect.width || this.container.offsetWidth || window.innerWidth;
        const containerHeight = containerRect.height || this.container.offsetHeight || window.innerHeight * 0.7;
        
        // 渲染節點
        const nodes = [];
        steps.forEach((step, index) => {
            const node = this.createNode(step, index, containerWidth, containerHeight, modeClass);
            this.container.appendChild(node);
            nodes.push({
                element: node,
                step: step,
                index: index
            });
        });
        
        // 渲染連接線（等待節點渲染完成）
        setTimeout(() => {
            this.renderConnections(svg, nodes, containerWidth, containerHeight, modeClass, containerRect);
        }, 100);
    }

    createNode(step, index, containerWidth, containerHeight, modeClass) {
        const node = document.createElement('div');
        node.className = `mindmap-node ${modeClass}`;
        
        const x = (step.position.x / 100) * containerWidth;
        const y = (step.position.y / 100) * containerHeight;
        
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.transform = 'translate(-50%, -50%)';
        
        node.innerHTML = `
            <div class="mindmap-node-number">${step.id}</div>
            <div class="mindmap-node-content">
                <div class="mindmap-node-header">${step.title}</div>
                <div class="mindmap-node-body">${step.description}</div>
            </div>
        `;
        
        node.addEventListener('click', () => {
            this.showStepDetail(step);
        });
        
        return node;
    }

    renderConnections(svg, nodes, containerWidth, containerHeight, modeClass, containerRect) {
        // 清空之前的連接線（保留 SVG 結構）
        const existingDefs = svg.querySelector('defs');
        svg.innerHTML = '';
        if (existingDefs) {
            svg.appendChild(existingDefs);
        }
        
        // 確保 containerRect 存在
        if (!containerRect) {
            containerRect = this.container.getBoundingClientRect();
        }
        
        // 繪製正向連接線
        for (let i = 0; i < nodes.length - 1; i++) {
            const fromNode = nodes[i].element;
            const toNode = nodes[i + 1].element;
            
            const fromRect = fromNode.getBoundingClientRect();
            const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
            const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
            
            const toRect = toNode.getBoundingClientRect();
            const toX = toRect.left + toRect.width / 2 - containerRect.left;
            const toY = toRect.top + toRect.height / 2 - containerRect.top;
            
            // 創建連接線（調整曲線弧度，增加間距感）
            const midY = (fromY + toY) / 2;
            const curveOffset = Math.abs(toY - fromY) * 0.3; // 根據距離動態調整曲線
            const path = `M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${midY - curveOffset} ${toX} ${toY}`;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.setAttribute('d', path);
            line.setAttribute('class', `mindmap-connection ${modeClass}`);
            svg.appendChild(line);
            
            // 添加箭頭標記
            const markerId = `arrow-${modeClass}-${i}`;
            if (!svg.querySelector(`#${markerId}`)) {
                const defs = svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                if (!svg.querySelector('defs')) {
                    svg.appendChild(defs);
                }
                const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
                marker.setAttribute('id', markerId);
                marker.setAttribute('markerWidth', '12');
                marker.setAttribute('markerHeight', '12');
                marker.setAttribute('refX', '11');
                marker.setAttribute('refY', '6');
                marker.setAttribute('orient', 'auto');
                const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                arrowPath.setAttribute('d', 'M0,0 L0,12 L12,6 z');
                arrowPath.setAttribute('fill', modeClass === 'correct' ? '#10b981' : '#ef4444');
                marker.appendChild(arrowPath);
                defs.appendChild(marker);
            }
            line.setAttribute('marker-end', `url(#${markerId})`);
        }
        
        // 如果是正確模式，繪製回溯箭頭
        if (modeClass === 'correct' && nodes.length > 1) {
            // 從第 4 步回到第 1 步（完善論題後可能調整關鍵詞）
            if (nodes.length >= 4) {
                this.drawBackwardConnection(svg, nodes[3].element, nodes[0].element, containerRect, modeClass);
            }
            // 從第 5 步回到第 2 步（精煉分論點後可能補充證據）
            if (nodes.length >= 5) {
                this.drawBackwardConnection(svg, nodes[4].element, nodes[1].element, containerRect, modeClass);
            }
            // 從第 5 步回到第 3 步（精煉分論點後可能重新歸類）
            if (nodes.length >= 5) {
                this.drawBackwardConnection(svg, nodes[4].element, nodes[2].element, containerRect, modeClass);
            }
        }
    }

    drawBackwardConnection(svg, fromElement, toElement, containerRect, modeClass) {
        const fromRect = fromElement.getBoundingClientRect();
        const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
        const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
        
        const toRect = toElement.getBoundingClientRect();
        const toX = toRect.left + toRect.width / 2 - containerRect.left;
        const toY = toRect.top + toRect.height / 2 - containerRect.top;
        
        // 創建反向曲線（從右側繞過）
        const midX = Math.max(fromX, toX) + 100;
        const path = `M ${fromX} ${fromY} Q ${midX} ${fromY} ${midX} ${(fromY + toY) / 2} Q ${midX} ${toY} ${toX} ${toY}`;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', path);
        line.setAttribute('class', `mindmap-connection backward ${modeClass}`);
        svg.appendChild(line);
        
        // 添加箭頭標記
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        arrowMarker.setAttribute('id', `arrow-backward-${modeClass}`);
        arrowMarker.setAttribute('markerWidth', '10');
        arrowMarker.setAttribute('markerHeight', '10');
        arrowMarker.setAttribute('refX', '9');
        arrowMarker.setAttribute('refY', '3');
        arrowMarker.setAttribute('orient', 'auto');
        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
        arrowPath.setAttribute('fill', modeClass === 'correct' ? '#34d399' : '#f87171');
        arrowMarker.appendChild(arrowPath);
        marker.appendChild(arrowMarker);
        if (!svg.querySelector('defs')) {
            svg.appendChild(marker);
        }
        line.setAttribute('marker-end', `url(#arrow-backward-${modeClass})`);
    }

    showStepDetail(step) {
        this.modalBody.innerHTML = '';
        
        const title = document.createElement('div');
        title.className = 'step-detail-title';
        title.textContent = step.detail.title;
        this.modalBody.appendChild(title);
        
        step.detail.content.forEach(item => {
            const section = document.createElement('div');
            section.className = 'step-detail-section';
            
            if (item.type === 'section') {
                const h3 = document.createElement('h3');
                h3.textContent = item.title;
                section.appendChild(h3);
                
                const p = document.createElement('p');
                p.textContent = item.text;
                section.appendChild(p);
            } else if (item.type === 'example') {
                const exampleDiv = document.createElement('div');
                exampleDiv.className = 'step-detail-example';
                
                const exampleTitle = document.createElement('div');
                exampleTitle.className = 'step-detail-example-title';
                exampleTitle.textContent = item.title;
                exampleDiv.appendChild(exampleTitle);
                
                const exampleContent = document.createElement('div');
                exampleContent.className = 'step-detail-example-content';
                if (Array.isArray(item.content)) {
                    item.content.forEach(line => {
                        const p = document.createElement('p');
                        p.textContent = line;
                        p.style.marginBottom = '8px';
                        exampleContent.appendChild(p);
                    });
                } else {
                    exampleContent.textContent = item.content;
                }
                exampleDiv.appendChild(exampleContent);
                section.appendChild(exampleDiv);
            } else if (item.type === 'warning') {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'step-detail-warning';
                
                const warningTitle = document.createElement('div');
                warningTitle.className = 'step-detail-warning-title';
                warningTitle.textContent = item.title;
                warningDiv.appendChild(warningTitle);
                
                const warningContent = document.createElement('div');
                warningContent.className = 'step-detail-warning-content';
                if (Array.isArray(item.content)) {
                    item.content.forEach(line => {
                        const p = document.createElement('p');
                        p.textContent = line;
                        p.style.marginBottom = '8px';
                        warningContent.appendChild(p);
                    });
                } else {
                    warningContent.textContent = item.content;
                }
                warningDiv.appendChild(warningContent);
                section.appendChild(warningDiv);
            } else if (item.type === 'framework') {
                const frameworkTitle = document.createElement('h3');
                frameworkTitle.textContent = item.title;
                section.appendChild(frameworkTitle);
                
                const comparison = document.createElement('div');
                comparison.className = 'framework-comparison';
                
                // 壞的框架
                const badBox = document.createElement('div');
                badBox.className = 'framework-box bad';
                const badTitle = document.createElement('div');
                badTitle.className = 'framework-box-title';
                badTitle.textContent = item.bad.title;
                badBox.appendChild(badTitle);
                const badContent = document.createElement('div');
                badContent.className = 'framework-box-content';
                badContent.textContent = item.bad.content;
                badBox.appendChild(badContent);
                comparison.appendChild(badBox);
                
                // 好的框架
                const goodBox = document.createElement('div');
                goodBox.className = 'framework-box good';
                const goodTitle = document.createElement('div');
                goodTitle.className = 'framework-box-title';
                goodTitle.textContent = item.good.title;
                goodBox.appendChild(goodTitle);
                const goodContent = document.createElement('div');
                goodContent.className = 'framework-box-content';
                goodContent.innerHTML = item.good.content.replace(/\n/g, '<br>');
                goodBox.appendChild(goodContent);
                comparison.appendChild(goodBox);
                
                section.appendChild(comparison);
            }
            
            this.modalBody.appendChild(section);
        });
        
        this.stepModal.classList.remove('hidden');
    }

    closeModal() {
        this.stepModal.classList.add('hidden');
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    new MindMapApp();
});
