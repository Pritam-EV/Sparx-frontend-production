// src/features/admin/DevicesOverview.js
/**
 * Admin Devices Dashboard - Tabular Format (Full Replacement)
 *
 * - Uses new endpoints: 
 *   GET /api/admin/devices/summary
 *   GET /api/admin/devices/table
 *   GET /api/admin/devices/:id
 *   GET /api/admin/devices/filters/options
 * - Responsive table design for laptop, tablet, mobile
 * - Slide-out detail panel
 * - Material UI v5
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Drawer,
  Divider,
  Button,
  Stack,
  Skeleton,
  Alert,
  Tooltip,
  useTheme,
  useMediaQuery,
  Avatar,
  Tabs,
  Tab,
    Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import BoltIcon from "@mui/icons-material/Bolt";
import OfflineBoltIcon from "@mui/icons-material/OfflineBolt";
import InfoIcon from "@mui/icons-material/Info";
import RoomIcon from "@mui/icons-material/Room";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CloseIcon from "@mui/icons-material/Close";
import { apiFetch } from "../../utils/apiFetch";

/* ---------------------------
   Constants & Helpers
   --------------------------- */
const formatKwh = (n) => (typeof n === "number" ? `${n.toFixed(2)} kWh` : "-");
const formatRate = (n) => (typeof n === "number" ? `₹ ${n.toFixed(2)}/kWh` : "-");
const formatVoltage = (v) => (typeof v === "number" ? `${v.toFixed(1)} V` : "-");
const formatCurrent = (c) => (typeof c === "number" ? `${c.toFixed(1)} A` : "-");
const formatPower = (v, c) => {
  if (typeof v === "number" && typeof c === "number") {
    return `${((v * c) / 1000).toFixed(2)} kW`;
  }
  return "-";
};

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

const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  const map = {
    available: { bg: "#dcfce7", text: "#166534", label: "Available" },
    online: { bg: "#dcfce7", text: "#166534", label: "Online" },
    occupied: { bg: "#fef3c7", text: "#92400e", label: "Charging" },
    busy: { bg: "#fef3c7", text: "#92400e", label: "Busy" },
    offline: { bg: "#f3f4f6", text: "#374151", label: "Offline" },
    faulty: { bg: "#fee2e2", text: "#991b1b", label: "Faulty" },
    maintenance: { bg: "#ede9fe", text: "#5b21b6", label: "Maintenance" },
  };
  return map[s] || { bg: "#f3f4f6", text: "#374151", label: status || "Unknown" };
};

const KPI_CARD_STYLE = {
  borderRadius: 2,
  px: 2,
  py: 1.5,
  minHeight: 90,
  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  transition: "transform 150ms ease, box-shadow 150ms ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  },
};


/* ---------------------------
   KPI Card Component
   --------------------------- */
function KPI({ label, value, sub, icon, accent, loading }) {
  return (
    <Paper sx={{ ...KPI_CARD_STYLE }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>
            {label}
          </Typography>
          {loading ? (
            <Skeleton width={80} height={32} sx={{ mt: 0.5 }} />
          ) : (
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
              {value}
            </Typography>
          )}
          {sub && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
              {sub}
            </Typography>
          )}
        </Box>
        {icon ? (
          <Avatar variant="rounded" sx={{ bgcolor: accent || "#0ea5e9", width: 52, height: 52 }}>
            {icon}
          </Avatar>
        ) : null}
      </Stack>
    </Paper>
  );
}

/* ---------------------------
   Status Chip Component
   --------------------------- */
function StatusChip({ status }) {
  const cfg = getStatusColor(status);
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: cfg.bg,
        color: cfg.text,
        fontWeight: 700,
        borderRadius: 1,
      }}
    />
  );
}

/* ---------------------------
   Detail Panel Component
   --------------------------- */
