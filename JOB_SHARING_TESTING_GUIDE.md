# Job Sharing Feature - Testing Guide

## Prerequisites

Before testing, ensure:
- [ ] Firebase project is set up
- [ ] Cloud Functions are deployed
- [ ] Firestore rules are deployed
- [ ] You have at least 2 test company accounts

## Quick Setup

### 1. Deploy Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

Expected output:
```
✔  functions[autoAssignJobOnCreate] Successful create operation.
✔  functions[createJobShareRequest] Successful create operation.
✔  functions[respondToShareRequest] Successful create operation.
```

### 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Expected output:
```
✔  firestore: rules file firestore.rules compiled successfully
```

### 3. Verify Deployment

```bash
firebase functions:list
```

You should see:
- `autoAssignJobOnCreate`
- `createJobShareRequest`
- `respondToShareRequest`

## Test Scenarios

## Scenario 1: Auto-Assignment Test

**Goal**: Verify that jobs are automatically shared with partners based on ZIP code

### Setup Test Data

1. **Create Company A** (The client/originator)
   - Login to Firebase Console → Firestore
   - Go to `companies` collection
   - Find or create a company document
   - Note the `company_id`

2. **Create Company B** (The partner)
   - Create another company document
   - Note the `company_id`

3. **Configure Partner Relationship**
   - Edit Company A's document
   - Add the following to `job_share_partners` array:

```json
{
  "partner_company_id": "COMPANY_B_ID",
  "partner_company_name": "Test Partner B",
  "partner_user_id": "USER_B_ID",
  "partner_type": "process_serving",
  "relationship_status": "active",
  "established_at": "2025-11-07T00:00:00Z",

  "auto_assignment_enabled": true,
  "auto_assignment_zones": [
    {
      "zip_codes": ["90210", "90211", "90212"],
      "city": "Beverly Hills",
      "state": "CA",
      "auto_assign_priority": 1,
      "default_fee": 75.00,
      "enabled": true
    }
  ],

  "requires_acceptance": false,
  "email_notifications_enabled": true,

  "total_jobs_shared": 0,
  "auto_assigned_count": 0,
  "acceptance_rate": 0
}
```

### Test Steps

1. **Login as Company A**
2. **Create a new job** with:
   - Service address in 90210 ZIP code
   - Example: "123 Beverly Dr, Beverly Hills, CA 90210"
3. **Wait 2-3 seconds** for the Cloud Function to trigger

### Expected Results

✅ **Check Firebase Console → Firestore**:
- A new document appears in `job_share_requests` collection
- `status` should be `"accepted"` (because `requires_acceptance: false`)
- `auto_assigned` should be `true`

✅ **Check the job document**:
```json
{
  "job_share_chain": {
    "is_shared": true,
    "currently_assigned_to_user_id": "USER_B_ID",
    "currently_assigned_to_company_id": "COMPANY_B_ID",
    "chain": [
      {
        "level": 0,
        "company_id": "COMPANY_A_ID",
        // ... Company A details
      },
      {
        "level": 1,
        "company_id": "COMPANY_B_ID",
        // ... Company B details
      }
    ],
    "total_levels": 1
  }
}
```

✅ **Check Cloud Function Logs**:
```bash
firebase functions:log --only autoAssignJobOnCreate
```

You should see:
```
Job {jobId}: Checking auto-assignment for zip 90210
Job {jobId}: Auto-assigning to Test Partner B
Job {jobId}: Created share request {requestId}
Job {jobId}: Auto-accepted and job updated
```

### Troubleshooting

❌ **Job not auto-assigned**:
- Check ZIP code is exactly in the array: `["90210", "90211", "90212"]`
- Verify `auto_assignment_enabled: true`
- Check zone `enabled: true`
- Verify `relationship_status: "active"`
- Check Cloud Function logs for errors

---

## Scenario 2: Manual Sharing with Acceptance Required

**Goal**: Test manual job sharing where partner must accept

### Setup Test Data

