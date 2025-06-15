# 🏫 TSA Monorepo Solutions

## Your Question: "Is it possible to have one giant repo for @/tsa? But maintain a git repo in each folder for tracking?"

**Answer: YES! Absolutely possible.** Here are 4 proven approaches:

---

## 🎯 **Solution 1: Git Submodules (RECOMMENDED)**

### Current TSA Structure → Monorepo Structure
```
BEFORE:                          AFTER:
tsa/                            tsa-monorepo/
├── tsa-platform-frontend/         ├── services/
├── tsa-coach-backend/          │   ├── coach-frontend/     (git submodule)
├── tsa-admin-frontend/         │   ├── coach-backend/      (git submodule)
├── tsa-admin-backend/          │   ├── admin-frontend/     (git submodule)
├── tsa-infrastructure/         │   └── admin-backend/      (git submodule)
└── docs/                       ├── infrastructure/         (git submodule)
                                ├── packages/               (shared libs)
                                ├── docs/                   (unified docs)
                                └── tools/                  (shared tools)
```

### Benefits:
- ✅ **Individual git history** for each service
- ✅ **Unified development experience** with shared scripts
- ✅ **Independent deployment** pipelines
- ✅ **Team autonomy** - work on services independently
- ✅ **Shared tooling** - linting, testing, building from root

### Implementation Commands:
```bash
# 1. Create monorepo
mkdir tsa-monorepo && cd tsa-monorepo
git init

# 2. Add each service as git submodule
git submodule add ../tsa/tsa-platform-frontend services/coach-frontend
git submodule add ../tsa/tsa-coach-backend services/coach-backend
git submodule add ../tsa/tsa-admin-frontend services/admin-frontend
git submodule add ../tsa/tsa-admin-backend services/admin-backend
git submodule add ../tsa/tsa-infrastructure infrastructure

# 3. Create unified package.json with workspace scripts
# (See package.json example below)

# 4. Clone with submodules (for new developers)
git clone --recursive https://github.com/your-org/tsa-monorepo.git
```

---

## 🎯 **Solution 2: Nx Monorepo (MODERN)**

### Benefits:
- ✅ **Advanced build system** with intelligent caching
- ✅ **Dependency graph** visualization
- ✅ **Code sharing** between services
- ✅ **Integrated testing** and linting
- ✅ **Optimized CI/CD** with affected builds only

### Setup:
```bash
npx create-nx-workspace@latest tsa-monorepo --preset=empty

# Migrate existing services
nx g @nrwl/next:app coach-frontend
nx g @nrwl/node:app coach-backend
nx g @nrwl/react:app admin-frontend
nx g @nrwl/node:app admin-backend

# Generate shared libraries
nx g @nrwl/workspace:lib shared-types
nx g @nrwl/workspace:lib shared-utils
```

---

## 🎯 **Solution 3: Lerna + Yarn Workspaces**

### Benefits:
- ✅ **Package management** across services
- ✅ **Version management** and publishing
- ✅ **Dependency optimization** (shared node_modules)
- ✅ **Independent publishing** of packages

### Setup:
```bash
npx lerna init
yarn init -w  # Initialize workspaces

# Configure lerna.json
{
  "version": "independent",
  "npmClient": "yarn", 
  "useWorkspaces": true,
  "packages": ["services/*", "packages/*"]
}
```

---

## 🎯 **Solution 4: Git Subtrees (SIMPLE)**

### Benefits:
- ✅ **Simpler than submodules** (no .gitmodules)
- ✅ **Complete history** in main repo
- ✅ **Easy cloning** for new developers
- ❌ More complex for maintaining separate repos

### Implementation:
```bash
git subtree add --prefix=services/coach-frontend ../tsa/tsa-platform-frontend main
git subtree add --prefix=services/coach-backend ../tsa/tsa-coach-backend main
git subtree add --prefix=services/admin-frontend ../tsa/tsa-admin-frontend main
git subtree add --prefix=services/admin-backend ../tsa/tsa-admin-backend main
```

---

## 🚀 **Recommended Monorepo Structure**

```
tsa-monorepo/
├── .github/
│   ├── workflows/              # Unified CI/CD
│   │   ├── coach-frontend.yml  # Service-specific builds
│   │   ├── coach-backend.yml   # Deploy only when changed
│   │   ├── admin-services.yml  # Parallel deployments
│   │   └── infrastructure.yml  # Infrastructure changes
│   └── CODEOWNERS             # Service ownership
├── services/                   # Microservices (git submodules)
│   ├── coach-frontend/        # Next.js → Independent git repo
│   ├── coach-backend/         # Lambda → Independent git repo
│   ├── admin-frontend/        # React → Independent git repo
│   └── admin-backend/         # Lambda → Independent git repo
├── infrastructure/            # AWS CDK → Independent git repo
├── packages/                  # Shared libraries
│   ├── shared-types/         # TypeScript interfaces
│   ├── shared-utils/         # Common utilities  
│   └── design-system/        # UI components
├── tools/
│   ├── scripts/              # Build and deployment scripts
│   └── configs/              # Shared configurations
├── docs/
│   ├── api/                  # API documentation
│   ├── architecture/         # System design
│   └── deployment/           # Operations guides
├── package.json              # Unified scripts and dependencies
├── docker-compose.yml        # Local development environment
├── tsconfig.json            # Shared TypeScript config
└── .cursorrules             # Shared development rules
```

