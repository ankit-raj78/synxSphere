# AWS Deployment Script for SyncSphere
# This script automates the deployment process to AWS

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipInfrastructure,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "🚀 Starting SyncSphere AWS Deployment..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan

# Check prerequisites
function Test-Prerequisites {
    Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
    
    # Check AWS CLI
    if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Host "❌ AWS CLI not found. Please install AWS CLI." -ForegroundColor Red
        exit 1
    }
    
    # Check AWS CDK
    if (!(Get-Command cdk -ErrorAction SilentlyContinue)) {
        Write-Host "❌ AWS CDK not found. Installing..." -ForegroundColor Yellow
        npm install -g aws-cdk
    }
    
    # Check Docker
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Docker not found. Please install Docker." -ForegroundColor Red
        exit 1
    }
    
    # Check Node.js
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Node.js not found. Please install Node.js." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
}

# Build and push Docker image
function Build-And-Push-Image {
    if ($SkipBuild) {
        Write-Host "⏭️ Skipping build step" -ForegroundColor Yellow
        return
    }
    
    Write-Host "🏗️ Building and pushing Docker image..." -ForegroundColor Yellow
    
    # Get ECR repository URI from AWS
    $ECR_URI = aws ssm get-parameter --name "/syncsphere/ecr-repository-uri" --query "Parameter.Value" --output text --region $Region 2>$null
    
    if (-not $ECR_URI) {
        Write-Host "❌ ECR repository not found. Please deploy infrastructure first." -ForegroundColor Red
        exit 1
    }
    
    # Get AWS account ID
    $ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
    
    Write-Host "📦 ECR Repository: $ECR_URI" -ForegroundColor Cyan
    
    # Login to ECR
    Write-Host "🔐 Logging into ECR..." -ForegroundColor Yellow
    aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$Region.amazonaws.com"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ECR login failed" -ForegroundColor Red
        exit 1
    }
    
    # Build Docker image
    Write-Host "🏗️ Building Docker image..." -ForegroundColor Yellow
    docker build -f Dockerfile.production -t syncsphere:latest .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker build failed" -ForegroundColor Red
        exit 1
    }
    
    # Tag and push image
    Write-Host "📤 Tagging and pushing image..." -ForegroundColor Yellow
    docker tag syncsphere:latest "$ECR_URI:latest"
    docker tag syncsphere:latest "$ECR_URI:$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
    
    docker push "$ECR_URI:latest"
    docker push "$ECR_URI:$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker push failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Docker image built and pushed successfully" -ForegroundColor Green
}

# Deploy infrastructure with CDK
function Deploy-Infrastructure {
    if ($SkipInfrastructure) {
        Write-Host "⏭️ Skipping infrastructure deployment" -ForegroundColor Yellow
        return
    }
    
    Write-Host "🏗️ Deploying AWS infrastructure..." -ForegroundColor Yellow
    
    # Change to CDK directory
    Push-Location aws-cdk
    
    try {
        # Install CDK dependencies
        Write-Host "📦 Installing CDK dependencies..." -ForegroundColor Yellow
        npm install
        
        # Bootstrap CDK (only needed once per account/region)
        Write-Host "🏁 Bootstrapping CDK..." -ForegroundColor Yellow
        cdk bootstrap --region $Region
        
        # Deploy stack
        Write-Host "🚀 Deploying CDK stack..." -ForegroundColor Yellow
        $env:ENVIRONMENT = $Environment
        $env:CDK_DEFAULT_REGION = $Region
        
        cdk deploy --require-approval never --region $Region
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ CDK deployment failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Infrastructure deployed successfully" -ForegroundColor Green
        
    } finally {
        Pop-Location
    }
}

# Update ECS service to use new image
function Update-ECS-Service {
    Write-Host "🔄 Updating ECS service..." -ForegroundColor Yellow
    
    # Force new deployment
    aws ecs update-service --cluster syncsphere-cluster --service SyncSphereService --force-new-deployment --region $Region
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ECS service update initiated" -ForegroundColor Green
        Write-Host "⏳ Waiting for deployment to complete..." -ForegroundColor Yellow
        
        # Wait for service to stabilize
        aws ecs wait services-stable --cluster syncsphere-cluster --services SyncSphereService --region $Region
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ ECS service deployment completed" -ForegroundColor Green
        } else {
            Write-Host "⚠️ ECS service deployment may have issues. Check AWS console." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ ECS service update failed" -ForegroundColor Red
        exit 1
    }
}

# Get deployment information
function Get-Deployment-Info {
    Write-Host "📋 Deployment Information:" -ForegroundColor Cyan
    
    # Get ALB endpoint
    $ALB_ENDPOINT = aws ssm get-parameter --name "/syncsphere/alb-endpoint" --query "Parameter.Value" --output text --region $Region 2>$null
    if ($ALB_ENDPOINT) {
        Write-Host "🌐 Application URL: http://$ALB_ENDPOINT" -ForegroundColor Green
    }
    
    # Get CloudFront domain
    $CLOUDFRONT_DOMAIN = aws ssm get-parameter --name "/syncsphere/cloudfront-domain" --query "Parameter.Value" --output text --region $Region 2>$null
    if ($CLOUDFRONT_DOMAIN) {
        Write-Host "☁️ CloudFront URL: https://$CLOUDFRONT_DOMAIN" -ForegroundColor Green
    }
    
    # Get ECR repository
    $ECR_REPO = aws ssm get-parameter --name "/syncsphere/ecr-repository-uri" --query "Parameter.Value" --output text --region $Region 2>$null
    if ($ECR_REPO) {
        Write-Host "📦 ECR Repository: $ECR_REPO" -ForegroundColor Green
    }
}

# Main execution
try {
    Test-Prerequisites
    
    if (-not $SkipInfrastructure) {
        Deploy-Infrastructure
    }
    
    Build-And-Push-Image
    Update-ECS-Service
    Get-Deployment-Info
    
    Write-Host ""
    Write-Host "🎉 SyncSphere deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Configure your domain and SSL certificate"
    Write-Host "2. Set up database with sample data"
    Write-Host "3. Configure monitoring and alerts"
    Write-Host "4. Set up CI/CD pipeline"
    
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
