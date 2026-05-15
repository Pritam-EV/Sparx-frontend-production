// src/features/admin/UserActivity.js
import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Card, Table, TableHead, TableBody,
  TableRow, TableCell, CircularProgress, Tabs, Tab, Chip,
  TextField, InputAdornment, Avatar, Tooltip, Collapse,
  Badge
} from '@mui/material';
import PeopleIcon        from '@mui/icons-material/People';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import LocationOnIcon    from '@mui/icons-material/LocationOn';
import BarChartIcon      from '@mui/icons-material/BarChart';
import TimelineIcon      from '@mui/icons-material/Timeline';
import SearchIcon        from '@mui/icons-material/Search';
import ExpandMoreIcon    from '@mui/icons-material/ExpandMore';
import ExpandLessIcon    from '@mui/icons-material/ExpandLess';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { apiFetch }      from '../../utils/apiFetch';

// ── Styles ────────────────────────────────────────────────────────────────────
const cardSx  = { bgcolor:'#0b1f23', border:'1px solid #1a3a3f', borderRadius:3, color:'#e6f9ff', p:3, mb:3 };
const cellSx  = { color:'#e6f9ff', borderColor:'#0e2d32', fontSize:13, py:1.2 };
const headSx  = { color:'#04bfbf', borderColor:'#1a3a3f', fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:0.5 };
const rowHover= { '&:hover':{ bgcolor:'#0d2b30' } };