---

## 📋 **Unified Package.json Example**

```json
{
  "name": "tsa-monorepo",
  "private": true,
  "workspaces": ["services/*", "packages/*"],
  "scripts": {
    "dev": "concurrently \"yarn dev:coach\" \"yarn dev:admin\"",
    "dev:coach": "cd services/coach-frontend && npm run dev",
    "dev:admin": "cd services/admin-frontend && npm run dev",
    
    "build:all": "yarn build:coach && yarn build:admin",
    "build:coach": "cd services/coach-frontend && npm run build",
    "build:admin": "cd services/admin-frontend && npm run build",
    
    "test:all": "yarn test:coach && yarn test:admin",
    "test:coach": "cd services/coach-frontend && npm test",
    "test:admin": "cd services/admin-frontend && npm test",
    
    "deploy:all": "yarn deploy:infra && yarn deploy:services",
    "deploy:infra": "cd infrastructure && cdk deploy --all",
    "deploy:coach": "cd services/coach-backend && npm run deploy",
    "deploy:admin": "cd services/admin-backend && npm run deploy",
    
    "bootstrap": "yarn install && yarn install:services && yarn build:all"
  }
}
```

---

## 🔄 **Development Workflow**

### For Individual Services:
```bash
# Work in a specific service (maintains independent git history)
cd services/coach-frontend
git checkout -b feature/new-dashboard
# Make changes...
git commit -m "feat: add new dashboard feature"
git push origin feature/new-dashboard

# Update parent monorepo to point to new commit
cd ../../
git add services/coach-frontend
git commit -m "update: coach-frontend with new dashboard"
```

### For Cross-Service Changes:
```bash
# Make changes across multiple services
cd services/shared-types
# Update types...
git commit -m "update: add new user interface"

cd ../coach-frontend
# Use new types...
git commit -m "feat: implement new user interface"

cd ../admin-frontend  
# Use new types...
git commit -m "feat: implement new user interface"

# Update monorepo to include all changes
cd ../../
git add services/shared-types services/coach-frontend services/admin-frontend
git commit -m "feat: implement new user interface across services"
```

---

## 🚀 **CI/CD Benefits**

### Smart Builds (Only Build What Changed):
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]

jobs:
  detect-changes:
    outputs:
      coach-frontend: ${{ steps.changes.outputs.coach-frontend }}
      coach-backend: ${{ steps.changes.outputs.coach-backend }}
      admin-frontend: ${{ steps.changes.outputs.admin-frontend }}
      admin-backend: ${{ steps.changes.outputs.admin-backend }}
    steps:
      - uses: dorny/paths-filter@v2
        with:
          filters: |
            coach-frontend: 'services/coach-frontend/**'
            coach-backend: 'services/coach-backend/**'
            admin-frontend: 'services/admin-frontend/**'
            admin-backend: 'services/admin-backend/**'

  build-coach-frontend:
    if: needs.detect-changes.outputs.coach-frontend == 'true'
    # Only runs when coach-frontend changes
```

### Parallel Deployments:
```bash
# Deploy only changed services in parallel
yarn deploy:coach &    # If coach services changed
yarn deploy:admin &    # If admin services changed
wait                   # Wait for all deployments
```

---

## 💡 **For Your TSA Project - Recommendation**

### **Use Git Submodules** because:

1. **Your current structure is perfect** for this approach
2. **Independent teams** can work on coach vs admin services
3. **Separate deployment cycles** (coach features vs admin features)
4. **Shared documentation and tooling** in parent repo
5. **Easy migration** from your current setup

### **Migration Steps:**
1. Create new `tsa-monorepo` directory
2. Add each service as git submodule
3. Create unified `package.json` with workspace scripts
4. Set up shared configurations (TypeScript, ESLint, etc.)
5. Create CI/CD workflows for smart building
6. Update team workflow to use monorepo scripts

### **Result:**
- ✅ One repo to clone: `git clone --recursive tsa-monorepo`
- ✅ Unified development: `yarn dev` starts everything
- ✅ Independent git history: Each service maintains its own commits
- ✅ Smart CI/CD: Only builds and deploys changed services
- ✅ Shared tooling: Common linting, testing, building rules
- ✅ Cross-service refactoring: Easy to update shared types

**This gives you the best of both worlds: monorepo convenience with microservice independence!** 🎉 