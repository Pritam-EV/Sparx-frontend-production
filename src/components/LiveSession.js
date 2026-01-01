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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  
  const [pausedReason, setPausedReason] = useState(null);  // "voltage" or "button"
const [timeLeft, setTimeLeft] = useState(0);
const [showPausePopup, setShowPausePopup] = useState(false);

    // Extract from navigation state
  // --- normalize incoming location.state (accept multiple shapes) ---
const rawState = location.state || {};
const locationState = rawState; // if older code references this
const { sessionId: paramSessionId } = useParams();
const sessionId = paramSessionId || rawState.sessionId || rawState._id || rawState.id || null;
const deviceIdRaw = rawState.deviceId || rawState.device_id || rawState.chargerId || null;
const energySelectedRaw = rawState.energySelected ?? rawState.energy_selected ?? rawState.energy ?? 0;
const amountPaidRaw = rawState.amountPaid ?? rawState.amount_paid ?? rawState.amount ?? 0;
const transactionId = rawState.transactionId || rawState.transaction_id || rawState.txn || null;
const startDate = rawState.startDate || rawState.start_date || rawState.start || '';
const startTime = rawState.startTime || rawState.start_time || rawState.startedAt || '';
const deviceIdToUse = sessionData?.deviceId || sessionId; // If deviceId unavailable, consider using sessionId fallback or handle null.
const deviceId = deviceIdRaw;
const energySelected = Number(energySelectedRaw) || 0;



// normalize & format amount
const numericAmount = Number(amountPaidRaw);
const displayAmount = Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : '0.00';
const minutes = Math.floor(timeLeft / 60);
const seconds = timeLeft % 60;

  // coerce numeric safely
  const amountPaid = amountPaidRaw !== undefined && amountPaidRaw !== null ? amountPaidRaw : "" ;


  // fallback device id to sessionData if available
  const deviceIdToShow = deviceId || sessionData?.deviceId || sessionData?.device_id || null;

  const [deviceDetails, setDeviceDetails] = useState(null);
  const [power, setPower] = useState(0);
  const [current, setCurrent] = useState(0);
  const [voltage, setVoltage] = useState(0);
  const [relayState, setRelayState] = useState('OFF');       // ← NEW
  const [energyConsumed, setEnergyConsumed] = useState(0);
  // Pause popup state

  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);            // stores countdown interval id
  const lastSessionIdRef = useRef(null);   // remembers the last known active sessionId for redirect
  const pauseInitializedRef = useRef(false);

  const deviceIdFromState = locationState.deviceId || sessionData?.deviceId || sessionData?.device_id || null;

    // After energySelected, amountPaid, and energyConsumed are available:
  const energySelectedNum = Number(energySelected) || 0;
  const energyConsumedSafe = Number(energyConsumed) || 0;

  // Guard: percentage ∈ [0, 100], and avoid division by zero
  const usagePercent = energySelectedNum > 0
    ? clamp((energyConsumedSafe / energySelectedNum) * 100, 0, 100)
    : 0;

  const isFull = usagePercent >= 100;

  // Amount utilized must be within [0, amountPaid]
  const frac = energySelectedNum > 0 ? clamp(energyConsumedSafe / energySelectedNum, 0, 1) : 0;
  const amountUtilized = (frac * (Number(amountPaid) || 0)).toFixed(2);


  const relayRef = useRef(relayState);
  useEffect(() => { relayRef.current = relayState; }, [relayState]);

  const intervalRef = useRef(null);

  // Add near other derived values
  const isCharging = relayState === 'ON';

  // Hold last shown percent when turning OFF so UI truly "freezes"
  const frozenUsageRef = useRef(0);
  useEffect(() => {
    if (!isCharging) {
      frozenUsageRef.current = usagePercent; // capture last ON value
    }
  }, [isCharging, usagePercent]);

  const displayPercent = isCharging ? usagePercent : frozenUsageRef.current;


