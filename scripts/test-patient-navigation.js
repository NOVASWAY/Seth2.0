#!/usr/bin/env node

const axios = require('axios')

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api'
const FRONTEND_URL = 'http://localhost:3000'

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

async function testPatientRegistration() {
  try {
    console.log('\n📋 Testing patient registration endpoint...')
    
    const testPatient = {
      firstName: 'Test',
      lastName: 'Patient',
      gender: 'MALE',
      insuranceType: 'SHA',
      age: 30,
      phoneNumber: '+254712345678',
      registrationType: 'NEW_PATIENT'
    }
    
    const response = await axios.post(`${API_BASE_URL}/patients`, testPatient, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (response.data.success) {
      console.log('✅ Patient registration successful')
      console.log(`   - Patient ID: ${response.data.data.id}`)
      console.log(`   - OP Number: ${response.data.data.opNumber}`)
      console.log(`   - Registration Type: ${response.data.data.registrationType}`)
      return response.data.data.id
    } else {
      console.log('❌ Patient registration failed:', response.data.message)
      return null
    }
  } catch (error) {
    console.log('❌ Patient registration error:', error.response?.data?.message || error.message)
    return null
  }
}

async function testPatientImport() {
  try {
    console.log('\n📥 Testing patient import endpoint...')
    
    const testPatients = [
      {
        op_number: 'OP2024001',
        first_name: 'Imported',
        last_name: 'Patient1',
        age: 25,
        insurance_type: 'PRIVATE',
        phone_number: '+254723456789'
      },
      {
        op_number: 'OP2024002',
        first_name: 'Imported',
        last_name: 'Patient2',
        age: 35,
        insurance_type: 'CASH',
        phone_number: '+254734567890'
      }
    ]
    
    const response = await axios.post(`${API_BASE_URL}/patients/import`, {
      patients: testPatients
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (response.data.success) {
      console.log('✅ Patient import successful')
      console.log(`   - Total: ${response.data.data.total}`)
      console.log(`   - Successful: ${response.data.data.successful.length}`)
      console.log(`   - Failed: ${response.data.data.failed.length}`)
      
      if (response.data.data.successful.length > 0) {
        console.log('   - Imported patients:')
        response.data.data.successful.forEach(patient => {
          console.log(`     * ${patient.name} (${patient.op_number})`)
        })
      }
      
      if (response.data.data.failed.length > 0) {
        console.log('   - Failed imports:')
        response.data.data.failed.forEach(failure => {
          console.log(`     * ${failure.op_number}: ${failure.error}`)
        })
      }
      
      return response.data.data.successful.length
    } else {
      console.log('❌ Patient import failed:', response.data.message)
      return 0
    }
  } catch (error) {
    console.log('❌ Patient import error:', error.response?.data?.message || error.message)
    return 0
  }
}

async function testFrontendNavigation() {
  try {
    console.log('\n🌐 Testing frontend navigation...')
    
    // Test if the frontend is accessible
    const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 5000 })
    if (frontendResponse.status === 200) {
      console.log('✅ Frontend is accessible')
    } else {
      console.log('❌ Frontend not accessible')
      return false
    }
    
    // Test patient pages (these should redirect to login without auth)
    const pages = [
      '/patients',
      '/patients/register',
      '/patients/import'
    ]
    
    for (const page of pages) {
      try {
        const response = await axios.get(`${FRONTEND_URL}${page}`, { 
          timeout: 5000,
          maxRedirects: 0,
          validateStatus: (status) => status < 400
        })
        console.log(`✅ ${page} - Status: ${response.status}`)
      } catch (error) {
        if (error.response?.status === 302 || error.response?.status === 307) {
          console.log(`✅ ${page} - Redirecting (expected for protected route)`)
        } else {
          console.log(`❌ ${page} - Error: ${error.message}`)
        }
      }
    }
    
    return true
  } catch (error) {
    console.log('❌ Frontend navigation test error:', error.message)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Patient Navigation Tests...\n')
  
  // Login
  const loginSuccess = await login()
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication')
    return
  }
  
  // Test patient registration
  const registrationResult = await testPatientRegistration()
  
  // Test patient import
  const importResult = await testPatientImport()
  
  // Test frontend navigation
  const frontendResult = await testFrontendNavigation()
  
  console.log('\n🎉 Patient Navigation Tests Completed!')
  console.log('\n📋 Summary:')
  console.log(`✅ Authentication: ${loginSuccess ? 'Working' : 'Failed'}`)
  console.log(`✅ Patient Registration: ${registrationResult ? 'Working' : 'Failed'}`)
  console.log(`✅ Patient Import: ${importResult > 0 ? 'Working' : 'Failed'}`)
  console.log(`✅ Frontend Navigation: ${frontendResult ? 'Working' : 'Failed'}`)
  
  console.log('\n🔗 Access the system at:')
  console.log(`   - Frontend: ${FRONTEND_URL}`)
  console.log(`   - Login: ${FRONTEND_URL}/login`)
  console.log(`   - Patients: ${FRONTEND_URL}/patients`)
  console.log(`   - Register: ${FRONTEND_URL}/patients/register`)
  console.log(`   - Import: ${FRONTEND_URL}/patients/import`)
  
  console.log('\n👤 Login with: admin / admin123')
}

// Run tests
runTests().catch(console.error)
