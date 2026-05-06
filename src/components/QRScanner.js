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
  InputAdornment,
} from "@mui/material";

import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

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
      setError("Camera access failed. Please check browser permission.");
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
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at top, rgba(8,38,46,0.9) 0%, #0b151a 45%, #081116 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: 2,
        pb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pt: 2,
          pb: 2,
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "linear-gradient(180deg, rgba(11,21,26,0.98), rgba(11,21,26,0.82), transparent)",
          backdropFilter: "blur(8px)",
        }}
      >
        <IconButton
          onClick={() => navigate("/home")}
          sx={{
            width: 42,
            height: 42,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(4,191,191,0.18)",
            color: "#dffaff",
            "&:hover": {
              background: "rgba(4,191,191,0.10)",
            },
          }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
        </IconButton>

        <Typography
          sx={{
            color: "#e6f9ff",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.02em",
            textAlign: "center",
          }}
        >
          Scan Charger QR
        </Typography>

        <Box sx={{ width: 42, height: 42 }} />
      </Box>

      {/* Scanner section */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 1,
        }}
      >
        <Typography
          sx={{
            color: "#9dc2cc",
            fontSize: "13px",
            textAlign: "center",
            mb: 2,
            px: 1,
            lineHeight: 1.5,
          }}
        >
          Align the charger QR code inside the frame or enter the charger ID manually.
        </Typography>

        <Box
          sx={{
            position: "relative",
            width: "100%",
            borderRadius: "22px",
            overflow: "hidden",
            background: "#091217",
            border: "1px solid rgba(4,191,191,0.16)",
            boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
            minHeight: { xs: "280px", sm: "360px" },
            height: { xs: "42vh", sm: "48vh" },
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
              background: "#101820",
            }}
            playsInline
          />

          <Box sx={scanGuideStyles}>
            <span className="corner-tl" />
            <span className="corner-tr" />
            <span className="corner-bl" />
            <span className="corner-br" />
          </Box>
        </Box>

        {/* Manual entry */}
        <Box
          sx={{
            width: "100%",
            mt: 2.2,
            background: "rgba(9,18,23,0.95)",
            borderRadius: "20px",
            border: "1px solid rgba(4,191,191,0.14)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.28)",
            p: 2,
          }}
        >
          <Typography
            sx={{
              color: "#e6f9ff",
              fontSize: "14px",
              fontWeight: 600,
              mb: 1.2,
            }}
          >
            Enter charger ID manually
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "stretch",
            }}
          >
            <TextField
              variant="outlined"
              placeholder="Enter Charger ID"
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
                  borderRadius: "14px",
                  minHeight: 50,
                  background: "#0f1d23",
                  color: "#e6f9ff",
                  fontWeight: 500,
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.08)",
                },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(4,191,191,0.35)",
                },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#04BFBF",
                },
                "& input": {
                  color: "#e6f9ff",
                  fontSize: "14px",
                  padding: "13px 14px",
                },
                "& input::placeholder": {
                  color: "#7ea0ab",
                  opacity: 1,
                },
              }}
            />

            <Button
              onClick={handleManualEntry}
              variant="contained"
              sx={{
                minWidth: "54px",
                width: "54px",
                borderRadius: "14px",
                background: "linear-gradient(180deg, #04BFBF 0%, #028b8b 100%)",
                color: "#062126",
                boxShadow: "0 10px 24px rgba(4,191,191,0.28)",
                "&:hover": {
                  background: "linear-gradient(180deg, #03a7a7 0%, #027676 100%)",
                },
              }}
            >
              <ArrowForwardIosIcon sx={{ fontSize: 18 }} />
            </Button>
          </Box>

          {error && (
            <Typography
              sx={{
                mt: 1.25,
                fontSize: "12.5px",
                color: "#ff8e8e",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,90,90,0.18)",
                borderRadius: "12px",
                px: 1.5,
                py: 1,
                textAlign: "center",
              }}
            >
              {error}
            </Typography>
          )}
        </Box>
      </Box>

      <style>
        {`
          .corner-tl, .corner-tr, .corner-bl, .corner-br {
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 4px;
            border: 4px solid #ffd600;
            z-index: 2;
            animation: corners-move 2s infinite ease-in-out;
            background: none;
          }

          .corner-tl { top: 22px; left: 22px; border-bottom: none; border-right: none; }
          .corner-tr { top: 22px; right: 22px; border-bottom: none; border-left: none; }
          .corner-bl { bottom: 22px; left: 22px; border-top: none; border-right: none; }
          .corner-br { bottom: 22px; right: 22px; border-top: none; border-left: none; }

          @keyframes corners-move {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(4px, 4px); }
          }

          .corner-tr { animation-name: corners-move-tr; }
          .corner-bl { animation-name: corners-move-bl; }
          .corner-br { animation-name: corners-move-br; }

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

const scanGuideStyles = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 2,
};

export default QRScanner;