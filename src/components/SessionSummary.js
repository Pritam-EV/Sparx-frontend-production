// src/pages/SessionSummary.js
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Button, Typography, TextField  } from "@mui/material";
import StarIcon from '@mui/icons-material/Star';
import "../styles4.css";

const SessionSummary = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const sessionId = state?.sessionId;
  const [session, setSession] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(receipt?.rating || 2);
  const [suggestion, setSuggestion] = useState(receipt?.suggestion || "");
const [feedbackSubmitted, setFeedbackSubmitted] = useState(
  !!receipt?.rating
);


  const API = process.env.REACT_APP_Backend_API_Base_URL;

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        let res = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        setSession(await res.json());

        res = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/receipts/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setReceipt(await res.json());
      } catch {
        setError("Could not load session summary.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (!sessionId) return <Typography>Invalid session.</Typography>;
  if (loading) return <Typography>Loading session summary...</Typography>;
  if (error) return <Typography>{error}</Typography>;

  const endDate = new Date(session.endTime);
  const dateStr = endDate.toLocaleDateString();
  const timeStr = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleRefund = () => {
    if (!receipt) return;
    const msg = encodeURIComponent(
      `ReceiptID: ${receipt.receiptId}\n` +
      `DeviceID: ${receipt.deviceId}\n` +
      `Date: ${dateStr}\n` +
      `Time: ${timeStr}\n` +
      `Amount Paid: ₹${receipt.amountPaid.toFixed(2)}\n` +
      `Amount Utilized: ₹${receipt.amountUtilized.toFixed(2)}\n` +
      `Discount: ₹${receipt.discountApplied.toFixed(2)}\n` +
      `Refund: ₹${receipt.refund.toFixed(2)}`
    );
    window.open(`https://wa.me/919370770190?text=${msg}`, "_blank");
  };



const handleSubmitSuggestion = async () => {
  if (feedbackSubmitted) return;

  try {
    const token = localStorage.getItem("token");

    // 1️⃣ Save rating
    await fetch(`${API}/api/receipts/${sessionId}/rate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating }),
    });

    // 2️⃣ Save suggestion
    if (suggestion?.trim()) {
      await fetch(`${API}/api/receipts/${sessionId}/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ suggestion }),
      });
    }

    setFeedbackSubmitted(true);
    alert("Thank you for your feedback ❤️");
  } catch (err) {
    console.error("Feedback submit failed:", err);
    alert("Failed to submit feedback. Please try again.");
  }
};



const ReceiptRow = ({ label, value, highlight }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      my: 0.8,
      fontWeight: highlight ? 700 : 500,
      color: highlight ? "success.main" : "text.primary",
    }}
  >
    <Typography variant="body2">{label}</Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

const DividerDashed = () => (
  <Box sx={{ borderTop: "1px dashed #ccc", my: 1.5 }} />
);


 return (
  <Box
    sx={{
      minHeight: "100vh",
      background: "#f4f6f8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      pt: 4,
      pb: 6,
    }}
  >
    {/* ================= RECEIPT CARD ================= */}
    <Box
      sx={{
        width: { xs: "92%", sm: 380 },
        background: "#ffffff",
        borderRadius: 2,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: "center", py: 2, borderBottom: "1px dashed #ccc" }}>
        <Typography fontWeight={700} letterSpacing={1}>
          VIZ
        </Typography>
            <Typography fontWeight={500} letterSpacing={1}>
          by VJRA TECHNOLOGIES
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Charging Receipt
        </Typography>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary" align="center" mb={2}>
          {dateStr} · {timeStr}
        </Typography>

        <ReceiptRow label="Receipt ID" value={receipt.receiptId} />
        <ReceiptRow label="Device ID" value={receipt.deviceId} />
        <ReceiptRow label="Energy Used" value={`${receipt.energyConsumed.toFixed(2)} kWh`} />

        <DividerDashed />

        <ReceiptRow label="Amount Paid" value={`₹${receipt.amountPaid.toFixed(2)}`} />
        <ReceiptRow label="Amount Utilized" value={`₹${receipt.amountUtilized.toFixed(2)}`} />

        {receipt.refund > 0 && (
          <ReceiptRow
            label="Refund"
            value={`₹${receipt.refund.toFixed(2)}`}
            highlight
          />
        )}

        <DividerDashed />

        <Typography
          variant="caption"
          align="center"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          Thank you for charging with us 🚗⚡
        </Typography>
      </Box>
    </Box>

    {/* ================= RATING ================= */}
    <Box sx={{ mt: 4, textAlign: "center" }}>
      <Typography fontWeight={600} mb={1}>
        How was your experience?
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon
            key={i}
            onClick={() => {
  if (!feedbackSubmitted) setRating(i);
}}
            sx={{
              cursor: feedbackSubmitted  ? "default" : "pointer",
              fontSize: 34,
              color: i <= rating ? "#F2A007" : "#cfd8dc",
              transition: "transform 0.2s",
              "&:hover": !feedbackSubmitted  && { transform: "scale(1.2)" },
            }}
          />
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary">
        {["Poor", "Fair", "Good", "Very Good", "Excellent"][rating - 1]}
      </Typography>
    </Box>

    {/* ================= SUGGESTION ================= */}
    {rating > 0 && !feedbackSubmitted && (
      <Box sx={{ width: { xs: "92%", sm: 380 }, mt: 3 }}>
        <TextField
          multiline
          rows={2}
          fullWidth
          placeholder="Any suggestions to improve our service?"
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          sx={{ background: "#fff", borderRadius: 1 }}
        />

        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmitSuggestion}
          sx={{
            mt: 1.5,
            backgroundColor: "#04BFBF",
            fontWeight: 600,
          }}
        >
          Submit Feedback
        </Button>
      </Box>
    )}

    {/* ================= ACTIONS ================= */}
    <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
      <Button
        variant="contained"
        onClick={() => navigate("/home")}
        sx={{ backgroundColor: "#04BFBF", px: 4 }}
      >
        Go Home
      </Button>

      {receipt.refund > 0 && (
        <Button
          variant="outlined"
          onClick={handleRefund}
          sx={{ borderColor: "#04BFBF", color: "#04BFBF", px: 4 }}
        >
          Refund
        </Button>
      )}
    </Box>
  </Box>
);

};

export default SessionSummary;
