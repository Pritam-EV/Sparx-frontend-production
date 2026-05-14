// src/components/WalletTopupSuccess.js
import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
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
    // Poll backend for 10s to confirm webhook has credited wallet
    let attempts = 0;
    const maxAttempts = 10;

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
          else setStatus("failed"); // timeout
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
    <Box sx={{
      minHeight: "100vh", background: "#0b1218",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      px: 3, textAlign: "center",
    }}>
      {status === "loading" && (
        <>
          <CircularProgress sx={{ color: "#04BFBF", mb: 3 }} size={52} />
          <Typography sx={{ color: "#7de0dd", fontSize: "1rem" }}>
            Confirming your top-up…
          </Typography>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircleOutlineIcon sx={{ color: "#04BFBF", fontSize: 72, mb: 2 }} />
          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.5rem", mb: 0.5 }}>
            Wallet Topped Up!
          </Typography>
          {amount && (
            <Typography sx={{ color: "#04BFBF", fontSize: "2rem", fontWeight: 800, mb: 1 }}>
              +₹{Number(amount).toFixed(2)}
            </Typography>
          )}
          <Typography sx={{ color: "#7de0dd", fontSize: "0.85rem", mb: 4 }}>
            Your wallet balance has been updated.
          </Typography>
          <Button
            onClick={() => navigate("/wallet")}
            sx={{
              background: "linear-gradient(90deg,#04BFBF,#027f7f)",
              color: "#fff", fontWeight: 700, borderRadius: "14px",
              px: 4, py: 1.4, textTransform: "none", fontSize: "0.95rem",
              mb: 1.5,
            }}
          >
            View Wallet
          </Button>
          <Button
            onClick={() => navigate("/home")}
            sx={{ color: "#7de0dd", textTransform: "none", fontSize: "0.85rem" }}
          >
            Go to Home
          </Button>
        </>
      )}

      {status === "failed" && (
        <>
          <ErrorOutlineIcon sx={{ color: "#f77", fontSize: 72, mb: 2 }} />
          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem", mb: 1 }}>
            Top-up Pending
          </Typography>
          <Typography sx={{ color: "#aaa", fontSize: "0.85rem", mb: 4 }}>
            Payment may still be processing. Check your wallet in a few minutes.
          </Typography>
          <Button
            onClick={() => navigate("/wallet")}
            sx={{
              background: "rgba(4,191,191,0.12)",
              color: "#04BFBF", fontWeight: 700, borderRadius: "14px",
              px: 4, py: 1.4, textTransform: "none",
            }}
          >
            Check Wallet
          </Button>
        </>
      )}
    </Box>
  );
}