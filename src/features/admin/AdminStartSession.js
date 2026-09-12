import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";

import {
  AccountBalanceWallet,
  Bolt,
  CheckCircle,
  ElectricCar,
  Person,
  PlayArrow,
  Refresh,
  Search,
  Speed,
  StopCircle,
  Timeline,
} from "@mui/icons-material";

import { apiFetch } from "../../utils/apiFetch";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = "#0891b2";
const GREEN = "#16a34a";
const AMBER = "#f59e0b";
const RED = "#dc2626";
const BLUE = "#2563eb";

const LIVE_REFRESH_MS = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const number = (value, decimals = 2) =>
  Number(value || 0).toFixed(decimals);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (start, end = null) => {
  if (!start) return "—";

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return "—";
  }

  const diff = Math.max(0, endTime - startTime);

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
};

const getUserId = (user) => user?._id || user?.id || "";

const getUserName = (user) =>
  user?.name ||
  user?.fullName ||
  user?.mobile ||
  user?.email ||
  "Unknown User";

const getDeviceId = (device) =>
  device?.device_id ||
  device?.deviceId ||
  device?._id ||
  "—";

const getDeviceStatus = (device) =>
  String(device?.status || "").toLowerCase();

const isAvailableDevice = (device) => {
  const status = getDeviceStatus(device);

  return (
    status === "available" ||
    status === "online" ||
    status === "idle"
  );
};

const sessionIsLive = (session) =>
  session?.status === "active" ||
  session?.status === "paused";

// ─────────────────────────────────────────────────────────────────────────────
// Small UI components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ number: step, title, subtitle, completed }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start" mb={2}>
      <Avatar
        sx={{
          width: 30,
          height: 30,
          bgcolor: completed ? GREEN : "#ecfeff",
          color: completed ? "#fff" : ACCENT,
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {completed ? <CheckCircle sx={{ fontSize: 18 }} /> : step}
      </Avatar>

      <Box>
        <Typography
          fontSize={14}
          fontWeight={800}
          color="#0f172a"
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            fontSize={11}
            color="#64748b"
            mt={0.25}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function StatusChip({ status }) {
  const normalized = String(status || "").toLowerCase();

  let label = status || "Unknown";
  let color = "#64748b";
  let background = "#f1f5f9";

  if (normalized === "active") {
    label = "LIVE";
    color = GREEN;
    background = "#dcfce7";
  } else if (normalized === "paused") {
    label = "PAUSED";
    color = AMBER;
    background = "#fef3c7";
  } else if (normalized === "completed") {
    label = "COMPLETED";
    color = BLUE;
    background = "#dbeafe";
  } else if (normalized === "stopped") {
    label = "STOPPED";
    color = RED;
    background = "#fee2e2";
  } else if (normalized === "terminated") {
    label = "TERMINATED";
    color = "#be185d";
    background = "#fce7f3";
  }

  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 22,
        fontSize: 10,
        fontWeight: 800,
        color,
        bgcolor: background,
        border: `1px solid ${color}22`,
      }}
    />
  );
}

