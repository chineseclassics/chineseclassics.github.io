/**
 * GestureManager - 處理 MediaPipe 手勢識別
 * 
 * 投擲判定邏輯改進：
 * 1. 必須檢測到「手掌張開」才算真正釋放
 * 2. 捏合需要穩定保持才算抓取
 * 3. 投擲需要速度超過閾值 + 手掌張開
 */
export class GestureManager {
    constructor(videoElement, canvasElement, callbacks) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.callbacks = callbacks;
        
        this.wakeProgress = 0;
        this.history = []; // 位置歷史（用於計算速度）
        
        // 捏合狀態追蹤
        this.pinchHistory = [];
        this.pinchHistorySize = 4; // 減少到 4 幀（原本 6）
        this.stablePinching = false;
        
        // 手掌張開狀態追蹤
        this.palmOpenHistory = [];
        this.palmOpenHistorySize = 3; // 減少到 3 幀（原本 4）
        
        // 投擲檢測參數
        this.throwSpeedThreshold = 6;
        this.releaseConfirmFrames = 3;
        
        this.init();
    }

    init() {
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        this.hands.onResults((res) => this.onResults(res));

        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.hands.send({ image: this.video });
            },
            width: 640,
            height: 480
        });
    }

    start() {
        this.camera.start();
        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    onResults(results) {
        // 1. 繪製預覽
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const marks = results.multiHandLandmarks[0];
            
            // 繪製骨架
            drawConnectors(this.ctx, marks, HAND_CONNECTIONS, { color: '#6366f1', lineWidth: 4 });
            drawLandmarks(this.ctx, marks, { color: '#f59e0b', lineWidth: 1, radius: 3 });

            // 2. 獲取核心坐標
            const controlPoint = marks[9];
            
            const screenX = (1 - controlPoint.x) * window.innerWidth;
            const screenY = controlPoint.y * window.innerHeight;

            const worldX = (0.5 - controlPoint.x) * 20;
            const worldY = (0.5 - controlPoint.y) * 14 + 3;
            const worldPos = new THREE.Vector3(worldX, worldY, 10);

            // 3. 手勢判斷
            const isPalmOpen = this.checkPalmOpen(marks);
            const rawPinching = this.checkPinch(marks);

            // 4. 更新狀態歷史
            this.updatePinchState(rawPinching);
            this.updatePalmOpenState(isPalmOpen);

            // 5. 喚醒邏輯
            if (isPalmOpen) {
                this.wakeProgress = Math.min(this.wakeProgress + 3, 100);
            } else {
                this.wakeProgress = Math.max(this.wakeProgress - 2, 0);
            }
            this.callbacks.onWake(this.wakeProgress);

            // 6. 速度追蹤
            const now = Date.now();
            this.history.push({ x: worldX, y: worldY, time: now });
            if (this.history.length > 10) this.history.shift();

            const velocity = this.calculateVelocity();
            const speed = velocity.length();

            // 7. 計算是否確認張開手掌（用於釋放判定）
            const confirmedPalmOpen = this.isConfirmedPalmOpen();

            this.callbacks.onResults({
                detected: true,
                screenX,
                screenY,
                worldPos,
                isPinching: this.stablePinching,
                isPalmOpen: confirmedPalmOpen, // 確認的手掌張開狀態
                rawPinching,
                velocity,
                speed
            });
        } else {
            this.wakeProgress = Math.max(this.wakeProgress - 2, 0);
            this.callbacks.onWake(this.wakeProgress);
            this.callbacks.onResults({ detected: false });
        }
        this.ctx.restore();
    }

    updatePinchState(currentPinching) {
        this.pinchHistory.push(currentPinching);
        if (this.pinchHistory.length > this.pinchHistorySize) {
            this.pinchHistory.shift();
        }

        const pinchCount = this.pinchHistory.filter(p => p).length;
        const releaseCount = this.pinchHistory.filter(p => !p).length;

        if (pinchCount >= this.pinchHistorySize - 1) {
            this.stablePinching = true;
        } else if (releaseCount >= this.releaseConfirmFrames) {
            this.stablePinching = false;
        }
    }

    updatePalmOpenState(isPalmOpen) {
        this.palmOpenHistory.push(isPalmOpen);
        if (this.palmOpenHistory.length > this.palmOpenHistorySize) {
            this.palmOpenHistory.shift();
        }
    }

    /**
     * 檢查是否確認手掌張開（連續多幀）
     */
    isConfirmedPalmOpen() {
        if (this.palmOpenHistory.length < this.palmOpenHistorySize) return false;
        const openCount = this.palmOpenHistory.filter(p => p).length;
        return openCount >= this.palmOpenHistorySize - 1;
    }

    /**
     * 檢測手掌是否張開（五指伸直）
     */
    checkPalmOpen(marks) {
        // 所有手指尖都要高於對應的中間關節
        const indexOpen = marks[8].y < marks[6].y;
        const middleOpen = marks[12].y < marks[10].y;
        const ringOpen = marks[16].y < marks[14].y;
        const pinkyOpen = marks[20].y < marks[18].y;
        
        // 拇指也要張開（遠離食指）
        const thumbAway = Math.abs(marks[4].x - marks[8].x) > 0.08;
        
        return indexOpen && middleOpen && ringOpen && pinkyOpen && thumbAway;
    }

    checkPinch(marks) {
        const dx = marks[4].x - marks[8].x;
        const dy = marks[4].y - marks[8].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // 放寬捏合閾值到 0.08（原本 0.055），更容易觸發抓取
        return dist < 0.08;
    }

    calculateVelocity() {
        if (this.history.length < 3) return new THREE.Vector3(0, 0, 0);
        
        const recentCount = Math.min(4, this.history.length);
        const recent = this.history.slice(-recentCount);
        
        let totalVx = 0;
        let totalVy = 0;
        let totalWeight = 0;
        
        for (let i = 1; i < recent.length; i++) {
            const prev = recent[i-1];
            const curr = recent[i];
            const dt = (curr.time - prev.time) / 1000;
            if (dt > 0 && dt < 0.5) {
                const weight = i * i;
                totalVx += ((curr.x - prev.x) / dt) * weight;
                totalVy += ((curr.y - prev.y) / dt) * weight;
                totalWeight += weight;
            }
        }
        
        if (totalWeight === 0) return new THREE.Vector3(0, 0, 0);
        
        return new THREE.Vector3(totalVx / totalWeight, totalVy / totalWeight, 0);
    }

    resetPinchHistory() {
        this.pinchHistory = [];
        this.palmOpenHistory = [];
        this.stablePinching = false;
    }
}

