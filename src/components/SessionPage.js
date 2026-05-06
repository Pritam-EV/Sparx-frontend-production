// src/components/SessionPage.js
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";

const SessionPage = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  useEffect(() => {
    fetchSessions();
  }, []); // only once on mount

  const fetchSessions = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("🔒 No auth token – redirecting to login");
      return navigate("/login");
    }

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/user-sessions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // backend returns { activeSessions: [...], pastSessions: [...] }
      setActiveSessions(res.data.activeSessions || []);
      setPastSessions(res.data.pastSessions || []);
    } catch (err) {
      console.error(
        "❌ Error fetching sessions:",
        err.response?.status,
        err.response?.data || err.message
      );
      // if unauthorized, kick to login
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
      .top-bar {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 40px;
        background-color: #001f26; /* dark blue */
        box-shadow: 0 2px 12px #04BFBF; /* light neon blue shadow */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1002;
      }

      .top-bar-logo {
        height: 65px;
        filter: drop-shadow(0 0 6px #04BFBF);
      }
      `}</style>
    <div className="top-bar">
      <img src="/logo.png" alt="Sparx Logo" className="top-bar-logo" />
    </div>
      {/* Top Bar */}

      {/* Page Layout */}
      <Box
        sx={{
          pt: "60px", // space for top bar
          pb: "60px", // space for bottom nav
          height: "100vh", // full viewport
          display: "flex",
          flexDirection: "column",
          bgcolor: "#ffffff",
          color: "#011F26",
        }}
        >
        {/* Scrollable Content */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ position: "relative", mb: 2 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                color: "#011F26",
                mb: 1,
                textAlign: "center",
              }}
            >
              Charging Sessions
            </Typography>

            <IconButton
              onClick={fetchSessions}
              sx={{
                position: "absolute",
                right: 0,
                top: 0,
                color: "#04BFBF",
                "&:hover": { color: "#011F26" },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
              <CircularProgress sx={{ color: "#04BFBF" }} />
            </Box>
          ) : (
            <>
              {/* Active Sessions Accordion */}
              <Accordion defaultExpanded sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#011F26" }} />}>
                  <Typography variant="h6" sx={{ color: "#011F26" }}>
                    Active Sessions
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {activeSessions.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#9bcdd2" }}>
                      No active sessions found.
                    </Typography>
                  ) : (
                    activeSessions.map((s) => (
                      <Card
key={s._id || s.sessionId}
  sx={{
    mb: 2,
    borderRadius: 3,
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
    background: "linear-gradient(180deg, #0B1220 0%, #060A12 100%)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#EAF2FF",
  }}
>
  <CardContent>
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontWeight: 800, color: "#EAF2FF" }}>
        ChargerId: {s.deviceId || "—"}
      </Typography>

      <Button
        size="small"
        variant="contained"
          sx={{
            backgroundColor: "#04BFBF",
            color: "#061018",
            fontWeight: 800,
            "&:hover": { backgroundColor: "#02a7a7" },
          }}
        onClick={() => navigate(`/live-session/${s.sessionId}`)}
      >
        VIEW LIVE
      </Button>
    </Box>

    <Typography variant="body2" sx={{ mt: 0.5, color: "rgba(234,242,255,0.80)" }}>
      Session ID: {s.sessionId || "—"}
    </Typography>

    <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2 }}>
      <Box>
        <Typography variant="caption" sx={{ color: "rgba(234,242,255,0.65)" }}>
          Amount Paid
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{fmtMoney(s.amountPaid)}</Typography>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Energy Utilized
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{fmtKwh(s.energyConsumed)}</Typography>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Amount Utilized
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{fmtMoney(getAmountUtilized(s))}</Typography>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Status
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>
          {s.status || "Active"}
        </Typography>
      </Box>
    </Box>

    {getRefund(s) > 0 && (
      <Box
        sx={{
          mt: 2,
          p: 1.2,
          borderRadius: 2,
          background: "rgba(255,193,7,0.10)",
          border: "1px solid rgba(255,193,7,0.35)",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 800, color: "#a26b00" }}>
          Estimated refund so far: {fmtMoney(getRefund(s))}
        </Typography>
      </Box>
    )}

    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Start: {fmtDateTime(s.startTime)}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        End: In progress
      </Typography>
    </Box>
  </CardContent>
</Card>

                    ))
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Past Sessions Accordion */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#011F26" }} />}>
                  <Typography variant="h6" sx={{ color: "#011F26" }}>
                    Past Sessions
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {pastSessions.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#9bcdd2" }}>
                      No past sessions found.
                    </Typography>
                  ) : (
                    pastSessions.map((s) => (
                      
<Card
  key={s._id || s.sessionId}
  sx={{
    mb: 2,
    borderRadius: 3,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  }}
>
  <CardContent>
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontWeight: 800, color: "#04BFBF" }}>
        ChargerId: {s.deviceId || "—"}
      </Typography>

      <Button
        size="small"
        variant="outlined"
        onClick={() => navigate("/session-summary", { state: { sessionId: s.sessionId } })}
      >
        View
      </Button>
    </Box>

    <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
      Session ID: {s.sessionId || "—"}
    </Typography>

    <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2 }}>
      <Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Amount Paid
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{fmtMoney(s.amountPaid)}</Typography>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Energy Utilized
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{fmtKwh(s.energyConsumed)}</Typography>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Amount Utilized
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{fmtMoney(getAmountUtilized(s))}</Typography>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Status
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{s.status || "—"}</Typography>
      </Box>
    </Box>

    {getRefund(s) > 0 && (
      <Box
        sx={{
          mt: 2,
          p: 1.2,
          borderRadius: 2,
          background: "rgba(4,191,191,0.10)",
          border: "1px solid rgba(4,191,191,0.25)",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 800, color: "#037a7a" }}>
          Refund: {fmtMoney(getRefund(s))}
        </Typography>
      </Box>
    )}

    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Start: {fmtDateTime(s.startTime)}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        End: {fmtDateTime(s.endTime)}
      </Typography>
    </Box>
  </CardContent>
</Card>

                    ))
                    
                  )}
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </Box>

        {/* Bottom Bar */}
        <FooterNav />
      </Box>
    </>
  );
};
const fmtMoney = (n) => `₹${Number(n || 0).toFixed(2)}`;
const fmtKwh = (n) => `${Number(n || 0).toFixed(2)} kWh`;

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString(); // shows date + time
};
const getAmountUtilized = (s) => Number(s?.amountUsed ?? 0);
const getRefund = (s) => {
  const paid = Number(s?.amountPaid ?? 0);
  const utilized = getAmountUtilized(s);
  return Number(Math.max(0, paid - utilized).toFixed(2));
};

const SessionCard = ({ session, isActive, navigate }) => (
  
  <Card
    sx={{
      background: "linear-gradient(to right, rgb(9, 36, 63), #243745)",
      borderRadius: "16px",
      mb: 2,
      boxShadow: "0 0 10px rgba(151, 241, 241, 0.2)",
    }}
  >
    <CardContent>
      <Typography variant="body2" sx={{ color: "#9bcdd2" }}>Device ID: {session.deviceId}</Typography>
      <Typography variant="body2" sx={{ color: "#9bcdd2" }}>Session ID: {session.sessionId}</Typography>
      <Typography variant="body2" sx={{ color: "#9bcdd2" }}>Transaction: {session.transactionId}</Typography>
      <Typography variant="body2" sx={{ color: "#9bcdd2" }}>Start: {new Date(session.startTime).toLocaleString()}</Typography>

      {isActive ? (
        <> 
          <Typography variant="body2" sx={{ color: "#04BFBF" }}>LIVE</Typography>
          <Button
            variant="contained"
            onClick={() =>
              
              navigate(`/live-session/${session.sessionId}`, {
                state: {
                  deviceId: session.deviceId,
                  amountPaid: session.amountPaid,
                  energySelected: session.energySelected,
                  transactionId: session.transactionId,
                },
              })
            }
            sx={{
              mt: 1,
              backgroundColor: "#F2A007",
              color: "#fff",
              borderRadius: "30px",
              fontSize: "0.8rem",
              "&:hover": { backgroundColor: "#f4af2d" },
            }}
          >
            View Live
          </Button>
        </>
      ) : (
        <>
          <Typography variant="body2" sx={{ color: "#9bcdd2" }}>
            End: {session.endTime ? new Date(session.endTime).toLocaleString() : "N/A"}
          </Typography>
          <Typography variant="body2" sx={{ color: "#9bcdd2" }}>
            Energy: {session.energyConsumed?.toFixed(2)} kWh | ₹{session.amountUsed?.toFixed(2)}
          </Typography>
        </>
      )}
    </CardContent>
  </Card>
);

const accordionStyle = {
  background: "transparent",
  borderRadius: "10px",
  mb: 2,
  boxShadow: "0 0 10px rgba(4, 191, 191, 0.1)",
};

export default SessionPage;
