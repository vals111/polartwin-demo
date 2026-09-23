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
          navy:   '#0d2340',
          dark:   '#071322',
          darker: '#030a12',
          card:   'rgba(13, 35, 64, 0.75)',
          border: '#1e3a5f',
          accent: '#00e5ff',
          red:    '#c0392b',
          orange: '#e07b1f',
          green:  '#1e7a4a',
          ice:    '#e2f1ff'
        },
        // CSS-variable driven tokens for theme-aware classes
        theme: {
          base:      'var(--bg-base)',
          surface:   'var(--bg-surface)',
          elevated:  'var(--bg-elevated)',
          border:    'var(--border)',
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          accent:    'var(--accent)',
        }
      },
      fontFamily: {
        ui:   ['Inter', 'system-ui', 'sans-serif'],
        data: ['JetBrains Mono', 'Roboto Mono', 'monospace']
      },
      boxShadow: {
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-lg': 'var(--shadow-lg)',
      }
    },
  },
  plugins: [],
}
