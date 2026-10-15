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
  analyzeEmissionsData: (emissionsData: any) => void
  // Environmental Parameters
  isParametersExpanded: boolean
  setParametersExpanded: (expanded: boolean) => void
  toggleParameters: () => void
  // Info Sidebar
  isInfoExpanded: boolean
  setInfoExpanded: (expanded: boolean) => void
  toggleInfo: () => void
  // Mobile menu
  mobileSidebarView: 'parameters' | 'info' | 'chatbot' | null
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
  // Behind the Scenes enablement
  isBTSEnabled: boolean
  isBTSUnlocked: boolean
  enableBTS: () => void
  hideBTS: () => void
  resetBTS: () => void
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
  onNavigateToML?: () => void // Callback to navigate to Behind the Scenes tab
}

const GlobalSidebarContext = createContext<GlobalSidebarContextType>({
  isChatbotExpanded: false,
  setChatbotExpanded: () => {},
  toggleChatbot: () => {},
  analyzeFireData: () => {},
  analyzeEmissionsData: () => {},
  isParametersExpanded: false,
  setParametersExpanded: () => {},
  toggleParameters: () => {},
  isInfoExpanded: false,
  setInfoExpanded: () => {},
  toggleInfo: () => {},
  mobileSidebarView: null,
  openMobileSidebar: () => {},
  closeMobileSidebar: () => {},
  isBTSEnabled: false,
  isBTSUnlocked: false,
  enableBTS: () => {},
  hideBTS: () => {},
  resetBTS: () => {}
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
  const [emissionsDataToAnalyze, setEmissionsDataToAnalyze] = useState<any>(null)
  
  // Environmental Parameters state - expanded by default when authenticated
  const [isParametersExpanded, setParametersExpanded] = useState(() => {
    // Expand by default if user is authenticated
    return !!user
  })
  
  // Info Sidebar state
  const [isInfoExpanded, setInfoExpanded] = useState(false)

  // Behind the Scenes unlock state - tracks if user has unlocked it in current session
  const [isBTSUnlocked, setIsBTSUnlocked] = useState(false)

  // Behind the Scenes visibility state - only show when on ML tab
  const [isBTSEnabled, setIsBTSEnabled] = useState(false)

  // Clear BTS state when user logs out
  React.useEffect(() => {
    if (!user) {
      setIsBTSUnlocked(false)
      setIsBTSEnabled(false)
    }
  }, [user])

  // Mobile sidebar state - tracks which sidebar is shown on mobile
  const [mobileSidebarView, setMobileSidebarView] = useState<'parameters' | 'info' | 'chatbot' | null>(null)
  
  // Track if initial auto-expansion has been done
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false)

  // Define which sidebars are available for each tab
  const getSidebarAvailability = (tab: string) => {
    switch (tab) {
      case 'fire-forecast':
      case 'risk':
        return { parameters: true, factFinder: true, info: false }
      case 'air-pollution':
      case 'emission':
        return { parameters: false, factFinder: true, info: false }
      case 'behind-scenes':
      case 'ml':
        return { parameters: false, factFinder: true, info: false } // Enable Fact Finder for ML questions
      default:
        return { parameters: false, factFinder: true, info: false }
    }
  }

  const currentTabRaw = sidebarConfig.currentTab || (pathname === '/map' ? 'air-pollution' : pathname === '/sml-graph' ? 'behind-scenes' : 'fire-forecast')
  const currentTab = currentTabRaw === 'risk' ? 'fire-forecast' : currentTabRaw === 'emission' ? 'air-pollution' : currentTabRaw === 'ml' ? 'behind-scenes' : currentTabRaw
  const sidebarAvailability = getSidebarAvailability(currentTab)
  const anySidebarExpanded = isChatbotExpanded || (isParametersExpanded && sidebarAvailability.parameters) || (isInfoExpanded && sidebarAvailability.info)

  // Auto-expand parameters sidebar when user first authenticates (only once)
  React.useEffect(() => {
    if (user && sidebarAvailability.parameters && !hasAutoExpanded) {
      setParametersExpanded(true)
      setHasAutoExpanded(true)
      // On mobile, also set mobileSidebarView to show the mobile header and control behavior
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileSidebarView('parameters')
      }
    }
  }, [user, sidebarAvailability.parameters, hasAutoExpanded])

  const toggleChatbot = () => {
    const willExpand = !isChatbotExpanded
    setChatbotExpanded(willExpand)
    // Close others when opening chatbot
    if (willExpand) {
      setParametersExpanded(false)
      setInfoExpanded(false)
      // On mobile, set mobileSidebarView when expanding
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileSidebarView('chatbot')
      }
    } else {
      // When closing on mobile, clear mobileSidebarView
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileSidebarView(null)
      }
    }
  }

  const toggleParameters = () => {
    if (!sidebarAvailability.parameters) return;
    const willExpand = !isParametersExpanded
    setParametersExpanded(willExpand)
    // Close others when opening parameters
    if (willExpand) {
      setChatbotExpanded(false)
      setInfoExpanded(false)
      // On mobile, set mobileSidebarView when expanding
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileSidebarView('parameters')
      }
    } else {
      // When closing on mobile, clear mobileSidebarView
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileSidebarView(null)
      }
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
    setEmissionsDataToAnalyze(null) // Clear emissions data when analyzing fire
    setChatbotExpanded(true)
    // Close other sidebars when analyzing fire data
    setParametersExpanded(false)
    setInfoExpanded(false)
    // On mobile, set mobileSidebarView to show the mobile header and control behavior
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileSidebarView('chatbot')
    }
    console.log('🔥 AuthenticatedLayout: Chatbot expanded and fire data set for analysis');
  }

  const analyzeEmissionsData = (emissionsData: any) => {
    console.log('🌫️ AuthenticatedLayout: analyzeEmissionsData called with data:', {
      emissionsData: emissionsData,
      dataSize: JSON.stringify(emissionsData).length,
      hasEmissions: !!emissionsData?.emissions
    });
    setEmissionsDataToAnalyze(emissionsData)
    setFireDataToAnalyze(null) // Clear fire data when analyzing emissions
    setChatbotExpanded(true)
    // Close other sidebars when analyzing emissions data
    setParametersExpanded(false)
    setInfoExpanded(false)
    // On mobile, set mobileSidebarView to show the mobile header and control behavior
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileSidebarView('chatbot')
    }
    console.log('🌫️ AuthenticatedLayout: Chatbot expanded and emissions data set for analysis');
  }

  const enableBTS = () => {
    setIsBTSUnlocked(true)
    setIsBTSEnabled(true)
  }

  const hideBTS = () => {
    setIsBTSEnabled(false)
  }

  const resetBTS = () => {
    setIsBTSUnlocked(false)
    setIsBTSEnabled(false)
  }

  // Disable body scroll when mobile sidebar is open
  React.useEffect(() => {
    if (mobileSidebarView) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileSidebarView])

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
        analyzeEmissionsData,
        isParametersExpanded,
        setParametersExpanded,
        toggleParameters,
        isInfoExpanded,
        setInfoExpanded,
        toggleInfo,
        mobileSidebarView,
        openMobileSidebar,
        closeMobileSidebar,
        isBTSEnabled,
        isBTSUnlocked,
        enableBTS,
        hideBTS,
        resetBTS
      }}>
        <div className="flex min-h-screen">
          {/* Mobile Overlay - darkens background when sidebar is open */}
          {mobileSidebarView && (
            <div 
              className="md:hidden fixed inset-0 bg-black/50 z-[45]"
              onClick={closeMobileSidebar}
              aria-hidden="true"
            />
          )}

          {/* Mobile Sidebar Navigation Header - shows when any sidebar is open on mobile */}
          {mobileSidebarView && (
            <div className="md:hidden fixed top-0 left-0 z-[75] bg-gradient-to-r from-teal-500 via-cyan-600 to-teal-700 border-b border-teal-400 shadow-lg" style={{ width: '320px', maxWidth: '320px' }}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  {/* Parameters Tab */}
                  {sidebarAvailability.parameters && (
                    <button
                      onClick={() => switchMobileView('parameters')}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        mobileSidebarView === 'parameters'
                          ? 'bg-white/20 ring-2 ring-white/50'
                          : 'bg-transparent hover:bg-white/10'
                      }`}
                      aria-label="Parameters"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                    </button>
                  )}

                  {/* Info Tab */}
                  {/* {sidebarAvailability.info && (
                    <button
                      onClick={() => switchMobileView('info')}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        mobileSidebarView === 'info'
                          ? 'bg-white/20 ring-2 ring-white/50'
                          : 'bg-transparent hover:bg-white/10'
                      }`}
                      aria-label="Info"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )} */}

                  {/* Chatbot Tab */}
                  {sidebarAvailability.factFinder && (
                    <button
                      onClick={() => switchMobileView('chatbot')}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        mobileSidebarView === 'chatbot'
                          ? 'bg-white/20 ring-2 ring-white/50'
                          : 'bg-transparent hover:bg-white/10'
                      }`}
                      aria-label="Fact Finder"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={closeMobileSidebar}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                  aria-label="Close sidebar"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

        {/* Environmental Parameters Sidebar */}
        {sidebarAvailability.parameters && (
          <div 
            className={`fixed left-0 bg-background/95 backdrop-blur-sm border-r border-border z-50 transition-all duration-300 ease-in-out top-[52px] md:top-0 h-[calc(100vh-52px)] md:h-full ${
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
                onClose={() => mobileSidebarView ? closeMobileSidebar() : setParametersExpanded(false)}
              />
            </div>
          </div>
        )}

        {/* Info Sidebar */}
        {sidebarAvailability.info && (
          <div 
            className={`fixed left-0 bg-background/95 backdrop-blur-sm border-r border-border z-50 transition-all duration-300 ease-in-out top-[52px] md:top-0 h-[calc(100vh-52px)] md:h-full ${
              isInfoExpanded ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ width: '320px', maxWidth: '320px' }}
          >
            <div className="h-full flex flex-col overflow-hidden">
              <InfoSidebar 
                isOpen={isInfoExpanded} 
                onClose={() => mobileSidebarView ? closeMobileSidebar() : setInfoExpanded(false)}
                currentTab={currentTab}
              />
            </div>
          </div>
        )}

        {/* AI Chatbot Sidebar */}
        {sidebarAvailability.factFinder && (
          <div
            className={`fixed left-0 z-[70] transition-all duration-300 ease-in-out top-[52px] md:top-0 h-[calc(100vh-52px)] md:h-full ${
              isChatbotExpanded ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ width: '320px', maxWidth: '320px' }}
          >
            <AIChatbot 
              isExpanded={isChatbotExpanded} 
              onToggle={() => mobileSidebarView ? closeMobileSidebar() : toggleChatbot()} 
              fireDataToAnalyze={fireDataToAnalyze}
              emissionsDataToAnalyze={emissionsDataToAnalyze}
              onFireDataAnalyzed={() => setFireDataToAnalyze(null)}
              onEmissionsDataAnalyzed={() => setEmissionsDataToAnalyze(null)}
              showTrigger={false}
              onNavigateToML={sidebarConfig.onNavigateToML}
              currentTab={currentTab}
              hideMobileHeader={!!mobileSidebarView}
            />
          </div>
        )}

        {/* Global Sidebar Controls - Desktop Only */}
        <div
          className="hidden md:flex fixed top-20 z-[80] transition-all duration-300 ease-in-out flex-col items-start gap-1"
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
          {/* {sidebarAvailability.info && (
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
          )} */}

          {/* Chatbot Toggle */}
          {sidebarAvailability.factFinder && (
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
          )}
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
