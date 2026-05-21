// src/components/SignUp.js
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { auth } from "../firebase";
import { getGroupedVehicles } from "../utils/evVehicles";

// ─── Indian number plate validator ─────────────────────────────────────────
const PLATE_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{1,4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
function validatePlate(raw) {
  const cleaned = (raw || "").replace(/[\s\-]/g, "").toUpperCase();
  return PLATE_REGEX.test(cleaned) ? cleaned : null;
}
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// ─── Shared field wrapper ──────────────────────────────────────────────────
function Field({ label, required, hint, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(190,215,230,0.7)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#04bfbf", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: "rgba(180,210,220,0.4)" }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: "#ff6b7a" }}>{error}</span>}
    </div>
  );
}

const baseInput = {
  width: "100%", padding: "13px 16px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)", background: "#0d1a20",
  color: "#e6f9ff", fontSize: 15, outline: "none", fontFamily: "inherit",
  boxSizing: "border-box", transition: "border-color 0.18s",
};

function SInput({ style, ...props }) {
  const [f, setF] = useState(false);
  return (
    <input
      {...props}
      style={{ ...baseInput, ...(f ? { borderColor: "#04bfbf" } : {}), ...(style || {}) }}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
    />
  );
}

function SSelect({ children, style, ...props }) {
  const [f, setF] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...baseInput, appearance: "none", WebkitAppearance: "none", cursor: "pointer",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%2304bfbf' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 40,
        ...(f ? { borderColor: "#04bfbf" } : {}), ...(style || {}),
      }}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
    >
      {children}
    </select>
  );
}

