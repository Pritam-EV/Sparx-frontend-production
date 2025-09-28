// src/features/admin/ReceiptsOverview.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { apiFetch } from "../../utils/apiFetch";
import {
  Box, Typography, Card, CardContent, Grid, Stack, IconButton, Tooltip, Autocomplete, TextField, Button
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { DataGrid } from "@mui/x-data-grid";

const timeFmt = (v) => (v ? new Date(v).toLocaleString() : "-");
const fmt0 = (v) =>
  Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const ReceiptsOverview = () => {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    totalReceipts: 0,
    totalAmountPaid: 0,
    totalAmountUtilized: 0,
    totalAmountSelected: 0,
    totalDiscountApplied: 0,
    totalRefunds: 0,
    totalEnergySelected: 0,
    totalEnergyConsumed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0); // zero-based
  const [rowCount, setRowCount] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const pageSize = 100;
  const timerRef = useRef(null);
  const [deviceOptions, setDeviceOptions] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);

// Load devices once (device_id list)
useEffect(() => {
  (async () => {
    try {
      const devs = await apiFetch("/api/devices");
      const arr = Array.isArray(devs) ? devs : devs.devices || [];
      const ids = [...new Set(arr.map(d => d.device_id).filter(Boolean))];
      setDeviceOptions(ids);
    } catch (e) {
      // non-blocking; ignore
    }
  })();
}, []);

  const fetchData = useCallback(async (pageZeroBased = 0) => {
    try {
      const qp = new URLSearchParams({
        page: String(pageZeroBased + 1),
        limit: String(pageSize),
      });
          if (selectedDevices.length) {
      qp.set("deviceIds", selectedDevices.join(","));
    }
      const data = await apiFetch(`/api/receipts/all?${qp.toString()}`);
      const list = Array.isArray(data) ? data : data.receipts || [];
      setRows(list.map((r) => ({
        id: r._id || r.receiptId,
        deviceId: r.deviceId,
        amountPaid: r.amountPaid ?? 0,
        amountUtilized: r.amountUtilized ?? 0,
        amountSelected: r.amountSelected ?? 0,
        discountApplied: r.discountApplied ?? 0,
        refund: r.refund ?? 0,
        energySelected: r.energySelected ?? 0,
        energyConsumed: r.energyConsumed ?? 0,
        receiptId: r.receiptId ?? "-",
        userId: r.userId?._id || r.userId || "-",
        sessionId: r.sessionId ?? "-",
        createdAt: r.createdAt ?? null,
      })));
      setRowCount(data?.total ?? list.length);
      setTotals({
        totalReceipts: data?.totals?.totalReceipts ?? list.length,
        totalAmountPaid: data?.totals?.totalAmountPaid ?? 0,
        totalAmountUtilized: data?.totals?.totalAmountUtilized ?? 0,
        totalAmountSelected: data?.totals?.totalAmountSelected ?? 0,
        totalDiscountApplied: data?.totals?.totalDiscountApplied ?? 0,
        totalRefunds: data?.totals?.totalRefunds ?? 0,
        totalEnergySelected: data?.totals?.totalEnergySelected ?? 0,
        totalEnergyConsumed: data?.totals?.totalEnergyConsumed ?? 0,
      });
      setError("");
      setLastFetchedAt(new Date());
    } catch (e) {
      setError(e.message || "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, [selectedDevices]);

  useEffect(() => {
    fetchData(page);
    timerRef.current = setInterval(() => fetchData(page), 10000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [fetchData, page]);

  const columns = useMemo(() => [
    { field: "deviceId", headerName: "DeviceId", maxWidth: 120, flex: 1, headerClassName: "col-header" },
    { field: "amountPaid", headerName: "Amount Paid", type: "number", maxWidth: 120, flex: 0.9, headerClassName: "col-header" },
    { field: "amountUtilized", headerName: "Amount Utilized", type: "number", maxWidth: 120, flex: 1, headerClassName: "col-header" },
    { field: "amountSelected", headerName: "Amount Selected", type: "number", maxWidth: 120, flex: 1, headerClassName: "col-header" },
    { field: "discountApplied", headerName: "Discount", type: "number", maxWidth: 110, flex: 0.8, headerClassName: "col-header" },
    { field: "refund", headerName: "Refund", type: "number", maxWidth: 110, flex: 0.7, headerClassName: "col-header" },
    { field: "energySelected", headerName: "Energy Selected", type: "number", maxWidth: 120, flex: 1, headerClassName: "col-header" },
    { field: "energyConsumed", headerName: "Energy Consumed", type: "number", maxWidth: 120, flex: 1, headerClassName: "col-header" },
    { field: "receiptId", headerName: "Receipt Id", maxWidth: 170, flex: 1, headerClassName: "col-header" },
    { field: "userId", headerName: "User Id", maxWidth: 160, flex: 1, headerClassName: "col-header" },
    { field: "sessionId", headerName: "Session Id", maxWidth: 170, flex: 1, headerClassName: "col-header" },
    {
      field: "createdAt",
      headerName: "Created At",
      maxWidth: 120,
      flex: 1,
      headerClassName: "col-header",
      valueFormatter: (p) => (p?.value ? timeFmt(p.value) : "-"),
    },
  ], []);

  return (
     <Box sx={{ maxWidth: 1200, m: "auto", p: { xs: 0.5, sm: 2 }, pt: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Receipts Overview
      </Typography>
      {/* Summary + refresh */}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={9}>
        <Grid item xs={12} md={3} sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" }, alignItems: "center", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last fetch: {lastFetchedAt ? lastFetchedAt.toLocaleString() : "—"}
          </Typography>
          <Tooltip title="Refresh now">
            <span>
              <IconButton
                onClick={() => { setLoading(true); fetchData(page); }}
                disabled={loading}
                color="primary"
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Grid>
        <Card elevation={2}>
          <CardContent sx={{ py: 1, px: 2 }}>
            <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap" alignItems="center">
              <Stack sx={{ minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">Total receipts:</Typography>
                <Typography variant="h6" sx={{ color: "#6b7280", fontWeight: 700 }}>
                  {fmt0(totals.totalReceipts)}
                </Typography>
              </Stack>
              <Stack sx={{ minWidth: 180 }}>
                <Typography variant="caption" color="text.secondary">Total Amount paid:</Typography>
                <Typography variant="h6" sx={{ color: "#2e7d32", fontWeight: 700 }}>
                  ₹{fmt0(totals.totalAmountPaid)}
                </Typography>
              </Stack>
              <Stack sx={{ minWidth: 180 }}>
                <Typography variant="caption" color="text.secondary">Total amount utilized:</Typography>
                <Typography variant="h6" sx={{ color: "#ed6c02", fontWeight: 700 }}>
                   ₹{fmt0(totals.totalAmountUtilized)}
                </Typography>
              </Stack>
              <Stack sx={{ minWidth: 180 }}>
                <Typography variant="caption" color="text.secondary">Total amount selected:</Typography>
                <Typography variant="h6" sx={{ color: "#1976d2", fontWeight: 700 }}>
                  ₹{fmt0(totals.totalAmountSelected)}
                </Typography>
              </Stack>
              <Stack sx={{ minWidth: 180 }}>
                <Typography variant="caption" color="text.secondary">Total discount applied:</Typography>
                <Typography variant="h6" sx={{ color: "#d4af37", fontWeight: 700 }}>
                  ₹{fmt0(totals.totalDiscountApplied)}
                </Typography>
              </Stack>
              <Stack sx={{ minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">Total refunds:</Typography>
                <Typography variant="h6" sx={{ color: "#b91c1c", fontWeight: 700 }}>
                  ₹{fmt0(totals.totalRefunds)}
                </Typography>
              </Stack>
              <Stack sx={{ minWidth: 180 }}>
                <Typography variant="caption" color="text.secondary">Total energy selected:</Typography>
                <Typography variant="h6" sx={{ color: "#1976d2", fontWeight: 700 }}>
                 {fmt0(totals.totalEnergySelected)} kWh
                </Typography>
              </Stack>
              <Stack sx={{ minWidth: 180 }}>
                <Typography variant="caption" color="text.secondary">Total energy consumed:</Typography>
                <Typography variant="h6" sx={{ color: "#2e7d32", fontWeight: 700 }}>
                   {fmt0(totals.totalEnergyConsumed)} kWh
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        </Grid>

                <Card elevation={1} sx={{ mb: 1 }}>
          <CardContent sx={{ py: 1, px: 2 }}>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center">
              <Autocomplete
                multiple
                size="small"
                options={deviceOptions}
                value={selectedDevices}
                onChange={(_, val) => setSelectedDevices(val)}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by DeviceId" placeholder="Select devices" />
                )}
                sx={{ minWidth: 320 }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => { setSelectedDevices([]); }}
              >
                Clear
              </Button>
            </Stack>
          </CardContent>
        </Card>
        
      </Grid>

      {/* Scrollable table at normal zoom */}
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
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            density="compact"
            pageSizeOptions={[100]}
            paginationModel={{ pageSize, page }}
            onPaginationModelChange={(m) => setPage(m.page)}
            rowCount={rowCount}
            paginationMode="server"
            sx={{
              "& .MuiDataGrid-columnHeader": { py: 0.5, px: 1 },
              "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, fontSize: 13 },
              "& .col-header": { fontWeight: 700 },
              "& .MuiDataGrid-cell": { py: 0.5, px: 1, lineHeight: 1.2 },
              "& .MuiDataGrid-virtualScroller": {
                overflowX: "scroll",
                overflowY: "scroll",
                scrollbarGutter: "stable both-edges",
              },
              "& .MuiDataGrid-virtualScrollerContent": {
                minWidth: "calc(100% + 1px)",
              },
              "& .MuiDataGrid-virtualScrollerRenderZone": {
                minHeight: "calc(100% + 1px)",
              },
            }}
          />
        </Box>
      </Box>

      {error && <Typography color="error">Error: {error}</Typography>}
    </Box>
  );
};

export default ReceiptsOverview;
