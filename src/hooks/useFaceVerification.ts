import { useState } from 'react';
import { getAuth } from 'firebase/auth';

export function useFaceVerification() {
  const [attempts, setAttempts] = useState(0);

  const activateAccount = async (imageBase64: string) => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const response = await fetch('/api/face/uploadReference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, imageBase64 }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  };

  const verifyBeforeScan = async (sessionId: string, liveImageBase64: string, resultPass: boolean): Promise<boolean> => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const currentAttempt = attempts + 1;
    setAttempts(currentAttempt);

    const result = resultPass ? "pass" : "fail";

    await fetch('/api/face/logVerification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, sessionId, result, attemptNumber: currentAttempt }),
    });

    return resultPass;
  };

  const getAttempts = () => attempts;
  const resetAttempts = () => setAttempts(0);

  return { activateAccount, verifyBeforeScan, getAttempts, resetAttempts };
}
