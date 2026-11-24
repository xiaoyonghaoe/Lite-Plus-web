import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { Activity, Globe, Shuffle } from "@/components/admin/muiIcons";
import { settingsFieldSx } from "@/components/admin/SettingsChrome";
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
  warnings?: string[];
  error?: string;
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

export default function RealityProbeBox({
  nodeUUID,
  dest,
  serverName,
  presets,
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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setResult(null);
    setRpcError("");
  }, [nodeUUID, dest, serverName]);

  const runProbe = async () => {
    if (!nodeUUID || !dest.trim()) return;
    setProbing(true);
    setRpcError("");
    setResult(null);
    try {
      const res = await call("admin:nodemgt.reality.probe", {
        node_uuid: nodeUUID,
        dest: dest.trim(),
        server_name: serverName.trim(),
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
            onClick={() => void runProbe()}
            sx={{ height: 40, whiteSpace: "nowrap" }}
          >
            {probing ? "探测中..." : "探测"}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Globe size={14} />}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ height: 40, whiteSpace: "nowrap" }}
          >
            选择目标
          </Button>
        </Stack>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        {localMode
          ? "当前为本地回落模式（不自动覆盖下方 SNI），请确保本机该端口监听 TLS 1.3 服务，并将下方 SNI 填为本地证书对应的真实域名。"
          : "支持公网伪装站（如 www.microsoft.com:443）或回落到本机服务（如 127.0.0.1:8443）；点「探测」可从所选探针节点实测 TLS 1.3 + H2。"}
      </Typography>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            onSelectLocalFallback("127.0.0.1:8443");
            setMenuAnchor(null);
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Chip size="small" label="本地回落" color="info" variant="outlined" />
            <Typography variant="body2">127.0.0.1:8443（本机 Nginx / Caddy）</Typography>
          </Stack>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onSelectLocalFallback("127.0.0.1:443");
            setMenuAnchor(null);
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Chip size="small" label="本地回落" color="info" variant="outlined" />
            <Typography variant="body2">127.0.0.1:443</Typography>
          </Stack>
        </MenuItem>
        <Divider />
        {presets.map((item) => (
          <MenuItem
            key={item}
            onClick={() => {
              onSelectPreset(item, extractHost(item));
              setMenuAnchor(null);
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Chip size="small" label="公网目标" variant="outlined" />
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {item}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>

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
            {result.reachable ? (
              <Chip
                size="small"
                label={result.cert_valid ? "证书匹配" : "证书未信任/不匹配"}
                variant="outlined"
                color={result.cert_valid ? "success" : "warning"}
              />
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
    </Box>
  );
}
