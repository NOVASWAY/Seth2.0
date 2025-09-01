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
    orange: '#f97316', // orange-500
    purple: '#8b5cf6', // violet-500
    accent: '#ec4899', // pink-500
  },
  background: {
    primary: '#ffffff', // white
    secondary: '#f8fafc', // slate-50
    tertiary: '#f1f5f9', // slate-100
  },
  text: {
    primary: '#0f172a', // slate-900
    secondary: '#334155', // slate-700
    muted: '#64748b', // slate-500
  },
  border: {
    primary: '#e2e8f0', // slate-200
    secondary: '#cbd5e1', // slate-300
    accent: '#f97316', // orange-500
  },
  status: {
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    info: '#3b82f6', // blue-500
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
    bg: 'bg-white',
    bgSecondary: 'bg-slate-50',
    bgTertiary: 'bg-slate-100',
    text: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-500',
    border: 'border-slate-200',
    borderSecondary: 'border-slate-300',
  },
  dark: {
    bg: 'bg-slate-900',
    bgSecondary: 'bg-slate-800',
    bgTertiary: 'bg-slate-700',
    text: 'text-slate-50',
    textSecondary: 'text-slate-200',
    textMuted: 'text-slate-300',
    border: 'border-slate-600',
    borderSecondary: 'border-slate-500',
  }
}
