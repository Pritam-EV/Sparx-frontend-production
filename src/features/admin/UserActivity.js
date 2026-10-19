// src/features/admin/UserActivity.js
// Focused, high-contrast User Activity, Journey & Location Dashboard

import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Stack,
  Drawer,
  IconButton,
  Tooltip,
  CircularProgress,
  Collapse,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  InputAdornment,
  TextField,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  Refresh,
  Close,
  PeopleAlt,
  LocationOn,
  Timeline,
  Search,
  ExpandMore,
  ExpandLess,
  AccessTime,
  OpenInNew,
  Autorenew,
  Navigation,
  ChevronRight,
  MapOutlined,
  QueryStats,
} from "@mui/icons-material";
import { apiFetch } from "../../utils/apiFetch";

// ─── Constants & Formatters ──────────────────────────────────────────────────
const ACCENT = "#1d4ed8"; // High-contrast vivid blue
const GREEN = "#15803d";
const AMBER = "#b45309";
const LIVE_REFRESH_MS = 15000;

const COLOR_PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
];

const PAGE_LABELS = {
  "/home": "Home",
  "/profile": "Profile",
  "/sessions": "Sessions",
  "/transactions": "Transactions",
  "/wallet/topup": "Wallet Top-up",
  "/qr-scanner": "QR Scanner",
  "/session-summary": "Session Summary",
  "/welcome": "Welcome",
  "/login": "Login",
};

function friendlyPage(path) {
  if (!path) return "Unknown Screen";
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  if (path.startsWith("/charging-options/")) return "Charging Options";
  if (path.startsWith("/live-session/")) return "Live Charging Session";
  if (path.startsWith("/session-start/")) return "Session Start";
  if (path.startsWith("/owner/")) return `Owner · ${path.split("/owner/")[1]}`;
  if (path.startsWith("/admin/")) return `Admin · ${path.split("/admin/")[1]}`;
  return path;
}

function fmtTime(totalSeconds) {
  const sec = Number(totalSeconds || 0);
  if (!Number.isFinite(sec) || sec < 1) return "< 1s";
  if (sec < 60) return `${Math.round(sec)}s`;
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  if (minutes < 60) return `${minutes}m ${seconds ? `${seconds}s` : ""}`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function fmtDt(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  const timestamp = new Date(lastSeen).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp < 5 * 60 * 1000;
}

function hasCoordinates(location) {
  return (
    location &&
    Number.isFinite(Number(location.lat)) &&
    Number.isFinite(Number(location.lng))
  );
}

function mapUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

// ─── Status Badge Component ──────────────────────────────────────────────────
function HighContrastStatus({ online }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.8,
        px: 1.5,
        py: 0.5,
        borderRadius: "20px",
        fontSize: 13,
        fontWeight: 700,
        background: online ? "#dcfce7" : "#f1f5f9",
        color: online ? "#14532d" : "#475569",
        border: online ? "1px solid #86efac" : "1px solid #cbd5e1",
      }}
    >
      <Box
        sx={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: online ? "#16a34a" : "#64748b",
          boxShadow: online ? "0 0 0 3px rgba(22, 163, 74, 0.3)" : "none",
        }}
      />
      {online ? "Active Now" : "Offline"}
    </Box>
  );
}

