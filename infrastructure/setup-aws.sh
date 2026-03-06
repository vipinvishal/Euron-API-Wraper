#!/usr/bin/env bash
# =============================================================================
# Euri Explorer — AWS Infrastructure Setup
#
# What this script provisions:
#   1. VPC + 2 public subnets (2 AZs)  — no private subnets, no NAT Gateway
#   2. Internet Gateway + route table
#   3. Security groups (ALB → ECS, least privilege)
#   4. ECR repository (with lifecycle policy)
#   5. IAM roles (ECS task execution & task role)
#   6. CloudWatch log group
#   7. Application Load Balancer + Target Group + Listener
#   8. ECS Cluster + Task Definition + Fargate Service (public subnets)
#   9. Summary + GitHub secrets reminder
#
# Requirements:
#   • aws CLI v2  (brew install awscli)
#   • jq          (brew install jq)
#   • An IAM user with AdministratorAccess (for initial setup only)
#
# Usage:
#   chmod +x infrastructure/setup-aws.sh
#   ./infrastructure/setup-aws.sh
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-ap-south-1}"
APP_NAME="euri-explorer"
CONTAINER_PORT=3000

VPC_CIDR="10.0.0.0/16"
PUB_CIDR_A="10.0.1.0/24"
PUB_CIDR_B="10.0.2.0/24"
AZ_A="${AWS_REGION}a"
AZ_B="${AWS_REGION}b"

log()  { echo -e "\n\033[1;32m▶ $*\033[0m"; }
warn() { echo -e "\033[1;33m⚠  $*\033[0m"; }

AWS="aws --region $AWS_REGION"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log "AWS Account: $ACCOUNT_ID  |  Region: $AWS_REGION"

# =============================================================================
# 1. VPC + Public Subnets + Internet Gateway
# =============================================================================
log "[1/7] Creating VPC..."
VPC_ID=$($AWS ec2 create-vpc \
  --cidr-block "$VPC_CIDR" \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$APP_NAME-vpc}]" \
  --query Vpc.VpcId --output text)

$AWS ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames
$AWS ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support
echo "  VPC: $VPC_ID"

PUB_A=$($AWS ec2 create-subnet \
  --vpc-id "$VPC_ID" --cidr-block "$PUB_CIDR_A" --availability-zone "$AZ_A" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-pub-a}]" \
  --query Subnet.SubnetId --output text)

PUB_B=$($AWS ec2 create-subnet \
  --vpc-id "$VPC_ID" --cidr-block "$PUB_CIDR_B" --availability-zone "$AZ_B" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-pub-b}]" \
  --query Subnet.SubnetId --output text)

$AWS ec2 modify-subnet-attribute --subnet-id "$PUB_A" --map-public-ip-on-launch
$AWS ec2 modify-subnet-attribute --subnet-id "$PUB_B" --map-public-ip-on-launch

IGW_ID=$($AWS ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$APP_NAME-igw}]" \
  --query InternetGateway.InternetGatewayId --output text)
$AWS ec2 attach-internet-gateway --vpc-id "$VPC_ID" --internet-gateway-id "$IGW_ID"

RT_ID=$($AWS ec2 create-route-table \
  --vpc-id "$VPC_ID" \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$APP_NAME-rt}]" \
  --query RouteTable.RouteTableId --output text)
$AWS ec2 create-route --route-table-id "$RT_ID" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID" > /dev/null
$AWS ec2 associate-route-table --subnet-id "$PUB_A" --route-table-id "$RT_ID" > /dev/null
$AWS ec2 associate-route-table --subnet-id "$PUB_B" --route-table-id "$RT_ID" > /dev/null

echo "  Subnets: $PUB_A  $PUB_B"
echo "  IGW:     $IGW_ID"

# =============================================================================
# 2. Security Groups
# =============================================================================
log "[2/7] Creating security groups..."

