// =====================================================
// 粒子動畫渲染器模組
// 使用 particles.js 實現抽象高雅的粒子動畫效果
// =====================================================

/**
 * 粒子動畫渲染器
 * 使用 particles.js 實現粒子動畫效果
 */
export class ParticleRenderer {
  constructor(container) {
    this.container = container;
    this.particlesJS = null;
    this.currentPreset = null;
    this.isAnimating = false;
    this.canvasId = `particles-js-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 性能優化配置
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 視窗可見性處理
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  /**
   * 初始化 particles.js
   */
  init() {
    if (typeof particlesJS === 'undefined') {
      console.warn('particles.js 未載入，粒子動畫功能不可用');
      return false;
    }
    
    return true;
  }
  
  /**
   * 設置動畫類型
   * @param {string} preset - 預設動畫類型
   * @param {object} config - 動畫配置
   */
  setAnimation(preset, config = {}) {
    if (!this.init()) {
      return false;
    }
    
    // 清理舊的粒子系統
    this.clear();
    
    this.currentPreset = preset;
    
    // 獲取對應的配置
    const particlesConfig = this.getPresetConfig(preset, config);
    if (!particlesConfig) {
      console.warn(`未知的粒子動畫預設類型: ${preset}`);
      return false;
    }
    
    // 創建 canvas 元素（如果不存在）
    let canvasElement = document.getElementById(this.canvasId);
    if (!canvasElement) {
      canvasElement = document.createElement('div');
      canvasElement.id = this.canvasId;
      canvasElement.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      `;
      this.container.appendChild(canvasElement);
    }
    
