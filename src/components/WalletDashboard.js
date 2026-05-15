// src/components/WalletDashboard.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Button, CircularProgress,
  Divider, Chip, IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useNavigate } from "react-router-dom";
import FooterNav from "./FooterNav";

const BASE = process.env.REACT_APP_Backend_API_Base_URL;

const typeConfig = {
  topup:  { label: "Top-up",   color: "#04BFBF", sign: "+" },
  credit: { label: "Credit",   color: "#04BFBF", sign: "+" },
  refund: { label: "Refund",   color: "#6daa45", sign: "+" },
  debit:  { label: "Charging", color: "#F2A007", sign: "−" },
};

export default function WalletDashboard() {
  const navigate = useNavigate();
  const [balance, setBalance]     = useState(null);
  const [txns, setTxns]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [topupAmt, setTopupAmt]   = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError]     = useState("");

  const token = localStorage.getItem("token");

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
        setTxns(data.transactions || []);
      }
    } catch (e) {
      console.error("Wallet fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const handleTopup = async () => {
    const amt = Number(topupAmt);
    if (!amt || amt < 10) { setTopupError("Minimum ₹10"); return; }
    setTopupError("");
    setTopupLoading(true);
    try {
      const res = await fetch(`${BASE}/api/wallet/topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (!res.ok || !data.paymentSessionId) {
        setTopupError(data.message || "Failed to initiate top-up");
        setTopupLoading(false);
        return;
      }
      // Open Cashfree checkout for topup
      if (typeof window.Cashfree === "undefined") {
        setTopupError("Payment SDK not loaded. Refresh and try again.");
        setTopupLoading(false);
        return;
      }
      const cashfree = new window.Cashfree({ mode: "production" });
      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        returnUrl: `${window.location.origin}/wallet/topup-success?order_id={order_id}`,
        redirectTarget: "_self",
      });
    } catch (e) {
      setTopupError(e.message || "Top-up failed");
      setTopupLoading(false);
    }
  };

  const QUICK = [100, 200, 500, 1000];

  return (
    <Box sx={{ minHeight: "100vh", background: "#0b1218", pb: 10 }}>

      {/* Header */}
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1.5,
        px: 2, pt: 5, pb: 2,
      }}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: "#04BFBF" }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>
          VIZ Wallet
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
          <CircularProgress sx={{ color: "#04BFBF" }} />
        </Box>
      ) : (
        <>
          {/* Balance Card */}
          <Box sx={{
            mx: 2, mt: 1, p: 3,
            borderRadius: "20px",
            background: "linear-gradient(135deg, #0f4c52 0%, #0b3338 100%)",
            border: "1px solid rgba(4,191,191,0.25)",
            boxShadow: "0 8px 32px rgba(4,191,191,0.08)",
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <AccountBalanceWalletIcon sx={{ color: "#04BFBF", fontSize: 20 }} />
              <Typography sx={{ color: "#7de0dd", fontSize: "0.82rem" }}>
                Available Balance
              </Typography>
            </Box>
            <Typography sx={{
              color: "#fff", fontWeight: 800,
              fontSize: "2.4rem", letterSpacing: "-1px",
            }}>
              ₹{Number(balance).toFixed(2)}
            </Typography>
            <Typography sx={{ color: "#7de0dd", fontSize: "0.75rem", mt: 0.5 }}>
              Instant use · No expiry
            </Typography>
          </Box>

          {/* Top-up Section */}
          <Box sx={{ mx: 2, mt: 2.5, p: 2.5, borderRadius: "16px",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <AddCircleOutlineIcon sx={{ color: "#F2A007", fontSize: 18 }} />
              <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
                Add Money
              </Typography>
            </Box>

            {/* Quick amounts */}
            <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
              {QUICK.map((q) => (
                <Chip
                  key={q}
                  label={`₹${q}`}
                  onClick={() => { setTopupAmt(String(q)); setTopupError(""); }}
                  sx={{
                    background: topupAmt === String(q)
                      ? "rgba(242,160,7,0.18)" : "rgba(255,255,255,0.06)",
                    border: topupAmt === String(q)
                      ? "1px solid #F2A007" : "1px solid rgba(255,255,255,0.1)",
                    color: topupAmt === String(q) ? "#F2A007" : "#ccc",
                    fontWeight: 600, fontSize: "0.82rem",
                    cursor: "pointer",
                    "&:hover": { background: "rgba(242,160,7,0.12)" },
                  }}
                />
              ))}
            </Box>

            {/* Custom amount input */}
            <Box sx={{
              display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "12px",
              border: topupError
                ? "1px solid rgba(255,100,100,0.5)"
                : "1px solid rgba(255,255,255,0.1)",
              px: 2, py: 0.5, mb: 1,
            }}>
              <Typography sx={{ color: "#7de0dd", mr: 1, fontSize: "1rem" }}>₹</Typography>
              <input
                type="number"
                value={topupAmt}
                onChange={(e) => { setTopupAmt(e.target.value); setTopupError(""); }}
                placeholder="Enter amount"
                style={{
                  flex: 1, background: "transparent", border: "none",
                  outline: "none", color: "#fff", fontSize: "1rem",
                  padding: "8px 0",
                }}
              />
            </Box>
            {topupError && (
              <Typography sx={{ color: "#f77", fontSize: "0.75rem", mb: 1, pl: 0.5 }}>
                {topupError}
              </Typography>
            )}

            <Button
              fullWidth
              onClick={handleTopup}
              disabled={topupLoading || !topupAmt}
              sx={{
                mt: 1,
                background: topupLoading || !topupAmt
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(90deg,#F2A007,#e08c00)",
                color: "#fff", fontWeight: 700, fontSize: "0.95rem",
                borderRadius: "12px", py: 1.4,
                textTransform: "none",
                "&:hover": { background: "linear-gradient(90deg,#e08c00,#cc7a00)" },
              }}
            >
              {topupLoading
                ? <CircularProgress size={20} sx={{ color: "#fff" }} />
                : "Proceed to Pay"}
            </Button>
          </Box>

          {/* Transaction History */}
          <Box sx={{ mx: 2, mt: 2.5 }}>
            <Typography sx={{ color: "#7de0dd", fontSize: "0.82rem",
              fontWeight: 600, mb: 1.5, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Transaction History
            </Typography>

            {txns.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 48, color: "#2a3a3a", mb: 1 }} />
                <Typography sx={{ color: "#555", fontSize: "0.9rem" }}>
                  No transactions yet
                </Typography>
                <Typography sx={{ color: "#444", fontSize: "0.78rem", mt: 0.5 }}>
                  Add money to get started
                </Typography>
              </Box>
            ) : (
              txns.map((t, i) => {
                const cfg = typeConfig[t.type] || typeConfig.debit;
                return (
                  <Box key={i}>
                    <Box sx={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between", py: 1.8,
                    }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{
                          width: 38, height: 38, borderRadius: "50%",
                          background: `${cfg.color}18`,
                          border: `1px solid ${cfg.color}33`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Typography sx={{ fontSize: "1rem" }}>
                            {t.type === "topup" || t.type === "credit" ? "↓" :
                             t.type === "refund" ? "↩" : "↑"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: "#fff", fontSize: "0.88rem", fontWeight: 500 }}>
                            {t.description || cfg.label}
                          </Typography>
                          <Typography sx={{ color: "#666", fontSize: "0.73rem", mt: 0.2 }}>
                            {t.createdAt
                              ? new Date(t.createdAt).toLocaleString("en-IN", {
                                  day: "2-digit", month: "short",
                                  hour: "2-digit", minute: "2-digit",
                                })
                              : "—"}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography sx={{
                          fontWeight: 700, fontSize: "0.95rem",
                          color: cfg.color,
                        }}>
                          {cfg.sign}₹{Number(t.amount).toFixed(2)}
                        </Typography>
                        <Typography sx={{ color: "#555", fontSize: "0.7rem", mt: 0.2 }}>
                          Bal ₹{Number(t.balanceAfter).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                    {i < txns.length - 1 && (
                      <Divider sx={{ borderColor: "rgba(255,255,255,0.05)" }} />
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        </>
      )}

      <FooterNav />
    </Box>
  );
}