function DeviceDetailPanel({ device, onClose, onRefreshDevice  }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [liveTelemetry, setLiveTelemetry] = useState(null); // 🔥 NEW
  const [telemetryLoading, setTelemetryLoading] = useState(false); // 🔥 NEW
const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
const [sessionAction, setSessionAction] = useState(null);
const [sessionMessage, setSessionMessage] = useState("");
const [sessionError, setSessionError] = useState("");
const [pendingSessionId, setPendingSessionId] = useState(null);

const hasActiveSession = Boolean(device?.current_session_id);
const isStarting = sessionAction === "starting";
const isStopping = sessionAction === "stopping";

    // 🔥 Fetch live telemetry when device changes
useEffect(() => {
  if (!device?.device_id) return;

  fetchLiveTelemetry(device.device_id);
  setTabIndex(0);
  setSessionMessage("");
  setSessionError("");
  setPendingSessionId(null);
}, [device]);

  const fetchLiveTelemetry = async (deviceId) => {
    try {
      setTelemetryLoading(true);
      const res = await apiFetch(`/api/devices/admin/telemetry/${deviceId}`);
      setLiveTelemetry(res);
    } catch (err) {
      console.error("Failed to fetch live telemetry:", err);
      setLiveTelemetry(null);
    } finally {
      setTelemetryLoading(false);
    }
  };

  if (!device) return null;

  const statusCfg = getStatusColor(device.status);

const handleStartSession = async () => {
  try {
    setSessionAction("starting");
    setSessionMessage("");
    setSessionError("");

    const res = await apiFetch(
      `/api/devices/admin/start-session/${device.device_id}`,
      {
        method: "POST",
        body: {
          amountPaid: 100,
          selectedEnergy: 100,
        },
      }
    );

    if (!res.success) {
      throw new Error(res.message || "Failed to start session");
    }

    const newSessionId = res.data?.sessionId || null;

    setPendingSessionId(newSessionId);
    setSessionDialogOpen(false);
    setSessionMessage(
      `Start command sent. Session ID: ${newSessionId || "generated"}`
    );

if (onRefreshDevice) {
  await onRefreshDevice(device.device_id);
}
    // Do not set current_session_id locally.
    // The backend must update it after device acknowledgement.
  } catch (error) {
    console.error("Start session error:", error);
    setSessionError(error.message || "Failed to start session");
  } finally {
    setSessionAction(null);
  }
};


const handleStopSession = async () => {
  try {
    setSessionAction("stopping");
    setSessionMessage("");
    setSessionError("");

    const sessionId =
      device.current_session_id || pendingSessionId;

    if (!sessionId) {
      throw new Error("No active session found");
    }

    const res = await apiFetch(
      `/api/devices/admin/stop-session/${device.device_id}`,
      {
        method: "POST",
        body: {
          sessionId,
        },
      }
    );

    if (!res.success) {
      throw new Error(res.message || "Failed to stop session");
    }
if (onRefreshDevice) {
  await onRefreshDevice(device.device_id);
}
    setSessionMessage("Stop command sent to device.");
  } catch (error) {
    console.error("Stop session error:", error);
    setSessionError(error.message || "Failed to stop session");
  } finally {
    setSessionAction(null);
  }
};


  return (
    <Box sx={{ p: 3 }}>
<Paper
  sx={{
    p: 2,
    mb: 2,
    bgcolor: hasActiveSession ? "#fff7ed" : "#ecfdf5",
    border: "1px solid",
    borderColor: hasActiveSession ? "#fed7aa" : "#a7f3d0",
    borderRadius: 2,
  }}
>
  <Stack spacing={1.5}>
    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 800,
          color: hasActiveSession ? "#9a3412" : "#047857",
        }}
      >
        {hasActiveSession
          ? "Active Session"
          : "Admin Session Control"}
      </Typography>

      <Typography variant="caption" color="text.secondary">
        {hasActiveSession
          ? `Session: ${device.current_session_id}`
          : "Amount: ₹100 • Energy: 100 kWh"}
      </Typography>
    </Box>

    {!hasActiveSession ? (
      <Button
        fullWidth
        variant="contained"
        startIcon={<BoltIcon />}
        onClick={() => setSessionDialogOpen(true)}
        disabled={
          isStarting ||
          String(device.status || "").toLowerCase() === "offline"
        }
        sx={{
          bgcolor: "#059669",
          "&:hover": { bgcolor: "#047857" },
        }}
      >
        {isStarting ? "Sending command..." : "Start Session"}
      </Button>
    ) : (
      <Button
        fullWidth
        variant="contained"
        color="error"
        onClick={handleStopSession}
        disabled={isStopping}
      >
        {isStopping ? "Sending stop command..." : "Stop Session"}
      </Button>
    )}

    {sessionMessage && (
      <Alert severity="info">
        {sessionMessage}
      </Alert>
    )}

    {sessionError && (
      <Alert severity="error">
        {sessionError}
      </Alert>
    )}
  </Stack>
