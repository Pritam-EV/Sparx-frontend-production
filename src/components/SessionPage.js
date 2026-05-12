// src/components/SessionPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Box, CircularProgress } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import FooterNav from "../components/FooterNav";

const fmtMoney    = (n) => `₹${Number(n || 0).toFixed(2)}`;
const fmtKwh      = (n) => `${Number(n || 0).toFixed(2)} kWh`;
const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
const fmtEta = (estimatedEndTime) => {
  if (!estimatedEndTime) return null;
  const eta = new Date(estimatedEndTime);
  const now = new Date();
  const diffMs = eta - now;

  const timeStr = eta.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });

  if (diffMs <= 0) return { timeStr, remaining: 'Any moment' };

  const totalMins = Math.ceil(diffMs / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const remaining = h > 0 ? `${h}h ${m}m` : `${m} min`;
  return { timeStr, remaining };
};


const getAmountUtilized = (s) => Number(s?.amountUsed ?? 0);
const getRefund = (s) => {
  const paid     = Number(s?.amountPaid ?? 0);
  const utilized = getAmountUtilized(s);
  return Number(Math.max(0, paid - utilized).toFixed(2));
};

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const map = {
    active:    { bg: "rgba(4,191,191,0.12)",   color: "#04bfbf",  label: "Active"    },
    completed: { bg: "rgba(73,199,0,0.12)",    color: "#3aa300",  label: "Completed" },
    stopped:   { bg: "rgba(255,145,0,0.13)",   color: "#cc6600",  label: "Stopped"   },
    failed:    { bg: "rgba(204,0,27,0.10)",    color: "#cc001b",  label: "Failed"    },
  };
  const cfg = map[s] || { bg: "rgba(0,0,0,0.06)", color: "#5a7a85", label: status || "—" };
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "999px",
      background: cfg.bg,
      color: cfg.color,
      fontWeight: 700,
      fontSize: "11px",
      letterSpacing: "0.4px",
      fontFamily: "Poppins, sans-serif",
    }}>
      {cfg.label}
    </span>
  );
};

/* ── Shared stat row ── */
const StatRow = ({ label, value }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(4,191,191,0.10)",
    paddingBottom: "7px",
  }}>
    <span style={{ fontSize: "12px", fontWeight: 600, color: "#5a8a90", fontFamily: "Poppins, sans-serif" }}>
      {label}
    </span>
    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0e1e1e", fontFamily: "Poppins, sans-serif" }}>
      {value}
    </span>
  </div>
);

/* ── Active Session Card ── */
const ActiveCard = ({ s, navigate }) => (
  <div style={{
    background: "#ffffff",
    borderRadius: "18px",
    border: "1px solid rgba(4,191,191,0.20)",
    boxShadow: "0 4px 24px rgba(4,191,191,0.13)",
    marginBottom: "14px",
    overflow: "hidden",
    fontFamily: "Poppins, sans-serif",
  }}>
    {/* teal live strip */}
    <div style={{
      height: "4px",
      background: "linear-gradient(90deg, #04bfbf, #029a9a)",
    }} />

    <div style={{ padding: "16px 16px 18px" }}>
      {/* Row 1 */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: "6px",
      }}>
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.6px", color: "#7ab0b5",
          }}>
            Charger ID
          </div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#0e1e1e", marginTop: "2px" }}>
            {s.deviceId || "—"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* LIVE pulse */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#cc001b",
              boxShadow: "0 0 0 3px rgba(204,0,27,0.20)",
              animation: "livePulse 1.6s ease-in-out infinite",
              display: "inline-block",
            }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#cc001b", letterSpacing: "0.4px" }}>
              LIVE
            </span>
          </div>
          <button
            onClick={() => navigate(`/live-session/${s.sessionId}`)}
            style={{
              background: "linear-gradient(90deg, #04bfbf, #029a9a)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "7px 14px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              boxShadow: "0 4px 12px rgba(4,191,191,0.30)",
            }}
          >
            View Live →
          </button>
        </div>
      </div>

      {/* Session ID */}
      <div style={{ fontSize: "11px", color: "#7ab0b5", marginBottom: "14px", fontWeight: 500 }}>
        Session:{" "}
        <span style={{ color: "#04bfbf", fontWeight: 700 }}>{s.sessionId || "—"}</span>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <StatRow label="Amount Paid" value={fmtMoney(s.amountPaid)} />
        <StatRow label="Energy Used" value={fmtKwh(s.energyConsumed)} />
        <StatRow label="Amount Used" value={fmtMoney(getAmountUtilized(s))} />
        <StatRow label="Status"      value={<StatusBadge status={s.status || "Active"} />} />
      </div>

      {/* Est. Refund */}
      {getRefund(s) > 0 && (
        <div style={{
          background: "rgba(255,145,0,0.08)",
          border: "1px solid rgba(255,145,0,0.28)",
          borderRadius: "10px",
          padding: "9px 12px",
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
          <span style={{ fontSize: "14px" }}>💰</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#cc6600" }}>
            Est. refund: {fmtMoney(getRefund(s))}
          </span>
        </div>
      )}

      {/* ── ETA row — sits between refund and time row ── */}
      {s.estimatedEndTime && (() => {
        const eta = fmtEta(s.estimatedEndTime);
        return eta ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(242,160,7,0.07)",
            border: "1px solid rgba(242,160,7,0.22)",
            borderRadius: "10px",
            padding: "9px 12px",
            marginBottom: "10px",
          }}>
            <span style={{
              width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
              background: "#f2a007",
              boxShadow: "0 0 6px rgba(242,160,7,0.7)",
              animation: "etaDot 2s ease-in-out infinite",
              display: "inline-block",
            }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#8a7a55" }}>
              Est. ends by
            </span>
            <span style={{ marginLeft: "auto", fontSize: "13px", fontWeight: 800, color: "#c27f00" }}>
              {eta.timeStr}
              <span style={{ fontWeight: 500, color: "#a08030", fontSize: "11px", marginLeft: "5px" }}>
                ({eta.remaining})
              </span>
            </span>
          </div>
        ) : null;
      })()}

      {/* Time row — started at */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: "rgba(4,191,191,0.05)",
        borderRadius: "10px",
        padding: "9px 12px",
        border: "1px solid rgba(4,191,191,0.14)",
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#04bfbf" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span style={{ fontSize: "12px", color: "#5a8a90", fontWeight: 500 }}>
          Started {fmtDateTime(s.startTime)}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "#04bfbf" }}>
          In progress…
        </span>
      </div>
    </div>
  </div>
);

