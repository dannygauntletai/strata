#!/bin/bash
set -e
# Creates .env.local symlink pointing to parent directory .env file

echo "🔗 Setting up environment variables for TSA Coach Frontend..."

# Check if symlink already exists
if [ -L ".env.local" ]; then
    echo "✅ .env.local symlink already exists"
    echo "📄 Currently pointing to: $(readlink .env.local)"
else
    # Create symlink to parent directory .env file
    ln -s ../.env.coach-frontend .env.local
    echo "✅ Created .env.local symlink -> ../.env.coach-frontend"
fi

echo ""
echo "📋 Current environment variables:"
echo "--------------------------------"

# Show current environment variables from the file
if [ -f ".env.local" ]; then
    cat .env.local | grep -E "^[A-Z]" | head -10
else
    echo "❌ .env.local file not found"
    exit 1
fi

echo ""
echo "🎯 Environment Setup Complete!"
echo "📝 To update API endpoints, run from project root:"
echo "   ./tsa-infrastructure/scripts/update-frontend-urls.sh"
echo ""
echo "🚀 Start the development server with: npm run dev"
echo "💡 The .env.local file is managed from the parent directory for consistency" 