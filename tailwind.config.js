/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0d0f12',
        card: '#161920',
        border: '#222733',
        accent: {
          emerald: '#10b981',
          indigo: '#6366f1',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-indigo': '0 0 15px rgba(99, 102, 241, 0.15)',
        'glow-emerald': '0 0 15px rgba(16, 185, 129, 0.15)',
      }
    },
  },
  plugins: [],
}
