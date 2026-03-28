import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './agents/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0e0a',
        surface: '#0f140f',
        'surface-elevated': '#1a1f1a',
        primary: '#00C805',
        secondary: '#00a004',
        accent: '#00ff08',
        success: '#00C805',
        warning: '#ffaa00',
        danger: '#ff4444',
        'text-primary': '#ffffff',
        'text-secondary': '#b3b3b3',
        'text-muted': '#808080',
      },
    },
  },
  plugins: [],
}

export default config
