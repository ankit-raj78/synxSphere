#!/bin/bash

# SyncSphere EC2 Deployment Script
set -e

echo "🚀 Starting SyncSphere EC2 Deployment..."

# Configuration
REGION="us-east-1"
INSTANCE_TYPE="t3.medium"  # 2 vCPU, 4 GB RAM - good for audio processing
KEY_NAME="syncsphere-key"
SECURITY_GROUP_NAME="syncsphere-sg"
INSTANCE_NAME="syncsphere-server"

# Get the latest Amazon Linux 2 AMI
echo "📋 Getting latest Amazon Linux 2 AMI..."
AMI_ID=$(aws ec2 describe-images \
    --owners amazon \
    --filters \
        "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" \
        "Name=state,Values=available" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text)

echo "✅ Using AMI: $AMI_ID"

# Get default VPC and subnet
echo "🌐 Getting VPC and subnet information..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0].SubnetId' --output text)

echo "✅ Using VPC: $VPC_ID"
echo "✅ Using Subnet: $SUBNET_ID"

# Check if key pair exists, if not create it
echo "🔑 Checking SSH key pair..."
if ! aws ec2 describe-key-pairs --key-names $KEY_NAME >/dev/null 2>&1; then
    echo "Creating new key pair: $KEY_NAME"
    aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > ${KEY_NAME}.pem
    chmod 400 ${KEY_NAME}.pem
    echo "✅ Key pair created and saved as ${KEY_NAME}.pem"
else
    echo "✅ Key pair $KEY_NAME already exists"
fi

# Check if security group exists
echo "🔒 Checking security group..."
if ! aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME >/dev/null 2>&1; then
    echo "Creating security group: $SECURITY_GROUP_NAME"
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP_NAME \
        --description "Security group for SyncSphere application" \
        --vpc-id $VPC_ID \
        --query 'GroupId' --output text)
    
    # Add rules for HTTP, HTTPS, SSH, and our app
    aws ec2 authorize-security-group-ingress --group-id $SECURITY_GROUP_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SECURITY_GROUP_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SECURITY_GROUP_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SECURITY_GROUP_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0
    
    echo "✅ Security group created: $SECURITY_GROUP_ID"
else
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --query 'SecurityGroups[0].GroupId' --output text)
    echo "✅ Using existing security group: $SECURITY_GROUP_ID"
fi

# Create user data script for EC2 instance
cat > user-data.sh << 'EOL'
#!/bin/bash
yum update -y
yum install -y docker git

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js and npm
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install PostgreSQL client
yum install -y postgresql

# Create app directory
mkdir -p /home/ec2-user/syncsphere
chown ec2-user:ec2-user /home/ec2-user/syncsphere

# Create environment file
cat > /home/ec2-user/syncsphere/.env << 'ENVEOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://syncsphere_user:syncsphere_password@localhost:5432/syncsphere_db
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3000
ENVEOF

# Create a simple startup script
cat > /home/ec2-user/start-syncsphere.sh << 'STARTEOF'
#!/bin/bash
cd /home/ec2-user/syncsphere

# Start PostgreSQL in Docker
docker run -d \
  --name syncsphere-db \
  --restart unless-stopped \
  -e POSTGRES_DB=syncsphere_db \
  -e POSTGRES_USER=syncsphere_user \
  -e POSTGRES_PASSWORD=syncsphere_password \
  -p 5432:5432 \
  -v syncsphere_data:/var/lib/postgresql/data \
  postgres:15

# Wait for database to be ready
sleep 30

# Pull and run the SyncSphere application
docker pull 752233440549.dkr.ecr.us-east-1.amazonaws.com/syncsphere:latest
docker run -d \
  --name syncsphere-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --link syncsphere-db:db \
  --env-file .env \
  752233440549.dkr.ecr.us-east-1.amazonaws.com/syncsphere:latest

echo "SyncSphere is starting up..."
echo "Access your application at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
STARTEOF

chmod +x /home/ec2-user/start-syncsphere.sh
chown ec2-user:ec2-user /home/ec2-user/start-syncsphere.sh

# Set up systemd service for auto-start
cat > /etc/systemd/system/syncsphere.service << 'SERVICEEOF'
[Unit]
Description=SyncSphere Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=true
User=ec2-user
WorkingDirectory=/home/ec2-user
ExecStart=/home/ec2-user/start-syncsphere.sh
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl enable syncsphere.service

# Configure AWS CLI for ECR access
yum install -y awscli
EOL

# Launch EC2 instance
echo "🚀 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SECURITY_GROUP_ID \
    --subnet-id $SUBNET_ID \
    --user-data file://user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --associate-public-ip-address \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "🎉 SyncSphere EC2 Deployment Complete!"
echo "================================="
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "SSH Command: ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo "Application URL: http://$PUBLIC_IP:3000"
echo ""
echo "⏳ The application is starting up... Please wait 5-10 minutes for full deployment."
echo "You can monitor the startup process by SSH'ing into the instance and running:"
echo "   sudo tail -f /var/log/cloud-init-output.log"
echo ""
echo "To check application status:"
echo "   docker ps"
echo "   docker logs syncsphere-app"

# Clean up
rm -f user-data.sh

echo "🏁 Deployment script completed!"
