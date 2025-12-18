# Spryte CI/CD Runbook (GitHub → AWS ECS)

## 0) Goal

This document defines the repeatable process for deploying Spryte from GitHub to an existing AWS ECS Fargate deployment.

It is intentionally written as a “living runbook”:

- Fill in the **Questions to confirm** sections.
- As answers become known, replace placeholders.
- The end state is: **push to GitHub → automatic deploy to AWS**.

## 1) Current state (from repo)

### 1.1 Repo layout

- `backend/` (Flask)
- `frontend/` (React + nginx)
- `aws/` (manual deployment guide + task definition templates)

### 1.2 Containers

- **Backend Dockerfile:** `backend/Dockerfile`
  - Listens on `:5000`
  - Health endpoint: `GET /api/health`
  - Docker healthcheck calls `http://localhost:5000/api/health`
- **Frontend Dockerfile:** `frontend/Dockerfile`
  - Listens on `:8080`
  - Docker healthcheck calls `http://localhost:8080/`

### 1.3 ECS task definition templates (already in repo)

- `aws/backend-task-definition.json`
  - container name: `spryte-backend`
  - image name: `spryte-backend`
  - container port: `5000`
  - container healthCheck uses `curl ... /api/health`
- `aws/frontend-task-definition.json`
  - container name: `spryte-frontend`
  - image name: `spryte-frontend`
  - container port: `8080`

## 2) Decisions (you choose)

### 2.1 Promotion strategy (trigger)

Choose one:

- [ ] Deploy on every push to `main`
- [x] Deploy only on version tags (example: `v1.2.3`)
- [ ] Deploy only on GitHub Releases
- [ ] Deploy with manual approval

**Chosen strategy:** `Tag-based deploy`

Tag naming convention (to deploy independently):

- Backend deploy tag: `backend-vX.Y.Z`
- Frontend deploy tag: `frontend-vX.Y.Z`

### 2.2 What do we deploy?

Spryte has two deployable images:

- Backend image → ECS backend service
- Frontend image → ECS frontend service

Choose one:

- [ ] Deploy backend + frontend on the same workflow run
- [x] Separate workflows (recommended long-term): one for backend, one for frontend

**Chosen approach:** `Separate workflows`

## 3) Questions to confirm (please answer in this document)

### 3.1 GitHub

- **Repo URL:** `https://github.com/siruscoder/spryte.git`
- **Default branch:** `main`
- **Repo visibility:** `private`

### 3.2 AWS basics

- **AWS account ID:** `727646509464`
- **AWS region:** `us-east-2`

### 3.3 ECS / ECR identifiers (authoritative names)

Backend:

- **ECR repo name:** `spryte-backend`
- **ECS cluster name:** `spryte-cluster`
- **ECS service name:** `spryte-backend-service`
- **Task definition family name:** `spryte-backend`
- **Container name in task definition:** `spryte-backend`

Frontend:

- **ECR repo name:** `spryte-frontend`
- **ECS cluster name:** `spryte-cluster`
- **ECS service name:** `spryte-frontend-service`
- **Task definition family name:** `spryte-frontend`
- **Container name in task definition:** `spryte-frontend`

ECR repository URIs:

- `spryte-backend`: `727646509464.dkr.ecr.us-east-2.amazonaws.com/spryte-backend`
- `spryte-frontend`: `727646509464.dkr.ecr.us-east-2.amazonaws.com/spryte-frontend`

### 3.4 Secrets / configuration

Where are runtime secrets stored?

- [ ] ECS task definition plaintext env vars
- [x] AWS Secrets Manager
- [ ] AWS SSM Parameter Store

**Confirmed approach:** `AWS Secrets Manager`

If using Secrets Manager / SSM, list the names/ARNs used by backend:

- `MONGODB_URI`: `spryte/mongodb-uri`
- `JWT_SECRET_KEY`: `spryte/jwt-secret`
- `OPENAI_API_KEY`: `spryte/openai-key`

Frontend config:

- `VITE_API_URL`: `""` (currently empty in the running ECS task definition)

## 4) One-time setup (we will do once)

