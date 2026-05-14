import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import FooterNav from "../components/FooterNav";

const statusConfig = {
  ALL:          { label: "All",           color: "#04BFBF", bg: "rgba(4,191,191,0.10)"  },
  SUCCESS:      { label: "Success",       color: "#0a8c50", bg: "rgba(10,140,80,0.10)",  accent: "#0a8c50", icon: "✓" },
  FAILED:       { label: "Failed",        color: "#d93025", bg: "rgba(217,48,37,0.10)",  accent: "#d93025", icon: "✕" },
  REFUND:       { label: "Refund",        color: "#3a7bd5", bg: "rgba(58,123,213,0.10)", accent: "#3a7bd5", icon: "↩" },
  TOPUP:        { label: "Wallet Topup",  color: "#F2A007", bg: "rgba(242,160,7,0.10)",  accent: "#F2A007", icon: "↑" },
  WALLET_REFUND:{ label: "Wallet Credit", color: "#04BFBF", bg: "rgba(4,191,191,0.10)",  accent: "#04BFBF", icon: "↩" },
};

const VISIBLE_STATUSES = ["SUCCESS", "FAILED", "REFUND", "TOPUP", "WALLET_REFUND"];

const TransactionHistory = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions]     = useState([]);
  const [walletBalance, setWalletBalance]   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const [txnRes, balRes] = await Promise.all([
        api.get("/api/payment/my-transactions"),
        api.get("/api/wallet/balance").catch(() => ({ data: {} })),
      ]);
      const all = txnRes.data.transactions || [];
      setTransactions(all.filter(t => VISIBLE_STATUSES.includes(t.status)));
      if (typeof balRes.data.balance === "number") setWalletBalance(balRes.data.balance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const filteredTransactions = useMemo(() => {
    if (selectedStatus === "ALL") return transactions;
    if (selectedStatus === "TOPUP") return transactions.filter(t => t.isWalletEntry);
    return transactions.filter(t => t.status === selectedStatus);
  }, [transactions, selectedStatus]);

  const totalPaid    = transactions.filter(t => t.status === "SUCCESS").reduce((s,t) => s + Number(t.amountPaid||0), 0);
  const totalRefunds = transactions.filter(t => t.status === "REFUND" || t.status === "WALLET_REFUND").reduce((s,t) => s + Number(t.amountPaid||0), 0);

  const formatDate  = d => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:true }) : null;
  const formatGroup = g => g ? g.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase()) : null;

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
        .filter-pill { transition: all 0.18s ease; }
        .filter-pill:active { transform: scale(0.95); }
        .wallet-banner { transition: transform 0.15s ease, opacity 0.15s ease; }
        .wallet-banner:active { transform: scale(0.985); opacity: 0.9; }
        .add-money-btn { transition: all 0.18s ease; }
        .add-money-btn:active { transform: scale(0.93); }
        .txn-card { transition: transform 0.15s ease; }
        .txn-card:active { transform: scale(0.99); }
      `}</style>

      {/* TOP BAR */}
      <div className="top-bar">
        <img src="/logo.png" alt="VIZ Logo" className="top-bar-logo" />
      </div>

      <div style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        paddingTop: 56,
        paddingBottom: 90,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>

        {/* ── PAGE HEADER ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 16px 0",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#011F26", letterSpacing: "-0.4px" }}>
              Transactions
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#7a9090" }}>
              {transactions.length > 0 ? `${transactions.length} records found` : "Your payment history"}
            </p>
          </div>
          <button
            onClick={fetchTransactions}
            disabled={loading}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: loading ? "rgba(4,191,191,0.06)" : "rgba(4,191,191,0.12)",
              border: "1.5px solid rgba(4,191,191,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: loading ? "not-allowed" : "pointer",
              color: "#04BFBF", opacity: loading ? 0.5 : 1,
              transition: "all 0.2s", padding: 0, flexShrink: 0,
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
        {/* ── WALLET BANNER ── */}
        <div
          className="wallet-banner"
          onClick={() => navigate("/wallet/topup")}
          style={{
            margin: "14px 16px 0",
            background: "linear-gradient(135deg, #011F26 0%, #0a2e38 50%, #011F26 100%)",
            borderRadius: 20,
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            border: "1px solid rgba(4,191,191,0.25)",
            animation: "walletGlow 3.5s ease-in-out infinite",
            userSelect: "none",
            gap: 12,
          }}
        >
          {/* Left */}
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
                <path d="M2 10h20M6 4l2-1h8l2 1"/>
              </svg>
            </div>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: "#04BFBF",
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3,
              }}>
                VIZ Wallet
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1 }}>
                {walletBalance !== null ? `₹${Number(walletBalance).toFixed(2)}` : "—"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(4,191,191,0.7)", marginTop: 3 }}>
                Available balance
              </div>
            </div>
          </div>

          {/* Add Money Button */}
          <button
            className="add-money-btn"
            onClick={(e) => { e.stopPropagation(); navigate("/wallet/topup"); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#04BFBF",
              color: "#011F26",
              padding: "10px 16px",
              borderRadius: 12,
              fontWeight: 800, fontSize: 13,
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(4,191,191,0.40)",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
            Add Money
          </button>
        </div>
        
        {/* ── STATS STRIP — 2 cards only (no wallet card here) ── */}
        <div style={{ display: "flex", gap: 10, padding: "14px 16px 0", overflowX: "auto" }}>
          <StatCard
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a8c50" strokeWidth="2.2">
                <path d="M12 22V12M12 12L8 16M12 12l4 4"/><path d="M20 14.54A9 9 0 1 0 12 21"/>
              </svg>
            }
            label="Total Charged"
            value={`₹${totalPaid.toFixed(2)}`}
            sub={`${transactions.filter(t=>t.status==="SUCCESS").length} sessions`}
            color="#0a8c50"
            bg="rgba(10,140,80,0.07)"
            border="rgba(10,140,80,0.18)"
          />
          <StatCard
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2.2">
                <path d="M3 12l9-9 9 9"/><path d="M9 21V12h6v9"/>
              </svg>
            }
            label="Refunds"
            value={`₹${totalRefunds.toFixed(2)}`}
            sub={`${transactions.filter(t=>t.status==="REFUND"||t.status==="WALLET_REFUND").length} transactions`}
            color="#3a7bd5"
            bg="rgba(58,123,213,0.07)"
            border="rgba(58,123,213,0.18)"
          />
        </div>



        {/* ── FILTER PILLS ── */}
        <div
          className="pill-scroll"
          style={{
            display: "flex", gap: 8, overflowX: "auto", padding: "14px 16px 10px",
            position: "sticky", top: 46, zIndex: 50, background: "#f4f6f8",
          }}
        >
          {Object.keys(statusConfig).map(key => {
            const st = statusConfig[key];
            const active = selectedStatus === key;
            return (
              <button
                key={key}
                className="filter-pill"
                onClick={() => setSelectedStatus(key)}
                style={{
                  padding: "8px 18px", borderRadius: 30, cursor: "pointer",
                  whiteSpace: "nowrap", fontWeight: 700, fontSize: 12,
                  border: active ? "none" : "1.5px solid rgba(0,0,0,0.09)",
                  background: active ? "#04BFBF" : "#fff",
                  color: active ? "#fff" : "#55777a",
                  boxShadow: active ? "0 4px 14px rgba(4,191,191,0.30)" : "0 1px 4px rgba(0,0,0,0.05)",
                  margin: 0, flexShrink: 0,
                }}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* ── SKELETON LOADERS ── */}
        {loading && (
          <div style={{ padding: "4px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="txn-skel" style={{ height: 96 }} />
            ))}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && filteredTransactions.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            paddingTop: 64, gap: 10, textAlign: "center", padding: "64px 24px 0",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(4,191,191,0.08)", border: "1.5px solid rgba(4,191,191,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, marginBottom: 4,
            }}>
              🧾
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#011F26" }}>
              No Transactions Found
            </div>
            <div style={{ fontSize: 13, color: "#7a9090", maxWidth: 240, lineHeight: 1.5 }}>
              {selectedStatus === "TOPUP"
                ? "You haven't added money to your wallet yet."
                : "Completed payments will appear here."}
            </div>
            {selectedStatus === "TOPUP" && (
              <button
                onClick={() => navigate("/wallet/topup")}
                style={{
                  marginTop: 8, padding: "12px 28px", borderRadius: 14,
                  background: "#04BFBF", color: "#011F26",
                  fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(4,191,191,0.32)",
                }}
              >
                + Add Money to Wallet
              </button>
            )}
          </div>
        )}

        {/* ── TRANSACTION CARDS ── */}
        <div style={{ padding: "4px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {!loading && filteredTransactions.map(txn => {
            const dateVal = formatDate(txn.paidAt || txn.createdAt);

            // ── WALLET TOPUP CARD ──
            if (txn.isWalletEntry && txn.status === "TOPUP") {
              return (
                <div key={txn._id} className="txn-card" style={{
                  background: "#fff", borderRadius: 18, overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  border: "1px solid rgba(242,160,7,0.15)", display: "flex",
                }}>
                  <div style={{ width: 4, background: "#F2A007", flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "13px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 10px", borderRadius: 20,
                        background: "rgba(242,160,7,0.10)", color: "#cc8800", fontWeight: 700, fontSize: 11,
                      }}>
                        ↑ Wallet Topup
                      </span>
                      <div style={{ fontSize: 21, fontWeight: 800, color: "#F2A007", letterSpacing: "-0.5px" }}>
                        +₹{Number(txn.amountPaid||0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontSize: 10.5, color: "#9ab0b0", fontFamily: "monospace", marginTop: 6 }}>
                      #{txn.orderId}
                    </div>
                    <div style={{ height: 1, background: "#f0f0f0", margin: "10px 0" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {dateVal && <MetaRow label="Date" value={dateVal} />}
                      {txn.description && <MetaRow label="Note" value={txn.description} />}
                    </div>
                  </div>
                </div>
              );
            }

            // ── WALLET CREDIT CARD ──
            if (txn.isWalletEntry && txn.status === "WALLET_REFUND") {
              return (
                <div key={txn._id} className="txn-card" style={{
                  background: "#fff", borderRadius: 18, overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  border: "1px solid rgba(4,191,191,0.15)", display: "flex",
                }}>
                  <div style={{ width: 4, background: "#04BFBF", flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "13px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 10px", borderRadius: 20,
                        background: "rgba(4,191,191,0.10)", color: "#04BFBF", fontWeight: 700, fontSize: 11,
                      }}>
                        ↩ Wallet Credit
                      </span>
                      <div style={{ fontSize: 21, fontWeight: 800, color: "#04BFBF", letterSpacing: "-0.5px" }}>
                        +₹{Number(txn.amountPaid||0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontSize: 10.5, color: "#9ab0b0", fontFamily: "monospace", marginTop: 6 }}>
                      #{txn.orderId}
                    </div>
                    <div style={{ height: 1, background: "#f0f0f0", margin: "10px 0" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {dateVal && <MetaRow label="Date" value={dateVal} />}
                      {txn.description && <MetaRow label="Note" value={txn.description} />}
                    </div>
                  </div>
                </div>
              );
            }

            // ── GATEWAY REFUND CARD ──
            if (txn.isRefundEntry) {
              return (
                <div key={txn._id} className="txn-card" style={{
                  background: "#fff", borderRadius: 18, overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  border: "1px solid rgba(58,123,213,0.15)", display: "flex",
                }}>
                  <div style={{ width: 4, background: "#3a7bd5", flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "13px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 10px", borderRadius: 20,
                        background: "rgba(58,123,213,0.10)", color: "#3a7bd5", fontWeight: 700, fontSize: 11,
                      }}>
                        ↩ Refund
                      </span>
                      <div style={{ fontSize: 21, fontWeight: 800, color: "#3a7bd5", letterSpacing: "-0.5px" }}>
                        ₹{Number(txn.amountPaid||0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontSize: 10.5, color: "#9ab0b0", fontFamily: "monospace", marginTop: 6 }}>
                      #{txn.orderId}
                    </div>
                    <div style={{ height: 1, background: "#f0f0f0", margin: "10px 0" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {dateVal && <MetaRow label="Date" value={dateVal} />}
                      {txn.refundId && <MetaRow label="Refund ID" value={txn.refundId} mono />}
                      {txn.refundStatus && <MetaRow label="Status" value={txn.refundStatus.charAt(0).toUpperCase()+txn.refundStatus.slice(1)} />}
                    </div>
                    {txn.refundFailureReason && (
                      <div style={{
                        marginTop: 10, background: "rgba(217,48,37,0.07)",
                        color: "#d93025", padding: "8px 12px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                      }}>
                        ⚠ {txn.refundFailureReason}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ── NORMAL PAYMENT CARD ──
            const st = statusConfig[txn.status] || statusConfig.FAILED;
            const isWalletPay = txn.gateway === "wallet" || txn.txnSource === "wallet_pay";
            const methodVal = isWalletPay ? "Sparx Wallet" : (formatGroup(txn.paymentGroup) || txn.paymentMethod || null);
            const refVal    = txn.bankReference || null;
            const deviceVal = txn.deviceId || null;

            return (
              <div key={txn._id} className="txn-card" style={{
                background: "#fff", borderRadius: 18, overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                border: "1px solid rgba(0,0,0,0.05)", display: "flex",
              }}>
                <div style={{ width: 4, background: isWalletPay ? "#04BFBF" : st.accent, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "13px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 10px", borderRadius: 20,
                        background: st.bg, color: st.color, fontWeight: 700, fontSize: 11,
                      }}>
                        {st.icon} {st.label}
                      </span>
                      {isWalletPay && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 8px", borderRadius: 20,
                          background: "rgba(4,191,191,0.10)", color: "#04BFBF", fontWeight: 700, fontSize: 10,
                        }}>
                          👛 Wallet
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 21, fontWeight: 800, color: "#011F26", letterSpacing: "-0.5px", flexShrink: 0, marginLeft: 8 }}>
                      ₹{Number(txn.amountPaid||0).toFixed(2)}
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
                      marginTop: 10, background: "rgba(217,48,37,0.07)",
                      color: "#d93025", padding: "8px 12px", borderRadius: 10, fontSize: 11, fontWeight: 600,
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

// ── Sub-components ──

const MetaRow = ({ label, value, mono }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ fontSize: 11, color: "#9ab0b0", fontWeight: 500 }}>{label}</span>
    <span style={{
      fontSize: 11, fontWeight: 700, color: "#011F26",
      fontFamily: mono ? "monospace" : "inherit",
      textAlign: "right", maxWidth: "65%", wordBreak: "break-all",
    }}>
      {value}
    </span>
  </div>
);

const StatCard = ({ icon, label, value, sub, color, bg, border }) => (
  <div style={{
    flex: "1 1 0", minWidth: 130, background: "#fff",
    borderRadius: 16, padding: "13px 14px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    border: `1px solid ${border}`,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, color: "#7a9090", fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ fontSize: 19, fontWeight: 800, color, letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10.5, color: "#9ab0b0", marginTop: 4 }}>{sub}</div>
  </div>
);

export default TransactionHistory;