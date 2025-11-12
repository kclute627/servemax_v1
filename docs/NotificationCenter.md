# Notification Center Documentation

## Overview

The Notification Center is a centralized system for displaying actionable notifications to users at the top of the Dashboard. It uses a prominent **green banner** design and automatically hides when there are no notifications.

**Location:** `/src/components/dashboard/NotificationCenter.jsx`
**Used in:** `/src/pages/Dashboard.jsx`

---

## Current Features

### 1. **Partnership Requests**
- **Type:** `partnership`
- **Collection:** `partnership_requests`
- **Query:** `target_company_id == user.company_id && status == 'pending'`
- **Icon:** Purple Users icon
- **Actions:** Accept / Decline
- **Function:** `respondToPartnershipRequest`

**What happens when accepted:**
- Both companies become job share partners
- Complete company data is synced:
  - ✅ All addresses (full array)
  - ✅ Website
  - ✅ Fax
  - ✅ Email/Phone
  - ✅ Primary contact
  - ✅ Company type
- Each company appears as a client in the other's database
- Marked with `is_job_share_partner: true`

### 2. **Job Share Requests**
- **Type:** `job_share`
- **Collection:** `job_share_requests`
- **Query:** `target_company_id == user.company_id && status == 'pending'`
- **Icon:** Blue Briefcase icon
- **Actions:** Accept / Decline
- **Function:** `respondToShareRequest`

**What happens when accepted:**
- Job is assigned to accepting company
- Job appears in their job list
- Can be served and invoiced

---

## Design Guidelines

### Colors
```javascript
// Banner background
bg-gradient-to-r from-green-50 to-emerald-50

// Border
border-2 border-green-200

// Badge
bg-green-600 text-white

// Individual notification cards
bg-white border border-green-200
```

### Icons
- **Notification Center:** Bell icon with count badge
- **Partnership Requests:** Purple Users icon
- **Job Share Requests:** Blue Briefcase icon
- **Accept Button:** Green CheckCircle
- **Decline Button:** Red XCircle

### States
- **Collapsed:** Shows count and "You have X pending notifications"
- **Expanded:** Shows full list of notifications
- **No notifications:** Component doesn't render at all
- **Loading:** Individual button shows spinner during action

---

## Adding New Notification Types

### Step 1: Add Firestore Listener

```javascript
// In NotificationCenter.jsx useEffect
const [newNotifications, setNewNotifications] = useState([]);

const newNotificationQuery = query(
  collection(db, 'your_collection'),
  where('target_company_id', '==', companyId),
  where('status', '==', 'pending')
);

const unsubNew = onSnapshot(newNotificationQuery, (snapshot) => {
  const requests = snapshot.docs.map(doc => ({
    id: doc.id,
    type: 'your_type_name', // Important for identifying type
    ...doc.data()
  }));
  setNewNotifications(requests);
});

// Don't forget to clean up
return () => {
  unsubNew();
  // ... other unsubscribes
};
```

### Step 2: Update Total Count

```javascript
const totalNotifications =
  partnershipRequests.length +
  jobShareRequests.length +
  newNotifications.length; // Add your new type
```

### Step 3: Add Handler Function

```javascript
const handleNewNotificationResponse = async (requestId, accept) => {
  setResponding(requestId);
  try {
    const respond = httpsCallable(functions, 'yourCloudFunction');
    await respond({ requestId, accept });

    toast({
      title: accept ? "Success Title" : "Declined Title",
      description: "Your message here",
      variant: "success",
    });
  } catch (error) {
    console.error('Error:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: `Failed: ${error.message}`,
    });
  } finally {
    setResponding(null);
  }
};
```

### Step 4: Add Notification Card UI

```javascript
{/* Your New Notification Type */}
{newNotifications.map((request) => (
  <div
    key={request.id}
    className="bg-white rounded-lg border border-green-200 p-4 hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1">
        {/* Icon with color */}
        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <YourIcon className="w-5 h-5 text-orange-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              Your Notification Type
            </Badge>
          </div>

          {/* Title */}
          <h4 className="font-semibold text-slate-900 mb-1">
            {request.title}
          </h4>

          {/* Description */}
          <p className="text-sm text-slate-600 mb-2">
            {request.description}
          </p>

          {/* Metadata */}
          <p className="text-xs text-slate-500">
            {request.created_at?.toDate &&
              format(request.created_at.toDate(), 'MMM d, yyyy')
            }
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={() => handleNewNotificationResponse(request.id, true)}
          disabled={responding === request.id}
          className="bg-green-600 hover:bg-green-700"
        >
          {responding === request.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleNewNotificationResponse(request.id, false)}
          disabled={responding === request.id}
        >
          <XCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
))}
```

---

## Icon Color Recommendations

Use distinct colors for different notification types to help users quickly identify them:

