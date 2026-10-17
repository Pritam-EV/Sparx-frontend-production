// src/features/owner/OwnerOverview.js

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";
import "./OwnerOverview.css";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import EnergySavingsLeafOutlinedIcon from "@mui/icons-material/EnergySavingsLeafOutlined";
import EvStationRoundedIcon from "@mui/icons-material/EvStationRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ------------------------------------------------------------
// PERIOD FILTERS & RANGE HELPERS
// ------------------------------------------------------------

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisQuarter", label: "Quarter" },
  { value: "thisYear", label: "Year" },
];

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const atLocalNoon = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getPeriodRange = (period, now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let from = new Date(today);
  let to = new Date(tomorrow);
  let bucket = "day";

  switch (period) {
    case "today": {
      from = new Date(today);
      to = new Date(tomorrow);
      bucket = "hour";
      break;
    }
    case "thisWeek": {
      const dayOfWeek = today.getDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      from = new Date(today);
      from.setDate(from.getDate() - daysSinceMonday);
      to = new Date(tomorrow);
      bucket = "day";
      break;
    }
    case "thisMonth": {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(tomorrow);
      bucket = "day";
      break;
    }
    case "lastMonth": {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 1);
      bucket = "day";
      break;
    }
    case "thisQuarter": {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      from = new Date(today.getFullYear(), quarterStartMonth, 1);
      to = new Date(tomorrow);
      bucket = "day";
      break;
    }
    case "thisYear": {
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date(tomorrow);
      bucket = "day";
      break;
    }
    default: {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(tomorrow);
      bucket = "day";
    }
  }

  return {
    from: localDate(from),
    to: localDate(to),
    bucket,
    period,
  };
};

// ------------------------------------------------------------
// FORMATTERS
// ------------------------------------------------------------

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const compactMoney = (value) => {
  const n = Number(value || 0);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};

const number = (value, digits = 2) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatChartLabel = (value) => {
  if (!value) return "—";
  const label = String(value);

  if (label.includes(" ") && label.includes(":")) {
    const [datePart, timePart] = label.split(" ");
    const date = atLocalNoon(datePart);
    return `${date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    })} • ${timePart}`;
  }

  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split("-").map(Number);
    return new Date(year, month - 1, 1, 12).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return atLocalNoon(label).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  return label;
};

const formatAxisTick = (value) => {
  if (!value) return "";
  const label = String(value);

  if (label.includes(" ") && label.includes(":")) {
    return label.slice(11, 16);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return atLocalNoon(label).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  return label;
};

const fillTrendGaps = (rows, period) => {
  const lookup = new Map(
    (Array.isArray(rows) ? rows : []).map((row) => [String(row.bucket), row])
  );

  const makeRow = (bucket) => {
    const found = lookup.get(bucket) || {};
    return {
      bucket,
      receiptCount: Number(found.receiptCount || 0),
      energyConsumed: Number(found.energyConsumed || 0),
      totalAmount: Number(found.totalAmount || 0),
      ownerPayout: Number(found.ownerPayout || 0),
    };
  };

  if (period.bucket === "hour") {
    const date = period.from;
    return Array.from({ length: 24 }, (_, hour) => {
      const hourString = String(hour).padStart(2, "0");
      return makeRow(`${date} ${hourString}:00`);
    });
  }

  const result = [];
  const cursor = atLocalNoon(period.from);
  const end = atLocalNoon(period.to);

  while (cursor < end) {
    result.push(makeRow(localDate(cursor)));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
};

// ------------------------------------------------------------
// CUSTOM BAR CHART TOOLTIP
// ------------------------------------------------------------

function BarTrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};

  return (
    <div className="viz-bar-tooltip">
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 12,
          color: "var(--viz-aqua)",
          marginBottom: 6,
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          paddingBottom: 4,
        }}
      >
        {formatChartLabel(label)}
      </div>

      <Stack spacing={0.5}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <span style={{ fontSize: 11, color: "#cbd5e1" }}>Total Billing</span>
          <strong style={{ fontSize: 11, color: "#ff8236" }}>
            {money(row.totalAmount)}
          </strong>
        </Stack>

        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <span style={{ fontSize: 11, color: "#cbd5e1" }}>Owner Payout</span>
          <strong style={{ fontSize: 11, color: "#00d2b4" }}>
            {money(row.ownerPayout)}
          </strong>
        </Stack>

        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <span style={{ fontSize: 11, color: "#cbd5e1" }}>Energy</span>
          <strong style={{ fontSize: 11, color: "#ffffff" }}>
            {number(row.energyConsumed)} kWh
          </strong>
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={2}
          sx={{ pt: 0.4, borderTop: "1px dashed rgba(255,255,255,0.12)" }}
        >
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Receipts</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#e2e8f0" }}>
            {number(row.receiptCount, 0)}
          </span>
        </Stack>
      </Stack>
    </div>
  );
}

