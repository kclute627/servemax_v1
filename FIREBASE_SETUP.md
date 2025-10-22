# Firebase Setup Guide

## Quick Setup (After Firebase Project is Created)

### 1. Deploy Firestore Rules and Indexes

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase (if not already logged in)
firebase login

# Initialize project (if not already done)
firebase use servemax-8d818

# Deploy rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

### 2. Manual Index Creation (Alternative Method)

If you prefer to create indexes manually or the automated deployment doesn't work:

#### For client_stats collection:
1. Go to [Firebase Console > Firestore > Indexes](https://console.firebase.google.com/v1/r/project/servemax-8d818/firestore/indexes)
2. Click "Create Index"
3. Collection ID: `client_stats`
4. Add fields in this order:
   - `company_id` (Ascending)
   - `year` (Ascending)
   - `month` (Ascending)
   - `metrics.total_billed` (Descending)
5. Click "Create"

#### For server_stats collection:
1. Click "Create Index" again
2. Collection ID: `server_stats`
3. Add fields in this order:
   - `company_id` (Ascending)
   - `year` (Ascending)
   - `month` (Ascending)
   - `performance.success_rate` (Descending)
4. Click "Create"

#### Additional indexes (for queries without month filter):
- **client_stats**: `company_id`, `year`, `metrics.total_billed` (desc)
- **server_stats**: `company_id`, `year`, `performance.success_rate` (desc)

### 3. Required Collections

Make sure these collections exist in Firestore:
- ✅ `companies`
- ✅ `users`
- ✅ `company_stats`
- ✅ `client_stats`
- ✅ `server_stats`
- ✅ `directory`
- ✅ `invitations`

### 4. Test the Setup

After creating indexes:
1. Try registering a new user
2. Check if dashboard loads without errors
3. Create a test job to verify stats tracking

## Troubleshooting

### "The query requires an index" Error
- Check if the specific index exists in Firebase Console
- Index creation can take a few minutes after deployment
- Verify the field names match exactly (case-sensitive)

### Registration Errors
- Check Firebase Console > Authentication to ensure user was created
- Verify Firestore rules allow user document creation
- Check browser console for specific error details

### Dashboard Loading Issues
- Verify all required collections exist
- Check that user has proper company_id set
- Ensure indexes are built and active (not building)

## Development Notes

- Indexes are built automatically when first needed in development
- Production requires explicit index creation
- Stats collections will be empty until jobs/invoices are created
- Dashboard gracefully handles empty collections