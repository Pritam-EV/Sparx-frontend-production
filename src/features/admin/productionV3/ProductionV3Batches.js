import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
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

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import {
  listBatches,
  getBatch,
  createBatch,
  listProfiles,
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

const initialForm = {
  batchNumber: "",
  batchName: "",
  description: "",
  project: "",
  customerName: "",
  hardwareRevision: "",
  pcbBatch: "",
  chargerType: "single_point",
  meteringHardware: "",
  plannedQuantity: "10",
  serialNumberPrefix: "VIZ",
  serialNumberStart: "1",
  serialNumberPadding: "4",
  productionProfileId: "",
  firmwareProfileId: "",
  calibrationProfileId: "",
  manufacturingLocation: "",
  area: "",
  city: "",
  state: "",
  country: "India",
  plannedStartDate: "",
  plannedCompletionDate: "",
  notes: "",
};

const fieldProps = {
  fullWidth: true,
  size: "small",
  sx: P3.field,
};

export default function ProductionV3Batches() {
  const [rows, setRows] = useState([]);
  const [profiles, setProfiles] = useState({
    production: [],
    firmware: [],
    calibration: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [batchRes, productionRes, firmwareRes, calibrationRes] =
        await Promise.all([
          listBatches({
            page: page + 1,
            limit: pageSize,
          }),
          listProfiles("production", {
            page: 1,
            limit: 100,
            status: "active",
          }),
          listProfiles("firmware", {
            page: 1,
            limit: 100,
            status: "active",
          }),
          listProfiles("calibration", {
            page: 1,
            limit: 100,
            status: "active",
          }),
        ]);

      setRows(unwrap(batchRes) || []);
      setTotal(paginationOf(batchRes).total || 0);

      setProfiles({
        production: unwrap(productionRes) || [],
        firmware: unwrap(firmwareRes) || [],
        calibration: unwrap(calibrationRes) || [],
      });
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const serialPreview = useMemo(() => {
    const prefix = String(form.serialNumberPrefix || "")
      .trim()
      .toUpperCase();

    const start = Number(form.serialNumberStart);
    const quantity = Number(form.plannedQuantity);
    const padding = Number(form.serialNumberPadding);

    if (
      !prefix ||
      !Number.isInteger(start) ||
      !Number.isInteger(quantity) ||
      !Number.isInteger(padding) ||
      start < 1 ||
      quantity < 1 ||
      padding < 1
    ) {
      return "Enter a valid serial range";
    }

    const end = start + quantity - 1;

    return `${prefix}${String(start).padStart(padding, "0")}  →  ${prefix}${String(
      end
    ).padStart(padding, "0")}`;
  }, [
    form.serialNumberPrefix,
    form.serialNumberStart,
    form.plannedQuantity,
    form.serialNumberPadding,
  ]);

  const notify = (message, severity = "success") =>
    setToast({
      open: true,
      message,
      severity,
    });

  const submitCreate = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        batchNumber: form.batchNumber.trim().toUpperCase(),
        serialNumberPrefix: form.serialNumberPrefix.trim().toUpperCase(),
        plannedQuantity: Number(form.plannedQuantity),
        serialNumberStart: Number(form.serialNumberStart),
        serialNumberPadding: Number(form.serialNumberPadding),
        productionProfileId: form.productionProfileId || null,
        firmwareProfileId: form.firmwareProfileId || null,
        calibrationProfileId: form.calibrationProfileId || null,
        plannedStartDate: form.plannedStartDate || null,
        plannedCompletionDate: form.plannedCompletionDate || null,
      };

      const response = await createBatch(payload);
      const result = unwrap(response);

      setCreateOpen(false);
      setForm(initialForm);
      notify(
        `Batch created. ${result?.generatedCount || 0} serial numbers generated.`
      );

      await load();

      if (result?.batch?._id) {
        openDetails(result.batch._id);
      }
    } catch (createError) {
      notify(errorMessage(createError), "error");
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (batchId) => {
    setSelectedBatch(null);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const response = await getBatch(batchId);
      setSelectedBatch(unwrap(response));
    } catch (detailError) {
      notify(errorMessage(detailError), "error");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading && !rows.length) return <P3Loading label="Loading batches..." />;

  return (
    <Box sx={P3.page}>
      <P3SectionTitle
        title="Manufacturing batches"
        subtitle="Each batch creates the Group A device records and reserves the factory serial-number range."
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
              onClick={() => setCreateOpen(true)}
              sx={P3.primaryButton}
            >
              Create batch
            </Button>
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={P3.panel}>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  "Batch",
                  "Project / Customer",
                  "Hardware",
                  "Serial range",
                  "Quantity",
                  "Progress",
                  "Status",
                  "Details",
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
              {rows.map((batch) => (
                <TableRow
                  key={batch._id}
                  hover
                  sx={{ "&:last-child td": { borderBottom: 0 } }}
                >
                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 850,
                        color: "#172033",
                      }}
                    >
                      {batch.batchNumber}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: "#94a3b8",
                        mt: 0.25,
                      }}
                    >
                      {batch.batchName}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography sx={{ fontSize: 11 }}>
                      {batch.project || "—"}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: "#94a3b8",
                      }}
                    >
                      {batch.customerName || "No customer"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography sx={{ fontSize: 11 }}>
                      {batch.hardwareRevision}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: "#94a3b8",
                      }}
                    >
                      {batch.meteringHardware || "Meter unspecified"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {batch.serialNumberPrefix}
                      {String(batch.serialNumberStart).padStart(
                        batch.serialNumberPadding,
                        "0"
                      )}
                      {" — "}
                      {batch.serialNumberPrefix}
                      {String(batch.serialNumberEnd).padStart(
                        batch.serialNumberPadding,
                        "0"
                      )}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography sx={{ fontSize: 11, fontWeight: 800 }}>
                      {batch.actualQuantity} / {batch.plannedQuantity}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ minWidth: 140 }}>
                    <Stack spacing={0.5}>
                      <Box
                        sx={{
                          height: 6,
                          overflow: "hidden",
                          borderRadius: 8,
                          bgcolor: "#e2e8f0",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${
                              batch.plannedQuantity
                                ? Math.min(
                                    100,
                                    (Number(batch.deviceCounts?.productionReady || 0) /
                                      Number(batch.plannedQuantity)) *
                                      100
                                  )
                                : 0
                            }%`,
                            bgcolor: "#0f766e",
                            borderRadius: 8,
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          fontSize: 9.5,
                          color: "#94a3b8",
                        }}
                      >
                        {batch.deviceCounts?.productionReady || 0} ready
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <P3Status value={batch.status} />
                  </TableCell>

                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => openDetails(batch._id)}
                      sx={{ color: "#0f766e" }}
                    >
                      <VisibilityRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <P3Empty
                      title="No manufacturing batches"
                      description="Create your first batch to generate factory serial records."
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
            "& .MuiTablePagination-toolbar": {
              minHeight: 48,
            },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontSize: 10.5,
            },
          }}
        />
      </Paper>

      {/* CREATE BATCH */}
      <Dialog
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Create manufacturing batch
          <Typography
            sx={{
              mt: 0.5,
              fontSize: 11,
              fontWeight: 500,
              color: "#64748b",
            }}
          >
            Batch creation generates Group A serial records. Factory serial numbers are immutable.
          </Typography>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ py: 2.5 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 850, mb: 1.2 }}>
                Batch information
              </Typography>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    label="Batch number *"
                    value={form.batchNumber}
                    onChange={update("batchNumber")}
                    placeholder="VIZ-BATCH-2026-001"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    label="Batch name *"
                    value={form.batchName}
                    onChange={update("batchName")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    label="Project"
                    value={form.project}
                    onChange={update("project")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    label="Customer name"
                    value={form.customerName}
                    onChange={update("customerName")}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    {...fieldProps}
                    multiline
                    minRows={2}
                    label="Description"
                    value={form.description}
                    onChange={update("description")}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 850, mb: 1.2 }}>
                Hardware and serial generation
              </Typography>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    label="Hardware revision *"
                    value={form.hardwareRevision}
                    onChange={update("hardwareRevision")}
                    placeholder="PCB_V1.2"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    label="PCB batch"
                    value={form.pcbBatch}
                    onChange={update("pcbBatch")}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    select
                    label="Charger type"
                    value={form.chargerType}
                    onChange={update("chargerType")}
                  >
                    <MenuItem value="single_point">Single point</MenuItem>
                    <MenuItem value="three_point">Three point</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    label="Metering hardware"
                    value={form.meteringHardware}
                    onChange={update("meteringHardware")}
                    placeholder="ATM90E26 / HLW8032"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    label="Planned quantity *"
                    type="number"
                    value={form.plannedQuantity}
                    onChange={update("plannedQuantity")}
                    inputProps={{ min: 1, max: 5000 }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    label="Serial prefix *"
                    value={form.serialNumberPrefix}
                    onChange={update("serialNumberPrefix")}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    label="Starting number *"
                    type="number"
                    value={form.serialNumberStart}
                    onChange={update("serialNumberStart")}
                    inputProps={{ min: 1 }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    label="Number padding"
                    type="number"
                    value={form.serialNumberPadding}
                    onChange={update("serialNumberPadding")}
                    inputProps={{ min: 1, max: 12 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "#f0fdfa",
                      border: "1px solid #ccfbf1",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 9.5,
                        color: "#0f766e",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      Serial number preview
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 15,
                        color: "#115e59",
                        fontWeight: 900,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {serialPreview}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 850, mb: 1.2 }}>
                Assign profiles
              </Typography>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    select
                    label="Production profile"
                    value={form.productionProfileId}
                    onChange={update("productionProfileId")}
                  >
                    <MenuItem value="">Not assigned</MenuItem>
                    {profiles.production.map((item) => (
                      <MenuItem key={item._id} value={item._id}>
                        {item.profileName} · {item.profileCode}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    select
                    label="Firmware profile"
                    value={form.firmwareProfileId}
                    onChange={update("firmwareProfileId")}
                  >
                    <MenuItem value="">Not assigned</MenuItem>
                    {profiles.firmware.map((item) => (
                      <MenuItem key={item._id} value={item._id}>
                        {item.profileName} · v{item.profileVersion}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    select
                    label="Calibration profile"
                    value={form.calibrationProfileId}
                    onChange={update("calibrationProfileId")}
                  >
                    <MenuItem value="">Not assigned</MenuItem>
                    {profiles.calibration.map((item) => (
                      <MenuItem key={item._id} value={item._id}>
                        {item.profileName} · v{item.profileVersion}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Alert
                severity="info"
                sx={{
                  mt: 1.5,
                  borderRadius: 2,
                  fontSize: 11,
                }}
              >
                Only active profiles are shown. You can assign or change eligible Group A device profiles later.
              </Alert>
            </Box>

            <Divider />

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 850, mb: 1.2 }}>
                Manufacturing location and schedule
              </Typography>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    label="Manufacturing location"
                    value={form.manufacturingLocation}
                    onChange={update("manufacturingLocation")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    label="Area"
                    value={form.area}
                    onChange={update("area")}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    label="City"
                    value={form.city}
                    onChange={update("city")}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    label="State"
                    value={form.state}
                    onChange={update("state")}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    {...fieldProps}
                    label="Country"
                    value={form.country}
                    onChange={update("country")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    type="date"
                    label="Planned start date"
                    InputLabelProps={{ shrink: true }}
                    value={form.plannedStartDate}
                    onChange={update("plannedStartDate")}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...fieldProps}
                    type="date"
                    label="Planned completion date"
                    InputLabelProps={{ shrink: true }}
                    value={form.plannedCompletionDate}
                    onChange={update("plannedCompletionDate")}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    {...fieldProps}
                    multiline
                    minRows={2}
                    label="Internal notes"
                    value={form.notes}
                    onChange={update("notes")}
                  />
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setCreateOpen(false)}
            disabled={saving}
            sx={P3.secondaryButton}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={submitCreate}
            disabled={
              saving ||
              !form.batchNumber.trim() ||
              !form.batchName.trim() ||
              !form.hardwareRevision.trim() ||
              !form.serialNumberPrefix.trim()
            }
            sx={P3.primaryButton}
          >
            {saving ? "Creating..." : "Create batch and serials"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* BATCH DETAILS */}
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
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 17 }}>
              {selectedBatch?.batch?.batchNumber || "Batch details"}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#64748b", mt: 0.35 }}>
              {selectedBatch?.batch?.batchName || "Loading batch information..."}
            </Typography>
          </Box>
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent>
          {detailLoading ? (
            <P3Loading label="Loading batch details..." />
          ) : selectedBatch ? (
            <Stack spacing={2}>
              <Grid container spacing={1.2}>
                {[
                  ["Planned quantity", selectedBatch.batch?.plannedQuantity],
                  ["Actual quantity", selectedBatch.batch?.actualQuantity],
                  ["Hardware revision", selectedBatch.batch?.hardwareRevision],
                  ["Metering hardware", selectedBatch.batch?.meteringHardware],
                  ["Project", selectedBatch.batch?.project || "—"],
                  ["Customer", selectedBatch.batch?.customerName || "—"],
                ].map(([label, value]) => (
                  <Grid item xs={6} md={4} key={label}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.3,
                        border: "1px solid #edf0f4",
                        borderRadius: 2,
                      }}
                    >
                      <Typography sx={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 800 }}>
                        {label}
                      </Typography>
                      <Typography sx={{ mt: 0.5, fontSize: 12, fontWeight: 850 }}>
                        {value ?? "—"}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <P3SectionTitle
                title="Devices in this batch"
                subtitle={`${selectedBatch.devices?.length || 0} device records returned by the API`}
              />

              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["Factory serial", "Device ID", "Lifecycle", "Provisioning", "Calibration"].map((label) => (
                        <TableCell key={label} sx={{ fontSize: 10, color: "#94a3b8", fontWeight: 850 }}>
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedBatch.devices || []).map((device) => (
                      <TableRow key={device._id}>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800 }}>
                          {device.serialNumber}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>
                          {device.deviceId || "—"}
                        </TableCell>
                        <TableCell>
                          <P3Status value={device.manufacturingStatus} />
                        </TableCell>
                        <TableCell>
                          <P3Status value={device.provisioning?.status} />
                        </TableCell>
                        <TableCell>
                          <P3Status value={device.calibration?.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          ) : (
            <P3Empty title="Batch information unavailable" />
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailOpen(false)} sx={P3.secondaryButton}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={5500}
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