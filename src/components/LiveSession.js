import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import "../styles/appStyles.css";
import FooterNav from "../components/FooterNav";
import { useParams } from "react-router-dom";

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
  const autoStopCalledRef = useRef(false);
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
      console.log('100% reached → redirecting');
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

  const intervalRef = useRef(null);

  const savePauseEndTime = (endTimeMs) => {
    if (sessionId) {
      localStorage.setItem(`pause_${sessionId}`, endTimeMs.toString());
      console.log('[PAUSE] Saved pause end time to localStorage:', endTimeMs);
    }
  };

  const loadPauseEndTime = () => {
    if (sessionId) {
      const stored = localStorage.getItem(`pause_${sessionId}`);
      if (stored) {
        const endTime = parseInt(stored, 10);
        console.log('[PAUSE] Loaded pause end time from localStorage:', endTime);
        return endTime;
      }
    }
    return null;
  };

  const clearPauseEndTime = () => {
    if (sessionId) {
      localStorage.removeItem(`pause_${sessionId}`);
      console.log('[PAUSE] Cleared pause end time from localStorage');
    }
  };

  useEffect(() => {
    const storedEndTime = loadPauseEndTime();
    if (storedEndTime) {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.ceil((storedEndTime - now) / 1000));

      if (secondsLeft > 0) {
        console.log(
          '[PAUSE] Restoring pause state from localStorage, secondsLeft=',
          secondsLeft
        );
        pauseEndTimeRef.current = storedEndTime;
        pauseInitializedRef.current = true;
        setShowPausePopup(true);
        setPausedReason('button');
        setTimeLeft(secondsLeft);
      } else {
        console.log('[PAUSE] Stored pause already expired, clearing');
        clearPauseEndTime();
      }
    }
  }, []);

  const stopSessionAndRedirect = async (triggerType) => {
    const sid = lastSessionIdRef.current || sessionData?.sessionId;

    if (!sid) {
      console.log('[STOP] No sessionId found, cannot stop');
      return;
    }

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
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      console.log(`[STOP] Session stopped via ${triggerType}`);

      clearPauseEndTime();
      lastSessionIdRef.current = null;

      navigate('/session-summary', { state: { sessionId: sid } });
    } catch (err) {
      console.error('[STOP] Stop API failed:', err);
      alert('Failed to stop session. Please try again.');
    }
  };

