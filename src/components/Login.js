// src/components/Login.js
import React, { useEffect, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";

import { auth } from "../firebase";
import { api } from "../api";

// You can replace this with a local image path like "/login-banner.jpg" if desired
const HERO_BANNER_IMAGE =
  "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1000&q=85";

export default function Login() {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isVerifyLoading, setIsVerifyLoading] = useState(false);

  const navigate = useNavigate();

  // Helper: create / recreate the invisible reCAPTCHA and render it
  const createRecaptcha = async () => {
    try {
      if (window.recaptchaVerifier) {
        try {
          window.grecaptcha && window.grecaptcha.reset(window.recaptchaWidgetId);
        } catch (e) {
          // ignore
        }
      }

      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {},
          "expired-callback": async () => {
            try {
              const id = await window.recaptchaVerifier.render();
              window.grecaptcha?.reset(id);
            } catch {}
          },
        }
      );

      const widgetId = await window.recaptchaVerifier.render();
      window.recaptchaWidgetId = widgetId;
    } catch (err) {
      console.warn("createRecaptcha failed:", err);
    }
  };

  useEffect(() => {
    if (auth) {
      createRecaptcha();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = async () => {
    setError("");
    if (mobile.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    setIsOtpLoading(true);

    try {
      if (!window.recaptchaVerifier) {
        await createRecaptcha();
      } else {
        const containerExists = !!document.getElementById("recaptcha-container");
        if (!containerExists) {
          await createRecaptcha();
        }
      }

      const appVerifier = window.recaptchaVerifier;
      const phoneNumber = "+91" + mobile;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep(2);
      setIsOtpLoading(false);
    } catch (err) {
      console.error("Send OTP error:", err?.code, err?.message, err?.customData || err);

      const msg = err?.message || "";
      const isRecaptchaRemoved =
        msg.includes("reCAPTCHA client element has been removed") ||
        msg.toLowerCase().includes("recaptcha") ||
        err?.code === "auth/invalid-verification-id" ||
        err?.code === "auth/missing-verification-id" ||
        err?.code === "auth/internal-error";

      if (isRecaptchaRemoved) {
        try {
          await createRecaptcha();
        } catch {}
        setError("Could not send OTP. Please refresh the page or try again.");
      } else {
        setError("Could not send OTP. Please refresh the page or try again.");
      }

      try {
        const id = await window.recaptchaVerifier?.render();
        window.grecaptcha?.reset(id);
      } catch {}

      setIsOtpLoading(false);
    }
  };

  async function checkProfileExists(idToken) {
    try {
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      } else {
        localStorage.setItem("token", idToken);
      }
      return { exists: true, user: res.data.user || res.data };
    } catch (err) {
      console.error(
        "checkProfileExists - error",
        err?.response?.status,
        err?.response?.data || err.message
      );
      if (err?.response?.status === 404) return { exists: false };
      throw err;
    }
  }

  const verifyCode = async () => {
    setError("");
    if (!confirmationResult || code.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setIsVerifyLoading(true);

    try {
      const cred = await confirmationResult.confirm(code);
      const user = cred.user;
      const idToken = await user.getIdToken(true);

      let profileCheck;
      try {
        profileCheck = await checkProfileExists(idToken);
      } catch (e) {
        console.error("profile lookup failed:", e);
        profileCheck = { exists: false };
      }

      if (!profileCheck.exists) {
        localStorage.setItem("signup_token", idToken);
        navigate("/signup", { state: { mobile: user.phoneNumber } });
        return;
      }

      if (profileCheck.user) {
        localStorage.setItem(
          "user",
          JSON.stringify({ uid: user.uid, phone: user.phoneNumber, ...profileCheck.user })
        );
      } else {
        localStorage.setItem(
          "user",
          JSON.stringify({ uid: user.uid, phone: user.phoneNumber })
        );
      }

      navigate("/landing-home");
    } catch (err) {
      console.error("verify error:", err?.code, err?.message, err);
      setError("Invalid OTP. Please check and try again.");
      setIsVerifyLoading(false);
      try {
        const id = await window.recaptchaVerifier?.render();
        window.grecaptcha?.reset(id);
      } catch {}
    }
  };

  return (
    <div className="viz-login-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.viz-login-page {
  width: 100%;

  /* Dedicated scroll viewport — same approach as Signup */
  height: 100vh;
  height: 100dvh;
  min-height: 0;

  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;

  background: #041014;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;

  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  color: #ffffff;

  box-sizing: border-box;
}

        /* Mobile-first shell (centered on desktop, full-bleed on phones) */
.viz-login-shell {
  width: 100%;
  max-width: 440px;

  /* Allow the login content to grow beyond the viewport */
  min-height: 100%;
  height: auto;

  background: linear-gradient(
    180deg,
    #07191e 0%,
    #040f13 100%
  );

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;

  position: relative;
  margin: 0 auto;

  box-shadow: 0 0 60px rgba(0, 0, 0, 0.65);

  overflow: visible;
  flex-shrink: 0;
  box-sizing: border-box;
}

        /* ── TOP CURVED IMAGE HALF (ZOMATO STYLE) ── */
        .viz-hero-banner {
          position: relative;
          width: 100%;
          height: clamp(270px, 43dvh, 360px);
          border-bottom-left-radius: 42px;
          border-bottom-right-radius: 42px;
          overflow: hidden;
          background: linear-gradient(135deg, #0b2d35 0%, #05161a 100%);
          box-shadow:
            0 14px 34px rgba(0, 0, 0, 0.55),
            0 2px 0 rgba(0, 210, 180, 0.35);
          flex-shrink: 0;
        }

        .viz-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          transform: scale(1.02);
          filter: saturate(1.1) contrast(1.05);
        }

        /* Gradient overlay so top badges & curve edge pop cleanly */
        .viz-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              rgba(3, 15, 18, 0.45) 0%,
              rgba(3, 15, 18, 0.10) 45%,
              rgba(6, 22, 26, 0.78) 100%
            );
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: max(18px, env(safe-area-inset-top, 16px)) 20px 22px;
          box-sizing: border-box;
        }

        .viz-hero-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .viz-eco-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(4, 18, 22, 0.65);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 210, 180, 0.35);
          color: #00e5be;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        .viz-skip-btn {
          appearance: none;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(4, 18, 22, 0.62);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #eefcfc;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 700;
          padding: 6px 15px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .viz-skip-btn:hover {
          background: rgba(0, 210, 180, 0.25);
          border-color: #00d2b4;
          color: #ffffff;
        }
        .viz-skip-btn:active {
          transform: scale(0.95);
        }

        .viz-hero-badge-bottom {
          align-self: center;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(6, 22, 26, 0.78);
          border: 1px solid rgba(255, 130, 54, 0.4);
          backdrop-filter: blur(8px);
          color: #ff9d5c;
          font-size: 11.5px;
          font-weight: 700;
        }

        /* ── LOWER DARKISH CONTENT HALF ── */
        .viz-lower-section {
          flex: 1 0 auto;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 24px 22px max(20px, env(safe-area-inset-bottom, 18px));
          box-sizing: border-box;
          min-height: 0;
        }

        .viz-form-core {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Main Tagline / Headline */
        .viz-main-title {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(23px, 6.2vw, 27px);
          font-weight: 800;
          line-height: 1.22;
          text-align: center;
          color: #ffffff;
          letter-spacing: -0.4px;
          margin: 0 0 18px;
          max-width: 340px;
        }

        .viz-main-title span.highlight-aqua {
          background: linear-gradient(90deg, #00e5be 0%, #00b8d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Zomato-style "Log in or sign up" horizontal divider */
        .viz-divider-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .viz-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(160, 215, 210, 0.22),
            transparent
          );
        }

        .viz-divider-text {
          font-size: 13px;
          font-weight: 700;
          color: #9cbec4;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }

        /* Error Banner */
        .viz-error-banner {
          width: 100%;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(255, 82, 82, 0.12);
          border: 1px solid rgba(255, 82, 82, 0.35);
          color: #ff8a8a;
          font-size: 12.5px;
          font-weight: 600;
          text-align: center;
          margin-bottom: 14px;
          box-sizing: border-box;
        }

        /* ── ZOMATO-STYLE SPLIT PHONE INPUT ROW ── */
        .viz-phone-row {
          width: 100%;
          display: flex;
          align-items: stretch;
          gap: 10px;
          margin-bottom: 16px;
        }

        .viz-flag-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          height: 56px;
          border-radius: 15px;
          background: #0c2228;
          border: 1.5px solid rgba(0, 210, 180, 0.22);
          color: #cde8ec;
          flex-shrink: 0;
          user-select: none;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .viz-flag-svg {
          width: 24px;
          height: 17px;
          border-radius: 3px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
          flex-shrink: 0;
        }

        .viz-mobile-box {
          flex: 1;
          height: 56px;
          border-radius: 15px;
          background: #0c2228;
          border: 1.5px solid rgba(0, 210, 180, 0.22);
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 10px;
          transition: all 0.18s ease;
          box-sizing: border-box;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .viz-mobile-box:focus-within {
          border-color: #00d2b4;
          background: #0f2930;
          box-shadow: 0 0 0 3.5px rgba(0, 210, 180, 0.18);
        }

        .viz-country-code {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 800;
          color: #00d2b4;
          letter-spacing: 0.3px;
          user-select: none;
          flex-shrink: 0;
        }

        .viz-code-sep {
          width: 1.5px;
          height: 22px;
          background: rgba(255, 255, 255, 0.14);
          flex-shrink: 0;
        }

        /* Bold Font for Mobile Number */
        .viz-mobile-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: 1.2px;
          color: #ffffff;
          padding: 0;
        }

        .viz-mobile-input::placeholder {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 500;
          letter-spacing: 0px;
          color: #6c939a;
        }

        /* ── CONTINUE / ACTION BUTTON ── */
        .viz-cta-btn {
          width: 100%;
          height: 54px;
          border-radius: 15px;
          border: none;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          font-size: 16.5px;
          font-weight: 800;
          letter-spacing: 0.3px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(255, 82, 26, 0.35);
          transition: all 0.18s ease;
        }

        .viz-cta-btn:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 12px 28px rgba(255, 82, 26, 0.48);
        }

        .viz-cta-btn:active:not(:disabled) {
          transform: scale(0.985);
        }

        .viz-cta-btn:disabled {
          background: #132c33;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #5b7e85;
          box-shadow: none;
          cursor: not-allowed;
        }

        /* ── STEP 2: OTP VERIFICATION VIEW ── */
        .viz-otp-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .viz-sent-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 13px;
          background: rgba(0, 210, 180, 0.10);
          border: 1px solid rgba(0, 210, 180, 0.28);
          font-size: 13px;
          color: #d4f7f2;
        }

        .viz-sent-number {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 14.5px;
          color: #00e5be;
          letter-spacing: 0.5px;
        }

        .viz-change-btn {
          background: transparent;
          border: none;
          color: #ff8236;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0;
        }

        .viz-otp-input-box {
          width: 100%;
          height: 58px;
          border-radius: 15px;
          background: #0c2228;
          border: 1.5px solid rgba(0, 210, 180, 0.35);
          font-family: 'Outfit', monospace;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 12px;
          text-align: center;
          color: #ffffff;
          outline: none;
          box-sizing: border-box;
          transition: all 0.18s ease;
        }

        .viz-otp-input-box:focus {
          border-color: #00d2b4;
          background: #0f2930;
          box-shadow: 0 0 0 3.5px rgba(0, 210, 180, 0.18);
        }

        .viz-otp-input-box::placeholder {
          letter-spacing: 8px;
          color: #4c727a;
          font-weight: 600;
        }

        /* ── BOTTOM SMALL LOGO & LEGAL FOOTER ── */
        .viz-bottom-footer {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-top: 26px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .viz-bottom-logo {
          height: 36px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 2px 10px rgba(0, 210, 180, 0.35));
          opacity: 0.95;
        }

        .viz-terms-copy {
          font-size: 11px;
          color: #6d8f96;
          text-align: center;
          line-height: 1.5;
          margin: 0;
        }

        .viz-terms-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .viz-terms-links a {
          color: #9cbec4;
          font-size: 11px;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.15s ease;
        }

        .viz-terms-links a:hover {
          color: #00d2b4;
        }
          /* Short screens: preserve access to the complete login form */
@media screen and (max-height: 700px) {
  .viz-hero-banner {
    height: 230px;
    flex-shrink: 0;
  }

  .viz-lower-section {
    padding-top: 20px;
  }

  .viz-main-title {
    margin-bottom: 14px;
  }

  .viz-bottom-footer {
    margin-top: 22px;
  }
}

/* Very small phones */
@media screen and (max-height: 560px) {
  .viz-hero-banner {
    height: 190px;
  }

  .viz-lower-section {
    padding-top: 16px;
  }
}

      `}</style>

      <div className="viz-login-shell">
        {/* ═══════════════════════════════════════════════════
            1. TOP HALF: CURVED IMAGE BANNER
        ═══════════════════════════════════════════════════ */}
        <div className="viz-hero-banner">
          <img
            src={HERO_BANNER_IMAGE}
            alt="VIZ Smart EV Charging"
            className="viz-hero-img"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />

          <div className="viz-hero-overlay">
            <div className="viz-hero-top-bar">
              <div className="viz-eco-pill">
                <BoltRoundedIcon sx={{ fontSize: 15 }} />
                <span>Smart EV Network</span>
              </div>

              <button
                type="button"
                className="viz-skip-btn"
                onClick={() => navigate("/home")}
              >
                Skip
              </button>
            </div>

            <div className="viz-hero-badge-bottom">
              <span>⚡ Fast, Reliable & 100% Green Charging</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            2. LOWER HALF: DARKISH FORM & BOTTOM LOGO
        ═══════════════════════════════════════════════════ */}
        <div className="viz-lower-section">
          <div className="viz-form-core">
            {/* Main Tagline */}
            <h1 className="viz-main-title">
              Start your journey with{" "}
              <span className="highlight-aqua">VIZ Smart Charging</span>
            </h1>

            {/* Section Divider */}
            <div className="viz-divider-row">
              <span className="viz-divider-line" />
              <span className="viz-divider-text">
                {step === 1 ? "Log in or sign up" : "Verify OTP"}
              </span>
              <span className="viz-divider-line" />
            </div>

            {/* Error Alert */}
            {error && <div className="viz-error-banner">{error}</div>}

            {/* STEP 1: MOBILE NUMBER INPUT */}
            {step === 1 && (
              <div style={{ width: "100%" }}>
                <div className="viz-phone-row">
                  {/* India Flag Selector Box */}
                  <div className="viz-flag-box" title="India (+91)">
                    <svg
                      className="viz-flag-svg"
                      viewBox="0 0 36 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="36" height="8" y="0" fill="#FF9933" />
                      <rect width="36" height="8" y="8" fill="#FFFFFF" />
                      <rect width="36" height="8" y="16" fill="#138808" />
                      <circle
                        cx="18"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="#000080"
                        strokeWidth="0.9"
                      />
                      <circle cx="18" cy="12" r="0.8" fill="#000080" />
                    </svg>
                    <KeyboardArrowDownRoundedIcon
                      sx={{ fontSize: 18, color: "#7fa5ac" }}
                    />
                  </div>

                  {/* +91 & Bold Phone Number Field */}
                  <div className="viz-mobile-box">
                    <span className="viz-country-code">+91</span>
                    <span className="viz-code-sep" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter Mobile Number"
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          mobile.length === 10 &&
                          !isOtpLoading
                        ) {
                          sendCode();
                        }
                      }}
                      className="viz-mobile-input"
                      autoFocus
                    />
                    {mobile.length === 10 && (
                      <CheckCircleRoundedIcon
                        sx={{ color: "#00d2b4", fontSize: 20, flexShrink: 0 }}
                      />
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="viz-cta-btn"
                  onClick={sendCode}
                  disabled={mobile.length !== 10 || isOtpLoading}
                >
                  {isOtpLoading ? (
                    <CircularProgress size={22} sx={{ color: "#ffffff" }} />
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowForwardRoundedIcon sx={{ fontSize: 19 }} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
            {step === 2 && (
              <div className="viz-otp-wrap">
                <div className="viz-sent-pill">
                  <span>
                    OTP sent to{" "}
                    <strong className="viz-sent-number">+91 {mobile}</strong>
                  </span>
                  <button
                    type="button"
                    className="viz-change-btn"
                    onClick={() => {
                      setStep(1);
                      setCode("");
                      setError("");
                      setIsOtpLoading(false);
                      setIsVerifyLoading(false);
                    }}
                  >
                    <EditRoundedIcon sx={{ fontSize: 14 }} />
                    <span>Change</span>
                  </button>
                </div>

                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      code.length === 6 &&
                      !isVerifyLoading
                    ) {
                      verifyCode();
                    }
                  }}
                  className="viz-otp-input-box"
                  autoFocus
                />

                <button
                  type="button"
                  className="viz-cta-btn"
                  onClick={verifyCode}
                  disabled={code.length < 6 || isVerifyLoading}
                >
                  {isVerifyLoading ? (
                    <CircularProgress size={22} sx={{ color: "#ffffff" }} />
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowForwardRoundedIcon sx={{ fontSize: 19 }} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── SMALL VIZ LOGO & TERMS AT BOTTOM ── */}
          <div className="viz-bottom-footer">
            <img
              src="/logo.png"
              alt="VIZ Logo"
              className="viz-bottom-logo"
              onError={(e) => {
                e.target.src = "/logo2.png";
              }}
            />

            <div className="viz-terms-copy">
              <p style={{ margin: "0 0 4px" }}>
                By continuing, you agree to our
              </p>
              <div className="viz-terms-links">
                <a href="/terms.pdf" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>
                <span>•</span>
                <a href="/refund.pdf" target="_blank" rel="noopener noreferrer">
                  Refund & Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invisible Firebase ReCAPTCHA Anchor */}
      <div id="recaptcha-container"></div>
    </div>
  );
}