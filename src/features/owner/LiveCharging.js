import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");
const fmtKwh = (n) => `${Number(n || 0).toFixed(2)} kWh`;
const fmtMoney = (n) => `₹${Number(n || 0).toFixed(2)}`;

export default function LiveCharging() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      setErr(null);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/owner/live-charging`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setRows(data.sessions || []);
      setLastFetchedAt(new Date());
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
    const t = setInterval(fetchRows, 5000);
    return () => clearInterval(t);
  }, [fetchRows]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Card sx={{ borderRadius: 3, background: "#0f1722", color: "#EAF2FF" }}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={28} sx={{ color: "#04BFBF" }} />
            <Box>
              <Typography sx={{ fontWeight: 800 }}>Loading live charging…</Typography>
              <Typography sx={{ opacity: 0.75 }}>Fetching active sessions</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (err) {
    return (
      <Box sx={{ p: 2 }}>
        <Card sx={{ borderRadius: 3, background: "#0f1722", color: "#EAF2FF" }}>
          <CardContent>
            <Typography sx={{ fontWeight: 900, color: "#ff9a9a" }}>Error</Typography>
            <Typography sx={{ mt: 1, opacity: 0.8 }}>{err}</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="caption" sx={{ color: "rgba(234,242,255,0.6)", fontSize: 11 }}>
            Last sync: {lastFetchedAt ? lastFetchedAt.toLocaleTimeString() : "—"}
        </Typography>

        <Tooltip title="Refresh">
            <IconButton onClick={fetchRows} sx={{ color: "#04BFBF" }} size="small">
            <RefreshIcon fontSize="small" />
            </IconButton>
        </Tooltip>
        </Box>


      {rows.length === 0 ? (
        <Card sx={{ borderRadius: 3, background: "#0f1722", color: "#EAF2FF" }}>
          <CardContent>
            <Typography sx={{ fontWeight: 800 }}>No active sessions</Typography>
            <Typography sx={{ opacity: 0.75, mt: 0.5 }}>
              When charging starts on your devices, it will appear here.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        rows.map((s) => {
          const relayLabel = s.relayOn ? "ON" : "OFF";
          const relayChipSx = s.relayOn
            ? { bgcolor: "rgba(34,197,94,0.18)", color: "#22C55E", fontWeight: 900 }   // green
            : { bgcolor: "rgba(59,130,246,0.18)", color: "#3B82F6", fontWeight: 900 }; // blue

          return (
            <Card
              key={s.sessionId}
              sx={{
                mb: 2,
                borderRadius: 3,
                background: "linear-gradient(180deg, #0B1220 0%, #060A12 100%)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#EAF2FF",
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ fontWeight: 900, color: "#04BFBF" }}>{s.deviceId}</Typography>
                    <Typography sx={{ opacity: 0.75 }}>{s.address}</Typography>
                  </Box>
                  <Chip label={relayLabel} sx={relayChipSx} />
                </Box>

                <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.65 }}>Vehicle No.</Typography>
                    <Typography sx={{ fontWeight: 800 }}>{s.vehicleNumber}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.65 }}>Start</Typography>
                    <Typography sx={{ fontWeight: 800 }}>{fmtDateTime(s.startTime)}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.65 }}>Energy selected</Typography>
                    <Typography sx={{ fontWeight: 800 }}>{fmtKwh(s.energySelected)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.65 }}>Amount paid</Typography>
                    <Typography sx={{ fontWeight: 800 }}>{fmtMoney(s.amountPaid)}</Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ position: "relative", display: "inline-flex" }}>
                    <CircularProgress
                      variant="determinate"
                      value={s.progressPercent || 0}
                      size={74}
                      thickness={5}
                      sx={{ color: "#00E676" }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography sx={{ fontWeight: 900 }}>{Math.round(s.progressPercent || 0)}%</Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography sx={{ opacity: 0.75 }}>
                      Consumed: {fmtKwh(s.energyConsumed)}
                    </Typography>
                    <Typography sx={{ opacity: 0.75 }}>
                      Target: {fmtKwh(s.energySelected)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}
    </Box>
  );
}
