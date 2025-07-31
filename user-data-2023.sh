#!/bin/bash
dnf update -y
dnf install -y docker git nodejs npm

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Create deployment directory
mkdir -p /home/ec2-user/synxsphere
chown ec2-user:ec2-user /home/ec2-user/synxsphere

echo "Instance setup completed" > /home/ec2-user/setup-complete.txt
