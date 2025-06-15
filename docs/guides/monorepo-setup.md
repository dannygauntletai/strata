# TSA Monorepo Setup Guide

## Current Structure Analysis
```
tsa/
├── tsa-platform-frontend/          # Next.js React app
├── tsa-coach-backend/           # Node.js/Lambda backend
├── tsa-admin-frontend/          # Admin React app
├── tsa-admin-backend/          # Admin backend services
├── tsa-infrastructure/         # AWS CDK infrastructure
├── scripts/                    # Shared scripts
├── design_theme.md            # Shared documentation
├── database_schema.md         # Shared schemas
└── .cursorrules              # Shared development rules
```

## Solution 1: Git Submodules (Recommended)

### Benefits:
- ✅ Independent git history for each service
- ✅ Individual deployment pipelines
- ✅ Team can work on services independently
- ✅ Shared tooling and documentation in parent repo
- ✅ Flexible branching strategies per service

### Setup Process:

1. **Initialize Main TSA Repo:**
```bash
cd /Users/gauntletai/Desktop
git init tsa-monorepo
cd tsa-monorepo

# Copy shared files
cp ../tsa/*.md ./
cp ../tsa/.cursorrules ./
cp ../tsa/*.json ./
mkdir scripts
cp -r ../tsa/scripts/* ./scripts/
```

2. **Add Each Service as Submodule:**
```bash
# Initialize git repos for each service first
cd ../tsa/tsa-platform-frontend && git init && git add . && git commit -m "Initial commit"
cd ../tsa/tsa-coach-backend && git init && git add . && git commit -m "Initial commit"
cd ../tsa/tsa-admin-frontend && git init && git add . && git commit -m "Initial commit"
cd ../tsa/tsa-admin-backend && git init && git add . && git commit -m "Initial commit"
cd ../tsa/tsa-infrastructure && git init && git add . && git commit -m "Initial commit"

# Add as submodules
cd /Users/gauntletai/Desktop/tsa-monorepo
git submodule add ../tsa/tsa-platform-frontend services/coach-frontend
git submodule add ../tsa/tsa-coach-backend services/coach-backend
git submodule add ../tsa/tsa-admin-frontend services/admin-frontend
git submodule add ../tsa/tsa-admin-backend services/admin-backend
git submodule add ../tsa/tsa-infrastructure infrastructure
```

3. **Create Monorepo Structure:**
```bash
# Create workspace configuration
touch package.json
touch docker-compose.yml
mkdir .github/workflows
mkdir docs
```

## Solution 2: Nx Monorepo (Modern TypeScript/Node.js)

### Benefits:
- ✅ Advanced build system with caching
- ✅ Dependency graph visualization
- ✅ Code generation and linting
- ✅ Integrated testing framework
- ✅ Built-in CI/CD optimization

### Setup Process:
```bash
# Install Nx globally
npm install -g nx

# Create new Nx workspace
npx create-nx-workspace@latest tsa-monorepo --preset=empty

cd tsa-monorepo

# Add applications
nx g @nrwl/next:app coach-frontend
nx g @nrwl/node:app coach-backend
nx g @nrwl/next:app admin-frontend
nx g @nrwl/node:app admin-backend

# Add libraries for shared code
nx g @nrwl/workspace:lib shared-types
nx g @nrwl/workspace:lib shared-utils
```

## Solution 3: Lerna + Yarn Workspaces (JavaScript/TypeScript Focus)

### Benefits:
- ✅ Excellent package management
- ✅ Version management across services
- ✅ Shared dependencies optimization
- ✅ Independent publishing
- ✅ Mature ecosystem

### Setup Process:
```bash
# Initialize Lerna
npx lerna init
cd tsa-monorepo

# Configure package.json for workspaces
echo '{
  "name": "tsa-monorepo",
  "private": true,
  "workspaces": [
    "services/*",
    "packages/*"
  ],
  "devDependencies": {
    "lerna": "^6.0.0"
  }
}' > package.json

# Configure lerna.json
echo '{
  "version": "independent",
  "npmClient": "yarn",
  "useWorkspaces": true,
  "packages": [
    "services/*",
    "packages/*"
  ]
}' > lerna.json
```

## Solution 4: Git Subtrees (Simpler Alternative to Submodules)

### Benefits:
- ✅ Simpler than submodules
- ✅ No .gitmodules file to manage
- ✅ Complete history in main repo
- ✅ Easy cloning for new developers

