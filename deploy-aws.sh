#!/bin/bash

# SyncSphere AWS Deployment Script for macOS
# This script deploys the SyncSphere application to AWS using ECS, RDS, and other managed services

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
REGION="us-east-1"
SKIP_INFRASTRUCTURE=false
SKIP_BUILD=false
CLUSTER_NAME="syncsphere-cluster"
SERVICE_NAME="syncsphere-service"
ECR_REPO_NAME="syncsphere"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --skip-infrastructure)
            SKIP_INFRASTRUCTURE=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --environment ENV     Deployment environment (default: production)"
            echo "  --region REGION       AWS region (default: us-east-1)"
            echo "  --skip-infrastructure Skip infrastructure deployment"
            echo "  --skip-build         Skip Docker build and push"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

print_step() {
    echo -e "${BLUE}==== $1 ====${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_prerequisites() {
    print_step "Checking Prerequisites"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first:"
        echo "brew install awscli"
        exit 1
    fi
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    print_success "All prerequisites check passed"
}

setup_infrastructure() {
    if [ "$SKIP_INFRASTRUCTURE" = true ]; then
        print_warning "Skipping infrastructure setup"
        return
    fi
    
    print_step "Setting up AWS Infrastructure"
    
    # Create ECR repository if it doesn't exist
    aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION &> /dev/null || {
        print_step "Creating ECR repository"
        aws ecr create-repository --repository-name $ECR_REPO_NAME --region $REGION
    }
    
    # Create ECS cluster if it doesn't exist
    aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION --query 'clusters[?status==`ACTIVE`]' --output text | grep -q $CLUSTER_NAME || {
        print_step "Creating ECS cluster"
        aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION
    }
    
    print_success "Infrastructure setup completed"
}

build_and_push_image() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping Docker build and push"
        return
    fi
    
    print_step "Building and Pushing Docker Image"
    
    # Get ECR login token
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$REGION.amazonaws.com"
    
    # Get ECR repository URI
    ECR_URI=$(aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text)
    
    # Build Docker image
    print_step "Building Docker image"
    docker build -f Dockerfile.production -t $ECR_REPO_NAME:latest .
    
    # Tag and push image
    print_step "Pushing image to ECR"
    docker tag $ECR_REPO_NAME:latest $ECR_URI:latest
    docker push $ECR_URI:latest
    
    print_success "Docker image built and pushed successfully"
    echo "ECR URI: $ECR_URI"
}

deploy_application() {
    print_step "Deploying Application to ECS"
    
    # Create task definition (this would typically be in a separate JSON file)
    # For now, we'll create a basic one
    
    print_step "Creating/Updating ECS Task Definition"
    
    # Get account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:latest"
    
    # Create task definition JSON
    cat > task-definition.json << EOF
{
    "family": "syncsphere-task",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "1024",
    "memory": "2048",
    "executionRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "syncsphere",
            "image": "$ECR_URI",
            "portMappings": [
                {
                    "containerPort": 3000,
                    "protocol": "tcp"
                }
            ],
            "essential": true,
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/syncsphere",
                    "awslogs-region": "$REGION",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "environment": [
                {
                    "name": "NODE_ENV",
                    "value": "production"
                },
                {
                    "name": "PORT",
                    "value": "3000"
                }
            ]
        }
    ]
}
EOF
    
    # Register task definition
    aws ecs register-task-definition --cli-input-json file://task-definition.json --region $REGION
    
    # Create or update service
    SERVICE_EXISTS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --query 'services[?status==`ACTIVE`]' --output text 2>/dev/null || echo "")
    
    if [ -z "$SERVICE_EXISTS" ]; then
        print_step "Creating ECS service"
        # This would need proper VPC, subnet, and security group configuration
        print_warning "Service creation requires VPC setup. Please configure VPC, subnets, and security groups manually."
    else
        print_step "Updating ECS service"
        aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --task-definition syncsphere-task --region $REGION
    fi
    
    # Clean up
    rm -f task-definition.json
    
    print_success "Application deployment completed"
}

get_deployment_info() {
    print_step "Deployment Information"
    
    echo -e "${BLUE}Cluster:${NC} $CLUSTER_NAME"
    echo -e "${BLUE}Service:${NC} $SERVICE_NAME"
    echo -e "${BLUE}Region:${NC} $REGION"
    echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
    
    # Get service information if it exists
    SERVICE_INFO=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --query 'services[0]' 2>/dev/null || echo "{}")
    
    if [ "$SERVICE_INFO" != "{}" ]; then
        TASK_DEFINITION=$(echo $SERVICE_INFO | jq -r '.taskDefinition // "N/A"')
        DESIRED_COUNT=$(echo $SERVICE_INFO | jq -r '.desiredCount // "N/A"')
        RUNNING_COUNT=$(echo $SERVICE_INFO | jq -r '.runningCount // "N/A"')
        
        echo -e "${BLUE}Task Definition:${NC} $TASK_DEFINITION"
        echo -e "${BLUE}Desired Count:${NC} $DESIRED_COUNT"
        echo -e "${BLUE}Running Count:${NC} $RUNNING_COUNT"
    fi
}

main() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║        SyncSphere AWS Deployment Script      ║"
    echo "║                  macOS Version                ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_prerequisites
    setup_infrastructure
    build_and_push_image
    deploy_application
    get_deployment_info
    
    print_success "Deployment completed successfully!"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Configure RDS database using ./setup-aws-database.sh"
    echo "2. Set up Application Load Balancer and target groups"
    echo "3. Configure environment variables and secrets"
    echo "4. Set up CloudFront distribution for static assets"
}

# Run main function
main "$@"
