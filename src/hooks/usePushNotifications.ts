// src/hooks/usePushNotifications.ts
'use client';

import { useEffect, useState } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '@/lib/firebase/config';

/**
 * usePushNotifications – request notification permission, retrieve FCM token,
 * and optionally handle foreground messages.
 */
export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    // Check existing permission
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if (!messaging) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      try {
        const fcmToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });
        console.log('FCM token →', fcmToken);
        setToken(fcmToken);
        // TODO: send token to backend / Firestore for later push targeting
      } catch (err) {
        console.error('Error retrieving FCM token', err);
      }
    }
  };

  useEffect(() => {
    // Optional foreground message handling – you can extend this with UI toast
    if (!messaging || typeof messaging.onMessage !== 'function') return;
    
    const unsubscribe = messaging.onMessage((payload: any) => {
      console.log('Foreground message 📬', payload);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { token, permission, isSupported, requestPermission };
};
