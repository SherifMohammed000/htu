const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function purgeAll() {
  console.log("🚀 Starting database cleanup...");

  try {
    // 1. Delete all attendance records
    console.log("Deleting Firestore 'attendance_records'...");
    const attendanceSnapshot = await db.collection("attendance_records").get();
    if (attendanceSnapshot.size > 0) {
      const batch = db.batch();
      attendanceSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`✓ Deleted ${attendanceSnapshot.size} attendance records.`);
    } else {
      console.log("No attendance records found.");
    }

    // 2. Delete all sessions
    console.log("Deleting Firestore 'sessions'...");
    const sessionsSnapshot = await db.collection("sessions").get();
    if (sessionsSnapshot.size > 0) {
      const batch = db.batch();
      sessionsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`✓ Deleted ${sessionsSnapshot.size} sessions.`);
    } else {
      console.log("No sessions found.");
    }

    // 3. Delete all activated user profiles from Firestore
    console.log("Deleting Firestore 'users'...");
    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.size > 0) {
      const batch = db.batch();
      usersSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`✓ Deleted ${usersSnapshot.size} user profiles.`);
    } else {
      console.log("No user profiles found in Firestore.");
    }

    // 4. Delete all users from Firebase Auth
    console.log("Deleting from Firebase Auth...");
    let pageToken;
    let authCount = 0;
    do {
      const listUsersResult = await auth.listUsers(1000, pageToken);
      const uids = listUsersResult.users.map((userRecord) => userRecord.uid);
      if (uids.length > 0) {
        await auth.deleteUsers(uids);
        authCount += uids.length;
      }
      pageToken = listUsersResult.pageToken;
    } while (pageToken);
    
    console.log(`✓ Deleted ${authCount} users from Firebase Auth.`);
    console.log("\n🎉 Database purge completed successfully!");
  } catch (err) {
    console.error("❌ Cleanup failed with error:", err);
  }
}

purgeAll().then(() => process.exit(0));
