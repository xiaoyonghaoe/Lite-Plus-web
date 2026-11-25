export type OptionItem = { value: string; label: string };

export type NodeStatRow = {
  node_uuid: string;
  node_name: string;
  up_bytes: number;
  down_bytes: number;
  total_bytes: number;
  share_pct: number;
};

export type InboundStatRow = {
  node_uuid: string;
  node_name: string;
  inbound_id: string;
  inbound_name: string;
  up_bytes: number;
  down_bytes: number;
  total_bytes: number;
  share_pct: number;
};

export type DomainBucketTotal = {
  bucket_ts: number;
  up_bytes: number;
  down_bytes: number;
  total_bytes: number;
};

export type DomainMatrixRow = {
  domain: string;
  up_bytes: number;
  down_bytes: number;
  total_bytes: number;
  bucket_bytes: number[];
};

export type StatsSummary = {
  enabled: boolean;
  days: number;
  start_day: string;
  end_day: string;
  top_n: number;
  retention_days: number;
  updated_at: number;
  tz_offset_sec: number;
  total_up_bytes: number;
  total_down_bytes: number;
  total_bytes: number;
  active_node_count: number;
  active_inbound_count?: number;
  nodes: NodeStatRow[];
  inbounds?: InboundStatRow[];
  domain_window: "30m" | "24h" | "7d" | "custom";
  domain_granularity_sec: number;
  domain_start_ts: number;
  domain_end_ts: number;
  domain_buckets: DomainBucketTotal[];
  top_domains: DomainMatrixRow[];
};

export const NODE_COLORS = [
  "#2563eb",
  "#3b82f6",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
];

export function formatBytes(bytes: number): string {
  const n = Number(bytes || 0);
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let idx = 0;
  let val = n;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  const digits = idx === 0 ? 0 : val >= 100 ? 0 : val >= 10 ? 1 : 2;
  return `${val.toFixed(digits)} ${units[idx]}`;
}

export function formatBucketLabel(ts: number, granSec: number): string {
  const d = new Date(ts * 1000);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  if (granSec >= 86400) {
    return `${mm}/${dd}`;
  }
  return `${hh}:${mi}`;
}

export function formatRangeHeader(startTs: number, endTs: number, granSec: number): string {
  if (!startTs || !endTs) return "";
  const s = new Date(startTs * 1000);
  const e = new Date(endTs * 1000);
  const pad = (v: number) => String(v).padStart(2, "0");
  const fmtDate = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (granSec >= 86400) {
    const eDisp = new Date((endTs - 1) * 1000);
    return `${fmtDate(s)} — ${fmtDate(eDisp)}`;
  }
  if (fmtDate(s) === fmtDate(e)) {
    return `${fmtDate(s)} ${fmtTime(s)} — ${fmtTime(e)}`;
  }
  return `${fmtDate(s)} ${fmtTime(s)} — ${fmtDate(e)} ${fmtTime(e)}`;
}

export function formatUpdatedTime(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const pad = (v: number) => String(v).padStart(2, "0");
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absH = Math.floor(Math.abs(offsetMin) / 60);
  const absM = Math.abs(offsetMin) % 60;
  const tz = absM ? `UTC${sign}${absH}:${pad(absM)}` : `UTC${sign}${absH}`;
  return `更新于 ${pad(d.getHours())}:${pad(d.getMinutes())} · ${tz}`;
}

export function granularityLabel(granSec: number): string {
  if (granSec >= 86400) return "1天";
  if (granSec >= 1800) return "30分钟";
  return "5分钟";
}

export function heatmapCellBg(value: number, maxValue: number, dark: boolean): string {
  if (value <= 0 || maxValue <= 0) return "transparent";
  const ratio = value / maxValue;
  if (dark) {
    if (ratio >= 0.75) return "rgba(59, 130, 246, 0.55)";
    if (ratio >= 0.45) return "rgba(59, 130, 246, 0.36)";
    if (ratio >= 0.2) return "rgba(59, 130, 246, 0.22)";
    return "rgba(59, 130, 246, 0.11)";
  }
  if (ratio >= 0.75) return "rgba(37, 99, 235, 0.42)";
  if (ratio >= 0.45) return "rgba(59, 130, 246, 0.28)";
  if (ratio >= 0.2) return "rgba(96, 165, 250, 0.18)";
  return "rgba(147, 197, 253, 0.12)";
}

export function toLocalDateTimeInput(d: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
