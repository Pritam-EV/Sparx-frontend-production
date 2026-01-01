import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/appStyles.css";
import { Box, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';


const Home = () => {
  const navigate = useNavigate();
const userMarkerRef = useRef(null);
const mapRef = useRef(null);
const defaultCenter = [18.5204, 73.8567];
  const [map, setMap] = useState(null);
  const [devices, setDevices] = useState([]);
  const activeMarkerRef = useRef(null);
  // State to force re-fetch
const [reloadToggle, setReloadToggle] = useState(false);



// ---- Support popup state & helpers ----
const [showSupportPopup, setShowSupportPopup] = useState(false);

// Get user name safely from localStorage (try `user` then `profile`)
const getUserNameFromLocal = () => {
  const raw = localStorage.getItem("user") || localStorage.getItem("profile") || "{}";
  let parsed = {};
  try { parsed = JSON.parse(raw); } catch (e) { parsed = { name: raw }; }
  return parsed.name || parsed.fullName || parsed.username || parsed.userName || parsed.displayName || "User";
};

const supportPhone = "918855094432"; // international format without '+'
const getWhatsappUrl = () => {
  const userName = getUserNameFromLocal();
  const msg = `Hi,\n${userName} this side.\nI need help with charging my EV with Sparx Charging Point.`;
  return `https://wa.me/${supportPhone}?text=${encodeURIComponent(msg)}`;
};

const handleOpenSupport = () => setShowSupportPopup(true);
const handleCloseSupport = () => setShowSupportPopup(false);
// ---- end support helpers ----

// Manually refresh device list
  const handleRefresh = () => {
    setReloadToggle(prev => !prev);
  };

  // Center map on user
  // Locate button handler uses map.setView


const handleLocate = () => {
  console.log("[Locate] Button clicked");

  if (!mapRef.current) {
    console.warn("[Locate] Map not ready yet");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      console.log("[Locate] Got GPS:", coords);

      const latlng = [coords.latitude, coords.longitude];

      // Equivalent to HERE’s setCenter + setZoom
      mapRef.current.setView(latlng, 15, { animate: true });

      // Optional: add blue dot
      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
      }
      const circle = L.circleMarker(latlng, {
        radius: 8,
        color: "#136aec",
        fillColor: "#2a93ee",
        fillOpacity: 0.9
      }).addTo(mapRef.current);
      userMarkerRef.current = circle;
    },
    (err) => console.error("[Locate] Geolocation error:", err),
    { enableHighAccuracy: true }
  );
};


const attemptLocate = () => {
  if (!mapRef.current) {
    console.warn("[Locate] Map still not ready");
    return;
  }

  if (!navigator.geolocation) {
    console.warn("[Locate] Geolocation not supported");
    mapRef.current.setView(defaultCenter, 12);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const latlng = [coords.latitude, coords.longitude];
      console.log("[Locate] Got position:", latlng);

      mapRef.current.setView(latlng, 16, { animate: true });

      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
      }

      const circle = L.circleMarker(latlng, {
        radius: 10,
        color: "#136aec",
        fillColor: "#2a93ee",
        fillOpacity: 0.9,
        weight: 2
      }).addTo(mapRef.current);

      userMarkerRef.current = circle;
    },
    (err) => {
      console.error("[Locate] Geolocation error:", err);
      mapRef.current.setView(defaultCenter, 12);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};





useEffect(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => {
        console.log("Location permission granted ✅");
      },
      (err) => {
        console.warn("Location permission denied ❌", err);
      }
    );
  }
}, []);

useEffect(() => {
  if (!mapRef.current) return;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latlng = [coords.latitude, coords.longitude];
        mapRef.current.setView(latlng, 16, { animate: true });

        // Add blue dot
        if (userMarkerRef.current) {
          mapRef.current.removeLayer(userMarkerRef.current);
        }
        const circle = L.circleMarker(latlng, {
          radius: 10,
          color: "#136aec",
          fillColor: "#2a93ee",
          fillOpacity: 0.9,
          weight: 2
        }).addTo(mapRef.current);

        userMarkerRef.current = circle;
      },
      (err) => {
        console.warn("Location permission denied ❌", err);
        // fallback center
        mapRef.current.setView(defaultCenter, 12);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    // fallback if geolocation not supported
    mapRef.current.setView(defaultCenter, 12);
  }
}, []);



