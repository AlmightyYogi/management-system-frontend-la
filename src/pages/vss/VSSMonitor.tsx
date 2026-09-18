import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { DeviceStatRow, VSSAlertHistory, VSSDelayEvent} from '../../types/vss';
import { REASON_OPTIONS, REASON_STYLE, inputStyle, clearBtnStyle, btnOutline, btnPrimary, thStyle, tdStyle } from '../../types/vss';

const SIDEBAR_W = 240;

type Tab = 'live' | 'history' | 'stats';

function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function currentYearMonth() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}`;
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return (
    d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );
}

function parseListResponse(res: any): { data: any[]; total: number } {
  const payload = res.data?.data ?? res.data;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  const total =
    res.data?.data?.total ?? res.data?.total ?? payload?.total ?? list.length;
  return { data: list, total };
}

function buildStats(rows: VSSAlertHistory[]): DeviceStatRow[] {
  const map = new Map<string, DeviceStatRow>();
  for (const r of rows) {
    let item = map.get(r.device_id);
    if (!item) {
      item = {
        device_id: r.device_id,
        device_name: r.device_name || r.device_id,
        total: 0,
        by_reason: {},
      };
      map.set(r.device_id, item);
    }
    item.total += 1;
    item.by_reason[r.reason] = (item.by_reason[r.reason] || 0) + 1;
    if (r.device_name) item.device_name = r.device_name;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

const VSSMonitor = () => {
  const [tab, setTab] = useState<Tab>('history');

  const [liveDate, setLiveDate] = useState(todayStr());
  const [liveReason, setLiveReason] = useState('');
  const [liveDevice, setLiveDevice] = useState('');
  const [livePage, setLivePage] = useState(1);
  const [liveRows, setLiveRows] = useState<VSSDelayEvent[]>([]);
  const [liveTotal, setLiveTotal] = useState(0);
  const [liveLoading, setLiveLoading] = useState(false);

  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [histReason, setHistReason] = useState('');
  const [histDevice, setHistDevice] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [histRows, setHistRows] = useState<VSSAlertHistory[]>([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histLoading, setHistLoading] = useState(false);

  const [statsRows, setStatsRows] = useState<VSSAlertHistory[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const perPage = 15;

  const loadLive = useCallback(async () => {
    setLiveLoading(true);
    try {
      const params = new URLSearchParams();
      if (liveDate) params.append('date', liveDate);
      if (liveReason) params.append('reason', liveReason);
      if (liveDevice) params.append('device_name', liveDevice);
      params.append('page', String(livePage));
      params.append('per_page', String(perPage));

      const res = await api.get(`/vss/delays?${params.toString()}`);
      const { data, total } = parseListResponse(res);
      setLiveRows(data as VSSDelayEvent[]);
      setLiveTotal(total);
    } catch {
      setLiveRows([]);
      setLiveTotal(0);
    } finally {
      setLiveLoading(false);
    }
  }, [liveDate, liveReason, liveDevice, livePage]);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearMonth) params.append('year_month', yearMonth);
      if (histReason) params.append('reason', histReason);
      if (histDevice) params.append('device_name', histDevice);
      params.append('page', String(histPage));
      params.append('per_page', String(perPage));

      const res = await api.get(`/vss/history?${params.toString()}`);
      const { data, total } = parseListResponse(res);
      setHistRows(data as VSSAlertHistory[]);
      setHistTotal(total);
    } catch {
      setHistRows([]);
      setHistTotal(0);
    } finally {
      setHistLoading(false);
    }
  }, [yearMonth, histReason, histDevice, histPage]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const all: VSSAlertHistory[] = [];
      let page = 1;
      const per = 100;
      for (let i = 0; i < 5; i++) {
        const params = new URLSearchParams();
        if (yearMonth) params.append('year_month', yearMonth);
        params.append('page', String(page));
        params.append('per_page', String(per));
        const res = await api.get(`/vss/history?${params.toString()}`);
        const { data, total } = parseListResponse(res);
        all.push(...(data as VSSAlertHistory[]));
        if (all.length >= total || data.length === 0) break;
        page += 1;
      }
      setStatsRows(all);
    } catch {
      setStatsRows([]);
    } finally {
      setStatsLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    if (tab === 'live') loadLive();
  }, [tab, loadLive]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  useEffect(() => {
    if (tab === 'stats') loadStats();
  }, [tab, loadStats]);

  useEffect(() => {
    if (tab !== 'live') return;
    const id = setInterval(() => loadLive(), 60_000);
    return () => clearInterval(id);
  }, [tab, loadLive]);

  useEffect(() => {
    setLivePage(1);
  }, [liveDate, liveReason, liveDevice]);

  useEffect(() => {
    setHistPage(1);
  }, [yearMonth, histReason, histDevice]);

  const livePages = Math.max(1, Math.ceil(liveTotal / perPage));
  const histPages = Math.max(1, Math.ceil(histTotal / perPage));

  const stats = useMemo(() => buildStats(statsRows), [statsRows]);
  const reasonTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of statsRows) m[r.reason] = (m[r.reason] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [statsRows]);

  const clearFilters = () => {
    if (tab === 'live') {
      setLiveDate(todayStr());
      setLiveReason('');
      setLiveDevice('');
      setLivePage(1);
    } else {
      setYearMonth(currentYearMonth());
      setHistReason('');
      setHistDevice('');
      setHistPage(1);
    }
  };

  const hasFilters =
    tab === 'live'
      ? !!(liveReason || liveDevice || liveDate !== todayStr())
      : !!(histReason || histDevice || yearMonth !== currentYearMonth());

  const refresh = () => {
    if (tab === 'live') loadLive();
    else if (tab === 'history') loadHistory();
    else loadStats();
  };

  const subtitle =
    tab === 'live'
      ? liveTotal > 0
        ? `${(livePage - 1) * perPage + 1}–${Math.min(livePage * perPage, liveTotal)} dari ${liveTotal} event (file log)`
        : '0 event (file log)'
      : tab === 'history'
        ? histTotal > 0
          ? `${(histPage - 1) * perPage + 1}–${Math.min(histPage * perPage, histTotal)} dari ${histTotal} history`
          : '0 history kritis'
        : `${statsRows.length} event · ${stats.length} device · ${yearMonth}`;

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', minHeight: '100%' }}>
      {/* Sidebar */}
      <div
        style={{
          width: SIDEBAR_W,
          minWidth: SIDEBAR_W,
          flexShrink: 0,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,.06)',
          position: 'sticky',
          top: 0,
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-funnel" style={{ color: '#6366f1', fontSize: 15 }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Filter Options</span>
          </div>
        </div>

        <div style={{ padding: '12px 18px' }}>
          <FilterSection label="VIEW MODE">
            {(
              [
                { id: 'live' as Tab, label: 'Live delays', icon: 'bi-activity' },
                { id: 'history' as Tab, label: 'History', icon: 'bi-clock-history' },
                { id: 'stats' as Tab, label: 'Statistik', icon: 'bi-bar-chart' },
              ] as const
            ).map((t) => (
              <label
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 0',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: tab === t.id ? '#6366f1' : '#374151',
                  fontWeight: tab === t.id ? 600 : 400,
                }}
              >
                <input
                  type="radio"
                  name="vss-tab"
                  checked={tab === t.id}
                  onChange={() => setTab(t.id)}
                  style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <i className={`bi ${t.icon}`} style={{ fontSize: 13 }} />
                {t.label}
              </label>
            ))}
          </FilterSection>

          {tab === 'live' ? (
            <>
              <FilterSection label="TANGGAL LOG">
                <input
                  type="date"
                  value={liveDate}
                  onChange={(e) => setLiveDate(e.target.value)}
                  style={inputStyle}
                />
              </FilterSection>
              <FilterSection label="REASON">
                <select
                  value={liveReason}
                  onChange={(e) => setLiveReason(e.target.value)}
                  style={inputStyle}
                >
                  {REASON_OPTIONS.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FilterSection>
              <FilterSection label="DEVICE NAME">
                <input
                  type="text"
                  placeholder="Cari nama device..."
                  value={liveDevice}
                  onChange={(e) => setLiveDevice(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadLive()}
                  style={inputStyle}
                />
              </FilterSection>
            </>
          ) : (
            <>
              <FilterSection label="BULAN (YYYY-MM)">
                <input
                  type="month"
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                  style={inputStyle}
                />
              </FilterSection>
              {tab === 'history' && (
                <>
                  <FilterSection label="REASON">
                    <select
                      value={histReason}
                      onChange={(e) => setHistReason(e.target.value)}
                      style={inputStyle}
                    >
                      {REASON_OPTIONS.map((o) => (
                        <option key={o.value || 'all'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </FilterSection>
                  <FilterSection label="DEVICE NAME">
                    <input
                      type="text"
                      placeholder="Cari nama device..."
                      value={histDevice}
                      onChange={(e) => setHistDevice(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadHistory()}
                      style={inputStyle}
                    />
                  </FilterSection>
                </>
              )}
            </>
          )}

          {hasFilters && (
            <button type="button" onClick={clearFilters} style={clearBtnStyle}>
              <i className="bi bi-x me-1" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <div>
            <h4 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2, fontSize: 20 }}>
              VSS Monitor
            </h4>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{subtitle}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={refresh} style={btnOutline}>
              <i className="bi bi-arrow-clockwise me-1" /> Refresh
            </button>
          </div>
        </div>

        {(tab === 'live' || tab === 'history') && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <i
                className="bi bi-search"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: 14,
                }}
              />
              <input
                type="text"
                placeholder="Cari device name lalu tekan Search..."
                value={tab === 'live' ? liveDevice : histDevice}
                onChange={(e) =>
                  tab === 'live' ? setLiveDevice(e.target.value) : setHistDevice(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') refresh();
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 9,
                  fontSize: 13,
                  outline: 'none',
                  color: '#1e293b',
                }}
              />
            </div>
            <button type="button" onClick={refresh} style={{ ...btnPrimary, padding: '9px 18px' }}>
              <i className="bi bi-search me-1" /> Search
            </button>
          </div>
        )}

        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,.06)',
            overflow: 'hidden',
          }}
        >
          {tab === 'live' &&
            (liveLoading ? (
              <LoadingSpinner message="Memuat live delays..." />
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        {['WAKTU', 'DEVICE ID', 'NAME', 'ACTION', 'ALARM ID', 'DETAIL', 'DELAY', 'DTU', 'IS LATER'].map(
                          (h) => (
                            <th key={h} style={thStyle}>
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {liveRows.length === 0 ? (
                        <EmptyRow colSpan={10} text="Tidak ada event di file log untuk filter ini" />
                      ) : (
                        liveRows.map((r, idx) => (
                          <tr
                            key={`${r.device_id}-${r.detected_at}-${r.reason}-${idx}`}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: idx % 2 === 0 ? '#fff' : '#fafafa',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4ff')}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                idx % 2 === 0 ? '#fff' : '#fafafa')
                            }
                          >
                            <td style={tdStyle}>{formatDateTime(r.detected_at)}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                              {r.device_id}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 500, color: '#1e293b' }}>
                              {r.device_name || '—'}
                            </td>
                            {/* <td style={tdStyle}>
                              <ReasonBadge reason={r.reason} />
                            </td> */}
                            <td style={tdStyle}>{r.action || '—'}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>
                            {r.alarm_id || '—'}
                            </td>
                            <td
                            style={{
                                ...tdStyle,
                                maxWidth: 180,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                            title={r.alarm_detail || undefined}
                            >
                            {r.alarm_detail || '—'}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{r.delay_sec}s</td>
                            <td style={tdStyle}>{r.dtu || '—'}</td>
                            <td style={tdStyle}>{r.is_later ? 'Yes' : 'No'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={livePage}
                  totalPages={livePages}
                  total={liveTotal}
                  perPage={perPage}
                  onPage={setLivePage}
                />
              </>
            ))}

          {tab === 'history' &&
            (histLoading ? (
              <LoadingSpinner message="Memuat history VSS..." />
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        {['WAKTU', 'DEVICE ID', 'NAME', 'ACTION', 'ALARM ID', 'DELAY', 'IS EMAIL SENT', 'EMAIL', 'BULAN'].map(
                          (h) => (
                            <th key={h} style={thStyle}>
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {histRows.length === 0 ? (
                        <EmptyRow colSpan={10} text="Belum ada history kritis untuk filter ini" />
                      ) : (
                        histRows.map((r, idx) => (
                          <tr
                            key={r.id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: idx % 2 === 0 ? '#fff' : '#fafafa',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4ff')}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                idx % 2 === 0 ? '#fff' : '#fafafa')
                            }
                          >
                            <td style={tdStyle}>{formatDateTime(r.detected_at)}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                              {r.device_id}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 500, color: '#1e293b' }}>
                              {r.device_name || '—'}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 500, color: '#1e293b' }}>
                              {r.action || '—'}
                            </td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>
                            {r.alarm_id || '—'}
                            </td>
                            {/* <td style={tdStyle}>
                              <ReasonBadge reason={r.reason} />
                            </td> */}
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{r.delay_sec}s</td>
                            <td style={tdStyle}>
                              {r.email_sent ? (
                                <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>
                                  Sent
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>{r.year_month}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={histPage}
                  totalPages={histPages}
                  total={histTotal}
                  perPage={perPage}
                  onPage={setHistPage}
                />
              </>
            ))}

          {tab === 'stats' &&
            (statsLoading ? (
              <LoadingSpinner message="Menghitung statistik..." />
            ) : (
              <div style={{ padding: 16 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <StatCard label="Periode" value={yearMonth || '—'} />
                  <StatCard label="Total event kritis" value={String(statsRows.length)} />
                  <StatCard label="Device terdampak" value={String(stats.length)} />
                </div>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    overflow: 'hidden',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      Top device / kendaraan bermasalah
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      Diurutkan dari jumlah event history terbanyak
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          {['#', 'NAME', 'DEVICE ID', 'TOTAL', 'BREAKDOWN'].map((h) => (
                            <th key={h} style={thStyle}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.length === 0 ? (
                          <EmptyRow colSpan={5} text="Belum ada data statistik" />
                        ) : (
                          stats.slice(0, 20).map((s, idx) => (
                            <tr
                              key={s.device_id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: idx % 2 === 0 ? '#fff' : '#fafafa',
                              }}
                            >
                              <td style={tdStyle}>{idx + 1}</td>
                              <td style={{ ...tdStyle, fontWeight: 600, color: '#1e293b' }}>
                                {s.device_name}
                              </td>
                              <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                                {s.device_id}
                              </td>
                              <td style={tdStyle}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    minWidth: 28,
                                    textAlign: 'center',
                                    padding: '2px 8px',
                                    borderRadius: 20,
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    fontWeight: 700,
                                    fontSize: 12,
                                  }}
                                >
                                  {s.total}
                                </span>
                              </td>
                              <td style={tdStyle}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {Object.entries(s.by_reason).map(([reason, n]) => (
                                    <span
                                      key={reason}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      <ReasonBadge reason={reason} />
                                      <span style={{ fontSize: 11, color: '#94a3b8' }}>×{n}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 14,
                    background: '#fff',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: '#1e293b',
                      marginBottom: 10,
                    }}
                  >
                    Distribusi reason
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {reasonTotals.length === 0 ? (
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>Tidak ada data</span>
                    ) : (
                      reasonTotals.map(([reason, n]) => (
                        <div
                          key={reason}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            padding: '6px 10px',
                          }}
                        >
                          <ReasonBadge reason={reason} />
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                            {n}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const ReasonBadge = ({ reason }: { reason: string }) => {
  const s = REASON_STYLE[reason] || {
    bg: '#f1f5f9',
    color: '#475569',
    label: reason,
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: s.color,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
};

const EmptyRow = ({ colSpan, text }: { colSpan: number; text: string }) => (
  <tr>
    <td colSpan={colSpan} style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
      <i className="bi bi-inbox" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
      {text}
    </td>
  </tr>
);

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div
    style={{
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '14px 16px',
      background: '#fff',
    }}
  >
    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{value}</div>
  </div>
);

const Pagination = ({
  page,
  totalPages,
  total,
  perPage,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
}) => {
  if (totalPages <= 1) return null;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        borderTop: '1px solid #f1f5f9',
      }}
    >
      <span style={{ fontSize: 13, color: '#94a3b8' }}>
        Menampilkan {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} dari {total} data
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          style={{
            padding: '6px 12px',
            borderRadius: 7,
            border: '1px solid #e2e8f0',
            background: page === 1 ? '#f8fafc' : '#fff',
            color: page === 1 ? '#d1d5db' : '#374151',
            cursor: page === 1 ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          ← Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | string)[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === '...' ? (
              <span key={`dot-${idx}`} style={{ padding: '6px 4px', color: '#94a3b8', fontSize: 13 }}>
                ···
              </span>
            ) : (
              <button
                type="button"
                key={p}
                onClick={() => onPage(p as number)}
                style={{
                  padding: '6px 11px',
                  borderRadius: 7,
                  border: `1px solid ${page === p ? '#6366f1' : '#e2e8f0'}`,
                  background: page === p ? '#6366f1' : '#fff',
                  color: page === p ? '#fff' : '#374151',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: page === p ? 700 : 400,
                  minWidth: 34,
                  textAlign: 'center',
                }}
              >
                {p}
              </button>
            )
          )}
        <button
          type="button"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: 7,
            border: '1px solid #e2e8f0',
            background: page === totalPages ? '#f8fafc' : '#fff',
            color: page === totalPages ? '#d1d5db' : '#374151',
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

const FilterSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 18 }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <i className="bi bi-chevron-down" style={{ fontSize: 10, color: '#94a3b8' }} />
    </div>
    {children}
  </div>
);

export default VSSMonitor;