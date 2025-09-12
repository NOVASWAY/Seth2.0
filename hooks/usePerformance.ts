'use client'

import { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  isSlow: boolean
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    isSlow: false
  })
  
  const startTime = useRef<number>(0)
  const renderStartTime = useRef<number>(0)

  useEffect(() => {
    // Measure page load time
    startTime.current = performance.now()
    
    const measurePerformance = () => {
      const loadTime = performance.now() - startTime.current
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0
      
      setMetrics(prev => ({
        ...prev,
        loadTime,
        memoryUsage: Math.round(memoryUsage / 1024 / 1024), // Convert to MB
        isSlow: loadTime > 1000 // Consider slow if > 1 second
      }))
    }

    // Measure after initial render
    const timer = setTimeout(measurePerformance, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const startRender = () => {
    renderStartTime.current = performance.now()
  }

  const endRender = () => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current
      setMetrics(prev => ({
        ...prev,
        renderTime
      }))
    }
  }

  return {
    metrics,
    startRender,
    endRender
  }
}

// Hook for measuring component performance
export function useComponentPerformance(componentName: string) {
  const { startRender, endRender, metrics } = usePerformance()
  
  useEffect(() => {
    startRender()
    return () => endRender()
  }, [componentName])

  // Log performance in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && metrics.loadTime > 0) {
      console.log(`🚀 ${componentName} Performance:`, {
        loadTime: `${metrics.loadTime.toFixed(2)}ms`,
        renderTime: `${metrics.renderTime.toFixed(2)}ms`,
        memoryUsage: `${metrics.memoryUsage}MB`,
        isSlow: metrics.isSlow ? '⚠️ SLOW' : '✅ FAST'
      })
    }
  }, [componentName, metrics])

  return metrics
}
