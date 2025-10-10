# Marketplace Feature Implementation Notes

## Current Status: Phase 2 Complete - Database Schemas Created

### What Has Been Completed

#### Phase 1: UI & Validation (DONE ✅)
1. **Marketplace Tab Added** (`src/pages/CreateJob.jsx:1380-1397`)
   - Third tab in server section (Employee | Contractor | Marketplace)
   - Store icon imported and used
   - Sets `server_type: 'marketplace'` and `assigned_server_id: 'marketplace'` when clicked

2. **Requirements Validation** (`src/pages/CreateJob.jsx:455-469`)
   - Created `isMarketplaceAvailable()` function
   - Checks for:
     - At least one uploaded document: `uploadedDocuments && uploadedDocuments.length > 0`
     - Valid primary address with: address1, city, state, postal_code

3. **Marketplace Info Card** (`src/pages/CreateJob.jsx:1424-1470`)
   - Shows amber warning if requirements not met
   - Lists missing requirements (documents, address fields)
   - Shows blue success state when ready to post
   - Displays privacy notes:
     - Street address NOT shown (only city, state, ZIP)
     - Company names visible on bids (NOT anonymous)
     - Notifications when bids are placed

4. **Submit Validation** (`src/pages/CreateJob.jsx:508-513`)
   - Prevents form submission if marketplace selected and requirements not met
   - Alert: "Cannot post to marketplace: Please upload service documents and complete the service address."

#### Phase 2: Database Schemas (DONE ✅)

**Files Modified:**
- `src/firebase/database.js:250-251`
- `src/firebase/schemas.js:742-1022`

**Collections Created:**
1. **marketplace_jobs** collection
   - Stores job listings posted to marketplace
   - Privacy-focused: only city/state/ZIP (no street address)
   - Tracks bid statistics

2. **marketplace_bids** collection
   - Stores bids from companies
   - Bidder company info is VISIBLE (not anonymous)
   - Tracks bid status (pending/accepted/rejected/withdrawn)

**Schema Details:**

##### MarketplaceJob Schema (`createMarketplaceJobSchema`)
```javascript
{
  // References
  job_id: string,                      // Original job ID
  posted_by_company_id: string,        // Company that posted
  posted_by_user_id: string,           // User that posted

  // Job details
  service_type: 'standard',            // Service type
  rush_service: boolean,               // Rush flag

  // Address (PRIVACY: city/state/ZIP only)
  service_city: string,
  service_state: string,
  service_zip: string,
  service_county: string,

  // Case info
  case_number: string,
  defendant_name: string,
  court_name: string,
  court_county: string,

  // Documents (count only, not actual files)
  document_count: number,

  // Deadline & requirements
  deadline: Date,
  special_requirements: string,

  // Marketplace status
  status: 'open' | 'awarded' | 'cancelled' | 'expired',

  // Bid tracking
  bid_count: number,
  lowest_bid: number,
  highest_bid: number,

  // Award info
  selected_bid_id: string,
  awarded_to_company_id: string,
  awarded_at: Date,

  // Timestamps
  posted_at: timestamp,
  expires_at: Date,
  created_at: timestamp,
  updated_at: timestamp
}
```

##### MarketplaceBid Schema (`createMarketplaceBidSchema`)
```javascript
{
  // References
  marketplace_job_id: string,          // Marketplace job ID
  job_id: string,                      // Original job ID

  // Bidder info (VISIBLE - not anonymous)
  bidder_company_id: string,
  bidder_user_id: string,
  bidder_company_name: string,         // Denormalized for display

  // Bid details
  bid_amount: number,
  estimated_completion_days: number,
  notes: string,

  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn',

  // Response timestamps
  accepted_at: Date,
  rejected_at: Date,
  withdrawn_at: Date,

  // Timestamps
  created_at: timestamp,
  updated_at: timestamp
}
```

**MarketplaceManager Class Methods:**
- `postJobToMarketplace(jobId, jobData, companyId, userId)` - Post job to marketplace
- `placeBid(marketplaceJobId, jobId, bidData, companyId, userId, companyName)` - Place bid
- `acceptBid(marketplaceJobId, bidId, acceptingUserId)` - Accept bid and award job
- `getOpenMarketplaceJobs(excludeCompanyId)` - Browse available jobs
- `getBidsForJob(marketplaceJobId)` - Get all bids for a job
- `getJobsByCompany(companyId)` - Get company's posted jobs
- `cancelMarketplaceJob(marketplaceJobId)` - Cancel posting

---

## IMMEDIATE TODO: Disable Marketplace Button

### What Needs to Be Done
**Disable the Marketplace tab button when requirements are not met**

Current state: Button is clickable but shows warning card
Desired state: Button is disabled (not clickable) when requirements missing

**File:** `src/pages/CreateJob.jsx:1380-1397`

**Change Required:**
Add `disabled` prop to the Marketplace button that checks `!isMarketplaceAvailable()`

