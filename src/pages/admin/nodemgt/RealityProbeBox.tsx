import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { Activity, Globe, RefreshCw, Shuffle, XCircle } from "@/components/admin/muiIcons";
import { settingsFieldSx } from "@/components/admin/SettingsChrome";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRPC2Call } from "@/contexts/RPC2Context";

type RealityProbeResult = {
  dest: string;
  server_name: string;
  local: boolean;
  reachable: boolean;
  ok: boolean;
  rtt_ms: number;
  tls_version?: string;
  tls13: boolean;
  alpn?: string;
  h2: boolean;
  cert_valid: boolean;
  cert_error?: string;
  cert_subject?: string;
  cert_issuer?: string;
  cert_sans?: string[];
  cert_not_after?: string;
  cert_chain_bytes?: number;
  warnings?: string[];
  error?: string;
  results?: RealityProbeResult[];
};

export function isLocalRealityDest(dest: string): boolean {
  const s = (dest || "").trim().toLowerCase();
  if (!s) return false;
  return (
    s === "127.0.0.1" ||
    s.startsWith("127.0.0.1:") ||
    s === "localhost" ||
    s.startsWith("localhost:") ||
    s === "::1" ||
    s.startsWith("[::1]:")
  );
}

function extractHost(dest: string): string {
  const s = (dest || "").trim();
  if (!s) return "";
  if (s.startsWith("[")) {
    const end = s.indexOf("]");
    if (end > 1) return s.slice(1, end);
  }
  const idx = s.indexOf(":");
  return idx > 0 ? s.slice(0, idx) : s;
}

function isRawIP(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  if (h.includes(":")) return true;
  return false;
}

