# AWS Deployment Guide for SyncSphere

This guide walks you through deploying SyncSphere to AWS using Infrastructure as Code (CDK) and containerization.

## 🏗️ Architecture Overview

SyncSphere on AWS uses the following services:
- **ECS Fargate**: Container orchestration for the Next.js application
- **RDS PostgreSQL**: Managed database for structured data
- **ElastiCache Redis**: Caching and session management
- **S3**: Storage for audio files and compositions
- **CloudFront**: CDN for static assets
- **Application Load Balancer**: Load balancing and SSL termination
- **ECR**: Container registry for Docker images
- **Secrets Manager**: Secure credential storage
- **VPC**: Isolated network environment

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Docker** installed and running
4. **Node.js** (v18 or later)
5. **PostgreSQL client** (psql) for database setup

### Install AWS CLI
```powershell
# Windows (using winget)
winget install Amazon.AWSCLI

# Or download from: https://aws.amazon.com/cli/
```

### Configure AWS CLI
```powershell
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region, and Output format
```

### Install AWS CDK
```powershell
npm install -g aws-cdk
```

## 🚀 Deployment Steps

### Step 1: Clone and Prepare
```powershell
cd c:\Users\ankit\synxSphere
```

### Step 2: Deploy Infrastructure and Application
```powershell
# Full deployment (infrastructure + application)
.\deploy-aws.ps1

# Or deploy with specific options
.\deploy-aws.ps1 -Environment production -Region us-east-1
```

This script will:
1. ✅ Check prerequisites
2. 🏗️ Deploy AWS infrastructure using CDK
3. 📦 Build and push Docker image to ECR
4. 🔄 Update ECS service with new image
5. 📋 Display deployment information

### Step 3: Set Up Database
```powershell
# Setup database with sample data
.\setup-aws-database.ps1

# Or setup without sample data
.\setup-aws-database.ps1 -SkipSampleData
```

### Step 4: Access Your Application
After deployment, you'll receive:
- **Application URL**: `http://your-load-balancer-dns.us-east-1.elb.amazonaws.com`
- **CloudFront URL**: `https://your-cloudfront-domain.cloudfront.net`

## 🔧 Configuration

### Environment Variables
The application automatically receives these environment variables:

| Variable | Description | Source |
|----------|-------------|---------|
| `NODE_ENV` | Environment (production) | Container |
| `DB_HOST` | Database hostname | Secrets Manager |
| `DB_PORT` | Database port | Secrets Manager |
| `DB_NAME` | Database name | Secrets Manager |
| `DB_USER` | Database username | Secrets Manager |
| `DB_PASSWORD` | Database password | Secrets Manager |
| `REDIS_HOST` | Redis hostname | ElastiCache |
| `REDIS_PORT` | Redis port | ElastiCache |
| `S3_AUDIO_BUCKET` | S3 bucket for audio files | S3 |
| `S3_COMPOSITIONS_BUCKET` | S3 bucket for compositions | S3 |
| `CLOUDFRONT_DOMAIN` | CloudFront domain | CloudFront |

### Database Connection
The application automatically connects to RDS PostgreSQL using credentials stored in AWS Secrets Manager.

### File Storage
Audio files are stored in S3 and served through CloudFront for optimal performance.

## 🔄 Updates and Redeployment

### Update Application Only
```powershell
# Build and deploy new version without infrastructure changes
.\deploy-aws.ps1 -SkipInfrastructure
```

### Update Infrastructure Only
```powershell
# Deploy infrastructure changes without rebuilding the application
.\deploy-aws.ps1 -SkipBuild
```

### Manual Docker Build and Push
```powershell
# Get ECR repository URI
$ECR_URI = aws ssm get-parameter --name "/syncsphere/ecr-repository-uri" --query "Parameter.Value" --output text

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI

# Build and push
docker build -f Dockerfile.production -t syncsphere:latest .
docker tag syncsphere:latest "$ECR_URI:latest"
docker push "$ECR_URI:latest"

# Update ECS service
aws ecs update-service --cluster syncsphere-cluster --service SyncSphereService --force-new-deployment
```

## 📊 Monitoring and Maintenance

### View Logs
```powershell
# View ECS service logs
aws logs tail /ecs/syncsphere --follow

# View specific log streams
aws logs describe-log-streams --log-group-name /ecs/syncsphere
```

### Check Service Status
```powershell
# Check ECS service status
aws ecs describe-services --cluster syncsphere-cluster --services SyncSphereService

# Check load balancer targets
aws elbv2 describe-target-health --target-group-arn YOUR_TARGET_GROUP_ARN
```

### Database Management
```powershell
# Connect to RDS database
# First get credentials from Secrets Manager, then:
psql -h YOUR_RDS_ENDPOINT -U syncsphere -d syncsphere

# Run database backups
aws rds create-db-snapshot --db-instance-identifier syncsphere-database --db-snapshot-identifier syncsphere-backup-$(Get-Date -Format 'yyyy-MM-dd-HH-mm')
```

## 🔐 Security Best Practices

1. **SSL/HTTPS**: Configure SSL certificate in ALB for production
2. **IAM Roles**: Use least-privilege IAM roles for ECS tasks
3. **VPC**: Database and Redis are in private subnets
4. **Secrets**: Database credentials stored in Secrets Manager
5. **Network**: Security groups restrict access between services

### Enable HTTPS
```powershell
# Request SSL certificate
aws acm request-certificate --domain-name yourdomain.com --validation-method DNS

# Update ALB listener to use HTTPS
# (This can be done through AWS Console or additional CDK configuration)
```

## 💰 Cost Optimization

### Development Environment
For development/testing, you can reduce costs by:
- Using `t3.micro` instances for RDS
- Using `cache.t3.micro` for Redis
- Setting ECS desired count to 1
- Using smaller ECS task sizes

### Production Environment
For production:
- Enable Multi-AZ for RDS
- Use larger instance types for better performance
- Enable auto-scaling for ECS
- Consider Reserved Instances for predictable workloads

## 🧹 Cleanup

### Delete Everything
```powershell
# Destroy all AWS resources
cd aws-cdk
cdk destroy

# Manually delete:
# - S3 buckets (if they contain data)
# - ECR images
# - CloudWatch logs (optional)
```

## 🆘 Troubleshooting

### Common Issues

**Deployment Fails**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify region: `aws configure get region`
- Check service quotas in AWS Console

**Application Won't Start**
- Check ECS service events: `aws ecs describe-services --cluster syncsphere-cluster --services SyncSphereService`
- View container logs: `aws logs tail /ecs/syncsphere --follow`
- Verify environment variables in task definition

**Database Connection Issues**
- Check security group rules
- Verify credentials in Secrets Manager
- Test connection from ECS task

**File Upload Issues**
- Verify S3 bucket permissions
- Check IAM roles for ECS tasks
- Review CORS configuration

### Getting Help
- View AWS CloudFormation events for infrastructure issues
- Check ECS service events for deployment issues
- Review CloudWatch logs for application errors
- Use AWS Support if you have a support plan

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
