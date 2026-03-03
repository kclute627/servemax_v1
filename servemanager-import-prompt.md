# Prompt: Build ServeManager Data Import Feature for Diligence

## Context

I am building a process serving management application called **Diligence** that competes with ServeManager. To reduce the barrier to switching, I want users to be able to import their historical data from ServeManager into Diligence as a **read-only archive**.

The tech stack is:
- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: Google Firebase (Firestore, Firebase Auth, Cloud Functions, Cloud Tasks)

---

## Feature Overview

Users should be able to:
1. Go to Settings → Data Import
2. Enter their ServeManager API key
3. Click "Start Import"
4. Receive an email when the import is complete (could take hours for large accounts)
5. View their imported ServeManager data in a read-only "Legacy Jobs" section
6. Search and filter their legacy data
7. View job details, attempts, notes, documents, invoices
8. Print/download documents and invoices from the legacy archive

**Users should NOT be able to:**
- Edit any imported data
- Create new attempts, notes, or affidavits on legacy jobs
- Mark legacy invoices as paid
- Send legacy jobs to servers
- Interact with legacy data in any way that modifies it

This is purely an **archive/reference** feature so users can look up historical information.

---

## ServeManager API Overview

ServeManager provides a RESTful JSON API. Full documentation: https://www.servemanager.com/api

### Authentication
- HTTP Basic Auth
- API key as username, empty password, base64-encoded
- User generates API key in ServeManager: My Account → Settings → Integrations
- All requests require HTTPS
- Header: `Authorization: Basic base64(api_key:)`
- Header: `Content-Type: application/json`

### Base URL
```
https://www.servemanager.com/api/
```

### Pagination
- All list endpoints return paginated results
- Response includes `links` object with: `self`, `first`, `last`, `prev`, `next`
- Use `?per_page=100` for maximum results per request (100 is the max)
- Follow `next` link until it's `null` to get all records

### Rate Limiting
- ServeManager has rate limits (not explicitly documented)
- Implement exponential backoff on 429 responses
- Add delays between requests (1-2 seconds) to be respectful

---

## API Endpoints to Use

### Account Info
```
GET /api/account
```
Returns company info, monthly quota, address. Use to verify API key is valid and get account details.

### Employees
```
GET /api/employees
GET /api/employees/:id
```
Returns list of employees (internal team members).

### Companies (Address Book)
```
GET /api/companies?per_page=100
GET /api/companies/:id
```
Returns all companies in their address book with:
- name, type, website
- addresses (array)
- phone_numbers (array)
- email_addresses (array)
- contacts (array of people at the company)

### Courts
```
GET /api/courts?per_page=100
GET /api/courts/:id
```
Returns court directory.

### Court Cases
```
GET /api/court_cases?per_page=100
GET /api/court_cases/:id
```
Returns court cases with plaintiff, defendant, case number, dates.

### Jobs (Most Important)
```
GET /api/jobs?per_page=100
GET /api/jobs/:id
```

The jobs endpoint returns comprehensive data including:
- Job details (status, dates, recipient, addresses)
- Client company and contact (embedded)
- Process server company and contact (embedded)
- Court case reference
- Service instructions
- Server acceptance status

**Important fields:**
- `id` — internal API ID (use for API calls only)
- `servemanager_job_number` — user-facing job number (display this to users)
- `job_status` — workflow status
- `service_status` — Served, Non-Service, Attempted, null
- `recipient` — object with name, physical description
- `addresses` — array of service addresses
- `documents_to_be_served` — array with download URLs
- `misc_attachments` — array with download URLs  
- `affidavits` — array with download URLs and signature status
- `attempts` — array of service attempts (embedded in job response)
- `invoice` — embedded invoice with line items and payments

### Job Details (for attempts, notes, documents)
When fetching individual jobs, the response includes:
- `attempts` array with: description, GPS coords, timestamp, success, serve_type, attachments
- `documents_to_be_served` array with: title, file info, download URL
- `misc_attachments` array with: title, file info, download URL
- `affidavits` array with: reference_number, download URL, signed status
- `invoice` object with: line_items, payments, totals

