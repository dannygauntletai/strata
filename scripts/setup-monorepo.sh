#!/bin/bash

# TSA Monorepo Setup Script
# This script demonstrates how to set up the monorepo with your existing TSA services

set -e

echo "🏫 Setting up TSA Monorepo..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TSA_SOURCE_DIR="../tsa"
MONOREPO_DIR="."

echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if source directory exists
if [ ! -d "$TSA_SOURCE_DIR" ]; then
    echo -e "${RED}❌ Source TSA directory not found at $TSA_SOURCE_DIR${NC}"
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

echo -e "${YELLOW}🏗️ Creating monorepo structure...${NC}"

# Create directory structure
mkdir -p services packages docs tools infrastructure
mkdir -p .github/workflows
mkdir -p tools/scripts tools/configs
mkdir -p docs/api docs/architecture

echo -e "${GREEN}✅ Directory structure created${NC}"

echo -e "${YELLOW}📦 Copying shared files...${NC}"

# Copy shared configuration and documentation
if [ -f "$TSA_SOURCE_DIR/.cursorrules" ]; then
    cp "$TSA_SOURCE_DIR/.cursorrules" .
    echo "✅ Copied .cursorrules"
fi

if [ -f "$TSA_SOURCE_DIR/design_theme.md" ]; then
    cp "$TSA_SOURCE_DIR/design_theme.md" docs/
    echo "✅ Copied design_theme.md"
fi

if [ -f "$TSA_SOURCE_DIR/database_schema.md" ]; then
    cp "$TSA_SOURCE_DIR/database_schema.md" docs/
    echo "✅ Copied database_schema.md"
fi

if [ -f "$TSA_SOURCE_DIR/TSA_ENROLLMENT_PIPELINE_INTEGRATION.md" ]; then
    cp "$TSA_SOURCE_DIR/TSA_ENROLLMENT_PIPELINE_INTEGRATION.md" docs/
    echo "✅ Copied TSA_ENROLLMENT_PIPELINE_INTEGRATION.md"
fi

if [ -f "$TSA_SOURCE_DIR/EDFI_ONEROSTER_DATA_COLLECTION.md" ]; then
    cp "$TSA_SOURCE_DIR/EDFI_ONEROSTER_DATA_COLLECTION.md" docs/
    echo "✅ Copied EDFI_ONEROSTER_DATA_COLLECTION.md"
fi

if [ -f "$TSA_SOURCE_DIR/LLC-INCORPORATION-CDK-README.md" ]; then
    cp "$TSA_SOURCE_DIR/LLC-INCORPORATION-CDK-README.md" docs/
    echo "✅ Copied LLC-INCORPORATION-CDK-README.md"
fi

# Copy scripts directory if it exists
if [ -d "$TSA_SOURCE_DIR/scripts" ]; then
    cp -r "$TSA_SOURCE_DIR/scripts/"* tools/scripts/
    echo "✅ Copied scripts to tools/scripts"
fi

echo -e "${GREEN}✅ Shared files copied${NC}"

echo -e "${YELLOW}🔗 Setting up Git submodules...${NC}"

# Function to setup git repo for a service
setup_service_repo() {
    local service_path=$1
    local service_name=$2
    
    if [ -d "$service_path" ]; then
        echo "Setting up git repo for $service_name..."
        cd "$service_path"
        
        # Initialize git if not already done
        if [ ! -d ".git" ]; then
            git init
            git add .
            git commit -m "Initial commit for $service_name"
            echo "✅ Initialized git repo for $service_name"
        else
            echo "✅ Git repo already exists for $service_name"
        fi
        
        cd - > /dev/null
    else
        echo "⚠️ Service directory $service_path not found"
    fi
}

# Setup git repos for each service
setup_service_repo "$TSA_SOURCE_DIR/tsa-coach-frontend" "coach-frontend"
setup_service_repo "$TSA_SOURCE_DIR/tsa-coach-backend" "coach-backend"
setup_service_repo "$TSA_SOURCE_DIR/tsa-admin-frontend" "admin-frontend"
setup_service_repo "$TSA_SOURCE_DIR/tsa-admin-backend" "admin-backend"
setup_service_repo "$TSA_SOURCE_DIR/tsa-infrastructure" "infrastructure"

echo -e "${YELLOW}📁 Adding services as submodules...${NC}"

# Add submodules
if [ -d "$TSA_SOURCE_DIR/tsa-coach-frontend" ]; then
    git submodule add "$TSA_SOURCE_DIR/tsa-coach-frontend" services/coach-frontend
    echo "✅ Added coach-frontend as submodule"
fi

if [ -d "$TSA_SOURCE_DIR/tsa-coach-backend" ]; then
    git submodule add "$TSA_SOURCE_DIR/tsa-coach-backend" services/coach-backend
    echo "✅ Added coach-backend as submodule"
fi

if [ -d "$TSA_SOURCE_DIR/tsa-admin-frontend" ]; then
    git submodule add "$TSA_SOURCE_DIR/tsa-admin-frontend" services/admin-frontend
    echo "✅ Added admin-frontend as submodule"
fi

if [ -d "$TSA_SOURCE_DIR/tsa-admin-backend" ]; then
    git submodule add "$TSA_SOURCE_DIR/tsa-admin-backend" services/admin-backend
    echo "✅ Added admin-backend as submodule"
fi

if [ -d "$TSA_SOURCE_DIR/tsa-infrastructure" ]; then
    git submodule add "$TSA_SOURCE_DIR/tsa-infrastructure" infrastructure
    echo "✅ Added infrastructure as submodule"
fi

echo -e "${YELLOW}⚙️ Creating shared configurations...${NC}"

