import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAlertStore } from '../store/alertStore';
import { WSAlertPayload } from '../types';

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectDelayRef = useRef(1000);
  const { addAlert, setConnectionStatus } = useAlertStore();

  const connect = () => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/alerts';

    try {
      setConnectionStatus('connecting');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectDelayRef.current = 1000; // Reset backoff
      };

      ws.onmessage = (event) => {
        try {
          const payload: WSAlertPayload = JSON.parse(event.data);
          addAlert(payload);

          // Trigger toast notification based on severity
          const title = `${payload.event_type.toUpperCase()}: ${payload.geofence.geofence_name}`;
          const description = `Vehicle ${payload.vehicle.vehicle_number} (${payload.vehicle.driver_name}) triggered alert.`;

          if (payload.severity === 'critical') {
            toast.error(title, { description, duration: 6000 });
          } else if (payload.severity === 'warning') {
            toast.warning(title, { description, duration: 5000 });
          } else {
            toast.info(title, { description, duration: 4000 });
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        // Exponential backoff reconnect
        const delay = Math.min(reconnectDelayRef.current * 1.5, 30000);
        reconnectDelayRef.current = delay;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        ws.close();
      };
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
};

