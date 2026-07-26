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

// ─── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtDate = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const fmtDateOnly = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

// ─── Constants ─────────────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { value: "today",      label: "Today" },
  { value: "month",      label: "This Month" },
  { value: "quarter_fy", label: "This Quarter" },
  { value: "fy",         label: "Current FY" },
];

const PAYMENT_LABELS = {
  cashfree: { label: "Cashfree", color: "#1a56db", bg: "#ebf5ff" },
  wallet:   { label: "Wallet",   color: "#057a55", bg: "#f0fdf4" },
  free:     { label: "Free",     color: "#7e3af2", bg: "#f5f3ff" },
};

const WALLET_TYPE_META = {
  topup:        { label: "Topup",         color: "#057a55", bg: "#f0fdf4" },
  debit:        { label: "Debit",         color: "#b91c1c", bg: "#fef2f2" },
  refund:       { label: "Refund→Wallet", color: "#6d28d9", bg: "#f5f3ff" },
  refund_bank:  { label: "Refund→Bank",   color: "#b45309", bg: "#fffbeb" },
  admin_credit: { label: "Admin Credit",  color: "#0369a1", bg: "#eff6ff" },
  admin_debit:  { label: "Admin Debit",   color: "#9f1239", bg: "#fff1f2" },
};

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", border: "#E4E7EC", borderMid: "#D0D5DD",
  text: "#101828", textMid: "#344054", textMuted: "#667085", textFaint: "#98A2B3",
  primary: "#1a56db", primaryHover: "#1648c0",
  success: "#057a55", error: "#b91c1c", warning: "#b45309",
  radius: "10px", radiusLg: "14px",
  shadow: "0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)",
  shadowMd: "0 4px 16px rgba(16,24,40,0.08)",
  font: "'Inter', 'Segoe UI', system-ui, sans-serif",
};

