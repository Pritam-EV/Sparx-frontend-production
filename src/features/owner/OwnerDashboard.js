// src/features/owner/OwnerDashboard.js

import React, { useState } from "react";
import { Outlet } from "react-router-dom";

import {
  Box,
  IconButton,
  Typography,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";

import OwnerSidebar from "./OwnerSidebar";

const COLORS = {
  background: "#F5F8FA",
  darkTeal: "#01313A",
  border: "#E2E8F0",
};

const OwnerDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((previous) => !previous);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        minHeight: "100dvh",
        backgroundColor: COLORS.background,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* MOBILE TOP BAR */}
      <Box
        component="header"
        sx={{
          display: { xs: "flex", md: "none" },
          alignItems: "center",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          boxSizing: "border-box",
          px: 1.5,
          backgroundColor: "#FFFFFF",
          borderBottom: `1px solid ${COLORS.border}`,
          zIndex: 1100,
        }}
      >
        <IconButton
          onClick={toggleSidebar}
          aria-label="Open navigation"
          sx={{ color: COLORS.darkTeal, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 800,
            color: COLORS.darkTeal,
          }}
        >
          VIZ Owner Hub
        </Typography>
      </Box>

      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <Box
          onClick={closeSidebar}
          aria-hidden="true"
          sx={{
            display: { xs: "block", md: "none" },
            position: "fixed",
            inset: 0,
            background: "rgba(1, 31, 38, 0.32)",
            zIndex: 1200,
          }}
        />
      )}

      <OwnerSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* MAIN CONTENT */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          height: "100dvh",
          backgroundColor: COLORS.background,
          boxSizing: "border-box",
          pt: { xs: "56px", md: 0 },
        }}
      >
        <Box
          sx={{
            boxSizing: "border-box",
            height: {
              xs: "calc(100dvh - 56px)",
              md: "100dvh",
            },
            overflowY: "auto",
            overflowX: "hidden",
            p: {
              xs: 1.5,
              sm: 2.5,
              lg: 3.5,
            },
            scrollBehavior: "smooth",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default OwnerDashboard;