import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => {
    const p = form.new_password;
    if (!p) return { score: 0, label: '', color: '#e5e7eb' };
    let score = 0;
    if (p.length >= 6) score += 1;
    if (p.length >= 10) score += 1;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;

    if (score <= 2) return { score, label: 'Lemah', color: '#ef4444' };
    if (score <= 3) return { score, label: 'Sedang', color: '#f59e0b' };
    return { score, label: 'Kuat', color: '#16a34a' };
  }, [form.new_password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.current_password || !form.new_password || !form.confirm_password) {
      Swal.fire({ icon: 'warning', title: 'Lengkapi data', text: 'Semua field wajib diisi' });
      return;
    }
    if (form.new_password.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Password lemah', text: 'Password baru minimal 6 karakter' });
      return;
    }
    if (form.new_password !== form.confirm_password) {
      Swal.fire({ icon: 'warning', title: 'Tidak cocok', text: 'Konfirmasi password tidak sama' });
      return;
    }

    setSaving(true);
    try {
      await api.put('/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Password telah diubah',
        timer: 1500,
        showConfirmButton: false,
      });
      navigate(-1);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: err.response?.data?.message || 'Gagal mengubah password',
      });
    } finally {
      setSaving(false);
    }
  };

  const inputWrap: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 44px 11px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  const eyeBtn: React.CSSProperties = {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: 16,
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const field = (
    key: 'current_password' | 'new_password' | 'confirm_password',
    label: string,
    showKey: 'current' | 'next' | 'confirm',
    hint?: string,
  ) => (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: '#374151',
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      <div style={inputWrap}>
        <input
          type={show[showKey] ? 'text' : 'password'}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          required
          autoComplete={key === 'current_password' ? 'current-password' : 'new-password'}
          style={inputStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2563eb';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          type="button"
          aria-label={show[showKey] ? 'Sembunyikan password' : 'Tampilkan password'}
          onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
          style={eyeBtn}
        >
          <i className={`bi ${show[showKey] ? 'bi-eye-slash' : 'bi-eye'}`} />
        </button>
      </div>
      {hint && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>{hint}</div>
      )}
    </div>
  );

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        minHeight: '100%',
        background: '#f9fafb',
        padding: '28px 16px',
      }}
    >
      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '7px 12px',
            marginBottom: 16,
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          ← Kembali
        </button>

        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#111827' }}>
            Ubah Password
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0' }}>
            Masukkan password lama, lalu tentukan password baru Anda
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: '24px 22px',
          }}
        >
          {field('current_password', 'Password saat ini', 'current')}

          {field(
            'new_password',
            'Password baru',
            'next',
            'Minimal 6 karakter. Disarankan kombinasi huruf, angka, dan simbol.',
          )}

          {/* Strength meter */}
          {form.new_password.length > 0 && (
            <div style={{ marginTop: -8, marginBottom: 18 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  marginBottom: 6,
                }}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 99,
                      background:
                        i <= strength.score ? strength.color : '#e5e7eb',
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: strength.color }}>
                Kekuatan: {strength.label}
              </div>
            </div>
          )}

          {field('confirm_password', 'Konfirmasi password baru', 'confirm')}

          {form.confirm_password.length > 0 &&
            form.new_password !== form.confirm_password && (
              <div
                style={{
                  marginTop: -10,
                  marginBottom: 14,
                  fontSize: 12,
                  color: '#dc2626',
                  fontWeight: 500,
                }}
              >
                Konfirmasi password belum sama
              </div>
            )}

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 12,
              color: '#64748b',
              marginBottom: 18,
              lineHeight: 1.45,
            }}
          >
            Setelah password diganti, gunakan password baru saat login berikutnya.
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: saving ? '#93c5fd' : '#2563eb',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;