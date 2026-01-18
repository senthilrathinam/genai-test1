# Bug Fixes and Improvements - Summary

## Bugs Fixed (Auto-fixed)

### 1. **Word Splitting Bug in Playwright Similarity Calculation**
**File:** `lib/webFillPlaywright.ts`
**Issue:** The `calculateSimilarity` function was splitting normalized text (which has no spaces) instead of splitting before normalization.
**Fix:** Split original strings before normalizing to preserve word boundaries.
**Impact:** Improves field matching accuracy for web form filling.

### 2. **INSUFFICIENT_INFO Detection Too Broad**
**File:** `lib/bedrock.ts`
**Issue:** Using `text.includes('INSUFFICIENT_INFO')` could match partial strings and cause false positives.
**Fix:** Added more precise detection with case-insensitive check and length validation.
**Impact:** Prevents incorrectly flagging valid answers as insufficient.

### 3. **PDF Field Matching Too Lenient**
**File:** `lib/pdf-form-filler.ts`
**Issue:** Match threshold of 0.3 was too low, causing incorrect field mappings.
**Fix:** 
- Increased threshold from 0.3 to 0.4
- Added logic to reduce confidence for weak matches (< 2 matching words)
**Impact:** Reduces false positive matches when filling PDF forms.

### 4. **Missing URL Validation in Parse Questions**
**File:** `app/api/grants/[id]/parse-questions/route.ts`
**Issue:** Code used `grant.grant_url` without checking if it exists.
**Fix:** Added validation and early return with 400 error if URL is missing.
**Impact:** Prevents runtime errors when grant_url is undefined.

### 5. **Missing Error Handling for Fetch Responses**
**Files:** 
- `app/page.tsx`
- `app/grants/[id]/page.tsx`
- `app/grants/new/page.tsx`
- `app/org/page.tsx`

**Issue:** All fetch calls didn't check `res.ok` before parsing JSON, causing silent failures.
**Fix:** Added response validation and user-facing error messages with alerts.
**Impact:** Users now see clear error messages instead of silent failures.

### 6. **Browser Resource Leak in Playwright**
**File:** `lib/webFillPlaywright.ts`
**Issue:** Browser was left open indefinitely with no cleanup mechanism.
**Fix:** 
- Added 5-minute auto-close timeout
- Close browser on error
**Impact:** Prevents resource leaks from abandoned browser instances.

### 7. **S3 File Orphaning on Grant Delete**
**Files:** 
- `lib/s3.ts` (added `deleteFile` function)
- `app/api/grants/[id]/route.ts`

**Issue:** Deleting a grant left source and export files orphaned in S3.
**Fix:** Fetch grant before delete, then clean up associated S3 files.
**Impact:** Prevents storage waste and reduces S3 costs.

## Potential Issues Identified (No Action Needed)

### 1. **Performance: Batch Processing in Generate Drafts**
**File:** `app/api/grants/[id]/generate-drafts/route.ts`
**Status:** Already optimized with batch size of 5 and 200ms delay between batches.
**Note:** This is a good balance between speed and rate limiting.

### 2. **Race Conditions in Frontend State Updates**
**File:** `app/grants/[id]/page.tsx`
**Status:** Auto-save on blur is intentional design.
**Note:** Could be optimized with debouncing, but current implementation is acceptable.

### 3. **JSON Parsing Robustness**
**File:** `lib/document-parser.ts`
**Status:** Already has repair logic with fallback to dummy questions.
**Note:** Well-handled with multiple fallback strategies.

## Code Quality Improvements

### Error Messages
- All API errors now include user-facing messages
- Console errors preserved for debugging
- Alert dialogs inform users of failures

### Resource Management
- S3 cleanup on delete prevents orphaned files
- Browser auto-close prevents memory leaks
- Error paths now properly clean up resources

### Validation
- URL existence checked before use
- Response status validated before parsing
- Match thresholds increased for accuracy

## Testing Recommendations

1. **Test grant deletion** - Verify S3 files are removed
2. **Test error scenarios** - Verify user sees error messages
3. **Test Playwright timeout** - Verify browser closes after 5 minutes
4. **Test PDF field matching** - Verify improved accuracy with new threshold
5. **Test parse questions with missing URL** - Verify 400 error response

## No Breaking Changes

All fixes are backward compatible and don't change the API contract or data structures.
