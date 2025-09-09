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

async function testDynamicPaymentTypes() {
  try {
    console.log('\n💰 Testing Dynamic Payment Types...')
    
    // Create a test patient
    const testPatient = {
      firstName: 'Payment',
      lastName: 'Test',
      gender: 'MALE',
      insuranceType: 'CASH',
      age: 25,
      phoneNumber: '+254712345678'
    }
    
    const patientResponse = await axios.post(`${API_BASE_URL}/patients`, testPatient, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!patientResponse.data.success) {
      throw new Error('Failed to create test patient')
    }
    
    const patientId = patientResponse.data.data.id
    
    // Create a visit with different payment type
    const visitData = {
      patientId: patientId,
      opNumber: patientResponse.data.data.opNumber,
      chiefComplaint: 'Test visit for payment type',
      paymentType: 'SHA',
      paymentReference: 'SHA123456'
    }
    
    const visitResponse = await axios.post(`${API_BASE_URL}/visits`, visitData, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (visitResponse.data.success) {
      console.log('✅ Dynamic payment types working')
      console.log(`   - Patient default: ${testPatient.insuranceType}`)
      console.log(`   - Visit payment: ${visitData.paymentType}`)
      console.log(`   - Payment reference: ${visitData.paymentReference}`)
      return true
    } else {
      throw new Error('Failed to create visit with dynamic payment type')
    }
  } catch (error) {
    console.log('❌ Dynamic payment types test failed:', error.response?.data?.message || error.message)
    return false
  }
}

async function testImmunizationSystem() {
  try {
    console.log('\n💉 Testing Immunization System...')
    
    // Get immunization schedules
    const schedulesResponse = await axios.get(`${API_BASE_URL}/immunization/schedules`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!schedulesResponse.data.success) {
      throw new Error('Failed to fetch immunization schedules')
    }
    
    console.log(`✅ Found ${schedulesResponse.data.data.length} immunization schedules`)
    
    // Get vaccines
    const vaccinesResponse = await axios.get(`${API_BASE_URL}/immunization/vaccines`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!vaccinesResponse.data.success) {
      throw new Error('Failed to fetch vaccines')
    }
    
    console.log(`✅ Found ${vaccinesResponse.data.data.length} vaccines`)
    
    // Create a test patient for immunization
    const testPatient = {
      firstName: 'Immunization',
      lastName: 'Test',
      gender: 'FEMALE',
      insuranceType: 'CASH',
      age: 2, // 2 years old for immunization testing
      phoneNumber: '+254723456789'
    }
    
    const patientResponse = await axios.post(`${API_BASE_URL}/patients`, testPatient, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!patientResponse.data.success) {
      throw new Error('Failed to create test patient for immunization')
    }
    
    const patientId = patientResponse.data.data.id
    const vaccineId = vaccinesResponse.data.data[0].id
    
    // Record an immunization
    const immunizationData = {
      vaccineId: vaccineId,
      immunizationDate: new Date().toISOString(),
      batchNumber: 'BATCH001',
      site: 'Left arm',
      route: 'IM',
      dosage: '0.5ml',
      status: 'COMPLETED',
      notes: 'Test immunization record'
    }
    
    const immunizationResponse = await axios.post(`${API_BASE_URL}/immunization/patients/${patientId}/immunizations`, immunizationData, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (immunizationResponse.data.success) {
      console.log('✅ Immunization system working')
      console.log(`   - Recorded immunization for patient ${patientId}`)
      console.log(`   - Vaccine: ${vaccinesResponse.data.data[0].name}`)
      return true
    } else {
      throw new Error('Failed to record immunization')
    }
  } catch (error) {
    console.log('❌ Immunization system test failed:', error.response?.data?.message || error.message)
    return false
  }
}

async function testFamilyPlanningSystem() {
  try {
    console.log('\n👨‍👩‍👧‍👦 Testing Family Planning System...')
    
    // Get family planning methods
    const methodsResponse = await axios.get(`${API_BASE_URL}/family-planning/methods`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!methodsResponse.data.success) {
      throw new Error('Failed to fetch family planning methods')
    }
    
    console.log(`✅ Found ${methodsResponse.data.data.length} family planning methods`)
    
    // Get methods by category
    const hormonalMethodsResponse = await axios.get(`${API_BASE_URL}/family-planning/methods/category/HORMONAL`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!hormonalMethodsResponse.data.success) {
      throw new Error('Failed to fetch hormonal methods')
    }
    
    console.log(`✅ Found ${hormonalMethodsResponse.data.data.length} hormonal methods`)
    
    // Create a test patient for family planning
    const testPatient = {
      firstName: 'Family',
      lastName: 'Planning',
      gender: 'FEMALE',
      insuranceType: 'CASH',
      age: 28,
      phoneNumber: '+254734567890'
    }
    
    const patientResponse = await axios.post(`${API_BASE_URL}/patients`, testPatient, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!patientResponse.data.success) {
      throw new Error('Failed to create test patient for family planning')
    }
    
    const patientId = patientResponse.data.data.id
    const methodId = methodsResponse.data.data[0].id
    
    // Create a family planning record
    const familyPlanningData = {
      methodId: methodId,
      startDate: new Date().toISOString(),
      counselingProvided: true,
      counselingNotes: 'Comprehensive counseling provided',
      status: 'ACTIVE',
      notes: 'Test family planning record'
    }
    
    const familyPlanningResponse = await axios.post(`${API_BASE_URL}/family-planning/patients/${patientId}/records`, familyPlanningData, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (familyPlanningResponse.data.success) {
      console.log('✅ Family planning system working')
      console.log(`   - Created family planning record for patient ${patientId}`)
      console.log(`   - Method: ${methodsResponse.data.data[0].name}`)
      return true
    } else {
      throw new Error('Failed to create family planning record')
    }
  } catch (error) {
    console.log('❌ Family planning system test failed:', error.response?.data?.message || error.message)
    return false
  }
}

async function testMCHServices() {
  try {
    console.log('\n🤱 Testing MCH Services...')
    
    // Get MCH services
    const servicesResponse = await axios.get(`${API_BASE_URL}/mch-services/services`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!servicesResponse.data.success) {
      throw new Error('Failed to fetch MCH services')
    }
    
    console.log(`✅ Found ${servicesResponse.data.data.length} MCH services`)
    
    // Get services by category
    const antenatalServicesResponse = await axios.get(`${API_BASE_URL}/mch-services/services/category/ANTENATAL`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!antenatalServicesResponse.data.success) {
      throw new Error('Failed to fetch antenatal services')
    }
    
    console.log(`✅ Found ${antenatalServicesResponse.data.data.length} antenatal services`)
    
    // Create a test patient for MCH services
    const testPatient = {
      firstName: 'MCH',
      lastName: 'Patient',
      gender: 'FEMALE',
      insuranceType: 'CASH',
      age: 25,
      phoneNumber: '+254745678901'
    }
    
    const patientResponse = await axios.post(`${API_BASE_URL}/patients`, testPatient, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!patientResponse.data.success) {
      throw new Error('Failed to create test patient for MCH services')
    }
    
    const patientId = patientResponse.data.data.id
    const serviceId = servicesResponse.data.data[0].id
    
    // Create an MCH service record
    const mchServiceData = {
      serviceId: serviceId,
      serviceDate: new Date().toISOString(),
      serviceDetails: {
        duration_minutes: 30,
        weight: 65.5,
        blood_pressure: '120/80',
        notes: 'Regular checkup'
      },
      findings: 'Patient is healthy',
      recommendations: 'Continue regular checkups',
      status: 'COMPLETED',
      notes: 'Test MCH service record'
    }
    
    const mchServiceResponse = await axios.post(`${API_BASE_URL}/mch-services/patients/${patientId}/services`, mchServiceData, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (mchServiceResponse.data.success) {
      console.log('✅ MCH services system working')
      console.log(`   - Created MCH service record for patient ${patientId}`)
      console.log(`   - Service: ${servicesResponse.data.data[0].name}`)
      return true
    } else {
      throw new Error('Failed to create MCH service record')
    }
  } catch (error) {
    console.log('❌ MCH services test failed:', error.response?.data?.message || error.message)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Health Services Tests...\n')
  
  // Login
  const loginSuccess = await login()
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication')
    return
  }
  
  // Test dynamic payment types
  const paymentTest = await testDynamicPaymentTypes()
  
  // Test immunization system
  const immunizationTest = await testImmunizationSystem()
  
  // Test family planning system
  const familyPlanningTest = await testFamilyPlanningSystem()
  
  // Test MCH services
  const mchTest = await testMCHServices()
  
  console.log('\n🎉 Health Services Tests Completed!')
  console.log('\n📋 Summary:')
  console.log(`✅ Authentication: ${loginSuccess ? 'Working' : 'Failed'}`)
  console.log(`✅ Dynamic Payment Types: ${paymentTest ? 'Working' : 'Failed'}`)
  console.log(`✅ Immunization System: ${immunizationTest ? 'Working' : 'Failed'}`)
  console.log(`✅ Family Planning System: ${familyPlanningTest ? 'Working' : 'Failed'}`)
  console.log(`✅ MCH Services: ${mchTest ? 'Working' : 'Failed'}`)
  
  console.log('\n🔗 New API Endpoints Available:')
  console.log('   - /api/immunization/* - Immunization management')
  console.log('   - /api/family-planning/* - Family planning services')
  console.log('   - /api/mch-services/* - Maternal and Child Health services')
  console.log('   - Dynamic payment types in visits and patient encounters')
  
  console.log('\n👤 Login with: admin / admin123')
}

// Run tests
runTests().catch(console.error)
