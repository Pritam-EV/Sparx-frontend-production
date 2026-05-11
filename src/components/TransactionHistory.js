import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import FooterNav from "../components/FooterNav";

const statusConfig = {
  ALL:     { label: "All",     color: "#04BFBF",  bg: "rgba(4,191,191,0.10)"   },
  SUCCESS: { label: "Success", color: "#0a8c50",  bg: "rgba(10,140,80,0.10)",  accent: "#0a8c50", icon: "✓" },
  FAILED:  { label: "Failed",  color: "#d93025",  bg: "rgba(217,48,37,0.10)",  accent: "#d93025", icon: "✕" },
  REFUND:  { label: "Refund",  color: "#3a7bd5",  bg: "rgba(58,123,213,0.10)", accent: "#3a7bd5", icon: "↩" },
};

const VISIBLE_STATUSES = ["SUCCESS", "FAILED", "REFUND"];

const TransactionHistory = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/payment/my-transactions");
      const all = res.data.transactions || [];
      setTransactions(all.filter((t) => VISIBLE_STATUSES.includes(t.status)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    if (selectedStatus === "ALL") return transactions;
    return transactions.filter((t) => t.status === selectedStatus);
  }, [transactions, selectedStatus]);

  const totalPaid = transactions
    .filter((t) => t.status === "SUCCESS")
    .reduce((sum, t) => sum + Number(t.amountPaid || 0), 0);

  const totalRefunds = transactions
    .filter((t) => t.status === "REFUND")
    .reduce((sum, t) => sum + Number(t.amountPaid || 0), 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const formatGroup = (g) => {
    if (!g) return null;
    return g.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .skel {
          background: linear-gradient(90deg, #efefef 25%, #fafafa 50%, #efefef 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
        }
        .pill-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="top-bar">
        <img src="/logo.png" alt="VIZ Logo" className="top-bar-logo" />
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        paddingTop: 56,
        paddingBottom: 90,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>

        {/* ── TITLE ROW ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",       // ← anchor for absolute button
          padding: "16px 16px 0",
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: "#0e1e1e",
              letterSpacing: "-0.3px",
              textAlign: "center",
            }}>
              Transactions
            </h2>

          </div>

          {/* ── REFRESH BUTTON ── */}
          <button
            onClick={fetchTransactions}
            disabled={loading}
            style={{
              position: "absolute",  // ← anchored to the row div above
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(4,191,191,0.10)",
              border: "none",
              borderRadius: "50%",
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading ? "not-allowed" : "pointer",
              color: "#04BFBF",
              opacity: loading ? 0.5 : 1,
              transition: "opacity 0.2s",
              padding: 0,
              margin: 0,
              maxWidth: "none",
            }}
          >
            <svg
              width="17" height="17" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
            >
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>

        {/* ── STATS STRIP ── */}
        <div style={{ display: "flex", gap: 10, padding: "14px 16px 4px" }}>
          <StatCard
            label="Total Transactions"
            value={transactions.filter(t => t.status === "SUCCESS").length}
            sub={`₹${totalPaid.toFixed(2)} paid`}
            color="#1fb957"
          />
          <StatCard
            label="Total Refunds"
            value={transactions.filter(t => t.status === "REFUND").length}
            sub={totalRefunds > 0 ? `₹${totalRefunds.toFixed(2)} refunded` : "None"}
            color="#3a7bd5"
          />
        </div>

        {/* ── FILTER PILLS ── */}
        <div
          className="pill-scroll"
          style={{
            display: "flex", gap: 8, overflowX: "auto",
            padding: "12px 16px",
            position: "sticky", top: 46, zIndex: 50,
            background: "#f4f6f8",
          }}
        >
          {Object.keys(statusConfig).map((key) => {
            const st = statusConfig[key];
            const active = selectedStatus === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                style={{
                  border: active ? "none" : "1.5px solid rgba(0,0,0,0.10)",
                  padding: "7px 16px",
                  borderRadius: 30,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontWeight: 700,
                  fontSize: 12,
                  transition: "all 0.18s",
                  background: active ? "#04BFBF" : "#fff",
                  color: active ? "#fff" : "#555",
                  boxShadow: active ? "0 4px 12px rgba(4,191,191,0.28)" : "none",
                  margin: 0, width: "auto", maxWidth: "none", display: "inline-block",
                }}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* ── SKELETONS ── */}
        {loading && (
          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 100, borderRadius: 16,
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }} className="skel" />
            ))}
          </div>
        )}

        {/* ── EMPTY ── */}
        {!loading && filteredTransactions.length === 0 && (
          <div style={{
            textAlign: "center", paddingTop: 80,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 44 }}>🧾</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2e2e" }}>
              No Transactions Found
            </div>
            <div style={{ fontSize: 13, color: "#7a9090", maxWidth: 240 }}>
              Completed payments will appear here.
            </div>
          </div>
        )}

        {/* ── CARDS ── */}
{/* ── CARDS ── */}
<div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
  {!loading && filteredTransactions.map((txn) => {
    const st = statusConfig[txn.status] || statusConfig.FAILED;
    const dateVal = formatDate(txn.paidAt || txn.createdAt);

    // ── REFUND CARD ──
    if (txn.isRefundEntry) {
      return (
        <div key={txn._id} style={{
          background: "#fff",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 2px 14px rgba(58,123,213,0.10)",
          border: "1px solid rgba(58,123,213,0.12)",
          display: "flex",
        }}>
          {/* Blue accent bar */}
          <div style={{ width: 5, background: "#3a7bd5", flexShrink: 0 }} />

          <div style={{ flex: 1, padding: "13px 14px" }}>

            {/* Row 1: badge + amount */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                background: "rgba(58,123,213,0.10)", color: "#3a7bd5",
                fontWeight: 700, fontSize: 11,
              }}>
                ↩ Refund
              </span>
              <div style={{
                fontSize: 22, fontWeight: 800, color: "#3a7bd5", letterSpacing: "-0.5px",
              }}>
                ₹{Number(txn.amountPaid || 0).toFixed(2)}
              </div>
            </div>

            {/* Original order ref */}
            <div style={{
              fontSize: 10.5, color: "#9ab0b0", fontFamily: "monospace", marginTop: 6,
            }}>
              #{txn.orderId}
            </div>

            <div style={{ height: 1, background: "#f0f0f0", margin: "10px 0" }} />

            {/* Meta */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dateVal && <MetaRow label="Date" value={dateVal} />}
              {txn.refundId && <MetaRow label="Refund ID" value={txn.refundId} mono />}
              {txn.refundStatus && (
                <MetaRow
                  label="Refund Status"
                  value={txn.refundStatus.charAt(0).toUpperCase() + txn.refundStatus.slice(1)}
                />
              )}
            </div>

            {/* Refund failure reason */}
            {txn.refundFailureReason && (
              <div style={{
                marginTop: 10,
                background: "rgba(217,48,37,0.07)", color: "#d93025",
                padding: "8px 12px", borderRadius: 10,
                fontSize: 11, fontWeight: 600,
              }}>
                ⚠ {txn.refundFailureReason}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── NORMAL PAYMENT CARD ──
    const methodVal = formatGroup(txn.paymentGroup) || txn.paymentMethod || null;
    const refVal    = txn.bankReference || null;
    const deviceVal = txn.deviceId || null;

    return (
      <div key={txn._id} style={{
        background: "#fff",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.05)",
        display: "flex",
      }}>
        <div style={{ width: 5, background: st.accent, flexShrink: 0 }} />

        <div style={{ flex: 1, padding: "13px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20,
              background: st.bg, color: st.color, fontWeight: 700, fontSize: 11,
            }}>
              {st.icon} {st.label}
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1fb957", letterSpacing: "-0.5px" }}>
              ₹{Number(txn.amountPaid || 0).toFixed(2)}
            </div>
          </div>

          <div style={{ fontSize: 10.5, color: "#9ab0b0", fontFamily: "monospace", marginTop: 6 }}>
            #{txn.orderId}
          </div>

          <div style={{ height: 1, background: "#f0f0f0", margin: "10px 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dateVal   && <MetaRow label="Date"    value={dateVal}   />}
            {methodVal && <MetaRow label="Via"     value={methodVal} />}
            {refVal    && <MetaRow label="Ref No." value={refVal}    mono />}
            {deviceVal && <MetaRow label="Device"  value={deviceVal} />}
          </div>

          {txn.status === "FAILED" && txn.failureReason && (
            <div style={{
              marginTop: 10, background: "rgba(217,48,37,0.07)", color: "#d93025",
              padding: "8px 12px", borderRadius: 10, fontSize: 11, fontWeight: 600,
            }}>
              ⚠ {txn.failureReason}
            </div>
          )}
        </div>
      </div>
    );
  })}
</div>
      </div>

      <FooterNav />
    </>
  );
};

const MetaRow = ({ label, value, mono }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ fontSize: 11, color: "#9ab0b0", fontWeight: 500 }}>{label}</span>
    <span style={{
      fontSize: 11, fontWeight: 700, color: "#1a2e2e",
      fontFamily: mono ? "monospace" : "inherit",
      textAlign: "right", maxWidth: "65%", wordBreak: "break-all",
    }}>
      {value}
    </span>
  </div>
);

const StatCard = ({ label, value, sub, color }) => (
  <div style={{
    flex: 1, background: "#fff", borderRadius: 14,
    padding: "11px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    border: "1px solid rgba(0,0,0,0.05)",
  }}>
    <div style={{ fontSize: 10.5, color: "#9ab0b0", fontWeight: 500, marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.5px", lineHeight: 1 }}>
      {value}
    </div>
    <div style={{ fontSize: 10.5, color: "#9ab0b0", marginTop: 4 }}>{sub}</div>
  </div>
);

export default TransactionHistory;