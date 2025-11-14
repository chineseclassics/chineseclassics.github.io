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
    
    // 自定義 Canvas 動畫相關
    this.customCanvas = null;
    this.customCtx = null;
    this.customAnimationFrameId = null;
    this.customStars = [];
    this.customGradientCache = null;
    this.customResizeHandler = null;
    this.customAnimationType = null;
    this.starfieldConfig = null;
    this.starfieldVisualConfig = null;
    this.lastPreset = null;
    this.lastConfig = null;
    this.wasAnimatingBeforeHide = false;
    
    // 視窗可見性處理
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  /**
   * 初始化 particles.js
   */
  init() {
    if (typeof window === 'undefined' || typeof window.particlesJS !== 'function') {
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
    // 清理舊的粒子系統
    this.clear();
    
    this.currentPreset = preset;
    this.lastPreset = preset;
    this.lastConfig = this.cloneConfig(config);
    
    // 檢查是否為自定義 Canvas 動畫
    if (preset === 'rotating-stars') {
      return this.initRotatingStars(config);
    }
    if (preset === 'twinkling-stars') {
      return this.initTwinklingStars(config);
    }
    
    // 使用 particles.js 的預設
    if (!this.init()) {
      return false;
    }
    
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
      if (!Array.isArray(window.pJSDom)) {
        window.pJSDom = [];
      }
      window.particlesJS(this.canvasId, particlesConfig);
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
              value: this.isMobile ? 12 : 22,
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
              speed: this.isMobile ? 1.0 : 1.3,
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
              value: this.isMobile ? 134 : 236,
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
              value: 0.7,
              random: true,
              anim: {
                enable: true,
                speed: 0.35,
                opacity_min: 0.25,
                sync: false
              }
            },
            size: {
              value: 2,
              random: true,
              anim: {
                enable: true,
                speed: 0.2,
                size_min: 0.4,
                sync: false
              }
            },
            line_linked: {
              enable: false,
              distance: 150,
              color: "#ffffff",
              opacity: 0.2,
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
        
      case 'rainfall':
        return {
          ...baseConfig,
          particles: {
            ...baseConfig.particles,
            number: {
              value: this.isMobile ? 120 : 180,
              density: {
                enable: true,
                value_area: 900
              }
            },
            color: {
              value: ['#9ac4ff', '#7aa9f7', '#b2d3ff']
            },
            opacity: {
              value: 0.55,
              random: true,
              anim: {
                enable: true,
                speed: 1.5,
                opacity_min: 0.15,
                sync: false
              }
            },
            size: {
              value: 1.6,
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
              speed: this.isMobile ? 6 : 8,
              direction: 'bottom',
              random: false,
              straight: true,
              out_mode: 'out',
              bounce: false
            }
          },
          interactivity: {
            detect_on: 'canvas',
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
        
      case 'rotating-stars':
        // 這個預設使用自定義 Canvas 動畫，不在這裡返回配置
        return null;
      case 'twinkling-stars':
        // 這個預設也使用自定義 Canvas 動畫
        return null;
        
      default:
        return null;
    }
  }
  
  /**
   * 初始化旋轉星空動畫（自定義 Canvas）
   * @param {object} config - 動畫配置
   */
  initRotatingStars(config = {}) {
    try {
      // 創建 Canvas 元素
      this.customCanvas = document.createElement('canvas');
      this.customCanvas.id = this.canvasId;
      this.customCanvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      `;
      this.container.appendChild(this.customCanvas);
      
      this.customCtx = this.customCanvas.getContext('2d');
      this.resizeCustomCanvas();
      
      // 配置參數
      const hue = config.hue !== undefined ? config.hue : 217;
      const maxStars = config.maxStars !== undefined 
        ? config.maxStars 
        : (this.isMobile ? 600 : 1400);
      
      const palette = Array.isArray(config.starColorPalette) && config.starColorPalette.length > 0
        ? config.starColorPalette
        : ['#fff9e6', '#cfe8ff', '#ffe0ff', '#f4ffd2'];
      
      const backgroundColor = config.backgroundColor || `hsla(${hue}, 72%, 5%, 1)`;
      const backgroundAlpha = typeof config.backgroundAlpha === 'number'
        ? Math.min(Math.max(config.backgroundAlpha, 0.3), 0.95)
        : 0.68;
      const starSizeMultiplier = typeof config.starSizeMultiplier === 'number'
        ? config.starSizeMultiplier
        : 1.15;
      const starIntensity = typeof config.starIntensity === 'number'
        ? config.starIntensity
        : 1.1;
      const brightnessRangeRaw = Array.isArray(config.brightnessRange) && config.brightnessRange.length === 2
        ? config.brightnessRange
        : [0.4, 0.95];
      const minAlpha = Math.min(brightnessRangeRaw[0], brightnessRangeRaw[1]);
      const maxAlpha = Math.max(brightnessRangeRaw[0], brightnessRangeRaw[1]);
      
      this.starfieldVisualConfig = {
        backgroundColor,
        backgroundAlpha,
        starSizeMultiplier,
        starIntensity,
        starColorPalette: palette,
        brightnessRange: [
          Math.min(Math.max(minAlpha, 0.1), 0.95),
          Math.min(Math.max(maxAlpha, 0.2), 1)
        ]
      };
      
      // 保存配置以便在 resize 時使用
      this.starfieldConfig = { hue, maxStars };
      
      // 緩存漸變（性能優化）
      this.createGradientCache(hue, palette);
      
      // 初始化星星
      this.initStars(maxStars);
      
      this.customAnimationType = 'rotating-stars';
      
      // 開始動畫
      this.isAnimating = true;
      this.animateRotatingStars();
      
      // 綁定 resize 處理
      this.setupCustomResizeHandler();
      
      return true;
    } catch (error) {
      console.error('初始化旋轉星空動畫失敗:', error);
      return false;
    }
  }
  
  /**
   * 初始化靜態閃爍星空動畫（自定義 Canvas）
   * @param {object} config - 動畫配置
   */
  initTwinklingStars(config = {}) {
    try {
      // 創建 Canvas 元素
      this.customCanvas = document.createElement('canvas');
      this.customCanvas.id = this.canvasId;
      this.customCanvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      `;
      this.container.appendChild(this.customCanvas);
      
      this.customCtx = this.customCanvas.getContext('2d');
      this.resizeCustomCanvas();
      
      // 配置參數
      const hue = config.hue !== undefined ? config.hue : 225;
      const maxStars = config.maxStars !== undefined 
        ? config.maxStars 
        : (this.isMobile ? 420 : 950);
      
      const palette = Array.isArray(config.starColorPalette) && config.starColorPalette.length > 0
        ? config.starColorPalette
        : ['#fefefe', '#cfe8ff', '#ffe7c4', '#ffd8d0', '#c7d8ff'];
      
      const backgroundColor = config.backgroundColor || '#03060f';
      const backgroundAlpha = typeof config.backgroundAlpha === 'number'
        ? Math.min(Math.max(config.backgroundAlpha, 0.25), 0.9)
        : 0.78;
      const starSizeMultiplier = typeof config.starSizeMultiplier === 'number'
        ? config.starSizeMultiplier
        : 1.05;
      const starIntensity = typeof config.starIntensity === 'number'
        ? config.starIntensity
        : 1.2;
      const brightnessRangeRaw = Array.isArray(config.brightnessRange) && config.brightnessRange.length === 2
        ? config.brightnessRange
        : [0.35, 0.95];
      const twinkleSpeedRangeRaw = Array.isArray(config.twinkleSpeedRange) && config.twinkleSpeedRange.length === 2
        ? config.twinkleSpeedRange
        : [0.006, 0.02];
      const sparkleChance = typeof config.sparkleChance === 'number'
        ? Math.min(Math.max(config.sparkleChance, 0), 0.2)
        : 0.025;
      const sparkleBoost = typeof config.sparkleBoost === 'number'
        ? Math.min(Math.max(config.sparkleBoost, 0.05), 0.4)
        : 0.2;
      
      const minAlpha = Math.min(brightnessRangeRaw[0], brightnessRangeRaw[1]);
      const maxAlpha = Math.max(brightnessRangeRaw[0], brightnessRangeRaw[1]);
      const twinkleMin = Math.min(twinkleSpeedRangeRaw[0], twinkleSpeedRangeRaw[1]);
      const twinkleMax = Math.max(twinkleSpeedRangeRaw[0], twinkleSpeedRangeRaw[1]);
      
      this.starfieldVisualConfig = {
        backgroundColor,
        backgroundAlpha,
        starSizeMultiplier,
        starIntensity,
        starColorPalette: palette,
        brightnessRange: [
          Math.min(Math.max(minAlpha, 0.15), 0.95),
          Math.min(Math.max(maxAlpha, 0.25), 1)
        ],
        twinkleSpeedRange: [
          Math.min(Math.max(twinkleMin, 0.001), 0.05),
          Math.min(Math.max(twinkleMax, 0.002), 0.08)
        ],
        sparkleChance,
        sparkleBoost
      };
      
      this.starfieldConfig = { hue, maxStars };
      
      // 緩存漸變（性能優化）
      this.createGradientCache(hue, palette);
      
      // 初始化星星
      this.initTwinklingStarfield(maxStars);
      
      this.customAnimationType = 'twinkling-stars';
      
      // 開始動畫
      this.isAnimating = true;
      this.animateTwinklingStars();
      
      // 綁定 resize 處理
      this.setupCustomResizeHandler();
      
      return true;
    } catch (error) {
      console.error('初始化靜態星空動畫失敗:', error);
      return false;
    }
  }
  
  /**
   * 創建漸變緩存（性能優化）
   */
  createGradientCache(hue, palette = []) {
    const colors = Array.isArray(palette) && palette.length > 0
      ? palette
      : [null];
    
    this.customGradientCache = colors.map(color => {
      const canvas2 = document.createElement('canvas');
      const ctx2 = canvas2.getContext('2d');
      canvas2.width = 120;
      canvas2.height = 120;
      
      const half = canvas2.width / 2;
      const gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half);
      const accent = color || `hsl(${hue}, 78%, 72%)`;
      
      gradient2.addColorStop(0.015, 'rgba(255, 255, 255, 0.98)');
      gradient2.addColorStop(0.08, accent);
      gradient2.addColorStop(0.25, `hsla(${hue}, 65%, 35%, 0.85)`);
      gradient2.addColorStop(0.5, `hsla(${hue}, 70%, 15%, 0.45)`);
      gradient2.addColorStop(1, 'transparent');
      
      ctx2.fillStyle = gradient2;
      ctx2.beginPath();
      ctx2.arc(half, half, half, 0, Math.PI * 2);
      ctx2.fill();
      
      return canvas2;
    });
  }
  
  /**
   * 初始化旋轉星空的星星數據
   */
  initStars(maxStars) {
    this.customStars = [];
    const w = this.customCanvas.width;
    const h = this.customCanvas.height;
    const visualConfig = this.starfieldVisualConfig || {};
    const sizeMultiplier = typeof visualConfig.starSizeMultiplier === 'number'
      ? visualConfig.starSizeMultiplier
      : 1;
    const brightnessRange = Array.isArray(visualConfig.brightnessRange) && visualConfig.brightnessRange.length === 2
      ? visualConfig.brightnessRange
      : [0.35, 1];
    const minAlpha = Math.min(brightnessRange[0], brightnessRange[1]);
    const maxAlpha = Math.max(brightnessRange[0], brightnessRange[1]);
    const gradientCacheLength = Array.isArray(this.customGradientCache)
      ? this.customGradientCache.length
      : (this.customGradientCache ? 1 : 0);
    const paletteLength = gradientCacheLength > 0 ? gradientCacheLength : 1;
    
    const maxOrbit = (x, y) => {
      const max = Math.max(x, y);
      const diameter = Math.round(Math.sqrt(max * max + max * max));
      return diameter / 2;
    };
    
    const random = (min, max) => {
      if (arguments.length < 2) {
        max = min;
        min = 0;
      }
      if (min > max) {
        const hold = max;
        max = min;
        min = hold;
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    
    for (let i = 0; i < maxStars; i++) {
      const orbitRadius = random(maxOrbit(w, h));
      const normalizedRange = Math.max(maxAlpha - minAlpha, 0.01);
      const star = {
        orbitRadius: orbitRadius,
        radius: (random(60, orbitRadius) / 12) * sizeMultiplier,
        orbitX: w / 2,
        orbitY: h / 2,
        timePassed: random(0, maxStars),
        speed: random(orbitRadius) / 50000,
        alpha: minAlpha + Math.random() * normalizedRange,
        gradientIndex: Math.floor(Math.random() * paletteLength)
      };
      this.customStars.push(star);
    }
  }
  
  /**
   * 初始化靜態閃爍星空的星星數據
   */
  initTwinklingStarfield(maxStars) {
    this.customStars = [];
    const w = this.customCanvas?.width || window.innerWidth;
    const h = this.customCanvas?.height || window.innerHeight;
    const visualConfig = this.starfieldVisualConfig || {};
    const sizeMultiplier = typeof visualConfig.starSizeMultiplier === 'number'
      ? visualConfig.starSizeMultiplier
      : 1;
    const brightnessRange = Array.isArray(visualConfig.brightnessRange) && visualConfig.brightnessRange.length === 2
      ? visualConfig.brightnessRange
      : [0.35, 0.95];
    const twinkleRange = Array.isArray(visualConfig.twinkleSpeedRange) && visualConfig.twinkleSpeedRange.length === 2
      ? visualConfig.twinkleSpeedRange
      : [0.006, 0.02];
    const minAlpha = Math.min(brightnessRange[0], brightnessRange[1]);
    const maxAlpha = Math.max(brightnessRange[0], brightnessRange[1]);
    const twinkleMin = Math.min(twinkleRange[0], twinkleRange[1]);
    const twinkleMax = Math.max(twinkleRange[0], twinkleRange[1]);
    const gradientCacheLength = Array.isArray(this.customGradientCache)
      ? this.customGradientCache.length
      : (this.customGradientCache ? 1 : 0);
    const paletteLength = gradientCacheLength > 0 ? gradientCacheLength : 1;
    
    const randomRadius = () => {
      const base = Math.pow(Math.random(), 1.6);
      return (0.6 + base * 2.4) * sizeMultiplier;
    };
    
    for (let i = 0; i < maxStars; i++) {
      const localMin = minAlpha + Math.random() * 0.1;
      const localMax = Math.min(maxAlpha + Math.random() * 0.05, 1);
      
      this.customStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: randomRadius(),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: twinkleMin + Math.random() * (twinkleMax - twinkleMin || 0.001),
        minAlpha: Math.min(localMin, localMax - 0.05),
        maxAlpha: localMax,
        gradientIndex: Math.floor(Math.random() * paletteLength)
      });
    }
  }
  
  /**
   * 調整自定義 Canvas 大小
   */
  resizeCustomCanvas() {
    if (!this.customCanvas) return;
    this.customCanvas.width = window.innerWidth;
    this.customCanvas.height = window.innerHeight;
  }
  
  /**
   * 綁定自定義星空動畫的 resize 處理
   */
  setupCustomResizeHandler() {
    if (this.customResizeHandler) {
      window.removeEventListener('resize', this.customResizeHandler);
      this.customResizeHandler = null;
    }
    
    this.customResizeHandler = () => {
      if (!this.isAnimating || !this.customCanvas) {
        return;
      }
      
      if (!this.currentPreset || this.customAnimationType !== this.currentPreset) {
        return;
      }
      
      this.resizeCustomCanvas();
      const savedConfig = this.starfieldConfig || {};
      const fallback = this.isMobile ? 500 : 1100;
      const maxStars = savedConfig.maxStars || fallback;
      
      if (this.customAnimationType === 'rotating-stars') {
        this.initStars(maxStars);
      } else if (this.customAnimationType === 'twinkling-stars') {
        this.initTwinklingStarfield(maxStars);
      }
    };
    
    window.addEventListener('resize', this.customResizeHandler);
  }
  
  /**
   * 暫停 particles.js 動畫（保留配置以便恢復）
   */
  pauseParticlesAnimation() {
    if (this.customAnimationType || !this.currentPreset) {
      this.isAnimating = false;
      return;
    }
    
    this.isAnimating = false;
    this.clear(false);
  }
  
  /**
   * 動畫循環（旋轉星空）
   */
  animateRotatingStars() {
    if (!this.isAnimating || !this.customCtx || !this.customCanvas) return;
    if (this.customAnimationType !== 'rotating-stars') return;
    
    const w = this.customCanvas.width;
    const h = this.customCanvas.height;
    const hue = this.starfieldConfig?.hue ?? 217;
    const visualConfig = this.starfieldVisualConfig || {};
    const backgroundAlpha = typeof visualConfig.backgroundAlpha === 'number'
      ? visualConfig.backgroundAlpha
      : 0.8;
    const backgroundColor = visualConfig.backgroundColor || `hsla(${hue}, 64%, 6%, 1)`;
    const [minAlphaLimit, maxAlphaLimit] = Array.isArray(visualConfig.brightnessRange) && visualConfig.brightnessRange.length === 2
      ? visualConfig.brightnessRange
      : [0.35, 1];
    const minAlpha = Math.min(minAlphaLimit, maxAlphaLimit);
    const maxAlpha = Math.max(minAlphaLimit, maxAlphaLimit);
    const starIntensity = typeof visualConfig.starIntensity === 'number'
      ? visualConfig.starIntensity
      : 1;
    const gradientCache = Array.isArray(this.customGradientCache)
      ? this.customGradientCache
      : (this.customGradientCache ? [this.customGradientCache] : []);
    
    // 繪製背景（半透明，形成拖尾效果）
    this.customCtx.globalCompositeOperation = 'source-over';
    this.customCtx.globalAlpha = Math.min(Math.max(backgroundAlpha, 0.1), 0.95);
    this.customCtx.fillStyle = backgroundColor;
    this.customCtx.fillRect(0, 0, w, h);
    
    // 繪製星星
    this.customCtx.globalCompositeOperation = 'lighter';
    
    const random = (min, max) => {
      if (arguments.length < 2) {
        max = min;
        min = 0;
      }
      if (min > max) {
        const hold = max;
        max = min;
        min = hold;
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    
    for (let i = 0; i < this.customStars.length; i++) {
      const star = this.customStars[i];
      const x = Math.sin(star.timePassed) * star.orbitRadius + star.orbitX;
      const y = Math.cos(star.timePassed) * star.orbitRadius + star.orbitY;
      const twinkle = random(10);
      
      if (twinkle === 1 && star.alpha > minAlpha) {
        star.alpha = Math.max(minAlpha, star.alpha - 0.05);
      } else if (twinkle === 2 && star.alpha < maxAlpha) {
        star.alpha = Math.min(maxAlpha, star.alpha + 0.05);
      }
      
      const paletteIndex = gradientCache.length > 0
        ? gradientCache[star.gradientIndex % gradientCache.length]
        : null;
      const drawSize = star.radius * starIntensity;
      this.customCtx.globalAlpha = Math.min(star.alpha * starIntensity, 1);
      
      if (paletteIndex) {
        this.customCtx.drawImage(
          paletteIndex,
          x - drawSize / 2,
          y - drawSize / 2,
          drawSize,
          drawSize
        );
      } else {
        this.customCtx.fillStyle = '#ffffff';
        this.customCtx.beginPath();
        this.customCtx.arc(x, y, drawSize / 2, 0, Math.PI * 2);
        this.customCtx.fill();
      }
      star.timePassed += star.speed;
    }
    
    this.customAnimationFrameId = requestAnimationFrame(() => this.animateRotatingStars());
  }
  
  /**
   * 動畫循環（靜態閃爍星空）
   */
  animateTwinklingStars() {
    if (!this.isAnimating || !this.customCtx || !this.customCanvas) return;
    if (this.customAnimationType !== 'twinkling-stars') return;
    
    const w = this.customCanvas.width;
    const h = this.customCanvas.height;
    const hue = this.starfieldConfig?.hue ?? 220;
    const visualConfig = this.starfieldVisualConfig || {};
    const backgroundAlpha = typeof visualConfig.backgroundAlpha === 'number'
      ? visualConfig.backgroundAlpha
      : 0.78;
    const backgroundColor = visualConfig.backgroundColor || `hsla(${hue}, 62%, 6%, 1)`;
    const starIntensity = typeof visualConfig.starIntensity === 'number'
      ? visualConfig.starIntensity
      : 1.2;
    const sparkleChance = typeof visualConfig.sparkleChance === 'number'
      ? visualConfig.sparkleChance
      : 0.02;
    const sparkleBoost = typeof visualConfig.sparkleBoost === 'number'
      ? visualConfig.sparkleBoost
      : 0.2;
    const gradientCache = Array.isArray(this.customGradientCache)
      ? this.customGradientCache
      : (this.customGradientCache ? [this.customGradientCache] : []);
    
    // 背景層（保留拖尾）
    this.customCtx.globalCompositeOperation = 'source-over';
    this.customCtx.globalAlpha = Math.min(Math.max(backgroundAlpha, 0.2), 0.95);
    this.customCtx.fillStyle = backgroundColor;
    this.customCtx.fillRect(0, 0, w, h);
    
    // 加上淡淡的藍紫色漸層，增加層次
    const gradientOverlay = this.customCtx.createLinearGradient(0, 0, 0, h);
    gradientOverlay.addColorStop(0, 'rgba(8, 14, 35, 0.35)');
    gradientOverlay.addColorStop(1, 'rgba(2, 4, 10, 0.65)');
    this.customCtx.globalAlpha = 0.3;
    this.customCtx.fillStyle = gradientOverlay;
    this.customCtx.fillRect(0, 0, w, h);
    
    // 星星層
    this.customCtx.globalCompositeOperation = 'lighter';
    
    for (let i = 0; i < this.customStars.length; i++) {
      const star = this.customStars[i];
      star.twinklePhase += star.twinkleSpeed;
      
      const twinkle = (Math.sin(star.twinklePhase) + 1) * 0.5;
      let alpha = star.minAlpha + twinkle * (star.maxAlpha - star.minAlpha);
      
      if (Math.random() < sparkleChance) {
        alpha = Math.min(alpha + sparkleBoost, 1);
      }
      
      const paletteIndex = gradientCache.length > 0
        ? gradientCache[star.gradientIndex % gradientCache.length]
        : null;
      const drawSize = star.radius * starIntensity;
      this.customCtx.globalAlpha = Math.min(alpha * starIntensity, 1);
      
      if (paletteIndex) {
        this.customCtx.drawImage(
          paletteIndex,
          star.x - drawSize / 2,
          star.y - drawSize / 2,
          drawSize,
          drawSize
        );
      } else {
        this.customCtx.fillStyle = '#ffffff';
        this.customCtx.beginPath();
        this.customCtx.arc(star.x, star.y, drawSize / 2, 0, Math.PI * 2);
        this.customCtx.fill();
      }
    }
    
    this.customAnimationFrameId = requestAnimationFrame(() => this.animateTwinklingStars());
  }
  
  /**
   * 開始動畫
   */
  start() {
    // 如果是自定義 Canvas 動畫，重新啟動動畫循環
    if (this.customCanvas && this.customAnimationType && !this.isAnimating) {
      this.isAnimating = true;
      if (this.customAnimationType === 'rotating-stars') {
        this.animateRotatingStars();
      } else if (this.customAnimationType === 'twinkling-stars') {
        this.animateTwinklingStars();
      }
    } else {
      // particles.js 會在 setAnimation 時自動開始
      this.isAnimating = true;
    }
  }
  
  /**
   * 停止動畫
   */
  stop() {
    if (!this.customAnimationType) {
      this.isAnimating = false;
      this.clear();
      return;
    }
    
    this.isAnimating = false;
    
    // 停止自定義 Canvas 動畫（但保留畫布，方便恢復）
    if (this.customAnimationFrameId) {
      cancelAnimationFrame(this.customAnimationFrameId);
      this.customAnimationFrameId = null;
    }
  }
  
  /**
   * 響應視窗大小變化
   */
  resize() {
    // 自定義 Canvas 動畫的 resize 已在專屬邏輯中處理
    if (this.customAnimationType) {
      return;
    }
    
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
      if (!this.isAnimating) {
        this.wasAnimatingBeforeHide = false;
        return;
      }
      
      this.wasAnimatingBeforeHide = true;
      
      if (this.customAnimationType) {
        this.stop();
      } else {
        this.pauseParticlesAnimation();
      }
      return;
    }
    
    if (!this.wasAnimatingBeforeHide) {
      return;
    }
    
    this.wasAnimatingBeforeHide = false;
    
    if (this.customAnimationType) {
      this.start();
      return;
    }
    
    if (this.lastPreset) {
      this.setAnimation(this.lastPreset, this.lastConfig || {});
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
   * 複製配置物件（避免引用影響）
   */
  cloneConfig(config) {
    if (!config || typeof config !== 'object') {
      return {};
    }
    
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(config);
      } catch (error) {
        // 瀏覽器不支援或資料含不可序列化內容時退回其他方法
      }
    }
    
    try {
      return JSON.parse(JSON.stringify(config));
    } catch (error) {
      return { ...config };
    }
  }
  
  /**
   * 清除當前粒子動畫
   */
  clear(resetPreset = true) {
    this.isAnimating = false;
    
    // 停止自定義 Canvas 動畫
    if (this.customAnimationFrameId) {
      cancelAnimationFrame(this.customAnimationFrameId);
      this.customAnimationFrameId = null;
    }
    
    // 清除自定義 Canvas
    if (this.customCanvas && this.customCanvas.parentNode) {
      this.customCanvas.parentNode.removeChild(this.customCanvas);
      this.customCanvas = null;
      this.customCtx = null;
      this.customStars = [];
      this.customGradientCache = null;
      this.starfieldConfig = null;
      this.starfieldVisualConfig = null;
      if (resetPreset) {
        this.customAnimationType = null;
      }
    }
    
    // 移除 resize 監聽器
    if (this.customResizeHandler) {
      window.removeEventListener('resize', this.customResizeHandler);
      this.customResizeHandler = null;
    }
    
    // 清除 particles.js 實例
    if (window.pJSDom && Array.isArray(window.pJSDom)) {
      const pJSIndex = window.pJSDom.findIndex(pJS => {
        if (!pJS || !pJS.pJS || !pJS.pJS.canvas || !pJS.pJS.canvas.el) {
          return false;
        }
        const canvasElement = pJS.pJS.canvas.el;
        const containerElement = canvasElement.parentNode;
        return containerElement && containerElement.id === this.canvasId;
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

      if (!Array.isArray(window.pJSDom)) {
        window.pJSDom = [];
      }
    }
    
    // 移除 canvas 元素（particles.js 使用的）
    const canvasElement = document.getElementById(this.canvasId);
    if (canvasElement && canvasElement.parentNode) {
      canvasElement.parentNode.removeChild(canvasElement);
    }
    
    if (resetPreset) {
      this.currentPreset = null;
      this.lastPreset = null;
      this.lastConfig = null;
    }
  }
}
