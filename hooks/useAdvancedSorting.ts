'use client'

import { useState, useCallback, useMemo } from 'react'

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface FilterConfig {
  [key: string]: any
}

export interface SortingOptions {
  defaultSort?: SortConfig
  defaultFilters?: FilterConfig
  persistState?: boolean
}

export function useAdvancedSorting<T>(
  data: T[],
  options: SortingOptions = {}
) {
  const {
    defaultSort = { key: 'createdAt', direction: 'desc' },
    defaultFilters = {},
    persistState = false
  } = options

  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort)
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters)

  // Sort data based on current configuration
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return []

    const sorted = [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key)
      const bValue = getNestedValue(b, sortConfig.key)

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      let comparison = 0

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, undefined, { numeric: true })
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true })
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [data, sortConfig])

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    if (!sortedData || sortedData.length === 0) return []

    return sortedData.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || value === '' || value === null || value === undefined) return true

        const itemValue = getNestedValue(item, key)
        
        if (typeof value === 'string') {
          return String(itemValue).toLowerCase().includes(value.toLowerCase())
        }
        
        if (Array.isArray(value)) {
          return value.includes(itemValue)
        }
        
        return itemValue === value
      })
    })
  }, [sortedData, filters])

  // Sort handlers
  const handleSort = useCallback((key: string, direction?: 'asc' | 'desc') => {
    setSortConfig(prev => ({
      key,
      direction: direction || (prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc')
    }))
  }, [])

  const handleSortChange = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction })
  }, [])

  // Filter handlers
  const handleFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleFiltersChange = useCallback((newFilters: FilterConfig) => {
    setFilters(newFilters)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({})
  }, [])

  const handleClearAll = useCallback(() => {
    setSortConfig(defaultSort)
    setFilters(defaultFilters)
  }, [defaultSort, defaultFilters])

  // Get current sort info
  const getSortInfo = useCallback(() => ({
    sortBy: sortConfig.key,
    sortDirection: sortConfig.direction,
    isSorted: sortConfig.key !== defaultSort.key || sortConfig.direction !== defaultSort.direction
  }), [sortConfig, defaultSort])

  // Get filter info
  const getFilterInfo = useCallback(() => ({
    activeFilters: Object.entries(filters).filter(([_, value]) => 
      value !== '' && value !== null && value !== undefined
    ).length,
    hasFilters: Object.keys(filters).length > 0
  }), [filters])

  return {
    // Data
    data: filteredData,
    originalData: data,
    sortedData,
    
    // Sort state
    sortConfig,
    handleSort,
    handleSortChange,
    
    // Filter state
    filters,
    handleFilter,
    handleFiltersChange,
    handleClearFilters,
    
    // Combined actions
    handleClearAll,
    
    // Info
    getSortInfo,
    getFilterInfo
  }
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key]
  }, obj)
}

// Predefined sort options for common use cases
export const COMMON_SORT_OPTIONS = {
  patients: [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'opNumber', label: 'OP Number' },
    { value: 'createdAt', label: 'Registration Date' },
    { value: 'age', label: 'Age' },
    { value: 'insuranceType', label: 'Insurance Type' }
  ],
  visits: [
    { value: 'visitDate', label: 'Visit Date' },
    { value: 'createdAt', label: 'Registration Time' },
    { value: 'triageCategory', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'patient.firstName', label: 'Patient Name' }
  ],
  claims: [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'claimNumber', label: 'Claim Number' },
    { value: 'amount', label: 'Amount' },
    { value: 'status', label: 'Status' },
    { value: 'submissionDeadline', label: 'Submission Deadline' },
    { value: 'patient.firstName', label: 'Patient Name' }
  ],
  invoices: [
    { value: 'invoiceDate', label: 'Invoice Date' },
    { value: 'invoiceNumber', label: 'Invoice Number' },
    { value: 'totalAmount', label: 'Amount' },
    { value: 'status', label: 'Status' },
    { value: 'createdAt', label: 'Created Date' }
  ]
}

// Predefined filter options
export const COMMON_FILTER_OPTIONS = {
  patients: [
    { value: 'insuranceType', label: 'Insurance Type', type: 'select' as const, options: [
      { value: 'SHA', label: 'SHA' },
      { value: 'PRIVATE', label: 'Private' },
      { value: 'CASH', label: 'Cash' }
    ]},
    { value: 'gender', label: 'Gender', type: 'select' as const, options: [
      { value: 'MALE', label: 'Male' },
      { value: 'FEMALE', label: 'Female' },
      { value: 'OTHER', label: 'Other' }
    ]},
    { value: 'area', label: 'Area', type: 'text' as const }
  ],
  visits: [
    { value: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'REGISTERED', label: 'Registered' },
      { value: 'TRIAGED', label: 'Triaged' },
      { value: 'WAITING_CONSULTATION', label: 'Waiting Consultation' },
      { value: 'IN_CONSULTATION', label: 'In Consultation' },
      { value: 'COMPLETED', label: 'Completed' }
    ]},
    { value: 'triageCategory', label: 'Priority', type: 'select' as const, options: [
      { value: 'EMERGENCY', label: 'Emergency' },
      { value: 'URGENT', label: 'Urgent' },
      { value: 'NORMAL', label: 'Normal' }
    ]},
    { value: 'visitDate', label: 'Visit Date', type: 'date' as const }
  ],
  claims: [
    { value: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'READY_TO_SUBMIT', label: 'Ready to Submit' },
      { value: 'SUBMITTED', label: 'Submitted' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' }
    ]},
    { value: 'claimType', label: 'Claim Type', type: 'select' as const, options: [
      { value: 'OUTPATIENT', label: 'Outpatient' },
      { value: 'INPATIENT', label: 'Inpatient' },
      { value: 'EMERGENCY', label: 'Emergency' }
    ]},
    { value: 'createdAt', label: 'Created Date', type: 'date' as const }
  ]
}
