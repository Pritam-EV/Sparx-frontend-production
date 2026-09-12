import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import "../styles/appStyles.css";
import FooterNav from "../components/FooterNav";
import { useParams } from "react-router-dom";
import { FiActivity, FiAlertCircle, FiBatteryCharging, FiCheck, FiChevronRight, FiClock, FiCpu, FiDollarSign, FiInfo, FiMapPin, FiPlug, FiRadio, FiServer, FiShield, FiStopCircle, FiZap, FiX } from "react-icons/fi";

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
      // console.log('100% reached → redirecting');
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
      // console.log('[PAUSE] Saved pause end time to localStorage:', endTimeMs);
    }
  };

  const loadPauseEndTime = () => {
    if (sessionId) {
      const stored = localStorage.getItem(`pause_${sessionId}`);
      if (stored) {
        const endTime = parseInt(stored, 10);
        // console.log('[PAUSE] Loaded pause end time from localStorage:', endTime);
        return endTime;
      }
    }
    return null;
  };

  const clearPauseEndTime = () => {
    if (sessionId) {
      localStorage.removeItem(`pause_${sessionId}`);
      // console.log('[PAUSE] Cleared pause end time from localStorage');
    }
  };

  useEffect(() => {
    const storedEndTime = loadPauseEndTime();
    if (storedEndTime) {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.ceil((storedEndTime - now) / 1000));

      if (secondsLeft > 0) {
        // console.log(
        //   '[PAUSE] Restoring pause state from localStorage, secondsLeft=',
        //   secondsLeft
        // );
        pauseEndTimeRef.current = storedEndTime;
        pauseInitializedRef.current = true;
        setShowPausePopup(true);
        setPausedReason('button');
        setTimeLeft(secondsLeft);
      } else {
        // console.log('[PAUSE] Stored pause already expired, clearing');
        clearPauseEndTime();
      }
    }
  }, []);

