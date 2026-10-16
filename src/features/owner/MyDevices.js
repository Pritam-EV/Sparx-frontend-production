// src/features/owner/MyDevices.js

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";
import { useNavigate } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HistoryIcon from "@mui/icons-material/History";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import DeviceHubOutlinedIcon from "@mui/icons-material/DeviceHubOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CloseIcon from "@mui/icons-material/Close";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

const C = {
  teal: "#04BFBF",
  tealDark: "#038a8a",
  tealLight: "#e8fbfb",

  bg: "#f5f7fa",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",

  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",

  green: "#15803d",
  greenBg: "#dcfce7",

  orange: "#c2410c",
  orangeBg: "#ffedd5",

  red: "#dc2626",
  redBg: "#fee2e2",
};

const FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const METER_TYPES = [
  "Green Meter",
  "Commercial",
  "Residential",
];

// ------------------------------------------------------------
// FORMATTERS
// ------------------------------------------------------------

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const number = (value, digits = 3) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const displayValue = (value) =>
  value === undefined ||
  value === null ||
  String(value).trim() === ""
    ? "—"
    : String(value);

const getStatusStyle = (status) => {
  const value = String(status || "").trim().toLowerCase();

  if (
    value === "available" ||
    value === "online"
  ) {
    return {
      bgcolor: C.greenBg,
      color: C.green,
    };
  }

  if (
    value === "occupied" ||
    value === "busy"
  ) {
    return {
      bgcolor: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (
    value === "maintenance" ||
    value === "unknown"
  ) {
    return {
      bgcolor: C.orangeBg,
      color: C.orange,
    };
  }

  if (
    value === "faulty" ||
    value === "error"
  ) {
    return {
      bgcolor: C.redBg,
      color: C.red,
    };
  }

  return {
    bgcolor: "#e2e8f0",
    color: "#334155",
  };
};

// ------------------------------------------------------------
// FIELD ROW
// ------------------------------------------------------------

function FieldRow({ label, value, valueNode, fullWidth = false }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "flex-start" },
        justifyContent: "space-between",
        gap: { xs: 0.35, sm: 1.5 },
        py: 0.9,
        width: "100%",
        gridColumn: fullWidth ? "1 / -1" : "auto",
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          color: C.muted,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: FONT,
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>

      {valueNode || (
        <Typography
          sx={{
            color: C.text,
            fontSize: 12,
            fontWeight: 650,
            textAlign: { xs: "left", sm: "right" },
            maxWidth: { xs: "100%", sm: "66%" },
            minWidth: 0,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            fontFamily: FONT,
          }}
        >
          {displayValue(value)}
        </Typography>
      )}
    </Box>
  );
}

// ------------------------------------------------------------
// DEVICE CARD
// ------------------------------------------------------------

