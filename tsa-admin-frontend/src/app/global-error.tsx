'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <h1 className="text-6xl font-bold text-red-600 mb-4">Error</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Application Error</h2>
              <p className="text-gray-500 mb-8">
                A critical error occurred. Please reload the page.
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={reset}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors mr-4"
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Go Home
              </button>
              
              <div className="text-sm text-gray-500 mt-4">
                If this problem persists, please contact support.
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 