### Notes
```
GET /api/jobs/:job_id/notes
GET /api/notes (all notes across jobs)
```
Returns notes with body, label, timestamps, visibility.

### Invoices
```
GET /api/jobs/:job_id/invoices
```
Returns invoices with line items, payments, balance.

---

## Data Model: Legacy Collections

Store imported data in **separate Firestore collections** prefixed with `legacy_`. This keeps imported data completely isolated from the main Diligence data model, allowing us to evolve the Diligence schema without breaking legacy data.

### `legacy_imports/{importId}`
Tracks each import operation.
```typescript
{
  id: string;                          // Auto-generated
  accountId: string;                   // Diligence account that initiated import
  userId: string;                      // User who initiated import
  source: "servemanager";              // For future: could support other imports
  status: "pending" | "in_progress" | "completed" | "failed";
  
  // Progress tracking
  progress: {
    totalJobs: number | null;          // null until we know the count
    importedJobs: number;
    totalCompanies: number | null;
    importedCompanies: number;
    totalCourtCases: number | null;
    importedCourtCases: number;
    currentStep: "account" | "employees" | "companies" | "courts" | "court_cases" | "jobs" | "complete";
  };
  
  // Stats (populated on completion)
  stats: {
    jobsImported: number;
    companiesImported: number;
    courtCasesImported: number;
    courtsImported: number;
    employeesImported: number;
    documentsReferenced: number;       // Count of document URLs stored
    invoicesImported: number;
    attemptsImported: number;
    notesImported: number;
  };
  
  // Timestamps
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  
  // Error tracking
  errors: Array<{
    timestamp: Timestamp;
    step: string;
    message: string;
    jobId?: string;                    // If error was on a specific job
  }>;
  
  // ServeManager account info (from /api/account)
  serveManagerAccount: {
    companyName: string;
    monthlyQuota: number;
    // ... other account fields
  };
}
```

### `legacy_imports/{importId}/credentials`
Stored separately with tighter security rules. Encrypted at rest.
```typescript
{
  apiKey: string;                      // ServeManager API key (encrypted)
  validatedAt: Timestamp;              // When we verified it works
}
```

### `legacy_jobs/{jobId}`
Stores imported jobs. **Preserve ServeManager's schema exactly** — do not transform.
```typescript
{
  // Diligence metadata
  _importId: string;                   // Reference to the import operation
  _accountId: string;                  // Diligence account that owns this
  _importedAt: Timestamp;              // When this record was imported
  _serveManagerId: number;             // Original ServeManager job.id (API ID)
  
  // Everything below is preserved exactly as returned from ServeManager API
  servemanager_job_number: string;     // User-facing job number
  job_status: string;
  service_status: string | null;
  created_at: string;                  // ISO date string
  updated_at: string;
  archived_at: string | null;
  due_date: string | null;
  rush: boolean;
  service_instructions: string | null;
  instructions_from_client: string | null;
  client_job_number: string | null;
  
  recipient: {
    name: string;
    description: string | null;
    age: string | null;
    ethnicity: string | null;
    gender: string | null;
    weight: string | null;
    height: string | null;
    hair: string | null;
    eyes: string | null;
  };
  
  addresses: Array<{
    label: string;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    postal_code: string;
    county: string | null;
    lat: number | null;
    lng: number | null;
    primary: boolean;
  }>;
  
  // Embedded company/contact info (not references — preserve as-is)
  client_company: {
    id: number;
    name: string;
    type: string;
    // ... other fields as returned
  } | null;
  
  client_contact: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    // ... other fields as returned
  } | null;
  
  process_server_company: { ... } | null;
  process_server_contact: { ... } | null;
  employee_process_server: { ... } | null;
  
  court_case: {
    id: number;
    plaintiff: string;
    defendant: string;
    case_number: string;
    // ... other fields as returned
  } | null;
  
  // Documents — store URLs only (not downloaded)
  documents_to_be_served: Array<{
    id: number;
    title: string;
    filename: string;
    content_type: string;
    download_url: string;              // ServeManager URL — may expire/break
    page_count: number | null;
    received_at: string;
  }>;
  
  misc_attachments: Array<{
    id: number;
    title: string;
    filename: string;
    content_type: string;
    download_url: string;
    received_at: string;
  }>;
  
  affidavits: Array<{
    id: number;
    reference_number: string;
    download_url: string;
    signed: boolean;
    created_at: string;
  }>;
  
  // Attempts — embedded in job response
  attempts: Array<{
    id: number;
    description: string;
    served_at: string;
    success: boolean;
    serve_type: string;
    gps: {
      lat: number;
      lng: number;
      timestamp: string;
      accuracy: number;
    } | null;
    recipient: { ... };                // Snapshot at time of attempt
    address: { ... };                  // Snapshot at time of attempt
    attachments: Array<{
      filename: string;
      download_url: string;
      content_type: string;
    }>;
    created_at: string;
  }>;
  
  // Notes — fetched separately, embedded here
  notes: Array<{
    id: number;
    label: string | null;
    body: string;
    created_at: string;
    created_by: string | null;
  }>;
  
  // Invoice — embedded in job response
  invoice: {
    id: number;
    issued_on: string | null;
    paid_on: string | null;
    balance_due: number;
    total_paid: number;
    terms: string | null;
    line_items: Array<{
      name: string;
      description: string | null;
      unit_cost: number;
      quantity: number;
    }>;
    payments: Array<{
      amount: number;
      description: string | null;
      applied_on: string;
    }>;
  } | null;
}
```

