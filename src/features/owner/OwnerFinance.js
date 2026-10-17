// src/features/owner/OwnerFinance.js

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/apiFetch";
import "./OwnerFinance.css";

import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

// Icons
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EvStationRoundedIcon from "@mui/icons-material/EvStationRounded";
import FlashOnRoundedIcon from "@mui/icons-material/FlashOnRounded";

// ------------------------------------------------------------
// DATE & FORMATTING HELPERS
// ------------------------------------------------------------

const currentMonthKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
};

const monthLabel = (value) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || "")) return value || "—";
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const money = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const number = (value, digits = 2) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });

const getBillBadge = (status) => {
  const map = {
    uploaded: { label: "Payment Pending", bg: "var(--viz-warn-bg)", fg: "var(--viz-warn-fg)" },
    payment_submitted: { label: "Verification Pending", bg: "var(--viz-teal-wash)", fg: "var(--viz-teal-deep)" },
    payment_verified: { label: "Verified", bg: "var(--viz-green-bg)", fg: "var(--viz-green-fg)" },
    eb_paid_to_mseb: { label: "MSEB Paid", bg: "var(--viz-green-bg)", fg: "var(--viz-green-fg)" },
    not_generated: { label: "Not Generated", bg: "var(--viz-teal-wash)", fg: "var(--viz-text-muted)" },
  };
  return map[status] || { label: status || "Unknown", bg: "var(--viz-teal-wash)", fg: "var(--viz-text-muted)" };
};

