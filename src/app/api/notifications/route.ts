import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, courseId, courseName, courseCode } = body;

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    let tokens: string[] = [];
    let title = "";
    let bodyText = "";
    let clickAction = "";

    if (type === "session_start") {
      const { lecturerName } = body;
      if (!courseId) {
        return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
      }

      // Query enrolled students (existing logic)
      const enrolledUsersSnap = await db.collection("users")
        .where("enrolledCourses", "array-contains", courseId)
        .get();

      enrolledUsersSnap.forEach((doc) => {
        const userData = doc.data();
        if (userData.role === "student" || userData.role === "course_rep") {
          if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
            tokens.push(...userData.fcmTokens);
          }
        }
      });

      title = `${courseCode} Class is Starting!`;
      bodyText = `${lecturerName || 'Your lecturer'} has started the session for ${courseName || 'class'}. Open the app to check in.`;
      clickAction = "/student/dashboard";

    } else if (type === "rep_session_start") {
      const { repName } = body;
      if (!courseId) {
        return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
      }

      // 1. Find the lecturerId from the course document
      const courseDoc = await db.collection("courses").doc(courseId).get();
      if (!courseDoc.exists) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }
      const courseData = courseDoc.data();
      const lecturerId = courseData?.lecturerId;

      if (lecturerId) {
        // 2. Fetch the lecturer's FCM tokens
        const lecturerDoc = await db.collection("users").doc(lecturerId).get();
        if (lecturerDoc.exists) {
          const lecturerData = lecturerDoc.data();
          if (lecturerData?.fcmTokens && Array.isArray(lecturerData.fcmTokens)) {
            tokens.push(...lecturerData.fcmTokens);
          }
        }
      }

      title = `Rep Started Class: ${courseCode}`;
      bodyText = `Course Representative ${repName || 'assigned to your course'} has started the session for ${courseName || 'class'} on your behalf.`;
      clickAction = "/lecturer/dashboard";

    } else if (type === "checkin_success") {
      const { studentId, courseId: reqCourseId } = body;
      if (!studentId) {
        return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
      }

      let displayCode = courseCode || "Class";
      let displayName = courseName || "";

      if (reqCourseId) {
        const courseDoc = await db.collection("courses").doc(reqCourseId).get();
        if (courseDoc.exists) {
          const courseData = courseDoc.data();
          displayCode = courseData?.courseCode || displayCode;
          displayName = courseData?.courseName || displayName;
        }
      }

      // Fetch the specific student's FCM tokens
      const studentDoc = await db.collection("users").doc(studentId).get();
      if (studentDoc.exists) {
        const studentData = studentDoc.data();
        if (studentData?.fcmTokens && Array.isArray(studentData.fcmTokens)) {
          tokens.push(...studentData.fcmTokens);
        }
      }

      title = `Check-in Confirmed ✓`;
      bodyText = `Successfully checked in for ${displayCode} (${displayName}). Your attendance is verified.`;
      clickAction = "/student/history";

    } else if (type === "session_end") {
      const { endedByName } = body;
      if (!courseId) {
        return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
      }

      let displayCode = courseCode || "Class";
      let displayName = courseName || "";

      // 1. Get lecturer tokens
      const courseDoc = await db.collection("courses").doc(courseId).get();
      if (courseDoc.exists) {
        const courseData = courseDoc.data();
        displayCode = courseData?.courseCode || displayCode;
        displayName = courseData?.courseName || displayName;
        const lecturerId = courseData?.lecturerId;
        if (lecturerId) {
          const lecturerDoc = await db.collection("users").doc(lecturerId).get();
          if (lecturerDoc.exists) {
            const lecturerData = lecturerDoc.data();
            if (lecturerData?.fcmTokens && Array.isArray(lecturerData.fcmTokens)) {
              tokens.push(...lecturerData.fcmTokens);
            }
          }
        }
      }

      // 2. Get course reps enrolled in this course
      const repsSnap = await db.collection("users")
        .where("role", "==", "course_rep")
        .where("enrolledCourses", "array-contains", courseId)
        .get();

      repsSnap.forEach((doc) => {
        const repData = doc.data();
        if (repData.fcmTokens && Array.isArray(repData.fcmTokens)) {
          tokens.push(...repData.fcmTokens);
        }
      });

      title = `Class Session Ended: ${displayCode}`;
      bodyText = `The session for ${displayName || 'class'} was ended by ${endedByName || 'the host'}. You can now download the attendance report.`;
      clickAction = "/lecturer/dashboard";

    } else {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
    }

    // Remove duplicates and filter empty/invalid tokens
    const uniqueTokens = Array.from(new Set(tokens)).filter(Boolean);

    console.log(`Sending '${type}' notification to ${uniqueTokens.length} tokens`);

    if (uniqueTokens.length === 0) {
      return NextResponse.json({ success: true, message: "No active device tokens found for this notification target." });
    }

    // Prepare FCM multicast message
    const message = {
      notification: {
        title,
        body: bodyText,
      },
      data: {
        courseId: courseId || "",
        click_action: clickAction,
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
