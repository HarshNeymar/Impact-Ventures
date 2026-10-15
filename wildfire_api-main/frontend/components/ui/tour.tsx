"use client"

import * as React from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface TourStep {
  id: string
  title: string
  content: string
  target: string // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-right' | 'top-left'
  // Optional selector used only for positioning the dialog; target remains highlighted
  anchor?: string
  allowNext?: boolean
  allowPrev?: boolean
  action?: () => void // Optional action to perform when step is shown
}

interface TourContextType {
  isActive: boolean
  currentStep: number
  steps: TourStep[]
  startTour: (steps: TourStep[]) => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (stepIndex: number) => void
}

const TourContext = React.createContext<TourContextType | null>(null)

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [steps, setSteps] = React.useState<TourStep[]>([])

  const startTour = React.useCallback((tourSteps: TourStep[]) => {
    console.log('Starting tour with steps:', tourSteps)
    setSteps(tourSteps)
    setCurrentStep(0)
    setIsActive(true)
    console.log('Tour state set to active, isActive will be:', true)
  }, [])

  const endTour = React.useCallback(() => {
    setIsActive(false)
    setCurrentStep(0)
    setSteps([])
  }, [])

  const nextStep = React.useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      endTour()
    }
  }, [currentStep, steps.length, endTour])

  const prevStep = React.useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const goToStep = React.useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex)
    }
  }, [steps.length])

  const contextValue = React.useMemo(() => ({
    isActive,
    currentStep,
    steps,
    startTour,
    endTour,
    nextStep,
    prevStep,
    goToStep
  }), [isActive, currentStep, steps, startTour, endTour, nextStep, prevStep, goToStep])

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {isActive && <TourOverlay />}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = React.useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}

