// Production.js
// Admin production lifecycle console:
// Group A -> Group B -> Live Device configuration
//
// Backend contract used by this page:
//   /api/provision/group-a
//   /api/provision/group-a/:serial
//   /api/provision/group-a/:serial/promote
//   /api/devices/admin-dashboard
//   /api/devices/admin/config/:deviceId
//
// The frontend never publishes MQTT directly. The backend owns MQTT delivery,
// NVS versioning and configuration acknowledgement tracking.

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Divider,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import FactoryIcon from "@mui/icons-material/Factory";
import MemoryIcon from "@mui/icons-material/Memory";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";

import { api } from "../../api"; // Assumes API_BASE is handled inside api instance

const PAGE_SIZE = 25;

const DEFAULT_GROUP_A = {
  serialNumber: "",
  hardwareRevision: "PCB_V1.2",
  project: "VIZTEST",
  pcbBatch: "V1.0",
  manufacturedAt: "",
  notes: "",
};

const DEFAULT_GROUP_B = {
  deviceId: "",
  wifiSSID: "Airtel_Vjra",
  wifiPassword: "VIZ@Vjra3",
  cf: "0.231",
  vf: "1.880",
  currentRF: "0.001",
  rate: "20",
  location: "VJRA Test Lab",
  lat: "41.3035742",
  lng: "-81.902345",
  area: "TEST",
  city: "TEST",
  state: "Maharashtra",
  charger_type: "AC_3.3KW",
  meterType: "Commercial",
  meterConsumerNumber: "",
  electricityBearer: "OWNER",
  userRatePerKwh: "",
  vjraMarginPerKwh: "",
  ownerSharePerKwh: "",
  pgPercent: "",
  targetFirmwareVersion: "",
  notes: "",
};

const DEFAULT_DEVICE_CONFIG = {
  cf: "",
  vf: "",
  currentRF: "",
  wifiSSID: "",
  wifiPassword: "",
  rate: "",
  location: "",
  lat: "",
  lng: "",
  area: "",
  city: "",
  state: "",
  meterType: "",
  meterConsumerNumber: "",
  electricityBearer: "OWNER",
  userRatePerKwh: "",
  vjraMarginPerKwh: "",
  ownerSharePerKwh: "",
  pgPercent: "",
  targetFirmwareVersion: "",
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.details ||
    error?.message ||
    "Something went wrong."
  );
}

function normalize(value) {
  return String(value ?? "").trim();
}

function titleStatus(value) {
  const text = normalize(value).replace(/_/g, " ");
  if (!text) return "Unknown";
  return text
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function statusColor(status) {
  const normalized = normalize(status).toLowerCase();
  if (["ok", "acknowledged", "online", "available", "live"].includes(normalized)) {
    return "success";
  }
  if (["sent", "group_b", "dispatched", "pending"].includes(normalized)) {
    return "warning";
  }
  if (["error", "failed", "offline", "faulty"].includes(normalized)) {
    return "error";
  }
  return "default";
}

function statusLabel(device) {
  const lifecycle = device?.manufacturingStatus;
  if (lifecycle) return titleStatus(lifecycle);
  if (device?.status) return titleStatus(device.status);
  return "Unknown";
}

function createCommercial(form) {
  const commercial = {
    electricityBearer: form.electricityBearer || "OWNER",
  };
  const fieldMap = [
    ["userRatePerKwh", "userRatePerKwh"],
    ["vjraMarginPerKwh", "vjraMarginPerKwh"],
    ["ownerSharePerKwh", "ownerSharePerKwh"],
    ["pgPercent", "pgPercent"],
  ];

  fieldMap.forEach(([source, target]) => {
    const value = toNumber(form[source]);
    if (value !== undefined) commercial[target] = value;
  });

  return commercial;
}

// --- UI Styling Constants (Light Theme / Industrial) ---
const buttonPrimarySx = {
  textTransform: "none",
  fontWeight: 600,
  boxShadow: "none",
  borderRadius: 2,
  px: 3,
  bgcolor: "#2563eb",
  "&:hover": { bgcolor: "#1d4ed8", boxShadow: "none" },
};

const buttonSecondarySx = {
  textTransform: "none",
  fontWeight: 600,
  borderRadius: 2,
  px: 3,
  borderColor: "#cbd5e1",
  color: "#475569",
  "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#ffffff",
    borderRadius: 1.5,
    "& fieldset": { borderColor: "#cbd5e1" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: "#2563eb" },
  },
  "& .MuiInputLabel-root": {
    color: "#64748b",
  },
};

const dialogPaperSx = {
  borderRadius: 3,
  boxShadow: "0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)",
};

function StatusBadge({ label, statusColorType }) {
  const colors = {
    success: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
    warning: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
    error: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
    default: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
  };
  const theme = colors[statusColorType] || colors.default;

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: theme.bg,
        color: theme.color,
        border: `1px solid ${theme.border}`,
        fontWeight: 600,
        borderRadius: 1.5,
      }}
    />
  );
}

