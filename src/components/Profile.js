import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  TextField,
  Button,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FooterNav from "../components/FooterNav";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState(false);

  const [walletBalance, setWalletBalance] = useState(null);

  const [updatedUserData, setUpdatedUserData] = useState({
    name: userData?.name || "",
    email: userData?.email || "",
    mobile: userData?.mobile || "",
    vehicleType: userData?.vehicleType || "",
    vehicleNumber: userData?.vehicleNumber || userData?.vehicleReg || "",
  });

  const [operatorForm, setOperatorForm] = useState({
    name: userData?.name || "",
    mobile: userData?.mobile || "",
    email: userData?.email || "",
    location: "",
    budget: 1,
  });

  const menuRef = useRef();

  useEffect(() => {}, []);

  useEffect(() => {
    setMenuOpen(false);
    setPopupVisible(false);
    setIsEditing(false);
    setOperatorOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Inside Profile.js useEffect or as a new one:
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;
  fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/wallet/balance`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(r => r.json())
    .then(d => { if (typeof d.balance === "number") setWalletBalance(d.balance); })
    .catch(() => {});
}, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("lastPage");
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This action is irreversible."
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/auth/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert("Your account has been deleted.");
        handleLogout();
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch (error) {
      console.error("Delete Account Error:", error);
      alert("An error occurred. Please try again later.");
    }
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
        vehicleNumber: updatedUser.user.vehicleNumber || "",
      });
      setIsEditing(false);
      setMenuOpen(false);
      window.location.href = "/profile";
    } else {
      const err = await response.json().catch(() => ({}));
      alert(err.message || "Failed to update profile. Please try again.");
    }
  };

  const handleGoToDashboard = () => {
    if (userData?.role === "admin") {
      navigate("/admin");
    } else if (userData?.role === "owner") {
      navigate("/owner");
    } else {
      setPopupVisible(true);
    }
  };

  const closePopup = () => setPopupVisible(false);

  const handleOperatorSubmit = async () => {
    if (!operatorForm.name || !operatorForm.mobile) {
      alert("Please enter your name and mobile number.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/operator/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(operatorForm),
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
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .top-bar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 42px;
          background-color: #0e1e1e;
          box-shadow: 0 2px 12px rgba(1,105,111,0.35);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1002;
        }
        .top-bar-logo {
          height: 62px;
          filter: drop-shadow(0 0 6px rgba(4, 191, 191, 0.8));
          object-fit: contain;
        }
        .profile-scroll::-webkit-scrollbar { width: 6px; }
        .profile-scroll::-webkit-scrollbar-thumb {
          background: rgba(4, 191, 191, 0.28);
          border-radius: 999px;
        }
        .profile-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="top-bar">
        <img src="/logo.png" alt="VIZ Logo" className="top-bar-logo" />
      </div>

      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          backgroundColor: "#f5f7f8",
          backgroundImage: "none",
          fontFamily:
            "Poppins, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial",
          color: "#0e1e1e",
          overflow: "hidden",
        }}
      >
        <Box
          className="profile-scroll"
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: 480,
            mt: "42px",
            px: 2,
            pt: 2.2,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            pb: "110px",
          }}
        >
          <div style={styles.page}>
            <div style={styles.headerContainer}>
              <h2 style={styles.title}>My Profile</h2>

              <div style={styles.menuWrapper} ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={styles.menuButton}
                >
                  <svg width="24" height="45" fill="#3a5a65" viewBox="0 0 24 45">
                    <circle cx="5" cy="25" r="2" />
                    <circle cx="12" cy="25" r="2" />
                    <circle cx="19" cy="25" r="2" />
                  </svg>
                </button>

                {menuOpen && (
                  <div style={styles.dropdown}>
                    <button
                      onClick={() => { setIsEditing(true); setMenuOpen(false); }}
                      style={styles.dropdownItem}
                    >
                      Edit Profile
                    </button>
                    <button onClick={handleLogout} style={styles.dropdownItem}>
                      Logout
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      style={{ ...styles.dropdownItem, ...styles.dropdownDanger }}
                    >
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.profileIconContainer}>
              <div style={styles.profileCircle}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="50"
                  height="50"
                  stroke="#fff"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#ffffff"
                    d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"
                  />
                </svg>
              </div>
            </div>

            {userData ? (
              <>
                {isEditing ? (
                  <form onSubmit={handleProfileUpdate} style={styles.form}>
                    <div style={styles.formCard}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Name</label>
                        <input
                          type="text"
                          value={updatedUserData.name}
                          onChange={(e) =>
                            setUpdatedUserData({ ...updatedUserData, name: e.target.value })
                          }
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Email</label>
                        <input
                          type="email"
                          value={updatedUserData.email}
                          onChange={(e) =>
                            setUpdatedUserData({ ...updatedUserData, email: e.target.value })
                          }
                          placeholder="you@example.com"
                          style={styles.input}
                          required
                        />
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Mobile</label>
                        <input
                          type="text"
                          value={updatedUserData.mobile}
                          onChange={(e) =>
                            setUpdatedUserData({ ...updatedUserData, mobile: e.target.value })
                          }
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Vehicle Type</label>
                        <input
                          type="text"
                          value={updatedUserData.vehicleType}
                          onChange={(e) =>
                            setUpdatedUserData({ ...updatedUserData, vehicleType: e.target.value })
                          }
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Vehicle Number</label>
                        <input
                          type="text"
                          value={updatedUserData.vehicleNumber}
                          onChange={(e) =>
                            setUpdatedUserData({ ...updatedUserData, vehicleNumber: e.target.value })
                          }
                          placeholder="MH12AB1234"
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.actionRow}>
                        <button type="submit" style={styles.updateButton}>
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          style={styles.cancelButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div style={styles.cardContainer}>
                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Name</span>
                        <span style={styles.cardValue}>{userData.name || "-"}</span>
                      </div>
                    </div>
                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Email</span>
                        <span style={styles.cardValue}>{userData.email || "Not provided"}</span>
                      </div>
                    </div>
                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Mobile</span>
                        <span style={styles.cardValue}>{userData.mobile || "Not provided"}</span>
                      </div>
                    </div>
                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Vehicle Type</span>
                        <span style={styles.cardValue}>{userData.vehicleType || "Not provided"}</span>
                      </div>
                    </div>
                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Vehicle Number</span>
                        <span style={styles.cardValue}>
                          {userData.vehicleNumber || userData.vehicleReg || "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={styles.noUser}>No user data found</p>
            )}

            <div style={styles.bottomSection}>
              <div style={styles.separator} />

              <Button
                onClick={() => setOperatorOpen(true)}
                sx={{
                  color: "#01696f",
                  fontWeight: 700,
                  letterSpacing: "0.3px",
                  mb: 1.2,
                  textTransform: "none",
                  borderRadius: "12px",
                  px: 2.5,
                  "&:hover": { background: "rgba(1,105,111,0.07)" },
                }}
              >
                CONTACT US
              </Button>

              <p style={{ ...styles.linkTextMuted, marginBottom: 8 }}>
                Already own a charger?
              </p>

              <Button
                onClick={handleGoToDashboard}
                sx={{
                  mt: 0.5,
                  minWidth: 220,
                  background: "linear-gradient(90deg, #01696f, #0c4e54)",
                  color: "#ffffff",
                  fontWeight: 700,
                  borderRadius: "14px",
                  px: 3,
                  py: 1.2,
                  textTransform: "none",
                  boxShadow: "0 8px 24px rgba(1,105,111,0.20)",
                  "&:hover": { background: "linear-gradient(90deg, #0c4e54, #0f3638)" },
                }}
              >
                Go to dashboard
              </Button>

              <div style={styles.developerSection}>
                <p style={{ ...styles.linkTextMuted, color: "#5a7a85", marginBottom: 4 }}>
                  Designed and Developed by
                </p>
                <p style={{ ...styles.linkTextMuted, color: "#04bfbf", fontWeight: 700, marginBottom: 0 }}>
                  Vjra Technologies LLP
                </p>
              </div>

              <div style={styles.policyLinksWrap}>
                <a
                  href="/terms.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.policyLink}
                >
                  Terms & Conditions
                </a>
                <span style={styles.policyDot}>•</span>
                <a
                  href="/refund.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.policyLink}
                >
                  Refund Policy
                </a>
              </div>
            </div>

            {popupVisible && (
              <div style={styles.popupOverlay} onClick={closePopup}>
                <div style={styles.popupBox} onClick={(e) => e.stopPropagation()}>
                  <button onClick={closePopup} style={styles.popupCloseBtn}>✕</button>
                  <Typography sx={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "#0e1e1e" }}>
                    No devices linked
                  </Typography>
                  <Typography sx={{ fontSize: "13px", color: "#5a7a85", marginBottom: "20px", lineHeight: 1.5 }}>
                    You haven't linked any charging stations yet. Link your charger to start managing sessions and earnings.
                  </Typography>
                  <Button
                    fullWidth
                    onClick={() => { closePopup(); navigate("/onboard-device"); }}
                    sx={{
                      background: "linear-gradient(90deg, #04BFBF, #027a7a)",
                      color: "#011F26",
                      fontWeight: 700,
                      borderRadius: "12px",
                      py: 1.2,
                      textTransform: "none",
                      boxShadow: "0 8px 30px rgba(4,191,191,0.35)",
                      "&:hover": { background: "linear-gradient(90deg, #03a6a6, #026060)" },
                    }}
                  >
                    Link / Register Charger
                  </Button>
                </div>
              </div>
            )}

            {policyPopup.open && (
              <div style={styles.popupOverlay} onClick={closePolicy}>
                <div
                  style={{ ...styles.popupBox, width: "95%", maxWidth: "800px", height: "85vh", padding: "10px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={closePolicy} style={styles.popupCloseBtn}>✕</button>
                  <iframe
                    src={policyPopup.type === "terms" ? "/terms.pdf" : "/refund.pdf"}
                    title="Policy Document"
                    style={{ width: "100%", height: "100%", border: "none", borderRadius: "10px" }}
                  />
                </div>
              </div>
            )}
          </div>
        </Box>

        {/* ── Contact Us Dialog ── */}
        <Dialog
          open={operatorOpen}
          onClose={() => setOperatorOpen(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              background: "#ffffff",
              color: "#0e1e1e",
              border: "1px solid rgba(1,105,111,0.10)",
              borderRadius: "24px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.14)",
              overflow: "hidden",
            },
          }}
        >
          {/* Teal accent strip */}
          <Box sx={{ height: "5px", background: "linear-gradient(90deg, #01696f, #0c4e54)", width: "100%" }} />

          <DialogTitle sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", pt: 2.5, pb: 0.5, px: 3 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "17px", color: "#0e1e1e", lineHeight: 1.3, fontFamily: "Poppins, sans-serif" }}>
                Contact Us
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#7a9aa3", mt: 0.4, fontFamily: "Poppins, sans-serif" }}>
                Our team will reach out to you shortly
              </Typography>
            </Box>
            <IconButton
              onClick={() => setOperatorOpen(false)}
              size="small"
              sx={{
                mt: "-2px",
                color: "#7a9aa3",
                background: "#f0f4f5",
                borderRadius: "10px",
                width: 32, height: 32,
                "&:hover": { background: "#e2ecee", color: "#01696f" },
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ px: 3, pt: 2, pb: 3 }}>

            {/* Name + Mobile */}
            <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={dialogLabelSx}>Name</Typography>
                <input
                  value={operatorForm.name}
                  onChange={(e) => setOperatorForm({ ...operatorForm, name: e.target.value })}
                  placeholder="Your name"
                  style={dialogInputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#01696f"; e.target.style.boxShadow = "0 0 0 3px rgba(1,105,111,0.09)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "rgba(0,0,0,0.10)"; e.target.style.boxShadow = "none"; }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={dialogLabelSx}>Mobile</Typography>
                <input
                  value={operatorForm.mobile}
                  onChange={(e) => setOperatorForm({ ...operatorForm, mobile: e.target.value })}
                  placeholder="+91 XXXXX"
                  style={dialogInputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#01696f"; e.target.style.boxShadow = "0 0 0 3px rgba(1,105,111,0.09)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "rgba(0,0,0,0.10)"; e.target.style.boxShadow = "none"; }}
                />
              </Box>
            </Box>

{/* ── Wallet Balance Widget ── */}
<Box
 onClick={() => navigate("/transactions")}
  sx={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    mx: 2, mt: 2, p: 2,
    borderRadius: "16px",
    background: "linear-gradient(135deg,#0f4c52,#0b3338)",
    border: "1px solid rgba(4,191,191,0.2)",
    cursor: "pointer",
    "&:active": { opacity: 0.8 },
  }}
>
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
    <AccountBalanceWalletIcon sx={{ color: "#04BFBF", fontSize: 22 }} />
    <Box>
      <Typography sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>VIZ Wallet</Typography>
      <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>
        ₹{walletBalance !== null ? Number(walletBalance).toFixed(2) : "—"}
      </Typography>
    </Box>
  </Box>
  <Typography sx={{ color: "#04BFBF", fontSize: "0.82rem", fontWeight: 600 }}>
    View →
  </Typography>
</Box>


            {/* Email */}
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={dialogLabelSx}>Email</Typography>
              <input
                type="email"
                value={operatorForm.email}
                onChange={(e) => setOperatorForm({ ...operatorForm, email: e.target.value })}
                placeholder="you@example.com"
                style={dialogInputStyle}
                onFocus={(e) => { e.target.style.borderColor = "#01696f"; e.target.style.boxShadow = "0 0 0 3px rgba(1,105,111,0.09)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(0,0,0,0.10)"; e.target.style.boxShadow = "none"; }}
              />
            </Box>

            {/* Location */}
            <Box sx={{ mb: 2 }}>
              <Typography sx={dialogLabelSx}>Installation Location</Typography>
              <input
                value={operatorForm.location}
                onChange={(e) => setOperatorForm({ ...operatorForm, location: e.target.value })}
                placeholder="City / Area"
                style={dialogInputStyle}
                onFocus={(e) => { e.target.style.borderColor = "#01696f"; e.target.style.boxShadow = "0 0 0 3px rgba(1,105,111,0.09)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(0,0,0,0.10)"; e.target.style.boxShadow = "none"; }}
              />
            </Box>

            {/* Budget chips — FIX: only selects budget, does NOT submit */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={dialogLabelSx}>Estimated Budget</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.8 }}>
                {[
                  { value: 0, label: "< ₹5k" },
                  { value: 1, label: "₹5k–₹15k" },
                  { value: 2, label: "₹15k–₹50k" },
                  { value: 3, label: "> ₹50k" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOperatorForm({ ...operatorForm, budget: opt.value })}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "999px",
                      border: operatorForm.budget === opt.value
                        ? "1.5px solid #01696f"
                        : "1.5px solid rgba(0,0,0,0.10)",
                      background: operatorForm.budget === opt.value
                        ? "rgba(1,105,111,0.09)"
                        : "#f7f9fa",
                      color: operatorForm.budget === opt.value ? "#01696f" : "#5a7a85",
                      fontWeight: operatorForm.budget === opt.value ? 700 : 500,
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </Box>
            </Box>

            {/* Submit button — FIX: outside .map(), renders exactly once */}
            <button
              type="button"
              onClick={handleOperatorSubmit}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "13px",
                background: submitting
                  ? "rgba(3, 207, 218, 0.45)"
                  : "linear-gradient(90deg, #03b5be, #208d97)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                borderRadius: "14px",
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "Poppins, sans-serif",
                boxShadow: "0 6px 20px rgba(1,105,111,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.2s",
              }}
            >
              {submitting ? (
                "Sending..."
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Submit Request
                </>
              )}
            </button>

          </DialogContent>
        </Dialog>

      </Box>

      {/* Success popup */}
      {operatorSuccess && (
        <div style={styles.popupOverlay} onClick={() => setOperatorSuccess(false)}>
          <div
            style={{ ...styles.popupBox, maxWidth: 320, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(1,105,111,0.09)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                stroke="#01696f" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{
              fontSize: "17px", fontWeight: 800,
              color: "#04bfbf", marginBottom: 8,
              fontFamily: "Poppins, sans-serif",
            }}>
              Query Registered!
            </p>
            <p style={{
              fontSize: "13px", color: "#5a7a85",
              lineHeight: 1.6, marginBottom: 22,
              fontFamily: "Poppins, sans-serif",
            }}>
              Your query has been registered successfully. You will receive a
              callback from our team shortly. 🙌
            </p>
            <button
              onClick={() => setOperatorSuccess(false)}
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(90deg, #01696f, #0c4e54)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "14px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                boxShadow: "0 6px 18px rgba(1,105,111,0.20)",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <FooterNav currentPage={location.pathname} />
    </>
  );
};


const dialogLabelSx = {
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color: "#3a6a75",
  mb: 0.6,
  fontFamily: "Poppins, sans-serif",
};

const dialogInputStyle = {
  width: "100%",
  padding: "10px 13px",
  fontSize: "13px",
  fontWeight: 500,
  borderRadius: "11px",
  background: "#f7f9fa",
  color: "#0e1e1e",
  border: "1.5px solid rgba(0,0,0,0.10)",
  fontFamily: "Poppins, sans-serif",
  outline: "none",
  transition: "border-color 0.18s, box-shadow 0.18s",
  boxSizing: "border-box",
  display: "block",
};

const styles = {
  page: {
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: "22px",
    boxShadow: "0 4px 32px rgba(0,0,0,0.07)",
    padding: "22px 16px 28px 16px",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    color: "#1a2e35",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
    maxWidth: 420,
    margin: "0 auto",
  },
  headerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
    marginBottom: "8px",
    marginTop: "2px",
    minHeight: "34px",
  },
  title: {
    color: "#0e1e1e",
    textAlign: "center",
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "0.4px",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    margin: 0,
  },
  menuWrapper: {
    position: "absolute",
    right: "2px",
    top: "-3px",
  },
  menuButton: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "2px 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    position: "absolute",
    right: "0",
    top: "34px",
    background: "#ffffff",
    borderRadius: "14px",
    boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
    zIndex: 20,
    minWidth: "160px",
    overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.07)",
  },
  dropdownItem: {
    padding: "11px 16px",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#1a2e35",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
  },
  dropdownDanger: {
    color: "#d93025",
    borderBottom: "none",
  },
  profileIconContainer: {
    marginTop: "6px",
    marginBottom: "22px",
  },
  profileCircle: {
    width: "92px", height: "92px", borderRadius: "50%",
    background: "linear-gradient(135deg, #04bfbf 0%, #029a9a 100%)",
    display: "flex", justifyContent: "center", alignItems: "center",
    boxShadow: "0 8px 28px rgba(4,191,191,0.30)",
    border: "3px solid rgba(4,191,191,0.18)",
  },
  cardContainer: {
    width: "100%", maxWidth: "420px",
    display: "flex", flexDirection: "column",
    gap: "10px", boxSizing: "border-box",
  },
  infoCard: {
    width: "100%",
    background: "rgba(4,191,191,0.05)",
    borderRadius: "14px", padding: "14px 16px",
    boxShadow: "0 2px 10px rgba(4,191,191,0.08)",
    display: "flex", alignItems: "center",
    border: "1px solid rgba(4,191,191,0.14)",
    boxSizing: "border-box",
  },
  infoBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    width: "100%",
    minWidth: 0,
  },
  cardLabel: {
    color: "#7a9aa3",
    fontSize: "11px",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    lineHeight: 1.2,
  },
  cardValue: {
    color: "#0e1e1e",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: 1.45,
    wordBreak: "break-word",
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  formCard: {
    width: "100%",
    background: "#f7f9fa",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid rgba(0,0,0,0.07)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
    boxSizing: "border-box",
  },
  inputGroup: {
    marginBottom: "14px",
    width: "100%",
  },
  label: {
    display: "block",
    color: "#5a7a85",
    fontWeight: 500,
    fontSize: "13px",
    marginBottom: "6px",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
  },
  input: {
    width: "100%",
    padding: "12px 13px",
    fontSize: "13px",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#0e1e1e",
    border: "1px solid rgba(0,0,0,0.10)",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  actionRow: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "8px",
  },
  updateButton: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    borderRadius: "12px",
    fontWeight: 700,
    textTransform: "none",
    background: "linear-gradient(90deg, #01696f, #0c4e54)",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(1,105,111,0.22)",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
  },
  cancelButton: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    borderRadius: "12px",
    fontWeight: 600,
    background: "#f0f4f5",
    color: "#3a5a65",
    border: "1px solid rgba(0,0,0,0.08)",
    cursor: "pointer",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
  },
  noUser: {
    color: "#aaa",
    textAlign: "center",
    fontSize: "14px",
    marginTop: "6px",
  },
  bottomSection: {
    marginTop: 30,
    paddingBottom: 14,
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  separator: {
    width: "100%", height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(4,191,191,0.35), transparent)",
    marginBottom: "14px",
  },
  developerSection: {
    marginTop: "30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  linkTextMuted: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: "14px",
    color: "#7a9aa3",
    margin: 0,
    lineHeight: 1.5,
  },
  policyLinksWrap: {
    marginTop: 24,
    paddingBottom: 12,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  policyLink: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: "12px",
    color: "#7a9aa3",
    textDecoration: "none",
    cursor: "pointer",
    lineHeight: 1.4,
    transition: "color 0.2s ease, opacity 0.2s ease",
    opacity: 0.9,
  },
  policyDot: {
    fontSize: "11px",
    color: "#b0c4ca",
    lineHeight: 1,
  },
  popupOverlay: {
    position: "fixed", top: 0, left: 0,
    width: "100vw", height: "100vh",
    backdropFilter: "blur(8px)",
    backgroundColor: "rgba(4,30,30,0.55)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000, padding: "18px", boxSizing: "border-box",
  },
  popupBox: {
    background: "#ffffff",
    border: "1px solid rgba(4,191,191,0.16)",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(4,191,191,0.14)",
    width: "90%", maxWidth: "360px",
    padding: "28px 24px", color: "#0e1e1e",
    position: "relative", textAlign: "center", boxSizing: "border-box",
  },
  popupCloseBtn: {
    position: "absolute", top: "10px", right: "16px",
    background: "transparent", border: "none",
    fontSize: "22px", color: "#04bfbf", cursor: "pointer",
  },
};

export default Profile;