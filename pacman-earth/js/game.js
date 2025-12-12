class Game {
    constructor() {
        // UI 元素
        this.container = document.getElementById('game-container');
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.livesElement = document.getElementById('lives');
        this.poemElement = document.getElementById('poem-progress');
        this.startScreen = document.getElementById('start-screen');
        this.startTip = document.getElementById('start-tip');
        this.startBtn = document.getElementById('start-btn');
        this.touchButtons = document.querySelectorAll('.touch-btn');
        this.banner = document.getElementById('message-banner');

        // 遊戲狀態
        this.score = 0;
        this.level = 1;
        this.playerLevel = 1;
        this.playerXP = 0;
        this.xpToNext = 200;
        this.lives = 3;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.player = null;
        this.dots = [];
        this.enemies = [];
        this.powerups = [];
        this.activePower = null;

        this.isPlaying = false;
        this.keys = {
            ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
            KeyW: false, KeyS: false, KeyA: false, KeyD: false
        };
        this.touchInput = { up: false, down: false, left: false, right: false };
        this.swipeDirection = null;
        this.input = { forward: 0, turn: 0 };
        this.swipeStart = null;

        // 常數
        this.EARTH_RADIUS = 20;
        this.PLAYER_RADIUS = 1;
        this.PLAYER_SPEED = 0.075;
        this.TURN_SPEED = 0.11;
        this.ENEMY_BASE_SPEED = 0.055;
        this.POWERUP_DURATION = 8; // 秒

        this.clock = new THREE.Clock();
        this.mouthPhase = 0;
        this.mouthOpen = 0.6;
        this.MOUTH_MIN = 0.35;
        this.MOUTH_MAX = 1.1;
        this.MOUTH_SPEED = 6;

        this.poems = [
            "明月松間照清泉石上流",
            "海上生明月天涯共此時",
            "春眠不覺曉處處聞啼鳥",
            "兩情若是久長時又豈在朝朝暮暮"
        ];
        this.currentPoem = "";
        this.poemProgress = 0;
        this.dotCount = 110;
        this.dotsEaten = 0;
        this.powerupTimer = 0;
        this.invincibleTimer = 0; // 無敵時間（秒）
        this.INVINCIBLE_DURATION = 2; // 初始無敵時間 2 秒
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x01030a);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);
        this.camera.position.set(0, 32, 48);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.localClippingEnabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.textureLoader = new THREE.TextureLoader();
        this.textureLoader.setCrossOrigin('anonymous');

        this.setupLights();
        this.createStarField();
        this.buildEarth();
        this.buildPlayer();

        this.bindEvents();
        this.updateUI(); // 只更新 UI，不生成遊戲物件
        this.animate();
    }

    // --- 場景與物件 ---
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xaec6ff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
        dirLight.position.set(80, 90, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        this.scene.add(dirLight);

        const rim = new THREE.PointLight(0x6da9ff, 0.6, 200);
        rim.position.set(-60, -40, -30);
        this.scene.add(rim);
    }

    createStarField() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 900;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i++) positions[i] = (Math.random() - 0.5) * 900;
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0.8 });
        this.scene.add(new THREE.Points(starGeo, starMat));
    }

    buildEarth() {
        const earthGeo = new THREE.SphereGeometry(this.EARTH_RADIUS, 96, 96);
        const earthMat = new THREE.MeshPhongMaterial({
            map: this.textureLoader.load('https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg'),
            bumpMap: this.textureLoader.load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'),
            bumpScale: 0.35,
            specularMap: this.textureLoader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg'),
            specular: new THREE.Color(0x666666),
            shininess: 18
        });
        this.earth = new THREE.Mesh(earthGeo, earthMat);
        this.earth.receiveShadow = true;
        this.scene.add(this.earth);

        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(this.EARTH_RADIUS * 1.02, 64, 64),
            new THREE.MeshBasicMaterial({ color: 0x4db8ff, transparent: true, opacity: 0.08, side: THREE.BackSide })
        );
        this.earth.add(atmosphere);

        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(earthGeo),
            new THREE.LineBasicMaterial({ color: 0x3a6ea5, transparent: true, opacity: 0.15 })
        );
        this.earth.add(wireframe);
    }

    createPacmanGeometry(openAngle) {
        const geo = new THREE.SphereGeometry(this.PLAYER_RADIUS, 64, 64, openAngle / 2, Math.PI * 2 - openAngle);
        geo.rotateY(Math.PI / 2);
        return geo;
    }

    buildPlayer() {
        const playerMat = new THREE.MeshPhongMaterial({ color: 0xffd23c, emissive: 0x4a3400, shininess: 95 });
        this.player = new THREE.Mesh(this.createPacmanGeometry(this.mouthOpen), playerMat);
        this.player.castShadow = true;
        this.player.receiveShadow = true;
        this.player.position.set(this.EARTH_RADIUS + this.PLAYER_RADIUS, 0, 0);
        this.scene.add(this.player);

        const eyeGeo = new THREE.SphereGeometry(0.28, 10, 10);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.38, 0.32, 0.72);
        rightEye.position.set(0.38, 0.32, 0.72);
        this.player.add(leftEye);
        this.player.add(rightEye);
    }

    // --- UI 與事件 ---
    bindEvents() {
        window.addEventListener('resize', () => this.onWindowResize());
        document.addEventListener('keydown', (e) => this.handleKeyDown(e), { passive: false });
        document.addEventListener('keyup', (e) => this.handleKeyUp(e), { passive: false });

        if (this.startBtn) this.startBtn.addEventListener('click', () => this.startGame());

        this.touchButtons.forEach((btn) => {
            const dir = btn.dataset.dir;
            if (!dir) return;
            const setState = (active) => { this.touchInput[dir] = active; };
            btn.addEventListener('pointerdown', (e) => { e.preventDefault(); setState(true); });
            btn.addEventListener('pointerup', (e) => { e.preventDefault(); setState(false); });
            btn.addEventListener('pointerleave', (e) => { e.preventDefault(); setState(false); });
            btn.addEventListener('pointercancel', (e) => { e.preventDefault(); setState(false); });
        });

        this.container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        this.container.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    }

    handleKeyDown(e) {
        if (e.code in this.keys) {
            e.preventDefault();
            this.keys[e.code] = true;
        }
    }
    handleKeyUp(e) {
        if (e.code in this.keys) {
            e.preventDefault();
            this.keys[e.code] = false;
        }
    }

    onTouchStart(e) {
        if (e.touches.length > 0) {
            const t = e.touches[0];
            this.swipeStart = { x: t.clientX, y: t.clientY };
        }
    }
    onTouchEnd(e) {
        if (!this.swipeStart) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - this.swipeStart.x;
        const dy = t.clientY - this.swipeStart.y;
        const threshold = 24;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
            this.swipeDirection = dx < 0 ? 'left' : 'right';
        } else if (Math.abs(dy) > threshold) {
            this.swipeDirection = dy < 0 ? 'up' : 'down';
        }
        this.swipeStart = null;
    }

    // --- 遊戲流程 ---
    resetGame() {
        this.score = 0;
        this.level = 1;
        this.playerLevel = 1;
        this.playerXP = 0;
        this.xpToNext = 200;
        this.lives = 3;
        this.startLevel();
        this.updateUI();
    }

    startGame() {
        try {
            if (this.startScreen) this.startScreen.style.display = 'none';
            this.resetGame();
            this.isPlaying = true;
            this.showBanner("開局！吃對詩句順序拿高分，加油！");
        } catch (error) {
            console.error('開始遊戲時發生錯誤:', error);
            alert('遊戲啟動失敗，請重新整理頁面');
        }
    }

    startLevel() {
        this.poemProgress = 0;
        if (this.poems && this.poems.length > 0) {
            this.currentPoem = this.poems[(this.level - 1) % this.poems.length];
        } else {
            this.currentPoem = "";
        }
        this.dotsEaten = 0;
        this.clearDots();
        this.clearPowerups();
        this.powerupTimer = 0;
        this.resetPlayer(); // 先重置玩家位置（會設置無敵時間）
        this.spawnDots();
        this.spawnEnemies(); // 再生成敵人，這樣可以根據玩家位置避免碰撞
        this.updateUI();
    }

    nextLevel() {
        this.level += 1;
        this.showBanner(`進入第 ${this.level} 關！敵人變快，小心！`);
        this.startLevel();
    }

    levelUpPlayer() {
        this.playerLevel += 1;
        this.PLAYER_SPEED += 0.005;
        this.TURN_SPEED += 0.004;
        this.xpToNext = Math.floor(this.xpToNext * 1.25);
        this.showBanner(`升級！速度提升，等級 ${this.playerLevel}`);
    }

    resetPlayer() {
        this.player.position.set(this.EARTH_RADIUS + this.PLAYER_RADIUS, 0, 0);
        this.player.rotation.set(0, 0, 0);
        this.swipeDirection = null;
        this.touchInput = { up: false, down: false, left: false, right: false };
        this.invincibleTimer = this.INVINCIBLE_DURATION; // 重置時給予無敵時間
    }

    // --- Bean 與詩句 ---
    generateDotChars(count) {
        const chars = [];
        const poemChars = this.currentPoem ? this.currentPoem.split('') : [];
        if (poemChars.length === 0) {
            // 如果沒有詩句，使用預設字符
            for (let i = 0; i < count; i++) {
                chars.push('字');
            }
            return chars;
        }
        for (let i = 0; i < count; i++) {
            chars.push(poemChars[i % poemChars.length]);
        }
        for (let i = chars.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return chars;
    }

    createTextSprite(char) {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffd23c';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 72px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
        ctx.fillStyle = '#2c1900';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, size / 2, size / 2 + 4);
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.1, 1.1, 1.1);
        return sprite;
    }

    createDot(char, position) {
        const geo = new THREE.SphereGeometry(0.45, 14, 14);
        const mat = new THREE.MeshPhongMaterial({
            color: 0xffd89b,
            emissive: 0xffa629,
            emissiveIntensity: 0.55,
            shininess: 65
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.lookAt(0, 0, 0);
        mesh.userData.char = char;

        const sprite = this.createTextSprite(char);
        sprite.position.copy(position.clone().normalize().multiplyScalar(0.9));
        mesh.add(sprite);

        this.scene.add(mesh);
        this.dots.push(mesh);
    }

    clearDots() {
        this.dots.forEach(d => this.scene.remove(d));
        this.dots = [];
    }

    spawnDots() {
        const chars = this.generateDotChars(this.dotCount);
        const offset = 2 / this.dotCount;
        const inc = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < this.dotCount; i++) {
            const y = i * offset - 1 + (offset / 2);
            const r = Math.sqrt(1 - y * y);
            const phi = i * inc;
            const x = Math.cos(phi) * r;
            const z = Math.sin(phi) * r;
            const pos = new THREE.Vector3(x, y, z).multiplyScalar(this.EARTH_RADIUS + 0.55);
            this.createDot(chars[i], pos);
        }
    }

    respawnDot(char) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2 * Math.PI;
        const phi = Math.acos(2 * v - 1);
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);
        const pos = new THREE.Vector3(x, y, z).multiplyScalar(this.EARTH_RADIUS + 0.55);
        this.createDot(char, pos);
    }

    handleDotEaten(dot) {
        const char = dot.userData.char;
        this.scene.remove(dot);
        this.dots.splice(this.dots.indexOf(dot), 1);
        this.score += 10;
        this.playerXP += 10;
        this.dotsEaten += 1;

        const expected = this.currentPoem[this.poemProgress];
        if (char === expected) {
            this.poemProgress += 1;
            if (this.poemProgress >= this.currentPoem.length) {
                this.score += 120;
                this.playerXP += 80;
                this.showBanner(`完成詩句！「${this.currentPoem}」 加分！`);
                this.poemProgress = 0;
            }
        } else {
            this.respawnDot(char);
            this.showBanner(`順序錯誤：先吃「${expected}」喔！`);
        }

        if (this.playerXP >= this.xpToNext) {
            this.playerXP -= this.xpToNext;
            this.levelUpPlayer();
        }

        if (this.dots.length === 0) {
            this.nextLevel();
        }

        this.maybeSpawnPowerup();
        this.updateUI();
    }

    // --- 敵人與道具 ---
    spawnEnemies() {
        this.enemies.forEach(e => this.scene.remove(e.mesh));
        this.enemies = [];
        const count = Math.min(4, 1 + Math.floor((this.level - 1) / 1));
        const colors = [0xff4d6d, 0x5ad1ff, 0xffa24d, 0xa05dff);
        
        // 玩家初始位置在 (EARTH_RADIUS + PLAYER_RADIUS, 0, 0)，即 (21, 0, 0)
        // 確保敵人在遠離玩家的位置生成
        const playerStartPos = new THREE.Vector3(this.EARTH_RADIUS + this.PLAYER_RADIUS, 0, 0);
        const minDistance = 8; // 最小距離，確保不會立即碰撞
        
        for (let i = 0; i < count; i++) {
            let pos;
            let attempts = 0;
            do {
                // 在球面上隨機生成位置，但確保遠離玩家
                const u = Math.random();
                const v = Math.random();
                const theta = u * 2 * Math.PI;
                const phi = Math.acos(2 * v - 1);
                const x = Math.sin(phi) * Math.cos(theta);
                const y = Math.sin(phi) * Math.sin(theta);
                const z = Math.cos(phi);
                pos = new THREE.Vector3(x, y, z).multiplyScalar(this.EARTH_RADIUS + 0.9);
                attempts++;
            } while (pos.distanceTo(playerStartPos) < minDistance && attempts < 20);
            
            const geo = new THREE.SphereGeometry(0.9, 18, 18);
            const mat = new THREE.MeshPhongMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.35, shininess: 30 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.speed = this.ENEMY_BASE_SPEED + 0.008 * (this.level - 1);
            this.scene.add(mesh);
            this.enemies.push({ mesh });
        }
    }

    updateEnemies(delta) {
        const scale = delta / (1 / 60);
        this.enemies.forEach(({ mesh }) => {
            const axis = mesh.position.clone().cross(this.player.position).normalize();
            if (axis.lengthSq() < 1e-6) return;
            const speed = mesh.userData.speed * (this.activePower === 'freeze' ? 0.2 : 1);
            mesh.position.applyAxisAngle(axis, speed * scale);
            mesh.position.setLength(this.EARTH_RADIUS + 0.9);

            const tangentDir = axis.clone().cross(mesh.position).normalize();
            const lookTarget = mesh.position.clone().add(tangentDir);
            mesh.up.copy(mesh.position.clone().normalize());
            mesh.lookAt(lookTarget);
        });
    }

    checkEnemyCollision() {
        // 無敵時間內不檢查碰撞
        if (this.invincibleTimer > 0) return;
        
        const radius = this.PLAYER_RADIUS + 0.9;
        for (const { mesh } of this.enemies) {
            if (mesh.position.distanceTo(this.player.position) < radius) {
                if (this.activePower === 'shield') {
                    this.showBanner('護盾抵擋了一次撞擊！');
                    this.clearActivePower();
                    return;
                }
                this.lives -= 1;
                if (this.lives <= 0) {
                    this.isPlaying = false;
                    this.showOverlay('被抓住了！按「開始遊戲」再來一次');
                } else {
                    this.showBanner('被撞到！扣一命，回到起點');
                    this.resetPlayer();
                }
                this.updateUI();
                return;
            }
        }
    }

    maybeSpawnPowerup() {
        if (this.powerups.length > 0) return;
        if (this.dotsEaten % 18 === 0 && this.dotsEaten > 0) {
            const types = ['speed', 'shield', 'freeze'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.spawnPowerup(type);
        }
    }

    spawnPowerup(type) {
        const geo = new THREE.SphereGeometry(0.6, 16, 16);
        const colorMap = { speed: 0x80ffea, shield: 0x8cff66, freeze: 0xa6b1ff };
        const mat = new THREE.MeshPhongMaterial({
            color: colorMap[type],
            emissive: colorMap[type],
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.9
        });
        const mesh = new THREE.Mesh(geo, mat);
        const rand = () => Math.random() * 2 - 1;
        const pos = new THREE.Vector3(rand(), rand(), rand()).normalize().multiplyScalar(this.EARTH_RADIUS + 0.8);
        mesh.position.copy(pos);
        mesh.userData.type = type;
        this.scene.add(mesh);
        this.powerups.push(mesh);
        this.showBanner(`道具出現：${type === 'speed' ? '加速' : type === 'shield' ? '護盾' : '冰凍敵人'}`);
    }

    clearPowerups() {
        this.powerups.forEach(p => this.scene.remove(p));
        this.powerups = [];
        this.clearActivePower();
    }

    clearActivePower() {
        this.activePower = null;
        this.powerupTimer = 0;
        this.PLAYER_SPEED = 0.075 + 0.005 * (this.playerLevel - 1);
    }

    updatePowerupTimers(delta) {
        if (!this.activePower) return;
        this.powerupTimer -= delta;
        if (this.powerupTimer <= 0) {
            this.showBanner('道具效果結束');
            this.clearActivePower();
        }
    }

    handlePowerupPickup(power) {
        this.scene.remove(power);
        this.powerups.splice(this.powerups.indexOf(power), 1);
        this.activePower = power.userData.type;
        this.powerupTimer = this.POWERUP_DURATION;
        if (this.activePower === 'speed') {
            this.PLAYER_SPEED += 0.03;
        }
        this.showBanner(`獲得道具：${this.activePower}`);
    }

    // --- 輸入與移動 ---
    updateInputState() {
        const forward = (this.keys['ArrowUp'] || this.keys['KeyW'] || this.touchInput.up || this.swipeDirection === 'up') ? 1 : 0;
        const backward = (this.keys['ArrowDown'] || this.keys['KeyS'] || this.touchInput.down || this.swipeDirection === 'down') ? 1 : 0;
        const left = (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchInput.left || this.swipeDirection === 'left') ? 1 : 0;
        const right = (this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchInput.right || this.swipeDirection === 'right') ? 1 : 0;
        this.input.forward = forward - backward;
        this.input.turn = left - right;
        this.swipeDirection = null;
    }

    movePlayer(delta) {
        const step = this.PLAYER_SPEED * (delta / (1 / 60));
        if (this.input.turn !== 0) this.player.rotateY(this.input.turn * this.TURN_SPEED);
        if (this.input.forward !== 0) {
            const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(this.player.quaternion);
            this.player.position.applyAxisAngle(axis, step * this.input.forward);
            this.player.rotateOnWorldAxis(axis, step * this.input.forward);
        }
        this.player.position.setLength(this.EARTH_RADIUS + this.PLAYER_RADIUS);
    }

    faceNearestDot() {
        if (!this.dots.length) return;
        let nearest = null;
        let dist = Infinity;
        const pos = this.player.position;
        for (const dot of this.dots) {
            const d = dot.position.distanceTo(pos);
            if (d < dist) { dist = d; nearest = dot; }
        }
        if (!nearest) return;
        const normal = pos.clone().normalize();
        const toDot = nearest.position.clone().sub(pos);
        const tangent = toDot.sub(normal.clone().multiplyScalar(toDot.dot(normal)));
        if (tangent.lengthSq() < 1e-6) return;
        tangent.normalize();
        const target = pos.clone().add(tangent);
        this.player.up.copy(normal);
        this.player.lookAt(target);
    }

    // --- 碰撞 ---
    checkDotCollision() {
        const playerPos = this.player.position;
        const eatDistance = this.PLAYER_RADIUS + 0.55;
        for (let i = this.dots.length - 1; i >= 0; i--) {
            const dot = this.dots[i];
            if (dot.position.distanceTo(playerPos) < eatDistance) {
                this.handleDotEaten(dot);
            }
        }
    }

    checkPowerCollision() {
        const playerPos = this.player.position;
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            if (p.position.distanceTo(playerPos) < this.PLAYER_RADIUS + 0.6) {
                this.handlePowerupPickup(p);
            }
        }
    }

    // --- 相機與動畫 ---
    updatePacmanMouth(delta) {
        this.mouthPhase += delta * this.MOUTH_SPEED;
        const open = this.MOUTH_MIN + (Math.sin(this.mouthPhase) * 0.5 + 0.5) * (this.MOUTH_MAX - this.MOUTH_MIN);
        if (Math.abs(open - this.mouthOpen) > 0.02 && this.player) {
            this.mouthOpen = open;
            this.player.geometry.dispose();
            this.player.geometry = this.createPacmanGeometry(open);
        }
    }

    updateCamera() {
        const up = this.player.position.clone().normalize();
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.quaternion);
        const cameraHeight = 16;
        const cameraDistance = 26;
        const targetPos = this.player.position.clone()
            .add(up.clone().multiplyScalar(cameraHeight))
            .sub(forward.clone().multiplyScalar(cameraDistance));
        this.camera.position.lerp(targetPos, 0.12);
        this.camera.lookAt(this.player.position);
    }

    // --- UI ---
    updateUI() {
        this.scoreElement.innerText = this.score;
        this.levelElement.innerText = `${this.level} / Lv.${this.playerLevel}`;
        this.livesElement.innerText = this.lives;
        const progress = this.currentPoem
            ? `${this.currentPoem.slice(0, this.poemProgress)}▌${this.currentPoem.slice(this.poemProgress)}`
            : '—';
        this.poemElement.innerText = progress;
    }

    showBanner(message) {
        if (!this.banner) return;
        this.banner.innerText = message;
        this.banner.classList.add('show');
        clearTimeout(this.bannerTimer);
        this.bannerTimer = setTimeout(() => this.banner.classList.remove('show'), 2200);
    }

    showOverlay(message) {
        if (!this.startScreen) return;
        const tip = this.startTip || this.startScreen.querySelector('p');
        if (tip) tip.innerText = message;
        this.startScreen.style.display = 'flex';
    }

    // --- 主循環 ---
    update() {
        const delta = this.clock.getDelta();
        this.updatePacmanMouth(delta);

        if (!this.isPlaying) {
            this.updateCamera();
            return;
        }

        // 更新無敵時間
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= delta;
        }

        this.updateInputState();
        this.movePlayer(delta);
        this.faceNearestDot();
        this.checkDotCollision();
        this.checkPowerCollision();
        this.updateEnemies(delta);
        this.checkEnemyCollision();
        this.updatePowerupTimers(delta);
        this.updateCamera();
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
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }
}
