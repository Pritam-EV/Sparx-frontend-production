import React from "react";
import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import DevicesOtherRoundedIcon from "@mui/icons-material/DevicesOtherRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import FactoryRoundedIcon from "@mui/icons-material/FactoryRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";

const NAV_ITEMS = [
  {
    label: "Overview",
    path: "/admin/production-v3",
    icon: <DashboardRoundedIcon />,
    end: true,
  },
  {
    label: "Batches",
    path: "/admin/production-v3/batches",
    icon: <Inventory2RoundedIcon />,
  },
  {
    label: "Device inventory",
    path: "/admin/production-v3/devices",
    icon: <DevicesOtherRoundedIcon />,
  },
  {
    label: "Calibration",
    path: "/admin/production-v3/calibration",
    icon: <PrecisionManufacturingRoundedIcon />,
  },
  {
    label: "Profiles",
    path: "/admin/production-v3/profiles",
    icon: <TuneRoundedIcon />,
  },
  {
    label: "Dispatch",
    path: "/admin/production-v3/dispatch",
    icon: <LocalShippingRoundedIcon />,
  },
];

const PAGE_META = [
  {
    path: "/admin/production-v3/batches",
    title: "Manufacturing batches",
    subtitle:
      "Create batches, generate factory serial numbers and track production quantities.",
  },
  {
    path: "/admin/production-v3/devices",
    title: "Device inventory",
    subtitle:
      "Discover devices, provision them and monitor their lifecycle state.",
  },
  {
    path: "/admin/production-v3/calibration",
    title: "Calibration workbench",
    subtitle:
      "Run guided calibration sessions with reference measurements and device telemetry.",
  },
  {
    path: "/admin/production-v3/profiles",
    title: "Profiles",
    subtitle:
      "Manage Production, Firmware and Calibration Profiles.",
  },
  {
    path: "/admin/production-v3/dispatch",
    title: "Dispatch",
    subtitle:
      "Review production-ready devices and record their dispatch details.",
  },
];

const NavigationItem = ({ item }) => (
  <NavLink
    to={item.path}
    end={Boolean(item.end)}
    style={{ textDecoration: "none" }}
  >
    {({ isActive }) => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.25,
          py: 1.15,
          minWidth: {
            xs: 142,
            md: 0,
          },
          borderRadius: 2.25,
          color: isActive ? "#0f766e" : "#64748b",
          bgcolor: isActive ? "#e7f7f4" : "transparent",
          border: isActive
            ? "1px solid #bce8df"
            : "1px solid transparent",
          transition: "all 160ms ease",
          "&:hover": {
            bgcolor: isActive ? "#e7f7f4" : "#f8fafc",
            color: "#0f766e",
          },
        }}
      >
        <Box
          sx={{
            width: 33,
            height: 33,
            borderRadius: 1.75,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            bgcolor: isActive ? "#d0f1e9" : "#f1f5f9",
            "& svg": { fontSize: 19 },
          }}
        >
          {item.icon}
        </Box>

        <Typography
          sx={{
            fontSize: 11.5,
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            fontWeight: isActive ? 850 : 700,
          }}
        >
          {item.label}
        </Typography>
      </Box>
    )}
  </NavLink>
);

export default function ProductionV3Layout() {
  const location = useLocation();

  const meta =
    PAGE_META.find((item) =>
      location.pathname.startsWith(item.path)
    ) || {
      title: "Production overview",
      subtitle:
        "Manage the complete VIZ Production 3.0 manufacturing lifecycle.",
    };

  return (
    <Box
      sx={{
        minHeight: "100%",
        width: "100%",
        bgcolor: "#f5f7fb",
        color: "#172033",
        p: {
          xs: 1,
          sm: 1.75,
          lg: 2.5,
        },
      }}
    >
      <Stack spacing={2}>
        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",
            border: "1px solid #e5eaf1",
            borderRadius: 3,
            bgcolor: "#fff",
          }}
        >
          <Box
            sx={{
              p: {
                xs: 1.75,
                sm: 2.25,
              },
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 43,
                  height: 43,
                  borderRadius: 2.25,
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  background:
                    "linear-gradient(135deg, #0f766e, #14b8a6)",
                }}
              >
                <FactoryRoundedIcon />
              </Box>

              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  flexWrap="wrap"
                >
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: 18,
                      letterSpacing: "-0.4px",
                    }}
                  >
                    VIZ Manufacturing
                  </Typography>
                  <Chip
                    label="PRODUCTION 3.0"
                    size="small"
                    sx={{
                      height: 21,
                      fontSize: 9,
                      fontWeight: 900,
                      bgcolor: "#e7f7f4",
                      color: "#0f766e",
                    }}
                  />
                </Stack>
                <Typography
                  sx={{
                    mt: 0.25,
                    fontSize: 11,
                    color: "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  Manufacturing operations console
                </Typography>
              </Box>
            </Stack>

            <Chip
              icon={
                <BoltRoundedIcon
                  sx={{
                    color: "#0f766e !important",
                    fontSize: 16,
                  }}
                />
              }
              label="New lifecycle"
              sx={{
                height: 29,
                bgcolor: "#f0fdfa",
                border: "1px solid #ccfbf1",
                color: "#0f766e",
                fontSize: 10.5,
                fontWeight: 750,
              }}
            />
          </Box>

          <Divider sx={{ borderColor: "#edf0f4" }} />

          <Box sx={{ px: 2.25, py: 1.75 }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: {
                  xs: 18,
                  sm: 21,
                },
                letterSpacing: "-0.5px",
              }}
            >
              {meta.title}
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                color: "#64748b",
                fontSize: 11.5,
                lineHeight: 1.6,
                maxWidth: 800,
              }}
            >
              {meta.subtitle}
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 0.9,
            border: "1px solid #e5eaf1",
            borderRadius: 2.75,
            bgcolor: "#fff",
          }}
        >
          <Box
            sx={{
              display: {
                xs: "flex",
                md: "grid",
              },
              gridTemplateColumns: {
                md: "repeat(6, minmax(0, 1fr))",
              },
              gap: 0.5,
              overflowX: {
                xs: "auto",
                md: "visible",
              },
              pb: {
                xs: 0.4,
                md: 0,
              },
              scrollbarWidth: "thin",
            }}
          >
            {NAV_ITEMS.map((item) => (
              <NavigationItem key={item.path} item={item} />
            ))}
          </Box>
        </Paper>

        <Box sx={{ minWidth: 0 }}>
          <Outlet />
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 0.5,
            pt: 0.25,
          }}
        >
          <Typography
            sx={{
              fontSize: 10,
              color: "#94a3b8",
              fontWeight: 600,
            }}
          >
            VIZ Smart Charging · Manufacturing
          </Typography>
          <Typography
            sx={{
              fontSize: 10,
              color: "#94a3b8",
              fontWeight: 600,
            }}
          >
            Production 3.0
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}