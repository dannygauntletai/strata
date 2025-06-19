#!/bin/bash

# 🚀 TSA Unified Deployment Script
# Single source of truth for all TSA deployments across all environments

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
DEFAULT_STAGE="dev"
DEFAULT_REGION="us-east-2"

# Deployment configuration
FORCE_DEPLOYMENT=false
SKIP_VALIDATION=false
SKIP_SYNC=false
DRY_RUN=false

# Stack deployment order
INFRASTRUCTURE_STACKS=(
    "tsa-infra-networking"
    "tsa-infra-security" 
    "tsa-infra-data"
    "tsa-infra-auth"
)

APPLICATION_STACKS=(
    "tsa-admin-backend"    # Must deploy first - creates shared tables
    "tsa-coach-backend"    # Depends on admin tables
    "tsa-parent-backend"   # Depends on admin tables
)

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${BLUE}🔹 $1${NC}"
}

# Error handling
handle_error() {
    local line_no=$1
    local error_code=$2
    print_error "Deployment failed at line $line_no with exit code $error_code"
    exit $error_code
}

trap 'handle_error ${LINENO} $?' ERR

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

validate_prerequisites() {
    print_step "Validating prerequisites..."
    
    # Check if we're in the correct directory
    if [[ ! -f "package.json" ]] || [[ ! -d "tsa-infrastructure" ]]; then
        print_error "Must run from the root of the TSA repository"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Install with: brew install awscli"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run 'aws configure' first"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required. Install with: brew install python"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required. Install with: brew install node"
        exit 1
    fi
    
    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        print_error "jq is required for database operations. Install with: brew install jq"
        exit 1
    fi
    
    print_status "Prerequisites validated"
}

validate_environment() {
    local stage=$1
    
    print_step "Validating environment: $stage"
    
    # Validate stage
    if [[ ! "$stage" =~ ^(dev|staging|prod)$ ]]; then
        print_error "Invalid stage: $stage. Must be dev, staging, or prod"
        exit 1
    fi
    
    # Production safety check
    if [[ "$stage" == "prod" ]]; then
        print_warning "🚨 PRODUCTION DEPLOYMENT DETECTED 🚨"
        echo ""
        read -p "Are you absolutely sure? Type 'DEPLOY-PROD' to continue: " confirm
        if [[ "$confirm" != "DEPLOY-PROD" ]]; then
            print_warning "Production deployment cancelled"
            exit 0
        fi
    fi
    
    print_status "Environment validation passed"
}

# =============================================================================
# TABLE VALIDATION FUNCTIONS (from validate-tables.sh)
# =============================================================================

check_table_exists() {
    local table_name=$1
    local category=$2
    
    if aws dynamodb describe-table --table-name "$table_name" --region "$DEFAULT_REGION" >/dev/null 2>&1; then
        echo "✅ $category: $table_name"
        return 0
    else
        echo "❌ $category: $table_name (MISSING)"
        return 1
    fi
}

validate_table_gsi() {
    local table_name=$1
    local expected_gsi=$2
    
    local gsi_count=$(aws dynamodb describe-table --table-name "$table_name" --region "$DEFAULT_REGION" --query 'Table.GlobalSecondaryIndexes | length(@)' --output text 2>/dev/null || echo "0")
    
    if [ "$gsi_count" -ge "$expected_gsi" ]; then
        echo "  📊 GSI: $gsi_count indexes (expected: $expected_gsi)"
    else
        echo "  ⚠️  GSI: $gsi_count indexes (expected: $expected_gsi)"
    fi
}

validate_dynamodb_tables() {
    local stage=$1
    
    if [[ "$SKIP_VALIDATION" == "true" ]]; then
        print_warning "Skipping table validation"
        return 0
    fi
    
    print_header "VALIDATING DYNAMODB TABLES"
    
    # Expected tables from data stack (12 tables)
    local DATA_STACK_TABLES=(
        "users-$stage"
        "profiles-$stage"
        "organizations-$stage"
        "coach-invitations-$stage"
        "parent-invitations-$stage"
        "event-invitations-$stage"
        "enrollments-$stage"
        "events-$stage"
        "event-registrations-$stage"
        "documents-$stage"
        "scheduling-$stage"
        "analytics-events-$stage"
        "sessions-$stage"
    )
    
    # Expected tables from admin service (1 table)
    local ADMIN_STACK_TABLES=(
        "admin-audit-logs-$stage"
    )
    
    # Expected tables from coach service (5 tables)
    local COACH_STACK_TABLES=(
        "coach-onboarding-sessions-$stage"
        "background-checks-$stage"
        "legal-requirements-$stage"
        "eventbrite-config-$stage"
        "event-attendees-$stage"
    )
    
    print_step "🏗️ Validating Data Stack Tables (12 expected)"
    local data_missing=0
    for table in "${DATA_STACK_TABLES[@]}"; do
        if ! check_table_exists "$table" "Data Stack"; then
            ((data_missing++))
        else
            # Validate specific GSIs for key tables
            case $table in
                "coach-invitations-$stage")
                    validate_table_gsi "$table" 2
                    ;;
                "parent-invitations-$stage")
                    validate_table_gsi "$table" 1
                    ;;
                "event-invitations-$stage")
                    validate_table_gsi "$table" 1
                    ;;
                "enrollments-$stage")
                    validate_table_gsi "$table" 1
                    ;;
                "events-$stage")
                    validate_table_gsi "$table" 1
                    ;;
                "scheduling-$stage")
                    validate_table_gsi "$table" 2
                    ;;
            esac
        fi
    done
    
    print_step "🔧 Validating Admin Stack Tables (1 expected)"
    local admin_missing=0
    for table in "${ADMIN_STACK_TABLES[@]}"; do
        if ! check_table_exists "$table" "Admin Stack"; then
            ((admin_missing++))
        else
            validate_table_gsi "$table" 1
        fi
    done
    
    print_step "👨‍🏫 Validating Coach Stack Tables (5 expected)"
    local coach_missing=0
    for table in "${COACH_STACK_TABLES[@]}"; do
        if ! check_table_exists "$table" "Coach Stack"; then
            ((coach_missing++))
        else
            # Validate specific GSIs for key tables
            case $table in
                "background-checks-$stage")
                    validate_table_gsi "$table" 1
                    ;;
                "event-attendees-$stage")
                    validate_table_gsi "$table" 1
                    ;;
            esac
        fi
    done
    
    # Summary
    local total_expected=18
    local total_missing=$((data_missing + admin_missing + coach_missing))
    local total_found=$((total_expected - total_missing))
    
    echo ""
    print_step "📊 Table Validation Summary"
    print_info "📈 Tables Found: $total_found/$total_expected"
    print_info "📉 Tables Missing: $total_missing/$total_expected"
    
    if [ "$data_missing" -gt 0 ]; then
        print_warning "❌ Data Stack: $data_missing missing tables"
    fi
    
    if [ "$admin_missing" -gt 0 ]; then
        print_warning "❌ Admin Stack: $admin_missing missing tables"
    fi
    
    if [ "$coach_missing" -gt 0 ]; then
        print_warning "❌ Coach Stack: $coach_missing missing tables"
    fi
    
    if [ "$total_missing" -eq 0 ]; then
        print_status "🎉 All expected tables found!"
        print_status "✅ Table architecture is correctly deployed"
        return 0
    else
        print_warning "⚠️  WARNING: $total_missing tables are missing"
        print_info "💡 This may be normal during initial deployment"
        return 1
    fi
}

# =============================================================================
# INSTALLATION FUNCTIONS
# =============================================================================

install_dependencies() {
    print_step "Installing dependencies..."
    
    # Install CDK globally if not present
    if ! command -v cdk &> /dev/null; then
        print_step "Installing AWS CDK..."
        npm install -g aws-cdk
        print_status "CDK installed"
    else
        print_status "CDK already installed"
    fi
    
    # Install Python dependencies for infrastructure using virtual environment
    print_step "Installing Python dependencies..."
    cd tsa-infrastructure
    
    if [[ -f "requirements.txt" ]]; then
        # Create virtual environment if it doesn't exist
        if [[ ! -d ".venv" ]]; then
            print_step "Creating Python virtual environment..."
            python3 -m venv .venv
        fi
        
        # Activate virtual environment and install dependencies
        print_step "Activating virtual environment and installing dependencies..."
        source .venv/bin/activate
        pip install -r requirements.txt --quiet
        print_status "Python dependencies installed in virtual environment"
    fi
    
    cd ..
    
    # Install Node.js dependencies
    if [[ -f "package.json" ]]; then
        print_step "Installing Node.js dependencies..."
        npm install --silent
        print_status "Node.js dependencies installed"
    fi
}

