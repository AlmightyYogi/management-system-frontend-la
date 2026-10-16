export type DelayCategory = '0s' | '1s-5s' | '5s-1m' | '1m-5m' | '>5m';

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
  dtu?: string;
  report_time?: number;
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

export type VSSMinuteTraffic = {
  minute: string;
  counts: Record<string, number>;
  total: number;
};

export type VSSTrafficDetail = {
  totals: Record<string, number>;
  total_messages: number;
  current_minute: VSSMinuteTraffic;
  series: VSSMinuteTraffic[];
  tracked_actions: string[];
};

export type VSSDaySummaryDevice = {
  device_id: string;
  device_name: string;
  max_delay_sec: number;
  event_count: number;
};

export type VSSDaySummary = {
  date: string;
  total_devices: number;
  delay_over_5_count: number;
  total_events: number;
  max_delay_sec: number;
  max_delay_device: string;
  max_delay_device_id: string;
  distribution: Record<string, number>;
  top_devices: VSSDaySummaryDevice[];
};

export interface VSSDeviceLive {
  device_id: string;
  device_name: string;
  detected_at: string;
  node_id?: string;
  dtu?: string;
  report_time?: number;
  is_later?: boolean;
  delay_sec: number;
  last_seen?: string;
  action?: string;
  status: string;
  reasons?: string[];
  cpu?: string;
  storage_free?: string;
}

export interface VSSTrafficStats {
  total_messages: number;
  total_80003: number;
  total_80004: number;
  device_count: number;
  normal_count: number;
  issue_count: number;
}

export interface VSSLiveResult {
  traffic: VSSTrafficStats;
  data: VSSDeviceLive[];
  total: number;
}

export const REASON_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'stale_timestamp', label: 'Stale Timestamp' },
  { value: 'no_heartbeat', label: 'No Heartbeat' },
  { value: 'disconnect', label: 'Disconnect' },
  { value: 'storage_full', label: 'Storage Full' },
  { value: 'high_cpu', label: 'High CPU' },
  { value: 'alarm', label: 'Alarm' },
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

export const DELAY_CATEGORY_LABEL: Record<DelayCategory, string> = {
  '0s': '0 detik (SLA)',
  '1s-5s': '1 – 5 detik',
  '5s-1m': '5 detik – 1 menit',
  '1m-5m': '1 – 5 menit',
  '>5m': 'Di atas 5 menit',
} as const;

export const DELAY_CATEGORY_COLOR: Record<DelayCategory, string> = {
  '0s': '#10b981',
  '1s-5s': '#84cc16',
  '5s-1m': '#f59e0b',
  '1m-5m': '#f97316',
  '>5m': '#ef4444',
} as const;

export const TRAFFIC_COLORS: Record<string, string> = {
  '80003': '#22c55e',
  '80004': '#eab308',
  '80005': '#ef4444',
  '80007': '#06b6d4',
  '80030': '#8b5cf6',
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