</Paper>

    {/* 🔥 SESSION CONFIRMATION DIALOG */}
    <Dialog
      open={sessionDialogOpen}
      onClose={() => setSessionDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <BoltIcon sx={{ color: '#10b981' }} />
          <Typography>Start Admin Session</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This will send a command to the device to start a session with:
        </Typography>
        
        <Paper sx={{ p: 2, bgcolor: '#f0fdf4', mb: 2 }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Device:</Typography>
              <Typography variant="body2" fontWeight={600}>{device.device_id}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Amount:</Typography>
              <Typography variant="body2" fontWeight={600}>₹100</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Energy:</Typography>
              <Typography variant="body2" fontWeight={600}>100 kWh</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">User:</Typography>
              <Typography variant="body2" fontWeight={600}>ADMIN</Typography>
            </Stack>
          </Stack>
        </Paper>

        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="caption">
            Command will be sent via MQTT. Device must be online and connected.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button
  onClick={() => setSessionDialogOpen(false)}
  disabled={isStarting}
>
          Cancel
        </Button>
        <Button
          onClick={handleStartSession}
          variant="contained"
          disabled={isStarting}
          startIcon={isStarting ? null : <BoltIcon />}
          sx={{
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' }
          }}
        >
          {isStarting ? "Sending command..." : "Start Session"}
        </Button>
      </DialogActions>
    </Dialog>

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {device.device_id}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {device.serialNumber}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={statusCfg.label} size="small" sx={{ bgcolor: statusCfg.bg, color: statusCfg.text }} />
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Tabs */}
      <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ mb: 2 }}>
        <Tab label="Overview" />
        <Tab label="Live Data" />
        <Tab label="Location" />
        <Tab label="Network" />
        <Tab label="Commercial" />
      </Tabs>

      {/* Overview Tab */}
      {tabIndex === 0 && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Project
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.project || "-"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Charger Type
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.charger_type || "-"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Hardware Rev
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.hardwareRevision || "-"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Firmware
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.lastKnownFirmwareVersion || "-"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Onboarding
              </Typography>
              <Chip label={device.onboardingStatus || "pending"} size="small" />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Rate
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatRate(device.rate)}</Typography>
            </Grid>
          </Grid>
        </Stack>
      )}


