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
3. Copy the connection string (it looks like: `mongodb+srv://spryte-user:<password>@cluster.mongodb.net/spryte?retryWrites=true&w=majority`)
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
# Navigate to backend directory
cd backend

# Build Docker image
docker build -t spryte-backend .

# Tag for ECR
docker tag spryte-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/spryte-backend:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/spryte-backend:latest
```

### 3.4 Build and Push Frontend
```bash
# Navigate to frontend directory
cd ../frontend

# Build Docker image
docker build -t spryte-frontend .

# Tag for ECR
docker tag spryte-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/spryte-frontend:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/spryte-frontend:latest
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
3. Select "Networking only" → Next
4. Cluster name: `spryte-cluster`
5. Leave VPC settings default → Create

### 6.2 Create Backend Task Definition
1. In ECS, click "Task Definitions" → "Create new task definition"
2. Select "FARGATE" → Next step
3. Fill in:
   - Task definition name: `spryte-backend`
   - Task memory: `512`
   - Task CPU: `256`
4. Scroll to "Task execution IAM role" → Select `ecsTaskExecutionRole`
5. Scroll to "Task role" → Select `ecsTaskRole`

**Add Container:**
1. Click "Add container"
2. Container name: `spryte-backend`
3. Image: `YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/spryte-backend:latest`
4. Memory limits: Soft limit: `512`
5. Port mappings: Container port: `5000`
6. Environment variables: Add `FLASK_ENV=production`
7. Health check: Command: `["CMD-SHELL", "curl -f http://localhost:5000/health || exit 1"]`
8. Click "Add"
9. Click "Create"

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
   - Type: `HTTPS`, Port: `443`, Source: `0.0.0.0/0`
5. Click "Create"

**Listeners:**
- Default: HTTP on port 80
- Click "Add listener" → HTTPS on port 443 (optional for SSL)

### 7.2 Create Target Groups
**Backend Target Group:**
1. On left menu, click "Target Groups"
2. Click "Create target group"
3. Target type: `IP`
4. Target group name: `spryte-backend-tg`
5. Protocol: `HTTP`, Port: `5000`
6. Health check path: `/health`
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
2. Click "Create" → "Service"
3. Launch type: `FARGATE`
4. Task definition: `spryte-backend`
5. Service name: `spryte-backend-service`
6. Number of tasks: `1`
7. Click "Next step"

**Networking:**
- VPC: Default VPC
- Subnets: Select at least 2 public subnets
- Security group: Create new one, allow HTTP from ALB

**Load Balancing:**
- Load balancer type: `Application Load Balancer`
- Service IAM role: `AWSServiceRoleForECS`
- Load balancer name: `spryte-alb`
- Container to load balance: `spryte-backend:5000`
- Target group: `spryte-backend-tg`

Click "Next step" → "Create service"

### 8.2 Create Frontend Service
1. Repeat the process for frontend:
   - Task definition: `spryte-frontend`
   - Service name: `spryte-frontend-service`
   - Container: `spryte-frontend:8080`
   - Target group: `spryte-frontend-tg`

---

## Step 9: Configure Load Balancer Routing

### 9.1 Update Listeners
1. Go to EC2 → Load Balancers → `spryte-alb`
2. Click "Listeners" tab
3. Edit the HTTP listener (port 80)
4. Default action: Forward to `spryte-frontend-tg`
5. Click "Save"

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
2. Check connection string format
3. Verify database user has correct permissions

**Load balancer health checks failing:**
1. Check if /health endpoint exists in backend
2. Verify security groups allow traffic from ALB
3. Check target group health check settings

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
