import { useState, useEffect } from 'react';
import { callEmissionsApi } from '@/lib/emissionsApi';
import type { EmissionsData } from '@/types/emissions';
import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem } from '@/lib/utils/storageUtils';

export function useEmissionsData() {
  const [emissionsData, setEmissionsData] = useState<EmissionsData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadInitialEmissionsData = async () => {
      // Try to load from localStorage first
      const savedData = getLocalStorageItem<EmissionsData[] | null>('emissionsData', null);
      
      if (savedData) {
        setEmissionsData(savedData);
        return;
      }
      
      // If no cached data, fetch from API
      try {
        const response = await callEmissionsApi();
        if (response.events) {
          setEmissionsData(response.events);
          setLocalStorageItem('emissionsData', response.events);
        }
      } catch (error) {
        console.error('Failed to fetch initial emissions data:', error);
        setEmissionsData([]);
      }
    };

    loadInitialEmissionsData();
  }, []);

  const refreshEmissions = async () => {
    setIsRefreshing(true);
    removeLocalStorageItem('emissionsData');
    
    try {
      const response = await callEmissionsApi();
      if (response.events) {
        setEmissionsData(response.events);
        setLocalStorageItem('emissionsData', response.events);
      }
    } catch (error) {
      console.error('Failed to refresh emissions data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return { emissionsData, isRefreshing, refreshEmissions };
}