{/* Live Data Tab */}
{tabIndex === 1 && (
  <Stack spacing={2}>
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Relay
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{device.relayOn ? "ON ✅" : "OFF ❌"}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Last Seen
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{timeAgo(device.lastSeen)}</Typography>
      </Grid>
      
      {/* 🔥 LIVE VOLTAGE & CURRENT */}
      <Grid item xs={6}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Live Voltage
        </Typography>
        {telemetryLoading ? (
          <Skeleton width={80} />
        ) : liveTelemetry?.voltage !== null ? (
          <Typography sx={{ fontWeight: 700, color: "#16a34a" }}>
            {liveTelemetry.voltage.toFixed(1)} V
          </Typography>
        ) : (
          <Typography sx={{ fontWeight: 700, color: "text.secondary" }}>-</Typography>
        )}
      </Grid>
      
      <Grid item xs={6}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Live Current
        </Typography>
        {telemetryLoading ? (
          <Skeleton width={80} />
        ) : liveTelemetry?.current !== null ? (
          <Typography sx={{ fontWeight: 700, color: "#16a34a" }}>
            {liveTelemetry.current.toFixed(1)} A
          </Typography>
        ) : (
          <Typography sx={{ fontWeight: 700, color: "text.secondary" }}>-</Typography>
        )}
      </Grid>
      
      {/* Live Power */}
      <Grid item xs={6}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Live Power
        </Typography>
        {telemetryLoading ? (
          <Skeleton width={80} />
        ) : (liveTelemetry?.voltage !== null && liveTelemetry?.current !== null) ? (
          <Typography sx={{ fontWeight: 700, color: "#f59e0b" }}>
            {((liveTelemetry.voltage * liveTelemetry.current) / 1000).toFixed(2)} kW
          </Typography>
        ) : (
          <Typography sx={{ fontWeight: 700, color: "text.secondary" }}>-</Typography>
        )}
      </Grid>
      
      <Grid item xs={6}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Telemetry Timestamp
        </Typography>
        {telemetryLoading ? (
          <Skeleton width={120} />
        ) : liveTelemetry?.timestamp ? (
          <Typography sx={{ fontWeight: 700, fontSize: 12 }}>
            {timeAgo(liveTelemetry.timestamp)}
          </Typography>
        ) : (
          <Typography sx={{ fontWeight: 700, color: "text.secondary" }}>No telemetry</Typography>
        )}
      </Grid>
      
      <Grid item xs={6}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Total Energy
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{formatKwh(device.totalenergy || 0)}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Active Session
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{device.current_session_id ? "Yes" : "No"}</Typography>
      </Grid>
    </Grid>
    
    {/* Refresh Telemetry Button */}
    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
      <Button 
        size="small" 
        variant="outlined" 
        startIcon={<RefreshIcon />}
        onClick={() => fetchLiveTelemetry(device.device_id)}
        disabled={telemetryLoading}
      >
        {telemetryLoading ? "Loading..." : "Refresh Live Data"}
      </Button>
    </Stack>
    
    <Alert severity="info" sx={{ mt: 2 }}>
      <Typography variant="caption">
        Live telemetry data from DeviceTelemetry collection (last 24 hours)
      </Typography>
    </Alert>
  </Stack>
)}

      {/* Location Tab */}
      {tabIndex === 2 && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Location Name
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.location || "-"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Area
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.area || "-"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                City
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.city || "-"}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                State
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.state || "-"}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Coordinates
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <RoomIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {device.lat && device.lng ? `${device.lat.toFixed(5)}, ${device.lng.toFixed(5)}` : "-"}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      )}

      {/* Network Tab */}
      {tabIndex === 3 && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                WiFi SSID
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.wifiSSID || "-"}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Config Status
              </Typography>
              <Chip
                label={device.configAck?.status || "unknown"}
                size="small"
                color={device.configAck?.status === "ok" ? "success" : "warning"}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Config Acked At
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {device.configAck?.ackedAt ? new Date(device.configAck.ackedAt).toLocaleString() : "-"}
              </Typography>
            </Grid>
          </Grid>
        </Stack>
      )}

      {/* Commercial Tab */}
      {tabIndex === 4 && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Rate (₹/kWh)
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatRate(device.rate)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Electricity Bearer
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{device.commercial?.electricityBearer || "OWNER"}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                VJRA Margin
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {device.commercial?.vjraMarginPerKwh ? `₹${device.commercial.vjraMarginPerKwh}/kWh` : "-"}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Owner Share
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {device.commercial?.ownerSharePerKwh ? `₹${device.commercial.ownerSharePerKwh}/kWh` : "-"}
              </Typography>
            </Grid>
          </Grid>
        </Stack>
      )}

      {/* Raw JSON */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Raw Data
      </Typography>
      <Box
        sx={{
          mt: 1,
          background: "rgba(15,23,42,0.03)",
          p: 1.5,
          borderRadius: 1,
          maxHeight: 300,
          overflow: "auto",
        }}
      >
        <pre style={{ margin: 0, fontSize: 11, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          {JSON.stringify(device, null, 2)}
        </pre>
      </Box>
    </Box>
  );
}

/* ---------------------------
   Main Component
   --------------------------- */
export default function DevicesOverview() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  // State
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    project: "",
    status: "",
    state: "",
    city: "",
    search: "",
  });

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    projects: [],
    cities: [],
    states: [],
    statuses: [],
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalDevices, setTotalDevices] = useState(0);

  // Fetch filter options
  const loadFilterOptions = useCallback(async () => {
    try {
      const res = await apiFetch("/api/devices/admin/devices/filters/options");
      if (res.success) {
        setFilterOptions(res.data);
      }
    } catch (err) {
      console.error("Failed to load filter options:", err);
    }
  }, []);

  // Fetch summary
  const loadSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.project) params.append("project", filters.project);
      if (filters.state) params.append("state", filters.state);
      if (filters.city) params.append("city", filters.city);

      const res = await apiFetch(`/api/devices/admin/devices/summary?${params.toString()}`);
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  }, [filters]);

  // Fetch devices table
