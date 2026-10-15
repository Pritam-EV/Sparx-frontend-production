// src/pages/TransactionHistory.js (or src/components/TransactionHistory.js)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import FooterNav from "../components/FooterNav";
import AppHeader from "../components/AppHeader";

// ─── Formatters & Helpers ─────────────────────────────────────────────────────
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

const fmtMethod = (g) =>
  g ? g.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;

// ─── Categorization Engine ───────────────────────────────────────────────────
function categorise(t) {
  if (t.isWalletEntry) {
    if (t.walletTxnType === "topup") return "TOPUP";
    if (t.walletTxnType === "refund") return "WALLET_REFUND";
    return "WALLET_REFUND";
  }
  if (t.isRefundEntry) return "REFUND_BANK";
  if (t.type === "wallet_topup") {
    if (t.status === "SUCCESS") return "TOPUP";
    return null;
  }
  const isWalletPay = t.gateway === "wallet" || t.txnSource === "wallet_pay";
  if (isWalletPay) return "WALLET_DEBIT";
  if (t.status === "SUCCESS") return "SUCCESS";
  if (t.status === "FAILED") return "FAILED";
  return null;
}

// ─── Filter Category Definitions ──────────────────────────────────────────────
const TABS = [
  { id: "ALL", label: "All" },
  { id: "OUT", label: "Spent" },
  { id: "TOPUP", label: "Top-ups" },
  { id: "REFUND", label: "Refunds" },
  { id: "FAILED", label: "Failed" },
];

const CAT_CONFIG = {
  SUCCESS: {
    label: "Charging Payment",
    sign: "−",
    isDebit: true,
    badgeBg: "#f1fcf9",
    badgeBorder: "#d2f0eb",
    iconColor: "#00776b",
  },
  WALLET_DEBIT: {
    label: "Wallet Payment",
    sign: "−",
    isDebit: true,
    badgeBg: "#f4f7fb",
    badgeBorder: "#dce6f2",
    iconColor: "#506f96",
  },
  TOPUP: {
    label: "Wallet Top-up",
    sign: "+",
    isDebit: false,
    badgeBg: "#dbfaf0",
    badgeBorder: "#b8f2dd",
    iconColor: "#008764",
  },
  WALLET_REFUND: {
    label: "Wallet Refund",
    sign: "+",
    isDebit: false,
    badgeBg: "#e4faf6",
    badgeBorder: "#c2f0e8",
    iconColor: "#008f7f",
  },
  REFUND_BANK: {
    label: "Bank Refund",
    sign: "+",
    isDebit: false,
    badgeBg: "#eef7ff",
    badgeBorder: "#d2e5f8",
    iconColor: "#2272c7",
  },
  FAILED: {
    label: "Payment Failed",
    sign: "",
    isDebit: false,
    badgeBg: "#fff2f0",
    badgeBorder: "#ffd4ce",
    iconColor: "#d93b3b",
  },
};