bootstrap_cdk() {
    local stage=$1
    local region=$2
    
    print_step "Bootstrapping CDK for $stage environment..."
    
    cd tsa-infrastructure
    
    # Activate virtual environment
    if [[ -d ".venv" ]]; then
        source .venv/bin/activate
    fi
    
    print_step "Running CDK bootstrap to ensure environment is up-to-date..."
    cdk bootstrap --context stage="$stage" --region "$region"
    print_status "CDK bootstrap process complete."
    
    cd ..
}

# =============================================================================
# DEPLOYMENT FUNCTIONS
# =============================================================================

deploy_infrastructure() {
    local stage=$1
    
    print_header "DEPLOYING INFRASTRUCTURE LAYER"
    
    cd tsa-infrastructure
    
    # Activate virtual environment
    if [[ -d ".venv" ]]; then
        source .venv/bin/activate
    fi
    
    for stack_base in "${INFRASTRUCTURE_STACKS[@]}"; do
        local stack_name="${stack_base}-${stage}"
        print_step "Deploying $stack_name..."
        
        local deploy_cmd="cdk deploy $stack_name --context stage=$stage --require-approval never"
        
        if [[ "$FORCE_DEPLOYMENT" == "true" ]]; then
            deploy_cmd="$deploy_cmd --force"
        fi
        
        if [[ "$DRY_RUN" == "true" ]]; then
            print_info "DRY RUN: Would execute: $deploy_cmd"
        else
            if eval "$deploy_cmd"; then
                print_status "$stack_name deployed successfully"
            else
                print_error "$stack_name deployment failed"
                cd ..
                exit 1
            fi
        fi
    done
    
    cd ..
    print_status "Infrastructure layer deployed successfully"
}

deploy_applications() {
    local stage=$1
    
    print_header "DEPLOYING APPLICATION LAYER"
    
    cd tsa-infrastructure
    
    # Activate virtual environment
    if [[ -d ".venv" ]]; then
        source .venv/bin/activate
    fi
    
    for stack_base in "${APPLICATION_STACKS[@]}"; do
        local stack_name="${stack_base}-${stage}"
        print_step "Deploying $stack_name..."
        
        local deploy_cmd="cdk deploy $stack_name --context stage=$stage --require-approval never"
        
        if [[ "$FORCE_DEPLOYMENT" == "true" ]]; then
            deploy_cmd="$deploy_cmd --force"
        fi
        
        if [[ "$DRY_RUN" == "true" ]]; then
            print_info "DRY RUN: Would execute: $deploy_cmd"
        else
            if eval "$deploy_cmd"; then
                print_status "$stack_name deployed successfully"
            else
                print_error "$stack_name deployment failed"
                cd ..
                exit 1
            fi
        fi
    done
    
    cd ..
    print_status "Application layer deployed successfully"
}

deploy_single_stack() {
    local stage=$1
    local stack_name=$2
    
    print_header "DEPLOYING SINGLE STACK: $stack_name"
    
    cd tsa-infrastructure
    
    # Activate virtual environment
    if [[ -d ".venv" ]]; then
        source .venv/bin/activate
    fi
    
    local deploy_cmd="cdk deploy $stack_name --context stage=$stage --require-approval never"
    
    if [[ "$FORCE_DEPLOYMENT" == "true" ]]; then
        deploy_cmd="$deploy_cmd --force"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "DRY RUN: Would execute: $deploy_cmd"
    else
        if eval "$deploy_cmd"; then
            print_status "$stack_name deployed successfully"
        else
            print_error "$stack_name deployment failed"
            cd ..
            exit 1
        fi
    fi
    
    cd ..
}

# =============================================================================
# SSM PARAMETER MANAGEMENT FUNCTIONS (from manage-ssm-parameters.sh)
# =============================================================================

# All SSM parameters managed externally
SSM_PARAM_NAMES=(
    "/tsa/\$stage/api-urls/auth"
    "/tsa/\$stage/api-urls/admin"
    "/tsa/\$stage/api-urls/coach"
    "/tsa/\$stage/api-urls/parent"
    "/tsa-shared/\$stage/table-names/users"
    "/tsa-shared/\$stage/table-names/profiles"
    "/tsa-shared/\$stage/table-names/coach-invitations"
    "/tsa-shared/\$stage/table-names/enrollments"
    "/tsa-shared/\$stage/table-names/events"
    "/tsa-shared/\$stage/table-names/documents"
)

