#!/usr/bin/env bash
# =============================================================================
# Euri Explorer — Complete AWS Infrastructure Setup (Step-by-step)
#
# What this script provisions:
#   1. VPC + public & private subnets (2 AZs)
#   2. Internet Gateway + NAT Gateway (for private subnet egress)
#   3. Security groups (ALB → ECS → ElastiCache)
#   4. ECR repository
#   5. IAM roles (ECS task execution & task role)
#   6. CloudWatch log group
#   7. Application Load Balancer + Target Group + Listener
#   8. ElastiCache Redis (subnet group + cluster)
#   9. ECS Cluster + Task Definition + Fargate Service
#  10. GitHub secrets reminder
#
# Requirements:
#   • aws CLI v2  (brew install awscli)
#   • jq          (brew install jq)
#   • An IAM user with AdministratorAccess (for initial setup)
#
# Usage:
#   chmod +x infrastructure/setup-aws.sh
#   ./infrastructure/setup-aws.sh
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-us-east-1}"
APP_NAME="euri-explorer"
CONTAINER_PORT=3000

# Derived names
VPC_CIDR="10.0.0.0/16"
PUB_CIDR_A="10.0.1.0/24"
PUB_CIDR_B="10.0.2.0/24"
PRI_CIDR_A="10.0.3.0/24"
PRI_CIDR_B="10.0.4.0/24"

AZ_A="${AWS_REGION}a"
AZ_B="${AWS_REGION}b"

log()  { echo -e "\n\033[1;32m▶ $*\033[0m"; }
warn() { echo -e "\033[1;33m⚠  $*\033[0m"; }

AWS="aws --region $AWS_REGION"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log "AWS Account: $ACCOUNT_ID  |  Region: $AWS_REGION"

# =============================================================================
# 1. VPC
# =============================================================================
log "[1/9] Creating VPC..."
VPC_ID=$($AWS ec2 create-vpc \
  --cidr-block "$VPC_CIDR" \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$APP_NAME-vpc}]" \
  --query Vpc.VpcId --output text)

$AWS ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames
$AWS ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support
echo "  VPC: $VPC_ID"

# Subnets
log "  Creating subnets..."
PUB_A=$($AWS ec2 create-subnet \
  --vpc-id "$VPC_ID" --cidr-block "$PUB_CIDR_A" --availability-zone "$AZ_A" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-pub-a}]" \
  --query Subnet.SubnetId --output text)

PUB_B=$($AWS ec2 create-subnet \
  --vpc-id "$VPC_ID" --cidr-block "$PUB_CIDR_B" --availability-zone "$AZ_B" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-pub-b}]" \
  --query Subnet.SubnetId --output text)

PRI_A=$($AWS ec2 create-subnet \
  --vpc-id "$VPC_ID" --cidr-block "$PRI_CIDR_A" --availability-zone "$AZ_A" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-pri-a}]" \
  --query Subnet.SubnetId --output text)

PRI_B=$($AWS ec2 create-subnet \
  --vpc-id "$VPC_ID" --cidr-block "$PRI_CIDR_B" --availability-zone "$AZ_B" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-pri-b}]" \
  --query Subnet.SubnetId --output text)

# Auto-assign public IPs on public subnets
$AWS ec2 modify-subnet-attribute --subnet-id "$PUB_A" --map-public-ip-on-launch
$AWS ec2 modify-subnet-attribute --subnet-id "$PUB_B" --map-public-ip-on-launch

echo "  Public:  $PUB_A  $PUB_B"
echo "  Private: $PRI_A  $PRI_B"

# Internet Gateway
log "  Internet Gateway..."
IGW_ID=$($AWS ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$APP_NAME-igw}]" \
  --query InternetGateway.InternetGatewayId --output text)
$AWS ec2 attach-internet-gateway --vpc-id "$VPC_ID" --internet-gateway-id "$IGW_ID"

# Public route table
PUB_RT=$($AWS ec2 create-route-table \
  --vpc-id "$VPC_ID" \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$APP_NAME-pub-rt}]" \
  --query RouteTable.RouteTableId --output text)
$AWS ec2 create-route --route-table-id "$PUB_RT" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID"
$AWS ec2 associate-route-table --subnet-id "$PUB_A" --route-table-id "$PUB_RT"
$AWS ec2 associate-route-table --subnet-id "$PUB_B" --route-table-id "$PUB_RT"

# NAT Gateway (for private subnets to reach Euri API)
log "  NAT Gateway (this takes ~2 min)..."
EIP_ALLOC=$($AWS ec2 allocate-address --domain vpc --query AllocationId --output text)
NAT_GW=$($AWS ec2 create-nat-gateway \
  --subnet-id "$PUB_A" --allocation-id "$EIP_ALLOC" \
  --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=$APP_NAME-nat}]" \
  --query NatGateway.NatGatewayId --output text)

