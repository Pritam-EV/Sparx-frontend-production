
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "";

// ─── Token helper ──────────────────────────────────────────────────────────────
function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("adminToken") ||
    ""
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtDate = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDateOnly = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const PERIOD_OPTIONS = [
  { value: "today",      label: "Today" },
  { value: "month",      label: "This Month" },
  { value: "quarter_fy", label: "This Quarter" },
  { value: "fy",         label: "Current FY" },
];

const PAYMENT_LABELS = {
  cashfree: { label: "Cashfree",   color: "#1a56db", bg: "#ebf5ff" },
  wallet:   { label: "Wallet",     color: "#057a55", bg: "#f0fdf4" },
  free:     { label: "Free",       color: "#7e3af2", bg: "#f5f3ff" },
};

// ─── Inline Styles (Design Tokens) ────────────────────────────────────────────
const T = {
  bg:        "#F4F6F9",
  surface:   "#FFFFFF",
  border:    "#E4E7EC",
  borderMid: "#D0D5DD",
  text:      "#101828",
  textMid:   "#344054",
  textMuted: "#667085",
  textFaint: "#98A2B3",
  primary:   "#1a56db",
  primaryHover: "#1648c0",
  success:   "#057a55",
  error:     "#b91c1c",
  radius:    "10px",
  radiusLg:  "14px",
  shadow:    "0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)",
  shadowMd:  "0 4px 16px rgba(16,24,40,0.08)",
  font:      "'Inter', 'Segoe UI', system-ui, sans-serif",
};

