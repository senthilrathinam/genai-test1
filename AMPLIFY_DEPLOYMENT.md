# AWS Amplify Deployment Guide

## Prerequisites

1. AWS Account with appropriate permissions
2. GitHub repository with your code pushed
3. AWS resources already created:
   - DynamoDB table: `grantfiller-grants`
   - S3 bucket: `grantfiller-documents`
   - Bedrock model access enabled (Claude Sonnet 4.5)
   - Bedrock Agent configured (optional, for URL parsing)

## Deployment Steps

### Option 1: AWS Console (Recommended for first-time setup)

1. **Go to AWS Amplify Console**
   ```
   https://console.aws.amazon.com/amplify/
   ```

2. **Create New App**
   - Click "Create new app"
   - Select "Host web app"

3. **Connect Repository**
   - Choose GitHub as source
   - Authorize AWS Amplify to access your GitHub
   - Select your repository and branch (usually `main`)

4. **Configure Build Settings**
   - Amplify auto-detects Next.js
   - The `amplify.yml` file in your repo will be used automatically

5. **Add Environment Variables**
   
   In the Amplify Console, go to "Environment variables" and add:
   
   | Variable | Value |
   |----------|-------|
   | `AWS_REGION` | `us-east-1` |
   | `AWS_ACCESS_KEY_ID` | Your IAM access key |
   | `AWS_SECRET_ACCESS_KEY` | Your IAM secret key |
   | `DDB_GRANTS_TABLE` | `grantfiller-grants` |
   | `S3_BUCKET` | `grantfiller-documents` |
   | `BEDROCK_REGION` | `us-east-1` |
   | `BEDROCK_MODEL_ID` | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
   | `AGENTCORE_REGION` | `us-east-1` |
   | `AGENTCORE_AGENT_ID` | Your Bedrock Agent ID |
   | `AGENTCORE_AGENT_ALIAS_ID` | Your Bedrock Agent Alias ID |

6. **Deploy**
   - Click "Save and deploy"
   - Wait for build to complete (~3-5 minutes)

7. **Access Your App**
   - Amplify provides a URL like: `https://main.xxxxxxxxxx.amplifyapp.com`

### Option 2: AWS CLI Deployment

```bash
# Install Amplify CLI if not already installed
npm install -g @aws-amplify/cli

# Configure Amplify (one-time setup)
amplify configure

# Initialize Amplify in your project
cd /home/skamalar/tests/genai-test1
amplify init

# Add hosting
amplify add hosting
# Select: Hosting with Amplify Console
# Select: Continuous deployment

# Push to deploy
amplify push
```

## IAM Permissions Required

The IAM user/role used for `AWS_ACCESS_KEY_ID` needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/grantfiller-grants"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::grantfiller-documents",
        "arn:aws:s3:::grantfiller-documents/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent"
      ],
      "Resource": "*"
    }
  ]
}
```

## Post-Deployment

### Custom Domain (Optional)

1. Go to Amplify Console → Your App → Domain management
2. Click "Add domain"
3. Enter your domain and follow DNS configuration steps

### Enable Branch Previews (Optional)

1. Go to Amplify Console → Your App → Previews
2. Enable pull request previews for testing changes before merging

## Troubleshooting

### Build Fails
- Check build logs in Amplify Console
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Environment Variables Not Working
- Ensure variables are added in Amplify Console (not just `.env.local`)
- Redeploy after adding/changing environment variables

### API Routes Return 500 Errors
- Check CloudWatch logs for the Amplify app
- Verify IAM permissions for DynamoDB, S3, and Bedrock
- Ensure AWS credentials are correct

### Bedrock Errors
- Verify model access is enabled in Bedrock Console
- Check region matches `BEDROCK_REGION` environment variable
