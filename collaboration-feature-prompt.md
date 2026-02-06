# Prompt: Build a Job Sharing / Collaboration System for a Process Serving Application

## Context

I am building a process serving management application (competitor to ServeManager). The tech stack is:

- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: Google Firebase (Firestore, Firebase Auth, Firebase Cloud Functions, Firebase Storage)

I need you to build a **Job Sharing / Collaboration system** that allows different companies (accounts) on the platform to share jobs between each other in real time. This is the core differentiating feature of the app — it connects law firms, process serving companies, and contract servers into a single workflow.

---

## How The Collaboration System Works (Business Logic)

There are **three roles** in the collaboration chain. A single user/account can occupy one or more of these roles depending on the relationship:

### 1. **The Process Serving Company (the "hub" / owner)**
- This is the primary account that owns the job
- They create jobs, manage the full lifecycle, and control all information flow
- They sit in the middle between their clients (law firms) and their contractors (field servers)
- They decide what information is visible to each side

### 2. **The Client (typically a Law Firm)**
- The entity that needs documents served
- They can be invited to collaborate so they can submit jobs directly, upload documents, and monitor status in real time — instead of calling/emailing
- When collaborating, they see the process serving company as their server — they **never** see the contractor/field server directly
- They get a **Client Portal Account** (can create jobs, view job status, see shared attempts/notes/affidavits, but cannot modify service details)
- Law firms who only collaborate with one company that invited them get **free access**

### 3. **The Contractor / Field Server (a subcontracted process server)**
- The person or company that physically goes out and serves the documents
- They can be invited to collaborate so they receive job assignments, log attempts, upload affidavits
- When collaborating, they see the process serving company as their client — they **never** see the actual law firm client directly
- They get a **limited-access account** (can view assigned jobs, record attempts, create affidavits, but cannot see billing to the law firm or modify job details beyond their scope)

### Information Flow Rules (CRITICAL)
```
Law Firm Client  <──────>  Process Serving Company  <──────>  Contract Server
       │                           │                              │
       │  sees company as          │  controls ALL               │  sees company as
       │  their server             │  information flow           │  their client
       │                           │                              │
       │  NEVER sees the     ◄─────┼─────►  NEVER sees the       │
       │  contractor               │        law firm              │
       └───────────────────────────┴──────────────────────────────┘
                          NO DIRECT CONTACT
```

### Visibility Controls (Per-Item Granularity)
Every piece of shared data (attempts, notes, affidavits, documents) has **per-item visibility controls**:

- **Visible to Client**: Yes/No — toggleable by the hub company
- **Visible to Server**: Yes/No — toggleable by the hub company
- **Email Notification**: Optionally email specific contacts when sharing

When a contractor records an attempt or uploads an affidavit, the hub company decides whether to share that with the law firm client. When the law firm adds a note, the hub company decides whether to share it with the contractor. The hub company is always the gatekeeper.

### Collaboration Setup Flow
1. Hub company creates a **Company record** in their contacts (with name, primary contact email)
2. Hub company assigns that company to at least one job (as either client or process server)
3. Hub company clicks **"Invite to Collaborate"** and selects the role:
   - **"Invite as Law Firm Client"** → sends email invitation to create a client-tier account
   - **"Invite as Contract Process Server"** → sends email invitation to create a server-tier account
4. Invitee receives email with a unique invitation link
5. If invitee already has an account on the platform → link to existing account
6. If invitee is new → create a limited-access account specific to their role
7. Once accepted, a **collaboration relationship** is established between the two accounts
8. All jobs where that company is assigned automatically become shared/visible to the collaborator
9. The invitation status shows as "pending" (exclamation icon) until accepted, then shows a "collaboration active" icon

### What Each Role Can See/Do On A Shared Job

#### Law Firm Client Can:
- View job details (recipient, addresses, court case, due dates, documents to be served)
- Create new jobs and assign them to the process serving company
- Upload documents to be served
- View attempts, notes, and affidavits that are marked **visible to client**
- See the process serving company as the server (never the contractor)
- View invoice issued to them
- Add notes (which the hub company can then choose to share with the contractor or not)

#### Contract Server Can:
- View assigned job details (recipient, addresses, service instructions, documents to be served)
- Accept or decline job assignments
- Record service attempts (with GPS, photos, timestamps, descriptions)
- Create and sign affidavits
- Add notes (which the hub company can then choose to share with the client or not)
- See the process serving company as the client (never the actual law firm)
- View/create their own invoice back to the hub company (the `process_server_invoice`)
- Has their own separate "instructions" field editable by the hub (distinct from client instructions)

#### Hub Company (Owner) Can:
- Full CRUD on all job data
- Toggle visibility of ANY item to client and/or server
- Email any contact about any item
- See everything from both sides
- Control whether contractors and clients are emailed about new jobs automatically (account-level setting)
- Forward/reassign jobs to different contractors

### Shared Jobs Count Toward Quotas
Jobs shared with you count toward your monthly job limit. The total = jobs you created + jobs your employees created + jobs shared with you.

---

## Critical Architecture Decision: How Job Sharing Actually Works

### It's NOT One Job With Multiple Viewers — It's Job Forwarding (Linked Copies)

**THIS IS THE MOST IMPORTANT ARCHITECTURAL DECISION IN THE ENTIRE SYSTEM. READ THIS CAREFULLY.**

When Company A "shares" or "assigns" a job to Company B, **a brand new job document is created in Company B's account**. This new job is linked back to the original via `sourceJobId`, but it is a completely separate Firestore document that B owns and has full control over. The original job gets updated with `forwardedToJobId` pointing to the new job.

**This is NOT:**
- One job document with multiple `accountId` fields for permissions
- One job document that multiple accounts can query
- A "shared view" into someone else's data
- Real-time sync between accounts

**This IS:**
- A copy/forward operation that creates a new independent job
- A doubly-linked list of related jobs across different accounts
- Each company having full ownership and control of their own job document
- Manual (or optionally automated) propagation of updates up/down the chain

### Why This Architecture? (Detailed Reasoning)

#### 1. Privacy Isolation Is Absolute

In a chain A → B → C → D:
- A knows about B (their direct server)
- A has ZERO knowledge that C or D exist
- D knows about C (their direct client)  
- D has ZERO knowledge that A or B exist
- B knows about A (upstream) and C (downstream) but cannot let them see each other
- C knows about B (upstream) and D (downstream) but cannot let them see each other

With a single shared document, you would need to:
- Redact fields based on who's reading (Firestore can't do this)
- Prevent queries that would reveal the existence of other parties
- Handle complex visibility logic in security rules

With linked copies, privacy is automatic:
- A's job document simply doesn't contain any reference to C or D
- D's job document simply doesn't contain any reference to A or B
- No redaction needed — the data literally doesn't exist in their document

#### 2. Each Company Is The "Hub" Of Their Own Job

When B receives a job from A and forwards it to C, B becomes the middle hub:

```
A's perspective:  "I hired B to serve these docs"
B's perspective:  "A is my client, C is my contractor, I manage both relationships"
C's perspective:  "B hired me to serve these docs"
```

B needs to be able to:
- Add internal notes that neither A nor C should ever see
- Track their own costs/margins (pay C $50, charge A $100)
- Modify service instructions for C without changing what A sent
- Report a simplified status to A while tracking detailed attempts from C
- Have their own job number, their own workflow, their own timeline

This is only possible if B has their own job document with full ownership.

#### 3. Billing Is Per-Relationship, Not Per-Job

In the chain A → B → C:

```
A's Job (Job 1):
  - client_invoice: null (A is the client, not being invoiced)
  - server_invoice: B invoices A for $200

B's Job (Job 2):
  - client_invoice: A owes B $200 (B's receivable)
  - server_invoice: C invoices B for $75 (B's payable)

C's Job (Job 3):
  - client_invoice: B owes C $75 (C's receivable)
  - server_invoice: (C did it themselves, or pays their employee)
```