// Live ETA countdown — recalculates every 30s from estimatedEndTime
useEffect(() => {
  const computeEta = () => {
    if (!estimatedEndTime) {
      setEtaDisplay({ timeStr: null, remaining: null });
      return;
    }
    const eta = new Date(estimatedEndTime);
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();

    // Format ETA time as "HH:MM AM/PM"
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

  computeEta(); // run immediately
  const ticker = setInterval(computeEta, 30_000); // refresh every 30s
  return () => clearInterval(ticker);
}, [estimatedEndTime]);


  const fetchActiveSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, redirecting to login');
        navigate('/login');
        return;
      }

      console.log(
        'Fetching from URL:',
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/active`
      );

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

      console.log('Response status:', res.status, res.statusText);

      if (res.status === 404) {
        const sid = lastSessionIdRef.current;

        if (sid && !autoStopCalledRef.current) {
          autoStopCalledRef.current = true;

          console.log('Session missing → ensuring stop API called');

          const token = localStorage.getItem('token');

          try {
            await fetch(
              `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/stop`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  sessionId: sid,
                  endTime: new Date().toISOString(),
                  endTrigger: 'target_reached',
                }),
              }
            );
          } catch (err) {
            console.log('404 stop fallback failed:', err);
          }

          lastSessionIdRef.current = null;
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
      console.log('FE DEBUG: fetchActiveSession data:', data);

      const deviceStatus = data.status?.toString().toLowerCase();
      const normalizedRelay =
        data.relayState?.toUpperCase() === 'ON' ? 'ON' : 'OFF';

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        if (res.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        return;
      }

      if (deviceStatus === 'available') {
        if (!autoStopCalledRef.current) {
          autoStopCalledRef.current = true;
          try {
            await stopSessionAndRedirect('target_reached');
          } catch (err) {
            console.error('[AUTO-STOP] Failed, resetting flag for retry:', err);
            autoStopCalledRef.current = false;  // ← reset so next poll retries
          }
        }
        return;
      }

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

          console.log('[PAUSE] Device paused → initializing pause popup (once)');
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

          console.log(
            '[PAUSE] Pause end time:',
            new Date(endTime).toISOString(),
            '| Seconds left:',
            initialSecondsLeft
          );
        }

        return;
      }

      if (deviceStatus === 'occupied') {
        if (showPausePopup || pauseInitializedRef.current) {
          console.log(
            '[PAUSE] Device resumed → hiding pause popup and resetting pause state'
          );
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
              "Authorization": `Bearer ${token}`,
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          'Current relay state:',
          relayRef.current,
          ' showPausePopup=',
          showPausePopup
        );
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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
      console.log(
        '[PAUSE] Starting countdown interval (absolute), endTime=',
        pauseEndTimeRef.current
      );
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
          console.log('[PAUSE] Countdown reached zero, clearing interval');
          setTimeLeft(0);

          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          if (!pauseTimeoutCalledRef.current) {
            pauseTimeoutCalledRef.current = true;

            console.log('[PAUSE] Timeout expired → stopping session properly');

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
        console.log(
          '[PAUSE] Cleared countdown interval because pause ended or popup hidden'
        );
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
    console.log('[PAUSE] User dismissed popup, will re-show in 5 seconds');
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
          console.log(
            '[PAUSE] 5 seconds elapsed since dismiss, re-showing popup'
          );
          setShowPausePopup(true);
          popupDismissedAtRef.current = null;
          clearInterval(checkInterval);
        }
      }, 1000);

      return () => clearInterval(checkInterval);
    }
  }, [pausedReason, showPausePopup, pauseInitializedRef.current]);

  return (
    <>
      <style>{`
        :root {
          --primary: #04bfbf;
          --primary-2: #029c9c;
          --text-main: #ecfbff;
          --text-soft: #b8d4db;
          --text-faint: #7da0a8;
          --danger: #d93b3b;
          --danger-hover: #b82727;
          --warning: #f2a007;
          --success: #01d146;
          --card-bg: rgba(255,255,255,0.06);
          --card-border: rgba(255,255,255,0.12);
          --glass-bg: rgba(10, 19, 25, 0.78);
        }

        .ev-screen {
          min-height: 100dvh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          color: var(--text-main);
          font-family: 'Calibri', sans-serif;
          overflow: hidden;
          background:
            radial-gradient(circle at top, rgba(6, 36, 52, 0.95) 0%, rgba(10, 18, 24, 1) 38%, rgba(7, 11, 15, 1) 100%),
            linear-gradient(180deg, rgba(4,191,191,0.06), rgba(4,191,191,0));
        }

        .content-wrapper {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
          max-width: 460px;
          margin: 0 auto;
          padding: 64px 16px 120px;
          box-sizing: border-box;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .content-wrapper::-webkit-scrollbar {
          display: none;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .charging-status {
          margin: 4px 0 0;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.03em;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .charging-status .on {
          color: #34e676;
        }

        .charging-status .off {
          color: #ff7272;
        }

        .device-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 16px;
          margin-bottom: 18px;
          width: 100%;
          box-sizing: border-box;
          background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
        }

        .device-card-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          gap: 7px;
          min-width: 0;
        }

        .device-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 11px;
          border-radius: 999px;
          background: rgba(1, 209, 70, 0.13);
          border: 1px solid rgba(1, 209, 70, 0.24);
          color: #5ef08d;
          width: fit-content;
        }

        .chip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #01d146;
          box-shadow: 0 0 8px #01d146;
          flex-shrink: 0;
        }

        .device-id {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
          letter-spacing: 0.03em;
          line-height: 1.2;
          word-break: break-word;
        }

        .device-location {
          font-size: 13px;
          color: var(--text-soft);
          opacity: 0.95;
          line-height: 1.45;
        }

        .device-card-right {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 104px;
          flex-shrink: 0;
        }

        .device-action-btn {
          min-height: 42px;
          padding: 0 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.22s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── ETA Row ─────────────────────────────────────── */
.eta-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 10px;
  margin-top: 14px;
  width: 100%;
}