```javascript
<Button
  type="button"
  onClick={() => {
    handleInputChange('server_type', 'marketplace');
    handleInputChange('assigned_server_id', 'marketplace');
    setSelectedContractor(null);
    setContractorSearchText("");
  }}
  disabled={!isMarketplaceAvailable()}  // ← ADD THIS LINE
  className={`gap-2 justify-center transition-colors ${
    formData.server_type === 'marketplace'
      ? 'bg-white text-slate-900 shadow-sm hover:bg-white'
      : 'bg-transparent text-slate-600 hover:bg-slate-200'
  }`}
  variant="ghost"
>
  <Store className="w-4 h-4" />
  Marketplace
</Button>
```

**Optional Enhancement:**
Add a tooltip or visual indicator showing why the button is disabled

```javascript
<div className="relative">
  <Button
    type="button"
    onClick={() => { /* ... */ }}
    disabled={!isMarketplaceAvailable()}
    className={`gap-2 justify-center transition-colors ${
      formData.server_type === 'marketplace'
        ? 'bg-white text-slate-900 shadow-sm hover:bg-white'
        : 'bg-transparent text-slate-600 hover:bg-slate-200'
    }`}
    variant="ghost"
  >
    <Store className="w-4 h-4" />
    Marketplace
  </Button>
  {!isMarketplaceAvailable() && (
    <span className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs">
      !
    </span>
  )}
</div>
```

---

## Phase 3: Remaining Work - Marketplace Browser & Bidding

### Tasks Still Pending

#### 3.1 Update CreateJob.jsx to Post to Marketplace
**Location:** `src/pages/CreateJob.jsx` in `handleSubmit` function

After creating the job, if `server_type === 'marketplace'`, also create marketplace listing:

```javascript
// After job creation
if (formData.server_type === 'marketplace') {
  const user = await User.me();
  await MarketplaceManager.postJobToMarketplace(
    createdJob.id,
    formData,
    user.company_id,
    user.uid
  );
}
```

**Import Required:**
```javascript
import { MarketplaceManager } from '@/firebase/schemas';
```

#### 3.2 Create Marketplace Browser Page
**New File:** `src/pages/Marketplace.jsx`