ALB_SG=$($AWS ec2 create-security-group \
  --group-name "$APP_NAME-alb-sg" \
  --description "ALB - allow HTTP/HTTPS from internet" \
  --vpc-id "$VPC_ID" --query GroupId --output text)
$AWS ec2 authorize-security-group-ingress --group-id "$ALB_SG" --protocol tcp --port 80  --cidr 0.0.0.0/0
$AWS ec2 authorize-security-group-ingress --group-id "$ALB_SG" --protocol tcp --port 443 --cidr 0.0.0.0/0

ECS_SG=$($AWS ec2 create-security-group \
  --group-name "$APP_NAME-ecs-sg" \
  --description "ECS tasks - allow only from ALB" \
  --vpc-id "$VPC_ID" --query GroupId --output text)
$AWS ec2 authorize-security-group-ingress --group-id "$ECS_SG" \
  --protocol tcp --port "$CONTAINER_PORT" --source-group "$ALB_SG"

echo "  ALB SG: $ALB_SG"
echo "  ECS SG: $ECS_SG"

# =============================================================================
# 3. ECR Repository
# =============================================================================
log "[3/7] Creating ECR repository..."
ECR_URI=$($AWS ecr create-repository \
  --repository-name "$APP_NAME" \
  --image-scanning-configuration scanOnPush=true \
  --image-tag-mutability MUTABLE \
  --query repository.repositoryUri --output text 2>/dev/null || \
  $AWS ecr describe-repositories \
    --repository-names "$APP_NAME" \
    --query "repositories[0].repositoryUri" --output text)

cat > /tmp/ecr-lifecycle.json <<'LIFECYCLE'
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Remove untagged images after 1 day",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 1
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Keep only last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    }
  ]
}
LIFECYCLE

$AWS ecr put-lifecycle-policy \
  --repository-name "$APP_NAME" \
  --lifecycle-policy-text file:///tmp/ecr-lifecycle.json > /dev/null

echo "  ECR URI: $ECR_URI"

# =============================================================================
# 4. IAM Roles
# =============================================================================
log "[4/7] Creating IAM roles..."

EXEC_ROLE_ARN=$($AWS iam create-role \
  --role-name "${APP_NAME}-ecs-exec-role" \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }' --query Role.Arn --output text 2>/dev/null || \
  $AWS iam get-role --role-name "${APP_NAME}-ecs-exec-role" --query Role.Arn --output text)

$AWS iam attach-role-policy \
  --role-name "${APP_NAME}-ecs-exec-role" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true

TASK_ROLE_ARN=$($AWS iam create-role \
  --role-name "${APP_NAME}-ecs-task-role" \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }' --query Role.Arn --output text 2>/dev/null || \
  $AWS iam get-role --role-name "${APP_NAME}-ecs-task-role" --query Role.Arn --output text)

echo "  Exec Role: $EXEC_ROLE_ARN"
echo "  Task Role: $TASK_ROLE_ARN"

# =============================================================================
# 5. CloudWatch Log Group
# =============================================================================
log "[5/7] Creating CloudWatch log group..."
$AWS logs create-log-group --log-group-name "/ecs/$APP_NAME" 2>/dev/null || true
$AWS logs put-retention-policy --log-group-name "/ecs/$APP_NAME" --retention-in-days 30

# =============================================================================
# 6. Application Load Balancer
# =============================================================================
log "[6/7] Creating Application Load Balancer..."

ALB_ARN=$($AWS elbv2 create-load-balancer \
  --name "${APP_NAME}-alb" \
  --subnets "$PUB_A" "$PUB_B" \
  --security-groups "$ALB_SG" \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query "LoadBalancers[0].LoadBalancerArn" --output text)

TG_ARN=$($AWS elbv2 create-target-group \
  --name "${APP_NAME}-tg" \
  --protocol HTTP \
  --port "$CONTAINER_PORT" \
  --vpc-id "$VPC_ID" \
  --target-type ip \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query "TargetGroups[0].TargetGroupArn" --output text)