function DeviceCard({
  device,
  onEditDetails,
  onEditRate,
  onViewRateHistory,
}) {
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  const statusStyle = getStatusStyle(device.status);

  const energyValue =
    device.totalEnergy ??
    device.totalenergy ??
    null;

  const hasEnergy =
    energyValue !== null &&
    energyValue !== undefined &&
    Number.isFinite(Number(energyValue));

  const latitude =
    device.lat !== null && device.lat !== undefined
      ? Number(device.lat).toFixed(6)
      : "—";

  const longitude =
    device.lng !== null && device.lng !== undefined
      ? Number(device.lng).toFixed(6)
      : "—";

  const password = String(device.wifiPassword || "");

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: `1px solid ${C.border}`,
        borderRadius: 3,
        bgcolor: C.surface,
        boxShadow: "0 2px 7px rgba(15,23,42,0.04)",
        transition: "box-shadow 0.18s, transform 0.18s",
        "&:hover": {
          boxShadow: "0 7px 24px rgba(15,23,42,0.08)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.7, sm: 2.2 },
          "&:last-child": { pb: { xs: 1.7, sm: 2.2 } },
        }}
      >
        {/* Header: device ID and current status */}
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 0.6 }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.8}
              sx={{ minWidth: 0 }}
            >
              <DeviceHubOutlinedIcon
                sx={{
                  fontSize: 20,
                  color: C.tealDark,
                  flexShrink: 0,
                }}
              />

              <Typography
                sx={{
                  color: C.text,
                  fontSize: 16,
                  fontWeight: 800,
                  overflowWrap: "anywhere",
                  fontFamily: FONT,
                }}
              >
                {device.deviceId || "Charger"}
              </Typography>
            </Stack>

            <Typography
              sx={{
                color: C.muted,
                fontSize: 11,
                mt: 0.65,
                pl: 3.5,
                overflowWrap: "anywhere",
                fontFamily: FONT,
              }}
            >
              {device.project || "VIZ Smart Charging"}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={device.status || "Unknown"}
            sx={{
              ...statusStyle,
              height: "auto",
              minHeight: 23,
              maxWidth: "42%",
              fontWeight: 800,
              fontSize: 10,
              "& .MuiChip-label": {
                whiteSpace: "normal",
                textAlign: "center",
                px: 1,
              },
            }}
          />
        </Stack>

        {/* Human-readable device location */}
        <Stack
          direction="row"
          alignItems="flex-start"
          spacing={0.7}
          sx={{ mt: 1.2, mb: 1.3 }}
        >
          <PlaceOutlinedIcon
            sx={{
              color: C.muted,
              fontSize: 17,
              mt: 0.15,
              flexShrink: 0,
            }}
          />

          <Typography
            sx={{
              color: C.muted,
              fontSize: 12,
              lineHeight: 1.5,
              overflowWrap: "anywhere",
              fontFamily: FONT,
            }}
          >
            {device.location ||
              [device.city, device.state].filter(Boolean).join(", ") ||
              "Location not configured"}
          </Typography>
        </Stack>

        <Divider sx={{ borderColor: C.border, mb: 0.5 }} />

        {/* Main summary: current tariff and total energy */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1,
            my: 1.1,
          }}
        >
          <Box
            sx={{
              p: 1.3,
              borderRadius: 2.5,
              bgcolor: C.tealLight,
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                color: C.tealDark,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              TOTAL ENERGY
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              spacing={0.6}
              sx={{ mt: 0.8 }}
            >
              <BoltIcon
                sx={{
                  color: C.tealDark,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              />

              <Typography
                sx={{
                  color: C.text,
                  fontSize: { xs: 15, sm: 17 },
                  fontWeight: 800,
                  overflowWrap: "anywhere",
                  fontFamily: FONT,
                }}
              >
                {hasEnergy
                  ? `${number(energyValue)} kWh`
                  : "—"}
              </Typography>
            </Stack>
          </Box>

          <Box
            sx={{
              p: 1.3,
              borderRadius: 2.5,
              bgcolor: C.surfaceAlt,
              border: `1px solid ${C.border}`,
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                color: C.muted,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              TARIFF
            </Typography>

            <Typography
              sx={{
                color: C.text,
                fontSize: { xs: 15, sm: 17 },
                fontWeight: 800,
                mt: 0.8,
                overflowWrap: "anywhere",
                fontFamily: FONT,
              }}
            >
              {money(device.rateInclGst)}
              <Typography
                component="span"
                sx={{
                  color: C.muted,
                  fontSize: 10,
                  fontWeight: 500,
                  ml: 0.35,
                }}
              >
                /kWh
              </Typography>
            </Typography>
          </Box>
        </Box>

        {/* Device metadata */}
        <FieldRow
          label="Serial number"
          value={device.serialNumber}
        />

        <FieldRow
          label="Charger type"
          value={device.chargerType}
        />

        <FieldRow
          label="Meter number"
          value={device.meterConsumerNumber}
        />

        <FieldRow
          label="Meter type"
          value={device.meterType}
        />

        <FieldRow
          label="City"
          value={device.city}
        />

        <FieldRow
          label="State"
          value={device.state}
        />

        <FieldRow
          label="Latitude"
          value={latitude}
        />

        <FieldRow
          label="Longitude"
          value={longitude}
        />

        <Divider sx={{ borderColor: C.border, my: 1 }} />

        {/* Current Wi-Fi credentials, masked by default */}
        <Typography
          sx={{
            color: C.text,
            fontSize: 12,
            fontWeight: 800,
            mb: 0.4,
          }}
        >
          Wi-Fi configuration
        </Typography>

        <FieldRow
          label="Wi-Fi SSID"
          value={device.wifiSSID}
          fullWidth
        />

        <FieldRow
          label="Current Wi-Fi password"
          fullWidth
          valueNode={
            <Stack
              direction="row"
              spacing={0.4}
              alignItems="center"
              sx={{
                maxWidth: { xs: "100%", sm: "68%" },
                minWidth: 0,
              }}
            >
              <Typography
                sx={{
                  color: password ? C.text : C.muted,
                  fontSize: 12,
                  fontWeight: 650,
                  minWidth: 0,
                  textAlign: { xs: "left", sm: "right" },
                  overflowWrap: "anywhere",
                  wordBreak: "break-all",
                  fontFamily: FONT,
                }}
              >
                {!password
                  ? "Not configured"
                  : showWifiPassword
                  ? password
                  : "••••••••••••"}
              </Typography>

              {password && (
                <Tooltip
                  title={
                    showWifiPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <IconButton
                    size="small"
                    aria-label={
                      showWifiPassword
                        ? "Hide Wi-Fi password"
                        : "Show Wi-Fi password"
                    }
                    onClick={() =>
                      setShowWifiPassword((previous) => !previous)
                    }
                    sx={{
                      color: C.tealDark,
                      flexShrink: 0,
                      p: 0.5,
                    }}
                  >
                    {showWifiPassword ? (
                      <VisibilityOffOutlinedIcon sx={{ fontSize: 17 }} />
                    ) : (
                      <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          }
        />

        <Typography
          sx={{
            color: C.muted,
            fontSize: 10,
            mt: 0.7,
            lineHeight: 1.5,
          }}
        >
          Wi-Fi credentials are hidden until you reveal them.
        </Typography>

        <Divider sx={{ borderColor: C.border, my: 1.3 }} />

        {/* Device actions */}
        <Stack spacing={1}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            onClick={() => onEditDetails(device)}
            sx={{
              bgcolor: C.teal,
              color: "#042f2e",
              borderRadius: 2.5,
              py: 1,
              fontWeight: 800,
              textTransform: "none",
              "&:hover": { bgcolor: "#03aaaa" },
            }}
          >
            Edit Device Details
          </Button>

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => onEditRate(device)}
              sx={{
                borderColor: C.border,
                color: C.text,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 2,
              }}
            >
              Edit Tariff
            </Button>

            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => onViewRateHistory(device)}
              sx={{
                borderColor: C.border,
                color: C.text,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 2,
              }}
            >
              Rate History
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------
// MAIN PAGE
// ------------------------------------------------------------

export default function MyDevices() {
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  // Details editor.
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [detailsForm, setDetailsForm] = useState({
    meterConsumerNumber: "",
    meterType: "",
    location: "",
    city: "",
    state: "",
    lat: "",
    lng: "",
  });

  // Tariff editor.
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [rateDevice, setRateDevice] = useState(null);
  const [rateForm, setRateForm] = useState({
    rateInclGst: "",
    reason: "",
  });

  // Rate history.
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDevice, setHistoryDevice] = useState(null);
  const [rateHistory, setRateHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Debounce device search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setAppliedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // ----------------------------------------------------------
  // LOAD DEVICES
  // ----------------------------------------------------------

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
      });

      if (appliedSearch) {
        params.set("search", appliedSearch);
      }

      const result = await apiFetch(
        `/api/owner/devices?${params.toString()}`
      );

      setDevices(
        Array.isArray(result?.items)
          ? result.items
          : []
      );

      setPagination({
        total: Number(result?.pagination?.total || 0),
        totalPages: Number(result?.pagination?.totalPages || 0),
      });

      setLastFetchedAt(new Date());
    } catch (err) {
      setError(
        err.message || "Could not load your devices."
      );
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  // ----------------------------------------------------------
  // DEVICE DETAILS EDITOR
  // ----------------------------------------------------------

  const openDetailsEditor = (device) => {
    setSelectedDevice(device);

    setDetailsForm({
      meterConsumerNumber: device.meterConsumerNumber || "",
      meterType: device.meterType || "",
      location: device.location || "",
      city: device.city || "",
      state: device.state || "",
      lat:
        device.lat === null || device.lat === undefined
          ? ""
          : String(device.lat),
      lng:
        device.lng === null || device.lng === undefined
          ? ""
          : String(device.lng),
    });

    setError("");
    setDetailsDialogOpen(true);
  };

  const closeDetailsEditor = () => {
    if (saving) return;

    setDetailsDialogOpen(false);
    setSelectedDevice(null);
  };

  const updateDetailsForm = (field, value) => {
    setDetailsForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const saveDeviceDetails = async () => {
    if (!selectedDevice) return;

    const location = detailsForm.location.trim();
    const city = detailsForm.city.trim();
    const state = detailsForm.state.trim();

    if (!location || !city || !state) {
      setError("Location, city and state are required.");
      return;
    }

    const lat = Number(detailsForm.lat);
    const lng = Number(detailsForm.lng);

    if (
      detailsForm.lat.trim() === "" ||
      detailsForm.lng.trim() === "" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      setError("Enter valid latitude and longitude values.");
      return;
    }

    if (lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90.");
      return;
    }

    if (lng < -180 || lng > 180) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const deviceId = selectedDevice.deviceId;

      const result = await apiFetch(
        `/api/owner/devices/${encodeURIComponent(deviceId)}/details`,
        {
          method: "PATCH",
          body: {
            meterConsumerNumber:
              detailsForm.meterConsumerNumber.trim(),
            meterType: detailsForm.meterType,
            location,
            city,
            state,
            lat,
            lng,
          },
        }
      );

      const updatedDevice = result?.device;

      if (updatedDevice) {
        setDevices((previous) =>
          previous.map((item) =>
            item.deviceId === deviceId
              ? { ...item, ...updatedDevice }
              : item
          )
        );
      } else {
        await load();
      }

      setDetailsDialogOpen(false);
      setSelectedDevice(null);

      setSuccess(
        `Device ${deviceId} details updated successfully.`
      );
    } catch (err) {
      setError(
        err.message || "Could not save device details."
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // TARIFF EDITOR
  // ----------------------------------------------------------

  const openRateEditor = (device) => {
    setRateDevice(device);

    setRateForm({
      rateInclGst: String(device.rateInclGst ?? ""),
      reason: "",
    });

    setError("");
    setRateDialogOpen(true);
  };

  const closeRateEditor = () => {
    if (saving) return;

    setRateDialogOpen(false);
    setRateDevice(null);
  };

  const saveRate = async () => {
    if (!rateDevice) return;

    const rate = Number(rateForm.rateInclGst);
    const reason = rateForm.reason.trim();

    if (!Number.isFinite(rate) || rate <= 0) {
      setError("Enter a valid tariff greater than zero.");
      return;
    }

    if (reason.length < 5) {
      setError("Give a reason with at least 5 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const deviceId = rateDevice.deviceId;

      const result = await apiFetch(
        `/api/owner/devices/${encodeURIComponent(deviceId)}/rate`,
        {
          method: "PATCH",
          body: {
            rateInclGst: rate,
            reason,
          },
        }
      );

      setDevices((previous) =>
        previous.map((item) =>
          item.deviceId === deviceId
            ? {
                ...item,
                rateInclGst:
                  result?.rateInclGst ?? rate,
              }
            : item
        )
      );

      setRateDialogOpen(false);
      setRateDevice(null);

      setSuccess(
        `Tariff for ${deviceId} updated successfully.`
      );

      // Refresh the complete device list after the change.
      await load();
    } catch (err) {
      setError(
        err.message || "Could not update the device tariff."
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // RATE HISTORY
  // ----------------------------------------------------------

  const openRateHistory = async (device) => {
    setHistoryDevice(device);
    setRateHistory([]);
    setHistoryLoading(true);
    setError("");
    setHistoryDialogOpen(true);

    try {
      const result = await apiFetch(
        `/api/owner/devices/${encodeURIComponent(
          device.deviceId
        )}/rate-history?limit=50`
      );

      setRateHistory(
        Array.isArray(result?.items)
          ? result.items
          : []
      );
    } catch (err) {
      setError(
        err.message || "Could not load rate history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeRateHistory = () => {
    setHistoryDialogOpen(false);
    setHistoryDevice(null);
    setRateHistory([]);
  };

  // ----------------------------------------------------------
  // COUNTS FOR CURRENTLY DISPLAYED DEVICES
  // ----------------------------------------------------------

  const currentPageCounts = devices.reduce(
    (counts, device) => {
      counts.total += 1;

      const status = String(device.status || "")
        .trim()
        .toLowerCase();

      if (["available", "online"].includes(status)) {
        counts.available += 1;
      } else if (["occupied", "busy"].includes(status)) {
        counts.occupied += 1;
      } else if (["offline", "disconnected"].includes(status)) {
        counts.offline += 1;
      } else if (["faulty", "error"].includes(status)) {
        counts.faulty += 1;
      }

      return counts;
    },
    {
      total: 0,
      available: 0,
      occupied: 0,
      offline: 0,
      faulty: 0,
    }
  );

  // ----------------------------------------------------------
  // PAGE
  // ----------------------------------------------------------

  return (
    <Box
      sx={{
        minHeight: "100%",
        bgcolor: C.bg,
        color: C.text,
        p: { xs: 1.2, sm: 2, md: 3 },
        boxSizing: "border-box",
        fontFamily: FONT,
      }}
    >
      {/* Page header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: 23, sm: 29 },
              color: C.text,
              lineHeight: 1.2,
              fontFamily: FONT,
            }}
          >
            My Devices
          </Typography>

          <Typography
            sx={{
              color: C.muted,
              fontSize: 13,
              mt: 0.6,
              fontFamily: FONT,
            }}
          >
            Manage charger information, location, meter details and tariff.
          </Typography>

          <Typography
            sx={{
              color: C.muted,
              fontSize: 11,
              mt: 0.6,
              fontFamily: FONT,
            }}
          >
            {number(pagination.total, 0)}{" "}
            {pagination.total === 1 ? "device" : "devices"} in your account
          </Typography>
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
        >
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/onboard-device")}
            sx={{
              bgcolor: C.teal,
              color: "#042f2e",
              textTransform: "none",
              fontSize: 12,
              fontWeight: 800,
              borderRadius: 2.5,
              px: 1.6,
              "&:hover": { bgcolor: "#03aaaa" },
            }}
          >
            Link Charger
          </Button>

          <Typography
            sx={{
              color: C.muted,
              fontSize: 10,
              whiteSpace: "nowrap",
            }}
          >
            Updated{" "}
            {lastFetchedAt
              ? lastFetchedAt.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </Typography>

          <Tooltip title="Refresh devices">
            <span>
              <IconButton
                size="small"
                onClick={load}
                disabled={loading}
                sx={{
                  color: C.tealDark,
                  border: `1px solid ${C.border}`,
                  bgcolor: C.surface,
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Search */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          mb: 2,
          bgcolor: C.surface,
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by charger ID, project, location, city or area"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: C.muted }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5,
                bgcolor: C.surface,
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: C.border,
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Status summary */}
      <Stack
        direction="row"
        spacing={0.8}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 2.5 }}
      >
        <Chip
          size="small"
          label={`On this page: ${currentPageCounts.total}`}
          sx={{ bgcolor: C.surface, color: C.text, fontWeight: 700 }}
        />

        <Chip
          size="small"
          label={`Available: ${currentPageCounts.available}`}
          sx={{ bgcolor: C.greenBg, color: C.green, fontWeight: 700 }}
        />

        <Chip
          size="small"
          label={`Occupied: ${currentPageCounts.occupied}`}
          sx={{ bgcolor: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}
        />

        <Chip
          size="small"
          label={`Offline: ${currentPageCounts.offline}`}
          sx={{ bgcolor: C.redBg, color: C.red, fontWeight: 700 }}
        />

        <Chip
          size="small"
          label={`Faulty: ${currentPageCounts.faulty}`}
          sx={{ bgcolor: C.orangeBg, color: C.orange, fontWeight: 700 }}
        />
      </Stack>

      {/* Alerts */}
      {!!error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {!!success && (
        <Alert
          severity="success"
          onClose={() => setSuccess("")}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          {success}
        </Alert>
      )}

      {/* Device cards */}
      {loading && devices.length === 0 ? (
        <Box
          sx={{
            py: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress sx={{ color: C.teal }} />

          <Typography sx={{ mt: 2, color: C.muted, fontSize: 13 }}>
            Loading devices…
          </Typography>
        </Box>
      ) : !loading && devices.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            border: `1px solid ${C.border}`,
            borderRadius: 3,
            bgcolor: C.surface,
          }}
        >
          <CardContent sx={{ py: 7, textAlign: "center" }}>
            <DeviceHubOutlinedIcon
              sx={{ color: C.muted, fontSize: 42, mb: 1 }}
            />

            <Typography
              sx={{
                color: C.text,
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              {appliedSearch ? "No matching devices" : "No devices linked"}
            </Typography>

            <Typography
              sx={{
                color: C.muted,
                fontSize: 12,
                mt: 0.7,
                mb: 2,
              }}
            >
              {appliedSearch
                ? "Try searching with a different charger ID or location."
                : "Link a charger to start managing your charging network."}
            </Typography>

            {appliedSearch ? (
              <Button
                variant="outlined"
                onClick={() => setSearch("")}
                sx={{ textTransform: "none" }}
              >
                Clear search
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate("/onboard-device")}
                sx={{
                  bgcolor: C.teal,
                  color: "#042f2e",
                  fontWeight: 800,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#03aaaa" },
                }}
              >
                Link Charger
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(3, minmax(0, 1fr))",
              },
              alignItems: "stretch",
              gap: { xs: 1.5, sm: 2 },
              pb: 1,
            }}
          >
            {devices.map((device) => (
              <DeviceCard
                key={device.deviceId}
                device={device}
                onEditDetails={openDetailsEditor}
                onEditRate={openRateEditor}
                onViewRateHistory={openRateHistory}
              />
            ))}
          </Box>

          <Card
            elevation={0}
            sx={{
              mt: 1.5,
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              bgcolor: C.surface,
              overflow: "hidden",
            }}
          >
            <TablePagination
              component="div"
              count={pagination.total}
              page={page}
              onPageChange={(_event, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Devices per page"
            />
          </Card>
        </>
      )}

      {/* ------------------------------------------------------ */}
      {/* EDIT DEVICE DETAILS DIALOG                             */}
      {/* ------------------------------------------------------ */}

      <Dialog
        open={detailsDialogOpen}
        onClose={closeDetailsEditor}
        fullWidth
        maxWidth="sm"
        fullScreen={false}
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            m: { xs: 1, sm: 2 },
            width: { xs: "calc(100% - 16px)", sm: "100%" },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
            pb: 1,
          }}
        >
          <Box>
            <Typography sx={{ color: C.text, fontSize: 18, fontWeight: 800 }}>
              Edit Device Details
            </Typography>

            <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.4 }}>
              {selectedDevice?.deviceId || ""}
            </Typography>
          </Box>

          <IconButton
            onClick={closeDetailsEditor}
            disabled={saving}
            size="small"
            aria-label="Close editor"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: C.border }}>
          <Alert
            severity="info"
            sx={{ mb: 2, borderRadius: 2, fontSize: 12 }}
          >
            You can update meter details and site location. The serial
            number and charger ID are read-only.
          </Alert>

          <Stack spacing={2}>
            <TextField
              label="Serial number"
              value={selectedDevice?.serialNumber || ""}
              fullWidth
              size="small"
              disabled
            />

            <TextField
              label="Meter number"
              value={detailsForm.meterConsumerNumber}
              onChange={(event) =>
                updateDetailsForm(
                  "meterConsumerNumber",
                  event.target.value
                )
              }
              fullWidth
              size="small"
              inputProps={{ maxLength: 100 }}
            />

            <FormControl fullWidth size="small">
              <InputLabel id="owner-meter-type-label">
                Meter type
              </InputLabel>

              <Select
                labelId="owner-meter-type-label"
                label="Meter type"
                value={detailsForm.meterType}
                onChange={(event) =>
                  updateDetailsForm("meterType", event.target.value)
                }
              >
                <MenuItem value="">
                  <em>Not specified</em>
                </MenuItem>

                {METER_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ borderColor: C.border }} />

            <Typography
              sx={{
                color: C.text,
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Site location
            </Typography>

            <TextField
              label="Location / address"
              value={detailsForm.location}
              onChange={(event) =>
                updateDetailsForm("location", event.target.value)
              }
              fullWidth
              size="small"
              multiline
              minRows={2}
              inputProps={{ maxLength: 300 }}
              required
            />

            <TextField
              label="City"
              value={detailsForm.city}
              onChange={(event) =>
                updateDetailsForm("city", event.target.value)
              }
              fullWidth
              size="small"
              inputProps={{ maxLength: 100 }}
              required
            />

            <TextField
              label="State"
              value={detailsForm.state}
              onChange={(event) =>
                updateDetailsForm("state", event.target.value)
              }
              fullWidth
              size="small"
              inputProps={{ maxLength: 100 }}
              required
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
                gap: 1.5,
              }}
            >
              <TextField
                label="Latitude"
                value={detailsForm.lat}
                onChange={(event) =>
                  updateDetailsForm("lat", event.target.value)
                }
                fullWidth
                size="small"
                type="number"
                inputProps={{
                  min: -90,
                  max: 90,
                  step: "any",
                }}
                required
              />

              <TextField
                label="Longitude"
                value={detailsForm.lng}
                onChange={(event) =>
                  updateDetailsForm("lng", event.target.value)
                }
                fullWidth
                size="small"
                type="number"
                inputProps={{
                  min: -180,
                  max: 180,
                  step: "any",
                }}
                required
              />
            </Box>

            <Typography
              sx={{
                color: C.muted,
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Latitude must be between -90 and 90. Longitude must be
              between -180 and 180. Coordinates are used for the charger's
              site location.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <Button
            onClick={closeDetailsEditor}
            disabled={saving}
            sx={{
              color: C.muted,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveOutlinedIcon />
              )
            }
            onClick={saveDeviceDetails}
            disabled={saving}
            sx={{
              bgcolor: C.teal,
              color: "#042f2e",
              textTransform: "none",
              fontWeight: 800,
              "&:hover": { bgcolor: "#03aaaa" },
            }}
          >
            {saving ? "Saving…" : "Save Details"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------------------ */}
      {/* EDIT TARIFF DIALOG                                     */}
      {/* ------------------------------------------------------ */}

      <Dialog
        open={rateDialogOpen}
        onClose={closeRateEditor}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            m: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 17, color: C.text, fontWeight: 800 }}>
              Edit Charging Tariff
            </Typography>

            <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.4 }}>
              {rateDevice?.deviceId || ""}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={closeRateEditor}
            disabled={saving}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: C.border }}>
          <Stack spacing={2}>
            <TextField
              label="Tariff including GST (₹/kWh)"
              type="number"
              value={rateForm.rateInclGst}
              onChange={(event) =>
                setRateForm((previous) => ({
                  ...previous,
                  rateInclGst: event.target.value,
                }))
              }
              fullWidth
              size="small"
              inputProps={{ min: 0.01, max: 1000, step: "0.01" }}
              helperText="Enter the public customer tariff including GST."
            />

            <TextField
              label="Reason for change"
              value={rateForm.reason}
              onChange={(event) =>
                setRateForm((previous) => ({
                  ...previous,
                  reason: event.target.value,
                }))
              }
              fullWidth
              size="small"
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
              helperText="Enter at least 5 characters."
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={closeRateEditor}
            disabled={saving}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={saveRate}
            disabled={saving}
            sx={{
              bgcolor: C.teal,
              color: "#042f2e",
              fontWeight: 800,
              textTransform: "none",
              "&:hover": { bgcolor: "#03aaaa" },
            }}
          >
            {saving ? "Saving…" : "Save Tariff"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------------------ */}
      {/* RATE HISTORY DIALOG                                    */}
      {/* ------------------------------------------------------ */}

      <Dialog
        open={historyDialogOpen}
        onClose={closeRateHistory}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            m: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 17, color: C.text, fontWeight: 800 }}>
              Tariff History
            </Typography>

            <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.4 }}>
              {historyDevice?.deviceId || ""}
            </Typography>
          </Box>

          <IconButton size="small" onClick={closeRateHistory}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: C.border }}>
          {historyLoading ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <CircularProgress sx={{ color: C.teal }} />
              <Typography sx={{ mt: 1.5, color: C.muted, fontSize: 12 }}>
                Loading tariff history…
              </Typography>
            </Box>
          ) : rateHistory.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No tariff changes are recorded for this charger.
            </Alert>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: C.surfaceAlt }}>
                    {[
                      "Changed on",
                      "Previous tariff",
                      "New tariff",
                      "Changed by",
                      "Reason",
                    ].map((heading) => (
                      <TableCell
                        key={heading}
                        sx={{
                          color: C.muted,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rateHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {formatDateTime(item.changedAt)}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {money(item.previousRateInclGst)}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 800 }}>
                        {money(item.newRateInclGst)}
                      </TableCell>

                      <TableCell>
                        {item.changedByRole || "—"}
                      </TableCell>

                      <TableCell sx={{ minWidth: 180 }}>
                        {item.reason || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={closeRateHistory}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}