// ─── Visual Distribution Bar ─────────────────────────────────────────────────
function ScreenDistributionBar({ pages }) {
  const aggregated = useMemo(() => {
    if (!pages || pages.length === 0) return [];
    const map = {};
    let totalSec = 0;
    pages.forEach((p) => {
      const name = friendlyPage(p.page);
      const sec = Number(p.timeSpentSec || 1);
      map[name] = (map[name] || 0) + sec;
      totalSec += sec;
    });

    return Object.entries(map)
      .map(([name, time], idx) => ({
        name,
        time,
        pct: Math.round((time / (totalSec || 1)) * 100),
        color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
  }, [pages]);

  if (aggregated.length === 0) return null;

  return (
    <Box sx={{ background: "#fff", p: 2, borderRadius: "12px", border: "1px solid #cbd5e1", mb: 2.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <QueryStats sx={{ fontSize: 18, color: ACCENT }} />
        <Typography fontSize={13} fontWeight={700} color="#0f172a" textTransform="uppercase">
          Screen Time Breakdown
        </Typography>
      </Stack>

      {/* Stacked bar */}
      <Box sx={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", mb: 1.5, background: "#f1f5f9" }}>
        {aggregated.map((item, idx) => (
          <Box
            key={idx}
            sx={{
              width: `${item.pct}%`,
              background: item.color,
              transition: "width 0.4s ease",
            }}
          />
        ))}
      </Box>

      {/* Legend */}
      <Stack direction="row" flexWrap="wrap" gap={1.2}>
        {aggregated.map((item, idx) => (
          <Box key={idx} sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
            <Typography fontSize={12} fontWeight={600} color="#334155">
              {item.name} ({item.pct}%)
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Modern User Journey Drawer ──────────────────────────────────────────────
function UserJourneyDrawer({ user, journeyData, loadingJourney, errorJourney, onClose }) {
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    if (journeyData.length > 0) {
      setExpandedDay(journeyData[0].date || "day-0");
    }
  }, [journeyData]);

  const allPages = useMemo(() => {
    return journeyData.flatMap((d) => (Array.isArray(d.pages) ? d.pages : []));
  }, [journeyData]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", background: "#f1f5f9" }}>
      {/* Sticky High-Contrast Drawer Header */}
      <Box
        sx={{
          p: 2.5,
          background: "#0f172a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "2px solid #1e293b",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography fontSize={18} fontWeight={800} color="#f8fafc">
              {user?.name || "Unnamed User"}
            </Typography>
            <HighContrastStatus online={isOnline(user?.lastSeen)} />
          </Stack>
          <Typography fontSize={13} color="#94a3b8" fontFamily="monospace">
            {user?.mobile || user?.email || user?._id}
          </Typography>
        </Stack>

        <IconButton
          onClick={onClose}
          aria-label="Close sidebar"
          sx={{
            background: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #334155",
            "&:hover": { background: "#ef4444", color: "#fff", borderColor: "#dc2626" },
          }}
        >
          <Close fontSize="medium" />
        </IconButton>
      </Box>

      {/* Quick Summary Metric Strip */}
      <Box sx={{ px: 3, py: 2, background: "#fff", borderBottom: "1px solid #cbd5e1" }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography fontSize={12} fontWeight={700} color="#64748b" textTransform="uppercase">
              Screens
            </Typography>
            <Typography fontSize={18} fontWeight={800} color="#0f172a">
              {user?.totalPages || 0}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography fontSize={12} fontWeight={700} color="#64748b" textTransform="uppercase">
              Tracked Time
            </Typography>
            <Typography fontSize={18} fontWeight={800} color={ACCENT}>
              {fmtTime(user?.totalTimeSec)}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography fontSize={12} fontWeight={700} color="#64748b" textTransform="uppercase">
              Last Observed
            </Typography>
            <Typography fontSize={13} fontWeight={700} color="#0f172a">
              {fmtDt(user?.lastSeen)}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Drawer Body */}
      <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, sm: 3 } }}>
        {/* Visualization Component */}
        <ScreenDistributionBar pages={allPages} />

        <Typography fontSize={13} fontWeight={800} color="#334155" textTransform="uppercase" letterSpacing={0.5} mb={1.5}>
          Timeline Logs ({journeyData.length} active sessions)
        </Typography>

        {loadingJourney ? (
          <Box py={8} textAlign="center">
            <CircularProgress size={32} sx={{ color: ACCENT }} />
          </Box>
        ) : errorJourney ? (
          <Box p={2.5} sx={{ background: "#fee2e2", borderRadius: 2, border: "1px solid #fca5a5" }}>
            <Typography color="#991b1b" fontSize={14} fontWeight={600}>{errorJourney}</Typography>
          </Box>
        ) : journeyData.length === 0 ? (
          <Box py={8} textAlign="center">
            <Typography color="#64748b" fontSize={14} fontWeight={500}>No user navigation steps found.</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {journeyData.map((day, dIdx) => {
              const dayKey = day.date || `day-${dIdx}`;
              const dayPages = Array.isArray(day.pages) ? day.pages : [];
              const isExpanded = expandedDay === dayKey;
              const totalDaySec = dayPages.reduce((sum, p) => sum + Number(p.timeSpentSec || 0), 0);

              return (
                <Box
                  key={dayKey}
                  sx={{
                    background: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Day Accordion Header */}
                  <Box
                    onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      background: isExpanded ? "#f8fafc" : "#fff",
                      borderBottom: isExpanded ? "1px solid #e2e8f0" : "none",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography fontSize={15} fontWeight={800} color="#0f172a">
                        {day.date || "Today"}
                      </Typography>
                      <Chip
                        label={`${dayPages.length} routes`}
                        size="small"
                        sx={{ fontSize: 11, fontWeight: 700, background: "#e2e8f0", color: "#1e293b" }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontSize={13} fontWeight={700} color={AMBER}>
                        {fmtTime(totalDaySec)}
                      </Typography>
                      {isExpanded ? <ExpandLess sx={{ color: "#334155" }} /> : <ExpandMore sx={{ color: "#334155" }} />}
                    </Stack>
                  </Box>

                  {/* Day Steps */}
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2, background: "#fff" }}>
                      <Stack spacing={2}>
                        {dayPages.map((step, sIdx) => {
                          const validLoc = hasCoordinates(step.location);
                          return (
                            <Box
                              key={sIdx}
                              sx={{
                                position: "relative",
                                pl: 3,
                                "&:before": {
                                  content: '""',
                                  position: "absolute",
                                  left: 6,
                                  top: 10,
                                  bottom: sIdx === dayPages.length - 1 ? 10 : -22,
                                  width: 2,
                                  background: "#cbd5e1",
                                },
                                "&:after": {
                                  content: '""',
                                  position: "absolute",
                                  left: 2,
                                  top: 10,
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  background: ACCENT,
                                  boxShadow: "0 0 0 2px #fff",
                                },
                              }}
                            >
                              <Box sx={{ background: "#f8fafc", p: 1.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography fontSize={14} fontWeight={800} color="#0f172a">
                                    {friendlyPage(step.page)}
                                  </Typography>
                                  <Typography
                                    fontSize={12}
                                    fontWeight={700}
                                    sx={{ background: "#fef3c7", color: "#92400e", px: 1, py: 0.2, borderRadius: 1 }}
                                  >
                                    {fmtTime(step.timeSpentSec)}
                                  </Typography>
                                </Stack>

                                <Stack direction="row" alignItems="center" spacing={1} mt={0.75}>
                                  <AccessTime sx={{ fontSize: 14, color: "#64748b" }} />
                                  <Typography fontSize={12} fontWeight={600} color="#475569">
                                    {fmtDt(step.visitedAt)}
                                  </Typography>
                                </Stack>

                                {validLoc && (
                                  <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1} pt={1} borderTop="1px dashed #cbd5e1">
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <LocationOn sx={{ fontSize: 15, color: ACCENT }} />
                                      <Typography fontSize={12} color="#0f172a" fontWeight={700} fontFamily="monospace">
                                        {Number(step.location.lat).toFixed(4)}, {Number(step.location.lng).toFixed(4)}
                                      </Typography>
                                    </Stack>
                                    <a
                                      href={mapUrl(step.location.lat, step.location.lng)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: 12,
                                        color: ACCENT,
                                        fontWeight: 800,
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 2,
                                      }}
                                    >
                                      View Map <OpenInNew sx={{ fontSize: 12 }} />
                                    </a>
                                  </Stack>
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function UserActivity() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Drawer states
  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [journeyData, setJourneyData] = useState([]);
  const [loadingJourney, setLoadingJourney] = useState(false);
  const [errorJourney, setErrorJourney] = useState("");

  const timerRef = useRef(null);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    try {
      const activityUsers = await apiFetch("/api/activity/users");
      setUsers(Array.isArray(activityUsers) ? activityUsers : []);
    } catch (err) {
      console.error("Failed to load user activity:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (autoRefresh) {
      timerRef.current = setInterval(() => fetchData(true), LIVE_REFRESH_MS);
    }
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, fetchData]);

  const handleOpenJourney = async (user) => {
    setSelectedUser(user);
    setDrawerOpen(true);
    setJourneyData([]);
    setErrorJourney("");
    setLoadingJourney(true);

    try {
      const data = await apiFetch(`/api/activity/user/${encodeURIComponent(user._id)}`);
      setJourneyData(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorJourney("Unable to load activity history for this user.");
    } finally {
      setLoadingJourney(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return [u.name, u.mobile, u.email, u._id]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(term));
  });

  const totalOnline = users.filter((u) => isOnline(u.lastSeen)).length;
  const totalWithLoc = users.filter((u) => hasCoordinates(u.lastLocation)).length;

  return (
    <Box sx={{ background: "#f8fafc", minHeight: "100vh", p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Top Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3.5}
      >
        <Box>
          <Typography fontSize={24} fontWeight={900} color="#0f172a" letterSpacing={-0.5}>
            User Navigation & Activity
          </Typography>
          <Typography fontSize={14} fontWeight={500} color="#475569" mt={0.5}>
            Live user presence, page journey paths, and GPS coordinates.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            icon={<Autorenew sx={{ fontSize: "18px !important" }} />}
            label={autoRefresh ? "Live Sync (15s)" : "Paused"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            sx={{
              fontWeight: 700,
              fontSize: 13,
              py: 2,
              px: 0.5,
              borderColor: autoRefresh ? "#86efac" : "#cbd5e1",
              background: autoRefresh ? "#ecfdf5" : "#fff",
              color: autoRefresh ? "#166534" : "#475569",
            }}
            variant="outlined"
            clickable
          />
          <Tooltip title="Refresh data">
            <IconButton
              onClick={() => fetchData(true)}
              disabled={refreshing}
              sx={{
                background: "#fff",
                border: "1px solid #cbd5e1",
                p: 1.2,
                "&:hover": { background: "#f1f5f9" },
              }}
            >
              {refreshing ? <CircularProgress size={20} /> : <Refresh fontSize="small" sx={{ color: "#0f172a" }} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Metrics Row */}
      <Grid container spacing={2.5} mb={3.5}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 3, border: "1px solid #cbd5e1", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, background: "#eff6ff", color: ACCENT }}>
                  <PeopleAlt fontSize="medium" />
                </Box>
                <Box>
                  <Typography fontSize={12} fontWeight={700} color="#64748b" textTransform="uppercase">
                    Total Tracked Users
                  </Typography>
                  <Typography fontSize={24} fontWeight={900} color="#0f172a">
                    {users.length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 3, border: "1px solid #cbd5e1", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, background: "#ecfdf5", color: GREEN }}>
                  <Navigation fontSize="medium" />
                </Box>
                <Box>
                  <Typography fontSize={12} fontWeight={700} color="#64748b" textTransform="uppercase">
                    Active (Within 5m)
                  </Typography>
                  <Typography fontSize={24} fontWeight={900} color="#0f172a">
                    {totalOnline}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 3, border: "1px solid #cbd5e1", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, background: "#fffbeb", color: AMBER }}>
                  <LocationOn fontSize="medium" />
                </Box>
                <Box>
                  <Typography fontSize={12} fontWeight={700} color="#64748b" textTransform="uppercase">
                    With Saved Coordinates
                  </Typography>
                  <Typography fontSize={24} fontWeight={900} color="#0f172a">
                    {totalWithLoc}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Input */}
      <Box mb={2.5}>
        <TextField
          fullWidth
          placeholder="Filter by name, mobile, email or system ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "#475569", fontSize: 24 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            background: "#fff",
            borderRadius: 2.5,
            "& .MuiOutlinedInput-root": {
              fontSize: 15,
              fontWeight: 500,
              "& fieldset": { borderColor: "#cbd5e1", borderWidth: "1.5px" },
              "&:hover fieldset": { borderColor: "#94a3b8" },
              "&.Mui-focused fieldset": { borderColor: ACCENT },
            },
          }}
        />
      </Box>

      {/* Main Content: Desktop Table or Mobile Cards */}
      {loading && users.length === 0 ? (
        <Box py={8} textAlign="center">
          <CircularProgress size={36} sx={{ color: ACCENT }} />
        </Box>
      ) : filteredUsers.length === 0 ? (
        <Box py={6} textAlign="center" sx={{ background: "#fff", borderRadius: 3, border: "2px dashed #cbd5e1" }}>
          <Typography color="#475569" fontSize={15} fontWeight={600}>No user activity matches your query.</Typography>
        </Box>
      ) : isMobile ? (
        /* Mobile List Cards */
        <Stack spacing={2}>
          {filteredUsers.map((u) => {
            const hasGps = hasCoordinates(u.lastLocation);
            return (
              <Card
                key={u._id}
                onClick={() => handleOpenJourney(u)}
                sx={{
                  borderRadius: 3,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  "&:active": { background: "#f1f5f9" },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                      <Typography fontWeight={800} fontSize={16} color="#0f172a">
                        {u.name || "Unnamed User"}
                      </Typography>
                      <Typography fontSize={13} color="#475569" fontFamily="monospace">
                        {u.mobile || u.email || "No contact info"}
                      </Typography>
                    </Box>
                    <HighContrastStatus online={isOnline(u.lastSeen)} />
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} pt={1.5} borderTop="1px solid #e2e8f0">
                    <Typography fontSize={13} color="#334155" fontWeight={600}>
                      {u.totalPages || 0} screens · {fmtTime(u.totalTimeSec)}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {hasGps && (
                        <Chip
                          icon={<LocationOn sx={{ fontSize: "14px !important" }} />}
                          label="GPS"
                          size="small"
                          sx={{ fontWeight: 700, fontSize: 11, background: "#dbeafe", color: ACCENT }}
                        />
                      )}
                      <ChevronRight sx={{ color: "#94a3b8" }} />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      ) : (
        /* Desktop High-Contrast Table View */
        <Box sx={{ background: "#fff", borderRadius: 3, border: "1px solid #cbd5e1", overflow: "hidden" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead" sx={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>User Profile</th>
                <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>Status</th>
                <th style={{ textAlign: "right", padding: "14px 20px", fontSize: 12, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>Screen Views</th>
                <th style={{ textAlign: "right", padding: "14px 20px", fontSize: 12, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>Time Spent</th>
                <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>Last GPS Fix</th>
                <th style={{ textAlign: "right", padding: "14px 20px", fontSize: 12, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>Inspect</th>
              </tr>
            </Box>
            <Box component="tbody">
              {filteredUsers.map((u) => {
                const hasGps = hasCoordinates(u.lastLocation);
                return (
                  <tr
                    key={u._id}
                    onClick={() => handleOpenJourney(u)}
                    style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "16px 20px" }}>
                      <Typography fontSize={15} fontWeight={800} color="#0f172a">{u.name || "Unnamed User"}</Typography>
                      <Typography fontSize={13} color="#475569" fontFamily="monospace">{u.mobile || u.email || u._id}</Typography>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <HighContrastStatus online={isOnline(u.lastSeen)} />
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <Typography fontSize={15} fontWeight={800} color="#0f172a">{u.totalPages || 0}</Typography>
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <Typography fontSize={15} fontWeight={800} color={ACCENT}>{fmtTime(u.totalTimeSec)}</Typography>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      {hasGps ? (
                        <a
                          href={mapUrl(u.lastLocation.lat, u.lastLocation.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: ACCENT,
                            fontSize: 13,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontWeight: 700,
                          }}
                        >
                          <LocationOn sx={{ fontSize: 16 }} />
                          {Number(u.lastLocation.lat).toFixed(4)}, {Number(u.lastLocation.lng).toFixed(4)}
                        </a>
                      ) : (
                        <Typography fontSize={13} color="#94a3b8" fontWeight={500}>No GPS</Typography>
                      )}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#fff",
                          padding: "6px 14px",
                          borderRadius: 8,
                          background: ACCENT,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        Journey <Timeline sx={{ fontSize: 16 }} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {/* Redesigned Journey Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 540 },
            borderLeft: "2px solid #cbd5e1",
          },
        }}
      >
        <UserJourneyDrawer
          user={selectedUser}
          journeyData={journeyData}
          loadingJourney={loadingJourney}
          errorJourney={errorJourney}
          onClose={() => setDrawerOpen(false)}
        />
      </Drawer>
    </Box>
  );
}