# Complete AWS Deployment Guide for Spryte

This guide will walk you through deploying Spryte to AWS using ECS Fargate (serverless containers).

## Prerequisites
- AWS account with billing enabled
- Basic understanding of web concepts
- 30-45 minutes of time

## Overview of Services We'll Use
- **ECS Fargate**: Serverless container hosting
- **ECR**: Container registry (like Docker Hub)
- **IAM**: Security roles
- **Secrets Manager**: Secure storage for API keys
- **Application Load Balancer**: Traffic distribution
- **Route 53**: DNS (optional, for custom domain)

---

## Step 1: Set Up MongoDB Atlas Database

### 1.1 Create MongoDB Atlas Account
1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Click "Start Free" → Sign up with Google/GitHub/Email
3. Verify your email

### 1.2 Create a Cluster
1. After login, click "Build a Database"
2. Select **M0 Sandbox** (FREE tier)
3. Choose a cloud provider and region closest to you
4. Leave cluster name as default or rename to "spryte"
5. Click "Create Cluster"

### 1.3 Configure Database Access
1. Under "Database Access", click "Add New Database User"
2. Username: `spryte-user`
3. Password: Generate a strong password (SAVE THIS!)
4. Click "Add Database User"

### 1.4 Configure Network Access
1. Under "Network Access", click "Add IP Address"
2. Select "Allow access from anywhere" (0.0.0.0/0)
3. Click "Confirm"

### 1.5 Get Connection String
1. Go to "Database" → Click "Connect" on your cluster
2. Select "Drivers"
3. Copy the connection string (it looks like: `mongodb+srv://spryte-user:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`)
4. Replace `<password>` with your actual password
5. Save this string - we'll need it later

---

## Step 2: Set Up AWS ECR (Container Registry)

### 2.1 Create ECR Repositories
1. Go to AWS Console → Search "ECR" → Open
2. Click "Create repository"
3. **Backend Repository:**
   - Repository name: `spryte-backend`
   - Leave other settings default
   - Click "Create"
4. **Frontend Repository:**
   - Click "Create repository" again
   - Repository name: `spryte-frontend`
   - Click "Create"

### 2.2 Get Your AWS Account ID and Region
1. In AWS Console top-right, you'll see your region (e.g., "N. Virginia")
2. Click your username → My Account → Account ID will be displayed
3. Note both your Account ID and Region code (e.g., `us-east-1`)

---

## Step 3: Build and Push Docker Images

If you are using an Apple Silicon Mac (M1/M2/M3) or you want the images to run reliably on AWS, build and push a multi-architecture image (linux/amd64 + linux/arm64) using `docker buildx`. This avoids "exec format error" / image pull issues.

### 3.1 Install AWS CLI and Configure
```bash
# Install AWS CLI (if not installed)
# Mac: brew install awscli
# Windows: Download from https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID and Secret Access Key
# Get these from: AWS Console → IAM → Users → Your User → Security Credentials
```

### 3.2 Login to ECR
```bash
# Get ECR login password
aws ecr get-login-password --region YOUR_REGION | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com
```

### 3.3 Build and Push Backend
```bash
# From the repo root

# Build and push multi-arch image (recommended)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/spryte-backend:latest \
  -f backend/Dockerfile backend \
  --push
```



### 3.4 Build and Push Frontend
```bash
# From the repo root

# Build and push multi-arch image (recommended)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/spryte-frontend:latest \
  -f frontend/Dockerfile frontend \
  --push
```
---

## Step 4: Set Up IAM Roles

### 4.1 Create ECS Task Execution Role
1. Go to AWS Console → Search "IAM" → Open
2. Click "Roles" → "Create role"
3. Trusted entity: "AWS service"
4. Use case: "Elastic Container Service"
5. Select "ECS Task" → Next
6. Search and add these policies:
   - `AmazonECSTaskExecutionRolePolicy`
   - `SecretsManagerReadWrite`
7. Click Next → Role name: `ecsTaskExecutionRole` → Create role

