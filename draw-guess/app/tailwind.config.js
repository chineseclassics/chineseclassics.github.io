/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 極簡設計配色方案
      colors: {
        // 低調配色：灰色系、米色、淺色調
        'bg-primary': '#FAFAFA',      // 背景：白色或極淺灰色
        'bg-secondary': '#F5F5F5',    // 次要背景
        'text-primary': '#333333',    // 文字：深灰色
        'text-secondary': '#555555',   // 次要文字
        'border-light': '#E0E0E0',     // 邊框：淺灰色
        'border-medium': '#CCCCCC',    // 中等邊框
        'accent': '#666666',           // 強調：深灰色
        'accent-light': '#888888',     // 淺強調
      },
      // 極簡設計：細線條邊框
      borderWidth: {
        'thin': '1px',
      },
      // 圓角設計
      borderRadius: {
        'minimal': '4px',
      },
    },
  },
  plugins: [],
}
