export type Theme = 'light' | 'dark'

export interface ThemeColors {
  primary: {
    orange: string
    purple: string
    accent: string
  }
  background: {
    primary: string
    secondary: string
    tertiary: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
  }
  border: {
    primary: string
    secondary: string
    accent: string
  }
  status: {
    success: string
    warning: string
    error: string
    info: string
  }
}

export const lightTheme: ThemeColors = {
  primary: {
    orange: '#ea580c', // orange-600 - softer, more readable
    purple: '#7c3aed', // violet-600 - better contrast
    accent: '#db2777', // pink-600 - more professional
  },
  background: {
    primary: '#fefefe', // off-white - less harsh than pure white
    secondary: '#f8fafc', // slate-50 - warm gray
    tertiary: '#f1f5f9', // slate-100 - subtle contrast
  },
  text: {
    primary: '#1e293b', // slate-800 - softer than slate-900
    secondary: '#475569', // slate-600 - better readability
    muted: '#64748b', // slate-500 - good contrast
  },
  border: {
    primary: '#e2e8f0', // slate-200 - subtle borders
    secondary: '#cbd5e1', // slate-300 - medium contrast
    accent: '#ea580c', // orange-600 - matches primary
  },
  status: {
    success: '#059669', // emerald-600 - better contrast
    warning: '#d97706', // amber-600 - less harsh
    error: '#dc2626', // red-600 - more readable
    info: '#2563eb', // blue-600 - professional blue
  }
}

export const darkTheme: ThemeColors = {
  primary: {
    orange: '#fb923c', // orange-400
    purple: '#a78bfa', // violet-400
    accent: '#f472b6', // pink-400
  },
  background: {
    primary: '#0f172a', // slate-900
    secondary: '#1e293b', // slate-800
    tertiary: '#334155', // slate-700
  },
  text: {
    primary: '#f8fafc', // slate-50
    secondary: '#e2e8f0', // slate-200
    muted: '#cbd5e1', // slate-300
  },
  border: {
    primary: '#475569', // slate-600
    secondary: '#64748b', // slate-500
    accent: '#fb923c', // orange-400
  },
  status: {
    success: '#34d399', // emerald-400
    warning: '#fbbf24', // amber-400
    error: '#f87171', // red-400
    info: '#60a5fa', // blue-400
  }
}

export const getThemeColors = (theme: Theme): ThemeColors => {
  return theme === 'dark' ? darkTheme : lightTheme
}

// Tailwind CSS classes for easy use
export const themeClasses = {
  light: {
    bg: 'bg-slate-50', // Softer background
    bgSecondary: 'bg-white/90', // Semi-transparent white
    bgTertiary: 'bg-slate-100/80', // Very subtle contrast
    text: 'text-slate-800', // Softer than slate-900
    textSecondary: 'text-slate-600', // Better readability
    textMuted: 'text-slate-500', // Good contrast
    border: 'border-slate-200/60', // Softer borders
    borderSecondary: 'border-slate-300/60', // Medium contrast
    card: 'bg-white/90 backdrop-blur-sm border border-slate-200/60 shadow-sm', // Eye-friendly cards
    input: 'bg-white/80 border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100', // Better form inputs
    button: 'transition-all duration-200 ease-in-out', // Smooth transitions
    link: 'text-orange-600 hover:text-orange-700 transition-colors duration-200', // Better links
  },
  dark: {
    bg: 'bg-slate-900',
    bgSecondary: 'bg-slate-800',
    bgTertiary: 'bg-slate-700',
    text: 'text-slate-100', // Softer than slate-50
    textSecondary: 'text-slate-300', // Better readability
    textMuted: 'text-slate-400', // Good contrast
    border: 'border-slate-600',
    borderSecondary: 'border-slate-500',
    card: 'bg-slate-800/90 backdrop-blur-sm border border-slate-600/60 shadow-lg', // Dark mode cards
    input: 'bg-slate-800/80 border-slate-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-900/20', // Dark form inputs
    button: 'transition-all duration-200 ease-in-out', // Smooth transitions
    link: 'text-orange-400 hover:text-orange-300 transition-colors duration-200', // Dark mode links
  }
}
