// src/features/admin/DevicesOverview.js
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
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

// Status styling: Occupied = green, Available = #04bfbf (custom), others as before
const statusMeta = (status) => {
  const s = (status || "").toLowerCase();
  // Occupied -> green
  if (s === "occupied") return { chip: "success", accent: "#2e7d32", chipSx: {} };
  // Available -> custom teal
  if (s === "available") return { chip: "default", accent: "#04bfbf", chipSx: { bgcolor: "#04bfbf", color: "#011F26", fontWeight: 600 } };
  // Keep prior mappings
  if (s === "online") return { chip: "success", accent: "#2e7d32", chipSx: {} };
  if (s === "busy") return { chip: "warning", accent: "#ed6c02", chipSx: {} };
  if (s === "maintenance") return { chip: "default", accent: "#6b7280", chipSx: {} };
  return { chip: "error", accent: "#b91c1c", chipSx: {} }; // offline/unknown
};

// Pretty “time ago”
const timeAgo = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "-";
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

// Two-column label/value row with consistent alignment
const FieldRow = ({ label, value, mono = false, tooltip = "" }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
    <Typography
      variant="caption"
      sx={{ minWidth: 110, color: "text.secondary", fontWeight: 600 }}
    >
      {label}
    </Typography>
    <Tooltip title={tooltip || String(value ?? "-")} arrow>
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          textAlign: "right",
          fontFamily: mono
            ? "Roboto Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            : undefined,
          fontWeight: mono ? 500 : 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value ?? "-"}
      </Typography>
    </Tooltip>
  </Box>
);



const DeviceCard = ({ d }) => {
  const meta = statusMeta(d.status);

  // Location fallback chain
  const loc = d.location || [d.area, d.city, d.state].filter(Boolean).join(", ") || "-";

  // Normalize relay boolean reliably across shapes (boolean, number, string)
  const relayIsOn =
    d.relayOn === true ||
    d.relayOn === 1 ||
    String(d.relayOn).trim().toLowerCase() === "true" ||
    String(d.relayOn).trim() === "1";

  // Last seen fallback chain and formatting (use schema key + fallback to updatedAt)
  const lastRaw = d.lastSeen || d.last_seen || d.last_seen_at || d.updatedAt || null;
  const lastExact = lastRaw ? new Date(lastRaw).toLocaleString() : "-";

  return (
    <Card
      elevation={3}
      sx={{
        borderLeft: `4px solid ${meta.accent}`,
        borderRadius: 2,
        transition: "box-shadow 0.2s ease, transform 0.1s ease",
        "&:hover": { boxShadow: 8, transform: "translateY(-1px)" },
        minWidth: 300,
        maxWidth: 400,
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {d.device_id || "-"}
          </Typography>
          <Chip
            label={d.status || "offline"}
            color={meta.chip}
            size="small"
            sx={meta.chipSx}
          />
        </Stack>

        <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
          {loc}
        </Typography>

        <Divider sx={{ my: 1.25 }} />

        <FieldRow label="Session" value={d.current_session_id || "-"} mono />
        <FieldRow label="Charger" value={d.charger_type || "-"} />
        <FieldRow label="Rate" value={d.rate ?? "-"} mono />
        <FieldRow label="Energy" value={d.totalenergy ?? "-"} mono />
        <FieldRow label="Relay" value={relayIsOn ? "On" : "Off"} mono />
        <FieldRow label="Lat/Lng" value={`${d.lat ?? "-"}, ${d.lng ?? "-"}`} mono />
        <FieldRow label="Last Seen" value={timeAgo(lastRaw)} tooltip={lastExact} mono />
      </CardContent>
    </Card>
  );
};


const DevicesOverview = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      // Use admin list if you added it: "/api/devices/admin"
      const data = await apiFetch("/api/devices");
      const list = Array.isArray(data) ? data : data.devices || [];
      setDevices(list);
      setError("");
      setLastFetchedAt(new Date());
    } catch (e) {
      setError(e.message || "Failed to load devices");
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
    return {
      total: devices.length,
      available,
      occupied,
      offline,
      faulty,
    };
  }, [devices]);

  return (
    <Box sx={{ maxWidth: 1200, m: "auto", p: { xs: 0.5, sm: 2 }, pt: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Devices Overview
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Last fetch: {lastFetchedAt ? lastFetchedAt.toLocaleString() : "—"}
          </Typography>
          <Tooltip title="Refresh now">
            <span>
              <IconButton onClick={load} disabled={loading} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Card elevation={2} sx={{ mb: 2 }}>
      <CardContent sx={{ py: 1, px: 2 }}>
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
        >
          <Stack sx={{ minWidth: 160 }}>
            <Typography variant="caption" color="text.secondary">Total Devices</Typography>
            <Typography variant="h6" sx={{ color: "#fff", bgcolor: "#111", px: 1, borderRadius: 1, display: "inline-block" }}>
              {counts.total}
            </Typography>
          </Stack>

          <Stack sx={{ minWidth: 180 }}>
            <Typography variant="caption" color="text.secondary">Available Devices</Typography>
            <Typography variant="h6" sx={{ color: "#fff", bgcolor: "#04bfbf", px: 1, borderRadius: 1, display: "inline-block", fontWeight: 700 }}>
              {counts.available}
            </Typography>
          </Stack>

          <Stack sx={{ minWidth: 180 }}>
            <Typography variant="caption" color="text.secondary">Occupied Devices</Typography>
            <Typography variant="h6" sx={{ color: "#fff", bgcolor: "#04bf14ff", px: 1, borderRadius: 1, display: "inline-block", fontWeight: 700 }}>
              {counts.occupied}
            </Typography>
          </Stack>

          <Stack sx={{ minWidth: 170 }}>
            <Typography variant="caption" color="text.secondary">Offline Devices</Typography>
            <Typography variant="h6" sx={{ color: "#fff", bgcolor: "#3f4349ff", px: 1, borderRadius: 1, display: "inline-block",fontWeight: 700 }}>
              {counts.offline}
            </Typography>
          </Stack>

          <Stack sx={{ minWidth: 160 }}>
            <Typography variant="caption" color="text.secondary">Faulty Devices</Typography>
            <Typography variant="h6" sx={{ color: "#fff", bgcolor: "#b91c1c", px: 1, borderRadius: 1, display: "inline-block", fontWeight: 700 }}>
              {counts.faulty}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>

      {loading && <Typography>Loading devices…</Typography>}
      {error && !loading && <Typography color="error">Error: {error}</Typography>}

      {!loading && !error && (
        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
            py: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2
          }}
        >
          {devices.map((d, i) => (
            <DeviceCard key={d.device_id || d._id || i} d={d} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DevicesOverview;
