// src/features/owner/LiveCharging.js

import React, { useCallback, useEffect, useState } from "react";
import "./LiveCharging.css";

import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import EvStationRoundedIcon from "@mui/icons-material/EvStationRounded";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import EnergySavingsLeafOutlinedIcon from "@mui/icons-material/EnergySavingsLeafOutlined";

// ------------------------------------------------------------
// FORMATTERS
// ------------------------------------------------------------

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtKwh = (n) => `${Number(n || 0).toFixed(2)} kWh`;

const fmtMoney = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ------------------------------------------------------------
// LIVE SESSION CARD (LIGHT BENTO SPECIFICATION)
// ------------------------------------------------------------

function LiveChargingCard({ session }) {
  const isRelayOn = !!session.relayOn;
  const progress = Math.min(100, Math.max(0, Math.round(session.progressPercent || 0)));

  return (
    <div className="viz-session-card-light">
      <div>
        {/* Card Header: Device ID, Plain-Text Plate, Relay Status */}
        <div className="viz-session-card-header">
          <div className="viz-session-device-block">
            <div className="viz-session-device-icon">
              <BoltRoundedIcon sx={{ fontSize: 22 }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="viz-session-title">
                {session.deviceId || "Charger"}
              </div>

              {/* Plain text vehicle number plate per specifications */}
              <div className="viz-plate-plaintext">
                {session.vehicleNumber || "Vehicle not specified"}
              </div>
            </div>
          </div>

          <span className={`viz-relay-badge ${isRelayOn ? "on" : "off"}`}>
            {isRelayOn ? "Relay ON" : "Relay OFF"}
          </span>
        </div>

        {/* Location Row */}
        <div className="viz-session-address" style={{ marginTop: 8 }}>
          <PlaceOutlinedIcon
            sx={{ fontSize: 15, color: "var(--viz-teal-deep)", flexShrink: 0 }}
          />
          <span>{session.address || "Station location not specified"}</span>
        </div>

        {/* Middle Telemetry & Circular Progress Gauge */}
        <div className="viz-session-progress-hero" style={{ marginTop: 12 }}>
          <div className="viz-progress-circle-wrap">
            {/* Background Track */}
            <CircularProgress
              variant="determinate"
              value={100}
              size={66}
              thickness={4.5}
              sx={{ color: "var(--viz-border)" }}
            />
            {/* Active Charging Arc */}
            <CircularProgress
              variant="determinate"
              value={progress}
              size={66}
              thickness={4.5}
              sx={{
                color: isRelayOn ? "var(--viz-aqua)" : "var(--viz-orange)",
                position: "absolute",
                left: 0,
                strokeLinecap: "round",
              }}
            />
            <div className="viz-progress-center-txt">
              <span className="viz-progress-val">{progress}%</span>
            </div>
          </div>

          {/* Consumed vs Target kWh breakdown */}
          <div className="viz-progress-kwh-col">
            <div className="viz-kwh-metric-row">
              <span className="viz-kwh-label">Consumed:</span>
              <span className="viz-kwh-val" style={{ color: "var(--viz-teal-deep)" }}>
                {fmtKwh(session.energyConsumed)}
              </span>
            </div>

            <div className="viz-kwh-metric-row">
              <span className="viz-kwh-label">Target Energy:</span>
              <span className="viz-kwh-val">{fmtKwh(session.energySelected)}</span>
            </div>

            <div className="viz-kwh-metric-row">
              <span className="viz-kwh-label">Billing Amount:</span>
              <span className="viz-kwh-val" style={{ color: "var(--viz-orange)" }}>
                {fmtMoney(session.amountPaid)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Strip: Start Timestamp */}
      <div className="viz-session-footer-strip">
        <div className="viz-session-subkpi">
          <span className="viz-subkpi-label">Started At</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: "var(--viz-text-main)",
              marginTop: 2,
            }}
          >
            <AccessTimeRoundedIcon sx={{ fontSize: 14, color: "var(--viz-text-subtle)" }} />
            <span>{fmtDateTime(session.startTime)}</span>
          </div>
        </div>

        <div className="viz-session-subkpi" style={{ textAlign: "right" }}>
          <span className="viz-subkpi-label">Status</span>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: isRelayOn ? "var(--viz-green-fg)" : "var(--viz-text-muted)",
              marginTop: 2,
            }}
          >
            {isRelayOn ? "⚡ Flowing Power" : "Standby / Idle"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MAIN LIVE CHARGING COMPONENT
// ------------------------------------------------------------

export default function LiveCharging() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      setErr(null);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/owner/live-charging`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setRows(data.sessions || []);
      setLastFetchedAt(new Date());
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
    const t = setInterval(fetchRows, 10000);
    return () => clearInterval(t);
  }, [fetchRows]);

  // Derived Telemetry Aggregates for Ribbon
  const totalActive = rows.length;
  const relayOnCount = rows.filter((r) => r.relayOn).length;
  const totalKwhConsumed = rows.reduce(
    (acc, cur) => acc + Number(cur.energyConsumed || 0),
    0
  );
  const totalAmountPaid = rows.reduce(
    (acc, cur) => acc + Number(cur.amountPaid || 0),
    0
  );

  return (
    <div className="viz-live-shell">
      {/* ================================================================== */}
      {/* 1. FLUSH TOP HEADER (ZERO SIDE GAPS)                             */}
      {/* ================================================================== */}
      <header className="viz-live-top-header">
        <div className="viz-live-header-inner">
          <div className="viz-live-brand-block">
            <div className="viz-live-logo-box">
             
            </div>
            <div>
              <div className="viz-live-header-title">
                VIZ-Smart Charging <span className="viz-live-cpo-tag">Live Sessions</span>
              </div>
              <div className="viz-live-header-sub">
                <span className="viz-live-pulse-dot" />
                Live 10s Polling • Last Sync:{" "}
                {lastFetchedAt
                  ? lastFetchedAt.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "—"}
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. MAIN LAYOUT CONTAINER                                           */}
      {/* ================================================================== */}
      <main className="viz-live-container">
        {/* Error Alert */}
        {err && (
          <Alert severity="error" sx={{ borderRadius: "14px", py: 0.5 }}>
            {err}
          </Alert>
        )}

        {/* Unclipped Live Telemetry Ribbon */}
        <section className="viz-live-summary-ribbon">
          <div className="viz-ribbon-title-row">
            <span className="viz-ribbon-label">
              <EvStationRoundedIcon
                sx={{ fontSize: 17, color: "var(--viz-teal-deep)" }}
              />
              Live Telemetry Aggregates
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: totalActive > 0 ? "var(--viz-green-fg)" : "var(--viz-text-muted)",
                background: totalActive > 0 ? "var(--viz-green-bg)" : "var(--viz-teal-wash)",
                padding: "2px 8px",
                borderRadius: 999,
                fontFamily: "var(--font-display)",
              }}
            >
              {totalActive} Active
            </span>
          </div>

          <div className="viz-live-stat-pills">
            <div className="viz-live-stat-pill">
              <span
                className="viz-live-stat-num"
                style={{ color: "var(--viz-teal-deep)" }}
              >
                {totalActive}
              </span>
              <span className="viz-live-stat-lbl">Active Sessions</span>
            </div>

            <div className="viz-live-stat-pill">
              <span
                className="viz-live-stat-num"
                style={{ color: "var(--viz-green-fg)" }}
              >
                {relayOnCount}
              </span>
              <span className="viz-live-stat-lbl">Relays ON</span>
            </div>

            <div className="viz-live-stat-pill">
              <span
                className="viz-live-stat-num"
                style={{ color: "var(--viz-text-main)" }}
              >
                {totalKwhConsumed.toFixed(2)}
              </span>
              <span className="viz-live-stat-lbl">Live kWh Dispensed</span>
            </div>

            <div className="viz-live-stat-pill">
              <span
                className="viz-live-stat-num"
                style={{ color: "var(--viz-orange)" }}
              >
                {fmtMoney(totalAmountPaid)}
              </span>
              <span className="viz-live-stat-lbl">Session Revenue</span>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        {loading && rows.length === 0 ? (
          <Box
            sx={{
              py: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <CircularProgress sx={{ color: "var(--viz-aqua)" }} />
            <Typography
              sx={{
                mt: 1.5,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--viz-text-muted)",
              }}
            >
              Listening for active charging telemetry…
            </Typography>
          </Box>
        ) : rows.length === 0 ? (
          <div className="viz-empty-card">
            <EvStationRoundedIcon
              sx={{ fontSize: 40, color: "var(--viz-teal-deep)" }}
            />
            <Typography
              sx={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 16,
                color: "var(--viz-text-main)",
                mt: 0.5,
              }}
            >
              No Active Sessions Running
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                color: "var(--viz-text-muted)",
                maxWidth: 380,
                mx: "auto",
              }}
            >
              When an EV driver begins charging at any of your stations, real-time
              telemetry, relay status, and kWh progress will display here automatically.
            </Typography>
          </div>
        ) : (
          <div className="viz-live-grid">
            {rows.map((s) => (
              <LiveChargingCard key={s.sessionId} session={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}