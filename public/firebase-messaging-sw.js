importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase Messaging with config sent from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebase.initializeApp(event.data.config);
    
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('Received background message:', payload);
      
      const notificationTitle = payload.notification?.title || 'WorkLogix';
      const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: '/icon.png',
        badge: '/badge.png',
        data: payload.data || {},
        tag: payload.data?.messageId || 'worklogix-notification',
        requireInteraction: true,
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});

// Handle notification clicks - deep linking
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const navigationUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        const clientPath = new URL(client.url).pathname;
        const targetPath = new URL(navigationUrl, self.location.origin).pathname;
        
        if (clientPath === targetPath || clientPath.startsWith('/')) {
          return client.focus();
        }
      }
      
      // If no matching window, open new one
      if (clients.openWindow) {
        return clients.openWindow(navigationUrl);
      }
    })
  );
});
