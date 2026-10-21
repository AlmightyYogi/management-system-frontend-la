import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import html2canvas from 'html2canvas';
import type { DeviceStatRow, VSSAlertHistory, VSSDelayEvent, VSSDeviceLive, VSSTrafficStats, VSSTrafficDetail, VSSMinuteTraffic, DelayCategory, VSSDaySummary } from '../../types/vss';
import { REASON_OPTIONS, REASON_STYLE, inputStyle, clearBtnStyle, btnOutline, btnPrimary, thStyle, tdStyle, TRAFFIC_COLORS, DELAY_CATEGORY_LABEL, DELAY_CATEGORY_COLOR } from '../../types/vss';

const SIDEBAR_W = 240;

type Tab = 'overview' | 'live' | 'history' | 'stats';
type StatsView = 'summary' | 'traffic' | 'devices';
type TrafficRange =
  | '15m'
  | '1h'
  | '3h'
  | '6h'
  | '12h'
  | '24h'
  | 'custom';

function filterTrafficSeries(
  series: VSSMinuteTraffic[],
  range: TrafficRange,
  fromStr: string,
  toStr: string
): VSSMinuteTraffic[] {
  if (!series?.length) return [];

  const n = series.length;

  if (range === 'custom' && fromStr && toStr) {
    const fromT = fromStr.slice(11, 16);
    const toT = toStr.slice(11, 16);
    if (fromT && toT) {
      return series.filter((p) => p.minute >= fromT && p.minute <= toT);
    }
    return series;
  }

  const keep =
    range === '15m' ? 15 :
    range === '1h' ? 60 :
    range === '3h' ? 180 :
    range === '6h' ? 360 :
    range === '12h' ? 720 :
    range === '24h' ? 1440 :
    60;

  return series.slice(Math.max(0, n - keep));
}

