# GrantFiller UI

AI-powered grant application assistant with AWS-backed persistence, Bedrock AI draft generation, intelligent question parsing, and PDF/DOCX support.

**GitHub Repository**: https://github.com/Ritesh-Senthil/grant-filler-genai-poc

## Features

- **Dashboard**: View all grant applications
- **New Grant**: Create new grant applications with URL and file upload (PDF/DOCX)
- **Question Parsing**: Extract questions from grant URLs (via Playwright + Bedrock) or uploaded documents (via Bedrock)
- **Review & Fill**: Edit and review AI-generated answers with two-column layout
- **Organization Profile**: Manage organization details with custom sections for AI answer generation
- **AI Draft Generation**: Generate draft answers using Amazon Bedrock (Claude Sonnet 4.5)
- **Automated Web Form Filling**: Use Playwright to automatically fill grant forms on websites
- **PDF Export**: Download filled PDF for PDF-based grants (preserves form fields when available)

## Tech Stack

- Next.js 16.0.5 (App Router)
- TypeScript
- Tailwind CSS v4 (dark mode)
- AWS DynamoDB (persistence)
- AWS S3 (file storage)
- AWS Bedrock (AI answer generation & document parsing)
- AWS Bedrock Agents (optional URL question parsing)
- Playwright (HTML parsing & automated web form filling)
- pdf-lib (PDF generation & form filling)

## Setup

### 1. Install Dependencies

```bash
npm install

# Install Playwright browsers
npx playwright install chromium
```

### 2. Configure AWS

See [AWS_SETUP.md](./AWS_SETUP.md) for:
- Creating the DynamoDB table
- Creating the S3 bucket
- Enabling Bedrock model access
- Setting up IAM permissions

See [AGENTCORE_SETUP.md](./AGENTCORE_SETUP.md) for optional Bedrock Agent setup.

Quick setup:
```bash
# Create DynamoDB table
aws dynamodb create-table \
  --table-name grantfiller-grants \
  --attribute-definitions AttributeName=grant_id,AttributeType=S \
  --key-schema AttributeName=grant_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Create S3 bucket
aws s3 mb s3://grantfiller-documents --region us-east-1

# Enable Bedrock model access (via AWS Console)
# Go to Bedrock → Model access → Enable Claude Sonnet 4.5

# Copy and configure environment variables
cp .env.local.example .env.local
# Edit .env.local with your AWS credentials
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── api/
│   ├── grants/
│   │   ├── route.ts                    # GET (list), POST (create)
│   │   └── [id]/
│   │       ├── route.ts                # GET, PUT, DELETE
│   │       ├── generate-drafts/
│   │       │   └── route.ts            # POST (AI generation)
│   │       ├── parse-questions/
│   │       │   └── route.ts            # POST (parsing from URL/file)
│   │       ├── export-pdf/
│   │       │   └── route.ts            # POST (PDF export)
│   │       └── fill-web/
│   │           └── route.ts            # POST (automated web form filling)
│   ├── org-profile/route.ts            # GET/PUT org profile
│   ├── upload/route.ts                 # POST file upload to S3
│   └── test-portal/
│       └── submit/route.ts             # POST test form submission
├── grants/
│   ├── new/page.tsx                    # New grant form + file upload
│   └── [id]/page.tsx                   # Review & fill page
├── org/page.tsx                        # Organization profile page
├── test-portal/
│   ├── page.tsx                        # Test portal index
│   ├── basic-grant/page.tsx            # Sample grant form for testing
│   └── submissions/page.tsx            # View test submissions
├── page.tsx                            # Dashboard
├── layout.tsx                          # Root layout with navbar
└── globals.css                         # Tailwind styles

lib/
├── dynamodb.ts                         # DynamoDB client
├── bedrock.ts                          # Bedrock AI client for answer generation
├── agentcore.ts                        # Bedrock Agents client (optional)
├── agentcore-webfill.ts                # Bedrock Agents for web filling (optional)
├── s3.ts                               # S3 upload/download
├── document-parser.ts                  # PDF/DOCX parsing with Bedrock
├── html-parser.ts                      # HTML/web form parsing with Playwright + Bedrock
├── webFillPlaywright.ts                # Playwright-based web form filling
├── pdf-generator.ts                    # PDF generation for Q&A format
├── pdf-form-filler.ts                  # PDF form field filling
└── mockData.ts                         # (deprecated)

components/
├── Navbar.tsx                          # Navigation bar
└── ui/                                 # Reusable UI components
    ├── Button.tsx
    ├── Input.tsx
    ├── Textarea.tsx
    ├── Card.tsx
    └── Badge.tsx

types/
└── index.ts                            # TypeScript interfaces
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/grants` | List all grants |
| POST | `/api/grants` | Create new grant |
| GET | `/api/grants/[id]` | Fetch single grant |
| PUT | `/api/grants/[id]` | Update grant |
| DELETE | `/api/grants/[id]` | Delete grant and associated S3 files |
| POST | `/api/grants/[id]/parse-questions` | Parse questions from URL or uploaded file |
| POST | `/api/grants/[id]/generate-drafts` | Generate AI draft answers |
| POST | `/api/grants/[id]/export-pdf` | Generate and download filled PDF |
| POST | `/api/grants/[id]/fill-web` | Fill web form using Playwright |
| GET | `/api/org-profile` | Fetch organization profile |
| PUT | `/api/org-profile` | Update organization profile |
| POST | `/api/upload` | Upload PDF/DOCX file to S3 |

