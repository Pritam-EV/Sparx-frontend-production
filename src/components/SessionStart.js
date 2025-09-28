import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

export default function SessionStartPage() {
  const { deviceId, transactionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // UI & state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
//  const [secondsLeft, setSecondsLeft] = useState(10);
//  const [isReady, setIsReady] = useState(false);

  // session object created on backend (or fetched)
//  const [createdSession, setCreatedSession] = useState(null);
//  const createdSessionRef = useRef(null); // keep ref in sync for handlers

  // Stable IDs & refs
  const sessionIdRef = useRef(uuidv4());
  const createdRef = useRef(false); // whether POST /start was attempted
  const sessionReadyRef = useRef(false); // backend session exists
//  const isReadyRef = useRef(false);
  const startedRef = useRef(false); // whether start command sent

  // Stable timestamps (captured once on entry)
  const startTimeRef = useRef(new Date().toISOString());
  const startDateRef = useRef(startTimeRef.current.split('T')[0]);

  // Values from navigation state (amount/energy)
  const energySelected = location.state?.energySelected;
  const amountPaid = location.state?.amountPaid;

  // Add these new state variables after your existing ones
  const [autoStartTimer, setAutoStartTimer] = useState(10);
  const [autoStartActive, setAutoStartActive] = useState(true);

  const couponCode = location.state?.couponCode;
const reservationId = location.state?.reservationId;

  // Parse user from localStorage (if stored)
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();
  const userId = storedUser?._id || null;

  // keep ref synced with state to avoid stale closures
//  useEffect(() => { createdSessionRef.current = createdSession; }, [createdSession]);

  // Helper: mark ready when backend session exists
  //const checkReady = () => {
  //  if (isReadyRef.current) return;
   // if (sessionReadyRef.current && !error) {
   //   setIsReady(true);
    //  isReadyRef.current = true;
     // setSecondsLeft(10);
   // }
 // };

  /* ------------------------------------------------------------------
 * Auto-start timer (starts immediately on page load)
 * ------------------------------------------------------------------ */
useEffect(() => {
    if (!autoStartActive || startedRef.current) return;
    
    const timer = setInterval(() => {
        setAutoStartTimer(prev => {
            if (prev <= 1) {
                clearInterval(timer);
                setAutoStartActive(false);
                
                // Only trigger if not already started
                if (!startedRef.current) {
                    handleStart();
                }
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(timer);
}, [autoStartActive]);


  /* ------------------------------------------------------------------
   * 1) Create session on backend (runs once)
   *    - if returns 201/200 with session body, store it
   *    - if 409 (already exists), try to fetch by transactionId
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    if (!deviceId || energySelected == null || amountPaid == null) {
      setError('Missing parameters for session creation.');
      setLoading(false);
      return;
    }
     setLoading(false); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, transactionId, energySelected, amountPaid]);

  // Add this utility function in SessionStart.js (before usage)
function normalizeSession(s = {}) {
  return {
    sessionId: s.sessionId || s._id || s.id || '',
    deviceId: s.deviceId || s.device_id || s.chargerId || '',
    amountPaid: s.amountPaid ?? s.amount_paid ?? 0,
    energySelected: s.energySelected ?? s.energy_selected ?? s.energy ?? 0,
    transactionId: s.transactionId || s.transaction_id || '',
    startTime: s.startTime || s.start_time || '',
    startDate: s.startDate || s.start_date || '',
  };
}


  /* ------------------------------------------------------------------
   * 3) Start charging (manual or auto)
   *    - send start command via backend — MQTT handled backend-side
   *    - navigate to LiveSession with full session in state
   * ------------------------------------------------------------------ */
const handleStart = async () => {
    // Atomic check-and-set operation
    if (startedRef.current) {
        console.log('Start already in progress, ignoring duplicate call');
        return;
    }
    
    // Immediately set the flag to prevent concurrent calls
    startedRef.current = true;
    setAutoStartActive(false); // Stop timer immediately
    
    try {
        setLoading(true);
        
        // Single API call with better error handling
        const resp = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
            sessionId: sessionIdRef.current,
            deviceId,
            userId,
            startTime: startTimeRef.current,
            startDate: startDateRef.current,
            amountSelected: location.state.amountSelected, 
            discountApplied: location.state.discountApplied,
            energySelected,
            amountPaid,
            transactionId, // may be undefined for free flows (backend will generate)
            couponCode,
            reservationId,
          }),
        });

        let sessionObj;
        
        if (resp.status === 409) {
            // Session already exists - fetch it
            console.log('Session exists, fetching existing session...');
            const fetchResp = await fetch(
                `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/by-transaction/${transactionId}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            
            if (!fetchResp.ok) {
                throw new Error(`Failed to fetch existing session: ${await fetchResp.text()}`);
            }
            
            sessionObj = await fetchResp.json();
        } else if (resp.status === 201 || resp.status === 200) {
            // Session created successfully
            const respData = await resp.json();
            sessionObj = respData.session || respData;
        } else {
            // Other error
            const errorData = await resp.json();
            throw new Error(errorData.error || `Server error: ${resp.status}`);
        }

        // Navigate to live session
        const sessionToSend = normalizeSession(sessionObj);
        navigate(`/live-session/${sessionToSend.sessionId}`, {
            state: sessionToSend,
        });
        
    } catch (err) {
        console.error('Error creating/fetching session:', err);
        setError(err.message || 'Failed to create session');
        
        // Reset state for retry
        startedRef.current = false;
        setAutoStartActive(true);
        setAutoStartTimer(10);
    } finally {
        setLoading(false);
    }
};


  /* ------------------------------------------------------------------
   * 4) Loading / Error UI
   * ------------------------------------------------------------------ */
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: '#0b0e13' }}>
        <CircularProgress size={60} sx={{ color: '#04BFBF' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  /* ------------------------------------------------------------------
   * 5) Main UI — unchanged, including your images, timers, CSS
   * ------------------------------------------------------------------ */
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a1117',
        px: 2,
      }}
    >
      {/* Instruction Text */}
      <Typography
        variant="h6"
        sx={{
          color: '#ffffff',
          mb: { xs: 1, sm: 2 }, // smaller gap on mobile
          textAlign: 'center',
          fontWeight: 600,
          fontSize: { xs: '1.1rem', sm: '1.3rem' }, // responsive font size
        }}
      >
        Plug in the charger
      </Typography>

      {/* Charger Image */}
      <img
        src="/gun1.png"
        alt="EV Charger Gun"
        loading="eager"
        onLoad={() => setImageLoaded(true)}
        style={{
          width: '200px', // slightly smaller for mobile
          marginBottom: '12px', // reduced gap
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in',
        }}
      />

      {/* Loader when image is loading */}
      {!imageLoaded && <CircularProgress sx={{ color: '#04BFBF', mb: 2 }} />}

        {/* Countdown Text */}
        {autoStartActive && !startedRef.current && (
          <Typography
            variant="body1"
            sx={{
              color: '#04BFBF',
              mt: 8,
              fontSize: { xs: '0.95rem', sm: '1rem' },
              textAlign: 'center',
            }}
          >
           Charging will auto-start in {autoStartTimer}s
          </Typography>
        )}


      {/* Start Now Button */}
      <Button
        variant="contained"
        onClick={handleStart}
        sx={{
          mt: 3, // no extra margin on mobile
          borderRadius: '50%',
          width: { xs: 100, sm: 120 }, // slightly smaller for mobile
          height: { xs: 100, sm: 120 },
          backgroundColor: '#04BFBF',
          color: '#ffff',
          fontWeight: 'bold',
          fontSize: { xs: '0.9rem', sm: '1rem' }, // responsive font
          boxShadow: '0 0 15px #04BFBF',
          animation: 'pulse 2s infinite',
        }}
      >
        START
        <br />
        NOW
      </Button>

      <style>
        {`@keyframes pulse {
            0%   { box-shadow: 0 0 10px rgba(4,191,191,0.5); }
            50%  { box-shadow: 0 0 25px rgba(4,191,191,0.9); }
            100% { box-shadow: 0 0 10px rgba(4,191,191,0.5); }
          }`}
      </style>
    </Box>
  );
}
