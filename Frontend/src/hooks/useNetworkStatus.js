import { useState, useEffect, useRef } from "react";
import { getApiBaseUrl } from "../apiConfig.js";

const OFFLINE_CONFIRMATION_MS = 7000;

/**
 * Custom hook to detect network online / offline status in real time.
 * Combines window online/offline events with an active healthcheck ping.
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const offlineTimerRef = useRef(null);

  useEffect(() => {
    const clearOfflineTimer = () => {
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
    };

    const scheduleOffline = () => {
      if (offlineTimerRef.current) return;
      offlineTimerRef.current = setTimeout(() => {
        offlineTimerRef.current = null;
        setIsOnline(false);
      }, OFFLINE_CONFIRMATION_MS);
    };

    const handleOnline = () => {
      clearOfflineTimer();
      setIsOnline(true);
      // Double check via lightweight ping
      checkPing();
    };

    const handleOffline = () => {
      scheduleOffline();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const checkPing = async () => {
      if (!navigator.onLine) {
        scheduleOffline();
        return;
      }
      try {
        const apiBase = getApiBaseUrl();
        // Ping backend health or dashboard with a fast timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${apiBase}/loans/dashboard`, {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok || res.status < 500) {
          clearOfflineTimer();
          setIsOnline(true);
        } else {
          scheduleOffline();
        }
      } catch (err) {
        // Confirm the failure for a few seconds before showing Offline.
        if (!navigator.onLine || err.name === "AbortError" || err.message?.includes("Failed to fetch")) {
          scheduleOffline();
        }
      }
    };

    if (!navigator.onLine) scheduleOffline();

    // Run ping every 12 seconds
    const interval = setInterval(checkPing, 12000);

    return () => {
      clearOfflineTimer();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
