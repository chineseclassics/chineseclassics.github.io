// 主要JavaScript逻辑

// 当前选中的灾害
let currentDisaster = null;
let quizStartTime = null;

// 当前活动的3D场景
let activeScenes = {};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    setupCardListeners();
    setupModalListeners();
    loadUserProgress();
    updateAchievementDisplay();
});

// 设置卡片点击事件
function setupCardListeners() {
    const cardContainers = document.querySelectorAll('.disaster-card-container');
    cardContainers.forEach(container => {
        const disasterType = container.dataset.disaster;
        const card = container.querySelector('.disaster-card');
        const flipHint = container.querySelector('.flip-hint');
        
        // 点击翻转提示或卡片进行翻转
        if (flipHint) {
            flipHint.addEventListener('click', function(e) {
                e.stopPropagation();
                flipCard(container, disasterType);
            });
        }
        
        // 点击卡片本身也可以翻转（除了按钮区域）
        card.addEventListener('click', function(e) {
            // 如果点击的是按钮，不进行翻转
            if (e.target.closest('.btn')) {
                return;
            }
            flipCard(container, disasterType);
        });
    });
}

// 翻转卡片
function flipCard(container, disasterType) {
    const card = container.querySelector('.disaster-card');
    const isFlipped = card.classList.contains('flipped');
    
    if (!isFlipped) {
        // 翻转到背面
        card.classList.add('flipped');
        
        // 延迟初始化3D场景，等待翻转动画完成
        setTimeout(() => {
            initCardThreeScene(disasterType);
        }, 300);
    } else {
        // 翻转到正面
        card.classList.remove('flipped');
        
        // 清理3D场景
        if (activeScenes[disasterType]) {
            const sceneContainer = document.getElementById(`three-scene-${disasterType}`);
            if (sceneContainer) {
                sceneContainer.innerHTML = '';
            }
            delete activeScenes[disasterType];
        }
    }
}

// 返回按钮的处理函数
function flipCardBack(element) {
    const container = element.closest('.disaster-card-container');
    const disasterType = container.dataset.disaster;
    const card = container.querySelector('.disaster-card');
    
    // 翻转到正面
    card.classList.remove('flipped');
    
    // 清理3D场景
    if (activeScenes[disasterType]) {
        const sceneContainer = document.getElementById(`three-scene-${disasterType}`);
        if (sceneContainer) {
            sceneContainer.innerHTML = '';
        }
        delete activeScenes[disasterType];
    }
}

