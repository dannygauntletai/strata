#!/bin/bash

# 🔧 TSA SSM Parameter Management Script
# Handles external SSM parameter creation/updates to avoid CloudFormation conflicts
# 
# Based on ARCHITECTURAL_DEBUGGING_GUIDE.md principles:
# - External parameter management prevents CloudFormation conflicts
# - Deterministic infrastructure - same code always produces same resources
# - No orphaned resources - clean CloudFormation stacks

set -e

STAGE=${1:-dev}
REGION=${2:-us-east-2}
ACTION=${3:-update}  # create, update, delete, list, sync

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔧 TSA SSM Parameter Management"
echo "================================================="
echo "📍 Stage: $STAGE"
echo "🌍 Region: $REGION"
echo "⚡ Action: $ACTION"
echo ""

# All SSM parameters managed externally - using arrays to avoid syntax issues
SSM_PARAM_NAMES=(
    "/tsa/$STAGE/api-urls/auth"
    "/tsa/$STAGE/api-urls/admin"
    "/tsa/$STAGE/api-urls/coach"
    "/tsa/$STAGE/api-urls/parent"
    "/tsa-shared/$STAGE/table-names/users"
    "/tsa-shared/$STAGE/table-names/profiles"
    "/tsa-shared/$STAGE/table-names/coach-invitations"
    "/tsa-shared/$STAGE/table-names/enrollments"
    "/tsa-shared/$STAGE/table-names/events"
    "/tsa-shared/$STAGE/table-names/documents"
)