B's profit margin ($125) is PRIVATE. A should never see that B only paid C $75. C should never see that B charged A $200. This requires separate invoice documents on separate jobs.

#### 4. Job Status Can Differ At Each Level

Real-world scenario:
- C logs an attempt: "Knocked on door, no answer, will retry tomorrow"
- C's job status: "In Progress"
- B sees this, but tells A: "Server made contact at location, following up"
- B's job status (visible to A): "In Progress" 
- B's internal status: "Waiting on contractor retry"

B might simplify, summarize, or delay reporting to A. This is normal business practice — you don't expose every granular detail to your client. Each company maintains their own job status that reflects their relationship with their direct client.

#### 5. Firestore Security Rules Are Simple

With linked copies:
```javascript
// Job can be read by owner, client collaborator, or server collaborator
match /jobs/{jobId} {
  allow read: if request.auth.token.accountId == resource.data.ownerAccountId
           || request.auth.token.accountId == resource.data.clientAccountId
           || request.auth.token.accountId == resource.data.processServerAccountId;
}
```

That's it. Three accounts max can read any single job. No complex chains, no recursive permission checks, no field-level redaction.

### The Forwarding Chain Example (Detailed)

```
SCENARIO: Law Firm A needs docs served in another state.
- A uses Regional Server B (who has a ServeManager account)
- B subcontracts to Local Server C (who has a ServeManager account)  
- C assigns to Field Contractor D (who has a ServeManager account)

WHAT GETS CREATED (4 separate job documents in 4 separate accounts):

┌─────────────────────────────────────────────────────────────────────┐
│ Job 1 (in A's account) - A is the OWNER                             │
│                                                                     │
│   ownerAccountId: "acct_a"                                          │
│   jobNumber: "A-2024-001"  ← A's internal numbering                 │
│   clientCompanyId: null  (A is the originating client)              │
│   clientAccountId: null                                             │
│   processServerCompanyId: "comp_b_in_a"  ← A's record for B         │
│   processServerAccountId: "acct_b"  ← B can READ this job           │
│   sourceJobId: null  ← this is the origin                           │
│   forwardedToJobId: "job_2"  ← link to B's copy                     │
│                                                                     │
│   WHO CAN SEE THIS JOB:                                             │
│   - A (owner): FULL access, all fields, all subcollections          │
│   - B (server): READ access, filtered subcollections by visibility  │
│                                                                     │
│   WHAT A SEES: Their job, B as server, status updates from B        │
│   WHAT B SEES: Job details, docs to serve, A as their client        │
│   C and D: DO NOT EXIST in this document, cannot query it           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ B "accepts" the job assignment
                                    │ Cloud Function creates Job 2
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Job 2 (in B's account) - B is the OWNER                             │
│                                                                     │
│   ownerAccountId: "acct_b"                                          │
│   jobNumber: "B-2024-047"  ← B's internal numbering (DIFFERENT!)    │
│   clientCompanyId: "comp_a_in_b"  ← B's record for A                │
│   clientAccountId: "acct_a"  ← A can READ this job                  │
│   processServerCompanyId: "comp_c_in_b"  ← B's record for C         │
│   processServerAccountId: "acct_c"  ← C can READ this job           │
│   sourceJobId: "job_1"  ← link back to A's original                 │
│   forwardedToJobId: "job_3"  ← link to C's copy                     │
│                                                                     │
│   WHO CAN SEE THIS JOB:                                             │
│   - B (owner): FULL access                                          │
│   - A (client): READ, filtered by visibility["client"]              │
│   - C (server): READ, filtered by visibility["server"]              │
│                                                                     │
│   CRITICAL: A and C both have access to THIS job, but:              │
│   - A only sees items with "client" in visibility                   │
│   - C only sees items with "server" in visibility                   │
│   - A cannot see processServerCompanyId/processServerAccountId      │
│   - C cannot see clientCompanyId/clientAccountId                    │
│   - They CANNOT see each other or know each other exists            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ C "accepts" the job assignment
                                    │ Cloud Function creates Job 3
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Job 3 (in C's account) - C is the OWNER                             │
│                                                                     │
│   ownerAccountId: "acct_c"                                          │
│   jobNumber: "C-2024-203"  ← C's internal numbering                 │
│   clientCompanyId: "comp_b_in_c"  ← C's record for B (NOT A!)       │
│   clientAccountId: "acct_b"  ← B can READ this job                  │
│   processServerCompanyId: "comp_d_in_c"  ← C's record for D         │
│   processServerAccountId: "acct_d"  ← D can READ this job           │
│   sourceJobId: "job_2"  ← link to B's job (NOT job_1!)              │
│   forwardedToJobId: "job_4"  ← link to D's copy                     │
│                                                                     │
│   CRITICAL: C's client is B, not A.                                 │
│   C has no field referencing A. A's account ID appears nowhere.     │
│   From C's perspective, this job came from B, period.               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ D "accepts" the job assignment
                                    │ Cloud Function creates Job 4
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Job 4 (in D's account) - D is the OWNER                             │
│                                                                     │
│   ownerAccountId: "acct_d"                                          │
│   jobNumber: "D-2024-891"  ← D's internal numbering                 │
│   clientCompanyId: "comp_c_in_d"  ← D's record for C                │
│   clientAccountId: "acct_c"  ← C can READ this job                  │
│   processServerCompanyId: null  (D does it themselves)              │
│   employeeProcessServerId: "emp_xyz"  ← D's field employee          │
│   sourceJobId: "job_3"  ← link to C's job                           │
│   forwardedToJobId: null  ← end of the chain                        │
│                                                                     │
│   D's client is C. D has never heard of A or B.                     │
│   D's job document contains zero references to A or B.              │
└─────────────────────────────────────────────────────────────────────┘
```

### What Data Gets Copied When Forwarding

When B accepts a job from A (creating Job 2 from Job 1), the `forwardJobToServer` Cloud Function copies:

