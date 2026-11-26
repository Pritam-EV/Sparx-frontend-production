import React, { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import {
  listDevices,
  getDevice,
  listProfiles,
  promoteDevice,
  retryProvisioning,
  changeDeviceIdentity,
  getDeviceCommands,
  getDeviceTelemetry,
  startFastTelemetry,
  stopFastTelemetry,
  startRelayTest,
  stopRelayTest,
} from "./productionV3Api";

import {
  P3,
  P3_STATUS,
  P3Status,
  P3SectionTitle,
  P3Loading,
  P3Empty,
  errorMessage,
  formatDate,
  formatRelative,
  unwrap,
  paginationOf,
} from "./ProductionV3Components";

const fieldProps = {
  fullWidth: true,
  size: "small",
  sx: P3.field,
};

const initialPromotion = {
  deviceId: "",
  wifiSSID: "",
  wifiPassword: "",
  firmwareProfileId: "",
};

const valueOf = (value, unit = "", decimals = 2) => {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? `${number.toFixed(decimals)}${unit}`
    : String(value);
};

export default function ProductionV3Devices() {
  const [devices, setDevices] = useState([]);
  const [firmwareProfiles, setFirmwareProfiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commands, setCommands] = useState([]);
  const [telemetry, setTelemetry] = useState([]);

  const [promotionOpen, setPromotionOpen] = useState(false);
  const [promotionDevice, setPromotionDevice] = useState(null);
  const [promotion, setPromotion] = useState(initialPromotion);

  const [identityOpen, setIdentityOpen] = useState(false);
  const [identityDevice, setIdentityDevice] = useState(null);
  const [newDeviceId, setNewDeviceId] = useState("");

  const [relayStopOpen, setRelayStopOpen] = useState(false);
  const [relayStopDevice, setRelayStopDevice] = useState(null);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const notify = (message, severity = "success") =>
    setToast({ open: true, message, severity });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await listDevices({
        page: page + 1,
        limit: pageSize,
        search: search || undefined,
        status: status || undefined,
      });

      setDevices(unwrap(response) || []);
      setTotal(paginationOf(response).total || 0);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  const loadFirmwareProfiles = useCallback(async () => {
    try {
      const response = await listProfiles("firmware", {
        page: 1,
        limit: 100,
        status: "active",
      });
      setFirmwareProfiles(unwrap(response) || []);
    } catch (profileError) {
      notify(errorMessage(profileError), "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadFirmwareProfiles();
  }, [loadFirmwareProfiles]);

  const openDevice = async (serialNumber) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedDevice(null);
    setCommands([]);
    setTelemetry([]);

    try {
      const [deviceRes, commandRes, telemetryRes] = await Promise.all([
        getDevice(serialNumber),
        getDeviceCommands(serialNumber, { limit: 12 }),
        getDeviceTelemetry(serialNumber, { limit: 12 }),
      ]);

      setSelectedDevice(unwrap(deviceRes));
      setCommands(unwrap(commandRes) || []);
      setTelemetry(unwrap(telemetryRes) || []);
    } catch (detailError) {
      notify(errorMessage(detailError), "error");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelectedDevice = async (serialNumber) => {
    try {
      const [deviceRes, commandRes, telemetryRes] = await Promise.all([
        getDevice(serialNumber),
        getDeviceCommands(serialNumber, { limit: 12 }),
        getDeviceTelemetry(serialNumber, { limit: 12 }),
      ]);

      setSelectedDevice(unwrap(deviceRes));
      setCommands(unwrap(commandRes) || []);
      setTelemetry(unwrap(telemetryRes) || []);
    } catch (refreshError) {
      notify(errorMessage(refreshError), "error");
    }
  };

  const submitSearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const openPromotion = (device) => {
    setPromotionDevice(device);
    setPromotion({
      ...initialPromotion,
      deviceId: device.serialNumber || "",
      firmwareProfileId: device.firmwareProfileId?._id || "",
    });
    setPromotionOpen(true);
  };

  const submitPromotion = async () => {
    if (!promotionDevice) return;

    setBusy("promote");

    try {
      const response = await promoteDevice(
        promotionDevice.serialNumber,
        {
          deviceId: promotion.deviceId.trim(),
          wifiSSID: promotion.wifiSSID.trim(),
          wifiPassword: promotion.wifiPassword,
          firmwareProfileId: promotion.firmwareProfileId || undefined,
        }
      );

      const result = unwrap(response);

      notify(
        result?.message ||
          "Provisioning command published. Awaiting device acknowledgement."
      );

      setPromotionOpen(false);
      setPromotion(initialPromotion);

      await load();
    } catch (submitError) {
      notify(errorMessage(submitError), "error");
    } finally {
      setBusy("");
    }
  };

  const handleRetryProvisioning = async (device) => {
    setBusy(`retry-${device.serialNumber}`);

    try {
      const response = await retryProvisioning(device.serialNumber);
      notify(
        response?.data?.message ||
          "Provisioning retry published."
      );

      await load();

      if (detailOpen) {
        await refreshSelectedDevice(device.serialNumber);
      }
    } catch (retryError) {
      notify(errorMessage(retryError), "error");
    } finally {
      setBusy("");
    }
  };

  const openIdentityChange = (device) => {
    setIdentityDevice(device);
    setNewDeviceId(device.deviceId || "");
    setIdentityOpen(true);
  };

  const submitIdentityChange = async () => {
    if (!identityDevice || !newDeviceId.trim()) return;

    setBusy("identity");

    try {
      const response = await changeDeviceIdentity(
        identityDevice.serialNumber,
        newDeviceId.trim()
      );

      notify(
        response?.data?.message ||
          "Identity change published. Device ID changes after acknowledgement."
      );

      setIdentityOpen(false);
      await load();

      if (detailOpen) {
        await refreshSelectedDevice(identityDevice.serialNumber);
      }
    } catch (identityError) {
      notify(errorMessage(identityError), "error");
    } finally {
      setBusy("");
    }
  };

  const runDeviceAction = async (device, action) => {
    const serial = device.serialNumber;
    setBusy(`${action}-${serial}`);

    try {
      let response;

      switch (action) {
        case "startTelemetry":
          response = await startFastTelemetry(serial, {
            intervalMs: 500,
            durationSeconds: 120,
          });
          break;

        case "stopTelemetry":
          response = await stopFastTelemetry(serial);
          break;

        case "startRelay":
          response = await startRelayTest(serial, {
            durationSeconds: 60,
          });
          break;

        case "stopRelay":
          response = await stopRelayTest(serial);
          break;

        default:
          throw new Error("Unsupported device action.");
      }

      notify(
        response?.data?.message ||
          "Command published. Refresh command history to view acknowledgement."
      );

      if (detailOpen) {
        await refreshSelectedDevice(serial);
      }
    } catch (commandError) {
      notify(errorMessage(commandError), "error");
    } finally {
      setBusy("");
    }
  };

  const requestRelayStop = (device) => {
    setRelayStopDevice(device);
    setRelayStopOpen(true);
  };

  const confirmRelayStop = async () => {
    if (!relayStopDevice) return;

    setRelayStopOpen(false);
    await runDeviceAction(relayStopDevice, "stopRelay");
    setRelayStopDevice(null);
  };

  const isOnline = (device) => {
    const lastSeen = device.discovery?.lastSeenAt
      ? new Date(device.discovery.lastSeenAt).getTime()
      : 0;

    return (
      Boolean(device.discovery?.isOnline) &&
      lastSeen > 0 &&
      Date.now() - lastSeen < 90000
    );
  };

  if (loading && devices.length === 0) {
    return <P3Loading label="Loading device inventory..." />;
  }

  return (
    <Box sx={P3.page}>
      <P3SectionTitle
        title="Device inventory"
        subtitle="Search factory serials, inspect discovery and provisioning state, and take operator actions."
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={load}
            sx={P3.secondaryButton}
          >
            Refresh
          </Button>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={P3.panel}>
        <Grid container spacing={1.2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              {...fieldProps}
              label="Search serial number or Device ID"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={submitSearch}>
                    <SearchRoundedIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={7} md={4}>
            <TextField
              {...fieldProps}
              select
              label="Lifecycle status"
              value={status}
              onChange={(event) => {
                setPage(0);
                setStatus(event.target.value);
              }}
            >
              <MenuItem value="">All lifecycle states</MenuItem>
              {P3_STATUS.map((item) => (
                <MenuItem key={item} value={item}>
                  {item.replace(/_/g, " ")}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={5} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={submitSearch}
              startIcon={<SearchRoundedIcon />}
              sx={P3.primaryButton}
            >
              Search devices
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={P3.panel}>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  "Factory serial",
                  "Operational Device ID",
                  "Lifecycle",
                  "Connection",
                  "Provisioning",
                  "Calibration",
                  "Actions",
                ].map((heading) => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      color: "#94a3b8",
                      fontWeight: 850,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {devices.map((device) => {
                const online = isOnline(device);
                const canPromote = ["group_a", "discovered"].includes(
                  device.manufacturingStatus
                );
                const canRetry = ["group_b", "calibration_required"].includes(
                  device.manufacturingStatus
                );

                return (
                  <TableRow key={device._id} hover>
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          fontWeight: 850,
                          color: "#172033",
                        }}
                      >
                        {device.serialNumber}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.25,
                          fontSize: 9.5,
                          color: "#94a3b8",
                        }}
                      >
                        {device.batchId?.batchNumber || "No batch"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ fontSize: 11 }}>
                      {device.deviceId || "Not assigned"}
                    </TableCell>

                    <TableCell>
                      <P3Status value={device.manufacturingStatus} />
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.35}>
                        <Chip
                          size="small"
                          icon={<WifiRoundedIcon sx={{ fontSize: "15px !important" }} />}
                          label={online ? "Online" : "Offline"}
                          sx={{
                            width: "fit-content",
                            bgcolor: online ? "#dcfce7" : "#f1f5f9",
                            color: online ? "#166534" : "#64748b",
                            fontSize: 9.5,
                            fontWeight: 800,
                          }}
                        />
                        <Typography sx={{ fontSize: 9.5, color: "#94a3b8" }}>
                          {formatRelative(device.discovery?.lastSeenAt)}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <P3Status value={device.provisioning?.status} />
                    </TableCell>

                    <TableCell>
                      <P3Status value={device.calibration?.status} />
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.25}>
                        <IconButton
                          size="small"
                          title="View device"
                          onClick={() => openDevice(device.serialNumber)}
                        >
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>

                        {canPromote ? (
                          <IconButton
                            size="small"
                            title="Promote to Group B"
                            onClick={() => openPromotion(device)}
                            sx={{ color: "#0f766e" }}
                          >
                            <SettingsRoundedIcon fontSize="small" />
                          </IconButton>
                        ) : null}

                        {canRetry ? (
                          <IconButton
                            size="small"
                            title="Retry provisioning"
                            disabled={busy === `retry-${device.serialNumber}`}
                            onClick={() => handleRetryProvisioning(device)}
                            sx={{ color: "#d97706" }}
                          >
                            <ReplayRoundedIcon fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!devices.length ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <P3Empty
                      title="No matching devices"
                      description="Try another serial number or clear the lifecycle filter."
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, next) => setPage(next)}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[pageSize]}
          sx={{
            borderTop: "1px solid #edf0f4",
            "& .MuiTablePagination-toolbar": { minHeight: 48 },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontSize: 10.5,
            },
          }}
        />
      </Paper>

      {/* PROMOTION */}
      <Dialog
        open={promotionOpen}
        onClose={() => !busy && setPromotionOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Promote to Group B
          <Typography sx={{ mt: 0.4, fontSize: 11, color: "#64748b", fontWeight: 500 }}>
            The backend stores encrypted Wi-Fi credentials and publishes the configuration command.
          </Typography>
        </DialogTitle>

        <Divider />

        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Alert severity="info" sx={{ borderRadius: 2, fontSize: 11 }}>
              The device must have sent a recent discovery heartbeat before promotion.
            </Alert>

            <TextField
              {...fieldProps}
              label="Factory serial"
              value={promotionDevice?.serialNumber || ""}
              disabled
            />

            <TextField
              {...fieldProps}
              label="Operational Device ID"
              value={promotion.deviceId}
              onChange={(event) =>
                setPromotion((current) => ({
                  ...current,
                  deviceId: event.target.value.toUpperCase(),
                }))
              }
              helperText="Defaults to the immutable factory serial. You can change it later."
            />

            <TextField
              {...fieldProps}
              label="Wi-Fi SSID *"
              value={promotion.wifiSSID}
              onChange={(event) =>
                setPromotion((current) => ({
                  ...current,
                  wifiSSID: event.target.value,
                }))
              }
            />

            <TextField
              {...fieldProps}
              label="Wi-Fi password"
              type="password"
              value={promotion.wifiPassword}
              onChange={(event) =>
                setPromotion((current) => ({
                  ...current,
                  wifiPassword: event.target.value,
                }))
              }
              helperText="Leave empty only for an open Wi-Fi network."
            />

            <TextField
              {...fieldProps}
              select
              label="Firmware profile *"
              value={promotion.firmwareProfileId}
              onChange={(event) =>
                setPromotion((current) => ({
                  ...current,
                  firmwareProfileId: event.target.value,
                }))
              }
            >
              <MenuItem value="">Select firmware profile</MenuItem>
              {firmwareProfiles.map((profile) => (
                <MenuItem key={profile._id} value={profile._id}>
                  {profile.profileName} · {profile.targetFirmwareVersion}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setPromotionOpen(false)}
            disabled={Boolean(busy)}
            sx={P3.secondaryButton}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitPromotion}
            disabled={
              Boolean(busy) ||
              !promotion.deviceId.trim() ||
              !promotion.wifiSSID.trim() ||
              !promotion.firmwareProfileId
            }
            sx={P3.primaryButton}
          >
            {busy === "promote" ? "Publishing..." : "Promote device"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* IDENTITY CHANGE */}
      <Dialog
        open={identityOpen}
        onClose={() => setIdentityOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Change Device ID
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: 11 }}>
            The factory serial number remains unchanged. The operational Device ID changes only after the device acknowledges the configuration.
          </Alert>
          <TextField
            {...fieldProps}
            label="New Device ID"
            value={newDeviceId}
            onChange={(event) =>
              setNewDeviceId(event.target.value.toUpperCase())
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIdentityOpen(false)} sx={P3.secondaryButton}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitIdentityChange}
            disabled={busy === "identity" || !newDeviceId.trim()}
            sx={P3.primaryButton}
          >
            {busy === "identity" ? "Publishing..." : "Request identity change"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DEVICE DETAILS */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 17, fontWeight: 900 }}>
              {selectedDevice?.serialNumber || "Device details"}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: "#64748b", mt: 0.3 }}>
              Device ID: {selectedDevice?.deviceId || "Not assigned"}
            </Typography>
          </Box>

          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent>
          {detailLoading ? (
            <P3Loading label="Loading device details..." />
          ) : selectedDevice ? (
            <Stack spacing={2}>
              <Grid container spacing={1.2}>
                {[
                  ["Lifecycle", <P3Status value={selectedDevice.manufacturingStatus} />],
                  ["Provisioning", <P3Status value={selectedDevice.provisioning?.status} />],
                  ["Calibration", <P3Status value={selectedDevice.calibration?.status} />],
                  ["Firmware version", selectedDevice.firmwareVersion || selectedDevice.discovery?.firmwareVersion || "—"],
                  ["Firmware family", selectedDevice.firmwareFamily || selectedDevice.discovery?.firmwareFamily || "—"],
                  ["Protocol", selectedDevice.protocolVersion || selectedDevice.discovery?.protocolVersion || "—"],
                  ["Hardware revision", selectedDevice.batchId?.hardwareRevision || selectedDevice.discovery?.hardwareRevision || "—"],
                  ["Batch", selectedDevice.batchId?.batchNumber || "—"],
                  ["Last seen", formatDate(selectedDevice.discovery?.lastSeenAt)],
                  ["NVS desired version", selectedDevice.provisioning?.desiredConfigVersion ?? "—"],
                  ["NVS applied version", selectedDevice.provisioning?.appliedConfigVersion ?? "—"],
                  ["Last provisioning error", selectedDevice.provisioning?.lastError || "—"],
                ].map(([label, value]) => (
                  <Grid item xs={12} sm={6} md={4} key={label}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.2,
                        borderRadius: 2,
                        border: "1px solid #edf0f4",
                        minHeight: 62,
                      }}
                    >
                      <Typography sx={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 800 }}>
                        {label}
                      </Typography>
                      <Box sx={{ mt: 0.5, fontSize: 11.5, fontWeight: 800, wordBreak: "break-word" }}>
                        {value}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <P3SectionTitle
                title="Operator actions"
                subtitle="Commands are sent through the backend and must be acknowledged by the device."
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => refreshSelectedDevice(selectedDevice.serialNumber)}
                    sx={P3.secondaryButton}
                  >
                    Refresh device state
                  </Button>
                }
              />

              <Stack
                direction="row"
                flexWrap="wrap"
                gap={1}
              >
                {["group_a", "discovered"].includes(selectedDevice.manufacturingStatus) ? (
                  <Button
                    variant="contained"
                    onClick={() => {
                      setDetailOpen(false);
                      openPromotion(selectedDevice);
                    }}
                    sx={P3.primaryButton}
                  >
                    Promote to Group B
                  </Button>
                ) : null}

                {["group_b", "calibration_required"].includes(selectedDevice.manufacturingStatus) ? (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<ReplayRoundedIcon />}
                      disabled={busy === `retry-${selectedDevice.serialNumber}`}
                      onClick={() => handleRetryProvisioning(selectedDevice)}
                      sx={P3.secondaryButton}
                    >
                      Retry provisioning
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<SwapHorizRoundedIcon />}
                      onClick={() => openIdentityChange(selectedDevice)}
                      sx={P3.secondaryButton}
                    >
                      Change Device ID
                    </Button>
                  </>
                ) : null}

                {selectedDevice.deviceId ? (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<BoltRoundedIcon />}
                      disabled={busy.startsWith("startTelemetry")}
                      onClick={() => runDeviceAction(selectedDevice, "startTelemetry")}
                      sx={P3.secondaryButton}
                    >
                      Start fast telemetry
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={() => runDeviceAction(selectedDevice, "stopTelemetry")}
                      disabled={busy.startsWith("stopTelemetry")}
                      sx={P3.secondaryButton}
                    >
                      Stop fast telemetry
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<PlayArrowRoundedIcon />}
                      onClick={() => runDeviceAction(selectedDevice, "startRelay")}
                      disabled={busy.startsWith("startRelay")}
                      sx={P3.secondaryButton}
                    >
                      Start relay test
                    </Button>

                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<StopRoundedIcon />}
                      onClick={() => requestRelayStop(selectedDevice)}
                      sx={{
                        ...P3.secondaryButton,
                        color: "#b91c1c",
                        borderColor: "#fecaca",
                      }}
                    >
                      Stop relay
                    </Button>
                  </>
                ) : null}
              </Stack>

              <Alert severity="warning" sx={{ borderRadius: 2, fontSize: 11 }}>
                Relay test stop sends the firmware's `relayStop` action. The current firmware can use this action to terminate an active charging session as well as stop a maintenance test.
              </Alert>

              <P3SectionTitle
                title="Latest telemetry samples"
                subtitle="Most recent telemetry records returned for this serial number."
              />

              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["Captured", "Voltage", "Current", "Power", "Relay", "Fresh"].map((label) => (
                        <TableCell key={label} sx={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 850 }}>
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {telemetry.slice(0, 8).map((sample, index) => (
                      <TableRow key={sample._id || index}>
                        <TableCell sx={{ fontSize: 10 }}>
                          {formatDate(sample.capturedAt)}
                        </TableCell>
                        <TableCell sx={{ fontSize: 10 }}>
                          {valueOf(sample.voltage, " V")}
                        </TableCell>
                        <TableCell sx={{ fontSize: 10 }}>
                          {valueOf(sample.current, " A", 3)}
                        </TableCell>
                        <TableCell sx={{ fontSize: 10 }}>
                          {valueOf(sample.power, " W")}
                        </TableCell>
                        <TableCell sx={{ fontSize: 10 }}>
                          {String(sample.relay ?? "—")}
                        </TableCell>
                        <TableCell>
                          <P3Status value={sample.sampleFresh ? "passed" : "failed"} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!telemetry.length ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <P3Empty title="No telemetry history returned" />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </Box>

              <P3SectionTitle
                title="Recent commands"
                subtitle="Command history from the Production 3.0 command registry."
              />

              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["Action", "Request ID", "Status", "Created"].map((label) => (
                        <TableCell key={label} sx={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 850 }}>
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {commands.slice(0, 10).map((command) => (
                      <TableRow key={command._id}>
                        <TableCell sx={{ fontSize: 10.5, fontWeight: 800 }}>
                          {command.action}
                        </TableCell>
                        <TableCell sx={{ fontSize: 9.5, maxWidth: 170, wordBreak: "break-all" }}>
                          {command.requestId || "—"}
                        </TableCell>
                        <TableCell>
                          <P3Status value={command.status} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 10 }}>
                          {formatDate(command.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!commands.length ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <P3Empty title="No command history" />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          ) : (
            <P3Empty title="Device details unavailable" />
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailOpen(false)} sx={P3.secondaryButton}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* RELAY STOP WARNING */}
      <Dialog
        open={relayStopOpen}
        onClose={() => setRelayStopOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ color: "#991b1b", fontWeight: 900 }}>
          Confirm relay stop
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ borderRadius: 2, fontSize: 11 }}>
            The firmware's `relayStop` command can terminate an active charging session. Do not send this command while a customer is charging.
          </Alert>
          <Typography sx={{ mt: 1.5, fontSize: 12, color: "#334155" }}>
            Send relay stop to{" "}
            <strong>{relayStopDevice?.serialNumber}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRelayStopOpen(false)} sx={P3.secondaryButton}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmRelayStop}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 800,
            }}
          >
            Send relay stop
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((current) => ({ ...current, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}