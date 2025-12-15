import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// Check if Firebase config is complete
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.appId
);

// Check if FCM is configured (requires vapidKey in addition to base config)
const isFCMConfigured = !!(
  isFirebaseConfigured &&
  firebaseConfig.messagingSenderId &&
  import.meta.env.VITE_FIREBASE_VAPID_KEY
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let messaging: Messaging | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  
  if (isFCMConfigured && typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      messaging = getMessaging(app);
      
      // Register service worker for push notifications
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { 
            scope: '/',
          });
          console.log('Service worker registered for push notifications');
          
          // Send Firebase config to all service worker clients
          const clients = await registration.clients.getAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'FIREBASE_CONFIG',
              config: firebaseConfig,
            });
          });
          
          // Also send to controller
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'FIREBASE_CONFIG',
              config: firebaseConfig,
            });
          }
          
          // Listen for updates and send config again
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'FIREBASE_CONFIG',
                config: firebaseConfig,
              });
            }
          });
        } catch (error) {
          console.warn('Service worker registration error (non-critical):', error);
        }
      };
      
      if (document.readyState === 'loading') {
        window.addEventListener('load', registerSW);
      } else {
        registerSW();
      }
    } catch (error) {
      console.error("Failed to initialize Firebase Messaging:", error);
    }
  }
}

export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging || !isFCMConfigured) {
    console.warn("Firebase Messaging not configured");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      
      return token;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
}

export function setupForegroundMessageListener(callback: (payload: any) => void) {
  if (!messaging) {
    return () => {};
  }
  
  return onMessage(messaging, callback);
}

export { auth, googleProvider, messaging, isFirebaseConfigured, isFCMConfigured };
