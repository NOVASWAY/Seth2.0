import { test as base } from '@playwright/test'

export type DataFixture = {
  testPatient: any
  testPrescription: any
  testMedication: any
  testUser: any
}

export const test = base.extend<DataFixture>({
  testPatient: async ({}, use) => {
    const patient = {
      name: 'John Doe',
      phone: '123-456-7890',
      email: 'john.doe@example.com',
      dateOfBirth: '1990-01-01',
      age: '33',
      gender: 'Male',
      address: '123 Main St, City, State 12345',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '098-765-4321',
        relationship: 'Spouse'
      },
      medicalHistory: 'No known allergies',
      notes: 'Test patient for automated testing'
    }
    
    await use(patient)
  },

  testPrescription: async ({}, use) => {
    const prescription = {
      patientId: 'test-patient-123',
      medication: 'Amoxicillin',
      dosage: '500mg',
      frequency: '3 times daily',
      duration: '7 days',
      instructions: 'Take with food',
      prescribedBy: 'Dr. Smith',
      prescribedDate: new Date().toISOString().split('T')[0],
      refills: 0,
      status: 'active'
    }
    
    await use(prescription)
  },

  testMedication: async ({}, use) => {
    const medication = {
      name: 'Amoxicillin',
      genericName: 'Amoxicillin',
      strength: '500mg',
      form: 'Capsule',
      manufacturer: 'Generic Pharma',
      ndc: '12345-6789-01',
      price: 15.99,
      quantity: 100,
      expiryDate: '2025-12-31',
      category: 'Antibiotic',
      requiresPrescription: true
    }
    
    await use(medication)
  },

  testUser: async ({}, use) => {
    const user = {
      username: 'testuser',
      password: 'testpass123',
      email: 'testuser@clinic.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'receptionist',
      permissions: ['read_patients', 'write_patients', 'read_queue']
    }
    
    await use(user)
  },
})

export { expect } from '@playwright/test'
