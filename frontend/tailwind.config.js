/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        navy: {
          50:  '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0a1929',
        },
        sand: {
          50:  '#faf7f2',
          100: '#f5f0e8',
          200: '#ede4d4',
          300: '#ddd5c0',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.35s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-up-delayed': 'slideUp 0.4s ease-out 0.1s both',
        'pulse-soft': 'pulseSoft 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
      },
    },
  },
  plugins: [],
}

