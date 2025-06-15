'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { adminAuth, authEventEmitter } from '@/lib/auth';
import Navigation from '@/components/Navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

function AuthGuardContent({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Handle redirects in a separate useEffect to avoid render-time navigation
  useEffect(() => {
    if (shouldRedirectToLogin && !isLoading && !isVerifying && !isValidatingToken) {
      router.push('/login');
      setShouldRedirectToLogin(false);
    }
  }, [shouldRedirectToLogin, isLoading, isVerifying, isValidatingToken, router]);

  useEffect(() => {
    const initializeAuth = async () => {
      // Skip token verification if we're on the verify page - let it handle its own verification
      if (pathname === '/verify') {
        console.log('🛡️ AuthGuard: Skipping verification for /verify page');
        setIsLoading(false);
        return;
      }

      // Check if user is already authenticated locally
      const authState = adminAuth.getAuthState();
      
      if (authState.isAuthenticated) {
        // Validate the stored token with the server
        setIsValidatingToken(true);
        try {
        const isTokenValid = await adminAuth.validateStoredToken();
        setIsValidatingToken(false);
        
        if (isTokenValid) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } else {
          // Token was invalid and user was logged out
          // Continue to check for magic link or redirect to login
            console.log('🔒 AuthGuard: Token validation failed, proceeding to login flow');
          }
        } catch (error) {
          // Token validation threw an error - for security, treat as invalid
          console.error('🔒 AuthGuard: Token validation error:', error);
          setIsValidatingToken(false);
          // Continue to login flow
        }
      }

      // Handle magic link verification if token is present (but not on verify page)
      const token = searchParams.get('token');
      const verifyEmail = searchParams.get('email');
      
      if (token && verifyEmail && pathname !== '/verify') {
        await handleTokenVerification(token, verifyEmail);
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const unsubscribe = authEventEmitter.subscribe((newAuthState) => {
      console.log('🛡️ AuthGuard: Auth state changed', { 
        isAuthenticated: newAuthState.isAuthenticated, 
        email: newAuthState.email,
        pathname,
        currentlyAuthenticated: isAuthenticated
      });
      
      setIsAuthenticated(newAuthState.isAuthenticated);
      
      if (newAuthState.isAuthenticated && pathname === '/login') {
        // Redirect to dashboard if user logs in while on login page
        console.log('🛡️ AuthGuard: Redirecting from login to dashboard');
        router.push('/');
      } else if (!newAuthState.isAuthenticated && pathname !== '/login' && pathname !== '/verify') {
        // Schedule redirect to login if user logs out while on protected page (but not from verify page)
        console.log('🛡️ AuthGuard: Scheduling redirect to login');
        setShouldRedirectToLogin(true);
      }
    });

    return unsubscribe;
  }, [searchParams, pathname, router, isAuthenticated]);

  const handleTokenVerification = async (token: string, verifyEmail: string) => {
    setIsVerifying(true);

    try {
      const result = await adminAuth.verifyToken(token, verifyEmail);
      
      if (result.success) {
        // Clear URL parameters and redirect to dashboard
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

  // Allow access to login and verify pages without authentication and without navigation
  if (pathname === '/login' || pathname === '/verify') {
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

  // Render protected content with navigation
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="py-6">
        {children}
      </main>
    </div>
  );
}

export default function AuthGuard({ children }: AuthGuardProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthGuardContent>{children}</AuthGuardContent>
    </Suspense>
  );
} 