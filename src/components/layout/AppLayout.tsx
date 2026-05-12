import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  // Start open on desktop (≥1024px), closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  return (
    <div className="min-h-screen bg-brand-sand">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* On mobile, main never shifts. On desktop, shifts with sidebar. */}
      <main
        className={`pt-16 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
