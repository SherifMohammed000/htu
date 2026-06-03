// public/firebase-messaging-sw.js
// Service Worker for Firebase Cloud Messaging (FCM)
// Handles background push notifications when the app is closed or not in focus.

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase config – same values used in src/lib/firebase/config.ts
const firebaseConfig = {
  apiKey: "AIzaSyCuYOcwWXMlqfjcUSAXyo8Mazb-7xxZhzs",
  authDomain: "smart-qr1.firebaseapp.com",
  projectId: "smart-qr1",
  storageBucket: "smart-qr1.firebasestorage.app",
  messagingSenderId: "331379787968",
  appId: "1:331379787968:web:d17888fb8345b322824525",
  measurementId: "G-6DQGQNTC52"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Received background message ', payload);
  const title = payload.notification?.title || 'Notification';
  const options = {
    body: payload.notification?.body,
    icon: payload.notification?.image || '/uroll-logo.jpg',
  };
  self.registration.showNotification(title, options);
});
