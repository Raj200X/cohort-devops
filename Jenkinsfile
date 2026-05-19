// ─────────────────────────────────────────────────────────────────────────────
// Cohort CI/CD Pipeline — Jenkins Declarative Pipeline
//
// Builds Docker images on Mac (fast!), pushes to AWS ECR,
// then SSHs into EC2 to do a rolling kubectl deployment.
//
// Prerequisites (Jenkins → Manage Credentials):
//   1. 'aws-credentials'  → AWS Access Key ID + Secret (Kind: AWS Credentials)
//   2. 'ec2-ssh-key'      → EC2 PEM file (Kind: SSH Username with Private Key)
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent any

    environment {
        PATH         = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        DOCKER_HOST  = "unix:///var/run/docker.sock"
        AWS_REGION   = 'ap-south-1'
        ECR_REGISTRY = '381492190450.dkr.ecr.ap-south-1.amazonaws.com'
        SERVER_IMAGE = '381492190450.dkr.ecr.ap-south-1.amazonaws.com/cohort-server'
        CLIENT_IMAGE = '381492190450.dkr.ecr.ap-south-1.amazonaws.com/cohort-client'
        EC2_HOST     = '15.207.231.86'
        PROJECT_DIR  = '/Users/raj/Desktop/devopsproject/Cohort'
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        stage('Checkout') {
            steps {
                echo "Build #${env.BUILD_NUMBER} started on Mac"
                echo "Repo: cohort-devpos | Branch: main"
            }
        }

        stage('Docker Build (Mac)') {
            steps {
                echo 'Building Docker images locally on Mac...'
                sh '/usr/local/bin/docker build --platform linux/amd64 -t ${SERVER_IMAGE}:latest ${PROJECT_DIR}/server'
                sh '/usr/local/bin/docker build --platform linux/amd64 --no-cache --build-arg VITE_API_URL=http://15.207.231.86.nip.io:30500 -t ${CLIENT_IMAGE}:latest ${PROJECT_DIR}/client'
                echo 'Build complete!'
            }
        }

        stage('Push to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh '/opt/homebrew/bin/aws ecr get-login-password --region ap-south-1 | /usr/local/bin/docker login --username AWS --password-stdin 381492190450.dkr.ecr.ap-south-1.amazonaws.com'
                    sh '/usr/local/bin/docker push ${SERVER_IMAGE}:latest'
                    sh '/usr/local/bin/docker push ${CLIENT_IMAGE}:latest'
                    echo 'Push to ECR complete!'
                }
            }
        }

        stage('Deploy to k3s') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@15.207.231.86 "
                            export KUBECONFIG=~/.kube/config
                            kubectl rollout restart deployment cohort-server -n cohort || true
                            kubectl rollout restart deployment cohort-client -n cohort || true
                            kubectl get pods -n cohort || true
                        " || echo "Warning: Deploy SSH issue - images are in ECR and will be pulled on next pod restart"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo """
            ╔══════════════════════════════════════╗
            ║  ✅ Pipeline SUCCESS — Build #${env.BUILD_NUMBER}  ║
            ╚══════════════════════════════════════╝
            """
            sh '/usr/local/bin/docker image prune -f || true'
        }
        failure {
            echo """
            ╔══════════════════════════════════════╗
            ║  ❌ Pipeline FAILED — Build #${env.BUILD_NUMBER}   ║
            ╚══════════════════════════════════════╝
            """
        }
    }
}
