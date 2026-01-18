# Testing PDF Export Feature

## Prerequisites
1. AWS credentials configured in `.env.local`
2. DynamoDB table created
3. S3 bucket created with `exports/` folder permissions
4. Organization profile set up (visit `/org` and fill in details)

## Test Scenarios

### Scenario 1: PDF URL Grant
1. Navigate to `/grants/new`
2. Enter grant name: "Test PDF Grant"
3. Enter grant URL: `https://example.com/sample-grant.pdf`
4. Click "Create Grant"
5. Click "Skip to Draft Answers" (or parse questions if you have a real PDF URL)
6. Fill in some answers
7. **Verify**: "Download Filled PDF" button appears (green button)
8. Click "Download Filled PDF"
9. **Expected**: PDF downloads with formatted Q&A

### Scenario 2: Uploaded PDF File
1. Navigate to `/grants/new`
2. Enter grant name: "Test Uploaded PDF"
3. Enter grant URL: `https://example.com/grant`
4. Upload a PDF file
5. Click "Create Grant"
6. Click "Parse Questions from Document"
7. Fill in answers
8. **Verify**: "Download Filled PDF" button appears
9. Click "Download Filled PDF"
10. **Expected**: PDF downloads with formatted Q&A

### Scenario 3: Web-based Grant (No PDF Button)
1. Navigate to `/grants/new`
2. Enter grant name: "Test Web Grant"
3. Enter grant URL: `https://example.com/grant-application`
4. Click "Create Grant"
5. **Verify**: "Download Filled PDF" button does NOT appear
6. Only "Generate AI Draft Answers" and "Mark All Reviewed" buttons visible

### Scenario 4: Different Answer Types
Create a grant and manually add different question types to test formatting:
- Text input
- Textarea (long text)
- Single choice (radio buttons)
- Multi choice (checkboxes)
- Yes/No
- Number
- Date

**Expected PDF Output**:
- Text/textarea: Full text displayed
- Single choice/Yes-No: "Answer: [Selected Option]"
- Multi choice: Bullet list of selected options
- Number/Date: "Answer: [Value]"
- Empty answers: "(No answer provided)"

## Verification Checklist

### UI Checks
- [ ] Button only appears for PDF grants
- [ ] Button is green with white text
- [ ] Button shows "Generating..." during export
- [ ] Button is disabled during generation
- [ ] No errors in browser console

### API Checks
- [ ] POST to `/api/grants/[id]/export-pdf` returns 200
- [ ] Response includes `downloadUrl` and `export_file_key`
- [ ] Grant is updated with `export_file_key` in DynamoDB

### S3 Checks
- [ ] PDF is uploaded to `exports/{grant_id}.pdf`
- [ ] File is accessible via presigned URL
- [ ] File size is reasonable (not empty)

### PDF Content Checks
- [ ] Header includes grant name
- [ ] Header includes organization name from profile
- [ ] Header includes current date
- [ ] All questions are displayed in bold
- [ ] All answers are displayed below questions
- [ ] Text wraps properly (no overflow)
- [ ] Multiple pages if content is long
- [ ] Proper spacing between Q&A pairs

## Manual API Testing

### Using curl:
```bash
# Export PDF for a grant
curl -X POST http://localhost:3000/api/grants/[GRANT_ID]/export-pdf

# Expected response:
{
  "downloadUrl": "https://s3.amazonaws.com/...",
  "export_file_key": "exports/[GRANT_ID].pdf"
}
```

### Using browser DevTools:
```javascript
// In browser console on /grants/[id] page
fetch(`/api/grants/${window.location.pathname.split('/')[2]}/export-pdf`, {
  method: 'POST'
})
  .then(r => r.json())
  .then(data => {
    console.log('Export result:', data);
    window.open(data.downloadUrl, '_blank');
  });
```

## Common Issues & Solutions

### Issue: Button doesn't appear
**Solution**: Check that `grant.source_type === 'pdf'` or URL ends with `.pdf`

### Issue: PDF generation fails
**Solution**: 
- Check AWS credentials
- Verify S3 bucket permissions
- Check CloudWatch logs for errors

### Issue: PDF is empty or malformed
**Solution**:
- Verify grant has responses
- Check that responses have `answer` field (not `answer_text`)
- Verify organization profile exists

### Issue: Download URL doesn't work
**Solution**:
- Check S3 bucket CORS settings
- Verify presigned URL hasn't expired (1 hour limit)
- Check S3 bucket permissions

### Issue: Text overflow in PDF
**Solution**: The `wrapText()` function should handle this automatically. If issues persist, check font size and margin settings in `pdf-generator.ts`

## Performance Notes

- PDF generation typically takes 1-3 seconds
- Larger grants (50+ questions) may take longer
- S3 upload is usually < 1 second
- Presigned URL generation is instant

## Security Notes

- Presigned URLs expire after 1 hour
- PDFs are stored in S3 with private access
- Only accessible via presigned URLs
- No public access to exports folder
