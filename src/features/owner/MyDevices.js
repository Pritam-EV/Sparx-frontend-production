// src/features/owner/MyDevices.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const statusMeta = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "occupied") return { chip: "success", chipSx: {} };
  if (s === "available") return { chip: "default", chipSx: { bgcolor: "#04bfbf", color: "#011F26", fontWeight: 600 } };
  if (s === "online") return { chip: "success", chipSx: {} };
  if (s === "busy") return { chip: "warning", chipSx: {} };
  if (s === "maintenance") return { chip: "default", chipSx: {} };
  return { chip: "error", chipSx: {} };
};

const FieldRow = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.25 }}>
    <Typography variant="body2" sx={{ color: "#999", fontSize: "12px" }}>{label}</Typography>
    <Typography variant="body2" sx={{ 
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      color: "#fff",
      fontSize: "12px"
    }}>
      {value ?? "-"}
    </Typography>
  </Box>
);

const DeviceCard = ({ d }) => {
  const meta = statusMeta(d.status);
  const loc = d.location || [d.area, d.city, d.state].filter(Boolean).join(", ") || "-";
  const relayIsOn =
    d.relayOn === true ||
    d.relayOn === 1 ||
    String(d.relayOn).trim().toLowerCase() === "true" ||
    String(d.relayOn).trim() === "1";
  const lastRaw = d.lastSeen || d.last_seen || d.last_seen_at || d.updatedAt || null;

  return (
    <Card sx={{ 
      backgroundColor: "#1a1a1a", 
      border: "1px solid #333",
      borderRadius: "12px",
      color: "#fff"
    }}>
      <CardContent sx={{ padding: "16px !important" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#fff", fontSize: "16px" }}>
            {d.device_id || "-"}
          </Typography>
          <Chip label={d.status || "-"} color={meta.chip} size="small" sx={{
            ...meta.chipSx,
            fontSize: "11px",
            height: "24px"
          }} />
        </Stack>
        <Typography variant="body2" sx={{ color: "#666", mb: 1, fontSize: "12px" }}>
          {loc}
        </Typography>
        <Divider sx={{ my: 1, borderColor: "#333" }} />
        <FieldRow label="Type" value={d.charger_type || "-"} />
        <FieldRow label="Rate" value={d.rate != null ? `₹${d.rate}/kWh` : "-"} />
        <FieldRow label="Relay" value={relayIsOn ? "ON" : "OFF"} />
        <FieldRow label="Last seen" value={lastRaw ? new Date(lastRaw).toLocaleString() : "-"} />
      </CardContent>
    </Card>
  );
};

const MyDevices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr("");
      const data = await apiFetch("/api/devices/mine");
      const list = Array.isArray(data) ? data : data.devices || [];
      setDevices(list);
      setLastFetchedAt(new Date());
    } catch (e) {
      setErr(e?.message || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 10000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [load]);

  const counts = useMemo(() => {
    const toKey = (s) => (s || "").toLowerCase().trim();
    let available = 0, occupied = 0, offline = 0, faulty = 0;
    for (const d of devices) {
      const s = toKey(d?.status);
      if (s === "available" || s === "online") available += 1;
      else if (s === "occupied" || s === "busy") occupied += 1;
      else if (s === "offline") offline += 1;
      else if (s === "faulty" || s === "error") faulty += 1;
    }
    return { total: devices.length, available, occupied, offline, faulty };
  }, [devices]);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>My Devices</Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" sx={{ color: "#666", fontSize: "11px" }}>
              Last: {lastFetchedAt ? lastFetchedAt.toLocaleTimeString() : "—"}
            </Typography>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={load} sx={{ color: "#04BFBF" }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Chip label={`Total: ${counts.total}`} sx={{ bgcolor: "#333", color: "#fff", fontSize: "11px" }} />
          <Chip label={`Available: ${counts.available}`} sx={{ bgcolor: "#dcfce7", color: "#166534", fontSize: "11px" }} />
          <Chip label={`Occupied: ${counts.occupied}`} sx={{ bgcolor: "#dbeafe", color: "#1e3a8a", fontSize: "11px" }} />
          <Chip label={`Offline: ${counts.offline}`} sx={{ bgcolor: "#fee2e2", color: "#991b1b", fontSize: "11px" }} />
          <Chip label={`Faulty: ${counts.faulty}`} sx={{ bgcolor: "#f1f5f9", color: "#0f172a", fontSize: "11px" }} />
        </Stack>

        {loading && <Typography sx={{ textAlign: "center", color: "#666", padding: "40px" }}>Loading devices…</Typography>}
        {!!err && !loading && <Typography sx={{ color: "#ff6b6b", textAlign: "center", padding: "40px" }}>Error: {err}</Typography>}

        {!loading && !err && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 2,
              paddingBottom: "20px"
            }}
          >
            {devices.map((d) => (
              <DeviceCard key={d._id || d.device_id} d={d} />
            ))}
          </Box>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: '#000',
    minHeight: '100%',
    color: '#fff'
  },
  content: {
    padding: '16px 0',
    paddingBottom: '40px'
  }
};

export default MyDevices;
