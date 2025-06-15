import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Legal & Compliance',
  description: 'Complete all legal requirements to establish your microschool',
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 