**COPIED (these are duplicated into the new job):**
- `recipient` object (name, description, physical characteristics)
- `addresses` array (where to serve)
- `dueDate`
- `rush` flag
- `courtCaseId` (reference, may need to create a copy in B's court_cases)
- `documents_to_be_served` subcollection (files copied to B's storage, or referenced)

**NOT COPIED (these are specific to each job):**
- `jobNumber` — B gets their own job number
- `jobStatus` — B starts fresh
- `serviceStatus` — B starts fresh
- `serviceInstructions` — B writes their own instructions for C
- `instructionsFromClient` — filled with what A wrote (now A's instructions TO B)
- `attempts` subcollection — B starts fresh, will have their own attempts
- `notes` subcollection — B starts fresh
- `invoices` subcollection — B has their own billing relationships
- `serverAcceptance` — B might require C to accept

**TRANSFORMED:**
- A's `processServerCompanyId` points to B → B's `clientCompanyId` points to A
- The relationship flips: B was the server, now B is the owner and A is the client

### How Updates Flow Up The Chain (Manual Propagation)

When D's field server successfully serves the documents:

```
STEP 1: D logs attempt on Job 4
─────────────────────────────────
Job 4 (D's job):
  attempts/att_001:
    description: "Served John Smith personally at front door"
    success: true
    servedAt: "2024-01-15T14:30:00Z"
    visibility: ["client"]  ← D shares with C
    gps: { lat: 34.0522, lng: -118.2437 }
    attachments: [photo_of_service.jpg]

D's job status: "Served"
C can now see this attempt on Job 4.

STEP 2: C sees it, decides to inform B
──────────────────────────────────────
C logs on, sees the successful attempt from D.
C creates a note (or attempt summary) on Job 3 for B:

Job 3 (C's job):
  notes/note_001:
    body: "Service completed by our field server. Docs served personally."
    visibility: ["client"]  ← C shares with B
    createdByAccountId: "acct_c"

C updates Job 3 status: "Served"
C might also upload the affidavit D provided.
B can now see this note on Job 3.

STEP 3: B sees it, decides to inform A
──────────────────────────────────────
B logs on, sees C's update.
B creates a note on Job 2 for A:

Job 2 (B's job):
  notes/note_001:
    body: "Service of process completed successfully in Los Angeles County."
    visibility: ["client"]  ← B shares with A
    createdByAccountId: "acct_b"

B updates Job 2 status: "Served"
B uploads the final affidavit (maybe after reviewing/approving it).
A can now see this note on Job 2.

STEP 4: A sees the final result
───────────────────────────────
A logs on, sees B's update and the affidavit.
A's view: "B served my documents successfully"
A has no idea that C or D were involved.
A downloads the affidavit, marks their internal case as served.
```

**Key insight:** Each company decides what to share and how to phrase it. B might wait until they've reviewed the affidavit before telling A. B might summarize multiple attempts into one update. B maintains their professional relationship with A independently of their relationship with C.

### Why NOT Automatic Sync?

You might think: "Why not automatically propagate attempts up the chain?"

**Reasons for manual propagation:**
1. **Quality control** — B might want to review C's work before A sees it
2. **Professional presentation** — B might rephrase "couldn't find address" as "conducting skip trace"
3. **Timing control** — B might batch updates rather than spamming A
4. **Error handling** — if C makes a mistake, B can fix it before A sees
5. **Value-add** — B's service IS the management layer; auto-sync removes their value
6. **Liability** — B takes responsibility for what they tell A

**Optional enhancement:** You COULD build an "auto-propagate" toggle where marking something visible to client automatically creates a copy on the upstream job. But this should be opt-in, not default.

### Company Records In Each Account

Notice that each job references company IDs like `comp_b_in_a` or `comp_a_in_b`. This is because:

**Each account has their OWN copy of company records in the `companies` collection.**

When A works with B:
- A has a company record for B: `companies/comp_b_in_a` with `ownerAccountId: "acct_a"`
- B has a company record for A: `companies/comp_a_in_b` with `ownerAccountId: "acct_b"`

These are DIFFERENT documents. A's record for B might have notes like "reliable, but slow to invoice." B's record for A might have notes like "high volume client, priority." These are private to each account.

When the `forwardJobToServer` function creates Job 2 in B's account, it needs to:
1. Find or create B's company record for A (the client)
2. Use that `companyId` as `clientCompanyId` on Job 2

### Implications For The Data Model

Each job document needs these linking fields:
```
- sourceJobId: string | null         // The upstream job this was forwarded FROM
- sourceAccountId: string | null     // The account that owns the source job
- forwardedToJobId: string | null    // The downstream job created when forwarding
- forwardedToAccountId: string | null // The account that owns the forwarded job
```

These create a **doubly-linked list** of related jobs across accounts:
```
Job 1 ←──────────────────→ Job 2 ←──────────────────→ Job 3 ←──────────────────→ Job 4
      forwardedToJobId           forwardedToJobId           forwardedToJobId
      ←sourceJobId               ←sourceJobId               ←sourceJobId
```

### The `forwardJobToServer` Cloud Function (Critical)

This is the most important Cloud Function in the system. When triggered:

**Input:**
- `sourceJobId` — the job being forwarded
- `targetAccountId` — the server's account that will receive it

**Process:**
1. Verify the caller owns the source job
2. Verify the target account has an active collaboration as "server"
3. Create a new job document in the target account:
   - `ownerAccountId` = targetAccountId
   - `sourceJobId` = sourceJobId
   - `sourceAccountId` = caller's accountId
   - Copy recipient, addresses, documents, due date, etc.
   - `clientCompanyId` = find/create a company record in target's account representing the source owner
   - `clientAccountId` = source owner's accountId
4. Update the source job:
   - `forwardedToJobId` = new job's ID
   - `forwardedToAccountId` = targetAccountId
5. Copy documents_to_be_served (either duplicate files in storage, or create references)
6. Return the new job ID

---

## Data Model (Firestore)

Design the Firestore collections to support all of the above. Here is the suggested structure — adapt as needed.

### CRITICAL: The `companies` Collection Is Universal

**All external entities live in ONE single top-level `companies` collection.** Law firms, contractor process servers, government agencies, individual clients — they are ALL just documents in the `companies` collection, differentiated only by a `companyType` field. There is no separate collection for "clients" vs "contractors" vs "law firms." They are all companies.

The `companyType` field is how you know what kind of entity it is, but it does NOT restrict what role a company can play on a job. A company with `companyType: "Process Server"` can be assigned as the `processServerCompanyId` on a job. A company with `companyType: "Law Firm"` can be assigned as the `clientCompanyId`. But they all live in the same collection and share the same schema.

Each company also has an embedded `contacts` array for the individual people at that company (attorneys, paralegals, process servers, etc.). When you assign a company to a job, you also optionally assign one of their contacts.

The `collaborations` collection then defines the **relationship** between two `accounts` — it says "Account A invited Company X to collaborate as a client" or "Account A invited Company Y to collaborate as a contractor." The company record itself doesn't change; the collaboration record layered on top is what grants cross-account access.

Think of it this way:
- `companies` = your address book (every entity you work with)
- `accounts` = platform accounts with login access and subscriptions
- `collaborations` = the bridge that links a company in your address book to a live platform account, enabling real-time job sharing

A company can exist in your `companies` collection without ever collaborating (you just manage their info locally). Collaboration is an optional layer you add on top.

---

### `accounts` collection
Each account represents a subscribing organization on the platform (the entity that logs in, pays, has a subscription tier).
```
accounts/{accountId}
  - companyName: string
  - phone: string
  - email: string
  - website: string
  - monthlyJobQuota: number
  - monthJobCount: number
  - accountTier: "full" | "client_limited" | "server_limited"
  - createdAt: timestamp
  - updatedAt: timestamp
  - settings: {
      autoEmailClientOnNewJob: boolean
      autoEmailServerOnNewJob: boolean
      defaultVisibility: {
        client: boolean
        server: boolean
      }
    }
```

### `accounts/{accountId}/employees` subcollection
People who work under this account and can log in.
```
  - firstName: string
  - lastName: string
  - email: string
  - phone: string
  - licenseNumber: string
  - permission: "owner" | "admin" | "limited" | "server_only"
  - userId: string (Firebase Auth UID)
```

### `companies` collection (TOP-LEVEL — single unified collection for ALL entity types)

**⚠️ THIS IS THE SINGLE MOST IMPORTANT DATA MODEL DECISION: There is only ONE `companies` collection.
There is NO separate "clients" collection. There is NO separate "contractors" collection. There is NO
separate "law_firms" collection. Law firms, process servers, contractors, government agencies,
individuals — they ALL live in `companies`. Period.**

This is the central address book. Every law firm, every contractor, every government office, every individual — they all go here. Each company belongs to the account that created it (`ownerAccountId`), meaning it's that account's contact/address-book entry. Different accounts can each have their own company record for the same real-world entity.

**Example:** If "ABC Process Serving" (the hub account) works with "Smith & Associates Law Firm"
as a client AND "Quick Serve LLC" as a contractor, both are just documents in the `companies`
collection owned by ABC's account. When ABC creates a job, they pick Smith & Associates from
their companies list and assign it to `clientCompanyId`, and pick Quick Serve from the same
companies list and assign it to `processServerCompanyId`. Same collection, same schema, different
field on the job.
```
companies/{companyId}
  - ownerAccountId: string (the account whose address book this belongs to)
  - name: string (required)
  - companyType: string (enumerated — see values below)
  - website: string
  - privateNote: string (internal notes, never shared with collaborators)
  - createdAt: timestamp
  - updatedAt: timestamp
  - archivedAt: timestamp | null

  // Collaboration state (populated when a collaboration is established)
  - collaborating: boolean (default false)
  - collaborationAccountId: string | null (the account ID of the collaborating entity, if active)

  // Nested arrays for contact info
  - phoneNumbers: [{
      label: "Office" | "Mobile" | "Fax" | "Pager" | "Home" | "Other"
      number: string
    }]
  - emailAddresses: [{
      label: "Work" | "Home" | "General" | "Other"
      email: string
    }]
  - addresses: [{
      label: string ("Company" | "Corporate" | "Branch" | "Home" | custom)
      address1: string
      address2: string
      city: string
      state: string
      postalCode: string
      county: string
      lat: number
      lng: number
      primary: boolean
    }]

  // Contacts = the people at this company (attorneys, paralegals, servers, etc.)
  - contacts: [{
      id: string (auto-generated unique ID for this contact entry)
      firstName: string
      lastName: string
      title: string
      email: string
      phone: string
      licenseNumber: string
      licenseExpiration: string
      dob: string
      primary: boolean
    }]
```

**`companyType` enumerated values** (custom values also allowed):
- `""` (empty/unset)
- `"Attorney"`
- `"Contractor"`
- `"Government"`
- `"Individual"`
- `"Law Firm"`
- `"Paralegal"`
- `"Process Server"`

### `collaborations` collection (top-level for querying both sides)
Defines the active sharing relationship between two accounts. The `companyId` field links back to the specific company record in the hub's address book that this collaboration is associated with.
```
collaborations/{collaborationId}
  - hubAccountId: string (the account that initiated and controls the collaboration)
  - collaboratorAccountId: string | null (the invited company's account ID — null while pending)
  - collaboratorRole: "client" | "server"
  - status: "pending" | "active" | "revoked"
  - invitedEmail: string
  - invitedAt: timestamp
  - acceptedAt: timestamp | null
  - invitationToken: string (unique UUID for the invitation link)
  - companyId: string (the companies/{companyId} record in the hub's address book that this collaboration is for)
```

**End-to-end example showing how `companies`, `collaborations`, and `jobs` connect:**

```
STEP 1: Hub account "ABC Process Serving" (accountId: "acct_abc") creates two company records:

  companies/comp_smith  →  { ownerAccountId: "acct_abc", name: "Smith & Associates", companyType: "Law Firm", collaborating: false }
  companies/comp_quick  →  { ownerAccountId: "acct_abc", name: "Quick Serve LLC", companyType: "Process Server", collaborating: false }

  ↑ Both are in the SAME `companies` collection. One is a law firm, one is a contractor.
    They are just contact records at this point — no collaboration, no live access.

STEP 2: ABC creates a job and assigns both companies from their address book:

  jobs/job_001 → {
    ownerAccountId: "acct_abc",
    clientCompanyId: "comp_smith",         ← law firm, from `companies` collection
    processServerCompanyId: "comp_quick",  ← contractor, from SAME `companies` collection
    clientAccountId: null,                 ← no collaboration yet
    processServerAccountId: null,          ← no collaboration yet
    ...
  }

STEP 3: ABC invites Smith & Associates to collaborate as a client:

  collaborations/collab_001 → {
    hubAccountId: "acct_abc",
    companyId: "comp_smith",       ← points to the company record in `companies`
    collaboratorRole: "client",
    collaboratorAccountId: null,   ← pending, they haven't accepted yet
    status: "pending",
    ...
  }

STEP 4: Smith & Associates accepts, creating their own account "acct_smith":

  collaborations/collab_001 → { ...collaboratorAccountId: "acct_smith", status: "active" }
  companies/comp_smith      → { ...collaborating: true, collaborationAccountId: "acct_smith" }
  jobs/job_001              → { ...clientAccountId: "acct_smith" }  ← Cloud Function backfills this

  Now Smith & Associates can log in and see job_001 because clientAccountId matches their account.
```

### `jobs` collection
Jobs reference companies by their `companyId` from the unified `companies` collection. Both the client and the process server on a job are just company records picked from the same collection — the only difference is which field they're assigned to.
```
jobs/{jobId}
  - ownerAccountId: string (the hub company/account that owns this job)
  - jobNumber: string (auto-generated, user-facing — never use the Firestore doc ID for display)
  - jobStatus: string
  - serviceStatus: "Attempted" | "Non-Service" | "Served" | null
  - rush: boolean
  - dueDate: timestamp
  - serviceInstructions: string (hub's instructions to the server)
  - instructionsFromClient: string (read-only from hub's perspective; written by client)
  - clientJobNumber: string (the client's own reference number for this job)
  - createdAt: timestamp
  - updatedAt: timestamp
  - createdByUserId: string
  - archivedAt: timestamp | null
  
  // Recipient
  - recipient: {
      name: string
      description: string
      age: string
      ethnicity: string
      gender: string
      weight: string
      height: string
      hair: string
      eyes: string
    }
  
  // Company Assignments — ALL of these reference the `companies` collection
  // The client and server are both just companies. Their role is determined by
  // which field they occupy on the job, NOT by their companyType.
  - clientCompanyId: string | null       // companies/{id} — the law firm or entity requesting service
  - clientContactId: string | null       // the contact ID within that company's contacts array
  - clientAccountId: string | null       // IF collaborating: the account ID of the client's platform account
  - processServerCompanyId: string | null // companies/{id} — the contractor/server assigned to do the work
  - processServerContactId: string | null // the contact ID within that company's contacts array
  - processServerAccountId: string | null // IF collaborating: the account ID of the server's platform account
  - employeeProcessServerId: string | null // accounts/{}/employees/{} — if an internal employee is the server
  
  // Court Case (reference to court_cases collection)
  - courtCaseId: string | null
  
  // Server acceptance
  - requireServerAcceptance: boolean
  - serverAcceptance: {
      response: "pending" | "accepted" | "declined" | null
      declineReason: string | null
      declinedAt: timestamp | null
    }
  
  // Addresses for the job (where to serve — separate from company addresses)
  - addresses: [{
      label: string
      address1: string
      address2: string
      city: string
      state: string
      postalCode: string
      county: string
      lat: number
      lng: number
      primary: boolean
    }]
  
  // Job Chain Linking (for forwarded/shared jobs)
  - sourceJobId: string | null        // The upstream job this was forwarded FROM (null if originated here)
  - sourceAccountId: string | null    // The account that owns the source job
  - forwardedToJobId: string | null   // The downstream job created when this job was forwarded (null if not forwarded yet)
  - forwardedToAccountId: string | null // The account that owns the forwarded job
```

### `jobs/{jobId}/attempts` subcollection
```
  - description: string
  - servedAt: timestamp
  - success: boolean
  - serveType: string
  - lat: number
  - lng: number
  - gpsTimestamp: timestamp
  - gpsAccuracy: number
  - createdByAccountId: string (which account logged this)
  - createdByUserId: string
  - recipient: { ... same as job recipient schema ... }
  - addressSnapshot: { ... address at time of attempt ... }
  - attachments: [{ fileName, downloadUrl, contentType }]
  - visibility: ["client", "server"] // array, controls who can see this
  - emailedTo: [{ name: string, email: string }]
  - createdAt: timestamp
  - updatedAt: timestamp
```

### `jobs/{jobId}/notes` subcollection
```
  - label: string
  - body: string
  - createdByAccountId: string
  - createdByUserId: string
  - createdByName: string
  - visibility: ["client", "server"]
  - emailedTo: [{ name: string, email: string }]
  - sharedFrom: string | null (which account originally created this)
  - createdAt: timestamp
```

### `jobs/{jobId}/documents` subcollection
Covers documents to be served, misc attachments, and affidavits:
```
  - title: string
  - documentType: "service_document" | "misc_attachment" | "affidavit"
  - fileName: string
  - storagePath: string (Firebase Storage path)
  - downloadUrl: string
  - contentType: string
  - fileSize: number
  - pageCount: number
  - isAffidavit: boolean
  - isSigned: boolean
  - referenceNumber: string
  - receivedAt: timestamp
  - visibility: ["client", "server"]
  - uploadedByAccountId: string
  - createdAt: timestamp
  - updatedAt: timestamp
```

### `jobs/{jobId}/invoices` subcollection
```
  - invoiceType: "client_invoice" | "server_invoice"
  - issuedOn: timestamp | null
  - paidOn: timestamp | null
  - balanceDue: number
  - totalPaid: number
  - terms: string
  - lineItems: [{
      name: string
      description: string
      unitCost: number
      quantity: number
    }]
  - payments: [{
      amount: number
      description: string
      appliedOn: timestamp
    }]
  - createdByAccountId: string
  - createdAt: timestamp
  - updatedAt: timestamp
```

---

## Job Chain Synchronization: What Updates Automatically vs. Manually

When jobs are linked in a chain (A → B → C → D), there are important decisions about what data should sync across jobs and in which direction. This section defines the synchronization rules.

### The Two Directions

```
UPSTREAM (toward the originating client):
Job 4 → Job 3 → Job 2 → Job 1
   D       C       B       A
   
Used for: Status updates, completion notifications, "reporting to client"

DOWNSTREAM (toward the field server):
Job 1 → Job 2 → Job 3 → Job 4
   A       B       C       D
   
Used for: Job detail changes, cancellations, due date updates, document additions
```

### Field Categories: What Can Sync vs. What's Local-Only

#### DOWNSTREAM-SYNCABLE FIELDS (Source of Truth = Originating Client)
These fields represent "what needs to be done" and should flow DOWN when the upstream client makes changes:

```
- recipient (name, description, physical characteristics)
- addresses (where to serve)
- documents_to_be_served (the actual papers)
- dueDate
- rush flag
- courtCaseId / court case details
```

**Rationale:** If Law Firm A realizes they gave the wrong address, EVERYONE downstream needs the correction. The originating client is the source of truth for the service request itself.

#### LOCAL-ONLY FIELDS (Each Job Owns Its Own)
These fields are specific to each company's operation and should NEVER sync:

```
- jobNumber (each company has their own numbering)
- jobStatus (each company tracks their own workflow)
- serviceStatus (each company reports their own status)
- serviceInstructions (each hub writes their own instructions to their server)
- attempts subcollection (belongs to the job where it was logged)
- notes subcollection (each company has their own notes)
- invoices subcollection (billing is per-relationship)
- serverAcceptance (specific to each assignment)
- processServerCompanyId / processServerAccountId (each hub assigns their own contractor)
```

**Rationale:** B might be "In Progress" while simultaneously telling A they're "On It" — these are different statuses for different audiences. Each company maintains their own operational state.

#### UPSTREAM-REPORTABLE FIELDS (Manual Push, Not Auto-Sync)
These fields can be pushed UP the chain, but only manually and one level at a time:

```
- serviceStatus (when you want to inform your client of completion)
- Attempt summaries (create a note summarizing downstream attempts)
- Affidavits (share the final proof of service)
```

**Rationale:** Each hub controls the narrative to their client. B decides when and how to tell A that service is complete. This is a professional service, not a raw data feed.

### Automatic vs. Manual Sync Rules

#### AUTOMATIC DOWNSTREAM SYNC (Triggers Immediately)

| Trigger | What Syncs | Direction | Notification |
|---------|-----------|-----------|--------------|
| Upstream job recipient/address updated | recipient, addresses | Down entire chain | System note + email to each owner |
| Upstream job adds new document | New document copied | Down entire chain | System note + email |
| Upstream job due date changed | dueDate, rush | Down entire chain | System note + email (urgent if sooner) |
| Upstream job cancelled | jobStatus → "Cancelled" | Down entire chain | System note + email + auto-archive |

**Implementation:** These use Firestore triggers. When `recipient` or `addresses` changes on a job that has `forwardedToJobId`, automatically propagate down.

#### MANUAL UPSTREAM SYNC (Button Click Required)

| Action | What Happens | Direction | Notification |
|--------|-------------|-----------|--------------|
| "Report Status to Client" button | Creates note on upstream job with status update | Up one level | Note visible to client |
| "Share Affidavit with Client" button | Copies affidavit document to upstream job | Up one level | Document visible to client |
| "Mark Complete for Client" button | Updates serviceStatus on upstream job + creates note | Up one level | Note + email to client |

**Implementation:** These are explicit Cloud Function calls triggered by UI buttons. The user chooses when to report.

### Sync Scenarios In Detail

#### Scenario 1: Address Correction Flows Down

```
BEFORE:
Job 1 (A): addresses: [{ address1: "123 Main St" }]  ← WRONG
Job 2 (B): addresses: [{ address1: "123 Main St" }]  ← copied wrong
Job 3 (C): addresses: [{ address1: "123 Main St" }]  ← copied wrong
Job 4 (D): addresses: [{ address1: "123 Main St" }]  ← copied wrong

A realizes the mistake, updates Job 1:
Job 1 (A): addresses: [{ address1: "456 Oak Ave" }]  ← CORRECTED

AUTOMATIC DOWNSTREAM SYNC TRIGGERS:

Job 2 (B): 
  - addresses updated to [{ address1: "456 Oak Ave" }]
  - System note added: "Address updated by upstream client (Law Firm A)"
  - Email sent to B's owner

Job 3 (C):
  - addresses updated to [{ address1: "456 Oak Ave" }]
  - System note added: "Address updated by upstream client"
  - Email sent to C's owner
  (Note: C's note says "upstream client" not "Law Firm A" — C doesn't know about A)

Job 4 (D):
  - addresses updated to [{ address1: "456 Oak Ave" }]
  - System note added: "Address updated by upstream client"
  - Email sent to D's owner
```

#### Scenario 2: Cancellation Cascades Down

```
A decides to cancel the job (maybe they settled the case):

Job 1 (A):
  - jobStatus: "Cancelled"
  - archivedAt: now()
  - cancellationNote: "Case settled, service no longer needed"

AUTOMATIC DOWNSTREAM CANCEL TRIGGERS:

Job 2 (B):
  - jobStatus: "Cancelled"
  - archivedAt: now()
  - System note: "Job cancelled by upstream client. Reason: Case settled"
  - Email to B: "Job B-2024-047 has been cancelled by your client"

Job 3 (C):
  - jobStatus: "Cancelled"
  - archivedAt: now()
  - System note: "Job cancelled by upstream client"
  - Email to C: "Job C-2024-203 has been cancelled by your client"
  (Note: C sees "your client" = B, not A)

Job 4 (D):
  - jobStatus: "Cancelled"
  - archivedAt: now()
  - System note: "Job cancelled by upstream client"
  - Email to D: "Job D-2024-891 has been cancelled by your client"
```

#### Scenario 3: Status Reported Up Manually

```
D's server successfully serves the documents and logs an attempt on Job 4.

D clicks "Report to Client" button:
  → Cloud Function: propagateStatusUpstream({ jobId: "job_4", status: "Served", note: "Served personally at residence" })

Job 3 (C) receives:
  - New note: "Status update from contractor: Served personally at residence"
  - note.visibility: ["client"] (visible to B, C's client)
  - C's job serviceStatus NOT automatically changed (C controls their own status)

C reviews the update, clicks "Report to Client" button:
  → Cloud Function: propagateStatusUpstream({ jobId: "job_3", status: "Served", note: "Service completed in Los Angeles County" })

Job 2 (B) receives:
  - New note: "Status update from contractor: Service completed in Los Angeles County"
  - note.visibility: ["client"] (visible to A, B's client)

B reviews, adds the affidavit, clicks "Mark Complete for Client":
  → Updates Job 2 serviceStatus to "Served"
  → Creates note on Job 1: "Service of process completed successfully"
  → Copies affidavit to Job 1 documents

A finally sees: Job marked served, affidavit available for download.
A has no idea C or D exist. A just knows B did their job.
```

#### Scenario 4: Due Date Changed to Urgent

```
A realizes they need service sooner — court date moved up.

Job 1 (A):
  - dueDate: changed from Jan 20 to Jan 12
  - rush: changed from false to true

AUTOMATIC DOWNSTREAM SYNC:

Job 2, 3, 4 all receive:
  - dueDate: Jan 12
  - rush: true
  - System note: "⚠️ URGENT: Due date moved up by upstream client. New deadline: Jan 12"
  - Email with URGENT flag to each owner
```

#### Scenario 5: New Document Added Mid-Chain

```
A realizes they forgot to include an additional summons.

Job 1 (A):
  - documents_to_be_served: new document added "Second Summons.pdf"

AUTOMATIC DOWNSTREAM SYNC:

Job 2 (B):
  - Document copied to Job 2's documents_to_be_served
  - System note: "New document added by upstream client: Second Summons.pdf"
  - Email to B

Job 3 (C):
  - Document copied
  - System note: "New document added by upstream client"
  
Job 4 (D):
  - Document copied
  - System note: "New document added by upstream client"

All downstream servers now have the new document to serve.
```

### Edge Cases and Conflict Handling

#### Edge Case 1: Update Arrives After Attempt Already Made

```
D already attempted service at the old address (failed, nobody home).
Then A's address correction arrives.

Job 4 (D):
  - addresses: UPDATED to new address
  - Existing attempt: UNCHANGED (historical record preserved)
  - System note: "Address updated. Previous attempts were at old address."
  
D now knows to retry at the new address. The old attempt is preserved as a record
of what happened, with the old address in its `addressSnapshot` field.
```

#### Edge Case 2: Cancellation Arrives After Service Complete

```
D successfully served the documents. Then A cancels (oops, too late).

The cancellation still propagates, but:
- Job 4 (D): jobStatus becomes "Cancelled" BUT the attempt record remains
- System note: "Job cancelled by upstream client. Note: Service was already completed."
- This is a billing/dispute situation to be resolved by humans
- The system preserves all records
```

#### Edge Case 3: Middle of Chain Blocks Propagation

```
What if B doesn't want C to receive updates from A?

Currently: Not supported. Downstream sync is automatic and mandatory.

Rationale: If B accepted the job from A and forwarded to C, B has an obligation
to keep C informed of material changes. B can't "block" safety-critical info
like address corrections.

Future enhancement: B could mark their job as "detached" which breaks the auto-sync
but also breaks the link. B would then be responsible for manual updates to C.
```

#### Edge Case 4: Chain Has a Gap (Account Deleted or Collaboration Revoked)

```
A → B → C → D, but B's account is suspended or B revokes collaboration with A.

The chain is broken:
- A's Job 1 still has forwardedToJobId pointing to Job 2
- Job 2 still exists but B can't access it
- Downstream sync from A fails at Job 2

Handling:
- Sync function catches the error
- A receives notification: "Unable to sync to downstream jobs. Collaboration may have been revoked."
- C and D continue operating independently (they still have their jobs)
- A would need to establish new collaboration with C directly (if they knew C existed, which they don't)

This is a rare edge case that may require manual intervention.
```

### Data Model Additions for Sync Tracking

Add these fields to the job document to track sync state:

```
jobs/{jobId}
  // ... existing fields ...
  
  // Sync tracking
  - lastSyncedAt: timestamp | null           // When this job was last synced from upstream
  - lastSyncedFields: string[]               // Which fields were updated in last sync
  - syncErrors: [{                           // Any sync failures
      timestamp: timestamp
      direction: "upstream" | "downstream"
      error: string
      targetJobId: string
    }]
  - detachedFromChain: boolean               // If true, don't auto-sync (manual override)
```

Add a sync history subcollection for audit trail:

```
jobs/{jobId}/syncHistory/{syncId}
  - timestamp: timestamp
  - direction: "upstream" | "downstream"
  - initiatedByAccountId: string
  - initiatedByUserId: string
  - syncType: "details" | "status" | "cancel" | "due_date" | "document"
  - fieldsChanged: string[]
  - sourceJobId: string | null
  - targetJobId: string | null
  - success: boolean
  - errorMessage: string | null
```

---

## Firestore Security Rules

Write Firestore security rules that enforce:

1. **`companies` collection**: A company record can only be read/written by the account that owns it (`ownerAccountId`). Collaborators do NOT directly read the other side's company records — the job document already contains the denormalized company name and contact info they need for their view. This prevents information leakage.
2. **Job owners** (where `ownerAccountId` matches the user's account) have full CRUD
3. **Client collaborators** (where `clientAccountId` matches AND a valid active collaboration exists) can:
   - READ job details
   - CREATE new jobs (assigning themselves as client)
   - READ subcollection items ONLY where `"client"` is in the `visibility` array, OR the item was created by their account
   - CREATE notes
   - UPLOAD documents to be served
   - CANNOT modify service details, attempts, or invoices belonging to the hub
3. **Server collaborators** (where `processServerAccountId` matches AND a valid active collaboration exists) can:
   - READ assigned job details
   - UPDATE `serverAcceptance` field (accept/decline)
   - CREATE attempts and affidavits
   - CREATE notes
   - READ subcollection items ONLY where `"server"` is in the `visibility` array, OR the item was created by their account
   - CREATE/UPDATE `server_invoice` type invoices
   - CANNOT see client invoices or client-only notes
4. **No direct access** between client collaborators and server collaborators — they can never query each other's data

---

## Firebase Cloud Functions

Build Cloud Functions for:

### 1. `sendCollaborationInvitation`
- Triggered when a collaboration document is created with status "pending"
- Generates a unique invitation token/link
- Sends an email (use a mail service or Firebase Extension) with:
  - The hub company name
  - The role being invited for
  - A link to accept and create/link an account

### 2. `acceptCollaborationInvitation`
- HTTP callable function
- Validates the invitation token
- Creates or links the collaborator's account (sets `collaboratorAccountId` on the collaboration doc)
- Updates the collaboration status to "active"
- Updates the corresponding `companies/{companyId}` record: sets `collaborating: true` and `collaborationAccountId` to the new account ID
- Sets the `clientAccountId` or `processServerAccountId` on all existing jobs where that `companyId` is assigned as `clientCompanyId` or `processServerCompanyId` respectively

### 3. `onJobCreated`
- Firestore trigger on `jobs/{jobId}` create
- Looks up the `clientCompanyId` and `processServerCompanyId` in the `companies` collection
- Checks if either company has `collaborating: true` and an active collaboration doc
- If so, auto-populates `clientAccountId` or `processServerAccountId` on the job from the company's `collaborationAccountId`
- If `autoEmailClientOnNewJob` or `autoEmailServerOnNewJob` is true in account settings, sends notification emails to the relevant company's primary contact
- If server acceptance is required, sets `serverAcceptance.response` to "pending"

### 4. `onAttemptCreated`
- Firestore trigger on `jobs/{jobId}/attempts/{attemptId}` create
- If created by a collaborating server, applies the hub account's default visibility settings
- Sends email notifications to contacts listed in `emailedTo`

### 5. `onNoteCreated`
- Same pattern as attempts — apply default visibility, send emails

### 6. `toggleVisibility`
- HTTP callable function
- Only callable by the hub account (job owner)
- Accepts: `{ jobId, subcollection, documentId, visibility: ["client"] | ["server"] | ["client", "server"] | [] }`
- Updates the visibility array on the specified subcollection document

### 7. `monthlyJobCountTracker`
- Firestore trigger that increments/decrements `monthJobCount` on the account when jobs are created/deleted
- Includes shared jobs in the count
- Blocks job creation if quota exceeded

### 8. `forwardJobToServer` (CRITICAL for job chaining)
- HTTP callable function
- Called when a server collaborator "accepts" a job, OR when the hub explicitly forwards a job to a collaborating server
- Creates a NEW job document in the server's account with:
  - `ownerAccountId` = the server's account
  - `clientCompanyId` = a company record in the server's account representing the hub (may need to create this)
  - `clientAccountId` = the hub's account (so hub can see the downstream job)
  - `sourceJobId` = the original job's ID
  - `sourceAccountId` = the original job's owner account
  - Copies: recipient, addresses, documents to be served, court case info, due date, rush flag, service instructions
- Updates the ORIGINAL job document:
  - `forwardedToJobId` = the new job's ID
  - `forwardedToAccountId` = the server's account
- Returns the new job ID

### 9. `propagateStatusUpstream`
- HTTP callable function
- Called when a hub wants to push a status update to their upstream client
- **Input:** `{ jobId, status?, note?, includeAffidavit? }`
- **Process:**
  1. Verify caller owns the job
  2. Check if `sourceJobId` exists (if not, this is the origin — nothing to propagate to)
  3. Create a note on the source job:
     - `body`: the provided note, or auto-generated status message
     - `visibility`: `["client"]` (visible to the source job's owner)
     - `createdByAccountId`: caller's account
     - `label`: "Status Update from Server"
  4. If `includeAffidavit` is true, copy any affidavit documents to source job
  5. Optionally update `serviceStatus` on source job if status provided
  6. Log to `syncHistory` subcollection
- **Returns:** `{ success: boolean, noteId: string }`

### 10. `syncJobDetailsDownstream` (AUTOMATIC — Firestore Trigger)
- Firestore trigger on `jobs/{jobId}` update
- **Triggers when:** `recipient`, `addresses`, or `dueDate` fields change on a job that has `forwardedToJobId`
- **Process:**
  1. Get the downstream job (`forwardedToJobId`)
  2. Update the downstream job with changed fields:
     - Copy `recipient` if changed
     - Copy `addresses` if changed  
     - Copy `dueDate` and `rush` if changed
  3. Create a system note on downstream job:
     - `body`: "Job details updated by upstream client. Changed: [field list]"
     - `label`: "System: Upstream Update"
     - `visibility`: `["client", "server"]` (visible to all)
     - `isSystemNote`: true
  4. Send email notification to downstream job owner
  5. Log to `syncHistory` on both jobs
  6. **Recursively continue:** If downstream job also has `forwardedToJobId`, repeat the process
- **Privacy:** Notes say "upstream client" not the actual company name (downstream shouldn't know who's above their direct client)

### 11. `syncDocumentDownstream` (AUTOMATIC — Firestore Trigger)
- Firestore trigger on `jobs/{jobId}/documents/{docId}` create
- **Triggers when:** A new `documentType: "service_document"` is added to a job with `forwardedToJobId`
- **Process:**
  1. Get the downstream job
  2. Copy the document to downstream job's documents subcollection:
     - Duplicate the file in Firebase Storage (or create a reference)
     - Create new document record with same metadata
     - Set `visibility`: `["client", "server"]`
  3. Create system note: "New document added by upstream client: [filename]"
  4. Send email notification
  5. Recursively continue down the chain
- **Note:** Only `service_document` type syncs. Affidavits and misc attachments do NOT auto-sync.

### 12. `cancelJobDownstream` (AUTOMATIC — Firestore Trigger)
- Firestore trigger on `jobs/{jobId}` update
- **Triggers when:** `jobStatus` changes to "Cancelled" on a job with `forwardedToJobId`
- **Process:**
  1. Get the downstream job
  2. Update downstream job:
     - `jobStatus`: "Cancelled"
     - `archivedAt`: now()
  3. Create system note with cancellation reason:
     - `body`: "Job cancelled by upstream client. Reason: [reason if provided]"
     - `label`: "System: Cancellation"
  4. Send URGENT email notification to downstream owner
  5. Recursively continue down the chain (cancel entire downstream tree)
  6. Log to `syncHistory`
- **Cannot be undone:** Once cancelled, jobs stay cancelled. Would need to create new jobs to restart.

### 13. `syncChainManual` (HTTP Callable — For Manual Full Resync)
- HTTP callable function for manual intervention
- **Input:** 
```typescript
{
  jobId: string;
  syncType: "full_refresh_downstream" | "status_upstream" | "cancel_downstream";
  options?: {
    propagationDepth?: number;  // How many levels (null = entire chain)
    includeDocuments?: boolean; // Re-copy all documents
    statusNote?: string;        // Note for status updates
    cancellationReason?: string; // Reason for cancellation
  }
}
```
- **Process by syncType:**

  **full_refresh_downstream:**
  1. Verify caller owns the job
  2. Get downstream job
  3. Re-copy ALL downstream-syncable fields (recipient, addresses, dueDate, rush, documents)
  4. Create note: "Full job refresh from upstream client"
  5. Continue recursively up to `propagationDepth` levels

  **status_upstream:**
  1. Verify caller owns the job
  2. Get upstream job (`sourceJobId`)
  3. Create note on upstream job with status info
  4. If propagationDepth > 1, caller can push multiple levels up (unusual but allowed)

  **cancel_downstream:**
  1. Verify caller owns the job
  2. Cancel this job and all downstream jobs
  3. Same as automatic cancel but manually triggered

- **Returns:** `{ success: boolean, jobsAffected: string[], errors: string[] }`

### 14. `onChainSyncFailure` (Error Handler)
- Triggered when any sync operation fails
- **Process:**
  1. Log the failure to `syncErrors` array on the source job
  2. Send notification to the job owner: "Sync failed to downstream/upstream job"
  3. Create a system note on the job documenting the failure
  4. Retry logic: attempt 3 times with exponential backoff
  5. If all retries fail, mark job with `syncErrors` and notify admin

---

## React Frontend Components To Build

### 1. `<CollaborationManager />`
- Accessed from the Companies section
- Shows list of all collaborations with status (pending/active/revoked)
- "Invite to Collaborate" button that opens a modal asking for role selection (Law Firm or Process Server)
- Shows collaboration icon or pending icon next to company names

### 2. `<InvitationAcceptPage />`
- Public page (no auth required initially) at route `/invitation/:token`
- Validates the token
- If user is logged in → link collaboration to their account
- If user is new → show registration form (limited fields) → create account → link collaboration
- Shows who invited them and in what role

### 3. `<SharedJobView />`
- The job detail view, but context-aware based on the viewer's role
- If viewer is the **hub/owner**: shows everything, with visibility toggle controls (eye icons) on every attempt, note, affidavit, and document
- If viewer is a **client collaborator**: shows job details, only items with `visibility` containing `"client"`, hides the process server company/contractor info entirely, shows the hub company as the server
- If viewer is a **server collaborator**: shows job details, only items with `visibility` containing `"server"`, hides the actual law firm client info, shows the hub company as the client

### 4. `<VisibilityToggle />`
- Reusable component shown on attempts, notes, affidavits, documents
- Two toggle icons: eye/crossed-eye for "Client" and "Server"
- Only shown to hub/owner users
- onClick calls `toggleVisibility` cloud function
- Shows current state visually (green eye = visible, red crossed circle = hidden)

### 5. `<ServerAcceptancePanel />`
- Shown to server collaborators when `requireServerAcceptance` is true and `response` is "pending"
- "Accept" and "Decline" buttons
- Decline requires a reason
- Updates the job's `serverAcceptance` field

### 6. `<JobCreationForm />` (Client Variant)
- For law firm collaborators creating jobs
- Pre-fills the client company as themselves
- Pre-fills the process server company as the hub company they're collaborating with
- Allows: recipient details, addresses, court case, documents upload, instructions, due date, rush flag
- Does NOT allow: assigning contractors, setting service instructions (only "instructions from client")

### 7. `<CollaboratorDashboard />`
- Limited dashboard for client and server limited accounts
- Shows only jobs shared with them
- Filters/search within their shared jobs
- Quick stats: pending jobs, served, attempts count

### 8. `<JobChainIndicator />`
- Visual indicator shown on jobs that are part of a chain
- Shows: upstream link (if `sourceJobId` exists), downstream link (if `forwardedToJobId` exists)
- Clicking upstream/downstream navigates to that job (if user has access)
- Shows chain position: "Origin", "Middle", "End"
- Example display: `← From: Smith & Associates | → To: Quick Serve LLC`
- If user doesn't have access to linked job, shows "Forwarded" without clickable link

### 9. `<ReportToClientPanel />`
- Panel shown on jobs that have `sourceJobId` (jobs received from a client)
- Contains "Report to Client" button
- On click, opens modal with:
  - Status dropdown (Served, Non-Service, In Progress, etc.)
  - Note textarea for custom message
  - Checkbox: "Include affidavit documents"
  - Checkbox: "Mark job complete for client"
- Calls `propagateStatusUpstream` Cloud Function
- Shows confirmation: "Status reported to [Client Company Name]"

### 10. `<ChainSyncStatus />`
- Shows sync status for jobs in a chain
- Displays:
  - Last synced timestamp
  - Sync errors (if any)
  - "Resync" button for manual full refresh
- Shows warning icon if `syncErrors` array has entries
- Expandable to show `syncHistory` audit trail

### 11. `<UpstreamUpdateBanner />`
- Alert banner shown at top of job when `lastSyncedAt` is recent (within 24 hours)
- Message: "This job was updated by your client on [date]. Fields changed: [list]"
- Dismissable, but reappears if new sync occurs
- Links to the system note with full details

### 12. `<CancelJobModal />`
- Modal for cancelling a job
- If job has `forwardedToJobId`, shows warning: "This will also cancel all downstream jobs in the chain"
- Requires cancellation reason (text input)
- Shows list of downstream jobs that will be affected (if any)
- Confirm button triggers `cancelJobDownstream` or regular cancel

---

## Implementation Order

Build in this order:
1. Firestore data model and security rules
2. Collaboration invitation flow (Cloud Functions + frontend)
3. Job creation with collaboration fields
4. Shared job view with role-based rendering
5. Visibility toggle system
6. Attempt/note/document creation with visibility defaults
7. Server acceptance/decline flow
8. **Job forwarding flow (`forwardJobToServer` function + UI)**
9. **Chain sync functions (automatic downstream sync triggers)**
10. **Chain sync UI components (`<JobChainIndicator />`, `<ReportToClientPanel />`, etc.)**
11. Email notifications
12. Job quota counting with shared jobs
13. Client-variant job creation form

---

## Important Implementation Notes

- Use Firebase Auth custom claims to store the user's `accountId` and `accountTier` so security rules can reference them without extra reads
- Use Firestore composite indexes for queries like "all jobs where clientAccountId == X AND archivedAt == null"
- The `visibility` array pattern (`["client", "server"]`) makes security rules straightforward: `request.auth.token.role in resource.data.visibility`
- For real-time updates, use Firestore `onSnapshot` listeners on shared jobs so collaborators see changes instantly
- When the hub company changes visibility on an item, all connected collaborators see the update in real time
- Never expose the `processServerAccountId` to client collaborators or `clientAccountId` to server collaborators in any query or response — this is a hard privacy boundary
- Use Firebase Storage security rules that mirror the Firestore document visibility (check the parent document's visibility array before allowing file download)
- Keep invitation tokens as UUIDs stored in the collaboration document — validate server-side only, never trust the client
- **Chain sync functions must handle recursion carefully** — use a visited set to prevent infinite loops if data somehow becomes circular
- **Chain sync should be transactional where possible** — if updating Job 2 fails, don't continue to Job 3 (use Firestore batched writes or transactions)
- **System notes created by sync should be visually distinct** — use `isSystemNote: true` and render with different styling (e.g., gray background, system icon)
- **Email notifications for chain sync should be throttled** — if multiple fields change at once, send one email not five

---

## Test Scenarios To Verify

### Basic Collaboration
1. Law firm creates a job → hub company sees it → hub assigns a contractor → contractor sees it (but not the law firm) → contractor logs an attempt → hub toggles it visible to client → law firm sees the attempt
2. Contractor declines a job → hub sees decline reason → hub reassigns to different contractor
3. Hub revokes collaboration → collaborator immediately loses access to all shared jobs
4. Client collaborator tries to access server-only data → Firestore rules block it
5. Shared job counts toward both the hub's and collaborator's monthly quotas
6. Invitation token used twice → second use rejected
7. Hub creates a note visible to nobody → neither client nor server can see it
8. Contractor uploads an affidavit → hub makes it visible to client → client downloads it

### Job Forwarding Chain
9. A→B→C chain: A creates job, assigns to B → B accepts, new job created in B's account with sourceJobId pointing to A's job → A's job gets forwardedToJobId pointing to B's job → B assigns to C → C accepts, new job in C's account → B's job updated with forwardedToJobId → Verify: A can see B's job (as client), B can see C's job (as client), A CANNOT see C's job, C CANNOT see A's job
10. Chain privacy: In A→B→C, C logs an attempt → B sees it (if visible to client) → B manually creates a note on A's job to inform A → A sees B's note but has no knowledge of C
11. Chain billing: A invoices B (on A's job), B invoices C (on B's job), C invoices D (on C's job) — all separate invoice documents on separate jobs
12. Forwarded job contains correct copies: When B accepts A's job, verify B's new job has copied recipient, addresses, documents, court case, due date, rush flag correctly
13. Breaking the chain: B revokes collaboration with C → C loses access to B's job, but A→B relationship unaffected

### Chain Synchronization (Downstream — Automatic)
14. Address correction: A updates address on Job 1 → Job 2, 3, 4 all receive updated address automatically → Each job gets system note "Address updated by upstream client" → Each owner receives email notification
15. Due date change (more urgent): A changes due date from Jan 20 to Jan 10 → All downstream jobs updated → System notes flag as URGENT → Emails sent with urgent flag
16. Due date change (less urgent): A extends due date → All downstream jobs updated → Normal notification (not urgent)
17. Document addition: A adds new document to Job 1 → Document copied to Job 2, 3, 4 → System notes created → Verify file exists in each job's storage
18. Cancellation cascade: A cancels Job 1 → Job 2, 3, 4 all cancelled automatically → System notes include cancellation reason → All jobs archived → Emails sent to all owners
19. Partial chain cancellation: B cancels Job 2 → Job 3, 4 cancelled → Job 1 NOT affected (A's job stays active, A just lost their server)
20. Sync after attempt: D already made attempt at old address → A corrects address → D's job updated, old attempt preserved with `addressSnapshot` of old address → System note mentions previous attempts were at old address

### Chain Synchronization (Upstream — Manual)
21. Report status: D clicks "Report to Client" → Note created on Job 3 visible to C → C clicks "Report to Client" → Note created on Job 2 visible to B → B clicks "Report to Client" → Note created on Job 1 visible to A → A sees final status
22. Share affidavit: D uploads affidavit, clicks "Share with Client" → Affidavit copied to Job 3 → C shares to Job 2 → B shares to Job 1 → A can download affidavit
23. Mark complete: D marks Job 4 complete for client → `serviceStatus` on Job 3 optionally updated → C decides whether to mark Job 2 complete → Each level controls their own status

### Chain Sync Edge Cases
24. Sync failure: A updates address but Job 2 sync fails (e.g., B's account suspended) → Error logged on Job 1 → A notified "Sync failed" → Job 3, 4 NOT updated (chain broken at Job 2)
25. Retry logic: Sync fails due to temporary network issue → System retries 3x with backoff → If succeeds on retry 2, chain continues normally
26. Rapid updates: A changes address 3 times in 1 minute → Downstream jobs receive latest value only (debounce/coalesce) → One notification email, not three
27. Circular prevention: Somehow Job 4 gets `forwardedToJobId` pointing to Job 1 (data corruption) → Sync function detects cycle, stops, logs error
28. Sync history audit: Admin can view `syncHistory` subcollection → Shows all syncs with timestamps, fields changed, initiator, success/failure

### UI Components for Chain Sync
29. Chain indicator: Job 2 (middle of chain) shows both ← upstream and → downstream indicators → Clicking each navigates to that job
30. Chain indicator privacy: C views Job 3 → Sees ← indicator (link to Job 2, their client) → Does NOT see any reference to Job 1 (A's job)
31. Report panel: Job with `sourceJobId` shows "Report to Client" panel → Filling out form and submitting creates note on upstream job
32. Upstream update banner: Job 3 receives address update → Banner appears: "Updated by your client 5 mins ago" → Dismissing banner hides it until next sync
33. Cancel modal: B tries to cancel Job 2 which has forwarded to Job 3 → Modal warns "This will also cancel 2 downstream jobs" → Lists Job 3, Job 4 → Confirming cancels all three