// 为卡片背面初始化3D场景
function initCardThreeScene(disasterType) {
    const container = document.getElementById(`three-scene-${disasterType}`);
    if (!container || activeScenes[disasterType]) return;
    
    // 创建场景、相机、渲染器
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
    
    // 存储场景信息
    activeScenes[disasterType] = {
        scene: scene,
        camera: camera,
        renderer: renderer,
        container: container,
        animation: null
    };
    
    // 根据灾害类型创建特效
    createCardDisasterEffect(disasterType);
    
    // 开始动画循环
    animateCardScene(disasterType);
    
    // 响应式调整
    function onResize() {
        if (activeScenes[disasterType]) {
            const { camera, renderer, container } = activeScenes[disasterType];
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
    
    window.addEventListener('resize', onResize);
}

// 卡片场景动画循环
function animateCardScene(disasterType) {
    if (!activeScenes[disasterType]) return;
    
    const { scene, camera, renderer, animation } = activeScenes[disasterType];
    
    function animate() {
        if (!activeScenes[disasterType]) return; // 场景已被清理
        
        requestAnimationFrame(animate);
        
        if (animation) {
            animation();
        }
        
        renderer.render(scene, camera);
    }
    
    animate();
}

// 为卡片场景创建灾害特效
function createCardDisasterEffect(disasterType) {
    if (!activeScenes[disasterType]) return;
    
    const { scene } = activeScenes[disasterType];
    
    // 清空场景（保留光源）
    const objectsToRemove = [];
    scene.traverse(child => {
        if (child !== scene && child.type !== 'AmbientLight' && child.type !== 'DirectionalLight') {
            objectsToRemove.push(child);
        }
    });
    objectsToRemove.forEach(obj => scene.remove(obj));
    
    switch (disasterType) {
        case 'earthquake':
            createCardEarthquakeEffect(disasterType);
            break;
        case 'tsunami':
            createCardTsunamiEffect(disasterType);
            break;
        case 'volcano':
            createCardVolcanoEffect(disasterType);
            break;
        case 'tornado':
            createCardTornadoEffect(disasterType);
            break;
        case 'flood':
            createCardFloodEffect(disasterType);
            break;
        case 'hurricane':
            createCardHurricaneEffect(disasterType);
            break;
        case 'avalanche':
            createCardAvalancheEffect(disasterType);
            break;
        case 'toxic':
            createCardToxicEffect(disasterType);
            break;
        case 'radiation':
            createCardRadiationEffect(disasterType);
            break;
        case 'mudslide':
            createCardMudslideEffect(disasterType);
            break;
        case 'wildfire':
            createCardWildfireEffect(disasterType);
            break;
    }
}

// 卡片地震特效
function createCardEarthquakeEffect(disasterType) {
    const { scene } = activeScenes[disasterType];
    
    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(15, 15);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // 创建建筑物
    const buildings = [];
    for (let i = 0; i < 5; i++) {
        const height = Math.random() * 2 + 1;
        const geometry = new THREE.BoxGeometry(0.8, height, 0.8);
        const material = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(
            (Math.random() - 0.5) * 10,
            height / 2,
            (Math.random() - 0.5) * 10
        );
        buildings.push(building);
        scene.add(building);
    }
    
    activeScenes[disasterType].animation = function() {
        const shakeIntensity = Math.sin(Date.now() * 0.01) * 0.03;
        buildings.forEach(building => {
            building.rotation.z = Math.sin(Date.now() * 0.02) * 0.05;
            building.position.x += (Math.random() - 0.5) * shakeIntensity;
            building.position.z += (Math.random() - 0.5) * shakeIntensity;
        });
    };
}

// 卡片海啸特效
function createCardTsunamiEffect(disasterType) {
    const { scene } = activeScenes[disasterType];
    
    // 创建海洋
    const oceanGeometry = new THREE.PlaneGeometry(20, 20, 15, 15);
    const oceanMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x006994,
        transparent: true,
        opacity: 0.8 
    });
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    scene.add(ocean);
    
    // 创建波浪
    const waves = [];
    for (let i = 0; i < 3; i++) {
        const waveGeometry = new THREE.SphereGeometry(0.8, 12, 12);
        const waveMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4FC3F7,
            transparent: true,
            opacity: 0.7
        });
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.position.set(0, 1.5, -8 + i * 4);
        wave.scale.set(2.5, 0.8, 0.8);
        waves.push(wave);
        scene.add(wave);
    }
    
    activeScenes[disasterType].animation = function() {
        const time = Date.now() * 0.005;
        waves.forEach((wave, index) => {
            wave.position.z += 0.15;
            wave.position.y = 1.5 + Math.sin(time + index) * 0.3;
            if (wave.position.z > 10) {
                wave.position.z = -10;
            }
        });
    };
}

// 卡片火山特效
function createCardVolcanoEffect(disasterType) {
    const { scene } = activeScenes[disasterType];
    
    // 创建火山
    const volcanoGeometry = new THREE.ConeGeometry(2, 4, 8);
    const volcanoMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const volcano = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
    volcano.position.y = 2;
    scene.add(volcano);
    
    // 创建熔岩粒子
    const particles = [];
    for (let i = 0; i < 20; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 6, 6);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500 });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particles.push({
            mesh: particle,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.3 + 0.1,
                (Math.random() - 0.5) * 0.2
            ),
            life: Math.random() * 100
        });
        scene.add(particle);
    }
    
    activeScenes[disasterType].animation = function() {
        particles.forEach(particle => {
            particle.mesh.position.add(particle.velocity);
            particle.velocity.y -= 0.005; // 重力
            particle.life--;
            
            if (particle.life <= 0 || particle.mesh.position.y < 0) {
                particle.mesh.position.set(0, 4, 0);
                particle.velocity.set(
                    (Math.random() - 0.5) * 0.2,
                    Math.random() * 0.3 + 0.1,
                    (Math.random() - 0.5) * 0.2
                );
                particle.life = Math.random() * 100;
            }
        });
    };
}

// 卡片龙卷风特效
function createCardTornadoEffect(disasterType) {
    const { scene } = activeScenes[disasterType];
    
    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(15, 15);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // 创建龙卷风粒子
    const tornadoParticles = [];
    for (let i = 0; i < 30; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        tornadoParticles.push(particle);
        scene.add(particle);
    }
    
    activeScenes[disasterType].animation = function() {
        const time = Date.now() * 0.01;
        tornadoParticles.forEach((particle, index) => {
            const height = (index / tornadoParticles.length) * 8;
            const radius = (8 - height) * 0.3;
            const angle = time * 2 + index * 0.5;
            
            particle.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
        });
    };
}

