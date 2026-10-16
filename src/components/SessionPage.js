// src/components/SessionPage.js (or src/pages/SessionPage.js)
import React, { useEffect, useMemo, useState, useRef } from "react";
import { api } from "../api";
import { CircularProgress } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import FooterNav from "../components/FooterNav";
import AppHeader from "../components/AppHeader";

// ─── Formatters & Helpers ─────────────────────────────────────────────────────
const fmtMoney = (n) => `₹${Number(n || 0).toFixed(2)}`;
const fmtKwh = (n) => `${Number(n || 0).toFixed(2)} kWh`;

const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fmtTimeOnly = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fmtDateOnly = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtEta = (estimatedEndTime) => {
  if (!estimatedEndTime) return null;
  const eta = new Date(estimatedEndTime);
  const now = new Date();
  const diffMs = eta - now;

  const timeStr = eta.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  if (diffMs <= 0) return { timeStr, remaining: "Any moment" };

  const totalMins = Math.ceil(diffMs / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const remaining = h > 0 ? `${h}h ${m}m` : `${m} min`;
  return { timeStr, remaining };
};

const getAmountUtilized = (s) => Number(s?.amountUsed ?? 0);

const getRefund = (s) => {
  const paid = Number(s?.amountPaid ?? 0);
  const utilized = getAmountUtilized(s);
  return Number(Math.max(0, paid - utilized).toFixed(2));
};

// ─── Status Pill Component ───────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const map = {
    active: { bg: "#dbfaf0", border: "#b8f2dd", color: "#008764", label: "Active" },
    completed: { bg: "#dbfaf0", border: "#b8f2dd", color: "#008764", label: "Completed" },
    stopped: { bg: "#fff3ed", border: "#ffd8c7", color: "#e06014", label: "Stopped" },
    failed: { bg: "#fff2f0", border: "#ffd4ce", color: "#d93b3b", label: "Failed" },
  };
  const cfg = map[s] || { bg: "#f3fcfb", border: "#d4f0ec", color: "#53757a", label: status || "—" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: "999px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontWeight: 750,
        fontSize: "10px",
        textTransform: "capitalize",
        letterSpacing: "0.2px",
      }}
    >
      {cfg.label}
    </span>
  );
};

// ─── Active Session Card ─────────────────────────────────────────────────────
const ActiveCard = ({ s, navigate }) => {
  const amountPaid = Number(s.amountPaid || 0);
  const amountUsed = getAmountUtilized(s);
  const refund = getRefund(s);
  const eta = fmtEta(s.estimatedEndTime);
  const progressPercent = amountPaid > 0 ? Math.min(100, Math.round((amountUsed / amountPaid) * 100)) : 0;

  return (
    <article className="sp-card sp-active-card">
      <div className="sp-card-body">
        <div className="sp-card-top">
          <div className="sp-id-block">
            <span className="sp-badge-live">
              <span className="sp-pulse-dot" />
              Charging Active
            </span>
            <h3 className="sp-device-id">{s.deviceId || "Charger Point"}</h3>
            <span className="sp-session-ref">Session: {s.sessionId || "—"}</span>
          </div>

          <button
            type="button"
            className="sp-btn-live-cta"
            onClick={() => navigate(`/live-session/${s.sessionId}`)}
          >
            <span>Live Screen</span>
            <span>→</span>
          </button>
        </div>

        {/* Dynamic Progress Indicator */}
        <div className="sp-progress-block">
          <div className="sp-progress-labels">
            <span>Delivered: <strong>{fmtKwh(s.energyConsumed)}</strong></span>
            <span>{progressPercent}% Complete</span>
          </div>
          <div className="sp-progress-bar">
            <div className="sp-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* 2-Metric Visual Tile */}
        <div className="sp-metrics-grid">
          <div className="sp-metric-cell">
            <span className="sp-cell-label">Amount Used</span>
            <strong className="sp-cell-val highlight-aqua">{fmtMoney(amountUsed)}</strong>
          </div>
          <div className="sp-metric-cell">
            <span className="sp-cell-label">Prepaid Balance</span>
            <strong className="sp-cell-val">{fmtMoney(amountPaid)}</strong>
          </div>
        </div>

        {eta && (
          <div className="sp-eta-banner">
            <span className="sp-eta-dot" />
            <span className="sp-eta-text">
              Est. Finish <strong>{eta.timeStr}</strong> ({eta.remaining})
            </span>
          </div>
        )}

        {refund > 0 && (
          <div className="sp-refund-banner">
            <span>↩ Est. Unutilized Refund:</span>
            <strong>{fmtMoney(refund)}</strong>
          </div>
        )}

        <div className="sp-time-footer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Started at {fmtDateTime(s.startTime)}</span>
        </div>
      </div>
    </article>
  );
};

