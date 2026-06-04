// src/components/FaceVerifyModal.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { useFaceVerification } from '@/hooks/useFaceVerification';

type Challenge = 'smile' | 'turn_left' | 'turn_right' | 'open_mouth';
const ALL_CHALLENGES: Challenge[] = ['smile', 'turn_left', 'turn_right', 'open_mouth'];

const CHALLENGE_MESSAGES = {
  smile: 'Please smile brightly 😊',
  turn_left: 'Turn your head to your left ⬅️',
  turn_right: 'Turn your head to your right ➡️',
  open_mouth: 'Open your mouth wide 😮'
};

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null);
  
  // Liveness State
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentStage, setCurrentStage] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { verifyBeforeScan, getAttempts } = useFaceVerification();

  const loadModelsAndReference = async () => {
    try {
      // 1. Load models
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models'); // Added expression net

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

      const imageRef = ref(storage, storagePath);
      const imageUrl = await getDownloadURL(imageRef);

      const img = await faceapi.fetchImage(imageUrl);
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        throw new Error('Could not detect a face in your reference image.');
      }
      setReferenceDescriptor(detection.descriptor);
      
      // Setup random challenges
      const shuffled = [...ALL_CHALLENGES].sort(() => 0.5 - Math.random());
      setChallenges(shuffled.slice(0, 2));

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
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const runDetectionLoop = async () => {
    if (!videoRef.current || !referenceDescriptor || currentStage >= 2 || isVerifying) return;
    
    try {
      const detection = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptor();
        
      if (!detection) return; // Wait for face

      const challenge = challenges[currentStage];
      let passed = false;

      if (challenge === 'smile') {
        if (detection.expressions.happy > 0.8) passed = true;
      } else if (challenge === 'open_mouth') {
        if (detection.expressions.surprised > 0.7) passed = true;
        // Alternative: use landmarks to measure lip distance
        const topLip = detection.landmarks.positions[62];
        const bottomLip = detection.landmarks.positions[66];
        if (bottomLip.y - topLip.y > 20) passed = true;
      } else if (challenge === 'turn_left') {
        const nose = detection.landmarks.positions[30];
        const leftCheek = detection.landmarks.positions[0];
        const rightCheek = detection.landmarks.positions[16];
        const leftDist = nose.x - leftCheek.x;
        const rightDist = rightCheek.x - nose.x;
        if (leftDist < rightDist * 0.45) passed = true;
      } else if (challenge === 'turn_right') {
        const nose = detection.landmarks.positions[30];
        const leftCheek = detection.landmarks.positions[0];
        const rightCheek = detection.landmarks.positions[16];
        const leftDist = nose.x - leftCheek.x;
        const rightDist = rightCheek.x - nose.x;
        if (rightDist < leftDist * 0.45) passed = true;
      }

      if (passed) {
        setSuccessMsg('Good!');
        setTimeout(() => setSuccessMsg(''), 1000);
        
        const nextStage = currentStage + 1;
        setCurrentStage(nextStage);
        
        if (nextStage === 2) {
          // Liveness passed, compute strict match using the latest detection
          verifyIdentity(detection.descriptor);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!loading && currentStage < 2 && !isVerifying) {
      detectionIntervalRef.current = setInterval(runDetectionLoop, 300);
    }
    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, [loading, currentStage, isVerifying, challenges, referenceDescriptor]);

  const verifyIdentity = async (liveDescriptor: Float32Array) => {
    if (isVerifying || !referenceDescriptor) return;
    setIsVerifying(true);
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);

    try {
      const distance = faceapi.euclideanDistance(referenceDescriptor, liveDescriptor);
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
          // Reset challenges to try again
          setCurrentStage(0);
          const shuffled = [...ALL_CHALLENGES].sort(() => 0.5 - Math.random());
          setChallenges(shuffled.slice(0, 2));
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification error');
    }
    setIsVerifying(false);
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

  const currentChallengeText = currentStage < 2 ? CHALLENGE_MESSAGES[challenges[currentStage]] : 'Verifying Identity...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-sm p-6 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center relative overflow-hidden">
        
        {successMsg && (
          <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-1 font-bold animate-in slide-in-from-top-full duration-300 z-10">
            {successMsg}
          </div>
        )}

        <h2 className="text-xl font-bold text-white mb-4">Liveness Check</h2>
        
        {errorMsg && (
          <div className="bg-red-500/20 text-red-200 text-sm p-3 rounded-xl mb-4 w-full text-center border border-red-500/30">
            {errorMsg}
          </div>
        )}
        
        <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 mb-6 transition-colors duration-300 ${currentStage === 2 ? 'border-green-400' : 'border-blue-500'}`}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {isVerifying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="w-full bg-white/10 rounded-full h-2.5 mb-6 overflow-hidden">
          <div 
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
            style={{ width: `${(currentStage / 2) * 100}%` }}
          />
        </div>

        <p className="text-lg font-bold text-white mb-6 text-center animate-pulse">
          {currentChallengeText}
        </p>

        <button 
          onClick={onCancel}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
