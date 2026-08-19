import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useSidebar } from './SidebarContext';
import resolveStorageUrl from '../../utils/storage';

const Sidebar = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? 'U';

  const isLinkActive = (to: string) => {
    if (to === '/dashboard') return location.pathname === '/dashboard';
    if (to === '/reports') return location.pathname.startsWith('/reports');
    if (to === '/accounts') return location.pathname.startsWith('/accounts');
    if (to === '/daily') return location.pathname.startsWith('/daily');
    return false;
  };

  return (
    <aside
      className="d-flex flex-column"
      style={{
        width: isCollapsed ? 72 : 260,
        minHeight: '100vh',
        background: '#1e2937',
        color: '#fff',
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        bottom: 0,
        zIndex: 1050,
        transition: 'width 0.3s ease-in-out',
        overflow: 'hidden',
      }}
    >
      <div className="px-3 py-4 border-bottom border-white border-opacity-10 d-flex align-items-center relative">
        <div className="d-flex align-items-center gap-3 w-100">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: 42,
              height: 42,
              background: '#3b82f6',
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            <i className="bi bi-ticket-perforated fs-4 text-white"></i>
          </div>

          {!isCollapsed && (
            <div className="flex-grow-1">
              <div className="fw-bold fs-6">Management System</div>
              <div className="text-light opacity-75" style={{ fontSize: 13 }}>Help You Manage Report</div>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="btn btn-link text-light p-2 hover-bg-secondary position-absolute"
          style={{
            right: isCollapsed ? '8px' : '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: isCollapsed ? 38 : 34,
            height: isCollapsed ? 38 : 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            backgroundColor: isCollapsed ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: isCollapsed ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
            zIndex: 10,
          }}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <i 
            className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'} fs-5`}
            style={{ 
              transition: 'transform 0.3s ease',
              fontWeight: 'bold'
            }}
          ></i>
        </button>
      </div>

      <div className="flex-grow-1 py-4">
        {!isCollapsed && (
          <div className="text-uppercase text-light opacity-50 small px-4 mb-3">
            Main Menu
          </div>
        )}

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `d-flex align-items-center px-4 py-3 mb-1 text-decoration-none transition-all ${
              isLinkActive('/dashboard') ? 'bg-primary text-white' : 'text-light hover-bg-secondary'
            }`
          }
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <i className="bi bi-house-door fs-5"></i>
          {!isCollapsed && <span className="fw-medium ms-3">Dashboard</span>}
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `d-flex align-items-center px-4 py-3 mb-1 text-decoration-none transition-all ${
              isLinkActive('/reports') ? 'bg-primary text-white' : 'text-light hover-bg-secondary'
            }`
          }
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <i className="bi bi-list-task fs-5"></i>
          {!isCollapsed && <span className="fw-medium ms-3">Tickets</span>}
        </NavLink>

        <NavLink
          to="/daily"
          className={({ isActive }) =>
            `d-flex align-items-center px-4 py-3 mb-1 text-decoration-none transition-all ${
              isLinkActive('/daily') ? 'bg-primary text-white' : 'text-light hover-bg-secondary'
            }`
          }
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <i className="bi bi-file-earmark-text fs-5"></i>
          {!isCollapsed && <span className="fw-medium ms-3">Report Daily/Weekly</span>}
        </NavLink>

        <NavLink
          to="/accounts"
          className={({ isActive }) =>
            `d-flex align-items-center px-4 py-3 mb-1 text-decoration-none transition-all ${
              isLinkActive('/accounts') ? 'bg-primary text-white' : 'text-light hover-bg-secondary'
            }`
          }
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <i className="bi bi-people fs-5"></i>
          {!isCollapsed && <span className="fw-medium ms-3">Accounts</span>}
        </NavLink>
      </div>

      <div className="p-3 border-top border-white border-opacity-10 mt-auto">
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#e2e8f0',
              flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          >
            {user?.image ? (
              <img
                src={resolveStorageUrl(user?.image)}
                alt={user.name || 'User'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                style={{ width: '100%', height: '100%', fontSize: 18 }}
              >
                {initial}
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="fw-semibold text-truncate">{user?.name || 'User Unknown'}</div>
              <div className="text-light opacity-75" style={{ fontSize: 13 }}>
                {user?.email}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;