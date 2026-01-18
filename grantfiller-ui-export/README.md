# GrantFiller UI

AI-powered grant application assistant with AWS-backed persistence, Bedrock AI draft generation, AgentCore question parsing, and PDF/DOCX support.

**GitHub Repository**: https://github.com/Ritesh-Senthil/grant-filler-genai-poc

## Features

- **Dashboard**: View all grant applications
- **New Grant**: Create new grant applications with URL and file upload (PDF/DOCX)
- **Question Parsing**: Extract questions from grant URLs or uploaded documents using AgentCore and Bedrock
- **Review & Fill**: Edit and review AI-generated answers with two-column layout
- **Organization Profile**: Manage organization details used for AI answer generation
- **AI Draft Generation**: Generate draft answers using Amazon Bedrock (Claude Sonnet 4.5)
- **Automated Web Form Filling**: Use Playwright to automatically fill grant forms on websites
- **PDF Export**: Download filled PDF for PDF-based grants with formatted Q&A layout

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4 (dark mode)
- AWS DynamoDB (persistence)
- AWS S3 (file storage)
- AWS Bedrock (AI answer generation & document parsing)
- AWS Bedrock Agents (URL question parsing)
- Playwright (automated web form filling)
- pdf-lib (PDF generation)

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

See [AGENTCORE_SETUP.md](./AGENTCORE_SETUP.md) for:
- Creating the GrantParserAgent
- Configuring agent instructions
- Testing the agent

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

# Create Bedrock Agent (via AWS Console)
# See AGENTCORE_SETUP.md for detailed instructions

# Copy and configure environment variables
cp .env.local.example .env.local
# Edit .env.local with your AWS credentials and agent IDs
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
│   │       ├── route.ts                # GET (fetch), PUT (update)
│   │       ├── generate-drafts/
│   │       │   └── route.ts            # POST (AI generation)
│   │       ├── parse-questions/
│   │       │   └── route.ts            # POST (parsing from URL/file)
│   │       └── export-pdf/
│   │           └── route.ts            # POST (PDF export)
│   ├── org-profile/route.ts            # GET/PUT org profile
│   └── upload/route.ts                 # POST file upload to S3
├── grants/
│   ├── new/page.tsx                    # New grant form + file upload
│   └── [id]/page.tsx                   # Review & fill page
├── org/page.tsx                        # Organization profile page
├── page.tsx                            # Dashboard
├── layout.tsx                          # Root layout with navbar
└── globals.css                         # Tailwind styles

lib/
├── dynamodb.ts                         # DynamoDB client
├── bedrock.ts                          # Bedrock AI client
├── agentcore.ts                        # AgentCore agent client
├── s3.ts                               # S3 upload/download
├── document-parser.ts                  # PDF/DOCX parsing with Bedrock
├── pdf-generator.ts                    # PDF generation for filled grants
└── mockData.ts                         # (deprecated)

types/
└── index.ts                            # TypeScript interfaces
```

## API Routes

- `GET /api/grants` - List all grants
- `POST /api/grants` - Create new grant with dummy questions
- `GET /api/grants/[id]` - Fetch single grant
- `PUT /api/grants/[id]` - Update grant (answers, status, etc.)
- `POST /api/grants/[id]/parse-questions` - Parse questions from URL or uploaded file
- `POST /api/grants/[id]/export-pdf` - Generate and download filled PDF
- `POST /api/grants/[id]/generate-drafts` - Generate AI draft answers
- `GET /api/org-profile` - Fetch organization profile
- `PUT /api/org-profile` - Update organization profile
- `POST /api/upload` - Upload PDF/DOCX file to S3

## Data Flow

### Organization Profile
1. User navigates to `/org`
2. Form loads profile from DynamoDB (or empty if not exists)
3. User fills in org details and clicks "Save Changes"
4. Profile saved to DynamoDB with `grant_id: "default-org"`

### Grant Creation & Question Parsing

**Method 1: Web URL Input**
1. User creates grant with URL → POST to `/api/grants`
2. Grant stored in DynamoDB with 3 dummy questions
3. User clicks "Parse Questions from URL"
4. AgentCore fetches URL and extracts questions
5. Questions saved to DynamoDB

**Method 2 & 3: PDF Upload (with or without editable fields)**
1. User uploads PDF file → POST to `/api/upload`
2. File uploaded to S3 with reference stored in grant
3. Grant stored in DynamoDB with file reference
4. Bedrock automatically analyzes document and extracts questions
5. Questions saved to DynamoDB

### AI Draft Generation
1. User clicks "Generate AI Draft Answers" on `/grants/[id]`
2. POST to `/api/grants/[id]/generate-drafts`
3. Backend fetches grant + org profile from DynamoDB
4. Calls Bedrock Claude Sonnet 4.5 for each question
5. Updates grant with AI-generated answers
6. Status changed to `ready`
7. UI refreshes with new answers

### Answer Editing
1. User edits answer in textarea
2. Auto-saves on blur → PUT to `/api/grants/[id]`
3. Updates DynamoDB

### PDF Export

**For PDF grants with editable fields:**
1. User clicks "Download Filled PDF" on `/grants/[id]`
2. POST to `/api/grants/[id]/export-pdf`
3. Backend downloads original PDF from S3
4. Detects editable form fields in PDF
5. Intelligently maps answers to form fields
6. Fills original PDF with answers
7. Uploads filled PDF to S3 under `exports/{grant_id}-filled.pdf`
8. Returns presigned download URL
9. Browser downloads the filled PDF (original format preserved)

**For PDF grants without editable fields:**
1. User clicks "Download Filled PDF" on `/grants/[id]`
2. POST to `/api/grants/[id]/export-pdf`
3. Backend attempts to detect form fields, finds none
4. Generates new PDF with Q&A format using pdf-lib
5. Uploads PDF to S3 under `exports/{grant_id}.pdf`
6. Returns presigned download URL
7. Browser downloads the Q&A PDF (original format NOT preserved)

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
AGENTCORE_REGION=us-east-1
AGENTCORE_AGENT_ID=your_agent_id
AGENTCORE_AGENT_ALIAS_ID=your_alias_id
```

