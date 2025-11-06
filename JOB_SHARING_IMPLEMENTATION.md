# Job Sharing Feature - Implementation Documentation

## Overview

The job sharing feature allows process serving companies to share jobs with trusted partners, creating a chain of assignments where each company only knows their direct client, not the original source. This maintains privacy while enabling efficient job distribution.

## Key Features

- **Auto-Assignment by ZIP Code**: Automatically share jobs with configured partners based on service address
- **Manual Job Sharing**: Search directory and send job share requests
- **Privacy Protection**: Each company only sees one level up (client) and one level down (server)
- **Partner Management**: Configure trusted partners with auto-assignment rules
- **Request Management**: Accept/decline incoming job share requests
- **Chain Tracking**: Full audit trail of job sharing history

## Database Schema

### 1. Companies Collection - Enhanced Fields

Add the following to existing company documents:

```javascript
{
  // ... existing fields ...

  job_share_partners: [
    {
      partner_company_id: string,           // Partner's company ID
      partner_company_name: string,         // Partner's company name
      partner_user_id: string,              // Primary user ID at partner company
      partner_type: string,                 // "independent_server" | "process_serving"
      relationship_status: string,          // "active" | "inactive" | "pending"
      established_at: timestamp,

      // Auto-assignment settings
      auto_assignment_enabled: boolean,
      auto_assignment_zones: [
        {
          zip_codes: string[],              // e.g., ["90210", "90211"]
          city: string,
          state: string,
          auto_assign_priority: number,      // 1 = highest priority
          default_fee: number,
          enabled: boolean
        }
      ],

      // Quick assign settings
      quick_assign_enabled: boolean,
      requires_acceptance: boolean,          // false = auto-accept
      email_notifications_enabled: boolean,

      // Stats
      total_jobs_shared: number,
      auto_assigned_count: number,
      acceptance_rate: number,
      last_shared_at: timestamp
    }
  ]
}
```

### 2. Jobs Collection - Enhanced Fields

Add the following to existing job documents:

```javascript
{
  // ... existing fields ...

  job_share_chain: {
    is_shared: boolean,

    // Current assignment
    currently_assigned_to_user_id: string,
    currently_assigned_to_company_id: string,

    // The complete chain
    chain: [
      {
        level: number,                       // 0 = original, 1 = first share, etc
        company_id: string,
        company_name: string,
        user_id: string,
        user_name: string,
        shared_with_company_id: string | null,
        shared_with_user_id: string | null,
        invoice_amount: number,
        shared_at: timestamp,
        accepted_at: timestamp,
        declined_at: timestamp | null,
        sees_client_as: string,              // Masked client name
        auto_assigned: boolean
      }
    ],

    total_levels: number
  }
}
```

### 3. New Collection: job_share_requests

```javascript
{
  request_id: string,                        // Auto-generated document ID
  job_id: string,

  // From
  requesting_company_id: string,
  requesting_user_id: string,
  requesting_company_name: string,

  // To
  target_company_id: string,
  target_user_id: string,
  target_company_name: string,

  // Request details
  status: string,                            // "pending" | "accepted" | "declined" | "expired"
  proposed_fee: number,
  final_fee: number,                         // Set when accepted (if negotiated)
  auto_assigned: boolean,

  // Expiration
  expires_in_hours: number | null,           // 1 | 24 | null
  expires_at: timestamp | null,

  // Job preview (what target sees)
  job_preview: {
    service_address: string,
    city: string,
    state: string,
    zip: string,
    due_date: string,
    service_type: string,
    documents_count: number,
    special_instructions: string
  },

  // Timestamps
  created_at: timestamp,
  responded_at: timestamp
}
```

### 4. Attempts Collection - Enhanced Fields

```javascript
{
  // ... existing fields ...

  // Add chain visibility
  visible_to_companies: string[],            // Array of all company IDs in chain
  chain_level_attempted_at: number,

  // Display names for each company
  server_name_display: {
    [company_id]: string                     // What each company sees
  }
}
```

