// =====================================================
// 粒子動畫渲染器模組
// 使用 particles.js 實現抽象高雅的粒子動畫效果
// =====================================================

/**
 * 粒子動畫渲染器
 * 使用 particles.js 實現粒子動畫效果
 */

// =====================================================
// 自定義粒子素材
// =====================================================
const LANTERN_SVG_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 150">
  <defs>
    <linearGradient id="bodyGradient" x1="0.5" x2="0.5" y1="0" y2="1">
      <stop offset="0" stop-color="#e2593d"/>
      <stop offset="0.25" stop-color="#f37438"/>
      <stop offset="0.65" stop-color="#ff9f3b"/>
      <stop offset="1" stop-color="#ffce5a"/>
    </linearGradient>
    <linearGradient id="highlightGradient" x1="0.8" y1="0.1" x2="0.3" y2="0.7">
      <stop offset="0" stop-color="rgba(255, 255, 255, 0.6)"/>
      <stop offset="0.35" stop-color="rgba(255, 255, 255, 0.3)"/>
      <stop offset="0.8" stop-color="rgba(255, 255, 255, 0)"/>
    </linearGradient>
    <linearGradient id="tailGradient" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0" stop-color="#ffeb9c"/>
      <stop offset="0.4" stop-color="#ffd167"/>
      <stop offset="1" stop-color="#f38335"/>
    </linearGradient>
    <radialGradient id="edgeGradient" cx="0.5" cy="0.2" r="0.65">
      <stop offset="0" stop-color="rgba(255, 245, 215, 0.55)"/>
      <stop offset="0.65" stop-color="rgba(255, 200, 120, 0.25)"/>
      <stop offset="1" stop-color="rgba(255, 180, 90, 0)"/>
    </radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.68" r="0.35">
      <stop offset="0" stop-color="#fffbe0"/>
      <stop offset="0.5" stop-color="#ffe69a" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ffb347" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow" x="-0.6" y="-0.6" width="2.2" height="2.2">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.65 0" result="soft"/>
      <feMerge>
        <feMergeNode in="soft"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="tailGlow" x="-0.8" y="-0.2" width="2.4" height="2">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="tailBlur"/>
      <feColorMatrix in="tailBlur" type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.55 0" result="tailSoft"/>
      <feMerge>
        <feMergeNode in="tailSoft"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="edgeGlow" x="-0.6" y="-0.6" width="2.2" height="2.2">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.45 0" result="softEdge"/>
      <feMerge>
        <feMergeNode in="softEdge"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g filter="url(#softGlow)">
    <path d="M44 6 L74 20 Q84 34 80 68 Q74 104 44 126 Q14 104 8 68 Q4 34 14 20 L44 6 Z" fill="url(#bodyGradient)" stroke="rgba(255, 229, 166, 0.75)" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M44 6 L74 20 Q84 34 80 68 Q74 104 44 126 Z" fill="url(#highlightGradient)"/>
    <path d="M44 18 Q67 28 70 62 Q66 96 44 118" fill="none" stroke="rgba(255, 236, 188, 0.45)" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="44" cy="88" rx="24" ry="16" fill="url(#glow)"/>
    <ellipse cx="44" cy="96" rx="20" ry="11" fill="rgba(255, 221, 150, 0.38)"/>
    <ellipse cx="44" cy="102" rx="18" ry="9" fill="rgba(255, 206, 120, 0.2)"/>
  </g>
  <path d="M44 6 L74 20 Q84 34 80 68 Q74 104 44 126 Q14 104 8 68 Q4 34 14 20 L44 6 Z" fill="none" stroke="url(#edgeGradient)" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" opacity="0.9" filter="url(#edgeGlow)"/>
  <path d="M42 118 Q44 138 36 150 L52 134 Q50 126 52 118 Z" fill="url(#tailGradient)" stroke="rgba(255, 214, 140, 0.8)" stroke-width="1.2" stroke-linejoin="round" filter="url(#tailGlow)"/>
</svg>`;
const LANTERN_IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(LANTERN_SVG_MARKUP)}`;
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
              value: this.isMobile ? 120 : 200,
              density: {
                enable: true,
                value_area: 800
              }
            },
            color: {
              value: ["#FFFFFF", "#F0F0F0", "#E8E8E8"]
            },
            opacity: {
              value: 1.0,
              random: true,
              anim: {
                enable: false
              }
            },
            size: {
              value: 4,
              random: true,
              anim: {
                enable: false
              }
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
        
      case 'lantern-glow':
        return {
          ...baseConfig,
          particles: {
            ...baseConfig.particles,
            number: {
              value: this.isMobile ? 24 : 45,
              density: baseConfig.particles.number.density
            },
            color: {
              value: ['#ffb347', '#ffd384', '#ffe9a7', '#ffdf8e']
            },
            shape: {
              type: 'image',
              image: {
                src: LANTERN_IMAGE_SRC,
                width: 90,
                height: 150
              }
            },
            opacity: {
              value: 0.85,
              random: true,
              anim: {
                enable: true,
                speed: 1.2,
                opacity_min: 0.35,
                sync: false
              }
            },
            size: {
              value: this.isMobile ? 16 : 20,
              random: true,
              anim: {
                enable: true,
                speed: 1,
                size_min: this.isMobile ? 9 : 12,
                sync: false
              }
            },
            line_linked: {
              enable: false
            },
            move: {
              enable: true,
              speed: 0.9,
              direction: 'top',
              random: false,
              straight: false,
              out_mode: 'out',
              bounce: false,
              attract: {
                enable: true,
                rotateX: 300,
                rotateY: 600
              }
            }
          },
          interactivity: {
            detect_on: 'canvas',
            events: {
              onhover: {
                enable: true,
                mode: 'bubble'
              },
              onclick: {
                enable: true,
                mode: 'push'
              },
              resize: true
            },
            modes: {
              bubble: {
                distance: 120,
                size: this.isMobile ? 16 : 20,
                duration: 2,
                opacity: 1
              },
              push: {
                particles_nb: 2
              }
            }
          }
        };
        
      case 'codepen-stars':
        return {
          particles: {
            number: {
              value: this.isMobile ? 200 : 355,
              density: {
                enable: true,
                value_area: 789.15
              }
            },
            color: {
              value: "#ffffff"
            },
            shape: {
              type: "circle",
              stroke: {
                width: 0,
                color: "#000000"
              },
              polygon: {
                nb_sides: 5
              }
            },
            opacity: {
              value: 0.49,
              random: false,
              anim: {
                enable: true,
                speed: 0.25,
                opacity_min: 0,
                sync: false
              }
            },
            size: {
              value: 2,
              random: true,
              anim: {
                enable: true,
                speed: 0.333,
                size_min: 0,
                sync: false
              }
            },
            line_linked: {
              enable: false,
              distance: 150,
              color: "#ffffff",
              opacity: 0.4,
              width: 1
            },
            move: {
              enable: true,
              speed: 0.1,
              direction: "none",
              random: true,
              straight: false,
              out_mode: "out",
              bounce: false,
              attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200
              }
            }
          },
          interactivity: {
            detect_on: "canvas",
            events: {
              onhover: {
                enable: true,
                mode: "bubble"
              },
              onclick: {
                enable: true,
                mode: "push"
              },
              resize: true
            },
            modes: {
              grab: {
                distance: 400,
                line_linked: {
                  opacity: 1
                }
              },
              bubble: {
                distance: 83.9,
                size: 1,
                duration: 3,
                opacity: 1,
                speed: 3
              },
              repulse: {
                distance: 200,
                duration: 0.4
              },
              push: {
                particles_nb: 4
              },
              remove: {
                particles_nb: 2
              }
            }
          },
          retina_detect: true
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
