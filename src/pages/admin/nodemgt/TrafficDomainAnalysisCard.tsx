import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Search } from "@/components/admin/muiIcons";
import TrafficDomainHeatmapTable from "./TrafficDomainHeatmapTable";
import {
  formatBucketLabel,
  formatBytes,
  formatRangeHeader,
  granularityLabel,
  toLocalDateTimeInput,
  type DomainBucketTotal,
  type DomainMatrixRow,
  type OptionItem,
} from "./TrafficStatsHelpers";

export type DomainWindow = "30m" | "24h" | "7d" | "custom";

type Props = {
  enabled: boolean;
  nodeOptions: OptionItem[];
  domainNode: string;
  onDomainNodeChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  windowKey: DomainWindow;
  onWindowChange: (val: DomainWindow) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (val: string) => void;
  onCustomEndChange: (val: string) => void;
  onApplyCustom: () => void;
  granularitySec: number;
  startTs: number;
  endTs: number;
  buckets: DomainBucketTotal[];
  domains: DomainMatrixRow[];
};

export default function TrafficDomainAnalysisCard({
  enabled,
  nodeOptions,
  domainNode,
  onDomainNodeChange,
  search,
  onSearchChange,
  windowKey,
  onWindowChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  onApplyCustom,
  granularitySec,
  startTs,
  endTs,
  buckets,
  domains,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const chartData = useMemo(
    () =>
      buckets.map((b) => ({
        label: formatBucketLabel(b.bucket_ts, granularitySec),
        bucket_ts: b.bucket_ts,
        down_bytes: b.down_bytes,
        up_bytes: b.up_bytes,
        total_bytes: b.total_bytes,
        total_label: b.total_bytes > 0 ? formatBytes(b.total_bytes) : "",
      })),
    [buckets, granularitySec],
  );

  const minCustomInput = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return toLocalDateTimeInput(d);
  }, []);
  const maxCustomInput = useMemo(() => toLocalDateTimeInput(new Date()), []);
  const showBarTopLabels = chartData.length <= 12;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.25 }, borderRadius: 2.5 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", mb: 1.75 }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "baseline" } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            域名流量分析
          </Typography>
          <Typography variant="caption" color="text.secondary">
            按主域名合并子域名 · 仅保留最近7天。
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            select
            size="small"
            value={domainNode}
            onChange={(e) => onDomainNodeChange(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">全部节点</MenuItem>
            {nodeOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索已收录主域名"
            sx={{ width: { xs: 180, sm: 210 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={14} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.25}
        sx={{ alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", mb: 1.25 }}
      >
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <ButtonGroup size="small" variant="outlined">
            {(
              [
                { key: "30m", label: "最近30分钟" },
                { key: "24h", label: "最近24小时" },
                { key: "7d", label: "最近7天" },
                { key: "custom", label: "自定义" },
              ] as const
            ).map((item) => (
              <Button
                key={item.key}
                variant={windowKey === item.key ? "contained" : "outlined"}
                onClick={() => onWindowChange(item.key)}
                sx={{ fontWeight: windowKey === item.key ? 600 : 500 }}
              >
                {item.label}
              </Button>
            ))}
          </ButtonGroup>
          <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {formatRangeHeader(startTs, endTs, granularitySec)}
          </Typography>
        </Stack>
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`当前粒度：${granularityLabel(granularitySec)}`}
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      {windowKey === "custom" ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            mb: 1.5,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
            alignItems: { sm: "center" },
          }}
        >
          <TextField
            size="small"
            type="datetime-local"
            label="开始时间"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: minCustomInput, max: maxCustomInput },
            }}
          />
          <TextField
            size="small"
            type="datetime-local"
            label="结束时间"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: minCustomInput, max: maxCustomInput },
            }}
          />
          <Button size="small" variant="contained" onClick={onApplyCustom}>
            应用范围
          </Button>
        </Stack>
      ) : null}

      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{
          flexWrap: "wrap",
          alignItems: "center",
          mb: 2,
          px: 1.25,
          py: 0.75,
          borderRadius: 1.5,
          bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          按记录年龄自动聚合：
        </Typography>
        <Chip size="small" variant="outlined" label="30分钟内: 5分钟" sx={{ height: 22, fontSize: 11 }} />
        <Chip size="small" variant="outlined" label="30分钟—1天: 30分钟" sx={{ height: 22, fontSize: 11 }} />
        <Chip size="small" variant="outlined" label="1天—7天: 1天" sx={{ height: 22, fontSize: 11 }} />
        <Typography variant="caption" color="text.secondary" sx={{ ml: { md: 0.5 } }}>
          （保留最近7天数据，超过7天的记录自动清理，不提供更早的历史数据。）
        </Typography>
      </Stack>

      <Box sx={{ mb: 2.5, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            时段总流量
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "#2563eb" }} />
              <Typography variant="caption" color="text.secondary">下载</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "#14b8a6" }} />
              <Typography variant="caption" color="text.secondary">上传</Typography>
            </Stack>
          </Stack>
        </Stack>
        <Box sx={{ width: "100%", height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
                interval={chartData.length > 24 ? 3 : 0}
              />
              <YAxis
                tickFormatter={(v) => formatBytes(Number(v))}
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
                width={66}
              />
              <Tooltip
                cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as (typeof chartData)[number];
                  return (
                    <Paper elevation={3} sx={{ px: 1.25, py: 0.75, borderRadius: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.25 }}>
                        {label}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", color: "#2563eb" }}>
                        下载：{formatBytes(row.down_bytes)}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", color: "#14b8a6" }}>
                        上传：{formatBytes(row.up_bytes)}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", fontWeight: 600, mt: 0.25 }}>
                        总流量：{formatBytes(row.total_bytes)}
                      </Typography>
                    </Paper>
                  );
                }}
              />
              <Bar dataKey="down_bytes" stackId="a" fill="#2563eb" maxBarSize={56} />
              <Bar dataKey="up_bytes" stackId="a" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {showBarTopLabels ? (
                  <LabelList
                    dataKey="total_label"
                    position="top"
                    style={{ fontSize: 11, fontWeight: 600, fill: theme.palette.text.primary }}
                  />
                ) : null}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <TrafficDomainHeatmapTable
        enabled={enabled}
        granularitySec={granularitySec}
        buckets={buckets}
        domains={domains}
      />
    </Paper>
  );
}
