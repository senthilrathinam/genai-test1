# Document-First Workflow Update

## Summary
Updated the grant creation flow to make URL optional when a document is uploaded, and automatically parse uploaded documents without requiring manual button clicks.

## Changes Made

### 1. Grant Creation Form (`app/grants/new/page.tsx`)

**URL Field**:
- Now optional when a file is uploaded
- Shows dynamic label: "(optional when file uploaded)"
- Uses file name as fallback URL if none provided
- Placeholder text changes based on file selection

**File Upload Field**:
- Now required if no URL is provided
- Either URL or file must be provided (not both required)

**Auto-parsing**:
- When a file is uploaded, it's automatically parsed
- No manual "Parse Questions" button click needed
- User is redirected directly to the review page after parsing
- Shows "Uploading document..." and "Parsing questions..." status

### 2. API Updates (`app/api/grants/route.ts`)

**Empty URL Handling**:
- Handles empty/missing grant URLs gracefully
- Uses empty string as default if no URL provided
- Source type detection works with empty URLs

### 3. UI Updates (`app/grants/[id]/page.tsx`)

**URL Display**:
- Only shows URL link if `grant.grant_url` exists
- Prevents broken links for document-only grants

### 4. Documentation (`README.md`)

**Updated Usage Flow**:
- Clarified document-first approach
- Emphasized automatic parsing for uploaded files
- Reorganized steps to reflect new workflow

## User Experience

### Before:
1. Enter grant name
2. Enter URL (required)
3. Upload file (optional)
4. Click "Create Grant"
5. Click "Parse Questions from Document"
6. Wait for parsing
7. Redirected to review page

### After:
1. Enter grant name
2. Upload file (URL becomes optional)
3. Click "Create Grant"
4. Automatically uploads and parses
5. Redirected to review page

**Result**: 2 fewer clicks, faster workflow

## Validation Rules

- **Grant Name**: Always required
- **URL**: Required ONLY if no file uploaded
- **File**: Required ONLY if no URL provided
- At least one of URL or File must be provided

## Technical Details

### Form Validation
```typescript
// URL field
required={!file}

// File field  
required={!formData.grant_url}
```

### Auto-parse Flow
```typescript
1. Upload file to S3
2. Get S3 key and file type
3. Immediately call parse-questions API
4. Redirect to review page
```

### Status Messages
- "Uploading document..." - During S3 upload
- "Parsing questions from document..." - During Bedrock parsing
- Both shown in centered loading state

## Backward Compatibility

✅ Existing grants with URLs continue to work
✅ URL-only workflow still supported
✅ Manual parsing still available (if auto-parse fails)
✅ No database schema changes required

## Edge Cases Handled

1. **Empty URL with file**: Uses file name as URL
2. **No URL display**: Conditionally renders URL link
3. **Upload errors**: Caught and logged, states reset
4. **Parse errors**: User can retry or skip to draft answers

## Benefits

1. **Faster workflow**: Automatic parsing saves time
2. **Less confusion**: Clear which fields are required
3. **Better UX**: No manual parsing step needed
4. **Flexible**: Still supports URL-only grants
5. **Document-focused**: Aligns with PDF export feature
