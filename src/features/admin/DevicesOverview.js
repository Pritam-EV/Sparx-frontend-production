// src/features/admin/DevicesOverview.js
/**
 * Admin Devices Dashboard (full replacement)
 *
 * - Expects GET /api/devices/admin-dashboard to return { devices: [...], summary: {...} }
 * - Supports inline update of commercial fields via PUT /api/devices/:id
 * - Uses MUI (v5) components. Keep your existing apiFetch util.
 *
 * Paste/replace this file and restart your frontend.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Drawer,
  Tabs,
  Tab,
  Avatar,
  Button,
  Chip,
  LinearProgress,
  useTheme,
  Skeleton,
  Paper,
  Slider,
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
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { apiFetch } from "../../utils/apiFetch";

/* ---------------------------
   Tiny UX helpers & constants
   --------------------------- */
const STALE_MS = 30_000; // threshold for "stale" - tune as you like
const KPI_CARD_STYLE = {
  borderRadius: 2,
  px: 2,
  py: 1.25,
  minHeight: 88,
  boxShadow: "0 6px 20px rgba(12, 18, 28, 0.06)",
};

const formatKwh = (n) => (typeof n === "number" ? `${n.toFixed(2)} kWh` : "-");
const formatRate = (n) => (typeof n === "number" ? `₹ ${n.toFixed(2)}/kWh` : "-");
const timeAgo = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "-";
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
};

/* ---------------------------
   Small presentational components
   --------------------------- */
function StatusPill({ status }) {
  const s = (status || "").toLowerCase();
  const map = {
    online: { label: "ONLINE", color: "#16a34a" },
    Available: { label: "AVAILABLE", color: "#06b6d4" },
    Occupied: { label: "CHARGING", color: "#f59e0b" },
    busy: { label: "CHARGING", color: "#f59e0b" },
    offline: { label: "OFFLINE", color: "#6b7280" },
    maintenance: { label: "MAINT", color: "#7c3aed" },
    faulty: { label: "FAULT", color: "#dc2626" },
  };
  const cfg = map[s] || { label: status || "UNKNOWN", color: "#374151" };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: cfg.color,
        color: "#fff",
        fontWeight: 800,
        borderRadius: 1,
        px: 1,
      }}
    />
  );
}

function KPI({ label, value, sub, icon, accent }) {
  return (
    <Paper sx={{ ...KPI_CARD_STYLE }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {sub}
            </Typography>
          )}
        </Box>
        {icon ? (
          <Avatar variant="rounded" sx={{ bgcolor: accent || "#0ea5b6", width: 56, height: 56 }}>
            {icon}
          </Avatar>
        ) : null}
      </Stack>
    </Paper>
  );
}

/* ---------------------------
   Device card — rich visual
   --------------------------- */
function DeviceCard({ device, onOpen }) {
  const status = (device.status || "").toLowerCase();

const statusColors = {
  available: "#ecfeff",
  online: "#ecfeff",
  occupied: "#fff7ed",
  busy: "#fff7ed",
  offline: "#f3f4f6",
  faulty: "#fef2f2",
  maintenance: "#f5f3ff",
};

const cardBg = statusColors[status] || "#ffffff";
  const stale = device.isStale;
  const relayWarning = device.relayOnWithoutSession;
  const customPrice = !!device.commercial?.userRatePerKwh;
  return (
    <Card
      elevation={3}
sx={{
  borderRadius: 2.5,
  overflow: "hidden",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: cardBg, // 🔥 NEW
  transition: "transform 180ms ease, box-shadow 180ms ease",
  "&:hover": {
    transform: "translateY(-6px)",
    boxShadow: "0 12px 36px rgba(16,24,40,0.12)"
  },
}}
    >
<Box sx={{ p: 2 }}>
  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
    
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
        {device.device_id || device._id}
      </Typography>

      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
        {device.location || [device.area, device.city].filter(Boolean).join(", ")}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <StatusPill status={device.status} />

        {device.project && (
          <Chip
            size="small"
            label={device.project}
            sx={{ bgcolor: "#0ea5e9", color: "#fff", fontWeight: 700 }}
          />
        )}
      </Stack>
    </Box>

    <Stack alignItems="flex-end">
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Last seen
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        {timeAgo(device.lastSeen)}
      </Typography>
    </Stack>

  </Stack>
</Box>

      <Divider />
<CardContent sx={{ pt: 1 }}>
  <Grid container spacing={1}>

    <Grid item xs={6}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Rate
      </Typography>
      <Typography sx={{ fontWeight: 800 }}>
        {formatRate(device.commercial?.userRatePerKwh ?? device.rate)}
      </Typography>
    </Grid>

    <Grid item xs={6}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Energy
      </Typography>
      <Typography sx={{ fontWeight: 800 }}>
        {formatKwh(device.totalenergy ?? 0)}
      </Typography>
    </Grid>

  </Grid>
</CardContent>

<Box sx={{ p: 1.5 }}>
  <Button
    fullWidth
    variant="contained"
    size="small"
    onClick={() => onOpen(device)}
  >
    Inspect
  </Button>
</Box>
    </Card>
  );
}