const loadDevices = useCallback(async () => {
  try {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      page: page + 1,
      limit: rowsPerPage,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });

    if (filters.project) params.append("project", filters.project);
    if (filters.status) params.append("status", filters.status);
    if (filters.state) params.append("state", filters.state);
    if (filters.city) params.append("city", filters.city);
    if (filters.search) params.append("search", filters.search);

    // 🔥 Use new endpoint with telemetry
   const res = await apiFetch(
  `/api/devices/admin/devices-table-telemetry?${params.toString()}`
);

    if (res.success) {
      setDevices(res.data);
      setTotalDevices(res.pagination.total);
      setLastFetchedAt(new Date());
    } else {
      setError(res.message || "Failed to load devices");
    }
  } catch (err) {
    console.error("Failed to load devices:", err);
    setError(err.message || "Network error");
  } finally {
    setLoading(false);
  }
}, [page, rowsPerPage, filters]);

  // Fetch device details
  const loadDeviceDetails = useCallback(async (deviceId) => {
    try {
      const res = await apiFetch(`/api/devices/admin/devices/${deviceId}`);
      if (res.success) {
        setSelectedDevice(res.data);
      }
    } catch (err) {
      console.error("Failed to load device details:", err);
      alert("Failed to load device details");
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadSummary();
    loadDevices();
  }, [loadSummary, loadDevices]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadSummary();
      loadDevices();
    }, 300000);

    return () => clearInterval(interval);
  }, [loadSummary, loadDevices]);

  // Handlers
  const handleRefresh = () => {
    loadSummary();
    loadDevices();
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page on filter change
  };

  const handleResetFilters = () => {
    setFilters({
      project: "",
      status: "",
      state: "",
      city: "",
      search: "",
    });
    setPage(0);
  };

