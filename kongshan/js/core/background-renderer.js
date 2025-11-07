// =====================================================
// 背景渲染引擎模塊
// Canvas API 封裝
// =====================================================

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
    
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }
  
  /**
   * 調整 Canvas 大小
   */
  resize() {
    if (!this.canvas) return;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
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
  }
  
  /**
   * 清除背景
   */
  clear() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.currentConfig = null;
  }
}

