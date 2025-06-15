# SyncSphere AWS Quick Deploy Script
# This script provides a complete one-command deployment to AWS

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipValidation,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSampleData,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host @"
🚀 SyncSphere AWS Quick Deploy
==============================

Environment: $Environment
Region: $Region
Dry Run: $DryRun
Skip Validation: $SkipValidation
Skip Sample Data: $SkipSampleData

"@ -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No actual changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Function to run command with dry run support
function Invoke-DeploymentStep {
    param(
        [string]$StepName,
        [scriptblock]$Command,
        [bool]$IsDryRun = $false
    )
    
    Write-Host "📋 Step: $StepName" -ForegroundColor Yellow
    
    if ($IsDryRun) {
        Write-Host "   [DRY RUN] Would execute: $Command" -ForegroundColor Gray
        return $true
    } else {
        try {
            & $Command
            Write-Host "   ✅ Completed: $StepName" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "   ❌ Failed: $StepName - $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

# Pre-flight checks
Write-Host "🔍 Running pre-flight checks..." -ForegroundColor Cyan

$prerequisites = @(
    @{ Command = "aws"; Name = "AWS CLI" },
    @{ Command = "docker"; Name = "Docker" },
    @{ Command = "node"; Name = "Node.js" },
    @{ Command = "npm"; Name = "NPM" }
)

foreach ($prereq in $prerequisites) {
    if (Get-Command $prereq.Command -ErrorAction SilentlyContinue) {
        Write-Host "   ✅ $($prereq.Name) is available" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $($prereq.Name) is not available" -ForegroundColor Red
        exit 1
    }
}

# Check AWS credentials
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "   ✅ AWS credentials valid (Account: $($identity.Account))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ AWS credentials not configured" -ForegroundColor Red
    Write-Host "   Please run: aws configure" -ForegroundColor Yellow
    exit 1
}

if (-not $DryRun) {
    Write-Host ""
    Write-Host "⚠️  WARNING: This will deploy SyncSphere to AWS and may incur charges." -ForegroundColor Yellow
    Write-Host "   Estimated monthly cost: $50-200 USD depending on usage" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Continue with deployment? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Deployment cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Deployment steps
Write-Host ""
Write-Host "🚀 Starting deployment process..." -ForegroundColor Green

$steps = @(
    @{
        Name = "Install CDK dependencies"
        Command = { 
            Push-Location aws-cdk
            npm install
            Pop-Location
        }
    },
    @{
        Name = "Bootstrap CDK (if needed)"
        Command = { 
            Push-Location aws-cdk
            cdk bootstrap --region $Region
            Pop-Location
        }
    },
    @{
        Name = "Deploy AWS infrastructure"
        Command = { 
            Push-Location aws-cdk
            $env:ENVIRONMENT = $Environment
            $env:CDK_DEFAULT_REGION = $Region
            cdk deploy --require-approval never --region $Region
            Pop-Location
        }
    },
    @{
        Name = "Build and push Docker image"
        Command = { 
            .\deploy-aws.ps1 -SkipInfrastructure -Environment $Environment -Region $Region
        }
    },
    @{
        Name = "Set up database schema"
        Command = { 
            if ($SkipSampleData) {
                .\setup-aws-database.ps1 -Region $Region -SkipSampleData
            } else {
                .\setup-aws-database.ps1 -Region $Region
            }
        }
    }
)

$stepNumber = 1
$totalSteps = $steps.Count

foreach ($step in $steps) {
    Write-Host ""
    Write-Host "[$stepNumber/$totalSteps] $($step.Name)" -ForegroundColor Cyan
    
    if (-not (Invoke-DeploymentStep -StepName $step.Name -Command $step.Command -IsDryRun $DryRun)) {
        Write-Host ""
        Write-Host "❌ Deployment failed at step: $($step.Name)" -ForegroundColor Red
        exit 1
    }
    
    $stepNumber++
}

# Validation
if (-not $SkipValidation -and -not $DryRun) {
    Write-Host ""
    Write-Host "🔍 Running deployment validation..." -ForegroundColor Cyan
    
    try {
        .\validate-aws-deployment.ps1 -Region $Region
    } catch {
        Write-Host "⚠️  Validation encountered issues, but deployment may still be successful." -ForegroundColor Yellow
        Write-Host "   You can run validation manually later: .\validate-aws-deployment.ps1" -ForegroundColor Yellow
    }
}

# Success message
Write-Host ""
if ($DryRun) {
    Write-Host "🔍 Dry run completed successfully!" -ForegroundColor Green
    Write-Host "Run without -DryRun to perform actual deployment." -ForegroundColor Cyan
} else {
    Write-Host "🎉 SyncSphere deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Get deployment information
    try {
        $albEndpoint = aws ssm get-parameter --name "/syncsphere/alb-endpoint" --query "Parameter.Value" --output text --region $Region
        $cloudfrontDomain = aws ssm get-parameter --name "/syncsphere/cloudfront-domain" --query "Parameter.Value" --output text --region $Region
        
        Write-Host "🌐 Your SyncSphere application is now live!" -ForegroundColor Cyan
        Write-Host "   Application URL: http://$albEndpoint" -ForegroundColor Green
        if ($cloudfrontDomain) {
            Write-Host "   CloudFront URL: https://$cloudfrontDomain" -ForegroundColor Green
        }
        
        if (-not $SkipSampleData) {
            Write-Host ""
            Write-Host "👥 Sample users are available:" -ForegroundColor Cyan
            Write-Host "   Email: john.doe@example.com | Password: password123" -ForegroundColor Yellow
            Write-Host "   Email: jane.smith@example.com | Password: password123" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "📚 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Configure your custom domain and SSL certificate" -ForegroundColor White
        Write-Host "   2. Set up monitoring and alerts" -ForegroundColor White
        Write-Host "   3. Configure CI/CD pipeline" -ForegroundColor White
        Write-Host "   4. Review security settings" -ForegroundColor White
        
    } catch {
        Write-Host "⚠️  Deployment completed but couldn't retrieve endpoints." -ForegroundColor Yellow
        Write-Host "   Check AWS console for deployment details." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Cyan
Write-Host "   Validate deployment: .\validate-aws-deployment.ps1" -ForegroundColor White
Write-Host "   Update application: .\deploy-aws.ps1 -SkipInfrastructure" -ForegroundColor White
Write-Host "   View logs: aws logs tail /ecs/syncsphere --follow" -ForegroundColor White
Write-Host "   Destroy everything: cd aws-cdk && cdk destroy" -ForegroundColor White
