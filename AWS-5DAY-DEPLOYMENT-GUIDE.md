# 🚀 SynxSphere 5-Day AWS Deployment Guide

## 📋 Quick Start

### Prerequisites
- AWS CLI installed and configured
- Your AWS Access Key, Secret Key, and Account Number
- macOS/Linux terminal

### 🔐 Step 1: Configure AWS CLI

```bash
aws configure
```

Enter your credentials:
- **AWS Access Key ID**: [Your Access Key]
- **AWS Secret Access Key**: [Your Secret Key]  
- **Default region name**: us-east-1
- **Default output format**: json

### 🚀 Step 2: Deploy Infrastructure

```bash
chmod +x deploy-aws-5day.sh
./deploy-aws-5day.sh
```

This script will:
- ✅ Create EC2 t3.medium instance
- ✅ Setup security groups
- ✅ Create S3 bucket for audio files
- ✅ Generate SSH key pair
- ✅ Configure all networking

**Time**: ~5 minutes
**Cost**: ~$13.67 for 5 days

### 🏗️ Step 3: Deploy Application

After infrastructure is ready, SSH into your instance:

```bash
ssh -i synxsphere-key.pem ec2-user@[YOUR_PUBLIC_IP]
```

Then run the application deployment:

```bash
# Upload the deployment script
scp -i synxsphere-key.pem deploy-app-5day.sh ec2-user@[YOUR_PUBLIC_IP]:~/

# SSH into instance and run
ssh -i synxsphere-key.pem ec2-user@[YOUR_PUBLIC_IP]
chmod +x deploy-app-5day.sh
./deploy-app-5day.sh
```

**Time**: ~10-15 minutes

### 🌐 Step 4: Access Your Application

Once deployed, access via:
- **Dashboard**: http://[YOUR_PUBLIC_IP]:3000
- **Collaboration**: http://[YOUR_PUBLIC_IP]:3003
- **OpenDAW Studio**: http://[YOUR_PUBLIC_IP]:8000

### 🧹 Step 5: Cleanup (IMPORTANT!)

**After 5 days**, run the cleanup script to avoid charges:

```bash
chmod +x cleanup-aws-5day.sh
./cleanup-aws-5day.sh
```

## 📊 What You Get

### 🖥️ Infrastructure
- **EC2 Instance**: t3.medium (2 vCPU, 4GB RAM)
- **Storage**: 30GB SSD
- **S3 Bucket**: For audio file storage
- **Security**: Configured firewall rules

### 🚀 Applications
- **Next.js Dashboard**: Modern web interface
- **Collaboration Server**: Real-time music collaboration
- **OpenDAW Studio**: Digital audio workstation
- **PostgreSQL**: Database for user data
- **Redis**: Caching for performance

### 💰 Costs
- **Total**: ~$13.67 for 5 days
- **Per day**: ~$2.73
- **Per hour**: ~$0.11

## 🔒 Security Features

- SSH access restricted to your IP
- Security groups configured properly
- SSL-ready configuration
- Isolated VPC networking

## 📋 Files Created

| File | Purpose |
|------|---------|
| `deploy-aws-5day.sh` | Main infrastructure deployment |
| `deploy-app-5day.sh` | Application deployment on EC2 |
| `cleanup-aws-5day.sh` | Complete resource cleanup |
| `deployment-info.txt` | Connection details (created during deployment) |
| `synxsphere-key.pem` | SSH private key (created during deployment) |

## ⚠️ Important Reminders

1. **Set Calendar Reminder**: Terminate after 5 days!
2. **Save Important Data**: This is temporary deployment
3. **Monitor Costs**: Check AWS billing dashboard
4. **Security**: Don't share your key files

## 🆘 Troubleshooting

### Common Issues:

**AWS CLI not configured:**
```bash
aws configure
# Enter your credentials
```

**Permission denied on scripts:**
```bash
chmod +x *.sh
```

**Can't connect to instance:**
- Check security group allows your IP
- Verify key file permissions: `chmod 400 synxsphere-key.pem`

**Services not starting:**
- SSH into instance and check: `sudo docker-compose -f docker-compose.5day.yml logs`

## 📞 Support

If you encounter issues:
1. Check the logs in the instance
2. Verify AWS credentials
3. Ensure all scripts have execute permissions
4. Check AWS service limits in your account

---

## 🎯 Ready to Deploy?

Total time: ~20 minutes
Total cost: ~$13.67 for 5 days

Run the deployment script when ready! 🚀
