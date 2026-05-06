// src/features/admin/LiveMonitoring.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { apiFetch } from "../../utils/apiFetch";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

/**
 * LiveMonitoring
 *
 * - Fetches active devices with: GET /api/devices/admin/live-devices
 * - For each device fetches telemetry with:
 *     GET /api/devices/admin/live-monitoring/:deviceId
 * - Expects response:
 *     { timestamps: [ISO...], voltage: [num...], current: [num...] }
 *
 * Styling details:
 * - Two separate charts per device (voltage & current)
 * - Charts are full width, fixed height (small), with dots + smooth curve
 * - Y-axis ticks show only the unique stored values (dynamic)
 * - X-axis shows no labels (empty), but tooltip displays readable time
 * - Auto-refresh every 60s
 *
 * Notes:
 * - If you want a lighter theme, adjust background & colors below.
 */

// small helper: unique sorted numbers (keeps precision)
function uniqueSorted(vals) {
  const set = new Map();
  for (const v of vals) {
    // use string key to preserve distinct representations but store numeric value
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

// small time formatter for tooltip
function formatTimeLabel(iso) {
  try {
    const d = new Date(iso);
    // show hours:minutes:seconds for tooltip clarity
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatHourTick(iso) {
  const d = new Date(iso);
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  return `${hours}${ampm}`;
}

// inject Inter font once (if not already loaded)
function ensureInter() {
  if (document.getElementById("gf-inter")) return;
  const link = document.createElement("link");
  link.id = "gf-inter";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap";
  document.head.appendChild(link);
}

const CHART_HEIGHT = 120; // fixed height for each chart (px)
const FETCH_INTERVAL_MS = 60_000; // 60s

function SmallChart({
  data,
  dataKey,
  stroke,
  yTicks,
  xTicks,
  tooltipLabel,
  yLabel,
}) {

  // data: [{ timeLabel, value }]
  return (
    <ResponsiveContainer
        width="100%"
        height={CHART_HEIGHT}
        style={{ outline: "none" }}
        >

      <LineChart
        data={data}
        margin={{ top: 6, right: 12, left: 6, bottom: 6 }}
        tabIndex={-1}           // 👈 prevents focus
        style={{ outline: "none" }}  // 👈 removes focus border
        >

        <CartesianGrid stroke="#142527" strokeDasharray="3 3" />
        {/* X axis: show no tick labels */}
            <XAxis
            dataKey="timeLabel"
            axisLine={false}
            tickLine={false}
            ticks={xTicks}                    // 👈 only hour markers
            tickFormatter={formatHourTick}    // 👈 convert ISO → 12AM format
            tick={{
                fill: "#9fd8df",
                fontSize: 11,
                fontFamily: "Inter, system-ui",
            }}
            />


        {/* Y axis: show only the provided ticks (exact values) */}
            <YAxis
            axisLine={false}
            tickLine={false}
            ticks={yTicks}
            tickFormatter={formatOneDecimal}   // 👈 ADD THIS
            tick={{
                fill: "#b7dfe6",
                fontSize: 11,
                fontFamily: "Inter, system-ui",
            }}
            domain={[(dataMin) => dataMin, (dataMax) => dataMax]}
            width={60}
            label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                offset: 0,
                fill: "#9fd8df",
                style: { fontSize: 11, fontFamily: "Inter, system-ui" },
            }}
            />

        <Tooltip
          cursor={false}
          contentStyle={{ background: "#061416", border: "1px solid #0a3a3f", color: "#cfeff4", fontFamily: "Inter, system-ui", fontSize: 12 }}
          formatter={(value) => [ value, dataKey === "voltage" ? "Voltage (V)" : "Current (A)" ]}
          labelFormatter={(label) => `${tooltipLabel ? tooltipLabel + " • " : ""}${formatTimeLabel(label)}`}
        />
        <Legend verticalAlign="top" height={20} wrapperStyle={{ top: -6, fontSize: 12, fontFamily: "Inter, system-ui", color: "#cfeff4" }} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 3 }}
          isAnimationActive={true}
          animationDuration={300}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function LiveMonitoring() {
  ensureInter();
  const theme = useTheme();
  const [deviceIds, setDeviceIds] = useState([]);
  const [deviceDataMap, setDeviceDataMap] = useState({}); // { deviceId: { chartData: [{timeLabel, voltage, current}], vTicks, cTicks, latest } }
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("Available");

  const filteredDevices = deviceIds.filter((d) => {
  const matchDevice =
    selectedDevice === "ALL" || d.device_id === selectedDevice;

  const matchStatus =
    selectedStatus === "ALL" ||
    String(d.status).toLowerCase() === selectedStatus.toLowerCase();

  return matchDevice && matchStatus;
});

  // fetch list of active devices (last 24h)
  const fetchDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const res = await apiFetch("/api/devices/admin/live-devices");
      // Expect array of deviceIds
      if (Array.isArray(res)) {
        setDeviceIds(
          res.map((id) => ({
            device_id: id,
            status: "Available", // default fallback
          }))
        );
      } else {
        setDeviceIds([]);
      }

    } catch (err) {
      console.error("Failed to fetch live devices:", err);
      setDeviceIds([]);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // fetch telemetry for a single deviceId
  const fetchDeviceTelemetry = useCallback(async (deviceId) => {
    try {
      const res = await apiFetch(`/api/devices/admin/live-monitoring/${encodeURIComponent(deviceId)}`);
      // Expect { timestamps: [...], voltage: [...], current: [...] }
      if (!res || !Array.isArray(res.timestamps)) return null;

      // Build array of data points
      const pts = [];
      for (let i = 0; i < res.timestamps.length; i++) {
        const t = res.timestamps[i];
        const v = typeof res.voltage?.[i] !== "undefined" ? Number(res.voltage[i]) : null;
        const c = typeof res.current?.[i] !== "undefined" ? Number(res.current[i]) : null;
        // use ISO timestamp as internal label but don't display on axis
        pts.push({
          timeISO: t,
          timeLabel: t, // used by x-axis internally; we will hide ticks
          voltage: v,
          current: c,
        });
      }

      // sort ascending by timestamp
      pts.sort((a, b) => new Date(a.timeISO) - new Date(b.timeISO));

      // Extract unique hour timestamps for X-axis ticks
const hourMap = new Map();

for (const p of pts) {
  const d = new Date(p.timeISO);
  const hourKey = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours()
  ).toISOString();

  if (!hourMap.has(hourKey)) {
    hourMap.set(hourKey, hourKey);
  }
}

const xTicks = Array.from(hourMap.values());


      // compute distinct ticks for Y axes (use stored values only)
      const vVals = pts.map((p) => p.voltage).filter((x) => x !== null && !Number.isNaN(x));
      const cVals = pts.map((p) => p.current).filter((x) => x !== null && !Number.isNaN(x));
      const vTicks = uniqueSorted(vVals);
      const cTicks = uniqueSorted(cVals);

      // prepare chart data with human-friendly short time for tooltip label (we keep ISO for labelFormatter)
      const chartData = pts.map((p) => ({
        timeLabel: p.timeISO,
        voltage: typeof p.voltage === "number" ? Number(p.voltage) : null,
        current: typeof p.current === "number" ? Number(p.current) : null,
      }));

      // latest values
      const latest = chartData.length ? chartData[chartData.length - 1] : null;

      return { chartData, vTicks, cTicks, xTicks, latest };
    } catch (err) {
      console.error("Failed fetch telemetry for", deviceId, err);
      return null;
    }
  }, []);

  // fetch telemetry for all devices in parallel (limited concurrency)
  const fetchAllTelemetry = useCallback(async (ids) => {
    setLoadingData(true);
    try {
      // simple parallel fetch — small number of devices expected
      const promises = ids.map((id) => fetchDeviceTelemetry(id).then((r) => ({ id, r })));
      const results = await Promise.all(promises);

      const map = {};
      for (const { id, r } of results) {
        if (r) map[id] = r;
      }
      setDeviceDataMap(map);
    } catch (err) {
      console.error("Failed fetching telemetry for all devices", err);
    } finally {
      setLoadingData(false);
    }
  }, [fetchDeviceTelemetry]);

  useEffect(() => {
  const style = document.createElement("style");
  style.innerHTML = `
    .recharts-wrapper:focus,
    .recharts-surface:focus {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);
  return () => document.head.removeChild(style);
}, []);


  // initial load + interval
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      await fetchDevices();
    };
    load();
    const devInterval = setInterval(() => {
      fetchDevices();
    }, FETCH_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(devInterval);
    };
  }, [fetchDevices]);

  // whenever deviceIds changes, fetch their telemetry
  useEffect(() => {
    if (!deviceIds || deviceIds.length === 0) {
      setDeviceDataMap({});
      setLoadingData(false);
      return;
    }

    // fetch telemetry immediately and then at interval
    fetchAllTelemetry(deviceIds.map(d => d.device_id));

    const interval = setInterval(() => {
      fetchAllTelemetry(deviceIds.map(d => d.device_id));

    }, FETCH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [deviceIds, fetchAllTelemetry]);

  const hasAnyData = Object.keys(deviceDataMap).length > 0;

  // UI colors
  const voltageColor = "#00E5FF"; // cyan
  const currentColor = "#FF6B9A"; // pink

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#071819 0%, #021214 100%)",
        p: { xs: 2, sm: 3, md: 4 },
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        color: "#d8f6fb",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, letterSpacing: 0.6 }}>
        Live Monitoring — Last 24 hours
      </Typography>
<Box
  sx={{
    display: "flex",
    gap: 2,
    mb: 3,
    alignItems: "center",
  }}
>
  {/* Device Filter */}
  <FormControl size="small" sx={{ minWidth: 160 }}>
    <InputLabel sx={{ color: "#9fd8df" }}>Device</InputLabel>
    <Select
      value={selectedDevice}
      label="Device"
      onChange={(e) => setSelectedDevice(e.target.value)}
      sx={{
        color: "#fff",
        ".MuiOutlinedInput-notchedOutline": {
          borderColor: "#0a3a3f",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "#00E5FF",
        },
      }}
    >
      <MenuItem value="ALL">All Devices</MenuItem>
      {deviceIds.map((d) => (
        <MenuItem key={d.device_id} value={d.device_id}>
          {d.device_id}
        </MenuItem>
      ))}
    </Select>
  </FormControl>

  {/* Status Filter */}
  <FormControl size="small" sx={{ minWidth: 160 }}>
    <InputLabel sx={{ color: "#9fd8df" }}>Status</InputLabel>
    <Select
      value={selectedStatus}
      label="Status"
      onChange={(e) => setSelectedStatus(e.target.value)}
      sx={{
        color: "#fff",
        ".MuiOutlinedInput-notchedOutline": {
          borderColor: "#0a3a3f",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "#00E5FF",
        },
      }}
    >
      <MenuItem value="Available">Available</MenuItem>
      <MenuItem value="Occupied">Occupied</MenuItem>
      <MenuItem value="Offline">Offline</MenuItem>
      <MenuItem value="Faulty">Faulty</MenuItem>
      <MenuItem value="ALL">All Status</MenuItem>
    </Select>
  </FormControl>
</Box>

      {loadingDevices ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
          <CircularProgress size={28} sx={{ color: "#00E5FF" }} />
          <Typography variant="body2" sx={{ mt: 1, color: "#9fd8df" }}>Loading active devices...</Typography>
        </Stack>
      ) : filteredDevices.length === 0 ? (

        <Paper sx={{ p: 4, background: "rgba(255,255,255,0.02)" }}>
          <Typography variant="body2" sx={{ color: "#9fd8df" }}>No devices have sent telemetry in the last 24 hours.</Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {/* For each device: render a device header and two charts (voltage then current) */}
          {filteredDevices.map((device) => {
            const deviceId = device.device_id;
            const deviceData = deviceDataMap[deviceId];
            const chartData = deviceData?.chartData ?? [];
            const vTicks =deviceData?.vTicks ?? [];
            const xTicks = deviceData?.xTicks ?? [];
            const cTicks = deviceData?.cTicks ?? [];
            const latest = deviceData?.latest ?? null;

            return (
              <Paper key={deviceId} sx={{ p: 2, borderRadius: 2, background: "linear-gradient(90deg, rgba(8,30,30,0.6), rgba(3,18,18,0.4))" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
<Stack>
  <Typography
    variant="subtitle2"
    sx={{ fontWeight: 800, color: "#da9500" }}
  >
    {deviceId}
  </Typography>

  <Typography
    variant="caption"
    sx={{ color: "#9fd8df", fontSize: 11 }}
  >
    {chartData.length
      ? `${chartData.length} entries`
      : "No stored points"}
  </Typography>

  {latest?.timeLabel && (
    <Typography
      variant="caption"
      sx={{
        color: "#7ee7f3",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.4,
      }}
    >
      Last Updated: {formatTimeLabel(latest.timeLabel)}
    </Typography>
  )}
</Stack>


                  <Stack direction="row" spacing={2} alignItems="flex-end">
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" sx={{ color: "#9fd8df" }}>Voltage</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: voltageColor }}>{latest?.voltage ?? "-"}</Typography>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" sx={{ color: "#9fd8df" }}>Current</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: currentColor }}>{latest?.current ?? "-"}</Typography>
                    </Box>
                  </Stack>
                </Stack>

                {/* Voltage chart (full width, fixed height) */}
                <Box sx={{ width: "100%", mb: 1 }}>
                  {loadingData && !deviceData ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                      <CircularProgress size={20} sx={{ color: voltageColor }} />
                    </Stack>
                  ) : chartData.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: "center", color: "#9fd8df" }}>No telemetry stored for voltage</Box>
                  ) : (
                    <SmallChart
                    data={chartData}
                    dataKey="voltage"
                    stroke={voltageColor}
                    yTicks={vTicks}
                    xTicks={xTicks}
                    tooltipLabel="Voltage"
                    />

                  )}
                </Box>

                {/* Current chart (full width, fixed height) */}
                <Box sx={{ width: "100%" }}>
                  {loadingData && !deviceData ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                      <CircularProgress size={20} sx={{ color: currentColor }} />
                    </Stack>
                  ) : chartData.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: "center", color: "#9fd8df" }}>No telemetry stored for current</Box>
                  ) : (
                    <SmallChart
                      data={chartData}
                      dataKey="current"
                      stroke={currentColor}
                      yTicks={cTicks}
                      xTicks={xTicks}
                      tooltipLabel="Current"
                    />
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
