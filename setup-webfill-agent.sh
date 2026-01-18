#!/bin/bash

# Setup script for GrantFiller Web Fill Agent
set -e

REGION="${AWS_REGION:-us-west-2}"  # Computer use only available in us-west-2
AGENT_NAME="GrantFillerWebAgent"
MODEL_ID="us.anthropic.claude-3-5-sonnet-20241022-v2:0"  # Claude 3.5 Sonnet v2 supports computer use

echo "Setting up GrantFiller Web Fill Agent..."
echo "Region: $REGION"
echo "Model: $MODEL_ID"

# Get existing agent ID if it exists
EXISTING_AGENT_ID=$(aws bedrock-agent list-agents --region "$REGION" --query "agentSummaries[?agentName=='$AGENT_NAME'].agentId" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_AGENT_ID" ]; then
  echo "Agent already exists with ID: $EXISTING_AGENT_ID"
  AGENT_ID="$EXISTING_AGENT_ID"
else
  # Create IAM role for the agent
  echo "Creating IAM role..."
  ROLE_NAME="GrantFillerWebAgentRole"

  TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

  # Create role (ignore error if exists)
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    2>/dev/null || echo "Role already exists"

  # Attach Bedrock model invocation policy
  POLICY_ARN=$(aws iam list-policies --query "Policies[?PolicyName=='AmazonBedrockFullAccess'].Arn" --output text)
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$POLICY_ARN" 2>/dev/null || echo "Policy already attached"

  # Get role ARN
  ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
  echo "Role ARN: $ROLE_ARN"

  # Wait for role to propagate
  echo "Waiting for IAM role to propagate..."
  sleep 10

  # Create the agent
  echo "Creating Bedrock Agent..."

  AGENT_INSTRUCTION="You are a web form filling assistant. Your role is to:

1. Navigate to the provided URL using computer use tools
2. Analyze the page structure and identify form fields (inputs, textareas, selects, radios, checkboxes)
3. Match form fields to the provided grant question/answer data based on field labels, IDs, names, and semantic similarity
4. Fill each matched field with the corresponding answer value
5. DO NOT click submit buttons
6. Return a JSON summary with:
   - fieldsFilled: number of fields successfully filled
   - fieldsSkipped: number of fields that couldn't be matched
   - notes: any relevant observations
   - fieldMappingSamples: array of sample mappings showing question → selector → value

Example output:
{
  \"fieldsFilled\": 7,
  \"fieldsSkipped\": 2,
  \"notes\": \"Successfully filled most fields.\",
  \"fieldMappingSamples\": [{\"question\": \"Organization Name\", \"selector\": \"#org_name\", \"value\": \"Example Org\"}]
}"

  AGENT_RESPONSE=$(aws bedrock-agent create-agent \
    --agent-name "$AGENT_NAME" \
    --foundation-model "$MODEL_ID" \
    --instruction "$AGENT_INSTRUCTION" \
    --agent-resource-role-arn "$ROLE_ARN" \
    --region "$REGION" \
    --output json)

  AGENT_ID=$(echo "$AGENT_RESPONSE" | jq -r '.agent.agentId')
  echo "Agent created with ID: $AGENT_ID"
fi

# Add computer use action group
echo "Adding computer use action group..."

aws bedrock-agent create-agent-action-group \
  --agent-id "$AGENT_ID" \
  --agent-version "DRAFT" \
  --action-group-name "ComputerUse" \
  --parent-action-group-signature "ANTHROPIC.Computer" \
  --region "$REGION" 2>/dev/null || echo "Action group already exists"

echo "Computer use action group added"

# Prepare the agent
echo "Preparing agent..."
aws bedrock-agent prepare-agent \
  --agent-id "$AGENT_ID" \
  --region "$REGION"

echo "Waiting for agent to be prepared..."
sleep 5

# Create or get alias
EXISTING_ALIAS_ID=$(aws bedrock-agent list-agent-aliases --agent-id "$AGENT_ID" --region "$REGION" --query "agentAliasSummaries[?agentAliasName=='prod'].agentAliasId" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_ALIAS_ID" ]; then
  echo "Alias already exists with ID: $EXISTING_ALIAS_ID"
  ALIAS_ID="$EXISTING_ALIAS_ID"
else
  echo "Creating agent alias..."
  ALIAS_RESPONSE=$(aws bedrock-agent create-agent-alias \
    --agent-id "$AGENT_ID" \
    --agent-alias-name "prod" \
    --region "$REGION" \
    --output json)

  ALIAS_ID=$(echo "$ALIAS_RESPONSE" | jq -r '.agentAlias.agentAliasId')
  echo "Alias created with ID: $ALIAS_ID"
fi

# Output environment variables
echo ""
echo "✅ Setup complete!"
echo ""
echo "Add these to your .env.local:"
echo ""
echo "AGENTCORE_REGION=$REGION"
echo "AGENTCORE_WEBFILL_AGENT_ID=$AGENT_ID"
echo "AGENTCORE_WEBFILL_AGENT_ALIAS_ID=$ALIAS_ID"
echo ""
echo "⚠️  Note: Computer use is only available in us-west-2 region"
echo ""