.eta-cell {
  flex: 1;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 12px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.eta-cell-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-faint);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 5px;
}

.eta-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f2a007;
  box-shadow: 0 0 6px #f2a007;
  animation: etaPulse 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes etaPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.45; transform: scale(0.7); }
}

.eta-cell-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  color: #f2a007;
}

.eta-cell-value.faint {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-faint);
  font-style: italic;
}

.eta-cell-sub {
  font-size: 11px;
  color: var(--text-soft);
  opacity: 0.8;
}

.eta-cell.time-left .eta-cell-value {
  color: #04bfbf;
}
/* ─────────────────────────────────────────────────── */

        .info-btn {
          background: rgba(255, 255, 255, 0.07);
          color: #d7eef4;
        }

        .info-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-1px);
        }

        .stop-btn {
          background: linear-gradient(180deg, #d74444 0%, #b72c2c 100%);
          color: #fff;
          border: 1px solid rgba(255, 80, 80, 0.35);
          box-shadow: 0 10px 20px rgba(191, 44, 44, 0.18);
        }

        .stop-btn:hover {
          background: linear-gradient(180deg, #c73434 0%, #a21e1e 100%);
          transform: translateY(-1px);
        }

        .progress-card {
          width: 100%;
          box-sizing: border-box;
          background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 28px;
          padding: 18px 16px 14px;
          box-shadow: 0 18px 40px rgba(0,0,0,0.22);
          text-align: center;
        }

        .progress-heading {
          font-size: 13px;
          color: var(--text-faint);
          margin-bottom: 4px;
          letter-spacing: 0.02em;
        }

        .progress-subheading {
          font-size: 16px;
          color: var(--text-main);
          font-weight: 700;
          margin-bottom: 6px;
        }

        .circular-container {
          position: relative;
          width: min(200px, 62vw);
          height: min(200px, 62vw);
          margin: 10px auto 8px;
        }

        .circular-bg {
          fill: none;
          stroke: rgba(255,255,255,0.08);
          stroke-width: 12;
        }

        .circular-progress {
          fill: none;
          stroke: #04bfbf;
          stroke-width: 12;
          stroke-linecap: round;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
          transition: stroke-dashoffset 0.5s ease;
          filter: drop-shadow(0 0 8px rgba(4,191,191,0.65));
        }

        .circular-glow {
          fill: none;
          stroke: url(#glowGradient);
          stroke-width: 14;
          stroke-linecap: round;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
          stroke-dasharray: 565;
          stroke-dashoffset: 0;
          animation: sweepGlow 2s linear infinite;
        }

        @keyframes sweepGlow {
          0% { stroke-dashoffset: 565; }
          100% { stroke-dashoffset: 0; }
        }

        .metrics-grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
          @media (max-width: 380px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .split-row {
            grid-template-columns: 1fr;
          }

          .device-card {
            flex-direction: column;
            align-items: stretch;
          }

          .device-card-left {
            align-items: center;
            text-align: center;
          }

          .device-card-right {
            width: 100%;
            flex-direction: row;
            
          }

          .device-action-btn {
            flex: 1;
          }
        }

        .metric-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 20px;
          padding: 16px 14px;
          text-align: center;
          box-shadow: 0 14px 32px rgba(0,0,0,0.18);
        }

        .metric-label {
          font-size: 12px;
          color: var(--text-faint);
          margin-bottom: 8px;
          letter-spacing: 0.03em;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--primary);
          line-height: 1.1;
        }

        .metric-value-warn {
          font-size: 24px;
          font-weight: 700;
          color: var(--warning);
          line-height: 1.1;
        }

        .metric-unit {
          font-size: 13px;
          color: var(--text-soft);
          margin-top: 3px;
        }

        .wide-card {
          width: 100%;
          box-sizing: border-box;
          background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 16px 36px rgba(0,0,0,0.2);
        }

        .split-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .popup-overlay {
          position: fixed;
          inset: 0;
          backdrop-filter: blur(9px);
          background: rgba(2, 8, 10, 0.42);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
          padding: 20px;
        }

        .popup-box {
          background: linear-gradient(180deg, rgba(13,19,24,0.97) 0%, rgba(8,13,16,0.97) 100%);
          border: 1px solid rgba(4,191,191,0.18);
          border-radius: 22px;
          padding: 22px 18px 18px;
          width: 100%;
          max-width: 390px;
          color: #fff;
          position: relative;
          box-shadow: 0 24px 60px rgba(0,0,0,0.38);
        }

        .popup-box h3 {
          margin: 0 0 14px;
          color: #04bfbf;
          font-size: 20px;
          text-align: center;
        }

        .popup-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 10px;
        }

        .popup-label {
          color: #8fb4bc;
          font-size: 12px;
          font-weight: 600;
          min-width: 96px;
        }

        .popup-value {
          color: #effcff;
          font-size: 13px;
          font-weight: 600;
          text-align: right;
          word-break: break-word;
        }

        .close-btn {
          position: absolute;
          top: 10px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: white;
          cursor: pointer;
          background: rgba(255,255,255,0.06);
        }

        .pause-box-center {
          min-height: 220px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          padding: 6px;
        }

        .pause-box-center p {
          margin: 8px 0;
          color: #d8edf3;
          line-height: 1.5;
        }

        .pause-box-center strong {
          color: #04bfbf;
        }

        @media (max-width: 420px) {
          .device-card {
            padding: 16px;
            gap: 12px;
          }

          .device-card-right {
            width: 108px;
          }

          .metric-value,
          .metric-value-warn {
            font-size: 22px;
          }

          .circular-container {
            width: 186px;
            height: 186px;
          }
          .slide-track {
            width: 100% !important;
          }
        }