**Features Needed:**
- Display all open marketplace jobs (excluding user's own company)
- Filter/search by location, service type, deadline
- Show job details: case number, defendant name, court, deadline, bid stats
- "Place Bid" button for each job
- Privacy: Show only city/state/ZIP (no street address)
- Show current bid count and range (lowest to highest)

**Component Structure:**
```javascript
export default function Marketplace() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showBidDialog, setShowBidDialog] = useState(false);

  useEffect(() => {
    loadMarketplaceJobs();
  }, []);

  const loadMarketplaceJobs = async () => {
    const user = await User.me();
    const openJobs = await MarketplaceManager.getOpenMarketplaceJobs(user.company_id);
    setJobs(openJobs);
  };

  // Job card rendering
  // Bid dialog
  // Filter controls
}
```

#### 3.3 Create Place Bid Dialog Component
**New File:** `src/components/marketplace/PlaceBidDialog.jsx`

**Fields:**
- Bid Amount (number input)
- Estimated Completion Days (number input)
- Notes (textarea - optional)

**Validation:**
- Bid amount must be positive number
- Cannot bid on own jobs
- Cannot place duplicate bids

**Submit Handler:**
```javascript
const handlePlaceBid = async () => {
  const user = await User.me();
  const company = user.company;

  await MarketplaceManager.placeBid(
    marketplaceJob.id,
    marketplaceJob.job_id,
    {
      bid_amount: parseFloat(bidAmount),
      estimated_completion_days: parseInt(completionDays),
      notes: bidNotes
    },
    user.company_id,
    user.uid,
    company.name
  );
};
```

#### 3.4 Add Marketplace Navigation
**File:** `src/pages/index.jsx` or main navigation

Add route and nav link:
```javascript
<Route path="/marketplace" element={<Marketplace />} />
```

#### 3.5 Create "My Marketplace Jobs" View
**Location:** Could be a tab in Jobs page or separate page

**Two Sections:**
1. **Jobs I Posted** - Jobs I posted to marketplace
   - Show all bids received
   - Accept/Reject bid buttons
   - Job status (open, awarded, cancelled)

2. **Jobs I Bid On** - Jobs I placed bids on
   - My bid details
   - Bid status (pending, accepted, rejected)
   - Other bid count (but not amounts - keep competitive)

#### 3.6 View Bids Component
**New File:** `src/components/marketplace/ViewBidsDialog.jsx`

**Features:**
- List all bids for a job
- Show company name, bid amount, completion estimate
- Show bid notes
- "Accept Bid" button (for job poster only)
- Highlight selected/winning bid

**Accept Bid Handler:**
```javascript
const handleAcceptBid = async (bidId) => {
  const user = await User.me();
  await MarketplaceManager.acceptBid(
    marketplaceJobId,
    bidId,
    user.uid
  );

  // Update the original job with assigned contractor
  await Job.update(jobId, {
    assigned_server_id: bid.bidder_company_id,
    server_type: 'contractor',
    status: 'assigned'
  });
};
```

#### 3.7 Add Notifications (Future Enhancement)
- Email notification when bid is placed
- Email notification when bid is accepted/rejected
- In-app notification badge
- Real-time updates using Firestore `onSnapshot`

#### 3.8 Add Marketplace Dashboard Widget
**Location:** `src/pages/Dashboard.jsx`

**Stats to Show:**
- Number of open marketplace jobs in your area
- Number of active bids you have placed
- Number of bids received on your posted jobs

---

## File Reference Guide

### Files Modified So Far
1. `src/pages/CreateJob.jsx` - Added marketplace tab, validation, info card
2. `src/firebase/database.js` - Added MarketplaceJob and MarketplaceBid entities
3. `src/firebase/schemas.js` - Added schemas and MarketplaceManager class

### Files That Need to Be Created
1. `src/pages/Marketplace.jsx` - Browse marketplace jobs
2. `src/components/marketplace/PlaceBidDialog.jsx` - Place bid UI
3. `src/components/marketplace/ViewBidsDialog.jsx` - View/accept bids UI
4. `src/components/marketplace/MarketplaceJobCard.jsx` - Job listing card
5. `src/pages/MyMarketplaceJobs.jsx` - Posted jobs and bids management

### Files That Need Updates
1. `src/pages/index.jsx` - Add marketplace routes
2. `src/pages/Layout.jsx` - Add marketplace nav link
3. `src/pages/CreateJob.jsx` - Add MarketplaceManager.postJobToMarketplace call in handleSubmit
4. `src/pages/Dashboard.jsx` - Add marketplace stats widget (optional)

---

## Key Business Rules

1. **Privacy**
   - Street addresses NEVER shown in marketplace listings
   - Only city, state, ZIP code visible
   - Service documents NOT shared until bid is accepted

2. **Bidding**
   - Bidder company names are VISIBLE (not anonymous)
   - One bid per company per job
   - Cannot bid on own jobs
   - Bids are binding once accepted

3. **Job Award**
   - When bid is accepted:
     - Marketplace job status → 'awarded'
     - Accepted bid status → 'accepted'
     - All other bids → 'rejected'
     - Original job assigned_server_id → winning company ID
     - Original job server_type → 'contractor'

4. **Validation**
   - Must have uploaded documents to post
   - Must have valid service address
   - Cannot submit without meeting requirements

---

## Testing Checklist (For Later)

### Job Posting
- [ ] Can post job to marketplace when requirements met
- [ ] Cannot post when missing documents
- [ ] Cannot post when missing address fields
- [ ] Marketplace job created with correct privacy (no street address)
- [ ] Document count accurate

### Bidding
- [ ] Can place bid on open jobs
- [ ] Cannot bid on own jobs
- [ ] Cannot place duplicate bids
- [ ] Bid stats update correctly (count, lowest, highest)
- [ ] Company name visible on bid

### Accepting Bids
- [ ] Can accept bid as job poster
- [ ] Cannot accept bid as non-poster
- [ ] Accepted bid updates correctly
- [ ] Other bids rejected automatically
- [ ] Original job assigned to winner
- [ ] Marketplace job status updates to 'awarded'

### Edge Cases
- [ ] What happens if job is deleted but marketplace listing exists?
- [ ] Can user cancel marketplace listing?
- [ ] Can user withdraw bid before acceptance?
- [ ] What if multiple people try to accept at same time?

---

## Quick Start When Resuming

1. **First:** Disable marketplace button when requirements not met
   - Add `disabled={!isMarketplaceAvailable()}` to button at line 1380

2. **Then:** Create marketplace browser page
   - Create `src/pages/Marketplace.jsx`
   - Add route in `src/pages/index.jsx`
   - Display open jobs using `MarketplaceManager.getOpenMarketplaceJobs()`

3. **Then:** Create bid placement
   - Create `src/components/marketplace/PlaceBidDialog.jsx`
   - Wire up `MarketplaceManager.placeBid()`

4. **Then:** Create bid acceptance
   - Create `src/components/marketplace/ViewBidsDialog.jsx`
   - Wire up `MarketplaceManager.acceptBid()`
   - Update original job assignment

5. **Finally:** Add to job creation
   - Update `handleSubmit` in CreateJob.jsx
   - Call `MarketplaceManager.postJobToMarketplace()` when marketplace selected

---

## Questions to Clarify Later

1. Should marketplace jobs auto-expire after X days?
2. Can users edit bids after placement?
3. Can users cancel marketplace listings?
4. Should there be a minimum/maximum bid amount?
5. Should we show distance from bidder to job location?
6. Should we have a rating system for completed marketplace jobs?
7. Do we want real-time updates or manual refresh?
8. Should bidders see how many other bids exist (yes, per schema)?
9. Should bidders see the bid range (lowest to highest)?
10. Notification preferences - email, in-app, both?

---

## End of Notes

Last Updated: 2025-10-09
Status: Phase 2 Complete - Database schemas created
Next Task: Disable marketplace button when requirements not met
