// src/features/owner/OwnerReports.js

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountBalanceIcon   from "@mui/icons-material/AccountBalance";
import AssessmentIcon       from "@mui/icons-material/Assessment";
import CheckCircleIcon      from "@mui/icons-material/CheckCircle";
import ContentCopyIcon      from "@mui/icons-material/ContentCopy";
import DownloadIcon         from "@mui/icons-material/Download";
import ElectricBoltIcon     from "@mui/icons-material/ElectricBolt";
import HourglassEmptyIcon   from "@mui/icons-material/HourglassEmpty";
import PictureAsPdfIcon     from "@mui/icons-material/PictureAsPdf";
import RefreshIcon          from "@mui/icons-material/Refresh";
import TableChartIcon       from "@mui/icons-material/TableChart";
import TrendingUpIcon       from "@mui/icons-material/TrendingUp";
import PaymentsIcon         from "@mui/icons-material/Payments";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const MONTHS = [
  { value: 1,  label: "January"   },
  { value: 2,  label: "February"  },
  { value: 3,  label: "March"     },
  { value: 4,  label: "April"     },
  { value: 5,  label: "May"       },
  { value: 6,  label: "June"      },
  { value: 7,  label: "July"      },
  { value: 8,  label: "August"    },
  { value: 9,  label: "September" },
  { value: 10, label: "October"   },
  { value: 11, label: "November"  },
  { value: 12, label: "December"  },
];

const CURRENT_YEAR  = new Date().getFullYear();
const YEARS         = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// ── Sample VJRA bank account (replace when live) ──────────────────────────────
const VJRA_BANK = {
  accountName:   "Vjra Technologies LLP",
  bankName:      "HDFC Bank",
  accountNumber: "XXXXXXXXXXXX1234",
  ifsc:          "HDFC0001234",
  accountType:   "Current Account",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const monthLabel = (m, y) =>
  `${MONTHS.find((x) => x.value === m)?.label} ${y}`;

/** Get userId from stored JWT */
const getUserId = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).userId;
  } catch {
    return null;
  }
};

/** Authenticated fetch */
const authFetch = async (url) => {
  const token = localStorage.getItem("token");
  const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json  = await res.json();
  if (!res.ok) throw new Error(json?.error || json?.message || "Request failed");
  return json;
};

