class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scoreElement = document.getElementById('score');
        this.score = 0;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.player = null;
        this.dots = [];
        this.isPlaying = false;
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

        this.EARTH_RADIUS = 20;
        this.PLAYER_RADIUS = 1;
        this.PLAYER_SPEED = 0.05; // Angular speed
        this.TURN_SPEED = 0.05;
    }

    init() {
        // 場景設置
        this.scene = new THREE.Scene();
        // 星空背景
        this.scene.background = new THREE.Color(0x000000);
        
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 40, 40);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        // 燈光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 50, 50);
        this.scene.add(dirLight);

        // 地球
        const earthGeo = new THREE.SphereGeometry(this.EARTH_RADIUS, 32, 32);
        const earthMat = new THREE.MeshPhongMaterial({
            color: 0x1a2b3c,
            shininess: 10,
            flatShading: false
        });
        this.earth = new THREE.Mesh(earthGeo, earthMat);
        this.scene.add(this.earth);

        // 經緯線裝飾
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(earthGeo),
            new THREE.LineBasicMaterial({ color: 0x2a4b6c, transparent: true, opacity: 0.2 })
        );
        this.earth.add(wireframe);

        // 玩家 (Pacman)
        const playerGeo = new THREE.SphereGeometry(this.PLAYER_RADIUS, 16, 16);
        const playerMat = new THREE.MeshPhongMaterial({ color: 0xffd700 }); // 金黃色
        this.player = new THREE.Mesh(playerGeo, playerMat);
        
        // 初始位置：北極附近
        this.player.position.set(0, this.EARTH_RADIUS + this.PLAYER_RADIUS, 0);
        this.scene.add(this.player);

        // 眼睛 (指示方向)
        const eyeGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.4, 0.3, 0.8); // Local coords
        rightEye.position.set(0.4, 0.3, 0.8);
        this.player.add(leftEye);
        this.player.add(rightEye);

        // 生成豆子
        this.spawnDots();

        // 事件監聽
        window.addEventListener('resize', () => this.onWindowResize());
        document.addEventListener('keydown', (e) => this.keys[e.code] = true);
        document.addEventListener('keyup', (e) => this.keys[e.code] = false);
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());

        // 開始渲染循環
        this.animate();
    }

    spawnDots() {
        // 清除舊豆子
        this.dots.forEach(dot => this.scene.remove(dot));
        this.dots = [];

        const dotGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const dotMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x333333 });

        // 使用斐波那契球體算法均勻分佈
        const count = 100;
        const offset = 2 / count;
        const inc = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < count; i++) {
            const y = i * offset - 1 + (offset / 2);
            const r = Math.sqrt(1 - y * y);
            const phi = i * inc;

            const x = Math.cos(phi) * r;
            const z = Math.sin(phi) * r;

            const dot = new THREE.Mesh(dotGeo, dotMat);
            // 設置在地球表面
            dot.position.set(x, y, z).multiplyScalar(this.EARTH_RADIUS + 0.4);
            dot.lookAt(0, 0, 0); // 朝向圓心 (如果是不規則形狀則有用)
            
            this.scene.add(dot);
            this.dots.push(dot);
        }
    }

    startGame() {
        document.getElementById('start-screen').style.display = 'none';
        this.isPlaying = true;
        this.score = 0;
        this.updateScore();
        
        // 重置玩家位置
        this.player.position.set(0, this.EARTH_RADIUS + this.PLAYER_RADIUS, 0);
        this.player.rotation.set(0, 0, 0);
        
        // 重新生成豆子
        this.spawnDots();
    }

    update() {
        if (!this.isPlaying) return;

        // --- 移動邏輯 ---
        
        // 1. 旋轉 (Yaw) - 繞自身 Y 軸 (Normal)
        if (this.keys['ArrowLeft']) {
            this.player.rotateY(this.TURN_SPEED);
        }
        if (this.keys['ArrowRight']) {
            this.player.rotateY(-this.TURN_SPEED);
        }

        // 2. 前進/後退 - 繞地球中心旋轉
        let moveSpeed = 0;
        if (this.keys['ArrowUp']) {
            moveSpeed = this.PLAYER_SPEED;
        }
        if (this.keys['ArrowDown']) {
            moveSpeed = -this.PLAYER_SPEED;
        }

        if (moveSpeed !== 0) {
            // 獲取玩家的"右"方向 (World Space)
            // 這是旋轉軸
            const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(this.player.quaternion);
            
            // 1. 旋轉玩家的位置向量
            this.player.position.applyAxisAngle(axis, moveSpeed);
            
            // 2. 旋轉玩家的朝向，使其保持與地面垂直且朝向前方
            this.player.rotateOnWorldAxis(axis, moveSpeed);
        }

        // 修正高度 (防止浮點誤差積累)
        this.player.position.setLength(this.EARTH_RADIUS + this.PLAYER_RADIUS);

        // --- 碰撞檢測 ---
        const playerPos = this.player.position;
        const eatDistance = this.PLAYER_RADIUS + 0.5;

        for (let i = this.dots.length - 1; i >= 0; i--) {
            const dot = this.dots[i];
            if (dot.position.distanceTo(playerPos) < eatDistance) {
                // 吃到豆子
                this.scene.remove(dot);
                this.dots.splice(i, 1);
                this.score += 10;
                this.updateScore();
            }
        }
        
        if (this.dots.length === 0) {
            alert('恭喜獲勝！');
            this.spawnDots();
        }

        // --- 相機跟隨 ---
        this.updateCamera();
    }

    updateCamera() {
        // 相機目標位置：玩家背後上方
        // 獲取玩家的上方 (Normal) 和後方
        // Player Up = Local Y = World Normal
        // Player Forward = Local Z (假設眼睛在 Z+)
        // 這裡我們的眼睛設置在 z=0.8，所以 Local Z 是前方
        
        const up = this.player.position.clone().normalize();
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.quaternion);
        // 由於我們是在球面上，Forward 應該是切線。
        // 上面的 rotateOnWorldAxis 應該保持了這種關係。
        
        // 相機位置 = 玩家位置 + (Up * height) - (Forward * distance)
        const cameraHeight = 15;
        const cameraDistance = 25;

        const targetPos = this.player.position.clone()
            .add(up.multiplyScalar(cameraHeight))
            .sub(forward.clone().multiplyScalar(cameraDistance)); // 減去前方向量 = 往後

        this.camera.position.lerp(targetPos, 0.1);
        this.camera.lookAt(this.player.position);
    }

    updateScore() {
        this.scoreElement.innerText = this.score;
    }

    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