# Function to create or update SSM parameter
create_or_update_ssm_parameter() {
    local param_name=$1
    local param_value=$2
    local description=${3:-"Auto-managed TSA parameter"}
    
    if [[ -z "$param_value" ]]; then
        print_warning "⚠️  Skipping $param_name - no value provided"
        return 0
    fi
    
    echo -n "📝 Managing $param_name... "
    
    if aws ssm put-parameter \
        --name "$param_name" \
        --value "$param_value" \
        --type "String" \
        --description "$description" \
        --overwrite \
        --region "$DEFAULT_REGION" \
        --output text >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Success${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed${NC}"
        return 1
    fi
}

# Function to list SSM parameters
list_ssm_parameters() {
    local stage=$1
    
    print_header "SSM PARAMETER INVENTORY - $stage ENVIRONMENT"
    
    # Replace $stage placeholder in parameter names
    local param_names=()
    for param_template in "${SSM_PARAM_NAMES[@]}"; do
        param_names+=("${param_template//\$stage/$stage}")
    done
    
    print_step "📋 Current SSM Parameters:"
    
    for param_name in "${param_names[@]}"; do
        echo -n "🔍 $param_name: "
        
        local value=$(aws ssm get-parameter \
            --name "$param_name" \
            --region "$DEFAULT_REGION" \
            --query 'Parameter.Value' \
            --output text 2>/dev/null || echo "NOT_FOUND")
        
        if [[ "$value" == "NOT_FOUND" ]]; then
            echo -e "${RED}❌ Not found${NC}"
        else
            # Truncate long URLs for display
            local display_value="$value"
            if [[ ${#value} -gt 60 ]]; then
                display_value="${value:0:57}..."
            fi
            echo -e "${GREEN}✅ $display_value${NC}"
        fi
    done
}

# Function to update SSM parameters from CloudFormation outputs
sync_ssm_parameters() {
    local stage=$1
    
    print_step "📡 Syncing SSM parameters from CloudFormation outputs..."
    
    # Get API URLs from CloudFormation outputs
    local auth_api=$(aws cloudformation describe-stacks \
        --stack-name "tsa-infra-auth-$stage" \
        --region "$DEFAULT_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`PasswordlessApiUrl`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    # Capitalize first letter for CloudFormation output key matching
    local stage_capitalized=$(echo "${stage:0:1}" | tr '[:lower:]' '[:upper:]')${stage:1}
    
    local admin_api=$(aws cloudformation describe-stacks \
        --stack-name "tsa-admin-backend-$stage" \
        --region "$DEFAULT_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='AdminAPIUrl${stage_capitalized}'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    local coach_api=$(aws cloudformation describe-stacks \
        --stack-name "tsa-coach-backend-$stage" \
        --region "$DEFAULT_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='CoachAPIUrl${stage_capitalized}'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    local parent_api=$(aws cloudformation describe-stacks \
        --stack-name "tsa-parent-backend-$stage" \
        --region "$DEFAULT_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='ParentAPIUrl${stage_capitalized}'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    # Get table names from data stack exports
    local users_table=$(aws cloudformation list-exports \
        --region "$DEFAULT_REGION" \
        --query "Exports[?Name=='UnifiedPlatformUsersTable-$stage'].Value" \
        --output text 2>/dev/null || echo "")
    
    local profiles_table=$(aws cloudformation list-exports \
        --region "$DEFAULT_REGION" \
        --query "Exports[?Name=='UnifiedPlatformProfilesTable-$stage'].Value" \
        --output text 2>/dev/null || echo "")
    
    local coach_invitations_table=$(aws cloudformation list-exports \
        --region "$DEFAULT_REGION" \
        --query "Exports[?Name=='UnifiedPlatformCoachInvitationsTable-$stage'].Value" \
        --output text 2>/dev/null || echo "")
    
    local enrollments_table=$(aws cloudformation list-exports \
        --region "$DEFAULT_REGION" \
        --query "Exports[?Name=='UnifiedPlatformEnrollmentsTable-$stage'].Value" \
        --output text 2>/dev/null || echo "")
    
    local events_table=$(aws cloudformation list-exports \
        --region "$DEFAULT_REGION" \
        --query "Exports[?Name=='UnifiedPlatformEventsTable-$stage'].Value" \
        --output text 2>/dev/null || echo "")
    
    local documents_table=$(aws cloudformation list-exports \
        --region "$DEFAULT_REGION" \
        --query "Exports[?Name=='UnifiedPlatformDocumentsTable-$stage'].Value" \
        --output text 2>/dev/null || echo "")
    
    # Update parameters with CloudFormation values
    [[ -n "$auth_api" ]] && create_or_update_ssm_parameter "/tsa/$stage/api-urls/auth" "$auth_api" "TSA Auth API URL for $stage environment"
    [[ -n "$admin_api" ]] && create_or_update_ssm_parameter "/tsa/$stage/api-urls/admin" "$admin_api" "TSA Admin API URL for $stage environment"  
    [[ -n "$coach_api" ]] && create_or_update_ssm_parameter "/tsa/$stage/api-urls/coach" "$coach_api" "TSA Coach API URL for $stage environment"
    [[ -n "$parent_api" ]] && create_or_update_ssm_parameter "/tsa/$stage/api-urls/parent" "$parent_api" "TSA Parent API URL for $stage environment"
    
    [[ -n "$users_table" ]] && create_or_update_ssm_parameter "/tsa-shared/$stage/table-names/users" "$users_table" "Users table name for $stage environment"
    [[ -n "$profiles_table" ]] && create_or_update_ssm_parameter "/tsa-shared/$stage/table-names/profiles" "$profiles_table" "Profiles table name for $stage environment"
    [[ -n "$coach_invitations_table" ]] && create_or_update_ssm_parameter "/tsa-shared/$stage/table-names/coach-invitations" "$coach_invitations_table" "Coach invitations table name for $stage environment"
    [[ -n "$enrollments_table" ]] && create_or_update_ssm_parameter "/tsa-shared/$stage/table-names/enrollments" "$enrollments_table" "Enrollments table name for $stage environment"
    [[ -n "$events_table" ]] && create_or_update_ssm_parameter "/tsa-shared/$stage/table-names/events" "$events_table" "Events table name for $stage environment"
    [[ -n "$documents_table" ]] && create_or_update_ssm_parameter "/tsa-shared/$stage/table-names/documents" "$documents_table" "Documents table name for $stage environment"
    
    print_status "SSM parameters synced from CloudFormation"
}

# =============================================================================
# ENDPOINT SYNCHRONIZATION FUNCTIONS
# =============================================================================

# Function to get stack output value
get_stack_output() {
    local stack_name=$1
    local output_key=$2
    local region=$3
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$region" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null || echo "NOT_FOUND"
}

# Function to get SSM parameter
get_ssm_parameter() {
    local param_name=$1
    local region=$2
    aws ssm get-parameter \
        --name "$param_name" \
        --region "$region" \
        --output text \
        --query 'Parameter.Value' 2>/dev/null || echo ""
}

# Function to test endpoint connectivity
test_endpoint() {
    local name=$1
    local url=$2
    if [[ -z "$url" ]] || [[ "$url" == "NOT_FOUND" ]]; then
        echo "$name... ⚠️  Not deployed"
        return
    fi
    echo -n "Testing $name... "
    if curl -s --max-time 5 "$url/health" >/dev/null 2>&1; then
        echo "✅ OK"
    elif curl -s --max-time 5 "$url" >/dev/null 2>&1; then
        echo "✅ OK (no health endpoint)"
    else
        echo "⚠️  No response (may be normal)"
    fi
}

sync_endpoints() {
    local stage=${1:-dev}
    local region=${2:-$DEFAULT_REGION}
    local show_config=${3:-false}
    
    if [[ "$SKIP_SYNC" == "true" ]]; then
        print_warning "Skipping endpoint synchronization"
        return 0
    fi
    
    print_header "SYNCING ENDPOINTS"
    
    print_step "Stage: $stage"
    print_step "Region: $region"
    echo ""
    
    print_step "📡 Fetching API endpoints from AWS..."
    
    # Try SSM parameters first (preferred method)
    print_step "🔍 Checking SSM Parameter Store..."
    print_info "💡 Tip: Run './deploy.sh ssm-sync $stage' first if endpoints seem outdated"
    COACH_API=$(get_ssm_parameter "/tsa/$stage/api-urls/coach" "$region")
    PARENT_API=$(get_ssm_parameter "/tsa/$stage/api-urls/parent" "$region") 
    ADMIN_API=$(get_ssm_parameter "/tsa/$stage/api-urls/admin" "$region")
    AUTH_API=$(get_ssm_parameter "/tsa/$stage/api-urls/auth" "$region")
    
    # Fallback to CloudFormation outputs if SSM fails
    if [[ -z "$AUTH_API" ]]; then
        print_step "⚠️  SSM lookup failed, trying CloudFormation outputs..."
        AUTH_API=$(get_stack_output "tsa-infra-auth-$stage" "PasswordlessApiUrl" "$region")
    fi
    
    if [[ -z "$COACH_API" ]]; then
        # Convert stage to title case (dev -> Dev, staging -> Staging, prod -> Prod)
        STAGE_TITLE=$(echo "$stage" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
        COACH_API=$(get_stack_output "tsa-coach-backend-$stage" "CoachAPIUrl${STAGE_TITLE}" "$region")
    fi
    
    if [[ -z "$ADMIN_API" ]]; then
        # Convert stage to title case (dev -> Dev, staging -> Staging, prod -> Prod)
        STAGE_TITLE=$(echo "$stage" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
        ADMIN_API=$(get_stack_output "tsa-admin-backend-$stage" "AdminAPIUrl${STAGE_TITLE}" "$region")
    fi
    
    # Clean up URLs (remove trailing slashes) and handle empty values
    COACH_API=${COACH_API%/}
    PARENT_API=${PARENT_API%/}
    ADMIN_API=${ADMIN_API%/}
    AUTH_API=${AUTH_API%/}
    
    # Convert "NOT_FOUND" to empty string for environment variables
    [[ "$COACH_API" == "NOT_FOUND" ]] && COACH_API=""
    [[ "$PARENT_API" == "NOT_FOUND" ]] && PARENT_API=""
    [[ "$ADMIN_API" == "NOT_FOUND" ]] && ADMIN_API=""
    
    # Use placeholder for parent API if empty (not deployed yet)
    if [[ -z "$PARENT_API" ]]; then
        PARENT_API="https://placeholder-parent-api.tsa.dev/"
    fi
    
    echo ""
    print_status "✅ Current API Endpoints:"
    print_info "🏃 Coach API:        ${COACH_API:-NOT_FOUND}"
    print_info "👨‍👩‍👧‍👦 Parent API:       ${PARENT_API:-NOT_FOUND}"
    print_info "🛠️  Admin API:        ${ADMIN_API:-NOT_FOUND}"
    print_info "🔐 Passwordless Auth: ${AUTH_API:-NOT_FOUND}"
    echo ""
    
    # Validate required endpoints
    MISSING_ENDPOINTS=0
    
    if [[ "$AUTH_API" == "NOT_FOUND" ]] || [[ -z "$AUTH_API" ]]; then
        print_warning "⚠️  WARNING: Passwordless Auth API not found!"
        print_info "   This is normal during initial deployment."
        AUTH_API="https://placeholder-auth-api.tsa.dev/"
        MISSING_ENDPOINTS=$((MISSING_ENDPOINTS + 1))
    fi
    
    if [[ "$COACH_API" == "NOT_FOUND" ]] || [[ -z "$COACH_API" ]]; then
        print_warning "⚠️  WARNING: Coach API not found!"
        print_info "   This is normal during initial deployment."
        COACH_API="https://placeholder-coach-api.tsa.dev/"
        MISSING_ENDPOINTS=$((MISSING_ENDPOINTS + 1))
    fi
    
    if [[ "$ADMIN_API" == "NOT_FOUND" ]] || [[ -z "$ADMIN_API" ]]; then
        print_warning "⚠️  WARNING: Admin API not found!"
        print_info "   This is normal during initial deployment."
        ADMIN_API="https://placeholder-admin-api.tsa.dev/"
        MISSING_ENDPOINTS=$((MISSING_ENDPOINTS + 1))
    fi
    
    if [[ $MISSING_ENDPOINTS -gt 0 ]]; then
        echo ""
        print_info "📝 Using placeholder URLs for missing endpoints."
        print_info "   These will be updated automatically after successful deployment."
        echo ""
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "DRY RUN: Would update frontend configurations"
        return 0
    fi
    
    print_step "📝 Updating frontend configurations..."
    
    # Create environment file for platform frontend (coach + parent)
    print_step "🎯 Updating Platform Frontend (.env.local)..."
    cat > "tsa-platform-frontend/.env.local" << EOF
# Auto-generated environment file - $(date)
# Generated by deploy.sh sync command from AWS infrastructure

# API Endpoints
NEXT_PUBLIC_TSA_AUTH_API_URL=$AUTH_API
NEXT_PUBLIC_TSA_COACH_API_URL=${COACH_API}
NEXT_PUBLIC_TSA_PARENT_API_URL=${PARENT_API}
NEXT_PUBLIC_TSA_ADMIN_API_URL=${ADMIN_API}
NEXT_PUBLIC_PASSWORDLESS_AUTH_URL=$AUTH_API

# Legacy environment variables (for backward compatibility)
NEXT_PUBLIC_API_URL=${COACH_API}
NEXT_PUBLIC_ADMIN_API_URL=${ADMIN_API}

# Environment Configuration
NEXT_PUBLIC_ENVIRONMENT=${stage}
NEXT_PUBLIC_STAGE=$stage
NEXT_PUBLIC_DEBUG_MODE=true

# Application Settings
NEXT_PUBLIC_APP_NAME=TSA Coach Portal ($(echo $stage | tr '[:lower:]' '[:upper:]'))
NEXT_PUBLIC_COGNITO_REGION=$region

# Feature Flags
NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS=true
EOF
    
    print_status "Platform Frontend updated"
    
    # Create environment file for admin frontend
    print_step "⚙️  Updating Admin Frontend (.env.local)..."
    cat > "tsa-admin-frontend/.env.local" << EOF
# Auto-generated environment file - $(date)
# Generated by deploy.sh sync command from AWS infrastructure

# API Endpoints
NEXT_PUBLIC_TSA_AUTH_API_URL=$AUTH_API
NEXT_PUBLIC_TSA_ADMIN_API_URL=${ADMIN_API}
NEXT_PUBLIC_TSA_COACH_API_URL=${COACH_API}
NEXT_PUBLIC_PASSWORDLESS_AUTH_URL=$AUTH_API

# Legacy environment variables (for backward compatibility)
NEXT_PUBLIC_ADMIN_API_URL=${ADMIN_API}
NEXT_PUBLIC_COACH_API_URL=${COACH_API}

# Environment Configuration
NEXT_PUBLIC_ENVIRONMENT=${stage}
NEXT_PUBLIC_STAGE=$stage
NEXT_PUBLIC_DEBUG_MODE=true

# Application Settings
NEXT_PUBLIC_APP_NAME=TSA Admin Portal ($(echo $stage | tr '[:lower:]' '[:upper:]'))
EOF
    
    print_status "Admin Frontend updated"
    
    echo ""
    print_step "🔍 Testing endpoint connectivity..."
    
    test_endpoint "Coach API" "$COACH_API"
    test_endpoint "Parent API" "$PARENT_API"
    test_endpoint "Admin API" "$ADMIN_API"
    test_endpoint "Auth API" "$AUTH_API"
    
    echo ""
    print_status "🎉 Endpoint synchronization complete!"
    print_info "📋 Next steps:"
    print_info "   1. Restart your frontend dev servers"
    print_info "   2. Clear browser cache if needed"
    print_info "   3. Test login functionality"
    echo ""
    
    # Optional: Show current .env.local files
    if [[ "$show_config" == "true" ]]; then
        echo ""
        print_info "📄 Current Platform Frontend .env.local:"
        echo "================================================="
        head -10 "tsa-platform-frontend/.env.local"
        echo "..."
        echo ""
        print_info "📄 Current Admin Frontend .env.local:"
        echo "================================================="
        head -10 "tsa-admin-frontend/.env.local"
        echo "..."
    fi
}

# =============================================================================
# DATABASE MIGRATION FUNCTIONS (OBSOLETE - Handled by real-time event-driven sync)
# =============================================================================

run_database_backfill() {
    local table_name=$1
    local stage=$2
    
    print_header "DATABASE BACKFILL"
    print_warning "This is an advanced operation and should only be used for recovery."
    echo "This will trigger a full re-sync of a table from DynamoDB to PostgreSQL."
    echo ""
    read -p "Are you sure you want to backfill '$table_name' for '$stage'? Type 'BACKFILL' to continue: " confirm
    if [[ "$confirm" != "BACKFILL" ]]; then
        print_warning "Backfill cancelled"
        exit 0
    fi
    
    # Placeholder for backfill logic. This would typically involve:
    # 1. A Lambda function that can be invoked with a table name.
    # 2. The Lambda would scan the DynamoDB table.
    # 3. For each item, it would publish a message to an SNS topic or SQS queue.
    # 4. The main data synchronizer would be subscribed to this topic/queue to process the items.
    print_error "Backfill functionality not yet implemented."
}

# =============================================================================
# MAIN DEPLOYMENT LOGIC
# =============================================================================

deploy_all() {
    local stage=$1
    local region=$2
    
    print_header "TSA UNIFIED DEPLOYMENT - $stage ENVIRONMENT"
    
    # Pre-deployment steps
    validate_prerequisites
    validate_environment "$stage"
    install_dependencies
    bootstrap_cdk "$stage" "$region"
    
    # Core deployment
    deploy_infrastructure "$stage"
    deploy_applications "$stage"
    
    # Post-deployment validation
    validate_dynamodb_tables "$stage"
    
    # Post-deployment steps
    sync_ssm_parameters "$stage"
    sync_endpoints "$stage"
    
    print_header "DEPLOYMENT COMPLETE ✅"
    print_deployment_summary "$stage"
}

print_deployment_summary() {
    local stage=$1
    
    echo ""
    print_status "🎉 TSA $stage deployment completed successfully!"
    echo ""
    
    print_info "Deployment Summary:"
    print_info "• Environment: $stage"
    print_info "• Region: $DEFAULT_REGION"
    print_info "• Infrastructure stacks: ${#INFRASTRUCTURE_STACKS[@]}"
    print_info "• Application stacks: ${#APPLICATION_STACKS[@]}"
    echo ""
    
    if [[ "$stage" == "staging" ]]; then
        print_info "Staging URLs:"
        print_info "• Frontend: https://staging-app.sportsacademy.school"
        print_info "• Admin: https://staging-admin.sportsacademy.school"
    elif [[ "$stage" == "prod" ]]; then
        print_info "Production URLs:"
        print_info "• Frontend: https://app.sportsacademy.school"
        print_info "• Admin: https://admin.sportsacademy.school"
    else
        print_info "Development URLs:"
        print_info "• Frontend: http://localhost:3000"
        print_info "• Admin: http://localhost:3001"
    fi
    
    echo ""
    print_info "Useful Commands:"
    print_info "• Check status: ./deploy.sh status $stage"
    print_info "• Sync endpoints: ./deploy.sh sync $stage"
    print_info "• Setup database: ./deploy.sh db-setup $stage"
    print_info "• Migrate data: ./deploy.sh db-migrate $stage"
    print_info "• Show dev guide: ./deploy.sh guide"
    echo ""
}

# =============================================================================
# DEVELOPMENT ENVIRONMENT GUIDE
# =============================================================================

show_dev_guide() {
    print_header "TSA DEVELOPMENT ENVIRONMENT GUIDE"
    
    echo -e "${GREEN}📱 Frontend Development Against Different Backend Environments${NC}"
    echo "========================================================================="
    echo ""
    
    echo -e "${BLUE}🔧 Full Development (Both Coach + Admin Portals):${NC}"
    echo "  npm run dev              🏠 → Dev backend (latest code, may be unstable)"
    echo "  npm run dev:staging      🎭 → Staging backend (stable, ready for testing)"
    echo "  npm run dev:prod         🚀 → Production backend (live, stable)"
    echo ""
    
    echo -e "${BLUE}👨‍💼 Coach Portal Only:${NC}"
    echo "  npm run dev:coach        🏠 → Dev backend"
    echo "  npm run dev:coach:dev    🏠 → Dev backend (explicit)"
    echo "  npm run dev:coach:staging 🎭 → Staging backend"
    echo "  npm run dev:coach:prod   🚀 → Production backend"
    echo ""
    
    echo -e "${BLUE}⚙️  Admin Portal Only:${NC}"
    echo "  npm run dev:admin        🏠 → Dev backend"
    echo "  npm run dev:admin:dev    🏠 → Dev backend (explicit)"
    echo "  npm run dev:admin:staging 🎭 → Staging backend"
    echo "  npm run dev:admin:prod   🚀 → Production backend"
    echo ""
    
    echo -e "${YELLOW}🤔 When to Use Each Environment:${NC}"
    echo "========================================================================="
    echo ""
    
    echo -e "${CYAN}🏠 DEV Backend:${NC}"
    echo "  ✅ Daily development work"
    echo "  ✅ Testing new features"
    echo "  ✅ Backend and frontend changes together"
    echo "  ⚠️  May be unstable or broken"
    echo ""
    
    echo -e "${CYAN}🎭 STAGING Backend:${NC}"
    echo "  ✅ Frontend-only changes (stable backend)"
    echo "  ✅ UI/UX testing without backend changes"
    echo "  ✅ Demo preparation"
    echo "  ✅ Coworker testing"
    echo "  ✅ Integration testing"
    echo ""
    
    echo -e "${CYAN}🚀 PRODUCTION Backend:${NC}"
    echo "  ✅ Hotfix testing"
    echo "  ✅ Debugging production issues"
    echo "  ✅ Final testing before release"
    echo "  ⚠️  Use sparingly to avoid production load"
    echo ""
    
    echo -e "${GREEN}🔄 Endpoint Management:${NC}"
    echo "========================================================================="
    echo ""
    echo "  ./deploy.sh sync dev      📡 Sync to dev backend URLs"
    echo "  ./deploy.sh sync staging  📡 Sync to staging backend URLs"
    echo "  ./deploy.sh sync prod     📡 Sync to production backend URLs"
    echo ""
    echo -e "${GREEN}🔧 SSM Parameter Management:${NC}"
    echo "========================================================================="
    echo ""
    echo "  ./deploy.sh ssm-list dev     📋 List all SSM parameters for dev"
    echo "  ./deploy.sh ssm-sync staging 🔄 Sync SSM parameters from CloudFormation"
    echo "  ./deploy.sh validate staging 🔍 Validate deployment (tables + SSM)"
    echo ""
    
    echo -e "${GREEN}🗃️ Database Management:${NC}"
    echo "========================================================================="
    echo ""
    echo "  ./deploy.sh db-setup dev         🏗️ Setup database schema and migrate data"
    echo "  ./deploy.sh db-schema staging    📊 Create PostgreSQL schema only"
    echo "  ./deploy.sh db-migrate prod      🔄 Migrate DynamoDB to PostgreSQL"
    echo "  ./deploy.sh db-migrate-dry dev   👀 Preview migration without changes"
    echo ""
    
    echo -e "${GREEN}💡 Pro Tips:${NC}"
    echo "========================================================================="
    echo ""
    echo "  🔍 Check current endpoints: ./deploy.sh sync dev --show-config"
    echo "  🧹 Clean restart: npm run clean && npm run install:all"
    echo "  📊 Check deployment status: ./deploy.sh status staging"
    echo "  🚀 Deploy to staging: ./deploy.sh deploy staging"
    echo ""
    
    echo -e "${BLUE}🎯 Most Common Development Workflows:${NC}"
    echo ""
    echo -e "${CYAN}1. Regular Development:${NC}"
    echo "   npm run dev                    # Both portals → dev backend"
    echo ""
    echo -e "${CYAN}2. Frontend-Only Changes:${NC}"
    echo "   npm run dev:staging            # Both portals → staging backend"
    echo ""
    echo -e "${CYAN}3. Coach Portal Focus:${NC}"
    echo "   npm run dev:coach:staging      # Coach only → staging backend"
    echo ""
    echo -e "${CYAN}4. Admin Portal Focus:${NC}"
    echo "   npm run dev:admin:staging      # Admin only → staging backend"
    echo ""
    
    echo "🎉 Happy coding! Your frontend can now connect to any backend environment."
}

# =============================================================================
# SETUP FUNCTIONS
# =============================================================================

generate_secure_jwt_secret() {
    # Generate a cryptographically secure 64-character random string
    # Using openssl for cross-platform compatibility
    openssl rand -hex 32
}

setup_jwt_secret() {
    local stage=$1
    
    local secret_name="tsa-jwt-secret-${stage}"
    
    print_step "Setting up JWT secret for stage: $stage"
    
    # Generate a secure random JWT secret
    local jwt_secret=$(generate_secure_jwt_secret)
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$secret_name" >/dev/null 2>&1; then
        print_step "Secret $secret_name already exists. Updating with new secure key..."
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "{\"jwt_secret\":\"$jwt_secret\"}"
    else
        print_step "Creating new JWT secret $secret_name..."
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "JWT signing secret for TSA magic links ($stage environment)" \
            --secret-string "{\"jwt_secret\":\"$jwt_secret\"}"
    fi
    
    print_status "✅ JWT secret successfully configured for stage: $stage"
    local secret_arn=$(aws secretsmanager describe-secret --secret-id "$secret_name" --query 'ARN' --output text)
    print_info "Secret ARN: $secret_arn"
    print_info "Secret generated with 256-bit entropy (64 hex characters)"
}

setup_checkr_secret() {
    local stage=$1
    local checkr_api_key=$2
    
    local secret_name="checkr-api-key-${stage}"
    
    print_step "Setting up Checkr API key for stage: $stage"
    
    # If no key provided as parameter, prompt for it
    if [[ -z "$checkr_api_key" ]]; then
        echo ""
        print_info "Enter Checkr API key for $stage environment (or press Enter to skip):"
        read -p "Checkr API Key: " checkr_api_key
    fi
    
    # Handle empty/blank keys
    if [[ -z "$checkr_api_key" || "$checkr_api_key" == "" ]]; then
        print_warning "No Checkr API key provided for $stage environment - skipping setup"
        print_info "You can set this up later with: ./deploy.sh setup-checkr $stage"
        return 0
    fi
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$secret_name" >/dev/null 2>&1; then
        print_step "Secret $secret_name already exists. Updating..."
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "{\"api_key\":\"$checkr_api_key\"}"
    else
        print_step "Creating new secret $secret_name..."
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "Checkr API key for background check integration ($stage environment)" \
            --secret-string "{\"api_key\":\"$checkr_api_key\"}"
    fi
    
    print_status "✅ Checkr API key successfully configured for stage: $stage"
    local secret_arn=$(aws secretsmanager describe-secret --secret-id "$secret_name" --query 'ARN' --output text)
    print_info "Secret ARN: $secret_arn"
}

setup_sendgrid_secret() {
    local stage=$1
    local sendgrid_api_key=$2
    
    local secret_name="tsa-sendgrid-api-key-${stage}"
    
    print_step "Setting up SendGrid API key for stage: $stage"
    
    # If no key provided as parameter, prompt for it
    if [[ -z "$sendgrid_api_key" ]]; then
        echo ""
        print_info "Enter SendGrid API key for $stage environment (or press Enter to skip):"
        read -p "SendGrid API Key: " sendgrid_api_key
    fi
    
    # Handle empty/blank keys
    if [[ -z "$sendgrid_api_key" || "$sendgrid_api_key" == "" ]]; then
        print_warning "No SendGrid API key provided for $stage environment - skipping setup"
        print_info "You can set this up later with: ./deploy.sh setup-sendgrid $stage"
        return 0
    fi
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$secret_name" >/dev/null 2>&1; then
        print_step "Secret $secret_name already exists. Updating..."
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "{\"api_key\":\"$sendgrid_api_key\"}"
    else
        print_step "Creating new secret $secret_name..."
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "SendGrid API key for email sending ($stage environment)" \
            --secret-string "{\"api_key\":\"$sendgrid_api_key\"}"
    fi
    
    print_status "✅ SendGrid API key successfully configured for stage: $stage"
    local secret_arn=$(aws secretsmanager describe-secret --secret-id "$secret_name" --query 'ARN' --output text)
    print_info "Secret ARN: $secret_arn"
}

setup_all_secrets_for_environment() {
    local stage=$1
    
    print_header "SETTING UP ALL SECRETS FOR $stage ENVIRONMENT"
    
    # JWT secrets (required)
    print_step "Setting up JWT secret (required)..."
    setup_jwt_secret "$stage"
    
    # SendGrid secrets (optional)
    print_step "Setting up SendGrid secret (optional)..."
    setup_sendgrid_secret "$stage"
    
    # Checkr secrets (optional)
    print_step "Setting up Checkr secret (optional)..."
    setup_checkr_secret "$stage"
    
    print_status "✅ All secrets processed for $stage environment"
}

setup_all_environments() {
    print_header "COMPREHENSIVE SECRET SETUP - ALL ENVIRONMENTS"
    
    echo "This will ensure all secrets are set up across dev, staging, and prod environments."
    echo "• JWT secrets (required) - will be auto-generated"
    echo "• SendGrid API keys (optional) - can be skipped per environment"
    echo "• Checkr API keys (optional) - can be skipped per environment"
    echo ""
    
    # Set up each environment
    setup_all_secrets_for_environment "dev"
    echo ""
    setup_all_secrets_for_environment "staging"
    echo ""
    setup_all_secrets_for_environment "prod"
    
    echo ""
    print_status "🎉 Comprehensive secret setup complete!"
    
    # Show summary of what was set up
    print_header "SECRET SUMMARY"
    
    for env in dev staging prod; do
        echo ""
        print_info "$env environment:"
        
        # Check JWT
        if aws secretsmanager describe-secret --secret-id "tsa-jwt-secret-$env" >/dev/null 2>&1; then
            print_status "  ✅ JWT secret: configured"
        else
            print_warning "  ❌ JWT secret: missing"
        fi
        
        # Check SendGrid
        if aws secretsmanager describe-secret --secret-id "tsa-sendgrid-api-key-$env" >/dev/null 2>&1; then
            print_status "  ✅ SendGrid secret: configured"
        else
            print_warning "  ⚠️  SendGrid secret: not configured (run: ./deploy.sh setup-sendgrid $env)"
        fi
        
        # Check Checkr
        if aws secretsmanager describe-secret --secret-id "checkr-api-key-$env" >/dev/null 2>&1; then
            print_status "  ✅ Checkr secret: configured"
        else
            print_warning "  ⚠️  Checkr secret: not configured (run: ./deploy.sh setup-checkr $env)"
        fi
    done
}

run_one_time_setup() {
    print_header "TSA ONE-TIME SETUP"
    
    echo "This will set up one-time configuration items:"
    echo "• JWT secrets for magic link authentication (required)"
    echo "• SendGrid API secrets for email sending (optional - can be set up later)"
    echo "• Checkr API secrets for background checks (optional - can be set up later)"
    echo "• Other external service configurations"
    echo ""
    
    print_step "Setting up JWT secrets (required)..."
    
    # Setup JWT secrets for all environments (required)
    setup_jwt_secret "dev"
    setup_jwt_secret "staging"
    setup_jwt_secret "prod"
    
    echo ""
    print_step "Setting up SendGrid API keys (optional)..."
    print_info "SendGrid is used for sending magic link emails. You can skip this now and set it up later."
    echo ""
    
    # Setup for dev environment
    print_info "Setting up dev environment..."
    setup_sendgrid_secret "dev"
    
    # Setup for staging environment  
    print_info "Setting up staging environment..."
    setup_sendgrid_secret "staging"
    
    # Setup for production environment
    print_info "Setting up production environment..."
    setup_sendgrid_secret "prod"
    
    echo ""
    print_step "Setting up Checkr API keys (optional)..."
    print_info "Checkr is used for background checks. You can skip this now and set it up later."
    echo ""
    
    # Setup for dev environment
    print_info "Setting up dev environment..."
    setup_checkr_secret "dev"
    
    # Setup for staging environment  
    print_info "Setting up staging environment..."
    setup_checkr_secret "staging"
    
    # Setup for production environment
    print_info "Setting up production environment..."
    setup_checkr_secret "prod"
    
    echo ""
    print_status "🎉 One-time setup complete!"
    print_info "Next steps:"
    print_info "1. Deploy infrastructure: ./deploy.sh deploy dev"
    print_info "2. Test authentication endpoints"
    
    # Check which optional services were set up
    local has_sendgrid=false
    local has_checkr=false
    
    if aws secretsmanager describe-secret --secret-id "tsa-sendgrid-api-key-dev" >/dev/null 2>&1; then
        has_sendgrid=true
    fi
    
    if aws secretsmanager describe-secret --secret-id "checkr-api-key-dev" >/dev/null 2>&1; then
        has_checkr=true
    fi
    
    if [[ "$has_sendgrid" == true ]]; then
        print_info "3. Test magic link email sending"
    else
        print_info "3. Set up SendGrid API keys when ready: ./deploy.sh setup-sendgrid dev"
    fi
    
    if [[ "$has_checkr" == true ]]; then
        print_info "4. Test background check endpoints"
        print_info "5. Configure Checkr webhook URL in your Checkr dashboard"
    else
        if [[ "$has_sendgrid" == true ]]; then
            print_info "4. Set up Checkr API keys when ready: ./deploy.sh setup-checkr dev"
        else
            print_info "4. Set up Checkr API keys when ready: ./deploy.sh setup-checkr dev"
        fi
    fi
}

# =============================================================================
# UTILITY COMMANDS
# =============================================================================

show_status() {
    local stage=$1
    
    print_header "DEPLOYMENT STATUS - $stage ENVIRONMENT"
    
    cd tsa-infrastructure
    
    # Activate virtual environment
    if [[ -d ".venv" ]]; then
        source .venv/bin/activate
    fi
    
    print_step "Checking stack status..."
    cdk list --context stage="$stage" || true
    cd ..
}

destroy_environment() {
    local stage=$1
    
    if [[ "$stage" == "prod" ]]; then
        print_error "Cannot destroy production environment with this script"
        exit 1
    fi
    
    print_header "🚨 DESTROYING $stage ENVIRONMENT 🚨"
    print_warning "This will delete ALL resources in the $stage environment"
    echo ""
    read -p "Are you sure? Type 'DESTROY-$stage' to continue: " confirm
    if [[ "$confirm" != "DESTROY-$stage" ]]; then
        print_warning "Destruction cancelled"
        exit 0
    fi
    
    cd tsa-infrastructure
    
    # Activate virtual environment
    if [[ -d ".venv" ]]; then
        source .venv/bin/activate
    fi
    
    if cdk destroy --all --context stage="$stage" --force; then
        print_status "Environment $stage destroyed successfully"
    else
        print_error "Environment destruction failed"
        exit 1
    fi
    
    cd ..
}

# =============================================================================
# CLI INTERFACE
# =============================================================================

show_help() {
    cat << EOF
🚀 TSA Unified Deployment Script

USAGE:
    ./deploy.sh [COMMAND] [OPTIONS]

COMMANDS:
    deploy [STAGE]              Deploy all stacks to specified environment (default: dev)
    deploy-stack STACK [STAGE]  Deploy single stack
    sync [STAGE]                Sync endpoints and update frontend configs
    validate [STAGE]            Validate deployment (check tables, endpoints)
    db-backfill TBL [STAGE]     Manually trigger a full re-sync of a table (for recovery)
    ssm-list [STAGE]            List all SSM parameters for environment
    ssm-sync [STAGE]            Sync SSM parameters from CloudFormation
    setup                       Run one-time setup tasks (JWT + SendGrid + Checkr secrets, etc.)
    setup-all                   Setup all secrets across dev, staging, and prod environments
    setup-env [STAGE]           Setup all secrets for a specific environment
    setup-jwt [STAGE]           Generate and setup secure JWT secret for specific stage
    setup-sendgrid [STAGE]      Setup SendGrid API secret for specific stage
    setup-checkr [STAGE]        Setup Checkr API secret for specific stage
    admin-add EMAIL FNAME LNAME [STAGE]  Add admin user to system
    admin-add-danny [STAGE]     Quick add danny.a.mota@gmail.com as admin
    admin-list [STAGE]          List all admin users
    admin-remove EMAIL [STAGE]  Remove/disable admin user
    status [STAGE]              Show deployment status
    guide                       Show development environment guide
    destroy [STAGE]             Destroy environment (non-prod only)
    help                        Show this help message

STAGES:
    dev                         Development environment (default)
    staging                     Staging environment
    prod                        Production environment

OPTIONS:
    --force                     Force deployment (ignore dependency warnings)
    --skip-validation          Skip pre-deployment validation
    --skip-sync                Skip endpoint synchronization
    --dry-run                  Show what would be deployed without executing
    --region REGION            AWS region (default: us-east-2)
    --show-config              Show current environment configurations (for sync command)

EXAMPLES:
    ./deploy.sh deploy dev                    # Deploy to dev
    ./deploy.sh deploy staging --force        # Force deploy to staging
    ./deploy.sh deploy-stack tsa-admin-backend-dev
    ./deploy.sh sync staging                  # Sync staging endpoints
    ./deploy.sh sync dev --show-config        # Sync dev endpoints and show config
    ./deploy.sh validate staging              # Validate staging deployment
    ./deploy.sh db-backfill profiles-dev dev  # Manually re-sync the profiles table for dev
    ./deploy.sh ssm-list dev                  # List all SSM parameters for dev
    ./deploy.sh ssm-sync staging              # Sync SSM parameters from CloudFormation
    ./deploy.sh setup                         # Run one-time setup (JWT + SendGrid + Checkr secrets)
    ./deploy.sh setup-all                     # Setup all secrets across all environments
    ./deploy.sh setup-env staging             # Setup all secrets for staging environment
    ./deploy.sh setup-jwt staging             # Generate JWT secret for staging
    ./deploy.sh setup-sendgrid dev            # Setup SendGrid API key for development
    ./deploy.sh setup-checkr prod             # Setup Checkr API key for production
    ./deploy.sh admin-add danny@gmail.com Danny Mota dev  # Add admin user
    ./deploy.sh admin-list dev                # List all admin users
    ./deploy.sh admin-remove danny@gmail.com dev  # Remove admin user
    ./deploy.sh status staging                # Check staging status
    ./deploy.sh guide                         # Show development guide
    ./deploy.sh destroy dev                   # Destroy dev environment
EOF
}

# =============================================================================
# ADMIN USER MANAGEMENT
# =============================================================================

admin_add_user() {
    local email="$1"
    local first_name="$2"
    local last_name="$3"
    local stage="$4"
    
    if [[ -z "$email" || -z "$first_name" || -z "$last_name" ]]; then
        print_error "Usage: ./deploy.sh admin-add EMAIL FIRST_NAME LAST_NAME [STAGE]"
        exit 1
    fi
    
    print_step "🔧 Adding admin user: $email (stage: $stage)"
    
    # Navigate to infrastructure directory
    cd "${SCRIPT_DIR}/tsa-infrastructure" || {
        print_error "Failed to navigate to infrastructure directory"
        exit 1
    }
    
    # Activate virtual environment and run the admin manager script
    source venv/bin/activate
    python scripts/admin-manager.py --stage "$stage" add \
        --email "$email" \
        --first-name "$first_name" \
        --last-name "$last_name"
    
    local exit_code=$?
    cd "$SCRIPT_DIR" || true
    
    if [[ $exit_code -eq 0 ]]; then
        print_status "✅ Successfully added admin user: $email"
    else
        print_error "❌ Failed to add admin user: $email"
        exit 1
    fi
}

admin_list_users() {
    local stage="$1"
    
    print_step "📋 Listing admin users for stage: $stage"
    
    # Navigate to infrastructure directory
    cd "${SCRIPT_DIR}/tsa-infrastructure" || {
        print_error "Failed to navigate to infrastructure directory"
        exit 1
    }
    
    # Activate virtual environment and run the admin manager script
    source venv/bin/activate
    python scripts/admin-manager.py --stage "$stage" list
    
    cd "$SCRIPT_DIR" || true
}

admin_remove_user() {
    local email="$1"
    local stage="$2"
    
    if [[ -z "$email" ]]; then
        print_error "Usage: ./deploy.sh admin-remove EMAIL [STAGE]"
        exit 1
    fi
    
    print_step "🗑️  Removing admin user: $email (stage: $stage)"
    
    # Navigate to infrastructure directory
    cd "${SCRIPT_DIR}/tsa-infrastructure" || {
        print_error "Failed to navigate to infrastructure directory"
        exit 1
    }
    
    # Activate virtual environment and run the admin manager script
    source venv/bin/activate
    python scripts/admin-manager.py --stage "$stage" remove --email "$email"
    
    local exit_code=$?
    cd "$SCRIPT_DIR" || true
    
    if [[ $exit_code -eq 0 ]]; then
        print_status "✅ Successfully removed admin user: $email"
    else
        print_error "❌ Failed to remove admin user: $email"
        exit 1
    fi
}

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

main() {
    local command="${1:-deploy}"
    shift || true
    
    # Initialize show_config flag
    local show_config=false
    
    # Parse global options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_DEPLOYMENT=true
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --skip-sync)
                SKIP_SYNC=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --region)
                DEFAULT_REGION="$2"
                shift 2
                ;;
            --show-config)
                show_config=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
    
    # Set environment variables
    export CDK_DEFAULT_REGION="${DEFAULT_REGION}"
    export AWS_DEFAULT_REGION="${DEFAULT_REGION}"
    
    case "$command" in
        deploy)
            local stage="${1:-$DEFAULT_STAGE}"
            deploy_all "$stage" "$DEFAULT_REGION"
            ;;
        deploy-stack)
            local stack_name="${1}"
            local stage="${2:-$DEFAULT_STAGE}"
            if [[ -z "$stack_name" ]]; then
                print_error "Stack name required for deploy-stack command"
                show_help
                exit 1
            fi
            deploy_single_stack "$stage" "$stack_name"
            sync_endpoints "$stage"
            ;;
        sync)
            local stage="${1:-$DEFAULT_STAGE}"
            sync_endpoints "$stage" "$DEFAULT_REGION" "$show_config"
            ;;
        validate)
            local stage="${1:-$DEFAULT_STAGE}"
            validate_dynamodb_tables "$stage"
            ;;
        db-backfill)
            local table_name="${1}"
            local stage="${2:-$DEFAULT_STAGE}"
            if [[ -z "$table_name" ]]; then
                print_error "Table name required for db-backfill command"
                show_help
                exit 1
            fi
            run_database_backfill "$table_name" "$stage"
            ;;
        ssm-list)
            local stage="${1:-$DEFAULT_STAGE}"
            list_ssm_parameters "$stage"
            ;;
        ssm-sync)
            local stage="${1:-$DEFAULT_STAGE}"
            sync_ssm_parameters "$stage"
            ;;
        setup)
            run_one_time_setup
            ;;
        setup-all)
            setup_all_environments
            ;;
        setup-env)
            local stage="${1:-$DEFAULT_STAGE}"
            validate_environment "$stage"
            setup_all_secrets_for_environment "$stage"
            ;;
        setup-jwt)
            local stage="${1:-$DEFAULT_STAGE}"
            validate_environment "$stage"
            setup_jwt_secret "$stage"
            ;;
        setup-sendgrid)
            local stage="${1:-$DEFAULT_STAGE}"
            validate_environment "$stage"
            setup_sendgrid_secret "$stage"
            ;;
        setup-checkr)
            local stage="${1:-$DEFAULT_STAGE}"
            validate_environment "$stage"
            setup_checkr_secret "$stage"
            ;;
        admin-add)
            local email="${1}"
            local first_name="${2}"
            local last_name="${3}"
            local stage="${4:-$DEFAULT_STAGE}"
            admin_add_user "$email" "$first_name" "$last_name" "$stage"
            ;;
        admin-add-danny)
            local stage="${1:-$DEFAULT_STAGE}"
            admin_add_user "danny.a.mota@gmail.com" "Danny" "Mota" "$stage"
            ;;
        admin-list)
            local stage="${1:-$DEFAULT_STAGE}"
            admin_list_users "$stage"
            ;;
        admin-remove)
            local email="${1}"
            local stage="${2:-$DEFAULT_STAGE}"
            admin_remove_user "$email" "$stage"
            ;;
        status)
            local stage="${1:-$DEFAULT_STAGE}"
            show_status "$stage"
            ;;
        guide)
            show_dev_guide
            ;;
        destroy)
            local stage="${1:-$DEFAULT_STAGE}"
            destroy_environment "$stage"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Only run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

