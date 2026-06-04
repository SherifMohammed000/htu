// src/components/FaceCapture.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase/config';
import { collection, doc, setDoc } from 'firebase/firestore';

/**
 * Captures the student's face during account activation and uploads it to Cloud Storage
 * via the `/api/face/uploadReference` API. The uploaded image URL is saved on the user
 * document under `faceImageUrl`.
 */
export const FaceCapture = () => {
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setPreview(dataUrl);
  };

  const upload = async () => {
    if (!preview) return;
    setUploading(true);
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert('User not authenticated');
      setUploading(false);
      return;
    }
    // Send base64 image to backend API
    const resp = await fetch('/api/face/uploadReference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, imageBase64: preview }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      alert('Upload failed: ' + err);
    } else {
      // Refresh to update the auth context or redirect directly
      router.push('/student/dashboard');
    }
    setUploading(false);
  };

  // start camera on mount
  useEffect(() => {
    startCamera();
    // cleanup on unmount
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg text-white">
      <h2 className="text-2xl font-bold mb-4 text-center">Capture Your Face</h2>
      <div className="flex flex-col items-center gap-4">
        <video ref={videoRef} autoPlay muted className="w-64 h-64 object-cover rounded-full" />
        <button
          onClick={capture}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition"
        >
          Capture Photo
        </button>
        {preview && (
          <img src={preview} alt="preview" className="w-32 h-32 rounded-full border-2 border-white" />
        )}
        <button
          onClick={upload}
          disabled={uploading}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded transition disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Save Photo'}
        </button>
      </div>
    </div>
  );
};
