// ChargingOptions.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Slider,
  CircularProgress,
  Alert,
  Avatar,
  TextField,
} from "@mui/material";

function ChargingOptions() {
  const { device_id } = useParams();
  const deviceId = device_id;
  const navigate = useNavigate();

  // device + UI states
  const [deviceDetails, setDeviceDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // option/slider
  const [selectedOption, setSelectedOption] = useState("amount");
  const [sliderValue, setSliderValue] = useState(100);

  // computed values
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedEnergy, setEstimatedEnergy] = useState(0);

  // coupon states
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [appliedCouponObj, setAppliedCouponObj] = useState(null);
  const [couponErrorMsg, setCouponErrorMsg] = useState("");

  // derived, to carry forward original user selection
  const [originalSelectedAmount, setOriginalSelectedAmount] = useState(0);

  const [paymentError, setPaymentError] = useState(null);



  /* -------------------------
   *  Fetch device details
   * ------------------------- */
  useEffect(() => {
    if (!deviceId) {
      setError("Device ID is missing.");
      return;
    }

    const fetchDeviceDetails = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const resp = await fetch(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/devices/public/${deviceId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );

        if (!resp.ok) throw new Error("Failed to fetch device details.");
        const d = await resp.json();
        setDeviceDetails(d);
      } catch (e) {
        console.error("fetchDeviceDetails error:", e);
        setError("Failed to load device details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeviceDetails();
  }, [deviceId]);

  /* -------------------------
   *  Keep estimatedCost / energy in sync with selection
   *  and compute originalSelectedAmount (before coupon)
   * ------------------------- */
  useEffect(() => {
    if (!deviceDetails) return;

    const rate = deviceDetails.rate || 20;

    if (selectedOption === "amount") {
      // sliderValue is an amount (₹)
      setEstimatedCost(sliderValue);
      setEstimatedEnergy(Number((sliderValue / rate).toFixed(2)));
      setOriginalSelectedAmount(sliderValue);
    } else {
      // selectedOption === "energy", sliderValue is kWh
      const computedCost = Number((sliderValue * rate).toFixed(2));
      setEstimatedCost(computedCost);
      setEstimatedEnergy(sliderValue);
      setOriginalSelectedAmount(computedCost); // carry forward the amount equivalent of energy selection
    }

    // If a coupon was previously applied but the user changes slider/option, disable coupon (to avoid inconsistency)
    // (We enforce single-apply before proceeding.)
    if (couponApplied) {
      setCouponApplied(false);
      setAppliedCouponObj(null);
      setDiscountedPrice(null);
      setCouponErrorMsg("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sliderValue, selectedOption, deviceDetails]);




  /* -------------------------
   *  Option handlers
   * ------------------------- */
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    // reset slider to safer default (0 so user explicitly picks)
    setSliderValue(option === "amount" ? 100 : 10);
    // reset estimated fields will be recalculated by effect
  };

  const handleSliderChange = (event, value) => {
    setSliderValue(value);
  };

  /* -------------------------
   *  Coupon apply -> server validation
   *  - Sends (code, deviceId, amount) to backend
   *  - backend returns { newAmount, coupon? }
   *  - If newAmount === 0 -> generate sparxpay_ ID and immediately navigate
   * ------------------------- */
async function applyCoupon() {
  if (couponApplied) return;
  setCouponErrorMsg('');
  setApplyingCoupon(true);

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setCouponErrorMsg('You must be logged in to apply a coupon.');
      setApplyingCoupon(false);
      return;
    }

    const backendBase = process.env.REACT_APP_Backend_API_Base_URL || 'https://viz.vjratechnologies.com/';
    const resp = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/coupons/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: couponCode.trim(), deviceId, amount: originalSelectedAmount }),
    });

    // Defensive: check for non-JSON response (like HTML error page)
    const ct = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      // Read text to show helpful message
      const text = await resp.text();
      // If HTML returned, show cleaner message
      if (ct.includes('html')) {
        throw new Error('Server returned HTML. Check backend URL and that the API is running.');
      }
      // try to parse JSON error
      try {
        const jsonErr = JSON.parse(text);
        throw new Error(jsonErr.error || JSON.stringify(jsonErr));
      } catch (e) {
        throw new Error(text || 'Failed to apply coupon');
      }
    }

    if (!ct.includes('application/json')) {
      const text = await resp.text();
      throw new Error('Expected JSON response but got: ' + text.slice(0, 200));
    }

    const data = await resp.json();



    // success handling
    if (!data || typeof data.newAmount !== 'number') {
      throw new Error('Unexpected response');
    }

    setCouponApplied(true);
    setAppliedCouponObj({ ...data.coupon, code: data.coupon.code });
    setDiscountedPrice(data.newAmount);


    setApplyingCoupon(false);
  } catch (err) {
    console.error('applyCoupon error:', err);
    setCouponErrorMsg(err.message || 'Failed to apply coupon');
    setApplyingCoupon(false);
  }
}

