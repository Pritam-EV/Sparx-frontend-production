import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import FooterNav from "../components/FooterNav";

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = d =>
  d ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : null;
const fmtGroup = g =>
  g ? g.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : null;

// ─── Categoriser ───────────────────────────────────────────────────────────
// Returns one of: TOPUP | WALLET_DEBIT | WALLET_REFUND | REFUND_BANK | SUCCESS | FAILED
function categorise(t) {
  // 1. Wallet transaction entries (from WalletTransaction model)
  if (t.isWalletEntry) {
    if (t.walletTxnType === "topup")  return "TOPUP";
    if (t.walletTxnType === "refund") return "WALLET_REFUND";
    return "WALLET_REFUND";
  }

  // 2. Receipt refund entries
  if (t.isRefundEntry) return "REFUND_BANK";

  // 3. Payment records — check TYPE first, before status
  if (t.type === "wallet_topup") {
  if (t.status === "SUCCESS") return "TOPUP";  // ← only show completed topups
  return null;                                  // PENDING/FAILED topups → hide
}

  const isWalletPay = t.gateway === "wallet" || t.txnSource === "wallet_pay";
  if (isWalletPay)            return "WALLET_DEBIT";
  if (t.status === "SUCCESS") return "SUCCESS";
  if (t.status === "FAILED")  return "FAILED";

  return null; // PENDING etc — hide
}

// ─── Config ────────────────────────────────────────────────────────────────
const CAT = {
  ALL:          { label: "All",           color: "#04BFBF", accent: "#04BFBF", bg: "rgba(4,191,191,0.10)",   border: "rgba(4,191,191,0.18)",   icon: "◎", sign: ""  },
  SUCCESS:      { label: "Success",       color: "#0a8c50", accent: "#0a8c50", bg: "rgba(10,140,80,0.10)",   border: "rgba(10,140,80,0.18)",   icon: "✓", sign: "-" },
  TOPUP:        { label: "Topup",         color: "#F2A007", accent: "#F2A007", bg: "rgba(242,160,7,0.10)",   border: "rgba(242,160,7,0.18)",   icon: "↑", sign: "+" },
  WALLET_DEBIT: { label: "Wallet Debit",  color: "#7c3aed", accent: "#7c3aed", bg: "rgba(124,58,237,0.10)",  border: "rgba(124,58,237,0.18)",  icon: "↓", sign: "-" },
  WALLET_REFUND:{ label: "Wallet Refund", color: "#04BFBF", accent: "#04BFBF", bg: "rgba(4,191,191,0.10)",   border: "rgba(4,191,191,0.18)",   icon: "↩", sign: "+" },
  REFUND_BANK:  { label: "Bank Refund",   color: "#3a7bd5", accent: "#3a7bd5", bg: "rgba(58,123,213,0.10)",  border: "rgba(58,123,213,0.18)",  icon: "🏦", sign: "+" },
  FAILED:       { label: "Failed",        color: "#d93025", accent: "#d93025", bg: "rgba(217,48,37,0.10)",   border: "rgba(217,48,37,0.18)",   icon: "✕", sign: ""  },
};

const FILTER_ORDER = ["ALL", "SUCCESS", "WALLET_DEBIT", "TOPUP", "WALLET_REFUND", "REFUND_BANK", "FAILED"];