### `legacy_companies/{companyId}`
```typescript
{
  _importId: string;
  _accountId: string;
  _importedAt: Timestamp;
  _serveManagerId: number;
  
  // Preserved from ServeManager
  name: string;
  company_type: string;
  website: string | null;
  addresses: Array<{ ... }>;
  phone_numbers: Array<{ ... }>;
  email_addresses: Array<{ ... }>;
  contacts: Array<{
    id: number;
    first_name: string;
    last_name: string;
    title: string | null;
    email: string;
    phone: string;
    primary: boolean;
  }>;
  created_at: string;
  updated_at: string;
}
```

### `legacy_court_cases/{courtCaseId}`
```typescript
{
  _importId: string;
  _accountId: string;
  _importedAt: Timestamp;
  _serveManagerId: number;
  
  // Preserved from ServeManager
  plaintiff: string;
  defendant: string;
  case_number: string;
  filed_on: string | null;
  // ... other fields
}
```

### `legacy_courts/{courtId}`
```typescript
{
  _importId: string;
  _accountId: string;
  _importedAt: Timestamp;
  _serveManagerId: number;
  
  // Preserved from ServeManager
  branch_name: string;
  county: string;
  address: { ... };
  // ... other fields
}
```

### `legacy_employees/{employeeId}`
```typescript
{
  _importId: string;
  _accountId: string;
  _importedAt: Timestamp;
  _serveManagerId: number;
  
  // Preserved from ServeManager
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string | null;
  // ... other fields
}
```

---

## Cloud Functions

### 1. `validateServeManagerApiKey`
HTTP callable function to test if an API key is valid.

**Input:**
```typescript
{
  apiKey: string;
}
```

**Process:**
1. Make a request to `GET /api/account` with the provided API key
2. If successful, return account info
3. If 401/403, return error "Invalid API key"

**Output:**
```typescript
{
  valid: boolean;
  account?: {
    companyName: string;
    // ... account details
  };
  error?: string;
}
```

### 2. `startServeManagerImport`
HTTP callable function to initiate an import.

**Input:**
```typescript
{
  apiKey: string;
}
```

