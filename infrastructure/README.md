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
Amazon ECS Fargate        ←── Application Load Balancer (internet-facing)
(public subnets, 2 AZs)       Port 80 → ECS tasks port 3000
     │
     │  outbound HTTPS
     ▼
api.euri.ai  (fetched directly, no NAT Gateway needed)
```

> ECS tasks run in **public subnets** with a public IP, but the security group
> only allows inbound traffic from the ALB — no direct public access to tasks.
> Next.js built-in `revalidate` handles server-side caching (no Redis needed).

---

## Pre-requisites

| Tool | Install | Check |
|------|---------|-------|
| AWS CLI v2 | `brew install awscli` | `aws --version` |
| Docker Desktop | [docs.docker.com](https://docs.docker.com/desktop/mac/) | `docker --version` |
| Git | pre-installed on macOS | `git --version` |
| jq | `brew install jq` | `jq --version` |

---

## Step 1 — Configure AWS CLI

```bash
aws configure
# AWS Access Key ID:     <your IAM access key>
# AWS Secret Access Key: <your IAM secret>
# Default region name:   ap-south-1
# Default output format: json
```

Your IAM user needs **AdministratorAccess** (or EC2 + ECR + ECS + ELB + IAM + CloudWatch).

Verify:

```bash
aws sts get-caller-identity
```

---

## Step 2 — Push code to GitHub

```bash
cd "/Users/vipinvishal/Desktop/Vipin Codes/Euron Wraper/euri-explorer"

git init
git add .
git commit -m "feat: initial euri-explorer app"
git remote add origin https://github.com/vipinvishal/Euron-API-Wraper.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Provision AWS Infrastructure (one-time, ~3 min)

```bash
cd "/Users/vipinvishal/Desktop/Vipin Codes/Euron Wraper/euri-explorer"
chmod +x infrastructure/setup-aws.sh infrastructure/teardown.sh
./infrastructure/setup-aws.sh
```

When done, it prints:
- **ALB URL** — your app's public URL
- Resource IDs saved to `infrastructure/aws-resources.env`
- GitHub secrets to add

---

## Step 4 — Add GitHub Repository Secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your IAM access key ID |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret access key |
| `AWS_ACCOUNT_ID` | Printed by setup script (or: `aws sts get-caller-identity --query Account --output text`) |

That's it — only **3 secrets**. No Redis URL needed.

---

## Step 5 — Trigger First Deployment

```bash
git commit --allow-empty -m "chore: trigger first deployment"
git push origin main
```

Watch it at **GitHub → Actions tab**. The pipeline:
1. Builds the Docker image (layer-cached for speed)
2. Pushes to ECR with commit SHA tag + `latest`
3. Renders the ECS task definition with the new image
4. Deploys to ECS Fargate — zero-downtime rolling update
5. Prints the ALB URL

---

## Step 6 — Verify

```bash
source infrastructure/aws-resources.env
curl http://$ALB_DNS/api/health
# {"status":"ok","timestamp":"..."}
```

---

## Every Future Deploy

```bash
git add .
git commit -m "feat: your change"
git push origin main   # ← fully automated from here
```

---

## Monitoring

```bash
# Live logs
aws logs tail /ecs/euri-explorer --follow --region ap-south-1

# Service health
aws ecs describe-services \
  --cluster euri-explorer-cluster \
  --services euri-explorer-service \
  --region ap-south-1 \
  --query "services[0].{Status:status,Desired:desiredCount,Running:runningCount}"

# ALB target health
source infrastructure/aws-resources.env
aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --region ap-south-1 \
  --query "TargetHealthDescriptions[].{Target:Target.Id,Health:TargetHealth.State}"
```

---

## Scaling

```bash
aws ecs update-service \
  --cluster euri-explorer-cluster \
  --service euri-explorer-service \
  --desired-count 3 \
  --region ap-south-1
```

---

## Teardown

```bash
./infrastructure/teardown.sh
```

---

## Cost Estimate (ap-south-1 Mumbai, 1 task running 24/7)

| Resource | ~Monthly cost |
|---|---|
| ECS Fargate (0.5 vCPU, 1 GB) | ~$15 |
| Application Load Balancer | ~$18 |
| CloudWatch Logs (30-day retention) | ~$1 |
| ECR storage (first 500 MB free) | ~$0 |
| **Total** | **~$34/month** |

Compared to the previous Redis setup (~$78/month), this saves **~$44/month** by removing ElastiCache and the NAT Gateway.

---

## Files Reference

```
euri-explorer/
├── Dockerfile                         # Multi-stage build (deps → builder → runner)
├── .dockerignore
├── next.config.ts                     # output: standalone + security headers
├── app/api/health/route.ts            # ALB + Docker health check endpoint
├── app/api/models/route.ts            # Euri proxy with Next.js revalidate caching
├── .github/
│   └── workflows/
│       └── deploy.yml                 # GitHub Actions CI/CD (3 secrets only)
└── infrastructure/
    ├── setup-aws.sh                   # One-time AWS provisioning (~3 min)
    ├── task-definition.json           # ECS task definition template
    ├── teardown.sh                    # Delete all AWS resources
    ├── aws-resources.env              # Generated: resource IDs (git-ignored)
    └── README.md                      # This file
```
