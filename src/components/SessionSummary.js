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
  const [submitted, setSubmitted] = useState(!!receipt?.rating);

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

  const handleStarClick = async (i) => {
  setRating(i);
  setSubmitted(true);
  // save to backend
  const token = localStorage.getItem('token');
  await fetch(`${API}/api/receipts/${sessionId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({ rating: i })
  });
};
const handleSubmitSuggestion = async () => {
  const token = localStorage.getItem('token');
  await fetch(`${API}/api/receipts/${sessionId}/suggest`, {
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({ suggestion })
  });
  alert('Suggestion saved, thank you!');
};



  return (
    <Box
      sx={{
        fontFamily: "Calibri, sans-serif",
        minHeight: "100vh",
        backgroundColor: "#ccc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 6,
        pb: 8,
            overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: { xs: "90%", sm: 360 },
          maxHeight: { xs: "70vh", sm: "80vh" }, 
          backgroundColor: "#fff",
          position: "relative",
          boxShadow: "0 3px 20px rgba(0,0,0,0.2)",
           overflowY: "auto",  
          mb: 5,
          // Perforation edges via radial-gradient
          backgroundImage: `
            radial-gradient(circle at top center, #ccc 12px, transparent 8px),
            radial-gradient(circle at bottom center,  #ccc 10px, transparent 8px)
          `,
          backgroundRepeat: "repeat-x, repeat-x",
          backgroundSize: "16px 16px, 16px 16px",
          backgroundPosition: "0 0, 0 100%",
        }}
      >
        <Box sx={{ px: 3, py: 6 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              sx={{
                borderTop: "1.5px dashed #000000ff",
                borderBottom: "1.5px dashed #000000ff",
                py: 1,
                fontWeight: 550,
                letterSpacing: 1,
                fontSize: "1.0rem"
              }}
            >
              SPARX ENERGY
            </Typography>
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: "center", mb: 2 }}>
            {dateStr} &nbsp; {timeStr}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}><strong>Receipt ID:</strong> {receipt.receiptId}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}><strong>Device ID:</strong> {receipt.deviceId}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}><strong>Energy Utilized:</strong> {receipt.energyConsumed.toFixed(0)} kWh</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}><strong>Amount Paid:</strong> ₹{receipt.amountPaid.toFixed(1)}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}><strong>Amount Utilized:</strong> ₹{receipt.amountUtilized.toFixed(1)}</Typography>
          {receipt.refund > 0 && (
            <Typography variant="body2" sx={{ mb: 1, color: "success.main" }}><strong>Refund:</strong> ₹{receipt.refund.toFixed(1)}</Typography>
          )}
          <Box sx={{ borderTop: "1px dashed #bbb", pt: 1, mt: 2 }}>
            <Box sx={{ textAlign: "center"}}>
              <Typography variant="caption">  Thanks for charging your EV with us! </Typography>
            </Box>
                        <Box sx={{ textAlign: "center"}}>
              <Typography variant="caption">  Have a nice day. </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
      <Typography sx={{ mb:1 }}>
        Kindly rate your experience
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, gap: 1 }}>

      {[1,2,3,4,5].map((i) => (
        <StarIcon
          key={i}
          onClick={() => handleStarClick(i)}
          sx={{
            cursor: 'pointer',
            fontSize: 32,
            color: i <= rating ? '#F2A007' : '#04bfbf',
            filter: i <= rating ? 'drop-shadow(0 0 7px rgba(242,160,7,0.7))' : 'none'
          }}
        />
      ))}
    </Box>
  {submitted && (
    <Box sx={{ px:7, mb:1 }}>
      <Typography sx={{ mb:1 }}>
        Thanks for rating us... Your suggestion is highly valuable:
      </Typography>
      <TextField
        multiline rows={1}
        fullWidth value={suggestion}
        onChange={(e)=>setSuggestion(e.target.value)}
      />
      <Button variant="contained" onClick={handleSubmitSuggestion} sx={{ mt:1, backgroundColor: "#F2A007", color: "#ffffffff", px: 4 }}>
        Submit
      </Button>
    </Box>
  )}


      <Box sx={{ display: "flex", gap: 2, mt:2  }}>
        <Button variant="contained" onClick={() => navigate("/home")} sx={{ backgroundColor: "#04bfbf", px: 4 }}>
          Go to Home
        </Button>
        {receipt.refund > 0 && (
          <Button variant="outlined" onClick={handleRefund} sx={{ borderColor: "#04bfbf", color: "#04bfbf", px: 4 }}>
            Refund
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default SessionSummary;
