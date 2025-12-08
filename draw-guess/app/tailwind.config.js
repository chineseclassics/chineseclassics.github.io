/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 手繪風格配色方案
      colors: {
        // 紙張質感背景色
        'paper-bg': '#F5F1E8',        // 主背景：米色紙張
        'paper-bg-light': '#FAF8F3',   // 淺色紙張
        'paper-bg-dark': '#E8E0D5',    // 深色紙張
        
        // 文字顏色（深棕色系，非純黑）
        'text-primary': '#3D2F1F',     // 深棕色
        'text-secondary': '#5C4A37',   // 中等棕色
        'text-tertiary': '#8B7355',    // 淺棕色
        
        // 邊框顏色（手繪風格）
        'border-hand': '#6B5B4F',      // 手繪邊框主色
        'border-hand-light': '#9B8B7F', // 淺手繪邊框
        
        // 強調色（柔和彩色）
        'accent-warm': '#D4A574',      // 溫暖米色
        'accent-soft-blue': '#A8C5D0',  // 柔和藍色
        'accent-soft-pink': '#E8B8B8', // 柔和粉色
        'accent-soft-green': '#B8D4B8', // 柔和綠色
        
        // 保留原有變數以兼容
        'bg-primary': '#F5F1E8',
        'bg-secondary': '#FAF8F3',
        'border-light': '#D4C5B8',
        'border-medium': '#9B8B7F',
        'accent': '#6B5B4F',
        'accent-light': '#8B7355',
      },
      // 手繪風格：不規則邊框寬度
      borderWidth: {
        'thin': '1px',
        'hand': '2px',
        'hand-thick': '3px',
      },
      // 手繪風格：不規則圓角
      borderRadius: {
        'minimal': '4px',
        'hand': '8px 12px 6px 10px',    // 不規則圓角
        'hand-lg': '12px 16px 8px 14px',
      },
      // 手繪風格陰影
      boxShadow: {
        'hand': '3px 3px 0px rgba(107, 91, 79, 0.2), 6px 6px 0px rgba(107, 91, 79, 0.1)',
        'hand-lg': '5px 5px 0px rgba(107, 91, 79, 0.2), 10px 10px 0px rgba(107, 91, 79, 0.1)',
        'hand-inset': 'inset 2px 2px 4px rgba(107, 91, 79, 0.1)',
      },
      // 手繪風格字體
      fontFamily: {
        'hand': ['Caveat', 'Kalam', 'cursive'],
        'hand-title': ['Permanent Marker', 'Caveat', 'cursive'],
      },
      // 手繪風格動畫
      keyframes: {
        'hand-shake': {
          '0%, 100%': { transform: 'rotate(0deg) translate(0, 0)' },
          '25%': { transform: 'rotate(-0.5deg) translate(-1px, 1px)' },
          '75%': { transform: 'rotate(0.5deg) translate(1px, -1px)' },
        },
        'hand-bounce': {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.05) translateY(-2px)' },
        },
        'hand-draw': {
          '0%': { 
            strokeDasharray: '1000',
            strokeDashoffset: '1000',
          },
          '100%': { 
            strokeDasharray: '1000',
            strokeDashoffset: '0',
          },
        },
      },
      animation: {
        'hand-shake': 'hand-shake 0.3s ease-in-out',
        'hand-bounce': 'hand-bounce 0.3s ease-in-out',
        'hand-draw': 'hand-draw 1s ease-in-out',
      },
    },
  },
  plugins: [],
}
