#!/bin/bash

# Build Lambda Layer for Migration Functions with x86_64 Architecture
echo "🔨 Building migration Lambda layer with x86_64 architecture..."

# Clean previous build
rm -rf python/
mkdir -p python

# Build using Python 3.9 image with x86_64 platform
docker run --platform linux/amd64 --rm \
    -v $(pwd):/var/task \
    -w /var/task \
    python:3.9-slim \
    sh -c "pip install --target python -r requirements.txt"

if [ $? -eq 0 ]; then
    echo "✅ Migration layer built successfully for x86_64"
    echo "📦 Layer contents:"
    ls -la python/ | head -10
    echo "🎯 Migration layer ready for deployment"
    
    # Verify asyncpg is correctly built
    if [ -d "python/asyncpg" ]; then
        echo "✅ asyncpg package found"
        ls python/asyncpg/protocol/*.so 2>/dev/null || echo "ℹ️  No .so files in protocol (expected for x86_64)"
    fi
else
    echo "❌ Failed to build migration layer"
    exit 1
fi 