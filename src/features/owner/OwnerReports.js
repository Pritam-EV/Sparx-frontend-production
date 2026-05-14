// src/features/owner/OwnerReports.js

import React, { useCallback, useEffect, useState } from "react";
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
  Chip,
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
import CalendarMonthIcon    from "@mui/icons-material/CalendarMonth";
import LocationOnIcon       from "@mui/icons-material/LocationOn";


const loadJsPDF = () =>
  new Promise((resolve, reject) => {
    if (window.jspdf) return resolve(window.jspdf);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf);
    script.onerror = () => reject(new Error("Failed to load jsPDF"));
    document.head.appendChild(script);
  });
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

const CURRENT_YEAR = new Date().getFullYear();
const YEARS        = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const VJRA_BANK = {
  accountName:   "Vjra Technologies LLP",
  bankName:      "Axis Bank",
  accountNumber: "926020005858870",
  ifsc:          "UTIB0000350",
  branch:        "Sahakarnagar",
  accountType:   "Current Account",
};

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  teal:        "#04BFBF",
  tealDark:    "#038a8a",
  tealLight:   "#e6fafa",
  tealMid:     "#b2eded",
  bg:          "#f4f6f9",
  surface:     "#ffffff",
  surfaceAlt:  "#f8fafc",
  border:      "#e8ecf0",
  borderMid:   "#d1d9e0",
  text:        "#0f172a",
  textMid:     "#475569",
  textLight:   "#94a3b8",
  green:       "#16a34a",
  greenLight:  "#dcfce7",
  red:         "#dc2626",
  redLight:    "#fef2f2",
  orange:      "#ea580c",
  orangeLight: "#fff7ed",
  blue:        "#2563eb",
  blueLight:   "#eff6ff",
  ink:         "#0f172a",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const monthLabel = (m, y) =>
  `${MONTHS.find((x) => x.value === m)?.label} ${y}`;

const getUserId = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).userId;
  } catch { return null; }
};

const downloadBlob = (blob, filename) => {
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ─── Shared sx ────────────────────────────────────────────────────────────────

const cardSx = {
  borderRadius: "16px",
  border: `1px solid ${C.border}`,
  boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
  background: C.surface,
  overflow: "hidden",
};

const selectSx = {
  bgcolor: C.surface,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: FONT,
  borderRadius: "10px",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: C.border },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: C.teal },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: C.teal },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children, mt = 2 }) {
  return (
    <Typography sx={{
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: "1.2px",
      textTransform: "uppercase",
      color: C.textLight,
      fontFamily: FONT,
      mb: 1,
      mt,
    }}>
      {children}
    </Typography>
  );
}

function ChargeRow({ label, value, note, variant = "default" }) {
  const bgMap = {
    default:   C.surfaceAlt,
    highlight: C.tealLight,
    debit:     C.redLight,
    success:   C.greenLight,
  };
  const valColorMap = {
    default:   C.ink,
    highlight: C.tealDark,
    debit:     C.red,
    success:   C.green,
  };

  return (
    <Box sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      px: 2,
      py: 1.25,
      bgcolor: bgMap[variant],
      borderRadius: "10px",
      mb: 0.75,
    }}>
      <Box>
        <Typography sx={{ fontSize: 13.5, color: C.textMid, fontWeight: 500, fontFamily: FONT }}>
          {label}
        </Typography>
        {note && (
          <Typography sx={{ fontSize: 10.5, color: C.textLight, fontFamily: FONT, mt: 0.1 }}>
            {note}
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: valColorMap[variant], fontFamily: FONT, ml: 2 }}>
        {value}
      </Typography>
    </Box>
  );
}