// ─── CSS Injection ─────────────────────────────────────────────────────────────
const dashStyles = `
  .acc-dash * { box-sizing: border-box; }
  .acc-dash { font-family: ${T.font}; background: ${T.bg}; min-height: 100vh; color: ${T.text}; }

  /* Header */
  .acc-header {
    background: ${T.surface}; border-bottom: 1px solid ${T.border};
    padding: 0 24px; display: flex; align-items: center;
    justify-content: space-between; height: 58px;
    position: sticky; top: 0; z-index: 200; box-shadow: ${T.shadow};
  }
  .acc-header-brand { display: flex; align-items: center; gap: 10px; }
  .acc-brand-logo {
    width: 34px; height: 34px; border-radius: 8px;
    background: linear-gradient(135deg, #1a56db 0%, #0891b2 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 800; font-size: 15px; letter-spacing: -0.5px;
    flex-shrink: 0;
  }
  .acc-brand-name { font-weight: 700; font-size: 14px; color: ${T.text}; line-height: 1.2; }
  .acc-brand-sub  { font-size: 11px; color: ${T.textMuted}; line-height: 1.2; }
  .acc-header-actions { display: flex; align-items: center; gap: 8px; }

  /* Buttons */
  .acc-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px; font-size: 13px;
    font-weight: 500; cursor: pointer; border: none;
    transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
    white-space: nowrap; line-height: 1;
  }
  .acc-btn:active { transform: scale(0.98); }
  .acc-btn-ghost {
    background: transparent; border: 1px solid ${T.borderMid}; color: ${T.textMid};
  }
  .acc-btn-ghost:hover { background: ${T.bg}; }
  .acc-btn-primary { background: ${T.primary}; color: #fff; }
  .acc-btn-primary:hover { background: ${T.primaryHover}; }
  .acc-btn-success { background: #ecfdf5; color: ${T.success}; border: 1px solid #a7f3d0; }
  .acc-btn-success:hover { background: #d1fae5; }
  .acc-btn-danger  { background: #fef2f2; color: ${T.error}; border: 1px solid #fecaca; }
  .acc-btn-danger:hover  { background: #fee2e2; }

  /* Tabs */
  .acc-tabs {
    background: ${T.surface}; border-bottom: 1px solid ${T.border};
    padding: 0 24px; display: flex; gap: 0;
  }
  .acc-tab {
    padding: 14px 20px; font-size: 13px; font-weight: 500;
    cursor: pointer; background: none; border: none;
    color: ${T.textMuted}; border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .acc-tab.active { color: ${T.primary}; border-bottom-color: ${T.primary}; font-weight: 600; }
  .acc-tab:hover:not(.active) { color: ${T.textMid}; }

  /* Main content */
  .acc-content { padding: 24px; max-width: 1440px; margin: 0 auto; }
  @media (max-width: 640px) { .acc-content { padding: 16px 12px; } }

  /* Section header */
  .acc-section-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
  }
  .acc-section-title { font-size: 16px; font-weight: 700; color: ${T.text}; margin: 0; }
  .acc-section-sub   { font-size: 12px; color: ${T.textMuted}; margin-top: 3px; }

  /* KPI Grid */
  .acc-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
    gap: 14px; margin-bottom: 28px;
  }
  .acc-kpi-card {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: ${T.radiusLg}; padding: 18px 20px;
    box-shadow: ${T.shadow}; position: relative;
    transition: box-shadow 0.2s;
  }
  .acc-kpi-card:hover { box-shadow: ${T.shadowMd}; }
  .acc-kpi-label { font-size: 11px; font-weight: 600; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
  .acc-kpi-value { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.1; margin-bottom: 4px; }
  .acc-kpi-sub   { font-size: 11px; color: ${T.textMuted}; line-height: 1.4; }
  .acc-live-badge {
    position: absolute; top: 12px; right: 12px;
    background: #ecfdf5; color: #059669; font-size: 10px;
    font-weight: 700; padding: 2px 8px; border-radius: 999px;
    letter-spacing: 0.04em; border: 1px solid #a7f3d0;
  }
  .acc-live-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #059669; margin-right: 4px; vertical-align: middle; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

  /* Filter bar */
  .acc-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  .acc-period-btn {
    padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 500;
    cursor: pointer; border: 1px solid ${T.borderMid}; background: ${T.surface};
    color: ${T.textMid}; transition: all 0.15s;
  }
  .acc-period-btn.active {
    background: ${T.primary}; border-color: ${T.primary}; color: #fff; font-weight: 600;
  }
  .acc-period-btn:hover:not(.active) { background: ${T.bg}; border-color: #9bb0d6; }

  /* Search input */
  .acc-search-wrap { position: relative; display: flex; align-items: center; }
  .acc-search-icon { position: absolute; left: 10px; color: ${T.textFaint}; font-size: 14px; pointer-events: none; }
  .acc-search-input {
    padding: 7px 12px 7px 32px; border: 1px solid ${T.borderMid};
    border-radius: 8px; font-size: 13px; outline: none; width: 260px;
    background: ${T.surface}; color: ${T.text};
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .acc-search-input:focus { border-color: ${T.primary}; box-shadow: 0 0 0 3px rgba(26,86,219,0.12); }
  @media (max-width: 480px) { .acc-search-input { width: 100%; } }

  /* Summary bar */
  .acc-summary-bar {
    background: #eff6ff; border: 1px solid #bfdbfe; border-radius: ${T.radius};
    padding: 12px 18px; display: flex; gap: 24px; flex-wrap: wrap;
    font-size: 12px; color: #1e40af; margin-bottom: 16px; align-items: center;
  }
  .acc-summary-item strong { font-weight: 700; }

  /* Table container */
  .acc-table-wrap {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: ${T.radiusLg}; overflow-x: auto;
    box-shadow: ${T.shadow};
  }
  .acc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .acc-table thead tr {
    background: #F9FAFB; border-bottom: 1px solid ${T.border};
  }
  .acc-table thead th {
    padding: 10px 14px; text-align: left; font-size: 11px;
    font-weight: 600; color: ${T.textMuted}; white-space: nowrap;
    text-transform: uppercase; letter-spacing: 0.04em; cursor: pointer;
    user-select: none;
  }
  .acc-table thead th:hover { color: ${T.primary}; }
  .acc-table thead th.sort-asc::after  { content: " ↑"; color: ${T.primary}; }
  .acc-table thead th.sort-desc::after { content: " ↓"; color: ${T.primary}; }
  .acc-table tbody tr { border-bottom: 1px solid #F2F4F7; transition: background 0.1s; }
  .acc-table tbody tr:last-child { border-bottom: none; }
  .acc-table tbody tr:hover { background: #F9FAFB; }
  .acc-table td { padding: 10px 14px; color: ${T.textMid}; vertical-align: middle; }
  .acc-table td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'SF Mono', 'Fira Code', monospace; }
  .acc-table td.muted { color: ${T.textFaint}; }

  /* Badge */
  .acc-badge {
    display: inline-block; padding: 2px 9px; border-radius: 999px;
    font-size: 11px; font-weight: 600; line-height: 1.6;
  }

  /* Pagination */
  .acc-pagination {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; margin-top: 18px; flex-wrap: wrap;
  }
  .acc-page-btn {
    padding: 6px 14px; border-radius: 8px; font-size: 12px;
    border: 1px solid ${T.borderMid}; background: ${T.surface};
    cursor: pointer; color: ${T.textMid}; font-weight: 500;
    transition: all 0.15s;
  }
  .acc-page-btn:hover:not(:disabled) { background: #eff6ff; border-color: #93c5fd; color: ${T.primary}; }
  .acc-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .acc-page-info { font-size: 12px; color: ${T.textMuted}; padding: 0 4px; }

  /* Error banner */
  .acc-error {
    background: #fef2f2; border: 1px solid #fecaca; border-radius: ${T.radius};
    padding: 12px 18px; color: #991b1b; font-size: 13px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 16px;
  }

  /* Empty state */
  .acc-empty {
    padding: 60px 24px; text-align: center; color: ${T.textFaint};
    font-size: 13px;
  }
  .acc-empty-icon { font-size: 32px; margin-bottom: 12px; }
  .acc-empty-title { font-size: 14px; color: ${T.textMuted}; font-weight: 600; margin-bottom: 4px; }

  /* Skeleton */
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .acc-skel {
    background: linear-gradient(90deg, #F3F4F6 25%, #E9EAEC 50%, #F3F4F6 75%);
    background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 6px;
  }

  /* Export section */
  .acc-export-grid {
    display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px;
  }
  .acc-export-btn {
    padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 500;
    cursor: pointer; border: 1px solid ${T.borderMid}; background: ${T.surface};
    color: ${T.textMid}; display: flex; align-items: center; gap: 6px;
    transition: all 0.15s;
  }
  .acc-export-btn:hover { background: #eff6ff; border-color: #93c5fd; color: ${T.primary}; }
  .acc-export-note { font-size: 11px; color: ${T.textFaint}; margin-top: 8px; }

  /* Divider */
  .acc-divider { border: none; border-top: 1px solid ${T.border}; margin: 28px 0; }

  /* Scrollable section card */
  .acc-card {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: ${T.radiusLg}; box-shadow: ${T.shadow}; margin-bottom: 20px;
  }
  .acc-card-header {
    padding: 16px 20px; border-bottom: 1px solid ${T.border};
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
  }
  .acc-card-body { padding: 16px 20px; }

  /* Responsive: stack header actions */
  @media (max-width: 640px) {
    .acc-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 0 12px; }
    .acc-tab  { padding: 12px 14px; font-size: 12px; }
    .acc-header { padding: 0 14px; }
    .acc-brand-name { font-size: 13px; }
  }
`;

