#!/bin/bash

# 🚀 SynxSphere 5-Day AWS Deployment Script
# Ultra cost-effective deployment for testing/demo purposes

set -e

echo "🚀 Starting SynxSphere 5-Day AWS Deployment..."
echo "💰 Total estimated cost: ~$13.67 for 5 days"
echo ""

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-1"
INSTANCE_TYPE="t3.medium"
AMI_ID="ami-0c02fb55956c7d316"  # Amazon Linux 2023
KEY_NAME="synxsphere-key"
SECURITY_GROUP_NAME="synxsphere-sg"
S3_BUCKET_NAME="synxsphere-audio-$(date +%s)"

# Functions
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

# Check if AWS CLI is configured
check_aws_config() {
    print_step "Checking AWS CLI configuration..."
    
    if ! aws sts get-caller-identity &>/dev/null; then
        print_error "AWS CLI not configured or invalid credentials!"
        echo ""
        echo "Please run: aws configure"
        echo "And enter your:"
        echo "- AWS Access Key ID"
        echo "- AWS Secret Access Key" 
        echo "- Default region: us-east-1"
        echo "- Default output format: json"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS CLI configured. Account ID: $ACCOUNT_ID"
}

# Create Key Pair
create_key_pair() {
    print_step "Creating EC2 Key Pair..."
    
    if aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION &>/dev/null; then
        print_warning "Key pair $KEY_NAME already exists"
    else
        aws ec2 create-key-pair \
            --key-name $KEY_NAME \
            --region $REGION \
            --query 'KeyMaterial' \
            --output text > ${KEY_NAME}.pem
        
        chmod 400 ${KEY_NAME}.pem
        print_success "Key pair created: ${KEY_NAME}.pem"
    fi
}

# Create Security Group
create_security_group() {
    print_step "Creating Security Group..."
    
    # Check if security group exists
    SG_ID=$(aws ec2 describe-security-groups \
        --group-names $SECURITY_GROUP_NAME \
        --region $REGION \
        --query 'SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$SG_ID" != "None" ]; then
        print_warning "Security group already exists: $SG_ID"
    else
        SG_ID=$(aws ec2 create-security-group \
            --group-name $SECURITY_GROUP_NAME \
            --description "SynxSphere 5-day deployment security group" \
            --region $REGION \
            --query 'GroupId' \
            --output text)
        
        print_success "Security group created: $SG_ID"
    fi
    
    # Add security group rules
    print_step "Adding security group rules..."
    
    # SSH access (restrict to your IP)
    MY_IP=$(curl -s ifconfig.me)/32
    
    # Array of ports to open
    declare -a ports=("22" "80" "443" "3000" "3003" "8000")
    
    for port in "${ports[@]}"; do
        if [ "$port" == "22" ]; then
            # Restrict SSH to your IP only
            aws ec2 authorize-security-group-ingress \
                --group-id $SG_ID \
                --protocol tcp \
                --port $port \
                --cidr $MY_IP \
                --region $REGION 2>/dev/null || true
        else
            # Open other ports to world (for demo purposes)
            aws ec2 authorize-security-group-ingress \
                --group-id $SG_ID \
                --protocol tcp \
                --port $port \
                --cidr 0.0.0.0/0 \
                --region $REGION 2>/dev/null || true
        fi
    done
    
    print_success "Security group rules configured"
}

# Create S3 Bucket
create_s3_bucket() {
    print_step "Creating S3 bucket for audio files..."
    
    aws s3 mb s3://$S3_BUCKET_NAME --region $REGION
    
    # Set bucket policy for public read access to audio files
    cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$S3_BUCKET_NAME/*"
        }
    ]
}
EOF
    
    aws s3api put-bucket-policy \
        --bucket $S3_BUCKET_NAME \
        --policy file://bucket-policy.json
    
    rm bucket-policy.json
    print_success "S3 bucket created: $S3_BUCKET_NAME"
}

# Launch EC2 Instance
launch_instance() {
    print_step "Launching EC2 instance (t3.medium)..."
    
    # Create user data script
    cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
yum install -y docker git

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Node.js and npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Create deployment directory
mkdir -p /home/ec2-user/synxsphere
chown ec2-user:ec2-user /home/ec2-user/synxsphere

echo "Instance setup completed" > /home/ec2-user/setup-complete.txt
EOF
    
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --count 1 \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-group-ids $SG_ID \
        --user-data file://user-data.sh \
        --region $REGION \
        --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=SynxSphere-5Day},{Key=Project,Value=SynxSphere},{Key=Duration,Value=5-Days}]' \
        --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    print_success "Instance launched: $INSTANCE_ID"
    
    # Wait for instance to be running
    print_step "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
    
    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    print_success "Instance is running. Public IP: $PUBLIC_IP"
    
    rm user-data.sh
}

# Create deployment info file
create_deployment_info() {
    cat > deployment-info.txt << EOF
🚀 SynxSphere 5-Day AWS Deployment Information
==============================================

📋 Deployment Details:
- Instance ID: $INSTANCE_ID
- Instance Type: $INSTANCE_TYPE
- Public IP: $PUBLIC_IP
- Region: $REGION
- S3 Bucket: $S3_BUCKET_NAME

🔑 Access Information:
- SSH Command: ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP
- Key File: ${KEY_NAME}.pem

🌐 Application URLs (after deployment):
- Next.js Dashboard: http://$PUBLIC_IP:3000
- Collaboration Server: http://$PUBLIC_IP:3003
- OpenDAW Studio: http://$PUBLIC_IP:8000

💰 Estimated 5-Day Cost: ~$13.67

⚠️ IMPORTANT REMINDERS:
1. This is a 5-day deployment - set a reminder to terminate!
2. Terminate command: aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $REGION
3. Delete S3 bucket: aws s3 rb s3://$S3_BUCKET_NAME --force
4. Delete key pair: aws ec2 delete-key-pair --key-name $KEY_NAME --region $REGION

📅 Termination Date: $(date -d '+5 days' '+%Y-%m-%d %H:%M:%S')

EOF
    
    print_success "Deployment info saved to: deployment-info.txt"
}

# Main execution
main() {
    echo "Starting deployment process..."
    
    check_aws_config
    create_key_pair
    create_security_group
    create_s3_bucket
    launch_instance
    create_deployment_info
    
    echo ""
    echo -e "${GREEN}🎉 AWS Infrastructure deployed successfully!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "1. Wait 2-3 minutes for instance initialization"
    echo "2. SSH into instance: ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
    echo "3. Run the application deployment script"
    echo ""
    echo -e "${YELLOW}⚠️  Remember to terminate after 5 days to avoid charges!${NC}"
    echo ""
    echo "📄 All details saved in: deployment-info.txt"
}

# Run main function
main "$@"
