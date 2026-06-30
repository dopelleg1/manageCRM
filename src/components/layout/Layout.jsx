import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

const Layout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar - static on desktop, fixed on mobile */}
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* 
         Main Content Wrapper 
         Removed md:ml-64 because Sidebar is static on desktop (flex item), 
         so it naturally pushes content to the right. 
      */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-800 relative scroll-smooth w-full">
          {/* 
             Content Container
             Removed 'container mx-auto' to utilize full width
             Reduced vertical padding for better density
          */}
          <div className="w-full px-4 sm:px-6 py-6 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;