async function consumeCoupon() {
  if (!couponApplied || !appliedCouponObj?.code) return;

  try {
    const token = localStorage.getItem("token");
    await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/coupons/consume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: appliedCouponObj.code,
        deviceId,
      }),
    });
    console.log("Coupon consumed successfully");
  } catch (err) {
    console.error("Failed to consume coupon:", err);
  }
}



  /* -------------------------
   *  Proceed to Payment
   *  - If coupon applied: payable = discountedPrice
   *  - Else: payable = estimatedCost
   *  - If payable === 0 (edge case), generate transaction id and navigate
   *  - Otherwise create Razorpay order and open modal; on success navigate to session-start passing transaction id from Razorpay
   * ------------------------- */
  const handleProceedToPayment = async () => {
    if (!selectedOption || sliderValue === 0) {
      alert("Please select a charging option and value!");
      return;
    }

    // ensure we have device details
    if (!deviceDetails) {
      alert("Device not loaded. Try again.");
      return;
    }

    // If device is occupied, block

const currentDeviceStatus = (deviceDetails?.status || "").toString().toLowerCase();
if (currentDeviceStatus !== "available") {
  alert(`Device is not available. Current status: ${currentDeviceStatus}`);
  return;
}

    // Determine payable amount (use discounted price if available)
    const payable = couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost;

    // Safety: ensure positive numeric
    const payableNum = Number(payable || 0);

if (payableNum === 0) {
  const fakeOrderId = `FREE_${Date.now()}`;

  localStorage.setItem("pendingPayment", JSON.stringify({
    deviceId,
    amountPaid: 0,
    amountSelected: originalSelectedAmount,
    discountApplied: originalSelectedAmount,
    chargingOption: selectedOption,
    energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
    couponCode: appliedCouponObj?.code || null,
    paymentGateway: "free"
  }));

  navigate(`/payment-success?order_id=${fakeOrderId}`);
  return;
}


    // Paid flow -> Cashfree
// Paid flow -> Cashfree
try {
  setPaymentError(null);

  console.log("Requesting to create Order." + "returning to url" + `${window.location.origin}/charging-options/${deviceId}`);

  const orderResp = await fetch(
    `${process.env.REACT_APP_Backend_API_Base_URL}/api/payment/order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        amount: payableNum,
        // BE will append orderId as param to this returnUrl
        returnUrl: `${window.location.origin}/charging-options/${deviceId}`,
        customer: {
          id: localStorage.getItem("userId") || "guest_user",
          email: "user@example.com",
          phone: "9999999999",
        },
        gateway: "Cashfree"
      }),
    }
  );

  console.log("Order Created at BE.");

  let orderData = null;
  let contentType = orderResp.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    orderData = await orderResp.json();
  } else {
    // Non‑JSON (e.g. HTML or blank) – generic handling
    const text = await orderResp.text();
    if (!orderResp.ok) {
      throw new Error("Something went wrong while creating the order. Please try again.");
    } else {
      throw new Error("Unexpected response from server.");
    }
  }

  if (!orderResp.ok) {
    // Backend error with JSON body
    const alertObj = orderData?.alert;
    const msgFromAlert = alertObj?.message;
    const msgFromBody = orderData?.message;

    if (msgFromAlert) {
      setPaymentError(msgFromAlert);
      alert(msgFromAlert);
    } else if (msgFromBody) {
      setPaymentError(msgFromBody);
      alert(msgFromBody);
    } else {
      setPaymentError("Failed to create order. Please try again.");
      alert("Failed to create order. Please try again.");
    }
    return;
  }

  // resp.ok === true
  // Expected: { paymentSessionId: "...", ... } or similar
  const paymentSessionId =
    orderData?.paymentSessionId ||
    orderData?.order?.payment_session_id;

  const orderId =
    orderData?.orderId ||
    orderData?.order?.order_id;

  if (!paymentSessionId || !orderId) {
    setPaymentError("Invalid response from payment server.");
    alert("Invalid response from payment server.");
    return;
  }

  // Store orderId & pending state locally
  localStorage.setItem("cashfreeOrderId", orderId);
// Around line with localStorage.setItem('pendingPayment'...
localStorage.setItem('pendingPayment', JSON.stringify({
  deviceId,
  amountPaid: payableNum,
  amountSelected: originalSelectedAmount,
  discountApplied: originalSelectedAmount - payableNum,
  chargingOption: selectedOption,
  energySelected: selectedOption === 'energy' ? sliderValue : estimatedEnergy,
  couponCode: appliedCouponObj?.code || null,
  paymentGateway: 'cashfree'
}));

  localStorage.setItem("deviceId", deviceId);

  if (typeof window.Cashfree === "undefined") {
    throw new Error("Cashfree SDK not loaded");
  }

  const cashfree = new window.Cashfree({ mode: "sandbox" }); // use "production" in prod

  cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_self", // Cashfree will redirect back via GET
  });
} catch (err) {
  console.error("Payment error:", err);
  const msg = err?.message || "Payment failed. Please try again.";
  setPaymentError(msg);
  alert(msg);
}

  };

  /* -------------------------
   *  Loading / error UI
   * ------------------------- */
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: "#0b0e13" }}>
        <CircularProgress size={70} sx={{ color: "#04BFBF" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: "#0b0e13" }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!deviceDetails) return null;
const deviceStatus = (deviceDetails.status || "").toString().toLowerCase();

  /* -------------------------
   *  UI render
   * ------------------------- */
  return (
    <Box
      sx={{
        minHeight: "95vh",
        padding: { xs: 2, sm: 4 },
        margin: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "linear-gradient(145deg, #0b0e13, #111a21)",
        boxShadow: "0 0 20px rgba(4, 191, 191, 0.3)",
      }}
    >
      {/* Device Info Card */}
      <Card
        sx={{
          mb: 5,
          width: { xs: "90%", sm: "80%" },
          background: "linear-gradient(to right, #1e2c3a, #243745)",
          borderRadius: "16px",
          padding: "14px",
          color: "#e1f5f5",
          boxShadow: "0 0 10px rgba(4, 191, 191, 0.2)",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Avatar variant="rounded" src="/device-image.png" alt="Device" sx={{ width: 90, height: 90 }} />

<Box sx={{ flex: 1 }}>
  <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>
    Charger ID{" "}
    <Typography
      component="span"
      variant="subtitle1"
      sx={{ color: "#ffffff", fontWeight: "bold", fontSize: "0.9rem", ml: 0.5 }}
    >
      {deviceDetails.device_id}
    </Typography>
  </Typography>

  <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>
    Location:{" "}
    <Typography
      component="span"
      variant="subtitle1"
      sx={{ color: "#ffffff", fontWeight: "bold", fontSize: "0.9rem", ml: 0.5 }}
    >
      {deviceDetails.location}
    </Typography>
  </Typography>



  <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>
    Rate:{" "}
    <Typography
      component="span"
      variant="subtitle1"
      sx={{ color: "#ffffff", fontWeight: "bold", fontSize: "0.9rem", ml: 0.5 }}
    >
      ₹{deviceDetails?.rate || 20}/kWh
    </Typography>
  </Typography>

    <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>
    Status:{" "}
    <Typography
      component="span"
      variant="subtitle1"
      sx={{ color: "#ffffff", fontWeight: "bold", fontSize: "0.9rem", ml: 0.5 }}
    >
      {deviceDetails.status || "Unknown"}
    </Typography>
  </Typography>


</Box>

      </Card>

      {/* Charging Options */}
      <Grid container spacing={2} justifyContent="center">
        {["energy", "amount"].map((option) => (
          <Grid item key={option}>
            <Card
              sx={{
                textAlign: "center",
                backgroundColor: selectedOption === option ? "#04BFBF" : "#1c2935",
                borderRadius: "14px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: selectedOption === option ? "0 0 12px #04BFBF" : "none",
                "&:hover": {
                  backgroundColor: "#243645",
                  boxShadow: "0 0 10px rgba(4, 191, 191, 0.4)",
                },
              }}
              onClick={() => handleOptionSelect(option)}
            >
              <CardContent>
                <Typography variant="body2" sx={{ color: selectedOption === option ? "#0b0e13" : "#7de0dd" }}>
                  {option === "energy" ? `Energy-Based ` : "Amount-Based"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Slider Section */}
      {selectedOption && (
        <Box
          mt={4}
          width={{ xs: "90%", sm: "80%" }}
          sx={{
            textAlign: "center",
            padding: "20px",
            borderRadius: "16px",
            background: "#121b22",
            boxShadow: "inset 0 0 10px rgba(4, 191, 191, 0.2)",
          }}
        >
          <Typography variant="body2" sx={{ color: "#e1f5f5", marginBottom: 2 }}>
            {selectedOption === "energy" ? "Select Energy (kWh)" : "Select Amount (₹)"}
          </Typography>
          <Slider
            value={sliderValue}
            onChange={handleSliderChange}
            min={selectedOption === "amount" ? 20 : 0}
            max={selectedOption === "amount" ? 500 : 50}
            step={selectedOption === "amount" ? 10 : 2}
            marks
            valueLabelDisplay="auto"
            sx={{
              color: "#04BFBF",
              "& .MuiSlider-thumb": {
                backgroundColor: "#7de0dd",
                boxShadow: "0 0 5px #04BFBF",
              },
              "& .MuiSlider-rail": {
                backgroundColor: "#2c4c57",
              },
              "& .MuiSlider-track": {
                backgroundColor: "#04BFBF",
              },
            }}
          />
          <Typography variant="caption" sx={{ color: "#9bcdd2" }}>
            {selectedOption === "energy" ? `Selected Energy: ${sliderValue} kWh` : `Selected Amount: ₹${sliderValue}`}
          </Typography>
          {selectedOption === "amount" && (
            <Typography variant="caption" sx={{ color: "#7de0dd", display: "block" }}>
              Estimated Energy: {estimatedEnergy.toFixed(2)} kWh
            </Typography>
          )}
          {selectedOption === "energy" && (
            <Typography variant="caption" sx={{ color: "#7de0dd", display: "block" }}>
              Estimated Cost: ₹{estimatedCost.toFixed(2)}
            </Typography>
          )}
        </Box>
      )}

      {/* Coupon input & Apply (styled to match) */}
      <Box mt={2} textAlign="center" width="100%" sx={{ px: { xs: 2, sm: 0 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <TextField
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            disabled={couponApplied || applyingCoupon}
            size="small"
            sx={{
              input: { color: "#e1f5f5" },
              background: "#243745",
              borderRadius: "8px",
              width: { xs: "60%", sm: "55%", md: "40%" },
            }}
          />
          <Button
            variant="contained"
            onClick={applyCoupon}
            disabled={!couponCode.trim() || couponApplied || applyingCoupon}
            sx={{
              backgroundColor: couponApplied ? "#6c757d" : "#F2A007",
              px: 3,
              py: 1,
              borderRadius: "12px",
            }}
          >
            {applyingCoupon ? "Applying..." : couponApplied ? "Applied" : "Apply"}
          </Button>
        </Box>

        {/* status / error messages */}
        <Box mt={1}>
            {couponErrorMsg && (
            <Alert severity="error" sx={{ mt: 2 }}>
                {couponErrorMsg}
            </Alert>
            )}
            {couponApplied && discountedPrice !== null && (
            <>
                <Alert severity="success" sx={{ mt: 2 }}>
                Coupon applied successfully!
                </Alert>
                <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                Final Payable Amount: ₹{discountedPrice.toFixed(2)}
                </Typography>
            </>
            )}
        </Box>
      </Box>

      {paymentError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {paymentError}
        </Alert>
      )}


      {/* Proceed to Payment */}
      <Box mt={4} textAlign="center" width="100%">
        <Button
          variant="contained"
          onClick={handleProceedToPayment}
          disabled={!selectedOption || sliderValue === 0 || (deviceDetails.status || "").toString().toLowerCase() === "occupied"}
          fullWidth={true}
          sx={{
            maxWidth: "300px",
            mx: "auto",
            padding: "12px 28px",
            fontSize: "0.9rem",
            borderRadius: "40px",
            backgroundColor: (deviceDetails.status || "").toString().toLowerCase() === "occupied" ? "#6c757d" : "#F2A007",
            color: "#fff",
            boxShadow: (deviceDetails.status || "").toString().toLowerCase() === "occupied" ? "none" : "0 0 12px rgba(242, 160, 7, 0.6)",
            "&:hover": {
              backgroundColor: (deviceDetails.status || "").toString().toLowerCase() === "occupied" ? "#6c757d" : "#f4af2d",
            },
          }}
        >
{(deviceDetails.status || "").toString().toLowerCase() === "occupied" ? "Device Occupied" : "Proceed to Payment"}

        </Button>
      </Box>

      <FooterNav />
    </Box>
  );
}

export default ChargingOptions;