function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function maxPastDateStr() {
  return yesterdayStr();
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

function formatReportTime(ms?: number) {
    if (ms == null || ms <= 0) return '-';
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '-';
    return formatDateTime(d.toISOString());
}

function formatDelaySec(sec?: number) {
  if (sec == null || Number.isNaN(sec)) return '-';

  const neg = sec < 0;
  const s = Math.abs(Math.floor(sec));

  let out: string;
  if (s < 60) {
    out = `${s}s`;
  } else {
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    out = parts.join(' ');
  }

  return neg ? `-${out}` : out;
}

function ageSecFromISO(value?: string): number | undefined {
  if (!value) return undefined;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

function formatAgeSec(value?: string): string {
  const sec = ageSecFromISO(value);
  if (sec == null) return '—';
  return formatDelaySec(sec);
}

type SortDir = 'asc' | 'desc';
type SortState = { key: string; dir: SortDir };

function toggleSort(current: SortState, key: string): SortState {
  if (current.key === key) {
    return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { key, dir: 'asc' };
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      style={{
        ...thStyle,
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
      onClick={() => onSort(sortKey)}
      title={`Urutkan ${label}`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {label}
        <span
          style={{
            fontSize: 10,
            color: active ? '#6366f1' : '#cbd5e1',
            fontWeight: 700,
            minWidth: 12,
          }}
        >
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>
    </th>
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

function groupHistoryByDay(rows: VSSAlertHistory[]) {
    const map = new Map<string, { count: number, sumDelay: number; maxDelay: number }>();
    for (const r of rows) {
        const d = r.detected_at ? new Date(r.detected_at) : null;
        if (!d || Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const cur = map.get(key) || { count: 0, sumDelay: 0, maxDelay: 0 };
        const delay = r.delay_sec || 0;
        cur.count += 1;
        cur.sumDelay += delay;
        cur.maxDelay = Math.max(cur.maxDelay, delay);
        map.set(key, cur);
    }
    return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({
            date,
            count: v.count,
            avgDelay: v.count ? Math.round(v.sumDelay / v.count) : 0,
            maxDelay: v.maxDelay,
        }));
}

function categorizeDelay(sec: number): DelayCategory {
  const s = Math.abs(Math.floor(sec));
  if (s === 0) return '0s';
  if (s <= 5) return '1s-5s';
  if (s <= 60) return '5s-1m';
  if (s <= 300) return '1m-5m';
  return '>5m';
}

type DeviceDayStat = {
  deviceId: string;
  deviceName: string;
  days: Record<string, number>;
  totalDays: number;
  maxPerDay: number;
};

function buildDeviceDayStats(rows: VSSAlertHistory[]): DeviceDayStat[] {
  const map = new Map<string, DeviceDayStat>();
  for (const r of rows) {
    if (!r.delay_sec || r.delay_sec <= 0) continue;
    const d = r.detected_at ? new Date(r.detected_at) : null;
    if (!d || isNaN(d.getTime())) continue;
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let item = map.get(r.device_id);
    if (!item) {
      item = { deviceId: r.device_id, deviceName: r.device_name || r.device_id, days: {}, totalDays: 0, maxPerDay: 0 };
      map.set(r.device_id, item);
    }
    if (r.device_name) item.deviceName = r.device_name;
    item.days[dateKey] = (item.days[dateKey] || 0) + 1;
  }
  for (const item of map.values()) {
    const counts = Object.values(item.days);
    item.totalDays = counts.length;
    item.maxPerDay = counts.length ? Math.max(...counts) : 0;
  }
  return Array.from(map.values()).sort((a, b) => {
    const aTotal = Object.values(a.days).reduce((s, x) => s + x, 0);
    const bTotal = Object.values(b.days).reduce((s, x) => s + x, 0);
    return bTotal - aTotal;
  });
}

function TrafficPerMinuteChart({
  series,
  current,
  actions,
}: {
  series: VSSMinuteTraffic[];
  current?: VSSMinuteTraffic;
  actions: string[];
}) {
  const points = useMemo(() => {
    const pts = [...(series || [])];
    if (current?.minute) pts.push(current);
    return pts;
  }, [series, current]);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const w = 720;
  const h = 220;
  const pad = { t: 20, r: 16, b: 32, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  let maxY = 1;
  for (const p of points) {
    for (const a of actions) {
      maxY = Math.max(maxY, p.counts?.[a] || 0);
    }
    maxY = Math.max(maxY, p.total || 0);
  }

  const x = (i: number) =>
    pad.l + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - (v / maxY) * innerH;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(x(i) - mx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (mx < pad.l - 8 || mx > w - pad.r + 8) {
      setHoverIdx(null);
      return;
    }
    setHoverIdx(best);
  };

  if (points.length === 0) {
    return (
      <div style={{ color: '#94a3b8', fontSize: 13, padding: 24, textAlign: 'center' }}>
        Menunggu traffic menit pertama…
      </div>
    );
  }

  const tip = hoverIdx != null ? points[hoverIdx] : null;
  const tipX = tip ? x(hoverIdx!) : 0;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ maxHeight: 240, cursor: 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yy = pad.t + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={pad.l}
              x2={w - pad.r}
              y1={yy}
              y2={yy}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {actions.map((action) => {
          const d = points
            .map((p, i) => {
              const v = p.counts?.[action] || 0;
              return `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`;
            })
            .join(' ');
          return (
            <path
              key={action}
              d={d}
              fill="none"
              stroke={TRAFFIC_COLORS[action] || '#64748b'}
              strokeWidth={2}
            />
          );
        })}

        {tip && hoverIdx != null && (
          <g>
            <line
              x1={tipX}
              x2={tipX}
              y1={pad.t}
              y2={pad.t + innerH}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            {actions.map((a) => {
              const v = tip.counts?.[a] || 0;
              if (v <= 0 && actions.length > 1) return null;
              return (
                <circle
                  key={a}
                  cx={tipX}
                  cy={y(v)}
                  r={4}
                  fill={TRAFFIC_COLORS[a] || '#64748b'}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              );
            })}
          </g>
        )}

        {points.map((p, i) => {
          if (i !== 0 && i !== points.length - 1 && i % Math.ceil(points.length / 8) !== 0) {
            return null;
          }
          return (
            <text
              key={p.minute + i}
              x={x(i)}
              y={h - 10}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {p.minute}
            </text>
          );
        })}
        <text x={pad.l} y={14} fontSize={10} fill="#94a3b8">
          max {maxY.toLocaleString()}/menit
        </text>
      </svg>

      {tip && hoverIdx != null && (
        <div
          style={{
            position: 'absolute',
            left: `clamp(8px, ${(tipX / w) * 100}% , calc(100% - 180px))`,
            top: 28,
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,.2)',
            pointerEvents: 'none',
            zIndex: 5,
            minWidth: 140,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, borderBottom: '1px solid #334155', paddingBottom: 4 }}>
            {tip.minute}
          </div>
          {actions.map((a) => {
            const v = tip.counts?.[a] || 0;
            return (
              <div
                key={a}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: TRAFFIC_COLORS[a] || '#64748b',
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, color: '#cbd5e1' }}>Action {a}</span>
                <span style={{ fontWeight: 700 }}>{v.toLocaleString()}</span>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 4,
              paddingTop: 4,
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              color: '#94a3b8',
            }}
          >
            <span>Total</span>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>
              {(tip.total || 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontSize: 12 }}>
        {actions.map((a) => (
          <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 3,
                borderRadius: 2,
                background: TRAFFIC_COLORS[a] || '#64748b',
              }}
            />
            Action {a}
          </span>
        ))}
      </div>
    </div>
  );
}

const VSSMonitor = () => {
  const [tab, setTab] = useState<Tab>('history');

  const [trafficRange, setTrafficRange] = useState<TrafficRange>('1h');
  const [trafficFrom, setTrafficFrom] = useState('');
  const [trafficTo, setTrafficTo] = useState('');

  const [liveDate, setLiveDate] = useState(todayStr());
  const [liveReason, setLiveReason] = useState('');
  const [liveDevice, setLiveDevice] = useState('');
  const [liveAction, setLiveAction] = useState('');
  const [liveStatus, setLiveStatus] = useState('');
  const [trafficDetail, setTrafficDetail] = useState<VSSTrafficDetail | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [livePage, setLivePage] = useState(1);
  const [liveRows, setLiveRows] = useState<VSSDeviceLive[]>([]);
  const [liveTotal, setLiveTotal] = useState(0);
  const [liveTraffic, setLiveTraffic] = useState<VSSTrafficStats | null>(null);
  const [onlyIssue, setOnlyIssue] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);

  const [yearMonth, setYearMonth] = useState('');
  const [histReason, setHistReason] = useState('');
  const [histDevice, setHistDevice] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [histRows, setHistRows] = useState<VSSAlertHistory[]>([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histLoading, setHistLoading] = useState(false);

  const [statsRows, setStatsRows] = useState<VSSAlertHistory[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsView, setStatsView] = useState<StatsView>('summary');
  
  const [liveSort, setLiveSort] = useState<SortState>({ key: 'delay_sec', dir: 'asc' });
  const [histSort, setHistSort] = useState<SortState>({ key: 'detected_at', dir: 'desc' });

  const [overviewDate, setOverviewDate] = useState(yesterdayStr());
  const [overview, setOverview] = useState<VSSDaySummary | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [exportingExcel, setExportingExcel] = useState(false);
  

  const perPage = 15;

  const fetchLive = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLiveLoading(true);
    try {
        const params = new URLSearchParams();
        if (liveDevice) params.append('device_name', liveDevice);
        if (liveAction) params.append('action', liveAction);
        if (liveStatus) params.append('status', liveStatus);
        if (onlyIssue) params.append('only_issue', '1');
        params.append('page', String(livePage));
        params.append('per_page', String(perPage));
        params.append('sort_by', liveSort.key);
        params.append('sort_dir', liveSort.dir);

        const res = await api.get(`/vss/live?${params.toString()}`);
        const body = res.data?.data ?? res.data;
        setLiveRows((body?.data as VSSDeviceLive[]) || []);
        setLiveTotal(body?.total ?? 0);
        setLiveTraffic(body?.traffic ?? null);
    } catch {
        if (showSpinner) {
        setLiveRows([]);
        setLiveTotal(0);
        setLiveTraffic(null);
        }
    } finally {
        if (showSpinner) setLiveLoading(false);
    }
    }, [liveDevice, liveAction, liveStatus, onlyIssue, livePage, liveSort]);

  const loadLive = useCallback(() => fetchLive(true), [fetchLive]);
  const loadLiveSoft = useCallback(() => fetchLive(false), [fetchLive]);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearMonth) params.append('year_month', yearMonth);
      if (histReason) params.append('reason', histReason);
      if (histDevice) params.append('device_name', histDevice);
      params.append('page', String(histPage));
      params.append('per_page', String(perPage));
      params.append('sort_by', histSort.key);
      params.append('sort_dir', histSort.dir);

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
  }, [yearMonth, histReason, histDevice, histPage, histSort]);

  const filteredTrafficSeries = useMemo(() => {
    if (!trafficDetail?.series) return [];
    return filterTrafficSeries(
      trafficDetail.series,
      trafficRange,
      trafficFrom,
      trafficTo
    );
  }, [trafficDetail, trafficRange, trafficFrom, trafficTo]);

  const loadTraffic = useCallback(async () => {
    setTrafficLoading(true);
    try {
      const res = await api.get('/vss/traffic');
      const body = res.data?.data ?? res.data;
      setTrafficDetail(body as VSSTrafficDetail);
    } catch {
      setTrafficDetail(null);
    } finally {
      setTrafficLoading(false);
    }
  }, []);

  const filteredLiveRows = useMemo(() => {
    if (!liveDate) return liveRows;
    return liveRows.filter((r) => {
        if (!r.last_seen) return false;
        const d = new Date(r.last_seen);
        if (Number.isNaN(d.getTime())) return false;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}` === liveDate;
    });
    }, [liveRows, liveDate]);

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

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('date', overviewDate || yesterdayStr());
      const res = await api.get(`/vss/summary?${params.toString()}`);
      const body = res.data?.data ?? res.data;
      setOverview(body as VSSDaySummary);
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [overviewDate]);

    const overviewCaptureRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const exportOverviewImage = useCallback(async () => {
    const el = overviewCaptureRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });
      const link = document.createElement('a');
      const label = overview?.date || overviewDate || 'rekap';
      link.download = `vss-overview-${label}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Export overview failed', e);
    } finally {
      setExporting(false);
    }
  }, [overview?.date, overviewDate]);

    const exportOverviewExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      const date = overviewDate || yesterdayStr();
      const res = await api.get(`/vss/summary/export?date=${encodeURIComponent(date)}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vss-rekap-delay-${date}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export excel failed', e);
      alert('Gagal export Excel. Pastikan tanggal valid dan ada data.');
    } finally {
      setExportingExcel(false);
    }
  }, [overviewDate]);

  useEffect(() => {
    if (tab === 'overview') {
      loadOverview();
    }
  }, [tab, overviewDate, loadOverview]);

  useEffect(() => {
    if (tab === 'history') loadOverview();
  }, [tab, loadOverview]);

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
    const id = setInterval(() => {
        loadLiveSoft();
    }, 3_000);
    return () => clearInterval(id);
    }, [tab, loadLiveSoft]);

  useEffect(() => {
    setLivePage(1);
  }, [liveSort.key, liveSort.dir]);

  useEffect(() => {
    setHistPage(1);
  }, [histSort.key, histSort.dir]);

    useEffect(() => {
      if (tab !== 'stats') return;
      loadTraffic();
      const id = setInterval(loadTraffic, 5_000);
      return () => clearInterval(id);
    }, [tab, loadTraffic]);

  useEffect(() => {
    setLivePage(1);
  }, [liveDevice, liveAction, liveStatus, onlyIssue]);

  useEffect(() => {
    setHistPage(1);
  }, [yearMonth, histReason, histDevice]);

  useEffect(() => {
  if (yearMonth !== '') return;
  api.get('/vss/history?page=1&per_page=1')
    .then((res) => {
      const body = res.data?.data ?? res.data;
      const list = Array.isArray(body?.data) ? body.data : [];
      if (list.length > 0 && list[0].detected_at) {
        const d = new Date(list[0].detected_at);
        if (!isNaN(d.getTime())) {
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          setYearMonth(ym);
          return;
        }
      }
      setYearMonth(currentYearMonth());
    })
    .catch(() => setYearMonth(currentYearMonth()));
}, []);

  const livePages = Math.max(1, Math.ceil(liveTotal / perPage));
  const histPages = Math.max(1, Math.ceil(histTotal / perPage));

  const stats = useMemo(() => buildStats(statsRows), [statsRows]);
  const reasonTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of statsRows) m[r.reason] = (m[r.reason] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [statsRows]);

  const daySeries = useMemo(() => groupHistoryByDay(statsRows), [statsRows]);

    const topReason = reasonTotals[0];
    const topDevices = stats.slice(0, 5);
    const maxDelayEvent = useMemo(() => {
        let best: VSSAlertHistory | null = null;
        for (const r of statsRows) {
            if (!best || (r.delay_sec || 0) > (best.delay_sec || 0)) best = r;
        }
        return best;
    }, [statsRows])

    const delayCategoryDist = useMemo(() => {
    const counts: Record<DelayCategory, number> = {
      '0s': 0,
      '1s-5s': 0,
      '5s-1m': 0,
      '1m-5m': 0,
      '>5m': 0,
    };
    for (const r of statsRows) {
      if (r.delay_sec == null) continue;
      counts[categorizeDelay(r.delay_sec)] += 1;
    }
    return counts;
  }, [statsRows]);

  const deviceDayStats = useMemo(() => buildDeviceDayStats(statsRows), [statsRows]);

  const clearFilters = () => {
    if (tab === 'live') {
        setLiveDate(todayStr());
        setLiveDevice('');
        setLiveAction('');
        setLiveStatus('');
        setOnlyIssue(false);
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
        ? !!(
            liveDevice ||
            liveAction ||
            liveStatus ||
            onlyIssue ||
            liveDate !== todayStr()
        )
        : !!(histReason || histDevice || yearMonth !== currentYearMonth());

  const refresh = () => {
    if (tab === 'overview') loadOverview();
    else if (tab === 'live') loadLive();
    else if (tab === 'history') loadHistory();
    else {
      loadStats();
      loadTraffic();
    }
  };

  const onLiveSort = (key: string) => {
    setLiveSort((prev) => toggleSort(prev, key));
  };

  const onHistSort = (key: string) => {
    setHistSort((prev) => toggleSort(prev, key));
  };

  useEffect(() => {
    setLivePage(1);
  }, [liveSort.key, liveSort.dir]);

  useEffect(() => {
    setHistPage(1);
  }, [histSort.key, histSort.dir]);

  const subtitle =
  tab === 'overview'
      ? overview
        ? `Rekap ${overview.date} · ${overview.total_events} event · ${overview.total_devices} device`
        : 'Rekap delay hari yang dipilih'
    : tab === 'live'
        ? liveTotal > 0
        ? `${(livePage - 1) * perPage + 1}–${Math.min(livePage * perPage, liveTotal)} dari ${liveTotal} device (live)`
        : '0 device (live) — menunggu traffic WS'
        : tab === 'history'
        ? histTotal > 0
          ? `${(histPage - 1) * perPage + 1}–${Math.min(histPage * perPage, histTotal)} dari ${histTotal} history`
          : '0 history kritis'
        : `${statsRows.length} event · ${stats.length} device · ${yearMonth}`;
  
  const overviewPieTotal = useMemo(() => {
    if (!overview?.distribution) return 0;
    const d = overview.distribution;
    return (
      (d['1s-5s'] || 0) +
      (d['5s-1m'] || 0) +
      (d['1m-5m'] || 0) +
      (d['>5m'] || 0)
    );
  }, [overview]);

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', minHeight: '100%' }}>
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
                { id: 'overview' as Tab, label: 'Overview (rekap)', icon: 'bi-camera' },
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
                <FilterSection label="TANGGAL (LAST SEEN)">
                <input
                    type="date"
                    value={liveDate}
                    onChange={(e) => setLiveDate(e.target.value)}
                    style={inputStyle}
                />
                </FilterSection>

                <FilterSection label="DEVICE NAME / ID">
                <input
                    type="text"
                    placeholder="Nama atau ID device..."
                    value={liveDevice}
                    onChange={(e) => setLiveDevice(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadLive()}
                    style={inputStyle}
                />
                </FilterSection>

                <FilterSection label="ACTION">
                <select
                    value={liveAction}
                    onChange={(e) => setLiveAction(e.target.value)}
                    style={inputStyle}
                >
                    <option value="">Semua action</option>
                    <option value="80003">80003 (status)</option>
                    <option value="80004">80004 (alarm)</option>
                    <option value="stale">stale (no heartbeat)</option>
                </select>
                </FilterSection>

                <FilterSection label="STATUS">
                <select
                    value={liveStatus}
                    onChange={(e) => setLiveStatus(e.target.value)}
                    style={inputStyle}
                >
                    <option value="">Semua status</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="DELAYED">DELAYED</option>
                    <option value="STALE">STALE</option>
                    <option value="ALARM">ALARM</option>
                    <option value="STORAGE_FULL">STORAGE_FULL</option>
                    <option value="HIGH_CPU">HIGH_CPU</option>
                    <option value="ISSUE">ISSUE</option>
                </select>
                </FilterSection>

                <label
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    marginBottom: 12,
                    cursor: 'pointer',
                }}
                >
                <input
                    type="checkbox"
                    checked={onlyIssue}
                    onChange={(e) => {
                    setOnlyIssue(e.target.checked);
                    setLivePage(1);
                    }}
                />
                Hanya yang bermasalah
                </label>
            </>
            ) : (
            <>
              {(tab === 'history' || tab === 'stats') && (
                <FilterSection label="BULAN (YYYY-MM)">
                  <input
                    type="month"
                    value={yearMonth}
                    onChange={(e) => {
                      setYearMonth(e.target.value);
                      setHistPage(1);
                    }}
                    style={inputStyle}
                  />
                </FilterSection>
              )}
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

          {tab === 'overview' && (
            <FilterSection label="TANGGAL REKAP (MASA LALU)">
              <input
                type="date"
                value={overviewDate}
                max={maxPastDateStr()}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && v < todayStr()) {
                    setOverviewDate(v);
                  }
                }}
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                Hanya tanggal sebelum hari ini. Default: kemarin.
              </div>
            </FilterSection>
          )}

          {hasFilters && (
            <button type="button" onClick={clearFilters} style={clearBtnStyle}>
              <i className="bi bi-x me-1" /> Clear Filters
            </button>
          )}
        </div>
      </div>

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

        {tab === 'live' && liveTraffic && (
            <div
                style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 10,
                marginBottom: 16,
                }}
            >
                <StatCard label="WS traffic" value={String(liveTraffic.total_messages)} />
                <StatCard label="80003" value={String(liveTraffic.total_80003)} />
                <StatCard label="80004" value={String(liveTraffic.total_80004)} />
                <StatCard label="Devices" value={String(liveTraffic.device_count)} />
                <StatCard label="Normal" value={String(liveTraffic.normal_count)} />
                <StatCard label="Issue" value={String(liveTraffic.issue_count)} />
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
              <LoadingSpinner message="Memuat live status..." />
            ) : (
              <>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
              <strong>Delay</strong> = selisih waktu server vs DTU saat paket terakhir ·{' '}
              <strong>Last Seen</strong> = kapan monitor terakhir menerima pesan dari device
            </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <SortableTh label="NAME" sortKey="device_name" sort={liveSort} onSort={onLiveSort} />
                        <SortableTh label="DEVICE ID" sortKey="device_id" sort={liveSort} onSort={onLiveSort} />
                        <SortableTh label="DELAY" sortKey="delay_sec" sort={liveSort} onSort={onLiveSort} />
                        <SortableTh label="LAST SEEN" sortKey="last_seen" sort={liveSort} onSort={onLiveSort} />
                        <SortableTh label="DEVICE TIME" sortKey="dtu" sort={liveSort} onSort={onLiveSort} />
                        <SortableTh label="SENT TO MIDDLEWARE AT" sortKey="report_time" sort={liveSort} onSort={onLiveSort} />
                        <SortableTh label="ACTION" sortKey="action" sort={liveSort} onSort={onLiveSort} />
                      </tr>
                    </thead>
                    <tbody>
                        {filteredLiveRows.length === 0 ? (
                            <EmptyRow
                            colSpan={9}
                            text="Belum ada data live untuk filter ini"
                            />
                        ) : (
                            filteredLiveRows.map((r, idx) => (
                            <tr
                                key={`${r.device_id}-${r.last_seen ?? ''}-${idx}`}
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
                                <td style={{ ...tdStyle, fontWeight: 600 }}>{r.device_name || '—'}</td>
                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                                {r.device_id}
                                </td>
                                <td
                                  style={{
                                    ...tdStyle,
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: 600,
                                    color: (r.delay_sec ?? 0) === 0 ? '#059669' : '#dc2626',
                                  }}
                                  title="Lag timestamp device (DTU) saat pesan terakhir diterima"
                                >
                                  {formatDelaySec(r.delay_sec)}
                                </td>
                                <td
                                  style={{
                                    ...tdStyle,
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: 600,
                                    color: (() => {
                                      const a = ageSecFromISO(r.last_seen) ?? 0;
                                      return a === 0 ? '#059669' : '#dc2626';
                                    })(),
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={
                                    r.last_seen
                                      ? `Terakhir terima: ${formatDateTime(r.last_seen)}`
                                      : 'Belum ada last_seen'
                                  }
                                >
                                  {formatAgeSec(r.last_seen)}
                                </td>
                                <td style={tdStyle}>{r.dtu || '—'}</td>
                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                                  {formatReportTime(r.report_time)}
                                </td>
                                <td style={tdStyle}>{r.action || '—'}</td>
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
                        <SortableTh label="NAME" sortKey="device_name" sort={histSort} onSort={onHistSort} />
                        <SortableTh label="DEVICE ID" sortKey="device_id" sort={histSort} onSort={onHistSort} />
                        <SortableTh label="DELAY" sortKey="delay_sec" sort={histSort} onSort={onHistSort} />
                        <SortableTh label="LAST SEEN" sortKey="detected_at" sort={histSort} onSort={onHistSort} />
                        <SortableTh label="DEVICE TIME" sortKey="dtu" sort={histSort} onSort={onHistSort} />
                        <SortableTh label="SENT TO MIDDLEWARE AT" sortKey="report_time" sort={histSort} onSort={onHistSort} />
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
                            <td style={{ ...tdStyle, fontWeight: 500, color: '#1e293b' }}>
                              {r.device_name || '—'}
                            </td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                              {r.device_id}
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: 600,
                                color: (() => {
                                  const a = ageSecFromISO(r.detected_at) ?? 0;
                                  return a === 0 ? '#059669' : '#dc2626';
                                })(),
                                whiteSpace: 'nowrap',
                              }}
                              title={r.detected_at ? formatDateTime(r.detected_at) : undefined}
                            >
                              {formatAgeSec(r.detected_at)}
                            </td>
                            {/* <td style={{ ...tdStyle, fontWeight: 500, color: '#1e293b' }}>
                              {r.action || '—'}
                            </td> */}
                            <td style={tdStyle}>{r.dtu || '—'}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                              {formatReportTime(r.report_time)}
                            </td>
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

            {tab === 'overview' &&
              (overviewLoading ? (
                <LoadingSpinner message="Memuat rekap hari..." />
              ) : !overview ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                  Tidak ada data untuk tanggal ini
                </div>
              ) : (
                <div style={{ padding: '12px 16px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 8 }}>
                    <button
                      type="button"
                      onClick={exportOverviewExcel}
                      disabled={exportingExcel || overviewLoading}
                      style={{
                        ...btnOutline,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        opacity: exportingExcel ? 0.7 : 1,
                      }}
                    >
                      <i className="bi bi-file-earmark-excel" />
                      {exportingExcel ? 'Export…' : 'Export Excel'}
                    </button>
                    <button
                      type="button"
                      onClick={exportOverviewImage}
                      disabled={exporting}
                      style={{
                        ...btnPrimary,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        opacity: exporting ? 0.7 : 1,
                      }}
                    >
                      <i className="bi bi-camera" />
                      {exporting ? 'Menyimpan…' : 'Simpan gambar rekap'}
                    </button>
                  </div>

                  <div
                    ref={overviewCaptureRef}
                    style={{
                      background: '#f8fafc',
                      borderRadius: 12,
                      padding: 16,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
                        Overview —{' '}
                        <span style={{ color: '#dc2626' }}>
                          {overview.date === yesterdayStr() ? 'KEMARIN' : overview.date}
                        </span>
                      </h3>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Ringkasan delay device · 00:00 – 23:59
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                          Total device = unit yang sempat ter-sample hari itu.
                          Kartu & pie &quot;avg &gt; 3 detik&quot; = yang rata-rata delay-nya di atas 3 detik.
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <StatCard
                        label="Total device mengalami delay"
                        value={String(overview.total_devices)}
                      />
                      <StatCard
                        label="Total delay diatas 3 detik"
                        value={String(overviewPieTotal)}
                      />
                      {/* <StatCard label="Delay > 5 detik" value={String(overview.delay_over_5_count)} /> */}
                      <StatCard label="Delay tertinggi" value={formatDelaySec(overview.max_delay_sec)} />
                      <StatCard label="Total event" value={String(overview.total_events)} />
                    </div>

                    {overview.max_delay_device && (
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                        Delay tertinggi:{' '}
                        <strong style={{ color: '#dc2626' }}>
                          {formatDelaySec(overview.max_delay_sec)}
                        </strong>{' '}
                        · {overview.max_delay_device} ({overview.max_delay_device_id})
                      </div>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(260px, 0.9fr) minmax(320px, 1.1fr)',
                        gap: 12,
                        alignItems: 'stretch',
                      }}
                    >
                      <div
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '12px 14px',
                          background: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 2 }}>
                          Distribusi Durasi Delay
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                          {overview.date}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>
                          Hanya device dengan <strong>rata-rata delay &gt; 3 detik</strong>
                          {' '}({overviewPieTotal} dari {overview.total_devices} device).
                          Angka di tengah pie = jumlah device tersebut, bukan total event.
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                          <DelayCategoryPieChart
                            dist={{
                              '0s': overview.distribution?.['0s'] || 0,
                              '1s-5s': overview.distribution?.['1s-5s'] || 0,
                              '5s-1m': overview.distribution?.['5s-1m'] || 0,
                              '1m-5m': overview.distribution?.['1m-5m'] || 0,
                              '>5m': overview.distribution?.['>5m'] || 0,
                            }}
                            total={overviewPieTotal}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          overflow: 'hidden',
                          background: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            padding: '10px 12px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                            Top 10 delay tertinggi
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            Avg delay · {overview.date}
                          </div>
                        </div>
                        <div style={{ overflow: 'visible' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['#', 'DEVICE', 'DEVICE ID', 'AVG DELAY'].map((h) => (
                                  <th key={h} style={{ ...thStyle, padding: '8px 10px', fontSize: 11 }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(overview.top_devices || []).length === 0 ? (
                                <EmptyRow colSpan={4} text="Tidak ada device dengan avg delay > 3 detik" />
                              ) : (
                                overview.top_devices.map((d, idx) => (
                                  <tr
                                    key={d.device_id}
                                    style={{
                                      borderBottom: '1px solid #f1f5f9',
                                      background: idx % 2 === 0 ? '#fff' : '#fafafa',
                                    }}
                                  >
                                    <td style={{ ...tdStyle, padding: '7px 10px' }}>{idx + 1}</td>
                                    <td style={{ ...tdStyle, padding: '7px 10px', fontWeight: 600 }}>
                                      {d.device_name}
                                    </td>
                                    <td
                                      style={{
                                        ...tdStyle,
                                        padding: '7px 10px',
                                        fontFamily: 'monospace',
                                        fontSize: 11,
                                      }}
                                    >
                                      {d.device_id}
                                    </td>
                                    <td
                                      style={{
                                        ...tdStyle,
                                        padding: '7px 10px',
                                        fontWeight: 700,
                                        color: '#dc2626',
                                        fontVariantNumeric: 'tabular-nums',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {formatDelaySec(d.max_delay_sec)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

          {tab === 'stats' &&
            (statsLoading ? (
              <LoadingSpinner message="Menghitung statistik..." />
            ) : (
              <div style={{ padding: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  {(
                    [
                      { id: 'summary' as StatsView, label: 'Ringkasan', icon: 'bi-speedometer2' },
                      { id: 'traffic' as StatsView, label: 'Traffic / menit', icon: 'bi-pie-chart' },
                      { id: 'devices' as StatsView, label: 'Top device', icon: 'bi-truck' },
                    ] as const
                  ).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setStatsView(v.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 9,
                        border: `1px solid ${statsView === v.id ? '#6366f1' : '#e2e8f0'}`,
                        background: statsView === v.id ? '#eef2ff' : '#fff',
                        color: statsView === v.id ? '#4338ca' : '#475569',
                        fontWeight: statsView === v.id ? 600 : 500,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <i className={`bi ${v.icon}`} />
                      {v.label}
                    </button>
                  ))}
                </div>

          {statsView === 'summary' && (
            <>
              <div
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
                  border: '1px solid #e0e7ff',
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 6 }}>
                  Fleet event summary
                </div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                  Periode <strong>{yearMonth || '—'}</strong>
                  {' · '}
                  Total event: <strong>{statsRows.length}</strong>
                  {' · '}
                  Device terdampak: <strong>{stats.length}</strong>
                  {topReason && (
                    <>
                      {' · '}Reason terbanyak:{' '}
                      <strong>
                        {REASON_STYLE[topReason[0]]?.label || topReason[0]} ({topReason[1]})
                      </strong>
                    </>
                  )}
                </div>
                {maxDelayEvent && (
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                    Delay tertinggi di history:{' '}
                    <strong style={{ color: '#dc2626' }}>
                      {formatDelaySec(maxDelayEvent.delay_sec)}
                    </strong>{' '}
                    ({maxDelayEvent.device_name || maxDelayEvent.device_id})
                  </div>
                )}
                {topDevices.length > 0 && (
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                    Top 5 device:{' '}
                    {topDevices.map((d) => `${d.device_name} (${d.total} event)`).join(', ')}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <StatCard label="Periode" value={yearMonth || '—'} />
                <StatCard label="Total event" value={String(statsRows.length)} />
                <StatCard label="Device" value={String(stats.length)} />
                <StatCard label="Reason unik" value={String(reasonTotals.length)} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>
                    Distribusi Durasi Delay
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    Kategori berdasarkan lamanya delay yang tercatat
                  </div>
                  {statsRows.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24 }}>
                      Belum ada data
                    </div>
                  ) : (
                    <DelayCategoryPieChart dist={delayCategoryDist} total={statsRows.filter(r => r.delay_sec != null).length} />
                  )}
                </div>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>
                    Top Device — Frekuensi Delay per Hari
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    Heatmap hari aktif · semakin gelap semakin banyak delay dalam 1 hari
                  </div>
                  {deviceDayStats.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24 }}>
                      Belum ada data delay
                    </div>
                  ) : (
                    <DeviceDayHeatmap rows={deviceDayStats.slice(0, 8)} />
                  )}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  background: '#fff',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>
                  Tren event per hari
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                  Jumlah event history · garis biru = count, merah = max delay (detik)
                </div>
                {daySeries.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: 13, padding: 24, textAlign: 'center' }}>
                    Belum ada data di periode ini
                  </div>
                ) : (
                  <DayTrendChart series={daySeries} />
                )}
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Devices bermasalah (top 10)</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        {['Device Name', 'Device ID', 'Total event', 'Status'].map((h) => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.length === 0 ? (
                        <EmptyRow colSpan={4} text="Belum ada data" />
                      ) : (
                        stats.slice(0, 10).map((s, idx) => (
                          <tr
                            key={s.device_id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: idx % 2 === 0 ? '#fffbeb' : '#fff',
                            }}
                          >
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{s.device_name}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{s.device_id}</td>
                            <td style={tdStyle}>{s.total}</td>
                            <td style={tdStyle}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#b45309' }}>
                                FLAGGED
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {statsView === 'traffic' && (
            <div>
              {trafficLoading && !trafficDetail ? (
                <LoadingSpinner />
              ) : !trafficDetail ? (
                <div style={{ color: '#94a3b8', padding: 24, textAlign: 'center' }}>
                  Belum ada data traffic
                </div>
              ) : (
                <>
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                      background: '#fff',
                      fontSize: 13,
                      color: '#334155',
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Traffic per Action</div>
                    <div>
                      Total sejak server nyala:{' '}
                      {Object.entries(trafficDetail.totals || {})
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([k, v]) => `${k}: ${v.toLocaleString()}`)
                        .join(' | ') || '—'}
                    </div>
                    <div>
                      Total traffic keseluruhan:{' '}
                      <strong>{(trafficDetail.total_messages || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      Traffic menit berjalan ({trafficDetail.current_minute?.minute || '—'}):{' '}
                      <strong>{(trafficDetail.current_minute?.total || 0).toLocaleString()}</strong>
                      {' total ('}
                      {(trafficDetail.tracked_actions || ['80003', '80004', '80005', '80007', '80030'])
                        .map(
                          (a) =>
                            `${a}: ${(trafficDetail.current_minute?.counts?.[a] || 0).toLocaleString()}`
                        )
                        .join(', ')}
                      {')'}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    {(
                      [
                        { id: '15m' as TrafficRange, label: 'Last 15m' },
                        { id: '1h' as TrafficRange, label: 'Last 1h' },
                        { id: '3h' as TrafficRange, label: 'Last 3h' },
                        { id: '6h' as TrafficRange, label: 'Last 6h' },
                        { id: '12h' as TrafficRange, label: 'Last 12h' },
                        { id: '24h' as TrafficRange, label: 'Last 24h' },
                        { id: 'custom' as TrafficRange, label: 'Custom' },
                      ] as const
                    ).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setTrafficRange(r.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 7,
                          border: `1px solid ${trafficRange === r.id ? '#6366f1' : '#e2e8f0'}`,
                          background: trafficRange === r.id ? '#6366f1' : '#fff',
                          color: trafficRange === r.id ? '#fff' : '#374151',
                          fontSize: 12,
                          fontWeight: trafficRange === r.id ? 600 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {trafficRange === 'custom' && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        alignItems: 'center',
                        marginBottom: 12,
                        fontSize: 13,
                      }}
                    >
                      <label style={{ color: '#64748b' }}>
                        From{' '}
                        <input
                          type="datetime-local"
                          value={trafficFrom}
                          onChange={(e) => setTrafficFrom(e.target.value)}
                          style={{ ...inputStyle, width: 'auto', marginLeft: 6 }}
                        />
                      </label>
                      <label style={{ color: '#64748b' }}>
                        To{' '}
                        <input
                          type="datetime-local"
                          value={trafficTo}
                          onChange={(e) => setTrafficTo(e.target.value)}
                          style={{ ...inputStyle, width: 'auto', marginLeft: 6 }}
                        />
                      </label>
                    </div>
                  )}

                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 16,
                      background: '#fff',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                      Trafik per menit (realtime)
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                      Hover titik/menit untuk detail · update tiap 5 detik · data tersedia:{' '}
                      {(trafficDetail.series || []).length} menit
                      {(trafficDetail.series || []).length < 60
                        ? ' (backend ~60 menit terakhir)'
                        : ''}
                    </div>
                    <TrafficPerMinuteChart
                      series={filteredTrafficSeries}
                      current={
                        trafficRange === 'custom' ? undefined : trafficDetail.current_minute
                      }
                      actions={
                        trafficDetail.tracked_actions || [
                          '80003',
                          '80004',
                          '80005',
                          '80007',
                          '80030',
                        ]
                      }
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {statsView === 'devices' && (
              <div
              style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  overflow: 'hidden',
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
                  Diurutkan dari jumlah event history terbanyak · {yearMonth}
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
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
                      )}
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

const PIE_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

function ReasonPieChart({
  totals,
  total,
}: {
  totals: [string, number][];
  total: number;
}) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  let angle = -Math.PI / 2;

  const slices = totals.map(([reason, n], i) => {
    const portion = total ? n / total : 0;
    const start = angle;
    const end = angle + portion * Math.PI * 2;
    angle = end;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = portion > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { reason, n, d, color: PIE_COLORS[i % PIE_COLORS.length], portion };
  });

  return (
    <div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.length === 1 ? (
          <circle cx={cx} cy={cy} r={r} fill={slices[0].color} />
        ) : (
          slices.map((s) => <path key={s.reason} d={s.d} fill={s.color} stroke="#fff" strokeWidth={2} />)
        )}
        <circle cx={cx} cy={cy} r={38} fill="#fff" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1e293b">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">
          event
        </text>
      </svg>
      <div style={{ marginTop: 8, textAlign: 'left' }}>
        {slices.map((s) => (
          <div
            key={s.reason}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#475569', flex: 1 }}>
              {REASON_STYLE[s.reason]?.label || s.reason}
            </span>
            <span style={{ fontWeight: 600 }}>{Math.round(s.portion * 1000) / 10}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayTrendChart({
  series,
}: {
  series: { date: string; count: number; avgDelay: number; maxDelay: number }[];
}) {
  const w = 640;
  const h = 180;
  const pad = { t: 16, r: 12, b: 28, l: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxCount = Math.max(1, ...series.map((s) => s.count));
  const maxDelay = Math.max(1, ...series.map((s) => s.maxDelay));

  const x = (i: number) => pad.l + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const yCount = (v: number) => pad.t + innerH - (v / maxCount) * innerH;
  const yDelay = (v: number) => pad.t + innerH - (v / maxDelay) * innerH;

  const lineCount = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yCount(s.count)}`).join(' ');
  const lineDelay = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yDelay(s.maxDelay)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ maxHeight: 200 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const yy = pad.t + innerH * (1 - t);
        return (
          <line
            key={t}
            x1={pad.l}
            x2={w - pad.r}
            y1={yy}
            y2={yy}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}
      <path d={lineDelay} fill="none" stroke="#ef4444" strokeWidth={2} />
      <path d={lineCount} fill="none" stroke="#6366f1" strokeWidth={2} />
      {series.map((s, i) => (
        <g key={s.date}>
          <circle cx={x(i)} cy={yCount(s.count)} r={3} fill="#6366f1" />
          <circle cx={x(i)} cy={yDelay(s.maxDelay)} r={3} fill="#ef4444" />
          {(i === 0 || i === series.length - 1 || i % Math.ceil(series.length / 6) === 0) && (
            <text
              x={x(i)}
              y={h - 8}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {s.date.slice(5)}
            </text>
          )}
        </g>
      ))}
      <text x={pad.l} y={12} fontSize={10} fill="#6366f1">
        Event count
      </text>
      <text x={pad.l + 80} y={12} fontSize={10} fill="#ef4444">
        Max delay (s)
      </text>
    </svg>
  );
}

