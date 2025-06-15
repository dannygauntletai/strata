'use client'

import { logout, getCurrentUser } from '@/lib/auth'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  Cog8ToothIcon,
  UserCircleIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/16/solid'
import {
  HomeIcon,
  CalendarDaysIcon,
  DocumentIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
} from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ParentPortalLayoutProps {
  children: React.ReactNode
}

export default function ParentPortalLayout({ children }: ParentPortalLayoutProps) {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string } | null>(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    try {
      const user = getCurrentUser()
      setCurrentUser(user)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }, [])

  const getUserDisplayName = () => {
    try {
      if (!currentUser) return 'Parent'
      if (currentUser.name) return currentUser.name
      return currentUser.email.split('@')[0] || 'Parent'
    } catch (error) {
      return 'Parent'
    }
  }

  const handleSignOut = () => {
    logout()
  }

  // Navigation items based on TSA design theme
  const navigation = [
    { name: 'Dashboard', href: '/parent', icon: HomeIcon, current: pathname === '/parent' },
    { name: 'Documents', href: '/parent/documents', icon: DocumentIcon, current: pathname === '/parent/documents' },
    { name: 'Messages', href: '/parent/messages', icon: ChatBubbleLeftIcon, current: pathname === '/parent/messages' },
    { name: 'Schedule', href: '/parent/schedule', icon: CalendarDaysIcon, current: pathname === '/parent/schedule' },
    { name: 'Timeline', href: '/parent/timeline', icon: ClockIcon, current: pathname === '/parent/timeline' },
    { name: 'Enrollment', href: '/parent/enrollment', icon: AcademicCapIcon, current: pathname === '/parent/enrollment' },
    { name: 'Support', href: '/parent/support', icon: ShieldCheckIcon, current: pathname === '/parent/support' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TSA Professional Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* TSA Logo & Branding */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img 
                  src="https://d6mzuygjyhq8s.cloudfront.net/images/TSA%20Final%20Logos%20-%20CMYK-01.svg" 
                  alt="Texas Sports Academy"
                  className="h-10 w-auto"
                />
              </div>
            </div>

            {/* Desktop Navigation - TSA Theme */}
            <nav className="hidden md:flex space-x-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    item.current
                      ? 'bg-[#004aad] text-white shadow-md'
                      : 'text-gray-700 hover:text-[#004aad] hover:bg-blue-50 border border-transparent hover:border-blue-200'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              {/* Notifications - TSA Style */}
              <button className="relative p-2 text-gray-600 hover:text-[#004aad] hover:bg-blue-50 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200">
                <BellIcon className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  3
                </span>
              </button>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-gray-600 hover:text-[#004aad] hover:bg-blue-50 rounded-lg transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <Bars3Icon className="h-5 w-5" />
                )}
              </button>

              {/* User Menu - TSA Design */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 p-2 text-gray-700 hover:text-[#004aad] hover:bg-blue-50 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200"
                >
                  <div className="h-8 w-8 bg-[#004aad] rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-white text-sm font-bold">
                      {getUserDisplayName()[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-gray-900">{getUserDisplayName()}</p>
                    <p className="text-xs text-gray-600">Parent Portal</p>
                  </div>
                  <ChevronDownIcon className="h-4 w-4" />
                </button>

                {/* User Dropdown - TSA Style */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{getUserDisplayName()}</p>
                      <p className="text-xs text-gray-600">{currentUser?.email}</p>
                    </div>
                    <Link href="/parent/profile" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#004aad] transition-colors">
                      <UserCircleIcon className="h-4 w-4 mr-3" />
                      My Profile
                    </Link>
                    <Link href="/parent/settings" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#004aad] transition-colors">
                      <Cog8ToothIcon className="h-4 w-4 mr-3" />
                      Settings
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <ArrowRightStartOnRectangleIcon className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Navigation - TSA Theme */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 bg-gray-50/50">
              <nav className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      item.current
                        ? 'bg-[#004aad] text-white shadow-md'
                        : 'text-gray-700 hover:text-[#004aad] hover:bg-blue-50 border border-transparent hover:border-blue-200'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - TSA Layout */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
} 