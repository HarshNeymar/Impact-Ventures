'use client';

import { useEffect } from 'react';
import { registerMaterialComponents } from './material-init';

export function MaterialProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register Material Web components once on the client side
    registerMaterialComponents();
  }, []);

  return <>{children}</>;
}