import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import type { Report, ChatMessage } from '../../types/report';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Swal from 'sweetalert2';
import resolveStorageUrl from '../../utils/storage';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  '#1e40af', '#6d28d9', '#065f46', '#92400e', '#991b1b',
  '#1d4ed8', '#7c3aed', '#047857',
];

const rca = {
  blue: '#0d4791',
  blueBar: '#bad8f0',
  blueBarBorder: '#96b2cc',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  ink: '#1e293b',
  muted: '#64748b',
  faint: '#94a3b8',
  note: '#fdf0c7',
  noteBorder: '#eaceac',
  bg: '#f6f8fb',
};

function SectionEyebrow({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, background: rca.blue, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {n}
      </div>
      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: rca.ink, letterSpacing: '0.01em' }}>
        {title}
      </h4>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: rca.ink, display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: rca.faint, marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 8,
  border: `1px solid ${rca.border}`,
  fontSize: 13.5,
  color: rca.ink,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: '#fff',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
 
function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = rca.blue;
  e.target.style.boxShadow = `0 0 0 3px ${rca.blue}1a`;
}
function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = rca.border;
  e.target.style.boxShadow = 'none';
}

function PreviewSectionBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      background: rca.blueBar, border: `1px solid ${rca.blueBarBorder}`,
      borderRadius: 4, padding: '9px 12px 10px',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: rca.blue }}>{title}</div>
      <div style={{ fontSize: 10.5, fontStyle: 'italic', color: '#5b6b7d', marginTop: 3 }}>{subtitle}</div>
    </div>
  );
}
 
function PreviewFieldRow({ label, desc, value }: { label: string; desc: string; value: string }) {
  return (
    <div style={{ display: 'flex', borderLeft: `1px solid ${rca.borderStrong}`, borderRight: `1px solid ${rca.borderStrong}`, borderBottom: `1px solid ${rca.borderStrong}` }}>
      <div style={{ width: '38%', padding: '9px 12px', borderRight: `1px solid ${rca.borderStrong}` }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: rca.ink }}>{label}</div>
        <div style={{ fontSize: 10, fontStyle: 'italic', color: rca.faint, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ flex: 1, padding: '9px 12px', fontSize: 11.5, color: '#374151', whiteSpace: 'pre-wrap' }}>
        {value || <span style={{ color: rca.faint }}>(Belum diisi)</span>}
      </div>
    </div>
  );
}
 
