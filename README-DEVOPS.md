# 🚀 Cohort — DevOps Setup Guide (Zero-Cost AWS)

## Architecture Overview

```
GitHub → Jenkins (Mac) → Docker Build → ECR → k3s on EC2 t2.micro → Prometheus + Grafana
```

| Tool | Role | Cost |
|---|---|---|
| **Docker** | Containerize server + client | Free |
| **Amazon ECR** | Store Docker images | Free (500MB) |
| **EC2 t2.micro** | Run k3s + all pods | Free (750hrs/mo) |
| **k3s** | Lightweight Kubernetes | Free |
| **Jenkins** | CI/CD pipeline (on your Mac) | Free |
| **Prometheus + Grafana** | Monitoring stack | Free |
| **EKS** | NOT USED (costs $72/mo) | ❌ |

---

## Prerequisites

Install on your Mac:
```bash
brew install --cask docker          # Docker Desktop
brew install awscli                 # AWS CLI
brew install kubectl                # kubectl
brew install --cask jenkins-lts     # Jenkins
```

---

## Step 1 — AWS Setup

### 1a. Configure AWS CLI
```bash
aws configure
# AWS Access Key ID: <your key>
# AWS Secret Access Key: <your secret>
# Default region: ap-south-1       ← change to your region
# Default output format: json
```

### 1b. Launch EC2 t2.micro (Free Tier)
1. Go to **AWS Console → EC2 → Launch Instance**
2. Settings:
   - **AMI**: Ubuntu Server 22.04 LTS (Free Tier eligible)
   - **Instance type**: `t2.micro` ✅
   - **Key pair**: Create new → download `.pem` file → save as `cohort-ec2.pem`
   - **Security Group**: Add inbound rules:
     | Port | Description |
     |------|-------------|
     | 22   | SSH (your IP only) |
     | 30080 | Frontend (anywhere) |
     | 30500 | Backend API (anywhere) |
     | 30300 | Grafana (your IP only) |
     | 30909 | Prometheus (your IP only) |
3. Launch → note your **EC2 Public IP**

### 1c. Update Placeholder Values
After getting your EC2 IP, find and replace `YOUR_EC2_PUBLIC_IP` in:
- `k8s/configmap.yaml`
- `Jenkinsfile`
- `Makefile`

And replace `YOUR_AWS_ACCOUNT_ID` + `YOUR_AWS_REGION` in:
- `k8s/server-deployment.yaml`
- `k8s/client-deployment.yaml`
- `Jenkinsfile`
- `Makefile`

---

## Step 2 — EC2 Server Setup (Run Once)

```bash
# SSH into your EC2
chmod 400 cohort-ec2.pem
ssh -i cohort-ec2.pem ubuntu@YOUR_EC2_PUBLIC_IP

# ── Install Docker ──────────────────────────────────
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl awscli
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io
sudo usermod -aG docker ubuntu

# ── Install k3s ─────────────────────────────────────
curl -sfL https://get.k3s.io | sh -

# Make kubectl available without sudo
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown ubuntu:ubuntu ~/.kube/config
export KUBECONFIG=~/.kube/config
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc

# Verify k3s is running
kubectl get nodes   # Should show: Ready

# ── Configure ECR on EC2 ─────────────────────────────
aws configure   # Enter your AWS credentials

# Create ECR repositories (only once)
aws ecr create-repository --repository-name cohort-server --region YOUR_AWS_REGION
aws ecr create-repository --repository-name cohort-client --region YOUR_AWS_REGION

# ── Create ECR image pull secret in k3s ──────────────
# First, login to ECR and get the auth token:
ECR_TOKEN=$(aws ecr get-login-password --region YOUR_AWS_REGION)
kubectl create namespace cohort

kubectl create secret docker-registry ecr-secret \
  --docker-server=YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_AWS_REGION.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$ECR_TOKEN \
  --namespace=cohort
```

---

## Step 3 — Apply Kubernetes Secrets

Run this locally (NOT in Git — keeps secrets safe):
```bash
kubectl create secret generic cohort-secrets \
  --namespace=cohort \
  --from-literal=MONGO_URI='your-atlas-connection-string' \
  --from-literal=JWT_SECRET='cohort_jwt_s3cr3t_2026!' \
  --from-literal=SEED_SECRET='cohort_seed_s3cr3t_2026!' \
  --from-literal=GOOGLE_CLIENT_ID='your-google-client-id' \
  --from-literal=GOOGLE_CLIENT_SECRET='your-google-client-secret' \
  --from-literal=CLOUDINARY_CLOUD_NAME='your-cloud-name' \
  --from-literal=CLOUDINARY_API_KEY='your-api-key' \
  --from-literal=CLOUDINARY_API_SECRET='your-api-secret'
```

