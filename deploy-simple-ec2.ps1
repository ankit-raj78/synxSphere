# Simple EC2 Deployment Script for SyncSphere
# Minimal cost deployment with just EC2, RDS, and S3

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPairName = "syncsphere-keypair",
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateKeyPair,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host @"
🚀 SyncSphere Simple EC2 Deployment
===================================

Region: $Region
Key Pair: $KeyPairName
Create Key Pair: $CreateKeyPair
Dry Run: $DryRun

Estimated Monthly Cost: ~$15-25 USD
- EC2 t3.micro: ~$8-10
- RDS t3.micro: ~$15
- S3 storage: ~$1-3

"@ -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No actual changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Function to run command with dry run support
function Invoke-Command-Safe {
    param(
        [string]$Description,
        [scriptblock]$Command
    )
    
    Write-Host "📋 $Description..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "   [DRY RUN] Would execute: $Command" -ForegroundColor Gray
        return $true
    } else {
        try {
            & $Command
            Write-Host "   ✅ $Description completed" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "   ❌ $Description failed: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

$prerequisites = @(
    @{ Command = "aws"; Name = "AWS CLI" },
    @{ Command = "cdk"; Name = "AWS CDK" },
    @{ Command = "node"; Name = "Node.js" }
)

foreach ($prereq in $prerequisites) {
    if (Get-Command $prereq.Command -ErrorAction SilentlyContinue) {
        Write-Host "   ✅ $($prereq.Name) is available" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $($prereq.Name) is not available" -ForegroundColor Red
        if ($prereq.Command -eq "cdk") {
            Write-Host "   Install with: npm install -g aws-cdk" -ForegroundColor Yellow
        }
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

# Create key pair if requested
if ($CreateKeyPair -and -not $DryRun) {
    Write-Host "🔐 Creating EC2 Key Pair..." -ForegroundColor Cyan
    
    try {
        # Check if key pair already exists
        $existingKey = aws ec2 describe-key-pairs --key-names $KeyPairName --region $Region 2>$null
        if ($existingKey) {
            Write-Host "   ⚠️  Key pair '$KeyPairName' already exists" -ForegroundColor Yellow
        } else {
            # Create new key pair
            $keyMaterial = aws ec2 create-key-pair --key-name $KeyPairName --region $Region --query 'KeyMaterial' --output text
            
            # Save to file
            $keyMaterial | Out-File -FilePath "$KeyPairName.pem" -Encoding ASCII
            
            # Set permissions (Windows)
            icacls "$KeyPairName.pem" /inheritance:r /grant:r "$env:USERNAME:R"
            
            Write-Host "   ✅ Key pair created and saved to $KeyPairName.pem" -ForegroundColor Green
            Write-Host "   🔒 Keep this file secure - you'll need it to SSH into your instance" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Failed to create key pair: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} elseif (-not $DryRun) {
    # Check if key pair exists
    try {
        $existingKey = aws ec2 describe-key-pairs --key-names $KeyPairName --region $Region 2>$null
        if (-not $existingKey) {
            Write-Host "   ❌ Key pair '$KeyPairName' does not exist" -ForegroundColor Red
            Write-Host "   Run with -CreateKeyPair to create it automatically" -ForegroundColor Yellow
            exit 1
        } else {
            Write-Host "   ✅ Key pair '$KeyPairName' exists" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Failed to check key pair: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Run with -CreateKeyPair to create it automatically" -ForegroundColor Yellow
        exit 1
    }
}

if (-not $DryRun) {
    Write-Host ""
    Write-Host "⚠️  WARNING: This will deploy SyncSphere to AWS EC2." -ForegroundColor Yellow
    Write-Host "   Estimated monthly cost: $15-25 USD" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Continue with deployment? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Deployment cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Deployment steps
Write-Host ""
Write-Host "🚀 Starting deployment..." -ForegroundColor Green

$success = $true

# Step 1: Install CDK dependencies
$success = $success -and (Invoke-Command-Safe "Installing CDK dependencies" {
    Push-Location aws-cdk-simple
    npm install
    Pop-Location
})

# Step 2: Bootstrap CDK
$success = $success -and (Invoke-Command-Safe "Bootstrapping CDK" {
    Push-Location aws-cdk-simple
    cdk bootstrap --region $Region
    Pop-Location
})

# Step 3: Deploy infrastructure
$success = $success -and (Invoke-Command-Safe "Deploying AWS infrastructure" {
    Push-Location aws-cdk-simple
    $env:CDK_DEFAULT_REGION = $Region
    cdk deploy --require-approval never --region $Region --parameters KeyPairName=$KeyPairName
    Pop-Location
})

if (-not $success) {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

if (-not $DryRun) {
    # Get deployment outputs
    Write-Host ""
    Write-Host "📋 Getting deployment information..." -ForegroundColor Cyan
    
    try {
        $outputs = aws cloudformation describe-stacks --stack-name SyncSphereSimpleStack --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
        
        $publicIP = ($outputs | Where-Object { $_.OutputKey -eq "InstancePublicIP" }).OutputValue
        $appURL = ($outputs | Where-Object { $_.OutputKey -eq "ApplicationURL" }).OutputValue
        $sshCommand = ($outputs | Where-Object { $_.OutputKey -eq "SSHCommand" }).OutputValue
        $dbEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "DatabaseEndpoint" }).OutputValue
        $s3Bucket = ($outputs | Where-Object { $_.OutputKey -eq "S3BucketName" }).OutputValue
        
        Write-Host ""
        Write-Host "🎉 SyncSphere deployment completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Deployment Information:" -ForegroundColor Cyan
        Write-Host "   🌐 Public IP: $publicIP" -ForegroundColor Green
        Write-Host "   🚀 Application URL: $appURL" -ForegroundColor Green
        Write-Host "   🔐 SSH Command: $sshCommand" -ForegroundColor Yellow
        Write-Host "   🗄️  Database: $dbEndpoint" -ForegroundColor Green
        Write-Host "   📦 S3 Bucket: $s3Bucket" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "📚 Next Steps:" -ForegroundColor Cyan
        Write-Host "   1. Wait 5-10 minutes for the instance to fully initialize" -ForegroundColor White
        Write-Host "   2. SSH into the instance to check the application status:" -ForegroundColor White
        Write-Host "      $sshCommand" -ForegroundColor Gray
        Write-Host "   3. Check service status: sudo systemctl status syncsphere" -ForegroundColor White
        Write-Host "   4. View logs: sudo journalctl -u syncsphere -f" -ForegroundColor White
        Write-Host "   5. Set up the database with sample data (see setup instructions)" -ForegroundColor White
        
        Write-Host ""
        Write-Host "💡 Cost Optimization Tips:" -ForegroundColor Cyan
        Write-Host "   • Stop the instance when not in use: aws ec2 stop-instances --instance-ids <instance-id>" -ForegroundColor White
        Write-Host "   • Start it again: aws ec2 start-instances --instance-ids <instance-id>" -ForegroundColor White
        Write-Host "   • Monitor costs in AWS Billing Dashboard" -ForegroundColor White
        
    } catch {
        Write-Host "⚠️  Deployment completed but couldn't retrieve all information." -ForegroundColor Yellow
        Write-Host "   Check AWS CloudFormation console for stack outputs." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "🔍 Dry run completed successfully!" -ForegroundColor Green
    Write-Host "Run without -DryRun to perform actual deployment." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🛠️  Useful Commands:" -ForegroundColor Cyan
Write-Host "   View stack: aws cloudformation describe-stacks --stack-name SyncSphereSimpleStack" -ForegroundColor White
Write-Host "   Update app: cd aws-cdk-simple && cdk deploy" -ForegroundColor White
Write-Host "   Destroy everything: cd aws-cdk-simple && cdk destroy" -ForegroundColor White
Write-Host "   Check EC2 status: aws ec2 describe-instances --filters Name=tag:aws:cloudformation:stack-name,Values=SyncSphereSimpleStack" -ForegroundColor White
