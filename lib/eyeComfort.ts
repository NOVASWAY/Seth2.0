/**
 * Eye Comfort Configuration
 * 
 * This file contains configurations specifically designed to reduce eye strain
 * and improve readability in the light mode of the Seth Clinic CMS.
 */

export const eyeComfortConfig = {
  // Color contrast ratios (WCAG AA compliant)
  contrast: {
    normal: 4.5, // Minimum for normal text
    large: 3.0,  // Minimum for large text (18pt+ or 14pt+ bold)
    enhanced: 7.0 // Enhanced contrast for better accessibility
  },
  
  // Font settings for better readability
  typography: {
    baseSize: '16px', // Optimal base font size
    lineHeight: 1.6,  // Comfortable line spacing
    letterSpacing: '0.01em', // Slight letter spacing for clarity
    fontFamily: 'Inter, system-ui, sans-serif' // Clean, readable font
  },
  
  // Spacing for better visual hierarchy
  spacing: {
    comfortable: '1.5rem', // 24px - comfortable reading distance
    relaxed: '2rem',       // 32px - relaxed spacing
    tight: '0.75rem'       // 12px - tight but readable
  },
  
  // Color temperature for reduced blue light
  colorTemperature: {
    warm: '#fef7ed', // Very warm background
    neutral: '#fefefe', // Neutral white
    cool: '#f8fafc'  // Slightly cool
  },
  
  // Focus and interaction states
  focus: {
    ringWidth: '2px',
    ringOffset: '2px',
    ringColor: '#ea580c', // Orange focus ring
    transitionDuration: '200ms'
  },
  
  // Shadows for depth without harshness
  shadows: {
    subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    soft: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
    medium: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  },
  
  // Animation settings for reduced motion
  motion: {
    duration: '200ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // Smooth easing
    reducedMotion: '0.01ms' // For users who prefer reduced motion
  }
}

/**
 * CSS classes for eye-friendly components
 */
export const eyeComfortClasses = {
  // Text styles
  text: {
    comfortable: 'text-slate-800 leading-relaxed tracking-wide',
    large: 'text-lg text-slate-800 leading-relaxed',
    small: 'text-sm text-slate-600 leading-normal',
    muted: 'text-slate-500 leading-normal'
  },
  
  // Background styles
  background: {
    primary: 'bg-slate-50',
    secondary: 'bg-white/90 backdrop-blur-sm',
    card: 'bg-white/95 backdrop-blur-sm border border-slate-200/60',
    input: 'bg-white/80 border-slate-200 focus:border-orange-400'
  },
  
  // Interactive elements
  interactive: {
    button: 'transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
    link: 'text-orange-600 hover:text-orange-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 rounded-sm',
    input: 'bg-white/80 border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-200',
    card: 'bg-white/90 backdrop-blur-sm border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-200'
  },
  
  // Focus states
  focus: {
    visible: 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500',
    ring: 'focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
    soft: 'focus:ring-2 focus:ring-orange-100 focus:border-orange-400'
  }
}

/**
 * Utility functions for eye comfort
 */
export const eyeComfortUtils = {
  /**
   * Get appropriate text color based on background
   */
  getTextColor: (background: 'light' | 'dark' | 'auto' = 'auto') => {
    switch (background) {
      case 'light':
        return 'text-slate-800'
      case 'dark':
        return 'text-slate-100'
      default:
        return 'text-slate-800 dark:text-slate-100'
    }
  },
  
  /**
   * Get appropriate background color
   */
  getBackgroundColor: (level: 'primary' | 'secondary' | 'tertiary' = 'primary') => {
    switch (level) {
      case 'primary':
        return 'bg-slate-50'
      case 'secondary':
        return 'bg-white/90'
      case 'tertiary':
        return 'bg-slate-100/80'
      default:
        return 'bg-slate-50'
    }
  },
  
  /**
   * Get comfortable spacing
   */
  getSpacing: (size: 'comfortable' | 'relaxed' | 'tight' = 'comfortable') => {
    switch (size) {
      case 'comfortable':
        return 'space-y-6'
      case 'relaxed':
        return 'space-y-8'
      case 'tight':
        return 'space-y-3'
      default:
        return 'space-y-6'
    }
  }
}

/**
 * Media queries for responsive eye comfort
 */
export const eyeComfortMedia = {
  // Reduced motion preference
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  
  // High contrast preference
  highContrast: '@media (prefers-contrast: high)',
  
  // Color scheme preference
  lightMode: '@media (prefers-color-scheme: light)',
  darkMode: '@media (prefers-color-scheme: dark)'
}

export default eyeComfortConfig