# Add after the existing functions
backup_stack_state() {
    local stack_name="$1"
    local backup_dir="./deployment-backups/$(date +%Y%m%d_%H%M%S)"
    
    echo "🔄 Creating backup of stack state: $stack_name"
    mkdir -p "$backup_dir"
    
    # Export current stack template
    aws cloudformation get-template --stack-name "$stack_name" --region "$AWS_REGION" > "$backup_dir/${stack_name}_template.json" 2>/dev/null || true
    
    # Export current stack parameters
    aws cloudformation describe-stacks --stack-name "$stack_name" --region "$AWS_REGION" > "$backup_dir/${stack_name}_parameters.json" 2>/dev/null || true
    
    echo "✅ Backup saved to: $backup_dir"
    echo "$backup_dir" > ".last_backup_path"
}

validate_stack_health() {
    local stack_name="$1"
    
    echo "🔍 Validating stack health: $stack_name"
    
    # Check stack status
    local status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --region "$AWS_REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$status" == "UPDATE_ROLLBACK_COMPLETE" || "$status" == "CREATE_FAILED" || "$status" == "ROLLBACK_COMPLETE" ]]; then
        echo "❌ Stack $stack_name is in failed state: $status"
        return 1
    fi
    
    if [[ "$status" == "UPDATE_IN_PROGRESS" || "$status" == "CREATE_IN_PROGRESS" || "$status" == "DELETE_IN_PROGRESS" ]]; then
        echo "⚠️ Stack $stack_name is currently updating: $status"
        echo "Waiting for stack operation to complete..."
        aws cloudformation wait stack-update-complete --stack-name "$stack_name" --region "$AWS_REGION" 2>/dev/null || \
        aws cloudformation wait stack-create-complete --stack-name "$stack_name" --region "$AWS_REGION" 2>/dev/null || true
        
        # Re-check status
        status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --region "$AWS_REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")
    fi
    
    echo "✅ Stack $stack_name status: $status"
    return 0
}

