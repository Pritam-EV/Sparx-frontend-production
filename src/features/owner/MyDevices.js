// src/features/owner/MyDevices.js

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";
import { useNavigate } from "react-router-dom";
import "./MyDevices.css";

import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
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

// Icons
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import EvStationRoundedIcon from "@mui/icons-material/EvStationRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import PriceChangeOutlinedIcon from "@mui/icons-material/PriceChangeOutlined";

const METER_TYPES = ["Green Meter", "Commercial", "Residential"];

// ------------------------------------------------------------
// FORMATTERS
// ------------------------------------------------------------

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const number = (value, digits = 2) =>
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
  value === undefined || value === null || String(value).trim() === ""
    ? "—"
    : String(value);

const getStatusBadgeTokens = (status) => {
  const value = String(status || "").trim().toLowerCase();

  if (value === "available" || value === "online") {
    return {
      bg: "var(--viz-green-bg)",
      fg: "var(--viz-green-fg)",
      border: "1px solid var(--viz-green-fg)",
      label: "Available",
      dot: "#008764",
    };
  }

  if (value === "occupied" || value === "busy") {
    return {
      bg: "var(--viz-warn-bg)",
      fg: "var(--viz-orange)",
      border: "1px solid var(--viz-orange)",
      label: "Occupied",
      dot: "#ff8236",
    };
  }

  if (value === "maintenance" || value === "offline" || value === "disconnected") {
    return {
      bg: "var(--viz-warn-bg)",
      fg: "var(--viz-warn-fg)",
      border: "1px solid var(--viz-warn-fg)",
      label: "Offline",
      dot: "#e06014",
    };
  }

  if (value === "faulty" || value === "error") {
    return {
      bg: "var(--viz-err-bg)",
      fg: "var(--viz-err-fg)",
      border: "1px solid var(--viz-err-fg)",
      label: "Faulty",
      dot: "#d93b3b",
    };
  }

  return {
    bg: "var(--viz-teal-wash)",
    fg: "var(--viz-text-muted)",
    border: "1px solid var(--viz-border)",
    label: status || "Unknown",
    dot: "#799ea4",
  };
};

// ------------------------------------------------------------
// DEVICE CARD (BENTO SPECIFICATION)
// ------------------------------------------------------------

