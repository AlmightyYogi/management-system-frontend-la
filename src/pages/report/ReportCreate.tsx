import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import useMasterData from '../../hooks/useMasterData';
import FileUpload from '../../components/common/FileUpload';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { Form } from '../../types/report';
import { PRIORITY_LABEL, SCOPE_LABEL } from '../../types/report';

type ReportType = 'Incident' | 'Request' | 'Activity' | '';

const STEPS = ['Informasi Dasar', 'Klasifikasi', 'Penugasan', 'Konfirmasi'];

const ReportCreate = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ReportType>('');
  const [saving, setSaving] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const { masterData, loading: masterLoading } = useMasterData(selectedType || 'Incident');

  const [form, setForm] = useState<Form>({
    requestor:       '',
    requestor_email: '',
    request_date:    '',
    report_time:     '',
    apps:            '',
    severity:        '',
    assigned_to:     '',
    assigned_other:  '',
    scope:           '',
    scope_other:     '',
    description:     '',
    status:          1,
  });

  useEffect(() => {
    setForm(prev => ({ ...prev, severity: '', assigned_to: '', assigned_other: '', scope: '', scope_other: '' }));
  }, [selectedType]);

  const set = (field: keyof Form, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const getSeverityOptions = (): string[] => {
    if (!masterData || !selectedType) return [];
    if (selectedType === 'Incident') return masterData.severities.map(s => s.name);
    if (selectedType === 'Request')  return masterData.priorities.map(p => p.name);
    return masterData.impacts.map(i => i.name);
  };

  const completeness = () => {
    const checks = [
      !!form.requestor, !!form.requestor_email, !!form.request_date, !!form.report_time,
      !!form.apps, !!form.severity,
      !!(form.assigned_to || form.assigned_other),
      !!(form.scope || form.scope_other),
      !!form.description,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.requestor || !form.requestor_email || !form.request_date || !form.report_time || !form.description) {
        Swal.fire({ icon: 'warning', title: 'Lengkapi Data', text: 'Semua field wajib pada bagian Informasi Dasar harus diisi.', confirmButtonColor: '#6366f1' });
        return false;
      }
    }
    if (step === 2) {
      if (!form.apps) {
        Swal.fire({ icon: 'warning', title: 'Pilih Aplikasi', text: 'Silakan pilih aplikasi terlebih dahulu.', confirmButtonColor: '#6366f1' });
        return false;
      }

      if (!selectedType) {
        Swal.fire({ icon: 'warning', title: 'Pilih Type', text: 'Silakan pilih type incident terlebih dahulu.', confirmButtonColor: '#6366f1' });
        return false;
      }
    }
    if (step === 3) {
      const finalAssigned = form.assigned_other.trim() || form.assigned_to;
      const finalScope    = form.scope_other.trim()    || form.scope;
      if (!form.severity || !finalAssigned || !finalScope) {
        Swal.fire({ icon: 'warning', title: 'Lengkapi Klasifikasi', text: 'Severity, Assigned To, dan Scope wajib diisi.', confirmButtonColor: '#6366f1' });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(s => Math.min(s + 1, 4));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('requestor',       form.requestor);
      fd.append('requestor_email', form.requestor_email);
      fd.append('request_date',    form.request_date);
      fd.append('report_time',     form.report_time);
      fd.append('apps',            form.apps);
      fd.append('type',            selectedType);
      fd.append('severity',        form.severity);
      fd.append('assigned_to',     form.assigned_other.trim() || form.assigned_to);
      fd.append('scope',           form.scope_other.trim()    || form.scope);
      fd.append('description',     form.description);
      fd.append('status',          '1');
      newFiles.forEach(f => fd.append('file_downtime_evidence[]', f));

      const res = await api.post('/reports', fd);
      const incident = res.data?.data?.incident ?? '';
      const assigned = form.assigned_other.trim() || form.assigned_to;

      await Swal.fire({
        html: `
          <div style="padding:12px 0">
            <div style="width:56px;height:56px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
              <svg width="28" height="28" fill="none" stroke="#059669" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h5 style="font-weight:700;color:#111827;margin-bottom:6px">Incident Berhasil Dibuat!</h5>
            <p style="color:#6366f1;font-weight:600;font-size:15px;margin-bottom:4px">${incident}</p>
            <p style="color:#6b7280;font-size:13px;margin-bottom:0">${form.requestor}<br>Ditugaskan ke ${assigned} · ${form.severity || 'N/A'}</p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Buat Incident Baru',
        confirmButtonColor: '#6366f1',
        showCancelButton: true,
        cancelButtonText: 'Kembali ke Daftar',
        cancelButtonColor: '#fff',
        customClass: {
          confirmButton: 'btn btn-primary px-4 me-2',
          cancelButton: 'btn btn-outline-secondary px-4',
          popup: 'shadow-lg rounded-4',
        },
        buttonsStyling: false,
      }).then(r => {
        if (r.isConfirmed) { 
          setStep(1); 
          setForm({ requestor:'', requestor_email:'', request_date:'', report_time:'', apps:'', severity:'', assigned_to:'', assigned_other:'', scope:'', scope_other:'', description:'', status:1 }); 
          setNewFiles([]); 
        } else navigate('/reports');
      });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal Membuat Incident', text: err.response?.data?.message || 'Terjadi kesalahan. Coba lagi.', confirmButtonColor: '#6366f1' });
    } finally {
      setSaving(false);
    }
  };

  const comp = completeness();

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>

          <div style={{ padding: '24px 32px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => navigate('/reports')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#94a3b8', borderRadius: 7 }}>
                <i className="bi bi-arrow-left" style={{ fontSize: 16 }} />
              </button>
              <div>
                <h5 style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: 17 }}>
                  Buat Incident Baru
                </h5>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>Isi informasi incident yang akan dilaporkan</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => navigate('/reports')} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                  fontSize: 13, color: '#64748b', cursor: 'pointer', fontWeight: 500,
                }}>
                  <i className="bi bi-x" /> Batal
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 0, paddingBottom: 0 }}>
              {STEPS.map((label, i) => {
                const isCompleted = step > i + 1;
                const isCurrent   = step === i + 1;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 'none', minWidth: 90 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isCompleted ? '#059669' : isCurrent ? '#6366f1' : '#e2e8f0',
                        color: isCompleted || isCurrent ? '#fff' : '#94a3b8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, transition: 'all .3s',
                      }}>
                        {isCompleted ? <i className="bi bi-check" style={{ fontSize: 13 }} /> : i + 1}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent ? '#6366f1' : isCompleted ? '#059669' : '#94a3b8',
                        whiteSpace: 'nowrap',
                      }}>{label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{
                        flex: 1, height: 2, margin: '0 4px',
                        marginTop: -20,
                        background: isCompleted ? '#059669' : '#e2e8f0',
                        transition: 'background .3s',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '28px 32px', minHeight: 380 }}>

            {step === 1 && (
              <div>
                <h6 style={{ fontWeight: 600, color: '#1e293b', marginBottom: 18, fontSize: 15 }}>Informasi Dasar</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <FieldLabel text="Requestor" required />
                    <input className="form-control" value={form.requestor}
                      placeholder="Nama requestor / pelapor"
                      onChange={e => set('requestor', e.target.value)} />
                    <small style={{ color: '#94a3b8', fontSize: 11 }}>Nama pelapor incident</small>
                  </div>
                  <div className="col-md-6">
                    <FieldLabel text="Email" required />
                    <input type="email" className="form-control" value={form.requestor_email}
                      placeholder="email@perusahaan.com"
                      onChange={e => set('requestor_email', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <FieldLabel text="Tanggal" required />
                    <input type="date" className="form-control" value={form.request_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => set('request_date', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <FieldLabel text="Start Time" required />
                    <input type="time" className="form-control" value={form.report_time}
                      onChange={e => set('report_time', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <FieldLabel text="Deskripsi Detail" required />
                    <textarea className="form-control" rows={4} value={form.description}
                      placeholder="Jelaskan gejala, waktu mulai terjadi, dan dampak yang dirasakan"
                      onChange={e => set('description', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <FieldLabel text="Lampiran" />
                    <FileUpload label="" onFilesChange={setNewFiles} maxFiles={5} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h6 style={{ fontWeight: 600, color: '#1e293b', marginBottom: 18, fontSize: 15 }}>Klasifikasi Incident</h6>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <FieldLabel text="Application" required />
                    {masterLoading ? <LoadingSpinner message="Loading..." /> : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(masterData?.apps ?? []).map(app => (
                          <div key={app.id} onClick={() => set('apps', app.name)} style={{
                            padding: '6px 14px', borderRadius: 20,
                            border: `1.5px solid ${form.apps === app.name ? '#6366f1' : '#e2e8f0'}`,
                            background: form.apps === app.name ? '#eff0ff' : '#fff',
                            color: form.apps === app.name ? '#6366f1' : '#374151',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all .15s',
                          }}>{app.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <FieldLabel text="Type" required />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {(['Incident','Request','Activity'] as ReportType[]).map(t => {
                        const col = t === 'Incident' ? '#dc2626' : t === 'Request' ? '#2563eb' : '#16a34a';
                        return (
                          <div key={t} onClick={() => setSelectedType(t)} style={{
                            padding: '8px 18px', borderRadius: 8,
                            border: `2px solid ${selectedType === t ? col : '#e2e8f0'}`,
                            background: selectedType === t ? col + '15' : '#fff',
                            color: selectedType === t ? col : '#374151',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                          }}>{t}</div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <FieldLabel text={selectedType ? PRIORITY_LABEL[selectedType] : 'Severity / Priority'} required />
                {masterLoading ? <LoadingSpinner message="Loading..." /> : (
                  <div className="row g-3">
                    {getSeverityOptions().map(opt => {
                      const isSel = form.severity === opt;
                      const isEmergency = opt.includes('1') || opt.includes('Emergency') || opt.includes('High');
                      const isHigh      = opt.includes('2') || opt.includes('Critical');
                      const isMed       = opt.includes('3') || opt.includes('Medium') || opt.includes('Major');
                      const isNoImpact  = opt.toLowerCase().includes('no impact');

                      const dotColor = isNoImpact  ? '#9ca3af'
                                    : isEmergency ? '#dc2626'
                                    : isHigh      ? '#d97706'
                                    : isMed       ? '#ca8a04'
                                    :               '#16a34a';

                      const label = isNoImpact  ? 'No Impact'
                                  : isEmergency ? 'Critical'
                                  : isHigh      ? 'High'
                                  : isMed       ? 'Medium'
                                  :               'Low';

                      const desc = isNoImpact  ? 'Tidak ada dampak pada operasional, bisa diabaikan atau dicatat saja'
                                : isEmergency ? 'Layanan utama tidak bisa digunakan oleh banyak user'
                                : isHigh      ? 'Dampak signifikan pada operasional, perlu penanganan segera'
                                : isMed       ? 'Gangguan terbatas, ada workaround yang bisa digunakan'
                                :               'Masalah minor atau pertanyaan, tidak mengganggu operasional';
                      return (
                        <div className="col-md-6" key={opt}>
                          <div onClick={() => set('severity', opt)} style={{
                            border: `2px solid ${isSel ? '#6366f1' : '#e2e8f0'}`,
                            borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                            background: isSel ? '#f0f4ff' : '#fff',
                            transition: 'all .15s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: dotColor, fontSize: 14 }}>{label}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <h6 style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6, fontSize: 15 }}>Penugasan</h6>

                <div className="row g-4 mb-4">
                  <div className="col-12">
                    <FieldLabel text="Assigned To" required />
                    {masterLoading ? <LoadingSpinner message="Loading..." /> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(masterData?.assigned_to ?? []).map(a => (
                          <label key={a.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', border: `2px solid ${form.assigned_to === a.name && !form.assigned_other ? '#6366f1' : '#e2e8f0'}`,
                            borderRadius: 10, cursor: 'pointer',
                            background: form.assigned_to === a.name && !form.assigned_other ? '#f0f4ff' : '#fff',
                            transition: 'all .15s',
                          }}>
                            <input type="radio" name="assigned" checked={form.assigned_to === a.name && !form.assigned_other}
                              onChange={() => { set('assigned_to', a.name); set('assigned_other', ''); }}
                              style={{ accentColor: '#6366f1' }} />
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: '#6366f1', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700,
                            }}>
                              {a.name.split(' ').slice(0,2).map((w:string) => w[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{a.name}</div>
                            </div>
                          </label>
                        ))}
                        {/* <label style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', border: `2px solid ${form.assigned_other ? '#6366f1' : '#e2e8f0'}`,
                          borderRadius: 10, cursor: 'pointer',
                          background: form.assigned_other ? '#f0f4ff' : '#fff',
                          transition: 'all .15s',
                        }}>
                          <input type="radio" name="assigned" checked={!!form.assigned_other}
                            onChange={() => { set('assigned_to', ''); }}
                            style={{ accentColor: '#6366f1' }} />
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: '#e2e8f0', color: '#94a3b8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                          }}>?</div>
                          <input type="text" placeholder="Others (specify)" value={form.assigned_other}
                            onClick={() => set('assigned_to', '')}
                            onChange={e => { set('assigned_other', e.target.value); if (e.target.value) set('assigned_to', ''); }}
                            style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, background: 'transparent', color: '#1e293b' }} />
                        </label> */}
                      </div>
                    )}
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-12">
                    <FieldLabel text={selectedType ? SCOPE_LABEL[selectedType] : 'Scope'} required />
                    {masterLoading ? <LoadingSpinner message="Loading..." /> : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(masterData?.scopes ?? []).map(s => {
                          const isSelected = form.scope === s.name && !form.scope_other;
                          return (
                            <div
                              key={s.id}
                              onClick={() => { set('scope', s.name); set('scope_other', ''); }}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 20,
                                border: `1.5px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`,
                                background: isSelected ? '#eff0ff' : '#fff',
                                color: isSelected ? '#6366f1' : '#374151',
                                fontSize: 12,
                                fontWeight: isSelected ? 600 : 400,
                                cursor: 'pointer',
                                transition: 'all .15s',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {s.name}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <i className="bi bi-info-circle" style={{ color: '#6366f1', fontSize: 17 }} />
                  <h6 style={{ fontWeight: 600, color: '#1e293b', margin: 0, fontSize: 15 }}>Konfirmasi & Review</h6>
                </div>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>Periksa kembali detail incident sebelum menyimpan.</p>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  {[
                    ['Requestor',     form.requestor],
                    ['Email',         form.requestor_email],
                    ['Tanggal',       form.request_date],
                    ['Jam',           form.report_time],
                    ['Application',   form.apps],
                    ['Type',          selectedType],
                    ['Severity',      form.severity],
                    ['Assigned To',   form.assigned_other || form.assigned_to],
                    ['Scope',         form.scope_other || form.scope],
                    ['Deskripsi',     form.description],
                  ].map(([label, val], idx) => (
                    <div key={label} style={{
                      display: 'flex', padding: '11px 18px',
                      background: idx % 2 === 0 ? '#fff' : '#fafafa',
                      borderBottom: idx < 9 ? '1px solid #f1f5f9' : 'none',
                    }}>
                      <span style={{ width: 140, fontSize: 13, color: '#94a3b8', flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{val || <em style={{ color: '#d1d5db' }}>Belum diisi</em>}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 32px', borderTop: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <button onClick={prevStep} disabled={step === 1} style={{
              padding: '8px 20px', background: step === 1 ? '#f8fafc' : '#fff',
              border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13,
              color: step === 1 ? '#d1d5db' : '#475569', cursor: step === 1 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
            }}>
              <i className="bi bi-arrow-left" /> Kembali
            </button>
            {step < 4 ? (
              <button onClick={nextStep} style={{
                padding: '8px 28px', background: '#6366f1', border: 'none',
                borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                Lanjut <i className="bi bi-arrow-right" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} style={{
                padding: '8px 28px', background: saving ? '#a5b4fc' : '#6366f1', border: 'none',
                borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {saving ? <><span className="spinner-border spinner-border-sm" /> Menyimpan...</> : <><i className="bi bi-check2-circle" /> Simpan Incident</>}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ width: 230, flexShrink: 0 }}>

        {/* Ringkasan */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', padding: '18px', marginBottom: 14 }}>
          <h6 style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, marginBottom: 14 }}>Ringkasan</h6>
          {[
            { label: 'Requestor',  value: form.requestor       || null },
            { label: 'Severity',   value: form.severity        || null },
            { label: 'Application', value: form.apps           || null },
            { label: 'Assignee',   value: form.assigned_other || form.assigned_to || null },
            { label: 'Type',       value: selectedType },
            { label: 'Scope',      value: form.scope_other || form.scope || null },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: value ? '#1e293b' : '#d1d5db', textAlign: 'right', maxWidth: 120, wordBreak: 'break-word' }}>
                {value ?? '—'}
              </span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Kelengkapan form</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{comp}%</span>
          </div>
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: comp === 100 ? '#059669' : '#6366f1',
              width: `${comp}%`, transition: 'width .4s ease',
            }} />
          </div>
          {comp === 100 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#059669', fontWeight: 500 }}>
              <i className="bi bi-check-circle me-1" /> Form sudah lengkap
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const FieldLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>
    {text}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
  </label>
);

export default ReportCreate;