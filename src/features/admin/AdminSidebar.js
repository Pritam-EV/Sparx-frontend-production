import React from "react";
import { NavLink } from "react-router-dom";
import { IconButton, Box, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DevicesIcon from "@mui/icons-material/DeviceHub";
import ReceiptIcon from "@mui/icons-material/Receipt";
import BarChartIcon from "@mui/icons-material/BarChart";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import PersonIcon from '@mui/icons-material/Person'; 

const NavItem = ({ to, icon, label, onClick }) => (
  <NavLink
    to={to}
    style={({ isActive }) =>
      isActive
        ? {
            ...styles.link,
            ...styles.activeLink
          }
        : styles.link
    }
    onClick={onClick}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {icon}
      <span>{label}</span>
    </Box>
  </NavLink>
);

const AdminSidebar = ({ isOpen, onClose }) => (
  <Box
    sx={{
      ...styles.sidebar,
      ...(isOpen === false
        ? { display: { xs: "none", md: "block" } }
        : undefined)
    }}
  >
    <Box sx={styles.header}>
      <Typography variant="h6" sx={styles.logo}>
        Admin Panel
      </Typography>
      {typeof onClose === "function" && (
        <IconButton
          aria-label="Close sidebar"
          onClick={onClose}
          sx={{
            color: "#fff",
            display: { md: "none" }
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      )}
    </Box>
    <Box component="nav" sx={{ flex: 1 }}>
      <NavItem to="" icon={<DashboardIcon />} label="Dashboard" onClick={onClose} />
      <NavItem to="devices" icon={<DevicesIcon />} label="Devices" onClick={onClose} />
      <NavItem to="sessions" icon={<BarChartIcon />} label="Sessions" onClick={onClose} />
      <NavItem to="receipts" icon={<ReceiptIcon />} label="Receipts" onClick={onClose} />
      <NavItem to="analytics" icon={<QueryStatsIcon />} label="Analytics" onClick={onClose} />
      <NavItem to="profile" icon={<PersonIcon />} label="Profile" onClick={onClose} />
    </Box>
  </Box>
);

const styles = {
  sidebar: {
    width: 280,
    height: "100vh",
    bgcolor: "#1a1a1a",
    color: "#fff",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    py: 2,
    px: 2
  },
  logo: {
    fontWeight: 700,
    letterSpacing: 1
  },
  link: {
    color: "#BFD7EA",
    textDecoration: "none",
    fontSize: "1.14rem",
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    transition: "background 0.16s",
    borderRadius: 8,
    marginBottom: 2,
    fontWeight: 500
  },
  activeLink: {
    backgroundColor: "#04bfbf",
    color: "#011F26",
    fontWeight: 600
  }
};

export default AdminSidebar;
