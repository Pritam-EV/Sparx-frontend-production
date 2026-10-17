// src/features/owner/OwnerReports.js

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./OwnerReports.css";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

// Icons
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";

const loadJsPDF = () =>
  new Promise((resolve, reject) => {
    if (window.jspdf) return resolve(window.jspdf);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf);
    script.onerror = () => reject(new Error("Failed to load jsPDF"));
    document.head.appendChild(script);
  });

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const VJRA_BANK = {
  accountName: "Vjra Technologies LLP",
  bankName: "Axis Bank",
  accountNumber: "926020005858870",
  ifsc: "UTIB0000350",
  branch: "Sahakarnagar",
  accountType: "Current Account",
};

const fmtMoney = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const monthLabel = (m, y) =>
  `${MONTHS.find((x) => x.value === m)?.label} ${y}`;

const downloadBlob = (blob, filename) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

export default function OwnerReports() {
  const [searchParams] = useSearchParams();
  const requestedMonth = searchParams.get("month") || "";
  const requestedProject = searchParams.get("project") || null;
  const requestedMonthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(requestedMonth);

  const [month, setMonth] = useState(() =>
    requestedMonthMatch ? Number(requestedMonthMatch[2]) : new Date().getMonth() + 1
  );
  const [year, setYear] = useState(() =>
    requestedMonthMatch ? Number(requestedMonthMatch[1]) : CURRENT_YEAR
  );

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [payDialog, setPayDialog] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payErr, setPayErr] = useState(null);
  const [paySuccess, setPaySuccess] = useState(false);

  const [snack, setSnack] = useState({ open: false, msg: "" });

  const [dlExcel, setDlExcel] = useState(false);
  const [dlPdf, setDlPdf] = useState(false);
  const [dlEbPdf, setDlEbPdf] = useState(false);

  const [projectName, setProjectName] = useState(requestedProject);

  // Fetch Report
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      setReport(null);

      const base = process.env.REACT_APP_Backend_API_Base_URL;
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      let proj = projectName;
      if (!proj) {
        const projRes = await fetch(`${base}/api/eb/owner/projects`, { headers });
        const projData = await projRes.json();
        if (!projRes.ok || !projData?.projects?.length) {
          setErr("No VJRA projects found for your account.");
          setLoading(false);
          return;
        }
        proj = projData.projects[0].project;
        setProjectName(proj);
      }

      const mm = String(month).padStart(2, "0");
      const monthStr = `${year}-${mm}`;

      const res = await fetch(`${base}/api/eb/owner/${encodeURIComponent(proj)}/${monthStr}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load report");
      setReport(data.eb ?? data);
    } catch (e) {
      setErr(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [month, year, projectName]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Payment Recording
  const handleRecordPayment = async () => {
    if (!txnId.trim() || !amountPaid) {
      setPayErr("Transaction ID and amount are required.");
      return;
    }
    const ebId = report?._id;
    if (!ebId) {
      setPayErr("EB record not found. Please refresh.");
      return;
    }

    try {
      setPayLoading(true);
      setPayErr(null);
      const token = localStorage.getItem("token");
      const base = process.env.REACT_APP_Backend_API_Base_URL;
      const res = await fetch(`${base}/api/eb/owner/${ebId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ txnId: txnId.trim(), amountPaid: Number(amountPaid) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Failed to record payment");
      setPaySuccess(true);
      setTimeout(() => {
        setPayDialog(false);
        setPaySuccess(false);
        setTxnId("");
        setAmountPaid("");
        fetchReport();
      }, 1500);
    } catch (e) {
      setPayErr(e.message || "Failed to record payment");
    } finally {
      setPayLoading(false);
    }
  };



  // PDF Generation
  const handleDownloadReportPdf = async () => {
    if (!report) return;
    try {
      setDlPdf(true);
      const { jsPDF } = await loadJsPDF();
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const r = report.reportData || {};
      const period = monthLabel(month, year);

      let y = 14;
      doc.setFillColor(3, 18, 22);
      doc.rect(0, 0, 210, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("VIZ SMART CHARGING • MONTHLY SETTLEMENT", 14, 9);
      doc.text(period, 196, 9, { align: "right" });

      y = 24;
      doc.setTextColor(14, 46, 51);
      doc.setFontSize(16);
      doc.text("Monthly Electricity & Revenue Statement", 14, y);

      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Project: ${report.projectName || "—"}   |   Cycle: ${period}`, 14, y);

      y += 7;
      doc.setDrawColor(212, 240, 236);
      doc.line(14, y, 196, y);
      y += 8;

      // MSEB Breakdown
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 143, 127);
      doc.text("MSEB ELECTRICITY BILL BREAKDOWN", 14, y);
      y += 5;

      const ebRows = [
        ["Wheeling Charges", report?.charges?.wheelingCharges?.amount ?? 0],
        ["Demand Charges", report?.charges?.demandCharges?.amount ?? 0],
        ["Energy Charges (VJRA Bears)", report?.charges?.energyCharges?.amount ?? 0],
        ["FAC (Fuel Adjustment Charge)", report?.charges?.fac?.amount ?? 0],
        ["Fixed Charges (Owner Bears)", report?.charges?.fixedCharges?.amount ?? 0],
        ...(report?.extraCharges || []).map((o) => [o.label, o.amount]),
      ];

      ebRows.forEach(([label, val], i) => {
        doc.setFillColor(i % 2 === 0 ? 247 : 255, 253, 252);
        doc.rect(14, y - 3.5, 182, 6, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(14, 46, 51);
        doc.text(label, 16, y);
        doc.setFont("helvetica", "bold");
        doc.text(`Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 194, y, { align: "right" });
        y += 6;
      });

      // Total EB
      doc.setFillColor(0, 210, 180);
      doc.rect(14, y - 3.5, 182, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(3, 18, 22);
      doc.text("Total MSEB Bill Amount", 16, y + 0.5);
      doc.text(`Rs. ${Number(report?.totalEBAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 194, y + 0.5, { align: "right" });
      y += 12;

      // Revenue Section
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 143, 127);
      doc.text("MONTHLY REVENUE BREAKDOWN", 14, y);
      y += 5;

      const repRows = [
        ["Total Revenue (incl. GST)", r.grossRevenue ?? 0],
        ["GST (18%)", r.gstAmount ?? 0],
        ["Energy Charges (VJRA Bears)", r.energyChargesVjra ?? 0],
        ["Fixed Charges (Owner Bears)", r.fixedChargesOwner ?? 0],
        ["VJRA Platform Commission", r.vjraCommission ?? 0],
      ];

      repRows.forEach(([label, val], i) => {
        doc.setFillColor(i % 2 === 0 ? 247 : 255, 253, 252);
        doc.rect(14, y - 3.5, 182, 6, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(14, 46, 51);
        doc.text(label, 16, y);
        doc.setFont("helvetica", "bold");
        doc.text(`Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 194, y, { align: "right" });
        y += 6;
      });

      // Net Payout Box
      y += 3;
      doc.setFillColor(255, 130, 54);
      doc.roundedRect(14, y - 4, 182, 12, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("Net Payout to Owner", 16, y + 3.5);
      doc.setFontSize(12);
      doc.text(`Rs. ${Number(r.netPayout ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 194, y + 3.5, { align: "right" });

      doc.save(`VIZ_Statement_${period.replace(" ", "_")}.pdf`);
      setSnack({ open: true, msg: "Report PDF downloaded!" });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, msg: "PDF generation failed." });
    } finally {
      setDlPdf(false);
    }
  };

  const handleDownloadEbPdf = async () => {
    if (!report?._id || !report?.hasPdf) return;
    try {
      setDlEbPdf(true);
      const token = localStorage.getItem("token");
      const base = process.env.REACT_APP_Backend_API_Base_URL;
      const res = await fetch(`${base}/api/eb/${report._id}/download-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch PDF URL");
      window.open(data.url, "_blank");
      setSnack({ open: true, msg: "Opening MSEB PDF bill…" });
    } catch {
      setSnack({ open: true, msg: "Failed to open MSEB PDF." });
    } finally {
      setDlEbPdf(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() =>
      setSnack({ open: true, msg: `${label} copied to clipboard!` })
    );
  };

  const beStatus = report?.status;
  const status =
    !report || beStatus === "not_generated"
      ? "NO_DATA"
      : beStatus === "payment_verified" || beStatus === "eb_paid_to_mseb"
      ? "EB_PROCESSED"
      : "EB_UPLOADED";

  const eb = {
    wheelingCharges: report?.charges?.wheelingCharges?.amount,
    demandCharges: report?.charges?.demandCharges?.amount,
    energyCharges: report?.charges?.energyCharges?.amount,
    todTariffEc: report?.charges?.todTariffEc?.amount,
    fac: report?.charges?.fac?.amount,
    fixedCharges: report?.charges?.fixedCharges?.amount,
    electricityDuty: report?.charges?.electricityDuty?.amount,
    taxOnSale: report?.charges?.taxOnSale?.amount,
    chargesForExcessDemand: report?.charges?.chargesForExcessDemand?.amount,
    pfPenalCharges: report?.charges?.pfPenalCharges?.amount,
    debitBillAdjustment: report?.charges?.debitBillAdjustment?.amount,
    roundingOffCharges: report?.charges?.roundingOffCharges?.amount,
    meterRent: report?.charges?.meterRent?.amount,
    powerFactorAdjust: report?.charges?.powerFactorAdjustment?.amount,
    delayedPayment: report?.charges?.delayedPaymentCharges?.amount,
    regulatoryCharges: report?.charges?.regulatoryCharges?.amount,
    otherCharges: report?.extraCharges || [],
    totalBillAmount: report?.totalEBAmount,
  };

  const rd = report?.reportData || {};
  const hasReport = status === "EB_PROCESSED";
  const hasEB = status === "EB_UPLOADED" || hasReport;
  const paymentRecorded = ["payment_submitted", "payment_verified", "eb_paid_to_mseb"].includes(report?.status);

  return (
    <div className="viz-reports-shell">
      {/* ================================================================== */}
      {/* 1. FLUSH TOP HEADER (NO GAPS ON SIDES)                             */}
      {/* ================================================================== */}
      <header className="viz-reports-top-header">
        <div className="viz-reports-header-inner">
          <div className="viz-reports-brand-block">
            <div className="viz-reports-logo-box">
              
            </div>
            <div>
              <div className="viz-reports-header-title">
                VIZ-Smart Charging <span className="viz-reports-cpo-tag">Energy Bill</span>
              </div>
              <div className="viz-reports-header-sub">
                Monthly MSEB electricity breakdown
              </div>
            </div>
          </div>

          <div className="viz-reports-controls">
            {/* Project Pill if Available */}
            {report?.projectName && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(0, 210, 180, 0.15)",
                  color: "var(--viz-aqua-glow)",
                  border: "1px solid rgba(0, 210, 180, 0.3)",
                  borderRadius: 12,
                  padding: "4px 10px",
                  fontSize: 11.5,
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                }}
              >
                <LocationOnRoundedIcon sx={{ fontSize: 14 }} />
                <span>{report.projectName}</span>
              </div>
            )}

            {/* Integrated Month & Year Picker */}
            <div className="viz-period-pill-select">
              <select
                className="viz-reports-native-select"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                className="viz-reports-native-select"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={fetchReport}
              disabled={loading}
              className="viz-btn-icon-soft"
              title="Refresh Energy Bill"
            >
              <RefreshRoundedIcon sx={{ fontSize: 19 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. MAIN LAYOUT CONTAINER                                           */}
      {/* ================================================================== */}
      <main className="viz-reports-container">
        {err && (
          <Alert severity="error" sx={{ borderRadius: "14px", py: 0.5 }}>
            {err}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 9, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <CircularProgress sx={{ color: "var(--viz-aqua)" }} />
            <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "var(--viz-text-muted)" }}>
              Retrieving energy bill for {monthLabel(month, year)}…
            </Typography>
          </Box>
        ) : status === "NO_DATA" ? (
          <div className="viz-empty-card">
            <HourglassEmptyRoundedIcon sx={{ fontSize: 40, color: "var(--viz-teal-deep)" }} />
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, mt: 0.5 }}>
              Bill Not Yet Generated
            </Typography>
            <Typography sx={{ fontSize: 12, color: "var(--viz-text-muted)", maxWidth: 360, mx: "auto" }}>
              The MSEB electricity bill has not been processed for {monthLabel(month, year)}. Please check back soon.
            </Typography>
          </div>
        ) : hasEB && (
          <Stack spacing={1.5}>
            {/* ============================================================ */}
            {/* SECTION 1: AMOUNT DUE TO VJRA & BANK TRANSFER DETAILS       */}
            {/* ============================================================ */}
            <section className="viz-report-card">
              <div className="viz-report-header-bar">
                <span className="viz-report-heading">
                  <AccountBalanceRoundedIcon sx={{ color: "var(--viz-teal-deep)", fontSize: 20 }} />
                  Amount Payable to VJRA
                </span>
                <span className="viz-report-pill-tag">
                  {monthLabel(month, year)}
                </span>
              </div>

              {/* Due Amount Highlight Hero */}
              <div className="viz-due-hero-box">
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", color: "var(--viz-text-muted)" }}>
                    Fixed &amp; Owner-Borne Charges
                  </span>
                  <div className="viz-due-val">
                    {fmtMoney(report?.totalOwnerPayable)}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--viz-text-subtle)", fontWeight: 600 }}>
                    Please transfer this settlement amount before the cycle due date.
                  </span>
                </div>

                {paymentRecorded ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--viz-green-bg)",
                      color: "var(--viz-green-fg)",
                      padding: "8px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--viz-green-fg)",
                    }}
                  >
                    <CheckCircleRoundedIcon sx={{ fontSize: 20 }} />
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 12 }}>
                        Payment Recorded
                      </div>
                      {report?.ownerPayment?.txnId && (
                        <div style={{ fontSize: 10.5, opacity: 0.85, fontFamily: "monospace" }}>
                          Ref: {report.ownerPayment.txnId}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="viz-btn-record-payment"
                    onClick={() => {
                      setAmountPaid(String(report?.amountOwnerOwesVjra || report?.totalOwnerPayable || ""));
                      setTxnId("");
                      setPayErr(null);
                      setPaySuccess(false);
                      setPayDialog(true);
                    }}
                  >
                    Record Payment to VJRA
                  </button>
                )}
              </div>

              {/* Compact Bank Account Credentials Bento */}
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--viz-text-muted)", textTransform: "uppercase" }}>
                  VJRA Bank Account Details
                </span>

                <div className="viz-bank-details-grid" style={{ marginTop: 6 }}>
                  {[
                    { label: "Account Name", val: VJRA_BANK.accountName },
                    { label: "Bank Name", val: VJRA_BANK.bankName },
                    { label: "Account Number", val: VJRA_BANK.accountNumber },
                    { label: "IFSC Code", val: VJRA_BANK.ifsc },
                    { label: "Branch", val: VJRA_BANK.branch },
                    { label: "Account Type", val: VJRA_BANK.accountType },
                  ].map((b) => (
                    <div key={b.label} className="viz-bank-tile">
                      <div style={{ minWidth: 0 }}>
                        <div className="viz-bank-tile-lbl">{b.label}</div>
                        <div className="viz-bank-tile-val">{b.val}</div>
                      </div>
                      <Tooltip title={`Copy ${b.label}`} arrow>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(b.val, b.label)}
                          sx={{ p: 0.3, color: "var(--viz-teal-deep)" }}
                        >
                          <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ============================================================ */}
            {/* SECTION 2: MSEB ELECTRICITY BILL BREAKDOWN                   */}
            {/* ============================================================ */}
            <section className="viz-report-card">
              <div className="viz-report-header-bar">
                <span className="viz-report-heading">
                  <ReceiptLongRoundedIcon sx={{ color: "var(--viz-teal-deep)", fontSize: 20 }} />
                  MSEB Electricity Bill Breakdown
                </span>

                {report?.hasPdf && (
                  <button
                    type="button"
                    className="viz-btn-export mseb-pdf"
                    onClick={handleDownloadEbPdf}
                    disabled={dlEbPdf}
                  >
                    <PictureAsPdfRoundedIcon sx={{ fontSize: 15 }} />
                    <span>{dlEbPdf ? "Opening…" : "Download MSEB Bill PDF"}</span>
                  </button>
                )}
              </div>

              {/* Quick Summary Strip */}
              <div className="viz-mseb-summary-strip">
                <div className="viz-mseb-kpi-subcard">
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--viz-text-muted)", textTransform: "uppercase" }}>
                    Total MSEB Bill
                  </span>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.25rem", color: "var(--viz-text-main)", marginTop: 2 }}>
                    {fmtMoney(eb.totalBillAmount)}
                  </div>
                </div>

                <div className="viz-mseb-kpi-subcard">
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--viz-text-muted)", textTransform: "uppercase" }}>
                    Energy Charges (VJRA Bears)
                  </span>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.25rem", color: "var(--viz-teal-deep)", marginTop: 2 }}>
                    {fmtMoney(eb.energyCharges)}
                  </div>
                </div>

                <div className="viz-mseb-kpi-subcard">
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--viz-text-muted)", textTransform: "uppercase" }}>
                    Fixed Charges (Owner Bears)
                  </span>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.25rem", color: "var(--viz-orange)", marginTop: 2 }}>
                    {fmtMoney(report?.totalOwnerPayable)}
                  </div>
                </div>
              </div>

              {/* Non-Zero Line Items */}
              <div className="viz-charges-list">
                {[
                  { label: "Energy Charges", val: eb.energyCharges, note: "VJRA Component" },
                  { label: "TOD Tariff EC", val: eb.todTariffEc  },
                  { label: "Wheeling Charges", val: eb.wheelingCharges },
                  { label: "Demand Charges", val: eb.demandCharges },
                  { label: "FAC (Fuel Adjustment Charge)", val: eb.fac },
                  { label: "Fixed Charges", val: eb.fixedCharges },
                  { label: "Electricity Duty", val: eb.electricityDuty },
                  { label: "Tax on Sale", val: eb.taxOnSale },
                  { label: "Charges For Excess Demand", val: eb.chargesForExcessDemand },
                  { label: "P.F. Penal Charges", val: eb.pfPenalCharges },
                  { label: "Debit Bill Adjustment", val: eb.debitBillAdjustment },
                  { label: "Rounding Off Charges", val: eb.roundingOffCharges },
                  { label: "Meter Rent", val: eb.meterRent },
                  { label: "Power Factor Adjustment", val: eb.powerFactorAdjust },
                  { label: "Delayed Payment Charges", val: eb.delayedPayment },
                  { label: "Regulatory Charges", val: eb.regulatoryCharges },
                ]
                  .filter((item) => Number(item.val || 0) !== 0)
                  .map((item) => (
                    <div key={item.label} className="viz-charge-line">
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--viz-text-main)" }}>
                          {item.label}
                        </span>
                        {item.note && (
                          <span style={{ fontSize: 10, color: "var(--viz-text-subtle)", marginLeft: 6 }}>
                            ({item.note})
                          </span>
                        )}
                      </div>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>
                        {fmtMoney(item.val)}
                      </span>
                    </div>
                  ))}

                {(eb.otherCharges || []).map((o, idx) => (
                  <div key={idx} className="viz-charge-line">
                    <span style={{ fontWeight: 600 }}>{o.label}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>
                      {fmtMoney(o.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* ============================================================ */}
            {/* SECTION 3: MONTHLY REVENUE & NET PAYOUT WATERFALL            */}
            {/* ============================================================ */}
            {hasReport && (
              <section className="viz-report-card">
                <div className="viz-report-header-bar">
                  <span className="viz-report-heading">
                    <PaymentsRoundedIcon sx={{ color: "var(--viz-teal-deep)", fontSize: 20 }} />
                    Monthly Revenue &amp; Net Payout Statement
                  </span>
                </div>

                <div className="viz-revenue-waterfall-card">
                  <div className="viz-ledger-line">
                    <div className="viz-ledger-left">
                      <span className="viz-math-op plus">+</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>Total Revenue (incl. GST)</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem" }}>
                      {fmtMoney(rd.grossRevenue)}
                    </span>
                  </div>

                  <div className="viz-ledger-line">
                    <div className="viz-ledger-left">
                      <span className="viz-math-op minus">−</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>GST @ 18%</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--viz-orange-deep)" }}>
                      {fmtMoney(rd.gstAmount)}
                    </span>
                  </div>

                  <div className="viz-ledger-line">
                    <div className="viz-ledger-left">
                      <span className="viz-math-op minus">−</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>Energy Charges (VJRA Bears)</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--viz-teal-deep)" }}>
                      {fmtMoney(rd.energyChargesVjra)}
                    </span>
                  </div>

                  <div className="viz-ledger-line">
                    <div className="viz-ledger-left">
                      <span className="viz-math-op minus">−</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>Fixed Charges (Owner Bears)</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--viz-orange)" }}>
                      {fmtMoney(rd.fixedChargesOwner)}
                    </span>
                  </div>

                  <div className="viz-ledger-line">
                    <div className="viz-ledger-left">
                      <span className="viz-math-op minus">−</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>VJRA Platform Commission</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--viz-text-muted)" }}>
                      {fmtMoney(rd.vjraCommission)}
                    </span>
                  </div>

                  {/* Net Payout to Owner Hero Row */}
                  <div className="viz-final-payout-hero" style={{ marginTop: 6 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#93b7bd" }}>
                        Net Payout Credited to Owner
                      </span>
                      <div className="viz-final-payout-val">
                        {fmtMoney(rd.netPayout)}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: 999,
                        backgroundColor: "rgba(0, 210, 180, 0.2)",
                        color: "var(--viz-aqua-glow)",
                      }}
                    >
                      Settled
                    </span>
                  </div>
                </div>
              </section>
            )}

          </Stack>
        )}
      </main>

      {/* ================================================================== */}
      {/* RECORD PAYMENT DIALOG                                              */}
      {/* ================================================================== */}
      <Dialog
        open={payDialog}
        onClose={() => { if (!payLoading) setPayDialog(false); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            border: "1px solid var(--viz-border)",
            boxShadow: "0 10px 35px rgba(3, 18, 22, 0.18)",
            m: { xs: 1.5, sm: 2 },
          },
        }}
      >
        <Box sx={{ px: 2.5, py: 2, background: "linear-gradient(135deg, #072227 0%, #0d3840 100%)", color: "#fff" }}>
          <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 17, color: "var(--viz-aqua-glow)" }}>
            Record Payment to VJRA
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: "#93b7bd" }}>
            Submit bank transfer reference for verified reconciliation
          </Typography>
        </Box>

        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {paySuccess ? (
            <Stack alignItems="center" spacing={1.5} py={2}>
              <CheckCircleRoundedIcon sx={{ fontSize: 44, color: "var(--viz-green-fg)" }} />
              <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--viz-green-fg)" }}>
                Payment Recorded Successfully!
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2}>
              {payErr && (
                <Alert severity="error" sx={{ borderRadius: "10px", py: 0.3, fontSize: 12 }}>
                  {payErr}
                </Alert>
              )}

              <TextField
                label="Transaction / UTR Reference ID *"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                size="small"
                fullWidth
                placeholder="e.g. AXIS123456789"
              />

              <TextField
                label="Amount Paid (₹) *"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                size="small"
                fullWidth
                type="number"
              />
            </Stack>
          )}
        </DialogContent>

        {!paySuccess && (
          <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
            <Button
              onClick={() => setPayDialog(false)}
              disabled={payLoading}
              sx={{ textTransform: "none", fontWeight: 700, color: "var(--viz-text-muted)" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleRecordPayment}
              disabled={payLoading}
              className="viz-btn-record-payment"
            >
              {payLoading ? <CircularProgress size={16} color="inherit" /> : "Confirm Payment"}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2800}
        onClose={() => setSnack({ open: false, msg: "" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={snack.msg}
      />
    </div>
  );
}