/* ── Past Session Card ── */
const PastCard = ({ s, navigate }) => (
  <div style={{
    background: "#ffffff",
    borderRadius: "18px",
    border: "1px solid rgba(4,191,191,0.14)",
    boxShadow: "0 2px 16px rgba(4,191,191,0.09)",
    marginBottom: "14px",
    overflow: "hidden",
    fontFamily: "Poppins, sans-serif",
  }}>
    {/* subtle teal strip */}
    <div style={{
      height: "3px",
      background: "linear-gradient(90deg, rgba(4,191,191,0.55), rgba(4,191,191,0.10))",
    }} />

    <div style={{ padding: "16px 16px 18px" }}>
      {/* Row 1 */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: "6px",
      }}>
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.6px", color: "#7ab0b5",
          }}>
            Charger ID
          </div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#0e1e1e", marginTop: "2px" }}>
            {s.deviceId || "—"}
          </div>
        </div>
        <button
          onClick={() => navigate("/session-summary", { state: { sessionId: s.sessionId } })}
          style={{
            background: "rgba(4,191,191,0.09)",
            color: "#04bfbf",
            border: "1.5px solid rgba(4,191,191,0.25)",
            borderRadius: "10px",
            padding: "7px 14px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Details →
        </button>
      </div>

      {/* Session ID */}
      <div style={{ fontSize: "11px", color: "#7ab0b5", marginBottom: "14px", fontWeight: 500 }}>
        Session:{" "}
        <span style={{ color: "#04bfbf", fontWeight: 700 }}>{s.sessionId || "—"}</span>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <StatRow label="Amount Paid" value={fmtMoney(s.amountPaid)} />
        <StatRow label="Energy Used" value={fmtKwh(s.energyConsumed)} />
        <StatRow label="Amount Used" value={fmtMoney(getAmountUtilized(s))} />
        <StatRow label="Status"      value={<StatusBadge status={s.status} />} />
      </div>

      {/* Refund badge */}
      {getRefund(s) > 0 && (
        <div style={{
          background: "rgba(73,199,0,0.08)",
          border: "1px solid rgba(73,199,0,0.25)",
          borderRadius: "10px",
          padding: "9px 12px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
          <span style={{ fontSize: "14px" }}>↩️</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#3aa300" }}>
            Refund: {fmtMoney(getRefund(s))}
          </span>
        </div>
      )}

      {/* Start / End time boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {[
          { label: "Start", value: fmtDateTime(s.startTime) },
          { label: "End",   value: fmtDateTime(s.endTime)   },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "rgba(4,191,191,0.05)",
            borderRadius: "10px",
            padding: "9px 12px",
            border: "1px solid rgba(4,191,191,0.13)",
          }}>
            <div style={{
              fontSize: "10px", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.5px",
              color: "#7ab0b5", marginBottom: "3px",
            }}>
              {label}
            </div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#0e6e75" }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Empty State ── */
const EmptyState = ({ isActive }) => (
  <div style={{
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "48px 24px", textAlign: "center",
  }}>
    <div style={{
      width: "64px", height: "64px", borderRadius: "50%",
      background: "rgba(4,191,191,0.10)",
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: "16px",
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#04bfbf" strokeWidth="1.8">
        {isActive
          ? <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          : <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>
        }
      </svg>
    </div>
    <p style={{ fontSize: "15px", fontWeight: 700, color: "#0e1e1e", margin: "0 0 6px", fontFamily: "Poppins, sans-serif" }}>
      {isActive ? "No active sessions" : "No past sessions"}
    </p>
    <p style={{ fontSize: "13px", color: "#7ab0b5", margin: 0, fontFamily: "Poppins, sans-serif" }}>
      {isActive
        ? "Start charging to see your live session here."
        : "Your completed sessions will appear here."}
    </p>
  </div>
);

/* ══════════════════════════════
   Main Component
══════════════════════════════ */
const SessionPage = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [pastSessions,   setPastSessions]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState("active");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/user-sessions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveSessions(res.data.activeSessions || []);
      setPastSessions(res.data.pastSessions     || []);
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%,100% { box-shadow: 0 0 0 3px rgba(204,0,27,0.18); }
          50%      { box-shadow: 0 0 0 7px rgba(204,0,27,0.05); }
        }
        html, body { height: 100%; overflow: hidden; }
        * { box-sizing: border-box; }
        .session-scroll::-webkit-scrollbar { width: 5px; }
        .session-scroll::-webkit-scrollbar-thumb {
          background: rgba(4,191,191,0.25); border-radius: 999px;
        }
        .session-scroll::-webkit-scrollbar-track { background: transparent; }
        .tab-btn { transition: all 0.18s ease; }
        .tab-btn:active { transform: scale(0.97); }
        .refresh-btn:hover { background: rgba(4,191,191,0.14) !important; }

        .top-bar {
          position: fixed;
          top: 0; left: 0;
          width: 100%;
          height: 42px;
          background-color: #0e1e1e;
          box-shadow: 0 2px 12px rgba(4,191,191,0.28);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1002;
        }
        .top-bar-logo {
          height: 62px;
          filter: drop-shadow(0 0 6px rgba(4,191,191,0.80));
          object-fit: contain;
        }
          @keyframes etaDot {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.25; }
}
      `}</style>

      {/* Top Bar */}
      <div className="top-bar">
        <img src="/logo.png" alt="Sparx Logo" className="top-bar-logo" />
      </div>

      <Box sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#f0fafa",
        fontFamily: "Poppins, system-ui, sans-serif",
        color: "#0e1e1e",
        overflow: "hidden",
      }}>
        <Box
          className="session-scroll"
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: 480,
            mt: "42px",
            px: 2,
            pt: 2.2,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            pb: "110px",
          }}
        >
          {/* ── Page header ── */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: "18px",
          }}>
            <h2 style={{
              margin: 0, fontSize: "22px", fontWeight: 700,
              color: "#0e1e1e", fontFamily: "Poppins, sans-serif",
            }}>
              Sessions
            </h2>
            <button
              className="refresh-btn"
              onClick={fetchSessions}
              style={{
                background: "rgba(4,191,191,0.09)",
                border: "1.5px solid rgba(4,191,191,0.20)",
                borderRadius: "10px",
                width: "36px", height: "36px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                color: "#04bfbf",
                transition: "background 0.18s",
              }}
              title="Refresh"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
          </div>

          {/* ── Tab switcher ── */}
          <div style={{
            display: "flex",
            background: "rgba(4,191,191,0.08)",
            borderRadius: "14px",
            padding: "4px",
            marginBottom: "20px",
            gap: "4px",
            border: "1px solid rgba(4,191,191,0.14)",
          }}>
            {[
              { key: "active", label: "Active", count: activeSessions.length },
              { key: "past",   label: "Past",   count: pastSessions.length   },
            ].map((tab) => {
              const isSel = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className="tab-btn"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: "11px",
                    border: "none",
                    background: isSel
                      ? "linear-gradient(90deg, #04bfbf, #029a9a)"
                      : "transparent",
                    color: isSel ? "#ffffff" : "#5a8a90",
                    fontWeight: isSel ? 700 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                    boxShadow: isSel ? "0 3px 10px rgba(4,191,191,0.30)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.18s",
                  }}
                >
                  {tab.label}
                  {!loading && (
                    <span style={{
                      background: isSel
                        ? "rgba(255,255,255,0.22)"
                        : "rgba(4,191,191,0.12)",
                      color: isSel ? "#ffffff" : "#04bfbf",
                      borderRadius: "999px",
                      padding: "1px 7px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
              <CircularProgress sx={{ color: "#04bfbf" }} />
            </div>
          ) : activeTab === "active" ? (
            activeSessions.length === 0
              ? <EmptyState isActive={true} />
              : activeSessions.map((s) => (
                  <ActiveCard key={s._id || s.sessionId} s={s} navigate={navigate} />
                ))
          ) : (
            pastSessions.length === 0
              ? <EmptyState isActive={false} />
              : pastSessions.map((s) => (
                  <PastCard key={s._id || s.sessionId} s={s} navigate={navigate} />
                ))
          )}
        </Box>
      </Box>

      <FooterNav currentPage={location.pathname} />
    </>
  );
};

export default SessionPage;