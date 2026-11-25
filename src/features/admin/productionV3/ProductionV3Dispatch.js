import React, { useCallback, useEffect, useState } from "react";

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

import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  listDevices,
  dispatchDevice,
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

const emptyForm = {
  dispatchReference: "",
  recipient: "",
  destination: "",
  dispatchedAt: "",
  notes: "",
};

const fieldProps = {
  fullWidth: true,
  size: "small",
  sx: P3.field,
};

export default function ProductionV3Dispatch() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const response = await listDevices({
        page: page + 1,
        limit: pageSize,
        status: "production_ready",
      });

      setRows(unwrap(response) || []);
      setTotal(paginationOf(response).total || 0);
    } catch (loadError) {
      notify(errorMessage(loadError), "error");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDispatch = (device) => {
    setSelected(device);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const update = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const submit = async () => {
    if (!selected) return;

    setSaving(true);

    try {
      const payload = {
        dispatchReference: form.dispatchReference.trim(),
        recipient: form.recipient.trim(),
        destination: form.destination.trim(),
        dispatchedAt: form.dispatchedAt || undefined,
        notes: form.notes.trim(),
      };

      const response = await dispatchDevice(
        selected.serialNumber,
        payload
      );

      notify(
        response?.data?.message ||
          "Device dispatched successfully."
      );

      setDialogOpen(false);
      setSelected(null);
      await load();
    } catch (submitError) {
      notify(errorMessage(submitError), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !rows.length) {
    return <P3Loading label="Loading production-ready devices..." />;
  }

  return (
    <Box sx={P3.page}>
      <P3SectionTitle
        title="Ready for dispatch"
        subtitle="This queue only includes devices whose lifecycle status is production_ready."
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

      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={P3.panel}>
            <Typography sx={{ fontSize: 10.5, color: "#64748b", fontWeight: 800 }}>
              Devices ready on this query
            </Typography>
            <Typography sx={{ mt: 0.6, fontSize: 27, fontWeight: 900 }}>
              {total}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Paper elevation={0} sx={{ ...P3.panel, height: "100%" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LocalShippingRoundedIcon sx={{ color: "#0f766e" }} />
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 850 }}>
                  Dispatch control
                </Typography>
                <Typography sx={{ mt: 0.2, fontSize: 10.5, color: "#64748b" }}>
                  Dispatch changes the device lifecycle to dispatched and records its dispatch details.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={P3.panel}>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  "Factory serial",
                  "Device ID",
                  "Batch",
                  "Firmware",
                  "Calibration",
                  "Status",
                  "Action",
                ].map((label) => (
                  <TableCell
                    key={label}
                    sx={{
                      fontSize: 10,
                      color: "#94a3b8",
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
              {rows.map((device) => (
                <TableRow key={device._id} hover>
                  <TableCell sx={{ fontSize: 11.5, fontWeight: 850 }}>
                    {device.serialNumber}
                  </TableCell>
                  <TableCell sx={{ fontSize: 10.5 }}>
                    {device.deviceId || "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: 10.5 }}>
                    {device.batchId?.batchNumber || "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: 10.5 }}>
                    {device.firmwareVersion || "—"}
                  </TableCell>
                  <TableCell>
                    <P3Status value={device.calibration?.status} />
                  </TableCell>
                  <TableCell>
                    <P3Status value={device.manufacturingStatus} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<LocalShippingRoundedIcon />}
                      onClick={() => openDispatch(device)}
                      sx={{
                        ...P3.primaryButton,
                        px: 1.3,
                        py: 0.65,
                        fontSize: 10.5,
                      }}
                    >
                      Dispatch
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <P3Empty
                      title="No devices awaiting dispatch"
                      description="Devices will appear here after their calibration verification succeeds."
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

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Dispatch device
          <Typography sx={{ mt: 0.4, fontSize: 11, color: "#64748b", fontWeight: 500 }}>
            {selected?.serialNumber || ""}
          </Typography>
        </DialogTitle>

        <Divider />

        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Alert severity="success" sx={{ borderRadius: 2, fontSize: 11 }}>
              This device is Production Ready. Submitting will move it to the Dispatched lifecycle state.
            </Alert>

            <TextField
              {...fieldProps}
              label="Dispatch reference"
              value={form.dispatchReference}
              onChange={update("dispatchReference")}
              placeholder="DO / invoice / challan number"
            />

            <TextField
              {...fieldProps}
              label="Recipient"
              value={form.recipient}
              onChange={update("recipient")}
            />

            <TextField
              {...fieldProps}
              label="Destination"
              value={form.destination}
              onChange={update("destination")}
            />

            <TextField
              {...fieldProps}
              type="datetime-local"
              label="Dispatch date and time"
              InputLabelProps={{ shrink: true }}
              value={form.dispatchedAt}
              onChange={update("dispatchedAt")}
            />

            <TextField
              {...fieldProps}
              multiline
              minRows={3}
              label="Notes"
              value={form.notes}
              onChange={update("notes")}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={saving}
            sx={P3.secondaryButton}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={saving}
            sx={P3.primaryButton}
          >
            {saving ? "Recording dispatch..." : "Confirm dispatch"}
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