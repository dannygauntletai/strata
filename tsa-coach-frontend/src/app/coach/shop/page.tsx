'use client'

import { Heading, Subheading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import { Avatar } from '@/components/avatar'
import { useState } from 'react'
import { 
  ShoppingCartIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { 
  CheckCircleIcon
} from '@heroicons/react/24/solid'

// Mock product data
const products = [
  {
    id: 'PROD001',
    name: 'Premium Basketball Set',
    description: 'Set of 10 regulation basketballs with carrying cart',
    price: 799.99,
    category: 'Basketball',
    image: '/basketball-set.jpg',
    inStock: true
  },
  {
    id: 'PROD002',
    name: 'Soccer Goal Set',
    description: 'Pair of portable regulation soccer goals with nets',
    price: 349.99,
    category: 'Soccer',
    image: '/soccer-goals.jpg',
    inStock: true
  },
  {
    id: 'PROD003',
    name: 'Training Cones (Set of 50)',
    description: 'Multicolor training cones for drills and practice',
    price: 59.99,
    category: 'Training Equipment',
    image: '/training-cones.jpg',
    inStock: true
  },
  {
    id: 'PROD004',
    name: 'Digital Scoreboard',
    description: 'Wireless programmable scoreboard with remote',
    price: 249.99,
    category: 'Field Equipment',
    image: '/scoreboard.jpg',
    inStock: false
  },
  {
    id: 'PROD005',
    name: 'Whistle Pack (Coaches)',
    description: 'Set of 5 professional whistles with lanyards',
    price: 39.99,
    category: 'Coaching Supplies',
    image: '/whistles.jpg',
    inStock: true
  },
  {
    id: 'PROD006',
    name: 'Team Jersey Set',
    description: 'Customizable jerseys for youth teams (set of 15)',
    price: 299.99,
    category: 'Apparel',
    image: '/jerseys.jpg',
    inStock: true
  },
  {
    id: 'PROD007',
    name: 'Equipment Storage System',
    description: 'Heavy-duty storage racks and bins for sports equipment',
    price: 599.99,
    category: 'Storage',
    image: '/storage.jpg',
    inStock: true
  },
  {
    id: 'PROD008',
    name: 'First Aid Kit (Sports Edition)',
    description: 'Comprehensive first aid supplies for sports injuries',
    price: 89.99,
    category: 'Safety',
    image: '/first-aid.jpg',
    inStock: true
  }
]

// Categories for filtering
const categories = [
  'All Categories',
  'Basketball',
  'Soccer',
  'Training Equipment',
  'Field Equipment',
  'Coaching Supplies',
  'Apparel',
  'Storage',
  'Safety'
]

export default function Shop() {
  // Move useState hooks inside the component
  const [cartItems, setCartItems] = useState<string[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const handleAddToCart = (productId: string) => {
    setCartItems([...cartItems, productId])
  }

  const handleViewDetails = (productId: string) => {
    console.log(`Viewing details for product ${productId}`)
  }

  const handleApplyFilters = () => {
    console.log('Applying filters')
  }

  const toggleCart = () => {
    setCartOpen(!cartOpen)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading>Shop</Heading>
        {/* Cart icon - repositioned to be within content area */}
        <div className="relative">
          <button 
            className="relative rounded-full bg-blue-600 p-2 text-white hover:bg-blue-500 focus:outline-none"
            onClick={toggleCart}
            aria-label="Open shopping cart"
          >
            <ShoppingCartIcon className="h-6 w-6" />
            {cartItems.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                {cartItems.length}
              </span>
            )}
          </button>
          
          {/* Cart dropdown */}
          {cartOpen && (
            <div className="absolute right-0 top-12 z-20 w-80 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Cart</h3>
                <button onClick={toggleCart} aria-label="Close cart">
                  <XMarkIcon className="h-5 w-5 text-zinc-500" />
                </button>
              </div>
              <Divider className="my-2" />
              {cartItems.length === 0 ? (
                <p className="py-4 text-center text-zinc-500">Your cart is empty</p>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {/* Would map through cart items here */}
                  <p className="py-2 text-center text-zinc-700">Items added: {cartItems.length}</p>
                </div>
              )}
              <Divider className="my-2" />
              <Button color="blue" className="mt-2 w-full">
                Checkout
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Main catalog section */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Sidebar with filters - smaller width */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-zinc-900">Filters</h3>
              <FunnelIcon className="h-5 w-5 text-zinc-500" />
            </div>
            
            <Divider className="my-3" />
            
            <Subheading>Category</Subheading>
            <div className="mt-2 space-y-2">
              {categories.map((category) => (
                <div key={category} className="flex items-center">
                  <input
                    id={`category-${category}`}
                    name="category"
                    type="radio"
                    defaultChecked={category === 'All Categories'}
                    className="h-4 w-4 border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <label htmlFor={`category-${category}`} className="ml-3 text-sm text-zinc-800">
                    {category}
                  </label>
                </div>
              ))}
            </div>
            
            <Divider className="my-3" />
            
            <Subheading>Price Range</Subheading>
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <input
                  id="price-all"
                  name="price"
                  type="radio"
                  defaultChecked
                  className="h-4 w-4 border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label htmlFor="price-all" className="ml-3 text-sm text-zinc-800">
                  All Prices
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="price-under-100"
                  name="price"
                  type="radio"
                  className="h-4 w-4 border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label htmlFor="price-under-100" className="ml-3 text-sm text-zinc-800">
                  Under $100
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="price-100-300"
                  name="price"
                  type="radio"
                  className="h-4 w-4 border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label htmlFor="price-100-300" className="ml-3 text-sm text-zinc-800">
                  $100 - $300
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="price-300-plus"
                  name="price"
                  type="radio"
                  className="h-4 w-4 border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label htmlFor="price-300-plus" className="ml-3 text-sm text-zinc-800">
                  $300+
                </label>
              </div>
            </div>
            
            <Divider className="my-3" />
            
            <Subheading>Availability</Subheading>
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <input
                  id="availability-all"
                  name="availability"
                  type="radio"
                  defaultChecked
                  className="h-4 w-4 border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label htmlFor="availability-all" className="ml-3 text-sm text-zinc-800">
                  All Items
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="availability-in-stock"
                  name="availability"
                  type="radio"
                  className="h-4 w-4 border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label htmlFor="availability-in-stock" className="ml-3 text-sm text-zinc-800">
                  In Stock Only
                </label>
              </div>
            </div>
            
            <Button 
              className="mt-4 w-full" 
              color="blue" 
              onClick={handleApplyFilters}
              aria-label="Apply selected filters to product list"
            >
              Apply Filters
            </Button>
          </div>
        </div>
        
        {/* Product grid - wider */}
        <div className="lg:col-span-4">
          <div className="border-b border-zinc-200 pb-2">
            <Subheading>Equipment & Supplies</Subheading>
          </div>
          
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <div className="aspect-h-1 aspect-w-1 h-48 bg-zinc-200">
                  {/* Placeholder for product image */}
                  <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400">
                    Product Image
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div>
                    <h3 className="text-base font-medium text-zinc-900">{product.name}</h3>
                    <p className="mt-1 text-sm text-zinc-500">{product.description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-lg font-semibold text-zinc-900">${product.price.toFixed(2)}</p>
                    {product.inStock ? (
                      <Badge color="lime">In Stock</Badge>
                    ) : (
                      <Badge color="amber">On Backorder</Badge>
                    )}
                  </div>
                  <div className="mt-auto pt-6">
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        outline 
                        onClick={() => handleViewDetails(product.id)}
                        aria-label={`View details for ${product.name}`}
                      >
                        View Details
                      </Button>
                      <Button 
                        className="flex-1" 
                        color="blue"
                        onClick={() => handleAddToCart(product.id)}
                        aria-label={`Add ${product.name} to your cart`}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
} 