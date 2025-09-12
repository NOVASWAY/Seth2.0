'use client'

import { Suspense, lazy, ComponentType } from 'react'
import { PageLoadingSpinner, LoadingSpinner } from './LoadingSpinner'
import { DashboardSkeleton, CardSkeleton } from './Skeleton'

interface LazyWrapperProps {
  fallback?: 'spinner' | 'skeleton' | 'card' | 'page'
  children: React.ReactNode
}

const fallbackComponents = {
  spinner: <LoadingSpinner size="lg" text="Loading..." />,
  skeleton: <DashboardSkeleton />,
  card: <CardSkeleton />,
  page: <PageLoadingSpinner />
}

export function LazyWrapper({ fallback = 'skeleton', children }: LazyWrapperProps) {
  return (
    <Suspense fallback={fallbackComponents[fallback]}>
      {children}
    </Suspense>
  )
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback: 'spinner' | 'skeleton' | 'card' | 'page' = 'skeleton'
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <LazyWrapper fallback={fallback}>
        <Component {...props} />
      </LazyWrapper>
    )
  }
}

// Utility function to create lazy components
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: 'spinner' | 'skeleton' | 'card' | 'page' = 'skeleton'
) {
  const LazyComponent = lazy(importFunc)
  
  return function LazyWrappedComponent(props: React.ComponentProps<T>) {
    return (
      <LazyWrapper fallback={fallback}>
        <LazyComponent {...props} />
      </LazyWrapper>
    )
  }
}
