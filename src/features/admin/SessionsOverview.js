// src/features/admin/SessionsOverview.js
import React, { useEffect, useCallback, useMemo, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  Drawer,
  IconButton,
  Chip,
  LinearProgress,
  Tooltip,
  Button,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BoltIcon from "@mui/icons-material/Bolt";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ScheduleIcon from "@mui/icons-material/Schedule";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Select, MenuItem } from "@mui/material";
/*
  SessionsOverview (admin)
  - Fetches sessions + users
  - Top KPIs
  - Live session cards (full details requested)
  - Past session cards
  - Right drawer with full session details (all fields you asked)
*/

/* ---------------------- Helpers ---------------------- */

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;
const kwh = (v) => `${Number(v || 0).toFixed(2)} kWh`;
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const durationMinutes = (s, e) => {
  if (!s) return "—";
  const start = new Date(s);
  const end = e ? new Date(e) : new Date();
  const mins = Math.round((end - start) / 60000);
  return `${mins} min`;
};

const safeRefund = (s) =>
  Number(s?.refundAmount ?? s?.refund?.amount ?? s?.discountApplied ?? 0);

/* compact info row styled like PastSessions */
function CompactInfoRow({ icon: Icon, label, value }) {



  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Icon sx={{ fontSize: 16, color: "#04BFBF", flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: "#64748b",
            fontSize: 10,
            display: "block",
            fontWeight: 700,
            letterSpacing: "0.3px",
            textTransform: "uppercase",
            lineHeight: 1.1,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 14,
            color: "#0f172a",
            mt: 0.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/* KPI card */
function KPI({ label, value, sub }) {
  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

/* ---------------------- Main Component ---------------------- */

export default function SessionsOverview() {
  const [activeTab, setActiveTab] = useState("live"); // "live" | "past"

const [liveFilter, setLiveFilter] = useState({
  deviceId: "",
  project: "",
  user: "",
});

const [pastFilter, setPastFilter] = useState({
  deviceId: "",
  project: "",
  user: "",
});
const [deviceProjectMap, setDeviceProjectMap] = useState({});
  const [sessions, setSessions] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      // fetch sessions and users in parallel
      const [sResp, uResp] = await Promise.all([
        apiFetch("/api/sessions/all?page=1&limit=2000"),
        apiFetch("/api/users"),
      ]);

      const dResp = await apiFetch("/api/devices/admin-dashboard");
const dList = Array.isArray(dResp.devices) ? dResp.devices : [];

const projectMap = {};
dList.forEach(d => {
  projectMap[d.device_id] = d.project;
});

setDeviceProjectMap(projectMap);

      // Make sessions list robust (some APIs return array or { sessions: [...] })
      const sList = Array.isArray(sResp) ? sResp : sResp.sessions || sResp || [];
      const uList = Array.isArray(uResp) ? uResp : uResp.users || uResp || [];

      // build user map by _id (string)
      const map = {};
      (uList || []).forEach((u) => {
        if (!u) return;
        map[String(u._id || u.id)] = u;
      });

      // set state
      setSessions(sList);
      setUsersMap(map);
      setLastFetched(new Date());
    } catch (err) {
      console.error("Failed to fetch sessions/users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30_000); // refresh periodically
    return () => clearInterval(t);
  }, [fetchAll]);

  // derive lists and KPIs
  const { activeSessions, completedSessions, totals } = useMemo(() => {
    const active = sessions.filter((s) => s.status === "active");
    const completed = sessions.filter((s) => s.status === "completed");

    const totalEnergy = sessions.reduce((acc, s) => acc + Number(s.energyConsumed || 0), 0);
    const totalRevenue = sessions.reduce((acc, s) => acc + Number(s.amountUsed || 0), 0);
    const avgEnergy = sessions.length ? totalEnergy / sessions.length : 0;
    const avgRevenue = sessions.length ? totalRevenue / sessions.length : 0;

    return {
      activeSessions: active,
      completedSessions: completed,
      totals: {
        totalSessions: sessions.length,
        activeCount: active.length,
        completedCount: completed.length,
        totalEnergy,
        totalRevenue,
        avgEnergy,
        avgRevenue,
      },
    };
  }, [sessions]);

  const getUser = (s) => {
  return s.user || usersMap[s.userId] || {};
};

const filterSessions = (list, filter, deviceProjectMap, getUser) => {
  return list.filter((s) => {
    const user = getUser(s);
    const project = deviceProjectMap[s.deviceId] || "";

    return (
      (!filter.deviceId || s.deviceId?.toLowerCase().includes(filter.deviceId.toLowerCase())) &&
      (!filter.user || (user.name || "").toLowerCase().includes(filter.user.toLowerCase())) &&
      (!filter.project || project === filter.project)
    );
  });
};
  const filteredLive = useMemo(() => {
  return filterSessions(activeSessions, liveFilter, deviceProjectMap, getUser);
}, [activeSessions, liveFilter, deviceProjectMap]);


const filteredPast = useMemo(() => {
  return filterSessions(completedSessions, pastFilter, deviceProjectMap, getUser);
}, [completedSessions, pastFilter, deviceProjectMap]);

  // helper to get user object from session (session.userId may already be populated object)


  // small visual: shorten id
  const short = (id) => (id ? String(id).slice(0, 12) : "—");
const currentList = activeTab === "live" ? filteredLive : filteredPast;

const projects = useMemo(() => {
  return Array.from(
    new Set(Object.values(deviceProjectMap).filter(Boolean))
  ).sort();
}, [deviceProjectMap]);

  const filteredEnergy = currentList.reduce(
  (acc, s) => acc + Number(s.energyConsumed || 0),
  0
);

const filteredRevenue = currentList.reduce(
  (acc, s) => acc + Number(s.amountUsed || 0),
  0
);

const avgEnergyFiltered = currentList.length
  ? filteredEnergy / currentList.length
  : 0;

const avgRevenueFiltered = currentList.length
  ? filteredRevenue / currentList.length
  : 0;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: "100vh", background: "linear-gradient(to bottom,#f8fafc,#f1f5f9)" }}>
      {/* Header + refresh */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, md: 28 }, fontWeight: 900 }}>Charging Sessions</Typography>
          <Typography sx={{ color: "#64748b" }}>Live & past sessions across devices</Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ color: "text.secondary" }}>{lastFetched ? lastFetched.toLocaleTimeString() : "—"}</Typography>
          <Tooltip title="Refresh now">
            <IconButton onClick={fetchAll} size="small" sx={{ bgcolor: "#04BFBF", color: "#fff" }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
  <Button
    variant={activeTab === "live" ? "contained" : "outlined"}
    onClick={() => setActiveTab("live")}
  >
    Live Sessions
  </Button>

  <Button
    variant={activeTab === "past" ? "contained" : "outlined"}
    onClick={() => setActiveTab("past")}
  >
    Past Sessions
  </Button>
</Stack>
<Card sx={{ mb: 2, p: 1 }}>
  <CardContent>
     <Stack
  direction={{ xs: "column", md: "row" }}
  spacing={2}
  alignItems="center"
>

      <TextField
        label="Device ID"
        size="small"
        value={(activeTab === "live" ? liveFilter.deviceId : pastFilter.deviceId)}
        onChange={(e) => {
          const val = e.target.value;
          activeTab === "live"
            ? setLiveFilter(f => ({ ...f, deviceId: val }))
            : setPastFilter(f => ({ ...f, deviceId: val }));
        }}
      />

      <TextField
        label="User Name"
        size="small"
        value={(activeTab === "live" ? liveFilter.user : pastFilter.user)}
        onChange={(e) => {
          const val = e.target.value;
          activeTab === "live"
            ? setLiveFilter(f => ({ ...f, user: val }))
            : setPastFilter(f => ({ ...f, user: val }));
        }}
      />

    <Select
      size="small"
      value={activeTab === "live" ? liveFilter.project : pastFilter.project}
      onChange={(e) => {
        const val = e.target.value;
        activeTab === "live"
          ? setLiveFilter(f => ({ ...f, project: val }))
          : setPastFilter(f => ({ ...f, project: val }));
      }}
    >
      <MenuItem value="">All Projects</MenuItem>
      {projects.map(p => (
        <MenuItem key={p} value={p}>{p}</MenuItem>
      ))}
    </Select>

    </Stack>
  </CardContent>
</Card>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        
        <Grid item xs={6} md={2}>
          <KPI label="Total Sessions" value={currentList.length} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KPI label="Active Sessions" value={filteredLive.length} />
        </Grid>
        <Grid item xs={6} md={2}>
         <KPI label="Completed Sessions" value={filteredPast.length} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KPI label="Energy Delivered" value={`${filteredEnergy.toFixed(2)} kWh`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KPI label="Revenue" value={money(filteredRevenue)} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KPI
  label="Avg Energy / Session"
  value={`${avgEnergyFiltered.toFixed(2)} kWh`}
  sub={`Avg ₹ ${avgRevenueFiltered.toFixed(2)} / session`}
/>
        </Grid>
      </Grid>

      {/* LIVE SESSION CARDS (full fields on card as you requested) */}
      
      {activeTab === "live" && (
  <>
    <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 2 }}>
      Live Sessions
    </Typography>

      {loading ? (
        <Card sx={{ p: 3, mb: 2 }}>
          <Typography>Loading sessions…</Typography>
        </Card>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {filteredLive.length === 0 && (
            <Grid item xs={12}>
              <Card sx={{ p: 3 }}>
                <Typography sx={{ color: "#64748b" }}>No active sessions right now.</Typography>
              </Card>
            </Grid>
          )}

          {filteredLive.map((s) => {
            const user = getUser(s);
            const refund = safeRefund(s);
            return (
              <Grid item xs={12} md={6} lg={4} key={s._id || s.sessionId}>
                <Card
                  onClick={() => setSelected(s)}
                  sx={{
                    borderRadius: 3,
                    border: "1px solid #e8eef2",
                    cursor: "pointer",
                    "&:hover": { boxShadow: "0 18px 40px rgba(4,191,191,0.12)", transform: "translateY(-6px)" },
                  }}
                >
                  <CardContent>
                    <Stack spacing={1.25}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography sx={{ fontWeight: 900, color: "#04BFBF" }}>{s.deviceId}</Typography>
                          <Typography sx={{ fontSize: 13, color: "#0f172a" }}>
                            {user.name || "Unknown user"} • {user.mobile || "-"}
                          </Typography>
                        </Box>

                        <Chip label="LIVE" size="small" sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 800 }} />
                      </Stack>

                      <Divider />

                      {/* required card fields */}
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <CompactInfoRow icon={BoltIcon} label="Energy Selected" value={kwh(s.energySelected)} />
                        </Grid>
                        <Grid item xs={6}>
                          <CompactInfoRow icon={BoltIcon} label="Energy Consumed" value={kwh(s.energyConsumed)} />
                        </Grid>

                        <Grid item xs={6}>
                          <CompactInfoRow icon={AccountBalanceWalletIcon} label="Amount Paid" value={money(s.amountPaid)} />
                        </Grid>
                        <Grid item xs={6}>
                          <CompactInfoRow icon={AccountBalanceWalletIcon} label="Amount Used" value={money(s.amountUsed)} />
                        </Grid>

                        <Grid item xs={6}>
                          <CompactInfoRow icon={AccountBalanceWalletIcon} label="Discount" value={money(refund)} />
                        </Grid>
                        <Grid item xs={6}>
                          <CompactInfoRow icon={ScheduleIcon} label="Started" value={fmtDateTime(s.startTime)} />
                        </Grid>

                        <Grid item xs={6}>
                          <CompactInfoRow icon={ScheduleIcon} label="Stopped" value={fmtDateTime(s.endTime)} />
                        </Grid>
                        <Grid item xs={6}>
                          <CompactInfoRow icon={ScheduleIcon} label="Duration" value={durationMinutes(s.startTime, s.endTime)} />
                        </Grid>
                      </Grid>

                      {/* progress bar: energy percent */}
                      <Box>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          Progress
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={
                            s.energySelected ? Math.min((Number(s.energyConsumed || 0) / Number(s.energySelected || 1)) * 100, 100) : 0
                          }
                          sx={{ height: 8, borderRadius: 2, mt: 0.5 }}
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        
      )}

      {!loading && currentList.length === 0 && (
  <Card sx={{ p: 3 }}>
    <Typography sx={{ color: "#64748b" }}>
      No sessions match the selected filters.
    </Typography>
  </Card>
)}


  </>
)}
      {/* PAST SESSIONS (cards) */}
      {activeTab === "past" && (
  <>
    <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 2 }}>
      Past Sessions
    </Typography>

      <Grid container spacing={2}>
        {filteredPast.length === 0 && !loading && (
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography sx={{ color: "#64748b" }}>No past sessions found for the selected period.</Typography>
            </Card>
          </Grid>
        )}

        {filteredPast.map((s) => {
          const user = getUser(s);
          const refund = safeRefund(s);
          return (
            <Grid item xs={12} md={6} lg={3} key={s._id || s.sessionId}>
              <Card
                onClick={() => setSelected(s)}
                sx={{
                  borderRadius: 3,
                  border: "1px solid #e8eef2",
                  "&:hover": { boxShadow: "0 12px 32px rgba(4,191,191,0.12)", borderColor: "#04BFBF", transform: "translateY(-4px)" },
                }}
              >
                <CardContent>
                  <Stack spacing={1.25}>
                    <Typography sx={{ fontWeight: 900, color: "#04BFBF" }}>{s.deviceId}</Typography>
                    <Typography sx={{ fontSize: 13 }}>{user.name || "Unknown"} • {user.mobile || "-"}</Typography>

                    <Divider />

                    <CompactInfoRow icon={BoltIcon} label="Energy" value={kwh(s.energyConsumed)} />
                    <CompactInfoRow icon={AccountBalanceWalletIcon} label="Amount" value={money(s.amountUsed)} />
                    <CompactInfoRow icon={ScheduleIcon} label="Duration" value={durationMinutes(s.startTime, s.endTime)} />
                    <CompactInfoRow icon={AccountBalanceWalletIcon} label="Discount" value={money(refund)} />

                    <Box sx={{ bgcolor: "#f8fafc", p: 1.25, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: "#64748b", fontSize: 11 }}>
                        {fmtDateTime(s.startTime)} → {fmtDateTime(s.endTime)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
        </>
        
)}

{!loading && currentList.length === 0 && (
  <Card sx={{ p: 3 }}>
    <Typography sx={{ color: "#64748b" }}>
      No sessions match the selected filters.
    </Typography>
  </Card>
)}
      {/* RIGHT DRAWER: full session detail slider (all requested fields) */}
      <Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelected(null)} PaperProps={{ sx: { width: 480, p: 3 } }}>
        {selected && (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 900, fontSize: 18 }}>Session Details</Typography>
              <IconButton onClick={() => setSelected(null)}><CloseIcon /></IconButton>
            </Stack>

            <Divider />

            {/* top summary */}
            <Stack spacing={0.5}>
              <Typography><b>Session ID:</b> {selected.sessionId || short(selected._id)}</Typography>
              <Typography><b>Transaction ID:</b> {selected.transactionId || "—"}</Typography>
              <Typography><b>Device ID:</b> {selected.deviceId}</Typography>
            </Stack>

            <Divider />

            {/* user details */}
            {(() => {
              const u = getUser(selected);
              return (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>User</Typography>
                  <CompactInfoRow icon={PersonIcon} label="Name" value={u.name || "—"} />
                  <CompactInfoRow icon={PersonIcon} label="Phone" value={u.mobile || "—"} />
                  <CompactInfoRow icon={PersonIcon} label="Email" value={u.email || "—"} />
                </>
              );
            })()}

            <Divider />

            {/* financial / energy */}
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Financial & Energy</Typography>
            <CompactInfoRow icon={BoltIcon} label="Energy Selected" value={kwh(selected.energySelected)} />
            <CompactInfoRow icon={BoltIcon} label="Energy Consumed" value={kwh(selected.energyConsumed)} />
            <CompactInfoRow icon={AccountBalanceWalletIcon} label="Amount Paid" value={money(selected.amountPaid)} />
            <CompactInfoRow icon={AccountBalanceWalletIcon} label="Amount Used" value={money(selected.amountUsed)} />
            <CompactInfoRow icon={AccountBalanceWalletIcon} label="Refund" value={money(safeRefund(selected))} />
            <CompactInfoRow icon={AccountBalanceWalletIcon} label="Rate (/kWh)" value={`₹ ${Number(selected.ratePerKwh || selected.rate || 0).toFixed(2)}`} />

            <Divider />

            {/* session metadata */}
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Timing & Telemetry</Typography>
            <CompactInfoRow icon={ScheduleIcon} label="Start" value={fmtDateTime(selected.startTime)} />
            <CompactInfoRow icon={ScheduleIcon} label="Stop" value={fmtDateTime(selected.endTime)} />
            <CompactInfoRow icon={ScheduleIcon} label="Duration" value={durationMinutes(selected.startTime, selected.endTime)} />
            <CompactInfoRow icon={ScheduleIcon} label="End Trigger" value={selected.endTrigger || "—"} />
            <CompactInfoRow icon={BoltIcon} label="Voltage (V)" value={selected.latestVoltage ?? "—"} />
            <CompactInfoRow icon={BoltIcon} label="Current (A)" value={selected.latestCurrent ?? "—"} />
            <CompactInfoRow icon={BoltIcon} label="Power (W)" value={selected.latestPower ?? "—"} />

            <Divider />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="contained" onClick={() => setSelected(null)}>Close</Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Box>
  );
}