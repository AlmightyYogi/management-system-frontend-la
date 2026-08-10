import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { ROLE_META } from '../../types/account';
import resolveStorageUrl from '../../utils/storage';

const AccountEdit = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role_id === 1;

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role_id: 0,
    active: true,
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    api.get(`/accounts/${uuid}`)
      .then(res => {
        const data = res.data.data ?? res.data;
        if (!data) {
          Swal.fire({ icon: 'error', title: 'Not Found', text: 'Akun tidak ditemukan' });
          navigate('/accounts');
          return;
        }
        setAccount(data);
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          role_id: data.role_id || 3,
          active: data.active !== false,
        });
        if (data.image) setImagePreview(resolveStorageUrl(data.image));
      })
      .catch(err => {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Akun tidak ditemukan atau terjadi kesalahan' });
        navigate('/accounts');
      })
      .finally(() => setLoading(false));
  }, [uuid, navigate]);

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
  setSaving(true);

  try {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('email', form.email);
    if (form.phone) fd.append('phone', form.phone);
    fd.append('role_id', form.role_id.toString());
    fd.append('active', form.active.toString());
    
    if (image) {
      fd.append('image', image);
    }

    await api.put(`/accounts/${uuid}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Akun telah diperbarui' });
    navigate('/accounts');
  } catch (err: any) {
    Swal.fire({ 
      icon: 'error', 
      title: 'Gagal', 
      text: err.response?.data?.message || 'Terjadi kesalahan' 
    });
  } finally {
    setSaving(false);
  }
};

  const initials = form.name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '??';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/accounts')} style={{ background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#6b7280', padding: '6px 10px', borderRadius: 8, fontSize: 15 }}>←</button>
        <div>
          <h5 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Edit Akun</h5>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Ubah informasi akun pengguna</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Informasi Akun */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h6 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Informasi Akun</h6>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Nama Lengkap <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Nomor Telepon</label>
                  <input type="tel" className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ fontSize: 13 }} />
                </div>
              </div>
            </div>

            {/* Role & Hak Akses */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h6 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Role & Hak Akses</h6>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(id => {
                  const name = id === 1 ? 'admin' : id === 2 ? 'viewer' : 'user';
                  const isSelected = form.role_id === id;
                  const meta = ROLE_META[name] ?? { icon: '👤', desc: 'Role pengguna.' };
                  return (
                    <div key={id} onClick={() => isAdmin && setForm({ ...form, role_id: id })} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 16px', borderRadius: 10, cursor: isAdmin ? 'pointer' : 'default',
                      border: `2px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`,
                      background: isSelected ? '#f0f4ff' : '#fff',
                      transition: 'all .15s',
                      opacity: !isAdmin && !isSelected ? 0.6 : 1
                    }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: `2px solid ${isSelected ? '#6366f1' : '#d1d5db'}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSelected && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#6366f1' }} />}
                      </div>
                      <span style={{ fontSize: 18, marginTop: 0 }}>{meta.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 2, textTransform: 'capitalize' }}>{name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{meta.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Akun */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h6 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Status Akun</h6>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Status Akun</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Aktif / Non-Aktif</div>
                  </div>
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={form.active} 
                      onChange={e => setForm({ ...form, active: e.target.checked })} 
                      disabled={!isAdmin} 
                      style={{ width: 48, height: 26, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
                    />
                  </div>
                </div>
                {!isAdmin && (
                  <small className="text-muted mt-2 d-block">Hanya Administrator yang dapat mengubah status akun</small>
                )}
              </div>
            </div>
          </div>

          {/* Preview Area dengan Upload Image */}
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
                    position: 'relative', cursor: isAdmin ? 'pointer' : 'default'
                  }}
                  onClick={() => isAdmin && document.getElementById('editImageUpload')?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: '#94a3b8' }}>
                      {initials}
                    </div>
                  )}
                  {isAdmin && (
                    <input 
                      id="editImageUpload" 
                      type="file" 
                      accept="image/jpeg,image/png" 
                      onChange={handleImageChange} 
                      style={{ display: 'none' }} 
                    />
                  )}
                </div>
                <small style={{ color: '#64748b', fontSize: 12 }}>Klik area gambar untuk ganti foto (JPG/PNG)</small>

                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 12 }}>{form.name || 'Nama Pengguna'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{form.email || 'email@perusahaan.com'}</div>
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#1d4ed8', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span>ℹ️</span>
              <span>Hanya Admin yang dapat mengubah status aktif/non-aktif akun.</span>
            </div>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-secondary flex-fill" onClick={() => navigate('/accounts')}>Batal</button>
              <button type="submit" className="btn btn-primary flex-fill" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AccountEdit;