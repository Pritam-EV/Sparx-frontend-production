import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const DURATION_OPTIONS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "thisYear", label: "This Year" },
];

// Customize multiple select input sizing
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6 + ITEM_PADDING_TOP,
      width: 280,
    },
  },
};

const Analytics = () => {
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));

  // Loading and data states
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    devices: [],
    areas: [],
    cities: [],
    states: [],
    chargerTypes: [],
  });

  const [filters, setFilters] = useState({
  duration: "all",
  deviceIds: [],
  area: "all",
  city: "all",
  state: "[]",
  chargerType: "all",
  });

  const [tableRows, setTableRows] = useState([]);
  const [aggregates, setAggregates] = useState({
    totalAmountPaid: 0,
    totalAmountUtilized: 0,
    totalEnergySelected: 0,
    totalEnergyConsumed: 0,
    totalSessions: 0,
    totalChargingDuration: 0,
  });

  // Fetch filter options once on mount
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const res = await fetch('/api/analytics/filters');
        if (!res.ok) throw new Error('Failed to fetch filter options');
        const data = await res.json();
        setFilterOptions(data);
        // Default to all device ids selected
        if (data.devices) setFilters((f) => ({ ...f, deviceIds: data.devices.map(d => d._id) }));
      } catch (err) {
        console.error(err);
      }
    }
    fetchFilterOptions();
  }, []);

  // Fetch analytics data when filters change
  useEffect(() => {
    if (!filters.deviceIds.length) {
      // No devices selected means empty results
      setTableRows([]);
      setAggregates({
        totalAmountPaid: 0,
        totalAmountUtilized: 0,
        totalEnergySelected: 0,
        totalEnergyConsumed: 0,
        totalSessions: 0,
        totalChargingDuration: 0,
      });
      return;
    }

    async function fetchAnalytics() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("period", filters.duration);

        // Append deviceIds only if not all are selected
        if (filters.deviceIds.length !== filterOptions.devices.length) {
          params.append("deviceIds", filters.deviceIds.join(","));
        }

        if (filters.area && filters.area !== "all") params.append("area", filters.area);
        if (filters.city && filters.city !== "all") params.append("city", filters.city);
        if (filters.state && filters.state !== "all") params.append("state", filters.state);
        if (filters.chargerType && filters.chargerType !== "all") params.append("chargerType", filters.chargerType);

        const res = await fetch(`/api/analytics/sessions?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch analytics sessions.");

        const data = await res.json();

        const rowsWithId = (data.table || [])
          .filter(item => item !== undefined && item !== null)
          .map((item, index) => ({
            id: index,
            ...item,
          }));
        setTableRows(rowsWithId);


        // Compute aggregates
        const aggs = {
          totalAmountPaid: 0,
          totalAmountUtilized: 0,
          totalEnergySelected: 0,
          totalEnergyConsumed: 0,
          totalSessions: 0,
          totalChargingDuration: 0,
        };

        if (data.stats && Array.isArray(data.stats)) {
          data.stats.forEach((device) => {
            aggs.totalAmountPaid += device.amountPaid || 0;
            aggs.totalAmountUtilized += device.amountUtilized || 0;
            aggs.totalEnergySelected += device.energySelected || 0;
            aggs.totalEnergyConsumed += device.energyConsumed || 0;
            aggs.totalSessions += device.sessionCount || 0;
            aggs.totalChargingDuration += device.duration || 0;
          });
        }

        setAggregates(aggs);
      } catch (e) {
        console.error(e);
        setTableRows([]);
        setAggregates({
          totalAmountPaid: 0,
          totalAmountUtilized: 0,
          totalEnergySelected: 0,
          totalEnergyConsumed: 0,
          totalSessions: 0,
          totalChargingDuration: 0,
        });
      } finally {
        setLoading(false);
      }
    }

          fetchAnalytics();
        }, [filters, filterOptions.devices.length]);

        // Handler helpers
        const handleFilterChange = (key) => (event) => {
          const value = event.target.value;
          setFilters((prev) => ({
            ...prev,
            [key]: value,
          }));
        };

          // Format charging duration (in minutes) to "Xh Ym"
          const formatDuration = (minutes) => {
            if (!minutes || minutes <= 0) return "0m";
            const h = Math.floor(minutes / 60);
            const m = Math.round(minutes % 60);
            return `${h > 0 ? `${h}h ` : ""}${m}m`.trim();
          };

          return (
       <Box
       sx={{
        p: { xs: 2, sm: 4 },
        minHeight: "100vh",
        maxWidth: 1500,
        mx: "auto",
        bgcolor: "#f5f7fa",
        display: "flex",
        flexDirection: "column",
        }}
       >
        {/* Title */}
       <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", mb: 3, textAlign: "center" }}>
        Revenue Analytics Dashboard
        </Typography>

        {/* Filters */}
        <Grid
        container
        spacing={2}
        sx={{
          mb: 4,
          justifyContent: "center",
          "& .MuiFormControl-root": { minWidth: { xs: "100%", sm: 140 }, maxWidth: 300 },
        }}
        >
        <Grid item xs={12} sm="auto">
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-duration-label">Duration</InputLabel>
            <Select
              labelId="filter-duration-label"
              value={filters.duration}
              label="Duration"
              onChange={handleFilterChange("duration")}
            >
              {DURATION_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm="auto">
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-devices-label">Device(s)</InputLabel>
            <Select
              labelId="filter-devices-label"
              multiple
              value={filters.deviceIds}
              onChange={handleFilterChange("deviceIds")}
              input={<OutlinedInput label="Device(s)" />}
              renderValue={(selected) =>
                filterOptions.devices
                  .filter((d) => selected.includes(d._id))
                  .map((d) => d.device_id)
                  .join(", ")
              }
              MenuProps={MenuProps}
            >
              {filterOptions.devices.map((device) => (
                <MenuItem key={device._id} value={device._id}>
                  <Checkbox checked={filters.deviceIds.indexOf(device._id) > -1} />
                  <ListItemText primary={device.device_id} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

                  <Grid item xs={12} sm="auto">
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-area-label">Area</InputLabel>
            <Select
              labelId={`filter-area-label`}
              value={filters.area || ""}
              onChange={handleFilterChange("area")}
              label="Area"
            >
              <MenuItem value="all">All</MenuItem>
              {filterOptions.areas.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

          <Grid item xs={12} sm="auto">
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-city-label">City</InputLabel>
            <Select
              labelId={`filter-city-label`}
              value={filters.city || ""}
              onChange={handleFilterChange("city")}
              label="City"
            >
              <MenuItem value="all">All</MenuItem>
              {filterOptions.cities.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

                  <Grid item xs={12} sm="auto">
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-state-label">State</InputLabel>
            <Select
              labelId={`filter-state-label`}
              value={filters.state || ""}
              onChange={handleFilterChange("state")}
              label="State"
            >
              <MenuItem value="all">All</MenuItem>
              {filterOptions.states.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

                          <Grid item xs={12} sm="auto">
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-chargerType-label">Charger Type</InputLabel>
            <Select
              labelId={`filter-chargerType-label`}
              value={filters.chargerType || ""}
              onChange={handleFilterChange("chargerType")}
              label="chargerType"
            >
              <MenuItem value="all">All</MenuItem>
              {filterOptions.chargerTypes.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

      </Grid>

      {/* Cards: Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: "#1976d2", color: "#fff" }}>
            <CardContent>
              <Typography variant="subtitle1">Total Amount Paid (₹)</Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                ₹ {aggregates.totalAmountPaid.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: "#388e3c", color: "#fff" }}>
            <CardContent>
              <Typography variant="subtitle1">Total Amount Utilized (₹)</Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                ₹ {aggregates.totalAmountUtilized.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: "#fbc02d", color: "#000" }}>
            <CardContent>
              <Typography variant="subtitle1">Total Energy Selected (kWh)</Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {aggregates.totalEnergySelected.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: "#ff7043", color: "#fff" }}>
            <CardContent>
              <Typography variant="subtitle1">Total Energy Consumed (kWh)</Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {aggregates.totalEnergyConsumed.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: "#9c27b0", color: "#fff" }}>
            <CardContent>
              <Typography variant="subtitle1">Total Sessions</Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {aggregates.totalSessions.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: "#4dd0e1", color: "#000" }}>
            <CardContent>
              <Typography variant="subtitle1">Total Charging Duration</Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {/* Format charging duration from minutes */}
                {aggregates.totalChargingDuration > 0
                  ? (() => {
                      const h = Math.floor(aggregates.totalChargingDuration / 60);
                      const m = Math.round(aggregates.totalChargingDuration % 60);
                      return `${h}h ${m}m`;
                    })()
                  : "0m"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : tableRows.length > 0 ? (
        <Card sx={{ flexGrow: 1 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Detailed Sessions
            </Typography>
            <Box sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={tableRows}
              columns={[
                {
                  field: "date",
                  headerName: "Date",
                  flex: 1.5,
                  valueGetter: (params) =>
                    params.row.date
                      ? new Date(params.row.date).toLocaleString()
                      : "N/A",
                  sortable: true,
                },
                {
                  field: "transactionId",
                  headerName: "Transaction ID",
                  flex: 1,
                  sortable: true,
                },
                {
                  field: "userId",
                  headerName: "User ID",
                  flex: 1,
                  sortable: true,
                },
                {
                  field: "deviceId",
                  headerName: "Device ID",
                  flex: 1,
                  sortable: true,
                  // Assuming deviceId is a string field on session schema
                },
                {
                  field: "status",
                  headerName: "Status",
                  flex: 1,
                  sortable: true,
                },
                {
                  field: "amountPaid",
                  headerName: "Amount Paid (₹)",
                  flex: 1,
                  sortable: true,
                  valueFormatter: (params) =>
                    params.value ? params.value.toLocaleString() : "0",
                },
                {
                  field: "amountUtilized",
                  headerName: "Amount Utilized (₹)",
                  flex: 1,
                  sortable: true,
                  valueFormatter: (params) =>
                    params.value ? params.value.toLocaleString() : "0",
                },
                {
                  field: "energySelected",
                  headerName: "Energy Selected (kWh)",
                  flex: 1,
                  sortable: true,
                },
                {
                  field: "energyConsumed",
                  headerName: "Energy Consumed (kWh)",
                  flex: 1,
                  sortable: true,
                },
                {
                  field: "chargingDuration",
                  headerName: "Charging Duration (min)",
                  flex: 1.2,
                  valueGetter: (params) => {
                  if (!params.row) return "N/A";
                  return params.row.chargingDuration || "N/A";
                },
                sortable: true,
              },
              ]}
              pageSize={20}
              rowsPerPageOptions={[20, 50, 100]}
              disableSelectionOnClick
              density="comfortable"
              sx={{ width: "100%" }}
            />

            </Box>
          </CardContent>
        </Card>
      ) : (
        <Typography sx={{ textAlign: "center", mt: 6, fontSize: 18 }}>
          No data available for the selected filters.
        </Typography>
      )}
    </Box>
  );
};

export default Analytics;
