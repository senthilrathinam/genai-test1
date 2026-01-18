# PDF Export Implementation Summary

## Overview
Implemented PDF export functionality for PDF-based grants, allowing users to download a formatted Q&A document with their filled answers.

## Changes Made

### 1. Data Model Updates (`types/index.ts`)
Added three new optional fields to `GrantApplicationInstance`:
- `source_type?: 'pdf' | 'web' | 'docx'` - Identifies the grant source type
- `source_file_key?: string` - S3 key of the original uploaded document
- `export_file_key?: string` - S3 key of the last generated filled PDF

### 2. New Library: PDF Generation (`lib/pdf-generator.ts`)
Created a new utility using `pdf-lib` to generate formatted PDFs:
- **Header**: Grant name, organization name, and date
- **Questions**: Bold text with proper line wrapping
- **Answers**: Formatted by type:
  - `text/textarea`: Multi-line text
  - `single_choice/yes_no`: Selected option only
  - `multi_choice`: Bullet list of selected options
  - `number/date`: Formatted as text
  - Empty answers: "(No answer provided)"
- **Pagination**: Automatic page breaks when content exceeds page height

### 3. S3 Library Enhancement (`lib/s3.ts`)
Added `downloadFile()` function to retrieve files from S3 as Buffer objects.

### 4. New API Route (`app/api/grants/[id]/export-pdf/route.ts`)
**POST** endpoint that:
1. Fetches the grant from DynamoDB
2. Fetches the organization profile for the org name
3. Generates a formatted PDF using `pdf-lib`
4. Uploads the PDF to S3 under `exports/{grant_id}.pdf`
5. Updates the grant with `export_file_key`
6. Returns a presigned download URL

### 5. Frontend Updates (`app/grants/[id]/page.tsx`)
Added:
- `exporting` state to track PDF generation
- `handleExportPDF()` function to call the API and open the download URL
- `isPDFGrant` check to determine if grant is PDF-based
- "Download Filled PDF" button (green, only shown for PDF grants)

### 6. Grant Creation Updates (`app/api/grants/route.ts`)
Enhanced POST endpoint to:
- Detect `source_type` from URL extension (.pdf, .docx)
- Set `source_type` field when creating grants

### 7. Question Parsing Updates (`app/api/grants/[id]/parse-questions/route.ts`)
Updated to:
- Set `source_file_key` when a document is uploaded or downloaded
- Set `source_type` based on file type
- Maintain backward compatibility with existing grants

### 8. Mock Data Fixes (`lib/mockData.ts`)
Updated deprecated mock data to use new schema:
- Changed `answer_text` to `answer`
- Added `type` field to all responses
- Added `updated_at` field to all grants

### 9. Documentation Updates (`README.md`)
- Added "PDF Export" to Features list
- Added `pdf-lib` to Tech Stack
- Added `export-pdf` route to API Routes section
- Added `pdf-generator.ts` to Project Structure
- Added PDF Export data flow documentation

## Dependencies Added
- `pdf-lib` (v1.17.1) - For PDF generation

## S3 Storage Structure
```
grantfiller-documents/
├── grants/              # Original uploaded documents
│   └── {uuid}.pdf
│   └── {uuid}.docx
└── exports/             # Generated filled PDFs
    └── {grant_id}.pdf
```

## Usage Flow

1. **Create a PDF-based grant**:
   - Enter grant URL ending in `.pdf` OR
   - Upload a PDF file

2. **Fill out answers**:
   - Parse questions from document
   - Generate AI draft answers
   - Edit and review answers

3. **Export PDF**:
   - Click "Download Filled PDF" button
   - System generates formatted PDF with Q&A
   - Browser opens/downloads the filled PDF

## Button Visibility Logic
The "Download Filled PDF" button appears when:
- `grant.source_type === 'pdf'` OR
- `grant.grant_url.toLowerCase().endsWith('.pdf')`

## Technical Notes

- PDF generation is server-side only (uses Node.js Buffer)
- Presigned URLs expire after 1 hour
- PDFs use Letter size (612x792 points)
- Font: Helvetica (regular and bold)
- Margins: 50 points on all sides
- Automatic text wrapping for long questions/answers
- Automatic page breaks when content exceeds page height

## Backward Compatibility

All changes are backward compatible:
- New fields are optional
- Existing grants without `source_type` will still work
- Button only shows for PDF grants
- No changes to existing parsing or AI logic

## Future Enhancements (Not Implemented)

- Fill original PDF form fields (instead of generating new PDF)
- Custom PDF styling/branding
- Multi-column layouts
- Table of contents for long grants
- PDF preview before download
