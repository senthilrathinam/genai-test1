# Playwright Field Matching Analysis & Improvement Suggestions

## Current Issues

### 1. **Inconsistent Threshold Values**
- Text fields: 0.5 minimum score
- Radio buttons: 0.3 question match, 0.6 value match
- Select dropdowns: 0.3 question match, 0.6 option match
- Checkboxes: 0.3 question match, 0.5 value match

**Problem:** Different thresholds for different field types creates unpredictable behavior.

### 2. **Label Text Extraction Misses Context**
The current label extraction only looks at:
- `<label for="id">` 
- Parent `<label>` wrapper
- Previous sibling `<label>`

**Problem:** Misses:
- Nested spans with helper text (e.g., "Organization Mission Statement" + "Describe your organization's mission...")
- ARIA labels (`aria-label`, `aria-labelledby`)
- Fieldset legends for radio/checkbox groups
- Placeholder text as fallback context

### 3. **No Semantic Understanding**
The similarity algorithm is purely text-based with no understanding of:
- Synonyms (e.g., "organization name" vs "legal name")
- Common abbreviations (e.g., "EIN" vs "Tax ID")
- Question intent (e.g., "mission" could match both "mission statement" and "program description")

### 4. **Field Type Mismatch Handling**
Current logic:
- Strictly enforces textarea vs text distinction
- Doesn't consider that a long text answer could go in either
- Date fields must exactly match type="date"

**Problem:** Real forms often use text inputs for dates or textareas for short answers.

### 5. **No Positional/Structural Context**
The algorithm ignores:
- Field order in the form
- Visual proximity to other fields
- Grouping (fieldsets, divs)
- Tab index

**Problem:** When two fields have similar labels, can't use position to disambiguate.

### 6. **Greedy Matching for Radio/Checkbox Groups**
For radio buttons and checkboxes:
- Loops through ALL fields of that type
- Takes first match above threshold
- Doesn't compare all candidates to find best match

**Problem:** May select wrong group if multiple groups have similar names.

### 7. **No Validation of Match Quality**
After finding a match:
- No sanity check if the match makes sense
- No fallback if confidence is borderline
- No user confirmation for low-confidence matches

## Suggested Improvements

### Strategy 1: **Multi-Signal Scoring System** (Recommended)

Replace single similarity score with weighted multi-signal approach:

```typescript
interface FieldMatchSignals {
  textSimilarity: number;      // Current algorithm
  semanticMatch: number;        // Synonym/keyword matching
  typeCompatibility: number;    // Field type vs answer type
  positionScore: number;        // Order in form
  contextMatch: number;         // Surrounding text/labels
  lengthCompatibility: number;  // Answer length vs field constraints
}

function calculateMatchScore(signals: FieldMatchSignals): number {
  return (
    signals.textSimilarity * 0.35 +
    signals.semanticMatch * 0.25 +
    signals.typeCompatibility * 0.15 +
    signals.positionScore * 0.10 +
    signals.contextMatch * 0.10 +
    signals.lengthCompatibility * 0.05
  );
}
```

**Benefits:**
- More robust matching
- Can tune weights based on testing
- Easier to debug (see which signal failed)

### Strategy 2: **Semantic Keyword Matching**

Add domain-specific keyword mappings:

```typescript
const SEMANTIC_MAPPINGS = {
  organization: ['org', 'company', 'nonprofit', 'entity', 'legal name'],
  mission: ['purpose', 'goal', 'objective', 'vision'],
  contact: ['email', 'phone', 'address', 'representative'],
  funding: ['amount', 'budget', 'grant', 'request', 'money'],
  ein: ['tax id', 'taxpayer', 'federal id', 'employer identification'],
  timeline: ['schedule', 'dates', 'duration', 'period', 'start', 'end'],
  beneficiaries: ['served', 'participants', 'recipients', 'population', 'target'],
  outcomes: ['results', 'impact', 'metrics', 'success', 'goals', 'achievements'],
};

function getSemanticScore(questionText: string, fieldText: string): number {
  const questionNorm = normalizeText(questionText);
  const fieldNorm = normalizeText(fieldText);
  
  for (const [concept, keywords] of Object.entries(SEMANTIC_MAPPINGS)) {
    const questionHasConcept = keywords.some(kw => questionNorm.includes(normalizeText(kw)));
    const fieldHasConcept = keywords.some(kw => fieldNorm.includes(normalizeText(kw)));
    
    if (questionHasConcept && fieldHasConcept) {
      return 0.9; // Strong semantic match
    }
  }
  
  return 0.0;
}
```

### Strategy 3: **Enhanced Label Extraction**

Capture more context from the DOM:

```typescript
function extractFieldContext(element: HTMLElement): FieldContext {
  const id = element.id || '';
  const name = element.getAttribute('name') || '';
  const type = element.getAttribute('type') || element.tagName.toLowerCase();
  const placeholder = element.getAttribute('placeholder') || '';
  const ariaLabel = element.getAttribute('aria-label') || '';
  const ariaDescribedBy = element.getAttribute('aria-describedby') || '';
  
  // Get label text
  let labelText = '';
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    labelText = label?.textContent || '';
  }
  if (!labelText) {
    const parent = element.closest('label');
    labelText = parent?.textContent || '';
  }
  
  // Get helper text / description
  let helperText = '';
  if (ariaDescribedBy) {
    const helper = document.getElementById(ariaDescribedBy);
    helperText = helper?.textContent || '';
  }
  
  // Get fieldset legend (for radio/checkbox groups)
  let groupLabel = '';
  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    groupLabel = legend?.textContent || '';
  }
  
  // Get all text within parent container (for inline labels)
  const container = element.closest('div, fieldset, section');
  const containerText = container?.textContent || '';
  
  return {
    id, name, type, placeholder, ariaLabel,
    labelText, helperText, groupLabel, containerText,
    maxLength: element.getAttribute('maxlength'),
    required: element.hasAttribute('required'),
    pattern: element.getAttribute('pattern'),
  };
}
```

