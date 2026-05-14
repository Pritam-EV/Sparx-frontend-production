// src/components/WalletTopup.js
import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useNavigate, useLocation } from "react-router-dom";

const BASE = process.env.REACT_APP_Backend_API_Base_URL;
const QUICK_AMOUNTS = [100, 200, 500, 1000];

export default function WalletTopup() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  // Read hint shortfall from query param e.g. /wallet/topup?need=120
  const params = new URLSearchParams(location.search);
  const shortfallHint = Number(params.get("need") || 0);

  const [balance, setBalance] = useState(null);
  const [balLoading, setBalLoading] = useState(true);
  const [selectedAmt, setSelectedAmt] = useState(
    shortfallHint > 0
      ? QUICK_AMOUNTS.find((q) => q >= shortfallHint) || 500
      : 200
  );
  const [customAmt, setCustomAmt] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", type: "error" });
  const toastRef = useRef(null);

  const showToast = (message, type = "error") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ open: true, message, type });
    toastRef.current = setTimeout(() => setToast((p) => ({ ...p, open: false })), 2800);
  };

  // Fetch current balance
  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/wallet/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.balance === "number") setBalance(d.balance);
      })
      .catch(() => {})
      .finally(() => setBalLoading(false));
  }, [token]);

  const payableAmt = isCustom ? Number(customAmt) || 0 : selectedAmt;
  const isValid = payableAmt >= 10;

  const handleTopup = async () => {
    if (!isValid) { setError("Minimum top-up is ₹10"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/wallet/topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: payableAmt }),
      });
      const data = await res.json();
      if (!res.ok || !data.paymentSessionId) {
        showToast(data.message || "Failed to initiate top-up. Try again.", "error");
        setLoading(false);
        return;
      }
      if (typeof window.Cashfree === "undefined") {
        showToast("Payment SDK not loaded. Please refresh.", "error");
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
      showToast(e.message || "Top-up failed. Try again.", "error");
      setLoading(false);
    }
  };

  const afterTopup = balance !== null ? (balance + payableAmt).toFixed(2) : null;

  return (
    <>
      <style>{`
        @keyframes slideUpFade {
          from { opacity:0; transform:translate(-50%,20px); }
          to   { opacity:1; transform:translate(-50%,0); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(4,191,191,0); }
          50%      { box-shadow: 0 0 0 8px rgba(4,191,191,0.12); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <Box sx={{
        minHeight: "100dvh",
        background: "radial-gradient(circle at top, rgba(4,191,191,0.08), transparent 40%), linear-gradient(145deg,#0b0e13,#111a21)",
        color: "#e1f5f5",
        display: "flex",
        flexDirection: "column",
        pb: "40px",
      }}>

        {/* ── HEADER ── */}
        <Box sx={{ display:"flex", alignItems:"center", gap:1.5, px:2, pt:5.5, pb:2 }}>
          <Box
            onClick={() => navigate(-1)}
            sx={{
              width:38, height:38, borderRadius:"50%",
              background:"rgba(4,191,191,0.10)", border:"1px solid rgba(4,191,191,0.20)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", color:"#04BFBF", transition:"all 0.18s",
              "&:active":{ background:"rgba(4,191,191,0.22)" },
            }}
          >
            <ArrowBackIcon sx={{ fontSize:18 }} />
          </Box>
          <Typography sx={{ color:"#fff", fontWeight:700, fontSize:"1.1rem", flex:1 }}>
            Add Money
          </Typography>
          {/* Current balance badge */}
          {!balLoading && balance !== null && (
            <Box sx={{
              px:1.6, py:0.6, borderRadius:"999px",
              background:"rgba(4,191,191,0.10)", border:"1px solid rgba(4,191,191,0.22)",
              display:"flex", alignItems:"center", gap:0.6,
            }}>
              <AccountBalanceWalletIcon sx={{ fontSize:13, color:"#04BFBF" }} />
              <Typography sx={{ color:"#04BFBF", fontWeight:700, fontSize:"0.8rem" }}>
                ₹{Number(balance).toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ flex:1, overflowY:"auto", px:2, pt:0.5 }}>

          {/* ── SHORTFALL BANNER ── */}
          {shortfallHint > 0 && (
            <Box sx={{
              display:"flex", alignItems:"center", gap:1.5,
              p:1.6, borderRadius:"14px", mb:2.5,
              background:"rgba(255,100,100,0.07)",
              border:"1px solid rgba(255,120,120,0.18)",
            }}>
              <Box sx={{
                width:32, height:32, borderRadius:"50%",
                background:"rgba(255,100,100,0.12)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>
                <Typography sx={{ fontSize:"0.9rem" }}>⚡</Typography>
              </Box>
              <Box>
                <Typography sx={{ color:"#f99", fontWeight:700, fontSize:"0.85rem" }}>
                  Low balance for charging
                </Typography>
                <Typography sx={{ color:"#c99", fontSize:"0.75rem", mt:0.2 }}>
                  Need ₹{shortfallHint.toFixed(2)} more to proceed. Add money to continue.
                </Typography>
              </Box>
            </Box>
          )}

          {/* ── AMOUNT DISPLAY ── */}
          <Box sx={{
            textAlign:"center", mb:3, pt:1,
          }}>
            <Typography sx={{ color:"#7de0dd", fontSize:"0.8rem", mb:0.5 }}>
              You're adding
            </Typography>
            <Typography sx={{
              fontSize:"3.2rem", fontWeight:800, color:"#F2A007",
              letterSpacing:"-2px", lineHeight:1,
            }}>
              ₹{payableAmt || "—"}
            </Typography>
            {afterTopup && isValid && (
              <Typography sx={{ color:"#7de0dd", fontSize:"0.78rem", mt:0.8 }}>
                Wallet balance after: ₹{afterTopup}
              </Typography>
            )}
          </Box>

          {/* ── QUICK AMOUNT PILLS ── */}
          <Box sx={{ display:"flex", gap:1, mb:1.8, flexWrap:"wrap", justifyContent:"center" }}>
            {QUICK_AMOUNTS.map((q) => {
              const isActive = !isCustom && selectedAmt === q;
              return (
                <Box
                  key={q}
                  onClick={() => { setSelectedAmt(q); setIsCustom(false); setError(""); }}
                  sx={{
                    px:2.5, py:1, borderRadius:"999px", cursor:"pointer",
                    border: isActive
                      ? "1.5px solid #F2A007"
                      : "1.5px solid rgba(255,255,255,0.10)",
                    background: isActive
                      ? "rgba(242,160,7,0.14)"
                      : "rgba(255,255,255,0.04)",
                    color: isActive ? "#F2A007" : "#ccc",
                    fontWeight: isActive ? 700 : 500,
                    fontSize:"0.88rem",
                    transition:"all 0.15s",
                    animation: isActive ? "pulseGlow 2.4s ease-in-out infinite" : "none",
                    "&:active":{ opacity:0.75 },
                  }}
                >
                  ₹{q}
                </Box>
              );
            })}
            {/* Custom pill */}
            <Box
              onClick={() => { setIsCustom(true); setError(""); }}
              sx={{
                px:2.5, py:1, borderRadius:"999px", cursor:"pointer",
                border: isCustom
                  ? "1.5px solid #04BFBF"
                  : "1.5px solid rgba(255,255,255,0.10)",
                background: isCustom
                  ? "rgba(4,191,191,0.12)"
                  : "rgba(255,255,255,0.04)",
                color: isCustom ? "#04BFBF" : "#ccc",
                fontWeight: isCustom ? 700 : 500,
                fontSize:"0.88rem",
                transition:"all 0.15s",
                "&:active":{ opacity:0.75 },
              }}
            >
              Custom
            </Box>
          </Box>

          {/* ── CUSTOM INPUT ── */}
          {isCustom && (
            <Box sx={{
              display:"flex", alignItems:"center",
              background:"rgba(255,255,255,0.05)",
              border: error
                ? "1.5px solid rgba(255,100,100,0.5)"
                : "1.5px solid rgba(4,191,191,0.25)",
              borderRadius:"16px",
              px:2, py:0.6, mb:1, mx:"auto",
              maxWidth:340,
            }}>
              <Typography sx={{ color:"#7de0dd", fontSize:"1.2rem", mr:1, fontWeight:700 }}>₹</Typography>
              <input
                autoFocus
                type="number"
                value={customAmt}
                onChange={(e) => { setCustomAmt(e.target.value); setError(""); }}
                placeholder="Enter amount (min ₹10)"
                style={{
                  flex:1, background:"transparent", border:"none", outline:"none",
                  color:"#fff", fontSize:"1.1rem", padding:"10px 0",
                  fontFamily:"inherit",
                }}
              />
              {customAmt && (
                <Box
                  onClick={() => { setCustomAmt(""); setError(""); }}
                  sx={{ color:"#555", cursor:"pointer", fontSize:"1rem", ml:1, "&:active":{ opacity:0.6 } }}
                >✕</Box>
              )}
            </Box>
          )}
          {error && (
            <Typography sx={{ color:"#f77", fontSize:"0.76rem", textAlign:"center", mb:1 }}>
              {error}
            </Typography>
          )}

          {/* ── INFO STRIP ── */}
          <Box sx={{
            display:"flex", gap:1.5, justifyContent:"center",
            mb:3, mt:0.5, flexWrap:"wrap",
          }}>
            {["Instant credit", "No expiry", "Use for charging"].map((t) => (
              <Box key={t} sx={{
                display:"flex", alignItems:"center", gap:0.5,
                px:1.4, py:0.55, borderRadius:"999px",
                background:"rgba(4,191,191,0.06)",
                border:"1px solid rgba(4,191,191,0.14)",
              }}>
                <Box sx={{ width:5, height:5, borderRadius:"50%", background:"#04BFBF" }} />
                <Typography sx={{ color:"#7de0dd", fontSize:"0.73rem", fontWeight:500 }}>{t}</Typography>
              </Box>
            ))}
          </Box>

          {/* ── PAY BUTTON ── */}
          <Box sx={{ maxWidth:420, mx:"auto" }}>
            <Button
              fullWidth
              onClick={handleTopup}
              disabled={loading || !isValid}
              sx={{
                py:1.6, borderRadius:"16px",
                background: loading || !isValid
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg,#F2A007,#e08c00)",
                color: loading || !isValid ? "#555" : "#fff",
                fontWeight:700, fontSize:"1rem",
                textTransform:"none",
                boxShadow: loading || !isValid ? "none" : "0 0 20px rgba(242,160,7,0.30)",
                transition:"all 0.2s",
                "&:hover":{
                  background: loading || !isValid
                    ? "rgba(255,255,255,0.08)"
                    : "linear-gradient(135deg,#e08c00,#cc7a00)",
                },
                "&:active":{ transform:"scale(0.985)" },
              }}
            >
              {loading ? (
                <Box sx={{ display:"flex", alignItems:"center", gap:1.5 }}>
                  <CircularProgress size={18} sx={{ color:"#fff" }} />
                  <span>Redirecting to payment…</span>
                </Box>
              ) : (
                `Pay ₹${payableAmt || "—"} via UPI / Card`
              )}
            </Button>

            <Button
              fullWidth
              onClick={() => navigate(-1)}
              sx={{
                mt:1.2, color:"#7de0dd", textTransform:"none",
                fontSize:"0.85rem", fontWeight:500,
              }}
            >
              Cancel
            </Button>
          </Box>

          {/* ── SECURE BADGE ── */}
          <Box sx={{ display:"flex", justifyContent:"center", mt:2.5, gap:0.8, alignItems:"center" }}>
            <Typography sx={{ fontSize:"0.7rem", color:"#444" }}>🔒</Typography>
            <Typography sx={{ fontSize:"0.72rem", color:"#444" }}>
              Secured by Cashfree Payments
            </Typography>
          </Box>

        </Box>
      </Box>

      {/* ── TOAST ── */}
      {toast.open && (
        <Box sx={{
          position:"fixed", bottom:100, left:"50%",
          transform:"translateX(-50%)",
          zIndex:9999,
          animation:"slideUpFade 0.3s ease",
          width:"calc(100% - 32px)", maxWidth:420,
        }}>
          <Box sx={{
            px:2.2, py:1.6, borderRadius:"18px",
            backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)",
            background: toast.type === "success"
              ? "rgba(14,184,84,0.88)"
              : "rgba(253,70,70,0.75)",
            color:"#fff",
            border: toast.type === "success"
              ? "1px solid rgba(74,222,128,0.45)"
              : "1px solid rgba(252,165,165,0.35)",
            boxShadow: toast.type === "success"
              ? "0 12px 30px rgba(14,184,84,.35)"
              : "0 12px 30px rgba(239,68,68,.28)",
          }}>
            <Typography sx={{ color:"#fff", fontWeight:600, fontSize:"0.92rem", textAlign:"center" }}>
              {toast.message}
            </Typography>
          </Box>
        </Box>
      )}
    </>
  );
}