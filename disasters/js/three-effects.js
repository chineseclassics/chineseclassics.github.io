// Three.js 场景管理
let scene, camera, renderer;
let currentAnimation = null;

// 初始化Three.js场景
function initThreeScene() {
    const container = document.getElementById('three-scene');
    if (!container) return;
    
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
    
    // 创建默认场景
    createDefaultScene();
    
    // 开始渲染
    animate();
    
    // 响应式调整
    window.addEventListener('resize', onWindowResize);
}

// 窗口大小调整
function onWindowResize() {
    const container = document.getElementById('three-scene');
    if (container && camera && renderer) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    if (currentAnimation) {
        currentAnimation();
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// 清空场景
function clearScene() {
    while (scene.children.length > 0) {
        const child = scene.children[0];
        scene.remove(child);
    }
    
    // 重新添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
}

// 创建默认场景
function createDefaultScene() {
    clearScene();
    currentAnimation = null;
    
    // 创建地球
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);
    
    currentAnimation = function() {
        earth.rotation.y += 0.01;
    };
}

// 根据灾害类型显示特效
function showDisasterEffect(disasterType) {
    if (!scene) return;
    
    switch (disasterType) {
        case 'earthquake':
            createEarthquakeEffect();
            break;
        case 'tsunami':
            createTsunamiEffect();
            break;
        case 'volcano':
            createVolcanoEffect();
            break;
        case 'tornado':
            createTornadoEffect();
            break;
        case 'flood':
            createFloodEffect();
            break;
        case 'hurricane':
            createHurricaneEffect();
            break;
        default:
            createDefaultScene();
    }
}

// 地震特效
function createEarthquakeEffect() {
    clearScene();
    
    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // 创建建筑物
    const buildings = [];
    for (let i = 0; i < 6; i++) {
        const height = Math.random() * 3 + 1;
        const geometry = new THREE.BoxGeometry(1, height, 1);
        const material = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(
            (Math.random() - 0.5) * 15,
            height / 2,
            (Math.random() - 0.5) * 15
        );
        buildings.push(building);
        scene.add(building);
    }
    
    currentAnimation = function() {
        const shakeIntensity = Math.sin(Date.now() * 0.01) * 0.05;
        buildings.forEach(building => {
            building.rotation.z = Math.sin(Date.now() * 0.02) * 0.1;
            building.position.x += (Math.random() - 0.5) * shakeIntensity;
            building.position.z += (Math.random() - 0.5) * shakeIntensity;
        });
    };
}

// 海啸特效
function createTsunamiEffect() {
    clearScene();
    
    // 创建海洋
    const oceanGeometry = new THREE.PlaneGeometry(30, 30, 20, 20);
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
        const waveGeometry = new THREE.SphereGeometry(1, 16, 16);
        const waveMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4FC3F7,
            transparent: true,
            opacity: 0.7
        });
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.position.set(0, 2, -10 + i * 5);
        wave.scale.set(3, 1, 1);
        waves.push(wave);
        scene.add(wave);
    }
    
    currentAnimation = function() {
        const time = Date.now() * 0.005;
        waves.forEach((wave, index) => {
            wave.position.z += 0.2;
            wave.position.y = 2 + Math.sin(time + index) * 0.5;
            if (wave.position.z > 15) {
                wave.position.z = -15;
            }
        });
    };
}

