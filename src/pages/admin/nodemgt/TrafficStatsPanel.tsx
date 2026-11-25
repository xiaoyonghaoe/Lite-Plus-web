import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { ArrowDown, ArrowUp, RefreshCw } from "@/components/admin/muiIcons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRPC2Call } from "@/contexts/RPC2Context";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import TrafficDomainAnalysisCard, { type DomainWindow } from "./TrafficDomainAnalysisCard";
import {
  formatBytes,
  formatUpdatedTime,
  NODE_COLORS,
  toLocalDateTimeInput,
  type OptionItem,
  type StatsSummary,
} from "./TrafficStatsHelpers";

export default function TrafficStatsPanel({
  inboundOptions,
  userOptions,
}: {
  nodeOptions: OptionItem[];
  inboundOptions: OptionItem[];
  userOptions: OptionItem[];
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { call } = useRPC2Call();

  const [days, setDays] = useState<number>(7);
  const [userFilter, setUserFilter] = useState<string>("");
  const [domainInbound, setDomainInbound] = useState<string>("");
  const [windowKey, setWindowKey] = useState<DomainWindow>("30m");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date(Date.now() - 2 * 3600 * 1000);
    return toLocalDateTimeInput(d);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => toLocalDateTimeInput(new Date()));
  const [appliedCustom, setAppliedCustom] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [summary, setSummary] = useState<StatsSummary | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        days,
        user_id: userFilter,
        domain_inbound_id: domainInbound,
        window: windowKey,
        search: debouncedSearch,
      };
      if (windowKey === "custom" && appliedCustom.start > 0 && appliedCustom.end > 0) {
        params.start_ts = appliedCustom.start;
        params.end_ts = appliedCustom.end;
      }
      const res = await call("admin:nodemgt.stats.summary", params);
      if (res && typeof res === "object") {
        setSummary(res as StatsSummary);
      }
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
    }
  }, [appliedCustom.end, appliedCustom.start, call, days, debouncedSearch, domainInbound, userFilter, windowKey]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const enabled = Boolean(summary?.enabled);
  useVisibleInterval(() => {
    void loadSummary();
  }, enabled ? 15_000 : null);

  const toggleEnabled = async (next: boolean) => {
    setSaving(true);
    try {
      await call("admin:nodemgt.stats.config.set", { enabled: next });
      await loadSummary();
    } finally {
      setSaving(false);
    }
  };

  const applyCustomRange = () => {
    const s = Math.floor(new Date(customStart).getTime() / 1000);
    const e = Math.floor(new Date(customEnd).getTime() / 1000);
    if (Number.isFinite(s) && Number.isFinite(e) && s > 0 && e >= s) {
      setAppliedCustom({ start: s, end: e });
    }
  };

  const inboundRows = summary?.inbounds ?? [];
  const totalBytes = summary?.total_bytes ?? 0;
  const totalUp = summary?.total_up_bytes ?? 0;
  const totalDown = summary?.total_down_bytes ?? 0;
  const dateRangeText = useMemo(() => {
    if (!summary?.start_day || !summary?.end_day) return "";
    return `[${summary.start_day.replace(/-/g, "/")} — ${summary.end_day.replace(/-/g, "/")}]`;
  }, [summary?.end_day, summary?.start_day]);

  return (
    <Stack spacing={2.25}>
      {/* Top Header */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between" }}
      >
        <AdminPageTitle description="查看当前用户的节点用量与域名流量分布。">流量概览</AdminPageTitle>
        <Stack spacing={0.5} sx={{ alignItems: { xs: "flex-start", md: "flex-end" } }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: "center",
                px: 1,
                py: 0.35,
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                统计开关
              </Typography>
              <Switch
                size="small"
                checked={enabled}
                disabled={saving}
                onChange={(e) => void toggleEnabled(e.target.checked)}
              />
              <Chip
                size="small"
                label={enabled ? "已开启" : "已关闭"}
                color={enabled ? "success" : "default"}
                variant={enabled ? "filled" : "outlined"}
                sx={{ height: 20, fontSize: 11 }}
              />
            </Stack>
            <TextField
              select
              size="small"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              sx={{ minWidth: 168 }}
            >
              <MenuItem value="">当前用户：全部用户</MenuItem>
              {userOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  当前用户：{opt.label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshCw size={14} />}
              disabled={loading}
              onClick={() => void loadSummary()}
            >
              刷新
            </Button>
          </Stack>
          {summary?.updated_at ? (
            <Typography variant="caption" color="text.secondary">
              {formatUpdatedTime(summary.updated_at)}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      {/* Section 1: 节点用量统计 */}
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.25 }, borderRadius: 2.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", mb: 1.75 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            节点用量统计
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">
              统计范围
            </Typography>
            <TextField
              select
              size="small"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value={7}>最近7天 {days === 7 ? dateRangeText : ""}</MenuItem>
              <MenuItem value={3}>最近3天 {days === 3 ? dateRangeText : ""}</MenuItem>
              <MenuItem value={1}>最近1天 {days === 1 ? dateRangeText : ""}</MenuItem>
            </TextField>
          </Stack>
        </Stack>

        {/* KPI Row */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
            gap: 1.5,
            p: 1.75,
            mb: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#fafcff",
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              近{days}天总流量
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, fontVariantNumeric: "tabular-nums" }}>
              {formatBytes(totalBytes)}
            </Typography>
          </Box>
          <Box sx={{ borderLeft: { md: "1px solid" }, borderColor: "divider", pl: { md: 2 } }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "#2563eb" }}>
              <ArrowDown size={14} />
              <Typography variant="caption" color="text.secondary">下载流量</Typography>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.25, fontVariantNumeric: "tabular-nums" }}>
              {formatBytes(totalDown)}
            </Typography>
          </Box>
          <Box sx={{ borderLeft: { md: "1px solid" }, borderColor: "divider", pl: { md: 2 } }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "#14b8a6" }}>
              <ArrowUp size={14} />
              <Typography variant="caption" color="text.secondary">上传流量</Typography>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.25, fontVariantNumeric: "tabular-nums" }}>
              {formatBytes(totalUp)}
            </Typography>
          </Box>
          <Stack
            direction="row"
            sx={{
              borderLeft: { md: "1px solid" },
              borderColor: "divider",
              pl: { md: 2 },
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">有流量节点</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.25 }}>
                {summary?.active_inbound_count ?? inboundRows.length} <Typography component="span" variant="body2">个</Typography>
              </Typography>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ display: { xs: "none", lg: "block" } }}>
              流量 = 上传 + 下载
            </Typography>
          </Stack>
        </Box>

        {/* Node Distribution Split */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
          节点流量分布
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(240px, 1fr) minmax(0, 2fr)" },
            gap: 2.5,
            alignItems: "start",
          }}
        >
          {/* Left: Segmented Bar + Legend */}
          <Box>
            <Box
              sx={{
                display: "flex",
                width: "100%",
                height: 14,
                borderRadius: 1,
                overflow: "hidden",
                bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                mb: 1.5,
              }}
            >
              {inboundRows.map((n, i) => (
                <Box
                  key={`${n.node_uuid}:${n.inbound_id}`}
                  title={`${n.inbound_name || n.inbound_id}: ${n.share_pct.toFixed(1)}%`}
                  sx={{
                    width: `${Math.max(n.share_pct, 0.5)}%`,
                    bgcolor: NODE_COLORS[i % NODE_COLORS.length],
                  }}
                />
              ))}
            </Box>
            <Stack spacing={0.85}>
              {inboundRows.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  {enabled ? "暂无节点流量记录" : "统计已关闭"}
                </Typography>
              ) : (
                inboundRows.map((n, i) => (
                  <Stack key={`${n.node_uuid}:${n.inbound_id}`} direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: NODE_COLORS[i % NODE_COLORS.length], flexShrink: 0 }} />
                      <Typography variant="body2" noWrap>{n.inbound_name || n.inbound_id}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {n.share_pct.toFixed(1)}%
                    </Typography>
                  </Stack>
                ))
              )}
            </Stack>
          </Box>

          {/* Right: Node Usage Table */}
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>节点名称</TableHead>
                  <TableHead className="text-right">上传</TableHead>
                  <TableHead className="text-right">下载</TableHead>
                  <TableHead className="text-right">总流量 ↓</TableHead>
                  <TableHead className="text-right">占比</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inboundRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      {enabled ? "暂无节点流量数据" : "统计已关闭，开启右上角开关后自动采集"}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {inboundRows.map((row, idx) => (
                      <TableRow key={`${row.node_uuid}:${row.inbound_id}`}>
                        <TableCell className="font-medium">
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: NODE_COLORS[idx % NODE_COLORS.length], flexShrink: 0 }} />
                            <span>{row.inbound_name || row.inbound_id}</span>
                            {row.node_name ? (
                              <Typography component="span" variant="caption" color="text.secondary">
                                ({row.node_name})
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatBytes(row.up_bytes)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBytes(row.down_bytes)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatBytes(row.total_bytes)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
                            <span>{row.share_pct.toFixed(1)}%</span>
                            <Box sx={{ width: 64, height: 6, borderRadius: 1, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0", overflow: "hidden" }}>
                              <Box sx={{ width: `${Math.min(row.share_pct, 100)}%`, height: "100%", bgcolor: NODE_COLORS[idx % NODE_COLORS.length] }} />
                            </Box>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold">合计</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">{formatBytes(totalUp)}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">{formatBytes(totalDown)}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">{formatBytes(totalBytes)}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">{totalBytes > 0 ? "100%" : "0%"}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Paper>

      {/* Section 2: 域名流量分析 */}
      <TrafficDomainAnalysisCard
        enabled={enabled}
        nodeOptions={inboundOptions}
        domainNode={domainInbound}
        onDomainNodeChange={setDomainInbound}
        search={search}
        onSearchChange={setSearch}
        windowKey={windowKey}
        onWindowChange={setWindowKey}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        onApplyCustom={applyCustomRange}
        granularitySec={summary?.domain_granularity_sec ?? 300}
        startTs={summary?.domain_start_ts ?? 0}
        endTs={summary?.domain_end_ts ?? 0}
        buckets={summary?.domain_buckets ?? []}
        domains={summary?.top_domains ?? []}
      />
    </Stack>
  );
}