    // 初始化 particles.js
    try {
      particlesJS(this.canvasId, particlesConfig);
      this.isAnimating = true;
      return true;
    } catch (error) {
      console.error('初始化粒子動畫失敗:', error);
      return false;
    }
  }
  
  /**
   * 獲取預設配置
   * @param {string} preset - 預設類型
   * @param {object} customConfig - 自定義配置
   */
  getPresetConfig(preset, customConfig = {}) {
    const baseConfig = {
      particles: {
        number: {
          value: this.isMobile ? 50 : 100,
          density: {
            enable: true,
            value_area: 800
          }
        },
        color: {
          value: "#ffffff"
        },
        shape: {
          type: "circle"
        },
        opacity: {
          value: 0.8,
          random: false,
          anim: {
            enable: false
          }
        },
        size: {
          value: 3,
          random: true,
          anim: {
            enable: false
          }
        },
        line_linked: {
          enable: false
        },
        move: {
          enable: true,
          speed: 1,
          direction: "none",
          random: true,
          straight: false,
          out_mode: "out",
          bounce: false,
          attract: {
            enable: false
          }
        }
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: {
            enable: false
          },
          onclick: {
            enable: false
          },
          resize: true
        }
      },
      retina_detect: true
    };
    
    switch (preset) {
      case 'falling-petals':
        return {
          ...baseConfig,
          particles: {
            ...baseConfig.particles,
            number: {
              value: this.isMobile ? 50 : 100,
              density: baseConfig.particles.number.density
            },
            color: {
              value: ["#FFB3BA", "#FFCCCB", "#FFE5E1"]
            },
            opacity: {
              value: 0.8,
              random: true
            },
            size: {
              value: 4,
              random: true
            },
            move: {
              enable: true,
              speed: 0.8,
              direction: "bottom",
              random: true,
              straight: false,
              out_mode: "out",
              bounce: false
            }
          }
        };
        
      case 'snowflakes':
        return {
          ...baseConfig,
          particles: {
            ...baseConfig.particles,
            number: {
              value: this.isMobile ? 80 : 150,
              density: baseConfig.particles.number.density
            },
            color: {
              value: ["#FFFFFF", "#F0F0F0"]
            },
            opacity: {
              value: 0.9,
              random: true
            },
            size: {
              value: 3,
              random: true
            },
            move: {
              enable: true,
              speed: 0.5,
              direction: "bottom",
              random: true,
              straight: false,
              out_mode: "out",
              bounce: false
            }
          }
        };
        
      case 'fireflies':
        return {
          ...baseConfig,
          particles: {
            ...baseConfig.particles,
            number: {
              value: this.isMobile ? 30 : 60,
              density: baseConfig.particles.number.density
            },
            color: {
              value: ["#FFFF99", "#CCFF99"]
            },
            opacity: {
              value: 0.9,
              random: true,
              anim: {
                enable: true,
                speed: 1,
                opacity_min: 0.3,
                sync: false
              }
            },
            size: {
              value: 3,
              random: true
            },
            move: {
              enable: true,
              speed: 0.3,
              direction: "none",
              random: true,
              straight: false,
              out_mode: "out",
              bounce: false
            }
          }
        };
        
      case 'stardust':
        return {
          ...baseConfig,
          particles: {
            ...baseConfig.particles,
            number: {
              value: this.isMobile ? 100 : 200,
              density: baseConfig.particles.number.density
            },
            color: {
              value: ["#FFD700", "#FFA500", "#FFFFFF"]
            },
            opacity: {
              value: 0.8,
              random: true,
              anim: {
                enable: true,
                speed: 0.5,
                opacity_min: 0.4,
                sync: false
              }
            },
            size: {
              value: 2,
              random: true
            },
            move: {
              enable: true,
              speed: 0.2,
              direction: "none",
              random: true,
              straight: false,
              out_mode: "out",
              bounce: false
            }
          }
        };
        
      case 'falling-leaves':
        return {
          ...baseConfig,
          particles: {
            ...baseConfig.particles,
            number: {
              value: this.isMobile ? 40 : 80,
              density: baseConfig.particles.number.density
            },
            color: {
              value: ["#D2691E", "#CD853F", "#DEB887"]
            },
            opacity: {
              value: 0.8,
              random: true
            },
            size: {
              value: 4,
              random: true
            },
            move: {
              enable: true,
              speed: 0.6,
              direction: "bottom",
              random: true,
              straight: false,
              out_mode: "out",
              bounce: false
            }
          }
        };
        
      default:
        return null;
    }
  }
  
  /**
   * 開始動畫
   */
  start() {
    // particles.js 會在 setAnimation 時自動開始
    this.isAnimating = true;
  }
  
  /**
   * 停止動畫
   */
  stop() {
    this.isAnimating = false;
    // particles.js 沒有直接的停止方法，通過清除來停止
    this.clear();
  }
  
  /**
   * 響應視窗大小變化
   */
  resize() {
    // particles.js 會自動處理 resize（通過 interactivity.resize: true）
    // 如果需要手動觸發，可以重新初始化
    if (this.currentPreset && this.isAnimating) {
      // 重新設置動畫以響應大小變化
      const currentConfig = {};
      this.setAnimation(this.currentPreset, currentConfig);
    }
  }
  
  /**
   * 處理視窗可見性變化
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // 頁面隱藏時暫停動畫（通過清除）
      if (this.isAnimating) {
        this.stop();
      }
    } else {
      // 頁面顯示時恢復動畫
      if (this.currentPreset && !this.isAnimating) {
        this.setAnimation(this.currentPreset, {});
        this.start();
      }
    }
  }
  
  /**
   * 清理資源
   */
  dispose() {
    this.clear();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  /**
   * 清除當前粒子動畫
   */
  clear() {
    this.isAnimating = false;
    
    // 清除 particles.js 實例
    if (window.pJSDom && Array.isArray(window.pJSDom)) {
      const pJSIndex = window.pJSDom.findIndex(pJS => {
        if (!pJS || !pJS.pJS || !pJS.pJS.canvas || !pJS.pJS.canvas.el) {
          return false;
        }
        return pJS.pJS.canvas.el.id === this.canvasId;
      });
      
      if (pJSIndex !== -1) {
        try {
          const pJSInstance = window.pJSDom[pJSIndex];
          if (pJSInstance.pJS && pJSInstance.pJS.fn && pJSInstance.pJS.fn.vendors) {
            pJSInstance.pJS.fn.vendors.destroypJS();
          }
          window.pJSDom.splice(pJSIndex, 1);
        } catch (error) {
          console.warn('清理 particles.js 實例時出錯:', error);
        }
      }
    }
    
    // 移除 canvas 元素
    const canvasElement = document.getElementById(this.canvasId);
    if (canvasElement && canvasElement.parentNode) {
      canvasElement.parentNode.removeChild(canvasElement);
    }
    
    this.currentPreset = null;
  }
}
