'use client'

import { useState } from 'react'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SortOption {
  value: string
  label: string
  direction?: 'asc' | 'desc'
}

export interface FilterOption {
  value: string
  label: string
  type: 'select' | 'date' | 'text' | 'number'
  options?: { value: string; label: string }[]
}

export interface SortingState {
  sortBy: string
  sortDirection: 'asc' | 'desc'
  filters: Record<string, any>
}

interface SortingControlsProps {
  sortOptions: SortOption[]
  filterOptions?: FilterOption[]
  onSortChange: (sortBy: string, direction: 'asc' | 'desc') => void
  onFilterChange: (filters: Record<string, any>) => void
  onClearFilters?: () => void
  className?: string
  showClearButton?: boolean
}

export function SortingControls({
  sortOptions,
  filterOptions = [],
  onSortChange,
  onFilterChange,
  onClearFilters,
  className,
  showClearButton = true
}: SortingControlsProps) {
  const [sortingState, setSortingState] = useState<SortingState>({
    sortBy: sortOptions[0]?.value || '',
    sortDirection: 'desc',
    filters: {}
  })

  const handleSortChange = (sortBy: string) => {
    const newDirection = sortingState.sortBy === sortBy && sortingState.sortDirection === 'desc' ? 'asc' : 'desc'
    setSortingState(prev => ({ ...prev, sortBy, sortDirection: newDirection }))
    onSortChange(sortBy, newDirection)
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...sortingState.filters }
    if (value === 'all') {
      delete newFilters[key]
    } else {
      newFilters[key] = value
    }
    setSortingState(prev => ({ ...prev, filters: newFilters }))
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    setSortingState(prev => ({ ...prev, filters: {} }))
    onClearFilters?.()
  }

  const getSortIcon = (optionValue: string) => {
    if (sortingState.sortBy !== optionValue) return <ArrowUpDown className="h-4 w-4" />
    return sortingState.sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const activeFiltersCount = Object.values(sortingState.filters).filter(value => 
    value !== '' && value !== 'all' && value !== null && value !== undefined
  ).length

  return (
    <div className={cn("flex flex-wrap gap-2 items-center", className)}>
      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sort by:</span>
        <Select value={sortingState.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {getSortIcon(option.value)}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter Controls */}
      {filterOptions.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          {filterOptions.map((filter) => (
            <div key={filter.value} className="flex items-center gap-1">
              {filter.type === 'select' && (
                <Select 
                  value={sortingState.filters[filter.value] || ''} 
                  onValueChange={(value) => handleFilterChange(filter.value, value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {filter.label}</SelectItem>
                    {filter.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {filter.type === 'text' && (
                <input
                  type="text"
                  placeholder={filter.label}
                  value={sortingState.filters[filter.value] || ''}
                  onChange={(e) => handleFilterChange(filter.value, e.target.value)}
                  className="px-2 py-1 text-sm border border-slate-200 rounded-md w-[120px] focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              )}
              
              {filter.type === 'date' && (
                <input
                  type="date"
                  value={sortingState.filters[filter.value] || ''}
                  onChange={(e) => handleFilterChange(filter.value, e.target.value)}
                  className="px-2 py-1 text-sm border border-slate-200 rounded-md w-[140px] focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Clear Filters Button */}
      {showClearButton && activeFiltersCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="text-slate-600 hover:text-slate-800"
        >
          <X className="h-4 w-4 mr-1" />
          Clear ({activeFiltersCount})
        </Button>
      )}
    </div>
  )
}

// Quick Sort Button Component
interface QuickSortButtonProps {
  sortBy: string
  currentSort: string
  currentDirection: 'asc' | 'desc'
  onSort: (sortBy: string, direction: 'asc' | 'desc') => void
  children: React.ReactNode
  className?: string
}

export function QuickSortButton({
  sortBy,
  currentSort,
  currentDirection,
  onSort,
  children,
  className
}: QuickSortButtonProps) {
  const handleClick = () => {
    const newDirection = currentSort === sortBy && currentDirection === 'desc' ? 'asc' : 'desc'
    onSort(sortBy, newDirection)
  }

  const getIcon = () => {
    if (currentSort !== sortBy) return <ArrowUpDown className="h-4 w-4" />
    return currentDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-700",
        currentSort === sortBy && "bg-slate-100 dark:bg-slate-700",
        className
      )}
    >
      {children}
      {getIcon()}
    </Button>
  )
}
