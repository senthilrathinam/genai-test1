# Playwright Input Type Support & Issues Analysis

## Currently Supported Input Types

### ✅ Fully Supported (7 types)
1. **text** - `<input type="text">` - Standard text input
2. **textarea** - `<textarea>` - Multi-line text
3. **number** - `<input type="number">` - Numeric input
4. **date** - `<input type="date">` - Date picker
5. **radio** - `<input type="radio">` - Single choice from group
6. **select-one** - `<select>` - Dropdown single selection
7. **checkbox** - `<input type="checkbox">` - Multiple selections

### ❌ Not Supported (Common HTML5 types)
8. **email** - `<input type="email">` - Email validation
9. **tel** - `<input type="tel">` - Phone number
10. **url** - `<input type="url">` - URL input
11. **search** - `<input type="search">` - Search box
12. **password** - `<input type="password">` - Password (intentionally?)
13. **file** - `<input type="file">` - File upload
14. **range** - `<input type="range">` - Slider
15. **color** - `<input type="color">` - Color picker
16. **time** - `<input type="time">` - Time picker
17. **datetime-local** - `<input type="datetime-local">` - Date+time
18. **month** - `<input type="month">` - Month picker
19. **week** - `<input type="week">` - Week picker
20. **select-multiple** - `<select multiple>` - Multi-select dropdown

## Bugs & Logic Issues Found

### 🐛 Bug 1: Email/Tel/URL Fields Not Recognized
**Issue:** Test portal has `type="email"` field (contact_email), but Playwright only handles `type="text"`

**Current behavior:**
```typescript
if (type === 'text' || type === 'number' || type === 'date' || type === 'textarea') {
  // Only these 4 types handled
}
```

**Impact:** Email, tel, url fields are completely ignored and never filled.

**Test case:** Contact Email field in test portal is skipped.

---

### 🐛 Bug 2: Type Compatibility Check Doesn't Match Field Extraction
**In getTypeCompatibility:**
```typescript
text: ['text', 'email', 'tel', 'url', 'search']
```

**In field matching:**
```typescript
if (type === 'text' || type === 'number' || type === 'date' || type === 'textarea') {
  // email, tel, url never reach here
}
```

**Impact:** Type compatibility matrix is defined but never used for these types.

---

### 🐛 Bug 3: "other" Question Type Not Handled
**Defined in types:**
```typescript
export type QuestionType = "text" | "textarea" | "single_choice" | 
                           "multi_choice" | "yes_no" | "number" | 
                           "date" | "other";
```

**In Playwright:** No handling for `type === 'other'`

**Impact:** Questions with type "other" are silently skipped.

---

### 🐛 Bug 4: Radio Button Not Marked as Used
**Issue:** When radio button is successfully checked, the field is marked as used:
```typescript
bestMatch.field.used = true;
```

But this marks the FIRST radio in the group. Other radios in the same group (same name) are not marked as used.

**Impact:** Could theoretically match the same radio group multiple times for different questions.

---

### 🐛 Bug 5: Checkbox Group Doesn't Mark Individual Checkboxes as Used
**Issue:** After checking checkboxes, no field is marked as used.

**Current code:**
```typescript
if (checkedCount > 0) {
  console.log(`[Playwright] ✓ Checked ${checkedCount} boxes (${confidence.toFixed(2)})`);
}
// No field.used = true
```

**Impact:** Same checkbox group could be matched multiple times.

---

### 🐛 Bug 6: Select-Multiple Not Supported
**Issue:** HTML supports `<select multiple>` for multi-select dropdowns, but code only handles `select-one`.

**Impact:** Multi-select dropdowns are ignored.

---

### 🐛 Bug 7: No Validation of Field Visibility/Disabled State
**Issue:** Code doesn't check if field is:
- Hidden (`display: none`, `visibility: hidden`)
- Disabled (`disabled` attribute)
- Read-only (`readonly` attribute)

**Impact:** May attempt to fill fields that can't be filled, causing errors.

---

### 🐛 Bug 8: Date Format Assumption
**Current code:**
```typescript
const value = type === 'date' && typeof answer === 'string' 
  ? answer.split('T')[0]  // Assumes ISO format YYYY-MM-DDTHH:mm:ss
  : String(answer);
```

**Issue:** If answer is already in YYYY-MM-DD format (no 'T'), split returns the whole string (correct by accident). But if answer is in other formats (MM/DD/YYYY, DD-MM-YYYY), it will fail.

**Impact:** Non-ISO date formats won't work.

---

### 🐛 Bug 9: No Handling for Required Field Validation
**Issue:** Code doesn't check if a field is required before skipping it.

**Impact:** Required fields might be left empty, causing form submission to fail.

---

### 🐛 Bug 10: Selector Escaping Not Handled
**Issue:** If field ID or name contains special characters (e.g., `field[0]`, `field.name`), the selector will be invalid.

