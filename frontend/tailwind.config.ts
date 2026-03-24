import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090914',
        surface: '#0f0f23',
        'surface-elevated': '#161630',
        primary: '#8b5cf6',
        secondary: '#6366f1',
        accent: '#22d3ee',
        success: '#34d399',
        warning: '#ffaa00',
        danger: '#ff4444',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
      },
    },
  },
  plugins: [],
}

export default config
