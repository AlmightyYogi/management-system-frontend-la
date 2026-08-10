import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import useAuthStore from '../../store/authStore';
import type { Account } from '../../types/account';
import { ROLE_STYLE, STATUS_STYLE } from '../../types/account';
import resolveStorageUrl from '../../utils/storage';

const ROLE_FILTER_TABS = ['All', 'Admin', 'Agent', 'User'] as const;
type RoleTab = (typeof ROLE_FILTER_TABS)[number];

const AVATAR_PALETTE = [
  '#1e40af', '#6d28d9', '#065f46', '#92400e', '#991b1b',
  '#1d4ed8', '#7c3aed', '#0f766e', '#b45309',
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function roleTabMatch(account: Account, tab: RoleTab): boolean {
  if (tab === 'All') return true;
  return ROLE_STYLE[account.role_name]?.label === tab;
}

const AccountIndex = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<RoleTab>('All');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts');
      const data = res.data?.data ?? res.data;
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch =
      !q
      || a.name.toLowerCase().includes(q)
      || a.email.toLowerCase().includes(q)
      || (a.username ?? '').toLowerCase().includes(q);
    return matchSearch && roleTabMatch(a, activeTab);
  });

  const total         = accounts.length;
  const activeCount   = accounts.filter(a => a.active).length;
  const inactiveCount = accounts.filter(a => !a.active).length;

  const isSelf = (a: Account) =>
    !!currentUser && (
      a.id    === (currentUser as any).id   ||
      a.uuid  === (currentUser as any).uuid ||
      a.email === (currentUser as any).email
    );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', background: '#f9fafb' }}>
      <style>{`
        @keyframes rowIn { from { opacity:0; transform:translateY(3px); } to { opacity:1; transform:translateY(0); } }
        .acc-row { animation: rowIn 0.15s ease both; }
        .acc-row:hover { background: #f0f4ff !important; }
        .tab-btn { transition: all 0.15s; }
        .dots-btn:hover { background: #f3f4f6 !important; }
      `}</style>

      <div style={{ padding: '24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Manajemen Akun</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{total} akun terdaftar</p>
          </div>
          <Link
            to="/accounts/create"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 13,
              fontWeight: 600, textDecoration: 'none',
            }}
          >
            + Buat Akun Baru
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Total Akun', value: total,         color: '#111827' },
            { label: 'Active',     value: activeCount,   color: '#16a34a' },
            { label: 'Inactive',   value: inactiveCount, color: '#6b7280' },
            { label: 'Pending',    value: 0,             color: '#d97706' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          padding: '14px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13, pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              placeholder="Silahkan cari disini..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 34px',
                border: '1px solid #e5e7eb', borderRadius: 8,
                fontSize: 13, color: '#111827', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          <div style={{ display: 'flex', gap: 3, background: '#f3f4f6', borderRadius: 8, padding: 3, flexShrink: 0 }}>
            {ROLE_FILTER_TABS.map(tab => (
              <button
                key={tab}
                className="tab-btn"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: activeTab === tab ? '#fff' : 'transparent',
                  color: activeTab === tab ? '#111827' : '#6b7280',
                  boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          {loading ? (
            <LoadingSpinner message="Memuat akun..." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['NAMA', 'EMAIL / USERNAME', 'ROLE', 'PHONE', 'STATUS', 'LOGIN TERAKHIR', ''].map(h => (
                      <th key={h} style={{
                        padding: '11px 16px', fontSize: 11, fontWeight: 600,
                        color: '#9ca3af', textTransform: 'uppercase',
                        letterSpacing: '0.5px', textAlign: 'left', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '56px 0', textAlign: 'center', color: '#9ca3af' }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
                          Tidak ada akun yang sesuai
                        </div>
                        {(search || activeTab !== 'All') && (
                          <button
                            onClick={() => { setSearch(''); setActiveTab('All'); }}
                            style={{
                              padding: '6px 16px', borderRadius: 7,
                              border: '1px solid #e5e7eb', background: '#fff',
                              color: '#6b7280', fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            Reset filter
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : filtered.map((account, idx) => {
                    const roleStyle = ROLE_STYLE[account.role_name] ?? {
                      label: account.role_name, color: '#374151',
                      bg: '#f9fafb', border: '#e5e7eb', icon: '👤',
                    };
                    const statusStyle = STATUS_STYLE[account.active ? 'active' : 'inactive'];
                    const self = isSelf(account);

                    return (
                      <tr
                        key={account.uuid}
                        className="acc-row"
                        onClick={() => navigate(`/accounts/${account.uuid}`)}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer',
                          background: self ? '#fafbff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                          animationDelay: `${Math.min(idx * 0.025, 0.3)}s`,
                        }}
                      >
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                                background: '#e2e8f0', flexShrink: 0,
                                boxShadow: self ? '0 0 0 2px #fff, 0 0 0 4px #2563eb' : 'none',
                                }}>
                                {account.image ? (
                                    <img 
                                    src={resolveStorageUrl(account.image)}
                                    alt={account.name} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                ) : (
                                    <div style={{
                                    width: '100%', height: '100%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 700, color: '#fff',
                                    background: avatarColor(account.name),
                                    }}>
                                    {getInitials(account.name)}
                                    </div>
                                )}
                                </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                {account.name}
                              </span>
                              {self && (
                                <span style={{
                                  fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
                                  color: '#2563eb', background: '#dbeafe',
                                  border: '1px solid #bfdbfe',
                                  padding: '1px 8px', borderRadius: 10,
                                }}>
                                  Anda
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ fontSize: 13, color: '#374151' }}>{account.email}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                            {account.username || account.email.split('@')[0]}
                          </div>
                        </td>

                        <td style={{ padding: '13px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                            background: roleStyle.bg, color: roleStyle.color,
                            border: `1px solid ${roleStyle.border}`,
                          }}>
                            {roleStyle.icon} {roleStyle.label}
                          </span>
                        </td>

                        <td style={{ padding: '13px 16px', fontSize: 13, color: '#374151' }}>
                          {account.phone || '—'}
                        </td>

                        <td style={{ padding: '13px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                            background: statusStyle.bg, color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                          }}>
                            {account.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>
                          {account.last_login_at || '—'}
                        </td>

                        <td style={{ padding: '13px 16px' }}>
                          <button
                            className="dots-btn"
                            onClick={e => e.stopPropagation()}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#9ca3af', fontSize: 18, padding: '3px 7px', borderRadius: 6,
                            }}
                          >
                            •••
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>
            Menampilkan {filtered.length} dari {total} akun
          </div>
        )}

      </div>
    </div>
  );
};

export default AccountIndex;