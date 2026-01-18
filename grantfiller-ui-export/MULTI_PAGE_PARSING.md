# Multi-Page Parsing - Implementation Summary

## Problem

The HTML parser was only extracting questions from the first page of multi-page forms, missing questions on subsequent pages.

## Solution

Added multi-page navigation to the parsing flow:

```typescript
let currentPage = 1;
let hasMorePages = true;
const allQuestions: any[] = [];

while (hasMorePages && currentPage <= maxPages) {
  // 1. Extract HTML from current page
  const html = await page.content();
  
  // 2. Parse questions with Bedrock
  const questions = await parseWithBedrock(html);
  allQuestions.push(...questions);
  
  // 3. Look for Next button
  const nextButton = await findNextButton(page);
  
  // 4. Navigate if found
  if (nextButton) {
    await page.click(nextButton);
    currentPage++;
  } else {
    hasMorePages = false;
  }
}

return allQuestions; // All questions from all pages
```

## Key Features

### 1. Same Navigation Logic as Filling
- Uses identical Next button detection
- Same multi-language support
- Same safety limits (20 pages max)

### 2. Accumulates Questions
- Collects questions from each page
- Combines into single array
- Preserves order (page 1, then page 2, etc.)

### 3. Robust Error Handling
- If parsing fails on one page, continues to next
- If navigation fails, stops gracefully
- Returns fallback questions if all pages fail

### 4. Performance Optimized
- Parses each page once
- Reuses same browser instance
- Closes browser after parsing complete

## Workflow Comparison

### Before (Single Page):
```
1. Load page 1
2. Parse questions from page 1
3. Return questions
→ Missing questions from pages 2, 3, 4...
```

### After (Multi-Page):
```
1. Load page 1 → Parse → Get 5 questions
2. Click Next → Load page 2 → Parse → Get 7 questions
3. Click Next → Load page 3 → Parse → Get 4 questions
4. No Next button → Stop
5. Return all 16 questions
```

## Console Output Example

```
[HTML Parser] Parsing questions from: https://example.com/grant
[HTML Parser] Extracting questions from page 1...
[HTML Parser] Found 5 questions on page 1
[HTML Parser] Found Next button, navigating to page 2...
[HTML Parser] Extracting questions from page 2...
[HTML Parser] Found 7 questions on page 2
[HTML Parser] Found Next button, navigating to page 3...
[HTML Parser] Extracting questions from page 3...
[HTML Parser] Found 4 questions on page 3
[HTML Parser] No Next button found, assuming last page
[HTML Parser] Total questions found across 3 page(s): 16
```

## Impact

### Before:
- ❌ Only got questions from page 1
- ❌ User had to manually identify missing questions
- ❌ Incomplete grant applications

### After:
- ✅ Gets ALL questions from ALL pages
- ✅ Complete question list upfront
- ✅ User can generate answers for entire form

## Performance

- **Time per page:** ~3-5 seconds (Bedrock parsing)
- **Navigation overhead:** ~2 seconds per page
- **Total time (3 pages):** ~15-20 seconds
- **Acceptable for one-time parsing**

## Edge Cases Handled

1. **Parsing fails on one page** - Continues to next page
2. **Navigation fails** - Returns questions collected so far
3. **No questions found** - Returns fallback questions
4. **Infinite loop** - 20 page maximum
5. **Timeout** - Graceful failure, returns what was found

## Code Changes

### Files Modified:
- `lib/html-parser.ts`

### Changes:
- Added multi-page loop (~50 lines)
- Reused Next button detection logic
- Accumulates questions across pages
- Same error handling as before

### Net Change: +50 lines

## Breaking Changes

**None** - Backward compatible

- Single-page forms still work (loop runs once)
- Same return type
- Same API interface
- Only enhancement, no removals

## Testing

### Test Scenarios:

1. **Single-page form** - Should parse 1 page, return questions
2. **3-page form** - Should parse all 3 pages, return all questions
3. **Form with no Next button** - Should parse 1 page, return questions
4. **Form with parsing error** - Should return fallback questions
5. **Form with navigation error** - Should return questions from pages parsed so far

### Expected Results:

- ✅ All questions from all pages collected
- ✅ Questions in order (page 1, 2, 3...)
- ✅ No duplicate questions
- ✅ Graceful failure handling
