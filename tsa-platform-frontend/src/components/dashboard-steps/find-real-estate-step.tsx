'use client'

import { Card, CardHeader, CardContent, Button, EmptyState } from '@/components/ui'
import { Badge } from '@/components/badge'
import { 
  HomeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  EyeIcon,
  PhoneIcon
} from '@heroicons/react/24/solid'

interface PropertyListing {
  id: string
  address: string
  size: string
  rent: string
  type: 'retail' | 'warehouse' | 'office'
  status: 'available' | 'pending' | 'contacted'
  features: string[]
}

const sampleListings: PropertyListing[] = [
  {
    id: '1',
    address: '1234 Sports Center Dr, Austin, TX',
    size: '3,500 sq ft',
    rent: '$4,200/month',
    type: 'retail',
    status: 'available',
    features: ['High ceilings', 'Parking lot', 'Open floor plan']
  },
  {
    id: '2',
    address: '5678 Athletic Way, Austin, TX',
    size: '4,200 sq ft',
    rent: '$5,800/month',
    type: 'warehouse',
    status: 'contacted',
    features: ['Loading dock', 'Large space', 'Good location']
  }
]

export function FindRealEstateStep() {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'retail':
        return <HomeIcon className="h-5 w-5 text-blue-600" />
      case 'warehouse':
        return <HomeIcon className="h-5 w-5 text-green-600" />
      case 'office':
        return <HomeIcon className="h-5 w-5 text-purple-600" />
      default:
        return <HomeIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return { color: 'green' as const, text: 'Available' }
      case 'pending':
        return { color: 'orange' as const, text: 'Pending' }
      case 'contacted':
        return { color: 'blue' as const, text: 'Contacted' }
      default:
        return { color: 'zinc' as const, text: 'Unknown' }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Step: Find Real Estate</h2>
        <p className="text-gray-600">Secure a facility location and lease for your Texas Sports Academy school</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Search */}
        <Card>
          <CardHeader
            action={
              <a href="#" className="text-sm font-medium text-[#004aad] hover:text-[#003888] transition-colors">
                Search Properties
              </a>
            }
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPinIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Property Search</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sampleListings.map((listing) => (
                <div key={listing.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getTypeIcon(listing.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{listing.address}</h4>
                        <p className="text-sm text-gray-500">{listing.size} • {listing.rent}</p>
                      </div>
                    </div>
                    <Badge color={getStatusBadge(listing.status).color}>
                      {getStatusBadge(listing.status).text}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {listing.features.slice(0, 2).map((feature, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                      {listing.features.length > 2 && (
                        <span className="text-xs text-gray-500">+{listing.features.length - 2} more</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="px-3"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm"
                        className="px-3"
                      >
                        <PhoneIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Requirements Checklist */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Facility Requirements</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Space Requirements</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm text-gray-700">Minimum 3,000 sq ft</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">High ceilings (12+ ft)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">Open floor plan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">Adequate parking</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Location Factors</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">Near residential areas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">Good visibility from road</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">Safe neighborhood</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">Accessible by public transport</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Planning */}
      <Card className="mt-6">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Budget Planning</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Monthly Rent</h4>
              </div>
              <p className="text-2xl font-bold text-blue-900">$3,000 - $6,000</p>
              <p className="text-sm text-blue-700">Typical range for suitable facilities</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDaysIcon className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-900">Lease Term</h4>
              </div>
              <p className="text-2xl font-bold text-green-900">3-5 years</p>
              <p className="text-sm text-green-700">Recommended initial lease length</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HomeIcon className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">Setup Costs</h4>
              </div>
              <p className="text-2xl font-bold text-purple-900">$15,000 - $30,000</p>
              <p className="text-sm text-purple-700">Equipment and renovation estimate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Ready to start your search?</h4>
              <p className="text-sm text-gray-500">
                Use our property search tool or contact a commercial real estate agent in your area.
              </p>
            </div>
            <Button>
              Start Property Search
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 