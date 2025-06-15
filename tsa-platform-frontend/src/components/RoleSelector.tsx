'use client';

import { useState } from 'react';
import { coachAuth } from '@/lib/auth';

interface RoleSelectorProps {
  onRoleSelect: (role: 'coach' | 'parent') => void;
}

export default function RoleSelector({ onRoleSelect }: RoleSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'coach' | 'parent' | null>(null);

  const user = coachAuth.getCurrentUser();
  const availableRoles = coachAuth.getUserRoles();

  const handleRoleSelection = async (role: 'coach' | 'parent') => {
    setIsLoading(true);
    setSelectedRole(role);
    
    try {
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      onRoleSelect(role);
    } catch (error) {
      console.error('Error selecting role:', error);
      setIsLoading(false);
      setSelectedRole(null);
    }
  };

  const getRoleDescription = (role: 'coach' | 'parent') => {
    switch (role) {
      case 'coach':
        return {
          title: 'Coach Portal',
          description: 'Access coaching tools, manage students, view schedules, and track progress',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
          color: 'from-blue-500 to-blue-600',
          hoverColor: 'from-blue-600 to-blue-700'
        };
      case 'parent':
        return {
          title: 'Parent Portal',
          description: 'View your child\'s progress, schedules, and communicate with coaches',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
          color: 'from-green-500 to-green-600',
          hoverColor: 'from-green-600 to-green-700'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {selectedRole === 'coach' ? 'Loading Coach Portal...' : 'Loading Parent Portal...'}
          </h2>
          <p className="text-gray-600">Setting up your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg"
              alt="Texas Sports Academy"
              className="h-16 w-auto"
            />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || user?.email}!
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            You have access to multiple portals. Please choose how you'd like to continue:
          </p>
          <p className="text-sm text-gray-500">
            You can switch between portals anytime from your account settings.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {availableRoles.map((role) => {
            const roleInfo = getRoleDescription(role);
            return (
              <button
                key={role}
                onClick={() => handleRoleSelection(role)}
                className={`
                  relative p-8 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl
                  bg-gradient-to-br ${roleInfo.color} hover:${roleInfo.hoverColor}
                  text-white group focus:outline-none focus:ring-4 focus:ring-blue-300
                `}
                disabled={isLoading}
              >
                <div className="text-center">
                  <div className="flex justify-center mb-4 text-white/90 group-hover:text-white transition-colors">
                    {roleInfo.icon}
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3">
                    {roleInfo.title}
                  </h3>
                  
                  <p className="text-white/90 group-hover:text-white transition-colors text-sm leading-relaxed">
                    {roleInfo.description}
                  </p>
                  
                  <div className="mt-6 flex items-center justify-center">
                    <span className="text-sm font-medium">Continue as {role === 'coach' ? 'Coach' : 'Parent'}</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Need help? Contact support at{' '}
            <a href="mailto:support@texassportsacademy.com" className="text-blue-600 hover:text-blue-700">
              support@texassportsacademy.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 