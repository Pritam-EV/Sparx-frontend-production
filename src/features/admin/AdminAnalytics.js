import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Divider, Tooltip, IconButton,
  Chip, Stack,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import BoltIcon from "@mui/icons-material/Bolt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaymentsIcon from "@mui/icons-material/Payments";
import EvStationIcon from "@mui/icons-material/EvStation";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { api } from "../../api";

// ─── Constants ────────────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { value: "all",          label: "All Time" },
  { value: "today",        label: "Today" },
  { value: "thisMonth",    label: "This Month" },
  { value: "lastMonth",    label: "Last Month" },
  { value: "thisQuarter",  label: "This Quarter" },
  { value: "thisYear",     label: "This Year" },
];

const fmt = (n) =>
  typeof n === "number"
    ? "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "₹ 0.00";

const fmtKwh = (n) =>
  typeof n === "number" ? n.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " kWh" : "0.000 kWh";

const fmtNum = (n) => (typeof n === "number" ? n.toLocaleString("en-IN") : "0");

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <Typography
    variant="overline"
    sx={{ color: "#666", fontWeight: 700, letterSpacing: 1.5, mb: 1.5, display: "block" }}
  >
    {children}
  </Typography>
);

const KpiCard = ({ label, value, icon, color, bg, tooltip, sub }) => (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      bgcolor: bg || "#fff",
      transition: "box-shadow 0.2s",
      "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.09)" },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
            <Typography variant="caption" sx={{ color: "#777", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>
              {label}
            </Typography>
            {tooltip && (
              <Tooltip title={tooltip} arrow placement="top">
                <InfoOutlinedIcon sx={{ fontSize: 14, color: "#bbb", cursor: "help" }} />
              </Tooltip>
            )}
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 700, color: color || "#1a1a2e", lineHeight: 1.2 }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" sx={{ color: "#999", mt: 0.5, display: "block" }}>
              {sub}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: color ? color + "18" : "#f5f5f5",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, { sx: { color: color || "#555", fontSize: 22 } })}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const FinanceRow = ({ label, value, tooltip, highlight, indent, color }) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    sx={{
      py: 1.1,
      px: indent ? 2 : 0,
      borderRadius: 1.5,
      bgcolor: highlight ? (color ? color + "10" : "#f0f7ff") : "transparent",
      "&:not(:last-child)": { borderBottom: "1px solid #f0f0f0" },
    }}
  >
    <Stack direction="row" alignItems="center" spacing={0.5}>
      {indent && <Box sx={{ width: 8, height: 2, bgcolor: "#ddd", borderRadius: 1 }} />}
      <Typography variant="body2" sx={{ color: indent ? "#555" : "#333", fontWeight: highlight ? 700 : 500 }}>
        {label}
      </Typography>
      {tooltip && (
        <Tooltip title={tooltip} arrow placement="top">
          <InfoOutlinedIcon sx={{ fontSize: 13, color: "#bbb", cursor: "help" }} />
        </Tooltip>
      )}
    </Stack>
    <Typography
      variant="body2"
      sx={{ fontWeight: highlight ? 700 : 600, color: color || (highlight ? "#1a237e" : "#222"), fontVariantNumeric: "tabular-nums" }}
    >
      {value}
    </Typography>
  </Stack>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Analytics = () => {
  const [filterOptions, setFilterOptions] = useState({ projects: [], cities: [] });
  const [filters, setFilters] = useState({ duration: "thisMonth", project: "all", city: "all" });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Fetch filter options ─────────────────────────────────────────────────
  useEffect(() => {
    api.get("/analytics/filters")
      .then(r => setFilterOptions(r.data))
      .catch(e => console.error("Filter options error:", e));
  }, []);

  // ── Fetch summary ────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period: filters.duration });
      if (filters.project !== "all") params.set("project", filters.project);
      if (filters.city    !== "all") params.set("city",    filters.city);
      const { data } = await api.get(`/analytics/summary?${params}`);
      setSummary(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Analytics summary error:", e);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleFilter = (key) => (e) => setFilters(prev => ({ ...prev, [key]: e.target.value }));

  const f  = summary?.finance  || {};
  const s  = summary?.sessions || {};
  const en = summary?.energy   || {};

  // Cashfree breakdown helpers
  const cashfreePgPct = f.pgRatePercent ? `${f.pgRatePercent}%` : "1.888%";

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, minHeight: "100vh", bgcolor: "#f7f8fc", maxWidth: 1400, mx: "auto" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between" mb={3} spacing={1}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#1a1a2e" }}>
            Analytics
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" sx={{ color: "#999" }}>
              Updated {lastUpdated.toLocaleTimeString("en-IN")}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {/* Duration */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Duration</InputLabel>
            <Select value={filters.duration} label="Duration" onChange={handleFilter("duration")}>
              {DURATION_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Project */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Project</InputLabel>
            <Select value={filters.project} label="Project" onChange={handleFilter("project")}>
              <MenuItem value="all">All Projects</MenuItem>
              {filterOptions.projects.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          {/* City */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>City</InputLabel>
            <Select value={filters.city} label="City" onChange={handleFilter("city")}>
              <MenuItem value="all">All Cities</MenuItem>
              {filterOptions.cities.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>

          <IconButton onClick={fetchSummary} disabled={loading} size="small"
            sx={{ border: "1px solid #ddd", bgcolor: "#fff" }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      {/* ── Active period chip ──────────────────────────────────────────── */}
      <Box mb={3}>
        <Chip
          size="small"
          label={DURATION_OPTIONS.find(o => o.value === filters.duration)?.label || "All Time"}
          sx={{ bgcolor: "#e8f4fd", color: "#0277bd", fontWeight: 600, fontSize: 12 }}
        />
        {filters.project !== "all" && (
          <Chip size="small" label={`Project: ${filters.project}`}
            sx={{ ml: 1, bgcolor: "#f3e5f5", color: "#7b1fa2", fontWeight: 600, fontSize: 12 }} />
        )}
        {filters.city !== "all" && (
          <Chip size="small" label={`City: ${filters.city}`}
            sx={{ ml: 1, bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600, fontSize: 12 }} />
        )}
      </Box>

      {/* ── Loading / Error ─────────────────────────────────────────────── */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress size={48} />
        </Box>
      )}
      {error && !loading && (
        <Box textAlign="center" py={8}>
          <Typography color="error" variant="body1">{error}</Typography>
        </Box>
      )}

      {!loading && !error && summary && (
        <>
          {/* ══════════════════════════════════════════════════════════════ */}
          {/*  SECTION 1 — SESSIONS                                         */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <SectionLabel>Sessions</SectionLabel>
          <Grid container spacing={2.5} mb={4}>
            <Grid item xs={6} sm={6} md={3}>
              <KpiCard
                label="Live Sessions"
                value={fmtNum(s.live)}
                icon={<EvStationIcon />}
                color="#00897b"
                bg="#f0faf9"
                tooltip="Currently active (charging) sessions right now"
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <KpiCard
                label="Total Sessions"
                value={fmtNum(s.total)}
                icon={<EvStationIcon />}
                color="#1565c0"
                tooltip="All sessions started in the selected period"
              />
            </Grid>
          </Grid>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/*  SECTION 2 — ENERGY                                           */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <SectionLabel>Energy</SectionLabel>
          <Grid container spacing={2.5} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="Live Energy Dispensed"
                value={fmtKwh(en.liveKwh)}
                icon={<BoltIcon />}
                color="#f57c00"
                bg="#fff8f0"
                tooltip="Energy delivered so far in currently active sessions"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="Total Energy Consumed"
                value={fmtKwh(en.totalKwh)}
                icon={<BoltIcon />}
                color="#558b2f"
                bg="#f4fce8"
                tooltip="Total kWh dispensed across all completed sessions in the period"
              />
            </Grid>
          </Grid>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/*  SECTION 3 — FINANCE                                          */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <SectionLabel>Finance</SectionLabel>
          <Grid container spacing={2.5}>

            {/* ── KPI Row ─────────────────────────────────────────────── */}
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                label="Cashfree Total Collected"
                value={fmt(f.cashfreeGrossTotal)}
                icon={<PaymentsIcon />}
                color="#1565c0"
                bg="#f0f4ff"
                tooltip="Gross Cashfree receipts = Wallet top-ups + Direct session payments"
                sub={`Top-up: ${fmt(f.walletTopupTotal)}  |  Direct: ${fmt(f.directCashfreePaid)}`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                label="Cashfree Net Settlement"
                value={fmt(f.cashfreeNetSettlement)}
                icon={<AccountBalanceWalletIcon />}
                color="#283593"
                bg="#eef1ff"
                tooltip={`Gross − Direct session refunds − PG charges (${cashfreePgPct})`}
                sub={`After refunds & PG charges`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                label="Platform Margin"
                value={fmt(f.platformMargin)}
                icon={<TrendingUpIcon />}
                color="#6a1b9a"
                bg="#f9f0ff"
                tooltip="vjraMarginAmount summed from all receipts in period"
              />
            </Grid>

            {/* ── Cashfree Detail Breakdown Card ──────────────────────── */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e0e0e0", bgcolor: "#fff" }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <PaymentsIcon sx={{ color: "#1565c0", fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#1a1a2e">
                      Cashfree Collections Breakdown
                    </Typography>
                  </Stack>

                  <FinanceRow
                    label="Wallet Top-up (Cashfree → Wallet)"
                    value={fmt(f.walletTopupTotal)}
                    tooltip="Users loaded money into Sparx wallet via Cashfree"
                    highlight
                    color="#0277bd"
                  />
                  <FinanceRow
                    label="Direct Session Payments (Cashfree)"
                    value={fmt(f.directCashfreePaid)}
                    tooltip="Users paid directly via Cashfree at session start (no wallet)"
                    highlight
                    color="#0277bd"
                  />
                  <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />
                  <FinanceRow
                    label="Gross Cashfree Total"
                    value={fmt(f.cashfreeGrossTotal)}
                    highlight
                    color="#1565c0"
                  />

                  <Box mt={2} mb={1}>
                    <Typography variant="caption" sx={{ color: "#999", textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>
                      Deductions
                    </Typography>
                  </Box>
                  <FinanceRow
                    label="Direct Session Refunds (Bank via CF)"
                    value={`− ${fmt(f.directSessionRefunds)}`}
                    tooltip="Cashfree refunds sent back to user bank accounts"
                    indent
                    color="#c62828"
                  />
                  <FinanceRow
                    label={`PG Charges (${cashfreePgPct} = 1.6% + 18% GST)`}
                    value={`− ${fmt(f.pgCharges)}`}
                    tooltip={`1.6% base + 18% GST on 1.6% = 1.888% on gross Cashfree collection of ${fmt(f.cashfreeGrossTotal)}`}
                    indent
                    color="#c62828"
                  />
                  <Divider sx={{ my: 1.5 }} />
                  <FinanceRow
                    label="Net Cashfree Settlement"
                    value={fmt(f.cashfreeNetSettlement)}
                    tooltip="What actually settles to your account after refunds & PG charges"
                    highlight
                    color="#1b5e20"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* ── Wallet & Session Detail Card ─────────────────────────── */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e0e0e0", bgcolor: "#fff" }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <AccountBalanceWalletIcon sx={{ color: "#6a1b9a", fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#1a1a2e">
                      Wallet & Session Breakdown
                    </Typography>
                  </Stack>

                  <FinanceRow
                    label="Wallet Top-up (Total Loaded)"
                    value={fmt(f.walletTopupTotal)}
                    tooltip="Total amount credited into wallets via Cashfree in this period"
                    highlight
                    color="#0277bd"
                  />
                  <FinanceRow
                    label="Wallet Session Payments"
                    value={fmt(f.walletSessionPaid)}
                    tooltip="Amount debited from wallets to pay for charging sessions"
                    highlight
                    color="#4527a0"
                  />
                  <FinanceRow
                    label="Wallet Refunds (Session Leftover → Wallet)"
                    value={`− ${fmt(f.walletRefunds)}`}
                    tooltip="Unused balance after session ended, credited back to the user's Sparx wallet (not a Cashfree refund)"
                    indent
                    color="#c62828"
                  />

                  <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />

                  <FinanceRow
                    label="Session Paid Amount"
                    value={fmt(f.sessionPaidAmount)}
                    tooltip="amountUtilized summed from receipts — actual amount consumed across all sessions"
                    highlight
                    color="#1565c0"
                  />
                  <FinanceRow
                    label="Session Paid Refunds (Total)"
                    value={`− ${fmt(f.sessionPaidRefunds)}`}
                    tooltip="Wallet refunds + bank refunds — total money returned to users after sessions"
                    indent
                    color="#c62828"
                  />

                  <Divider sx={{ my: 1.5 }} />

                  <FinanceRow
                    label="Platform Margin"
                    value={fmt(f.platformMargin)}
                    tooltip="Total vjraMarginAmount from all receipts — platform's revenue"
                    highlight
                    color="#6a1b9a"
                  />
                </CardContent>
              </Card>
            </Grid>

          </Grid>
        </>
      )}
    </Box>
  );
};

export default Analytics;