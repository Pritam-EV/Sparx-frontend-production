// src/features/admin/UsersManagement.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import EmailIcon from "@mui/icons-material/Email";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";

import { apiFetch } from "../../utils/apiFetch";

// ============================================================
// THEME
// ============================================================

const FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const ROLE_COLORS = {
  admin: {
    bg: "#fff1f2",
    color: "#be123c",
    border: "#fecdd3",
  },
  owner: {
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fde68a",
  },
  customer: {
    bg: "#ecfeff",
    color: "#0e7490",
    border: "#a5f3fc",
  },
  accountant: {
    bg: "#f5f3ff",
    color: "#6d28d9",
    border: "#ddd6fe",
  },
};

const AVATAR_COLORS = [
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#059669",
  "#d97706",
  "#dc2626",
  "#2563eb",
];

const avatarColor = (name = "") => {
  const value = String(name || "");
  const index = [...value].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );

  return AVATAR_COLORS[index % AVATAR_COLORS.length];
};

const initials = (name = "") =>
  String(name || "U")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getRoleColor = (role) =>
  ROLE_COLORS[role] || {
    bg: "#f1f5f9",
    color: "#475569",
    border: "#e2e8f0",
  };

// ============================================================
// FORMATTING HELPERS
// ============================================================

function joinedAgo(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (diffSeconds < 60) {
    return "Just now";
  }

  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  }

  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  }

  if (diffSeconds < 2592000) {
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtBalance(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return null;
  }

  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizedText(value) {
  return String(value || "").trim();
}

function normalizeModelKey(value) {
  return normalizedText(value).toLocaleLowerCase("en-IN");
}

// ============================================================
// KPI SUMMARY CARD
// ============================================================

function KPI({
  label,
  value,
  color = "#0891b2",
  hint,
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        minWidth: 0,
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        background:
          "linear-gradient(145deg, #ffffff 55%, #f8fafc 100%)",
        transition: "border-color .18s ease, transform .18s ease",
        "&:hover": {
          borderColor: color,
          transform: "translateY(-2px)",
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.5, sm: 2 },
          "&:last-child": {
            pb: { xs: 1.5, sm: 2 },
          },
        }}
      >
        <Typography
          sx={{
            color: "#64748b",
            fontSize: { xs: 10, sm: 11 },
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".055em",
            lineHeight: 1.5,
            overflowWrap: "anywhere",
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            mt: 0.7,
            fontSize: { xs: 23, sm: 28 },
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-.04em",
            color,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Typography>

        {hint && (
          <Typography
            sx={{
              mt: 0.5,
              fontSize: 10.5,
              color: "#94a3b8",
              overflowWrap: "anywhere",
            }}
          >
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// REUSABLE DETAIL ROW
// ============================================================

function DetailRow({
  label,
  value,
  icon: Icon,
  mono = false,
}) {
  const displayValue =
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
      ? value
      : "—";

  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      spacing={1.5}
      sx={{ py: 1.4 }}
    >
      {Icon && (
        <Box
          sx={{
            mt: 0.2,
            width: 34,
            height: 34,
            borderRadius: 2,
            background: "#f1f5f9",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 17 }} />
        </Box>
      )}

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 800,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            mt: 0.35,
            fontSize: 13.5,
            fontWeight: 700,
            color: "#0f172a",
            fontFamily: mono ? "monospace" : FONT,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {displayValue}
        </Typography>
      </Box>
    </Stack>
  );
}

// ============================================================
// USER CARD — DEFAULT COMPACT VIEW
// ============================================================

function UserCard({
  user,
  walletBalance,
  walletLoading,
  onOpen,
}) {
  const roleColor = getRoleColor(user.role);

  const name = user.name || "Unnamed user";
  const model = normalizedText(user.vehicleModel);
  const plate = normalizedText(
    user.vehicleNumber || user.vehicleReg
  );

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(user);
    }
  };

  return (
    <Card
      component="article"
      elevation={0}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${name}`}
      onClick={() => onOpen(user)}
      onKeyDown={handleKeyDown}
      sx={{
        height: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 3.5,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        cursor: "pointer",
        outline: "none",
        transition:
          "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: "#a5dfe2",
          boxShadow: "0 12px 30px rgba(15, 23, 42, .07)",
        },
        "&:focus-visible": {
          boxShadow: "0 0 0 3px rgba(8, 145, 178, .25)",
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.75, sm: 2 },
          flex: 1,
          "&:last-child": {
            pb: { xs: 1.75, sm: 2 },
          },
        }}
      >
        {/* User identity */}

        <Stack
          direction="row"
          alignItems="flex-start"
          spacing={1.4}
        >
          <Avatar
            sx={{
              width: 46,
              height: 46,
              flexShrink: 0,
              bgcolor: avatarColor(name),
              fontSize: 14,
              fontWeight: 900,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
            }}
          >
            {initials(name)}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={1}
            >
              <Typography
                sx={{
                  color: "#0f172a",
                  fontSize: 14,
                  fontWeight: 850,
                  lineHeight: 1.35,
                  overflowWrap: "anywhere",
                }}
              >
                {name}
              </Typography>

              <Chip
                label={user.role || "customer"}
                size="small"
                sx={{
                  flexShrink: 0,
                  height: 22,
                  background: roleColor.bg,
                  color: roleColor.color,
                  border: `1px solid ${roleColor.border}`,
                  fontWeight: 800,
                  textTransform: "capitalize",
                  fontSize: 10,
                  "& .MuiChip-label": {
                    px: 0.8,
                  },
                }}
              />
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={0.65}
              sx={{ mt: 0.7, minWidth: 0 }}
            >
              <PhoneAndroidIcon
                sx={{
                  fontSize: 14,
                  color: "#94a3b8",
                  flexShrink: 0,
                }}
              />

              <Typography
                sx={{
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 600,
                  overflowWrap: "anywhere",
                }}
              >
                {user.mobile || "No mobile number"}
              </Typography>
            </Stack>

            {user.email && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.65}
                sx={{ mt: 0.35, minWidth: 0 }}
              >
                <EmailIcon
                  sx={{
                    fontSize: 14,
                    color: "#94a3b8",
                    flexShrink: 0,
                  }}
                />

                <Typography
                  sx={{
                    color: "#64748b",
                    fontSize: 11.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </Typography>
              </Stack>
            )}
          </Box>
        </Stack>

        <Divider sx={{ my: 1.6, borderColor: "#f1f5f9" }} />

        {/* Vehicle model and registration appear in the card.
            The complete model-count summary stays collapsed below. */}

        <Box
          sx={{
            p: 1.4,
            borderRadius: 2.5,
            background: "#f8fafc",
            border: "1px solid #edf2f7",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.8}
          >
            <DirectionsCarIcon
              sx={{ fontSize: 17, color: "#0e7490" }}
            />

            <Typography
              sx={{
                color: "#64748b",
                fontSize: 10.5,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              Vehicle
            </Typography>
          </Stack>

          <Typography
            sx={{
              mt: 0.65,
              fontSize: 13,
              fontWeight: 800,
              color: model ? "#0f172a" : "#94a3b8",
              overflowWrap: "anywhere",
            }}
          >
            {model || "Model not specified"}
          </Typography>

          {user.vehicleType && (
            <Typography
              sx={{
                mt: 0.2,
                color: "#64748b",
                fontSize: 11,
              }}
            >
              {user.vehicleType}
            </Typography>
          )}

          {plate ? (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                mt: 1,
                px: 1,
                py: 0.5,
                borderRadius: 1.5,
                border: "1px dashed #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontFamily: "monospace",
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: ".045em",
                maxWidth: "100%",
                overflowWrap: "anywhere",
              }}
            >
              {plate}
            </Box>
          ) : (
            <Typography
              sx={{
                display: "inline-block",
                mt: 0.8,
                color: "#94a3b8",
                fontSize: 10.5,
              }}
            >
              Registration number not provided
            </Typography>
          )}
        </Box>

        {/* Verification, wallet and join date */}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
          gap={1}
          sx={{ mt: 1.5 }}
        >
          <Chip
            icon={
              <VerifiedUserIcon
                sx={{ fontSize: "15px !important" }}
              />
            }
            label={
              user.phoneVerified
                ? "Phone verified"
                : "Not verified"
            }
            size="small"
            sx={{
              maxWidth: "100%",
              background: user.phoneVerified
                ? "#ecfdf5"
                : "#fff7ed",
              color: user.phoneVerified
                ? "#047857"
                : "#c2410c",
              border: `1px solid ${
                user.phoneVerified ? "#a7f3d0" : "#fed7aa"
              }`,
              fontWeight: 750,
              fontSize: 10,
              "& .MuiChip-icon": {
                color: "inherit",
              },
            }}
          />

          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
          >
            <AccountBalanceWalletIcon
              sx={{
                color: "#0e7490",
                fontSize: 15,
              }}
            />

            {walletLoading ? (
              <Skeleton width={60} height={16} />
            ) : (
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 850,
                  color:
                    walletBalance == null
                      ? "#94a3b8"
                      : "#0e7490",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtBalance(walletBalance) || "—"}
              </Typography>
            )}
          </Stack>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: 1.5 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.6}
            sx={{ minWidth: 0 }}
          >
            <CalendarTodayIcon
              sx={{
                fontSize: 13,
                color: "#94a3b8",
                flexShrink: 0,
              }}
            />

            <Typography
              sx={{
                color: "#94a3b8",
                fontSize: 10.5,
              }}
            >
              Joined {joinedAgo(user.createdAt)}
            </Typography>
          </Stack>

          <Typography
            sx={{
              color: "#0e7490",
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            View details →
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function UsersManagement() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Preserve the existing filters.
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const [selected, setSelected] = useState(null);

  const [walletMap, setWalletMap] = useState({});
  const [walletLoading, setWalletLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // ==========================================================
  // LOAD USERS
  // ==========================================================

  const load = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiFetch("/api/users");

      const userList = Array.isArray(response)
        ? response
        : Array.isArray(response?.users)
        ? response.users
        : [];

      const sorted = [...userList].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setUsers(sorted);
    } catch (err) {
      console.error("Failed to load users:", err);

      setError(
        err?.message || "Could not load users. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ==========================================================
  // FETCH WALLET BALANCES
  // Use small batches rather than firing every request at once.
  // ==========================================================

  const fetchAllWallets = useCallback(async (userList) => {
    if (!userList.length) {
      setWalletMap({});
      return;
    }

    setWalletLoading(true);

    try {
      const nextMap = {};

      const batchSize = 20;

      for (
        let start = 0;
        start < userList.length;
        start += batchSize
      ) {
        const batch = userList.slice(
          start,
          start + batchSize
        );

        const results = await Promise.all(
          batch.map(async (user) => {
            try {
              const response = await apiFetch(
                `/api/wallet/admin/balance/${encodeURIComponent(
                  user._id
                )}`
              );

              const balance =
                typeof response === "number"
                  ? response
                  : response?.balance ?? 0;

              return {
                id: user._id,
                balance: Number.isFinite(Number(balance))
                  ? Number(balance)
                  : null,
              };
            } catch {
              return {
                id: user._id,
                balance: null,
              };
            }
          })
        );

        results.forEach(({ id, balance }) => {
          nextMap[id] = balance;
        });
      }

      setWalletMap(nextMap);
    } catch (err) {
      console.error("Failed to fetch wallet balances:", err);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      fetchAllWallets(users);
    } else {
      setWalletMap({});
    }
  }, [users, fetchAllWallets]);

  // ==========================================================
  // SUMMARY CARDS — PRESERVED
  // ==========================================================

  const stats = useMemo(() => {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    return {
      total: users.length,

      admins: users.filter(
        (user) => user.role === "admin"
      ).length,

      owners: users.filter(
        (user) => user.role === "owner"
      ).length,

      customers: users.filter(
        (user) => user.role === "customer"
      ).length,

      verified: users.filter(
        (user) => user.phoneVerified
      ).length,

      newToday: users.filter(
        (user) =>
          user.createdAt &&
          new Date(user.createdAt) >= startOfToday
      ).length,

      newWeek: users.filter(
        (user) =>
          user.createdAt &&
          new Date(user.createdAt) >= startOfWeek
      ).length,

      newMonth: users.filter(
        (user) =>
          user.createdAt &&
          new Date(user.createdAt) >= startOfMonth
      ).length,
    };
  }, [users]);

  // ==========================================================
  // FILTERING — KEEP EXISTING SEARCH + ROLE BEHAVIOUR
  // ==========================================================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const searchText = [
        user.name,
        user.mobile,
        user.email,
      ]
        .map((value) => String(value || ""))
        .join(" ")
        .toLowerCase();

      const matchSearch =
        !query || searchText.includes(query);

      const matchRole =
        !role || user.role === role;

      return matchSearch && matchRole;
    });
  }, [users, search, role]);

  // ==========================================================
  // VEHICLE MODEL COUNTS
  // Collapsed by default in the UI.
  //
  // The current User schema stores one primary vehicle per user.
  // Counts therefore reflect vehicle profiles/registrations.
  // ==========================================================

  const vehicleBreakdown = useMemo(() => {
    const map = new Map();

    users.forEach((user) => {
      const model = normalizedText(user.vehicleModel);
      const plate = normalizedText(
        user.vehicleNumber || user.vehicleReg
      );
      const vehicleType = normalizedText(user.vehicleType);

      // Ignore users without any vehicle information.
      if (!model && !plate && !vehicleType) {
        return;
      }

      const label = model || "Model not specified";
      const key = normalizeModelKey(label);

      if (!map.has(key)) {
        map.set(key, {
          model: label,
          count: 0,
          registrations: [],
          vehicleTypes: new Set(),
        });
      }

      const row = map.get(key);

      row.count += 1;

      if (vehicleType) {
        row.vehicleTypes.add(vehicleType);
      }

      row.registrations.push({
        userId: user._id,
        userName: user.name || "Unnamed user",
        vehicleNumber: plate,
        vehicleType,
      });
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        vehicleTypes: [...row.vehicleTypes],
      }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return a.model.localeCompare(b.model);
      });
  }, [users]);

  const totalVehicleProfiles = vehicleBreakdown.reduce(
    (sum, row) => sum + row.count,
    0
  );

  const distinctVehicleModels = vehicleBreakdown.filter(
    (row) => row.model !== "Model not specified"
  ).length;

  // ==========================================================
  // OPEN USER DETAILS
  // ==========================================================

  const openUser = (user) => {
    setActionError("");
    setSelected(user);
  };

  const closeUser = () => {
    setActionError("");
    setSelected(null);
  };

  // ==========================================================
  // EDIT USER
  // ==========================================================

  const handleEdit = () => {
    if (!selected?._id) return;

    const id = selected._id;

    setSelected(null);
    navigate(`/admin/crud/users/edit/${id}`);
  };

  // ==========================================================
  // DELETE USER
  // Uses the existing DELETE /api/users/:id endpoint.
  // ==========================================================

  const handleDelete = async () => {
    if (!selected?._id || deleteLoading) return;

    const confirmed = window.confirm(
      `Delete the account for "${selected.name || "this user"}"?\n\n` +
        "This removes the user account. Review linked transactions " +
        "and records before confirming."
    );

    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      setActionError("");

      await apiFetch(
        `/api/users/${encodeURIComponent(selected._id)}`,
        { method: "DELETE" }
      );

      setUsers((previous) =>
        previous.filter(
          (user) => user._id !== selected._id
        )
      );

      setWalletMap((previous) => {
        const next = { ...previous };
        delete next[selected._id];
        return next;
      });

      setSelected(null);
    } catch (err) {
      console.error("Could not delete user:", err);

      setActionError(
        err?.message || "Could not delete this user."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  const summaryCards = [
    {
      label: "Total Users",
      value: stats.total,
      color: "#1d4ed8",
    },
    {
      label: "Customers",
      value: stats.customers,
      color: "#0891b2",
    },
    {
      label: "Owners",
      value: stats.owners,
      color: "#d97706",
    },
    {
      label: "Admins",
      value: stats.admins,
      color: "#dc2626",
    },
    {
      label: "Verified",
      value: stats.verified,
      color: "#16a34a",
    },
    {
      label: "Today",
      value: stats.newToday,
      color: "#7c3aed",
    },
    {
      label: "This Week",
      value: stats.newWeek,
      color: "#db2777",
    },
    {
      label: "This Month",
      value: stats.newMonth,
      color: "#059669",
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1600,
        mx: "auto",
        px: {
          xs: 1.5,
          sm: 2.5,
          md: 3,
          lg: 3.5,
        },
        py: {
          xs: 2,
          sm: 2.5,
          md: 3,
        },
        boxSizing: "border-box",
        fontFamily: FONT,
        color: "#0f172a",
      }}
    >
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.2}
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                color: "#0e7490",
                background:
                  "linear-gradient(135deg, #cffafe, #e0f2fe)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PersonIcon sx={{ fontSize: 23 }} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="h1"
                sx={{
                  fontSize: {
                    xs: 22,
                    sm: 26,
                    md: 29,
                  },
                  lineHeight: 1.15,
                  fontWeight: 900,
                  letterSpacing: "-.045em",
                  color: "#0f172a",
                }}
              >
                Users Management
              </Typography>

              <Typography
                sx={{
                  mt: 0.6,
                  fontSize: 12.5,
                  color: "#64748b",
                  lineHeight: 1.6,
                }}
              >
                User accounts, registered vehicles and wallets
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            refreshing ? (
              <CircularProgress size={16} />
            ) : (
              <RefreshIcon />
            )
          }
          onClick={() => load(true)}
          disabled={loading || refreshing}
          sx={{
            alignSelf: {
              xs: "stretch",
              sm: "center",
            },
            minHeight: 40,
            px: 2,
            borderRadius: 2.5,
            borderColor: "#cbd5e1",
            color: "#334155",
            fontSize: 12,
            fontWeight: 800,
            textTransform: "none",
            whiteSpace: "nowrap",
            "&:hover": {
              borderColor: "#0891b2",
              background: "#f0fdfa",
            },
          }}
        >
          {refreshing ? "Refreshing…" : "Refresh users"}
        </Button>
      </Stack>

      {error && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => load(true)}
            >
              Retry
            </Button>
          }
          sx={{
            mb: 2,
            borderRadius: 2.5,
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </Alert>
      )}

      {/* ======================================================
          SUMMARY CARDS — PRESERVED FROM THE CURRENT PAGE
      ====================================================== */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(4, minmax(0, 1fr))",
          },
          gap: { xs: 1, sm: 1.4 },
          mb: 2.5,
        }}
      >
        {summaryCards.map((item) => (
          <KPI
            key={item.label}
            label={item.label}
            value={item.value}
            color={item.color}
          />
        ))}
      </Box>

      {/* ======================================================
          VEHICLE MODEL BREAKDOWN
          COLLAPSED BY DEFAULT — NOT PART OF THE DEFAULT VIEW
      ====================================================== */}

      <Accordion
        disableGutters
        elevation={0}
        defaultExpanded={false}
        sx={{
          mb: 2.5,
          border: "1px solid #dbe5ed",
          borderRadius: "14px !important",
          overflow: "hidden",
          background: "#ffffff",
          "&:before": {
            display: "none",
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            minHeight: 66,
            px: { xs: 1.5, sm: 2.2 },
            "& .MuiAccordionSummary-content": {
              my: 1.3,
              minWidth: 0,
            },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.3}
            sx={{ minWidth: 0, flex: 1 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: "#ecfeff",
                color: "#0e7490",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <DirectionsCarIcon />
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 850,
                  color: "#0f172a",
                }}
              >
                Vehicle model breakdown
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                {distinctVehicleModels} model
                {distinctVehicleModels === 1 ? "" : "s"} ·{" "}
                {totalVehicleProfiles} registered vehicle profile
                {totalVehicleProfiles === 1 ? "" : "s"}
              </Typography>
            </Box>
          </Stack>
        </AccordionSummary>

        <AccordionDetails
          sx={{
            pt: 0,
            px: { xs: 1.5, sm: 2.2 },
            pb: 2,
          }}
        >
          <Divider sx={{ mb: 1.6 }} />

          {vehicleBreakdown.length === 0 ? (
            <Box
              sx={{
                py: 3,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <DirectionsCarIcon
                sx={{
                  color: "#cbd5e1",
                  fontSize: 34,
                  mb: 0.8,
                }}
              />

              <Typography fontSize={13} fontWeight={750}>
                No vehicle information available
              </Typography>

              <Typography fontSize={11.5} mt={0.4}>
                Model counts will appear when users register vehicle
                details.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
{vehicleBreakdown.map((row) => (
  <Box
    key={normalizeModelKey(row.model)}
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 2,
      p: { xs: 1.5, sm: 2 },
      border: "1px solid #e2e8f0",
      borderRadius: 2.5,
      background: "#fbfdff",
    }}
  >
    {/* Vehicle model */}
    <Typography
      sx={{
        minWidth: 0,
        fontSize: { xs: 12.5, sm: 13.5 },
        fontWeight: 800,
        color:
          row.model === "Model not specified"
            ? "#64748b"
            : "#0f172a",
        overflowWrap: "anywhere",
      }}
    >
      {row.model}
    </Typography>

    {/* Total quantity */}
    <Chip
      label={row.count}
      size="small"
      sx={{
        flexShrink: 0,
        minWidth: 44,
        height: 30,
        fontSize: 13,
        fontWeight: 900,
        color: "#0e7490",
        background: "#ecfeff",
        border: "1px solid #a5f3fc",
        "& .MuiChip-label": {
          px: 1.2,
        },
      }}
    />
  </Box>
))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

      {/* ======================================================
          FILTER BAR — SAME SEARCH + ROLE FILTER
      ====================================================== */}

      <Card
        elevation={0}
        sx={{
          mb: 2.5,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          background: "#ffffff",
        }}
      >
        <CardContent
          sx={{
            p: { xs: 1.5, sm: 2 },
            "&:last-child": {
              pb: { xs: 1.5, sm: 2 },
            },
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={1.3}
          >
            <TextField
              fullWidth
              placeholder="Search by name, phone, email…"
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2.2,
                  background: "#fbfdff",
                  fontSize: 12.5,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{
                        fontSize: 19,
                        color: "#94a3b8",
                      }}
                    />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 165 },
              }}
            >
              <InputLabel>Role</InputLabel>

              <Select
                label="Role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                sx={{
                  borderRadius: 2.2,
                  background: "#fbfdff",
                  fontSize: 12.5,
                }}
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="owner">Owner</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            <Typography
              sx={{
                minWidth: { sm: 90 },
                textAlign: { xs: "left", sm: "right" },
                fontSize: 11.5,
                color: "#64748b",
                whiteSpace: "nowrap",
              }}
            >
              {filtered.length} result
              {filtered.length === 1 ? "" : "s"}
            </Typography>
          </Stack>

          {(search || role) && (
            <Stack
              direction="row"
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              gap={0.8}
              sx={{
                mt: 1.3,
                pt: 1.3,
                borderTop: "1px dashed #e2e8f0",
              }}
            >
              <Typography
                sx={{ color: "#64748b", fontSize: 11 }}
              >
                Active filters:
              </Typography>

              {search && (
                <Chip
                  label={`Search: ${search}`}
                  size="small"
                  onDelete={() => setSearch("")}
                  sx={{
                    maxWidth: "100%",
                    fontSize: 10.5,
                  }}
                />
              )}

              {role && (
                <Chip
                  label={`Role: ${role}`}
                  size="small"
                  onDelete={() => setRole("")}
                  sx={{
                    fontSize: 10.5,
                    textTransform: "capitalize",
                  }}
                />
              )}

              <Button
                size="small"
                onClick={() => {
                  setSearch("");
                  setRole("");
                }}
                sx={{
                  ml: { sm: "auto" },
                  textTransform: "none",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                Clear filters
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* ======================================================
          USER LIST
      ====================================================== */}

      {loading ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
              xl: "repeat(4, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <Card
              key={index}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                >
                  <Skeleton
                    variant="circular"
                    width={46}
                    height={46}
                  />

                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="60%" height={20} />
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="65%" height={16} />
                  </Box>
                </Stack>

                <Skeleton
                  variant="rounded"
                  height={100}
                  sx={{ mt: 2, borderRadius: 2 }}
                />

                <Skeleton
                  width="55%"
                  height={16}
                  sx={{ mt: 1.5 }}
                />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : filtered.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
          }}
        >
          <CardContent
            sx={{
              textAlign: "center",
              py: { xs: 5, sm: 7 },
              px: 2,
            }}
          >
            <Box
              sx={{
                mx: "auto",
                mb: 1.5,
                width: 58,
                height: 58,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 3,
                color: "#94a3b8",
                background: "#f1f5f9",
              }}
            >
              <PersonIcon sx={{ fontSize: 30 }} />
            </Box>

            <Typography
              sx={{
                fontWeight: 850,
                fontSize: 15,
                color: "#0f172a",
              }}
            >
              No users found
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Try changing the search or role filter.
            </Typography>

            {(search || role) && (
              <Button
                onClick={() => {
                  setSearch("");
                  setRole("");
                }}
                sx={{
                  mt: 1.5,
                  textTransform: "none",
                  fontWeight: 800,
                }}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.3 }}
          >
            <Typography
              sx={{
                fontWeight: 850,
                fontSize: 13,
                color: "#334155",
              }}
            >
              User accounts
            </Typography>

            <Typography
              sx={{
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              Select a card to view full details
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },
              gap: { xs: 1.5, sm: 2 },
              alignItems: "stretch",
            }}
          >
            {filtered.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                walletBalance={walletMap[user._id] ?? null}
                walletLoading={
                  walletLoading &&
                  walletMap[user._id] === undefined
                }
                onOpen={openUser}
              />
            ))}
          </Box>
        </>
      )}

      {/* ======================================================
          USER DETAIL DRAWER
      ====================================================== */}

      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={closeUser}
        PaperProps={{
          sx: {
            width: {
              xs: "100%",
              sm: 440,
              md: 490,
            },
            maxWidth: "100vw",
            display: "flex",
            flexDirection: "column",
            background: "#f8fafc",
            boxSizing: "border-box",
          },
        }}
      >
        {selected && (
          <>
            {/* Drawer header */}

            <Box
              sx={{
                p: { xs: 2.2, sm: 2.8 },
                color: "#ffffff",
                background:
                  "linear-gradient(135deg, #0f172a 0%, #142d41 100%)",
              }}
            >
              <Stack
                direction="row"
                alignItems="flex-start"
                spacing={1.5}
              >
                <Avatar
                  sx={{
                    width: 54,
                    height: 54,
                    flexShrink: 0,
                    bgcolor: avatarColor(selected.name),
                    color: "#ffffff",
                    fontSize: 17,
                    fontWeight: 900,
                  }}
                >
                  {initials(selected.name)}
                </Avatar>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 18,
                      fontWeight: 900,
                      lineHeight: 1.3,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {selected.name || "Unnamed user"}
                  </Typography>

                  <Chip
                    label={selected.role || "customer"}
                    size="small"
                    sx={{
                      mt: 0.7,
                      height: 23,
                      color: getRoleColor(selected.role).color,
                      background:
                        getRoleColor(selected.role).bg,
                      border: `1px solid ${
                        getRoleColor(selected.role).border
                      }`,
                      fontWeight: 850,
                      fontSize: 10,
                      textTransform: "capitalize",
                    }}
                  />
                </Box>

                <IconButton
                  aria-label="Close user details"
                  onClick={closeUser}
                  sx={{
                    color: "#ffffff",
                    mt: -0.6,
                    mr: -0.6,
                    flexShrink: 0,
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>

              {/* Wallet balance */}

              <Box
                sx={{
                  mt: 2.4,
                  p: 2,
                  borderRadius: 2.5,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.06)",
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.9}
                >
                  <AccountBalanceWalletIcon
                    sx={{
                      color: "#67e8f9",
                      fontSize: 18,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 10.5,
                      color: "#a9bbc9",
                      fontWeight: 850,
                      letterSpacing: ".075em",
                    }}
                  >
                    WALLET BALANCE
                  </Typography>
                </Stack>

                {walletLoading &&
                walletMap[selected._id] === undefined ? (
                  <Skeleton
                    width={145}
                    height={40}
                    sx={{
                      mt: 0.6,
                      bgcolor: "rgba(255,255,255,.1)",
                    }}
                  />
                ) : (
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 28,
                      fontWeight: 900,
                      lineHeight: 1.2,
                      color: "#67e8f9",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtBalance(walletMap[selected._id]) || "—"}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Scrollable drawer body */}

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                overscrollBehavior: "contain",
                p: { xs: 2, sm: 2.5 },
              }}
            >
              {actionError && (
                <Alert
                  severity="error"
                  onClose={() => setActionError("")}
                  sx={{ mb: 2, borderRadius: 2 }}
                >
                  {actionError}
                </Alert>
              )}

              {/* Account details */}

              <Card
                elevation={0}
                sx={{
                  mb: 2,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    sx={{
                      mb: 0.5,
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#0f172a",
                    }}
                  >
                    Account details
                  </Typography>

                  <Divider sx={{ mb: 0.5 }} />

                  <DetailRow
                    label="User ID"
                    value={selected._id}
                    icon={BadgeOutlinedIcon}
                    mono
                  />

                  <Divider />

                  <DetailRow
                    label="Mobile number"
                    value={selected.mobile}
                    icon={PhoneAndroidIcon}
                  />

                  <Divider />

                  <DetailRow
                    label="Email"
                    value={selected.email}
                    icon={EmailIcon}
                  />

                  <Divider />

                  <DetailRow
                    label="Role"
                    value={selected.role}
                    icon={PersonIcon}
                  />

                  <Divider />

                  <DetailRow
                    label="GSTIN"
                    value={selected.gstin}
                    icon={BadgeOutlinedIcon}
                    mono
                  />

                  <Divider />

                  <DetailRow
                    label="Joined on"
                    value={formatDate(selected.createdAt)}
                    icon={CalendarTodayIcon}
                  />

                  <Divider />

                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.4}
                    sx={{ py: 1.4 }}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        background: "#f1f5f9",
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <VerifiedUserIcon sx={{ fontSize: 17 }} />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                        }}
                      >
                        Phone verification
                      </Typography>

                      <Chip
                        size="small"
                        label={
                          selected.phoneVerified
                            ? "Verified"
                            : "Not verified"
                        }
                        sx={{
                          mt: 0.6,
                          height: 23,
                          fontSize: 10.5,
                          fontWeight: 850,
                          background: selected.phoneVerified
                            ? "#dcfce7"
                            : "#fff7ed",
                          color: selected.phoneVerified
                            ? "#166534"
                            : "#c2410c",
                        }}
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Vehicle details */}

              <Card
                elevation={0}
                sx={{
                  mb: 2,
                  borderRadius: 3,
                  border: "1px solid #bae6fd",
                  background:
                    "linear-gradient(145deg, #ffffff, #f0f9ff)",
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 0.5 }}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        background: "#dff6ff",
                        color: "#0369a1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <DirectionsCarIcon />
                    </Box>

                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: "#0f172a",
                      }}
                    >
                      Vehicle details
                    </Typography>
                  </Stack>

                  <Divider sx={{ mb: 0.5 }} />

                  <DetailRow
                    label="Vehicle type"
                    value={selected.vehicleType}
                    icon={DirectionsCarIcon}
                  />

                  <Divider />

                  <DetailRow
                    label="Vehicle model"
                    value={selected.vehicleModel}
                    icon={DirectionsCarIcon}
                  />

                  <Divider />

                  <DetailRow
                    label="Registration number"
                    value={
                      selected.vehicleNumber ||
                      selected.vehicleReg
                    }
                    icon={BadgeOutlinedIcon}
                    mono
                  />
                </CardContent>
              </Card>
            </Box>

            {/* Drawer footer */}

            <Box
              sx={{
                p: { xs: 1.7, sm: 2.2 },
                borderTop: "1px solid #e2e8f0",
                background: "#ffffff",
                paddingBottom: {
                  xs: "max(16px, env(safe-area-inset-bottom))",
                  sm: 2.2,
                },
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="stretch"
              >
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<EditOutlinedIcon />}
                  onClick={handleEdit}
                  sx={{
                    minHeight: 42,
                    borderRadius: 2.2,
                    fontSize: 12,
                    fontWeight: 850,
                    textTransform: "none",
                    boxShadow: "none",
                    background:
                      "linear-gradient(135deg, #0e7490, #0891b2)",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #155e75, #0e7490)",
                      boxShadow: "none",
                    },
                  }}
                >
                  Edit User
                </Button>

                <Tooltip title="Delete this user account">
                  <span>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={
                        deleteLoading ? (
                          <CircularProgress
                            size={15}
                            color="inherit"
                          />
                        ) : (
                          <DeleteOutlineIcon />
                        )
                      }
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      sx={{
                        minHeight: 42,
                        borderRadius: 2.2,
                        px: { xs: 1, sm: 1.5 },
                        fontSize: 12,
                        fontWeight: 850,
                        textTransform: "none",
                      }}
                    >
                      Delete
                    </Button>
                  </span>
                </Tooltip>

                <Button
                  variant="outlined"
                  onClick={closeUser}
                  sx={{
                    minHeight: 42,
                    minWidth: { xs: 68, sm: 82 },
                    borderRadius: 2.2,
                    fontSize: 12,
                    fontWeight: 850,
                    textTransform: "none",
                    borderColor: "#cbd5e1",
                    color: "#475569",
                  }}
                >
                  Close
                </Button>
              </Stack>
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
}