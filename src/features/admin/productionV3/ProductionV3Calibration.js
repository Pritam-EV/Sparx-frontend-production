import React, { useCallback, useEffect, useMemo, useState } from "react";

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
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import {
  captureVerificationPoint,
  verifyCalibration,
} from "./productionV3Api";
import {
  listCalibrationSessions,
  getCalibrationSession,
  createCalibrationSession,
  captureCalibrationPoint,
  applyCalibration,
  calculateCalibration,
  startFastTelemetry,
  startRelayTest,
  stopRelayTest,
  listProfiles,
  getDeviceCommands,
  getDeviceTelemetry,
} from "./productionV3Api";

import {
  P3,
  P3Status,
  P3SectionTitle,
  P3Loading,
  P3Empty,
  errorMessage,
  formatDate,
  unwrap,
} from "./ProductionV3Components";

const CHANNELS = ["voltage", "current", "power"];

const CONSTANT_KEYS = [
  "vf",
  "currentZero",
  "currentGain",
  "powerZero",
  "powerGain",
];

const CONSTANT_LABELS = {
  vf: "Voltage factor",
  currentZero: "Current zero offset",
  currentGain: "Current gain",
  powerZero: "Power zero offset",
  powerGain: "Power gain",
};

const fieldProps = {
  fullWidth: true,
  size: "small",
  sx: P3.field,
};

const isNoLoadPoint = (point) => {
  const condition = String(point?.condition || "").toLowerCase();
  const name = String(point?.name || "").toLowerCase();
  const code = String(point?.code || "").toLowerCase();

  return (
    condition.includes("no_load") ||
    condition.includes("no load") ||
    name.includes("no load") ||
    code.includes("no_load")
  );
};

const requiredChannelsFor = (point) =>
  Array.isArray(point?.requiredChannels) &&
  point.requiredChannels.length
    ? point.requiredChannels
    : CHANNELS;

const constantDefaults = (session) => {
  const calculated = session?.calculatedConstants || {};
  const result = {};

  CONSTANT_KEYS.forEach((key) => {
    const value = calculated[key];

    if (
      value !== null &&
      value !== undefined &&
      Number.isFinite(Number(value))
    ) {
      result[key] = String(value);
    }
  });

  return result;
};

const commandAccepted = (command) =>
  ["accepted", "completed"].includes(
    String(command?.status || "").toLowerCase()
  );

const commandRejected = (command) =>
  ["rejected", "failed"].includes(
    String(command?.status || "").toLowerCase()
  );

export default function ProductionV3Calibration() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const [calibrationProfiles, setCalibrationProfiles] =
  useState([]);

const [profilesLoading, setProfilesLoading] =
  useState(false);

  const [createOpen, setCreateOpen] = useState(false);
const [createForm, setCreateForm] = useState({
  serialNumber: "",
  calibrationProfileId: "",
  stationName: "",
  operatorName: "",
  notes: "",
});

  const [selectedPointCode, setSelectedPointCode] = useState("");
  const [reference, setReference] = useState({
    voltage: "",
    current: "",
    power: "",
  });

  const [telemetryRequestId, setTelemetryRequestId] = useState("");
  const [telemetry, setTelemetry] = useState([]);
  const [commands, setCommands] = useState([]);

  const [constants, setConstants] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const notify = (message, severity = "success") =>
    setToast({ open: true, message, severity });

  const loadCalibrationProfiles = useCallback(async () => {
  setProfilesLoading(true);

  try {
    const response = await listProfiles(
      "calibration",
      {
        page: 1,
        limit: 100,
        status: "active",
      }
    );

    setCalibrationProfiles(
      unwrap(response) || []
    );

  } catch (profileError) {
    setError(errorMessage(profileError));
  } finally {
    setProfilesLoading(false);
  }
}, []);

