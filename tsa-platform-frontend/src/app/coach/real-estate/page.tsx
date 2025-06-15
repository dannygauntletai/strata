'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { Map, Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import type { ViewState, MapRef } from 'react-map-gl/mapbox';
import { BuildingOffice2Icon, MapPinIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

// Static data for development
const properties = [
  {
    id: 1,
    name: "Elite Baseball Academy",
    address: "123 Sports Way",
    city: "Austin",
    state: "TX",
    coordinates: [-97.7431, 30.2672],
    price: "$2,400/mo",
    sqft: "2,000 sq ft",
    sports: ["Baseball"],
    amenities: ["Batting Cages", "Pitching Mounds", "Training Field"],
    image: "/sports/baseball.png"
  },
  {
    id: 2,
    name: "Premier Basketball Center",
    address: "456 Court Street",
    city: "Austin",
    state: "TX",
    coordinates: [-97.7331, 30.2572],
    price: "$2,600/mo",
    sqft: "2,400 sq ft",
    sports: ["Basketball"],
    amenities: ["Courts", "Shooting Machines", "Weight Room"],
    image: "/sports/basketball.png"
  },
  {
    id: 3,
    name: "Soccer Excellence Academy",
    address: "789 Field Road",
    city: "Austin",
    state: "TX",
    coordinates: [-97.7531, 30.2772],
    price: "$2,200/mo",
    sqft: "2,800 sq ft",
    sports: ["Soccer"],
    amenities: ["Training Field", "Equipment Storage", "Locker Rooms"],
    image: "/sports/soccer.png"
  },
  // Add more properties as needed
];

function RealEstateContent() {
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapRef = useRef<MapRef>(null);
  const [selectedProperty, setSelectedProperty] = useState<typeof properties[0] | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: -97.7431,
    latitude: 30.2672,
    zoom: 11
  });

  // Handle property selection from URL
  useEffect(() => {
    const propertyId = searchParams.get('property');
    if (propertyId) {
      const property = properties.find(p => p.id === parseInt(propertyId));
      if (property) {
        setSelectedProperty(property);
        setViewState({
          longitude: property.coordinates[0],
          latitude: property.coordinates[1],
          zoom: 14
        });
      }
    }
  }, [searchParams]);

  // Handle property selection
  const handlePropertySelect = useCallback((property: typeof properties[0]) => {
    setSelectedProperty(property);
    router.push(`/coach/real-estate?property=${property.id}`, { scroll: false });
  }, [router]);

  // Handle map click with safety checks
  const handleMapClick = useCallback((event: any) => {
    try {
      // Only handle clicks if map is loaded and we have a valid map instance
      if (!mapLoaded || !mapRef.current) return;
      
      setSelectedProperty(null);
      router.push('/coach/real-estate', { scroll: false });
    } catch (error) {
      console.warn('Map click error:', error);
    }
  }, [router, mapLoaded]);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Handle map error
  const handleMapError = useCallback((error: any) => {
    console.error('Map error:', error);
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-2xl font-semibold">Real Estate</h1>
        <p className="text-gray-500">Find the perfect location for your sports academy</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onClick={handleMapClick}
            onLoad={handleMapLoad}
            onError={handleMapError}
            mapStyle={theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
            style={{ width: '100%', height: '100%' }}
            interactive={mapLoaded} // Only enable interaction after map loads
          >
            <NavigationControl position="top-right" />
            <ScaleControl position="bottom-right" />

            {/* Property Markers - Only render when map is loaded */}
            {mapLoaded && properties.map(property => (
              <Marker
                key={property.id}
                longitude={property.coordinates[0]}
                latitude={property.coordinates[1]}
                anchor="bottom"
                onClick={e => {
                  try {
                    e.originalEvent.stopPropagation();
                    handlePropertySelect(property);
                  } catch (error) {
                    console.warn('Marker click error:', error);
                  }
                }}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="cursor-pointer"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                    <BuildingOffice2Icon className="w-6 h-6 text-blue-500" />
                  </div>
                </motion.div>
              </Marker>
            ))}

            {/* Property Popup - Only render when map is loaded */}
            {mapLoaded && selectedProperty && (
              <Popup
                longitude={selectedProperty.coordinates[0]}
                latitude={selectedProperty.coordinates[1]}
                anchor="bottom"
                onClose={() => {
                  setSelectedProperty(null);
                  router.push('/coach/real-estate', { scroll: false });
                }}
                closeOnClick={false}
              >
                <div className="w-64 p-2">
                  <h3 className="font-semibold">{selectedProperty.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    {selectedProperty.address}, {selectedProperty.city}
                  </p>
                  <p className="text-sm font-medium mt-1">{selectedProperty.price}</p>
                  <p className="text-sm text-gray-500">{selectedProperty.sqft}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedProperty.sports.map(sport => (
                      <span
                        key={sport}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs rounded-full"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>

        {/* Property List Sidebar */}
        <div className="w-80 border-l bg-white dark:bg-gray-900 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Available Properties</h2>
            <div className="space-y-4">
              {properties.map(property => (
                <motion.div
                  key={property.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedProperty?.id === property.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handlePropertySelect(property)}
                >
                      <h3 className="font-semibold">{property.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPinIcon className="w-4 h-4" />
                    {property.address}, {property.city}
                      </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium text-green-600">{property.price}</span>
                    <span className="text-sm text-gray-500">{property.sqft}</span>
                  </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {property.sports.map(sport => (
                          <span
                            key={sport}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs rounded-full"
                          >
                            {sport}
                          </span>
                        ))}
                      </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      {property.amenities.slice(0, 2).join(', ')}
                      {property.amenities.length > 2 && ` +${property.amenities.length - 2} more`}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RealEstatePage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading real estate data...</p>
        </div>
      </div>
    }>
      <RealEstateContent />
    </Suspense>
  );
} 