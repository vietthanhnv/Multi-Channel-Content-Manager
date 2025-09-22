# Custom Content Type Troubleshooting Guide

## 🎯 What Should Work

### ✅ Adding Custom Content Types
1. Click the "+" button next to Content Type dropdown
2. Enter custom type name (e.g., "Tech Reviews")
3. Click "Save"
4. Custom type appears in dropdown with "(Custom)" label
5. Custom type is automatically selected

### ✅ Deleting Custom Content Types
1. Only custom types appear in "Custom Content Types" section
2. Each custom type has an "×" delete button
3. Clicking delete shows confirmation dialog
4. Confirming removes the custom type
5. If deleted type was selected, switches to "Other"

### ❌ What Cannot Be Deleted
- Gaming, Educational, Entertainment, Lifestyle, Other (predefined types)
- These should NEVER appear in the "Custom Content Types" section
- These should NEVER have delete buttons

## 🔧 Recent Fixes Applied

### 1. Added Safety Check in Delete Function
```typescript
const handleDeleteCustomType = (typeToDelete: string) => {
  // Safety check: only allow deletion of custom types
  const isCustomType = (state.userSettings.customContentTypes || []).includes(typeToDelete);
  if (!isCustomType) {
    console.warn('Attempted to delete predefined content type:', typeToDelete);
    return;
  }
  // ... rest of delete logic
};
```

### 2. Added Confirmation Dialog
- Now shows confirmation before deleting custom types
- Prevents accidental deletions

### 3. Improved UI Clarity
- Added subtitle: "Custom Content Types (You can delete these)"
- Added help text explaining predefined types cannot be deleted
- Better visual distinction between custom and predefined types

### 4. Fixed Initial State
- Added `customContentTypes: []` to initial state in AppContext
- Ensures the field exists from app startup

## 🐛 Potential Issues & Solutions

### Issue: "Can't delete old content type"

**Possible Causes:**
1. **Trying to delete predefined types**: Only custom types can be deleted
2. **UI confusion**: Predefined types don't have delete buttons
3. **State not updating**: App context or localStorage issues

**Solutions:**
1. **Check what you're trying to delete**: 
   - ✅ Custom types (appear in "Custom Content Types" section)
   - ❌ Predefined types (Gaming, Educational, etc.)

2. **Clear browser data and test**:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

3. **Verify custom types exist**:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('mcm_user_settings')));
   ```

### Issue: Delete button not working

**Check:**
1. Are you clicking the confirmation dialog "OK" button?
2. Check browser console for error messages
3. Verify you're in the "Custom Content Types" section, not the dropdown

### Issue: Custom types not saving

**Check:**
1. Browser localStorage permissions
2. Console errors during save operation
3. App context state updates

## 🧪 Testing Steps

### Test 1: Add Custom Type
1. Go to Dashboard → Add Channel
2. Click "+" next to Content Type
3. Enter "My Custom Type"
4. Click Save
5. ✅ Should appear in dropdown as "My Custom Type (Custom)"

### Test 2: Delete Custom Type
1. After adding custom type, scroll down
2. Find "Custom Content Types" section
3. Click "×" next to your custom type
4. Confirm deletion
5. ✅ Should be removed from dropdown and list

### Test 3: Verify Predefined Types
1. Check dropdown contains: Gaming, Educational, Entertainment, Lifestyle, Other
2. ✅ These should NOT appear in "Custom Content Types" section
3. ✅ These should NOT have delete buttons anywhere

## 🔍 Debug Commands

Open browser console and run:

```javascript
// Check current user settings
console.log('User Settings:', JSON.parse(localStorage.getItem('mcm_user_settings')));

// Add test custom types
const settings = JSON.parse(localStorage.getItem('mcm_user_settings') || '{}');
settings.customContentTypes = ['Tech Reviews', 'Gaming Tutorials'];
localStorage.setItem('mcm_user_settings', JSON.stringify(settings));
location.reload();

// Clear all data
localStorage.clear();
location.reload();
```

## 📞 If Still Having Issues

1. **Check browser console** for error messages
2. **Try in incognito mode** to rule out extension conflicts
3. **Clear localStorage** and test with fresh data
4. **Verify you're testing custom types**, not predefined ones

The key point is: **Only custom content types can be deleted, not the predefined ones (Gaming, Educational, Entertainment, Lifestyle, Other)**.