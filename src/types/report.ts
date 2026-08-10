type ReportType = 'Incident' | 'Request' | 'Activity';

export interface MstSeverity {
  id: number;
  name: string;
  level: number;
  is_active: boolean;
}

export interface MstApp {
  id: number;
  name: string;
  is_active: boolean;
}

export interface MstAssignedTo {
  id: number;
  name: string;
  is_active: boolean;
}

export interface MstScope {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
}

export interface MstExternalTeam {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface MstImpact {
  id: number;
  name: string;
  is_active: boolean;
}

export interface MstPriority {
  id: number;
  name: string;
  level: number;
  is_active: boolean;
}

export interface MasterData {
  severities: MstSeverity[];
  apps: MstApp[];
  assigned_to: MstAssignedTo[];
  scopes: MstScope[];
  external_teams: MstExternalTeam[];
  impacts: MstImpact[];
  priorities: MstPriority[];
}

export interface Report {
  id: number;
  uuid: string;
  incident: string;
  requestor: string;
  requestor_email: string;
  request_date: string;
  report_time: string;
  apps: string;
  type: 'Incident' | 'Request' | 'Activity';
  severity: string;
  assigned_to: string;
  scope: string;
  description: string;
  resolution?: string;
  rca?: string;
  status: number;
  handled_by: number;
  response_time?: string;
  servicerestored_time?: string;
  restored_time?: number;
  total_internal_duration?: number;
  resolved_time?: string;
  closed_at?: string;
  file_downtime_evidence?: string[];
  restoration_evidence?: string[];
  created_at: string;
  updated_at: string;
}

export interface MstExternalTeam {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface ExternalTeam {
  id: number;
  report_id: number;
  external_team_id: number;
  pic: string;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  total_external_duration: number | null;
  evidence_file_external: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Form {
  requestor: string;
  requestor_email: string;
  request_date: string;
  report_time: string;
  apps: string;
  severity: string;
  assigned_to: string;
  assigned_other: string;
  scope: string;
  scope_other: string;
  description: string;
  status: number;
}

export interface ChatMessage {
  id: string;
  authorId?: string | number;
  authorName: string;
  authorInitials: string;
  authorRole: string;
  content: string;
  timestamp: string;
  isInternal: boolean;
  avatarColor: string;
  authorImage?: string;
}

export interface Stats {
  totalOpen: number;
  inProgress: number;
  resolvedToday: number;
  slaBreached: number;
  avgResolutionHours: number;
  activeAgents: number;
}

export interface AppRow {
  id: string;
  name: string;
  avail: string;
}

export interface TicketRow {
  id: string;
  ticketNo: string;
  content: string;
}

export interface RangeSummary {
  incidents: number;
  requests: number;
  activities: number;
  ticketNos: string[];
}

export type ReportMode = 'daily' | 'weekly';

export const REPORT_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Closed', color: 'danger' },
  1: { label: 'Open', color: 'success' },
  2: { label: 'Restored', color: 'warning' },
  4: { label: 'Done', color: 'primary' },
  5: { label: 'Done Partial', color: 'info' },
  6: { label: 'Rollback', color: 'dark' },
} as const;

export const COLORS = {
  incident: '#ef4444',
  request:  '#3b82f6',
  activity: '#10b981',
  primary:  '#6366f1',
  green:    '#22c55e',
  orange:   '#f97316',
  purple:   '#8b5cf6',
} as const;

export const STATUS_MAP: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Closed',       color: '#6b7280', bg: '#f3f4f6' },
  1: { label: 'Open',         color: '#2563eb', bg: '#eff6ff' },
  2: { label: 'Restored',     color: '#d97706', bg: '#fffbeb' },
  4: { label: 'Done',         color: '#059669', bg: '#ecfdf5' },
  5: { label: 'Done Partial', color: '#d97706', bg: '#fffbeb' },
  6: { label: 'Rollback',     color: '#dc2626', bg: '#fef2f2' },
} as const;

export const PRIORITY_LABEL: Record<ReportType, string> = {
  Incident: 'Severity Level',
  Request:  'Priority Level',
  Activity: 'Impact',
} as const;

export const SCOPE_LABEL: Record<ReportType, string> = {
  Incident: 'Scope',
  Request:  'Scope',
  Activity: 'Type Activity',
} as const;

export const REPORT_STATUS_MAP: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Closed',       color: '#6b7280', bg: '#f3f4f6' },
  1: { label: 'Open',         color: '#2563eb', bg: '#eff6ff' },
  2: { label: 'Restored',     color: '#d97706', bg: '#fffbeb' },
  4: { label: 'Done',         color: '#059669', bg: '#ecfdf5' },
  5: { label: 'Done Partial', color: '#d97706', bg: '#fffbeb' },
  6: { label: 'Rollback',     color: '#dc2626', bg: '#fef2f2' },
} as const;

export const SEVERITY_COLOR: Record<string, { dot: string; label: string; bg: string }> = {
  '1 - Emergency (Full Down)':    { dot: '#dc2626', label: 'Critical',  bg: '#fef2f2' },
  '2 - Critical (Major Full Down)': { dot: '#d97706', label: 'High',    bg: '#fffbeb' },
  '3 - Major (Partial Issue)':    { dot: '#d97706', label: 'Medium',    bg: '#fefce8' },
  '4 - Minor':                    { dot: '#16a34a', label: 'Low',        bg: '#f0fdf4' },
} as const;

export const steps = [
  { icon: 'bi-database',   label: 'Menghitung Data'  },
  { icon: 'bi-gear',       label: 'Memproses'         },
  { icon: 'bi-file-excel', label: 'Membuat File'      },
  { icon: 'bi-download',   label: 'Mengunduh'         },
] as const;

export const DEFAULT_APPS: { name: string; avail: string }[] = [
  { name: 'My Dashboard',     avail: '100%' },
  { name: 'B2B Portal',       avail: '100%' },
  { name: 'SQA Portal',       avail: '100%' },
  { name: 'SECM Portal',      avail: '100%' },
  { name: 'MPR',              avail: '100%' },
  { name: 'PSSHUB',           avail: '100%' },
  { name: 'DBEST',            avail: '100%' },
  { name: 'SARAS',            avail: '100%' },
  { name: 'IOT Middleware',   avail: '100%' },
] as const;