function StatCard({ icon, label, value, accent = "#2563eb", helper }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        minHeight: 120,
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        bgcolor: "#ffffff",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.02)",
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 0.5, fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
            {value}
          </Typography>
          {helper ? (
            <Typography variant="caption" sx={{ color: "#94a3b8", mt: 1, display: "block" }}>
              {helper}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2.5,
            display: "grid",
            placeItems: "center",
            color: accent,
            background: `${accent}15`, // Light transparent background
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, helperText, disabled, required }) {
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value ?? ""}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      helperText={helperText}
      disabled={disabled}
      required={required}
      InputLabelProps={type === "date" ? { shrink: true } : undefined}
      sx={fieldSx}
    />
  );
}

function EmptyState({ title, subtitle, action }) {
  return (
    <Box sx={{ p: 8, textAlign: "center", bgcolor: "#ffffff", borderRadius: 3, border: "1px dashed #cbd5e1", m: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
        {subtitle}
      </Typography>
      {action}
    </Box>
  );
}

export default function Production() {
  const [tab, setTab] = useState(0);

  const [groupA, setGroupA] = useState([]);
  const [groupATotal, setGroupATotal] = useState(0);
  const [groupAPage, setGroupAPage] = useState(0);
  const [groupALoading, setGroupALoading] = useState(false);
  const [groupAFilter, setGroupAFilter] = useState({
    search: "",
    hardwareRevision: "",
    pcbBatch: "",
  });

  const [liveDevices, setLiveDevices] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSearch, setLiveSearch] = useState("");
  const [liveStatus, setLiveStatus] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_GROUP_A);
  const [creating, setCreating] = useState(false);

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteDevice, setPromoteDevice] = useState(null);
  const [promoteForm, setPromoteForm] = useState(DEFAULT_GROUP_B);
  const [promoting, setPromoting] = useState(false);

  const [editAOpen, setEditAOpen] = useState(false);
  const [editADevice, setEditADevice] = useState(null);
  const [editAForm, setEditAForm] = useState(DEFAULT_GROUP_A);
  const [savingA, setSavingA] = useState(false);

  const [deviceConfigOpen, setDeviceConfigOpen] = useState(false);
  const [selectedLiveDevice, setSelectedLiveDevice] = useState(null);
  const [deviceConfig, setDeviceConfig] = useState(DEFAULT_DEVICE_CONFIG);
  const [savingDeviceConfig, setSavingDeviceConfig] = useState(false);

  const [busySerial, setBusySerial] = useState("");

  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, severity, message });
  }, []);

  const handleRequestError = useCallback(
    (error, fallback) => {
      const status = error?.response?.status;
      if (status === 401) {
        showToast("Your admin session has expired. Please sign in again.", "error");
      } else if (status === 403) {
        showToast("Admin access is required for this operation.", "error");
      } else {
        showToast(`${fallback}: ${getErrorMessage(error)}`, "error");
      }
    },
    [showToast]
  );

  const fetchGroupA = useCallback(async () => {
    setGroupALoading(true);
    try {
      const response = await api.get("/api/provision/group-a", {
        params: {
          page: groupAPage + 1,
          limit: PAGE_SIZE,
          hardwareRevision: groupAFilter.hardwareRevision || undefined,
          pcbBatch: groupAFilter.pcbBatch || undefined,
        },
      });

      const payload = response?.data || {};
      const data = Array.isArray(payload?.data) ? payload.data : [];
      const search = normalize(groupAFilter.search).toLowerCase();

      const searched = search
        ? data.filter((item) => {
            const serial = normalize(item.serialNumber).toLowerCase();
            const project = normalize(item.project).toLowerCase();
            return serial.includes(search) || project.includes(search);
          })
        : data;

      setGroupA(searched);
      setGroupATotal(Number(payload?.total) || searched.length);
    } catch (error) {
      setGroupA([]);
      setGroupATotal(0);
      handleRequestError(error, "Unable to load Group A devices");
    } finally {
      setGroupALoading(false);
    }
  }, [groupAFilter.hardwareRevision, groupAFilter.pcbBatch, groupAFilter.search, groupAPage, handleRequestError]);

  const fetchLiveDevices = useCallback(async () => {
    setLiveLoading(true);
    try {
      const response = await api.get("/api/devices/admin-dashboard");
      const payload = response?.data || {};
      setLiveDevices(Array.isArray(payload?.devices) ? payload.devices : []);
    } catch (error) {
      setLiveDevices([]);
      handleRequestError(error, "Unable to load live devices");
    } finally {
      setLiveLoading(false);
    }
  }, [handleRequestError]);

  useEffect(() => {
    fetchGroupA();
  }, [fetchGroupA]);

  useEffect(() => {
    if (tab === 1) fetchLiveDevices();
  }, [fetchLiveDevices, tab]);

  const liveFiltered = useMemo(() => {
    const query = normalize(liveSearch).toLowerCase();
    const status = normalize(liveStatus).toLowerCase();

    return liveDevices.filter((device) => {
      const matchesStatus = !status || normalize(device.status).toLowerCase() === status;
      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [
        device.device_id,
        device.serialNumber,
        device.location,
        device.project,
        device.city,
        device.area,
      ]
        .map((item) => normalize(item).toLowerCase())
        .join(" ");

      return haystack.includes(query);
    });
  }, [liveDevices, liveSearch, liveStatus]);

  const stats = useMemo(() => {
    const live = liveDevices.length;
    const online = liveDevices.filter((d) => ["online", "available"].includes(normalize(d.status).toLowerCase())).length;
    const charging = liveDevices.filter((d) => ["occupied", "busy"].includes(normalize(d.status).toLowerCase())).length;
    const pending = liveDevices.filter((d) => normalize(d.onboardingStatus).toLowerCase() === "pending").length;

    return {
      groupA: groupATotal,
      live,
      online,
      charging,
      pending,
    };
  }, [groupATotal, liveDevices]);

  const updateForm = (setter) => (field) => (event) => {
    setter((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateForm(DEFAULT_GROUP_A);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (!normalize(createForm.serialNumber) || !normalize(createForm.hardwareRevision)) {
      showToast("Serial number and hardware revision are required.", "error");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        serialNumber: normalize(createForm.serialNumber),
        hardwareRevision: normalize(createForm.hardwareRevision),
        project: normalize(createForm.project),
        pcbBatch: normalize(createForm.pcbBatch) || undefined,
        manufacturedAt: createForm.manufacturedAt
          ? new Date(`${createForm.manufacturedAt}T00:00:00`).toISOString()
          : undefined,
        notes: normalize(createForm.notes),
      };

      await api.post("/api/provision/group-a", payload);
      showToast(`Serial ${payload.serialNumber} added to Group A.`);
      closeCreate();
      setGroupAPage(0);
      await fetchGroupA();
    } catch (error) {
      handleRequestError(error, "Unable to create Group A record");
    } finally {
      setCreating(false);
    }
  };

  const openEditA = (device) => {
    setEditADevice(device);
    setEditAForm({
      serialNumber: device?.serialNumber || "",
      hardwareRevision: device?.hardwareRevision || "",
      project: device?.project || "",
      pcbBatch: device?.pcbBatch || "",
      manufacturedAt: formatDateInput(device?.manufacturedAt),
      notes: device?.notes || "",
    });
    setEditAOpen(true);
  };

  const submitEditA = async (event) => {
    event.preventDefault();
    if (!editADevice?.serialNumber) return;

    setSavingA(true);
    try {
      const payload = {
        hardwareRevision: normalize(editAForm.hardwareRevision),
        project: normalize(editAForm.project),
        pcbBatch: normalize(editAForm.pcbBatch) || undefined,
        manufacturedAt: editAForm.manufacturedAt
          ? new Date(`${editAForm.manufacturedAt}T00:00:00`).toISOString()
          : undefined,
        notes: normalize(editAForm.notes),
      };

      await api.patch(
        `/api/provision/group-a/${encodeURIComponent(editADevice.serialNumber)}`,
        payload
      );

      showToast(`Group A record ${editADevice.serialNumber} updated.`);
      setEditAOpen(false);
      await fetchGroupA();
    } catch (error) {
      handleRequestError(error, "Unable to update Group A record");
    } finally {
      setSavingA(false);
    }
  };

  const deleteGroupA = async (device) => {
    if (!device?.serialNumber) return;

    const confirmed = window.confirm(
      `Delete Group A record ${device.serialNumber}?\n\nThis is allowed only while the device remains in Group A.`
    );
    if (!confirmed) return;

    setBusySerial(device.serialNumber);
    try {
      await api.delete(
        `/api/provision/group-a/${encodeURIComponent(device.serialNumber)}`
      );
      showToast(`Group A record ${device.serialNumber} deleted.`);
      await fetchGroupA();
    } catch (error) {
      handleRequestError(error, "Unable to delete Group A record");
    } finally {
      setBusySerial("");
    }
  };

  const openPromote = (device) => {
    setPromoteDevice(device);
    setPromoteForm({
      ...DEFAULT_GROUP_B,
      cf: String(device?.cf ?? DEFAULT_GROUP_B.cf),
      vf: String(device?.vf ?? DEFAULT_GROUP_B.vf),
      currentRF: String(device?.currentRF ?? DEFAULT_GROUP_B.currentRF),
      rate: String(device?.rate ?? DEFAULT_GROUP_B.rate),
      charger_type: device?.charger_type || DEFAULT_GROUP_B.charger_type,
      targetFirmwareVersion: device?.targetFirmwareVersion || "",
      notes: device?.notes || "",
    });
    setPromoteOpen(true);
  };

  const closePromote = () => {
    setPromoteOpen(false);
    setPromoteDevice(null);
    setPromoteForm(DEFAULT_GROUP_B);
  };

  const submitPromote = async (event) => {
    event.preventDefault();
    if (!promoteDevice?.serialNumber) return;

    const required = {
      deviceId: promoteForm.deviceId,
      wifiSSID: promoteForm.wifiSSID,
      wifiPassword: promoteForm.wifiPassword,
      rate: promoteForm.rate,
      location: promoteForm.location,
      lat: promoteForm.lat,
      lng: promoteForm.lng,
      area: promoteForm.area,
      city: promoteForm.city,
      state: promoteForm.state,
      charger_type: promoteForm.charger_type,
    };

    const missing = Object.entries(required)
      .filter(([, value]) => normalize(value) === "")
      .map(([key]) => key);

    const numericCheck = [
      ["cf", promoteForm.cf],
      ["vf", promoteForm.vf],
      ["currentRF", promoteForm.currentRF],
      ["rate", promoteForm.rate],
      ["lat", promoteForm.lat],
      ["lng", promoteForm.lng],
    ];

    const invalidNumbers = numericCheck
      .filter(([, value]) => value !== "" && toNumber(value) === undefined)
      .map(([key]) => key);

    if (missing.length) {
      showToast(`Complete required Group B fields: ${missing.join(", ")}.`, "error");
      return;
    }

    if (invalidNumbers.length) {
      showToast(`Enter valid numbers for: ${invalidNumbers.join(", ")}.`, "error");
      return;
    }

    setPromoting(true);
    try {
      const payload = {
        deviceId: normalize(promoteForm.deviceId).toUpperCase(),
        wifiSSID: normalize(promoteForm.wifiSSID),
        wifiPassword: promoteForm.wifiPassword,
        cf: toNumber(promoteForm.cf),
        vf: toNumber(promoteForm.vf),
        currentRF: toNumber(promoteForm.currentRF),
        rate: toNumber(promoteForm.rate),
        location: normalize(promoteForm.location),
        lat: toNumber(promoteForm.lat),
        lng: toNumber(promoteForm.lng),
        area: normalize(promoteForm.area),
        city: normalize(promoteForm.city),
        state: normalize(promoteForm.state),
        charger_type: normalize(promoteForm.charger_type),
        meterType: promoteForm.meterType || null,
        meterConsumerNumber: normalize(promoteForm.meterConsumerNumber) || null,
        commercial: createCommercial(promoteForm),
        targetFirmwareVersion: normalize(promoteForm.targetFirmwareVersion) || null,
        notes: normalize(promoteForm.notes),
      };

      const response = await api.post(
        `/api/provision/group-a/${encodeURIComponent(promoteDevice.serialNumber)}/promote`,
        payload
      );

      const nvsVersion = response?.data?.config?.nvsVersion;
      const topic = response?.data?.config?.topic;

      showToast(
        `Promoted ${promoteDevice.serialNumber} to Group B${
          nvsVersion ? ` · NVS v${nvsVersion}` : ""
        }${topic ? ` · ${topic}` : ""}`
      );

      closePromote();
      await fetchGroupA();
      if (tab === 1) await fetchLiveDevices();
    } catch (error) {
      handleRequestError(error, "Unable to promote device to Group B");
    } finally {
      setPromoting(false);
    }
  };

  const openDeviceConfig = (device) => {
    setSelectedLiveDevice(device);
    const commercial = device?.commercial || {};

    setDeviceConfig({
      cf: device?.cf ?? "",
      vf: device?.vf ?? "",
      currentRF: device?.currentRF ?? "",
      wifiSSID: device?.wifiSSID ?? "",
      wifiPassword: "",
      rate: device?.rate ?? "",
      location: device?.location ?? "",
      lat: device?.lat ?? "",
      lng: device?.lng ?? "",
      area: device?.area ?? "",
      city: device?.city ?? "",
      state: device?.state ?? "",
      meterType: device?.meterType ?? "",
      meterConsumerNumber: device?.meterConsumerNumber ?? "",
      electricityBearer: commercial?.electricityBearer || "OWNER",
      userRatePerKwh: commercial?.userRatePerKwh ?? "",
      vjraMarginPerKwh: commercial?.vjraMarginPerKwh ?? "",
      ownerSharePerKwh: commercial?.ownerSharePerKwh ?? "",
      pgPercent: commercial?.pgPercent ?? "",
      targetFirmwareVersion: device?.targetFirmwareVersion ?? "",
    });
    setDeviceConfigOpen(true);
  };

  const buildDeviceConfigPatch = () => {
    const patch = {};
    const current = selectedLiveDevice || {};

    const setNumericIfChanged = (field) => {
      const raw = deviceConfig[field];
      if (raw === "") return;
      const value = toNumber(raw);
      if (value === undefined) throw new Error(`${field} must be numeric.`);
      if (String(current[field] ?? "") !== String(value)) patch[field] = value;
    };

    ["cf", "vf", "currentRF", "rate", "lat", "lng"].forEach(setNumericIfChanged);

    const textFields = [
      "wifiSSID",
      "location",
      "area",
      "city",
      "state",
      "meterType",
      "meterConsumerNumber",
      "targetFirmwareVersion",
    ];

    textFields.forEach((field) => {
      const next = normalize(deviceConfig[field]);
      const previous = normalize(current[field]);
      if (next !== previous) patch[field] = next;
    });

    if (normalize(deviceConfig.wifiPassword)) {
      patch.wifiPassword = deviceConfig.wifiPassword;
    }

    const currentCommercial = current?.commercial || {};
    const nextCommercial = createCommercial(deviceConfig);
    const commercialChanged = JSON.stringify(currentCommercial || {}) !== JSON.stringify(nextCommercial);
    if (commercialChanged) patch.commercial = nextCommercial;

    return patch;
  };

  const saveDeviceConfig = async () => {
    if (!selectedLiveDevice?.device_id) return;

    let patch;
    try {
      patch = buildDeviceConfigPatch();
    } catch (error) {
      showToast(error.message, "error");
      return;
    }

    if (!Object.keys(patch).length) {
      showToast("No changes to save.", "info");
      return;
    }

    setSavingDeviceConfig(true);
    try {
      await api.patch(
        `/api/devices/admin/config/${encodeURIComponent(selectedLiveDevice.device_id)}`,
        patch
      );

      showToast(
        `Configuration saved for ${selectedLiveDevice.device_id}. Backend will deliver the updated firmware configuration.`
      );
      setDeviceConfigOpen(false);
      await fetchLiveDevices();
    } catch (error) {
      handleRequestError(error, "Unable to update device configuration");
    } finally {
      setSavingDeviceConfig(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        color: "#0f172a",
        bgcolor: "#f4f6f8", // Light industrial background
        px: { xs: 2, md: 4 },
        py: 4,
      }}
    >
      <Box sx={{ maxWidth: 1600, mx: "auto" }}>
        {/* Header Section */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: "#e0e7ff", color: "#4f46e5" }}>
                <FactoryIcon />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
                Production Console
              </Typography>
            </Stack>
            <Typography variant="body1" sx={{ color: "#64748b", maxWidth: 820 }}>
              Manage the physical device lifecycle from manufacturing entry to calibrated Group B deployment, then edit live-device configuration securely.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                fetchGroupA();
                if (tab === 1) fetchLiveDevices();
              }}
              sx={buttonSecondarySx}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={buttonPrimarySx}
            >
              Add Group A
            </Button>
          </Stack>
        </Stack>

        {/* Stats Row */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<FactoryIcon />}
              label="Group A"
              value={stats.groupA}
              helper="Awaiting calibration / config"
              accent="#2563eb" // Blue
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<MemoryIcon />}
              label="Live Devices"
              value={stats.live}
              helper="Device documents available"
              accent="#8b5cf6" // Purple
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<CheckCircleIcon />}
              label="Online / Available"
              value={stats.online}
              helper="Recent runtime status"
              accent="#10b981" // Green
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<TuneIcon />}
              label="Charging / Pending"
              value={`${stats.charging} / ${stats.pending}`}
              helper="Operational attention"
              accent="#f59e0b" // Amber
            />
          </Grid>
        </Grid>

        {/* Main Content Area */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next)}
            sx={{
              px: 2,
              borderBottom: "1px solid #e2e8f0",
              bgcolor: "#f8fafc",
              "& .MuiTab-root": {
                minHeight: 60,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: "#64748b",
              },
              "& .Mui-selected": { color: "#2563eb !important" },
              "& .MuiTabs-indicator": { backgroundColor: "#2563eb", height: 3, borderRadius: "3px 3px 0 0" },
            }}
          >
            <Tab icon={<FactoryIcon fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Production Lifecycle (Group A)" />
            <Tab icon={<MemoryIcon fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Live Device Configuration" />
          </Tabs>

          {/* TAB 0: Group A */}
          {tab === 0 && (
            <Box>
              <Box sx={{ p: 2.5, borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Search serial number or project…"
                    value={groupAFilter.search}
                    onChange={(event) => {
                      setGroupAPage(0);
                      setGroupAFilter((prev) => ({ ...prev, search: event.target.value }));
                    }}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: "#94a3b8" }} fontSize="small" />,
                    }}
                    sx={{ ...fieldSx, minWidth: { md: 320 } }}
                  />
                  <TextField
                    size="small"
                    label="Hardware revision"
                    value={groupAFilter.hardwareRevision}
                    onChange={(event) => {
                      setGroupAPage(0);
                      setGroupAFilter((prev) => ({ ...prev, hardwareRevision: event.target.value }));
                    }}
                    sx={{ ...fieldSx, minWidth: { md: 200 } }}
                  />
                  <TextField
                    size="small"
                    label="PCB batch"
                    value={groupAFilter.pcbBatch}
                    onChange={(event) => {
                      setGroupAPage(0);
                      setGroupAFilter((prev) => ({ ...prev, pcbBatch: event.target.value }));
                    }}
                    sx={{ ...fieldSx, minWidth: { md: 200 } }}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                    {groupATotal} Record{groupATotal === 1 ? "" : "s"}
                  </Typography>
                </Stack>
              </Box>

              {groupALoading ? (
                <Box sx={{ py: 10, display: "grid", placeItems: "center" }}>
                  <CircularProgress size={32} sx={{ color: "#2563eb" }} />
                </Box>
              ) : groupA.length === 0 ? (
                <EmptyState
                  title="No Group A devices found"
                  subtitle="Production entries created through this console will appear here."
                  action={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={buttonPrimarySx}>
                      Create Entry
                    </Button>
                  }
                />
              ) : (
                <Box>
                  <TableContainer sx={{ maxHeight: '60vh' }}>
                    <Table stickyHeader size="medium">
                      <TableHead>
                        <TableRow sx={{ "& th": { bgcolor: "#f8fafc", color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" } }}>
                          <TableCell>Serial Number</TableCell>
                          <TableCell>Hardware Rev</TableCell>
                          <TableCell>Project</TableCell>
                          <TableCell>PCB Batch</TableCell>
                          <TableCell>Manufactured</TableCell>
                          <TableCell>Notes</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupA.map((device) => (
                          <TableRow 
                            key={device.serialNumber}
                            hover 
                            sx={{ "& td": { borderBottom: "1px solid #f1f5f9", color: "#334155" }, "&:hover": { bgcolor: "#f8fafc" } }}
                          >
                            <TableCell sx={{ fontWeight: 600 }}>{device.serialNumber}</TableCell>
                            <TableCell>{device.hardwareRevision}</TableCell>
                            <TableCell>{device.project || "—"}</TableCell>
                            <TableCell>{device.pcbBatch || "—"}</TableCell>
                            <TableCell>{formatDate(device.manufacturedAt)}</TableCell>
                            <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {device.notes || "—"}
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <Tooltip title="Promote to Group B">
                                  <IconButton size="small" onClick={() => openPromote(device)} sx={{ color: "#10b981", bgcolor: "#ecfdf5", "&:hover": { bgcolor: "#d1fae5" } }}>
                                    <ArrowForwardIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => openEditA(device)} sx={{ color: "#2563eb", bgcolor: "#eff6ff", "&:hover": { bgcolor: "#dbeafe" } }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => deleteGroupA(device)} disabled={busySerial === device.serialNumber} sx={{ color: "#ef4444", bgcolor: "#fef2f2", "&:hover": { bgcolor: "#fee2e2" } }}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={groupATotal}
                    page={groupAPage}
                    onPageChange={(e, newPage) => setGroupAPage(newPage)}
                    rowsPerPage={PAGE_SIZE}
                    rowsPerPageOptions={[PAGE_SIZE]}
                    sx={{ borderTop: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* TAB 1: Live Devices */}
          {tab === 1 && (
            <Box>
              <Box sx={{ p: 2.5, borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Search Live Devices..."
                    value={liveSearch}
                    onChange={(e) => setLiveSearch(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: "#94a3b8" }} fontSize="small" />,
                    }}
                    sx={{ ...fieldSx, minWidth: { md: 320 } }}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                    {liveFiltered.length} Device{liveFiltered.length === 1 ? "" : "s"} found
                  </Typography>
                </Stack>
              </Box>
              
              {liveLoading ? (
                <Box sx={{ py: 10, display: "grid", placeItems: "center" }}>
                  <CircularProgress size={32} sx={{ color: "#2563eb" }} />
                </Box>
              ) : liveFiltered.length === 0 ? (
                <EmptyState
                  title="No Live Devices Found"
                  subtitle="No devices match your current search criteria."
                />
              ) : (
                <TableContainer sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader size="medium">
                    <TableHead>
                      <TableRow sx={{ "& th": { bgcolor: "#f8fafc", color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" } }}>
                        <TableCell>Device ID</TableCell>
                        <TableCell>Serial Number</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Project</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Configuration</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {liveFiltered.map((device) => (
                        <TableRow 
                          key={device.device_id}
                          hover 
                          sx={{ "& td": { borderBottom: "1px solid #f1f5f9", color: "#334155" }, "&:hover": { bgcolor: "#f8fafc" } }}
                        >
                          <TableCell sx={{ fontWeight: 600, color: "#2563eb" }}>{device.device_id}</TableCell>
                          <TableCell>{device.serialNumber || "—"}</TableCell>
                          <TableCell>
                            {device.location || "—"}
                            {(device.city || device.area) && (
                              <Typography variant="caption" display="block" color="#64748b">
                                {[device.area, device.city].filter(Boolean).join(", ")}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{device.project || "—"}</TableCell>
                          <TableCell>
                            <StatusBadge label={statusLabel(device)} statusColorType={statusColor(device.status)} />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<SettingsIcon />}
                              onClick={() => openDeviceConfig(device)}
                              sx={{ textTransform: "none", borderRadius: 1.5, borderColor: "#cbd5e1", color: "#475569" }}
                            >
                              Config
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      {/* --- DIALOGS --- */}

      {/* 1. Create Group A Dialog */}
      <Dialog open={createOpen} onClose={closeCreate} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>Add to Group A</DialogTitle>
        <Divider sx={{ borderColor: "#e2e8f0" }} />
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Field label="Serial Number" required value={createForm.serialNumber} onChange={updateForm(setCreateForm)("serialNumber")} />
            <Field label="Hardware Revision" required value={createForm.hardwareRevision} onChange={updateForm(setCreateForm)("hardwareRevision")} />
            <Field label="Project" value={createForm.project} onChange={updateForm(setCreateForm)("project")} />
            <Field label="PCB Batch" value={createForm.pcbBatch} onChange={updateForm(setCreateForm)("pcbBatch")} />
            <Field label="Manufactured Date" type="date" value={createForm.manufacturedAt} onChange={updateForm(setCreateForm)("manufacturedAt")} />
            <Field label="Notes" value={createForm.notes} onChange={updateForm(setCreateForm)("notes")} />
          </Stack>
        </DialogContent>
        <Divider sx={{ borderColor: "#e2e8f0" }} />
        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button onClick={closeCreate} sx={buttonSecondarySx} disabled={creating}>Cancel</Button>
          <Button onClick={submitCreate} variant="contained" sx={buttonPrimarySx} disabled={creating}>
            {creating ? "Adding..." : "Add Device"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. Edit Group A Dialog */}
      <Dialog open={editAOpen} onClose={() => setEditAOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>Edit Group A Record</DialogTitle>
        <Divider sx={{ borderColor: "#e2e8f0" }} />
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Field label="Serial Number" disabled value={editAForm.serialNumber} />
            <Field label="Hardware Revision" value={editAForm.hardwareRevision} onChange={updateForm(setEditAForm)("hardwareRevision")} />
            <Field label="Project" value={editAForm.project} onChange={updateForm(setEditAForm)("project")} />
            <Field label="PCB Batch" value={editAForm.pcbBatch} onChange={updateForm(setEditAForm)("pcbBatch")} />
            <Field label="Manufactured Date" type="date" value={editAForm.manufacturedAt} onChange={updateForm(setEditAForm)("manufacturedAt")} />
            <Field label="Notes" value={editAForm.notes} onChange={updateForm(setEditAForm)("notes")} />
          </Stack>
        </DialogContent>
        <Divider sx={{ borderColor: "#e2e8f0" }} />
        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button onClick={() => setEditAOpen(false)} sx={buttonSecondarySx} disabled={savingA}>Cancel</Button>
          <Button onClick={submitEditA} variant="contained" sx={buttonPrimarySx} disabled={savingA}>
            {savingA ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 3. Promote Dialog (Group A -> B) */}
      <Dialog open={promoteOpen} onClose={closePromote} maxWidth="md" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>
          Promote to Group B
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5, fontWeight: 400 }}>
            Configuring {promoteDevice?.serialNumber} for live deployment.
          </Typography>
        </DialogTitle>
        <Divider sx={{ borderColor: "#e2e8f0" }} />
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}><Typography variant="subtitle2" color="#2563eb" fontWeight={700}>Identity & Network</Typography></Grid>
            <Grid item xs={12} sm={4}><Field label="Device ID" required value={promoteForm.deviceId} onChange={updateForm(setPromoteForm)("deviceId")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="WiFi SSID" required value={promoteForm.wifiSSID} onChange={updateForm(setPromoteForm)("wifiSSID")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="WiFi Password" required value={promoteForm.wifiPassword} onChange={updateForm(setPromoteForm)("wifiPassword")} /></Grid>

            <Grid item xs={12}><Divider sx={{ my: 1, borderColor: "#f1f5f9" }} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" color="#2563eb" fontWeight={700}>Calibration & Hardware</Typography></Grid>
            <Grid item xs={12} sm={3}><Field label="CF (Calibration)" value={promoteForm.cf} onChange={updateForm(setPromoteForm)("cf")} /></Grid>
            <Grid item xs={12} sm={3}><Field label="VF (Voltage)" value={promoteForm.vf} onChange={updateForm(setPromoteForm)("vf")} /></Grid>
            <Grid item xs={12} sm={3}><Field label="Current RF" value={promoteForm.currentRF} onChange={updateForm(setPromoteForm)("currentRF")} /></Grid>
            <Grid item xs={12} sm={3}><Field label="Charger Type" value={promoteForm.charger_type} onChange={updateForm(setPromoteForm)("charger_type")} /></Grid>
            
            <Grid item xs={12}><Divider sx={{ my: 1, borderColor: "#f1f5f9" }} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" color="#2563eb" fontWeight={700}>Location & Mapping</Typography></Grid>
            <Grid item xs={12} sm={6}><Field label="Location Name" required value={promoteForm.location} onChange={updateForm(setPromoteForm)("location")} /></Grid>
            <Grid item xs={12} sm={3}><Field label="Latitude" required value={promoteForm.lat} onChange={updateForm(setPromoteForm)("lat")} /></Grid>
            <Grid item xs={12} sm={3}><Field label="Longitude" required value={promoteForm.lng} onChange={updateForm(setPromoteForm)("lng")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="Area" required value={promoteForm.area} onChange={updateForm(setPromoteForm)("area")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="City" required value={promoteForm.city} onChange={updateForm(setPromoteForm)("city")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="State" required value={promoteForm.state} onChange={updateForm(setPromoteForm)("state")} /></Grid>

            <Grid item xs={12}><Divider sx={{ my: 1, borderColor: "#f1f5f9" }} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" color="#2563eb" fontWeight={700}>Commercials</Typography></Grid>
            <Grid item xs={12} sm={4}><Field label="Rate (₹)" required value={promoteForm.rate} onChange={updateForm(setPromoteForm)("rate")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="User Rate / KWh" value={promoteForm.userRatePerKwh} onChange={updateForm(setPromoteForm)("userRatePerKwh")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="Margin / KWh" value={promoteForm.vjraMarginPerKwh} onChange={updateForm(setPromoteForm)("vjraMarginPerKwh")} /></Grid>
          </Grid>
        </DialogContent>
        <Divider sx={{ borderColor: "#e2e8f0" }} />
        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button onClick={closePromote} sx={buttonSecondarySx} disabled={promoting}>Cancel</Button>
          <Button onClick={submitPromote} variant="contained" sx={buttonPrimarySx} disabled={promoting}>
            {promoting ? "Promoting..." : "Promote to Live"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 4. Live Device Config Dialog */}
      <Dialog open={deviceConfigOpen} onClose={() => setDeviceConfigOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>
          Edit Device Configuration
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5, fontWeight: 400 }}>
            {selectedLiveDevice?.device_id}
          </Typography>
        </DialogTitle>
        <Divider sx={{ borderColor: "#e2e8f0" }} />
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}><Typography variant="subtitle2" color="#2563eb" fontWeight={700}>Network Settings</Typography></Grid>
            <Grid item xs={12} sm={6}><Field label="WiFi SSID" value={deviceConfig.wifiSSID} onChange={updateForm(setDeviceConfig)("wifiSSID")} /></Grid>
            <Grid item xs={12} sm={6}><Field label="New WiFi Password (leave blank to keep)" type="password" value={deviceConfig.wifiPassword} onChange={updateForm(setDeviceConfig)("wifiPassword")} /></Grid>

            <Grid item xs={12}><Divider sx={{ my: 1, borderColor: "#f1f5f9" }} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" color="#2563eb" fontWeight={700}>Calibration</Typography></Grid>
            <Grid item xs={12} sm={4}><Field label="CF" value={deviceConfig.cf} onChange={updateForm(setDeviceConfig)("cf")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="VF" value={deviceConfig.vf} onChange={updateForm(setDeviceConfig)("vf")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="Current RF" value={deviceConfig.currentRF} onChange={updateForm(setDeviceConfig)("currentRF")} /></Grid>
            
            <Grid item xs={12}><Divider sx={{ my: 1, borderColor: "#f1f5f9" }} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" color="#2563eb" fontWeight={700}>Location Details</Typography></Grid>
            <Grid item xs={12} sm={12}><Field label="Location Name" value={deviceConfig.location} onChange={updateForm(setDeviceConfig)("location")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="Area" value={deviceConfig.area} onChange={updateForm(setDeviceConfig)("area")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="City" value={deviceConfig.city} onChange={updateForm(setDeviceConfig)("city")} /></Grid>
            <Grid item xs={12} sm={4}><Field label="State" value={deviceConfig.state} onChange={updateForm(setDeviceConfig)("state")} /></Grid>
            <Grid item xs={12} sm={6}><Field label="Latitude" value={deviceConfig.lat} onChange={updateForm(setDeviceConfig)("lat")} /></Grid>
            <Grid item xs={12} sm={6}><Field label="Longitude" value={deviceConfig.lng} onChange={updateForm(setDeviceConfig)("lng")} /></Grid>

            <Grid item xs={12}><Divider sx={{ my: 1, borderColor: "#f1f5f9" }} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" color="#2563eb" fontWeight={700}>System Updates</Typography></Grid>
            <Grid item xs={12} sm={12}><Field label="Target Firmware Version" value={deviceConfig.targetFirmwareVersion} onChange={updateForm(setDeviceConfig)("targetFirmwareVersion")} helperText="Backend handles deployment automatically on update" /></Grid>
          </Grid>
        </DialogContent>
        <Divider sx={{ borderColor: "#e2e8f0" }} />
        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button onClick={() => setDeviceConfigOpen(false)} sx={buttonSecondarySx} disabled={savingDeviceConfig}>Cancel</Button>
          <Button onClick={saveDeviceConfig} variant="contained" sx={buttonPrimarySx} disabled={savingDeviceConfig}>
            {savingDeviceConfig ? "Saving & Syncing..." : "Save Configuration"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.severity} sx={{ borderRadius: 2, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}