const stopSessionAndRedirect = async (triggerType, finalEnergy) => {   // ← ADD finalEnergy param
    const sid = lastSessionIdRef.current || sessionData?.sessionId;

    if (!sid) {
      // console.log('[STOP] No sessionId found, cannot stop');
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
            ...(finalEnergy !== undefined && { deltaEnergy: finalEnergy }), // ← ADD THIS LINE
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      // console.log(`[STOP] Session stopped via ${triggerType}`);

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
        // console.log('No token found, redirecting to login');
        navigate('/login');
        return;
      }

      // console.log(
      //   'Fetching from URL:',
      //   `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/active`
      // );

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

      // console.log('Response status:', res.status, res.statusText);

if (res.status === 404) {
  const sid = lastSessionIdRef.current;

  // console.log(
  //   'No active session returned by backend; not sending automatic stop request.'
  // );

  lastSessionIdRef.current = null;
  clearPauseEndTime();

  if (sid) {
    navigate('/session-summary', {
      state: { sessionId: sid },
    });
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
      // console.log('FE DEBUG: fetchActiveSession data:', data);

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

          // console.log('[PAUSE] Device paused → initializing pause popup (once)');
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

          // console.log(
          //   '[PAUSE] Pause end time:',
          //   new Date(endTime).toISOString(),
          //   '| Seconds left:',
          //   initialSecondsLeft
          // );
        }

        return;
      }

      if (deviceStatus === 'occupied') {
        if (showPausePopup || pauseInitializedRef.current) {
          // console.log(
          //   '[PAUSE] Device resumed → hiding pause popup and resetting pause state'
          // );
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
        // console.log(
        //   'Current relay state:',
        //   relayRef.current,
        //   ' showPausePopup=',
        //   showPausePopup
        // );
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
      // console.log(
      //   '[PAUSE] Starting countdown interval (absolute), endTime=',
      //   pauseEndTimeRef.current
      // );
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
          // console.log('[PAUSE] Countdown reached zero, clearing interval');
          setTimeLeft(0);

          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          if (!pauseTimeoutCalledRef.current) {
            pauseTimeoutCalledRef.current = true;

            // console.log('[PAUSE] Timeout expired → stopping session properly');

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
        // console.log(
        //   '[PAUSE] Cleared countdown interval because pause ended or popup hidden'
        // );
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
    // console.log('[PAUSE] User dismissed popup, will re-show in 5 seconds');
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
          // console.log(
          //   '[PAUSE] 5 seconds elapsed since dismiss, re-showing popup'
          // );
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
      <div className="live-session-page">
        <div className="live-session-shell">
          <header className="live-session-header">
            <div className="live-session-brand-lockup">
              <div className="live-session-brand-mark"><FiZap aria-hidden="true" /></div>
              <div>
                <div className="live-session-eyebrow">SPARX EV NETWORK</div>
                <h1>Live session</h1>
              </div>
            </div>
            <img src="/logo.png" alt="Sparx" className="live-session-logo" />
            <div className={"live-session-header-state " + (isCharging ? "is-active" : "is-idle")}>
              <span className="live-session-status-dot" />
              {isCharging ? "Live" : "Standby"}
            </div>
          </header>

          <main className="live-session-content">
            {error && (
              <div className="live-session-error" role="alert">
                <FiAlertCircle aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <section className="live-session-device-card">
              <div className="live-session-device-identity">
                <div className="live-session-device-icon"><FiServer aria-hidden="true" /></div>
                <div className="live-session-device-copy">
                  <div className="live-session-section-kicker">CONNECTED CHARGER</div>
                  <div className="live-session-device-id">
                    {deviceDetails?.device_id || deviceIdFromState || "—"}
                  </div>
                  <div className="live-session-device-location">
                    <FiMapPin aria-hidden="true" />
                    <span>{isLoading ? "Fetching charger details…" : deviceDetails?.location || "Location unavailable"}</span>
                  </div>
                </div>
              </div>
              <div className="live-session-device-actions">
                <button
                  type="button"
                  className="live-session-ghost-button"
                  onClick={() => setShowPopup(true)}
                >
                  <FiInfo aria-hidden="true" />
                  More info
                </button>
                <div className="live-session-connection-pill">
                  <FiRadio aria-hidden="true" />
                  <span>Connected</span>
                </div>
              </div>
            </section>

            <div className="live-session-layout">
              <section className="live-session-hero-card">
                <div className="live-session-hero-topline">
                  <div>
                    <div className="live-session-section-kicker">ENERGY PROGRESS</div>
                    <div className="live-session-hero-title">Your charge is {isCharging ? "in progress" : "on hold"}</div>
                  </div>
                  <div className={"live-session-status-pill " + (isCharging ? "is-charging" : "is-paused")}>
                    <span className="live-session-status-dot" />
                    <span>Charging {isCharging ? "ON" : "OFF"}</span>
                  </div>
                </div>

                <div className="live-session-progress-wrap">
                  <div className="live-session-progress-halo" />
                  <div className="live-session-progress-ring">
                    <svg viewBox="0 0 200 200" role="img" aria-label={(displayPercent.toFixed(0) + "% energy utilized")}>
                      <defs>
                        <linearGradient id="liveSessionProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#65f6b0" />
                          <stop offset="55%" stopColor="#04bfbf" />
                          <stop offset="100%" stopColor="#4778ff" />
                        </linearGradient>
                      </defs>
                      <circle className="live-session-progress-track" cx="100" cy="100" r="86" />
                      <circle
                        className="live-session-progress-value"
                        cx="100"
                        cy="100"
                        r="86"
                        strokeDasharray="540.35"
                        strokeDashoffset={540.35 - (usagePercent / 100) * 540.35}
                        style={{ transition: isCharging ? undefined : "none" }}
                      />
                    </svg>
                    <div className="live-session-progress-center">
                      <div className="live-session-progress-number">{displayPercent.toFixed(0)}<span>%</span></div>
                      <div className="live-session-progress-label">UTILIZED</div>
                      <div className="live-session-progress-state"><FiBatteryCharging aria-hidden="true" /> {isCharging ? "Charging" : "Paused"}</div>
                    </div>
                  </div>
                </div>

                <div className="live-session-energy-total">
                  <strong>{energyConsumed.toFixed(2)} <span>kWh</span></strong>
                  <span>energy delivered of {energySelected.toFixed(2)} kWh selected</span>
                </div>

                <div className="live-session-eta-grid">
                  <div className="live-session-eta-item">
                    <div className="live-session-eta-label"><FiClock aria-hidden="true" /> EST. FINISH</div>
                    {etaDisplay.timeStr ? (
                      <>
                        <div className="live-session-eta-value">{etaDisplay.timeStr}</div>
                        <div className="live-session-eta-sub">today</div>
                      </>
                    ) : (
                      <div className="live-session-eta-value is-muted">{usagePercent >= 1 ? "Calculating…" : "Waiting for data"}</div>
                    )}
                  </div>
                  <div className="live-session-eta-item is-teal">
                    <div className="live-session-eta-label"><FiActivity aria-hidden="true" /> TIME LEFT</div>
                    <div className="live-session-eta-value">{etaDisplay.remaining || "—"}</div>
                    <div className="live-session-eta-sub">estimated remaining</div>
                  </div>
                </div>
              </section>

              <aside className="live-session-side-column">
                <section className="live-session-card live-session-metrics-card">
                  <div className="live-session-card-heading">
                    <div>
                      <div className="live-session-section-kicker">LIVE TELEMETRY</div>
                      <h2>Session metrics</h2>
                    </div>
                    <div className="live-session-live-indicator"><span /> LIVE</div>
                  </div>
                  <div className="live-session-metrics-grid">
                    <div className="live-session-metric live-session-metric-primary">
                      <div className="live-session-metric-icon"><FiZap aria-hidden="true" /></div>
                      <div><span>Energy consumed</span><strong>{energyConsumed.toFixed(2)} <small>kWh</small></strong></div>
                    </div>
                    <div className="live-session-metric">
                      <div className="live-session-metric-icon"><FiDollarSign aria-hidden="true" /></div>
                      <div><span>Amount utilized</span><strong>₹{amountUtilized}</strong></div>
                    </div>
                    <div className="live-session-metric">
                      <div className="live-session-metric-icon"><FiActivity aria-hidden="true" /></div>
                      <div><span>Current</span><strong>{current.toFixed(1)} <small>A</small></strong></div>
                    </div>
                    <div className="live-session-metric">
                      <div className="live-session-metric-icon"><FiRadio aria-hidden="true" /></div>
                      <div><span>Voltage</span><strong>{voltage.toFixed(1)} <small>V</small></strong></div>
                    </div>
                  </div>
                </section>

                <section className="live-session-card live-session-details-card">
                  <div className="live-session-card-heading">
                    <div>
                      <div className="live-session-section-kicker">SESSION OVERVIEW</div>
                      <h2>Session details</h2>
                    </div>
                    <FiPlug className="live-session-heading-icon" aria-hidden="true" />
                  </div>
                  <div className="live-session-detail-list">
                    <div className="live-session-detail-row"><span>Energy selected</span><strong>{energySelected.toFixed(2)} kWh</strong></div>
                    <div className="live-session-detail-row"><span>Amount paid</span><strong>₹{Number(amountPaid || 0).toFixed(1)}</strong></div>
                    <div className="live-session-detail-row"><span>Session status</span><strong className={isCharging ? "is-positive" : "is-muted"}>{isCharging ? "Charging" : "Not charging"}</strong></div>
                    <div className="live-session-detail-row"><span>Started</span><strong>{(startTime || sessionData?.startTime || sessionData?.start_time) ? new Date(startTime || sessionData?.startTime || sessionData?.start_time).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) : "—"}</strong></div>
                  </div>
                </section>

                <section className="live-session-card live-session-device-details-card">
                  <div className="live-session-card-heading">
                    <div>
                      <div className="live-session-section-kicker">HARDWARE</div>
                      <h2>Device details</h2>
                    </div>
                    <FiCpu className="live-session-heading-icon" aria-hidden="true" />
                  </div>
                  <div className="live-session-device-detail-grid">
                    <div><span>Charger ID</span><strong>{deviceIdToShow || "—"}</strong></div>
                    <div><span>Relay state</span><strong className={isCharging ? "is-positive" : "is-muted"}>{relayState}</strong></div>
                    <div className="is-wide"><span>Location</span><strong>{deviceDetails?.location || "—"}</strong></div>
                  </div>
                </section>
              </aside>
            </div>

            <section className="live-session-action-card">
              <div className="live-session-action-copy">
                <div className="live-session-action-icon"><FiShield aria-hidden="true" /></div>
                <div>
                  <strong>Control your charging session</strong>
                  <span>Stop only when you are ready to end this session.</span>
                </div>
              </div>
              <button
                type="button"
                className="live-session-stop-button"
                onClick={() => {
                  setDragX(0);
                  setStopSliderSuccess(false);
                  setShowStopConfirmPopup(true);
                }}
              >
                <FiStopCircle aria-hidden="true" />
                Stop charging
                <FiChevronRight aria-hidden="true" />
              </button>
            </section>

            {showPopup && (
              <div className="live-session-modal-overlay" onClick={() => setShowPopup(false)}>
                <div className="live-session-modal" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="live-session-modal-close" onClick={() => setShowPopup(false)} aria-label="Close session information"><FiX aria-hidden="true" /></button>
                  <div className="live-session-modal-icon"><FiInfo aria-hidden="true" /></div>
                  <div className="live-session-section-kicker">SESSION REFERENCE</div>
                  <h3>Charging session info</h3>
                  <div className="live-session-modal-list">
                    <div><span>Charger ID</span><strong>{deviceIdToShow || "—"}</strong></div>
                    <div><span>Session ID</span><strong>{sessionId || sessionData?.sessionId || sessionData?._id || "—"}</strong></div>
                    <div><span>Transaction ID</span><strong>{transactionId || sessionData?.transactionId || sessionData?.transaction_id || "—"}</strong></div>
                    <div><span>Start date</span><strong>{(startTime || sessionData?.startTime || sessionData?.start_time) ? new Date(startTime || sessionData?.startTime || sessionData?.start_time).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—"}</strong></div>
                    <div><span>Start time</span><strong>{(startTime || sessionData?.startTime || sessionData?.start_time) ? new Date(startTime || sessionData?.startTime || sessionData?.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}</strong></div>
                    <div><span>Amount paid</span><strong>₹{amountPaid}</strong></div>
                    <div><span>Energy selected</span><strong>{energySelected.toFixed(2)} kWh</strong></div>
                  </div>
                </div>
              </div>
            )}

            {showStopConfirmPopup && (
              <div className="live-session-modal-overlay" onClick={closeStopPopup}>
                <div className={"live-session-modal live-session-stop-modal " + (stopSliderSuccess ? "is-success" : "")} onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="live-session-modal-close" onClick={closeStopPopup} aria-label="Close stop confirmation"><FiX aria-hidden="true" /></button>
                  <div className={"live-session-modal-icon is-danger " + (stopSliderSuccess ? "is-success" : "")}>
                    {stopSliderSuccess ? <FiCheck aria-hidden="true" /> : <FiStopCircle aria-hidden="true" />}
                  </div>
                  <div className="live-session-section-kicker">SESSION CONTROL</div>
                  <h3>{stopSliderSuccess ? "Stopping session…" : "Stop charging?"}</h3>
                  <p>{stopSliderSuccess ? "Please wait while we safely end the charging session." : "Slide to confirm and safely stop the current charging session."}</p>
                  <div className="live-session-slide-shell">
                    <div className={"live-session-slide-label " + (stopSliderSuccess ? "is-success" : "")}>
                      {stopSliderSuccess ? "Confirmed" : dragX >= MAX_DRAG * 0.88 ? "Release to stop" : "Slide to stop charging"}
                    </div>
                    <div
                      className={"live-session-slide-track " + (isDragging ? "is-dragging " : "") + (stopSliderSuccess ? "is-success" : "")}
                      ref={sliderTrackRef}
                      style={{ width: SLIDER_WIDTH, maxWidth: "100%" }}
                    >
                      <div className={"live-session-slide-shimmer " + (isDragging || stopSliderSuccess ? "is-hidden" : "")} />
                      <div className={"live-session-slide-fill " + (stopSliderSuccess ? "is-success" : "")} style={{ width: dragX + KNOB_SIZE / 2 }} />
                      {!stopSliderSuccess && <div className="live-session-slide-arrows"><span>»</span><span>»</span><span>»</span></div>}
                      <div
                        className={"live-session-slide-thumb " + (isDragging ? "is-dragging " : "") + (stopSliderSuccess ? "is-success" : "")}
                        style={{
                          transform: "translateX(" + dragX + "px) scale(" + (isDragging ? 1.03 : 1) + ")",
                          transition: isDragging ? "none" : "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease"
                        }}
                        onMouseDown={(e) => startDrag(e.clientX)}
                        onTouchStart={(e) => startDrag(e.touches[0].clientX)}
                      >
                        {stopSliderSuccess ? <FiCheck aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
                      </div>
                    </div>
                  </div>
                  {!stopSliderSuccess && <button type="button" className="live-session-cancel-button" onClick={closeStopPopup}>Cancel</button>}
                </div>
              </div>
            )}

            {showPausePopup && (
              <div className="live-session-modal-overlay" onClick={handleDismissPopup}>
                <div className="live-session-modal live-session-pause-modal" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="live-session-modal-close" onClick={handleDismissPopup} aria-label="Close pause message"><FiX aria-hidden="true" /></button>
                  <div className="live-session-modal-icon is-warning"><FiAlertCircle aria-hidden="true" /></div>
                  <div className="live-session-section-kicker">CHARGER ALERT</div>
                  {pausedReason === "offline" ? (
                    <>
                      <h3>Device offline</h3>
                      <p>Charger is offline or powered off.</p>
                      <p>Session remains active. Wait for reconnection or stop the session manually.</p>
                    </>
                  ) : (
                    <>
                      <h3>Charging paused</h3>
                      <p>Charging is paused due to the emergency button.</p>
                      <p>Press the button for 5 seconds to resume, or the session ends in <strong>{minutes}:{seconds.toString().padStart(2, "0")}</strong></p>
                    </>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <FooterNav />
    </>
  );
}
