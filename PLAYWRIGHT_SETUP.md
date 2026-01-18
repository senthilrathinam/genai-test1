# Playwright Web Fill Setup

The app uses Playwright for automated web form filling instead of AgentCore.

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

   This downloads the Chromium browser that Playwright will use for automation.

## How It Works

When you click "Fill Grant Form on Website":

1. **Playwright launches** a headless Chromium browser
2. **Navigates** to the target URL (defaults to local test portal)
3. **Analyzes** the page DOM to find form fields
4. **Matches** grant questions to form fields using:
   - Field `name` and `id` attributes
   - Label text similarity
   - Field type matching
5. **Fills** each matched field with the grant's answer
6. **Auto-submits** if the URL is the local test portal
7. **Returns** a summary of what was filled

## Field Matching Strategy

The system uses fuzzy text matching to map grant questions to form fields:

- **Text/Number/Date**: Matches input fields by name/id similarity
- **Yes/No & Single Choice**: Matches radio buttons or select dropdowns
- **Multi Choice**: Matches checkboxes by value similarity
- **Confidence threshold**: 0.5 (50% similarity required to fill)

## Local Testing

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Create a grant** with some responses

3. **Click "Fill Grant Form on Website"** on the review page

4. **Check results:**
   - Terminal logs show field-by-field progress
   - UI shows summary with top 5 mappings
   - Visit `/test-portal/submissions` to see the actual submitted data

## Debugging

**Enable headed mode** to watch the browser:

Edit `lib/webFillPlaywright.ts`:
```typescript
const browser = await chromium.launch({ headless: false });
```

**Slow down actions** for visibility:
```typescript
const browser = await chromium.launch({ 
  headless: false,
  slowMo: 500  // 500ms delay between actions
});
```

**Check terminal logs** for detailed matching info:
```
[Playwright] Processing: Organization Name (text)
[Playwright] ✓ Filled: Organization Name
[Playwright] ✗ Skipped: Budget Narrative
```

## Troubleshooting

**"Executable doesn't exist" error:**
- Run `npx playwright install chromium`

**Fields not being filled:**
- Check terminal logs for confidence scores
- Verify field names/ids match question text
- Lower confidence threshold in code if needed

**Form not submitting:**
- Only auto-submits for `localhost:3000/test-portal/*` URLs
- For external URLs, submit button is never clicked (by design)

## Production Considerations

For production deployment:

1. **Use Docker** with Playwright pre-installed
2. **Set headless: true** (already default)
3. **Add timeout handling** for slow pages
4. **Consider Lambda** with Playwright Layer for serverless
5. **Add retry logic** for flaky network conditions
