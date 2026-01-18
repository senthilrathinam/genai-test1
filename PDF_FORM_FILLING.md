# PDF Form Filling Implementation

## Summary
Added support for filling AcroForm fields in original PDF documents. When a grant is based on a structured PDF form, the system now fills the actual form fields instead of generating a Q&A PDF.

## Changes Made

### 1. New Utility: PDF Form Filler (`lib/pdf-form-filler.ts`)

**Core Function**: `fillPDFForm(pdfBuffer, grant)`

**Process**:
1. Load PDF and extract form fields using pdf-lib
2. Check if PDF has AcroForm fields
3. If no fields → return `{ filled: false }`
4. If fields exist → map and fill them

**Field Mapping Strategy**:
- Normalize both field names and question text (lowercase, remove special chars)
- Match using substring comparison (bidirectional)
- Example: Field "org_name" matches question "Organization Name"

**Field Type Handling**:

| Field Type | Answer Type | Action |
|------------|-------------|--------|
| PDFTextField | text/textarea/number/date | Set text value |
| PDFTextField | multi_choice | Join with "; " |
| PDFCheckBox | yes_no ("Yes") | Check box |
| PDFCheckBox | multi_choice (array) | Check if field name in array |
| PDFRadioGroup | single_choice | Select matching option |

**Fuzzy Matching**:
- For radio groups, finds option that best matches answer
- Case-insensitive comparison
- Partial match support

### 2. Updated Export API (`app/api/grants/[id]/export-pdf/route.ts`)

**New Logic Flow**:
```
1. Fetch grant and org profile
2. IF grant has source_file_key AND source_type === 'pdf':
   a. Download original PDF from S3
   b. Try fillPDFForm()
   c. IF filled successfully:
      - Use filled PDF
      - Save as exports/{id}-filled.pdf
   d. ELSE:
      - Generate Q&A PDF
      - Save as exports/{id}.pdf
3. ELSE:
   - Generate Q&A PDF
   - Save as exports/{id}.pdf
4. Upload to S3 and return presigned URL
```

**Error Handling**:
- If form filling fails → fall back to Q&A PDF
- If original PDF can't be downloaded → fall back to Q&A PDF
- All errors logged but don't break the flow

### 3. S3 Library Enhancement (`lib/s3.ts`)

Already had `downloadFile()` function from previous implementation.

## Technical Details

### Field Matching Algorithm

```typescript
normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Match if either contains the other
if (normalizedFieldName.includes(questionKey) || 
    questionKey.includes(normalizedFieldName)) {
  // Match found
}
```

**Examples**:
- Field: "applicant_name" → Question: "Applicant Name" ✓
- Field: "org_mission" → Question: "Organization Mission Statement" ✓
- Field: "budget_total" → Question: "Total Budget Amount" ✓

### Answer Formatting

**Text Fields**:
```typescript
// Single value
answer: "My Organization" → "My Organization"

// Array (multi-choice)
answer: ["Option 1", "Option 2"] → "Option 1; Option 2"
```

**Checkboxes**:
```typescript
// Yes/No
answer: "Yes" → check()

// Multi-choice
answer: ["checkbox1", "checkbox2"]
if (fieldName === "checkbox1") → check()
```

**Radio Groups**:
```typescript
// Find matching option
answer: "Year 3"
options: ["Year 1", "Year 2", "Year 3"]
→ select("Year 3")
```

## User Experience

### Before:
1. Upload PDF grant
2. Fill answers in UI
3. Click "Download Filled PDF"
4. Get Q&A style PDF (new document)

### After:
1. Upload PDF grant
2. Fill answers in UI
3. Click "Download Filled PDF"
4. Get:
   - **Filled original PDF** (if form fields detected) OR
   - **Q&A style PDF** (if no form fields)

**No UI changes** - backend automatically chooses best approach.

## Example Scenarios

### Scenario 1: Structured Form PDF
```
PDF has fields: org_name, mission, budget_amount
Grant has responses matching these questions
→ Result: Original PDF with fields filled
→ File: exports/{id}-filled.pdf
```

### Scenario 2: Unstructured PDF
```
PDF has no form fields (just text/images)
Grant has responses
→ Result: Generated Q&A PDF
→ File: exports/{id}.pdf
```

### Scenario 3: Partial Match
```
PDF has 10 fields
Grant responses match 7 fields
→ Result: Original PDF with 7 fields filled, 3 empty
→ File: exports/{id}-filled.pdf
```

### Scenario 4: No Match
```
PDF has form fields
Grant responses don't match any field names
→ Result: Falls back to Q&A PDF
→ File: exports/{id}.pdf
```

## Benefits

1. **Layout Preservation**: Maintains original PDF design and formatting
2. **Professional Output**: Filled forms look official and complete
3. **Automatic Fallback**: Always produces a PDF, even if form filling fails
4. **No User Action**: System automatically chooses best approach
5. **Flexible Matching**: Works with various field naming conventions

## Limitations

1. **Matching Quality**: Depends on similarity between field names and questions
2. **Complex Fields**: Some advanced field types may not be supported
3. **No OCR**: Can't fill scanned/image-based PDFs
4. **No Layout Changes**: Can't add new fields or modify PDF structure

## Future Enhancements (Not Implemented)

- Machine learning for better field matching
- Support for signature fields
- Multi-page form navigation
- Field validation and error reporting
- Preview before download
- Manual field mapping UI
