# ServeMax - Claude Documentation

**Project Type:** Multi-tenant SaaS platform for legal process serving and document management

**Last Updated:** 2025-10-22

---

## Quick Reference

### Tech Stack
- **Frontend:** React 18.2 + Vite 6.1, React Router 7.2
- **Backend:** Firebase (Firestore, Auth, Storage, Cloud Functions)
- **Styling:** Tailwind CSS 3.4 + Radix UI components
- **Forms:** React Hook Form + Zod validation
- **PDF:** pdf-lib, Puppeteer (Cloud Functions)
- **Maps:** Leaflet + React Leaflet for geolocation
- **Other:** Recharts (charts), Monaco Editor (code editor), Framer Motion

### Development Commands
```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Environment Variables Required (`.env.local`)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Project Architecture

### Multi-Tenant Pattern
**CRITICAL:** This is a multi-tenant application. Every database query MUST be filtered by `company_id`.

- Each user belongs to a **Company**
- Companies can be: `process_serving`, `client`, or `independent_contractor`
- All data (jobs, clients, employees, invoices) is scoped to a company
- Security rules enforce company-level data isolation

### Provider Architecture
The app uses React Context API for state management:

1. **AuthProvider** (`src/components/auth/AuthProvider.jsx`)
   - Manages Firebase authentication state
   - Loads user data from Firestore
   - Provides `currentUser` object with user type and company info

2. **GlobalDataProvider** (`src/components/GlobalDataContext.jsx`)
   - Loads and caches company-wide data (clients, employees, jobs)
   - Provides global state for the entire app
   - Auto-refreshes when data changes

### Firebase Service Layer

All Firebase interactions go through service modules in `src/firebase/`:

| Service | Purpose |
|---------|---------|
| `config.js` | Firebase initialization |
| `auth.js` | Authentication (login, signup, password reset) |
| `database.js` | Generic Firestore CRUD operations via `entities` |
| `storage.js` | File uploads/downloads to Cloud Storage |
| `functions.js` | Cloud Functions calls (PDF merge, QR codes) |
| `jobManager.js` | Job-specific database operations |
| `invoiceManager.js` | Invoice-specific operations |
| `schemas.js` | Data schemas and manager classes (35KB) |
| `stats.js` | Analytics and statistics |
| `adminStats.js` | Super admin analytics |
| `multiTenantAccess.js` | Multi-company access control |

---

## Directory Structure

```
serve-max-1f01c0af/
├── src/
│   ├── pages/                      # 28 pages (12,876 lines total)
│   │   ├── Dashboard.jsx           # Company dashboard
│   │   ├── Jobs.jsx                # Job list view
│   │   ├── CreateJob.jsx           # Job creation with marketplace
│   │   ├── JobDetails.jsx          # Job detail view (131KB - large!)
│   │   ├── GenerateAffidavit.jsx   # Affidavit generation
│   │   ├── Clients.jsx             # Client management
│   │   ├── Employees.jsx           # Employee management
│   │   ├── Accounting.jsx          # Invoicing and payments
│   │   ├── Settings.jsx            # Company settings
│   │   ├── TemplateEditor.jsx      # Monaco-based template editor
│   │   ├── Directory.jsx           # Professional directory
│   │   ├── Marketplace.jsx         # Job marketplace
│   │   ├── SuperAdminDashboard.jsx # Super admin analytics
│   │   ├── Auth pages/             # Login, SignUp, etc.
│   │   └── index.jsx               # Routing configuration
│   │
│   ├── components/                 # 127 JSX files
│   │   ├── ui/                     # 54 base UI components (Radix)
│   │   ├── affidavit/              # Affidavit generation components
│   │   ├── jobs/                   # Job-related components
│   │   ├── clients/                # Client management
│   │   ├── employees/              # Employee management
│   │   ├── accounting/             # Invoicing components
│   │   ├── dashboard/              # Dashboard widgets
│   │   ├── settings/               # Settings panels
│   │   ├── admin/                  # Super admin components
│   │   ├── auth/                   # AuthProvider, ProtectedRoute
│   │   └── GlobalDataContext.jsx   # Global state provider
│   │
│   ├── firebase/                   # Firebase services (4,828 lines)
│   │   └── schemas.js              # Data models (see below)
│   │
│   ├── hooks/                      # Custom React hooks
│   ├── utils/                      # Utility functions
│   │   ├── permissions.js          # Role-based permissions
│   │   ├── templateEngine.js       # Template rendering
│   │   ├── starterTemplates.js     # Default templates
│   │   └── geolocation.js          # ZIP code geocoding
│   │
│   ├── App.jsx                     # Root component
│   └── main.jsx                    # Entry point
│
├── functions/                      # Firebase Cloud Functions
│   └── index.js                    # PDF merge, QR codes, geocoding
│
├── firebase.json                   # Firebase config
├── firestore.rules                 # Database security rules
└── vite.config.js                  # Vite build config (@ alias)
```

### Path Alias
`@/` maps to `./src/` (configured in `jsconfig.json`)

Example: `import { Button } from '@/components/ui/button'`

---

## Data Models & Schemas

All schemas defined in `src/firebase/schemas.js`

### 1. Company Schema

**Primary Entity:** Represents a process serving company, client company, or independent contractor

**Key Fields:**
```javascript
{
  // Basic Info
  name: string,
  email: string,
  phone: string,
  website: string,
  fax: string,

  // Legacy address (backward compatibility)
  address: string,
  city: string,
  state: string,
  zip: string,
  county: string,

  // New addresses system (array)
  addresses: [
    {
      label: "Primary" | "Secondary" | custom,
      address1: string,
      address2: string,
      city: string,
      state: string,
      postal_code: string,
      county: string,
      lat: number | null,
      lng: number | null,
      primary: boolean,
      created_at: Date,
      updated_at: Date
    }
  ],

  // Ownership
  owner_id: string,              // Firebase Auth UID
  company_owner: string,          // Alias for owner_id
  company_employees: string[],    // Array of employee UIDs

  // Business Type
  company_type: 'process_serving' | 'client' | 'independent_contractor',
  staff_size: 'solo' | 'small_team' | 'medium' | 'large',
  service_capabilities: string[],
  custom_job_statuses: string[],

  // Analytics
  monthly_jobs_quota: number | null,
  current_month_job_count: number,
  pending_jobs_count: number,
  first_job_created_at: Date | null,
  last_job_created_at: Date | null,

  // Financial
  can_receive_funds: boolean,

  // Billing
  billing_tier: 'free' | 'trial' | 'paid',
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'incomplete',
  trial_start_date: Date,
  trial_jobs_used: number,
  stripe_customer_id: string | null,
  stripe_subscription_id: string | null,
  plan_name: string,
  monthly_job_limit: number,

  // Collaboration
  collaboration_settings: {
    job_sharing_enabled: boolean,
    directory_listing_enabled: boolean,
    accepts_overflow_work: boolean
  },

  // Invoice Settings
  invoice_settings: {
    invoice_for_printing: boolean,
    per_page_copy_rate: number,
    tax_on_invoice: boolean,
    tax_rate: number,
    service_fee: number,
    rush_fee: number,
    emergency_fee: number,
    invoice_presets: [
      { id: string, description: string, default_amount: number }
    ]
  },

  // Timestamps
  created_at: Timestamp,
  updated_at: Timestamp
}
```

**Manager Class:** `CompanyManager` (in `schemas.js`)
- `createCompany()` - Create company with auto-directory sync
- `getCompanyByOwnerId()` - Find company by owner UID
- `updateCompany()` - Update with auto-directory sync
- `migrateCompanyToNewSchema()` - Migrate legacy companies to new address system
- `updateJobMetrics()` - Auto-update job counts (resets monthly)

### 2. User Schema

**Primary Entity:** Extends Firebase Auth users

**Key Fields:**
```javascript
{
  email: string,
  first_name: string,
  last_name: string,
  full_name: string,              // Auto-generated
  user_type: 'company_owner' | 'employee' | 'independent_contractor',
  company_id: string | null,      // For employees and owners
  employee_role: 'admin' | 'manager' | 'process_server' | null,
  invited_by: string | null,      // User ID who invited
  companies: string[],            // For contractors - multi-company access
  is_active: boolean,
  phone: string,
  address: string,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

**Access Control:**
- `canAccessCompanyData(user, companyId)` - Check if user can access company
- `getAccessibleCompanies(user)` - Get all companies user can access

### 3. Job Schema

**Note:** Full schema in `src/firebase/jobManager.js`

Jobs include:
- Service addresses (array)
- Defendant/plaintiff info
- Court information
- Documents (uploaded files)
- Service attempts
- Timeline/deadlines
- Assignment (to employee or contractor)
- Status tracking
- Marketplace posting option

### 4. Directory Schema

**Purpose:** Public professional directory of process servers

**Key Fields:**
```javascript
{
  company_id: string,             // Document ID matches company ID
  company_type: 'process_serving' | 'independent_contractor',
  name: string,
  email: string,
  phone: string,
  address: string,
  city: string,
  state: string,
  zip: string,

  // Geolocation for distance search
  lat: number | null,
  lng: number | null,
  last_geocoded_at: Date | null,

  // Profile
  blurb: string,                  // 250 char limit
  services_offered: string[],
  coverage_areas: string[],       // ZIP codes
  service_radius_miles: number,

  // Pricing
  rates: {
    standard_service: number,
    rush_service: number,
    weekend_service: number
  },

  // Availability
  availability: {
    accepts_rush_jobs: boolean,
    accepts_weekend_jobs: boolean,
    average_turnaround_days: number
  },

  // Contact
  contact_preferences: {
    email: boolean,
    phone: boolean,
    secure_messaging: boolean
  },

  // Verification
  verification_status: 'verified' | 'pending' | 'unverified',
  rating_average: number,
  total_jobs_completed: number,
  is_active: boolean,

  created_at: Timestamp,
  updated_at: Timestamp
}
```

**Manager Class:** `DirectoryManager`
- `addToDirectory()` - Add company to directory
- `searchDirectory()` - Basic search by filters
- `searchDirectoryByDistance()` - Geolocation-based search (ZIP + radius)
- `syncFromCompany()` - Auto-sync from company when collaboration settings change
- `updateCompanyCoordinates()` - Geocode addresses for distance search

**Access:** Public read, company owners write their own

### 5. Marketplace Schemas

**MarketplaceJob:** Posted jobs available for bidding

```javascript
{
  job_id: string,                 // Reference to original job
  posted_by_company_id: string,
  posted_by_user_id: string,

  // Job details (limited for privacy)
  service_type: 'standard' | 'rush' | ...,
  rush_service: boolean,
  service_city: string,           // No street address
  service_state: string,
  service_zip: string,
  service_county: string,

  case_number: string,
  defendant_name: string,
  court_name: string,
  court_county: string,
  document_count: number,
  deadline: Date | null,
  special_requirements: string,

  // Status
  status: 'open' | 'awarded' | 'cancelled' | 'expired',

  // Bids
  bid_count: number,
  lowest_bid: number | null,
  highest_bid: number | null,
  selected_bid_id: string | null,
  awarded_to_company_id: string | null,
  awarded_at: Date | null,

  posted_at: Timestamp,
  expires_at: Date | null,
  updated_at: Timestamp
}
```

**MarketplaceBid:** Contractor bids on jobs

```javascript
{
  marketplace_job_id: string,
  job_id: string,

  // Bidder (NOT anonymous)
  bidder_company_id: string,
  bidder_user_id: string,
  bidder_company_name: string,

  // Bid
  bid_amount: number,
  estimated_completion_days: number | null,
  notes: string,

  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn',
  accepted_at: Date | null,
  rejected_at: Date | null,
  withdrawn_at: Date | null,

  created_at: Timestamp,
  updated_at: Timestamp
}
```

**Manager Class:** `MarketplaceManager`
- `postJobToMarketplace()` - Post job for bidding
- `placeBid()` - Submit bid (checks for duplicates)
- `acceptBid()` - Award job, reject other bids
- `getOpenMarketplaceJobs()` - Get available jobs (excludes own company)
- `getBidsForJob()` - Get all bids for a job

### 6. Other Collections

- **Clients** - Client companies (name, contact, address)
- **Employees** - Company staff members
- **Invoices** - Billing records with line items
- **Invitations** - Pending employee/contractor invitations
- **Templates** - Custom document templates (Handlebars)
- **Subscriptions** - Stripe subscription tracking

---

## Firebase Configuration

### Services

1. **Firestore Database** (`src/firebase/database.js`)
   - Generic entity CRUD via `entities` object
   - Example: `entities.Company.findById(id)`
   - All queries auto-filtered by company in service layer

2. **Authentication** (`src/firebase/auth.js`)
   - Email/password authentication
   - Custom claims: `user_type`, `company_id`, `employee_role`
   - Password reset via email

3. **Cloud Storage** (`src/firebase/storage.js`)
   - Document uploads (PDFs, images)
   - Public/private file access
   - Organized by company: `companies/{company_id}/documents/`

4. **Cloud Functions** (`functions/index.js`)
   - `mergePDFs()` - Merge multiple PDFs in order
   - `generateQRCode()` - QR code generation
   - `generateAffidavit()` - Affidavit PDF generation with Puppeteer
   - Google Maps API integration for geocoding

### Security Rules (`firestore.rules`)

**Pattern:** Multi-tenant access control

Key rules:
- Users can read/write their own document
- Company data accessible only to company members
- Directory is public read
- Stats collections are read-only (server-side writes)
- Invitations readable by invitee and company admins

**Helper functions:**
```javascript
function isAuthenticated() { return request.auth != null; }
function hasCompanyAccess(companyId) {
  return isAuthenticated() &&
         (resource.data.company_id == companyId ||
          request.auth.token.company_id == companyId);
}
```

---

## Key Patterns & Conventions

### Adding a New Page

1. Create page component in `src/pages/NewPage.jsx`
2. Add route in `src/pages/index.jsx`:
   ```javascript
   {
     path: '/new-page',
     element: <ProtectedRoute><NewPage /></ProtectedRoute>
   }
   ```
3. Add navigation link in relevant component

### Firebase CRUD Operations

**Pattern:** Use entity objects from `database.js`

```javascript
import { entities } from '@/firebase/database';

// Create
const newClient = await entities.Client.create({
  company_id: currentCompany.id,
  name: 'John Doe',
  email: 'john@example.com'
});

// Read one
const client = await entities.Client.findById(clientId);

// Read many (filtered)
const clients = await entities.Client.filter({
  company_id: currentCompany.id
});

// Update
await entities.Client.update(clientId, {
  phone: '555-1234'
});

// Delete
await entities.Client.delete(clientId);
```

**IMPORTANT:** Always filter by `company_id` for multi-tenant data!

### Multi-Tenant Query Pattern

```javascript
// ✅ CORRECT - Filtered by company
const jobs = await entities.Job.filter({
  company_id: currentUser.company_id,
  status: 'pending'
});

// ❌ WRONG - No company filter
const jobs = await entities.Job.filter({
  status: 'pending'
});
```

### Permission Checks

Use `src/utils/permissions.js`:

```javascript
import { hasPermission, PERMISSIONS } from '@/utils/permissions';

if (hasPermission(currentUser, PERMISSIONS.MANAGE_EMPLOYEES)) {
  // Show admin features
}
```

**Employee Roles:**
- `admin` - Full company access
- `manager` - Manage jobs and employees
- `process_server` - View assigned jobs only

### Using Global Data Context

```javascript
import { useGlobalData } from '@/components/GlobalDataContext';

function MyComponent() {
  const {
    currentCompany,
    jobs,
    clients,
    employees,
    refreshJobs,
    loading
  } = useGlobalData();

  // Use cached data
  // Call refresh functions when data changes
}
```

### Template Engine

Templates use Handlebars syntax:

```handlebars
{{company.name}}
{{job.defendant_name}}
{{#each service_attempts}}
  Attempt {{@index}}: {{this.date}}
{{/each}}
```

See `src/utils/templateEngine.js` for rendering logic.

---

## Current Work in Progress

### Recent Changes (Branch: `update-layout`)

**Modified Files:**
- `src/components/affidavit/AffidavitPreview.jsx` - Preview improvements
- `src/pages/GenerateAffidavit.jsx` - Enhanced affidavit generation
- `src/pages/Settings.jsx` - Settings UI updates
- `src/utils/starterTemplates.js` - Template updates

**New Files:**
- `src/components/affidavit/AO440EditableFields.jsx` - Editable fields for AO440 form

**Recent Commit:**
```
baea290 - Add super admin dashboard with analytics and pricing configuration
- Enhanced super admin dashboard with activity feed, growth charts, revenue trends
- Created pages for Companies, Subscriptions, System monitoring
- Implemented pricing configuration for standard and custom plans
- Home page displays pricing dynamically from database
- Super admin can configure platform-wide pricing
- Activity feed filters to show only actual platform users
```

### Active Development Areas

1. **Super Admin Dashboard**
   - Analytics: user growth, revenue trends, job stats
   - Company management
   - Subscription tracking
   - Pricing configuration (standard + custom per-company)
   - System monitoring

2. **Affidavit Generation**
   - AO440 form support with editable fields
   - Template-based generation
   - PDF rendering with Puppeteer
   - Custom field mapping

3. **Layout Updates**
   - UI/UX improvements
   - Responsive design enhancements

### Migration Notes

**Base44 → Firebase Migration:**
- Completed in December 2024
- API compatibility layer in `src/api/` for smooth transition
- See `FIREBASE_MIGRATION.md` for details
- Legacy address fields maintained for backward compatibility
- New `addresses` array system for multiple locations

---

## Important File Locations

### Quick Reference Map

| Task | File Location |
|------|---------------|
| Add authentication logic | `src/firebase/auth.js` |
| Database CRUD operations | `src/firebase/database.js` |
| Job-specific operations | `src/firebase/jobManager.js` |
| Invoice operations | `src/firebase/invoiceManager.js` |
| Data schemas and managers | `src/firebase/schemas.js` |
| Permission checks | `src/utils/permissions.js` |
| Template rendering | `src/utils/templateEngine.js` |
| Geocoding/maps | `src/utils/geolocation.js` |
| Global state provider | `src/components/GlobalDataContext.jsx` |
| Auth provider | `src/components/auth/AuthProvider.jsx` |
| Route configuration | `src/pages/index.jsx` |
| UI components | `src/components/ui/` |
| Firebase config | `src/firebase/config.js` |
| Security rules | `firestore.rules` |
| Cloud Functions | `functions/index.js` |
| Environment variables | `.env.local` |
| Build configuration | `vite.config.js` |

### Testing Firebase Connection

Use `src/components/FirebaseTest.jsx` to test Firestore connectivity during development.

---

## Common Tasks

### Create a New Company
```javascript
import { CompanyManager } from '@/firebase/schemas';

const company = await CompanyManager.createCompany({
  name: 'ABC Process Serving',
  email: 'contact@abc.com',
  phone: '555-1234',
  company_type: 'process_serving',
  staff_size: 'solo'
}, ownerId);
```

### Search Directory by Distance
```javascript
import { DirectoryManager } from '@/firebase/schemas';

const nearby = await DirectoryManager.searchDirectoryByDistance(
  '90210',     // ZIP code
  50,          // radius in miles
  { company_type: 'process_serving' }
);
```

### Post Job to Marketplace
```javascript
import { MarketplaceManager } from '@/firebase/schemas';

const marketplaceJob = await MarketplaceManager.postJobToMarketplace(
  jobId,
  jobData,
  companyId,
  userId
);
```

### Check Trial Status
```javascript
import { checkTrialStatus } from '@/firebase/schemas';

const trialInfo = checkTrialStatus(company);
if (!trialInfo.isActive) {
  // Show upgrade prompt
}
```

---

## Troubleshooting

### Common Issues

1. **"Cannot read property 'company_id' of undefined"**
   - User not loaded yet - add loading check
   - Use `useAuth()` hook to get `currentUser`

2. **"Permission denied" in Firestore**
   - Check that query includes `company_id` filter
   - Verify user has `company_id` in custom claims
   - Review `firestore.rules` for access requirements

3. **Geocoding fails**
   - Check Google Maps API key in Cloud Functions secrets
   - Ensure address fields are populated
   - See `src/utils/geolocation.js` for error handling

4. **PDF merge fails**
   - Verify all URLs are accessible
   - Check Cloud Functions logs in Firebase Console
   - Ensure PDFs are valid (not corrupted)

---

## Additional Documentation

- `README.md` - Basic project info (generic, outdated)
- `FIREBASE_SETUP.md` - Firebase project setup guide
- `FIREBASE_MIGRATION.md` - Base44 to Firebase migration details
- `MARKETPLACE_IMPLEMENTATION_NOTES.md` - Marketplace feature implementation

---

## Notes for Claude

### When Helping with Tasks

1. **Always check multi-tenant context** - Is the query filtered by `company_id`?
2. **Use existing patterns** - Don't reinvent CRUD operations, use `entities` object
3. **Respect data schemas** - Use schema functions from `schemas.js`
4. **Consider permissions** - Check user roles before showing/allowing features
5. **Update both legacy and new fields** - Company addresses exist in both formats
6. **Auto-sync directory** - Company updates should sync to directory if enabled
7. **Cloud Functions for heavy lifting** - PDF operations, geocoding, etc.

### Code Style

- Use functional components with hooks
- Destructure props
- Use Tailwind utility classes
- Follow existing naming conventions (camelCase for variables/functions)
- Add error handling with try/catch
- Log errors for debugging

### Firebase Best Practices

- Batch operations when possible
- Use `serverTimestamp()` for timestamps
- Index complex queries (see `firestore.indexes.json`)
- Handle offline scenarios gracefully
- Clean up listeners on component unmount

---

**Last Updated:** 2025-10-22
**Project Version:** Active Development
**Claude Sessions:** This file will be read automatically by Claude to understand project context
