'use client';

import { useState, useEffect } from 'react';
import { adminAuth, authEventEmitter } from '@/lib/auth';

interface TokenStatusProps {
  showDetailed?: boolean;
  className?: string;
}

export default function TokenStatus({ showDetailed = false, className = '' }: TokenStatusProps) {
  const [sessionInfo, setSessionInfo] = useState(adminAuth.getSessionInfo());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Update session info when auth state changes
  useEffect(() => {
    const updateSessionInfo = () => {
      setSessionInfo(adminAuth.getSessionInfo());
    };

    // Update immediately
    updateSessionInfo();

    // Subscribe to auth state changes
    const unsubscribe = authEventEmitter.subscribe(updateSessionInfo);

    // Update every minute to keep expiry time current
    const interval = setInterval(updateSessionInfo, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setRefreshMessage(null);

    try {
      const result = await adminAuth.manualRefresh();
      
      if (result.success) {
        setRefreshMessage('✅ Session refreshed successfully');
        setTimeout(() => setRefreshMessage(null), 3000);
      } else {
        setRefreshMessage(`❌ ${result.error || 'Refresh failed'}`);
        setTimeout(() => setRefreshMessage(null), 5000);
      }
    } catch (error) {
      setRefreshMessage('❌ Refresh failed');
      setTimeout(() => setRefreshMessage(null), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!sessionInfo.isAuthenticated) {
    return null;
  }

  const getStatusColor = () => {
    if (!adminAuth.isSessionHealthy()) return 'text-red-600';
    if (sessionInfo.isExpiringSoon) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (!adminAuth.isSessionHealthy()) return '🔴';
    if (sessionInfo.isExpiringSoon) return '🟡';
    return '🟢';
  };

  if (!showDetailed) {
    // Compact view for header/navbar
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <span>{getStatusIcon()}</span>
        <span className={getStatusColor()}>
          Expires: {sessionInfo.expiresIn}
        </span>
        {sessionInfo.isExpiringSoon && sessionInfo.canRefresh && (
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="text-blue-600 hover:text-blue-800 underline"
            title="Refresh session"
          >
            {isRefreshing ? '⟳' : '↻'}
          </button>
        )}
      </div>
    );
  }

  // Detailed view for admin dashboard
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          {getStatusIcon()} Session Status
        </h3>
        {sessionInfo.canRefresh && (
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <span>{isRefreshing ? '⟳' : '↻'}</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {refreshMessage && (
        <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
          {refreshMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">Email:</span>
          <div className="text-gray-900">{sessionInfo.email}</div>
        </div>
        
        <div>
          <span className="font-medium text-gray-700">Expires In:</span>
          <div className={getStatusColor()}>{sessionInfo.expiresIn}</div>
        </div>
        
        <div>
          <span className="font-medium text-gray-700">Session Age:</span>
          <div className="text-gray-900">{sessionInfo.sessionAge}</div>
        </div>
        
        <div>
          <span className="font-medium text-gray-700">Last Refresh:</span>
          <div className="text-gray-900">{sessionInfo.lastRefresh}</div>
        </div>
      </div>

      {sessionInfo.isExpiringSoon && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-center">
            <span className="text-yellow-600 font-medium">⚠️ Session Expiring Soon</span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            Your session will expire in {sessionInfo.expiresIn}. 
            {sessionInfo.canRefresh && ' Consider refreshing to extend your session.'}
          </p>
        </div>
      )}

      {!adminAuth.isSessionHealthy() && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center">
            <span className="text-red-600 font-medium">🔴 Session Issues</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            Your session may have expired or become invalid. Please log in again if you experience issues.
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        Enhanced token management • Max duration: 24 hours • Auto-refresh enabled
      </div>
    </div>
  );
} 