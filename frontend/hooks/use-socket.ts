"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";

interface SocketCallbacks {
  onJobCreated?: (data: any) => void;
  onJobStatusUpdated?: (data: any) => void;
  onJobCompleted?: (data: any) => void;
  onJobCancelled?: (data: any) => void;
}

export function useShopSocket(token: string | null, callbacks: SocketCallbacks) {
  const [isConnected, setIsConnected] = useState(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    const wsUrl = `${API_BASE.replace(/^http/, "ws")}/queue/ws?token=${token}`;

    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data.toString());
            if (message.type === "JOB_CREATED" && callbacksRef.current.onJobCreated) {
              callbacksRef.current.onJobCreated(message.data);
            } else if (
              message.type === "JOB_STATUS_UPDATED" &&
              callbacksRef.current.onJobStatusUpdated
            ) {
              callbacksRef.current.onJobStatusUpdated(message.data);
            } else if (message.type === "JOB_COMPLETED" && callbacksRef.current.onJobCompleted) {
              callbacksRef.current.onJobCompleted(message.data);
            } else if (message.type === "JOB_CANCELLED" && callbacksRef.current.onJobCancelled) {
              callbacksRef.current.onJobCancelled(message.data);
            }
          } catch (err) {
            console.warn("Failed to parse websocket message:", err);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Auto reconnect after 4 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 4000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        reconnectTimeoutRef.current = setTimeout(connect, 4000);
      }
    }

    connect();

    // Heartbeat ping interval every 25 seconds
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "PING" }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [token]);

  return { isConnected };
}

