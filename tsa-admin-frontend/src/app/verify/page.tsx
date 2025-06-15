'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminAuth } from '@/lib/auth';
import { Suspense } from 'react';

function VerifyContent() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [verificationParams, setVerificationParams] = useState<{token: string | null, email: string | null, role: string | null} | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Capture parameters immediately when component mounts
  useEffect(() => {
    if (!verificationParams) {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      const role = searchParams.get('role');
      
      console.log('📋 Capturing verification parameters:', { 
        token: token?.substring(0, 8) + '...', 
        email, 
        role,
        currentUrl: window.location.href
      });
      
      setVerificationParams({ token, email, role });
    }
  }, [searchParams, verificationParams]);

  useEffect(() => {
    const verifyMagicLink = async () => {
      // Prevent multiple runs
      if (hasRun || !verificationParams) return;
      setHasRun(true);

      try {
        // Use captured parameters instead of reading from URL again
        const { token, email, role } = verificationParams;

        console.log('🔐 Magic link verification started', { 
          token: token?.substring(0, 8) + '...', 
          email, 
          role,
          hasParams: !!(token && email),
          currentUrl: window.location.href,
          searchParamsString: searchParams.toString()
        });

        // Validate required parameters
        if (!token || !email) {
          console.error('❌ Missing required parameters:', { 
            hasToken: !!token, 
            hasEmail: !!email,
            currentUrl: window.location.href,
            searchParamsString: searchParams.toString(),
            allParams: Object.fromEntries(searchParams.entries())
          });
          
          // Check if user is already authenticated before showing error
          const currentAuthState = adminAuth.getAuthState();
          if (currentAuthState.isAuthenticated) {
            console.log('✅ User already authenticated, redirecting to dashboard instead of showing error');
            setStatus('success');
            setTimeout(() => {
              router.push('/');
            }, 1000);
            return;
          }
          
          setError('Invalid magic link. Missing token or email. Please use the link from your email.');
          setStatus('error');
          
          // Redirect to login after showing error
          setTimeout(() => {
            router.push('/login?error=Invalid magic link. Please request a new one.');
          }, 3000);
          return;
        }

        // Validate that this is for admin access
        if (role && role !== 'admin') {
          console.error('❌ Invalid role for admin access:', role);
          setError('This link is not valid for admin access.');
          setStatus('error');
          return;
        }

        // Check if user is already authenticated with the same email
        const currentAuthState = adminAuth.getAuthState();
        if (currentAuthState.isAuthenticated && currentAuthState.email === email.toLowerCase().trim()) {
          console.log('✅ User already authenticated with same email, redirecting to dashboard');
          setStatus('success');
          
          // Redirect immediately without clearing URL (no need to re-verify)
          setTimeout(() => {
            router.push('/');
          }, 1000);
          return;
        }

        // Verify token with backend
        console.log('🔄 Starting token verification...');
        const result = await adminAuth.verifyToken(token, email);

        if (result.success) {
          console.log('✅ Magic link verification successful');
          setStatus('success');
          
          // Redirect to admin dashboard after a brief success message
          setTimeout(() => {
            console.log('🔄 Redirecting to dashboard...');
            router.push('/');
          }, 1500);
        } else {
          console.error('❌ Magic link verification failed:', result.error);
          setError(result.error || 'Authentication failed');
          setStatus('error');
          
          // Redirect to login with error after 3 seconds
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(result.error || 'Authentication failed')}`);
          }, 3000);
        }
      } catch (err) {
        console.error('💥 Magic link verification error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Network error. Please try again.';
        setError(errorMessage);
        setStatus('error');
        
        // Redirect to login with error after 3 seconds
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(errorMessage)}`);
        }, 3000);
      }
    };

    // Only run verification once when component mounts and params are available
    if (status === 'verifying' && !hasRun && verificationParams) {
      verifyMagicLink();
    }
  }, [router, status, hasRun, verificationParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        {/* TSA Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
            alt="Texas Sports Academy"
            className="h-16 w-auto"
          />
        </div>

        {/* Status Content */}
        {status === 'verifying' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
            
            <h2 className="text-blue-800 text-xl font-semibold mb-2">Verifying Access</h2>
            <p className="text-blue-700">
              Please wait while we verify your magic link...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-green-800 text-xl font-semibold mb-2">Access Granted</h2>
            <p className="text-green-700 mb-3">
              Welcome to the TSA Admin Portal!
            </p>
            <p className="text-green-600 text-sm">
              Redirecting to your dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-red-800 text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-red-700 mb-3">
              {error}
            </p>
            <p className="text-red-600 text-sm mb-4">
              Redirecting to login page...
            </p>
            
            <button 
              onClick={() => router.push('/login')}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
} 