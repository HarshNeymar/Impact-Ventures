"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { DEFAULT_GRAPHS_CONTROLS } from "@/components/GraphsSideNav";
import type { WildfireApiResponse } from "@/types/wildfire";
import { Footer } from "@/components/footer";
import { TabManager } from "@/components/TabManager";
import { TourProvider } from "@/components/ui/tour";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RiskForecast } from "@/components/RiskForecast";
import { MLAnalytics } from "@/components/MLAnalytics";
import { EmissionsMap } from "@/components/EmissionsMap";
import { AirPollutionInfo } from "@/components/AirPollutionInfo";
import { BehindTheScenesInfo } from "@/components/BehindTheScenesInfo";
import { ResearchAbstractCard } from "@/components/ResearchAbstractCard";
import { DesktopTabNavigation, MobileTabNavigation } from "@/components/TabNavigation";
import { MobileRestrictionModal, MobileEmissionMessage } from "@/components/MobileComponents";
import { useMobileDetection } from "@/lib/hooks/useMobileDetection";
import { useEmissionsData } from "@/lib/hooks/useEmissionsData";
import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem, clearLocalStorageItems } from "@/lib/utils/storageUtils";
import { useGlobalSidebarConfig, useGlobalSidebars } from "@/components/AuthenticatedLayout";
import UserMenu from "@/components/auth/UserMenu";

export default function HomePage() {
  return (
    <RequireAuth>
      <TourProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <HomePageContent />
        </Suspense>
      </TourProvider>
    </RequireAuth>
  );
}

function HomePageContent() {
  return (
    <TabManager>
      {({ tab, handleTabChange }) => (
        <HomePageContentInner tab={tab} handleTabChange={handleTabChange} />
      )}
    </TabManager>
  );
}

