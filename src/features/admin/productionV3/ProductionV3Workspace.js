
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import SettingsEthernetRoundedIcon from "@mui/icons-material/SettingsEthernetRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { productionV3Api } from "./productionV3Api";
import ProductionV3Workbench from "./ProductionV3Workbench";
import "./ProductionV3.css";

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const STAGE_FILTERS = [
  { value: "all", label: "All units" },
  { value: "group_a", label: "Group A" },
  { value: "group_b", label: "Group B" },
  { value: "calibration", label: "Calibration" },
  { value: "dispatch", label: "Dispatch-ready" },
];

const EMPTY_GROUP_A = {
  serialPrefix: "VIZ",
  startingNumber: "001",
  entryQuantity: 1,
  number: "",
  par: "",
  pcbBatch: "",
  meteringHardware: "HLW8032",
  batchName: "",
};

const EMPTY_GROUP_B = {
  deviceId: "",
  wifiSSID: "",
  wifiPassword: "",
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function getTotal(response) {
  return Number(response?.data?.pagination?.total || 0);
}

function formatDate(value) {
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
}

function stageLabel(stage) {
  const found = STAGE_FILTERS.find(
    (item) => item.value === stage
  );

  return found?.label || stage || "Unknown";
}

function stageColor(stage) {
  switch (stage) {
    case "group_a":
      return "default";
    case "group_b":
      return "info";
    case "calibration":
      return "warning";
    case "dispatch":
      return "success";
    default:
      return "default";
  }
}

function getConnection(device) {
  return device.stage === "group_a"
    ? device.groupA?.connection
    : device.groupB?.connection;
}

function getDeviceStatus(device) {
  if (device.stage === "group_a") {
    const online =
      getConnection(device)?.status === "online";

    return {
      label: online
        ? "Ready for provisioning"
        : "Waiting for device signal",
      color: online ? "success" : "default",
    };
  }

  if (device.stage === "group_b") {
    const status = device.groupB?.provisionStatus;

    if (status === "acknowledged") {
      return { label: "Provisioned", color: "success" };
    }

    if (status === "failed") {
      return { label: "Provisioning failed", color: "error" };
    }

    if (status === "sent") {
      return { label: "Provisioning", color: "warning" };
    }

    return { label: "Not provisioned", color: "default" };
  }

  if (device.stage === "calibration") {
    const status = device.calibration?.status;

    const labels = {
      not_started: "Calibration pending",
      capturing: "Calibrating",
      calculated: "Coefficients ready",
      submitted: "Awaiting firmware ACK",
      applied: "Calibration applied",
      manually_completed: "Manual completion · Testing skipped",
      failed: "Calibration failed",
    };

    const colors = {
      not_started: "default",
      capturing: "info",
      calculated: "info",
      submitted: "warning",
      applied: "success",
      manually_completed: "warning",
      failed: "error",
    };

    return {
      label: labels[status] || "Calibration",
      color: colors[status] || "default",
    };
  }

  if (device.stage === "dispatch") {
    return {
      label:
        device.dispatch?.status === "completed"
          ? "Dispatched"
          : "Dispatch ready",
      color: "success",
    };
  }

  return { label: "Unknown", color: "default" };
}

function formatLastSeen(value) {
  if (!value) return "Never connected";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function primaryAction(device) {
  if (device.stage === "group_a") {
    return "Assign Device ID";
  }

  if (
    device.stage === "group_b" &&
    device.groupB?.provisionStatus === "failed"
  ) {
    return "Retry provisioning";
  }

  if (device.stage === "group_b") {
    return "View status";
  }

  if (device.stage === "calibration") {
    return "Open workbench";
  }

  return "View details";
}

// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
  active,
  onClick,
}) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      className={`production-summary-card ${
        active ? "production-summary-card-active" : ""
      }`}
    >
      <Box className="production-summary-icon">
        {icon}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography className="production-summary-value">
          {value.toLocaleString("en-IN")}
        </Typography>

        <Typography className="production-summary-label">
          {label}
        </Typography>
      </Box>

      <ArrowForwardRoundedIcon
        className="production-summary-arrow"
      />
    </Paper>
  );
}


