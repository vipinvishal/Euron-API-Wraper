#!/usr/bin/env bash
# =============================================================================
# Euri Explorer — AWS Resource Cleanup
#
# Reads resource IDs from aws-resources.env and deletes everything in the
# correct dependency order so you don't incur surprise charges.
#
# Usage:
#   chmod +x infrastructure/teardown.sh
#   ./infrastructure/teardown.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/aws-resources.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "aws-resources.env not found. Cannot proceed."
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

AWS="aws --region $AWS_REGION"

log()  { echo -e "\n\033[1;32m▶ $*\033[0m"; }
warn() { echo -e "\033[1;33m⚠  $*\033[0m"; }

echo "═══════════════════════════════════════════════"
echo "  This will DELETE all AWS resources created"
echo "  by setup-aws.sh for the euri-explorer app."
echo "═══════════════════════════════════════════════"
read -rp "  Type 'yes' to confirm: " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; exit 0; }

APP_NAME="euri-explorer"

# 1. Scale down + delete ECS service
log "Scaling down ECS service..."
$AWS ecs update-service \
  --cluster "${APP_NAME}-cluster" \
  --service "${APP_NAME}-service" \
  --desired-count 0 > /dev/null 2>&1 || warn "Service may not exist."

$AWS ecs delete-service \
  --cluster "${APP_NAME}-cluster" \
  --service "${APP_NAME}-service" \
  --force > /dev/null 2>&1 || warn "Service already deleted."

# 2. Deregister task definitions
log "Deregistering task definitions..."
TASK_DEFS=$($AWS ecs list-task-definitions \
  --family-prefix euri-explorer --query "taskDefinitionArns[]" --output text 2>/dev/null || echo "")
for arn in $TASK_DEFS; do
  $AWS ecs deregister-task-definition --task-definition "$arn" > /dev/null 2>&1 || true
done

# 3. Delete ECS cluster
log "Deleting ECS cluster..."
$AWS ecs delete-cluster --cluster "${APP_NAME}-cluster" > /dev/null 2>&1 || warn "Cluster not found."

# 4. Delete ALB + target group
log "Deleting load balancer..."
$AWS elbv2 delete-load-balancer --load-balancer-arn "$ALB_ARN" > /dev/null 2>&1 || warn "ALB not found."
sleep 10
$AWS elbv2 delete-target-group --target-group-arn "$TG_ARN" > /dev/null 2>&1 || warn "Target group not found."

# 5. Delete ECR repository (including all images)
log "Deleting ECR repository..."
$AWS ecr delete-repository \
  --repository-name "${APP_NAME}" \
  --force > /dev/null 2>&1 || warn "ECR repo not found."

# 6. Delete CloudWatch log group
log "Deleting CloudWatch logs..."
$AWS logs delete-log-group \
  --log-group-name "/ecs/${APP_NAME}" > /dev/null 2>&1 || warn "Log group not found."

# 7. Detach + delete IAM roles
log "Cleaning up IAM roles..."
$AWS iam detach-role-policy \
  --role-name "${APP_NAME}-ecs-exec-role" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true
$AWS iam delete-role --role-name "${APP_NAME}-ecs-exec-role" 2>/dev/null || warn "Exec role not found."
$AWS iam delete-role --role-name "${APP_NAME}-ecs-task-role" 2>/dev/null || warn "Task role not found."

# 8. Security groups
log "Deleting security groups..."
for SG in "$ECS_SG" "$ALB_SG"; do
  $AWS ec2 delete-security-group --group-id "$SG" 2>/dev/null || warn "SG $SG not found."
done

# 9. Subnets, route table, IGW, VPC
log "Deleting subnets and route tables..."
for SUBNET in "$PUB_SUBNET_A" "$PUB_SUBNET_B"; do
  $AWS ec2 delete-subnet --subnet-id "$SUBNET" 2>/dev/null || warn "Subnet $SUBNET not found."
done

ASSOC_IDS=$($AWS ec2 describe-route-tables \
  --route-table-ids "$RT_ID" \
  --query "RouteTables[0].Associations[].RouteTableAssociationId" \
  --output text 2>/dev/null || echo "")
for ASSOC in $ASSOC_IDS; do
  $AWS ec2 disassociate-route-table --association-id "$ASSOC" 2>/dev/null || true
done
$AWS ec2 delete-route-table --route-table-id "$RT_ID" 2>/dev/null || warn "Route table not found."

$AWS ec2 detach-internet-gateway --vpc-id "$VPC_ID" --internet-gateway-id "$IGW_ID" 2>/dev/null || true
$AWS ec2 delete-internet-gateway --internet-gateway-id "$IGW_ID" 2>/dev/null || warn "IGW not found."
$AWS ec2 delete-vpc --vpc-id "$VPC_ID" 2>/dev/null || warn "VPC not found."

echo ""
echo "═══════════════════════════════════"
echo "  All AWS resources deleted. ✓"
echo "═══════════════════════════════════"
