// src/features/admin/UsersManagement.js

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip,
  Avatar, TextField, Select, MenuItem, FormControl, InputLabel,
  Drawer, Button, IconButton, Divider, CircularProgress, Skeleton,
  InputAdornment, Tooltip,
} from "@mui/material";

import RefreshIcon               from "@mui/icons-material/Refresh";
import PersonIcon                from "@mui/icons-material/Person";
import CloseIcon                 from "@mui/icons-material/Close";
import SearchIcon                from "@mui/icons-material/Search";
import AccountBalanceWalletIcon  from "@mui/icons-material/AccountBalanceWallet";
import PhoneAndroidIcon          from "@mui/icons-material/PhoneAndroid";
import EmailIcon                 from "@mui/icons-material/Email";
import DirectionsCarIcon         from "@mui/icons-material/DirectionsCar";
import VerifiedUserIcon          from "@mui/icons-material/VerifiedUser";
import CalendarTodayIcon         from "@mui/icons-material/CalendarToday";

import { apiFetch } from "../../utils/apiFetch";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  admin:    { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
  owner:    { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
  customer: { bg: "#ecfeff", color: "#0891b2", border: "#a5f3fc" },
};

const AVATAR_COLORS = [
  "#0891b2","#7c3aed","#db2777","#059669","#d97706","#dc2626","#2563eb",
];
const avatarColor = (name = "") =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const initials = (name = "") =>
  name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function joinedAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)    return diff + "s ago";
  if (diff < 3600)  return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 2592000) return Math.floor(diff / 86400) + "d ago";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtBalance(val) {
  if (val == null) return null;
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPI({ label, value, color = "#0891b2" }) {
  return (
    <Card elevation={0} sx={{
      borderRadius: 3, border: "1px solid #e5e7eb",
      background: "linear-gradient(135deg, #fff 60%, #f8fafc)",
      height: "100%",
    }}>
      <CardContent sx={{ p: "14px !important" }}>
        <Typography fontSize={11} fontWeight={600} color="text.secondary" letterSpacing={0.5} textTransform="uppercase">
          {label}
        </Typography>
        <Typography fontSize={26} fontWeight={800} color={color} lineHeight={1.2} mt={0.5}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── User Card ───────────────────────────────────────────────────────────────

function UserCard({ user, walletBalance, walletLoading, onOpen }) {
  const rc = ROLE_COLORS[user.role] || { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };

  return (
    <Card
      elevation={0}
      onClick={() => onOpen(user)}
      sx={{
        borderRadius: 3,
        border: "1px solid #e5e7eb",
        cursor: "pointer",
        transition: "all 0.18s ease",
        height: "100%",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          borderColor: "#c7d2fe",
        },
      }}
    >
      <CardContent sx={{ p: "16px !important" }}>

        {/* Top row: avatar + info + role chip */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar
            sx={{
              bgcolor: avatarColor(user.name),
              width: 44, height: 44,
              fontSize: 15, fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials(user.name)}
          </Avatar>

          <Box flex={1} minWidth={0}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Typography fontWeight={700} fontSize={14} noWrap sx={{ maxWidth: "65%" }}>
                {user.name}
              </Typography>
              <Chip
                label={user.role}
                size="small"
                sx={{
                  bgcolor: rc.bg, color: rc.color,
                  border: `1px solid ${rc.border}`,
                  fontWeight: 700, fontSize: 10, height: 20,
                  flexShrink: 0,
                }}
              />
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5} mt={0.3}>
              <PhoneAndroidIcon sx={{ fontSize: 11, color: "text.disabled" }} />
              <Typography fontSize={12} color="text.secondary">{user.mobile}</Typography>
            </Stack>

            {user.email && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <EmailIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                <Typography fontSize={12} color="text.secondary" noWrap>{user.email}</Typography>
              </Stack>
            )}
          </Box>
        </Stack>

        <Divider sx={{ my: 1.2 }} />

        {/* Bottom row: vehicle + verified + wallet + joined */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <DirectionsCarIcon sx={{ fontSize: 12, color: "text.disabled" }} />
            <Typography fontSize={11} color="text.secondary">
              {user.vehicleType || "—"}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.8} alignItems="center">
            {user.phoneVerified && (
              <Tooltip title="Phone Verified">
                <VerifiedUserIcon sx={{ fontSize: 14, color: "#16a34a" }} />
              </Tooltip>
            )}

            {/* ✅ Wallet balance — auto-fetched on load */}
            <Stack direction="row" alignItems="center" spacing={0.4}>
              <AccountBalanceWalletIcon sx={{ fontSize: 13, color: "#0891b2" }} />
              {walletLoading ? (
                <Skeleton width={40} height={14} />
              ) : walletBalance != null ? (
                <Typography fontSize={11} fontWeight={700} color="#0891b2">
                  {fmtBalance(walletBalance)}
                </Typography>
              ) : (
                <Typography fontSize={11} color="text.disabled">—</Typography>
              )}
            </Stack>
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={0.4} mt={0.6}>
          <CalendarTodayIcon sx={{ fontSize: 10, color: "text.disabled" }} />
          <Typography fontSize={10} color="text.disabled">
            Joined {joinedAgo(user.createdAt)}
          </Typography>
        </Stack>

      </CardContent>
    </Card>
  );
}

// ─── Drawer Row ───────────────────────────────────────────────────────────────

function DrawerRow({ label, value, icon: Icon }) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={2}>
      {Icon && <Icon sx={{ fontSize: 18, color: "#6b7280", mt: 0.2, flexShrink: 0 }} />}
      <Box>
        <Typography fontSize={11} color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.4}>
          {label}
        </Typography>
        <Typography fontWeight={700} fontSize={14}>
          {value || "—"}
        </Typography>
      </Box>
    </Stack>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UsersManagement() {
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [role,          setRole]          = useState("");
  const [selected,      setSelected]      = useState(null);
  const [walletMap,     setWalletMap]     = useState({});   // userId → balance
  const [walletLoading, setWalletLoading] = useState(false);

  // ─── Load users ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/users");
      const sorted = (res || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUsers(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Auto-fetch all wallet balances after users load ────────────────────
  const fetchAllWallets = useCallback(async (userList) => {
    if (!userList.length) return;
    setWalletLoading(true);
    try {
      // Batch fetch in parallel — all users at once
      const results = await Promise.all(
        userList.map(u =>
          apiFetch(`/api/wallet/admin/balance/${u._id}`)
            .then(res => ({ id: u._id, balance: typeof res === "number" ? res : (res?.balance ?? 0) }))
            .catch(() => ({ id: u._id, balance: null }))
        )
      );
      const map = {};
      for (const { id, balance } of results) map[id] = balance;
      setWalletMap(map);
    } catch (err) {
      console.error("Failed to fetch wallet balances:", err);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  // Trigger wallet fetch whenever users list changes
  useEffect(() => {
    if (users.length > 0) fetchAllWallets(users);
  }, [users, fetchAllWallets]);

  // ─── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek  = new Date(); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      total:     users.length,
      admins:    users.filter(u => u.role === "admin").length,
      owners:    users.filter(u => u.role === "owner").length,
      customers: users.filter(u => u.role === "customer").length,
      verified:  users.filter(u => u.phoneVerified).length,
      newToday:  users.filter(u => new Date(u.createdAt) >= startOfToday).length,
      newWeek:   users.filter(u => new Date(u.createdAt) >= startOfWeek).length,
      newMonth:  users.filter(u => new Date(u.createdAt) >= startOfMonth).length,
    };
  }, [users]);

  // ─── Filter ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => users.filter(u => {
    const matchSearch = !search ||
      `${u.name} ${u.mobile} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = !role || u.role === role;
    return matchSearch && matchRole;
  }), [users, search, role]);

  return (
    <Box sx={{
      maxWidth: 1400, mx: "auto",
      px: { xs: 2, sm: 3, md: 4 },
      py: { xs: 2, sm: 3 },
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── Header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={900} letterSpacing={-0.5}>
            Users Management
          </Typography>
          <Typography fontSize={13} color="text.secondary">
            {stats.total} total users · {stats.customers} customers · {stats.owners} owners
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            onClick={() => { load(); }}
            sx={{ border: "1px solid #e5e7eb", borderRadius: 2, "&:hover": { bgcolor: "#f3f4f6" } }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── KPI Row ── */}
      <Grid container spacing={1.5} mb={3}>
        {[
          { label: "Total",     value: stats.total,     color: "#1d4ed8" },
          { label: "Customers", value: stats.customers, color: "#0891b2" },
          { label: "Owners",    value: stats.owners,    color: "#d97706" },
          { label: "Admins",    value: stats.admins,    color: "#dc2626" },
          { label: "Verified",  value: stats.verified,  color: "#16a34a" },
          { label: "Today",     value: stats.newToday,  color: "#7c3aed" },
          { label: "This Week", value: stats.newWeek,   color: "#db2777" },
          { label: "This Month",value: stats.newMonth,  color: "#059669" },
        ].map(k => (
          <Grid item xs={6} sm={3} md={3} lg={1.5} key={k.label}>
            <KPI label={k.label} value={k.value} color={k.color} />
          </Grid>
        ))}
      </Grid>

      {/* ── Filters ── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5} mb={3}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <TextField
          placeholder="Search by name, phone, email…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: { sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Role</InputLabel>
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            <MenuItem value="">All Roles</MenuItem>
            <MenuItem value="customer">Customer</MenuItem>
            <MenuItem value="owner">Owner</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </FormControl>
        <Typography fontSize={12} color="text.secondary" sx={{ alignSelf: "center", whiteSpace: "nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </Typography>
      </Stack>

      {/* ── Users Grid ── */}
      {loading ? (
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e5e7eb" }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Skeleton variant="circular" width={44} height={44} />
                    <Box flex={1}>
                      <Skeleton width="60%" height={18} />
                      <Skeleton width="80%" height={14} />
                      <Skeleton width="70%" height={14} />
                    </Box>
                  </Stack>
                  <Skeleton height={1} sx={{ my: 1.5 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Skeleton width={60} height={14} />
                    <Skeleton width={50} height={14} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
          <PersonIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography fontWeight={600}>No users found</Typography>
          <Typography fontSize={13}>Try adjusting the search or filters</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(user => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={user._id}>
              <UserCard
                user={user}
                walletBalance={walletMap[user._id] ?? null}
                walletLoading={walletLoading && walletMap[user._id] === undefined}
                onOpen={setSelected}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── User Drawer ── */}
      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 400 },
            borderRadius: { xs: 0, sm: "16px 0 0 16px" },
          },
        }}
      >
        {selected && (() => {
          const rc = ROLE_COLORS[selected.role] || { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
          const balance = walletMap[selected._id];
          return (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>

              {/* Drawer Header */}
              <Box sx={{
                p: 3, pb: 2,
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                color: "#fff",
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: avatarColor(selected.name),
                        width: 52, height: 52,
                        fontSize: 18, fontWeight: 800,
                      }}
                    >
                      {initials(selected.name)}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={800} fontSize={17}>{selected.name}</Typography>
                      <Chip
                        label={selected.role}
                        size="small"
                        sx={{
                          bgcolor: rc.bg, color: rc.color,
                          border: `1px solid ${rc.border}`,
                          fontWeight: 700, fontSize: 10, height: 20, mt: 0.5,
                        }}
                      />
                    </Box>
                  </Stack>
                  <IconButton onClick={() => setSelected(null)} sx={{ color: "#fff", mt: -0.5 }}>
                    <CloseIcon />
                  </IconButton>
                </Stack>

                {/* Wallet balance hero */}
                <Box sx={{
                  mt: 2.5, p: 2,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={0.3}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 16, color: "#67e8f9" }} />
                    <Typography fontSize={12} color="rgba(255,255,255,0.6)" fontWeight={600}>
                      WALLET BALANCE
                    </Typography>
                  </Stack>
                  {walletLoading && balance === undefined ? (
                    <Skeleton width={100} height={28} sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
                  ) : (
                    <Typography fontSize={26} fontWeight={800} color="#67e8f9">
                      {fmtBalance(balance) ?? "—"}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Drawer Body */}
              <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>

                <DrawerRow label="Mobile"        value={selected.mobile}      icon={PhoneAndroidIcon} />
                <DrawerRow label="Email"         value={selected.email}       icon={EmailIcon} />
                <DrawerRow label="Vehicle Type"  value={selected.vehicleType} icon={DirectionsCarIcon} />
                <DrawerRow label="Role"          value={selected.role}        icon={PersonIcon} />

                <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                  <VerifiedUserIcon sx={{ fontSize: 18, color: "#6b7280", flexShrink: 0 }} />
                  <Box>
                    <Typography fontSize={11} color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.4}>
                      Phone Verified
                    </Typography>
                    <Chip
                      size="small"
                      label={selected.phoneVerified ? "Verified" : "Not Verified"}
                      sx={{
                        bgcolor: selected.phoneVerified ? "#dcfce7" : "#fee2e2",
                        color: selected.phoneVerified ? "#16a34a" : "#dc2626",
                        fontWeight: 700, fontSize: 11, mt: 0.3,
                      }}
                    />
                  </Box>
                </Stack>

                <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={2}>
                  <CalendarTodayIcon sx={{ fontSize: 18, color: "#6b7280", mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography fontSize={11} color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.4}>
                      Joined
                    </Typography>
                    <Typography fontWeight={700} fontSize={14}>
                      {new Date(selected.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">
                      {joinedAgo(selected.createdAt)}
                    </Typography>
                  </Box>
                </Stack>

              </Box>

              {/* Drawer Footer */}
              <Box sx={{
                p: 3, pt: 2,
                borderTop: "1px solid #f1f5f9",
                background: "#fafafa",
              }}>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{
                      borderRadius: 2, fontWeight: 700,
                      background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                      textTransform: "none",
                    }}
                  >
                    Edit User
                  </Button>
                  <Button
                    color="error"
                    variant="outlined"
                    fullWidth
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setSelected(null)}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", minWidth: 80 }}
                  >
                    Close
                  </Button>
                </Stack>
              </Box>

            </Box>
          );
        })()}
      </Drawer>

    </Box>
  );
}