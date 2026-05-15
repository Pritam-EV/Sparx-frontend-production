import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import FooterNav from "../components/FooterNav";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = d =>
  d ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : null;
const fmtGroup = g =>
  g ? g.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : null;

// ─── Categoriser ──────────────────────────────────────────────────────────────
function categorise(t) {
  if (t.isWalletEntry) {
    if (t.walletTxnType === "topup")  return "TOPUP";
    if (t.walletTxnType === "refund") return "WALLET_REFUND";
    return "WALLET_REFUND";
  }
  if (t.isRefundEntry) return "REFUND_BANK";
  if (t.type === "wallet_topup") {
    if (t.status === "SUCCESS") return "TOPUP";
    return null;
  }
  const isWalletPay = t.gateway === "wallet" || t.txnSource === "wallet_pay";
  if (isWalletPay)            return "WALLET_DEBIT";
  if (t.status === "SUCCESS") return "SUCCESS";
  if (t.status === "FAILED")  return "FAILED";
  return null;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CAT = {
  ALL:           { label: "All",           color: "#04BFBF", accent: "#04BFBF", bg: "rgba(4,191,191,0.10)",  border: "rgba(4,191,191,0.18)",   icon: "◎", sign: ""  },
  SUCCESS:       { label: "Success",       color: "#0a8c50", accent: "#0a8c50", bg: "rgba(10,140,80,0.10)",  border: "rgba(10,140,80,0.18)",   icon: "✓", sign: "-" },
  TOPUP:         { label: "Topup",         color: "#c47d00", accent: "#F2A007", bg: "rgba(242,160,7,0.10)",  border: "rgba(242,160,7,0.18)",   icon: "↑", sign: "+" },
  WALLET_DEBIT:  { label: "Wallet Debit",  color: "#7c3aed", accent: "#7c3aed", bg: "rgba(124,58,237,0.10)", border: "rgba(124,58,237,0.18)",  icon: "↓", sign: "-" },
  WALLET_REFUND: { label: "Wallet Refund", color: "#04BFBF", accent: "#04BFBF", bg: "rgba(4,191,191,0.10)",  border: "rgba(4,191,191,0.18)",   icon: "↩", sign: "+" },
  REFUND_BANK:   { label: "Bank Refund",   color: "#3a7bd5", accent: "#3a7bd5", bg: "rgba(58,123,213,0.10)", border: "rgba(58,123,213,0.18)",  icon: "🏦", sign: "+" },
  FAILED:        { label: "Failed",        color: "#d93025", accent: "#d93025", bg: "rgba(217,48,37,0.10)",  border: "rgba(217,48,37,0.18)",   icon: "✕", sign: ""  },
};

const FILTER_ORDER = ["ALL","SUCCESS","WALLET_DEBIT","TOPUP","WALLET_REFUND","REFUND_BANK","FAILED"];

const labelMap = {
  SUCCESS:       "Charging Payment",
  TOPUP:         "Wallet Topup",
  WALLET_DEBIT:  "Wallet Payment",
  WALLET_REFUND: "Wallet Refund",
  REFUND_BANK:   "Bank Refund",
  FAILED:        "Payment Failed",
};

// ─── Animated Expand Panel ────────────────────────────────────────────────────
// Uses a ref to measure real height so CSS transition works without max-height hacks
const ExpandPanel = ({ open, children }) => {
  const ref  = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    if (open) {
      // measure then set
      setHeight(ref.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [open, children]);

  return (
    <div
      style={{
        overflow: "hidden",
        height: height,
        transition: "height 0.26s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div ref={ref}>
        {children}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TransactionHistory = () => {
  const navigate = useNavigate();
  const [raw, setRaw]                     = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState("ALL");
  const [expandedId, setExpandedId]       = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [txnRes, balRes] = await Promise.all([
        api.get("/api/payment/my-transactions"),
        api.get("/api/wallet/balance").catch(() => ({ data: {} })),
      ]);
      setRaw(txnRes.data.transactions || []);
      if (typeof balRes.data.balance === "number") setWalletBalance(balRes.data.balance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const tagged = useMemo(() =>
    raw.map(t => ({ ...t, _cat: categorise(t) })).filter(t => t._cat !== null),
    [raw]
  );

  const filtered = useMemo(() =>
    filter === "ALL" ? tagged : tagged.filter(t => t._cat === filter),
    [tagged, filter]
  );

  const stats = useMemo(() => ({
    charged:      tagged.filter(t => t._cat === "SUCCESS").reduce((s,t) => s + Number(t.amountPaid||0), 0),
    chargedCount: tagged.filter(t => t._cat === "SUCCESS").length,
    debited:      tagged.filter(t => t._cat === "WALLET_DEBIT").reduce((s,t) => s + Number(t.amountPaid||0), 0),
    debitCount:   tagged.filter(t => t._cat === "WALLET_DEBIT").length,
    refunded:     tagged.filter(t => t._cat === "REFUND_BANK" || t._cat === "WALLET_REFUND").reduce((s,t) => s + Number(t.amountPaid||0), 0),
    refundCount:  tagged.filter(t => t._cat === "REFUND_BANK" || t._cat === "WALLET_REFUND").length,
  }), [tagged]);

  const counts = useMemo(() => {
    const c = {};
    FILTER_ORDER.forEach(k => {
      c[k] = k === "ALL" ? tagged.length : tagged.filter(t => t._cat === k).length;
    });
    return c;
  }, [tagged]);

  const toggleExpand = id =>
    setExpandedId(prev => (prev === id ? null : id));

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .txn-skel {
          background: linear-gradient(90deg,#e4e8ea 25%,#eef1f2 50%,#e4e8ea 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 13px;
        }
        .pill-scroll::-webkit-scrollbar { display: none; }
        .pill-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .f-pill   { transition: all 0.15s ease; cursor: pointer; }
        .f-pill:active { transform: scale(0.92); }
        .wbanner  { cursor: pointer; user-select: none; }
        .wbanner:active { opacity: 0.88; }
        .add-btn  { transition: all 0.15s ease; }
        .add-btn:active { transform: scale(0.91); }
        .txn-card { transition: box-shadow 0.18s ease; cursor: pointer; }
        .txn-card:active { opacity: 0.92; }
        .txn-card.expanded {
          box-shadow: 0 4px 18px rgba(0,0,0,0.10) !important;
        }
        .chevron-icon {
          transition: transform 0.26s cubic-bezier(0.4,0,0.2,1);
          color: #a0b8b8;
          flex-shrink: 0;
        }
        .chevron-icon.open { transform: rotate(180deg); }
        .detail-copy {
          cursor: pointer;
          user-select: none;
          transition: opacity 0.12s;
        }
        .detail-copy:active { opacity: 0.55; }
      `}</style>

      {/* TOP BAR */}
      <div className="top-bar">
        <img src="/logo.png" alt="VIZ Logo" className="top-bar-logo" />
      </div>

      {/* ── OUTER SHELL ── */}
      <div style={{
        height: "100dvh",
        background: "#edf0f3",
        paddingTop: 56,
        fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif",
        overflowY: "hidden",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* ══ FIXED HEADER ZONE ══ */}
        <div style={{
          flexShrink: 0,
          background: "#edf0f3",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}>

          {/* PAGE TITLE */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 16px 10px",
          }}>
            <div>
              <h2 style={{
                margin: 0, fontSize: 19, fontWeight: 700,
                color: "#0b1c22", letterSpacing: "-0.3px",
              }}>Transactions</h2>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "#8aa4a4", fontWeight: 500 }}>
                {tagged.length > 0 ? `${tagged.length} records` : "Your payment history"}
              </p>
            </div>
            <button
              onClick={fetchAll} disabled={loading}
              style={{
                width: 34, height: 34, borderRadius: "50%", padding: 0,
                background: "rgba(4,191,191,0.10)",
                border: "1.5px solid rgba(4,191,191,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: loading ? "not-allowed" : "pointer",
                color: "#04BFBF", opacity: loading ? 0.45 : 1, flexShrink: 0,
              }}
              aria-label="Refresh"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>

          {/* WALLET BANNER */}
          <div
            className="wbanner"
            onClick={() => navigate("/wallet/topup")}
            style={{
              margin: "0 16px 10px",
              background: "linear-gradient(120deg, #011e26 0%, #013a47 55%, #011e26 100%)",
              borderRadius: 14,
              padding: "11px 13px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              border: "1px solid rgba(4,191,191,0.18)",
              boxShadow: "0 3px 12px rgba(1,30,38,0.22)",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: "rgba(4,191,191,0.14)",
                border: "1px solid rgba(4,191,191,0.26)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#04BFBF" strokeWidth="1.8">
                  <rect x="2" y="7" width="20" height="14" rx="3"/>
                  <path d="M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="#04BFBF" stroke="none"/>
                  <path d="M2 10h20"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: "rgba(4,191,191,0.60)",
                  letterSpacing: "0.07em", textTransform: "uppercase" }}>VIZ Wallet</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#fff",
                  letterSpacing: "-0.5px", lineHeight: 1.1, marginTop: 1 }}>
                  {walletBalance !== null ? `₹${Number(walletBalance).toFixed(2)}` : "—"}
                </div>
                <div style={{ fontSize: 9.5, color: "rgba(4,191,191,0.48)", marginTop: 1, fontWeight: 500 }}>
                  Available balance
                </div>
              </div>
            </div>
            <button
              className="add-btn"
              onClick={e => { e.stopPropagation(); navigate("/wallet/topup"); }}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "#04BFBF", color: "#011F26",
                padding: "7px 13px", borderRadius: 9,
                fontWeight: 700, fontSize: 11.5,
                border: "none", cursor: "pointer",
                boxShadow: "0 3px 10px rgba(4,191,191,0.30)",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add Money
            </button>
          </div>

          {/* STAT CARDS */}
          <div style={{ display: "flex", gap: 7, padding: "0 16px 10px" }}>
            <StatCard
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a8c50" strokeWidth="2.4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
              label="Charged"     value={`₹${stats.charged.toFixed(2)}`}
              sub={`${stats.chargedCount} sessions`}
              color="#0a8c50" bg="rgba(10,140,80,0.09)" border="rgba(10,140,80,0.14)"
            />
            <StatCard
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.4"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="#7c3aed" stroke="none"/></svg>}
              label="Wallet Used" value={`₹${stats.debited.toFixed(2)}`}
              sub={`${stats.debitCount} uses`}
              color="#7c3aed" bg="rgba(124,58,237,0.09)" border="rgba(124,58,237,0.14)"
            />
            <StatCard
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2.4"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>}
              label="Refunded"    value={`₹${stats.refunded.toFixed(2)}`}
              sub={`${stats.refundCount} refunds`}
              color="#3a7bd5" bg="rgba(58,123,213,0.09)" border="rgba(58,123,213,0.14)"
            />
          </div>

          {/* FILTER PILLS */}
          <div className="pill-scroll" style={{
            display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 11px",
          }}>
            {FILTER_ORDER.map(key => {
              const cfg    = CAT[key];
              const active = filter === key;
              const cnt    = counts[key];
              return (
                <button
                  key={key}
                  className="f-pill"
                  onClick={() => setFilter(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "6px 11px", borderRadius: 99,
                    whiteSpace: "nowrap", fontWeight: 600, fontSize: 11,
                    background: active ? cfg.accent : "#fff",
                    color:      active ? "#fff" : "#537878",
                    border:     active ? `1.5px solid ${cfg.accent}` : "1.5px solid rgba(0,0,0,0.08)",
                    boxShadow:  active ? `0 2px 8px ${cfg.accent}44` : "0 1px 3px rgba(0,0,0,0.06)",
                    flexShrink: 0, letterSpacing: "-0.1px",
                  }}
                >
                  <span style={{ fontSize: key === "REFUND_BANK" ? 9.5 : 11, lineHeight: 1 }}>{cfg.icon}</span>
                  {cfg.label}
                  {cnt > 0 && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 700,
                      background: active ? "rgba(255,255,255,0.22)" : `${cfg.accent}18`,
                      color: active ? "#fff" : cfg.accent,
                      borderRadius: 99, padding: "0 5px",
                      minWidth: 16, textAlign: "center", lineHeight: "15px", display: "inline-block",
                    }}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ SCROLLABLE LIST ZONE ══ */}
        <div style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>

          {/* SKELETON */}
          {loading && (
            <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="txn-skel" style={{ height: 64 }} />
              ))}
            </div>
          )}

          {/* EMPTY */}
          {!loading && filtered.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "56px 24px 0", gap: 8, textAlign: "center",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "rgba(4,191,191,0.08)",
                border: "1.5px solid rgba(4,191,191,0.16)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, marginBottom: 4,
              }}>🧾</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0b1c22" }}>No transactions</div>
              <div style={{ fontSize: 12, color: "#7a9090", maxWidth: 210, lineHeight: 1.55 }}>
                {filter === "TOPUP"
                  ? "No wallet topups yet. Add money to get started."
                  : filter === "FAILED"
                    ? "No failed payments — you're all good!"
                    : `No ${CAT[filter]?.label.toLowerCase()} transactions yet.`}
              </div>
              {filter === "TOPUP" && (
                <button
                  onClick={() => navigate("/wallet/topup")}
                  style={{
                    marginTop: 10, padding: "10px 22px", borderRadius: 10,
                    background: "#04BFBF", color: "#011F26",
                    fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(4,191,191,0.28)",
                  }}
                >+ Add Money to Wallet</button>
              )}
            </div>
          )}

          {/* CARDS */}
          <div style={{ padding: "6px 14px 90px", display: "flex", flexDirection: "column", gap: 6 }}>
            {!loading && filtered.map(txn => (
              <TxnCard
                key={txn._id}
                txn={txn}
                expanded={expandedId === txn._id}
                onToggle={() => toggleExpand(txn._id)}
              />
            ))}
          </div>
        </div>
      </div>

      <FooterNav />
    </>
  );
};

// ─── Copy-to-clipboard helper ─────────────────────────────────────────────────
const copyText = (text, setCopied, key) => {
  navigator.clipboard?.writeText(text).then(() => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  });
};

// ─── Transaction Card ──────────────────────────────────────────────────────────
const TxnCard = ({ txn, expanded, onToggle }) => {
  const cat    = txn._cat;
  const cfg    = CAT[cat];
  const date   = fmt(txn.paidAt || txn.createdAt);
  const [copied, setCopied] = useState(null);

  const isCredit = ["TOPUP","WALLET_REFUND","REFUND_BANK"].includes(cat);
  const amtColor = isCredit ? cfg.color : "#0b1c22";
  const amtStr   = `${cfg.sign}₹${Number(txn.amountPaid||0).toFixed(2)}`;

  const methodVal = cat === "SUCCESS"
    ? (fmtGroup(txn.paymentGroup) || txn.paymentMethod || null)
    : cat === "WALLET_DEBIT" ? "VIZ Wallet" : null;

  // ── Build detail rows (only those with actual values) ──
  const detailRows = [
    txn.orderId    && { label: "Order ID",   value: txn.orderId,         mono: true,  copyKey: "orderId"   },
    txn.sessionId  && { label: "Session ID", value: txn.sessionId,       mono: true,  copyKey: "sessionId" },
    txn.deviceId   && { label: "Device",     value: txn.deviceId,        mono: false, copyKey: null        },
    txn.bankReference && { label: "Ref No.", value: txn.bankReference,   mono: true,  copyKey: "bankRef"   },
    cat === "REFUND_BANK" && txn.refundId &&
      { label: "Refund ID", value: txn.refundId, mono: true, copyKey: "refundId" },
    cat === "REFUND_BANK" && txn.refundStatus &&
      { label: "Refund Status", value: txn.refundStatus.charAt(0).toUpperCase() + txn.refundStatus.slice(1), mono: false, copyKey: null },
    cat === "WALLET_REFUND" && txn.description &&
      { label: "Note", value: txn.description, mono: false, copyKey: null },
    // failure reasons always show
  ].filter(Boolean);

  const hasFailure =
    (cat === "FAILED" && txn.failureReason) ||
    (cat === "REFUND_BANK" && txn.refundFailureReason);

  return (
    <div
      className={`txn-card${expanded ? " expanded" : ""}`}
      onClick={onToggle}
      style={{
        background: "#fff",
        borderRadius: 13,
        overflow: "hidden",
        display: "flex",
        border: `1px solid ${expanded ? cfg.accent + "55" : cfg.border}`,
        boxShadow: expanded
          ? `0 4px 18px rgba(0,0,0,0.09), 0 0 0 1px ${cfg.accent}22`
          : "0 1px 4px rgba(0,0,0,0.06)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Accent stripe */}
      <div style={{
        width: 3, flexShrink: 0,
        background: cfg.accent,
        borderRadius: "0",
        opacity: expanded ? 1 : 0.7,
        transition: "opacity 0.2s",
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>

        {/* ══ COLLAPSED ROW — always visible ══ */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "13px 11px 13px 10px", gap: 8,
        }}>

          {/* Type icon circle */}
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: cat === "REFUND_BANK" ? 12 : 14,
          }}>
            {cfg.icon}
          </div>

          {/* Label + date */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12.5, fontWeight: 700, color: "#0b1c22",
              letterSpacing: "-0.1px", lineHeight: 1.2,
            }}>
              {labelMap[cat]}
            </div>
            <div style={{
              fontSize: 10.5, color: "#8aa4a4", fontWeight: 500,
              marginTop: 2, whiteSpace: "nowrap",
            }}>
              {date || "—"}
            </div>
          </div>

          {/* Amount + chevron */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 800, color: amtColor,
              letterSpacing: "-0.4px", fontVariantNumeric: "tabular-nums",
              textAlign: "right",
            }}>
              {amtStr}
            </div>
            <svg
              className={`chevron-icon${expanded ? " open" : ""}`}
              width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* ══ EXPANDED PANEL — slides open ══ */}
        <ExpandPanel open={expanded}>
          <div
            onClick={e => e.stopPropagation()} /* prevent collapse when tapping inside */
            style={{
              borderTop: `1px solid ${cfg.border}`,
              background: `${cfg.bg.replace("0.10","0.04")}`,
              padding: "9px 11px 10px 10px",
            }}
          >

            {/* Method row (for SUCCESS / WALLET_DEBIT) */}
            {methodVal && (
              <DetailRow label="Via" value={methodVal} />
            )}

            {/* All detail rows with copy */}
            {detailRows.map((row, i) => (
              <DetailRow
                key={i}
                label={row.label}
                value={row.value}
                mono={row.mono}
                canCopy={!!row.copyKey}
                copied={copied === row.copyKey}
                onCopy={row.copyKey
                  ? e => { e.stopPropagation(); copyText(row.value, setCopied, row.copyKey); }
                  : null
                }
              />
            ))}

            {/* Failure banner */}
            {hasFailure && (
              <div style={{
                marginTop: 8,
                background: "rgba(217,48,37,0.07)",
                color: "#c4281e",
                padding: "7px 10px", borderRadius: 8,
                fontSize: 11, fontWeight: 600,
                display: "flex", alignItems: "flex-start", gap: 5,
              }}>
                <span style={{ flexShrink: 0, marginTop: 0 }}>⚠</span>
                <span style={{ lineHeight: 1.45 }}>
                  {txn.failureReason || txn.refundFailureReason}
                </span>
              </div>
            )}

            {/* Tap-to-copy hint */}
            {detailRows.some(r => r.copyKey) && (
              <div style={{ marginTop: 8, fontSize: 9.5, color: "#b0c8c8", textAlign: "right" }}>
                Tap ID to copy
              </div>
            )}
          </div>
        </ExpandPanel>

      </div>
    </div>
  );
};

// ─── Detail Row (inside expanded panel) ───────────────────────────────────────
// ✅ Fixed
const DetailRow = ({ label, value, mono, canCopy, copied, copyKey, onCopy }) => (
  <div style={{
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", gap: 10,
    padding: "4px 0",
    borderBottom: "1px solid rgba(0,0,0,0.04)",
  }}>
    <span style={{
      fontSize: 10.5, color: "#8faaaa", fontWeight: 500,
      flexShrink: 0, paddingTop: 1,
    }}>
      {label}
    </span>
    <span
      className={canCopy ? "detail-copy" : ""}
      onClick={onCopy}
      style={{
        fontSize: 10.5, fontWeight: 600, color: canCopy ? "#0b4f6c" : "#1a3040",
        fontFamily: mono ? "'Courier New', 'Courier', monospace" : "inherit",
        textAlign: "right",
        wordBreak: "break-all",
        lineHeight: 1.5,
        borderBottom: canCopy ? "1px dashed rgba(4,191,191,0.4)" : "none",
        paddingBottom: canCopy ? 1 : 0,
      }}
    >
      {canCopy && copied === copyKey ? "✓ Copied!" : value}
    </span>
  </div>
);

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color, bg, border }) => (
  <div style={{
    flex: "1 1 0", minWidth: 0,
    background: "#fff",
    borderRadius: 11, padding: "9px 10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    border: `1px solid ${border}`,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <span style={{
        fontSize: 10, color: "#8aa4a4", fontWeight: 600,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{label}</span>
    </div>
    <div style={{
      fontSize: 15, fontWeight: 800, color,
      letterSpacing: "-0.4px", lineHeight: 1,
      fontVariantNumeric: "tabular-nums",
    }}>{value}</div>
    <div style={{ fontSize: 9.5, color: "#b0c4c4", marginTop: 2, fontWeight: 500 }}>{sub}</div>
  </div>
);

export default TransactionHistory;