// 卡片洪水特效
function createCardFloodEffect(disasterType) {
    const { scene } = activeScenes[disasterType];
    
    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(15, 15);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // 创建水面
    const waterGeometry = new THREE.PlaneGeometry(15, 15, 10, 10);
    const waterMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4682B4,
        transparent: true,
        opacity: 0.7
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.5;
    scene.add(water);
    
    // 创建房屋
    const houses = [];
    for (let i = 0; i < 3; i++) {
        const houseGeometry = new THREE.BoxGeometry(1, 1, 1);
        const houseMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.set(
            (Math.random() - 0.5) * 8,
            0.5,
            (Math.random() - 0.5) * 8
        );
        houses.push(house);
        scene.add(house);
    }
    
    activeScenes[disasterType].animation = function() {
        const time = Date.now() * 0.005;
        water.position.y = 0.5 + Math.sin(time) * 0.2;
        
        // 让房屋漂浮
        houses.forEach((house, index) => {
            house.position.y = Math.max(0.5, water.position.y + Math.sin(time + index) * 0.1);
        });
    };
}

// 卡片台风特效
function createCardHurricaneEffect(disasterType) {
    const { scene } = activeScenes[disasterType];
    
    // 创建云层
    const clouds = [];
    for (let i = 0; i < 15; i++) {
        const cloudGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const cloudMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8
        });
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        clouds.push(cloud);
        scene.add(cloud);
    }
    
    activeScenes[disasterType].animation = function() {
        const time = Date.now() * 0.005;
        clouds.forEach((cloud, index) => {
            const radius = 2 + (index % 3) * 1.5;
            const height = 3 + (index % 4) * 1;
            const angle = time * 0.5 + index * 0.4;
            
            cloud.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            cloud.rotation.y = angle;
        });
    };
}

// 雪崩特效
function createCardAvalancheEffect(disasterType) {
    if (!activeScenes[disasterType]) return;
    
    const { scene } = activeScenes[disasterType];
    
    // 创建山坡
    const mountainGeometry = new THREE.ConeGeometry(5, 8, 6);
    const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountain.position.set(0, -2, 0);
    scene.add(mountain);
    
    // 创建雪层
    const snowGeometry = new THREE.ConeGeometry(5.2, 8.5, 6);
    const snowMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const snowLayer = new THREE.Mesh(snowGeometry, snowMaterial);
    snowLayer.position.set(0, -2, 0);
    scene.add(snowLayer);
    
    // 创建雪崩粒子
    const snowParticles = [];
    for (let i = 0; i < 100; i++) {
        const snowball = new THREE.Mesh(
            new THREE.SphereGeometry(0.1 + Math.random() * 0.2),
            new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
        );
        snowball.position.set(
            Math.random() * 8 - 4,
            Math.random() * 8 + 2,
            Math.random() * 8 - 4
        );
        snowball.velocity = {
            x: (Math.random() - 0.5) * 0.2,
            y: -Math.random() * 0.3 - 0.1,
            z: (Math.random() - 0.5) * 0.2
        };
        scene.add(snowball);
        snowParticles.push(snowball);
    }
    
    // 动画函数
    activeScenes[disasterType].animation = () => {
        snowParticles.forEach(snowball => {
            snowball.position.x += snowball.velocity.x;
            snowball.position.y += snowball.velocity.y;
            snowball.position.z += snowball.velocity.z;
            
            snowball.velocity.y -= 0.01; // 重力
            
            // 重置位置
            if (snowball.position.y < -5) {
                snowball.position.set(
                    Math.random() * 8 - 4,
                    8,
                    Math.random() * 8 - 4
                );
                snowball.velocity = {
                    x: (Math.random() - 0.5) * 0.2,
                    y: -Math.random() * 0.3 - 0.1,
                    z: (Math.random() - 0.5) * 0.2
                };
            }
        });
        
        mountain.rotation.y += 0.005;
        snowLayer.rotation.y += 0.005;
    };
}

