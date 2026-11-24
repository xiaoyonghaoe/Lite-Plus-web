import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { Activity } from "@/components/admin/muiIcons";
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

export default function RealityProbeBox({
  nodeUUID,
  dest,
  serverName,
}: {
  nodeUUID: string;
  dest: string;
  serverName: string;
}) {
  const { call } = useRPC2Call();
  const [probing, setProbing] = useState(false);
  const [result, setResult] = useState<RealityProbeResult | null>(null);
  const [rpcError, setRpcError] = useState<string>("");

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

  return (
    <Box sx={{ mt: 0.5 }}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Activity size={14} />}
          disabled={probing || !nodeUUID || !dest.trim()}
          onClick={() => void runProbe()}
        >
          {probing ? "正在从节点探测..." : "探测 Reality 目标"}
        </Button>
        <Typography variant="caption" color="text.secondary">
          从所选探针节点发起真实 TLS 1.3 + H2 握手，支持探测公网伪装站或本机回落服务（如 127.0.0.1:8443）。
        </Typography>
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
              {result.cert_sans && result.cert_sans.length > 0 ? ` · SAN: ${result.cert_sans.join(", ")}` : ""}
            </Typography>
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
