import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import BoltIcon from "@mui/icons-material/Bolt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

const C = {
  teal: "#04BFBF",
  tealDark: "#038a8a",
  bg: "#f5f7fa",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
  green: "#15803d",
};

const FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const nextDate = (date) => {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  return result;
};

const initialPeriod = () => {
  const today = new Date();

  return {
    from: localDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: localDate(nextDate(today)),
  };
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const number = (value, digits = 2) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function OwnerSessions({ initialTab = "live" }) {
  const initial = initialPeriod();

  const [tab, setTab] = useState(initialTab);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [appliedPeriod, setAppliedPeriod] = useState(initial);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isLive = tab === "live";

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        from: appliedPeriod.from,
        to: appliedPeriod.to,
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const endpoint = isLive
        ? "/api/owner/sessions"
        : "/api/owner/receipts";

      const result = await apiFetch(
        `${endpoint}?${params.toString()}`
      );

      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotal(Number(result?.pagination?.total || 0));
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(
        err.message ||
          `Could not load ${isLive ? "live sessions" : "receipt history"}.`
      );
    } finally {
      setLoading(false);
    }
  }, [appliedPeriod, isLive, limit, page, search]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const changeTab = (_event, nextTab) => {
    setTab(nextTab);
    setPage(1);
  };

  const applyPeriod = () => {
    if (!from || !to || from >= to) {
      setError("Choose a valid date range. The end date is exclusive.");
      return;
    }

    setError("");
    setPage(1);
    setAppliedPeriod({ from, to });
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  return (
    <Box
      sx={{
        minHeight: "100%",
        bgcolor: C.bg,
        p: { xs: 1, sm: 2, md: 3 },
        fontFamily: FONT,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 24, sm: 29 },
              color: C.text,
              fontWeight: 800,
              fontFamily: FONT,
            }}
          >
            Charging Sessions
          </Typography>

          <Typography sx={{ mt: 0.5, color: C.muted, fontSize: 13 }}>
            Live activity and receipt-based charging history.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchRows}
          disabled={loading}
          sx={{
            alignSelf: { xs: "flex-start", sm: "center" },
            borderColor: C.border,
            color: C.text,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          Refresh
        </Button>
      </Stack>

      <Card
        elevation={0}
        sx={{
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          mb: 2,
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              label="Search charger, vehicle or receipt"
              size="small"
              value={search}
              onChange={handleSearchChange}
              sx={{ minWidth: { md: 260 }, flex: 1 }}
            />

            <TextField
              label="From"
              type="date"
              size="small"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="To (exclusive)"
              type="date"
              size="small"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <Button
              variant="contained"
              onClick={applyPeriod}
              sx={{
                bgcolor: C.teal,
                color: "#042f2e",
                fontWeight: 800,
                textTransform: "none",
                "&:hover": { bgcolor: "#03aaaa" },
              }}
            >
              Apply
            </Button>
          </Stack>

          <Typography sx={{ mt: 1, fontSize: 11, color: C.muted }}>
            {isLive
              ? "Live sessions are read from current Session records."
              : "Past charging activity is read from Receipts, not completed Session records."}
          </Typography>
        </CardContent>
      </Card>

      <Card
        elevation={0}
        sx={{
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pt: 1 }}>
          <Tabs
            value={tab}
            onChange={changeTab}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                minHeight: 54,
                fontWeight: 700,
              },
              "& .Mui-selected": { color: C.tealDark },
              "& .MuiTabs-indicator": { bgcolor: C.teal },
            }}
          >
            <Tab
              value="live"
              icon={<BoltIcon />}
              iconPosition="start"
              label="Live sessions"
            />
            <Tab
              value="history"
              icon={<ReceiptLongIcon />}
              iconPosition="start"
              label="Past sessions / Receipts"
            />
          </Tabs>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mx: 2, mt: 1 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={fetchRows}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress sx={{ color: C.teal }} />
            <Typography sx={{ mt: 2, color: C.muted, fontSize: 13 }}>
              Loading {isLive ? "live sessions" : "receipt history"}…
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    {(isLive
                      ? [
                          "Charger",
                          "Vehicle number",
                          "Vehicle model",
                          "Status",
                          "Start time",
                          "Energy consumed",
                        ]
                      : [
                          "Receipt ID",
                          "Date",
                          "Charger",
                          "Vehicle number",
                          "Vehicle model",
                          "Total amount",
                          "Taxable",
                          "GST",
                          "Energy",
                          "Owner payout",
                        ]
                    ).map((heading) => (
                      <TableCell
                        key={heading}
                        sx={{
                          color: C.muted,
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
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isLive ? 6 : 10}
                        align="center"
                        sx={{ py: 5, color: C.muted }}
                      >
                        {isLive
                          ? "No live sessions found."
                          : "No receipts found for this period."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) =>
                      isLive ? (
                        <TableRow key={item.sessionId} hover>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {item.deviceId || "—"}
                          </TableCell>
                          <TableCell>{item.vehicleNumber || "—"}</TableCell>
                          <TableCell>{item.vehicleModel || "—"}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={item.status || "active"}
                              sx={{
                                bgcolor: "#dcfce7",
                                color: C.green,
                                textTransform: "capitalize",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {dateTime(item.startTime)}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {number(item.energyConsumed)} kWh
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={item.receiptId} hover>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {item.receiptId || "—"}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {dateTime(item.createdAt)}
                          </TableCell>
                          <TableCell>{item.deviceId || "—"}</TableCell>
                          <TableCell>{item.vehicleNumber || "—"}</TableCell>
                          <TableCell>{item.vehicleModel || "—"}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {money(item.totalAmount)}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {money(item.taxableAmount)}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {money(item.gstAmount)}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {number(item.energyConsumed)} kWh
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 700 }}>
                            {money(item.ownerPayout)}
                          </TableCell>
                        </TableRow>
                      )
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page - 1}
              onPageChange={(_event, nextPage) => setPage(nextPage + 1)}
              rowsPerPage={limit}
              onRowsPerPageChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Rows"
            />
          </>
        )}
      </Card>
    </Box>
  );
}