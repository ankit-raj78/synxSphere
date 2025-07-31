#!/bin/bash

# 🧹 AWS Cleanup Script for SynxSphere 5-Day Deployment
# Run this script to terminate all AWS resources and avoid charges

set -e

echo "🧹 SynxSphere AWS Cleanup Script"
echo "⚠️  This will terminate ALL AWS resources created for the 5-day deployment"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}📋 Step: $1${NC}"
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

# Configuration
REGION="us-east-1"
KEY_NAME="synxsphere-key"
SECURITY_GROUP_NAME="synxsphere-sg"

# Confirmation prompt
confirm_cleanup() {
    echo -e "${YELLOW}⚠️  WARNING: This will permanently delete all AWS resources!${NC}"
    echo ""
    echo "This will terminate:"
    echo "- EC2 instances tagged with 'SynxSphere-5Day'"
    echo "- S3 buckets starting with 'synxsphere-audio-'"
    echo "- Security group '$SECURITY_GROUP_NAME'"
    echo "- Key pair '$KEY_NAME'"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        echo "Cleanup cancelled."
        exit 0
    fi
}

# Find and terminate EC2 instances
terminate_instances() {
    print_step "Finding SynxSphere instances..."
    
    INSTANCE_IDS=$(aws ec2 describe-instances \
        --region $REGION \
        --filters "Name=tag:Name,Values=SynxSphere-5Day" "Name=instance-state-name,Values=running,stopped,stopping" \
        --query 'Reservations[*].Instances[*].InstanceId' \
        --output text)
    
    if [ -z "$INSTANCE_IDS" ]; then
        print_warning "No SynxSphere instances found"
    else
        print_step "Terminating instances: $INSTANCE_IDS"
        aws ec2 terminate-instances \
            --instance-ids $INSTANCE_IDS \
            --region $REGION
        
        print_step "Waiting for instances to terminate..."
        aws ec2 wait instance-terminated \
            --instance-ids $INSTANCE_IDS \
            --region $REGION
        
        print_success "Instances terminated"
    fi
}

# Delete S3 buckets
cleanup_s3() {
    print_step "Finding SynxSphere S3 buckets..."
    
    BUCKET_NAMES=$(aws s3api list-buckets \
        --query 'Buckets[?starts_with(Name, `synxsphere-audio-`)].Name' \
        --output text)
    
    if [ -z "$BUCKET_NAMES" ]; then
        print_warning "No SynxSphere S3 buckets found"
    else
        for bucket in $BUCKET_NAMES; do
            print_step "Deleting S3 bucket: $bucket"
            
            # Delete all objects first
            aws s3 rm s3://$bucket --recursive
            
            # Delete the bucket
            aws s3api delete-bucket \
                --bucket $bucket \
                --region $REGION
            
            print_success "S3 bucket deleted: $bucket"
        done
    fi
}

# Delete security group
delete_security_group() {
    print_step "Deleting security group..."
    
    SG_ID=$(aws ec2 describe-security-groups \
        --group-names $SECURITY_GROUP_NAME \
        --region $REGION \
        --query 'SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$SG_ID" = "None" ]; then
        print_warning "Security group not found"
    else
        aws ec2 delete-security-group \
            --group-id $SG_ID \
            --region $REGION
        
        print_success "Security group deleted: $SG_ID"
    fi
}

# Delete key pair
delete_key_pair() {
    print_step "Deleting key pair..."
    
    if aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION &>/dev/null; then
        aws ec2 delete-key-pair \
            --key-name $KEY_NAME \
            --region $REGION
        
        print_success "Key pair deleted: $KEY_NAME"
        
        # Remove local key file
        if [ -f "${KEY_NAME}.pem" ]; then
            rm "${KEY_NAME}.pem"
            print_success "Local key file removed: ${KEY_NAME}.pem"
        fi
    else
        print_warning "Key pair not found"
    fi
}

# Calculate final costs
calculate_costs() {
    print_step "Calculating final costs..."
    
    # This is an estimation based on the deployment plan
    echo ""
    echo "💰 Estimated costs for your 5-day deployment:"
    echo "   - EC2 t3.medium (5 days): ~$10.12"
    echo "   - EBS 30GB storage: ~$2.40"
    echo "   - S3 storage (minimal): ~$0.25"
    echo "   - Data transfer: ~$0.90"
    echo "   ================================"
    echo "   Total estimated cost: ~$13.67"
    echo ""
    echo "📊 You can check exact costs in AWS Billing Console"
}

# Main execution
main() {
    echo "Starting cleanup process..."
    
    confirm_cleanup
    terminate_instances
    cleanup_s3
    delete_security_group
    delete_key_pair
    calculate_costs
    
    echo ""
    echo -e "${GREEN}🎉 AWS cleanup completed successfully!${NC}"
    echo ""
    echo "✅ All SynxSphere AWS resources have been terminated"
    echo "💰 No more charges will be incurred"
    echo "📊 Check AWS Billing Console for final cost summary"
    echo ""
    echo "Thank you for using SynxSphere! 🚀"
}

# Run main function
main "$@"
