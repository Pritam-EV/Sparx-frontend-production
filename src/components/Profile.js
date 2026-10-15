// src/components/Profile.js (or src/pages/Profile.js)
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Button,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import FooterNav from "../components/FooterNav";
import AppHeader from "../components/AppHeader";
import { getGroupedVehicles } from "../utils/evVehicles";

const PLATE_REGEX = /^[A-Z0-9]{5,15}$/;
function validatePlate(raw) {
  const cleaned = (raw || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return PLATE_REGEX.test(cleaned) ? cleaned : null;
}

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = localStorage.getItem("user");
  const userData = user && user !== "undefined" ? JSON.parse(user) : null;

  const [policyPopup, setPolicyPopup] = useState({ open: false, type: "" });
  const openPolicy = (type) => setPolicyPopup({ open: true, type });
  const closePolicy = () => setPolicyPopup({ open: false, type: "" });

  const [operatorSuccess, setOperatorSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [queryMessage, setQueryMessage] = useState("");

  const [updatedUserData, setUpdatedUserData] = useState({
    name: userData?.name || "",
    email: userData?.email || "",
    mobile: userData?.mobile || "",
    vehicleType: userData?.vehicleType || "",
    vehicleModel: userData?.vehicleModel || "",
    vehicleNumber: userData?.vehicleNumber || userData?.vehicleReg || "",
    gstin: userData?.gstin || "",
  });

  useEffect(() => {
    setPopupVisible(false);
    setIsEditing(false);
    setOperatorOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("lastPage");
    navigate("/");
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (
      updatedUserData.email &&
      !/^\S+@\S+\.\S+$/.test(updatedUserData.email)
    ) {
      alert("Please enter a valid email address");
      return;
    }

    const response = await fetch(
      `${process.env.REACT_APP_Backend_API_Base_URL}/api/auth/updateProfile`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedUserData),
      }
    );

    if (response.ok) {
      const updatedUser = await response.json();
      localStorage.setItem("user", JSON.stringify(updatedUser.user));
      setUpdatedUserData({
        name: updatedUser.user.name,
        email: updatedUser.user.email,
        mobile: updatedUser.user.mobile,
        vehicleType: updatedUser.user.vehicleType,
        vehicleModel: updatedUser.user.vehicleModel || "",
        vehicleNumber: updatedUser.user.vehicleNumber || "",
        gstin: updatedUser.user.gstin || "",
      });
      setIsEditing(false);
      window.location.href = "/profile";
    } else {
      const err = await response.json().catch(() => ({}));
      alert(err.message || "Failed to update profile. Please try again.");
    }
  };

  // Only admin and owner can access the station manager dashboard
  const handleGoToDashboard = async () => {
    if (userData?.role === "admin") {
      navigate("/admin");
    } else if (userData?.role === "owner") {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/owner`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const hasCharger = Array.isArray(data)
          ? data.length > 0
          : Array.isArray(data?.chargers)
          ? data.chargers.length > 0
          : false;
        if (hasCharger) {
          navigate("/owner");
        } else {
          setPopupVisible(true);
        }
      } catch {
        navigate("/owner");
      }
    }
  };

  const closePopup = () => setPopupVisible(false);

  // Auto-attaches existing profile info in payload
  const handleOperatorSubmit = async () => {
    if (!queryMessage.trim()) {
      alert("Please enter your message or query.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: userData?.name || "App User",
        mobile: userData?.mobile || "",
        email: userData?.email || "",
        location: queryMessage.trim(),
        budget: 1,
      };

      const res = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/operator/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setOperatorOpen(false);
          setOperatorSuccess(true);
          return;
        }
        alert(data.message || "Failed to submit. Please try again.");
        return;
      }

      setOperatorOpen(false);
      setOperatorSuccess(true);
      setQueryMessage("");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const userInitials = (userData?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isStationManager = userData?.role === "admin" || userData?.role === "owner";

  return (
    <>
      <AppHeader />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .pf-viewport {
          width: 100%;
          min-height: calc(100dvh - 68px);
          height: calc(100dvh - 68px);
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 100% 0%, rgba(0, 229, 190, 0.08), transparent 26rem),
            radial-gradient(circle at 0% 45%, rgba(255, 130, 54, 0.05), transparent 24rem),
            #f3fbfc;
          color: #0e2e33;
          font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }

        .pf-shell {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px 16px calc(110px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* ── HEADER ACTION ROW ── */
        .pf-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 4px;
        }

        .pf-title {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #0e2e33;
          letter-spacing: -0.3px;
          margin: 0;
        }

.pf-btn-edit-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 12px;
          background: #fff8f3;
          border: 1px solid #ffd8c7;
          color: #ff8236;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(255, 130, 54, 0.08);
          transition: all 0.16s ease;
        }
        .pf-btn-edit-toggle:hover {
          background: #ffede3;
          border-color: #ff8236;
        }

        .pf-avatar-circle {
          width: 72px;
          height: 72px;
          border-radius: 24px;
          background: linear-gradient(135deg, #00d2b4 0%, #009e8f 100%);
          color: #ffffff;
          display: grid;
          place-items: center;
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          box-shadow: 0 8px 24px rgba(0, 14, 53, 0.32);
          margin-bottom: 12px;
        }
        /* ── CENTERED HERO CARD ── */
        .pf-hero-centered {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 26px;
          padding: 24px 20px 20px;
          box-shadow: 0 6px 24px rgba(0, 160, 145, 0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-sizing: border-box;
        }

        .pf-hero-name {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #0e2e33;
          letter-spacing: -0.3px;
          line-height: 1.25;
        }

        .pf-hero-sub {
          font-size: 13px;
          color: #53757a;
          margin-top: 4px;
          font-variant-numeric: tabular-nums;
        }

        /* ── SECTION GROUPS ── */
        .pf-group-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 4px 18px rgba(0, 160, 145, 0.05);
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-sizing: border-box;
        }

          .pf-group-title {
          font-size: 11px;
          font-weight: 800;
          color: #ff8236;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pf-field-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 14px;
          background: #f7fdfc;
          border: 1px solid #e1f5f2;
        }

        .pf-field-label {
          font-size: 11px;
          font-weight: 750;
          color: #53757a;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .pf-field-val {
          font-size: 13.5px;
          font-weight: 750;
          color: #0e2e33;
          text-align: right;
          word-break: break-all;
        }

          .pf-mono-tag {
          font-family: monospace;

          padding: 3px 8px;
          border-radius: 8px;
          color: #0e2e33;

        }

        /* ── EDIT FORM ── */
        .pf-edit-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 24px;
          padding: 20px 18px;
          box-shadow: 0 8px 26px rgba(0, 160, 145, 0.08);
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-sizing: border-box;
        }

        .pf-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .pf-input-label {
          font-size: 11.5px;
          font-weight: 750;
          color: #0e2e33;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pf-input {
          width: 100%;
          padding: 12px 14px;
          font-size: 13.5px;
          font-family: inherit;
          color: #0e2e33;
          background: #f4fbfb;
          border: 1.5px solid #d8f2ee;
          border-radius: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.16s ease;
        }
        .pf-input:focus {
          border-color: #00d2b4;
          background: #ffffff;
        }
        .pf-input:disabled {
          background: #edf4f5;
          color: #799ea4;
          border-color: #dbe8ea;
          cursor: not-allowed;
        }

        .pf-vehicle-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .pf-vehicle-tile {
          border: 1.5px solid #d8f2ee;
          background: #f7fdfc;
          border-radius: 14px;
          padding: 10px 4px;
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 750;
          color: #53757a;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.16s ease;
        }
          .pf-vehicle-tile.selected {
          border-color: #ff8236;
          background: #fff8f3;
          color: #e06014;
          box-shadow: 0 2px 10px rgba(255, 130, 54, 0.2);
        }

          .pf-btn-save {
          flex: 1;
          padding: 12px;
          border-radius: 14px;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          border: none;
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(255, 82, 26, 0.35);
          transition: all 0.16s ease;
        }
        .pf-btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(255, 82, 26, 0.45);
        }

        .pf-btn-cancel {
          padding: 12px 18px;
          border-radius: 14px;
          background: #f1fcf9;
          border: 1px solid #d4f0ec;
          color: #53757a;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        /* ── FOOTER & ACTIONS ── */
        .pf-actions-block {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        .pf-btn-dashboard {
          width: 100%;
          min-height: 48px;
          background: linear-gradient(135deg, #00d2b4 0%, #009e8f 100%);
          color: #ffffff;
          font-weight: 750;
          border-radius: 16px;
          text-transform: none;
          box-shadow: 0 4px 14px rgba(0, 119, 107, 0.25);
          font-size: 13.5px;
        }

          .pf-btn-contact {
          width: 100%;
          padding: 13px;
          border-radius: 16px;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          border: none;
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(255, 82, 26, 0.32);
          transition: all 0.16s ease;
        }
        .pf-btn-contact:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(255, 82, 26, 0.42);
        }

        .pf-btn-logout {
          width: 100%;
          padding: 12px;
          border-radius: 16px;
          background: #fff8f8;
          border: 1.5px solid #ffd8d8;
          color: #d93b3b;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.16s ease;
        }
        .pf-btn-logout:hover {
          background: #fdeeee;
          border-color: #ffb8b8;
        }

        .pf-dev-credits {
          font-size: 11.5px;
          color: #799ea4;
          text-align: center;
          line-height: 1.5;
          margin-top: 4px;
        }
        .pf-dev-credits strong {
          color: #008f7f;
        }

        .pf-policy-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 11.5px;
          color: #799ea4;
          margin-top: 2px;
        }
        .pf-policy-links a {
          color: #53757a;
          text-decoration: none;
          font-weight: 600;
        }
        .pf-policy-links a:hover {
          color: #008f7f;
        }
      `}</style>

      <div className="pf-viewport">
        <div className="pf-shell">

          {/* ── HEADER ACTION ROW ── */}
          <div className="pf-top-bar">
            <h1 className="pf-title">Profile</h1>

            <button
              type="button"
              className="pf-btn-edit-toggle"
              onClick={() => setIsEditing(!isEditing)}
            >
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
              <span>{isEditing ? "Cancel" : "Edit Profile"}</span>
            </button>
          </div>

          {/* ── HERO PROFILE CARD (CENTERED) ── */}
          <div className="pf-hero-centered">
            <div className="pf-avatar-circle">
              {userInitials}
            </div>
            <div className="pf-hero-name">{userData?.name || "VIZ EV User"}</div>
          </div>

          {/* ── BODY: VIEW MODE OR EDIT MODE ── */}
          {isEditing ? (
            <form onSubmit={handleProfileUpdate} className="pf-edit-card">
              <div className="pf-input-group">
                <label className="pf-input-label">Full Name</label>
                <input
                  type="text"
                  className="pf-input"
                  value={updatedUserData.name}
                  onChange={(e) => setUpdatedUserData({ ...updatedUserData, name: e.target.value })}
                  required
                />
              </div>

              {/* Frozen Mobile Field */}
              <div className="pf-input-group">
                <div className="pf-input-label">
                  <span>Registered Mobile Number</span>
                  <span style={{ fontSize: 11, color: "#799ea4", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <LockOutlinedIcon sx={{ fontSize: 12 }} /> Verified
                  </span>
                </div>
                <input
                  type="text"
                  className="pf-input"
                  value={updatedUserData.mobile}
                  disabled
                />
              </div>

              <div className="pf-input-group">
                <label className="pf-input-label">Email Address</label>
                <input
                  type="email"
                  className="pf-input"
                  value={updatedUserData.email}
                  onChange={(e) => setUpdatedUserData({ ...updatedUserData, email: e.target.value })}
                  required
                />
              </div>

              <div className="pf-input-group">
                <label className="pf-input-label">Vehicle Type</label>
                <div className="pf-vehicle-grid">
                  {["2 Wheeler", "3 Wheeler", "4 Wheeler"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`pf-vehicle-tile ${updatedUserData.vehicleType === type ? "selected" : ""}`}
                      onClick={() => setUpdatedUserData({ ...updatedUserData, vehicleType: type, vehicleModel: "" })}
                    >
                      <span style={{ fontSize: 18 }}>
                        {type === "2 Wheeler" ? "🛵" : type === "3 Wheeler" ? "🛺" : "🚗"}
                      </span>
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {updatedUserData.vehicleType && (
                <div className="pf-input-group">
                  <label className="pf-input-label">Vehicle Model (Optional)</label>
                  <select
                    className="pf-input"
                    value={updatedUserData.vehicleModel}
                    onChange={(e) => setUpdatedUserData({ ...updatedUserData, vehicleModel: e.target.value })}
                  >
                    <option value="">Select model…</option>
                    {Object.entries(getGroupedVehicles(updatedUserData.vehicleType)).map(([brand, models]) => (
                      <optgroup key={brand} label={brand}>
                        {models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div className="pf-input-group">
                <label className="pf-input-label">Registration Number</label>
                <input
                  type="text"
                  className="pf-input"
                  placeholder="MH12AB1234"
                  value={updatedUserData.vehicleNumber}
                  onChange={(e) =>
                    setUpdatedUserData({
                      ...updatedUserData,
                      vehicleNumber: e.target.value.replace(/\s/g, "").toUpperCase(),
                    })
                  }
                  maxLength={13}
                  style={{ fontFamily: "monospace", letterSpacing: "0.06em" }}
                />
                {updatedUserData.vehicleNumber && (
                  <span
                    style={{
                      fontSize: 11,
                      color: validatePlate(updatedUserData.vehicleNumber) ? "#008764" : "#d93b3b",
                      fontWeight: 600,
                    }}
                  >
                    {validatePlate(updatedUserData.vehicleNumber)
                      ? "✓ Valid Indian number plate"
                      : "✕ Invalid format (e.g. MH12AB1234)"}
                  </span>
                )}
              </div>

              <div className="pf-input-group">
                <label className="pf-input-label">GSTIN (Optional)</label>
                <input
                  type="text"
                  className="pf-input"
                  placeholder="22AAAAA0000A1Z5"
                  value={updatedUserData.gstin}
                  onChange={(e) => setUpdatedUserData({ ...updatedUserData, gstin: e.target.value.toUpperCase() })}
                  maxLength={15}
                  style={{ fontFamily: "monospace", letterSpacing: "0.06em" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button type="submit" className="pf-btn-save">
                  Save Changes
                </button>
                <button type="button" className="pf-btn-cancel" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Account Details Group */}
              <div className="pf-group-card">
                <span className="pf-group-title">Personal Contact</span>

                <div className="pf-field-row">
                  <span className="pf-field-label">Email</span>
                  <span className="pf-field-val">{userData?.email || "Not Provided"}</span>
                </div>

                <div className="pf-field-row">
                  <span className="pf-field-label">Mobile</span>
                  <span className="pf-field-val">{userData?.mobile || "Not Provided"}</span>
                </div>
              </div>

              {/* EV Vehicle Group */}
              <div className="pf-group-card">
                <span className="pf-group-title">Vehicle & Tax Info</span>

                <div className="pf-field-row">
                  <span className="pf-field-label">Vehicle Type</span>
                  <span className="pf-field-val">{userData?.vehicleType || "Not Configured"}</span>
                </div>

                {userData?.vehicleModel && (
                  <div className="pf-field-row">
                    <span className="pf-field-label">Vehicle Model</span>
                    <span className="pf-field-val">{userData.vehicleModel}</span>
                  </div>
                )}

                <div className="pf-field-row">
                  <span className="pf-field-label">Plate Number</span>
                  <span className="pf-field-val">
                    {userData?.vehicleNumber || userData?.vehicleReg ? (
                      <span className="pf-mono-tag">
                        {userData?.vehicleNumber || userData?.vehicleReg}
                      </span>
                    ) : (
                      "Not Provided"
                    )}
                  </span>
                </div>

                {userData?.gstin && (
                  <div className="pf-field-row">
                    <span className="pf-field-label">GSTIN</span>
                    <span className="pf-field-val">
                      <span className="pf-mono-tag">{userData.gstin}</span>
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STATION MANAGER DASHBOARD (STRICTLY ADMIN & OWNER) ── */}
          {isStationManager && (
            <div className="pf-actions-block">
              <Button
                onClick={handleGoToDashboard}
                className="pf-btn-dashboard"
              >
                Admin Dashboard
              </Button>
            </div>
          )}

          {/* ── BOTTOM ACTIONS: CONTACT SUPPORT & LOGOUT ── */}
          <div className="pf-actions-block">
            <button
              type="button"
              className="pf-btn-contact"
              onClick={() => setOperatorOpen(true)}
            >
              <SupportAgentRoundedIcon sx={{ fontSize: 18 }} />
              <span>Contact VIZ </span>
            </button>

            <button
              type="button"
              className="pf-btn-logout"
              onClick={handleLogout}
            >
              <LogoutRoundedIcon sx={{ fontSize: 17 }} />
              <span>Sign Out</span>
            </button>

            <div className="pf-dev-credits">
              <span>Platform Engineered by </span>
              <strong>Vjra Technologies LLP</strong>
            </div>

            <div className="pf-policy-links">
              <a href="/terms.pdf" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>
              <span>•</span>
              <a href="/refund.pdf" target="_blank" rel="noopener noreferrer">
                Refund Policy
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ── MINIMAL INQUIRY MODAL (AUTO-FILLS EXISTING USER CONTACTS) ── */}
      <Dialog
        open={operatorOpen}
        onClose={() => setOperatorOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            background: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #d4f0ec",
            boxShadow: "0 20px 60px rgba(0, 60, 66, 0.16)",
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", pb: 0 }}>
          <Box>
            <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "18px", color: "#0e2e33" }}>
              Contact Support
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "#53757a", mt: 0.2 }}>
              Have questions or want to host a VIZ charging point?
            </Typography>
          </Box>
          <IconButton onClick={() => setOperatorOpen(false)} size="small">
            <CloseIcon sx={{ fontSize: 18, color: "#799ea4" }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "16px !important" }}>
          <Box sx={{ background: "#f4fbfb", p: 1.5, borderRadius: "14px", border: "1px solid #d4f0ec" }}>
            <Typography sx={{ fontSize: "11px", color: "#53757a", fontWeight: 600 }}>
              Sending as: <strong style={{ color: "#00776b" }}>{userData?.name}</strong> ({userData?.mobile})
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: "11px", fontWeight: 750, color: "#00776b", textTransform: "uppercase", mb: 0.5 }}>
              How can we help?
            </Typography>
            <textarea
              className="pf-input"
              rows={4}
              placeholder="Tell us your query or charger installation address…"
              value={queryMessage}
              onChange={(e) => setQueryMessage(e.target.value)}
              style={{ resize: "none", lineHeight: 1.45 }}
            />
          </Box>

          <Button
            onClick={handleOperatorSubmit}
            disabled={submitting || !queryMessage.trim()}
            sx={{
              mt: 0.5,
              minHeight: 46,
              borderRadius: "14px",
              background: "linear-gradient(135deg, #00d2b4 0%, #009e8f 100%)",
              color: "#ffffff",
              fontWeight: 750,
              fontSize: "13.5px",
              textTransform: "none",
              boxShadow: "0 4px 14px rgba(0, 190, 165, 0.28)",
              "&:hover": { background: "#00a896" },
              "&:disabled": { background: "#cad4d6", color: "#8c9fa3" },
            }}
          >
            {submitting ? "Sending…" : "Send Message"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── SUCCESS NOTICE POPUP ── */}
      {operatorSuccess && (
        <Dialog open={true} onClose={() => setOperatorSuccess(false)}>
          <Box sx={{ p: 3, textAlign: "center", maxWidth: 320 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#dbfaf0",
                color: "#008764",
                display: "grid",
                placeItems: "center",
                fontSize: 24,
                mx: "auto",
                mb: 1.5,
              }}
            >
              ✓
            </Box>
            <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "18px", mb: 1, color: "#0e2e33" }}>
              Message Received!
            </Typography>
            <Typography sx={{ fontSize: "12.5px", color: "#53757a", mb: 2.5, lineHeight: 1.5 }}>
              Our operations team will reach out to your registered phone number shortly.
            </Typography>
            <Button
              fullWidth
              onClick={() => setOperatorSuccess(false)}
              sx={{
                background: "#00d2b4",
                color: "#ffffff",
                fontWeight: 750,
                borderRadius: "12px",
                textTransform: "none",
              }}
            >
              Done
            </Button>
          </Box>
        </Dialog>
      )}

      {/* ── ONBOARD DEVICE NOTICE MODAL ── */}
      {popupVisible && (
        <Dialog open={true} onClose={closePopup}>
          <Box sx={{ p: 3, textAlign: "center", maxWidth: 340 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "17px", color: "#0e2e33", mb: 1 }}>
              No Charger Linked
            </Typography>
            <Typography sx={{ fontSize: "12.5px", color: "#53757a", mb: 2.5, lineHeight: 1.5 }}>
              Connect your VIZ charging station to monitor telemetry and manage customer sessions.
            </Typography>
            <Button
              fullWidth
              onClick={() => {
                closePopup();
                navigate("/onboard-device");
              }}
              sx={{
                background: "linear-gradient(135deg, #00d2b4 0%, #009e8f 100%)",
                color: "#ffffff",
                fontWeight: 750,
                borderRadius: "12px",
                textTransform: "none",
              }}
            >
              Link / Register Charger
            </Button>
          </Box>
        </Dialog>
      )}

      <FooterNav currentPage={location.pathname} />
    </>
  );
};

export default Profile;