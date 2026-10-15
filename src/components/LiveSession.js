import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import AppHeader from "../components/AppHeader";
import FooterNav from "../components/FooterNav";
import "../styles/appStyles.css";

export default function LiveSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [energySelected, setEnergySelected] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  const [pausedReason, setPausedReason] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showPausePopup, setShowPausePopup] = useState(false);

  const rawState = location.state || {};
  const locationState = rawState;
  const { sessionId: paramSessionId } = useParams();
  const sessionId =
    paramSessionId || rawState.sessionId || rawState._id || rawState.id || null;
  const deviceIdRaw =
    rawState.deviceId || rawState.device_id || rawState.chargerId || null;
  const energySelectedRaw =
    rawState.energySelected ?? rawState.energy_selected ?? rawState.energy ?? 0;
  const amountPaidRaw =
    rawState.amountPaid ?? rawState.amount_paid ?? rawState.amount ?? 0;
  const transactionId =
    rawState.transactionId || rawState.transaction_id || rawState.txn || null;
  const startDate =
    rawState.startDate || rawState.start_date || rawState.start || '';
  const startTime =
    rawState.startTime || rawState.start_time || rawState.startedAt || '';
  const deviceIdToUse = sessionData?.deviceId || sessionId;
  const deviceId = deviceIdRaw;

  useEffect(() => {
    if (energySelectedRaw) setEnergySelected(Number(energySelectedRaw));
    if (amountPaidRaw) setAmountPaid(Number(amountPaidRaw));
  }, []);

  const numericAmount = Number(amountPaidRaw);
  const displayAmount = Number.isFinite(numericAmount)
    ? numericAmount.toFixed(2)
    : '0.00';
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const deviceIdToShow =
    deviceId || sessionData?.deviceId || sessionData?.device_id || null;

  const [deviceDetails, setDeviceDetails] = useState(null);
  const [power, setPower] = useState(0);
  const [current, setCurrent] = useState(0);
  const [voltage, setVoltage] = useState(0);
  const [relayState, setRelayState] = useState('OFF');
  const [energyConsumed, setEnergyConsumed] = useState(0);
  const [estimatedEndTime, setEstimatedEndTime] = useState(null);
  const [etaDisplay, setEtaDisplay] = useState({ timeStr: null, remaining: null });

  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const lastSessionIdRef = useRef(null);
  const pauseInitializedRef = useRef(false);
  const pauseEndTimeRef = useRef(null);
  const popupDismissedAtRef = useRef(null);
  const pauseTimeoutCalledRef = useRef(false);
  const deviceIdFromState =
    locationState.deviceId || sessionData?.deviceId || sessionData?.device_id || null;

  const energySelectedNum = Number(energySelected) || 0;
  const energyConsumedSafe = Number(energyConsumed) || 0;

  const usagePercent =
    energySelectedNum > 0
      ? clamp((energyConsumedSafe / energySelectedNum) * 100, 0, 100)
      : 0;

  const isFull = usagePercent >= 100;
  const frac =
    energySelectedNum > 0
      ? clamp(energyConsumedSafe / energySelectedNum, 0, 1)
      : 0;
  const amountUtilized = (frac * (Number(amountPaid) || 0)).toFixed(1);
  const isCharging = relayState === 'ON';

  const frozenUsageRef = useRef(0);
  useEffect(() => {
    if (!isCharging) {
      frozenUsageRef.current = usagePercent;
    }
  }, [isCharging, usagePercent]);

  const displayPercent = isCharging ? usagePercent : frozenUsageRef.current;

  const [showStopConfirmPopup, setShowStopConfirmPopup] = useState(false);
  const [stopSliderSuccess, setStopSliderSuccess] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderTrackRef = useRef(null);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const SLIDER_WIDTH = 280;
  const KNOB_SIZE = 52;
  const MAX_DRAG = SLIDER_WIDTH - KNOB_SIZE - 6;

  const resetSlider = () => {
    setDragX(0);
    setIsDragging(false);
    setStopSliderSuccess(false);
  };

  const closeStopPopup = () => {
    resetSlider();
    setShowStopConfirmPopup(false);
  };

  const startDrag = (clientX) => {
    if (stopSliderSuccess) return;
    setIsDragging(true);
    dragStartXRef.current = clientX;
    dragStartOffsetRef.current = dragX;
  };

  const onDragMove = (clientX) => {
    if (!isDragging || stopSliderSuccess) return;
    const delta = clientX - dragStartXRef.current;
    const next = Math.max(0, Math.min(MAX_DRAG, dragStartOffsetRef.current + delta));
    setDragX(next);
  };

  const endDrag = async () => {
    if (!isDragging || stopSliderSuccess) return;
    setIsDragging(false);

    if (dragX >= MAX_DRAG * 0.88) {
      setDragX(MAX_DRAG);
      setStopSliderSuccess(true);

      setTimeout(async () => {
        setShowStopConfirmPopup(false);
        resetSlider();
        await handleStop();
      }, 420);
    } else {
      setDragX(0);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => onDragMove(e.clientX);
    const handleMouseUp = () => endDrag();
    const handleTouchMove = (e) => {
      if (e.touches?.[0]) onDragMove(e.touches[0].clientX);
    };
    const handleTouchEnd = () => endDrag();

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragX]);

  useEffect(() => {
    if (isFull && isCharging) {
      const lastId = lastSessionIdRef.current;
      if (lastId) {
        lastSessionIdRef.current = null;
        navigate('/session-summary', { state: { sessionId: lastId } });
      }
    }
  }, [isFull, isCharging]);

  const relayRef = useRef(relayState);
  useEffect(() => {
    relayRef.current = relayState;
  }, [relayState]);

  const savePauseEndTime = (endTimeMs) => {
    if (sessionId) {
      localStorage.setItem(`pause_${sessionId}`, endTimeMs.toString());
    }
  };

  const loadPauseEndTime = () => {
    if (sessionId) {
      const stored = localStorage.getItem(`pause_${sessionId}`);
      if (stored) {
        return parseInt(stored, 10);
      }
    }
    return null;
  };

  const clearPauseEndTime = () => {
    if (sessionId) {
      localStorage.removeItem(`pause_${sessionId}`);
    }
  };

  useEffect(() => {
    const storedEndTime = loadPauseEndTime();
    if (storedEndTime) {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.ceil((storedEndTime - now) / 1000));

      if (secondsLeft > 0) {
        pauseEndTimeRef.current = storedEndTime;
        pauseInitializedRef.current = true;
        setShowPausePopup(true);
        setPausedReason('button');
        setTimeLeft(secondsLeft);
      } else {
        clearPauseEndTime();
      }
    }
  }, []);

  const stopSessionAndRedirect = async (triggerType, finalEnergy) => {
    const sid = lastSessionIdRef.current || sessionData?.sessionId;
    if (!sid) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/stop`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId: sid,
            deviceId: deviceId || deviceIdFromState,
            endTime: new Date().toISOString(),
            endTrigger: triggerType,
            ...(finalEnergy !== undefined && { deltaEnergy: finalEnergy }),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      clearPauseEndTime();
      lastSessionIdRef.current = null;
      navigate('/session-summary', { state: { sessionId: sid } });
    } catch (err) {
      console.error('[STOP] Stop API failed:', err);
      alert('Failed to stop session. Please try again.');
    }
  };

  useEffect(() => {
    const computeEta = () => {
      if (!estimatedEndTime) {
        setEtaDisplay({ timeStr: null, remaining: null });
        return;
      }
      const eta = new Date(estimatedEndTime);
      const now = new Date();
      const diffMs = eta.getTime() - now.getTime();

      const timeStr = eta.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });

      if (diffMs <= 0) {
        setEtaDisplay({ timeStr, remaining: 'Any moment' });
        return;
      }

      const totalMins = Math.ceil(diffMs / 60000);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const remaining = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;

      setEtaDisplay({ timeStr, remaining });
    };

    computeEta();
    const ticker = setInterval(computeEta, 30_000);
    return () => clearInterval(ticker);
  }, [estimatedEndTime]);

  const fetchActiveSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/active`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 404) {
        const sid = lastSessionIdRef.current;
        lastSessionIdRef.current = null;
        clearPauseEndTime();

        if (sid) {
          navigate('/session-summary', { state: { sessionId: sid } });
        }
        return;
      }

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
        return;
      }

      const data = await res.json();
      const deviceStatus = data.status?.toString().toLowerCase();
      const normalizedRelay =
        data.relayState?.toUpperCase() === 'ON' ? 'ON' : 'OFF';

      setVoltage(Number(data.voltage) || 0);
      setCurrent(Number(data.current) || 0);
      setEnergyConsumed(Number(data.energyConsumed) || 0);
      setRelayState(normalizedRelay);
      if (data.estimatedEndTime) setEstimatedEndTime(data.estimatedEndTime);
      if (data.sessionId) lastSessionIdRef.current = data.sessionId;

      if (typeof data.energySelected === 'number')
        setEnergySelected(data.energySelected);
      if (typeof data.amountPaid === 'number') setAmountPaid(data.amountPaid);

      if (deviceStatus === 'paused') {
        if (!pauseInitializedRef.current) {
          pauseInitializedRef.current = true;
          setShowPausePopup(true);
          setPausedReason('button');

          let endTime = pauseEndTimeRef.current || loadPauseEndTime();
          if (!endTime) {
            const now = Date.now();
            endTime = now + 5 * 60 * 1000;
            pauseEndTimeRef.current = endTime;
            savePauseEndTime(endTime);
          } else {
            pauseEndTimeRef.current = endTime;
          }

          const now = Date.now();
          const initialSecondsLeft = Math.max(
            0,
            Math.ceil((endTime - now) / 1000)
          );
          setTimeLeft(initialSecondsLeft);
        }
        return;
      }

      if (deviceStatus === 'occupied') {
        if (showPausePopup || pauseInitializedRef.current) {
          setShowPausePopup(false);
          setPausedReason(null);
          setTimeLeft(0);

          pauseInitializedRef.current = false;
          pauseEndTimeRef.current = null;
          popupDismissedAtRef.current = null;
          pauseTimeoutCalledRef.current = false;
          clearPauseEndTime();
        }
      }
    } catch (err) {
      console.error('Unexpected error while fetching active session:', err);
    }
  };

  useEffect(() => {
    fetchActiveSession();
    const intervalRef = setInterval(fetchActiveSession, 5000);
    return () => clearInterval(intervalRef);
  }, []);

  useEffect(() => {
    const deviceIdToUse = sessionData?.deviceId || sessionId;
    if (!deviceIdToUse) return;
    const fetchDeviceDetails = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const idToFetch = deviceId || deviceIdFromState;
        if (!idToFetch) return;

        const response = await fetch(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/devices/public/${idToFetch}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch device details.");
        const data = await response.json();
        setDeviceDetails(data);
      } catch (err) {
        setError("Could not fetch device details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDeviceDetails();
  }, [deviceIdToUse]);

  useEffect(() => {
    if (!sessionId) return;
    const fetchSessionById = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/${sessionId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch session data.");
        const data = await res.json();
        setSessionData(data);
        setVoltage(Number(data.voltage) || 0);
        setCurrent(Number(data.current) || 0);
        setEnergyConsumed(Number(data.energyConsumed) || 0);
        setRelayState(
          (data.relayState || data.relay || '').toString().toUpperCase() === 'ON'
            ? 'ON'
            : 'OFF'
        );
        lastSessionIdRef.current = data.sessionId || sessionId;
      } catch (err) {
        setError("Failed to load session data.");
        console.error(err);
      }
    };

    fetchSessionById();
  }, [sessionId]);

  const handleStop = async () => {
    await stopSessionAndRedirect('manual');
  };

  useEffect(() => {
    if (
      pausedReason === 'button' &&
      showPausePopup &&
      pauseEndTimeRef.current &&
      !timerRef.current
    ) {
      timerRef.current = setInterval(async () => {
        const now = Date.now();
        const endTime = pauseEndTimeRef.current;

        if (!endTime) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }

        const secondsLeft = Math.max(0, Math.ceil((endTime - now) / 1000));

        if (secondsLeft <= 0) {
          setTimeLeft(0);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          if (!pauseTimeoutCalledRef.current) {
            pauseTimeoutCalledRef.current = true;
            await stopSessionAndRedirect('pause_timeout');
          }
          return;
        }

        setTimeLeft(secondsLeft);
      }, 1000);
    }

    if (pausedReason !== 'button' || !showPausePopup) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showPausePopup, pausedReason, deviceId, deviceIdFromState, navigate, sessionData]);

  const handleDismissPopup = () => {
    setShowPausePopup(false);
    popupDismissedAtRef.current = Date.now();
  };

  useEffect(() => {
    if (
      pausedReason === 'button' &&
      !showPausePopup &&
      pauseInitializedRef.current
    ) {
      const dismissedAt = popupDismissedAtRef.current;
      if (!dismissedAt) return;

      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - dismissedAt;
        if (elapsed >= 5000) {
          setShowPausePopup(true);
          popupDismissedAtRef.current = null;
          clearInterval(checkInterval);
        }
      }, 1000);

      return () => clearInterval(checkInterval);
    }
  }, [pausedReason, showPausePopup, pauseInitializedRef.current]);

  // Radius 88, circumference = 2 * PI * 88 ~= 552.92
  const CIRCLE_CIRCUMFERENCE = 552.92;
  const strokeOffset = CIRCLE_CIRCUMFERENCE - (usagePercent / 100) * CIRCLE_CIRCUMFERENCE;

  return (
    <>
      {/* ── TOP HEADER ── */}
      <AppHeader />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .ls-screen {
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

        .ls-shell {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px 16px calc(100px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* ── DEVICE CONNECTED CARD ── */
        .ls-device-card {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px;
          background: linear-gradient(135deg, #ffffff 30%, #f1fcf9 100%);
          border: 1px solid #d4f0ec;
          border-radius: 22px;
          box-shadow: 0 4px 18px rgba(0, 160, 145, 0.07);
          box-sizing: border-box;
        }

        .ls-device-left {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ls-device-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #dbfaf0;
          border: 1px solid #b8f2dd;
          color: #008764;
          font-size: 11px;
          font-weight: 750;
          width: fit-content;
        }

        .ls-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #00c98d;
          box-shadow: 0 0 0 3px rgba(0, 201, 141, 0.2);
          animation: lsPulse 1.8s ease-in-out infinite;
        }

        .ls-device-id {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 800;
          color: #00776b;
          letter-spacing: -0.2px;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ls-device-location {
          font-size: 12px;
          color: #53757a;
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ls-device-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }

        .ls-btn-info {
          padding: 8px 14px;
          border-radius: 12px;
          background: #edfbf8;
          border: 1px solid #d3f2ec;
          color: #00776b;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.16s ease;
          text-align: center;
        }
        .ls-btn-info:hover {
          background: #dbf7f1;
        }

        .ls-btn-stop {
          padding: 8px 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          border: none;
          color: #ffffff;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(255, 82, 26, 0.30);
          transition: all 0.16s ease;
          text-align: center;
        }
        .ls-btn-stop:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(255, 82, 26, 0.40);
        }

        /* ── HERO CHARGING GAUGE CARD ── */
        .ls-hero-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 26px;
          box-shadow: 0 8px 28px rgba(0, 160, 145, 0.08);
          padding: 22px 18px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          box-sizing: border-box;
        }

        .ls-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 750;
          margin-bottom: 12px;
        }
        .ls-status-pill.on {
          color: #008764;
          background: #dbfaf0;
          border: 1px solid #b8f2dd;
        }
        .ls-status-pill.off {
          color: #d93b3b;
          background: #fdeeee;
          border: 1px solid #f9cccc;
        }

        .ls-gauge-wrap {
          position: relative;
          width: min(220px, 64vw);
          height: min(220px, 64vw);
          margin: 6px auto 14px;
          display: grid;
          place-items: center;
        }

        .ls-gauge-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .ls-gauge-bg {
          fill: none;
          stroke: #e6f6f4;
          stroke-width: 14;
        }

        .ls-gauge-fill {
          fill: none;
          stroke: url(#lsAquaGradient);
          stroke-width: 14;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          filter: drop-shadow(0 0 8px rgba(0, 210, 180, 0.4));
        }

        .ls-gauge-aura {
          fill: none;
          stroke: #00d2b4;
          stroke-width: 14;
          stroke-linecap: round;
          opacity: 0.25;
          animation: lsPulseGlow 2.4s ease-in-out infinite;
        }

        @keyframes lsPulseGlow {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.45; }
        }

        .ls-gauge-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          pointer-events: none;
        }

        .ls-gauge-value {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(34px, 10vw, 42px);
          font-weight: 800;
          color: #0e2e33;
          line-height: 1;
          letter-spacing: -1px;
        }

        .ls-gauge-caption {
          font-size: 11px;
          font-weight: 800;
          color: var(--viz-teal-deep, #008f7f);
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-top: 5px;
        }

        /* ── ETA ROW TILES ── */
        .ls-eta-grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 4px;
        }

        .ls-eta-card {
          background: linear-gradient(135deg, #f7fdfc 0%, #edfbf8 100%);
          border: 1px solid #d4f2ec;
          border-radius: 18px;
          padding: 13px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 3px;
        }

        .ls-eta-label {
          font-size: 10.5px;
          font-weight: 750;
          color: #53757a;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .ls-eta-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff8236;
          box-shadow: 0 0 6px #ff8236;
          animation: lsPulse 1.8s ease-in-out infinite;
        }

        .ls-eta-val {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 750;
          color: #ff8236;
          line-height: 1.2;
        }
        .ls-eta-val.time-left {
          color: #008f7f;
        }
        .ls-eta-val.faint {
          font-size: 13px;
          color: #799ea4;
          font-weight: 500;
        }

        .ls-eta-sub {
          font-size: 10.5px;
          color: #799ea4;
        }

        /* ── 4 METRICS GRID ── */
        .ls-metrics-grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .ls-metric-card {
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 20px;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 16px rgba(0, 160, 145, 0.05);
          transition: transform 0.16s ease;
        }

        .ls-metric-card:hover {
          transform: translateY(-1px);
        }

        .ls-metric-label {
          font-size: 11px;
          font-weight: 750;
          color: #53757a;
          letter-spacing: 0.3px;
          margin-bottom: 6px;
        }

        .ls-metric-number {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: #0e2e33;
          line-height: 1.1;
          letter-spacing: -0.4px;
          font-variant-numeric: tabular-nums;
        }
        .ls-metric-number.highlight-aqua {
          color: #008f7f;
        }
        .ls-metric-number.highlight-orange {
          color: #d85400;
        }

        .ls-metric-unit {
          font-size: 11px;
          color: #799ea4;
          margin-top: 4px;
        }

        /* ── VOLTAGE & CURRENT WIDE CARD ── */
        .ls-telemetry-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 22px;
          padding: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          box-shadow: 0 4px 16px rgba(0, 160, 145, 0.05);
          box-sizing: border-box;
        }

        .ls-telemetry-col {
          display: flex;
          flex-direction: column;
          padding: 12px 14px;
          background: #f4fbfb;
          border: 1px solid #e1f3f1;
          border-radius: 16px;
        }

        .ls-telemetry-label {
          font-size: 11px;
          font-weight: 750;
          color: #53757a;
          margin-bottom: 4px;
        }

        .ls-telemetry-value {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #e06014;
          line-height: 1.1;
        }

        .ls-telemetry-sub {
          font-size: 10.5px;
          color: #799ea4;
          margin-top: 4px;
        }

        /* ── POPUPS & MODALS ── */
        .ls-popup-overlay {
          position: fixed;
          inset: 0;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          background: rgba(6, 38, 43, 0.45);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 3000;
          padding: 20px;
          animation: lsFadeIn 0.2s ease;
        }

        .ls-popup-box {
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 24px;
          padding: 24px 20px 20px;
          width: 100%;
          max-width: 380px;
          color: #0e2e33;
          position: relative;
          box-shadow: 0 24px 60px rgba(0, 60, 66, 0.22);
          box-sizing: border-box;
          animation: lsModalScale 0.22s ease-out;
        }

        .ls-popup-box h3 {
          margin: 0 0 16px;
          color: #00776b;
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 750;
          text-align: center;
        }

        .ls-popup-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: #f7fcfb;
          border: 1px solid #e2f4f1;
          margin-bottom: 8px;
        }

        .ls-popup-label {
          color: #53757a;
          font-size: 12px;
          font-weight: 600;
        }

        .ls-popup-value {
          color: #0e2e33;
          font-size: 13px;
          font-weight: 750;
          text-align: right;
          word-break: break-word;
        }

        .ls-close-btn {
          position: absolute;
          top: 12px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: #53757a;
          cursor: pointer;
          background: #edf7f5;
          border: none;
          transition: background 0.15s ease;
        }
        .ls-close-btn:hover {
          background: #dff2ee;
          color: #00776b;
        }

        /* ── SLIDE TO STOP CONFIRMATION MODAL ── */
        .ls-stop-modal {
          max-width: 360px;
          padding: 26px 20px 22px;
          text-align: center;
        }

        .ls-stop-icon-circle {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff3ed;
          border: 1px solid #ffd8c7;
          color: #ff521a;
          font-size: 26px;
          margin: 0 auto 14px;
          box-shadow: 0 8px 24px rgba(255, 82, 26, 0.20);
          transition: all 0.24s ease;
        }
        .ls-stop-icon-circle.success {
          background: #e6faf6;
          border-color: #b7ede4;
          color: #00a896;
          box-shadow: 0 8px 24px rgba(0, 168, 150, 0.22);
          transform: scale(1.05);
        }

        .ls-stop-title {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 750;
          color: #0e2e33;
          margin: 0 0 6px;
        }

        .ls-stop-desc {
          font-size: 13px;
          color: #53757a;
          line-height: 1.5;
          margin: 0 auto 20px;
          max-width: 270px;
        }

        .ls-slide-shell {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .ls-slide-label {
          font-size: 12.5px;
          font-weight: 750;
          color: #e06014;
          letter-spacing: 0.2px;
          transition: all 0.2s ease;
        }
        .ls-slide-label.success {
          color: #008f7f;
        }

        .ls-slide-track {
          position: relative;
          height: 58px;
          border-radius: 999px;
          background: #f4fbfb;
          border: 1.5px solid #d4f0ec;
          overflow: hidden;
          display: flex;
          align-items: center;
          padding: 3px;
          user-select: none;
          touch-action: none;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);
        }
        .ls-slide-track.success {
          background: #eafaf7;
          border-color: #b7ede4;
        }

        .ls-slide-fill {
          position: absolute;
          left: 3px;
          top: 3px;
          bottom: 3px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255, 130, 54, 0.15), rgba(255, 82, 26, 0.35));
          transition: width 0.18s ease;
          pointer-events: none;
        }
        .ls-slide-fill.success {
          background: linear-gradient(90deg, rgba(0, 210, 180, 0.25), rgba(0, 168, 150, 0.45));
        }

        .ls-slide-hints {
          position: absolute;
          right: 20px;
          display: flex;
          gap: 3px;
          color: #a4c4c8;
          font-size: 16px;
          font-weight: 800;
          pointer-events: none;
        }
        .ls-slide-hints span {
          animation: lsArrowPulse 1.4s infinite ease-in-out;
        }
        .ls-slide-hints span:nth-child(2) { animation-delay: 0.14s; }
        .ls-slide-hints span:nth-child(3) { animation-delay: 0.28s; }

        @keyframes lsArrowPulse {
          0%, 100% { opacity: 0.2; transform: translateX(0); }
          50% { opacity: 0.8; transform: translateX(3px); }
        }

        .ls-slide-thumb {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 800;
          cursor: grab;
          z-index: 2;
          box-shadow: 0 4px 16px rgba(255, 82, 26, 0.4);
        }
        .ls-slide-thumb.success {
          background: linear-gradient(135deg, #00d2b4 0%, #009e8f 100%);
          box-shadow: 0 4px 16px rgba(0, 210, 180, 0.4);
        }

        .ls-cancel-btn {
          margin-top: 14px;
          padding: 9px 24px;
          border-radius: 12px;
          border: 1px solid #dcefed;
          background: #f3fcfb;
          color: #53757a;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.16s ease;
        }
        .ls-cancel-btn:hover {
          background: #e4f7f4;
          color: #0e2e33;
        }

        @keyframes lsPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.9); opacity: 0.4; }
        }

        @keyframes lsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes lsModalScale {
          from { transform: scale(0.94); opacity: 0.6; }
          to { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 360px) {
          .ls-metrics-grid {
            grid-template-columns: 1fr;
          }
          .ls-telemetry-card {
            grid-template-columns: 1fr;
          }
          .ls-gauge-wrap {
            width: 190px;
            height: 190px;
          }
        }
      `}</style>

      <div className="ls-screen">
        <div className="ls-shell">

          {/* ── TOP DEVICE INFORMATION CARD ── */}
          <section className="ls-device-card" aria-label="Charger status">
            <div className="ls-device-left">
              <div className="ls-device-badge">
                <span className="ls-badge-dot" />
                <span>Connected</span>
              </div>

              <div className="ls-device-id">
                {deviceDetails?.device_id || deviceIdFromState || "—"}
              </div>

              <div className="ls-device-location">
                {deviceDetails?.location || "Fetching location…"}
              </div>
            </div>

            <div className="ls-device-actions">
              <button
                type="button"
                className="ls-btn-info"
                onClick={() => setShowPopup(true)}
              >
                More Info
              </button>
              <button
                type="button"
                className="ls-btn-stop"
                onClick={() => {
                  setDragX(0);
                  setStopSliderSuccess(false);
                  setShowStopConfirmPopup(true);
                }}
              >
                Stop
              </button>
            </div>
          </section>

          {/* ── HERO CIRCULAR PROGRESS GAUGE ── */}
          <section className="ls-hero-card" aria-label="Charging gauge">
            <div className={`ls-status-pill ${isCharging ? 'on' : 'off'}`}>
              <span>{isCharging ? '⚡ Charging Active' : '⏸ Charging Paused'}</span>
            </div>

            <div className="ls-gauge-wrap">
              <svg className="ls-gauge-svg" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="lsAquaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00e5be" />
                    <stop offset="100%" stopColor="#00a896" />
                  </linearGradient>
                </defs>

                {/* Background Ring Track */}
                <circle className="ls-gauge-bg" cx="100" cy="100" r="88" />

                {/* Progress Stroke */}
                <circle
                  className="ls-gauge-fill"
                  cx="100"
                  cy="100"
                  r="88"
                  strokeDasharray={CIRCLE_CIRCUMFERENCE}
                  strokeDashoffset={strokeOffset}
                  style={{ transition: isCharging ? undefined : 'none' }}
                />

                {/* Subtle Breathing Aura when Active */}
                {isCharging && (
                  <circle
                    className="ls-gauge-aura"
                    cx="100"
                    cy="100"
                    r="88"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={strokeOffset}
                  />
                )}
              </svg>

              <div className="ls-gauge-center">
                <div className="ls-gauge-value">{displayPercent.toFixed(0)}%</div>
                <div className="ls-gauge-caption">Utilized</div>
              </div>
            </div>


          </section>

          {/* ── 4 KEY METRICS ── */}
          <section className="ls-metrics-grid" aria-label="Energy and billing metrics">
            <div className="ls-metric-card">
              <span className="ls-metric-label">Energy Consumed</span>
              <strong className="ls-metric-number highlight-aqua">{energyConsumed.toFixed(2)}</strong>
              <span className="ls-metric-unit">kWh delivered</span>
            </div>

            <div className="ls-metric-card">
              <span className="ls-metric-label">Energy Selected</span>
              <strong className="ls-metric-number">{energySelected.toFixed(2)}</strong>
              <span className="ls-metric-unit">kWh target</span>
            </div>

            <div className="ls-metric-card">
              <span className="ls-metric-label">Amount Utilized</span>
              <strong className="ls-metric-number highlight-orange">₹{amountUtilized}</strong>
              <span className="ls-metric-unit">Live billed usage</span>
            </div>

            <div className="ls-metric-card">
              <span className="ls-metric-label">Amount Paid</span>
              <strong className="ls-metric-number">₹{Number(amountPaid || 0).toFixed(1)}</strong>
              <span className="ls-metric-unit">Prepaid balance</span>
            </div>
          </section>

          {/* ── ELECTRICAL TELEMETRY (VOLTAGE & CURRENT) ── */}
          <section className="ls-telemetry-card" aria-label="Voltage and current">
            <div className="ls-telemetry-col">
              <span className="ls-telemetry-label">Voltage</span>
              <strong className="ls-telemetry-value">{voltage.toFixed(1)} V</strong>
              <span className="ls-telemetry-sub">Live supply</span>
            </div>

            <div className="ls-telemetry-col">
              <span className="ls-telemetry-label">Current</span>
              <strong className="ls-telemetry-value">{current.toFixed(1)} A</strong>
              <span className="ls-telemetry-sub">Live draw</span>
            </div>
            
          </section>

          {/* ── SESSION INFO MODAL ── */}
          {showPopup && (
            <div className="ls-popup-overlay" onClick={() => setShowPopup(false)}>
              <div className="ls-popup-box" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="ls-close-btn"
                  onClick={() => setShowPopup(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
                <h3>Charging Session Info</h3>

                <div className="ls-popup-row">
                  <span className="ls-popup-label">Charger ID</span>
                  <span className="ls-popup-value">{deviceIdToShow || '—'}</span>
                </div>

                <div className="ls-popup-row">
                  <span className="ls-popup-label">Session ID</span>
                  <span className="ls-popup-value">
                    {sessionId || sessionData?.sessionId || sessionData?._id || '—'}
                  </span>
                </div>

                <div className="ls-popup-row">
                  <span className="ls-popup-label">Transaction ID</span>
                  <span className="ls-popup-value">
                    {transactionId ||
                      sessionData?.transactionId ||
                      sessionData?.transaction_id ||
                      '—'}
                  </span>
                </div>

                <div className="ls-popup-row">
                  <span className="ls-popup-label">Start Date</span>
                  <span className="ls-popup-value">
                    {(startTime || sessionData?.startTime || sessionData?.start_time)
                      ? new Date(
                          startTime || sessionData?.startTime || sessionData?.start_time
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          timeZone: "Asia/Kolkata",
                        })
                      : "—"}
                  </span>
                </div>

                <div className="ls-popup-row">
                  <span className="ls-popup-label">Start Time</span>
                  <span className="ls-popup-value">
                    {(startTime || sessionData?.startTime || sessionData?.start_time)
                      ? new Date(
                          startTime || sessionData?.startTime || sessionData?.start_time
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—"}
                  </span>
                </div>

                <div className="ls-popup-row">
                  <span className="ls-popup-label">Amount Paid</span>
                  <span className="ls-popup-value">₹{amountPaid}</span>
                </div>

                <div className="ls-popup-row">
                  <span className="ls-popup-label">Energy Selected</span>
                  <span className="ls-popup-value">{energySelected.toFixed(2)} kWh</span>
                </div>
              </div>
            </div>
          )}

          {/* ── STOP CHARGING SLIDER MODAL ── */}
          {showStopConfirmPopup && (
            <div className="ls-popup-overlay" onClick={closeStopPopup}>
              <div className="ls-popup-box ls-stop-modal" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="ls-close-btn"
                  onClick={closeStopPopup}
                  aria-label="Close"
                >
                  ✕
                </button>


                <h3 className="ls-stop-title">
                  {stopSliderSuccess ? "Stopping Session..." : "Stop Charging?"}
                </h3>

                <p className="ls-stop-desc">
                  {stopSliderSuccess
                    ? "Please wait while we safely end your charging session."
                    : "Slide to confirm and safely stop the current charging session."}
                </p>

                <div className="ls-slide-shell">
                  <div className={`ls-slide-label ${stopSliderSuccess ? "success" : ""}`}>
                    {stopSliderSuccess
                      ? "Confirmed"
                      : dragX >= MAX_DRAG * 0.88
                      ? "Release to stop"
                      : "Slide to stop charging"}
                  </div>

                  <div
                    className={`ls-slide-track ${isDragging ? "dragging" : ""} ${stopSliderSuccess ? "success" : ""}`}
                    ref={sliderTrackRef}
                    style={{ width: `${SLIDER_WIDTH}px`, maxWidth: "100%" }}
                  >
                    <div
                      className={`ls-slide-fill ${stopSliderSuccess ? "success" : ""}`}
                      style={{ width: `${dragX + KNOB_SIZE / 2}px` }}
                    />

                    {!stopSliderSuccess && (
                      <div className="ls-slide-hints">
                        <span>»</span>
                        <span>»</span>
                        <span>»</span>
                      </div>
                    )}

                    <div
                      className={`ls-slide-thumb ${isDragging ? "dragging" : ""} ${stopSliderSuccess ? "success" : ""}`}
                      style={{
                        transform: `translateX(${dragX}px) scale(${isDragging ? 1.04 : 1})`,
                        transition: isDragging
                          ? "none"
                          : "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease",
                      }}
                      onMouseDown={(e) => startDrag(e.clientX)}
                      onTouchStart={(e) => startDrag(e.touches[0].clientX)}
                    >
                      {stopSliderSuccess ? "✓" : "»"}
                    </div>
                  </div>
                </div>

                {!stopSliderSuccess && (
                  <button type="button" className="ls-cancel-btn" onClick={closeStopPopup}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── PAUSE ALERT MODAL ── */}
          {showPausePopup && (
            <div className="ls-popup-overlay" onClick={handleDismissPopup}>
              <div className="ls-popup-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '340px' }}>
                <button
                  type="button"
                  className="ls-close-btn"
                  onClick={handleDismissPopup}
                  aria-label="Close"
                >
                  ✕
                </button>

                {pausedReason === 'offline' ? (
                  <div style={{ textAlign: "center", padding: "6px 0" }}>
                    <h3 style={{ color: '#00776b', marginBottom: 8 }}>Device Offline</h3>
                    <p style={{ color: '#53757a', fontSize: 13, lineHeight: 1.5, margin: "0 0 10px" }}>
                      Charger is offline or temporarily disconnected.
                    </p>
                    <p style={{ color: '#53757a', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                      Session remains active. Wait for reconnection or stop the session manually.
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "6px 0" }}>
                    <h3 style={{ color: '#e06014', marginBottom: 8 }}>Charging Paused</h3>
                    <p style={{ color: '#53757a', fontSize: 13, lineHeight: 1.5, margin: "0 0 12px" }}>
                      Charging was paused via the emergency stop button.
                    </p>
                    <p style={{ color: '#0e2e33', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                      Press the button for 5 seconds to resume, or session ends in{' '}
                      <strong style={{ color: '#e06014', fontWeight: 800 }}>
                        {minutes}:{seconds.toString().padStart(2, "0")}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── FOOTER NAV ── */}
      <FooterNav />
    </>
  );
}