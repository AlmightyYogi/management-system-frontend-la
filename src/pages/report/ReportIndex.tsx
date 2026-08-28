import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import type { Report } from '../../types/report';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { SEVERITY_COLOR, REPORT_STATUS_MAP, steps } from '../../types/report';
import Swal from 'sweetalert2';
import useAuthStore from '../../store/authStore';

const getSeverityDisplay = (severity: string) => {
  for (const [key, val] of Object.entries(SEVERITY_COLOR)) {
    if (severity?.includes(key.split(' - ')[1]?.split(' ')[0] ?? '___') || severity === key) return val;
  }
  if (severity?.toLowerCase().includes('emergency') || severity?.toLowerCase().includes('critical')) return { dot: '#dc2626', label: 'Critical', bg: '#fef2f2' };
  if (severity?.toLowerCase().includes('high') || severity?.toLowerCase().includes('major')) return { dot: '#d97706', label: 'High', bg: '#fffbeb' };
  if (severity?.toLowerCase().includes('medium') || severity?.toLowerCase().includes('partial')) return { dot: '#ca8a04', label: 'Medium', bg: '#fefce8' };
  return { dot: '#16a34a', label: 'Low', bg: '#f0fdf4' };
};

const getSLAInfo = (report: Report) => {
  if (report.type !== 'Incident') {
    return {
      label: 'No SLA',
      color: '#94a3b8',
      bg: '#f8fafc',
    };
  }
  
  const severity = (report.severity || '').toLowerCase();

  let targetDays = 10;
  if (severity.includes('emergency')) targetDays = 3;
  else if (severity.includes('critical')) targetDays = 5;
  else if (severity.includes('major')) targetDays = 6;
  else if (severity.includes('minor')) targetDays = 10;

  const createdAt = new Date(report.created_at);
  const closedAt = report.closed_at ? new Date(report.closed_at) : null;
  const now = new Date();

  const deadline = new Date(createdAt.getTime() + targetDays * 24 * 60 * 60 * 1000);

  if (report.status === 0 && closedAt) {
    const isMeet = closedAt <= deadline;
    return {
      label: isMeet ? 'Meet SLA' : 'Breach SLA',
      color: isMeet ? '#16a34a' : '#dc2626',
      bg: isMeet ? '#f0fdf4' : '#fef2f2',
    };
  }

  const remainingMs = deadline.getTime() - now.getTime();
  const isBreached = remainingMs <= 0;

  if (isBreached) {
    return {
      label: 'Breach SLA',
      color: '#dc2626',
      bg: '#fef2f2',
    };
  }

  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  let timerLabel = '';
  if (days > 0) timerLabel = `${days}d ${hours}h`;
  else if (hours > 0) timerLabel = `${hours}h ${minutes}m`;
  else timerLabel = `${minutes}m`;

  return {
    label: timerLabel,
    color: days <= 1 ? '#d97706' : '#2563eb',
    bg: days <= 1 ? '#fffbeb' : '#eff6ff',
  };
};

const SIDEBAR_W = 240;

