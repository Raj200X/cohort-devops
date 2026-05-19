pipeline {
    agent any

    environment {
        ECR_REGISTRY = '381492190450.dkr.ecr.ap-south-1.amazonaws.com'
        SERVER_IMAGE  = '381492190450.dkr.ecr.ap-south-1.amazonaws.com/cohort-server'
        CLIENT_IMAGE  = '381492190450.dkr.ecr.ap-south-1.amazonaws.com/cohort-client'
        AWS_REGION    = 'ap-south-1'
        KUBECONFIG    = '/var/lib/jenkins/.kube/config'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    stages {

        stage('Checkout') {
            steps {
                echo "Build #${BUILD_NUMBER} — EC2 Jenkins (native AMD64)"
                checkout scm
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker images (native AMD64 — no cross-compile needed)...'
                sh 'docker build -t ${SERVER_IMAGE}:latest ./server'
                sh 'docker build --no-cache --build-arg VITE_API_URL=http://15.207.231.86.nip.io:30500 -t ${CLIENT_IMAGE}:latest ./client'
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
                    sh 'aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}'
                    sh 'docker push ${SERVER_IMAGE}:latest'
                    sh 'docker push ${CLIENT_IMAGE}:latest'
                    echo 'Push to ECR complete!'
                }
            }
        }

        stage('Deploy to k3s') {
            steps {
                echo 'Deploying — kubectl runs directly on this machine!'
                sh '''
                    kubectl rollout restart deployment cohort-server -n cohort
                    kubectl rollout restart deployment cohort-client -n cohort
                    kubectl rollout status deployment cohort-server -n cohort --timeout=60s
                    kubectl rollout status deployment cohort-client -n cohort --timeout=60s
                    kubectl get pods -n cohort
                '''
            }
        }

    }

    post {
        success {
            echo """
            ╔══════════════════════════════════════╗
            ║  ✅ Pipeline SUCCESS — Build #${BUILD_NUMBER}  ║
            ╚══════════════════════════════════════╝
            App: http://15.207.231.86:30080
            API: http://15.207.231.86:30500
            """
            sh 'docker image prune -f || true'
        }
        failure {
            echo """
            ╔══════════════════════════════════════╗
            ║  ❌ Pipeline FAILED — Build #${BUILD_NUMBER}   ║
            ╚══════════════════════════════════════╝
            """
        }
    }
}
