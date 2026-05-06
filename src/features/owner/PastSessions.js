import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Divider,
  Stack,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import BoltIcon from "@mui/icons-material/Bolt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ScheduleIcon from "@mui/icons-material/Schedule";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const fmtKwh = (n) => `${Number(n || 0).toFixed(2)} kWh`;
const fmtMoney = (n) => `₹${Number(n || 0).toFixed(2)}`;

const CompactInfoRow = ({ icon: Icon, label, value }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Icon sx={{ fontSize: 16, color: "#04BFBF", flexShrink: 0 }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          color: "#64748b",
          fontSize: 9,
          display: "block",
          fontWeight: 600,
          letterSpacing: "0.3px",
          textTransform: "uppercase",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: 13,
          color: "#0f172a",
          mt: 0.2,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </Typography>
    </Box>
  </Box>
);

export default function PastSessions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      setErr(null);
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/owner/past-sessions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load past sessions");

      setRows(data.sessions || []);
      setLastFetchedAt(new Date());
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8fafc, #f1f5f9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Card
          sx={{
            maxWidth: 400,
            width: "100%",
            borderRadius: 3,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            background: "#fff",
            border: "1px solid #e2e8f0",
          }}
        >
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={44} thickness={4} sx={{ color: "#04BFBF", mb: 2.5 }} />
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 18,
                color: "#0f172a",
                mb: 0.5,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Loading Sessions
            </Typography>
            <Typography
              sx={{
                color: "#64748b",
                fontSize: 13,
                fontWeight: 400,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Fetching your charging history...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (err) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8fafc, #f1f5f9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Card
          sx={{
            maxWidth: 400,
            width: "100%",
            borderRadius: 3,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            background: "#fff",
            border: "1px solid #e2e8f0",
          }}
        >
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                bgcolor: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Typography sx={{ fontSize: 28 }}>⚠️</Typography>
            </Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 18,
                color: "#dc2626",
                mb: 0.5,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Error Loading Sessions
            </Typography>
            <Typography
              sx={{
                color: "#64748b",
                fontSize: 13,
                mb: 2.5,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {err}
            </Typography>
            <IconButton
              onClick={fetchRows}
              sx={{
                bgcolor: "#04BFBF",
                color: "#fff",
                width: 44,
                height: 44,
                "&:hover": { bgcolor: "#03a6a6", transform: "scale(1.05)" },
                transition: "all 0.2s",
              }}
            >
              <RefreshIcon />
            </IconButton>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #f8fafc, #f1f5f9)",
        p: { xs: 2, sm: 3, md: 3.5 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: 24, sm: 28 },
              color: "#0f172a",
              mb: 0.3,
              letterSpacing: "-0.5px",
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            Past Sessions
          </Typography>
          <Typography
            sx={{
              color: "#64748b",
              fontSize: 13,
              fontWeight: 400,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            Completed charging sessions for your devices
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <Chip
            label={`${rows.length} Session${rows.length !== 1 ? "s" : ""}`}
            sx={{
              bgcolor: "#04BFBF",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              height: 28,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: "#94a3b8",
              fontSize: 10,
              fontWeight: 500,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {lastFetchedAt ? lastFetchedAt.toLocaleTimeString() : "—"}
          </Typography>
          <Tooltip title="Refresh" arrow>
            <IconButton
              onClick={fetchRows}
              size="small"
              sx={{
                bgcolor: "#04BFBF",
                color: "#fff",
                width: 32,
                height: 32,
                "&:hover": {
                  bgcolor: "#03a6a6",
                  transform: "rotate(180deg)",
                },
                transition: "all 0.4s",
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Empty State */}
      {rows.length === 0 ? (
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            background: "#fff",
            textAlign: "center",
            border: "1px solid #e2e8f0",
          }}
        >
          <CardContent sx={{ py: 6 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "#f0f9ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <BoltIcon sx={{ fontSize: 40, color: "#04BFBF" }} />
            </Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 20,
                color: "#0f172a",
                mb: 1,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              No Past Sessions Yet
            </Typography>
            <Typography
              sx={{
                color: "#64748b",
                fontSize: 14,
                maxWidth: 380,
                mx: "auto",
                lineHeight: 1.5,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Completed charging sessions will appear here
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
              xl: "repeat(4, 1fr)",
            },
            gap: 2.5,
          }}
        >
          {rows.map((s) => (
            <Card
              key={s.sessionId}
              sx={{
                borderRadius: 3,
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                background: "#fff",
                border: "1px solid #e2e8f0",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  boxShadow: "0 12px 32px rgba(4, 191, 191, 0.12)",
                  borderColor: "#04BFBF",
                  transform: "translateY(-4px)",
                },
              }}
            >
              <CardContent sx={{ p: 2 }}>
                {/* Device Header - Compact */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1.5,
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: 17,
                        color: "#04BFBF",
                        mb: 0.2,
                        letterSpacing: "-0.2px",
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.deviceId}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#64748b",
                        fontSize: 11,
                        fontWeight: 500,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.address}
                    </Typography>
                  </Box>

                  <Chip
                    label="✓"
                    size="small"
                    sx={{
                      bgcolor: "#dcfce7",
                      color: "#166534",
                      fontWeight: 800,
                      fontSize: 12,
                      height: 22,
                      minWidth: 22,
                      "& .MuiChip-label": { px: 0.5 },
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  />
                </Box>

                <Divider sx={{ my: 1.5, borderColor: "#e2e8f0" }} />

                {/* Compact Info Grid */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 1.5,
                    mb: 1.5,
                  }}
                >
                  <CompactInfoRow
                    icon={DirectionsCarIcon}
                    label="Vehicle"
                    value={s.vehicleNumber || "—"}
                  />
                  <CompactInfoRow
                    icon={BoltIcon}
                    label="Energy"
                    value={fmtKwh(s.energyUsed)}
                  />
                  <CompactInfoRow
                    icon={AccountBalanceWalletIcon}
                    label="Amount"
                    value={fmtMoney(s.amountUtilized)}
                  />
                  <CompactInfoRow
                    icon={ScheduleIcon}
                    label="Duration"
                    value={
                      s.startTime && s.endTime
                        ? `${Math.round(
                            (new Date(s.endTime) - new Date(s.startTime)) / 60000
                          )} min`
                        : "—"
                    }
                  />
                </Box>

                {/* Compact Timing Section */}
                <Box
                  sx={{
                    bgcolor: "#f8fafc",
                    p: 1.5,
                    borderRadius: 2,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.3px",
                        textTransform: "uppercase",
                        display: "block",
                        mb: 0.3,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      Start
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: 11,
                        color: "#0f172a",
                        lineHeight: 1.3,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {fmtDateTime(s.startTime)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.3px",
                        textTransform: "uppercase",
                        display: "block",
                        mb: 0.3,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      End
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: 11,
                        color: "#0f172a",
                        lineHeight: 1.3,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {fmtDateTime(s.endTime)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