test_lambda_functions() {
    local stack_name="$1"
    
    echo "🧪 Testing Lambda functions in stack: $stack_name"
    
    # Test auth endpoints if this is the auth stack
    if [[ "$stack_name" == *"auth"* ]]; then
        echo "Testing auth endpoints..."
        
        # Test health endpoint
        local auth_url=$(aws ssm get-parameter --name "/tsa/$STAGE/api-urls/auth" --region "$AWS_REGION" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
        
        if [[ -n "$auth_url" ]]; then
            local health_response=$(curl -s -w "%{http_code}" -o /tmp/health_test.json "$auth_url/health" || echo "000")
            if [[ "$health_response" == "200" ]]; then
                echo "✅ Health endpoint working"
            else
                echo "❌ Health endpoint failed (HTTP $health_response)"
                return 1
            fi
        else
            echo "⚠️ Could not find auth URL in SSM"
        fi
    fi
    
    return 0
}

deploy_with_rollback() {
    local stack_name="$1"
    local max_retries=3
    local retry_count=0
    
    echo "🚀 Starting robust deployment of: $stack_name"
    
    # Step 1: Validate current state
    if ! validate_stack_health "$stack_name"; then
        echo "❌ Stack $stack_name is in invalid state. Manual intervention required."
        return 1
    fi
    
    # Step 2: Create backup
    backup_stack_state "$stack_name"
    
    # Step 3: Deploy with retries
    while [[ $retry_count -lt $max_retries ]]; do
        echo "🔄 Deployment attempt $((retry_count + 1)) of $max_retries"
        
        # Attempt deployment
        if python app.py --deploy-stack "$stack_name"; then
            echo "✅ Deployment successful"
            
            # Step 4: Test deployed functions
            if test_lambda_functions "$stack_name"; then
                echo "✅ All tests passed"
                return 0
            else
                echo "❌ Post-deployment tests failed"
                # Continue to rollback logic
            fi
        else
            echo "❌ Deployment failed"
        fi
        
        # Step 5: Handle failure
        retry_count=$((retry_count + 1))
        
        if [[ $retry_count -lt $max_retries ]]; then
            echo "⏳ Waiting 30 seconds before retry..."
            sleep 30
            
            # Try to stabilize stack state
            echo "🔄 Attempting to stabilize stack state..."
            aws cloudformation cancel-update-stack --stack-name "$stack_name" --region "$AWS_REGION" 2>/dev/null || true
            sleep 10
        else
            echo "❌ Max retries exceeded. Deployment failed."
            
            # Check if we need to clean up failed state
            local current_status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --region "$AWS_REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")
            
            if [[ "$current_status" == "UPDATE_ROLLBACK_COMPLETE" ]]; then
                echo "⚠️ Stack automatically rolled back to previous state"
                # Test if rollback state is working
                if test_lambda_functions "$stack_name"; then
                    echo "✅ Rollback state is functional"
                    return 2  # Special return code for "failed but rolled back successfully"
                else
                    echo "❌ Rollback state is not functional"
                fi
            fi
            
            return 1
        fi
    done
}

