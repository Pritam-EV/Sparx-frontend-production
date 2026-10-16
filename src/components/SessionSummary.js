import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import AppHeader from "../components/AppHeader";
import FooterNav from "../components/FooterNav";

/* ─────────────────────────────────────────────────────────────
   SHARED STATE SCREENS (Loading, Errors, Empty)
───────────────────────────────────────────────────────────── */
const StateCard = ({ children }) => (
  <div style={{
    minHeight: "100dvh",
    background: "#f3fbfc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif",
  }}>
    <div style={{
      background: "#ffffff",
      borderRadius: "24px",
      border: "1px solid #d4f0ec",
      boxShadow: "0 12px 34px rgba(0, 160, 145, 0.08)",
      padding: "32px 24px",
      width: "100%",
      maxWidth: "380px",
      textAlign: "center",
    }}>
      {children}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const SessionSummary = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const sessionId = state?.sessionId;

  const [session,           setSession]           = useState(null);
  const [receipt,           setReceipt]           = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState(null);
  const [rating,            setRating]            = useState(0);
  const [suggestion,        setSuggestion]        = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const API = process.env.REACT_APP_Backend_API_Base_URL;

  /* ── Formatters ── */
  const fmtMoney = (v) => `₹${Number(v || 0).toFixed(2)}`;
  const fmtUnits = (v) => Number(v || 0).toFixed(3);
  const fmtDate  = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  /* ── Supplier constants ── */
  const SUPPLIER = {
    name:  "Vjra Technologies LLP",
    gstin: "27ABBFV7565K1ZJ",
    addr:  "Sahakar Nagar, Pune – 411009, Maharashtra",
  };

  /* ── Fetch session + receipt ── */
/* ── Fetch minimal session summary + receipt ── */
useEffect(() => {
  if (!sessionId) {
    setLoading(false);
    return;
  }

  let cancelled = false;

  const loadSummary = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in to view this receipt.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      let summary = null;

      // Retry while receipt generation is still pending.
      // One request retrieves both the session summary and receipt.
      for (let attempt = 0; attempt < 6; attempt++) {
        const response = await fetch(
          `${API}/api/sessions/summary/${encodeURIComponent(sessionId)}`,
          { headers }
        );

        const data = await response.json().catch(() => ({}));

        if (response.status === 202 && data.receiptStatus === "pending") {
          if (attempt < 5) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          continue;
        }

        if (!response.ok) {
          throw new Error(
            data.error || data.message || "Could not load session summary."
          );
        }

        if (data.receipt) {
          summary = data;
          break;
        }

        if (attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!summary?.receipt) {
        throw new Error(
          "The receipt is still being generated. Please retry."
        );
      }

      if (cancelled) return;

      setSession(summary.session || null);
      setReceipt(summary.receipt);

      setRating(summary.receipt.rating || 0);
      setSuggestion(summary.receipt.suggestion || "");
      setFeedbackSubmitted(!!summary.receipt.rating);
    } catch (err) {
      if (!cancelled) {
        setError(
          err.message || "Could not load session summary."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  loadSummary();

  return () => {
    cancelled = true;
  };
}, [sessionId, API]);

  /* ── Refund via WhatsApp ── */
  const handleRefund = () => {
    if (!receipt) return;
    const endDate = session?.endTime ? new Date(session.endTime) : new Date();
    const msg = encodeURIComponent(
      `ReceiptID: ${receipt.receiptId}\n` +
      `DeviceID: ${receipt.deviceId}\n` +
      `Date: ${endDate.toLocaleDateString()}\n` +
      `Time: ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}\n` +
      `Amount Paid: ${fmtMoney(receipt.amountPaid)}\n` +
      `Amount Utilized: ${fmtMoney(receipt.amountUtilized)}\n` +
      `Discount: ${fmtMoney(receipt.discountApplied)}\n` +
      `Refund: ${fmtMoney(receipt.refundAmount)}`
    );
    window.open(`https://wa.me/918855094432?text=${msg}`, "_blank");
  };

  /* ── Submit feedback ── */
  const handleSubmitFeedback = async () => {
    if (feedbackSubmitted) return;
    try {
      const token   = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      await fetch(`${API}/api/receipts/${sessionId}/rate`, {
        method: "POST", headers, body: JSON.stringify({ rating }),
      });
      if (suggestion?.trim()) {
        await fetch(`${API}/api/receipts/${sessionId}/suggest`, {
          method: "POST", headers, body: JSON.stringify({ suggestion }),
        });
      }
      setFeedbackSubmitted(true);
    } catch {
      alert("Failed to submit feedback. Please try again.");
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  /* ── Conditional State Screens ── */
  if (!sessionId) return (
    <StateCard>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "#fdeeee", color: "#d93b3b",
        display: "grid", placeItems: "center", margin: "0 auto 14px",
        fontSize: "22px",
      }}>✕</div>
      <p style={{ fontSize: "16px", fontWeight: 750, color: "#0e2e33", margin: "0 0 6px" }}>
        Invalid Session
      </p>
      <p style={{ fontSize: "12.5px", color: "#53757a", margin: "0 0 20px", lineHeight: 1.5 }}>
        Session reference was not found. Please select an item from your session history.
      </p>
      <button
        onClick={() => navigate("/sessions")}
        className="ss-btn-primary"
      >
        View Sessions
      </button>
    </StateCard>
  );

  if (loading) return (
    <StateCard>
      <CircularProgress size={30} sx={{ color: "#00d2b4", mb: 2 }} />
      <p style={{ fontSize: "15px", fontWeight: 750, color: "#0e2e33", margin: "0 0 4px" }}>
        Loading Summary
      </p>
      <p style={{ fontSize: "12px", color: "#53757a", margin: 0 }}>
        Generating verified tax invoice…
      </p>
    </StateCard>
  );

  if (error) return (
    <StateCard>
      <p style={{ fontSize: "16px", fontWeight: 750, color: "#d93b3b", margin: "0 0 6px" }}>
        Failed to Load
      </p>
      <p style={{ fontSize: "12.5px", color: "#53757a", margin: "0 0 20px" }}>{error}</p>
      <button onClick={() => window.location.reload()} className="ss-btn-primary" style={{ marginBottom: 8 }}>
        Retry
      </button>
      <button onClick={() => navigate("/home")} className="ss-btn-ghost">
        Go Home
      </button>
    </StateCard>
  );

  if (!receipt) return (
    <StateCard>
      <CircularProgress size={30} sx={{ color: "#00d2b4", mb: 2 }} />
      <p style={{ fontSize: "14px", fontWeight: 750, color: "#0e2e33", margin: 0 }}>
        Generating Receipt…
      </p>
    </StateCard>
  );

  const hasRefund   = receipt.refundAmount > 0;
  const hasDiscount = receipt.discountApplied > 0;

  return (
    <>
      {/* ── TOP APPLICATION HEADER ── */}
      <AppHeader />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .ss-viewport {
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

        .ss-column {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px 16px calc(110px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* ── INVOICE SHEET ── */
        .ss-invoice-sheet {
          background: #ffffff;
          border-radius: 26px;
          border: 1px solid #d4f0ec;
          box-shadow: 0 10px 30px rgba(0, 160, 145, 0.07);
          overflow: hidden;
          position: relative;
        }

        .ss-brand-ribbon {
          height: 6px;
          background: linear-gradient(90deg, #00d2b4 0%, #00cbf2 50%, #ff8236 100%);
        }

        .ss-sheet-inner {
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Invoice Header */
        .ss-invoice-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1.5px dashed #d8f2ee;
          padding-bottom: 14px;
        }

        .ss-invoice-title {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #0e2e33;
          letter-spacing: -0.3px;
        }

        .ss-invoice-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: #dbfaf0;
          border: 1px solid #b8f2dd;
          color: #008764;
          font-size: 10.5px;
          font-weight: 750;
          border-radius: 999px;
        }

        /* Issuer & Supplier Meta */
        .ss-supplier-block {
          background: #f7fdfc;
          border: 1px solid #e1f5f2;
          border-radius: 16px;
          padding: 12px 14px;
        }

        .ss-sup-company {
          font-size: 13.5px;
          font-weight: 750;
          color: #0e2e33;
        }

        .ss-sup-reg {
          font-size: 11px;
          color: #00776b;
          font-weight: 600;
          margin-top: 2px;
          font-family: monospace;
          letter-spacing: 0.04em;
        }

        .ss-sup-location {
          font-size: 11px;
          color: #53757a;
          margin-top: 3px;
          line-height: 1.4;
        }

        /* 2-Column Details (Customer & Tax Metadata) */
        .ss-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding-bottom: 4px;
        }

        .ss-detail-box {
          background: #fafdfc;
          border: 1px solid #ebf7f5;
          border-radius: 14px;
          padding: 10px 12px;
        }

        .ss-detail-caption {
          font-size: 9.5px;
          font-weight: 800;
          color: #008f7f;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 4px;
        }

        .ss-detail-main {
          font-size: 13px;
          font-weight: 750;
          color: #0e2e33;
          line-height: 1.3;
          word-break: break-word;
        }

        .ss-detail-sub {
          font-size: 11px;
          color: #53757a;
          margin-top: 3px;
          line-height: 1.4;
          word-break: break-all;
        }

        /* Mobile-Optimized Service Breakdown Tile */
        .ss-service-tile {
          background: linear-gradient(135deg, #f1fcf9 0%, #ffffff 100%);
          border: 1.5px solid #d4f0ec;
          border-radius: 18px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ss-service-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5f6f3;
          padding-bottom: 8px;
        }

        .ss-service-name {
          font-size: 13.5px;
          font-weight: 750;
          color: #0e2e33;
        }

        .ss-sac-tag {
          font-size: 10px;
          font-weight: 700;
          background: #e4faf6;
          color: #00776b;
          padding: 2px 7px;
          border-radius: 6px;
          border: 1px solid #cbf0e8;
        }

        .ss-params-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          text-align: center;
        }

        .ss-param-unit {
          background: #ffffff;
          border: 1px solid #e1f3f0;
          border-radius: 12px;
          padding: 8px 4px;
        }

        .ss-param-label {
          font-size: 10px;
          color: #53757a;
          font-weight: 600;
        }

        .ss-param-val {
          font-family: 'Outfit', sans-serif;
          font-size: 13.5px;
          font-weight: 750;
          color: #0e2e33;
          margin-top: 2px;
        }

        /* Financial Ledger Breakdown */
        .ss-ledger-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 6px;
          border-top: 1.5px dashed #d8f2ee;
        }

        .ss-ledger-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12.5px;
          color: #53757a;
        }

        .ss-ledger-row strong {
          color: #0e2e33;
          font-weight: 700;
        }

        .ss-ledger-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          margin-top: 4px;
          background: linear-gradient(135deg, #e5faf5 0%, #f4fdfc 100%);
          border: 1px solid #cbf0e9;
          border-radius: 14px;
        }

        .ss-total-label {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: #00776b;
        }

        .ss-total-amount {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #008f7f;
          letter-spacing: -0.3px;
        }

        .ss-refund-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #fff8f3;
          border: 1px solid #ffe1cf;
          border-radius: 12px;
          color: #d85400;
          font-size: 12px;
          font-weight: 750;
        }

        /* Legal / Compliance Footnote */
        .ss-legal-footer {
          font-size: 11px;
          color: #6a8c91;
          text-align: center;
          line-height: 1.45;
          padding: 2px 8px;
        }

        /* ── RATING & EXPERIENCE CARD ── */
        .ss-feedback-card {
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 22px;
          box-shadow: 0 4px 18px rgba(0, 160, 145, 0.05);
          padding: 20px 16px 18px;
          text-align: center;
        }

        .ss-fb-title {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 750;
          color: #0e2e33;
          margin-bottom: 12px;
        }

        .ss-star-container {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .ss-star-btn {
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: transform 0.14s ease;
        }
        .ss-star-btn:not(:disabled):hover {
          transform: scale(1.18);
        }
        .ss-star-btn:active {
          transform: scale(0.95);
        }

        .ss-star-tagline {
          font-size: 12px;
          font-weight: 750;
          color: #ff8236;
          min-height: 18px;
          margin-bottom: 12px;
        }

        .ss-fb-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 12.5px;
          font-family: inherit;
          color: #0e2e33;
          background: #f4fbfb;
          border: 1.5px solid #d8f2ee;
          border-radius: 14px;
          outline: none;
          resize: none;
          box-sizing: border-box;
          transition: border-color 0.16s ease;
          margin-bottom: 12px;
        }
        .ss-fb-input:focus {
          border-color: #00d2b4;
          background: #ffffff;
        }
        .ss-fb-input::placeholder {
          color: #799ea4;
        }

        .ss-fb-success {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #dbfaf0;
          border: 1px solid #b8f2dd;
          color: #008764;
          font-size: 12px;
          font-weight: 750;
          border-radius: 999px;
        }

        /* ── BUTTON ACTIONS ── */
        .ss-action-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ss-btn-primary {
          width: 100%;
          min-height: 48px;
          background: linear-gradient(135deg, #00d2b4 0%, #00a896 100%);
          color: #ffffff;
          border: none;
          border-radius: 14px;
          font-size: 13.5px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 190, 165, 0.32);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.16s ease;
        }
        .ss-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0, 190, 165, 0.42);
        }
        .ss-btn-primary:active {
          transform: scale(0.985);
        }

        .ss-btn-secondary {
          width: 100%;
          min-height: 44px;
          background: #ffffff;
          color: #00776b;
          border: 1.5px solid #c9ede7;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.16s ease;
        }
        .ss-btn-secondary:hover {
          background: #edfbf8;
        }

        .ss-btn-ghost {
          width: 100%;
          min-height: 42px;
          background: transparent;
          color: #53757a;
          border: 1px solid #dceeed;
          border-radius: 12px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .ss-btn-whatsapp {
          width: 100%;
          min-height: 46px;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          color: #ffffff;
          border: none;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(255, 82, 26, 0.32);
          transition: all 0.16s ease;
        }
        .ss-btn-whatsapp:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(255, 82, 26, 0.42);
        }
      `}</style>

      <div className="ss-viewport">
        <div className="ss-column">

          {/* ╔════════════════════════════════════════════════════╗
              ║                 TAX INVOICE CARD                  ║
              ╚════════════════════════════════════════════════════╝ */}
          <div className="ss-invoice-sheet">
            <div className="ss-brand-ribbon" />

            <div className="ss-sheet-inner">
              {/* 1. Header */}
              <div className="ss-invoice-heading">
                <div>
                  <h1 className="ss-invoice-title">Tax Invoice</h1>
                  <span style={{ fontSize: "11px", color: "#53757a" }}>
                    Official Charging Receipt
                  </span>
                </div>
                <span className="ss-invoice-badge">Original for Recipient</span>
              </div>

              {/* 2. Issuer Info */}
              <div className="ss-supplier-block">
                <div className="ss-sup-company">{SUPPLIER.name}</div>
                <div className="ss-sup-reg">GSTIN: {SUPPLIER.gstin}</div>
                <div className="ss-sup-location">{SUPPLIER.addr}</div>
              </div>

              {/* 3. Customer & Invoice Metadata */}
              <div className="ss-details-grid">
                <div className="ss-detail-box">
                  <div className="ss-detail-caption">Billed To</div>
                  <div className="ss-detail-main">{receipt.userName || "Customer"}</div>
                  {receipt.userMobile && (
                    <div className="ss-detail-sub">{receipt.userMobile}</div>
                  )}
                  {receipt.userGstin ? (
                    <div className="ss-detail-sub" style={{ fontFamily: "monospace", color: "#00776b" }}>
                      GSTIN: {receipt.userGstin}
                    </div>
                  ) : (
                    <div className="ss-detail-sub">Unregistered</div>
                  )}
                </div>

                <div className="ss-detail-box">
                  <div className="ss-detail-caption">Invoice Info</div>
                  <div className="ss-detail-main">#{receipt.receiptId}</div>
                  <div className="ss-detail-sub">Date: {fmtDate(receipt.createdAt)}</div>
                  <div className="ss-detail-sub">State: Maharashtra (27)</div>
                </div>
              </div>

              {/* 4. Single-View Service Tile (Mobile-Friendly, No Horizontal Scroll) */}
              <div className="ss-service-tile">
                <div className="ss-service-head">
                  <div>
                    <div className="ss-service-name">EV Charging Services</div>
                    <div style={{ fontSize: "11px", color: "#53757a", marginTop: 2 }}>
                      Charger: {receipt.deviceId || session?.deviceId || "—"}
                    </div>
                  </div>
                  <span className="ss-sac-tag">SAC 998714</span>
                </div>

                <div className="ss-params-grid">
                  <div className="ss-param-unit">
                    <span className="ss-param-label">Delivered</span>
                    <div className="ss-param-val">{fmtUnits(receipt.energyConsumed)} <small style={{ fontSize: 10 }}>kWh</small></div>
                  </div>
                  <div className="ss-param-unit">
                    <span className="ss-param-label">Rate</span>
                    <div className="ss-param-val">{fmtMoney(receipt.userRatePerKwh)}</div>
                  </div>
                  <div className="ss-param-unit">
                    <span className="ss-param-label">GST (18%)</span>
                    <div className="ss-param-val">{fmtMoney(receipt.gstAmount)}</div>
                  </div>
                </div>
              </div>

              {/* 5. Ledger Breakdown */}
              <div className="ss-ledger-wrap">
                <div className="ss-ledger-row">
                  <span>Taxable Value</span>
                  <span>{fmtMoney(receipt.taxableAmount)}</span>
                </div>

                <div className="ss-ledger-row">
                  <span>Applicable GST (18%)</span>
                  <span>{fmtMoney(receipt.gstAmount)}</span>
                </div>

                {hasDiscount && (
                  <div className="ss-ledger-row" style={{ color: "#008764" }}>
                    <span>Discount Applied</span>
                    <span>− {fmtMoney(receipt.discountApplied)}</span>
                  </div>
                )}

                <div className="ss-ledger-row">
                  <span>Amount Prepaid</span>
                  <strong>{fmtMoney(receipt.amountPaid)}</strong>
                </div>

                {/* Prominent Total Billed Pill */}
                <div className="ss-ledger-total">
                  <span className="ss-total-label">Total Amount Billed</span>
                  <span className="ss-total-amount">{fmtMoney(receipt.totalAmount)}</span>
                </div>

                {/* Refund Highlight if present */}
                {hasRefund && (
                  <div className="ss-refund-pill">
                    <span>Unutilized Refund</span>
                    <span>{fmtMoney(receipt.refundAmount)}</span>
                  </div>
                )}
              </div>

              {/* 6. Legal Compliance Note */}
              <p className="ss-legal-footer">
                Computer-generated GST invoice. Thank you for choosing <strong>VIZ Smart Charging</strong>.
              </p>
            </div>
          </div>

          {/* ╔════════════════════════════════════════════════════╗
              ║               RATING & EXPERIENCE CARD           ║
              ╚════════════════════════════════════════════════════╝ */}
          <div className="ss-feedback-card">
            <h3 className="ss-fb-title">Rate your charging experience</h3>

            <div className="ss-star-container">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  className="ss-star-btn"
                  disabled={feedbackSubmitted}
                  onClick={() => setRating(i)}
                  aria-label={`Rate ${i} stars`}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill={i <= rating ? "#ff8236" : "none"}
                    stroke={i <= rating ? "#ff8236" : "#c4e6e2"}
                    strokeWidth="1.6"
                    style={{
                      transition: "all 0.14s ease",
                      filter: i <= rating ? "drop-shadow(0 2px 6px rgba(255, 130, 54, 0.35))" : "none",
                    }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>

            <div className="ss-star-tagline">
              {rating > 0 ? ratingLabels[rating] : ""}
            </div>

            {!feedbackSubmitted ? (
              <>
                <textarea
                  className="ss-fb-input"
                  rows={2}
                  placeholder="Any feedback or suggestions? (optional)"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                />
                <button
                  type="button"
                  className="ss-btn-secondary"
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0}
                  style={{ opacity: rating === 0 ? 0.45 : 1, cursor: rating === 0 ? "not-allowed" : "pointer" }}
                >
                  Submit Feedback
                </button>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span className="ss-fb-success">
                  ✓ Thank you for your feedback!
                </span>
              </div>
            )}
          </div>

          {/* ╔════════════════════════════════════════════════════╗
              ║                  ACTION BUTTONS                  ║
              ╚════════════════════════════════════════════════════╝ */}
          <div className="ss-action-group">
            <button
              type="button"
              className="ss-btn-primary"
              onClick={() => navigate("/landing-home")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Back to Dashboard</span>
            </button>

            {hasRefund && (
              <button
                type="button"
                className="ss-btn-whatsapp"
                onClick={handleRefund}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Request Refund via WhatsApp</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ── FOOTER NAVIGATION BAR ── */}
      <FooterNav />
    </>
  );
};

export default SessionSummary;