| Color | Purpose | Example |
|-------|---------|---------|
| Purple (`bg-purple-100`, `text-purple-600`) | Partnership/Collaboration | Partnership requests |
| Blue (`bg-blue-100`, `text-blue-600`) | Jobs/Work | Job share requests |
| Orange (`bg-orange-100`, `text-orange-600`) | Alerts/Updates | System notifications |
| Green (`bg-green-100`, `text-green-600`) | Approvals/Success | Approval requests |
| Red (`bg-red-100`, `text-red-600`) | Urgent/Issues | Problem reports |
| Yellow (`bg-yellow-100`, `text-yellow-600`) | Warnings | Expiring items |

---

## Backend Requirements

### Firebase Cloud Function
Each notification type needs a corresponding Firebase Cloud Function:

```javascript
// functions/index.js
exports.yourHandlerFunction = onCall(async (request) => {
  try {
    // Validate auth
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { requestId, accept } = request.data;

    // Get the request document
    const requestDoc = await admin.firestore()
      .collection('your_collection')
      .doc(requestId)
      .get();

    // Process the request
    if (accept) {
      // Handle acceptance logic
      // Update status, create records, etc.
    } else {
      // Handle decline logic
      // Update status
    }

    return {
      success: true,
      message: accept ? "Accepted successfully" : "Declined"
    };
  } catch (error) {
    throw new HttpsError("internal", `Failed: ${error.message}`);
  }
});
```

### Firestore Security Rules
Update `/firestore.rules` to allow users to read and update their notifications:

```javascript
match /your_collection/{requestId} {
  allow read: if isAuthenticated() && (
    resource.data.requesting_company_id == getUserCompanyId() ||
    resource.data.target_company_id == getUserCompanyId()
  );

  allow update: if isAuthenticated() &&
    resource.data.target_company_id == getUserCompanyId();
}
```

---

## Best Practices

### 1. **Always Use Real-time Listeners**
```javascript
// ✅ Good - Real-time updates
const unsubscribe = onSnapshot(query, (snapshot) => {
  // Handle updates
});

// ❌ Bad - Requires manual refresh
const snapshot = await getDocs(query);
```

### 2. **Handle Loading and Error States**
```javascript
const [responding, setResponding] = useState(null);

// Always set responding state
setResponding(requestId);
try {
  await someFunction();
} finally {
  setResponding(null); // Always reset
}
```

### 3. **Provide Clear User Feedback**
```javascript
// Always show toast notifications
toast({
  title: "Clear action result",
  description: "Explain what happened",
  variant: "success" // or "destructive" for errors
});
```

### 4. **Type Safety**
Add a `type` field to each notification to distinguish them:
```javascript
const requests = snapshot.docs.map(doc => ({
  id: doc.id,
  type: 'partnership', // This helps identify the type
  ...doc.data()
}));
```

---

## Testing Checklist

When adding a new notification type:

- [ ] Firestore query returns correct pending items
- [ ] Notification appears in green banner
- [ ] Count badge updates correctly
- [ ] Accept button works and shows success toast
- [ ] Decline button works and shows success toast
- [ ] Loading spinner shows during action
- [ ] Notification disappears after action
- [ ] Real-time updates work (test with two browser windows)
- [ ] Error handling shows appropriate error toast
- [ ] Icon and colors are distinct from other types
- [ ] Mobile responsive layout works
- [ ] Firestore security rules prevent unauthorized access

---

## Troubleshooting

### Notifications not appearing
1. Check Firestore query - verify `where` clauses
2. Verify `companyId` is being passed correctly
3. Check browser console for errors
4. Verify Firestore security rules allow reading

### Actions not working
1. Check Cloud Function exists and is deployed
2. Verify function name matches in `httpsCallable`
3. Check Cloud Function logs for errors
4. Verify Firestore security rules allow updates

### Real-time updates not working
1. Ensure using `onSnapshot`, not `getDocs`
2. Verify cleanup function returns unsubscribe
3. Check for memory leaks (too many listeners)

---

## Future Enhancements

Potential improvements to consider:

1. **Notification Preferences**
   - Allow users to mute certain notification types
   - Email digest of notifications

2. **Notification History**
   - Show last 30 days of accepted/declined notifications
   - Archive old notifications

3. **Priority Levels**
   - High priority notifications shown first
   - Visual indicators for urgency

4. **Batch Actions**
   - "Accept All" / "Decline All" buttons
   - Multi-select for bulk actions

5. **Push Notifications**
   - Browser push notifications for new requests
   - Mobile app notifications

6. **Sound/Visual Alerts**
   - Optional sound when new notification arrives
   - Pulse animation on notification count

---

## Related Files

- `/src/components/dashboard/NotificationCenter.jsx` - Main component
- `/src/pages/Dashboard.jsx` - Where it's used
- `/functions/index.js` - Backend handlers
- `/firestore.rules` - Security rules
- `/src/components/ui/use-toast.jsx` - Toast system

---

## Questions?

For questions or issues with the Notification Center, check:
1. This documentation
2. Existing notification type implementations
3. Firebase Cloud Function logs
4. Browser console errors
