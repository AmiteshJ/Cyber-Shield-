/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#050510',
          dark: '#0c1120',
          panel: '#151e32',
          neonCyan: '#00f3ff',
          neonRed: '#ff003c',
          neonGreen: '#39ff14',
          neonPurple: '#b000ff'
        }
      },
      fontFamily: {
        mono: ['"Fira Code"', 'monospace'],
        display: ['"Orbitron"', 'sans-serif'],
        body: ['"Rajdhani"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 243, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 243, 255, 0.6), inset 0 0 10px rgba(0, 243, 255, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
