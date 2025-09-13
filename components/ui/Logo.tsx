'use client'
import React, { useEffect, useState } from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'text'
  className?: string
  showText?: boolean
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8', 
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
}

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl', 
  xl: 'text-2xl'
}

export default function Logo({ 
  size = 'md', 
  variant = 'full', 
  className = '',
  showText = true 
}: LogoProps) {
  const [mounted, setMounted] = useState(false)
  const iconSize = sizeClasses[size]
  const textSize = textSizeClasses[size]

  useEffect(() => {
    setMounted(true)
  }, [])

  // Always render the same structure to prevent hydration mismatches
  if (!mounted) {
    return (
      <div className="flex items-center space-x-3">
        <div className={`${iconSize} relative ${className}`}>
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-orange-500 rounded-full animate-pulse" />
        </div>
        {showText && variant === 'full' && (
          <div className="flex flex-col">
            <span className={`font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent ${textSize}`}>
              Seth
            </span>
            <span className={`font-medium text-slate-600 dark:text-slate-400 text-xs -mt-1`}>
              Medical
            </span>
          </div>
        )}
      </div>
    )
  }

  const LogoIcon = () => (
    <div className={`${iconSize} relative ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Circle with Purple-Orange Gradient */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#heartbeatGradient1)"
          opacity="0.1"
        />
        
        {/* Inner Circle */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="url(#heartbeatGradient2)"
        />
        
        {/* Heartbeat Line - Main Path */}
        <path
          d="M15 50 L25 50 L30 35 L35 65 L40 25 L45 75 L50 30 L55 70 L60 40 L65 60 L70 50 L85 50"
          stroke="white"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Heartbeat Pulse Dots */}
        <circle cx="30" cy="35" r="3" fill="url(#heartbeatGradient3)" />
        <circle cx="40" cy="25" r="2.5" fill="url(#heartbeatGradient3)" />
        <circle cx="50" cy="30" r="2" fill="url(#heartbeatGradient3)" />
        <circle cx="60" cy="40" r="2.5" fill="url(#heartbeatGradient3)" />
        
        {/* Heart Symbol */}
        <path
          d="M50 20 C45 15, 35 15, 35 25 C35 15, 25 15, 25 25 C25 35, 50 50, 50 50 C50 50, 75 35, 75 25 C75 15, 65 15, 65 25 C65 15, 55 15, 50 20 Z"
          fill="url(#heartbeatGradient3)"
          opacity="0.8"
        />
        
        {/* Medical Cross in Corner */}
        <rect
          x="70"
          y="70"
          width="6"
          height="20"
          fill="white"
          rx="1"
          opacity="0.9"
        />
        <rect
          x="65"
          y="80"
          width="16"
          height="6"
          fill="white"
          rx="1"
          opacity="0.9"
        />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="heartbeatGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="heartbeatGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="30%" stopColor="#A855F7" />
            <stop offset="70%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="heartbeatGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )

  const LogoText = () => (
    <div className="flex flex-col">
      <span className={`font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent ${textSize}`}>
        Seth
      </span>
      <span className={`font-medium text-slate-600 dark:text-slate-400 text-xs -mt-1`}>
        Medical
      </span>
    </div>
  )

  if (variant === 'icon') {
    return <LogoIcon />
  }

  if (variant === 'text') {
    return <LogoText />
  }

  return (
    <div className="flex items-center space-x-3">
      <LogoIcon />
      {showText && <LogoText />}
    </div>
  )
}

// Alternative modern logo variant
export function ModernLogo({ 
  size = 'md', 
  variant = 'full', 
  className = '',
  showText = true 
}: LogoProps) {
  const [mounted, setMounted] = useState(false)
  const iconSize = sizeClasses[size]
  const textSize = textSizeClasses[size]

  useEffect(() => {
    setMounted(true)
  }, [])

  // Always render the same structure to prevent hydration mismatches
  if (!mounted) {
    return (
      <div className="flex items-center space-x-3">
        <div className={`${iconSize} relative ${className}`}>
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-orange-500 rounded-full animate-pulse" />
        </div>
        {showText && variant === 'full' && (
          <div className="flex flex-col">
            <span className={`font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent ${textSize}`}>
              Seth
            </span>
            <span className={`font-medium text-slate-600 dark:text-slate-400 text-xs -mt-1`}>
              Medical
            </span>
          </div>
        )}
      </div>
    )
  }

  const ModernIcon = () => (
    <div className={`${iconSize} relative ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Ring */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#modernHeartbeatGradient1)"
          opacity="0.1"
        />
        
        {/* Inner Circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="url(#modernHeartbeatGradient2)"
        />
        
        {/* Heartbeat Wave */}
        <path
          d="M20 50 L30 50 L35 35 L40 65 L45 25 L50 75 L55 30 L60 70 L65 45 L70 55 L75 50 L80 50"
          stroke="white"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        
        {/* Heart Symbol */}
        <path
          d="M50 25 C47 22, 42 22, 42 28 C42 22, 37 22, 37 28 C37 35, 50 45, 50 45 C50 45, 63 35, 63 28 C63 22, 58 22, 58 28 C58 22, 53 22, 50 25 Z"
          fill="url(#modernHeartbeatGradient3)"
          opacity="0.8"
        />
        
        {/* Pulse Dots */}
        <circle cx="35" cy="35" r="2" fill="url(#modernHeartbeatGradient3)" />
        <circle cx="45" cy="25" r="1.5" fill="url(#modernHeartbeatGradient3)" />
        <circle cx="55" cy="30" r="1" fill="url(#modernHeartbeatGradient3)" />
        <circle cx="65" cy="45" r="1.5" fill="url(#modernHeartbeatGradient3)" />
        
        {/* Medical Cross */}
        <rect
          x="45"
          y="60"
          width="10"
          height="25"
          fill="white"
          rx="2"
          opacity="0.9"
        />
        <rect
          x="40"
          y="70"
          width="20"
          height="5"
          fill="white"
          rx="2"
          opacity="0.9"
        />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="modernHeartbeatGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="modernHeartbeatGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="30%" stopColor="#A855F7" />
            <stop offset="70%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="modernHeartbeatGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )

  const ModernText = () => (
    <div className="flex flex-col">
      <span className={`font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent ${textSize}`}>
        Seth
      </span>
      <span className={`font-medium text-slate-600 dark:text-slate-400 text-xs -mt-1`}>
        Medical
      </span>
    </div>
  )

  if (variant === 'icon') {
    return <ModernIcon />
  }

  if (variant === 'text') {
    return <ModernText />
  }

  return (
    <div className="flex items-center space-x-3">
      <ModernIcon />
      {showText && <ModernText />}
    </div>
  )
}
