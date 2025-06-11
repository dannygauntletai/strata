import { Heading } from '@/components/heading'
import { Metadata } from 'next'
import { ParentInvitationsContent } from './components'

export const metadata: Metadata = {
  title: 'Parent Invitations',
  description: 'Manage parent invitations and student enrollment'
}

// Main page component (server component)
export default function ParentInvitationsPage() {
  return <ParentInvitationsContent />
} 