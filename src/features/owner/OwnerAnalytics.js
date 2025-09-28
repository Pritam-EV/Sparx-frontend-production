// features/owner/OwnerAnalytics.js
import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";
import {
  Select,
  MenuItem,
  FormControl,
  Chip,
  Box
} from "@mui/material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BoltIcon from "@mui/icons-material/Bolt";

const fmt0 = (v) => Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const bucketsFor = (granularity, from, to) => {
  const start = new Date(from);
  const end = new Date(to);
  const out = [];
  const d = new Date(start);
  if (granularity === "day") {
    while (d <= end) {
      out.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
  } else if (granularity === "week") {
    const temp = new Date(d);
    const day = (temp.getDay() + 6) % 7;
    temp.setDate(temp.getDate() - day);
    while (temp <= end) {
      const y = temp.getUTCFullYear();
      const firstJan = new Date(Date.UTC(y, 0, 1));
      const w = Math.floor((((temp - firstJan) / 86400000) + ((firstJan.getUTCDay() + 6) % 7)) / 7) + 1;
      out.push(`${y}-W${String(w).padStart(2, "0")}`);
      temp.setDate(temp.getDate() + 7);
    }
  } else {
    const temp = new Date(start.getUTCFullYear(), start.getUTCMonth(), 1);
    while (temp <= end) {
      out.push(`${temp.getUTCFullYear()}-${String(temp.getUTCMonth() + 1).padStart(2, "0")}`);
      temp.setMonth(temp.getMonth() + 1);
    }
  }
  return out;
};

const OwnerAnalytics = () => {
  const [range, setRange] = useState("day");
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); d.setHours(0,0,0,0); return d.toISOString();
  });
  const [to, setTo] = useState(() => new Date().toISOString());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const qs = new URLSearchParams({ from, to, limit: "10000" }).toString();
        const res = await apiFetch(`/api/receipts/all?${qs}`);
        if (!alive) return;
        const receipts = Array.isArray(res?.list || res?.receipts) ? (res.list || res.receipts) : [];
        setData(receipts);
        
        const uniqueDevices = [...new Set(receipts.map(r => r.device_id || r.deviceId).filter(Boolean))];
        setDevices(uniqueDevices);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load analytics");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [from, to]);

  const filteredData = useMemo(() => {
    if (selectedDevice === "all") return data;
    return data.filter(r => (r.device_id || r.deviceId) === selectedDevice);
  }, [data, selectedDevice]);

  const totals = useMemo(() => {
    const t = { receipts: 0, utilized: 0, energy: 0 };
    for (const r of filteredData) {
      t.receipts += 1;
      t.utilized += Number(r?.amountUtilized || 0);
      t.energy += Number(r?.energyConsumed || 0);
    }
    return t;
  }, [filteredData]);

  const buckets = useMemo(() => bucketsFor(range, from, to), [range, from, to]);

  const series = useMemo(() => {
    const map = new Map(buckets.map((k) => [k, { receipts: 0, utilized: 0, energy: 0 }]));
    const keyOf = (dt) => {
      const d = new Date(dt);
      if (range === "day") return d.toISOString().slice(0, 10);
      if (range === "week") {
        const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        const day = (dd.getUTCDay() + 6) % 7;
        dd.setUTCDate(dd.getUTCDate() - day);
        const y = dd.getUTCFullYear();
        const firstJan = new Date(Date.UTC(y, 0, 1));
        const w = Math.floor((((dd - firstJan) / 86400000) + ((firstJan.getUTCDay() + 6) % 7)) / 7) + 1;
        return `${y}-W${String(w).padStart(2, "0")}`;
      }
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    };
    for (const r of filteredData) {
      const k = keyOf(r?.createdAt || r?.timestamp || r?._id);
      if (!map.has(k)) continue;
      const v = map.get(k);
      v.receipts += 1;
      v.utilized += Number(r?.amountUtilized || 0);
      v.energy += Number(r?.energyConsumed || 0);
    }
    return { labels: buckets, points: buckets.map((k) => map.get(k)) };
  }, [filteredData, buckets, range]);

  const BarChart = ({ data, color, title, unit = "" }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data, 1);
    // Fixed container width to prevent horizontal overflow
    const containerWidth = 320; // Fixed width for mobile
    const chartPadding = 60; // Left padding for Y-axis labels
    const availableWidth = containerWidth - chartPadding;
    const barWidth = Math.max(15, Math.min(30, availableWidth / Math.max(data.length, 1) - 4));
    const actualChartWidth = Math.max(containerWidth, data.length * (barWidth + 4) + chartPadding);
    const chartHeight = 260;
    
    const formatLabel = (label, index) => {
      if (range === "day") {
        const date = new Date(label);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      } else if (range === "week") {
        return label.split('-W')[1] ? `W${label.split('-W')[1]}` : label;
      } else {
        return label.split('-')[1] ? label.split('-')[1] : label;
      }
    };

    return (
      <div style={styles.chartContainer}>
        <div style={styles.chartHeader}>
          <div style={styles.chartTitle}>{title}</div>
          <div style={styles.chartSubtitle}>
            Total: {fmt0(data.reduce((sum, val) => sum + val, 0))}{unit}
          </div>
        </div>
        
        <div style={styles.chartScrollContainer}>
          <svg 
            width={actualChartWidth} 
            height={chartHeight} 
            style={styles.chartSvg}
            viewBox={`0 0 ${actualChartWidth} ${chartHeight}`}
            preserveAspectRatio="xMinYMin meet"
          >
            {/* Y-axis labels and grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const value = Math.round(maxValue * ratio);
              const y = chartHeight - 60 - (ratio * (chartHeight - 100));
              return (
                <g key={i}>
                  <line 
                    x1={50} 
                    y1={y} 
                    x2={actualChartWidth - 10} 
                    y2={y} 
                    stroke="#333" 
                    strokeWidth="1" 
                    strokeDasharray={i === 0 ? "none" : "2,2"}
                    opacity="0.5"
                  />
                  <text 
                    x={45} 
                    y={y + 3} 
                    textAnchor="end" 
                    fontSize="9" 
                    fill="#666"
                  >
                    {fmt0(value)}
                  </text>
                </g>
              );
            })}
            
            {/* Bars */}
            {data.map((value, index) => {
              const barHeight = (value / maxValue) * (chartHeight - 100);
              const x = 55 + index * (barWidth + 4);
              const y = chartHeight - 60 - barHeight;
              
              return (
                <g key={index}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 1)}
                    fill={color}
                    rx="2"
                    ry="2"
                  />
                  
                  {/* Value label on top of bar */}
                  {value > 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fontSize="8"
                      fill="#fff"
                      fontWeight="600"
                    >
                      {fmt0(value)}
                    </text>
                  )}
                  
                  {/* X-axis label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - 35}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#999"
                  >
                    {formatLabel(series.labels[index], index)}
                  </text>
                </g>
              );
            })}
            
            {/* Chart title at bottom */}
            <text
              x={actualChartWidth / 2}
              y={chartHeight - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#666"
              fontWeight="500"
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}wise Data
            </text>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Analytics</h1>
          <div style={styles.subtitle}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* Top Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <ReceiptIcon style={{ color: '#04BFBF', fontSize: '24px' }} />
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{fmt0(totals.receipts)}</div>
              <div style={styles.statLabel}>Total Receipts</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <AttachMoneyIcon style={{ color: '#f97316', fontSize: '24px' }} />
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>₹{fmt0(totals.utilized)}</div>
              <div style={styles.statLabel}>Amount Utilized</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <BoltIcon style={{ color: '#22c55e', fontSize: '24px' }} />
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{fmt0(totals.energy)}</div>
              <div style={styles.statLabel}>Energy (kWh)</div>
            </div>
          </div>
        </div>

        {/* Time Range Filter */}
        <div style={styles.filterSection}>
          <div style={styles.filterRow}>
            {['day', 'week', 'month'].map((timeRange) => (
              <Chip
                key={timeRange}
                label={timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}
                onClick={() => setRange(timeRange)}
                style={{
                  ...styles.timeChip,
                  ...(range === timeRange ? styles.activeTimeChip : {})
                }}
              />
            ))}
          </div>
        </div>

        {/* Device Selector */}
        <div style={styles.deviceSelector}>
          <FormControl fullWidth>
            <Select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              style={styles.select}
              MenuProps={{
                PaperProps: {
                  style: styles.selectMenu
                }
              }}
            >
              <MenuItem value="all" style={styles.menuItem}>All Devices</MenuItem>
              {devices.map((deviceId) => (
                <MenuItem key={deviceId} value={deviceId} style={styles.menuItem}>
                  {deviceId}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* Charts */}
        {loading ? (
          <div style={styles.loading}>Loading analytics...</div>
        ) : err ? (
          <div style={styles.error}>Error: {err}</div>
        ) : (
          <div style={styles.chartsSection}>
            <BarChart 
              data={series.points.map(p => p.receipts)} 
              color="#04BFBF" 
              title="Total Receipts"
            />
            <BarChart 
              data={series.points.map(p => p.utilized)} 
              color="#f97316" 
              title="Amount Utilized"
              unit="₹"
            />
            <BarChart 
              data={series.points.map(p => p.energy)} 
              color="#22c55e" 
              title="Energy Consumed"
              unit=" kWh"
            />
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: '#000',
    minHeight: '100%',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    width: '100%', // Ensure full width containment
    maxWidth: '100vw', // Prevent horizontal overflow
    overflowX: 'hidden' // Hide any horizontal overflow
  },
  content: {
    padding: '0',
    paddingBottom: '40px',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box'
  },
  header: {
    padding: '16px 0 24px 0',
    textAlign: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#fff'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '400'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
    width: '100%'
  },
  statCard: {
    background: '#1a1a1a',
    borderRadius: '12px',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '1px solid #333'
  },
  statIcon: {
    marginBottom: '8px'
  },
  statContent: {
    textAlign: 'center'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
    fontWeight: '500'
  },
  filterSection: {
    marginBottom: '20px'
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  timeChip: {
    backgroundColor: '#1a1a1a',
    color: '#ccc',
    border: '1px solid #333',
    fontSize: '14px',
    fontWeight: '500'
  },
  activeTimeChip: {
    backgroundColor: '#04BFBF',
    color: '#000',
    fontWeight: '600'
  },
  deviceSelector: {
    marginBottom: '24px',
    width: '100%'
  },
  select: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderRadius: '8px',
    border: '1px solid #333',
    width: '100%',
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none'
    },
    '& .MuiSelect-icon': {
      color: '#fff'
    }
  },
  selectMenu: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333'
  },
  menuItem: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#333'
    }
  },
  chartsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%'
  },
  chartContainer: {
    background: '#1a1a1a',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #333',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden' // Prevent container overflow
  },
  chartHeader: {
    marginBottom: '16px'
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '4px'
  },
  chartSubtitle: {
    fontSize: '14px',
    color: '#04BFBF',
    fontWeight: '500'
  },
  chartScrollContainer: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    maxWidth: '100%',
    // Custom scrollbar styling for better UX
    '::-webkit-scrollbar': {
      height: '6px'
    },
    '::-webkit-scrollbar-track': {
      background: '#333'
    },
    '::-webkit-scrollbar-thumb': {
      background: '#666',
      borderRadius: '3px'
    }
  },
  chartSvg: {
    width: '100%',
    height: 'auto',
    maxWidth: '100%',
    display: 'block'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#ff6b6b',
    fontSize: '16px'
  }
};

export default OwnerAnalytics;
