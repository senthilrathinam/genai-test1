# AWS Setup Instructions

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed and configured

## 1. Create DynamoDB Table

Run this AWS CLI command to create the grants table:

```bash
aws dynamodb create-table \
  --table-name grantfiller-grants \
  --attribute-definitions AttributeName=grant_id,AttributeType=S \
  --key-schema AttributeName=grant_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

Or use the AWS Console:
- Go to DynamoDB → Tables → Create table
- Table name: `grantfiller-grants`
- Partition key: `grant_id` (String)
- Table settings: On-demand capacity mode
- Click Create table

**Note**: This table stores both grants and the organization profile (using `grant_id` as PK).

## 2. Create S3 Bucket (Optional - for future file uploads)

```bash
aws s3 mb s3://grantfiller-documents --region us-east-1
```

## 3. Enable Bedrock Model Access

1. Go to AWS Console → Bedrock → Model access
2. Click "Manage model access"
3. Enable access to: **Anthropic Claude 3.5 Sonnet v2**
4. Submit and wait for approval (usually instant)

## 4. Configure IAM Permissions

Your AWS credentials need these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/grantfiller-grants"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::grantfiller-documents/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    }
  ]
}
```

## 5. Set Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your AWS credentials:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
DDB_GRANTS_TABLE=grantfiller-grants
S3_BUCKET=grantfiller-documents
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

**Security Note**: Never commit `.env.local` to version control. It's already in `.gitignore`.

## 6. Install Dependencies and Run

```bash
npm install
npm run dev
```

## Testing

1. Navigate to http://localhost:3000
2. Go to "Org Profile" and fill in your organization details
3. Click "Save Changes"
4. Go back to "Grants" and click "New Grant"
5. Create a grant with a name and URL
6. On the review page, click "Generate AI Draft Answers"
7. Watch as AI generates answers based on your org profile
8. Edit answers (auto-saved on blur)
9. Mark questions as reviewed

## Verify DynamoDB Data

```bash
# View all items (grants + org profile)
aws dynamodb scan --table-name grantfiller-grants --region us-east-1

# View just the org profile
aws dynamodb get-item \
  --table-name grantfiller-grants \
  --key '{"grant_id": {"S": "default-org"}}' \
  --region us-east-1
```

## Table Schema

The `grantfiller-grants` table stores two types of items:

### Grant Items
```json
{
  "grant_id": "uuid",
  "grant_name": "string",
  "grant_url": "string",
  "status": "draft|ready|filled|submitted",
  "created_at": "ISO8601 timestamp",
  "updated_at": "ISO8601 timestamp",
  "responses": [
    {
      "question_id": "uuid",
      "question_text": "string",
      "answer_text": "string",
      "reviewed": boolean
    }
  ]
}
```

### Organization Profile Item
```json
{
  "grant_id": "default-org",
  "org_id": "default-org",
  "legal_name": "string",
  "mission_short": "string",
  "mission_long": "string",
  "address": "string",
  "updated_at": "ISO8601 timestamp"
}
```