// 毒物污染特效
function createCardToxicEffect(disasterType) {
    if (!activeScenes[disasterType]) return;
    
    const { scene } = activeScenes[disasterType];
    
    // 创建工厂建筑
    const factoryGeometry = new THREE.BoxGeometry(3, 4, 2);
    const factoryMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const factory = new THREE.Mesh(factoryGeometry, factoryMaterial);
    factory.position.set(0, 0, 0);
    scene.add(factory);
    
    // 创建烟囱
    const chimneyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3);
    const chimneyMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    chimney.position.set(1, 3.5, 0);
    scene.add(chimney);
    
    // 创建毒气粒子
    const toxicParticles = [];
    for (let i = 0; i < 50; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.1),
            new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(0.3, 0.7, 0.5),
                transparent: true,
                opacity: 0.6
            })
        );
        particle.position.set(
            1 + Math.random() * 2 - 1,
            5 + Math.random() * 3,
            0 + Math.random() * 2 - 1
        );
        particle.velocity = {
            x: (Math.random() - 0.5) * 0.1,
            y: Math.random() * 0.1 + 0.05,
            z: (Math.random() - 0.5) * 0.1
        };
        scene.add(particle);
        toxicParticles.push(particle);
    }
    
    // 动画函数
    activeScenes[disasterType].animation = () => {
        toxicParticles.forEach(particle => {
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;
            particle.position.z += particle.velocity.z;
            
            // 重置位置
            if (particle.position.y > 10) {
                particle.position.set(
                    1 + Math.random() * 2 - 1,
                    5,
                    0 + Math.random() * 2 - 1
                );
            }
            
            // 变色效果
            const hue = (Date.now() * 0.001 + particle.position.y * 0.1) % 1;
            particle.material.color.setHSL(hue * 0.3, 0.7, 0.5);
        });
        
        factory.rotation.y += 0.005;
    };
}

// 辐射泄漏特效
function createCardRadiationEffect(disasterType) {
    if (!activeScenes[disasterType]) return;
    
    const { scene } = activeScenes[disasterType];
    
    // 创建核电站建筑
    const reactorGeometry = new THREE.CylinderGeometry(2, 2, 3);
    const reactorMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const reactor = new THREE.Mesh(reactorGeometry, reactorMaterial);
    reactor.position.set(0, 0, 0);
    scene.add(reactor);
    
    // 创建冷却塔
    const towerGeometry = new THREE.CylinderGeometry(1.5, 2.5, 4);
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.set(3, 0, 0);
    scene.add(tower);
    
    // 创建辐射粒子
    const radiationParticles = [];
    for (let i = 0; i < 80; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05),
            new THREE.MeshLambertMaterial({ 
                color: 0xFFFF00,
                transparent: true,
                opacity: 0.8
            })
        );
        particle.position.set(
            Math.random() * 10 - 5,
            Math.random() * 10 - 2,
            Math.random() * 10 - 5
        );
        particle.velocity = {
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2,
            z: (Math.random() - 0.5) * 0.2
        };
        scene.add(particle);
        radiationParticles.push(particle);
    }
    
    // 创建警告符号
    const warningGeometry = new THREE.RingGeometry(0.5, 1, 3);
    const warningMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xFFD700,
        transparent: true,
        opacity: 0.7
    });
    const warning = new THREE.Mesh(warningGeometry, warningMaterial);
    warning.position.set(0, 3, 0);
    scene.add(warning);
    
    // 动画函数
    activeScenes[disasterType].animation = () => {
        radiationParticles.forEach(particle => {
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;
            particle.position.z += particle.velocity.z;
            
            // 边界检查
            if (Math.abs(particle.position.x) > 8 ||
                Math.abs(particle.position.y) > 8 ||
                Math.abs(particle.position.z) > 8) {
                particle.position.set(
                    Math.random() * 4 - 2,
                    Math.random() * 4 - 2,
                    Math.random() * 4 - 2
                );
            }
            
            // 闪烁效果
            particle.material.opacity = 0.4 + 0.4 * Math.sin(Date.now() * 0.005 + particle.position.x);
        });
        
        warning.rotation.z += 0.05;
        reactor.rotation.y += 0.01;
    };
}

