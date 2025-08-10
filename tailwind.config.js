/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './**/*.html',
    './**/*.js',
    '!./node_modules/**',
    '!./**/dist/**',
    '!./**/build/**',
    '!./**/*.min.js'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5D5CDE'
      }
    }
  },
  plugins: []
};


