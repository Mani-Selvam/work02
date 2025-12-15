import * as admin from 'firebase-admin';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  console.warn('Firebase Admin SDK not initialized: FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
}

let firebaseApp: admin.app.App | null = null;

function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!serviceAccountKey) {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    }) as admin.app.App;
    console.log('Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

export async function sendPushNotification(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  const app = initializeFirebaseAdmin();
  if (!app) {
    console.warn('Cannot send push notification: Firebase Admin SDK not initialized');
    return { successCount: 0, failureCount: deviceTokens.length };
  }

  if (deviceTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const messaging = admin.messaging(app);
    
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: deviceTokens,
    };

    const response = await messaging.sendMulticast(message);

    console.log(`Push notification sent: ${response.successCount} succeeded, ${response.failureCount} failed`);
    
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { successCount: 0, failureCount: deviceTokens.length };
  }
}

export async function sendPushNotificationToUser(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, string>,
  storage?: any
): Promise<{ successCount: number; failureCount: number }> {
  if (!storage) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const deviceTokens = await storage.getDeviceTokensByUserId(userId);
    if (deviceTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = deviceTokens.map(dt => dt.token);
    return await sendPushNotification(tokens, title, body, data);
  } catch (error) {
    console.error('Error sending push notification to user:', error);
    return { successCount: 0, failureCount: 0 };
  }
}