const ReportIndex = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<number[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [exporting, setExporting]   = useState(false);
  const [exportStep, setExportStep] = useState(0);
  const [exportCount, setExportCount] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(15);

  const progressMap = [10, 35, 65, 85, 100];

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)    params.append('search',     search);
      if (startDate) params.append('start_date', startDate);
      if (endDate)   params.append('end_date',   endDate);
      params.append('page',     String(page));
      params.append('per_page', String(perPage));
      const res = await api.get(`/reports?${params.toString()}`);
      const payload = res.data?.data ?? res.data;
      setReports(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);
      setTotal(res.data?.data?.total ?? res.data?.total ?? 0);
    } catch {
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate, page, perPage]);

  const { user } = useAuthStore();
    const isAdmin = user?.role_id === 1;

    const handleDelete = async (e: React.MouseEvent, report: Report) => {
      e.stopPropagation();

      const result = await Swal.fire({
        title: 'Delete ticket?',
        html: `This <b>${report.incident}</b> ticket will deletely permanent`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel',
      });

      if (!result.isConfirmed) return;

      try {
        await api.delete(`/reports/${report.uuid}`);
        await Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: `Ticket ${report.incident} deletely successfully`,
          timer: 1500,
          showConfirmButton: false,
        });
        fetchReports();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: err.response?.data?.message || 'Failed to delete ticket',
        });
      }
    };

  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate, selectedType, selectedStatus, assigneeSearch]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const filtered = reports.filter(r => {
    const typeOk     = selectedType.length === 0 || selectedType.includes(r.type);
    const statusOk   = selectedStatus.length === 0 || selectedStatus.includes(r.status);
    const assigneeOk = !assigneeSearch || r.assigned_to?.toLowerCase().includes(assigneeSearch.toLowerCase());
    return typeOk && statusOk && assigneeOk;
  });

  const totalPages = Math.ceil(total / perPage);

  const toggle = <T,>(arr: T[], val: T, setter: (v: T[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const initials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  const avatarColor = (name?: string) => {
    const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'];
    const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
    return colors[idx];
  };

  const handleExport = async () => {
  setExporting(true);
  setExportStep(0);

  try {
    const params = new URLSearchParams();
    if (search)    params.append('search',     search);
    if (startDate) params.append('start_date', startDate);
    if (endDate)   params.append('end_date',   endDate);

    const countRes = await api.get(`/reports/export-count?${params.toString()}`);
    const count = countRes.data?.data?.count ?? 0;
    setExportCount(count);
    setExportStep(1);

    await new Promise(r => setTimeout(r, 800));
    setExportStep(2);

    await new Promise(r => setTimeout(r, 900));
    setExportStep(3);

    const exportUrl = `/api/reports/export?${params.toString()}`;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = exportUrl;

    const token = localStorage.getItem('token') ?? (() => {
      try { return JSON.parse(localStorage.getItem('auth-storage') ?? '{}')?.state?.token ?? ''; } catch { return ''; }
    })();

    const response = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;

    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename=([^;]+)/);
    link.download = match?.[1] ?? `Reports_${Date.now()}.xlsx`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    setExportStep(4);
      await new Promise(r => setTimeout(r, 1800));
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
      setExportStep(0);
      setExportCount(0);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', minHeight: '100%' }}>

      <div style={{
        width: SIDEBAR_W, minWidth: SIDEBAR_W, flexShrink: 0,
        background: '#fff', borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        position: 'sticky', top: 0,
        maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
      }}>
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-funnel" style={{ color: '#6366f1', fontSize: 15 }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Filter Options</span>
          </div>
        </div>

        <div style={{ padding: '12px 18px' }}>

          <FilterSection label="TYPE">
            {(['Incident','Request','Activity']).map(t => (
              <FilterCheckbox key={t} label={t}
                checked={selectedType.includes(t)}
                onChange={() => toggle(selectedType, t, setSelectedType)}
                dot={t === 'Incident' ? '#dc2626' : t === 'Request' ? '#2563eb' : '#16a34a'}
              />
            ))}
          </FilterSection>

          <FilterSection label="STATUS">
            {([
              { label: 'Open', value: 1, icon: '○' },
              { label: 'Restored', value: 2, icon: '◎' },
              { label: 'Closed', value: 0, icon: '◉' },
              { label: 'Done', value: 4, icon: '✓' },
              { label: 'Done Partial', value: 5, icon: '◑' },
              { label: 'Rollback', value: 6, icon: '↩' },
            ]).map(s => (
              <FilterCheckbox key={s.value} label={s.label}
                checked={selectedStatus.includes(s.value)}
                onChange={() => toggle(selectedStatus, s.value, setSelectedStatus)}
              />
            ))}
          </FilterSection>

          <FilterSection label="ASSIGNEE">
            <input type="text" style={{
              width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0',
              borderRadius: 7, fontSize: 12, outline: 'none',
            }} placeholder="Cari assignee..."
              value={assigneeSearch}
              onChange={e => setAssigneeSearch(e.target.value)} />
          </FilterSection>

          <FilterSection label="CREATED DATE">
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>From</div>
              <input type="date" style={{
                width: '100%', padding: '5px 8px', border: '1px solid #e2e8f0',
                borderRadius: 7, fontSize: 12, outline: 'none',
              }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>To</div>
              <input type="date" style={{
                width: '100%', padding: '5px 8px', border: '1px solid #e2e8f0',
                borderRadius: 7, fontSize: 12, outline: 'none',
              }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </FilterSection>

          {(selectedType.length > 0 || selectedStatus.length > 0 || assigneeSearch || startDate || endDate) && (
            <button onClick={() => {
              setSelectedType([]); setSelectedStatus([]);
              setAssigneeSearch(''); setStartDate(''); setEndDate('');
            }} style={{
              width: '100%', padding: '7px', background: '#f8fafc',
              border: '1px solid #e2e8f0', borderRadius: 7,
              fontSize: 12, color: '#64748b', cursor: 'pointer', marginTop: 4,
            }}>
              <i className="bi bi-x me-1" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h4 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2, fontSize: 20 }}>
              Ticket Management
            </h4>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              {total > 0 ? `${((page - 1) * perPage) + 1}–${Math.min(page * perPage, total)} dari ${total} tickets` : `${filtered.length} tickets`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchReports} style={btnOutline}>
              <i className="bi bi-arrow-clockwise me-1" /> Refresh
            </button>
            {exporting && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
                zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  background: '#fff', borderRadius: 16, padding: '36px 40px',
                  minWidth: 360, maxWidth: 420, textAlign: 'center',
                  boxShadow: '0 20px 60px rgba(0,0,0,.3)',
                }}>
                  <div className="spinner-border text-success mb-3" style={{ width: 48, height: 48 }} role="status" />
                  <h5 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                    {exportStep === 0 ? 'Mempersiapkan Export' :
                    exportStep === 1 ? 'Memproses Data' :
                    exportStep === 2 ? 'Membuat File Excel' :
                    exportStep === 3 ? 'Mengunduh File' : 'Selesai!'}
                  </h5>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                    {exportStep === 1 ? `Ditemukan ${exportCount.toLocaleString('id-ID')} data...` :
                    exportStep === 2 ? 'Sedang menyusun format dan styling...' :
                    exportStep === 3 ? 'File sedang diunduh...' :
                    exportStep === 4 ? 'File berhasil diunduh' : 'Sedang menghitung jumlah data...'}
                  </p>

                  {/* Progress bar */}
                  <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      background: exportStep === 4 ? '#22c55e' : '#6366f1',
                      width: `${progressMap[Math.min(exportStep, 4)]}%`,
                      transition: 'width .5s ease',
                    }} />
                  </div>

                  {/* Step badges */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {steps.map((s, i) => (
                      <span key={i} style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                        background: i < exportStep ? '#dcfce7' : i === exportStep ? '#eff0ff' : '#f1f5f9',
                        color: i < exportStep ? '#15803d' : i === exportStep ? '#6366f1' : '#94a3b8',
                        border: `1px solid ${i < exportStep ? '#86efac' : i === exportStep ? '#c7d2fe' : '#e2e8f0'}`,
                      }}>
                        <i className={`bi ${s.icon} me-1`} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <button onClick={handleExport} style={btnOutline} disabled={exporting}>
              <i className="bi bi-file-earmark-excel me-1" style={{ color: '#16a34a' }} /> Export
            </button>
            <Link to="/reports/create" style={{
              ...btnPrimary,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
            }}>
              <i className="bi bi-plus-lg me-1" /> New Ticket
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <i className="bi bi-search" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', fontSize: 14,
            }} />
            <input type="text" placeholder="Cari ticket berdasarkan nomor, judul, atau assignee..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px 9px 36px',
                border: '1px solid #e2e8f0', borderRadius: 9,
                fontSize: 13, outline: 'none', color: '#1e293b',
              }} />
          </div>
          <button style={{ ...btnPrimary, padding: '9px 18px' }}>
            <i className="bi bi-search me-1" /> Search
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
          {loading ? <LoadingSpinner message="Memuat data ticket..." /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['CODE','TITLE','PRIORITY','STATUS','APP','ASSIGNEE TO','CREATED','SLA','ACTION'].map(h => (
                      <th key={h} style={{
                        padding: '11px 14px', fontSize: 11, fontWeight: 600,
                        color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px',
                        whiteSpace: 'nowrap', textAlign: 'left',
                      }}>
                        {h}{h && h !== '' && <i className="bi bi-arrow-down-up ms-1" style={{ opacity: .5, fontSize: 9 }} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                        <i className="bi bi-inbox" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                        Tidak ada data yang sesuai dengan filter
                      </td>
                    </tr>
                  ) : filtered.map((r, idx) => {
                    const sev = getSeverityDisplay(r.severity);
                    const sta = REPORT_STATUS_MAP[r.status] ?? { label: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
                    const typeColor = r.type === 'Incident' ? '#dc2626' : r.type === 'Request' ? '#2563eb' : '#16a34a';
                    const created = new Date(r.created_at);
                    return (
                      <tr key={r.uuid}
                        onClick={(e) => {
                          const url = `/reports/${r.uuid}`;
                          if (e.ctrlKey || e.metaKey) {
                            window.open(url, '_blank', 'noopener,noreferrer');
                            return;
                          }
                          navigate(url);
                        }}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background .12s',
                          background: idx % 2 === 0 ? '#fff' : '#fafafa',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
                      >
                        <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                          <Link
                            to={`/reports/${r.uuid}`}
                            onClick={e => e.stopPropagation()}
                            style={{ color: typeColor, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
                          >
                            {r.incident}
                          </Link>
                        </td>
                        <td style={{ padding: '13px 14px', maxWidth: 300 }}>
                          <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.requestor}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
                            {r.description?.substring(0, 70)}{(r.description?.length ?? 0) > 70 ? '...' : ''}
                          </div>
                        </td>
                        <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                            background: sev.bg, color: sev.dot,
                          }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: sev.dot, flexShrink: 0 }} />
                            {sev.label}
                          </span>
                        </td>
                        <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                            background: sta.bg, color: sta.color,
                            border: `1px solid ${sta.color}33`,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sta.color, flexShrink: 0 }} />
                            {sta.label}
                          </span>
                        </td>
                        <td style={{ padding: '13px 14px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {r.apps}
                        </td>
                        <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                          {r.assigned_to ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: avatarColor(r.assigned_to),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                              }}>
                                {initials(r.assigned_to)}
                              </div>
                              <span style={{ fontSize: 13, color: '#1e293b' }}>{r.assigned_to}</span>
                            </div>
                          ) : <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>}
                        </td>
                        <td style={{ padding: '13px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {created.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                          {created.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const sla = getSLAInfo(r);
                            return (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 9px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 500,
                                background: sla.bg,
                                color: sla.color,
                              }}>
                                {sla.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td
                          style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {isAdmin && (
                              <button
                                type="button"
                                title="Delete ticket"
                                onClick={e => handleDelete(e, r)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#df1f1f',
                                  padding: '4px 6px',
                                  borderRadius: 6,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                              >
                                <i className="bi bi-trash3" />
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', borderTop: '1px solid #f1f5f9',
                  }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>
                      Menampilkan {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} dari {total} data
                    </span>

                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                          padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0',
                          background: page === 1 ? '#f8fafc' : '#fff',
                          color: page === 1 ? '#d1d5db' : '#374151',
                          cursor: page === 1 ? 'not-allowed' : 'pointer',
                          fontSize: 13, fontWeight: 500,
                        }}
                      >
                        ← Prev
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .reduce<(number | string)[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) =>
                          p === '...' ? (
                            <span key={`dot-${idx}`} style={{ padding: '6px 4px', color: '#94a3b8', fontSize: 13 }}>···</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setPage(p as number)}
                              style={{
                                padding: '6px 11px', borderRadius: 7,
                                border: `1px solid ${page === p ? '#6366f1' : '#e2e8f0'}`,
                                background: page === p ? '#6366f1' : '#fff',
                                color: page === p ? '#fff' : '#374151',
                                cursor: 'pointer', fontSize: 13, fontWeight: page === p ? 700 : 400,
                                minWidth: 34, textAlign: 'center',
                              }}
                            >
                              {p}
                            </button>
                          )
                        )
                      }

                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={{
                          padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0',
                          background: page === totalPages ? '#f8fafc' : '#fff',
                          color: page === totalPages ? '#d1d5db' : '#374151',
                          cursor: page === totalPages ? 'not-allowed' : 'pointer',
                          fontSize: 13, fontWeight: 500,
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FilterSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px' }}>{label}</span>
      <i className="bi bi-chevron-down" style={{ fontSize: 10, color: '#94a3b8' }} />
    </div>
    {children}
  </div>
);

const FilterCheckbox = ({ label, checked, onChange, dot }: { label: string; checked: boolean; onChange: () => void; dot?: string }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }} />
    {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
    {label}
  </label>
);

const btnOutline: React.CSSProperties = {
  padding: '7px 14px', background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#475569',
  display: 'inline-flex', alignItems: 'center', fontWeight: 500,
  transition: 'all .15s',
};

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', background: '#6366f1', border: 'none',
  borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#fff',
  fontWeight: 500, display: 'inline-flex', alignItems: 'center',
};

export default ReportIndex;