### 4.2 Create ECS Task Role
1. Click "Create role" again
2. Trusted entity: "AWS service"
3. Use case: "Elastic Container Service"
4. Select "ECS Task" → Next
5. Add policy: `CloudWatchLogsFullAccess`
6. Click Next → Role name: `ecsTaskRole` → Create role

---

## Step 5: Store Secrets in AWS Secrets Manager

### 5.1 Create Secrets
1. Go to AWS Console → Search "Secrets Manager" → Open
2. Click "Store a new secret"

**MongoDB URI Secret:**
1. Select "Other type of secret"
2. Key: `MONGODB_URI`, Value: Your MongoDB connection string
3. Secret name: `spryte/mongodb-uri`
4. Click Next → Next → Store

**JWT Secret:**
1. Click "Store a new secret"
2. Key: `JWT_SECRET_KEY`, Value: Generate a strong random string
3. Secret name: `spryte/jwt-secret`
4. Click Next → Next → Store

**OpenAI API Key:**
1. Click "Store a new secret"
2. Key: `OPENAI_API_KEY`, Value: Your OpenAI API key
3. Secret name: `spryte/openai-key`
4. Click Next → Next → Store

---

## Step 6: Set Up ECS Cluster and Services

### 6.1 Create ECS Cluster
1. Go to AWS Console → Search "ECS" → Open
2. Click "Create cluster"
3. **Choose infrastructure:**
   - Select **AWS Fargate** (recommended - serverless, no EC2 instances to manage)
   - OR select **Amazon EC2** (if you need more control over instances)
4. Cluster name: `spryte-cluster`
5. **For Fargate:**
   - Leave VPC settings as default (creates new VPC)
   - Keep monitoring enabled
6. **For EC2:**
   - Select instance type (t3.micro or t3.small for testing)
   - Leave VPC settings default
7. Click "Create cluster"

### 6.2 Create Backend Task Definition
1. In ECS, click "Task Definitions" → "Create new task definition"
2. Select "FARGATE" → Next step
3. **Configure task and container definitions:**
   - Task definition family: `spryte-backend`
   - Task memory: start with `1024` (1 GB). If you see OOM / instability, increase to `3072` (3 GB).
   - Task CPU: `512` (0.5 vCPU)
4. **Task execution IAM role:** Select `ecsTaskExecutionRole`
5. **Task role:** Select `ecsTaskRole`
6. **Task size:** Keep default settings
7. **Container definitions:** Click "Add container"

**Container Configuration:**
1. **Name:** `spryte-backend`
2. **Image URI:** `727646509464.dkr.ecr.us-east-2.amazonaws.com/spryte-backend:latest`
3. **Port mappings:** Container port: `5000`
4. **Memory limits:** 
   - Memory reservation: `512`
   - Memory limit: `1024`
5. **Environment variables:**
   - Key: `FLASK_ENV`, Value: `production`
6. **Important: health checks must match the real backend endpoint**
   - Backend health endpoint is `GET /api/health` (not `/health`).
   - If the task definition health check points to `/health`, ECS will continuously kill/restart tasks.
6. **Health check:**
   - Command: `["CMD-SHELL", "curl -f http://localhost:5000/api/health || exit 1"]`
   - Interval: `30`
   - Timeout: `5`
   - Retries: `3`
   - Start period: `60`
7. Click "Add" to add the container
8. Click "Next" 
9. Review and click "Create task definition"

If your backend tasks start and then crash with MongoDB errors, see the database connectivity notes in Step 8.1 and the Troubleshooting section.

### 6.3 Create Frontend Task Definition
1. Repeat the process for frontend:
   - Task definition name: `spryte-frontend`
   - Container name: `spryte-frontend`
   - Image: `YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/spryte-frontend:latest`
   - Port mappings: Container port: `8080`
   - Environment variables: `VITE_API_URL=https://api.your-domain.com` (use your domain)

---

## Step 7: Create Application Load Balancer

### 7.1 Create Load Balancer
1. Go to AWS Console → Search "EC2" → Open
2. On left menu, click "Load Balancers"
3. Click "Create Load Balancer"
4. Select "Application Load Balancer" → Create

