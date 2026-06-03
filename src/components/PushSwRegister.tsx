// src/components/PushSwRegister.tsx
'use client';

import { useEffect } from 'react';

export const PushSwRegister = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((reg) => console.log('Service Worker registered', reg))
        .catch((err) => console.error('Service Worker registration failed', err));
    }
  }, []);

  return null;
};
