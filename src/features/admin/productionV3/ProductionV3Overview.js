import React, { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";

import {
  listBatches,
  listDevices,
  listCalibrationSessions,
} from "./productionV3Api";

import {
  P3,
  P3Metric,
  P3Status,
  P3SectionTitle,
  P3Loading,
  P3Error,
  P3Empty,
  formatRelative,
  labelize,
  unwrap,
  paginationOf,
} from "./ProductionV3Components";

const DEVICE_STATES = [
  "group_a",
  "discovered",
  "group_b",
  "calibration_required",
  "calibrating",
  "calibration_failed",
  "production_ready",
  "dispatched",
];

export default function ProductionV3Overview() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({});
  const [recentDevices, setRecentDevices] = useState([]);
  const [recentBatches, setRecentBatches] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [
        batchResponse,
        recentDeviceResponse,
        sessionResponse,
        ...stateResponses
      ] = await Promise.all([
        listBatches({ page: 1, limit: 5 }),
        listDevices({ page: 1, limit: 8 }),
        listCalibrationSessions({ page: 1, limit: 5 }),
        ...DEVICE_STATES.map((status) =>
          listDevices({ page: 1, limit: 1, status })
        ),
      ]);

      const batchRows = unwrap(batchResponse) || [];
      const deviceRows = unwrap(recentDeviceResponse) || [];
      const sessions = unwrap(sessionResponse) || [];

      const totals = {
        batches: paginationOf(batchResponse).total ?? batchRows.length,
        devices: paginationOf(recentDeviceResponse).total ?? 0,
      };

      DEVICE_STATES.forEach((status, index) => {
        totals[status] =
          paginationOf(stateResponses[index]).total ?? 0;
      });

      setStats(totals);
      setRecentBatches(batchRows);
      setRecentDevices(deviceRows);
      setActiveSessions(
        sessions.filter((session) =>
          ["in_progress", "applying", "awaiting_verification"].includes(
            session.status
          )
        )
      );
    } catch (loadError) {
      setError(
        loadError?.response?.data?.message ||
          loadError.message ||
          "Unable to load Production 3.0 overview."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <P3Loading />;

  return (
    <Box sx={P3.page}>
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
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 850,
              color: "#172033",
            }}
          >
            Production pulse
          </Typography>
          <Typography
            sx={{
              mt: 0.35,
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            Live lifecycle counts from the Production 3.0 registry.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => load(true)}
          disabled={refreshing}
          sx={P3.secondaryButton}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </Stack>

      <P3Error error={error} />

      <Grid container spacing={1.5}>
        <Grid item xs={6} sm={4} lg={3}>
          <P3Metric
            label="Manufacturing batches"
            value={stats.batches}
            icon={<Inventory2RoundedIcon />}
            caption="Total registered batches"
          />
        </Grid>

        <Grid item xs={6} sm={4} lg={3}>
          <P3Metric
            label="Group A"
            value={stats.group_a}
            icon={<MemoryRoundedIcon />}
            accent="#64748b"
            caption="Awaiting discovery / promotion"
          />
        </Grid>

        <Grid item xs={6} sm={4} lg={3}>
          <P3Metric
            label="Discovered"
            value={stats.discovered}
            icon={<WifiRoundedIcon />}
            accent="#2563eb"
            caption="Seen on factory identity"
          />
        </Grid>

        <Grid item xs={6} sm={4} lg={3}>
          <P3Metric
            label="Group B"
            value={stats.group_b}
            icon={<MemoryRoundedIcon />}
            accent="#d97706"
            caption="Provisioned lifecycle group"
          />
        </Grid>

        <Grid item xs={6} sm={4} lg={3}>
          <P3Metric
            label="Calibration required"
            value={stats.calibration_required}
            icon={<PrecisionManufacturingRoundedIcon />}
            accent="#d97706"
            caption="Waiting for calibration"
          />
        </Grid>

        <Grid item xs={6} sm={4} lg={3}>
          <P3Metric
            label="Calibrating"
            value={stats.calibrating}
            icon={<PrecisionManufacturingRoundedIcon />}
            accent="#7c3aed"
            caption="Active calibration work"
          />
        </Grid>

        <Grid item xs={6} sm={4} lg={3}>
          <P3Metric
            label="Calibration failed"
            value={stats.calibration_failed}
            icon={<ErrorOutlineRoundedIcon />}
            accent="#dc2626"
            caption="Requires rework"
          />
        </Grid>

        <Grid item xs={6} sm={4} lg={3}>
          <P3Metric
            label="Production ready"
            value={stats.production_ready}
            icon={<CheckCircleRoundedIcon />}
            accent="#16a34a"
            caption="Passed calibration"
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={7}>
          <Paper elevation={0} sx={P3.panel}>
            <P3SectionTitle
              title="Recent devices"
              subtitle="Latest registered devices and their current lifecycle states."
            />

            <Box sx={{ overflowX: "auto", mt: 1.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["Factory serial", "Device ID", "Lifecycle", "Last seen"].map(
                      (heading) => (
                        <TableCell
                          key={heading}
                          sx={{
                            color: "#94a3b8",
                            fontSize: 10,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {heading}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {recentDevices.map((device) => (
                    <TableRow key={device._id || device.serialNumber}>
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography
                          sx={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: "#172033",
                          }}
                        >
                          {device.serialNumber}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ fontSize: 11 }}>
                        {device.deviceId || "—"}
                      </TableCell>

                      <TableCell>
                        <P3Status value={device.manufacturingStatus} />
                      </TableCell>

                      <TableCell
                        sx={{
                          fontSize: 10.5,
                          color: "#64748b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatRelative(device.discovery?.lastSeenAt)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {!recentDevices.length ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <P3Empty
                          title="No devices registered"
                          description="Create a manufacturing batch to generate Group A serial records."
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper elevation={0} sx={P3.panel}>
            <P3SectionTitle
              title="Calibration queue"
              subtitle="Sessions currently in progress or awaiting a device response."
            />

            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {activeSessions.map((session) => (
                <Box
                  key={session._id}
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
                      mt: 0.6,
                      fontSize: 10.5,
                      color: "#64748b",
                    }}
                  >
                    {session.sessionNumber || session._id}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.35,
                      fontSize: 10,
                      color: "#94a3b8",
                    }}
                  >
                    Operator: {session.operatorName || session.operatorId || "—"}
                  </Typography>
                </Box>
              ))}

              {!activeSessions.length ? (
                <P3Empty
                  title="Calibration queue is clear"
                  description="New calibration sessions will appear here."
                />
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={P3.panel}>
        <P3SectionTitle
          title="Recent batches"
          subtitle="Latest manufacturing batches created in the system."
        />

        <Box sx={{ overflowX: "auto", mt: 1.25 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  "Batch number",
                  "Batch name",
                  "Project",
                  "Planned",
                  "Actual",
                  "Status",
                ].map((heading) => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      color: "#94a3b8",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {recentBatches.map((batch) => (
                <TableRow key={batch._id}>
                  <TableCell sx={{ fontSize: 11.5, fontWeight: 800 }}>
                    {batch.batchNumber}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>
                    {batch.batchName}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>
                    {batch.project || "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>
                    {batch.plannedQuantity}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>
                    {batch.actualQuantity}
                  </TableCell>
                  <TableCell>
                    <P3Status value={batch.status} />
                  </TableCell>
                </TableRow>
              ))}

              {!recentBatches.length ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <P3Empty title="No batches created yet" />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Alert
        severity="info"
        sx={{
          borderRadius: 2.5,
          fontSize: 11,
        }}
      >
        Production 3.0 data is isolated from the legacy production module.
        These counts are read from the new Production 3.0 API.
      </Alert>
    </Box>
  );
}