import React from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import MobileNav from '@/components/MobileNav';

const AppLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <MobileNav />
      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