const handleRowClick = (deviceId) => {
  if (!deviceId) return;
  loadDeviceDetails(deviceId);
};

  const handleCloseDetail = () => {
    setSelectedDevice(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Derived values
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", py: 3, px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Devices Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Monitor and manage all connected devices
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Last synced: {lastFetchedAt ? lastFetchedAt.toLocaleString() : "—"}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} size="medium" color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* KPI Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPI
            label="Total Devices"
            value={summary?.total || 0}
            sub="All registered"
            icon={<BoltIcon />}
            accent="#3B82F6"
            loading={!summary}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPI
            label="Available"
            value={summary?.available || 0}
            sub="Ready to charge"
            icon={<BoltIcon />}
            accent="#10B981"
            loading={!summary}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPI
            label="Occupied"
            value={summary?.occupied || 0}
            sub="Active sessions"
            icon={<BoltIcon />}
            accent="#F59E0B"
            loading={!summary}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPI
            label="Offline"
            value={summary?.offline || 0}
            sub="Not reporting"
            icon={<OfflineBoltIcon />}
            accent="#6B7280"
            loading={!summary}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPI
            label="Faulty"
            value={summary?.faulty || 0}
            sub="Needs attention"
            icon={<WarningAmberIcon />}
            accent="#EF4444"
            loading={!summary}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPI
            label="Relay On"
            value={summary?.relayOn || 0}
            sub="Relays active"
            icon={<InfoIcon />}
            accent="#8B5CF6"
            loading={!summary}
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search device ID, serial, project..."
            size="small"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Project</InputLabel>
            <Select
              value={filters.project}
              label="Project"
              onChange={(e) => handleFilterChange("project", e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {filterOptions.projects.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Available">Available</MenuItem>
              <MenuItem value="Occupied">Occupied</MenuItem>
              <MenuItem value="Offline">Offline</MenuItem>
              <MenuItem value="Faulty">Faulty</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>State</InputLabel>
            <Select
              value={filters.state}
              label="State"
              onChange={(e) => handleFilterChange("state", e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {filterOptions.states.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>City</InputLabel>
            <Select
              value={filters.city}
              label="City"
              onChange={(e) => handleFilterChange("city", e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {filterOptions.cities.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {hasActiveFilters && (
            <Button variant="outlined" size="small" onClick={handleResetFilters}>
              Reset
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
          {filters.project && <Chip label={`Project: ${filters.project}`} onDelete={() => handleFilterChange("project", "")} />}
          {filters.status && <Chip label={`Status: ${filters.status}`} onDelete={() => handleFilterChange("status", "")} />}
          {filters.state && <Chip label={`State: ${filters.state}`} onDelete={() => handleFilterChange("state", "")} />}
          {filters.city && <Chip label={`City: ${filters.city}`} onDelete={() => handleFilterChange("city", "")} />}
        </Stack>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data Table */}
      <Paper sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>Device ID</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12 }} align="center">
                  State
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12 }} align="center">
                  Relay
                </TableCell>
                {!isMobile && (
                  <>
                    <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12 }} align="right">
                      Voltage
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12 }} align="right">
                      Current
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12 }} align="right">
                      Power
                    </TableCell>
                  </>
                )}
                <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton width={120} /></TableCell>
                    <TableCell align="center"><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell align="center"><Skeleton width={40} /></TableCell>
                    {!isMobile && (
                      <>
                        <TableCell align="right"><Skeleton width={60} /></TableCell>
                        <TableCell align="right"><Skeleton width={60} /></TableCell>
                        <TableCell align="right"><Skeleton width={60} /></TableCell>
                      </>
                    )}
                    <TableCell><Skeleton width={80} /></TableCell>
                  </TableRow>
                ))
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 5 : 8} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ color: "text.secondary" }}>No devices found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
                  <TableRow
                    key={device.deviceId}
                    onClick={() => handleRowClick(device.deviceId)}
                    hover
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontFamily: "monospace", fontSize: 13 }}>
                        {device.deviceId}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <StatusChip status={device.status} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500 }}>{device.project}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {device.relayOn ? (
                        <Chip label="ON" size="small" color="success" />
                      ) : (
                        <Chip label="OFF" size="small" color="default" />
                      )}
                    </TableCell>
                    {!isMobile && (
                      <>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 600 }}>{formatVoltage(device.voltage)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 600 }}>{formatCurrent(device.current)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 600 }}>{formatPower(device.voltage, device.current)}</Typography>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {timeAgo(device.updatedAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={totalDevices}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Devices per page"
        />
      </Paper>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={!!selectedDevice}
        onClose={handleCloseDetail}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 500, md: 560 } },
        }}
      >
        {selectedDevice && (
          <>
            <Box
              sx={{
                p: 2,
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Device Details
              </Typography>
              <IconButton onClick={handleCloseDetail} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <DeviceDetailPanel device={selectedDevice} onClose={handleCloseDetail} onRefreshDevice={loadDeviceDetails}/>
          </>
        )}
      </Drawer>
    </Box>
  );
}