/**
 * Cortex Capital Design System
 * Dark theme with Robinhood-style green accents
 */

export const colors = {
  // Background layers
  bg: {
    base: '#0a0e0a',       // Deep dark green-black
    elevated: '#0f140f',   // Cards, modals
    surface: '#1a1f1a',    // Hover states
  },

  // Primary (Robinhood green)
  primary: {
    from: '#00C805',       // Robinhood green
    via: '#00a004',        // Darker green
    to: '#00ff08',         // Bright green
  },

  // Accent (bright green)
  accent: {
    from: '#00ff08',       // Bright green
    to: '#00C805',         // Robinhood green
    glow: '#00ff08',       // Bright green glow
  },

  // Status colors
  success: '#00C805',      // Robinhood green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  info: '#00C805',         // Green

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#b3b3b3',
    muted: '#808080',
  },

  // Chart colors
  chart: {
    positive: '#00C805',
    negative: '#ef4444',
    neutral: '#6b7280',
    gridLines: 'rgba(255, 255, 255, 0.05)',
  },
} as const

export const gradients = {
  // Primary card gradient - SOLID COLOR ONLY
  card: '#1a1f1a',
  
  // Border glow - SOLID COLOR ONLY
  borderGlow: '#00C805',
  
  // Accent - SOLID COLOR ONLY
  accent: '#00ff08',
  
  // Success/positive - SOLID COLOR ONLY
  positive: '#00C805',
  
  // Danger/negative - SOLID COLOR ONLY
  negative: '#ef4444',
} as const

export const shadows = {
  // Glow effects
  glow: {
    primary: '0 0 20px rgba(0, 200, 5, 0.3), 0 0 40px rgba(0, 200, 5, 0.1)',
    accent: '0 0 20px rgba(0, 255, 8, 0.3), 0 0 40px rgba(0, 255, 8, 0.1)',
    success: '0 0 20px rgba(0, 200, 5, 0.3)',
    danger: '0 0 20px rgba(239, 68, 68, 0.3)',
  },
  
  // Glass morphism
  glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  
  // Elevation
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 16px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
} as const

export const blur = {
  glass: 'blur(8px)',
  subtle: 'blur(4px)',
} as const

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export const spacing = {
  card: {
    padding: '1.5rem',
    gap: '1rem',
  },
  section: {
    gap: '2rem',
  },
} as const

export const borderRadius = {
  card: '1rem',
  button: '0.5rem',
  badge: '9999px',
} as const
