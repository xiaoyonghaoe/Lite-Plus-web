import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "@/components/admin/muiIcons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRPC2Call } from "@/contexts/RPC2Context";

type OptionItem = { value: string; label: string };

type InboundStatRow = {
  node_uuid: string;
  node_name: string;
  inbound_id: string;
  inbound_name: string;
  up_bytes: number;
  down_bytes: number;
  total_bytes: number;
};

type UserInboundStatRow = {
  node_uuid: string;
  node_name: string;
  inbound_id: string;
  inbound_name: string;
  user_id: string;
  user_name: string;
  up_bytes: number;
  down_bytes: number;
  total_bytes: number;
};

type DomainStatRow = {
  node_uuid: string;
  node_name: string;
  inbound_id: string;
  inbound_name: string;
  domain: string;
  bytes: number;
};

type StatsSummary = {
  enabled: boolean;
  days: number;
  top_n: number;
  total_up_bytes: number;
  total_down_bytes: number;
  total_bytes: number;
  inbounds: InboundStatRow[];
  user_inbounds: UserInboundStatRow[];
  top_domains: DomainStatRow[];
};

function formatBytes(bytes: number): string {
  const n = Number(bytes || 0);
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let idx = 0;
  let val = n;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val >= 100 || idx === 0 ? val.toFixed(0) : val.toFixed(2)} ${units[idx]}`;
}

export default function TrafficStatsPanel({
  nodeOptions,
  inboundOptions,
  userOptions,
}: {
  nodeOptions: OptionItem[];
  inboundOptions: OptionItem[];
  userOptions: OptionItem[];
}) {
  const { call } = useRPC2Call();
  const [days, setDays] = useState<number>(7);
  const [nodeFilter, setNodeFilter] = useState<string>("");
  const [inboundFilter, setInboundFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [summary, setSummary] = useState<StatsSummary | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await call("admin:nodemgt.stats.summary", {
        days,
        node_uuid: nodeFilter,
        inbound_id: inboundFilter,
        user_id: userFilter,
      });
      if (res && typeof res === "object") {
        setSummary(res as StatsSummary);
      }
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
    }
  }, [call, days, inboundFilter, nodeFilter, userFilter]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const toggleEnabled = async (next: boolean) => {
    setSaving(true);
    try {
      await call("admin:nodemgt.stats.config.set", { enabled: next });
      await loadSummary();
    } finally {
      setSaving(false);
    }
  };

  const enabled = Boolean(summary?.enabled);
  const inbounds = summary?.inbounds ?? [];
  const userInbounds = summary?.user_inbounds ?? [];
  const domains = summary?.top_domains ?? [];

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: { xs: 1.5, md: 2 }, borderRadius: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{
          mb: 2,
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              多维流量统计（用户 / 入站 / 虚拟入站 / Top-15 域名）
            </Typography>
            <Chip
              size="small"
              label={enabled ? "已开启" : "已关闭"}
              color={enabled ? "success" : "default"}
              variant={enabled ? "filled" : "outlined"}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            关闭时探针端零开销；开启后自动热下发至所有节点，按天聚合用户、入站与 Top-15 根域名流量（保留 30 天）。
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              统计开关
            </Typography>
            <Switch
              size="small"
              checked={enabled}
              disabled={saving}
              onChange={(e) => void toggleEnabled(e.target.checked)}
            />
          </Stack>
          <TextField
            select
            size="small"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            sx={{ minWidth: 96 }}
          >
            <MenuItem value={1}>近 1 天</MenuItem>
            <MenuItem value={7}>近 7 天</MenuItem>
            <MenuItem value={30}>近 30 天</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">全部用户</MenuItem>
            {userOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">全部节点</MenuItem>
            {nodeOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={inboundFilter}
            onChange={(e) => setInboundFilter(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">全部入站（含虚拟）</MenuItem>
            {inboundOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
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
      </Stack>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          用户 × 入站流量统计（总计 {formatBytes(summary?.total_bytes || 0)}）
        </Typography>
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "auto" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>节点</TableHead>
                <TableHead>入站（含虚拟）</TableHead>
                <TableHead className="text-right">上行</TableHead>
                <TableHead className="text-right">下行</TableHead>
                <TableHead className="text-right">总流量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userInbounds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    {enabled ? "暂无用户流量数据" : "统计已关闭，开启开关后将自动采集"}
                  </TableCell>
                </TableRow>
              ) : (
                userInbounds.map((row) => (
                  <TableRow key={`${row.user_id}:${row.node_uuid}:${row.inbound_id}`}>
                    <TableCell className="font-medium">{row.user_name || row.user_id}</TableCell>
                    <TableCell>{row.node_name || row.node_uuid}</TableCell>
                    <TableCell>{row.inbound_name || row.inbound_id}</TableCell>
                    <TableCell className="text-right">{formatBytes(row.up_bytes)}</TableCell>
                    <TableCell className="text-right">{formatBytes(row.down_bytes)}</TableCell>
                    <TableCell className="text-right font-medium">{formatBytes(row.total_bytes)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            入站 / 虚拟入站汇总流量
          </Typography>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>节点</TableHead>
                  <TableHead>入站</TableHead>
                  <TableHead className="text-right">上行</TableHead>
                  <TableHead className="text-right">下行</TableHead>
                  <TableHead className="text-right">总流量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inbounds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      {enabled ? "暂无入站流量数据" : "统计已关闭，开启开关后将自动采集"}
                    </TableCell>
                  </TableRow>
                ) : (
                  inbounds.map((row) => (
                    <TableRow key={`${row.node_uuid}:${row.inbound_id}`}>
                      <TableCell>{row.node_name || row.node_uuid}</TableCell>
                      <TableCell>{row.inbound_name || row.inbound_id}</TableCell>
                      <TableCell className="text-right">{formatBytes(row.up_bytes)}</TableCell>
                      <TableCell className="text-right">{formatBytes(row.down_bytes)}</TableCell>
                      <TableCell className="text-right font-medium">{formatBytes(row.total_bytes)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            域名 × 入站流量 Top-15
          </Typography>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>域名</TableHead>
                  <TableHead>入站</TableHead>
                  <TableHead className="text-right">总流量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      {enabled ? "暂无域名流量数据" : "统计已关闭，开启开关后将自动采集"}
                    </TableCell>
                  </TableRow>
                ) : (
                  domains.map((row, idx) => (
                    <TableRow key={`${row.node_uuid}:${row.inbound_id}:${row.domain}`}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{row.domain}</TableCell>
                      <TableCell>{row.inbound_name || row.inbound_id}</TableCell>
                      <TableCell className="text-right font-medium">{formatBytes(row.bytes)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