function DelayCategoryPieChart({
  dist,
  total,
}: {
  dist: Record<DelayCategory, number>;
  total: number;
}) {
  const categories: DelayCategory[] = ['1s-5s', '5s-1m', '1m-5m', '>5m'];
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  let angle = -Math.PI / 2;

  const slices = categories
    .map((cat) => {
      const n = dist[cat] || 0;
      const portion = total > 0 ? n / total : 0;
      const start = angle;
      const end = angle + portion * Math.PI * 2;
      angle = end;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = portion > 0.5 ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return { cat, n, d, color: DELAY_CATEGORY_COLOR[cat], portion };
    })
    .filter((s) => s.n > 0);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {slices.length === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" />
        ) : slices.length === 1 ? (
          <circle cx={cx} cy={cy} r={r} fill={slices[0].color} />
        ) : (
          slices.map((s) => (
            <path key={s.cat} d={s.d} fill={s.color} stroke="#fff" strokeWidth={2} />
          ))
        )}
        <circle cx={cx} cy={cy} r={38} fill="#fff" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1e293b">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">
          device
        </text>
      </svg>

      <div style={{ flex: 1, minWidth: 140 }}>
        {categories.map((cat) => {
          const n = dist[cat] || 0;
          const pct = total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
          return (
            <div
              key={cat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: DELAY_CATEGORY_COLOR[cat],
                  flexShrink: 0,
                }}
              />
              <span style={{ color: '#475569', flex: 1 }}>{DELAY_CATEGORY_LABEL[cat]}</span>
              <span style={{ fontWeight: 700, color: '#1e293b', minWidth: 28, textAlign: 'right' }}>
                {n}
              </span>
              <span style={{ color: '#94a3b8', minWidth: 42, textAlign: 'right' }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeviceDayHeatmap({ rows }: { rows: DeviceDayStat[] }) {
  if (rows.length === 0) return null;

  const allDates = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.days)))
  ).sort();

  const globalMax = Math.max(1, ...rows.flatMap((r) => Object.values(r.days)));

  function cellColor(count: number): string {
    if (!count) return '#f1f5f9';
    const intensity = count / globalMax;
    if (intensity <= 0.33) return '#fde68a';
    if (intensity <= 0.66) return '#f97316';
    return '#dc2626';
  }

  const cellSize = 18;
  const gap = 2;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        style={{
          display: 'flex',
          gap: gap,
          marginLeft: 120,
          marginBottom: 4,
        }}
      >
        {allDates.map((d) => (
          <div
            key={d}
            style={{
              width: cellSize,
              fontSize: 9,
              color: '#94a3b8',
              textAlign: 'center',
              flexShrink: 0,
              transform: 'rotate(-45deg)',
              transformOrigin: 'center bottom',
              height: 28,
              lineHeight: '28px',
            }}
          >
            {d.slice(5)}
          </div>
        ))}
      </div>

      {rows.map((row) => {
        const rowTotal = Object.values(row.days).reduce((s, x) => s + x, 0);
        return (
          <div
            key={row.deviceId}
            style={{ display: 'flex', alignItems: 'center', gap: gap, marginBottom: gap }}
          >
            <div
              style={{
                width: 116,
                flexShrink: 0,
                fontSize: 11,
                color: '#1e293b',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                paddingRight: 4,
                textAlign: 'right',
              }}
              title={`${row.deviceName} (${row.deviceId})`}
            >
              {row.deviceName}
            </div>

            {allDates.map((d) => {
              const count = row.days[d] || 0;
              return (
                <div
                  key={d}
                  title={count ? `${row.deviceName} · ${d} · ${count}x delay` : `${row.deviceName} · ${d} · aman`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 3,
                    background: cellColor(count),
                    flexShrink: 0,
                    cursor: count ? 'default' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    color: count >= globalMax * 0.66 ? '#fff' : '#64748b',
                    fontWeight: count ? 600 : 400,
                  }}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}

            <div
              style={{
                fontSize: 11,
                color: '#ef4444',
                fontWeight: 700,
                marginLeft: 4,
                minWidth: 28,
              }}
            >
              {rowTotal}×
            </div>
          </div>
        );
      })}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 12,
          fontSize: 11,
          color: '#94a3b8',
        }}
      >
        <span>Sedikit</span>
        {['#fde68a', '#f97316', '#dc2626'].map((c) => (
          <span
            key={c}
            style={{ width: 12, height: 12, borderRadius: 2, background: c, display: 'inline-block' }}
          />
        ))}
        <span>Banyak</span>
      </div>
    </div>
  );
}

export default VSSMonitor;