// ─── CSS ───────────────────────────────────────────────────────────────────────
const dashStyles = `
  html, body, #root { height: 100%; min-height: 100%; overflow-y: auto; }
  .acc-dash * { box-sizing: border-box; }
  .acc-dash {
    font-family: ${T.font}; background: ${T.bg};
    min-height: 100vh; color: ${T.text}; overflow-y: auto; overflow-x: hidden;
  }
  .acc-content { padding: 24px; max-width: 1440px; margin: 0 auto; padding-bottom: 56px; }
  @media (max-width: 640px) { .acc-content { padding: 16px 12px 56px; } }

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
    color: #fff; font-weight: 800; font-size: 15px; flex-shrink: 0;
  }
  .acc-brand-name { font-weight: 700; font-size: 14px; color: ${T.text}; line-height: 1.2; }
  .acc-brand-sub  { font-size: 11px; color: ${T.textMuted}; line-height: 1.2; }
  .acc-header-actions { display: flex; align-items: center; gap: 8px; }

  /* Buttons */
  .acc-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
    cursor: pointer; border: none; transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
    white-space: nowrap; line-height: 1;
  }
  .acc-btn:active { transform: scale(0.98); }
  .acc-btn-ghost   { background: transparent; border: 1px solid ${T.borderMid}; color: ${T.textMid}; }
  .acc-btn-ghost:hover { background: ${T.bg}; }
  .acc-btn-primary { background: ${T.primary}; color: #fff; }
  .acc-btn-primary:hover { background: ${T.primaryHover}; }
  .acc-btn-success { background: #ecfdf5; color: ${T.success}; border: 1px solid #a7f3d0; }
  .acc-btn-success:hover { background: #d1fae5; }
  .acc-btn-danger  { background: #fef2f2; color: ${T.error}; border: 1px solid #fecaca; }
  .acc-btn-danger:hover  { background: #fee2e2; }
  .acc-btn-warning { background: #fffbeb; color: ${T.warning}; border: 1px solid #fcd34d; }
  .acc-btn-warning:hover { background: #fef3c7; }

  /* Tabs */
  .acc-tabs {
    background: ${T.surface}; border-bottom: 1px solid ${T.border};
    padding: 0 24px; display: flex; gap: 0; overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .acc-tab {
    padding: 14px 20px; font-size: 13px; font-weight: 500;
    cursor: pointer; background: none; border: none;
    color: ${T.textMuted}; border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s; white-space: nowrap; flex-shrink: 0;
  }
  .acc-tab.active { color: ${T.primary}; border-bottom-color: ${T.primary}; font-weight: 600; }
  .acc-tab:hover:not(.active) { color: ${T.textMid}; }

  /* Section */
  .acc-section-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
  }
  .acc-section-title { font-size: 16px; font-weight: 700; color: ${T.text}; margin: 0; }
  .acc-section-sub   { font-size: 12px; color: ${T.textMuted}; margin-top: 3px; }

  /* KPI Grid */
  .acc-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
    gap: 14px; margin-bottom: 24px;
  }
  .acc-kpi-card {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: ${T.radiusLg}; padding: 18px 20px; box-shadow: ${T.shadow};
    position: relative; transition: box-shadow 0.2s;
  }
  .acc-kpi-card:hover { box-shadow: ${T.shadowMd}; }
  .acc-kpi-category {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; margin-bottom: 4px; opacity: 0.75;
  }
  .acc-kpi-label  { font-size: 11px; font-weight: 600; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
  .acc-kpi-value  { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.1; margin-bottom: 4px; }
  .acc-kpi-sub    { font-size: 11px; color: ${T.textMuted}; line-height: 1.4; }
  .acc-live-badge {
    position: absolute; top: 12px; right: 12px;
    background: #ecfdf5; color: #059669; font-size: 10px; font-weight: 700;
    padding: 2px 8px; border-radius: 999px; letter-spacing: 0.04em; border: 1px solid #a7f3d0;
  }
  .acc-live-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #059669; margin-right: 4px; vertical-align: middle; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.3} }

  /* Divider group header */
  .acc-group-label {
    font-size: 11px; font-weight: 700; color: ${T.textFaint};
    text-transform: uppercase; letter-spacing: 0.08em;
    margin-bottom: 10px; margin-top: 4px; padding-left: 2px;
  }

  /* Accounting equation bar */
  .acc-eq-bar {
    background: #eff6ff; border: 1px solid #bfdbfe; border-radius: ${T.radius};
    padding: 12px 18px; display: flex; gap: 20px; flex-wrap: wrap;
    font-size: 12px; color: #1e40af; margin-bottom: 20px; align-items: center;
  }
  .acc-eq-item strong { font-weight: 700; }
  .acc-eq-divider { color: #93c5fd; font-weight: 300; font-size: 16px; }

  /* GST summary box */
  .acc-gst-box {
    background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: ${T.radius};
    padding: 16px 20px; margin-bottom: 20px;
  }
  .acc-gst-box-title { font-size: 13px; font-weight: 700; color: #065f46; margin-bottom: 12px; }
  .acc-gst-row { display: flex; gap: 32px; flex-wrap: wrap; }
  .acc-gst-item { font-size: 12px; color: #065f46; }
  .acc-gst-item strong { font-weight: 700; font-size: 14px; display: block; margin-top: 2px; }

  /* Period filter */
  .acc-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  .acc-period-btn {
    padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 500;
    cursor: pointer; border: 1px solid ${T.borderMid}; background: ${T.surface};
    color: ${T.textMid}; transition: all 0.15s;
  }
  .acc-period-btn.active { background: ${T.primary}; border-color: ${T.primary}; color: #fff; font-weight: 600; }
  .acc-period-btn:hover:not(.active) { background: ${T.bg}; border-color: #9bb0d6; }

  /* Search */
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

  /* Table */
  .acc-table-wrap {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: ${T.radiusLg}; overflow-x: auto; box-shadow: ${T.shadow};
  }
  .acc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .acc-table thead tr { background: #F9FAFB; border-bottom: 1px solid ${T.border}; }
  .acc-table thead th {
    padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600;
    color: ${T.textMuted}; white-space: nowrap; text-transform: uppercase;
    letter-spacing: 0.04em; cursor: pointer; user-select: none;
  }
  .acc-table thead th:hover { color: ${T.primary}; }
  .acc-table thead th.sort-asc::after  { content: " ↑"; color: ${T.primary}; }
  .acc-table thead th.sort-desc::after { content: " ↓"; color: ${T.primary}; }
  .acc-table tbody tr { border-bottom: 1px solid #F2F4F7; transition: background 0.1s; }
  .acc-table tbody tr:last-child { border-bottom: none; }
  .acc-table tbody tr:hover { background: #F9FAFB; }
  .acc-table td { padding: 10px 14px; color: ${T.textMid}; vertical-align: middle; }
  .acc-table td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'SF Mono','Fira Code',monospace; }
  .acc-table td.muted { color: ${T.textFaint}; }

  /* Badge */
  .acc-badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.6; }

  /* Pagination */
  .acc-pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
  .acc-page-btn {
    padding: 6px 14px; border-radius: 8px; font-size: 12px;
    border: 1px solid ${T.borderMid}; background: ${T.surface};
    cursor: pointer; color: ${T.textMid}; font-weight: 500; transition: all 0.15s;
  }
  .acc-page-btn:hover:not(:disabled) { background: #eff6ff; border-color: #93c5fd; color: ${T.primary}; }
  .acc-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .acc-page-info { font-size: 12px; color: ${T.textMuted}; padding: 0 4px; }

  /* Error */
  .acc-error {
    background: #fef2f2; border: 1px solid #fecaca; border-radius: ${T.radius};
    padding: 12px 18px; color: #991b1b; font-size: 13px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 16px;
  }

  /* Empty */
  .acc-empty { padding: 60px 24px; text-align: center; color: ${T.textFaint}; font-size: 13px; }
  .acc-empty-icon  { font-size: 32px; margin-bottom: 12px; }
  .acc-empty-title { font-size: 14px; color: ${T.textMuted}; font-weight: 600; margin-bottom: 4px; }

  /* Skeleton */
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .acc-skel {
    background: linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%);
    background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite; border-radius: 6px;
  }

  /* Export section */
  .acc-export-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .acc-export-card {
    background: ${T.surface}; border: 1px solid ${T.border}; border-radius: ${T.radiusLg};
    padding: 20px 24px; flex: 1; min-width: 220px; box-shadow: ${T.shadow};
    transition: box-shadow 0.2s;
  }
  .acc-export-card:hover { box-shadow: ${T.shadowMd}; }
  .acc-export-card-title { font-size: 14px; font-weight: 700; color: ${T.text}; margin-bottom: 4px; }
  .acc-export-card-sub { font-size: 12px; color: ${T.textMuted}; margin-bottom: 16px; }
  .acc-export-sheets { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .acc-sheet-tag {
    padding: 2px 8px; background: #f1f5f9; border: 1px solid #e2e8f0;
    border-radius: 4px; font-size: 11px; color: ${T.textMid};
  }

  .acc-divider { border: none; border-top: 1px solid ${T.border}; margin: 24px 0; }

  /* Card */
  .acc-card {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: ${T.radiusLg}; box-shadow: ${T.shadow}; margin-bottom: 20px;
  }
  .acc-card-header {
    padding: 16px 20px; border-bottom: 1px solid ${T.border};
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
  }
  .acc-card-body { padding: 16px 20px; }

  /* GST filing table */
  .acc-gst-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .acc-gst-table th { padding: 10px 16px; background: #1e3a5f; color: #fff; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; }
  .acc-gst-table td { padding: 10px 16px; border-bottom: 1px solid ${T.border}; }
  .acc-gst-table td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'SF Mono',monospace; }
  .acc-gst-table tr.total-row td { font-weight: 700; background: #dce6f1; }
  .acc-gst-table tr:hover td { background: #f9fafb; }

  @media (max-width: 640px) {
    .acc-tabs { padding: 0 12px; }
    .acc-tab  { padding: 12px 14px; font-size: 12px; }
    .acc-header { padding: 0 14px; }
  }
`;