### 4.1 Security prerequisite: GitHub Actions → AWS authentication

We will use **GitHub Actions OIDC** (recommended) so we do not store long-lived AWS access keys in GitHub.

**Outcome:** an IAM role in AWS that GitHub Actions can assume.

Because this repository is **private**, we will tighten the IAM trust policy to only allow tokens from:

- this exact repo (`siruscoder/spryte`)
- the intended ref(s) (example: `refs/heads/main` and/or `refs/tags/v*`)

Optional (recommended if your GitHub plan supports it): use a GitHub **Environment** (example: `production`) with required reviewers to add a manual approval gate.

We will need:

- **GitHub org/user + repo name** (for IAM trust policy conditions)
- The AWS region/account/cluster/service names above

### 4.2 GitHub repo variables/secrets

We will store these in **GitHub repo Variables** (not secrets):

- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `ECS_CLUSTER_BACKEND`
- `ECS_SERVICE_BACKEND`
- `ECS_TASK_DEFINITION_BACKEND`
- `ECS_CONTAINER_NAME_BACKEND`
- `ECR_REPOSITORY_BACKEND`
- `ECS_CLUSTER_FRONTEND`
- `ECS_SERVICE_FRONTEND`
- `ECS_TASK_DEFINITION_FRONTEND`
- `ECS_CONTAINER_NAME_FRONTEND`
- `ECR_REPOSITORY_FRONTEND`

Set Variables to these exact values:

- `AWS_REGION`: `us-east-2`
- `AWS_ACCOUNT_ID`: `727646509464`
- `ECS_CLUSTER_BACKEND`: `spryte-cluster`
- `ECS_SERVICE_BACKEND`: `spryte-backend-service`
- `ECS_TASK_DEFINITION_BACKEND`: `spryte-backend`
- `ECS_CONTAINER_NAME_BACKEND`: `spryte-backend`
- `ECR_REPOSITORY_BACKEND`: `spryte-backend`
- `ECS_CLUSTER_FRONTEND`: `spryte-cluster`
- `ECS_SERVICE_FRONTEND`: `spryte-frontend-service`
- `ECS_TASK_DEFINITION_FRONTEND`: `spryte-frontend`
- `ECS_CONTAINER_NAME_FRONTEND`: `spryte-frontend`
- `ECR_REPOSITORY_FRONTEND`: `spryte-frontend`

### 4.3 AWS: Create the GitHub Actions OIDC deploy role

We will create an IAM Role that GitHub Actions can assume using OIDC.

#### 4.3.1 Create the OIDC provider (one-time)

In AWS Console → IAM → Identity providers:

- Provider type: `OpenID Connect`
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

#### 4.3.2 Create IAM Role

In AWS Console → IAM → Roles → Create role:

- Trusted entity type: `Web identity`
- Identity provider: `token.actions.githubusercontent.com`

Trust policy (tightened to tags for this repo):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::727646509464:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:siruscoder/spryte:ref:refs/tags/backend-v*",
            "repo:siruscoder/spryte:ref:refs/tags/frontend-v*"
          ]
        }
      }
    }
  ]
}
```

Role name recommendation: `SpryteGithubDeployRole`

#### 4.3.3 Attach permissions policy to the role

Attach an inline policy (or customer-managed policy) with minimum permissions:

Inline policy name used: `SpryteGithubDeployInlinePolicy`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrAuth",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EcrPushPullSpryte",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": [
        "arn:aws:ecr:us-east-2:727646509464:repository/spryte-backend",
        "arn:aws:ecr:us-east-2:727646509464:repository/spryte-frontend"
      ]
    },
    {
      "Sid": "EcsDeploy",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PassTaskRoles",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::727646509464:role/ecsTaskExecutionRole",
        "arn:aws:iam::727646509464:role/ecsTaskRole"
      ]
    }
  ]
}
```

#### 4.3.4 Set GitHub Secret

In GitHub → Settings → Secrets and variables → Actions:

- Create repo secret: `AWS_ROLE_TO_ASSUME`
- Value: the ARN of the role you created (example: `arn:aws:iam::727646509464:role/SpryteGithubDeployRole`)

