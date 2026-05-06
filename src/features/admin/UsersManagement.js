// src/features/admin/UsersManagement.js

import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Drawer,
  Button,
  IconButton,
  Divider
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";

import { apiFetch } from "../../utils/apiFetch";

const ROLE_COLORS = {
  admin: "#ef4444",
  owner: "#f8a100",
  customer: "#0ea5b6"
};

function KPI({ label, value }) {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography fontSize={12} color="text.secondary">
          {label}
        </Typography>
        <Typography fontSize={28} fontWeight={800}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function UserCard({ user, onOpen }) {
  const joinedAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
};
  return (
    <Card
      sx={{
        borderRadius: 3,
        cursor: "pointer",
        transition: "all .2s",
        "&:hover": { transform: "translateY(-4px)" }
      }}
      onClick={() => onOpen(user)}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: "#04bfbf" }}>
            <PersonIcon />
          </Avatar>

          <Box flex={1}>
            <Typography fontWeight={700}>
              {user.name}
            </Typography>

            <Typography fontSize={13} color="text.secondary">
              {user.mobile}
            </Typography>

            {user.email && (
              <Typography fontSize={13} color="text.secondary">
                {user.email}
              </Typography>
            )}
            <Typography fontSize={12} color="text.secondary">
            Joined {joinedAgo(user.createdAt)}
            </Typography>
          </Box>

          <Chip
            label={user.role}
            size="small"
            sx={{
              bgcolor: ROLE_COLORS[user.role] || "#374151",
              color: "#fff",
              fontWeight: 700
            }}
          />
        </Stack>

        <Divider sx={{ my: 1 }} />

        <Stack direction="row" justifyContent="space-between">
          <Typography fontSize={12}>
            {user.vehicleType || "—"}
          </Typography>

          {user.phoneVerified && (
            <Chip
              size="small"
              label="Verified"
              sx={{ bgcolor: "#16a34a", color: "#fff" }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function UsersManagement() {

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
    const res = await apiFetch("/api/users");

    const sortedUsers = (res || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    setUsers(sortedUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

const stats = useMemo(() => {

  const now = new Date();

  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);

  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0,0,0,0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = users.length;
  const admins = users.filter(u => u.role === "admin").length;
  const owners = users.filter(u => u.role === "owner").length;
  const customers = users.filter(u => u.role === "customer").length;
  const verified = users.filter(u => u.phoneVerified).length;

  const newToday = users.filter(
    u => new Date(u.createdAt) >= startOfToday
  ).length;

  const newWeek = users.filter(
    u => new Date(u.createdAt) >= startOfWeek
  ).length;

  const newMonth = users.filter(
    u => new Date(u.createdAt) >= startOfMonth
  ).length;

  return {
    total,
    admins,
    owners,
    customers,
    verified,
    newToday,
    newWeek,
    newMonth
  };

}, [users]);

  const filtered = useMemo(() => {

    return users.filter(u => {

      const matchSearch =
        !search ||
        `${u.name} ${u.mobile} ${u.email}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchRole =
        !role || u.role === role;

      return matchSearch && matchRole;

    });

  }, [users, search, role]);

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", py: 3, fontFamily: "Inter" }}>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight={900}>
          Users Management
        </Typography>

        <IconButton onClick={load}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {/* KPIs */}

<Grid container spacing={2} mb={3}>

  <Grid item xs={6} md={2}>
    <KPI label="Total Users" value={stats.total} />
  </Grid>

  <Grid item xs={6} md={2}>
    <KPI label="Customers" value={stats.customers} />
  </Grid>

  <Grid item xs={6} md={2}>
    <KPI label="Owners" value={stats.owners} />
  </Grid>

  <Grid item xs={6} md={2}>
    <KPI label="Admins" value={stats.admins} />
  </Grid>

  <Grid item xs={6} md={2}>
    <KPI label="Phone Verified" value={stats.verified} />
  </Grid>

  <Grid item xs={6} md={2}>
    <KPI label="New Today" value={stats.newToday} />
  </Grid>

  <Grid item xs={6} md={2}>
    <KPI label="New This Week" value={stats.newWeek} />
  </Grid>

  <Grid item xs={6} md={2}>
    <KPI label="New This Month" value={stats.newMonth} />
  </Grid>

</Grid>

      {/* Filters */}

      <Stack direction="row" spacing={2} mb={3}>

        <TextField
          placeholder="Search users..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Role</InputLabel>
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="customer">Customer</MenuItem>
            <MenuItem value="owner">Owner</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </FormControl>

      </Stack>

      {/* USERS GRID */}

      <Grid container spacing={2}>
        {filtered.map(user => (
          <Grid item xs={12} sm={6} md={4} key={user._id}>
            <UserCard user={user} onOpen={setSelected} />
          </Grid>
        ))}
      </Grid>

      {/* USER DRAWER */}

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <Box sx={{ width: 420, p: 3 }}>

            <Stack
              direction="row"
              justifyContent="space-between"
              mb={2}
            >
              <Typography fontWeight={800}>
                User Details
              </Typography>

              <IconButton onClick={() => setSelected(null)}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Typography>Name</Typography>
            <Typography fontWeight={700} mb={2}>
              {selected.name}
            </Typography>

            <Typography>Mobile</Typography>
            <Typography fontWeight={700} mb={2}>
              {selected.mobile}
            </Typography>

            <Typography>Email</Typography>
            <Typography fontWeight={700} mb={2}>
              {selected.email || "—"}
            </Typography>

            <Typography>Vehicle</Typography>
            <Typography fontWeight={700} mb={2}>
              {selected.vehicleType || "—"}
            </Typography>

            <Typography>Role</Typography>
            <Typography fontWeight={700} mb={2}>
              {selected.role}
            </Typography>

            <Typography>Phone Verified</Typography>
            <Typography fontWeight={700} mb={2}>
              {selected.phoneVerified ? "Yes" : "No"}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={2}>
              <Button variant="contained">
                Edit
              </Button>

              <Button color="error" variant="outlined">
                Delete
              </Button>
            </Stack>

          </Box>
        )}
      </Drawer>

    </Box>
  );
}