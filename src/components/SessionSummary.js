// src/pages/SessionSummary.js
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CircularProgress } from "@mui/material";

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

  const fmtMoney = (v) => `₹${Number(v || 0).toFixed(2)}`;
  const fmtDateTime = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };
  const supplier = {
  name: "Vjra Technologies LLP",
  gstin: "27ABBFV7565K1ZJ",
  addressLine1: "Sahakar nagar",
  addressLine2: "Pune - 411009",
};

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        setSession(await res.json());

        const fetchReceiptWithRetry = async () => {
          for (let i = 0; i < 6; i++) {
            const r = await fetch(`${API}/api/receipts/${sessionId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (r.ok) return await r.json();
            await new Promise((res) => setTimeout(res, 1000));
          }
          return null;
        };

        const rec = await fetchReceiptWithRetry();
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

  const handleSubmitFeedback = async () => {
    if (feedbackSubmitted) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/api/receipts/${sessionId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating }),
      });
      if (suggestion?.trim()) {
        await fetch(`${API}/api/receipts/${sessionId}/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ suggestion }),
        });
      }
      setFeedbackSubmitted(true);
    } catch {
      alert("Failed to submit feedback. Please try again.");
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  /* ── Compact row — tighter padding ── */
  const Row = ({ label, value, valueColor, bold }) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: "5px",
      borderBottom: "1px solid rgba(4,191,191,0.10)",
    }}>
      <span style={{
        fontSize: "11.5px", fontWeight: 600,
        color: "#5a8a90", fontFamily: "Poppins, sans-serif",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "12.5px",
        fontWeight: bold ? 700 : 600,
        color: valueColor || "#0e1e1e",
        fontFamily: "Poppins, sans-serif",
        textAlign: "right",
        maxWidth: "62%",
        wordBreak: "break-word",
      }}>
        {value}
      </span>
    </div>
  );

  /* ── State card wrapper ── */
  const StateCard = ({ children }) => (
    <div style={{
      minHeight: "100vh",
      background: "#f0fafa",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "Poppins, sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "20px",
        border: "1px solid rgba(4,191,191,0.15)",
        boxShadow: "0 4px 24px rgba(4,191,191,0.10)",
        padding: "28px 24px",
        width: "100%",
        maxWidth: "400px",
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
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(161,53,68,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a13544" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "#0e1e1e", margin: "0 0 6px" }}>Invalid Session</p>
        <p style={{ fontSize: "12px", color: "#7a9aa3", margin: "0 0 18px" }}>
          Session ID was not provided. Please go back and try again.
        </p>
        <button onClick={() => navigate("/home")} style={btnPrimary}>Go Home</button>
      </div>
    </StateCard>
  );

  if (loading) return (
    <StateCard>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <CircularProgress size={26} sx={{ color: "#04bfbf", flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#0e1e1e", margin: "0 0 3px" }}>
            Loading summary
          </p>
          <p style={{ fontSize: "11px", color: "#7a9aa3", margin: 0 }}>
            Preparing your receipt…
          </p>
        </div>
      </div>
    </StateCard>
  );

  if (error) return (
    <StateCard>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "#a13544", margin: "0 0 6px" }}>
          Could not load
        </p>
        <p style={{ fontSize: "12px", color: "#7a9aa3", margin: "0 0 18px" }}>{error}</p>
        <button onClick={() => window.location.reload()} style={btnPrimary}>Retry</button>
        <button onClick={() => navigate("/home")} style={{ ...btnGhost, marginTop: "8px" }}>Go Home</button>
      </div>
    </StateCard>
  );

  if (!receipt) return (
    <StateCard>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <CircularProgress size={26} sx={{ color: "#04bfbf", flexShrink: 0 }} />
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#0e1e1e", margin: 0 }}>
          Generating receipt…
        </p>
      </div>
    </StateCard>
  );

/* ══════════════════════════════════
   Main Receipt
══════════════════════════════════ */
return (
  <>
    <style>{`
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
        background: #f0fafa;
        font-family: "Poppins", sans-serif;
      }
      * { box-sizing: border-box; }

      .summary-root {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }

.summary-card {
  width: 100%;
  max-width: 820px;
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(4,191,191,0.15);
  box-shadow: 0 4px 24px rgba(4,191,191,0.10);
  display: flex;
  flex-direction: column;
  /* allow card to grow; no hard cap */
}

.summary-scroll {
  padding: 16px 18px 14px;
  overflow-y: auto;
  max-height: calc(100vh - 220px); /* header + footer approx */
}

      .summary-scroll::-webkit-scrollbar { width: 6px; }
      .summary-scroll::-webkit-scrollbar-thumb {
        background: rgba(4,191,191,0.25); border-radius: 999px;
      }
      .summary-scroll::-webkit-scrollbar-track { background: transparent; }

      .summary-footer {
        padding: 10px 18px 16px;
        border-top: 1px solid rgba(4,191,191,0.10);
        background: #f7fcfc;
      }

      .star-btn { background: none; border: none; cursor: pointer; padding: 2px; line-height: 1; }
      .star-btn:disabled { cursor: default; }
      .refund-wa:hover { background: rgba(37,211,102,0.14) !important; }
      .home-btn:hover { background: linear-gradient(90deg, #029a9a, #027070) !important; }

      @media (max-width: 600px) {
        .summary-card {
          max-height: none;
          height: auto;
        }
        .summary-scroll {
          max-height: none;
        }
      }
    `}</style>

    <div className="summary-root">
      <div className="summary-card">
        {/* Scrollable invoice content */}
        <div className="summary-scroll">

          {/* TAX INVOICE HEADER */}
          <div
            style={{
              borderBottom: "1px solid #e3e8eb",
              paddingBottom: "10px",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              {/* Left: Supplier details */}
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                  Tax Invoice
                </h2>
                <div
                  style={{
                    fontWeight: 600,
                    marginTop: 4,
                    fontSize: "13px",
                    color: "#102a43",
                  }}
                >
                  {supplier.name}
                </div>
                <div style={{ fontSize: "11.5px", color: "#52606d" }}>
                  GSTIN: {supplier.gstin}
                </div>
                <div style={{ fontSize: "11.5px", color: "#52606d" }}>
                  {supplier.addressLine1}
                </div>
                <div style={{ fontSize: "11.5px", color: "#52606d" }}>
                  {supplier.addressLine2}
                </div>
              </div>

              {/* Right: Invoice details */}
              <div
                style={{
                  textAlign: "right",
                  fontSize: "11.5px",
                  color: "#52606d",
                }}
              >
                <div>
                  <strong>Invoice No:&nbsp;</strong>
                  <span>{receipt?.receiptId || "—"}</span>
                </div>
                <div>
                  <strong>Invoice Date:&nbsp;</strong>
                  <span>{fmtDateTime(receipt?.createdAt)}</span>
                </div>
                <div>
                  <strong>Place of Supply:&nbsp;</strong>
                  <span>{receipt?.placeOfSupply || "Maharashtra"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOMER SECTION */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: "12px",
              fontSize: "11.5px",
              color: "#243b53",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: "55%" }}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 4,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "#52606d",
                }}
              >
                Billed To
              </div>
              <div style={{ fontWeight: 600 }}>
                {receipt?.userName || "Customer"}
              </div>
              {receipt?.userMobile && (
                <div>Mobile: {receipt.userMobile}</div>
              )}
              {receipt?.userEmail && (
                <div>Email: {receipt.userEmail}</div>
              )}
              <div>
                Customer GSTIN:&nbsp;
                {receipt?.userGstin && receipt.userGstin.trim()
                  ? receipt.userGstin
                  : "Unregistered"}
              </div>
            </div>

            <div
              style={{
                textAlign: "right",
                flex: 1,
                minWidth: "40%",
              }}
            >
              <div>
                <strong>Device ID:&nbsp;</strong>
                <span>{receipt?.deviceId || session?.deviceId || "—"}</span>
              </div>
              <div>
                <strong>Session ID:&nbsp;</strong>
                <span>{receipt?.sessionId || session?.sessionId || "—"}</span>
              </div>
              <div>
                <strong>Transaction ID:&nbsp;</strong>
                <span>
                  {receipt?.transactionId || session?.transactionId || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* LINE ITEM TABLE */}
          <div
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: 6,
              overflow: "hidden",
              marginBottom: "12px",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11.5px",
              }}
            >
              <thead style={{ backgroundColor: "#f5f7fa" }}>
                <tr>
                  <th
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #dde1e7",
                      textAlign: "left",
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #dde1e7",
                      textAlign: "right",
                    }}
                  >
                    Energy (kWh)
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #dde1e7",
                      textAlign: "right",
                    }}
                  >
                    Rate (₹/kWh)
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #dde1e7",
                      textAlign: "right",
                    }}
                  >
                    Taxable (₹)
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #dde1e7",
                      textAlign: "right",
                    }}
                  >
                    GST (₹)
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #dde1e7",
                      textAlign: "right",
                    }}
                  >
                    Total (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #f0f0f0",
                      color: "#243b53",
                    }}
                  >
                    EV Charging – Device{" "}
                    {receipt?.deviceId || session?.deviceId || "—"}
                    <br />
                    Session {receipt?.sessionId || session?.sessionId || "—"}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                    }}
                  >
                    {Number(
                      receipt?.energyConsumed ||
                        session?.energyConsumed ||
                        0
                    ).toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                    }}
                  >
                    {fmtMoney(receipt?.userRatePerKwh || 0)}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                    }}
                  >
                    {fmtMoney(receipt?.taxableAmount || 0)}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                    }}
                  >
                    {fmtMoney(receipt?.gstAmount || 0)}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                    }}
                  >
                    {fmtMoney(receipt?.totalAmount || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PAYMENT SUMMARY */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                minWidth: 260,
                fontSize: "11.5px",
                color: "#243b53",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <span>Amount Selected</span>
                <span>{fmtMoney(receipt?.amountSelected || 0)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <span>Discount</span>
                <span>- {fmtMoney(receipt?.discountApplied || 0)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                <span>Amount Paid</span>
                <span>{fmtMoney(receipt?.amountPaid || 0)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <span>Amount Utilized</span>
                <span>{fmtMoney(receipt?.amountUtilized || 0)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 2,
                }}
              >
                <span>Refund</span>
                <span>{fmtMoney(receipt?.refundAmount || 0)}</span>
              </div>
            </div>
          </div>

          {/* FOOTER NOTE */}
          <div
            style={{
              fontSize: "10.5px",
              color: "#7b8794",
              marginBottom: "6px",
            }}
          >
            This is a GST tax invoice for EV charging services. Thank you for
            charging with VIZ Smart Charging.
          </div>

          {/* Feedback Card */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid rgba(4,191,191,0.15)",
              boxShadow: "0 3px 16px rgba(4,191,191,0.06)",
              padding: "14px 16px",
              marginTop: "10px",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#0e1e1e",
                textAlign: "center",
              }}
            >
              How was your charging experience?
            </p>

            {/* Stars */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "5px",
                marginBottom: "4px",
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  className="star-btn"
                  disabled={feedbackSubmitted}
                  onClick={() => setRating(i)}
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill={i <= rating ? "#ff9100" : "none"}
                    stroke={i <= rating ? "#ff9100" : "#c0d8db"}
                    strokeWidth="1.5"
                    style={{ transition: "all 0.15s" }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#ff9100",
                  textAlign: "center",
                }}
              >
                {ratingLabels[rating]}
              </p>
            )}

            {!feedbackSubmitted ? (
              <>
                <textarea
                  rows={3}
                  placeholder="Any suggestions to improve our service? (optional)"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 11px",
                    fontSize: "12.5px",
                    fontFamily: "Poppins, sans-serif",
                    borderRadius: "10px",
                    border: "1.5px solid rgba(4,191,191,0.20)",
                    background: "rgba(4,191,191,0.04)",
                    color: "#0e1e1e",
                    outline: "none",
                    resize: "none",
                    transition: "border-color 0.18s",
                    lineHeight: 1.5,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#04bfbf";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor =
                      "rgba(4,191,191,0.20)";
                  }}
                />
                <button
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0}
                  style={{
                    ...btnPrimary,
                    marginTop: "10px",
                    opacity: rating === 0 ? 0.45 : 1,
                    cursor: rating === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  Submit Feedback
                </button>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 11px",
                  background: "rgba(4,191,191,0.08)",
                  borderRadius: "10px",
                  border: "1px solid rgba(4,191,191,0.18)",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#04bfbf"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#04bfbf",
                  }}
                >
                  Thanks for your feedback!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed footer: action buttons */}
        <div className="summary-footer">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <button
              className="home-btn"
              onClick={() => navigate("/home")}
              style={btnPrimary}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                style={{ marginRight: "6px", flexShrink: 0 }}
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Back to Home
            </button>

            {receipt.refundAmount > 0 && (
              <button
                onClick={handleRefund}
                className="refund-wa"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(37,211,102,0.07)",
                  color: "#1a7a3a",
                  border: "1.5px solid rgba(37,211,102,0.28)",
                  borderRadius: "14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  transition: "background 0.18s",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="#25D366"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Request Refund via WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </>
);
};

/* ── Shared button styles ── */
const btnPrimary = {
  width: "100%",
  padding: "12px",
  background: "linear-gradient(90deg, #04bfbf, #029a9a)",
  color: "#ffffff",
  border: "none",
  borderRadius: "14px",
  fontSize: "13.5px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
  boxShadow: "0 5px 18px rgba(4,191,191,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  transition: "background 0.18s",
};

const btnGhost = {
  width: "100%",
  padding: "12px",
  background: "transparent",
  color: "#5a8a90",
  border: "1.5px solid rgba(4,191,191,0.20)",
  borderRadius: "14px",
  fontSize: "13.5px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export default SessionSummary;