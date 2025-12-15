import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NotificationPermissionBanner() {
  const { isAvailable, notificationStatus, requestPermission } = useNotificationPermission();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAvailable && Notification.permission === 'default' && notificationStatus === 'idle') {
      setVisible(true);
    }
  }, [isAvailable, notificationStatus]);

  if (!visible || notificationStatus !== 'idle') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:bottom-4 md:right-4 md:left-auto md:top-auto bg-card border border-border rounded-lg p-4 shadow-lg max-w-sm z-40">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Enable Notifications</p>
          <p className="text-xs text-muted-foreground mt-1">
            Get instant alerts for new messages and announcements
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            requestPermission();
            setVisible(false);
          }}
          className="flex-1"
          data-testid="button-enable-notifications"
        >
          Enable
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setVisible(false)}
          data-testid="button-dismiss-notifications"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
