// src/components/SignUp.js
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

import { api } from "../api";
import { auth } from "../firebase";
import { getGroupedVehicles } from "../utils/evVehicles";


// ─── Flexible Indian number plate validator ────────────────────────────────
// Allows any 5–15 character alphanumeric combination (standard, BH series, DL 1-digit, temp plates, etc.)
const PLATE_REGEX = /^[A-Z0-9]{5,15}$/;

function validatePlate(raw) {
  const cleaned = (raw || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return PLATE_REGEX.test(cleaned) ? cleaned : null;
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Formats plate nicely on the green HSRP preview without blocking custom combinations
function formatPlateDisplay(raw) {
  if (!raw) return "MH 12 AB 1234";
  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  // Standard format preview (e.g. MH12AB1234 -> MH 12 AB 1234)
  const stdMatch = clean.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{1,4})$/);
  if (stdMatch) {
    return `${stdMatch[1]} ${stdMatch[2]} ${stdMatch[3]} ${stdMatch[4]}`;
  }

  // BH series preview (e.g. 22BH1234AB -> 22 BH 1234 AB)
  const bhMatch = clean.match(/^([0-9]{2})(BH)([0-9]{1,4})([A-Z]{1,2})$/);
  if (bhMatch) {
    return `${bhMatch[1]} ${bhMatch[2]} ${bhMatch[3]} ${bhMatch[4]}`;
  }

  return clean;
}

