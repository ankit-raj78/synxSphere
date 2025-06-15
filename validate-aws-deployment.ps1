# SyncSphere AWS Deployment Validation Script
# This script validates that the deployment is working correctly

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipLoadTests,
    
    [Parameter(Mandatory=$false)]
    [int]$TimeoutMinutes = 10
)

Write-Host "🔍 Validating SyncSphere AWS Deployment..." -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "Timeout: $TimeoutMinutes minutes" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$ValidationErrors = @()

# Function to add validation error
function Add-ValidationError {
    param([string]$Message)
    $ValidationErrors += $Message
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Function to add validation success
function Add-ValidationSuccess {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# Function to test HTTP endpoint
function Test-HttpEndpoint {
    param(
        [string]$Url,
        [string]$Description,
        [int]$ExpectedStatusCode = 200,
        [int]$TimeoutSeconds = 30
    )
    
    try {
        Write-Host "🔍 Testing $Description..." -ForegroundColor Yellow
        
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec $TimeoutSeconds -UseBasicParsing
        
        if ($response.StatusCode -eq $ExpectedStatusCode) {
            Add-ValidationSuccess "$Description is accessible (Status: $($response.StatusCode))"
            return $true
        } else {
            Add-ValidationError "$Description returned unexpected status code: $($response.StatusCode)"
            return $false
        }
    } catch {
        Add-ValidationError "$Description is not accessible: $($_.Exception.Message)"
        return $false
    }
}

# Function to get AWS resource status
function Get-AWSResourceStatus {
    param([string]$ResourceType, [string]$ResourceName)
    
    try {
        switch ($ResourceType) {
            "ECS" {
                $service = aws ecs describe-services --cluster syncsphere-cluster --services $ResourceName --region $Region --output json | ConvertFrom-Json
                return $service.services[0].status
            }
            "RDS" {
                $instance = aws rds describe-db-instances --db-instance-identifier $ResourceName --region $Region --output json | ConvertFrom-Json
                return $instance.DBInstances[0].DBInstanceStatus
            }
            "ALB" {
                $alb = aws elbv2 describe-load-balancers --names $ResourceName --region $Region --output json | ConvertFrom-Json
                return $alb.LoadBalancers[0].State.Code
            }
        }
    } catch {
        return "unknown"
    }
}

# Start validation
Write-Host "📋 Starting deployment validation..." -ForegroundColor Cyan

# 1. Check AWS CLI connectivity
Write-Host "🔍 Checking AWS CLI connectivity..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --region $Region --output json | ConvertFrom-Json
    Add-ValidationSuccess "AWS CLI connected as $($identity.Arn)"
} catch {
    Add-ValidationError "AWS CLI not configured or accessible: $($_.Exception.Message)"
    exit 1
}

# 2. Get deployment endpoints
Write-Host "🔍 Retrieving deployment endpoints..." -ForegroundColor Yellow
try {
    $albEndpoint = aws ssm get-parameter --name "/syncsphere/alb-endpoint" --query "Parameter.Value" --output text --region $Region
    $cloudfrontDomain = aws ssm get-parameter --name "/syncsphere/cloudfront-domain" --query "Parameter.Value" --output text --region $Region
    $ecrRepo = aws ssm get-parameter --name "/syncsphere/ecr-repository-uri" --query "Parameter.Value" --output text --region $Region
    
    Write-Host "🌐 ALB Endpoint: $albEndpoint" -ForegroundColor Cyan
    Write-Host "☁️ CloudFront Domain: $cloudfrontDomain" -ForegroundColor Cyan
    Write-Host "📦 ECR Repository: $ecrRepo" -ForegroundColor Cyan
} catch {
    Add-ValidationError "Failed to retrieve deployment endpoints: $($_.Exception.Message)"
    exit 1
}

# 3. Check AWS resources status
Write-Host "🔍 Checking AWS resources status..." -ForegroundColor Yellow

# ECS Service
$ecsStatus = Get-AWSResourceStatus "ECS" "SyncSphereService"
if ($ecsStatus -eq "ACTIVE") {
    Add-ValidationSuccess "ECS Service is active"
} else {
    Add-ValidationError "ECS Service status: $ecsStatus"
}

# RDS Instance
try {
    $rdsInstances = aws rds describe-db-instances --region $Region --output json | ConvertFrom-Json
    $syncSphereDB = $rdsInstances.DBInstances | Where-Object { $_.DBName -eq "syncsphere" -or $_.DBInstanceIdentifier -like "*syncsphere*" }
    
    if ($syncSphereDB -and $syncSphereDB.DBInstanceStatus -eq "available") {
        Add-ValidationSuccess "RDS PostgreSQL instance is available"
    } else {
        Add-ValidationError "RDS PostgreSQL instance not found or not available"
    }
} catch {
    Add-ValidationError "Failed to check RDS status: $($_.Exception.Message)"
}

# 4. Test application endpoints
Write-Host "🔍 Testing application endpoints..." -ForegroundColor Yellow

$appUrl = "http://$albEndpoint"
$cloudfrontUrl = "https://$cloudfrontDomain"

# Health check endpoint
Test-HttpEndpoint "$appUrl/api/health" "Application health check"

# Main application
Test-HttpEndpoint "$appUrl" "Main application page"

# CloudFront (if different from ALB)
if ($cloudfrontDomain -and $cloudfrontDomain -ne $albEndpoint) {
    Test-HttpEndpoint "$cloudfrontUrl" "CloudFront distribution"
}

# 5. Test API endpoints
Write-Host "🔍 Testing API endpoints..." -ForegroundColor Yellow

$apiEndpoints = @(
    @{ Path = "/api/auth/status"; Description = "Authentication status API" },
    @{ Path = "/api/rooms"; Description = "Rooms API" },
    @{ Path = "/api/users"; Description = "Users API" }
)

foreach ($endpoint in $apiEndpoints) {
    Test-HttpEndpoint "$appUrl$($endpoint.Path)" $endpoint.Description
}

# 6. Test database connectivity
Write-Host "🔍 Testing database connectivity..." -ForegroundColor Yellow
try {
    # This would require the application to have a database test endpoint
    $dbTestResponse = Test-HttpEndpoint "$appUrl/api/health" "Database connectivity (via health check)"
} catch {
    Add-ValidationError "Database connectivity test failed"
}

# 7. Check ECS task health
Write-Host "🔍 Checking ECS task health..." -ForegroundColor Yellow
try {
    $tasks = aws ecs list-tasks --cluster syncsphere-cluster --service-name SyncSphereService --region $Region --output json | ConvertFrom-Json
    
    if ($tasks.taskArns.Count -gt 0) {
        $taskDetails = aws ecs describe-tasks --cluster syncsphere-cluster --tasks $tasks.taskArns[0] --region $Region --output json | ConvertFrom-Json
        $task = $taskDetails.tasks[0]
        
        if ($task.lastStatus -eq "RUNNING" -and $task.healthStatus -eq "HEALTHY") {
            Add-ValidationSuccess "ECS tasks are running and healthy"
        } else {
            Add-ValidationError "ECS tasks status: $($task.lastStatus), health: $($task.healthStatus)"
        }
    } else {
        Add-ValidationError "No ECS tasks found"
    }
} catch {
    Add-ValidationError "Failed to check ECS task health: $($_.Exception.Message)"
}

# 8. Check CloudWatch logs
Write-Host "🔍 Checking CloudWatch logs..." -ForegroundColor Yellow
try {
    $logStreams = aws logs describe-log-streams --log-group-name "/ecs/syncsphere" --order-by LastEventTime --descending --max-items 1 --region $Region --output json | ConvertFrom-Json
    
    if ($logStreams.logStreams.Count -gt 0) {
        $latestStream = $logStreams.logStreams[0]
        $timeDiff = [DateTime]::UtcNow - [DateTime]::new(1970, 1, 1).AddMilliseconds($latestStream.lastEventTime)
        
        if ($timeDiff.TotalMinutes -lt 5) {
            Add-ValidationSuccess "Recent application logs found (last event: $($timeDiff.TotalMinutes.ToString('F1')) minutes ago)"
        } else {
            Add-ValidationError "No recent application logs found (last event: $($timeDiff.TotalMinutes.ToString('F1')) minutes ago)"
        }
    } else {
        Add-ValidationError "No log streams found"
    }
} catch {
    Add-ValidationError "Failed to check CloudWatch logs: $($_.Exception.Message)"
}

# 9. Load testing (optional)
if (-not $SkipLoadTests) {
    Write-Host "🔍 Running basic load tests..." -ForegroundColor Yellow
    
    $loadTestResults = @()
    $concurrentRequests = 10
    $requestsPerThread = 5
    
    Write-Host "Running $concurrentRequests concurrent threads with $requestsPerThread requests each..." -ForegroundColor Cyan
    
    $jobs = @()
    for ($i = 1; $i -le $concurrentRequests; $i++) {
        $jobs += Start-Job -ScriptBlock {
            param($url, $requests)
            $results = @()
            for ($j = 1; $j -le $requests; $j++) {
                try {
                    $start = Get-Date
                    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing
                    $end = Get-Date
                    $results += @{
                        StatusCode = $response.StatusCode
                        ResponseTime = ($end - $start).TotalMilliseconds
                        Success = $true
                    }
                } catch {
                    $results += @{
                        StatusCode = 0
                        ResponseTime = 0
                        Success = $false
                        Error = $_.Exception.Message
                    }
                }
            }
            return $results
        } -ArgumentList $appUrl, $requestsPerThread
    }
    
    # Wait for all jobs to complete
    $jobs | Wait-Job | Out-Null
    
    # Collect results
    $allResults = @()
    foreach ($job in $jobs) {
        $jobResults = Receive-Job $job
        $allResults += $jobResults
        Remove-Job $job
    }
    
    # Analyze results
    $successfulRequests = ($allResults | Where-Object { $_.Success }).Count
    $totalRequests = $allResults.Count
    $averageResponseTime = ($allResults | Where-Object { $_.Success } | Measure-Object -Property ResponseTime -Average).Average
    
    if ($successfulRequests -eq $totalRequests) {
        Add-ValidationSuccess "Load test passed: $successfulRequests/$totalRequests requests successful (avg: $($averageResponseTime.ToString('F1'))ms)"
    } else {
        Add-ValidationError "Load test issues: only $successfulRequests/$totalRequests requests successful"
    }
}

# 10. Security checks
Write-Host "🔍 Running security checks..." -ForegroundColor Yellow

# Check for HTTPS redirect (if CloudFront is configured)
if ($cloudfrontDomain) {
    try {
        $httpResponse = Invoke-WebRequest -Uri "http://$cloudfrontDomain" -Method GET -TimeoutSec 10 -UseBasicParsing -MaximumRedirection 0
        if ($httpResponse.StatusCode -eq 301 -or $httpResponse.StatusCode -eq 302) {
            Add-ValidationSuccess "HTTP to HTTPS redirect is working"
        }
    } catch {
        # This is expected for HTTPS redirects
        if ($_.Exception.Message -contains "301" -or $_.Exception.Message -contains "302") {
            Add-ValidationSuccess "HTTP to HTTPS redirect is working"
        }
    }
}

# Check security headers
try {
    $response = Invoke-WebRequest -Uri $appUrl -Method GET -TimeoutSec 10 -UseBasicParsing
    $headers = $response.Headers
    
    $securityHeaders = @(
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy"
    )
    
    foreach ($header in $securityHeaders) {
        if ($headers.ContainsKey($header)) {
            Add-ValidationSuccess "Security header '$header' is present"
        } else {
            Add-ValidationError "Security header '$header' is missing"
        }
    }
} catch {
    Add-ValidationError "Failed to check security headers: $($_.Exception.Message)"
}

# Summary
Write-Host ""
Write-Host "📊 Validation Summary" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

if ($ValidationErrors.Count -eq 0) {
    Write-Host "🎉 All validation checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Deployment Information:" -ForegroundColor Cyan
    Write-Host "🌐 Application URL: $appUrl" -ForegroundColor Green
    if ($cloudfrontDomain) {
        Write-Host "☁️ CloudFront URL: $cloudfrontUrl" -ForegroundColor Green
    }
    Write-Host "📦 ECR Repository: $ecrRepo" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your SyncSphere deployment is ready for use! 🚀" -ForegroundColor Green
} else {
    Write-Host "❌ Validation completed with $($ValidationErrors.Count) error(s):" -ForegroundColor Red
    Write-Host ""
    foreach ($error in $ValidationErrors) {
        Write-Host "  • $error" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please review the errors above and check your deployment." -ForegroundColor Yellow
    exit 1
}