---

## Step 4 — First Deployment (Local → ECR → k3s)

```bash
# From your Mac, inside the Cohort/ directory:

# 1. Push images to ECR
make ecr-push

# 2. Apply all K8s manifests
make k8s-apply

# 3. Deploy monitoring
make monitoring-up

# 4. Check everything is running
make k8s-status
```

Expected output:
```
NAME                                READY   STATUS    RESTARTS
pod/cohort-server-xxx-xxx          1/1     Running   0
pod/cohort-client-xxx-xxx          1/1     Running   0
pod/prometheus-xxx-xxx             1/1     Running   0
pod/grafana-xxx-xxx                1/1     Running   0
```

### Access Your App
| Service | URL |
|---|---|
| **Frontend** | `http://YOUR_EC2_IP:30080` |
| **Backend API** | `http://YOUR_EC2_IP:30500` |
| **Prometheus** | `http://YOUR_EC2_IP:30909` |
| **Grafana** | `http://YOUR_EC2_IP:30300` (admin / cohort_grafana_2026) |

---

## Step 5 — Jenkins CI/CD Setup

### 5a. Start Jenkins
```bash
brew services start jenkins-lts
open http://localhost:8080

# Get initial admin password:
cat /usr/local/var/jenkins/home/secrets/initialAdminPassword
```

### 5b. Install Plugins
Go to **Manage Jenkins → Plugins → Available** and install:
- `Pipeline`
- `Git`
- `SSH Agent`
- `Amazon ECR`
- `AWS Credentials`

### 5c. Add Credentials
**Manage Jenkins → Credentials → Global → Add Credential**

| ID | Kind | Details |
|---|---|---|
| `aws-credentials` | AWS Credentials | Your AWS Access Key + Secret |
| `ec2-ssh-key` | SSH Username with Private Key | Username: `ubuntu`, Key: paste `cohort-ec2.pem` content |

### 5d. Create Pipeline Job
1. **New Item** → Name: `cohort-pipeline` → **Pipeline**
2. Under **Pipeline**:
   - Definition: `Pipeline script from SCM`
   - SCM: Git
   - Repository URL: `https://github.com/Raj200X/Cohort`
   - Script Path: `Jenkinsfile`
3. **Save** → **Build Now**

### 5e. GitHub Webhook (Auto-trigger on push)
1. Go to GitHub repo → **Settings → Webhooks → Add webhook**
2. Payload URL: `http://YOUR_MAC_IP:8080/github-webhook/`
3. Content type: `application/json`
4. Events: `Just the push event`

---

## Step 6 — Grafana Dashboard

1. Open `http://YOUR_EC2_IP:30300`
2. Login: `admin` / `cohort_grafana_2026`
3. **Dashboards → New → Import**
4. Import Dashboard ID **1860** (Node Exporter Full) for system metrics
5. Create a custom dashboard with these PromQL queries:

```promql
# HTTP request rate
rate(cohort_http_requests_total[5m])

# Active WebSocket connections
cohort_active_socket_connections

# MongoDB connection status
cohort_mongodb_connected

# 95th percentile response time
histogram_quantile(0.95, rate(cohort_http_request_duration_seconds_bucket[5m]))

# Node.js heap used
nodejs_heap_size_used_bytes
```

---

## Daily Workflow

```bash
# Code → Commit → Push → Jenkins auto-runs → App updates in < 3 min
git add . && git commit -m "feat: your feature" && git push

# Or manually trigger a deployment:
make ecr-push
make k8s-apply

# Check status
make k8s-status
make logs-server
```

---

## Cost Breakdown (Monthly)

| Resource | Cost |
|---|---|
| EC2 t2.micro (750 hrs) | **$0.00** ✅ |
| ECR (< 500MB) | **$0.00** ✅ |
| MongoDB Atlas (free tier) | **$0.00** ✅ |
| Cloudinary (free tier) | **$0.00** ✅ |
| **Total** | **$0.00/month** 🎉 |

> ⚠️ Free tier is available for **12 months** from AWS account creation. After that, t2.micro costs ~$8.50/month.
# Testing auto-deploy
