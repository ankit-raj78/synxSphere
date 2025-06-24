#!/bin/bash

# SyncSphere AWS Deployment Prerequisites Checker for macOS
# This script checks if all required tools are installed and configured

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║      SyncSphere Prerequisites Checker        ║"
    echo "║               macOS Version                   ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_check() {
    echo -e "${BLUE}Checking $1...${NC}"
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

print_install() {
    echo -e "${YELLOW}📦 Install with: $1${NC}"
}

check_homebrew() {
    print_check "Homebrew"
    if command -v brew &> /dev/null; then
        BREW_VERSION=$(brew --version | head -n1)
        print_success "Homebrew installed: $BREW_VERSION"
        return 0
    else
        print_error "Homebrew not installed"
        print_install '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        return 1
    fi
}

check_aws_cli() {
    print_check "AWS CLI"
    if command -v aws &> /dev/null; then
        AWS_VERSION=$(aws --version)
        print_success "AWS CLI installed: $AWS_VERSION"
        
        # Check if configured
        if aws sts get-caller-identity &> /dev/null; then
            ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
            REGION=$(aws configure get region)
            print_success "AWS configured - Account: $ACCOUNT_ID, Region: $REGION"
        else
            print_warning "AWS CLI installed but not configured"
            print_install "aws configure"
        fi
        return 0
    else
        print_error "AWS CLI not installed"
        print_install "brew install awscli"
        return 1
    fi
}

check_docker() {
    print_check "Docker"
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker installed: $DOCKER_VERSION"
        
        # Check if Docker is running
        if docker info &> /dev/null; then
            print_success "Docker daemon is running"
        else
            print_warning "Docker installed but daemon not running"
            print_install "Start Docker Desktop application"
        fi
        return 0
    else
        print_error "Docker not installed"
        print_install "brew install --cask docker"
        return 1
    fi
}

check_nodejs() {
    print_check "Node.js"
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        NPM_VERSION=$(npm --version)
        print_success "Node.js installed: $NODE_VERSION"
        print_success "npm installed: v$NPM_VERSION"
        
        # Check Node.js version (should be >= 18)
        NODE_MAJOR=$(node --version | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_success "Node.js version is compatible (>= 18)"
        else
            print_warning "Node.js version should be >= 18"
            print_install "brew upgrade node"
        fi
        return 0
    else
        print_error "Node.js not installed"
        print_install "brew install node"
        return 1
    fi
}

check_postgresql() {
    print_check "PostgreSQL Client"
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version)
        print_success "PostgreSQL client installed: $PSQL_VERSION"
        return 0
    else
        print_error "PostgreSQL client not installed"
        print_install "brew install postgresql"
        return 1
    fi
}

check_jq() {
    print_check "jq (JSON processor)"
    if command -v jq &> /dev/null; then
        JQ_VERSION=$(jq --version)
        print_success "jq installed: $JQ_VERSION"
        return 0
    else
        print_warning "jq not installed (recommended for script automation)"
        print_install "brew install jq"
        return 1
    fi
}

check_git() {
    print_check "Git"
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        print_success "Git installed: $GIT_VERSION"
        return 0
    else
        print_error "Git not installed"
        print_install "brew install git"
        return 1
    fi
}

check_project_files() {
    print_check "Project Files"
    
    REQUIRED_FILES=(
        "package.json"
        "Dockerfile.production"
        "audio-tables.sql"
        "deploy-aws.sh"
        "setup-aws-database.sh"
        "validate-aws-deployment.sh"
        "build-and-test.sh"
    )
    
    MISSING_FILES=()
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$file" ]; then
            print_success "Found: $file"
        else
            print_error "Missing: $file"
            MISSING_FILES+=("$file")
        fi
    done
    
    if [ ${#MISSING_FILES[@]} -eq 0 ]; then
        print_success "All required project files present"
        return 0
    else
        print_error "Missing ${#MISSING_FILES[@]} required files"
        return 1
    fi
}

check_script_permissions() {
    print_check "Script Permissions"
    
    SCRIPTS=(
        "deploy-aws.sh"
        "setup-aws-database.sh"
        "validate-aws-deployment.sh"
        "build-and-test.sh"
    )
    
    for script in "${SCRIPTS[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                print_success "$script is executable"
            else
                print_warning "$script is not executable"
                print_install "chmod +x $script"
            fi
        fi
    done
}

generate_summary() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                  SUMMARY                      ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    
    if [ $TOTAL_ERRORS -eq 0 ]; then
        print_success "All prerequisites are satisfied!"
        echo ""
        echo -e "${GREEN}You're ready to deploy to AWS! Run:${NC}"
        echo "  ./build-and-test.sh"
        echo "  ./deploy-aws.sh"
        echo "  ./setup-aws-database.sh"
        echo "  ./validate-aws-deployment.sh"
    else
        print_error "Found $TOTAL_ERRORS issues that need to be resolved"
        echo ""
        echo -e "${YELLOW}Please install missing tools and run this script again.${NC}"
    fi
    
    if [ $TOTAL_WARNINGS -gt 0 ]; then
        echo ""
        print_warning "Found $TOTAL_WARNINGS warnings (optional but recommended)"
    fi
}

main() {
    print_header
    
    TOTAL_ERRORS=0
    TOTAL_WARNINGS=0
    
    # Core requirements
    check_homebrew || ((TOTAL_ERRORS++))
    check_aws_cli || ((TOTAL_ERRORS++))
    check_docker || ((TOTAL_ERRORS++))
    check_nodejs || ((TOTAL_ERRORS++))
    check_postgresql || ((TOTAL_ERRORS++))
    
    # Optional but recommended
    check_jq || ((TOTAL_WARNINGS++))
    check_git || ((TOTAL_WARNINGS++))
    
    # Project files
    check_project_files || ((TOTAL_ERRORS++))
    check_script_permissions
    
    generate_summary
    
    exit $TOTAL_ERRORS
}

# Run main function
main "$@"
