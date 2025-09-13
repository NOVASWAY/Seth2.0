'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { useToast } from '../../hooks/use-toast'
import { useAuthStore } from '../../lib/auth'
import { 
  Pill, 
  User, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  Calculator,
  Search,
  Package
} from 'lucide-react'

interface InventoryItem {
  id: string
  name: string
  itemCode: string
  quantityAvailable: number
  unit: string
  sellingPrice: number
  costPrice: number
  expiryDate: string
  batchNumber?: string
  isExpired: boolean
}

interface DispensingItem {
  itemId: string
  itemName: string
  itemCode: string
  quantityRequested: number
  quantityAvailable: number
  unitPrice: number
  totalPrice: number
  batchNumber?: string
  expiryDate?: string
}

interface Patient {
  id: string
  opNumber: string
  firstName: string
  lastName: string
  diagnosis?: string
}

export function DrugDispensingForm() {
  const { toast } = useToast()
  const { user, accessToken } = useAuthStore()
  const [dispensingType, setDispensingType] = useState<'PATIENT' | 'NON_PATIENT'>('PATIENT')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dispensingItems, setDispensingItems] = useState<DispensingItem[]>([])
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nonPatientDetails, setNonPatientDetails] = useState({
    buyerName: '',
    contactInfo: '',
    notes: ''
  })

  useEffect(() => {
    fetchAvailableItems()
  }, [])

  const fetchAvailableItems = async () => {
    try {
      const response = await fetch('/api/inventory/items', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailableItems(result.data.items || [])
        }
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error)
    }
  }

  const searchPatients = async (term: string) => {
    if (!term || term.length < 2) {
      setPatients([])
      return
    }

    try {
      const response = await fetch(`/api/patients?search=${encodeURIComponent(term)}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setPatients(result.data || [])
        }
      }
    } catch (error) {
      console.error('Error searching patients:', error)
    }
  }

  const addDispensingItem = () => {
    const newItem: DispensingItem = {
      itemId: '',
      itemName: '',
      itemCode: '',
      quantityRequested: 1,
      quantityAvailable: 0,
      unitPrice: 0,
      totalPrice: 0
    }
    setDispensingItems(prev => [...prev, newItem])
  }

  const updateDispensingItem = (index: number, field: string, value: any) => {
    setDispensingItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value }
        
        // If item is selected, update details
        if (field === 'itemId' && value) {
          const inventoryItem = availableItems.find(inv => inv.id === value)
          if (inventoryItem) {
            updated.itemName = inventoryItem.name
            updated.itemCode = inventoryItem.itemCode
            updated.quantityAvailable = inventoryItem.quantityAvailable
            updated.unitPrice = inventoryItem.sellingPrice
            updated.batchNumber = inventoryItem.batchNumber
            updated.expiryDate = inventoryItem.expiryDate
          }
        }
        
        // Calculate total price
        if (field === 'quantityRequested' || field === 'itemId') {
          updated.totalPrice = updated.quantityRequested * updated.unitPrice
        }
        
        return updated
      }
      return item
    }))
  }

  const removeDispensingItem = (index: number) => {
    setDispensingItems(prev => prev.filter((_, i) => i !== index))
  }

  const getTotalAmount = () => {
    return dispensingItems.reduce((sum, item) => sum + item.totalPrice, 0)
  }

  const validateDispensing = (): string[] => {
    const errors: string[] = []
    
    if (dispensingType === 'PATIENT' && !selectedPatient) {
      errors.push('Please select a patient')
    }
    
    if (dispensingItems.length === 0) {
      errors.push('Please add at least one item to dispense')
    }
    
    dispensingItems.forEach((item, index) => {
      if (!item.itemId) {
        errors.push(`Item ${index + 1}: Please select an item`)
      }
      if (item.quantityRequested <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`)
      }
      if (item.quantityRequested > item.quantityAvailable) {
        errors.push(`Item ${index + 1}: Insufficient stock (Available: ${item.quantityAvailable})`)
      }
      
      // Check expiry
      if (item.expiryDate && new Date(item.expiryDate) < new Date()) {
        errors.push(`Item ${index + 1}: Item has expired and cannot be dispensed`)
      }
    })
    
    return errors
  }

  const handleSubmit = async () => {
    const validationErrors = validateDispensing()
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Errors",
        description: validationErrors.join(', '),
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      const endpoint = dispensingType === 'PATIENT' 
        ? '/api/inventory/dispense-patient'
        : '/api/inventory/dispense-non-patient'

      const requestData = dispensingType === 'PATIENT' 
        ? {
            patientId: selectedPatient?.id,
            opNumber: selectedPatient?.opNumber,
            diagnosis: selectedPatient?.diagnosis || '',
            items: dispensingItems.map(item => ({
              itemId: item.itemId,
              quantity: item.quantityRequested
            }))
          }
        : {
            buyerName: nonPatientDetails.buyerName,
            contactInfo: nonPatientDetails.contactInfo,
            notes: nonPatientDetails.notes,
            items: dispensingItems.map(item => ({
              itemId: item.itemId,
              quantity: item.quantityRequested
            }))
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: `Items dispensed successfully. ${dispensingType === 'NON_PATIENT' ? `Receipt: ${result.data.receiptNumber}` : `Updated patient invoice.`}`,
          })
          
          // Reset form
          setDispensingItems([])
          setSelectedPatient(null)
          setSearchTerm('')
          setNonPatientDetails({ buyerName: '', contactInfo: '', notes: '' })
          fetchAvailableItems() // Refresh stock levels
        } else {
          throw new Error(result.message || 'Failed to dispense items')
        }
      } else {
        throw new Error('Failed to dispense items')
      }
    } catch (error: any) {
      console.error('Error dispensing items:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to dispense items",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Pill className="h-6 w-6 text-blue-600" />
          <span>Drug Dispensing</span>
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Dispense medications with automatic stock deduction and pricing
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={dispensingType} onValueChange={(value) => setDispensingType(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="PATIENT" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient Dispensing
            </TabsTrigger>
            <TabsTrigger value="NON_PATIENT" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Walk-in Sales
            </TabsTrigger>
          </TabsList>

          <TabsContent value="PATIENT" className="space-y-6">
            {/* Patient Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Patient Information</h3>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    searchPatients(e.target.value)
                  }}
                  placeholder="Search patient by name or OP number..."
                  className="pl-10"
                />
              </div>

              {/* Patient Search Results */}
              {patients.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-40 overflow-y-auto">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(patient)
                        setSearchTerm(`${patient.firstName} ${patient.lastName}`)
                        setPatients([])
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">OP: {patient.opNumber}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Patient */}
              {selectedPatient && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">Selected Patient</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p><strong>Name:</strong> {selectedPatient.firstName} {selectedPatient.lastName}</p>
                    <p><strong>OP Number:</strong> {selectedPatient.opNumber}</p>
                    {selectedPatient.diagnosis && <p><strong>Diagnosis:</strong> {selectedPatient.diagnosis}</p>}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="NON_PATIENT" className="space-y-6">
            {/* Non-Patient Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Walk-in Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buyerName">Customer Name</Label>
                  <Input
                    id="buyerName"
                    value={nonPatientDetails.buyerName}
                    onChange={(e) => setNonPatientDetails(prev => ({ ...prev, buyerName: e.target.value }))}
                    placeholder="Enter customer name (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="contactInfo">Contact Information</Label>
                  <Input
                    id="contactInfo"
                    value={nonPatientDetails.contactInfo}
                    onChange={(e) => setNonPatientDetails(prev => ({ ...prev, contactInfo: e.target.value }))}
                    placeholder="Phone number or email (optional)"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={nonPatientDetails.notes}
                  onChange={(e) => setNonPatientDetails(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>

          {/* Items to Dispense */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Items to Dispense</h3>
              <Button
                type="button"
                variant="outline"
                onClick={addDispensingItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {dispensingItems.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <Package className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 dark:text-slate-400">No items added yet</p>
                <p className="text-sm text-slate-500">Click "Add Item" to start dispensing</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dispensingItems.map((item, index) => (
                  <Card key={index} className="border border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Item #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDispensingItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Select Item *</Label>
                          <Select
                            value={item.itemId}
                            onValueChange={(value) => updateDispensingItem(index, 'itemId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableItems
                                .filter(inv => inv.quantityAvailable > 0 && !inv.isExpired)
                                .map((inv) => (
                                <SelectItem key={inv.id} value={inv.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{inv.name}</span>
                                    <Badge variant="outline" className="ml-2">
                                      {inv.quantityAvailable} {inv.unit}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.quantityAvailable}
                            value={item.quantityRequested}
                            onChange={(e) => updateDispensingItem(index, 'quantityRequested', parseInt(e.target.value) || 1)}
                            placeholder="1"
                          />
                          {item.quantityAvailable > 0 && (
                            <p className="text-xs text-slate-500">Available: {item.quantityAvailable} {availableItems.find(inv => inv.id === item.itemId)?.unit}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label>Total Price</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              value={`KSh ${item.totalPrice.toFixed(2)}`}
                              readOnly
                              className="font-mono bg-slate-50 dark:bg-slate-800"
                            />
                          </div>
                          <p className="text-xs text-slate-500">
                            KSh {item.unitPrice.toFixed(2)} × {item.quantityRequested}
                          </p>
                        </div>
                      </div>

                      {/* Stock Warnings */}
                      {item.itemId && (
                        <div className="mt-3 space-y-2">
                          {item.quantityRequested > item.quantityAvailable && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Insufficient stock! Available: {item.quantityAvailable}, Requested: {item.quantityRequested}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {item.expiryDate && new Date(item.expiryDate) < new Date() && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                This item has expired and cannot be dispensed!
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {item.expiryDate && new Date(item.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && new Date(item.expiryDate) >= new Date() && (
                            <Alert>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Warning: This item expires within 30 days ({item.expiryDate})
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Total Summary */}
          {dispensingItems.length > 0 && (
            <Card className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calculator className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-medium">Total Amount</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    KSh {getTotalAmount().toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {dispensingItems.length} item(s) • Total quantity: {dispensingItems.reduce((sum, item) => sum + item.quantityRequested, 0)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDispensingItems([])
                setSelectedPatient(null)
                setSearchTerm('')
                setNonPatientDetails({ buyerName: '', contactInfo: '', notes: '' })
              }}
            >
              Clear All
            </Button>
            
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || dispensingItems.length === 0}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Dispensing...
                </>
              ) : (
                <>
                  <Pill className="h-4 w-4 mr-2" />
                  Dispense Items (KSh {getTotalAmount().toFixed(2)})
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
