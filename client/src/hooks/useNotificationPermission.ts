import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isFCMConfigured, requestNotificationPermission } from '@/lib/firebase';
import { apiRequest, queryClient, API_BASE_URL } from '@/lib/queryClient';

export function useNotificationPermission() {
  const { user } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    if (!isFCMConfigured) {
      console.warn('Firebase Cloud Messaging is not configured');
      return;
    }

    setNotificationStatus('requesting');
    setError(null);

    try {
      const token = await requestNotificationPermission();
      
      if (token) {
        await apiRequest(`${API_BASE_URL}/api/device-tokens`, 'POST', {
          token,
          deviceType: 'web',
        });
        setNotificationStatus('granted');
      } else {
        setNotificationStatus('denied');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request notification permission';
      setError(errorMessage);
      setNotificationStatus('denied');
    }
  };

  useEffect(() => {
    if (!user || !isFCMConfigured) return;

    const hasRequestedBefore = localStorage.getItem('notification-permission-requested');
    if (!hasRequestedBefore && Notification.permission === 'default') {
      localStorage.setItem('notification-permission-requested', 'true');
      requestPermission();
    }
  }, [user]);

  return {
    notificationStatus,
    error,
    requestPermission,
    isAvailable: isFCMConfigured && 'Notification' in window,
  };
}