/** Download blob as file */
const downloadBlob = (blob, filename) => {
  const a     = document.createElement("a");
  a.href      = URL.createObjectURL(blob);
  a.download  = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single label↔value row used in breakdown tables */
function BreakdownRow({ label, value, highlight, debit, note }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 1.5,
        py: 1,
        bgcolor: highlight ? "#f0fdfd" : debit ? "#fef2f2" : "#f9fafb",
        borderRadius: 1.5,
        mb: 0.5,
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 13, color: debit ? "#dc2626" : "#334155", fontWeight: 500, fontFamily: FONT }}>
          {label}
        </Typography>
        {note && (
          <Typography sx={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>{note}</Typography>
        )}
      </Box>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 700,
          color: highlight ? "#0f766e" : debit ? "#dc2626" : "#000",
          fontFamily: FONT,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/** Section heading label */
function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
        color: "#94a3b8",
        mb: 1,
        mt: 0.5,
        fontFamily: FONT,
      }}
    >
      {children}
    </Typography>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OwnerReports() {
  // ── Period filter ──
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year,  setYear]  = useState(CURRENT_YEAR);

  // ── Report data ──
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  // ── Record Payment dialog ──
  const [payDialog,    setPayDialog]    = useState(false);
  const [txnId,        setTxnId]        = useState("");
  const [amountPaid,   setAmountPaid]   = useState("");
  const [payLoading,   setPayLoading]   = useState(false);
  const [payErr,       setPayErr]       = useState(null);
  const [paySuccess,   setPaySuccess]   = useState(false);

  // ── Snackbar ──
  const [snack, setSnack] = useState({ open: false, msg: "" });

  // ── Download loading states ──
  const [dlExcel,  setDlExcel]  = useState(false);
  const [dlPdf,    setDlPdf]    = useState(false);
  const [dlEbPdf,  setDlEbPdf]  = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch report for selected month/year
  // ─────────────────────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      setLoading(true);
      setErr(null);
      setReport(null);

      const base = process.env.REACT_APP_Backend_API_Base_URL;
      const data = await authFetch(
        `${base}/api/owner/reports?ownerId=${userId}&month=${month}&year=${year}`
      );
      setReport(data);
    } catch (e) {
      setErr(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ─────────────────────────────────────────────────────────────────────────
  // Record owner payment to VJRA
  // ─────────────────────────────────────────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!txnId.trim() || !amountPaid) {
      setPayErr("Transaction ID and amount are required.");
      return;
    }

    try {
      setPayLoading(true);
      setPayErr(null);

      const userId = getUserId();
      const token  = localStorage.getItem("token");
      const base   = process.env.REACT_APP_Backend_API_Base_URL;

      const res = await fetch(`${base}/api/owner/reports/payment`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          ownerId:       userId,
          month,
          year,
          transactionId: txnId.trim(),
          amountPaid:    Number(amountPaid),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || result?.message || "Failed to record payment");

      setPaySuccess(true);
      // Refresh report after 1.5s and close
      setTimeout(() => {
        setPayDialog(false);
        setPaySuccess(false);
        setTxnId("");
        setAmountPaid("");
        fetchReport();
      }, 1600);
    } catch (e) {
      setPayErr(e.message || "Failed to record payment");
    } finally {
      setPayLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Download Excel (CSV) — build client-side from report data
  // ─────────────────────────────────────────────────────────────────────────
  const handleDownloadExcel = async () => {
    if (!report?.reportData) return;

    try {
      setDlExcel(true);
      const r = report.reportData;
      const eb = report.ebData || {};

      // Build CSV rows
      const rows = [
        ["Sparx EV – Monthly Report"],
        [`Period: ${monthLabel(month, year)}`],
        [`Owner: ${report.ownerName || "—"}`],
        [`Project: ${report.projectName || "—"}`],
        [],
        ["ELECTRICITY BILL BREAKDOWN (MSEB)"],
        ["Charge", "Amount (₹)"],
        ["Wheeling Charges",    eb.wheelingCharges ?? 0],
        ["Demand Charges",      eb.demandCharges   ?? 0],
        ["Energy Charges",      eb.energyCharges   ?? 0],
        ["FAC",                 eb.fac             ?? 0],
        ["Fixed Charges",       eb.fixedCharges    ?? 0],
        ...(eb.otherCharges || []).map((o) => [o.label, o.amount]),
        ["TOTAL MSEB BILL",     eb.totalBillAmount ?? 0],
        [],
        ["MONTHLY REPORT"],
        ["Item",                "Amount (₹)"],
        ["Total Revenue (incl. GST)",  r.grossRevenue       ?? 0],
        ["GST (18%)",                  r.gstAmount          ?? 0],
        ["Energy Charges (VJRA bears)", r.energyChargesVjra ?? 0],
        ["Fixed Charges (Owner bears)", r.fixedChargesOwner ?? 0],
        ["VJRA Commission",            r.vjraCommission     ?? 0],
        ["Net Payout to Owner",        r.netPayout          ?? 0],
        [],
        ["Amount Owner Owes VJRA",     report.amountOwnerOwesVjra ?? 0],
        ["Payment Status",             report.paymentStatus       ?? "Pending"],
      ];

      const csv     = rows.map((r) => r.join(",")).join("\n");
      const blob    = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `Sparx_Report_${monthLabel(month, year).replace(" ", "_")}.csv`);
      setSnack({ open: true, msg: "Excel (CSV) downloaded!" });
    } catch {
      setSnack({ open: true, msg: "Download failed. Please try again." });
    } finally {
      setDlExcel(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Download Report PDF — calls backend endpoint
  // ─────────────────────────────────────────────────────────────────────────
  const handleDownloadReportPdf = async () => {
    try {
      setDlPdf(true);
      const userId = getUserId();
      const token  = localStorage.getItem("token");
      const base   = process.env.REACT_APP_Backend_API_Base_URL;

      const res = await fetch(
        `${base}/api/owner/reports/pdf?ownerId=${userId}&month=${month}&year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      downloadBlob(blob, `Sparx_Report_${monthLabel(month, year).replace(" ", "_")}.pdf`);
      setSnack({ open: true, msg: "Report PDF downloaded!" });
    } catch {
      setSnack({ open: true, msg: "PDF download failed. Please try again." });
    } finally {
      setDlPdf(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Download EB PDF — direct link from report.ebData.pdfUrl
  // ─────────────────────────────────────────────────────────────────────────
  const handleDownloadEbPdf = async () => {
    const pdfUrl = report?.ebData?.pdfUrl;
    if (!pdfUrl) return;
    try {
      setDlEbPdf(true);
      const token = localStorage.getItem("token");
      const res   = await fetch(pdfUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch EB PDF");
      const blob = await res.blob();
      downloadBlob(blob, `EB_${monthLabel(month, year).replace(" ", "_")}.pdf`);
      setSnack({ open: true, msg: "EB PDF downloaded!" });
    } catch {
      // Fallback: open in new tab
      window.open(pdfUrl, "_blank");
    } finally {
      setDlEbPdf(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Copy bank detail to clipboard
  // ─────────────────────────────────────────────────────────────────────────
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() =>
      setSnack({ open: true, msg: `${label} copied!` })
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived state
  // ─────────────────────────────────────────────────────────────────────────
  const status      = report?.status;          // "NO_DATA" | "EB_UPLOADED" | "EB_PROCESSED"
  const eb          = report?.ebData   || {};
  const rd          = report?.reportData || {};
  const hasReport   = status === "EB_PROCESSED";
  const hasEB       = status === "EB_UPLOADED" || hasReport;

  const selectSx = {
    bgcolor: "#f9fafb",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: FONT,
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#04BFBF" },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 780, mx: "auto", py: 3, px: { xs: 2, md: 3 }, fontFamily: FONT }}>

      {/* ── Page Header ───────────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 26 }, color: "#000", letterSpacing: "-0.5px", fontFamily: FONT }}>
            Reports
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: 12, fontFamily: FONT }}>
            Monthly EB breakdown and revenue payout statement
          </Typography>
        </Box>

        <Tooltip title="Refresh" arrow>
          <IconButton
            onClick={fetchReport}
            disabled={loading}
            size="small"
            sx={{
              bgcolor: "#04BFBF", color: "#fff", width: 32, height: 32,
              "&:hover": { bgcolor: "#03a6a6", transform: "rotate(180deg)" },
              "&:disabled": { bgcolor: "#cbd5e1" },
              transition: "all 0.4s",
            }}
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── Month/Year Picker ─────────────────────────────────────── */}
      <Card sx={cardSx} mb={0}>
        <CardContent sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 155 }}>
              <Select value={month} onChange={(e) => setMonth(e.target.value)} sx={selectSx}>
                {MONTHS.map((m) => (
                  <MenuItem key={m.value} value={m.value} sx={{ fontSize: 13 }}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select value={year} onChange={(e) => setYear(e.target.value)} sx={selectSx}>
                {YEARS.map((y) => (
                  <MenuItem key={y} value={y} sx={{ fontSize: 13 }}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {report?.projectName && (
              <Typography sx={{ fontSize: 12, color: "#64748b", fontFamily: FONT }}>
                📍 {report.projectName}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* ── Loading ───────────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10 }}>
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={40} thickness={4} sx={{ color: "#04BFBF" }} />
            <Typography sx={{ fontSize: 13, color: "#64748b", fontFamily: FONT }}>
              Loading report for {monthLabel(month, year)}…
            </Typography>
          </Stack>
        </Box>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {!loading && err && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2, fontFamily: FONT }}>{err}</Alert>
      )}

      {/* ══════════════════════════════════════════════════════════
          STATE 1 — No EB data uploaded yet
      ══════════════════════════════════════════════════════════ */}
      {!loading && !err && status === "NO_DATA" && (
        <Card sx={{ ...cardSx, mt: 2 }}>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <HourglassEmptyIcon sx={{ fontSize: 52, color: "#04BFBF", mb: 1.5 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 17, color: "#000", mb: 0.5, fontFamily: FONT }}>
              EB Not Yet Generated
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: 13, maxWidth: 340, mx: "auto", fontFamily: FONT }}>
              This month's Electricity Bill has not been uploaded by the admin yet.
              Please check back once the MSEB bill for{" "}
              <strong>{monthLabel(month, year)}</strong> is processed.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          STATE 2 & 3 — EB uploaded (show breakdown + payment)
      ══════════════════════════════════════════════════════════ */}
      {!loading && !err && hasEB && (
        <Stack spacing={2.5} mt={2.5}>

          {/* ── Section A: EB Breakdown ────────────────────────── */}
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <ElectricBoltIcon sx={{ fontSize: 20, color: "#04BFBF" }} />
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: "#000", fontFamily: FONT }}>
                  MSEB Electricity Bill — {monthLabel(month, year)}
                </Typography>
              </Stack>

              <SectionLabel>Charge Breakdown</SectionLabel>

              <BreakdownRow label="Wheeling Charges"    value={fmtMoney(eb.wheelingCharges)} />
              <BreakdownRow label="Demand Charges"      value={fmtMoney(eb.demandCharges)} />
              <BreakdownRow label="Energy Charges"      value={fmtMoney(eb.energyCharges)} note="VJRA bears this component" />
              <BreakdownRow label="FAC (Fuel Adj. Charge)" value={fmtMoney(eb.fac)} />
              <BreakdownRow label="Fixed Charges"       value={fmtMoney(eb.fixedCharges)} note="Owner bears this component" />

              {(eb.otherCharges || []).map((o, i) => (
                <BreakdownRow key={i} label={o.label} value={fmtMoney(o.amount)} />
              ))}

              <Divider sx={{ my: 1.5 }} />

              <BreakdownRow
                label="Total MSEB Bill Amount"
                value={fmtMoney(eb.totalBillAmount)}
                highlight
              />

              {/* EB PDF download */}
              {eb.pdfUrl && (
                <Box mt={1.5}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={dlEbPdf ? <CircularProgress size={14} /> : <PictureAsPdfIcon sx={{ fontSize: 16 }} />}
                    onClick={handleDownloadEbPdf}
                    disabled={dlEbPdf}
                    sx={{
                      fontSize: 12, textTransform: "none", fontFamily: FONT,
                      borderColor: "#dc2626", color: "#dc2626", borderRadius: 1.5,
                      "&:hover": { borderColor: "#b91c1c", bgcolor: "#fef2f2" },
                    }}
                  >
                    Download MSEB EB PDF
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* ── Section B: Pay to VJRA ─────────────────────────── */}
          <Card sx={{ ...cardSx, border: "1.5px solid #04BFBF" }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <AccountBalanceIcon sx={{ fontSize: 20, color: "#04BFBF" }} />
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: "#000", fontFamily: FONT }}>
                  Amount Payable to Vjra Technologies
                </Typography>
              </Stack>

              <Typography sx={{ fontSize: 13, color: "#64748b", mb: 1.5, fontFamily: FONT }}>
                As per the agreement, the owner bears all fixed and other charges. Please pay the
                following amount to VJRA before the due date for this month's EB settlement.
              </Typography>

              {/* Amount due */}
              <Box
                sx={{
                  p: 2, bgcolor: "#000", borderRadius: 2,
                  display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2,
                }}
              >
                <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: FONT }}>
                  Amount Due to VJRA
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 900, color: "#04BFBF", fontFamily: FONT }}>
                  {fmtMoney(report?.amountOwnerOwesVjra)}
                </Typography>
              </Box>

              {/* Bank details */}
              <SectionLabel>Bank Account Details</SectionLabel>

              {[
                { label: "Account Name",   value: VJRA_BANK.accountName },
                { label: "Bank",           value: VJRA_BANK.bankName },
                { label: "Account Number", value: VJRA_BANK.accountNumber },
                { label: "IFSC Code",      value: VJRA_BANK.ifsc },
                { label: "Account Type",   value: VJRA_BANK.accountType },
              ].map(({ label, value }) => (
                <Box
                  key={label}
                  sx={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    px: 1.5, py: 0.75, bgcolor: "#f9fafb", borderRadius: 1, mb: 0.5,
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: "#64748b", fontFamily: FONT }}>{label}</Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#000", fontFamily: FONT }}>
                      {value}
                    </Typography>
                    <Tooltip title="Copy" arrow>
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(value, label)}
                        sx={{ color: "#94a3b8", p: 0.25, "&:hover": { color: "#04BFBF" } }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}

              {/* Payment status + record button */}
              <Box mt={2}>
                {report?.paymentStatus === "PAID" ? (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, bgcolor: "#dcfce7", borderRadius: 1.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: "#16a34a" }} />
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#16a34a", fontFamily: FONT }}>
                        Payment Recorded
                      </Typography>
                      {report?.paymentRecord?.transactionId && (
                        <Typography sx={{ fontSize: 11, color: "#15803d", fontFamily: FONT }}>
                          Txn ID: {report.paymentRecord.transactionId}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PaymentsIcon />}
                    onClick={() => {
                      setAmountPaid(String(report?.amountOwnerOwesVjra || ""));
                      setTxnId("");
                      setPayErr(null);
                      setPaySuccess(false);
                      setPayDialog(true);
                    }}
                    sx={{
                      bgcolor: "#04BFBF", color: "#fff", fontWeight: 700, fontSize: 13,
                      textTransform: "none", borderRadius: 1.5, fontFamily: FONT,
                      "&:hover": { bgcolor: "#03a6a6" },
                    }}
                  >
                    Record Payment to VJRA
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* ══════════════════════════════════════════════════════
              STATE 3 — Full monthly report (only if EB_PROCESSED)
          ══════════════════════════════════════════════════════ */}
          {hasReport && (
            <Card sx={cardSx}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <AssessmentIcon sx={{ fontSize: 20, color: "#04BFBF" }} />
                  <Typography sx={{ fontWeight: 800, fontSize: 15, color: "#000", fontFamily: FONT }}>
                    Monthly Revenue Report — {monthLabel(month, year)}
                  </Typography>
                </Stack>

                <SectionLabel>Revenue</SectionLabel>
                <BreakdownRow
                  label="Total Revenue (incl. GST)"
                  value={fmtMoney(rd.grossRevenue)}
                  note="Collected from all charging sessions"
                />
                <BreakdownRow
                  label="GST @ 18%"
                  value={`-${fmtMoney(rd.gstAmount)}`}
                  debit
                  note="Goods & Services Tax collected"
                />

                <SectionLabel>Electricity Charges</SectionLabel>
                <BreakdownRow
                  label="Energy Charges (VJRA bears)"
                  value={`-${fmtMoney(rd.energyChargesVjra)}`}
                  debit
                  note="Deducted from VJRA's side"
                />
                <BreakdownRow
                  label="Fixed & Other Charges (Owner bears)"
                  value={fmtMoney(rd.fixedChargesOwner)}
                  note="Collected separately from owner"
                />

                <SectionLabel>VJRA Commission</SectionLabel>
                <BreakdownRow
                  label="VJRA Platform Commission"
                  value={`-${fmtMoney(rd.vjraCommission)}`}
                  debit
                  note="As per owner–VJRA agreement"
                />

                <Divider sx={{ my: 1.5 }} />

                {/* Net payout — highlighted hero row */}
                <Box
                  sx={{
                    p: 2, bgcolor: "#fb923c", borderRadius: 2,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: FONT }}>
                      Net Payout to Owner
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontFamily: FONT }}>
                      Credited to owner's account this month
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <TrendingUpIcon sx={{ fontSize: 22, color: "#fff" }} />
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#fff", fontFamily: FONT }}>
                      {fmtMoney(rd.netPayout)}
                    </Typography>
                  </Stack>
                </Box>

                {/* ── Download buttons ─────────────────────────── */}
                <SectionLabel>Downloads</SectionLabel>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mt={0.5}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={dlExcel ? <CircularProgress size={14} /> : <TableChartIcon sx={{ fontSize: 16 }} />}
                    onClick={handleDownloadExcel}
                    disabled={dlExcel}
                    sx={{
                      fontSize: 12, textTransform: "none", fontFamily: FONT,
                      borderColor: "#16a34a", color: "#16a34a", borderRadius: 1.5,
                      "&:hover": { borderColor: "#15803d", bgcolor: "#f0fdf4" },
                    }}
                  >
                    Download as Excel (CSV)
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={dlPdf ? <CircularProgress size={14} /> : <DownloadIcon sx={{ fontSize: 16 }} />}
                    onClick={handleDownloadReportPdf}
                    disabled={dlPdf}
                    sx={{
                      fontSize: 12, textTransform: "none", fontFamily: FONT,
                      borderColor: "#2563eb", color: "#2563eb", borderRadius: 1.5,
                      "&:hover": { borderColor: "#1d4ed8", bgcolor: "#eff6ff" },
                    }}
                  >
                    Download Report PDF
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

        </Stack>
      )}

      {/* ══════════════════════════════════════════════════════════
          Record Payment Dialog
      ══════════════════════════════════════════════════════════ */}
      <Dialog
        open={payDialog}
        onClose={() => { if (!payLoading) setPayDialog(false); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16, fontFamily: FONT, pb: 0.5 }}>
          Record Payment to VJRA
        </DialogTitle>

        <DialogContent sx={{ pt: 1.5 }}>
          {paySuccess ? (
            <Stack alignItems="center" spacing={1.5} py={3}>
              <CheckCircleIcon sx={{ fontSize: 52, color: "#16a34a" }} />
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#16a34a", fontFamily: FONT }}>
                Payment recorded successfully!
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} mt={0.5}>
              <Typography sx={{ fontSize: 13, color: "#64748b", fontFamily: FONT }}>
                After completing the bank transfer, enter your transaction ID and the amount paid below.
              </Typography>

              <TextField
                label="Transaction / UTR ID *"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                size="small"
                fullWidth
                InputProps={{ style: { fontSize: 13, fontFamily: FONT } }}
                InputLabelProps={{ style: { fontSize: 13 } }}
              />

              <TextField
                label="Amount Paid (₹) *"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 0, step: "0.01" }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 0.5, color: "#94a3b8", fontSize: 13, fontFamily: FONT }}>₹</Typography>,
                  style: { fontSize: 13, fontFamily: FONT },
                }}
                InputLabelProps={{ style: { fontSize: 13 } }}
              />

              {payErr && (
                <Alert severity="error" sx={{ fontSize: 12, fontFamily: FONT }}>{payErr}</Alert>
              )}
            </Stack>
          )}
        </DialogContent>

        {!paySuccess && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setPayDialog(false)}
              disabled={payLoading}
              sx={{ fontSize: 13, textTransform: "none", fontFamily: FONT, color: "#64748b" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleRecordPayment}
              disabled={payLoading}
              sx={{
                fontSize: 13, textTransform: "none", fontFamily: FONT,
                bgcolor: "#04BFBF", fontWeight: 700, borderRadius: 1.5,
                "&:hover": { bgcolor: "#03a6a6" },
              }}
            >
              {payLoading
                ? <CircularProgress size={18} sx={{ color: "#fff" }} />
                : "Confirm Payment"}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ── Toast Snackbar ────────────────────────────────────────── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ open: false, msg: "" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={
          <Typography sx={{ fontSize: 13, fontFamily: FONT }}>{snack.msg}</Typography>
        }
        ContentProps={{ sx: { bgcolor: "#1a1a1a", borderRadius: 2 } }}
      />

    </Box>
  );
}

// ─── Shared style ─────────────────────────────────────────────────────────────

const cardSx = {
  borderRadius: 2,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  background: "#fff",
};