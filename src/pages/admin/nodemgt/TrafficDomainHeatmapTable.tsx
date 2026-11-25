import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useMemo } from "react";
import {
  formatBucketLabel,
  formatBytes,
  heatmapCellBg,
  type DomainBucketTotal,
  type DomainMatrixRow,
} from "./TrafficStatsHelpers";

type Props = {
  enabled: boolean;
  granularitySec: number;
  buckets: DomainBucketTotal[];
  domains: DomainMatrixRow[];
};

export default function TrafficDomainHeatmapTable({
  enabled,
  granularitySec,
  buckets,
  domains,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const stickyBg = theme.palette.background.paper;
  const stickyHeadBg = isDark ? "#1e293b" : "#f8fafc";

  const maxCellBytes = useMemo(() => {
    let m = 0;
    for (const row of domains) {
      for (const v of row.bucket_bytes) {
        if (v > m) m = v;
      }
    }
    return m;
  }, [domains]);

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 1 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            主域名流量 Top 20
          </Typography>
          <Typography variant="caption" color="text.secondary">
            按当前时间范围总流量降序。
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            时段流量热力：低
          </Typography>
          {[0.15, 0.3, 0.55, 0.85].map((r) => (
            <Box
              key={r}
              sx={{
                width: 12,
                height: 12,
                borderRadius: 0.5,
                bgcolor: heatmapCellBg(r * 100, 100, isDark),
                border: "1px solid",
                borderColor: "divider",
              }}
            />
          ))}
          <Typography variant="caption" color="text.secondary">
            高
          </Typography>
        </Stack>
      </Stack>

      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
        <Box
          component="table"
          sx={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: 12.5,
            fontVariantNumeric: "tabular-nums",
            "& th, & td": {
              px: 1.25,
              py: 0.85,
              borderBottom: "1px solid",
              borderColor: "divider",
              whiteSpace: "nowrap",
            },
            "& thead th": { bgcolor: stickyHeadBg, fontWeight: 600, color: "text.secondary" },
            "& tbody tr:last-of-type td": { borderBottom: "none" },
          }}
        >
          <thead>
            <tr>
              <Box component="th" sx={{ position: "sticky", left: 0, zIndex: 3, width: 46, textAlign: "center" }}>
                排名
              </Box>
              <Box
                component="th"
                sx={{
                  position: "sticky",
                  left: 46,
                  zIndex: 3,
                  minWidth: 168,
                  textAlign: "left",
                  borderRight: "1px solid",
                  borderColor: "divider",
                }}
              >
                主域名
              </Box>
              {buckets.map((b) => (
                <Box component="th" key={b.bucket_ts} sx={{ textAlign: "right", minWidth: 72 }}>
                  {formatBucketLabel(b.bucket_ts, granularitySec)}
                </Box>
              ))}
              <Box
                component="th"
                sx={{
                  position: "sticky",
                  right: 176,
                  zIndex: 3,
                  minWidth: 82,
                  textAlign: "right",
                  borderLeft: "1px solid",
                  borderColor: "divider",
                }}
              >
                上传
              </Box>
              <Box component="th" sx={{ position: "sticky", right: 90, zIndex: 3, minWidth: 86, textAlign: "right" }}>
                下载
              </Box>
              <Box component="th" sx={{ position: "sticky", right: 0, zIndex: 3, minWidth: 90, textAlign: "right" }}>
                总流量 ↓
              </Box>
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 ? (
              <tr>
                <Box component="td" colSpan={buckets.length + 5} sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
                  {enabled ? "当前筛选条件下暂无域名流量数据" : "统计已关闭，开启右上角开关后自动采集"}
                </Box>
              </tr>
            ) : (
              domains.map((row, idx) => (
                <tr key={row.domain}>
                  <Box
                    component="td"
                    sx={{ position: "sticky", left: 0, zIndex: 2, bgcolor: stickyBg, textAlign: "center", color: "text.secondary" }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      position: "sticky",
                      left: 46,
                      zIndex: 2,
                      bgcolor: stickyBg,
                      fontFamily: "monospace",
                      fontWeight: 600,
                      borderRight: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {row.domain}
                  </Box>
                  {buckets.map((b, bIdx) => {
                    const val = row.bucket_bytes[bIdx] || 0;
                    return (
                      <Box
                        component="td"
                        key={b.bucket_ts}
                        sx={{
                          textAlign: "right",
                          bgcolor: heatmapCellBg(val, maxCellBytes, isDark),
                          color: val > 0 ? "text.primary" : "text.disabled",
                        }}
                      >
                        {val > 0 ? formatBytes(val) : "—"}
                      </Box>
                    );
                  })}
                  <Box
                    component="td"
                    sx={{
                      position: "sticky",
                      right: 176,
                      zIndex: 2,
                      bgcolor: stickyBg,
                      textAlign: "right",
                      borderLeft: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {formatBytes(row.up_bytes)}
                  </Box>
                  <Box component="td" sx={{ position: "sticky", right: 90, zIndex: 2, bgcolor: stickyBg, textAlign: "right" }}>
                    {formatBytes(row.down_bytes)}
                  </Box>
                  <Box
                    component="td"
                    sx={{ position: "sticky", right: 0, zIndex: 2, bgcolor: stickyBg, textAlign: "right", fontWeight: 700 }}
                  >
                    {formatBytes(row.total_bytes)}
                  </Box>
                </tr>
              ))
            )}
          </tbody>
        </Box>
      </Box>

      <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          显示前20个主域名 · 按总流量排序
        </Typography>
        <Typography variant="caption" color="text.secondary">
          数据仅保留7天，过期自动清理。
        </Typography>
      </Stack>
    </>
  );
}
