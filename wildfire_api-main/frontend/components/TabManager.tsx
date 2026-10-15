"use client"

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface TabManagerProps {
  children: (props: {
    tab: 'risk' | 'emission' | 'ml';
    handleTabChange: (newTab: 'risk' | 'emission' | 'ml') => void;
  }) => React.ReactNode;
}

export function TabManager({ children }: TabManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tab state - with URL query parameter persistence
  const [tab, setTab] = React.useState<'risk' | 'emission' | 'ml'>(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['risk', 'emission', 'ml'].includes(tabFromUrl)) {
      return tabFromUrl as 'risk' | 'emission' | 'ml';
    }
    return 'risk'; // Default to risk tab
  });

  // Update URL when tab changes
  const handleTabChange = (newTab: 'risk' | 'emission' | 'ml') => {
    setTab(newTab);
    const url = `/?tab=${newTab}`;
    router.replace(url, { scroll: false });
  };

  return <>{children({ tab, handleTabChange })}</>;
}