**Process:**
1. Verify the user is authenticated and has a Diligence account
2. Check if an import is already in progress for this account (prevent duplicates)
3. Validate the API key (call `validateServeManagerApiKey`)
4. Create a `legacy_imports` document with status "pending"
5. Store the API key in `legacy_imports/{id}/credentials` (encrypted)
6. Enqueue a Cloud Task to begin the import (allows for long-running operation)
7. Return the import ID

**Output:**
```typescript
{
  importId: string;
  status: "pending";
}
```

### 3. `processServeManagerImport` (Cloud Task Worker)
This is the long-running background job that does the actual import.

**Triggered by:** Cloud Task enqueued by `startServeManagerImport`

**Input (via Cloud Task payload):**
```typescript
{
  importId: string;
  accountId: string;
}
```

**Process:**

```
STEP 1: Setup
─────────────
- Retrieve the import document and credentials
- Update status to "in_progress"
- Make initial /api/account call to verify connectivity

STEP 2: Import Employees
────────────────────────
- GET /api/employees (paginate through all)
- For each employee:
  - Create document in legacy_employees/{employeeId}
  - Use ServeManager's employee.id as the document ID prefix (e.g., "sm_12345")
- Update progress.currentStep = "employees"

STEP 3: Import Companies
────────────────────────
- GET /api/companies?per_page=100 (paginate through all)
- For each company:
  - Create document in legacy_companies/{companyId}
- Update progress.importedCompanies incrementally
- Update progress.currentStep = "companies"

STEP 4: Import Courts
─────────────────────
- GET /api/courts?per_page=100 (paginate through all)
- For each court:
  - Create document in legacy_courts/{courtId}
- Update progress.currentStep = "courts"

STEP 5: Import Court Cases
──────────────────────────
- GET /api/court_cases?per_page=100 (paginate through all)
- For each court case:
  - Create document in legacy_court_cases/{courtCaseId}
- Update progress.currentStep = "court_cases"

STEP 6: Import Jobs (Most Complex)
──────────────────────────────────
- First, get total count: GET /api/jobs?per_page=1 to see pagination info
- Update progress.totalJobs
- Paginate through all jobs: GET /api/jobs?per_page=100

For each job:
  a. GET /api/jobs/:id to get full details (attempts, documents, invoice embedded)
  b. GET /api/jobs/:job_id/notes to get notes for this job
  c. Merge notes into the job object
  d. Create document in legacy_jobs/{jobId}
  e. Count documents referenced (documents_to_be_served + misc_attachments + affidavits)
  f. Update progress.importedJobs
  
  Rate limiting:
  - Add 1-second delay between job detail fetches
  - If 429 received, exponential backoff (wait 30s, 60s, 120s...)
  - If repeated failures, log error and continue to next job

- Update progress.currentStep = "jobs"

STEP 7: Finalize
────────────────
- Calculate final stats
- Update status to "completed"
- Set completedAt timestamp
- Send completion email to user

ERROR HANDLING:
- If any step fails catastrophically, set status to "failed"
- Log errors to the errors array
- Send failure email to user with details
- User can retry later
```

**Rate Limiting Strategy:**
```typescript
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      // Rate limited — exponential backoff
      const waitTime = Math.pow(2, attempt) * 30000; // 30s, 60s, 120s
      await delay(waitTime);
      continue;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  throw new Error('Max retries exceeded');
}

// Between each job detail fetch:
await delay(1000); // 1 second between requests
```

**Cloud Task Configuration:**
- Timeout: 30 minutes (or use multiple chained tasks for very large imports)
- Retry: 3 attempts
- If a single task times out, save progress and enqueue a continuation task

### 4. `getImportStatus`
HTTP callable function to check import progress.

**Input:**
```typescript
{
  importId: string;
}
```

**Output:**
```typescript
{
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: {
    currentStep: string;
    totalJobs: number | null;
    importedJobs: number;
    // ... other progress fields
  };
  stats?: { ... };                     // Only if completed
  errors?: Array<{ ... }>;             // If any errors occurred
}
```

### 5. `sendImportCompletionEmail`
Triggered when import status changes to "completed" or "failed".