1. **Update Partner Configuration** (Company A's partner list)
   - Set `requires_acceptance: true`

```json
{
  "partner_company_id": "COMPANY_C_ID",
  "partner_company_name": "Test Partner C",
  "partner_user_id": "USER_C_ID",
  "partner_type": "independent_server",
  "relationship_status": "active",
  "established_at": "2025-11-07T00:00:00Z",

  "auto_assignment_enabled": false,
  "requires_acceptance": true,
  "email_notifications_enabled": true,

  "total_jobs_shared": 0,
  "acceptance_rate": 0
}
```

### Test Steps

1. **Login as Company A**
2. **Navigate to a job** (not yet shared)
3. **Click "Share Job" button**
4. **Use DirectorySearch component**:
   - Enter ZIP code: "90210"
   - Click "Search"
   - Select a company from results
   - Enter fee: $75
   - Select expiration: "24 Hours"
   - Click "Send Request"

### Expected Results

✅ **Share Request Created**:
- New document in `job_share_requests` with `status: "pending"`
- Alert: "Job share request sent successfully!"

✅ **Login as Company C** (the target)
- Navigate to dashboard
- See pending request in `PendingShareRequests` component
- Request shows:
  - From: Company A
  - Service address
  - Proposed fee: $75
  - Expires in 24 hours

✅ **Accept the Request**:
- Click "Accept Job" button
- Alert: "Job share accepted successfully!"
- Request disappears from pending list

✅ **Check Job Document**:
- `job_share_chain.is_shared: true`
- `job_share_chain.currently_assigned_to_company_id` = Company C ID
- Chain has 2 entries (Company A at level 0, Company C at level 1)

✅ **Check as Company A**:
- Job now shows as "shared" with Company C
- `JobShareChain` component shows the relationship

---

## Scenario 3: Decline Share Request

**Goal**: Test declining a job share request

### Test Steps

1. **Create a share request** (following Scenario 2)
2. **Login as target company**
3. **In PendingShareRequests**:
   - Click "Decline" button

### Expected Results

✅ Request document updated:
- `status: "declined"`
- `responded_at` timestamp added

✅ Job document unchanged:
- No `job_share_chain` added
- Still assigned to original company

---

## Scenario 4: Privacy & Chain Visibility

**Goal**: Verify that companies only see adjacent chain levels

### Setup: Create 3-Level Chain

1. **Company A** shares job with **Company B** (accepted)
2. **Company B** shares same job with **Company C** (accepted)

### Test Steps

1. **Login as Company A**:
   - View job details
   - Check `JobShareChain` component

2. **Login as Company B**:
   - View same job
   - Check `JobShareChain` component

3. **Login as Company C**:
   - View same job
   - Check `JobShareChain` component

### Expected Results

✅ **Company A sees**:
- Level 0: You (Company A)
- Level 1: Company B (Your Server)
- Does NOT see Company C

✅ **Company B sees**:
- Level 0: Company A (Your Client)
- Level 1: You (Company B)
- Level 2: Company C (Your Server)

✅ **Company C sees**:
- Level 1: Company B (Your Client)
- Level 2: You (Company C)
- Does NOT see Company A

✅ **Client Name Masking**:
- Company B sees client as "Company A - Process Serving" (not original client)
- Company C sees client as "Company B - Process Serving"

---

## Scenario 5: Partner Management UI

**Goal**: Test partner configuration interface

### Test Steps

1. **Login as Company A**
2. **Navigate to Settings → Job Sharing** (you'll need to add this route)
3. **Use PartnerManagement component**:
   - View list of partners
   - Click "Edit Settings" on a partner
   - Toggle "Enable Auto-Assignment"
   - Enter ZIP codes: "90210, 90211, 90212"
   - Set default fee: $75
   - Toggle "Require Acceptance"
   - Click "Save Settings"

### Expected Results

✅ Company document updated in Firestore
✅ Partner settings persist after page reload
✅ Auto-assignment works with new settings

---

## Scenario 6: Expired Requests

**Goal**: Test request expiration handling

### Test Steps

1. **Create share request with 1-hour expiration**
2. **Manually update Firestore**:
   - Set `expires_at` to a past timestamp
3. **Login as target company**
4. **Try to accept the expired request**

### Expected Results

✅ Request marked as "Expired" with badge
✅ Accept button disabled
✅ Error message: "Request has expired"

---

## Scenario 7: Security Rules Test

**Goal**: Verify Firestore security rules work correctly

### Test with Firebase Emulator

```bash
firebase emulators:start --only firestore
```

### Test Cases

1. **Job Read Access**:
   - ✅ Company in chain can read job
   - ❌ Company NOT in chain cannot read job

2. **Share Request Access**:
   - ✅ Requesting company can read their requests
   - ✅ Target company can read requests sent to them
   - ❌ Third-party company cannot read requests

3. **Attempt Visibility**:
   - ✅ All companies in chain can read attempts
   - ❌ Companies not in chain cannot read attempts

---

## Component Testing Page

Create a test page to see all components at once:

### Create: `src/pages/JobSharingTest.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/hooks/useAuth'; // Adjust based on your auth setup
import {
  DirectorySearch,
  PartnerManagement,
  PendingShareRequests,
  JobShareChain
} from '@/components/JobSharing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const JobSharingTest = () => {
  const { currentUser } = useAuth();
  const [company, setCompany] = useState(null);
  const [testJob, setTestJob] = useState({
    id: 'test-job-1',
    addresses: [{ postal_code: '90210' }],
    job_share_chain: {
      is_shared: true,
      currently_assigned_to_company_id: currentUser?.company_id,
      chain: [
        {
          level: 0,
          company_id: 'company-a',
          company_name: 'Test Company A',
          sees_client_as: 'Original Client LLC',
          invoice_amount: 100
        },
        {
          level: 1,
          company_id: currentUser?.company_id,
          company_name: 'Your Company',
          sees_client_as: 'Test Company A - Process Serving',
          invoice_amount: 75
        }
      ],
      total_levels: 1
    }
  });

  useEffect(() => {
    const loadCompany = async () => {
      if (currentUser?.company_id) {
        const companyDoc = await getDoc(doc(db, 'companies', currentUser.company_id));
        if (companyDoc.exists()) {
          setCompany(companyDoc.data());
        }
      }
    };
    loadCompany();
  }, [currentUser]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Job Sharing Feature - Test Page</h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending Requests</TabsTrigger>
          <TabsTrigger value="partners">Partner Management</TabsTrigger>
          <TabsTrigger value="search">Directory Search</TabsTrigger>
          <TabsTrigger value="chain">Job Chain Display</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PendingShareRequests companyId={currentUser?.company_id} />
        </TabsContent>

        <TabsContent value="partners">
          <PartnerManagement
            companyId={currentUser?.company_id}
            partners={company?.job_share_partners || []}
          />
        </TabsContent>

        <TabsContent value="search">
          <DirectorySearch
            jobId="test-job-123"
            jobZipCode="90210"
            onShareRequest={() => alert('Share request sent!')}
          />
        </TabsContent>

        <TabsContent value="chain">
          <JobShareChain
            job={testJob}
            currentCompanyId={currentUser?.company_id}
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-slate-100 p-4 rounded overflow-auto">
            {JSON.stringify({
              currentUser: currentUser?.uid,
              companyId: currentUser?.company_id,
              partnersCount: company?.job_share_partners?.length || 0
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobSharingTest;
```

### Add Route

In your router configuration:
```jsx
import JobSharingTest from '@/pages/JobSharingTest';

// Add to routes
{
  path: '/test/job-sharing',
  element: <JobSharingTest />
}
```

---

## Verification Checklist

### Cloud Functions
- [ ] Functions deployed without errors
- [ ] Functions appear in Firebase Console
- [ ] Logs show function executions
- [ ] No permission errors in logs

### Firestore
- [ ] `job_share_requests` collection created
- [ ] Documents have correct schema
- [ ] Security rules allow proper access
- [ ] Security rules deny unauthorized access

### Frontend Components
- [ ] DirectorySearch renders and searches
- [ ] PartnerManagement displays partners
- [ ] PendingShareRequests shows real-time updates
- [ ] JobShareChain displays chain correctly

### Auto-Assignment
- [ ] Job in configured ZIP triggers assignment
- [ ] Share request created automatically
- [ ] Job chain updated correctly
- [ ] Logs show successful execution

### Manual Sharing
- [ ] Can search directory
- [ ] Can send share request
- [ ] Target receives notification
- [ ] Can accept/decline

### Privacy
- [ ] Companies only see adjacent levels
- [ ] Client names properly masked
- [ ] Unauthorized access denied

---

## Common Issues & Solutions

### Issue: Cloud Function Not Triggering

**Check**:
```bash
firebase functions:log --only autoAssignJobOnCreate --limit 50
```

**Solution**:
- Ensure function is deployed
- Check ZIP code exact match (case-sensitive, spacing)
- Verify trigger path: `jobs/{jobId}`

### Issue: "Permission Denied" in Firestore

**Check**: Firestore Rules tab in Firebase Console

**Solution**:
- Redeploy security rules
- Check authentication token has `company_id`
- Verify user is in chain

### Issue: Components Not Rendering

**Check**: Browser console for errors

**Solution**:
- Verify imports are correct
- Check Firebase config is initialized
- Ensure UI components exist (card, button, etc.)

### Issue: Real-time Updates Not Working

**Check**: Firestore listeners

**Solution**:
- Check network tab for WebSocket connection
- Verify Firestore rules allow read access
- Check company_id matches query filter

---

## Performance Testing

### Load Test: Multiple Auto-Assignments

1. Create 10 jobs simultaneously with auto-assign ZIP
2. Monitor Cloud Function execution times
3. Check for rate limiting or errors

**Expected**: All jobs assigned within 5 seconds

### Load Test: Many Pending Requests

1. Create 20+ pending requests
2. Check UI performance
3. Monitor Firestore read counts

**Expected**: UI remains responsive, requests paginated

---

## Next Steps After Testing

1. ✅ All tests pass → Ready for production
2. ⚠️ Some tests fail → Review logs and fix issues
3. 📧 Add email service integration
4. 📱 Add SMS notifications (optional)
5. 📊 Add analytics tracking
6. 🎨 Refine UI/UX based on feedback

---

**Last Updated**: 2025-11-06
**Version**: 1.0.0