## Grant Input Methods

The application supports three distinct input methods, each with different workflows and export behaviors:

### Method 1: Web URL Input
**Use case**: Grant applications hosted on websites with web forms

**Workflow**:
1. Enter grant URL (required)
2. Click "Parse Questions from URL"
3. AgentCore extracts questions from the website
4. Generate AI draft answers
5. Review and edit answers
6. Use automated web form filling to submit (no PDF export)

**Export**: No PDF export available. Use automated form filling to submit directly to the website.

---

### Method 2: PDF with Editable Fields
**Use case**: PDF forms with fillable fields (e.g., government grant applications)

**Workflow**:
1. Upload PDF file with editable form fields
2. Questions are automatically parsed from the PDF
3. Generate AI draft answers
4. Review and edit answers
5. Click "Download Filled PDF"

**Export behavior**:
- The app automatically detects editable fields in the uploaded PDF
- Answers are intelligently mapped to corresponding form fields
- The original PDF is filled with your answers in the proper fields
- Downloaded PDF maintains the original format and structure
- **Result**: Professional, properly formatted PDF ready for submission

---

### Method 3: PDF without Editable Fields
**Use case**: Static PDF documents or scanned grant applications

**Workflow**:
1. Upload PDF file without editable fields
2. Questions are automatically parsed from the PDF
3. Generate AI draft answers
4. Review and edit answers
5. Click "Download Filled PDF"

**Export behavior**:
- The app detects no editable fields are available
- A new PDF is generated with questions and answers in a standard Q&A format
- The original PDF layout is NOT preserved
- **Result**: Functional Q&A document, but formatting does not match the original PDF

---

## Usage Flow

1. **Set up organization profile**
   - Navigate to "Org Profile"
   - Fill in legal name, mission, and address
   - Click "Save Changes"

2. **Create a grant** (choose your input method)
   - Click "New Grant" on dashboard
   - Enter grant name (required)
   - Choose one of the three input methods above

3. **Parse questions**
   - For web URL: Click "Parse Questions from URL"
   - For PDF uploads: Questions are automatically parsed on upload

4. **Generate AI answers**
   - Click "Generate AI Draft Answers"
   - Bedrock generates answers based on org profile

5. **Review and edit**
   - View questions in left sidebar
   - Edit answers in main panel (auto-saves)
   - Mark questions as reviewed

6. **Export or submit**
   - For web URL grants: Use automated form filling
   - For PDF grants: Click "Download Filled PDF" (behavior depends on PDF type as described above)

## Supported File Types

- **PDF**: `.pdf` files
- **DOCX**: `.docx` files (Microsoft Word)

Files are uploaded to S3 and automatically analyzed by Bedrock to extract grant questions.

## Workflow Notes

- **Three input methods**: Web URL (for online forms), PDF with editable fields (preserves format), PDF without editable fields (generates Q&A format)
- **Automatic PDF parsing**: Uploaded PDFs are immediately analyzed by Bedrock to extract questions
- **Automatic field detection**: The app automatically detects if a PDF has editable form fields
- **Smart field mapping**: For PDFs with editable fields, answers are intelligently matched to form fields by name similarity
- **Fallback behavior**: If parsing fails, the app falls back to 3 default questions

## Testing

- **Test Portal**: http://localhost:3000/test-portal/basic-grant - Debug page for testing automated website form submissions

## Next Steps (Not Yet Implemented)

- Automated form filling on grant websites
- Multi-step agent workflows
- Multi-organization support
- Answer regeneration with different tones
- Character limit validation
- OCR for scanned PDFs