useEffect(() => {
  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = `${process.env.REACT_APP_Backend_API_Base_URL}/api/devices`;

      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const response = await axios.get(url, config);

      const devicesData = Array.isArray(response.data)
        ? response.data
        : response.data.devices || response.data;

      setDevices(devicesData);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  fetchDevices();
  const interval = setInterval(fetchDevices, 10000); // 🔥 every 10 seconds
  return () => clearInterval(interval);
}, [reloadToggle]);




  const getDirections = (lat, lng) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${lat},${lng}&travelmode=driving`;
        window.open(gmapsUrl, "_blank");
      },
      () => {
        const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(gmapsUrl, "_blank");
      }
    );
  };



function showDevicePopup(device, marker) {
  // Remove any existing popup
  const oldPopup = document.getElementById("custom-popup");
  if (oldPopup) oldPopup.remove();
  document.removeEventListener("click", window._popupOutsideClick);

    // Shrink old marker
  if (activeMarkerRef.current && activeMarkerRef.current !== marker) {
    smoothShrinkMarker(activeMarkerRef.current);
  }

  activeMarkerRef.current = marker;

  // Determine glow color
  const glowColor =
    device.status === "Available" ? "#04BFBF" :
    device.status === "Occupied" ? "#F2A007" : "#888888";

  smoothEnlargeMarker(marker, glowColor);

  // Build popup
  const popupDiv = document.createElement("div");
  popupDiv.id = "custom-popup";
  popupDiv.innerHTML = `
    <div id="popup-content" style="
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 400px;
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 0 18px rgba(0,0,0,0.2);
      padding: 16px;
      font-family: 'Open Sans', sans-serif;
      color: #011F26;
      z-index: 2000;
    ">
      <button id="close-popup" style="
        position: absolute;
        top: 8px;
        right: 10px;
        background: transparent;
        border: none;
        font-size: 15px;
        color: #011F26;
        cursor: pointer;
      ">×</button>

      <div style="display: flex; align-items: center;">
        <img src="${device.image || '/device-image.png'}" alt="Charger" style="
          width: 80px;
          height: 90px;
          border-radius: 8px;
          object-fit: cover;
          margin-right: 8px;
        " />

        <div style="flex: 1;">
          <div style="margin-bottom: 4px; font-size: 15px;">
            <strong>Location: </strong> ${device.location || "Unknown"}
          </div>

          <div style="margin-bottom: 4px; font-size: 15px;">
            <strong>Type: </strong> ${device.charger_type || "N/A"}
          </div>

          <div style="margin-bottom: 4px; font-size: 15px;">
            <strong>Rate: </strong> ₹${device.rate || 0}/kWh
          </div>

          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <strong>Status: </strong>
            <span style="
              display: inline-block;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background-color: ${device.status === "Available" ? "#20b000" : "#e00f00"};
              margin-left: 6px;
              margin-right: 6px;
            "></span>
            ${device.status}
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="connect-device" style="
              flex: 2;
              padding: 8px;
              background: #04BFBF;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              Connect with Charger
            </button>
            <button id="get-directions" style="
              flex: 0.6;
              padding: 8px;
              background: #F2A007;
              color: #011F26;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" fill="#011F26">
                <path d="M12 2L3 21l9-4 9 4-9-19z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(popupDiv);

  // Animate marker
  if (activeMarkerRef.current && activeMarkerRef.current !== marker) {
    smoothShrinkMarker(activeMarkerRef.current);
  }
  activeMarkerRef.current = marker;
  smoothEnlargeMarker(marker, device.status === "Available" ? "#04BFBF" : device.status === "Occupied" ? "#F2A007" : "#888");

  // Close popup
  const closePopup = () => {
    document.getElementById("custom-popup")?.remove();
    smoothShrinkMarker(marker);
    activeMarkerRef.current = null;
    document.removeEventListener("click", window._popupOutsideClick);
  };
  document.getElementById("close-popup")?.addEventListener("click", closePopup);

  // Outside click handler (global reference)
  window._popupOutsideClick = (event) => {
    const popupEl = document.getElementById("custom-popup");
    if (popupEl && !popupEl.contains(event.target)) {
      closePopup();
    }
  };
  setTimeout(() => {
    document.addEventListener("click", window._popupOutsideClick);
  }, 0);

  // Buttons
  // Buttons
  document.getElementById("connect-device")?.addEventListener("click", () => {
    if (device.status === "Available") {
      closePopup();
      navigate("/qr-scanner");
    }
  });
  document.getElementById("get-directions")?.addEventListener("click", () => {
    closePopup();
    getDirections(device.lat, device.lng);
  });
}



