import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "qr-scanner";
import axios from "axios";

import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
} from "@mui/material";

import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

const QRScanner = () => {
  const navigate = useNavigate();
  const [device_id, setDeviceId] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          if (result?.data) {
            setDeviceId(result.data);
            verifyDevice(result.data);
            qrScannerRef.current.stop();
          }
        },
        {
          preferredCamera: "environment",
          highlightScanRegion: false,
          highlightCodeOutline: false,
        }
      );
      qrScannerRef.current.start().catch(() => {
        setError("Camera access failed. Please check browser permission.");
      });
    }
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
    // eslint-disable-next-line
  }, []);

  const verifyDevice = async (id) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/devices/check-device/${id}`
      );
      if (response.data.exists) {
        navigate(`/charging-options/${id}`);
      } else {
        setError("Device not found. Please check the ID.");
      }
    } catch (err) {
      setError("Error verifying device. Try again.");
    }
  };

  const handleManualEntry = async () => {
    if (device_id.trim() !== "") {
      await verifyDevice(device_id);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "#0f1d23",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        pt: 8,
      }}
      >
              <Typography
          variant="h6"
          sx={{
            position: "absolute",
            top: 20,
            left: 0,
            width: "100%",
            textAlign: "center",
            color: "#e6f9ff",
            fontWeight: 600,
            fontSize: "1rem",
            textShadow: "0 2px 8px #0008",
            zIndex: 3,
            letterSpacing: "0.02em",
          }}
        >
          Scan Charger QR Code
        </Typography>
      {/* Camera container */}
      <Box
        sx={{
          position: "relative",
          width: "100vw",
          maxWidth: "100vw",
          minHeight: { xs: "260px", sm: "340px", md: "420px" },
          height: { xs: "45vh", sm: "48vh", md: "56vh" },
          bgcolor: "#091217",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 0 10px #02687333",
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
            background: "#222",
            borderRadius: "18px",
          }}
          playsInline
        />
        {/* Animated corners with motion closer to center */}
        <Box sx={cornerOverlayStyles}>
          <span className="corner-tl" />
          <span className="corner-tr" />
          <span className="corner-bl" />
          <span className="corner-br" />
        </Box>

      </Box>

      {/* Fixed width controls container */}
      <Box
        sx={{
          width: "340px",
          maxWidth: "96vw",
          bgcolor: "#091217",
          borderRadius: "18px",
          p: 3,
          boxShadow: "0 0 10px #02687333",
          mt: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {error && (
          <Typography
            variant="body2"
            color="error"
            sx={{
              mb: 2,
              textAlign: "center",
              backgroundColor: "#ffffff14",
              padding: "8px 12px",
              borderRadius: "8px",
              fontWeight: 500,
            }}
          >
            {error}
          </Typography>
        )}

<TextField
  variant="outlined"
  placeholder="Enter Charger ID manually"
  value={device_id}
  onChange={(e) => setDeviceId(e.target.value)}
  inputProps={{ maxLength: 60 }}
  fullWidth
  sx={{
    mb: 1,
    "& .MuiOutlinedInput-root": {
      borderRadius: "14px",
      height: 48,
      background: "#0f1d23",
      color: "#e6f9ff",
      fontWeight: 500,
      pr: 0, // Remove or keep minimal padding right
    },
    "& .MuiOutlinedInput-input": {
      paddingRight: "36px", // Ensure enough padding for icon button inside
    },
    "& .MuiOutlinedInput-notchedOutline": {
      border: "1px solid #ffffff0f",
    },
    "& input": { color: "#e6f9ff" },
  }}
  InputProps={{
    endAdornment: (
      <InputAdornment position="end" sx={{ marginRight: 1 }}>
        <IconButton
          aria-label="Verify"
          edge="end"
          onClick={handleManualEntry}
          size="small" // smaller size for neat appearance
          sx={{
            background: "#026873ff",
            color: "#fff",
            borderRadius: "8px",
            padding: "10px",
            "&:hover": { background: "#039FA6ff" },
          }}
        >
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </InputAdornment>
    ),
  }}
/>

      </Box>

      {/* Back button */}
<Box
  sx={{
    width: "340px",
    maxWidth: "96vw",
    mt: 2,
    display: "flex",
    justifyContent: "center", // horizontal center
    alignItems: "center",     // vertical center (if needed)
  }}
>
  <Button
    variant="outlined"
    size="large"
    startIcon={<ArrowBackIosNewIcon sx={{ marginLeft: "4px" }} />}
    onClick={() => navigate("/home")}
    sx={{
      height: 48,
      width: "100px",
      borderRadius: "14px",
      color: "#04BFBF",
      border: "2px solid #04BFBF",
      textTransform: "none",
      fontWeight: 600,
      background: "#0f1d230a",
      "&:hover": {
        backgroundColor: "#023C40",
        border: "2px solid #039FA6",
        color: "#039FA6",
      },
    }}
  >
    Back
  </Button>
</Box>


      {/* Animated corners moving closer and back */}
      <style>
        {`
          .corner-tl, .corner-tr, .corner-bl, .corner-br {
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 4px;
            border: 4px solid #ffd600;
            z-index: 2;
            animation: corners-move 2s infinite ease-in-out;
            background: none;
          }
          .corner-tl { top: 18px; left: 18px; border-bottom: none; border-right: none; }
          .corner-tr { top: 18px; right: 18px; border-bottom: none; border-left: none; }
          .corner-bl { bottom: 18px; left: 18px; border-top: none; border-right: none; }
          .corner-br { bottom: 18px; right: 18px; border-top: none; border-left: none; }
          @keyframes corners-move {
            0%, 100% {
              transform: translate(0, 0);
            }
            50% {
              transform: translate(4px, 4px);
            }
          }
          .corner-tr {
            animation-name: corners-move-tr;
          }
          .corner-bl {
            animation-name: corners-move-bl;
          }
          .corner-br {
            animation-name: corners-move-br;
          }
          @keyframes corners-move-tr {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(-4px, 4px); }
          }
          @keyframes corners-move-bl {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(4px, -4px); }
          }
          @keyframes corners-move-br {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(-4px, -4px); }
          }
        `}
      </style>
    </Box>
  );
};

const cornerOverlayStyles = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: 2,
};

export default QRScanner;