## Cloud Functions

### 1. autoAssignJobOnCreate (Firestore Trigger)

**Trigger**: `jobs/{jobId}` onCreate
**Purpose**: Automatically assign jobs to partners based on ZIP code configuration

**Logic**:
1. Check if job has valid address and ZIP code
2. Get company's job_share_partners configuration
3. Find partners with auto_assignment_enabled for this ZIP
4. Sort by priority (lowest number = highest priority)
5. Create job_share_request
6. If requires_acceptance is false, immediately update job chain
7. Send email notification (if enabled)

**Location**: `/functions/index.js` (lines 1759-1885)

### 2. createJobShareRequest (Callable Function)

**Purpose**: Manually create a job share request

**Parameters**:
```javascript
{
  jobId: string,
  targetCompanyId: string,
  targetUserId: string,
  proposedFee: number,
  expiresInHours: number | null
}
```

**Logic**:
1. Validate authentication
2. Check job ownership/sharing rights
3. Get company details
4. Create job_share_request document
5. Send notification

**Location**: `/functions/index.js` (lines 1932-2046)

### 3. respondToShareRequest (Callable Function)

**Purpose**: Accept or decline a job share request

**Parameters**:
```javascript
{
  requestId: string,
  accept: boolean,
  counterFee: number | null
}
```

**Logic**:
1. Validate authentication and authorization
2. Check request status and expiration
3. If accepted:
   - Update request status
   - Build new chain entry
   - Update job with new chain level
   - Update assignments
4. If declined:
   - Update request status
5. Send notification

**Location**: `/functions/index.js` (lines 2048-2215)

## Frontend Components

### 1. DirectorySearch

**Location**: `/src/components/JobSharing/DirectorySearch.jsx`

**Purpose**: Search the directory and send job share requests

**Features**:
- ZIP code search
- Display search results with company details
- Configure fee and expiration
- Send share request

**Usage**:
```jsx
import { DirectorySearch } from '@/components/JobSharing';

<DirectorySearch
  jobId={jobId}
  jobZipCode={job.addresses[0].postal_code}
  onShareRequest={() => {
    // Callback after successful request
  }}
/>
```

### 2. PartnerManagement

**Location**: `/src/components/JobSharing/PartnerManagement.jsx`

**Purpose**: Manage trusted partners and auto-assignment rules

**Features**:
- List all job share partners
- View partner stats
- Configure auto-assignment zones
- Set default fees
- Toggle require acceptance
- Enable/disable email notifications

**Usage**:
```jsx
import { PartnerManagement } from '@/components/JobSharing';

<PartnerManagement
  companyId={currentCompanyId}
  partners={company.job_share_partners || []}
/>
```

### 3. PendingShareRequests

**Location**: `/src/components/JobSharing/PendingShareRequests.jsx`

**Purpose**: Display and respond to incoming job share requests

**Features**:
- Real-time updates via Firestore listener
- Display job preview
- Show expiration status
- Accept/decline requests
- Highlight expiring requests

**Usage**:
```jsx
import { PendingShareRequests } from '@/components/JobSharing';

<PendingShareRequests companyId={currentCompanyId} />
```

### 4. JobShareChain

**Location**: `/src/components/JobSharing/JobShareChain.jsx`

**Purpose**: Display the job sharing chain on job details page

**Features**:
- Privacy-aware display (only shows adjacent levels)
- Highlight current company
- Show client and server relationships
- Display fees and auto-assignment status

**Usage**:
```jsx
import { JobShareChain } from '@/components/JobSharing';

<JobShareChain
  job={jobData}
  currentCompanyId={currentCompanyId}
/>
```

## Security Rules

The following Firestore security rules have been added:

### Job Share Requests

