'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/badge'
import {
  PlusIcon,
  TrashIcon,
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid'
import { AvailabilityRule, TimeSlot, EventType } from '@/types/scheduling'

interface AvailabilityManagerProps {
  eventType: EventType
  availabilityRules: AvailabilityRule[]
  onSaveAvailability: (rules: AvailabilityRule[]) => void
  onClose: () => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8 // Start at 8 AM
  const minute = (i % 2) * 30
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  const display = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`
  return { value: time, label: display }
})

export function AvailabilityManager({
  eventType,
  availabilityRules,
  onSaveAvailability,
  onClose
}: AvailabilityManagerProps) {
  const [rules, setRules] = useState<AvailabilityRule[]>(availabilityRules)
  const [activeTab, setActiveTab] = useState<'recurring' | 'specific'>('recurring')
  const [specificDate, setSpecificDate] = useState('')
  const [specificTimeSlots, setSpecificTimeSlots] = useState<TimeSlot[]>([])

  // Get recurring rules for this event type
  const recurringRules = rules.filter(rule => 
    rule.type === 'recurring' && 
    (rule.eventTypeId === eventType.id || !rule.eventTypeId)
  )

  // Get specific date rules for this event type
  const specificRules = rules.filter(rule => 
    rule.type === 'specific_date' && 
    rule.eventTypeId === eventType.id
  )

  const addRecurringRule = () => {
    const newRule: AvailabilityRule = {
      id: `rule-${Date.now()}`,
      coachId: 'current-coach',
      eventTypeId: eventType.id,
      type: 'recurring',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setRules([...rules, newRule])
  }

  const updateRecurringRule = (ruleId: string, updates: Partial<AvailabilityRule>) => {
    setRules(rules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, ...updates, updatedAt: new Date().toISOString() }
        : rule
    ))
  }

  const removeRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId))
  }

  const addSpecificTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      startTime: '09:00',
      endTime: '10:00',
      isBooked: false,
    }
    setSpecificTimeSlots([...specificTimeSlots, newSlot])
  }

  const updateSpecificTimeSlot = (slotId: string, updates: Partial<TimeSlot>) => {
    setSpecificTimeSlots(slots => 
      slots.map(slot => slot.id === slotId ? { ...slot, ...updates } : slot)
    )
  }

  const removeSpecificTimeSlot = (slotId: string) => {
    setSpecificTimeSlots(slots => slots.filter(slot => slot.id !== slotId))
  }

  const saveSpecificDate = () => {
    if (!specificDate || specificTimeSlots.length === 0) return

    const newRule: AvailabilityRule = {
      id: `rule-${Date.now()}`,
      coachId: 'current-coach',
      eventTypeId: eventType.id,
      type: 'specific_date',
      date: specificDate,
      timeSlots: specificTimeSlots,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setRules([...rules, newRule])
    setSpecificDate('')
    setSpecificTimeSlots([])
  }

  const handleSave = () => {
    onSaveAvailability(rules)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <Heading level={3} className="text-lg font-semibold text-gray-900">
              Set Availability
            </Heading>
            <Text className="text-gray-600 mt-1">
              Configure when you&apos;re available for {eventType.name.toLowerCase()}
            </Text>
          </div>
          <div className="flex items-center space-x-2">
            <Button outline onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Save Availability
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('recurring')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'recurring'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClockIcon className="h-4 w-4 mr-2 inline" />
            Recurring Hours
          </button>
          <button
            onClick={() => setActiveTab('specific')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'specific'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDaysIcon className="h-4 w-4 mr-2 inline" />
            Specific Dates
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'recurring' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Text className="text-sm text-gray-600">
                Set your regular weekly availability. These hours will repeat every week.
              </Text>
              <Button outline onClick={addRecurringRule}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Hours
              </Button>
            </div>

            <div className="space-y-4">
              {recurringRules.map(rule => (
                <div key={rule.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Day
                      </label>
                      <select
                        value={rule.dayOfWeek || 1}
                        onChange={(e) => updateRecurringRule(rule.id, { 
                          dayOfWeek: parseInt(e.target.value) 
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        {DAYS_OF_WEEK.map(day => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <select
                        value={rule.startTime || '09:00'}
                        onChange={(e) => updateRecurringRule(rule.id, { 
                          startTime: e.target.value 
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        {TIME_OPTIONS.map(time => (
                          <option key={time.value} value={time.value}>
                            {time.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <select
                        value={rule.endTime || '17:00'}
                        onChange={(e) => updateRecurringRule(rule.id, { 
                          endTime: e.target.value 
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        {TIME_OPTIONS.map(time => (
                          <option key={time.value} value={time.value}>
                            {time.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={(e) => updateRecurringRule(rule.id, { 
                            isActive: e.target.checked 
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">Active</span>
                      </label>
                      <Button 
                        outline 
                        onClick={() => removeRule(rule.id)}
                        className="p-2"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {recurringRules.length === 0 && (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <Text className="text-gray-500">
                    No recurring availability set. Click &quot;Add Hours&quot; to get started.
                  </Text>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'specific' && (
          <div className="space-y-6">
            {/* Add Specific Date */}
            <div className="bg-blue-50 rounded-lg p-4">
              <Text className="text-sm font-medium text-blue-900 mb-4">
                Add Specific Date Availability
              </Text>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button outline onClick={addSpecificTimeSlot}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Time Slot
                  </Button>
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-2 mb-4">
                {specificTimeSlots.map(slot => (
                  <div key={slot.id} className="flex items-center space-x-4">
                    <select
                      value={slot.startTime}
                      onChange={(e) => updateSpecificTimeSlot(slot.id, { 
                        startTime: e.target.value 
                      })}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-400">to</span>
                    <select
                      value={slot.endTime}
                      onChange={(e) => updateSpecificTimeSlot(slot.id, { 
                        endTime: e.target.value 
                      })}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                    <Button 
                      outline 
                      onClick={() => removeSpecificTimeSlot(slot.id)}
                      className="p-2"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {specificDate && specificTimeSlots.length > 0 && (
                <Button onClick={saveSpecificDate}>
                  Save Date & Time Slots
                </Button>
              )}
            </div>

            {/* Existing Specific Dates */}
            <div className="space-y-4">
              <Text className="text-sm font-medium text-gray-700">
                Specific Date Availability
              </Text>

              {specificRules.map(rule => (
                <div key={rule.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Text className="font-medium text-gray-900">
                      {new Date(rule.date!).toLocaleDateString()}
                    </Text>
                    <Button 
                      outline 
                      onClick={() => removeRule(rule.id)}
                      className="p-2"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rule.timeSlots?.map(slot => (
                      <Badge 
                        key={slot.id} 
                        color={slot.isBooked ? 'red' : 'green'}
                      >
                        {slot.startTime} - {slot.endTime}
                        {slot.isBooked && ' (Booked)'}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}

              {specificRules.length === 0 && (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <Text className="text-gray-500">
                    No specific dates set. Add dates above for one-time availability.
                  </Text>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 