// ------------------------------------------------------------
// COMPACT LIVE SESSION ROW
// ------------------------------------------------------------

function CompactLiveSession({ session }) {
  const isPaused = session.status === "paused";

  return (
    <div className="viz-live-row-card">
      <div className="viz-live-left" style={{ minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            bgcolor: isPaused ? "var(--viz-warn-bg)" : "var(--viz-green-bg)",
            color: isPaused ? "var(--viz-warn-fg)" : "var(--viz-green-fg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BoltRoundedIcon sx={{ fontSize: 20 }} />
        </Box>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="viz-live-charger-name">
            <span>{session.deviceId || "Charger"}</span>
            {/* Plain text number plate */}
            <span style={{ color: "var(--viz-text-muted)", margin: "0 4px" }}>•</span>
            <span className="viz-plain-plate">
              {session.vehicleNumber || "Vehicle not specified"}
            </span>
          </div>

          <div className="viz-live-meta">
            {session.vehicleModel || "Standard EV"} • Started{" "}
            {formatDateTime(session.startTime)}
          </div>
        </div>
      </div>

      <div className="viz-live-right" style={{ flexShrink: 0, textAlign: "right" }}>
        <div className="viz-live-kwh">{number(session.energyConsumed)} kWh</div>
        <span
          className="viz-live-status-tag"
          style={{
            backgroundColor: isPaused
              ? "var(--viz-warn-bg)"
              : "var(--viz-green-bg)",
            color: isPaused ? "var(--viz-warn-fg)" : "var(--viz-green-fg)",
          }}
        >
          {isPaused ? "Paused" : "Charging"}
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MAIN CPO OWNER OVERVIEW COMPONENT
// ------------------------------------------------------------

export default function OwnerOverview() {
  const [selectedFilter, setSelectedFilter] = useState("thisMonth");
  const [appliedPeriod, setAppliedPeriod] = useState(() =>
    getPeriodRange("thisMonth")
  );

  // Switch between "financial" (Revenue & Payout bars) and "energy" (kWh bars)
  const [chartView, setChartView] = useState("financial");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        from: appliedPeriod.from,
        to: appliedPeriod.to,
        bucket: appliedPeriod.bucket,
      });

      const result = await apiFetch(`/api/owner/overview?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err.message || "Could not load the owner overview.");
    } finally {
      setLoading(false);
    }
  }, [appliedPeriod]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const changeFilter = (filter) => {
    setSelectedFilter(filter);
    setAppliedPeriod(getPeriodRange(filter));
  };

  const performance = data?.performance || {};
  const network = data?.network || {};

  const liveSessions = Array.isArray(data?.activeSessionsPreview)
    ? data.activeSessionsPreview
    : [];

  const rawTrend = Array.isArray(data?.trend) ? data.trend : [];

  const chartData = useMemo(
    () => fillTrendGaps(rawTrend, appliedPeriod),
    [rawTrend, appliedPeriod]
  );

  const activeSessionCount = Number(performance.activeSessions || 0);
  const receiptCount = Number(performance.receiptCount || 0);

  return (
    <div className="viz-cpo-shell">
      {/* ================================================================== */}
      {/* 1. COMPACT STICKY COMMAND HEADER + INLINE FILTER PILLBOX           */}
      {/* ================================================================== */}
      <header className="viz-top-header">
        <div className="viz-header-inner">
          <div className="viz-brand-row">
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <div className="viz-logo-badge">
                
              </div>
              <div>
                <div className="viz-brand-name">
                  VIZ-Smart Charging <span className="viz-cpo-tag">CPO Hub</span>
                </div>
                <div className="viz-brand-sub">
                  {selectedFilter === "today"
                    ? "Hourly live station telemetry"
                    : "Daily station receipts & live status"}
                </div>
              </div>
            </div>

            {/* Mobile Sync Button visible inline on small screens */}
            <button
              type="button"
              onClick={fetchOverview}
              disabled={loading}
              className="viz-sync-icon-btn"
              title="Refresh Data"
            >
              {loading ? (
                <CircularProgress size={15} color="inherit" />
              ) : (
                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              )}
            </button>
          </div>

          {/* Sleek Single-Line Period Filter Bar */}
          <div className="viz-controls-group">
            <div className="viz-period-pillbox">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => changeFilter(opt.value)}
                  className={`viz-period-btn ${
                    selectedFilter === opt.value ? "active" : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. MAIN DASHBOARD BODY                                             */}
      {/* ================================================================== */}
      <main className="viz-container">
        {error && (
          <Alert
            severity="error"
            sx={{ borderRadius: "14px", py: 0.5 }}
            action={
              <Button color="inherit" size="small" onClick={fetchOverview}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {loading && !data ? (
          <Box
            sx={{
              py: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <CircularProgress sx={{ color: "var(--viz-aqua)" }} />
            <Typography
              sx={{
                mt: 1.5,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--viz-text-muted)",
              }}
            >
              Loading station telemetry…
            </Typography>
          </Box>
        ) : (
          <>
{/* ROW 1: CHARGER NETWORK STATUS (UNCLIPPED) */}
<section className="viz-health-ribbon">
  <div className="viz-health-title-block">
    <span className="viz-health-label">
      <EvStationRoundedIcon
        sx={{ fontSize: 18, color: "var(--viz-teal-deep)" }}
      />
      Charger Network Status
    </span>
  </div>

  <div className="viz-health-pills">
    {[
      { label: "Total", val: network.total, dot: "#0e2e33", color: "var(--viz-text-main)" },
      { label: "Available", val: network.available, dot: "#00d2b4", color: "var(--viz-teal-deep)" },
      { label: "Occupied", val: network.occupied ?? activeSessionCount, dot: "#ff8236", color: "var(--viz-orange)" },
      { label: "Offline", val: network.offline, dot: "#e06014", color: "var(--viz-warn-fg)" },
      { label: "Faulty", val: network.faulty, dot: "#d93b3b", color: "var(--viz-err-fg)" },
    ].map((st) => (
      <div key={st.label} className="viz-stat-pill">
        <div className="viz-stat-pill-top">
          <span className="viz-dot" style={{ backgroundColor: st.dot }} />
          <span className="viz-stat-pill-num" style={{ color: st.color }}>
            {number(st.val, 0)}
          </span>
        </div>
        <span className="viz-stat-pill-lbl">{st.label}</span>
      </div>
    ))}
  </div>
</section>

            {/* ============================================================ */}
            {/* CRITICAL DEVICE ALERTS (IF ANY) SHOWN IMMEDIATELY AT TOP     */}
            {/* ============================================================ */}
            {Array.isArray(data?.alerts) && data.alerts.length > 0 && (
              <Stack spacing={0.8}>
                {data.alerts.map((alert, idx) => (
                  <Alert
                    key={`${alert.deviceId || "dev"}-${idx}`}
                    severity={
                      alert.severity === "critical" ? "error" : "warning"
                    }
                    icon={<WarningAmberRoundedIcon fontSize="small" />}
                    sx={{
                      borderRadius: "14px",
                      py: 0.4,
                      fontFamily: "var(--font-body)",
                      fontSize: 12,
                    }}
                  >
                    <strong>
                      {alert.deviceId}
                      {alert.location ? ` · ${alert.location}` : ""}:
                    </strong>{" "}
                    {alert.message}
                  </Alert>
                ))}
              </Stack>
            )}

            {/* ============================================================ */}
            {/* ROW 2: SPLIT COMMAND GRID (FINANCIAL BENTO + LIVE SESSIONS)  */}
            {/* ============================================================ */}
            <section className="viz-command-grid">
              {/* LEFT: Financial Hero + Compact Energy/Receipts Subgrid */}
              <div className="viz-bento-left">
                {/* Centered Light Owner Payout Card */}
                <div className="viz-fin-hero-card-light">
                  <div className="viz-payout-center-block">
                    <div className="viz-fin-kicker-light">
                      <AccountBalanceWalletOutlinedIcon
                        sx={{ fontSize: 16, color: "var(--viz-teal-deep)" }}
                      />
                      Owner Payout
                    </div>
                    
                    <div className="viz-fin-big-val-center">
                      {money(performance.ownerPayout)}
                    </div>
                    
                    <div style={{ fontSize: 11, color: "var(--viz-text-muted)" }}>
                      Net receipt payout value for selected period
                    </div>
                  </div>

                  {/* Revenue strip */}
                  <div className="viz-revenue-strip-light">
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--viz-text-muted)" }}>
                      Revenue (Total Amount):
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "var(--viz-orange)" }}>
                      {money(performance.totalAmount)}
                    </span>
                  </div>

                  {/* Taxable & GST Strip */}
                  <div className="viz-tax-strip-light">
                    <div className="viz-tax-item-light">
                      <span className="viz-tax-lbl-light">Taxable Amount</span>
                      <span className="viz-tax-val-light">{money(performance.taxableAmount)}</span>
                    </div>
                    <div style={{ width: 1, height: 24, background: "var(--viz-border)" }} />
                    <div className="viz-tax-item-light">
                      <span className="viz-tax-lbl-light">GST Recorded</span>
                      <span className="viz-tax-val-light" style={{ color: "var(--viz-orange-deep)" }}>
                        {money(performance.gstAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compact 2-Column Subgrid (Fits side-by-side on mobile!) */}
                <div className="viz-bento-subgrid">
                  <div className="viz-compact-tile">
                    <div>
                      <div className="viz-tile-label">Energy Consumed</div>
                      <div className="viz-tile-value">
                        {number(performance.energyConsumed)}{" "}
                        <span style={{ fontSize: "0.75em", fontWeight: 700 }}>
                          kWh
                        </span>
                      </div>
                      <div className="viz-tile-sub">Based on receipts</div>
                    </div>

                    <div
                      className="viz-tile-icon"
                      style={{
                        background: "var(--viz-green-bg)",
                        color: "var(--viz-green-fg)",
                      }}
                    >
                      <EnergySavingsLeafOutlinedIcon sx={{ fontSize: 20 }} />
                    </div>
                  </div>

                  <div className="viz-compact-tile">
                    <div>
                      <div className="viz-tile-label">Total Receipts</div>
                      <div className="viz-tile-value">
                        {number(receiptCount, 0)}
                      </div>
                      <div className="viz-tile-sub">In selected period</div>
                    </div>

                    <div
                      className="viz-tile-icon"
                      style={{
                        background: "var(--viz-warn-bg)",
                        color: "var(--viz-warn-fg)",
                      }}
                    >
                      <ReceiptLongRoundedIcon sx={{ fontSize: 20 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Live Active Sessions Dock */}
              <div className="viz-live-panel">
                <div>
                  <div className="viz-panel-header">
                    <div className="viz-panel-title-wrap">
                      <span
                        className="viz-live-radar-dot"
                        style={{
                          background:
                            activeSessionCount > 0 ? "#008764" : "#94a3b8",
                          boxShadow:
                            activeSessionCount > 0
                              ? "0 0 0 4px rgba(0, 135, 100, 0.18)"
                              : "none",
                        }}
                      />
                      <span className="viz-panel-title">
                        Live Charging Sessions
                      </span>
                    </div>

                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "3px 10px",
                        borderRadius: 999,
                        backgroundColor:
                          activeSessionCount > 0
                            ? "var(--viz-green-bg)"
                            : "var(--viz-teal-wash)",
                        color:
                          activeSessionCount > 0
                            ? "var(--viz-green-fg)"
                            : "var(--viz-text-muted)",
                      }}
                    >
                      {number(activeSessionCount, 0)} Active
                    </span>
                  </div>

                  {activeSessionCount === 0 ? (
                    <div className="viz-empty-live">
                      <BoltRoundedIcon
                        sx={{ fontSize: 28, color: "var(--viz-text-subtle)" }}
                      />
                      <Typography
                        sx={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 800,
                          fontSize: 13.5,
                          mt: 0.5,
                        }}
                      >
                        No Active Sessions Right Now
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          color: "var(--viz-text-muted)",
                          mt: 0.2,
                        }}
                      >
                        Plugged-in vehicles and live kWh counters appear here.
                      </Typography>
                    </div>
                  ) : liveSessions.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: "12px" }}>
                      {activeSessionCount} active session
                      {activeSessionCount === 1 ? "" : "s"} running.
                    </Alert>
                  ) : (
                    <div className="viz-live-list">
                      {liveSessions.map((session) => (
                        <CompactLiveSession
                          key={session.sessionId || session.deviceId}
                          session={session}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {activeSessionCount > liveSessions.length && (
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: "var(--viz-text-subtle)",
                      mt: 1,
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    Showing {liveSessions.length} of {activeSessionCount} active
                    sessions
                  </Typography>
                )}
              </div>
            </section>

            {/* ============================================================ */}
            {/* ROW 3: INTERACTIVE BAR CHART ANALYTICS                       */}
            {/* ============================================================ */}
            <section className="viz-analytics-card">
              <div className="viz-analytics-top">
                <div>
                  <Stack direction="row" alignItems="center" spacing={0.8}>
                    <BarChartRoundedIcon
                      sx={{ color: "var(--viz-teal-deep)", fontSize: 20 }}
                    />
                    <span className="viz-panel-title">
                      Receipts & Telemetry Bar Trend
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--viz-teal-wash)",
                        color: "var(--viz-teal-deep)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {appliedPeriod.bucket === "hour" ? "Hourly" : "Daily"}
                    </span>
                  </Stack>

                  <Typography
                    sx={{
                      fontSize: 11.5,
                      color: "var(--viz-text-muted)",
                      mt: 0.3,
                    }}
                  >
                    Switch between Financial Settlement Bars (₹) and Dispensed
                    Energy Bars (kWh).
                  </Typography>
                </div>

                {/* Toggle Switcher for Clean Bar Comparison */}
                <div className="viz-chart-mode-tabs">
                  <button
                    type="button"
                    onClick={() => setChartView("financial")}
                    className={`viz-mode-tab ${
                      chartView === "financial" ? "active" : ""
                    }`}
                  >
                    Revenue & Payout (₹)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView("energy")}
                    className={`viz-mode-tab ${
                      chartView === "energy" ? "active" : ""
                    }`}
                  >
                    Energy (kWh)
                  </button>
                </div>
              </div>

              {receiptCount === 0 || rawTrend.length === 0 ? (
                <div className="viz-empty-live" style={{ padding: "2.5rem 1rem" }}>
                  <ReceiptLongRoundedIcon
                    sx={{ fontSize: 32, color: "var(--viz-text-subtle)" }}
                  />
                  <Typography
                    sx={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 14,
                      mt: 0.6,
                    }}
                  >
                    No Receipt Bars Recorded For This Period
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12, color: "var(--viz-text-muted)", mt: 0.3 }}
                  >
                    Choose another reporting period from the top bar to view
                    historical bars.
                  </Typography>
                </div>
              ) : (
                <div className="viz-bar-viewport">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 6, bottom: 2, left: -12 }}
                      barGap={3}
                    >
                      <CartesianGrid
                        stroke="#e5f5f2"
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="bucket"
                        tickFormatter={formatAxisTick}
                        tick={{
                          fill: "#53757a",
                          fontSize: 10,
                          fontFamily: "Outfit",
                          fontWeight: 600,
                        }}
                        axisLine={{ stroke: "#d4f0ec" }}
                        tickLine={false}
                        minTickGap={22}
                      />

                      <YAxis
                        tick={{
                          fill: "#53757a",
                          fontSize: 10,
                          fontFamily: "Outfit",
                          fontWeight: 700,
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={
                          chartView === "financial"
                            ? compactMoney
                            : (v) => `${number(v, 0)}`
                        }
                      />

                      <Tooltip
                        content={<BarTrendTooltip />}
                        cursor={{ fill: "rgba(0, 210, 180, 0.08)" }}
                      />

                      {chartView === "financial" ? (
                        <>
                          <Bar
                            dataKey="totalAmount"
                            name="Total Revenue"
                            fill="#ff8236"
                            radius={[5, 5, 0, 0]}
                            maxBarSize={28}
                          />
                          <Bar
                            dataKey="ownerPayout"
                            name="Owner Payout"
                            fill="#008f7f"
                            radius={[5, 5, 0, 0]}
                            maxBarSize={28}
                          />
                        </>
                      ) : (
                        <Bar
                          dataKey="energyConsumed"
                          name="Energy Consumed (kWh)"
                          fill="#00d2b4"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={34}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Compact 3-Column Summary Strip Under Bar Chart */}
              <div className="viz-chart-summary-strip">
                <div className="viz-strip-box">
                  <div className="viz-tile-label">Revenue (Incl. GST)</div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "0.98rem",
                      color: "var(--viz-orange-deep)",
                      marginTop: 2,
                    }}
                  >
                    {money(performance.totalAmount)}
                  </div>
                </div>

                <div className="viz-strip-box">
                  <div className="viz-tile-label">Owner Payout</div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "0.98rem",
                      color: "var(--viz-teal-deep)",
                      marginTop: 2,
                    }}
                  >
                    {money(performance.ownerPayout)}
                  </div>
                </div>

                <div className="viz-strip-box">
                  <div className="viz-tile-label">Energy Total</div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "0.98rem",
                      color: "var(--viz-text-main)",
                      marginTop: 2,
                    }}
                  >
                    {number(performance.energyConsumed)} kWh
                  </div>
                </div>
              </div>

              <Typography
                sx={{
                  fontSize: 12,
                  color: "var(--viz-text-subtle)",
                  mt: 1.2,
                  lineHeight: 1.4,
                }}
              >
                * Revenue is the sum of receipt total amounts including GST.
                Owner payout reflects recorded receipt payouts, it includes 
                electricity charges and does not
                represent bank settlement reconciliation. 
              </Typography>
            </section>
            {/* Metadata Timestamp */}
            <div className="viz-footer-meta">
              VIZ CPO Engine • Last Telemetry Ping:{" "}
              {data?.metadata?.generatedAt
                ? formatDateTime(data.metadata.generatedAt)
                : "—"}
            </div>
          </>
        )}
      </main>
    </div>
  );
}