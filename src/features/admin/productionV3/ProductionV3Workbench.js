
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { productionV3Api } from "./productionV3Api";

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

function numericValue(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : null;
}

function numberText(value, digits = 2) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toFixed(digits);
}

function ageText(ageMs) {
  if (!Number.isFinite(Number(ageMs))) return "—";

  const seconds = Math.max(0, Math.floor(Number(ageMs) / 1000));

  if (seconds < 1) return "Just now";

  return `${seconds}s ago`;
}

function statusColor(status) {
  if (["acknowledged", "applied", "passed", "ready"].includes(status)) {
    return "success";
  }

  if (["pending", "submitted", "sent", "capturing"].includes(status)) {
    return "warning";
  }

  if (["failed", "error", "rejected"].includes(status)) {
    return "error";
  }

  return "default";
}

function ReferenceInputs({
  value,
  onChange,
  disabled = false,
}) {
  const fields = [
    { key: "voltage", label: "Voltage (V)" },
    { key: "current", label: "Current (A)" },
    { key: "power", label: "Power (W)" },
  ];

  return (
    <Box className="production-reference-grid">
      {fields.map((field) => (
        <TextField
          key={field.key}
          size="small"
          label={field.label}
          type="number"
          value={value[field.key]}
          disabled={disabled}
          onChange={(event) =>
            onChange(field.key, event.target.value)
          }
          inputProps={{
            step: "any",
          }}
        />
      ))}
    </Box>
  );
}

// --------------------------------------------------
// LIVE VALUE CARD
// --------------------------------------------------

function LiveValue({ label, value, unit, digits = 2 }) {
  return (
    <Paper elevation={0} className="production-live-value">
      <Typography className="production-live-label">
        {label}
      </Typography>

      <Typography className="production-live-number">
        {numberText(value, digits)}
        <Typography
          component="span"
          className="production-live-unit"
        >
          {unit}
        </Typography>
      </Typography>
    </Paper>
  );
}

// --------------------------------------------------
// CAPTURE STATUS
// --------------------------------------------------

function CaptureStatus({ title, capture }) {
  return (
    <Box className="production-capture-status">
      {capture ? (
        <CheckCircleRoundedIcon
          color="success"
          fontSize="small"
        />
      ) : (
        <RadioButtonUncheckedRoundedIcon
          color="disabled"
          fontSize="small"
        />
      )}

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography fontWeight={600} fontSize={13}>
          {title}
        </Typography>

        <Typography color="text.secondary" fontSize={12}>
          {capture
            ? `Captured ${new Date(capture.capturedAt).toLocaleTimeString()}`
            : "Not captured"}
        </Typography>
      </Box>

      {capture?.passed !== undefined && capture?.passed !== null && (
        <Chip
          size="small"
          label={capture.passed ? "Passed" : "Failed"}
          color={capture.passed ? "success" : "error"}
        />
      )}
    </Box>
  );
}

// --------------------------------------------------
// MAIN WORKBENCH
// --------------------------------------------------