// ─── Sub-components ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="acc-kpi-card">
      <div className="acc-skel" style={{ height: 9, width: "40%", marginBottom: 6 }} />
      <div className="acc-skel" style={{ height: 11, width: "60%", marginBottom: 12 }} />
      <div className="acc-skel" style={{ height: 24, width: "75%", marginBottom: 8 }} />
      <div className="acc-skel" style={{ height: 10, width: "50%" }} />
    </div>
  );
}

function KpiCard({ category, categoryColor, title, value, sub, color, live, dimmed }) {
  return (
    <div className="acc-kpi-card" style={{ opacity: dimmed ? 0.55 : 1 }}>
      {live && (
        <span className="acc-live-badge">
          <span className="acc-live-dot" />LIVE
        </span>
      )}
      {category && (
        <div className="acc-kpi-category" style={{ color: categoryColor || T.textFaint }}>
          {category}
        </div>
      )}
      <div className="acc-kpi-label">{title}</div>
      <div className="acc-kpi-value" style={{ color: color || T.text }}>{value}</div>
      {sub && <div className="acc-kpi-sub">{sub}</div>}
    </div>
  );
}

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
    if (av == null) av = ""; if (bv == null) bv = "";
    if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
    return dir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });
}

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

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AccountantDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");

  // Financial summary (Overview)
  const [ovPeriod, setOvPeriod]   = useState("month");
  const [ovData,   setOvData]     = useState(null);
  const [ovLoad,   setOvLoad]     = useState(true);
  const [ovError,  setOvError]    = useState(null);

  // Invoices
  const [invPeriod,  setInvPeriod]  = useState("month");
  const [invPage,    setInvPage]    = useState(1);
  const [invSearch,  setInvSearch]  = useState("");
  const [invData,    setInvData]    = useState(null);
  const [invLoad,    setInvLoad]    = useState(false);
  const [invError,   setInvError]   = useState(null);
  const [invSort,    setInvSort]    = useState({ field: "date", dir: "desc" });

  // Wallet Ledger (topups + debits combined)
  const [walPeriod,  setWalPeriod]  = useState("month");
  const [walType,    setWalType]    = useState("all");
  const [walPage,    setWalPage]    = useState(1);
  const [walData,    setWalData]    = useState(null);
  const [walLoad,    setWalLoad]    = useState(false);
  const [walSort,    setWalSort]    = useState({ field: "date", dir: "desc" });

  // GST Filing tab — reuses invData's periodTotals
  const [gstPeriod,  setGstPeriod]  = useState("month");
  const [gstData,    setGstData]    = useState(null);
  const [gstLoad,    setGstLoad]    = useState(false);
  const [gstError,   setGstError]   = useState(null);

  // Export
  const [exporting,  setExporting]  = useState(null); // period string while loading

  const liveTimer = useRef(null);

  // Body overflow fix
  useEffect(() => {
    const pb = document.body.style.overflow;
    const ph = document.documentElement.style.overflow;
    document.body.style.overflowY = "auto";
    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflowY = "auto";
    document.documentElement.style.overflowX = "hidden";
    return () => {
      document.body.style.overflow = pb;
      document.documentElement.style.overflow = ph;
    };
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    ["token","adminToken","authToken"].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    navigate("/login");
  };

  // ── Sort handler ─────────────────────────────────────────────────────────────
  const makeSort = (setSort) => (field) =>
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );

  // ── Fetch Financial Summary ───────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    const token = getToken();
    setOvLoad(true); setOvError(null);
    try {
      const { data } = await axios.get(`${API}/api/accountant/financial-summary`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: ovPeriod },
      });
      setOvData(data);
    } catch (e) {
      setOvError(e?.response?.data?.error || e?.message || "Failed to load summary");
    } finally {
      setOvLoad(false);
    }
  }, [ovPeriod]);

  useEffect(() => {
    fetchOverview();
    liveTimer.current = setInterval(fetchOverview, 60000);
    return () => clearInterval(liveTimer.current);
  }, [fetchOverview]);

  // ── Fetch Invoices ────────────────────────────────────────────────────────────
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

  // ── Fetch Wallet Ledger (topups for now; debits below) ────────────────────────
  const fetchWallet = useCallback(async () => {
    const token = getToken();
    setWalLoad(true);
    try {
      // Fetch topups and debits in parallel then merge
      const endpoints = walType === "debits"
        ? [`${API}/api/accountant/wallet-debits`]
        : walType === "topups"
        ? [`${API}/api/accountant/wallet-topups`]
        : [`${API}/api/accountant/wallet-topups`, `${API}/api/accountant/wallet-debits`];

      const responses = await Promise.all(
        endpoints.map(url =>
          axios.get(url, {
            headers: { Authorization: `Bearer ${getToken()}` },
            params: { period: walPeriod, page: walPage, limit: walType === "all" ? 25 : 50 },
          })
        )
      );

      if (walType === "all") {
        // Merge topups and debits, tag them, sort by date desc
        const topups = (responses[0]?.data?.data || []).map(t => ({ ...t, _type: "topup" }));
        const debits = (responses[1]?.data?.data || []).map(t => ({ ...t, _type: "debit" }));
        const merged = [...topups, ...debits].sort((a, b) => new Date(b.date) - new Date(a.date));
        const totalCombined = (responses[0]?.data?.total || 0) + (responses[1]?.data?.total || 0);
        setWalData({
          data: merged,
          total: totalCombined,
          period: responses[0]?.data?.period,
          totalPages: Math.max(responses[0]?.data?.totalPages || 1, responses[1]?.data?.totalPages || 1),
        });
      } else {
        const r = responses[0]?.data;
        const typed = (r?.data || []).map(t => ({ ...t, _type: walType === "topups" ? "topup" : "debit" }));
        setWalData({ ...r, data: typed });
      }
    } catch (e) {
      console.error("Wallet ledger fetch error", e);
    } finally {
      setWalLoad(false);
    }
  }, [walPeriod, walPage, walType]);

  useEffect(() => {
    if (activeTab === "wallet") fetchWallet();
  }, [activeTab, fetchWallet]);

  // ── Fetch GST data ─────────────────────────────────────────────────────────────
  const fetchGst = useCallback(async () => {
    const token = getToken();
    setGstLoad(true); setGstError(null);
    try {
      const { data } = await axios.get(`${API}/api/accountant/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: gstPeriod, page: 1, limit: 1 }, // only need periodTotals
      });
      setGstData(data);
    } catch (e) {
      setGstError(e?.response?.data?.error || e?.message || "Failed to load GST data");
    } finally {
      setGstLoad(false);
    }
  }, [gstPeriod]);

  useEffect(() => {
    if (activeTab === "gst") fetchGst();
  }, [activeTab, fetchGst]);

  // ── Sorted rows ──────────────────────────────────────────────────────────────
  const sortedInvoices = sortRows(invData?.data, invSort);
  const sortedWallet   = sortRows(walData?.data, walSort);

  // ── Server-side Excel export ──────────────────────────────────────────────────
  const handleExport = async (period) => {
    setExporting(period);
    const token = getToken();
    try {
      const response = await axios.get(`${API}/api/accountant/export`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { period },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a   = document.createElement("a");
      a.href    = url;
      const cd  = response.headers["content-disposition"] || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      a.download = match ? match[1] : `Sparx_CA_${period}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{dashStyles}</style>
      <div className="acc-dash">

        {/* ── Header ── */}
        <header className="acc-header">
          <div className="acc-header-brand">
            <div className="acc-brand-logo">V</div>
            <div>
              <div className="acc-brand-name">SPARX EV — VJRA Technologies</div>
              <div className="acc-brand-sub">CA Portal — Accounts & GST Console</div>
            </div>
          </div>
          <div className="acc-header-actions">
            {ovData?.period?.label && (
              <span style={{ fontSize: 12, color: T.textMuted, padding: "4px 10px", background: T.bg, borderRadius: 6, border: `1px solid ${T.border}` }}>
                {ovData.period.label}
              </span>
            )}
            <button className="acc-btn acc-btn-ghost" onClick={() => navigate("/")}>Home</button>
            <button className="acc-btn acc-btn-danger" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        {/* ── Tab Bar ── */}
        <nav className="acc-tabs">
          {[
            { key: "overview", label: "📊 Financial Overview" },
            { key: "invoices", label: "🧾 Invoice Register" },
            { key: "wallet",   label: "💳 Wallet Ledger" },
            { key: "gst",      label: "📋 GST Filing" },
            { key: "export",   label: "⬇ Export Reports" },
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

          {/* ══════════════════════════════════════════════════════════════
              TAB 1: FINANCIAL OVERVIEW
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <>
              <div className="acc-section-header">
                <div>
                  <h1 className="acc-section-title">Financial Overview</h1>
                  <p className="acc-section-sub">
                    All accounting metrics for the selected period. Live cards refresh every 60 seconds.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <PeriodFilter value={ovPeriod} onChange={p => setOvPeriod(p)} />
                  <button className="acc-btn acc-btn-ghost" onClick={fetchOverview}>
                    ↻ Refresh
                  </button>
                </div>
              </div>

              {ovError && (
                <div className="acc-error">
                  <span>{ovError}</span>
                  <button className="acc-btn acc-btn-danger" onClick={fetchOverview}>Retry</button>
                </div>
              )}

              {/* ── Accounting Equation Bar ── */}
              {ovData && (
                <div className="acc-eq-bar">
                  <span className="acc-eq-item">
                    <strong>Gross Billing: {fmt(ovData.grossBilling)}</strong>
                  </span>
                  <span className="acc-eq-divider">=</span>
                  <span className="acc-eq-item">
                    Taxable: <strong>{fmt(ovData.taxableAmount)}</strong>
                  </span>
                  <span className="acc-eq-divider">+</span>
                  <span className="acc-eq-item">
                    GST Liability: <strong>{fmt(ovData.totalGst)}</strong>
                  </span>
                  <span className="acc-eq-divider">−</span>
                  <span className="acc-eq-item">
                    Discounts: <strong>{fmt(ovData.discounts)}</strong>
                  </span>
                  <span className="acc-eq-item" style={{ marginLeft: "auto", color: "#1e40af" }}>
                    {ovData.invoiceCount} invoices · {ovData.period?.label}
                  </span>
                </div>
              )}

              {/* ── GROUP 1: Assets / Revenue ── */}
              <div className="acc-group-label" style={{ color: T.success }}>Assets & Revenue</div>
              <div className="acc-kpi-grid">
                {ovLoad ? [1,2,3].map(i => <SkeletonCard key={i} />) : ovData ? (
                  <>
                    <KpiCard
                      category="REVENUE" categoryColor={T.success}
                      title="Gross Billing (Outward Supplies)"
                      value={fmt(ovData.grossBilling)}
                      sub={`${ovData.invoiceCount} invoices · ${ovData.period?.label}`}
                      color={T.success}
                    />
                    <KpiCard
                      category="REVENUE" categoryColor={T.success}
                      title="Platform Income (VJRA Margin)"
                      value={fmt(ovData.platformIncome)}
                      sub="Net commission earned after owner payout"
                      color={T.success}
                    />
                    <KpiCard
                      category="ASSETS" categoryColor={T.primary}
                      title="Customer Advances — Wallet Float"
                      value={fmt(ovData.liveWalletFloat)}
                      sub={`Across ${ovData.liveWalletUsers} users · Amount held on platform`}
                      color={T.primary}
                      live
                    />
                    <KpiCard
                      category="ASSETS" categoryColor={T.primary}
                      title="Live Session Amount in Use"
                      value={fmt(ovData.liveSessionAmount)}
                      sub={`${ovData.liveActiveSessions} active wallet-paid sessions`}
                      color={T.primary}
                      live
                    />
                  </>
                ) : null}
              </div>

              {/* ── GROUP 2: Liabilities ── */}
              <div className="acc-group-label" style={{ color: "#b91c1c" }}>Liabilities & Payables</div>
              <div className="acc-kpi-grid">
                {ovLoad ? [1,2].map(i => <SkeletonCard key={i} />) : ovData ? (
                  <>
                    <KpiCard
                      category="LIABILITY" categoryColor="#b91c1c"
                      title="GST Payable (Output Tax)"
                      value={fmt(ovData.totalGst)}
                      sub={`CGST ${fmt(ovData.cgst)} + SGST ${fmt(ovData.sgst)} + IGST ${fmt(ovData.igst)}`}
                      color="#b91c1c"
                    />
                    <KpiCard
                      category="LIABILITY" categoryColor="#b45309"
                      title="Amount Payable to Owners"
                      value={fmt(ovData.ownerPayable)}
                      sub="Sum of owner payout across all sessions in period"
                      color="#b45309"
                    />
                    <KpiCard
                      category="ADVANCES RECEIVED" categoryColor="#6d28d9"
                      title="Wallet Topups (Customer Advances)"
                      value={fmt(ovData.walletTopups)}
                      sub={`${ovData.topupCount} topup transactions · Advance from customers`}
                      color="#6d28d9"
                    />
                  </>
                ) : null}
              </div>

              {/* ── GROUP 3: Expenses / Deductions ── */}
              <div className="acc-group-label" style={{ color: T.textMuted }}>Expenses & Deductions</div>
              <div className="acc-kpi-grid">
                {ovLoad ? [1,2,3].map(i => <SkeletonCard key={i} />) : ovData ? (
                  <>
                    <KpiCard
                      category="EXPENSE" categoryColor={T.textMuted}
                      title="Payment Gateway Charges"
                      value={fmt(ovData.pgCharges)}
                      sub="Cashfree processing fees deducted from collections"
                      color={T.textMid}
                    />
                    <KpiCard
                      category="EXPENSE" categoryColor={T.textMuted}
                      title="Electricity Cost (VJRA Share)"
                      value={fmt(ovData.electricityCost)}
                      sub="EB cost borne by VJRA for the period"
                      color={T.textMid}
                      dimmed={!ovData.electricityCost}
                    />
                    <KpiCard
                      category="CONTRA INCOME" categoryColor={T.textMuted}
                      title="Discounts Given"
                      value={fmt(ovData.discounts)}
                      sub="Reduction of revenue via promotional discounts"
                      color={T.textMid}
                    />
                    <KpiCard
                      category="REFUNDS" categoryColor="#b91c1c"
                      title="Refunds Issued"
                      value={fmt(ovData.refundsIssued)}
                      sub={`Wallet refunds: ${fmt(ovData.walletRefunds)} · Bank refunds: ${fmt(ovData.bankRefunds)}`}
                      color="#b91c1c"
                    />
                  </>
                ) : null}
              </div>

              {/* ── GROUP 4: Payment mode split ── */}
              <div className="acc-group-label" style={{ color: T.textMuted }}>Revenue by Payment Mode</div>
              <div className="acc-kpi-grid">
                {ovLoad ? [1,2,3].map(i => <SkeletonCard key={i} />) : ovData ? (
                  <>
                    <KpiCard
                      category="CASHFREE" categoryColor="#1a56db"
                      title="Direct Gateway Collections"
                      value={fmt(ovData.cashfreeRevenue)}
                      sub="Sessions paid directly via Cashfree PG"
                      color="#1a56db"
                    />
                    <KpiCard
                      category="WALLET" categoryColor={T.success}
                      title="Wallet-Paid Sessions"
                      value={fmt(ovData.walletRevenue)}
                      sub={`${ovData.debitCount} debits from customer wallet balance`}
                      color={T.success}
                    />
                    <KpiCard
                      category="FREE" categoryColor="#6d28d9"
                      title="Complimentary / Free Sessions"
                      value={fmt(ovData.freeRevenue)}
                      sub="Sessions with no charge (free mode)"
                      color="#6d28d9"
                      dimmed={!ovData.freeRevenue}
                    />
                  </>
                ) : null}
              </div>

              <hr className="acc-divider" />

              {/* ── Quick Export ── */}
              <div>
                <h2 className="acc-section-title" style={{ marginBottom: 6 }}>Quick Export</h2>
                <p className="acc-section-sub" style={{ marginBottom: 14 }}>
                  Download server-generated Excel with Invoice Register, Wallet Topups, Wallet Debits, and GSTR-1 Summary sheets.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {PERIOD_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className="acc-btn acc-btn-success"
                      disabled={exporting === opt.value}
                      onClick={() => handleExport(opt.value)}
                    >
                      <DownloadIcon />
                      {exporting === opt.value ? "Generating…" : opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2: INVOICE REGISTER
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "invoices" && (
            <>
              <div className="acc-section-header">
                <div>
                  <h1 className="acc-section-title">Invoice Register (Outward Supplies)</h1>
                  {invData && (
                    <p className="acc-section-sub">
                      {invData.total} tax invoices · {invData.period?.label}
                    </p>
                  )}
                </div>
                <button
                  className="acc-btn acc-btn-success"
                  disabled={exporting === invPeriod}
                  onClick={() => handleExport(invPeriod)}
                >
                  <DownloadIcon />
                  {exporting === invPeriod ? "Generating…" : "Download Excel (Full Report)"}
                </button>
              </div>

              <div className="acc-filters">
                <PeriodFilter value={invPeriod} onChange={p => { setInvPeriod(p); setInvPage(1); }} />
                <div style={{ flex: 1 }} />
                <div className="acc-search-wrap">
                  <span className="acc-search-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </span>
                  <input
                    className="acc-search-input"
                    placeholder="Invoice no, name, GSTIN, city…"
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

              {/* Period totals summary bar */}
              {invData?.periodTotals && (
                <div className="acc-summary-bar">
                  <span className="acc-summary-item">Taxable: <strong>{fmt(invData.periodTotals.taxableAmount)}</strong></span>
                  <span className="acc-summary-item">CGST: <strong>{fmt(invData.periodTotals.cgst)}</strong></span>
                  <span className="acc-summary-item">SGST: <strong>{fmt(invData.periodTotals.sgst)}</strong></span>
                  <span className="acc-summary-item">IGST: <strong>{fmt(invData.periodTotals.igst)}</strong></span>
                  <span className="acc-summary-item">Total GST: <strong>{fmt(invData.periodTotals.gstAmount)}</strong></span>
                  <span className="acc-summary-item">Discount: <strong>{fmt(invData.periodTotals.discounts)}</strong></span>
                  <span className="acc-summary-item">Refunds: <strong>{fmt(invData.periodTotals.refunds)}</strong></span>
                  <span className="acc-summary-item">Gross Total: <strong>{fmt(invData.periodTotals.totalAmount)}</strong></span>
                  <span className="acc-summary-item" style={{ marginLeft: "auto" }}>
                    {invData.periodTotals.count} invoices
                  </span>
                </div>
              )}

              {invLoad ? (
                <div className="acc-empty"><div>Loading invoice register…</div></div>
              ) : invData?.data?.length === 0 ? (
                <div className="acc-empty">
                  <div className="acc-empty-icon">📄</div>
                  <div className="acc-empty-title">No invoices found</div>
                  <div>Try a different period or search query.</div>
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
                            ["customerName",  "Customer"],
                            ["customerGstin", "GSTIN"],
                            ["placeOfSupply", "Place of Supply"],
                            ["invoiceType",   "B2B/B2C"],
                            ["supplyType",    "Supply Type"],
                            ["paymentMode",   "Payment Mode"],
                            ["taxableAmount", "Taxable (₹)"],
                            ["cgst",          "CGST (₹)"],
                            ["sgst",          "SGST (₹)"],
                            ["igst",          "IGST (₹)"],
                            ["totalGst",      "Total GST (₹)"],
                            ["discount",      "Discount (₹)"],
                            ["totalAmount",   "Invoice Total (₹)"],
                          ].map(([field, label]) => (
                            <SortableTh key={field} label={label} field={field} sort={invSort} onSort={makeSort(setInvSort)} />
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedInvoices.map((inv, i) => (
                          <tr key={inv.invoiceNo || i}>
                            <td style={{ fontWeight: 600, color: T.primary, whiteSpace: "nowrap", fontSize: 11 }}>{inv.invoiceNo}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{fmtDateOnly(inv.date)}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{inv.customerName}</td>
                            <td style={{ color: inv.customerGstin ? T.success : T.textFaint, fontFamily: "monospace", fontSize: 11 }}>
                              {inv.customerGstin || "—"}
                            </td>
                            <td>{inv.placeOfSupply}</td>
                            <td>
                              <span className="acc-badge" style={{ background: inv.invoiceType === "B2B" ? "#eff6ff" : "#F9FAFB", color: inv.invoiceType === "B2B" ? T.primary : T.textMuted }}>
                                {inv.invoiceType}
                              </span>
                            </td>
                            <td>
                              <span className="acc-badge" style={{ background: inv.supplyType === "Intra-State" ? "#f0fdf4" : "#fff7ed", color: inv.supplyType === "Intra-State" ? T.success : T.warning }}>
                                {inv.supplyType}
                              </span>
                            </td>
                            <td>
                              <span className="acc-badge" style={{ background: PAYMENT_LABELS[inv.paymentMode]?.bg || "#F9FAFB", color: PAYMENT_LABELS[inv.paymentMode]?.color || T.textMid }}>
                                {PAYMENT_LABELS[inv.paymentMode]?.label || inv.paymentMode || "—"}
                              </span>
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

          {/* ══════════════════════════════════════════════════════════════
              TAB 3: WALLET LEDGER
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "wallet" && (
            <>
              <div className="acc-section-header">
                <div>
                  <h1 className="acc-section-title">Wallet Ledger (Customer Advances)</h1>
                  {walData && (
                    <p className="acc-section-sub">
                      {walData.total} transactions · {walData.period?.label}
                    </p>
                  )}
                </div>
                <button
                  className="acc-btn acc-btn-success"
                  disabled={exporting === walPeriod}
                  onClick={() => handleExport(walPeriod)}
                >
                  <DownloadIcon />
                  {exporting === walPeriod ? "Generating…" : "Download Excel"}
                </button>
              </div>

              <div className="acc-filters">
                <PeriodFilter value={walPeriod} onChange={p => { setWalPeriod(p); setWalPage(1); }} />
                <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0 }} />
                {[
                  { key: "all",    label: "All Movements" },
                  { key: "topups", label: "Topups (Advances)" },
                  { key: "debits", label: "Debits (Utilised)" },
                ].map(opt => (
                  <button
                    key={opt.key}
                    className={`acc-period-btn${walType === opt.key ? " active" : ""}`}
                    onClick={() => { setWalType(opt.key); setWalPage(1); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                {Object.entries(WALLET_TYPE_META).map(([k, v]) => (
                  <span key={k} className="acc-badge" style={{ background: v.bg, color: v.color }}>
                    {v.label}
                  </span>
                ))}
              </div>

              {walLoad ? (
                <div className="acc-empty"><div>Loading wallet ledger…</div></div>
              ) : walData?.data?.length === 0 ? (
                <div className="acc-empty">
                  <div className="acc-empty-icon">💳</div>
                  <div className="acc-empty-title">No wallet movements found</div>
                  <div>Try a different period or filter.</div>
                </div>
              ) : walData?.data ? (
                <>
                  <div className="acc-table-wrap">
                    <table className="acc-table">
                      <thead>
                        <tr>
                          {[
                            ["date",          "Date & Time"],
                            ["_type",         "Type"],
                            ["userName",      "Customer"],
                            ["amount",        "Amount (₹)"],
                            ["balanceBefore", "Bal. Before (₹)"],
                            ["balanceAfter",  "Bal. After (₹)"],
                            ["orderId",       "Reference / Order ID"],
                            ["description",   "Description"],
                          ].map(([field, label]) => (
                            <SortableTh key={field} label={label} field={field} sort={walSort} onSort={makeSort(setWalSort)} />
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedWallet.map((t, i) => {
                          const meta = WALLET_TYPE_META[t._type] || { label: t._type, color: T.textMid, bg: "#F9FAFB" };
                          const isCredit = ["topup", "admin_credit"].includes(t._type);
                          return (
                            <tr key={t._id || i}>
                              <td style={{ whiteSpace: "nowrap" }}>{fmtDate(t.date)}</td>
                              <td>
                                <span className="acc-badge" style={{ background: meta.bg, color: meta.color }}>
                                  {meta.label}
                                </span>
                              </td>
                              <td>{t.userName}</td>
                              <td className="num" style={{ fontWeight: 700, color: isCredit ? T.success : "#b91c1c" }}>
                                {isCredit ? "+" : "−"}{fmt(t.amount)}
                              </td>
                              <td className="num muted">{fmt(t.balanceBefore)}</td>
                              <td className="num">{fmt(t.balanceAfter)}</td>
                              <td style={{ fontSize: 11, fontFamily: "monospace", color: T.textMuted }}>
                                {t.orderId !== "—" ? t.orderId : (t.sessionId !== "—" ? t.sessionId : "—")}
                              </td>
                              <td className="muted" style={{ fontSize: 11 }}>{t.description !== "—" ? t.description : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={walPage} totalPages={walData.totalPages} onPage={setWalPage} />
                </>
              ) : null}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 4: GST FILING
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "gst" && (
            <>
              <div className="acc-section-header">
                <div>
                  <h1 className="acc-section-title">GST Filing Summary (GSTR-1 / GSTR-3B)</h1>
                  <p className="acc-section-sub">
                    Output tax summary by supply type for filing. Download the full GSTR-1 sheet via Export.
                  </p>
                </div>
                <button
                  className="acc-btn acc-btn-success"
                  disabled={exporting === gstPeriod}
                  onClick={() => handleExport(gstPeriod)}
                >
                  <DownloadIcon />
                  {exporting === gstPeriod ? "Generating…" : "Download GSTR-1 Excel"}
                </button>
              </div>

              <div className="acc-filters">
                <PeriodFilter value={gstPeriod} onChange={p => { setGstPeriod(p); }} />
              </div>

              {gstError && (
                <div className="acc-error">
                  <span>{gstError}</span>
                  <button className="acc-btn acc-btn-danger" onClick={fetchGst}>Retry</button>
                </div>
              )}

              {gstLoad ? (
                <div className="acc-empty"><div>Loading GST data…</div></div>
              ) : gstData?.periodTotals ? (() => {
                const pt = gstData.periodTotals;
                return (
                  <>
                    {/* GST summary highlight box */}
                    <div className="acc-gst-box">
                      <div className="acc-gst-box-title">
                        Output Tax Summary — {gstData.period?.label}
                      </div>
                      <div className="acc-gst-row">
                        <div className="acc-gst-item">Taxable Value<strong>{fmt(pt.taxableAmount)}</strong></div>
                        <div className="acc-gst-item">CGST 9%<strong>{fmt(pt.cgst)}</strong></div>
                        <div className="acc-gst-item">SGST 9%<strong>{fmt(pt.sgst)}</strong></div>
                        <div className="acc-gst-item">IGST 18%<strong>{fmt(pt.igst)}</strong></div>
                        <div className="acc-gst-item">Total GST<strong style={{ fontSize: 16, color: "#065f46" }}>{fmt(pt.gstAmount)}</strong></div>
                        <div className="acc-gst-item">No. of Invoices<strong>{pt.count}</strong></div>
                        <div className="acc-gst-item">Discounts (contra)<strong>{fmt(pt.discounts)}</strong></div>
                        <div className="acc-gst-item">Refunds Issued<strong>{fmt(pt.refunds)}</strong></div>
                      </div>
                    </div>

                    {/* GSTR-1 Style breakdown table */}
                    <div className="acc-card">
                      <div className="acc-card-header">
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>GSTR-1 Breakup</div>
                          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                            Outward supplies by category and supply type
                          </div>
                        </div>
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table className="acc-gst-table">
                          <thead>
                            <tr>
                              <th>Section</th>
                              <th style={{ textAlign: "right" }}>Taxable Value (₹)</th>
                              <th style={{ textAlign: "right" }}>CGST 9% (₹)</th>
                              <th style={{ textAlign: "right" }}>SGST 9% (₹)</th>
                              <th style={{ textAlign: "right" }}>IGST 18% (₹)</th>
                              <th style={{ textAlign: "right" }}>Total GST (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: "B2C — Intra-State (CGST + SGST)", tax: pt.taxableAmount * (pt.cgst / (pt.totalGst || 1)) , cgst: pt.cgst, sgst: pt.sgst, igst: 0,       totalGst: pt.cgst + pt.sgst },
                              { label: "B2C / B2B — Inter-State (IGST)",  tax: pt.taxableAmount * (pt.igst  / (pt.totalGst || 1)),  cgst: 0,       sgst: 0,       igst: pt.igst, totalGst: pt.igst  },
                            ].map((row, i) => (
                              <tr key={i}>
                                <td>{row.label}</td>
                                <td className="num">{fmt(row.tax)}</td>
                                <td className="num muted">{row.cgst > 0 ? fmt(row.cgst) : "—"}</td>
                                <td className="num muted">{row.sgst > 0 ? fmt(row.sgst) : "—"}</td>
                                <td className="num muted">{row.igst > 0 ? fmt(row.igst) : "—"}</td>
                                <td className="num">{fmt(row.totalGst)}</td>
                              </tr>
                            ))}
                            <tr className="total-row">
                              <td>GRAND TOTAL</td>
                              <td className="num">{fmt(pt.taxableAmount)}</td>
                              <td className="num">{fmt(pt.cgst)}</td>
                              <td className="num">{fmt(pt.sgst)}</td>
                              <td className="num">{fmt(pt.igst)}</td>
                              <td className="num">{fmt(pt.gstAmount)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 12, lineHeight: 1.6 }}>
                      <strong>Note for CA:</strong> The inter-state vs intra-state split above is derived from{" "}
                      <em>Place of Supply</em> vs registered state (Maharashtra). For GSTR-1 filing, use the
                      Excel download which contains individual invoice-level data including customer GSTIN for B2B entries.
                      Verify with your Tally/Zoho books before filing.
                    </div>
                  </>
                );
              })() : (
                <div className="acc-empty">
                  <div className="acc-empty-icon">📋</div>
                  <div className="acc-empty-title">No GST data</div>
                  <div>Select a period and the data will appear here.</div>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 5: EXPORT CENTER
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "export" && (
            <>
              <div className="acc-section-header">
                <div>
                  <h1 className="acc-section-title">Export Center</h1>
                  <p className="acc-section-sub">
                    Server-generated Excel files. Each download is a multi-sheet workbook with all registers.
                  </p>
                </div>
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: T.radius, padding: "12px 18px", fontSize: 12, color: "#78350f", marginBottom: 20 }}>
                <strong>What's included in each Excel:</strong> Sheet 1 — Invoice Register (with energy, rate, taxable, CGST/SGST/IGST, discount, refund per invoice) · Sheet 2 — Wallet Topups · Sheet 3 — Wallet Debits (Charging) · Sheet 4 — GSTR-1 Summary (section-wise breakup for filing)
              </div>

              <div className="acc-export-grid">
                {PERIOD_OPTIONS.map(opt => (
                  <div key={opt.value} className="acc-export-card">
                    <div className="acc-export-card-title">{opt.label} Report</div>
                    <div className="acc-export-card-sub">
                      Complete accounts pack for {opt.label.toLowerCase()} period
                    </div>
                    <div className="acc-export-sheets">
                      {["Invoice Register", "Wallet Topups", "Wallet Debits", "GSTR-1 Summary"].map(s => (
                        <span key={s} className="acc-sheet-tag">{s}</span>
                      ))}
                    </div>
                    <button
                      className="acc-btn acc-btn-success"
                      style={{ width: "100%", justifyContent: "center" }}
                      disabled={exporting === opt.value}
                      onClick={() => handleExport(opt.value)}
                    >
                      <DownloadIcon />
                      {exporting === opt.value ? "Generating Excel…" : `Download ${opt.label}`}
                    </button>
                  </div>
                ))}
              </div>

              <hr className="acc-divider" />

              <div className="acc-card">
                <div className="acc-card-header">
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Custom Date Range Export</div>
                </div>
                <div className="acc-card-body">
                  <CustomExport onExport={handleExport} exporting={exporting} />
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </>
  );
}

// ─── Custom Date Range Export ──────────────────────────────────────────────────
function CustomExport({ onExport, exporting }) {
  const [from, setFrom] = useState("");
  const [to,   setTo]   = useState("");

  const handleCustom = () => {
    if (!from || !to) { alert("Please select both From and To dates."); return; }
    if (new Date(from) > new Date(to)) { alert("From date must be before To date."); return; }
    onExport(`custom&from=${from}&to=${to}`);
  };

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div>
        <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 4 }}>From Date</label>
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          style={{ padding: "7px 12px", border: `1px solid ${T.borderMid}`, borderRadius: 8, fontSize: 13, outline: "none" }}
        />
      </div>
      <div>
        <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 4 }}>To Date</label>
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          style={{ padding: "7px 12px", border: `1px solid ${T.borderMid}`, borderRadius: 8, fontSize: 13, outline: "none" }}
        />
      </div>
      <button
        className="acc-btn acc-btn-warning"
        disabled={!!exporting}
        onClick={handleCustom}
      >
        <DownloadIcon />
        {exporting ? "Generating…" : "Download Custom Range"}
      </button>
    </div>
  );
}