function smoothEnlargeMarker(marker, glowColor) {
    if (!marker) return;
  marker.originalIcon = marker.getIcon(); // store original
  let scale = 1;
  const maxScale = 1.2;
  const step = 0.1;
  const interval = setInterval(() => {
    if (scale >= maxScale) {
      clearInterval(interval);
    } else {
      scale += step;
      // Reuse the same glow filter logic for intermediate icons
      const size = 48 * scale;
      const anchorY = size * 1.1;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <defs><filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${glowColor}" flood-opacity="0.8"/>
        </filter></defs>
        <path d="M12 2C8 2 5 5.1 5 9c0 4.4 7 13 7 13s7-8.6 7-13c0-3.9-3-7-7-7z" 
              fill="#121B22" filter="url(#glow)"/>
        <path d="M13 7h-2l-1 4h2l-1 4 4-5h-2l1-3z" fill="${glowColor}"/>
      </svg>`;
      const url = "data:image/svg+xml;base64," + btoa(svg);
      marker.setIcon(new L.Icon({ iconUrl: url, iconSize: [size, size], iconAnchor: [size/2, anchorY] }));
    }
  }, 30);
}

function smoothShrinkMarker(marker) {
    if (!marker || !marker.originalIcon) return;
  marker.setIcon(marker.originalIcon); // restore
  let scale = 1.2;
  const minScale = 1.0;
  const step = 0.1;
  const glowColor = "#888888";

  const interval = setInterval(() => {
    if (scale <= minScale) {
      clearInterval(interval);
      marker.setIcon(marker.originalIcon || marker.getIcon());
    } else {
      scale -= step;
      const size = 48 * scale;
      const anchorY = size * 1.1;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <defs><filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${glowColor}" flood-opacity="0.8"/>
        </filter></defs>
        <path d="M12 2C8 2 5 5.1 5 9c0 4.4 7 13 7 13s7-8.6 7-13c0-3.9-3-7-7-7z"
              fill="#121B22" filter="url(#glow)"/>
        <path d="M13 7h-2l-1 4h2l-1 4 4-5h-2l1-3z" fill="${glowColor}"/>
      </svg>`;
      const url = "data:image/svg+xml;base64," + btoa(svg);
      marker.setIcon(new L.Icon({ iconUrl: url, iconSize: [size, size], iconAnchor: [size/2, anchorY] }));
    }
  }, 16);

    
    // On popup close, smoothly shrink back
    const closePopup = () => {
      document.getElementById("custom-popup")?.remove();
    };

    document.getElementById("close-popup")?.addEventListener("click", closePopup);


  }




  return (
    <>
    <div className="top-bar">
      <img src="/logo.png" alt="Sparx Logo" className="top-bar-logo" />
    </div>
    <div className="home-container">

      <div className="bottom-bar">
        <button onClick={() => navigate("/sessions")} className="home-button">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9v8l9-12h-9z"/> {/* Thunderbolt */}
            </svg>
            <span style={{ fontFamily: "'Rubik', sans-serif", fontSize: "9px", marginTop: "4px", color: "#cdebf5" }}>Sessions</span>
          </div>
        </button>

        <button onClick={() => navigate("/home")} className="scan-button">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#04BFBF" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/> {/* Home */}
            </svg>
            <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "9px", marginTop: "4px", color: "#04BFBF" }}>Home</span>
          </div>
        </button>

        <button onClick={() => navigate("/profile")} className="home-button">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/> {/* Profile */}
            </svg>
            <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "9px", marginTop: "4px", color: "#cdebf5" }}>Profile</span>
          </div>
        </button>
      </div>


      <button onClick={() => navigate("/qr-scanner")} className="qr-floating-button" style={{
        position: "absolute",
        top: "80px",
        right: "20px",
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        backgroundColor: "#04BFBF",
        border: "none",
        boxShadow: "0 0 12px #04BFBF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 1002,
        }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="#0f1a1d">
          <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM3 13v8h8v-8H3zm6 6H5v-4h4v4zM13 13h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v6h-6v-2h4v-4z"/>
        </svg>
      </button>

      {/* SUPPORT floating button — placed below the QR scanner button */}
<button
  onClick={handleOpenSupport}
  className="qr-floating-button support-button"
  style={{
    position: "absolute",
    top: "140px",      // just below the QR button (which is 80px)
    right: "20px",
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#04bfbf", // whatsapp green
    border: "none",
    boxShadow: "0 0 12px #04bfbf",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 1002,
  }}
  aria-label="Support via WhatsApp"
>
  {/* WhatsApp SVG icon (inline, small) */}
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="26" height="26" fill="#fff">
    <path d="M16 3C9.4 3 4 8.4 4 15c0 2.6.8 5 2.3 7L4 29l7-2.5c1.9 1 4.1 1.6 6 1.6 6.6 0 12-5.4 12-12S22.6 3 16 3zm5.6 18.6c-.3.8-1.7 1.5-2.4 1.6-.6.1-1.6.2-3.2-.5-3.8-1.6-6.3-5.5-6.5-5.8-.2-.3-1.3-1.8-1.3-3.4 0-1.6.9-2.4 1.3-2.8.3-.3.8-.4 1.2-.4.3 0 .6 0 .9 0 .3 0 .6-.1.9-.1.3 0 .6 0 .9.1.3.1 1.1.4 1.3.5.2.1.4.2.6.2.2 0 .4-.1.6-.1.3-.1.6-.2.9-.2.2 0 .4 0 .7.2.3.2 1.2.9 1.4 1.1.2.2.4.5.5.9.1.3 0 .6 0 .9 0 .3-.1.6-.1.9 0 .3-.1.6-.2.9-.1.3-.2.6-.4.9-.1.2-.2.4-.2.5-.1.2-.2.4-.3.5-.1.2-.1.4-.1.7 0 .3.1.7.2 1 .1.3.2.6.4.9.2.3.4.6.6.9.2.3.4.7.4 1.1 0 .4-.4.7-.6 1z" />
  </svg>
</button>


    <Box sx={{ position: "relative", height: `calc(100vh - 56px)`, width: "100%" }}>
{/* Leaflet MapContainer replaces the old map div */}
            <MapContainer
              center={[18.5204, 73.8567]}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(mapInstance) => {
                console.log("[Map] Ready");
                mapRef.current = mapInstance;
              }}
            >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* Render a Marker for each device */}
            {devices.map((device, idx) => {
              if (typeof device.lat !== "number" || typeof device.lng !== "number") return null;
              const glowColor = device.status === "Available" ? "#04BFBF"
                                : device.status === "Occupied"  ? "#F2A007" : "#888888";
              const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                  <defs>
                    <filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${glowColor}" flood-opacity="0.8"/>
                    </filter>
                  </defs>
                  <path d="M12 2C8 2 5 5.1 5 9c0 4.4 7 13 7 13s7-8.6 7-13c0-3.9-3-7-7-7z"
                        fill="#121B22" filter="url(#glow)"/>
                  <path d="M13 7h-2l-1 4h2l-1 4 4-5h-2l1-3z" fill="${glowColor}"/>
                </svg>
              `;
              const iconUrl = "data:image/svg+xml;base64," + btoa(svg);
              const icon = new L.Icon({
                iconUrl,
                iconSize: [36, 36],
                iconAnchor: [18, 36],
              });
              const handleMarkerClick = (e, device) => {
              const marker = e.target; // Leaflet marker instance
              showDevicePopup(device, marker);
            };

              return (
                <Marker
                  key={device.id || idx}
                  position={[device.lat, device.lng]}
                  icon={icon}
                  eventHandlers={{ click: (e) => handleMarkerClick(e, device) }}
                />
              );
            })}
          </MapContainer>

              <div className="bottom-buttons">
                <Tooltip title="Refresh Devices">
                  <IconButton
                    onClick={handleRefresh}
                    sx={{
                      bgcolor: "#04BFBF",
                      "&:hover": { bgcolor: "rgba(4,191,191,0.1)" },
                      color: "#121B22",
                      fontWeight: "bold",
                      borderRadius: "50%",
                      boxShadow: "0 0 12px #04BFBF"
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Go to My Location">
                  <IconButton
                    onClick={handleLocate}
                    sx={{
                      bgcolor: "#04BFBF",
                      "&:hover": { bgcolor: "rgba(4,191,191,0.1)" },
                      color: "#121B22",
                      fontWeight: "bold",
                      boxShadow: "0 0 12px #04BFBF"
                    }}
                  >
                    <MyLocationIcon />
                  </IconButton>
                </Tooltip>
              </div>
        </Box>

{/* SUPPORT Popup */}
{showSupportPopup && (
  <div className="support-overlay" onClick={handleCloseSupport}>
    <div className="support-box" onClick={(e) => e.stopPropagation()}>
      <button className="support-close" onClick={handleCloseSupport} aria-label="Close">✕</button>
      <h3>For help and support</h3>
      <p>Connect with us via WhatsApp</p>

      <a
        href={getWhatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="support-whatsapp-link"
        style={{ textDecoration: "none" }}
      >
        <div className="support-whatsapp" style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
          {/* WhatsApp big icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="44" height="60" fill="#25D366">
            <path d="M16 3C9.4 3 4 8.4 4 15c0 2.6.8 5 2.3 7L4 29l7-2.5c1.9 1 4.1 1.6 6 1.6 6.6 0 12-5.4 12-12S22.6 3 16 3zm5.6 18.6c-.3.8-1.7 1.5-2.4 1.6-.6.1-1.6.2-3.2-.5-3.8-1.6-6.3-5.5-6.5-5.8-.2-.3-1.3-1.8-1.3-3.4 0-1.6.9-2.4 1.3-2.8.3-.3.8-.4 1.2-.4.3 0 .6 0 .9 0 .3 0 .6-.1.9-.1.3 0 .6 0 .9.1.3.1 1.1.4 1.3.5.2.1.4.2.6.2.2 0 .4-.1.6-.1.3-.1.6-.2.9-.2.2 0 .4 0 .7.2.3.2 1.2.9 1.4 1.1.2.2.4.5.5.9.1.3 0 .6 0 .9 0 .3-.1.6-.1.9 0 .3-.1.6-.2.9-.1.3-.2.6-.4.9-.1.2-.2.4-.2.5-.1.2-.2.4-.3.5-.1.2-.1.4-.1.7 0 .3.1.7.2 1 .1.3.2.6.4.9.2.3.4.6.6.9.2.3.4.7.4 1.1 0 .4-.4.7-.6 1z" />
          </svg>

          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700 }}>WhatsApp Support</div>
          </div>
        </div>
      </a>

    </div>
  </div>
)}



        </div>
      </>
  );
};

const styles = {
  
  qrFloatingButton: {
    position: "absolute",
    top: "80px",
    right: "20px",
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#ff9100",
    border: "none",
    boxShadow: "0 0 12px #ff9100",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 1002,
  },

  qrIcon: {
    width: "28px",
    height: "28px",
    filter: "invert(10%) drop-shadow(0 0 2px #0f1a1d)",
  },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "50px",
    backgroundColor: "#0f1a1d",
    boxShadow: "0 2px 12px #86c6d7",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1002,
  },

  logo: {
    height: "70px",
    filter: "drop-shadow(0 0 6px #86c6d7)",
  },

  container: {
    width: "100%",
    height: "100vh",
    position: "relative",
    backgroundColor: "#0f1a1d",
  },
  mapContainer: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  buttonContainer: {
    position: "fixed",
    bottom: "15px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "90%",
    display: "flex",
    justifyContent: "space-between",
    zIndex: 1001,
  },
  button: {
    flex: 1,
    padding: "12px",
    fontSize: "14px",
    margin: "0 5px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#193f4a",
    color: "#cdebf5",
    cursor: "pointer",
    boxShadow: "0 0 8px #86c6d7",
    transition: "all 0.3s ease",
  },
  scanButton: {
    flex: 1.5,
    padding: "12px",
    fontSize: "14px",
    margin: "0 5px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#ff9100",
    color: "#0f1a1d",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 0 10px #ff9100",
    transition: "all 0.3s ease",
  },
};

export default Home;