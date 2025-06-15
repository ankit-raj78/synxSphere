# 🚀 SyncSphere AWS Deployment

Complete AWS deployment solution for SyncSphere audio collaboration platform using Infrastructure as Code (CDK) and containerization.

## 📋 Quick Start

### One-Command Deployment
```powershell
# Complete deployment with sample data
.\quick-deploy-aws.ps1

# Production deployment without sample data
.\quick-deploy-aws.ps1 -SkipSampleData

# Dry run to see what would be deployed
.\quick-deploy-aws.ps1 -DryRun
```

### Manual Step-by-Step Deployment
```powershell
# 1. Deploy infrastructure and application
.\deploy-aws.ps1

# 2. Set up database
.\setup-aws-database.ps1

# 3. Validate deployment
.\validate-aws-deployment.ps1
```

## 🏗️ Infrastructure Overview

### AWS Services Used
- **ECS Fargate**: Container orchestration
- **RDS PostgreSQL**: Managed database
- **ElastiCache Redis**: Caching and sessions
- **S3**: Audio file storage
- **CloudFront**: CDN for static assets
- **Application Load Balancer**: Load balancing
- **ECR**: Container registry
- **Secrets Manager**: Credential storage
- **VPC**: Network isolation

### Architecture Diagram
```
Internet → CloudFront → ALB → ECS Fargate
                        ↓
                   RDS PostgreSQL
                        ↓
                  ElastiCache Redis
                        ↓
                    S3 Buckets
```

## 💰 Cost Estimation

### Monthly AWS Costs (US East 1)
- **ECS Fargate** (1 task): ~$15-30
- **RDS PostgreSQL** (t3.micro): ~$15-25
- **ElastiCache Redis** (t3.micro): ~$15-20
- **Application Load Balancer**: ~$20
- **S3 Storage** (10GB): ~$0.25
- **CloudFront** (1TB transfer): ~$85
- **Data Transfer**: ~$5-15

**Total Estimated Cost**: $50-200/month (varies by usage)

### Cost Optimization Tips
- Use Reserved Instances for predictable workloads (-30-50%)
- Enable S3 Intelligent Tiering for audio files
- Monitor CloudFront usage and optimize caching
- Scale down non-production environments

## 🔧 Configuration Files

### Core Deployment Files
- `aws-cdk/` - Infrastructure as Code
- `deploy-aws.ps1` - Main deployment script
- `setup-aws-database.ps1` - Database setup
- `validate-aws-deployment.ps1` - Deployment validation
- `quick-deploy-aws.ps1` - One-command deployment

### Docker Configuration
- `Dockerfile.production` - Production container
- `docker-compose.production.yml` - Local production testing
- `healthcheck.js` - Container health check

### CI/CD
- `.github/workflows/deploy-aws.yml` - GitHub Actions workflow
- `.env.production.example` - Environment variables template

## 🚀 Deployment Process

### Prerequisites
1. AWS Account with admin permissions
2. AWS CLI installed and configured
3. Docker installed
4. Node.js 18+ and npm
5. PostgreSQL client (for database setup)

### Step 1: Prepare Environment
```powershell
# Configure AWS CLI
aws configure

# Verify credentials
aws sts get-caller-identity

# Set region (optional)
$env:AWS_DEFAULT_REGION = "us-east-1"
```

### Step 2: Deploy Infrastructure
```powershell
# Quick deployment
.\quick-deploy-aws.ps1

# Or manual deployment
.\deploy-aws.ps1
```

### Step 3: Set Up Database
```powershell
# With sample data
.\setup-aws-database.ps1

# Production (no sample data)
.\setup-aws-database.ps1 -SkipSampleData
```

### Step 4: Validate Deployment
```powershell
.\validate-aws-deployment.ps1
```

## 🔄 Updates and Maintenance

### Application Updates
```powershell
# Deploy new version
.\deploy-aws.ps1 -SkipInfrastructure

# Or use GitHub Actions for automated deployments
```

### Infrastructure Updates
```powershell
# Modify aws-cdk/lib/syncsphere-stack.ts
# Then deploy
cd aws-cdk
cdk deploy
```

### Monitoring
```powershell
# View application logs
aws logs tail /ecs/syncsphere --follow

# Check service status
aws ecs describe-services --cluster syncsphere-cluster --services SyncSphereService

# Monitor costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost
```

## 🔐 Security Best Practices

### Network Security
- VPC with private subnets for database and cache
- Security groups restrict access between services
- ALB provides SSL termination
- No direct internet access to backend services

