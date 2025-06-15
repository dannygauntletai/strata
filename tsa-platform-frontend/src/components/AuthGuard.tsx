'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { coachAuth, authEventEmitter } from '@/lib/auth';
import { getInvitationTokenFromURL } from '@/lib/invitation-api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Define routes that don't require authentication
  const isPublicRoute = (path: string): boolean => {
    const publicRoutes = [
      '/login',
      '/verify', 
      '/',
      '/interest-form',
      '/event-interest-form'
    ];
    
    const publicPrefixes = [
      '/(auth)',
      '/api/',
      '/_next/',
      '/favicon',
      '/images',
      '/static'
    ];
    
    return publicRoutes.includes(path) || 
           publicPrefixes.some(prefix => path.startsWith(prefix));
  };

  // Check if route is onboarding-related and has valid invitation
  const isValidOnboardingRoute = (path: string): boolean => {
    if (!path.startsWith('/onboarding') && !path.startsWith('/(setup)')) {
      return false;
    }
    
    // Check for invitation token in URL or cached
    const invitationToken = getInvitationTokenFromURL();
    return !!invitationToken;
  };

  // Handle redirects in a separate useEffect to avoid render-time navigation
  useEffect(() => {
    if (shouldRedirectToLogin && !isLoading && !isVerifying && !isValidatingToken) {
      router.push('/login');
      setShouldRedirectToLogin(false);
    }
  }, [shouldRedirectToLogin, isLoading, isVerifying, isValidatingToken, router]);

  useEffect(() => {
    const initializeAuth = () => {
      // Allow public routes without any auth check
      if (isPublicRoute(pathname)) {
        setIsLoading(false);
        return;
      }

      // Allow onboarding routes with valid invitation tokens
      if (isValidOnboardingRoute(pathname)) {
        console.log('🎫 AuthGuard: Allowing access to onboarding route with valid invitation');
        setIsLoading(false);
        return;
      }

      // For all other routes, proceed with authentication flow
      performAuthCheck();
    };

    const performAuthCheck = async () => {
      // Check if user is already authenticated locally
      const authState = coachAuth.getAuthState();

      if (authState.isAuthenticated) {
        // Validate the stored token with the server
        setIsValidatingToken(true);
        const isTokenValid = await coachAuth.validateStoredToken();
        setIsValidatingToken(false);

        if (isTokenValid) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } else {
          // Token was invalid and user was logged out
          // Continue to check for magic link or redirect to login
        }
      }

      // Handle magic link verification if token is present
      const token = searchParams.get('token');
      const verifyEmail = searchParams.get('email');
      const role = searchParams.get('role');
      
      if (token && verifyEmail) {
        await handleTokenVerification(token, verifyEmail, role);
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const unsubscribe = authEventEmitter.subscribe((newAuthState) => {
      setIsAuthenticated(newAuthState.isAuthenticated);
      
      if (newAuthState.isAuthenticated && pathname === '/login') {
        // Redirect to dashboard if user logs in while on login page
        router.push('/');
      } else if (!newAuthState.isAuthenticated && 
                 !isPublicRoute(pathname) && 
                 !isValidOnboardingRoute(pathname)) {
        // Schedule redirect to login if user logs out while on protected page
        // but not for public routes or valid onboarding routes
        setShouldRedirectToLogin(true);
      }
    });

    return unsubscribe;
  }, [searchParams, pathname, router]);

  const handleTokenVerification = async (token: string, verifyEmail: string, role?: string | null) => {
    setIsVerifying(true);

    try {
      const result = await coachAuth.verifyToken(token, verifyEmail, role || undefined);
      
      if (result.success) {
        // Clear URL parameters and redirect to home for role-based routing
        window.history.replaceState({}, '', '/');
        router.push('/');
      } else {
        // Schedule redirect to login with error
        setShouldRedirectToLogin(true);
      }
    } catch (err) {
      // Schedule redirect to login on error
      setShouldRedirectToLogin(true);
    } finally {
      setIsVerifying(false);
      setIsLoading(false);
    }
  };

  // Show loading spinner during initialization, token verification, or token validation
  if (isLoading || isVerifying || isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isVerifying 
              ? 'Verifying your login...' 
              : isValidatingToken 
              ? 'Validating session...' 
              : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Allow access to public routes and valid onboarding routes without authentication
  if (isPublicRoute(pathname) || isValidOnboardingRoute(pathname)) {
    return <>{children}</>;
  }

  // Show loading while redirect is pending to avoid flash of content
  if (shouldRedirectToLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect will happen via useEffect)
  if (!isAuthenticated) {
    setShouldRedirectToLogin(true);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
} 