**Process:**
1. Get user's email
2. If completed: Send success email with stats summary
3. If failed: Send failure email with error details and suggestion to contact support

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Legacy imports — only the owning account can read
    match /legacy_imports/{importId} {
      allow read: if request.auth != null 
                  && resource.data._accountId == request.auth.token.accountId;
      allow create: if request.auth != null
                    && request.resource.data._accountId == request.auth.token.accountId;
      allow update: if false;  // Only Cloud Functions can update
      allow delete: if false;  // No deletion
      
      // Credentials subcollection — no client access
      match /credentials/{doc} {
        allow read, write: if false;  // Only Cloud Functions
      }
    }
    
    // Legacy jobs — read-only for owning account
    match /legacy_jobs/{jobId} {
      allow read: if request.auth != null
                  && resource.data._accountId == request.auth.token.accountId;
      allow write: if false;  // No writes from client
    }
    
    // Legacy companies — read-only for owning account
    match /legacy_companies/{companyId} {
      allow read: if request.auth != null
                  && resource.data._accountId == request.auth.token.accountId;
      allow write: if false;
    }
    
    // Legacy court cases — read-only for owning account
    match /legacy_court_cases/{caseId} {
      allow read: if request.auth != null
                  && resource.data._accountId == request.auth.token.accountId;
      allow write: if false;
    }
    
    // Legacy courts — read-only for owning account
    match /legacy_courts/{courtId} {
      allow read: if request.auth != null
                  && resource.data._accountId == request.auth.token.accountId;
      allow write: if false;
    }
    
    // Legacy employees — read-only for owning account
    match /legacy_employees/{employeeId} {
      allow read: if request.auth != null
                  && resource.data._accountId == request.auth.token.accountId;
      allow write: if false;
    }
  }
}
```

---

## React Frontend Components

### 1. `<DataImportSettings />`
Location: Settings → Data Import

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Import Data from ServeManager                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Bring your historical data from ServeManager into Diligence.   │
│ Your imported data will be available as a read-only archive.   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ServeManager API Key                                        │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●                          │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ Find your API key in ServeManager:                          │ │
│ │ My Account → Settings → Integrations → API Keys             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [ Validate Key ]                                                │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ ✓ API Key Valid                                                 │
│   Connected to: ABC Process Serving                             │
│   Monthly Jobs: 247 / 300                                       │
│                                                                 │
│ [ Start Import ]                                                │
│                                                                 │
│ ⚠️ Note: Large accounts may take several hours to import.      │
│    You'll receive an email when the import is complete.         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**States:**
- Initial: Show API key input
- Validating: Show spinner on "Validate Key" button
- Valid: Show green checkmark, account info, "Start Import" button
- Invalid: Show red error message
- Import Started: Show "Import in progress" message with link to status
- Previous Import Exists: Show info about previous import, option to view or re-import

### 2. `<ImportStatusCard />`
Shows on the Settings page and optionally on the dashboard while import is in progress.

**UI (in progress):**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔄 ServeManager Import In Progress                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Importing your data from ServeManager...                        │
│                                                                 │
│ Current Step: Importing Jobs                                    │
│                                                                 │
│ ████████████████████░░░░░░░░░░░░ 67%                            │
│                                                                 │
│ Jobs: 2,847 / 4,250                                             │
│ Companies: 156 ✓                                                │
│ Court Cases: 89 ✓                                               │
│                                                                 │
│ Started: 2 hours ago                                            │
│ Estimated completion: ~1 hour                                   │
│                                                                 │
│ You'll receive an email when the import is complete.            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**UI (completed):**
```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ ServeManager Import Complete                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Successfully imported:                                          │
│ • 4,250 jobs                                                    │
│ • 156 companies                                                 │
│ • 89 court cases                                                │
│ • 12 employees                                                  │
│ • 8,432 documents referenced                                    │
│                                                                 │
│ Completed: January 15, 2024 at 3:42 AM                          │
│                                                                 │
│ [ View Legacy Data ]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. `<LegacyJobsPage />`
Main page for viewing imported ServeManager data.

