export type VSSDelayEvent = {
  detected_at: string;
  device_id: string;
  device_name: string;
  node_id?: string;
  dtu: string;
  report_time: number;
  is_later: boolean;
  delay_sec: number;
  reason: string;
  message: string;
  action?: string;
  alarm_id?: string;
  alarm_detail?: string;
  event_type?: string;
};

export type VSSAlertHistory = {
  id: number;
  detected_at: string;
  device_id: string;
  device_name: string;
  node_id?: string;
  dtu: string;
  report_time: number;
  action?: string;
  alarm_id?: string;
  alarm_detail?: string;
  event_type?: string;
  is_later: boolean;
  delay_sec: number;
  reason: string;
  message: string;
  email_sent: boolean;
  year_month: string;
  created_at: string;
};

export type VSSListMeta = {
  data: VSSDelayEvent[];
  total: number;
  page: number;
  per_page: number;
};

export type VSSHistoryListMeta = {
  data: VSSAlertHistory[];
  total: number;
  page: number;
  per_page: number;
};

export type VSSDelayQuery = {
  date?: string;
  reason?: string;
  device_id?: string;
  device_name?: string;
  page?: number;
  per_page?: number;
};

export type VSSHistoryQuery = {
  year_month?: string;
  reason?: string;
  device_id?: string;
  device_name?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
};

export type DeviceStatRow = {
  device_id: string;
  device_name: string;
  total: number;
  by_reason: Record<string, number>;
};

export const REASON_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'stale_timestamp', label: 'Stale Timestamp' },
  { value: 'no_heartbeat', label: 'No Heartbeat' },
  { value: 'disconnect', label: 'Disconnect' },
  { value: 'storage_full', label: 'Storage Full' },
  { value: 'high_cpu', label: 'High CPU' },
  { value: 'alarm', label: 'Alarm (80004)' },
] as const;

export const REASON_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  delayed: { bg: '#fffbeb', color: '#d97706', label: 'Delayed' },
  stale_timestamp: { bg: '#ffedd5', color: '#c2410c', label: 'Stale' },
  no_heartbeat: { bg: '#fef2f2', color: '#dc2626', label: 'No Heartbeat' },
  disconnect: { bg: '#fef2f2', color: '#991b1b', label: 'Disconnect' },
  storage_full: { bg: '#f5f3ff', color: '#7c3aed', label: 'Storage Full' },
  high_cpu: { bg: '#eef2ff', color: '#4338ca', label: 'High CPU' },
  alarm: { bg: '#fef2f2', color: '#b91c1c', label: 'Alarm' },
} as const;

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 7,
  fontSize: 12,
  outline: 'none',
  color: '#1e293b',
} as const;

export const clearBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 7,
  fontSize: 12,
  color: '#64748b',
  cursor: 'pointer',
  marginTop: 4,
} as const;

export const btnOutline: React.CSSProperties = {
  padding: '7px 14px',
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  color: '#475569',
  display: 'inline-flex',
  alignItems: 'center',
  fontWeight: 500,
} as const;

export const btnPrimary: React.CSSProperties = {
  padding: '7px 16px',
  background: '#6366f1',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  color: '#fff',
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
} as const;

export const thStyle: React.CSSProperties = {
  padding: '11px 14px',
  fontSize: 11,
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
  textAlign: 'left',
} as const;

export const tdStyle: React.CSSProperties = {
  padding: '13px 14px',
  fontSize: 13,
  color: '#64748b',
  whiteSpace: 'nowrap',
} as const;