function HeroAmount({ label, sublabel, amount, accent = C.teal }) {
  return (
    <Box sx={{
      background: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`,
      borderRadius: "14px",
      p: { xs: 2.5, sm: 3 },
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 1.5,
    }}>
      <Box>
        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: FONT, letterSpacing: "0.5px", mb: 0.25 }}>
          {label}
        </Typography>
        {sublabel && (
          <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: FONT }}>
            {sublabel}
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 900, color: accent, fontFamily: FONT, letterSpacing: "-0.5px" }}>
        {amount}
      </Typography>
    </Box>
  );
}

function CardHeader({ icon, title, chip }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={{
          width: 36, height: 36, borderRadius: "10px",
          bgcolor: C.tealLight,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {React.cloneElement(icon, { sx: { fontSize: 20, color: C.teal } })}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 15, color: C.text, fontFamily: FONT }}>
          {title}
        </Typography>
      </Stack>
      {chip}
    </Stack>
  );
}

function BankRow({ label, value, onCopy }) {
  return (
    <Box sx={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      px: 1.75, py: 1, bgcolor: C.surfaceAlt, borderRadius: "10px", mb: 0.6,
    }}>
      <Typography sx={{ fontSize: 12, color: C.textLight, fontFamily: FONT }}>{label}</Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT }}>{value}</Typography>
        <Tooltip title="Copy" arrow>
          <IconButton size="small" onClick={() => onCopy(value, label)}
            sx={{ color: C.textLight, p: 0.3, "&:hover": { color: C.teal } }}>
            <ContentCopyIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

function DlButton({ label, icon, color, hoverBg, onClick, loading }) {
  return (
    <Button
      variant="outlined"
      fullWidth
      startIcon={loading
        ? <CircularProgress size={14} sx={{ color }} />
        : React.cloneElement(icon, { sx: { fontSize: 16 } })
      }
      onClick={onClick}
      disabled={loading}
      sx={{
        fontSize: 12.5, textTransform: "none", fontFamily: FONT, fontWeight: 600,
        borderColor: color, color,
        borderRadius: "10px", py: 1,
        "&:hover": { borderColor: color, bgcolor: hoverBg },
        "&:disabled": { opacity: 0.5 },
      }}
    >
      {label}
    </Button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OwnerReports() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year,  setYear]  = useState(CURRENT_YEAR);

  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  const [payDialog,  setPayDialog]  = useState(false);
  const [txnId,      setTxnId]      = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payErr,     setPayErr]     = useState(null);
  const [paySuccess, setPaySuccess] = useState(false);

  const [snack, setSnack] = useState({ open: false, msg: "" });

  const [dlExcel, setDlExcel] = useState(false);
  const [dlPdf,   setDlPdf]   = useState(false);
  const [dlEbPdf, setDlEbPdf] = useState(false);

  const [projectName, setProjectName] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      setReport(null);

      const base    = process.env.REACT_APP_Backend_API_Base_URL;
      const token   = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      let proj = projectName;
      if (!proj) {
        const projRes  = await fetch(`${base}/api/eb/owner/projects`, { headers });
        const projData = await projRes.json();
        if (!projRes.ok || !projData?.projects?.length) {
          setErr("No VJRA projects found for your account.");
          setLoading(false);
          return;
        }
        proj = projData.projects[0].project;
        setProjectName(proj);
      }

      const mm       = String(month).padStart(2, "0");
      const monthStr = `${year}-${mm}`;

      const res  = await fetch(`${base}/api/eb/owner/${encodeURIComponent(proj)}/${monthStr}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load report");
      setReport(data.eb ?? data);
    } catch (e) {
      setErr(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [month, year, projectName]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Record payment ─────────────────────────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!txnId.trim() || !amountPaid) {
      setPayErr("Transaction ID and amount are required.");
      return;
    }
    const ebId = report?._id;
    if (!ebId) { setPayErr("EB record not found. Please refresh."); return; }

    try {
      setPayLoading(true);
      setPayErr(null);
      const token = localStorage.getItem("token");
      const base  = process.env.REACT_APP_Backend_API_Base_URL;
      const res   = await fetch(`${base}/api/eb/owner/${ebId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ txnId: txnId.trim(), amountPaid: Number(amountPaid) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Failed to record payment");
      setPaySuccess(true);
      setTimeout(() => {
        setPayDialog(false); setPaySuccess(false);
        setTxnId(""); setAmountPaid("");
        fetchReport();
      }, 1600);
    } catch (e) {
      setPayErr(e.message || "Failed to record payment");
    } finally {
      setPayLoading(false);
    }
  };

  // ── Downloads ──────────────────────────────────────────────────────────────
const handleDownloadExcel = async () => {
    if (!report) return;

    try {
      setDlExcel(true);
      const r  = report.reportData || {};
      // eb is already derived above in component scope, but we re-derive here
      // since this function runs after render, the derived `eb` const is in closure
      const ebData = {
        wheelingCharges: report?.charges?.wheelingCharges?.amount ?? 0,
        demandCharges:   report?.charges?.demandCharges?.amount   ?? 0,
        energyCharges:   report?.charges?.energyCharges?.amount   ?? 0,
        fac:             report?.charges?.fac?.amount             ?? 0,
        fixedCharges:    report?.charges?.fixedCharges?.amount    ?? 0,
        otherCharges:    report?.extraCharges || [],
        totalBillAmount: report?.totalEBAmount ?? 0,
      };
      const rows = [
        ["VIZ - Smart Charging Monthly Report"],
        [`Period: ${monthLabel(month, year)}`],
        [`Owner: ${report.ownerName || "—"}`],
        [`Project: ${report.projectName || "—"}`],
        [],
        ["ELECTRICITY BILL BREAKDOWN (MSEB)"],
        ["Charge", "Amount (₹)"],
        ["Wheeling Charges",    ebData.wheelingCharges],
        ["Demand Charges",      ebData.demandCharges],
        ["Energy Charges",      ebData.energyCharges],
        ["FAC",                 ebData.fac],
        ["Fixed Charges",       ebData.fixedCharges],
        ...(ebData.otherCharges || []).map((o) => [o.label, o.amount]),
        ["TOTAL MSEB BILL",     ebData.totalBillAmount],
        [],
        ["MONTHLY REPORT"],
        ["Item",                "Amount (₹)"],
        ["Total Revenue (incl. GST)",   r.grossRevenue       ?? "N/A"],
        ["GST (18%)",                   r.gstAmount          ?? "N/A"],
        ["Energy Charges (VJRA bears)", r.energyChargesVjra  ?? "N/A"],
        ["Fixed Charges (Owner bears)", r.fixedChargesOwner  ?? "N/A"],
        ["VJRA Commission",             r.vjraCommission     ?? "N/A"],
        ["Net Payout to Owner",         r.netPayout          ?? "N/A"],
        [],
        ["Amount Owner Owes VJRA",  report.totalOwnerPayable ?? 0],
        ["Payment Status",          report.status            ?? "Pending"],
      ];
      const csv  = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `VjraTechnologies_Report_${monthLabel(month, year).replace(" ", "_")}.csv`);
      setSnack({ open: true, msg: "Excel (CSV) downloaded!" });
    } catch {
      setSnack({ open: true, msg: "Download failed. Please try again." });
    } finally {
      setDlExcel(false);
    }
  };

  const handleDownloadReportPdf = async () => {
    if (!report) return;
    try {
      setDlPdf(true);
const { jsPDF } = await loadJsPDF();
const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const r      = report.reportData || {};
      const period = monthLabel(month, year);
      const teal   = [4, 191, 191];
      const black  = [0, 0, 0];
      const gray   = [100, 116, 139];

      let y = 18;

      // Header bar
      doc.setFillColor(...teal);
      doc.rect(0, 0, 210, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Vjra Technologies Report", 14, 8);
      doc.text(period, 196, 8, { align: "right" });

      y = 22;
      doc.setTextColor(...black);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Viz - Smart Charging Monthly Statement", 14, y);

      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      doc.text(`Project: ${report.projectName || "—"}   |   Period: ${period}`, 14, y);

      y += 8;
      doc.setDrawColor(229, 231, 235);
      doc.line(14, y, 196, y);
      y += 7;

      // EB Breakdown section
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...teal);
      doc.text("ELECTRICITY BILL BREAKDOWN (MSEB)", 14, y);
      y += 5;

      const ebRows = [
        ["Wheeling Charges",                  report?.charges?.wheelingCharges?.amount ?? 0],
        ["Demand Charges",                    report?.charges?.demandCharges?.amount   ?? 0],
        ["Energy Charges (VJRA bears)",       report?.charges?.energyCharges?.amount   ?? 0],
        ["FAC (Fuel Adjustment Charge)",      report?.charges?.fac?.amount             ?? 0],
        ["Fixed Charges (Owner bears)",       report?.charges?.fixedCharges?.amount    ?? 0],
        ...(report?.extraCharges || []).map((o) => [o.label, o.amount]),
      ];

      ebRows.forEach(([label, val], i) => {
        doc.setFillColor(i % 2 === 0 ? 249 : 255, 250, 251);
        doc.rect(14, y - 3.5, 182, 6, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...black);
        doc.text(label, 16, y);
        doc.setFont("helvetica", "bold");
        doc.text(`Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 194, y, { align: "right" });
        y += 6;
      });

      // Total EB
      doc.setFillColor(...teal);
      doc.rect(14, y - 3.5, 182, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("Total MSEB Bill Amount", 16, y + 0.5);
      doc.text(
        `Rs. ${Number(report?.totalEBAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        194, y + 0.5, { align: "right" }
      );
      y += 12;

      // Monthly Report section
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...teal);
      doc.text("MONTHLY REVENUE REPORT", 14, y);
      y += 5;

      const repRows = [
        ["Total Revenue (incl. GST)",   r.grossRevenue       ?? 0],
        ["GST @ 18%",                   r.gstAmount          ?? 0],
        ["Energy Charges (VJRA bears)", r.energyChargesVjra  ?? 0],
        ["Fixed & Other Charges",       r.fixedChargesOwner  ?? 0],
        ["VJRA Platform Commission",    r.vjraCommission     ?? 0],
      ];

      repRows.forEach(([label, val], i) => {
        doc.setFillColor(i % 2 === 0 ? 249 : 255, 250, 251);
        doc.rect(14, y - 3.5, 182, 6, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...black);
        doc.text(label, 16, y);
        doc.setFont("helvetica", "bold");
        doc.text(`Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 194, y, { align: "right" });
        y += 6;
      });

      // Net payout hero row
      y += 2;
      doc.setFillColor(251, 146, 60);
      doc.roundedRect(14, y - 4, 182, 12, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("Net Payout to Owner", 16, y + 3.5);
      doc.setFontSize(12);
      doc.text(
        `Rs. ${Number(r.netPayout ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        194, y + 3.5, { align: "right" }
      );
      y += 18;

      // Footer
      doc.setDrawColor(229, 231, 235);
      doc.line(14, y, 196, y);
      y += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      doc.text("Generated by VIZ-Smart Charging, a brand of Vjra Technologies LLP", 14, y);
      doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 196, y, { align: "right" });

      doc.save(`VjraTechnologies_Report_${period.replace(" ", "_")}.pdf`);
      setSnack({ open: true, msg: "Report PDF downloaded!" });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, msg: "PDF download failed. Please try again." });
    } finally {
      setDlPdf(false);
    }
  };

  const handleDownloadEbPdf = async () => {
    if (!report?._id || !report?.hasPdf) return;
    try {
      setDlEbPdf(true);
      const token = localStorage.getItem("token");
      const base  = process.env.REACT_APP_Backend_API_Base_URL;
      const res   = await fetch(`${base}/api/eb/${report._id}/download-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to get PDF URL");
      window.open(data.url, "_blank");
      setSnack({ open: true, msg: "EB PDF opened!" });
    } catch {
      setSnack({ open: true, msg: "PDF download failed. Please try again." });
    } finally {
      setDlEbPdf(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() =>
      setSnack({ open: true, msg: `${label} copied!` })
    );
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const beStatus = report?.status;
  const status =
    !report || beStatus === "not_generated"
      ? "NO_DATA"
      : beStatus === "payment_verified" || beStatus === "eb_paid_to_mseb"
      ? "EB_PROCESSED"
      : "EB_UPLOADED";

  const eb = {
    wheelingCharges:   report?.charges?.wheelingCharges?.amount,
    demandCharges:     report?.charges?.demandCharges?.amount,
    energyCharges:     report?.charges?.energyCharges?.amount,
    fac:               report?.charges?.fac?.amount,
    fixedCharges:      report?.charges?.fixedCharges?.amount,
    electricityDuty:   report?.charges?.electricityDuty?.amount,
    meterRent:         report?.charges?.meterRent?.amount,
    powerFactorAdjust: report?.charges?.powerFactorAdjustment?.amount,
    delayedPayment:    report?.charges?.delayedPaymentCharges?.amount,
    regulatoryCharges: report?.charges?.regulatoryCharges?.amount,
    otherCharges:      report?.extraCharges || [],
    totalBillAmount:   report?.totalEBAmount,
  };
  const rd        = report?.reportData || {};
  const hasReport = status === "EB_PROCESSED";
  const hasEB     = status === "EB_UPLOADED" || hasReport;

  const paymentRecorded = ["payment_submitted", "payment_verified", "eb_paid_to_mseb"]
    .includes(report?.status);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ bgcolor: C.bg, minHeight: "100vh", py: { xs: 2.5, sm: 3.5 }, px: { xs: 2, sm: 3, md: 4 }, fontFamily: FONT }}>
      <Box sx={{ maxWidth: 820, mx: "auto" }}>

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={1.5}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{ width: 42, height: 42, borderRadius: "12px", bgcolor: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AssessmentIcon sx={{ color: "#fff", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 26 }, color: C.text, letterSpacing: "-0.5px", fontFamily: FONT, lineHeight: 1.1 }}>
                Reports
              </Typography>
              <Typography sx={{ color: C.textLight, fontSize: 12, fontFamily: FONT }}>
                Monthly EB breakdown & revenue payout
              </Typography>
            </Box>
          </Stack>

          <Tooltip title="Refresh" arrow>
            <IconButton
              onClick={fetchReport}
              disabled={loading}
              size="small"
              sx={{
                bgcolor: C.teal, color: "#fff", width: 36, height: 36, borderRadius: "10px",
                "&:hover": { bgcolor: C.tealDark, transform: "rotate(180deg)" },
                "&:disabled": { bgcolor: C.border },
                transition: "all 0.4s",
              }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* ── Period Picker ────────────────────────────────────────────────── */}
        <Card sx={{ ...cardSx, mb: 2.5 }}>
          <CardContent sx={{ p: { xs: 1.75, sm: 2 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
                <CalendarMonthIcon sx={{ fontSize: 18, color: C.teal }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.textMid, fontFamily: FONT, whiteSpace: "nowrap" }}>
                  Select Period
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1.25} sx={{ flex: 2 }}>
                <FormControl size="small" sx={{ flex: 1.6 }}>
                  <Select value={month} onChange={(e) => setMonth(e.target.value)} sx={selectSx}>
                    {MONTHS.map((m) => (
                      <MenuItem key={m.value} value={m.value} sx={{ fontSize: 13, fontFamily: FONT }}>{m.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select value={year} onChange={(e) => setYear(e.target.value)} sx={selectSx}>
                    {YEARS.map((y) => (
                      <MenuItem key={y} value={y} sx={{ fontSize: 13, fontFamily: FONT }}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {report?.projectName && (
                <Stack direction="row" alignItems="center" spacing={0.5}
                  sx={{ bgcolor: C.tealLight, px: 1.5, py: 0.75, borderRadius: "8px", whiteSpace: "nowrap" }}>
                  <LocationOnIcon sx={{ fontSize: 13, color: C.teal }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.tealDark, fontFamily: FONT }}>
                    {report.projectName}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 12 }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={44} thickness={3.5} sx={{ color: C.teal }} />
              <Typography sx={{ fontSize: 13, color: C.textLight, fontFamily: FONT }}>
                Loading report for {monthLabel(month, year)}…
              </Typography>
            </Stack>
          </Box>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {!loading && err && (
          <Alert severity="error" sx={{ mt: 1, borderRadius: "12px", fontFamily: FONT, fontSize: 13 }}>{err}</Alert>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STATE 1 — No EB data
        ═══════════════════════════════════════════════════════════════════ */}
        {!loading && !err && status === "NO_DATA" && (
          <Card sx={cardSx}>
            <CardContent sx={{ textAlign: "center", py: { xs: 7, sm: 9 }, px: 3 }}>
              <Box sx={{
                width: 72, height: 72, borderRadius: "20px", bgcolor: C.tealLight,
                display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2,
              }}>
                <HourglassEmptyIcon sx={{ fontSize: 36, color: C.teal }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: 17, color: C.text, mb: 0.75, fontFamily: FONT }}>
                EB Not Yet Generated
              </Typography>
              <Typography sx={{ color: C.textMid, fontSize: 13.5, maxWidth: 360, mx: "auto", fontFamily: FONT, lineHeight: 1.65 }}>
                This month's Electricity Bill has not been uploaded by the admin yet.
                Please check back once the MSEB bill for{" "}
                <Box component="span" sx={{ fontWeight: 700, color: C.text }}>{monthLabel(month, year)}</Box> is processed.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STATE 2 & 3 — EB uploaded
        ═══════════════════════════════════════════════════════════════════ */}
        {!loading && !err && hasEB && (
          <Stack spacing={2.5}>

            {/* ── Section A: EB Breakdown ───────────────────────────────── */}
            <Card sx={cardSx}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <CardHeader
                  icon={<ElectricBoltIcon />}
                  title={`MSEB Electricity Bill — ${monthLabel(month, year)}`}
                  chip={
                    report?.hasPdf ? (
                      <Chip
                        size="small"
                        label="PDF Available"
                        sx={{ bgcolor: C.redLight, color: C.red, fontWeight: 700, fontSize: 10.5, fontFamily: FONT }}
                      />
                    ) : null
                  }
                />

                <SectionLabel mt={0}>Charge Breakdown</SectionLabel>

                {[
                  { label: "Energy Charges",         value: eb.energyCharges,     note: "VJRA bears this component" },
                  { label: "Wheeling Charges",        value: eb.wheelingCharges },
                  { label: "Demand Charges",          value: eb.demandCharges },
                  { label: "FAC (Fuel Adj. Charge)",  value: eb.fac },
                  { label: "Fixed Charges",           value: eb.fixedCharges,      note: "Owner bears this component" },
                  { label: "Electricity Duty",        value: eb.electricityDuty },
                  { label: "Meter Rent",              value: eb.meterRent },
                  { label: "Power Factor Adj.",       value: eb.powerFactorAdjust },
                  { label: "Delayed Payment Charges", value: eb.delayedPayment },
                  { label: "Regulatory Charges",      value: eb.regulatoryCharges },
                ]
                  .filter(({ value }) => value > 0)
                  .map(({ label, value, note }) => (
                    <ChargeRow key={label} label={label} value={fmtMoney(value)} note={note} />
                  ))
                }

                {(eb.otherCharges || []).map((o, i) => (
                  <ChargeRow key={i} label={o.label} value={fmtMoney(o.amount)} />
                ))}

                <Box sx={{ my: 1.5 }}><Divider sx={{ borderColor: C.border }} /></Box>

                <ChargeRow
                  label="Total MSEB Bill Amount"
                  value={fmtMoney(eb.totalBillAmount)}
                  variant="highlight"
                />

                {report?.hasPdf && (
                  <Box mt={2}>
                    <DlButton
                      label="Download MSEB Bill (PDF)"
                      icon={<PictureAsPdfIcon />}
                      color={C.red}
                      hoverBg={C.redLight}
                      onClick={handleDownloadEbPdf}
                      loading={dlEbPdf}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>


          {/* ── Download Buttons — always visible when EB exists ── */}
          {hasEB && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
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

              {hasReport && (
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
              )}
            </Stack>
          )}


            {/* ── Section B: Pay to VJRA ────────────────────────────────── */}
            <Card sx={{ ...cardSx, border: `1.5px solid ${C.teal}` }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <CardHeader
                  icon={<AccountBalanceIcon />}
                  title="Amount Payable to Vjra Technologies"
                />

                <Typography sx={{ fontSize: 13, color: C.textMid, mb: 2, fontFamily: FONT, lineHeight: 1.6 }}>
                  Please transfer the amount below to VJRA before the due date for this month's electricity bill settlement.
                </Typography>

                <HeroAmount
                  label="Amount Due to VJRA"
                  sublabel="Fixed + other owner-borne charges"
                  amount={fmtMoney(report?.totalOwnerPayable)}
                />

                <SectionLabel>Bank Account Details</SectionLabel>

                {[
                  { label: "Account Name",   value: VJRA_BANK.accountName },
                  { label: "Bank",           value: VJRA_BANK.bankName },
                  { label: "Account Number", value: VJRA_BANK.accountNumber },
                  { label: "IFSC Code",      value: VJRA_BANK.ifsc },
                  { label: "Branch",         value: VJRA_BANK.branch },
                  { label: "Account Type",   value: VJRA_BANK.accountType },
                ].map(({ label, value }) => (
                  <BankRow key={label} label={label} value={value} onCopy={copyToClipboard} />
                ))}

                <Box mt={2.5}>
                  {paymentRecorded ? (
                    <Box sx={{ p: 2, bgcolor: C.greenLight, borderRadius: "12px", border: `1px solid #bbf7d0` }}>
                      <Stack direction="row" alignItems="center" spacing={1.25}>
                        <CheckCircleIcon sx={{ fontSize: 22, color: C.green }} />
                        <Box>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: C.green, fontFamily: FONT }}>
                            Payment Recorded
                          </Typography>
                          {report?.ownerPayment?.txnId && (
                            <Typography sx={{ fontSize: 11.5, color: "#166534", fontFamily: FONT }}>
                              Txn ID: {report.ownerPayment.txnId}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Box>
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
                        bgcolor: C.teal, color: "#fff", fontWeight: 700, fontSize: 14,
                        textTransform: "none", borderRadius: "12px", fontFamily: FONT,
                        py: 1.4, boxShadow: `0 4px 14px rgba(4,191,191,0.35)`,
                        "&:hover": { bgcolor: C.tealDark, boxShadow: `0 6px 20px rgba(4,191,191,0.4)` },
                      }}
                    >
                      Record Payment to VJRA
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════
                STATE 3 — Full monthly report
            ═══════════════════════════════════════════════════════════ */}
            {hasReport && (
              <Card sx={cardSx}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <CardHeader
                    icon={<AssessmentIcon />}
                    title={`Monthly Revenue Report — ${monthLabel(month, year)}`}
                  />

                  <SectionLabel mt={0}>Revenue</SectionLabel>
                  <ChargeRow
                    label="Total Revenue (incl. GST)"
                    value={fmtMoney(rd.grossRevenue)}
                    note="Collected from all charging sessions"
                  />
                  <ChargeRow
                    label="GST @ 18%"
                    value={`−${fmtMoney(rd.gstAmount)}`}
                    note="Goods & Services Tax collected"
                    variant="debit"
                  />

                  <SectionLabel>Electricity Charges</SectionLabel>
                  <ChargeRow
                    label="Energy Charges (VJRA bears)"
                    value={`−${fmtMoney(rd.energyChargesVjra)}`}
                    note="Deducted from VJRA's side"
                    variant="debit"
                  />
                  <ChargeRow
                    label="Fixed & Other Charges (Owner bears)"
                    value={fmtMoney(rd.fixedChargesOwner)}
                    note="Collected separately from owner"
                  />

                  <SectionLabel>VJRA Commission</SectionLabel>
                  <ChargeRow
                    label="VJRA Platform Commission"
                    value={`−${fmtMoney(rd.vjraCommission)}`}
                    note="As per owner–VJRA agreement"
                    variant="debit"
                  />

                  <Box sx={{ my: 2 }}><Divider sx={{ borderColor: C.border }} /></Box>

                  {/* Net payout hero */}
                  <Box sx={{
                    background: `linear-gradient(135deg, #0f172a 0%, #1e3a2f 100%)`,
                    borderRadius: "14px",
                    p: { xs: 2.5, sm: 3 },
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1.5,
                  }}>
                    <Box>
                      <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: FONT, letterSpacing: "0.5px", mb: 0.25 }}>
                        Net Payout to Owner
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: FONT }}>
                        Credited to your account this month
                      </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TrendingUpIcon sx={{ fontSize: 22, color: "#4ade80" }} />
                      <Typography sx={{ fontSize: { xs: 26, sm: 30 }, fontWeight: 900, color: "#4ade80", fontFamily: FONT, letterSpacing: "-0.5px" }}>
                        {fmtMoney(rd.netPayout)}
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Downloads */}

                </CardContent>
              </Card>


            )}

          </Stack>
        )}

        {/* ── Record Payment Dialog ────────────────────────────────────────── */}
        <Dialog
          open={payDialog}
          onClose={() => { if (!payLoading) setPayDialog(false); }}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "20px", overflow: "hidden" } }}
        >
          <Box sx={{ px: 3, pt: 3, pb: 0, background: `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)` }}>
            <Stack direction="row" alignItems="center" spacing={1.25} pb={2}>
              <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PaymentsIcon sx={{ color: "#fff", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#fff", fontFamily: FONT }}>
                  Record Payment to VJRA
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", fontFamily: FONT }}>
                  Enter your UPI / NEFT / IMPS transaction details
                </Typography>
              </Box>
            </Stack>
          </Box>

          <DialogContent sx={{ pt: 2.5, pb: 1.5 }}>
            {paySuccess ? (
              <Stack alignItems="center" spacing={2} py={3}>
                <Box sx={{ width: 72, height: 72, borderRadius: "20px", bgcolor: C.greenLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircleIcon sx={{ fontSize: 40, color: C.green }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: C.green, fontFamily: FONT }}>
                  Payment recorded successfully!
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography sx={{ fontSize: 13, color: C.textMid, fontFamily: FONT, lineHeight: 1.6 }}>
                  After completing the bank transfer, enter your transaction ID and the amount paid below.
                </Typography>

                <TextField
                  label="Transaction / UTR ID *"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  size="small"
                  fullWidth
                  InputProps={{ style: { fontSize: 13, fontFamily: FONT } }}
                  InputLabelProps={{ style: { fontSize: 13, fontFamily: FONT } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
                    startAdornment: (
                      <Typography sx={{ mr: 0.5, color: C.textLight, fontSize: 13, fontFamily: FONT }}>₹</Typography>
                    ),
                    style: { fontSize: 13, fontFamily: FONT },
                  }}
                  InputLabelProps={{ style: { fontSize: 13, fontFamily: FONT } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />

                {payErr && (
                  <Alert severity="error" sx={{ fontSize: 12, fontFamily: FONT, borderRadius: "10px" }}>{payErr}</Alert>
                )}
              </Stack>
            )}
          </DialogContent>

          {!paySuccess && (
            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
              <Button
                onClick={() => setPayDialog(false)}
                disabled={payLoading}
                sx={{ fontSize: 13, textTransform: "none", fontFamily: FONT, color: C.textMid, borderRadius: "10px" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleRecordPayment}
                disabled={payLoading}
                sx={{
                  fontSize: 13, textTransform: "none", fontFamily: FONT,
                  bgcolor: C.teal, fontWeight: 700, borderRadius: "10px",
                  px: 3, boxShadow: `0 4px 12px rgba(4,191,191,0.35)`,
                  "&:hover": { bgcolor: C.tealDark },
                }}
              >
                {payLoading
                  ? <CircularProgress size={18} sx={{ color: "#fff" }} />
                  : "Confirm Payment"}
              </Button>
            </DialogActions>
          )}
        </Dialog>

        {/* ── Snackbar ─────────────────────────────────────────────────────── */}
        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={() => setSnack({ open: false, msg: "" })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          message={
            <Typography sx={{ fontSize: 13, fontFamily: FONT }}>{snack.msg}</Typography>
          }
          ContentProps={{ sx: { bgcolor: "#0f172a", borderRadius: "12px", fontFamily: FONT } }}
        />

      </Box>
    </Box>
  );
}