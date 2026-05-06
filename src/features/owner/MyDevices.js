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
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";

const statusMeta = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "occupied") return { chip: "success", chipSx: {} };
  if (s === "available")
    return {
      chip: "default",
      chipSx: { bgcolor: "#04BFBF", color: "#011F26", fontWeight: 600 },
    };
  if (s === "online") return { chip: "success", chipSx: {} };
  if (s === "busy") return { chip: "warning", chipSx: {} };
  if (s === "maintenance") return { chip: "default", chipSx: {} };
  return { chip: "error", chipSx: {} };
};

const FieldRow = ({ label, value }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      gap: 1,
      py: 0.4,
    }}
  >
    <Typography
      sx={{
        color: "#64748b",
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#0f172a",
        fontSize: 11,
        fontWeight: 600,
        textAlign: "right",
        maxWidth: "60%",
        wordBreak: "break-word",
      }}
    >
      {value ?? "-"}
    </Typography>
  </Box>
);

const MyDevices = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const decoded = JSON.parse(atob(token.split(".")[1]));
      const userId = decoded.userId;

      const data = await apiFetch(`api/partner/devices/${userId}`);

      const list = Array.isArray(data.devices) ? data.devices : [];
      setDevices(list);
      setOwnerProfile(data.ownerProfile || {});
      setLastFetchedAt(new Date());
    } catch (e) {
      setErr(e?.message || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [load]);

  const counts = useMemo(() => {
    const toKey = (s) => (s || "").toLowerCase().trim();
    let available = 0,
      occupied = 0,
      offline = 0,
      faulty = 0;
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
    <Box
      sx={{
        minHeight: "100vh",
        background: "#fff",
        color: "#0f172a",
        p: { xs: 1.5, sm: 2, md: 2.5 },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
        spacing={1.5}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 20,
              color: "#000",
              letterSpacing: "-0.3px",
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            My Devices
          </Typography>
          <Typography
            sx={{
              color: "#64748b",
              fontSize: 11,
              fontWeight: 400,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {counts.total} {counts.total === 1 ? "device" : "devices"} connected
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Button
            size="small"
            variant="contained"
            onClick={() => navigate("/onboard-device")}
            sx={{
              bgcolor: "#04BFBF",
              color: "#011F26",
              fontWeight: 600,
              textTransform: "none",
              fontSize: 11,
              borderRadius: "999px",
              px: 1.8,
              height: 30,
              minWidth: 0,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              "&:hover": {
                bgcolor: "#03a6a6",
              },
            }}
          >
            Link Charger
          </Button>
          <Typography
            variant="caption"
            sx={{
              color: "#94a3b8",
              fontSize: 10,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {lastFetchedAt ? lastFetchedAt.toLocaleTimeString() : "—"}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={load}
              sx={{
                color: "#04BFBF",
                width: 26,
                height: 26,
              }}
            >
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Status chips */}
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ mb: 1.5, flexWrap: "wrap", gap: 0.75 }}
      >
        <Chip
          label={`Total: ${counts.total}`}
          sx={{
            bgcolor: "#f9fafb",
            color: "#0f172a",
            fontSize: 10,
            height: 22,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        />
        <Chip
          label={`Available: ${counts.available}`}
          sx={{
            bgcolor: "#dcfce7",
            color: "#166534",
            fontSize: 10,
            height: 22,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        />
        <Chip
          label={`Occupied: ${counts.occupied}`}
          sx={{
            bgcolor: "#dbeafe",
            color: "#1e3a8a",
            fontSize: 10,
            height: 22,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        />
        <Chip
          label={`Offline: ${counts.offline}`}
          sx={{
            bgcolor: "#fee2e2",
            color: "#991b1b",
            fontSize: 10,
            height: 22,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        />
        <Chip
          label={`Faulty: ${counts.faulty}`}
          sx={{
            bgcolor: "#f1f5f9",
            color: "#0f172a",
            fontSize: 10,
            height: 22,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        />
      </Stack>

      {/* States */}
      {loading && (
        <Typography
          sx={{
            textAlign: "center",
            color: "#94a3b8",
            py: 4,
            fontSize: 13,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          Loading devices…
        </Typography>
      )}

      {!!err && !loading && (
        <Typography
          sx={{
            color: "#dc2626",
            textAlign: "center",
            py: 4,
            fontSize: 13,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          Error: {err}
        </Typography>
      )}

      {!loading && !err && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 1.5,
            pb: 2,
          }}
        >
          {devices.map((d) => (
            <DeviceCard
              key={d._id || d.device_id}
              d={d}
              navigate={navigate}
              ownerProfile={ownerProfile}
              formatDate={formatDate}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const DeviceCard = ({ d, navigate, ownerProfile, formatDate }) => {
  const meta = statusMeta(d.status);
  const loc =
    d.location || [d.area, d.city, d.state].filter(Boolean).join(", ") || "-";
  const relayIsOn =
    d.relayOn === true ||
    d.relayOn === 1 ||
    String(d.relayOn).trim().toLowerCase() === "true" ||
    String(d.relayOn).trim() === "1";

  return (
    <Card
      sx={{
        backgroundColor: "#fffefe",
        border: "1px solid #afafaf",
        borderRadius: 1.8,
        color: "#0f172a",
        boxShadow: "0 1px 5px rgba(15,23,42,0.06)",
        transition: "all 0.15s",
        "&:hover": {
          boxShadow: "0 3px 8px rgba(15,23,42,0.12)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardContent sx={{ p: 1.75 }}>
        {/* Device ID & Status */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 0.5 }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              color: "#000",
              fontSize: 15,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {d.device_id || "-"}
          </Typography>
          <Chip
            label={d.status || "-"}
            color={meta.chip}
            size="small"
            sx={{
              ...meta.chipSx,
              fontSize: 10,
              height: 22,
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          />
        </Stack>

        {/* Location */}
        <Typography
          sx={{
            color: "#64748b",
            mb: 0.75,
            fontSize: 11,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {loc}
        </Typography>

        <Divider sx={{ my: 0.75 }} />

        {/* Basic Fields */}
        <FieldRow label="Type" value={d.charger_type || "-"} />
        <FieldRow
          label="Rate"
          value={d.rate != null ? `₹${d.rate}/kWh` : "-"}
        />
        <FieldRow label="Charging" value={relayIsOn ? "ON" : "OFF"} />

        <Divider sx={{ my: 0.75 }} />

        {/* Extra Fields */}
        <FieldRow label="Meter Type" value={d.meterType || "N/A"} />
        <FieldRow
          label="Meter Consumer #"
          value={d.meterConsumerNumber || "N/A"}
        />
        <FieldRow label="Onboarded On" value={formatDate(d.onboardedAt)} />
        {ownerProfile?.gstin && (
          <FieldRow label="GST Number" value={ownerProfile.gstin} />
        )}

        <Divider sx={{ my: 0.75 }} />

        {/* Configure WiFi Button */}
        <Button
          fullWidth
          size="small"
          variant="outlined"
          onClick={() => navigate(`/owner/devices/${d.device_id}/configure-wifi`)}
          sx={{
            borderColor: "#04BFBF",
            color: "#04BFBF",
            fontSize: 11,
            textTransform: "none",
            mt: 0.75,
            borderRadius: "999px",
            height: 30,
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            "&:hover": {
              borderColor: "#03a6a6",
              bgcolor: "rgba(4, 191, 191, 0.06)",
            },
          }}
        >
          Configure Wi‑Fi
        </Button>
      </CardContent>
    </Card>
  );
};

export default MyDevices;
