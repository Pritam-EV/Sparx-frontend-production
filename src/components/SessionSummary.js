// src/components/SessionSummary.js
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CircularProgress } from "@mui/material";

/* ─────────────────────────────────────────────────────────────
   SHARED BUTTON STYLES  (used in state screens too)
───────────────────────────────────────────────────────────── */
const btnPrimary = {
  width: "100%",
  padding: "11px 14px",
  background: "linear-gradient(90deg,#04bfbf,#029a9a)",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Inter',sans-serif",
  boxShadow: "0 4px 14px rgba(4,191,191,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  boxSizing: "border-box",
  transition: "opacity 0.15s",
};
const btnGhost = {
  ...btnPrimary,
  background: "transparent",
  color: "#5a8a90",
  border: "1.5px solid rgba(4,191,191,0.22)",
  boxShadow: "none",
  marginTop: "8px",
};

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
  const fmtUnits = (v) =>  Number(v || 0).toFixed(3);
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
  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    (async () => {
      try {
        const token   = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const sRes = await fetch(`${API}/api/sessions/${sessionId}`, { headers });
        if (!sRes.ok) throw new Error();
        setSession(await sRes.json());

        const fetchReceipt = async () => {
          for (let i = 0; i < 6; i++) {
            const r = await fetch(`${API}/api/receipts/${sessionId}`, { headers });
            if (r.ok) return await r.json();
            await new Promise((res) => setTimeout(res, 1000));
          }
          return null;
        };
        const rec = await fetchReceipt();
        if (rec) {
          setReceipt(rec);
          setRating(rec.rating || 0);
          setSuggestion(rec.suggestion || "");
          setFeedbackSubmitted(!!rec.rating);
        }
      } catch {
        setError("Could not load session summary.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

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

  /* ── State-screen wrapper ── */
  const StateCard = ({ children }) => (
    <div style={{
      minHeight: "100vh",
      background: "#f0fafa",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "'Inter',sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: "18px",
        border: "1px solid rgba(4,191,191,0.15)",
        boxShadow: "0 4px 24px rgba(4,191,191,0.10)",
        padding: "28px 22px", width: "100%", maxWidth: "380px",
      }}>
        {children}
      </div>
    </div>
  );

  /* ── State screens ── */
  if (!sessionId) return (
    <StateCard>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 50, height: 50, borderRadius: "50%",
          background: "rgba(161,53,68,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="#a13544" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p style={{ fontSize:"14px", fontWeight:700, color:"#0e1e1e", margin:"0 0 6px" }}>
          Invalid Session
        </p>
        <p style={{ fontSize:"12px", color:"#7a9aa3", margin:"0 0 16px" }}>
          Session ID was not provided. Please go back and try again.
        </p>
        <button onClick={() => navigate("/home")} style={btnPrimary}>Go Home</button>
      </div>
    </StateCard>
  );

  if (loading) return (
    <StateCard>
      <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
        <CircularProgress size={26} sx={{ color:"#04bfbf", flexShrink:0 }} />
        <div>
          <p style={{ fontSize:"14px", fontWeight:700, color:"#0e1e1e", margin:"0 0 3px" }}>
            Loading summary
          </p>
          <p style={{ fontSize:"11px", color:"#7a9aa3", margin:0 }}>
            Preparing your receipt…
          </p>
        </div>
      </div>
    </StateCard>
  );

  if (error) return (
    <StateCard>
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:"14px", fontWeight:700, color:"#a13544", margin:"0 0 6px" }}>
          Could not load
        </p>
        <p style={{ fontSize:"12px", color:"#7a9aa3", margin:"0 0 16px" }}>{error}</p>
        <button onClick={() => window.location.reload()} style={btnPrimary}>Retry</button>
        <button onClick={() => navigate("/home")} style={btnGhost}>Go Home</button>
      </div>
    </StateCard>
  );

  if (!receipt) return (
    <StateCard>
      <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
        <CircularProgress size={26} sx={{ color:"#04bfbf", flexShrink:0 }} />
        <p style={{ fontSize:"13px", fontWeight:600, color:"#0e1e1e", margin:0 }}>
          Generating receipt…
        </p>
      </div>
    </StateCard>
  );

  const hasRefund   = receipt.refundAmount   > 0;
  const hasDiscount = receipt.discountApplied > 0;

  /* ══════════════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Global styles ───────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* KEY FIX: full-page natural scroll — no overflow traps */
        html {
          min-height: 100%;
          background: linear-gradient(155deg,#daf3f3 0%,#f0fafa 55%,#e6f7f7 100%);
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        body {
          min-height: 100%;
          background: transparent;
          overflow-y: auto !important;   /* always scrollable */
          overflow-x: hidden;
        }

        /* page root — flex column, natural height */
        .ss-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 14px 72px;      /* generous bottom gap */
        }

        /* centred column, never wider than 620px */
        .ss-col {
          width: 100%;
          max-width: 620px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ═══ RECEIPT CARD ═══ */
        .ss-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(4,191,191,0.13);
          box-shadow:
            0 1px 4px  rgba(4,191,191,0.06),
            0 8px 28px rgba(4,191,191,0.09);
          overflow: hidden;
        }

        /* teal top bar */
        .ss-topbar {
          height: 5px;
          background: linear-gradient(90deg,#04d4d4,#04bfbf 40%,#017c7c);
        }

        .ss-body { padding: 16px 18px 14px; }

        /* ── heading ── */
        .ss-heading {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 1.5px dashed rgba(4,191,191,0.20);
          margin-bottom: 0;
        }
        .ss-heading h1 {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #0a1c1c;
          margin-bottom: 3px;
        }
        .ss-badge {
          display: inline-block;
          padding: 2px 10px;
          background: rgba(4,191,191,0.08);
          border: 1px solid rgba(4,191,191,0.22);
          border-radius: 999px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #04bfbf;
        }

        /* ── supplier ── */
        .ss-supplier {
          text-align: center;
          padding: 10px 0 10px;
          border-bottom: 1px solid rgba(4,191,191,0.09);
        }
        .ss-sup-name  { font-size:12px; font-weight:800; color:#0a1c1c; letter-spacing:0.01em; }
        .ss-sup-gstin { font-size:10px; font-weight:700; color:#04bfbf; letter-spacing:0.05em; margin:2px 0; }
        .ss-sup-addr  { font-size:10px; color:#5a8590; }

        /* ── meta two-col ── */
        .ss-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 10px 0 10px;
          border-bottom: 1px solid rgba(4,191,191,0.09);
        }
        /* always keep side-by-side — only shrink font on very narrow */
        @media (max-width: 340px) {
          .ss-meta { grid-template-columns: 1fr 1fr; gap: 6px; }
        }

        .ss-lbl {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: #04bfbf;
          margin-bottom: 5px;
        }
        .ss-bill-name   { font-size:12px; font-weight:700; color:#0a1c1c; margin-bottom:3px; }
        .ss-bill-detail { font-size:10.5px; color:#5a7a80; line-height:1.65; }

        .ss-inv-right { text-align:right; }
        .ss-inv-item  { margin-bottom:3px; }
        .ss-inv-item strong {
          display: block;
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #9ab8bc;
          line-height: 1.3;
        }
        .ss-inv-item span {
          font-size: 10.5px;
          font-weight: 600;
          color: #243b3b;
          word-break: break-all;
        }

        /* ── table ── */
        .ss-tbl-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 10px 0;
          border-radius: 8px;
          border: 1px solid rgba(4,191,191,0.13);
          /* scroll-shadow hint */
          background:
            linear-gradient(to right,  #fff 20%, rgba(255,255,255,0)) center left,
            linear-gradient(to left,   #fff 20%, rgba(255,255,255,0)) center right,
            radial-gradient(farthest-side at 0   50%, rgba(4,191,191,0.10), transparent) center left,
            radial-gradient(farthest-side at 100% 50%, rgba(4,191,191,0.10), transparent) center right;
          background-repeat: no-repeat;
          background-color: #fff;
          background-size: 32px 100%, 32px 100%, 10px 100%, 10px 100%;
          background-attachment: local, local, scroll, scroll;
        }
        .ss-tbl {
          width: 100%;
          border-collapse: collapse;
          min-width: 420px;
          font-size: 11px;
        }
        .ss-tbl thead tr {
          background: linear-gradient(90deg,rgba(4,191,191,0.08),rgba(4,191,191,0.03));
        }
        .ss-tbl th {
          padding: 8px 9px;
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #04bfbf;
          border-bottom: 1px solid rgba(4,191,191,0.13);
          white-space: nowrap;
        }
        .ss-tbl th:first-child  { text-align:left;  padding-left:11px; }
        .ss-tbl th:not(:first-child) { text-align:right; padding-right:10px; }
        .ss-tbl td {
          padding: 9px 9px;
          color: #2a3f40;
          vertical-align: top;
          border-bottom: 1px solid rgba(4,191,191,0.06);
        }
        .ss-tbl td:first-child  { text-align:left;  padding-left:11px; }
        .ss-tbl td:not(:first-child) { text-align:right; padding-right:10px; font-weight:500; }
        .ss-tbl tbody tr:last-child td { border-bottom:none; }
        .ss-td-service { font-weight:700; color:#0a1c1c; font-size:11.5px; }
        .ss-td-sub     { font-size:9.5px; color:#7a9ea3; margin-top:2px; }
        .ss-td-total   { font-weight:800 !important; color:#04bfbf !important; font-size:12px !important; }

        /* ── payment summary ── */
        .ss-pay { margin: 6px 0 10px; }
        .ss-pay-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4.5px 0;
          font-size: 11.5px;
          color: #5a7a80;
          border-bottom: 1px solid rgba(4,191,191,0.07);
        }
        .ss-pay-row:last-child { border-bottom:none; }
        .ss-pay-row span:first-child { font-weight:500; }
        .ss-pay-row span:last-child  { font-weight:600; }

        .ss-pay-hi {
          padding: 7px 0 6px !important;
          margin: 2px 0;
          border-top: 1.5px solid rgba(4,191,191,0.18) !important;
          border-bottom: 1.5px solid rgba(4,191,191,0.18) !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          color: #0a1c1c !important;
        }
        .ss-pay-hi span:last-child { color:#04bfbf; font-size:13.5px; }

        .ss-pay-refund span { color:#437a22 !important; font-weight:700 !important; }

        /* ── GST note ── */
        .ss-note {
          background: rgba(4,191,191,0.04);
          border: 1px solid rgba(4,191,191,0.12);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 10px;
          color: #4a7a80;
          line-height: 1.55;
        }
        .ss-note b { color:#04bfbf; font-weight:700; }

        /* ═══ RATING CARD ═══ */
        .ss-rate-card {
          background: #fff;
          border-radius: 14px;
          border: 1px solid rgba(4,191,191,0.12);
          box-shadow: 0 3px 14px rgba(4,191,191,0.07);
          padding: 16px 16px 14px;
        }
        .ss-rate-title {
          font-size:12.5px; font-weight:700; color:#0a1c1c;
          text-align:center; margin-bottom:11px;
        }
        .ss-stars {
          display:flex; justify-content:center; gap:6px; margin-bottom:4px;
        }
        .ss-star {
          background:none; border:none; cursor:pointer;
          padding:2px; line-height:1;
          transition: transform 0.12s;
        }
        .ss-star:not(:disabled):hover { transform:scale(1.18); }
        .ss-star:disabled { cursor:default; }
        .ss-star-label {
          text-align:center; font-size:11px; font-weight:700;
          color:#ff9100; min-height:16px; margin-bottom:10px;
        }
        .ss-textarea {
          width:100%; padding:9px 12px; font-size:12px;
          font-family:'Inter',sans-serif;
          border-radius:10px; border:1.5px solid rgba(4,191,191,0.18);
          background:rgba(4,191,191,0.03); color:#0a1c1c;
          outline:none; resize:none; transition:border-color 0.16s;
          line-height:1.5; margin-bottom:10px; display:block;
        }
        .ss-textarea:focus { border-color:#04bfbf; }
        .ss-textarea::placeholder { color:#9ab8bc; }
        .ss-fb-done {
          display:flex; align-items:center; justify-content:center; gap:7px;
          padding:9px 14px; background:rgba(4,191,191,0.07);
          border-radius:10px; border:1px solid rgba(4,191,191,0.16);
          font-size:12px; font-weight:700; color:#04bfbf;
        }

        /* ═══ ACTION BUTTONS ═══ */
        .ss-actions { display:flex; flex-direction:column; gap:9px; }
        .ss-btn-home {
          width:100%; padding:13px 14px;
          background:linear-gradient(90deg,#04d0d0,#04bfbf 50%,#029898);
          color:#fff; border:none; border-radius:13px;
          font-size:13.5px; font-weight:700; cursor:pointer;
          font-family:'Inter',sans-serif;
          box-shadow: 0 5px 16px rgba(4,191,191,0.28), 0 1px 4px rgba(4,191,191,0.16);
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition: transform 0.13s, box-shadow 0.16s;
        }
        .ss-btn-home:hover {
          transform:translateY(-2px);
          box-shadow:0 8px 22px rgba(4,191,191,0.36);
        }
        .ss-btn-home:active { transform:translateY(0); }

        .ss-btn-wa {
          width:100%; padding:12px 14px;
          background:rgba(37,211,102,0.07);
          color:#1a7a3a; border:1.5px solid rgba(37,211,102,0.26);
          border-radius:13px; font-size:13px; font-weight:700;
          cursor:pointer; font-family:'Inter',sans-serif;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition: background 0.16s, transform 0.13s;
        }
        .ss-btn-wa:hover {
          background:rgba(37,211,102,0.14);
          transform:translateY(-1px);
        }

        .ss-btn-submit {
          width:100%; padding:11px 14px;
          background:linear-gradient(90deg,#04d0d0,#029898);
          color:#fff; border:none; border-radius:11px;
          font-size:13px; font-weight:700; cursor:pointer;
          font-family:'Inter',sans-serif;
          box-shadow:0 4px 12px rgba(4,191,191,0.24);
          transition: transform 0.13s, opacity 0.15s;
        }
        .ss-btn-submit:not(:disabled):hover { transform:translateY(-1px); }
        .ss-btn-submit:disabled { opacity:0.38; cursor:not-allowed; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          PAGE  —  naturally scrollable, no height traps
      ══════════════════════════════════════════════════════════ */}
      <div className="ss-root">
        <div className="ss-col">

          {/* ╔════════════════════════════════════════════════════╗
              ║                 TAX RECEIPT CARD                  ║
              ╚════════════════════════════════════════════════════╝ */}
          <div className="ss-card">
            <div className="ss-topbar" />

            <div className="ss-body">

              {/* 1 ── TAX INVOICE centred ── */}
              <div className="ss-heading">
                <h1>Tax Invoice</h1>
                <span className="ss-badge">Original for Recipient</span>
              </div>

              {/* 2 ── Supplier centred ── */}
              <div className="ss-supplier">
                <div className="ss-sup-name">{SUPPLIER.name}</div>
                <div className="ss-sup-gstin">GSTIN: {SUPPLIER.gstin}</div>
                <div className="ss-sup-addr">{SUPPLIER.addr}</div>
              </div>

              {/* 3 ── Bill To (left) | Invoice Details (right) ── */}
              <div className="ss-meta">

                {/* LEFT – Bill To */}
                <div>
                  <div className="ss-lbl">Bill To</div>
                  <div className="ss-bill-name">
                    {receipt.userName || "Customer"}
                  </div>
                  <div className="ss-bill-detail">
                    {receipt.userMobile && (
                      <span>{receipt.userMobile}<br /></span>
                    )}
                    {receipt.userEmail && (
                      <span>{receipt.userEmail}</span>
                    )}
                  </div>
                </div>

                {/* RIGHT – Invoice meta */}
                <div className="ss-inv-right">
                  <div className="ss-lbl" style={{ textAlign:"right" }}>
                    Invoice Details
                  </div>

                  <div className="ss-inv-item">
                    <strong>Invoice No</strong>
                    <span>{receipt.receiptId}</span>
                  </div>
                  <div className="ss-inv-item">
                    <strong>Invoice Date</strong>
                    <span>{fmtDate(receipt.createdAt)}</span>
                  </div>
                  <div className="ss-inv-item">
                    <strong>Session ID</strong>
                    <span>{receipt.sessionId || session?.sessionId || "—"}</span>
                  </div>
                  <div className="ss-inv-item">
                    <strong>Place of Supply</strong>
                    <span>Maharashtra (27)</span>
                  </div>
                </div>
              </div>

              {/* 4 ── Line-item table ── */}
              <div className="ss-tbl-wrap">
                <table className="ss-tbl">
                  <thead>
                    <tr>
                      <th style={{ minWidth:130 }}>Description</th>
                      <th>Energy (kWh)</th>
                      <th>Rate (₹/kWh)</th>
                      <th>Taxable (₹)</th>
                      <th>GST 18% (₹)</th>
                      <th>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="ss-td-service">EV Charging Services</div>
                        <div className="ss-td-sub">SAC: 998714</div>
                        <div className="ss-td-sub">
                          Device: {receipt.deviceId || session?.deviceId || "—"}
                        </div>
                      </td>
                      <td>{fmtUnits(receipt.energyConsumed)}</td>
                      <td>{fmtMoney(receipt.userRatePerKwh)}</td>
                      <td>{fmtMoney(receipt.taxableAmount)}</td>
                      <td>{fmtMoney(receipt.gstAmount)}</td>
                      <td className="ss-td-total">{fmtMoney(receipt.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 5 ── Payment summary ── */}
              <div className="ss-pay">

                {/* Discount (only if applied) */}
                {hasDiscount && (
                  <div className="ss-pay-row">
                    <span>Discount Applied</span>
                    <span style={{ color:"#437a22" }}>
                      − {fmtMoney(receipt.discountApplied)}
                    </span>
                  </div>
                )}

                {/* Amount Paid — highlighted */}
                <div className="ss-pay-row ss-pay-hi">
                  <span>Amount Paid</span>
                  <span>{fmtMoney(receipt.amountPaid)}</span>
                </div>

                {/* Total Billed */}
                <div className="ss-pay-row">
                  <span>Total Billed Amount</span>
                  <span>{fmtMoney(receipt.totalAmount)}</span>
                </div>

                {/* Refund (conditional) */}
                {hasRefund && (
                  <div className="ss-pay-row ss-pay-refund">
                    <span>Refund (Unutilised)</span>
                    <span>{fmtMoney(receipt.refundAmount)}</span>
                  </div>
                )}
              </div>

              {/* 6 ── GST note ── */}
              <div className="ss-note">
                <b>System-generated GST Invoice.</b>{" "}
                Thank you for charging with <b>VIZ Smart Charging</b>.
              </div>

            </div>{/* /ss-body */}
          </div>{/* /ss-card */}

          {/* ╔════════════════════════════════════════════════════╗
              ║                  RATING SECTION                   ║
              ╚════════════════════════════════════════════════════╝ */}
          <div className="ss-rate-card">
            <p className="ss-rate-title">How was your charging experience?</p>

            <div className="ss-stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  className="ss-star"
                  disabled={feedbackSubmitted}
                  onClick={() => setRating(i)}
                  aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
                >
                  <svg
                    width="30" height="30" viewBox="0 0 24 24" fill="none"
                    stroke={i <= rating ? "#ff9100" : "#c0d8db"}
                    strokeWidth="1.4"
                    style={{
                      fill: i <= rating ? "#ff9100" : "none",
                      transition: "all 0.14s",
                      filter: i <= rating
                        ? "drop-shadow(0 1px 4px rgba(255,145,0,0.32))"
                        : "none",
                    }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>

            <p className="ss-star-label">
              {rating > 0 ? ratingLabels[rating] : ""}
            </p>

            {!feedbackSubmitted ? (
              <>
                <textarea
                  className="ss-textarea"
                  rows={2}
                  placeholder="Suggestions to improve our service? (optional)"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                />
                <button
                  className="ss-btn-submit"
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0}
                >
                  Submit Feedback
                </button>
              </>
            ) : (
              <div className="ss-fb-done">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#04bfbf" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Thanks for your feedback!
              </div>
            )}
          </div>

          {/* ╔════════════════════════════════════════════════════╗
              ║               HOME + REFUND BUTTONS               ║
              ╚════════════════════════════════════════════════════╝ */}
          <div className="ss-actions">

            <button className="ss-btn-home" onClick={() => navigate("/home")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Back to Home
            </button>

            {hasRefund && (
              <button className="ss-btn-wa" onClick={handleRefund}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Request Refund via WhatsApp
              </button>
            )}
          </div>

        </div>{/* /ss-col */}
      </div>{/* /ss-root */}
    </>
  );
};

export default SessionSummary;