#!/bin/bash

# SyncSphere AWS Deployment Validation Script for macOS
# This script validates the AWS deployment and checks service health

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REGION="us-east-1"
CLUSTER_NAME="syncsphere-cluster"
SERVICE_NAME="syncsphere-service"
ECR_REPO_NAME="syncsphere"
DB_INSTANCE_IDENTIFIER="syncsphere-db"

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

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        return 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        return 1
    fi
    
    print_success "AWS CLI configured and working"
    return 0
}

validate_ecr_repository() {
    print_step "Validating ECR Repository"
    
    if aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION &> /dev/null; then
        REPO_URI=$(aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text)
        print_success "ECR repository exists: $REPO_URI"
        
        # Check for images
        IMAGE_COUNT=$(aws ecr describe-images --repository-name $ECR_REPO_NAME --region $REGION --query 'length(imageDetails)' --output text 2>/dev/null || echo "0")
        if [ "$IMAGE_COUNT" -gt 0 ]; then
            print_success "Repository contains $IMAGE_COUNT image(s)"
        else
            print_warning "Repository exists but contains no images"
        fi
    else
        print_error "ECR repository not found: $ECR_REPO_NAME"
        return 1
    fi
}

validate_ecs_cluster() {
    print_step "Validating ECS Cluster"
    
    CLUSTER_STATUS=$(aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION --query 'clusters[0].status' --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$CLUSTER_STATUS" = "ACTIVE" ]; then
        ACTIVE_SERVICES=$(aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION --query 'clusters[0].activeServicesCount' --output text)
        RUNNING_TASKS=$(aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION --query 'clusters[0].runningTasksCount' --output text)
        
        print_success "ECS cluster is active"
        echo -e "${BLUE}Active Services:${NC} $ACTIVE_SERVICES"
        echo -e "${BLUE}Running Tasks:${NC} $RUNNING_TASKS"
    elif [ "$CLUSTER_STATUS" = "NOT_FOUND" ]; then
        print_error "ECS cluster not found: $CLUSTER_NAME"
        return 1
    else
        print_warning "ECS cluster status: $CLUSTER_STATUS"
    fi
}

validate_ecs_service() {
    print_step "Validating ECS Service"
    
    SERVICE_INFO=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --query 'services[0]' 2>/dev/null || echo "{}")
    
    if [ "$SERVICE_INFO" != "{}" ]; then
        SERVICE_STATUS=$(echo $SERVICE_INFO | jq -r '.status // "UNKNOWN"')
        DESIRED_COUNT=$(echo $SERVICE_INFO | jq -r '.desiredCount // "0"')
        RUNNING_COUNT=$(echo $SERVICE_INFO | jq -r '.runningCount // "0"')
        PENDING_COUNT=$(echo $SERVICE_INFO | jq -r '.pendingCount // "0"')
        
        if [ "$SERVICE_STATUS" = "ACTIVE" ]; then
            print_success "ECS service is active"
        else
            print_warning "ECS service status: $SERVICE_STATUS"
        fi
        
        echo -e "${BLUE}Desired Tasks:${NC} $DESIRED_COUNT"
        echo -e "${BLUE}Running Tasks:${NC} $RUNNING_COUNT"
        echo -e "${BLUE}Pending Tasks:${NC} $PENDING_COUNT"
        
        if [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ] && [ "$DESIRED_COUNT" -gt 0 ]; then
            print_success "All desired tasks are running"
        elif [ "$DESIRED_COUNT" -eq 0 ]; then
            print_warning "Service has 0 desired tasks"
        else
            print_warning "Not all desired tasks are running"
        fi
    else
        print_error "ECS service not found: $SERVICE_NAME"
        return 1
    fi
}

validate_rds_instance() {
    print_step "Validating RDS Instance"
    
    DB_STATUS=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_IDENTIFIER --region $REGION --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$DB_STATUS" = "available" ]; then
        DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_IDENTIFIER --region $REGION --query 'DBInstances[0].Endpoint.Address' --output text)
        DB_ENGINE=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_IDENTIFIER --region $REGION --query 'DBInstances[0].Engine' --output text)
        DB_VERSION=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_IDENTIFIER --region $REGION --query 'DBInstances[0].EngineVersion' --output text)
        
        print_success "RDS instance is available"
        echo -e "${BLUE}Endpoint:${NC} $DB_ENDPOINT"
        echo -e "${BLUE}Engine:${NC} $DB_ENGINE $DB_VERSION"
    elif [ "$DB_STATUS" = "NOT_FOUND" ]; then
        print_error "RDS instance not found: $DB_INSTANCE_IDENTIFIER"
        return 1
    else
        print_warning "RDS instance status: $DB_STATUS"
    fi
}

validate_secrets_manager() {
    print_step "Validating Secrets Manager"
    
    if aws secretsmanager describe-secret --secret-id "syncsphere/database" --region $REGION &> /dev/null; then
        print_success "Database credentials secret exists"
    else
        print_warning "Database credentials secret not found"
    fi
}

get_application_urls() {
    print_step "Application Access Information"
    
    # Try to get load balancer information
    # This would need to be implemented based on your specific ALB setup
    print_warning "Load balancer information not available (manual setup required)"
    
    # Check if we can get service public IP (for Fargate tasks with public IPs)
    TASK_ARNS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $REGION --query 'taskArns' --output text 2>/dev/null || echo "")
    
    if [ -n "$TASK_ARNS" ]; then
        for TASK_ARN in $TASK_ARNS; do
            NETWORK_INTERFACE=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text 2>/dev/null || echo "")
            
            if [ -n "$NETWORK_INTERFACE" ]; then
                PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $NETWORK_INTERFACE --region $REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text 2>/dev/null || echo "None")
                
                if [ "$PUBLIC_IP" != "None" ] && [ -n "$PUBLIC_IP" ]; then
                    echo -e "${BLUE}Task Public IP:${NC} http://$PUBLIC_IP:3000"
                fi
            fi
        done
    fi
}

check_task_health() {
    print_step "Checking Task Health"
    
    TASK_ARNS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $REGION --query 'taskArns' --output text 2>/dev/null || echo "")
    
    if [ -n "$TASK_ARNS" ]; then
        for TASK_ARN in $TASK_ARNS; do
            TASK_STATUS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $REGION --query 'tasks[0].lastStatus' --output text 2>/dev/null || echo "UNKNOWN")
            HEALTH_STATUS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $REGION --query 'tasks[0].healthStatus' --output text 2>/dev/null || echo "UNKNOWN")
            
            TASK_ID=$(basename $TASK_ARN)
            echo -e "${BLUE}Task:${NC} $TASK_ID"
            echo -e "${BLUE}Status:${NC} $TASK_STATUS"
            echo -e "${BLUE}Health:${NC} $HEALTH_STATUS"
            echo ""
        done
    else
        print_warning "No tasks found for service"
    fi
}

main() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║     SyncSphere AWS Deployment Validation     ║"
    echo "║                macOS Version                  ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_aws_cli
    validate_ecr_repository
    validate_ecs_cluster
    validate_ecs_service
    validate_rds_instance
    validate_secrets_manager
    check_task_health
    get_application_urls
    
    echo ""
    print_success "Validation completed!"
}

# Run main function
main "$@"