// 火山特效
function createVolcanoEffect() {
    clearScene();
    
    // 创建火山
    const volcanoGeometry = new THREE.ConeGeometry(3, 5, 12);
    const volcanoMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const volcano = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
    volcano.position.y = 2.5;
    scene.add(volcano);
    
    // 创建岩浆
    const lavaGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const lavaMaterial = new THREE.MeshBasicMaterial({ color: 0xFF4500 });
    const lava = new THREE.Mesh(lavaGeometry, lavaMaterial);
    lava.position.y = 5.2;
    scene.add(lava);
    
    // 创建粒子
    const particles = [];
    for (let i = 0; i < 20; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xFF6B00 });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(0, 5, 0);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 2
        );
        particles.push(particle);
        scene.add(particle);
    }
    
    currentAnimation = function() {
        lava.material.color.setHSL(0, 1, 0.5 + Math.sin(Date.now() * 0.01) * 0.2);
        
        particles.forEach(particle => {
            particle.position.add(particle.velocity.clone().multiplyScalar(0.05));
            particle.velocity.y -= 0.02;
            
            if (particle.position.y < 0) {
                particle.position.set(
                    (Math.random() - 0.5) * 1,
                    5,
                    (Math.random() - 0.5) * 1
                );
                particle.velocity.set(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 2 + 1,
                    (Math.random() - 0.5) * 2
                );
            }
        });
    };
}

// 龙卷风特效
function createTornadoEffect() {
    clearScene();
    
    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8FBC8F });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // 创建龙卷风粒子
    const particles = [];
    for (let i = 0; i < 50; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.7
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        const height = Math.random() * 10;
        const radius = (10 - height) * 0.3;
        const angle = Math.random() * Math.PI * 2;
        
        particle.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        
        particle.userData = { height, angle };
        particles.push(particle);
        scene.add(particle);
    }
    
    currentAnimation = function() {
        particles.forEach(particle => {
            particle.userData.angle += 0.1;
            const height = particle.userData.height;
            const radius = (10 - height) * 0.3;
            
            particle.position.set(
                Math.cos(particle.userData.angle) * radius,
                height,
                Math.sin(particle.userData.angle) * radius
            );
        });
    };
}

// 洪水特效
function createFloodEffect() {
    clearScene();
    
    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(25, 25);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // 创建房屋
    const houses = [];
    for (let i = 0; i < 4; i++) {
        const houseGeometry = new THREE.BoxGeometry(2, 3, 2);
        const houseMaterial = new THREE.MeshLambertMaterial({ color: 0xD2691E });
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.set(
            (Math.random() - 0.5) * 15,
            1.5,
            (Math.random() - 0.5) * 15
        );
        houses.push(house);
        scene.add(house);
    }
    
    // 创建水面
    const waterGeometry = new THREE.PlaneGeometry(20, 20);
    const waterMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4682B4,
        transparent: true,
        opacity: 0.6
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    scene.add(water);
    
    let waterLevel = 0;
    
    currentAnimation = function() {
        waterLevel = Math.sin(Date.now() * 0.003) * 1.5 + 1.5;
        water.position.y = waterLevel;
        
        houses.forEach((house, index) => {
            if (waterLevel > house.position.y - 1.5) {
                house.rotation.z = Math.sin(Date.now() * 0.005 + index) * 0.1;
            }
        });
    };
}

// 台风特效
function createHurricaneEffect() {
    clearScene();
    
    // 创建海面
    const seaGeometry = new THREE.PlaneGeometry(30, 30);
    const seaMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x006994,
        transparent: true,
        opacity: 0.8
    });
    const sea = new THREE.Mesh(seaGeometry, seaMaterial);
    sea.rotation.x = -Math.PI / 2;
    scene.add(sea);
    
    // 创建云层
    const clouds = [];
    for (let i = 0; i < 30; i++) {
        const cloudGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const cloudMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7
        });
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        const angle = (i / 30) * Math.PI * 2;
        const radius = (i % 5) * 2 + 3;
        
        cloud.position.set(
            Math.cos(angle) * radius,
            Math.random() * 5 + 5,
            Math.sin(angle) * radius
        );
        
        cloud.userData = { angle, radius };
        clouds.push(cloud);
        scene.add(cloud);
    }
    
    currentAnimation = function() {
        clouds.forEach(cloud => {
            cloud.userData.angle += 0.03;
            cloud.position.x = Math.cos(cloud.userData.angle) * cloud.userData.radius;
            cloud.position.z = Math.sin(cloud.userData.angle) * cloud.userData.radius;
        });
    };
} 