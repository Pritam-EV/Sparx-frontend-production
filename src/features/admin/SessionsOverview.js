import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box, Typography, Grid, Stack, Drawer, IconButton,
  Tooltip, CircularProgress
} from "@mui/material";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip as RTooltip, CartesianGrid
} from "recharts";
import {
  Refresh, Close, EvStation, FlashOn, BoltOutlined,
  FiberManualRecord, AccessTime, CurrencyRupee, KeyboardArrowDown,
  ElectricCar, Receipt, Autorenew
} from "@mui/icons-material";
import { api } from "../../api";

// ─── Constants ────────────────────────────────────────────────────────────────
const PERIODS = [
  { label: "Today",      value: "today" },
  { label: "This Week",  value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last Month", value: "last_month" },
  { label: "Quarter",    value: "quarter" },
  { label: "This Year",  value: "year" },
];

const STATUS_META = {
  active:     { label: "Live",       bg: "#dcfce7", text: "#16a34a", dot: "#22c55e" },
  paused:     { label: "Paused",     bg: "#fef9c3", text: "#ca8a04", dot: "#eab308" },
  completed:  { label: "Completed",  bg: "#e0f2fe", text: "#0284c7", dot: "#38bdf8" },
  stopped:    { label: "Stopped",    bg: "#fee2e2", text: "#dc2626", dot: "#f87171" },
  terminated: { label: "Terminated", bg: "#fce7f3", text: "#db2777", dot: "#f472b6" },
};

const END_TRIGGER_LABELS = {
  energy_limit:   "Energy limit reached",
  amount_limit:   "Amount exhausted",
  user_stopped:   "Stopped by user",
  admin_stopped:  "Stopped by admin",
  device_offline: "Device went offline",
  timeout:        "Session timeout",
  manual:         "Manual stop",
};

const ACCENT = "#2563eb";
const GREEN  = "#10b981";
const AMBER  = "#f59e0b";
const RED    = "#ef4444";
const PURPLE = "#8b5cf6";
const CHART_TABS = ["Sessions", "Energy", "Revenue"];
const LIVE_REFRESH_MS = 15000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (v, d = 2) => Number(v || 0).toFixed(d);
const money   = (v) => `₹ ${fmt(v)}`;
const kwh     = (v) => `${fmt(v, 3)} kWh`;
const dur     = (s, e) => {
  if (!s) return "—";
  const ms = (e ? new Date(e) : new Date()) - new Date(s);
  if (ms < 0) return "—";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
};
const fmtDt = (v) =>
  v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

function buildChartData(sessions, period) {
  if (!sessions?.length) return [];
  const DAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const map = {};
  sessions.forEach((s) => {
    const d = new Date(s.startTime);
    let key;
    if      (period === "today")                            key = `${d.getHours()}:00`;
    else if (period === "week")                             key = DAY[d.getDay()];
    else if (period === "month" || period === "last_month") key = String(d.getDate());
    else key = `${MON[d.getMonth()]} ${d.getFullYear()}`;
    if (!map[key]) map[key] = { label: key, sessions: 0, energy: 0, revenue: 0 };
    map[key].sessions += 1;
    map[key].energy   += +(s.energyConsumed || 0);
    map[key].revenue  += +(s.amountPaid     || 0);
  });
  return Object.values(map).map(v => ({
    ...v, energy: +fmt(v.energy, 3), revenue: +fmt(v.revenue),
  }));
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ label, active, onClick, color }) {
  return (
    <Box onClick={onClick} sx={{
      px: 1.5, py: 0.5, borderRadius: "20px", cursor: "pointer",
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", userSelect: "none",
      transition: "all .14s",
      background: active ? (color || "#0f172a") : "transparent",
      color:      active ? "#fff" : "#64748b",
      border:     active ? `1px solid ${color || "#0f172a"}` : "1px solid #e2e8f0",
      "&:hover": { background: active ? (color || "#0f172a") : "#f1f5f9" }
    }}>{label}</Box>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, pulse }) {
  const m = STATUS_META[status] || STATUS_META.completed;
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.6,
      px: 1, py: 0.3, borderRadius: "20px", fontSize: 10, fontWeight: 700,
      background: m.bg, color: m.text, whiteSpace: "nowrap"
    }}>
      <Box sx={{
        width: 6, height: 6, borderRadius: "50%", background: m.dot,
        ...(pulse && status === "active" ? {
          animation: "pulseDot 1.4s ease-in-out infinite",
          "@keyframes pulseDot": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } }
        } : {})
      }} />
      {m.label}
    </Box>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, loading }) {
  return (
    <Box sx={{
      background: "#fff", borderRadius: "12px", p: 2,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: `3px solid ${color}`,
      opacity: loading ? 0.6 : 1, transition: "opacity .2s", height: "100%"
    }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
        <Box sx={{
          width: 28, height: 28, borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: color + "18", color, flexShrink: 0, "& svg": { fontSize: 14 }
        }}>{icon}</Box>
        <Typography fontSize={10} fontWeight={600} color="#94a3b8"
          sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>
      </Stack>
      {loading
        ? <Box sx={{ height: 20, width: "70%", borderRadius: 1, background: "#f1f5f9" }} />
        : <>
            <Typography fontSize={16} fontWeight={800} color="#0f172a">{value}</Typography>
            {sub && <Typography fontSize={10} color="#94a3b8" mt={0.25}>{sub}</Typography>}
          </>
      }
    </Box>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────
function Th({ children, align = "left", width }) {
  return (
    <th style={{
      width, padding: "10px 12px", textAlign: align,
      fontSize: 11, fontWeight: 700, color: "#64748b",
      letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap"
    }}>{children}</th>
  );
}
function Td({ children, align = "left", mono, bold, blue, green, red, muted }) {
  return (
    <td style={{
      padding: "10px 12px", textAlign: align, fontSize: 12,
      fontFamily: mono ? "monospace" : "inherit",
      fontWeight: bold ? 700 : 400,
      color: blue ? "#2563eb" : green ? "#059669" : red ? "#dc2626" : muted ? "#94a3b8" : "#1e293b",
      whiteSpace: "nowrap"
    }}>{children}</td>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = ACCENT }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <Box sx={{ width: "100%", background: "#f1f5f9", borderRadius: "4px", height: 5, overflow: "hidden" }}>
      <Box sx={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px", transition: "width .3s" }} />
    </Box>
  );
}

// ─── Session Detail Drawer ────────────────────────────────────────────────────
function SessionDrawer({ session: s, onClose }) {
  const isLive = s.status === "active" || s.status === "paused";
  const energyPct = s.energySelected > 0 ? Math.min(100, ((s.energyConsumed || 0) / s.energySelected) * 100) : 0;
  const amtPct    = s.amountPaid     > 0 ? Math.min(100, ((s.amountUsed    || 0) / s.amountPaid)     * 100) : 0;

  const DRow = ({ label, value, mono, bold, color, highlight }) => (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 1, borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
      <Typography fontSize={12} color="#64748b">{label}</Typography>
      <Typography fontSize={12} fontWeight={bold ? 700 : 500}
        color={highlight ? ACCENT : color || "#0f172a"}
        fontFamily={mono ? "monospace" : "inherit"}
        sx={{ background: highlight ? "#eff6ff" : "transparent", px: highlight ? 1 : 0, py: highlight ? 0.3 : 0, borderRadius: 1 }}>
        {value ?? "—"}
      </Typography>
    </Box>
  );

  const Section = ({ title, children }) => (
    <Box mb={2.5}>
      <Typography fontSize={10} fontWeight={700} color="#94a3b8" letterSpacing={1}
        sx={{ textTransform: "uppercase", mb: 1 }}>{title}</Typography>
      <Box sx={{ background: "#fff", borderRadius: "10px", px: 2, py: 0.5, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {children}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box sx={{
        px: 3, py: 2,
        background: isLive ? "linear-gradient(135deg,#064e3b,#065f46)" : "#0f172a",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography fontSize={14} fontWeight={700} color="#f8fafc">Session Detail</Typography>
            <StatusBadge status={s.status} pulse />
          </Stack>
          <Typography fontSize={11} color="#94a3b8" fontFamily="monospace">{s.sessionId}</Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: "#94a3b8" }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Live progress banner */}
      {isLive && (
        <Box sx={{ background: "#f0fdf4", px: 3, py: 1.75, borderBottom: "1px solid #dcfce7" }}>
          <Stack direction="row" justifyContent="space-between" mb={0.75}>
            <Typography fontSize={11} color="#16a34a" fontWeight={700}>Energy Progress</Typography>
            <Typography fontSize={11} color="#16a34a" fontWeight={700}>{fmt(energyPct, 1)}%</Typography>
          </Stack>
          <ProgressBar value={s.energyConsumed || 0} max={s.energySelected || 1} color={GREEN} />
          <Stack direction="row" justifyContent="space-between" mt={0.5}>
            <Typography fontSize={10} color="#64748b">{kwh(s.energyConsumed)} consumed</Typography>
            <Typography fontSize={10} color="#64748b">{kwh(s.energySelected)} selected</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" mt={1.5} mb={0.75}>
            <Typography fontSize={11} color="#d97706" fontWeight={700}>Amount Usage</Typography>
            <Typography fontSize={11} color="#d97706" fontWeight={700}>{fmt(amtPct, 1)}%</Typography>
          </Stack>
          <ProgressBar value={s.amountUsed || 0} max={s.amountPaid || 1} color={AMBER} />
          <Stack direction="row" justifyContent="space-between" mt={0.5}>
            <Typography fontSize={10} color="#64748b">{money(s.amountUsed)} used</Typography>
            <Typography fontSize={10} color="#64748b">{money(s.amountPaid)} paid</Typography>
          </Stack>
          {(s.latestVoltage != null || s.latestCurrent != null) && (
            <Stack direction="row" spacing={2} mt={1.75}>
              {s.latestVoltage != null && (
                <Box sx={{ background: "#fff", borderRadius: "8px", px: 1.5, py: 0.75, flex: 1, textAlign: "center", border: "1px solid #dcfce7" }}>
                  <Typography fontSize={10} color="#64748b">Voltage</Typography>
                  <Typography fontSize={14} fontWeight={800} color="#16a34a">{s.latestVoltage} V</Typography>
                </Box>
              )}
              {s.latestCurrent != null && (
                <Box sx={{ background: "#fff", borderRadius: "8px", px: 1.5, py: 0.75, flex: 1, textAlign: "center", border: "1px solid #dcfce7" }}>
                  <Typography fontSize={10} color="#64748b">Current</Typography>
                  <Typography fontSize={14} fontWeight={800} color="#16a34a">{s.latestCurrent} A</Typography>
                </Box>
              )}
              <Box sx={{ background: "#fff", borderRadius: "8px", px: 1.5, py: 0.75, flex: 1, textAlign: "center", border: "1px solid #dcfce7" }}>
                <Typography fontSize={10} color="#64748b">Duration</Typography>
                <Typography fontSize={14} fontWeight={800} color="#16a34a">{dur(s.startTime)}</Typography>
              </Box>
            </Stack>
          )}
        </Box>
      )}

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        <Section title="Identifiers">
          <DRow label="Session ID"     value={s.sessionId}     mono />
          <DRow label="Transaction ID" value={s.transactionId} mono />
          <DRow label="Device ID"      value={s.deviceId}      mono />
          {s.device?.owner && <DRow label="Owner" value={s.device.owner.name} />}
        </Section>

        <Section title="User">
          <DRow label="Name"   value={s.user?.name   || "—"} />
          <DRow label="Email"  value={s.user?.email  || "—"} />
          <DRow label="Mobile" value={s.user?.mobile || "—"} />
        </Section>

        <Section title="Timeline">
          <DRow label="Start Time"  value={fmtDt(s.startTime)} />
          <DRow label="End Time"    value={s.endTime ? fmtDt(s.endTime) : (isLive ? "Still active" : "—")} />
          <DRow label="Duration"    value={dur(s.startTime, s.endTime)} bold />
          <DRow label="Last Update" value={fmtDt(s.lastUpdate)} />
          {s.endTrigger && (
            <DRow label="End Reason"
              value={END_TRIGGER_LABELS[s.endTrigger] || s.endTrigger}
              color={s.endTrigger === "energy_limit" ? GREEN : s.endTrigger === "user_stopped" ? "#0284c7" : "#d97706"}
            />
          )}
        </Section>

        <Section title="Charging">
          <DRow label="Energy Selected"  value={kwh(s.energySelected)} />
          <DRow label="Energy Consumed"  value={kwh(s.energyConsumed)} bold highlight />
          <DRow label="Rate / kWh"       value={money(s.ratePerKwh)} />
          <DRow label="Discount Applied" value={money(s.discountApplied)} color="#7c3aed" />
        </Section>

        <Section title="Financials">
          <DRow label="Amount Paid"  value={money(s.amountPaid)} bold />
          <DRow label="Amount Used"  value={money(s.amountUsed)} />
          <DRow label="Balance Left" value={money((s.amountPaid || 0) - (s.amountUsed || 0))}
            color={((s.amountPaid || 0) - (s.amountUsed || 0)) > 0 ? GREEN : RED} />
        </Section>

        {(s.latestVoltage != null || s.latestCurrent != null) && (
          <Section title="Latest Telemetry">
            {s.latestVoltage != null && <DRow label="Voltage" value={`${s.latestVoltage} V`} bold />}
            {s.latestCurrent != null && <DRow label="Current" value={`${s.latestCurrent} A`} bold />}
          </Section>
        )}
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SessionsOverview() {
  const [allSessions,  setAllSessions]  = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [liveLoading,  setLiveLoading]  = useState(false);
  const [projects,     setProjects]     = useState([]);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [tab,          setTab]          = useState("live");
  const [chartTab,     setChartTab]     = useState(0);
  const [search,       setSearch]       = useState("");
  const [period,       setPeriod]       = useState("today");
  const [selProject,   setSelProject]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [selectedRow,  setSelectedRow]  = useState(null);
  const [autoRefresh,  setAutoRefresh]  = useState(true);
  const timerRef = useRef(null);

  const fetchLive = useCallback(async (quiet = false) => {
    if (!quiet) setLiveLoading(true);
    try {
    const projectParam = selProject ? { project: selProject } : {};
    const [r1, r2] = await Promise.all([
      api.get("/api/sessions/all", { params: { status: "active", limit: 500, ...projectParam } }),
      api.get("/api/sessions/all", { params: { status: "paused",  limit: 200, ...projectParam } }),
    ]);
      setLiveSessions([...(r1.data?.sessions || []), ...(r2.data?.sessions || [])]);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { if (!quiet) setLiveLoading(false); }
  }, [selProject]);

  const fetchPast = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 500 };
      const now = new Date();
      if      (period === "today")      { const d = new Date(now); d.setHours(0,0,0,0); params.from = d.toISOString(); }
      else if (period === "week")       { const d = new Date(); d.setDate(d.getDate()-7); params.from = d.toISOString(); }
      else if (period === "month")      { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); params.from = d.toISOString(); }
      else if (period === "last_month") {
        const s = new Date(); s.setDate(1); s.setMonth(s.getMonth()-1); s.setHours(0,0,0,0);
        const e = new Date(); e.setDate(0); e.setHours(23,59,59,999);
        params.from = s.toISOString(); params.to = e.toISOString();
      }
      else if (period === "quarter") { const d = new Date(); d.setMonth(d.getMonth()-3); params.from = d.toISOString(); }
      else if (period === "year")    { params.from = new Date(new Date().getFullYear(),0,1).toISOString(); }
      if (selProject) params.project = selProject;
      const res = await api.get("/api/sessions/all", { params });
      setAllSessions((res.data?.sessions || []).filter(s => s.status !== "active" && s.status !== "paused"));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [period, selProject]);

  useEffect(() => {
    api.get("/api/sessions/admin/filters")
      .then(r => setProjects(r.data?.projects || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchLive(); }, [fetchLive]);
  useEffect(() => { if (tab === "past") fetchPast(); }, [tab, fetchPast]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (tab === "live" && autoRefresh) {
      timerRef.current = setInterval(() => fetchLive(true), LIVE_REFRESH_MS);
    }
    return () => clearInterval(timerRef.current);
  }, [tab, autoRefresh, fetchLive]);

  const q = search.toLowerCase().trim();
  const applySearch = (s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (!q) return true;
    return [s.sessionId, s.deviceId, s.transactionId, s.user?.name, s.user?.mobile, s.user?.email]
      .some(v => (v || "").toLowerCase().includes(q));
  };
  const filteredLive = liveSessions.filter(applySearch);
  const filteredPast = allSessions.filter(applySearch);

  const pastEnergy  = allSessions.reduce((a, s) => a + (s.energyConsumed || 0), 0);
  const pastRevenue = allSessions.reduce((a, s) => a + (s.amountPaid     || 0), 0);
  const liveEnergy  = liveSessions.reduce((a, s) => a + (s.energyConsumed || 0), 0);
  const avgDurMin   = allSessions.length
    ? allSessions.reduce((a, s) => {
        if (!s.startTime || !s.endTime) return a;
        return a + (new Date(s.endTime) - new Date(s.startTime)) / 60000;
      }, 0) / allSessions.length
    : 0;

  const chartData = buildChartData(allSessions, period);

  const openDrawer  = (row) => { setSelectedRow(row); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setSelectedRow(null), 300); };

  const SkeletonRows = ({ cols }) => (
    Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} style={{ padding: "12px 12px" }}>
            <Box sx={{
              height: 12, borderRadius: 1, background: "#f1f5f9",
              animation: "shimmer 1.5s infinite",
              "@keyframes shimmer": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } }
            }} />
          </td>
        ))}
      </tr>
    ))
  );

  return (
    <Box sx={{ background: "#f1f5f9", minHeight: "100vh", fontFamily: "Inter, system-ui" }}>

      {/* ═══ STICKY TOP BAR ═══ */}
      <Box sx={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(241,245,249,0.97)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
        px: { xs: 2, md: 4 }, py: 1.5,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 2, flexWrap: "wrap"
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography fontWeight={700} fontSize={17} color="#0f172a">Sessions</Typography>
          {tab === "live" && lastRefresh && (
            <Typography fontSize={11} color="#94a3b8" sx={{ display: { xs: "none", sm: "block" } }}>
              Refreshed: {lastRefresh.toLocaleTimeString("en-IN")}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          {tab === "past" && PERIODS.map(p => (
            <Pill key={p.value} label={p.label} active={period === p.value}
              onClick={() => setPeriod(p.value)} color={ACCENT} />
          ))}
          {tab === "live" && (
            <Box onClick={() => setAutoRefresh(a => !a)} sx={{
              display: "flex", alignItems: "center", gap: 0.5,
              px: 1.5, py: 0.6, borderRadius: "8px", cursor: "pointer",
              background: autoRefresh ? "#dcfce7" : "#f1f5f9",
              color: autoRefresh ? "#16a34a" : "#64748b",
              fontSize: 11, fontWeight: 600,
              border: autoRefresh ? "1px solid #bbf7d0" : "1px solid #e2e8f0"
            }}>
              <Autorenew sx={{ fontSize: 13 }} /> {autoRefresh ? "Live" : "Paused"}
            </Box>
          )}
          <Tooltip title="Refresh"><span>
            <IconButton
              onClick={tab === "live" ? () => fetchLive() : fetchPast}
              size="small"
              disabled={tab === "live" ? liveLoading : loading}
              sx={{ color: "#64748b" }}>
              {(tab === "live" ? liveLoading : loading)
                ? <CircularProgress size={16} />
                : <Refresh fontSize="small" />}
            </IconButton>
          </span></Tooltip>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>

        {/* ═══ KPI CARDS ═══ */}
        <Grid container spacing={2} mb={3}>
          {[
            { icon: <FiberManualRecord />, label: "Live Sessions",  value: String(liveSessions.length),  color: GREEN,     sub: "Active + Paused" },
            { icon: <EvStation />,         label: "Past Sessions",  value: String(allSessions.length),   color: ACCENT,    sub: PERIODS.find(p => p.value === period)?.label || "" },
            { icon: <BoltOutlined />,      label: "Live Energy",    value: kwh(liveEnergy),              color: AMBER,     sub: "Currently flowing" },
            { icon: <FlashOn />,           label: "Total Energy",   value: kwh(pastEnergy),              color: PURPLE,    sub: "Period total" },
            { icon: <CurrencyRupee />,     label: "Revenue",        value: money(pastRevenue),           color: GREEN,     sub: "Period total" },
            { icon: <AccessTime />,        label: "Avg Duration",   value: `${fmt(avgDurMin / 60, 1)}h`, color: "#0891b2", sub: "Per session" },
          ].map((c, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <KpiCard {...c} loading={loading} />
            </Grid>
          ))}
        </Grid>

        {/* ═══ PROJECT FILTER ═══ */}
        {projects.length > 0 && (
          <Box sx={{
            background: "#fff", borderRadius: "12px", px: 3, py: 1.75, mb: 3,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2
          }}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <ElectricCar sx={{ fontSize: 15, color: "#64748b" }} />
              <Typography fontSize={11} fontWeight={700} color="#64748b"
                sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Project</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Pill label="All Projects" active={selProject === ""} onClick={() => setSelProject("")} />
              {projects.map(p => (
                <Pill key={p} label={p} active={selProject === p} onClick={() => setSelProject(p)} color={ACCENT} />
              ))}
            </Stack>
            {selProject && (
              <Box onClick={() => setSelProject("")}
                sx={{ ml: "auto", fontSize: 11, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>
                Clear
              </Box>
            )}
          </Box>
        )}

        {/* ═══ TAB + SEARCH + FILTERS ═══ */}
        <Box sx={{
          background: "#fff", borderRadius: "12px", px: 3, py: 2, mb: 2,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
        }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} mb={2}>
            <Stack direction="row" spacing={0.5}
              sx={{ background: "#f1f5f9", p: 0.5, borderRadius: "10px" }}>
              {[
                { id: "live", label: `Live${liveSessions.length > 0 ? ` (${liveSessions.length})` : ""}`, color: GREEN },
                { id: "past", label: "Past Sessions", color: ACCENT }
              ].map(t => (
                <Box key={t.id} onClick={() => { setTab(t.id); setStatusFilter(""); }} sx={{
                  px: 2.5, py: 0.8, borderRadius: "8px", cursor: "pointer",
                  fontWeight: 700, fontSize: 13, transition: "all .14s",
                  background: tab === t.id ? "#fff" : "transparent",
                  color: tab === t.id ? t.color : "#64748b",
                  boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  display: "flex", alignItems: "center", gap: 0.75
                }}>
                  {t.id === "live" && tab === "live" && (
                    <Box sx={{
                      width: 7, height: 7, borderRadius: "50%", background: GREEN,
                      animation: "pulseDot2 1.4s ease-in-out infinite",
                      "@keyframes pulseDot2": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } }
                    }} />
                  )}
                  {t.label}
                </Box>
              ))}
            </Stack>

            <Box sx={{ flex: 1 }}>
              <Box component="input"
                placeholder="Search by name, device ID, session ID, mobile, email…"
                value={search} onChange={e => setSearch(e.target.value)}
                sx={{
                  width: "100%", px: 1.75, py: 1, fontSize: 13,
                  border: "1px solid #e2e8f0", borderRadius: "8px",
                  background: "#f8fafc", outline: "none",
                  "&:focus": { borderColor: "#2563eb", background: "#fff" }
                }} />
            </Box>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Pill label="All" active={statusFilter === ""} onClick={() => setStatusFilter("")} />
              {tab === "live"
                ? [["active", "Live", GREEN], ["paused", "Paused", AMBER]].map(([v, l, c]) => (
                    <Pill key={v} label={l} active={statusFilter === v}
                      onClick={() => setStatusFilter(statusFilter === v ? "" : v)} color={c} />
                  ))
                : [["completed","Completed",ACCENT],["stopped","Stopped",RED],["terminated","Terminated","#db2777"]].map(([v,l,c]) => (
                    <Pill key={v} label={l} active={statusFilter === v}
                      onClick={() => setStatusFilter(statusFilter === v ? "" : v)} color={c} />
                  ))
              }
            </Stack>
          </Stack>

          {(search || statusFilter || selProject) && (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap
              sx={{ pt: 1.5, borderTop: "1px dashed #f1f5f9" }}>
              <Typography fontSize={11} color="#94a3b8">Active filters:</Typography>
              {search && (
                <Box sx={{ display:"inline-flex",alignItems:"center",gap:0.5,px:1.25,py:0.35,borderRadius:"20px",fontSize:11,fontWeight:600,background:"#eff6ff",color:"#1d4ed8",border:"1px solid #bfdbfe" }}>
                  Search: <strong>{search}</strong>
                  <Box onClick={() => setSearch("")} sx={{ ml:0.5,cursor:"pointer",fontSize:14 }}>×</Box>
                </Box>
              )}
              {statusFilter && (
                <Box sx={{ display:"inline-flex",alignItems:"center",gap:0.5,px:1.25,py:0.35,borderRadius:"20px",fontSize:11,fontWeight:600,background:"#f0fdf4",color:"#059669",border:"1px solid #bbf7d0" }}>
                  Status: <strong>{statusFilter}</strong>
                  <Box onClick={() => setStatusFilter("")} sx={{ ml:0.5,cursor:"pointer",fontSize:14 }}>×</Box>
                </Box>
              )}
              {selProject && (
                <Box sx={{ display:"inline-flex",alignItems:"center",gap:0.5,px:1.25,py:0.35,borderRadius:"20px",fontSize:11,fontWeight:600,background:"#fef3c7",color:"#d97706",border:"1px solid #fde68a" }}>
                  Project: <strong>{selProject}</strong>
                  <Box onClick={() => setSelProject("")} sx={{ ml:0.5,cursor:"pointer",fontSize:14 }}>×</Box>
                </Box>
              )}
              <Box onClick={() => { setSearch(""); setStatusFilter(""); setSelProject(""); }}
                sx={{ ml:"auto",fontSize:11,color:"#dc2626",cursor:"pointer",fontWeight:700 }}>
                Clear all
              </Box>
            </Stack>
          )}
        </Box>

        {/* ═══ TREND CHART (past tab only) ═══ */}
        {tab === "past" && (
          <Box sx={{ background: "#fff", borderRadius: "12px", p: 3, mb: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
              alignItems={{ sm: "center" }} mb={2} gap={1}>
              <Typography fontWeight={700} fontSize={14} color="#0f172a">
                Trend — {PERIODS.find(p => p.value === period)?.label}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                {CHART_TABS.map((t, i) => (
                  <Pill key={t} label={t} active={chartTab === i} onClick={() => setChartTab(i)} />
                ))}
              </Stack>
            </Stack>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {[["sessions", ACCENT], ["energy", PURPLE], ["revenue", GREEN]].map(([k, col]) => (
                      <linearGradient key={k} id={`sg_${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={col} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={col} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={50} />
                  <RTooltip
                    contentStyle={{ background: "#0f172a", border: "none", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
                    itemStyle={{ color: "#f8fafc" }}
                    formatter={(v, n) =>
                      n === "revenue" ? [`₹ ${v}`, "Revenue"] :
                      n === "energy"  ? [`${v} kWh`, "Energy"]  :
                      [v, "Sessions"]
                    }
                  />
                  {chartTab === 0 && <Area type="monotone" dataKey="sessions" stroke={ACCENT}  fill="url(#sg_sessions)" strokeWidth={2} dot={false} />}
                  {chartTab === 1 && <Area type="monotone" dataKey="energy"   stroke={PURPLE}  fill="url(#sg_energy)"   strokeWidth={2} dot={false} />}
                  {chartTab === 2 && <Area type="monotone" dataKey="revenue"  stroke={GREEN}   fill="url(#sg_revenue)"  strokeWidth={2} dot={false} />}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height={200}>
                <Typography color="#94a3b8" fontSize={13}>No data for this period</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ═══ TABLE ═══ */}
        <Box sx={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            {tab === "live" ? (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <Th width={140}>Status</Th>
                    <Th width={160}>Session ID</Th>
                    <Th width={120}>Device</Th>
                    <Th width={130}>User</Th>
                    <Th width={80}  align="right">Paid</Th>
                    <Th width={90}  align="right">Used</Th>
                    <Th width={120} align="right">Energy</Th>
                    <Th width={120} align="right">V / A</Th>
                    <Th width={90}  align="right">Duration</Th>
                    <Th width={145}>Started</Th>
                  </tr>
                </thead>
                <tbody>
                  {liveLoading && liveSessions.length === 0
                    ? <SkeletonRows cols={10} />
                    : filteredLive.length === 0 ? (
                        <tr><td colSpan={10}>
                          <Box py={8} textAlign="center">
                            <EvStation sx={{ fontSize: 44, color: "#cbd5e1", mb: 1 }} />
                            <Typography color="#94a3b8" fontSize={13}>No live sessions right now</Typography>
                          </Box>
                        </td></tr>
                      ) : filteredLive.map(s => (
                        <tr key={s._id} onClick={() => openDrawer(s)}
                          style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer", transition: "background .1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <Td><StatusBadge status={s.status} pulse /></Td>
                          <Td mono blue>{s.sessionId?.slice(-12) || "—"}</Td>
                          <Td mono>{s.deviceId || "—"}</Td>
                          <td style={{ padding: "10px 12px" }}>
                            <Typography fontSize={12} fontWeight={600} color="#1e293b">{s.user?.name || "—"}</Typography>
                            <Typography fontSize={10} color="#94a3b8">{s.user?.mobile || ""}</Typography>
                          </td>
                          <Td align="right" bold>{money(s.amountPaid)}</Td>
                          <Td align="right" green>{money(s.amountUsed)}</Td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <Typography fontSize={12} fontWeight={700} color="#0f172a">{kwh(s.energyConsumed)}</Typography>
                            <ProgressBar value={s.energyConsumed || 0} max={s.energySelected || 1} color={GREEN} />
                            <Typography fontSize={9} color="#94a3b8" mt={0.25}>{kwh(s.energySelected)} sel.</Typography>
                          </td>
                          <Td align="right" mono>
                            {s.latestVoltage != null ? `${s.latestVoltage}V` : "—"} / {s.latestCurrent != null ? `${s.latestCurrent}A` : "—"}
                          </Td>
                          <Td align="right" bold>{dur(s.startTime)}</Td>
                          <Td>{fmtDt(s.startTime)}</Td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <Th width={120}>Status</Th>
                    <Th width={155}>Session ID</Th>
                    <Th width={120}>Device</Th>
                    <Th width={130}>User</Th>
                    <Th width={80}  align="right">Paid</Th>
                    <Th width={90}  align="right">Energy</Th>
                    <Th width={90}  align="right">Duration</Th>
                    <Th width={130}>End Reason</Th>
                    <Th width={145}>Start</Th>
                    <Th width={145}>End</Th>
                    <Th width={80}  align="right">Rate/kWh</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading && allSessions.length === 0
                    ? <SkeletonRows cols={11} />
                    : filteredPast.length === 0 ? (
                        <tr><td colSpan={11}>
                          <Box py={8} textAlign="center">
                            <Receipt sx={{ fontSize: 44, color: "#cbd5e1", mb: 1 }} />
                            <Typography color="#94a3b8" fontSize={13}>No sessions found for this period</Typography>
                          </Box>
                        </td></tr>
                      ) : filteredPast.map(s => (
                        <tr key={s._id} onClick={() => openDrawer(s)}
                          style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer", transition: "background .1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <Td><StatusBadge status={s.status} /></Td>
                          <Td mono blue>{s.sessionId?.slice(-12) || "—"}</Td>
                          <Td mono>{s.deviceId || "—"}</Td>
                          <td style={{ padding: "10px 12px" }}>
                            <Typography fontSize={12} fontWeight={600} color="#1e293b">{s.user?.name || "—"}</Typography>
                            <Typography fontSize={10} color="#94a3b8">{s.user?.mobile || ""}</Typography>
                          </td>
                          <Td align="right" bold>{money(s.amountPaid)}</Td>
                          <Td align="right">{kwh(s.energyConsumed)}</Td>
                          <Td align="right">{dur(s.startTime, s.endTime)}</Td>
                          <td style={{ padding: "10px 12px" }}>
                            <Typography fontSize={10} color="#64748b">
                              {END_TRIGGER_LABELS[s.endTrigger] || (s.endTrigger || "—")}
                            </Typography>
                          </td>
                          <Td mono>{fmtDt(s.startTime)}</Td>
                          <Td mono>{fmtDt(s.endTime)}</Td>
                          <Td align="right" muted>{money(s.ratePerKwh)}</Td>
                        </tr>
                      ))
                  }
                </tbody>
                {filteredPast.length > 0 && !loading && (
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                      <td colSpan={4} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#475569" }}>
                        TOTALS ({filteredPast.length} sessions)
                      </td>
                      <Td align="right" bold>{money(filteredPast.reduce((a, s) => a + (s.amountPaid     || 0), 0))}</Td>
                      <Td align="right">       {kwh  (filteredPast.reduce((a, s) => a + (s.energyConsumed || 0), 0))}</Td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </Box>
        </Box>

      </Box>

      {/* ═══ DETAIL DRAWER ═══ */}
      <Drawer anchor="right" open={drawerOpen} onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: "100vw", sm: 500 }, background: "#f8fafc" } }}>
        {selectedRow && <SessionDrawer session={selectedRow} onClose={closeDrawer} />}
      </Drawer>

    </Box>
  );
}