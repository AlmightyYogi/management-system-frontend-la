import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import type { Role } from '../../types/account';
import { ROLE_META } from '../../types/account';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
      {children}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
    </label>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const labels = ['', 'Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'];
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= score ? colors[score] : '#e5e7eb',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      {score > 0 && <p style={{ fontSize: 11, color: colors[score], margin: 0 }}>{labels[score]}</p>}
    </div>
  );
}

const AccountCreate = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [roleId, setRoleId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/master')
      .then(res => {
        const data = res.data?.data?.roles ?? [];
        setRoles(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setRoles([
          { id: 1, name: 'admin' },
          { id: 2, name: 'viewer' },
          { id: 3, name: 'user' },
        ]);
      });
  }, []);

  const selectedRole = roles.find(r => r.id === roleId);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      Swal.fire({ icon: 'warning', title: 'Format tidak didukung', text: 'Hanya file .jpg dan .png yang diizinkan' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleId) {
      Swal.fire({ icon: 'warning', title: 'Role diperlukan', text: 'Pilih role untuk akun ini.', confirmButtonColor: '#6366f1' });
      return;
    }
    if (password.length < 8) {
      Swal.fire({ icon: 'warning', title: 'Password terlalu pendek', text: 'Password minimal 8 karakter.', confirmButtonColor: '#6366f1' });
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('email', email);
      fd.append('password', password);
      fd.append('role_id', roleId.toString());
      if (phone) fd.append('phone', phone);
      if (image) fd.append('image', image);

      await api.post('/register', fd);

      await Swal.fire({
        html: `
          <div style="padding:12px 0">
            <div style="width:56px;height:56px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
              <svg width="28" height="28" fill="none" stroke="#059669" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h5 style="font-weight:700;color:#111827;margin-bottom:6px">Akun Berhasil Dibuat!</h5>
            <p style="color:#6366f1;font-weight:600;font-size:15px;margin-bottom:4px">${name}</p>
            <p style="color:#6b7280;font-size:13px;margin-bottom:0">${email} · Role: ${selectedRole?.name ?? ''}</p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Buat Akun Lagi',
        confirmButtonColor: '#6366f1',
        showCancelButton: true,
        cancelButtonText: 'Kembali ke Daftar',
        customClass: {
          confirmButton: 'btn btn-primary px-4 me-2',
          cancelButton: 'btn btn-outline-secondary px-4',
          popup: 'shadow-lg rounded-4',
        },
        buttonsStyling: false,
      }).then(r => {
        if (r.isConfirmed) {
          setName(''); setEmail(''); setPassword(''); setPhone(''); setImage(null); setImagePreview(''); setRoleId(null);
        } else {
          navigate('/accounts');
        }
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal membuat akun',
        text: err.response?.data?.message || 'Terjadi kesalahan.',
        confirmButtonColor: '#6366f1',
      });
    } finally {
      setSaving(false);
    }
  };

  const initials = name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '??';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/accounts')} style={{ background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#6b7280', padding: '6px 10px', borderRadius: 8, fontSize: 15 }}>←</button>
        <div>
          <h5 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Buat Akun Baru</h5>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Tambahkan user baru ke sistem</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h6 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Informasi Akun</h6>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FieldLabel required>Nama Lengkap</FieldLabel>
                  <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Masukkan nama lengkap" required style={{ fontSize: 13 }} />
                </div>
                <div>
                  <FieldLabel required>Email</FieldLabel>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@perusahaan.com"
                    required
                    autoComplete="off"
                    style={{ fontSize: 13 }}
                    />
                </div>
                <div>
                  <FieldLabel>Nomor Telepon</FieldLabel>
                  <input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0812xxxxxxxx" style={{ fontSize: 13 }} />
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h6 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Role & Hak Akses</h6>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {roles.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>Memuat roles...</div>
                ) : roles.map(role => {
                  const isSelected = roleId === role.id;
                  const meta = ROLE_META[role.name.toLowerCase()] ?? { icon: '👤', desc: 'Role pengguna.' };
                  return (
                    <div key={role.id} onClick={() => setRoleId(role.id)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`,
                      background: isSelected ? '#f0f4ff' : '#fff',
                      transition: 'all .15s',
                    }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: `2px solid ${isSelected ? '#6366f1' : '#d1d5db'}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSelected && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#6366f1' }} />}
                      </div>
                      <span style={{ fontSize: 18, marginTop: 0 }}>{meta.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 2, textTransform: 'capitalize' }}>{role.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{meta.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Password */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h6 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Keamanan Akun</h6>
              </div>
              <div style={{ padding: '20px' }}>
                <FieldLabel required>Password</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    required
                    autoComplete="new-password"
                    style={{ fontSize: 13, paddingRight: 40 }}
                    />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 15, padding: 0 }}>{showPassword ? '🙈' : '👁️'}</button>
                </div>
                {password && <PasswordStrength password={password} />}
              </div>
            </div>
          </div>

          <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h6 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Preview Akun</h6>
              </div>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div 
                  style={{ 
                    width: 120, height: 120, borderRadius: '50%', background: '#e2e8f0', 
                    overflow: 'hidden', margin: '0 auto 16px', border: '4px solid #e2e8f0',
                    position: 'relative', cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('imageUpload')?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: '#94a3b8' }}>
                      {initials}
                    </div>
                  )}
                  <input 
                    id="imageUpload" 
                    type="file" 
                    accept="image/jpeg,image/png" 
                    onChange={handleImageChange} 
                    style={{ display: 'none' }} 
                  />
                </div>
                <small style={{ color: '#64748b', fontSize: 12 }}>Klik area gambar untuk upload (JPG/PNG)</small>

                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 12 }}>{name || 'Nama Pengguna'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{email || 'email@perusahaan.com'}</div>
                {selectedRole && <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#eff0ff', color: '#6366f1', border: '1px solid #c7d2fe' }}>{ROLE_META[selectedRole.name.toLowerCase()]?.icon} {selectedRole.name}</span>}
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#1d4ed8', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span>ℹ️</span>
              <span>Akun baru akan langsung aktif setelah disimpan. Pastikan informasi sudah benar sebelum melanjutkan.</span>
            </div>

            <button type="submit" disabled={saving} style={{ width: '100%', padding: '11px 0', borderRadius: 9, border: 'none', background: saving ? '#a5b4fc' : '#6366f1', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <>Menyimpan...</> : <><i className="bi bi-person-plus me-1" /> Buat Akun</>}
            </button>
            <button type="button" onClick={() => navigate('/accounts')} style={{ width: '100%', padding: '10px 0', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Batal</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AccountCreate;