And these in **GitHub repo Secrets**:

- `AWS_ROLE_TO_ASSUME` (the IAM role ARN created for OIDC)

## 5) CI/CD implementation (what we will add to the repo)

### 5.1 GitHub Actions workflows

We will add (depending on your decision in §2.2):

- `.github/workflows/deploy-backend.yml`
- `.github/workflows/deploy-frontend.yml`

Each workflow will:

1. Build Docker image
2. Tag image with the git SHA
3. Login to ECR
4. Push image to ECR
5. Update ECS task definition to point at the new image
6. Update the ECS service and wait for stability

### 5.2 Platform note (Apple Silicon)

If you build on GitHub-hosted runners, images will be `linux/amd64` by default, which works well on ECS.

If you later want multi-arch images, we can switch to `docker buildx`.

## 6) Operational runbook (day-to-day)

### 6.1 Normal deployment

Depending on §2.1 trigger (tag-based deploy):

- Backend deploy: create and push tag `backend-vX.Y.Z`
- Frontend deploy: create and push tag `frontend-vX.Y.Z`

Expected result:

- GitHub Actions workflow runs
- New image pushed to ECR
- ECS service deploys a new task definition revision
- ALB target becomes healthy

### 6.2 Health verification

Backend:

- `GET /api/health` must return `200`

Frontend:

- `GET /` should return `200`

### 6.3 Rollback

Rollback options (we will pick one):

- [ ] In ECS: update service to a previous task definition revision
- [ ] Re-run workflow pinned to an older git SHA

**Chosen rollback method:** `TBD`

## 7) Known risks / items to confirm

### 7.1 Backend healthcheck path

Backend health endpoint is `/api/health`.

If any AWS health checks target `/health`, ECS/ALB will consider tasks unhealthy.

### 7.2 Credentials in repo

There is a file at repo root: `ptnadmin_accessKeys.csv`.

Before we finalize CI/CD, confirm:

- [ ] This file contains no active credentials, OR
- [ ] If it contains real AWS keys, they should be rotated immediately and the file removed from the repo history.

(We can decide the safest next step together.)

#### If unsure, treat as compromised (recommended)

If you are not 100% certain these keys were never committed/pushed, follow this checklist.

**Containment (do now):**

- [ ] In AWS Console → IAM → Users → find the user related to these keys (example: `ptnadmin`)
- [ ] IAM → Users → (user) → Security credentials → **Access keys**
- [ ] Set any suspicious/unknown keys to **Inactive** immediately
- [ ] Create a new access key only if you still need one for interactive use (CI/CD will use OIDC and should not need a user access key)

**Verification (do next):**

- [ ] CloudTrail → Event history: filter for the access key ID(s)
- [ ] Look for unexpected API calls (regions/services you didn’t use)
- [ ] Check IAM → Users → (user) → Permissions for overly broad policies; tighten if needed

**Repo hygiene (do now):**

- [ ] Ensure `ptnadmin_accessKeys.csv` is not tracked by git (should be untracked)
- [ ] Ensure `ptnadmin_accessKeys.csv` is in `.gitignore`
- [ ] Delete the local file if you do not need it

**If it was ever committed/pushed:**

- [ ] Rotate keys as above (already done)
- [ ] Decide whether to rewrite git history to remove the file (recommended if it hit GitHub)
- [ ] After history rewrite, ask GitHub to run secret scanning / verify no forks retain it

**CI/CD note:**

- GitHub Actions will use **OIDC** and an **IAM role**, not these user keys.

**Next action to proceed:**

- Confirm the IAM user that owns the access keys: `arn:aws:iam::727646509464:user/ptnadmin`

## 8) Progress log

- 2025-12-18: Created IAM role `SpryteGithubDeployRole` with GitHub OIDC trust policy scoped to `backend-v*` and `frontend-v*` tags.
- 2025-12-18: Attached inline permissions policy `SpryteGithubDeployInlinePolicy` (ECR push + ECS deploy + iam:PassRole).
- 2025-12-18: Set GitHub Actions secret `AWS_ROLE_TO_ASSUME` and repo Variables (12 total) per §4.2.
