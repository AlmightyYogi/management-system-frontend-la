import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppRow, TicketRow, ReportMode, Report, RangeSummary } from '../../types/report';
import { DEFAULT_APPS } from '../../types/report';
import api from '../../services/api';

const TEAL    = '#00A99D';
const RED     = '#ED1C24';
const MAGENTA = '#EC008C';
const YELLOW  = '#FFCD00';
const INK     = '#1a1a1a';
const INK_SOFT = '#5c5c5c';
const LINE    = '#e5e5e5';
const BG_SOFT = '#fafafa';
const BRAND_CYCLE = [TEAL, RED, MAGENTA, YELLOW];

const uid = () => Math.random().toString(36).slice(2, 9);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

const isWithinRange = (createdAt: string, from: string, to: string) => {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T23:59:59');
  return created >= start && created <= end;
};

async function fetchRangeSummary(from: string, to: string): Promise<RangeSummary> {
  if (!from || !to) return { incidents: 0, requests: 0, activities: 0, ticketNos: [] };
  const params = new URLSearchParams();
  params.append('start_date', from);
  params.append('end_date', to);
  const res = await api.get(`/reports?${params.toString()}`);
  const payload = res.data?.data ?? res.data;
  const list: Report[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

  const inRange = list.filter(r => isWithinRange(r.created_at, from, to));

  const incidentsList = inRange.filter(r => r.type === 'Incident');
  const requestsList = inRange.filter(r => r.type === 'Request');
  const activitiesList = inRange.filter(r => r.type === 'Activity');

  return {
    incidents: incidentsList.length,
    requests: requestsList.length,
    activities: activitiesList.length,
    ticketNos: incidentsList.map(r => r.incident).filter(Boolean),
  };
}

function SectionCard({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8,
      marginBottom: 20, position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
    }}>
      <div style={{
        height: 3, background: `linear-gradient(90deg, ${TEAL} 0%, ${TEAL} 25%, ${RED} 25%, ${RED} 50%, ${MAGENTA} 50%, ${MAGENTA} 75%, ${YELLOW} 75%, ${YELLOW} 100%)`,
      }} />
      <div style={{ padding: '20px 24px' }}>
        <h2 style={{
          fontSize: 16, fontWeight: 700, color: INK, margin: '0 0 16px',
          paddingBottom: 10, borderBottom: `2px solid ${TEAL}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: MAGENTA, flexShrink: 0, display: 'inline-block' }} />
          {num}. {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: INK_SOFT, marginBottom: 5, marginTop: 12, fontWeight: 600 }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: `1px solid #d5d5d5`,
  borderRadius: 5, fontSize: 14, color: INK, fontFamily: 'Calibri, Arial, sans-serif',
  outline: 'none', boxSizing: 'border-box', background: '#fff',
  transition: 'border-color .15s, box-shadow .15s',
};

const readonlyStyle: React.CSSProperties = {
  ...inputStyle, background: '#e6f6f7', color: TEAL, fontWeight: 700,
  cursor: 'not-allowed', borderColor: TEAL,
};

const dateInputStyle: React.CSSProperties = {
  ...inputStyle, fontSize: 16, fontWeight: 700, color: TEAL,
  background: '#e6f6f7', border: `1.5px solid ${TEAL}`, padding: '10px 12px',
};

function PercentInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', border: '1px solid #d5d5d5',
      borderRadius: 5, overflow: 'hidden', background: '#fff',
      transition: 'border-color .15s',
    }}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        style={{
          border: 'none', outline: 'none', flex: 1, minWidth: 0,
          padding: '9px 6px 9px 11px', fontSize: 14, color: INK,
          fontFamily: 'Calibri, Arial, sans-serif', textAlign: 'center',
        }}
        onFocus={e => (e.target.parentElement!.style.borderColor = MAGENTA)}
        onBlur={e => (e.target.parentElement!.style.borderColor = '#d5d5d5')}
      />
      <span style={{
        padding: '0 9px', color: '#9ca3af', fontWeight: 700, fontSize: 13,
        borderLeft: '1px solid #eee', display: 'flex', alignItems: 'center',
        background: '#fafafa', flexShrink: 0,
      }}>%</span>
    </div>
  );
}

