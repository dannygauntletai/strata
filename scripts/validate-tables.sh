#!/bin/bash

# TSA Platform - Table Existence Validation Script
# Validates that all expected DynamoDB tables exist after deployment

set -e

# Configuration
STAGE=${1:-dev}
REGION=${2:-us-east-2}

echo "🔍 TSA Table Existence Validation"
echo "================================================="
echo "📍 Stage: $STAGE"
echo "🌍 Region: $REGION"
echo ""

# Expected tables from data stack (12 tables)
DATA_STACK_TABLES=(
    "users-$STAGE"
    "profiles-$STAGE"
    "organizations-$STAGE"
    "coach-invitations-$STAGE"
    "parent-invitations-$STAGE"
    "event-invitations-$STAGE"
    "enrollments-$STAGE"
    "events-$STAGE"
    "event-registrations-$STAGE"
    "documents-$STAGE"
    "scheduling-$STAGE"
    "analytics-events-$STAGE"
    "sessions-$STAGE"
)

# Expected tables from admin service (1 table)
ADMIN_STACK_TABLES=(
    "admin-audit-logs-$STAGE"
)

# Expected tables from coach service (5 tables)
COACH_STACK_TABLES=(
    "coach-onboarding-sessions-$STAGE"
    "background-checks-$STAGE"
    "legal-requirements-$STAGE"
    "eventbrite-config-$STAGE"
    "event-attendees-$STAGE"
)

# Validation functions
check_table_exists() {
    local table_name=$1
    local category=$2
    
    if aws dynamodb describe-table --table-name "$table_name" --region "$REGION" >/dev/null 2>&1; then
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
    
    local gsi_count=$(aws dynamodb describe-table --table-name "$table_name" --region "$REGION" --query 'Table.GlobalSecondaryIndexes | length(@)' --output text 2>/dev/null || echo "0")
    
    if [ "$gsi_count" -ge "$expected_gsi" ]; then
        echo "  📊 GSI: $gsi_count indexes (expected: $expected_gsi)"
    else
        echo "  ⚠️  GSI: $gsi_count indexes (expected: $expected_gsi)"
    fi
}

# Main validation
echo "🏗️ VALIDATING DATA STACK TABLES (12 expected)"
echo "================================================="
data_missing=0
for table in "${DATA_STACK_TABLES[@]}"; do
    if ! check_table_exists "$table" "Data Stack"; then
        ((data_missing++))
    else
        # Validate specific GSIs for key tables
        case $table in
            "coach-invitations-$STAGE")
                validate_table_gsi "$table" 2
                ;;
            "parent-invitations-$STAGE")
                validate_table_gsi "$table" 1
                ;;
            "event-invitations-$STAGE")
                validate_table_gsi "$table" 1
                ;;
            "enrollments-$STAGE")
                validate_table_gsi "$table" 1
                ;;
            "events-$STAGE")
                validate_table_gsi "$table" 1
                ;;
            "scheduling-$STAGE")
                validate_table_gsi "$table" 2
                ;;
        esac
    fi
done

echo ""
echo "🔧 VALIDATING ADMIN STACK TABLES (1 expected)"
echo "================================================="
admin_missing=0
for table in "${ADMIN_STACK_TABLES[@]}"; do
    if ! check_table_exists "$table" "Admin Stack"; then
        ((admin_missing++))
    else
        validate_table_gsi "$table" 1
    fi
done

echo ""
echo "👨‍🏫 VALIDATING COACH STACK TABLES (5 expected)"
echo "================================================="
coach_missing=0
for table in "${COACH_STACK_TABLES[@]}"; do
    if ! check_table_exists "$table" "Coach Stack"; then
        ((coach_missing++))
    else
        # Validate specific GSIs for key tables
        case $table in
            "background-checks-$STAGE")
                validate_table_gsi "$table" 1
                ;;
            "event-attendees-$STAGE")
                validate_table_gsi "$table" 1
                ;;
        esac
    fi
done

# Summary
echo ""
echo "📊 VALIDATION SUMMARY"
echo "================================================="
total_expected=18
total_missing=$((data_missing + admin_missing + coach_missing))
total_found=$((total_expected - total_missing))

echo "📈 Tables Found: $total_found/$total_expected"
echo "📉 Tables Missing: $total_missing/$total_expected"

if [ "$data_missing" -gt 0 ]; then
    echo "❌ Data Stack: $data_missing missing tables"
fi

if [ "$admin_missing" -gt 0 ]; then
    echo "❌ Admin Stack: $admin_missing missing tables"
fi

if [ "$coach_missing" -gt 0 ]; then
    echo "❌ Coach Stack: $coach_missing missing tables"
fi

echo ""

if [ "$total_missing" -eq 0 ]; then
    echo "🎉 SUCCESS: All expected tables found!"
    echo "✅ Table architecture is correctly deployed"
    exit 0
else
    echo "⚠️  WARNING: $total_missing tables are missing"
    echo "💡 Run deployment for the affected stacks:"
    
    if [ "$data_missing" -gt 0 ]; then
        echo "   npm run deploy:data"
    fi
    
    if [ "$admin_missing" -gt 0 ]; then
        echo "   npm run deploy:admin"
    fi
    
    if [ "$coach_missing" -gt 0 ]; then
        echo "   npm run deploy:coach"
    fi
    
    exit 1
fi 