/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#080C14',
          900: '#0E1520',
          800: '#141D2E',
        },
        electric: '#4F9EFF',
        walrus:   '#1DB897',
        ai:       '#8B5CF6',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      animation: {
        'breathe':   'breathe 3s ease-in-out infinite',
        'float':     'float 10s ease-in-out infinite',
        'blink':     'blink 500ms step-end infinite',
        'dot-pulse': 'dotPulse 600ms ease-in-out infinite',
        'bounce-in': 'bounce-in 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(29, 184, 151, 0)' },
          '50%':       { boxShadow: '0 0 24px rgba(29, 184, 151, 0.25)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-20px)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        dotPulse: {
          '0%, 100%': { transform: 'scale(1)',   opacity: '0.4' },
          '50%':       { transform: 'scale(1.4)', opacity: '1' },
        },
        'bounce-in': {
          '0%':   { transform: 'scale(0.7)', opacity: '0' },
          '60%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
