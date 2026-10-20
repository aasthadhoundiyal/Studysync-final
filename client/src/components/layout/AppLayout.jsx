import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppShell from './AppShell';

/**
 * Main application layout route wrapper.
 * Renders the child route via Outlet inside AppShell.
 */
export function AppLayout({ showSidebar = true, showRightSidebar = true }) {
  const location = useLocation();
  const isProfilePage = location.pathname.startsWith('/profile') || location.pathname.startsWith('/users');

  return (
    <AppShell showSidebar={showSidebar} showRightSidebar={showRightSidebar && !isProfilePage}>
      <Outlet />
    </AppShell>
  );
}

export default AppLayout;