function TourOverlay() {
  const { isActive, currentStep, steps, endTour, nextStep, prevStep } = useTour()
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = React.useState(false)
  const [isTablet, setIsTablet] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement | null>(null)

  const currentStepData = steps[currentStep]

  React.useEffect(() => {
    console.log('TourOverlay render - isActive:', isActive, 'currentStep:', currentStep, 'steps length:', steps.length)
  }, [isActive, currentStep, steps])

  // Track mobile breakpoint
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  React.useEffect(() => {
    if (!isActive || !currentStepData) return

    const updateTargetPosition = () => {
      console.log('Looking for target element:', currentStepData.target)
      const targetElement = document.querySelector(currentStepData.target)
      console.log('Target element found:', targetElement)
      if (targetElement) {
        // Anchor element for positioning (defaults to target)
        const anchorElement = currentStepData.anchor
          ? document.querySelector(currentStepData.anchor)
          : targetElement
        const rect = targetElement.getBoundingClientRect()
        const anchorRect = (anchorElement || targetElement).getBoundingClientRect()
        console.log('Target element rect:', rect)
        setTargetRect(rect)

        const padding = 16
        const measuredWidth = cardRef.current?.offsetWidth ?? Math.min(360, window.innerWidth - padding * 2)
        const measuredHeight = cardRef.current?.offsetHeight ?? Math.min(320, window.innerHeight - padding * 2)

        // Mobile: show as bottom sheet for reliability
        if (isMobile) {
          setTooltipPosition({ x: padding, y: window.innerHeight - measuredHeight - padding })
        } else {
          // Desktop/tablet positioning (compute relative to anchorRect)
          // If anchor is the main container (very large) or nearly full height, prefer centered placement
          const isHugeTarget = anchorRect.height >= window.innerHeight * 0.8
          const isMainContainer = (currentStepData.anchor || currentStepData.target || '').includes("[data-tour='main-container']")

          if (isHugeTarget || isMainContainer || currentStepData.position === 'center' || (isTablet && currentStepData.anchor === "[data-tour='environmental-params']")) {
            // Center in viewport for better visibility on big screens
            const cx = Math.max(padding, (window.innerWidth - measuredWidth) / 2)
            const cy = Math.max(padding, (window.innerHeight - measuredHeight) / 2)
            setTooltipPosition({ x: cx, y: cy })
          } else {
            // Anchored positioning near target
            let x = anchorRect.left + anchorRect.width / 2 - measuredWidth / 2
            let y = anchorRect.bottom + padding

            switch (currentStepData.position) {
              case 'top':
                y = anchorRect.top - measuredHeight - padding
                break
              case 'top-right':
                x = anchorRect.right - measuredWidth - padding
                y = anchorRect.top + padding
                break
              case 'top-left':
                x = anchorRect.left + padding
                y = anchorRect.top + padding
                break
              case 'left':
                x = anchorRect.left - measuredWidth - padding
                y = anchorRect.top + anchorRect.height / 2 - measuredHeight / 2
                break
              case 'right':
                x = anchorRect.right + padding
                y = anchorRect.top + anchorRect.height / 2 - measuredHeight / 2
                break
              case 'bottom':
              default:
                y = anchorRect.bottom + padding
                break
            }

            // Clamp within viewport
            x = Math.max(padding, Math.min(x, window.innerWidth - measuredWidth - padding))
            y = Math.max(padding, Math.min(y, window.innerHeight - measuredHeight - padding))

            setTooltipPosition({ x, y })
          }
        }

        if (currentStepData.action) {
          currentStepData.action()
        }
      } else {
        console.log('Target element not found, using fallback position')
        const fallbackRect = new DOMRect(window.innerWidth / 2 - 150, 100, 300, 100)
        setTargetRect(fallbackRect)
        const padding = 16
        const measuredWidth = cardRef.current?.offsetWidth ?? Math.min(360, window.innerWidth - padding * 2)
        const measuredHeight = cardRef.current?.offsetHeight ?? Math.min(320, window.innerHeight - padding * 2)
        if (isMobile) {
          setTooltipPosition({ x: padding, y: window.innerHeight - measuredHeight - padding })
        } else {
          setTooltipPosition({ x: Math.max(padding, (window.innerWidth - measuredWidth) / 2), y: Math.max(padding, (window.innerHeight - measuredHeight) / 2) })
        }
      }
    }

    updateTargetPosition()
    window.addEventListener('resize', updateTargetPosition)
    window.addEventListener('scroll', updateTargetPosition)

    // Recalculate after card renders to get accurate size
    const raf = requestAnimationFrame(updateTargetPosition)

    return () => {
      window.removeEventListener('resize', updateTargetPosition)
      window.removeEventListener('scroll', updateTargetPosition)
      cancelAnimationFrame(raf)
    }
  }, [isActive, currentStep, currentStepData, isMobile])

  if (!isActive || !currentStepData || !targetRect) return null

  return (
    <>
      {/* Dark overlay with cutout for highlighted element */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          clipPath: `polygon(
            0% 0%, 
            0% ${targetRect.top}px, 
            ${targetRect.left}px ${targetRect.top}px, 
            ${targetRect.left}px ${targetRect.bottom}px, 
            ${targetRect.right}px ${targetRect.bottom}px, 
            ${targetRect.right}px ${targetRect.top}px, 
            100% ${targetRect.top}px, 
            100% 0%, 
            100% 100%, 
            0% 100%
          )`,
        }}
      />

      {/* Highlight border around target element */}
      <div
        className="fixed z-50 pointer-events-none border-4 border-blue-500 rounded-lg shadow-2xl"
        style={{
          left: targetRect.left - 4,
          top: targetRect.top - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
        }}
      />

      {/* Tour tooltip */}
      <Card
        ref={cardRef as any}
        className="fixed z-50 w-80 max-w-[90vw] shadow-2xl border-2 border-blue-300 bg-gray-900/90 text-white backdrop-blur-sm max-h-[80vh] overflow-auto sm:max-h-[70vh]"
        style={
          isMobile
            ? { left: 16, right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }
            : { left: tooltipPosition.x, top: tooltipPosition.y }
        }
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-white mb-1">
                {currentStepData.title}
              </h3>
              <div className="text-xs text-gray-300 mb-2">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={endTour}
              className="h-8 w-8 p-0 hover:bg-white/10 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-sm text-gray-100 mb-4 leading-relaxed">
            {currentStepData.content}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0 || currentStepData.allowPrev === false}
              className="flex items-center gap-1 border-white/30 text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="text-xs text-gray-300">
              {currentStep + 1} / {steps.length}
            </div>

            <Button
              size="sm"
              onClick={nextStep}
              disabled={currentStepData.allowNext === false}
              className="flex items-center gap-1 bg-white text-gray-900 hover:bg-white/90"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export function TourTrigger({ 
  children, 
  steps, 
  className 
}: { 
  children: React.ReactNode
  steps: TourStep[]
  className?: string 
}) {
  const { startTour } = useTour()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Tour trigger clicked, starting tour with steps:', steps)
    startTour(steps)
  }

  return (
    <div 
      className={cn("cursor-pointer", className)}
      onClick={handleClick}
    >
      {React.cloneElement(children as React.ReactElement, {
        onClick: handleClick
      })}
    </div>
  )
}