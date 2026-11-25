import React, { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import {
  listProfiles,
  createProfile,
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
  paginationOf,
} from "./ProductionV3Components";

const PROFILE_TYPES = [
  { value: "production", label: "Production" },
  { value: "firmware", label: "Firmware" },
  { value: "calibration", label: "Calibration" },
];

const starterTemplate = (type) => {
  if (type === "production") {
    return {
      profileName: "New production profile",
      profileCode: "NEW_PRODUCTION_PROFILE",
      description: "",
      isActive: false,
      project: "",
      customerName: "",
      hardwareRevision: "",
      pcbBatch: "",
      chargerType: "single_point",
      meteringHardware: "",
      meteringHardwareRevision: "",
      electricityBearer: "OWNER",
      ratePerKwh: 0,
      vjraMargin: 0,
      serviceCharge: 0,
      gstPercentage: 0,
      location: "",
      area: "",
      city: "",
      state: "",
      country: "India",
      latitude: null,
      longitude: null,
      installationNotes: "",
      notes: "",
    };
  }

  if (type === "firmware") {
    return {
      profileName: "New firmware profile",
      profileCode: "NEW_FIRMWARE_PROFILE",
      profileVersion: 1,
      description: "",
      status: "draft",
      firmwareFamily: "",
      targetFirmwareVersion: "",
      protocolVersion: "1",
      supportedHardwareRevisions: [],
      supportedMeteringHardware: [],
      capabilities: [],
      defaults: {
        currentRF: null,
        maxCurrent: null,
        maxPower: null,
        sessionTimeoutSeconds: null,
        commandExpirySeconds: null,
        additionalConfig: {},
      },
      telemetry: {
        enabled: true,
        normalIntervalSeconds: 30,
        calibrationIntervalSeconds: 1,
        calibrationMaxDurationSeconds: 60,
        includePowerFactor: true,
        includeRelayState: true,
      },
      firmwareBinary: {
        version: null,
        downloadUrl: null,
        checksumAlgorithm: null,
        checksum: null,
      },
      releaseNotes: "",
      releasedAt: null,
    };
  }

  return {
    profileName: "New calibration profile",
    profileCode: "NEW_CALIBRATION_PROFILE",
    profileVersion: 1,
    description: "",
    status: "draft",
    meteringHardware: "",
    meteringHardwareRevision: null,
    supportedHardwareRevisions: [],
    firmwareFamily: null,
    minimumFirmwareVersion: null,
    maximumFirmwareVersion: null,
    algorithm: {
      name: "",
      version: "1.0",
      description: "",
      calculationConfig: {},
    },
    calibrationValues: [
      {
        firmwareKey: "vf",
        displayName: "Voltage factor",
        description: "",
        unit: null,
        defaultValue: null,
        minimumValue: null,
        maximumValue: null,
        decimalPlaces: 6,
        required: true,
      },
      {
        firmwareKey: "currentZero",
        displayName: "Current zero offset",
        description: "",
        unit: null,
        defaultValue: null,
        minimumValue: null,
        maximumValue: null,
        decimalPlaces: 6,
        required: true,
      },
      {
        firmwareKey: "currentGain",
        displayName: "Current gain",
        description: "",
        unit: null,
        defaultValue: null,
        minimumValue: null,
        maximumValue: null,
        decimalPlaces: 6,
        required: true,
      },
      {
        firmwareKey: "powerZero",
        displayName: "Power zero offset",
        description: "",
        unit: null,
        defaultValue: null,
        minimumValue: null,
        maximumValue: null,
        decimalPlaces: 6,
        required: true,
      },
      {
        firmwareKey: "powerGain",
        displayName: "Power gain",
        description: "",
        unit: null,
        defaultValue: null,
        minimumValue: null,
        maximumValue: null,
        decimalPlaces: 6,
        required: true,
      },
    ],
    referencePoints: [],
    noLoadSampling: {
      sampleCount: 10,
      stabilityTolerance: null,
      stableSampleCount: 5,
      captureTimeoutSeconds: 30,
    },
    loadSampling: {
      sampleCount: 10,
      stabilityTolerance: null,
      stableSampleCount: 5,
      captureTimeoutSeconds: 30,
    },
    acceptanceCriteria: {
      voltageTolerancePercent: null,
      currentTolerancePercent: null,
      powerTolerancePercent: null,
      requireVoltageVerification: true,
      requireCurrentVerification: true,
      requirePowerVerification: true,
      additionalCriteria: {},
    },
    safetyInstructions: [],
    operatorInstructions: [],
  };
};

export default function ProductionV3Profiles() {
  const [type, setType] = useState("production");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [jsonText, setJsonText] = useState(
    JSON.stringify(starterTemplate("production"), null, 2)
  );

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const notify = (message, severity = "success") =>
    setToast({ open: true, message, severity });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await listProfiles(type, {
        page: page + 1,
        limit: pageSize,
        search: appliedSearch || undefined,
      });

      setRows(unwrap(response) || []);
      setTotal(paginationOf(response).total || 0);
    } catch (loadError) {
      notify(errorMessage(loadError), "error");
    } finally {
      setLoading(false);
    }
  }, [type, page, appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const changeType = (_, value) => {
    setType(value);
    setPage(0);
    setSearch("");
    setAppliedSearch("");
  };

  const openCreate = () => {
    setJsonText(JSON.stringify(starterTemplate(type), null, 2));
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    let payload;

    try {
      payload = JSON.parse(jsonText);
    } catch (parseError) {
      notify(
        `Invalid JSON: ${parseError.message}`,
        "error"
      );
      return;
    }

    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      notify("Profile JSON must be an object.", "error");
      return;
    }

    setBusy(true);

    try {
      const response = await createProfile(type, payload);
      const created = unwrap(response);

      notify(
        response?.data?.message ||
          `${created?.profileName || "Profile"} created successfully.`
      );

      setCreateOpen(false);
      await load();
    } catch (createError) {
      const data = createError?.response?.data;
      const details = Array.isArray(data?.errors)
        ? ` ${data.errors.join(" ")}`
        : "";

      notify(`${errorMessage(createError)}${details}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const viewProfile = (profile) => {
    setSelectedProfile(profile);
    setDetailOpen(true);
  };

  if (loading && !rows.length) {
    return <P3Loading label="Loading profiles..." />;
  }

  return (
    <Box sx={P3.page}>
      <P3SectionTitle
        title="Profile library"
        subtitle="Profiles define the manufacturing setup, firmware compatibility and calibration procedure."
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={load}
              sx={P3.secondaryButton}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={openCreate}
              sx={P3.primaryButton}
            >
              New profile
            </Button>
          </Stack>
        }
      />

      <Paper elevation={0} sx={P3.panel}>
        <Tabs
          value={type}
          onChange={changeType}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            minHeight: 38,
            "& .MuiTab-root": {
              minHeight: 38,
              minWidth: 100,
              textTransform: "none",
              fontSize: 11.5,
              fontWeight: 800,
            },
            "& .Mui-selected": {
              color: "#0f766e !important",
            },
            "& .MuiTabs-indicator": {
              bgcolor: "#0f766e",
              height: 3,
              borderRadius: 3,
            },
          }}
        >
          {PROFILE_TYPES.map((item) => (
            <Tab
              key={item.value}
              value={item.value}
              label={item.label}
            />
          ))}
        </Tabs>

        <Divider sx={{ my: 1.5 }} />

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={1}
        >
          <TextField
            size="small"
            fullWidth
            label="Search profile name or code"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(0);
                setAppliedSearch(search.trim());
              }
            }}
            sx={P3.field}
          />
          <Button
            variant="outlined"
            onClick={() => {
              setPage(0);
              setAppliedSearch(search.trim());
            }}
            sx={P3.secondaryButton}
          >
            Search
          </Button>
        </Stack>

        <Box sx={{ overflowX: "auto", mt: 1.75 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  "Profile name",
                  "Code",
                  "Version",
                  "Hardware / family",
                  "Status",
                  "Updated",
                  "View",
                ].map((label) => (
                  <TableCell
                    key={label}
                    sx={{
                      color: "#94a3b8",
                      fontSize: 10,
                      fontWeight: 850,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((profile) => {
                const statusValue =
                  type === "production"
                    ? profile.isActive
                      ? "active"
                      : "inactive"
                    : profile.status;

                const hardwareValue =
                  type === "production"
                    ? profile.meteringHardware
                    : type === "firmware"
                    ? profile.firmwareFamily
                    : profile.meteringHardware;

                return (
                  <TableRow key={profile._id} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 850 }}>
                        {profile.profileName}
                      </Typography>
                      {profile.description ? (
                        <Typography sx={{ fontSize: 9.5, color: "#94a3b8", mt: 0.25 }}>
                          {profile.description}
                        </Typography>
                      ) : null}
                    </TableCell>

                    <TableCell sx={{ fontSize: 10.5, fontWeight: 700 }}>
                      {profile.profileCode}
                    </TableCell>

                    <TableCell sx={{ fontSize: 10.5 }}>
                      {profile.profileVersion ?? "—"}
                    </TableCell>

                    <TableCell sx={{ fontSize: 10.5 }}>
                      {hardwareValue || "—"}
                    </TableCell>

                    <TableCell>
                      <P3Status value={statusValue} />
                    </TableCell>

                    <TableCell sx={{ fontSize: 10, color: "#64748b" }}>
                      {formatDate(profile.updatedAt)}
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<VisibilityRoundedIcon />}
                        onClick={() => viewProfile(profile)}
                        sx={{
                          textTransform: "none",
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: "#0f766e",
                        }}
                      >
                        JSON
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <P3Empty
                      title="No profiles found"
                      description="Create a profile revision to make it available for new manufacturing batches."
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

      <Alert severity="info" sx={{ borderRadius: 2, fontSize: 11 }}>
        Profile creation uses the backend model's field validation. For profiles already assigned to devices or batches, create a new version rather than silently changing the meaning of an existing profile.
      </Alert>

      {/* CREATE */}
      <Dialog
        open={createOpen}
        onClose={() => !busy && setCreateOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Create {type} profile
          <Typography sx={{ mt: 0.4, fontSize: 11, color: "#64748b", fontWeight: 500 }}>
            Edit the JSON payload, then submit it to the matching profile endpoint.
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={1.2} sx={{ pt: 0.5 }}>
            <Alert severity="warning" sx={{ borderRadius: 2, fontSize: 11 }}>
              This is a structured configuration editor. Check profile code, version, hardware compatibility and required values before creating the profile.
            </Alert>

            {type === "calibration" ? (
              <Alert severity="error" sx={{ borderRadius: 2, fontSize: 11 }}>
                Do not activate a Calibration Profile until its calibration algorithm, constants, limits, units, reference points and acceptance tolerances have been validated against the actual meter and firmware.
              </Alert>
            ) : null}

            <TextField
              fullWidth
              multiline
              minRows={20}
              maxRows={32}
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  alignItems: "flex-start",
                  bgcolor: "#0f172a",
                  color: "#e2e8f0",
                  fontFamily: "Consolas, Monaco, monospace",
                  fontSize: 11.5,
                  lineHeight: 1.55,
                },
                "& textarea": {
                  fontFamily: "Consolas, Monaco, monospace",
                },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setCreateOpen(false)}
            disabled={busy}
            sx={P3.secondaryButton}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitCreate}
            disabled={busy || !jsonText.trim()}
            sx={P3.primaryButton}
          >
            {busy ? "Creating..." : "Validate and create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {selectedProfile?.profileName || "Profile details"}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={16}
            value={
              selectedProfile
                ? JSON.stringify(selectedProfile, null, 2)
                : ""
            }
            InputProps={{ readOnly: true }}
            sx={{
              mt: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#0f172a",
                color: "#e2e8f0",
                fontFamily: "Consolas, Monaco, monospace",
                fontSize: 11,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailOpen(false)} sx={P3.secondaryButton}>
            Close
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