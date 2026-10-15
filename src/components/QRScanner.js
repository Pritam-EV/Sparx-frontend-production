import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "qr-scanner";
import axios from "axios";

import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import KeyboardAltOutlinedIcon from "@mui/icons-material/KeyboardAltOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import AppHeader from "../components/AppHeader";
import FooterNav from "../components/FooterNav";

const extractId = (raw) => {
  try {
    const parts = raw.split("/");
    return parts.pop() || parts.pop();
  } catch {
    return raw;
  }
};

const QRScanner = () => {
  const navigate = useNavigate();
  const [device_id, setDeviceId] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  const verifyDevice = useCallback(
    async (id) => {
      try {
        setError("");
        const response = await axios.get(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/devices/check-device/${id}`
        );

        if (response.data.exists) {
          navigate(`/charging-options/${id}`);
        } else {
          setError("Device not found. Please check the charger ID.");
        }
      } catch (err) {
        setError("Error verifying device. Please try again.");
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!videoRef.current) return;

    qrScannerRef.current = new QrScanner(
      videoRef.current,
      (result) => {
        if (result?.data) {
          const id = extractId(result.data);
          setDeviceId(id);
          verifyDevice(id);
          qrScannerRef.current?.stop();
        }
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: false,
        highlightCodeOutline: false,
      }
    );

    qrScannerRef.current.start().catch(() => {
      setError("Camera access failed. Please check browser permissions.");
    });

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, [verifyDevice]);

  const handleManualEntry = async () => {
    if (device_id.trim() !== "") {
      await verifyDevice(device_id.trim());
    } else {
      setError("Please enter charger ID.");
    }
  };

  return (
    <>
      {/* ── TOP APP HEADER ── */}
      <AppHeader />

      <Box
        sx={{
          minHeight: "calc(100dvh - 68px)",
          height: "calc(100dvh - 68px)",
          width: "100%",
          background:
            "radial-gradient(circle at 100% 0%, rgba(0, 229, 190, 0.08), transparent 24rem), radial-gradient(circle at 0% 50%, rgba(255, 130, 54, 0.05), transparent 22rem), #f3fbfc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: "'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          px: 2,
          pt: 1.5,
          pb: "calc(96px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Navigation Bar Strip */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 440,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            pt: 0.5,
          }}
        >
          <IconButton
            onClick={() => navigate(-1)}
            aria-label="Back"
            sx={{
              width: 38,
              height: 38,
              background: "#ffffff",
              border: "1px solid #d4f0ec",
              color: "#00776b",
              boxShadow: "0 2px 8px rgba(0, 160, 140, 0.06)",
              borderRadius: "12px",
              transition: "all 0.15s ease",
              "&:hover": {
                background: "#eaf9f6",
                borderColor: "#b7ede4",
              },
              "&:active": { transform: "scale(0.95)" },
            }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: 16, ml: "4px" }} />
          </IconButton>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "8px",
                background: "linear-gradient(135deg, #dcfaf5 0%, #b8f5ed 100%)",
                border: "1px solid #c0f0e8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00776b",
              }}
            >
              <QrCodeScannerRoundedIcon sx={{ fontSize: 17 }} />
            </Box>
            <Typography
              sx={{
                color: "#0e2e33",
                fontWeight: 750,
                fontSize: "16px",
                letterSpacing: "-0.2px",
              }}
            >
              Scan Charger QR
            </Typography>
          </Box>

          <Box sx={{ width: 38, height: 38 }} />
        </Box>

        {/* Instructions banner */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 440,
            background: "rgba(255, 255, 255, 0.8)",
            border: "1px solid #d4f0ec",
            borderRadius: "14px",
            py: 1,
            px: 2,
            mb: 2,
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(0, 160, 140, 0.04)",
            backdropFilter: "blur(6px)",
          }}
        >
          <Typography
            sx={{
              color: "#53757a",
              fontSize: "12.5px",
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            Align the QR code on the VIZ charging station within the frame.
          </Typography>
        </Box>

        {/* Viewfinder Frame */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 440,
            borderRadius: "26px",
            overflow: "hidden",
            background: "#081b20",
            border: "2px solid #b7ede4",
            boxShadow: "0 12px 34px rgba(0, 160, 145, 0.14)",
            minHeight: { xs: "280px", sm: "330px" },
            height: { xs: "38vh", sm: "42vh" },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              background: "#061317",
            }}
            playsInline
          />

          {/* Animated Laser Scan Bar */}
          <Box className="qr-scan-laser" />

          {/* Four Corner Accents */}
          <Box sx={scanGuideStyles}>
            <span className="corner-tl" />
            <span className="corner-tr" />
            <span className="corner-bl" />
            <span className="corner-br" />
          </Box>
        </Box>

        {/* Manual entry card */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 440,
            mt: 2.2,
            background: "#ffffff",
            borderRadius: "22px",
            border: "1px solid #d4f0ec",
            boxShadow: "0 6px 20px rgba(0, 160, 145, 0.06)",
            p: 2.2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.4 }}>
            <KeyboardAltOutlinedIcon sx={{ color: "#e06014", fontSize: 19 }} />
            <Typography
              sx={{
                color: "#0e2e33",
                fontSize: "14px",
                fontWeight: 750,
                letterSpacing: "-0.2px",
              }}
            >
              Enter Charger ID manually
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 1.2,
              alignItems: "stretch",
            }}
          >
            <TextField
              variant="outlined"
              placeholder="e.g. VIZ-PUN-001"
              value={device_id}
              onChange={(e) => setDeviceId(e.target.value)}
              inputProps={{ maxLength: 60 }}
              fullWidth
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleManualEntry();
                }
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "15px",
                  minHeight: 48,
                  background: "#f4fbfb",
                  color: "#0e2e33",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  fontFamily: "inherit",
                  transition: "all 0.18s ease",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#d8f2ee",
                },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00d2b4",
                },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00d2b4",
                  boxShadow: "0 0 0 3px rgba(0, 210, 180, 0.15)",
                },
                "& input": {
                  color: "#0e2e33",
                  padding: "12px 14px",
                },
                "& input::placeholder": {
                  color: "#7e9ea2",
                  opacity: 1,
                  fontWeight: 400,
                },
              }}
            />

            {/* Sunrise Orange CTA Button */}
            <Button
              onClick={handleManualEntry}
              variant="contained"
              aria-label="Submit Charger ID"
              sx={{
                minWidth: "52px",
                width: "52px",
                borderRadius: "15px",
                background: "linear-gradient(135deg, #ff8236 0%, #ff521a 100%)",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(255, 82, 26, 0.35)",
                transition: "all 0.18s ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #ff924e 0%, #ff622e 100%)",
                  boxShadow: "0 6px 18px rgba(255, 82, 26, 0.45)",
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  transform: "scale(0.96)",
                },
              }}
            >
              <ArrowForwardRoundedIcon sx={{ fontSize: 21 }} />
            </Button>
          </Box>

          {error && (
            <Box
              sx={{
                mt: 1.5,
                background: "#fff2f0",
                border: "1px solid #ffd4ce",
                borderRadius: "12px",
                px: 1.5,
                py: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <ErrorOutlineRoundedIcon sx={{ color: "#d93025", fontSize: 18 }} />
              <Typography
                sx={{
                  fontSize: "12px",
                  color: "#c22217",
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                {error}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── FOOTER NAVIGATION BAR ── */}
      <FooterNav />

      <style>
        {`
          /* Sunrise Orange Corner Reticles */
          .corner-tl, .corner-tr, .corner-bl, .corner-br {
            position: absolute;
            width: 38px;
            height: 38px;
            border-radius: 6px;
            border: 4px solid #ff8236;
            z-index: 2;
            background: none;
            filter: drop-shadow(0 2px 6px rgba(255, 130, 54, 0.45));
          }

          .corner-tl { top: 22px; left: 22px; border-bottom: none; border-right: none; }
          .corner-tr { top: 22px; right: 22px; border-bottom: none; border-left: none; }
          .corner-bl { bottom: 22px; left: 22px; border-top: none; border-right: none; }
          .corner-br { bottom: 22px; right: 22px; border-top: none; border-left: none; }

          /* Electric Aqua Scanner Laser */
          .qr-scan-laser {
            position: absolute;
            left: 20px;
            right: 20px;
            height: 3px;
            background: linear-gradient(90deg, transparent, #00d2b4, #00e5be, transparent);
            box-shadow: 0 0 14px #00d2b4, 0 0 4px #ffffff;
            border-radius: 999px;
            z-index: 2;
            animation: qrScanMotion 2.2s ease-in-out infinite alternate;
          }

          @keyframes qrScanMotion {
            0% { top: 24px; opacity: 0.2; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { top: calc(100% - 24px); opacity: 0.2; }
          }
        `}
      </style>
    </>
  );
};

const scanGuideStyles = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 2,
};

export default QRScanner;