**Location:** Main navigation → "Legacy Jobs" or "ServeManager Archive"

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ServeManager Archive                              [Read-Only]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search jobs, recipients, case numbers...                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Filters: [Status ▼] [Date Range ▼] [Client ▼] [Server ▼]       │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ Job #SM-12345              Served           Jan 15, 2023        │
│ John Smith                 ABC Law Firm     Quick Serve LLC     │
│ 123 Main St, Los Angeles   Case: 23-CV-4567                     │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ Job #SM-12344              Non-Service      Jan 14, 2023        │
│ Jane Doe                   XYZ Legal        Quick Serve LLC     │
│ 456 Oak Ave, Pasadena      Case: 23-CV-4566                     │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ [1] [2] [3] ... [42] [Next →]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Full-text search across recipient name, address, case number, job number
- Filter by service status, date range, client company, server company
- Pagination (50 jobs per page)
- Click a row to open `<LegacyJobDetailPage />`
- "Read-Only" badge prominently displayed

### 4. `<LegacyJobDetailPage />`
Detailed view of a single imported job.

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Archive                                 [Read-Only]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Job #SM-12345                                                   │
│ ══════════════════════════════════════════════════════════════  │
│                                                                 │
│ Status: ● Served                         Due: Jan 15, 2023      │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ RECIPIENT                                                   │ │
│ │ John Smith                                                  │ │
│ │ Male, 45, Brown hair, Blue eyes                             │ │
│ │                                                             │ │
│ │ Address:                                                    │ │
│ │ 123 Main Street, Apt 4B                                     │ │
│ │ Los Angeles, CA 90012                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ COURT CASE                                                  │ │
│ │ Case #: 23-CV-4567                                          │ │
│ │ Smith vs. Jones                                             │ │
│ │ Filed: January 2, 2023                                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ CLIENT                        │ SERVER                      │ │
│ │ ABC Law Firm                  │ Quick Serve LLC             │ │
│ │ John Attorney                 │ Mike Server                 │ │
│ │ john@abclaw.com               │ mike@quickserve.com         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ 📄 DOCUMENTS (3)                                    [Expand ▼]  │
│ ├── Summons.pdf                              [View] [Download]  │
│ ├── Complaint.pdf                            [View] [Download]  │
│ └── Exhibit_A.pdf                            [View] [Download]  │
│                                                                 │
│ 📋 AFFIDAVITS (1)                                   [Expand ▼]  │
│ └── Affidavit_SM-12345.pdf    ✓ Signed       [View] [Download]  │
│                                                                 │
│ 🎯 ATTEMPTS (3)                                     [Expand ▼]  │
│ ├── Jan 15, 2023 2:30 PM - ✅ Served                            │
│ │   Served personally to John Smith at front door.              │
│ │   📍 34.0522, -118.2437                                       │
│ │   📎 photo_001.jpg                                            │
│ │                                                               │
│ ├── Jan 14, 2023 6:15 PM - ❌ No Answer                         │
│ │   Knocked, no response. Left door tag.                        │
│ │   📍 34.0522, -118.2437                                       │
│ │                                                               │
│ └── Jan 13, 2023 10:00 AM - ❌ Not Home                         │
│     Neighbor said recipient at work until 5 PM.                 │
│     📍 34.0522, -118.2437                                       │
│                                                                 │
│ 📝 NOTES (2)                                        [Expand ▼]  │
│ ├── Jan 14, 2023 - Server will retry tomorrow evening          │
│ └── Jan 13, 2023 - Initial attempt scheduled                   │
│                                                                 │
│ 💰 INVOICE                                          [Expand ▼]  │
│ ├── Invoice #INV-12345                                          │
│ ├── Issued: Jan 16, 2023                                        │
│ ├── Status: Paid                                                │
│ ├──────────────────────────────────────────────────────────────│
│ │ Service of Process           1 x $75.00          $75.00      │ │
│ │ Rush Fee                     1 x $25.00          $25.00      │ │
│ │ Mileage                     12 x  $0.65           $7.80      │ │
│ ├──────────────────────────────────────────────────────────────│
│ │ Total:                                          $107.80      │ │
│ │ Paid:                                           $107.80      │ │
│ │ Balance:                                          $0.00      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                         [Print Job Summary]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- All data is read-only (no edit buttons anywhere)
- Document links go to ServeManager URLs (may require active SM subscription)
- "Print Job Summary" generates a printable view
- GPS coordinates can link to Google Maps
- Collapsible sections for large jobs

