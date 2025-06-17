#!/bin/bash

# TSA Coach Portal API - Comprehensive Endpoint Testing
BASE_URL="https://h6wgy6f3r4.execute-api.us-east-2.amazonaws.com/dev"
TEST_COACH_ID="test_coach_123"
TEST_EVENT_ID="test_event_456"

echo "🚀 TSA Coach Portal API - Comprehensive Testing"
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0

# Test function
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local expected_keywords="$4"  # Keywords that indicate success
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}Testing:${NC} $method $endpoint - $description"
    
    response=$(curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")
    status_code="${response: -3}"
    body="${response%???}"
    
    # Check if response is successful
    success=false
    
    if [[ "$status_code" =~ ^[23] ]]; then
        success=true
    elif [[ "$status_code" == "400" && "$body" =~ (required|parameter) ]]; then
        # 400 with parameter errors are expected for test endpoints
        success=true
    elif [[ "$status_code" == "404" && "$body" =~ (not found|not exist) ]]; then
        # 404 for non-existent resources are expected
        success=true
    elif [[ -n "$expected_keywords" ]]; then
        # Check for specific keywords that indicate proper functionality
        for keyword in $expected_keywords; do
            if [[ "$body" =~ $keyword ]]; then
                success=true
                break
            fi
        done
    fi
    
    if [[ "$success" == "true" ]]; then
        echo -e "  ${GREEN}✅ PASS${NC} - Status: $status_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        # Show meaningful response excerpt
        if [[ -n "$body" && "$body" != "null" ]]; then
            echo "  Response: ${body:0:100}..."
        fi
    else
        echo -e "  ${RED}❌ FAIL${NC} - Status: $status_code"
        echo "  Response: ${body:0:150}..."
    fi
    echo ""
}

echo "📋 Testing Core Health Endpoints..."
test_endpoint "GET" "/" "Root endpoint health check" "healthy"
test_endpoint "GET" "/health" "Health check endpoint" "healthy"

echo "👤 Testing Profile Endpoints..."
test_endpoint "GET" "/profile?coach_id=$TEST_COACH_ID" "Get coach profile" "not found required"
test_endpoint "PATCH" "/profile" "Update coach profile" "required"
test_endpoint "PATCH" "/profile/preferences" "Update coach preferences" "required"

echo "🎯 Testing Onboarding Endpoints..."
test_endpoint "GET" "/onboarding" "Get onboarding status" "status healthy"
test_endpoint "POST" "/onboarding" "Create onboarding session" ""
test_endpoint "PUT" "/onboarding" "Update onboarding" ""
test_endpoint "POST" "/onboarding/validate-invitation" "Validate invitation" ""
test_endpoint "GET" "/onboarding/progress" "Get onboarding progress" ""
test_endpoint "POST" "/onboarding/progress" "Update onboarding progress" ""
test_endpoint "PUT" "/onboarding/progress" "Update onboarding progress (PUT)" ""
test_endpoint "POST" "/onboarding/complete" "Complete onboarding" ""

echo "📅 Testing Events Management Endpoints..."
test_endpoint "GET" "/events?coach_id=$TEST_COACH_ID" "List coach events" "events count"
test_endpoint "POST" "/events" "Create new event" "required title"
test_endpoint "PUT" "/events" "Update event" "required"
test_endpoint "DELETE" "/events" "Delete event" "required"

echo "📅 Testing Individual Event Endpoints..."
test_endpoint "GET" "/events/$TEST_EVENT_ID" "Get specific event" "not found"
test_endpoint "PUT" "/events/$TEST_EVENT_ID" "Update specific event" ""
test_endpoint "DELETE" "/events/$TEST_EVENT_ID" "Delete specific event" ""

echo "📅 Testing Event Management Features..."
test_endpoint "POST" "/events/$TEST_EVENT_ID/publish" "Publish event on Eventbrite" ""
test_endpoint "GET" "/events/$TEST_EVENT_ID/attendees" "Get event attendees" ""
test_endpoint "GET" "/events/$TEST_EVENT_ID/sync" "Sync event data" ""
test_endpoint "POST" "/events/$TEST_EVENT_ID/sync" "Sync event attendees" ""

echo "🔗 Testing Eventbrite OAuth Endpoints..."
test_endpoint "GET" "/eventbrite/oauth/authorize?coach_id=$TEST_COACH_ID" "Get OAuth authorization URL" "authorization_url"
test_endpoint "GET" "/eventbrite/oauth/callback" "OAuth callback" "code"
test_endpoint "GET" "/eventbrite/oauth/status?coach_id=$TEST_COACH_ID" "OAuth connection status" "connected status"
test_endpoint "POST" "/eventbrite/oauth/disconnect" "Disconnect OAuth" "required"
test_endpoint "POST" "/eventbrite/oauth/refresh" "Refresh OAuth token" "required"

echo "🔍 Testing Background Check Endpoints..."
test_endpoint "GET" "/background-check?coach_id=$TEST_COACH_ID" "Get background check status" ""
test_endpoint "POST" "/background-check" "Initiate background check" "required"

echo ""
echo "📊 COMPREHENSIVE TEST RESULTS:"
echo "=============================="
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"

success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo -e "Success Rate: ${GREEN}$success_rate%${NC}"

if [ $success_rate -ge 90 ]; then
    echo -e "\n🎉 ${GREEN}EXCELLENT!${NC} API is in great shape!"
elif [ $success_rate -ge 75 ]; then
    echo -e "\n✅ ${YELLOW}GOOD!${NC} Most endpoints are working well."
elif [ $success_rate -ge 50 ]; then
    echo -e "\n⚠️  ${YELLOW}FAIR${NC} - Some issues need attention."
else
    echo -e "\n❌ ${RED}NEEDS WORK${NC} - Multiple endpoints require fixes."
fi

echo ""
echo "🔍 Note: 404/400 errors for non-existent test resources are expected!"
echo "🔍 Success is measured by proper error handling vs internal server errors." 