// ─── Step Indicator Component ──────────────────────────────────────────────
function Steps({ current }) {
  const steps = [
    { label: "Your Info", sub: "Name & Email" },
    { label: "Your EV", sub: "Vehicle & Plate" },
    { label: "Ready", sub: "Start Charging" },
  ];

  return (
    <div className="su-stepper">
      {steps.map((s, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <React.Fragment key={i}>
            <div className="su-step-item">
              <div
                className={`su-step-circle ${
                  isDone ? "done" : isActive ? "active" : ""
                }`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                className={`su-step-label ${
                  isActive ? "active" : isDone ? "done" : ""
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`su-step-line ${i < current ? "done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main SignUp Component ─────────────────────────────────────────────────
export default function SignUp() {
  const { state } = useLocation();
  const mobile = state?.mobile || "";
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [showGstin, setShowGstin] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    gstin: "",
    vehicleType: "",
    vehicleModel: "",
    vehicleNumber: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => ({ ...e, [k]: "" }));
  };

  const validateStep0 = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Please enter your full name";
    if (!form.email.trim()) errs.email = "Please enter your email address";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Please enter a valid email address";
    if (form.gstin && !GSTIN_REGEX.test(form.gstin.toUpperCase()))
      errs.gstin = "Invalid GSTIN — must be 15 characters (e.g. 22AAAAA0000A1Z5)";
    setFieldErrors(errs);
    return !Object.keys(errs).length;
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.vehicleNumber.trim())
      errs.vehicleNumber = "Vehicle registration number is required";
    else if (!validatePlate(form.vehicleNumber))
      errs.vehicleNumber = "Invalid format — try MH12AB1234 or 22BH1234AB";
    setFieldErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setError("");
    setLoading(true);
    try {
      const phone = mobile || auth.currentUser?.phoneNumber || "";
      if (!phone) {
        setError("Phone verification lost. Please go back and login again.");
        setLoading(false);
        return;
      }
      const res = await api.post(
        "/api/auth/signup",
        {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          mobile: phone,
          vehicleType: form.vehicleType || "",
          vehicleModel: form.vehicleModel || "",
          vehicleNumber: validatePlate(form.vehicleNumber),
          ...(form.gstin ? { gstin: form.gstin.toUpperCase() } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("signup_token")}`,
          },
        }
      );
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setStep(2);
      setTimeout(() => navigate("/home"), 1600);
    } catch (err) {
      setError(
        err.response?.data?.message || "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const groupedModels = form.vehicleType
    ? getGroupedVehicles(form.vehicleType)
    : {};

  const isPlateValid = Boolean(validatePlate(form.vehicleNumber));
  const isGstinValid =
    form.gstin.length === 15 && GSTIN_REGEX.test(form.gstin.toUpperCase());

  const vehicleCategories = [
    {
      id: "2 Wheeler",
      title: "2 Wheeler",
      sub: "Scooter / Bike",
      emoji: "🛵",
    },
    {
      id: "3 Wheeler",
      title: "3 Wheeler",
      sub: "Auto / Cargo",
      emoji: "🛺",
    },
    {
      id: "4 Wheeler",
      title: "4 Wheeler",
      sub: "Car / SUV",
      emoji: "🚗",
    },
  ];

  return (
    <div className="su-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .su-page {
          min-height: 100dvh;
          width: 100vw;
          background:
            radial-gradient(circle at 100% 0%, rgba(0, 229, 190, 0.12), transparent 28rem),
            radial-gradient(circle at 0% 100%, rgba(255, 130, 54, 0.08), transparent 26rem),
            #f3fbfc;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          color: #0e2e33;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }

        .su-shell {
          width: 100%;
          max-width: 460px;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          padding-bottom: max(28px, env(safe-area-inset-bottom, 20px));
          box-sizing: border-box;
        }

        /* ── CURVED TOP HERO HEADER ── */
        .su-hero {
          position: relative;
          background: linear-gradient(145deg, #072227 0%, #0d3840 60%, #09272c 100%);
          border-bottom-left-radius: 38px;
          border-bottom-right-radius: 38px;
          padding: max(22px, env(safe-area-inset-top, 18px)) 22px 32px;
          color: #ffffff;
          text-align: center;
          box-shadow:
            0 12px 32px rgba(8, 46, 52, 0.16),
            0 2px 0 rgba(0, 210, 180, 0.35);
          overflow: hidden;
        }

        .su-hero-glow {
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 210, 180, 0.25) 0%, transparent 70%);
          top: -60px;
          right: -50px;
          pointer-events: none;
        }

        .su-hero-glow-orange {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 130, 54, 0.22) 0%, transparent 70%);
          bottom: -50px;
          left: -40px;
          pointer-events: none;
        }

        .su-logo {
          height: 48px;
          object-fit: contain;
          filter: drop-shadow(0 2px 10px rgba(0, 210, 180, 0.45));
          margin-bottom: 10px;
        }

        .su-hero-title {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0 0 8px;
          color: #ffffff;
        }

        .su-verified-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 999px;
          background: rgba(0, 210, 180, 0.14);
          border: 1px solid rgba(0, 210, 180, 0.35);
          color: #00e5be;
          font-family: 'Outfit', sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.4px;
        }

        /* ── MAIN CONTENT CONTAINER ── */
        .su-body {
          padding: 0 18px;
          margin-top: -18px;
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── STEPPER CARD ── */
        .su-stepper-card {
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 22px;
          padding: 16px 20px;
          box-shadow: 0 8px 24px rgba(0, 160, 145, 0.07);
        }

        .su-stepper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .su-step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          position: relative;
          z-index: 1;
        }

        .su-step-circle {
          width: 32px;
          height: 32px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 800;
          background: #edf7f6;
          color: #799ea4;
          border: 1.5px solid #d8f2ee;
          transition: all 0.25s ease;
        }

        .su-step-circle.active {
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          color: #ffffff;
          border-color: #ff8236;
          box-shadow: 0 4px 12px rgba(255, 82, 26, 0.32);
          transform: scale(1.06);
        }

        .su-step-circle.done {
          background: linear-gradient(135deg, #00d2b4 0%, #00a896 100%);
          color: #ffffff;
          border-color: #00d2b4;
          box-shadow: 0 4px 12px rgba(0, 210, 180, 0.28);
        }

        .su-step-label {
          font-size: 11px;
          font-weight: 700;
          color: #799ea4;
          transition: color 0.25s ease;
        }

        .su-step-label.active {
          color: #e06014;
          font-weight: 800;
        }

        .su-step-label.done {
          color: #008f7f;
        }

        .su-step-line {
          flex: 1;
          height: 3px;
          border-radius: 999px;
          background: #e3f3f1;
          margin: 0 10px 18px;
          transition: background 0.3s ease;
        }

        .su-step-line.done {
          background: linear-gradient(90deg, #00d2b4, #ff8236);
        }

        /* ── FORM CARD ── */
        .su-card {
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 26px;
          padding: 22px 18px;
          box-shadow: 0 10px 30px rgba(0, 160, 145, 0.06);
          display: flex;
          flex-direction: column;
          gap: 18px;
          animation: suFadeIn 0.24s ease-out;
        }

        @keyframes suFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .su-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px dashed #d8f2ee;
        }

        .su-section-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #e4faf6 0%, #c8f5ec 100%);
          color: #00776b;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .su-section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 17px;
          font-weight: 800;
          color: #0e2e33;
          margin: 0;
          line-height: 1.2;
        }

        .su-section-sub {
          font-size: 11.5px;
          color: #53757a;
          margin: 2px 0 0;
        }

        /* ── INPUT FIELDS ── */
        .su-field-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .su-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .su-label {
          font-size: 11.5px;
          font-weight: 800;
          color: #0e2e33;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        .su-req {
          color: #ff521a;
          margin-left: 3px;
        }

        .su-opt-badge {
          font-size: 10px;
          font-weight: 700;
          color: #008f7f;
          background: #e6faf6;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .su-input-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f6fbfb;
          border: 1.5px solid #d4f0ec;
          border-radius: 15px;
          padding: 0 14px;
          height: 50px;
          transition: all 0.18s ease;
        }

        .su-input-box:focus-within {
          background: #ffffff;
          border-color: #00d2b4;
          box-shadow: 0 0 0 3.5px rgba(0, 210, 180, 0.14);
        }

        .su-input-box.has-error {
          border-color: #ff5252;
          background: #fff9f9;
        }

        .su-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          color: #0e2e33;
          width: 100%;
        }

        .su-input::placeholder {
          font-weight: 500;
          color: #8bb0b5;
        }

        .su-hint {
          font-size: 11px;
          color: #6c9197;
          font-weight: 500;
        }

        .su-err-text {
          font-size: 11.5px;
          color: #d93025;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* ── OPTIONAL GSTIN ACCORDION ── */
        .su-gst-toggle {
          width: 100%;
          background: #f7fdfc;
          border: 1.5px dashed #bceee5;
          border-radius: 16px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.18s ease;
          text-align: left;
        }

        .su-gst-toggle:hover {
          background: #eefbf8;
          border-color: #00d2b4;
        }

        .su-gst-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .su-gst-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #fff3e6;
          color: #e06014;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        /* ── VEHICLE TYPE TILES ── */
        .su-ev-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .su-ev-tile {
          position: relative;
          background: #f7fdfc;
          border: 1.5px solid #d8f2ee;
          border-radius: 18px;
          padding: 14px 8px 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: inherit;
        }

        .su-ev-tile:hover {
          transform: translateY(-2px);
          border-color: #00d2b4;
          background: #ffffff;
        }

        .su-ev-tile.selected {
          background: linear-gradient(145deg, #fff9f5 0%, #fff1e6 100%);
          border-color: #ff8236;
          box-shadow: 0 6px 18px rgba(255, 130, 54, 0.18);
          transform: translateY(-2px);
        }

        .su-ev-check {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ff8236;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          display: grid;
          place-items: center;
        }

        .su-ev-emoji {
          font-size: 28px;
          line-height: 1;
          margin-bottom: 6px;
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.08));
        }

        .su-ev-title {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 800;
          color: #0e2e33;
        }

        .su-ev-tile.selected .su-ev-title {
          color: #d84b00;
        }

        .su-ev-sub {
          font-size: 10px;
          color: #6c9197;
          font-weight: 600;
          margin-top: 2px;
        }

        /* ── SELECT DROPDOWN ── */
        .su-select-wrap {
          position: relative;
          width: 100%;
        }

        .su-select {
          width: 100%;
          height: 50px;
          padding: 0 40px 0 14px;
          border-radius: 15px;
          border: 1.5px solid #d4f0ec;
          background: #f6fbfb;
          color: #0e2e33;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .su-select:focus {
          background: #ffffff;
          border-color: #00d2b4;
          box-shadow: 0 0 0 3.5px rgba(0, 210, 180, 0.14);
        }

        /* ── AUTHENTIC INDIAN HSRP NUMBER PLATE WIDGET ── */
        .su-plate-showcase {
          background: linear-gradient(135deg, #f1fcf9 0%, #e4f9f5 100%);
          border: 1px solid #c5ede6;
          border-radius: 20px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .su-hsrp-plate {
          width: 100%;
          max-width: 310px;
          height: 58px;
          border-radius: 10px;
          background: linear-gradient(180deg, #008751 0%, #00683e 100%);
          border: 3px solid #ffffff;
          outline: 2px solid #0e2e33;
          box-shadow: 0 8px 20px rgba(0, 104, 62, 0.25);
          display: flex;
          align-items: stretch;
          overflow: hidden;
          position: relative;
          transition: all 0.25s ease;
        }

        .su-hsrp-ind-strip {
          width: 38px;
          background: linear-gradient(180deg, #003893 0%, #002664 100%);
          border-right: 1.5px solid rgba(255, 255, 255, 0.35);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 4px 0;
          flex-shrink: 0;
        }

        .su-chakra-wheel {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid #ffd700;
          position: relative;
          display: grid;
          place-items: center;
        }

        .su-chakra-wheel::after {
          content: "";
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ffd700;
        }

        .su-ind-text {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.8px;
        }

        .su-hsrp-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          position: relative;
        }

        /* Screw rivets */
        .su-rivet-l,
        .su-rivet-r {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle, #ffffff 0%, #90a4ae 100%);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
        }
        .su-rivet-l { left: 8px; }
        .su-rivet-r { right: 8px; }

        .su-hsrp-number {
          font-family: 'Outfit', monospace;
          font-size: clamp(19px, 5.2vw, 23px);
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 2px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
          white-space: nowrap;
        }

        .su-hsrp-number.placeholder {
          opacity: 0.45;
        }

        .su-plate-input-row {
          width: 100%;
          position: relative;
        }

        .su-plate-input {
          width: 100%;
          height: 50px;
          border-radius: 14px;
          border: 1.5px solid #bceee5;
          background: #ffffff;
          padding: 0 44px 0 14px;
          font-family: 'Outfit', monospace;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 1.8px;
          color: #0e2e33;
          outline: none;
          box-sizing: border-box;
          transition: all 0.18s ease;
        }

        .su-plate-input:focus {
          border-color: #00d2b4;
          box-shadow: 0 0 0 3.5px rgba(0, 210, 180, 0.16);
        }

        .su-plate-input::placeholder {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: 0px;
          color: #8bb0b5;
          text-transform: none;
        }

        .su-plate-status-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
        }

        /* ── BUTTONS ── */
        .su-btn-primary {
          width: 100%;
          height: 52px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 22px rgba(255, 82, 26, 0.32);
          transition: all 0.18s ease;
        }

        .su-btn-primary:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 10px 26px rgba(255, 82, 26, 0.42);
        }

        .su-btn-primary:active:not(:disabled) {
          transform: scale(0.985);
        }

        .su-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .su-btn-back {
          height: 52px;
          padding: 0 18px;
          border-radius: 16px;
          border: 1.5px solid #d4f0ec;
          background: #f6fbfb;
          color: #53757a;
          font-family: 'Outfit', sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.16s ease;
        }

        .su-btn-back:hover {
          background: #eaf9f6;
          color: #00776b;
          border-color: #00d2b4;
        }

        /* ── SUCCESS CELEBRATION SCREEN ── */
        .su-success-box {
          text-align: center;
          padding: 20px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .su-success-orb {
          width: 76px;
          height: 76px;
          border-radius: 26px;
          background: linear-gradient(135deg, #00d2b4 0%, #00a896 100%);
          color: #ffffff;
          display: grid;
          place-items: center;
          box-shadow: 0 12px 28px rgba(0, 210, 180, 0.35);
          animation: suPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes suPop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* ── FOOTER ── */
        .su-footer-text {
          text-align: center;
          font-size: 13px;
          color: #53757a;
          font-weight: 600;
          margin: 4px 0 0;
        }

        .su-login-link {
          background: none;
          border: none;
          color: #ff521a;
          font-family: 'Outfit', sans-serif;
          font-size: 13.5px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          padding: 0 4px;
        }
      `}</style>

      <div className="su-shell">
        {/* ═══════════════════════════════════════════════════
            1. CURVED HERO BANNER
        ═══════════════════════════════════════════════════ */}
        <div className="su-hero">
          <div className="su-hero-glow" />
          <div className="su-hero-glow-orange" />

          <img
            src="/logo.png"
            alt="VIZ Logo"
            className="su-logo"
            onError={(e) => {
              e.target.src = "/logo2.png";
            }}
          />

          <h1 className="su-hero-title">Complete Your EV Profile</h1>

          <div className="su-verified-pill">
            <VerifiedRoundedIcon sx={{ fontSize: 15 }} />
            <span>Verified: {mobile || "Mobile Linked"}</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            2. STEPPER + FORM BODY
        ═══════════════════════════════════════════════════ */}
        <div className="su-body">
          <div className="su-stepper-card">
            <Steps current={step} />
          </div>

          {/* ── STEP 0: PERSONAL DETAILS ── */}
          {step === 0 && (
            <div className="su-card">
              <div className="su-section-header">
                <div className="su-section-icon">
                  <PersonOutlineRoundedIcon sx={{ fontSize: 22 }} />
                </div>
                <div>
                  <h2 className="su-section-title">Personal Details</h2>
                  <p className="su-section-sub">
                    For your charging receipts & account updates
                  </p>
                </div>
              </div>

              {/* Full Name */}
              <div className="su-field-wrap">
                <div className="su-label-row">
                  <label className="su-label">
                    Full Name<span className="su-req">*</span>
                  </label>
                </div>
                <div
                  className={`su-input-box ${
                    fieldErrors.name ? "has-error" : ""
                  }`}
                >
                  <PersonOutlineRoundedIcon
                    sx={{ fontSize: 20, color: "#008f7f" }}
                  />
                  <input
                    type="text"
                    className="su-input"
                    placeholder="e.g. Roshan Kumar"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    autoComplete="name"
                    autoFocus
                  />
                </div>
                {fieldErrors.name && (
                  <span className="su-err-text">
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 14 }} />
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Email Address */}
              <div className="su-field-wrap">
                <div className="su-label-row">
                  <label className="su-label">
                    Email Address<span className="su-req">*</span>
                  </label>
                </div>
                <div
                  className={`su-input-box ${
                    fieldErrors.email ? "has-error" : ""
                  }`}
                >
                  <MailOutlineRoundedIcon
                    sx={{ fontSize: 19, color: "#008f7f" }}
                  />
                  <input
                    type="email"
                    className="su-input"
                    placeholder="roshan@example.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && (
                  <span className="su-err-text">
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 14 }} />
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Collapsible Optional GSTIN Section */}
              <div>
                <button
                  type="button"
                  className="su-gst-toggle"
                  onClick={() => setShowGstin(!showGstin)}
                >
                  <div className="su-gst-left">
                    <div className="su-gst-icon">
                      <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#0e2e33",
                        }}
                      >
                        Have a GST Number?
                      </div>
                      <div style={{ fontSize: 11, color: "#53757a" }}>
                        Optional · Claim GST credit on charging bills
                      </div>
                    </div>
                  </div>
                  <KeyboardArrowDownRoundedIcon
                    sx={{
                      color: "#008f7f",
                      transform: showGstin ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </button>

                {(showGstin || form.gstin) && (
                  <div
                    className="su-field-wrap"
                    style={{ marginTop: 12, animation: "suFadeIn 0.2s ease" }}
                  >
                    <div className="su-label-row">
                      <label className="su-label">Business GSTIN</label>
                      <span className="su-opt-badge">
                        {form.gstin.length}/15 chars
                      </span>
                    </div>
                    <div
                      className={`su-input-box ${
                        fieldErrors.gstin ? "has-error" : ""
                      }`}
                    >
                      <input
                        type="text"
                        className="su-input"
                        placeholder="22AAAAA0000A1Z5"
                        value={form.gstin}
                        onChange={(e) =>
                          set(
                            "gstin",
                            e.target.value.replace(/\s/g, "").toUpperCase()
                          )
                        }
                        maxLength={15}
                        style={{
                          fontFamily: "'Outfit', monospace",
                          letterSpacing: "1.5px",
                          fontSize: 15,
                        }}
                      />
                      {isGstinValid && (
                        <CheckCircleRoundedIcon
                          sx={{ color: "#00c98d", fontSize: 20 }}
                        />
                      )}
                    </div>
                    {fieldErrors.gstin ? (
                      <span className="su-err-text">
                        <ErrorOutlineRoundedIcon sx={{ fontSize: 14 }} />
                        {fieldErrors.gstin}
                      </span>
                    ) : (
                      <span className="su-hint">
                        15-character GST Identification Number
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="su-btn-primary"
                onClick={() => validateStep0() && setStep(1)}
              >
                <span>Next: Add Your EV</span>
                <ArrowForwardRoundedIcon sx={{ fontSize: 19 }} />
              </button>
            </div>
          )}

          {/* ── STEP 1: VEHICLE & LIVE NUMBER PLATE ── */}
          {step === 1 && (
            <form onSubmit={handleSignup} className="su-card">
              <div className="su-section-header">
                <div
                  className="su-section-icon"
                  style={{
                    background:
                      "linear-gradient(135deg, #fff3e6 0%, #ffe0c2 100%)",
                    color: "#e06014",
                  }}
                >
                  <BoltRoundedIcon sx={{ fontSize: 24 }} />
                </div>
                <div>
                  <h2 className="su-section-title">Your Electric Vehicle</h2>
                  <p className="su-section-sub">
                    Select your EV type & enter registration plate
                  </p>
                </div>
              </div>

              {/* 1. Vehicle Category Cards */}
              <div className="su-field-wrap">
                <div className="su-label-row">
                  <label className="su-label">Select EV Category</label>
                  <span className="su-opt-badge">Tap to choose</span>
                </div>

                <div className="su-ev-grid">
                  {vehicleCategories.map((cat) => {
                    const selected = form.vehicleType === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`su-ev-tile ${selected ? "selected" : ""}`}
                        onClick={() => {
                          set("vehicleType", cat.id);
                          set("vehicleModel", "");
                        }}
                      >
                        {selected && <span className="su-ev-check">✓</span>}
                        <span className="su-ev-emoji">{cat.emoji}</span>
                        <span className="su-ev-title">{cat.title}</span>
                        <span className="su-ev-sub">{cat.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Vehicle Model Dropdown (Reveals when category picked) */}
              {form.vehicleType && (
                <div
                  className="su-field-wrap"
                  style={{ animation: "suFadeIn 0.2s ease" }}
                >
                  <div className="su-label-row">
                    <label className="su-label">EV Brand & Model</label>
                    <span className="su-opt-badge">Optional</span>
                  </div>
                  <div className="su-select-wrap">
                    <select
                      className="su-select"
                      value={form.vehicleModel}
                      onChange={(e) => set("vehicleModel", e.target.value)}
                    >
                      <option value="">Select your EV model…</option>
                      {Object.entries(groupedModels).map(([brand, models]) => (
                        <optgroup
                          key={brand}
                          label={brand === "Other" ? "── Other ──" : brand}
                        >
                          {models.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <KeyboardArrowDownRoundedIcon
                      sx={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#008f7f",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 3. Interactive Indian EV HSRP Number Plate */}
              <div className="su-field-wrap">
                <div className="su-label-row">
                  <label className="su-label">
                    Vehicle Number Plate<span className="su-req">*</span>
                  </label>
                  {form.vehicleNumber && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: isPlateValid ? "#008764" : "#e06014",
                      }}
                    >
                      {isPlateValid ? "✓ Valid Indian Plate" : "Keep typing…"}
                    </span>
                  )}
                </div>

                <div className="su-plate-showcase">
                  {/* Live Green EV HSRP Plate Preview */}
                  <div className="su-hsrp-plate">
                    <div className="su-hsrp-ind-strip">
                      <div className="su-chakra-wheel" />
                      <span className="su-ind-text">IND</span>
                    </div>
                    <div className="su-hsrp-main">
                      <span className="su-rivet-l" />
                      <span
                        className={`su-hsrp-number ${
                          !form.vehicleNumber ? "placeholder" : ""
                        }`}
                      >
                        {formatPlateDisplay(form.vehicleNumber)}
                      </span>
                      <span className="su-rivet-r" />
                    </div>
                  </div>

{/* Actual Input */}
                  <div className="su-plate-input-row">
                    <input
                      type="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
                      className="su-plate-input"
                      placeholder="Type plate e.g. MH12AB1234"
                      value={form.vehicleNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9\s\-]/g, "").toUpperCase();
                        set("vehicleNumber", val);
                      }}
                      maxLength={15}
                    />
                    {form.vehicleNumber && (
                      <div className="su-plate-status-icon">
                        {isPlateValid ? (
                          <CheckCircleRoundedIcon
                            sx={{ color: "#00c98d", fontSize: 22 }}
                          />
                        ) : (
                          <ErrorOutlineRoundedIcon
                            sx={{ color: "#ff8236", fontSize: 22 }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {fieldErrors.vehicleNumber ? (
                  <span className="su-err-text">
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 14 }} />
                    {fieldErrors.vehicleNumber}
                  </span>
                ) : (
                  <span className="su-hint">
                    Supports standard (MH12AB1234) & Bharat Series (22BH1234AB)
                  </span>
                )}
              </div>

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "#fff2f0",
                    border: "1px solid #ffd4ce",
                    color: "#d93025",
                    fontSize: 12.5,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="su-btn-back"
                  onClick={() => setStep(0)}
                >
                  <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  className="su-btn-primary"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ color: "#ffffff" }} />
                      <span>Setting up…</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Sign Up</span>
                      <BoltRoundedIcon sx={{ fontSize: 20 }} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: DONE CELEBRATION ── */}
          {step === 2 && (
            <div className="su-card">
              <div className="su-success-box">
                <div className="su-success-orb">
                  <BoltRoundedIcon sx={{ fontSize: 44 }} />
                </div>
                <h2
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#0e2e33",
                    margin: "4px 0 0",
                  }}
                >
                  Welcome aboard, {form.name.split(" ")[0] || "Driver"}!
                </h2>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "#53757a",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Your EV{" "}
                  <strong style={{ color: "#00776b" }}>
                    {formatPlateDisplay(form.vehicleNumber)}
                  </strong>{" "}
                  is registered. Redirecting you to the dashboard…
                </p>
              </div>
            </div>
          )}

          {/* Bottom Login Link */}
          {step < 2 && (
            <p className="su-footer-text">
              Already have a VIZ account?
              <button
                type="button"
                className="su-login-link"
                onClick={() => navigate("/login")}
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}