// src/hooks/usePageTracking.js
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';

export const usePageTracking = () => {
  const location    = useLocation();
  const prevPage    = useRef(null);
  const enterTime   = useRef(Date.now());

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) return;

    const currentPage = location.pathname;
    const now         = Date.now();

    // Send previous page WITH time spent on it
    if (prevPage.current) {
      const timeSpentSec = Math.round((now - enterTime.current) / 1000);
      api.post('/api/activity/track', {
        page:         prevPage.current,
        timeSpentSec: timeSpentSec,
      }).catch(() => {});
    } else {
      // First page load — send immediately with 0 time
      api.post('/api/activity/track', {
        page:         currentPage,
        timeSpentSec: 0,
      }).catch(() => {});
    }

    prevPage.current  = currentPage;
    enterTime.current = now;
  }, [location.pathname]);
};