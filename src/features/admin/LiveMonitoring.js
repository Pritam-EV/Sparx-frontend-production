// src/features/admin/LiveMonitoring.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Stack, Paper, CircularProgress,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from "recharts";
import { apiFetch } from "../../utils/apiFetch";

function uniqueSorted(vals) {
  const set = new Map();
  for (const v of vals) {
    const key = typeof v === "number" ? v : Number(v);
    if (!Number.isNaN(key)) set.set(String(key), key);
  }
  const arr = Array.from(set.values());
  arr.sort((a, b) => a - b);
  return arr;
}

function formatOneDecimal(value) {
  if (value == null || isNaN(value)) return value;
  return Number(value).toFixed(1);
}

function formatTimeLabel(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function formatHourTick(iso) {
  const d = new Date(iso);
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}${ampm}`;
}

function ensureInter() {
  if (document.getElementById("gf-inter")) return;
  const link = document.createElement("link");
  link.id = "gf-inter";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap";
  document.head.appendChild(link);
}

const CHART_HEIGHT = 120;
const FETCH_INTERVAL_MS = 60_000;

const SELECT_SX = {
  color: "#fff",
  ".MuiOutlinedInput-notchedOutline": { borderColor: "#0a3a3f" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#00E5FF" },
  ".MuiSvgIcon-root": { color: "#9fd8df" },
};
const LABEL_SX = { color: "#9fd8df" };

function SmallChart({ data, dataKey, stroke, yTicks, xTicks, tooltipLabel, yLabel }) {
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT} style={{ outline: "none" }}>
      <LineChart data={data} margin={{ top: 6, right: 12, left: 6, bottom: 6 }} tabIndex={-1} style={{ outline: "none" }}>
        <CartesianGrid stroke="#142527" strokeDasharray="3 3" />
        <XAxis
          dataKey="timeLabel"
          axisLine={false} tickLine={false}
          ticks={xTicks} tickFormatter={formatHourTick}
          tick={{ fill: "#9fd8df", fontSize: 11, fontFamily: "Inter, system-ui" }}
        />
        <YAxis
          axisLine={false} tickLine={false}
          ticks={yTicks} tickFormatter={formatOneDecimal}
          tick={{ fill: "#b7dfe6", fontSize: 11, fontFamily: "Inter, system-ui" }}
          domain={[(dataMin) => dataMin, (dataMax) => dataMax]}
          width={60}
          label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 0, fill: "#9fd8df", style: { fontSize: 11, fontFamily: "Inter, system-ui" } }}
        />
        <Tooltip
          cursor={false}
          contentStyle={{ background: "#061416", border: "1px solid #0a3a3f", color: "#cfeff4", fontFamily: "Inter, system-ui", fontSize: 12 }}
          formatter={(value) => [value, dataKey === "voltage" ? "Voltage (V)" : "Current (A)"]}
          labelFormatter={(label) => `${tooltipLabel ? tooltipLabel + " • " : ""}${formatTimeLabel(label)}`}
        />
        <Legend verticalAlign="top" height={20} wrapperStyle={{ top: -6, fontSize: 12, fontFamily: "Inter, system-ui", color: "#cfeff4" }} />
        <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2}
          dot={{ r: 2 }} activeDot={{ r: 3 }}
          isAnimationActive={true} animationDuration={300} connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function LiveMonitoring() {
  ensureInter();

  const [filterOptions, setFilterOptions] = useState({ projects: [], areas: [], statuses: [] });
  const [selectedProject, setSelectedProject] = useState("ALL");
  const [selectedArea,    setSelectedArea]    = useState("ALL");
  const [selectedStatus,  setSelectedStatus]  = useState("ALL");

  const [devices,       setDevices]       = useState([]);
  const [deviceDataMap, setDeviceDataMap] = useState({});
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingData,    setLoadingData]    = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);

  const voltageColor = "#00E5FF";
  const currentColor = "#FF6B9A";

  // ─── Filter options ───────────────────────────────────────────────────────
  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await apiFetch("/api/devices/admin/live-devices/filter-options");
      if (res && res.projects) setFilterOptions(res);
    } catch (err) {
      console.error("Failed to fetch filter options:", err);
    }
  }, []);

  // ─── Devices (filtered) ───────────────────────────────────────────────────
  const fetchDevices = useCallback(async (project, area, status) => {
    setLoadingDevices(true);
    try {
      const params = new URLSearchParams();
      if (project !== "ALL") params.set("project", project);
      if (area    !== "ALL") params.set("area", area);
      if (status  !== "ALL") params.set("status", status);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch(`/api/devices/admin/live-devices${query}`);
      setDevices(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to fetch live devices:", err);
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // ─── Telemetry for one device ─────────────────────────────────────────────
  const fetchDeviceTelemetry = useCallback(async (deviceId) => {
    try {
      const res = await apiFetch(`/api/devices/admin/live-monitoring/${encodeURIComponent(deviceId)}`);
      if (!res || !Array.isArray(res.timestamps)) return null;

      const pts = res.timestamps.map((t, i) => ({
        timeISO:   t,
        timeLabel: t,
        voltage: res.voltage?.[i] != null ? Number(res.voltage[i]) : null,
        current: res.current?.[i] != null ? Number(res.current[i]) : null,
      })).sort((a, b) => new Date(a.timeISO) - new Date(b.timeISO));

      const hourMap = new Map();
      for (const p of pts) {
        const d = new Date(p.timeISO);
        const key = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).toISOString();
        if (!hourMap.has(key)) hourMap.set(key, key);
      }

      const vVals = pts.map(p => p.voltage).filter(x => x !== null && !Number.isNaN(x));
      const cVals = pts.map(p => p.current).filter(x => x !== null && !Number.isNaN(x));
      const chartData = pts.map(p => ({ timeLabel: p.timeISO, voltage: p.voltage, current: p.current }));

      return {
        chartData,
        vTicks: uniqueSorted(vVals),
        cTicks: uniqueSorted(cVals),
        xTicks: Array.from(hourMap.values()),
        latest: chartData.length ? chartData[chartData.length - 1] : null,
      };
    } catch (err) {
      console.error("Failed fetch telemetry for", deviceId, err);
      return null;
    }
  }, []);

  // ─── All telemetry (batch) ────────────────────────────────────────────────
  // ✅ FIX: accepts full device objects, not raw IDs
  // ✅ FIX: isInitialLoad=false → silent merge, charts stay visible
  const fetchAllTelemetry = useCallback(async (deviceList, isInitialLoad = false) => {
    if (isInitialLoad) setLoadingData(true);
    else setRefreshing(true);

    try {
      const results = await Promise.all(
        deviceList.map(d =>
          fetchDeviceTelemetry(d.device_id).then(r => ({ id: d.device_id, r }))
        )
      );
      const map = {};
      for (const { id, r } of results) {
        if (r) map[id] = r;
      }
      // Merge — old data stays until new data arrives
      setDeviceDataMap(prev => ({ ...prev, ...map }));
    } catch (err) {
      console.error("Failed fetching all telemetry:", err);
    } finally {
      if (isInitialLoad) setLoadingData(false);
      setRefreshing(false);
    }
  }, [fetchDeviceTelemetry]);

  // ─── Remove recharts focus outline ───────────────────────────────────────
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `.recharts-wrapper:focus, .recharts-surface:focus { outline: none !important; }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => { fetchFilterOptions(); }, [fetchFilterOptions]);

  useEffect(() => {
    fetchDevices(selectedProject, selectedArea, selectedStatus);
    const interval = setInterval(() => {
      fetchDevices(selectedProject, selectedArea, selectedStatus);
    }, FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDevices, selectedProject, selectedArea, selectedStatus]);

  // ✅ FIX: pass `devices` (not `deviceIds`), pass full objects
  useEffect(() => {
    if (!devices || devices.length === 0) {
      setDeviceDataMap({});
      setLoadingData(false);
      return;
    }
    fetchAllTelemetry(devices, true);
    const interval = setInterval(() => {
      fetchAllTelemetry(devices, false);
    }, FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [devices, fetchAllTelemetry]);

  return (
    <Box sx={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#071819 0%, #021214 100%)",
      p: { xs: 2, sm: 3, md: 4 },
      fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      color: "#d8f6fb",
    }}>

      {/* ✅ FIX: single header block — pulse dot is inline, no duplicate */}
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 1 }}>
        Live Monitoring — Last 24 hours
        {refreshing && (
          <Box component="span" sx={{
            display: "inline-block", width: 8, height: 8,
            borderRadius: "50%", background: "#00E5FF", flexShrink: 0,
            animation: "lm-pulse 1s ease-in-out infinite",
            "@keyframes lm-pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.15 },
            },
          }} />
        )}
      </Typography>

      {/* ── Filters ── */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={LABEL_SX}>Project</InputLabel>
          <Select value={selectedProject} label="Project" onChange={(e) => setSelectedProject(e.target.value)} sx={SELECT_SX}>
            <MenuItem value="ALL">All Projects</MenuItem>
            {filterOptions.projects.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={LABEL_SX}>Area</InputLabel>
          <Select value={selectedArea} label="Area" onChange={(e) => setSelectedArea(e.target.value)} sx={SELECT_SX}>
            <MenuItem value="ALL">All Areas</MenuItem>
            {filterOptions.areas.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={LABEL_SX}>Status</InputLabel>
          <Select value={selectedStatus} label="Status" onChange={(e) => setSelectedStatus(e.target.value)} sx={SELECT_SX}>
            <MenuItem value="ALL">All Status</MenuItem>
            {filterOptions.statuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>

        {!loadingDevices && (
          <Typography variant="caption" sx={{ color: "#9fd8df", alignSelf: "center", ml: 1 }}>
            {devices.length} device{devices.length !== 1 ? "s" : ""} shown
          </Typography>
        )}
      </Box>

      {/* ── Content ── */}
      {loadingDevices ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
          <CircularProgress size={28} sx={{ color: "#00E5FF" }} />
          <Typography variant="body2" sx={{ mt: 1, color: "#9fd8df" }}>Loading devices...</Typography>
        </Stack>
      ) : devices.length === 0 ? (
        <Paper sx={{ p: 4, background: "rgba(255,255,255,0.02)" }}>
          <Typography variant="body2" sx={{ color: "#9fd8df" }}>
            No devices match the selected filters or have telemetry in the last 24 hours.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {devices.map((device) => {
            const { device_id: deviceId, status, area, project, city } = device;
            const deviceData = deviceDataMap[deviceId];
            const chartData  = deviceData?.chartData ?? [];
            const vTicks     = deviceData?.vTicks     ?? [];
            const cTicks     = deviceData?.cTicks     ?? [];
            const xTicks     = deviceData?.xTicks     ?? [];
            const latest     = deviceData?.latest     ?? null;

            return (
              <Paper key={deviceId} sx={{ p: 2, borderRadius: 2, background: "linear-gradient(90deg, rgba(8,30,30,0.6), rgba(3,18,18,0.4))" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#da9500" }}>{deviceId}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {status && (
                        <Typography variant="caption" sx={{
                          px: 1, py: 0.25, borderRadius: 1, fontSize: 10, fontWeight: 600,
                          background: status.toLowerCase() === "available" ? "rgba(0,229,255,0.12)" :
                                      status.toLowerCase() === "occupied"  ? "rgba(255,107,154,0.12)" : "rgba(255,255,255,0.07)",
                          color: status.toLowerCase() === "available" ? "#00E5FF" :
                                 status.toLowerCase() === "occupied"  ? "#FF6B9A" : "#9fd8df",
                        }}>{status}</Typography>
                      )}
                      {area    && <Typography variant="caption" sx={{ color: "#7ee7f3", fontSize: 10 }}>{area}</Typography>}
                      {project && <Typography variant="caption" sx={{ color: "#b5a0e8", fontSize: 10 }}>📁 {project}</Typography>}
                      {city    && <Typography variant="caption" sx={{ color: "#9fd8df",  fontSize: 10 }}>{city}</Typography>}
                    </Stack>
                    <Typography variant="caption" sx={{ color: "#9fd8df", fontSize: 11 }}>
                      {chartData.length ? `${chartData.length} entries` : "No stored points"}
                    </Typography>
                    {latest?.timeLabel && (
                      <Typography variant="caption" sx={{ color: "#7ee7f3", fontSize: 11, fontWeight: 600, letterSpacing: 0.4 }}>
                        Last Updated: {formatTimeLabel(latest.timeLabel)}
                      </Typography>
                    )}
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="flex-end">
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" sx={{ color: "#9fd8df" }}>Voltage</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: voltageColor }}>{latest?.voltage ?? "—"}</Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" sx={{ color: "#9fd8df" }}>Current</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: currentColor }}>{latest?.current ?? "—"}</Typography>
                    </Box>
                  </Stack>
                </Stack>

                <Box sx={{ width: "100%", mb: 1 }}>
                  {loadingData && !deviceData ? (
                    <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={20} sx={{ color: voltageColor }} /></Stack>
                  ) : chartData.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: "center", color: "#9fd8df" }}>No telemetry stored for voltage</Box>
                  ) : (
                    <SmallChart data={chartData} dataKey="voltage" stroke={voltageColor} yTicks={vTicks} xTicks={xTicks} tooltipLabel="Voltage" yLabel="V" />
                  )}
                </Box>

                <Box sx={{ width: "100%" }}>
                  {loadingData && !deviceData ? (
                    <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={20} sx={{ color: currentColor }} /></Stack>
                  ) : chartData.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: "center", color: "#9fd8df" }}>No telemetry stored for current</Box>
                  ) : (
                    <SmallChart data={chartData} dataKey="current" stroke={currentColor} yTicks={cTicks} xTicks={xTicks} tooltipLabel="Current" yLabel="A" />
                  )}
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}