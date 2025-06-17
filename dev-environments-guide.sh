#!/bin/bash

# 🎯 TSA Development Environments Guide
# Shows all available frontend dev modes and when to use them

echo "🎯 TSA Frontend Development Environment Options"
echo "========================================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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
echo "  ./sync-endpoints.sh dev      📡 Sync to dev backend URLs"
echo "  ./sync-endpoints.sh staging  📡 Sync to staging backend URLs"
echo "  ./sync-endpoints.sh prod     📡 Sync to production backend URLs"
echo ""

echo -e "${GREEN}💡 Pro Tips:${NC}"
echo "========================================================================="
echo ""
echo "  🔍 Check current endpoints: npm run sync:endpoints:show"
echo "  🧹 Clean restart: npm run clean && npm run install:all"
echo "  📊 Validate deployment: ./validate-staging-deployment.sh"
echo "  🚀 Deploy to staging: npm run deploy:staging"
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