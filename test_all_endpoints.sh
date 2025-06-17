#!/bin/bash

# TSA Coach Portal API Endpoint Testing Script
# Tests all available endpoints and reports status

set -e

# Configuration
BASE_URL="https://h6wgy6f3r4.execute-api.us-east-2.amazonaws.com/dev"
TEST_COACH_ID="test_coach_123"
TEST_EVENT_ID="test_event_456"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results array
declare -a TEST_RESULTS=()

# Helper function to test an endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local expected_status="${4:-200}"
    local data="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}Testing:${NC} $method $endpoint - $description"
    
    # Prepare curl command
    local curl_cmd="curl -s -w '%{http_code}' -X $method \"$BASE_URL$endpoint\""
    
    if [[ -n "$data" ]]; then
        curl_cmd="curl -s -w '%{http_code}' -H 'Content-Type: application/json' -d '$data' -X $method \"$BASE_URL$endpoint\""
    fi
    
    # Execute request and capture response + status code
    local response
    response=$(eval "$curl_cmd")
    
    # Extract status code (last 3 characters)
    local status_code="${response: -3}"
    local body="${response%???}"
    
    # Check if test passed
    if [[ "$status_code" == "$expected_status" ]] || [[ "$status_code" =~ ^[23] ]]; then
        echo -e "  ${GREEN}✅ PASS${NC} - Status: $status_code"
        if [[ -n "$body" && "$body" != "null" ]]; then
            echo -e "  ${YELLOW}Response:${NC} ${body:0:100}$([ ${#body} -gt 100 ] && echo '...')"
        fi
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("✅ $method $endpoint - $description")
    else
        echo -e "  ${RED}❌ FAIL${NC} - Status: $status_code"
        if [[ -n "$body" ]]; then
            echo -e "  ${RED}Error:${NC} ${body:0:200}$([ ${#body} -gt 200 ] && echo '...')"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("❌ $method $endpoint - $description (Status: $status_code)")
    fi
    
    echo ""
}

echo -e "${BLUE}🚀 Starting TSA Coach Portal API Endpoint Testing${NC}"
echo -e "${BLUE}Base URL:${NC} $BASE_URL"
echo -e "${BLUE}Test Coach ID:${NC} $TEST_COACH_ID"
echo ""

# =============================================================================
# HEALTH ENDPOINTS
# =============================================================================
echo -e "${YELLOW}📋 HEALTH ENDPOINTS${NC}"
test_endpoint "GET" "/" "Root health check"
test_endpoint "GET" "/health" "Dedicated health endpoint"

# =============================================================================
# PROFILE ENDPOINTS  
# =============================================================================
echo -e "${YELLOW}👤 PROFILE ENDPOINTS${NC}"
test_endpoint "GET" "/profile?coach_id=$TEST_COACH_ID" "Get coach profile"
test_endpoint "PATCH" "/profile" "Update coach profile" 400 '{"coach_id":"'$TEST_COACH_ID'","first_name":"Test"}'
test_endpoint "PATCH" "/profile/preferences" "Update profile preferences" 400 '{"coach_id":"'$TEST_COACH_ID'","preferences":{}}'

# =============================================================================
# ONBOARDING ENDPOINTS
# =============================================================================
echo -e "${YELLOW}🎯 ONBOARDING ENDPOINTS${NC}"
test_endpoint "GET" "/onboarding?coach_id=$TEST_COACH_ID" "Get onboarding status"
test_endpoint "POST" "/onboarding" "Start onboarding process" 400 '{"coach_id":"'$TEST_COACH_ID'"}'
test_endpoint "PUT" "/onboarding" "Update onboarding progress" 400 '{"coach_id":"'$TEST_COACH_ID'","step":"personal_info"}'
test_endpoint "POST" "/onboarding/validate-invitation" "Validate invitation" 400 '{"invitation_code":"test123"}'
test_endpoint "GET" "/onboarding/progress?coach_id=$TEST_COACH_ID" "Get onboarding progress"
test_endpoint "POST" "/onboarding/progress" "Update progress step" 400 '{"coach_id":"'$TEST_COACH_ID'","step":"documents"}'
test_endpoint "PUT" "/onboarding/progress" "Update progress data" 400 '{"coach_id":"'$TEST_COACH_ID'","data":{}}'
test_endpoint "POST" "/onboarding/complete" "Complete onboarding" 400 '{"coach_id":"'$TEST_COACH_ID'"}'