// ─── Skeleton KPI Card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="acc-kpi-card">
      <div className="acc-skel" style={{ height: 11, width: "55%", marginBottom: 12 }} />
      <div className="acc-skel" style={{ height: 26, width: "80%", marginBottom: 8 }} />
      <div className="acc-skel" style={{ height: 10, width: "50%" }} />
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, color, live }) {
  return (
    <div className="acc-kpi-card">
      {live && (
        <span className="acc-live-badge">
          <span className="acc-live-dot" />LIVE
        </span>
      )}
      <div className="acc-kpi-label">{title}</div>
      <div className="acc-kpi-value" style={{ color: color || T.text }}>{value}</div>
      {sub && <div className="acc-kpi-sub">{sub}</div>}
    </div>
  );
}

// ─── Period Filter ─────────────────────────────────────────────────────────────
function PeriodFilter({ value, onChange }) {
  return (
    <>
      {PERIOD_OPTIONS.map(opt => (
        <button
          key={opt.value}
          className={`acc-period-btn${value === opt.value ? " active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </>
  );
}

// ─── Sort helpers ──────────────────────────────────────────────────────────────
function SortableTh({ label, field, sort, onSort }) {
  const active = sort.field === field;
  return (
    <th
      className={active ? (sort.dir === "asc" ? "sort-asc" : "sort-desc") : ""}
      onClick={() => onSort(field)}
    >
      {label}
    </th>
  );
}

function sortRows(rows, { field, dir }) {
  if (!field || !rows) return rows;
  return [...rows].sort((a, b) => {
    let av = a[field], bv = b[field];
    if (av == null) av = "";
    if (bv == null) bv = "";
    if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
    return dir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="acc-pagination">
      <button className="acc-page-btn" disabled={page === 1} onClick={() => onPage(1)}>«</button>
      <button className="acc-page-btn" disabled={page === 1} onClick={() => onPage(p => p - 1)}>‹ Prev</button>
      <span className="acc-page-info">Page {page} of {totalPages}</span>
      <button className="acc-page-btn" disabled={page === totalPages} onClick={() => onPage(p => p + 1)}>Next ›</button>
      <button className="acc-page-btn" disabled={page === totalPages} onClick={() => onPage(totalPages)}>»</button>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AccountantDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");

  // KPI
  const [kpi,      setKpi]      = useState(null);
  const [kpiLoad,  setKpiLoad]  = useState(true);
  const [kpiError, setKpiError] = useState(null);

  // Invoices
  const [invPeriod,  setInvPeriod]  = useState("month");
  const [invPage,    setInvPage]    = useState(1);
  const [invSearch,  setInvSearch]  = useState("");
  const [invData,    setInvData]    = useState(null);
  const [invLoad,    setInvLoad]    = useState(false);
  const [invError,   setInvError]   = useState(null);
  const [invSort,    setInvSort]    = useState({ field: "date", dir: "desc" });

  // Topups
  const [topPeriod, setTopPeriod] = useState("fy");
  const [topPage,   setTopPage]   = useState(1);
  const [topData,   setTopData]   = useState(null);
  const [topLoad,   setTopLoad]   = useState(false);
  const [topSort,   setTopSort]   = useState({ field: "date", dir: "desc" });

  const liveTimer = useRef(null);

  // ── Logout ────────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("adminToken");
    navigate("/login");
  };

  // ── Sort handler ──────────────────────────────────────────────────────────────
  const makeSort = (setSort) => (field) =>
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );

  // ── Fetch KPIs ─────────────────────────────────────────────────────────────────
  const fetchKpi = useCallback(async () => {
    const token = getToken();
    try {
      const { data } = await axios.get(`${API}/api/accountant/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKpi(data);
      setKpiError(null);
    } catch (e) {
      setKpiError(e?.response?.data?.error || e?.message || "Failed to load KPIs");
    } finally {
      setKpiLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchKpi();
    liveTimer.current = setInterval(fetchKpi, 30000);
    return () => clearInterval(liveTimer.current);
  }, [fetchKpi]);

  // ── Fetch Invoices ─────────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    const token = getToken();
    setInvLoad(true); setInvError(null);
    try {
      const { data } = await axios.get(`${API}/api/accountant/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: invPeriod, page: invPage, limit: 50, search: invSearch || undefined },
      });
      setInvData(data);
    } catch (e) {
      setInvError(e?.response?.data?.error || e?.message || "Failed to load invoices");
    } finally {
      setInvLoad(false);
    }
  }, [invPeriod, invPage, invSearch]);

  useEffect(() => {
    if (activeTab === "invoices") fetchInvoices();
  }, [activeTab, fetchInvoices]);

  // ── Fetch Topups ───────────────────────────────────────────────────────────────
  const fetchTopups = useCallback(async () => {
    const token = getToken();
    setTopLoad(true);
    try {
      const { data } = await axios.get(`${API}/api/accountant/wallet-topups`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: topPeriod, page: topPage, limit: 50 },
      });
      setTopData(data);
    } catch (e) {
      console.error("Topups fetch error", e);
    } finally {
      setTopLoad(false);
    }
  }, [topPeriod, topPage]);

  useEffect(() => {
    if (activeTab === "topups") fetchTopups();
  }, [activeTab, fetchTopups]);

  // ── Excel Export ───────────────────────────────────────────────────────────────
  const handleExport = async (period) => {
    const token = getToken();
    try {
      const res = await fetch(`${API}/api/accountant/export?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `VIZ_SmartCharging_CA_${period}_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  };

  // ── Sorted rows ────────────────────────────────────────────────────────────────
  const sortedInvoices = sortRows(invData?.data, invSort);
  const sortedTopups   = sortRows(topData?.data, topSort);

  // ─── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{dashStyles}</style>
      <div className="acc-dash">

        {/* ── Header ── */}
        <header className="acc-header">
          <div className="acc-header-brand">
            <div className="acc-brand-logo">V</div>
            <div>
              <div className="acc-brand-name">VIZ-SMART CHARGING</div>
              <div className="acc-brand-sub">CA Portal — Financial Analytics</div>
            </div>
          </div>
          <div className="acc-header-actions">
            {kpi?.fyLabel && (
              <span style={{ fontSize: 12, color: T.textMuted, padding: "4px 10px", background: T.bg, borderRadius: 6, border: `1px solid ${T.border}` }}>
                FY: {kpi.fyLabel}
              </span>
            )}
            <button className="acc-btn acc-btn-ghost" onClick={() => navigate("/")}>
              Home
            </button>
            <button className="acc-btn acc-btn-danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* ── Tab Bar ── */}
        <nav className="acc-tabs">
          {[
            { key: "overview", label: "Overview" },
            { key: "invoices", label: "Invoice Register" },
            { key: "topups",   label: "Wallet Topups" },
          ].map(t => (
            <button
              key={t.key}
              className={`acc-tab${activeTab === t.key ? " active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <main className="acc-content">

          {/* ═══════════════════ OVERVIEW ═══════════════════ */}
          {activeTab === "overview" && (
            <>
              <div className="acc-section-header">
                <div>
                  <h1 className="acc-section-title">Wallet Summary</h1>
                  <p className="acc-section-sub">Cards 1 & 2 are locked to current FY. Cards 3 & 4 refresh every 30 seconds.</p>
                </div>
              </div>

              {kpiError && (
                <div className="acc-error">
                  <span>{kpiError}</span>
                  <button className="acc-btn acc-btn-danger" onClick={() => { setKpiLoad(true); setKpiError(null); fetchKpi(); }}>
                    Retry
                  </button>
                </div>
              )}

              <div className="acc-kpi-grid">
                {kpiLoad ? (
                  [1,2,3,4].map(i => <SkeletonCard key={i} />)
                ) : kpi ? (
                  <>
                    <KpiCard
                      title={`Total Wallet Topup — ${kpi.fyLabel || ""}`}
                      value={fmt(kpi.totalTopup?.amount ?? 0)}
                      sub={`${kpi.totalTopup?.count ?? 0} topup transactions`}
                      color="#1a56db"
                    />
                    <KpiCard
                      title={`Wallet Consumption — ${kpi.fyLabel || ""}`}
                      value={fmt(kpi.totalConsumption?.amount ?? 0)}
                      sub={`${kpi.totalConsumption?.count ?? 0} charging sessions`}
                      color="#b91c1c"
                    />
                    <KpiCard
                      title="Live Wallet Balance (All Users)"
                      value={fmt(kpi.liveWalletBalance?.totalFloat ?? 0)}
                      sub={`Across ${kpi.liveWalletBalance?.userCount ?? 0} users with balance`}
                      color="#057a55"
                      live
                    />
                    <KpiCard
                      title="Live Session Amount (Wallet)"
                      value={fmt(kpi.liveSessionAmount?.totalAmountUsed ?? 0)}
                      sub={`${kpi.liveSessionAmount?.activeSessions ?? 0} active wallet-paid sessions`}
                      color="#6d28d9"
                      live
                    />
                  </>
                ) : null}
              </div>

              <hr className="acc-divider" />

              {/* Download Reports */}
              <div>
                <h2 className="acc-section-title" style={{ marginBottom: 6 }}>Download Excel Reports</h2>
                <p className="acc-section-sub" style={{ marginBottom: 14 }}>Each export contains Invoice Register and Wallet Topups for the selected period.</p>
                <div className="acc-export-grid">
                  {PERIOD_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className="acc-export-btn"
                      onClick={() => handleExport(opt.value)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="acc-export-note">Fields: Invoice No, Date, Customer Name, GSTIN, Place of Supply, Type, Payment Mode, Taxable, CGST, SGST, IGST, GST Total, Discount, Total Amount</p>
              </div>
            </>
          )}

          {/* ═══════════════════ INVOICE REGISTER ═══════════════════ */}
          {activeTab === "invoices" && (
            <>
              <div className="acc-section-header">
                <div>
                  <h1 className="acc-section-title">Invoice Register</h1>
                  {invData && (
                    <p className="acc-section-sub">{invData.total} invoices · {invData.period?.label}</p>
                  )}
                </div>
                <button className="acc-btn acc-btn-success" onClick={() => handleExport(invPeriod)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Excel
                </button>
              </div>

              {/* Filters */}
              <div className="acc-filters">
                <PeriodFilter value={invPeriod} onChange={p => { setInvPeriod(p); setInvPage(1); }} />
                <div style={{ flex: 1 }} />
                <div className="acc-search-wrap">
                  <span className="acc-search-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </span>
                  <input
                    className="acc-search-input"
                    placeholder="Invoice, name, mobile, GSTIN..."
                    value={invSearch}
                    onChange={e => { setInvSearch(e.target.value); setInvPage(1); }}
                    onKeyDown={e => e.key === "Enter" && fetchInvoices()}
                  />
                </div>
                <button className="acc-btn acc-btn-primary" onClick={fetchInvoices}>Search</button>
              </div>

              {invError && (
                <div className="acc-error">
                  <span>{invError}</span>
                  <button className="acc-btn acc-btn-danger" onClick={fetchInvoices}>Retry</button>
                </div>
              )}

              {/* Period Totals Summary */}
              {invData?.periodTotals && (
                <div className="acc-summary-bar">
                  <span><strong>Taxable:</strong> {fmt(invData.periodTotals.taxableAmount)}</span>
                  <span><strong>GST:</strong> {fmt(invData.periodTotals.gstAmount)}</span>
                  <span><strong>Total:</strong> {fmt(invData.periodTotals.totalAmount)}</span>
                  <span><strong>Discount:</strong> {fmt(invData.periodTotals.discounts)}</span>
                  <span><strong>Count:</strong> {invData.periodTotals.count} invoices</span>
                </div>
              )}

              {invLoad ? (
                <div className="acc-empty"><div>Loading invoices...</div></div>
              ) : invData?.data?.length === 0 ? (
                <div className="acc-empty">
                  <div className="acc-empty-icon">📄</div>
                  <div className="acc-empty-title">No invoices found</div>
                  <div>Try changing the period or search query.</div>
                </div>
              ) : invData?.data ? (
                <>
                  <div className="acc-table-wrap">
                    <table className="acc-table">
                      <thead>
                        <tr>
                          {[
                            ["invoiceNo",     "Invoice No."],
                            ["date",          "Date"],
                            ["customerName",  "Customer Name"],
                            ["customerGstin", "GSTIN"],
                            ["placeOfSupply", "Place of Supply"],
                            ["invoiceType",   "Type"],
                            ["paymentMode",   "Payment"],
                            ["taxableAmount", "Taxable (₹)"],
                            ["cgst",          "CGST (₹)"],
                            ["sgst",          "SGST (₹)"],
                            ["igst",          "IGST (₹)"],
                            ["totalGst",      "GST Total (₹)"],
                            ["discount",      "Discount (₹)"],
                            ["totalAmount",   "Total (₹)"],
                          ].map(([field, label]) => (
                            <SortableTh
                              key={field}
                              label={label}
                              field={field}
                              sort={invSort}
                              onSort={makeSort(setInvSort)}
                            />
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedInvoices.map((inv, i) => (
                          <tr key={inv.invoiceNo || i}>
                            <td style={{ fontWeight: 600, color: T.primary, whiteSpace: "nowrap" }}>{inv.invoiceNo}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{fmtDateOnly(inv.date)}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{inv.customerName}</td>
                            <td style={{ color: inv.customerGstin ? T.success : T.textFaint, fontFamily: "monospace", fontSize: 11 }}>
                              {inv.customerGstin || "—"}
                            </td>
                            <td>{inv.placeOfSupply}</td>
                            <td>
                              <span
                                className="acc-badge"
                                style={{
                                  background: inv.invoiceType === "B2B" ? "#eff6ff" : "#F9FAFB",
                                  color:      inv.invoiceType === "B2B" ? T.primary   : T.textMuted,
                                }}
                              >{inv.invoiceType}</span>
                            </td>
                            <td>
                              <span
                                className="acc-badge"
                                style={{
                                  background: PAYMENT_LABELS[inv.paymentMode]?.bg || "#F9FAFB",
                                  color:      PAYMENT_LABELS[inv.paymentMode]?.color || T.textMid,
                                }}
                              >{PAYMENT_LABELS[inv.paymentMode]?.label || inv.paymentMode || "—"}</span>
                            </td>
                            <td className="num">{fmt(inv.taxableAmount)}</td>
                            <td className="num muted">{inv.cgst > 0 ? fmt(inv.cgst) : "—"}</td>
                            <td className="num muted">{inv.sgst > 0 ? fmt(inv.sgst) : "—"}</td>
                            <td className="num muted">{inv.igst > 0 ? fmt(inv.igst) : "—"}</td>
                            <td className="num" style={{ color: "#b91c1c" }}>{fmt(inv.totalGst)}</td>
                            <td className="num" style={{ color: inv.discount > 0 ? "#6d28d9" : T.textFaint }}>
                              {inv.discount > 0 ? fmt(inv.discount) : "—"}
                            </td>
                            <td className="num" style={{ fontWeight: 700 }}>{fmt(inv.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={invPage} totalPages={invData.totalPages} onPage={setInvPage} />
                </>
              ) : null}
            </>
          )}

          {/* ═══════════════════ WALLET TOPUPS ═══════════════════ */}
          {activeTab === "topups" && (
            <>
              <div className="acc-section-header">
                <div>
                  <h1 className="acc-section-title">Wallet Topup Ledger</h1>
                  {topData && (
                    <p className="acc-section-sub">{topData.total} transactions · {topData.period?.label}</p>
                  )}
                </div>
                <button className="acc-btn acc-btn-success" onClick={() => handleExport(topPeriod)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Excel
                </button>
              </div>

              <div className="acc-filters">
                <PeriodFilter value={topPeriod} onChange={p => { setTopPeriod(p); setTopPage(1); }} />
              </div>

              {topLoad ? (
                <div className="acc-empty"><div>Loading topups...</div></div>
              ) : topData?.data?.length === 0 ? (
                <div className="acc-empty">
                  <div className="acc-empty-icon">💳</div>
                  <div className="acc-empty-title">No topups found</div>
                  <div>No wallet topups for the selected period.</div>
                </div>
              ) : topData?.data ? (
                <>
                  <div className="acc-table-wrap">
                    <table className="acc-table">
                      <thead>
                        <tr>
                          {[
                            ["date",          "Date & Time"],
                            ["userName",      "Customer Name"],
                            ["amount",        "Amount (₹)"],
                            ["balanceBefore", "Bal. Before (₹)"],
                            ["balanceAfter",  "Bal. After (₹)"],
                            ["orderId",       "Cashfree Order ID"],
                          ].map(([field, label]) => (
                            <SortableTh
                              key={field}
                              label={label}
                              field={field}
                              sort={topSort}
                              onSort={makeSort(setTopSort)}
                            />
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTopups.map((t, i) => (
                          <tr key={t._id || i}>
                            <td style={{ whiteSpace: "nowrap" }}>{fmtDate(t.date)}</td>
                            <td>{t.userName}</td>
                            <td className="num" style={{ fontWeight: 700, color: T.success }}>{fmt(t.amount)}</td>
                            <td className="num muted">{fmt(t.balanceBefore)}</td>
                            <td className="num">{fmt(t.balanceAfter)}</td>
                            <td style={{ fontSize: 11, fontFamily: "monospace", color: T.textMuted }}>{t.orderId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={topPage} totalPages={topData.totalPages} onPage={setTopPage} />
                </>
              ) : null}
            </>
          )}

        </main>
      </div>
    </>
  );
}
