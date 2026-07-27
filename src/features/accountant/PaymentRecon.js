import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("adminToken") ||
    ""
  );
}

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const PERIOD_OPTIONS = [
  { value: "today",      label: "Today" },
  { value: "month",      label: "This Month" },
  { value: "quarter_fy", label: "This Quarter" },
  { value: "fy",         label: "Current FY" },
];

const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", border: "#E4E7EC", borderMid: "#D0D5DD",
  text: "#101828", textMid: "#344054", textMuted: "#667085", textFaint: "#98A2B3",
  primary: "#1a56db", success: "#057a55", error: "#b91c1c", warning: "#b45309",
  radius: "10px", radiusLg: "14px",
  shadow: "0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)",
  shadowMd: "0 4px 16px rgba(16,24,40,0.08)",
  font: "'Inter', 'Segoe UI', system-ui, sans-serif",
};

const styles = `
  .pr-wrap * { box-sizing: border-box; }
  .pr-wrap { font-family: ${T.font}; color: ${T.text}; }

  /* KPI */
  .pr-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(200px,100%), 1fr)); gap: 14px; margin-bottom: 24px; }
  .pr-kpi { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: ${T.radiusLg}; padding: 16px 18px; box-shadow: ${T.shadow}; }
  .pr-kpi-cat { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; opacity: 0.7; }
  .pr-kpi-label { font-size: 11px; font-weight: 600; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
  .pr-kpi-value { font-size: 19px; font-weight: 700; letter-spacing: -0.4px; line-height: 1.1; margin-bottom: 4px; }
  .pr-kpi-sub { font-size: 11px; color: ${T.textMuted}; }

  /* Recon alert */
  .pr-recon-alert {
    border-radius: ${T.radius}; padding: 14px 20px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  }
  .pr-recon-alert.balanced   { background: #f0fdf4; border: 1px solid #bbf7d0; color: #065f46; }
  .pr-recon-alert.warning    { background: #fffbeb; border: 1px solid #fcd34d; color: #78350f; }
  .pr-recon-alert.error      { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
  .pr-recon-icon { font-size: 22px; flex-shrink: 0; }
  .pr-recon-title { font-weight: 700; font-size: 14px; }
  .pr-recon-body  { font-size: 12px; margin-top: 2px; }

  /* Recon comparison table */
  .pr-cmp-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
  .pr-cmp-table th { background: #1e3a5f; color: #fff; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; }
  .pr-cmp-table td { padding: 10px 16px; border-bottom: 1px solid ${T.border}; }
  .pr-cmp-table td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'SF Mono', monospace; }
  .pr-cmp-table tr.diff-row td { font-weight: 700; background: #fef3c7; color: #92400e; }
  .pr-cmp-table tr.total-row td { font-weight: 700; background: #f0f9ff; }

  /* Settlements list */
  .pr-table-wrap { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: ${T.radiusLg}; overflow-x: auto; box-shadow: ${T.shadow}; margin-bottom: 20px; }
  .pr-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .pr-table thead tr { background: #F9FAFB; border-bottom: 1px solid ${T.border}; }
  .pr-table thead th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: ${T.textMuted}; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.04em; }
  .pr-table tbody tr { border-bottom: 1px solid #F2F4F7; transition: background 0.1s; }
  .pr-table tbody tr:last-child { border-bottom: none; }
  .pr-table tbody tr:hover { background: #F9FAFB; }
  .pr-table td { padding: 10px 14px; color: ${T.textMid}; vertical-align: middle; }
  .pr-table td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'SF Mono', monospace; }
  .pr-table td.muted { color: ${T.textFaint}; }

  .pr-badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.6; }

  /* Drill-down modal */
  .pr-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 900;
    display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; overflow-y: auto;
  }
  .pr-modal {
    background: ${T.surface}; border-radius: ${T.radiusLg}; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
    width: 100%; max-width: 1100px; max-height: 90vh; overflow-y: auto;
    animation: slideUp 0.2s ease;
  }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
  .pr-modal-header {
    padding: 18px 24px; border-bottom: 1px solid ${T.border};
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; position: sticky; top: 0; background: ${T.surface}; z-index: 10;
  }
  .pr-modal-body { padding: 20px 24px; }
  .pr-modal-close {
    background: none; border: none; cursor: pointer; font-size: 22px; color: ${T.textMuted};
    line-height: 1; padding: 0 4px; transition: color 0.15s;
  }
  .pr-modal-close:hover { color: ${T.error}; }

  /* Status indicators */
  .pr-status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .pr-status-dot.matched   { background: ${T.success}; }
  .pr-status-dot.unmatched { background: ${T.error}; }
  .pr-status-dot.warning   { background: ${T.warning}; }

  /* Filters */
  .pr-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  .pr-period-btn {
    padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 500;
    cursor: pointer; border: 1px solid ${T.borderMid}; background: ${T.surface}; color: ${T.textMid}; transition: all 0.15s;
  }
  .pr-period-btn.active { background: ${T.primary}; border-color: ${T.primary}; color: #fff; font-weight: 600; }

  /* Buttons */
  .pr-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap; }
  .pr-btn:active { transform: scale(0.98); }
  .pr-btn-ghost   { background: transparent; border: 1px solid ${T.borderMid}; color: ${T.textMid}; }
  .pr-btn-ghost:hover { background: ${T.bg}; }
  .pr-btn-primary { background: ${T.primary}; color: #fff; }
  .pr-btn-primary:hover { background: #1648c0; }
  .pr-btn-sm { padding: 5px 10px; font-size: 11px; border-radius: 6px; }
  .pr-btn-info { background: #eff6ff; color: ${T.primary}; border: 1px solid #bfdbfe; }
  .pr-btn-info:hover { background: #dbeafe; }

  /* Error */
  .pr-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: ${T.radius}; padding: 12px 18px; color: #991b1b; font-size: 13px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }

  /* Empty */
  .pr-empty { padding: 60px 24px; text-align: center; color: ${T.textFaint}; font-size: 13px; }
  .pr-empty-icon { font-size: 32px; margin-bottom: 12px; }

  /* Skel */
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .pr-skel { background: linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite; border-radius: 6px; }

  .pr-section-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
  .pr-section-title { font-size: 16px; font-weight: 700; color: ${T.text}; margin: 0; }
  .pr-section-sub { font-size: 12px; color: ${T.textMuted}; margin-top: 3px; }

  .pr-pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
  .pr-page-btn { padding: 6px 14px; border-radius: 8px; font-size: 12px; border: 1px solid ${T.borderMid}; background: ${T.surface}; cursor: pointer; color: ${T.textMid}; font-weight: 500; transition: all 0.15s; }
  .pr-page-btn:hover:not(:disabled) { background: #eff6ff; border-color: #93c5fd; color: ${T.primary}; }
  .pr-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .pr-page-info { font-size: 12px; color: ${T.textMuted}; }

  .pr-divider { border: none; border-top: 1px solid ${T.border}; margin: 22px 0; }

  @media (max-width: 640px) {
    .pr-modal { max-height: 95vh; }
    .pr-modal-overlay { padding: 10px 8px; }
  }
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonKpi() {
  return (
    <div className="pr-kpi">
      <div className="pr-skel" style={{ height: 9, width: "40%", marginBottom: 6 }} />
      <div className="pr-skel" style={{ height: 11, width: "60%", marginBottom: 12 }} />
      <div className="pr-skel" style={{ height: 22, width: "70%", marginBottom: 8 }} />
      <div className="pr-skel" style={{ height: 10, width: "50%" }} />
    </div>
  );
}

// ─── Recon Status Alert ───────────────────────────────────────────────────────
function ReconAlert({ recon, cf, local }) {
  if (!recon) return null;
  const cls = recon.isBalanced ? "balanced" : recon.withinTolerance ? "warning" : "error";
  const icon = recon.isBalanced ? "✅" : recon.withinTolerance ? "⚠️" : "❌";
  return (
    <div className={`pr-recon-alert ${cls}`}>
      <span className="pr-recon-icon">{icon}</span>
      <div>
        <div className="pr-recon-title">
          {recon.isBalanced
            ? "Reconciliation Balanced — Cashfree settlements match your invoices"
            : recon.withinTolerance
            ? `Near-Balanced — Difference of ${fmt(Math.abs(recon.diffAmount))} (within ₹1 tolerance, likely rounding)`
            : `Reconciliation Gap — Difference of ${fmt(Math.abs(recon.diffAmount))}`
          }
        </div>
        <div className="pr-recon-body">
          Cashfree settled {fmt(cf?.totalSettled)} across {cf?.settlementCount} batches ·
          Your invoices expected net {fmt(local?.netExpected)} (billed {fmt(local?.totalBilled)} − PG {fmt(local?.totalPgCharges)} − refunds {fmt(local?.totalRefunds)})
        </div>
      </div>
    </div>
  );
}

// ─── Settlement Drill-Down Modal ───────────────────────────────────────────────
function SettlementDrillDown({ settlement, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [cursor,  setCursor]  = useState(null);
  const [allOrders, setAllOrders] = useState([]);

  const fetchOrders = useCallback(async (cur = null) => {
    setLoading(true); setError(null);
    try {
      const { data: d } = await axios.get(
        `${API}/api/accountant/settlements/${settlement.cf_settlement_id || settlement.id}/orders`,
        { headers: { Authorization: `Bearer ${getToken()}` }, params: { cursor: cur || undefined, limit: 50 } }
      );
      setData(d);
      setAllOrders(prev => cur ? [...prev, ...(d.orders || [])] : (d.orders || []));
      setCursor(d.cursor || null);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load settlement orders");
    } finally {
      setLoading(false);
    }
  }, [settlement]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div className="pr-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pr-modal">
        <div className="pr-modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Settlement #{settlement.cf_settlement_id || settlement.id} — Drill-Down
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
              {fmtDate(settlement.settlement_date)} · UTR: <span style={{ fontFamily: "monospace" }}>{settlement.utr || settlement.settlement_utr || "—"}</span> · {fmt(settlement.settlement_amount)} credited
            </div>
          </div>
          <button className="pr-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="pr-modal-body">
          {error && <div className="pr-error">{error} <button className="pr-btn pr-btn-ghost" onClick={() => fetchOrders()}>Retry</button></div>}

          {/* Recon summary for this settlement */}
          {data?.recon && (
            <div style={{ background: data.recon.isBalanced ? "#f0fdf4" : "#fef2f2", border: `1px solid ${data.recon.isBalanced ? "#bbf7d0" : "#fecaca"}`, borderRadius: T.radius, padding: "12px 18px", marginBottom: 18, fontSize: 13 }}>
              <strong>Recon for this batch:</strong>&nbsp;
              {data.recon.cfOrderCount} orders in Cashfree ·&nbsp;
              {data.recon.localMatchCount} matched in Sparx DB ·&nbsp;
              {data.recon.unmatchedCount > 0
                ? <span style={{ color: T.error }}>{data.recon.unmatchedCount} unmatched</span>
                : <span style={{ color: T.success }}>All matched</span>
              }
              &nbsp;· CF Total: <strong>{fmt(data.recon.cfTotalAmount)}</strong>
              &nbsp;· Sparx Total: <strong>{fmt(data.recon.localTotalAmount)}</strong>
              {data.recon.diffAmount !== 0 && (
                <span style={{ color: T.error }}>&nbsp;· Diff: {fmt(data.recon.diffAmount)}</span>
              )}
            </div>
          )}

          {loading && !allOrders.length ? (
            <div className="pr-empty"><div>Loading settlement orders…</div></div>
          ) : allOrders.length === 0 ? (
            <div className="pr-empty">
              <div className="pr-empty-icon">📭</div>
              <div>No orders found in this settlement batch.</div>
            </div>
          ) : (
            <>
              <div className="pr-table-wrap">
                <table className="pr-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>CF Order ID</th>
                      <th>CF Payment ID</th>
                      <th>Order Date</th>
                      <th>CF Amount (₹)</th>
                      <th>Sparx Invoice</th>
                      <th>Sparx Amount (₹)</th>
                      <th>Diff (₹)</th>
                      <th>Payment Mode</th>
                      <th>Entity Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.map((o, i) => {
                      const receipt   = o._receipt;
                      const matched   = !!receipt;
                      const cfAmt     = o.order_amount || 0;
                      const localAmt  = receipt?.totalAmount || 0;
                      const diff      = +(cfAmt - localAmt).toFixed(2);
                      return (
                        <tr key={o.order_id || i}>
                          <td>
                            <span className={`pr-status-dot ${matched ? "matched" : "unmatched"}`} />
                            <span style={{ fontSize: 11, color: matched ? T.success : T.error }}>
                              {matched ? "Matched" : "Unmatched"}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, fontFamily: "monospace", color: T.primary }}>{o.order_id || "—"}</td>
                          <td style={{ fontSize: 11, fontFamily: "monospace", color: T.textMuted }}>{o.cf_payment_id || "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(o.order_date || o.created_at)}</td>
                          <td className="num" style={{ fontWeight: 600 }}>{fmt(cfAmt)}</td>
                          <td style={{ fontSize: 11, color: matched ? T.success : T.textFaint }}>
                            {receipt ? receipt.receiptId : "—"}
                          </td>
                          <td className="num">{matched ? fmt(localAmt) : "—"}</td>
                          <td className="num" style={{ color: diff !== 0 ? T.error : T.textFaint, fontWeight: diff !== 0 ? 700 : 400 }}>
                            {matched ? (diff !== 0 ? fmt(diff) : "✓") : "—"}
                          </td>
                          <td>
                            <span className="pr-badge" style={{ background: "#eff6ff", color: T.primary, fontSize: 10 }}>
                              {o.payment_type || o.payment_method || "Cashfree"}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: T.textMuted }}>{o.entity_type || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {cursor && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <button
                    className="pr-btn pr-btn-ghost"
                    disabled={loading}
                    onClick={() => fetchOrders(cursor)}
                  >
                    {loading ? "Loading…" : "Load More Orders"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main PaymentRecon Component ───────────────────────────────────────────────
export default function PaymentRecon() {
  const [period,   setPeriod]   = useState("month");
  const [summary,  setSummary]  = useState(null);
  const [sumLoad,  setSumLoad]  = useState(true);
  const [sumError, setSumError] = useState(null);

  // Settlements list
  const [settlements, setSettlements] = useState([]);
  const [settLoad,    setSettLoad]    = useState(false);
  const [settError,   setSettError]   = useState(null);
  const [settCursor,  setSettCursor]  = useState(null);
  const [settPage,    setSettPage]    = useState(1);

  // Date range for settlements list
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  // Drill-down
  const [drillTarget, setDrillTarget] = useState(null);

  // ── Fetch Summary ──────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSumLoad(true); setSumError(null);
    try {
      const { data } = await axios.get(`${API}/api/accountant/settlements/summary`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: { period },
      });
      setSummary(data);
    } catch (e) {
      setSumError(e?.response?.data?.error || e?.message || "Failed to load settlement summary");
    } finally {
      setSumLoad(false);
    }
  }, [period]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // ── Fetch Settlements List ─────────────────────────────────────────────────
  const fetchSettlements = useCallback(async (cur = null) => {
    setSettLoad(true); setSettError(null);
    try {
      const params = { limit: 20 };
      if (cur)      params.cursor   = cur;
      if (dateFrom) params.from     = dateFrom;
      if (dateTo)   params.to       = dateTo;

      const { data } = await axios.get(`${API}/api/accountant/settlements`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params,
      });
      setSettlements(prev => cur ? [...prev, ...(data.settlements || [])] : (data.settlements || []));
      setSettCursor(data.cursor || null);
    } catch (e) {
      setSettError(e?.response?.data?.error || e?.message || "Failed to load settlements");
    } finally {
      setSettLoad(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="pr-wrap">

        {/* ── Header ── */}
        <div className="pr-section-header">
          <div>
            <h2 className="pr-section-title">Payment Recon — Cashfree Settlements</h2>
            <p className="pr-section-sub">
              Reconcile Cashfree bank settlements against your Sparx invoice records. API version 2023-08-01.
            </p>
          </div>
          <button className="pr-btn pr-btn-ghost" onClick={fetchSummary} disabled={sumLoad}>
            ↻ Refresh
          </button>
        </div>

        {/* ── Period Filter ── */}
        <div className="pr-filters">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`pr-period-btn${period === opt.value ? " active" : ""}`}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {sumError && (
          <div className="pr-error">
            <span>{sumError}</span>
            <button className="pr-btn pr-btn-ghost" onClick={fetchSummary}>Retry</button>
          </div>
        )}

        {/* ── Recon Alert ── */}
        {summary && !sumLoad && (
          <ReconAlert recon={summary.recon} cf={summary.cf} local={summary.local} />
        )}

        {/* ── KPI Cards ── */}
        <div className="pr-kpi-grid">
          {sumLoad ? [1,2,3,4,5,6].map(i => <SkeletonKpi key={i} />) : summary ? (
            <>
              <div className="pr-kpi">
                <div className="pr-kpi-cat" style={{ color: T.primary }}>Cashfree</div>
                <div className="pr-kpi-label">Total Settlements Received</div>
                <div className="pr-kpi-value" style={{ color: T.primary }}>{fmt(summary.cf.totalSettled)}</div>
                <div className="pr-kpi-sub">{summary.cf.settlementCount} batch{summary.cf.settlementCount !== 1 ? "es" : ""} · {summary.period?.label}</div>
              </div>
              <div className="pr-kpi">
                <div className="pr-kpi-cat" style={{ color: T.textMuted }}>Cashfree</div>
                <div className="pr-kpi-label">PG Charges (CF Deducted)</div>
                <div className="pr-kpi-value" style={{ color: T.warning }}>{fmt(summary.cf.totalCharges)}</div>
                <div className="pr-kpi-sub">Service charge + service tax deducted by Cashfree</div>
              </div>
              <div className="pr-kpi">
                <div className="pr-kpi-cat" style={{ color: T.textMuted }}>Cashfree</div>
                <div className="pr-kpi-label">Orders in Settlements</div>
                <div className="pr-kpi-value" style={{ color: T.textMid }}>{summary.cf.totalOrders}</div>
                <div className="pr-kpi-sub">Total orders included in settled batches</div>
              </div>
              <div className="pr-kpi">
                <div className="pr-kpi-cat" style={{ color: T.success }}>Sparx Records</div>
                <div className="pr-kpi-label">Gross Billed (Cashfree invoices)</div>
                <div className="pr-kpi-value" style={{ color: T.success }}>{fmt(summary.local.totalBilled)}</div>
                <div className="pr-kpi-sub">{summary.local.cashfreeInvoices} cashfree invoices in period</div>
              </div>
              <div className="pr-kpi">
                <div className="pr-kpi-cat" style={{ color: T.success }}>Sparx Records</div>
                <div className="pr-kpi-label">Net Expected from Cashfree</div>
                <div className="pr-kpi-value" style={{ color: T.success }}>{fmt(summary.local.netExpected)}</div>
                <div className="pr-kpi-sub">Gross − PG charges − refunds</div>
              </div>
              <div className="pr-kpi" style={{ border: `1px solid ${summary.recon?.isBalanced ? "#bbf7d0" : "#fecaca"}` }}>
                <div className="pr-kpi-cat" style={{ color: summary.recon?.isBalanced ? T.success : T.error }}>Recon</div>
                <div className="pr-kpi-label">Reconciliation Difference</div>
                <div className="pr-kpi-value" style={{ color: summary.recon?.isBalanced ? T.success : T.error }}>
                  {summary.recon?.isBalanced ? "✓ Nil" : fmt(Math.abs(summary.recon?.diffAmount))}
                </div>
                <div className="pr-kpi-sub">
                  {summary.recon?.isBalanced ? "Perfectly balanced" : summary.recon?.withinTolerance ? "Within ₹1 rounding tolerance" : "Investigate — gap > ₹1"}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* ── Recon Comparison Table ── */}
        {summary && !sumLoad && (
          <>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: T.text }}>
              Reconciliation Breakdown — {summary.period?.label}
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, overflow: "hidden", boxShadow: T.shadow, marginBottom: 24 }}>
              <table className="pr-cmp-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: "right" }}>Cashfree Side (₹)</th>
                    <th style={{ textAlign: "right" }}>Sparx DB Side (₹)</th>
                    <th style={{ textAlign: "right" }}>Diff (₹)</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gross Collections</td>
                    <td className="num">{fmt((summary.cf.totalSettled || 0) + (summary.cf.totalCharges || 0) + (summary.local.totalRefunds || 0))}</td>
                    <td className="num">{fmt(summary.local.totalBilled)}</td>
                    <td className="num" style={{ color: T.textFaint }}>—</td>
                    <td style={{ fontSize: 11, color: T.textMuted }}>Gross before PG charges and refunds</td>
                  </tr>
                  <tr>
                    <td>PG Charges Deducted</td>
                    <td className="num" style={{ color: T.warning }}>{fmt(summary.cf.totalCharges)}</td>
                    <td className="num" style={{ color: T.warning }}>{fmt(summary.local.totalPgCharges)}</td>
                    <td className="num" style={{ color: Math.abs((summary.cf.totalCharges || 0) - (summary.local.totalPgCharges || 0)) > 1 ? T.error : T.textFaint }}>
                      {fmt((summary.cf.totalCharges || 0) - (summary.local.totalPgCharges || 0))}
                    </td>
                    <td style={{ fontSize: 11, color: T.textMuted }}>CF charges vs PGPercent recorded in receipts</td>
                  </tr>
                  <tr>
                    <td>Refunds Processed</td>
                    <td className="num" style={{ color: T.textMuted }}>—</td>
                    <td className="num" style={{ color: "#b91c1c" }}>{fmt(summary.local.totalRefunds)}</td>
                    <td className="num" style={{ color: T.textFaint }}>—</td>
                    <td style={{ fontSize: 11, color: T.textMuted }}>Refunds deducted before settlement</td>
                  </tr>
                  <tr className="total-row">
                    <td>Net Amount Settled / Expected</td>
                    <td className="num">{fmt(summary.cf.totalSettled)}</td>
                    <td className="num">{fmt(summary.local.netExpected)}</td>
                    <td className="num" style={{ color: summary.recon?.isBalanced ? T.success : T.error }}>
                      {summary.recon?.isBalanced ? "✓ 0.00" : fmt(summary.recon?.diffAmount)}
                    </td>
                    <td style={{ fontSize: 11 }}>
                      <span style={{ color: summary.recon?.isBalanced ? T.success : T.error, fontWeight: 600 }}>
                        {summary.recon?.isBalanced ? "Balanced" : summary.recon?.withinTolerance ? "Within tolerance" : "Gap — investigate"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        <hr className="pr-divider" />

        {/* ── Settlements List ── */}
        <div className="pr-section-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Settlement Batches</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
              Click "View Orders" on any batch to see individual order-level reconciliation
            </div>
          </div>
          {/* Date range filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: 11, color: T.textMuted, display: "block", marginBottom: 3 }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ padding: "6px 10px", border: `1px solid ${T.borderMid}`, borderRadius: 7, fontSize: 12, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textMuted, display: "block", marginBottom: 3 }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ padding: "6px 10px", border: `1px solid ${T.borderMid}`, borderRadius: 7, fontSize: 12, outline: "none" }} />
            </div>
            <button className="pr-btn pr-btn-primary pr-btn-sm" onClick={() => fetchSettlements()}>Filter</button>
            {(dateFrom || dateTo) && (
              <button className="pr-btn pr-btn-ghost pr-btn-sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</button>
            )}
          </div>
        </div>

        {settError && <div className="pr-error">{settError} <button className="pr-btn pr-btn-ghost" onClick={() => fetchSettlements()}>Retry</button></div>}

        {settLoad && !settlements.length ? (
          <div className="pr-empty"><div>Loading settlement batches…</div></div>
        ) : settlements.length === 0 ? (
          <div className="pr-empty">
            <div className="pr-empty-icon">🏦</div>
            <div style={{ fontWeight: 600, color: T.textMuted, marginBottom: 4 }}>No settlement batches found</div>
            <div>Settlements appear here once Cashfree transfers funds to your bank account.</div>
          </div>
        ) : (
          <>
            <div className="pr-table-wrap">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>Settlement ID</th>
                    <th>Settlement Date</th>
                    <th>UTR / Transfer Ref</th>
                    <th>Orders (Count)</th>
                    <th>CF Amount (₹)</th>
                    <th>Service Charge (₹)</th>
                    <th>Service Tax (₹)</th>
                    <th>Net Settled (₹)</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s, i) => {
                    const netAmt = (s.settlement_amount || 0);
                    const charge = (s.service_charge || 0) + (s.service_tax || 0);
                    return (
                      <tr key={s.cf_settlement_id || s.id || i}>
                        <td style={{ fontFamily: "monospace", fontSize: 11, color: T.primary, fontWeight: 600 }}>
                          {s.cf_settlement_id || s.id || "—"}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(s.settlement_date || s.created_at)}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11, color: T.textMuted }}>
                          {s.utr || s.settlement_utr || "—"}
                        </td>
                        <td className="num">{s.cf_count || "—"}</td>
                        <td className="num" style={{ fontWeight: 700, color: T.success }}>{fmt(s.settlement_amount || 0)}</td>
                        <td className="num muted">{fmt(s.service_charge || 0)}</td>
                        <td className="num muted">{fmt(s.service_tax || 0)}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{fmt(netAmt)}</td>
                        <td>
                          <span className="pr-badge" style={{ background: "#f0fdf4", color: T.success }}>
                            Settled
                          </span>
                        </td>
                        <td>
                          <button
                            className="pr-btn pr-btn-info pr-btn-sm"
                            onClick={() => setDrillTarget(s)}
                          >
                            View Orders
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {settCursor && (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button
                  className="pr-btn pr-btn-ghost"
                  disabled={settLoad}
                  onClick={() => fetchSettlements(settCursor)}
                >
                  {settLoad ? "Loading…" : "Load More Settlements"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Recent 10 from Summary (when no date filter) ── */}
        {summary?.settlements?.length > 0 && !settLoad && settlements.length === 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: T.textMuted, textAlign: "center" }}>
            Showing latest 10 settlements from summary period. Set a date range above to filter.
          </div>
        )}

        {/* ── Drill-Down Modal ── */}
        {drillTarget && (
          <SettlementDrillDown
            settlement={drillTarget}
            onClose={() => setDrillTarget(null)}
          />
        )}

      </div>
    </>
  );
}