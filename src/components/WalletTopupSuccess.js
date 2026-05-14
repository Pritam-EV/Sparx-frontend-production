// src/components/WalletTopupSuccess.js
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const BASE = process.env.REACT_APP_Backend_API_Base_URL;

export default function WalletTopupSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | failed
  const [amount, setAmount] = useState(null);
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    if (!orderId) { setStatus("failed"); return; }

    const token = localStorage.getItem("token");
    let attempts = 0;
    const maxAttempts = 12;

    const poll = async () => {
      try {
        const res = await fetch(
          `${BASE}/api/wallet/topup-status?orderId=${orderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.status === "SUCCESS") {
          setAmount(data.amount);
          setStatus("success");
        } else if (data.status === "FAILED") {
          setStatus("failed");
        } else {
          attempts++;
          if (attempts < maxAttempts) setTimeout(poll, 1000);
          else setStatus("failed");
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) setTimeout(poll, 1500);
        else setStatus("failed");
      }
    };
    poll();
  }, [orderId]);

  return (
    <>
      <style>{`
        @keyframes scaleIn {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(4,191,191,0.4); }
          50%     { box-shadow: 0 0 0 16px rgba(4,191,191,0); }
        }
        .wts-icon   { animation: scaleIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .wts-text   { animation: fadeUp 0.45s 0.25s ease both; }
        .wts-amount { animation: fadeUp 0.45s 0.35s ease both; }
        .wts-btns   { animation: fadeUp 0.45s 0.5s ease both; }
        .wts-btn-primary:active { transform: scale(0.97); }
        .wts-btn-ghost:active   { transform: scale(0.97); }
      `}</style>

      {/* TOP BAR */}
      <div className="top-bar">
        <img src="/logo.png" alt="VIZ Logo" className="top-bar-logo" />
      </div>

      <div style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 24px 40px",
        paddingTop: 72,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        textAlign: "center",
      }}>

        {/* ── LOADING ── */}
        {status === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              border: "3px solid rgba(4,191,191,0.15)",
              borderTop: "3px solid #04BFBF",
              animation: "spin 0.9s linear infinite",
            }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#011F26", marginBottom: 6 }}>
                Confirming Top-up…
              </div>
              <div style={{ fontSize: 13, color: "#7a9090", maxWidth: 240 }}>
                Please wait while we verify your payment
              </div>
            </div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {status === "success" && (
          <>
            {/* Icon */}
            <div className="wts-icon" style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(4,191,191,0.15), rgba(4,191,191,0.05))",
              border: "2px solid rgba(4,191,191,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24,
              animation: "scaleIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards, pulse 2.5s 0.6s ease-in-out infinite",
            }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#04BFBF" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>

            {/* Wallet credited card */}
            <div className="wts-text" style={{
              background: "#fff",
              borderRadius: 20,
              border: "1.5px solid rgba(4,191,191,0.18)",
              boxShadow: "0 4px 24px rgba(4,191,191,0.10)",
              padding: "24px 28px",
              width: "100%", maxWidth: 340,
              marginBottom: 28,
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 14px", borderRadius: 999,
                background: "rgba(4,191,191,0.10)", border: "1px solid rgba(4,191,191,0.22)",
                marginBottom: 16,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04BFBF" strokeWidth="2.5">
                  <rect x="2" y="7" width="20" height="14" rx="3"/>
                  <path d="M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="#04BFBF" stroke="none"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#04BFBF", letterSpacing: "0.04em" }}>
                  VIZ WALLET
                </span>
              </div>

              <div className="wts-amount" style={{
                fontSize: 42, fontWeight: 800, color: "#04BFBF",
                letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 6,
              }}>
                +₹{amount ? Number(amount).toFixed(2) : "—"}
              </div>

              <div style={{ fontSize: 14, fontWeight: 700, color: "#011F26", marginBottom: 4 }}>
                Wallet Topped Up Successfully!
              </div>
              <div style={{ fontSize: 12, color: "#7a9090" }}>
                Your balance has been updated instantly
              </div>

              {orderId && (
                <div style={{
                  marginTop: 16, padding: "10px 14px",
                  background: "#f4f6f8", borderRadius: 10,
                  fontSize: 10.5, color: "#9ab0b0",
                  fontFamily: "monospace", wordBreak: "break-all",
                }}>
                  Order: {orderId}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="wts-btns" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340 }}>
              <button
                className="wts-btn-primary"
                onClick={() => navigate("/transactions")}
                style={{
                  width: "100%", padding: "15px",
                  background: "#04BFBF", color: "#011F26",
                  fontWeight: 800, fontSize: 15,
                  border: "none", borderRadius: 14, cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(4,191,191,0.35)",
                  transition: "transform 0.15s",
                }}
              >
                View Transactions
              </button>
              <button
                className="wts-btn-ghost"
                onClick={() => navigate("/home")}
                style={{
                  width: "100%", padding: "13px",
                  background: "transparent",
                  color: "#55777a", fontWeight: 700, fontSize: 14,
                  border: "1.5px solid rgba(0,0,0,0.09)",
                  borderRadius: 14, cursor: "pointer",
                  transition: "transform 0.15s",
                }}
              >
                Go to Home
              </button>
            </div>
          </>
        )}

        {/* ── FAILED / PENDING ── */}
        {status === "failed" && (
          <>
            <div className="wts-icon" style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "rgba(242,160,7,0.08)",
              border: "2px solid rgba(242,160,7,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24,
            }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#F2A007" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <div className="wts-text" style={{
              background: "#fff", borderRadius: 20,
              border: "1.5px solid rgba(242,160,7,0.18)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              padding: "24px 28px",
              width: "100%", maxWidth: 340, marginBottom: 28,
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#011F26", marginBottom: 8 }}>
                Payment Pending
              </div>
              <div style={{ fontSize: 13, color: "#7a9090", lineHeight: 1.6 }}>
                Your payment may still be processing. Check your wallet balance in a few minutes — it will update automatically.
              </div>
              {orderId && (
                <div style={{
                  marginTop: 16, padding: "10px 14px",
                  background: "#f4f6f8", borderRadius: 10,
                  fontSize: 10.5, color: "#9ab0b0",
                  fontFamily: "monospace", wordBreak: "break-all",
                }}>
                  Order: {orderId}
                </div>
              )}
            </div>

            <div className="wts-btns" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340 }}>
              <button
                className="wts-btn-primary"
                onClick={() => navigate("/transactions")}
                style={{
                  width: "100%", padding: "15px",
                  background: "#04BFBF", color: "#011F26",
                  fontWeight: 800, fontSize: 15,
                  border: "none", borderRadius: 14, cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(4,191,191,0.30)",
                  transition: "transform 0.15s",
                }}
              >
                Check Wallet Balance
              </button>
              <button
                className="wts-btn-ghost"
                onClick={() => navigate("/home")}
                style={{
                  width: "100%", padding: "13px",
                  background: "transparent",
                  color: "#55777a", fontWeight: 700, fontSize: 14,
                  border: "1.5px solid rgba(0,0,0,0.09)",
                  borderRadius: 14, cursor: "pointer",
                  transition: "transform 0.15s",
                }}
              >
                Go to Home
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}