echo -n "  Waiting for NAT Gateway to become available..."
$AWS ec2 wait nat-gateway-available --nat-gateway-ids "$NAT_GW"
echo " done."

PRI_RT=$($AWS ec2 create-route-table \
  --vpc-id "$VPC_ID" \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$APP_NAME-pri-rt}]" \
  --query RouteTable.RouteTableId --output text)
$AWS ec2 create-route --route-table-id "$PRI_RT" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NAT_GW"
$AWS ec2 associate-route-table --subnet-id "$PRI_A" --route-table-id "$PRI_RT"
$AWS ec2 associate-route-table --subnet-id "$PRI_B" --route-table-id "$PRI_RT"

# =============================================================================
# 2. Security Groups
# =============================================================================
log "[2/9] Creating security groups..."

ALB_SG=$($AWS ec2 create-security-group \
  --group-name "$APP_NAME-alb-sg" --description "ALB - allows public HTTP/HTTPS" \
  --vpc-id "$VPC_ID" --query GroupId --output text)
$AWS ec2 authorize-security-group-ingress --group-id "$ALB_SG" \
  --protocol tcp --port 80  --cidr 0.0.0.0/0
$AWS ec2 authorize-security-group-ingress --group-id "$ALB_SG" \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

ECS_SG=$($AWS ec2 create-security-group \
  --group-name "$APP_NAME-ecs-sg" --description "ECS tasks - allow from ALB only" \
  --vpc-id "$VPC_ID" --query GroupId --output text)
$AWS ec2 authorize-security-group-ingress --group-id "$ECS_SG" \
  --protocol tcp --port "$CONTAINER_PORT" --source-group "$ALB_SG"

CACHE_SG=$($AWS ec2 create-security-group \
  --group-name "$APP_NAME-cache-sg" --description "ElastiCache - allow from ECS only" \
  --vpc-id "$VPC_ID" --query GroupId --output text)
$AWS ec2 authorize-security-group-ingress --group-id "$CACHE_SG" \
  --protocol tcp --port 6379 --source-group "$ECS_SG"

echo "  ALB SG:   $ALB_SG"
echo "  ECS SG:   $ECS_SG"
echo "  Cache SG: $CACHE_SG"

# =============================================================================
# 3. ECR Repository
# =============================================================================
log "[3/9] Creating ECR repository..."
ECR_URI=$($AWS ecr create-repository \
  --repository-name "$APP_NAME" \
  --image-scanning-configuration scanOnPush=true \
  --image-tag-mutability MUTABLE \
  --query repository.repositoryUri --output text 2>/dev/null || \
  $AWS ecr describe-repositories \
    --repository-names "$APP_NAME" \
    --query "repositories[0].repositoryUri" --output text)

# Lifecycle policy: keep last 10 images, delete untagged after 1 day
$AWS ecr put-lifecycle-policy \
  --repository-name "$APP_NAME" \
  --lifecycle-policy-text '{
    "rules": [
      {"rulePriority":1,"description":"Remove untagged after 1 day",
       "selection":{"tagStatus":"untagged","countType":"sinceImagePushed","countUnit":"days","countNumber":1},
       "action":{"type":"expire"}},
      {"rulePriority":2,"description":"Keep last 10 tagged",
       "selection":{"tagStatus":"tagged","tagPrefixList":[""],"countType":"imageCountMoreThan","countNumber":10},
       "action":{"type":"expire"}}
    ]
  }' > /dev/null

echo "  ECR URI: $ECR_URI"

# =============================================================================
# 4. IAM Roles
# =============================================================================
log "[4/9] Creating IAM roles..."

# Task execution role (pulls images, writes logs)
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

# Task role (runtime permissions for the app itself)
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
log "[5/9] Creating CloudWatch log group..."
$AWS logs create-log-group --log-group-name "/ecs/$APP_NAME" 2>/dev/null || true
$AWS logs put-retention-policy \
  --log-group-name "/ecs/$APP_NAME" \
  --retention-in-days 30

# =============================================================================
# 6. Application Load Balancer
# =============================================================================
log "[6/9] Creating Application Load Balancer..."

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

echo "  ALB ARN:   $ALB_ARN"
echo "  Target GRP: $TG_ARN"
echo "  ALB DNS:   http://$ALB_DNS"

# =============================================================================
# 7. ElastiCache Redis
# =============================================================================
log "[7/9] Creating ElastiCache Redis cluster (takes ~5 min)..."

$AWS elasticache create-cache-subnet-group \
  --cache-subnet-group-name "${APP_NAME}-cache-subnet" \
  --cache-subnet-group-description "ElastiCache subnet group for $APP_NAME" \
  --subnet-ids "$PRI_A" "$PRI_B" > /dev/null

