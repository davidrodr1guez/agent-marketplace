/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // UltravioletaDAO theme
        dark: {
          900: '#0a0a0f',
          800: '#0f0a14',
          700: '#1a1025',
          600: '#251535',
        },
        ultra: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        violet: {
          primary: '#8B5CF6',
          secondary: '#A855F7',
          accent: '#D946EF',
          glow: '#C4B5FD',
        },
        neon: {
          violet: '#8B5CF6',
          purple: '#A855F7',
          pink: '#D946EF',
          blue: '#818CF8',
          green: '#10b981',
          yellow: '#fbbf24',
        },
        agent: {
          searcher: '#818CF8',
          analyst: '#A855F7',
          writer: '#D946EF',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #8B5CF6, 0 0 10px #8B5CF6' },
          '100%': { boxShadow: '0 0 10px #A855F7, 0 0 20px #A855F7, 0 0 30px #D946EF' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        }
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'ultra-gradient': 'linear-gradient(135deg, #8B5CF6, #A855F7, #D946EF)',
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
    },
  },
  plugins: [],
}