function InfoBox({ label, value, icon, color = ACCENT }) {
  return (
    <Box
      sx={{
        border: "1px solid #e2e8f0",
        borderRadius: 2,
        p: 1.5,
        background: "#fff",
      }}
    >
      <Stack direction="row" spacing={0.8} alignItems="center" mb={0.5}>
        <Box sx={{ color }}>{icon}</Box>

        <Typography
          fontSize={10}
          fontWeight={700}
          color="#94a3b8"
          textTransform="uppercase"
          letterSpacing={0.5}
        >
          {label}
        </Typography>
      </Stack>

      <Typography
        fontSize={16}
        fontWeight={800}
        color="#0f172a"
      >
        {value}
      </Typography>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminStartSession() {
  // ── Main tab
  const [tab, setTab] = useState(0);

  // ── Data
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);

  // ── Selection
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // ── Wallet
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // ── Charging
  const [chargeMode, setChargeMode] = useState("amount");
  const [chargeValue, setChargeValue] = useState("");

  // ── Loading
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [starting, setStarting] = useState(false);

  // ── UI
  const [userSearch, setUserSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLastRefresh, setHistoryLastRefresh] = useState(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Load users
  // ───────────────────────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);

      const result = await apiFetch("/api/users");

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.users)
          ? result.users
          : [];

      // Admin should start sessions for normal customer accounts.
      const customerUsers = list.filter(
        (user) =>
          String(user?.role || "customer").toLowerCase() !== "admin"
      );

      setUsers(customerUsers);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(err?.message || "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Load devices
  // ───────────────────────────────────────────────────────────────────────────

  const loadDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);

      const result = await apiFetch("/api/devices/admin-dashboard");

      const list = Array.isArray(result?.devices)
        ? result.devices
        : [];

      setDevices(list);
    } catch (err) {
      console.error("Failed to load devices:", err);
      setError(err?.message || "Failed to load devices.");
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Initial load
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadUsers();
    loadDevices();
  }, [loadUsers, loadDevices]);

  // ───────────────────────────────────────────────────────────────────────────
  // Selected user
  // ───────────────────────────────────────────────────────────────────────────

  const selectedUser = useMemo(
    () => users.find((user) => getUserId(user) === selectedUserId) || null,
    [users, selectedUserId]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch selected user's wallet
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fetchWallet = async () => {
      if (!selectedUserId) {
        setWalletBalance(null);
        return;
      }

      try {
        setWalletLoading(true);
        setWalletBalance(null);

        const result = await apiFetch(
          `/api/wallet/admin/balance/${selectedUserId}`
        );

        if (cancelled) return;

        const balance =
          typeof result === "number"
            ? result
            : Number(result?.balance ?? result?.walletBalance ?? 0);

        setWalletBalance(balance);
      } catch (err) {
        console.error("Failed to load wallet:", err);

        if (!cancelled) {
          setWalletBalance(null);
          setError(
            err?.message || "Unable to load selected user's wallet."
          );
        }
      } finally {
        if (!cancelled) {
          setWalletLoading(false);
        }
      }
    };

    fetchWallet();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  // ───────────────────────────────────────────────────────────────────────────
  // Available devices
  // ───────────────────────────────────────────────────────────────────────────

  const availableDevices = useMemo(() => {
    return devices.filter(isAvailableDevice);
  }, [devices]);

  const selectedDevice = useMemo(
    () =>
      devices.find(
        (device) => getDeviceId(device) === selectedDeviceId
      ) || null,
    [devices, selectedDeviceId]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Search filtering
  // ───────────────────────────────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();

    if (!q) return users;

    return users.filter((user) =>
      [
        user?.name,
        user?.mobile,
        user?.email,
        user?._id,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(q)
        )
    );
  }, [users, userSearch]);

  const filteredDevices = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();

    if (!q) return availableDevices;

    return availableDevices.filter((device) =>
      [
        device?.device_id,
        device?.deviceId,
        device?._id,
        device?.location,
        device?.city,
        device?.project,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(q)
        )
    );
  }, [availableDevices, deviceSearch]);

  // ───────────────────────────────────────────────────────────────────────────
  // Device rate
  // ───────────────────────────────────────────────────────────────────────────

