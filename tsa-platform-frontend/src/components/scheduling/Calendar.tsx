'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/20/solid'
import { CalendarEvent, CalendarView } from '@/types/scheduling'

interface CalendarProps {
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  events: CalendarEvent[]
  onDateSelect: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  selectedDate?: Date
  availableSlots?: string[] // Time slots for the selected date
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const HOURS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8 // Start at 8 AM
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour
  return `${displayHour}:00 ${ampm}`
})

export function Calendar({
  view,
  onViewChange,
  events,
  onDateSelect,
  onEventClick,
  selectedDate,
  availableSlots
}: CalendarProps) {
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(view.currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    onViewChange({ ...view, currentDate: newDate })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(view.currentDate)
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    onViewChange({ ...view, currentDate: newDate })
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => event.date === dateStr)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  if (view.type === 'month') {
    return <MonthView 
      view={view}
      onNavigate={navigateMonth}
      onDateSelect={onDateSelect}
      onEventClick={onEventClick}
      getEventsForDate={getEventsForDate}
      isToday={isToday}
      isSelected={isSelected}
      onViewChange={onViewChange}
    />
  }

  if (view.type === 'week') {
    return <WeekView 
      view={view}
      onNavigate={navigateWeek}
      onDateSelect={onDateSelect}
      onEventClick={onEventClick}
      getEventsForDate={getEventsForDate}
      isToday={isToday}
      isSelected={isSelected}
      onViewChange={onViewChange}
      availableSlots={availableSlots}
    />
  }

  return null
}

interface ViewProps {
  view: CalendarView
  onNavigate: (direction: 'prev' | 'next') => void
  onDateSelect: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  getEventsForDate: (date: Date) => CalendarEvent[]
  isToday: (date: Date) => boolean
  isSelected: (date: Date) => boolean
  onViewChange: (view: CalendarView) => void
  availableSlots?: string[]
}

function MonthView({ 
  view, 
  onNavigate, 
  onDateSelect, 
  onEventClick, 
  getEventsForDate, 
  isToday, 
  isSelected,
  onViewChange 
}: ViewProps) {
  const firstDay = new Date(view.currentDate.getFullYear(), view.currentDate.getMonth(), 1)
  const lastDay = new Date(view.currentDate.getFullYear(), view.currentDate.getMonth() + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  const days = []
  const currentDate = new Date(startDate)
  
  for (let i = 0; i < 42; i++) {
    days.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {MONTHS[view.currentDate.getMonth()]} {view.currentDate.getFullYear()}
            </h2>
            <div className="flex items-center space-x-1">
              <Button 
                outline 
                onClick={() => onNavigate('prev')}
                className="p-2"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button 
                outline 
                onClick={() => onNavigate('next')}
                className="p-2"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              color={view.type === 'month' ? undefined : 'zinc'}
              onClick={() => onViewChange({ ...view, type: 'month' })}
            >
              Month
            </Button>
            <Button 
              color={view.type === 'week' ? undefined : 'zinc'}
              onClick={() => onViewChange({ ...view, type: 'week' })}
            >
              Week
            </Button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map(day => (
          <div key={day} className="p-3 text-center">
            <Text className="text-sm font-medium text-gray-600">{day}</Text>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          const dayEvents = getEventsForDate(date)
          const isCurrentMonth = date.getMonth() === view.currentDate.getMonth()
          
          return (
            <div
              key={index}
              className={`min-h-[120px] p-2 border-r border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                !isCurrentMonth ? 'bg-gray-50/30 text-gray-400' : ''
              } ${isSelected(date) ? 'bg-blue-50 border-blue-200' : ''}`}
              onClick={() => onDateSelect(date)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${
                  isToday(date) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' :
                  isSelected(date) ? 'text-blue-600' : 
                  'text-gray-900'
                }`}>
                  {date.getDate()}
                </span>
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={`${event.id}-${event.date}`}
                    className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: `${event.color}20`, color: event.color }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick?.(event)
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ 
  view, 
  onNavigate, 
  onDateSelect, 
  onEventClick, 
  getEventsForDate, 
  isToday, 
  isSelected,
  onViewChange,
  availableSlots
}: ViewProps) {
  const startOfWeek = new Date(view.currentDate)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(day.getDate() + i)
    return day
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Week Header */}
      <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Week of {startOfWeek.toLocaleDateString()}
            </h2>
            <div className="flex items-center space-x-1">
              <Button 
                outline 
                onClick={() => onNavigate('prev')}
                className="p-2"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button 
                outline 
                onClick={() => onNavigate('next')}
                className="p-2"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              color={view.type === 'month' ? undefined : 'zinc'}
              onClick={() => onViewChange({ ...view, type: 'month' })}
            >
              Month
            </Button>
            <Button 
              color={view.type === 'week' ? undefined : 'zinc'}
              onClick={() => onViewChange({ ...view, type: 'week' })}
            >
              Week
            </Button>
          </div>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-8 border-b border-gray-200">
        <div className="p-3"></div> {/* Time column header */}
        {weekDays.map(day => (
          <div 
            key={day.toISOString()} 
            className={`p-3 text-center cursor-pointer hover:bg-gray-50 ${
              isSelected(day) ? 'bg-blue-50' : ''
            }`}
            onClick={() => onDateSelect(day)}
          >
            <div className="space-y-1">
              <Text className="text-sm font-medium text-gray-600">
                {DAYS[day.getDay()]}
              </Text>
              <span className={`text-lg font-semibold ${
                isToday(day) ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' :
                isSelected(day) ? 'text-blue-600' : 
                'text-gray-900'
              }`}>
                {day.getDate()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="grid grid-cols-8 divide-x divide-gray-200">
        {/* Time Column */}
        <div className="divide-y divide-gray-200">
          {HOURS.map(hour => (
            <div key={hour} className="h-16 p-2 text-sm text-gray-500 text-right">
              {hour}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        {weekDays.map(day => {
          const dayEvents = getEventsForDate(day)
          return (
            <div key={day.toISOString()} className="divide-y divide-gray-200">
              {HOURS.map((hour, hourIndex) => {
                const hourEvents = dayEvents.filter(event => {
                  const eventHour = parseInt(event.startTime.split(':')[0])
                  const currentHour = hourIndex + 8
                  return eventHour === currentHour
                })

                return (
                  <div key={hour} className="h-16 p-1 relative hover:bg-gray-50">
                    {hourEvents.map(event => (
                      <div
                        key={`${event.id}-${hour}`}
                        className="absolute inset-1 p-1 rounded text-xs cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: `${event.color}20`, color: event.color }}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-xs opacity-75">
                          {event.startTime} - {event.endTime}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
} 