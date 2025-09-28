import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Grid,
  Card,
  Typography,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BoltIcon from "@mui/icons-material/Bolt";
import TimelineIcon from "@mui/icons-material/Timeline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { apiFetch } from "../../utils/apiFetch";

const cardSx = {
  bgcolor: "#0e2629",
  border: "1px solid #0e2629",
  boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
  borderRadius: 3,
  color: "#e6f9ff",
  width: 150,
  height: 250,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  p: 1,
};

const titleSx = {
  display: "flex",
  alignItems: "center",
  gap: 0,
  mb: 0,
  fontWeight: 600,
  fontSize: "1.1rem",
};

const labelSx = { fontWeight: 500, opacity: 0.7, fontSize: 14 };
const valueSx = { fontWeight: 700, fontSize: 16, ml: 2 };

const fmt0 = (v) =>
  Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const AdminAnalytics = () => {
  const [devices, setDevices] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [finance, setFinance] = useState({
    amountPaid: 0,
    amountUtilized: 0,
    amountRefunded: 0,
    energyUtilized: 0,
  });
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const fetchData = useCallback(() => {
    Promise.all([
      apiFetch("/api/devices"),
      apiFetch("/api/sessions/all?limit=10000"),
      apiFetch("/api/receipts/all?limit=10000"),
    ]).then(([devicesRes, sessionsRes, receiptsRes]) => {
      const dArr = Array.isArray(devicesRes)
        ? devicesRes
        : devicesRes.devices || [];
      setDevices(dArr);

      const sArr = Array.isArray(sessionsRes)
        ? sessionsRes
        : sessionsRes.sessions || [];
      setSessions(sArr);

      const rArr = Array.isArray(receiptsRes?.list)
        ? receiptsRes.list
        : Array.isArray(receiptsRes?.receipts)
        ? receiptsRes.receipts
        : [];
      setFinance({
        amountPaid: rArr.reduce((a, r) => a + Number(r.amountPaid ?? 0), 0),
        amountUtilized: rArr.reduce(
          (a, r) => a + Number(r.amountUtilized ?? 0),
          0
        ),
        amountRefunded: rArr.reduce((a, r) => a + Number(r.refund ?? 0), 0),
        energyUtilized: rArr.reduce(
          (a, r) => a + Number(r.energyConsumed ?? 0),
          0
        ),
      });

      setLastFetchedAt(new Date());
    });
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 10000); // auto refresh 10s
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const deviceStats = useMemo(() => {
    let available = 0,
      occupied = 0,
      offline = 0,
      faulty = 0;
    for (const d of devices) {
      const s = String(d?.status ?? "").toLowerCase().trim();
      if (s === "available" || s === "online") available += 1;
      else if (s === "occupied" || s === "busy") occupied += 1;
      else if (s === "offline" || s === "unknown") offline += 1;
      else if (s === "faulty" || s === "error") faulty += 1;
    }
    return {
      total: devices.length,
      available,
      occupied,
      offline,
      faulty,
    };
  }, [devices]);

  const sessionStats = useMemo(() => {
    let total = sessions.length,
      active = 0,
      completed = 0;
    for (const s of sessions) {
      const status = String(s.status ?? "").toLowerCase();
      if (status === "active") active += 1;
      if (status === "completed") completed += 1;
    }
    return { total, active, completed };
  }, [sessions]);

  const balance = useMemo(
    () => finance.amountPaid - finance.amountUtilized - finance.amountRefunded,
    [finance]
  );

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        pt: 2,
        px: { xs: 1, sm: 2, md: 3 },
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Header row with Title and Refresh */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h5"
          sx={{ color: "#04bfbf", fontWeight: 700 }}
        >
          Analytics Overview
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchData} size="small" sx={{ color: "#0087b1ff" }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Typography sx={{ fontSize: 12, color: "#04bfbf" }}>
            {lastFetchedAt
              ? `Last updated: ${lastFetchedAt.toLocaleTimeString()}`
              : "Loading..."}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Devices Card */}
        <Grid item xs={12} sm={6} sx={{ display: "flex" }}>
          <Card sx={cardSx}>
            <Box sx={titleSx}>
              <QueryStatsIcon sx={{ color: "#04bfbf" }} />
              Devices
            </Box>
            <Divider sx={{ borderColor: "#0e2629", mb: 2 }} />
            <Stack spacing={1}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={labelSx}>Total:</Typography>
                <Typography sx={valueSx}>{fmt0(deviceStats.total)}</Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#3ec286",
                }}
              >
                <Typography sx={{ ...labelSx, color: "#04bfbf" }}>
                  Available:
                </Typography>
                <Typography sx={valueSx}>{fmt0(deviceStats.available)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", color: "#1abd05ff" }}>
                <Typography>Occupied:</Typography>
                <Typography sx={valueSx}>{fmt0(deviceStats.occupied)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", color: "#949596ff" }}>
                <Typography>Offline:</Typography>
                <Typography sx={valueSx}>{fmt0(deviceStats.offline)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", color: "#be0802ff" }}>
                <Typography>Faulty:</Typography>
                <Typography sx={valueSx}>{fmt0(deviceStats.faulty)}</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Finance Card */}
        <Grid item xs={12} sm={6} sx={{ display: "flex" }}>
          <Card sx={cardSx}>
            <Box sx={titleSx}>
              <AttachMoneyIcon sx={{ color: "#f97316" }} />
              Finance
            </Box>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 2 }} />
            <Stack spacing={1}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={labelSx}>Received:</Typography>
                <Typography sx={valueSx}>₹{fmt0(finance.amountPaid)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={labelSx}>Utilized:</Typography>
                <Typography sx={valueSx}>₹{fmt0(finance.amountUtilized)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={labelSx}>Refunded:</Typography>
                <Typography sx={valueSx}>₹{fmt0(finance.amountRefunded)}</Typography>
              </Box>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.05)", my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={labelSx}>Balance:</Typography>
                <Typography sx={valueSx}>₹{fmt0(balance)}</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Sessions Card */}
        <Grid item xs={12} sm={6} sx={{ display: "flex" }}>
          <Card sx={cardSx}>
            <Box sx={titleSx}>
              <TimelineIcon sx={{ color: "#04bfbf" }} />
              Sessions
            </Box>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 2 }} />
            <Stack spacing={1}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={labelSx}>Total:</Typography>
                <Typography sx={valueSx}>{fmt0(sessionStats.total)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", color: "#a80404ff" }}>
                <Typography>Active:</Typography>
                <Typography sx={valueSx}>{fmt0(sessionStats.active)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", color: "#03b931ff" }}>
                <Typography>Completed:</Typography>
                <Typography sx={valueSx}>{fmt0(sessionStats.completed)}</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Energy Card */}
        <Grid item xs={12} sm={6} sx={{ display: "flex" }}>
          <Card sx={cardSx}>
            <Box sx={titleSx}>
              <BoltIcon sx={{ color: "#ffea00" }} />
              Energy
            </Box>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 2 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={labelSx}>Utilized:</Typography>
                <Typography sx={valueSx}>{fmt0(finance.energyUtilized )} kWh </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminAnalytics;
