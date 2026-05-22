import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from './Navbar';
import { PageContainer } from './PageContainer';
import Sidebar from './Sidebar';

const sidebarStorageKey = 'sidebar-collapsed';

function readCollapsedState() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(sidebarStorageKey) === 'true';
}

export default function AppLayout() {
  const { profile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(readCollapsedState);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          role={profile?.role}
          isCollapsed={isCollapsed}
          isOpen
          onClose={() => undefined}
          onToggleCollapse={() => setIsCollapsed((current) => !current)}
          mode="desktop"
          className="hidden lg:flex lg:h-screen lg:shrink-0"
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar
            className="shrink-0"
            onOpenSidebar={() => setIsMobileOpen(true)}
            showSidebarMenu
            showBrand={false}
            showPrivateBrand={isCollapsed}
          />

          <main className="flex-1 overflow-y-auto">
            <PageContainer>
              <Outlet />
            </PageContainer>
          </main>
        </div>
      </div>

      <Sidebar
        role={profile?.role}
        isCollapsed={false}
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        onToggleCollapse={() => undefined}
        mode="mobile"
      />
    </div>
  );
}