export default function RealityProbeBox({
  nodeUUID,
  dest,
  serverName,
  onDestChange,
  onSelectPreset,
  onSelectLocalFallback,
  onFillSNI,
}: {
  nodeUUID: string;
  dest: string;
  serverName: string;
  presets: readonly string[];
  onDestChange: (nextDest: string) => void;
  onSelectPreset: (presetDest: string, host: string) => void;
  onSelectLocalFallback: (localDest: string) => void;
  onFillSNI: (sni: string) => void;
}) {
  const { call } = useRPC2Call();
  const [probing, setProbing] = useState(false);
  const [result, setResult] = useState<RealityProbeResult | null>(null);
  const [rpcError, setRpcError] = useState<string>("");

  // Scanner modal state
  const [scanOpen, setScanOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResults, setScanResults] = useState<RealityProbeResult[]>([]);

  useEffect(() => {
    setResult(null);
    setRpcError("");
  }, [nodeUUID, dest, serverName]);

  // Inline probe for the current target field.
  // For remote domain targets (not loopback and not raw IP), default SNI to the
  // target domain itself so a stale/mismatched SNI field does not cause TLS EOF.
  const runInlineProbe = async () => {
    if (!nodeUUID || !dest.trim()) return;
    setProbing(true);
    setRpcError("");
    setResult(null);
    const trimmedDest = dest.trim();
    const host = extractHost(trimmedDest);
    const effectiveSNI =
      isLocalRealityDest(trimmedDest) || isRawIP(host)
        ? serverName.trim()
        : host;
    try {
      const res = await call("admin:nodemgt.reality.probe", {
        node_uuid: nodeUUID,
        dest: trimmedDest,
        server_name: effectiveSNI,
      });
      if (res && typeof res === "object") {
        setResult(res as RealityProbeResult);
      }
    } catch (err: any) {
      setRpcError(err?.message || String(err || "探测失败"));
    } finally {
      setProbing(false);
    }
  };

  const runScanner = async (overrideInput?: string) => {
    if (!nodeUUID) return;
    setScanning(true);
    setScanError("");
    const query = (overrideInput !== undefined ? overrideInput : scanInput).trim();
    const targets = query
      ? query.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
      : [];
    try {
      const res = await call("admin:nodemgt.reality.probe", {
        node_uuid: nodeUUID,
        scan: true,
        targets,
        server_name: serverName.trim(),
      });
      if (res && typeof res === "object") {
        const parsed = res as RealityProbeResult;
        setScanResults(Array.isArray(parsed.results) ? parsed.results : [parsed]);
      }
    } catch (err: any) {
      setScanError(err?.message || String(err || "扫描失败"));
    } finally {
      setScanning(false);
    }
  };

  const openScanner = () => {
    setScanOpen(true);
    if (scanResults.length === 0) {
      void runScanner("");
    }
  };

  const applyScannedRow = (row: RealityProbeResult) => {
    if (row.local) {
      onSelectLocalFallback(row.dest);
      const validSan = (row.cert_sans || []).find((d) => d && !d.startsWith("*"));
      if (validSan && !serverName.trim()) {
        onFillSNI(validSan);
      }
    } else {
      const sni =
        row.server_name && !isRawIP(row.server_name)
          ? row.server_name
          : (row.cert_sans || []).find((d) => d && !d.startsWith("*")) || extractHost(row.dest);
      onSelectPreset(row.dest, sni);
    }
    setScanOpen(false);
  };

  const localMode = isLocalRealityDest(dest);

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 500 }}>
        目标地址（Target / Dest）
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "stretch", sm: "flex-start" } }}>
        <TextField
          fullWidth
          size="small"
          value={dest}
          onChange={(e) => onDestChange(e.target.value)}
          placeholder="example.com:443 或本地回落 127.0.0.1:8443"
          sx={settingsFieldSx}
        />
        <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Activity size={14} />}
            disabled={probing || !nodeUUID || !dest.trim()}
            onClick={() => void runInlineProbe()}
            sx={{ height: 40, whiteSpace: "nowrap" }}
          >
            {probing ? "探测中..." : "探测"}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Globe size={14} />}
            disabled={!nodeUUID}
            onClick={openScanner}
            sx={{ height: 40, whiteSpace: "nowrap" }}
          >
            查询目标
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 0.75, alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary">
          {localMode
            ? "当前为本地回落模式（不覆盖下方 SNI），请将下方 SNI 填为本机服务证书对应的真实域名。"
            : "支持公网域名（如 example.com:443）或本地回落服务："}
        </Typography>
        {!localMode ? (
          <Chip
            size="small"
            label="回落到本地 127.0.0.1:8443"
            variant="outlined"
            color="info"
            clickable
            onClick={() => onSelectLocalFallback("127.0.0.1:8443")}
          />
        ) : null}
      </Stack>

      {rpcError ? (
        <Paper
          variant="outlined"
          sx={{ mt: 1, p: 1.25, borderRadius: 1.5, borderColor: "error.main", bgcolor: "background.default" }}
        >
          <Typography variant="caption" color="error">
            {rpcError}
          </Typography>
        </Paper>
      ) : null}

      {result ? (
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            p: 1.25,
            borderRadius: 1.5,
            borderColor: result.ok ? "success.main" : "error.main",
            bgcolor: "background.default",
          }}
        >
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", mb: 0.75 }}>
            <Chip
              size="small"
              label={result.ok ? "可用于 Reality" : "不支持 Reality"}
              color={result.ok ? "success" : "error"}
            />
            {result.local ? <Chip size="small" label="本地回落" variant="outlined" color="info" /> : null}
            {result.server_name ? (
              <Chip size="small" label={`SNI: ${result.server_name}`} variant="outlined" />
            ) : null}
            {result.tls_version ? (
              <Chip
                size="small"
                label={result.tls_version}
                variant="outlined"
                color={result.tls13 ? "success" : "error"}
              />
            ) : null}
            {result.reachable ? (
              <Chip
                size="small"
                label={`ALPN: ${result.alpn || "无"}`}
                variant="outlined"
                color={result.h2 ? "success" : "warning"}
              />
            ) : null}
            {result.reachable ? <Chip size="small" label={`${result.rtt_ms} ms`} variant="outlined" /> : null}
            {result.cert_chain_bytes ? (
              <Chip size="small" label={`证书链 ${result.cert_chain_bytes} B`} variant="outlined" />
            ) : null}
          </Stack>

          {result.error ? (
            <Typography variant="caption" color="error" sx={{ display: "block", mb: 0.5 }}>
              错误：{result.error}
            </Typography>
          ) : null}

          {result.cert_subject || result.cert_issuer || result.cert_not_after ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              证书：{result.cert_subject || "—"}
              {result.cert_issuer ? ` · 颁发者 ${result.cert_issuer}` : ""}
              {result.cert_not_after ? ` · 到期 ${result.cert_not_after}` : ""}
            </Typography>
          ) : null}

          {result.cert_sans && result.cert_sans.length > 0 ? (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.75, alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="caption" color="text.secondary">
                证书域名（点击填入 SNI）：
              </Typography>
              {result.cert_sans
                .filter((d) => d && !d.startsWith("*"))
                .slice(0, 6)
                .map((domain) => (
                  <Chip
                    key={domain}
                    size="small"
                    icon={<Shuffle size={12} />}
                    label={domain}
                    variant="outlined"
                    clickable
                    onClick={() => onFillSNI(domain)}
                  />
                ))}
            </Stack>
          ) : null}

          {result.warnings && result.warnings.length > 0 ? (
            <Box sx={{ mt: 0.5 }}>
              {result.warnings.map((w, idx) => (
                <Typography key={idx} variant="caption" color="warning.main" sx={{ display: "block" }}>
                  提示：{w}
                </Typography>
              ))}
            </Box>
          ) : null}
        </Paper>
      ) : null}

      <Dialog open={scanOpen} onClose={() => setScanOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              REALITY 目标扫描器
            </Typography>
            <Typography variant="caption" color="text.secondary">
              从所选探针节点验证指定域名或本地回落地址（如 127.0.0.1:8443）；留空则并发扫描常用候选目标。
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setScanOpen(false)}>
            <XCircle size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runScanner();
                }
              }}
              placeholder="输入域名、IP:端口 或本地回落地址（如 127.0.0.1:8443），留空扫描常用候选"
              sx={settingsFieldSx}
            />
            <Button
              variant="contained"
              disabled={scanning}
              onClick={() => void runScanner()}
              sx={{ height: 40, minWidth: 88, whiteSpace: "nowrap" }}
            >
              {scanning ? "扫描中..." : "扫描"}
            </Button>
          </Stack>

          <Stack direction="row" spacing={0.75} useFlexGap sx={{ mb: 1.5, alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">
              快捷探测本地服务：
            </Typography>
            {["127.0.0.1:8443", "127.0.0.1:443"].map((localAddr) => (
              <Chip
                key={localAddr}
                size="small"
                label={localAddr}
                variant="outlined"
                color="info"
                clickable
                onClick={() => {
                  setScanInput(localAddr);
                  void runScanner(localAddr);
                }}
              />
            ))}
          </Stack>

          {scanError ? (
            <Typography variant="caption" color="error" sx={{ display: "block", mb: 1 }}>
              {scanError}
            </Typography>
          ) : null}

          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>目标</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>TLS</TableHead>
                  <TableHead>ALPN</TableHead>
                  <TableHead>证书</TableHead>
                  <TableHead className="text-right">证书链</TableHead>
                  <TableHead className="text-right">延迟</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanning && scanResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      正在从探针节点并发扫描，请稍候...
                    </TableCell>
                  </TableRow>
                ) : scanResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      点击「扫描」开始探测可用 Reality 目标
                    </TableCell>
                  </TableRow>
                ) : (
                  scanResults.map((row) => (
                    <TableRow key={`${row.dest}:${row.server_name}`}>
                      <TableCell className="font-mono text-xs">{row.dest}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.ok ? "可用" : "不可用"}
                          color={row.ok ? "success" : "error"}
                          variant={row.ok ? "filled" : "outlined"}
                        />
                      </TableCell>
                      <TableCell>{row.tls_version ? row.tls_version.replace("TLS ", "") : "—"}</TableCell>
                      <TableCell>{row.alpn || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {row.cert_subject || row.error || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {row.cert_chain_bytes ? `${row.cert_chain_bytes} B` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {row.reachable ? `${row.rtt_ms} ms` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => applyScannedRow(row)}
                        >
                          使用
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshCw size={14} />}
            disabled={scanning}
            onClick={() => void runScanner()}
          >
            重新扫描
          </Button>
          <Button size="small" variant="contained" onClick={() => setScanOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
