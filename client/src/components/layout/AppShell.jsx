import React, { useState } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import MobileNav from './MobileNav';
import MobileDrawer from './MobileDrawer';
import { cn } from '@/utils/cn';

/**
 * Main application shell component for StudySync.
 * Combines TopBar, left Sidebar, main feed/page container, contextual RightSidebar,
 * compact MobileNav bottom bar, and slide-over MobileDrawer.
 */
export function AppShell({
  children,
  showSidebar = true,
  showRightSidebar = true,
  className,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        'min-h-screen bg-surface-50 flex flex-col antialiased text-surface-900 overflow-x-hidden selection:bg-brand-100 selection:text-brand-900',
        className
      )}
    >
      {/* Top Navigation Bar */}
      <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

      {/* Main Content Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 flex gap-8">
        {/* Left Navigation Sidebar (Desktop) */}
        {showSidebar && <Sidebar />}

        {/* Center Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>

        {/* Right Contextual Sidebar (Desktop XL) */}
        {showRightSidebar && <RightSidebar />}
      </div>

      {/* Mobile Bottom Navigation Bar (< md) */}
      <MobileNav />

      {/* Slide-over Mobile Drawer Menu (< md) */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
}

export default AppShell;
