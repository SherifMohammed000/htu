"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

const VAPID_KEY = "BNWI9jg2I8DiMAmlP9-LiU6R_c8Om4XUOoBRKx628Mq94b2zZfIBLQWpcZGFWMexQno-_9eWzW3pX0hchO-2XW8";

export function usePushNotifications() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setIsSupported(false);
      return;
    }
    
    setIsSupported(true);
    setPermission(Notification.permission);
  }, []);

  const requestPermissionAndRegister = async () => {
    if (!isSupported) return null;

    try {
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === "granted") {
        // Register service worker if not already done
        const registration = await navigator.serviceWorker.ready;
        
        // Import firebase messaging dynamically
        const { getMessaging, getToken } = await import("firebase/messaging");
        const { app } = await import("@/lib/firebase/config");
        
        const messaging = getMessaging(app);
        
        const fcmToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (fcmToken) {
          setToken(fcmToken);
          // Save to user profile in Firestore
          if (user?.id) {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(fcmToken)
            });
            console.log("FCM Token saved to Firestore:", fcmToken);
          }
          return fcmToken;
        } else {
          console.warn("No registration token available. Request permission to generate one.");
        }
      }
    } catch (error) {
      console.error("An error occurred while retrieving token:", error);
    }
    return null;
  };

  // Automatically fetch token if permission is already granted and user is logged in
  useEffect(() => {
    if (isSupported && Notification.permission === "granted" && user?.id) {
      requestPermissionAndRegister();
    }
  }, [isSupported, user?.id]);

  return {
    token,
    permission,
    isSupported,
    requestPermission: requestPermissionAndRegister,
  };
}
