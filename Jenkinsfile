// ─────────────────────────────────────────────────────────────────────────────
// Cohort CI/CD Pipeline — Jenkins Declarative Pipeline
//
// Prerequisites (configure in Jenkins → Manage Credentials):
//   1. 'aws-credentials'  → AWS Access Key ID + Secret (Kind: AWS Credentials)
//   2. 'ec2-ssh-key'      → EC2 PEM file (Kind: SSH Username with Private Key)
//
// Required Jenkins Plugins:
//   - Pipeline
//   - Git
//   - SSH Agent
//   - Amazon ECR (or Docker Pipeline)
//   - AWS Credentials
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent any

    // ── Environment Variables ──────────────────────────────────────────────
    environment {
        // ⚠️  Replace these with your real values
        AWS_REGION          = 'ap-south-1'
        AWS_ACCOUNT_ID      = '381492190450'
        ECR_REGISTRY        = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        SERVER_IMAGE        = "${ECR_REGISTRY}/cohort-server"
        CLIENT_IMAGE        = "${ECR_REGISTRY}/cohort-client"

        EC2_HOST            = '65.0.7.244'
        EC2_USER            = 'ubuntu'

        IMAGE_TAG           = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        // ── Stage 1: Checkout ─────────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo "📥 Checking out source from GitHub..."
                checkout scm
                sh 'git log --oneline -5'
            }
        }

        // ── Stage 2: Install & Test ───────────────────────────────────────
        stage('Install & Test') {
            parallel {
                stage('Server: Install') {
                    steps {
                        dir('server') {
                            echo "📦 Installing server dependencies..."
                            sh 'npm ci'
                            // Placeholder: add real tests here (e.g., npm test)
                            echo "✅ Server install complete."
                        }
                    }
                }
                stage('Client: Install & Build Check') {
                    steps {
                        dir('client') {
                            echo "📦 Installing client dependencies..."
                            sh 'npm ci'
                            echo "✅ Client install complete."
                        }
                    }
                }
            }
        }

        // ── Stage 3: Docker Build ─────────────────────────────────────────
        stage('Docker Build') {
            steps {
                echo "🐳 Building Docker images..."
                sh """
                    docker build -t ${SERVER_IMAGE}:${IMAGE_TAG} -t ${SERVER_IMAGE}:latest ./server
                    docker build \
                        --no-cache \
                        --build-arg VITE_API_URL=http://${EC2_HOST}.nip.io:30500 \
                        -t ${CLIENT_IMAGE}:${IMAGE_TAG} \
                        -t ${CLIENT_IMAGE}:latest \
                        ./client
                """
                echo "✅ Docker images built: ${IMAGE_TAG}"
            }
        }

        // ── Stage 4: Push to Amazon ECR ───────────────────────────────────
        stage('Push to ECR') {
            steps {
                echo "📤 Pushing images to Amazon ECR..."
                withCredentials([
                    [
                        $class: 'AmazonWebServicesCredentialsBinding',
                        credentialsId: 'aws-credentials',
                        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                    ]
                ]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | \
                            docker login --username AWS --password-stdin ${ECR_REGISTRY}

                        docker push ${SERVER_IMAGE}:${IMAGE_TAG}
                        docker push ${SERVER_IMAGE}:latest
                        docker push ${CLIENT_IMAGE}:${IMAGE_TAG}
                        docker push ${CLIENT_IMAGE}:latest

                        echo "✅ Images pushed to ECR."
                    """
                }
            }
        }

        // ── Stage 5: Deploy to k3s on EC2 ────────────────────────────────
        stage('Deploy to k3s') {
            steps {
                echo "🚀 Deploying to k3s on EC2..."
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '
                            # Authenticate ECR from EC2
                            aws ecr get-login-password --region ${AWS_REGION} | \
                                docker login --username AWS --password-stdin ${ECR_REGISTRY}

                            # Rolling update — no downtime
                            kubectl set image deployment/cohort-server \
                                cohort-server=${SERVER_IMAGE}:${IMAGE_TAG} \
                                -n cohort

                            kubectl set image deployment/cohort-client \
                                cohort-client=${CLIENT_IMAGE}:${IMAGE_TAG} \
                                -n cohort

                            # Wait for rollout to complete
                            kubectl rollout status deployment/cohort-server -n cohort --timeout=120s
                            kubectl rollout status deployment/cohort-client -n cohort --timeout=120s

                            echo "✅ Deployment complete!"
                            kubectl get pods -n cohort
                        '
                    """
                }
            }
        }
    }

    // ── Post Actions ───────────────────────────────────────────────────────
    post {
        success {
            echo """
            ╔══════════════════════════════════════╗
            ║  ✅ Pipeline SUCCESS — Build #${env.BUILD_NUMBER}  ║
            ║  Image Tag: ${IMAGE_TAG}              ║
            ╚══════════════════════════════════════╝
            """
            // Clean up dangling Docker images to save disk space
            sh 'docker image prune -f'
        }
        failure {
            echo """
            ╔══════════════════════════════════════╗
            ║  ❌ Pipeline FAILED — Build #${env.BUILD_NUMBER}   ║
            ╚══════════════════════════════════════╝
            """
        }
        always {
            // Clean workspace
            cleanWs()
        }
    }
}
