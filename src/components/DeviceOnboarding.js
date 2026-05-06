import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DeviceOnboarding.css';
import { useEffect } from "react";

const DeviceOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);
  const [terms, setTerms] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [commissionPerKwh, setCommissionPerKwh] = useState(null);

  

 


  // Step 1 form data
  const [step1Data, setStep1Data] = useState({
    hasGST: null,
    gstNumber: '',
    meterType: '',
    meterConsumerNumber: ''
  });

    // Step 3: Terms & KYC
  const [step2Data, setStep2Data] = useState({
    acceptedTerms: false,
    aadhaarOrUdyam: '',
    panNumber: '',
    nameAsPerId: '',
    bankAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    branch: ''
  });

  // Step 3 form data
  const [step3Data, setStep3Data] = useState({
    deviceId: '',
    serialNumber: '',
    location: '',
    lat: '',
    lng: '',
    rate: '',
    area: '',
    city: '',
    state: ''
  });
const userRate = parseFloat(step3Data.rate || 0);
const platformFee = commissionPerKwh || 0;

// Correct GST extraction from inclusive price
const gstOnUser = +(userRate * 18 / 118).toFixed(2);

// Base electricity rate (excluding GST)
const baseRate = +(userRate - gstOnUser).toFixed(2);

// Partner payout
const partnerPayout = +(baseRate - platformFee).toFixed(2);

  const [acceptedTermsSnapshot, setAcceptedTermsSnapshot] = useState(null);

