// src/features/owner/OwnerDashboard.js

import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, IconButton } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import OwnerSidebar from "./OwnerSidebar";

export default function OwnerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        minHeight: "100dvh",
        backgroundColor: "#f3fbfc", // Mint Canvas base
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ================================================================== */}
      {/* 1. SLEEK FLOATING DRAWER TRIGGER (MOBILE & TABLET ONLY)            */}
      {/* Sits over child header without taking vertical space               */}
      {/* ================================================================== */}
      <IconButton
        onClick={toggleSidebar}
        aria-label="Open Navigation Drawer"
        sx={{
          display: { xs: "flex", lg: "none" },
          position: "fixed",
          top: 9,
          left: 10,
          zIndex: 1200,
          width: 36,
          height: 36,
          color: "#00d2b4", // Electric Aqua
          transition: "all 0.2s ease",
          "&:hover": {

            transform: "scale(1.04)",
          },
        }}
      >
        <MenuRoundedIcon sx={{ fontSize: 20 }} />
      </IconButton>

      {/* ================================================================== */}
      {/* 2. RESPONSIVE SIDEBAR DRAWER                                       */}
      {/* ================================================================== */}
      <OwnerSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* ================================================================== */}
      {/* 3. MAIN CONTENT VIEWPORT (ZERO REDUNDANT PADDING / GAPS)           */}
      {/* ================================================================== */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          height: "100dvh",
          backgroundColor: "#f3fbfc",
          boxSizing: "border-box",
          overflowY: "auto",
          overflowX: "hidden",
          scrollBehavior: "smooth",
          margin: 0,
          padding: 0, // Zero outer padding so child headers flush to screen edges
        }}
      >
        {/* Pass sidebar controls through context if any child header wants direct control */}
        <Outlet context={{ sidebarOpen, toggleSidebar, openSidebar, closeSidebar }} />
      </Box>
    </Box>
  );
}