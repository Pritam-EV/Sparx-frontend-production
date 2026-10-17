// src/features/owner/OwnerSessions.js

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";
import "./OwnerSessions.css";

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";

// Icons
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import EvStationRoundedIcon from "@mui/icons-material/EvStationRounded";

// ------------------------------------------------------------
// DATE & FORMATTING UTILITIES
// ------------------------------------------------------------

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
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ------------------------------------------------------------
// MAIN OWNER SESSIONS COMPONENT
// ------------------------------------------------------------

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

      const result = await apiFetch(`${endpoint}?${params.toString()}`);

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

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setPage(1);
  };

  const applyPeriod = () => {
    if (!from || !to || from >= to) {
      setError("Choose a valid date range. The end date must be after the start date.");
      return;
    }
    setError("");
    setPage(1);
    setAppliedPeriod({ from, to });
  };

  return (
    <div className="viz-sessions-shell">
      {/* ================================================================== */}
      {/* 1. FLUSH TOP HEADER (ZERO GAPS ON SIDES)                           */}
      {/* ================================================================== */}
      <header className="viz-sessions-top-header">
        <div className="viz-sessions-header-inner">
          <div className="viz-sessions-brand-block">
            <div className="viz-sessions-logo-box">
              
            </div>
            <div>
              <div className="viz-sessions-header-title">
                VIZ-Smart Charging <span className="viz-sessions-cpo-tag">Session Hub</span>


          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={fetchRows}
              disabled={loading}
              className="viz-btn-icon-soft"
              title="Refresh Records"
            >
              {loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <RefreshRoundedIcon sx={{ fontSize: 19 }} />
              )}
            </button>
                          </div>
            </div>
          </div>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. MAIN CONTAINER & CONTROLS DOCK                                  */}
      {/* ================================================================== */}
      <main className="viz-sessions-container">
        {/* Tab Switcher */}
        <div className="viz-tab-bar">
          <button
            type="button"
            className={`viz-tab-btn ${isLive ? "active" : ""}`}
            onClick={() => changeTab("live")}
          >
            <BoltRoundedIcon sx={{ fontSize: 18 }} />
            <span>Live Sessions</span>
          </button>

          <button
            type="button"
            className={`viz-tab-btn ${!isLive ? "active" : ""}`}
            onClick={() => changeTab("history")}
          >
            <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />
            <span>Past Sessions</span>
          </button>
        </div>

        {/* Compact Search & Date Filter Strip */}
        <div className="viz-filter-strip">
          <div className="viz-search-box">
            <SearchRoundedIcon sx={{ color: "var(--viz-teal-deep)", fontSize: 19 }} />
            <input
              type="text"
              className="viz-search-field"
              placeholder="Search charger, vehicle plate or receipt…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <IconButton size="small" onClick={() => setSearch("")} sx={{ p: 0.2 }}>
                <CloseRoundedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
          </div>

          <div className="viz-date-controls">
            <div className="viz-date-input-group">
              <span className="viz-date-label">From</span>
              <input
                type="date"
                className="viz-native-date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="viz-date-input-group">
              <span className="viz-date-label">To</span>
              <input
                type="date"
                className="viz-native-date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <Button
              variant="contained"
              onClick={applyPeriod}
              className="viz-btn-apply"
            >
              Apply Filter
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ borderRadius: "14px", py: 0.5 }}>
            {error}
          </Alert>
        )}

        {/* ================================================================== */}
        {/* 3. CONTENT AREA: HYBRID RESPONSIVE VIEW                            */}
        {/* ================================================================== */}
        {loading && items.length === 0 ? (
          <Box sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <CircularProgress sx={{ color: "var(--viz-aqua)" }} />
            <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "var(--viz-text-muted)" }}>
              Loading {isLive ? "active session telemetry…" : "receipt ledger…"}
            </Typography>
          </Box>
        ) : items.length === 0 ? (
          <div className="viz-empty-box">
            <EvStationRoundedIcon sx={{ fontSize: 38, color: "var(--viz-teal-deep)" }} />
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, mt: 1 }}>
              {isLive ? "No Live Sessions Active" : "No Receipts Found In Period"}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "var(--viz-text-muted)", mt: 0.3, maxWidth: 350 }}>
              {isLive
                ? "Active charging sessions will populate here automatically."
                : "Try expanding your date filter range to view earlier activity."}
            </Typography>
          </div>
        ) : (
          <>
            {/* VIEW A: Mobile Bento Record Cards (< 768px) */}
            <div className="viz-mobile-records-list">
              {items.map((item) => {
                const key = item.sessionId || item.receiptId;
                const isPaused = item.status === "paused";

                return (
                  <div key={key} className="viz-record-card">
                    <div className="viz-record-card-top">
                      <div>
                        <div className="viz-record-main-id">
                          {item.deviceId || "Charger"}
                        </div>
                        <div className="viz-plain-plate-text">
                          {item.vehicleNumber || "Vehicle not specified"}
                        </div>
                      </div>

                      {isLive ? (
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            padding: "3px 9px",
                            borderRadius: 999,
                            backgroundColor: isPaused ? "var(--viz-warn-bg)" : "var(--viz-green-bg)",
                            color: isPaused ? "var(--viz-warn-fg)" : "var(--viz-green-fg)",
                          }}
                        >
                          {isPaused ? "Paused" : "Charging"}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 11,
                            fontWeight: 800,
                            color: "var(--viz-orange)",
                          }}
                        >
                          {money(item.totalAmount)}
                        </span>
                      )}
                    </div>

                    <div className="viz-record-bento-strip">
                      <div className="viz-record-mini-cell">
                        <span className="viz-record-mini-lbl">Energy</span>
                        <span className="viz-record-mini-val" style={{ color: "var(--viz-teal-deep)" }}>
                          {number(item.energyConsumed)} kWh
                        </span>
                      </div>

                      <div className="viz-record-mini-cell">
                        <span className="viz-record-mini-lbl">Model</span>
                        <span className="viz-record-mini-val">
                          {item.vehicleModel || "Standard EV"}
                        </span>
                      </div>

                      <div className="viz-record-mini-cell">
                        <span className="viz-record-mini-lbl">
                          {isLive ? "Status" : "Payout"}
                        </span>
                        <span className="viz-record-mini-val" style={{ color: isLive ? "var(--viz-text-main)" : "#7c3aed" }}>
                          {isLive ? item.status || "Active" : money(item.ownerPayout)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--viz-text-muted)" }}>
                      <AccessTimeRoundedIcon sx={{ fontSize: 13, color: "var(--viz-text-subtle)" }} />
                      <span>{dateTime(item.startTime || item.createdAt)}</span>
                      {!isLive && item.receiptId && (
                        <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 10 }}>
                          #{String(item.receiptId).slice(-6)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VIEW B: Desktop / Tablet Clean Data Table (>= 768px) */}
            <div className="viz-table-wrapper">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "var(--viz-pale-mint-tint)" }}>
                      {(isLive
                        ? [
                            "Charger",
                            "Vehicle Number",
                            "Model",
                            "Status",
                            "Start Time",
                            "Energy Dispensed",
                          ]
                        : [
                            "Receipt ID",
                            "Date",
                            "Charger",
                            "Vehicle Number",
                            "Model",
                            "Total Amount",
                            "Taxable",
                            "GST",
                            "Energy",
                            "Owner Payout",
                          ]
                      ).map((h) => (
                        <TableCell
                          key={h}
                          sx={{
                            color: "var(--viz-text-muted)",
                            fontFamily: "var(--font-display)",
                            fontWeight: 800,
                            fontSize: 11,
                            whiteSpace: "nowrap",
                            borderBottom: "1px solid var(--viz-border)",
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {items.map((item) =>
                      isLive ? (
                        <TableRow key={item.sessionId} hover>
                          <TableCell sx={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>
                            {item.deviceId || "—"}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                            {item.vehicleNumber || "—"}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{item.vehicleModel || "—"}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={item.status || "active"}
                              sx={{
                                bgcolor:
                                  item.status === "paused"
                                    ? "var(--viz-warn-bg)"
                                    : "var(--viz-green-bg)",
                                color:
                                  item.status === "paused"
                                    ? "var(--viz-warn-fg)"
                                    : "var(--viz-green-fg)",
                                fontWeight: 800,
                                fontSize: 10,
                                textTransform: "uppercase",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                            {dateTime(item.startTime)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--viz-teal-deep)" }}>
                            {number(item.energyConsumed)} kWh
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={item.receiptId} hover>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: 11 }}>
                            {item.receiptId || "—"}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                            {dateTime(item.createdAt)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>
                            {item.deviceId || "—"}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                            {item.vehicleNumber || "—"}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{item.vehicleModel || "—"}</TableCell>
                          <TableCell sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--viz-orange)" }}>
                            {money(item.totalAmount)}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{money(item.taxableAmount)}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: "var(--viz-orange-deep)" }}>
                            {money(item.gstAmount)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--viz-teal-deep)" }}>
                            {number(item.energyConsumed)} kWh
                          </TableCell>
                          <TableCell sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#7c3aed" }}>
                            {money(item.ownerPayout)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>

            {/* Pagination Controls */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid var(--viz-border)",
                borderRadius: "16px",
                bgcolor: "var(--viz-white)",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0, 160, 145, 0.05)",
              }}
            >
              <TablePagination
                component="div"
                count={total}
                page={page - 1}
                onPageChange={(_e, nextPage) => setPage(nextPage + 1)}
                rowsPerPage={limit}
                onRowsPerPageChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Rows per page"
                sx={{
                  fontFamily: "var(--font-body)",
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 600,
                  },
                }}
              />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}