const canProceedTerms =
  step2Data.acceptedTerms &&
  step2Data.aadhaarOrUdyam &&
  step2Data.panNumber &&
  step2Data.nameAsPerId &&
  step2Data.bankAccountNumber &&
  step2Data.ifscCode &&
  step2Data.accountHolderName &&
  step2Data.branch;

  const verifyDeviceId = async () => {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${process.env.REACT_APP_Backend_API_Base_URL}/api/partner/verify-device`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ deviceId: step3Data.deviceId })
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Invalid Device ID");
  }
};

const verifySerialNumber = async () => {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${process.env.REACT_APP_Backend_API_Base_URL}/api/partner/verify-serial`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        deviceId: step3Data.deviceId,
        serialNumber: step3Data.serialNumber
      })
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Serial number mismatch");
  }
};


  const handleStep1Change = (e) => {
    const { name, value } = e.target;
    setStep1Data(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleStep2Change = (e) => {
    const { name, value } = e.target;
    setStep2Data(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleGSTSelection = (hasGST) => {
    setStep1Data(prev => ({
      ...prev,
      hasGST,
      gstNumber: hasGST ? prev.gstNumber : ''
    }));
    setError('');
  };

  const validateStep1 = () => {
    if (step1Data.hasGST === null) {
      setError('Please select whether you have GST number');
      return false;
    }

    if (step1Data.hasGST && !step1Data.gstNumber.trim()) {
      setError('Please enter GST number');
      return false;
    }

    if (!step1Data.meterType) {
      setError('Please select meter type');
      return false;
    }

    if (!step1Data.meterConsumerNumber.trim()) {
      setError('Please enter meter consumer number');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
  if (!step2Data.acceptedTerms) {
    setError('You must accept the Terms & Conditions');
    return false;
  }

  const required = [
    'aadhaarOrUdyam',
    'panNumber',
    'nameAsPerId',
    'bankAccountNumber',
    'ifscCode',
    'accountHolderName',
    'branch'
  ];

  for (let field of required) {
    if (!step2Data[field].trim()) {
      setError(`Please enter ${field.replace(/([A-Z])/g, ' $1')}`);
      return false;
    }
  }

  return true;
};


  const validateStep3 = () => {
    const required = ['deviceId', 'location', 'lat', 'lng', 'area', 'city', 'state'];
    
    for (let field of required) {
      if (!step3Data[field]?.toString().trim()) {
        setError(`Please enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    // Validate latitude and longitude
    const lat = parseFloat(step3Data.lat);
    const lng = parseFloat(step3Data.lng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Please enter valid latitude (-90 to 90)');
      return false;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Please enter valid longitude (-180 to 180)');
      return false;
    }

    return true;
  };

  useEffect(() => {
  if (step === 2 && !terms) {
    fetchActiveTerms();
  }
}, [step]);
useEffect(() => {
  if (step === 4 && step3Data.deviceId) {
    fetchCommission();
  }
}, [step]);

const fetchCommission = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${process.env.REACT_APP_Backend_API_Base_URL}/api/partner/device/${step3Data.deviceId}/commission`,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : ""
        }
      }
    );

    if (!res.ok) {
      throw new Error("Unable to fetch platform fee");
    }

    const data = await res.json();
    setCommissionPerKwh(data.commissionPerKwh);
  } catch (err) {
    setError(err.message);
  }
};



const fetchActiveTerms = async () => {
  try {
    setTermsLoading(true);

    const res = await fetch(
      `${process.env.REACT_APP_Backend_API_Base_URL}/api/partner/terms/active`
    );

    if (!res.ok) {
      throw new Error("Failed to load Terms & Conditions");
    }

    const data = await res.json();
    setTerms(data);
      setAcceptedTermsSnapshot({
    version: data.version,
    hash: data.contentHash
  });
  } catch (err) {
    setError(err.message || "Unable to load Terms & Conditions");
  } finally {
    setTermsLoading(false);
  }
};


const handleNext = async () => {
  try {
    setError("");

    if (step === 1) {
      if (validateStep1()) setStep(2);
      return;
    }

    if (step === 2) {
      if (validateStep2()) setStep(3);
      return;
    }

    if (step === 3) {
      if (!validateStep3()) return;

      setLoading(true);

      // 1️⃣ Verify Device ID
      await verifyDeviceId();

      // 2️⃣ Verify Serial Number
      await verifySerialNumber();

      // ✅ All good → Step 4
      setStep(4);
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};





  const handleBack = () => {
    setStep(prev => prev - 1);
    setError('');
  };

  const fetchCurrentLocation = async () => {
  if (!navigator.geolocation) {
    setError('Geolocation is not supported by your device');
    return;
  }

  setLocating(true);
  setError('');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        const address = data.address || {};

        setStep3Data(prev => ({
          ...prev,
          lat,
          lng,
          area: address.suburb || address.neighbourhood || '',
          city: address.city || address.town || address.village || '',
          state: address.state || ''
        }));
      } catch (err) {
        setError('Unable to fetch address details. Please fill manually.');
      } finally {
        setLocating(false);
      }
    },
    () => {
      setError('Location permission denied. Please enter details manually.');
      setLocating(false);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};


  const handleSubmit = async (e) => {
    if (
  !step2Data.acceptedTerms ||
  !acceptedTermsSnapshot?.version ||
  !acceptedTermsSnapshot?.hash
) {
  setError("You must accept the latest Terms & Conditions");
  return;
}

    e.preventDefault();

    if (!validateStep3()) {
      return;
    }
if (!terms?.version || !terms?.contentHash) {
  setError("Terms & Conditions not loaded. Please wait and try again.");
  return;
}


    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

     const payload = {
  // --- Device identification ---
  deviceId: step3Data.deviceId,
  serialNumber: step3Data.serialNumber,

  // --- Device configuration ---
  meterType: step1Data.meterType,
  meterConsumerNumber: step1Data.meterConsumerNumber,

  location: step3Data.location,
  lat: step3Data.lat,
  lng: step3Data.lng,
  area: step3Data.area,
  city: step3Data.city,
  state: step3Data.state,

  // User-facing rate ONLY
 rate: Number(step3Data.rate), // inclusive
  commercial: {
    userRatePerKwh: Number((step3Data.rate / 1.18).toFixed(6))
  },

  // --- GST & model ---
  GSTModel: "fullGST",
  hasGST: step1Data.hasGST,
  gstNumber: step1Data.hasGST ? step1Data.gstNumber : null,

  // --- Consent & KYC ---
  acceptedTerms: step2Data.acceptedTerms,
termsVersion: acceptedTermsSnapshot?.version,
termsHash: acceptedTermsSnapshot?.hash,


  aadhaarOrUdyam: step2Data.aadhaarOrUdyam,
  panNumber: step2Data.panNumber,
  nameAsPerKyc: step2Data.nameAsPerId,
  bankAccountNumber: step2Data.bankAccountNumber,
  ifscCode: step2Data.ifscCode,
  accountHolderName: step2Data.accountHolderName,
  branchName: step2Data.branch,

  fingerprint: localStorage.getItem("fp")
};



      const response = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/partner/onboard-device`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to onboard device');
      }

      const data = await response.json();
      console.log('Device onboarded successfully:', data);

      setSuccess(true);
      
      // Reset form after 2 seconds and navigate
      setTimeout(() => {
        setStep(1);
        setStep1Data({
          hasGST: null,
          gstNumber: '',
          meterType: '',
          meterConsumerNumber: ''
        });
        setStep2Data({
          acceptedTerms: false,
          aadhaarOrUdyam: '',
          panNumber: '',
          nameAsPerId: '',
          bankAccountNumber: '',
          ifscCode: '',
          accountHolderName: '',
          branch: ''
        });

        setStep3Data({
          deviceId: '',
          serialNumber: '',
          location: '',
          lat: '',
          lng: '',
          rate: '',
          area: '',
          city: '',
          state: ''
        });

        setSuccess(false);
        navigate('/devices');
      }, 2000);

    } catch (err) {
      console.error('Error onboarding device:', err);
      setError(err.message || 'Failed to onboard device');
    } finally {
      setLoading(false);
    }
  };
  const handleBackToProfile = () => {
  navigate('/profile');
};


  if (success) {
    return (
      <div className="onboarding-container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h2 className="success-title">Device Onboarded Successfully!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1 className="onboarding-title">Link Charger</h1>
          
          {/* Step Indicator */}
          <div className="step-indicator">
            {[
              { id: 1, label: "GST & Meter" },
              { id: 2, label: "Terms & KYC" },
              { id: 3, label: "Device & Location" },
              { id: 4, label: "Rates & Settlement" }
            ].map((s, index, arr) => (
              <React.Fragment key={s.id}>
                <div className={`step ${step >= s.id ? "active" : ""}`}>
                  <span className="step-number">{s.id}</span>
                  <span className="step-label">{s.label}</span>
                </div>

                {index !== arr.length - 1 && <div className="step-divider" />}
              </React.Fragment>
            ))}
          </div>


        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            <span className="error-text">{error}</span>
          </div>
        )}
{step === 0 && (
  <div className="onboarding-form intro-step compact-intro">
    <div className="form-section">
      <h3 className="section-title">Before You Start</h3>

      <p className="intro-text">
        Keep the following information ready for smooth EV Charger linking process:
      </p>

      <ol className="intro-list">

        <li>
          Meter details – type and consumer number
        </li>
        <li>
          Partner KYC – Aadhaar / Udyam Aadhaar, PAN, Bank details
        </li>
        <li>
          EV charger details – Charger ID and Serial Number
        </li>
        <li>
          Installation location – address and GPS location
        </li>
      </ol>

    </div>

    <div className="form-actions">
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setStep(1)}
      >
        Proceed →
      </button>
    </div>
  </div>
)}



        {/* Step 1: GST & Meter Details */}
        {step === 1 && (
          <div className="onboarding-form">
            {/* GST Section */}
            <div className="form-section">
              <h3 className="section-title">GST Information</h3>
              
              <div className="form-group">
                <label className="form-label">Do you have a GST Number?</label>
                <div className="radio-group">
                  <button
                    type="button"
                    className={`radio-button ${step1Data.hasGST === true ? 'selected' : ''}`}
                    onClick={() => handleGSTSelection(true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`radio-button ${step1Data.hasGST === false ? 'selected' : ''}`}
                    onClick={() => handleGSTSelection(false)}
                  >
                    No
                  </button>
                </div>
              </div>

              {step1Data.hasGST === true && (
                <div className="form-group">
                  <label className="form-label" htmlFor="gstNumber">GST Number *</label>
                  <input
                    type="text"
                    id="gstNumber"
                    name="gstNumber"
                    value={step1Data.gstNumber}
                    onChange={handleStep1Change}
                    placeholder="Enter GST Number"
                    className="form-input"
                  />
                </div>
              )}
            </div>

            {/* Meter Details Section */}
            <div className="form-section">
              <h3 className="section-title">Meter Details</h3>
              
              <div className="form-group">
                <label className="form-label" htmlFor="meterType">Meter Type *</label>
                <select
                  id="meterType"
                  name="meterType"
                  value={step1Data.meterType}
                  onChange={handleStep1Change}
                  className="form-select"
                >
                  <option value="">Select Meter Type</option>
                  <option value="Green Meter">Green Meter</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Residential">Residential</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="meterConsumerNumber">Meter Consumer Number *</label>
                <input
                  type="text"
                  id="meterConsumerNumber"
                  name="meterConsumerNumber"
                  value={step1Data.meterConsumerNumber}
                  onChange={handleStep1Change}
                  placeholder="Enter Meter Consumer Number"
                  className="form-input"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                onClick={handleBackToProfile}
                className="btn btn-secondary"
              >
                ← Profile
              </button>

            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary"
            >
              Next →
            </button>

            </div>

          </div>
        )}
          {step === 2 && (
            <div className="onboarding-form">
              <div className="form-section">
                <h3 className="section-title">Terms & Conditions</h3>
                {termsLoading && (
                      <p className="terms-loading">Loading Terms & Conditions…</p>
                    )}

                    {terms && (
                      <>
                <div className="terms-box">
                  <div className="terms-version">
                    Version: <strong>{terms.version}</strong>
                  </div>

                  <div className="terms-scroll-box">
                    <div
                      className="terms-content"
                      dangerouslySetInnerHTML={{ __html: terms.content }}
                    />

                {/* Checkbox at the END of scroll */}
                <div className="terms-accept-box">
                  <label className="terms-checkbox">
                    <input
                      type="checkbox"
                      checked={step2Data.acceptedTerms}
                      onChange={(e) =>
                        setStep2Data(prev => ({
                          ...prev,
                          acceptedTerms: e.target.checked
                        }))
                      }
                    />
                    <span>I agree to the above Terms & Conditions</span>
                  </label>
                </div>
              </div>
            </div>


                      </>
                    )}
              </div>

              <div className="form-section">
                <h3 className="section-title">KYC & Bank Details</h3>

                {[
                  ['aadhaarOrUdyam', 'Aadhaar / Udyam Aadhaar'],
                  ['panNumber', 'PAN Card Number'],
                  ['nameAsPerId', 'Name as per Aadhaar / PAN'],
                  ['bankAccountNumber', 'Bank Account Number'],
                  ['ifscCode', 'IFSC Code'],
                  ['accountHolderName', 'Account Holder Name'],
                  ['branch', 'Bank Branch']
                ].map(([key, label]) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label} *</label>
                    <input
                      className="form-input"
                      value={step2Data[key]}
                      onChange={(e) =>
                        setStep2Data(prev => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleBack} className="btn btn-secondary">
                  ← Back
                </button>
                <button disabled={!canProceedTerms}
                type="button"
                onClick={handleNext}
                className="btn btn-primary">
                  Next →
                </button>
              </div>
            </div>
          )}

        {/* Step 3: Device & Location Details */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="onboarding-form">
            {/* Device Information Section */}
            <div className="form-section">
              <h3 className="section-title">Device Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="deviceId">Charger ID *</label>
                  <input
                    type="text"
                    id="deviceId"
                    name="deviceId"
                    value={step3Data.deviceId}
                    onChange={(e) => setStep3Data(prev => ({ ...prev, deviceId: e.target.value }))}
                    placeholder="Available on Charger"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="serialNumber">Device Serial Number *</label>
                  <input
                    type="text"
                    id="serialNumber"
                    name="serialNumber"
                    value={step3Data.serialNumber}
                    onChange={(e) => setStep3Data(prev => ({ ...prev, serialNumber: e.target.value })) }
                    placeholder="Available on Invoice"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="rate">User Rate (₹/kWh) *</label>
                <input
                  type="number"
                  id="rate"
                  name="rate"
                  value={step3Data.rate}
                  onChange={(e) => setStep3Data(prev => ({ ...prev, rate: e.target.value })) }
                  placeholder="rate per kWh"
                  step="0.01"
                  min="0"
                  className="form-input"
                />
              </div>
            </div>

            {/* Location Details Section */}
            <div className="form-section">
              <h3 className="section-title">Location Details</h3>
              
                <div className="form-group">
                  <label className="form-label" htmlFor="location">Location *</label>

                  <div className="location-input-row">
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={step3Data.location}
                      onChange={(e) => setStep3Data(prev => ({ ...prev, location: e.target.value })) }
                      placeholder="To display on maps"
                      className="form-input"
                    />

                    <button
                      type="button"
                      className="btn btn-location"
                      onClick={fetchCurrentLocation}
                      disabled={locating}
                    >
                      {locating ? 'Locating…' : 'Use My Location'}
                    </button>
                  </div>
                </div>


              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="lat">Latitude *</label>
                  <input
                    type="text"
                    id="lat"
                    name="lat"
                    value={step3Data.lat}
                    onChange={(e) => setStep3Data(prev => ({ ...prev, lat: e.target.value })) }
                    placeholder="e.g., 18.423"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="lng">Longitude *</label>
                  <input
                    type="text"
                    id="lng"
                    name="lng"
                    value={step3Data.lng}
                    onChange={(e) => setStep3Data(prev => ({ ...prev, lng: e.target.value })) }
                    placeholder="e.g., 73.810"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="area">Area *</label>
                  <input
                    type="text"
                    id="area"
                    name="area"
                    value={step3Data.area}
                    onChange={(e) => setStep3Data(prev => ({ ...prev, area: e.target.value })) }
                    placeholder="Area Name"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="city">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={step3Data.city}
                    onChange={(e) => setStep3Data(prev => ({ ...prev, city: e.target.value })) }
                    placeholder="e.g., Pune"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="state">State *</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={step3Data.state}
                  onChange={(e) => setStep3Data(prev => ({ ...prev, state: e.target.value })) }
                  placeholder="e.g., Maharashtra"
                  className="form-input"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-secondary"
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Next →"}
              </button>


            </div>
          </form>
        )}

        {step === 4 && (
  <div className="onboarding-form">
    <div className="form-section">
      <h3 className="section-title">Rates & Commission</h3>

      <p className="legal-note">
     Please review carefully before final submission.
      </p>

      <div className="rate-breakdown">

        <div className="section-title">
          <span>Unit rate breakdown</span>
        </div>

        <div className="rate-row">
          <span>User Rate (incl. GST)</span>
          <strong>₹ {userRate.toFixed(1)} / kWh</strong>
        </div>

        <div className="rate-row subtle">
          <span>GST @18% </span>
          <strong>- ₹ {gstOnUser}  / kWh</strong>
        </div>

        <div className="rate-row">
          <span> Platform fee </span>
          <strong>- ₹ {platformFee.toFixed(1)} / kWh</strong>
        </div>

        <div className="rate-row total">
          <span>Final Payout</span>
          <strong>₹ {partnerPayout.toFixed(1)} / kWh</strong>
        </div>

      </div>

<p className="legal-footer">
  • GST will be calculated per charging session<br/>
  • Monthly payout & invoices will be available in dashboard<br/>
  • Final settlement governed by accepted Terms & Conditions
</p>

    </div>

    <div className="form-actions">
      <button
        type="button"
        onClick={handleBack}
        className="btn btn-secondary"
      >
        ← Back
      </button>

        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary"
          disabled={loading || !terms?.version || !terms?.contentHash}
        >
          {loading ? 'Submitting…' : 'Confirm & Submit'}
        </button>

    </div>
  </div>
)}

      </div>
    </div>
  );
};

export default DeviceOnboarding;
