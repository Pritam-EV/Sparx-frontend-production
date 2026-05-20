// src/features/admin/TransactionsOverview.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box, Typography, Stack, Grid, Card, CardContent, Chip,
  TextField, IconButton, Drawer, Divider, Tabs, Tab,
  InputAdornment, Tooltip, Avatar, Button, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, useMediaQuery, useTheme,
} from "@mui/material";
import RefreshIcon              from "@mui/icons-material/Refresh";
import SearchIcon               from "@mui/icons-material/Search";
import CloseIcon                from "@mui/icons-material/Close";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EvStationIcon            from "@mui/icons-material/EvStation";
import ReplayIcon               from "@mui/icons-material/Replay";
import AccountBalanceIcon       from "@mui/icons-material/AccountBalance";
import AdminPanelSettingsIcon   from "@mui/icons-material/AdminPanelSettings";
import ReceiptLongIcon          from "@mui/icons-material/ReceiptLong";
import PaymentIcon              from "@mui/icons-material/Payment";
import FilterListIcon           from "@mui/icons-material/FilterList";
import KeyboardArrowLeftIcon    from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon   from "@mui/icons-material/KeyboardArrowRight";
import NorthIcon                from "@mui/icons-material/North";
import SouthIcon                from "@mui/icons-material/South";
import { apiFetch } from "../../utils/apiFetch";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { value: "all",      label: "All Transactions", icon: <ReceiptLongIcon sx={{ fontSize: 15 }} /> },
  { value: "topup",    label: "Top-ups",          icon: <AccountBalanceWalletIcon sx={{ fontSize: 15 }} /> },
  { value: "charging", label: "Charging",          icon: <EvStationIcon sx={{ fontSize: 15 }} /> },
  { value: "refund",   label: "Refunds",           icon: <ReplayIcon sx={{ fontSize: 15 }} /> },
];

const CATEGORY_CFG = {
  topup:    { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", icon: <AccountBalanceWalletIcon sx={{ fontSize: 12 }} /> },
  charging: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", icon: <EvStationIcon sx={{ fontSize: 12 }} /> },
  refund:   { bg: "#fdf4ff", color: "#9333ea", border: "#e9d5ff", icon: <ReplayIcon sx={{ fontSize: 12 }} /> },
  other:    { bg: "#f9fafb", color: "#374151", border: "#e5e7eb", icon: <PaymentIcon sx={{ fontSize: 12 }} /> },
};

const STATUS_CFG = {
  SUCCESS: { bg: "#dcfce7", color: "#16a34a" },
  FAILED:  { bg: "#fee2e2", color: "#dc2626" },
};

const REFUND_SUB_CFG = {
  "Refund → Wallet": { bg: "#eff6ff", color: "#2563eb", icon: <AccountBalanceWalletIcon sx={{ fontSize: 12 }} />, label: "→ Wallet" },
  "Refund → Bank":   { bg: "#fdf4ff", color: "#7c3aed", icon: <AccountBalanceIcon sx={{ fontSize: 12 }} />,      label: "→ Bank"   },
  "Admin Credit":    { bg: "#f0fdf4", color: "#15803d", icon: <AdminPanelSettingsIcon sx={{ fontSize: 12 }} />,  label: "Credit"   },
  "Admin Debit":     { bg: "#fff7ed", color: "#c2410c", icon: <AdminPanelSettingsIcon sx={{ fontSize: 12 }} />,  label: "Debit"    },
};

const LIMIT = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAmt = v =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const fmtDate = d =>
  new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const fmtDateShort = d =>
  new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });

const avatarColor = (name = "") => {
  const c = ["#2563eb","#7c3aed","#db2777","#059669","#d97706","#dc2626","#0891b2"];
  return c[(name.charCodeAt(0) || 0) % c.length];
};
const initials = (name = "") =>
  name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPI({ label, value, color = "#1d4ed8" }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 2.5, border: "1px solid #e5e7eb", height: "100%" }}>
      <CardContent sx={{ p: "12px 14px !important" }}>
        <Typography fontSize={10} fontWeight={700} color="text.secondary"
          textTransform="uppercase" letterSpacing={0.6} noWrap>
          {label}
        </Typography>
        <Typography fontSize={20} fontWeight={800} color={color} lineHeight={1.2} mt={0.4}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── Detail Row (drawer) ──────────────────────────────────────────────────────

