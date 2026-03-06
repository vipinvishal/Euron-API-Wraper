# Euri Explorer — Production Deployment Guide

## Architecture Overview

```
Local Machine
     │
     │  git push origin main
     ▼
GitHub Repository
     │
     │  GitHub Actions (build → push → deploy)
     ▼
Amazon ECR (Docker registry)
     │
     │  pulls image
     ▼
Amazon ECS Fargate (private subnets, 2 AZs)
     │                    │
     │ reads/writes        │ HTTP traffic
     ▼                    ▼
ElastiCache Redis    Application Load Balancer
(API response cache) (public subnets, internet-facing)
```

---

## Pre-requisites

| Tool | Install | Check |
|------|---------|-------|
| AWS CLI v2 | `brew install awscli` | `aws --version` |
| Docker Desktop | [docs.docker.com](https://docs.docker.com/desktop/mac/) | `docker --version` |
| Git | pre-installed on macOS | `git --version` |
| jq | `brew install jq` | `jq --version` |
| GitHub account | — | — |

---

## Step 1 — Configure AWS CLI

```bash
aws configure
# AWS Access Key ID:     <your IAM access key>
# AWS Secret Access Key: <your IAM secret>
# Default region name:   us-east-1
# Default output format: json
```

Your IAM user needs **AdministratorAccess** (or at minimum permissions for
EC2, ECR, ECS, ElastiCache, ELB, IAM, CloudWatch, and CloudFormation).

Verify it works:

```bash
aws sts get-caller-identity
```

---

## Step 2 — Push code to GitHub

```bash
cd "/Users/vipinvishal/Desktop/Vipin Codes/Euron Wraper/euri-explorer"

# Initialize git (if not done)
git init
git add .
git commit -m "feat: initial euri-explorer app"

# Create repo on GitHub (using GitHub CLI) — OR create it on github.com and add remote
gh repo create euri-explorer --public
# or:
# git remote add origin https://github.com/YOUR_USERNAME/euri-explorer.git

git branch -M main
git push -u origin main
```

---

## Step 3 — Provision AWS Infrastructure (one-time)

```bash
cd "/Users/vipinvishal/Desktop/Vipin Codes/Euron Wraper/euri-explorer"
chmod +x infrastructure/setup-aws.sh infrastructure/teardown.sh

./infrastructure/setup-aws.sh
```

The script takes about **8–10 minutes** (NAT Gateway + ElastiCache are the slow parts).

When done, it prints:
- **ALB URL** — your app's public URL
- **Resource IDs** saved to `infrastructure/aws-resources.env`
- **GitHub secrets** to add

---

## Step 4 — Add GitHub Repository Secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your IAM user's access key ID |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user's secret access key |
| `AWS_ACCOUNT_ID` | Printed at end of setup-aws.sh (or: `aws sts get-caller-identity --query Account --output text`) |
| `REDIS_URL` | Printed at end of setup-aws.sh (format: `redis://xxx.cache.amazonaws.com:6379`) |

---

## Step 5 — Trigger Deployment

Push any code change to `main`:

```bash
git add .
git commit -m "feat: something new"
git push origin main
```

This triggers the GitHub Action (`.github/workflows/deploy.yml`) which:
1. Builds a multi-stage Docker image
2. Pushes it to ECR with the commit SHA as the tag
3. Also tags it as `latest`
4. Renders the ECS task definition with the new image URI
5. Deploys the task definition to ECS Fargate
6. Waits for the service to reach a stable state
7. Prints the ALB URL

Monitor the deployment: **GitHub → Actions tab → latest run**

---

## Step 6 — Verify

```bash
# Get your ALB URL
source infrastructure/aws-resources.env
echo "http://$ALB_DNS"
curl http://$ALB_DNS/api/health
# {"status":"ok","timestamp":"..."}
```

Open the ALB URL in your browser — you should see the Euri Explorer app.

---

## Updating the App

Just push to `main`. GitHub Actions handles the rest.

```bash
# Make changes, then:
git add .
git commit -m "fix: update something"
git push origin main
```

ECS performs a **rolling update** — zero downtime by default
(200% max, 100% min healthy in `deployment-configuration`).

---

## Monitoring & Logs

```bash
# Live ECS task logs
aws logs tail /ecs/euri-explorer --follow --region us-east-1

# ECS service status
aws ecs describe-services \
  --cluster euri-explorer-cluster \
  --services euri-explorer-service \
  --region us-east-1 \
  --query "services[0].{Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount}"

# ALB target health
source infrastructure/aws-resources.env
aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --region us-east-1 \
  --query "TargetHealthDescriptions[].{Target:Target.Id,Health:TargetHealth.State}"
```

---

## Scaling

```bash
# Scale to 3 tasks (horizontal scale)
aws ecs update-service \
  --cluster euri-explorer-cluster \
  --service euri-explorer-service \
  --desired-count 3 \
  --region us-east-1
```

---

## Teardown (Delete All Resources)

```bash
./infrastructure/teardown.sh
```

> This permanently deletes all AWS resources. You will be prompted to confirm.

---

## Cost Estimate (us-east-1, 1 task 24/7)

| Resource | ~Monthly cost |
|---|---|
| ECS Fargate (0.5 vCPU, 1 GB) | ~$15 |
| ALB | ~$18 |
| ElastiCache t4g.micro | ~$12 |
| NAT Gateway | ~$32 (fixed) + data |
| ECR storage (first 500 MB free) | ~$0 |
| CloudWatch Logs (30-day retention) | ~$1 |
| **Total** | **~$78/month** |

To save cost during development, **run the teardown script** when not in use.

---

## Files Reference

```
euri-explorer/
├── Dockerfile                         # Multi-stage build
├── .dockerignore                      # Docker build exclusions
├── next.config.ts                     # output: standalone, security headers
├── lib/redis.ts                       # ElastiCache client (no-op in local dev)
├── app/api/health/route.ts            # Health check endpoint
├── app/api/models/route.ts            # Models proxy with Redis caching
├── .github/
│   └── workflows/
│       └── deploy.yml                 # GitHub Actions CI/CD pipeline
└── infrastructure/
    ├── setup-aws.sh                   # One-time AWS provisioning
    ├── task-definition.json           # ECS task definition template
    ├── teardown.sh                    # Cleanup all AWS resources
    ├── aws-resources.env              # Generated: resource IDs (git-ignored)
    └── README.md                      # This file
```
