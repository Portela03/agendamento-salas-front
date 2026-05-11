import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-brand-sand">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <Sidebar isOpen={sidebarOpen} />

      <main
        className={`pt-16 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