# Create shared TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@tsa/shared-types": ["packages/shared-types/src"],
      "@tsa/shared-utils": ["packages/shared-utils/src"],
      "@tsa/design-system": ["packages/design-system/src"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# Create Docker Compose for local development
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  coach-frontend:
    build: ./services/coach-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/coach-frontend:/app
      - /app/node_modules
    depends_on:
      - coach-backend
    
  admin-frontend:
    build: ./services/admin-frontend
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/admin-frontend:/app
      - /app/node_modules
    depends_on:
      - admin-backend
  
  coach-backend:
    build: ./services/coach-backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/coach-backend:/app
      - /app/node_modules
  
  admin-backend:
    build: ./services/admin-backend
    ports:
      - "4001:4000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/admin-backend:/app
      - /app/node_modules
EOF

# Create GitHub Actions workflow
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: TSA Monorepo CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      coach-frontend: ${{ steps.changes.outputs.coach-frontend }}
      coach-backend: ${{ steps.changes.outputs.coach-backend }}
      admin-frontend: ${{ steps.changes.outputs.admin-frontend }}
      admin-backend: ${{ steps.changes.outputs.admin-backend }}
      infrastructure: ${{ steps.changes.outputs.infrastructure }}
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            coach-frontend:
              - 'services/coach-frontend/**'
            coach-backend:
              - 'services/coach-backend/**'
            admin-frontend:
              - 'services/admin-frontend/**'
            admin-backend:
              - 'services/admin-backend/**'
            infrastructure:
              - 'infrastructure/**'

  build-coach-frontend:
    needs: detect-changes
    if: ${{ needs.detect-changes.outputs.coach-frontend == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: services/coach-frontend/package-lock.json
      - name: Install dependencies
        run: |
          cd services/coach-frontend
          npm ci
      - name: Build
        run: |
          cd services/coach-frontend
          npm run build
      - name: Test
        run: |
          cd services/coach-frontend
          npm test

  build-coach-backend:
    needs: detect-changes
    if: ${{ needs.detect-changes.outputs.coach-backend == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: services/coach-backend/package-lock.json
      - name: Install dependencies
        run: |
          cd services/coach-backend
          npm ci
      - name: Build
        run: |
          cd services/coach-backend
          npm run build
      - name: Test
        run: |
          cd services/coach-backend
          npm test

  deploy-infrastructure:
    needs: detect-changes
    if: ${{ needs.detect-changes.outputs.infrastructure == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Deploy infrastructure
        run: |
          cd infrastructure
          npm ci
          npm run deploy
EOF

echo -e "${GREEN}✅ Shared configurations created${NC}"

echo -e "${YELLOW}📝 Creating initial commit...${NC}"

# Add all files to git
git add .
git commit -m "Initial TSA monorepo setup

- Added package.json with unified scripts
- Created directory structure for monorepo
- Added shared configurations (TypeScript, Docker, CI/CD)
- Integrated existing TSA services as submodules
- Copied shared documentation and configurations"

echo -e "${GREEN}✅ Initial commit created${NC}"

echo -e "${YELLOW}📚 Creating documentation...${NC}"

# Create a comprehensive README
cat > README.md << 'EOF'
# 🏫 Texas Sports Academy - Monorepo

A unified monorepo for Texas Sports Academy's microservices architecture.

## 🏗️ Architecture

```
tsa-monorepo/
├── services/                   # Microservices (git submodules)
│   ├── coach-frontend/        # Coach dashboard (Next.js)
│   ├── coach-backend/         # Coach API (Lambda)
│   ├── admin-frontend/        # Admin dashboard (React)
│   └── admin-backend/         # Admin API (Lambda)
├── infrastructure/            # AWS CDK (git submodule)
├── packages/                  # Shared libraries
├── docs/                      # Documentation
└── tools/                     # Development tools
```

## 🚀 Quick Start

```bash
# Clone with submodules
git clone --recursive https://github.com/your-org/tsa-monorepo.git

# Install dependencies
yarn bootstrap

# Start development
yarn dev
```

## 📋 Available Scripts

- `yarn dev` - Start all services
- `yarn build:all` - Build all services  
- `yarn test:all` - Test all services
- `yarn deploy:all` - Deploy all services

## 📚 Documentation

- [Architecture](./docs/architecture/)
- [Database Schema](./docs/database_schema.md)
- [Design Theme](./docs/design_theme.md)
- [Deployment](./docs/deployment.md)

## 🔄 Git Submodules

Each service is a git submodule with independent version control:

```bash
# Update all submodules
git submodule update --remote

# Work in a specific service
cd services/coach-frontend
git checkout -b feature/new-feature
# Make changes...
git commit -m "Add new feature"
git push

# Update parent repo to point to new commit
cd ../..
git add services/coach-frontend
git commit -m "Update coach-frontend submodule"
```

## 🤝 Contributing

1. Create feature branches in individual services
2. Test changes using monorepo scripts
3. Submit PRs for both service and monorepo updates
4. Follow conventional commit format

EOF

echo -e "${GREEN}✅ Documentation created${NC}"

echo -e "${GREEN}🎉 TSA Monorepo setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Run 'yarn install' to install dependencies"
echo "2. Run 'yarn bootstrap' to set up all services"
echo "3. Run 'yarn dev' to start development"
echo "4. Set up remote git repository and push:"
echo "   git remote add origin https://github.com/your-org/tsa-monorepo.git"
echo "   git push -u origin main"
echo ""
echo -e "${YELLOW}📚 Learn more:${NC}"
echo "- Read the README.md for detailed instructions"
echo "- Check docs/ directory for architecture and guides"
echo "- Use 'yarn --help' to see all available scripts"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}" 