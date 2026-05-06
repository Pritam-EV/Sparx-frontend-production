import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
  Checkbox,
  ListItemText,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import BoltIcon from "@mui/icons-material/Bolt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { Popover } from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const fmtKwh = (n) => `${Number(n || 0).toFixed(2)} kWh`;
const fmtMoney = (n) => `₹${Number(n || 0).toFixed(2)}`;

const DURATION_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "6months", label: "Last 6 Months" },
  { value: "12months", label: "Last 12 Months" },
];

export default function OwnerAnalytics() {
  // Filters
  const [duration, setDuration] = useState("month");
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);

  // Tab view
  const [activeTab, setActiveTab] = useState(0); // 0: Summary, 1: Revenue, 2: Detailed

  // Data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const [anchorEl, setAnchorEl] = useState(null);
const [popoverText, setPopoverText] = useState("");

  // Fetch devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = JSON.parse(atob(token.split(".")[1]));
        const userId = decoded.userId;

        const res = await fetch(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/partner/devices/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await res.json();
        const list = Array.isArray(result.devices) ? result.devices : [];
        setAllDevices(list);

        // Select all devices by default
        setSelectedDevices(list.map((d) => d.device_id));
      } catch (e) {
        console.error("Failed to fetch devices:", e);
      }
    };
    fetchDevices();
  }, []);

  const handleOpenPopover = (event, text) => {
  setAnchorEl(event.currentTarget);
  setPopoverText(text);
};

const handleClosePopover = () => {
  setAnchorEl(null);
};