## Data Flow

### Organization Profile
1. User navigates to `/org`
2. Form loads profile from DynamoDB (or empty if not exists)
3. User fills in org details and optional custom sections
4. Profile saved to DynamoDB with `grant_id: "default-org"`

### Grant Creation & Question Parsing

**Method 1: Web URL Input**
1. User creates grant with URL → POST to `/api/grants`
2. Grant stored in DynamoDB with 3 default questions
3. User clicks "Parse Questions from URL"
4. Playwright fetches URL, Bedrock extracts questions from HTML
5. Multi-page forms are automatically navigated
6. Questions saved to DynamoDB

**Method 2 & 3: PDF/DOCX Upload**
1. User uploads file → POST to `/api/upload`
2. File uploaded to S3 with reference stored in grant
3. Bedrock analyzes document and extracts questions
4. Questions saved to DynamoDB

### AI Draft Generation
1. User clicks "Generate AI Draft Answers" on `/grants/[id]`
2. POST to `/api/grants/[id]/generate-drafts`
3. Backend fetches grant + org profile from DynamoDB
4. Calls Bedrock Claude Sonnet 4.5 for each question (batched)
5. Questions requiring manual input are flagged
6. Status changed to `ready`

### PDF Export

**For PDF grants with editable fields:**
- Original PDF is downloaded from S3
- Form fields are detected and filled with answers
- Filled PDF uploaded to S3 and returned

**For PDF grants without editable fields:**
- New PDF generated with Q&A format
- Uploaded to S3 and returned

### Automated Web Form Filling
1. User clicks "Fill Web Form" on `/grants/[id]`
2. POST to `/api/grants/[id]/fill-web`
3. Playwright opens the grant URL (or portal_url if specified)
4. Form fields are matched to questions using semantic similarity
5. Multi-page forms are automatically navigated
6. Results returned with field mapping details

## Environment Variables

Required in `.env.local`:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
DDB_GRANTS_TABLE=grantfiller-grants
S3_BUCKET=grantfiller-documents
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0

# Optional: Bedrock Agents for URL parsing (alternative to Playwright)
AGENTCORE_REGION=us-east-1
AGENTCORE_AGENT_ID=your_agent_id
AGENTCORE_AGENT_ALIAS_ID=your_alias_id
```

## Grant Input Methods

### Method 1: Web URL Input
**Use case**: Grant applications hosted on websites with web forms

**Workflow**:
1. Enter grant URL (required)
2. Click "Parse Questions from URL"
3. Playwright + Bedrock extracts questions from the website
4. Generate AI draft answers
5. Review and edit answers
6. Use "Fill Web Form" to automatically fill the online form

### Method 2: PDF with Editable Fields
**Use case**: PDF forms with fillable fields (e.g., government grant applications)

**Export behavior**: Original PDF is filled with answers in proper fields

### Method 3: PDF without Editable Fields
**Use case**: Static PDF documents or scanned grant applications

**Export behavior**: New Q&A format PDF is generated

## Question Types Supported

- `text` - Short text input
- `textarea` - Long text input
- `single_choice` - Radio buttons / single select
- `multi_choice` - Checkboxes / multi select
- `yes_no` - Yes/No radio buttons
- `number` - Numeric input
- `date` - Date picker
- `other` - Fallback type

## Supported File Types

- **PDF**: `.pdf` files (with or without form fields)
- **DOCX**: `.docx` files (Microsoft Word)

## Testing

- **Test Portal**: http://localhost:3000/test-portal - Debug pages for testing
- **Basic Grant Form**: http://localhost:3000/test-portal/basic-grant - Sample form for testing automated filling
- **Submissions**: http://localhost:3000/test-portal/submissions - View test submissions

## Additional Documentation

- [AWS_SETUP.md](./AWS_SETUP.md) - AWS resource setup
- [AGENTCORE_SETUP.md](./AGENTCORE_SETUP.md) - Bedrock Agent setup (optional)
- [PLAYWRIGHT_SETUP.md](./PLAYWRIGHT_SETUP.md) - Playwright configuration
- [PDF_FORM_FILLING.md](./PDF_FORM_FILLING.md) - PDF form filling details
- [QUICK_START.md](./QUICK_START.md) - Quick start guide