### 5. `<LegacyCompaniesPage />`
List view of imported companies (address book).

**Similar to LegacyJobsPage but for companies.**

### 6. `<LegacyCourtCasesPage />`
List view of imported court cases.

**Similar to LegacyJobsPage but for court cases.**

---

## Implementation Order

1. **Firestore collections and security rules** — Set up legacy_* collections
2. **`validateServeManagerApiKey` Cloud Function** — Test API connectivity
3. **`<DataImportSettings />` component** — API key input and validation UI
4. **`startServeManagerImport` Cloud Function** — Initiate import, enqueue task
5. **`processServeManagerImport` Cloud Task** — The actual import worker
6. **`<ImportStatusCard />` component** — Show progress
7. **`sendImportCompletionEmail` Cloud Function** — Notify on completion
8. **`<LegacyJobsPage />` component** — List view with search/filter
9. **`<LegacyJobDetailPage />` component** — Detail view
10. **`<LegacyCompaniesPage />` component** — Companies list
11. **`<LegacyCourtCasesPage />` component** — Court cases list

---

## Important Implementation Notes

### API Key Security
- Store API keys encrypted in Firestore (use a Cloud KMS key or Firebase's built-in encryption)
- Never expose API keys to the client after initial validation
- Delete stored API key after import completes (or give user option to keep for re-import)

### Document URLs
- ServeManager document URLs may be signed S3 URLs that expire
- Some URLs may require active ServeManager authentication
- Display a warning to users: "Document links require an active ServeManager subscription"
- If a link fails, show friendly error: "This document is no longer available from ServeManager"

### Large Import Handling
- Use Cloud Tasks for the import worker (30 min timeout per task)
- For very large accounts (10,000+ jobs), chain multiple tasks
- Save checkpoint progress so import can resume if interrupted
- Consider batching Firestore writes (500 docs per batch)

### Firestore Indexes
Create composite indexes for common queries:
```
legacy_jobs: _accountId ASC, service_status ASC, created_at DESC
legacy_jobs: _accountId ASC, client_company.name ASC, created_at DESC
legacy_jobs: _accountId ASC, servemanager_job_number ASC
```

### Error Handling
- If a single job fails to import, log the error and continue
- Don't fail the entire import because of one bad record
- Surface errors to user in the completion email/status

### Re-Import Behavior
- If user clicks "Start Import" again, warn them: "This will replace your existing imported data"
- Delete all existing legacy_* documents for this account before re-importing
- Or offer "incremental import" that only imports jobs since last import (enhancement)

---

## Test Scenarios

1. **Valid API key** — Enter valid key → shows account info → can start import
2. **Invalid API key** — Enter invalid key → shows error message
3. **Small import** — Account with 50 jobs → completes in minutes → email sent
4. **Large import** — Account with 5,000 jobs → takes hours → progress updates → email sent
5. **Rate limiting** — ServeManager returns 429 → exponential backoff → eventually succeeds
6. **Partial failure** — Some jobs fail to import → continues anyway → errors logged → user notified
7. **View legacy job** — Can see all details, attempts, documents, invoice
8. **Document link** — Click document → opens ServeManager URL (may fail if no SM subscription)
9. **Search** — Search by recipient name → finds matching jobs
10. **Filter** — Filter by status "Served" → only shows served jobs
11. **Read-only enforcement** — No edit buttons visible anywhere → security rules block writes
12. **Re-import** — Click import again → warned about replacement → old data deleted → new import starts
