import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FooterNav from "../components/FooterNav";

const BASE = process.env.REACT_APP_Backend_API_Base_URL;
const QUICK_AMOUNTS = [100, 200, 500, 1000];

export default function WalletTopup() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const inputRef  = useRef(null);
  const toastRef  = useRef(null);

  const params       = new URLSearchParams(location.search);
  const shortfall    = Number(params.get("need") || 0);

  const [balance,   setBalance]   = useState(null);
  const [amount,    setAmount]    = useState(
    shortfall > 0
      ? String(QUICK_AMOUNTS.find(q => q >= shortfall) || 500)
      : "200"
  );
  const [editing,   setEditing]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [balLoading,setBalLoading]= useState(true);
  const [toast,     setToast]     = useState({ open: false, msg: "", type: "error" });

  const numAmt   = Number(amount) || 0;
  const isValid  = numAmt >= 10;
  const afterBal = balance !== null && isValid ? (balance + numAmt).toFixed(2) : null;

  const showToast = (msg, type = "error") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ open: true, msg, type });
    toastRef.current = setTimeout(() => setToast(p => ({ ...p, open: false })), 2800);
  };

  // Fetch wallet balance
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setBalLoading(false); return; }
    fetch(`${BASE}/api/wallet/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (typeof d.balance === "number") setBalance(d.balance); })
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
    if (!isValid) { showToast("Minimum top-up is ₹10"); return; }
    const token = localStorage.getItem("token");
    if (!token) { showToast("Please login to continue"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/wallet/topup/order`, {
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
        @keyframes slideUp {
          from { opacity:0; transform:translate(-50%,16px); }
          to   { opacity:1; transform:translate(-50%,0); }
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .wt-quick:active  { transform:scale(0.93); }
        .wt-pay:active    { transform:scale(0.983); }
        .wt-amount:active { opacity:0.8; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
        input[type=number] { -moz-appearance:textfield; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="top-bar">
        <img src="/logo.png" alt="VIZ Logo" className="top-bar-logo" />
      </div>

      <div style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        paddingTop: 56,
        paddingBottom: 90,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 16px 0" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width:36, height:36, borderRadius:"50%", flexShrink:0,
              background:"rgba(1,31,38,0.06)", border:"1.5px solid rgba(1,31,38,0.10)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", color:"#011F26", padding:0,
              transition:"background 0.15s",
            }}
            aria-label="Back"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:"#011F26", letterSpacing:"-0.3px" }}>
              Add Money
            </h2>
            <p style={{ margin:0, fontSize:11, color:"#7a9090" }}>Top up your VIZ Wallet</p>
          </div>

          {/* Live balance badge */}
          {!balLoading && balance !== null && (
            <div style={{
              marginLeft:"auto", display:"flex", alignItems:"center", gap:5,
              padding:"6px 12px", borderRadius:999,
              background:"rgba(4,191,191,0.09)", border:"1.5px solid rgba(4,191,191,0.22)",
              flexShrink:0,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#04BFBF" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="3"/>
                <path d="M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="#04BFBF" stroke="none"/>
              </svg>
              <span style={{ fontSize:12, fontWeight:800, color:"#04BFBF" }}>
                ₹{Number(balance).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* ── SHORTFALL BANNER ── */}
        {shortfall > 0 && (
          <div style={{
            margin:"14px 16px 0",
            background:"rgba(242,160,7,0.08)",
            border:"1px solid rgba(242,160,7,0.22)",
            borderRadius:14, padding:"12px 14px",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{
              width:34, height:34, borderRadius:"50%", flexShrink:0,
              background:"rgba(242,160,7,0.14)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
            }}>⚡</div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#cc8800" }}>Low balance for charging</div>
              <div style={{ fontSize:11, color:"#9a7a00", marginTop:2 }}>
                Need ₹{shortfall.toFixed(2)} more to start your session.
              </div>
            </div>
          </div>
        )}

        {/* ── AMOUNT DISPLAY (tap to edit) ── */}
        <div style={{
          margin:"22px 16px 0",
          background:"#fff",
          borderRadius:20,
          border: editing
            ? "2px solid #04BFBF"
            : "1.5px solid rgba(4,191,191,0.18)",
          boxShadow: editing
            ? "0 0 0 4px rgba(4,191,191,0.10)"
            : "0 2px 14px rgba(0,0,0,0.06)",
          padding:"22px 20px 18px",
          transition:"border 0.18s, box-shadow 0.18s",
        }}>
          <div style={{ fontSize:11, fontWeight:600, color:"#7a9090", marginBottom:10, letterSpacing:"0.04em", textTransform:"uppercase" }}>
            Amount to Add
          </div>

          {/* Editable amount row */}
          <div
            className="wt-amount"
            onClick={() => setEditing(true)}
            style={{
              display:"flex", alignItems:"center", gap:4,
              cursor:"text", marginBottom:6,
            }}
          >
            <span style={{
              fontSize:38, fontWeight:800, color:"#04BFBF",
              lineHeight:1, letterSpacing:"-1px", flexShrink:0,
            }}>₹</span>

            {editing ? (
              <input
                ref={inputRef}
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onBlur={() => { if (!amount || Number(amount) <= 0) setAmount("200"); setEditing(false); }}
                onKeyDown={e => { if (e.key === "Enter") { setEditing(false); inputRef.current?.blur(); } }}
                style={{
                  fontSize:38, fontWeight:800, color:"#011F26",
                  background:"transparent", border:"none", outline:"none",
                  width:"100%", padding:0, letterSpacing:"-1px", lineHeight:1,
                  fontFamily:"inherit",
                }}
              />
            ) : (
              <span style={{
                fontSize:38, fontWeight:800, color:"#011F26",
                lineHeight:1, letterSpacing:"-1px",
                borderBottom:"2px dashed rgba(4,191,191,0.35)",
                minWidth:80,
              }}>
                {numAmt > 0 ? numAmt.toLocaleString("en-IN") : "0"}
              </span>
            )}

            {/* Edit pencil */}
            {!editing && (
              <div style={{
                marginLeft:6, width:26, height:26, borderRadius:8,
                background:"rgba(4,191,191,0.10)", border:"1px solid rgba(4,191,191,0.22)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04BFBF" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Validation */}
          {!isValid && numAmt > 0 && (
            <div style={{ fontSize:11, color:"#d93025", fontWeight:600, marginBottom:4 }}>
              Minimum top-up amount is ₹10
            </div>
          )}

          {/* After-topup preview */}
          {afterBal && (
            <div style={{
              fontSize:11, color:"#7a9090", marginTop:2,
              display:"flex", alignItems:"center", gap:4,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#04BFBF" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Wallet balance after: <strong style={{ color:"#04BFBF" }}>₹{afterBal}</strong>
            </div>
          )}


        </div>

        {/* ── QUICK AMOUNT PILLS ── */}
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ fontSize:11, fontWeight:600, color:"#7a9090", marginBottom:10, letterSpacing:"0.04em", textTransform:"uppercase" }}>
            Quick Select
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {QUICK_AMOUNTS.map(q => {
              const active = !editing && numAmt === q;
              return (
                <button
                  key={q}
                  className="wt-quick"
                  onClick={() => handleQuickSelect(q)}
                  style={{
                    flex:1, padding:"12px 0", borderRadius:14, cursor:"pointer",
                    border: active
                      ? "2px solid #04BFBF"
                      : "1.5px solid rgba(0,0,0,0.09)",
                    background: active ? "rgba(4,191,191,0.10)" : "#fff",
                    color: active ? "#04BFBF" : "#55777a",
                    fontWeight:800, fontSize:14,
                    boxShadow: active ? "0 4px 14px rgba(4,191,191,0.18)" : "0 1px 4px rgba(0,0,0,0.05)",
                    transition:"all 0.15s",
                  }}
                >
                  ₹{q}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── INFO STRIP ── */}
        <div style={{ display:"flex", gap:8, padding:"14px 16px 0", flexWrap:"wrap" }}>
          {[
            { icon:"⚡", text:"Instant credit" },
            { icon:"♾️",  text:"No expiry"      },
            { icon:"🔒", text:"Secure payment"  },
          ].map(item => (
            <div key={item.text} style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"7px 12px", borderRadius:999,
              background:"#fff", border:"1px solid rgba(4,191,191,0.18)",
              boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <span style={{ fontSize:12 }}>{item.icon}</span>
              <span style={{ fontSize:11, fontWeight:600, color:"#55777a" }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* ── PAY BUTTON ── */}
        <div style={{ padding:"20px 16px 0", marginTop:"auto" }}>
          <button
            className="wt-pay"
            onClick={handleTopup}
            disabled={loading || !isValid}
            style={{
              width:"100%", padding:"16px", borderRadius:16,
              background: loading || !isValid
                ? "rgba(0,0,0,0.08)"
                : "#04BFBF",
              color: loading || !isValid ? "#999" : "#011F26",
              fontWeight:800, fontSize:16,
              border:"none", cursor: loading || !isValid ? "not-allowed" : "pointer",
              boxShadow: loading || !isValid ? "none" : "0 6px 20px rgba(4,191,191,0.38)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              transition:"all 0.2s",
              letterSpacing:"-0.2px",
            }}
          >
            {loading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation:"spin 0.8s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Redirecting to payment…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="7" width="20" height="14" rx="3"/>
                  <path d="M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="#011F26" stroke="none"/>
                  <path d="M2 11h20"/>
                </svg>
                Pay ₹{isValid ? numAmt.toLocaleString("en-IN") : "—"} via UPI / Card
              </>
            )}
          </button>

          <div style={{ textAlign:"center", marginTop:10 }}>
            <span style={{ fontSize:11, color:"#b0c0c0" }}>🔒 Secured by Cashfree Payments</span>
          </div>
        </div>

      </div>

      {/* ── FOOTER NAV ── */}
      <FooterNav />

      {/* ── TOAST ── */}
      {toast.open && (
        <div style={{
          position:"fixed", bottom:90, left:"50%",
          transform:"translateX(-50%)",
          zIndex:9999,
          animation:"slideUp 0.28s ease",
          width:"calc(100% - 32px)", maxWidth:400,
        }}>
          <div style={{
            padding:"13px 18px", borderRadius:16,
            background: toast.type === "success"
              ? "rgba(10,140,80,0.95)"
              : "rgba(217,48,37,0.92)",
            backdropFilter:"blur(12px)",
            color:"#fff", fontWeight:700, fontSize:13,
            textAlign:"center",
            boxShadow: toast.type === "success"
              ? "0 8px 24px rgba(10,140,80,0.35)"
              : "0 8px 24px rgba(217,48,37,0.30)",
            border: toast.type === "success"
              ? "1px solid rgba(74,222,128,0.30)"
              : "1px solid rgba(252,165,165,0.25)",
          }}>
            {toast.msg}
          </div>
        </div>
      )}
    </>
  );
}