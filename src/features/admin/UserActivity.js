// src/features/admin/UserActivity.js
import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Card, Table, TableHead, TableBody,
  TableRow, TableCell, CircularProgress, Tabs, Tab, Chip,
  TextField, InputAdornment, Avatar, Tooltip, Collapse,
  Badge, IconButton, LinearProgress
} from '@mui/material';
import PeopleIcon            from '@mui/icons-material/People';
import TrendingDownIcon      from '@mui/icons-material/TrendingDown';
import LocationOnIcon        from '@mui/icons-material/LocationOn';
import BarChartIcon          from '@mui/icons-material/BarChart';
import TimelineIcon          from '@mui/icons-material/Timeline';
import SearchIcon            from '@mui/icons-material/Search';
import ExpandMoreIcon        from '@mui/icons-material/ExpandMore';
import ExpandLessIcon        from '@mui/icons-material/ExpandLess';
import RefreshIcon           from '@mui/icons-material/Refresh';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import OpenInNewIcon         from '@mui/icons-material/OpenInNew';
import ArrowBackIcon         from '@mui/icons-material/ArrowBack';
import AccessTimeIcon        from '@mui/icons-material/AccessTime';
import RouteIcon             from '@mui/icons-material/Route';
import { apiFetch }          from '../../utils/apiFetch';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:           '#08191c',
  surface:      '#0b2126',
  surface2:     '#0d2830',
  border:       '#163038',
  border2:      '#1e4048',
  teal:         '#04bfbf',
  tealDim:      '#04bfbf22',
  tealMid:      '#04bfbf44',
  green:        '#22c55e',
  greenDim:     '#22c55e1a',
  orange:       '#f97316',
  orangeDim:    '#f9731622',
  red:          '#ef4444',
  textPrimary:  '#e8f6f8',
  textSecondary:'#7ab8be',
  textFaint:    '#3e7278',
  fontMono:     'SFMono-Regular, Consolas, monospace',
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const card = {
  bgcolor: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 3,
  color: T.textPrimary,
  overflow: 'hidden',
};
const headCell = {
  color: T.teal, borderColor: T.border, fontWeight: 700,
  fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8,
  py: 1.5, whiteSpace: 'nowrap', bgcolor: T.surface2,
};
const bodyCell = {
  color: T.textPrimary, borderColor: T.border, fontSize: 13, py: 1.4,
};
const row = { '&:hover': { bgcolor: '#0d2830' }, transition: 'background 150ms' };

