// src/components/FaceVerifyModal.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { useFaceVerification } from '@/hooks/useFaceVerification';

interface Props {
  sessionId: string;
  onSuccess: () => void;
  onFailure: () => void;
  onCancel: () => void;
}

export const FaceVerifyModal: React.FC<Props> = ({ sessionId, onSuccess, onFailure, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Loading face models...');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifying, setVerifying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null);
  
  const { verifyBeforeScan, getAttempts } = useFaceVerification();

  const loadModelsAndReference = async () => {
    try {
      // 1. Load models
      // Ensure you have these models in public/models
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

      setLoadingMsg('Loading your profile image...');
      // 2. Fetch user's reference image
      const auth = getAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Not authenticated');

      const userDoc = await getDoc(doc(db, 'users', uid));
      const storagePath = userDoc.data()?.faceImageStoragePath;
      if (!storagePath) {
        throw new Error('No face reference found. Please activate your account first.');
      }

      // Get download URL
      const imageRef = ref(storage, storagePath);
      const imageUrl = await getDownloadURL(imageRef);

      // Load image and compute descriptor
      const img = await faceapi.fetchImage(imageUrl);
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        throw new Error('Could not detect a face in your reference image.');
      }
      setReferenceDescriptor(detection.descriptor);
      setLoading(false);
      startCamera();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load verification system.');
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setErrorMsg('Failed to access camera.');
    }
  };

  useEffect(() => {
    loadModelsAndReference();
    return () => {
      // stop camera
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleVerify = async () => {
    if (!videoRef.current || !referenceDescriptor || verifying) return;
    setVerifying(true);
    try {
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        throw new Error('No face detected in the live camera.');
      }

      const distance = faceapi.euclideanDistance(referenceDescriptor, detection.descriptor);
      // threshold usually around 0.5 - 0.6
      const isMatch = distance < 0.55;

      const passed = await verifyBeforeScan(sessionId, '', isMatch);

      if (passed) {
        onSuccess();
      } else {
        const attempts = getAttempts();
        if (attempts >= 3) {
          onFailure();
        } else {
          setErrorMsg(`Verification failed. Attempt ${attempts}/3`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification error');
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-900 p-8 rounded-2xl border border-white/20 text-white flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p>{loadingMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-sm p-6 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center">
        <h2 className="text-xl font-bold text-white mb-4">Face Verification</h2>
        {errorMsg && (
          <div className="bg-red-500/20 text-red-200 text-sm p-3 rounded-xl mb-4 w-full text-center border border-red-500/30">
            {errorMsg}
          </div>
        )}
        
        <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-blue-500 mb-6">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>

        <p className="text-sm text-slate-300 mb-6 text-center">
          Please position your face clearly in the camera to verify your identity before scanning the QR code.
        </p>

        <div className="flex gap-4 w-full">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleVerify}
            disabled={verifying}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center"
          >
            {verifying ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Verify'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