const deviceRate = Number(selectedDevice?.rate ?? 0);

  // ───────────────────────────────────────────────────────────────────────────
  // Calculate amount / energy
  // ───────────────────────────────────────────────────────────────────────────

  const calculatedAmount =
    chargeMode === "amount"
      ? Number(chargeValue || 0)
      : Number(chargeValue || 0) * deviceRate;

  const calculatedEnergy =
    chargeMode === "energy"
      ? Number(chargeValue || 0)
      : deviceRate > 0
        ? Number(chargeValue || 0) / deviceRate
        : 0;

  const remainingBalance =
    walletBalance != null
      ? walletBalance - calculatedAmount
      : null;

  const validCharge =
    Number(chargeValue) > 0 &&
    calculatedAmount > 0 &&
    calculatedEnergy > 0;

  const canStart =
    !!selectedUserId &&
    !!selectedDeviceId &&
    !walletLoading &&
    walletBalance != null &&
    validCharge &&
    remainingBalance >= 0 &&
    !starting;

    const now = new Date();

    const sessionId =
    `ADM_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const startTime = now.toISOString();

    const startDate = now.toISOString().slice(0, 10);
  // ───────────────────────────────────────────────────────────────────────────
  // Start session
  // ───────────────────────────────────────────────────────────────────────────

  const startSession = async () => {
    setError("");
    setSuccess("");

    if (!selectedUserId) {
      setError("Please select a user.");
      return;
    }

    if (!selectedDeviceId) {
      setError("Please select an available charger.");
      return;
    }

    if (!validCharge) {
      setError("Please enter a valid amount or energy value.");
      return;
    }

    if (walletBalance == null) {
      setError("User wallet balance is not available.");
      return;
    }

    if (calculatedAmount > walletBalance) {
      setError("Insufficient wallet balance.");
      return;
    }

    if (!isAvailableDevice(selectedDevice)) {
      setError("This charger is no longer available.");
      await loadDevices();
      return;
    }

    try {
      setStarting(true);

      // ─────────────────────────────────────────────────────────────
      // STEP 1
      // Debit selected user's wallet
      // ─────────────────────────────────────────────────────────────

      const payment = await apiFetch("/api/wallet/admin/pay", {
        method: "POST",
        body: {
          userId: selectedUserId,
          deviceId: selectedDeviceId,
          amount: Number(calculatedAmount.toFixed(2)),
          chargingOption:
            chargeMode === "amount"
              ? "amount"
              : "energy",
          energySelected: Number(calculatedEnergy.toFixed(3)),
        },
      });

      const orderId =
        payment?.orderId ||
        payment?.transactionId ||
        payment?.paymentId;

      if (!orderId) {
        throw new Error(
          "Wallet payment succeeded but no payment reference was returned."
        );
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 2
      // Start the actual charging session
      //
      // The backend records this as initiatedBy = admin.
      // The session still belongs to selectedUserId.
      // ─────────────────────────────────────────────────────────────

await apiFetch("/api/sessions/admin/start", {
  method: "POST",
  body: {
    userId: selectedUserId,
    deviceId: selectedDeviceId,

    sessionId,
    transactionId: orderId,

    startTime,
    startDate,

    energySelected: Number(
      calculatedEnergy.toFixed(3)
    ),

    amountSelected: Number(
      calculatedAmount.toFixed(2)
    ),

    amountPaid: Number(
      calculatedAmount.toFixed(2)
    ),

    paymentGateway: "wallet",
  },
});

      const newBalance =
        payment?.newBalance != null
          ? Number(payment.newBalance)
          : walletBalance - calculatedAmount;

      setWalletBalance(newBalance);

      setSuccess(
        `Session started for ${getUserName(selectedUser)} on ${getDeviceId(selectedDevice)}.`
      );

      // Reset charging selection but keep user/device visible.
      setChargeValue("");

      // Refresh devices so the charger becomes Occupied.
      await loadDevices();

      // Refresh admin-started history.
      await loadAdminHistory();

      // Move to live history after successful start.
      setTab(1);
    } catch (err) {
      console.error("Admin session start failed:", err);

      setError(
        err?.message ||
        err?.response?.data?.message ||
        "Unable to start session."
      );

      // Important: refresh both wallet/device state.
      // This protects the UI from stale data after a failed attempt.
      await Promise.all([
        loadDevices(),
        selectedUserId
          ? apiFetch(
              `/api/wallet/admin/balance/${selectedUserId}`
            )
              .then((result) => {
                const balance =
                  typeof result === "number"
                    ? result
                    : Number(
                        result?.balance ??
                        result?.walletBalance ??
                        0
                      );

                setWalletBalance(balance);
              })
              .catch(() => {})
          : Promise.resolve(),
      ]);
    } finally {
      setStarting(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Admin-started session history
  // ───────────────────────────────────────────────────────────────────────────

  const loadAdminHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);

      const [activeResponse, pausedResponse, pastResponse] =
        await Promise.all([
          apiFetch(
            "/api/sessions/all?status=active&limit=500"
          ),
          apiFetch(
            "/api/sessions/all?status=paused&limit=200"
          ),
          apiFetch(
            "/api/sessions/all?limit=500"
          ),
        ]);

      const active = Array.isArray(activeResponse?.sessions)
        ? activeResponse.sessions
        : [];

      const paused = Array.isArray(pausedResponse?.sessions)
        ? pausedResponse.sessions
        : [];

      const past = Array.isArray(pastResponse?.sessions)
        ? pastResponse.sessions
        : [];

      // The backend session metadata identifies admin-started sessions.
      const combined = [
        ...active,
        ...paused,
        ...past,
      ];

      const unique = new Map();

      combined.forEach((session) => {
        if (!session?._id) return;

        const initiatedBy = String(
          session?.initiatedBy || ""
        ).toLowerCase();

        if (initiatedBy !== "admin") return;

        unique.set(session._id, session);
      });

      const sorted = Array.from(unique.values()).sort(
        (a, b) =>
          new Date(b.startTime || 0) -
          new Date(a.startTime || 0)
      );

      setHistory(sorted);
      setHistoryLastRefresh(new Date());
    } catch (err) {
      console.error(
        "Failed to load admin session history:",
        err
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminHistory();

    const timer = setInterval(
      loadAdminHistory,
      LIVE_REFRESH_MS
    );

    return () => clearInterval(timer);
  }, [loadAdminHistory]);

  // ───────────────────────────────────────────────────────────────────────────
  // Derived history
  // ───────────────────────────────────────────────────────────────────────────

  const liveHistory = useMemo(
    () => history.filter(sessionIsLive),
    [history]
  );

  const pastHistory = useMemo(
    () => history.filter((session) => !sessionIsLive(session)),
    [history]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Reset helper
  // ───────────────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedDeviceId("");
    setChargeValue("");
    setWalletBalance(null);
    setError("");
    setSuccess("");
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        minHeight: "100%",
        background: "#f1f5f9",
        fontFamily: "Inter, system-ui",
      }}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Header */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(241,245,249,0.97)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e2e8f0",
          px: { xs: 2, md: 4 },
          py: 1.75,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          gap={1.5}
        >
          <Box>
            <Typography
              fontSize={{ xs: 18, md: 20 }}
              fontWeight={800}
              color="#0f172a"
            >
              Start Session
            </Typography>

            <Typography
              fontSize={11}
              color="#64748b"
              mt={0.25}
            >
              Start a wallet-paid charging session on behalf
              of a user.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<Refresh sx={{ fontSize: 16 }} />}
              onClick={() => {
                loadUsers();
                loadDevices();
                loadAdminHistory();
              }}
              sx={{
                color: "#475569",
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Refresh
            </Button>

            <Button
              size="small"
              onClick={resetForm}
              sx={{
                color: "#64748b",
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Content */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <Box
        sx={{
          px: { xs: 1.5, sm: 2, md: 4 },
          py: 3,
          maxWidth: 1450,
          mx: "auto",
        }}
      >
        {/* Alerts */}

        {error && (
          <Alert
            severity="error"
            onClose={() => setError("")}
            sx={{
              mb: 2,
              borderRadius: 2,
              fontSize: 12,
            }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess("")}
            sx={{
              mb: 2,
              borderRadius: 2,
              fontSize: 12,
            }}
          >
            {success}
          </Alert>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Tabs */}
        {/* ──────────────────────────────────────────────────────────────── */}

        <Card
          elevation={0}
          sx={{
            borderRadius: 2.5,
            border: "1px solid #e2e8f0",
            mb: 2,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{
              minHeight: 48,
              "& .MuiTab-root": {
                minHeight: 48,
                textTransform: "none",
                fontSize: 13,
                fontWeight: 700,
              },
            }}
          >
            <Tab
              icon={<PlayArrow sx={{ fontSize: 17 }} />}
              iconPosition="start"
              label="Start Session"
            />

            <Tab
              icon={
                <Timeline sx={{ fontSize: 17 }} />
              }
              iconPosition="start"
              label={
                liveHistory.length > 0
                  ? `History (${liveHistory.length} live)`
                  : "History"
              }
            />
          </Tabs>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* START SESSION TAB */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {tab === 0 && (
          <Grid container spacing={2}>
            {/* ────────────────────────────────────────────────────────── */}
            {/* Left: selection flow */}
            {/* ────────────────────────────────────────────────────────── */}

            <Grid item xs={12} lg={8}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid #e2e8f0",
                }}
              >
                <CardContent
                  sx={{
                    p: { xs: 2, md: 3 },
                  }}
                >
                  {/* Step 1 */}

                  <SectionHeader
                    number="1"
                    title="Select User"
                    subtitle="Choose the customer whose wallet will be charged."
                    completed={!!selectedUser}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search name, mobile or email..."
                    value={userSearch}
                    onChange={(e) =>
                      setUserSearch(e.target.value)
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search
                            sx={{
                              fontSize: 18,
                              color: "#94a3b8",
                            }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mb: 1.5,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                        background: "#f8fafc",
                      },
                    }}
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel>Select User</InputLabel>

                    <Select
                      value={selectedUserId}
                      label="Select User"
                      onChange={(e) =>
                        setSelectedUserId(e.target.value)
                      }
                      sx={{
                        borderRadius: 1.5,
                        background: "#fff",
                      }}
                    >
                      {loadingUsers ? (
                        <MenuItem disabled>
                          Loading users...
                        </MenuItem>
                      ) : filteredUsers.length === 0 ? (
                        <MenuItem disabled>
                          No users found
                        </MenuItem>
                      ) : (
                        filteredUsers.map((user) => (
                          <MenuItem
                            key={getUserId(user)}
                            value={getUserId(user)}
                          >
                            <Box sx={{ width: "100%" }}>
                              <Typography
                                fontSize={13}
                                fontWeight={700}
                              >
                                {getUserName(user)}
                              </Typography>

                              <Typography
                                fontSize={10}
                                color="#64748b"
                              >
                                {user?.mobile ||
                                  user?.email ||
                                  getUserId(user)}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>

                  {/* Wallet information */}

                  {selectedUser && (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        background: "#ecfeff",
                        border: "1px solid #a5f3fc",
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={2}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <AccountBalanceWallet
                            sx={{
                              color: ACCENT,
                              fontSize: 21,
                            }}
                          />

                          <Box>
                            <Typography
                              fontSize={10}
                              color="#64748b"
                              fontWeight={700}
                              textTransform="uppercase"
                            >
                              User Wallet Balance
                            </Typography>

                            {walletLoading ? (
                              <Skeleton
                                width={100}
                                height={25}
                              />
                            ) : (
                              <Typography
                                fontSize={20}
                                fontWeight={900}
                                color="#0f172a"
                              >
                                {money(walletBalance)}
                              </Typography>
                            )}
                          </Box>
                        </Stack>

                        {selectedUser?.mobile && (
                          <Typography
                            fontSize={11}
                            color="#64748b"
                          >
                            {selectedUser.mobile}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  )}

                  <Divider sx={{ my: 3 }} />

                  {/* Step 2 */}

                  <SectionHeader
                    number="2"
                    title="Select Charger"
                    subtitle="Only currently available chargers are shown."
                    completed={!!selectedDevice}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search device ID, location or project..."
                    value={deviceSearch}
                    onChange={(e) =>
                      setDeviceSearch(e.target.value)
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search
                            sx={{
                              fontSize: 18,
                              color: "#94a3b8",
                            }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mb: 1.5,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                        background: "#f8fafc",
                      },
                    }}
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel>
                      Available Charger
                    </InputLabel>

                    <Select
                      value={selectedDeviceId}
                      label="Available Charger"
                      onChange={(e) =>
                        setSelectedDeviceId(e.target.value)
                      }
                      sx={{
                        borderRadius: 1.5,
                        background: "#fff",
                      }}
                    >
                      {loadingDevices ? (
                        <MenuItem disabled>
                          Loading chargers...
                        </MenuItem>
                      ) : filteredDevices.length === 0 ? (
                        <MenuItem disabled>
                          No available chargers
                        </MenuItem>
                      ) : (
                        filteredDevices.map((device) => {
                          const id = getDeviceId(device);

                          return (
                            <MenuItem
                              key={id}
                              value={id}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                width="100%"
                                gap={2}
                              >
                                <Box>
                                  <Typography
                                    fontSize={13}
                                    fontWeight={700}
                                  >
                                    {id}
                                  </Typography>

                                  <Typography
                                    fontSize={10}
                                    color="#64748b"
                                  >
                                    {[
                                      device?.location,
                                      device?.city,
                                    ]
                                      .filter(Boolean)
                                      .join(", ") ||
                                      device?.project ||
                                      "Location not available"}
                                  </Typography>
                                </Box>

                                <Chip
                                  label="Available"
                                  size="small"
                                  sx={{
                                    height: 21,
                                    fontSize: 9,
                                    fontWeight: 800,
                                    bgcolor: "#dcfce7",
                                    color: GREEN,
                                  }}
                                />
                              </Stack>
                            </MenuItem>
                          );
                        })
                      )}
                    </Select>
                  </FormControl>

                  {selectedDevice && (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                      }}
                    >
                      <Stack
                        direction={{
                          xs: "column",
                          sm: "row",
                        }}
                        justifyContent="space-between"
                        gap={1.5}
                      >
                        <Box>
                          <Typography
                            fontSize={10}
                            color="#94a3b8"
                            fontWeight={700}
                            textTransform="uppercase"
                          >
                            Charger
                          </Typography>

                          <Typography
                            fontSize={14}
                            fontWeight={800}
                            fontFamily="monospace"
                          >
                            {getDeviceId(selectedDevice)}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            fontSize={10}
                            color="#94a3b8"
                            fontWeight={700}
                            textTransform="uppercase"
                          >
                            Rate
                          </Typography>

                          <Typography
                            fontSize={14}
                            fontWeight={800}
                          >
                            {deviceRate > 0
                              ? `${money(deviceRate)}/kWh`
                              : "Rate unavailable"}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            fontSize={10}
                            color="#94a3b8"
                            fontWeight={700}
                            textTransform="uppercase"
                          >
                            Location
                          </Typography>

                          <Typography
                            fontSize={13}
                            fontWeight={700}
                          >
                            {[
                              selectedDevice?.location,
                              selectedDevice?.city,
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}

                  <Divider sx={{ my: 3 }} />

                  {/* Step 3 */}

                  <SectionHeader
                    number="3"
                    title="Charging Amount"
                    subtitle="Choose either a wallet amount or target energy."
                    completed={validCharge}
                  />

                  <Stack
                    direction="row"
                    spacing={1}
                    mb={2}
                  >
                    <Button
                      variant={
                        chargeMode === "amount"
                          ? "contained"
                          : "outlined"
                      }
                      startIcon={
                        <AccountBalanceWallet
                          sx={{ fontSize: 17 }}
                        />
                      }
                      onClick={() =>
                        setChargeMode("amount")
                      }
                      sx={{
                        flex: 1,
                        textTransform: "none",
                        borderRadius: 1.5,
                        fontWeight: 800,
                        boxShadow: "none",
                      }}
                    >
                      Amount
                    </Button>

                    <Button
                      variant={
                        chargeMode === "energy"
                          ? "contained"
                          : "outlined"
                      }
                      startIcon={
                        <Bolt sx={{ fontSize: 17 }} />
                      }
                      onClick={() =>
                        setChargeMode("energy")
                      }
                      sx={{
                        flex: 1,
                        textTransform: "none",
                        borderRadius: 1.5,
                        fontWeight: 800,
                        boxShadow: "none",
                      }}
                    >
                      Energy
                    </Button>
                  </Stack>

                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label={
                      chargeMode === "amount"
                        ? "Amount"
                        : "Energy"
                    }
                    placeholder={
                      chargeMode === "amount"
                        ? "Enter amount"
                        : "Enter kWh"
                    }
                    value={chargeValue}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (Number(value) < 0) return;

                      setChargeValue(value);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {chargeMode === "amount"
                            ? "₹"
                            : "kWh"}
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step:
                        chargeMode === "amount"
                          ? 1
                          : 0.1,
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                      },
                    }}
                  />

                  {validCharge && (
                    <Grid
                      container
                      spacing={1}
                      sx={{ mt: 0.5 }}
                    >
                      <Grid item xs={12} sm={4}>
                        <InfoBox
                          label="Wallet Debit"
                          value={money(
                            calculatedAmount
                          )}
                          icon={
                            <AccountBalanceWallet
                              sx={{ fontSize: 17 }}
                            />
                          }
                          color={ACCENT}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <InfoBox
                          label="Energy"
                          value={`${number(
                            calculatedEnergy,
                            3
                          )} kWh`}
                          icon={
                            <Bolt
                              sx={{ fontSize: 17 }}
                            />
                          }
                          color={AMBER}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <InfoBox
                          label="Wallet After"
                          value={
                            remainingBalance >= 0
                              ? money(
                                  remainingBalance
                                )
                              : "Insufficient"
                          }
                          icon={
                            <AccountBalanceWallet
                              sx={{ fontSize: 17 }}
                            />
                          }
                          color={
                            remainingBalance >= 0
                              ? GREEN
                              : RED
                          }
                        />
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* ────────────────────────────────────────────────────────── */}
            {/* Right: confirmation */}
            {/* ────────────────────────────────────────────────────────── */}

            <Grid item xs={12} lg={4}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid #e2e8f0",
                  position: {
                    lg: "sticky",
                  },
                  top: {
                    lg: 80,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    mb={2}
                  >
                    <Speed
                      sx={{
                        color: ACCENT,
                        fontSize: 20,
                      }}
                    />

                    <Typography
                      fontSize={14}
                      fontWeight={800}
                    >
                      Session Summary
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      background: "#f8fafc",
                      borderRadius: 2,
                      p: 1.75,
                    }}
                  >
                    <Typography
                      fontSize={10}
                      fontWeight={700}
                      color="#94a3b8"
                      textTransform="uppercase"
                      letterSpacing={0.5}
                      mb={1}
                    >
                      User
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: "#cffafe",
                          color: ACCENT,
                        }}
                      >
                        <Person
                          sx={{ fontSize: 18 }}
                        />
                      </Avatar>

                      <Box minWidth={0}>
                        <Typography
                          fontSize={13}
                          fontWeight={800}
                          noWrap
                        >
                          {selectedUser
                            ? getUserName(
                                selectedUser
                              )
                            : "No user selected"}
                        </Typography>

                        <Typography
                          fontSize={10}
                          color="#64748b"
                          noWrap
                        >
                          {selectedUser?.mobile ||
                            selectedUser?.email ||
                            "—"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Stack spacing={1.25} mt={2}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography
                        fontSize={11}
                        color="#64748b"
                      >
                        Charger
                      </Typography>

                      <Typography
                        fontSize={11}
                        fontWeight={800}
                        fontFamily="monospace"
                      >
                        {selectedDevice
                          ? getDeviceId(
                              selectedDevice
                            )
                          : "—"}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography
                        fontSize={11}
                        color="#64748b"
                      >
                        Payment
                      </Typography>

                      <Chip
                        size="small"
                        label="User Wallet"
                        sx={{
                          height: 20,
                          fontSize: 9,
                          fontWeight: 800,
                          bgcolor: "#ecfeff",
                          color: ACCENT,
                        }}
                      />
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography
                        fontSize={11}
                        color="#64748b"
                      >
                        Wallet balance
                      </Typography>

                      <Typography
                        fontSize={12}
                        fontWeight={800}
                      >
                        {walletBalance != null
                          ? money(walletBalance)
                          : "—"}
                      </Typography>
                    </Stack>

                    <Divider />

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography
                        fontSize={11}
                        color="#64748b"
                      >
                        Charge
                      </Typography>

                      <Typography
                        fontSize={15}
                        fontWeight={900}
                      >
                        {validCharge
                          ? money(
                              calculatedAmount
                            )
                          : "—"}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography
                        fontSize={11}
                        color="#64748b"
                      >
                        Energy
                      </Typography>

                      <Typography
                        fontSize={12}
                        fontWeight={800}
                      >
                        {validCharge
                          ? `${number(
                              calculatedEnergy,
                              3
                            )} kWh`
                          : "—"}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography
                        fontSize={11}
                        color="#64748b"
                      >
                        Remaining wallet
                      </Typography>

                      <Typography
                        fontSize={12}
                        fontWeight={800}
                        color={
                          remainingBalance != null &&
                          remainingBalance < 0
                            ? RED
                            : GREEN
                        }
                      >
                        {remainingBalance != null
                          ? money(
                              remainingBalance
                            )
                          : "—"}
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Admin indication */}

                  <Box
                    sx={{
                      mt: 2,
                      px: 1.5,
                      py: 1,
                      borderRadius: 1.5,
                      bgcolor: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                    }}
                  >
                    <Typography
                      fontSize={10}
                      color="#64748b"
                      textAlign="center"
                    >
                      Session will be recorded under the
                      selected user and marked as{" "}
                      <strong>initiated by admin</strong>.
                    </Typography>
                  </Box>

                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    disabled={!canStart}
                    startIcon={
                      starting ? (
                        <CircularProgress
                          size={17}
                          color="inherit"
                        />
                      ) : (
                        <PlayArrow />
                      )
                    }
                    onClick={startSession}
                    sx={{
                      mt: 2,
                      minHeight: 48,
                      borderRadius: 1.75,
                      textTransform: "none",
                      fontWeight: 900,
                      fontSize: 14,
                      boxShadow: "none",
                      bgcolor: "#0f172a",
                      "&:hover": {
                        bgcolor: "#1e293b",
                        boxShadow: "none",
                      },
                    }}
                  >
                    {starting
                      ? "Starting Session..."
                      : "Start Session"}
                  </Button>

                  {walletBalance != null &&
                    validCharge &&
                    remainingBalance < 0 && (
                      <Typography
                        textAlign="center"
                        fontSize={10}
                        color={RED}
                        fontWeight={700}
                        mt={1}
                      >
                        Insufficient wallet balance.
                      </Typography>
                    )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HISTORY TAB */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {tab === 1 && (
          <Box>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2.5,
                border: "1px solid #e2e8f0",
              }}
            >
              <CardContent
                sx={{
                  p: { xs: 1.5, md: 2.5 },
                }}
              >
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    sm: "center",
                  }}
                  gap={1}
                  mb={2}
                >
                  <Box>
                    <Typography
                      fontSize={15}
                      fontWeight={800}
                    >
                      Admin-started Sessions
                    </Typography>

                    <Typography
                      fontSize={11}
                      color="#64748b"
                    >
                      Sessions started by an administrator
                      on behalf of a user.
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >
                    {historyLastRefresh && (
                      <Typography
                        fontSize={10}
                        color="#94a3b8"
                      >
                        Updated{" "}
                        {historyLastRefresh.toLocaleTimeString(
                          "en-IN"
                        )}
                      </Typography>
                    )}

                    <Button
                      size="small"
                      startIcon={
                        historyLoading ? (
                          <CircularProgress
                            size={13}
                          />
                        ) : (
                          <Refresh
                            sx={{
                              fontSize: 15,
                            }}
                          />
                        )
                      }
                      disabled={historyLoading}
                      onClick={loadAdminHistory}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                      }}
                    >
                      Refresh
                    </Button>
                  </Stack>
                </Stack>

                {/* Live section */}

                <Box
                  sx={{
                    mb: 3,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    mb={1.25}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: GREEN,
                        animation:
                          "adminSessionPulse 1.4s ease-in-out infinite",
                        "@keyframes adminSessionPulse":
                          {
                            "0%,100%": {
                              opacity: 1,
                            },
                            "50%": {
                              opacity: 0.3,
                            },
                          },
                      }}
                    />

                    <Typography
                      fontSize={12}
                      fontWeight={800}
                    >
                      Live
                    </Typography>

                    <Chip
                      size="small"
                      label={liveHistory.length}
                      sx={{
                        height: 19,
                        fontSize: 9,
                        fontWeight: 800,
                        bgcolor: "#dcfce7",
                        color: GREEN,
                      }}
                    />
                  </Stack>

                  {liveHistory.length === 0 ? (
                    <Box
                      sx={{
                        py: 3,
                        textAlign: "center",
                        border: "1px dashed #cbd5e1",
                        borderRadius: 2,
                        bgcolor: "#f8fafc",
                      }}
                    >
                      <ElectricCar
                        sx={{
                          fontSize: 28,
                          color: "#cbd5e1",
                        }}
                      />

                      <Typography
                        fontSize={12}
                        color="#94a3b8"
                        mt={0.5}
                      >
                        No admin-started live sessions.
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        overflowX: "auto",
                      }}
                    >
                      <Box
                        component="table"
                        sx={{
                          width: "100%",
                          borderCollapse:
                            "collapse",
                          minWidth: 850,
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background:
                                "#f8fafc",
                            }}
                          >
                            {[
                              "Status",
                              "User",
                              "Device",
                              "Charge",
                              "Energy",
                              "Duration",
                              "Started",
                            ].map((heading) => (
                              <th
                                key={heading}
                                style={{
                                  padding:
                                    "10px 12px",
                                  textAlign:
                                    "left",
                                  fontSize: 10,
                                  fontWeight:
                                    800,
                                  color:
                                    "#64748b",
                                  textTransform:
                                    "uppercase",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {heading}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {liveHistory.map(
                            (session) => (
                              <tr
                                key={
                                  session._id
                                }
                                style={{
                                  borderBottom:
                                    "1px solid #f1f5f9",
                                }}
                              >
                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                  }}
                                >
                                  <StatusChip
                                    status={
                                      session.status
                                    }
                                  />
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                  }}
                                >
                                  <Typography
                                    fontSize={
                                      12
                                    }
                                    fontWeight={
                                      700
                                    }
                                  >
                                    {session
                                      ?.user
                                      ?.name ||
                                      "—"}
                                  </Typography>

                                  <Typography
                                    fontSize={
                                      10
                                    }
                                    color="#94a3b8"
                                  >
                                    {session
                                      ?.user
                                      ?.mobile ||
                                      ""}
                                  </Typography>
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontFamily:
                                      "monospace",
                                    fontSize: 11,
                                  }}
                                >
                                  {
                                    session.deviceId
                                  }
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontSize: 12,
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  {money(
                                    session.amountPaid
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontSize: 12,
                                  }}
                                >
                                  {number(
                                    session.energyConsumed,
                                    3
                                  )}{" "}
                                  /{" "}
                                  {number(
                                    session.energySelected,
                                    3
                                  )}{" "}
                                  kWh
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontSize: 12,
                                  }}
                                >
                                  {formatDuration(
                                    session.startTime
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontSize: 11,
                                    color:
                                      "#64748b",
                                  }}
                                >
                                  {formatDate(
                                    session.startTime
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </Box>
                    </Box>
                  )}
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Past section */}

                <Box>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    mb={1.25}
                  >
                    <Timeline
                      sx={{
                        fontSize: 18,
                        color: BLUE,
                      }}
                    />

                    <Typography
                      fontSize={12}
                      fontWeight={800}
                    >
                      Past Sessions
                    </Typography>

                    <Chip
                      size="small"
                      label={pastHistory.length}
                      sx={{
                        height: 19,
                        fontSize: 9,
                        fontWeight: 800,
                        bgcolor: "#dbeafe",
                        color: BLUE,
                      }}
                    />
                  </Stack>

                  {pastHistory.length === 0 ? (
                    <Box
                      sx={{
                        py: 3,
                        textAlign: "center",
                        border: "1px dashed #cbd5e1",
                        borderRadius: 2,
                        bgcolor: "#f8fafc",
                      }}
                    >
                      <Typography
                        fontSize={12}
                        color="#94a3b8"
                      >
                        No admin-started past sessions.
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        overflowX: "auto",
                      }}
                    >
                      <Box
                        component="table"
                        sx={{
                          width: "100%",
                          borderCollapse:
                            "collapse",
                          minWidth: 900,
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background:
                                "#f8fafc",
                            }}
                          >
                            {[
                              "Status",
                              "User",
                              "Device",
                              "Paid",
                              "Used",
                              "Energy",
                              "Started",
                              "Ended",
                            ].map((heading) => (
                              <th
                                key={heading}
                                style={{
                                  padding:
                                    "10px 12px",
                                  textAlign:
                                    "left",
                                  fontSize: 10,
                                  fontWeight:
                                    800,
                                  color:
                                    "#64748b",
                                  textTransform:
                                    "uppercase",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {heading}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {pastHistory.map(
                            (session) => (
                              <tr
                                key={
                                  session._id
                                }
                                style={{
                                  borderBottom:
                                    "1px solid #f1f5f9",
                                }}
                              >
                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                  }}
                                >
                                  <StatusChip
                                    status={
                                      session.status
                                    }
                                  />
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                  }}
                                >
                                  <Typography
                                    fontSize={
                                      12
                                    }
                                    fontWeight={
                                      700
                                    }
                                  >
                                    {session
                                      ?.user
                                      ?.name ||
                                      "—"}
                                  </Typography>

                                  <Typography
                                    fontSize={
                                      10
                                    }
                                    color="#94a3b8"
                                  >
                                    {session
                                      ?.user
                                      ?.mobile ||
                                      ""}
                                  </Typography>
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontFamily:
                                      "monospace",
                                    fontSize: 11,
                                  }}
                                >
                                  {
                                    session.deviceId
                                  }
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontSize: 12,
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  {money(
                                    session.amountPaid
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontSize: 12,
                                  }}
                                >
                                  {money(
                                    session.amountUsed
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontSize: 12,
                                  }}
                                >
                                  {number(
                                    session.energyConsumed,
                                    3
                                  )}{" "}
                                  kWh
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontSize: 11,
                                    color:
                                      "#64748b",
                                  }}
                                >
                                  {formatDate(
                                    session.startTime
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "11px 12px",
                                    fontSize: 11,
                                    color:
                                      "#64748b",
                                  }}
                                >
                                  {formatDate(
                                    session.endTime
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
}