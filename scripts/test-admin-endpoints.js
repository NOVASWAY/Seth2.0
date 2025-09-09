#!/usr/bin/env node

/**
 * Admin Endpoints Test Script
 * Comprehensive testing of all admin functionality
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

class AdminEndpointsTester {
  constructor() {
    this.accessToken = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runTest(testName, testFunction) {
    this.testResults.total++;
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
      await testFunction();
      console.log(`✅ PASSED: ${testName}`);
      this.testResults.passed++;
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Error: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async authenticate() {
    console.log('🔐 Authenticating as admin...');
    const response = await axios.post(`${API_BASE}/auth/login`, ADMIN_CREDENTIALS);
    
    if (!response.data.success) {
      throw new Error('Authentication failed');
    }
    
    this.accessToken = response.data.data.accessToken;
    console.log('✅ Authentication successful');
  }

  async testAdminDashboard() {
    const response = await axios.get(`${API_BASE}/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch admin dashboard data');
    }

    const data = response.data.data;
    
    if (typeof data.total_patients !== 'number') {
      throw new Error('Invalid dashboard data structure');
    }

    console.log(`   - Dashboard data retrieved successfully`);
    console.log(`   - Total patients: ${data.total_patients}`);
    console.log(`   - Today's visits: ${data.today_visits}`);
    console.log(`   - Active users: ${data.active_users}`);
  }

  async testStaffManagement() {
    const response = await axios.get(`${API_BASE}/admin/staff`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch staff data');
    }

    const { staff, stats } = response.data.data;
    
    if (!Array.isArray(staff)) {
      throw new Error('Staff data is not an array');
    }

    if (typeof stats !== 'object') {
      throw new Error('Invalid statistics data');
    }

    console.log(`   - Staff management data retrieved`);
    console.log(`   - Staff count: ${staff.length}`);
    console.log(`   - Active staff: ${stats.active}`);
    console.log(`   - Locked accounts: ${stats.locked}`);
  }

  async testAuditLogs() {
    const response = await axios.get(`${API_BASE}/admin/audit-logs?limit=10`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch audit logs');
    }

    const { logs, pagination } = response.data.data;
    
    if (!Array.isArray(logs)) {
      throw new Error('Audit logs data is not an array');
    }

    console.log(`   - Audit logs retrieved successfully`);
    console.log(`   - Recent logs: ${logs.length}`);
    console.log(`   - Total logs: ${pagination.total}`);
  }

  async testSystemHealth() {
    const response = await axios.get(`${API_BASE}/health`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.status || response.data.status !== 'OK') {
      throw new Error('System health check failed');
    }

    console.log(`   - System health: ${response.data.status}`);
    console.log(`   - Environment: ${response.data.environment}`);
    console.log(`   - Uptime: ${Math.round(response.data.uptime)}s`);
  }

  async testSyncStats() {
    const response = await axios.get(`${API_BASE}/sync/stats`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch sync statistics');
    }

    const data = response.data.data;
    
    if (typeof data.connectedUsers !== 'number') {
      throw new Error('Invalid sync statistics data');
    }

    console.log(`   - Sync statistics retrieved`);
    console.log(`   - Connected users: ${data.connectedUsers}`);
    console.log(`   - Active users: ${data.activeUsers}`);
    console.log(`   - Recent sync events: ${data.recentSyncEvents}`);
  }

  async testUserPresence() {
    const response = await axios.get(`${API_BASE}/user-presence`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch user presence data');
    }

    const data = response.data.data;
    
    if (!Array.isArray(data)) {
      throw new Error('User presence data is not an array');
    }

    console.log(`   - User presence data retrieved`);
    console.log(`   - Active sessions: ${data.length}`);
  }

  async testNotifications() {
    const response = await axios.get(`${API_BASE}/notifications`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch notifications');
    }

    const data = response.data.data;
    
    if (!Array.isArray(data)) {
      throw new Error('Notifications data is not an array');
    }

    console.log(`   - Notifications retrieved`);
    console.log(`   - Notification count: ${data.length}`);
  }

  async testPatientsList() {
    const response = await axios.get(`${API_BASE}/patients?limit=5`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch patients list');
    }

    const data = response.data.data;
    
    if (!data.patients || !Array.isArray(data.patients)) {
      throw new Error('Invalid patients data structure');
    }

    console.log(`   - Patients list retrieved`);
    console.log(`   - Patients count: ${data.patients.length}`);
    console.log(`   - Total patients: ${data.pagination.total}`);
  }

  async testInventoryList() {
    const response = await axios.get(`${API_BASE}/inventory/items?limit=5`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch inventory list');
    }

    const data = response.data.data;
    
    if (!Array.isArray(data)) {
      throw new Error('Inventory data is not an array');
    }

    console.log(`   - Inventory list retrieved`);
    console.log(`   - Items count: ${data.length}`);
  }

  async testLabTestsList() {
    const response = await axios.get(`${API_BASE}/lab-tests/available`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch lab tests list');
    }

    const data = response.data.data;
    
    if (!Array.isArray(data)) {
      throw new Error('Lab tests data is not an array');
    }

    console.log(`   - Lab tests list retrieved`);
    console.log(`   - Available tests: ${data.length}`);
  }

  async testUnauthorizedAccess() {
    // Test that non-admin endpoints are properly protected
    try {
      await axios.get(`${API_BASE}/admin/staff`, {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        }
      });
      throw new Error('Should have been rejected with invalid token');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(`   - Unauthorized access properly rejected (401)`);
      } else {
        throw new Error(`Unexpected error: ${error.message}`);
      }
    }
  }

  async runAllTests() {
    console.log('🏥 Admin Endpoints Test Suite');
    console.log('=============================');

    try {
      await this.authenticate();

      // Core admin functionality
      await this.runTest('Admin Dashboard', () => this.testAdminDashboard());
      await this.runTest('Staff Management', () => this.testStaffManagement());
      await this.runTest('Audit Logs', () => this.testAuditLogs());
      
      // System health and monitoring
      await this.runTest('System Health Check', () => this.testSystemHealth());
      await this.runTest('Sync Statistics', () => this.testSyncStats());
      await this.runTest('User Presence', () => this.testUserPresence());
      await this.runTest('Notifications', () => this.testNotifications());
      
      // Data access tests
      await this.runTest('Patients List', () => this.testPatientsList());
      await this.runTest('Inventory List', () => this.testInventoryList());
      await this.runTest('Lab Tests List', () => this.testLabTestsList());
      
      // Security tests
      await this.runTest('Unauthorized Access Protection', () => this.testUnauthorizedAccess());

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }

    // Print results
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All admin endpoint tests passed! System is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      process.exit(1);
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new AdminEndpointsTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test suite crashed:', error.message);
    process.exit(1);
  });
}

module.exports = AdminEndpointsTester;