$AWS elasticache create-cache-cluster \
  --cache-cluster-id "${APP_NAME}-redis" \
  --cache-node-type cache.t4g.micro \
  --engine redis \
  --engine-version 7.1 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name "${APP_NAME}-cache-subnet" \
  --security-group-ids "$CACHE_SG" \
  --tags "Key=Name,Value=${APP_NAME}-redis" > /dev/null

echo -n "  Waiting for Redis cluster (this takes ~5 minutes)..."
$AWS elasticache wait cache-cluster-available --cache-cluster-id "${APP_NAME}-redis"
echo " done."

REDIS_ENDPOINT=$($AWS elasticache describe-cache-clusters \
  --cache-cluster-id "${APP_NAME}-redis" \
  --show-cache-node-info \
  --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" \
  --output text)
REDIS_PORT=$($AWS elasticache describe-cache-clusters \
  --cache-cluster-id "${APP_NAME}-redis" \
  --show-cache-node-info \
  --query "CacheClusters[0].CacheNodes[0].Endpoint.Port" \
  --output text)
REDIS_URL="redis://$REDIS_ENDPOINT:$REDIS_PORT"

echo "  Redis endpoint: $REDIS_URL"

# =============================================================================
# 8. ECS Cluster
# =============================================================================
log "[8/9] Creating ECS Cluster..."
$AWS ecs create-cluster \
  --cluster-name "${APP_NAME}-cluster" \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    "capacityProvider=FARGATE,weight=1,base=1" \
  --tags "key=Name,value=${APP_NAME}-cluster" > /dev/null

echo "  Cluster: ${APP_NAME}-cluster"

# Write rendered task definition
log "  Rendering task definition..."
sed \
  -e "s|<IMAGE_URI>|${ECR_URI}:latest|g" \
  -e "s|<AWS_ACCOUNT_ID>|${ACCOUNT_ID}|g" \
  -e "s|<AWS_REGION>|${AWS_REGION}|g" \
  -e "s|<REDIS_URL>|${REDIS_URL}|g" \
  "$(dirname "$0")/task-definition.json" > /tmp/task-definition-rendered.json

TASK_DEF_ARN=$($AWS ecs register-task-definition \
  --cli-input-json file:///tmp/task-definition-rendered.json \
  --query "taskDefinition.taskDefinitionArn" --output text)

echo "  Task Def: $TASK_DEF_ARN"

# ECS Service
log "  Creating ECS Service..."
$AWS ecs create-service \
  --cluster "${APP_NAME}-cluster" \
  --service-name "${APP_NAME}-service" \
  --task-definition "$TASK_DEF_ARN" \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[$PRI_A,$PRI_B],
    securityGroups=[$ECS_SG],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=$APP_NAME,containerPort=$CONTAINER_PORT" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --tags "key=Name,value=${APP_NAME}-service" > /dev/null

echo "  Service: ${APP_NAME}-service"

# =============================================================================
# 9. Summary
# =============================================================================
log "[9/9] Done! Saving resource IDs to infrastructure/aws-resources.env"
cat > "$(dirname "$0")/aws-resources.env" <<EOF
# Auto-generated by setup-aws.sh — $(date -u +"%Y-%m-%dT%H:%M:%SZ")
AWS_REGION=$AWS_REGION
ACCOUNT_ID=$ACCOUNT_ID
VPC_ID=$VPC_ID
PUB_SUBNET_A=$PUB_A
PUB_SUBNET_B=$PUB_B
PRI_SUBNET_A=$PRI_A
PRI_SUBNET_B=$PRI_B
IGW_ID=$IGW_ID
NAT_GW_ID=$NAT_GW
EIP_ALLOC_ID=$EIP_ALLOC
ALB_SG=$ALB_SG
ECS_SG=$ECS_SG
CACHE_SG=$CACHE_SG
ECR_URI=$ECR_URI
EXEC_ROLE_ARN=$EXEC_ROLE_ARN
TASK_ROLE_ARN=$TASK_ROLE_ARN
ALB_ARN=$ALB_ARN
TG_ARN=$TG_ARN
ALB_DNS=$ALB_DNS
REDIS_ENDPOINT=$REDIS_ENDPOINT
REDIS_PORT=$REDIS_PORT
REDIS_URL=$REDIS_URL
TASK_DEF_ARN=$TASK_DEF_ARN
EOF

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  All AWS resources created successfully!"
echo "  App URL: http://$ALB_DNS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  ⚠  Next: add these GitHub repository secrets"
echo "     AWS_ACCESS_KEY_ID     = <your IAM key>"
echo "     AWS_SECRET_ACCESS_KEY = <your IAM secret>"
echo "     AWS_ACCOUNT_ID        = $ACCOUNT_ID"
echo "     REDIS_URL             = $REDIS_URL"
echo ""
echo "  Then: git push origin main  — the GitHub Action will"
echo "        build, push to ECR, and deploy to ECS automatically."
echo ""
