'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface UseDataCacheOptions {
  ttl?: number // Time to live in milliseconds
  staleWhileRevalidate?: boolean
  onError?: (error: Error) => void
}

export function useDataCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: UseDataCacheOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    staleWhileRevalidate = true,
    onError
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map())

  const isExpired = useCallback((entry: CacheEntry<T>) => {
    return Date.now() - entry.timestamp > entry.ttl
  }, [])

  const getCachedData = useCallback((cacheKey: string): T | null => {
    const entry = cacheRef.current.get(cacheKey)
    if (!entry) return null
    
    if (isExpired(entry)) {
      cacheRef.current.delete(cacheKey)
      return null
    }
    
    return entry.data
  }, [isExpired])

  const setCachedData = useCallback((cacheKey: string, data: T, ttlOverride?: number) => {
    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttlOverride || ttl
    })
  }, [ttl])

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cacheKey = `cache_${key}`
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        setData(cachedData)
        setLoading(false)
        setError(null)
        
        // If stale-while-revalidate is enabled, fetch in background
        if (staleWhileRevalidate) {
          fetchData(true).catch(() => {
            // Ignore background fetch errors
          })
        }
        return
      }
    }

    try {
      setLoading(true)
      setError(null)
      
      const result = await fetchFn()
      
      setData(result)
      setCachedData(cacheKey, result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [key, fetchFn, getCachedData, setCachedData, staleWhileRevalidate, onError])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(() => {
    fetchData(true)
  }, [fetchData])

  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  return {
    data,
    loading,
    error,
    refresh,
    clearCache
  }
}

// Specialized hook for API data with automatic retries
export function useApiCache<T>(
  endpoint: string,
  options: UseDataCacheOptions & {
    headers?: Record<string, string>
    retries?: number
    retryDelay?: number
  } = {}
) {
  const {
    headers = {},
    retries = 3,
    retryDelay = 1000,
    ...cacheOptions
  } = options

  const fetchWithRetry = useCallback(async (): Promise<T> => {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < retries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded')
  }, [endpoint, headers, retries, retryDelay])

  return useDataCache(endpoint, fetchWithRetry, cacheOptions)
}