**Basic Configuration:**
- Name: `spryte-alb`
- Scheme: `Internet-facing`
- VPC: Select default VPC
- Mappings: Select at least 2 availability zones

**Security Groups:**
1. Click "Create security group"
2. Name: `spryte-alb-sg`
3. Description: `Security group for Spryte ALB`
4. Inbound rules:
   - Type: `HTTP`, Port: `80`, Source: `0.0.0.0/0`
5. Click "Create"

**Listeners:**
- Default: `HTTP` on port `80`
- Optional later: add `HTTPS` on port `443` only after you have an ACM certificate (you can keep this HTTP-only while learning)

### 7.2 Create Target Groups
**Backend Target Group:**
1. On left menu, click "Target Groups"
2. Click "Create target group"
3. Target type: `IP`
4. Target group name: `spryte-backend-tg`
5. Protocol: `HTTP`, Port: `5000`
6. Health check path: `/api/health`
7. Click "Next" → "Create"

**Frontend Target Group:**
1. Repeat for frontend:
   - Target group name: `spryte-frontend-tg`
   - Protocol: `HTTP`, Port: `8080`
   - Health check path: `/health`

---

## Step 8: Create ECS Services

### 8.1 Create Backend Service
1. Go to ECS → Clusters → `spryte-cluster`
2. In the "Services" tab (it will show "Services (0)" at first), click **Create**
3. **Environment / Compute options:** choose `Fargate` ("Networking only")
4. **Deployment configuration:**
   - Application type: `Service`
   - Task definition: `spryte-backend` (latest revision)
   - Service name: `spryte-backend-service`
   - Desired tasks: `1`
5. **Networking:**
   - VPC: select the same VPC your ALB uses (default VPC is fine)
   - Subnets: select at least 2 subnets (public subnets are fine for a first deploy)
   - Security group: create/select `spryte-backend-sg`
     - Inbound rule: TCP `5000` from **source = `spryte-alb-sg`** (the ALB security group)
   - Public IP: enable **Auto-assign public IP** if you are using public subnets and connecting to MongoDB Atlas.
     - MongoDB Atlas is on the public internet. Your ECS tasks must have outbound internet access.
     - For a first deploy, public subnets + auto-assign public IP is the simplest.
6. **Load balancing:**
   - Turn on load balancing
   - Load balancer type: `Application Load Balancer`
   - Choose existing load balancer: `spryte-alb`
   - Listener: `HTTP : 80`
   - Target group: `spryte-backend-tg`
   - Container to load balance: `spryte-backend` on container port `5000`
7. Create the service

### 8.2 Create Frontend Service
1. Repeat the process for frontend:
   - Task definition: `spryte-frontend` (latest revision)
   - Service name: `spryte-frontend-service`
   - Desired tasks: `1`
2. Networking:
   - Create/select `spryte-frontend-sg`
   - Inbound rule: TCP `8080` from **source = `spryte-alb-sg`**
3. Load balancing:
   - Existing ALB: `spryte-alb`
   - Listener: `HTTP : 80`
   - Target group: `spryte-frontend-tg`
   - Container to load balance: `spryte-frontend` on container port `8080`

Important: if you accidentally create the frontend service with "Load balancing (0)" / "No Load Balancers", the ALB will return `503 Service Temporarily Unavailable` and the target group will show `0` registered targets. ECS does not let you add a load balancer to an existing service.

If that happens:
1. Update the service Desired tasks to `0`
2. Delete the service
3. Re-create it with the load balancer + target group attached

---

## Step 9: Configure Load Balancer Routing

### 9.1 Update Listeners
1. Go to EC2 → Load Balancers → `spryte-alb`
2. Click "Listeners and rules" (or "Listeners")
3. Select the `HTTP : 80` listener
4. Set the default action to: Forward to `spryte-frontend-tg`
5. Save changes

### 9.2 Add API Routing Rule
1. Click "View/edit rules"
2. Click the "default" rule
3. Click "Insert rule"
4. Condition: Path pattern → `/api/*`
5. Then: Forward to → `spryte-backend-tg`
6. Click "Save"

