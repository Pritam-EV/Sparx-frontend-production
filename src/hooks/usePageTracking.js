// src/hooks/usePageTracking.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) return; // Only track logged-in users

    api.post('/activity/track', {
      page: location.pathname,
      timestamp: new Date().toISOString(),
      userId: user._id || user.uid,
    }).catch(() => {}); // Silently fail — never break UX
  }, [location.pathname]); // Fires on every page change
};