"use client"

import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { MessageSquare, ChevronLeft, ChevronRight, Send, Bot, User, AlertCircle, X, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMobileDetection } from '@/lib/hooks/useMobileDetection'
import { useGlobalSidebars } from '@/components/AuthenticatedLayout'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIChatbotProps {
  className?: string
  isExpanded: boolean
  onToggle: () => void
  fireDataToAnalyze?: any
  emissionsDataToAnalyze?: any
  onFireDataAnalyzed?: () => void
  onEmissionsDataAnalyzed?: () => void
  showTrigger?: boolean
  embedded?: boolean
  onNavigateToML?: () => void // Callback to navigate to Behind the Scenes tab
  currentTab?: string // Current active tab to determine which session to use
  hideMobileHeader?: boolean // Hide the internal header on mobile when parent shows navigation header
}

export function AIChatbot({ className, isExpanded, onToggle, fireDataToAnalyze, emissionsDataToAnalyze, onFireDataAnalyzed, onEmissionsDataAnalyzed, showTrigger = true, embedded = false, onNavigateToML, currentTab = 'fire-forecast', hideMobileHeader = false }: AIChatbotProps) {
  const isMobile = useMobileDetection();
  const { enableBTS, isBTSUnlocked } = useGlobalSidebars();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Fact Finder, your assistant for wildfire risk analysis and environmental data insights. How can I help you today?',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>('') // Unified session ID for all tabs
  const [conversationTurns, setConversationTurns] = useState<number>(0)
  const [showMLNotification, setShowMLNotification] = useState<boolean>(false)
  const [showBTSModal, setShowBTSModal] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle fire data analysis when fireDataToAnalyze changes
  useEffect(() => {
    if (fireDataToAnalyze) {
      analyzeFireData(fireDataToAnalyze)
      onFireDataAnalyzed?.()
    }
  }, [fireDataToAnalyze])

  // Handle emissions data analysis when emissionsDataToAnalyze changes
  useEffect(() => {
    if (emissionsDataToAnalyze) {
      analyzeEmissionsData(emissionsDataToAnalyze)
      onEmissionsDataAnalyzed?.()
    }
  }, [emissionsDataToAnalyze])

  const analyzeFireData = async (fireData: any) => {
    console.log('🔥 AIChatbot: analyzeFireData started with fire data:', {
      fireData: fireData,
      timestamp: new Date().toISOString()
    });
    
    // Clear session when analyzing new fire data
    setSessionId('')
    setConversationTurns(0)
    setShowMLNotification(false)
    
    setIsLoading(true)
    setError(null)

    try {
      const requestBody = {
        query: "What are the key risk factors for this fire?",
        session_id: "",
        fire_data: fireData, // Send fire data in fire_data field
        emissions_data: null
      }

      console.log('🔥 AIChatbot: Making API request to unified /api/ai-assistant with body:', requestBody);

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('🔥 AIChatbot: API response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        console.error('🔥 AIChatbot: API request failed:', response.status, response.statusText);
        throw new Error('Failed to analyze fire data')
      }

      const data = await response.json()
      
      console.log('🔥 AIChatbot: API response data:', {
        data: data,
        hasSessionId: !!data.session_id,
        answerLength: data.answer?.length || 0
      });
      
      // Store unified session ID for follow-up questions
      if (data.session_id) {
        console.log('🔥 AIChatbot: Setting unified session_id:', data.session_id);
        setSessionId(data.session_id)
      }

      // Add the response as an assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date()
      }
      console.log('🔥 AIChatbot: Adding assistant message to chat:', assistantMessage);
      setMessages(prev => [...prev, assistantMessage])
      
      // Increment conversation turns for initial fire analysis
      setConversationTurns(1)
    } catch (err) {
      console.error('🔥 AIChatbot: Fire analysis error:', {
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      setError(err instanceof Error ? err.message : 'An error occurred')
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error analyzing this fire data. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeEmissionsData = async (emissionsData: any) => {
    console.log('🌫️ AIChatbot: analyzeEmissionsData started with emissions data:', {
      emissionsData: emissionsData,
      timestamp: new Date().toISOString()
    });
    
    // Clear session when analyzing new emissions data
    setSessionId('')
    setConversationTurns(0)
    setShowMLNotification(false)
    
    setIsLoading(true)
    setError(null)

    try {
      const requestBody = {
        query: "Analyze these wildfire emissions",
        session_id: "",
        fire_data: null,
        emissions_data: emissionsData // Send emissions data in emissions_data field
      }

      console.log('🌫️ AIChatbot: Making API request to unified /api/ai-assistant with body:', requestBody);

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('🌫️ AIChatbot: API response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        console.error('🌫️ AIChatbot: API request failed:', response.status, response.statusText);
        throw new Error('Failed to analyze emissions data')
      }

      const data = await response.json()
      
      console.log('🌫️ AIChatbot: API response data:', {
        data: data,
        hasSessionId: !!data.session_id,
        answerLength: data.answer?.length || 0
      });
      
      // Store unified session ID for follow-up questions
      if (data.session_id) {
        console.log('🌫️ AIChatbot: Setting unified session_id:', data.session_id);
        setSessionId(data.session_id)
      }

      // Add the response as an assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date()
      }
      console.log('🌫️ AIChatbot: Adding assistant message to chat:', assistantMessage);
      setMessages(prev => [...prev, assistantMessage])
      
      // Increment conversation turns for initial emissions analysis
      setConversationTurns(1)
    } catch (err) {
      console.error('🌫️ AIChatbot: Emissions analysis error:', {
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      setError(err instanceof Error ? err.message : 'An error occurred')
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error analyzing this emissions data. Please try again.',
        timestamp: new Date()
      }
      console.log('🔥 AIChatbot: Adding error message to chat:', errorMessage);
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      // Determine which tab we're on to send appropriate data structure
      const isFireTab = currentTab === 'fire-forecast'
      const isEmissionsTab = currentTab === 'air-pollution'
      const isBehindScenesTab = currentTab === 'behind-scenes'
      
      console.log('💬 AIChatbot: handleSubmit routing:', { 
        currentTab, 
        isFireTab, 
        isEmissionsTab, 
        isBehindScenesTab,
        hasSessionId: !!sessionId 
      })
      
      // Always use the unified endpoint - it handles all cases including general queries
      const requestBody = {
        query: userMessage.content,
        session_id: sessionId || "", // Use existing session or start new one
        fire_data: isFireTab ? {} : null, // Empty object maintains fire context
        emissions_data: isEmissionsTab ? {} : null // Empty object maintains emissions context
        // For Behind the Scenes tab, both fire_data and emissions_data are null
      }

      console.log('💬 AIChatbot: Making request to unified endpoint:', requestBody);

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      // Update session ID if provided
      if (data.session_id) {
        setSessionId(data.session_id)
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      
      // Increment conversation turns and show notification if threshold reached
      const newTurnCount = conversationTurns + 1
      setConversationTurns(newTurnCount)
      
      // Show modal after 4 turns (user has sent 4 messages and received 4 responses)
      if (newTurnCount >= 4 && !isBTSUnlocked && !showBTSModal) {
        setShowBTSModal(true)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpand = () => {
    onToggle()
  }

  return (
    <div
      className={cn(
        'h-full flex transition-all duration-300 ease-in-out',
        !isExpanded && !embedded ? 'pointer-events-none' : '',
        embedded ? 'static w-full h-full' : '', // Override fixed positioning if embedded
        className
      )}
    >
      {/* Chatbot Panel */}
      <div
        className={cn(
          'h-full bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out shadow-xl',
          !embedded && isExpanded ? 'w-full' : (!embedded ? 'w-0 overflow-hidden' : 'w-full'),
          embedded ? 'w-full shadow-none border-none' : '' // Force full width and no effects when embedded
        )}
      >
        {/* Header */}
        {!hideMobileHeader && (
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-teal-500 via-cyan-600 to-teal-700">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <h2 className="font-semibold text-white">Fact Finder</h2>
            </div>
            {!embedded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleExpand}
                className="hidden md:flex text-white hover:bg-teal-800/50"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-2',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  message.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'bg-secondary text-secondary-foreground'
                )}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0 text-white">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-1 text-white">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 text-white">{children}</ol>,
                        li: ({ children }) => <li className="mb-0.5 text-white">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-teal-300">{children}</strong>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  message.content
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-secondary rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* BTS Unlock Modal */}
        {showBTSModal && !isBTSUnlocked && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowBTSModal(false)}>
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-teal-500/50 rounded-xl p-6 max-w-md mx-4 shadow-2xl shadow-teal-500/20" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowBTSModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center justify-center mb-4">
                <div className="bg-gradient-to-r from-teal-500 via-cyan-600 to-teal-700 p-3 rounded-full">
                  <Unlock className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h3 className="text-xl md:text-2xl font-bold text-center text-teal-400 mb-3">
                Unlock Behind the Scenes
              </h3>
              
              <p className="text-sm md:text-base text-gray-300 text-center mb-6 leading-relaxed">
                You've been exploring PyroPath with curiosity! Ready to discover how our machine learning models work their magic?
              </p>
              
              <Button
                onClick={() => {
                  enableBTS()
                  setShowBTSModal(false)
                  if (onNavigateToML) {
                    onNavigateToML()
                  }
                }}
                className="w-full !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white hover:!from-teal-600 hover:!via-cyan-700 hover:!to-teal-800 text-base font-semibold py-6"
              >
                <Unlock className="w-5 h-5 mr-2" />
                Unlock Behind the Scenes
              </Button>
              
              <button
                onClick={() => setShowBTSModal(false)}
                className="w-full mt-3 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* ML Notification Banner */}
        {showMLNotification && onNavigateToML && (
          <div className="px-4 pb-2">
            <div className="relative bg-gradient-to-r from-teal-500/20 via-cyan-600/20 to-teal-700/20 border border-teal-500/50 rounded-lg p-3">
              <button
                onClick={() => setShowMLNotification(false)}
                className="absolute top-2 right-2 text-teal-300 hover:text-white transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-sm font-medium text-white mb-2 pr-6">
                Want to know more Behind the Scenes?
              </p>
              <Button
                onClick={() => {
                  onNavigateToML()
                  setShowMLNotification(false)
                }}
                className="w-full bg-gradient-to-r from-teal-500 via-cyan-600 to-teal-700 hover:from-teal-600 hover:via-cyan-700 hover:to-teal-800 text-white text-sm font-medium"
                size="sm"
              >
                Explore Behind the Scenes
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Collapse/Expand Toggle Button */}
      {showTrigger && (
        <button
          onClick={toggleExpand}
          className={cn(
            'h-12 flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white transition-all duration-300 shadow-lg',
            isExpanded ? 'w-0 opacity-0' : 'w-12 opacity-100 rounded-r-lg mt-20'
          )}
          aria-label={isExpanded ? 'Collapse chatbot' : 'Expand chatbot'}
        >
          {!isExpanded && (
            <div className="flex flex-col items-center gap-1">
              <MessageSquare className="w-5 h-5" />
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </button>
      )}
    </div>
  )
}

export default AIChatbot
