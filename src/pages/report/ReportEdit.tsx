import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import useMasterData from '../../hooks/useMasterData';
import FileUpload from '../../components/common/FileUpload';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import useAuthStore from '../../store/authStore';
import type { Report, ExternalTeam, MstExternalTeam } from '../../types/report';
import { PRIORITY_LABEL, SCOPE_LABEL, STATUS_MAP } from '../../types/report';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

type ReportType = 'Incident' | 'Request' | 'Activity';

const fmtSeconds = (sec: number): string => {
  const s = Math.abs(Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [h, m, ss].map(v => String(v).padStart(2, '0')).join(':');
};

const fmtMinutes = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};

const CHANGE_REASON_KEY = (uuid: string) => `report_change_reason:${uuid}`;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
      {children}
      {required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, readOnly, type = 'text', required,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      required={required}
      style={{
        width: '100%',
        padding: '9px 12px',
        border: '1px solid #e5e7eb',
        borderRadius: 7,
        fontSize: 13,
        color: readOnly ? '#6b7280' : '#111827',
        background: readOnly ? '#f9fafb' : '#fff',
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { if (!readOnly) e.target.style.borderColor = '#2563eb'; }}
      onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
    />
  );
}

function SelectInput({
  value, onChange, options, placeholder, disabled,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '9px 12px',
        border: '1px solid #e5e7eb',
        borderRadius: 7,
        fontSize: 13,
        color: value ? '#111827' : '#9ca3af',
        background: disabled ? '#f9fafb' : '#fff',
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 32,
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function RichTextEditor({ value, onChange, readOnly = false }: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
     editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '4px 8px', borderRadius: 5, border: '1px solid #e5e7eb',
    background: active ? '#2563eb' : '#f9fafb',
    color: active ? '#fff' : '#374151',
    cursor: 'pointer', fontSize: 12, fontWeight: 500, lineHeight: 1,
  });

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: readOnly ? '#f9fafb' : '#fff' }}>
      {!readOnly && editor && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px',
          borderBottom: '1px solid #f1f5f9', background: '#f8fafc',
        }}>
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btn(editor.isActive('bold'))} title="Bold"><b>B</b></button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btn(editor.isActive('italic'))} title="Italic"><i>I</i></button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} style={btn(editor.isActive('underline'))} title="Underline"><u>U</u></button>

          <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btn(editor.isActive('heading', { level: 2 }))} title="Heading 2">H2</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={btn(editor.isActive('heading', { level: 3 }))} title="Heading 3">H3</button>

          <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btn(editor.isActive('bulletList'))} title="Bullet List">• —</button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btn(editor.isActive('orderedList'))} title="Ordered List">1.</button>

          <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

          <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} style={btn(editor.isActive({ textAlign: 'left' }))} title="Align Left">⬅</button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} style={btn(editor.isActive({ textAlign: 'center' }))} title="Center">≡</button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} style={btn(editor.isActive({ textAlign: 'right' }))} title="Align Right">➡</button>

          <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} style={btn(editor.isActive('blockquote'))} title="Blockquote">"</button>
          <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} style={btn(editor.isActive('codeBlock'))} title="Code Block">{`</>`}</button>

          <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

          <button type="button" onClick={() => editor.chain().focus().undo().run()} style={btn(false)} title="Undo">↩</button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} style={btn(false)} title="Redo">↪</button>
        </div>
      )}

      <style>{`
        .tiptap-rca { padding: 12px 14px; min-height: 180px; font-size: 13px; line-height: 1.7; color: #374151; outline: none; }
        .tiptap-rca h2 { font-size: 16px; font-weight: 700; margin: 12px 0 6px; color: #111827; }
        .tiptap-rca h3 { font-size: 14px; font-weight: 600; margin: 10px 0 4px; color: #1e293b; }
        .tiptap-rca ul { padding-left: 20px; margin: 6px 0; }
        .tiptap-rca ol { padding-left: 20px; margin: 6px 0; }
        .tiptap-rca li { margin-bottom: 3px; }
        .tiptap-rca blockquote { border-left: 3px solid #2563eb; padding-left: 12px; margin: 8px 0; color: #64748b; font-style: italic; }
        .tiptap-rca pre { background: #1e293b; color: #e2e8f0; padding: 10px 14px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin: 8px 0; }
        .tiptap-rca code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 12px; }
        .tiptap-rca p { margin: 4px 0; }
      `}</style>

      <EditorContent editor={editor} className="tiptap-rca" />
    </div>
  );
}

