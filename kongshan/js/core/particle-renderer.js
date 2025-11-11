// =====================================================
// 粒子動畫渲染器模組
// 使用 Three.js 實現抽象高雅的粒子動畫效果
// =====================================================

/**
 * 粒子動畫渲染器
 * 使用 Three.js WebGL 渲染器實現粒子動畫效果
 */
export class ParticleRenderer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particles = null;
    this.animationId = null;
    this.isAnimating = false;
    this.currentPreset = null;
    this.particleSystem = null;
    
    // 性能優化配置
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.particleCount = this.isMobile ? 50 : 100; // 移動端減少粒子數量
    
    // 視窗可見性處理
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  /**
   * 初始化 Three.js 場景
   */
  init() {
    if (typeof THREE === 'undefined') {
      console.warn('Three.js 未載入，粒子動畫功能不可用');
      return false;
    }
    
    try {
      // 創建場景
      this.scene = new THREE.Scene();
      
      // 創建相機（透視相機，適合 3D 效果）
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      this.camera.position.z = 5;
      
      // 創建渲染器
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !this.isMobile // 移動端關閉抗鋸齒以提升性能
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比以提升性能
      this.renderer.setClearColor(0x000000, 0); // 透明背景
      
      // 將渲染器添加到容器
      this.container.appendChild(this.renderer.domElement);
      
      return true;
    } catch (error) {
      console.error('初始化粒子渲染器失敗:', error);
      return false;
    }
  }
  
  /**
   * 設置動畫類型
   * @param {string} preset - 預設動畫類型
   * @param {object} config - 動畫配置
   */
  setAnimation(preset, config = {}) {
    if (!this.scene || !this.renderer) {
      if (!this.init()) {
        return false;
      }
    }
    
    // 清理舊的粒子系統
    this.clear();
    
    this.currentPreset = preset;
    
    // 根據預設類型創建粒子系統
    switch (preset) {
      case 'falling-petals':
        this.createFallingParticles(config, ['#FFB3BA', '#FFCCCB', '#FFE5E1'], 'circle');
        break;
      case 'snowflakes':
        this.createFallingParticles(config, ['#FFFFFF', '#F0F0F0'], 'circle');
        break;
      case 'fireflies':
        this.createFireflies(config);
        break;
      case 'stardust':
        this.createStardust(config);
        break;
      case 'falling-leaves':
        this.createFallingParticles(config, ['#D2691E', '#CD853F', '#DEB887'], 'circle');
        break;
      default:
        console.warn(`未知的粒子動畫預設類型: ${preset}`);
        return false;
    }
    
    return true;
  }
  
  /**
   * 創建飄落粒子效果（2D 平面粒子）
   * @param {object} config - 配置對象
   * @param {array} colors - 顏色數組
   * @param {string} shape - 粒子形狀（'circle' 或 'square'）
   */
  createFallingParticles(config, colors, shape = 'circle') {
    const count = config.count || (this.isMobile ? 50 : 100);
    const size = config.size || (this.isMobile ? 0.05 : 0.08);
    const speed = config.speed || 0.5;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors_array = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rotations = new Float32Array(count);
    const rotationSpeeds = new Float32Array(count);
    
    // 將顏色轉換為 RGB
    const colorObjects = colors.map(c => new THREE.Color(c));
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 初始位置（隨機分佈在畫面上方）
      positions[i3] = (Math.random() - 0.5) * 10;
      positions[i3 + 1] = Math.random() * 10 + 5; // 從上方開始
      positions[i3 + 2] = (Math.random() - 0.5) * 2;
      
      // 速度（向下飄落）
      velocities[i3] = (Math.random() - 0.5) * 0.2; // 輕微橫向飄動
      velocities[i3 + 1] = -(Math.random() * speed + speed * 0.5); // 向下
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
      
      // 隨機顏色
      const color = colorObjects[Math.floor(Math.random() * colorObjects.length)];
      colors_array[i3] = color.r;
      colors_array[i3 + 1] = color.g;
      colors_array[i3 + 2] = color.b;
      
      // 大小
      sizes[i] = Math.random() * size + size * 0.5;
      
      // 旋轉
      rotations[i] = Math.random() * Math.PI * 2;
      rotationSpeeds[i] = (Math.random() - 0.5) * 0.02;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors_array, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));
    geometry.setAttribute('rotationSpeed', new THREE.BufferAttribute(rotationSpeeds, 1));
    
    // 創建材質
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float rotation;
        attribute float rotationSpeed;
        varying vec3 vColor;
        varying float vRotation;
        varying float vRotationSpeed;
        
        void main() {
          vColor = color;
          vRotation = rotation;
          vRotationSpeed = rotationSpeed;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vColor;
        varying float vRotation;
        varying float vRotationSpeed;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          // 創建圓形粒子
          if (dist > 0.5) discard;
          
          // 邊緣柔化
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.userData = {
      velocities: velocities,
      type: 'falling',
      speed: speed
    };
    
    this.scene.add(this.particleSystem);
  }
  
  /**
   * 創建螢火效果（3D 發光點）
   * @param {object} config - 配置對象
   */
  createFireflies(config) {
    const count = config.count || (this.isMobile ? 30 : 60);
    const size = config.size || 0.1;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors_array = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count); // 用於亮度脈衝
    
    const color1 = new THREE.Color('#FFFF99');
    const color2 = new THREE.Color('#CCFF99');
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 隨機位置分佈在 3D 空間中
      positions[i3] = (Math.random() - 0.5) * 10;
      positions[i3 + 1] = (Math.random() - 0.5) * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 5;
      
      // 緩慢移動速度
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
      
      // 隨機顏色（黃綠色之間）
      const t = Math.random();
      const color = new THREE.Color().lerpColors(color1, color2, t);
      colors_array[i3] = color.r;
      colors_array[i3 + 1] = color.g;
      colors_array[i3 + 2] = color.b;
      
      sizes[i] = size;
      phases[i] = Math.random() * Math.PI * 2; // 隨機相位
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors_array, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float phase;
        varying vec3 vColor;
        varying float vPhase;
        
        void main() {
          vColor = color;
          vPhase = phase;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vColor;
        varying float vPhase;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          // 亮度脈衝效果
          float pulse = sin(time * 0.5 + vPhase) * 0.5 + 0.5;
          float alpha = (1.0 - smoothstep(0.2, 0.5, dist)) * pulse * 0.9;
          
          // 發光效果（增強亮度）
          vec3 glowColor = vColor * (1.0 + pulse * 0.5);
          
          gl_FragColor = vec4(glowColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.userData = {
      velocities: velocities,
      type: 'fireflies'
    };
    
    this.scene.add(this.particleSystem);
  }
  
  /**
   * 創建星光效果（3D 光點閃爍）
   * @param {object} config - 配置對象
   */
  createStardust(config) {
    const count = config.count || (this.isMobile ? 100 : 200);
    const size = config.size || 0.06;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors_array = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    
    const color1 = new THREE.Color('#FFD700');
    const color2 = new THREE.Color('#FFA500');
    const color3 = new THREE.Color('#FFFFFF');
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 分佈在 3D 空間中
      positions[i3] = (Math.random() - 0.5) * 15;
      positions[i3 + 1] = (Math.random() - 0.5) * 15;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;
      
      // 緩慢移動
      velocities[i3] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.005;
      
      // 隨機顏色（金色/銀色）
      const colors = [color1, color2, color3];
      const color = colors[Math.floor(Math.random() * colors.length)];
      colors_array[i3] = color.r;
      colors_array[i3 + 1] = color.g;
      colors_array[i3 + 2] = color.b;
      
      sizes[i] = Math.random() * size + size * 0.5;
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors_array, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float phase;
        varying vec3 vColor;
        varying float vPhase;
        
        void main() {
          vColor = color;
          vPhase = phase;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vColor;
        varying float vPhase;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          // 閃爍效果
          float twinkle = sin(time * 2.0 + vPhase) * 0.3 + 0.7;
          float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * twinkle * 0.9;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.userData = {
      velocities: velocities,
      type: 'stardust'
    };
    
    this.scene.add(this.particleSystem);
  }
  
  /**
   * 開始動畫
   */
  start() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.animate();
  }
  
  /**
   * 停止動畫
   */
  stop() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * 動畫循環
   */
  animate() {
    if (!this.isAnimating || !this.renderer || !this.scene || !this.camera) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const time = performance.now() * 0.001;
    
    // 更新粒子系統
    if (this.particleSystem) {
      const material = this.particleSystem.material;
      if (material.uniforms && material.uniforms.time) {
        material.uniforms.time.value = time;
      }
      
      const userData = this.particleSystem.userData;
      const positions = this.particleSystem.geometry.attributes.position;
      
      if (userData.type === 'falling') {
        // 飄落粒子：更新位置
        for (let i = 0; i < positions.count; i++) {
          const i3 = i * 3;
          
          positions.array[i3] += userData.velocities[i3];
          positions.array[i3 + 1] += userData.velocities[i3 + 1];
          positions.array[i3 + 2] += userData.velocities[i3 + 2];
          
          // 重置位置（從上方重新開始）
          if (positions.array[i3 + 1] < -5) {
            positions.array[i3] = (Math.random() - 0.5) * 10;
            positions.array[i3 + 1] = 5 + Math.random() * 5;
            positions.array[i3 + 2] = (Math.random() - 0.5) * 2;
          }
        }
        positions.needsUpdate = true;
      } else if (userData.type === 'fireflies' || userData.type === 'stardust') {
        // 3D 粒子：緩慢移動
        for (let i = 0; i < positions.count; i++) {
          const i3 = i * 3;
          
          positions.array[i3] += userData.velocities[i3];
          positions.array[i3 + 1] += userData.velocities[i3 + 1];
          positions.array[i3 + 2] += userData.velocities[i3 + 2];
          
          // 邊界處理（環繞）
          if (Math.abs(positions.array[i3]) > 7.5) userData.velocities[i3] *= -1;
          if (Math.abs(positions.array[i3 + 1]) > 7.5) userData.velocities[i3 + 1] *= -1;
          if (Math.abs(positions.array[i3 + 2]) > 5) userData.velocities[i3 + 2] *= -1;
        }
        positions.needsUpdate = true;
      }
    }
    
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * 響應視窗大小變化
   */
  resize() {
    if (!this.camera || !this.renderer) return;
    
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }
  
  /**
   * 處理視窗可見性變化
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.stop();
    } else if (this.particleSystem && this.currentPreset) {
      this.start();
    }
  }
  
  /**
   * 清理資源
   */
  dispose() {
    this.stop();
    
    // 清理粒子系統
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
      this.particleSystem = null;
    }
    
    // 清理渲染器
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    
    // 清理場景
    if (this.scene) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
      this.scene = null;
    }
    
    this.camera = null;
    this.currentPreset = null;
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  /**
   * 清除當前粒子動畫
   */
  clear() {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
      this.particleSystem = null;
    }
    this.currentPreset = null;
    this.stop();
  }
}