// 泥石流特效
function createCardMudslideEffect(disasterType) {
    if (!activeScenes[disasterType]) return;
    
    const { scene } = activeScenes[disasterType];
    
    // 创建山坡
    const slopeGeometry = new THREE.PlaneGeometry(8, 10);
    const slopeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const slope = new THREE.Mesh(slopeGeometry, slopeMaterial);
    slope.rotation.x = -Math.PI / 3;
    slope.position.set(0, 0, 2);
    scene.add(slope);
    
    // 创建泥石流粒子
    const mudParticles = [];
    for (let i = 0; i < 150; i++) {
        const size = Math.random() * 0.3 + 0.1;
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(size),
            new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(0.1, 0.6, 0.3 + Math.random() * 0.3)
            })
        );
        particle.position.set(
            Math.random() * 6 - 3,
            4 + Math.random() * 3,
            Math.random() * 6 - 3
        );
        particle.velocity = {
            x: (Math.random() - 0.5) * 0.3,
            y: -Math.random() * 0.4 - 0.2,
            z: Math.random() * 0.3 + 0.2
        };
        scene.add(particle);
        mudParticles.push(particle);
    }
    
    // 创建石块
    const rocks = [];
    for (let i = 0; i < 20; i++) {
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3),
            new THREE.MeshLambertMaterial({ color: 0x696969 })
        );
        rock.position.set(
            Math.random() * 6 - 3,
            4 + Math.random() * 3,
            Math.random() * 6 - 3
        );
        rock.velocity = {
            x: (Math.random() - 0.5) * 0.2,
            y: -Math.random() * 0.3 - 0.1,
            z: Math.random() * 0.2 + 0.1
        };
        scene.add(rock);
        rocks.push(rock);
    }
    
    // 动画函数
    activeScenes[disasterType].animation = () => {
        mudParticles.forEach(particle => {
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;
            particle.position.z += particle.velocity.z;
            
            particle.velocity.y -= 0.01; // 重力
            
            // 重置位置
            if (particle.position.y < -3) {
                particle.position.set(
                    Math.random() * 6 - 3,
                    7,
                    Math.random() * 6 - 3
                );
                particle.velocity = {
                    x: (Math.random() - 0.5) * 0.3,
                    y: -Math.random() * 0.4 - 0.2,
                    z: Math.random() * 0.3 + 0.2
                };
            }
        });
        
        rocks.forEach(rock => {
            rock.position.x += rock.velocity.x;
            rock.position.y += rock.velocity.y;
            rock.position.z += rock.velocity.z;
            
            rock.velocity.y -= 0.01;
            rock.rotation.x += 0.05;
            rock.rotation.z += 0.03;
            
            if (rock.position.y < -3) {
                rock.position.set(
                    Math.random() * 6 - 3,
                    7,
                    Math.random() * 6 - 3
                );
                rock.velocity = {
                    x: (Math.random() - 0.5) * 0.2,
                    y: -Math.random() * 0.3 - 0.1,
                    z: Math.random() * 0.2 + 0.1
                };
            }
        });
    };
}

// 山火特效
function createCardWildfireEffect(disasterType) {
    if (!activeScenes[disasterType]) return;
    
    const { scene } = activeScenes[disasterType];
    
    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3;
    scene.add(ground);
    
    // 创建树木
    const trees = [];
    for (let i = 0; i < 15; i++) {
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.2, 2),
            new THREE.MeshLambertMaterial({ color: 0x8B4513 })
        );
        const leaves = new THREE.Mesh(
            new THREE.SphereGeometry(0.8),
            new THREE.MeshLambertMaterial({ color: 0x228B22 })
        );
        
        const x = Math.random() * 8 - 4;
        const z = Math.random() * 8 - 4;
        
        trunk.position.set(x, -2, z);
        leaves.position.set(x, -0.5, z);
        
        scene.add(trunk);
        scene.add(leaves);
        trees.push({ trunk, leaves });
    }
    
    // 创建火焰粒子
    const fireParticles = [];
    for (let i = 0; i < 100; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.1),
            new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(0.1, 1, 0.5),
                transparent: true,
                opacity: 0.8
            })
        );
        particle.position.set(
            Math.random() * 8 - 4,
            Math.random() * 4 - 2,
            Math.random() * 8 - 4
        );
        particle.velocity = {
            x: (Math.random() - 0.5) * 0.1,
            y: Math.random() * 0.2 + 0.1,
            z: (Math.random() - 0.5) * 0.1
        };
        scene.add(particle);
        fireParticles.push(particle);
    }
    
    // 创建烟雾粒子
    const smokeParticles = [];
    for (let i = 0; i < 50; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.2),
            new THREE.MeshLambertMaterial({ 
                color: 0x666666,
                transparent: true,
                opacity: 0.4
            })
        );
        particle.position.set(
            Math.random() * 8 - 4,
            Math.random() * 4 + 1,
            Math.random() * 8 - 4
        );
        particle.velocity = {
            x: (Math.random() - 0.5) * 0.05,
            y: Math.random() * 0.15 + 0.1,
            z: (Math.random() - 0.5) * 0.05
        };
        scene.add(particle);
        smokeParticles.push(particle);
    }
    
    // 动画函数
    activeScenes[disasterType].animation = () => {
        fireParticles.forEach(particle => {
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;
            particle.position.z += particle.velocity.z;
            
            // 重置位置
            if (particle.position.y > 4) {
                particle.position.set(
                    Math.random() * 8 - 4,
                    -2,
                    Math.random() * 8 - 4
                );
            }
            
            // 火焰颜色变化
            const hue = 0.1 - particle.position.y * 0.02;
            particle.material.color.setHSL(Math.max(0, hue), 1, 0.5);
            particle.material.opacity = 0.8 - particle.position.y * 0.1;
        });
        
        smokeParticles.forEach(particle => {
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;
            particle.position.z += particle.velocity.z;
            
            if (particle.position.y > 8) {
                particle.position.set(
                    Math.random() * 8 - 4,
                    1,
                    Math.random() * 8 - 4
                );
            }
            
            particle.material.opacity = 0.4 - particle.position.y * 0.04;
        });
        
        // 树木轻微摇摆
        trees.forEach(tree => {
            tree.trunk.rotation.z = Math.sin(Date.now() * 0.002) * 0.1;
            tree.leaves.rotation.z = Math.sin(Date.now() * 0.002) * 0.1;
        });
    };
}

