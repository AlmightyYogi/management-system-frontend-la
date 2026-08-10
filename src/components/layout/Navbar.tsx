import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { ROUTE_LABELS } from '../../types/layout';
import resolveStorageUrl from '../../utils/storage';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUUID = (s: string) => UUID_REGEX.test(s);
const isNumericId = (s: string) => /^\d+$/.test(s);

function buildCrumbs(pathname: string): { label: string; to: string | null }[] {
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);

  if (segments.length === 0) {
    return [{ label: 'Dashboard', to: null }];
  }

  const crumbs: { label: string; to: string | null }[] = [];
  let path = '';

  segments.forEach((seg, idx) => {
    path += `/${seg}`;
    const isLast = idx === segments.length - 1;

    if (isUUID(seg) || isNumericId(seg)) {
      crumbs.push({ label: 'Detail', to: isLast ? null : path });
      return;
    }

    const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, to: isLast ? null : path });
  });

  return crumbs;
}

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const [notifs, setNotifs] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const crumbs = buildCrumbs(location.pathname);

  // Fetch open tickets for notification
  useEffect(() => {
    const fetchOpenTickets = async () => {
      setLoadingNotif(true);
      try {
        const res = await api.get('/reports?status=1&per_page=10');
        const payload = res.data?.data ?? res.data;
        const list = Array.isArray(payload) ? payload : payload?.data ?? [];
        setNotifs(list);
      } catch {
        setNotifs([]);
      } finally {
        setLoadingNotif(false);
      }
    };

    fetchOpenTickets();

    const interval = setInterval(fetchOpenTickets, 5 * 60 * 1000); // setiap 5 menit
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout?',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Logout',
    }).then((result) => {
      if (result.isConfirmed) logout();
    });
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1030,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <nav aria-label="breadcrumb">
        <ol
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          <li style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Report System</span>
          </li>

          {crumbs.map((crumb, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#d1d5db', fontSize: 13, userSelect: 'none' }}>›</span>
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  style={{
                    fontSize: 13,
                    color: '#6b7280',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#111827')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#6b7280')}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              color: '#6b7280',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Notifikasi"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {notifs.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 8,
                  height: 8,
                  background: '#ef4444',
                  borderRadius: '50%',
                  border: '1.5px solid #fff',
                }}
              />
            )}
          </button>

          {/* Dropdown Notification */}
          {showDropdown && (
            <>
              <div onClick={() => setShowDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 10px)',
                  width: 340,
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 8px 30px rgba(0,0,0,.15)',
                  border: '1px solid #e5e7eb',
                  zIndex: 1000,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Notifikasi</span>
                    {notifs.length > 0 && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#fef2f2',
                          color: '#dc2626',
                          padding: '2px 7px',
                          borderRadius: 20,
                        }}
                      >
                        {notifs.length} Open
                      </span>
                    )}
                  </div>
                  <Link
                    to="/reports?status=1"
                    onClick={() => setShowDropdown(false)}
                    style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}
                  >
                    Lihat semua →
                  </Link>
                </div>

                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {loadingNotif ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Memuat...
                    </div>
                  ) : notifs.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                      <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
                        Semua ticket sudah ditangani
                      </div>
                    </div>
                  ) : (
                    notifs.map((r, idx) => {
                      const hoursOpen = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 3600000);
                      const isUrgent = hoursOpen >= 4;
                      return (
                        <Link
                          key={r.uuid}
                          to={`/reports/${r.uuid}`}
                          onClick={() => setShowDropdown(false)}
                          style={{
                            display: 'block',
                            padding: '12px 16px',
                            borderBottom: idx < notifs.length - 1 ? '1px solid #f9fafb' : 'none',
                            textDecoration: 'none',
                            transition: 'background .12s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8faff')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                flexShrink: 0,
                                marginTop: 5,
                                background: isUrgent ? '#ef4444' : '#2563eb',
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: isUrgent ? '#dc2626' : '#2563eb' }}>
                                  {r.incident}
                                </span>
                                {isUrgent && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: '#dc2626',
                                      background: '#fef2f2',
                                      padding: '1px 6px',
                                      borderRadius: 10,
                                      border: '1px solid #fecaca',
                                    }}
                                  >
                                    ⚠ {hoursOpen}j belum ditutup
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.requestor}
                              </div>
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                {r.apps} · {new Date(r.created_at).toLocaleDateString('id-ID')}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              background: '#3b82f6',
              border: '2px solid #e5e7eb',
            }}
          >
            {user?.image ? (
              <img
                src={resolveStorageUrl(user?.image)}
                alt={user.name}
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
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>

          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{user?.name || 'User Unknown'}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{user?.email || ''}</div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              background: 'none',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '5px 10px',
              borderRadius: 7,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = '#fef2f2';
              el.style.color = '#dc2626';
              el.style.borderColor = '#fecaca';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = 'none';
              el.style.color = '#6b7280';
              el.style.borderColor = '#e5e7eb';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;