// ─── Smooth Height Expansion Panel ───────────────────────────────────────────
const ExpandPanel = ({ open, children }) => {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    setHeight(open ? ref.current.scrollHeight : 0);
  }, [open, children]);

  return (
    <div
      style={{
        overflow: "hidden",
        height: height,
        transition: "height 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TransactionHistory = () => {
  const navigate = useNavigate();
  const [raw, setRaw] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const [txnRes, balRes] = await Promise.all([
        api.get("/api/payment/my-transactions"),
        api.get("/api/wallet/balance").catch(() => ({ data: {} })),
      ]);
      setRaw(txnRes.data.transactions || []);
      if (typeof balRes.data.balance === "number") setWalletBalance(balRes.data.balance);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Tag every transaction with its resolved category
  const tagged = useMemo(() => {
    return raw
      .map((t) => ({ ...t, _cat: categorise(t) }))
      .filter((t) => t._cat !== null)
      .sort((a, b) => {
        const dateA = new Date(a.paidAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.paidAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [raw]);

  // Tab Filtering Logic
  const filtered = useMemo(() => {
    if (activeTab === "ALL") return tagged;
    if (activeTab === "OUT") {
      return tagged.filter((t) => t._cat === "SUCCESS" || t._cat === "WALLET_DEBIT");
    }
    if (activeTab === "TOPUP") {
      return tagged.filter((t) => t._cat === "TOPUP");
    }
    if (activeTab === "REFUND") {
      return tagged.filter((t) => t._cat === "WALLET_REFUND" || t._cat === "REFUND_BANK");
    }
    if (activeTab === "FAILED") {
      return tagged.filter((t) => t._cat === "FAILED");
    }
    return tagged;
  }, [tagged, activeTab]);

  // Financial Summary Stats
  const stats = useMemo(() => {
    const totalSpent = tagged
      .filter((t) => t._cat === "SUCCESS" || t._cat === "WALLET_DEBIT")
      .reduce((sum, t) => sum + Number(t.amountPaid || 0), 0);

    const totalCredited = tagged
      .filter((t) => t._cat === "TOPUP" || t._cat === "WALLET_REFUND" || t._cat === "REFUND_BANK")
      .reduce((sum, t) => sum + Number(t.amountPaid || 0), 0);

    return { totalSpent, totalCredited };
  }, [tagged]);

  // Category counts for tab badges
  const counts = useMemo(() => ({
    ALL: tagged.length,
    OUT: tagged.filter((t) => t._cat === "SUCCESS" || t._cat === "WALLET_DEBIT").length,
    TOPUP: tagged.filter((t) => t._cat === "TOPUP").length,
    REFUND: tagged.filter((t) => t._cat === "WALLET_REFUND" || t._cat === "REFUND_BANK").length,
    FAILED: tagged.filter((t) => t._cat === "FAILED").length,
  }), [tagged]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const copyToClipboard = (text, label) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setToastMessage(`${label} copied to clipboard`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  return (
    <>
      <AppHeader />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .tx-viewport {
          width: 100%;
          min-height: calc(100dvh - 68px);
          height: calc(100dvh - 68px);
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 100% 0%, rgba(0, 229, 190, 0.08), transparent 26rem),
            radial-gradient(circle at 0% 45%, rgba(255, 130, 54, 0.05), transparent 24rem),
            #f3fbfc;
          color: #0e2e33;
          font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }

        .tx-shell {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px 16px calc(110px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* ── WALLET BALANCE & RECAP CARD ── */
        .tx-wallet-card {
          width: 100%;
          background: linear-gradient(135deg, #ffffff 40%, #eefbf9 100%);
          border: 1px solid #d4f0ec;
          border-radius: 22px;
          box-shadow: 0 4px 18px rgba(0, 160, 145, 0.07);
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .tx-wallet-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .tx-wallet-icon-box {
          width: 46px;
          height: 46px;
          border-radius: 15px;
          background: linear-gradient(135deg, #fff3e6 0%, #ffe3c4 100%);
          border: 1px solid #ffd4a8;
          color: #e06014;
          display: grid;
          place-items: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .tx-wallet-label {
          font-size: 10px;
          font-weight: 800;
          color: #53757a;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .tx-wallet-amount {
          font-family: 'Outfit', sans-serif;
          font-size: 23px;
          font-weight: 800;
          color: #0e2e33;
          letter-spacing: -0.4px;
          line-height: 1.15;
          margin-top: 2px;
        }

        .tx-btn-add {
          padding: 9px 15px;
          border-radius: 13px;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          border: none;
          color: #ffffff;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(255, 82, 26, 0.35);
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.16s ease;
          flex-shrink: 0;
        }
        .tx-btn-add:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(255, 82, 26, 0.45);
        }
        .tx-btn-add:active {
          transform: scale(0.96);
        }

        /* ── SUMMARY STATS BANNER ── */
        .tx-stats-grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .tx-stat-pill {
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 16px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 8px rgba(0, 160, 140, 0.04);
        }

        .tx-stat-caption {
          font-size: 10.5px;
          font-weight: 750;
          color: #53757a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .tx-stat-val {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 800;
          margin-top: 3px;
          line-height: 1.2;
        }
        .tx-stat-val.debit {
          color: #0e2e33;
        }
        .tx-stat-val.credit {
          color: #008764;
        }

        /* ── FILTER TABS ── */
        .tx-tabs-scroll {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 2px 0;
        }
        .tx-tabs-scroll::-webkit-scrollbar {
          display: none;
        }

        .tx-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          color: #53757a;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.16s ease;
        }
        .tx-tab-btn:hover {
          background: #edfbf8;
          border-color: #00d2b4;
          color: #00776b;
        }
        .tx-tab-btn.active {
          background: #00d2b4;
          border-color: #00d2b4;
          color: #ffffff;
          box-shadow: 0 3px 10px rgba(0, 210, 180, 0.32);
        }

        .tx-tab-badge {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.06);
          font-weight: 800;
        }
        .tx-tab-btn.active .tx-tab-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        /* ── TRANSACTION CARDS ── */
        .tx-card-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tx-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 20px;
          box-shadow: 0 3px 12px rgba(0, 160, 145, 0.04);
          overflow: hidden;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
          box-sizing: border-box;
        }
        .tx-card:hover {
          border-color: #b7ede4;
          box-shadow: 0 6px 18px rgba(0, 160, 145, 0.08);
          transform: translateY(-1px);
        }
        .tx-card.expanded {
          border-color: #00d2b4;
          box-shadow: 0 8px 24px rgba(0, 160, 145, 0.12);
        }

        .tx-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          cursor: pointer;
          gap: 12px;
          user-select: none;
        }

        .tx-card-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }

        .tx-icon-circle {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .tx-title-meta {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .tx-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tx-title {
          font-size: 13.5px;
          font-weight: 750;
          color: #0e2e33;
          letter-spacing: -0.15px;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tx-date {
          font-size: 11px;
          color: #799ea4;
          font-weight: 500;
          line-height: 1.3;
        }

        .tx-card-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          text-align: right;
        }

        .tx-amount {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.3px;
          font-variant-numeric: tabular-nums;
        }
        .tx-amount.debit {
          color: #0e2e33;
        }
        .tx-amount.credit {
          color: #008764;
        }
        .tx-amount.failed {
          color: #d93b3b;
          text-decoration: line-through;
        }

        .tx-chevron {
          width: 16px;
          height: 16px;
          color: #799ea4;
          transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tx-chevron.open {
          transform: rotate(180deg);
          color: #008f7f;
        }

        /* ── EXPANDED DETAILS ACCORDION ── */
        .tx-expanded-body {
          padding: 12px 16px 16px;
          border-top: 1px dashed #d8f2ee;
          background: #fafdfd;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tx-detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          color: #53757a;
        }

        .tx-detail-val {
          font-weight: 600;
          color: #0e2e33;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .tx-copy-chip {
          padding: 2px 7px;
          border-radius: 6px;
          background: #eefbf8;
          border: 1px solid #c9ede7;
          color: #00776b;
          font-size: 10px;
          font-family: monospace;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .tx-copy-chip:hover {
          background: #dbf7f1;
        }

        .tx-fail-box {
          background: #fff4f2;
          border: 1px solid #ffd8d3;
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          color: #c22b2b;
          font-size: 11.5px;
          line-height: 1.4;
          font-weight: 600;
        }

        .tx-btn-view-receipt {
          margin-top: 4px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 12px;
          background: #ffffff;
          border: 1.5px solid #c8ede6;
          color: #00776b;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .tx-btn-view-receipt:hover {
          background: #eefbf8;
          border-color: #00d2b4;
        }

        /* ── EMPTY & SKELETON STATES ── */
        .tx-empty-state {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 24px;
          padding: 36px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 18px rgba(0, 160, 145, 0.05);
        }

        .tx-empty-icon {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          background: #eefbf8;
          border: 1px solid #d2f0eb;
          color: #00776b;
          display: grid;
          place-items: center;
          font-size: 24px;
          margin-bottom: 4px;
        }

        .tx-skeleton {
          width: 100%;
          height: 70px;
          border-radius: 18px;
          background: linear-gradient(90deg, #e4f4f3 25%, #f4fbfb 50%, #e4f4f3 75%);
          background-size: 200% 100%;
          animation: txShimmer 1.5s infinite ease-in-out;
        }

        @keyframes txShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }

        /* ── TOAST NOTIFICATION ── */
        .tx-toast {
          position: fixed;
          bottom: 96px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          padding: 10px 18px;
          border-radius: 999px;
          background: rgba(14, 46, 51, 0.92);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(8px);
          animation: txFadeIn 0.2s ease;
        }

        @keyframes txFadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      <div className="tx-viewport">
        <div className="tx-shell">

          {/* ── WALLET BALANCE & TOP-UP BANNER ── */}
          <div className="tx-wallet-card">
            <div className="tx-wallet-left">
              <div className="tx-wallet-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 12H4V9h16v10zm-3-5c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zM4 5h16V3H4c-1.1 0-2 .9-2 2v2h2V5z" />
                </svg>
              </div>
              <div>
                <span className="tx-wallet-label">VIZ Wallet Balance</span>
                <div className="tx-wallet-amount">
                  {walletBalance !== null ? `₹${Number(walletBalance).toFixed(2)}` : "—"}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="tx-btn-add"
              onClick={() => navigate("/wallet/topup")}
              aria-label="Add money to wallet"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Money</span>
            </button>
          </div>

          {/* ── FINANCIAL RECAP (SPENT VS ADDED) ── */}
          <div className="tx-stats-grid">
            <div className="tx-stat-pill">
              <span className="tx-stat-caption">
                <span style={{ color: "#e06014" }}>↓</span> Total Spent
              </span>
              <div className="tx-stat-val debit">₹{stats.totalSpent.toFixed(2)}</div>
            </div>

            <div className="tx-stat-pill">
              <span className="tx-stat-caption">
                <span style={{ color: "#008764" }}>↑</span> Credited / Refund
              </span>
              <div className="tx-stat-val credit">₹{stats.totalCredited.toFixed(2)}</div>
            </div>
          </div>

          {/* ── FILTER TABS ── */}
          <div className="tx-tabs-scroll" role="tablist">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const count = counts[tab.id] || 0;
              return (
                <button
                  type="button"
                  key={tab.id}
                  className={`tx-tab-btn ${active ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={active}
                >
                  <span>{tab.label}</span>
                  {count > 0 && <span className="tx-tab-badge">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* ── TRANSACTIONS LIST ── */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="tx-skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="tx-empty-state">
              <div className="tx-empty-icon">🧾</div>
              <h3 style={{ fontSize: 16, fontWeight: 750, margin: "2px 0 0" }}>No Transactions</h3>
              <p style={{ fontSize: 12.5, color: "#53757a", margin: 0, maxWidth: 240, lineHeight: 1.5 }}>
                {activeTab === "TOPUP"
                  ? "No top-up records yet. Top up your wallet to start charging."
                  : activeTab === "FAILED"
                  ? "No failed payments — all transactions were processed smoothly!"
                  : "No transaction records found in this category."}
              </p>
            </div>
          ) : (
            <div className="tx-card-list">
              {filtered.map((txn) => {
                const cat = txn._cat;
                const cfg = CAT_CONFIG[cat] || CAT_CONFIG.SUCCESS;
                const isExpanded = expandedId === txn._id;
                const formattedDate = fmtDate(txn.paidAt || txn.createdAt);
                const isCredit = !cfg.isDebit && cat !== "FAILED";

                return (
                  <article
                    key={txn._id}
                    className={`tx-card ${isExpanded ? "expanded" : ""}`}
                  >
                    {/* Collapsed Header */}
                    <div
                      className="tx-card-header"
                      onClick={() => toggleExpand(txn._id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") toggleExpand(txn._id);
                      }}
                    >
                      <div className="tx-card-left">
                        <div
                          className="tx-icon-circle"
                          style={{
                            background: cfg.badgeBg,
                            border: `1px solid ${cfg.badgeBorder}`,
                            color: cfg.iconColor,
                          }}
                        >
                          {cat === "FAILED" ? (
                            "✕"
                          ) : isCredit ? (
                            "↑"
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                          )}
                        </div>

                        <div className="tx-title-meta">
                          <div className="tx-title-row">
                            <span className="tx-title">{cfg.label}</span>
                          </div>
                          <span className="tx-date">{formattedDate}</span>
                        </div>
                      </div>

                      <div className="tx-card-right">
                        <div
                          className={`tx-amount ${cat === "FAILED" ? "failed" : isCredit ? "credit" : "debit"}`}
                        >
                          {cfg.sign}₹{Number(txn.amountPaid || txn.amount || 0).toFixed(2)}
                        </div>

                        <svg
                          className={`tx-chevron ${isExpanded ? "open" : ""}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {/* Smooth Expanded Panel */}
                    <ExpandPanel open={isExpanded}>
                      <div className="tx-expanded-body">
                        {/* Charger or Payment Channel */}
                        {txn.deviceId && (
                          <div className="tx-detail-row">
                            <span>Charger Station</span>
                            <span className="tx-detail-val">{txn.deviceId}</span>
                          </div>
                        )}

                        <div className="tx-detail-row">
                          <span>Payment Method</span>
                          <span className="tx-detail-val">
                            {cat === "WALLET_DEBIT"
                              ? "VIZ Wallet"
                              : fmtMethod(txn.paymentGroup) || txn.paymentMethod || txn.gateway || "UPI / Card"}
                          </span>
                        </div>

                        {/* Order ID with Copy Chip */}
                        {txn.orderId && (
                          <div className="tx-detail-row">
                            <span>Order ID</span>
                            <button
                              type="button"
                              className="tx-copy-chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(txn.orderId, "Order ID");
                              }}
                              title="Click to copy Order ID"
                            >
                              <span>{txn.orderId}</span>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* Session ID with Copy Chip */}
                        {txn.sessionId && (
                          <div className="tx-detail-row">
                            <span>Session ID</span>
                            <button
                              type="button"
                              className="tx-copy-chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(txn.sessionId, "Session ID");
                              }}
                              title="Click to copy Session ID"
                            >
                              <span>{txn.sessionId}</span>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* Bank Ref */}
                        {txn.bankReference && (
                          <div className="tx-detail-row">
                            <span>Bank Reference</span>
                            <span className="tx-detail-val" style={{ fontFamily: "monospace", fontSize: 11 }}>
                              {txn.bankReference}
                            </span>
                          </div>
                        )}

                        {/* Refund Tracking */}
                        {cat === "REFUND_BANK" && txn.refundId && (
                          <div className="tx-detail-row">
                            <span>Refund Reference</span>
                            <span className="tx-detail-val" style={{ fontFamily: "monospace", fontSize: 11 }}>
                              {txn.refundId}
                            </span>
                          </div>
                        )}

                        {/* Failure Details */}
                        {(txn.failureReason || txn.refundFailureReason) && (
                          <div className="tx-fail-box">
                            <span style={{ fontSize: 14 }}>⚠️</span>
                            <span>{txn.failureReason || txn.refundFailureReason}</span>
                          </div>
                        )}

                        {/* Direct Receipt / Summary Link */}
                        {txn.sessionId && (
                          <button
                            type="button"
                            className="tx-btn-view-receipt"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/session-summary", {
                                state: { sessionId: txn.sessionId },
                              });
                            }}
                          >
                            <span>View Tax Invoice / Summary</span>
                            <span>→</span>
                          </button>
                        )}
                      </div>
                    </ExpandPanel>
                  </article>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── FLOATING COPY TOAST ── */}
      {toastMessage && <div className="tx-toast">{toastMessage}</div>}

      {/* ── FOOTER NAV ── */}
      <FooterNav />
    </>
  );
};

export default TransactionHistory;