// --------------------------------------------------
// MAIN WORKSPACE
// --------------------------------------------------

export default function ProductionV3Workspace() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [summary, setSummary] = useState({
    all: 0,
    group_a: 0,
    group_b: 0,
    calibration: 0,
    dispatch: 0,
  });

  const [stage, setStage] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  const [groupADialogOpen, setGroupADialogOpen] =
    useState(false);

  const [groupBDevice, setGroupBDevice] = useState(null);

  const [groupAForm, setGroupAForm] =
    useState(EMPTY_GROUP_A);

  const [groupBForm, setGroupBForm] =
    useState(EMPTY_GROUP_B);

  const [savingGroupA, setSavingGroupA] = useState(false);
  const [savingGroupB, setSavingGroupB] = useState(false);

  const [selectedDevice, setSelectedDevice] =
    useState(null);

  const [workbenchOpen, setWorkbenchOpen] =
    useState(false);

  const [snackbar, setSnackbar] = useState(null);

  // ------------------------------------------------
  // LOAD SUMMARY COUNTS
  // ------------------------------------------------

  const loadSummary = useCallback(async () => {
    try {
      const requests = await Promise.all([
        productionV3Api.list({ page: 1, limit: 1 }),

        productionV3Api.list({
          page: 1,
          limit: 1,
          filter: "group_a",
        }),

        productionV3Api.list({
          page: 1,
          limit: 1,
          filter: "group_b",
        }),

        productionV3Api.list({
          page: 1,
          limit: 1,
          stage: "calibration",
        }),

        productionV3Api.list({
          page: 1,
          limit: 1,
          stage: "dispatch",
        }),
      ]);

      setSummary({
        all: getTotal(requests[0]),
        group_a: getTotal(requests[1]),
        group_b: getTotal(requests[2]),
        calibration: getTotal(requests[3]),
        dispatch: getTotal(requests[4]),
      });
    } catch (error) {
      console.error(
        "[PRODUCTION V3] Summary load failed:",
        error
      );
    }
  }, []);

  // ------------------------------------------------
  // LOAD TABLE
  // ------------------------------------------------

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const params = {
        page: page + 1,
        limit: pageSize,
      };

      if (stage !== "all") {
        params.stage = stage;
      }

      if (search) {
        params.search = search;
      }

      const response = await productionV3Api.list(params);

      setRows(
        Array.isArray(response.data?.data)
          ? response.data.data
          : []
      );

      setTotal(
        Number(response.data?.pagination?.total || 0)
      );

    } catch (error) {
      setPageError(getErrorMessage(error));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, stage, search]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);

    await Promise.all([
      loadDevices(),
      loadSummary(),
    ]);

    setRefreshing(false);
  }, [loadDevices, loadSummary]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);


  // ------------------------------------------------
// AUTO REFRESH WHILE PROVISIONING IS PENDING
// ------------------------------------------------

const hasPendingProvisioning = rows.some(
  (device) =>
    device.stage === "group_b" &&
    device.groupB?.provisionStatus === "sent"
);

useEffect(() => {
  if (!hasPendingProvisioning) return undefined;

  const timer = setInterval(() => {
    void loadDevices();
    void loadSummary();
  }, 5000);

  return () => clearInterval(timer);
}, [
  hasPendingProvisioning,
  loadDevices,
  loadSummary,
]);

