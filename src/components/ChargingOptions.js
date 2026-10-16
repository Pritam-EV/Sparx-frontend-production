import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import FooterNav from "../components/FooterNav";
import {
  Box,
  Typography,
  Card,
  Button,
  Slider,
  CircularProgress,
  Alert,
  Avatar,
  TextField,
  Collapse,
} from "@mui/material";

import EvStationRoundedIcon from "@mui/icons-material/EvStationRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

function shortId(len = 8) {
  const bytes = new Uint8Array(len);
  window.crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function ChargingOptions() {
  const { device_id } = useParams();
  const deviceId = device_id;
  const navigate = useNavigate();

  // device + UI states
  const [deviceDetails, setDeviceDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ETA for occupied device
  const [occupiedEta, setOccupiedEta] = useState(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaDisplay, setEtaDisplay] = useState(null);

  // option/slider
  const [selectedOption, setSelectedOption] = useState("amount");
  const [sliderValue, setSliderValue] = useState(100);

  // computed values
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedEnergy, setEstimatedEnergy] = useState(0);

  // coupon states
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [appliedCouponObj, setAppliedCouponObj] = useState(null);

  // derived, to carry forward original user selection
  const [originalSelectedAmount, setOriginalSelectedAmount] = useState(0);

  const [paymentError, setPaymentError] = useState(null);

  // Wallet
  const [walletBalance, setWalletBalance] = useState(0);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [walletPayLoading, setWalletPayLoading] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "error",
  });

  // LIMITS
  const minAmount = 20;
  const maxAmount = 1000;
  const amountStep = 10;

  const minEnergy = 1;
  const maxEnergy = 50;
  const energyStep = 0.5;

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null;

  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = "error") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ open: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 2800);
  };

  // Fetch wallet balance
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/wallet/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.balance === "number") setWalletBalance(d.balance);
      })
      .catch(() => {});
  }, []);

  // Fetch device details
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
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/devices/charging-options/${deviceId}`,
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

  // Fetch ETA when device is confirmed occupied
  useEffect(() => {
    if (!deviceDetails || deviceDetails.status?.toLowerCase() !== 'occupied') {
      setOccupiedEta(null);
      setEtaDisplay(null);
      return;
    }

    const fetchDeviceEta = async () => {
      setEtaLoading(true);
      try {
        const token = localStorage.getItem('token');
        const resp = await fetch(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/device-eta-summary/${deviceId}`,
          { headers: { Authorization: token ? `Bearer ${token}` : '' } }
        );
        if (!resp.ok) { setOccupiedEta(null); return; }
        const data = await resp.json();
        setOccupiedEta(data.estimatedEndTime || null);
      } catch (e) {
        console.error('ETA fetch error:', e);
        setOccupiedEta(null);
      } finally {
        setEtaLoading(false);
      }
    };

    fetchDeviceEta();
  }, [deviceDetails, deviceId]);

  // Live countdown from occupiedEta
  useEffect(() => {
    const compute = () => {
      if (!occupiedEta) { setEtaDisplay(null); return; }
      const eta = new Date(occupiedEta);
      const now = new Date();
      const diffMs = eta - now;

      const timeStr = eta.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
      });

      if (diffMs <= 0) {
        setEtaDisplay(prev => ({ ...prev, timeStr, remaining: 'Any moment', label: 'Finishing up' }));
        return;
      }
      const totalMins = Math.ceil(diffMs / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const remaining = h > 0 ? `${h}h ${m}m` : `${m} min`;
      setEtaDisplay(prev => ({ ...prev, timeStr, remaining, label: 'Available in' }));
    };

    compute();
    const t = setInterval(compute, 30_000);
    return () => clearInterval(t);
  }, [occupiedEta]);

  // Keep estimatedCost / energy in sync
  useEffect(() => {
    if (!deviceDetails) return;
    const rate = deviceDetails.rate || 20;

    if (selectedOption === "amount") {
      setEstimatedCost(sliderValue);
      setEstimatedEnergy(Number((sliderValue / rate).toFixed(2)));
      setOriginalSelectedAmount(sliderValue);
    } else {
      const computedCost = Number((sliderValue * rate).toFixed(2));
      setEstimatedCost(computedCost);
      setEstimatedEnergy(sliderValue);
      setOriginalSelectedAmount(computedCost);
    }

    if (couponApplied) {
      setCouponApplied(false);
      setAppliedCouponObj(null);
      setDiscountedPrice(null);
    }
  }, [sliderValue, selectedOption, deviceDetails]);

  // Show login/signup prompt if guest
  useEffect(() => {
    const isLoggedIn = !!token;
    if (isLoggedIn) {
      setShowLoginPrompt(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowLoginPrompt(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [token]);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setSliderValue(option === "amount" ? 100 : 10);
  };

  const handleSliderChange = (event, value) => {
    setSliderValue(value);
  };

  // Coupon validation
  async function applyCoupon() {
    if (couponApplied) return;
    setApplyingCoupon(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('You must be logged in to apply a coupon.', "error");
        setApplyingCoupon(false);
        return;
      }

      const resp = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/coupons/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: couponCode.trim(), deviceId, amount: originalSelectedAmount }),
      });

      const ct = resp.headers.get('content-type') || '';
      if (!resp.ok) {
        const text = await resp.text();
        if (ct.includes('html')) {
          throw new Error('Server returned HTML. Check API status.');
        }
        try {
          const jsonErr = JSON.parse(text);
          throw new Error(jsonErr.error || JSON.stringify(jsonErr));
        } catch (e) {
          throw new Error(text || 'Failed to apply coupon');
        }
      }

      const data = await resp.json();
      if (!data || typeof data.newAmount !== 'number') {
        throw new Error('Unexpected response');
      }

      setCouponApplied(true);
      setAppliedCouponObj({
        code: data.coupon.code,
      });
      setDiscountedPrice(data.newAmount);
      showToast(`Coupon applied! Payable: ₹${data.newAmount.toFixed(2)}`, "success");
      setApplyingCoupon(false);
    } catch (err) {
      console.error('applyCoupon error:', err);
      const errorMessage =
        err.message === "Invalid coupon code"
          ? "Invalid Coupon"
          : err.message || "Failed to apply coupon";

      showToast(errorMessage, "error");
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
    } catch (err) {
      console.error("Failed to consume coupon:", err);
    }
  }

  const handleProceedToPayment = () => {
    if (!selectedOption || sliderValue === 0) {
      showToast("Please select a charging option and value!", "error");
      return;
    }
    if (!deviceDetails) {
      showToast("Device details not ready. Try again.", "error");
      return;
    }
    const currentDeviceStatus = (deviceDetails?.status || "").toString().toLowerCase();
    if (currentDeviceStatus !== "available") {
      showToast(`Device is not available. Current status: ${currentDeviceStatus}`, "error");
      return;
    }
    setShowPaymentSheet(true);
  };

  const handlePayWithWallet = async () => {
    const payable = couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost;
    const payableNum = Number(payable || 0);

    if (walletBalance < payableNum) {
      const shortfall = payableNum - walletBalance;
      navigate(`/wallet/topup?need=${shortfall.toFixed(2)}`);
      return;
    }

    setWalletPayLoading(true);
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/wallet/pay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deviceId,
            amount: payableNum,
            chargingOption: selectedOption,
            energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
            couponCode: appliedCouponObj?.code || null,
          }),
        }
      );

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        showToast(data.message || "Wallet payment failed.", "error");
        setWalletPayLoading(false);
        return;
      }

      if (couponApplied) await consumeCoupon();

      localStorage.setItem(
        "pendingPayment",
        JSON.stringify({
          deviceId,
          amountPaid: payableNum,
          amountSelected: originalSelectedAmount,
          discountApplied: originalSelectedAmount - payableNum,
          chargingOption: selectedOption,
          energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
          couponCode: appliedCouponObj?.code || null,
          paymentGateway: "wallet",
        })
      );

      setShowPaymentSheet(false);
      navigate(`/payment-success?order_id=${data.orderId}`);
    } catch (err) {
      showToast(err.message || "Wallet payment failed.", "error");
    } finally {
      setWalletPayLoading(false);
    }
  };

  const handlePayWithCashfree = async () => {
    const payable = couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost;
    const payableNum = Number(payable || 0);

    if (payableNum === 0) {
      const fakeOrderId = shortId(10);
      localStorage.setItem(
        "pendingPayment",
        JSON.stringify({
          deviceId,
          amountPaid: 0,
          amountSelected: originalSelectedAmount,
          discountApplied: originalSelectedAmount,
          chargingOption: selectedOption,
          energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
          couponCode: appliedCouponObj?.code || null,
          paymentGateway: "free",
        })
      );
      setShowPaymentSheet(false);
      navigate(`/payment-success?order_id=${fakeOrderId}`);
      return;
    }

    try {
      setPaymentError(null);
      const orderResp = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/payment/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            deviceId,
            amount: payableNum,
            returnUrl: `${window.location.origin}/charging-options/${deviceId}`,
            gateway: "Cashfree",
          }),
        }
      );

      let orderData = null;
      const contentType = orderResp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        orderData = await orderResp.json();
      } else {
        throw new Error("Something went wrong while creating the order.");
      }

      if (!orderResp.ok) {
        const alertObj = orderData?.alert;
        const msg = alertObj?.message || orderData?.message || "Kindly login to continue.";
        setPaymentError(msg);
        showToast(msg, "error");
        return;
      }

        const paymentSessionId = orderData?.paymentSessionId;
        const orderId = orderData?.orderId;

      if (!paymentSessionId || !orderId) {
        showToast("Invalid response from payment server.", "error");
        return;
      }

      localStorage.setItem("cashfreeOrderId", orderId);
      localStorage.setItem(
        "pendingPayment",
        JSON.stringify({
          deviceId,
          amountPaid: payableNum,
          amountSelected: originalSelectedAmount,
          discountApplied: originalSelectedAmount - payableNum,
          chargingOption: selectedOption,
          energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
          couponCode: appliedCouponObj?.code || null,
          paymentGateway: "cashfree",
        })
      );
      localStorage.setItem("deviceId", deviceId);

      if (typeof window.Cashfree === "undefined") {
        throw new Error("Cashfree SDK not loaded");
      }

      const cashfree = new window.Cashfree({ mode: "production" });
      setShowPaymentSheet(false);
      cashfree.checkout({
        paymentSessionId,
        returnUrl: `${window.location.origin}/payment-success?order_id={order_id}`,
        redirectTarget: "_self",
      });
    } catch (err) {
      const msg = err?.message || "Payment failed. Please try again.";
      setPaymentError(msg);
      showToast(msg, "error");
    }
  };

  /* -------------------------
   *  Loading / Error UI
   * ------------------------- */
  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100dvh"
        sx={{ background: "#f3fbfc" }}
      >
        <CircularProgress size={50} sx={{ color: "#00d2b4", mb: 2 }} />
        <Typography sx={{ color: "#0e2e33", fontWeight: 700, fontSize: "15px" }}>
          Connecting to Charger…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100dvh"
        sx={{ background: "#f3fbfc", p: 3 }}
      >
        <Alert severity="error" sx={{ borderRadius: "16px", maxWidth: 420 }}>
          {error}
        </Alert>
        <Button
          onClick={() => navigate("/home")}
          sx={{
            mt: 2,
            background: "#00d2b4",
            color: "#fff",
            fontWeight: 700,
            borderRadius: "12px",
            textTransform: "none",
            "&:hover": { background: "#00a896" },
          }}
        >
          Return to Map
        </Button>
      </Box>
    );
  }

  if (!deviceDetails) return null;
  const deviceStatus = (deviceDetails.status || "").toString().toLowerCase();
  const isOccupied = deviceStatus === "occupied";
  const finalPayable = couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost;

  return (
    <>
      <AppHeader />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .co-screen {
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

        .co-shell {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px 16px calc(110px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* ── DEVICE SUMMARY CARD ── */
        .co-device-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 22px;
          box-shadow: 0 4px 18px rgba(0, 160, 145, 0.06);
          box-sizing: border-box;
        }

        .co-device-avatar {
          width: 68px;
          height: 68px;
          border-radius: 16px;
          background: #f1fcf9;
          border: 1px solid #c9ede7;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .co-device-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .co-device-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .co-device-id {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: #0e2e33;
          letter-spacing: -0.2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .co-status-pill {
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 750;
          text-transform: capitalize;
          flex-shrink: 0;
        }
        .co-status-pill.available {
          background: #dbfaf0;
          border: 1px solid #b8f2dd;
          color: #008764;
        }
        .co-status-pill.occupied {
          background: #fff3ed;
          border: 1px solid #ffd8c7;
          color: #ff521a;
        }

        .co-device-sub {
          font-size: 11.5px;
          color: #53757a;
          display: flex;
          align-items: center;
          gap: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .co-device-rate {
          font-size: 12px;
          font-weight: 700;
          color: #008f7f;
          margin-top: 2px;
        }

        /* ── OCCUPIED BANNER ── */
        .co-eta-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 14px;
          background: #fff8f3;
          border: 1px solid #ffe1cf;
        }

        .co-eta-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff8236;
          box-shadow: 0 0 6px #ff8236;
          animation: coPulse 1.8s infinite ease-in-out;
        }

        /* ── CHARGE BUILDER CARD ── */
        .co-builder-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 26px;
          box-shadow: 0 8px 28px rgba(0, 160, 145, 0.08);
          padding: 22px 18px 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .co-pill-switch {
          width: 100%;
          max-width: 320px;
          display: flex;
          background: #edf8f6;
          border-radius: 999px;
          padding: 4px;
          border: 1px solid #d4f2ec;
          margin-bottom: 20px;
        }

        .co-pill-btn {
          flex: 1;
          border: none;
          background: transparent;
          padding: 9px 0;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 750;
          color: #53757a;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .co-pill-btn.active {
          background: #ffffff;
          color: #00776b;
          box-shadow: 0 3px 12px rgba(0, 160, 140, 0.14);
        }

        .co-val-heading {
          font-size: 11px;
          font-weight: 800;
          color: #799ea4;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .co-main-val {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(38px, 11vw, 48px);
          font-weight: 800;
          color: #ff8236;
          line-height: 1.1;
          margin: 4px 0 2px;
          letter-spacing: -1px;
        }

        .co-equiv-val {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          background: #f1fcf9;
          border: 1px solid #d2f0eb;
          color: #00776b;
          font-size: 12px;
          font-weight: 750;
          margin-bottom: 18px;
        }

        /* ── PRESETS CHIPS ── */
        .co-presets-wrap {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          width: 100%;
          margin-top: 14px;
        }

        .co-preset-chip {
          padding: 7px 14px;
          border-radius: 12px;
          background: #f6fbfb;
          border: 1px solid #d8ede9;
          color: #53757a;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .co-preset-chip:hover {
          background: #edfbf8;
          border-color: #00d2b4;
          color: #00776b;
        }
        .co-preset-chip.active {
          background: #e4faf6;
          border-color: #00d2b4;
          color: #00776b;
          box-shadow: 0 2px 8px rgba(0, 210, 180, 0.2);
        }

        /* ── COUPON SECTION ── */
        .co-coupon-shell {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 4px 16px rgba(0, 160, 145, 0.05);
          box-sizing: border-box;
        }

        .co-coupon-toggle {
          background: transparent;
          border: none;
          color: #008f7f;
          font-size: 13px;
          font-weight: 750;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 0;
        }

        .co-coupon-applied-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #dbfaf0;
          border: 1px solid #b8f2dd;
          border-radius: 14px;
          color: #008764;
          font-size: 12.5px;
          font-weight: 750;
        }

        /* ── PROCEED ACTION ── */
        .co-btn-proceed {
          width: 100%;
          min-height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          color: #ffffff;
          border: none;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.2px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(255, 82, 26, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.16s ease;
        }
        .co-btn-proceed:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(255, 82, 26, 0.45);
        }
        .co-btn-proceed:active:not(:disabled) {
          transform: scale(0.985);
        }
        .co-btn-proceed:disabled {
          background: #cad4d6;
          color: #8c9fa3;
          box-shadow: none;
          cursor: not-allowed;
        }

        /* ── PAYMENT SHEET OVERLAY ── */
        .co-sheet-overlay {
          position: fixed;
          inset: 0;
          z-index: 9000;
          background: rgba(6, 38, 43, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          padding: 20px;
          justify-content: center;
          animation: coFade 0.2s ease;
        }

        .co-sheet {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          border-top: 1px solid #d4f0ec;
          border-radius: 28px 28px 0 0;
          box-shadow: 0 -12px 40px rgba(0, 60, 66, 0.18);
          padding: 24px 20px calc(24px + env(safe-area-inset-bottom, 0px));
          box-sizing: border-box;
          animation: coSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .co-sheet-handle {
          width: 40px;
          height: 4px;
          border-radius: 999px;
          background: #d4e8e5;
          margin: 0 auto 16px;
        }

        .co-method-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-radius: 18px;
          border: 1.5px solid transparent;
          cursor: pointer;
          margin-bottom: 12px;
          transition: all 0.16s ease;
        }
        .co-method-tile.wallet-ok {
          background: linear-gradient(135deg, #f0fbf9 0%, #ffffff 100%);
          border-color: #bceee5;
        }
        .co-method-tile.wallet-low {
          background: #fff8f8;
          border-color: #ffd8d8;
        }
        .co-method-tile.gateway {
          background: #fffdf9;
          border-color: #ffe8d6;
        }
        .co-method-tile:active {
          transform: scale(0.985);
        }

        /* ── GUEST LOGIN PROMPT MODAL ── */
          .co-guest-modal {
          width: 100%;
          max-width: 360px;
          padding: 24px 20px 20px;
          text-align: center;
          position: relative;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 26px;
          box-shadow: 0 20px 60px rgba(0, 60, 66, 0.18);
          animation: coScaleCenter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes coScaleCenter {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .co-guest-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1fcf9;
          border: 1px solid #d4f2ec;
          color: #53757a;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.15s ease;
        }
        .co-guest-close:hover {
          background: #e2f7f3;
          color: #0e2e33;
        }

        .co-guest-icon-box {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          background: linear-gradient(135deg, #fff3e6 0%, #ffe3c4 100%);
          border: 1px solid #ffd4a8;
          color: #ff8236;
          display: grid;
          place-items: center;
          margin: 0 auto 14px;
          box-shadow: 0 8px 22px rgba(255, 130, 54, 0.22);
        }

        .co-guest-title {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #0e2e33;
          letter-spacing: -0.2px;
          margin: 0 0 6px;
        }

        .co-guest-desc {
          font-size: 12.5px;
          color: #53757a;
          line-height: 1.5;
          margin: 0 auto 18px;
          max-width: 280px;
        }

        .co-guest-perks {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
          text-align: left;
        }

        .co-guest-perk-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          background: #f7fdfc;
          border: 1px solid #e1f5f2;
          font-size: 12px;
          font-weight: 700;
          color: #00776b;
        }

        .co-btn-guest-login {
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          color: #ffffff;
          border: none;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(255, 82, 26, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.16s ease;
        }
        .co-btn-guest-login:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 82, 26, 0.45);
        }
        .co-btn-guest-login:active {
          transform: scale(0.985);
        }


        @keyframes coPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.9); }
        }
        @keyframes coFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes coSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <div className="co-screen">
        <div className="co-shell">

          {/* ── DEVICE SUMMARY CARD ── */}
          <div className="co-device-card">
            <div className="co-device-avatar">
              <EvStationRoundedIcon sx={{ fontSize: 34, color: "#00776b" }} />
            </div>

            <div className="co-device-info">
              <div className="co-device-title-row">
                <span className="co-device-id">{deviceDetails.device_id}</span>
                <span className={`co-status-pill ${isOccupied ? "occupied" : "available"}`}>
                  {deviceDetails.status || "Unknown"}
                </span>
              </div>

              <div className="co-device-sub">
                <LocationOnOutlinedIcon sx={{ fontSize: 14, color: "#799ea4" }} />
                <span>{deviceDetails.location || "Location unavailable"}</span>
              </div>

              <div className="co-device-rate">
                ₹{deviceDetails?.rate || 20} / kWh
              </div>
            </div>
          </div>

          {/* ── OCCUPIED COUNTDOWN BANNER (CONDITIONAL) ── */}
          {isOccupied && (
            <div className="co-eta-banner">
              <div className="co-eta-dot" />
              <Typography sx={{ fontSize: "12px", color: "#53757a", fontWeight: 600 }}>
                Est. Available:
              </Typography>
              <Typography sx={{ fontSize: "12.5px", color: "#ff8236", fontWeight: 750 }}>
                {etaLoading
                  ? "Checking…"
                  : etaDisplay?.timeStr
                  ? `${etaDisplay.timeStr} (${etaDisplay.remaining})`
                  : "Unavailable"}
              </Typography>
            </div>
          )}

          {/* ── SMART CHARGE BUILDER ── */}
          <div className="co-builder-card">
            {/* Pill Switch */}
            <div className="co-pill-switch">
              <button
                type="button"
                className={`co-pill-btn ${selectedOption === "amount" ? "active" : ""}`}
                onClick={() => handleOptionSelect("amount")}
              >
                By Amount (₹)
              </button>
              <button
                type="button"
                className={`co-pill-btn ${selectedOption === "energy" ? "active" : ""}`}
                onClick={() => handleOptionSelect("energy")}
              >
                By Energy (kWh)
              </button>
            </div>

            <span className="co-val-heading">
              {selectedOption === "amount" ? "Select Amount" : "Select Energy"}
            </span>

            <div className="co-main-val">
              {selectedOption === "amount" ? `₹${sliderValue}` : `${sliderValue} kWh`}
            </div>

            <div className="co-equiv-val">
              {selectedOption === "amount" ? (
                <>
                  <BoltRoundedIcon sx={{ fontSize: 16, color: "#00d2b4" }} />
                  <span>≈ {estimatedEnergy} kWh delivered</span>
                </>
              ) : (
                <>
                  <CurrencyRupeeRoundedIcon sx={{ fontSize: 15, color: "#ff8236" }} />
                  <span>≈ ₹{estimatedCost} estimated</span>
                </>
              )}
            </div>

            {/* Slider */}
            <Slider
              value={sliderValue}
              onChange={handleSliderChange}
              min={selectedOption === "amount" ? minAmount : minEnergy}
              max={selectedOption === "amount" ? maxAmount : maxEnergy}
              step={selectedOption === "amount" ? amountStep : energyStep}
              sx={{
                width: "92%",
                color: "#00d2b4",
                height: 7,
                "& .MuiSlider-thumb": {
                  width: 24,
                  height: 24,
                  backgroundColor: "#ffffff",
                  border: "3px solid #00d2b4",
                  boxShadow: "0 3px 10px rgba(0, 210, 180, 0.35)",
                  "&:hover, &.Mui-focusVisible": {
                    boxShadow: "0 0 0 8px rgba(0, 210, 180, 0.16)",
                  },
                },
                "& .MuiSlider-track": {
                  border: "none",
                  background: "linear-gradient(90deg, #00d2b4, #00b4c5)",
                },
                "& .MuiSlider-rail": {
                  opacity: 1,
                  backgroundColor: "#e2f4f1",
                },
              }}
            />

            {/* Presets */}
            <div className="co-presets-wrap">
              {(selectedOption === "amount"
                ? [50, 100, 200, 500]
                : [5, 10, 20, 50]
              ).map((val) => (
                <button
                  type="button"
                  key={val}
                  className={`co-preset-chip ${sliderValue === val ? "active" : ""}`}
                  onClick={() => setSliderValue(val)}
                >
                  {selectedOption === "amount" ? `₹${val}` : `${val} kWh`}
                </button>
              ))}
            </div>
          </div>

          {/* ── PROACTIVE COUPON CARD ── */}
          <div className="co-coupon-shell">
            {couponApplied ? (
              <div className="co-coupon-applied-chip">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
                  <span>
                    Coupon <strong>{appliedCouponObj?.code}</strong> Applied!
                  </span>
                </Box>
                <span>Payable: ₹{discountedPrice?.toFixed(2)}</span>
              </div>
            ) : !showCouponInput ? (
              <button
                type="button"
                className="co-coupon-toggle"
                onClick={() => setShowCouponInput(true)}
              >
                <LocalOfferOutlinedIcon sx={{ fontSize: 16 }} />
                <span>I have a coupon code</span>
              </button>
            ) : (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#00776b" }}>
                    Apply Coupon
                  </Typography>
                  <Button
                    onClick={() => setShowCouponInput(false)}
                    sx={{ minWidth: "auto", p: 0, color: "#799ea4", fontSize: "11px", textTransform: "none" }}
                  >
                    Hide
                  </Button>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={applyingCoupon}
                    size="small"
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        background: "#f4fbfb",
                        fontSize: "13px",
                        fontWeight: 700,
                        height: 44,
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#d4f0ec",
                      },
                      "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#00d2b4",
                      },
                      "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#00d2b4",
                      },
                    }}
                  />

                  <Button
                    variant="contained"
                    onClick={applyCoupon}
                    disabled={!couponCode.trim() || applyingCoupon}
                    sx={{
                      minWidth: 94,
                      height: 44,
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #00d2b4 0%, #009e8f 100%)",
                      color: "#ffffff",
                      fontWeight: 750,
                      textTransform: "none",
                      boxShadow: "0 3px 12px rgba(0, 190, 165, 0.28)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #00e0c0 0%, #00ab9c 100%)",
                      },
                    }}
                  >
                    {applyingCoupon ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Apply"}
                  </Button>
                </Box>
              </Box>
            )}
          </div>

          {/* ── PROCEED BUTTON ── */}
          <button
            type="button"
            className="co-btn-proceed"
            disabled={!selectedOption || sliderValue === 0 || isOccupied}
            onClick={handleProceedToPayment}
          >
            <span>
              {isOccupied ? "Device Occupied" : `Pay ₹${finalPayable.toFixed(2)} & Start`}
            </span>
            {!isOccupied && <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />}
          </button>

        </div>
      </div>

      {/* ── FLOATING TOAST ALERT ── */}
      {toast.open && (
        <Box
          sx={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            width: "calc(100% - 32px)",
            maxWidth: 420,
            animation: "coFade 0.25s ease",
          }}
        >
          <Box
            sx={{
              px: 2.2,
              py: 1.4,
              borderRadius: "16px",
              background:
                toast.type === "success"
                  ? "rgba(0, 168, 120, 0.94)"
                  : "rgba(224, 60, 49, 0.94)",
              color: "#ffffff",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              textAlign: "center",
              boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>
              {toast.message}
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── PAYMENT METHOD BOTTOM SHEET ── */}
      {showPaymentSheet && (
        <div className="co-sheet-overlay" onClick={() => !walletPayLoading && setShowPaymentSheet(false)}>
          <div className="co-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="co-sheet-handle" />

            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 750,
                fontSize: "18px",
                textAlign: "center",
                color: "#0e2e33",
              }}
            >
              Select Payment Method
            </Typography>

            <Typography
              sx={{
                color: "#53757a",
                fontSize: "12.5px",
                textAlign: "center",
                mb: 2.5,
                mt: 0.4,
              }}
            >
              Total Payable: <strong style={{ color: "#ff8236" }}>₹{finalPayable.toFixed(2)}</strong>
            </Typography>

            {/* Wallet Option */}
            <div
              className={`co-method-tile ${walletBalance >= finalPayable ? "wallet-ok" : "wallet-low"}`}
              onClick={!walletPayLoading ? handlePayWithWallet : undefined}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    background: walletBalance >= finalPayable ? "#dcfaf5" : "#ffe8e8",
                    display: "grid",
                    placeItems: "center",
                    color: walletBalance >= finalPayable ? "#008f7f" : "#d93b3b",
                  }}
                >
                  <AccountBalanceWalletRoundedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 750, fontSize: "14px", color: "#0e2e33" }}>
                    VIZ Wallet
                  </Typography>
                  {walletBalance < finalPayable ? (
                    <Typography sx={{ color: "#d93b3b", fontSize: "11px", fontWeight: 600 }}>
                      Low balance — Tap to Top Up ₹{(finalPayable - walletBalance).toFixed(2)}
                    </Typography>
                  ) : (
                    <Typography sx={{ color: "#008764", fontSize: "11px", fontWeight: 600 }}>
                      Instant 1-tap checkout
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ textAlign: "right" }}>
                <Typography
                  sx={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 800,
                    fontSize: "15px",
                    color: walletBalance >= finalPayable ? "#008f7f" : "#d93b3b",
                  }}
                >
                  ₹{walletBalance.toFixed(2)}
                </Typography>
                <Typography sx={{ color: "#799ea4", fontSize: "10.5px" }}>Available</Typography>
              </Box>
            </div>

            {/* UPI / Cards Gateway Option */}
            <div
              className="co-method-tile gateway"
              onClick={!walletPayLoading ? handlePayWithCashfree : undefined}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    background: "#fff1e6",
                    display: "grid",
                    placeItems: "center",
                    color: "#ff8236",
                  }}
                >
                  <CreditCardRoundedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 750, fontSize: "14px", color: "#0e2e33" }}>
                    UPI / Credit / Debit Card
                  </Typography>
                  <Typography sx={{ color: "#53757a", fontSize: "11px" }}>
                    Google Pay, PhonePe, Cards, NetBanking
                  </Typography>
                </Box>
              </Box>

              <ArrowForwardRoundedIcon sx={{ color: "#ff8236", fontSize: 18 }} />
            </div>

            {walletPayLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5, my: 1 }}>
                <CircularProgress size={20} sx={{ color: "#00d2b4" }} />
                <Typography sx={{ color: "#00776b", fontSize: "13px", fontWeight: 600 }}>
                  Authorizing wallet payment…
                </Typography>
              </Box>
            )}

            <Button
              fullWidth
              onClick={() => !walletPayLoading && setShowPaymentSheet(false)}
              sx={{
                mt: 1,
                color: "#53757a",
                fontWeight: 700,
                fontSize: "13px",
                textTransform: "none",
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

{/* ── GUEST LOGIN PROMPT ── */}
      {showLoginPrompt && !token && (
        <div className="co-sheet-overlay" onClick={() => setShowLoginPrompt(false)}>
          <div className="co-guest-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="co-guest-close"
              onClick={() => setShowLoginPrompt(false)}
              aria-label="Dismiss login modal"
            >
              ✕
            </button>

            <div className="co-guest-icon-box">
              <EvStationRoundedIcon sx={{ fontSize: 30 }} />
            </div>

            <h3 className="co-guest-title">Ready to start charging?</h3>
            <p className="co-guest-desc">
              Sign in to unlock exclusive cashback rewards, wallet top-ups, and live session telemetry.
            </p>

            <div className="co-guest-perks">
              <div className="co-guest-perk-item">
                <span>⚡</span>
                <span>Real-time charging progress tracking</span>
              </div>
              <div className="co-guest-perk-item">
                <span>💰</span>
                <span>Instant refunds on unutilized energy</span>
              </div>
            </div>

            <button
              type="button"
              className="co-btn-guest-login"
              onClick={() => navigate("/login")}
            >
              <span>Login / Sign Up</span>
              <ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />
            </button>
          </div>
        </div>
      )}

      <FooterNav />
    </>
  );
}

export default ChargingOptions;