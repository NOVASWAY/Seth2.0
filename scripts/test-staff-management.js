#!/usr/bin/env node

/**
 * Staff Management System Test Script
 * Tests all staff management endpoints and functionality
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

class StaffManagementTester {
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

  async testStaffList() {
    const response = await axios.get(`${API_BASE}/admin/staff`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch staff list');
    }

    const { staff, stats } = response.data.data;
    
    if (!Array.isArray(staff)) {
      throw new Error('Staff data is not an array');
    }

    if (typeof stats !== 'object' || !stats.total) {
      throw new Error('Invalid statistics data');
    }

    console.log(`   - Found ${staff.length} staff members`);
    console.log(`   - Total: ${stats.total}, Active: ${stats.active}, Locked: ${stats.locked}`);
  }

  async testStaffCredentials() {
    // First get staff list to get a user ID
    const staffResponse = await axios.get(`${API_BASE}/admin/staff`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!staffResponse.data.success || staffResponse.data.data.staff.length === 0) {
      throw new Error('No staff members found to test credentials');
    }

    const firstUser = staffResponse.data.data.staff[0];
    
    const response = await axios.get(`${API_BASE}/admin/staff/${firstUser.id}/credentials`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch user credentials');
    }

    const userData = response.data.data;
    if (!userData.username || !userData.role) {
      throw new Error('Invalid user credentials data');
    }

    console.log(`   - Retrieved credentials for: ${userData.username} (${userData.role})`);
  }

  async testAuditLogs() {
    const response = await axios.get(`${API_BASE}/admin/audit-logs?limit=5`, {
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

    if (!pagination || typeof pagination.total !== 'number') {
      throw new Error('Invalid pagination data');
    }

    console.log(`   - Found ${logs.length} recent audit logs (Total: ${pagination.total})`);
  }

  async testStaffUnlock() {
    // First get staff list to find a locked user (if any)
    const staffResponse = await axios.get(`${API_BASE}/admin/staff`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!staffResponse.data.success) {
      throw new Error('Failed to fetch staff list for unlock test');
    }

    const lockedUsers = staffResponse.data.data.staff.filter(user => user.isLocked);
    
    if (lockedUsers.length === 0) {
      console.log('   - No locked users found to test unlock functionality');
      return;
    }

    const testUser = lockedUsers[0];
    
    const response = await axios.post(`${API_BASE}/admin/staff/${testUser.id}/unlock`, {}, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to unlock user account');
    }

    console.log(`   - Successfully unlocked user: ${testUser.username}`);
  }

  async testStaffStatusToggle() {
    // Get staff list to find an active user (not the current admin)
    const staffResponse = await axios.get(`${API_BASE}/admin/staff`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!staffResponse.data.success) {
      throw new Error('Failed to fetch staff list for status toggle test');
    }

    // Find a non-admin user to test with
    const testUsers = staffResponse.data.data.staff.filter(user => 
      user.role !== 'ADMIN' && user.isActive
    );
    
    if (testUsers.length === 0) {
      console.log('   - No non-admin users found to test status toggle');
      return;
    }

    const testUser = testUsers[0];
    
    // Deactivate user
    const deactivateResponse = await axios.post(`${API_BASE}/admin/staff/${testUser.id}/toggle-status`, {
      isActive: false
    }, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!deactivateResponse.data.success) {
      throw new Error('Failed to deactivate user');
    }

    console.log(`   - Successfully deactivated user: ${testUser.username}`);

    // Reactivate user
    const activateResponse = await axios.post(`${API_BASE}/admin/staff/${testUser.id}/toggle-status`, {
      isActive: true
    }, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!activateResponse.data.success) {
      throw new Error('Failed to reactivate user');
    }

    console.log(`   - Successfully reactivated user: ${testUser.username}`);
  }

  async testPasswordReset() {
    // Get staff list to find a user to reset password for
    const staffResponse = await axios.get(`${API_BASE}/admin/staff`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!staffResponse.data.success) {
      throw new Error('Failed to fetch staff list for password reset test');
    }

    // Find a non-admin user to test with
    const testUsers = staffResponse.data.data.staff.filter(user => user.role !== 'ADMIN');
    
    if (testUsers.length === 0) {
      console.log('   - No non-admin users found to test password reset');
      return;
    }

    const testUser = testUsers[0];
    
    const response = await axios.post(`${API_BASE}/admin/staff/${testUser.id}/reset-password`, {}, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to reset user password');
    }

    const { tempPassword, username } = response.data.data;
    console.log(`   - Successfully reset password for: ${username}`);
    console.log(`   - Temporary password: ${tempPassword}`);
  }

  async runAllTests() {
    console.log('🏥 Staff Management System Test Suite');
    console.log('=====================================');

    try {
      await this.authenticate();

      await this.runTest('Staff List Retrieval', () => this.testStaffList());
      await this.runTest('Staff Credentials Viewing', () => this.testStaffCredentials());
      await this.runTest('Audit Logs Retrieval', () => this.testAuditLogs());
      await this.runTest('Staff Account Unlock', () => this.testStaffUnlock());
      await this.runTest('Staff Status Toggle', () => this.testStaffStatusToggle());
      await this.runTest('Password Reset', () => this.testPasswordReset());

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
      console.log('\n🎉 All tests passed! Staff management system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      process.exit(1);
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new StaffManagementTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test suite crashed:', error.message);
    process.exit(1);
  });
}

module.exports = StaffManagementTester;