### Setup Process:
```bash
# Create main repo
git init tsa-monorepo
cd tsa-monorepo

# Add each service as subtree
git subtree add --prefix=services/coach-frontend ../tsa/tsa-platform-frontend main --squash
git subtree add --prefix=services/coach-backend ../tsa/tsa-coach-backend main --squash
git subtree add --prefix=services/admin-frontend ../tsa/tsa-admin-frontend main --squash
git subtree add --prefix=services/admin-backend ../tsa/tsa-admin-backend main --squash
git subtree add --prefix=infrastructure ../tsa/tsa-infrastructure main --squash
```

## Recommended Folder Structure

```
tsa-monorepo/
├── .github/
│   ├── workflows/              # CI/CD pipelines
│   └── CODEOWNERS             # Code ownership
├── services/
│   ├── coach-frontend/        # Next.js app
│   ├── coach-backend/         # Lambda functions
│   ├── admin-frontend/        # Admin React app
│   └── admin-backend/         # Admin services
├── infrastructure/
│   ├── aws-cdk/              # CDK stacks
│   └── terraform/            # Alternative IaC
├── packages/                  # Shared libraries
│   ├── shared-types/         # TypeScript types
│   ├── shared-utils/         # Common utilities
│   └── design-system/        # UI components
├── tools/
│   ├── scripts/              # Build scripts
│   └── configs/              # Shared configs
├── docs/
│   ├── api/                  # API documentation
│   └── architecture/         # System architecture
├── docker-compose.yml        # Local development
├── package.json              # Workspace config
├── nx.json                   # Nx configuration (if using Nx)
├── lerna.json               # Lerna config (if using Lerna)
└── README.md                # Main documentation
```

## Shared Tooling Configuration

### Root package.json:
```json
{
  "name": "tsa-monorepo",
  "private": true,
  "scripts": {
    "dev": "concurrently \"yarn dev:coach\" \"yarn dev:admin\"",
    "dev:coach": "cd services/coach-frontend && npm run dev",
    "dev:admin": "cd services/admin-frontend && npm run dev",
    "build:all": "yarn build:coach && yarn build:admin",
    "test:all": "yarn test:coach && yarn test:admin",
    "deploy:coach": "cd services/coach-backend && npm run deploy",
    "deploy:admin": "cd services/admin-backend && npm run deploy",
    "infra:deploy": "cd infrastructure && cdk deploy --all"
  },
  "workspaces": [
    "services/*",
    "packages/*"
  ],
  "devDependencies": {
    "concurrently": "^7.6.0",
    "husky": "^8.0.3",
    "lint-staged": "^13.2.0"
  }
}
```

### Docker Compose for Local Development:
```yaml
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
    
  admin-frontend:
    build: ./services/admin-frontend
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/admin-frontend:/app
  
  coach-backend:
    build: ./services/coach-backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/coach-backend:/app
```

### GitHub Actions Workflow:
```yaml
name: TSA Monorepo CI/CD
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      coach-frontend: ${{ steps.changes.outputs.coach-frontend }}
      coach-backend: ${{ steps.changes.outputs.coach-backend }}
      admin-frontend: ${{ steps.changes.outputs.admin-frontend }}
      admin-backend: ${{ steps.changes.outputs.admin-backend }}
    steps:
      - uses: actions/checkout@v3
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

  build-coach-frontend:
    needs: changes
    if: ${{ needs.changes.outputs.coach-frontend == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Coach Frontend
        run: |
          cd services/coach-frontend
          npm ci
          npm run build
```

## Migration Steps for Your Current Setup

1. **Backup Current Work:**
```bash
cp -r /Users/gauntletai/Desktop/tsa /Users/gauntletai/Desktop/tsa-backup
```

2. **Choose Your Approach:**
   - **Submodules**: Best for independent teams
   - **Nx**: Best for TypeScript/modern tooling
   - **Lerna**: Best for package publishing
   - **Subtrees**: Best for simplicity

3. **Execute Migration:**
   Follow the setup process for your chosen approach

4. **Update Development Workflow:**
   - Update CI/CD pipelines
   - Configure shared tooling
   - Set up development environment

## Team Workflow Benefits

- **Unified Development**: Single repo to clone
- **Shared Tooling**: Common linting, testing, building
- **Cross-Service Refactoring**: Easy to update shared types
- **Atomic Changes**: Single PR can update multiple services
- **Simplified Deployment**: Orchestrate all services from one place

Would you like me to implement any of these approaches for your TSA project? 