function DeviceCard({
  device,
  onEditDetails,
  onEditRate,
  onViewRateHistory,
}) {
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const badge = getStatusBadgeTokens(device.status);

  const energyValue = device.totalEnergy ?? device.totalenergy ?? null;
  const hasEnergy =
    energyValue !== null &&
    energyValue !== undefined &&
    Number.isFinite(Number(energyValue));

  const latitude =
    device.lat !== null && device.lat !== undefined
      ? Number(device.lat).toFixed(5)
      : "—";

  const longitude =
    device.lng !== null && device.lng !== undefined
      ? Number(device.lng).toFixed(5)
      : "—";

  const password = String(device.wifiPassword || "");

  return (
    <div className="viz-device-card">
      <div>
        {/* Card Header */}
        <div className="viz-card-top-header">
          <div className="viz-card-id-block">
            <div className="viz-card-device-icon">
              <EvStationRoundedIcon sx={{ fontSize: 21 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="viz-card-title">{device.deviceId || "Charger"}</div>
              <div className="viz-card-project">
                {device.project || "VIZ Smart Charging"}
              </div>
            </div>
          </div>

          <span
            className="viz-device-status-badge"
            style={{
              backgroundColor: badge.bg,
              color: badge.fg,
              border: badge.border,
            }}
          >
            {badge.label}
          </span>
        </div>

        {/* Location Row */}
        <div className="viz-card-location-row" style={{ marginTop: 10 }}>
          <PlaceOutlinedIcon
            sx={{ fontSize: 16, color: "var(--viz-teal-deep)", flexShrink: 0, mt: 0.2 }}
          />
          <span style={{ wordBreak: "break-word" }}>
            {device.location ||
              [device.city, device.state].filter(Boolean).join(", ") ||
              "Location not configured"}
          </span>
        </div>

        {/* 2-Col KPI Bento Strip */}
        <div className="viz-card-kpi-strip" style={{ marginTop: 12 }}>
          <div className="viz-kpi-sub-tile">
            <span className="viz-kpi-sub-lbl">Total Dispensed</span>
            <span className="viz-kpi-sub-val" style={{ color: "var(--viz-teal-deep)" }}>
              {hasEnergy ? `${number(energyValue)} kWh` : "—"}
            </span>
          </div>

          <div className="viz-kpi-sub-tile">
            <span className="viz-kpi-sub-lbl">Active Tariff</span>
            <span className="viz-kpi-sub-val" style={{ color: "var(--viz-orange)" }}>
              {money(device.rateInclGst)}{" "}
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--viz-text-muted)" }}>
                /kWh
              </span>
            </span>
          </div>
        </div>

        {/* Technical Specs List */}
        <div className="viz-card-specs-list" style={{ marginTop: 10 }}>
          <div className="viz-spec-line">
            <span className="viz-spec-label">Serial Number</span>
            <span className="viz-spec-value">{displayValue(device.serialNumber)}</span>
          </div>
          <div className="viz-spec-line">
            <span className="viz-spec-label">Charger Type</span>
            <span className="viz-spec-value">{displayValue(device.chargerType)}</span>
          </div>
          <div className="viz-spec-line">
            <span className="viz-spec-label">Consumer Meter</span>
            <span className="viz-spec-value">
              {displayValue(device.meterConsumerNumber)} ({displayValue(device.meterType)})
            </span>
          </div>
          <div className="viz-spec-line">
            <span className="viz-spec-label">Coordinates</span>
            <span className="viz-spec-value">
              {latitude !== "—" ? `${latitude}, ${longitude}` : "—"}
            </span>
          </div>
        </div>

        {/* Wi-Fi Configuration Strip */}
        <div className="viz-wifi-box" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
            <WifiRoundedIcon sx={{ fontSize: 16, color: "var(--viz-teal-deep)", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: "var(--viz-text-muted)" }}>SSID:</span>
            <span
              style={{
                fontWeight: 800,
                color: "var(--viz-text-main)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {device.wifiSSID || "Not Set"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
              {!password
                ? "—"
                : showWifiPassword
                ? password
                : "••••••••"}
            </span>
            {password && (
              <IconButton
                size="small"
                onClick={() => setShowWifiPassword((prev) => !prev)}
                sx={{ p: 0.3, color: "var(--viz-teal-deep)" }}
              >
                {showWifiPassword ? (
                  <VisibilityOffOutlinedIcon sx={{ fontSize: 15 }} />
                ) : (
                  <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                )}
              </IconButton>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="viz-card-actions-row">
        <Button
          fullWidth
          variant="contained"
          startIcon={<EditOutlinedIcon sx={{ fontSize: 17 }} />}
          onClick={() => onEditDetails(device)}
          className="viz-btn-edit-main"
        >
          Edit Device Details
        </Button>

        <div className="viz-card-btn-subgroup">
          <Button
            size="small"
            variant="outlined"
            startIcon={<PriceChangeOutlinedIcon sx={{ fontSize: 15 }} />}
            onClick={() => onEditRate(device)}
            className="viz-btn-outline-soft"
          >
            Edit Tariff
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => onViewRateHistory(device)}
            className="viz-btn-outline-soft"
          >
            Rate History
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MAIN MY DEVICES COMPONENT
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

  // Details editor state
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

  // Tariff editor state
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [rateDevice, setRateDevice] = useState(null);
  const [rateForm, setRateForm] = useState({
    rateInclGst: "",
    reason: "",
  });

  // Rate history state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDevice, setHistoryDevice] = useState(null);
  const [rateHistory, setRateHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Debounce device search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setAppliedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Load devices from API[cite: 3]
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

      const result = await apiFetch(`/api/owner/devices?${params.toString()}`);

      setDevices(Array.isArray(result?.items) ? result.items : []);
      setPagination({
        total: Number(result?.pagination?.total || 0),
        totalPages: Number(result?.pagination?.totalPages || 0),
      });

      setLastFetchedAt(new Date());
    } catch (err) {
      setError(err.message || "Could not load your devices.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  // Details editor helpers[cite: 3]
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
    setDetailsForm((prev) => ({ ...prev, [field]: value }));
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
            meterConsumerNumber: detailsForm.meterConsumerNumber.trim(),
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
        setDevices((prev) =>
          prev.map((item) =>
            item.deviceId === deviceId ? { ...item, ...updatedDevice } : item
          )
        );
      } else {
        await load();
      }

      setDetailsDialogOpen(false);
      setSelectedDevice(null);
      setSuccess(`Device ${deviceId} details updated successfully.`);
    } catch (err) {
      setError(err.message || "Could not save device details.");
    } finally {
      setSaving(false);
    }
  };

  // Tariff editor helpers[cite: 3]
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

      setDevices((prev) =>
        prev.map((item) =>
          item.deviceId === deviceId
            ? { ...item, rateInclGst: result?.rateInclGst ?? rate }
            : item
        )
      );

      setRateDialogOpen(false);
      setRateDevice(null);
      setSuccess(`Tariff for ${deviceId} updated successfully.`);
      await load();
    } catch (err) {
      setError(err.message || "Could not update the device tariff.");
    } finally {
      setSaving(false);
    }
  };

  // Rate history helpers[cite: 3]
  const openRateHistory = async (device) => {
    setHistoryDevice(device);
    setRateHistory([]);
    setHistoryLoading(true);
    setError("");
    setHistoryDialogOpen(true);

    try {
      const result = await apiFetch(
        `/api/owner/devices/${encodeURIComponent(device.deviceId)}/rate-history?limit=50`
      );

      setRateHistory(Array.isArray(result?.items) ? result.items : []);
    } catch (err) {
      setError(err.message || "Could not load rate history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeRateHistory = () => {
    setHistoryDialogOpen(false);
    setHistoryDevice(null);
    setRateHistory([]);
  };

  // Status counts for visible devices[cite: 3]
  const currentPageCounts = devices.reduce(
    (counts, device) => {
      counts.total += 1;
      const status = String(device.status || "").trim().toLowerCase();

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
    { total: 0, available: 0, occupied: 0, offline: 0, faulty: 0 }
  );

  return (
    <div className="viz-devices-shell">
      {/* ================================================================== */}
      {/* 1. FLUSH TOP HEADER (NO GAPS ON SIDES)                             */}
      {/* ================================================================== */}
      <header className="viz-devices-top-header">
        <div className="viz-devices-header-inner">
          <div className="viz-devices-brand-block">
            <div className="viz-devices-logo-box">

            </div>
            <div>
              <div className="viz-devices-header-title">
                VIZ-Smart Charging <span className="viz-devices-cpo-tag">My Devices</span>
              </div>
              <div className="viz-devices-header-sub">
                Last updated{" "}
                {lastFetchedAt
                  ? lastFetchedAt.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </div>
            </div>
          </div>

          <div className="viz-devices-top-actions">
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => navigate("/onboard-device")}
              className="viz-btn-primary-sunrise"
            >
              Link Charger
            </Button>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="viz-btn-icon-soft"
              title="Refresh Devices"
            >
              {loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <RefreshRoundedIcon sx={{ fontSize: 19 }} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. MAIN LAYOUT CONTAINER                                           */}
      {/* ================================================================== */}
      <main className="viz-devices-container">
        {/* Search Input Bar */}
        <div className="viz-search-dock">
          <div className="viz-search-input-wrap">
            <SearchRoundedIcon sx={{ color: "var(--viz-teal-deep)", fontSize: 20 }} />
            <input
              type="text"
              className="viz-search-input"
              placeholder="Search by charger ID, project, city or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <IconButton size="small" onClick={() => setSearch("")} sx={{ p: 0.2 }}>
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </div>
        </div>

        {/* Unclipped Vertical Status Ribbon */}
        <section className="viz-devices-health-ribbon">
          <div className="viz-ribbon-title-row">
            <span className="viz-ribbon-label">
              <EvStationRoundedIcon sx={{ fontSize: 17, color: "var(--viz-teal-deep)" }} />
              Charging Station Breakdown
            </span>
          </div>

          <div className="viz-devices-stat-pills">
            {[
              { label: "Total", val: currentPageCounts.total, dot: "#0e2e33", color: "var(--viz-text-main)" },
              { label: "Available", val: currentPageCounts.available, dot: "#008764", color: "var(--viz-teal-deep)" },
              { label: "Occupied", val: currentPageCounts.occupied, dot: "#ff8236", color: "var(--viz-orange)" },
              { label: "Offline", val: currentPageCounts.offline, dot: "#e06014", color: "var(--viz-warn-fg)" },
              { label: "Faulty", val: currentPageCounts.faulty, dot: "#d93b3b", color: "var(--viz-err-fg)" },
            ].map((st) => (
              <div key={st.label} className="viz-devices-stat-pill">
                <div className="viz-devices-stat-pill-top">
                  <span className="viz-status-dot-sm" style={{ backgroundColor: st.dot }} />
                  <span className="viz-devices-stat-num" style={{ color: st.color }}>
                    {number(st.val, 0)}
                  </span>
                </div>
                <span className="viz-devices-stat-lbl">{st.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Error / Success Banners */}
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ borderRadius: "14px", py: 0.5 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ borderRadius: "14px", py: 0.5 }}>
            {success}
          </Alert>
        )}

        {/* Device Cards Grid */}
        {loading && devices.length === 0 ? (
          <Box sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <CircularProgress sx={{ color: "var(--viz-aqua)" }} />
            <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "var(--viz-text-muted)" }}>
              Loading your charging points…
            </Typography>
          </Box>
        ) : !loading && devices.length === 0 ? (
          <div className="viz-empty-card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <EvStationRoundedIcon sx={{ fontSize: 36, color: "var(--viz-teal-deep)" }} />
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, mt: 1 }}>
              {appliedSearch ? "No Matching Devices Found" : "No Devices Linked Yet"}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "var(--viz-text-muted)", mt: 0.3, maxWidth: 350, mx: "auto" }}>
              {appliedSearch
                ? "Try searching with a different device ID or clear your search query."
                : "Connect your hardware chargers to start monitoring live telemetry."}
            </Typography>
            {appliedSearch ? (
              <Button onClick={() => setSearch("")} sx={{ mt: 1.5, textTransform: "none", fontWeight: 700 }}>
                Clear Search
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => navigate("/onboard-device")}
                className="viz-btn-primary-sunrise"
                sx={{ mt: 1.5 }}
              >
                Link First Charger
              </Button>
            )}
          </div>
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.25,
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

            {/* Pagination Controls */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid var(--viz-border)",
                borderRadius: "16px",
                bgcolor: "var(--viz-white)",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0, 160, 145, 0.05)",
              }}
            >
              <TablePagination
                component="div"
                count={pagination.total}
                page={page}
                onPageChange={(_e, nextPage) => setPage(nextPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Per page"
                sx={{
                  fontFamily: "var(--font-body)",
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 600,
                  },
                }}
              />
            </Card>
          </>
        )}
      </main>

      {/* ================================================================== */}
      {/* 3. EDIT DEVICE DETAILS DIALOG                                      */}
      {/* ================================================================== */}
      <Dialog
        open={detailsDialogOpen}
        onClose={closeDetailsEditor}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            border: "1px solid var(--viz-border)",
            boxShadow: "0 10px 35px rgba(3, 18, 22, 0.15)",
            m: { xs: 1.5, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1,
          }}
        >
          <div>
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: "var(--viz-text-main)" }}>
              Edit Device Details
            </Typography>
            <Typography sx={{ fontSize: 12, color: "var(--viz-text-muted)", fontWeight: 600 }}>
              {selectedDevice?.deviceId || ""}
            </Typography>
          </div>
          <IconButton onClick={closeDetailsEditor} disabled={saving} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "var(--viz-border)" }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: "12px", fontSize: 12 }}>
            Update meter identifiers and site location. Serial number & charger ID are immutable.
          </Alert>

          <Stack spacing={2}>
            <TextField
              label="Serial Number"
              value={selectedDevice?.serialNumber || ""}
              fullWidth
              size="small"
              disabled
            />

            <TextField
              label="Meter Consumer Number"
              value={detailsForm.meterConsumerNumber}
              onChange={(e) => updateDetailsForm("meterConsumerNumber", e.target.value)}
              fullWidth
              size="small"
            />

            <FormControl fullWidth size="small">
              <InputLabel id="meter-type-label">Meter Type</InputLabel>
              <Select
                labelId="meter-type-label"
                label="Meter Type"
                value={detailsForm.meterType}
                onChange={(e) => updateDetailsForm("meterType", e.target.value)}
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

            <Divider sx={{ borderColor: "var(--viz-border)" }} />

            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--viz-text-main)" }}>
              Site Geolocation
            </Typography>

            <TextField
              label="Location / Address"
              value={detailsForm.location}
              onChange={(e) => updateDetailsForm("location", e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
              required
            />

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <TextField
                label="City"
                value={detailsForm.city}
                onChange={(e) => updateDetailsForm("city", e.target.value)}
                size="small"
                required
              />
              <TextField
                label="State"
                value={detailsForm.state}
                onChange={(e) => updateDetailsForm("state", e.target.value)}
                size="small"
                required
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <TextField
                label="Latitude (-90 to 90)"
                value={detailsForm.lat}
                onChange={(e) => updateDetailsForm("lat", e.target.value)}
                type="number"
                size="small"
                required
              />
              <TextField
                label="Longitude (-180 to 180)"
                value={detailsForm.lng}
                onChange={(e) => updateDetailsForm("lng", e.target.value)}
                type="number"
                size="small"
                required
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: "1px solid var(--viz-border)" }}>
          <Button onClick={closeDetailsEditor} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>
            Cancel
          </Button>

          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
            onClick={saveDeviceDetails}
            disabled={saving}
            className="viz-btn-primary-sunrise"
          >
            {saving ? "Saving…" : "Save Details"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================== */}
      {/* 4. EDIT TARIFF DIALOG                                              */}
      {/* ================================================================== */}
      <Dialog
        open={rateDialogOpen}
        onClose={closeRateEditor}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            border: "1px solid var(--viz-border)",
            m: { xs: 1.5, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 17 }}>
              Update Tariff
            </Typography>
            <Typography sx={{ fontSize: 12, color: "var(--viz-text-muted)" }}>
              {rateDevice?.deviceId || ""}
            </Typography>
          </div>
          <IconButton size="small" onClick={closeRateEditor} disabled={saving}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "var(--viz-border)" }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Tariff Including GST (₹/kWh)"
              type="number"
              value={rateForm.rateInclGst}
              onChange={(e) => setRateForm((prev) => ({ ...prev, rateInclGst: e.target.value }))}
              fullWidth
              size="small"
              helperText="Public charging price per kilowatt-hour"
            />

            <TextField
              label="Reason for Change"
              value={rateForm.reason}
              onChange={(e) => setRateForm((prev) => ({ ...prev, reason: e.target.value }))}
              fullWidth
              size="small"
              multiline
              minRows={2}
              helperText="Enter at least 5 characters"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeRateEditor} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveRate}
            disabled={saving}
            className="viz-btn-primary-sunrise"
          >
            {saving ? "Updating…" : "Apply Tariff"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================== */}
      {/* 5. RATE HISTORY DIALOG                                             */}
      {/* ================================================================== */}
      <Dialog
        open={historyDialogOpen}
        onClose={closeRateHistory}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            border: "1px solid var(--viz-border)",
            m: { xs: 1.5, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 17 }}>
              Tariff History
            </Typography>
            <Typography sx={{ fontSize: 12, color: "var(--viz-text-muted)" }}>
              {historyDevice?.deviceId || ""}
            </Typography>
          </div>
          <IconButton size="small" onClick={closeRateHistory}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "var(--viz-border)", p: 0 }}>
          {historyLoading ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <CircularProgress sx={{ color: "var(--viz-aqua)" }} />
              <Typography sx={{ mt: 1.5, color: "var(--viz-text-muted)", fontSize: 12 }}>
                Retrieving tariff revisions…
              </Typography>
            </Box>
          ) : rateHistory.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="info" sx={{ borderRadius: "12px" }}>
                No prior tariff revisions on record for this charger.
              </Alert>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {["Changed On", "Previous Rate", "New Rate", "Modified By", "Reason"].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          bgcolor: "var(--viz-pale-mint-tint)",
                          fontFamily: "var(--font-display)",
                          fontWeight: 800,
                          fontSize: 11,
                          color: "var(--viz-text-muted)",
                          borderBottom: "1px solid var(--viz-border)",
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rateHistory.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
                        {formatDateTime(row.changedAt)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
                        {money(row.previousRateInclGst)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5, fontWeight: 800, color: "var(--viz-teal-deep)", whiteSpace: "nowrap" }}>
                        {money(row.newRateInclGst)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5 }}>{row.changedByRole || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 11.5, maxWidth: 220 }}>{row.reason || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={closeRateHistory} sx={{ textTransform: "none", fontWeight: 700 }}>
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}