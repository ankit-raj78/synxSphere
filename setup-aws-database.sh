#!/bin/bash

# SyncSphere AWS Database Setup Script for macOS
# This script sets up RDS PostgreSQL and imports sample data

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REGION="us-east-1"
DB_INSTANCE_IDENTIFIER="syncsphere-db"
DB_NAME="syncsphere"
DB_USERNAME="syncsphere_admin"
DB_PASSWORD=""
SKIP_SAMPLE_DATA=false
ENGINE_VERSION="15.13"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --skip-sample-data)
            SKIP_SAMPLE_DATA=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --region REGION       AWS region (default: us-east-1)"
            echo "  --db-password PASS    Database password (will prompt if not provided)"
            echo "  --skip-sample-data    Skip importing sample data"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

print_step() {
    echo -e "${BLUE}==== $1 ====${NC}"
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

check_prerequisites() {
    print_step "Checking Prerequisites"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first:"
        echo "brew install awscli"
        exit 1
    fi
    
    # Check if psql is installed
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) is not installed. Please install it first:"
        echo "brew install postgresql"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    print_success "All prerequisites check passed"
}

generate_password() {
    if [ -z "$DB_PASSWORD" ]; then
        echo -n "Enter database password (or press Enter to generate one): "
        read -s DB_PASSWORD
        echo
        
        if [ -z "$DB_PASSWORD" ]; then
            DB_PASSWORD=$(openssl rand -base64 20 | tr -d "=+/" | cut -c1-16)
            print_success "Generated password: $DB_PASSWORD"
            echo "Please save this password securely!"
        fi
    fi
}

create_db_subnet_group() {
    print_step "Creating DB Subnet Group"
    
    # Get default VPC
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $REGION --query 'Vpcs[0].VpcId' --output text)
    
    if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
        print_error "No default VPC found. Please create a VPC first."
        exit 1
    fi
    
    # Get subnets from default VPC
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --region $REGION --query 'Subnets[].SubnetId' --output text)
    
    if [ -z "$SUBNET_IDS" ]; then
        print_error "No subnets found in default VPC."
        exit 1
    fi
    
    # Convert space-separated list to array
    SUBNET_ARRAY=($SUBNET_IDS)
    
    # Check if subnet group already exists
    aws rds describe-db-subnet-groups --db-subnet-group-name "$DB_INSTANCE_IDENTIFIER-subnet-group" --region $REGION &> /dev/null || {
        print_step "Creating DB subnet group"
        aws rds create-db-subnet-group \
            --db-subnet-group-name "$DB_INSTANCE_IDENTIFIER-subnet-group" \
            --db-subnet-group-description "Subnet group for SyncSphere database" \
            --subnet-ids ${SUBNET_ARRAY[@]} \
            --region $REGION
        print_success "DB subnet group created"
    }
}

create_security_group() {
    print_step "Creating Security Group for RDS"
    
    # Get default VPC
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $REGION --query 'Vpcs[0].VpcId' --output text)
    
    # Check if security group already exists
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$DB_INSTANCE_IDENTIFIER-sg" "Name=vpc-id,Values=$VPC_ID" --region $REGION --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    
    if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
        print_step "Creating security group for database"
        SG_ID=$(aws ec2 create-security-group \
            --group-name "$DB_INSTANCE_IDENTIFIER-sg" \
            --description "Security group for SyncSphere RDS database" \
            --vpc-id $VPC_ID \
            --region $REGION \
            --query 'GroupId' --output text)
        
        # Add inbound rule for PostgreSQL
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 5432 \
            --cidr 0.0.0.0/0 \
            --region $REGION
        
        print_success "Security group created: $SG_ID"
    else
        print_success "Using existing security group: $SG_ID"
    fi
    
    echo $SG_ID
}

