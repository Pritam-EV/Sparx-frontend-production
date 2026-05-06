import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const statusConfig = {
  SUCCESS: { label: "Success", bg: "#e6f9f0", color: "#1a7f4b", icon: "✓" },
  FAILED:  { label: "Failed",  bg: "#fdecea", color: "#c0392b", icon: "✕" },
  PENDING: { label: "Pending", bg: "#fff8e6", color: "#b8860b", icon: "⏳" },
  REFUND:  { label: "Refund",  bg: "#eaf0fb", color: "#1a5faa", icon: "↩" },
};

const TransactionHistory = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
       const res = await api.get("/api/payment/my-transactions");
        setTransactions(res.data.transactions || []);
      } catch (err) {
        setError("Unable to load transactions. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 style={styles.title}>Transactions</h1>
      </div>

      <div style={styles.scrollArea}>
        {loading && (
          <div style={styles.center}>
            {[1,2,3,4].map(i => (
              <div key={i} style={styles.skeletonCard}>
                <div style={{...styles.skeletonLine, width: "40%", height: 14}} />
                <div style={{...styles.skeletonLine, width: "70%", height: 11, marginTop: 8}} />
                <div style={{...styles.skeletonLine, width: "50%", height: 11, marginTop: 6}} />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div style={styles.emptyState}>
            <span style={{fontSize: 36}}>⚡</span>
            <p style={styles.emptyText}>{error}</p>
          </div>
        )}

        {!loading && !error && transactions.length === 0 && (
          <div style={styles.emptyState}>
            <span style={{fontSize: 44}}>🧾</span>
            <p style={styles.emptyTitle}>No transactions yet</p>
            <p style={styles.emptyText}>Your payment history will appear here after your first charge.</p>
          </div>
        )}

        {!loading && !error && transactions.map((txn) => {
          const st = statusConfig[txn.status] || statusConfig.PENDING;
          return (
            <div key={txn._id} style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.cardLeft}>
                  <span style={{...styles.statusBadge, background: st.bg, color: st.color}}>
                    {st.icon} {st.label}
                  </span>
                  <p style={styles.txnId}>#{txn.orderId}</p>
                </div>
                <div style={styles.amountBox}>
                  <span style={styles.currency}>₹</span>
                  <span style={styles.amount}>{(txn.amountPaid / 100).toFixed(2)}</span>
                </div>
              </div>
              <div style={styles.divider} />
              <div style={styles.cardBottom}>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Date</span>
                  <span style={styles.metaValue}>{formatDate(txn.paidAt || txn.createdAt)}</span>
                </div>
                {txn.paymentMethod && (
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Method</span>
                    <span style={styles.metaValue}>{txn.paymentMethod.toUpperCase()}</span>
                  </div>
                )}
                {txn.deviceId && (
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Device</span>
                    <span style={styles.metaValue}>{txn.deviceId}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fa",
    fontFamily: "'Segoe UI', sans-serif",
    paddingBottom: 80,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "20px 20px 16px",
    background: "#fff",
    boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#333",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1a1a2e",
    margin: 0,
  },
  scrollArea: {
    padding: "16px 16px 0",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    background: "#ffffff",
    borderRadius: 16,
    padding: "16px 18px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.05)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 20,
    width: "fit-content",
  },
  txnId: {
    fontSize: 12,
    color: "#8a8a8a",
    margin: 0,
    fontFamily: "monospace",
  },
  amountBox: {
    display: "flex",
    alignItems: "baseline",
    gap: 2,
  },
  currency: {
    fontSize: 14,
    color: "#1a1a2e",
    fontWeight: 600,
  },
  amount: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1a1a2e",
    letterSpacing: "-0.5px",
  },
  divider: {
    height: 1,
    background: "#f0f0f0",
    margin: "12px 0",
  },
  cardBottom: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  metaItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 12,
    color: "#9a9a9a",
    fontWeight: 500,
  },
  metaValue: {
    fontSize: 12,
    color: "#444",
    fontWeight: 600,
    textAlign: "right",
    maxWidth: "65%",
  },
  center: { display: "flex", flexDirection: "column", gap: 12 },
  skeletonCard: {
    background: "#fff",
    borderRadius: 16,
    padding: "18px 18px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  },
  skeletonLine: {
    background: "linear-gradient(90deg, #ececec 25%, #f5f5f5 50%, #ececec 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s ease-in-out infinite",
    borderRadius: 6,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "60px 24px",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "#1a1a2e",
    margin: 0,
  },
  emptyText: {
    fontSize: 13,
    color: "#888",
    margin: 0,
    maxWidth: 260,
  },
};

export default TransactionHistory;