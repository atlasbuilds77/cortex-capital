/**
 * Cortex Capital Design System
 * Based on: RecehTok Dark, Fintech UI Kit, Dark Admin Dashboard
 */

export const colors = {
  // Background layers
  bg: {
    base: '#0a0a0f',      // Deepest dark
    elevated: '#12121a',   // Cards, modals
    surface: '#1a1a2e',    // Hover states
  },

  // Primary gradients (purple/blue)
  primary: {
    from: '#6366f1',       // Indigo
    via: '#8b5cf6',        // Purple
    to: '#a855f7',         // Bright purple
  },

  // Accent (cyan/teal)
  accent: {
    from: '#06b6d4',       // Cyan
    to: '#14b8a6',         // Teal
    glow: '#0ea5e9',       // Sky blue glow
  },

  // Status colors
  success: '#10b981',      // Green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  info: '#3b82f6',         // Blue

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#a0a0b0',
    muted: '#707085',
  },

  // Chart colors
  chart: {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280',
    gridLines: 'rgba(255, 255, 255, 0.05)',
  },
} as const

export const gradients = {
  // Primary card gradient
  card: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
  
  // Border glow
  borderGlow: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
  
  // Accent gradient
  accent: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
  
  // Success/positive
  positive: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  
  // Danger/negative
  negative: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
} as const

export const shadows = {
  // Glow effects
  glow: {
    primary: '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1)',
    accent: '0 0 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1)',
    success: '0 0 20px rgba(16, 185, 129, 0.3)',
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
