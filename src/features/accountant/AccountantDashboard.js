// src/features/accountant/AccountantDashboard.js
// CA Portal — Financial Analytics Dashboard
// Accessible only to role: "accountant" and "admin"

import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmtDateOnly = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const PERIOD_OPTIONS = [
  { value: "today",       label: "Today" },
  { value: "month",       label: "This Month" },
  { value: "quarter_fy",  label: "This Quarter" },
  { value: "fy",          label: "Current FY" },
];

const PAYMENT_LABELS = {
  cashfree: { label: "Cashfree", color: "#0066FF" },
  wallet:   { label: "Wallet",   color: "#16A34A" },
  free:     { label: "Free",     color: "#9333EA" },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon, color, live }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E5E7EB",
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      position: "relative",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      {live && (
        <span style={{
          position: "absolute", top: 14, right: 14,
          background: "#DCFCE7", color: "#16A34A",
          fontSize: 10, fontWeight: 700, padding: "2px 8px",
          borderRadius: 999, letterSpacing: "0.05em",
        }}>● LIVE</span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{title}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#111827", letterSpacing: "-0.5px" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#9CA3AF" }}>{sub}</div>}
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({ period, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {PERIOD_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "7px 18px",
            borderRadius: 8,
            border: period === opt.value ? "none" : "1px solid #D1D5DB",
            background: period === opt.value ? "#1D4ED8" : "#fff",
            color:      period === opt.value ? "#fff"    : "#374151",
            fontWeight: period === opt.value ? 600 : 400,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AccountantDashboard() {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");
  const [kpi,       setKpi]       = useState(null);
  const [kpiLoad,   setKpiLoad]   = useState(true);

  // Invoice Register state
  const [invPeriod,  setInvPeriod]  = useState("fy");
  const [invPage,    setInvPage]    = useState(1);
  const [invSearch,  setInvSearch]  = useState("");
  const [invData,    setInvData]    = useState(null);
  const [invLoad,    setInvLoad]    = useState(false);

  // Topups state
  const [topPeriod, setTopPeriod] = useState("fy");
  const [topPage,   setTopPage]   = useState(1);
  const [topData,   setTopData]   = useState(null);
  const [topLoad,   setTopLoad]   = useState(false);

  const liveTimer = useRef(null);

  // ── Fetch KPIs ─────────────────────────────────────────────────────────────
  const fetchKpi = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/accountant/summary`, { headers });
      setKpi(data);
    } catch (e) {
      console.error("KPI fetch error", e);
    } finally {
      setKpiLoad(false);
    }
  }, []);

  // Live poll for KPIs every 30s
  useEffect(() => {
    fetchKpi();
    liveTimer.current = setInterval(fetchKpi, 30000);
    return () => clearInterval(liveTimer.current);
  }, [fetchKpi]);

  // ── Fetch Invoice Register ─────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setInvLoad(true);
    try {
      const { data } = await axios.get(`${API}/api/accountant/invoices`, {
        headers,
        params: { period: invPeriod, page: invPage, limit: 50, search: invSearch || undefined },
      });
      setInvData(data);
    } catch (e) {
      console.error("Invoice fetch error", e);
    } finally {
      setInvLoad(false);
    }
  }, [invPeriod, invPage, invSearch]);

  useEffect(() => {
    if (activeTab === "invoices") fetchInvoices();
  }, [activeTab, fetchInvoices]);

  // ── Fetch Topups ───────────────────────────────────────────────────────────
  const fetchTopups = useCallback(async () => {
    setTopLoad(true);
    try {
      const { data } = await axios.get(`${API}/api/accountant/wallet-topups`, {
        headers,
        params: { period: topPeriod, page: topPage, limit: 50 },
      });
      setTopData(data);
    } catch (e) {
      console.error("Topups fetch error", e);
    } finally {
      setTopLoad(false);
    }
  }, [topPeriod, topPage]);

  useEffect(() => {
    if (activeTab === "topups") fetchTopups();
  }, [activeTab, fetchTopups]);

  // ── Excel Export ───────────────────────────────────────────────────────────
  const handleExport = async (period) => {
    try {
      const res = await fetch(`${API}/api/accountant/export?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Sparx_CA_${period}_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed. Please try again.");
    }
  };

  // ── Tab style ──────────────────────────────────────────────────────────────
  const tabStyle = (t) => ({
    padding: "10px 22px",
    borderBottom: activeTab === t ? "2px solid #1D4ED8" : "2px solid transparent",
    color:        activeTab === t ? "#1D4ED8" : "#6B7280",
    fontWeight:   activeTab === t ? 700 : 400,
    background: "none", border: "none",
    borderBottom: activeTab === t ? "2px solid #1D4ED8" : "2px solid transparent",
    cursor: "pointer", fontSize: 14, transition: "all 0.15s",
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#F9FAFB", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #E5E7EB",
        padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 60,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #1D4ED8, #06B6D4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 16,
          }}>S</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Sparx EV</div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>CA Portal — Financial Analytics</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>
          {kpi?.fyLabel && <span>📅 {kpi.fyLabel}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 32px", display: "flex", gap: 4 }}>
        {[
          { key: "overview", label: "📊 Overview" },
          { key: "invoices", label: "🧾 Invoice Register" },
          { key: "topups",   label: "💳 Wallet Topups" },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={tabStyle(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ── TAB: OVERVIEW ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Wallet Summary</h2>
              <p style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>
                Cards 1 & 2 are locked to Current Financial Year. Cards 3 & 4 are live.
              </p>
            </div>

            {kpiLoad ? (
              <div style={{ color: "#9CA3AF", padding: 40, textAlign: "center" }}>Loading...</div>
            ) : kpi ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>

                <KpiCard
                  icon="📥"
                  title={`Total Wallet Topup — ${kpi.fyLabel}`}
                  value={fmt(kpi.totalTopup.amount)}
                  sub={`${kpi.totalTopup.count} topup transactions`}
                  color="#1D4ED8"
                />

                <KpiCard
                  icon="⚡"
                  title={`Actual Wallet Consumption — ${kpi.fyLabel}`}
                  value={fmt(kpi.totalConsumption.amount)}
                  sub={`${kpi.totalConsumption.count} charging sessions via wallet`}
                  color="#DC2626"
                />

                <KpiCard
                  icon="💰"
                  title="Live Wallet Balance (All Users)"
                  value={fmt(kpi.liveWalletBalance.totalFloat)}
                  sub={`Across ${kpi.liveWalletBalance.userCount} users with balance`}
                  color="#059669"
                  live
                />

                <KpiCard
                  icon="🔌"
                  title="Live Session Amount (Wallet)"
                  value={fmt(kpi.liveSessionAmount.totalAmountUsed)}
                  sub={`${kpi.liveSessionAmount.activeSessions} active wallet-paid sessions`}
                  color="#7C3AED"
                  live
                />

              </div>
            ) : (
              <div style={{ color: "#EF4444" }}>Failed to load KPIs.</div>
            )}

            {/* Quick export section */}
            <div style={{ marginTop: 40 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
                📥 Download Excel Reports
              </h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleExport(opt.value)}
                    style={{
                      padding: "10px 20px",
                      background: "#fff",
                      border: "1px solid #D1D5DB",
                      borderRadius: 8,
                      fontSize: 13, color: "#374151",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    📊 {opt.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 10 }}>
                Each export includes: Invoice Register, Wallet Topups, Charging Debits, GSTR-1 Summary (4 sheets)
              </p>
            </div>
          </>
        )}

        {/* ── TAB: INVOICE REGISTER ─────────────────────────────────────────── */}
        {activeTab === "invoices" && (
          <>
            {/* Top bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Invoice Register</h2>
                {invData && (
                  <p style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>
                    {invData.total} invoices · {invData.period?.label}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleExport(invPeriod)}
                style={{
                  padding: "10px 20px",
                  background: "#16A34A", color: "#fff",
                  border: "none", borderRadius: 8,
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                ⬇️ Download Excel
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <FilterBar period={invPeriod} onChange={(p) => { setInvPeriod(p); setInvPage(1); }} />
              <input
                placeholder="Search invoice, name, mobile, GSTIN..."
                value={invSearch}
                onChange={e => { setInvSearch(e.target.value); setInvPage(1); }}
                onKeyDown={e => e.key === "Enter" && fetchInvoices()}
                style={{
                  padding: "7px 14px", border: "1px solid #D1D5DB",
                  borderRadius: 8, fontSize: 13, width: 280,
                  outline: "none",
                }}
              />
              <button
                onClick={fetchInvoices}
                style={{ padding: "7px 16px", background: "#1D4ED8", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              >Search</button>
            </div>

            {/* Period totals */}
            {invData?.periodTotals && (
              <div style={{
                background: "#EFF6FF", border: "1px solid #BFDBFE",
                borderRadius: 10, padding: "12px 20px",
                display: "flex", gap: 32, flexWrap: "wrap",
                fontSize: 13, color: "#1E40AF", marginBottom: 16,
              }}>
                <span><strong>Taxable:</strong> {fmt(invData.periodTotals.taxableAmount)}</span>
                <span><strong>GST:</strong> {fmt(invData.periodTotals.gstAmount)}</span>
                <span><strong>Total:</strong> {fmt(invData.periodTotals.totalAmount)}</span>
                <span><strong>Discount:</strong> {fmt(invData.periodTotals.discounts)}</span>
                <span><strong>Refunds:</strong> {fmt(invData.periodTotals.refunds)}</span>
                <span><strong>Invoices:</strong> {invData.periodTotals.count}</span>
              </div>
            )}

            {/* Table */}
            {invLoad ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", padding: 60 }}>Loading invoices...</div>
            ) : invData?.data?.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", padding: 60 }}>No invoices found for this period.</div>
            ) : (
              <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F3F4F6", borderBottom: "1px solid #E5E7EB" }}>
                      {["Invoice No.", "Date", "Name", "Mobile", "GSTIN", "Place of Supply", "Type", "Payment", "Taxable (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "GST Total (₹)", "Discount (₹)", "Total (₹)"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#374151", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invData.data.map((inv, i) => (
                      <tr key={inv.invoiceNo} style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1D4ED8", whiteSpace: "nowrap" }}>{inv.invoiceNo}</td>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "#374151" }}>{fmtDateOnly(inv.date)}</td>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>{inv.customerName}</td>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "#6B7280" }}>{inv.customerMobile}</td>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: inv.customerGstin ? "#059669" : "#D1D5DB" }}>
                          {inv.customerGstin || "—"}
                        </td>
                        <td style={{ padding: "9px 12px" }}>{inv.placeOfSupply}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{
                            background: inv.invoiceType === "B2B" ? "#DBEAFE" : "#F3F4F6",
                            color:      inv.invoiceType === "B2B" ? "#1D4ED8" : "#6B7280",
                            padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                          }}>{inv.invoiceType}</span>
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{
                            background: "#F0FDF4",
                            color: PAYMENT_LABELS[inv.paymentMode]?.color || "#374151",
                            padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                          }}>{PAYMENT_LABELS[inv.paymentMode]?.label || inv.paymentMode}</span>
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace" }}>{fmt(inv.taxableAmount)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", color: "#6B7280" }}>{inv.cgst > 0 ? fmt(inv.cgst) : "—"}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", color: "#6B7280" }}>{inv.sgst > 0 ? fmt(inv.sgst) : "—"}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", color: "#6B7280" }}>{inv.igst > 0 ? fmt(inv.igst) : "—"}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", color: "#DC2626" }}>{fmt(inv.totalGst)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", color: inv.discount > 0 ? "#7C3AED" : "#D1D5DB" }}>{inv.discount > 0 ? fmt(inv.discount) : "—"}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(inv.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {invData && invData.totalPages > 1 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
                <button
                  disabled={invPage === 1}
                  onClick={() => setInvPage(p => p - 1)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #D1D5DB", cursor: "pointer", background: "#fff" }}
                >← Prev</button>
                <span style={{ padding: "7px 14px", fontSize: 13, color: "#374151" }}>
                  Page {invPage} of {invData.totalPages}
                </span>
                <button
                  disabled={invPage === invData.totalPages}
                  onClick={() => setInvPage(p => p + 1)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #D1D5DB", cursor: "pointer", background: "#fff" }}
                >Next →</button>
              </div>
            )}
          </>
        )}

        {/* ── TAB: WALLET TOPUPS ────────────────────────────────────────────── */}
        {activeTab === "topups" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Wallet Topup Ledger</h2>
                {topData && (
                  <p style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>
                    {topData.total} transactions · {topData.period?.label}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleExport(topPeriod)}
                style={{
                  padding: "10px 20px", background: "#16A34A", color: "#fff",
                  border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >⬇️ Download Excel</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <FilterBar period={topPeriod} onChange={(p) => { setTopPeriod(p); setTopPage(1); }} />
            </div>

            {topLoad ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", padding: 60 }}>Loading...</div>
            ) : topData?.data?.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", padding: 60 }}>No topups found for this period.</div>
            ) : (
              <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F3F4F6", borderBottom: "1px solid #E5E7EB" }}>
                      {["Date & Time", "Customer Name", "Mobile", "Amount (₹)", "Bal. Before (₹)", "Bal. After (₹)", "Cashfree Order ID"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#374151", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topData.data.map((t, i) => (
                      <tr key={t._id} style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>{fmtDate(t.date)}</td>
                        <td style={{ padding: "9px 12px" }}>{t.userName}</td>
                        <td style={{ padding: "9px 12px", color: "#6B7280" }}>{t.userMobile}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#16A34A" }}>{fmt(t.amount)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", color: "#9CA3AF" }}>{fmt(t.balanceBefore)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace" }}>{fmt(t.balanceAfter)}</td>
                        <td style={{ padding: "9px 12px", color: "#6B7280", fontSize: 11, fontFamily: "monospace" }}>{t.orderId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {topData && topData.totalPages > 1 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
                <button disabled={topPage===1} onClick={()=>setTopPage(p=>p-1)}
                  style={{ padding:"7px 14px",borderRadius:8,border:"1px solid #D1D5DB",cursor:"pointer",background:"#fff" }}>← Prev</button>
                <span style={{ padding:"7px 14px",fontSize:13,color:"#374151" }}>Page {topPage} of {topData.totalPages}</span>
                <button disabled={topPage===topData.totalPages} onClick={()=>setTopPage(p=>p+1)}
                  style={{ padding:"7px 14px",borderRadius:8,border:"1px solid #D1D5DB",cursor:"pointer",background:"#fff" }}>Next →</button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}