import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { SidebarProvider, useSidebar } from './SidebarContext';

const MainLayoutContent = () => {
  const { isCollapsed } = useSidebar();
  const sidebarWidth = isCollapsed ? 72 : 260;

  return (
    <div className="d-flex flex-column min-vh-100">
      <header
        style={{
          marginLeft: `${sidebarWidth}px`,
          width: `calc(100% - ${sidebarWidth}px)`,
          transition: 'all 0.3s ease-in-out',
          zIndex: 1060,
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Navbar />
      </header>

      <div className="d-flex flex-grow-1 overflow-hidden">
        <Sidebar />

        <main
          className="overflow-auto"
          style={{
            marginLeft: `${sidebarWidth}px`,
            width: `calc(100% - ${sidebarWidth}px)`,
            minWidth: 0,
            backgroundColor: '#f8fafc',
            transition: 'all 0.3s ease-in-out',
            padding: '24px',
          }}
        >
          <div
              className="container-fluid px-3"
              style={{
                  minWidth:0,
              }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const MainLayout = () => {
  return (
    <SidebarProvider>
      <MainLayoutContent />
    </SidebarProvider>
  );
};

export default MainLayout;