const fetchActiveSession = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('Fetching from URL:', `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/active`);
    
    const res = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Response status:', res.status, res.statusText);

    if (res.status === 404) {
      const lastId = lastSessionIdRef.current;
      if (lastId) {
        console.log('Session ended, redirecting to summary:', lastId);
        lastSessionIdRef.current = null;
        navigate('/session-summary', { state: { sessionId: lastId } });
      } else {
        console.log('No active session or lastId, going home');
        navigate('/');
      }
      return;
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', res.status, errorText);
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      return; // Don't crash on other errors
    }

    const data = await res.json();
    console.log('FE DEBUG: fetchActiveSession success:', data);

    // Update states...
    setVoltage(Number(data.voltage) || 0);
    setCurrent(Number(data.current) || 0);
    setEnergyConsumed(Number(data.energyConsumed) || 0);
    const normalizedRelay = data.relayState?.toUpperCase() === 'ON' ? 'ON' : 'OFF';
    setRelayState(normalizedRelay);
    
    
    if (data.sessionId) lastSessionIdRef.current = data.sessionId;


// ✅ NEW LOGIC: Prioritize status over relayState
const deviceStatus = data.status?.toString().toLowerCase();
const isOffline = deviceStatus === 'offline';
const isCharging = relayState === 'ON' && !isOffline; // Truthful charging state
const isPausedByBackend = deviceStatus === 'paused';
    
console.log('Device status:', deviceStatus, 'relayState:', normalizedRelay); // DEBUG

// Show OFF if offline OR paused OR relay actually OFF

if (isOffline || isPausedByBackend || normalizedRelay === 'OFF') {
  if (!showPausePopup) {
    console.log('FE DEBUG: Device OFF/Offline/Paused → showing pause popup');
    setShowPausePopup(true);
    setPausedReason('offline'); // New reason for clarity
    setTimeLeft(300);
  }
} else if (normalizedRelay === 'ON' && !isOffline && !showPausePopup) {
  // Only hide popup if truly charging (ON + not offline)
  console.log('FE DEBUG: Resumed charging → hiding pause popup');
  setShowPausePopup(false);
  setPausedReason(null);
  setTimeLeft(0);
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

  } catch (err) {
    console.error('Unexpected error while fetching active session:', err);
    // Don't redirect on network errors - keep trying
  }
};