// ─── Component ─────────────────────────────────────────────────────────────
const TransactionHistory = () => {
  const navigate = useNavigate();
  const [raw, setRaw]                       = useState([]);
  const [walletBalance, setWalletBalance]   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [filter, setFilter]                 = useState("ALL");

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

  // Tag every transaction with its category
  const tagged = useMemo(() =>
    raw.map(t => ({ ...t, _cat: categorise(t) })).filter(t => t._cat !== null),
    [raw]
  );

  const filtered = useMemo(() =>
    filter === "ALL" ? tagged : tagged.filter(t => t._cat === filter),
    [tagged, filter]
  );

  // Stats
  const stats = useMemo(() => ({
    charged:      tagged.filter(t => t._cat === "SUCCESS").reduce((s,t) => s + Number(t.amountPaid||0), 0),
    chargedCount: tagged.filter(t => t._cat === "SUCCESS").length,
    walletBal:    walletBalance,
    debited:      tagged.filter(t => t._cat === "WALLET_DEBIT").reduce((s,t) => s + Number(t.amountPaid||0), 0),
    debitCount:   tagged.filter(t => t._cat === "WALLET_DEBIT").length,
    refunded:     tagged.filter(t => t._cat === "REFUND_BANK" || t._cat === "WALLET_REFUND").reduce((s,t) => s + Number(t.amountPaid||0), 0),
    refundCount:  tagged.filter(t => t._cat === "REFUND_BANK" || t._cat === "WALLET_REFUND").length,
  }), [tagged, walletBalance]);

  // Badge counts per filter
  const counts = useMemo(() => {
    const c = {};
    FILTER_ORDER.forEach(k => {
      c[k] = k === "ALL" ? tagged.length : tagged.filter(t => t._cat === k).length;
    });
    return c;
  }, [tagged]);

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes walletGlow {
          0%,100% { box-shadow: 0 4px 18px rgba(4,191,191,0.12); }
          50%     { box-shadow: 0 4px 28px rgba(4,191,191,0.28); }
        }
        .txn-skel {
          background: linear-gradient(90deg,#e8eaeb 25%,#f2f3f4 50%,#e8eaeb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 16px;
        }
        .pill-scroll::-webkit-scrollbar { display:none; }
        .f-pill { transition: all 0.18s ease; border: none; cursor: pointer; }
        .f-pill:active { transform: scale(0.94); }
        .wbanner { transition: transform 0.15s ease; cursor: pointer; user-select: none; }
        .wbanner:active { transform: scale(0.985); opacity: 0.9; }
        .txn-card { transition: transform 0.15s ease; }
        .txn-card:active { transform: scale(0.99); }
        .add-btn { transition: all 0.18s ease; }
        .add-btn:active { transform: scale(0.93); }
      `}</style>

      {/* TOP BAR */}
      <div className="top-bar">
        <img src="/logo.png" alt="VIZ Logo" className="top-bar-logo" />
      </div>

      <div style={{
        minHeight: "100vh", background: "#f4f6f8",
        paddingTop: 56, paddingBottom: 90,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>

        {/* PAGE HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#011F26", letterSpacing: "-0.4px" }}>
              Transactions
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#7a9090" }}>
              {tagged.length > 0 ? `${tagged.length} records` : "Your payment history"}
            </p>
          </div>
          <button
            onClick={fetchAll} disabled={loading}
            style={{
              width: 38, height: 38, borderRadius: "50%", padding: 0,
              background: loading ? "rgba(4,191,191,0.06)" : "rgba(4,191,191,0.12)",
              border: "1.5px solid rgba(4,191,191,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: loading ? "not-allowed" : "pointer",
              color: "#04BFBF", opacity: loading ? 0.5 : 1, flexShrink: 0,
            }}
            aria-label="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
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
            margin: "14px 16px 0",
            background: "linear-gradient(135deg, #011F26 0%, #0a2e38 50%, #011F26 100%)",
            borderRadius: 20, padding: "16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            border: "1px solid rgba(4,191,191,0.25)",
            animation: "walletGlow 3.5s ease-in-out infinite", gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg, rgba(4,191,191,0.22), rgba(4,191,191,0.08))",
              border: "1.5px solid rgba(4,191,191,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#04BFBF" strokeWidth="1.8">
                <rect x="2" y="7" width="20" height="14" rx="3"/>
                <path d="M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="#04BFBF" stroke="none"/>
                <path d="M2 10h20"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#04BFBF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
                VIZ Wallet
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1 }}>
                {walletBalance !== null ? `₹${Number(walletBalance).toFixed(2)}` : "0"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(4,191,191,0.7)", marginTop: 3 }}>Available balance</div>
            </div>
          </div>
          <button
            className="add-btn"
            onClick={e => { e.stopPropagation(); navigate("/wallet/topup"); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#04BFBF", color: "#011F26",
              padding: "10px 16px", borderRadius: 12,
              fontWeight: 800, fontSize: 13,
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(4,191,191,0.40)",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
            </svg>
            Add Money
          </button>
        </div>

        {/* STATS STRIP */}
        <div style={{ display: "flex", gap: 10, padding: "14px 16px 0", overflowX: "auto" }}>
          <StatCard
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0a8c50" strokeWidth="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            label="Charged" value={`₹${stats.charged.toFixed(2)}`}
            sub={`${stats.chargedCount} sessions`}
            color="#0a8c50" bg="rgba(10,140,80,0.07)" border="rgba(10,140,80,0.18)"
          />
          <StatCard
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="#7c3aed" stroke="none"/></svg>}
            label="Wallet Used" value={`₹${stats.debited.toFixed(2)}`}
            sub={`${stats.debitCount} sessions`}
            color="#7c3aed" bg="rgba(124,58,237,0.07)" border="rgba(124,58,237,0.18)"
          />
          <StatCard
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2.2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>}
            label="Refunded" value={`₹${stats.refunded.toFixed(2)}`}
            sub={`${stats.refundCount} refunds`}
            color="#3a7bd5" bg="rgba(58,123,213,0.07)" border="rgba(58,123,213,0.18)"
          />
        </div>

        {/* FILTER PILLS */}
        <div className="pill-scroll" style={{
          display: "flex", gap: 8, overflowX: "auto", padding: "14px 16px 10px",
          position: "sticky", top: 46, zIndex: 50, background: "#f4f6f8",
        }}>
          {FILTER_ORDER.map(key => {
            const cfg = CAT[key];
            const active = filter === key;
            const cnt = counts[key];
            return (
              <button
                key={key}
                className="f-pill"
                onClick={() => setFilter(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: 30,
                  whiteSpace: "nowrap", fontWeight: 700, fontSize: 12,
                  background: active ? cfg.accent : "#fff",
                  color: active ? "#fff" : "#55777a",
                  boxShadow: active
                    ? `0 4px 14px ${cfg.accent}55`
                    : "0 1px 4px rgba(0,0,0,0.05)",
                  border: active ? "none" : "1.5px solid rgba(0,0,0,0.08)",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: key === "REFUND_BANK" ? 10 : 13 }}>{cfg.icon}</span>
                {cfg.label}
                {cnt > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    background: active ? "rgba(255,255,255,0.25)" : `${cfg.accent}22`,
                    color: active ? "#fff" : cfg.accent,
                    borderRadius: 99, padding: "1px 6px", minWidth: 18, textAlign: "center",
                  }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* SKELETON */}
        {loading && (
          <div style={{ padding: "4px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4].map(i => <div key={i} className="txn-skel" style={{ height: 100 }} />)}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filtered.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "64px 24px 0", gap: 10, textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(4,191,191,0.08)", border: "1.5px solid rgba(4,191,191,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 4,
            }}>🧾</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#011F26" }}>No Transactions</div>
            <div style={{ fontSize: 13, color: "#7a9090", maxWidth: 240, lineHeight: 1.5 }}>
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
                  marginTop: 8, padding: "12px 28px", borderRadius: 14,
                  background: "#04BFBF", color: "#011F26",
                  fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(4,191,191,0.32)",
                }}
              >+ Add Money to Wallet</button>
            )}
          </div>
        )}

        {/* TRANSACTION CARDS */}
        <div style={{ padding: "4px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {!loading && filtered.map(txn => <TxnCard key={txn._id} txn={txn} />)}
        </div>
      </div>

      <FooterNav />
    </>
  );
};

// ─── Transaction Card ───────────────────────────────────────────────────────
const TxnCard = ({ txn }) => {
  const cat = txn._cat;
  const cfg = CAT[cat];
  const date = fmt(txn.paidAt || txn.createdAt);

  // Amount display: + for credits, - for debits
  const amtColor = ["TOPUP","WALLET_REFUND","REFUND_BANK"].includes(cat) ? cfg.color : "#011F26";
  const amtStr   = `${cfg.sign}₹${Number(txn.amountPaid||0).toFixed(2)}`;

  // Label text per category
  const labelMap = {
    SUCCESS:       "Charging Payment",
    TOPUP:         "Wallet Topup",
    WALLET_DEBIT:  "Wallet Debit",
    WALLET_REFUND: "Wallet Refund",
    REFUND_BANK:   "Bank Refund",
    FAILED:        "Payment Failed",
  };

  // Via / method
  const methodVal = cat === "SUCCESS"
    ? (fmtGroup(txn.paymentGroup) || txn.paymentMethod || null)
    : cat === "WALLET_DEBIT"
      ? "Sparx Wallet"
      : null;

  return (
    <div className="txn-card" style={{
      background: "#fff", borderRadius: 18,
      overflow: "hidden", display: "flex",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      border: `1px solid ${cfg.border}`,
    }}>
      {/* Color stripe */}
      <div style={{ width: 4, background: cfg.accent, flexShrink: 0 }} />

      <div style={{ flex: 1, padding: "13px 14px" }}>
        {/* Row 1: Badge + Amount */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 11,
          }}>
            <span style={{ fontSize: cat === "REFUND_BANK" ? 10 : 13 }}>{cfg.icon}</span>
            {labelMap[cat]}
          </span>
          <div style={{
            fontSize: 21, fontWeight: 800, color: amtColor,
            letterSpacing: "-0.5px", flexShrink: 0, marginLeft: 8,
          }}>
            {amtStr}
          </div>
        </div>

        {/* Order ID */}
        <div style={{ fontSize: 10.5, color: "#9ab0b0", fontFamily: "monospace", marginTop: 6, wordBreak: "break-all" }}>
          #{txn.orderId || txn._id}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#f0f0f0", margin: "10px 0" }} />

        {/* Meta rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {date       && <MetaRow label="Date"    value={date} />}
          {methodVal  && <MetaRow label="Via"     value={methodVal} />}
          {txn.bankReference && <MetaRow label="Ref No." value={txn.bankReference} mono />}
          {txn.deviceId      && <MetaRow label="Device"  value={txn.deviceId} />}
          {txn.sessionId     && <MetaRow label="Session" value={txn.sessionId} mono />}
          {/* Wallet refund: show session that triggered it */}
          {cat === "WALLET_REFUND" && txn.description && <MetaRow label="Note" value={txn.description} />}
          {/* Bank refund: show refund ID + status */}
          {cat === "REFUND_BANK" && txn.refundId     && <MetaRow label="Refund ID" value={txn.refundId} mono />}
          {cat === "REFUND_BANK" && txn.refundStatus && (
            <MetaRow label="Status" value={txn.refundStatus.charAt(0).toUpperCase() + txn.refundStatus.slice(1)} />
          )}
        </div>

        {/* Failure reason */}
        {cat === "FAILED" && txn.failureReason && (
          <div style={{
            marginTop: 10, background: "rgba(217,48,37,0.07)",
            color: "#d93025", padding: "8px 12px", borderRadius: 10,
            fontSize: 11, fontWeight: 600,
          }}>
            ⚠ {txn.failureReason}
          </div>
        )}
        {/* Bank refund failure */}
        {cat === "REFUND_BANK" && txn.refundFailureReason && (
          <div style={{
            marginTop: 10, background: "rgba(217,48,37,0.07)",
            color: "#d93025", padding: "8px 12px", borderRadius: 10,
            fontSize: 11, fontWeight: 600,
          }}>
            ⚠ {txn.refundFailureReason}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────
const MetaRow = ({ label, value, mono }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ fontSize: 11, color: "#9ab0b0", fontWeight: 500 }}>{label}</span>
    <span style={{
      fontSize: 11, fontWeight: 700, color: "#011F26",
      fontFamily: mono ? "monospace" : "inherit",
      textAlign: "right", maxWidth: "65%", wordBreak: "break-all",
    }}>{value}</span>
  </div>
);

const StatCard = ({ icon, label, value, sub, color, bg, border }) => (
  <div style={{
    flex: "1 1 0", minWidth: 120, background: "#fff",
    borderRadius: 16, padding: "13px 14px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    border: `1px solid ${border}`,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>{icon}</div>
      <span style={{ fontSize: 11, color: "#7a9090", fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ fontSize: 19, fontWeight: 800, color, letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10.5, color: "#9ab0b0", marginTop: 4 }}>{sub}</div>
  </div>
);

export default TransactionHistory;