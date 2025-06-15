'use client'

import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/sidebar'
import { SidebarLayout } from '@/components/sidebar-layout'
import { getEvents } from '@/data'
import { getCurrentUser, logout, type AuthUser, getAuthHeader } from '@/lib/auth'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  LockClosedIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/16/solid'
import {
  Cog6ToothIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Square2StackIcon,
  TicketIcon,
  BuildingOffice2Icon,
  ShoppingBagIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CameraIcon,
  ScaleIcon,
  ClipboardDocumentListIcon,
  PhoneIcon,
  EyeIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
  DocumentIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  BanknotesIcon,
  CreditCardIcon,
  AcademicCapIcon as GraduationIcon,
} from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { config } from '@/config/environments'

function AccountDropdownMenu({ anchor }: { anchor: 'top start' | 'bottom end' }) {
  const handleSignOut = () => {
    logout()
  }

  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="/coach/settings">
        <UserCircleIcon />
        <DropdownLabel>My account</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="#">
        <ShieldCheckIcon />
        <DropdownLabel>Privacy policy</DropdownLabel>
      </DropdownItem>
      <DropdownItem href="#">
        <LightBulbIcon />
        <DropdownLabel>Share feedback</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem onClick={handleSignOut}>
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

function ApplicationsDropdown({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <Dropdown>
      <DropdownButton as={SidebarItem} data-tour="applications-section">
        <DocumentArrowUpIcon className="h-8 w-8" />
        {!isCollapsed && <SidebarLabel className="text-base text-white">Applications</SidebarLabel>}
        {!isCollapsed && <ChevronDownIcon />}
      </DropdownButton>
      <DropdownMenu className="min-w-64" anchor="right start">
        <DropdownItem href="/coach/applications">
          <Square2StackIcon />
          <DropdownLabel>Overview</DropdownLabel>
        </DropdownItem>
        <DropdownItem href="/coach/applications/pending">
          <DocumentIcon />
          <DropdownLabel>Pending</DropdownLabel>
        </DropdownItem>
        <DropdownItem href="/coach/applications/accepted">
          <CheckCircleIcon />
          <DropdownLabel>Accepted</DropdownLabel>
        </DropdownItem>
        <DropdownItem href="/coach/applications/tuition-deposit">
          <BanknotesIcon />
          <DropdownLabel>Tuition Deposit</DropdownLabel>
        </DropdownItem>
        <DropdownItem href="/coach/applications/tuition">
          <GraduationIcon />
          <DropdownLabel>Tuition</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

function CoachLayout({ children }: { children: React.ReactNode }) {
  let pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed])

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  useEffect(() => {
    // Fetch initial profile data including photo
    fetchProfilePhoto()

    // Listen for profile photo changes
    const handleProfilePhotoChange = (event: CustomEvent) => {
      setProfilePhoto(event.detail)
    }

    window.addEventListener('profilePhotoChange', handleProfilePhotoChange as EventListener)

    return () => {
      window.removeEventListener('profilePhotoChange', handleProfilePhotoChange as EventListener)
    }
  }, [])

  const fetchProfilePhoto = async () => {
    try {
      const apiUrl = config.apiEndpoints.coach
      const authHeaders = getAuthHeader()
      
      // Get user email for API authentication
      const currentUser = localStorage.getItem('auth_token')
      const userRole = localStorage.getItem('invitation_context')
      let email = ''
      
      if (userRole) {
        const roleData = JSON.parse(userRole)
        email = roleData.email || ''
      }
      
      if (!email && currentUser) {
        // Try to extract email from token (this is a simplified approach)
        email = 'coach@example.com' // Fallback - you'd get this from your auth system
      }

      if (!email) return // No email available, skip photo fetch

      const response = await fetch(`${apiUrl}/profile`, {
        method: 'GET',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          'X-User-Email': email
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.profile?.profile_photo_url) {
          setProfilePhoto(data.profile.profile_photo_url)
        }
      } else {
        console.log('Profile not found or error fetching profile photo')
      }
    } catch (error) {
      console.error('Error fetching profile photo:', error)
    }
  }

  useEffect(() => {
    // Get current user on component mount
    const user = getCurrentUser()
    setCurrentUser(user)
  }, [])

  // Listen for toggle events from main content
  useEffect(() => {
    const handleToggle = () => {
      toggleSidebar()
    }
    
    window.addEventListener('toggleSidebar', handleToggle)
    return () => window.removeEventListener('toggleSidebar', handleToggle)
  }, [toggleSidebar])

  return (
    <div className="relative isolate flex min-h-svh w-full bg-white max-lg:flex-col lg:bg-[#004aad] dark:bg-zinc-900 dark:lg:bg-zinc-950">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/25 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar className="w-full h-full">
          <SidebarHeader>
            <div className="flex items-center justify-between px-4 py-3">
              <img 
                src="/logo.png"
                alt="Texas Sports Academy"
                className="h-16 w-auto"
              />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-white hover:bg-white/10 rounded-md"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/coach" current={pathname === '/coach'} onClick={() => setMobileMenuOpen(false)}>
                <HomeIcon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Home</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/coach/bootcamp" current={pathname.startsWith('/coach/bootcamp')} onClick={() => setMobileMenuOpen(false)}>
                <AcademicCapIcon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Bootcamp</SidebarLabel>
              </SidebarItem>
              
              {/* Marketing Menu Item */}
              <SidebarItem href="/coach/marketing" current={pathname.startsWith('/coach/marketing')} onClick={() => setMobileMenuOpen(false)}>
                <MegaphoneIcon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Marketing</SidebarLabel>
              </SidebarItem>
              
              {/* Events Menu Item */}
              <SidebarItem href="/coach/events" current={pathname.startsWith('/coach/events')} onClick={() => setMobileMenuOpen(false)}>
                <Square2StackIcon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Events</SidebarLabel>
              </SidebarItem>
              
              <SidebarItem href="/coach/students" current={pathname.startsWith('/coach/students')} onClick={() => setMobileMenuOpen(false)}>
                <UserGroupIcon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Students</SidebarLabel>
              </SidebarItem>
              
              {/* Registrations Menu Item */}
              <SidebarItem href="/coach/registrations" current={pathname.startsWith('/coach/registrations')} onClick={() => setMobileMenuOpen(false)}>
                <ClipboardDocumentListIcon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Registrations</SidebarLabel>
              </SidebarItem>
              
              <SidebarItem href="/coach/legal" current={pathname.startsWith('/coach/legal')} onClick={() => setMobileMenuOpen(false)}>
                <ScaleIcon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Legal</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/coach/real-estate" current={pathname.startsWith('/coach/real-estate')} onClick={() => setMobileMenuOpen(false)}>
                <BuildingOffice2Icon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Real Estate</SidebarLabel>
              </SidebarItem>
              
              {/* Applications Menu Item */}
              <SidebarItem href="/coach/applications" current={pathname.startsWith('/coach/applications')} onClick={() => setMobileMenuOpen(false)}>
                <DocumentArrowUpIcon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Applications</SidebarLabel>
              </SidebarItem>
              
              <SidebarItem href="/coach/photos" current={pathname.startsWith('/coach/photos')} onClick={() => setMobileMenuOpen(false)}>
                <CameraIcon className="h-6 w-6" />
                <SidebarLabel className="text-base text-white">Photos</SidebarLabel>
              </SidebarItem>
            </SidebarSection>

            <SidebarSpacer />
          </SidebarBody>

          <SidebarFooter>
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar src={profilePhoto || "/coach.png"} className="size-10" square alt="" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-white dark:text-white">Coach</span>
                    <span className="block truncate text-xs/5 font-normal text-white/70 dark:text-zinc-400">
                      {currentUser?.email}
                    </span>
                  </span>
                </span>
                <ChevronUpIcon />
              </DropdownButton>
              <AccountDropdownMenu anchor="top start" />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* Sidebar on desktop */}
      <div className={`fixed inset-y-0 left-0 max-lg:hidden transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <Sidebar className="w-full h-full relative" data-tour="sidebar">
          {/* Floating Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="absolute top-4 right-4 z-10 p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronDoubleRightIcon className="h-4 w-4 text-white" />
            ) : (
              <ChevronDoubleLeftIcon className="h-4 w-4 text-white" />
            )}
          </button>

          <SidebarHeader>
            <div className="flex items-center justify-center px-2 py-3">
              {!isCollapsed && (
                <img 
                  src="/logo.png"
                  alt="Texas Sports Academy"
                  className="h-16 w-auto"
                />
              )}
            </div>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/coach" current={pathname === '/coach'} data-tour="home-section">
                <HomeIcon className="h-8 w-8" />
                {!isCollapsed && <SidebarLabel className="text-base text-white">Home</SidebarLabel>}
              </SidebarItem>
              <SidebarItem href="/coach/bootcamp" current={pathname.startsWith('/coach/bootcamp')} data-tour="bootcamp-section">
                <AcademicCapIcon className="h-8 w-8" />
                {!isCollapsed && <SidebarLabel className="text-base text-white">Bootcamp</SidebarLabel>}
              </SidebarItem>
              
              {/* Marketing Menu Item */}
              <SidebarItem href="/coach/marketing" current={pathname.startsWith('/coach/marketing')} data-tour="marketing-section">
                <MegaphoneIcon className="h-8 w-8" />
                {!isCollapsed && <SidebarLabel className="text-base text-white">Marketing</SidebarLabel>}
              </SidebarItem>
              
              {/* Events Dropdown */}
              <SidebarItem href="/coach/events" current={pathname.startsWith('/coach/events')} data-tour="events-section">
                <Square2StackIcon className="h-8 w-8" />
                {!isCollapsed && <SidebarLabel className="text-base text-white">Events</SidebarLabel>}
              </SidebarItem>
              
              <SidebarItem href="/coach/students" current={pathname.startsWith('/coach/students')} data-tour="students-section">
                <UserGroupIcon className="h-8 w-8" />
                {!isCollapsed && <SidebarLabel className="text-base text-white">Students</SidebarLabel>}
              </SidebarItem>
              
              {/* Registrations Dropdown */}
              <SidebarItem href="/coach/registrations" current={pathname.startsWith('/coach/registrations')} data-tour="registrations-section">
                <ClipboardDocumentListIcon className="h-8 w-8" />
                {!isCollapsed && <SidebarLabel className="text-base text-white">Registrations</SidebarLabel>}
              </SidebarItem>
              
              <SidebarItem href="/coach/legal" current={pathname.startsWith('/coach/legal')} data-tour="legal-section">
                <ScaleIcon className="h-8 w-8" />
                {!isCollapsed && <SidebarLabel className="text-base text-white">Legal</SidebarLabel>}
              </SidebarItem>
              <SidebarItem href="/coach/real-estate" current={pathname.startsWith('/coach/real-estate')} data-tour="real-estate-section">
                <BuildingOffice2Icon className="h-8 w-8" />
                {!isCollapsed && <SidebarLabel className="text-base text-white">Real Estate</SidebarLabel>}
              </SidebarItem>
              
              {/* Applications Dropdown */}
              <ApplicationsDropdown isCollapsed={isCollapsed} />
              
              <SidebarItem href="/coach/photos" current={pathname.startsWith('/coach/photos')} data-tour="photos-section">
                <CameraIcon className="h-8 w-8" />
                {!isCollapsed && <SidebarLabel className="text-base text-white">Photos</SidebarLabel>}
              </SidebarItem>
            </SidebarSection>

            <SidebarSpacer />
          </SidebarBody>

          <SidebarFooter className="max-lg:hidden">
            {!isCollapsed && (
              <Dropdown>
                <DropdownButton as={SidebarItem} data-tour="profile-dropdown">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar src={profilePhoto || "/coach.png"} className="size-10" square alt="" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm/5 font-medium text-white dark:text-white">Coach</span>
                      <span className="block truncate text-xs/5 font-normal text-white/70 dark:text-zinc-400">
                        {currentUser?.email}
                      </span>
                    </span>
                  </span>
                  <ChevronUpIcon />
                </DropdownButton>
                <AccountDropdownMenu anchor="top start" />
              </Dropdown>
            )}
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* Mobile Navbar */}
      <header className="flex items-center px-4 lg:hidden">
        <div className="py-2.5">
          <NavbarItem aria-label="Open navigation" onClick={toggleMobileMenu}>
            <Bars3Icon className="h-6 w-6" />
          </NavbarItem>
        </div>
        <div className="min-w-0 flex-1">
          <Navbar>
            <NavbarSpacer />
            <NavbarSection>
              <Dropdown>
                <DropdownButton as={NavbarItem}>
                  <Avatar src={profilePhoto || "/coach.png"} square />
                </DropdownButton>
                <AccountDropdownMenu anchor="bottom end" />
              </Dropdown>
            </NavbarSection>
          </Navbar>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 transition-all duration-300 ${
        isCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      }`}>
        <div className="grow p-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  )
}

export default CoachLayout
