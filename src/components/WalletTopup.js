// src/components/WalletTopup.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FooterNav from "../components/FooterNav";
import AppHeader from "../components/AppHeader";

const BASE = process.env.REACT_APP_Backend_API_Base_URL;
const QUICK_AMOUNTS = [100, 200, 500, 1000];

export default function WalletTopup() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const toastRef = useRef(null);

  const params = new URLSearchParams(location.search);
  const shortfall = Number(params.get("need") || 0);

  const [balance, setBalance] = useState(null);
  const [amount, setAmount] = useState(
    shortfall > 0
      ? String(QUICK_AMOUNTS.find((q) => q >= shortfall) || 500)
      : "200"
  );
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balLoading, setBalLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, msg: "", type: "error" });

  const numAmt = Number(amount) || 0;
  const isValid = numAmt >= 10;
  const afterBal = balance !== null && isValid ? (balance + numAmt).toFixed(2) : null;

  const showToast = (msg, type = "error") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ open: true, msg, type });
    toastRef.current = setTimeout(() => setToast((p) => ({ ...p, open: false })), 2800);
  };

  // Fetch wallet balance
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setBalLoading(false);
      return;
    }
    fetch(`${BASE}/api/wallet/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.balance === "number") setBalance(d.balance);
      })
      .catch(() => {})
      .finally(() => setBalLoading(false));
  }, []);

  // Auto-focus input when editing
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleQuickSelect = (q) => {
    setAmount(String(q));
    setEditing(false);
  };

  const handleTopup = async () => {
    if (!isValid) {
      showToast("Minimum top-up is ₹10");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("Please login to continue");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/wallet/topup/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: numAmt }),
      });
      const data = await res.json();
      if (!res.ok || !data.paymentSessionId) {
        showToast(data.message || "Failed to initiate top-up. Try again.");
        setLoading(false);
        return;
      }
      if (typeof window.Cashfree === "undefined") {
        showToast("Payment SDK not loaded. Please refresh.");
        setLoading(false);
        return;
      }
      const cashfree = new window.Cashfree({ mode: "production" });
      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        returnUrl: `${window.location.origin}/wallet/topup-success?order_id={order_id}`,
        redirectTarget: "_self",
      });
    } catch (e) {
      showToast(e.message || "Top-up failed. Try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .wt-viewport {
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

        .wt-shell {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px 16px calc(110px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* ── HEADER TITLE BAR ── */
        .wt-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 4px;
        }

        .wt-title {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #0e2e33;
          letter-spacing: -0.3px;
          margin: 0;
        }

        .wt-sub {
          font-size: 11.5px;
          color: #53757a;
          margin: 2px 0 0;
        }

        .wt-balance-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          background: #dbfaf0;
          border: 1px solid #b8f2dd;
          color: #008764;
          font-size: 12.5px;
          font-weight: 750;
        }

        /* ── SHORTFALL WARNING BANNER ── */
        .wt-shortfall-card {
          background: #fff8f3;
          border: 1px solid #ffe1cf;
          border-radius: 18px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-sizing: border-box;
        }

        /* ── AMOUNT ENTRY CARD ── */
        .wt-amount-card {
          background: #ffffff;
          border: 1.5px solid #d4f0ec;
          border-radius: 26px;
          padding: 24px 20px 20px;
          box-shadow: 0 8px 28px rgba(0, 160, 145, 0.08);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.18s ease;
          box-sizing: border-box;
        }
        .wt-amount-card.active {
          border-color: #00d2b4;
          box-shadow: 0 0 0 4px rgba(0, 210, 180, 0.12), 0 8px 28px rgba(0, 160, 145, 0.1);
        }

        .wt-amount-row {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: text;
        }

        .wt-currency-symbol {
          font-family: 'Outfit', sans-serif;
          font-size: 42px;
          font-weight: 800;
          color: #ff8236;
          line-height: 1;
          letter-spacing: -1px;
        }

        .wt-amount-input {
          font-family: 'Outfit', sans-serif;
          font-size: 44px;
          font-weight: 800;
          color: #0e2e33;
          background: transparent;
          border: none;
          outline: none;
          width: 100%;
          padding: 0;
          letter-spacing: -1px;
          line-height: 1;
        }

        .wt-amount-display {
          font-family: 'Outfit', sans-serif;
          font-size: 44px;
          font-weight: 800;
          color: #0e2e33;
          line-height: 1;
          letter-spacing: -1px;
          border-bottom: 2px dashed #b7ede4;
          min-width: 100px;
        }

        /* ── QUICK SELECT PILLS ── */
        .wt-quick-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          width: 100%;
        }

        .wt-quick-btn {
          padding: 12px 0;
          border-radius: 14px;
          background: #ffffff;
          border: 1.5px solid #d4f0ec;
          color: #53757a;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 160, 145, 0.04);
          transition: all 0.15s ease;
        }
        .wt-quick-btn:hover {
          background: #edfbf8;
          border-color: #00d2b4;
          color: #00776b;
        }
        .wt-quick-btn.active {
          background: #00d2b4;
          border-color: #00d2b4;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(0, 210, 180, 0.3);
        }

        /* ── TRUST BADGES ROW ── */
        .wt-features-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .wt-feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          box-shadow: 0 2px 6px rgba(0, 160, 145, 0.03);
          font-size: 11.5px;
          font-weight: 750;
          color: #53757a;
        }

        /* ── DISCLAIMER NOTE ── */
        .wt-disclaimer {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          padding: 12px 14px;
          border-radius: 14px;
          background: #fff8f8;
          border: 1px solid #ffd8d8;
          color: #c23b3b;
          font-size: 11px;
          font-weight: 650;
          line-height: 1.45;
        }

        /* ── PAY ACTION BUTTON ── */
        .wt-btn-pay {
          width: 100%;
          min-height: 54px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(255, 82, 26, 0.35);
          transition: all 0.18s ease;
        }
        .wt-btn-pay:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 10px 28px rgba(255, 82, 26, 0.45);
        }
        .wt-btn-pay:active:not(:disabled) {
          transform: scale(0.985);
        }
        .wt-btn-pay:disabled {
          background: #cad4d6;
          color: #8c9fa3;
          box-shadow: none;
          cursor: not-allowed;
        }

        @keyframes wtSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes wtSlideUp {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      <AppHeader />

      <div className="wt-viewport">
        <div className="wt-shell">

          {/* ── TOP HEADER BAR ── */}
          <div className="wt-top-bar">
            <div>
              <h1 className="wt-title">Add Money to Wallet</h1>
              <p className="wt-sub">Instant top-up for VIZ EV charging</p>
            </div>

            {!balLoading && balance !== null && (
              <div className="wt-balance-pill">
                <span>Balance: ₹{Number(balance).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* ── SHORTFALL ALERT (IF APPLICABLE) ── */}
          {shortfall > 0 && (
            <div className="wt-shortfall-card">
              <span style={{ fontSize: 24 }}>⚡</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 750, color: "#d85400" }}>
                  Low Balance for Charging Session
                </div>
                <div style={{ fontSize: 11.5, color: "#53757a", marginTop: 2 }}>
                  We recommend adding at least <strong>₹{shortfall.toFixed(2)}</strong> to proceed.
                </div>
              </div>
            </div>
          )}

          {/* ── AMOUNT ENTRY CARD ── */}
          <div
            className={`wt-amount-card ${editing ? "active" : ""}`}
            onClick={() => setEditing(true)}
            role="button"
            tabIndex={0}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: "#799ea4", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Top-up Amount
            </span>

            <div className="wt-amount-row">
              <span className="wt-currency-symbol">₹</span>
              {editing ? (
                <input
                  ref={inputRef}
                  type="number"
                  className="wt-amount-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => {
                    if (!amount || Number(amount) <= 0) setAmount("200");
                    setEditing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditing(false);
                      inputRef.current?.blur();
                    }
                  }}
                />
              ) : (
                <span className="wt-amount-display">
                  {numAmt > 0 ? numAmt.toLocaleString("en-IN") : "0"}
                </span>
              )}
            </div>

            {/* Validation & Balance Preview */}
            {!isValid && numAmt > 0 ? (
              <span style={{ fontSize: 11.5, color: "#d93b3b", fontWeight: 700 }}>
                Minimum top-up amount is ₹10
              </span>
            ) : afterBal ? (
              <span style={{ fontSize: 11.5, color: "#008f7f", fontWeight: 700 }}>
                ✓ Estimated wallet balance after top-up: ₹{afterBal}
              </span>
            ) : (
              <span style={{ fontSize: 11.5, color: "#799ea4" }}>
                Tap numbers above to customize amount
              </span>
            )}
          </div>

          {/* ── QUICK SELECT PILLS ── */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#53757a", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 8 }}>
              Quick Select
            </span>
            <div className="wt-quick-grid">
              {QUICK_AMOUNTS.map((q) => {
                const active = !editing && numAmt === q;
                return (
                  <button
                    key={q}
                    type="button"
                    className={`wt-quick-btn ${active ? "active" : ""}`}
                    onClick={() => handleQuickSelect(q)}
                  >
                    ₹{q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── VALUE TRUST BADGES ── */}
          <div className="wt-features-row">
            <div className="wt-feature-pill">
              <span>⚡</span>
              <span>Instant Credit</span>
            </div>
            <div className="wt-feature-pill">
              <span>♾️</span>
              <span>Zero Expiry</span>
            </div>
            <div className="wt-feature-pill">
              <span>🔒</span>
              <span>256-Bit Encrypted</span>
            </div>
          </div>

          {/* ── DISCLAIMER ── */}
          <div className="wt-disclaimer">
            <span style={{ fontSize: 14 }}>ℹ</span>
            <span>
              Wallet balance is strictly reserved for VIZ EV charging sessions and cannot be withdrawn to bank accounts.
            </span>
          </div>

          {/* ── SECURE PAY ACTION BUTTON ── */}
          <div style={{ marginTop: 4 }}>
            <button
              type="button"
              className="wt-btn-pay"
              onClick={handleTopup}
              disabled={loading || !isValid}
            >
              {loading ? (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ animation: "wtSpin 0.8s linear infinite" }}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span>Connecting to Gateway…</span>
                </>
              ) : (
                <>
                  <span>Pay ₹{isValid ? numAmt.toLocaleString("en-IN") : "—"} securely</span>
                  <span>→</span>
                </>
              )}
            </button>

            <div style={{ textAlign: "center", marginTop: 10 }}>
              <span style={{ fontSize: "11px", color: "#799ea4", fontWeight: 600 }}>
                🔒 Secured by Cashfree Payments Gateway
              </span>
            </div>
          </div>

        </div>
      </div>

      <FooterNav />

      {/* ── TOAST NOTIFICATION ── */}
      {toast.open && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            animation: "wtSlideUp 0.25s ease",
            width: "calc(100% - 32px)",
            maxWidth: 400,
          }}
        >
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "16px",
              background:
                toast.type === "success"
                  ? "rgba(0, 168, 120, 0.95)"
                  : "rgba(224, 60, 49, 0.95)",
              color: "#ffffff",
              fontWeight: 750,
              fontSize: "13px",
              textAlign: "center",
              boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
              backdropFilter: "blur(12px)",
            }}
          >
            {toast.msg}
          </div>
        </div>
      )}
    </>
  );
}