.stop-confirm-popup {
  max-width: 370px;
  padding: 24px 18px 18px;
  overflow: hidden;
}
.stop-confirm-popup.success {
  border-color: rgba(4,191,191,0.22);
  box-shadow: 0 24px 60px rgba(0,0,0,0.38), 0 0 0 1px rgba(4,191,191,0.06);
}

.stop-confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stop-confirm-icon {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(217,68,68,0.24), rgba(183,44,44,0.14));
  border: 1px solid rgba(255,90,90,0.18);
  font-size: 24px;
  margin-bottom: 12px;
  box-shadow: 0 10px 28px rgba(215,68,68,0.18);
  transition: all 0.28s ease;
}
.stop-confirm-icon.success {
  background: linear-gradient(180deg, rgba(4,191,191,0.26), rgba(2,156,156,0.16));
  border: 1px solid rgba(4,191,191,0.20);
  box-shadow: 0 12px 30px rgba(4,191,191,0.20);
  transform: scale(1.05);
}

.stop-confirm-content h3 {
  margin: 0 0 8px;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
}

.stop-confirm-content p {
  margin: 0 0 18px;
  color: #a9c6cd;
  font-size: 13px;
  line-height: 1.5;
  max-width: 265px;
}

.slide-shell {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.slide-label {
  font-size: 13px;
  font-weight: 700;
  color: #ffb3b3;
  letter-spacing: 0.02em;
  transition: color 0.22s ease, transform 0.22s ease;
}
  
.slide-label.success {
  color: #7be5d8;
  transform: scale(1.02);
}

.slide-track {
  position: relative;
  height: 58px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 3px;
  user-select: none;
  touch-action: none;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.04);
}
.slide-track.dragging {
  border-color: rgba(255,255,255,0.14);
}

.slide-track.success {
  border-color: rgba(4,191,191,0.24);
  background: rgba(4,191,191,0.08);
}

.slide-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 0%,
    rgba(255,255,255,0.04) 35%,
    rgba(255,255,255,0.08) 50%,
    transparent 65%
  );
  transform: translateX(-100%);
  animation: slideShimmer 2.2s linear infinite;
  pointer-events: none;
}

.slide-shimmer.hidden {
  opacity: 0;
  animation: none;
}