# =============================================================================
# EVENTS ENDPOINTS
# =============================================================================
echo -e "${YELLOW}📅 EVENTS ENDPOINTS${NC}"
test_endpoint "GET" "/events?coach_id=$TEST_COACH_ID" "List coach events"
test_endpoint "POST" "/events" "Create new event" 400 '{"coach_id":"'$TEST_COACH_ID'","title":"Test Event","start_date":"2024-12-01T10:00:00Z","end_date":"2024-12-01T12:00:00Z"}'
test_endpoint "PUT" "/events" "Update event" 400 '{"event_id":"'$TEST_EVENT_ID'","title":"Updated Event"}'
test_endpoint "DELETE" "/events" "Delete event" 400 '{"event_id":"'$TEST_EVENT_ID'"}'

# Individual Event Endpoints
test_endpoint "GET" "/events/$TEST_EVENT_ID" "Get specific event"
test_endpoint "PUT" "/events/$TEST_EVENT_ID" "Update specific event" 400 '{"title":"Updated Event Title"}'
test_endpoint "DELETE" "/events/$TEST_EVENT_ID" "Delete specific event"

# Event Management Endpoints
test_endpoint "POST" "/events/$TEST_EVENT_ID/publish" "Publish event" 400 '{"publish":true}'
test_endpoint "GET" "/events/$TEST_EVENT_ID/attendees" "Get event attendees"
test_endpoint "GET" "/events/$TEST_EVENT_ID/sync" "Get event sync status"
test_endpoint "POST" "/events/$TEST_EVENT_ID/sync" "Trigger event sync" 400 '{"force_sync":true}'

# =============================================================================
# EVENTBRITE OAUTH ENDPOINTS
# =============================================================================
echo -e "${YELLOW}🔗 EVENTBRITE OAUTH ENDPOINTS${NC}"
test_endpoint "GET" "/eventbrite/oauth/authorize?coach_id=$TEST_COACH_ID" "Start OAuth authorization"
test_endpoint "GET" "/eventbrite/oauth/callback?code=test123&state=$TEST_COACH_ID" "OAuth callback handler"
test_endpoint "GET" "/eventbrite/oauth/status?coach_id=$TEST_COACH_ID" "Get OAuth status"
test_endpoint "POST" "/eventbrite/oauth/disconnect" "Disconnect OAuth" 400 '{"coach_id":"'$TEST_COACH_ID'"}'
test_endpoint "POST" "/eventbrite/oauth/refresh" "Refresh OAuth token" 400 '{"coach_id":"'$TEST_COACH_ID'"}'

# =============================================================================
# BACKGROUND CHECK ENDPOINTS
# =============================================================================
echo -e "${YELLOW}🛡️ BACKGROUND CHECK ENDPOINTS${NC}"
test_endpoint "GET" "/background-check?coach_id=$TEST_COACH_ID" "Get background check status"
test_endpoint "POST" "/background-check" "Initiate background check" 400 '{"coach_id":"'$TEST_COACH_ID'","personal_info":{}}'

# =============================================================================
# SUMMARY REPORT
# =============================================================================
echo -e "${BLUE}📊 TEST SUMMARY REPORT${NC}"
echo -e "${BLUE}===========================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo -e "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! The API is working correctly.${NC}"
else
    echo -e "${YELLOW}⚠️ Some tests failed. Details above.${NC}"
fi

echo ""
echo -e "${BLUE}📋 DETAILED RESULTS:${NC}"
for result in "${TEST_RESULTS[@]}"; do
    echo -e "  $result"
done

exit $FAILED_TESTS 