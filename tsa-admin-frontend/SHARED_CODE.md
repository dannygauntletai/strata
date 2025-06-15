# Shared Code Documentation

This document tracks shared code patterns and components across the TSA Admin Frontend to avoid duplication and maintain consistency.

## Navigation Component Sharing

### Pattern: AuthGuard-Level Navigation
**Location**: `src/components/AuthGuard.tsx`
**Purpose**: Provides shared navigation across all authenticated pages

**Implementation**:
- Navigation component is rendered at the AuthGuard level
- Automatically included on all authenticated pages except `/login`
- Eliminates need to import Navigation on individual pages
- Provides consistent layout structure with `min-h-screen bg-gray-50` wrapper

**Benefits**:
- Single source of truth for navigation
- Consistent layout across all pages
- Reduced code duplication
- Easier maintenance and updates

**Usage**:
```tsx
// ❌ Don't do this on individual pages
import Navigation from '@/components/Navigation'

export default function SomePage() {
  return (
    <>
      <Navigation />
      <div>Page content</div>
    </>
  )
}

// ✅ Navigation is automatically provided by AuthGuard
export default function SomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      Page content
    </div>
  )
}
```

## Authentication Patterns

### Pattern: Centralized Auth State Management
**Location**: `src/lib/auth.ts`
**Components**: `adminAuth`, `authEventEmitter`

**Shared Features**:
- Token storage with encryption
- Automatic token refresh
- Event-driven auth state updates
- Server-side token validation

## API Configuration

### Pattern: Environment-Based Configuration
**Location**: `src/config/generated-config.json` (generated)
**Source**: SSM Parameter Store with fallbacks

**Shared Endpoints**:
- Admin API: `adminApi`
- Coach API: `coachApi` 
- Passwordless Auth: `passwordlessAuth`

## Error Handling Patterns

### Pattern: Consistent Error Typing
**Usage**: Always type error parameters in catch blocks
```tsx
// ✅ Correct error handling
try {
  // API call
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : String(err)
  setError(errorMessage)
}
```

### Pattern: Null Coalescing for Optional Properties
```tsx
// ✅ Safe property access
const totalInvitations = analytics?.total_invitations ?? 0
```

## React Patterns

### Pattern: Navigation During Render Prevention
**Issue**: Cannot call `router.push()` during component render
**Solution**: Use state flags and separate useEffect

```tsx
// ✅ Correct navigation pattern
const [shouldRedirect, setShouldRedirect] = useState(false)

// Schedule redirect with state flag
if (someCondition) {
  setShouldRedirect(true)
}

// Handle redirect in separate useEffect
useEffect(() => {
  if (shouldRedirect) {
    router.push('/target-page')
    setShouldRedirect(false)
  }
}, [shouldRedirect, router])
```

## UI Patterns

### Pattern: Loading States
**Standard Loading Component**:
```tsx
<div className="min-h-screen flex items-center justify-center bg-gray-50">
  <div className="text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
    <p className="text-gray-600">Loading message...</p>
  </div>
</div>
```

### Pattern: Card Layout with Sticky Buttons
**Rule**: Always stick buttons to bottom of cards
```tsx
<div className="bg-white p-6 rounded-lg shadow flex flex-col h-full">
  <div className="flex-grow">
    {/* Card content */}
  </div>
  <div className="mt-auto">
    <button className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
      Action Button
    </button>
  </div>
</div>
```

## Next.js Patterns

### Pattern: Suspense Boundaries
**Rule**: Wrap components using `useSearchParams()` in Suspense boundaries
```tsx
<Suspense fallback={<LoadingComponent />}>
  <ComponentUsingSearchParams />
</Suspense>
```

## Maintenance Notes

- When adding new pages, ensure Navigation is NOT imported individually
- AuthGuard handles all layout structure for authenticated pages
- Login page is excluded from Navigation automatically
- All shared patterns should be documented here to prevent duplication 