const open = Boolean(anchorEl);

  // Auto-fetch analytics when filters change
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const decoded = JSON.parse(atob(token.split(".")[1]));
      const userId = decoded.userId;

      const url = new URL(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/receipts/owner/analytics`
      );
      url.searchParams.set("userId", userId);
      url.searchParams.set("duration", duration);

      if (selectedDevices.length > 0) {
        url.searchParams.set("deviceIds", selectedDevices.join(","));
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Failed to load analytics");

      setData(result);
      setLastFetchedAt(new Date());
    } catch (e) {
      setErr(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [duration, selectedDevices]);

  // Auto-fetch on filter change
  useEffect(() => {
    if (allDevices.length > 0 && selectedDevices.length > 0) {
      fetchAnalytics();
    }
  }, [fetchAnalytics, allDevices.length, selectedDevices.length]);

  const handleDeviceChange = (event) => {
    const value = event.target.value;

    // Handle "All" selection
    if (value.includes("all")) {
      if (selectedDevices.length === allDevices.length) {
        setSelectedDevices([]);
      } else {
        setSelectedDevices(allDevices.map((d) => d.device_id));
      }
    } else {
      setSelectedDevices(value);
    }
  };

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: "rgba(0,0,0,0.9)",
            p: 1.5,
            borderRadius: 1,
            border: "1px solid #04BFBF",
          }}
        >
          <Typography
            sx={{
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              mb: 0.5,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography
              key={index}
              sx={{
                color: entry.color,
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {entry.name}: {entry.name.includes("Energy") ? fmtKwh(entry.value) : fmtMoney(entry.value)}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (loading && !data) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Card
          sx={{
            maxWidth: 360,
            width: "100%",
            borderRadius: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            background: "#fff",
            border: "1px solid #e5e7eb",
          }}
        >
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={40} thickness={4} sx={{ color: "#04BFBF", mb: 2 }} />
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: 16,
                color: "#000",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Loading Analytics...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#fff",
        p: { xs: 2, sm: 2.5, md: 3 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2.5,
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: 22, sm: 26 },
              color: "#000",
              letterSpacing: "-0.5px",
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            Analytics
          </Typography>
          <Typography
            sx={{
              color: "#64748b",
              fontSize: 12,
              fontWeight: 400,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            Revenue insights and performance metrics
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            variant="caption"
            sx={{
              color: "#94a3b8",
              fontSize: 10,
              fontWeight: 500,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {lastFetchedAt ? lastFetchedAt.toLocaleTimeString() : "—"}
          </Typography>
          <Tooltip title="Refresh" arrow>
            <IconButton
              onClick={fetchAnalytics}
              disabled={loading}
              size="small"
              sx={{
                bgcolor: "#04BFBF",
                color: "#fff",
                width: 28,
                height: 28,
                "&:hover": {
                  bgcolor: "#03a6a6",
                  transform: "rotate(180deg)",
                },
                "&:disabled": {
                  bgcolor: "#cbd5e1",
                },
                transition: "all 0.4s",
              }}
            >
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Error Message */}
      {err && (
        <Card
          sx={{
            mb: 2,
            borderRadius: 2,
            border: "1px solid #fecaca",
            background: "#fee2e2",
          }}
        >
          <CardContent sx={{ py: 1.5 }}>
            <Typography
              sx={{
                color: "#dc2626",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              ⚠️ {err}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Compact Filters */}
      <Card
        sx={{
          mb: 2.5,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          background: "#fff",
          border: "1px solid #e5e7eb",
        }}
      >
        <CardContent sx={{ p: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            {/* Duration Filter */}
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                sx={{
                  bgcolor: "#f9fafb",
                  fontSize: 13,
                  fontWeight: 500,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e5e7eb",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#04BFBF",
                  },
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Device Filter */}
            <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
              <Select
                multiple
                value={selectedDevices}
                onChange={handleDeviceChange}
                renderValue={(selected) => {
                  if (selected.length === 0) return "Select devices";
                  if (selected.length === allDevices.length) return "All Devices";
                  return `${selected.length} device${selected.length > 1 ? "s" : ""}`;
                }}
                sx={{
                  bgcolor: "#f9fafb",
                  fontSize: 13,
                  fontWeight: 500,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e5e7eb",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#04BFBF",
                  },
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                <MenuItem value="all">
                  <Checkbox
                    checked={selectedDevices.length === allDevices.length}
                    indeterminate={
                      selectedDevices.length > 0 && selectedDevices.length < allDevices.length
                    }
                    sx={{ py: 0 }}
                  />
                  <ListItemText primary="All Devices" primaryTypographyProps={{ fontSize: 13 }} />
                </MenuItem>
                {allDevices.map((d) => (
                  <MenuItem key={d.device_id} value={d.device_id}>
                    <Checkbox checked={selectedDevices.includes(d.device_id)} sx={{ py: 0 }} />
                    <ListItemText primary={d.device_id} primaryTypographyProps={{ fontSize: 13 }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card
        sx={{
          mb: 2.5,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          background: "#fff",
          border: "1px solid #e5e7eb",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              minHeight: 44,
              fontSize: 13,
              fontWeight: 600,
              textTransform: "none",
              color: "#64748b",
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              "&.Mui-selected": {
                color: "#04BFBF",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#04BFBF",
              height: 3,
            },
          }}
        >
          <Tab label="Summary" />
          <Tab label="Revenue Breakdown" />
          <Tab label="Detailed View" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {data && (
        <>
          {/* Tab 0: Summary */}
          {activeTab === 0 && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  lg: "repeat(4, 1fr)",
                },
                gap: 2,
              }}
            >
              {/* Total Energy */}
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  background: "#04BFBF",
                  border: "none",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-2px)" },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        Total Energy
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: 24,
                          color: "#fff",
                          mt: 0.5,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {fmtKwh(data.summary?.totalEnergy || 0)}
                      </Typography>
                    </Box>
                    <BoltIcon sx={{ fontSize: 32, color: "rgba(255,255,255,0.9)" }} />
                  </Stack>
                </CardContent>
              </Card>

              {/* Gross Revenue */}
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  background: "#000",
                  border: "none",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-2px)" },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.7)",
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        Total Revenue
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: 24,
                          color: "#fff",
                          mt: 0.5,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {fmtMoney(data.summary?.grossRevenue || 0)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.6)",
                          fontSize: 9,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        Inc. GST
                      </Typography>
                    </Box>
                    <AccountBalanceWalletIcon sx={{ fontSize: 32, color: "rgba(255,255,255,0.8)" }} />
                  </Stack>
                </CardContent>
              </Card>

              {/* Net Profit */}
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  background: "#fb923c",
                  border: "none",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-2px)" },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.9)",
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        Net Payout
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: 24,
                          color: "#fff",
                          mt: 0.5,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {fmtMoney(data.summary?.netProfit || 0)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: 9,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        Your Earnings
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 32, color: "rgba(255,255,255,0.9)" }} />
                  </Stack>
                </CardContent>
              </Card>

              {/* Sessions */}
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  background: "#f1f5f9",
                  border: "1px solid #e5e7eb",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-2px)" },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#64748b",
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        Sessions
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: 24,
                          color: "#000",
                          mt: 0.5,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {data.summary?.sessionsCount || 0}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#64748b",
                          fontSize: 9,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        Completed
                      </Typography>
                    </Box>
                    <ReceiptIcon sx={{ fontSize: 32, color: "#04BFBF" }} />
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Tab 1: Revenue Breakdown */}
          {activeTab === 1 && (
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                  {/* Total Revenue (Gross) */}
                  <Box
                    onClick={(e) =>
                      handleOpenPopover(
                        e,
                        "Total revenue collected from charging sessions, net of any refunds issued."
                      )
                    }
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 1.5,
                      bgcolor: "#f9fafb",
                      borderRadius: 1.5,
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "#f1f5f9" }
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#64748b",
                        fontWeight: 500,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      Total Revenue (incl. GST)
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 15,
                        color: "#000",
                        fontWeight: 700,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {fmtMoney(data.summary?.grossRevenue || 0)}
                    </Typography>
                  </Box>
                  {/* Base Revenue */}
                  <Box
                    onClick={(e) =>
                      handleOpenPopover(
                        e,
                        "Taxable value derived from total revenue before the application of GST."
                      )
                    }
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 1.5,
                      bgcolor: "#f9fafb",
                      borderRadius: 1.5,
                          cursor: "pointer",
                    "&:hover": { backgroundColor: "#f1f5f9" }
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#64748b",
                        fontWeight: 500,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      Base Revenue (ex-GST)
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 15,
                        color: "#000",
                        fontWeight: 700,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {fmtMoney(data.summary?.baseRevenue || 0)}
                    </Typography>
                  </Box>

                  {/* GST */}
                  <Box
                  onClick={(e) =>
                        handleOpenPopover(
                          e,
                          "Goods and Services Tax collected at 18% in accordance with applicable regulations."
                        )
                      }
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 1.5,
                      bgcolor: "#fef2f2",
                      borderRadius: 1.5,
                      cursor: "pointer",
                        "&:hover": { backgroundColor: "#fee2e2" }
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#dc2626",
                        fontWeight: 500,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      GST @ 18%
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 15,
                        color: "#dc2626",
                        fontWeight: 700,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      -{fmtMoney(data.summary?.gstAmount || 0)}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  {/* Platform Commission */}
                        <Box
                          onClick={(e) =>
                            handleOpenPopover(
                              e,
                              "Platform commission calculated at a fixed rate of ₹2 per kWh of energy consumed."
                            )
                          }
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: 1.5,
                            bgcolor: "#fef2f2",
                            borderRadius: 1.5,
                            cursor: "pointer",
                            "&:hover": { backgroundColor: "#fee2e2" }
                          }}
                        >
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#dc2626",
                        fontWeight: 500,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      Platform Commission
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 15,
                        color: "#dc2626",
                        fontWeight: 700,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      -{fmtMoney(data.summary?.platformCommission || 0)}
                    </Typography>
                  </Box>



                  <Divider sx={{ my: 1 }} />

                  {/* Net Profit - Highlighted */}
                  <Box
                   onClick={(e) =>
                      handleOpenPopover(
                        e,
                        "Final earnings credited to your account after deducting platform fees and other charges."
                      )
                    }
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 2,
                      bgcolor: "#fb923c",
                      borderRadius: 1.5,
                          cursor: "pointer",
                      "&:hover": { opacity: 0.95 }
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 15,
                        color: "#fff",
                        fontWeight: 700,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                     Net Payout
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 18,
                        color: "#fff",
                        fontWeight: 800,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {fmtMoney(data.summary?.netProfit || 0)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Tab 2: Detailed View with Charts */}
          {activeTab === 2 && (
            <Box>
              {data.chartData && data.chartData.length > 0 ? (
                <Stack spacing={2.5}>
                  {/* Energy Chart */}
                  <Card
                    sx={{
                      borderRadius: 2,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "#000",
                          mb: 2,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        ⚡ Energy Consumption Trend
                      </Typography>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickLine={{ stroke: "#e5e7eb" }}
                            axisLine={{ stroke: "#e5e7eb" }}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickLine={{ stroke: "#e5e7eb" }}
                            axisLine={{ stroke: "#e5e7eb" }}
                            label={{
                              value: "Energy (kWh)",
                              angle: -90,
                              position: "insideLeft",
                              style: { fontSize: 12, fill: "#64748b", fontWeight: 600 },
                            }}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Bar dataKey="energy" fill="#04BFBF" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Profit Chart */}
                  <Card
                    sx={{
                      borderRadius: 2,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "#000",
                          mb: 2,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        💰 Net Profit Trend
                      </Typography>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={data.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickLine={{ stroke: "#e5e7eb" }}
                            axisLine={{ stroke: "#e5e7eb" }}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickLine={{ stroke: "#e5e7eb" }}
                            axisLine={{ stroke: "#e5e7eb" }}
                            label={{
                              value: "Profit (₹)",
                              angle: -90,
                              position: "insideLeft",
                              style: { fontSize: 12, fill: "#64748b", fontWeight: 600 },
                            }}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="profit"
                            stroke="#fb923c"
                            strokeWidth={3}
                            dot={{ fill: "#fb923c", r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Combined Chart */}
                  <Card
                    sx={{
                      borderRadius: 2,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "#000",
                          mb: 2,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        📊 Combined Analytics
                      </Typography>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={data.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickLine={{ stroke: "#e5e7eb" }}
                            axisLine={{ stroke: "#e5e7eb" }}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickLine={{ stroke: "#e5e7eb" }}
                            axisLine={{ stroke: "#e5e7eb" }}
                            label={{
                              value: "Energy (kWh)",
                              angle: -90,
                              position: "insideLeft",
                              style: { fontSize: 11, fill: "#04BFBF", fontWeight: 600 },
                            }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickLine={{ stroke: "#e5e7eb" }}
                            axisLine={{ stroke: "#e5e7eb" }}
                            label={{
                              value: "Profit (₹)",
                              angle: 90,
                              position: "insideRight",
                              style: { fontSize: 11, fill: "#fb923c", fontWeight: 600 },
                            }}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend
                            wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                            iconType="line"
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="energy"
                            name="Total Energy"
                            stroke="#04BFBF"
                            strokeWidth={2}
                            dot={{ fill: "#04BFBF", r: 4 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="profit"
                            name="Net Profit"
                            stroke="#fb923c"
                            strokeWidth={2}
                            dot={{ fill: "#fb923c", r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Stack>
              ) : (
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 5 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        bgcolor: "#f0f9ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                      }}
                    >
                      <Typography sx={{ fontSize: 32 }}>📊</Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#000",
                        mb: 0.5,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      No Data Available
                    </Typography>
                    <Typography
                      sx={{
                        color: "#64748b",
                        fontSize: 13,
                        maxWidth: 360,
                        mx: "auto",
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      No receipts found for the selected filters
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
          <Popover
  open={open}
  anchorEl={anchorEl}
  onClose={handleClosePopover}
  anchorOrigin={{
    vertical: "top",
    horizontal: "center",
  }}
  transformOrigin={{
    vertical: "bottom",
    horizontal: "center",
  }}
  PaperProps={{
    sx: {
      p: 1.5,
      maxWidth: 260,
      borderRadius: 2,
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    },
  }}
>
  <Typography
    sx={{
      fontSize: 12,
      color: "#334155",
      fontWeight: 500,
      lineHeight: 1.4,
      fontFamily: "'Inter', sans-serif",
    }}
  >
    {popoverText}
  </Typography>
</Popover>
        </>
      )}
    </Box>
    
  );
}