$AWS elbv2 create-listener \
  --load-balancer-arn "$ALB_ARN" \
  --protocol HTTP \
  --port 80 \
  --default-actions "Type=forward,TargetGroupArn=$TG_ARN" > /dev/null

ALB_DNS=$($AWS elbv2 describe-load-balancers \
  --load-balancer-arns "$ALB_ARN" \
  --query "LoadBalancers[0].DNSName" --output text)

echo "  ALB DNS: http://$ALB_DNS"
echo "  TG ARN:  $TG_ARN"

# =============================================================================
# 7. ECS Cluster + Task Definition + Fargate Service
# =============================================================================
log "[7/7] Creating ECS Cluster + Service..."

# Ensure the ECS service-linked role exists (required on first ECS use in an account)
$AWS iam create-service-linked-role --aws-service-name ecs.amazonaws.com 2>/dev/null || true

$AWS ecs create-cluster \
  --cluster-name "${APP_NAME}-cluster" \
  --tags "key=Name,value=${APP_NAME}-cluster" > /dev/null

sed \
  -e "s|<IMAGE_URI>|${ECR_URI}:latest|g" \
  -e "s|<AWS_ACCOUNT_ID>|${ACCOUNT_ID}|g" \
  -e "s|<AWS_REGION>|${AWS_REGION}|g" \
  "$(dirname "$0")/task-definition.json" > /tmp/task-definition-rendered.json

TASK_DEF_ARN=$($AWS ecs register-task-definition \
  --cli-input-json file:///tmp/task-definition-rendered.json \
  --query "taskDefinition.taskDefinitionArn" --output text)

# ECS tasks run in PUBLIC subnets — no NAT Gateway needed.
# Security group blocks all direct inbound; only ALB can reach port 3000.
$AWS ecs create-service \
  --cluster "${APP_NAME}-cluster" \
  --service-name "${APP_NAME}-service" \
  --task-definition "$TASK_DEF_ARN" \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[$PUB_A,$PUB_B],
    securityGroups=[$ECS_SG],
    assignPublicIp=ENABLED
  }" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=$APP_NAME,containerPort=$CONTAINER_PORT" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --tags "key=Name,value=${APP_NAME}-service" > /dev/null

echo "  Cluster: ${APP_NAME}-cluster"
echo "  Service: ${APP_NAME}-service"
echo "  Task Def: $TASK_DEF_ARN"

# =============================================================================
# Save resource IDs + print summary
# =============================================================================
cat > "$(dirname "$0")/aws-resources.env" <<EOF
# Auto-generated by setup-aws.sh — $(date -u +"%Y-%m-%dT%H:%M:%SZ")
AWS_REGION=$AWS_REGION
ACCOUNT_ID=$ACCOUNT_ID
VPC_ID=$VPC_ID
PUB_SUBNET_A=$PUB_A
PUB_SUBNET_B=$PUB_B
IGW_ID=$IGW_ID
RT_ID=$RT_ID
ALB_SG=$ALB_SG
ECS_SG=$ECS_SG
ECR_URI=$ECR_URI
EXEC_ROLE_ARN=$EXEC_ROLE_ARN
TASK_ROLE_ARN=$TASK_ROLE_ARN
ALB_ARN=$ALB_ARN
TG_ARN=$TG_ARN
ALB_DNS=$ALB_DNS
TASK_DEF_ARN=$TASK_DEF_ARN
EOF

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  All AWS resources created successfully!"
echo "  App URL: http://$ALB_DNS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  ⚠  Next: add these 3 GitHub repository secrets"
echo "     AWS_ACCESS_KEY_ID     = <your IAM key>"
echo "     AWS_SECRET_ACCESS_KEY = <your IAM secret>"
echo "     AWS_ACCOUNT_ID        = $ACCOUNT_ID"
echo ""
echo "  Then: git push origin main  — GitHub Action will"
echo "        build → push to ECR → deploy to ECS automatically."
echo ""
