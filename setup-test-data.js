/**
 * Test Data Setup Script for Job Sharing Feature
 *
 * This script creates test companies with partner relationships
 * to test the job sharing feature.
 *
 * Usage:
 *   node setup-test-data.js
 *
 * Or run from npm:
 *   npm run setup-test-data
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// Make sure you have your service account key
// Download from: Firebase Console → Project Settings → Service Accounts
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Test Data Configuration
const TEST_COMPANIES = {
  companyA: {
    id: 'test-company-a',
    name: 'Alpha Process Serving',
    email: 'alpha@test.com',
    phone: '555-0100',
    company_type: 'process_serving',
    addresses: [{
      label: 'Primary',
      address1: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      postal_code: '90001',
      primary: true
    }],
    owner_id: 'user-a',
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  companyB: {
    id: 'test-company-b',
    name: 'Beta Process Serving',
    email: 'beta@test.com',
    phone: '555-0200',
    company_type: 'process_serving',
    addresses: [{
      label: 'Primary',
      address1: '456 Beverly Blvd',
      city: 'Beverly Hills',
      state: 'CA',
      postal_code: '90210',
      primary: true
    }],
    owner_id: 'user-b',
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  companyC: {
    id: 'test-company-c',
    name: 'Charlie Independent Servers',
    email: 'charlie@test.com',
    phone: '555-0300',
    company_type: 'independent_contractor',
    addresses: [{
      label: 'Primary',
      address1: '789 Hollywood Blvd',
      city: 'Hollywood',
      state: 'CA',
      postal_code: '90028',
      primary: true
    }],
    owner_id: 'user-c',
    created_at: admin.firestore.FieldValue.serverTimestamp()
  }
};

async function setupTestData() {
  console.log('🚀 Starting test data setup...\n');

  try {
    // Step 1: Create Test Companies
    console.log('📋 Step 1: Creating test companies...');

    for (const [key, company] of Object.entries(TEST_COMPANIES)) {
      const { id, ...data } = company;
      await db.collection('companies').doc(id).set(data, { merge: true });
      console.log(`✅ Created ${data.name} (${id})`);
    }

    // Step 2: Configure Partner Relationships
    console.log('\n🤝 Step 2: Configuring partner relationships...');

    // Company A shares with Company B (auto-assign, no acceptance required)
    await db.collection('companies').doc('test-company-a').update({
      job_share_partners: admin.firestore.FieldValue.arrayUnion({
        partner_company_id: 'test-company-b',
        partner_company_name: 'Beta Process Serving',
        partner_user_id: 'user-b',
        partner_type: 'process_serving',
        relationship_status: 'active',
        established_at: admin.firestore.Timestamp.now(),

        auto_assignment_enabled: true,
        auto_assignment_zones: [{
          zip_codes: ['90210', '90211', '90212'],
          city: 'Beverly Hills',
          state: 'CA',
          auto_assign_priority: 1,
          default_fee: 75.00,
          enabled: true
        }],

        requires_acceptance: false,
        email_notifications_enabled: true,

        total_jobs_shared: 0,
        auto_assigned_count: 0,
        acceptance_rate: 0,
        last_shared_at: null
      })
    });
    console.log('✅ Company A → Company B (auto-assign, auto-accept)');

    // Company A can also share with Company C (requires acceptance)
    await db.collection('companies').doc('test-company-a').update({
      job_share_partners: admin.firestore.FieldValue.arrayUnion({
        partner_company_id: 'test-company-c',
        partner_company_name: 'Charlie Independent Servers',
        partner_user_id: 'user-c',
        partner_type: 'independent_contractor',
        relationship_status: 'active',
        established_at: admin.firestore.Timestamp.now(),

        auto_assignment_enabled: false,
        auto_assignment_zones: [],

        requires_acceptance: true,
        email_notifications_enabled: true,

        total_jobs_shared: 0,
        acceptance_rate: 0,
        last_shared_at: null
      })
    });
    console.log('✅ Company A → Company C (manual, requires acceptance)');

    // Company B can share with Company C
    await db.collection('companies').doc('test-company-b').update({
      job_share_partners: admin.firestore.FieldValue.arrayUnion({
        partner_company_id: 'test-company-c',
        partner_company_name: 'Charlie Independent Servers',
        partner_user_id: 'user-c',
        partner_type: 'independent_contractor',
        relationship_status: 'active',
        established_at: admin.firestore.Timestamp.now(),

        auto_assignment_enabled: true,
        auto_assignment_zones: [{
          zip_codes: ['90028'],
          city: 'Hollywood',
          state: 'CA',
          auto_assign_priority: 1,
          default_fee: 50.00,
          enabled: true
        }],

        requires_acceptance: false,
        email_notifications_enabled: true,

        total_jobs_shared: 0,
        auto_assigned_count: 0,
        acceptance_rate: 0,
        last_shared_at: null
      })
    });
    console.log('✅ Company B → Company C (auto-assign, auto-accept)');

    // Step 3: Create Test Job
    console.log('\n📄 Step 3: Creating test job...');

    const testJob = {
      company_id: 'test-company-a',
      company_name: 'Alpha Process Serving',
      created_by: 'user-a',
      created_by_name: 'Test User A',
      client_name: 'Test Client LLC',

      addresses: [{
        label: 'Service Address',
        address1: '123 Beverly Dr',
        city: 'Beverly Hills',
        state: 'CA',
        postal_code: '90210',
        lat: 34.0736,
        lng: -118.4004,
        primary: true
      }],

      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      service_type: 'standard',
      service_instructions: 'Test job for auto-assignment feature',

      status: 'pending',
      priority: 'standard',

      service_fee: 100.00,
      total_fee: 100.00,

      documents: [],

      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const jobRef = await db.collection('jobs').add(testJob);
    console.log(`✅ Created test job: ${jobRef.id}`);
    console.log('   This should trigger auto-assignment to Company B');

    // Step 4: Add some directory entries
    console.log('\n📂 Step 4: Creating directory entries...');

    const directoryEntries = [
      {
        company_id: 'test-company-b',
        name: 'Beta Process Serving',
        email: 'beta@test.com',
        phone: '555-0200',
        zip: '90210',
        city: 'Beverly Hills',
        state: 'CA',
        service_radius_miles: 25,
        is_active: true,
        rates: {
          standard_service: 75.00,
          rush_service: 125.00
        },
        created_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        company_id: 'test-company-c',
        name: 'Charlie Independent Servers',
        email: 'charlie@test.com',
        phone: '555-0300',
        zip: '90210',
        city: 'Beverly Hills',
        state: 'CA',
        service_radius_miles: 50,
        is_active: true,
        rates: {
          standard_service: 60.00,
          rush_service: 100.00
        },
        created_at: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const entry of directoryEntries) {
      await db.collection('directory').add(entry);
      console.log(`✅ Added ${entry.name} to directory`);
    }

    // Step 5: Create a manual share request for testing
    console.log('\n📬 Step 5: Creating test share request...');

    const shareRequest = {
      job_id: jobRef.id,
      requesting_company_id: 'test-company-a',
      requesting_user_id: 'user-a',
      requesting_company_name: 'Alpha Process Serving',
      target_company_id: 'test-company-c',
      target_user_id: 'user-c',
      target_company_name: 'Charlie Independent Servers',
      status: 'pending',
      proposed_fee: 60.00,
      auto_assigned: false,
      expires_in_hours: 24,
      expires_at: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      ),
      job_preview: {
        service_address: '123 Beverly Dr',
        city: 'Beverly Hills',
        state: 'CA',
        zip: '90210',
        due_date: testJob.due_date,
        service_type: 'standard',
        documents_count: 0,
        special_instructions: 'Test manual share request'
      },
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const requestRef = await db.collection('job_share_requests').add(shareRequest);
    console.log(`✅ Created share request: ${requestRef.id}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ Test data setup complete!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log('  • 3 test companies created');
    console.log('  • 3 partner relationships configured');
    console.log('  • 1 test job created (should auto-assign)');
    console.log('  • 2 directory entries added');
    console.log('  • 1 manual share request created');

    console.log('\n🧪 Test Scenarios:');
    console.log('  1. Auto-Assignment Test:');
    console.log('     - Check Cloud Function logs for auto-assignment');
    console.log('     - Verify job has job_share_chain');
    console.log('     - Check job_share_requests collection');

    console.log('\n  2. Manual Sharing Test:');
    console.log('     - Login as Company C (test-company-c)');
    console.log('     - View pending requests dashboard');
    console.log('     - Accept/decline the share request');

    console.log('\n  3. Directory Search Test:');
    console.log('     - Search for ZIP 90210');
    console.log('     - Should find 2 companies');
    console.log('     - Send share request to one');

    console.log('\n  4. Partner Management Test:');
    console.log('     - Login as Company A (test-company-a)');
    console.log('     - View partner settings');
    console.log('     - Edit auto-assignment zones');

    console.log('\n🔗 Test IDs:');
    console.log(`  Company A: test-company-a`);
    console.log(`  Company B: test-company-b`);
    console.log(`  Company C: test-company-c`);
    console.log(`  Test Job:  ${jobRef.id}`);
    console.log(`  Share Req: ${requestRef.id}`);

    console.log('\n📝 Next Steps:');
    console.log('  1. Deploy Cloud Functions: firebase deploy --only functions');
    console.log('  2. Deploy Firestore Rules: firebase deploy --only firestore:rules');
    console.log('  3. Check Cloud Function logs: firebase functions:log');
    console.log('  4. Navigate to /test/job-sharing in your app');
    console.log('  5. Follow the testing guide: JOB_SHARING_TESTING_GUIDE.md');

    console.log('\n');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the setup
setupTestData();
