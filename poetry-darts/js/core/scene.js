/**
 * GameScene - 處理 3D 渲染與物理邏輯
 * 
 * 重大改進：瞄準輔助系統
 * - 飛鏢投擲時會自動追蹤當前高亮的目標
 * - 大幅降低精度要求，讓遊戲更加友好
 */
export class GameScene {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
        this.currentTarget = null; // 當前瞄準的目標
        this.init();
    }

    init() {
        // 1. 基礎場景（使用漸變背景色）
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0f1a);

        // 2. 相機（增加縱深感，拉遠距離）
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2.5, 18);
        this.camera.lookAt(0, 2.5, 0);

        // 3. 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // 4. 燈光（增強亮度）
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 10);
        this.scene.add(mainLight);

        // 添加背光照亮靶盤
        const backLight = new THREE.PointLight(0x6366f1, 0.6, 50);
        backLight.position.set(0, 5, -20);
        this.scene.add(backLight);

        // 物理狀態
        this.velocity = new THREE.Vector3();
        this.isFlying = false;

        // 靶盤距離（增加距離感）
        this.targetDist = 18;
        this.createBackground();
        this.createTargetBoard();
        this.createPickupZones(); // 必須在 createDart 之前調用
        this.createDart();
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createBackground() {
        // 創建一個簡單的漸層背景平面（在靶盤後方）
        const bgGeo = new THREE.PlaneGeometry(80, 50);
        const bgMat = new THREE.MeshBasicMaterial({ 
            color: 0x0f172a,
            transparent: true,
            opacity: 0.5
        });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.set(0, 2.5, -30);
        this.scene.add(bg);
        
        // 裝飾性的網格線（在背景上，增加縱深感）
        const gridSize = 50;
        const gridDiv = 25;
        const gridHelper = new THREE.GridHelper(gridSize, gridDiv, 0x1e293b, 0x1e293b);
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.position.set(0, 2.5, -28);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    createTargetBoard() {
        this.targetGroup = new THREE.Group();
        this.targetGroup.position.set(0, 2.5, -this.targetDist);
        
        // 主靶盤（縮小尺寸，半徑 6）
        const boardGeo = new THREE.CircleGeometry(6, 64);
        const boardMat = new THREE.MeshPhongMaterial({ 
            color: 0x1e293b,
            emissive: 0x0f172a,
            emissiveIntensity: 0.2
        });
        const board = new THREE.Mesh(boardGeo, boardMat);
        this.targetGroup.add(board);

        // 靶心環（裝飾用，發光效果）
        const ringGeo = new THREE.RingGeometry(5.7, 6, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.z = 0.01;
        this.targetGroup.add(ring);
        
        // 內圈裝飾
        const innerRingGeo = new THREE.RingGeometry(2.8, 3, 64);
        const innerRingMat = new THREE.MeshBasicMaterial({ 
            color: 0x4f46e5,
            transparent: true,
            opacity: 0.5
        });
        const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
        innerRing.position.z = 0.01;
        this.targetGroup.add(innerRing);

        this.scene.add(this.targetGroup);
        
        // 選項網格位置（6 個位置，均勻分佈在外圈，對應縮小的靶盤）
        this.optionPlacements = [
            { x: 0, y: 3.6 },     // 上
            { x: 3.1, y: 1.8 },   // 右上
            { x: 3.1, y: -1.8 },  // 右下
            { x: 0, y: -3.6 },    // 下
            { x: -3.1, y: -1.8 }, // 左下
            { x: -3.1, y: 1.8 }   // 左上
        ];
        
        this.optionMeshes = [];
    }

    /**
     * 更新靶盤上的選項
     * @param {Array} options - 字符串數組
     * @param {string} type - 'text' 或 'emoji'
     */
    updateTarget(options, type) {
        // 清除舊選項
        this.optionMeshes.forEach(m => this.targetGroup.remove(m));
        this.optionMeshes = [];
        this.currentTarget = null;

        options.forEach((opt, i) => {
            if (i >= this.optionPlacements.length) return;
            
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // 繪製圓形背景（更鮮明的顏色）
            const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
            gradient.addColorStop(0, 'rgba(51, 65, 85, 0.95)');
            gradient.addColorStop(1, 'rgba(30, 41, 59, 0.95)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(128, 128, 120, 0, Math.PI * 2);
            ctx.fill();
            
            // 邊框
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 6;
            ctx.stroke();

            // 繪製文字
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = type === 'emoji' ? '140px "Segoe UI Emoji"' : 'bold 160px "LXGW WenKai TC"';
            ctx.fillText(opt, 128, 128);

            const texture = new THREE.CanvasTexture(canvas);
            const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            // 選項方塊尺寸
            const geo = new THREE.PlaneGeometry(2.2, 2.2);
            const mesh = new THREE.Mesh(geo, mat);
            
            const pos = this.optionPlacements[i];
            mesh.position.set(pos.x, pos.y, 0.05);
            mesh.userData = { value: opt, originalMat: mat };
            
            this.targetGroup.add(mesh);
            this.optionMeshes.push(mesh);
        });
    }

    createDart() {
        this.dart = this.buildDartModel();
        
        // 抓取/飛行狀態的飛鏢縮小一些
        this.dart.scale.set(1.0, 1.0, 1.0);
        
        this.scene.add(this.dart);
        
        // 創建兩個飛鏢展示（左右各一個）
        this.createDisplayDarts();
        
        this.resetDart();
    }

    /**
     * 構建飛鏢模型（鮮明的橙金色配色）
     */
    buildDartModel() {
        const dart = new THREE.Group();
        
        // ===== 鮮明配色的飛鏢設計 =====
        
        // 1. 金屬尖頭（亮銀色）
        const tipGeo = new THREE.ConeGeometry(0.08, 0.5, 12);
        const tipMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            metalness: 0.95,
            roughness: 0.1,
            emissive: 0x666666,
            emissiveIntensity: 0.3
        });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.rotation.x = -Math.PI / 2;
        tip.position.z = -0.6;
        dart.add(tip);
        
        // 2. 握把（鮮明的橙色）
        const gripGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.6, 16);
        const gripMat = new THREE.MeshStandardMaterial({ 
            color: 0xf97316,
            metalness: 0.6,
            roughness: 0.3,
            emissive: 0xf97316,
            emissiveIntensity: 0.2
        });
        const grip = new THREE.Mesh(gripGeo, gripMat);
        grip.rotation.x = Math.PI / 2;
        grip.position.z = -0.05;
        dart.add(grip);
        
        // 3. 握把上的裝飾環（金色）
        const ringGeo = new THREE.TorusGeometry(0.13, 0.025, 8, 16);
        const ringMat = new THREE.MeshStandardMaterial({ 
            color: 0xfbbf24,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0xfbbf24,
            emissiveIntensity: 0.3
        });
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.y = Math.PI / 2;
            ring.position.z = -0.2 + i * 0.15;
            dart.add(ring);
        }
        
        // 4. 尾桿（橙色漸變）
        const shaftGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.4, 8);
        const shaftMat = new THREE.MeshStandardMaterial({ 
            color: 0xea580c,
            metalness: 0.5,
            roughness: 0.4,
            emissive: 0xea580c,
            emissiveIntensity: 0.15
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.rotation.x = Math.PI / 2;
        shaft.position.z = 0.45;
        dart.add(shaft);
        
        // 5. 尾翼（三片，120度分佈，亮黃色）
        const flightShape = new THREE.Shape();
        flightShape.moveTo(0, 0);
        flightShape.lineTo(0.4, 0.18);
        flightShape.lineTo(0.4, -0.18);
        flightShape.lineTo(0, 0);
        
        const flightGeo = new THREE.ShapeGeometry(flightShape);
        const flightMat = new THREE.MeshStandardMaterial({ 
            color: 0xfbbf24,
            side: THREE.DoubleSide,
            metalness: 0.4,
            roughness: 0.5,
            emissive: 0xfbbf24,
            emissiveIntensity: 0.4
        });
        
        for (let i = 0; i < 3; i++) {
            const flight = new THREE.Mesh(flightGeo, flightMat);
            flight.position.z = 0.65;
            flight.rotation.z = (Math.PI * 2 / 3) * i;
            flight.rotation.y = Math.PI / 2;
            dart.add(flight);
        }
        
        return dart;
    }

    /**
     * 創建展示用的飛鏢（左右抓取區域各一個，豎直平面展示）
     */
    createDisplayDarts() {
        // 創建左側展示飛鏢（尖頭朝下，豎直平面展示）
        this.displayDartLeft = this.buildDartModel();
        this.displayDartLeft.scale.set(1.8, 1.8, 1.8);
        this.displayDartLeft.position.copy(this.pickupPositionLeft);
        // 旋轉使尖頭朝下
        this.displayDartLeft.rotation.x = Math.PI / 2;
        this.scene.add(this.displayDartLeft);
        
        // 創建右側展示飛鏢
        this.displayDartRight = this.buildDartModel();
        this.displayDartRight.scale.set(1.8, 1.8, 1.8);
        this.displayDartRight.position.copy(this.pickupPositionRight);
        this.displayDartRight.rotation.x = Math.PI / 2;
        this.scene.add(this.displayDartRight);
    }

    /**
     * 創建飛鏢拿取區域（在靶盤左右兩側）
     * 注意：由於攝像頭鏡像，worldX 方向與視覺方向相反
     * - 用戶手在屏幕左邊時 worldX ≈ 10
     * - 用戶手在屏幕右邊時 worldX ≈ -10
     */
    createPickupZones() {
        // 視覺上的左側區域（對應 worldX = 10）
        this.pickupPositionLeft = new THREE.Vector3(8, 2, -10);
        // 視覺上的右側區域（對應 worldX = -10）
        this.pickupPositionRight = new THREE.Vector3(-8, 2, -10);
    }

    resetDart() {
        // 主飛鏢隱藏並放到屏幕外
        this.dart.position.set(0, -100, 0);
        this.dart.rotation.set(0, 0, 0);
        this.dart.visible = false; // 重要：隱藏主飛鏢
        this.isFlying = false;
        this.velocity.set(0, 0, 0);
        this.currentTarget = null;
        this.clearHighlight();
        
        // 顯示展示用飛鏢
        this.showDisplayDarts();
    }

    showDisplayDarts() {
        if (this.displayDartLeft) this.displayDartLeft.visible = true;
        if (this.displayDartRight) this.displayDartRight.visible = true;
    }

    hideDisplayDarts() {
        if (this.displayDartLeft) this.displayDartLeft.visible = false;
        if (this.displayDartRight) this.displayDartRight.visible = false;
    }

    /**
     * 檢查手部是否在抓取範圍內（只比較 X 和 Y，忽略 Z 軸）
     * @returns {boolean} 是否在抓取範圍內
     */
    isInGrabRange(worldPos) {
        // 只比較 X 和 Y 坐標（2D 平面距離）
        const dxLeft = worldPos.x - this.pickupPositionLeft.x;
        const dyLeft = worldPos.y - this.pickupPositionLeft.y;
        const distLeft = Math.sqrt(dxLeft * dxLeft + dyLeft * dyLeft);
        
        const dxRight = worldPos.x - this.pickupPositionRight.x;
        const dyRight = worldPos.y - this.pickupPositionRight.y;
        const distRight = Math.sqrt(dxRight * dxRight + dyRight * dyRight);
        
        const grabRange = 5; // 擴大抓取範圍
        
        return distLeft < grabRange || distRight < grabRange;
    }

    /**
     * 獲取最近的抓取點位置（只比較 X 和 Y）
     */
    getNearestPickupPosition(worldPos) {
        const dxLeft = worldPos.x - this.pickupPositionLeft.x;
        const dyLeft = worldPos.y - this.pickupPositionLeft.y;
        const distLeft = Math.sqrt(dxLeft * dxLeft + dyLeft * dyLeft);
        
        const dxRight = worldPos.x - this.pickupPositionRight.x;
        const dyRight = worldPos.y - this.pickupPositionRight.y;
        const distRight = Math.sqrt(dxRight * dxRight + dyRight * dyRight);
        
        return distLeft < distRight ? this.pickupPositionLeft : this.pickupPositionRight;
    }

    /**
     * 抓取飛鏢時調用
     * @param {THREE.Vector3} handPos 手部位置
     */
    onGrabbed(handPos) {
        // 隱藏展示飛鏢
        this.hideDisplayDarts();
        
        // 獲取最近的抓取點位置
        const nearestPos = this.getNearestPickupPosition(handPos);
        
        // 主飛鏢出現在抓取點位置
        this.dart.position.copy(nearestPos);
        this.dart.rotation.set(0, 0, 0);
        this.dart.visible = true; // 顯示主飛鏢
    }

    /**
     * 更新飛鏢位置，並計算當前瞄準的目標
     */
    updateDartPosition(worldPos) {
        this.dart.position.lerp(worldPos, 0.7);
        
        // 計算當前瞄準的目標（基於飛鏢 X/Y 位置映射到靶盤）
        this.updateAimTarget();
    }

    /**
     * 根據飛鏢當前位置，計算最接近的目標並高亮
     */
    updateAimTarget() {
        // 將飛鏢位置投影到靶盤平面
        const dartX = this.dart.position.x;
        const dartY = this.dart.position.y;
        
        let closestMesh = null;
        let minDist = Infinity;

        this.optionMeshes.forEach(mesh => {
            // 選項在世界坐標中的位置
            const optWorldPos = mesh.position.clone();
            this.targetGroup.localToWorld(optWorldPos);
            
            // 只比較 X 和 Y 軸
            const dx = optWorldPos.x - dartX;
            const dy = optWorldPos.y - dartY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
                closestMesh = mesh;
            }
        });

        // 更新高亮
        this.clearHighlight();
        if (closestMesh) {
            this.currentTarget = closestMesh.userData.value;
            this.highlightMesh(closestMesh);
        }
    }

    highlightMesh(mesh) {
        // 添加發光邊框效果
        mesh.scale.set(1.15, 1.15, 1);
    }

    clearHighlight() {
        this.optionMeshes.forEach(mesh => {
            mesh.scale.set(1, 1, 1);
        });
    }

    /**
     * 投擲飛鏢 - 核心改進：自動追蹤當前瞄準目標
     */
    throwDart(velocity) {
        this.isFlying = true;
        
        // 如果有瞄準目標，計算飛向該目標的方向
        if (this.currentTarget) {
            const targetMesh = this.optionMeshes.find(m => m.userData.value === this.currentTarget);
            if (targetMesh) {
                const targetWorldPos = targetMesh.position.clone();
                this.targetGroup.localToWorld(targetWorldPos);
                
                // 計算從飛鏢到目標的方向
                const direction = targetWorldPos.clone().sub(this.dart.position).normalize();
                
                // 設定飛行速度（固定的穩定速度）
                const flySpeed = 30;
                this.velocity.copy(direction).multiplyScalar(flySpeed);
                return;
            }
        }
        
        // 沒有瞄準目標時，使用原本的手勢速度
        const speed = Math.max(velocity.length(), 8);
        this.velocity.copy(velocity.normalize()).multiplyScalar(speed * 0.5);
        this.velocity.z = -25;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isFlying) {
            this.dart.position.add(this.velocity.clone().multiplyScalar(0.016));
            
            // 輕微重力（減弱，因為有自動追蹤）
            this.velocity.y -= 0.05;
            
            // 讓飛鏢頭始終朝向飛行方向
            if (this.velocity.length() > 0.1) {
                this.dart.lookAt(this.dart.position.clone().add(this.velocity));
            }

            // 碰撞檢測
            if (this.dart.position.z <= -this.targetDist + 1) {
                this.checkCollision();
            }
            
            // 脫靶檢測
            if (this.dart.position.y < -5 || this.dart.position.z < -this.targetDist - 10) {
                this.isFlying = false;
                this.callbacks.onMiss();
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    checkCollision() {
        this.isFlying = false;
        
        // 獲取飛鏢在靶盤平面上的局部坐標
        const localPos = this.targetGroup.worldToLocal(this.dart.position.clone());
        
        let hitOption = null;
        let minDist = 2.0; // 碰撞判定範圍

        this.optionMeshes.forEach(mesh => {
            const dist = mesh.position.distanceTo(localPos);
            if (dist < minDist) {
                minDist = dist;
                hitOption = mesh.userData.value;
            }
        });

        if (hitOption) {
            this.callbacks.onHit(hitOption);
        } else {
            this.callbacks.onMiss();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
