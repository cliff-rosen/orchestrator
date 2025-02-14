/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        flowingDot: {
          '0%': {
            transform: 'translateY(0) scale(0.5)',
            opacity: 0.3
          },
          '25%': {
            transform: 'translateY(-16px) scale(1.2)',
            opacity: 1
          },
          '50%': {
            transform: 'translateY(0) scale(1)',
            opacity: 0.8
          },
          '75%': {
            transform: 'translateY(8px) scale(0.8)',
            opacity: 0.6
          },
          '100%': {
            transform: 'translateY(0) scale(0.5)',
            opacity: 0.3
          }
        },
        glowPulse: {
          '0%, 100%': {
            opacity: 0.4,
            transform: 'scaleX(0.8)'
          },
          '50%': {
            opacity: 0.8,
            transform: 'scaleX(1.2)'
          }
        }
      },
      animation: {
        'glow-pulse': 'glowPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    },
  },
  plugins: [],
}