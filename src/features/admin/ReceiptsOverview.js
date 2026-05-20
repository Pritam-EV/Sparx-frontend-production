import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Stack,
  Button,
  Collapse,
  IconButton,
  Tooltip,
  Drawer,
  CircularProgress
} from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid
} from "recharts";
import {
  Refresh,
  Download,
  Close,
  ExpandMore,
  ExpandLess,
  Receipt as ReceiptIcon,
  FlashOn,
  CurrencyRupee,
  AccountBalance,
  Bolt,
  Discount,
  Replay,
  TrendingUp,
  LocationOn,
  KeyboardArrowDown
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

const REFUND_STATUSES = [
  { label: "All",             value: "" },
  { label: "N/A",             value: "not_applicable" },
  { label: "Initiated",       value: "initiated" },
  { label: "Processed",       value: "processed" },
  { label: "Failed",          value: "failed" },
  { label: "Wallet Refunded", value: "wallet_refunded" },
];

const REFUND_COLORS = {
  not_applicable:  { bg: "#f3f4f6", text: "#6b7280" },
  initiated:       { bg: "#fef3c7", text: "#d97706" },
  processed:       { bg: "#d1fae5", text: "#059669" },
  failed:          { bg: "#fee2e2", text: "#dc2626" },
  wallet_refunded: { bg: "#ede9fe", text: "#7c3aed" },
};

const CHART_TABS = ["Revenue", "Energy", "Refunds", "Sessions"];
const ACCENT = "#2563eb";
const GREEN  = "#10b981";
const RED    = "#ef4444";
const PURPLE = "#8b5cf6";
const AMBER  = "#f59e0b";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt   = (v, d = 2) => Number(v || 0).toFixed(d);
const money = (v) => `₹ ${fmt(v)}`;
const kwh   = (v) => `${fmt(v, 3)} kWh`;

function buildChartData(receipts, period) {
  if (!receipts?.length) return [];
  const DAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const map = {};
  receipts.forEach((r) => {
    const d = new Date(r.createdAt);
    let key;
    if      (period === "today")                            key = `${d.getHours()}:00`;
    else if (period === "week")                             key = DAY[d.getDay()];
    else if (period === "month" || period === "last_month") key = String(d.getDate());
    else                                                    key = `${MON[d.getMonth()]} ${d.getFullYear()}`;

    if (!map[key]) map[key] = { label: key, revenue: 0, energy: 0, refund: 0, sessions: 0 };
    map[key].revenue  += +(r.amountPaid     || 0);
    map[key].energy   += +(r.energyConsumed || 0);
    map[key].refund   += +(r.refundAmount   || 0);
    map[key].sessions += 1;
  });
  return Object.values(map).map(v => ({
    ...v,
    revenue: +fmt(v.revenue),
    energy:  +fmt(v.energy, 3),
    refund:  +fmt(v.refund),
  }));
}

// ─── Reusable: Period / Status Pill ──────────────────────────────────────────

function Pill({ label, active, onClick, color }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        px: 1.5, py: 0.5, borderRadius: "20px", cursor: "pointer",
        fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", userSelect: "none",
        transition: "all .14s",
        background: active ? (color || "#0f172a") : "transparent",
        color:      active ? "#fff" : "#64748b",
        border:     active ? `1px solid ${color || "#0f172a"}` : "1px solid #e2e8f0",
        "&:hover": { background: active ? (color || "#0f172a") : "#f1f5f9" }
      }}
    >
      {label}
    </Box>
  );
}

// ─── Reusable: Location Select Dropdown ──────────────────────────────────────

function FilterSelect({ label, value, options, onChange, disabled }) {
  return (
    <Box sx={{ position: "relative", minWidth: 140 }}>
      <Box
        component="select"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || !options.length}
        sx={{
          width: "100%", appearance: "none", WebkitAppearance: "none",
          px: 1.5, pr: 3.5, py: 0.85, fontSize: 12, fontWeight: 500,
          border: value ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
          borderRadius: "8px",
          background: value ? "#eff6ff" : "#f8fafc",
          color: value ? "#1d4ed8" : "#475569",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none", transition: "all .14s",
          "&:focus": { borderColor: "#2563eb", background: "#fff" },
          "&:disabled": { opacity: 0.45 }
        }}
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </Box>
      <KeyboardArrowDown sx={{
        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
        fontSize: 16, color: value ? "#2563eb" : "#94a3b8", pointerEvents: "none"
      }} />
    </Box>
  );
}