// ─── Step indicator ────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ["Your Info", "Vehicle", "Done"];
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: 28 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
              background: i < current ? "#04bfbf" : i === current ? "linear-gradient(135deg,#04bfbf,#027a7a)" : "rgba(255,255,255,0.07)",
              color: i <= current ? "#0a1a20" : "rgba(180,210,220,0.4)",
              border: i === current ? "2px solid #04bfbf" : "none",
              boxShadow: i === current ? "0 0 10px rgba(4,191,191,0.35)" : "none",
              transition: "all 0.3s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 10, marginTop: 4, fontWeight: i === current ? 600 : 400, color: i === current ? "#04bfbf" : "rgba(180,210,220,0.4)" }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 2, height: 2, borderRadius: 2, marginBottom: 18, background: i < current ? "#04bfbf" : "rgba(255,255,255,0.07)", transition: "background 0.3s" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function SignUp() {
  const { state } = useLocation();
  const mobile = state?.mobile || "";
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", gstin: "", vehicleType: "", vehicleModel: "", vehicleNumber: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setFieldErrors(e => ({ ...e, [k]: "" })); };

  const validateStep0 = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (form.gstin && !GSTIN_REGEX.test(form.gstin.toUpperCase())) errs.gstin = "Invalid GSTIN — must be 15 characters, e.g. 22AAAAA0000A1Z5";
    setFieldErrors(errs);
    return !Object.keys(errs).length;
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.vehicleNumber.trim()) errs.vehicleNumber = "Vehicle number is required";
    else if (!validatePlate(form.vehicleNumber)) errs.vehicleNumber = "Invalid plate — try MH12AB1234 or 22BH1234AB";
    setFieldErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setError(""); setLoading(true);
    try {
      const phone = mobile || auth.currentUser?.phoneNumber || "";
      if (!phone) { setError("Phone verification lost. Please go back and login again."); setLoading(false); return; }
      const res = await api.post("/api/auth/signup", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: phone,
        vehicleType: form.vehicleType || "",
        vehicleModel: form.vehicleModel || "",
        vehicleNumber: validatePlate(form.vehicleNumber),
        ...(form.gstin ? { gstin: form.gstin.toUpperCase() } : {}),
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("signup_token")}` } });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setStep(2);
      setTimeout(() => navigate("/home"), 1600);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally { setLoading(false); }
  };

  const groupedModels = form.vehicleType ? getGroupedVehicles(form.vehicleType) : {};

  return (
    <div style={{
      minHeight: "100vh", width: "100vw", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "24px 0",
      background: "linear-gradient(160deg,#0a1620 0%,#0d1f28 40%,#0a1a1f 100%)",
      fontFamily: "'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif", color: "#e6f9ff",
    }}>
      <div style={{
        width: "min(92vw, 460px)", padding: "36px 32px", borderRadius: 20,
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
      }}>
        {/* Brand badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(4,191,191,0.08)", borderRadius: 12, padding: "6px 16px", border: "1px solid rgba(4,191,191,0.18)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#04bfbf" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#04bfbf", letterSpacing: "0.05em" }}>SPARX</span>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>Create your account</h1>
        <p style={{ fontSize: 13, color: "rgba(190,215,230,0.5)", textAlign: "center", marginBottom: 24 }}>
          Verified: <span style={{ color: "#04bfbf", fontWeight: 600 }}>{mobile}</span>
        </p>

        <Steps current={step} />

        {/* ── Step 0: Personal Info ──────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field label="Full Name" required error={fieldErrors.name}>
              <SInput placeholder="Roshan Kumar" value={form.name} onChange={e => set("name", e.target.value)} autoComplete="name" />
            </Field>

            <Field label="Email Address" required error={fieldErrors.email}>
              <SInput type="email" placeholder="roshan@example.com" value={form.email} onChange={e => set("email", e.target.value)} autoComplete="email" />
            </Field>

            <Field label="GSTIN" hint="Optional · For GST invoice on your charging receipts" error={fieldErrors.gstin}>
              <SInput
                placeholder="22AAAAA0000A1Z5"
                value={form.gstin}
                onChange={e => set("gstin", e.target.value.toUpperCase())}
                maxLength={15}
                style={{ fontFamily: "monospace", letterSpacing: "0.08em" }}
              />
            </Field>

            <button type="button" onClick={() => validateStep0() && setStep(1)} style={{
              marginTop: 4, height: 50, borderRadius: 12, fontWeight: 700, fontSize: 15,
              background: "linear-gradient(90deg,#04bfbf,#027a7a)", color: "#0a1a20",
              border: "none", cursor: "pointer", boxShadow: "0 4px 18px rgba(4,191,191,0.25)",
            }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 1: Vehicle Info ───────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Vehicle type tiles */}
            <Field label="Vehicle Type" hint="Optional">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {["2 Wheeler", "3 Wheeler", "4 Wheeler"].map(t => (
                  <button key={t} type="button"
                    onClick={() => { set("vehicleType", t); set("vehicleModel", ""); }}
                    style={{
                      padding: "12px 6px", borderRadius: 12, border: "none", cursor: "pointer",
                      background: form.vehicleType === t
                        ? "linear-gradient(135deg,rgba(4,191,191,0.2),rgba(2,122,122,0.12))"
                        : "rgba(255,255,255,0.04)",
                      outline: `2px solid ${form.vehicleType === t ? "#04bfbf" : "transparent"}`,
                      color: form.vehicleType === t ? "#04bfbf" : "rgba(180,210,220,0.55)",
                      fontFamily: "inherit", fontSize: 11, fontWeight: 600,
                      textAlign: "center", transition: "all 0.2s",
                    }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>
                      {t === "2 Wheeler" ? "🛵" : t === "3 Wheeler" ? "🛺" : "🚗"}
                    </div>
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            {/* Vehicle model — only shown when type selected */}
            {form.vehicleType && (
              <Field label="Vehicle Model" hint="Optional · Select your EV model">
                <SSelect value={form.vehicleModel} onChange={e => set("vehicleModel", e.target.value)}>
                  <option value="">Select model...</option>
                  {Object.entries(groupedModels).map(([brand, models]) => (
                    <optgroup key={brand} label={brand === "Other" ? "── Other ──" : brand} style={{ color: "#04bfbf", background: "#0d1a20" }}>
                      {models.map(m => (
                        <option key={m} value={m} style={{ background: "#0d1a20", color: "#e6f9ff" }}>{m}</option>
                      ))}
                    </optgroup>
                  ))}
                </SSelect>
              </Field>
            )}

            {/* Vehicle number */}
            <Field label="Vehicle Number" required hint="Format: MH12AB1234  ·  BH plate: 22BH1234AB" error={fieldErrors.vehicleNumber}>
              <div style={{ position: "relative" }}>
                <SInput
                  placeholder="MH12AB1234"
                  value={form.vehicleNumber}
                  onChange={e => set("vehicleNumber", e.target.value.replace(/\s/g, "").toUpperCase())}
                  maxLength={13}
                  style={{ fontFamily: "monospace", letterSpacing: "0.12em", paddingRight: 44 }}
                />
                {form.vehicleNumber && (
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>
                    {validatePlate(form.vehicleNumber) ? "✅" : "❌"}
                  </span>
                )}
              </div>
            </Field>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,107,122,0.1)", border: "1px solid rgba(255,107,122,0.25)", color: "#ff6b7a", fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" onClick={() => setStep(0)} style={{
                flex: 1, height: 50, borderRadius: 12, fontWeight: 600, fontSize: 14,
                background: "rgba(255,255,255,0.05)", color: "rgba(190,215,230,0.7)",
                border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
              }}>
                ← Back
              </button>
              <button type="submit" disabled={loading} style={{
                flex: 2, height: 50, borderRadius: 12, fontWeight: 700, fontSize: 15,
                background: loading ? "rgba(4,191,191,0.35)" : "linear-gradient(90deg,#04bfbf,#027a7a)",
                color: "#0a1a20", border: "none", cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 18px rgba(4,191,191,0.25)",
              }}>
                {loading ? "Creating account…" : "Create Account ⚡"}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Success ────────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>⚡</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#04bfbf", marginBottom: 8 }}>You're all set!</h2>
            <p style={{ fontSize: 14, color: "rgba(190,215,230,0.6)" }}>Redirecting to your dashboard…</p>
          </div>
        )}

        {step < 2 && (
          <p style={{ marginTop: 24, fontSize: 13, color: "rgba(180,210,220,0.45)", textAlign: "center" }}>
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "#04bfbf", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              Login
            </button>
          </p>
        )}
      </div>
    </div>
  );
}