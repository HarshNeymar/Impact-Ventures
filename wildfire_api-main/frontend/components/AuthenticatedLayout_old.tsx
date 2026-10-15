"use client"

import React, { createContext, useContext, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AIChatbot } from '@/components/AIChatbot'
import { useAuth } from '@/components/auth/AuthProvider'
import { GraphsSideNav, DEFAULT_GRAPHS_CONTROLS } from '@/components/GraphsSideNav'
import { InfoSidebar } from '@/components/InfoSidebar'

interface GlobalSidebarContextType {
  // Chatbot/Fact Finder
  isChatbotExpanded: boolean
  setChatbotExpanded: (expanded: boolean) => void
  toggleChatbot: () => void
  analyzeFireData: (fireData: any) => void
  // Environmental Parameters
  isParametersExpanded: boolean
  setParametersExpanded: (expanded: boolean) => void
  toggleParameters: () => void
  // Info Sidebar
  isInfoExpanded: boolean
  setInfoExpanded: (expanded: boolean) => void
  toggleInfo: () => void
}

interface GlobalSidebarConfig {
  currentTab?: string
  graphsControls?: typeof DEFAULT_GRAPHS_CONTROLS
  onGraphsControlsChange?: (controls: typeof DEFAULT_GRAPHS_CONTROLS) => void
  onStateChange?: (state: string) => void
  onCountyChange?: (county: string) => void
  onDateChange?: (date: Date | null) => void
  onWildfireApiResponse?: (response: any, error?: string) => void
  onResetAll?: () => void
}

const GlobalSidebarContext = createContext<GlobalSidebarContextType>({
  isChatbotExpanded: false,
  setChatbotExpanded: () => {},
  toggleChatbot: () => {},
  analyzeFireData: () => {},
  isParametersExpanded: false,
  setParametersExpanded: () => {},
  toggleParameters: () => {},
  isInfoExpanded: false,
  setInfoExpanded: () => {},
  toggleInfo: () => {}
})

const GlobalSidebarConfigContext = createContext<{
  config: GlobalSidebarConfig
  setConfig: React.Dispatch<React.SetStateAction<GlobalSidebarConfig>>
}>({
  config: {},
  setConfig: () => {}
})

export const useGlobalSidebars = () => useContext(GlobalSidebarContext)

export const useGlobalSidebarConfig = () => useContext(GlobalSidebarConfigContext)

