import React, { createContext, useContext } from 'react';

export type PageType = 'dashboard' | 'customers' | 'jobs' | 'batches' | 'finance' | 'technician';

interface PageContextType {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export const usePageNavigation = (): PageContextType => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageNavigation must be used within PageNavigationProvider');
  }
  return context;
};

export const PageNavigationProvider = PageContext.Provider;