// Refresh connection state so stale devices become Offline.
useEffect(() => {
  if (rows.length === 0) return undefined;

  const timer = setInterval(() => {
    void loadDevices();
  }, 15000);

  return () => clearInterval(timer);
}, [rows.length, loadDevices]);


  // ------------------------------------------------
  // SEARCH AND FILTERS
  // ------------------------------------------------

  const applySearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const handleStageChange = (_, nextStage) => {
    setStage(nextStage);
    setPage(0);
  };

  const handleSummaryClick = (nextStage) => {
    setStage(nextStage);
    setPage(0);
  };

  // ------------------------------------------------
  // GROUP A
  // ------------------------------------------------

  const updateGroupAField = (field, value) => {
    setGroupAForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const createGroupA = async (event) => {
    event.preventDefault();

    if (
      !groupAForm.serialPrefix.trim() ||
      !groupAForm.startingNumber.trim() ||
      !groupAForm.pcbBatch.trim() ||
      !groupAForm.meteringHardware.trim() ||
      !groupAForm.batchName.trim()
    ) {
      setSnackbar({
        severity: "warning",
        message: "Please complete all required Group A fields.",
      });
      return;
    }

    const quantity = Number(groupAForm.entryQuantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10000
    ) {
      setSnackbar({
        severity: "warning",
        message: "Quantity must be between 1 and 10,000.",
      });
      return;
    }

    setSavingGroupA(true);

    try {
      const payload = {
        ...groupAForm,
        entryQuantity: quantity,
      };

      const response =
        await productionV3Api.createGroupA(payload);

      const created = response.data?.data || {};

      setGroupADialogOpen(false);
      setGroupAForm(EMPTY_GROUP_A);

      setStage("group_a");
      setPage(0);
      setSearch("");
      setSearchInput("");

      setSnackbar({
        severity: "success",
        message:
          `${created.count || quantity} units created. ` +
          `Serial range: ${created.firstSerialNumber || "created"} – ` +
          `${created.lastSerialNumber || ""}`,
      });

      await loadSummary();

    } catch (error) {
      setSnackbar({
        severity: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setSavingGroupA(false);
    }
  };

  // ------------------------------------------------
  // GROUP B
  // ------------------------------------------------

  const openGroupBDialog = (device) => {
    setGroupBDevice(device);

    setGroupBForm({
      ...EMPTY_GROUP_B,
      deviceId: device.groupB?.deviceId || "",
    });
  };

  const closeGroupBDialog = () => {
    if (savingGroupB) return;

    setGroupBDevice(null);
    setGroupBForm(EMPTY_GROUP_B);
  };

  const updateGroupBField = (field, value) => {
    setGroupBForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submitGroupB = async (event) => {
    event.preventDefault();

    if (!groupBDevice) return;

    const deviceId = groupBForm.deviceId
      .trim()
      .toUpperCase();

    if (!/^[A-Z0-9_-]{2,32}$/.test(deviceId)) {
      setSnackbar({
        severity: "warning",
        message: "Enter a valid Device ID.",
      });
      return;
    }

    if (!groupBForm.wifiSSID.trim()) {
      setSnackbar({
        severity: "warning",
        message: "Wi-Fi SSID is required.",
      });
      return;
    }

    const password = groupBForm.wifiPassword;

    const validPassword =
      password.length === 0 ||
      (password.length >= 8 && password.length <= 63) ||
      /^[0-9a-fA-F]{64}$/.test(password);

    if (!validPassword) {
      setSnackbar({
        severity: "warning",
        message: "Wi-Fi password must be 8–63 characters or 64 hex characters.",
      });
      return;
    }

    setSavingGroupB(true);

    try {
      await productionV3Api.provisionGroupB(
        groupBDevice.serialNumber,
        {
          deviceId,
          wifiSSID: groupBForm.wifiSSID.trim(),
          wifiPassword: password,
        }
      );

      const serial = groupBDevice.serialNumber;

      setGroupBDevice(null);
      setGroupBForm(EMPTY_GROUP_B);

      setSnackbar({
        severity: "info",
        message:
          `Provisioning sent to ${serial}. Waiting for device ACK.`,
      });

      await refreshAll();

    } catch (error) {
      setSnackbar({
        severity: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setSavingGroupB(false);
    }
  };

  // ------------------------------------------------
  // DEVICE WORKBENCH / DETAILS
  // ------------------------------------------------

  const openWorkbench = async (device) => {
    setSelectedDevice(device);
    setWorkbenchOpen(true);
  };

  const closeWorkbench = () => {
    setWorkbenchOpen(false);
    setSelectedDevice(null);
  };

  const handlePrimaryAction = (device) => {
    if (
      device.stage === "group_a" ||
      (
        device.stage === "group_b" &&
        device.groupB?.provisionStatus === "failed"
      )
    ) {
      openGroupBDialog(device);
      return;
    }

    openWorkbench(device);
  };

  const handleWorkbenchUpdated = async (updatedDevice) => {
    if (updatedDevice) {
      setSelectedDevice(updatedDevice);
    }

    await refreshAll();
  };

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------

  return (
    <Box className="production-v3-page">
      {/* HEADER */}

      <Box className="production-v3-page-header">
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <PrecisionManufacturingRoundedIcon
              sx={{ fontSize: 30, color: "#176B60" }}
            />

            <Typography
              className="production-v3-page-title"
            >
              Production 3.0
            </Typography>
          </Stack>

          <Typography className="production-v3-page-subtitle">
            Manage every device from serial generation to calibration and dispatch readiness.
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
        >
          <Tooltip title="Refresh production data">
            <span>
              <IconButton
                onClick={refreshAll}
                disabled={refreshing || loading}
                className="production-refresh-button"
              >
                {refreshing ? (
                  <CircularProgress size={20} />
                ) : (
                  <RefreshRoundedIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setGroupADialogOpen(true)}
            className="production-primary-button"
          >
            Create Group A
          </Button>
        </Stack>
      </Box>

      {/* SUMMARY */}

      <Box className="production-summary-grid">
        <SummaryCard
          label="Total units"
          value={summary.all}
          icon={<DevicesRoundedIcon />}
          active={stage === "all"}
          onClick={() => handleSummaryClick("all")}
        />

        <SummaryCard
          label="Group A"
          value={summary.group_a}
          icon={<PrecisionManufacturingRoundedIcon />}
          active={stage === "group_a"}
          onClick={() => handleSummaryClick("group_a")}
        />

        <SummaryCard
          label="Group B"
          value={summary.group_b}
          icon={<SettingsEthernetRoundedIcon />}
          active={stage === "group_b"}
          onClick={() => handleSummaryClick("group_b")}
        />

        <SummaryCard
          label="Calibration"
          value={summary.calibration}
          icon={<ScienceRoundedIcon />}
          active={stage === "calibration"}
          onClick={() => handleSummaryClick("calibration")}
        />

        <SummaryCard
          label="Dispatch-ready"
          value={summary.dispatch}
          icon={<LocalShippingRoundedIcon />}
          active={stage === "dispatch"}
          onClick={() => handleSummaryClick("dispatch")}
        />
      </Box>

      {/* TABLE */}

      <Paper
        elevation={0}
        className="production-table-panel"
      >
        <Box className="production-table-toolbar">
          <Box>
            <Typography className="production-section-title">
              Production units
            </Typography>

            <Typography className="production-section-subtitle">
              Search by serial number, Device ID, batch or PCB batch.
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Search production units"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applySearch();
              }
            }}
            className="production-search"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon
                    sx={{ color: "#73808D" }}
                  />
                </InputAdornment>
              ),

              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                      setPage(0);
                    }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <Button
            variant="outlined"
            onClick={applySearch}
            className="production-search-button"
          >
            Search
          </Button>
        </Box>

        {/* STAGE FILTERS */}

        <Box className="production-filter-tabs">
          <Tabs
            value={stage}
            onChange={handleStageChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {STAGE_FILTERS.map((item) => (
              <Tab
                key={item.value}
                value={item.value}
                label={item.label}
              />
            ))}
          </Tabs>
        </Box>

        {pageError && (
          <Alert
            severity="error"
            sx={{ mx: 2, mt: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={refreshAll}
              >
                Retry
              </Button>
            }
          >
            {pageError}
          </Alert>
        )}

{/* MOBILE DEVICE LIST */}
<Box className="production-mobile-device-list">
  {loading ? (
    <Box className="production-mobile-loading">
      <CircularProgress size={26} />
      <Typography>Loading devices...</Typography>
    </Box>
  ) : rows.length === 0 ? (
    <Paper className="production-mobile-empty" elevation={0}>
      <DevicesRoundedIcon sx={{ fontSize: 34, color: "#9AA6B2" }} />
      <Typography fontWeight={700}>
        No devices found
      </Typography>
      <Typography color="text.secondary" fontSize={12}>
        Change the filter or create a new batch.
      </Typography>
    </Paper>
  ) : (
    <Stack spacing={1.2}>
      {rows.map((device) => {
        const currentStatus = getDeviceStatus(device);
        const connection = getConnection(device);
        const online = connection?.status === "online";

        return (
          <Paper
            key={device._id}
            elevation={0}
            className="production-mobile-device-card"
          >
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={1}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography className="production-mobile-serial">
                  {device.serialNumber}
                </Typography>

                <Typography className="production-mobile-device-id">
                  Device ID: {device.groupB?.deviceId || "Not assigned"}
                </Typography>
              </Box>

              <Chip
                size="small"
                label={online ? "Online" : "Offline"}
                className={
                  online
                    ? "production-connection-online"
                    : "production-connection-offline"
                }
                icon={
                  <Box
                    component="span"
                    className="production-connection-dot"
                  />
                }
              />
            </Stack>

            <Divider sx={{ my: 1.3 }} />

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
            >
              <Chip
                size="small"
                label={stageLabel(device.stage)}
                color={stageColor(device.stage)}
                variant="outlined"
              />

              <Chip
                size="small"
                label={currentStatus.label}
                color={currentStatus.color}
              />
            </Stack>

            <Box className="production-mobile-device-meta">
              <Box>
                <Typography>Batch</Typography>
                <strong>{device.groupA?.batchName || "—"}</strong>
              </Box>

              <Box>
                <Typography>PCB batch</Typography>
                <strong>{device.groupA?.pcbBatch || "—"}</strong>
              </Box>

              <Box>
                <Typography>Metering hardware</Typography>
                <strong>{device.groupA?.meteringHardware || "—"}</strong>
              </Box>

              <Box>
                <Typography>Last seen</Typography>
                <strong>
                  {formatLastSeen(connection?.lastSeen)}
                </strong>
              </Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={() => handlePrimaryAction(device)}
              className="production-mobile-open-button"
            >
              {primaryAction(device)}
            </Button>
          </Paper>
        );
      })}
    </Stack>
  )}
</Box>

        <TableContainer
  className="production-table-container production-desktop-table"
>
          <Table
            stickyHeader
            size="medium"
            aria-label="Production units"
          >
            <TableHead>
            <TableRow>
                <TableCell sx={{ minWidth: 165 }}>Serial number</TableCell>
                <TableCell sx={{ minWidth: 130 }}>Device ID</TableCell>
                <TableCell sx={{ minWidth: 205 }}>Batch / PCB / Hardware</TableCell>
                <TableCell sx={{ minWidth: 105 }}>Stage</TableCell>
                <TableCell sx={{ minWidth: 175 }}>Production status</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Connection</TableCell>
                <TableCell sx={{ minWidth: 145 }}>Last seen</TableCell>
                <TableCell align="right" sx={{ minWidth: 155 }}>
                Action
                </TableCell>
            </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Box className="production-table-loading">
                      <CircularProgress size={28} />
                      <Typography>
                        Loading production units…
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Box className="production-table-empty">
                      <DevicesRoundedIcon
                        sx={{
                          fontSize: 38,
                          color: "#9AA6B2",
                        }}
                      />

                      <Typography fontWeight={600}>
                        No production units found
                      </Typography>

                      <Typography color="text.secondary">
                        Create Group A entries or change the current filter.
                      </Typography>

                      {stage === "all" && (
                        <Button
                          variant="contained"
                          startIcon={<AddRoundedIcon />}
                          onClick={() => setGroupADialogOpen(true)}
                        >
                          Create first batch
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((device) => {
                  const currentStatus =
                    getDeviceStatus(device);

                  return (
<TableRow
  key={device._id}
  hover
  className="production-table-row"
  onDoubleClick={() => openWorkbench(device)}
>
  {/* 1. SERIAL NUMBER */}
  <TableCell>
    <Typography className="production-serial">
      {device.serialNumber}
    </Typography>
    <Typography className="production-row-subtext">
      Sequence: {device.groupA?.sequenceNumber ?? "—"}
    </Typography>
  </TableCell>

  {/* 2. DEVICE ID */}
  <TableCell>
    <Typography className="production-device-id">
      {device.groupB?.deviceId || "—"}
    </Typography>
  </TableCell>

  {/* 3. BATCH / PCB / METERING HARDWARE */}
  <TableCell>
    <Typography className="production-cell-primary">
      {device.groupA?.batchName || "—"}
    </Typography>
    <Typography className="production-row-subtext">
      PCB: {device.groupA?.pcbBatch || "—"}
    </Typography>
    <Typography className="production-row-subtext">
      Meter: {device.groupA?.meteringHardware || "—"}
    </Typography>
  </TableCell>

  {/* 4. STAGE */}
  <TableCell>
    <Chip
      size="small"
      label={stageLabel(device.stage)}
      color={stageColor(device.stage)}
      variant="outlined"
    />
  </TableCell>

  {/* 5. PRODUCTION STATUS */}
  <TableCell>
    <Chip
      size="small"
      label={currentStatus.label}
      color={currentStatus.color}
    />
  </TableCell>

  {/* 6. CONNECTION */}
  <TableCell>
    {(() => {
      const connection = getConnection(device);
      const online = connection?.status === "online";

      return (
        <Chip
          size="small"
          className={
            online
              ? "production-connection-online"
              : "production-connection-offline"
          }
          label={online ? "Online" : "Offline"}
          icon={
            <Box
              component="span"
              className="production-connection-dot"
            />
          }
        />
      );
    })()}
  </TableCell>

  {/* 7. LAST SEEN */}
  <TableCell>
    <Typography className="production-date">
      {formatLastSeen(getConnection(device)?.lastSeen)}
    </Typography>
  </TableCell>

  {/* 8. ACTION */}
  <TableCell align="right">
    <Button
      size="small"
      fullWidth
      variant={
        device.stage === "group_a" ||
        (
          device.stage === "group_b" &&
          device.groupB?.provisionStatus === "failed"
        )
          ? "contained"
          : "outlined"
      }
      onClick={() => handlePrimaryAction(device)}
      className="production-row-action"
    >
      {primaryAction(device)}
    </Button>
  </TableCell>
</TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          className="production-pagination"
        />
      </Paper>

      {/* GROUP A DIALOG */}

      <Dialog
        open={groupADialogOpen}
        onClose={() => {
          if (!savingGroupA) {
            setGroupADialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle className="production-dialog-title">
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Create Group A entries
            </Typography>

            <Typography color="text.secondary" fontSize={13}>
              Generate serial numbers and register new PCBs.
            </Typography>
          </Box>

          <IconButton
            onClick={() => setGroupADialogOpen(false)}
            disabled={savingGroupA}
          >
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={createGroupA}>
          <DialogContent dividers>
            <Box className="production-form-grid">
              <TextField
                label="Serial prefix"
                value={groupAForm.serialPrefix}
                onChange={(event) =>
                  updateGroupAField(
                    "serialPrefix",
                    event.target.value.toUpperCase()
                  )
                }
                required
                helperText="Example: VIZ"
              />

              <TextField
                label="Starting number"
                value={groupAForm.startingNumber}
                onChange={(event) =>
                  updateGroupAField(
                    "startingNumber",
                    event.target.value
                  )
                }
                required
                helperText="Example: 001"
              />

              <TextField
                label="Quantity"
                type="number"
                value={groupAForm.entryQuantity}
                onChange={(event) =>
                  updateGroupAField(
                    "entryQuantity",
                    event.target.value
                  )
                }
                required
                inputProps={{ min: 1, max: 10000 }}
              />

              <TextField
                label="Metering hardware"
                select
                value={groupAForm.meteringHardware}
                onChange={(event) =>
                  updateGroupAField(
                    "meteringHardware",
                    event.target.value
                  )
                }
                required
              >
                <MenuItem value="HLW8032">HLW8032</MenuItem>
                <MenuItem value="ATM90E26">ATM90E26</MenuItem>
                <MenuItem value="ATM90E36A">ATM90E36A</MenuItem>
              </TextField>

              <TextField
                label="Batch name"
                value={groupAForm.batchName}
                onChange={(event) =>
                  updateGroupAField(
                    "batchName",
                    event.target.value
                  )
                }
                required
              />

              <TextField
                label="PCB batch"
                value={groupAForm.pcbBatch}
                onChange={(event) =>
                  updateGroupAField(
                    "pcbBatch",
                    event.target.value
                  )
                }
                required
              />

              <TextField
                label="Number (optional)"
                value={groupAForm.number}
                onChange={(event) =>
                  updateGroupAField(
                    "number",
                    event.target.value
                  )
                }
              />

              <TextField
                label="PAR (optional)"
                value={groupAForm.par}
                onChange={(event) =>
                  updateGroupAField(
                    "par",
                    event.target.value
                  )
                }
              />
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              Serial numbers are generated sequentially. Existing serial conflicts are checked by the backend before records are created.
            </Alert>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setGroupADialogOpen(false)}
              disabled={savingGroupA}
              color="inherit"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={savingGroupA}
              startIcon={
                savingGroupA ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AddRoundedIcon />
                )
              }
            >
              {savingGroupA ? "Creating…" : "Create entries"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* GROUP B DIALOG */}

      <Dialog
        open={Boolean(groupBDevice)}
        onClose={closeGroupBDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle className="production-dialog-title">
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Group B provisioning
            </Typography>

            <Typography color="text.secondary" fontSize={13}>
              {groupBDevice?.serialNumber}
            </Typography>
          </Box>

          <IconButton
            onClick={closeGroupBDialog}
            disabled={savingGroupB}
          >
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={submitGroupB}>
          <DialogContent dividers>
            <Alert severity="info" sx={{ mb: 2 }}>
              The backend securely stores Wi-Fi credentials and sends the configuration to the device through MQTT.
            </Alert>

            <Stack spacing={2}>
              <TextField
                label="Device ID"
                value={groupBForm.deviceId}
                onChange={(event) =>
                  updateGroupBField(
                    "deviceId",
                    event.target.value.toUpperCase()
                  )
                }
                required
                helperText="2–32 letters, numbers, underscore or hyphen."
              />

              <TextField
                label="Wi-Fi SSID"
                value={groupBForm.wifiSSID}
                onChange={(event) =>
                  updateGroupBField(
                    "wifiSSID",
                    event.target.value
                  )
                }
                required
              />

              <TextField
                label="Wi-Fi password"
                type="password"
                value={groupBForm.wifiPassword}
                onChange={(event) =>
                  updateGroupBField(
                    "wifiPassword",
                    event.target.value
                  )
                }
                helperText="Leave blank only for an open Wi-Fi network."
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              color="inherit"
              onClick={closeGroupBDialog}
              disabled={savingGroupB}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={savingGroupB}
              startIcon={
                savingGroupB ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SettingsEthernetRoundedIcon />
                )
              }
            >
              {savingGroupB ? "Sending…" : "Provision device"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DEVICE WORKBENCH */}

      <ProductionV3Workbench
        open={workbenchOpen}
        device={selectedDevice}
        onClose={closeWorkbench}
        onUpdated={handleWorkbenchUpdated}
      />

      {/* FEEDBACK */}

      {snackbar && (
        <Box className="production-snackbar">
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar(null)}
          >
            {snackbar.message}
          </Alert>
        </Box>
      )}
    </Box>
  );
}