@keyframes slideShimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.slide-fill {
  position: absolute;
  left: 3px;
  top: 3px;
  bottom: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(215,68,68,0.20), rgba(215,68,68,0.46));
  box-shadow: 0 0 18px rgba(215,68,68,0.16);
  transition: width 0.18s ease, background 0.22s ease;
  pointer-events: none;
}

.slide-fill.success {
  background: linear-gradient(90deg, rgba(4,191,191,0.32), rgba(4,191,191,0.56));
  box-shadow: 0 0 22px rgba(4,191,191,0.20);
}

.slide-hint-arrows {
  position: absolute;
  right: 18px;
  display: flex;
  gap: 4px;
  color: rgba(255,255,255,0.30);
  font-size: 16px;
  font-weight: 700;
  pointer-events: none;
}

.slide-hint-arrows span {
  animation: arrowPulse 1.4s infinite ease-in-out;
}

.slide-hint-arrows span:nth-child(2) {
  animation-delay: 0.12s;
}

.slide-hint-arrows span:nth-child(3) {
  animation-delay: 0.24s;
}

@keyframes arrowPulse {
  0%, 100% {
    opacity: 0.18;
    transform: translateX(0);
  }
  50% {
    opacity: 0.75;
    transform: translateX(2px);
  }
}

.slide-thumb {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(180deg, #ea5555 0%, #b72c2c 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  cursor: grab;
  z-index: 2;
  box-shadow:
    0 10px 24px rgba(183,44,44,0.30),
    inset 0 1px 0 rgba(255,255,255,0.18);
  transition: box-shadow 0.2s ease, background 0.2s ease;
}
  .slide-thumb.dragging {
  box-shadow:
    0 14px 30px rgba(183,44,44,0.38),
    inset 0 1px 0 rgba(255,255,255,0.20);
}
.slide-thumb.success {
  background: linear-gradient(180deg, #05d0d0 0%, #029a9a 100%);
  box-shadow:
    0 12px 26px rgba(4,191,191,0.28),
    inset 0 1px 0 rgba(255,255,255,0.18);
}

.slide-thumb:active {
  cursor: grabbing;
}
.stop-cancel-btn {
  margin-top: 16px;
  min-width: 110px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  color: #d6edf2;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stop-cancel-btn:hover {
  background: rgba(255,255,255,0.09);
}

@media (max-width: 420px) {
  .stop-confirm-popup {
    max-width: 100%;
  }

  .slide-track {
    width: 100% !important;
  }
}
      `}</style>

      <div className="ev-screen">
        <div className="top-bar">
          <img src="/logo.png" alt="VIZ Logo" className="top-bar-logo" />
        </div>

        <div className="content-wrapper">
          <div className="device-card">
            <div className="device-card-left">
              <div className="device-chip">
                <span className="chip-dot" />
                Connected
              </div>

              <div className="device-id">
                {deviceDetails?.device_id || deviceIdFromState || "—"}
              </div>

              <div className="device-location">
                {deviceDetails?.location || "Fetching location…"}
              </div>
            </div>

            <div className="device-card-right">
              <button
                className="device-action-btn info-btn"
                onClick={() => setShowPopup(true)}
              >
                More Info
              </button>
              <button
                className="device-action-btn stop-btn"
                onClick={() => {
                  setDragX(0);
                  setStopSliderSuccess(false);
                  setShowStopConfirmPopup(true);
                }}
              >
                Stop
              </button>
            </div>
          </div>

          <div className="main-content">
            <p className="charging-status">
              <span className={isCharging ? 'on' : 'off'}>
                Charging {isCharging ? 'ON' : 'OFF'}
              </span>
            </p>

            <div className="progress-card">
              <div className="progress-heading">Live charging progress</div>

<div className="circular-container">
  <svg width="100%" height="100%" viewBox="0 0 200 200">
    <circle className="circular-bg" cx="100" cy="100" r="90" />

    <circle
      className="circular-progress"
      cx="100"
      cy="100"
      r="90"
      strokeDasharray="565"
      strokeDashoffset={565 - (usagePercent / 100) * 565}
      style={{ transition: isCharging ? undefined : 'none' }}
    />

    <defs>
      <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgba(9, 218, 61, 0.25)" />
        <stop offset="50%" stopColor="#08d619" />
        <stop offset="100%" stopColor="rgba(9, 218, 61, 0.25)" />
      </linearGradient>
    </defs>

    <circle
      className="circular-glow"
      cx="100"
      cy="100"
      r="90"
      style={{
        animationPlayState: isCharging ? 'running' : 'paused',
      }}
    />
  </svg>

  <div
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontSize: '30px',
        fontWeight: '700',
        color: '#09e02d',
        lineHeight: 1,
      }}
    >
      {displayPercent.toFixed(0)}%
    </div>
    <div
      style={{
        fontSize: '12px',
        color: '#8fc6b0',
        marginTop: '6px',
        letterSpacing: '0.04em',
      }}
    >
      Utilized
    </div>
  </div>
</div>

          {/* ── ETA Row ─────────────────────────────── */}
          <div className="eta-row">
            <div className="eta-cell">
              <div className="eta-cell-label">
                {etaDisplay.timeStr && <span className="eta-pulse-dot" />}
                Est. Finish
              </div>
              {etaDisplay.timeStr ? (
                <>
                  <div className="eta-cell-value">{etaDisplay.timeStr}</div>
                  <div className="eta-cell-sub">today</div>
                </>
              ) : (
                <div className="eta-cell-value faint">
                  {usagePercent >= 1 ? 'Calculating…' : 'Waiting for data'}
                </div>
              )}
            </div>

            <div className="eta-cell time-left">
              <div className="eta-cell-label">Time Left</div>
              {etaDisplay.remaining ? (
                <div className="eta-cell-value">{etaDisplay.remaining}</div>
              ) : (
                <div className="eta-cell-value faint">—</div>
              )}
              <div className="eta-cell-sub">est. remaining</div>
            </div>
          </div>
          {/* ──────────────────────────────────────── */}


            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Energy Consumed</div>
                <div className="metric-value">{energyConsumed.toFixed(2)}</div>
                <div className="metric-unit">kWh</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Energy Selected</div>
                <div className="metric-value">{energySelected.toFixed(2)}</div>
                <div className="metric-unit">kWh</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Amount Utilized</div>
                <div className="metric-value">₹{amountUtilized}</div>
                <div className="metric-unit">Live billed usage</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Amount Paid</div>
                <div className="metric-value">₹{Number(amountPaid || 0).toFixed(1)}</div>
                <div className="metric-unit">Prepaid amount</div>
              </div>
            </div>

            <div className="wide-card">
              <div className="split-row">
                <div className="metric-card" style={{ margin: 0 }}>
                  <div className="metric-label">Voltage</div>
                  <div className="metric-value-warn">{voltage.toFixed(1)}V</div>
                  <div className="metric-unit">Live voltage</div>
                </div>

                <div className="metric-card" style={{ margin: 0 }}>
                  <div className="metric-label">Current</div>
                  <div className="metric-value-warn">{current.toFixed(1)}A</div>
                  <div className="metric-unit">Live current</div>
                </div>
              </div>
            </div>

            {showPopup && (
              <div className="popup-overlay" onClick={() => setShowPopup(false)}>
                <div className="popup-box" onClick={(e) => e.stopPropagation()}>
                  <div className="close-btn" onClick={() => setShowPopup(false)}>✕</div>
                  <h3>Charging Session Info</h3>

                  <div className="popup-row">
                    <div className="popup-label">Charger ID</div>
                    <div className="popup-value">{deviceIdToShow || '—'}</div>
                  </div>

                  <div className="popup-row">
                    <div className="popup-label">Session ID</div>
                    <div className="popup-value">
                      {sessionId || sessionData?.sessionId || sessionData?._id || '—'}
                    </div>
                  </div>

                  <div className="popup-row">
                    <div className="popup-label">Transaction ID</div>
                    <div className="popup-value">
                      {transactionId ||
                        sessionData?.transactionId ||
                        sessionData?.transaction_id ||
                        '—'}
                    </div>
                  </div>

                  <div className="popup-row">
                    <div className="popup-label">Start Date</div>
                    <div className="popup-value">
                      {(
                        startTime ||
                        sessionData?.startTime ||
                        sessionData?.start_time
                      )
                        ? new Date(
                            startTime ||
                              sessionData?.startTime ||
                              sessionData?.start_time
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          })
                        : "—"}
                    </div>
                  </div>

                  <div className="popup-row">
                    <div className="popup-label">Start Time</div>
                    <div className="popup-value">
                      {(
                        startTime ||
                        sessionData?.startTime ||
                        sessionData?.start_time
                      )
                        ? new Date(
                            startTime ||
                              sessionData?.startTime ||
                              sessionData?.start_time
                          ).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </div>
                  </div>

                  <div className="popup-row">
                    <div className="popup-label">Amount Paid</div>
                    <div className="popup-value">₹{amountPaid}</div>
                  </div>

                  <div className="popup-row" style={{ marginBottom: 0 }}>
                    <div className="popup-label">Energy Selected</div>
                    <div className="popup-value">{energySelected.toFixed(2)} kWh</div>
                  </div>
                </div>
              </div>
            )}

{showStopConfirmPopup && (
  <div className="popup-overlay" onClick={closeStopPopup}>
    <div
      className={`popup-box stop-confirm-popup ${stopSliderSuccess ? "success" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="close-btn" onClick={closeStopPopup}>✕</div>

      <div className="stop-confirm-content">
        <div className={`stop-confirm-icon ${stopSliderSuccess ? "success" : ""}`}>
          {stopSliderSuccess ? "✓" : "⚡"}
        </div>

        <h3>{stopSliderSuccess ? "Stopping Session..." : "Stop Charging?"}</h3>

        <p>
          {stopSliderSuccess
            ? "Please wait while we safely end the charging session."
            : "Slide to confirm and safely stop the current charging session."}
        </p>

        <div className="slide-shell">
          <div className={`slide-label ${stopSliderSuccess ? "success" : ""}`}>
            {stopSliderSuccess
              ? "Confirmed"
              : dragX >= MAX_DRAG * 0.88
              ? "Release to stop"
              : "Slide to stop charging"}
          </div>

          <div
            className={`slide-track ${isDragging ? "dragging" : ""} ${stopSliderSuccess ? "success" : ""}`}
            ref={sliderTrackRef}
            style={{
              width: `${SLIDER_WIDTH}px`,
              maxWidth: "100%",
            }}
          >
            <div
              className={`slide-shimmer ${isDragging ? "hidden" : ""} ${stopSliderSuccess ? "hidden" : ""}`}
            />

            <div
              className={`slide-fill ${stopSliderSuccess ? "success" : ""}`}
              style={{
                width: `${dragX + KNOB_SIZE / 2}px`,
              }}
            />

            {!stopSliderSuccess && (
              <div className="slide-hint-arrows">
                <span>»</span>
                <span>»</span>
                <span>»</span>
              </div>
            )}

            <div
              className={`slide-thumb ${isDragging ? "dragging" : ""} ${stopSliderSuccess ? "success" : ""}`}
              style={{
                transform: `translateX(${dragX}px) scale(${isDragging ? 1.03 : 1})`,
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
          <button className="stop-cancel-btn" onClick={closeStopPopup}>
            Cancel
          </button>
        )}
      </div>
    </div>
  </div>
)}

            {showPausePopup && (
              <div className="popup-overlay" onClick={handleDismissPopup}>
                <div
                  className="popup-box"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: '320px' }}
                >
                  <div className="close-btn" onClick={handleDismissPopup}>✕</div>

                  {pausedReason === 'offline' ? (
                    <div className="pause-box-center">
                      <h3 style={{ color: '#04bfbf' }}>Device Offline</h3>
                      <p>Charger is offline or powered off.</p>
                      <p>
                        Session remains active. Wait for reconnection or stop the
                        session manually.
                      </p>
                    </div>
                  ) : (
                    <div className="pause-box-center">
                      <h3 style={{ color: '#04bfbf' }}>Charging Paused</h3>
                      <p>Charging is paused due to the emergency button.</p>
                      <p>
                        Press the button for 5 seconds to resume, or the session
                        ends in{' '}
                        <strong>
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
      </div>

      <FooterNav />
    </>
  );
}