const ReportDaily = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState<ReportMode>('daily');

  const [date, setDate]     = useState(todayStr());
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo]   = useState(todayStr());
  const [divisi, setDivisi]   = useState('Digital Application Operation');

  const [kpi2, setKpi2] = useState('0');
  const [kpi3, setKpi3] = useState('0');
  const [kpi4, setKpi4] = useState('0');
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState('');

  const [slaTarget, setSlaTarget] = useState('99.99');
  const [apps, setApps] = useState<AppRow[]>(() =>
    DEFAULT_APPS.map(a => ({ ...a, id: uid(), avail: a.avail.replace('%', '') }))
  );

  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const [updates, setUpdates] = useState('');
  const [plans, setPlans]     = useState('');

  const [copyStatus, setCopyStatus] = useState('');

  const slaNum = parseFloat(slaTarget) || 99.99;

  useEffect(() => {
    let cancelled = false;
    const from = mode === 'daily' ? date : dateFrom;
    const to = mode === 'daily' ? date : dateTo;

    if (!from || !to) return;

    setKpiLoading(true);
    setKpiError('');

    fetchRangeSummary(from, to)
      .then(rec => {
        if (cancelled) return;
        setKpi2(String(rec.incidents));
        setKpi3(String(rec.requests));
        setKpi4(String(rec.activities));
        setTickets(rec.ticketNos.map(no => ({ id: uid(), ticketNo: no, content: '' })));
      })
      .catch(() => {
        if (cancelled) return;
        setKpiError('Gagal mengambil data dari server.');
        setKpi2('0');
        setKpi3('0');
        setKpi4('0');
        setTickets([]);
      })
      .finally(() => {
        if (!cancelled) setKpiLoading(false);
      });

    return () => { cancelled = true; };
  }, [mode, date, dateFrom, dateTo]);

  const handleSlaInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (!digits) { setSlaTarget('0.00'); return; }
    setSlaTarget((parseInt(digits, 10) / 100).toFixed(2));
  };

  const computeStatus = (avail: string) => {
    const num = parseFloat(avail.replace('%', '')) || 0;
    return num >= slaNum
      ? { label: 'Meet SLA',   color: '#2E7D32' }
      : { label: 'Breach SLA', color: '#C0392B' };
  };

  const overallAvail = (() => {
    const valid = apps.map(a => parseFloat(a.avail.replace('%', ''))).filter(n => !isNaN(n));
    if (!valid.length) return '0.00%';
    return (valid.reduce((s, n) => s + n, 0) / valid.length).toFixed(2) + '%';
  })();

  const dateLabel = mode === 'daily'
    ? fmtDate(date)
    : `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`;

  const reportTitle = mode === 'daily' ? 'DAILY OPERATION REPORT' : 'WEEKLY OPERATION REPORT';

  const addApp = () => setApps(p => [...p, { id: uid(), name: '', avail: '100' }]);
  const removeApp = (id: string) => setApps(p => p.filter(a => a.id !== id));
  const updateApp = (id: string, field: 'name' | 'avail', val: string) =>
    setApps(p => p.map(a => a.id === id ? { ...a, [field]: val } : a));

  const addTicket = () => setTickets(p => [...p, { id: uid(), ticketNo: '', content: '' }]);
  const removeTicket = (id: string) => setTickets(p => p.filter(t => t.id !== id));
  const updateTicket = (id: string, field: 'ticketNo' | 'content', val: string) =>
    setTickets(p => p.map(t => t.id === id ? { ...t, [field]: val } : t));

  const buildHtml = useCallback(() => {
    const brandStrip = `
<table width="700" cellpadding="0" cellspacing="0" border="0"><tr>
  <td width="25%" height="4" style="background-color:${TEAL};line-height:4px;font-size:1px;">&nbsp;</td>
  <td width="25%" height="4" style="background-color:${RED};line-height:4px;font-size:1px;">&nbsp;</td>
  <td width="25%" height="4" style="background-color:${MAGENTA};line-height:4px;font-size:1px;">&nbsp;</td>
  <td width="25%" height="4" style="background-color:${YELLOW};line-height:4px;font-size:1px;">&nbsp;</td>
</tr></table>`;

    const kpis = [
      [overallAvail, 'Service Availability'],
      [kpi2, 'Number of Incidents'],
      [kpi3, 'Number of Requests'],
      [kpi4, 'Number of Activities'],
    ];

    const appHtml = apps.map(a => {
      const st = computeStatus(a.avail);
      return `<tr>
<td style="padding:10px 12px;border-bottom:1px solid #eee;color:${INK};font-size:14px;">${a.name || '-'}</td>
<td style="padding:10px 12px;border-bottom:1px solid #eee;color:${INK};font-size:14px;">${a.avail || '0'}%</td>
<td style="padding:10px 12px;border-bottom:1px solid #eee;color:${st.color};font-weight:bold;font-size:14px;">${st.label}</td></tr>`;
    }).join('');

    const ticketHtml = tickets.filter(t => t.ticketNo || t.content).map(t => `
<div style="margin-bottom:16px;padding:12px 16px;background:#fdf5fa;border:1px solid #f3d9ec;border-left:4px solid ${MAGENTA};border-radius:0 6px 6px 0;">
  <strong style="color:${INK};font-size:15px;">${t.ticketNo || '(No Ticket Number)'}</strong><br>
  <span style="color:#3a3a3a;font-size:14px;line-height:1.5;">${t.content.replace(/\n/g, '<br>')}</span>
</div>`).join('');

    const linesToBullets = (txt: string) =>
      txt.split('\n').filter(l => l.trim()).map(l => `&#8226; ${l.trim()}`).join('<br>');

    const updateHtml = linesToBullets(updates);
    const planHtml   = linesToBullets(plans);

    return `
<table width="700" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border:1px solid #e5e5e5;font-family:Calibri,Arial,sans-serif;font-size:14px;">
  <tr><td>${brandStrip}</td></tr>
  <tr><td style="background:#fff;padding:24px 25px;border-bottom:1px solid #eee;">
    <table width="100%"><tr>
      <td valign="top">
        <div style="color:${INK};font-size:23px;font-weight:bold;letter-spacing:0.3px;">${reportTitle}</div>
        <div style="color:#777;font-size:14px;margin-top:4px;">${divisi}</div>
      </td>
      <td align="right" valign="top">
        <div style="margin-bottom:8px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${TEAL};margin-right:3px;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${RED};margin-right:3px;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${MAGENTA};margin-right:3px;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${YELLOW};"></span>
        </div>
        <table cellpadding="0" cellspacing="0" border="0" style="margin-left:auto;">
          <tr><td style="background:${TEAL};border-radius:4px;padding:7px 16px;">
            <span style="color:#fff;font-size:15px;font-weight:bold;">${dateLabel}</span>
          </td></tr>
        </table>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:20px 25px 10px;">
    <div style="font-size:15px;font-weight:bold;color:${INK};margin-bottom:14px;padding-bottom:7px;border-bottom:2px solid ${MAGENTA};">Executive Summary</div>
    <table width="100%"><tr>${kpis.map((k, i) => `
      <td width="25%" align="center" style="border:1px solid #eee;border-top:3px solid ${BRAND_CYCLE[i]};padding:14px 6px;">
        <div style="font-size:23px;font-weight:bold;color:${INK};">${k[0]}</div>
        <div style="font-size:12px;color:#777;margin-top:3px;">${k[1]}</div>
      </td>`).join('')}</tr></table>
  </td></tr>

  <tr><td style="padding:20px 25px 10px;">
    <div style="font-size:15px;font-weight:bold;color:${INK};margin-bottom:14px;padding-bottom:7px;border-bottom:2px solid ${MAGENTA};">Availability per Application</div>
    <table width="100%" cellpadding="10" style="font-size:14px;border-collapse:collapse;border:1px solid #eee;">
      <tr>
        <td style="background:${TEAL};color:#fff;padding:10px 12px;font-weight:bold;">Application</td>
        <td style="background:${TEAL};color:#fff;padding:10px 12px;font-weight:bold;">Availability</td>
        <td style="background:${TEAL};color:#fff;padding:10px 12px;font-weight:bold;">Status</td>
      </tr>
      ${appHtml}
    </table>
  </td></tr>

  ${ticketHtml ? `<tr><td style="padding:20px 25px 10px;">
    <div style="font-size:15px;font-weight:bold;color:${INK};margin-bottom:14px;padding-bottom:7px;border-bottom:2px solid ${MAGENTA};">Ticket Details</div>
    ${ticketHtml}
  </td></tr>` : ''}

  ${updates.trim() ? `<tr><td style="padding:20px 25px 10px;">
    <div style="font-size:15px;font-weight:bold;color:${INK};margin-bottom:12px;padding-bottom:7px;border-bottom:2px solid ${MAGENTA};">Update / Achievement</div>
    <div style="font-size:14px;color:#3a3a3a;line-height:1.6;">${updateHtml}</div>
  </td></tr>` : ''}

  <tr><td style="padding:20px 25px 24px;">
    <div style="font-size:15px;font-weight:bold;color:${INK};margin-bottom:12px;padding-bottom:7px;border-bottom:2px solid ${MAGENTA};">Next Plan</div>
    <div style="font-size:14px;color:#3a3a3a;line-height:1.6;">${planHtml}</div>
  </td></tr>

  <tr><td align="center" style="padding:16px 25px;font-size:12px;color:#999;">
    ${divisi} &middot; ${reportTitle} &middot; ${dateLabel}
  </td></tr>
  <tr><td>${brandStrip}</td></tr>
</table>`;
  }, [apps, tickets, updates, plans, kpi2, kpi3, kpi4, divisi, dateLabel, overallAvail, slaNum, reportTitle]);

  const handleOpenNewTab = () => {
    const html = buildHtml();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${reportTitle}</title></head>
    <body style="margin:0;padding:20px;background:#f2f2f2;">${html}</body></html>`);
    w.document.close();
  };

  const handleCopy = () => {
    const html = buildHtml();
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:absolute;left:-9999px;';
    tmp.innerHTML = html;
    document.body.appendChild(tmp);
    const range = document.createRange();
    range.selectNode(tmp);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    try {
      document.execCommand('copy');
      setCopyStatus('✔ Copied to clipboard!');
    } catch {
      setCopyStatus('Copy failed.');
    }
    sel?.removeAllRanges();
    document.body.removeChild(tmp);
    setTimeout(() => setCopyStatus(''), 4000);
  };

  return (
    <div style={{ fontFamily: 'Calibri, Arial, sans-serif', maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: `1px solid ${LINE}`, cursor: 'pointer',
          color: '#6b7280', padding: '6px 10px', borderRadius: 8, fontSize: 15,
        }}>←</button>
        <div>
          <h5 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Operation Report Generator
          </h5>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            Buat laporan harian atau mingguan operasional B2B
          </p>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 4, gap: 4 }}>
          {(['daily', 'weekly'] as ReportMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '6px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: mode === m ? TEAL : 'transparent',
              color: mode === m ? '#fff' : '#64748b',
              transition: 'all .15s',
            }}>
              {m === 'daily' ? '📅 Daily' : '📆 Weekly'}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start',
        height: 'calc(100vh - 140px)', minHeight: 480,
      }}>

        <div style={{ height: '100%', overflowY: 'auto', paddingRight: 6 }}>

          <SectionCard num={1} title="General Information">
            <div style={{ display: 'grid', gridTemplateColumns: mode === 'daily' ? '1fr 1fr' : '1fr', gap: 12 }}>
              {mode === 'daily' ? (
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    style={dateInputStyle}
                    onFocus={e => { e.target.style.borderColor = MAGENTA; e.target.style.color = INK; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = TEAL; e.target.style.color = TEAL; e.target.style.background = '#e6f6f7'; }}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <FieldLabel>From Date</FieldLabel>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={dateInputStyle}
                      onFocus={e => { e.target.style.borderColor = MAGENTA; e.target.style.color = INK; e.target.style.background = '#fff'; }}
                      onBlur={e => { e.target.style.borderColor = TEAL; e.target.style.color = TEAL; e.target.style.background = '#e6f6f7'; }}
                    />
                  </div>
                  <div>
                    <FieldLabel>To Date</FieldLabel>
                    <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} style={dateInputStyle}
                      onFocus={e => { e.target.style.borderColor = MAGENTA; e.target.style.color = INK; e.target.style.background = '#fff'; }}
                      onBlur={e => { e.target.style.borderColor = TEAL; e.target.style.color = TEAL; e.target.style.background = '#e6f6f7'; }}
                    />
                  </div>
                </div>
              )}
              <div>
                <FieldLabel>Division / Sub Title</FieldLabel>
                <input type="text" value={divisi} onChange={e => setDivisi(e.target.value)} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = MAGENTA)}
                  onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard num={2} title="Executive Summary">
            <div style={{ fontSize: 12, color: kpiError ? '#C0392B' : '#999', marginBottom: 4 }}>
              {kpiLoading
                ? 'Mengambil data Incidents/Requests/Activities dari server...'
                : kpiError
                  ? kpiError
                  : 'Incidents, Requests, dan Activities dihitung otomatis dari data aktual sesuai tanggal yang dipilih (bisa diedit manual).'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              <div>
                <FieldLabel>Service Availability</FieldLabel>
                <input readOnly value={overallAvail} style={readonlyStyle} />
              </div>
              <div>
                <FieldLabel>Incidents</FieldLabel>
                <input type="text" value={kpi2} onChange={e => setKpi2(e.target.value)} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = MAGENTA)}
                  onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
                />
              </div>
              <div>
                <FieldLabel>Requests</FieldLabel>
                <input type="text" value={kpi3} onChange={e => setKpi3(e.target.value)} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = MAGENTA)}
                  onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
                />
              </div>
              <div>
                <FieldLabel>Activities</FieldLabel>
                <input type="text" value={kpi4} onChange={e => setKpi4(e.target.value)} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = MAGENTA)}
                  onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard num={3} title="Availability per Application">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div>
                <FieldLabel>SLA Target</FieldLabel>
                <div style={{ position: 'relative', maxWidth: 120 }}>
                  <input type="text" inputMode="numeric" value={slaTarget}
                    onChange={e => handleSlaInput(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 26 }}
                    onFocus={e => (e.target.style.borderColor = MAGENTA)}
                    onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
                  />
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    color: '#9ca3af', fontSize: 13, fontWeight: 700, pointerEvents: 'none',
                  }}>%</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 20 }}>
                Cukup ketik angka, titik desimal otomatis (mis. ketik 9999 → 99.99).
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 40px', gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>APPLICATION</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>AVAILABILITY</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>STATUS</div>
              <div />
            </div>

            {apps.map(app => {
              const st = computeStatus(app.avail);
              return (
                <div key={app.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 110px 90px 40px',
                  gap: 8, alignItems: 'center', marginBottom: 8,
                  padding: '8px 0', borderBottom: `1px solid ${LINE}`,
                }}>
                  <input type="text" value={app.name} placeholder="Application Name"
                    onChange={e => updateApp(app.id, 'name', e.target.value)}
                    style={{ ...inputStyle, marginBottom: 0 }}
                    onFocus={e => (e.target.style.borderColor = MAGENTA)}
                    onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
                  />
                  <PercentInput
                    value={app.avail}
                    placeholder="100"
                    onChange={v => updateApp(app.id, 'avail', v)}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{st.label}</span>
                  <button onClick={() => removeApp(app.id)} style={{
                    background: RED, color: '#fff', border: 'none', borderRadius: 5,
                    cursor: 'pointer', padding: '5px 8px', fontSize: 12, fontWeight: 700,
                  }}>✕</button>
                </div>
              );
            })}

            <button onClick={addApp} style={{
              marginTop: 8, background: TEAL, color: '#fff', border: 'none',
              padding: '7px 14px', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}>+ Add Application</button>
          </SectionCard>

          <SectionCard num={4} title="Ticket Details">
            <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              Nomor tiket terisi otomatis dari data Incident aktual pada tanggal terpilih — detail tiket dikosongkan untuk diisi manual.
            </div>

            {tickets.map(t => (
              <div key={t.id} style={{
                marginBottom: 14, border: `1px solid ${LINE}`,
                borderLeft: `4px solid ${MAGENTA}`, borderRadius: '0 6px 6px 0',
                padding: '12px 14px', background: BG_SOFT,
              }}>
                <FieldLabel>Ticket Number</FieldLabel>
                <input type="text" value={t.ticketNo} placeholder="e.g. INC0317229"
                  onChange={e => updateTicket(t.id, 'ticketNo', e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = MAGENTA)}
                  onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
                />
                <FieldLabel>Ticket Details</FieldLabel>
                <textarea value={t.content}
                  placeholder={`Write the full ticket details here...\nExample:\nApplication: SARAS - Bank DKI Jatiasih\nProblem: Alarm not showing on the menu\nAction & Status: ...`}
                  onChange={e => updateTicket(t.id, 'content', e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 95, lineHeight: 1.5 }}
                  onFocus={e => (e.target.style.borderColor = MAGENTA)}
                  onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
                />
                <button onClick={() => removeTicket(t.id)} style={{
                  marginTop: 8, background: RED, color: '#fff', border: 'none',
                  padding: '6px 12px', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                }}>Delete Ticket</button>
              </div>
            ))}

            <button onClick={addTicket} style={{
              background: TEAL, color: '#fff', border: 'none',
              padding: '7px 14px', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}>+ Add Ticket</button>
          </SectionCard>

          <SectionCard num={5} title="Update / Achievement">
            <FieldLabel>One item per line</FieldLabel>
            <textarea value={updates} onChange={e => setUpdates(e.target.value)} rows={5}
              placeholder={`Example:\nAll applications are running normally\nSARAS server maintenance completed\nDaily database backup completed successfully`}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 95, lineHeight: 1.5 }}
              onFocus={e => (e.target.style.borderColor = MAGENTA)}
              onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
            />
          </SectionCard>

          <SectionCard num={6} title="Next Plan">
            <FieldLabel>One item per line</FieldLabel>
            <textarea value={plans} onChange={e => setPlans(e.target.value)} rows={5}
              placeholder={`Example:\nPerform routine checks on all applications\nFollow up on open tickets\nPrepare for scheduled server patching tonight`}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 95, lineHeight: 1.5 }}
              onFocus={e => (e.target.style.borderColor = MAGENTA)}
              onBlur={e => (e.target.style.borderColor = '#d5d5d5')}
            />
          </SectionCard>

          <div style={{
            background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8,
            padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center',
            flexWrap: 'wrap', marginBottom: 20,
          }}>
            <button onClick={handleOpenNewTab} style={{
              background: TEAL, color: '#fff', border: 'none', padding: '11px 22px',
              borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              🔄 Generate Report (New Tab)
            </button>
            <button onClick={handleCopy} style={{
              background: `linear-gradient(90deg, ${RED}, ${MAGENTA})`,
              color: '#fff', border: 'none', padding: '11px 22px',
              borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              📋 Copy to Clipboard
            </button>
            {copyStatus && (
              <span style={{ fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>{copyStatus}</span>
            )}
          </div>
        </div>

        <div style={{ height: '100%', overflowY: 'auto' }}>
          <div style={{
            background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 20px', borderBottom: `1px solid ${LINE}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: BG_SOFT, position: 'sticky', top: 0, zIndex: 1,
            }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                📄 Live Preview
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Otomatis diperbarui
              </span>
            </div>

            <div style={{ padding: 16 }}>
              <Preview
                reportTitle={reportTitle}
                divisi={divisi}
                dateLabel={dateLabel}
                overallAvail={overallAvail}
                kpi2={kpi2} kpi3={kpi3} kpi4={kpi4}
                apps={apps}
                computeStatus={computeStatus}
                tickets={tickets}
                updates={updates}
                plans={plans}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

