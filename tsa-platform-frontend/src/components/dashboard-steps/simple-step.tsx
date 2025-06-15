'use client'

import { Card, CardContent, Button } from '@/components/ui'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

interface SimpleStepProps {
  stepNumber: number
  title: string
  description: string
  icon?: React.ReactNode
  comingSoon?: boolean
}

export function SimpleStep({ stepNumber, title, description, icon, comingSoon = true }: SimpleStepProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Step {stepNumber}: {title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              {icon || <CheckCircleIcon />}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
            
            {comingSoon ? (
              <div>
                <p className="text-sm text-gray-400 mb-4">Detailed guidance for this step is coming soon.</p>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
            ) : (
              <Button>
                Get Started
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 