import { useEffect } from 'react';
import { queryClient, API_BASE_URL } from '@/lib/queryClient';

export function useTaskUpdates() {
  useEffect(() => {
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

    ws.onopen = () => {
      console.log('[WebSocket] Connected for task updates');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'task_updated' || message.type === 'task_deleted') {
          console.log('[WebSocket] Task update received:', message.type);
          // Invalidate tasks query to force refetch
          queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/tasks`] });
          queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/dashboard/stats`] });
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);
}
