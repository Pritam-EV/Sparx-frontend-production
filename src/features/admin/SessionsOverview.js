// src/features/admin/SessionsOverview.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { apiFetch } from "../../utils/apiFetch";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { DataGrid } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const timeFmt = (v) => (v ? new Date(v).toLocaleString() : "-");

const StatusChip = ({ value }) => {
  const s = (value || "").toLowerCase();
  let color = "default";
  if (s === "active") color = "success";
  else if (s === "completed") color = "default";
  else if (s === "failed" || s === "faulty") color = "error";
  return <Chip label={value || "-"} color={color} size="small" />;
};

const SessionsOverview = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0); // zero-based UI page
  const [rowCount, setRowCount] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const pageSize = 100;

  const timerRef = useRef(null);

  const fetchData = useCallback(async (pageZeroBased = 0) => {
    try {
      const qp = new URLSearchParams({
        page: String(pageZeroBased + 1),
        limit: String(pageSize),
      });
      const data = await apiFetch(`/api/sessions/all?${qp.toString()}`);
      const list = Array.isArray(data) ? data : data.sessions || [];
      setRows(
        list.map((s) => ({
          id: s._id || s.sessionId,
          deviceId: s.deviceId,
          status: s.status,
          endTrigger: s.endTrigger ?? null,
          amountPaid: s.amountPaid ?? 0,
          amountUsed: s.amountUsed ?? 0,
          energySelected: s.energySelected ?? null,
          energyConsumed: s.energyConsumed ?? 0,
          discountApplied: s.discountApplied ?? 0,
          voltage: s.lastVoltage ?? null,
          current: s.lastCurrent ?? null,
          startTime: s.startTime ?? null,
          endTime: s.endTime ?? null,
          sessionId: s.sessionId ?? null,
          userName: s.userId?.name ?? s.userId?.email ?? s.userId?.mobile ?? "-",
          userId: s.userId?._id ?? null,
          transactionId: s.transactionId ?? null,
          lastUpdatedAt: s.lastUpdatedAt ?? null,
        }))
      );
      setRowCount(data?.total ?? list.length);
      setError("");
      setLastFetchedAt(new Date());
    } catch (e) {
      setError(e.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page);
    timerRef.current = setInterval(() => fetchData(page), 10000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [fetchData, page]);

  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));

  // default visibility (hide many columns on small screens)
  const defaultColumnVisibility = useMemo(
    () =>
      isSmDown
        ? {
            endTrigger: false,
            discountApplied: false,
            voltage: false,
            current: false,
            amountUsed: false,
            energySelected: false,
            userId: false,
            transactionId: false,
          }
        : {},
    [isSmDown]
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(defaultColumnVisibility);
  useEffect(() => setColumnVisibilityModel(defaultColumnVisibility), [defaultColumnVisibility]);

  const columns = useMemo(
    () => [
      { field: "deviceId", headerName: "DeviceId", minWidth: 120, flex: 1, headerClassName: "col-header" },
      {
        field: "status",
        headerName: "Status",
        minWidth: 100,
        flex: 0.6,
        headerClassName: "col-header",
        renderCell: (params) => <StatusChip value={params.value} />,
      },
      { field: "endTrigger", headerName: "End Trigger", minWidth: 120, flex: 0.8, headerClassName: "col-header" },
      { field: "amountPaid", headerName: "Amount Paid", type: "number", minWidth: 110, flex: 0.8, headerClassName: "col-header" },
      { field: "amountUsed", headerName: "Amount Used", type: "number", minWidth: 110, flex: 0.8, headerClassName: "col-header" },
      { field: "energySelected", headerName: "Energy Selected", type: "number", minWidth: 130, flex: 0.9, headerClassName: "col-header" },
      { field: "energyConsumed", headerName: "Energy Consumed", type: "number", minWidth: 140, flex: 0.9, headerClassName: "col-header" },
      { field: "discountApplied", headerName: "Discount Applied", type: "number", minWidth: 130, flex: 0.9, headerClassName: "col-header" },
      { field: "voltage", headerName: "Voltage", type: "number", minWidth: 100, flex: 0.6, headerClassName: "col-header" },
      { field: "current", headerName: "Current", type: "number", minWidth: 100, flex: 0.6, headerClassName: "col-header" },
      { field: "startTime", headerName: "Start Date and time", minWidth: 160, flex: 1.2, headerClassName: "col-header", valueFormatter: (p) => timeFmt(p?.value ?? null) },
      { field: "endTime", headerName: "End Date and time", minWidth: 160, flex: 1.2, headerClassName: "col-header", valueFormatter: (p) => timeFmt(p?.value ?? null) },
      { field: "sessionId", headerName: "SessionId", minWidth: 160, flex: 1, headerClassName: "col-header" },
      { field: "userName", headerName: "User Name", minWidth: 140, flex: 1, headerClassName: "col-header" },
      { field: "userId", headerName: "User Id", minWidth: 140, flex: 1, headerClassName: "col-header" },
      { field: "transactionId", headerName: "Trans action Id", minWidth: 180, flex: 1.2, headerClassName: "col-header" },
      { field: "lastUpdatedAt", headerName: "last updated at", minWidth: 160, flex: 1.2, headerClassName: "col-header", valueFormatter: (p) => timeFmt(p?.value ?? null) },
    ],
    []
  );

  // Count cards (computed from the current rows shown in the grid)
  const activeCount = useMemo(() => rows.filter((r) => (r.status || "").toLowerCase() === "active").length, [rows]);
  const completedCount = useMemo(() => rows.filter((r) => (r.status || "").toLowerCase() === "completed").length, [rows]);

  return (
    <Box sx={{ maxWidth: 1200, m: "auto", p: { xs: 0.5, sm: 2 }, pt: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Sessions Overview
      </Typography>
      {/* Summary row with two small cards and refresh/timestamp */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ py: 1, px: 2 }}>
              <Typography variant="caption" color="text.secondary">Active Session:</Typography>
              <Typography variant="h6">{activeCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ py: 1, px: 2 }}>
              <Typography variant="caption" color="text.secondary">Completed Session:</Typography>
              <Typography variant="h6">{completedCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" }, alignItems: "center", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">Last fetch: {lastFetchedAt ? lastFetchedAt.toLocaleString() : "—"}</Typography>
          <Tooltip title="Refresh now">
            <span>
              <IconButton onClick={() => { setLoading(true); fetchData(page); }} disabled={loading} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Grid>
      </Grid>

      {/* Table area */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 260px)",
          minWidth: 0,
          minHeight: 0,
        }}
      >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              width: "100%",
              overflow: "scroll",
              scrollbarGutter: "stable both-edges",
              "&::-webkit-scrollbar": { height: 10, width: 10 },
              "&::-webkit-scrollbar-thumb": { backgroundColor: "#c1c1c1", borderRadius: 6 },
              "&::-webkit-scrollbar-track": { backgroundColor: "#f1f1f1" },
            }}
          >
          {/* Mobile: show list of cards (more usable than DataGrid on very small screens) */}
          {isSmDown ? (
            <Stack spacing={1}>
              {rows.length === 0 && !loading && <Typography variant="body2">No sessions</Typography>}
              {rows.map((r) => (
                <Card key={r.id} variant="outlined">
                  <CardContent sx={{ py: 1 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={8}>
                        <Typography variant="subtitle2" noWrap>{r.deviceId || "—"}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{r.userName}</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ textAlign: "right" }}>
                        <StatusChip value={r.status} />
                        <Typography variant="caption" color="text.secondary">{r.amountPaid ? `₹ ${r.amountPaid}` : ""}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Start</Typography>
                        <Typography variant="body2">{timeFmt(r.startTime)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">End</Typography>
                        <Typography variant="body2">{timeFmt(r.endTime)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Energy</Typography>
                        <Typography variant="body2">{r.energyConsumed ?? "-"}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Session</Typography>
                        <Typography variant="body2" noWrap>{r.sessionId ?? "-"}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              density="compact"
              pageSizeOptions={[pageSize]}
              paginationModel={{ pageSize, page }}
              onPaginationModelChange={(m) => setPage(m.page)}
              rowCount={rowCount}
              paginationMode="server"
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
              getRowClassName={(params) => {
                const s = (params.row.status || "").toLowerCase();
                if (s === "active") return "row-active";
                if (s === "completed") return "row-completed";
                return "";
              }}
              sx={{
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                "& .MuiDataGrid-columnHeader": { py: 0.5, px: 1 },
                "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, fontSize: 13 },
                "& .col-header": { fontWeight: 700 },
                "& .MuiDataGrid-cell": { py: 0.5, px: 1, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                "& .row-active": { backgroundColor: "rgba(46, 125, 50, 0.10)" },
                "& .row-completed": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                "& .MuiDataGrid-virtualScroller": { overflowX: "auto", overflowY: "auto", scrollbarGutter: "stable both-edges" },
                "& .MuiDataGrid-virtualScrollerContent": { minWidth: "100%" },
                "& .MuiDataGrid-virtualScrollerRenderZone": { minHeight: "calc(100% + 1px)" },
              }}
            />
          )}
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mt: 1 }}>
          Error: {error}
        </Typography>
      )}
    </Box>
  );
};

export default SessionsOverview;
