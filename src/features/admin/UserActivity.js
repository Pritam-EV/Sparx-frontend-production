// src/features/admin/UserActivity.js
import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Table, TableHead,
         TableBody, TableRow, TableCell, CircularProgress,
         Tabs, Tab, Chip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { apiFetch } from '../../utils/apiFetch';

const cardSx = {
  bgcolor: '#0e2629', border: '1px solid #1a3a3f',
  borderRadius: 3, color: '#e6f9ff', p: 3, mb: 3,
};
const cellSx = { color: '#e6f9ff', borderColor: '#1a3a3f', fontSize: 13 };
const headSx = { color: '#04bfbf', borderColor: '#1a3a3f', fontWeight: 700 };

export default function UserActivity() {
  const [tab, setTab]         = useState(0);
  const [summary, setSummary] = useState([]);
  const [dropoffs, setDropoffs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/activity/summary'),
      apiFetch('/api/activity/dropoffs'),
    ]).then(([s, d]) => {
      setSummary(Array.isArray(s) ? s : []);
      setDropoffs(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const friendlyPage = (path) => {
    const map = {
      '/home': '🏠 Home', '/profile': '👤 Profile',
      '/sessions': '⚡ Sessions', '/transactions': '💳 Transactions',
      '/wallet/topup': '💰 Wallet Top-up', '/qr-scanner': '📷 QR Scanner',
      '/session-summary': '📋 Session Summary',
    };
    if (map[path]) return map[path];
    if (path?.startsWith('/charging-options/')) return '🔌 Charging Options';
    if (path?.startsWith('/live-session/'))     return '⚡ Live Session';
    if (path?.startsWith('/session-start/'))    return '▶️ Session Start';
    if (path?.startsWith('/admin/'))            return '🛠 Admin: ' + path.split('/admin/')[1];
    if (path?.startsWith('/owner/'))            return '👷 Owner: ' + path.split('/owner/')[1];
    return path;
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', pt: 2, px: { xs: 1, sm: 2 } }}>
      <Typography variant="h5" sx={{ color: '#04bfbf', fontWeight: 700, mb: 3 }}>
        User Activity Tracking
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, '& .MuiTab-root': { color: '#7aa', '&.Mui-selected': { color: '#04bfbf' } },
              '& .MuiTabs-indicator': { bgcolor: '#04bfbf' } }}>
        <Tab icon={<PeopleIcon />} iconPosition="start" label="Most Visited Pages" />
        <Tab icon={<TrendingDownIcon />} iconPosition="start" label="Drop-off Pages" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress sx={{ color: '#04bfbf' }} />
        </Box>
      ) : tab === 0 ? (
        <Card sx={cardSx}>
          <Typography sx={{ color: '#04bfbf', fontWeight: 600, mb: 2 }}>
            Pages ranked by total visits
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>#</TableCell>
                <TableCell sx={headSx}>Page</TableCell>
                <TableCell sx={headSx}>Raw Path</TableCell>
                <TableCell sx={headSx} align="right">Total Visits</TableCell>
                <TableCell sx={headSx} align="right">Last Visited</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((row, i) => (
                <TableRow key={row._id} hover sx={{ '&:hover': { bgcolor: '#0a1e21' } }}>
                  <TableCell sx={cellSx}>{i + 1}</TableCell>
                  <TableCell sx={cellSx}>{friendlyPage(row._id)}</TableCell>
                  <TableCell sx={{ ...cellSx, opacity: 0.5, fontSize: 11 }}>{row._id}</TableCell>
                  <TableCell sx={cellSx} align="right">
                    <Chip label={row.visits} size="small"
                      sx={{ bgcolor: '#04bfbf22', color: '#04bfbf', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, opacity: 0.7 }} align="right">
                    {row.lastSeen ? new Date(row.lastSeen).toLocaleString('en-IN') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {summary.length === 0 && (
                <TableRow><TableCell colSpan={5} sx={{ ...cellSx, textAlign: 'center', opacity: 0.5 }}>
                  No data yet — visit some pages first
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card sx={cardSx}>
          <Typography sx={{ color: '#f97316', fontWeight: 600, mb: 1 }}>
            Where users last were before leaving the app
          </Typography>
          <Typography sx={{ color: '#7aa', fontSize: 12, mb: 2 }}>
            High counts here = users dropping off on this page. Investigate UX issues.
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
                <TableRow key={row._id} hover sx={{ '&:hover': { bgcolor: '#0a1e21' } }}>
                  <TableCell sx={cellSx}>{i + 1}</TableCell>
                  <TableCell sx={cellSx}>{friendlyPage(row._id)}</TableCell>
                  <TableCell sx={cellSx} align="right">
                    <Chip label={row.count} size="small"
                      sx={{ bgcolor: '#f9731622', color: '#f97316', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, opacity: 0.7 }} align="right">
                    {row.lastSeen ? new Date(row.lastSeen).toLocaleString('en-IN') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {dropoffs.length === 0 && (
                <TableRow><TableCell colSpan={4} sx={{ ...cellSx, textAlign: 'center', opacity: 0.5 }}>
                  No drop-off data yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </Box>
  );
}