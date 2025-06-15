'use client';

import { useState } from 'react';
import { adminAuth } from '@/lib/auth';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    
    try {
      const result = await adminAuth.sendMagicLink(email);
      
      if (result.success) {
        setIsSubmitted(true);
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setError(result.error || 'Failed to send login link');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  if (isSubmitted) {
  return (
      <div className="max-w-md w-full space-y-8">
        {/* TSA Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
            alt="Texas Sports Academy"
            className="h-16 w-auto"
          />
        </div>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-green-800 text-xl font-semibold mb-2">Check Your Email</h2>
          
          <p className="text-green-700 mb-3">
            We've sent a secure login link to <strong>{email}</strong>
          </p>
          
          <p className="text-green-600 text-sm mb-4">
            Click the link in your email to sign in. The link will expire in 15 minutes.
          </p>
          
          <button 
            onClick={() => {
              setIsSubmitted(false);
              setEmail('');
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Send Another Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full space-y-8">
      {/* TSA Logo */}
      <div className="flex justify-center mb-6">
        <img 
          src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
          alt="Texas Sports Academy"
          className="h-16 w-auto"
        />
      </div>

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email to receive a secure login link
          </p>
        </div>

      <form className="mt-8 space-y-6" onSubmit={handleSendMagicLink}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Admin email address"
            />
          </div>

          {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
            Send Login Link
            </button>
          </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Only authorized administrators can access this portal
            </p>
          </div>
        </form>
    </div>
  );
} 