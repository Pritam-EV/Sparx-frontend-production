// src/features/accountant/AccountantDashboard.js
// Standalone dashboard for CA / Accountant — accessed via /ca route.
// No admin sidebar — self-contained layout.

import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Grid, Card, CardContent, Typography, Tab, Tabs,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Button, TextField,
  MenuItem, Select, FormControl, InputLabel,
  CircularProgress, Pagination, Divider, Stack,
  IconButton, Tooltip, AppBar, Toolbar,
} from "@mui/material";
import DownloadIcon      from "@mui/icons-material/Download";
import LogoutIcon        from "@mui/icons-material/Logout";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ReceiptLongIcon   from "@mui/icons-material/ReceiptLong";
import ArrowUpwardIcon   from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RefreshIcon       from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const PERIODS = [
  { label: "Today",         value: "today" },
  { label: "This Week",     value: "week" },
  { label: "This Month",    value: "month" },
  { label: "Last Month",    value: "last_month" },
  { label: "This Quarter",  value: "quarter" },
  { label: "Financial Year",value: "fy" },
  { label: "Calendar Year", value: "year" },
  { label: "GST Month",     value: "gst_month" },
];

// Generate last 18 GST months as "YYYY-MM"
const GST_MONTHS = (() => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const lab = d.toLocaleString("en-IN", { month: "long", year: "numeric" });
    months.push({ value: val, label: lab });
  }
  return months;
})();

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon, color = "#1e3a5f" }) => (
  <Card sx={{ borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", height: "100%" }}>
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color }}>
            {value}
          </Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
        <Box sx={{ bgcolor: `${color}18`, borderRadius: 2, p: 1, color }}>{icon}</Box>
      </Stack>
    </CardContent>
  </Card>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AccountantDashboard() {
  const navigate = useNavigate();

  // Period state
  const [period,   setPeriod]   = useState("month");
  const [gstMonth, setGstMonth] = useState(GST_MONTHS[0].value);

  // Tab: 0=Overview, 1=Topups, 2=Debits, 3=Invoices
  const [tab, setTab] = useState(0);

  // Data
  const [summary,  setSummary]  = useState(null);
  const [topups,   setTopups]   = useState({ data: [], total: 0, totalPages: 1 });
  const [debits,   setDebits]   = useState({ data: [], total: 0, totalPages: 1 });
  const [invoices, setInvoices] = useState({ data: [], total: 0, totalPages: 1, periodTotals: {} });

  // Pagination
  const [topupPage,   setTopupPage]   = useState(1);
  const [debitPage,   setDebitPage]   = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);

  // Search
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Build query params
  const periodParams = useCallback(() => {
    if (period === "gst_month") return `period=gst_month&gst_month=${gstMonth}`;
    return `period=${period}`;
  }, [period, gstMonth]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/accountant/summary?${periodParams()}`);
      setSummary(data);
    } catch (e) { console.error(e); }
  }, [periodParams]);

  // Fetch topups
  const fetchTopups = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get(`/api/accountant/wallet-topups?${periodParams()}&page=${page}&limit=20`);
      setTopups(data);
    } catch (e) { console.error(e); }
  }, [periodParams]);

  // Fetch debits
  const fetchDebits = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get(`/api/accountant/wallet-debits?${periodParams()}&page=${page}&limit=20`);
      setDebits(data);
    } catch (e) { console.error(e); }
  }, [periodParams]);

  // Fetch invoices
  const fetchInvoices = useCallback(async (page = 1, search = "") => {
    try {
      const sq = search ? `&search=${encodeURIComponent(search)}` : "";
      const { data } = await api.get(`/api/accountant/invoices?${periodParams()}&page=${page}&limit=20${sq}`);
      setInvoices(data);
    } catch (e) { console.error(e); }
  }, [periodParams]);

  // Reload everything when period changes
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchSummary(),
      fetchTopups(1),
      fetchDebits(1),
      fetchInvoices(1),
    ]).finally(() => setLoading(false));
    setTopupPage(1); setDebitPage(1); setInvoicePage(1);
  }, [fetchSummary, fetchTopups, fetchDebits, fetchInvoices]);

  // Excel export
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/api/accountant/export?${periodParams()}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement("a");
      a.href    = url;
      a.download = `Sparx_CA_${period === "gst_month" ? gstMonth : period}_${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error("Export failed", e); }
    setExporting(false);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ── Period Selector Bar ────────────────────────────────────────────────────
  const PeriodBar = () => (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Period</InputLabel>
        <Select value={period} label="Period" onChange={e => { setPeriod(e.target.value); }}>
          {PERIODS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
        </Select>
      </FormControl>

      {period === "gst_month" && (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>GST Month</InputLabel>
          <Select value={gstMonth} label="GST Month" onChange={e => setGstMonth(e.target.value)}>
            {GST_MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
      )}

      <Tooltip title="Refresh data">
        <IconButton onClick={() => {
          setLoading(true);
          Promise.all([fetchSummary(), fetchTopups(topupPage), fetchDebits(debitPage), fetchInvoices(invoicePage, invoiceSearch)])
            .finally(() => setLoading(false));
        }}>
          <RefreshIcon />
        </IconButton>
      </Tooltip>

      <Box sx={{ flex: 1 }} />

      <Button
        variant="contained"
        startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
        disabled={exporting}
        onClick={handleExport}
        sx={{ bgcolor: "#1e3a5f", "&:hover": { bgcolor: "#0f2544" }, borderRadius: 2, fontWeight: 600 }}
      >
        {exporting ? "Exporting…" : "Download Excel (GST Report)"}
      </Button>
    </Stack>
  );

  // ── Overview Tab ──────────────────────────────────────────────────────────
  const OverviewTab = () => {
    if (!summary) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
    const { walletTopups: wt, walletDebits: wd, refunds, walletFloat, invoices: inv } = summary;
    return (
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Wallet Topups"     value={fmt(wt?.total)}   sub={`${wt?.count || 0} transactions`}  icon={<ArrowUpwardIcon />}    color="#1e5631" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Charging Debits"   value={fmt(wd?.total)}   sub={`${wd?.count || 0} sessions`}       icon={<ArrowDownwardIcon />}  color="#7b2d00" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Refunds Issued"    value={fmt(refunds?.total)} sub={`${refunds?.count || 0} refunds`} icon={<AccountBalanceIcon />} color="#5c3d1e" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Wallet Float (All Time)" value={fmt(walletFloat)} sub="Total unspent wallet balance" icon={<AccountBalanceIcon />} color="#1e3a5f" />
        </Grid>

        <Grid item xs={12}><Divider sx={{ my: 0.5 }}><Typography variant="caption" color="text.secondary">Invoice / Revenue Breakdown</Typography></Divider></Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Gross Revenue"   value={fmt(inv?.grossRevenue)}  sub={`${inv?.count || 0} invoices`} icon={<ReceiptLongIcon />}    color="#1e3a5f" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Taxable Amount"  value={fmt(inv?.taxableAmount)} sub="Pre-GST"                       icon={<ReceiptLongIcon />}    color="#4a235a" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="GST Collected"   value={fmt(inv?.gstCollected)}  sub="CGST + SGST / IGST 18%"        icon={<AccountBalanceIcon />} color="#1e5631" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Discounts Given" value={fmt(inv?.discounts)}     sub="Coupon deductions"              icon={<ArrowDownwardIcon />}  color="#856404" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Platform Margin (VJRA)" value={fmt(inv?.vjraMargin)}  sub="Commission earned"       icon={<AccountBalanceIcon />} color="#0d4f73" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="PG Charges"      value={fmt(inv?.pgCharges)}     sub="Cashfree gateway cost"          icon={<ArrowDownwardIcon />}  color="#721c24" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Owner Payouts"   value={fmt(inv?.ownerPayouts)}  sub="Paid to charger owners"         icon={<ArrowUpwardIcon />}    color="#1e5631" />
        </Grid>
      </Grid>
    );
  };

  // ── Wallet Topups Tab ────────────────────────────────────────────────────────
  const TopupsTab = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {topups.total} topup transactions
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e5631" }}>
          Total: {fmt(topups.data.reduce((s, t) => s + t.amount, 0))}
        </Typography>
      </Stack>
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "#1e5631" }}>
            <TableRow>
              {["Date", "Customer", "Mobile", "Email", "Amount", "Balance Before", "Balance After", "Cashfree Order ID"].map(h => (
                <TableCell key={h} sx={{ color: "#fff", fontWeight: 700, whiteSpace: "nowrap", fontSize: 12 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {topups.data.length === 0
              ? <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>No topup transactions in this period</TableCell></TableRow>
              : topups.data.map((t, i) => (
                <TableRow key={t._id} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#f8faf8" }}>
                  <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(t.date)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{t.userName}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{t.userMobile}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{t.userEmail}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#1e5631", fontSize: 12 }}>{fmt(t.amount)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmt(t.balanceBefore)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmt(t.balanceAfter)}</TableCell>
                  <TableCell sx={{ fontSize: 11, fontFamily: "monospace", color: "text.secondary" }}>{t.orderId}</TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </TableContainer>
      {topups.totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination count={topups.totalPages} page={topupPage} onChange={(_, p) => { setTopupPage(p); fetchTopups(p); }} color="primary" />
        </Box>
      )}
    </Box>
  );

  // ── Charging Debits Tab ───────────────────────────────────────────────────────
  const DebitsTab = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">{debits.total} debit transactions</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#7b2d00" }}>
          Total: {fmt(debits.data.reduce((s, d) => s + d.amount, 0))}
        </Typography>
      </Stack>
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "#7b2d00" }}>
            <TableRow>
              {["Date", "Customer", "Mobile", "Amount", "Balance Before", "Balance After", "Session ID", "Description"].map(h => (
                <TableCell key={h} sx={{ color: "#fff", fontWeight: 700, whiteSpace: "nowrap", fontSize: 12 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {debits.data.length === 0
              ? <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>No debit transactions in this period</TableCell></TableRow>
              : debits.data.map((d, i) => (
                <TableRow key={d._id} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#fdf8f7" }}>
                  <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(d.date)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{d.userName}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{d.userMobile}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#7b2d00", fontSize: 12 }}>{fmt(d.amount)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmt(d.balanceBefore)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmt(d.balanceAfter)}</TableCell>
                  <TableCell sx={{ fontSize: 11, fontFamily: "monospace", color: "text.secondary" }}>{d.sessionId}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{d.description}</TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </TableContainer>
      {debits.totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination count={debits.totalPages} page={debitPage} onChange={(_, p) => { setDebitPage(p); fetchDebits(p); }} color="primary" />
        </Box>
      )}
    </Box>
  );

  // ── Invoice Register Tab ──────────────────────────────────────────────────────
  const InvoicesTab = () => {
    const pt = invoices.periodTotals || {};
    return (
      <Box>
        {/* Period totals strip */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: "#f0f4ff", borderRadius: 2, border: "1px solid #dce6f1" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} flexWrap="wrap">
            {[
              ["Taxable", fmt(pt.taxableAmount)],
              ["GST",     fmt(pt.gstAmount)],
              ["Total",   fmt(pt.totalAmount)],
              ["Discounts", fmt(pt.discounts)],
              ["Refunds",   fmt(pt.refunds)],
              ["VJRA Margin", fmt(pt.vjraMargin)],
              ["PG Charges",  fmt(pt.pgCharges)],
            ].map(([l, v]) => (
              <Box key={l}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: 10 }}>{l}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{v}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems="center">
          <TextField
            size="small"
            placeholder="Search invoice, name, mobile…"
            value={invoiceSearch}
            onChange={e => setInvoiceSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchInvoices(1, invoiceSearch)}
            sx={{ width: 280 }}
          />
          <Button variant="outlined" size="small" onClick={() => { setInvoicePage(1); fetchInvoices(1, invoiceSearch); }}>
            Search
          </Button>
          <Typography variant="caption" color="text.secondary">{invoices.total} invoices</Typography>
        </Stack>

        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 1200 }}>
            <TableHead sx={{ bgcolor: "#1e3a5f" }}>
              <TableRow>
                {["Invoice No.", "Date", "Customer", "Mobile", "GSTIN", "Place of Supply", "Type", "Energy (kWh)", "Taxable (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Discount", "Total (₹)", "Paid (₹)", "Refund"].map(h => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 700, whiteSpace: "nowrap", fontSize: 11 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.data.length === 0
                ? <TableRow><TableCell colSpan={16} align="center" sx={{ py: 4, color: "text.secondary" }}>No invoices in this period</TableCell></TableRow>
                : invoices.data.map((inv, i) => (
                  <TableRow key={inv.invoiceNo} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#f7f9fc" }}>
                    <TableCell sx={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>{inv.invoiceNo}</TableCell>
                    <TableCell sx={{ fontSize: 11, whiteSpace: "nowrap" }}>{fmtDate(inv.date)}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{inv.customerName}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{inv.customerMobile}</TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: "monospace" }}>{inv.customerGstin || <Typography variant="caption" color="text.disabled">B2C</Typography>}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{inv.placeOfSupply}</TableCell>
                    <TableCell>
                      <Chip label={inv.invoiceType} size="small" sx={{ fontSize: 10, bgcolor: inv.invoiceType === "B2B" ? "#e8f4fd" : "#f0f7f0", color: inv.invoiceType === "B2B" ? "#0d4f73" : "#1e5631", fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{inv.energykWh?.toFixed(3)}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{fmt(inv.taxableAmount)}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: inv.cgst > 0 ? "#1e3a5f" : "text.disabled" }}>{inv.cgst > 0 ? fmt(inv.cgst) : "—"}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: inv.sgst > 0 ? "#1e3a5f" : "text.disabled" }}>{inv.sgst > 0 ? fmt(inv.sgst) : "—"}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: inv.igst > 0 ? "#4a235a" : "text.disabled" }}>{inv.igst > 0 ? fmt(inv.igst) : "—"}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: inv.discount > 0 ? "#856404" : "text.disabled" }}>{inv.discount > 0 ? fmt(inv.discount) : "—"}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{fmt(inv.totalAmount)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt(inv.amountPaid)}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: inv.refund > 0 ? "#7b2d00" : "text.disabled" }}>{inv.refund > 0 ? fmt(inv.refund) : "—"}</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
        {invoices.totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination count={invoices.totalPages} page={invoicePage} onChange={(_, p) => { setInvoicePage(p); fetchInvoices(p, invoiceSearch); }} color="primary" />
          </Box>
        )}
      </Box>
    );
  };

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f6f7f9" }}>
      {/* Top bar */}
      <AppBar position="sticky" sx={{ bgcolor: "#1e3a5f", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <Toolbar>
          <AccountBalanceIcon sx={{ mr: 1.5, fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, letterSpacing: 0.5, fontSize: 16 }}>
            Sparx EV — Accountant Portal
          </Typography>
          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={handleLogout}><LogoutIcon /></IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1600, mx: "auto", px: { xs: 1.5, sm: 3 }, py: 3 }}>
        {/* Title row */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e3a5f" }}>Financial Dashboard</Typography>
            <Typography variant="caption" color="text.secondary">Read-only access — GST filing, reconciliation &amp; record keeping</Typography>
          </Box>
          {loading && <CircularProgress size={24} />}
        </Stack>

        {/* Period selector + Export */}
        <PeriodBar />

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
            "& .MuiTab-root": { fontWeight: 600, fontSize: 13 },
            "& .Mui-selected": { color: "#1e3a5f !important" },
            "& .MuiTabs-indicator": { bgcolor: "#1e3a5f" }
          }}>
            <Tab label="Overview" />
            <Tab label={`Wallet Topups${topups.total ? ` (${topups.total})` : ""}`} />
            <Tab label={`Charging Debits${debits.total ? ` (${debits.total})` : ""}`} />
            <Tab label={`Invoice Register${invoices.total ? ` (${invoices.total})` : ""}`} />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        {tab === 0 && <OverviewTab />}
        {tab === 1 && <TopupsTab />}
        {tab === 2 && <DebitsTab />}
        {tab === 3 && <InvoicesTab />}
      </Box>
    </Box>
  );
}