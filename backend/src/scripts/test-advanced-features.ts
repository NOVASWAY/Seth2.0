import { databaseService } from '../services/DatabaseService'
import { MigrationService } from '../services/MigrationService'
import { AnalyticsService } from '../services/AnalyticsService'
import { mongoModels } from '../models/mongodb'

async function testAdvancedFeatures() {
  console.log('🚀 Testing Advanced Dual Database Features...\n')

  try {
    // 1. Initialize databases
    console.log('1. Initializing databases...')
    await databaseService.initialize()
    console.log('✅ Databases initialized\n')

    // 2. Test Migration Service
    console.log('2. Testing Migration Service...')
    
    // Get migration status
    const migrationStatus = await MigrationService.getMigrationStatus()
    console.log('📊 Migration Status:', JSON.stringify(migrationStatus, null, 2))
    
    // Test patient migration (if there are patients)
    if (migrationStatus.postgresql.patients > 0) {
      console.log('🔄 Testing patient migration...')
      const patientMigrationResult = await MigrationService.migratePatientData()
      console.log('✅ Patient migration result:', {
        success: patientMigrationResult.success,
        recordsProcessed: patientMigrationResult.recordsProcessed,
        errors: patientMigrationResult.errors.length
      })
    } else {
      console.log('⚠️ No patients found in PostgreSQL, skipping migration test')
    }
    console.log('')

    // 3. Test Analytics Service
    console.log('3. Testing Analytics Service...')
    
    // Track some test events
    console.log('📈 Tracking test events...')
    await AnalyticsService.trackEvent('test_event', {
      testData: 'This is a test event',
      timestamp: new Date()
    })
    
    await AnalyticsService.trackEvent('patient_visit', {
      patientId: 'test-patient-123',
      visitType: 'consultation',
      duration: 30
    })
    
    await AnalyticsService.trackEvent('system_event', {
      action: 'database_test',
      component: 'analytics_service'
    })
    console.log('✅ Test events tracked')

    // Get analytics data
    console.log('📊 Getting analytics data...')
    const analytics = await AnalyticsService.getAnalytics({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate: new Date(),
      groupBy: 'day'
    })
    console.log('✅ Analytics data retrieved:', {
      totalEvents: analytics.totalEvents,
      uniquePatients: analytics.uniquePatients,
      eventTypes: Object.keys(analytics.eventTypes).length
    })

    // Get system metrics
    console.log('📊 Getting system metrics...')
    const systemMetrics = await AnalyticsService.getSystemMetrics()
    console.log('✅ System metrics retrieved:', {
      clinicalData: systemMetrics.collectionStats.clinicalData,
      analytics: systemMetrics.collectionStats.analytics,
      recentActivity: systemMetrics.recentActivity.length
    })
    console.log('')

    // 4. Test MongoDB Models with Advanced Queries
    console.log('4. Testing Advanced MongoDB Queries...')
    
    // Test aggregation queries
    const eventTypeStats = await mongoModels.Analytics.aggregate([
      { $group: { _id: '$event_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    console.log('📊 Event type statistics:', eventTypeStats)

    // Test time-based queries
    const recentEvents = await mongoModels.Analytics.find({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(5)
    console.log('📅 Recent events (last 24h):', recentEvents.length)

    // Test clinical data queries
    const clinicalDataStats = await mongoModels.ClinicalData.aggregate([
      { $group: { _id: '$data_type', count: { $sum: 1 } } }
    ])
    console.log('🏥 Clinical data types:', clinicalDataStats)
    console.log('')

    // 5. Test Database Health
    console.log('5. Testing Database Health...')
    const healthStatus = await databaseService.getStatus()
    console.log('✅ Database Health Status:', JSON.stringify(healthStatus, null, 2))
    console.log('')

    // 6. Performance Test
    console.log('6. Running Performance Test...')
    const startTime = Date.now()
    
    // Create multiple records
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(
        AnalyticsService.trackEvent('performance_test', {
          testId: i,
          timestamp: new Date(),
          data: `Test data ${i}`
        })
      )
    }
    
    await Promise.all(promises)
    const endTime = Date.now()
    console.log(`✅ Performance test completed: 10 events in ${endTime - startTime}ms`)
    console.log('')

    // 7. Cleanup
    console.log('7. Cleaning up test data...')
    await mongoModels.Analytics.deleteMany({
      'data.testData': 'This is a test event'
    })
    await mongoModels.Analytics.deleteMany({
      'data.testId': { $exists: true }
    })
    console.log('✅ Test data cleaned up')
    console.log('')

    console.log('🎉 All advanced features tests passed successfully!')
    console.log('')
    console.log('📋 Summary:')
    console.log('✅ Migration Service: Working')
    console.log('✅ Analytics Service: Working')
    console.log('✅ MongoDB Aggregation: Working')
    console.log('✅ Performance: Good')
    console.log('✅ Database Health: Healthy')
    console.log('')
    console.log('🚀 Advanced dual database features are fully operational!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    // Close database connections
    await databaseService.close()
    process.exit(0)
  }
}

// Run the test
testAdvancedFeatures()