const ReportEdit = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role_id === 1;

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [selectedType, setSelectedType] = useState<ReportType>('Incident');

  const [newDowntime, setNewDowntime] = useState<File[]>([]);
  const [existingDowntime, setExistingDowntime] = useState<string[]>([]);
  const [newRestoration, setNewRestoration] = useState<File[]>([]);
  const [existingRestoration, setExistingRestoration] = useState<string[]>([]);

  const [handledBy, setHandledBy] = useState(false);
  const [externalTeams, setExternalTeams] = useState<ExternalTeam[]>([]);
  const [mstExternalTeams, setMstExternalTeams] = useState<MstExternalTeam[]>([]);
  const [showExternalSection, setShowExternalSection] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalModalMode, setExternalModalMode] = useState<'add' | 'edit'>('add');
  const [editingExtId, setEditingExtId] = useState<number | null>(null);
  const [extForm, setExtForm] = useState({ external_team_id: '', pic: '', start_time: '', end_time: '' });
  const [extNewFiles, setExtNewFiles] = useState<File[]>([]);
  const [extExistingFiles, setExtExistingFiles] = useState<string[]>([]);
  const [savingExt, setSavingExt] = useState(false);

  const [pendingStatus, setPendingStatus] = useState<number | null>(null);

  const [changeReason, setChangeReason] = useState('');
  const initialChangeReasonRef = useRef('');

  const { masterData, loading: masterLoading } = useMasterData(selectedType);

  const [form, setForm] = useState({
    requestor: '',
    requestor_email: '',
    request_date: '',
    report_time: '',
    apps: '',
    severity: '',
    assigned_to: '',
    assigned_other: '',
    scope: '',
    scope_other: '',
    description: '',
    resolution: '',
    rca: '',
    servicerestored_time: '',
    created_at: '',
    status: 1,
    incident: '',
  });

  const initialFormRef = useRef<typeof form | null>(null);
  const initialPendingStatusRef = useRef<number | null>(null);
  const initialNewDowntimeLenRef = useRef(0);
  const initialNewRestorationLenRef = useRef(0);

  const set = (field: string, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const fetchExternalTeams = useCallback(async () => {
    if (!report?.id) return;
    try {
      const res = await api.get(`/report-external-teams?report_id=${report.id}`);
      const data = res.data.data ?? res.data;
      setExternalTeams(Array.isArray(data) ? data : []);
    } catch {
      setExternalTeams([]);
    }
  }, [report?.id]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/reports/${uuid}`);
        const data: Report = res.data.data ?? res.data;
        setReport(data);
        setSelectedType((data.type as ReportType) || 'Incident');
        setExistingDowntime(data.file_downtime_evidence ?? []);
        setExistingRestoration(data.restoration_evidence ?? []);
        setHandledBy(data.handled_by === 1);
        setShowExternalSection(data.handled_by === 1);

        const loadedForm = {
          requestor: data.requestor ?? '',
          requestor_email: data.requestor_email ?? '',
          request_date: data.request_date ? data.request_date.split('T')[0] : '',
          report_time: data.report_time ?? '',
          apps: data.apps ?? '',
          severity: data.severity ?? '',
          assigned_to: data.assigned_to ?? '',
          assigned_other: '',
          scope: data.scope ?? '',
          scope_other: '',
          description: data.description ?? '',
          resolution: data.resolution ?? '',
          rca: data.rca ?? '',
          servicerestored_time: data.servicerestored_time ? data.servicerestored_time.substring(0, 16) : '',
          created_at: data.created_at ? data.created_at.substring(0, 16) : '',
          status: data.status ?? 1,
          incident: data.incident ?? '',
        };
        setForm(loadedForm);
        initialFormRef.current = loadedForm;
        initialPendingStatusRef.current = null;

        if (uuid) {
          const savedReason = localStorage.getItem(CHANGE_REASON_KEY(uuid)) ?? '';
          setChangeReason(savedReason);
          initialChangeReasonRef.current = savedReason;
        }
      } catch {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal memuat data laporan' });
        navigate('/reports');
      } finally {
        setFetching(false);
      }
    };
    if (uuid) fetchReport();
  }, [uuid, navigate]);

  useEffect(() => {
    if (report?.id && handledBy) fetchExternalTeams();
  }, [report?.id, handledBy, fetchExternalTeams]);

  useEffect(() => {
    const fetchMstExternalTeams = async () => {
      try {
        const res = await api.get('/master/external-teams');
        const data = res.data.data ?? res.data;
        setMstExternalTeams(Array.isArray(data) ? data : []);
      } catch {
        setMstExternalTeams([]);
      }
    };
    fetchMstExternalTeams();
  }, []);

  useEffect(() => {
    if (uuid && changeReason !== initialChangeReasonRef.current) {
      if (changeReason.trim()) {
        localStorage.setItem(CHANGE_REASON_KEY(uuid), changeReason);
      } else {
        localStorage.removeItem(CHANGE_REASON_KEY(uuid));
      }
    }
  }, [changeReason, uuid]);

  const getSeverityOptions = (): string[] => {
    if (!masterData) return [];
    if (selectedType === 'Incident') return masterData.severities.map(s => s.name);
    if (selectedType === 'Request') return masterData.priorities.map(p => p.name);
    return masterData.impacts.map(i => i.name);
  };

  const isEditableType = selectedType === 'Request' || selectedType === 'Activity';
  const canEdit = isAdmin || isEditableType;
  const isClosed = report?.status === 0;

  const totalExternalMinutes = externalTeams.reduce((sum, e) => sum + (e.duration ?? 0), 0);
  const totalExternalSeconds = totalExternalMinutes * 60;

  const restoredSeconds = (() => {
    if (!form.servicerestored_time || !form.created_at) return 0;
    const restored = new Date(form.servicerestored_time).getTime();
    const created = new Date(form.created_at).getTime();
    return Math.abs(Math.round((restored - created) / 1000));
  })();

  const internalSeconds = Math.max(0, restoredSeconds - totalExternalSeconds);
  const showRestorationContent = !!form.servicerestored_time;

  const isDirty = (() => {
    if (!initialFormRef.current) return false;
    const formChanged = Object.keys(form).some(
      key => (form as any)[key] !== (initialFormRef.current as any)[key]
    );
    const statusChanged = pendingStatus !== null && pendingStatus !== initialPendingStatusRef.current;
    const filesChanged =
      newDowntime.length !== initialNewDowntimeLenRef.current ||
      newRestoration.length !== initialNewRestorationLenRef.current;
    return formChanged || statusChanged || filesChanged;
  })();

  const handleToggleHandled = () => {
    if (handledBy) return;
    Swal.fire({
      title: 'Activate External Team?',
      text: 'Once activated, this toggle cannot be deactivated again. Continue?',
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Activate', cancelButtonText: 'Cancel',
    }).then(async result => {
      if (result.isConfirmed) {
        try {
          await api.post(`/reports/${uuid}/toggle-handled`, { handled_by: true });
          setHandledBy(true);
          setShowExternalSection(true);
          setReport(prev => prev ? { ...prev, handled_by: 1 } : prev);
        } catch {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal mengaktifkan external team' });
        }
      }
    });
  };

  const handleOpenAddExternal = () => {
    setExternalModalMode('add');
    setEditingExtId(null);
    setExtForm({ external_team_id: '', pic: '', start_time: '', end_time: '' });
    setExtNewFiles([]);
    setExtExistingFiles([]);
    setShowExternalModal(true);
  };

  const handleOpenEditExternal = (ext: ExternalTeam) => {
    setExternalModalMode('edit');
    setEditingExtId(ext.id);
    setExtForm({
      external_team_id: String(ext.external_team_id),
      pic: ext.pic ?? '',
      start_time: ext.start_time ? ext.start_time.substring(0, 16) : '',
      end_time: ext.end_time ? ext.end_time.substring(0, 16) : '',
    });
    setExtExistingFiles(ext.evidence_file_external ?? []);
    setExtNewFiles([]);
    setShowExternalModal(true);
  };

  const handleDeleteExternal = (id: number) => {
    Swal.fire({
      title: 'Delete Data?', text: 'This data will be deleted permanently!', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete',
    }).then(async result => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/report-external-teams/${id}`);
          await fetchExternalTeams();
          Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1200, showConfirmButton: false });
        } catch {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal menghapus data' });
        }
      }
    });
  };

  const handleSaveExternal = async () => {
    if (!extForm.start_time) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Start Time is required' });
      return;
    }
    if (extForm.end_time && extForm.end_time < extForm.start_time) {
      Swal.fire({ icon: 'warning', title: 'Invalid', text: 'End Time cannot be earlier than Start Time' });
      return;
    }
    setSavingExt(true);
    try {
      const fd = new FormData();
      if (externalModalMode === 'add') {
        fd.append('report_id', uuid ?? '');
        fd.append('external_team_id', extForm.external_team_id);
      }
      fd.append('pic', extForm.pic);
      fd.append('start_time', extForm.start_time);
      if (extForm.end_time) fd.append('end_time', extForm.end_time);
      extExistingFiles.forEach(f => fd.append('existing_files[]', f));
      extNewFiles.forEach(f => fd.append('evidence_file_external', f));
      if (externalModalMode === 'add') {
        await api.post('/report-external-teams', fd);
      } else {
        await api.put(`/report-external-teams/${editingExtId}`, fd);
      }
      setShowExternalModal(false);
      await fetchExternalTeams();
      Swal.fire({ icon: 'success', title: 'Saved!', timer: 1200, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Gagal menyimpan data external team' });
    } finally {
      setSavingExt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAssigned = form.assigned_other.trim() || form.assigned_to;
    const finalScope = form.scope_other.trim() || form.scope;
    const finalStatus = pendingStatus !== null ? pendingStatus : form.status;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('requestor', form.requestor);
      fd.append('requestor_email', form.requestor_email);
      fd.append('request_date', form.request_date);
      fd.append('report_time', form.report_time);
      fd.append('apps', form.apps);
      fd.append('type', selectedType);
      fd.append('severity', form.severity);
      fd.append('assigned_to', finalAssigned);
      fd.append('scope', finalScope);
      fd.append('description', form.description);
      fd.append('status', finalStatus.toString());
      if (form.resolution) fd.append('resolution', form.resolution);
      if (form.rca) fd.append('rca', form.rca);
      if (form.servicerestored_time) fd.append('servicerestored_time', form.servicerestored_time);
      if (isAdmin && form.created_at) fd.append('created_at', form.created_at);
      existingDowntime.forEach(f => fd.append('existing_downtime_files[]', f));
      newDowntime.forEach(f => fd.append('file_downtime_evidence[]', f));
      existingRestoration.forEach(f => fd.append('existing_restoration_files[]', f));
      newRestoration.forEach(f => fd.append('restoration_evidence[]', f));
      await api.put(`/reports/${uuid}`, fd);
      await Swal.fire({ icon: 'success', title: 'Saved!', timer: 1500, showConfirmButton: false });
      navigate(`/reports/${uuid}`);
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Gagal menyimpan' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (initialFormRef.current) setForm(initialFormRef.current);
    setPendingStatus(initialPendingStatusRef.current);
    setNewDowntime([]);
    setNewRestoration([]);
  };

  const handleCloseTicket = () => {
    Swal.fire({
      title: 'Close Ticket?',
      text: 'Ticket akan langsung ditutup. Tindakan ini tidak bisa dibatalkan oleh non-admin.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Close Ticket',
      cancelButtonText: 'Batal',
    }).then(async r => {
      if (!r.isConfirmed) return;
      setSaving(true);
      try {
        const finalAssigned = form.assigned_other.trim() || form.assigned_to;
        const finalScope    = form.scope_other.trim()    || form.scope;

        const fd = new FormData();
        fd.append('requestor',       form.requestor);
        fd.append('requestor_email', form.requestor_email);
        fd.append('request_date',    form.request_date);
        fd.append('report_time',     form.report_time);
        fd.append('apps',            form.apps);
        fd.append('type',            selectedType);
        fd.append('severity',        form.severity);
        fd.append('assigned_to',     finalAssigned);
        fd.append('scope',           finalScope);
        fd.append('description',     form.description);
        fd.append('status',          '0');
        if (form.resolution)          fd.append('resolution',           form.resolution);
        if (form.rca)                 fd.append('rca',                  form.rca);
        if (form.servicerestored_time) fd.append('servicerestored_time', form.servicerestored_time);
        if (isAdmin && form.created_at) fd.append('created_at',         form.created_at);

        existingDowntime.forEach(f    => fd.append('existing_downtime_files[]',    f));
        newDowntime.forEach(f         => fd.append('file_downtime_evidence[]',      f));
        existingRestoration.forEach(f => fd.append('existing_restoration_files[]', f));
        newRestoration.forEach(f      => fd.append('restoration_evidence[]',       f));

        await api.put(`/reports/${uuid}`, fd);

        await Swal.fire({
          icon: 'success',
          title: 'Ticket Closed!',
          text: `${form.incident} berhasil ditutup.`,
          timer: 1800,
          showConfirmButton: false,
        });

        navigate(`/reports/${uuid}`);
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: err.response?.data?.message || 'Terjadi kesalahan.' });
      } finally {
        setSaving(false);
      }
    });
  };

  const handleSetStatus = (status: number) => {
    const labels: Record<number, string> = { 4: 'Done', 5: 'Done Partial', 6: 'Rollback' };
    const colors: Record<number, string> = { 4: '#198754', 5: '#ffc107', 6: '#dc3545' };
    Swal.fire({
      title: `Set status to "${labels[status]}"?`,
      text: 'Status will be saved when you click Save Changes.',
      icon: 'question', showCancelButton: true,
      confirmButtonColor: colors[status], confirmButtonText: 'Yes, Set',
    }).then(r => {
      if (r.isConfirmed) {
        setPendingStatus(status);
        Swal.fire({ icon: 'success', title: `Status set to "${labels[status]}"`, text: 'Click Save Changes to save.', timer: 2000, showConfirmButton: false });
      }
    });
  };

  if (fetching) return <LoadingSpinner message="Loading report data..." />;

  const currentStatus = pendingStatus !== null ? pendingStatus : form.status;
  const statusInfo = STATUS_MAP[currentStatus] ?? { label: 'Unknown', color: '#6b7280' };

  return (
    <>
      <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>

        <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

          <div style={{
            background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
            padding: '16px 24px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => navigate(`/reports/${uuid}`)}
                style={{
                  background: 'none', border: '1px solid #e5e7eb', cursor: 'pointer',
                  color: '#6b7280', padding: '6px 10px', borderRadius: 7, fontSize: 16, lineHeight: 1,
                }}
              >
                ←
              </button>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                  Edit Incident
                </h1>
                <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{form.incident}</span>
              </div>
            </div>

            <div style={{
              display: 'flex', gap: 10,
              maxWidth: isDirty ? 400 : 0,
              opacity: isDirty ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-width 0.3s ease, opacity 0.25s ease',
            }}>
              <button
                type="button"
                onClick={handleDiscard}
                style={{
                  padding: '8px 16px', borderRadius: 7, border: '1px solid #e5e7eb',
                  background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                }}
              >
                ✕ Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit as any}
                disabled={saving}
                style={{
                  padding: '8px 20px', borderRadius: 7, border: 'none',
                  background: saving ? '#93c5fd' : '#2563eb', color: '#fff',
                  fontSize: 13, fontWeight: 500, cursor: saving ? 'default' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                }}
              >
                {saving ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    Menyimpan...
                  </>
                ) : (
                  <>💾 Simpan Perubahan</>
                )}
              </button>
            </div>
          </div>

          {isClosed && !isAdmin && (
            <div style={{
              background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8,
              padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400e',
            }}>
              <strong>Ticket ini sudah Closed.</strong> Hanya Admin yang dapat mengedit ticket Closed.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

              <div>

                <SectionCard title="Informasi Utama">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <FieldLabel required>Code</FieldLabel>
                      <TextInput
                        value={form.incident}
                        onChange={v => set('incident', v)}
                        placeholder="Judul singkat incident..."
                        readOnly={canEdit}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel required>Deskripsi</FieldLabel>
                      <textarea
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        readOnly={!canEdit}
                        required
                        rows={5}
                        style={{
                          width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
                          borderRadius: 7, fontSize: 13, color: '#374151', resize: 'vertical',
                          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                          background: canEdit ? '#fff' : '#f9fafb', lineHeight: 1.6,
                        }}
                        onFocus={e => { if (canEdit) e.target.style.borderColor = '#2563eb'; }}
                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Requestor">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <FieldLabel required>Nama Requestor</FieldLabel>
                      <TextInput value={form.requestor} onChange={v => set('requestor', v)} readOnly={!canEdit} required />
                    </div>
                    <div>
                      <FieldLabel required>Email</FieldLabel>
                      <TextInput type="email" value={form.requestor_email} onChange={v => set('requestor_email', v)} readOnly={!canEdit} required />
                    </div>
                    <div>
                      <FieldLabel required>Tanggal</FieldLabel>
                      <TextInput type="date" value={form.request_date} onChange={v => set('request_date', v)} readOnly={!canEdit} required />
                    </div>
                    <div>
                      <FieldLabel required>Waktu</FieldLabel>
                      <TextInput type="time" value={form.report_time} onChange={v => set('report_time', v)} readOnly={!canEdit} required />
                    </div>
                    {isAdmin && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <FieldLabel>Ticket Created At</FieldLabel>
                        <TextInput type="datetime-local" value={form.created_at} onChange={v => set('created_at', v)} />
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Ubah jika ada kesalahan waktu pembuatan</p>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Klasifikasi">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div>
                      <FieldLabel required>{PRIORITY_LABEL[selectedType]}</FieldLabel>
                      {masterLoading ? (
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</div>
                      ) : (
                        <SelectInput
                          value={form.severity}
                          onChange={v => set('severity', v)}
                          options={getSeverityOptions().map(o => ({ value: o, label: o }))}
                          placeholder="Pilih priority..."
                          disabled={!isAdmin}
                        />
                      )}
                    </div>
                    <div>
                      <FieldLabel required>Applications</FieldLabel>
                      {masterLoading ? (
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</div>
                      ) : (
                        <SelectInput
                          value={form.apps}
                          onChange={v => set('apps', v)}
                          options={(masterData?.apps ?? []).map(a => ({ value: a.name, label: a.name }))}
                          placeholder="Pilih kategori..."
                          disabled={!canEdit}
                        />
                      )}
                    </div>
                    <div>
                      <FieldLabel>Assignee</FieldLabel>
                      {masterLoading ? (
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</div>
                      ) : (
                        <SelectInput
                          value={form.assigned_to}
                          onChange={v => { set('assigned_to', v); set('assigned_other', ''); }}
                          options={(masterData?.assigned_to ?? []).map(a => ({ value: a.name, label: a.name }))}
                          placeholder="Pilih assignee..."
                          disabled={!isAdmin}
                        />
                      )}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title={SCOPE_LABEL[selectedType]}>
                  {masterLoading ? (
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(masterData?.scopes ?? []).map(s => {
                        const isSelected = form.scope === s.name && !form.scope_other;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { set('scope', s.name); set('scope_other', ''); }}
                            style={{
                              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                              cursor: 'pointer', transition: 'all 0.15s',
                              background: isSelected ? '#2563eb' : '#f3f4f6',
                              color: isSelected ? '#fff' : '#374151',
                              border: isSelected ? '1px solid #2563eb' : '1px solid #e5e7eb',
                            }}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Downtime Evidence">
                  <FileUpload
                    label="Upload Downtime Evidence"
                    onFilesChange={setNewDowntime}
                    maxFiles={5}
                    existingFiles={existingDowntime}
                    onExistingRemove={f => setExistingDowntime(prev => prev.filter(x => x !== f))}
                    storageFolder="file_downtime_evidences"
                  />
                </SectionCard>

                {selectedType === 'Incident' && (
                  <>
                    <SectionCard title="Handled by External Team">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>
                            External Handling Duration:{' '}
                            <strong style={{ color: '#d97706' }}>{fmtMinutes(totalExternalMinutes)}</strong>
                          </p>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: handledBy ? 'not-allowed' : 'pointer' }}>
                          <div
                            onClick={handleToggleHandled}
                            style={{
                              width: 44, height: 24, borderRadius: 12,
                              background: handledBy ? '#16a34a' : '#d1d5db',
                              position: 'relative', transition: 'background 0.2s', cursor: handledBy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%', background: '#fff',
                              position: 'absolute', top: 3, left: handledBy ? 23 : 3,
                              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: handledBy ? '#16a34a' : '#6b7280' }}>
                            {handledBy ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </div>

                      {showExternalSection && (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenAddExternal}
                            disabled={!isAdmin && isClosed}
                            style={{
                              padding: '7px 14px', borderRadius: 7, border: 'none',
                              background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 500,
                              cursor: (!isAdmin && isClosed) ? 'not-allowed' : 'pointer', marginBottom: 12,
                              opacity: (!isAdmin && isClosed) ? 0.5 : 1,
                            }}
                          >
                            + Add External Team
                          </button>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead>
                                <tr style={{ background: '#1e293b', color: '#fff' }}>
                                  {['External Team', 'PIC', 'Start', 'End', 'Duration', 'Files', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 12 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {externalTeams.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                                      Belum ada data External Team
                                    </td>
                                  </tr>
                                ) : externalTeams.map((ext, i) => {
                                  const team = mstExternalTeams.find(t => t.id === ext.external_team_id);
                                  return (
                                    <tr key={ext.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                                      <td style={{ padding: '10px 12px' }}>{team?.name ?? '-'}</td>
                                      <td style={{ padding: '10px 12px' }}>{ext.pic || '-'}</td>
                                      <td style={{ padding: '10px 12px' }}>{ext.start_time ? new Date(ext.start_time).toLocaleString('id-ID') : '-'}</td>
                                      <td style={{ padding: '10px 12px' }}>{ext.end_time ? new Date(ext.end_time).toLocaleString('id-ID') : '-'}</td>
                                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{ext.duration !== null ? fmtMinutes(ext.duration) : '-'}</td>
                                      <td style={{ padding: '10px 12px' }}>
                                        {ext.evidence_file_external?.length ? (
                                          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                                            {ext.evidence_file_external.length} file(s)
                                          </span>
                                        ) : <span style={{ color: '#9ca3af' }}>—</span>}
                                      </td>
                                      <td style={{ padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                          <button type="button" onClick={() => handleOpenEditExternal(ext)}
                                            style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                                            Edit
                                          </button>
                                          <button type="button" onClick={() => handleDeleteExternal(ext.id)}
                                            style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                                            Del
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </SectionCard>

                    <SectionCard title="Service Restoration">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Catat waktu layanan berhasil dipulihkan.</p>
                        <span style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                          background: form.servicerestored_time ? '#f0fdf4' : '#f3f4f6',
                          color: form.servicerestored_time ? '#16a34a' : '#6b7280',
                          border: `1px solid ${form.servicerestored_time ? '#bbf7d0' : '#e5e7eb'}`,
                        }}>
                          {form.servicerestored_time ? '✓ Restored' : '⏱ Belum Restored'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: form.servicerestored_time && restoredSeconds > 0 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <FieldLabel>Service Restored Time</FieldLabel>
                          <TextInput type="datetime-local" value={form.servicerestored_time} onChange={v => set('servicerestored_time', v)} readOnly={!isAdmin} />
                        </div>
                        {form.servicerestored_time && restoredSeconds > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                              { label: 'Total', value: fmtSeconds(restoredSeconds), color: '#2563eb', bg: '#eff6ff' },
                              { label: 'Internal', value: fmtSeconds(internalSeconds), color: '#0891b2', bg: '#ecfeff' },
                              { label: 'External', value: fmtSeconds(totalExternalSeconds), color: '#d97706', bg: '#fffbeb' },
                            ].map(({ label, value, color, bg }) => (
                              <div key={label} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: bg, borderRadius: 8, padding: '8px 12px',
                              }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
                                <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color, letterSpacing: 1 }}>{value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {showRestorationContent && (
                        <>
                          <div style={{ marginBottom: 16 }}>
                            <FieldLabel required>Resolution</FieldLabel>
                            <textarea
                              value={form.resolution}
                              onChange={e => set('resolution', e.target.value)}
                              readOnly={!canEdit}
                              rows={4}
                              placeholder="Jelaskan langkah-langkah resolusi..."
                              style={{
                                width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
                                borderRadius: 7, fontSize: 13, color: '#374151', resize: 'vertical',
                                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                                background: canEdit ? '#fff' : '#f9fafb', lineHeight: 1.6,
                              }}
                              onFocus={e => { if (canEdit) e.target.style.borderColor = '#2563eb'; }}
                              onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                            />
                          </div>
                          <FileUpload
                            label="Restoration Evidence"
                            onFilesChange={setNewRestoration}
                            maxFiles={5}
                            existingFiles={existingRestoration}
                            onExistingRemove={f => setExistingRestoration(prev => prev.filter(x => x !== f))}
                            storageFolder="restoration_evidence"
                          />
                        </>
                      )}
                    </SectionCard>

                    <SectionCard title="Root Cause Analysis (RCA)">
                      <RichTextEditor
                        value={form.rca}
                        onChange={v => set('rca', v)}
                        readOnly={!canEdit}
                      />
                    </SectionCard>
                  </>
                )}

                <div style={{
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                  padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    {selectedType === 'Incident' && !isClosed && (
                      <button
                        type="button"
                        onClick={handleCloseTicket}
                        style={{
                          padding: '8px 16px', borderRadius: 7, border: '1px solid #fecaca',
                          background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        Close Ticket
                      </button>
                    )}
                    {selectedType === 'Incident' && isClosed && (
                      <span style={{
                        padding: '6px 14px', borderRadius: 20, background: '#f3f4f6',
                        color: '#6b7280', fontSize: 12, fontWeight: 500,
                      }}>
                        Ticket Closed
                      </span>
                    )}
                    {(selectedType === 'Request' || selectedType === 'Activity') && (
                      <div>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Set Status Penyelesaian
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[
                            { status: 4, label: 'Done', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                            { status: 5, label: 'Done Partial', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                            { status: 6, label: 'Rollback', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                          ].map(({ status, label, color, bg, border }) => {
                            const isSelected = (pendingStatus ?? form.status) === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={isSelected}
                                onClick={() => handleSetStatus(status)}
                                style={{
                                  padding: '7px 14px', borderRadius: 7,
                                  border: `1px solid ${isSelected ? color : border}`,
                                  background: isSelected ? color : bg,
                                  color: isSelected ? '#fff' : color,
                                  fontSize: 12, fontWeight: 500,
                                  cursor: isSelected ? 'default' : 'pointer',
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/reports/${uuid}`)}
                      style={{
                        padding: '8px 16px', borderRadius: 7, border: '1px solid #e5e7eb',
                        background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      Kembali
                    </button>
                    {(isAdmin || !isClosed) && (
                      <button
                        type="submit"
                        disabled={saving || !isDirty}
                        style={{
                          padding: '8px 20px', borderRadius: 7, border: 'none',
                          background: (saving || !isDirty) ? '#93c5fd' : '#2563eb', color: '#fff',
                          fontSize: 13, fontWeight: 500, cursor: (saving || !isDirty) ? 'default' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          opacity: !isDirty ? 0.6 : 1,
                        }}
                      >
                        {saving ? (
                          <>
                            <span style={{
                              width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)',
                              borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
                              animation: 'spin 0.7s linear infinite',
                            }} />
                            Menyimpan...
                          </>
                        ) : 'Simpan Perubahan'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ position: 'sticky', top: 20 }}>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Preview Status</h2>
                  </div>
                  <div style={{ padding: '4px 20px 16px' }}>
                    {[
                      { label: 'Priority', value: form.severity || '—' },
                      { label: 'Status', value: statusInfo.label, valueColor: statusInfo.color },
                      { label: 'Application', value: form.apps || '—' },
                      { label: 'Assignee', value: form.assigned_other || form.assigned_to || '—' },
                    ].map(({ label, value, valueColor }) => (
                      <div key={label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 0', borderBottom: '1px solid #f3f4f6',
                      }}>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: valueColor ?? '#111827' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Catatan Perubahan</h2>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px', fontStyle: 'italic' }}>
                      Tersimpan lokal di perangkat ini saja, tidak dikirim ke server
                    </p>
                    <textarea
                      value={changeReason}
                      onChange={e => setChangeReason(e.target.value)}
                      placeholder="Tulis catatan pribadi tentang perubahan ini..."
                      rows={4}
                      style={{
                        width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
                        borderRadius: 7, fontSize: 13, color: '#374151', resize: 'vertical',
                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6,
                      }}
                      onFocus={e => (e.target.style.borderColor = '#2563eb')}
                      onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    />
                    {changeReason && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => setChangeReason('')}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#9ca3af', fontSize: 11, padding: 0, textDecoration: 'underline',
                          }}
                        >
                          Hapus catatan
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Ringkasan Penanganan</h2>
                  </div>
                  <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>External Team</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 12,
                        background: handledBy ? '#f0fdf4' : '#f3f4f6',
                        color: handledBy ? '#16a34a' : '#9ca3af',
                      }}>
                        {handledBy ? `${externalTeams.length} tim` : 'Belum aktif'}
                      </span>
                    </div>
                    {handledBy && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Durasi Eksternal</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#d97706', fontFamily: 'monospace' }}>
                          {fmtMinutes(totalExternalMinutes)}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Service Restoration</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 12,
                        background: form.servicerestored_time ? '#f0fdf4' : '#fffbeb',
                        color: form.servicerestored_time ? '#16a34a' : '#d97706',
                      }}>
                        {form.servicerestored_time ? 'Sudah dipulihkan' : 'Belum dipulihkan'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Bukti Downtime</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                        {existingDowntime.length + newDowntime.length} file
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Bukti Restorasi</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                        {existingRestoration.length + newRestoration.length} file
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showExternalModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowExternalModal(false); }}
        >
          <div style={{
            background: '#fff', borderRadius: 12, width: '90%', maxWidth: 600,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>
                {externalModalMode === 'add' ? 'Add External Team' : 'Edit External Team'}
              </h3>
              <button
                onClick={() => setShowExternalModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 20, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: externalModalMode === 'add' ? '1fr 1fr' : '1fr', gap: 14 }}>
                {externalModalMode === 'add' && (
                  <div>
                    <FieldLabel required>External Team</FieldLabel>
                    <SelectInput
                      value={extForm.external_team_id}
                      onChange={v => setExtForm(p => ({ ...p, external_team_id: v }))}
                      options={mstExternalTeams.map(t => ({ value: String(t.id), label: t.name }))}
                      placeholder="Pilih External Team"
                    />
                  </div>
                )}
                <div>
                  <FieldLabel>PIC Name</FieldLabel>
                  <TextInput value={extForm.pic} onChange={v => setExtForm(p => ({ ...p, pic: v }))} placeholder="Nama PIC" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <FieldLabel required>Start Time</FieldLabel>
                  <TextInput type="datetime-local" value={extForm.start_time} onChange={v => setExtForm(p => ({ ...p, start_time: v }))} required />
                </div>
                <div>
                  <FieldLabel>End Time</FieldLabel>
                  <TextInput type="datetime-local" value={extForm.end_time} onChange={v => setExtForm(p => ({ ...p, end_time: v }))} />
                </div>
              </div>
              <div>
                <FileUpload
                  label="Upload Evidence"
                  onFilesChange={setExtNewFiles}
                  maxFiles={5}
                  existingFiles={extExistingFiles}
                  onExistingRemove={f => setExtExistingFiles(prev => prev.filter(x => x !== f))}
                  storageFolder="external_evidence"
                />
              </div>
            </div>
            <div style={{
              padding: '14px 20px', borderTop: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
            }}>
              <button
                type="button"
                onClick={() => setShowExternalModal(false)}
                style={{
                  padding: '8px 16px', borderRadius: 7, border: '1px solid #e5e7eb',
                  background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExternal}
                disabled={savingExt}
                style={{
                  padding: '8px 20px', borderRadius: 7, border: 'none',
                  background: savingExt ? '#93c5fd' : '#2563eb', color: '#fff',
                  fontSize: 13, fontWeight: 500, cursor: savingExt ? 'default' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {savingExt ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    Saving...
                  </>
                ) : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportEdit;