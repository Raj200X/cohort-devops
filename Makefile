# ─────────────────────────────────────────────────────────────────────────────
# Cohort DevOps — Makefile Convenience Commands
# ─────────────────────────────────────────────────────────────────────────────
# Usage:
#   make help           — Show all commands
#   make docker-build   — Build both Docker images locally
#   make docker-up      — Start local dev stack with docker-compose
#   make ecr-push       — Build + push images to Amazon ECR
#   make k8s-apply      — Apply all Kubernetes manifests
#   make k8s-status     — Show all resources in the cohort namespace
#   make monitoring-up  — Deploy Prometheus + Grafana
#   make destroy        — Delete all K8s resources
# ─────────────────────────────────────────────────────────────────────────────

# ⚠️  Replace these with real values
AWS_ACCOUNT_ID   ?= 381492190450
AWS_REGION       ?= ap-south-1
ECR_REGISTRY     := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
SERVER_IMAGE     := $(ECR_REGISTRY)/cohort-server
CLIENT_IMAGE     := $(ECR_REGISTRY)/cohort-client
TAG              ?= latest

.PHONY: help docker-build docker-up docker-down ecr-login ecr-push \
        k8s-apply k8s-status monitoring-up monitoring-down \
        logs destroy

help:
	@echo ""
	@echo "  Cohort DevOps — Available Commands"
	@echo "  ─────────────────────────────────────────────────────────────"
	@echo "  make docker-build     Build server + client Docker images"
	@echo "  make docker-up        Start local stack via docker-compose"
	@echo "  make docker-down      Stop local docker-compose stack"
	@echo "  make ecr-login        Authenticate Docker with Amazon ECR"
	@echo "  make ecr-push         Build + push images to ECR"
	@echo "  make k8s-apply        Apply all K8s manifests (namespace, app)"
	@echo "  make k8s-status       Show all pods/services in cohort namespace"
	@echo "  make monitoring-up    Deploy Prometheus + Grafana to K8s"
	@echo "  make monitoring-down  Remove monitoring stack"
	@echo "  make logs-server      Stream server pod logs"
	@echo "  make logs-client      Stream client pod logs"
	@echo "  make destroy          ⚠️  Delete ALL cohort K8s resources"
	@echo ""

# ── Docker (Local) ────────────────────────────────────────────────────────────

docker-build:
	@echo "🐳 Building Docker images..."
	docker build -t cohort-server:$(TAG) ./server
	docker build --build-arg VITE_API_URL=http://localhost:5000 -t cohort-client:$(TAG) ./client
	@echo "✅ Done. Images: cohort-server:$(TAG) | cohort-client:$(TAG)"

docker-up:
	@echo "🚀 Starting local dev stack..."
	docker-compose up --build -d
	@echo "✅ Frontend: http://localhost:5173  Backend: http://localhost:5000"

docker-down:
	docker-compose down

# ── Amazon ECR ────────────────────────────────────────────────────────────────

ecr-login:
	@echo "🔑 Logging into Amazon ECR ($(AWS_REGION))..."
	aws ecr get-login-password --region $(AWS_REGION) | \
		docker login --username AWS --password-stdin $(ECR_REGISTRY)

ecr-create-repos:
	@echo "📦 Creating ECR repositories (if not exist)..."
	aws ecr describe-repositories --repository-names cohort-server --region $(AWS_REGION) 2>/dev/null || \
		aws ecr create-repository --repository-name cohort-server --region $(AWS_REGION)
	aws ecr describe-repositories --repository-names cohort-client --region $(AWS_REGION) 2>/dev/null || \
		aws ecr create-repository --repository-name cohort-client --region $(AWS_REGION)
	@echo "✅ ECR repos ready."

ecr-push: ecr-login ecr-create-repos
	@echo "📤 Building and pushing to ECR..."
	docker build -t $(SERVER_IMAGE):$(TAG) ./server
	docker build --build-arg VITE_API_URL=http://65.0.7.244.nip.io:30500 -t $(CLIENT_IMAGE):$(TAG) ./client
	docker push $(SERVER_IMAGE):$(TAG)
	docker push $(CLIENT_IMAGE):$(TAG)
	@echo "✅ Pushed: $(SERVER_IMAGE):$(TAG) | $(CLIENT_IMAGE):$(TAG)"

# ── Kubernetes ────────────────────────────────────────────────────────────────

k8s-apply:
	@echo "☸️  Applying K8s manifests..."
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	@echo "⚠️  Skipping secret.yaml — apply secrets manually with kubectl create secret"
	kubectl apply -f k8s/server-deployment.yaml
	kubectl apply -f k8s/server-service.yaml
	kubectl apply -f k8s/client-deployment.yaml
	kubectl apply -f k8s/client-service.yaml
	@echo "✅ K8s resources applied."

k8s-status:
	@echo "📊 Cohort namespace status:"
	kubectl get all -n cohort

monitoring-up:
	@echo "📈 Deploying Prometheus + Grafana..."
	kubectl apply -f k8s/monitoring/
	@echo "✅ Prometheus: http://EC2_IP:30909  Grafana: http://EC2_IP:30300"
	@echo "   Grafana login: admin / cohort_grafana_2026"

monitoring-down:
	kubectl delete -f k8s/monitoring/ --ignore-not-found

logs-server:
	kubectl logs -f -l app=cohort-server -n cohort

logs-client:
	kubectl logs -f -l app=cohort-client -n cohort

destroy:
	@echo "⚠️  Deleting ALL cohort K8s resources..."
	kubectl delete namespace cohort --ignore-not-found
	@echo "✅ Namespace 'cohort' deleted."