// 设置模态窗口事件
function setupModalListeners() {
    // 点击背景关闭模态窗口
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // ESC键关闭模态窗口
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// 打开视频模态窗口
function openVideo(disasterType) {
    const modal = document.getElementById('video-modal');
    const title = document.getElementById('video-title');
    const container = document.getElementById('video-container');
    
    const disaster = disastersData[disasterType];
    title.textContent = `${disaster.name} - 科普视频`;
    
    // 创建YouTube iframe
    container.innerHTML = `
        <iframe src="${disaster.video}?autoplay=1&modestbranding=1&rel=0" 
                allow="autoplay; encrypted-media" 
                allowfullscreen>
        </iframe>
    `;
    
    modal.style.display = 'block';
    
    // 记录观看记录
    if (!userProgress.videosWatched.includes(disasterType)) {
        userProgress.videosWatched.push(disasterType);
        checkAchievements();
        saveUserProgress();
    }
}

// 打开学习模态窗口
function openLearning(disasterType) {
    const modal = document.getElementById('learning-modal');
    const title = document.getElementById('learning-title');
    const content = document.getElementById('learning-content');
    
    const disaster = disastersData[disasterType];
    title.textContent = disaster.knowledge.title;
    
    // 生成学习内容HTML
    let html = '';
    disaster.knowledge.sections.forEach(section => {
        html += `
            <div class="learning-section">
                <h3>${section.title}</h3>
                <p>${section.content}</p>
        `;
        
        if (section.list) {
            html += '<ul>';
            section.list.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }
        
        html += '</div>';
    });
    
    content.innerHTML = html;
    modal.style.display = 'block';
    
    // 记录学习记录
    if (!userProgress.knowledgeRead.includes(disasterType)) {
        userProgress.knowledgeRead.push(disasterType);
        checkAchievements();
        saveUserProgress();
    }
}

// 打开测验模态窗口
function openQuiz(disasterType) {
    const modal = document.getElementById('quiz-modal');
    const title = document.getElementById('quiz-title');
    const content = document.getElementById('quiz-content');
    
    const disaster = disastersData[disasterType];
    title.textContent = `${disaster.name} - 知识测验`;
    
    // 记录测验开始时间
    quizStartTime = Date.now();
    
    // 生成测验HTML
    let html = '<div class="quiz-container">';
    
    disaster.quiz.forEach((question, qIndex) => {
        html += `
            <div class="quiz-question" data-question="${qIndex}">
                <h3>问题 ${qIndex + 1}: ${question.question}</h3>
                <div class="quiz-options">
        `;
        
        question.options.forEach((option, oIndex) => {
            html += `
                <div class="quiz-option" data-question="${qIndex}" data-option="${oIndex}" onclick="selectQuizOption(${qIndex}, ${oIndex})">
                    <span class="option-letter">${String.fromCharCode(65 + oIndex)}.</span>
                    <span class="option-text">${option}</span>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="quiz-explanation" id="explanation-${qIndex}" style="display: none;">
                    <p><strong>解释：</strong>${question.explanation}</p>
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="quiz-actions">
            <button class="btn btn-quiz" onclick="submitQuiz('${disasterType}')" id="submit-quiz" disabled>
                <i class="fas fa-check"></i> 提交答案
            </button>
        </div>
    </div>`;
    
    content.innerHTML = html;
    modal.style.display = 'block';
}

// 选择测验选项
function selectQuizOption(questionIndex, optionIndex) {
    const questionDiv = document.querySelector(`[data-question="${questionIndex}"]`);
    const options = questionDiv.querySelectorAll('.quiz-option');
    
    // 清除之前的选择
    options.forEach(option => option.classList.remove('selected'));
    
    // 选中当前选项
    const selectedOption = questionDiv.querySelector(`[data-option="${optionIndex}"]`);
    selectedOption.classList.add('selected');
    
    // 检查是否所有问题都已回答
    checkQuizCompletion();
}

// 检查测验是否完成
function checkQuizCompletion() {
    const allQuestions = document.querySelectorAll('.quiz-question');
    const answeredQuestions = document.querySelectorAll('.quiz-option.selected');
    
    const submitButton = document.getElementById('submit-quiz');
    if (answeredQuestions.length === allQuestions.length) {
        submitButton.disabled = false;
        submitButton.classList.add('pulse');
    }
}

// 提交测验
function submitQuiz(disasterType) {
    const disaster = disastersData[disasterType];
    let correctAnswers = 0;
    
    disaster.quiz.forEach((question, qIndex) => {
        const selectedOption = document.querySelector(`[data-question="${qIndex}"].quiz-option.selected`);
        if (selectedOption) {
            const selectedIndex = parseInt(selectedOption.dataset.option);
            const options = document.querySelectorAll(`[data-question="${qIndex}"].quiz-option`);
            
            // 显示正确答案
            options.forEach((option, oIndex) => {
                option.classList.remove('selected');
                if (oIndex === question.correct) {
                    option.classList.add('correct');
                } else if (oIndex === selectedIndex && selectedIndex !== question.correct) {
                    option.classList.add('incorrect');
                }
            });
            
            // 显示解释
            document.getElementById(`explanation-${qIndex}`).style.display = 'block';
            
            if (selectedIndex === question.correct) {
                correctAnswers++;
            }
        }
    });
    
    // 计算得分
    const score = Math.round((correctAnswers / disaster.quiz.length) * 100);
    const quizTime = Date.now() - quizStartTime;
    
    // 显示结果
    showQuizResult(disasterType, correctAnswers, disaster.quiz.length, score, quizTime);
    
    // 记录测验记录
    if (!userProgress.quizzesCompleted.includes(disasterType)) {
        userProgress.quizzesCompleted.push(disasterType);
        userProgress.totalScore += score;
        checkAchievements(score, quizTime);
        saveUserProgress();
    }
    
    // 隐藏提交按钮
    document.getElementById('submit-quiz').style.display = 'none';
}

// 显示测验结果
function showQuizResult(disasterType, correct, total, score, time) {
    const content = document.getElementById('quiz-content');
    
    let resultClass = 'success';
    let resultMessage = '太棒了！';
    let resultIcon = '🎉';
    
    if (score < 60) {
        resultClass = 'partial';
        resultMessage = '继续努力！';
        resultIcon = '💪';
    } else if (score < 100) {
        resultClass = 'partial';
        resultMessage = '不错哦！';
        resultIcon = '👍';
    }
    
    const resultHtml = `
        <div class="quiz-result ${resultClass}">
            <h3>${resultIcon} ${resultMessage}</h3>
            <p>你答对了 ${correct} / ${total} 道题</p>
            <p>得分：${score} 分</p>
            <p>用时：${Math.round(time / 1000)} 秒</p>
            <button class="btn btn-learn" onclick="openLearning('${disasterType}')">
                <i class="fas fa-book"></i> 重新学习
            </button>
            <button class="btn btn-quiz" onclick="openQuiz('${disasterType}')">
                <i class="fas fa-redo"></i> 重新测验
            </button>
        </div>
    `;
    
    content.innerHTML = content.innerHTML + resultHtml;
}

// 关闭模态窗口
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    
    // 如果是视频模态窗口，停止视频播放
    if (modalId === 'video-modal') {
        document.getElementById('video-container').innerHTML = '';
    }
}

// 关闭所有模态窗口
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.getElementById('video-container').innerHTML = '';
}

// 检查成就
function checkAchievements(score = 0, time = 0) {
    const newAchievements = [];
    
    // 第一个视频
    if (userProgress.videosWatched.length === 1 && !userProgress.achievements.includes('firstVideo')) {
        newAchievements.push('firstVideo');
    }
    
    // 第一个测验
    if (userProgress.quizzesCompleted.length === 1 && !userProgress.achievements.includes('firstQuiz')) {
        newAchievements.push('firstQuiz');
    }
    
    // 满分
    if (score === 100 && !userProgress.achievements.includes('perfectScore')) {
        newAchievements.push('perfectScore');
    }
    
    // 快速学习者（30秒内完成测验）
    if (time < 30000 && score >= 60 && !userProgress.achievements.includes('quickLearner')) {
        newAchievements.push('quickLearner');
    }
    
    // 灾害专家（学习所有灾害）
    if (userProgress.knowledgeRead.length === 6 && !userProgress.achievements.includes('allDisasters')) {
        newAchievements.push('allDisasters');
    }
    
    // 添加新成就
    newAchievements.forEach(achievement => {
        userProgress.achievements.push(achievement);
        showAchievementNotification(achievement);
    });
    
    updateAchievementDisplay();
}

// 显示成就通知
function showAchievementNotification(achievementId) {
    const achievement = achievements[achievementId];
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-content">
            <div class="achievement-icon-large">${achievement.icon}</div>
            <div class="achievement-text">
                <h3>获得成就！</h3>
                <p><strong>${achievement.title}</strong></p>
                <p>${achievement.description}</p>
            </div>
        </div>
    `;
    
    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ffd700 0%, #ffb300 100%);
        color: white;
        padding: 30px;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        text-align: center;
        animation: achievementPop 0.5s ease;
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'achievementFadeOut 0.5s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
    
    // 点击关闭
    notification.addEventListener('click', () => {
        notification.style.animation = 'achievementFadeOut 0.5s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    });
}

// 更新成就显示
function updateAchievementDisplay() {
    const achievementCount = document.getElementById('achievement-count');
    const achievementIcon = document.getElementById('achievement-icon');
    
    achievementCount.textContent = userProgress.achievements.length;
    
    // 点击显示成就列表
    achievementIcon.onclick = showAchievementsList;
    
    // 如果有成就，添加闪烁效果
    if (userProgress.achievements.length > 0) {
        achievementIcon.classList.add('pulse');
    }
}

// 显示成就列表
function showAchievementsList() {
    let html = '<div class="achievements-list"><h3>🏆 我的成就</h3>';
    
    Object.keys(achievements).forEach(key => {
        const achievement = achievements[key];
        const earned = userProgress.achievements.includes(key);
        
        html += `
            <div class="achievement-item ${earned ? 'earned' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                </div>
                <div class="achievement-status">
                    ${earned ? '✅' : '🔒'}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // 创建模态窗口显示成就
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>我的成就</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                ${html}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 保存用户进度
function saveUserProgress() {
    localStorage.setItem('disasterGameProgress', JSON.stringify(userProgress));
}

// 加载用户进度
function loadUserProgress() {
    const saved = localStorage.getItem('disasterGameProgress');
    if (saved) {
        userProgress = { ...userProgress, ...JSON.parse(saved) };
    }
}

// 重置用户进度
function resetProgress() {
    if (confirm('确定要重置所有进度吗？这将清除您的学习记录和成就。')) {
        userProgress = {
            videosWatched: [],
            knowledgeRead: [],
            quizzesCompleted: [],
            achievements: [],
            totalScore: 0
        };
        saveUserProgress();
        updateAchievementDisplay();
        alert('进度已重置！');
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes achievementPop {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    
    @keyframes achievementFadeOut {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
    
    .achievement-notification .achievement-content {
        display: flex;
        align-items: center;
        gap: 20px;
    }
    
    .achievement-icon-large {
        font-size: 3rem;
    }
    
    .achievement-text h3 {
        margin: 0 0 10px 0;
        font-size: 1.5rem;
    }
    
    .achievement-text p {
        margin: 5px 0;
        opacity: 0.9;
    }
    
    .achievements-list {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .achievement-item {
        display: flex;
        align-items: center;
        padding: 15px;
        margin: 10px 0;
        border-radius: 10px;
        background: #f8f9fa;
        gap: 15px;
    }
    
    .achievement-item.earned {
        background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
        border: 2px solid #4caf50;
    }
    
    .achievement-item.locked {
        opacity: 0.6;
        background: #f0f0f0;
    }
    
    .achievement-item .achievement-icon {
        font-size: 2rem;
        width: 50px;
        text-align: center;
    }
    
    .achievement-item .achievement-info {
        flex: 1;
    }
    
    .achievement-item .achievement-info h4 {
        margin: 0 0 5px 0;
    }
    
    .achievement-item .achievement-info p {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
    }
    
    .achievement-status {
        font-size: 1.5rem;
    }
    
    .selected {
        animation: cardGlow 2s ease-in-out infinite alternate;
    }
    
    @keyframes cardGlow {
        0% { box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
        100% { box-shadow: 0 10px 30px rgba(255, 215, 0, 0.5); }
    }
`;
document.head.appendChild(style); 