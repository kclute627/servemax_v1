# Job Sharing - Quick Testing Reference

## 🚀 Quick Start (5 minutes)

### 1. Deploy Everything
```bash
# Deploy Cloud Functions
cd functions
npm install
cd ..
firebase deploy --only functions

# Deploy Firestore Rules
firebase deploy --only firestore:rules
```

### 2. Setup Test Data
```bash
# Install dependencies (if needed)
npm install firebase-admin

# Run setup script
node setup-test-data.js
```

### 3. Access Test Page
Navigate to: `http://localhost:5173/test/job-sharing` (or your dev URL)

---

## ✅ Testing Checklist (Quick)

### Test 1: Auto-Assignment (2 min)
1. ✅ Create job with ZIP 90210
2. ✅ Check Cloud Function logs: `firebase functions:log --only autoAssignJobOnCreate`
3. ✅ Verify job has `job_share_chain` in Firestore
4. ✅ Check `job_share_requests` collection has new doc with `status: "accepted"`

**Expected**: Job automatically assigned to Company B within 3 seconds

### Test 2: Pending Requests (2 min)
1. ✅ Open test page → "Pending Requests" tab
2. ✅ See the test share request
3. ✅ Click "Accept Job"
4. ✅ Verify request disappears and job updated

**Expected**: Request accepted, job chain updated

### Test 3: Partner Management (2 min)
1. ✅ Open test page → "Partner Management" tab
2. ✅ See 2 partners listed
3. ✅ Click "Edit Settings" on one partner
4. ✅ Change ZIP codes, click "Save Settings"
5. ✅ Refresh page, verify changes persist

**Expected**: Settings saved to Firestore

### Test 4: Directory Search (2 min)
1. ✅ Open test page → "Directory Search" tab
2. ✅ Enter ZIP: 90210, click Search
3. ✅ See 2 companies
4. ✅ Click "Send Request" on one
5. ✅ Enter fee, click "Send Request"

**Expected**: New document in `job_share_requests` collection

---

## 🔍 Verification Commands

### Check Cloud Functions
```bash
# List all functions
firebase functions:list

# View logs
firebase functions:log --limit 50

# View specific function logs
firebase functions:log --only autoAssignJobOnCreate
```

### Check Firestore Data
Open Firebase Console → Firestore Database

**Collections to check**:
- `companies` → Look for `job_share_partners` array
- `jobs` → Look for `job_share_chain` object
- `job_share_requests` → All share requests
- `directory` → Company listings

### Check Browser Console
Open DevTools → Console tab
Look for:
- ✅ No red errors
- ✅ Firestore connection messages
- ✅ Component render logs

---

## 🐛 Common Issues & Fixes

### Issue: Auto-assignment not working
**Check**:
```bash
firebase functions:log --only autoAssignJobOnCreate
```
**Fix**:
- Verify ZIP code exactly matches: `"90210"` not `90210`
- Check `auto_assignment_enabled: true`
- Verify `relationship_status: "active"`

### Issue: Components not rendering
**Fix**:
```bash
# Check imports
grep -r "JobSharing" src/pages/

# Verify UI components exist
ls src/components/ui/card.jsx
ls src/components/ui/button.jsx
```

### Issue: Permission denied in Firestore
**Fix**:
```bash
# Redeploy rules
firebase deploy --only firestore:rules

# Check rules in Console
# Firebase Console → Firestore → Rules tab
```

### Issue: Functions not deploying
**Fix**:
```bash
# Check for syntax errors
cd functions
npm run lint

# Deploy with verbose logging
firebase deploy --only functions --debug
```

---

## 📊 Test Data IDs

Created by `setup-test-data.js`:

| Entity | ID | Purpose |
|--------|-----|---------|
| Company A | `test-company-a` | Originator, has partners |
| Company B | `test-company-b` | Partner with auto-accept |
| Company C | `test-company-c` | Partner requiring acceptance |
| Test Job | Check console output | Auto-assigns to Company B |

---

## 🔗 Quick Links

- **Test Page**: `/test/job-sharing`
- **Firebase Console**: https://console.firebase.google.com
- **Cloud Functions**: Firebase Console → Functions
- **Firestore Data**: Firebase Console → Firestore Database
- **Function Logs**: Firebase Console → Functions → Logs

---

## 📋 Manual Test Firestore Data

If setup script doesn't work, manually add to Company A:

### Navigate to:
Firebase Console → Firestore → companies → test-company-a

### Add field `job_share_partners`:
```json
[
  {
    "partner_company_id": "test-company-b",
    "partner_company_name": "Beta Process Serving",
    "partner_user_id": "user-b",
    "partner_type": "process_serving",
    "relationship_status": "active",
    "auto_assignment_enabled": true,
    "auto_assignment_zones": [
      {
        "zip_codes": ["90210", "90211"],
        "auto_assign_priority": 1,
        "default_fee": 75,
        "enabled": true
      }
    ],
    "requires_acceptance": false,
    "email_notifications_enabled": true,
    "total_jobs_shared": 0
  }
]
```

---

## 🎯 Success Criteria

### All Green ✅
- [ ] Cloud Functions deployed without errors
- [ ] Firestore rules deployed
- [ ] Test data created successfully
- [ ] Auto-assignment triggered for test job
- [ ] Can search directory
- [ ] Can send share request
- [ ] Can accept/decline request
- [ ] Job chain displays correctly
- [ ] Partner settings persist

### Ready for Production 🚀
When all tests pass, you're ready to:
1. Remove test data
2. Configure real partner relationships
3. Deploy to production
4. Monitor Cloud Function logs
5. Set up email notifications (replace console.log)

---

## 📞 Need Help?

1. **Check logs**: `firebase functions:log`
2. **Check console**: Browser DevTools → Console
3. **Check Firestore**: Firebase Console → Firestore
4. **Review docs**: `JOB_SHARING_IMPLEMENTATION.md`
5. **Full guide**: `JOB_SHARING_TESTING_GUIDE.md`

---

**Last Updated**: 2025-11-06
**Version**: 1.0.0