export default function OwnerFinance() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadFinance = useCallback(async (month, manual = false) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError("");
      const result = await apiFetch(
        `/api/owner/finance/monthly?month=${encodeURIComponent(month)}`
      );
      setFinance(result);
      if (result?.month && result.month !== month) {
        setSelectedMonth(result.month);
      }
    } catch (err) {
      setError(err?.message || "Could not load monthly settlement details.");
      setFinance(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFinance(selectedMonth);
  }, [selectedMonth, loadFinance]);

  const availableMonths = useMemo(() => {
    if (Array.isArray(finance?.availableMonths) && finance.availableMonths.length) {
      return finance.availableMonths;
    }
    return [selectedMonth];
  }, [finance, selectedMonth]);

  const totals = finance?.totals || {};
  const electricity = finance?.electricity || { applicable: false, projects: [] };
  const projects = Array.isArray(electricity.projects) ? electricity.projects : [];

  // Source-of-truth calculations
  const vjraPayout = useMemo(() => {
    if (
      !electricity.applicable ||
      !electricity.allBillsGenerated ||
      !projects.length ||
      !projects.every((p) => p.billGenerated)
    ) {
      return null;
    }

    const roundMoney = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
    const energyCharges = roundMoney(
      projects.reduce((sum, p) => sum + Number(p.energyCharges || 0), 0)
    );
    const fixedElectricityCharges = roundMoney(
      projects.reduce(
        (sum, p) => sum + Number(p.fixedElectricityCharges ?? p.ownerPayable ?? 0),
        0
      )
    );
    const totalMsebBill = roundMoney(
      projects.reduce((sum, p) => sum + Number(p.totalMsebBill || 0), 0)
    );
    const taxableAmount = Number(totals.taxableAmount || 0);
    const vjraMarginAmount = Number(totals.vjraMarginAmount || 0);
    const baseOwnerPayout = roundMoney(taxableAmount - vjraMarginAmount);
    const grossOwnerPayout = roundMoney(baseOwnerPayout - energyCharges);
    const netOwnerPayout = roundMoney(grossOwnerPayout - fixedElectricityCharges);

    return {
      taxableAmount,
      vjraMarginAmount,
      baseOwnerPayout,
      energyCharges,
      fixedElectricityCharges,
      totalMsebBill,
      grossOwnerPayout,
      netOwnerPayout,
    };
  }, [
    electricity.applicable,
    electricity.allBillsGenerated,
    projects,
    totals.taxableAmount,
    totals.vjraMarginAmount,
  ]);

  const handlePay = (project, month) => {
    navigate(
      `/owner/reports?project=${encodeURIComponent(project)}&month=${encodeURIComponent(month)}`
    );
  };

  return (
    <div className="viz-finance-shell">
      {/* ================================================================== */}
      {/* FLUSH TOP HEADER (ZERO SIDE GAPS)                                  */}
      {/* ================================================================== */}
      <header className="viz-finance-top-header">
        <div className="viz-finance-header-inner">
          <div className="viz-finance-brand-block">
            <div className="viz-finance-logo-box">
             
            </div>
            <div>
              <div className="viz-finance-header-title">
                VIZ-Smart Charging <span className="viz-finance-cpo-tag">Settlement</span>
              </div>
              <div className="viz-finance-header-sub">
                Station revenue, electricity reconciliation &amp; payouts
              </div>
            </div>
          </div>

          <div className="viz-finance-controls">
            <div className="viz-month-pill">
              <CalendarMonthRoundedIcon sx={{ color: "var(--viz-aqua)", fontSize: 18 }} />
              <select
                className="viz-month-native-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadFinance(selectedMonth, true)}
              disabled={loading || refreshing}
              className="viz-btn-icon-soft"
              title="Refresh Finance"
            >
              {refreshing ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <RefreshRoundedIcon sx={{ fontSize: 19 }} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN CONTAINER                                                     */}
      {/* ================================================================== */}
      <main className="viz-finance-container">
        {error && (
          <Alert severity="error" sx={{ borderRadius: "14px", py: 0.5 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 9, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <CircularProgress sx={{ color: "var(--viz-aqua)" }} />
            <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "var(--viz-text-muted)" }}>
              Loading settlement records…
            </Typography>
          </Box>
        ) : finance && (
          <>
            {/* ============================================================ */}
            {/* 1. TOP SECTION: REVENUE & BASE OWNER PAYOUT                  */}
            {/* ============================================================ */}
            <section className="viz-card-section">
              <div className="viz-section-header-bar">
                <span className="viz-section-heading">
                  <ReceiptLongRoundedIcon sx={{ color: "var(--viz-teal-deep)", fontSize: 20 }} />
                  Station Revenue &amp; Base Payout
                </span>
                <span className="viz-section-pill-tag">
                  {monthLabel(finance.month || selectedMonth)}
                </span>
              </div>

              {/* Top 3 Quick Figures */}
              <div className="viz-top-three-grid">
                <div className="viz-mini-kpi-box">
                  <span className="viz-kpi-sub-label">Gross Billing</span>
                  <div className="viz-kpi-sub-val" style={{ color: "var(--viz-orange)" }}>
                    {money(totals.totalAmount)}
                  </div>
                </div>

                <div className="viz-mini-kpi-box">
                  <span className="viz-kpi-sub-label">Energy Dispensed</span>
                  <div className="viz-kpi-sub-val" style={{ color: "var(--viz-teal-deep)" }}>
                    {number(totals.energyConsumed)} kWh
                  </div>
                </div>

                <div className="viz-mini-kpi-box">
                  <span className="viz-kpi-sub-label">GST Recorded</span>
                  <div className="viz-kpi-sub-val" style={{ color: "var(--viz-orange-deep)" }}>
                    {money(totals.gstAmount)}
                  </div>
                </div>
              </div>

              {/* Exact Formula Breakdown Box */}
              <div className="viz-math-equation-card">
                <div className="viz-ledger-line">
                  <div className="viz-ledger-left">
                    <span className="viz-math-operator plus">+</span>
                    <span className="viz-ledger-text">Taxable Amount</span>
                  </div>
                  <span className="viz-ledger-amount">
                    {money(totals.taxableAmount)}
                  </span>
                </div>

                <div className="viz-ledger-line">
                  <div className="viz-ledger-left">
                    <span className="viz-math-operator minus">−</span>
                    <span className="viz-ledger-text">VJRA Platform Margin</span>
                  </div>
                  <span className="viz-ledger-amount" style={{ color: "var(--viz-orange)" }}>
                    {money(totals.vjraMarginAmount)}
                  </span>
                </div>

                <div className="viz-highlight-result-row">
                  <div className="viz-ledger-left">
                    <span className="viz-math-operator equals">=</span>
                    <span className="viz-ledger-text" style={{ fontWeight: 800 }}>
                      Owner Payout
                    </span>
                  </div>
                  <span className="viz-ledger-amount">
                    {money(totals.ownerPayout)}
                  </span>
                </div>
              </div>
            </section>

            {/* ============================================================ */}
            {/* 2. SECTION 2: VJRA ELECTRICITY SETTLEMENT                    */}
            {/* ============================================================ */}
            {electricity.applicable && (
              <section className="viz-card-section">
                <div className="viz-section-header-bar">
                  <span className="viz-section-heading">
                    <FlashOnRoundedIcon sx={{ color: "var(--viz-teal-deep)", fontSize: 20 }} />
                    VJRA Electricity Reconciliation
                  </span>
                  <span className="viz-section-pill-tag">
                    VJRA-Borne Bearer
                  </span>
                </div>

                {vjraPayout ? (
                  <Stack spacing={1.2}>
                    {/* Step 1: Gross Owner Payout */}
                    <div className="viz-step-settle-card">
                      <div className="viz-ledger-line">
                        <div className="viz-ledger-left">
                          <span className="viz-math-operator plus">+</span>
                          <span className="viz-ledger-text">Owner Payout</span>
                        </div>
                        <span className="viz-ledger-amount">
                          {money(vjraPayout.baseOwnerPayout)}
                        </span>
                      </div>

                      <div className="viz-ledger-line">
                        <div className="viz-ledger-left">
                          <span className="viz-math-operator minus">−</span>
                          <span className="viz-ledger-text">Electricity Charges (VJRA Component)</span>
                        </div>
                        <span className="viz-ledger-amount" style={{ color: "var(--viz-orange)" }}>
                          {money(vjraPayout.energyCharges)}
                        </span>
                      </div>

                      <div className="viz-highlight-result-row" style={{ background: "#ffffff" }}>
                        <div className="viz-ledger-left">
                          <span className="viz-math-operator equals">=</span>
                          <span className="viz-ledger-text" style={{ fontWeight: 800 }}>
                            Gross Owner Payout
                          </span>
                        </div>
                        <span className="viz-ledger-amount">
                          {money(vjraPayout.grossOwnerPayout)}
                        </span>
                      </div>
                    </div>

                    {/* Step 2: Net Owner Settlement */}
                    <div className="viz-step-settle-card">
                      <div className="viz-ledger-line">
                        <div className="viz-ledger-left">
                          <span className="viz-math-operator plus">+</span>
                          <span className="viz-ledger-text">Gross Owner Payout</span>
                        </div>
                        <span className="viz-ledger-amount">
                          {money(vjraPayout.grossOwnerPayout)}
                        </span>
                      </div>

                      <div className="viz-ledger-line">
                        <div className="viz-ledger-left">
                          <span className="viz-math-operator minus">−</span>
                          <span className="viz-ledger-text">Fixed Charges (Owner Component)</span>
                        </div>
                        <span className="viz-ledger-amount" style={{ color: "var(--viz-orange-deep)" }}>
                          {money(vjraPayout.fixedElectricityCharges)}
                        </span>
                      </div>

                      {/* Final Net Owner Settlement Highlight Hero */}
                      <div className="viz-final-settlement-hero">
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#93b7bd" }}>
                            Final Net Settlement
                          </span>
                          <div className="viz-hero-settle-val">
                            {money(vjraPayout.netOwnerPayout)}
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
                          Net Payable
                        </span>
                      </div>
                    </div>
                  </Stack>
                ) : (
                  <Alert severity="warning" sx={{ borderRadius: "12px", fontSize: 12 }}>
                    Electricity bills are pending generation for one or more projects this month. Settlement figures will calculate automatically.
                  </Alert>
                )}
              </section>
            )}

            {/* ============================================================ */}
            {/* 3. SECTION 3: MSEB ELECTRICITY BREAKDOWN                     */}
            {/* ============================================================ */}
            {electricity.applicable && (
              <section className="viz-card-section">
                <div className="viz-section-header-bar">
                  <span className="viz-section-heading">
                    <EvStationRoundedIcon sx={{ color: "var(--viz-teal-deep)", fontSize: 20 }} />
                    MSEB Bill Breakdown
                  </span>
                  <span className="viz-section-pill-tag">
                    {projects.length} Project{projects.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* MSEB Aggregate 3-Grid */}
                <div className="viz-mseb-three-grid">
                  <div className="viz-mseb-kpi-tile">
                    <span className="viz-kpi-sub-label">Total MSEB Bill</span>
                    <div className="viz-kpi-sub-val" style={{ color: "var(--viz-text-main)" }}>
                      {money(vjraPayout ? vjraPayout.totalMsebBill : 0)}
                    </div>
                  </div>

                  <div className="viz-mseb-kpi-tile">
                    <span className="viz-kpi-sub-label">Energy Charges</span>
                    <div className="viz-kpi-sub-val" style={{ color: "var(--viz-teal-deep)" }}>
                      {money(vjraPayout ? vjraPayout.energyCharges : 0)}
                    </div>
                  </div>

                  <div className="viz-mseb-kpi-tile">
                    <span className="viz-kpi-sub-label">Fixed Charges</span>
                    <div className="viz-kpi-sub-val" style={{ color: "var(--viz-orange)" }}>
                      {money(vjraPayout ? vjraPayout.fixedElectricityCharges : 0)}
                    </div>
                  </div>
                </div>

                {/* Individual Project Items */}
                <Stack spacing={1}>
                  {projects.map((project) => {
                    const badge = getBillBadge(project.status);

                    return (
                      <div key={`${project.project}-${finance.month}`} className="viz-project-item-box">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.98rem" }}>
                              {project.project}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--viz-text-muted)", fontWeight: 600 }}>
                              {project.deviceCount} device{project.deviceCount === 1 ? "" : "s"} • {monthLabel(finance.month || selectedMonth)}
                            </div>
                          </div>

                          <span
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: 999,
                              backgroundColor: badge.bg,
                              color: badge.fg,
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {project.billGenerated ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 4 }}>
                            <div>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--viz-text-muted)", textTransform: "uppercase" }}>
                                Total Bill
                              </span>
                              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.92rem" }}>
                                {money(project.totalMsebBill)}
                              </div>
                            </div>

                            <div>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--viz-text-muted)", textTransform: "uppercase" }}>
                                Energy (VJRA)
                              </span>
                              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.92rem", color: "var(--viz-teal-deep)" }}>
                                {money(project.energyCharges)}
                              </div>
                            </div>

                            <div>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--viz-text-muted)", textTransform: "uppercase" }}>
                                Fixed (Owner)
                              </span>
                              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.92rem", color: "var(--viz-orange)" }}>
                                {money(project.fixedElectricityCharges)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11.5, color: "var(--viz-text-muted)" }}>
                            Bill details pending for this cycle.
                          </span>
                        )}

                        {project.canPay && (
                          <button
                            type="button"
                            className="viz-btn-pay-action"
                            onClick={() => handlePay(project.project, finance.month || selectedMonth)}
                          >
                            Pay Fixed Charges
                          </button>
                        )}
                      </div>
                    );
                  })}
                </Stack>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}