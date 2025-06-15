// Scheduling Types - Calendly-inspired data structure

export interface EventType {
  id: string
  name: string
  type: 'call' | 'tour' | 'shadow-day'
  duration: number // in minutes
  description: string
  color: string
  bufferTimeBefore: number // in minutes
  bufferTimeAfter: number // in minutes
  maxBookingsPerDay: number
  advanceNotice: number // in hours
  isActive: boolean
  settings: EventTypeSettings
}

export interface EventTypeSettings {
  allowRescheduling: boolean
  allowCancellation: boolean
  requiresConfirmation: boolean
  sendReminders: boolean
  collectPhoneNumber: boolean
  customQuestions: CustomQuestion[]
}

export interface CustomQuestion {
  id: string
  question: string
  type: 'text' | 'textarea' | 'select' | 'multiselect'
  options?: string[]
  required: boolean
}

export interface AvailabilityRule {
  id: string
  coachId: string
  eventTypeId?: string // null for general availability
  type: 'recurring' | 'specific_date'
  
  // For recurring availability
  dayOfWeek?: number // 0-6, Sunday = 0
  startTime?: string // HH:mm format
  endTime?: string // HH:mm format
  
  // For specific date availability
  date?: string // YYYY-MM-DD format
  timeSlots?: TimeSlot[]
  
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TimeSlot {
  id: string
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  isBooked: boolean
  bookingId?: string
}

export interface Booking {
  id: string
  eventTypeId: string
  coachId: string
  date: string // YYYY-MM-DD format
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show'
  
  // Parent/Student Information
  parentName: string
  parentEmail: string
  parentPhone?: string
  studentName: string
  studentAge?: number
  
  // Booking Details
  notes?: string
  customAnswers?: Record<string, any>
  
  // System Fields
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  cancelledAt?: string
  cancellationReason?: string
  
  // Notifications
  reminderSent: boolean
  confirmationSent: boolean
}

export interface CalendarView {
  type: 'month' | 'week' | 'day'
  currentDate: Date
  selectedDate?: Date
}

export interface CalendarEvent {
  id: string
  title: string
  type: 'booking' | 'availability' | 'blocked'
  eventType: 'call' | 'tour' | 'shadow-day'
  date: string
  startTime: string
  endTime: string
  color: string
  parentName?: string
  studentName?: string
  status?: string
}

export interface AvailabilitySlot {
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
  isBooked: boolean
  eventTypeId?: string
}

// Default event type configurations
export const DEFAULT_EVENT_TYPES: Omit<EventType, 'id'>[] = [
  {
    name: 'Consultation Call',
    type: 'call',
    duration: 30,
    description: 'A 30-minute consultation call to discuss your child\'s educational needs',
    color: '#3B82F6', // Blue
    bufferTimeBefore: 5,
    bufferTimeAfter: 5,
    maxBookingsPerDay: 8,
    advanceNotice: 24,
    isActive: true,
    settings: {
      allowRescheduling: true,
      allowCancellation: true,
      requiresConfirmation: false,
      sendReminders: true,
      collectPhoneNumber: true,
      customQuestions: [
        {
          id: 'student-grade',
          question: 'What grade is your student currently in?',
          type: 'select',
          options: ['Pre-K', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'],
          required: true
        },
        {
          id: 'interests',
          question: 'What are your child\'s main academic interests?',
          type: 'textarea',
          required: false
        }
      ]
    }
  },
  {
    name: 'Campus Tour',
    type: 'tour',
    duration: 60,
    description: 'A comprehensive tour of our campus and facilities',
    color: '#10B981', // Green
    bufferTimeBefore: 10,
    bufferTimeAfter: 10,
    maxBookingsPerDay: 4,
    advanceNotice: 48,
    isActive: true,
    settings: {
      allowRescheduling: true,
      allowCancellation: true,
      requiresConfirmation: true,
      sendReminders: true,
      collectPhoneNumber: true,
      customQuestions: [
        {
          id: 'group-size',
          question: 'How many people will be attending the tour?',
          type: 'select',
          options: ['2', '3', '4', '5', '6+'],
          required: true
        },
        {
          id: 'special-needs',
          question: 'Are there any accessibility requirements we should know about?',
          type: 'textarea',
          required: false
        }
      ]
    }
  },
  {
    name: 'Shadow Day Experience',
    type: 'shadow-day',
    duration: 240, // 4 hours
    description: 'A half-day experience where your child attends classes',
    color: '#8B5CF6', // Purple
    bufferTimeBefore: 15,
    bufferTimeAfter: 15,
    maxBookingsPerDay: 2,
    advanceNotice: 72,
    isActive: true,
    settings: {
      allowRescheduling: true,
      allowCancellation: true,
      requiresConfirmation: true,
      sendReminders: true,
      collectPhoneNumber: true,
      customQuestions: [
        {
          id: 'student-grade-shadow',
          question: 'What grade level classes should your child shadow?',
          type: 'select',
          options: ['Pre-K', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'],
          required: true
        },
        {
          id: 'dietary-restrictions',
          question: 'Does your child have any dietary restrictions for lunch?',
          type: 'textarea',
          required: false
        },
        {
          id: 'emergency-contact',
          question: 'Emergency contact name and phone number',
          type: 'text',
          required: true
        }
      ]
    }
  }
] 