// 自然灾害数据
const disastersData = {
    earthquake: {
        name: "地震",
        icon: "fa-mountain",
        color: "#8B4513",
        video: "https://www.youtube.com/embed/by6Y3x8_d5E", // 为什么会有地震|地震科普|贝小帅
        knowledge: {
            title: "地震小知识",
            sections: [
                {
                    title: "🌍 什么是地震？",
                    content: "地震是地球内部岩石突然破裂或移动引起的地面摇晃。就像你摇晃一个装满水的杯子，水会晃动一样，地球内部的力量会让地面摇晃。"
                },
                {
                    title: "🔥 地震是怎么产生的？",
                    content: "地球内部有很多大块的岩石叫做\"板块\"，这些板块慢慢移动，当它们相互碰撞或摩擦时，就会产生巨大的力量，引起地震。"
                },
                {
                    title: "📏 地震的强度",
                    content: "地震的强度用\"震级\"来表示，就像给地震打分一样。震级越高，地震越强烈，破坏力也越大。"
                },
                {
                    title: "🏠 地震时应该怎么办？",
                    content: "地震时要保持冷静，立即躲在坚固的桌子下面，或者躲在墙角。不要跑到阳台或窗户附近，等摇晃停止后再到空旷的地方。",
                    list: [
                        "躲在坚固的桌子或床下",
                        "远离窗户和镜子",
                        "不要使用电梯",
                        "摇晃停止后才离开建筑物",
                        "到空旷安全的地方集合"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "地震是由什么引起的？",
                options: [
                    "地球内部板块的移动和碰撞",
                    "天空中云朵的摩擦",
                    "海洋中鱼类的游动",
                    "风吹动树木"
                ],
                correct: 0,
                explanation: "地震是由地球内部大块岩石（板块）的移动和碰撞引起的。"
            },
            {
                question: "地震时最安全的做法是什么？",
                options: [
                    "立即跑到阳台上",
                    "躲在坚固的桌子下面",
                    "站在窗户旁边",
                    "乘坐电梯逃生"
                ],
                correct: 1,
                explanation: "地震时应该躲在坚固的桌子下面，这样可以保护自己不被掉落的物品砸伤。"
            },
            {
                question: "地震的强度用什么来表示？",
                options: [
                    "温度",
                    "湿度",
                    "震级",
                    "速度"
                ],
                correct: 2,
                explanation: "地震的强度用震级来表示，震级越高，地震越强烈。"
            }
        ]
    },
    
    tsunami: {
        name: "海啸",
        icon: "fa-water",
        color: "#006994",
        video: "https://www.youtube.com/embed/QDto7-5HOxA", // 幼儿教育童话-海啸来了！| 早教启蒙| 幼儿科普
        knowledge: {
            title: "海啸小知识",
            sections: [
                {
                    title: "🌊 什么是海啸？",
                    content: "海啸是海洋中的巨大波浪，它们移动得非常快，可以到达很远的地方。想象一下在浴缸里突然推一下水，水波会快速传播，海啸就是这样，但比这大得多！"
                },
                {
                    title: "⚡ 海啸是怎么形成的？",
                    content: "海啸通常由海底地震、火山爆发或山体滑坡引起。当海底突然移动时，就会推动海水形成巨大的波浪。"
                },
                {
                    title: "🏃 海啸的速度",
                    content: "海啸在深海中移动得非常快，速度可以达到飞机的速度！但当它接近海岸时会变慢，但波浪会变得更高更危险。"
                },
                {
                    title: "🚨 海啸预警信号",
                    content: "如果你在海边发现海水突然退得很远，或者听到海啸警报，一定要立即逃到高处！",
                    list: [
                        "海水突然大幅退潮",
                        "听到海啸警报声",
                        "感受到强烈地震",
                        "看到海平面异常升高",
                        "立即向高处或内陆逃生"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "海啸通常是由什么引起的？",
                options: [
                    "强风吹动海水",
                    "海底地震或火山爆发",
                    "鱼类大规模游动",
                    "月亮的引力"
                ],
                correct: 1,
                explanation: "海啸通常由海底地震、火山爆发或山体滑坡等突然的海底变化引起。"
            },
            {
                question: "看到海水突然大幅退潮时应该怎么办？",
                options: [
                    "到海边捡贝壳",
                    "继续在海边玩耍",
                    "立即逃到高处",
                    "等待海水回来"
                ],
                correct: 2,
                explanation: "海水突然大幅退潮是海啸来临的重要预警信号，应该立即逃到高处或内陆。"
            },
            {
                question: "海啸在深海中的移动速度怎么样？",
                options: [
                    "很慢，像人走路一样",
                    "中等速度，像汽车一样",
                    "很快，像飞机一样",
                    "不移动"
                ],
                correct: 2,
                explanation: "海啸在深海中移动得非常快，速度可以达到每小时几百公里，像飞机一样快。"
            }
        ]
    },
    
    volcano: {
        name: "火山爆发",
        icon: "fa-volcano",
        color: "#FF4500",
        video: "https://www.youtube.com/embed/fBaHwgbsvvM", // 3-12岁| 儿童科普动画-火山
        knowledge: {
            title: "火山小知识",
            sections: [
                {
                    title: "🌋 什么是火山？",
                    content: "火山是地球内部熔岩喷出地面的地方。就像一个巨大的锅子，里面装满了超级热的岩浆，当压力太大时就会爆发出来。"
                },
                {
                    title: "🔥 火山是怎么形成的？",
                    content: "地球内部非常热，岩石都融化成了液体，叫做岩浆。当岩浆找到地面的裂缝时，就会冲出来形成火山爆发。"
                },
                {
                    title: "🏔️ 火山的类型",
                    content: "有些火山经常爆发，叫做活火山；有些火山很久没有爆发了，叫做死火山；有些火山可能还会爆发，叫做休眠火山。"
                },
                {
                    title: "🛡️ 火山爆发时的安全措施",
                    content: "火山爆发时会喷出很热的岩浆、火山灰和有毒气体，非常危险。",
                    list: [
                        "立即远离火山区域",
                        "戴上口罩防止吸入火山灰",
                        "关好门窗",
                        "不要在火山灰中行走",
                        "听从官方疏散指令"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "火山爆发时喷出的熔化岩石叫什么？",
                options: [
                    "岩浆",
                    "岩石",
                    "泥土",
                    "水"
                ],
                correct: 0,
                explanation: "火山爆发时喷出的熔化岩石叫做岩浆，温度非常高，非常危险。"
            },
            {
                question: "很久没有爆发的火山叫什么？",
                options: [
                    "活火山",
                    "死火山",
                    "休眠火山",
                    "新火山"
                ],
                correct: 1,
                explanation: "很久没有爆发，将来也不太可能再爆发的火山叫做死火山。"
            },
            {
                question: "火山爆发时最重要的是什么？",
                options: [
                    "观看火山爆发",
                    "收集火山灰",
                    "立即远离火山区域",
                    "拍照留念"
                ],
                correct: 2,
                explanation: "火山爆发时最重要的是保护自己的安全，立即远离危险区域。"
            }
        ]
    },
    
    tornado: {
        name: "龙卷风",
        icon: "fa-wind",
        color: "#708090",
        video: "https://www.youtube.com/embed/9qlM7L6KI5E", // 龙卷风是怎么来的？| What causes tornadoes?
        knowledge: {
            title: "龙卷风小知识",
            sections: [
                {
                    title: "🌪️ 什么是龙卷风？",
                    content: "龙卷风是快速旋转的空气柱，从地面一直延伸到天空中的云层。它看起来像一个巨大的旋转漏斗，破坏力非常强大。"
                },
                {
                    title: "💨 龙卷风是怎么形成的？",
                    content: "当热空气和冷空气相遇时，会产生强烈的对流。如果风向不同，空气就会开始旋转，形成龙卷风。"
                },
                {
                    title: "📊 龙卷风的等级",
                    content: "龙卷风根据风速和破坏力分为不同等级，从F0到F5级，数字越大，龙卷风越强烈，破坏力越大。"
                },
                {
                    title: "🏠 龙卷风来临时的安全措施",
                    content: "龙卷风移动速度很快，破坏力极强，需要立即寻找安全的地方躲避。",
                    list: [
                        "立即进入坚固建筑物的最低层",
                        "远离窗户和玻璃",
                        "蹲在坚固的桌子下面",
                        "用双手保护头部和颈部",
                        "不要试图逃跑或开车逃离"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "龙卷风看起来像什么形状？",
                options: [
                    "正方形",
                    "圆形",
                    "旋转的漏斗形",
                    "三角形"
                ],
                correct: 2,
                explanation: "龙卷风看起来像一个巨大的旋转漏斗，从地面延伸到天空中的云层。"
            },
            {
                question: "龙卷风来临时应该躲在哪里？",
                options: [
                    "汽车里",
                    "树下",
                    "坚固建筑物的最低层",
                    "空旷的地方"
                ],
                correct: 2,
                explanation: "龙卷风来临时应该立即进入坚固建筑物的最低层，远离窗户。"
            },
            {
                question: "龙卷风的等级是怎么划分的？",
                options: [
                    "根据颜色",
                    "根据大小",
                    "根据风速和破坏力",
                    "根据时间长短"
                ],
                correct: 2,
                explanation: "龙卷风根据风速和破坏力划分等级，从F0到F5级，数字越大越危险。"
            }
        ]
    },
    
    flood: {
        name: "洪水",
        icon: "fa-house-flood-water",
        color: "#4682B4",
        video: "https://www.youtube.com/embed/9hQZCiZ21fk", // FLOODS - The Dr. Binocs Show | Best Learning Videos For Kids
        knowledge: {
            title: "洪水小知识",
            sections: [
                {
                    title: "💧 什么是洪水？",
                    content: "洪水是指河流、湖泊或海洋的水位异常升高，淹没了平时干燥的土地。就像浴缸里的水溢出来一样。"
                },
                {
                    title: "🌧️ 洪水是怎么产生的？",
                    content: "洪水通常由持续的大雨、雪融化、水坝决堤或河道堵塞引起。当水量超过了河流和排水系统的承受能力时，就会发生洪水。"
                },
                {
                    title: "⚠️ 洪水的危险",
                    content: "洪水看起来平静，但实际上非常危险。流动的洪水力量巨大，可以冲走汽车和房屋。"
                },
                {
                    title: "🆘 洪水时的安全措施",
                    content: "洪水来临时，最重要的是远离洪水区域，到高处寻求安全。",
                    list: [
                        "立即转移到高处",
                        "不要试图穿越洪水",
                        "远离下水道和排水沟",
                        "听从救援人员指挥",
                        "准备应急物品和食物"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "洪水通常是由什么引起的？",
                options: [
                    "地震",
                    "持续大雨或雪融化",
                    "强风",
                    "火山爆发"
                ],
                correct: 1,
                explanation: "洪水通常由持续的大雨、雪融化、水坝决堤等原因引起。"
            },
            {
                question: "遇到洪水时应该怎么办？",
                options: [
                    "游泳穿越洪水",
                    "立即转移到高处",
                    "在洪水中行走",
                    "等待洪水自然消退"
                ],
                correct: 1,
                explanation: "遇到洪水时应该立即转移到高处，寻求安全的地方，不要试图穿越洪水。"
            },
            {
                question: "为什么不能在洪水中行走？",
                options: [
                    "洪水很脏",
                    "洪水很冷",
                    "洪水力量巨大很危险",
                    "洪水里有鱼"
                ],
                correct: 2,
                explanation: "洪水虽然看起来平静，但力量巨大，可以轻易冲倒人，非常危险。"
            }
        ]
    },
    
    hurricane: {
        name: "台风",
        icon: "fa-hurricane",
        color: "#2F4F4F",
        video: "https://www.youtube.com/embed/NXLPoWcVhLw", // Hurricanes | Educational Videos for Kids
        knowledge: {
            title: "台风小知识",
            sections: [
                {
                    title: "🌀 什么是台风？",
                    content: "台风是一种强烈的热带气旋，带有强风和暴雨。它看起来像一个巨大的旋转云团，中心有一个平静的\"风眼\"。"
                },
                {
                    title: "🌊 台风是怎么形成的？",
                    content: "台风在温暖的海洋上形成。当海水蒸发上升，遇到冷空气后形成云朵，然后开始旋转，逐渐变强，最终形成台风。"
                },
                {
                    title: "💪 台风的强度",
                    content: "台风根据风速分为不同等级，从热带低压到超强台风。风速越快，台风越危险。"
                },
                {
                    title: "🏠 台风来临时的准备",
                    content: "台风会带来强风、暴雨和巨浪，需要提前做好充分准备。",
                    list: [
                        "关紧所有门窗",
                        "准备手电筒和食物",
                        "远离海边和河边",
                        "不要外出",
                        "听从气象部门的预警"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "台风的中心叫什么？",
                options: [
                    "风眼",
                    "风心",
                    "风口",
                    "风洞"
                ],
                correct: 0,
                explanation: "台风的中心叫做风眼，这里相对平静，但周围的风力很强。"
            },
            {
                question: "台风通常在哪里形成？",
                options: [
                    "陆地上",
                    "温暖的海洋上",
                    "高山上",
                    "沙漠中"
                ],
                correct: 1,
                explanation: "台风通常在温暖的海洋上形成，因为需要大量的水蒸气作为能量。"
            },
            {
                question: "台风来临时最安全的做法是什么？",
                options: [
                    "到海边观看",
                    "待在坚固建筑物内",
                    "在外面放风筝",
                    "开车兜风"
                ],
                correct: 1,
                explanation: "台风来临时应该待在坚固的建筑物内，关好门窗，不要外出。"
            }
        ]
    }
};

// 成就系统数据
const achievements = {
    firstVideo: {
        title: "视频观察家",
        description: "观看了第一个科普视频",
        icon: "🎬"
    },
    firstQuiz: {
        title: "知识探索者",
        description: "完成了第一个测验",
        icon: "🧠"
    },
    perfectScore: {
        title: "满分达人",
        description: "在测验中获得满分",
        icon: "⭐"
    },
    allDisasters: {
        title: "灾害专家",
        description: "学习了所有自然灾害",
        icon: "🏆"
    },
    quickLearner: {
        title: "快速学习者",
        description: "在30秒内完成测验",
        icon: "⚡"
    }
};

// 用户进度数据
let userProgress = {
    videosWatched: [],
    knowledgeRead: [],
    quizzesCompleted: [],
    achievements: [],
    totalScore: 0
}; 