import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useSidebar } from './SidebarContext';
import resolveStorageUrl from '../../utils/storage';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  /** match path prefix (untuk nested route) */
  match?: 'exact' | 'prefix';
};

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-house-door', match: 'exact' },
  { to: '/reports', label: 'Tickets', icon: 'bi-list-task', match: 'prefix' },
  { to: '/daily', label: 'Report Daily/Weekly', icon: 'bi-file-earmark-text', match: 'prefix' },
  { to: '/vss/monitor', label: 'VSS Monitoring', icon: 'bi-display', match: 'prefix' },
  { to: '/accounts', label: 'Accounts', icon: 'bi-people', match: 'prefix' },
];

const Sidebar = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? 'U';

  const isItemActive = (item: NavItem) => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const to = item.to.replace(/\/+$/, '') || '/';
    if (item.match === 'exact') return path === to;
    return path === to || path.startsWith(to + '/');
  };

  const width = isCollapsed ? 72 : 260;

  return (
    <aside
      style={{
        width,
        minHeight: '100vh',
        background: '#0f172a',
        color: '#fff',
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ===== Brand ===== */}
      <div
        style={{
          height: 64,
          padding: isCollapsed ? '0 12px' : '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
          }}
        >
          <i className="bi bi-ticket-perforated" style={{ fontSize: 18, color: '#fff' }} />
        </div>

        <div
          style={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            opacity: isCollapsed ? 0 : 1,
            width: isCollapsed ? 0 : 'auto',
            transition: 'opacity 0.2s ease, width 0.2s ease',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Management System</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
            Help You Manage Report
          </div>
        </div>
      </div>

      {/* ===== Nav ===== */}
      <nav
        style={{
          flex: 1,
          padding: '16px 10px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {!isCollapsed && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              padding: '0 10px 10px',
            }}
          >
            Main Menu
          </div>
        )}

        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            return (
              <li key={item.to} style={{ marginBottom: 4 }}>
                <NavLink
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    height: 44,
                    padding: isCollapsed ? '0' : '0 12px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                    background: active
                      ? 'linear-gradient(90deg, #3b82f6, #6366f1)'
                      : 'transparent',
                    boxShadow: active ? '0 4px 14px rgba(59,130,246,0.35)' : 'none',
                    fontWeight: active ? 600 : 500,
                    fontSize: 13.5,
                    transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                    }
                  }}
                >
                  <i
                    className={`bi ${item.icon}`}
                    style={{
                      fontSize: 18,
                      width: 22,
                      textAlign: 'center',
                      flexShrink: 0,
                    }}
                  />
                  {!isCollapsed && (
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ===== Footer: user + collapse (tidak nutup menu) ===== */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: 12,
        }}
      >
        {/* User */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: isCollapsed ? '6px 0' : '8px 8px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            marginBottom: 8,
            borderRadius: 10,
          }}
          title={user?.name || 'User'}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#1e293b',
              flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.12)',
            }}
          >
            {user?.image ? (
              <img
                src={resolveStorageUrl(user.image)}
                alt={user.name || 'User'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#3b82f6',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {initial}
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || 'User Unknown'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.45)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email}
              </div>
            </div>
          )}
        </div>

        {/* Toggle collapse — di bawah, tidak menimpa item menu */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: '100%',
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: 8,
            padding: isCollapsed ? 0 : '0 12px',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.75)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
          }}
        >
          {!isCollapsed && <span>Collapse</span>}
          <i
            className={`bi ${isCollapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}
            style={{ fontSize: 14 }}
          />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;