// ── Helpers ───────────────────────────────────────────────────────────────────
const PAGE_LABELS = {
  '/home':'/home → 🏠 Home', '/profile':'👤 Profile',
  '/sessions':'⚡ Sessions', '/transactions':'💳 Transactions',
  '/wallet/topup':'💰 Wallet Top-up', '/qr-scanner':'📷 QR Scanner',
  '/session-summary':'📋 Session Summary', '/welcome':'👋 Welcome',
  '/login':'🔐 Login',
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
  if (sec < 60)  return `${sec}s`;
  const m = Math.floor(sec/60), s = sec%60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m/60)}h ${m%60}m`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN',{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
const isOnline = (d) => d && (Date.now() - new Date(d).getTime()) < 5 * 60 * 1000; // within 5 min
const initials = (name) => name ? name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '??';

// ── Component ─────────────────────────────────────────────────────────────────
export default function UserActivity() {
  const [tab,      setTab]      = useState(0);
  const [summary,  setSummary]  = useState([]);
  const [dropoffs, setDropoffs] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [heatmap,  setHeatmap]  = useState({ chargerStats: [], pings: [] });
  const [journey,  setJourney]  = useState(null);   // selected user's journey
  const [journeyData, setJourneyData] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null);   // expanded day row

  useEffect(() => {
Promise.all([
  apiFetch('/api/activity/summary'),
  apiFetch('/api/activity/dropoffs'),
  apiFetch('/api/activity/users'),
  apiFetch('/api/activity/location-heatmap'),
]).then(([s, d, u, h]) => {
  setSummary(Array.isArray(s) ? s : []);
  setDropoffs(Array.isArray(d) ? d : []);
  setUsers(Array.isArray(u) ? u : []);
  setHeatmap(h && h.chargerStats ? h : { chargerStats: [], pings: [] });
  setLoading(false);
}).catch(() => setLoading(false));
  }, []);

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
      u.mobile?.includes(search)
    ), [users, search]);

  const onlineCount = useMemo(() => users.filter(u => isOnline(u.lastSeen)).length, [users]);

  if (loading) return (
    <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh' }}>
      <CircularProgress sx={{ color:'#04bfbf' }} />
    </Box>
  );

  return (
    <Box sx={{ maxWidth:1100, mx:'auto', pt:2, px:{ xs:1, sm:2 } }}>

      {/* Header */}
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3, flexWrap:'wrap', gap:1 }}>
        <Typography variant="h5" sx={{ color:'#04bfbf', fontWeight:700 }}>
          User Activity Tracking
        </Typography>
        <Box sx={{ display:'flex', gap:2 }}>
          <Chip icon={<FiberManualRecordIcon sx={{ color:'#22c55e !important', fontSize:10 }} />}
            label={`${onlineCount} Online Now`} size="small"
            sx={{ bgcolor:'#22c55e18', color:'#22c55e', border:'1px solid #22c55e44' }} />
          <Chip label={`${users.length} Total Users Tracked`} size="small"
            sx={{ bgcolor:'#04bfbf18', color:'#04bfbf', border:'1px solid #04bfbf44' }} />
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
        mb:3, bgcolor:'#0b1f23', borderRadius:2, p:0.5,
        '& .MuiTab-root':{ color:'#7aa', minHeight:44, fontSize:12, fontWeight:600,
          '&.Mui-selected':{ color:'#04bfbf', bgcolor:'#04bfbf18', borderRadius:1.5 } },
        '& .MuiTabs-indicator':{ display:'none' }
      }}>
        <Tab icon={<BarChartIcon sx={{ fontSize:16 }} />} iconPosition="start" label="Top Pages" />
        <Tab icon={<TrendingDownIcon sx={{ fontSize:16 }} />} iconPosition="start" label="Drop-offs" />
        <Tab icon={<PeopleIcon sx={{ fontSize:16 }} />} iconPosition="start"
          label={<Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
            Users
            {onlineCount > 0 && <Badge badgeContent={onlineCount} color="success" sx={{ '& .MuiBadge-badge':{ fontSize:9, minWidth:16, height:16 } }} />}
          </Box>} />
        <Tab icon={<TimelineIcon sx={{ fontSize:16 }} />} iconPosition="start"
          label={journey ? `Journey: ${journey.split(' ')[0]}` : 'User Journey'} />

        <Tab icon={<TimelineIcon sx={{ fontSize:16 }} />} iconPosition="start"
          label={journey ? `Journey: ${journey.split(' ')[0]}` : 'User Journey'} />
        <Tab icon={<LocationOnIcon sx={{ fontSize:16 }} />} iconPosition="start" label="Location Heatmap" />
      </Tabs>  

      {/* ── TAB 0: Top Pages ─────────────────────────────────────────────────── */}
      {tab === 0 && (
        <Card sx={cardSx}>
          <Typography sx={{ color:'#04bfbf', fontWeight:600, mb:2 }}>
            Most visited pages — ranked by total visits
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>#</TableCell>
                <TableCell sx={headSx}>Page</TableCell>
                <TableCell sx={headSx} align="right">Visits</TableCell>
                <TableCell sx={headSx} align="right">Unique Users</TableCell>
                <TableCell sx={headSx} align="right">Avg Time</TableCell>
                <TableCell sx={headSx} align="right">Last Visit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((row, i) => (
                <TableRow key={row._id} sx={rowHover}>
                  <TableCell sx={{ ...cellSx, color:'#7aa', width:40 }}>{i+1}</TableCell>
                  <TableCell sx={cellSx}>
                    <Box>
                      <Typography sx={{ fontSize:13, color:'#e6f9ff' }}>{friendlyPage(row._id)}</Typography>
                      <Typography sx={{ fontSize:10, color:'#04bfbf66', fontFamily:'monospace' }}>{row._id}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={cellSx} align="right">
                    <Chip label={row.visits} size="small"
                      sx={{ bgcolor:'#04bfbf22', color:'#04bfbf', fontWeight:700, fontSize:12 }} />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color:'#a3d9dd' }} align="right">{row.uniqueUsers}</TableCell>
                  <TableCell sx={{ ...cellSx, color:'#f97316' }} align="right">{fmtTime(row.avgTimeSec)}</TableCell>
                  <TableCell sx={{ ...cellSx, opacity:0.6, fontSize:11 }} align="right">{fmtDate(row.lastSeen)}</TableCell>
                </TableRow>
              ))}
              {summary.length === 0 && (
                <TableRow><TableCell colSpan={6} sx={{ ...cellSx, textAlign:'center', opacity:0.4, py:4 }}>
                  No page visit data yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── TAB 1: Drop-offs ─────────────────────────────────────────────────── */}
      {tab === 1 && (
        <Card sx={cardSx}>
          <Typography sx={{ color:'#f97316', fontWeight:600, mb:0.5 }}>
            Where users last were before leaving the app
          </Typography>
          <Typography sx={{ color:'#7aa', fontSize:12, mb:2 }}>
            High numbers here = UX friction. Investigate and fix those pages.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>#</TableCell>
                <TableCell sx={headSx}>Last Page Before Exit</TableCell>
                <TableCell sx={headSx} align="right">Users Dropped</TableCell>
                <TableCell sx={headSx} align="right">Last Seen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dropoffs.map((row, i) => (
                <TableRow key={row._id} sx={rowHover}>
                  <TableCell sx={{ ...cellSx, color:'#7aa', width:40 }}>{i+1}</TableCell>
                  <TableCell sx={cellSx}>{friendlyPage(row._id)}</TableCell>
                  <TableCell sx={cellSx} align="right">
                    <Chip label={row.count} size="small"
                      sx={{ bgcolor:'#f9731622', color:'#f97316', fontWeight:700 }} />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, opacity:0.6, fontSize:11 }} align="right">{fmtDate(row.lastSeen)}</TableCell>
                </TableRow>
              ))}
              {dropoffs.length === 0 && (
                <TableRow><TableCell colSpan={4} sx={{ ...cellSx, textAlign:'center', opacity:0.4, py:4 }}>
                  No drop-off data yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── TAB 2: Users ─────────────────────────────────────────────────────── */}
      {tab === 2 && (
        <Card sx={cardSx}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2, flexWrap:'wrap', gap:1 }}>
            <Typography sx={{ color:'#04bfbf', fontWeight:600 }}>
              All tracked users
            </Typography>
            <TextField size="small" placeholder="Search name or mobile…"
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment:<InputAdornment position="start"><SearchIcon sx={{ color:'#7aa', fontSize:18 }} /></InputAdornment>,
                sx:{ bgcolor:'#0e2629', color:'#e6f9ff', borderRadius:2, fontSize:13,
                  '& .MuiOutlinedInput-notchedOutline':{ borderColor:'#1a3a3f' },
                  '& input':{ color:'#e6f9ff' } } }}
            />
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>User</TableCell>
                <TableCell sx={headSx}>Mobile</TableCell>
                <TableCell sx={headSx} align="center">Status</TableCell>
                <TableCell sx={headSx} align="right">Last Seen</TableCell>
                <TableCell sx={headSx} align="right">Last Page</TableCell>
                <TableCell sx={headSx} align="right">Total Visits</TableCell>
                <TableCell sx={headSx} align="right">Active Days</TableCell>
                <TableCell sx={headSx} align="right">Total Time</TableCell>
                <TableCell sx={headSx} align="center">Journey</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u._id} sx={rowHover}>
                  <TableCell sx={cellSx}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <Avatar sx={{ width:28, height:28, bgcolor:'#04bfbf33', color:'#04bfbf', fontSize:11, fontWeight:700 }}>
                        {initials(u.name)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize:13, fontWeight:600, color:'#e6f9ff', lineHeight:1.2 }}>{u.name}</Typography>
                        {u.role !== 'customer' && (
                          <Chip label={u.role} size="small"
                            sx={{ fontSize:9, height:14, bgcolor: u.role==='admin'?'#f9731622':'#04bfbf22',
                              color: u.role==='admin'?'#f97316':'#04bfbf', mt:0.3 }} />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...cellSx, fontFamily:'monospace', fontSize:12 }}>{u.mobile}</TableCell>
                  <TableCell sx={cellSx} align="center">
                    {isOnline(u.lastSeen)
                      ? <Chip icon={<FiberManualRecordIcon sx={{ fontSize:'10px !important', color:'#22c55e !important' }} />}
                          label="Online" size="small" sx={{ bgcolor:'#22c55e18', color:'#22c55e', fontSize:11 }} />
                      : <Chip label="Offline" size="small" sx={{ bgcolor:'#ffffff0a', color:'#7aa', fontSize:11 }} />
                    }
                  </TableCell>
                  <TableCell sx={{ ...cellSx, fontSize:11, opacity:0.7 }} align="right">{fmtDate(u.lastSeen)}</TableCell>
                  <TableCell sx={{ ...cellSx, fontSize:11, color:'#a3d9dd' }} align="right">{friendlyPage(u.lastPage?.page)}</TableCell>
                  <TableCell sx={cellSx} align="right">
                    <Chip label={u.totalPages} size="small"
                      sx={{ bgcolor:'#04bfbf18', color:'#04bfbf', fontWeight:700, fontSize:11 }} />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color:'#a3d9dd' }} align="right">{u.activeDays}d</TableCell>
                  <TableCell sx={{ ...cellSx, color:'#f97316' }} align="right">{fmtTime(u.totalTimeSec)}</TableCell>
                  <TableCell sx={cellSx} align="center">
                    <Tooltip title="View full journey">
                      <Chip label="View" size="small" onClick={() => loadJourney(u._id, u.name)}
                        sx={{ cursor:'pointer', bgcolor:'#04bfbf22', color:'#04bfbf',
                          '&:hover':{ bgcolor:'#04bfbf44' } }} />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow><TableCell colSpan={9} sx={{ ...cellSx, textAlign:'center', opacity:0.4, py:4 }}>
                  No users found
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── TAB 3: User Journey ───────────────────────────────────────────────── */}
      {tab === 3 && (
        <Card sx={cardSx}>
          {!journey ? (
            <Box sx={{ textAlign:'center', py:6, opacity:0.4 }}>
              <TimelineIcon sx={{ fontSize:48, mb:1, color:'#04bfbf' }} />
              <Typography>Click "View" on any user in the Users tab to see their journey</Typography>
            </Box>
          ) : (
            <>
              <Typography sx={{ color:'#04bfbf', fontWeight:600, mb:2 }}>
                Journey for <span style={{ color:'#e6f9ff' }}>{journey}</span>
                <span style={{ color:'#7aa', fontWeight:400, fontSize:12, marginLeft:8 }}>
                  — last 30 days, newest first
                </span>
              </Typography>
              {journeyData.length === 0
                ? <Typography sx={{ color:'#7aa', textAlign:'center', py:4 }}>Loading…</Typography>
                : journeyData.map((day) => (
                  <Box key={day.date} sx={{ mb:2 }}>
                    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      bgcolor:'#0e2629', borderRadius:1.5, px:2, py:1, cursor:'pointer',
                      '&:hover':{ bgcolor:'#142f34' } }}
                      onClick={() => setExpanded(expanded === day.date ? null : day.date)}>
                      <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
                        <Typography sx={{ color:'#04bfbf', fontWeight:700, fontSize:13 }}>{day.date}</Typography>
                        <Chip label={`${day.pages?.length || 0} pages`} size="small"
                          sx={{ bgcolor:'#04bfbf18', color:'#04bfbf', fontSize:11 }} />
                      </Box>
                      <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                        <Typography sx={{ color:'#f97316', fontSize:11 }}>
                          {fmtTime((day.pages||[]).reduce((a,p)=>a+(p.timeSpentSec||0),0))}
                        </Typography>
                        {expanded === day.date ? <ExpandLessIcon sx={{ color:'#7aa', fontSize:18 }} /> : <ExpandMoreIcon sx={{ color:'#7aa', fontSize:18 }} />}
                      </Box>
                    </Box>
                    <Collapse in={expanded === day.date}>
                      <Table size="small" sx={{ mt:0.5 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ ...headSx, fontSize:11 }}>#</TableCell>
                            <TableCell sx={{ ...headSx, fontSize:11 }}>Page</TableCell>
                            <TableCell sx={{ ...headSx, fontSize:11 }} align="right">Time</TableCell>
                            <TableCell sx={{ ...headSx, fontSize:11 }} align="right">Duration</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(day.pages||[]).map((p, i) => (
                            <TableRow key={i} sx={rowHover}>
                              <TableCell sx={{ ...cellSx, color:'#7aa', width:36, fontSize:11 }}>{i+1}</TableCell>
                              <TableCell sx={cellSx}>{friendlyPage(p.page)}
                                <Typography sx={{ fontSize:10, color:'#04bfbf55', fontFamily:'monospace' }}>{p.page}</Typography>
                              </TableCell>
                              <TableCell sx={{ ...cellSx, fontSize:11, opacity:0.6 }} align="right">
                                {fmtDate(p.visitedAt)}
                              </TableCell>
                              <TableCell sx={{ ...cellSx, color:'#f97316', fontSize:12 }} align="right">
                                {fmtTime(p.timeSpentSec)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Collapse>
                  </Box>
                ))
              }
            </>
          )}
        </Card>
      )}


{tab === 4 && (
  <Card sx={cardSx}>
    <Typography sx={{ color:'#04bfbf', fontWeight:600, mb:0.5 }}>
      Charger locations ranked by nearby user app opens (within 500m)
    </Typography>
    <Typography sx={{ color:'#7aa', fontSize:12, mb:2 }}>
      High nearby users + low sessions = users are present but not charging → investigate that charger
    </Typography>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={headSx}>#</TableCell>
          <TableCell sx={headSx}>Charger / Area</TableCell>
          <TableCell sx={headSx} align="right">Nearby Users (500m)</TableCell>
          <TableCell sx={headSx} align="center">Charger Status</TableCell>
          <TableCell sx={headSx} align="right">Last User Nearby</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {heatmap.chargerStats?.map((c, i) => (
          <TableRow key={c.chargerId} sx={rowHover}>
            <TableCell sx={{ ...cellSx, color:'#7aa' }}>{i+1}</TableCell>
            <TableCell sx={cellSx}>
              <Typography sx={{ fontSize:13, fontWeight:600 }}>{c.location}</Typography>
              <Typography sx={{ fontSize:11, color:'#7aa' }}>{c.area}, {c.city}</Typography>
            </TableCell>
            <TableCell sx={cellSx} align="right">
              <Chip label={c.nearbyUsers} size="small"
                sx={{ bgcolor: c.nearbyUsers > 10 ? '#22c55e22':'#04bfbf18',
                      color:   c.nearbyUsers > 10 ? '#22c55e':'#04bfbf', fontWeight:700 }} />
            </TableCell>
            <TableCell sx={cellSx} align="center">
              <Chip label={c.status} size="small"
                sx={{ bgcolor: c.status==='available'?'#22c55e22':'#f9731622',
                      color:   c.status==='available'?'#22c55e':'#f97316', fontSize:11 }} />
            </TableCell>
            <TableCell sx={{ ...cellSx, fontSize:11, opacity:0.6 }} align="right">
              {fmtDate(c.lastUserSeen)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Card>
)}

    </Box>
  );
}