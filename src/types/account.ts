export interface Account {
  id: number;
  uuid: string;
  name: string;
  email: string;
  username: string;
  image: string;
  phone: number;
  role_id: number;
  role_name: string;
  department: string;
  location: string;
  active: boolean;
  last_login_at: string;
}

export interface Role {
  id: number;
  name: string;
}

export const ROLE_META: Record<string, { icon: string; desc: string }> = {
  admin:  { icon: '🛡️', desc: 'Akses penuh ke semua fitur, termasuk manajemen akun dan konfigurasi sistem.' },
  viewer: { icon: '👁️',  desc: 'Hanya dapat melihat data. Tidak dapat membuat atau mengedit ticket.' },
  user:   { icon: '👤',  desc: 'Dapat membuat dan melihat ticket. Tidak dapat melakukan penugasan.' },
} as const;

export const AVATAR_BG = '#1e40af' as const;

export const ROLE_STYLE: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  Administrator: { label: 'Admin', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '⬤' },
  'IT Agent':    { label: 'Agent', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '👤' },
  'End User':    { label: 'User',  color: '#374151', bg: '#f9fafb', border: '#e5e7eb', icon: '👁️' },
} as const;

export const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  active:   { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  inactive: { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  pending:  { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
} as const;