# Enhanced deploy-stack command
deploy_stack_enhanced() {
    local stack_name="$1"
    
    if [[ -z "$stack_name" ]]; then
        echo "❌ Error: Stack name is required"
        echo "Usage: $0 deploy-stack-enhanced <stack-name>"
        return 1
    fi
    
    echo "============================================"
    echo " ENHANCED DEPLOYMENT: $stack_name"
    echo "============================================"
    
    # Deploy with rollback capability
    local deploy_result
    deploy_with_rollback "$stack_name"
    deploy_result=$?
    
    if [[ $deploy_result -eq 0 ]]; then
        echo "🎉 Deployment completed successfully!"
        sync_endpoints
    elif [[ $deploy_result -eq 2 ]]; then
        echo "⚠️ Deployment failed but system rolled back to working state"
        echo "🔍 Check logs and try again with fixes"
        return 1
    else
        echo "❌ Deployment failed and system may be in inconsistent state"
        echo "🆘 Manual intervention required"
        return 1
    fi
}

# Staged deployment strategy
deploy_staged() {
    local deployment_type="$1"
    
    echo "============================================"
    echo " STAGED DEPLOYMENT: $deployment_type"
    echo "============================================"
    
    case "$deployment_type" in
        "auth-only")
            echo "🔐 Deploying authentication stack only..."
            deploy_stack_enhanced "tsa-infra-auth-dev"
            ;;
        "backend-only")
            echo "🔧 Deploying backend stacks only..."
            deploy_stack_enhanced "tsa-infra-networking-dev" &&
            deploy_stack_enhanced "tsa-infra-security-dev" &&
            deploy_stack_enhanced "tsa-infra-auth-dev" &&
            deploy_stack_enhanced "tsa-coach-backend-dev" &&
            deploy_stack_enhanced "tsa-parent-backend-dev" &&
            deploy_stack_enhanced "tsa-admin-backend-dev"
            ;;
        "full")
            echo "🌟 Full staged deployment..."
            # First deploy infrastructure
            deploy_stack_enhanced "tsa-infra-networking-dev" &&
            deploy_stack_enhanced "tsa-infra-security-dev" &&
            
            # Then deploy auth (critical for other services)
            deploy_stack_enhanced "tsa-infra-auth-dev" &&
            
            # Then deploy backends
            deploy_stack_enhanced "tsa-coach-backend-dev" &&
            deploy_stack_enhanced "tsa-parent-backend-dev" &&
            deploy_stack_enhanced "tsa-admin-backend-dev" &&
            
            # Finally deploy frontends
            deploy_stack_enhanced "tsa-platform-frontend-dev" &&
            deploy_stack_enhanced "tsa-admin-frontend-dev"
            ;;
        *)
            echo "❌ Unknown deployment type: $deployment_type"
            echo "Available types: auth-only, backend-only, full"
            return 1
            ;;
    esac
}

# Quick fix deployment for when we know exactly what's wrong
deploy_quick_fix() {
    local issue_type="$1"
    
    echo "============================================"
    echo " QUICK FIX DEPLOYMENT: $issue_type"
    echo "============================================"
    
    case "$issue_type" in
        "sendgrid")
            echo "🔧 Fixing SendGrid configuration issue..."
            # Just redeploy auth with minimal changes
            backup_stack_state "tsa-infra-auth-dev"
            deploy_stack_enhanced "tsa-infra-auth-dev"
            ;;
        "lambda-deps")
            echo "🔧 Fixing Lambda dependency issues..."
            # Clear CDK cache and redeploy
            rm -rf cdk.out*
            deploy_stack_enhanced "tsa-infra-auth-dev"
            ;;
        *)
            echo "❌ Unknown fix type: $issue_type"
            echo "Available fixes: sendgrid, lambda-deps"
            return 1
            ;;
    esac
}

 