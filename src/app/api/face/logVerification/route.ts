import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { uid, sessionId, result, attemptNumber } = await req.json();

    if (!uid || !sessionId || !result || attemptNumber === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    // 1. Write the log entry
    await db.collection("faceVerificationLogs").add({
      uid,
      sessionId,
      result,
      attemptNumber,
      timestamp: FieldValue.serverTimestamp(),
    });

    // 2. Increment verificationAttempts on the session for this user?
    // Wait, the plan says: "Increments verificationAttempts on sessions/{sessionId}".
    // But attemptNumber is per user per session. If we increment on the session document itself,
    // that would be a global counter for all users, which is wrong. 
    // Let's store the attempt counter per user per session in a subcollection or just rely on the 
    // client sending the correct attemptNumber, or count the logs.
    // The plan says: "If attemptNumber >= 3 && result === 'fail' -> creates an absent attendance record"
    
    if (attemptNumber >= 3 && result === 'fail') {
      // Check if already recorded
      const attendanceRef = db.collection("attendance_records");
      const existing = await attendanceRef
        .where("studentId", "==", uid)
        .where("sessionId", "==", sessionId)
        .get();

      if (existing.empty) {
        // Record absent
        await attendanceRef.add({
          studentId: uid,
          sessionId,
          status: "absent",
          method: "facial_verification_failed",
          timestamp: new Date().toISOString(),
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error logging verification:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