# Function to create or update a parameter
create_or_update_parameter() {
    local param_name=$1
    local param_value=$2
    local description=${3:-"Auto-managed TSA parameter"}
    
    if [ -z "$param_value" ]; then
        echo -e "${YELLOW}⚠️  Skipping $param_name - no value provided${NC}"
        return 0
    fi
    
    echo -n "📝 Managing $param_name... "
    
    if aws ssm put-parameter \
        --name "$param_name" \
        --value "$param_value" \
        --type "String" \
        --description "$description" \
        --overwrite \
        --region "$REGION" \
        --output text >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Success${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed${NC}"
        return 1
    fi
}

# Function to delete a parameter
delete_parameter() {
    local param_name=$1
    
    echo -n "🗑️  Deleting $param_name... "
    
    if aws ssm delete-parameter \
        --name "$param_name" \
        --region "$REGION" \
        --output text >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Deleted${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Not found or already deleted${NC}"
        return 0
    fi
}

# Function to list all parameters
list_parameters() {
    echo "📋 Current SSM Parameters:"
    echo "================================================="
    
    for param_name in "${SSM_PARAM_NAMES[@]}"; do
        echo -n "🔍 $param_name: "
        
        local value=$(aws ssm get-parameter \
            --name "$param_name" \
            --region "$REGION" \
            --query 'Parameter.Value' \
            --output text 2>/dev/null || echo "NOT_FOUND")
        
        if [ "$value" = "NOT_FOUND" ]; then
            echo -e "${RED}❌ Not found${NC}"
        else
            # Truncate long URLs for display
            local display_value="$value"
            if [ ${#value} -gt 60 ]; then
                display_value="${value:0:57}..."
            fi
            echo -e "${GREEN}✅ $display_value${NC}"
        fi
    done
}

# Function to get CloudFormation outputs for parameter values
get_cloudformation_values() {
    echo "📡 Fetching values from CloudFormation stacks..."
    
    # Get API URLs from CloudFormation outputs
    local auth_api=$(aws cloudformation describe-stacks \
        --stack-name "tsa-infra-auth-$STAGE" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`PasswordlessApiUrl`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    # Capitalize first letter for CloudFormation output key matching
    local stage_capitalized=$(echo "${STAGE:0:1}" | tr '[:lower:]' '[:upper:]')${STAGE:1}
    
    local admin_api=$(aws cloudformation describe-stacks \
        --stack-name "tsa-admin-backend-$STAGE" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='AdminAPIUrl${stage_capitalized}'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    local coach_api=$(aws cloudformation describe-stacks \
        --stack-name "tsa-coach-backend-$STAGE" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='CoachAPIUrl${stage_capitalized}'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    local parent_api=$(aws cloudformation describe-stacks \
        --stack-name "tsa-parent-backend-$STAGE" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='ParentAPIUrl${stage_capitalized}'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    # Get table names from data stack exports
    local users_table=$(aws cloudformation list-exports \
        --region "$REGION" \
        --query "Exports[?Name=='UnifiedPlatformUsersTable-$STAGE'].Value" \
        --output text 2>/dev/null || echo "")
    
    local profiles_table=$(aws cloudformation list-exports \
        --region "$REGION" \
        --query "Exports[?Name=='UnifiedPlatformProfilesTable-$STAGE'].Value" \
        --output text 2>/dev/null || echo "")
    
    local coach_invitations_table=$(aws cloudformation list-exports \
        --region "$REGION" \
        --query "Exports[?Name=='UnifiedPlatformCoachInvitationsTable-$STAGE'].Value" \
        --output text 2>/dev/null || echo "")
    
    local enrollments_table=$(aws cloudformation list-exports \
        --region "$REGION" \
        --query "Exports[?Name=='UnifiedPlatformEnrollmentsTable-$STAGE'].Value" \
        --output text 2>/dev/null || echo "")
    
    local events_table=$(aws cloudformation list-exports \
        --region "$REGION" \
        --query "Exports[?Name=='UnifiedPlatformEventsTable-$STAGE'].Value" \
        --output text 2>/dev/null || echo "")
    
    local documents_table=$(aws cloudformation list-exports \
        --region "$REGION" \
        --query "Exports[?Name=='UnifiedPlatformDocumentsTable-$STAGE'].Value" \
        --output text 2>/dev/null || echo "")
    
    # Update parameters with CloudFormation values
    [ -n "$auth_api" ] && create_or_update_parameter "/tsa/$STAGE/api-urls/auth" "$auth_api" "TSA Auth API URL for $STAGE environment"
    [ -n "$admin_api" ] && create_or_update_parameter "/tsa/$STAGE/api-urls/admin" "$admin_api" "TSA Admin API URL for $STAGE environment"
    [ -n "$coach_api" ] && create_or_update_parameter "/tsa/$STAGE/api-urls/coach" "$coach_api" "TSA Coach API URL for $STAGE environment"
    [ -n "$parent_api" ] && create_or_update_parameter "/tsa/$STAGE/api-urls/parent" "$parent_api" "TSA Parent API URL for $STAGE environment"
    
    [ -n "$users_table" ] && create_or_update_parameter "/tsa-shared/$STAGE/table-names/users" "$users_table" "Users table name for $STAGE environment"
    [ -n "$profiles_table" ] && create_or_update_parameter "/tsa-shared/$STAGE/table-names/profiles" "$profiles_table" "Profiles table name for $STAGE environment"
    [ -n "$coach_invitations_table" ] && create_or_update_parameter "/tsa-shared/$STAGE/table-names/coach-invitations" "$coach_invitations_table" "Coach invitations table name for $STAGE environment"
    [ -n "$enrollments_table" ] && create_or_update_parameter "/tsa-shared/$STAGE/table-names/enrollments" "$enrollments_table" "Enrollments table name for $STAGE environment"
    [ -n "$events_table" ] && create_or_update_parameter "/tsa-shared/$STAGE/table-names/events" "$events_table" "Events table name for $STAGE environment"
    [ -n "$documents_table" ] && create_or_update_parameter "/tsa-shared/$STAGE/table-names/documents" "$documents_table" "Documents table name for $STAGE environment"
}

# Function to delete all parameters
delete_all_parameters() {
    echo "🗑️  Deleting all SSM parameters for stage: $STAGE"
    echo "================================================="
    
    for param_name in "${SSM_PARAM_NAMES[@]}"; do
        delete_parameter "$param_name"
    done
}

# Main action handler
case "$ACTION" in
    "create"|"update")
        echo "🔄 Updating SSM parameters from CloudFormation..."
        get_cloudformation_values
        ;;
    "delete")
        echo "⚠️  This will delete ALL SSM parameters for stage: $STAGE"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            delete_all_parameters
        else
            echo "❌ Operation cancelled"
            exit 1
        fi
        ;;
    "list")
        list_parameters
        ;;
    "sync")
        echo "🔄 Syncing parameters and updating frontend..."
        get_cloudformation_values
        echo ""
        echo "📝 Running frontend sync..."
        ./sync-endpoints.sh "$STAGE" "$REGION"
        ;;
    *)
        echo "❌ Unknown action: $ACTION"
        echo "Usage: $0 <stage> <region> <action>"
        echo "Actions: create, update, delete, list, sync"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ SSM parameter management complete${NC}" 