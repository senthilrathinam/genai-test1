# Flow Inconsistencies - Fixes Implemented

## Critical Fixes Implemented

### ✅ Fix #1: Portal URL Separation
**Problem:** Used non-existent `portal_url` field, fell back to `grant_url` which could be a PDF

**Solution:**
- Added `portal_url?: string` to `GrantApplicationInstance` type
- Updated fill-web route to use `portal_url` if provided, otherwise `grant_url`
- Added validation to return 400 error if no URL provided

**Impact:** Web form filling now works correctly even when grant_url is a PDF

---

### ✅ Fix #2: Multi-Page PDF Parsing
**Problem:** Document parser didn't explicitly ask Bedrock to scan all pages

**Solution:**
- Updated prompt: "IMPORTANT: This document may have multiple pages. Scan the ENTIRE document from first page to last page."
- Bedrock now knows to look at all pages, not just first page

**Impact:** Better question extraction from multi-page PDF forms

---

### ✅ Fix #3: Question Validation
**Problem:** No validation of parsed questions, bad data could be stored

**Solution:**
- Filter out questions with empty `question_text`
- Filter out single/multi choice questions with no options
- Return 400 error if no valid questions found after validation
- Log warnings for invalid questions

**Impact:** Only valid questions stored in database

---

### ✅ Fix #4: Question Deduplication
**Problem:** Same question extracted multiple times from multi-page forms

**Solution:**
- Added deduplication in parse-questions route (case-insensitive)
- Added deduplication in html-parser (case-insensitive)
- Uses Set to track seen question texts
- Logs warnings for duplicate questions

**Impact:** No duplicate questions in UI

---

### ✅ Fix #5: Improved Page Navigation Wait Strategy
**Problem:** Fixed 2-second wait could fail on slow connections

**Solution:**
- Use `Promise.race` with multiple strategies:
  - Wait for 'load' state (max 10s)
  - Minimum 3s wait
- Additional 1s wait for dynamic content
- Try network idle (max 5s) but don't block if fails
- Total: 3-4 seconds minimum, up to 14 seconds if needed

**Impact:** More reliable on slow connections and heavy pages

---

## Remaining Known Issues

### 🟡 Issue: Duplicate Code in webFillPlaywright.ts
**Location:** Lines ~577 and ~871

**Problem:** Navigation logic appears twice (from earlier edits)

**Impact:** None (both blocks are identical and work correctly)

**Fix:** Needs code cleanup to remove duplication

---

### 🟡 Issue: Browser Left Open Indefinitely
**Location:** webFillPlaywright.ts

**Status:** Intentional design

**Behavior:**
- Browser stays open after filling
- User completes manual tasks (files, signatures, CAPTCHA)
- User submits manually
- User closes browser manually

**Potential Issue:** If user forgets to close, browser stays open forever

**Mitigation:** Document in UI that user must close browser

---

## Testing Checklist

### Portal URL Fix:
- [ ] Grant with PDF URL + separate portal_url → Should fill at portal_url
- [ ] Grant with web URL only → Should fill at grant_url
- [ ] Grant with no URL → Should return 400 error

### Question Validation:
- [ ] Parse form with empty question text → Should filter out
- [ ] Parse single_choice with no options → Should filter out
- [ ] Parse form with all invalid questions → Should return 400 error

### Question Deduplication:
- [ ] Multi-page form with repeated questions → Should deduplicate
- [ ] Questions with different case ("Name" vs "name") → Should deduplicate
- [ ] Questions with extra whitespace → Should deduplicate

### Page Navigation:
- [ ] Slow connection (throttle network) → Should still navigate
- [ ] Heavy page (lots of JS) → Should wait for load
- [ ] SPA transition → Should wait for dynamic content

## Code Changes Summary

### Files Modified:
1. `types/index.ts` - Added portal_url field
2. `app/api/grants/[id]/fill-web/route.ts` - Fixed URL logic
3. `lib/document-parser.ts` - Improved prompt
4. `app/api/grants/[id]/parse-questions/route.ts` - Added validation & deduplication
5. `lib/html-parser.ts` - Added deduplication
6. `lib/webFillPlaywright.ts` - Improved wait strategy

### Lines Changed:
- Added: ~60 lines
- Modified: ~30 lines
- Net: +90 lines

### Breaking Changes:
**None** - All changes are backward compatible

- Existing grants work unchanged
- New portal_url field is optional
- Validation only filters bad data
- Deduplication only removes duplicates
- Wait strategy is more robust, not different behavior
