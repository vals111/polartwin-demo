/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        polar: {
          navy: '#0d2340',
          dark: '#071322',
          darker: '#030a12',
          card: 'rgba(13, 35, 64, 0.75)',
          border: '#1e3a5f',
          accent: '#00e5ff',
          red: '#c0392b',
          orange: '#e07b1f',
          green: '#1e7a4a',
          ice: '#e2f1ff'
        }
      },
      fontFamily: {
        ui: ['Inter', 'system-ui', 'sans-serif'],
        data: ['JetBrains Mono', 'Roboto Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
