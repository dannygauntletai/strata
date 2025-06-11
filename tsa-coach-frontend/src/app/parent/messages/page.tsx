'use client'

import { Heading, Subheading } from '@/components/heading'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import ParentPortalLayout from '@/components/ParentPortalLayout'
import { 
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid'
import { useState, useEffect, useRef } from 'react'
import { config } from '@/config/environments'

// API Configuration
const API_BASE_URL = config.apiEndpoints.parentApi

interface Message {
  message_id: string
  sender_type: 'parent' | 'coach'
  sender_name: string
  content: string
  timestamp: string
  read_status: boolean
  enrollment_id?: string
  student_name?: string
}

interface Conversation {
  coach_id: string
  coach_name: string
  enrollment_id: string
  student_name: string
  last_message: string
  last_message_time: string
  unread_count: number
  status: 'active' | 'archived'
}

function MessagesContent() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      setError('')
      
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch(`${API_BASE_URL}/communication/messages`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`)
      }

      const data = await response.json()
      setConversations(data.conversations || [])
      
      // Auto-select first conversation
      if (data.conversations && data.conversations.length > 0) {
        setSelectedConversation(data.conversations[0].coach_id)
      }
      
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (coachId: string) => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      const response = await fetch(`${API_BASE_URL}/communication/messages/${coachId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`)
      }

      const data = await response.json()
      setMessages(data.messages || [])
      
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return

    try {
      setSending(true)
      
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) throw new Error('Authentication required')

      const response = await fetch(`${API_BASE_URL}/communication/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coach_id: selectedConversation,
          content: newMessage.trim()
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`)
      }

      // Add message to local state immediately for better UX
      const newMsg: Message = {
        message_id: `temp_${Date.now()}`,
        sender_type: 'parent',
        sender_name: 'You',
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        read_status: true
      }
      
      setMessages(prev => [...prev, newMsg])
      setNewMessage('')
      
      // Refresh conversations to update last message
      fetchConversations()
      
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <ParentPortalLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004aad] mx-auto mb-4"></div>
            <span className="text-gray-600">Loading messages...</span>
          </div>
        </div>
      </ParentPortalLayout>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Heading className="text-2xl font-bold">Coach Messages</Heading>
        <Subheading>Stay connected with your microschool coach</Subheading>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-red-700">{error}</span>
          <Button onClick={fetchConversations} className="ml-4">
            Try Again
          </Button>
        </div>
      )}

      {/* Messages Interface */}
      <div className="bg-white rounded-lg border border-gray-200 h-96 md:h-[600px] flex">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <Heading className="text-lg font-semibold">Conversations</Heading>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <ChatBubbleLeftIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <span className="text-sm">No conversations yet</span>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.coach_id}
                  onClick={() => setSelectedConversation(conversation.coach_id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversation.coach_id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm">{conversation.coach_name}</span>
                    {conversation.unread_count > 0 && (
                      <Badge color="blue" className="text-xs">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    {conversation.student_name}
                  </div>
                  <div className="text-sm text-gray-700 truncate">
                    {conversation.last_message}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(conversation.last_message_time)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Message Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  <div>
                    <span className="font-medium">
                      {conversations.find(c => c.coach_id === selectedConversation)?.coach_name}
                    </span>
                    <div className="text-sm text-gray-600">
                      Coach for {conversations.find(c => c.coach_id === selectedConversation)?.student_name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.message_id}
                    className={`flex ${message.sender_type === 'parent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_type === 'parent'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="text-sm">{message.content}</div>
                      <div className={`text-xs mt-1 flex items-center justify-between ${
                        message.sender_type === 'parent' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span>{formatTime(message.timestamp)}</span>
                        {message.sender_type === 'parent' && (
                          <CheckCircleIcon className="h-3 w-3 ml-2" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <PaperAirplaneIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <span>Select a conversation to start messaging</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <ParentPortalLayout>
      <MessagesContent />
    </ParentPortalLayout>
  )
} 