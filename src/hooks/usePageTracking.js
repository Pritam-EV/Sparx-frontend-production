// src/hooks/usePageTracking.js
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';

// Cache location for the session — don't re-ask browser every page change
let cachedLocation = null;

const getLocation = () => new Promise((resolve) => {
  if (cachedLocation) return resolve(cachedLocation);
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      cachedLocation = {
        lat: parseFloat(pos.coords.latitude.toFixed(5)),  // 5 decimal = ~1m precision
        lng: parseFloat(pos.coords.longitude.toFixed(5)),
        accuracy: Math.round(pos.coords.accuracy),        // metres
      };
      resolve(cachedLocation);
    },
    () => resolve(null),   // silently fail if denied
    { timeout: 3000, maximumAge: 300000 }  // use cached GPS up to 5 min old
  );
});

export const usePageTracking = () => {
  const location  = useLocation();
  const prevPage  = useRef(null);
  const enterTime = useRef(Date.now());

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) return;

    const currentPage = location.pathname;
    const now         = Date.now();

    getLocation().then((coords) => {
      if (prevPage.current) {
        const timeSpentSec = Math.round((now - enterTime.current) / 1000);
        api.post('/api/activity/track', {
          page:         prevPage.current,
          timeSpentSec,
          location:     coords,   // ← attach coords to every page visit
        }).catch(() => {});
      } else {
        api.post('/api/activity/track', {
          page:         currentPage,
          timeSpentSec: 0,
          location:     coords,
        }).catch(() => {});
      }
    });

    prevPage.current  = currentPage;
    enterTime.current = now;
  }, [location.pathname]);
};