function HomePageContentInner({
  tab,
  handleTabChange,
}: {
  tab: "risk" | "emission" | "ml";
  handleTabChange: (newTab: "risk" | "emission" | "ml") => void;
}) {
  const isMobile = useMobileDetection(768);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const { setConfig } = useGlobalSidebarConfig();
  const { isBTSEnabled, isBTSUnlocked, hideBTS, enableBTS, resetBTS } = useGlobalSidebars();

  const [graphsControls, setGraphsControls] = useState(DEFAULT_GRAPHS_CONTROLS);
  const [selectedState, setSelectedState] = useState(() =>
    getLocalStorageItem<string>("selectedState", "")
  );
  const [selectedCounty, setSelectedCounty] = useState(() =>
    getLocalStorageItem<string>("selectedCounty", "")
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const savedDate = getLocalStorageItem<string | null>("selectedDate", null);
    return savedDate ? new Date(savedDate) : null;
  });
  const [wildfireResponse, setWildfireResponse] = useState<WildfireApiResponse | null>(() =>
    getLocalStorageItem<WildfireApiResponse | null>("wildfireResponse", null)
  );
  const [apiError, setApiError] = useState<string | null>(null);

  const { emissionsData, isRefreshing, refreshEmissions } = useEmissionsData();

  const [resetCounter, setResetCounter] = useState(0);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const predictionApplyTimer = useRef<NodeJS.Timeout | null>(null);

  const handleGraphsControlsChange = useCallback((newControls: typeof DEFAULT_GRAPHS_CONTROLS) => {
    setGraphsControls(newControls);
  }, []);

  const handleStateChange = useCallback((state: string) => {
    setSelectedState(state);
  }, []);

  const handleCountyChange = useCallback((county: string) => {
    setSelectedCounty(county);
  }, []);

  const handleDateChange = useCallback((date: Date | null) => {
    setSelectedDate(date);
  }, []);

  const handleWildfireApiResponse = useCallback((response: WildfireApiResponse | null, error?: string) => {
    if (predictionApplyTimer.current) clearTimeout(predictionApplyTimer.current);

    if (response && !error) {
      setIsLoadingPrediction(true);
      predictionApplyTimer.current = setTimeout(() => {
        setWildfireResponse(response);
        setApiError(null);
        if (response.input?.state) setSelectedState(response.input.state);
        if (response.input?.county) setSelectedCounty(response.input.county);

        clearLocalStorageItems(["riskHeatmapData", "kpiData", "bsevData"]);
        setIsLoadingPrediction(false);
      }, 250);
    } else {
      setWildfireResponse(response);
      setApiError(error || null);
      setIsLoadingPrediction(false);
    }
  }, []);

  const performFullReset = useCallback((clearSelections: boolean = true, resetSliders: boolean = true) => {
    setWildfireResponse(null);
    setApiError(null);
    if (resetSliders) {
      setGraphsControls(DEFAULT_GRAPHS_CONTROLS);
    }
    if (clearSelections) {
      setSelectedState("");
      setSelectedCounty("");
      setSelectedDate(null);
    }

    clearLocalStorageItems(["riskHeatmapData", "kpiData", "bsevData"]);

    if (clearSelections) {
      clearLocalStorageItems(["selectedState", "selectedCounty", "selectedDate", "wildfireResponse"]);
    }

    setResetCounter((prev) => prev + 1);
    setIsLoadingPrediction(false);
  }, []);

  const currentTab = tab === "risk" ? "fire-forecast" : tab === "emission" ? "air-pollution" : "behind-scenes";

  const sidebarConfig = useMemo(() => ({
    currentTab,
    graphsControls,
    onGraphsControlsChange: handleGraphsControlsChange,
    onStateChange: handleStateChange,
    onCountyChange: handleCountyChange,
    onDateChange: handleDateChange,
    onWildfireApiResponse: handleWildfireApiResponse,
    onResetAll: () => performFullReset(true, true),
    onNavigateToML: () => handleTabChange("ml")
  }), [
    currentTab,
    graphsControls,
    handleGraphsControlsChange,
    handleStateChange,
    handleCountyChange,
    handleDateChange,
    handleWildfireApiResponse,
    performFullReset,
    handleTabChange
  ]);

  useEffect(() => {
    setConfig(sidebarConfig);
  }, [setConfig, sidebarConfig]);

  // Initialize BTS state based on URL on mount
  useEffect(() => {
    if (tab === 'ml') {
      // If URL has tab=ml, unlock and enable BTS
      enableBTS();
    }
  }, []); // Empty dependency array - run only on mount

  // Reset BTS state when switching away from ML tab
  useEffect(() => {
    if (tab === 'risk' || tab === 'emission') {
      resetBTS();
    } else if (tab === 'ml' && isBTSUnlocked) {
      // Show BTS tab when navigating to ML tab (only if unlocked)
      enableBTS();
    }
  }, [tab, isBTSUnlocked, resetBTS, enableBTS]);

  useEffect(() => {
    if (tab === "emission" && isMobile) {
      setShowMobileModal(true);
      setTimeout(() => {
        handleTabChange("risk");
      }, 100);
    }
  }, [tab, isMobile, handleTabChange]);

  useEffect(() => {
    setLocalStorageItem("selectedState", selectedState);
  }, [selectedState]);

  useEffect(() => {
    setLocalStorageItem("selectedCounty", selectedCounty);
  }, [selectedCounty]);

  useEffect(() => {
    if (selectedDate) {
      setLocalStorageItem("selectedDate", selectedDate.toISOString());
    } else {
      removeLocalStorageItem("selectedDate");
    }
  }, [selectedDate]);

  useEffect(() => {
    if (wildfireResponse) {
      setLocalStorageItem("wildfireResponse", wildfireResponse);
    } else {
      removeLocalStorageItem("wildfireResponse");
    }
  }, [wildfireResponse]);

  const { mobileSidebarView, openMobileSidebar } = useGlobalSidebars() as any;

  return (
    <main className="min-h-screen flex flex-col items-center justify-start">
      <header className="top-0 z-50 text-foreground mt-2 md:mt-4 w-full bg-transparent">
        <div className="w-full flex items-center justify-center px-3 md:px-5 py-2 md:py-4 relative">
          {/* Hamburger Menu Button - Mobile Only - positioned absolutely on left */}
          {!mobileSidebarView && (
            <button
              onClick={openMobileSidebar}
              className="md:hidden absolute left-3 text-white p-2 flex items-center justify-center h-10 w-10 rounded-lg bg-teal-600 hover:bg-teal-700"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          {/* Logo centered */}
          <Link href="/" className="flex items-center">
            <Image
              src="/PyroPathLogo1.png"
              alt="PyroPath logo"
              width={60}
              height={60}
              className="md:w-[90px] md:h-[90px] rounded-sm"
              priority
            />
          </Link>

          {/* User Menu - positioned absolutely on right */}
          <div className="absolute right-3 md:right-5">
            <UserMenu />
          </div>
        </div>
      </header>

      <section className="flex flex-col items-center justify-start flex-1 min-h-0 w-full mt-4 md:mt-0">
        <DesktopTabNavigation tab={tab} onTabChange={handleTabChange} isBTSEnabled={isBTSEnabled} />

        <div className="w-full flex-1 min-h-0 overflow-hidden flex flex-col items-center pb-20 md:pb-0 transition-all duration-300 ease-in-out">
          {tab === "risk" && (
            <RiskForecast
              graphsControls={graphsControls}
              selectedState={selectedState}
              selectedCounty={selectedCounty}
              selectedDate={selectedDate}
              wildfireResponse={wildfireResponse}
              apiError={apiError}
              isLoadingPrediction={isLoadingPrediction}
              resetCounter={resetCounter}
              onGraphsControlsChange={handleGraphsControlsChange}
              onStateChange={handleStateChange}
              onCountyChange={handleCountyChange}
              onDateChange={handleDateChange}
              onWildfireApiResponse={handleWildfireApiResponse}
              onResetAll={() => performFullReset(true, true)}
            />
          )}

          {tab === "emission" && (
            <div className="w-full h-full">
              <MobileEmissionMessage onGoToRisk={() => handleTabChange("risk")} />
              <div className="hidden md:block h-full">
                <EmissionsMap
                  emissionsData={emissionsData}
                  isRefreshing={isRefreshing}
                  onRefresh={refreshEmissions}
                />
              </div>
              <div className="hidden md:block w-full px-3 md:px-4 lg:px-8">
                <AirPollutionInfo />
              </div>
            </div>
          )}

          {tab === "ml" && (
            <div className="w-full h-full">
              <MLAnalytics />
              <div className="hidden md:block w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ResearchAbstractCard />
                <BehindTheScenesInfo />
              </div>
            </div>
          )}
        </div>
      </section>

      <MobileRestrictionModal show={showMobileModal} onClose={() => setShowMobileModal(false)} />
      {!mobileSidebarView && <MobileTabNavigation tab={tab} onTabChange={handleTabChange} isBTSEnabled={isBTSEnabled} />}
      <Footer />
    </main>
  );
}