**Example:**
```typescript
selector = `#${field.id}`;  // If id = "field[0]", selector = "#field[0]" (invalid)
```

**Impact:** Fields with special characters in ID/name can't be filled.

---

## Suggested Improvements

### 1. Support All Text-Like Input Types
```typescript
const TEXT_LIKE_TYPES = ['text', 'email', 'tel', 'url', 'search'];
const isTextLike = TEXT_LIKE_TYPES.includes(field.type);

if (type === 'text' || type === 'textarea' || type === 'number' || type === 'date') {
  const candidates = formFields
    .filter(f => !f.used)
    .filter(f => {
      if (type === 'text') return TEXT_LIKE_TYPES.includes(f.type);
      if (type === 'textarea') return f.type === 'textarea' || TEXT_LIKE_TYPES.includes(f.type);
      if (type === 'number') return f.type === 'number' || f.type === 'text';
      if (type === 'date') return f.type === 'date' || f.type === 'text';
      return false;
    })
    // ... rest of logic
}
```

### 2. Handle "other" Type as Text
```typescript
if (type === 'text' || type === 'textarea' || type === 'number' || 
    type === 'date' || type === 'other') {
  // Treat 'other' as text
  const effectiveType = type === 'other' ? 'text' : type;
  // ... rest of logic
}
```

### 3. Mark All Radio Buttons in Group as Used
```typescript
if (bestMatch?.isRadio) {
  // ... fill logic ...
  if (filled) {
    // Mark all radios with this name as used
    formFields.forEach(f => {
      if (f.type === 'radio' && f.name === bestMatch.field.name) {
        f.used = true;
      }
    });
  }
}
```

### 4. Mark Checkbox Group as Used
```typescript
if (checkedCount > 0) {
  // Mark all checkboxes with this name as used
  formFields.forEach(f => {
    if (f.type === 'checkbox' && f.name === bestGroup.name) {
      f.used = true;
    }
  });
  console.log(`[Playwright] ✓ Checked ${checkedCount} boxes`);
}
```

### 5. Check Field Visibility and State
```typescript
async function extractFormFields(page: any) {
  return await page.evaluate(() => {
    const fields: any[] = [];
    
    document.querySelectorAll('input, textarea, select').forEach((el: any, index: number) => {
      // Skip hidden, disabled, or readonly fields
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (el.disabled || el.readOnly) return;
      
      // ... rest of extraction
    });
    
    return fields;
  });
}
```

### 6. Escape Selector Special Characters
```typescript
function escapeSelector(str: string): string {
  return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

// Usage:
selector = field.id ? `#${escapeSelector(field.id)}` : 
           field.name ? `[name="${escapeSelector(field.name)}"]` : 
           `[data-field-index="${field.index}"]`;
```

### 7. Normalize Date Format
```typescript
function normalizeDateForInput(dateStr: string): string {
  // Try to parse various formats and return YYYY-MM-DD
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr; // Return as-is if invalid
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Usage:
const value = type === 'date' && typeof answer === 'string' 
  ? normalizeDateForInput(answer)
  : String(answer);
```

### 8. Support Select-Multiple
```typescript
else if (type === 'multi_choice') {
  const answers = Array.isArray(answer) ? answer : [answer];
  
  // Try checkboxes first
  const checkboxFields = formFields.filter(f => f.type === 'checkbox');
  // ... existing checkbox logic ...
  
  // If no checkboxes matched, try select-multiple
  if (!filled) {
    const multiSelects = formFields.filter(f => f.type === 'select-multiple');
    // ... similar logic to select-one but with multiple values
  }
}
```

### 9. Warn About Required Fields
```typescript
// After processing all questions
const requiredFields = formFields.filter(f => f.required && !f.used);
if (requiredFields.length > 0) {
  console.warn(`[Playwright] ⚠ ${requiredFields.length} required fields not filled:`);
  requiredFields.forEach(f => {
    console.warn(`  - ${f.labelText || f.name || f.id}`);
  });
}
```

## Priority Fixes

### High Priority (Breaks Current Functionality)
1. ✅ Support email/tel/url input types (Bug #1)
2. ✅ Handle "other" question type (Bug #3)
3. ✅ Mark radio/checkbox groups as used (Bugs #4, #5)

### Medium Priority (Improves Reliability)
4. ✅ Check field visibility/disabled state (Bug #7)
5. ✅ Escape selector special characters (Bug #10)
6. ✅ Normalize date formats (Bug #8)

### Low Priority (Edge Cases)
7. ⬜ Support select-multiple (Bug #6)
8. ⬜ Warn about required fields (Bug #9)

## Testing Checklist

After fixes, verify:
- [ ] Email field in test portal is filled
- [ ] Tel/URL fields work if added
- [ ] Radio groups can't be matched twice
- [ ] Checkbox groups can't be matched twice
- [ ] Hidden fields are skipped
- [ ] Disabled fields are skipped
- [ ] Fields with special chars in ID work
- [ ] Various date formats work (ISO, US, EU)
- [ ] "other" type questions are handled
