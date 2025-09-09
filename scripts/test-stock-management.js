#!/usr/bin/env node

const axios = require('axios')

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api'

// Test credentials
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
}

let accessToken = ''

async function login() {
  try {
    console.log('🔐 Logging in...')
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_CREDENTIALS)
    
    if (response.data.success) {
      accessToken = response.data.data.accessToken
      console.log('✅ Login successful')
      return true
    } else {
      console.log('❌ Login failed:', response.data.message)
      return false
    }
  } catch (error) {
    console.log('❌ Login error:', error.response?.data?.message || error.message)
    return false
  }
}

async function testStockCategories() {
  try {
    console.log('\n📂 Testing Stock Categories...')
    
    // Get all categories
    const categoriesResponse = await axios.get(`${API_BASE_URL}/stock-categories`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!categoriesResponse.data.success) {
      throw new Error('Failed to fetch stock categories')
    }
    
    console.log(`✅ Found ${categoriesResponse.data.data.length} stock categories`)
    
    // Get main categories only
    const mainCategoriesResponse = await axios.get(`${API_BASE_URL}/stock-categories?parent_only=true`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!mainCategoriesResponse.data.success) {
      throw new Error('Failed to fetch main categories')
    }
    
    console.log(`✅ Found ${mainCategoriesResponse.data.data.length} main categories`)
    
    // Get category hierarchy
    const hierarchyResponse = await axios.get(`${API_BASE_URL}/stock-categories/hierarchy/tree`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!hierarchyResponse.data.success) {
      throw new Error('Failed to fetch category hierarchy')
    }
    
    console.log(`✅ Category hierarchy loaded with ${hierarchyResponse.data.data.length} categories`)
    
    // Get category statistics
    const statsResponse = await axios.get(`${API_BASE_URL}/stock-categories/stats/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!statsResponse.data.success) {
      throw new Error('Failed to fetch category statistics')
    }
    
    console.log(`✅ Category statistics loaded for ${statsResponse.data.data.length} categories`)
    
    // Test creating a new category
    const newCategory = {
      name: 'Test Category',
      description: 'Test category for stock management',
      isActive: true
    }
    
    const createResponse = await axios.post(`${API_BASE_URL}/stock-categories`, newCategory, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!createResponse.data.success) {
      throw new Error('Failed to create new category')
    }
    
    console.log('✅ Created new test category')
    
    const categoryId = createResponse.data.data.id
    
    // Test updating the category
    const updateData = {
      description: 'Updated test category description'
    }
    
    const updateResponse = await axios.put(`${API_BASE_URL}/stock-categories/${categoryId}`, updateData, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!updateResponse.data.success) {
      throw new Error('Failed to update category')
    }
    
    console.log('✅ Updated test category')
    
    // Test deleting the category
    const deleteResponse = await axios.delete(`${API_BASE_URL}/stock-categories/${categoryId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!deleteResponse.data.success) {
      throw new Error('Failed to delete category')
    }
    
    console.log('✅ Deleted test category')
    
    return true
  } catch (error) {
    console.log('❌ Stock categories test failed:', error.response?.data?.message || error.message)
    return false
  }
}

async function testStockItems() {
  try {
    console.log('\n📦 Testing Stock Items...')
    
    // Get all stock items
    const itemsResponse = await axios.get(`${API_BASE_URL}/stock-items`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!itemsResponse.data.success) {
      throw new Error('Failed to fetch stock items')
    }
    
    console.log(`✅ Found ${itemsResponse.data.data.length} stock items`)
    
    // Get low stock items
    const lowStockResponse = await axios.get(`${API_BASE_URL}/stock-items/alerts/low-stock`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!lowStockResponse.data.success) {
      throw new Error('Failed to fetch low stock items')
    }
    
    console.log(`✅ Found ${lowStockResponse.data.count} low stock items`)
    
    // Get stock summary
    const summaryResponse = await axios.get(`${API_BASE_URL}/stock-items/stats/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!summaryResponse.data.success) {
      throw new Error('Failed to fetch stock summary')
    }
    
    const summary = summaryResponse.data.data.overall
    console.log(`✅ Stock Summary:`)
    console.log(`   - Total Items: ${summary.total_items}`)
    console.log(`   - Out of Stock: ${summary.out_of_stock}`)
    console.log(`   - Low Stock: ${summary.low_stock}`)
    console.log(`   - In Stock: ${summary.in_stock}`)
    console.log(`   - Total Cost Value: $${summary.total_cost_value}`)
    console.log(`   - Total Selling Value: $${summary.total_selling_value}`)
    
    // Test searching stock items
    const searchResponse = await axios.get(`${API_BASE_URL}/stock-items?search=syringe`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!searchResponse.data.success) {
      throw new Error('Failed to search stock items')
    }
    
    console.log(`✅ Search found ${searchResponse.data.data.length} items matching "syringe"`)
    
    // Test creating a new stock item
    const newItem = {
      name: 'Test Syringe 10ml',
      description: 'Test disposable syringe for stock management',
      categoryId: itemsResponse.data.data[0].categoryId, // Use first available category
      sku: 'TEST-SYR-10ML-001',
      unitOfMeasure: 'pieces',
      unitPrice: 3.50,
      costPrice: 2.50,
      sellingPrice: 4.00,
      minimumStockLevel: 20,
      maximumStockLevel: 500,
      currentStock: 100,
      reorderLevel: 30,
      location: 'Test Storage Room',
      isControlledSubstance: false,
      requiresPrescription: false
    }
    
    const createResponse = await axios.post(`${API_BASE_URL}/stock-items`, newItem, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!createResponse.data.success) {
      throw new Error('Failed to create new stock item')
    }
    
    console.log('✅ Created new test stock item')
    
    const itemId = createResponse.data.data.id
    
    // Test updating the stock item
    const updateData = {
      currentStock: 150,
      unitPrice: 3.75
    }
    
    const updateResponse = await axios.put(`${API_BASE_URL}/stock-items/${itemId}`, updateData, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!updateResponse.data.success) {
      throw new Error('Failed to update stock item')
    }
    
    console.log('✅ Updated test stock item')
    
    // Test getting item by SKU
    const skuResponse = await axios.get(`${API_BASE_URL}/stock-items/sku/${newItem.sku}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!skuResponse.data.success) {
      throw new Error('Failed to fetch item by SKU')
    }
    
    console.log('✅ Retrieved item by SKU')
    
    // Test deleting the stock item
    const deleteResponse = await axios.delete(`${API_BASE_URL}/stock-items/${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!deleteResponse.data.success) {
      throw new Error('Failed to delete stock item')
    }
    
    console.log('✅ Deleted test stock item')
    
    return true
  } catch (error) {
    console.log('❌ Stock items test failed:', error.response?.data?.message || error.message)
    return false
  }
}

async function testStockCategoriesAndItems() {
  try {
    console.log('\n🔗 Testing Category-Item Relationships...')
    
    // Get categories with their items
    const categoriesResponse = await axios.get(`${API_BASE_URL}/stock-categories`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!categoriesResponse.data.success) {
      throw new Error('Failed to fetch categories')
    }
    
    const categories = categoriesResponse.data.data
    
    // Test getting items by category
    for (const category of categories.slice(0, 3)) { // Test first 3 categories
      const itemsResponse = await axios.get(`${API_BASE_URL}/stock-items?category_id=${category.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      if (!itemsResponse.data.success) {
        throw new Error(`Failed to fetch items for category ${category.name}`)
      }
      
      console.log(`✅ Category "${category.name}" has ${itemsResponse.data.data.length} items`)
    }
    
    return true
  } catch (error) {
    console.log('❌ Category-item relationship test failed:', error.response?.data?.message || error.message)
    return false
  }
}

async function testStockAlerts() {
  try {
    console.log('\n🚨 Testing Stock Alerts...')
    
    // Get low stock items
    const lowStockResponse = await axios.get(`${API_BASE_URL}/stock-items/alerts/low-stock`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!lowStockResponse.data.success) {
      throw new Error('Failed to fetch low stock alerts')
    }
    
    const lowStockItems = lowStockResponse.data.data
    
    if (lowStockItems.length > 0) {
      console.log(`✅ Found ${lowStockItems.length} items with low stock:`)
      lowStockItems.forEach(item => {
        console.log(`   - ${item.name}: ${item.currentStock} ${item.unitOfMeasure} (Reorder: ${item.reorderLevel})`)
      })
    } else {
      console.log('✅ No low stock items found')
    }
    
    return true
  } catch (error) {
    console.log('❌ Stock alerts test failed:', error.response?.data?.message || error.message)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Stock Management Tests...\n')
  
  // Login
  const loginSuccess = await login()
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication')
    return
  }
  
  // Test stock categories
  const categoriesTest = await testStockCategories()
  
  // Test stock items
  const itemsTest = await testStockItems()
  
  // Test category-item relationships
  const relationshipsTest = await testStockCategoriesAndItems()
  
  // Test stock alerts
  const alertsTest = await testStockAlerts()
  
  console.log('\n🎉 Stock Management Tests Completed!')
  console.log('\n📋 Summary:')
  console.log(`✅ Authentication: ${loginSuccess ? 'Working' : 'Failed'}`)
  console.log(`✅ Stock Categories: ${categoriesTest ? 'Working' : 'Failed'}`)
  console.log(`✅ Stock Items: ${itemsTest ? 'Working' : 'Failed'}`)
  console.log(`✅ Category-Item Relationships: ${relationshipsTest ? 'Working' : 'Failed'}`)
  console.log(`✅ Stock Alerts: ${alertsTest ? 'Working' : 'Failed'}`)
  
  console.log('\n🔗 New API Endpoints Available:')
  console.log('   - /api/stock-categories/* - Stock category management')
  console.log('   - /api/stock-items/* - Stock item management')
  console.log('   - Stock alerts and low stock notifications')
  console.log('   - Category hierarchy and statistics')
  console.log('   - Stock search and filtering')
  
  console.log('\n📊 Stock Categories Available:')
  console.log('   - MEDICATIONS - All types of medications and drugs')
  console.log('   - MEDICAL_TOOLS - Medical instruments and tools')
  console.log('   - MEDICAL_EQUIPMENT - Medical equipment and devices')
  console.log('   - SUPPLIES - General medical supplies')
  console.log('   - DIAGNOSTIC_SUPPLIES - Diagnostic and testing supplies')
  console.log('   - SURGICAL_SUPPLIES - Surgical instruments and supplies')
  console.log('   - EMERGENCY_SUPPLIES - Emergency and first aid supplies')
  console.log('   - CLEANING_SUPPLIES - Cleaning and sanitization supplies')
  console.log('   - OFFICE_SUPPLIES - Office and administrative supplies')
  
  console.log('\n🛠️ Subcategories for Tools:')
  console.log('   - SYRINGES - Syringes and needles')
  console.log('   - SCALPELS - Scalpels and cutting instruments')
  console.log('   - FORCEPS - Forceps and grasping instruments')
  console.log('   - THERMOMETERS - Thermometers and temperature measuring devices')
  console.log('   - STETHOSCOPES - Stethoscopes and listening devices')
  
  console.log('\n👤 Login with: admin / admin123')
}

// Run tests
runTests().catch(console.error)