### Strategy 4: **Two-Phase Matching**

Phase 1: Find all candidates above minimum threshold
Phase 2: Compare candidates and select best

```typescript
// Phase 1: Collect candidates
const candidates: Array<{field: any, score: number, signals: FieldMatchSignals}> = [];

for (const field of formFields) {
  if (field.used) continue;
  
  const signals = calculateAllSignals(question_text, field, answer);
  const score = calculateMatchScore(signals);
  
  if (score >= 0.4) { // Lower threshold for candidates
    candidates.push({ field, score, signals });
  }
}

// Phase 2: Select best candidate
candidates.sort((a, b) => b.score - a.score);

if (candidates.length > 0) {
  const best = candidates[0];
  
  // Require significant gap between 1st and 2nd place
  if (candidates.length > 1) {
    const second = candidates[1];
    if (best.score - second.score < 0.15) {
      console.warn(`Ambiguous match: ${best.score} vs ${second.score}`);
      // Could prompt user or skip
    }
  }
  
  if (best.score >= 0.6) { // Higher threshold for actual filling
    // Fill the field
  }
}
```

### Strategy 5: **Type Compatibility Matrix**

Define which answer types can fill which field types:

```typescript
const TYPE_COMPATIBILITY = {
  text: ['text', 'email', 'tel', 'url', 'search'],
  textarea: ['textarea', 'text'], // textarea answer can go in text field if short
  number: ['number', 'text'],
  date: ['date', 'text'],
  single_choice: ['radio', 'select-one', 'text'],
  multi_choice: ['checkbox', 'select-multiple'],
  yes_no: ['radio', 'checkbox', 'select-one'],
};

function getTypeCompatibilityScore(answerType: string, fieldType: string): number {
  const compatible = TYPE_COMPATIBILITY[answerType] || [];
  if (compatible.includes(fieldType)) return 1.0;
  
  // Partial compatibility
  if (answerType === 'textarea' && fieldType === 'text') {
    // Check answer length
    return answerLength < 100 ? 0.7 : 0.3;
  }
  
  return 0.0;
}
```

### Strategy 6: **Position-Based Scoring**

Use form order to break ties:

```typescript
function getPositionScore(questionIndex: number, fieldIndex: number, totalFields: number): number {
  // Expect questions and fields to be in similar order
  const expectedFieldIndex = (questionIndex / totalQuestions) * totalFields;
  const distance = Math.abs(fieldIndex - expectedFieldIndex);
  const maxDistance = totalFields / 2;
  
  return Math.max(0, 1 - (distance / maxDistance));
}
```

### Strategy 7: **Confidence Thresholds with Fallback**

```typescript
const CONFIDENCE_LEVELS = {
  HIGH: 0.8,      // Auto-fill
  MEDIUM: 0.6,    // Fill with warning
  LOW: 0.4,       // Skip or prompt user
};

if (bestScore >= CONFIDENCE_LEVELS.HIGH) {
  await fillField(field, answer);
} else if (bestScore >= CONFIDENCE_LEVELS.MEDIUM) {
  console.warn(`Medium confidence match (${bestScore}): ${question_text} -> ${field.id}`);
  await fillField(field, answer);
  // Could add visual indicator (yellow highlight instead of purple)
} else {
  console.log(`Low confidence (${bestScore}), skipping: ${question_text}`);
  fieldsSkipped++;
}
```

## Recommended Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Standardize thresholds across all field types (0.6 for all)
2. ✅ Add semantic keyword matching for common grant terms
3. ✅ Improve label extraction (ARIA, helper text, fieldset legends)
4. ✅ Add type compatibility scoring

### Phase 2: Structural Improvements (2-3 hours)
5. ✅ Implement two-phase matching (candidates → best)
6. ✅ Add position-based scoring
7. ✅ Add confidence levels with visual indicators

### Phase 3: Advanced (3-4 hours)
8. ⬜ Multi-signal scoring system
9. ⬜ Machine learning approach (train on successful matches)
10. ⬜ User feedback loop (let users correct matches, learn from corrections)

## Testing Strategy

Create test cases with:
1. **Perfect matches** - field name exactly matches question
2. **Synonym matches** - "organization name" vs "legal name"
3. **Ambiguous matches** - multiple fields with similar names
4. **Type mismatches** - textarea answer for text field
5. **Missing fields** - question with no corresponding field
6. **Extra fields** - fields with no corresponding question

Expected success rate:
- Perfect matches: 100%
- Synonym matches: 95%+
- Ambiguous matches: 80%+ (with correct disambiguation)
- Type mismatches: 70%+ (with graceful degradation)
- Missing fields: 0% filled (correct behavior)
- Extra fields: 0% filled (correct behavior)

## Metrics to Track

1. **Match accuracy** - % of fields filled correctly
2. **Confidence distribution** - histogram of match scores
3. **False positives** - fields filled incorrectly
4. **False negatives** - fields that should have been filled but weren't
5. **Ambiguity rate** - % of questions with multiple high-scoring candidates
