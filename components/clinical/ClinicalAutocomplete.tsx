"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "../../lib/auth"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { 
  Search, 
  ChevronDown, 
  Star, 
  Clock, 
  Tag,
  Loader2,
  AlertCircle,
  Check
} from "lucide-react"
import { toast } from "../../hooks/use-toast"
import { cn } from "../../lib/utils"

export type ClinicalItemType = "diagnosis" | "medications" | "lab-tests" | "procedures"

interface ClinicalItem {
  id: string
  code: string
  name: string
  description?: string
  category?: string
  isActive: boolean
  isFavorite?: boolean
  lastUsed?: string
  usageCount?: number
}

interface ClinicalAutocompleteProps {
  type: ClinicalItemType
  value?: ClinicalItem | null
  onSelect: (item: ClinicalItem) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showCode?: boolean
  showCategory?: boolean
  showFavorites?: boolean
  limit?: number
  category?: string
}

export function ClinicalAutocomplete({
  type,
  value,
  onSelect,
  placeholder,
  className,
  disabled = false,
  showCode = true,
  showCategory = true,
  showFavorites = true,
  limit = 20,
  category
}: ClinicalAutocompleteProps) {
  const { accessToken } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [items, setItems] = useState<ClinicalItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [favorites, setFavorites] = useState<ClinicalItem[]>([])
  const [recentItems, setRecentItems] = useState<ClinicalItem[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Debounced search function
  const searchItems = useCallback(async (query: string) => {
    if (!accessToken || !query.trim()) {
      setItems([])
      return
    }

    try {
      setLoading(true)
      setError("")
      
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        ...(category && { category }),
        userFavoritesFirst: "true"
      })

      const response = await fetch(`http://localhost:5000/api/clinical-autocomplete/${type}?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setItems(result.data.items || [])
        } else {
          throw new Error(result.message || "Failed to fetch items")
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to fetch items")
      }
    } catch (error) {
      console.error(`Error searching ${type}:`, error)
      setError("Failed to search items")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, type, limit, category])

  // Load favorites
  const loadFavorites = useCallback(async () => {
    if (!accessToken || !showFavorites) return

    try {
      const response = await fetch(`http://localhost:5000/api/clinical-autocomplete/favorites/${type}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setFavorites(result.data || [])
        }
      }
    } catch (error) {
      console.error("Error loading favorites:", error)
    }
  }, [accessToken, type, showFavorites])

  // Load recent items
  const loadRecentItems = useCallback(async () => {
    if (!accessToken) return

    try {
      const response = await fetch(`http://localhost:5000/api/clinical-autocomplete/suggestions/${type}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setRecentItems(result.data || [])
        }
      }
    } catch (error) {
      console.error("Error loading recent items:", error)
    }
  }, [accessToken, type])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchItems(value)
    }, 300)
  }

  // Handle item selection
  const handleSelect = (item: ClinicalItem) => {
    onSelect(item)
    setOpen(false)
    setSearchQuery("")
  }

  // Load initial data when component mounts
  useEffect(() => {
    if (open) {
      loadFavorites()
      loadRecentItems()
    }
  }, [open, loadFavorites, loadRecentItems])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Get display text for selected item
  const getDisplayText = (item: ClinicalItem) => {
    if (showCode && showCategory && item.category) {
      return `${item.code} - ${item.name} (${item.category})`
    } else if (showCode) {
      return `${item.code} - ${item.name}`
    } else {
      return item.name
    }
  }

  // Get placeholder text
  const getPlaceholder = () => {
    if (placeholder) return placeholder
    
    switch (type) {
      case "diagnosis": return "Search diagnosis codes..."
      case "medications": return "Search medications..."
      case "lab-tests": return "Search lab tests..."
      case "procedures": return "Search procedures..."
      default: return "Search..."
    }
  }

  // Get type label
  const getTypeLabel = () => {
    switch (type) {
      case "diagnosis": return "Diagnosis"
      case "medications": return "Medication"
      case "lab-tests": return "Lab Test"
      case "procedures": return "Procedure"
      default: return "Item"
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white",
            !value && "text-gray-500 dark:text-gray-400",
            className
          )}
          disabled={disabled}
        >
          {value ? getDisplayText(value) : getPlaceholder()}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600" align="start">
        <Command className="bg-white dark:bg-gray-800">
          <CommandInput
            placeholder={`Search ${getTypeLabel().toLowerCase()}s...`}
            value={searchQuery}
            onValueChange={handleSearchChange}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
          />
          <CommandList className="max-h-[300px]">
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Searching...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-4 text-red-500">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {!loading && !error && searchQuery && items.length === 0 && (
              <CommandEmpty>No {getTypeLabel().toLowerCase()}s found.</CommandEmpty>
            )}

            {!loading && !error && !searchQuery && favorites.length === 0 && recentItems.length === 0 && (
              <CommandEmpty>Start typing to search {getTypeLabel().toLowerCase()}s...</CommandEmpty>
            )}

            {/* Favorites Section */}
            {!loading && !error && !searchQuery && showFavorites && favorites.length > 0 && (
              <CommandGroup heading="Favorites">
                <ScrollArea className="h-32">
                  {favorites.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {showCode ? `${item.code} - ` : ""}{item.name}
                          </div>
                          {showCategory && item.category && (
                            <div className="text-sm text-gray-500">{item.category}</div>
                          )}
                        </div>
                      </div>
                      {value?.id === item.id && <Check className="h-4 w-4 text-green-500" />}
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            )}

            {/* Recent Items Section */}
            {!loading && !error && !searchQuery && recentItems.length > 0 && (
              <CommandGroup heading="Recent">
                <ScrollArea className="h-32">
                  {recentItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {showCode ? `${item.code} - ` : ""}{item.name}
                          </div>
                          {showCategory && item.category && (
                            <div className="text-sm text-gray-500">{item.category}</div>
                          )}
                        </div>
                      </div>
                      {value?.id === item.id && <Check className="h-4 w-4 text-green-500" />}
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            )}

            {/* Search Results Section */}
            {!loading && !error && searchQuery && items.length > 0 && (
              <CommandGroup heading="Search Results">
                <ScrollArea className="h-64">
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {showCode ? `${item.code} - ` : ""}{item.name}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-500">{item.description}</div>
                          )}
                          {showCategory && item.category && (
                            <div className="flex items-center gap-1 mt-1">
                              <Tag className="h-3 w-3 text-gray-400" />
                              <Badge variant="secondary" className="text-xs">
                                {item.category}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.isFavorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                        {value?.id === item.id && <Check className="h-4 w-4 text-green-500" />}
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
  )
}

// Convenience components for specific types
export function DiagnosisAutocomplete(props: Omit<ClinicalAutocompleteProps, "type">) {
  return <ClinicalAutocomplete {...props} type="diagnosis" />
}

export function MedicationAutocomplete(props: Omit<ClinicalAutocompleteProps, "type">) {
  return <ClinicalAutocomplete {...props} type="medications" />
}

export function LabTestAutocomplete(props: Omit<ClinicalAutocompleteProps, "type">) {
  return <ClinicalAutocomplete {...props} type="lab-tests" />
}

export function ProcedureAutocomplete(props: Omit<ClinicalAutocompleteProps, "type">) {
  return <ClinicalAutocomplete {...props} type="procedures" />
}
