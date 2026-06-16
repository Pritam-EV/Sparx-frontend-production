import React, { useEffect, useState, useCallback, useRef } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import BoltIcon from "@mui/icons-material/Bolt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaymentsIcon from "@mui/icons-material/Payments";
import EvStationIcon from "@mui/icons-material/EvStation";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { api } from "../../api";

// ─── Styles injected once ─────────────────────────────────────────────────────
const STYLE = `
  @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap');

  .an-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif; }

  /* ── Tokens ── */
  .an-root {
    --c-bg:        #f5f6fa;
    --c-surface:   #ffffff;
    --c-border:    rgba(0,0,0,0.07);
    --c-border-md: rgba(0,0,0,0.10);
    --c-text:      #111827;
    --c-muted:     #6b7280;
    --c-faint:     #9ca3af;

    --c-blue:      #2563eb;
    --c-blue-soft: #eff6ff;
    --c-blue-mid:  #dbeafe;
    --c-green:     #16a34a;
    --c-green-soft:#f0fdf4;
    --c-orange:    #d97706;
    --c-orange-soft:#fffbeb;
    --c-purple:    #7c3aed;
    --c-purple-soft:#f5f3ff;
    --c-red:       #dc2626;
    --c-red-soft:  #fef2f2;
    --c-teal:      #0d9488;
    --c-teal-soft: #f0fdfa;
    --c-indigo:    #4338ca;

    --radius-card: 14px;
    --radius-sm:   8px;
    --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-hover: 0 6px 24px rgba(0,0,0,0.09);
    --transition: 180ms cubic-bezier(0.16,1,0.3,1);
  }

  /* ── Layout ── */
  .an-root { background: var(--c-bg); min-height: 100vh; padding: 28px 32px; }
  @media (max-width: 768px) { .an-root { padding: 16px; } }

  /* ── Header ── */
  .an-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
  .an-title { font-size: 22px; font-weight: 700; color: var(--c-text); letter-spacing: -0.3px; line-height: 1.2; }
  .an-subtitle { font-size: 12px; color: var(--c-faint); margin-top: 3px; font-weight: 500; }
  .an-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  /* ── Custom Select ── */
  .an-select-wrap { position: relative; }
  .an-select-wrap select {
    appearance: none; background: var(--c-surface); border: 1px solid var(--c-border-md);
    border-radius: var(--radius-sm); padding: 7px 32px 7px 12px; font-size: 13px;
    font-weight: 600; color: var(--c-text); cursor: pointer;
    transition: border-color var(--transition), box-shadow var(--transition);
    outline: none; font-family: inherit;
  }
  .an-select-wrap select:hover { border-color: rgba(0,0,0,0.2); }
  .an-select-wrap select:focus { border-color: var(--c-blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
  .an-select-arrow { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--c-muted); font-size: 16px !important; }

  /* ── Refresh button ── */
  .an-refresh-btn {
    display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;
    border-radius: var(--radius-sm); border: 1px solid var(--c-border-md); background: var(--c-surface);
    cursor: pointer; color: var(--c-muted); transition: all var(--transition);
  }
  .an-refresh-btn:hover { border-color: var(--c-blue); color: var(--c-blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.10); }
  .an-refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .an-refresh-btn svg { font-size: 17px !important; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .an-spin { animation: spin 0.8s linear infinite; }

  /* ── Period chips ── */
  .an-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 24px; }
  .an-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600;
    letter-spacing: 0.2px;
  }
  .an-chip-blue  { background: var(--c-blue-mid);   color: var(--c-blue);   }
  .an-chip-purple{ background: #ede9fe;              color: var(--c-purple); }
  .an-chip-green { background: #dcfce7;              color: var(--c-green);  }

  /* ── Section headers ── */
  .an-section-head {
    display: flex; align-items: center; gap: 8px; margin-bottom: 12px; margin-top: 4px;
  }
  .an-section-label {
    font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
    color: var(--c-muted);
  }
  .an-section-line { flex: 1; height: 1px; background: var(--c-border); }

  /* ── Grid ── */
  .an-grid { display: grid; gap: 14px; margin-bottom: 28px; }
  .an-grid-2 { grid-template-columns: repeat(2, 1fr); }
  .an-grid-3 { grid-template-columns: repeat(3, 1fr); }
  .an-grid-4 { grid-template-columns: repeat(4, 1fr); }
  .an-grid-2-2 { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 1100px) { .an-grid-4 { grid-template-columns: repeat(2, 1fr); } .an-grid-3 { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px) { .an-grid-4, .an-grid-3, .an-grid-2, .an-grid-2-2 { grid-template-columns: 1fr; } }

  /* ── KPI Card ── */
  .an-kpi {
    background: var(--c-surface); border-radius: var(--radius-card);
    border: 1px solid var(--c-border); padding: 20px;
    box-shadow: var(--shadow-card);
    transition: box-shadow var(--transition), transform var(--transition);
    position: relative; overflow: hidden;
  }
  .an-kpi:hover { box-shadow: var(--shadow-hover); transform: translateY(-1px); }
  .an-kpi-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .an-kpi-icon {
    width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .an-kpi-icon svg { font-size: 20px !important; }
  .an-kpi-label { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--c-muted); margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
  .an-kpi-value { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.1; color: var(--c-text); font-variant-numeric: tabular-nums; }
  .an-kpi-sub { font-size: 11.5px; color: var(--c-faint); margin-top: 6px; font-weight: 500; line-height: 1.4; }
  .an-kpi-accent-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; border-radius: 0 0 var(--radius-card) var(--radius-card); }
  .an-live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c-green); display: inline-block; margin-right: 4px; }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.7)} }
  .an-live-dot { animation: pulse-dot 1.6s ease-in-out infinite; }

  /* ── Detail Card ── */
  .an-detail-card {
    background: var(--c-surface); border-radius: var(--radius-card);
    border: 1px solid var(--c-border); padding: 22px 24px;
    box-shadow: var(--shadow-card);
  }
  .an-detail-head { display: flex; align-items: center; gap: 9px; margin-bottom: 18px; }
  .an-detail-head-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .an-detail-head-icon svg { font-size: 17px !important; }
  .an-detail-title { font-size: 14px; font-weight: 700; color: var(--c-text); }
  .an-detail-subtitle { font-size: 11px; color: var(--c-faint); margin-top: 1px; font-weight: 500; }

  /* ── Finance rows ── */
  .an-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0; gap: 12px;
    border-bottom: 1px solid rgba(0,0,0,0.045);
  }
  .an-row:last-child { border-bottom: none; }
  .an-row-highlight {
    margin: 2px -6px; padding: 10px 6px; border-radius: 8px;
    border-bottom: none !important; background: rgba(0,0,0,0.025);
  }
  .an-row-indent { padding-left: 20px; }
  .an-row-label { font-size: 13px; font-weight: 500; color: #374151; display: flex; align-items: center; gap: 5px; line-height: 1.3; }
  .an-row-label-bold { font-weight: 700; color: var(--c-text); }
  .an-row-value { font-size: 13px; font-weight: 700; color: var(--c-text); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .an-info-icon { font-size: 13px !important; color: var(--c-faint); cursor: help; flex-shrink: 0; transition: color var(--transition); }
  .an-info-icon:hover { color: var(--c-muted); }
  .an-indent-marker { width: 12px; height: 1.5px; background: #d1d5db; border-radius: 2px; flex-shrink: 0; }

  /* ── Divider ── */
  .an-divider { height: 1px; background: var(--c-border); margin: 6px 0; }
  .an-divider-dashed { background: repeating-linear-gradient(90deg,var(--c-border) 0,var(--c-border) 6px,transparent 6px,transparent 12px); }

  /* ── Tooltip ── */
  .an-tooltip-wrap { position: relative; display: inline-flex; }
  .an-tooltip-box {
    position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
    background: #1f2937; color: #f9fafb; font-size: 11.5px; font-weight: 500;
    padding: 7px 10px; border-radius: 7px; white-space: nowrap; max-width: 260px;
    white-space: normal; text-align: center; line-height: 1.4; z-index: 999;
    pointer-events: none; opacity: 0; transition: opacity 150ms;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .an-tooltip-box::after {
    content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    border: 5px solid transparent; border-top-color: #1f2937;
  }
  .an-tooltip-wrap:hover .an-tooltip-box { opacity: 1; }

  /* ── Loading skeleton ── */
  @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  .an-skeleton {
    background: linear-gradient(90deg,#f0f0f0 25%,#fafafa 50%,#f0f0f0 75%);
    background-size: 400px 100%; animation: shimmer 1.4s ease-in-out infinite;
    border-radius: 6px;
  }

  /* ── Error state ── */
  .an-error { text-align: center; padding: 64px 32px; color: var(--c-muted); }
  .an-error-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.3; }
  .an-error-msg { font-size: 14px; font-weight: 500; margin-bottom: 16px; }
  .an-retry-btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px;
    background: var(--c-blue); color: white; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: inherit;
    transition: background var(--transition);
  }
  .an-retry-btn:hover { background: #1d4ed8; }

  /* ── Total row ── */
  .an-total-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 10px; margin-top: 6px; border-radius: 9px;
  }
  .an-total-label { font-size: 13px; font-weight: 700; }
  .an-total-value { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  typeof n === "number"
    ? "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "₹ 0.00";

const fmtKwh = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " kWh"
    : "0.000 kWh";

const fmtNum = (n) => (typeof n === "number" ? n.toLocaleString("en-IN") : "0");

const DURATION_OPTIONS = [
  { value: "all",         label: "All Time" },
  { value: "today",       label: "Today" },
  { value: "thisMonth",   label: "This Month" },
  { value: "lastMonth",   label: "Last Month" },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "thisYear",    label: "This Year" },
];

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const Tip = ({ text }) =>
  text ? (
    <span className="an-tooltip-wrap">
      <InfoOutlinedIcon className="an-info-icon" />
      <span className="an-tooltip-box">{text}</span>
    </span>
  ) : null;

// ─── Custom Select ────────────────────────────────────────────────────────────
const AnSelect = ({ label, value, onChange, children }) => (
  <div className="an-select-wrap" title={label}>
    <select value={value} onChange={onChange} aria-label={label}>
      {children}
    </select>
    <KeyboardArrowDownIcon className="an-select-arrow" />
  </div>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon, iconBg, iconColor, accentColor, tooltip, sub, live }) => (
  <div className="an-kpi">
    <div className="an-kpi-top">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="an-kpi-label">
          {live && <span className="an-live-dot" />}
          {label}
          <Tip text={tooltip} />
        </div>
        <div className="an-kpi-value" style={{ color: iconColor }}>{value}</div>
        {sub && <div className="an-kpi-sub">{sub}</div>}
      </div>
      <div className="an-kpi-icon" style={{ background: iconBg }}>
        {React.cloneElement(icon, { style: { color: iconColor, fontSize: 20 } })}
      </div>
    </div>
    {accentColor && <div className="an-kpi-accent-bar" style={{ background: accentColor }} />}
  </div>
);

// ─── Finance Row ──────────────────────────────────────────────────────────────
const FRow = ({ label, value, tooltip, highlight, indent, color, bold }) => (
  <div className={`an-row${highlight ? " an-row-highlight" : ""}${indent ? " an-row-indent" : ""}`}>
    <div className={`an-row-label${bold ? " an-row-label-bold" : ""}`}>
      {indent && <span className="an-indent-marker" />}
      <span>{label}</span>
      <Tip text={tooltip} />
    </div>
    <div className="an-row-value" style={{ color: color || undefined }}>{value}</div>
  </div>
);

// ─── Skeleton KPI ─────────────────────────────────────────────────────────────
const SkeletonKpi = () => (
  <div className="an-kpi" style={{ pointerEvents: "none" }}>
    <div className="an-kpi-top">
      <div style={{ flex: 1 }}>
        <div className="an-skeleton" style={{ height: 10, width: "55%", marginBottom: 10 }} />
        <div className="an-skeleton" style={{ height: 28, width: "70%", marginBottom: 8 }} />
        <div className="an-skeleton" style={{ height: 9,  width: "80%" }} />
      </div>
      <div className="an-skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHead = ({ label }) => (
  <div className="an-section-head">
    <span className="an-section-label">{label}</span>
    <span className="an-section-line" />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Analytics = () => {
  const [filterOptions, setFilterOptions] = useState({ projects: [], cities: [] });
  const [filters, setFilters] = useState({ duration: "thisMonth", project: "all", city: "all" });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const styleRef = useRef(false);

  // Inject styles once
  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const el = document.createElement("style");
    el.textContent = STYLE;
    document.head.appendChild(el);
  }, []);

  // Fetch filter options
  useEffect(() => {
    api.get("/api/analytics/filters")
      .then(r => setFilterOptions(r.data))
      .catch(e => console.error("Filter options error:", e));
  }, []);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period: filters.duration });
      if (filters.project !== "all") params.set("project", filters.project);
      if (filters.city    !== "all") params.set("city",    filters.city);
      const { data } = await api.get(`/api/analytics/summary?${params}`);
      setSummary(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Analytics summary error:", e);
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const f  = summary?.finance  || {};
  const s  = summary?.sessions || {};
  const en = summary?.energy   || {};
  const pgPct = f.pgRatePercent ? `${f.pgRatePercent}%` : "1.888%";
  const periodLabel = DURATION_OPTIONS.find(o => o.value === filters.duration)?.label || "All Time";

  return (
    <div className="an-root">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="an-header">
        <div>
          <div className="an-title">Analytics</div>
          <div className="an-subtitle">
            {lastUpdated
              ? `Last updated at ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : "Fetching latest data…"}
          </div>
        </div>
        <div className="an-header-right">
          <AnSelect label="Duration" value={filters.duration} onChange={e => setFilters(p => ({ ...p, duration: e.target.value }))}>
            {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </AnSelect>

          <AnSelect label="Project" value={filters.project} onChange={e => setFilters(p => ({ ...p, project: e.target.value }))}>
            <option value="all">All Projects</option>
            {filterOptions.projects.map(p => <option key={p} value={p}>{p}</option>)}
          </AnSelect>

          <AnSelect label="City" value={filters.city} onChange={e => setFilters(p => ({ ...p, city: e.target.value }))}>
            <option value="all">All Cities</option>
            {filterOptions.cities.map(c => <option key={c} value={c}>{c}</option>)}
          </AnSelect>

          <button className="an-refresh-btn" onClick={fetchSummary} disabled={loading} title="Refresh">
            <RefreshIcon className={loading ? "an-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Active chips ───────────────────────────────────────────────────── */}
      <div className="an-chips">
        <span className="an-chip an-chip-blue">📅 {periodLabel}</span>
        {filters.project !== "all" && <span className="an-chip an-chip-purple">🏗 {filters.project}</span>}
        {filters.city    !== "all" && <span className="an-chip an-chip-green">📍 {filters.city}</span>}
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="an-error">
          <div className="an-error-icon">⚠️</div>
          <div className="an-error-msg">{error}</div>
          <button className="an-retry-btn" onClick={fetchSummary}>
            <RefreshIcon style={{ fontSize: 15 }} /> Retry
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* ══ SESSIONS ════════════════════════════════════════════════════ */}
          <SectionHead label="Sessions" />
          <div className="an-grid an-grid-4" style={{ marginBottom: 28 }}>
            {loading ? (
              <><SkeletonKpi /><SkeletonKpi /></>
            ) : (
              <>
                <KpiCard
                  label="Live Sessions"
                  value={fmtNum(s.live)}
                  icon={<EvStationIcon />}
                  iconBg="#dcfce7" iconColor="#15803d" accentColor="#86efac"
                  tooltip="Currently active charging sessions right now"
                  live
                />
                <KpiCard
                  label="Total Sessions"
                  value={fmtNum(s.total)}
                  icon={<EvStationIcon />}
                  iconBg="#dbeafe" iconColor="#1d4ed8" accentColor="#93c5fd"
                  tooltip="All sessions started in the selected period"
                />
              </>
            )}
          </div>

          {/* ══ ENERGY ══════════════════════════════════════════════════════ */}
          <SectionHead label="Energy" />
          <div className="an-grid an-grid-4" style={{ marginBottom: 28 }}>
            {loading ? (
              <><SkeletonKpi /><SkeletonKpi /></>
            ) : (
              <>
                <KpiCard
                  label="Live Energy Dispensed"
                  value={fmtKwh(en.liveKwh)}
                  icon={<BoltIcon />}
                  iconBg="#fef3c7" iconColor="#d97706" accentColor="#fcd34d"
                  tooltip="Energy delivered in currently active sessions"
                  live
                />
                <KpiCard
                  label="Total Energy Consumed"
                  value={fmtKwh(en.totalKwh)}
                  icon={<BoltIcon />}
                  iconBg="#d1fae5" iconColor="#059669" accentColor="#6ee7b7"
                  tooltip="Total kWh dispensed across all completed sessions in the period"
                />
              </>
            )}
          </div>

          {/* ══ FINANCE ═════════════════════════════════════════════════════ */}
          <SectionHead label="Finance" />

          {/* KPI row */}
          <div className="an-grid an-grid-3" style={{ marginBottom: 16 }}>
            {loading ? (
              <><SkeletonKpi /><SkeletonKpi /><SkeletonKpi /></>
            ) : (
              <>
                <KpiCard
                  label="Cashfree Total Collected"
                  value={fmt(f.cashfreeGrossTotal)}
                  icon={<PaymentsIcon />}
                  iconBg="#dbeafe" iconColor="#1d4ed8" accentColor="#93c5fd"
                  tooltip="Gross Cashfree receipts = Wallet top-ups + Direct session payments"
                  sub={`Top-up ${fmt(f.walletTopupTotal)}  ·  Direct ${fmt(f.directCashfreePaid)}`}
                />
                <KpiCard
                  label="Cashfree Net Settlement"
                  value={fmt(f.cashfreeNetSettlement)}
                  icon={<AccountBalanceWalletIcon />}
                  iconBg="#ede9fe" iconColor="#6d28d9" accentColor="#c4b5fd"
                  tooltip={`Gross − direct session refunds − PG charges (${pgPct})`}
                  sub="After refunds & PG charges"
                />
                <KpiCard
                  label="Platform Margin"
                  value={fmt(f.platformMargin)}
                  icon={<TrendingUpIcon />}
                  iconBg="#d1fae5" iconColor="#059669" accentColor="#6ee7b7"
                  tooltip="vjraMarginAmount summed from all receipts in this period"
                  sub="Your revenue from sessions"
                />
              </>
            )}
          </div>

          {/* Detail cards */}
          {!loading && summary && (
            <div className="an-grid an-grid-2-2">

              {/* ── Cashfree Breakdown ── */}
              <div className="an-detail-card">
                <div className="an-detail-head">
                  <div className="an-detail-head-icon" style={{ background: "#dbeafe" }}>
                    <PaymentsIcon style={{ color: "#1d4ed8" }} />
                  </div>
                  <div>
                    <div className="an-detail-title">Cashfree Collections</div>
                    <div className="an-detail-subtitle">Gross inflow breakdown &amp; deductions</div>
                  </div>
                </div>

                <FRow label="Wallet Top-up (CF → Wallet)" value={fmt(f.walletTopupTotal)}
                  tooltip="Users loaded money into Sparx wallet via Cashfree" />
                <FRow label="Direct Session Payments (CF)" value={fmt(f.directCashfreePaid)}
                  tooltip="Users paid directly via Cashfree at session start (no wallet)" />

                <div className="an-divider an-divider-dashed" style={{ margin: "8px 0" }} />

                <div className="an-total-row" style={{ background: "#eff6ff" }}>
                  <span className="an-total-label" style={{ color: "#1d4ed8" }}>Gross Cashfree Total</span>
                  <span className="an-total-value" style={{ color: "#1d4ed8" }}>{fmt(f.cashfreeGrossTotal)}</span>
                </div>

                <div style={{ margin: "14px 0 6px", fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#9ca3af" }}>
                  Deductions
                </div>

                <FRow label="Direct Session Refunds (Bank via CF)" value={`− ${fmt(f.directSessionRefunds)}`}
                  tooltip="Cashfree refunds sent to user bank accounts" indent color="#dc2626" />
                <FRow label={`PG Charges (${pgPct} = 1.6% + 18% GST)`} value={`− ${fmt(f.pgCharges)}`}
                  tooltip={`1.6% base + 18% GST = 1.888% on gross ₹${f.cashfreeGrossTotal?.toFixed(2)}`} indent color="#dc2626" />

                <div className="an-divider" style={{ margin: "10px 0" }} />

                <div className="an-total-row" style={{ background: "#f0fdf4" }}>
                  <span className="an-total-label" style={{ color: "#15803d" }}>Net Settlement to Account</span>
                  <span className="an-total-value" style={{ color: "#15803d" }}>{fmt(f.cashfreeNetSettlement)}</span>
                </div>
              </div>

              {/* ── Wallet & Session Breakdown ── */}
              <div className="an-detail-card">
                <div className="an-detail-head">
                  <div className="an-detail-head-icon" style={{ background: "#ede9fe" }}>
                    <AccountBalanceWalletIcon style={{ color: "#6d28d9" }} />
                  </div>
                  <div>
                    <div className="an-detail-title">Wallet &amp; Session Flow</div>
                    <div className="an-detail-subtitle">How money moved through sessions</div>
                  </div>
                </div>

                <FRow label="Wallet Top-up (Total Loaded)" value={fmt(f.walletTopupTotal)}
                  tooltip="Total amount credited into wallets via Cashfree" />
                <FRow label="Wallet Session Payments" value={fmt(f.walletSessionPaid)}
                  tooltip="Amount debited from wallets to pay for charging sessions" />
                <FRow label="Wallet Refunds (Leftover → Wallet)" value={`− ${fmt(f.walletRefunds)}`}
                  tooltip="Unused session balance credited back to user's Sparx wallet (internal — not a Cashfree refund)" indent color="#dc2626" />

                <div className="an-divider an-divider-dashed" style={{ margin: "8px 0" }} />

                <FRow label="Session Paid Amount (amountUtilized)" value={fmt(f.sessionPaidAmount)}
                  tooltip="Actual amount consumed across all sessions (from receipts)" />
                <FRow label="Session Paid Refunds (Total)" value={`− ${fmt(f.sessionPaidRefunds)}`}
                  tooltip="Wallet refunds + bank refunds — total returned to users after sessions" indent color="#dc2626" />

                <div className="an-divider" style={{ margin: "10px 0" }} />

                <div className="an-total-row" style={{ background: "#f5f3ff" }}>
                  <span className="an-total-label" style={{ color: "#6d28d9" }}>Platform Margin</span>
                  <span className="an-total-value" style={{ color: "#6d28d9" }}>{fmt(f.platformMargin)}</span>
                </div>
              </div>

            </div>
          )}

          {/* Skeleton detail cards */}
          {loading && (
            <div className="an-grid an-grid-2-2">
              {[0, 1].map(i => (
                <div key={i} className="an-detail-card">
                  <div className="an-skeleton" style={{ height: 14, width: "40%", marginBottom: 18 }} />
                  {[80, 90, 70, 60, 85, 75].map((w, j) => (
                    <div key={j} className="an-skeleton" style={{ height: 11, width: `${w}%`, marginBottom: 12 }} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;