'use client'

import { useTheme } from '../../lib/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <div className="relative w-6 h-6">
        <Sun 
          className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${
            theme === 'light' 
              ? 'text-orange-500 rotate-0 opacity-100' 
              : 'text-slate-400 -rotate-90 opacity-0'
          }`}
        />
        <Moon 
          className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${
            theme === 'dark' 
              ? 'text-purple-400 rotate-0 opacity-100' 
              : 'text-slate-400 rotate-90 opacity-0'
          }`}
        />
      </div>
      
      {/* Theme indicator ring */}
      <div className={`absolute inset-0 rounded-lg transition-all duration-300 ${
        theme === 'light' 
          ? 'ring-2 ring-orange-200 bg-orange-50' 
          : 'ring-2 ring-purple-200 bg-purple-900/20'
      }`} />
    </button>
  )
}