function DetailRow({ label, value, mono }) {
  if (value == null || value === "") return null;
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5} gap={2}>
      <Typography fontSize={12} color="text.secondary" flexShrink={0}>{label}</Typography>
      <Typography fontSize={12} fontWeight={600} textAlign="right"
        sx={mono ? { fontFamily: "monospace", wordBreak: "break-all" } : {}}>
        {value}
      </Typography>
    </Stack>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function TxnDrawer({ txn, onClose }) {
  if (!txn) return null;
  const cc  = CATEGORY_CFG[txn.category]  || CATEGORY_CFG.other;
  const sc  = STATUS_CFG[txn.status]      || { bg: "#f3f4f6", color: "#374151" };
  const rsc = REFUND_SUB_CFG[txn.subType];

  return (
    <Drawer
      anchor="right" open={!!txn} onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100vw", sm: 440 }, borderRadius: { xs: 0, sm: "16px 0 0 16px" } } }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <Box sx={{ p: 3, pb: 2, background: "linear-gradient(135deg,#1e293b,#0f172a)", color: "#fff" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography fontWeight={800} fontSize={17} mb={0.5}>Transaction Detail</Typography>
              <Chip
                icon={<Box sx={{ color: cc.color, display: "flex" }}>{cc.icon}</Box>}
                label={txn.subType}
                size="small"
                sx={{ bgcolor: cc.bg, color: cc.color, fontWeight: 700, fontSize: 11, height: 22 }}
              />
            </Box>
            <IconButton onClick={onClose} sx={{ color: "#fff", mt: -0.5 }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* Amount hero */}
          <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <Typography fontSize={11} color="rgba(255,255,255,0.5)" fontWeight={600} letterSpacing={0.5} mb={0.3}>
              AMOUNT
            </Typography>
            <Typography fontSize={30} fontWeight={900} color={txn.category === "refund" ? "#86efac" : "#67e8f9"}>
              {txn.category === "refund" ? "+" : "−"}{fmtAmt(txn.amount)}
            </Typography>
            <Stack direction="row" spacing={1} mt={0.8} flexWrap="wrap" gap={0.5}>
              <Chip label={txn.status} size="small"
                sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: 10, height: 20 }} />
              {rsc && (
                <Chip
                  icon={<Box sx={{ color: rsc.color, display: "flex" }}>{rsc.icon}</Box>}
                  label={txn.subType}
                  size="small"
                  sx={{ bgcolor: rsc.bg, color: rsc.color, fontWeight: 700, fontSize: 10, height: 20 }}
                />
              )}
            </Stack>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>

          {/* User */}
          <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5}
            sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e5e7eb" }}>
            <Avatar sx={{ bgcolor: avatarColor(txn.userName), width: 42, height: 42, fontSize: 14, fontWeight: 800 }}>
              {initials(txn.userName)}
            </Avatar>
            <Box>
              <Typography fontWeight={700} fontSize={14}>{txn.userName}</Typography>
              <Typography fontSize={12} color="text.secondary">{txn.userMobile}</Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 2 }}>
            <Typography fontSize={10} color="text.disabled" fontWeight={700} letterSpacing={0.5}>
              TRANSACTION INFO
            </Typography>
          </Divider>

          <DetailRow label="Date & Time"  value={fmtDate(txn.createdAt)} />
          <DetailRow label="Order ID"     value={txn.orderId}   mono />
          <DetailRow label="Session ID"   value={txn.sessionId} mono />
          <DetailRow label="Device ID"    value={txn.deviceId}  mono />
          <DetailRow label="Source"       value={txn.source === "wallet" ? "Wallet Ledger" : "Payment Gateway"} />
          <DetailRow label="Initiated By" value={txn.initiatedBy} />
          <DetailRow label="Description"  value={txn.description} />

          {txn.source === "payment" && (
            <>
              <Divider sx={{ my: 2 }}>
                <Typography fontSize={10} color="text.disabled" fontWeight={700} letterSpacing={0.5}>
                  PAYMENT DETAILS
                </Typography>
              </Divider>
              <DetailRow label="Gateway"        value={txn.gateway} />
              <DetailRow label="Payment Method" value={txn.paymentMethod} />
              <DetailRow label="Cashfree ID"    value={txn.cfPaymentId}   mono />
              <DetailRow label="Bank Reference" value={txn.bankReference} mono />
              <DetailRow label="Paid At"        value={txn.paidAt ? fmtDate(txn.paidAt) : null} />
              {txn.failureReason && (
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#fee2e2", border: "1px solid #fecaca", mt: 1 }}>
                  <Typography fontSize={11} fontWeight={700} color="#dc2626">Failure Reason</Typography>
                  <Typography fontSize={12} color="#b91c1c" mt={0.3}>{txn.failureReason}</Typography>
                </Box>
              )}
            </>
          )}

          {txn.source === "wallet" && (
            <>
              <Divider sx={{ my: 2 }}>
                <Typography fontSize={10} color="text.disabled" fontWeight={700} letterSpacing={0.5}>
                  BALANCE SNAPSHOT
                </Typography>
              </Divider>
              <DetailRow label="Balance Before" value={fmtAmt(txn.balanceBefore)} />
              <DetailRow label="Balance After"  value={fmtAmt(txn.balanceAfter)} />
            </>
          )}

          {txn.category === "refund" && rsc && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: rsc.bg, border: `1px solid ${rsc.color}44` }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ color: rsc.color, display: "flex" }}>{rsc.icon}</Box>
                <Typography fontSize={12} fontWeight={700} color={rsc.color}>
                  {txn.subType === "Refund → Wallet" && "Refunded directly to user's Sparx wallet"}
                  {txn.subType === "Refund → Bank"   && "Refunded to user's bank account via Cashfree"}
                  {txn.subType === "Admin Credit"    && "Manually credited by admin"}
                  {txn.subType === "Admin Debit"     && "Manually debited by admin"}
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: "1px solid #f1f5f9", bgcolor: "#fafafa" }}>
          <Button variant="outlined" fullWidth onClick={onClose}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}>
            Close
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton({ rows = 10 }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <TableRow key={i}>
          {[38, 80, 90, 70, 70, 90, 60, 60].map((w, j) => (
            <TableCell key={j} sx={{ py: 1.4 }}>
              <Skeleton width={w} height={16} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Sortable column header ───────────────────────────────────────────────────

function SortHeader({ label, field, sortField, sortDir, onSort, align = "left" }) {
  const active = sortField === field;
  return (
    <TableCell
      align={align}
      onClick={() => onSort(field)}
      sx={{
        cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
        fontWeight: 700, fontSize: 11, color: active ? "#2563eb" : "#6b7280",
        textTransform: "uppercase", letterSpacing: 0.5,
        bgcolor: "#f8fafc", borderBottom: "2px solid #e5e7eb",
        py: 1.5, px: 2,
        "&:hover": { color: "#2563eb" },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.3} justifyContent={align === "right" ? "flex-end" : "flex-start"}>
        <span>{label}</span>
        {active
          ? (sortDir === "asc" ? <NorthIcon sx={{ fontSize: 10 }} /> : <SouthIcon sx={{ fontSize: 10 }} />)
          : <SouthIcon sx={{ fontSize: 10, opacity: 0.25 }} />
        }
      </Stack>
    </TableCell>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TransactionsOverview() {
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down("sm"));

  const [tab,         setTab]         = useState("all");
  const [txns,        setTxns]        = useState([]);
  const [summary,     setSummary]     = useState({});
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [startDate,   setStartDate]   = useState("");
  const [endDate,     setEndDate]     = useState("");
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);
  const [selected,    setSelected]    = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField,   setSortField]   = useState("createdAt");
  const [sortDir,     setSortDir]     = useState("desc");

  const searchRef = useRef();

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab:    opts.tab    ?? tab,
        page:   opts.page   ?? page,
        limit:  LIMIT,
        search: opts.search !== undefined ? opts.search : search,
      });
      if (startDate) params.set("startDate", startDate);
      if (endDate)   params.set("endDate",   endDate);

      const res = await apiFetch(`/api/admin/transactions?${params.toString()}`);
      setTxns(res.transactions || []);
      setSummary(res.summary   || {});
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleTabChange = (_, v) => { setTab(v); setPage(1); load({ tab: v, page: 1 }); };
  const handleSearch    = v      => { setSearch(v); setPage(1); load({ search: v, page: 1 }); };
  const handleSort      = field  => {
    const newDir = sortField === field && sortDir === "desc" ? "asc" : "desc";
    setSortField(field); setSortDir(newDir);
  };

  // ─── Client-side sort of current page ─────────────────────────────────────
  const sorted = [...txns].sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (sortField === "createdAt") { va = new Date(va); vb = new Date(vb); }
    if (sortField === "amount")    { va = Number(va);   vb = Number(vb); }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ?  1 : -1;
    return 0;
  });

  // ─── Table column config ───────────────────────────────────────────────────
  // On mobile: hide device/gateway/session columns
  const showExtra = !isMobile;

  return (
    <Box sx={{
      maxWidth: 1600, mx: "auto",
      px: { xs: 1.5, sm: 3, md: 4 },
      py: { xs: 2, sm: 3 },
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── Page Header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={900} letterSpacing={-0.5}>Transactions</Typography>
          <Typography fontSize={13} color="text.secondary">
            All wallet &amp; payment activity · {totalCount.toLocaleString()} records
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Date filters">
            <IconButton
              onClick={() => setShowFilters(p => !p)}
              size="small"
              sx={{
                border: "1px solid #e5e7eb", borderRadius: 2,
                bgcolor: showFilters ? "#eff6ff" : "transparent",
              }}
            >
              <FilterListIcon fontSize="small" sx={{ color: showFilters ? "#2563eb" : "inherit" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={() => load()} size="small"
              sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── KPI Strip ── */}
      <Grid container spacing={1.5} mb={2.5}>
        {[
          { label: "Total",           value: (summary.total      || 0).toLocaleString(),                   color: "#1d4ed8" },
          { label: "Volume",          value: summary.totalAmount  ? fmtAmt(summary.totalAmount) : "₹0.00", color: "#059669" },
          { label: "Successful",      value: (summary.successCount|| 0).toLocaleString(),                  color: "#16a34a" },
          { label: "Failed",          value: (summary.failedCount || 0).toLocaleString(),                  color: "#dc2626" },
          { label: "Refund → Wallet", value: (summary.refundWallet|| 0).toLocaleString(),                  color: "#2563eb" },
          { label: "Refund → Bank",   value: (summary.refundBank  || 0).toLocaleString(),                  color: "#7c3aed" },
        ].map(k => (
          <Grid item xs={6} sm={4} md={2} key={k.label}>
            <KPI label={k.label} value={k.value} color={k.color} />
          </Grid>
        ))}
      </Grid>

      {/* ── Date Filters (collapsible) ── */}
      {showFilters && (
        <Card elevation={0} sx={{ borderRadius: 2.5, border: "1px solid #e5e7eb", mb: 2, p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField label="Start Date" type="date" size="small"
              value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
              InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
            <TextField label="End Date" type="date" size="small"
              value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
              InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
            <Button variant="outlined" size="small"
              onClick={() => { setStartDate(""); setEndDate(""); setPage(1); load({ page: 1 }); }}
              sx={{ borderRadius: 2, fontWeight: 600, textTransform: "none", minWidth: 70 }}>
              Clear
            </Button>
          </Stack>
        </Card>
      )}

      {/* ── Tabs + Search ── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}
        mb={1.5}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 34, flexShrink: 0,
            "& .MuiTab-root": { minHeight: 34, fontSize: 12, fontWeight: 600, textTransform: "none", py: 0.5, px: 1.5 },
            "& .MuiTabs-indicator": { backgroundColor: "#2563eb" },
            "& .Mui-selected": { color: "#2563eb !important" },
          }}
        >
          {TABS.map(t => (
            <Tab
              key={t.value} value={t.value}
              label={
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {t.icon}
                  <span>{isMobile ? t.label.split(" ")[0] : t.label}</span>
                </Stack>
              }
            />
          ))}
        </Tabs>

        <Box flex={1} />

        <TextField
          inputRef={searchRef}
          placeholder="Search name, phone, order ID…"
          size="small"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          sx={{ width: { xs: "100%", sm: 280 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      {/* ── Table ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3, border: "1px solid #e5e7eb", overflow: "hidden",
          mb: 2,
        }}
      >
        <TableContainer
          sx={{
            maxHeight: "calc(100vh - 360px)",
            overflowX: "auto",
            overflowY: "auto",
            // Smooth momentum scroll on iOS
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: isMobile ? 600 : 900 }}>

            {/* ── Table Head ── */}
            <TableHead>
              <TableRow>
                <SortHeader label="#"        field="_idx"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase",
                  letterSpacing: 0.5, bgcolor: "#f8fafc", borderBottom: "2px solid #e5e7eb", py: 1.5, px: 2, whiteSpace: "nowrap" }}>
                  User
                </TableCell>
                <SortHeader label="Type"     field="subType"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Amount"   field="amount"     sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase",
                  letterSpacing: 0.5, bgcolor: "#f8fafc", borderBottom: "2px solid #e5e7eb", py: 1.5, px: 2, whiteSpace: "nowrap" }}>
                  Status
                </TableCell>
                {showExtra && (
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase",
                    letterSpacing: 0.5, bgcolor: "#f8fafc", borderBottom: "2px solid #e5e7eb", py: 1.5, px: 2, whiteSpace: "nowrap" }}>
                    Order ID
                  </TableCell>
                )}
                {showExtra && (
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase",
                    letterSpacing: 0.5, bgcolor: "#f8fafc", borderBottom: "2px solid #e5e7eb", py: 1.5, px: 2, whiteSpace: "nowrap" }}>
                    Gateway
                  </TableCell>
                )}
                <SortHeader label="Date"     field="createdAt"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </TableRow>
            </TableHead>

            {/* ── Table Body ── */}
            <TableBody>
              {loading ? (
                <TableSkeleton rows={12} />
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showExtra ? 8 : 6} sx={{ textAlign: "center", py: 8 }}>
                    <ReceiptLongIcon sx={{ fontSize: 44, color: "#d1d5db", mb: 1 }} />
                    <Typography fontSize={14} fontWeight={600} color="text.secondary">
                      No transactions found
                    </Typography>
                    <Typography fontSize={12} color="text.disabled" mt={0.5}>
                      Try a different tab, search term, or date range
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((txn, idx) => {
                  const cc  = CATEGORY_CFG[txn.category] || CATEGORY_CFG.other;
                  const sc  = STATUS_CFG[txn.status]     || { bg: "#f3f4f6", color: "#374151" };
                  const rsc = REFUND_SUB_CFG[txn.subType];
                  const rowNum = (page - 1) * LIMIT + idx + 1;
                  const isRefund = txn.category === "refund";

                  return (
                    <TableRow
                      key={String(txn._id)}
                      hover
                      onClick={() => setSelected(txn)}
                      sx={{
                        cursor: "pointer",
                        transition: "background 0.12s",
                        "&:hover": { bgcolor: "#f0f7ff" },
                        "&:last-child td": { border: 0 },
                        // Striped rows
                        bgcolor: idx % 2 === 0 ? "#fff" : "#fafafa",
                      }}
                    >
                      {/* # */}
                      <TableCell sx={{ px: 2, py: 1.2, color: "#9ca3af", fontSize: 11, fontWeight: 500 }}>
                        {rowNum}
                      </TableCell>

                      {/* User */}
                      <TableCell sx={{ px: 2, py: 1.2 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar
                            sx={{
                              bgcolor: avatarColor(txn.userName),
                              width: 28, height: 28,
                              fontSize: 10, fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {initials(txn.userName)}
                          </Avatar>
                          <Box minWidth={0}>
                            <Typography fontSize={12} fontWeight={700} noWrap sx={{ maxWidth: 130 }}>
                              {txn.userName}
                            </Typography>
                            <Typography fontSize={10} color="text.secondary" noWrap>
                              {txn.userMobile}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Type */}
                      <TableCell sx={{ px: 2, py: 1.2 }}>
                        <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="nowrap">
                          <Chip
                            icon={<Box sx={{ color: cc.color, display: "flex" }}>{cc.icon}</Box>}
                            label={isMobile
                              ? (txn.category === "topup" ? "Topup" : txn.category === "charging" ? "Charge" : "Refund")
                              : txn.subType
                            }
                            size="small"
                            sx={{
                              bgcolor: cc.bg, color: cc.color,
                              border: `1px solid ${cc.border}`,
                              fontWeight: 600, fontSize: 10, height: 20,
                              maxWidth: 160,
                            }}
                          />
                          {/* Refund sub-badge */}
                          {rsc && !isMobile && (
                            <Chip
                              icon={<Box sx={{ color: rsc.color, display: "flex" }}>{rsc.icon}</Box>}
                              label={rsc.label}
                              size="small"
                              sx={{ bgcolor: rsc.bg, color: rsc.color, fontWeight: 700, fontSize: 9, height: 18 }}
                            />
                          )}
                        </Stack>
                      </TableCell>

                      {/* Amount */}
                      <TableCell align="right" sx={{ px: 2, py: 1.2 }}>
                        <Typography
                          fontSize={13} fontWeight={800}
                          color={
                            isRefund               ? "#9333ea"
                            : txn.status === "FAILED" ? "#dc2626"
                            : "#111827"
                          }
                          sx={{ fontFamily: "'Inter', monospace" }}
                        >
                          {isRefund ? "+" : "−"}{fmtAmt(txn.amount)}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ px: 2, py: 1.2 }}>
                        <Chip
                          label={txn.status}
                          size="small"
                          sx={{
                            bgcolor: sc.bg, color: sc.color,
                            fontWeight: 700, fontSize: 10, height: 20,
                          }}
                        />
                      </TableCell>

                      {/* Order ID */}
                      {showExtra && (
                        <TableCell sx={{ px: 2, py: 1.2 }}>
                          <Tooltip title={txn.orderId || "—"} placement="top">
                            <Typography
                              fontSize={11}
                              color="text.secondary"
                              sx={{
                                fontFamily: "monospace",
                                maxWidth: 140, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}
                            >
                              {txn.orderId
                                ? txn.orderId.length > 16
                                  ? `${txn.orderId.slice(0, 8)}…${txn.orderId.slice(-6)}`
                                  : txn.orderId
                                : "—"
                              }
                            </Typography>
                          </Tooltip>
                        </TableCell>
                      )}

                      {/* Gateway */}
                      {showExtra && (
                        <TableCell sx={{ px: 2, py: 1.2 }}>
                          <Typography fontSize={11} color="text.secondary" textTransform="capitalize">
                            {txn.gateway || txn.source || "—"}
                          </Typography>
                        </TableCell>
                      )}

                      {/* Date */}
                      <TableCell sx={{ px: 2, py: 1.2 }}>
                        <Typography fontSize={11} color="text.secondary" whiteSpace="nowrap">
                          {isMobile ? fmtDateShort(txn.createdAt) : fmtDate(txn.createdAt)}
                        </Typography>
                      </TableCell>

                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Table Footer / Pagination ── */}
        {!loading && sorted.length > 0 && (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              px: 2.5, py: 1.5,
              borderTop: "1px solid #e5e7eb",
              bgcolor: "#f8fafc",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography fontSize={12} color="text.secondary">
              Showing <strong>{(page - 1) * LIMIT + 1}</strong>–<strong>{Math.min(page * LIMIT, totalCount)}</strong> of{" "}
              <strong>{totalCount.toLocaleString()}</strong> transactions
            </Typography>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton
                size="small"
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); load({ page: p }); }}
                sx={{ border: "1px solid #e5e7eb", borderRadius: 1.5 }}
              >
                <KeyboardArrowLeftIcon fontSize="small" />
              </IconButton>

              {/* Page number pills */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p;
                if (totalPages <= 5) {
                  p = i + 1;
                } else if (page <= 3) {
                  p = i + 1;
                } else if (page >= totalPages - 2) {
                  p = totalPages - 4 + i;
                } else {
                  p = page - 2 + i;
                }
                return (
                  <Box
                    key={p}
                    onClick={() => { setPage(p); load({ page: p }); }}
                    sx={{
                      width: 28, height: 28,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: p === page ? "#2563eb" : "#e5e7eb",
                      bgcolor: p === page ? "#2563eb" : "transparent",
                      color: p === page ? "#fff" : "#374151",
                      fontSize: 12, fontWeight: p === page ? 800 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": { bgcolor: p === page ? "#1d4ed8" : "#eff6ff", borderColor: "#2563eb" },
                    }}
                  >
                    {p}
                  </Box>
                );
              })}

              <IconButton
                size="small"
                disabled={page >= totalPages}
                onClick={() => { const p = page + 1; setPage(p); load({ page: p }); }}
                sx={{ border: "1px solid #e5e7eb", borderRadius: 1.5 }}
              >
                <KeyboardArrowRightIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        )}
      </Paper>

      {/* ── Detail Drawer ── */}
      <TxnDrawer txn={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}