create_rds_instance() {
    print_step "Creating RDS PostgreSQL Instance"
    
    # Check if RDS instance already exists
    aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_IDENTIFIER --region $REGION &> /dev/null && {
        print_warning "RDS instance already exists: $DB_INSTANCE_IDENTIFIER"
        return
    }
    
    # Create security group
    SG_ID=$(create_security_group)
    
    print_step "Creating RDS instance (this may take 10-15 minutes)"
    aws rds create-db-instance \
        --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version $ENGINE_VERSION \
        --master-username $DB_USERNAME \
        --master-user-password $DB_PASSWORD \
        --allocated-storage 20 \
        --storage-type gp2 \
        --db-name $DB_NAME \
        --vpc-security-group-ids $SG_ID \
        --db-subnet-group-name "$DB_INSTANCE_IDENTIFIER-subnet-group" \
        --publicly-accessible \
        --backup-retention-period 7 \
        --region $REGION
    
    print_step "Waiting for RDS instance to be available..."
    aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_IDENTIFIER --region $REGION
    
    print_success "RDS instance created successfully"
}

get_db_endpoint() {
    DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_IDENTIFIER --region $REGION --query 'DBInstances[0].Endpoint.Address' --output text)
    echo $DB_ENDPOINT
}

setup_database_schema() {
    if [ "$SKIP_SAMPLE_DATA" = true ]; then
        print_warning "Skipping database schema setup"
        return
    fi
    
    print_step "Setting up Database Schema"
    
    DB_ENDPOINT=$(get_db_endpoint)
    
    if [ -z "$DB_ENDPOINT" ] || [ "$DB_ENDPOINT" = "None" ]; then
        print_error "Could not get database endpoint"
        exit 1
    fi
    
    # Check if schema files exist
    if [ -f "audio-tables.sql" ]; then
        print_step "Importing database schema"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U $DB_USERNAME -d $DB_NAME -f audio-tables.sql
        print_success "Database schema imported"
    else
        print_warning "audio-tables.sql not found, skipping schema import"
    fi
    
    # Import sample data if available
    if [ -f "demo_data_fixed.sql" ]; then
        print_step "Importing sample data"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U $DB_USERNAME -d $DB_NAME -f demo_data_fixed.sql
        print_success "Sample data imported"
    else
        print_warning "demo_data_fixed.sql not found, skipping sample data import"
    fi
}

store_credentials_in_secrets_manager() {
    print_step "Storing Database Credentials in AWS Secrets Manager"
    
    DB_ENDPOINT=$(get_db_endpoint)
    
    SECRET_VALUE=$(cat << EOF
{
    "engine": "postgres",
    "host": "$DB_ENDPOINT",
    "port": 5432,
    "dbname": "$DB_NAME",
    "username": "$DB_USERNAME",
    "password": "$DB_PASSWORD"
}
EOF
)
    
    # Check if secret already exists
    aws secretsmanager describe-secret --secret-id "syncsphere/database" --region $REGION &> /dev/null || {
        print_step "Creating secret in Secrets Manager"
        aws secretsmanager create-secret \
            --name "syncsphere/database" \
            --description "SyncSphere database credentials" \
            --secret-string "$SECRET_VALUE" \
            --region $REGION
        print_success "Database credentials stored in Secrets Manager"
    }
}

display_connection_info() {
    print_step "Database Connection Information"
    
    DB_ENDPOINT=$(get_db_endpoint)
    
    echo -e "${BLUE}Database Endpoint:${NC} $DB_ENDPOINT"
    echo -e "${BLUE}Database Name:${NC} $DB_NAME"
    echo -e "${BLUE}Username:${NC} $DB_USERNAME"
    echo -e "${BLUE}Password:${NC} $DB_PASSWORD"
    echo -e "${BLUE}Port:${NC} 5432"
    echo ""
    echo -e "${YELLOW}Connection string:${NC}"
    echo "postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:5432/$DB_NAME"
    echo ""
    echo -e "${YELLOW}To connect manually:${NC}"
    echo "psql -h $DB_ENDPOINT -U $DB_USERNAME -d $DB_NAME"
}

main() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║      SyncSphere AWS Database Setup Script    ║"
    echo "║                 macOS Version                 ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_prerequisites
    generate_password
    create_db_subnet_group
    create_rds_instance
    setup_database_schema
    store_credentials_in_secrets_manager
    display_connection_info
    
    print_success "Database setup completed successfully!"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Update your application environment variables"
    echo "2. Test the database connection"
    echo "3. Configure your ECS service to use the database"
}

# Run main function
main "$@"