---

## Step 10: Test Your Deployment

### 10.1 Get Load Balancer URL
1. Go to EC2 → Load Balancers → `spryte-alb`
2. Copy the "DNS name" (looks like: `spryte-alb-123456.us-east-1.elb.amazonaws.com`)
`http://spryte-alb-2043913613.us-east-2.elb.amazonaws.com`

### 10.2 Test Frontend
1. Open browser → Go to your Load Balancer DNS name
2. You should see Spryte loading!

### 10.3 Test Backend
1. Go to `YOUR_DNS_NAME/api/health`
2. You should see a health check response

### 10.4 Test Full App
1. Try creating an account
2. Create a note and test drawing features
3. Verify AI features work (if OpenAI key is configured)

---

## Step 11: Optional - Custom Domain

### 11.1 Set Up Route 53
1. Go to AWS Console → Search "Route 53" → Open
2. Click "Hosted zones" → "Create hosted zone"
3. Domain name: `your-domain.com`
4. Click "Create"

### 11.2 Update Nameservers
1. Copy the 4 NS records from Route 53
2. Go to your domain registrar (GoDaddy, Namecheap, etc.)
3. Update nameservers to point to Route 53

### 11.3 Create DNS Records
1. In Route 53 hosted zone, click "Create record"
2. **A Record for Frontend:**
   - Record name: `your-domain.com`
   - Record type: `A`
   - Alias: Yes
   - Route traffic to: `spryte-alb`
3. **A Record for API:**
   - Record name: `api.your-domain.com`
   - Record type: `A`
   - Alias: Yes
   - Route traffic to: `spryte-alb`

### 11.4 Update Frontend Environment
1. In ECS → Task definitions → `spryte-frontend`
2. Create new revision
3. Update `VITE_API_URL` to `https://api.your-domain.com`
4. Update service to use new revision

---

## Cost Optimization Tips

### Free Tier Usage
- **ECS Fargate**: 400 GB-months free (first 12 months)
- **ECR**: 500 MB-months free storage
- **Secrets Manager**: 30 days free, then $0.40/month
- **Load Balancer**: 750 hours/month free (first 12 months)

### To Reduce Costs
1. Set up auto-scaling with minimum 0 tasks
2. Use smaller instance sizes (256 CPU, 512 MB is fine for development)
3. Monitor usage in AWS Cost Explorer

---

## Troubleshooting

### Common Issues

**Container won't start:**
1. Check ECS service logs
2. Verify secrets are correctly configured
3. Check task definition environment variables

**Can't connect to database:**
1. Verify MongoDB Atlas network access includes 0.0.0.0/0
   - If Atlas only allows your home IP, ECS tasks will fail to connect.
2. Check connection string format
3. Verify database user has correct permissions

**Load balancer health checks failing:**
1. Backend health endpoint is `/api/health` (not `/health`)
2. Verify security groups allow traffic from ALB
3. Check target group health check settings

**ECS cluster/services "missing" in the console:**
1. Make sure you are in the correct AWS Region (ECS is regional)
2. If you deployed to `us-east-2`, switch the console region to `us-east-2` and reload

**View backend logs:**
1. ECS → Cluster → Service → Tasks → click a task → Containers → `spryte-backend` → View logs in CloudWatch
2. Or CloudWatch → Log groups → `/ecs/spryte-backend`

**Frontend can't reach backend:**
1. Verify API routing rules in load balancer
2. Check CORS configuration in backend
3. Verify VITE_API_URL is correct

---

## Next Steps

Once deployed:
1. Set up monitoring with CloudWatch
2. Configure SSL certificates (AWS Certificate Manager)
3. Set up CI/CD pipeline (GitHub Actions)
4. Add backup and disaster recovery

## Support

If you run into issues:
1. Check AWS CloudWatch logs
2. Verify all steps were completed correctly
3. AWS documentation is very detailed for each service

Congratulations! Your Spryte application is now running on AWS! 🎉