export default function ProductionV3Workbench({
  open,
  device,
  onClose,
  onUpdated,
}) {
  const [record, setRecord] = useState(device || null);

  const [live, setLive] = useState(null);
  const [connected, setConnected] = useState(false);

  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [busyAction, setBusyAction] = useState("");
  const [alert, setAlert] = useState(null);
const [manualCompletionReason, setManualCompletionReason] =
  useState("");
  const [reference, setReference] = useState({
    voltage: "230",
    current: "0",
    power: "0",
  });

  const [relayDuration, setRelayDuration] = useState(30);
  const [relayConfirmOpen, setRelayConfirmOpen] = useState(false);

  const serialNumber =
    record?.serialNumber ||
    device?.serialNumber ||
    "";

  const calibration = record?.calibration || {};
  const verification = calibration.verification || {};
  const command = record?.groupB?.lastCommand || {};

  const isCalibrationStage =
    record?.stage === "calibration";

    const isSubmitted =
  calibration.status === "submitted";

const canCaptureCalibration = [
  "not_started",
  "capturing",
  "calculated",
  "failed",
].includes(calibration.status);

  const isApplied =
    calibration.status === "applied";

  const hasInitialCaptures =
    Boolean(calibration.noLoad) &&
    Boolean(calibration.load);

  const hasVerificationCaptures =
    Boolean(verification.noLoad) &&
    Boolean(verification.load);

  const verificationPassed =
    verification.noLoad?.passed === true &&
    verification.load?.passed === true;

  const isFastTelemetry =
    String(live?.telemetryMode || "").toLowerCase() === "fast";

  const liveAge = Number(live?.ageMs);
  const liveFresh =
    Boolean(live) &&
    Number.isFinite(liveAge) &&
    liveAge <= 5000;

  const relayOn =
    typeof live?.relayOn === "boolean"
      ? live.relayOn
      : null;

  // ------------------------------------------------
  // LOAD DEVICE DETAIL
  // ------------------------------------------------

const refreshDetails = useCallback(async () => {
  if (!serialNumber) return null;

  try {
    const response =
      await productionV3Api.get(serialNumber);

    const nextRecord = response.data?.data || null;

    if (nextRecord) {
      setRecord(nextRecord);
    }

    return nextRecord;
  } catch (error) {
    console.error(
      "[PRODUCTION WORKBENCH] Detail refresh failed:",
      error
    );

    return null;
  }
}, [serialNumber]);

  // ------------------------------------------------
  // LOAD LIVE TELEMETRY
  // ------------------------------------------------

  const refreshLive = useCallback(async () => {
    if (!serialNumber) return null;

    try {
      const response =
        await productionV3Api.live(serialNumber);

      setConnected(Boolean(response.data?.connected));
      setLive(response.data?.data || null);

      return response.data?.data || null;
    } catch (error) {
      setConnected(false);
      setLive(null);

      return null;
    }
  }, [serialNumber]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);

    await Promise.all([
      refreshDetails(),
      refreshLive(),
    ]);

    setRefreshing(false);
  }, [refreshDetails, refreshLive]);

  // ------------------------------------------------
  // RESET WHEN SELECTED DEVICE CHANGES
  // ------------------------------------------------

  useEffect(() => {
    if (device) {
      setRecord(device);
      setLive(null);
      setConnected(false);
      setAlert(null);
        setManualCompletionReason("");
      setReference({
        voltage: "230",
        current: "0",
        power: "0",
      });
    }
  }, [device?._id]);

  // ------------------------------------------------
  // POLL WHILE DRAWER IS OPEN
  // ------------------------------------------------

  useEffect(() => {
    if (!open || !serialNumber) return undefined;

    let active = true;

    const poll = async () => {
      if (!active) return;

      await Promise.all([
        refreshDetails(),
        refreshLive(),
      ]);
    };

    poll();

    const timer = setInterval(poll, 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [open, serialNumber, refreshDetails, refreshLive]);

  // ------------------------------------------------
  // COMMON ACTION RUNNER
  // ------------------------------------------------

  const runAction = async (name, callback) => {
    if (busyAction) return;

    setBusyAction(name);
    setAlert(null);

    try {
      const result = await callback();

      setAlert({
        severity: "success",
        message: result?.message || "Action completed.",
      });

      const updatedRecord = await refreshDetails();
    await refreshLive();

    if (updatedRecord && typeof onUpdated === "function") {
    onUpdated(updatedRecord);
    }

    } catch (error) {
      setAlert({
        severity: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setBusyAction("");
    }
  };

  // ------------------------------------------------
  // ADMIN COMMANDS
  // ------------------------------------------------

  const sendCommand = async (action, options = {}) => {
    return runAction(action, async () => {
      const response = await productionV3Api.command(
        serialNumber,
        {
          action,
          ...options,
        }
      );

      return {
        message:
          response.data?.message ||
          `${action} command sent. Waiting for ACK.`,
      };
    });
  };

  const startFastTelemetry = () => {
    // Firmware limits:
    // intervalMs: 250–5000
    // durationSeconds: 1–300
    return sendCommand("startFastTelemetry", {
      intervalMs: 500,
      durationSeconds: 300,
    });
  };

  const stopFastTelemetry = () =>
    sendCommand("stopFastTelemetry");

  const stopRelay = () =>
    sendCommand("relayStop");

  const confirmRelayStart = async () => {
    setRelayConfirmOpen(false);

    await sendCommand("relayStart", {
      testMode: true,
      durationSeconds: Number(relayDuration),
    });
  };

  // ------------------------------------------------
  // ER300P REFERENCE INPUTS
  // ------------------------------------------------

  const updateReference = (field, value) => {
    setReference((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const getReferencePayload = () => {
    const voltage = numericValue(reference.voltage);
    const current = numericValue(reference.current);
    const power = numericValue(reference.power);

    if (
      voltage === null ||
      current === null ||
      power === null
    ) {
      throw new Error(
        "Enter all three ER300P reference readings."
      );
    }

    if (
      voltage <= 0 ||
      current < 0 ||
      power < 0
    ) {
      throw new Error(
        "Reference voltage must be positive. Current and power cannot be negative."
      );
    }

    return {
      voltage,
      current,
      power,
    };
  };

  // ------------------------------------------------
  // CAPTURE INITIAL CALIBRATION POINT
  // ------------------------------------------------

  const captureInitialPoint = async (point) => {
    return runAction(`capture-${point}`, async () => {
      const referencePayload = getReferencePayload();

      const response =
        await productionV3Api.captureCalibration(
          serialNumber,
          point,
          {
            reference: referencePayload,
          }
        );

      return {
        message:
          response.data?.message ||
          `${point} calibration capture saved.`,
      };
    });
  };

  // ------------------------------------------------
  // CALCULATE COEFFICIENTS
  // ------------------------------------------------

  const calculate = async () => {
    return runAction("calculate", async () => {
      const response =
        await productionV3Api.calculateCalibration(
          serialNumber
        );

      return {
        message:
          response.data?.message ||
          "Calibration coefficients calculated.",
      };
    });
  };

  // ------------------------------------------------
  // SUBMIT CALIBRATION
  // ------------------------------------------------

  const submit = async () => {
    return runAction("submit", async () => {
      const response =
        await productionV3Api.submitCalibration(
          serialNumber
        );

      return {
        message:
          response.data?.message ||
          "Calibration submitted. Waiting for firmware ACK.",
      };
    });
  };


// --------------------------------------------------
// MANUAL CALIBRATION COMPLETION
// --------------------------------------------------

const manuallyCompleteCalibration = async () => {
  const reason = manualCompletionReason.trim();

  if (!reason) {
    setAlert({
      severity: "warning",
      message: "Enter a reason for manually completing calibration.",
    });
    return;
  }

  return runAction("manual-complete", async () => {
    const response =
      await productionV3Api.manualCompleteCalibration(
        serialNumber,
        { reason }
      );

    return {
      message:
        response.data?.message ||
        "Device moved to Dispatch-ready through manual completion.",
    };
  });
};


  // ------------------------------------------------
  // POST-CALIBRATION VERIFICATION
  // ------------------------------------------------

  const captureVerification = async (point) => {
    return runAction(`verify-${point}`, async () => {
      const referencePayload = getReferencePayload();

      const response =
        await productionV3Api.calibrationTest(
          serialNumber,
          {
            point,
            reference: referencePayload,
          }
        );

      return {
        message:
          response.data?.message ||
          `${point} verification captured.`,
      };
    });
  };

  const finalizeVerification = async () => {
    return runAction("finalize-test", async () => {
      const response =
        await productionV3Api.calibrationTest(
          serialNumber,
          {
            result: "passed",
            notes:
              "No-load and load verification completed against ER300P.",
          }
        );

      return {
        message:
          response.data?.message ||
          "Calibration verification passed. Device is Dispatch-ready.",
      };
    });
  };

  // ------------------------------------------------
  // DERIVED DETAILS
  // ------------------------------------------------

  const coefficientRows = useMemo(() => {
    const coefficients = calibration.coefficients || {};

    return [
      ["VF", coefficients.vf],
      ["Current zero", coefficients.currentZero],
      ["Current gain", coefficients.currentGain],
      ["Power zero", coefficients.powerZero],
      ["Power gain", coefficients.powerGain],
    ];
  }, [calibration.coefficients]);

  if (!device && !record) return null;

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------

  return (
    <>

<Dialog
  fullScreen
  open={open}
  onClose={onClose}
  PaperProps={{
    className: "production-workbench-dialog",
  }}
>

        <Box className="production-workbench">
          {/* HEADER */}

          <Box className="production-workbench-header">
            <Box sx={{ minWidth: 0 }}>
              <Typography
                className="production-workbench-title"
              >
                Device workbench
              </Typography>

              <Typography className="production-workbench-serial">
                {serialNumber}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <IconButton
                onClick={refreshAll}
                disabled={refreshing}
                size="small"
              >
                {refreshing ? (
                  <CircularProgress size={18} />
                ) : (
                  <RefreshRoundedIcon />
                )}
              </IconButton>

              <IconButton onClick={onClose} size="small">
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </Box>

          {busyAction && <LinearProgress />}

          <Box className="production-workbench-content">
            {/* DEVICE IDENTITY */}

            <Paper
              elevation={0}
              className="production-workbench-card"
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography className="production-card-kicker">
                    PRODUCTION STATUS
                  </Typography>

                  <Typography fontSize={15} fontWeight={700}>
                    {record?.groupA?.batchName || "Unnamed batch"}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    fontSize={12}
                  >
                    PCB batch: {record?.groupA?.pcbBatch || "—"}
                    {" · "}
                    Meter: {record?.groupA?.meteringHardware || "—"}
                  </Typography>
                </Box>

                <Chip
                  label={
                    record?.stage
                      ? record.stage.replace("_", " ").toUpperCase()
                      : "—"
                  }
                  color={
                    record?.stage === "dispatch"
                      ? "success"
                      : record?.stage === "calibration"
                        ? "warning"
                        : "default"
                  }
                />
              </Stack>

              <Box className="production-mini-stage-track">
                {[
                  ["group_a", "Group A"],
                  ["group_b", "Group B"],
                  ["calibration", "Calibration"],
                  ["dispatch", "Dispatch"],
                ].map(([key, label], index) => {
                  const order = [
                    "group_a",
                    "group_b",
                    "calibration",
                    "dispatch",
                  ];

                  const currentIndex = order.indexOf(
                    record?.stage
                  );

                  const completed = index < currentIndex;
                  const current = index === currentIndex;

                  return (
                    <Box
                      key={key}
                      className={`production-mini-stage ${
                        completed ? "completed" : ""
                      } ${current ? "current" : ""}`}
                    >
                      <Box className="production-mini-stage-dot">
                        {completed ? "✓" : index + 1}
                      </Box>

                      <Typography>{label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* NON-CALIBRATION STAGES */}

            {!isCalibrationStage && (
              <Alert severity="info">
                {record?.stage === "group_a"
                  ? "This unit is in Group A. Assign a Device ID and Wi-Fi credentials from the production table."
                  : record?.stage === "group_b"
                    ? `Provisioning status: ${record?.groupB?.provisionStatus || "unknown"}. The unit enters Calibration after a valid firmware ACK.`
                    : record?.stage === "dispatch"
                      ? "Calibration and verification are complete. This unit is Dispatch-ready. The Dispatch workflow is managed separately."
                      : "This device is not currently in the Calibration stage."}
              </Alert>
            )}

            {isCalibrationStage && (
              <>
                {/* LIVE TELEMETRY */}

                <Paper
                  elevation={0}
                  className="production-workbench-card"
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={1.5}
                  >
                    <Box>
                      <Typography className="production-card-title">
                        Live device readings
                      </Typography>

                      <Typography
                        color="text.secondary"
                        fontSize={12}
                      >
                        Latest readings received over MQTT
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      color={connected && liveFresh ? "success" : "default"}
                      label={
                        connected && liveFresh
                          ? `Live · ${ageText(live?.ageMs)}`
                          : connected
                            ? `Stale · ${ageText(live?.ageMs)}`
                            : "Offline"
                      }
                    />
                  </Stack>

                  <Box className="production-live-grid">
                    <LiveValue
                      label="Voltage"
                      value={live?.voltage}
                      unit="V"
                    />

                    <LiveValue
                      label="Current"
                      value={live?.current}
                      unit="A"
                      digits={3}
                    />

                    <LiveValue
                      label="Power"
                      value={live?.power}
                      unit="W"
                    />
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Stack direction="row" spacing={1}>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          relayOn === null
                            ? "Relay unknown"
                            : relayOn
                              ? "Relay ON"
                              : "Relay OFF"
                        }
                        color={
                          relayOn === true
                            ? "warning"
                            : relayOn === false
                              ? "success"
                              : "default"
                        }
                      />

                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          isFastTelemetry
                            ? "Fast telemetry"
                            : live?.telemetryMode || "Normal telemetry"
                        }
                      />
                    </Stack>

                    <Typography
                      color="text.secondary"
                      fontSize={12}
                    >
                      Raw data age: {ageText(live?.sampleAgeMs)}
                    </Typography>
                  </Stack>

                  <Alert
                    severity={
                      liveFresh &&
                      live?.sampleFresh !== false
                        ? "success"
                        : "warning"
                    }
                    sx={{ mt: 1.5 }}
                  >
                    {liveFresh &&
                    live?.sampleFresh !== false
                      ? "Fresh telemetry is available."
                      : "Wait for fresh telemetry before capturing a calibration point."}
                  </Alert>
                </Paper>

                {/* DEVICE CONTROLS */}
<Accordion
  disableGutters
  elevation={0}
  className="production-workbench-accordion"
>
  <AccordionSummary
    expandIcon={<ExpandMoreRoundedIcon />}
  >
    <Box>
      <Typography fontWeight={700} fontSize={14}>
        Device controls
      </Typography>
      <Typography color="text.secondary" fontSize={11}>
        Fast telemetry and maintenance relay test
      </Typography>
    </Box>
  </AccordionSummary>

  <AccordionDetails>
    {/* Keep the existing Device controls content here,
        starting from the fast telemetry buttons. */}

                <Paper
                  elevation={0}
                  className="production-workbench-card"
                >
                  <Typography className="production-card-title">
                    Device controls
                  </Typography>

                  <Typography
                    color="text.secondary"
                    fontSize={12}
                    mb={1.5}
                  >
                    Fast telemetry is required to receive raw HLW8032 ratios for calibration.
                  </Typography>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                  >
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<BoltRoundedIcon />}
                      onClick={startFastTelemetry}
                      disabled={
                        Boolean(busyAction) ||
                        isFastTelemetry ||
                        !connected
                      }
                    >
                      Start fast telemetry
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={stopFastTelemetry}
                      disabled={
                        Boolean(busyAction) ||
                        !isFastTelemetry
                      }
                    >
                      Stop fast telemetry
                    </Button>
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Typography
                    fontWeight={700}
                    fontSize={13}
                    mb={1}
                  >
                    Maintenance relay test
                  </Typography>


                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "center" }}
                  >
                    <TextField
                      size="small"
                      label="Test duration (seconds)"
                      type="number"
                      value={relayDuration}
                      onChange={(event) =>
                        setRelayDuration(event.target.value)
                      }
                      inputProps={{
                        min: 1,
                        max: 120,
                      }}
                      sx={{ minWidth: 190 }}
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      color="warning"
                      startIcon={<PowerSettingsNewRoundedIcon />}
                      onClick={() => setRelayConfirmOpen(true)}
                      disabled={
                        Boolean(busyAction) ||
                        !connected ||
                        relayOn === true
                      }
                    >
                      Start relay test
                    </Button>


                        <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        onClick={stopRelay}
                        disabled={
                            Boolean(busyAction) ||
                            (liveFresh && relayOn === false)
                        }
                        >
                        Relay OFF
                        </Button>

                  </Stack>

                  <Typography
                    color="text.secondary"
                    fontSize={11}
                    mt={1}
                  >
                    Firmware limit: 1–120 seconds for the maintenance relay test.
                  </Typography>
                </Paper>
  </AccordionDetails>
</Accordion>
                {/* ER300P REFERENCE INPUT */}

                <Paper
                  elevation={0}
                  className="production-workbench-card"
                >
                  <Typography className="production-card-title">
                    ER300P reference readings
                  </Typography>

                  <Typography
                    color="text.secondary"
                    fontSize={12}
                    mb={1.5}
                  >
                    Enter the reference meter values for the selected no-load or load condition.
                  </Typography>

                  <ReferenceInputs
                    value={reference}
                    onChange={updateReference}
                    disabled={Boolean(busyAction)}
                  />

                  <Typography
                    color="text.secondary"
                    fontSize={11}
                    mt={1}
                  >
                    The measured values are captured automatically from the latest device telemetry. Only enter the ER300P reference readings here.
                  </Typography>
                </Paper>

                {/* INITIAL CALIBRATION */}

                {canCaptureCalibration && (
                  <>
                    <Paper
                      elevation={0}
                      className="production-workbench-card"
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1.5}
                      >
                        <Box>
                          <Typography className="production-card-title">
                            1. Calibration captures
                          </Typography>

                          <Typography
                            color="text.secondary"
                            fontSize={12}
                          >
                            Capture one no-load point and one load point.
                          </Typography>
                        </Box>

                        <Chip
                          size="small"
                          label={
                            hasInitialCaptures
                              ? "2 of 2 captured"
                              : "Required"
                          }
                          color={
                            hasInitialCaptures
                              ? "success"
                              : "warning"
                          }
                        />
                      </Stack>

                      <CaptureStatus
                        title="No-load capture · Relay OFF"
                        capture={calibration.noLoad}
                      />

                      <CaptureStatus
                        title="Load capture · Relay ON"
                        capture={calibration.load}
                      />

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        mt={2}
                      >
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={() =>
                            captureInitialPoint("no-load")
                          }
                          disabled={
                            Boolean(busyAction) ||
                            !liveFresh ||
                            !isFastTelemetry ||
                            relayOn !== false
                          }
                        >
                          Capture no-load
                        </Button>

                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={() =>
                            captureInitialPoint("load")
                          }
                          disabled={
                            Boolean(busyAction) ||
                            !liveFresh ||
                            !isFastTelemetry ||
                            relayOn !== true
                          }
                        >
                          Capture load
                        </Button>
                      </Stack>

                      {!isFastTelemetry && (
                        <Alert severity="info" sx={{ mt: 1.5 }}>
                          Start fast telemetry before capturing raw calibration data.
                        </Alert>
                      )}

                      {relayOn === true && (
                        <Alert severity="warning" sx={{ mt: 1.5 }}>
                          Relay is ON. Turn it OFF before capturing no-load readings.
                        </Alert>
                      )}

                      {relayOn === false && (
                        <Typography
                          color="text.secondary"
                          fontSize={11}
                          mt={1}
                        >
                          To record the load point, connect the test load and start the maintenance relay test.
                        </Typography>
                      )}
                    </Paper>

                    <Paper
                      elevation={0}
                      className="production-workbench-card"
                    >
                      <Typography className="production-card-title">
                        2. Calculate and apply calibration
                      </Typography>

                      <Typography
                        color="text.secondary"
                        fontSize={12}
                        mb={1.5}
                      >
                        The backend calculates the five HLW8032 coefficients and submits them to firmware.
                      </Typography>

                      <Stack spacing={1}>
                        <Button
                          variant="outlined"
                          startIcon={<CalculateRoundedIcon />}
                          onClick={calculate}
                          disabled={
                            Boolean(busyAction) ||
                            !hasInitialCaptures
                          }
                        >
                          Calculate coefficients
                        </Button>

                        {coefficientRows.some(
                          ([, value]) =>
                            value !== null &&
                            value !== undefined
                        ) && (
                          <Box className="production-coefficient-grid">
                            {coefficientRows.map(([label, value]) => (
                              <Box
                                key={label}
                                className="production-coefficient"
                              >
                                <Typography>{label}</Typography>
                                <Typography fontWeight={700}>
                                  {numberText(value, 8)}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}

                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography
                            color="text.secondary"
                            fontSize={12}
                          >
                            Calibration status
                          </Typography>

                          <Chip
                            size="small"
                            label={calibration.status || "Not started"}
                            color={statusColor(calibration.status)}
                          />
                        </Stack>

                        <Button
                          variant="contained"
                          startIcon={<SendRoundedIcon />}
                          onClick={submit}
                          disabled={
                            Boolean(busyAction) ||
                            !["calculated", "failed"].includes(
                              calibration.status
                            )
                          }
                        >
                          Submit calibration to device
                        </Button>


{calibration.status === "submitted" && (
  <>
    <Alert severity="warning" sx={{ mb: 1.5 }}>
      Waiting for firmware ACK. You can continue waiting or
      manually complete calibration and move this device
      directly to Dispatch, skipping independent testing.
      This does not confirm that firmware applied the coefficients.
    </Alert>

    <TextField
      fullWidth
      multiline
      minRows={2}
      label="Reason for manual completion"
      placeholder="Example: Firmware ACK unavailable during production testing."
      value={manualCompletionReason}
      onChange={(event) =>
        setManualCompletionReason(event.target.value)
      }
      disabled={Boolean(busyAction)}
      inputProps={{ maxLength: 1000 }}
      helperText="Required for the production audit record."
    />

    <Button
      fullWidth
      variant="contained"
      color="warning"
      startIcon={<CheckCircleRoundedIcon />}
      onClick={manuallyCompleteCalibration}
      disabled={
        Boolean(busyAction) ||
        !manualCompletionReason.trim()
      }
      sx={{ mt: 1.5 }}
    >
      Mark Calibration Complete & Move to Dispatch
    </Button>
  </>
)}


                        {calibration.status === "failed" && (
                          <Alert severity="error">
                            {calibration.lastError ||
                              "Calibration failed. Retry submission or inspect the firmware error."}
                          </Alert>
                        )}

                        {calibration.status === "applied" && (
                          <Alert severity="success">
                            Firmware acknowledged calibration. Continue to independent verification.
                          </Alert>
                        )}
                      </Stack>
                    </Paper>
                  </>
                )}

                {/* POST-CALIBRATION VERIFICATION */}

                {canCaptureCalibration && (
                  <Paper
                    elevation={0}
                    className="production-workbench-card"
                  >
                    <Typography className="production-card-title">
                      3. Post-calibration verification
                    </Typography>

                    <Typography
                      color="text.secondary"
                      fontSize={12}
                      mb={1.5}
                    >
                      Take a new ER300P reading in each condition. The backend compares the live device measurement against the reference.
                    </Typography>

                    <CaptureStatus
                      title="No-load verification"
                      capture={verification.noLoad}
                    />

                    <CaptureStatus
                      title="Load verification"
                      capture={verification.load}
                    />

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      mt={2}
                    >
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() =>
                          captureVerification("no-load")
                        }
                        disabled={
                          Boolean(busyAction) ||
                          !liveFresh ||
                          !isFastTelemetry ||
                          relayOn !== false
                        }
                      >
                        Verify no-load
                      </Button>

                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() =>
                          captureVerification("load")
                        }
                        disabled={
                          Boolean(busyAction) ||
                          !liveFresh ||
                          !isFastTelemetry ||
                          relayOn !== true
                        }
                      >
                        Verify load
                      </Button>
                    </Stack>

                    {hasVerificationCaptures && (
                      <Alert
                        severity={
                          verificationPassed ? "success" : "error"
                        }
                        sx={{ mt: 2 }}
                      >
                        {verificationPassed
                          ? "Both verification points passed."
                          : "At least one verification point did not pass. Review the readings before finalizing."}
                      </Alert>
                    )}

                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      sx={{ mt: 2 }}
                      startIcon={<CheckCircleRoundedIcon />}
                      onClick={finalizeVerification}
                      disabled={
                        Boolean(busyAction) ||
                        !verificationPassed
                      }
                    >
                      Pass calibration test
                    </Button>

                    <Typography
                      color="text.secondary"
                      fontSize={11}
                      mt={1}
                    >
                      Dispatch readiness is granted only after both verification points pass.
                    </Typography>
                  </Paper>
                )}
              </>
            )}

            {/* COMMAND ACKNOWLEDGEMENT */}

            <Paper
              elevation={0}
              className="production-workbench-card"
            >
              <Typography className="production-card-title">
                Latest device command
              </Typography>

              {command?.requestId ? (
                <Stack spacing={0.75}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography fontSize={13} fontWeight={600}>
                      {command.action}
                    </Typography>

                    <Chip
                      size="small"
                      label={command.status || "unknown"}
                      color={statusColor(command.status)}
                    />
                  </Stack>

                  <Typography
                    color="text.secondary"
                    fontSize={11}
                  >
                    Request: {command.requestId}
                  </Typography>

                  {command.message && (
                    <Typography fontSize={12}>
                      {command.message}
                    </Typography>
                  )}
                </Stack>
              ) : (
                <Typography
                  color="text.secondary"
                  fontSize={13}
                >
                  No command has been sent from this workbench.
                </Typography>
              )}
            </Paper>

            {alert && (
              <Alert
                severity={alert.severity}
                onClose={() => setAlert(null)}
              >
                {alert.message}
              </Alert>
            )}
          </Box>
        </Box>
            </Dialog>

      {/* RELAY START CONFIRMATION */}

      <Dialog
        open={relayConfirmOpen}
        onClose={() => setRelayConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Confirm maintenance relay test</DialogTitle>

        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This energizes the relay for a limited test period. Ensure the correct test load is connected and the area is safe.
          </Alert>

          <Typography fontSize={14}>
            The firmware will automatically turn the relay OFF after the configured duration.
          </Typography>

          <Typography fontWeight={700} mt={1}>
            Duration: {relayDuration} seconds
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setRelayConfirmOpen(false)}
          >
            Cancel
          </Button>

          <Button
            color="warning"
            variant="contained"
            onClick={confirmRelayStart}
            disabled={
              !Number.isInteger(Number(relayDuration)) ||
              Number(relayDuration) < 1 ||
              Number(relayDuration) > 120
            }
          >
            Confirm and energize
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
