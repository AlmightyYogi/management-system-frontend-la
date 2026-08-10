import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import api from '../../services/api';
import type { Report, Stats } from '../../types/report';
import { COLORS, STATUS_MAP } from '../../types/report';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend,
);

type Period = 'week' | 'month' | 'year';

const initials = (name?: string) =>
  (name ?? '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const avatarColor = (name?: string) => {
  const cols = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
  return cols[(name?.charCodeAt(0) ?? 0) % cols.length];
};

const getLast7Days = () => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
  }
  return days;
};

const getLast30Days = () => {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
  }
  return days;
};

const getMonthsOfYear = () => {
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const cur = new Date().getMonth();
  return Array.from({ length: 12 }, (_, i) => months[(cur - 11 + i + 12) % 12]);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState<Stats>({
    totalOpen: 0, inProgress: 0, resolvedToday: 0,
    slaBreached: 0, avgResolutionHours: 0, activeAgents: 0,
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate)   params.append('end_date', endDate);
      const res = await api.get(`/reports?${params.toString()}&per_page=200`);
      const payload = res.data?.data ?? res.data;
      const list: Report[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      setReports(list);

      const today = new Date().toISOString().split('T')[0];
      const assignees = new Set(list.map(r => r.assigned_to).filter(Boolean));

      setStats({
        totalOpen:          list.filter(r => r.status === 1).length,
        inProgress:         list.filter(r => r.status === 2).length,
        resolvedToday:      list.filter(r => r.resolved_time && r.resolved_time.toString().startsWith?.(today)).length || list.filter(r => [0,4].includes(r.status) && r.updated_at?.split('T')[0] === today).length,
        slaBreached:        list.filter(r => r.status === 1 && new Date(r.created_at) < new Date(Date.now() - 4 * 3600000)).length,
        avgResolutionHours: 3.2,
        activeAgents:       assignees.size || 6,
      });
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const buildTrendData = () => {
    const labels = period === 'week' ? getLast7Days() : period === 'month' ? getLast30Days() : getMonthsOfYear();
    const openData   = labels.map(() => Math.floor(Math.random() * 10 + 5));
    const resolvedData = labels.map((_, i) => Math.max(0, openData[i] - Math.floor(Math.random() * 5)));
    if (reports.length > 0) {
      const now = Date.now();
      labels.forEach((_, i) => {
        const ago = period === 'week' ? (6 - i) * 86400000 : period === 'month' ? (29 - i) * 86400000 : (11 - i) * 30 * 86400000;
        const from = now - ago - (period === 'year' ? 30 * 86400000 : 86400000);
        const to   = now - ago + (period === 'year' ? 30 * 86400000 : 86400000);
        openData[i]     = reports.filter(r => { const t = new Date(r.created_at).getTime(); return t >= from && t <= to; }).length;
        resolvedData[i] = reports.filter(r => { const t = new Date(r.created_at).getTime(); return t >= from && t <= to && [0,4].includes(r.status); }).length;
      });
    }
    return { labels, openData, resolvedData };
  };

  const trend = buildTrendData();

  const typeCount = {
    Incident: reports.filter(r => r.type === 'Incident').length,
    Request:  reports.filter(r => r.type === 'Request').length,
    Activity: reports.filter(r => r.type === 'Activity').length,
  };

  const priorityCount = {
    Critical: reports.filter(r => r.severity?.includes('Emergency') || r.severity?.includes('1')).length,
    High:     reports.filter(r => r.severity?.includes('Critical') || r.severity?.includes('2')).length,
    Medium:   reports.filter(r => r.severity?.includes('Major') || r.severity?.includes('3')).length,
    Low:      reports.filter(r => r.severity?.includes('Minor') || r.severity?.includes('4')).length,
  };

  const categoryCount = Object.entries(
    reports.reduce((acc, r) => { acc[r.apps] = (acc[r.apps] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const recentReports = [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const statCards = [
    { icon: '○', color: COLORS.primary,  bg: '#f0f4ff', label: 'Total Open',       value: stats.totalOpen,          delta: '+3'   },
    { icon: '◷', color: '#8b5cf6',        bg: '#faf5ff', label: 'In Progress',      value: stats.inProgress,         delta: '+1'   },
    { icon: '✓', color: COLORS.green,    bg: '#f0fdf4', label: 'Resolved Today',   value: stats.resolvedToday,      delta: '+5'   },
    { icon: '⚠', color: '#ef4444',        bg: '#fef2f2', label: 'SLA Breached',     value: stats.slaBreached,         delta: '-2'   },
    { icon: '⚡', color: '#f97316',       bg: '#fff7ed', label: 'Avg Resolution',   value: `${stats.avgResolutionHours}h`, delta: '-0.4h' },
    { icon: '👤', color: '#06b6d4',       bg: '#ecfeff', label: 'Active Agents',    value: stats.activeAgents,       delta: '0'    },
  ];

  const maxCat = categoryCount[0]?.[1] ?? 1;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Dashboard</h4>
          <p className="text-muted mb-0 small">
            Overview per hari ini, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 px-3 py-2 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-pill">
          <span className="bg-success rounded-circle" style={{ width: '8px', height: '8px' }}></span>
          <span className="small fw-semibold text-success">System Operational</span>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {statCards.map((s, i) => (
          <div key={i} className="col-12 col-sm-6 col-lg-4 col-xl-2">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3"
                    style={{ width: '42px', height: '42px', background: s.bg, color: s.color, fontSize: '1.25rem' }}
                  >
                    {s.icon}
                  </div>
                  <span className={`small fw-semibold ${s.delta.startsWith('-') ? 'text-danger' : 'text-success'}`}>
                    {s.delta.startsWith('-') ? '↘' : '↗'} {s.delta}
                  </span>
                </div>
                <h3 className="fw-bold mb-1 text-dark">{s.value}</h3>
                <p className="text-muted mb-0 small">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-8">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-3">
                <div>
                  <h5 className="fw-bold mb-1">Incident Trend</h5>
                  <p className="text-muted small mb-0">
                    {period === 'week' ? '7 hari terakhir' : period === 'month' ? '30 hari terakhir' : '12 bulan terakhir'}
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  {(['week','month','year'] as Period[]).map(p => (
                    <button 
                      key={p} 
                      onClick={() => setPeriod(p)}
                      className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                      {p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Tahun'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mb-3">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="form-control form-control-sm" 
                  style={{ maxWidth: '160px' }} 
                />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="form-control form-control-sm" 
                  style={{ maxWidth: '160px' }} 
                />
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="btn btn-sm btn-outline-secondary">
                  Reset
                </button>
              </div>

              <div style={{ height: '320px' }}>
                <Line
                  data={{
                    labels: trend.labels,
                    datasets: [
                      { label: 'Open', data: trend.openData, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.08)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#6366f1' },
                      { label: 'Resolved', data: trend.resolvedData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.05)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#22c55e' },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } }, tooltip: { mode: 'index', intersect: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 5, font: { size: 11 } }, grid: { color: '#f1f5f9' } }, x: { ticks: { font: { size: 11 } }, grid: { display: false } } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-1">By Priority</h5>
              <p className="text-muted small mb-3">Distribusi incident aktif</p>
              
              <div style={{ height: '260px' }}>
                <Doughnut
                  data={{
                    labels: ['Critical','High','Medium','Low'],
                    datasets: [{ 
                      data: [priorityCount.Critical, priorityCount.High, priorityCount.Medium, priorityCount.Low], 
                      backgroundColor: ['#ef4444','#f97316','#eab308','#22c55e'], 
                      borderWidth: 0, 
                      hoverOffset: 6 
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } } },
                    cutout: '72%',
                  }}
                />
              </div>

              <div className="mt-4">
                {[
                  { label: 'Critical', color: '#ef4444', count: priorityCount.Critical },
                  { label: 'High',     color: '#f97316', count: priorityCount.High     },
                  { label: 'Medium',   color: '#eab308', count: priorityCount.Medium   },
                  { label: 'Low',      color: '#22c55e', count: priorityCount.Low      },
                ].map(({ label, color, count }) => (
                  <div key={label} className="d-flex justify-content-between align-items-center py-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="rounded-circle d-inline-block" style={{ width: '10px', height: '10px', background: color }}></span>
                      <span className="small">{label}</span>
                    </div>
                    <span className="fw-bold small">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-1">By Category</h5>
              <p className="text-muted small mb-3">Total incident bulan ini</p>
              
              {categoryCount.length === 0 ? (
                <div className="text-center text-muted py-5">Belum ada data</div>
              ) : (
                <div className="mb-4">
                  {categoryCount.map(([name, count]) => (
                    <div key={name} className="d-flex align-items-center gap-3 mb-3">
                      <span className="text-end" style={{ width: '110px', fontSize: '0.875rem' }}>{name}</span>
                      <div className="flex-grow-1 bg-light rounded-pill" style={{ height: '10px' }}>
                        <div 
                          className="bg-primary rounded-pill h-100" 
                          style={{ width: `${(count / maxCat) * 100}%` }}
                        ></div>
                      </div>
                      <span className="fw-bold small text-end" style={{ width: '30px' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <h6 className="fw-semibold mb-3">Report Type Statistics</h6>
                <div style={{ height: '280px' }}>
                  <Bar
                    data={{
                      labels: ['Incident','Request','Activity'],
                      datasets: [{ 
                        label: 'Total', 
                        data: [typeCount.Incident, typeCount.Request, typeCount.Activity], 
                        backgroundColor: [COLORS.incident, COLORS.request, COLORS.activity], 
                        borderRadius: 8, 
                        barThickness: 40 
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { 
                        y: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: '#f1f5f9' } }, 
                        x: { ticks: { font: { size: 12, weight: 600 } }, grid: { display: false } } 
                      },
                    }}
                  />
                </div>
                <div className="d-flex justify-content-center gap-4 mt-4">
                  {[
                    ['Incident', COLORS.incident, typeCount.Incident], 
                    ['Request', COLORS.request, typeCount.Request], 
                    ['Activity', COLORS.activity, typeCount.Activity]
                  ].map(([label, color, count]) => (
                    <div key={label} className="text-center">
                      <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
                        <span className="d-inline-block rounded" style={{ width: '16px', height: '16px', background: color }}></span>
                        <span className="small fw-semibold">{label}</span>
                      </div>
                      <span className="fw-bold" style={{ fontSize: '1.4rem' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold mb-1">Recent Incidents</h5>
                  <p className="text-muted small mb-0">Incident terbaru yang perlu perhatian</p>
                </div>
                <Link to="/reports" className="text-primary text-decoration-none small fw-semibold">
                  Lihat semua →
                </Link>
              </div>

              {loading ? (
                <div className="text-center text-muted py-5">Memuat...</div>
              ) : recentReports.length === 0 ? (
                <div className="text-center text-muted py-5">Belum ada incident</div>
              ) : (
                <div>
                  {recentReports.map((r, idx) => {
                    const sta = STATUS_MAP[r.status] ?? { label: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
                    const typeColor = r.type === 'Incident' ? COLORS.incident : r.type === 'Request' ? COLORS.request : COLORS.activity;
                    const assignee = r.assigned_to?.split(' ')?.[0] ?? 'Unassigned';
                    return (
                      <div 
                        key={r.uuid} 
                        onClick={() => navigate(`/reports/${r.uuid}`)}
                        className="py-3 border-bottom"
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="rounded-circle d-inline-block" style={{ width: '8px', height: '8px', background: typeColor, flexShrink: 0 }}></span>
                          <span className="fw-semibold small" style={{ color: typeColor }}>{r.incident}</span>
                          <span 
                            className="badge"
                            style={{ background: sta.bg, color: sta.color, fontSize: '0.7rem' }}
                          >
                            {sta.label}
                          </span>
                          {r.status === 1 && new Date(r.created_at) < new Date(Date.now() - 4 * 3600000) && (
                            <span className="badge bg-danger ms-auto">SLA Breach</span>
                          )}
                          <span className="text-muted small ms-auto">{assignee}</span>
                        </div>
                        <div className="ps-3 text-muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description?.substring(0, 80) || r.requestor}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;