// 自然灾害数据
const disastersData = {
    earthquake: {
        name: "地震",
        icon: "fa-mountain",
        color: "#8B4513",
        video: "https://www.youtube.com/embed/dJpIU1rSOFY", // What Is An Earthquake? | The Dr. Binocs Show
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
        video: "https://www.youtube.com/embed/HaEmIakO7f4", // Natural Disasters compilation | The Dr. Binocs Show (Tsunami section)
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
        video: "https://www.youtube.com/embed/lAmqsMQG3RM", // Volcano | The Dr. Binocs Show | Learn Videos For Kids
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
        video: "https://www.youtube.com/embed/fR8-yQlZ9Ts", // Storm 101 | Tornadoes, Hurricanes & More | The Dr Binocs Show
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
        video: "https://www.youtube.com/embed/fR8-yQlZ9Ts", // Storm 101 | Tornadoes, Hurricanes & More | The Dr Binocs Show
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
    },
    
    avalanche: {
        name: "雪崩",
        icon: "fa-mountain",
        color: "#E0E0E0",
        video: "https://www.youtube.com/embed/vZoTByhlrt0", // Dr Binocs show - What Causes an Avalanche?
        knowledge: {
            title: "雪崩小知识",
            sections: [
                {
                    title: "❄️ 什么是雪崩？",
                    content: "雪崩是山坡上大量积雪突然向下滑动的现象。就像一堆沙子突然塌下来一样，但雪崩的规模和速度要大得多！"
                },
                {
                    title: "🏔️ 雪崩是怎么形成的？",
                    content: "当山坡上的雪层变得不稳定时，一个小的震动或声音就可能引发雪崩。新雪、风和温度变化都会影响雪层的稳定性。"
                },
                {
                    title: "⚡ 雪崩的速度",
                    content: "雪崩的速度可以达到每小时200公里，比汽车还要快！而且雪崩会带着巨石和树木一起冲下山坡。"
                },
                {
                    title: "🛡️ 如何避免雪崩危险",
                    content: "在雪山地区活动时，要特别注意雪崩的预警信号，选择安全的路线。",
                    list: [
                        "避免在陡峭的雪坡上活动",
                        "注意天气预报和雪崩警告",
                        "不要大声喧哗或制造震动",
                        "携带雪崩救援设备",
                        "跟随有经验的向导"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "雪崩的速度可以达到多快？",
                options: [
                    "每小时20公里",
                    "每小时50公里",
                    "每小时200公里",
                    "每小时10公里"
                ],
                correct: 2,
                explanation: "雪崩的速度可以达到每小时200公里，比汽车还要快，非常危险。"
            },
            {
                question: "什么情况下容易发生雪崩？",
                options: [
                    "夏天",
                    "雪层不稳定时",
                    "没有风的时候",
                    "在平地上"
                ],
                correct: 1,
                explanation: "当山坡上的雪层变得不稳定时，很容易发生雪崩。"
            },
            {
                question: "在雪山地区应该怎么做才安全？",
                options: [
                    "大声唱歌",
                    "在陡坡上滑雪",
                    "跟随有经验的向导",
                    "一个人探险"
                ],
                correct: 2,
                explanation: "在雪山地区应该跟随有经验的向导，避免在危险区域活动。"
            }
        ]
    },
    
    toxic: {
        name: "毒物污染",
        icon: "fa-skull-crossbones",
        color: "#8B008B",
        video: "https://www.youtube.com/embed/fephtrPt6wk", // Air Pollution | What Causes Air Pollution? | The Dr Binocs Show
        knowledge: {
            title: "毒物污染小知识",
            sections: [
                {
                    title: "☠️ 什么是毒物污染？",
                    content: "毒物污染是指有害化学物质进入环境，对人类、动物和植物造成伤害。这些有毒物质可能来自工厂、农药、或者意外泄漏。"
                },
                {
                    title: "🏭 毒物污染的来源",
                    content: "毒物可能来自很多地方：工厂排放、农药使用、垃圾处理不当、交通工具排放等。有些毒物我们看不见也闻不到。"
                },
                {
                    title: "🤒 毒物对健康的影响",
                    content: "不同的毒物会对身体造成不同的伤害，可能引起头痛、恶心、皮肤过敏，严重时甚至危及生命。"
                },
                {
                    title: "🛡️ 如何保护自己",
                    content: "遇到毒物污染时，要立即采取保护措施，避免接触有害物质。",
                    list: [
                        "立即远离污染区域",
                        "不要触摸不明物质",
                        "用湿毛巾捂住口鼻",
                        "及时清洗接触部位",
                        "立即寻求医疗帮助"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "发现不明的化学物质泄漏时应该怎么办？",
                options: [
                    "靠近观察",
                    "用手触摸",
                    "立即远离",
                    "拍照留念"
                ],
                correct: 2,
                explanation: "发现不明化学物质时应该立即远离，避免接触，保护自己的安全。"
            },
            {
                question: "毒物污染可能来自哪里？",
                options: [
                    "只有工厂",
                    "只有农田",
                    "多种来源",
                    "只有垃圾场"
                ],
                correct: 2,
                explanation: "毒物污染可能来自工厂排放、农药使用、垃圾处理等多种来源。"
            },
            {
                question: "接触到有毒物质后应该立即做什么？",
                options: [
                    "继续活动",
                    "清洗接触部位",
                    "等待几小时",
                    "不用管它"
                ],
                correct: 1,
                explanation: "接触到有毒物质后应该立即清洗接触部位，并寻求医疗帮助。"
            }
        ]
    },
    
    radiation: {
        name: "辐射泄漏",
        icon: "fa-radiation-alt",
        color: "#FFD700",
        video: "https://www.youtube.com/embed/GPux33UVG_c", // What Causes Radioactive Pollution? | Radiation | The Dr Binocs Show
        knowledge: {
            title: "辐射泄漏小知识",
            sections: [
                {
                    title: "⚛️ 什么是辐射？",
                    content: "辐射是一种看不见、摸不着的能量。适量的辐射对人体无害，比如阳光和X光检查，但过量的辐射会对身体造成伤害。"
                },
                {
                    title: "🏥 辐射的用途",
                    content: "辐射在生活中有很多用途：医院的X光检查、核电站发电、食品保鲜等。但必须严格控制辐射的剂量。"
                },
                {
                    title: "⚠️ 辐射泄漏的危险",
                    content: "当核设施发生事故时，大量辐射可能泄漏到环境中。过量辐射会损害人体细胞，影响健康。"
                },
                {
                    title: "🛡️ 辐射防护措施",
                    content: "遇到辐射泄漏事故时，要立即采取防护措施，减少辐射暴露。",
                    list: [
                        "立即进入室内",
                        "关闭门窗和通风设备",
                        "收听官方消息",
                        "服用碘片（如果官方建议）",
                        "不要外出和食用当地食物"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "适量的辐射对人体有害吗？",
                options: [
                    "非常有害",
                    "完全无害",
                    "适量无害，过量有害",
                    "只对儿童有害"
                ],
                correct: 2,
                explanation: "适量的辐射对人体无害，比如阳光和医学检查，但过量辐射会对身体造成伤害。"
            },
            {
                question: "发生辐射泄漏时应该怎么办？",
                options: [
                    "到户外活动",
                    "立即进入室内",
                    "打开所有窗户",
                    "外出购买食物"
                ],
                correct: 1,
                explanation: "发生辐射泄漏时应该立即进入室内，关闭门窗，减少辐射暴露。"
            },
            {
                question: "辐射在医院主要用于什么？",
                options: [
                    "照明",
                    "加热",
                    "X光检查",
                    "清洁"
                ],
                correct: 2,
                explanation: "辐射在医院主要用于X光检查，帮助医生诊断疾病。"
            }
        ]
    },
    
    mudslide: {
        name: "泥石流",
        icon: "fa-hill-rockslide",
        color: "#8B4513",
        video: "https://www.youtube.com/embed/krJLnXpemtQ", // LANDSLIDE - The Dr. Binocs Show | Best Learning Videos
        knowledge: {
            title: "泥石流小知识",
            sections: [
                {
                    title: "🌊 什么是泥石流？",
                    content: "泥石流是山区特有的自然灾害，大量泥土、石块和水混合在一起，从山坡上快速流下。就像巧克力牛奶一样浓稠，但威力巨大！"
                },
                {
                    title: "🌧️ 泥石流是怎么形成的？",
                    content: "泥石流通常在大雨或暴雨后发生。雨水把山坡上的泥土冲松，加上石块和树木，形成了具有强大破坏力的泥石流。"
                },
                {
                    title: "💨 泥石流的特点",
                    content: "泥石流移动速度很快，可以达到每小时60公里，而且粘稠度很高，能够携带巨大的石块和树木。"
                },
                {
                    title: "🏃 如何避免泥石流危险",
                    content: "泥石流主要发生在山区，特别是雨季。了解预警信号很重要。",
                    list: [
                        "暴雨时避免在山区活动",
                        "注意山上异常响声",
                        "发现泥石流立即向两侧山坡跑",
                        "不要沿着沟谷逃跑",
                        "听从当地政府的疏散指令"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "泥石流通常在什么时候发生？",
                options: [
                    "晴天",
                    "大雨或暴雨后",
                    "冬天",
                    "无风的时候"
                ],
                correct: 1,
                explanation: "泥石流通常在大雨或暴雨后发生，因为雨水会把山坡上的泥土冲松。"
            },
            {
                question: "发现泥石流时应该向哪个方向逃跑？",
                options: [
                    "沿着沟谷向下跑",
                    "向两侧山坡跑",
                    "向泥石流方向跑",
                    "站在原地不动"
                ],
                correct: 1,
                explanation: "发现泥石流时应该立即向两侧山坡跑，不要沿着沟谷逃跑。"
            },
            {
                question: "泥石流的速度大约是多少？",
                options: [
                    "每小时5公里",
                    "每小时60公里",
                    "每小时200公里",
                    "每小时1公里"
                ],
                correct: 1,
                explanation: "泥石流的速度可以达到每小时60公里，移动非常快。"
            }
        ]
    },
    
    wildfire: {
        name: "山火",
        icon: "fa-fire",
        color: "#FF6347",
        video: "https://www.youtube.com/embed/Xgc90CoJbDI", // Fire Safety Education for Kids | The Dr Binocs Show
        knowledge: {
            title: "山火小知识",
            sections: [
                {
                    title: "🔥 什么是山火？",
                    content: "山火是在森林、草原等自然环境中发生的大规模火灾。火势蔓延很快，会烧毁大片森林，对环境和野生动物造成巨大损害。"
                },
                {
                    title: "⚡ 山火是怎么引起的？",
                    content: "山火可能由闪电、干旱、人为因素（如野外用火不当、乱扔烟头）等引起。干燥的天气和强风会让火势蔓延得更快。"
                },
                {
                    title: "🌪️ 山火的危险性",
                    content: "山火不仅烧毁森林，还会产生大量浓烟和有毒气体，影响空气质量。火势蔓延速度很快，温度极高。"
                },
                {
                    title: "🛡️ 山火防护措施",
                    content: "预防山火和在山火发生时保护自己都很重要。",
                    list: [
                        "野外不要随意用火",
                        "不要乱扔烟头",
                        "发现山火立即报警",
                        "用湿毛巾捂住口鼻",
                        "向没有植被的空旷地带撤离"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "山火可能由什么引起？",
                options: [
                    "只有闪电",
                    "只有人为因素",
                    "多种原因",
                    "只有干旱"
                ],
                correct: 2,
                explanation: "山火可能由闪电、干旱、人为因素等多种原因引起。"
            },
            {
                question: "发现山火时应该怎么办？",
                options: [
                    "靠近观察",
                    "立即报警",
                    "用水扑灭",
                    "继续野餐"
                ],
                correct: 1,
                explanation: "发现山火时应该立即报警，让专业消防人员来处理。"
            },
            {
                question: "山火发生时应该向哪里撤离？",
                options: [
                    "森林深处",
                    "向风的方向",
                    "没有植被的空旷地带",
                    "山顶"
                ],
                correct: 2,
                explanation: "山火发生时应该向没有植被的空旷地带撤离，避免火势蔓延。"
            }
        ]
    },
    drought: {
        name: "干旱",
        icon: "fa-tint-slash",
        color: "#CD853F",
        video: "https://www.youtube.com/embed/O5a6yHSI0L0", // Drought - The Dr. Binocs Show
        knowledge: {
            title: "干旱小知识",
            sections: [
                {
                    title: "🏜️ 什么是干旱？",
                    content: "干旱是指一个地区很长一段时间都没有下雨或雨水很少，导致土地变得非常干燥，河流和湖泊的水位下降。"
                },
                {
                    title: "☀️ 干旱是怎么形成的？",
                    content: "干旱通常是因为天气模式的改变，导致雨云无法到达某个地区。有时候，全球变暖也会让干旱变得更频繁、更严重。"
                },
                {
                    title: "💧 干旱有什么影响？",
                    content: "干旱会导致农作物枯萎，人们和动物没有足够的水喝。它还会增加发生山火的风险，因为一切都太干燥了。"
                },
                {
                    title: "🌱 我们如何节约用水？",
                    content: "节约用水是应对干旱的最好方法。每个人都可以做出贡献！",
                    list: [
                        "刷牙时关掉水龙头",
                        "缩短淋浴时间",
                        "告诉大人修理漏水的水龙头",
                        "用洗过蔬菜的水来浇花",
                        "不要玩水龙头或消防栓"
                    ]
                }
            ]
        },
        quiz: [
            {
                question: "干旱的主要原因是什么？",
                options: [
                    "下雨太多",
                    "长时间不下雨",
                    "下雪",
                    "刮大风"
                ],
                correct: 1,
                explanation: "干旱是因为一个地区长时间没有充足的降雨，导致水资源短缺。"
            },
            {
                question: "我们应该如何帮助应对干旱？",
                options: [
                    "刷牙时一直开着水龙头",
                    "每天长时间淋浴",
                    "发现水龙头漏水要告诉大人",
                    "玩水"
                ],
                correct: 2,
                explanation: "节约用水是应对干旱的最好方法，比如修理漏水的水龙头，缩短淋浴时间等。"
            },
            {
                question: "干旱会带来什么危险？",
                options: [
                    "洪水",
                    "山火风险增加",
                    "地面结冰",
                    "空气更清新"
                ],
                correct: 1,
                explanation: "干旱使植被和土壤变得非常干燥，这会大大增加山火发生的风险。"
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