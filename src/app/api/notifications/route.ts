import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { courseId, courseName, courseCode, lecturerName } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    // Query all users enrolled in this course
    const enrolledUsersSnap = await db.collection("users")
      .where("enrolledCourses", "array-contains", courseId)
      .get();

    const tokens: string[] = [];
    enrolledUsersSnap.forEach((doc) => {
      const userData = doc.data();
      // Ensure we only notify students/course reps
      if (userData.role === "student" || userData.role === "course_rep") {
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          tokens.push(...userData.fcmTokens);
        }
      }
    });

    // Remove duplicates and filter empty/invalid tokens
    const uniqueTokens = Array.from(new Set(tokens)).filter(Boolean);

    console.log(`Found ${uniqueTokens.length} tokens for courseId: ${courseId}`);

    if (uniqueTokens.length === 0) {
      return NextResponse.json({ success: true, message: "No enrolled students with push tokens found." });
    }

    // Prepare FCM multicast message
    const message = {
      notification: {
        title: `${courseCode} Class is Starting!`,
        body: `${lecturerName || 'Your lecturer'} has started the session for ${courseName}. Open the app to check in.`,
      },
      data: {
        courseId,
        click_action: "/student/dashboard",
      },
      tokens: uniqueTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`FCM Sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: any) {
    console.error("Error sending push notifications:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