interface PreviewProps {
  reportTitle: string;
  divisi: string;
  dateLabel: string;
  overallAvail: string;
  kpi2: string; kpi3: string; kpi4: string;
  apps: AppRow[];
  computeStatus: (avail: string) => { label: string; color: string };
  tickets: TicketRow[];
  updates: string;
  plans: string;
}

function Preview({ reportTitle, divisi, dateLabel, overallAvail, kpi2, kpi3, kpi4, apps, computeStatus, tickets, updates, plans }: PreviewProps) {
  const kpis = [
    { val: overallAvail, label: 'Service Availability', color: TEAL },
    { val: kpi2,         label: 'Incidents',            color: RED },
    { val: kpi3,         label: 'Requests',             color: MAGENTA },
    { val: kpi4,         label: 'Activities',           color: YELLOW },
  ];

  const linesToBullets = (txt: string) =>
    txt.split('\n').filter(l => l.trim()).map((l, i) => (
      <div key={i} style={{ fontSize: 13, color: '#3a3a3a', lineHeight: 1.7 }}>• {l.trim()}</div>
    ));

  const sectionTitle = (label: string) => (
    <div style={{
      fontSize: 14, fontWeight: 700, color: INK, marginBottom: 12,
      paddingBottom: 7, borderBottom: `2px solid ${MAGENTA}`,
    }}>{label}</div>
  );

  return (
    <div style={{ transform: 'scale(0.78)', transformOrigin: 'top left', width: '128%' }}>
      <div style={{ height: 4, display: 'flex' }}>
        {[TEAL, RED, MAGENTA, YELLOW].map(c => (
          <div key={c} style={{ flex: 1, background: c }} />
        ))}
      </div>

      <div style={{ background: '#fff', padding: '20px 24px', borderBottom: `1px solid #eee`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>{reportTitle}</div>
          <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>{divisi}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 6, display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
            {[TEAL, RED, MAGENTA, YELLOW].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ background: TEAL, color: '#fff', borderRadius: 4, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>
            {dateLabel}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 24px 8px' }}>
        {sectionTitle('Executive Summary')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ border: '1px solid #eee', borderTop: `3px solid ${k.color}`, padding: '12px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: INK }}>{k.val}</div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 24px 8px' }}>
        {sectionTitle('Availability per Application')}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Application', 'Availability', 'Status'].map(h => (
                <th key={h} style={{ background: TEAL, color: '#fff', padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apps.map(app => {
              const st = computeStatus(app.avail);
              return (
                <tr key={app.id}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', color: INK, fontSize: 13 }}>{app.name || '-'}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', color: INK, fontSize: 13 }}>{app.avail || '0'}%</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', color: st.color, fontWeight: 700, fontSize: 13 }}>{st.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tickets.filter(t => t.ticketNo || t.content).length > 0 && (
        <div style={{ padding: '12px 24px 8px' }}>
          {sectionTitle('Ticket Details')}
          {tickets.filter(t => t.ticketNo || t.content).map(t => (
            <div key={t.id} style={{
              marginBottom: 12, padding: '10px 14px',
              background: '#fdf5fa', border: `1px solid #f3d9ec`,
              borderLeft: `4px solid ${MAGENTA}`, borderRadius: '0 6px 6px 0',
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: INK, marginBottom: 4 }}>
                {t.ticketNo || '(No Ticket Number)'}
              </div>
              <div style={{ fontSize: 12, color: '#3a3a3a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {t.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {updates.trim() && (
        <div style={{ padding: '12px 24px 8px' }}>
          {sectionTitle('Update / Achievement')}
          {linesToBullets(updates)}
        </div>
      )}

      {plans.trim() && (
        <div style={{ padding: '12px 24px 16px' }}>
          {sectionTitle('Next Plan')}
          {linesToBullets(plans)}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '12px 24px', fontSize: 11, color: '#999', borderTop: '1px solid #eee' }}>
        {divisi} · {reportTitle} · {dateLabel}
      </div>
      <div style={{ height: 4, display: 'flex' }}>
        {[TEAL, RED, MAGENTA, YELLOW].map(c => (
          <div key={c} style={{ flex: 1, background: c }} />
        ))}
      </div>
    </div>
  );
}

export default ReportDaily;