"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DatabaseService_1 = require("../services/DatabaseService");
const ClinicalData_1 = require("../models/mongodb/ClinicalData");
const Analytics_1 = require("../models/mongodb/Analytics");
async function testDatabases() {
    console.log('🧪 Testing dual database setup...\n');
    try {
        // Initialize both databases
        console.log('1. Initializing databases...');
        await DatabaseService_1.databaseService.initialize();
        console.log('✅ Both databases initialized successfully\n');
        // Test PostgreSQL
        console.log('2. Testing PostgreSQL...');
        const pgResult = await DatabaseService_1.databaseService.queryPostgreSQL('SELECT NOW() as current_time, version() as version');
        console.log('✅ PostgreSQL query successful:', pgResult.rows[0]);
        console.log('');
        // Test MongoDB
        console.log('3. Testing MongoDB...');
        // Test ClinicalData model
        const testClinicalData = new ClinicalData_1.ClinicalData({
            patient_id: 'test-patient-123',
            data_type: 'vital_signs',
            data: {
                blood_pressure: '120/80',
                heart_rate: 72,
                temperature: 98.6,
                weight: 70
            },
            created_by: 'test-user',
            metadata: {
                source: 'test',
                device: 'test-device'
            }
        });
        await testClinicalData.save();
        console.log('✅ ClinicalData saved successfully');
        // Test Analytics model
        const testAnalytics = new Analytics_1.Analytics({
            event_type: 'test_event',
            user_id: 'test-user',
            data: {
                action: 'database_test',
                timestamp: new Date()
            },
            session_id: 'test-session-123'
        });
        await testAnalytics.save();
        console.log('✅ Analytics saved successfully');
        // Query test data
        const clinicalDataCount = await ClinicalData_1.ClinicalData.countDocuments();
        const analyticsCount = await Analytics_1.Analytics.countDocuments();
        console.log(`📊 MongoDB collections: ClinicalData (${clinicalDataCount} docs), Analytics (${analyticsCount} docs)`);
        console.log('');
        // Test database status
        console.log('4. Testing database status...');
        const status = await DatabaseService_1.databaseService.getStatus();
        console.log('📊 Database Status:', JSON.stringify(status, null, 2));
        console.log('');
        // Clean up test data
        console.log('5. Cleaning up test data...');
        await ClinicalData_1.ClinicalData.deleteMany({ patient_id: 'test-patient-123' });
        await Analytics_1.Analytics.deleteMany({ event_type: 'test_event' });
        console.log('✅ Test data cleaned up');
        console.log('');
        console.log('🎉 All database tests passed successfully!');
        console.log('✅ PostgreSQL: Working');
        console.log('✅ MongoDB: Working');
        console.log('✅ Dual database setup: Complete');
    }
    catch (error) {
        console.error('❌ Database test failed:', error);
        process.exit(1);
    }
    finally {
        // Close connections
        await DatabaseService_1.databaseService.close();
        process.exit(0);
    }
}
// Run the test
testDatabases();