// ─── Reusable: Active Filter Chip ────────────────────────────────────────────

function FilterChip({ label, value, onClear }) {
  if (!value) return null;
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.5,
      px: 1.25, py: 0.35, borderRadius: "20px",
      fontSize: 11, fontWeight: 600,
      background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe"
    }}>
      {label}: <strong>{value}</strong>
      <Box
        onClick={onClear}
        sx={{ ml: 0.5, cursor: "pointer", lineHeight: 1, fontSize: 14, color: "#2563eb" }}
      >×</Box>
    </Box>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color, neg, highlight, loading }) {
  return (
    <Box sx={{
      background: "#fff", borderRadius: "12px", p: 2,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      borderLeft: `3px solid ${color}`,
      opacity: loading ? 0.6 : 1, transition: "opacity .2s", height: "100%"
    }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
        <Box sx={{
          width: 28, height: 28, borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: color + "18", color, flexShrink: 0,
          "& svg": { fontSize: 14 }
        }}>{icon}</Box>
        <Typography
          fontSize={10} fontWeight={600} color="#94a3b8"
          sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
        >{label}</Typography>
      </Stack>
      {loading
        ? <Box sx={{ height: 20, width: "70%", borderRadius: 1, background: "#f1f5f9" }} />
        : <Typography fontSize={16} fontWeight={800}
            color={highlight ? color : neg ? "#dc2626" : "#0f172a"}>
            {neg ? `(${value})` : value}
          </Typography>
      }
    </Box>
  );
}

// ─── Table Cell ──────────────────────────────────────────────────────────────

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

// ─── Receipt Detail Drawer ───────────────────────────────────────────────────

function ReceiptDrawer({ receipt: r, onClose }) {
  const refundC = REFUND_COLORS[r.refund?.status] || REFUND_COLORS.not_applicable;

  const DRow = ({ label, value, mono, bold, color }) => (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 1, borderBottom: "1px solid #f1f5f9" }}>
      <Typography fontSize={12} color="#64748b">{label}</Typography>
      <Typography fontSize={12} fontWeight={bold ? 700 : 500} color={color || "#0f172a"}
        fontFamily={mono ? "monospace" : "inherit"}>{value ?? "—"}</Typography>
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
      {/* Drawer Header */}
      <Box sx={{
        px: 3, py: 2, background: "#0f172a",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <Stack>
          <Typography fontSize={14} fontWeight={700} color="#f8fafc">Receipt Detail</Typography>
          <Typography fontSize={11} color="#94a3b8" fontFamily="monospace">{r.receiptId}</Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: "#94a3b8" }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Drawer Body */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
          <Box sx={{
            px: 1.5, py: 0.5, borderRadius: "20px", fontSize: 11, fontWeight: 700,
            background: refundC.bg, color: refundC.text
          }}>
            {(r.refund?.status || "not_applicable").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </Box>
          <Typography fontSize={12} color="#64748b">
            {new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "medium" })}
          </Typography>
        </Stack>

        <Section title="Identifiers">
          <DRow label="Receipt ID"     value={r.receiptId}     mono />
          <DRow label="Session ID"     value={r.sessionId}     mono />
          <DRow label="Transaction ID" value={r.transactionId} mono />
          <DRow label="Device ID"      value={r.deviceId}      mono />
        </Section>

        <Section title="Project">
          <DRow label="Project" value={r.projectName} />
          <DRow label="Device"  value={r.deviceId} />
        </Section>

        <Section title="User">
          <DRow label="Name"   value={r.userName} />
          <DRow label="Email"  value={r.userEmail} />
          <DRow label="Mobile" value={r.userMobile} />
        </Section>

        <Section title="Charging">
          <DRow label="Energy Selected"  value={`${fmt(r.energySelected, 3)} kWh`} />
          <DRow label="Energy Consumed"  value={`${fmt(r.energyConsumed, 3)} kWh`} bold />
          <DRow label="Rate (ex-GST)"    value={money(r.userRatePerKwh)} />
          <DRow label="Rate (incl. GST)" value={money(r.userRateInclGST)} />
          <DRow label="Amount Selected"  value={money(r.amountSelected)} />
        </Section>

        <Section title="Financials">
          <DRow label="Amount Paid"     value={money(r.amountPaid)}     bold />
          <DRow label="Amount Utilized" value={money(r.amountUtilized)} />
          <DRow label="Discount"        value={money(r.discountApplied)} color="#7c3aed" />
          <DRow label="Taxable Amount"  value={money(r.taxableAmount)} />
          <DRow label="GST (18%)"       value={money(r.gstAmount)} />
          <DRow label="Total Amount"    value={money(r.totalAmount)}    bold />
        </Section>

        <Section title="Distribution">
          <DRow label="Payment Charges"  value={money(r.paymentCharges)}   color="#d97706" />
          <DRow label="Platform Margin"  value={money(r.vjraMarginAmount)} color="#059669" bold />
          <DRow label="Electricity Cost" value={money(r.electricityCost)} />
          <DRow label="Owner Payout"     value={money(r.ownerPayout)}      bold />
        </Section>

        {r.refundAmount > 0 && (
          <Section title="Refund">
            <DRow label="Refund Amount"  value={money(r.refundAmount)}           color={RED} bold />
            <DRow label="Refund ID"      value={r.refund?.refundId || "—"}       mono />
            <DRow label="Failure Reason" value={r.refund?.failureReason || "—"} />
            <DRow label="Processed At"   value={
              r.refund?.processedAt
                ? new Date(r.refund.processedAt).toLocaleString("en-IN")
                : "—"
            } />
          </Section>
        )}
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ReceiptsOverview() {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [summary,   setSummary]   = useState({});
  const [receipts,  setReceipts]  = useState([]);
  const [chartData, setChartData] = useState([]);
  const [range,     setRange]     = useState(null);
  const [loading,   setLoading]   = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [chartTab,      setChartTab]      = useState(0);
  const [search,        setSearch]        = useState("");
  const [expandedCards, setExpandedCards] = useState(false);
  const [selectedRow,   setSelectedRow]   = useState(null);
  const [drawerOpen,    setDrawerOpen]    = useState(false);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [period,       setPeriod]       = useState("today");
  const [refundFilter, setRefundFilter] = useState("");

  // ── Location filters ───────────────────────────────────────────────────────
const [projects,   setProjects]   = useState([]);
const [selProject, setSelProject] = useState("");


  // ── Load filter options once ───────────────────────────────────────────────
useEffect(() => {
  api.get("/api/receipts/admin/filters")
    .then(res => setProjects(res.data?.projects || []))
    .catch(err => console.error("Filters load:", err));
}, []);

  // ── Fetch receipts ─────────────────────────────────────────────────────────
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const params = { period };
    if (refundFilter) params.refundStatus = refundFilter;
    if (selProject)   params.project      = selProject;

    const res  = await api.get("/api/receipts/admin/financial", { params });
    const data = res.data;
    setSummary(data.summary   || {});
    setReceipts(data.receipts || []);
    setChartData(buildChartData(data.receipts || [], period));
    setRange(data.range || null);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}, [period, refundFilter, selProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Client-side search ─────────────────────────────────────────────────────
  const q = search.toLowerCase().trim();
  const filtered = receipts.filter((r) =>
    !q || [r.receiptId, r.deviceId, r.sessionId, r.transactionId, r.userName]
      .some((v) => (v || "").toLowerCase().includes(q))
  );

  // ── KPI calculations ───────────────────────────────────────────────────────
  const pgCharges     = summary.totalPGCharges || 0;
  const totalRevenue  = summary.totalRevenue   || 0;
  const totalRefund   = summary.totalRefund    || 0;
  const totalDiscount = summary.totalDiscount  || 0;
  const netSettlement = totalRevenue - totalRefund - pgCharges - totalDiscount;

  // ── Drawer helpers ─────────────────────────────────────────────────────────
  const openDrawer  = (row) => { setSelectedRow(row); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setSelectedRow(null), 300); };

  // ── Export ─────────────────────────────────────────────────────────────────
const handleExport = async () => {
  try {
    const params = { period };
    if (selProject) params.project = selProject;
    const res = await api.get("/api/receipts/admin/export", { params, responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a   = document.createElement("a");
    a.href = url;
    a.download = `receipts_${selProject ? selProject + "_" : ""}${period}.csv`;
    a.click();
  } catch (e) { console.error(e); }
};

const activeFilterCount = [selProject, refundFilter].filter(Boolean).length;
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ background: "#f1f5f9", minHeight: "100vh", fontFamily: "Inter, system-ui" }}>

      {/* ═══ STICKY TOP BAR ═══ */}
      <Box sx={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(241,245,249,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
        px: { xs: 2, md: 4 }, py: 1.5,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 2, flexWrap: "wrap"
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography fontWeight={700} fontSize={17} color="#0f172a">
            Financial Receipts
          </Typography>
          {range && (
            <Typography fontSize={12} color="#64748b" sx={{ display: { xs: "none", md: "block" } }}>
              {range.label}
            </Typography>
          )}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          {PERIODS.map((p) => (
            <Pill
              key={p.value}
              label={p.label}
              active={period === p.value}
              onClick={() => setPeriod(p.value)}
              color={ACCENT}
            />
          ))}
          <Tooltip title="Refresh"><span>
            <IconButton onClick={fetchData} size="small" disabled={loading} sx={{ color: "#64748b" }}>
              {loading ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
            </IconButton>
          </span></Tooltip>
          <Box
            onClick={handleExport}
            sx={{
              display: "flex", alignItems: "center", gap: 0.5,
              px: 1.5, py: 0.6, borderRadius: "8px", cursor: "pointer",
              background: "#0f172a", color: "#fff", fontSize: 12, fontWeight: 600,
              "&:hover": { background: "#1e293b" }
            }}
          >
            <Download sx={{ fontSize: 14 }} /> Export CSV
          </Box>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>

{/* ═══ PROJECT FILTER BAR ═══ */}
<Box sx={{
  background: "#fff", borderRadius: "12px",
  px: 3, py: 1.75, mb: 3,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2
}}>
  <Stack direction="row" alignItems="center" spacing={0.75}>
    <Bolt sx={{ fontSize: 15, color: "#64748b" }} />
    <Typography
      fontSize={11} fontWeight={700} color="#64748b"
      sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
    >Project</Typography>
  </Stack>

  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
    <Pill
      label="All Projects"
      active={selProject === ""}
      onClick={() => setSelProject("")}
    />
    {projects.map(p => (
      <Pill
        key={p}
        label={p}
        active={selProject === p}
        onClick={() => setSelProject(p)}
        color={ACCENT}
      />
    ))}
  </Stack>

  {selProject && (
    <Box
      onClick={() => setSelProject("")}
      sx={{ ml: "auto", fontSize: 11, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}
    >
      Clear
    </Box>
  )}
</Box>

        {/* ═══ KPI CARDS — Collection ═══ */}
        <Box mb={0.5} display="flex" alignItems="center" justifyContent="space-between">
          <Typography
            fontSize={11} fontWeight={700} color="#94a3b8"
            sx={{ textTransform: "uppercase", letterSpacing: 1 }}
          >Collection</Typography>
          <Box
            sx={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", fontSize: 12 }}
            onClick={() => setExpandedCards(!expandedCards)}
          >
            {expandedCards ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            <span>{expandedCards ? "Less" : "More"}</span>
          </Box>
        </Box>

        <Grid container spacing={2} mb={2}>
          {[
            { icon: <CurrencyRupee />, label: "Gross Revenue",  value: money(totalRevenue),         color: ACCENT },
            { icon: <AccountBalance />,label: "GST Collected",  value: money(summary.gstCollected), color: "#0891b2" },
            { icon: <Replay />,        label: "Total Refunds",  value: money(totalRefund),           color: RED,   neg: true },
            { icon: <TrendingUp />,    label: "PG Charges",     value: money(pgCharges),             color: AMBER, neg: true },
            { icon: <Discount />,      label: "Discounts",      value: money(totalDiscount),         color: PURPLE, neg: true },
            { icon: <ReceiptIcon />,   label: "Net Settlement", value: money(netSettlement),         color: GREEN, highlight: true },
          ].map((c, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <KpiCard {...c} loading={loading} />
            </Grid>
          ))}
        </Grid>

        {/* Expanded KPIs — Distribution */}
        <Collapse in={expandedCards}>
          <Typography
            fontSize={11} fontWeight={700} color="#94a3b8"
            sx={{ textTransform: "uppercase", letterSpacing: 1, mb: 1 }}
          >Distribution</Typography>
          <Grid container spacing={2} mb={2}>
            {[
              { icon: <TrendingUp />,    label: "Platform Margin",  value: money(summary.totalMargin),         color: GREEN },
              { icon: <AccountBalance />,label: "Owner Settlement", value: money(summary.totalOwnerPayout),    color: "#0284c7" },
              { icon: <Bolt />,          label: "Electricity Cost", value: money(summary.totalElectricity),    color: AMBER },
              { icon: <FlashOn />,       label: "Total Energy",     value: kwh(summary.totalEnergy),           color: "#7c3aed" },
              { icon: <ReceiptIcon />,   label: "Taxable Revenue",  value: money(summary.taxableRevenue),      color: "#475569" },
              { icon: <ReceiptIcon />,   label: "Total Receipts",   value: String(summary.totalReceipts || 0), color: "#475569" },
            ].map((c, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <KpiCard {...c} loading={loading} />
              </Grid>
            ))}
          </Grid>
        </Collapse>

        {/* ═══ TREND CHART ═══ */}
        <Box sx={{ background: "#fff", borderRadius: "12px", p: 3, mb: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            mb={2} gap={1}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography fontWeight={700} fontSize={14} color="#0f172a">
                Trend — {PERIODS.find(p => p.value === period)?.label}
              </Typography>
{selProject && (
  <Typography fontSize={11} color="#2563eb">({selProject})</Typography>
)}
            </Stack>
            <Stack direction="row" spacing={0.5}>
              {CHART_TABS.map((t, i) => (
                <Pill key={t} label={t} active={chartTab === i} onClick={() => setChartTab(i)} />
              ))}
            </Stack>
          </Stack>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {[
                    ["revenue",  ACCENT],
                    ["energy",   PURPLE],
                    ["refund",   RED],
                    ["sessions", GREEN],
                  ].map(([k, col]) => (
                    <linearGradient key={k} id={`grad_${k}`} x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(v, n) => {
                    if (n === "revenue" || n === "refund") return [`₹ ${v}`, n];
                    if (n === "energy")                    return [`${v} kWh`, n];
                    return [v, n];
                  }}
                />
                {chartTab === 0 && <Area type="monotone" dataKey="revenue"  stroke={ACCENT}  fill="url(#grad_revenue)"  strokeWidth={2} dot={false} />}
                {chartTab === 1 && <Area type="monotone" dataKey="energy"   stroke={PURPLE}  fill="url(#grad_energy)"   strokeWidth={2} dot={false} />}
                {chartTab === 2 && <Area type="monotone" dataKey="refund"   stroke={RED}     fill="url(#grad_refund)"   strokeWidth={2} dot={false} />}
                {chartTab === 3 && <Area type="monotone" dataKey="sessions" stroke={GREEN}   fill="url(#grad_sessions)" strokeWidth={2} dot={false} />}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" height={220}>
              <Typography color="#94a3b8" fontSize={13}>No data for this period</Typography>
            </Box>
          )}
        </Box>

        {/* ═══ FILTER BAR — search + refund status ═══ */}
        <Box sx={{ background: "#fff", borderRadius: "12px", p: 2, mb: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2} alignItems={{ sm: "center" }}
            mb={activeFilterCount > 0 ? 1.5 : 0}
          >
            <Box sx={{ flex: 1 }}>
              <Box
                component="input"
                placeholder="Search receipt ID, device, session, user…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{
                  width: "100%", px: 1.5, py: 1, fontSize: 13,
                  border: "1px solid #e2e8f0", borderRadius: "8px",
                  background: "#f8fafc", outline: "none",
                  "&:focus": { borderColor: "#2563eb", background: "#fff" }
                }}
              />
            </Box>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {REFUND_STATUSES.map(s => (
                <Pill
                  key={s.value}
                  label={s.label}
                  active={refundFilter === s.value}
                  onClick={() => setRefundFilter(s.value)}
                />
              ))}
            </Stack>
          </Stack>

          {/* Active filter summary */}
          {activeFilterCount > 0 && (
            <Box sx={{
              pt: 1.25, borderTop: "1px dashed #f1f5f9",
              display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap"
            }}>
              <Typography fontSize={11} color="#94a3b8">Active:</Typography>
              <FilterChip label="State" value={selState} onClear={() => handleStateChange("")} />
              <FilterChip label="City"  value={selCity}  onClear={() => handleCityChange("")} />
              <FilterChip label="Area"  value={selArea}  onClear={() => setSelArea("")} />
              {refundFilter && (
                <Box sx={{
                  display: "inline-flex", alignItems: "center", gap: 0.5,
                  px: 1.25, py: 0.35, borderRadius: "20px", fontSize: 11, fontWeight: 600,
                  background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0"
                }}>
                  Refund: {refundFilter.replace(/_/g, " ")}
                  <Box onClick={() => setRefundFilter("")} sx={{ ml: 0.5, cursor: "pointer", fontSize: 14 }}>×</Box>
                </Box>
              )}
              <Box
                onClick={() => { handleStateChange(""); setRefundFilter(""); }}
                sx={{ ml: "auto", fontSize: 11, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}
              >
                Clear all filters
              </Box>
            </Box>
          )}
        </Box>

        {/* ═══ RECEIPTS TABLE ═══ */}
        <Box sx={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {[
                    ["Date",       "left",   150],
                    ["Receipt ID", "left",   160],
                    ["Device",     "left",   110],
                    ["Project",   "left",   120],
                    ["User",       "left",   120],
                    ["Paid",       "right",   88],
                    ["Energy",     "right",   95],
                    ["GST",        "right",   78],
                    ["PG",         "right",   78],
                    ["Margin",     "right",   78],
                    ["Owner",      "right",   90],
                    ["Refund",     "right",   88],
                    ["Status",     "left",   130],
                  ].map(([h, align, w]) => (
                    <th key={h} style={{
                      width: w, padding: "10px 12px", textAlign: align,
                      fontSize: 11, fontWeight: 700, color: "#64748b",
                      letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && receipts.length === 0 ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {Array.from({ length: 13 }).map((_, j) => (
                        <td key={j} style={{ padding: "12px 12px" }}>
                          <Box sx={{
                            height: 13, borderRadius: 1, background: "#f1f5f9",
                            animation: "shimmer 1.5s infinite",
                            "@keyframes shimmer": {
                              "0%":   { opacity: 1 },
                              "50%":  { opacity: 0.4 },
                              "100%": { opacity: 1 }
                            }
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={13}>
                      <Box py={7} textAlign="center">
                        <ReceiptIcon sx={{ fontSize: 42, color: "#cbd5e1", mb: 1 }} />
                        <Typography color="#94a3b8" fontSize={13}>No receipts match your filters</Typography>
                      </Box>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const refundC = REFUND_COLORS[r.refund?.status] || REFUND_COLORS.not_applicable;
                    return (
                      <tr
                        key={r._id}
                        onClick={() => openDrawer(r)}
                        style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer", transition: "background .1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <Td align="left" mono>
                          {new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </Td>
                        <Td align="left" mono blue>{r.receiptId || "—"}</Td>
                        <Td align="left" mono>{r.deviceId || "—"}</Td>
                        <Td align="left">{r.projectName || "—"}</Td>
                        <Td align="left">{r.userName || "—"}</Td>
                        <Td align="right" bold>{money(r.amountPaid)}</Td>
                        <Td align="right">{fmt(r.energyConsumed, 3)} kWh</Td>
                        <Td align="right">{money(r.gstAmount)}</Td>
                        <Td align="right" muted>{money(r.paymentCharges)}</Td>
                        <Td align="right" green>{money(r.vjraMarginAmount)}</Td>
                        <Td align="right">{money(r.ownerPayout)}</Td>
                        <Td align="right" red={r.refundAmount > 0}>{money(r.refundAmount)}</Td>
                        <td style={{ padding: "10px 12px" }}>
                          <Box sx={{
                            display: "inline-block", px: 1, py: 0.3, borderRadius: "20px",
                            fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                            background: refundC.bg, color: refundC.text
                          }}>
                            {(r.refund?.status || "not_applicable")
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, c => c.toUpperCase())}
                          </Box>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Totals footer */}
              {filtered.length > 0 && !loading && (
                <tfoot>
                  <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                    <td colSpan={5} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#475569" }}>
                      TOTALS ({filtered.length} receipts)
                    </td>
                    <Td align="right" bold>{money(filtered.reduce((s, r) => s + (r.amountPaid || 0), 0))}</Td>
                    <Td align="right">{fmt(filtered.reduce((s, r) => s + (r.energyConsumed || 0), 0), 3)} kWh</Td>
                    <Td align="right">{money(filtered.reduce((s, r) => s + (r.gstAmount || 0), 0))}</Td>
                    <Td align="right" muted>{money(filtered.reduce((s, r) => s + (r.paymentCharges || 0), 0))}</Td>
                    <Td align="right" green>{money(filtered.reduce((s, r) => s + (r.vjraMarginAmount || 0), 0))}</Td>
                    <Td align="right">{money(filtered.reduce((s, r) => s + (r.ownerPayout || 0), 0))}</Td>
                    <Td align="right" red>{money(filtered.reduce((s, r) => s + (r.refundAmount || 0), 0))}</Td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </Box>
        </Box>

      </Box>

      {/* ═══ DETAIL DRAWER ═══ */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: "100vw", sm: 480 }, background: "#f8fafc" } }}
      >
        {selectedRow && <ReceiptDrawer receipt={selectedRow} onClose={closeDrawer} />}
      </Drawer>

    </Box>
  );
}