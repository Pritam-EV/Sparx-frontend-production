// src/features/owner/OwnerOverview.js

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import BoltIcon from "@mui/icons-material/Bolt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import EnergySavingsLeafOutlinedIcon from "@mui/icons-material/EnergySavingsLeafOutlined";
import DeviceHubOutlinedIcon from "@mui/icons-material/DeviceHubOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ------------------------------------------------------------
// THEME
// ------------------------------------------------------------

const C = {
  teal: "#04BFBF",
  tealDark: "#038a8a",
  tealLight: "#e8fbfb",

  bg: "#f5f7fa",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",

  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",

  green: "#15803d",
  greenBg: "#dcfce7",

  orange: "#c2410c",
  orangeBg: "#ffedd5",

  red: "#dc2626",
  redBg: "#fee2e2",

  energy: "#0d9488",
  revenue: "#2563eb",
  payout: "#9333ea",
};

const FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ------------------------------------------------------------
// PERIOD FILTERS
// ------------------------------------------------------------

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "thisYear", label: "This Year" },
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
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let from = new Date(today);
  let to = new Date(tomorrow);
  let bucket = "day";

  switch (period) {
    case "today": {
      // Hourly values make the single-day chart useful.
      from = new Date(today);
      to = new Date(tomorrow);
      bucket = "hour";
      break;
    }

    case "thisWeek": {
      // Monday is the first day of the week.
      const dayOfWeek = today.getDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;

      from = new Date(today);
      from.setDate(from.getDate() - daysSinceMonday);

      to = new Date(tomorrow);
      bucket = "day";
      break;
    }

    case "thisMonth": {
      from = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      to = new Date(tomorrow);
      bucket = "day";
      break;
    }

    case "lastMonth": {
      from = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );

      to = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      bucket = "day";
      break;
    }

    case "thisQuarter": {
      const quarterStartMonth =
        Math.floor(today.getMonth() / 3) * 3;

      from = new Date(
        today.getFullYear(),
        quarterStartMonth,
        1
      );

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
      from = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

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
// FORMATTING HELPERS
// ------------------------------------------------------------

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const compactMoney = (value) => {
  const n = Number(value || 0);

  if (Math.abs(n) >= 10000000) {
    return `₹${(n / 10000000).toFixed(1)}Cr`;
  }

  if (Math.abs(n) >= 100000) {
    return `₹${(n / 100000).toFixed(1)}L`;
  }

  if (Math.abs(n) >= 1000) {
    return `₹${(n / 1000).toFixed(1)}k`;
  }

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
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatChartLabel = (value) => {
  if (!value) return "—";

  const label = String(value);

  // For the Today filter: YYYY-MM-DD HH:00
  if (label.includes(" ") && label.includes(":")) {
    const [datePart, timePart] = label.split(" ");
    const date = atLocalNoon(datePart);

    return `${date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    })} ${timePart}`;
  }

  // Monthly bucket support, if used later.
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split("-").map(Number);
    const date = new Date(year, month - 1, 1, 12);

    return date.toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  }

  // Daily bucket: YYYY-MM-DD
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

// ------------------------------------------------------------
// FILL EMPTY DAYS / HOURS WITH ZERO VALUES
// The API returns buckets containing receipts. This helper also
// supplies missing dates/hours as zeroes for continuity.
// ------------------------------------------------------------

const fillTrendGaps = (rows, period) => {
  const lookup = new Map(
    (Array.isArray(rows) ? rows : []).map((row) => [
      String(row.bucket),
      row,
    ])
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
      const key = `${date} ${hourString}:00`;

      return makeRow(key);
    });
  }

  const result = [];
  const cursor = atLocalNoon(period.from);
  const end = atLocalNoon(period.to);

  // Date buckets are exclusive of the end date.
  while (cursor < end) {
    const key = localDate(cursor);
    result.push(makeRow(key));

    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
};

// ------------------------------------------------------------
// REUSABLE METRIC CARD
// ------------------------------------------------------------

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = C.tealDark,
  background = C.tealLight,
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: `1px solid ${C.border}`,
        borderRadius: 3,
        bgcolor: C.surface,
      }}
    >
      <CardContent sx={{ p: { xs: 1.8, sm: 2.2 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1.2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                color: C.muted,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.4,
                fontFamily: FONT,
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: C.text,
                fontSize: { xs: 21, sm: 25 },
                fontWeight: 800,
                lineHeight: 1.25,
                overflowWrap: "anywhere",
                fontFamily: FONT,
              }}
            >
              {value}
            </Typography>

            {subtitle && (
              <Typography
                sx={{
                  color: C.muted,
                  fontSize: 11,
                  lineHeight: 1.5,
                  mt: 0.7,
                  fontFamily: FONT,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 2.5,
              bgcolor: background,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------
// LIVE SESSION CARD
// No payment, transaction or customer-contact fields are shown.
// ------------------------------------------------------------

function LiveSessionCard({ session }) {
  const isPaused = session.status === "paused";

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        border: `1px solid ${C.border}`,
        borderRadius: 3,
        bgcolor: C.surface,
      }}
    >
      <CardContent sx={{ p: { xs: 1.8, sm: 2.2 } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.2}
            sx={{ minWidth: 0 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: C.tealLight,
                color: C.tealDark,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BoltIcon />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  color: C.text,
                  fontWeight: 800,
                  fontSize: 15,
                  overflowWrap: "anywhere",
                }}
              >
                {session.deviceId || "Charger"}
              </Typography>

              <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.25 }}>
                {session.vehicleNumber || "Vehicle not specified"}
              </Typography>
            </Box>
          </Stack>

          <Chip
            size="small"
            label={isPaused ? "Paused" : "Charging"}
            sx={{
              flexShrink: 0,
              bgcolor: isPaused ? C.orangeBg : C.greenBg,
              color: isPaused ? C.orange : C.green,
              fontWeight: 800,
            }}
          />
        </Stack>

        <Divider sx={{ my: 1.8, borderColor: C.border }} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: C.muted, fontSize: 11 }}>
              Vehicle model
            </Typography>
            <Typography
              sx={{
                color: C.text,
                fontSize: 13,
                fontWeight: 700,
                mt: 0.35,
                overflowWrap: "anywhere",
              }}
            >
              {session.vehicleModel || "—"}
            </Typography>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: C.muted, fontSize: 11 }}>
              Energy consumed
            </Typography>
            <Typography
              sx={{
                color: C.text,
                fontSize: 13,
                fontWeight: 700,
                mt: 0.35,
              }}
            >
              {number(session.energyConsumed)} kWh
            </Typography>
          </Box>

          <Box sx={{ minWidth: 0, gridColumn: "1 / -1" }}>
            <Stack direction="row" alignItems="center" spacing={0.6}>
              <AccessTimeIcon sx={{ color: C.muted, fontSize: 15 }} />
              <Typography sx={{ color: C.muted, fontSize: 11 }}>
                Started
              </Typography>
            </Stack>

            <Typography
              sx={{
                color: C.text,
                fontSize: 12,
                fontWeight: 600,
                mt: 0.35,
              }}
            >
              {formatDateTime(session.startTime)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------
// CHART TOOLTIP
// ------------------------------------------------------------

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0]?.payload || {};

  return (
    <Box
      sx={{
        p: 1.5,
        minWidth: 210,
        bgcolor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        boxShadow: "0 8px 28px rgba(15,23,42,0.12)",
      }}
    >
      <Typography
        sx={{
          color: C.text,
          fontSize: 12,
          fontWeight: 800,
          mb: 1.2,
        }}
      >
        {formatChartLabel(label)}
      </Typography>

      <Stack spacing={0.9}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: C.energy, fontSize: 12 }}>
            Energy consumed
          </Typography>
          <Typography sx={{ color: C.text, fontSize: 12, fontWeight: 700 }}>
            {number(row.energyConsumed)} kWh
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: C.revenue, fontSize: 12 }}>
            Revenue
          </Typography>
          <Typography sx={{ color: C.text, fontSize: 12, fontWeight: 700 }}>
            {money(row.totalAmount)}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: C.payout, fontSize: 12 }}>
            Owner payout
          </Typography>
          <Typography sx={{ color: C.text, fontSize: 12, fontWeight: 700 }}>
            {money(row.ownerPayout)}
          </Typography>
        </Stack>

        <Divider sx={{ borderColor: C.border }} />

        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: C.muted, fontSize: 11 }}>
            Receipts
          </Typography>
          <Typography sx={{ color: C.text, fontSize: 11, fontWeight: 700 }}>
            {number(row.receiptCount, 0)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

// ------------------------------------------------------------
// MAIN OWNER OVERVIEW PAGE
// ------------------------------------------------------------

export default function OwnerOverview() {
  const [selectedFilter, setSelectedFilter] = useState("thisMonth");

  const [appliedPeriod, setAppliedPeriod] = useState(() =>
    getPeriodRange("thisMonth")
  );

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

      const result = await apiFetch(
        `/api/owner/overview?${params.toString()}`
      );

      setData(result);
    } catch (err) {
      setError(
        err.message || "Could not load the owner overview."
      );
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
    <Box
      sx={{
        minHeight: "100%",
        width: "100%",
        bgcolor: C.bg,
        p: { xs: 1.2, sm: 2, md: 3 },
        boxSizing: "border-box",
        fontFamily: FONT,
      }}
    >
      {/* -------------------------------------------------- */}
      {/* PAGE HEADER                                        */}
      {/* -------------------------------------------------- */}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography
            sx={{
              color: C.text,
              fontSize: { xs: 23, sm: 29 },
              lineHeight: 1.2,
              fontWeight: 800,
              fontFamily: FONT,
            }}
          >
            Owner Overview
          </Typography>

          <Typography
            sx={{
              color: C.muted,
              fontSize: 13,
              mt: 0.7,
              fontFamily: FONT,
            }}
          >
            Your charging network, live activity and receipt performance.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            loading ? (
              <CircularProgress size={15} color="inherit" />
            ) : (
              <RefreshIcon />
            )
          }
          onClick={fetchOverview}
          disabled={loading}
          sx={{
            alignSelf: { xs: "flex-start", sm: "center" },
            borderColor: C.border,
            bgcolor: C.surface,
            color: C.text,
            borderRadius: 2.5,
            fontWeight: 700,
            textTransform: "none",
            px: 2,
          }}
        >
          Refresh
        </Button>
      </Stack>

      {/* -------------------------------------------------- */}
      {/* QUICK DATE FILTERS                                 */}
      {/* -------------------------------------------------- */}

      <Card
        elevation={0}
        sx={{
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          mb: 2.5,
          bgcolor: C.surface,
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Typography
            sx={{
              color: C.text,
              fontSize: 13,
              fontWeight: 800,
              mb: 1.3,
            }}
          >
            Reporting period
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            {PERIOD_OPTIONS.map((option) => {
              const selected = selectedFilter === option.value;

              return (
                <Button
                  key={option.value}
                  variant={selected ? "contained" : "outlined"}
                  size="small"
                  onClick={() => changeFilter(option.value)}
                  sx={{
                    minHeight: 36,
                    px: { xs: 1.3, sm: 1.7 },
                    borderRadius: 2.5,
                    borderColor: selected ? C.teal : C.border,
                    bgcolor: selected ? C.teal : C.surface,
                    color: selected ? "#042f2e" : C.text,
                    textTransform: "none",
                    fontWeight: selected ? 800 : 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    boxShadow: "none",
                    "&:hover": {
                      borderColor: C.teal,
                      bgcolor: selected ? "#03aaaa" : C.tealLight,
                      boxShadow: "none",
                    },
                  }}
                >
                  {option.label}
                </Button>
              );
            })}
          </Box>

          <Typography
            sx={{
              color: C.muted,
              fontSize: 11,
              mt: 1.2,
            }}
          >
            {selectedFilter === "today"
              ? "Today is displayed hour by hour."
              : selectedFilter === "thisYear"
              ? "This year's trend is grouped by day."
              : "Receipt trends are grouped by day."}
          </Typography>
        </CardContent>
      </Card>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2.5, borderRadius: 2 }}
          action={
            <Button
              size="small"
              color="inherit"
              onClick={fetchOverview}
              disabled={loading}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* -------------------------------------------------- */}
      {/* LOADING STATE                                      */}
      {/* -------------------------------------------------- */}

      {loading && !data ? (
        <Box
          sx={{
            py: { xs: 7, sm: 10 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress sx={{ color: C.teal }} />

          <Typography sx={{ mt: 2, color: C.muted, fontSize: 13 }}>
            Loading owner overview…
          </Typography>
        </Box>
      ) : (
        <>
          {/* -------------------------------------------------- */}
          {/* SUMMARY CARDS                                      */}
          {/* -------------------------------------------------- */}

          <Typography
            sx={{
              color: C.text,
              fontSize: 16,
              fontWeight: 800,
              mb: 1.5,
            }}
          >
            Summary
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
              gap: { xs: 1, sm: 1.5 },
              mb: 3,
            }}
          >
            <MetricCard
              title="Live sessions"
              value={number(activeSessionCount, 0)}
              subtitle="Currently active or paused"
              icon={BoltIcon}
              accent={activeSessionCount > 0 ? C.green : C.tealDark}
              background={activeSessionCount > 0 ? C.greenBg : C.tealLight}
            />

            <MetricCard
              title="Total receipts"
              value={number(receiptCount, 0)}
              subtitle="In selected period"
              icon={ReceiptLongIcon}
            />

            <MetricCard
              title="Revenue · Total amount"
              value={money(performance.totalAmount)}
              subtitle="Includes receipt GST"
              icon={PaymentsOutlinedIcon}
              accent={C.revenue}
              background="#eff6ff"
            />

            <MetricCard
              title="Owner payout"
              value={money(performance.ownerPayout)}
              subtitle="Sum of receipt payout values"
              icon={PaymentsOutlinedIcon}
              accent={C.payout}
              background="#f3e8ff"
            />

            <MetricCard
              title="Energy consumed"
              value={`${number(performance.energyConsumed)} kWh`}
              subtitle="Based on receipts"
              icon={EnergySavingsLeafOutlinedIcon}
              accent={C.energy}
              background="#ccfbf1"
            />

            <MetricCard
              title="Taxable amount"
              value={money(performance.taxableAmount)}
              subtitle="Before GST"
              icon={ReceiptLongIcon}
            />

            <MetricCard
              title="GST amount"
              value={money(performance.gstAmount)}
              subtitle="GST recorded on receipts"
              icon={ReceiptLongIcon}
              accent={C.orange}
              background={C.orangeBg}
            />

            <MetricCard
              title="Total chargers"
              value={number(network.total, 0)}
              subtitle={`${number(network.online, 0)} online`}
              icon={DeviceHubOutlinedIcon}
            />
          </Box>

          {/* -------------------------------------------------- */}
          {/* LIVE SESSION SUMMARY — NO TABLE                    */}
          {/* -------------------------------------------------- */}

          <Card
            elevation={0}
            sx={{
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              bgcolor: C.surface,
              mb: 3,
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 2 }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ minWidth: 0 }}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      bgcolor: C.tealLight,
                      color: C.tealDark,
                      borderRadius: 2.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <BoltIcon />
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        color: C.text,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      Live session summary
                    </Typography>

                    <Typography
                      sx={{
                        color: C.muted,
                        fontSize: 11,
                        mt: 0.25,
                      }}
                    >
                      Live status comes from active Session records.
                    </Typography>
                  </Box>
                </Stack>

                <Chip
                  size="small"
                  label={`${number(activeSessionCount, 0)} active`}
                  sx={{
                    bgcolor:
                      activeSessionCount > 0
                        ? C.greenBg
                        : C.surfaceAlt,
                    color:
                      activeSessionCount > 0
                        ? C.green
                        : C.muted,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                />
              </Stack>

              {activeSessionCount === 0 ? (
                <Box
                  sx={{
                    py: { xs: 3, sm: 4 },
                    px: 2,
                    borderRadius: 2.5,
                    bgcolor: C.surfaceAlt,
                    border: `1px dashed ${C.border}`,
                    textAlign: "center",
                  }}
                >
                  <BoltIcon
                    sx={{
                      color: C.muted,
                      fontSize: 33,
                      mb: 0.6,
                    }}
                  />

                  <Typography
                    sx={{
                      color: C.text,
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    No active session
                  </Typography>

                  <Typography
                    sx={{
                      color: C.muted,
                      fontSize: 12,
                      mt: 0.5,
                    }}
                  >
                    Active charging sessions will appear here.
                  </Typography>
                </Box>
              ) : liveSessions.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  {activeSessionCount} active session
                  {activeSessionCount === 1 ? "" : "s"} detected. Session
                  details are not currently available.
                </Alert>
              ) : (
                <>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        xl: "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 1.5,
                    }}
                  >
                    {liveSessions.map((session) => (
                      <LiveSessionCard
                        key={session.sessionId}
                        session={session}
                      />
                    ))}
                  </Box>

                  {activeSessionCount > liveSessions.length && (
                    <Typography
                      sx={{
                        color: C.muted,
                        fontSize: 11,
                        mt: 1.2,
                      }}
                    >
                      Showing {liveSessions.length} of{" "}
                      {activeSessionCount} live sessions.
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* -------------------------------------------------- */}
          {/* RECEIPT TREND GRAPH                                */}
          {/* -------------------------------------------------- */}

          <Card
            elevation={0}
            sx={{
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              bgcolor: C.surface,
              mb: 3,
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <Box>
                  <Typography
                    sx={{
                      color: C.text,
                      fontSize: 17,
                      fontWeight: 800,
                    }}
                  >
                    Receipts trend
                  </Typography>

                  <Typography
                    sx={{
                      color: C.muted,
                      fontSize: 12,
                      mt: 0.5,
                    }}
                  >
                    Energy, total customer billing and owner payout over time.
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={
                    appliedPeriod.bucket === "hour"
                      ? "Hourly"
                      : "Daily"
                  }
                  sx={{
                    bgcolor: C.tealLight,
                    color: C.tealDark,
                    fontWeight: 800,
                  }}
                />
              </Stack>

              {/* Chart legend / series description */}
              <Stack
                direction="row"
                spacing={{ xs: 1.2, sm: 2.5 }}
                flexWrap="wrap"
                useFlexGap
                sx={{ mb: 1.3 }}
              >
                {[
                  { label: "Energy consumed", color: C.energy },
                  { label: "Revenue · Total amount", color: C.revenue },
                  { label: "Owner payout", color: C.payout },
                ].map((item) => (
                  <Stack
                    key={item.label}
                    direction="row"
                    alignItems="center"
                    spacing={0.7}
                  >
                    <Box
                      sx={{
                        width: 18,
                        height: 3,
                        borderRadius: 10,
                        bgcolor: item.color,
                      }}
                    />

                    <Typography
                      sx={{
                        color: C.muted,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              {receiptCount === 0 || rawTrend.length === 0 ? (
                <Box
                  sx={{
                    height: { xs: 220, sm: 260 },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: C.surfaceAlt,
                    borderRadius: 2.5,
                    border: `1px dashed ${C.border}`,
                    px: 2,
                    textAlign: "center",
                  }}
                >
                  <ReceiptLongIcon
                    sx={{ color: C.muted, fontSize: 34, mb: 1 }}
                  />

                  <Typography
                    sx={{
                      color: C.text,
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    No receipt trend yet
                  </Typography>

                  <Typography
                    sx={{
                      color: C.muted,
                      fontSize: 12,
                      mt: 0.5,
                      maxWidth: 360,
                    }}
                  >
                    No receipts were recorded during this period. Select
                    another reporting period to view earlier activity.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: 300, sm: 350, md: 390 },
                    mt: 1,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{
                        top: 10,
                        right: 3,
                        bottom: 5,
                        left: -8,
                      }}
                    >
                      <CartesianGrid
                        stroke="#e8edf3"
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="bucket"
                        tickFormatter={formatAxisTick}
                        tick={{
                          fill: C.muted,
                          fontSize: 10,
                        }}
                        axisLine={{ stroke: C.border }}
                        tickLine={false}
                        minTickGap={28}
                        interval="preserveStartEnd"
                        padding={{ left: 4, right: 4 }}
                      />

                      <YAxis
                        yAxisId="energy"
                        orientation="left"
                        width={48}
                        tick={{
                          fill: C.energy,
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => number(value, 0)}
                        allowDecimals
                      />

                      <YAxis
                        yAxisId="money"
                        orientation="right"
                        width={60}
                        tick={{
                          fill: C.muted,
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={compactMoney}
                        allowDecimals
                      />

                      <Tooltip
                        content={<TrendTooltip />}
                        cursor={{
                          stroke: "#94a3b8",
                          strokeDasharray: "4 4",
                        }}
                      />

                      <Legend content={() => null} />

                      <Area
                        yAxisId="energy"
                        type="monotone"
                        dataKey="energyConsumed"
                        name="Energy consumed"
                        stroke={C.energy}
                        strokeWidth={2}
                        fill="#99f6e4"
                        fillOpacity={0.42}
                        activeDot={{
                          r: 5,
                          strokeWidth: 2,
                          fill: C.surface,
                        }}
                        isAnimationActive={false}
                      />

                      <Line
                        yAxisId="money"
                        type="monotone"
                        dataKey="totalAmount"
                        name="Revenue · Total amount"
                        stroke={C.revenue}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        isAnimationActive={false}
                      />

                      <Line
                        yAxisId="money"
                        type="monotone"
                        dataKey="ownerPayout"
                        name="Owner payout"
                        stroke={C.payout}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              )}

              <Divider sx={{ my: 1.8, borderColor: C.border }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 1.2,
                }}
              >
                <Box>
                  <Typography sx={{ color: C.muted, fontSize: 11 }}>
                    Revenue · Total amount
                  </Typography>
                  <Typography
                    sx={{
                      color: C.revenue,
                      fontSize: 17,
                      fontWeight: 800,
                      mt: 0.35,
                    }}
                  >
                    {money(performance.totalAmount)}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ color: C.muted, fontSize: 11 }}>
                    Energy consumed
                  </Typography>
                  <Typography
                    sx={{
                      color: C.energy,
                      fontSize: 17,
                      fontWeight: 800,
                      mt: 0.35,
                    }}
                  >
                    {number(performance.energyConsumed)} kWh
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ color: C.muted, fontSize: 11 }}>
                    Owner payout
                  </Typography>
                  <Typography
                    sx={{
                      color: C.payout,
                      fontSize: 17,
                      fontWeight: 800,
                      mt: 0.35,
                    }}
                  >
                    {money(performance.ownerPayout)}
                  </Typography>
                </Box>
              </Box>

              <Typography
                sx={{
                  color: C.muted,
                  fontSize: 10,
                  mt: 1.6,
                  lineHeight: 1.6,
                }}
              >
                Revenue is the sum of receipt total amounts, including GST.
                Owner payout is the sum of the payout values recorded on
                receipts. The graph does not represent payment gateway
                settlement or bank reconciliation.
              </Typography>
            </CardContent>
          </Card>

          {/* -------------------------------------------------- */}
          {/* NETWORK STATUS                                     */}
          {/* -------------------------------------------------- */}

          <Typography
            sx={{
              color: C.text,
              fontSize: 16,
              fontWeight: 800,
              mb: 1.5,
            }}
          >
            Charger network
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(4, minmax(0, 1fr))",
              },
              gap: { xs: 1, sm: 1.5 },
              mb: 3,
            }}
          >
            {[
              {
                label: "Online",
                value: network.online,
                color: C.green,
                background: C.greenBg,
              },
              {
                label: "Available",
                value: network.available,
                color: C.tealDark,
                background: C.tealLight,
              },
              {
                label: "Offline",
                value: network.offline,
                color: C.orange,
                background: C.orangeBg,
              },
              {
                label: "Faulty",
                value: network.faulty,
                color: C.red,
                background: C.redBg,
              },
            ].map((item) => (
              <Card
                key={item.label}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${C.border}`,
                  bgcolor: C.surface,
                }}
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={0.5}
                  >
                    <Typography
                      sx={{
                        color: C.muted,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {item.label}
                    </Typography>

                    <Box
                      sx={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        bgcolor: item.color,
                      }}
                    />
                  </Stack>

                  <Typography
                    sx={{
                      color: C.text,
                      fontSize: { xs: 24, sm: 28 },
                      fontWeight: 800,
                      mt: 0.7,
                    }}
                  >
                    {number(item.value, 0)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* -------------------------------------------------- */}
          {/* DEVICE ALERTS                                      */}
          {/* -------------------------------------------------- */}

          {Array.isArray(data?.alerts) && data.alerts.length > 0 && (
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                bgcolor: C.surface,
                mb: 3,
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                <Typography
                  sx={{
                    color: C.text,
                    fontSize: 16,
                    fontWeight: 800,
                    mb: 1.5,
                  }}
                >
                  Charger alerts
                </Typography>

                <Stack spacing={1}>
                  {data.alerts.map((alert, index) => (
                    <Alert
                      key={`${alert.deviceId || "device"}-${index}`}
                      severity={
                        alert.severity === "critical"
                          ? "error"
                          : "warning"
                      }
                      sx={{ borderRadius: 2 }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {alert.deviceId}
                        {alert.location ? ` · ${alert.location}` : ""}
                      </Typography>

                      <Typography sx={{ fontSize: 12, mt: 0.3 }}>
                        {alert.message}
                      </Typography>
                    </Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Typography
            sx={{
              color: C.muted,
              textAlign: "center",
              fontSize: 10,
              py: 1.5,
            }}
          >
            Last updated:{" "}
            {data?.metadata?.generatedAt
              ? formatDateTime(data.metadata.generatedAt)
              : "—"}
          </Typography>
        </>
      )}
    </Box>
  );
}