### Data Security
- Database credentials stored in AWS Secrets Manager
- S3 buckets are private with CloudFront access
- All data encrypted at rest and in transit
- IAM roles follow principle of least privilege

### Application Security
- Security headers configured
- Rate limiting on API endpoints
- Input validation and sanitization
- Regular security updates via automated deployments

### Recommended Security Enhancements
```powershell
# Request SSL certificate for custom domain
aws acm request-certificate --domain-name yourdomain.com --validation-method DNS

# Enable AWS Config for compliance monitoring
aws configservice put-configuration-recorder --configuration-recorder name=default,roleARN=arn:aws:iam::account:role/config-role

# Set up CloudTrail for audit logging
aws cloudtrail create-trail --name syncsphere-audit --s3-bucket-name your-audit-bucket
```

## 📊 Monitoring and Alerts

### CloudWatch Dashboards
The deployment automatically creates monitoring for:
- ECS service health and metrics
- RDS performance metrics
- ALB request metrics
- Application logs

### Recommended Alerts
```powershell
# High CPU usage
aws cloudwatch put-metric-alarm --alarm-name "SyncSphere-High-CPU" --alarm-description "High CPU usage" --metric-name CPUUtilization --namespace AWS/ECS --statistic Average --period 300 --threshold 80 --comparison-operator GreaterThanThreshold

# Database connection issues
aws cloudwatch put-metric-alarm --alarm-name "SyncSphere-DB-Connections" --alarm-description "High DB connections" --metric-name DatabaseConnections --namespace AWS/RDS --statistic Average --period 300 --threshold 80 --comparison-operator GreaterThanThreshold
```

## 🔧 Troubleshooting

### Common Issues

**Deployment Fails**
```powershell
# Check AWS credentials
aws sts get-caller-identity

# Verify region
aws configure get region

# Check service quotas
aws service-quotas get-service-quota --service-code ecs --quota-code L-34B43A08
```

**Application Won't Start**
```powershell
# Check ECS service events
aws ecs describe-services --cluster syncsphere-cluster --services SyncSphereService

# View container logs
aws logs tail /ecs/syncsphere --follow

# Check task definition
aws ecs describe-task-definition --task-definition syncsphere
```

**Database Connection Issues**
```powershell
# Test database connectivity from local machine
# Get RDS endpoint from AWS console
psql -h your-rds-endpoint.region.rds.amazonaws.com -U syncsphere -d syncsphere

# Check security group rules
aws ec2 describe-security-groups --group-names RDSSecurityGroup
```

**File Upload Issues**
```powershell
# Check S3 bucket permissions
aws s3api get-bucket-policy --bucket syncsphere-audio-files-account-region

# Test S3 access
aws s3 ls s3://syncsphere-audio-files-account-region/

# Verify IAM roles
aws iam get-role --role-name SyncSphereTaskRole
```

### Performance Optimization

**Database Performance**
```powershell
# Monitor slow queries
aws rds describe-db-log-files --db-instance-identifier syncsphere-database

# Enable Performance Insights
aws rds modify-db-instance --db-instance-identifier syncsphere-database --enable-performance-insights
```

**Application Scaling**
```powershell
# Scale ECS service
aws ecs update-service --cluster syncsphere-cluster --service SyncSphereService --desired-count 3

# Update auto-scaling settings
aws application-autoscaling register-scalable-target --service-namespace ecs --resource-id service/syncsphere-cluster/SyncSphereService --scalable-dimension ecs:service:DesiredCount --min-capacity 1 --max-capacity 10
```

## 🧹 Cleanup and Teardown

### Complete Cleanup
```powershell
# Destroy all AWS resources
cd aws-cdk
cdk destroy

# Manually delete (if needed):
# - S3 buckets with contents
# - ECR images
# - CloudWatch log groups
# - Route 53 records (if custom domain used)
```

### Partial Cleanup (Keep Infrastructure)
```powershell
# Stop ECS service (saves compute costs)
aws ecs update-service --cluster syncsphere-cluster --service SyncSphereService --desired-count 0

# Stop RDS instance (saves database costs)
aws rds stop-db-instance --db-instance-identifier syncsphere-database
```

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [RDS Performance Tuning](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)

## 📞 Support

For deployment issues:
1. Check troubleshooting section above
2. Review CloudWatch logs
3. Validate AWS permissions
4. Check service quotas and limits
5. Consult AWS documentation

For application issues:
1. Check application logs in CloudWatch
2. Verify environment variables
3. Test database connectivity
4. Review API endpoints with health checks