```javascript
match /job_share_requests/{requestId} {
  // Users can only see requests to/from their company
  allow read: if isAuthenticated() && (
    resource.data.requesting_company_id == request.auth.token.company_id ||
    resource.data.target_company_id == request.auth.token.company_id
  );

  // Only requesting company can create
  allow create: if isAuthenticated() &&
    request.auth.token.company_id == request.resource.data.requesting_company_id;

  // Only target company can update (accept/decline)
  allow update: if isAuthenticated() &&
    request.auth.token.company_id == resource.data.target_company_id &&
    request.resource.data.status in ['accepted', 'declined'];
}
```

### Jobs (Enhanced)

```javascript
match /jobs/{jobId} {
  allow read: if isAuthenticated() && (
    resource.data.company_id == request.auth.token.company_id ||
    isInShareChain()
  );
}
```

### Attempts (Enhanced)

```javascript
match /attempts/{attemptId} {
  allow read: if isAuthenticated() && (
    resource.data.company_id == request.auth.token.company_id ||
    isVisibleToCompany()
  );
}
```

## Integration Guide

### Step 1: Add Components to Settings Page

Create a new "Job Sharing" section in your company settings:

```jsx
import { PartnerManagement } from '@/components/JobSharing';

// In your settings page
<PartnerManagement
  companyId={currentUser.company_id}
  partners={companyData.job_share_partners || []}
/>
```

### Step 2: Add to Dashboard

Show pending requests on the dashboard:

```jsx
import { PendingShareRequests } from '@/components/JobSharing';

// In your dashboard
<PendingShareRequests companyId={currentUser.company_id} />
```

### Step 3: Add to Job Details Page

Import the JobShareChain component in your job details page:

```jsx
import { JobShareChain } from '@/components/JobSharing';

// In JobDetails.jsx, add near the top of the job details section
<JobShareChain
  job={job}
  currentCompanyId={currentUser.company_id}
/>
```

### Step 4: Add Directory Search

Add a "Share Job" button to the job details page:

```jsx
import { DirectorySearch } from '@/components/JobSharing';

// Add a modal or drawer with DirectorySearch
<DirectorySearch
  jobId={job.id}
  jobZipCode={job.addresses[0].postal_code}
  onShareRequest={() => {
    // Refresh job data or show success message
  }}
/>
```

## Testing Checklist

- [ ] Auto-assignment triggers when creating a job in configured ZIP
- [ ] Manual job share request sends successfully
- [ ] Target company receives notification
- [ ] Accept request updates job chain correctly
- [ ] Decline request updates status
- [ ] Job details show correct chain information
- [ ] Privacy: companies can't see beyond adjacent levels
- [ ] Partner settings save correctly
- [ ] Expired requests are marked properly
- [ ] Attempts are visible to all companies in chain

## Future Enhancements

1. **Email Notifications**: Implement actual email service (currently console.log placeholders)
2. **SMS Notifications**: Add SMS alerts for urgent requests
3. **Counter Offers**: Allow target company to propose different fee
4. **Multi-ZIP Templates**: Save common ZIP zone configurations
5. **Partner Ratings**: Add rating system for partners
6. **Analytics Dashboard**: Track sharing metrics and partner performance
7. **Bulk Operations**: Share multiple jobs at once
8. **Smart Routing**: AI-powered partner suggestions

## Troubleshooting

### Jobs not auto-assigning

1. Check that partner has `auto_assignment_enabled: true`
2. Verify ZIP code is in `auto_assignment_zones[].zip_codes` array
3. Check that zone has `enabled: true`
4. Verify partner `relationship_status` is `"active"`

### Share requests not appearing

1. Check Firestore security rules
2. Verify `target_company_id` is correct
3. Check browser console for errors
4. Ensure user has proper authentication token

### Chain not displaying

1. Verify `job.job_share_chain.is_shared` is true
2. Check that `currentCompanyId` is in the chain
3. Verify security rules allow reading the job

## Support

For issues or questions about the job sharing feature, please refer to:
- Cloud Function logs in Firebase Console
- Firestore security rules debugger
- Browser console for frontend errors

---

**Implementation Date**: 2025-11-06
**Version**: 1.0.0
**Status**: Complete