const EmptyState = ({ colSpan, msg = 'No data yet' }) => (
  <TableRow>
    <TableCell colSpan={colSpan} sx={{ ...bodyCell, textAlign: 'center', py: 6, color: T.textFaint, borderBottom: 'none' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: 28, lineHeight: 1 }}>📭</Typography>
        <Typography sx={{ fontSize: 13 }}>{msg}</Typography>
      </Box>
    </TableCell>
  </TableRow>
);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const PAGE_LABELS = {
  '/home': '🏠 Home', '/profile': '👤 Profile', '/sessions': '⚡ Sessions',
  '/transactions': '💳 Transactions', '/wallet/topup': '💰 Wallet Top-up',
  '/qr-scanner': '📷 QR Scanner', '/session-summary': '📋 Session Summary',
  '/welcome': '👋 Welcome', '/login': '🔐 Login',
};
const friendlyPage = (p) => {
  if (!p) return '—';
  if (PAGE_LABELS[p]) return PAGE_LABELS[p];
  if (p.startsWith('/charging-options/')) return '🔌 Charging Options';
  if (p.startsWith('/live-session/'))     return '⚡ Live Session';
  if (p.startsWith('/session-start/'))    return '▶️ Session Start';
  if (p.startsWith('/admin/'))            return '🛠 Admin › ' + p.split('/admin/')[1];
  if (p.startsWith('/owner/'))            return '👷 Owner › ' + p.split('/owner/')[1];
  return p;
};
const fmtTime = (sec) => {
  if (!sec || sec < 1) return '< 1s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return `${m}m${s > 0 ? ` ${s}s` : ''}`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtDate = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—';
const fmtDateShort = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
  : '—';
const isOnline    = (d) => d && (Date.now() - new Date(d).getTime()) < 5 * 60 * 1000;
const initials    = (n) => n ? n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) : '??';
const avatarBg    = (n) => ['#04bfbf33','#22c55e22','#f9731622','#a855f722','#3b82f622'][n ? n.charCodeAt(0) % 5 : 0];
const avatarColor = (n) => ['#04bfbf','#22c55e','#f97316','#a855f7','#3b82f6'][n ? n.charCodeAt(0) % 5 : 0];

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color = T.teal, sub }) => (
  <Card sx={{ ...card, p: 2.5, flex: 1, minWidth: 130 }}>
    <Box sx={{ bgcolor: `${color}18`, borderRadius: 2, p: 0.8, lineHeight: 0, width: 'fit-content', mb: 1.5 }}>
      {icon}
    </Box>
    <Typography sx={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1, mb: 0.3 }}>{value}</Typography>
    <Typography sx={{ fontSize: 11, color: T.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Typography>
    {sub && <Typography sx={{ fontSize: 10, color: T.textFaint, mt: 0.3 }}>{sub}</Typography>}
  </Card>
);

// ─── PAGE BAR (Top Pages) ─────────────────────────────────────────────────────
const PageBar = ({ rank, page, visits, maxVisits, uniqueUsers, avgTimeSec, lastSeen }) => {
  const pct = maxVisits ? Math.round((visits / maxVisits) * 100) : 0;
  return (
    <Box sx={{ py: 1.8, borderBottom: `1px solid ${T.border}`, '&:last-child': { borderBottom: 'none' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
        <Typography sx={{ fontSize: 11, color: T.textFaint, fontFamily: T.fontMono, minWidth: 22, textAlign: 'right' }}>{rank}</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, color: T.textPrimary, fontWeight: 600, lineHeight: 1.3, mb: 0.2 }}>{friendlyPage(page)}</Typography>
          <Typography sx={{ fontSize: 10, color: T.teal, opacity: 0.5, fontFamily: T.fontMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page}</Typography>
        </Box>
        <Chip label={visits} size="small" sx={{ bgcolor: T.tealDim, color: T.teal, fontWeight: 800, fontSize: 12, minWidth: 38, height: 22 }} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 22 }} />
        <Box sx={{ flex: 1 }}>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 99, bgcolor: T.border2, '& .MuiLinearProgress-bar': { bgcolor: T.teal, borderRadius: 99 } }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Tooltip title="Unique users" arrow><Typography sx={{ fontSize: 11, color: T.textSecondary }}>👥 {uniqueUsers}</Typography></Tooltip>
          <Tooltip title="Avg time" arrow><Typography sx={{ fontSize: 11, color: T.orange }}>⏱ {fmtTime(avgTimeSec)}</Typography></Tooltip>
          <Typography sx={{ fontSize: 11, color: T.textFaint, display: { xs: 'none', md: 'block' } }}>{fmtDate(lastSeen)}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

// ─── DROPOFF ROW ──────────────────────────────────────────────────────────────
const DropoffRow = ({ rank, page, count, maxCount, lastSeen }) => {
  const pct      = maxCount ? Math.round((count / maxCount) * 100) : 0;
  const severity = pct > 60 ? T.red : pct > 30 ? T.orange : T.textSecondary;
  return (
    <Box sx={{ py: 1.8, borderBottom: `1px solid ${T.border}`, '&:last-child': { borderBottom: 'none' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
        <Typography sx={{ fontSize: 11, color: T.textFaint, fontFamily: T.fontMono, minWidth: 22, textAlign: 'right' }}>{rank}</Typography>
        <Typography sx={{ fontSize: 13, color: T.textPrimary, fontWeight: 600, flex: 1 }}>{friendlyPage(page)}</Typography>
        <Chip label={`${count} exits`} size="small" sx={{ bgcolor: `${severity}1a`, color: severity, fontWeight: 700, fontSize: 11, height: 22 }} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 22 }} />
        <Box sx={{ flex: 1 }}>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 99, bgcolor: T.border2, '& .MuiLinearProgress-bar': { bgcolor: severity, borderRadius: 99 } }} />
        </Box>
        <Typography sx={{ fontSize: 11, color: T.textFaint, display: { xs: 'none', sm: 'block' } }}>Last: {fmtDate(lastSeen)}</Typography>
      </Box>
    </Box>
  );
};

// ─── USER ROW ─────────────────────────────────────────────────────────────────
const UserRow = ({ u, onViewJourney }) => {
  const online = isOnline(u.lastSeen);
  return (
    <TableRow sx={row}>
      {/* User */}
      <TableCell sx={{ ...bodyCell, minWidth: 160 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: avatarBg(u.name), color: avatarColor(u.name), fontSize: 12, fontWeight: 700 }}>
              {initials(u.name)}
            </Avatar>
            {online && <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, bgcolor: T.green, borderRadius: '50%', border: `2px solid ${T.surface}` }} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
              {u.name || '—'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: T.textFaint, fontFamily: T.fontMono }}>
              {u.mobile || u.email || '—'}
            </Typography>
          </Box>
        </Box>
      </TableCell>

      {/* Status */}
      <TableCell sx={{ ...bodyCell, display: { xs: 'none', sm: 'table-cell' } }} align="center">
        <Chip
          icon={<FiberManualRecordIcon sx={{ fontSize: '9px !important', color: `${online ? T.green : T.textFaint} !important` }} />}
          label={online ? 'Online' : 'Offline'} size="small"
          sx={{ bgcolor: online ? T.greenDim : '#ffffff08', color: online ? T.green : T.textFaint, fontSize: 11, height: 22, fontWeight: 600 }}
        />
      </TableCell>

      {/* Last Seen */}
      <TableCell sx={{ ...bodyCell, fontSize: 11, color: T.textSecondary, display: { xs: 'none', md: 'table-cell' } }} align="right">
        {fmtDate(u.lastSeen)}
      </TableCell>

      {/* Last Page */}
      <TableCell sx={{ ...bodyCell, display: { xs: 'none', lg: 'table-cell' } }} align="right">
        <Typography sx={{ fontSize: 12, color: '#a3d9dd', maxWidth: 140, ml: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>
          {friendlyPage(u.lastPage?.page)}
        </Typography>
      </TableCell>

      {/* Visits */}
      <TableCell sx={{ ...bodyCell, display: { xs: 'none', sm: 'table-cell' } }} align="right">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.3 }}>
          <Chip label={u.totalPages} size="small" sx={{ bgcolor: T.tealDim, color: T.teal, fontWeight: 700, fontSize: 11, height: 20 }} />
          <Typography sx={{ fontSize: 10, color: T.textFaint }}>{u.activeDays}d active</Typography>
        </Box>
      </TableCell>

      {/* Time */}
      <TableCell sx={{ ...bodyCell, color: T.orange, fontSize: 12, display: { xs: 'none', md: 'table-cell' } }} align="right">
        {fmtTime(u.totalTimeSec)}
      </TableCell>

      {/* Last Location */}
      <TableCell sx={{ ...bodyCell, display: { xs: 'none', xl: 'table-cell' } }} align="right">
        {u.lastLocation?.lat ? (
          <Tooltip title={`GPS accuracy: ~${u.lastLocation.accuracy || '?'}m`} arrow>
            <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.3 }}>
              <Typography sx={{ fontSize: 11, color: '#a3d9dd', fontFamily: T.fontMono }}>
                {u.lastLocation.lat.toFixed(4)}, {u.lastLocation.lng.toFixed(4)}
              </Typography>
              <Box component="a"
                href={`https://maps.google.com/?q=${u.lastLocation.lat},${u.lastLocation.lng}`}
                target="_blank" rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.3, fontSize: 10, color: T.teal, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                📍 Maps <OpenInNewIcon sx={{ fontSize: 9 }} />
              </Box>
            </Box>
          </Tooltip>
        ) : (
          <Typography sx={{ fontSize: 11, color: T.textFaint }}>No GPS</Typography>
        )}
      </TableCell>

      {/* Nearest Charger */}
      <TableCell sx={{ ...bodyCell, display: { xs: 'none', lg: 'table-cell' } }} align="right">
        {u.nearestCharger ? (
          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.4 }}>
            <Typography sx={{ fontSize: 12, color: T.textPrimary, fontWeight: 600, lineHeight: 1.2, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {u.nearestCharger.location}
            </Typography>
            <Typography sx={{ fontSize: 10, color: T.textSecondary }}>{u.nearestCharger.area}, {u.nearestCharger.city}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Chip
                label={u.nearestCharger.distanceM >= 1000 ? `${(u.nearestCharger.distanceM / 1000).toFixed(1)} km` : `${u.nearestCharger.distanceM} m`}
                size="small"
                sx={{
                  fontSize: 10, height: 18, fontWeight: 700,
                  bgcolor: u.nearestCharger.distanceM < 500 ? T.greenDim : u.nearestCharger.distanceM < 2000 ? T.tealDim : '#ffffff0a',
                  color:   u.nearestCharger.distanceM < 500 ? T.green   : u.nearestCharger.distanceM < 2000 ? T.teal    : T.textSecondary,
                }}
              />
              <Chip label={u.nearestCharger.status} size="small"
                sx={{ fontSize: 10, height: 18, bgcolor: u.nearestCharger.status === 'available' ? T.greenDim : T.orangeDim, color: u.nearestCharger.status === 'available' ? T.green : T.orange }}
              />
            </Box>
          </Box>
        ) : (
          <Typography sx={{ fontSize: 11, color: T.textFaint }}>—</Typography>
        )}
      </TableCell>

      {/* Journey */}
      <TableCell sx={bodyCell} align="center">
        <Tooltip title="View full journey" arrow>
          <IconButton size="small" onClick={() => onViewJourney(u._id, u.name)}
            sx={{ color: T.teal, bgcolor: T.tealDim, borderRadius: 1.5, width: 30, height: 30, '&:hover': { bgcolor: T.tealMid } }}>
            <RouteIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function UserActivity() {
  const [tab,         setTab]         = useState(0);
  const [summary,     setSummary]     = useState([]);
  const [dropoffs,    setDropoffs]    = useState([]);
  const [users,       setUsers]       = useState([]);
  const [heatmap,     setHeatmap]     = useState({ chargerStats: [], pings: [] });
  const [journey,     setJourney]     = useState(null);
  const [journeyData, setJourneyData] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [expanded,    setExpanded]    = useState(null);

  const fetchData = (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    Promise.all([
      apiFetch('/api/activity/summary'),
      apiFetch('/api/activity/dropoffs'),
      apiFetch('/api/activity/users'),
      apiFetch('/api/activity/location-heatmap'),
    ]).then(([s, d, u, h]) => {
      setSummary(Array.isArray(s) ? s : []);
      setDropoffs(Array.isArray(d) ? d : []);
      setUsers(Array.isArray(u) ? u : []);
      setHeatmap(h?.chargerStats ? h : { chargerStats: [], pings: [] });
    }).catch(console.error)
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const loadJourney = async (userId, userName) => {
    setJourney(userName);
    setJourneyData([]);
    setTab(3);
    const data = await apiFetch(`/api/activity/user/${userId}`);
    setJourneyData(Array.isArray(data) ? data : []);
  };

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile?.includes(search) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    ), [users, search]);

  const onlineCount = useMemo(() => users.filter(u => isOnline(u.lastSeen)).length, [users]);
  const maxVisits   = useMemo(() => summary.reduce((m, r) => Math.max(m, r.visits), 0), [summary]);
  const maxDropoffs = useMemo(() => dropoffs.reduce((m, r) => Math.max(m, r.count), 0), [dropoffs]);
  const totalTime   = useMemo(() => users.reduce((s, u) => s + (u.totalTimeSec || 0), 0), [users]);

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
      <CircularProgress sx={{ color: T.teal }} size={36} thickness={3} />
      <Typography sx={{ color: T.textSecondary, fontSize: 13 }}>Loading activity data…</Typography>
    </Box>
  );

  const TABS = [
    { icon: <BarChartIcon sx={{ fontSize: 15 }} />,     label: 'Top Pages' },
    { icon: <TrendingDownIcon sx={{ fontSize: 15 }} />, label: 'Drop-offs' },
    { icon: <PeopleIcon sx={{ fontSize: 15 }} />,       label: 'Users', badge: onlineCount },
    { icon: <TimelineIcon sx={{ fontSize: 15 }} />,     label: journey ? journey.split(' ')[0] : 'Journey' },
    { icon: <LocationOnIcon sx={{ fontSize: 15 }} />,   label: 'Heatmap' },
  ];

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 }, bgcolor: T.bg, minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 800, color: T.teal, lineHeight: 1.2 }}>User Activity</Typography>
          <Typography sx={{ fontSize: 12, color: T.textFaint, mt: 0.3 }}>Real-time tracking · Page visits · Drop-offs · Locations</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Tooltip title={refreshing ? 'Refreshing…' : 'Refresh data'} arrow>
            <IconButton onClick={() => fetchData(true)} disabled={refreshing} size="small"
              sx={{ color: T.teal, border: `1px solid ${T.border}`, borderRadius: 1.5, width: 34, height: 34, '&:hover': { bgcolor: T.tealDim, borderColor: T.teal }, '&.Mui-disabled': { opacity: 0.4 } }}>
              <RefreshIcon sx={{ fontSize: 17, animation: refreshing ? 'ua-spin 0.8s linear infinite' : 'none', '@keyframes ua-spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            </IconButton>
          </Tooltip>
          <Chip icon={<FiberManualRecordIcon sx={{ color: `${T.green} !important`, fontSize: '10px !important' }} />}
            label={`${onlineCount} Online`} size="small"
            sx={{ bgcolor: T.greenDim, color: T.green, border: `1px solid ${T.green}33`, fontWeight: 600, fontSize: 11 }} />
          <Chip label={`${users.length} Tracked`} size="small"
            sx={{ bgcolor: T.tealDim, color: T.teal, border: `1px solid ${T.teal}33`, fontWeight: 600, fontSize: 11 }} />
        </Box>
      </Box>

      {/* ── KPI CARDS ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { height: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.border2, borderRadius: 99 } }}>
        <KpiCard icon={<PeopleIcon sx={{ fontSize: 18, color: T.teal }} />}         label="Total Users"   value={users.length}       color={T.teal}   sub={`${onlineCount} online now`} />
        <KpiCard icon={<BarChartIcon sx={{ fontSize: 18, color: '#a855f7' }} />}    label="Pages Tracked" value={summary.length}     color="#a855f7"  sub="unique routes" />
        <KpiCard icon={<TrendingDownIcon sx={{ fontSize: 18, color: T.orange }} />} label="Exit Points"   value={dropoffs.length}    color={T.orange} sub="pages users left from" />
        <KpiCard icon={<AccessTimeIcon sx={{ fontSize: 18, color: T.green }} />}    label="Total Time"    value={fmtTime(totalTime)} color={T.green}  sub="all users combined" />
        <KpiCard icon={<LocationOnIcon sx={{ fontSize: 18, color: '#3b82f6' }} />}  label="Chargers"      value={heatmap.chargerStats?.length || 0} color="#3b82f6" sub="with location data" />
      </Box>

      {/* ── TABS ── */}
      <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5, p: 0.6, mb: 3, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons={false}
          sx={{
            minHeight: 38,
            '& .MuiTabs-flexContainer': { gap: 0.5 },
            '& .MuiTab-root': { color: T.textSecondary, minHeight: 38, fontSize: 12, fontWeight: 600, textTransform: 'none', borderRadius: 1.5, px: 1.8, py: 0, minWidth: 'auto', transition: 'all 150ms', '&:hover': { color: T.teal, bgcolor: T.tealDim }, '&.Mui-selected': { color: T.teal, bgcolor: T.tealDim } },
            '& .MuiTabs-indicator': { display: 'none' },
          }}>
          {TABS.map((t, i) => (
            <Tab key={i} icon={t.icon} iconPosition="start"
              label={t.badge > 0
                ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    {t.label}
                    <Badge badgeContent={t.badge} color="success" sx={{ '& .MuiBadge-badge': { fontSize: 8, minWidth: 14, height: 14, right: -6, top: -1 } }} />
                  </Box>
                : t.label}
            />
          ))}
        </Tabs>
      </Box>

      {/* ══ TAB 0 — TOP PAGES ══════════════════════════════════════════════════ */}
      {tab === 0 && (
        <Card sx={{ ...card, p: 0 }}>
          <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>Most Visited Pages</Typography>
            <Typography sx={{ fontSize: 12, color: T.textSecondary, mt: 0.3 }}>Ranked by total visits · {summary.length} unique routes tracked</Typography>
          </Box>
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
            {summary.length === 0
              ? <Box sx={{ py: 6, textAlign: 'center' }}><Typography sx={{ fontSize: 28 }}>📭</Typography><Typography sx={{ fontSize: 13, color: T.textFaint, mt: 1 }}>No page visit data yet</Typography></Box>
              : summary.map((r, i) => <PageBar key={r._id} rank={i + 1} page={r._id} visits={r.visits} maxVisits={maxVisits} uniqueUsers={r.uniqueUsers} avgTimeSec={r.avgTimeSec} lastSeen={r.lastSeen} />)
            }
          </Box>
        </Card>
      )}

      {/* ══ TAB 1 — DROP-OFFS ══════════════════════════════════════════════════ */}
      {tab === 1 && (
        <Card sx={{ ...card, p: 0 }}>
          <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>User Drop-off Points</Typography>
            <Typography sx={{ fontSize: 12, color: T.textSecondary, mt: 0.3 }}>Last page before users exited — <span style={{ color: T.orange }}>high numbers = UX friction</span></Typography>
          </Box>
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
            {dropoffs.length === 0
              ? <Box sx={{ py: 6, textAlign: 'center' }}><Typography sx={{ fontSize: 28 }}>📭</Typography><Typography sx={{ fontSize: 13, color: T.textFaint, mt: 1 }}>No drop-off data yet</Typography></Box>
              : dropoffs.map((r, i) => <DropoffRow key={r._id} rank={i + 1} page={r._id} count={r.count} maxCount={maxDropoffs} lastSeen={r.lastSeen} />)
            }
          </Box>
        </Card>
      )}

      {/* ══ TAB 2 — USERS ══════════════════════════════════════════════════════ */}
      {tab === 2 && (
        <Card sx={{ ...card, p: 0 }}>
          <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>All Tracked Users</Typography>
              <Typography sx={{ fontSize: 12, color: T.textSecondary, mt: 0.3 }}>{filteredUsers.length} of {users.length} users shown</Typography>
            </Box>
            <TextField size="small" placeholder="Search name, mobile, email…"
              value={search} onChange={e => setSearch(e.target.value)}
              sx={{ width: { xs: '100%', sm: 260 } }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.textSecondary, fontSize: 17 }} /></InputAdornment>,
                sx: {
                  bgcolor: T.surface2, color: T.textPrimary, borderRadius: 2, fontSize: 13,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.border2 },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.teal },
                  '& input': { color: T.textPrimary },
                  '& input::placeholder': { color: T.textFaint, opacity: 1 },
                }
              }}
            />
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={headCell}>User</TableCell>
                  <TableCell sx={{ ...headCell, display: { xs: 'none', sm: 'table-cell' } }} align="center">Status</TableCell>
                  <TableCell sx={{ ...headCell, display: { xs: 'none', md: 'table-cell' } }} align="right">Last Seen</TableCell>
                  <TableCell sx={{ ...headCell, display: { xs: 'none', lg: 'table-cell' } }} align="right">Last Page</TableCell>
                  <TableCell sx={{ ...headCell, display: { xs: 'none', sm: 'table-cell' } }} align="right">Visits</TableCell>
                  <TableCell sx={{ ...headCell, display: { xs: 'none', md: 'table-cell' } }} align="right">Time</TableCell>
                  <TableCell sx={{ ...headCell, display: { xs: 'none', xl: 'table-cell' } }} align="right">Last Location</TableCell>
                  <TableCell sx={{ ...headCell, display: { xs: 'none', lg: 'table-cell' } }} align="right">Nearest Charger</TableCell>
                  <TableCell sx={headCell} align="center">Journey</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length > 0
                  ? filteredUsers.map(u => <UserRow key={u._id} u={u} onViewJourney={loadJourney} />)
                  : <EmptyState colSpan={9} msg={search ? `No users matching "${search}"` : 'No user data yet'} />
                }
              </TableBody>
            </Table>
          </Box>
          {filteredUsers.length > 0 && filteredUsers.every(u => !u.lastLocation?.lat) && (
            <Box sx={{ p: 2, borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 11, color: T.textFaint }}>📍 Location columns populate once users grant GPS permission</Typography>
            </Box>
          )}
        </Card>
      )}

      {/* ══ TAB 3 — USER JOURNEY ═══════════════════════════════════════════════ */}
      {tab === 3 && (
        <Card sx={{ ...card, p: 0 }}>
          {!journey ? (
            <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
              <RouteIcon sx={{ fontSize: 52, color: T.tealDim, mb: 2 }} />
              <Typography sx={{ fontSize: 15, color: T.textPrimary, fontWeight: 600, mb: 1 }}>No user selected</Typography>
              <Typography sx={{ fontSize: 13, color: T.textSecondary }}>
                Go to <b style={{ color: T.teal }}>Users</b> tab and click the <RouteIcon sx={{ fontSize: 13, verticalAlign: 'middle', color: T.teal }} /> icon
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <IconButton size="small" onClick={() => { setJourney(null); setTab(2); }}
                  sx={{ color: T.teal, bgcolor: T.tealDim, borderRadius: 1.5, '&:hover': { bgcolor: T.tealMid } }}>
                  <ArrowBackIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>
                    Journey · <span style={{ color: T.teal }}>{journey}</span>
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: T.textSecondary, mt: 0.2 }}>Last 30 days · newest first · click a day to expand</Typography>
                </Box>
                {journeyData.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={`${journeyData.length} days`} size="small" sx={{ bgcolor: T.tealDim, color: T.teal, fontWeight: 700, fontSize: 11 }} />
                    <Chip label={fmtTime(journeyData.reduce((s, d) => s + (d.pages || []).reduce((a, p) => a + (p.timeSpentSec || 0), 0), 0))}
                      size="small" sx={{ bgcolor: `${T.orange}1a`, color: T.orange, fontWeight: 700, fontSize: 11 }} />
                  </Box>
                )}
              </Box>

              <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                {journeyData.length === 0
                  ? <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress sx={{ color: T.teal }} size={24} /><Typography sx={{ fontSize: 12, color: T.textSecondary, mt: 1.5 }}>Loading…</Typography></Box>
                  : journeyData.map((day) => {
                      const dayTime = (day.pages || []).reduce((a, p) => a + (p.timeSpentSec || 0), 0);
                      const isExp   = expanded === day.date;
                      return (
                        <Box key={day.date} sx={{ mb: 1.5 }}>
                          <Box onClick={() => setExpanded(isExp ? null : day.date)}
                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: T.surface2, borderRadius: isExp ? '12px 12px 0 0' : 2, px: 2, py: 1.4, cursor: 'pointer', border: `1px solid ${isExp ? T.border2 : T.border}`, transition: 'all 150ms', '&:hover': { borderColor: T.teal, bgcolor: '#0f2d34' } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography sx={{ color: T.teal, fontWeight: 700, fontSize: 13, fontFamily: T.fontMono }}>{fmtDateShort(day.date)}</Typography>
                              <Chip label={`${day.pages?.length || 0} pages`} size="small" sx={{ bgcolor: T.tealDim, color: T.teal, fontSize: 10, height: 20 }} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Typography sx={{ color: T.orange, fontSize: 11, fontWeight: 600 }}>{fmtTime(dayTime)}</Typography>
                              {isExp ? <ExpandLessIcon sx={{ color: T.textSecondary, fontSize: 17 }} /> : <ExpandMoreIcon sx={{ color: T.textSecondary, fontSize: 17 }} />}
                            </Box>
                          </Box>
                          <Collapse in={isExp}>
                            <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border2}`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ ...headCell, fontSize: 10 }}>#</TableCell>
                                    <TableCell sx={{ ...headCell, fontSize: 10 }}>Page</TableCell>
                                    <TableCell sx={{ ...headCell, fontSize: 10, display: { xs: 'none', sm: 'table-cell' } }} align="right">Visited At</TableCell>
                                    <TableCell sx={{ ...headCell, fontSize: 10 }} align="right">Duration</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(day.pages || []).map((p, i) => (
                                    <TableRow key={i} sx={row}>
                                      <TableCell sx={{ ...bodyCell, color: T.textFaint, width: 36, fontSize: 11 }}>{i + 1}</TableCell>
                                      <TableCell sx={bodyCell}>
                                        <Typography sx={{ fontSize: 13, color: T.textPrimary }}>{friendlyPage(p.page)}</Typography>
                                        <Typography sx={{ fontSize: 10, color: T.teal, opacity: 0.45, fontFamily: T.fontMono }}>{p.page}</Typography>
                                      </TableCell>
                                      <TableCell sx={{ ...bodyCell, fontSize: 11, color: T.textSecondary, display: { xs: 'none', sm: 'table-cell' } }} align="right">{fmtDate(p.visitedAt)}</TableCell>
                                      <TableCell sx={{ ...bodyCell, color: T.orange, fontSize: 12, fontWeight: 600 }} align="right">{fmtTime(p.timeSpentSec)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    })
                }
              </Box>
            </>
          )}
        </Card>
      )}

      {/* ══ TAB 4 — HEATMAP ════════════════════════════════════════════════════ */}
      {tab === 4 && (
        <Card sx={{ ...card, p: 0 }}>
          <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>Charger Location Heatmap</Typography>
            <Typography sx={{ fontSize: 12, color: T.textSecondary, mt: 0.3 }}>
              Ranked by nearby user opens within 500m · last 30 days · <span style={{ color: T.orange }}>high nearby + low sessions = investigate</span>
            </Typography>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 460 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={headCell}>#</TableCell>
                  <TableCell sx={headCell}>Charger / Location</TableCell>
                  <TableCell sx={headCell} align="right">Nearby Users</TableCell>
                  <TableCell sx={{ ...headCell, display: { xs: 'none', sm: 'table-cell' } }} align="center">Status</TableCell>
                  <TableCell sx={{ ...headCell, display: { xs: 'none', md: 'table-cell' } }} align="right">Last User Nearby</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {heatmap.chargerStats?.length > 0
                  ? heatmap.chargerStats.map((c, i) => (
                      <TableRow key={c.chargerId} sx={row}>
                        <TableCell sx={{ ...bodyCell, color: T.textFaint, width: 40, fontFamily: T.fontMono }}>{i + 1}</TableCell>
                        <TableCell sx={bodyCell}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{c.location}</Typography>
                          <Typography sx={{ fontSize: 11, color: T.textSecondary }}>{c.area}, {c.city}</Typography>
                          <Typography sx={{ fontSize: 10, color: T.textFaint, fontFamily: T.fontMono }}>ID: {c.deviceId}</Typography>
                        </TableCell>
                        <TableCell sx={bodyCell} align="right">
                          <Chip label={c.nearbyUsers || '0'} size="small"
                            sx={{ bgcolor: c.nearbyUsers > 10 ? T.greenDim : c.nearbyUsers > 0 ? T.tealDim : '#ffffff08', color: c.nearbyUsers > 10 ? T.green : c.nearbyUsers > 0 ? T.teal : T.textFaint, fontWeight: 800, fontSize: 12, minWidth: 36, height: 24 }}
                          />
                        </TableCell>
                        <TableCell sx={{ ...bodyCell, display: { xs: 'none', sm: 'table-cell' } }} align="center">
                          <Chip label={c.status} size="small"
                            sx={{ bgcolor: c.status === 'available' ? T.greenDim : T.orangeDim, color: c.status === 'available' ? T.green : T.orange, fontSize: 11, fontWeight: 600, height: 22 }}
                          />
                        </TableCell>
                        <TableCell sx={{ ...bodyCell, fontSize: 11, color: T.textSecondary, display: { xs: 'none', md: 'table-cell' } }} align="right">
                          {fmtDate(c.lastUserSeen)}
                        </TableCell>
                      </TableRow>
                    ))
                  : <EmptyState colSpan={5} msg="No charger data — GPS pings appear once users share location" />
                }
              </TableBody>
            </Table>
          </Box>
          {heatmap.chargerStats?.length > 0 && heatmap.chargerStats.every(c => c.nearbyUsers === 0) && (
            <Box sx={{ p: 2, borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 11, color: T.textFaint }}>📍 Chargers loaded. Nearby counts appear once users open the app with GPS enabled.</Typography>
            </Box>
          )}
        </Card>
      )}

      <Box sx={{ height: { xs: 32, sm: 0 } }} />
    </Box>
  );
}