// ─── Refined Past Session Card ────────────────────────────────────────────────
const PastCard = ({ s, navigate }) => {
  const refund = getRefund(s);
  const amountUtilized = getAmountUtilized(s);

  return (
    <article className="sp-card sp-past-card">
      <div className="sp-card-body">
        {/* Top Header: Device Name & Invoice Shortcut */}
        <div className="sp-card-top">
          <div className="sp-id-block">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <StatusBadge status={s.status} />
              <h3 className="sp-device-id">{s.deviceId || "Charger Point"}</h3>
            </div>
            <span className="sp-session-date-sub">{fmtDateOnly(s.startTime)}</span>
          </div>

          <button
            type="button"
            className="sp-btn-details"
            onClick={() => navigate("/session-summary", { state: { sessionId: s.sessionId } })}
          >
            <span>Tax Invoice</span>
            <span>→</span>
          </button>
        </div>

        {/* 2-Metric Cards with Micro Icons */}
        <div className="sp-metrics-grid">
          <div className="sp-metric-cell">
            <div className="sp-cell-title-row">
              <span className="sp-cell-label">Energy</span>
            </div>
            <strong className="sp-cell-val highlight-aqua">{fmtKwh(s.energyConsumed)}</strong>
          </div>

          <div className="sp-metric-cell">
            <div className="sp-cell-title-row">
              <span className="sp-cell-label">Amount billed</span>
            </div>
            <strong className="sp-cell-val highlight-orange">{fmtMoney(amountUtilized)}</strong>
          </div>
        </div>

        {/* Clean Timeline Tracker */}
        <div className="sp-journey-track">
          <div className="sp-journey-point">
            <span className="sp-journey-dot start" />
            <div className="sp-journey-meta">
              <span className="sp-journey-caption">Start Time</span>
              <span className="sp-journey-val">{fmtTimeOnly(s.startTime)}</span>
            </div>
          </div>

          <div className="sp-journey-line" />

          <div className="sp-journey-point end">
            <span className="sp-journey-dot end" />
            <div className="sp-journey-meta" style={{ textAlign: "right" }}>
              <span className="sp-journey-caption">End Time</span>
              <span className="sp-journey-val">{fmtTimeOnly(s.endTime)}</span>
            </div>
          </div>
        </div>

        {/* Refund Notification Pill */}
        {refund > 0 && (
          <div className="sp-refund-banner">
            <span>↩ Unutilized Refund:</span>
            <strong>{fmtMoney(refund)}</strong>
          </div>
        )}
      </div>
    </article>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const SessionPage = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

const fetchSessions = async () => {
  setLoading(true);

  const token = localStorage.getItem("token");

  if (!token) {
    navigate("/login");
    return;
  }

  try {
    // Fetch the minimal session data required by this page.
    const res = await api.get(
      "/api/sessions/user-sessions-summary"
    );

    const data = res.data || {};

    setActiveSessions(
      Array.isArray(data.activeSessions)
        ? data.activeSessions
        : []
    );

    setPastSessions(
      Array.isArray(data.pastSessions)
        ? data.pastSessions
        : []
    );
  } catch (err) {
    if (err.response?.status === 401) {
      navigate("/login");
    } else {
      console.error(
        "Error fetching session summary:",
        err
      );
    }
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchSessions();
  }, []);

  // Aggregated Stats
  const stats = useMemo(() => {
    const totalKwh = pastSessions.reduce((acc, s) => acc + Number(s.energyConsumed || 0), 0);
    const totalSpent = pastSessions.reduce((acc, s) => acc + getAmountUtilized(s), 0);
    return { totalKwh, totalSpent };
  }, [pastSessions]);

  // Client-Side Pagination for Past Sessions
  const totalPages = Math.max(1, Math.ceil(pastSessions.length / PAGE_SIZE));
  const paginatedPastSessions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return pastSessions.slice(start, start + PAGE_SIZE);
  }, [pastSessions, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <AppHeader />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .sp-viewport {
          width: 100%;
          min-height: calc(100dvh - 68px);
          height: calc(100dvh - 68px);
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 100% 0%, rgba(0, 229, 190, 0.08), transparent 26rem),
            radial-gradient(circle at 0% 45%, rgba(255, 130, 54, 0.05), transparent 24rem),
            #f3fbfc;
          color: #0e2e33;
          font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }

        .sp-shell {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px 16px calc(110px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* ── SUMMARY STATS CARD ── */
        .sp-summary-card {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .sp-stat-box {
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 18px;
          padding: 13px 14px;
          box-shadow: 0 4px 16px rgba(0, 160, 145, 0.04);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sp-stat-caption {
          font-size: 10.5px;
          font-weight: 750;
          color: #53757a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sp-stat-val {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #0e2e33;
          line-height: 1.15;
          margin-top: 2px;
        }
        .sp-stat-val.aqua {
          color: #008f7f;
        }
        .sp-stat-val.orange {
          color: #e06014;
        }

        /* ── PILL SWITCHER ── */
        .sp-switcher-bar {
          width: 100%;
          display: flex;
          background: #edf8f6;
          border-radius: 999px;
          padding: 4px;
          border: 1px solid #d4f2ec;
        }

        .sp-switcher-btn {
          flex: 1;
          border: none;
          background: transparent;
          padding: 9px 0;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 750;
          color: #53757a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sp-switcher-btn.active {
          background: #ffffff;
          color: #00776b;
          box-shadow: 0 3px 12px rgba(0, 160, 140, 0.14);
        }

        .sp-count-badge {
          font-size: 10.5px;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.06);
          color: #53757a;
        }
        .sp-switcher-btn.active .sp-count-badge {
          background: #e4faf6;
          color: #008f7f;
        }

        /* ── SESSION CARDS ── */
        .sp-card-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sp-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 22px;
          box-shadow: 0 4px 18px rgba(0, 160, 145, 0.06);
          overflow: hidden;
          transition: transform 0.16s ease, border-color 0.16s ease;
          box-sizing: border-box;
        }
        .sp-card:hover {
          transform: translateY(-1px);
          border-color: #b7ede4;
        }

        .sp-active-card {
          border-color: #00d2b4;
          box-shadow: 0 8px 24px rgba(0, 210, 180, 0.14);
        }

        .sp-card-body {
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sp-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .sp-id-block {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sp-badge-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 999px;
          background: #dbfaf0;
          border: 1px solid #b8f2dd;
          color: #008764;
          font-size: 11px;
          font-weight: 750;
          width: fit-content;
          margin-bottom: 2px;
        }

        .sp-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #00c98d;
          box-shadow: 0 0 0 3px rgba(0, 201, 141, 0.25);
          animation: spPulse 1.8s infinite ease-in-out;
        }

        .sp-device-id {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: #0e2e33;
          margin: 0;
          line-height: 1.25;
        }

        .sp-session-date-sub {
          font-size: 11.5px;
          color: #799ea4;
          font-weight: 600;
        }

        .sp-session-ref {
          font-size: 11px;
          color: #799ea4;
          font-family: monospace;
          letter-spacing: 0.03em;
        }

        .sp-btn-live-cta {
          padding: 8px 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, #00d2b4 0%, #00a896 100%);
          border: none;
          color: #ffffff;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 3px 12px rgba(0, 190, 165, 0.28);
          transition: all 0.16s ease;
          flex-shrink: 0;
        }
        .sp-btn-live-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(0, 190, 165, 0.38);
        }

        .sp-btn-details {
          padding: 7px 13px;
          border-radius: 12px;
          background: #f1fcf9;
          border: 1px solid #d4f2ec;
          color: #00776b;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .sp-btn-details:hover {
          background: #e1f7f3;
        }

        /* ── PROGRESS BAR ── */
        .sp-progress-block {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .sp-progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          color: #53757a;
        }
        .sp-progress-labels strong {
          color: #008f7f;
        }

        .sp-progress-bar {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: #e2f4f1;
          overflow: hidden;
        }

        .sp-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #00d2b4, #00b4c5);
          transition: width 0.4s ease;
        }

        /* ── METRICS GRID & MICRO BADGES ── */
        .sp-metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .sp-metric-cell {
          background: #f7fdfc;
          border: 1px solid #e1f5f2;
          border-radius: 14px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sp-cell-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sp-cell-label {
          font-size: 10px;
          font-weight: 750;
          color: #53757a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sp-micro-badge {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          font-size: 11px;
        }
        .sp-micro-badge.aqua {
          background: #e4faf6;
          color: #008f7f;
        }
        .sp-micro-badge.orange {
          background: #fff3ed;
          color: #e06014;
        }

        .sp-cell-val {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: #0e2e33;
          line-height: 1.2;
        }
        .sp-cell-val.highlight-aqua {
          color: #008f7f;
        }
        .sp-cell-val.highlight-orange {
          color: #e06014;
        }

        /* ── TIMELINE TRACKER ── */
        .sp-journey-track {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #fafdfc;
          border: 1px solid #ebf7f5;
          border-radius: 14px;
          position: relative;
        }

        .sp-journey-point {
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1;
        }

        .sp-journey-point.end {
          flex-direction: row-reverse;
        }

        .sp-journey-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .sp-journey-dot.start {
          background: #00d2b4;
          box-shadow: 0 0 0 3px rgba(0, 210, 180, 0.2);
        }
        .sp-journey-dot.end {
          background: #53757a;
          box-shadow: 0 0 0 3px rgba(83, 117, 122, 0.15);
        }

        .sp-journey-meta {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .sp-journey-caption {
          font-size: 9px;
          font-weight: 750;
          color: #799ea4;
          text-transform: uppercase;
        }

        .sp-journey-val {
          font-size: 11.5px;
          font-weight: 700;
          color: #0e2e33;
        }

        .sp-journey-line {
          flex: 1;
          height: 1px;
          background: repeating-linear-gradient(90deg, #d4f0ec, #d4f0ec 4px, transparent 4px, transparent 8px);
          margin: 0 10px;
        }

        /* ── ETA & REFUND BANNERS ── */
        .sp-eta-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          background: #fff8f3;
          border: 1px solid #ffe1cf;
        }

        .sp-eta-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff8236;
          box-shadow: 0 0 6px #ff8236;
          animation: spPulse 1.8s infinite ease-in-out;
          flex-shrink: 0;
        }

        .sp-eta-text {
          font-size: 11.5px;
          color: #a45318;
        }

        .sp-refund-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 12px;
          background: #dbfaf0;
          border: 1px solid #b8f2dd;
          color: #008764;
          font-size: 11.5px;
          font-weight: 700;
        }

        .sp-time-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #799ea4;
          padding-top: 4px;
        }

        /* ── PAGINATION CONTROLS ── */
        .sp-pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 4px 4px;
          margin-top: 6px;
        }

        .sp-page-info {
          font-size: 11.5px;
          color: #53757a;
          font-weight: 600;
        }

        .sp-page-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sp-btn-nav {
          padding: 7px 13px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          color: #00776b;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sp-btn-nav:hover:not(:disabled) {
          background: #edfbf8;
          border-color: #00d2b4;
        }
        .sp-btn-nav:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          background: #f7fbfb;
          color: #799ea4;
        }

        .sp-page-pill {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 800;
          border: 1px solid #d4f0ec;
          background: #ffffff;
          color: #0e2e33;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sp-page-pill.active {
          background: #00d2b4;
          border-color: #00d2b4;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 210, 180, 0.28);
        }

        /* ── EMPTY STATE ── */
        .sp-empty-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 24px;
          padding: 42px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 18px rgba(0, 160, 145, 0.04);
        }

        .sp-empty-icon {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          background: #eefbf8;
          border: 1px solid #d2f0eb;
          color: #00776b;
          display: grid;
          place-items: center;
          font-size: 24px;
          margin-bottom: 4px;
        }

        .sp-btn-empty-scan {
          margin-top: 8px;
          padding: 10px 22px;
          border-radius: 13px;
          background: linear-gradient(135deg, #00d2b4 0%, #009e8f 100%);
          border: none;
          color: #ffffff;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 190, 165, 0.28);
          transition: all 0.16s ease;
        }
        .sp-btn-empty-scan:hover {
          transform: translateY(-1px);
        }

        @keyframes spPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.9); }
        }
      `}</style>

      <div className="sp-viewport" ref={scrollContainerRef}>
        <div className="sp-shell">

          {/* ── AGGREGATE SUMMARY INSIGHTS ── */}
          <div className="sp-summary-card">
            <div className="sp-stat-box">
              <span className="sp-stat-caption">Total Energy Utilized</span>
              <div className="sp-stat-val aqua">{stats.totalKwh.toFixed(1)} kWh</div>
            </div>

            <div className="sp-stat-box">
              <span className="sp-stat-caption">Total Amount Billed</span>
              <div className="sp-stat-val orange">₹{stats.totalSpent.toFixed(1)}</div>
            </div>
          </div>

          {/* ── PILL SWITCHER TABS ── */}
          <div className="sp-switcher-bar">
            <button
              type="button"
              className={`sp-switcher-btn ${activeTab === "active" ? "active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              <span>Live Charging</span>
              <span className="sp-count-badge">{activeSessions.length}</span>
            </button>

            <button
              type="button"
              className={`sp-switcher-btn ${activeTab === "past" ? "active" : ""}`}
              onClick={() => setActiveTab("past")}
            >
              <span>Past Sessions</span>
              <span className="sp-count-badge">{pastSessions.length}</span>
            </button>
          </div>

          {/* ── SESSION CARDS LIST ── */}
          <div className="sp-card-list">
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                <CircularProgress size={32} sx={{ color: "#00d2b4" }} />
              </div>
            ) : activeTab === "active" ? (
              activeSessions.length === 0 ? (
                <div className="sp-empty-card">
                  <div className="sp-empty-icon">⚡</div>
                  <h3 style={{ fontSize: 16, fontWeight: 750, margin: "2px 0 0" }}>
                    No Active Sessions
                  </h3>
                  <p style={{ fontSize: 12.5, color: "#53757a", margin: 0, maxWidth: 260, lineHeight: 1.5 }}>
                    Your vehicle is not currently charging. Scan a QR code at any VIZ charging station to begin.
                  </p>
                  <button
                    type="button"
                    className="sp-btn-empty-scan"
                    onClick={() => navigate("/qr-scanner")}
                  >
                    Start Charging
                  </button>
                </div>
              ) : (
                activeSessions.map((s) => (
                  <ActiveCard key={s.sessionId} s={s} navigate={navigate} />
                ))
              )
            ) : pastSessions.length === 0 ? (
              <div className="sp-empty-card">
                <div className="sp-empty-icon">🕒</div>
                <h3 style={{ fontSize: 16, fontWeight: 750, margin: "2px 0 0" }}>
                  No Past Sessions
                </h3>
                <p style={{ fontSize: 12.5, color: "#53757a", margin: 0, maxWidth: 240, lineHeight: 1.5 }}>
                  Your completed charging history will appear here.
                </p>
              </div>
            ) : (
              <>
                {/* Paginated Past Sessions */}
                {paginatedPastSessions.map((s) => (
                  <PastCard key={s.sessionId} s={s} navigate={navigate} />
                ))}

                {/* Pagination Navigation Bar */}
                {totalPages > 1 && (
                  <div className="sp-pagination-bar">
                    <span className="sp-page-info">
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(currentPage * PAGE_SIZE, pastSessions.length)} of {pastSessions.length}
                    </span>

                    <div className="sp-page-buttons">
                      <button
                        type="button"
                        className="sp-btn-nav"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                      >
                        Prev
                      </button>

                      <div className="sp-page-pill active">
                        {currentPage}
                      </div>

                      <button
                        type="button"
                        className="sp-btn-nav"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      <FooterNav currentPage={location.pathname} />
    </>
  );
};

export default SessionPage;