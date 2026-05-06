// src/pages/SessionSummary.js
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Button, Typography, TextField, Card, CardContent, CircularProgress } from "@mui/material";
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
  const contentWidth = { xs: "94%", sm: 380 };


  const formatMoney = (v) => `₹${Number(v || 0).toFixed(2)}`;
  const formatDateTime = (d) =>
    new Date(d).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });




  const API = process.env.REACT_APP_Backend_API_Base_URL;


  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        let res = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        setSession(await res.json());


        const fetchReceiptWithRetry = async () => {
          const token = localStorage.getItem("token");
          for (let i = 0; i < 6; i++) { // ~6 seconds max
            const r = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/receipts/${sessionId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (r.ok) return await r.json();
            await new Promise(res => setTimeout(res, 1000));
          }
          return null;
        };


        const rec = await fetchReceiptWithRetry();
        if (rec) setReceipt(rec);


      } catch {
        setError("Could not load session summary.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);


  if (!sessionId) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0b0e13, #111a21)",
          px: 2,
        }}
      >
        <Card sx={{ width: "100%", maxWidth: 420, borderRadius: 3, background: "#0f1722", color: "#EAF2FF" }}>
          <CardContent>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>Invalid session</Typography>
            <Typography sx={{ mt: 1, opacity: 0.8 }}>
              Session ID was not provided. Please go back and try again.
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2, backgroundColor: "#04BFBF", color: "#061018", fontWeight: 800 }}
              onClick={() => navigate("/home")}
              fullWidth
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }


  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0b0e13, #111a21)",
          px: 2,
        }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 3,
            background: "linear-gradient(180deg, #0B1220 0%, #060A12 100%)",
            color: "#EAF2FF",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={28} sx={{ color: "#04BFBF" }} />
              <Box>
                <Typography sx={{ fontWeight: 800 }}>Loading session summary</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }


  if (error) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0b0e13, #111a21)",
          px: 2,
        }}
      >
        <Card sx={{ width: "100%", maxWidth: 420, borderRadius: 3, background: "#0f1722", color: "#EAF2FF" }}>
          <CardContent>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#ff9a9a" }}>Could not load</Typography>
            <Typography sx={{ mt: 1, opacity: 0.85 }}>{error}</Typography>

            <Button
              variant="contained"
              sx={{ mt: 2, backgroundColor: "#04BFBF", color: "#061018", fontWeight: 800 }}
              onClick={() => window.location.reload()}
              fullWidth
            >
              Retry
            </Button>

            <Button
              variant="text"
              sx={{ mt: 1, color: "rgba(234,242,255,0.8)" }}
              onClick={() => navigate("/home")}
              fullWidth
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }



  const endDate = new Date(session.endTime);
  const dateStr = endDate.toLocaleDateString();
  const timeStr = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });


  if (!receipt) {
    return (
      <Box className="receipt-page">
        <Typography variant="h6" sx={{ color: "#fff" }}>
          Generating receipt...
        </Typography>
        <CircularProgress />
      </Box>
    );
  }



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
      `Refund: ₹${receipt.refundAmount.toFixed(2)}`  // ✅ FIXED LINE 223
    );
    window.open(`https://wa.me/918855094432?text=${msg}`, "_blank");
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
      background:
        "radial-gradient(circle at top, rgba(4,191,191,0.10), transparent 35%), linear-gradient(145deg, #0b0e13, #111a21)",
      
      mx: "auto",
     
      px: 2,
      pt: 3,
      pb: 12,
      boxSizing: "border-box",
      
      overflowX: "hidden",
      minWidth: 0,
    }}
  >
      {!sessionId ? (
        <Card
          sx={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 3,
            background: "linear-gradient(180deg, #121b22 0%, #0f161d 100%)",
            color: "#EAF2FF",
            border: "1px solid rgba(4,191,191,0.12)",
            boxShadow: "0 14px 36px rgba(0,0,0,0.28)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#fff" }}>
              Invalid session
            </Typography>
            <Typography sx={{ mt: 1, color: "#b7c7d1" }}>
              Session ID was not provided. Please go back and try again.
            </Typography>
            <Button
              variant="contained"
              sx={{
                mt: 2,
                backgroundColor: "#04BFBF",
                color: "#061018",
                fontWeight: 800,
                textTransform: "none",
                borderRadius: "999px",
                py: 1.1,
              }}
              onClick={() => navigate("/home")}
              fullWidth
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card
          sx={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 3,
            background: "linear-gradient(180deg, #121b22 0%, #0f161d 100%)",
            color: "#EAF2FF",
            border: "1px solid rgba(4,191,191,0.12)",
            boxShadow: "0 14px 36px rgba(0,0,0,0.28)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={28} sx={{ color: "#04BFBF" }} />
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#fff" }}>
                  Loading session summary
                </Typography>
                <Typography sx={{ color: "#b7c7d1", fontSize: "0.9rem" }}>
                  Preparing your bill receipt...
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : error ? (
        <Card
          sx={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 3,
            background: "linear-gradient(180deg, #121b22 0%, #0f161d 100%)",
            color: "#EAF2FF",
            border: "1px solid rgba(255, 154, 154, 0.18)",
            boxShadow: "0 14px 36px rgba(0,0,0,0.28)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#ff9a9a" }}>
              Could not load
            </Typography>
            <Typography sx={{ mt: 1, color: "#b7c7d1" }}>{error}</Typography>

            <Button
              variant="contained"
              sx={{
                mt: 2,
                backgroundColor: "#04BFBF",
                color: "#061018",
                fontWeight: 800,
                textTransform: "none",
                borderRadius: "999px",
                py: 1.1,
              }}
              onClick={() => window.location.reload()}
              fullWidth
            >
              Retry
            </Button>

            <Button
              variant="text"
              sx={{
                mt: 1,
                color: "rgba(234,242,255,0.8)",
                textTransform: "none",
              }}
              onClick={() => navigate("/home")}
              fullWidth
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Box
            sx={{
              width: "100%",
              maxWidth: 420,
              mx: "auto",
              background: "linear-gradient(180deg, #121b22 0%, #0f161d 100%)",
              borderRadius: 3,
              border: "1px solid rgba(4,191,191,0.12)",
              boxShadow: "0 14px 36px rgba(0,0,0,0.28)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background:
                  "linear-gradient(180deg, rgba(4,191,191,0.08), rgba(4,191,191,0.02))",
              }}
            >
              <Typography
                sx={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  textAlign: "center",
                  letterSpacing: "0.02em",
                }}
              >
                VIZ - Smart Charging
              </Typography>
              <Typography
                sx={{
                  color: "#9fb3bf",
                  fontSize: "0.82rem",
                  textAlign: "center",
                  mt: 0.3,
                }}
              >
                by Vjra Technologies LLP
              </Typography>
            </Box>

            <Box sx={{ px: 2.5, py: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ color: "#9fb3bf", fontSize: "0.88rem" }}>Date</Typography>
                  <Typography sx={{ color: "#fff", fontSize: "0.88rem", textAlign: "right" }}>
                    {formatDateTime(receipt.createdAt)}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ color: "#9fb3bf", fontSize: "0.88rem" }}>Receipt ID</Typography>
                  <Typography sx={{ color: "#fff", fontSize: "0.88rem", textAlign: "right", wordBreak: "break-word" }}>
                    {receipt.receiptId}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ color: "#9fb3bf", fontSize: "0.88rem" }}>Device ID</Typography>
                  <Typography sx={{ color: "#fff", fontSize: "0.88rem", textAlign: "right", wordBreak: "break-word" }}>
                    {receipt.deviceId}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ color: "#9fb3bf", fontSize: "0.88rem" }}>Rate (incl GST)</Typography>
                  <Typography sx={{ color: "#04BFBF", fontSize: "0.88rem", fontWeight: 700 }}>
                    {formatMoney(receipt.userRateInclGST)}/kWh
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ borderTop: "1px dashed rgba(255,255,255,0.16)", my: 1.5 }} />

              <Box sx={{ display: "grid", gap: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ color: "#9fb3bf", fontSize: "0.88rem" }}>Energy Used</Typography>
                  <Typography sx={{ color: "#fff", fontSize: "0.88rem", fontWeight: 600 }}>
                    {receipt.energyConsumed.toFixed(2)} kWh
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ color: "#9fb3bf", fontSize: "0.88rem" }}>Base Amount</Typography>
                  <Typography sx={{ color: "#fff", fontSize: "0.88rem" }}>
                    {formatMoney(receipt.taxableAmount)}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ color: "#9fb3bf", fontSize: "0.88rem" }}>GST (18%)</Typography>
                  <Typography sx={{ color: "#fff", fontSize: "0.88rem" }}>
                    {formatMoney(receipt.gstAmount)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ borderTop: "1px dashed rgba(255,255,255,0.16)", my: 1.5 }} />

              <Box
                sx={{
                  background: "rgba(4,191,191,0.06)",
                  border: "1px solid rgba(4,191,191,0.10)",
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mb: 0.8 }}>
                  <Typography sx={{ color: "#d7eef0", fontSize: "0.9rem", fontWeight: 700 }}>
                    Total
                  </Typography>
                  <Typography sx={{ color: "#fff", fontSize: "0.9rem", fontWeight: 800 }}>
                    {formatMoney(receipt.totalAmount)}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ color: "#d7eef0", fontSize: "0.9rem", fontWeight: 700 }}>
                    Paid
                  </Typography>
                  <Typography sx={{ color: "#fff", fontSize: "0.9rem", fontWeight: 800 }}>
                    {formatMoney(receipt.amountPaid)}
                  </Typography>
                </Box>

                {receipt.refundAmount > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mt: 0.8 }}>
                    <Typography sx={{ color: "#ffb2b2", fontSize: "0.9rem", fontWeight: 700 }}>
                      Refund
                    </Typography>
                    <Typography sx={{ color: "#ffb2b2", fontSize: "0.9rem", fontWeight: 800 }}>
                      -{formatMoney(receipt.refundAmount)}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Typography
                sx={{
                  mt: 1.8,
                  color: "#7f97a4",
                  fontSize: "0.78rem",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                This is a charging receipt, not a tax invoice.
                <br />
                Thank you for charging with us.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              width: "100%",
              maxWidth: 420,
              mt: 3,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: "0.8rem", color: "#b7c7d1", mb: 1 }}>
              How was your charging experience?
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon
                  key={i}
                  onClick={() => {
                    if (!feedbackSubmitted) setRating(i);
                  }}
                  sx={{
                    cursor: feedbackSubmitted ? "default" : "pointer",
                    fontSize: 28,
                    color: i <= rating ? "#F2A007" : "#3a4954",
                    transition: "transform 0.2s ease, color 0.2s ease",
                    "&:hover": !feedbackSubmitted && { transform: "scale(1.12)" },
                  }}
                />
              ))}
            </Box>

            <Typography sx={{ mt: 0.5, color: "#9fb3bf", fontSize: "0.78rem" }}>
              {["Poor", "Fair", "Good", "Very Good", "Excellent"][rating - 1]}
            </Typography>
          </Box>

          {rating > 0 && !feedbackSubmitted && (
            <Box
              sx={{
                width: "100%",
                maxWidth: 420,
                mt: 2,
                p: 2,
                borderRadius: 3,
                background: "#0f1722",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
              }}
            >
              <TextField
                rows={3}
                fullWidth
                multiline
                placeholder="Any suggestions to improve our service?"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                sx={{
                  background: "#101922",
                  borderRadius: 1.5,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    color: "#EAF2FF",
                  },
                  "& .MuiInputBase-input::placeholder": {
                    fontSize: "0.85rem",
                    opacity: 0.65,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.10)",
                  },
                }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleSubmitSuggestion}
                sx={{
                  mt: 1.5,
                  mb: 3,
                  backgroundColor: "#04BFBF",
                  color: "#061018",
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: "999px",
                  py: 1.1,
                  "&:hover": {
                    backgroundColor: "#03adad",
                  },
                }}
              >
                Submit Feedback
              </Button>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              gap: 1.2,
              mt: 2.5,
              mb: 2,
              flexWrap: "wrap",
              justifyContent: "center",
              width: "100%",
              maxWidth: 420,
            }}
          >
            <Button
              variant="contained"
              onClick={() => navigate("/home")}
              sx={{
                backgroundColor: "#04BFBF",
                color: "#061018",
                px: 4,
                borderRadius: "999px",
                textTransform: "none",
                fontWeight: 800,
                minWidth: 120,
              }}
            >
              Home
            </Button>

            {receipt.refundAmount > 0 && (
              <Button
                variant="outlined"
                onClick={handleRefund}
                sx={{
                  borderColor: "rgba(4,191,191,0.5)",
                  color: "#04BFBF",
                  px: 4,
                  borderRadius: "999px",
                  textTransform: "none",
                  fontWeight: 800,
                  minWidth: 120,
                  "&:hover": {
                    borderColor: "#04BFBF",
                    backgroundColor: "rgba(4,191,191,0.06)",
                  },
                }}
              >
                Refund
              </Button>
            )}
          </Box>
        </>
      )}
    </Box>
);


};


export default SessionSummary;