useEffect(() => {
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setShowMenu(false); // ✅ close when clicked outside
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

useEffect(() => {
  fetchActiveSession(); // Initial fetch
  const intervalRef = setInterval(fetchActiveSession, 5000);
  return () => clearInterval(intervalRef);
}, []);


  useEffect(() => {
    const deviceIdToUse = sessionData?.deviceId || sessionId; // If deviceId unavailable, consider using sessionId fallback or handle null.
      if (!deviceIdToUse) return;
    const fetchDeviceDetails = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const idToFetch = deviceId || deviceIdFromState;
        if (!idToFetch) return;

        const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/devices/public/${idToFetch}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
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
  },[deviceIdToUse]);


  useEffect(() => {
  if (!sessionId) return;
  
  const fetchSessionById = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/${sessionId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch session data.");
      const data = await res.json();
      setSessionData(data);
      // Update other states based on fetched session
      setVoltage(Number(data.voltage) || 0);
      setCurrent(Number(data.current) || 0);
      setEnergyConsumed(Number(data.energyConsumed) || 0);
      setRelayState((data.relayState || data.relay || '').toString().toUpperCase() === 'ON' ? 'ON' : 'OFF');
      
      // Save sessionId to ref for later redirects
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
       console.log('Current relay state:', relayRef.current, ' showPausePopup=', showPausePopup);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStop = async () => {
    const endTime = new Date().toISOString();
    try {
      if (!sessionData) throw new Error("No session data");
      const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          sessionId: sessionData?.sessionId,
          deviceId: deviceId || deviceIdFromState,
          endTime,
          endTrigger: 'manual',
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend stop failed: ${errorText}`);
      }
      navigate('/session-summary', { state: { sessionId: sessionData?.sessionId } });
    } catch (err) {
      console.error('❌ Error stopping session:', err);
      alert('Failed to stop session. Please try again.');
    }
  };

  // Manage countdown interval for 'button' pause using timerRef to prevent duplicate intervals
  useEffect(() => {
    // Start interval only when popup is visible, reason is 'button' and timeLeft > 0
    if (pausedReason === 'button' && timeLeft > 0 && !timerRef.current) {
      console.log('[FE DEBUG] Starting countdown interval, timeLeft=', timeLeft);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            console.log('[FE DEBUG] Countdown reached zero, clearing interval');
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // If popup not visible or reason changed, clear any existing interval
        if (pausedReason !== 'button') {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            console.log('[FE DEBUG] Cleared countdown interval because pause ended or reason changed');
          }
        }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showPausePopup, pausedReason]);




  


  return (
    <>
      <style>{`
        :root {
          --fill-green: #01d146;
          --wave1-color: rgba(0, 200, 83, 0.85);
          --wave2-color: rgba(5, 177, 76, 0.55);
        }
.ev-screen {
   height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 60px 16px 60px; /* top-bar + bottom nav space */
  color: white;
  font-family: 'Calibri', sans-serif;
  overflow-y: auto;
  background: radial-gradient(circle at top, #0f2b4eff, #2c2c2cff), 
              url('/energy-grid-overlay.png');
  background-size: cover, 200px 200px; /* radial covers, grid repeats */
  background-blend-mode: overlay;
}
  .content-wrapper {
  flex: 1;
  overflow-y: scroll;        /* ✅ scrolling when overflow */
  padding-bottom: 80px;    /* space above bottom bar */
 /* transform: scale(0.9);  */ /* ✅ zoom out */
  transform-origin: top center;
  
  /* Hide scrollbar (WebKit & Firefox) */
  scrollbar-width: none; /* Firefox */
}
  .content-wrapper::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}
.header-text {
  text-align: center;
  margin: 0 auto 20px;
  line-height: 1.3;
  max-width: 80%;
}

.header-text .line1 {
  font-size: 14px;
  color: #cdebf5;
}

.header-text .line2 {
  font-size: 18px;
  font-weight: bold;
  color: #04bfbf;
}

.header-text .line3 {
  font-size: 14px;
  color: #cdebf5;
}

.header-text .line4 {
  font-size: 14px;
  color: #9bcdd2;
}


.header-text p {
  margin: 0;
}

.header-text strong {
  color: #04bfbf;
}
        .charging-status {
          margin-bottom: 20px;
          font-size: 1.2em;
        }
        .on {
          color: #0f0;
        }
        .off {
          color: red;
        }

.menu-container {
  position: relative;
}

.menu-button {
  background: transparent;
  border: none;
  font-size: 20px;
  color: #fff;
  cursor: pointer;
}

.dropdown-menu {
  position: absolute;
  top: 24px;
  right: 0;
  background: rgba(0,0,0,0.9);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  min-width: 140px;
}


.dropdown-menu button {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: #fff;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
}

.dropdown-menu button:hover {
  background: rgba(255,255,255,0.1);
}

.dropdown-menu .stop-btn {
  background: #D32F2F;
  color: #fff;
}

.dropdown-menu .stop-btn:hover {
  background: #b71c1c;
}


/* Make main section adapt to screen height */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
}

          /* Circular charging container */
.circular-container {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 20px auto;
}

/* Background circle */
.circular-bg {
  fill: none;
  stroke: rgba(255,255,255,0.1);
  stroke-width: 12;
}

/* Foreground progress circle */
.circular-progress {
  fill: none;
  stroke: #04bfbf;
  stroke-width: 12;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 0.5s ease;
  filter: drop-shadow(0 0 6px #04bfbf);
}

/* Glow sweep effect */
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
  0%   { stroke-dashoffset: 565; }
  100% { stroke-dashoffset: 0; }
}
        
        .info-block {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid white;
          border-radius: 25px;
          width: 90%;
          margin: 0 auto 20px;
        }
        .info-block .cell {
          padding: 15px;
        }
        .top-left {
          border-bottom: 1px solid white;
          border-right: 1px solid white;
          text-align: left;
        }
        .top-right {
          border-bottom: 1px solid white;
          text-align: right;
        }
        .bottom-left {
          border-right: 1px solid white;
          text-align: left;
        }
        .bottom-right {
          text-align: right;
        }
        .label {
          font-size: 0.8em;
          text-align: center;
        }
        .value {
          font-size: 1.5em;
          color: #04bfbf;
          text-align: center;
        }
        .value1 {
          font-size: 1.5em;
          color: #F2A007;
          text-align: center;
        }
        .voltage-current-block {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid white;
          border-radius: 25px;
          width: 90%;
          margin: 0 auto 20px;
          padding: 15px;
        }
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          backdrop-filter: blur(8px);
          background-color: rgba(53, 53, 53, 0);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
        }
        .popup-box {
          background: rgba(14, 13, 13, 0.78);
          border: 2px solid #026873;
          border-radius: 15px;
          padding: 20px 30px;
          width: 70%;
          max-width: 400px;
          color: #fff;
          position: relative;
        }
        .popup-box h3 {
          margin-bottom: 10px;
          color: #04bfbf;
        }
        .popup-box span {
          color: #04bfbf;
          font-weight: bold;
        }
        .close-btn {
          position: absolute;
          top: 8px;
          right: 12px;
          font-size: 20px;
          color: white;
          cursor: pointer;
        }
      `}</style>

      <div className="ev-screen">
        <div className="top-bar">
          <img src="/logo.png" alt="Sparx Logo" className="top-bar-logo" />
          </div>

  {/* Scrollable & zoomed content */}
  <div className="content-wrapper">
      <div className="header">
<div className="header-text">
  <p className="line1">You are connected to</p>
  <p className="line2">{deviceDetails ? deviceDetails.device_id : deviceIdFromState || "—"}</p>
  <p className="line3">at</p>
  <p className="line4">
    {deviceDetails
      ? `${deviceDetails.location ?? ""} `
      : "loading device info..."}
  </p>
</div>

<div className="menu-container" ref={menuRef}>
  <button className="menu-button" onClick={() => setShowMenu(!showMenu)}>
    ⋮
  </button>
  {showMenu && (
    <div className="dropdown-menu">
      <button onClick={() => { setShowPopup(true); setShowMenu(false); }}>
        More Info
      </button>
      <button
        className="stop-btn"
        onClick={() => { handleStop(); setShowMenu(false); }}
      >
        Stop Session
      </button>
    </div>
  )}
</div>

</div>

<div className="main-content">
        {/* Charging status */}
<p className="charging-status">
  <span className={isCharging ? 'on' : 'off'}>
    Charging {isCharging ? 'ON' : 'OFF'}
  </span>
</p>


<div className="circular-container">
  <svg width="180" height="180" viewBox="0 0 200 200">
    {/* Background circle */}
    <circle className="circular-bg" cx="100" cy="100" r="90" />

    {/* Main progress */}
    <circle
      className="circular-progress"
      cx="100"
      cy="100"
      r="90"
      strokeDasharray="565"
      strokeDashoffset={565 - (usagePercent / 100) * 565}
            // Freeze transition while stale
       style={{ transition: isCharging ? undefined : 'none' }}  // freeze motion on OFF
    />

    {/* Glow sweep */}
    <defs>
      <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgba(9, 218, 61, 0.29)" />
        <stop offset="50%" stopColor="#08d619ff" />
        <stop offset="100%" stopColor="rgba(9, 218, 61, 0.29)" />
      </linearGradient>
    </defs>
    <circle
      className="circular-glow"
      cx="100"
      cy="100"
      r="90"
      // Pause the glow animation while stale
      style={{ animationPlayState: isCharging ? 'running' : 'paused' }} // pause glow on OFF
    />
  </svg>

  {/* Percentage text */}
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '25px', fontWeight: 'bold', color: '#09e02dff' }}>
      {displayPercent.toFixed(0)}%
    </div>
    <div style={{ fontSize: '15 px', color: '#09e02dff' }}></div>
  </div>
</div>


        {/* Info blocks (Energy and Amounts) */}
        <div className="info-block">
          <div className="cell top-left">
            <div className="label">Energy Consumed</div>
            <div className="value">{energyConsumed.toFixed(2)}</div>
          </div>
          <div className="cell top-right">
            <div className="label">Energy Selected</div>
            <div className="value">{energySelected.toFixed(2)}</div>
          </div>
          <div className="cell bottom-left">           
            <div className="value">{amountUtilized}</div>
            <div className="label">Amount Utilized</div>
          </div>
          <div className="cell bottom-right">
            <div className="value">{amountPaid}</div>
            <div className="label">Amount Paid</div>
          </div>
        </div>

        {/* Voltage & Current */}
        <div className="voltage-current-block">
          <div>
            <div className="value1">{voltage.toFixed(1)}V</div>
            <div className="label">Voltage</div>
          </div>
          <div>
            <div className="value1">{current.toFixed(1)}A</div>
            <div className="label">Current</div>
          </div>
        </div>

        {/* Popup with session details */}
        {showPopup && (
          <div className="popup-overlay" onClick={() => setShowPopup(false)}>
            <div className="popup-box" onClick={e => e.stopPropagation()}>
              <div className="close-btn" onClick={() => setShowPopup(false)}>✕</div>
              <h3>Charging Session Info</h3>
              <p><span>ChargerId:</span> {deviceIdToShow || '—'}</p>
              <p><span>SessionId:</span> {sessionId || sessionData?.sessionId || sessionData?._id || '—'}</p>
              <p><span>TransactionId:</span> {transactionId || sessionData?.transactionId || sessionData?.transaction_id || '—'}</p>
              <p><span>Start Date:</span> {startDate || sessionData?.startDate || sessionData?.start_date || '—'}</p>
              <p><span>Start Time:</span> {startTime || sessionData?.startTime || sessionData?.start_time || '—'}</p>
              <p><span>Amount Paid:</span> ₹{displayAmount}</p>
              <p><span>Energy Selected:</span> {energySelected.toFixed(2)} kWh</p>
            </div>
          </div>
        )}




                  {/* Popup for paused session */}
{showPausePopup && (
  <div className="popup-overlay" onClick={() => setShowPausePopup(false)}>
    <div className="popup-box" onClick={e => e.stopPropagation()} style={{ width: '300px', height: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="close-btn" onClick={() => setShowPausePopup(false)}>✕</div>
      
      {pausedReason === 'offline' ? (
        <div style={{ padding: '10px', textAlign: 'center' }}>
          <h3 style={{ color: '#04bfbf' }}>Device Offline</h3>
          <p>Charger is offline or powered off.</p>
          <p>Session active. Wait for reconnection or <strong>Stop Session</strong>.</p>
        </div>
      ) : (
        <div style={{ padding: '10px', textAlign: 'center' }}>
          <h3 style={{ color: '#04bfbf' }}>Charging Paused</h3>
          <p>Paused due to emergency button.</p>
          <p>Press button for 5s to resume or session ends in <strong>{minutes}:{seconds.toString().padStart(2, "0")}</strong></p>
          {timeLeft === 0 && (() => {
            const sid = lastSessionIdRef.current;
            if (sid) {
              console.log('[FE DEBUG] Countdown finished → redirecting to summary');
              lastSessionIdRef.current = null;
              navigate('/session-summary', { state: { sessionId: sid } });
            }
            return null;
          })()}
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