useEffect(() => {
  loadCalibrationProfiles();
}, [loadCalibrationProfiles]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await listCalibrationSessions({
        page: 1,
        limit: 50,
      });

      setSessions(unwrap(response) || []);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadSession = async (sessionId) => {
    setSessionLoading(true);
    setError("");

    try {
      const response = await getCalibrationSession(sessionId);
      const session = unwrap(response);

      setSelectedSession(session);
      setSelectedPointCode("");
      setReference({
        voltage: "",
        current: "",
        power: "",
      });
      setTelemetryRequestId("");
      setTelemetry([]);
      setCommands([]);
      setConstants(constantDefaults(session));

      if (session?.serialNumber) {
        await loadDeviceActivity(session.serialNumber);
      }

      return session;
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setSessionLoading(false);
    }
  };

  const loadDeviceActivity = async (serialNumber, requestId = "") => {
    try {
      const [commandResponse, telemetryResponse] = await Promise.all([
        getDeviceCommands(serialNumber, { limit: 30 }),
        getDeviceTelemetry(serialNumber, {
          limit: 100,
          ...(requestId ? { requestId } : {}),
        }),
      ]);

      setCommands(unwrap(commandResponse) || []);
      setTelemetry(unwrap(telemetryResponse) || []);
    } catch (activityError) {
      notify(errorMessage(activityError), "error");
    }
  };

  const createSession = async () => {
    if (!createForm.serialNumber.trim()) return;

    setBusy("create");

    try {
const response = await createCalibrationSession(
  createForm.serialNumber.trim().toUpperCase(),
  {
    calibrationProfileId:
      createForm.calibrationProfileId,

    stationName:
      createForm.stationName.trim(),

    operatorName:
      createForm.operatorName.trim(),

    notes:
      createForm.notes.trim(),
  }
);

      const session = unwrap(response);

      notify(
        response?.data?.message ||
          "Calibration session created."
      );

      setCreateOpen(false);
setCreateForm({
  serialNumber: "",
  calibrationProfileId: "",
  stationName: "",
  operatorName: "",
  notes: "",
});

      await loadSessions();

      if (session?._id) {
        await loadSession(session._id);
      }
    } catch (createError) {
      notify(errorMessage(createError), "error");
    } finally {
      setBusy("");
    }
  };

  const profile = selectedSession?.profileSnapshot || {};
  const referencePoints = Array.isArray(
  profile.referencePoints
)
  ? profile.referencePoints
  : [];

  const selectedPoint = useMemo(
    () =>
      referencePoints.find(
        (point) => String(point.code) === selectedPointCode
      ) || null,
    [referencePoints, selectedPointCode]
  );

  const requiredPoints = referencePoints.filter(
    (point) => point.required !== false
  );

  const capturedCodes = new Set(
    (selectedSession?.captures || []).map(
      (capture) => capture.pointCode
    )
  );

  const missingPoints = requiredPoints.filter(
  (point) => !capturedCodes.has(point.code)
);

// Session state
const sessionStatus = selectedSession?.status || "";

const canCapture =
  sessionStatus === "in_progress";

const canCaptureVerification =
  sessionStatus === "awaiting_verification";

// Allow device operations during both stages
const canOperateDevice =
  canCapture || canCaptureVerification;

const verificationCapturedCodes = new Set(
  (selectedSession?.verificationCaptures || []).map(
    (capture) => capture.pointCode
  )
);

const missingVerificationPoints = requiredPoints.filter(
  (point) => !verificationCapturedCodes.has(point.code)
);

const canApply =
  canCapture &&
  missingPoints.length === 0 &&
  requiredPoints.length > 0;


  const selectedPointNoLoad = isNoLoadPoint(selectedPoint);

  const latestRelayStart = commands.find(
    (command) => command.action === "relayStart"
  );

  const relayStartAccepted =
    latestRelayStart && commandAccepted(latestRelayStart);

  const relayStartRejected =
    latestRelayStart && commandRejected(latestRelayStart);

  const changeReference = (field) => (event) => {
    setReference((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const refreshActivity = async () => {
    if (!selectedSession?.serialNumber) return;

    await loadSession(selectedSession._id);

    await loadDeviceActivity(
      selectedSession.serialNumber,
      telemetryRequestId
    );
  };

  const sendRelayTest = async () => {
    if (!selectedSession?.serialNumber) return;

    setBusy("relay");

    try {
      const response = await startRelayTest(
        selectedSession.serialNumber,
        { durationSeconds: 60 }
      );

      notify(
        response?.data?.message ||
          "Relay test command published. Wait for the device acknowledgement."
      );

      await loadDeviceActivity(selectedSession.serialNumber);
    } catch (relayError) {
      notify(errorMessage(relayError), "error");
    } finally {
      setBusy("");
    }
  };

  const sendRelayStop = async () => {
    if (!selectedSession?.serialNumber) return;

    const proceed = window.confirm(
      "The relayStop firmware command can terminate an active charging session. Confirm that this device is not serving a customer before proceeding."
    );

    if (!proceed) return;

    setBusy("relayStop");

    try {
      const response = await stopRelayTest(
        selectedSession.serialNumber
      );

      notify(
        response?.data?.message ||
          "Relay stop command published."
      );

      await loadDeviceActivity(selectedSession.serialNumber);
    } catch (stopError) {
      notify(errorMessage(stopError), "error");
    } finally {
      setBusy("");
    }
  };

  const beginFastTelemetry = async () => {
    if (!selectedSession?.serialNumber) return;

    if (!selectedPoint) {
      notify("Select a calibration reference point first.", "warning");
      return;
    }

    if (
      !selectedPointNoLoad &&
      !relayStartAccepted
    ) {
      notify(
        "For a loaded reference point, start the relay test and refresh command history until relayStart is acknowledged before starting fast telemetry.",
        "warning"
      );
      return;
    }

    setBusy("telemetry");

    try {
      const response = await startFastTelemetry(
        selectedSession.serialNumber,
        {
          intervalMs: 500,
          durationSeconds: 60,
        }
      );

      const requestId = response?.data?.data?.requestId;

      if (!requestId) {
        throw new Error(
          "The backend did not return a telemetry request ID."
        );
      }

      setTelemetryRequestId(requestId);
      setTelemetry([]);

      notify(
        `Fast telemetry started. Request ID: ${requestId}`
      );

      await loadDeviceActivity(
        selectedSession.serialNumber,
        requestId
      );
    } catch (telemetryError) {
      notify(errorMessage(telemetryError), "error");
    } finally {
      setBusy("");
    }
  };

  const refreshTelemetry = async () => {
    if (!selectedSession?.serialNumber || !telemetryRequestId) return;

    setBusy("refreshTelemetry");

    try {
      const response = await getDeviceTelemetry(
        selectedSession.serialNumber,
        {
          limit: 100,
          requestId: telemetryRequestId,
        }
      );

      setTelemetry(unwrap(response) || []);
    } catch (telemetryError) {
      notify(errorMessage(telemetryError), "error");
    } finally {
      setBusy("");
    }
  };

const capturePoint = async () => {
  if (!selectedSession || !selectedPoint) return;

  if (!telemetryRequestId) {
    notify("Start fresh fast telemetry before capturing.", "warning");
    return;
  }

  const sessionId = selectedSession._id;
  const isVerification =
    selectedSession.status === "awaiting_verification";

  const referencePayload = {};

  if (!isVerification) {
    const requiredChannels = requiredChannelsFor(selectedPoint);

    for (const channel of requiredChannels) {
      const value = reference[channel];

      if (
        value === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      ) {
        notify(`Enter a valid reference ${channel}.`, "warning");
        return;
      }

      referencePayload[channel] = Number(value);
    }
  }

  setBusy("capture");

  try {
    const payload = isVerification
      ? {
          pointCode: selectedPoint.code,
          telemetryRequestId,
        }
      : {
          pointCode: selectedPoint.code,
          telemetryRequestId,
          reference: referencePayload,
        };

    const response = isVerification
      ? await captureVerificationPoint(sessionId, payload)
      : await captureCalibrationPoint(sessionId, payload);

    const refreshedSession = await loadSession(sessionId);

    if (isVerification) {
      notify(
        response?.data?.message || "Verification measurement captured."
      );
      return;
    }

    const requiredCodes = (
      refreshedSession?.profileSnapshot?.referencePoints || []
    )
      .filter((point) => point.required !== false)
      .map((point) => String(point.code));

    const capturedCodesNow = new Set(
      (refreshedSession?.captures || []).map(
        (capture) => String(capture.pointCode)
      )
    );

    const allRequiredCaptured =
      requiredCodes.length > 0 &&
      requiredCodes.every((code) => capturedCodesNow.has(code));

    if (!allRequiredCaptured) {
      notify(
        response?.data?.message || "Reference measurement captured successfully."
      );
      return;
    }

    // Calculate and persist the coefficient proposal as soon as the final
    // required reference point has been captured.
    setBusy("calculate");

    try {
      await calculateCalibration(sessionId);
      await loadSession(sessionId);
      notify(
        "All required reference points captured. Calibration constants were calculated automatically."
      );
    } catch (calculationError) {
      notify(
        `Reference capture was saved, but automatic calculation needs attention: ${errorMessage(calculationError)}`,
        "warning"
      );
    }
  } catch (captureError) {
    notify(errorMessage(captureError), "error");
  } finally {
    setBusy("");
  }
};

  const calculateCalibrationValues = async () => {
    if (!selectedSession) return;

    if (!canApply) {
      notify(
        "Capture all required reference points before calculating constants.",
        "warning"
      );
      return;
    }

    setBusy("calculate");

    try {
      await calculateCalibration(selectedSession._id);
      await loadSession(selectedSession._id);

      notify(
        "Calibration constants recalculated from the saved raw telemetry and reference-meter readings."
      );
    } catch (calculationError) {
      notify(errorMessage(calculationError), "error");
    } finally {
      setBusy("");
    }
  };

  const runVerification = async () => {
  if (!selectedSession) return;

  if (missingVerificationPoints.length > 0) {
    notify(
      "Capture all required post-calibration points first.",
      "warning"
    );
    return;
  }

  setBusy("verify");

  try {
    const response = await verifyCalibration(
      selectedSession._id
    );

    notify(
      response?.data?.message || "Calibration verification completed."
    );

    await loadSession(selectedSession._id);
    await loadSessions();

  } catch (verificationError) {
    notify(errorMessage(verificationError), "error");
  } finally {
    setBusy("");
  }
};

  const applyConstants = async () => {
    if (!selectedSession) return;

    if (!canApply) {
      notify(
        "Capture all required reference points before applying calibration.",
        "warning"
      );
      return;
    }

    const hasCalculatedConstants = CONSTANT_KEYS.every((key) => {
      const value = selectedSession.calculatedConstants?.[key];
      return value !== null && value !== undefined &&
        Number.isFinite(Number(value));
    });

    if (!hasCalculatedConstants) {
      notify(
        "Calculate and review all five constants before applying calibration.",
        "warning"
      );
      return;
    }

    setBusy("apply");

    try {
      // The backend applies its persisted calculation result; the browser
      // no longer supplies or overrides calibration coefficients.
      const response = await applyCalibration(selectedSession._id);

      notify(
        response?.data?.message ||
          "Calculated calibration constants submitted. Waiting for device acknowledgement."
      );

      await loadSession(selectedSession._id);
      await loadDeviceActivity(selectedSession.serialNumber);
    } catch (applyError) {
      notify(errorMessage(applyError), "error");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return <P3Loading label="Loading calibration sessions..." />;
  }

  return (
    <Box sx={P3.page}>
      <P3SectionTitle
        title="Calibration workbench"
        subtitle="Guided station workflow for reference capture, calibration application and device acknowledgement."
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadSessions}
              sx={P3.secondaryButton}
            >
              Refresh
            </Button>

            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => setCreateOpen(true)}
              sx={P3.primaryButton}
            >
              New session
            </Button>
          </Stack>
        }
        
      />
{canCaptureVerification && (
  <Box sx={{ mt: 2 }}>
    <Alert severity="warning" sx={{ mb: 1.5 }}>
      Calibration has been acknowledged. Start a new telemetry
      request and recapture every required reference point
      using the calibrated measurements.
    </Alert>

    <Typography sx={{ fontSize: 11, fontWeight: 800 }}>
      Post-calibration verification
    </Typography>

    <Typography sx={{ fontSize: 10, color: "#64748b", mt: 0.5 }}>
      {verificationCapturedCodes.size} of {requiredPoints.length} points captured
    </Typography>

    <Button
      variant="contained"
      onClick={runVerification}
      disabled={
        missingVerificationPoints.length > 0 ||
        busy === "verify"
      }
      sx={{ ...P3.primaryButton, mt: 1.5 }}
    >
      {busy === "verify"
        ? "Verifying..."
        : "Verify calibration"}
    </Button>
  </Box>
)}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={1.5}>
        {/* SESSION QUEUE */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={P3.panel}>
            <P3SectionTitle
              title="Calibration sessions"
              subtitle="Select an existing session to continue."
            />

            <Stack spacing={1} sx={{ mt: 1.4 }}>
              {sessions.map((session) => {
                const active =
                  selectedSession?._id === session._id;

                return (
                  <Box
                    key={session._id}
                    onClick={() => loadSession(session._id)}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      cursor: "pointer",
                      border: active
                        ? "1px solid #99d9cc"
                        : "1px solid #edf0f4",
                      bgcolor: active ? "#f0fdfa" : "#fff",
                      transition: "all 120ms ease",
                      "&:hover": {
                        borderColor: "#99d9cc",
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                    >
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          fontWeight: 850,
                          color: "#172033",
                        }}
                      >
                        {session.serialNumber}
                      </Typography>
                      <P3Status value={session.status} />
                    </Stack>

                    <Typography
                      sx={{
                        mt: 0.45,
                        color: "#64748b",
                        fontSize: 10,
                      }}
                    >
                      {session.sessionNumber || session._id}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.35,
                        color: "#94a3b8",
                        fontSize: 9.5,
                      }}
                    >
                      {session.stationName || "Station not specified"} ·{" "}
                      {formatDate(session.createdAt)}
                    </Typography>
                  </Box>
                );
              })}

              {!sessions.length ? (
                <P3Empty
                  title="No calibration sessions"
                  description="Create a session for a provisioned device with an active Calibration Profile."
                />
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        {/* SESSION WORKSPACE */}
        <Grid item xs={12} lg={8}>
          {!selectedSession ? (
            <Paper
              elevation={0}
              sx={{
                ...P3.panel,
                minHeight: 350,
                display: "grid",
                placeItems: "center",
              }}
            >
              <P3Empty
                title="Select a calibration session"
                description="Choose a session from the queue or create a new one to open the operator workbench."
              />
            </Paper>
          ) : sessionLoading ? (
            <P3Loading label="Loading calibration session..." />
          ) : (
            <Stack spacing={1.5}>
              {/* SESSION SUMMARY */}
              <Paper elevation={0} sx={P3.panel}>
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    xs: "stretch",
                    sm: "center",
                  }}
                  spacing={1}
                >
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
                      {selectedSession.serialNumber}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.35,
                        fontSize: 10.5,
                        color: "#64748b",
                      }}
                    >
                      {selectedSession.sessionNumber}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <P3Status value={selectedSession.status} />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshRoundedIcon />}
                      onClick={refreshActivity}
                      sx={P3.secondaryButton}
                    >
                      Refresh state
                    </Button>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Grid container spacing={1}>
                  {[
                    ["Station", selectedSession.stationName || "—"],
                    ["Operator", selectedSession.operatorName || selectedSession.operatorId || "—"],
                    ["Device ID", selectedSession.deviceId || "—"],
                    ["Metering hardware", profile.meteringHardware || "—"],
                    ["Profile", profile.profileName || "—"],
                    ["Profile version", profile.profileVersion ?? "—"],
                  ].map(([label, value]) => (
                    <Grid item xs={6} md={4} key={label}>
                      <Typography sx={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 800 }}>
                        {label}
                      </Typography>
                      <Typography sx={{ mt: 0.35, fontSize: 11, fontWeight: 800, wordBreak: "break-word" }}>
                        {value}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              {/* INSTRUCTIONS */}
              {(profile.operatorInstructions?.length ||
                profile.safetyInstructions?.length) ? (
                <Paper elevation={0} sx={P3.panel}>
                  <P3SectionTitle
                    title="Profile instructions"
                    subtitle="Read the profile-specific instructions before connecting a reference load."
                  />

                  {profile.safetyInstructions?.length ? (
                    <Alert severity="warning" sx={{ mt: 1.25, borderRadius: 2, fontSize: 11 }}>
                      <strong>Safety:</strong>
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                        {profile.safetyInstructions.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </Alert>
                  ) : null}

                  {profile.operatorInstructions?.length ? (
                    <Box sx={{ mt: 1.25 }}>
                      <Typography sx={{ fontSize: 10.5, color: "#64748b", fontWeight: 850, mb: 0.75 }}>
                        Operator steps
                      </Typography>
                      <Stack spacing={0.6}>
                        {profile.operatorInstructions.map((item, index) => (
                          <Typography key={index} sx={{ fontSize: 11, color: "#475569" }}>
                            {index + 1}. {item}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}
                </Paper>
              ) : null}

              {/* REFERENCE POINTS */}
              <Paper elevation={0} sx={P3.panel}>
                <P3SectionTitle
                  title="Reference point capture"
                  subtitle="Select a profile reference point, acquire telemetry and record the calibrated reference-meter values."
                />

                <Box sx={{ mt: 1.4 }}>
                  <TextField
                    {...fieldProps}
                    select
                    label="Reference point"
                    value={selectedPointCode}
                    onChange={(event) => {
                      setSelectedPointCode(event.target.value);
                      setReference({
                        voltage: "",
                        current: "",
                        power: "",
                      });
                      setTelemetryRequestId("");
                      setTelemetry([]);
                    }}
                    disabled={!canOperateDevice}
                  >
                    <MenuItem value="">Select reference point</MenuItem>

                    {referencePoints.map((point) => (
                      <MenuItem
                        key={point.code}
                        value={point.code}
                      >
                        {point.name} ({point.code})
                        {point.required === false ? " — Optional" : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                {selectedPoint ? (
                  <Stack spacing={1.35} sx={{ mt: 1.5 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: "1px solid #edf0f4",
                        bgcolor: "#fbfdff",
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 850 }}>
                            {selectedPoint.name}
                          </Typography>
                          <Typography sx={{ mt: 0.3, fontSize: 10, color: "#64748b" }}>
                            {selectedPoint.description || selectedPoint.condition}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={selectedPointNoLoad ? "No-load test" : "Loaded test"}
                          sx={{
                            fontSize: 9.5,
                            fontWeight: 850,
                            bgcolor: selectedPointNoLoad ? "#f1f5f9" : "#fef3c7",
                            color: selectedPointNoLoad ? "#475569" : "#92400e",
                          }}
                        />
                      </Stack>
                    </Paper>

                    {!selectedPointNoLoad ? (
                      <Alert severity="warning" sx={{ borderRadius: 2, fontSize: 11 }}>
                        This reference point requires `adminRelayTest=true` telemetry. Start the relay test, wait for its accepted acknowledgement, then start fast telemetry and capture before the test duration ends.
                      </Alert>
                    ) : (
                      <Alert severity="info" sx={{ borderRadius: 2, fontSize: 11 }}>
                        For no-load capture, the relay test must be off. The backend filters for telemetry where `adminRelayTest=false`.
                      </Alert>
                    )}

                    <Stack
                      direction="row"
                      flexWrap="wrap"
                      gap={1}
                    >
                      {!selectedPointNoLoad ? (
                        <Button
                          variant="outlined"
                          startIcon={<PlayArrowRoundedIcon />}
                          onClick={sendRelayTest}
                          disabled={!canOperateDevice || busy === "relay"}
                          sx={P3.secondaryButton}
                         >
                          {busy === "relay" ? "Sending..." : "Start relay test"}
                        </Button>
                      ) : null}

                      <Button
                        variant="outlined"
                        startIcon={<BoltRoundedIcon />}
                        onClick={beginFastTelemetry}
                          disabled={
                            !canOperateDevice ||
                            busy === "telemetry" ||
                            (!selectedPointNoLoad && !relayStartAccepted)
                          }
                        sx={P3.secondaryButton}
                      >
                        {busy === "telemetry" ? "Starting..." : "Start fast telemetry"}
                      </Button>

                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<StopRoundedIcon />}
                        onClick={sendRelayStop}
                        disabled={!canOperateDevice || busy === "relayStop"}
                        sx={{
                          ...P3.secondaryButton,
                          color: "#b91c1c",
                          borderColor: "#fecaca",
                        }}
                      >
                        Stop relay
                      </Button>
                    </Stack>

                    {!selectedPointNoLoad && latestRelayStart ? (
                      <Alert
                        severity={
                          relayStartAccepted
                            ? "success"
                            : relayStartRejected
                            ? "error"
                            : "info"
                        }
                        sx={{ borderRadius: 2, fontSize: 11 }}
                      >
                        Latest relay test command status:{" "}
                        <strong>{latestRelayStart.status}</strong>. Use
                        Refresh state to retrieve its latest acknowledgement.
                      </Alert>
                    ) : null}

                    <Box>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography sx={{ fontSize: 11, fontWeight: 850 }}>
                          Telemetry request
                        </Typography>
                        <Button
                          size="small"
                          onClick={refreshTelemetry}
                          disabled={!telemetryRequestId || busy === "refreshTelemetry"}
                          sx={{
                            textTransform: "none",
                            fontSize: 10.5,
                            fontWeight: 800,
                          }}
                        >
                          {busy === "refreshTelemetry" ? "Loading..." : "Refresh samples"}
                        </Button>
                      </Stack>

                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: 10,
                          color: telemetryRequestId ? "#0f766e" : "#94a3b8",
                          fontWeight: 700,
                          wordBreak: "break-all",
                        }}
                      >
                        {telemetryRequestId || "No active telemetry request"}
                      </Typography>

                      <Typography sx={{ mt: 0.35, fontSize: 10, color: "#64748b" }}>
                        Samples received for this request: {telemetry.length}
                      </Typography>

                      <Box sx={{ overflowX: "auto", mt: 0.75 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {["Time", "Voltage", "Current", "Power", "Fresh", "Relay test"].map((label) => (
                                <TableCell key={label} sx={{ fontSize: 9, color: "#94a3b8", fontWeight: 850 }}>
                                  {label}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {telemetry.slice(0, 8).map((sample, index) => (
                              <TableRow key={sample._id || index}>
                                <TableCell sx={{ fontSize: 9.5 }}>
                                  {formatDate(sample.capturedAt)}
                                </TableCell>
                                <TableCell sx={{ fontSize: 9.5 }}>
                                  {Number(sample.voltage || 0).toFixed(2)} V
                                </TableCell>
                                <TableCell sx={{ fontSize: 9.5 }}>
                                  {Number(sample.current || 0).toFixed(3)} A
                                </TableCell>
                                <TableCell sx={{ fontSize: 9.5 }}>
                                  {Number(sample.power || 0).toFixed(2)} W
                                </TableCell>
                                <TableCell>
                                  <P3Status value={sample.sampleFresh ? "passed" : "failed"} />
                                </TableCell>
                                <TableCell>
                                  <P3Status value={sample.adminRelayTest ? "accepted" : "pending"} />
                                </TableCell>
                              </TableRow>
                            ))}

                            {!telemetry.length ? (
                              <TableRow>
                                <TableCell colSpan={6}>
                                  <P3Empty
                                    title="Waiting for telemetry"
                                    description="Start fast telemetry and refresh samples to see incoming readings."
                                  />
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </TableBody>
                        </Table>
                      </Box>
                    </Box>

                    <Divider />

                    <Typography sx={{ fontSize: 11.5, fontWeight: 900 }}>
                      Reference meter readings
                    </Typography>

                    <Grid container spacing={1.2}>
                      {requiredChannelsFor(selectedPoint).map((channel) => {
                        const unit =
                          channel === "voltage"
                            ? selectedPoint.voltageUnit || "V"
                            : channel === "current"
                            ? selectedPoint.currentUnit || "A"
                            : selectedPoint.powerUnit || "W";

                        return (
                          <Grid item xs={12} sm={4} key={channel}>
                            <TextField
                              {...fieldProps}
                              type="number"
                              label={`Reference ${channel} (${unit})`}
                              value={reference[channel]}
                              onChange={changeReference(channel)}
                              disabled={!canCapture}
                              inputProps={{
                                min: 0,
                                step: "any",
                              }}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>

                    <Button
                      variant="contained"
                      startIcon={<CameraAltRoundedIcon />}
                      onClick={capturePoint}
                        disabled={
                          !(canCapture || canCaptureVerification) ||
                          !telemetryRequestId ||
                          busy === "capture"
                        }
                      sx={{
                        ...P3.primaryButton,
                        alignSelf: {
                          xs: "stretch",
                          sm: "flex-start",
                        },
                      }}
                    >
                      {busy === "capture"
                        ? "Capturing..."
                        : canCaptureVerification
                        ? "Capture verification point"
                        : "Capture reference point"}
                    </Button>
                  </Stack>
                ) : (
                  <P3Empty
                    title="Select a reference point"
                    description="The available points are loaded from the Calibration Profile assigned to this device."
                  />
                )}

                <Divider sx={{ my: 1.6 }} />

                <P3SectionTitle
                  title="Capture progress"
                  subtitle={`${capturedCodes.size} of ${requiredPoints.length} required points captured`}
                />

                <Stack spacing={0.7} sx={{ mt: 1 }}>
                  {referencePoints.map((point) => {
                    const isCaptured = capturedCodes.has(point.code);

                    return (
                      <Stack
                        key={point.code}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          py: 0.8,
                          px: 1,
                          borderRadius: 1.75,
                          bgcolor: "#fbfdff",
                          border: "1px solid #edf0f4",
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 800 }}>
                            {point.name}
                          </Typography>
                          <Typography sx={{ fontSize: 9.5, color: "#94a3b8" }}>
                            {point.code} · {point.condition}
                          </Typography>
                        </Box>

                        <P3Status
                          value={
                            isCaptured
                              ? "passed"
                              : point.required === false
                              ? "optional"
                              : "pending"
                          }
                        />
                      </Stack>
                    );
                  })}

                  {!referencePoints.length ? (
                    <P3Empty title="No reference points in this profile" />
                  ) : null}
                </Stack>
              </Paper>

              {/* CALIBRATION CONSTANTS */}
              <Paper elevation={0} sx={P3.panel}>
                <P3SectionTitle
                  title="Calculated calibration constants"
                  subtitle="The backend derives the five firmware coefficients from the captured raw HLW8032 telemetry and reference-meter readings."
                />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  sx={{ mt: 1.25 }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<AutoFixHighRoundedIcon />}
                    onClick={calculateCalibrationValues}
                    disabled={!canApply || busy === "calculate"}
                    sx={P3.secondaryButton}
                  >
                    {busy === "calculate"
                      ? "Calculating..."
                      : selectedSession.calculatedConstants
                      ? "Recalculate constants"
                      : "Calculate constants"}
                  </Button>

                  {selectedSession.calculation?.calculatedAt ? (
                    <Chip
                      size="small"
                      color="success"
                      label={`Calculated ${formatDate(selectedSession.calculation.calculatedAt)}`}
                    />
                  ) : null}
                </Stack>

                {selectedSession.calculatedConstants ? (
                  <Alert severity="success" sx={{ mt: 1.25, borderRadius: 2, fontSize: 11 }}>
                    Constants were calculated from {selectedSession.calculation?.referencePointCount ?? "the captured"} reference points and {selectedSession.calculation?.totalSamplesUsed ?? "the available"} raw telemetry samples. Review the values and fit details before applying them.
                  </Alert>
                ) : (
                  <Alert severity="info" sx={{ mt: 1.25, borderRadius: 2, fontSize: 11 }}>
                    Once all required reference points are captured, the system calculates and prefills these values automatically. You can also use Calculate constants to run the calculation again.
                  </Alert>
                )}

                {selectedSession.calculation?.warnings?.length ? (
                  <Alert severity="warning" sx={{ mt: 1, borderRadius: 2, fontSize: 11 }}>
                    {selectedSession.calculation.warnings.map((warning, index) => (
                      <Typography key={index} component="div" sx={{ fontSize: 11 }}>
                        {warning}
                      </Typography>
                    ))}
                  </Alert>
                ) : null}

                <Grid container spacing={1.3} sx={{ mt: 0.4 }}>
                  {CONSTANT_KEYS.map((key) => {
                    const definition = (
                      profile.calibrationValues || []
                    ).find((item) => item.firmwareKey === key);

                    const hasValue =
                      selectedSession.calculatedConstants?.[key] !== null &&
                      selectedSession.calculatedConstants?.[key] !== undefined;

                    return (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <TextField
                          {...fieldProps}
                          type="number"
                          label={CONSTANT_LABELS[key]}
                          value={constants[key] ?? ""}
                          disabled={!canApply || !hasValue}
                          InputProps={{ readOnly: true }}
                          inputProps={{
                            step: "any",
                          }}
                          helperText={
                            hasValue
                              ? definition
                                ? `Auto-calculated. Profile range: ${definition.minimumValue ?? "No minimum"} to ${definition.maximumValue ?? "No maximum"}`
                                : "Auto-calculated from reference captures"
                              : "Waiting for automatic calculation"
                          }
                        />
                      </Grid>
                    );
                  })}
                </Grid>

                <Button
                  variant="contained"
                  startIcon={<SendRoundedIcon />}
                  onClick={applyConstants}
                  disabled={
                    !canApply ||
                    !selectedSession.calculatedConstants ||
                    busy === "apply"
                  }
                  sx={{
                    ...P3.primaryButton,
                    mt: 1.8,
                  }}
                >
                  {busy === "apply" ? "Submitting..." : "Apply calibration"}
                </Button>

                {canApply && !selectedSession.calculatedConstants ? (
                  <Typography sx={{ mt: 0.8, fontSize: 10, color: "#b45309" }}>
                    Calculate the constants first. The Apply action uses only the backend-saved calculation result.
                  </Typography>
                ) : null}

                {!canApply && sessionStatus === "in_progress" ? (
                  <Typography sx={{ mt: 0.8, fontSize: 10, color: "#b45309" }}>
                    Capture all required reference points before calculating or applying calibration.
                  </Typography>
                ) : null}

                {["applying", "awaiting_verification"].includes(sessionStatus) ? (
                  <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2, fontSize: 11 }}>
                    Calibration has been submitted. Refresh session state and command history to confirm the device acknowledgement.
                  </Alert>
                ) : null}

                {sessionStatus === "passed" ? (
                  <Alert severity="success" sx={{ mt: 1.5, borderRadius: 2, fontSize: 11 }}>
                    The backend reports this session as passed. Review the saved verification results and audit record.
                  </Alert>
                ) : null}

                {sessionStatus === "failed" ? (
                  <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2, fontSize: 11 }}>
                    The backend reports a failed calibration. Review the failure record and move the device through the approved rework process.
                  </Alert>
                ) : null}
              </Paper>

              {/* COMMAND HISTORY */}
              <Paper elevation={0} sx={P3.panel}>
                <P3SectionTitle
                  title="Device command history"
                  subtitle="Use this to confirm relay test, telemetry and calibration acknowledgements."
                />

                <Box sx={{ overflowX: "auto", mt: 1 }}>
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
                      {commands.map((command) => (
                        <TableRow key={command._id}>
                          <TableCell sx={{ fontSize: 10.5, fontWeight: 800 }}>
                            {command.action}
                          </TableCell>
                          <TableCell sx={{ fontSize: 9.5, maxWidth: 180, wordBreak: "break-all" }}>
                            {command.requestId || "—"}
                          </TableCell>
                          <TableCell>
                            <P3Status value={command.status} />
                          </TableCell>
                          <TableCell sx={{ fontSize: 9.5 }}>
                            {formatDate(command.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {!commands.length ? (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <P3Empty title="No device commands returned" />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>

              {/* SAFE VERIFICATION GATE */}
              {sessionStatus === "awaiting_verification" ? (
                <Alert severity="error" sx={{ borderRadius: 2, fontSize: 11 }}>
                  The device has acknowledged calibration, but the current backend verification contract does not provide a separate fresh post-application capture set. The verify action is intentionally not available here, because the current verifier reads the original pre-application captures. Do not mark this device Production Ready until the backend stores and verifies new post-application samples.
                </Alert>
              ) : null}
            </Stack>
          )}
        </Grid>
      </Grid>

      {/* CREATE SESSION */}
      <Dialog
        open={createOpen}
        onClose={() => !busy && setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Start calibration session
          <Typography sx={{ mt: 0.4, fontSize: 11, color: "#64748b", fontWeight: 500 }}>
            The device must be provisioned and have an active Calibration Profile assigned.
          </Typography>
        </DialogTitle>

        <Divider />

        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField
              {...fieldProps}
              label="Factory serial number *"
              value={createForm.serialNumber}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  serialNumber: event.target.value.toUpperCase(),
                }))
              }
            />
            <TextField
  {...fieldProps}
  select
  label="Calibration Profile *"
  value={createForm.calibrationProfileId}
  disabled={profilesLoading}
  onChange={(event) =>
    setCreateForm((current) => ({
      ...current,
      calibrationProfileId: event.target.value,
    }))
  }
  helperText="Only active calibration profiles are available."
>
  <MenuItem value="">
    Select Calibration Profile
  </MenuItem>

  {calibrationProfiles.map((profile) => (
    <MenuItem
      key={profile._id}
      value={profile._id}
    >
      {profile.profileName} · {profile.meteringHardware} ·
      v{profile.profileVersion}
    </MenuItem>
  ))}
</TextField>

{!profilesLoading && !calibrationProfiles.length && (
  <Alert severity="warning">
    No active Calibration Profiles found.
    Create a Calibration Profile with status
    active in the Profiles section.
  </Alert>
)}

            <TextField
              {...fieldProps}
              label="Calibration station"
              value={createForm.stationName}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  stationName: event.target.value,
                }))
              }
              placeholder="Station A"
            />

            <TextField
              {...fieldProps}
              label="Operator name"
              value={createForm.operatorName}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  operatorName: event.target.value,
                }))
              }
            />

            <TextField
              {...fieldProps}
              multiline
              minRows={2}
              label="Session notes"
              value={createForm.notes}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={P3.secondaryButton}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createSession}
            disabled={
              busy === "create" ||
              !createForm.serialNumber.trim() ||
              !createForm.calibrationProfileId ||
              profilesLoading
            }
            sx={P3.primaryButton}
          >
            {busy === "create" ? "Creating..." : "Create session"}
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