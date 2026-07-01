/**
 * useNotifications — Real-time SSE notification hook
 * Connects to /api/notifications/stream and maintains unread badge counts.
 */
import { useState, useEffect, useRef, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function useNotifications(user) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [bookingBadge, setBookingBadge]   = useState(0);
  const esRef = useRef(null);

  const addNotification = useCallback((payload) => {
    const notif = {
      id:        Date.now() + Math.random(),
      type:      payload.type,
      message:   buildMessage(payload),
      timestamp: new Date().toISOString(),
      read:      false,
      payload,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 50));
    setUnreadCount(c => c + 1);
    if (payload.type === "new_booking" || payload.type === "booking_update") {
      setBookingBadge(c => c + 1);
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setBookingBadge(0);
  }, []);

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem("gs_token");
    if (!token) return;

    let retryTimeout;
    let retryCount = 0;

    function connect() {
      if (esRef.current) { esRef.current.close(); }

      // Use fetch-based SSE with auth header (EventSource doesn't support headers)
      const ctrl = new AbortController();

      fetch(`${API_URL}/notifications/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: ctrl.signal,
      }).then(async (res) => {
        if (!res.ok) return;
        retryCount = 0;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const dataLine = part.split("\n").find(l => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const payload = JSON.parse(dataLine.slice(6));
              if (payload.type !== "connected") addNotification(payload);
            } catch { /* ignore parse errors */ }
          }
        }
        // Connection closed — retry
        scheduleRetry();
      }).catch((err) => {
        if (err.name !== "AbortError") scheduleRetry();
      });

      esRef.current = { close: () => ctrl.abort() };
    }

    function scheduleRetry() {
      const delay = Math.min(1000 * 2 ** retryCount, 30000);
      retryCount++;
      retryTimeout = setTimeout(connect, delay);
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      if (esRef.current) esRef.current.close();
    };
  }, [user?.id, addNotification]);

  return { notifications, unreadCount, bookingBadge, markAllRead, markRead };
}

function buildMessage(payload) {
  if (payload.type === "new_booking") {
    const b = payload.booking;
    return `📋 New booking from ${b?.userName || "a user"} — ${b?.category || "Service"}`;
  }
  if (payload.type === "booking_update") {
    const b = payload.booking;
    const status = (payload.status || b?.status || "updated").replace("_", " ");
    return `🔄 Booking #GS${b?.id} is now ${status}`;
  }
  if (payload.type === "message") {
    return `💬 New message from ${payload.message?.senderName || "someone"} on booking #GS${payload.bookingId}`;
  }
  return "🔔 New notification";
}