function PreviewContributors({ names, signedDate }: { names: string[]; signedDate: string }) {
  const rows = names.length ? names : ['(Belum diisi)'];
  return (
    <div style={{ display: 'flex', border: `1px solid ${rca.borderStrong}`, borderTop: 'none' }}>
      <div style={{ width: '38%', padding: '9px 12px', borderRight: `1px solid ${rca.borderStrong}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: rca.ink }}>Contributors</div>
        <div style={{ fontSize: 10, fontStyle: 'italic', color: rca.faint, marginTop: 2 }}>
          Names of those who contributed in the creation of this document
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {rows.map((name, i) => (
          <div key={i} style={{
            display: 'flex', fontSize: 11.5,
            borderBottom: i < rows.length - 1 ? `1px solid ${rca.border}` : 'none',
          }}>
            <div style={{ flex: 1, padding: '8px 12px', color: '#374151' }}>{name}</div>
            <div style={{ width: '42%', padding: '8px 12px', borderLeft: `1px solid ${rca.border}`, color: '#374151' }}>
              {names.length ? <>Signed <span style={{ color: rca.faint }}>({signedDate})</span></> : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
 
function PreviewNote({ text }: { text: string }) {
  return (
    <div style={{
      background: rca.note, border: `1px solid ${rca.noteBorder}`, borderTop: 'none',
      padding: '8px 12px', fontSize: 10.5, fontStyle: 'italic', color: '#6b5a2e', textAlign: 'center',
    }}>
      {text}
    </div>
  );
}
 
function PreviewParagraph({ heading, body }: { heading: string; body: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: rca.blue, marginBottom: 4 }}>{heading}</div>
      <div style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {body || <span style={{ color: rca.faint, fontStyle: 'italic' }}>Belum diisi</span>}
      </div>
    </div>
  );
}
 
function PreviewTindakanList({ text }: { text: string }) {
  const items = text.split('\n').map(l => l.trim()).filter(Boolean);
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: rca.blue, marginBottom: 6 }}>
        Tindakan Perbaikan &amp; Pencegahan
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 11.5, color: rca.faint, fontStyle: 'italic' }}>Belum diisi</div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: '#374151', lineHeight: 1.7 }}>
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      )}
    </div>
  );
}

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// const BACKEND_ORIGIN_FALLBACK = 'http://localhost:8080';
// const IMAGE_PATH_PREFIX = '/storage';

// function resolveImageUrl(path?: string | null): string | undefined {
//   if (!path) return undefined;
//   if (/^https?:\/\//i.test(path)) return path;

//   const apiBaseUrl: string =
//     (api as any)?.defaults?.baseURL ||
//     (import.meta as any)?.env?.VITE_API_URL ||
//     (import.meta as any)?.env?.VITE_API_BASE_URL ||
//     '';

//   let storageBase = apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

//   if (!storageBase || storageBase.includes('5173') || storageBase.includes('localhost:5173')) {
//     storageBase = BACKEND_ORIGIN_FALLBACK;
//   }

//   let cleanPath = path.startsWith('/') ? path : `/${path}`;

//   const alreadyPrefixed =
//     cleanPath.startsWith(IMAGE_PATH_PREFIX) ||
//     cleanPath.startsWith('/storage') ||
//     cleanPath.startsWith('/uploads');

//   if (!alreadyPrefixed) {
//     cleanPath = `${IMAGE_PATH_PREFIX}${cleanPath}`;
//   }

//   const resolved = `${storageBase}${cleanPath}`;

//   if (import.meta?.env?.DEV) {
//     console.debug('[resolveImageUrl]', { input: path, apiBaseUrl, storageBase, cleanPath, resolved });
//   }

//   return resolved;
// }

function Avatar({ name, size = 36, image }: { name: string; size?: number; image?: string }) {
  const color = colorForName(name);
  const initials = getInitials(name);

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          background: color,
        }}
        onError={e => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 600,
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  );
}

function StatusBadge({ label, type }: { label: string; type: 'critical' | 'progress' | 'sla' | 'tag' }) {
  const styles: Record<string, React.CSSProperties> = {
    critical: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    progress: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
    sla: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
    tag: { background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' },
  };
  const icons: Record<string, string> = {
    critical: '● ',
    sla: '◎ ',
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        ...styles[type],
      }}
    >
      {icons[type]}{label}
    </span>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ color: '#9ca3af', fontSize: 14, marginTop: 1, width: 16, textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}

function fmtDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'Immediate';
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} Hari`);
  if (hours > 0) parts.push(`${hours} Jam`);
  if (minutes > 0) parts.push(`${minutes} Menit`);
  return parts.length ? parts.join(' ') : 'Immediate';
}

function fmtFullDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const d = new Date(dateStr);
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} pukul ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function ScreenshotModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const statusLabelMap: Record<number, { label: string; color: string }> = {
    0: { label: 'Closed', color: '#dc2626' },
    1: { label: 'Open', color: '#16a34a' },
    2: { label: 'Restored', color: '#d97706' },
    4: { label: 'Done', color: '#16a34a' },
    5: { label: 'Done Partial', color: '#d97706' },
    6: { label: 'Rollback', color: '#dc2626' },
  };
  const statusInfo = statusLabelMap[report.status] ?? { label: 'Unknown', color: '#6b7280' };

  const createdAt = report.created_at ? new Date(report.created_at) : null;
  const restoredAt = report.servicerestored_time ? new Date(report.servicerestored_time) : null;
  const closedAt = report.closed_at ? new Date(report.closed_at) : null;

  const restoredDurationMin = createdAt && restoredAt
    ? Math.round((restoredAt.getTime() - createdAt.getTime()) / 60000)
    : null;
  const resolvedDurationMin = createdAt && closedAt
    ? Math.round((closedAt.getTime() - createdAt.getTime()) / 60000)
    : null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Requestor', value: report.requestor },
    { label: 'Requestor Email', value: report.requestor_email },
    {
      label: 'Report Date',
      value: report.request_date
        ? new Date(report.request_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '—',
    },
    { label: 'Report Time', value: report.report_time ?? '—' },
    { label: 'Application', value: report.apps ?? '—' },
    { label: 'Description', value: report.description },
    { label: 'Severity', value: report.severity ?? '—' },
    { label: 'Assigned To', value: report.assigned_to ?? '—' },
    { label: 'Scope / Root Cause', value: report.scope ?? '—' },
    {
      label: 'Restored Time',
      value: report.type === 'Incident'
        ? (restoredDurationMin !== null ? fmtDuration(restoredDurationMin) : 'Not yet restored')
        : '—',
    },
    {
      label: 'Resolved Time',
      value: report.type === 'Incident'
        ? (resolvedDurationMin !== null ? fmtDuration(resolvedDurationMin) : 'Not yet resolved')
        : '—',
    },
    {
      label: 'Status',
      value: (
        <span style={{
          padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          color: '#fff', background: statusInfo.color,
        }}>
          {statusInfo.label}
        </span>
      ),
    },
    { label: 'INC (if any)', value: report.incident ?? '—' },
    ...(report.type === 'Incident'
      ? [{ label: 'Resolution', value: report.resolution || 'Not yet resolved' }]
      : []),
    { label: 'Closed At', value: closedAt ? fmtFullDate(report.closed_at) : 'Belum ditutup' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 800,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827', textAlign: 'center', flex: 1 }}>
            Incident / Activity Report Detail
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 20, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db' }}>
            <tbody>
              {rows.map(({ label, value }) => (
                <tr key={label} style={{ borderBottom: '1px solid #d1d5db' }}>
                  <th style={{
                    background: '#f9fafb', padding: '10px 14px', textAlign: 'left',
                    fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap',
                    border: '1px solid #d1d5db', width: '28%',
                  }}>
                    {label}
                  </th>
                  <td style={{
                    padding: '10px 14px', fontSize: 13, color: '#111827',
                    border: '1px solid #d1d5db', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 14, textAlign: 'center' }}>
            Gunakan Print Screen atau tool screenshot untuk menyimpan tampilan ini sebagai gambar laporan mingguan.
          </p>
        </div>
      </div>
    </div>
  );
}

function RCAModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const [contributors, setContributors] = useState<string[]>(['']);
  const [objectives, setObjectives] = useState('');
  const [kronologi, setKronologi] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [lessonLearnt, setLessonLearnt] = useState('');
  const [action, setAction] = useState('');
  const [exporting, setExporting] = useState(false);
 
  const creationDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
 
  const cleanContributors = contributors.filter(c => c.trim() !== '');
 
  const addContributor = () => setContributors([...contributors, '']);
  const removeContributor = (index: number) => {
    if (contributors.length > 1) setContributors(contributors.filter((_, i) => i !== index));
  };
  const updateContributor = (index: number, value: string) => {
    const newCont = [...contributors];
    newCont[index] = value;
    setContributors(newCont);
  };
 
  const exportToPDF = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await api.post(
        `/reports/${report.uuid}/rca/export`,
        {
          document_date: creationDate,
          contributors: cleanContributors.map(name => ({ name, signed_date: creationDate })),
          objectives,
          kronologi,
          root_cause: rootCause,
          lesson_learnt: lessonLearnt,
          tindakan: action,
        },
        { responseType: 'blob' }
      );
 
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RCA_${report.incident || 'Report'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
 
      Swal.fire('Berhasil', 'Dokumen RCA telah diunduh', 'success');
      onClose();
    } catch (err) {
      Swal.fire('Error', 'Gagal mengunduh PDF', 'error');
    } finally {
      setExporting(false);
    }
  };
 
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: rca.bg, borderRadius: 16, width: '100%', maxWidth: 1220, maxHeight: '92vh',
        overflow: 'hidden', boxShadow: '0 24px 70px rgba(15,23,42,0.4)',
        display: 'flex', flexDirection: 'column',
      }}>
 
        <div style={{
          padding: '18px 28px', borderBottom: `1px solid ${rca.border}`, background: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: rca.ink }}>Export Root Cause Analysis</h3>
            <div style={{ fontSize: 12.5, color: rca.muted, marginTop: 2, fontFamily: 'monospace' }}>
              {report.incident}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: 8,
              fontSize: 16, cursor: 'pointer', color: rca.muted, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
 
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
 
          <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
 
            <SectionEyebrow n={1} title="Document Information" />
 
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: rca.ink }}>Contributors</label>
                <button
                  onClick={addContributor}
                  style={{
                    fontSize: 12, color: rca.blue, fontWeight: 600, background: 'none',
                    border: 'none', cursor: 'pointer', padding: '2px 4px',
                  }}
                >
                  + Tambah kontributor
                </button>
              </div>
              {contributors.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input
                    value={c}
                    onChange={e => updateContributor(i, e.target.value)}
                    onFocus={focusIn}
                    onBlur={focusOut}
                    placeholder="Nama contributor"
                    style={inputStyle}
                  />
                  {contributors.length > 1 && (
                    <button
                      onClick={() => removeContributor(i)}
                      style={{
                        color: '#ef4444', fontSize: 18, width: 32, height: 32, flexShrink: 0,
                        background: '#fef2f2', border: 'none', borderRadius: 8, cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
 
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff', border: `1px solid ${rca.border}`, borderRadius: 8,
              padding: '10px 14px', marginBottom: 18, fontSize: 13,
            }}>
              <span style={{ color: rca.muted }}>Document Creation Date</span>
              <span style={{ fontWeight: 600, color: rca.ink }}>{creationDate}</span>
            </div>
 
            <Field label="Objectives">
              <textarea value={objectives} onChange={e => setObjectives(e.target.value)} onFocus={focusIn} onBlur={focusOut} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
 
            <Field label="Scope">
              <input value={report.scope || ''} disabled style={{ ...inputStyle, background: '#f1f5f9', color: rca.muted }} />
            </Field>
 
            <Field label="Severity">
              <input value={report.severity || ''} disabled style={{ ...inputStyle, background: '#f1f5f9', color: rca.muted }} />
            </Field>
 
            <div style={{ height: 1, background: rca.border, margin: '24px 0' }} />
 
            <SectionEyebrow n={2} title="Incident Details" />
 
            <Field label="Kronologi Kejadian">
              <textarea value={kronologi} onChange={e => setKronologi(e.target.value)} onFocus={focusIn} onBlur={focusOut} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
 
            <Field label="Akar Masalah (Root Cause)">
              <textarea value={rootCause} onChange={e => setRootCause(e.target.value)} onFocus={focusIn} onBlur={focusOut} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
 
            <div style={{ height: 1, background: rca.border, margin: '24px 0' }} />
 
            <SectionEyebrow n={3} title="Mitigation Details" />
 
            <Field label="Pelajaran yang diambil (Lesson Learnt)">
              <textarea value={lessonLearnt} onChange={e => setLessonLearnt(e.target.value)} onFocus={focusIn} onBlur={focusOut} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
 
            <Field
              label="Tindakan Perbaikan & Pencegahan"
              hint="Tekan Enter untuk membuat poin baru — tiap baris jadi satu nomor di PDF."
            >
              <textarea value={action} onChange={e => setAction(e.target.value)} onFocus={focusIn} onBlur={focusOut} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
          </div>
 
          <div style={{ width: 460, background: '#eef2f7', padding: 24, overflowY: 'auto', borderLeft: `1px solid ${rca.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: rca.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Live Preview
              </span>
              <span style={{
                fontSize: 10.5, color: rca.blue, background: '#e5edf9', padding: '3px 9px',
                borderRadius: 20, fontWeight: 600,
              }}>
                Sama seperti hasil PDF
              </span>
            </div>
 
            <div style={{
              background: '#fff', borderRadius: 4, boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
              padding: '22px 20px', fontFamily: "'Inter', sans-serif",
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: rca.blue }}>Root Cause Analysis</div>
                <div style={{ fontSize: 11.5, color: rca.muted, marginTop: 3 }}>
                  Incident: {report.incident}
                </div>
              </div>
 
              <PreviewSectionBar title="Document Information" subtitle="Information related to this document creation" />
              <PreviewContributors names={cleanContributors} signedDate={creationDate} />
              <PreviewFieldRow label="Document Creation Date" desc="Date of this document first created" value={creationDate} />
              <PreviewFieldRow label="Objectives" desc="Objectives of this document" value={objectives} />
              <PreviewFieldRow label="Scope" desc="Scope of this document" value={report.scope || ''} />
              <PreviewFieldRow label="Severity" desc="Critical/High/Medium/Low" value={report.severity || ''} />
              <PreviewNote text="This approval of this document will use online approval system feature provided by Google Docs" />
 
              <div style={{ marginTop: 16 }}>
                <PreviewSectionBar title="Incident Details" subtitle="Explanation of incidents" />
                <PreviewParagraph heading="Kronologi Kejadian" body={kronologi} />
                <PreviewParagraph heading="Akar Masalah (Root Cause)" body={rootCause} />
              </div>
 
              <div style={{ marginTop: 16 }}>
                <PreviewSectionBar title="Mitigation Details" subtitle="How to mitigate the risk, as prevention so it will minimize chances disruption happen in the future" />
                <PreviewParagraph heading="Pelajaran yang diambil (Lesson Learnt)" body={lessonLearnt} />
                <PreviewTindakanList text={action} />
              </div>
            </div>
 
            <button
              onClick={exportToPDF}
              disabled={exporting}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '13px 0',
                background: exporting ? '#93b0d6' : rca.blue,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14.5,
                fontWeight: 600,
                cursor: exporting ? 'default' : 'pointer',
                boxShadow: exporting ? 'none' : '0 6px 16px rgba(13,71,145,0.28)',
                transition: 'background 0.15s',
              }}
            >
              {exporting ? 'Membuat PDF…' : '📄  Export ke PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ReportShow = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [showRCAModal, setShowRCAModal] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const authUser = (() => {
    try {
      const raw = localStorage.getItem('auth-storage');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.state?.user ?? null;
    } catch {
      return null;
    }
  })();

  const currentUserName: string =
    authUser?.name || authUser?.username || authUser?.email?.split('@')[0] || 'User';

  const currentUserImage = resolveStorageUrl(authUser?.image);

  const currentUserRole: string = (() => {
    if (authUser?.role_name) return authUser.role_name;
    if (authUser?.role_id === 1) return 'Administrator';
    if (authUser?.role_id === 2) return 'Viewer';
    if (authUser?.role_id === 3) return 'User';
    return 'User';
  })();

  const isAdmin = authUser?.role_id === 1;
  const currentUserId: string | number | undefined = (authUser as any)?.uuid ?? (authUser as any)?.id;

  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
  if (!report) return;

  const isFinished = report.status === 0 || [4, 5, 6].includes(report.status);

  const calc = () => {
    const start = new Date(report.created_at).getTime();
    const now   = Date.now();
    const diff  = Math.floor((now - start) / 1000);
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}h`);
    if (h > 0) parts.push(`${h}j`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}d`);
    setElapsed(parts.join(' '));
  };

  calc();

  if (isFinished) return;

  const id = setInterval(calc, 1000);
  return () => clearInterval(id);
}, [report]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/reports/${uuid}`);
        const data = res.data.data ?? res.data;
        setReport(data);
      } catch (err: any) {
        console.error(err);
        alert('Laporan tidak ditemukan atau terjadi kesalahan.');
        navigate('/reports');
      } finally {
        setLoading(false);
      }
    };
    if (uuid) fetchReport();
  }, [uuid, navigate]);

  useEffect(() => {
    const loadChat = async () => {
      if (!uuid) return;
      setChatLoading(true);
      try {
        const res = await api.get(`/reports/${uuid}/comments`);
        const data = res.data?.data ?? res.data;
        const list: any[] = Array.isArray(data) ? data : [];
        const mapped: ChatMessage[] = list.map((c) => ({
          id: c.id,
          authorId: c.author_id,
          authorName: c.author_name,
          authorInitials: getInitials(c.author_name ?? ''),
          authorRole: c.author_role,
          content: c.content,
          timestamp: c.timestamp,
          isInternal: c.is_internal,
          avatarColor: colorForName(c.author_name ?? ''),
          authorImage: c.author_image,
        }));
        setMessages(mapped);
      } catch {
        setMessages([]);
      } finally {
        setChatLoading(false);
      }
    };
    loadChat();
  }, [uuid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [sending, setSending] = useState(false);

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await api.post(`/reports/${uuid}/comments`, {
        author_id: currentUserId ? String(currentUserId) : '',
        author_name: currentUserName,
        author_role: currentUserRole,
        author_image: authUser?.image || '',
        content: text,
        is_internal: isInternal,
      });
      const c = res.data?.data ?? res.data;
      const newMsg: ChatMessage = {
        id: c.id,
        authorId: c.author_id,
        authorName: c.author_name,
        authorInitials: getInitials(c.author_name ?? currentUserName),
        authorRole: c.author_role,
        content: c.content,
        timestamp: c.timestamp,
        isInternal: c.is_internal,
        avatarColor: colorForName(c.author_name ?? currentUserName),
        authorImage: c.author_image,
      };
      setMessages((prev) => [...prev, newMsg]);
      setCommentText('');
    } catch (err) {
      console.error('Gagal mengirim komentar', err);
    } finally {
      setSending(false);
    }
  };

  const canDeleteMessage = (msg: ChatMessage): boolean => {
    if (isAdmin) return true;
    if (currentUserId !== undefined && msg.authorId !== undefined) {
      return String(msg.authorId) === String(currentUserId);
    }
    return msg.authorName === currentUserName;
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteMessage = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteTargetId || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/reports/${uuid}/comments/${deleteTargetId}`, {
        params: {
          requester_id: currentUserId ? String(currentUserId) : '',
          is_admin: isAdmin ? 'true' : 'false',
        },
      });
      setMessages((prev) => prev.filter((m) => m.id !== deleteTargetId));
    } catch (err) {
      console.error('Gagal menghapus komentar', err);
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  if (loading) return <LoadingSpinner message="Memuat detail laporan..." />;
  if (!report) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#6b7280' }}>
      Report not found
    </div>
  );

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '20px 24px', marginBottom: 20 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
            <button
              onClick={() => navigate('/reports')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, fontSize: 16, lineHeight: 1 }}
            >
              ←
            </button>
            <span style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
              {report.incident}
            </span>
            <span>›</span>
            <span>{report.apps ?? 'Software'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>
              {report.incident}
            </h1>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, position: 'relative' }} ref={actionsMenuRef}>
              <Link
                to={`/reports/${uuid}/edit`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 7,
                  border: '1px solid #e5e7eb', background: '#fff',
                  color: '#374151', fontSize: 13, fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                ✏️ Edit
              </Link>
              <button
                onClick={() => setShowActionsMenu(v => !v)}
                style={{
                  padding: '7px 10px', borderRadius: 7,
                  border: '1px solid #e5e7eb', background: '#fff',
                  color: '#374151', cursor: 'pointer', fontSize: 16,
                }}
              >
                •••
              </button>

              {showActionsMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 9,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)', minWidth: 200, zIndex: 50,
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => { setShowScreenshotModal(true); setShowActionsMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', textAlign: 'left' }}
                  >
                    📸 Mode Screenshot
                  </button>
                  <button
                    onClick={() => { setShowRCAModal(true); setShowActionsMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', textAlign: 'left' }}
                  >
                    📝 Export RCA
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {(() => {
              const statusMap: Record<number, { label: string; color: string; bg: string; border: string }> = {
                0: { label: 'Closed',       color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
                1: { label: 'Open',         color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                2: { label: 'Restored',     color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                4: { label: 'Done',         color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                5: { label: 'Done Partial', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                6: { label: 'Rollback',     color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
              };
              const s = statusMap[report.status] ?? statusMap[1];
              return (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:20, fontSize:12, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                  {s.label}
                </span>
              );
            })()}

            {report.severity && (() => {
              const sev = report.severity;
              const isEmergency = sev.includes('1') || sev.toLowerCase().includes('emergency');
              const isCritical  = sev.includes('2') || sev.toLowerCase().includes('critical');
              const isMajor     = sev.includes('3') || sev.toLowerCase().includes('major');
              const color  = isEmergency ? '#dc2626' : isCritical ? '#d97706' : isMajor ? '#ca8a04' : '#16a34a';
              const bg     = isEmergency ? '#fef2f2' : isCritical ? '#fffbeb' : isMajor ? '#fefce8' : '#f0fdf4';
              const border = isEmergency ? '#fecaca' : isCritical ? '#fde68a' : isMajor ? '#fef08a' : '#bbf7d0';
              const label  = isEmergency ? '● Emergency' : isCritical ? '● Critical' : isMajor ? '● Major' : '● Minor';
              return (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:20, fontSize:12, fontWeight:600, background:bg, color, border:`1px solid ${border}` }}>
                  {label}
                </span>
              );
            })()}

            {report.type && (() => {
              const typeColor = report.type === 'Incident' ? '#dc2626' : report.type === 'Request' ? '#2563eb' : '#16a34a';
              const typeBg    = report.type === 'Incident' ? '#fef2f2' : report.type === 'Request' ? '#eff6ff' : '#f0fdf4';
              const typeBorder= report.type === 'Incident' ? '#fecaca' : report.type === 'Request' ? '#bfdbfe' : '#bbf7d0';
              return (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:20, fontSize:12, fontWeight:500, background:typeBg, color:typeColor, border:`1px solid ${typeBorder}` }}>
                  {report.type}
                </span>
              );
            })()}

            {report.apps && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:20, fontSize:12, fontWeight:500, background:'#f8fafc', color:'#475569', border:'1px solid #e2e8f0' }}>
                🏷️ {report.apps}
              </span>
            )}

            {report.assigned_to && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:20, fontSize:12, fontWeight:500, background:'#faf5ff', color:'#7c3aed', border:'1px solid #e9d5ff' }}>
                👤 {report.assigned_to}
              </span>
            )}

            {(() => {
            const isFinished = report.status === 0 || report.status === 4;

            let displayTime = '';

            if (isFinished) {
              const start = new Date(report.created_at).getTime();
              const end   = report.closed_at
                ? new Date(report.closed_at).getTime()
                : report.updated_at
                  ? new Date(report.updated_at).getTime()
                  : new Date(report.created_at).getTime();

              const diffMs  = Math.max(0, end - start);
              const days    = Math.floor(diffMs / 86400000);
              const hours   = Math.floor((diffMs % 86400000) / 3600000);
              const minutes = Math.floor((diffMs % 3600000) / 60000);
              const seconds = Math.floor((diffMs % 60000) / 1000);

              if (days > 0)        displayTime = `${days}d ${hours}h ${minutes}m`;
              else if (hours > 0)  displayTime = `${hours}h ${minutes}m ${seconds}s`;
              else                 displayTime = `${minutes}m ${seconds}s`;
            } else {
              displayTime = elapsed;
            }

            return (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: isFinished ? '#f0fdf4' : '#fff7ed',
                color: isFinished ? '#16a34a' : '#c2410c',
                border: `1px solid ${isFinished ? '#bbf7d0' : '#fed7aa'}`,
                fontFamily: 'monospace',
              }}>
                {isFinished ? '✓' : '⏱'} {displayTime}
              </span>
            );
          })()}

            {report.scope && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:20, fontSize:12, fontWeight:500, background:'#f0fdf4', color:'#15803d', border:'1px solid #bbf7d0' }}>
                {report.scope}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Description</h2>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <p style={{ margin: 0, fontSize: 13.5, color: '#4b5563', lineHeight: 1.7 }}>
                  {report.description}
                </p>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Activity & Comments</h2>
              </div>

              <div
                ref={chatContainerRef}
                style={{
                  padding: '16px 20px',
                  maxHeight: 440,
                  minHeight: 120,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#e5e7eb transparent',
                }}
              >
                {chatLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
                    Memuat komentar...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
                    Belum ada komentar. Jadilah yang pertama menulis update.
                  </div>
                ) : messages.map((msg) => {
                  const canDelete = canDeleteMessage(msg);
                  const isHovered = hoveredMsgId === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                      style={{ display: 'flex', gap: 12, padding: '10px 0', position: 'relative' }}
                    >
                      <Avatar name={msg.authorName} size={36} image={resolveStorageUrl(msg.authorImage)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{msg.authorName}</span>
                          <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '1px 7px', borderRadius: 10 }}>
                            {msg.authorRole}
                          </span>
                          {msg.isInternal && (
                            <span style={{
                              fontSize: 11, color: '#92400e', background: '#fef3c7',
                              border: '1px solid #fde68a', padding: '1px 8px', borderRadius: 10,
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                            }}>
                              ⚠ Internal Note
                            </span>
                          )}
                          {canDelete && isHovered && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              title={isAdmin && msg.authorName !== currentUserName ? 'Hapus komentar (admin)' : 'Hapus komentar'}
                              style={{
                                marginLeft: 'auto',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                cursor: 'pointer',
                                color: '#dc2626',
                                fontSize: 11,
                                fontWeight: 500,
                                padding: '3px 9px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              🗑 Hapus
                            </button>
                          )}
                        </div>
                        <div style={{
                          background: msg.isInternal ? '#fffbeb' : '#f9fafb',
                          border: `1px solid ${msg.isInternal ? '#fde68a' : '#f3f4f6'}`,
                          borderRadius: 8,
                          padding: '10px 14px',
                          fontSize: 13,
                          color: '#374151',
                          lineHeight: 1.6,
                        }}>
                          {msg.content}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>{msg.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: '0 20px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Avatar name={currentUserName} size={36} image={currentUserImage} />
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Tambahkan komentar atau update..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#374151',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        background: '#fff',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          style={{ width: 14, height: 14, accentColor: '#f59e0b', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 12, color: '#6b7280' }}>⚠ Internal note (hanya tim IT)</span>
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#9ca3af', fontSize: 16, padding: '4px',
                        }} title="Attach file">
                          📎
                        </button>
                        <button
                          onClick={handleSendComment}
                          disabled={!commentText.trim() || sending}
                          style={{
                            padding: '7px 18px',
                            background: commentText.trim() && !sending ? '#2563eb' : '#e5e7eb',
                            color: commentText.trim() && !sending ? '#fff' : '#9ca3af',
                            border: 'none',
                            borderRadius: 7,
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: commentText.trim() && !sending ? 'pointer' : 'default',
                            transition: 'background 0.15s',
                          }}
                        >
                          {sending ? 'Mengirim...' : 'Kirim'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Detail Incident</h2>
              </div>
              <div style={{ padding: '4px 20px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#9ca3af', fontSize: 14, marginTop: 1, width: 16, textAlign: 'center' }}>👤</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignee</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={report.assigned_to ?? 'Unassigned'} size={26} />
                      <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{report.assigned_to ?? 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#9ca3af', fontSize: 14, marginTop: 1, width: 16, textAlign: 'center' }}>👤</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requestor</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={report.requestor ?? 'Unknown'} size={26} />
                      <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{report.requestor ?? 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                <DetailRow icon="🏷️" label="Application" value={report.apps ?? 'Software'} />
                <DetailRow 
                  icon="📅" 
                  label="Dibuat" 
                  value={formatTimestamp(new Date(report.created_at))} 
                />
                <DetailRow 
                  icon="🔄" 
                  label="Diupdate" 
                  value={report.updated_at ? formatTimestamp(new Date(report.updated_at)) : '—'} 
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {showScreenshotModal && (
        <ScreenshotModal report={report} onClose={() => setShowScreenshotModal(false)} />
      )}

      {showRCAModal && report && (
        <RCAModal report={report} onClose={() => setShowRCAModal(false)} />
      )}

      {deleteTargetId && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1200, padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteTargetId(null); }}
        >
          <div style={{
            background: '#fff', borderRadius: 12, width: '100%', maxWidth: 380,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 24, textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 22,
            }}>
              🗑
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Hapus komentar ini?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
              Komentar yang dihapus tidak dapat dikembalikan.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteTargetId(null)}
                style={{
                  padding: '8px 18px', borderRadius: 7, border: '1px solid #e5e7eb',
                  background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteMessage}
                disabled={deleting}
                style={{
                  padding: '8px 18px', borderRadius: 7, border: 'none',
                  background: deleting ? '#fca5a5' : '#dc2626', color: '#fff',
                  fontSize: 13, fontWeight: 500, cursor: deleting ? 'default' : 'pointer',
                }}
              >
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportShow;