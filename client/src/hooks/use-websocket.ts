import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/queryClient';

// Helper to get WebSocket URL from API base URL or current host
function getWebSocketUrl(): string {
  if (API_BASE_URL) {
    // Convert HTTP(S) URL to WS(S) URL
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
    return `${wsUrl}/ws`;
  }
  // Default: use current host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    console.log('[WebSocket] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [onMessage]);

  return wsRef.current;
}
