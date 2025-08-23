"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Badge } from "./badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { ScrollArea } from "./scroll-area"
import { cn } from "../../lib/utils"
import { 
  Search, 
  Star, 
  StarOff, 
  Check, 
  ChevronsUpDown, 
  Loader2, 
  Heart, 
  Clock,
  Tag,
  Pill,
  TestTube,
  Stethoscope,
  Thermometer
} from "lucide-react"
import { useToast } from "./use-toast"

export interface ClinicalItem {
  id: string
  code?: string
  name: string
  description?: string
  category?: string
  subcategory?: string
  additionalInfo?: Record<string, any>
  usageCount: number
  isFavorite: boolean
}

export interface ClinicalAutocompleteProps {
  itemType: 'DIAGNOSIS' | 'MEDICATION' | 'LAB_TEST' | 'PROCEDURE' | 'SYMPTOM'
  placeholder?: string
  label?: string
  value?: ClinicalItem | null
  onSelect: (item: ClinicalItem | null) => void
  onFavoriteToggle?: (item: ClinicalItem) => void
  disabled?: boolean
  required?: boolean
  className?: string
  showFavorites?: boolean
  showCategories?: boolean
  allowClear?: boolean
  maxResults?: number
  debounceMs?: number
}

export function ClinicalAutocomplete({
  itemType,
  placeholder,
  label,
  value,
  onSelect,
  onFavoriteToggle,
  disabled = false,
  required = false,
  className,
  showFavorites = true,
  showCategories = true,
  allowClear = true,
  maxResults = 20,
  debounceMs = 300
}: ClinicalAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [items, setItems] = useState<ClinicalItem[]>([])
  const [favorites, setFavorites] = useState<ClinicalItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  
  const { toast } = useToast()
  const debounceRef = useRef<NodeJS.Timeout>()
  const searchStartTime = useRef<number>(0)

  // Get appropriate icon for item type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DIAGNOSIS': return Tag
      case 'MEDICATION': return Pill
      case 'LAB_TEST': return TestTube
      case 'PROCEDURE': return Stethoscope
      case 'SYMPTOM': return Thermometer
      default: return Search
    }
  }

  const TypeIcon = getTypeIcon(itemType)

  // Load favorites and categories on mount
  useEffect(() => {
    loadFavorites()
    if (showCategories) {
      loadCategories()
    }
  }, [itemType])

  // Set initial display value
  useEffect(() => {
    if (value) {
      setInputValue(`${value.code ? `${value.code} - ` : ''}${value.name}`)
    } else {
      setInputValue("")
    }
  }, [value])

  const loadFavorites = async () => {
    try {
      const response = await fetch(`/api/clinical-autocomplete/favorites/${itemType.toLowerCase()}?limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFavorites(data.data)
      }
    } catch (error) {
      console.error('Failed to load favorites:', error)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/clinical-autocomplete/categories/${itemType.toLowerCase()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const searchItems = useCallback(async (searchTerm: string, category: string = "") => {
    if (searchTerm.length < 2) {
      setItems(favorites)
      return
    }

    setLoading(true)
    setError("")
    searchStartTime.current = Date.now()

    try {
      const params = new URLSearchParams({
        q: searchTerm,
        limit: maxResults.toString()
      })

      if (category) {
        params.append('category', category)
      }

      const response = await fetch(`/api/clinical-autocomplete/${itemType.toLowerCase()}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setItems(data.data)

    } catch (error) {
      setError('Search failed. Please try again.')
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [itemType, maxResults, favorites])

  // Debounced search
  const debouncedSearch = useCallback((searchTerm: string, category: string = "") => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      searchItems(searchTerm, category)
    }, debounceMs)
  }, [searchItems, debounceMs])

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    if (newValue !== (value ? `${value.code ? `${value.code} - ` : ''}${value.name}` : '')) {
      onSelect(null) // Clear selection when typing
    }
    debouncedSearch(newValue, selectedCategory)
  }

  const handleSelect = async (item: ClinicalItem) => {
    setInputValue(`${item.code ? `${item.code} - ` : ''}${item.name}`)
    onSelect(item)
    setOpen(false)

    // Record selection for analytics
    try {
      await fetch('/api/clinical-autocomplete/selection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchTerm: inputValue,
          searchType: itemType,
          selectedItemId: item.id,
          selectedItemName: item.name
        })
      })
    } catch (error) {
      console.error('Failed to record selection:', error)
    }
  }

  const handleFavoriteToggle = async (item: ClinicalItem, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    try {
      const response = await fetch('/api/clinical-autocomplete/favorites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemType,
          itemId: item.id,
          itemName: item.name
        })
      })

      if (response.ok) {
        // Update item favorite status
        const updatedItem = { ...item, isFavorite: !item.isFavorite }
        
        // Update items list
        setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i))
        
        // Update favorites list
        if (updatedItem.isFavorite) {
          setFavorites(prev => [updatedItem, ...prev.slice(0, 9)])
        } else {
          setFavorites(prev => prev.filter(i => i.id !== item.id))
        }

        if (onFavoriteToggle) {
          onFavoriteToggle(updatedItem)
        }

        toast({
          title: updatedItem.isFavorite ? "Added to favorites" : "Removed from favorites",
          description: `${item.name} ${updatedItem.isFavorite ? 'added to' : 'removed from'} your favorites`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive"
      })
    }
  }

  const handleClear = () => {
    setInputValue("")
    onSelect(null)
    setItems(favorites)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    if (inputValue.length >= 2) {
      debouncedSearch(inputValue, category)
    }
  }

  const getItemIcon = (item: ClinicalItem) => {
    if (item.isFavorite) {
      return <Heart className="h-4 w-4 text-red-500 fill-current" />
    }
    return <TypeIcon className="h-4 w-4 text-muted-foreground" />
  }

  const renderItemDetails = (item: ClinicalItem) => {
    const details = []
    
    if (item.code) {
      details.push(item.code)
    }
    
    if (item.category) {
      details.push(item.category)
    }

    // Add specific details based on item type
    if (item.additionalInfo) {
      switch (itemType) {
        case 'MEDICATION':
          if (item.additionalInfo.brandNames && item.additionalInfo.brandNames.length > 0) {
            details.push(`Brands: ${item.additionalInfo.brandNames.slice(0, 2).join(', ')}`)
          }
          if (item.additionalInfo.adultDose) {
            details.push(`Dose: ${item.additionalInfo.adultDose}`)
          }
          break
        case 'LAB_TEST':
          if (item.additionalInfo.specimenType) {
            details.push(item.additionalInfo.specimenType)
          }
          if (item.additionalInfo.turnaroundTime) {
            details.push(`${item.additionalInfo.turnaroundTime}h turnaround`)
          }
          if (item.additionalInfo.price) {
            details.push(`KES ${item.additionalInfo.price}`)
          }
          break
        case 'PROCEDURE':
          if (item.additionalInfo.durationMinutes) {
            details.push(`${item.additionalInfo.durationMinutes} min`)
          }
          if (item.additionalInfo.price) {
            details.push(`KES ${item.additionalInfo.price}`)
          }
          break
      }
    }

    return details.join(' • ')
  }

  const displayItems = inputValue.length < 2 ? favorites : items

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="space-y-2">
        {/* Category filter */}
        {showCategories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={selectedCategory === "" ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange("")}
            >
              All Categories
            </Button>
            {categories.slice(0, 5).map((category) => (
              <Button
                key={category}
                type="button"
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {/* Main autocomplete */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                placeholder={placeholder || `Search ${itemType.toLowerCase().replace('_', ' ')}...`}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setOpen(true)}
                disabled={disabled}
                className={cn(
                  "pr-20",
                  error && "border-red-500",
                  value && "border-green-500"
                )}
              />
              <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {value && allowClear && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleClear}
                  >
                    ×
                  </Button>
                )}
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </PopoverTrigger>
          
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder={`Search ${itemType.toLowerCase().replace('_', ' ')}...`}
                value={inputValue}
                onValueChange={handleInputChange}
              />
              <CommandList>
                <CommandEmpty>
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Searching...
                    </div>
                  ) : error ? (
                    <div className="py-6 text-center text-sm text-red-500">
                      {error}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm">
                      No {itemType.toLowerCase().replace('_', ' ')} found.
                    </div>
                  )}
                </CommandEmpty>

                {/* Favorites section */}
                {inputValue.length < 2 && favorites.length > 0 && (
                  <CommandGroup heading="Your Favorites">
                    {favorites.map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => handleSelect(item)}
                        className="flex items-start justify-between p-3"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getItemIcon(item)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{item.name}</span>
                              {item.code && (
                                <Badge variant="outline" className="text-xs">
                                  {item.code}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {renderItemDetails(item)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.usageCount}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => handleFavoriteToggle(item, e)}
                          >
                            {item.isFavorite ? (
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            ) : (
                              <StarOff className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Search results */}
                {inputValue.length >= 2 && (
                  <CommandGroup heading={`Search Results (${items.length})`}>
                    <ScrollArea className="h-[300px]">
                      {items.map((item) => (
                        <CommandItem
                          key={item.id}
                          onSelect={() => handleSelect(item)}
                          className="flex items-start justify-between p-3"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {getItemIcon(item)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{item.name}</span>
                                {item.code && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.code}
                                  </Badge>
                                )}
                                {value?.id === item.id && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {renderItemDetails(item)}
                              </div>
                              {item.description && item.description !== item.name && (
                                <div className="text-xs text-muted-foreground mt-1 italic">
                                  {item.description.substring(0, 100)}
                                  {item.description.length > 100 && '...'}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Badge variant="secondary" className="text-xs">
                              {item.usageCount}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => handleFavoriteToggle(item, e)}
                            >
                              {item.isFavorite ? (
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              ) : (
                                <StarOff className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Selected item display */}
        {value && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-4 w-4" />
              <span className="font-medium">{value.name}</span>
              {value.code && (
                <Badge variant="outline">{value.code}</Badge>
              )}
              {value.isFavorite && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </div>
            {value.additionalInfo && (
              <div className="text-xs text-muted-foreground mt-1">
                {renderItemDetails(value)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
