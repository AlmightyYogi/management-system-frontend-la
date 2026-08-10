import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import useAuthStore from '../../store/authStore';

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Tidak Lengkap',
        text: 'Email dan password wajib diisi',
        confirmButtonColor: '#6366f1',
      });
      return;
    }

    setIsLoading(true);

    try {
      await login({ email, password });

      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil',
        text: 'Selamat datang kembali!',
        timer: 1500,
        showConfirmButton: false,
        willClose: () => {
          navigate('/dashboard');
        }
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: err.response?.data?.message || 'Periksa email dan password Anda',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a2035 0%, #1e2a45 60%, #2d3a5e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="text-center mb-4">
          <div
            className="mx-auto mb-3"
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="bi bi-shield-check text-white" style={{ fontSize: 26 }} />
          </div>
          <h4 className="text-white fw-bold mb-1">Management System</h4>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>Activity / Incident Report Tracker</p>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '2rem',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
          }}
        >
          <h5 className="fw-bold mb-1" style={{ color: '#1e293b' }}>Sign in</h5>
          <p className="text-muted small mb-4">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Email Address</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-envelope text-muted" style={{ fontSize: 14 }} />
                </span>
                <input
                  type="email"
                  className="form-control border-start-0"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ fontSize: 14 }}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-lock text-muted" style={{ fontSize: 14 }} />
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-control border-start-0 border-end-0"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ fontSize: 14 }}
                />
                <button
                  type="button"
                  className="input-group-text bg-light border-start-0"
                  onClick={() => setShowPw((v) => !v)}
                >
                  <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'} text-muted`} style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn w-100 py-2 fw-semibold"
              disabled={isLoading}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
              }}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Signing in...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-3 mb-0" style={{ fontSize: 13, color: '#64748b' }}>
            Don't have an account?{' '}
            <a href="/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;