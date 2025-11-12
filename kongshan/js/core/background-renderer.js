// =====================================================
// 背景渲染引擎模塊
// Canvas API 封裝
// =====================================================

import { ParticleRenderer } from './particle-renderer.js';

/**
 * 背景渲染引擎
 * 負責抽象背景的生成和渲染
 */
export class BackgroundRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = null;
    this.currentConfig = null;
    this.animationFrameId = null;
    this.transitionAnimationId = null;
    this.transitionStartTime = null;
    this.transitionDuration = 800; // 過渡時長（毫秒）
    this.transitionFromConfig = null;
    this.transitionToConfig = null;
    this.particleRenderer = null; // 粒子渲染器實例
    this.isCleared = false; // 標記是否已被清除（用於取消異步操作）
    this.currentTransitionReject = null; // 當前過渡的 reject 函數
    
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      
      // 創建粒子渲染器容器（疊加在 Canvas 上方）
      this.createParticleContainer();
    }
  }
  
  /**
   * 創建粒子渲染器容器
   */
  createParticleContainer() {
    if (!this.canvas || !this.canvas.parentNode) return;
    
    // 創建容器元素
    const container = document.createElement('div');
    container.id = 'particle-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    `;
    
    // 插入到 Canvas 後面
    this.canvas.parentNode.insertBefore(container, this.canvas.nextSibling);
    
    // 初始化粒子渲染器
    this.particleRenderer = new ParticleRenderer(container);
  }
  
  /**
   * 調整 Canvas 大小
   */
  resize() {
    if (!this.canvas) return;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // 調整粒子渲染器大小
    if (this.particleRenderer) {
      this.particleRenderer.resize();
    }
    
    // 如果已有配置，重新渲染
    if (this.currentConfig) {
      this.render(this.currentConfig);
    }
  }
  
  /**
   * 渲染漸變背景
   */
  renderGradient(colors, direction = 'diagonal') {
    if (!this.ctx) return;
    
    let gradient;
    
    switch (direction) {
      case 'vertical':
        gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        break;
      case 'horizontal':
        gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        break;
      case 'diagonal':
      default:
        gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        break;
    }
    
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * 渲染粒子效果
   */
  renderParticles(count, color, opacity = 0.3) {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = opacity;
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const radius = Math.random() * 3 + 1;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.globalAlpha = 1.0;
  }
  
  /**
   * 渲染抽象線條
   */
  renderAbstractLines(count, color, opacity = 0.2) {
    if (!this.ctx) return;
    
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = opacity;
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i < count; i++) {
      const x1 = Math.random() * this.canvas.width;
      const y1 = Math.random() * this.canvas.height;
      const x2 = Math.random() * this.canvas.width;
      const y2 = Math.random() * this.canvas.height;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1.0;
  }
  
  /**
   * 渲染背景配置
   */
  render(config) {
    if (!this.ctx) return;
    
    // 如果已被清除，不執行渲染
    if (this.isCleared) {
      return;
    }
    
    this.currentConfig = config;
    
    // 清空畫布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染漸變背景
    if (config.color_scheme && config.color_scheme.colors) {
      this.renderGradient(
        config.color_scheme.colors,
        config.color_scheme.direction || 'diagonal'
      );
    }
    
    // 渲染抽象元素
    if (config.abstract_elements && Array.isArray(config.abstract_elements)) {
      config.abstract_elements.forEach(element => {
        switch (element.type) {
          case 'particles':
            this.renderParticles(
              element.count || 50,
              element.color || '#ffffff',
              element.opacity || 0.3
            );
            break;
          case 'lines':
            this.renderAbstractLines(
              element.count || 20,
              element.color || '#ffffff',
              element.opacity || 0.2
            );
            break;
          // TODO: 添加更多元素類型
        }
      });
    }
    
    // 處理粒子動畫
    this.handleParticleAnimation(config);
  }
  
  /**
   * 處理粒子動畫
   * @param {object} config - 背景配置
   */
  handleParticleAnimation(config) {
    if (!this.particleRenderer) return;
    
    // 檢查是否有粒子動畫配置
    if (config.particle_animation && config.particle_animation.preset) {
      const preset = config.particle_animation.preset;
      const animationConfig = config.particle_animation.config || {};
      
      // 設置並啟動粒子動畫
      if (this.particleRenderer.setAnimation(preset, animationConfig)) {
        this.particleRenderer.start();
      }
    } else {
      // 沒有粒子動畫配置，停止並清除
      this.particleRenderer.stop();
      this.particleRenderer.clear();
    }
  }
  
  /**
   * 將十六進制顏色轉換為 RGB 數組
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }

  /**
   * 將 RGB 數組轉換為十六進制顏色
   */
  rgbToHex(rgb) {
    return '#' + rgb.map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * 在兩個顏色之間插值
   */
  interpolateColor(color1, color2, t) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return color1;
    
    const rgb = rgb1.map((c1, i) => c1 + (rgb2[i] - c1) * t);
    return this.rgbToHex(rgb);
  }

  /**
   * 渲染過渡中的背景
   */
  renderTransition(t) {
    if (!this.ctx || !this.transitionFromConfig || !this.transitionToConfig) return;
    
    const fromConfig = this.transitionFromConfig;
    const toConfig = this.transitionToConfig;
    
    // 清空畫布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 過渡漸變背景
    if (fromConfig.color_scheme && fromConfig.color_scheme.colors &&
        toConfig.color_scheme && toConfig.color_scheme.colors) {
      const fromColors = fromConfig.color_scheme.colors;
      const toColors = toConfig.color_scheme.colors;
      const direction = toConfig.color_scheme.direction || 'diagonal';
      
      // 確保顏色數量一致（取較長的）
      const maxLength = Math.max(fromColors.length, toColors.length);
      const interpolatedColors = [];
      
      for (let i = 0; i < maxLength; i++) {
        const fromColor = fromColors[Math.min(i, fromColors.length - 1)];
        const toColor = toColors[Math.min(i, toColors.length - 1)];
        interpolatedColors.push(this.interpolateColor(fromColor, toColor, t));
      }
      
      this.renderGradient(interpolatedColors, direction);
    } else if (toConfig.color_scheme && toConfig.color_scheme.colors) {
      // 如果起始配置沒有顏色，直接渲染目標配置
      this.renderGradient(
        toConfig.color_scheme.colors,
        toConfig.color_scheme.direction || 'diagonal'
      );
    }
    
    // 過渡抽象元素（簡單處理：淡出舊的，淡入新的）
    if (toConfig.abstract_elements && Array.isArray(toConfig.abstract_elements)) {
      const opacity = t; // 新元素逐漸顯示
      toConfig.abstract_elements.forEach(element => {
        switch (element.type) {
          case 'particles':
            this.renderParticles(
              element.count || 50,
              element.color || '#ffffff',
              (element.opacity || 0.3) * opacity
            );
            break;
          case 'lines':
            this.renderAbstractLines(
              element.count || 20,
              element.color || '#ffffff',
              (element.opacity || 0.2) * opacity
            );
            break;
        }
      });
    }
    
    // 處理粒子動畫過渡
    // 當過渡完成時（t >= 1），粒子動畫會在最終 render 中設置
    // 這裡我們在過渡過程中處理粒子動畫的切換
    if (t >= 0.5) {
      // 過渡過半時，開始新的粒子動畫
      this.handleParticleAnimation(toConfig);
    } else if (this.particleRenderer) {
      // 過渡前半段，保持舊的粒子動畫（如果有的話）
      // 或者清除粒子動畫
      if (!fromConfig.particle_animation || !fromConfig.particle_animation.preset) {
        this.particleRenderer.stop();
        this.particleRenderer.clear();
      }
    }
  }

  /**
   * 平滑過渡到新配置
   * @param {object} config - 目標配置
   * @param {number} duration - 過渡時長（毫秒），默認 800ms
   */
  setConfigWithTransition(config, duration = 800) {
    if (!this.ctx) return Promise.reject(new Error('Canvas context not available'));
    
    // 取消正在進行的過渡
    if (this.transitionAnimationId) {
      cancelAnimationFrame(this.transitionAnimationId);
      this.transitionAnimationId = null;
    }
    
    // 如果有正在進行的 Promise，reject 它
    if (this.currentTransitionReject) {
      this.currentTransitionReject(new Error('Transition cancelled'));
      this.currentTransitionReject = null;
    }
    
    // 重置清除標記
    this.isCleared = false;
    
    // 如果沒有當前配置，直接渲染
    if (!this.currentConfig) {
      this.setConfig(config);
      return Promise.resolve();
    }
    
    // 保存過渡狀態
    this.transitionFromConfig = JSON.parse(JSON.stringify(this.currentConfig));
    this.transitionToConfig = JSON.parse(JSON.stringify(config));
    this.transitionDuration = duration;
    this.transitionStartTime = performance.now();
    
    // 開始過渡動畫
    return new Promise((resolve, reject) => {
      // 保存 reject 函數，以便在 clear() 時取消
      this.currentTransitionReject = reject;
      
      const animate = (currentTime) => {
        // 檢查是否已被清除
        if (this.isCleared) {
          this.transitionAnimationId = null;
          this.transitionFromConfig = null;
          this.transitionToConfig = null;
          this.currentTransitionReject = null;
          reject(new Error('Transition cancelled by clear()'));
          return;
        }
        
        const elapsed = currentTime - this.transitionStartTime;
        const progress = Math.min(elapsed / this.transitionDuration, 1);
        
        // 使用緩動函數（ease-in-out）
        const easedProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        this.renderTransition(easedProgress);
        
        if (progress < 1) {
          this.transitionAnimationId = requestAnimationFrame(animate);
        } else {
          // 過渡完成前再次檢查是否已被清除
          if (this.isCleared) {
            this.transitionAnimationId = null;
            this.transitionFromConfig = null;
            this.transitionToConfig = null;
            this.currentTransitionReject = null;
            reject(new Error('Transition cancelled by clear()'));
            return;
          }
          
          // 過渡完成，設置最終配置
          this.currentConfig = config;
          this.render(config);
          this.transitionAnimationId = null;
          this.transitionFromConfig = null;
          this.transitionToConfig = null;
          this.currentTransitionReject = null;
          resolve();
        }
      };
      
      this.transitionAnimationId = requestAnimationFrame(animate);
    });
  }

  /**
   * 設置並渲染背景配置（別名方法，用於兼容性）
   */
  setConfig(config) {
    // 如果有正在進行的過渡，取消它
    if (this.transitionAnimationId) {
      cancelAnimationFrame(this.transitionAnimationId);
      this.transitionAnimationId = null;
    }
    
    // 如果有正在進行的 Promise，reject 它
    if (this.currentTransitionReject) {
      this.currentTransitionReject(new Error('Transition cancelled'));
      this.currentTransitionReject = null;
    }
    
    // 重置清除標記（因為要設置新配置）
    this.isCleared = false;
    
    this.render(config);
  }

  /**
   * 清除背景
   */
  clear() {
    if (!this.ctx) return;
    
    // 設置清除標記，防止後續的 render() 執行
    this.isCleared = true;
    
    // 取消正在進行的過渡
    if (this.transitionAnimationId) {
      cancelAnimationFrame(this.transitionAnimationId);
      this.transitionAnimationId = null;
    }
    
    // 如果有正在進行的 Promise，reject 它
    if (this.currentTransitionReject) {
      this.currentTransitionReject(new Error('Transition cancelled by clear()'));
      this.currentTransitionReject = null;
    }
    
    // 停止並清除粒子動畫
    if (this.particleRenderer) {
      this.particleRenderer.stop();
      this.particleRenderer.clear();
    }
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.currentConfig = null;
    this.transitionFromConfig = null;
    this.transitionToConfig = null;
  }
  
  /**
   * 清理所有資源
   */
  dispose() {
    this.clear();
    
    if (this.particleRenderer) {
      this.particleRenderer.dispose();
      this.particleRenderer = null;
    }
    
    // 移除粒子容器
    const container = document.getElementById('particle-container');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

