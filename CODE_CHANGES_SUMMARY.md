# Code Changes Summary

## Overview
Fixed "Missing or insufficient permissions" error when promoting to admin using code "1234". This required changes to 3 files to fix the Firestore rule evaluation order and Firebase operation type.

---

## Change 1: firestore.rules

### Location
Lines 36-42 (users collection match block)

### What Changed
**Reordered security rules so admin promotion rule executes FIRST**

Before:
```firestore
match /users/{userId} {
  allow read: if isOwnUser(userId);
  allow read: if isAdmin();
  
  // ❌ PROBLEM: This rule blocks ALL role updates
  allow update: if isOwnUser(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'createdAt']);
  
  // ❌ UNREACHABLE: This rule is checked second, but first rule already blocked it
  allow update: if isOwnUser(userId) && 
    request.resource.data.role == 'admin' && 
    resource.data.role != 'admin' &&
    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['createdAt', 'id', 'email']);
```

After:
```firestore
match /users/{userId} {
  allow read: if isOwnUser(userId);
  allow read: if isAdmin();
  
  // ✅ FIXED: This specific rule runs FIRST
  allow update: if isOwnUser(userId) && 
    request.resource.data.role == 'admin' && 
    resource.data.role != 'admin' &&
    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['createdAt', 'id', 'email']);
  
  // ✅ WORKS: This general rule runs only if admin promotion didn't match
  allow update: if isOwnUser(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'createdAt']);
```

### Why
Firestore security rules evaluate from top to bottom. The first matching rule applies, the rest are ignored. By placing the specific admin promotion rule first, it gets checked before the general "block role updates" rule.

### Validation
- Rule still prevents regular users from changing their own role (unless it's the admin promotion)
- Rule still prevents changing createdAt, id, or email during admin promotion
- Rule is one-time only (resource.data.role != 'admin')

---

## Change 2: services/firestore/users.ts

### Location
`upsertUserProfile()` function (lines 32-61)

### What Changed
**Use correct Firebase operation: `updateDoc` for existing docs, `setDoc` for new docs**

Before:
```typescript
export async function upsertUserProfile(user: AustangelUser): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, user.id);
  await setDoc(
    ref,
    {
      // ... 15+ fields ...
      updatedAt: Date.now(),
    },
    { merge: true }  // ❌ PROBLEM: This always uses setDoc, even for updates
  );
}
```

After:
```typescript
export async function upsertUserProfile(user: AustangelUser): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, user.id);
  const userDoc = await getDoc(ref);  // ✅ Check if exists
  
  const updateData = {
    // ... 15+ fields ...
    updatedAt: Date.now(),
  };

  if (userDoc.exists()) {
    // ✅ Use updateDoc for existing documents (triggers 'update' rule)
    await updateDoc(ref, updateData);
  } else {
    // ✅ Use setDoc for new documents (triggers 'create' rule)
    await setDoc(ref, updateData);
  }
}
```

### Why
- `setDoc(ref, data, {merge: true})` = "create or merge" operation → triggers `allow create` rule
- `updateDoc(ref, data)` = "update" operation → triggers `allow update` rule
- Our Firestore rule allows specific `update` operations for admin promotion
- Using setDoc never triggers the update rule, so the permission check always fails

### Performance Impact
- Minimal: Added one `getDoc()` call, but it's already cached after user login
- No change to database reads/writes (same operations, just categorized correctly)

---

## Change 3: app/(tabs)/settings.tsx

### Location
`handlePromoteToAdmin()` function (lines 50-78)

### What Changed
**Better error handling and logging**

Before:
```typescript
try {
  console.log('Updating user role to admin...');
  await upsertUserProfile({
    ...profile,
    role: 'admin' as UserRole,
  });
  console.log('Profile updated, reloading...');
  await reloadProfile();
  console.log('Profile reloaded successfully');
  Alert.alert('Success! 🎉', 'You are now an Admin. The changes should appear immediately.');
  setAdminCode('');
  setShowAdminCode(false);
} catch (error) {
  Alert.alert('Error', 'Failed to update role. Please try again.');  // ❌ Generic message
  console.error('Role update error:', error);  // Error details only in console
}
```

After:
```typescript
try {
  console.log('Current user role:', profile.role);  // ✅ Added debugging context
  console.log('Updating user role to admin...');
  await upsertUserProfile({
    ...profile,
    role: 'admin' as UserRole,
  });
  console.log('Profile updated, reloading...');
  await reloadProfile();
  console.log('Profile reloaded successfully');
  Alert.alert('Success! 🎉', 'You are now an Admin. The changes should appear immediately.');
  setAdminCode('');
  setShowAdminCode(false);
} catch (error: any) {
  console.error('Role update error:', error);
  const errorMsg = error?.message || 'Failed to update role. Please try again.';  // ✅ Show real error
  Alert.alert('Error', errorMsg);
}
```

### Why
- Users now see the actual Firebase error (e.g., "Missing or insufficient permissions") in the alert
- Added current role to logs for better debugging
- Type-safe error handling (`error: any` to safely access `.message`)

---

## Testing Checklist

After these changes, test the following:

### Admin Promotion (New Functionality)
- [ ] Enter admin code "1234" in Settings
- [ ] Should see success alert
- [ ] User role should change to 'admin' in Firestore
- [ ] No console errors

### Profile Updates (Existing Functionality)
- [ ] Change display name in Settings → should work
- [ ] Change other non-role fields → should work
- [ ] Try to change role manually in Firestore Console → should fail (security works)

### Edge Cases
- [ ] Admin tries to promote to admin again → should fail (one-time only)
- [ ] Try wrong admin code (e.g., "9999") → should show "Invalid Code"
- [ ] Try without being logged in → should show "User profile not found"

---

## Deployment Steps

1. **Update Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```
   Wait for confirmation: `✔️  Deploy complete!`

2. **Restart App**
   - Close app completely
   - Reopen
   - Or rebuild if using simulator: `npm run ios` or `npm run android`

3. **Test Admin Code**
   - Go to Settings tab
   - Scroll to Account section
   - Enter "1234"
   - Should see success

---

## Rollback Plan

If something goes wrong:

**Revert Firestore Rules:**
```bash
git checkout firestore.rules
firebase deploy --only firestore:rules
```

**Revert Code:**
```bash
git checkout services/firestore/users.ts
git checkout app/\(tabs\)/settings.tsx
npm run web  # or ios/android
```

---

## Related Files
- [FIXES_APPLIED.md](./FIXES_APPLIED.md) - Detailed explanation
- [firestore.rules](./firestore.rules) - Security rules
- [services/firestore/users.ts](./services/firestore/users.ts) - User service
- [app/(tabs)/settings.tsx](./app/(tabs)/settings.tsx) - Settings screen
