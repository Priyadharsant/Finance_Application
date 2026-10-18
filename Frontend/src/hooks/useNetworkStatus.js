import { useState, useEffect } from "react";
import { getApiBaseUrl } from "../apiConfig.js";

/**
 * Custom hook to detect network online / offline status in real time.
 * Combines window online/offline events with an active healthcheck ping.
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Double check via lightweight ping
      checkPing();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const checkPing = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
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
        setIsOnline(res.ok || res.status < 500);
      } catch (err) {
        // If aborted or network fetch failed while navigator says online, mark offline
        if (!navigator.onLine || err.name === "AbortError" || err.message?.includes("Failed to fetch")) {
          setIsOnline(false);
        }
      }
    };

    // Run ping every 12 seconds
    const interval = setInterval(checkPing, 12000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
