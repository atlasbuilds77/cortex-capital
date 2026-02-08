/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Agent colors
        atlas: '#4F46E5',   // Indigo - Leader
        sage: '#059669',    // Green - Risk
        scout: '#F59E0B',   // Amber - Execution
        growth: '#8B5CF6',  // Purple - Analytics
        intel: '#EF4444',   // Red - Research
        observer: '#6B7280', // Gray - QA
        // UI colors
        win: '#10B981',
        loss: '#EF4444',
        pending: '#F59E0B',
        bg: {
          dark: '#0F172A',
          card: '#1E293B',
          hover: '#334155',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
    },
  },
  plugins: [],
}
