
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import HistoryIcon from "@mui/icons-material/History";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import { maintenanceApi } from "./maintenanceApi";

const PAGE_SIZE = 25;

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
  },
};

const cardSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  borderColor: "divider",
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const statusColor = (status) => {
  const value = String(status || "").toLowerCase();

  if (
    ["completed", "acknowledged", "ok", "success"].includes(value)
  ) {
    return "success";
  }

  if (
    ["failed", "rejected", "error", "timed_out"].includes(value)
  ) {
    return "error";
  }

  if (
    ["pending", "published", "processing"].includes(value)
  ) {
    return "warning";
  }

  return "default";
};

function SectionTitle({ title, description, action }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", sm: "center" }}
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Box>
        <Typography fontWeight={700} fontSize={16}>
          {title}
        </Typography>

        {description && (
          <Typography color="text.secondary" variant="body2">
            {description}
          </Typography>
        )}
      </Box>

      {action}
    </Stack>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...props
}) {
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      sx={inputSx}
      {...props}
    />
  );
}

/* =========================================================
   DEVICE SELECTOR
========================================================= */

function DeviceSelector({
  devices,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  loading,
  page,
  pages,
  onPageChange,
  onRefresh,
}) {
  const selected = devices.find(
    (device) => String(device._id) === String(selectedId)
  );

  return (
    <Paper variant="outlined" sx={cardSx}>
      <SectionTitle
        title="Select device"
        description="Search by Device ID, serial number, project or city."
        action={
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={loading}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
        }
      />

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search devices..."
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            InputProps={{
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  sx={{
                    mr: 1,
                    color: "text.secondary",
                  }}
                />
              ),
            }}
            sx={inputSx}
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <TextField
            select
            fullWidth
            size="small"
            label="Device"
            value={selectedId || ""}
            onChange={(event) =>
              onSelect(event.target.value)
            }
            sx={inputSx}
          >
            {devices.length === 0 && (
              <MenuItem value="" disabled>
                No devices found
              </MenuItem>
            )}

            {devices.map((device) => (
              <MenuItem
                key={device._id}
                value={device._id}
              >
                {device.device_id || "No Device ID"} —{" "}
                {device.serialNumber || "No Serial"}{" "}
                {device.project
                  ? `(${device.project})`
                  : ""}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 1.5 }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
        >
          Page {page} of {Math.max(1, pages)}
          {selected
            ? ` · Selected: ${selected.device_id}`
            : ""}
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>

          <Button
            size="small"
            disabled={page >= pages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

/* =========================================================
   DEVICE SUMMARY
========================================================= */

function DeviceSummary({
  device,
  profile,
  production,
}) {
  if (!device) return null;

  const online =
    String(device.status || "").toLowerCase() === "online";

  return (
    <Paper variant="outlined" sx={cardSx}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {device.device_id || "Device"}
          </Typography>

          <Typography
            color="text.secondary"
            variant="body2"
          >
            Serial: {device.serialNumber || "—"}
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
        >
          <Chip
            size="small"
            label={
              profile === "v3"
                ? "V3 Firmware"
                : "Legacy Firmware"
            }
            color={
              profile === "v3" ? "success" : "default"
            }
          />

          <Chip
            size="small"
            label={device.status || "Status unknown"}
            color={online ? "success" : "default"}
          />

          <Chip
            size="small"
            label={
              device.wifiPasswordConfigured
                ? "Wi-Fi configured"
                : "Wi-Fi not configured"
            }
            variant="outlined"
          />
        </Stack>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Project
          </Typography>

          <Typography fontWeight={600}>
            {device.project || "—"}
          </Typography>
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Charger type
          </Typography>

          <Typography fontWeight={600}>
            {device.charger_type || "—"}
          </Typography>
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Location
          </Typography>

          <Typography fontWeight={600}>
            {[device.area, device.city]
              .filter(Boolean)
              .join(", ") || "—"}
          </Typography>
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Last seen
          </Typography>

          <Typography fontWeight={600}>
            {formatDate(device.lastSeen)}
          </Typography>
        </Grid>
      </Grid>

      {profile === "v3" && production && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Production stage: {production.stage || "—"}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

/* =========================================================
   FIRMWARE MAINTENANCE
========================================================= */

function FirmwareMaintenance({
  device,
  profile,
  onSuccess,
  onError,
}) {
  const [ssid, setSsid] = useState(
    device.wifiSSID || ""
  );

  const [password, setPassword] = useState("");
  const [savingWifi, setSavingWifi] = useState(false);

  const [calibration, setCalibration] = useState(() => {
    if (profile === "legacy") {
      return {
        cf: device.cf ?? "",
        vf: device.vf ?? "",
        currentRF: device.currentRF ?? "",
      };
    }

    return {
      vf: "",
      currentZero: "",
      currentGain: "",
      powerZero: "",
      powerGain: "",
    };
  });

  const [savingCalibration, setSavingCalibration] =
    useState(false);

  const [newDeviceId, setNewDeviceId] = useState("");
  const [migratingId, setMigratingId] = useState(false);

  const [relayDuration, setRelayDuration] = useState(10);
  const [sendingCommand, setSendingCommand] = useState(false);

  useEffect(() => {
    setSsid(device.wifiSSID || "");
    setPassword("");

    if (profile === "legacy") {
      setCalibration({
        cf: device.cf ?? "",
        vf: device.vf ?? "",
        currentRF: device.currentRF ?? "",
      });
    } else {
      setCalibration({
        vf: "",
        currentZero: "",
        currentGain: "",
        powerZero: "",
        powerGain: "",
      });
    }

    setNewDeviceId("");
  }, [
    device._id,
    profile,
    device.wifiSSID,
    device.cf,
    device.vf,
    device.currentRF,
  ]);

  const updateCalibrationField = (key, value) => {
    setCalibration((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const saveWifi = async () => {
    if (!ssid.trim() || !password) {
      onError("Enter both Wi-Fi SSID and password.");
      return;
    }

    setSavingWifi(true);

    try {
      const response =
        await maintenanceApi.updateFirmwareConfig(
          device._id,
          {
            wifiSSID: ssid.trim(),
            wifiPassword: password,
          }
        );

      setPassword("");

      onSuccess(
        `Wi-Fi configuration sent. Request ID: ${
          response.data?.requestId || "created"
        }`
      );
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setSavingWifi(false);
    }
  };

  const saveCalibration = async () => {
    const keys =
      profile === "legacy"
        ? ["cf", "vf", "currentRF"]
        : [
            "vf",
            "currentZero",
            "currentGain",
            "powerZero",
            "powerGain",
          ];

    const values = {};

    for (const key of keys) {
      const value = calibration[key];

      if (
        value === "" ||
        value === null ||
        !Number.isFinite(Number(value))
      ) {
        onError(
          `Enter a valid numeric value for ${key}.`
        );
        return;
      }

      values[key] = Number(value);
    }

    setSavingCalibration(true);

    try {
      const response =
        await maintenanceApi.updateCalibration(
          device._id,
          values
        );

      onSuccess(
        `Calibration update sent. Request ID: ${
          response.data?.requestId || "created"
        }`
      );
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setSavingCalibration(false);
    }
  };

  const migrateDeviceId = async () => {
    const value = newDeviceId.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{3,40}$/.test(value)) {
      onError(
        "Device ID must be 3–40 characters: A–Z, 0–9, _ or -."
      );
      return;
    }

    if (
      value === String(device.device_id || "").toUpperCase()
    ) {
      onError(
        "The new Device ID is the same as the current ID."
      );
      return;
    }

    const confirmed = window.confirm(
      `Send Device ID migration to ${value}?\n\nThe database Device ID will only change after the device acknowledges the update.`
    );

    if (!confirmed) return;

    setMigratingId(true);

    try {
      const response =
        await maintenanceApi.updateDeviceId(
          device._id,
          value
        );

      onSuccess(
        response.data?.message ||
          `Device ID migration sent. Waiting for firmware acknowledgement. Request ID: ${
            response.data?.requestId || "created"
          }`
      );

      setNewDeviceId("");
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setMigratingId(false);
    }
  };

  const sendRelayCommand = async (action) => {
    if (action === "relayStart") {
      const confirmed = window.confirm(
        `Start relay test for ${relayDuration} seconds?\n\nEnsure the output is safe and no vehicle is connected.`
      );

      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        "Send relay stop command?"
      );

      if (!confirmed) return;
    }

    setSendingCommand(true);

    try {
      const payload =
        action === "relayStart"
          ? {
              action,
              testMode: true,
              durationSeconds: Number(relayDuration),
            }
          : { action };

      const response = await maintenanceApi.sendCommand(
        device._id,
        payload
      );

      onSuccess(
        `${action} command sent. Request ID: ${
          response.data?.requestId || "created"
        }`
      );
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setSendingCommand(false);
    }
  };

  const calibrationLabels =
    profile === "legacy"
      ? [
          ["cf", "CF calibration factor"],
          ["vf", "VF calibration factor"],
          ["currentRF", "Current reference factor"],
        ]
      : [
          ["vf", "Voltage factor (VF)"],
          ["currentZero", "Current zero offset"],
          ["currentGain", "Current gain"],
          ["powerZero", "Power zero offset"],
          ["powerGain", "Power gain"],
        ];

  return (
    <Stack spacing={2.5}>
      {/* Wi-Fi configuration */}

      <Paper variant="outlined" sx={cardSx}>
        <SectionTitle
          title="Wi-Fi configuration"
          description="Update the SSID and password stored by the device."
        />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Field
              label="Wi-Fi SSID"
              value={ssid}
              onChange={setSsid}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Field
              label="New Wi-Fi password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="new-password"
              helperText={
                device.wifiPasswordConfigured
                  ? "A password is already configured. Enter the new password to replace it."
                  : "Password is not returned by the backend. Enter the password to configure it."
              }
            />
          </Grid>
        </Grid>

        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{ mt: 2 }}
        >
          <Button
            variant="contained"
            onClick={saveWifi}
            disabled={savingWifi}
          >
            {savingWifi ? "Sending..." : "Update Wi-Fi"}
          </Button>
        </Stack>
      </Paper>

      {/* Calibration */}

      <Paper variant="outlined" sx={cardSx}>
        <SectionTitle
          title="Meter calibration"
          description={
            profile === "legacy"
              ? "Legacy firmware calibration parameters."
              : "V3 calibration coefficients. Enter the values you intend to apply."
          }
        />

        <Grid container spacing={2}>
          {calibrationLabels.map(([key, label]) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <Field
                label={label}
                type="number"
                value={calibration[key]}
                onChange={(value) =>
                  updateCalibrationField(key, value)
                }
              />
            </Grid>
          ))}
        </Grid>

        <Alert severity="info" sx={{ mt: 2 }}>
          Verify calibration values against a known reference
          meter and load before sending them to a live charger.
        </Alert>

        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{ mt: 2 }}
        >
          <Button
            variant="contained"
            onClick={saveCalibration}
            disabled={savingCalibration}
          >
            {savingCalibration
              ? "Sending..."
              : "Update calibration"}
          </Button>
        </Stack>
      </Paper>

      {/* Device ID migration */}

      <Paper variant="outlined" sx={cardSx}>
        <SectionTitle
          title="Device ID migration"
          description="The current Device ID remains unchanged until the firmware ACK is received and accepted by the backend."
        />

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Field
              label="Current Device ID"
              value={device.device_id || ""}
              onChange={() => {}}
              disabled
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Field
              label="New Device ID"
              value={newDeviceId}
              onChange={setNewDeviceId}
              placeholder="Enter new ID"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              color="warning"
              startIcon={<SwapHorizIcon />}
              onClick={migrateDeviceId}
              disabled={migratingId}
              sx={{ height: 40 }}
            >
              {migratingId
                ? "Sending..."
                : "Migrate Device ID"}
            </Button>
          </Grid>
        </Grid>

        <Alert severity="warning" sx={{ mt: 2 }}>
          Do not power off or reset the charger while the
          migration is being applied. Check the History tab
          for the final ACK status.
        </Alert>
      </Paper>

      {/* V3 relay test */}

      {profile === "v3" && (
        <Paper variant="outlined" sx={cardSx}>
          <SectionTitle
            title="Relay test"
            description="V3-only test commands. Use only when the charger output is safe to operate."
          />

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Test duration"
                value={relayDuration}
                onChange={(event) =>
                  setRelayDuration(
                    Number(event.target.value)
                  )
                }
                sx={inputSx}
              >
                {[5, 10, 15, 20].map((seconds) => (
                  <MenuItem
                    key={seconds}
                    value={seconds}
                  >
                    {seconds} seconds
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<SettingsEthernetIcon />}
                disabled={sendingCommand}
                onClick={() =>
                  sendRelayCommand("relayStart")
                }
              >
                Relay ON test
              </Button>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                disabled={sendingCommand}
                onClick={() =>
                  sendRelayCommand("relayStop")
                }
              >
                Relay OFF
              </Button>
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 2 }}>
            Relay ON requires testMode=true and is restricted
            to V3 devices by the backend. Do not use this as a
            customer charging-session control.
          </Alert>
        </Paper>
      )}
    </Stack>
  );
}

/* =========================================================
   DATABASE MAINTENANCE
========================================================= */

function DatabaseMaintenance({
  device,
  onSuccess,
  onError,
}) {
  const definitions = [
    { key: "project", label: "Project" },
    { key: "charger_type", label: "Charger type" },
    { key: "location", label: "Location" },
    { key: "area", label: "Area" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    {
      key: "lat",
      label: "Latitude",
      type: "number",
    },
    {
      key: "lng",
      label: "Longitude",
      type: "number",
    },
    {
      key: "rate",
      label: "User rate per kWh (₹)",
      type: "number",
    },
    {
      key: "meterConsumerNumber",
      label: "Meter consumer number",
    },
    {
      key: "commercial.userRatePerKwh",
      label: "Commercial user rate (₹)",
      type: "number",
    },
    {
      key: "commercial.vjraMarginPerKwh",
      label: "VJRA margin per kWh (₹)",
      type: "number",
    },
    {
      key: "commercial.ownerSharePerKwh",
      label: "Owner share per kWh (₹)",
      type: "number",
    },
    {
      key: "commercial.pgPercent",
      label: "Payment gateway (%)",
      type: "number",
    },
    {
      key: "commercial.gstPercent",
      label: "GST (%)",
      type: "number",
    },
  ];

  const getValue = (source, path) =>
    path
      .split(".")
      .reduce((value, key) => value?.[key], source);

  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = {};

    definitions.forEach(({ key }) => {
      const value = getValue(device, key);

      next[key] =
        value === null || value === undefined
          ? ""
          : String(value);
    });

    next.meterType = device.meterType || "";

    next["commercial.electricityBearer"] =
      device.commercial?.electricityBearer || "";

    setValues(next);

    // Reset edits when selected device changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device._id]);

  const changedValues = useMemo(() => {
    const changes = {};

    definitions.forEach(({ key, type }) => {
      const original = getValue(device, key);
      const current = values[key] ?? "";

      const originalText =
        original === null || original === undefined
          ? ""
          : String(original);

      if (current !== originalText) {
        changes[key] =
          type === "number" && current !== ""
            ? Number(current)
            : current;
      }
    });

    [
      "meterType",
      "commercial.electricityBearer",
    ].forEach((key) => {
      const original = getValue(device, key) || "";
      const current = values[key] || "";

      if (current !== original) {
        changes[key] = current || null;
      }
    });

    return changes;
  }, [device, values]);

  const setValue = (key, value) => {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const save = async () => {
    if (Object.keys(changedValues).length === 0) {
      onError("No database changes to save.");
      return;
    }

    for (const [key, value] of Object.entries(
      changedValues
    )) {
      if (
        ["lat", "lng", "rate"].includes(key) ||
        key.startsWith("commercial.")
      ) {
        if (
          value !== null &&
          value !== "" &&
          !Number.isFinite(Number(value))
        ) {
          onError(`${key} must be numeric.`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      await maintenanceApi.updateDatabase(
        device._id,
        changedValues
      );

      onSuccess(
        `Database updated successfully (${
          Object.keys(changedValues).length
        } field(s)).`
      );
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    const next = {};

    definitions.forEach(({ key }) => {
      const value = getValue(device, key);

      next[key] =
        value === null || value === undefined
          ? ""
          : String(value);
    });

    next.meterType = device.meterType || "";

    next["commercial.electricityBearer"] =
      device.commercial?.electricityBearer || "";

    setValues(next);
  };

  return (
    <Paper variant="outlined" sx={cardSx}>
      <SectionTitle
        title="Selective database update"
        description="Only modified fields will be sent. The backend validates the permitted fields."
        action={
          <Chip
            size="small"
            label={`${Object.keys(changedValues).length} changed`}
            color={
              Object.keys(changedValues).length
                ? "warning"
                : "default"
            }
          />
        }
      />

      <Grid container spacing={2}>
        {definitions.map(({ key, label, type }) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <Field
              label={label}
              type={type || "text"}
              value={values[key]}
              onChange={(value) => setValue(key, value)}
            />
          </Grid>
        ))}

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            size="small"
            label="Meter type"
            value={values.meterType || ""}
            onChange={(event) =>
              setValue("meterType", event.target.value)
            }
            sx={inputSx}
          >
            <MenuItem value="">
              Not specified
            </MenuItem>

            <MenuItem value="Green Meter">
              Green Meter
            </MenuItem>

            <MenuItem value="Commercial">
              Commercial
            </MenuItem>

            <MenuItem value="Residential">
              Residential
            </MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            size="small"
            label="Electricity bearer"
            value={
              values["commercial.electricityBearer"] || ""
            }
            onChange={(event) =>
              setValue(
                "commercial.electricityBearer",
                event.target.value
              )
            }
            sx={inputSx}
          >
            <MenuItem value="">
              Not specified
            </MenuItem>

            <MenuItem value="OWNER">
              Owner
            </MenuItem>

            <MenuItem value="VJRA">
              VJRA
            </MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        Firmware settings and database settings are
        separate. Changing values here does not publish a
        firmware configuration command.
      </Alert>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="flex-end"
        spacing={1}
        sx={{ mt: 2 }}
      >
        <Button
          variant="outlined"
          onClick={resetChanges}
          disabled={saving}
        >
          Reset changes
        </Button>

        <Button
          variant="contained"
          onClick={save}
          disabled={
            saving ||
            Object.keys(changedValues).length === 0
          }
        >
          {saving
            ? "Saving..."
            : "Save database changes"}
        </Button>
      </Stack>
    </Paper>
  );
}

/* =========================================================
   MAINTENANCE HISTORY
========================================================= */

function CommandHistory({ device, revision }) {
  const [history, setHistory] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    if (!device?._id) return;

    setLoading(true);
    setError("");

    try {
      const response =
        await maintenanceApi.getHistory(
          device._id,
          {
            page,
            limit: PAGE_SIZE,
          }
        );

      setHistory(response.data?.data || []);

      setPagination(
        response.data?.pagination || {
          page,
          limit: PAGE_SIZE,
          total: 0,
          pages: 1,
        }
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [device?._id, page]);

  useEffect(() => {
    setPage(1);
  }, [device?._id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, revision]);

  const prettyChanges = (changes) => {
    if (!changes || typeof changes !== "object") {
      return "—";
    }

    return Object.entries(changes)
      .map(([key, value]) => {
        const safeValue =
          key.toLowerCase().includes("password")
            ? "[REDACTED]"
            : value;

        if (
          safeValue &&
          typeof safeValue === "object"
        ) {
          return `${key}: ${JSON.stringify(safeValue)}`;
        }

        return `${key}: ${safeValue ?? "—"}`;
      })
      .join("\n");
  };

  return (
    <Paper variant="outlined" sx={cardSx}>
      <SectionTitle
        title="Maintenance history"
        description="Firmware updates, calibration changes, database edits, commands and Device ID migrations."
        action={
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadHistory}
            disabled={loading}
          >
            Refresh history
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <CircularProgress size={26} />
        </Box>
      ) : history.length === 0 ? (
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{ py: 3 }}
        >
          No maintenance history found for this device.
        </Typography>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Operation</TableCell>
                  <TableCell>Profile</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Request ID</TableCell>
                  <TableCell>Changes</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {history.map((item) => (
                  <TableRow
                    key={item.requestId}
                    hover
                  >
                    <TableCell sx={{ minWidth: 145 }}>
                      {formatDate(item.createdAt)}
                    </TableCell>

                    <TableCell sx={{ minWidth: 135 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                      >
                        {item.operation ||
                          item.category ||
                          "—"}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {item.category || "—"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {item.firmwareProfile || "—"}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={item.status || "unknown"}
                        color={statusColor(item.status)}
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell sx={{ minWidth: 150 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: "monospace",
                          wordBreak: "break-all",
                        }}
                      >
                        {item.requestId || "—"}
                      </Typography>
                    </TableCell>

                    <TableCell
                      sx={{
                        minWidth: 220,
                        maxWidth: 300,
                      }}
                    >
                      <Typography
                        variant="caption"
                        component="pre"
                        sx={{
                          m: 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontFamily: "inherit",
                        }}
                      >
                        {prettyChanges(item.changes)}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ minWidth: 180 }}>
                      <Typography variant="caption">
                        {item.errorMessage ||
                          item.acknowledgement?.message ||
                          item.acknowledgement?.status ||
                          "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
            >
              {pagination.total} total records
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                disabled={page <= 1}
                onClick={() =>
                  setPage((value) => value - 1)
                }
              >
                Previous
              </Button>

              <Typography
                variant="body2"
                sx={{ alignSelf: "center" }}
              >
                {page} / {Math.max(1, pagination.pages)}
              </Typography>

              <Button
                size="small"
                disabled={page >= pagination.pages}
                onClick={() =>
                  setPage((value) => value + 1)
                }
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </>
      )}
    </Paper>
  );
}

/* =========================================================
   MAIN DEVICE MAINTENANCE PAGE
========================================================= */

export default function DeviceMaintenance() {
  const [tab, setTab] = useState(0);

  const [devices, setDevices] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [deviceDetails, setDeviceDetails] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState(null);

  const device = deviceDetails?.device || null;

  const profile =
    deviceDetails?.firmwareProfile ||
    device?.firmwareProfile ||
    "legacy";

  const production =
    deviceDetails?.production || null;

  const showSuccess = (message) => {
    setNotice({
      severity: "success",
      message,
    });

    setRevision((value) => value + 1);
  };

  const showError = (message) => {
    setNotice({
      severity: "error",
      message,
    });
  };

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);

    try {
      const response =
        await maintenanceApi.listDevices({
          search: search.trim(),
          page,
          limit: PAGE_SIZE,
        });

      const rows = response.data?.data || [];
      const pagination =
        response.data?.pagination || {};

      setDevices(rows);
      setPages(
        Math.max(1, pagination.pages || 1)
      );

      if (
        selectedId &&
        !rows.some(
          (row) =>
            String(row._id) === String(selectedId)
        )
      ) {
        setSelectedId("");
        setDeviceDetails(null);
      }
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setLoadingDevices(false);
    }
  }, [search, page, selectedId]);

  const loadDeviceDetails = useCallback(
    async (id) => {
      if (!id) {
        setDeviceDetails(null);
        return;
      }

      setLoadingDetails(true);

      try {
        const response =
          await maintenanceApi.getDevice(id);

        setDeviceDetails(
          response.data?.data || null
        );
      } catch (error) {
        setDeviceDetails(null);
        showError(getErrorMessage(error));
      } finally {
        setLoadingDetails(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (selectedId) {
      loadDeviceDetails(selectedId);
    } else {
      setDeviceDetails(null);
    }
  }, [
    selectedId,
    loadDeviceDetails,
    revision,
  ]);

  const refreshAll = () => {
    loadDevices();

    if (selectedId) {
      loadDeviceDetails(selectedId);
    }

    setRevision((value) => value + 1);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        maxWidth: 1600,
        mx: "auto",
        pb: 5,
      }}
    >
      <Stack spacing={2.5}>
        {/* Page heading */}

        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              fontSize: {
                xs: 23,
                md: 30,
              },
            }}
          >
            Device Maintenance
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Manage firmware configuration, calibration,
            device identity and database records.
          </Typography>
        </Box>

        {/* Notifications */}

        {notice && (
          <Alert
            severity={notice.severity}
            onClose={() => setNotice(null)}
          >
            {notice.message}
          </Alert>
        )}

        {/* Device selector */}

        <DeviceSelector
          devices={devices}
          selectedId={selectedId}
          onSelect={setSelectedId}
          search={search}
          onSearchChange={handleSearch}
          loading={loadingDevices}
          page={page}
          pages={pages}
          onPageChange={setPage}
          onRefresh={refreshAll}
        />

        {/* Loading device details */}

        {loadingDetails && (
          <Box
            sx={{
              py: 3,
              textAlign: "center",
            }}
          >
            <CircularProgress size={28} />

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Loading device details...
            </Typography>
          </Box>
        )}

        {/* Selected device */}

        {device && !loadingDetails && (
          <>
            <DeviceSummary
              device={device}
              profile={profile}
              production={production}
            />

            <Paper
              variant="outlined"
              sx={{
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <Tabs
                value={tab}
                onChange={(_, value) =>
                  setTab(value)
                }
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  px: 1,
                  "& .MuiTab-root": {
                    minHeight: 58,
                    textTransform: "none",
                    fontWeight: 700,
                  },
                }}
              >
                <Tab
                  icon={<MemoryIcon />}
                  iconPosition="start"
                  label="Firmware maintenance"
                />

                <Tab
                  icon={<StorageIcon />}
                  iconPosition="start"
                  label="Database maintenance"
                />

                <Tab
                  icon={<HistoryIcon />}
                  iconPosition="start"
                  label="History"
                />
              </Tabs>

              <Divider />

              <Box
                sx={{
                  p: {
                    xs: 1.5,
                    md: 2.5,
                  },
                }}
              >
                {tab === 0 && (
                  <FirmwareMaintenance
                    device={device}
                    profile={profile}
                    onSuccess={showSuccess}
                    onError={showError}
                  />
                )}

                {tab === 1 && (
                  <DatabaseMaintenance
                    device={device}
                    onSuccess={showSuccess}
                    onError={showError}
                  />
                )}

                {tab === 2 && (
                  <CommandHistory
                    device={device}
                    revision={revision}
                  />
                )}
              </Box>
            </Paper>
          </>
        )}

        {/* No device selected */}

        {!selectedId && !loadingDevices && (
          <Paper
            variant="outlined"
            sx={{
              ...cardSx,
              textAlign: "center",
              py: 5,
            }}
          >
            <MemoryIcon
              sx={{
                fontSize: 42,
                color: "text.secondary",
                mb: 1,
              }}
            />

            <Typography fontWeight={700}>
              Select a device to begin
            </Typography>

            <Typography
              color="text.secondary"
              variant="body2"
            >
              Choose a device from the selector above
              to view its maintenance controls and history.
            </Typography>
          </Paper>
        )}

        {loadingDevices && (
          <Box
            sx={{
              textAlign: "center",
              py: 2,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