/* ---------------------------
   Main component
   --------------------------- */
export default function DevicesOverview() {
  const theme = useTheme();
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [filter, setFilter] = useState({ state: "", city: "", status: "", project: "" });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [editCommercial, setEditCommercial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
const [allProjects, setAllProjects] = useState([]);
  // fetch
const load = useCallback(async (q = {}, silent = false) => {
  try {
    if (!silent) setLoading(true); // 🔥 only for manual load

    const params = new URLSearchParams();
    if (q.state) params.append("state", q.state);
    if (q.city) params.append("city", q.city);
    if (q.status) params.append("status", q.status);
    if (q.project) params.append("project", q.project);

    const res = await apiFetch(`/api/devices/admin-dashboard?${params.toString()}`);

    const list = Array.isArray(res.devices) ? res.devices : [];

    // 🔥 IMPORTANT: update WITHOUT resetting UI
setDevices(list);

    setSummary(res.summary || null);
    setLastFetchedAt(new Date());

  } catch (e) {
    console.error(e);
  } finally {
    if (!silent) setLoading(false);
  }
}, []);

useEffect(() => {
  // initial load
  load(filter);

  // auto refresh (silent)
  const t = setInterval(() => {
    load(filter, true); // 🔥 silent refresh
  }, 10000);

  return () => clearInterval(t);
}, [filter, load]);

useEffect(() => {
  // fetch all projects once (unfiltered)
  const fetchProjects = async () => {
    try {
      const res = await apiFetch("/api/devices/admin-dashboard");
      const list = Array.isArray(res.devices) ? res.devices : [];
      const unique = Array.from(new Set(list.map(d => d.project).filter(Boolean))).sort();
      setAllProjects(unique);
    } catch (e) {
      console.error("Failed to load projects");
    }
  };

  fetchProjects();
}, []);

  // derived lists
  const states = useMemo(() => Array.from(new Set(devices.map((d) => d.state).filter(Boolean))).sort(), [devices]);
  const cities = useMemo(() => Array.from(new Set(devices.map((d) => d.city).filter(Boolean))).sort(), [devices]);

  // filtered devices by search
const filtered = useMemo(() => {
  let list = devices;

  // 🔍 search filter (frontend)
  if (search) {
    const s = search.toLowerCase();
    list = list.filter((d) =>
      (d.device_id || "").toLowerCase().includes(s) ||
      (d.location || "").toLowerCase().includes(s) ||
      (d.city || "").toLowerCase().includes(s) ||
      (d._id || "").toString().toLowerCase().includes(s)
    );
  }

  return list;
}, [devices, search]);

  // actions: open detail
  const openDetail = (dev) => {
    setSelected(dev);
    setTabIndex(0);
    setEditCommercial(null);
  };

  // inline commercial edit
  const startEditCommercial = () => {
    if (!selected) return;
    setEditCommercial({
      userRatePerKwh: selected.commercial?.userRatePerKwh ?? selected.rate ?? null,
      vjraMarginPerKwh: selected.commercial?.vjraMarginPerKwh ?? selected.commercial?.vjraMarginPerKwh ?? null,
      ownerSharePerKwh: selected.commercial?.ownerSharePerKwh ?? null,
      electricityBearer: selected.commercial?.electricityBearer ?? "OWNER",
      pgPercent: selected.commercial?.pgPercent ?? null,
    });
  };

  const saveCommercial = async () => {
    if (!selected || !editCommercial) return;
    try {
      setSaving(true);
      // optimistic update on frontend
      const payload = { commercial: { ...editCommercial } };
      const resp = await apiFetch(`/api/devices/${selected._id}`, {
        method: "PUT",
        body: payload,
      });
      // reflect returned device if any (or refetch full list)
      // simple approach: refetch dashboard
      await load(filter);
      // close edit & refresh selected
      const updated = (await apiFetch(`/api/devices/${selected._id}`)) || selected;
      setSelected(updated);
      setEditCommercial(null);
    } catch (err) {
      console.error("Save commercial failed:", err);
      alert("Failed to save commercial: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const resetCommercialToLegacy = async () => {
    // reset commercial block to empty to fallback to legacy rate
    if (!selected) return;
    setConfirmResetOpen(false);
    try {
      setSaving(true);
      await apiFetch(`/api/devices/${selected._id}`, { method: "PUT", body: { commercial: {} } });
      await load(filter);
      const updated = (await apiFetch(`/api/devices/${selected._id}`)) || selected;
      setSelected(updated);
    } catch (err) {
      console.error(err);
      alert("Reset failed");
    } finally {
      setSaving(false);
    }
  };



  // small UI helpers
  const isEmpty = (obj) => !obj || Object.keys(obj).length === 0;

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", py: 3, px: { xs: 1, sm: 2 } }}>
      {/* header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>Internal Admin • Devices</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>A single view to monitor, troubleshoot and manage devices.</Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Last fetch: {lastFetchedAt ? lastFetchedAt.toLocaleTimeString() : "—"}</Typography>
          <IconButton onClick={() => load(filter)} size="small"><RefreshIcon /></IconButton>
        </Stack>
      </Stack>
<Typography sx={{ mb: 1, fontWeight: 800 }}>
  Filter Devices
</Typography>
      {/* Filters + search */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <TextField placeholder="Search device id or location" size="small" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
              <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Project</InputLabel>
              <Select
                value={filter.project}
                label="Project"
                onChange={(e) => setFilter(s => ({ ...s, project: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                {allProjects.map(p => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>State</InputLabel>
              <Select value={filter.state} label="State" onChange={(e) => setFilter(s => ({ ...s, state: e.target.value }))}>
                <MenuItem value="">All</MenuItem>
                {states.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>City</InputLabel>
              <Select value={filter.city} label="City" onChange={(e) => setFilter(s => ({ ...s, city: e.target.value }))}>
                <MenuItem value="">All</MenuItem>
                {cities.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filter.status} label="Status" onChange={(e) => setFilter(s => ({ ...s, status: e.target.value }))}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="occupied">Occupied</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
           <Button
            variant="outlined"
            onClick={() => {
              setFilter({ state: "", city: "", status: "", project: "" });
              setSearch("");
            }}
          >Reset</Button>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
  {filter.project && <Chip label={`Project: ${filter.project}`} />}
  {filter.state && <Chip label={`State: ${filter.state}`} />}
  {filter.city && <Chip label={`City: ${filter.city}`} />}
  {filter.status && <Chip label={`Status: ${filter.status}`} />}
</Stack>

      {/* KPIs grid */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Total Devices" value={summary?.total ?? <Skeleton width={60} />} sub="All registered devices" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Available" value={summary?.online ?? <Skeleton width={60} />} sub="Reporting devices" icon={<BoltIcon />} accent="#04bfbf" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Occupied" value={summary?.chargingNow ?? <Skeleton width={60} />} sub="Active sessions" icon={<BoltIcon />} accent="#17a504" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Offline" value={summary?.offline ?? <Skeleton width={60} />} sub="Devices not reporting" icon={<OfflineBoltIcon />} accent="#6b7280" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Faulty" value={summary?.faulty ?? <Skeleton width={40} />} sub="Flagged devices" icon={<OfflineBoltIcon />} accent="#ac0000" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Stale (>30s)" value={summary?.stale ?? <Skeleton width={40} />} sub="Potential comm. problems" icon={<WarningAmberIcon />} accent="#f97316" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Relay w/o session" value={summary?.relayWithoutSession ?? <Skeleton width={40} />} sub="Possible stuck relays" icon={<WarningAmberIcon />} accent="#ff0000" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Pending Onboard" value={summary?.pendingOnboard ?? <Skeleton width={40} />} sub="Waiting approval" icon={<InfoIcon />} accent="#7c3aed" />
        </Grid>
      </Grid>



      {/* alerts strip */}
      {summary && (summary.stale > 0 || summary.relayWithoutSession > 0 || summary.pendingOnboard > 0) && (
        <Paper sx={{ p: 1.25, mb: 2, borderLeft: "4px solid #fb923c" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningAmberIcon sx={{ color: "#fb923c" }} />
            <Typography sx={{ fontWeight: 800 }}>
              {summary.stale} stale • {summary.relayWithoutSession} relay w/o session • {summary.pendingOnboard} onboarding
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>Click a device card to inspect and manage.</Typography>
          </Stack>
        </Paper>
      )}

      {/* device grid */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} /></Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((d) => (
            <Grid item xs={12} sm={6} md={4} key={d._id || d.device_id}>
              <DeviceCard device={d} onOpen={openDetail} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* detail drawer */}
      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)} PaperProps={{ sx: { width: { xs: "100%", sm: 680 } } }}>
        {selected && (
          <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{selected.device_id}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>{selected.location}</Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <StatusPill status={selected.status} />
                <Chip label={selected.onboardingStatus || "onboarded"} size="small" />
                <IconButton onClick={() => { setSelected(null); }} size="small"><CloseIcon /></IconButton>
              </Stack>
            </Stack>

            <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ mb: 2 }}>
              <Tab label="Overview" />
              <Tab label="Commercial" />
              <Tab label="Telemetry" />
              <Tab label="Owner" />
            </Tabs>

            {/* Overview tab */}
            {tabIndex === 0 && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Charger Type</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{selected.charger_type}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Rate (legacy)</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{formatRate(selected.rate)}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Current Session</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{selected.current_session_id ? String(selected.current_session_id) : "-"}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Total Energy</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{formatKwh(selected.totalenergy ?? 0)}</Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Location (lat, lng)</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <RoomIcon sx={{ color: "text.secondary" }} />
                      <Typography sx={{ fontWeight: 800 }}>{selected.lat ? `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}` : "-"}</Typography>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Identifiers</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip label={`_id: ${String(selected._id).slice(-8)}`} size="small" />
                      {selected.serialNumber && <Chip label={`S: ${selected.serialNumber}`} size="small" />}
                      {selected.meterType && <Chip label={selected.meterType} size="small" />}
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Commercial tab */}
            {tabIndex === 1 && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Electricity Bearer</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{selected.commercial?.electricityBearer || "OWNER"}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Applied Rate</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{formatRate(selected.commercial?.userRatePerKwh ?? selected.rate)}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>VJRA Margin /kWh</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{selected.commercial?.vjraMarginPerKwh ?? "-"}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Owner Share /kWh</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{selected.commercial?.ownerSharePerKwh ?? "-"}</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 2 }} />

                {/* Edit controls */}
                {!editCommercial ? (
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<EditIcon />} onClick={startEditCommercial}>Edit commercial</Button>
                    {!isEmpty(selected.commercial) && <Button color="error" variant="outlined" onClick={() => setConfirmResetOpen(true)}>Reset commercial</Button>}
                  </Stack>
                ) : (
                  <Box>
                    <Grid container spacing={2} sx={{ mb: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          type="number"
                          label="User rate (₹/kWh)"
                          size="small"
                          fullWidth
                          value={editCommercial.userRatePerKwh ?? ""}
                          onChange={(e) => setEditCommercial((c) => ({ ...c, userRatePerKwh: e.target.value ? Number(e.target.value) : null }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          type="number"
                          label="VJRA margin (₹/kWh)"
                          size="small"
                          fullWidth
                          value={editCommercial.vjraMarginPerKwh ?? ""}
                          onChange={(e) => setEditCommercial((c) => ({ ...c, vjraMarginPerKwh: e.target.value ? Number(e.target.value) : null }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          type="number"
                          label="Owner share (₹/kWh)"
                          size="small"
                          fullWidth
                          value={editCommercial.ownerSharePerKwh ?? ""}
                          onChange={(e) => setEditCommercial((c) => ({ ...c, ownerSharePerKwh: e.target.value ? Number(e.target.value) : null }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Electricity bearer</InputLabel>
                          <Select
                            label="Electricity bearer"
                            value={editCommercial.electricityBearer}
                            onChange={(e) => setEditCommercial((c) => ({ ...c, electricityBearer: e.target.value }))}
                          >
                            <MenuItem value="OWNER">OWNER</MenuItem>
                            <MenuItem value="VJRA">VJRA</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          type="number"
                          label="PG percent"
                          size="small"
                          fullWidth
                          value={editCommercial.pgPercent ?? ""}
                          onChange={(e) => setEditCommercial((c) => ({ ...c, pgPercent: e.target.value ? Number(e.target.value) : null }))}
                        />
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button variant="outlined" onClick={() => setEditCommercial(null)}>Cancel</Button>
                      <Button startIcon={<SaveIcon />} variant="contained" onClick={saveCommercial} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                    </Stack>
                  </Box>
                )}
              </Box>
            )}

            {/* Telemetry tab */}
            {tabIndex === 2 && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Relay</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{selected.relayOn ? "On" : "Off"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Last seen</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{selected.lastSeen ? new Date(selected.lastSeen).toLocaleString() : "-"}</Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Total energy</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{formatKwh(selected.totalenergy ?? 0)}</Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Raw telemetry</Typography>
                    <Box sx={{ mt: 1, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "rgba(15,23,42,0.03)", p: 1, borderRadius: 1 }}>
                      <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify({
                          lat: selected.lat,
                          lng: selected.lng,
                          relayOn: selected.relayOn,
                          totalenergy: selected.totalenergy,
                          lastSeen: selected.lastSeen,
                          status: selected.status,
                        }, null, 2)}
                      </pre>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Owner tab */}
            {tabIndex === 3 && (
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Owner IDs</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
{Array.isArray(selected.ownerId) && selected.ownerId.length ? (
  selected.ownerId.map((owner) => (
    <Box
      key={owner._id}
      sx={{
        p: 1.5,
        borderRadius: 2,
        background: "rgba(15,23,42,0.03)",
      }}
    >
      <Typography sx={{ fontWeight: 800 }}>
        {owner.name || "No Name"}
      </Typography>

      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {owner.email}
      </Typography>

      <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
        {owner.phone}
      </Typography>

      <Chip
        size="small"
        label={owner.role}
        sx={{ mt: 1 }}
      />
    </Box>
  ))
) : (
  <Typography sx={{ fontWeight: 700 }}>—</Typography>
)}

                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" sx={{ color: "text.secondary" }}>Onboarded at</Typography>
                <Typography sx={{ fontWeight: 900 }}>{selected.onboardedAt ? new Date(selected.onboardedAt).toLocaleString() : "-"}</Typography>

                <Typography variant="caption" sx={{ color: "text.secondary", mt: 1 }}>Onboarded by</Typography>
                <Typography sx={{ fontWeight: 900 }}>{selected.onboardedBy ? String(selected.onboardedBy) : "-"}</Typography>
              </Box>
            )}

            {/* drawer actions */}
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => { /* open external detail */ }}>Open in full page</Button>
              <Button color="error" variant="outlined" onClick={() => { /* maybe schedule maintenance */ }}>Flag</Button>
              <Button variant="contained" onClick={() => setSelected(null)}>Close</Button>
            </Stack>
          </Box>
        )}
      </Drawer>

      {/* Reset confirmation dialog */}
      <Dialog open={confirmResetOpen} onClose={() => setConfirmResetOpen(false)}>
        <DialogTitle>Reset commercial</DialogTitle>
        <DialogContent>
          <Typography>Resetting commercial config will remove device-level overrides and revert to legacy rate. Continue?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmResetOpen(false)}>Cancel</Button>
          <Button color="error" onClick={resetCommercialToLegacy}>Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