// For backward compatibility
export const useChatbot = () => {
  const { isChatbotExpanded, setChatbotExpanded, toggleChatbot, analyzeFireData } = useContext(GlobalSidebarContext)
  return { 
    isExpanded: isChatbotExpanded, 
    setIsExpanded: setChatbotExpanded, 
    toggleChatbot, 
    analyzeFireData 
  }
}

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user } = useAuth()
  const pathname = usePathname()

  const [sidebarConfig, setSidebarConfig] = useState<GlobalSidebarConfig>({})
  
  // Chatbot/Fact Finder state
  const [isChatbotExpanded, setChatbotExpanded] = useState(false)
  const [fireDataToAnalyze, setFireDataToAnalyze] = useState<any>(null)
  
  // Environmental Parameters state
  const [isParametersExpanded, setParametersExpanded] = useState(false)
  
  // Info Sidebar state
  const [isInfoExpanded, setInfoExpanded] = useState(false)

  // Mobile sidebar state - tracks which sidebar is shown on mobile
  const [mobileSidebarView, setMobileSidebarView] = useState<'parameters' | 'info' | 'chatbot' | null>(null)

  // Define which sidebars are available for each tab
  const getSidebarAvailability = (tab: string) => {
    switch (tab) {
      case 'fire-forecast':
      case 'risk':
        return { parameters: true, factFinder: true, info: true }
      case 'air-pollution':
      case 'emission':
        return { parameters: false, factFinder: true, info: true }
      case 'behind-scenes':
      case 'ml':
        return { parameters: false, factFinder: true, info: false }
      default:
        return { parameters: false, factFinder: true, info: false }
    }
  }

  const currentTabRaw = sidebarConfig.currentTab || (pathname === '/map' ? 'air-pollution' : pathname === '/sml-graph' ? 'behind-scenes' : 'fire-forecast')
  const currentTab = currentTabRaw === 'risk' ? 'fire-forecast' : currentTabRaw === 'emission' ? 'air-pollution' : currentTabRaw === 'ml' ? 'behind-scenes' : currentTabRaw
  const sidebarAvailability = getSidebarAvailability(currentTab)
  const anySidebarExpanded = isChatbotExpanded || (isParametersExpanded && sidebarAvailability.parameters) || (isInfoExpanded && sidebarAvailability.info)

  const toggleChatbot = () => {
    setChatbotExpanded(prev => !prev)
    // Close others when opening chatbot
    if (!isChatbotExpanded) {
      setParametersExpanded(false)
      setInfoExpanded(false)
    }
  }

  const toggleParameters = () => {
    if (!sidebarAvailability.parameters) return;
    setParametersExpanded(prev => !prev)
    // Close others when opening parameters
    if (!isParametersExpanded) {
      setChatbotExpanded(false)
      setInfoExpanded(false)
    }
  }

  const openMobileSidebar = () => {
    // Open with parameters view by default if available, otherwise info, otherwise chatbot
    if (sidebarAvailability.parameters) {
      setMobileSidebarView('parameters')
      setParametersExpanded(true)
      setChatbotExpanded(false)
      setInfoExpanded(false)
    } else if (sidebarAvailability.info) {
      setMobileSidebarView('info')
      setInfoExpanded(true)
      setChatbotExpanded(false)
      setParametersExpanded(false)
    } else {
      setMobileSidebarView('chatbot')
      setChatbotExpanded(true)
      setParametersExpanded(false)
      setInfoExpanded(false)
    }
  }

  const closeMobileSidebar = () => {
    setMobileSidebarView(null)
    setParametersExpanded(false)
    setInfoExpanded(false)
    setChatbotExpanded(false)
  }

  const switchMobileView = (view: 'parameters' | 'info' | 'chatbot') => {
    setMobileSidebarView(view)
    if (view === 'parameters') {
      setParametersExpanded(true)
      setChatbotExpanded(false)
      setInfoExpanded(false)
    } else if (view === 'info') {
      setInfoExpanded(true)
      setChatbotExpanded(false)
      setParametersExpanded(false)
    } else if (view === 'chatbot') {
      setChatbotExpanded(true)
      setParametersExpanded(false)
      setInfoExpanded(false)
    }
  }

  const toggleInfo = () => {
    if (!sidebarAvailability.info) return
    setInfoExpanded(prev => !prev)
    // Close others when opening info
    if (!isInfoExpanded) {
      setChatbotExpanded(false)
      setParametersExpanded(false)
    }
  }

  const analyzeFireData = (fireData: any) => {
    console.log('🔥 AuthenticatedLayout: analyzeFireData called with data:', {
      fireData: fireData,
      dataSize: JSON.stringify(fireData).length,
      hasRiskEvents: fireData?.risk_events?.length || 0
    });
    setFireDataToAnalyze(fireData)
    setChatbotExpanded(true)
    // Close other sidebars when analyzing fire data
    setParametersExpanded(false)
    setInfoExpanded(false)
    console.log('🔥 AuthenticatedLayout: Chatbot expanded and fire data set for analysis');
  }

  // Only show sidebars for authenticated users
  if (!user) {
    return <>{children}</>
  }

  // Hide sidebars completely on profile page
  const isProfilePage = pathname === '/profile'

  if (isProfilePage) {
    return <>{children}</>
  }

  return (
    <GlobalSidebarConfigContext.Provider value={{ config: sidebarConfig, setConfig: setSidebarConfig }}>
      <GlobalSidebarContext.Provider value={{ 
        isChatbotExpanded, 
        setChatbotExpanded, 
        toggleChatbot, 
        analyzeFireData,
        isParametersExpanded,
        setParametersExpanded,
        toggleParameters,
        isInfoExpanded,
        setInfoExpanded,
        toggleInfo
      }}>
        <div className="flex min-h-screen">
        {/* Environmental Parameters Sidebar */}
        {sidebarAvailability.parameters && (
          <div 
            className={`fixed left-0 top-0 h-full bg-background/95 backdrop-blur-sm border-r border-border z-50 transition-all duration-300 ease-in-out ${
              isParametersExpanded ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ width: '320px', maxWidth: '320px' }}
          >
            <div className="h-full flex flex-col overflow-hidden">
              <GraphsSideNav
                controls={sidebarConfig.graphsControls || DEFAULT_GRAPHS_CONTROLS}
                onControlsChange={sidebarConfig.onGraphsControlsChange || (() => {})}
                onResetAll={sidebarConfig.onResetAll}
                onWildfireApiResponse={sidebarConfig.onWildfireApiResponse}
                onStateChange={sidebarConfig.onStateChange}
                onCountyChange={sidebarConfig.onCountyChange}
                onDateChange={sidebarConfig.onDateChange}
                onClose={() => setParametersExpanded(false)}
              />
            </div>
          </div>
        )}

        {/* Info Sidebar */}
        {sidebarAvailability.info && (
          <div 
            className={`fixed left-0 top-0 h-full bg-background/95 backdrop-blur-sm border-r border-border z-50 transition-all duration-300 ease-in-out ${
              isInfoExpanded ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ width: '320px', maxWidth: '320px' }}
          >
            <div className="h-full flex flex-col overflow-hidden">
              <InfoSidebar 
                isOpen={isInfoExpanded} 
                onClose={() => setInfoExpanded(false)}
                currentTab={currentTab}
              />
            </div>
          </div>
        )}

        {/* AI Chatbot Sidebar */}
        <AIChatbot 
          isExpanded={isChatbotExpanded} 
          onToggle={toggleChatbot} 
          fireDataToAnalyze={fireDataToAnalyze}
          onFireDataAnalyzed={() => setFireDataToAnalyze(null)}
          showTrigger={false}
        />

        {/* Global Sidebar Controls */}
        <div
          className="fixed top-20 z-[80] transition-all duration-300 ease-in-out flex flex-col items-start gap-1"
          style={{ left: anySidebarExpanded ? '320px' : '0px' }}
        >
          {/* Environmental Parameters Toggle */}
          {sidebarAvailability.parameters && (
            <button
              onClick={toggleParameters}
              className={`text-white p-2 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center h-12 w-12 rounded-r-lg ${
                isParametersExpanded 
                  ? 'bg-gradient-to-r from-teal-400 via-cyan-500 to-teal-600 shadow-2xl ring-2 ring-teal-300/50 rounded-l-none' 
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
              aria-label={isParametersExpanded ? 'Close parameters' : 'Open parameters'}
              title={isParametersExpanded ? 'Close Parameters' : 'Open Parameters'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>
          )}

          {/* Info Sidebar Toggle */}
          {sidebarAvailability.info && (
            <button
              onClick={toggleInfo}
              className={`text-white p-2 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center h-12 w-12 rounded-r-lg ${
                isInfoExpanded 
                  ? 'bg-gradient-to-r from-teal-400 via-cyan-500 to-teal-600 shadow-2xl ring-2 ring-teal-300/50 rounded-l-none' 
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
              aria-label={isInfoExpanded ? 'Close info' : 'Open info'}
              title={isInfoExpanded ? 'Close Info' : 'Open Info'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          {/* Chatbot Toggle - Always available */}
          <button
            onClick={toggleChatbot}
            className={`text-white p-2 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center h-12 w-12 rounded-r-lg ${
              isChatbotExpanded 
                ? 'bg-gradient-to-r from-teal-400 via-cyan-500 to-teal-600 shadow-2xl ring-2 ring-teal-300/50 rounded-l-none' 
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
            aria-label={isChatbotExpanded ? 'Close chat' : 'Open chat'}
            title={isChatbotExpanded ? 'Close Fact Finder' : 'Open Fact Finder'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
        
        {/* Main Content - adjusted for sidebar width */}
        <div
          className="flex-1 transition-all duration-300 ease-in-out"
          style={{
            marginLeft: anySidebarExpanded ? '320px' : '0px'
          }}
        >
          {children}
        </div>
        </div>
      </GlobalSidebarContext.Provider>
    </GlobalSidebarConfigContext.Provider>
  )
}

export default AuthenticatedLayout
